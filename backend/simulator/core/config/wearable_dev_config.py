CONTINUOUS_INTERVAL_SECONDS = 1

WINDOWS = {
    "ppi_seconds": 30,
}

MOTION_BATCH = {
    "window_seconds": 1,
    "sampling_rate_hz": 10,
}


def _every_minutes(step: int, offset: int = 0) -> list[str]:
    """All "HH:MM" marks across a day, every `step` minutes (optionally offset)."""
    return [
        f"{m // 60:02d}:{m % 60:02d}"
        for m in range(offset, 24 * 60, step)
    ]


TRIGGER_SCHEDULE = {
    # Blood pressure & SpO2 are spot-measured together every 30 minutes (48 readings/day),
    # at the same timestamps: 00:00, 00:30, 01:00, ...
    "blood_pressure": _every_minutes(30),
    "spo2": _every_minutes(30),
    "ecg": ["08:00"],
    "battery_every_minutes": 30,
}

ECG = {
    "duration_seconds": 30,
    "sampling_rate_hz": 250,
    "lead": "lead_I",
    "unit": "mV",
}

OUTPUT_FILES = {
    "patient_info":            "{patient_id}/patient_info.json",
    "lab_results":             "{patient_id}/lab_results.json",
    "wearable_continuous":     "{patient_id}/continuous.jsonl",
    "wearable_steps_event":    "{patient_id}/steps_event.jsonl",
    "wearable_stress":         "{patient_id}/stress.jsonl",
    "wearable_ppi_batch":      "{patient_id}/ppi_batch.jsonl",
    "wearable_motion_batch":   "{patient_id}/motion_batch.jsonl",
    "wearable_bp_triggered":   "{patient_id}/bp_triggered.jsonl",
    "wearable_spo2_triggered": "{patient_id}/spo2_triggered.jsonl",
    "wearable_battery":        "{patient_id}/battery.jsonl",
    "wearable_ecg_triggered":  "{patient_id}/ecg_triggered.jsonl",
    "wearable_fault_log":      "{patient_id}/fault_log.json",
    "sleep_timeline":          "{patient_id}/sleep_timeline.json",
    "daily_metrics":           "{patient_id}/daily_metrics.json",
    "activity_timeline":       "{patient_id}/activity_timeline.json",
    "abnormal_episodes":       "{patient_id}/abnormal_episodes.json",
}
