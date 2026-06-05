from __future__ import annotations

import json
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

from app.memory.short_term.manager import ShortTermMemoryManager
from app.memory.short_term.policy import SlidingWindowPolicy
from app.memory.short_term.state import ChatMemoryState, MemoryTurn, make_turn
from app.contracts.agent_response import AgentResponse

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ChatGenerationResult:
    response: AgentResponse
    safe_for_memory: bool


GenerateChatResponse = Callable[[str, str, str], Awaitable[ChatGenerationResult]]


@dataclass
class ChatMemoryWorkflow:
    policy: SlidingWindowPolicy = field(default_factory=SlidingWindowPolicy)
    checkpointer: Any | None = None
    store: Any | None = None
    llm_provider: Any | None = None
    _store: dict[str, ChatMemoryState] = field(default_factory=dict)
    _graph: Any | None = field(default=None, init=False)
    _short_term_memory: ShortTermMemoryManager = field(init=False)

    def __post_init__(self) -> None:
        self._short_term_memory = ShortTermMemoryManager(policy=self.policy, store=self._store)
        if self.checkpointer is None:
            return

        try:
            from langgraph.graph import END, StateGraph
        except ImportError as exc:
            raise RuntimeError("LangGraph is required when a checkpointer is configured") from exc

        graph = StateGraph(ChatMemoryState)

        async def prepare_memory_window(state: ChatMemoryState) -> dict[str, Any]:
            context = self._short_term_memory.build_context(state)
            watchlist_str = ""
            prefs_str = ""
            if self.store is not None:
                patient_id = state.get("patient_id")
                doctor_id = state.get("doctor_id") or "D1"
                try:
                    patient_namespace = ("patient_memory", patient_id)
                    patient_item = await self.store.aget(patient_namespace, "clinical_watchlist")
                    if patient_item and patient_item.value:
                        watchlist_str = json.dumps(patient_item.value, ensure_ascii=False)

                    doctor_namespace = ("doctor_memory", doctor_id)
                    doctor_item = await self.store.aget(doctor_namespace, "preferences")
                    if doctor_item and doctor_item.value:
                        prefs_str = json.dumps(doctor_item.value, ensure_ascii=False)
                except Exception as exc:
                    logger.warning("failed_to_retrieve_ltm reason=%s", exc)

            return {
                "memory_context": context,
                "long_term_watchlist": watchlist_str,
                "doctor_preferences": prefs_str,
            }

        async def generate_response(state: ChatMemoryState) -> dict[str, Any]:
            generate = self._active_generate_response
            if generate is None:
                raise RuntimeError("generate_response callback was not registered")
            result = await generate(
                state.get("memory_context", ""),
                state.get("long_term_watchlist", ""),
                state.get("doctor_preferences", ""),
            )
            return {"response": result.response, "safe_for_memory": result.safe_for_memory}

        async def update_memory(state: ChatMemoryState) -> dict[str, Any]:
            if not state.get("safe_for_memory") or state.get("response") is None:
                return {}
            response = state["response"]
            if not isinstance(response, AgentResponse):
                return {}
            updated = self._short_term_memory.append_assistant_response(
                self._short_term_memory.normalize_state(state),
                assistant_message=response.narrative_summary,
            )
            return {
                "summary": updated["summary"],
                "raw_turns": updated["raw_turns"],
                "turn_count": updated["turn_count"],
                "last_compacted_turn": updated["last_compacted_turn"],
            }

        async def extract_and_update_long_term(state: ChatMemoryState) -> dict[str, Any]:
            if not state.get("safe_for_memory") or state.get("response") is None:
                return {}
            if self.store is None or self.llm_provider is None:
                return {}

            patient_id = state.get("patient_id")
            doctor_id = state.get("doctor_id") or "D1"
            current_msg = state.get("current_message", "")
            response = state["response"]

            assistant_summary = response.narrative_summary if hasattr(response, "narrative_summary") else ""
            recent_turn = f"Doctor: {current_msg}\nAssistant: {assistant_summary}"

            from app.memory.long_term.extractor import LTMExtractor
            from app.memory.long_term.state import PatientClinicalMemory, DoctorPreferenceMemory, WatchlistItem

            extractor = LTMExtractor(self.llm_provider)

            # 1. Fetch current Patient clinical watchlist from store
            patient_namespace = ("patient_memory", patient_id)
            existing_watchlist = []
            try:
                patient_item = await self.store.aget(patient_namespace, "clinical_watchlist")
                if patient_item and patient_item.value:
                    existing_watchlist = [
                        WatchlistItem.model_validate(item)
                        for item in patient_item.value.get("clinical_watchlist", [])
                    ]
            except Exception as exc:
                logger.warning("failed_to_fetch_existing_patient_memory namespace=%s reason=%s", patient_namespace, exc)

            patient_memory = PatientClinicalMemory(
                patient_id=patient_id,
                clinical_watchlist=existing_watchlist,
            )

            # 2. Extract and merge clinical facts
            updated_patient_memory = await extractor.extract_patient_memory(
                patient_id=patient_id,
                current_memory=patient_memory,
                conversation_history=recent_turn,
            )

            # Save to store
            try:
                await self.store.aput(
                    patient_namespace,
                    "clinical_watchlist",
                    updated_patient_memory.model_dump(mode="json"),
                )
            except Exception as exc:
                logger.warning("failed_to_save_patient_memory namespace=%s reason=%s", patient_namespace, exc)

            # 3. Fetch current Doctor preferences from store
            doctor_namespace = ("doctor_memory", doctor_id)
            existing_style = None
            existing_rules = []
            try:
                doctor_item = await self.store.aget(doctor_namespace, "preferences")
                if doctor_item and doctor_item.value:
                    existing_style = doctor_item.value.get("documentation_style")
                    existing_rules = doctor_item.value.get("clinical_rules", [])
            except Exception as exc:
                logger.warning("failed_to_fetch_existing_doctor_memory namespace=%s reason=%s", doctor_namespace, exc)

            doctor_memory = DoctorPreferenceMemory(
                doctor_id=doctor_id,
                documentation_style=existing_style,
                clinical_rules=existing_rules,
            )

            # 4. Extract and merge doctor workflow preferences
            updated_doctor_memory = await extractor.extract_doctor_memory(
                doctor_id=doctor_id,
                current_memory=doctor_memory,
                conversation_history=recent_turn,
            )

            # Save to store
            try:
                await self.store.aput(
                    doctor_namespace,
                    "preferences",
                    updated_doctor_memory.model_dump(mode="json"),
                )
            except Exception as exc:
                logger.warning("failed_to_save_doctor_memory namespace=%s reason=%s", doctor_namespace, exc)

            return {
                "long_term_watchlist": json.dumps(updated_patient_memory.model_dump(mode="json"), ensure_ascii=False),
                "doctor_preferences": json.dumps(updated_doctor_memory.model_dump(mode="json"), ensure_ascii=False),
            }

        graph.add_node("prepare_memory_window", prepare_memory_window)
        graph.add_node("generate_response", generate_response)
        graph.add_node("update_memory", update_memory)
        graph.add_node("extract_and_update_long_term", extract_and_update_long_term)

        graph.set_entry_point("prepare_memory_window")
        graph.add_edge("prepare_memory_window", "generate_response")
        graph.add_edge("generate_response", "update_memory")
        graph.add_edge("update_memory", "extract_and_update_long_term")
        graph.add_edge("extract_and_update_long_term", END)

        self._graph = graph.compile(checkpointer=self.checkpointer)
        self._active_generate_response: GenerateChatResponse | None = None
        logger.info("chat_memory_workflow_selected backend=langgraph_checkpointer")

    async def run(
        self,
        *,
        patient_id: str,
        conversation_id: str,
        message: str,
        generate_response: GenerateChatResponse,
        doctor_id: str = "D1",
    ) -> AgentResponse:
        if self._graph is not None:
            logger.info("chat_memory_run backend=langgraph_checkpointer conversation_id=%s", conversation_id)
            try:
                return await self._run_graph(
                    patient_id=patient_id,
                    conversation_id=conversation_id,
                    message=message,
                    generate_response=generate_response,
                    doctor_id=doctor_id,
                )
            except Exception as exc:
                if not _is_memory_backend_error(exc):
                    raise
                logger.warning(
                    "chat_memory_backend_failed_falling_back backend=langgraph_checkpointer "
                    "conversation_id=%s error_type=%s error_message=%s",
                    conversation_id,
                    exc.__class__.__name__,
                    exc,
                )
                return await self._run_manual(
                    patient_id=patient_id,
                    conversation_id=conversation_id,
                    message=message,
                    generate_response=generate_response,
                    doctor_id=doctor_id,
                )
        logger.info("chat_memory_run backend=manual_in_process conversation_id=%s", conversation_id)
        return await self._run_manual(
            patient_id=patient_id,
            conversation_id=conversation_id,
            message=message,
            generate_response=generate_response,
            doctor_id=doctor_id,
        )

    async def _run_graph(
        self,
        *,
        patient_id: str,
        conversation_id: str,
        message: str,
        generate_response: GenerateChatResponse,
        doctor_id: str = "D1",
    ) -> AgentResponse:
        self._active_generate_response = generate_response
        try:
            input_state: dict[str, Any] = {
                "patient_id": patient_id,
                "conversation_id": conversation_id,
                "doctor_id": doctor_id,
                "current_message": message,
            }
            result = await self._graph.ainvoke(
                input_state,
                config={"configurable": {"thread_id": conversation_id}},
            )
        finally:
            self._active_generate_response = None

        response = result.get("response")
        if not isinstance(response, AgentResponse):
            raise RuntimeError("LangGraph chat workflow completed without an AgentResponse")
        return response

    async def _run_manual(
        self,
        *,
        patient_id: str,
        conversation_id: str,
        message: str,
        generate_response: GenerateChatResponse,
        doctor_id: str = "D1",
    ) -> AgentResponse:
        state = self._short_term_memory.load_or_seed(
            patient_id=patient_id,
            conversation_id=conversation_id,
            message=message,
        )

        watchlist_str = ""
        prefs_str = ""
        if self.store is not None:
            try:
                patient_namespace = ("patient_memory", patient_id)
                patient_item = await self.store.aget(patient_namespace, "clinical_watchlist")
                if patient_item and patient_item.value:
                    watchlist_str = json.dumps(patient_item.value, ensure_ascii=False)

                doctor_namespace = ("doctor_memory", doctor_id)
                doctor_item = await self.store.aget(doctor_namespace, "preferences")
                if doctor_item and doctor_item.value:
                    prefs_str = json.dumps(doctor_item.value, ensure_ascii=False)
            except Exception as exc:
                logger.warning("failed_to_retrieve_ltm_manual reason=%s", exc)

        memory_context = self._short_term_memory.build_context(state)
        result = await generate_response(memory_context, watchlist_str, prefs_str)

        if result.safe_for_memory:
            state = self._short_term_memory.append_assistant_response(
                self._short_term_memory.normalize_state(state),
                assistant_message=result.response.narrative_summary,
            )
            self._short_term_memory.save(conversation_id, state)
            logger.info(
                "chat_memory_checkpointed conversation_id=%s raw_turns=%s turn_count=%s",
                conversation_id,
                len(state["raw_turns"]),
                state["turn_count"],
            )

            # Reflection in manual run if store is available
            if self.store is not None and self.llm_provider is not None:
                try:
                    assistant_summary = result.response.narrative_summary if hasattr(result.response, "narrative_summary") else ""
                    recent_turn = f"Doctor: {message}\nAssistant: {assistant_summary}"

                    from app.memory.long_term.extractor import LTMExtractor
                    from app.memory.long_term.state import PatientClinicalMemory, DoctorPreferenceMemory, WatchlistItem
                    extractor = LTMExtractor(self.llm_provider)

                    # Update patient clinical watchlist
                    patient_namespace = ("patient_memory", patient_id)
                    existing_watchlist = []
                    patient_item = await self.store.aget(patient_namespace, "clinical_watchlist")
                    if patient_item and patient_item.value:
                        existing_watchlist = [
                            WatchlistItem.model_validate(item)
                            for item in patient_item.value.get("clinical_watchlist", [])
                        ]

                    patient_memory = PatientClinicalMemory(patient_id=patient_id, clinical_watchlist=existing_watchlist)
                    updated_patient_memory = await extractor.extract_patient_memory(patient_id, patient_memory, recent_turn)
                    await self.store.aput(patient_namespace, "clinical_watchlist", updated_patient_memory.model_dump(mode="json"))

                    # Update doctor preferences
                    doctor_namespace = ("doctor_memory", doctor_id)
                    existing_style = None
                    existing_rules = []
                    doctor_item = await self.store.aget(doctor_namespace, "preferences")
                    if doctor_item and doctor_item.value:
                        existing_style = doctor_item.value.get("documentation_style")
                        existing_rules = doctor_item.value.get("clinical_rules", [])

                    doctor_memory = DoctorPreferenceMemory(
                        doctor_id=doctor_id,
                        documentation_style=existing_style,
                        clinical_rules=existing_rules,
                    )
                    updated_doctor_memory = await extractor.extract_doctor_memory(doctor_id, doctor_memory, recent_turn)
                    await self.store.aput(doctor_namespace, "preferences", updated_doctor_memory.model_dump(mode="json"))
                except Exception as exc:
                    logger.warning("failed_to_update_ltm_manual reason=%s", exc)

        return result.response


def _is_memory_backend_error(exc: Exception) -> bool:
    error_type = exc.__class__.__name__.lower()
    error_module = exc.__class__.__module__.lower()
    return (
        "psycopg" in error_module
        or "langgraph.checkpoint" in error_module
        or error_type in {"operationalerror", "interfaceerror", "pooltimeout"}
    )
