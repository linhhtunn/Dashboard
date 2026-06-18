from __future__ import annotations

import json
import logging
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


@dataclass
class ChatMemoryWorkflow:
    """MemoryService manages the data loading and saving for short-term and long-term memory.
    
    It is named ChatMemoryWorkflow for backwards compatibility with container injection.
    """
    policy: SlidingWindowPolicy = field(default_factory=SlidingWindowPolicy)
    checkpointer: Any | None = None
    store: Any | None = None
    llm_provider: Any | None = None
    _store: dict[str, ChatMemoryState] = field(default_factory=dict)
    _short_term_memory: ShortTermMemoryManager = field(init=False)

    def __post_init__(self) -> None:
        self._short_term_memory = ShortTermMemoryManager(policy=self.policy, store=self._store)

    def load_or_seed_state(self, patient_id: str, conversation_id: str, message: str) -> ChatMemoryState:
        return self._short_term_memory.load_or_seed(
            patient_id=patient_id,
            conversation_id=conversation_id,
            message=message,
        )

    def save_state_manual(self, conversation_id: str, state: ChatMemoryState) -> None:
        self._short_term_memory.save(conversation_id, state)

    def normalize_state(self, state: ChatMemoryState) -> ChatMemoryState:
        return self._short_term_memory.normalize_state(state)

    async def load_context(self, state: ChatMemoryState) -> dict[str, Any]:
        patient_id = state.get("patient_id")
        doctor_id = state.get("doctor_id") or "D1"
        return {
            "memory_context": await self.load_short_term_context(state),
            "long_term_watchlist": await self.load_long_term_watchlist(patient_id),
            "doctor_preferences": await self.load_doctor_preferences(doctor_id),
        }


    async def load_short_term_context(self, state: ChatMemoryState) -> str:
        return self._short_term_memory.build_context(state)

    async def load_long_term_watchlist(self, patient_id: str) -> str:
        if self.store is None or not patient_id:
            return ""
        try:
            patient_namespace = ("patient_memory", patient_id)
            patient_item = await self.store.aget(patient_namespace, "clinical_watchlist")
            if patient_item and patient_item.value:
                return json.dumps(patient_item.value, ensure_ascii=False)
        except Exception as exc:
            logger.warning("failed_to_retrieve_watchlist patient_id=%s reason=%s", patient_id, exc)
        return ""

    async def load_doctor_preferences(self, doctor_id: str) -> str:
        if self.store is None or not doctor_id:
            return ""
        try:
            doctor_namespace = ("doctor_memory", doctor_id)
            doctor_item = await self.store.aget(doctor_namespace, "preferences")
            if doctor_item and doctor_item.value:
                return json.dumps(doctor_item.value, ensure_ascii=False)
        except Exception as exc:
            logger.warning("failed_to_retrieve_doctor_prefs doctor_id=%s reason=%s", doctor_id, exc)
        return ""

    async def save_turn(self, state: ChatMemoryState, response: AgentResponse) -> ChatMemoryState:
        st_updated = await self.save_short_term_turn(state, response)
        state.update(st_updated)
        lt_updated = await self.save_long_term_reflection(state, response)
        state.update(lt_updated)
        return state

    async def save_short_term_turn(self, state: ChatMemoryState, response: AgentResponse) -> dict[str, Any]:

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

    async def save_long_term_reflection(self, state: ChatMemoryState, response: AgentResponse) -> dict[str, Any]:
        if self.store is None or self.llm_provider is None:
            return {}

        patient_id = state.get("patient_id")
        doctor_id = state.get("doctor_id") or "D1"
        current_msg = state.get("current_message", "")

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


def _is_memory_backend_error(exc: Exception) -> bool:
    error_type = exc.__class__.__name__.lower()
    error_module = exc.__class__.__module__.lower()
    return (
        "psycopg" in error_module
        or "langgraph.checkpoint" in error_module
        or error_type in {"operationalerror", "interfaceerror", "pooltimeout"}
    )
