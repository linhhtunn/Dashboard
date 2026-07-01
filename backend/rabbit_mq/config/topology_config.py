EVENTS_EXCHANGE = {
    "name": "health.events",
    "type": "topic",
    "durable": True,
}

DLX_EXCHANGE = {
    "name": "health.dlx",
    "type": "direct",
    "durable": True,
}

DEAD_LETTER_ROUTING_KEY = "dead"

PUBLISHER_CONFIG = {
    "content_type": "application/json",
    "delivery_mode": 2,
    "publisher_confirms": True,
    "mandatory": True,
    "max_publish_retries": 3,
}

# Realtime simulator publisher config: optimized for low-latency over
# high-latency links (CloudAMQP). Disables publisher confirms and mandatory
# flag to avoid per-message blocking on broker ACK round-trips.
REALTIME_PUBLISHER_CONFIG = {
    "content_type": "application/json",
    "delivery_mode": 2,
    "publisher_confirms": False,
    "mandatory": False,
    "max_publish_retries": 3,
}

CONNECTION_CONFIG = {
    "heartbeat": 30,
    "blocked_connection_timeout": 300,
    "socket_timeout": 10,
    "connection_attempts": 3,
    "retry_delay": 5,
}

CONSUMER_CONFIG = {
    "team2_wearable_continuous": {
        "auto_ack": False,
        "prefetch_count": 100,
        "requeue_on_error": False,
        "max_retry_count": 3,
    },
    "team2_wearable_windowed": {
        "auto_ack": False,
        "prefetch_count": 50,
        "requeue_on_error": False,
        "max_retry_count": 3,
    },
    "team2_wearable_motion": {
        "auto_ack": False,
        "prefetch_count": 10,
        "requeue_on_error": False,
        "max_retry_count": 3,
    },
    "team2_wearable_device_status": {
        "auto_ack": False,
        "prefetch_count": 20,
        "requeue_on_error": False,
        "max_retry_count": 3,
    },
    "team2_wearable_triggered": {
        "auto_ack": False,
        "prefetch_count": 20,
        "requeue_on_error": False,
        "max_retry_count": 3,
    },
    "team2_sleep": {
        "auto_ack": False,
        "prefetch_count": 10,
        "requeue_on_error": False,
        "max_retry_count": 3,
    },
    "team2_daily": {
        "auto_ack": False,
        "prefetch_count": 10,
        "requeue_on_error": False,
        "max_retry_count": 3,
    },
    "dashboard_alerts": {
        "auto_ack": False,
        "prefetch_count": 20,
        "requeue_on_error": False,
        "max_retry_count": 3,
    },
    "team1_feedback": {
        "auto_ack": False,
        "prefetch_count": 10,
        "requeue_on_error": False,
        "max_retry_count": 3,
    },
    "debug": {
        "auto_ack": False,
        "prefetch_count": 1,
        "requeue_on_error": False,
        "max_retry_count": 0,
    },
}

QUEUES = {
    "wearable_continuous": {
        "name": "q.team2.wearable_continuous",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "wearable.continuous",
        "durable": True,
        "dlx": True,
        "consumer_config": "team2_wearable_continuous",
    },
    "wearable_steps_event": {
        "name": "q.team2.wearable_steps_event",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "wearable.steps_event",
        "durable": True,
        "dlx": True,
        "consumer_config": "team2_wearable_windowed",
    },
    "wearable_stress": {
        "name": "q.team2.wearable_stress",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "wearable.stress",
        "durable": True,
        "dlx": True,
        "consumer_config": "team2_wearable_windowed",
    },
    "wearable_ppi_batch": {
        "name": "q.team2.wearable_ppi_batch",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "wearable.ppi_batch",
        "durable": True,
        "dlx": True,
        "consumer_config": "team2_wearable_windowed",
    },
    "wearable_motion_batch": {
        "name": "q.team2.wearable_motion_batch",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "wearable.motion_batch",
        "durable": True,
        "dlx": True,
        "consumer_config": "team2_wearable_motion",
    },
    "wearable_spo2_triggered": {
        "name": "q.team2.wearable_triggered",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "wearable.spo2_triggered",
        "durable": True,
        "dlx": True,
        "consumer_config": "team2_wearable_triggered",
    },
    "wearable_bp_triggered": {
        "name": "q.team2.wearable_triggered",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "wearable.bp_triggered",
        "durable": True,
        "dlx": True,
        "consumer_config": "team2_wearable_triggered",
    },
    "wearable_ecg_triggered": {
        "name": "q.team2.wearable_triggered",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "wearable.ecg_triggered",
        "durable": True,
        "dlx": True,
        "consumer_config": "team2_wearable_triggered",
    },
    "wearable_battery": {
        "name": "q.team2.wearable_battery",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "wearable.battery",
        "durable": True,
        "dlx": True,
        "consumer_config": "team2_wearable_device_status",
    },
    "sleep_timeline": {
        "name": "q.team2.sleep_timeline",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "wearable.sleep_timeline",
        "durable": True,
        "dlx": True,
        "consumer_config": "team2_sleep",
    },
    "daily_metrics": {
        "name": "q.team2.daily_metrics",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "wearable.daily_metrics",
        "durable": True,
        "dlx": True,
        "consumer_config": "team2_daily",
    },
    "alerts": {
        "name": "q.alerts.created",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "alerts.created",
        "durable": True,
        "dlx": True,
        "consumer_config": "dashboard_alerts",
    },
    "data_fault": {
        "name": "q.team1.data_fault",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "data.fault",
        "durable": True,
        "dlx": True,
        "consumer_config": "team1_feedback",
    },
    "dead_letter": {
        "name": "q.dead_letter",
        "exchange": DLX_EXCHANGE["name"],
        "routing_key": DEAD_LETTER_ROUTING_KEY,
        "durable": True,
        "dlx": False,
        "consumer_config": "debug",
    },
}
