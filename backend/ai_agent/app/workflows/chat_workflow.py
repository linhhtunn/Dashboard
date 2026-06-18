import logging
import unicodedata
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from app.agents.clinical import ClinicalAgent
from app.api.schemas.agent_requests import ChatRequest
from app.contracts.agent_response import AgentResponse, Comparison, ResponseType, Visualization
from app.memory import ChatMemoryState
from app.memory.workflow import ChatMemoryWorkflow, _is_memory_backend_error
from app.observability import observe
from app.repositories.ports import PatientRepository, RepositoryItemNotFoundError
from app.services.chat import (
    ChatIntentRouter,
    ChatPromptBuilder,
    ChatResponsePostprocessor,
    ChatToolContextRunner,
    PatientContextResolver,
)
from app.services.clinical import GuidelineRetriever
from app.services.fallback import build_chat_fallback
from app.services.generation import GenerationService
from app.services.intent import ChatIntent, IntentClassifier
from app.services.safety import PromptSafetyDecision, classify_prompt_injection
from app.tools import ToolRegistry

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ChatWorkflow:
    patient_repository: PatientRepository
    clinical_agent: ClinicalAgent
    generation_service: GenerationService
    memory_workflow: ChatMemoryWorkflow
    log_fallback: Callable[..., AgentResponse]
    guideline_retriever: GuidelineRetriever | None = None
    tool_registry: ToolRegistry | None = None
    intent_classifier: IntentClassifier | None = None
    intent_router: ChatIntentRouter | None = None
    tool_context_runner: ChatToolContextRunner | None = None
    patient_context_resolver: PatientContextResolver | None = None
    prompt_builder: ChatPromptBuilder | None = None
    response_postprocessor: ChatResponsePostprocessor | None = None

    def __post_init__(self) -> None:
        if self.guideline_retriever is None:
            object.__setattr__(self, "guideline_retriever", _build_default_guideline_retriever())
        if self.tool_registry is None or not self.tool_registry.names():
            object.__setattr__(
                self,
                "tool_registry",
                _build_default_tool_registry(
                    patient_repository=self.patient_repository,
                    guideline_retriever=self.guideline_retriever,
                    llm_provider=getattr(self.generation_service, "llm_provider", None),
                ),
            )
        if self.intent_classifier is None:
            domain_registry = None
            if self.tool_registry:
                tool = self.tool_registry.get("clinical.medication_recommendation_context")
                if tool and hasattr(tool, "domain_registry"):
                    domain_registry = tool.domain_registry
            from app.core.config import get_settings
            settings = get_settings()
            object.__setattr__(
                self,
                "intent_classifier",
                IntentClassifier(
                    llm_provider=getattr(self.generation_service, "llm_provider", None),
                    domain_registry=domain_registry,
                    use_llm=settings.intent_classifier_use_llm,
                ),
            )
        if self.intent_router is None:
            object.__setattr__(self, "intent_router", ChatIntentRouter())
        if self.tool_context_runner is None:
            object.__setattr__(
                self,
                "tool_context_runner",
                ChatToolContextRunner(
                    tool_registry=self.tool_registry,
                    intent_router=self.intent_router,
                ),
            )
        if self.patient_context_resolver is None:
            object.__setattr__(
                self,
                "patient_context_resolver",
                PatientContextResolver(patient_repository=self.patient_repository),
            )
        if self.prompt_builder is None:
            object.__setattr__(self, "prompt_builder", ChatPromptBuilder(self.clinical_agent))
        if self.response_postprocessor is None:
            object.__setattr__(self, "response_postprocessor", ChatResponsePostprocessor())

        if self.memory_workflow.checkpointer is None:
            object.__setattr__(self, "_graph", None)
            return

        try:
            from langgraph.graph import END, StateGraph
        except ImportError as exc:
            raise RuntimeError("LangGraph is required when a checkpointer is configured") from exc

        graph = StateGraph(ChatMemoryState)

        async def prepare_memory_window(state: ChatMemoryState) -> dict[str, Any]:
            return await self.memory_workflow.load_context(state)

        async def classify_intent(state: ChatMemoryState) -> dict[str, Any]:
            return await self._classify_intent(state)

        async def run_selected_tool_context(state: ChatMemoryState) -> dict[str, Any]:
            return await self._run_selected_tool_context(state)

        async def generate_response(state: ChatMemoryState) -> dict[str, Any]:
            return await self._generate_response(state)

        async def update_memory(state: ChatMemoryState) -> dict[str, Any]:
            response = state.get("response")
            if not state.get("safe_for_memory") or response is None:
                return {}
            if not isinstance(response, AgentResponse):
                return {}
            return await self.memory_workflow.save_short_term_turn(state, response)

        async def extract_and_update_long_term(state: ChatMemoryState) -> dict[str, Any]:
            response = state.get("response")
            if not state.get("safe_for_memory") or response is None:
                return {}
            return await self.memory_workflow.save_long_term_reflection(state, response)

        graph.add_node("prepare_memory_window", prepare_memory_window)
        graph.add_node("classify_intent", classify_intent)
        graph.add_node("run_selected_tool_context", run_selected_tool_context)
        graph.add_node("generate_response", generate_response)
        graph.add_node("update_memory", update_memory)
        graph.add_node("extract_and_update_long_term", extract_and_update_long_term)

        graph.set_entry_point("prepare_memory_window")
        graph.add_edge("prepare_memory_window", "classify_intent")
        graph.add_conditional_edges(
            "classify_intent",
            self._route_after_intent,
            {
                "tool": "run_selected_tool_context",
                "generate": "generate_response",
            },
        )
        graph.add_edge("run_selected_tool_context", "generate_response")
        graph.add_edge("generate_response", "update_memory")
        graph.add_edge("update_memory", "extract_and_update_long_term")
        graph.add_edge("extract_and_update_long_term", END)

        compiled_graph = graph.compile(checkpointer=self.memory_workflow.checkpointer)
        object.__setattr__(self, "_graph", compiled_graph)

    async def run(self, request: ChatRequest) -> AgentResponse:
        source_id = _source_id_for_request(request)
        with observe(
            name="chat.request",
            metadata=_chat_request_trace_metadata(request, source_id=source_id, streaming=False),
            input=request.message,
        ) as span:
            response = await self._run_impl(request, source_id)
            span.update(
                metadata={
                    "status": "completed",
                    "response_type": response.response_type.value,
                    "source_id": response.source_id,
                }
            )
            return response

    async def _run_impl(self, request: ChatRequest, source_id: str) -> AgentResponse:
        safety = classify_prompt_injection(request.message)
        logger.info(
            "safety_gateway_decision endpoint=chat decision=%s matched_rules=%s",
            safety.decision.value,
            ",".join(safety.matched_rules) if safety.matched_rules else "none",
        )
        if safety.decision == PromptSafetyDecision.BLOCK:
            return self.log_fallback(
                endpoint="chat",
                response=build_chat_fallback(
                    patient_id=request.patient_id,
                    conversation_id=request.conversation_id,
                    reason=safety.reason,
                ),
                patient_id=request.patient_id,
                reason=safety.reason,
            )

        graph = getattr(self, "_graph", None)

        if graph is not None:
            logger.info("chat_workflow_run backend=langgraph_checkpointer conversation_id=%s", source_id)
            try:
                input_state = {
                    "patient_id": request.patient_id or "",
                    "conversation_id": source_id,
                    "doctor_id": request.doctor_id,
                    "current_message": request.message,
                    "request_metadata": request.metadata,
                }
                result = await graph.ainvoke(
                    input_state,
                    config={"configurable": {"thread_id": source_id}},
                )
                response = result.get("response")
                if not isinstance(response, AgentResponse):
                    raise RuntimeError("LangGraph chat workflow completed without an AgentResponse")
                return response
            except Exception as exc:
                if not _is_memory_backend_error(exc):
                    raise
                logger.warning(
                    "chat_workflow_backend_failed_falling_back backend=langgraph_checkpointer "
                    "conversation_id=%s error_type=%s error_message=%s",
                    source_id,
                    exc.__class__.__name__,
                    exc,
                )
                return await self._run_manual(request, source_id)

        logger.info("chat_workflow_run backend=manual_in_process conversation_id=%s", source_id)
        return await self._run_manual(request, source_id)

    async def run_stream(self, request: ChatRequest):
        source_id = _source_id_for_request(request)
        with observe(
            name="chat.request",
            metadata=_chat_request_trace_metadata(request, source_id=source_id, streaming=True),
            input=request.message,
        ) as span:
            async for event_type, value in self._run_stream_impl(request, source_id):
                if event_type == "result" and isinstance(value, AgentResponse):
                    span.update(
                        metadata={
                            "status": "completed",
                            "response_type": value.response_type.value,
                            "source_id": value.source_id,
                        }
                    )
                yield event_type, value

    async def _run_stream_impl(self, request: ChatRequest, source_id: str):
        safety = classify_prompt_injection(request.message)
        logger.info(
            "safety_gateway_decision endpoint=chat_stream decision=%s matched_rules=%s",
            safety.decision.value,
            ",".join(safety.matched_rules) if safety.matched_rules else "none",
        )
        if safety.decision == PromptSafetyDecision.BLOCK:
            fb = self.log_fallback(
                endpoint="chat",
                response=build_chat_fallback(
                    patient_id=request.patient_id,
                    conversation_id=request.conversation_id,
                    reason=safety.reason,
                ),
                patient_id=request.patient_id,
                reason=safety.reason,
            )
            yield "result", fb
            return

        yield "status", "loading_context"
        state = self.memory_workflow.load_or_seed_state(
            patient_id=request.patient_id or "",
            conversation_id=source_id,
            message=request.message,
        )
        state["request_metadata"] = request.metadata
        state["doctor_id"] = request.doctor_id

        memory_data = await self.memory_workflow.load_context(state)
        state.update(memory_data)

        yield "status", "classifying_intent"
        state.update(await self._classify_intent(state))

        if self._route_after_intent(state) == "tool":
            yield "status", f"running_tool:{state.get('selected_intent')}"
            state.update(await self._run_selected_tool_context(state))

        yield "status", "generating"
        
        greeting_response = _greeting_response_if_applicable(state, request.patient_id)
        if greeting_response is not None:
            yield "result", greeting_response
            return

        if state.get("selected_intent") == ChatIntent.OUT_OF_SCOPE.value:
            response = build_chat_fallback(
                patient_id=request.patient_id,
                conversation_id=state.get("conversation_id"),
                reason=(
                    "Toi chi ho tro cac cau hoi lien quan den y te, du lieu benh nhan, "
                    "sinh hieu, canh bao, CDSS va goi y dieu tri co kiem soat cho bac si. "
                    "Cau hoi hien tai nam ngoai pham vi lam sang nen toi khong tra loi noi dung do."
                ),
            )
            yield "result", response
            return

        if self.intent_router.intent_requires_patient(state) and not state.get("patient_id"):
            response = build_chat_fallback(
                patient_id=None,
                conversation_id=state.get("conversation_id"),
                reason=(
                    "Yeu cau nay can gan voi mot benh nhan cu the. "
                    "Vui long chon benh nhan hoac hoi theo dang tim benh nhan/mo benh nhan."
                ),
            )
            yield "result", response
            return

        patient = self.patient_context_resolver.resolve(state)
        prompt = self.prompt_builder.build(state=state, patient=patient)

        final_response = None
        async for event_type, val in self.generation_service.generate_with_contract_stream(
            user_prompt=prompt,
            expected_response_type=ResponseType.CHAT,
            expected_patient_id=state.get("patient_id") or None,
            expected_source_id=source_id,
            fallback=lambda reason: build_chat_fallback(
                patient_id=state.get("patient_id") or None,
                conversation_id=state.get("conversation_id"),
                reason=reason,
            ),
            log_fallback=self.log_fallback,
        ):
            if event_type == "token":
                yield "token", val
            elif event_type == "result":
                final_response = val

        if final_response is not None:
            final_response = self.response_postprocessor.process(final_response, state)
            # Yield result BEFORE saving memory. save_turn() triggers LTM extraction
            # (2 extra LLM calls) which would block the stream and cause frontend to hang.
            yield "result", final_response
            if state.get("safe_for_memory", True):
                import asyncio
                _state_snapshot = dict(state)
                _source_id_snapshot = source_id
                _final_response_snapshot = final_response

                async def _save_memory_bg():
                    try:
                        updated_state = await asyncio.wait_for(
                            self.memory_workflow.save_turn(_state_snapshot, _final_response_snapshot),
                            timeout=30.0,
                        )
                        self.memory_workflow.save_state_manual(_source_id_snapshot, updated_state)
                        logger.info(
                            "chat_memory_saved_bg conversation_id=%s",
                            _source_id_snapshot,
                        )
                    except asyncio.TimeoutError:
                        logger.warning(
                            "chat_memory_save_timeout_bg conversation_id=%s",
                            _source_id_snapshot,
                        )
                    except Exception as exc:
                        logger.warning(
                            "chat_memory_save_error_bg conversation_id=%s reason=%s",
                            _source_id_snapshot,
                            exc,
                        )

                asyncio.ensure_future(_save_memory_bg())


    async def _run_manual(self, request: ChatRequest, source_id: str) -> AgentResponse:
        state = self.memory_workflow.load_or_seed_state(
            patient_id=request.patient_id or "",
            conversation_id=source_id,
            message=request.message,
        )
        state["request_metadata"] = request.metadata
        state["doctor_id"] = request.doctor_id

        memory_data = await self.memory_workflow.load_context(state)
        state.update(memory_data)
        state.update(await self._classify_intent(state))
        if self._route_after_intent(state) == "tool":
            state.update(await self._run_selected_tool_context(state))
        state.update(await self._generate_response(state))

        response = state.get("response")
        if not isinstance(response, AgentResponse):
            raise RuntimeError("Manual chat workflow completed without an AgentResponse")

        if state.get("safe_for_memory"):
            state = await self.memory_workflow.save_turn(state, response)
            self.memory_workflow.save_state_manual(source_id, state)
            logger.info(
                "chat_memory_checkpointed_manual conversation_id=%s raw_turns=%s turn_count=%s",
                source_id,
                len(state["raw_turns"]),
                state["turn_count"],
            )

        return response

    async def _classify_intent(self, state: ChatMemoryState) -> dict[str, Any]:
        with observe(
            name="chat.intent.classify",
            metadata={
                "patient_id": state.get("patient_id", ""),
                "conversation_id": state.get("conversation_id"),
            },
            input=state.get("current_message", ""),
        ) as span:
            classification = await self.intent_classifier.classify(
                message=state.get("current_message", ""),
                patient_id=state.get("patient_id", ""),
                metadata=state.get("request_metadata") or {},
            )
            intent_route = "generate"
            tool_name = None
            if not classification.needs_clarification:
                tool_name = self.intent_router.tool_name_for_intent(classification.intent)
                intent_route = "tool" if tool_name else "generate"
            span.update(
                metadata={
                    "selected_intent": classification.intent.value,
                    "confidence": classification.confidence,
                    "needs_clarification": classification.needs_clarification,
                    "argument_keys": sorted(classification.arguments.model_dump().keys()),
                    "route": intent_route,
                    "tool_name": tool_name,
                },
                output={
                    "_langfuse_safe_output": True,
                    "selected_intent": classification.intent.value,
                    "confidence": classification.confidence,
                    "needs_clarification": classification.needs_clarification,
                    "route": intent_route,
                    "tool_name": tool_name,
                },
            )
        logger.info(
            "intent_classified intent=%s confidence=%s arguments=%s needs_clarification=%s",
            classification.intent.value,
            classification.confidence,
            classification.arguments.model_dump(),
            classification.needs_clarification,
        )
        return {
            "selected_intent": classification.intent.value,
            "intent_confidence": classification.confidence,
            "intent_arguments": classification.arguments.model_dump(),
            "needs_clarification": classification.needs_clarification,
            "clarifying_question": classification.clarifying_question,
        }

    def _route_after_intent(self, state: ChatMemoryState) -> str:
        return self.intent_router.route_after_intent(state)

    async def _run_selected_tool_context(self, state: ChatMemoryState) -> dict[str, Any]:
        return await self.tool_context_runner.run(state)

    async def _generate_response(self, state: ChatMemoryState) -> dict[str, Any]:
        patient_id = state.get("patient_id") or None
        greeting_response = _greeting_response_if_applicable(state, patient_id)
        if greeting_response is not None:
            return {"response": greeting_response, "safe_for_memory": False}

        if state.get("selected_intent") == ChatIntent.OUT_OF_SCOPE.value:
            response = build_chat_fallback(
                patient_id=patient_id,
                conversation_id=state.get("conversation_id"),
                reason=(
                    "Toi chi ho tro cac cau hoi lien quan den y te, du lieu benh nhan, "
                    "sinh hieu, canh bao, CDSS va goi y dieu tri co kiem soat cho bac si. "
                    "Cau hoi hien tai nam ngoai pham vi lam sang nen toi khong tra loi noi dung do."
                ),
            )
            return {"response": response, "safe_for_memory": False}

        if self.intent_router.intent_requires_patient(state) and not patient_id:
            response = build_chat_fallback(
                patient_id=None,
                conversation_id=state.get("conversation_id"),
                reason=(
                    "Yeu cau nay can gan voi mot benh nhan cu the. "
                    "Vui long chon benh nhan hoac hoi theo dang tim benh nhan/mo benh nhan."
                ),
            )
            return {"response": response, "safe_for_memory": False}

        try:
            patient = self.patient_context_resolver.resolve(state)
        except RepositoryItemNotFoundError:
            response = build_chat_fallback(
                patient_id=patient_id,
                conversation_id=state.get("conversation_id"),
                reason="Khong tim thay patient fixture/database row cho patient_id nay.",
            )
            return {"response": response, "safe_for_memory": False}

        source_id = state.get("conversation_id") or patient_id or f"DOCTOR_SCOPE_{state.get('doctor_id') or 'D1'}"
        prompt = self.prompt_builder.build(state=state, patient=patient)

        result = await self.generation_service.generate_with_contract(
            user_prompt=prompt,
            expected_response_type=ResponseType.CHAT,
            expected_patient_id=patient_id,
            expected_source_id=source_id,
            fallback=lambda reason: build_chat_fallback(
                patient_id=patient_id,
                conversation_id=state.get("conversation_id"),
                reason=reason,
            ),
            log_fallback=self.log_fallback,
        )
        response = self.response_postprocessor.process(result.response, state)
        return {
            "response": response,
            "safe_for_memory": (
                result.safe_for_memory
                and self.intent_router.doctor_scoped_response_is_safe_for_memory(state)
            ),
        }


