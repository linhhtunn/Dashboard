WEARABLE_FAULT_PROBABILITIES_BY_STREAM = {
    "wearable_continuous": {
        "missing_record": 0.0008,
        "missing_timestamp": 0.0005,
        "missing_patient_id": 0.0003,
        "missing_field": 0.0008,
        "invalid_heart_rate": 0.0005,
        "invalid_respiratory_rate": 0.0005,
        "duplicate_message": 0.0006,
        "out_of_order_timestamp": 0.0005,
    },
    "wearable_steps_event": {
        "missing_record": 0.0050,
        "missing_timestamp": 0.0030,
        "missing_patient_id": 0.0020,
        "missing_field": 0.0050,
        "duplicate_message": 0.0030,
    },
    "wearable_stress": {
        "missing_record": 0.0050,
        "missing_timestamp": 0.0030,
        "missing_patient_id": 0.0020,
        "missing_field": 0.0050,
        "invalid_stress_score": 0.0050,
        "duplicate_message": 0.0030,
    },
    "wearable_ppi_batch": {
        "missing_record": 0.0050,
        "missing_timestamp": 0.0030,
        "missing_patient_id": 0.0020,
        "missing_field": 0.0050,
        "invalid_ppi_intervals": 0.0050,
        "duplicate_message": 0.0030,
    },
    "wearable_motion_batch": {
        "missing_record": 0.0030,
        "missing_timestamp": 0.0020,
        "missing_patient_id": 0.0010,
        "missing_field": 0.0030,
        "invalid_motion_value": 0.0050,
        "duplicate_message": 0.0020,
    },
    "wearable_battery": {
        "missing_record": 0.0100,
        "missing_timestamp": 0.0050,
        "missing_patient_id": 0.0030,
        "missing_field": 0.0050,
        "invalid_battery_level": 0.0100,
        "duplicate_message": 0.0050,
    },
    "wearable_bp_triggered": {
        "missing_record": 0.0200,
        "missing_timestamp": 0.0100,
        "missing_patient_id": 0.0050,
        "missing_field": 0.0100,
        "invalid_blood_pressure": 0.0200,
        "duplicate_message": 0.0100,
    },
    "wearable_spo2_triggered": {
        "missing_record": 0.0200,
        "missing_timestamp": 0.0100,
        "missing_patient_id": 0.0050,
        "invalid_spo2": 0.0200,
        "duplicate_message": 0.0100,
    },
    "wearable_ecg_triggered": {
        "missing_record": 0.0200,
        "missing_timestamp": 0.0100,
        "missing_patient_id": 0.0050,
        "missing_ecg_points": 0.0200,
        "duplicate_message": 0.0100,
    },
}


def build_wearable_fault_injector_config(
    *,
    enabled: bool,
    max_faults_per_stream: int | None = 50,
    min_faults_by_stream: dict[str, int] | None = None,
    probabilities_by_stream: dict[str, dict[str, float]] | None = None,
) -> dict:
    return {
        "enabled": enabled,
        "max_faults_per_stream": max_faults_per_stream,
        "min_faults_by_stream": min_faults_by_stream
        or {
            "wearable_bp_triggered": 1,
            "wearable_spo2_triggered": 1,
            "wearable_ecg_triggered": 1,
        },
        "probabilities_by_stream": probabilities_by_stream or WEARABLE_FAULT_PROBABILITIES_BY_STREAM,
    }
