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

CONNECTION_CONFIG = {
    "heartbeat": 30,
    "blocked_connection_timeout": 300,
    "socket_timeout": 10,
    "connection_attempts": 3,
    "retry_delay": 5,
}

CONSUMER_CONFIG = {
    "team2_cleaning": {
        "auto_ack": False,
        "prefetch_count": 30,
        "requeue_on_error": False,
        "max_retry_count": 3,
    },
    "team3_anomaly": {
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
    "raw_vitals": {
        "name": "q.team2.raw_vitals",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "vitals.raw",
        "durable": True,
        "dlx": True,
        "message_type": "vitals.raw",
        "consumer_config": "team2_cleaning",
    },
    "ground_truth": {
        "name": "q.team3.ground_truth",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "scenario.ground_truth",
        "durable": True,
        "dlx": True,
        "message_type": "scenario.ground_truth",
        "consumer_config": "team3_anomaly",
    },
    "features": {
        "name": "q.team3.features",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "features.realtime",
        "durable": True,
        "dlx": True,
        "message_type": "features.realtime",
        "consumer_config": "team3_anomaly",
    },
    "alerts": {
        "name": "q.alerts.created",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "alerts.created",
        "durable": True,
        "dlx": True,
        "message_type": "alerts.created",
        "consumer_config": "dashboard_alerts",
    },
    "data_fault": {
        "name": "q.team1.data_fault",
        "exchange": EVENTS_EXCHANGE["name"],
        "routing_key": "data.fault",
        "durable": True,
        "dlx": True,
        "message_type": "data.fault",
        "consumer_config": "team1_feedback",
    },
    "dead_letter": {
        "name": "q.dead_letter",
        "exchange": DLX_EXCHANGE["name"],
        "routing_key": DEAD_LETTER_ROUTING_KEY,
        "durable": True,
        "dlx": False,
        "message_type": "dead_letter",
        "consumer_config": "debug",
    },
}
