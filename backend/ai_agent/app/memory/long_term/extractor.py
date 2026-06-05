from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, List, Optional
from pydantic import BaseModel, Field

from app.infrastructure.llm.ports.llm_provider import LLMProvider
from app.memory.long_term.state import PatientClinicalMemory, DoctorPreferenceMemory, WatchlistItem

logger = logging.getLogger(__name__)


class WatchlistAction(BaseModel):
    fact: str = Field(..., description="The clinical watchlist fact text.")
    action: str = Field(..., description="Action: ADD, UPDATE, or RESOLVE.")
    status: str = Field(default="ACTIVE", description="Status: ACTIVE or RESOLVED.")


class PatientLTMUpdate(BaseModel):
    watchlist_updates: List[WatchlistAction] = Field(default_factory=list)


class RuleAction(BaseModel):
    rule: str = Field(..., description="The clinical preference rule text.")
    action: str = Field(..., description="Action: ADD or REMOVE.")


class DoctorLTMUpdate(BaseModel):
    documentation_style: Optional[str] = Field(None, description="Updated documentation style, or null if no change.")
    clinical_rules_updates: List[RuleAction] = Field(default_factory=list)


class LTMExtractor:
    def __init__(self, llm_provider: LLMProvider):
        self.llm_provider = llm_provider

    async def extract_patient_memory(
        self,
        patient_id: str,
        current_memory: PatientClinicalMemory,
        conversation_history: str,
    ) -> PatientClinicalMemory:
        """Extracts and merges clinical watchlist items from conversation history."""
        existing_facts_str = json.dumps([item.model_dump() for item in current_memory.clinical_watchlist], indent=2)

        system_prompt = (
            "You are a clinical AI metadata assistant responsible for maintaining a patient's Long-Term Clinical Watchlist.\n"
            "Your goal is to extract clinical follow-ups, watch items, diagnostic suspicions, or monitoring requirements from the chat history.\n"
            "You MUST compare new dialog turns with existing watchlist facts, performing updates, resolutions, or adding new items.\n"
            "DO NOT duplicate facts. If a fact is resolved, change its action/status to RESOLVE.\n"
            "Return ONLY a valid JSON object matching this schema:\n"
            "{\n"
            "  \"watchlist_updates\": [\n"
            "    {\n"
            "      \"fact\": \"the fact description\",\n"
            "      \"action\": \"ADD\" | \"UPDATE\" | \"RESOLVE\",\n"
            "      \"status\": \"ACTIVE\" | \"RESOLVED\"\n"
            "    }\n"
            "  ]\n"
            "}\n"
            "No extra conversational text, no markdown wrapper other than standard json."
        )

        user_prompt = (
            f"Existing Clinical Watchlist:\n{existing_facts_str}\n\n"
            f"Conversation History:\n{conversation_history}\n\n"
            "Produce the watchlist updates JSON:"
        )

        try:
            response = await self.llm_provider.generate_text(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.0,
            )
            data = self._clean_and_parse_json(response.content)
            update = PatientLTMUpdate.model_validate(data)

            # Apply updates to current clinical_watchlist
            now_str = datetime.now(timezone.utc).isoformat()
            watchlist_dict = {item.fact.lower(): item for item in current_memory.clinical_watchlist}

            for item_up in update.watchlist_updates:
                key = item_up.fact.lower()
                if item_up.action == "ADD":
                    if key not in watchlist_dict:
                        watchlist_dict[key] = WatchlistItem(
                            fact=item_up.fact,
                            status="ACTIVE",
                            created_at=now_str,
                            updated_at=now_str,
                        )
                elif item_up.action == "UPDATE":
                    if key in watchlist_dict:
                        watchlist_dict[key].fact = item_up.fact
                        watchlist_dict[key].updated_at = now_str
                    else:
                        watchlist_dict[key] = WatchlistItem(
                            fact=item_up.fact,
                            status="ACTIVE",
                            created_at=now_str,
                            updated_at=now_str,
                        )
                elif item_up.action == "RESOLVE":
                    if key in watchlist_dict:
                        watchlist_dict[key].status = "RESOLVED"
                        watchlist_dict[key].updated_at = now_str

            current_memory.clinical_watchlist = list(watchlist_dict.values())
        except Exception as exc:
            logger.error("patient_ltm_extraction_failed patient_id=%s reason=%s", patient_id, exc)

        return current_memory

    async def extract_doctor_memory(
        self,
        doctor_id: str,
        current_memory: DoctorPreferenceMemory,
        conversation_history: str,
    ) -> DoctorPreferenceMemory:
        """Extracts doctor preferences and style from conversation history."""
        existing_rules_str = json.dumps(current_memory.clinical_rules, indent=2)
        existing_style = current_memory.documentation_style or "None"

        system_prompt = (
            "You are a workflow preference AI assistant. Your goal is to detect changes in a doctor's styling/documentation preference "
            "or workflow rules from the conversation history.\n"
            "Only extract rules that the doctor explicitly states as their workflow or style (e.g., 'always use SOAP format', 'do not include prescription suggestions').\n"
            "Ignore clinical medical facts about patients. Focus only on the doctor's preferred rules/style.\n"
            "Return ONLY a valid JSON object matching this schema:\n"
            "{\n"
            "  \"documentation_style\": \"SOAP\" | \"bulleted lists\" | null,\n"
            "  \"clinical_rules_updates\": [\n"
            "    {\n"
            "      \"rule\": \"the preference rule description\",\n"
            "      \"action\": \"ADD\" | \"REMOVE\"\n"
            "    }\n"
            "  ]\n"
            "}\n"
            "No extra conversational text, no markdown wrappers."
        )

        user_prompt = (
            f"Existing Documentation Style: {existing_style}\n"
            f"Existing Preference Rules:\n{existing_rules_str}\n\n"
            f"Conversation History:\n{conversation_history}\n\n"
            "Produce the preference updates JSON:"
        )

        try:
            response = await self.llm_provider.generate_text(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.0,
            )
            data = self._clean_and_parse_json(response.content)
            update = DoctorLTMUpdate.model_validate(data)

            if update.documentation_style:
                current_memory.documentation_style = update.documentation_style

            rules_set = {r.strip() for r in current_memory.clinical_rules if r.strip()}
            for rule_up in update.clinical_rules_updates:
                rule_text = rule_up.rule.strip()
                if not rule_text:
                    continue
                if rule_up.action == "ADD":
                    rules_set.add(rule_text)
                elif rule_up.action == "REMOVE":
                    rules_set.discard(rule_text)

            current_memory.clinical_rules = list(rules_set)
        except Exception as exc:
            logger.error("doctor_ltm_extraction_failed doctor_id=%s reason=%s", doctor_id, exc)

        return current_memory

    def _clean_and_parse_json(self, raw_content: str) -> Any:
        content = raw_content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        return json.loads(content)
