from __future__ import annotations

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


GenerateChatResponse = Callable[[str], Awaitable[ChatGenerationResult]]


@dataclass
class ChatMemoryWorkflow:
    policy: SlidingWindowPolicy = field(default_factory=SlidingWindowPolicy)
    checkpointer: Any | None = None
    _store: dict[str, ChatMemoryState] = field(default_factory=dict)
    _graph: Any | None = field(default=None, init=False)
    _short_term_memory: ShortTermMemoryManager = field(init=False)

    def __post_init__(self) -> None:
        self._short_term_memory = ShortTermMemoryManager(policy=self.policy, store=self._store)
        if self.checkpointer is None:
            logger.info("chat_memory_workflow_selected backend=manual_in_process")
            return
        try:
            from langgraph.graph import END, StateGraph
        except ImportError as exc:
            raise RuntimeError("LangGraph is required when a checkpointer is configured") from exc

        graph = StateGraph(ChatMemoryState)

        async def prepare_memory_window(state: ChatMemoryState) -> dict[str, Any]:
            return {"memory_context": self._short_term_memory.build_context(state)}

        async def generate_response(state: ChatMemoryState) -> dict[str, Any]:
            generate = self._active_generate_response
            if generate is None:
                raise RuntimeError("generate_response callback was not registered")
            result = await generate(state.get("memory_context", ""))
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

        graph.add_node("prepare_memory_window", prepare_memory_window)
        graph.add_node("generate_response", generate_response)
        graph.add_node("update_memory", update_memory)
        graph.set_entry_point("prepare_memory_window")
        graph.add_edge("prepare_memory_window", "generate_response")
        graph.add_edge("generate_response", "update_memory")
        graph.add_edge("update_memory", END)
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
    ) -> AgentResponse:
        if self._graph is not None:
            logger.info("chat_memory_run backend=langgraph_checkpointer conversation_id=%s", conversation_id)
            try:
                return await self._run_graph(
                    patient_id=patient_id,
                    conversation_id=conversation_id,
                    message=message,
                    generate_response=generate_response,
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
                )
        logger.info("chat_memory_run backend=manual_in_process conversation_id=%s", conversation_id)
        return await self._run_manual(
            patient_id=patient_id,
            conversation_id=conversation_id,
            message=message,
            generate_response=generate_response,
        )

    async def _run_graph(
        self,
        *,
        patient_id: str,
        conversation_id: str,
        message: str,
        generate_response: GenerateChatResponse,
    ) -> AgentResponse:
        self._active_generate_response = generate_response
        try:
            input_state: dict[str, Any] = {
                "patient_id": patient_id,
                "conversation_id": conversation_id,
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
    ) -> AgentResponse:
        state = self._short_term_memory.load_or_seed(
            patient_id=patient_id,
            conversation_id=conversation_id,
            message=message,
        )
        memory_context = self._short_term_memory.build_context(state)
        result = await generate_response(memory_context)
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
        return result.response


def _is_memory_backend_error(exc: Exception) -> bool:
    error_type = exc.__class__.__name__.lower()
    error_module = exc.__class__.__module__.lower()
    return (
        "psycopg" in error_module
        or "langgraph.checkpoint" in error_module
        or error_type in {"operationalerror", "interfaceerror", "pooltimeout"}
    )
