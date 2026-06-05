import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pika


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def main() -> None:
    load_env_file(Path(__file__).with_name(".env"))

    rabbitmq_url = os.getenv("RABBITMQ_URL")
    exchange = os.getenv("RABBITMQ_EXCHANGE", "health.events")
    routing_key = os.getenv("RABBITMQ_ROUTING_KEY", "wearable.continuous")
    test_queue = os.getenv("RABBITMQ_TEST_QUEUE", "q.team1.test_wearable_continuous")

    if not rabbitmq_url:
        raise RuntimeError("Missing RABBITMQ_URL in backend/.env")

    params = pika.URLParameters(rabbitmq_url)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()

    channel.exchange_declare(
        exchange=exchange,
        exchange_type="topic",
        durable=True,
    )
    channel.queue_declare(queue=test_queue, durable=True)
    channel.queue_bind(
        exchange=exchange,
        queue=test_queue,
        routing_key=routing_key,
    )

    payload = {
        "message_id": f"msg_{uuid.uuid4().hex[:8]}",
        "patient_id": "P001",
        "device_id": "SIM_WATCH_001",
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "steps": 1245,
        "heart_rate": 82,
        "respiratory_rate": 16,
        "stress_score": 34,
    }

    channel.basic_publish(
        exchange=exchange,
        routing_key=routing_key,
        body=json.dumps(payload).encode("utf-8"),
        properties=pika.BasicProperties(
            content_type="application/json",
            delivery_mode=2,
        ),
    )

    method_frame, _, body = channel.basic_get(queue=test_queue, auto_ack=True)
    if method_frame is None:
        raise RuntimeError("Published message, but test queue returned no message")

    received = json.loads(body.decode("utf-8"))
    print("RabbitMQ connection OK")
    print(f"Exchange: {exchange}")
    print(f"Routing key: {routing_key}")
    print(f"Test queue: {test_queue}")
    print(f"Received message_id: {received['message_id']}")

    connection.close()


if __name__ == "__main__":
    main()