def _greeting_response_if_applicable(state: ChatMemoryState, patient_id: str | None) -> AgentResponse | None:
    if state.get("selected_intent") != ChatIntent.GENERAL_CHAT.value:
        return None
    if not _message_is_greeting(state.get("current_message", "")):
        return None
    source_id = state.get("conversation_id") or patient_id or f"DOCTOR_SCOPE_{state.get('doctor_id') or 'D1'}"
    return AgentResponse(
        response_type=ResponseType.CHAT,
        patient_id=patient_id,
        source_id=source_id,
        narrative_summary=(
            "Chao ban. Toi la tro ly AI lam sang CareSignal, co the ho tro xem thong tin benh nhan, "
            "sinh hieu, canh bao va tong quan ca truc.\n\n"
            "Chi ho tro tham khao lam sang, khong thay the chan doan."
        ),
        visualizations=Visualization(),
        comparisons=Comparison(),
    )


def _message_is_greeting(message: str) -> bool:
    ascii_text = unicodedata.normalize("NFKD", message).encode("ascii", "ignore").decode("ascii")
    normalized = " ".join(ascii_text.lower().split()).strip(" .,!?:;-")
    return normalized in {
        "chao",
        "xin chao",
        "hello",
        "hi",
        "hey",
        "alo",
        "good morning",
        "good afternoon",
        "good evening",
    }


