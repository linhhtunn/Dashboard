from __future__ import annotations

import pika

from database.config import DatabaseConfig, load_database_config


def create_rabbitmq_connection(config: DatabaseConfig | None = None) -> pika.BlockingConnection:
    cfg = config or load_database_config()
    if not cfg.rabbitmq_url:
        raise RuntimeError("RABBITMQ_URL is required for RabbitMQ operations")
    return pika.BlockingConnection(pika.URLParameters(cfg.rabbitmq_url))
