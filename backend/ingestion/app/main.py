import asyncio
import json
import logging
from contextlib import asynccontextmanager

import aio_pika
import asyncpg
from fastapi import FastAPI
from pydantic import ValidationError

from app.config import get_settings
from app.schema import VitalMessage

logger = logging.getLogger(__name__)
settings = get_settings()


async def persist(pool: asyncpg.Pool, message: VitalMessage) -> None:
    async with pool.acquire() as connection:
        async with connection.transaction():
            await connection.execute(
                """
                INSERT INTO ingestion_vitals (
                  event_id, deduplication_key, patient_token, observed_at,
                  heart_rate, respiratory_rate, spo2, systolic_bp, diastolic_bp
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                ON CONFLICT (deduplication_key) DO NOTHING
                """,
                message.event_id,
                message.deduplication_key,
                message.patient_token,
                message.observed_at,
                message.heart_rate,
                message.respiratory_rate,
                message.spo2,
                message.systolic_bp,
                message.diastolic_bp,
            )
            await connection.execute(
                """
                INSERT INTO ingestion_outbox (topic, deduplication_key, payload)
                VALUES ('vital.ingested.v1', $1, $2::jsonb)
                ON CONFLICT (deduplication_key) DO NOTHING
                """,
                message.deduplication_key,
                message.model_dump_json(),
            )


async def consume(app: FastAPI) -> None:
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=settings.prefetch_count)
    dlx = await channel.declare_exchange("caresignal.dlx", aio_pika.ExchangeType.DIRECT, durable=True)
    dlq = await channel.declare_queue(settings.dlq_name, durable=True)
    await dlq.bind(dlx, routing_key=settings.dlq_name)
    queue = await channel.declare_queue(
        settings.queue_name,
        durable=True,
        arguments={
            "x-dead-letter-exchange": "caresignal.dlx",
            "x-dead-letter-routing-key": settings.dlq_name,
        },
    )

    async with queue.iterator() as iterator:
        async for incoming in iterator:
            try:
                payload = VitalMessage.model_validate(json.loads(incoming.body))
                await persist(app.state.pool, payload)
                await incoming.ack()
            except (ValidationError, json.JSONDecodeError) as exc:
                logger.warning("invalid_vital_message event_rejected reason=%s", exc)
                await incoming.reject(requeue=False)
            except Exception:
                logger.exception("vital_ingestion_failed")
                await incoming.nack(requeue=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await asyncpg.create_pool(settings.database_url, min_size=2, max_size=20)
    app.state.consumer = asyncio.create_task(consume(app))
    yield
    app.state.consumer.cancel()
    await asyncio.gather(app.state.consumer, return_exceptions=True)
    await app.state.pool.close()


app = FastAPI(title="CareSignal ingestion", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    async with app.state.pool.acquire() as connection:
        await connection.fetchval("SELECT 1")
    return {"status": "ok"}