def _source_id_for_request(request: ChatRequest) -> str:
    return request.conversation_id or request.patient_id or f"DOCTOR_SCOPE_{request.doctor_id}"


def _chat_request_trace_metadata(
    request: ChatRequest,
    *,
    source_id: str,
    streaming: bool,
) -> dict[str, Any]:
    return {
        "endpoint": "chat_stream" if streaming else "chat",
        "streaming": streaming,
        "patient_id": request.patient_id,
        "conversation_id": source_id,
        "doctor_id": request.doctor_id,
    }


def _build_default_guideline_retriever() -> GuidelineRetriever:
    from app.services.clinical import RuleBasedRetriever

    rule_engine = _build_default_rule_engine()
    return RuleBasedRetriever(rule_engine)


def _build_default_tool_registry(
    *,
    patient_repository: PatientRepository,
    guideline_retriever: GuidelineRetriever,
    llm_provider: Any = None,
) -> ToolRegistry:
    from app.repositories.fixtures import FixtureAlertRepository
    from app.services.clinical import RuleBasedRetriever, RuleEngine, MedicationDomainRegistry
    from app.tools.clinical import (
        AFAnticoagulationRecommendationContextTool,
        AlertExplanationContextTool,
        DoctorPatientOverviewContextTool,
        MedicationRecommendationContextTool,
        MedicalSearchTool,
        PatientContextTool,
        PatientSearchContextTool,
        PatientSummaryContextTool,
        VitalsSummaryTool,
        VitalsTrendContextTool,
    )
    import os
    import app

    app_dir = os.path.dirname(app.__file__)
    rules_dir = os.path.join(os.path.dirname(app_dir), "rules")

    domain_registry = MedicationDomainRegistry(rules_dir)
    domain_registry.discover_domains()

    registry = ToolRegistry()
    rule_engine = _build_default_rule_engine()
    alert_repository = FixtureAlertRepository()
    vitals_summary_tool = VitalsSummaryTool()
    registry.register(PatientContextTool(patient_repository=patient_repository))
    registry.register(vitals_summary_tool)
    registry.register(PatientSummaryContextTool(patient_repository=patient_repository))
    registry.register(PatientSearchContextTool(patient_repository=patient_repository))
    registry.register(DoctorPatientOverviewContextTool(patient_repository=patient_repository))
    registry.register(
        AlertExplanationContextTool(
            alert_repository=alert_repository,
            patient_repository=patient_repository,
        )
    )
    registry.register(
        AFAnticoagulationRecommendationContextTool(
            patient_repository=patient_repository,
            rule_engine=rule_engine,
            guideline_retriever=guideline_retriever,
        )
    )
    registry.register(
        MedicationRecommendationContextTool(
            patient_repository=patient_repository,
            domain_registry=domain_registry,
            guideline_retriever=guideline_retriever,
        )
    )
    registry.register(VitalsTrendContextTool(vitals_summary_tool=vitals_summary_tool))
    from app.core.config import get_settings
    settings = get_settings()
    registry.register(
        MedicalSearchTool(
            api_key=settings.exa_api_key,
            llm_provider=llm_provider,
        )
    )
    return registry


def _build_default_rule_engine():
    import os
    import app
    from app.services.clinical import RuleEngine

    app_dir = os.path.dirname(app.__file__)
    rule_dir = os.path.join(os.path.dirname(app_dir), "rules", "af")
    rule_engine = RuleEngine(rule_dir)
    rule_engine.load_rules()
    return rule_engine


def _build_default_hypertension_rule_engine():
    import os
    import app
    from app.services.clinical import RuleEngine

    app_dir = os.path.dirname(app.__file__)
    rule_dir = os.path.join(os.path.dirname(app_dir), "rules", "hypertension")
    rule_engine = RuleEngine(rule_dir)
    rule_engine.load_rules()
    return rule_engine
