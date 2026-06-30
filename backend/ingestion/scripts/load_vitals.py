"""Publish 100 synthetic vital events/second to the staging CloudAMQP queue."""

import asyncio
import json
import os
import time
import uuid
from datetime import datetime, timezone

import aio_pika


async def main() -> None:
    url = os.environ["RABBITMQ_URL"]
    queue_name = os.getenv("QUEUE_NAME", "caresignal.vitals.v1")
    duration_seconds = int(os.getenv("DURATION_SECONDS", "600"))
    connection = await aio_pika.connect_robust(url)
    channel = await connection.channel(publisher_confirms=True)
    queue = await channel.declare_queue(queue_name, durable=True)
    start = time.monotonic()
    sequence = 0
    while time.monotonic() - start < duration_seconds:
        batch_started = time.monotonic()
        for patient in range(100):
            sequence += 1
            event_id = str(uuid.uuid4())
            payload = {
                "schema_version": 1,
                "event_id": event_id,
                "deduplication_key": f"load:{patient}:{sequence}",
                "patient_token": f"synthetic-{patient:03d}",
                "observed_at": datetime.now(timezone.utc).isoformat(),
                "heart_rate": 70 + patient % 30,
                "spo2": 94 + patient % 6,
            }
            await channel.default_exchange.publish(
                aio_pika.Message(
                    body=json.dumps(payload).encode(),
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                    content_type="application/json",
                ),
                routing_key=queue.name,
            )
        await asyncio.sleep(max(0, 1 - (time.monotonic() - batch_started)))
    await connection.close()


if __name__ == "__main__":
    asyncio.run(main())
