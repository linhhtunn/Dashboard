CONTINUOUS_INTERVAL_SECONDS = 1

WINDOWS = {
    "heart_rate_seconds": 30,
    "respiratory_rate_seconds": 60,
}

TRIGGER_SCHEDULE = {
    "spo2": ["07:30", "21:30"],
    "ecg": ["08:00"],
}

ECG = {
    "duration_seconds": 30,
    "sampling_rate_hz": 250,
    "lead": "lead_I",
    "unit": "mV",
}

OUTPUT_FILES = {
    "wearable_continuous": "wearable_continuous_{suffix}.jsonl",
    "wearable_spo2_triggered": "wearable_spo2_triggered_{suffix}.jsonl",
    "wearable_ecg_triggered": "wearable_ecg_triggered_{suffix}.jsonl",
    "faulty_wearable_continuous": "faulty_wearable_continuous_{suffix}.jsonl",
    "faulty_wearable_spo2_triggered": "faulty_wearable_spo2_triggered_{suffix}.jsonl",
    "faulty_wearable_ecg_triggered": "faulty_wearable_ecg_triggered_{suffix}.jsonl",
    "wearable_fault_log": "wearable_fault_log_{suffix}.json",
    "sleep_timeline": "sleep_timeline_{suffix}.json",
    "sleep_metrics": "sleep_metrics_{suffix}.json",
    "daily_metrics": "daily_metrics_{suffix}.json",
}
