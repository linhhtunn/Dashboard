import json
import logging
import re
import uuid

import psycopg

from app.contracts.agent_response import AgentResponse
from app.core.config import get_settings

logger = logging.getLogger(__name__)
URL_PATTERN = re.compile(r"https?://[^\s)\]]+")


async def record_ai_interaction(
    *,
    actor_user_id: str,
    patient_id: str | None,
    response: AgentResponse,
    correlation_id: str | None = None,
) -> None:
    settings = get_settings()
    if not settings.supabase_db_url:
        return
    try:
        actor_uuid = uuid.UUID(actor_user_id)
        patient_token = uuid.uuid5(uuid.NAMESPACE_URL, f"caresignal:{patient_id}") if patient_id else None
        trace_id = uuid.UUID(correlation_id) if correlation_id else uuid.uuid4()
        citations = URL_PATTERN.findall(response.narrative_summary)
        outcome = "abstained" if response.source_id in {"error", "fallback"} else "answered"
        async with await psycopg.AsyncConnection.connect(settings.supabase_db_url) as connection:
            await connection.execute(
                """
                INSERT INTO ai_interaction_audit (
                  actor_user_id, patient_token, model_version, prompt_version,
                  rule_version, tool_calls, citations, outcome, correlation_id
                ) VALUES (%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s,%s)
                """,
                (
                    actor_uuid,
                    patient_token,
                    settings.openai_model,
                    settings.prompt_version,
                    settings.rule_version,
                    json.dumps([{"source_id": response.source_id}]),
                    json.dumps(citations),
                    outcome,
                    trace_id,
                ),
            )
    except Exception as exc:
        logger.error("ai_audit_write_failed error_type=%s", exc.__class__.__name__)
