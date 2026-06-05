from __future__ import annotations

import random
from typing import Any


FIRST_NAMES = {
    "male": ["Minh", "Duc", "Hung", "Bao", "Quan", "Khanh", "Nam", "Son"],
    "female": ["Mai", "Linh", "Ha", "Vy", "Hoa", "Lan", "An", "Trang"],
}

LAST_NAMES = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Do", "Vu", "Dang"]
MIDDLE_NAMES = {
    "male": ["Van", "Minh", "Duc", "Quoc", "Thanh"],
    "female": ["Thi", "Ngoc", "Thu", "Thanh", "Mai"],
}

LEGACY_RISK_ALIASES = {
    "healthy": None,
    "pregnancy": None,
    "elderly": None,
    "active_lifestyle": None,
    "low_activity": None,
    "sedentary_lifestyle": None,
}


def _sample_truncated_gaussian(rng: random.Random, params: dict[str, float]) -> float:
    mean = float(params["mean"])
    std = float(params["std"])
    minimum = float(params["min"])
    maximum = float(params["max"])
    for _ in range(100):
        value = rng.gauss(mean, std)
        if minimum <= value <= maximum:
            return value
    return max(minimum, min(maximum, mean))


def _rr_interval_ms(heart_rate: float) -> int:
    return int(round(60000 / heart_rate))


def _sample_name(rng: random.Random, gender: str) -> str:
    return " ".join(
        [
            rng.choice(LAST_NAMES),
            rng.choice(MIDDLE_NAMES[gender]),
            rng.choice(FIRST_NAMES[gender]),
        ]
    )


def _normalize_risk_factors(values: list[str] | None) -> list[str]:
    normalized: list[str] = []
    for value in values or []:
        mapped = LEGACY_RISK_ALIASES.get(value, value)
        if mapped and mapped not in normalized:
            normalized.append(mapped)
    return normalized


def _validate_risk_factors(risk_factors: list[str], risk_definitions: dict[str, Any]) -> None:
    unknown = sorted(set(risk_factors) - set(risk_definitions))
    if unknown:
        known = ", ".join(sorted(risk_definitions))
        raise ValueError(f"Unknown risk_factors={unknown}. Known: {known}")


def _medical_history(
    physiological_state: str,
    risk_factors: list[str],
    state_definitions: dict[str, Any],
    risk_definitions: dict[str, Any],
) -> str:
    histories: list[str] = []
    state_history = state_definitions.get(physiological_state, {}).get("medical_history")
    if physiological_state != "none" and state_history:
        histories.append(state_history)
    for item in risk_factors:
        histories.append(risk_definitions.get(item, {}).get("medical_history", item.replace("_", " ")))
    return "; ".join(dict.fromkeys(histories)) or "No known chronic disease"


def _health_status(
    physiological_state: str,
    risk_factors: list[str],
    state_definitions: dict[str, Any],
    risk_definitions: dict[str, Any],
) -> str:
    statuses = [state_definitions.get(physiological_state, {}).get("health_status", "NORMAL")]
    statuses.extend(risk_definitions.get(item, {}).get("health_status", "NORMAL") for item in risk_factors)
    return "WARNING" if "WARNING" in statuses else "NORMAL"


def _apply_adjustments(
    baseline: dict[str, float],
    adjustment_sources: list[dict[str, float]],
) -> dict[str, float]:
    adjusted = dict(baseline)
    for adjustments in adjustment_sources:
        for signal_name, delta in adjustments.items():
            adjusted[signal_name] = adjusted.get(signal_name, 0.0) + float(delta)
    return adjusted


def _clamp_to_group_ranges(baseline: dict[str, float], group_config: dict[str, Any]) -> dict[str, float]:
    clamped = {}
    for key, value in baseline.items():
        params = group_config["baseline"][key]
        clamped[key] = max(float(params["min"]), min(float(params["max"]), value))
    return clamped


def _clamp_to_params(value: float, params: dict[str, float]) -> float:
    return max(float(params["min"]), min(float(params["max"]), value))


def _sample_baseline(
    rng: random.Random,
    group_config: dict[str, Any],
    physiological_state: str,
    lifestyle: str,
    risk_factors: list[str],
    state_definitions: dict[str, Any],
    lifestyle_definitions: dict[str, Any],
    risk_definitions: dict[str, Any],
) -> dict[str, int]:
    baseline = {
        key: _sample_truncated_gaussian(rng, params)
        for key, params in group_config["baseline"].items()
    }
    adjustment_sources = [
        state_definitions[physiological_state].get("baseline_adjustments", {}),
        lifestyle_definitions[lifestyle].get("baseline_adjustments", {}),
    ]
    adjustment_sources.extend(
        risk_definitions[item].get("baseline_adjustments", {}) for item in risk_factors
    )
    baseline = _apply_adjustments(baseline, adjustment_sources)
    baseline = _clamp_to_group_ranges(baseline, group_config)
    heart_rate = int(round(baseline["heart_rate"]))
    return {
        "heart_rate": heart_rate,
        "rr_interval_ms": _rr_interval_ms(heart_rate),
        "hrv_rmssd": int(round(baseline["hrv_rmssd"])),
        "systolic_bp": int(round(baseline["systolic_bp"])),
        "diastolic_bp": int(round(baseline["diastolic_bp"])),
        "spo2": int(round(baseline["spo2"])),
    }


def _sample_wearable_baseline(
    rng: random.Random,
    *,
    age_group: str,
    baseline: dict[str, int],
    physiological_state: str,
    lifestyle: str,
    risk_factors: list[str],
    config: dict[str, Any],
) -> dict[str, Any]:
    ranges = config["wearable_baseline_ranges"][age_group]
    sampled = {
        key: _sample_truncated_gaussian(rng, params)
        for key, params in ranges.items()
    }
    sampled.update(
        {
            "resting_heart_rate": float(baseline["heart_rate"]),
            "spo2": float(baseline["spo2"]),
            "hrv_rmssd_morning": float(baseline["hrv_rmssd"]),
        }
    )

    adjustment_sources = [
        config["wearable_lifestyle_adjustments"].get(lifestyle, {}),
        config["wearable_physiological_state_adjustments"].get(physiological_state, {}),
    ]
    adjustment_sources.extend(
        config["wearable_risk_factor_adjustments"].get(item, {}) for item in risk_factors
    )
    for adjustments in adjustment_sources:
        for key, delta in adjustments.items():
            sampled[key] = sampled.get(key, 0.0) + float(delta)

    for key, params in ranges.items():
        sampled[key] = _clamp_to_params(float(sampled[key]), params)
    sampled["spo2"] = max(90.0, min(100.0, float(sampled["spo2"])))

    return {
        "resting_heart_rate": int(round(sampled["resting_heart_rate"])),
        "respiratory_rate": round(float(sampled["respiratory_rate"]), 1),
        "stress_score": int(round(sampled["stress_score"])),
        "spo2": int(round(sampled["spo2"])),
        "hrv_rmssd_morning": int(round(sampled["hrv_rmssd_morning"])),
        "daily_step_tendency": round(float(sampled["daily_step_tendency"]), 3),
        "sleep_start_offset_minutes": int(round(sampled["sleep_start_offset_minutes"])),
        "sleep_duration_tendency_minutes": int(round(sampled["sleep_duration_tendency_minutes"])),
        "sleep_fragmentation_tendency": round(float(sampled["sleep_fragmentation_tendency"]), 3),
        "deep_sleep_tendency": round(float(sampled["deep_sleep_tendency"]), 3),
        "rem_sleep_tendency": round(float(sampled["rem_sleep_tendency"]), 3),
        "ecg_noise_level": round(float(sampled["ecg_noise_level"]), 4),
        "ecg_amplitude": round(float(sampled["ecg_amplitude"]), 3),
        "ecg_rhythm": "sinus_rhythm",
    }


def generate_patient_profiles(config: dict[str, Any]) -> list[dict[str, Any]]:
    rng = random.Random(int(config.get("seed", 42)))
    if config.get("mode", "population") == "single":
        return [_generate_single_profile(rng, config)]

    patient_id_template = config.get("patient_id_template", "P{index:03d}")
    next_index = int(config.get("start_index", 1))
    profiles: list[dict[str, Any]] = []

    for group_key, count in config["population_plan"].items():
        group_config = config["groups"][group_key]
        for _ in range(int(count)):
            profiles.append(_generate_profile_from_group(rng, config, group_key, patient_id_template.format(index=next_index)))
            next_index += 1

    return profiles


def _generate_single_profile(rng: random.Random, config: dict[str, Any]) -> dict[str, Any]:
    selected_user = config["selected_user"]
    return _generate_profile_from_group(
        rng,
        config,
        selected_user["profile_group"],
        selected_user["patient_id"],
        selected_user=selected_user,
    )


def _generate_profile_from_group(
    rng: random.Random,
    config: dict[str, Any],
    group_key: str,
    patient_id: str,
    selected_user: dict[str, Any] | None = None,
) -> dict[str, Any]:
    group_config = config["groups"][group_key]
    risk_definitions = config.get("risk_factor_definitions", config.get("risk_definitions", {}))
    state_definitions = config["physiological_state_definitions"]
    lifestyle_definitions = config["lifestyle_definitions"]

    gender = selected_user.get("gender", group_config["gender"]) if selected_user else group_config["gender"]
    age_group = selected_user.get("age_group", group_config["age_group"]) if selected_user else group_config["age_group"]
    pregnancy_status = (
        selected_user.get("pregnancy_status", group_config.get("pregnancy_status", "none"))
        if selected_user
        else group_config.get("pregnancy_status", "none")
    )
    lifestyle = (
        selected_user.get("lifestyle", group_config["default_lifestyle"])
        if selected_user
        else group_config["default_lifestyle"]
    )
    raw_risk_factors = (
        selected_user.get("risk_factors")
        if selected_user
        else group_config.get("default_risk_factors", [])
    )
    risk_factors = _normalize_risk_factors(raw_risk_factors)
    _validate_risk_factors(risk_factors, risk_definitions)

    age_range = group_config["age_range"]
    selected_age = selected_user.get("age") if selected_user else None
    age = int(selected_age) if selected_age is not None else rng.randint(int(age_range[0]), int(age_range[1]))

    baseline = _sample_baseline(
        rng,
        group_config,
        pregnancy_status,
        lifestyle,
        risk_factors,
        state_definitions,
        lifestyle_definitions,
        risk_definitions,
    )

    return {
        "patient_id": patient_id,
        "name": _sample_name(rng, gender),
        "age": age,
        "gender": gender,
        "age_group": age_group,
        "pregnancy_status": pregnancy_status,
        "lifestyle": lifestyle,
        "activity_level": lifestyle_definitions[lifestyle]["activity_level"],
        "risk_factors": risk_factors,
        "medical_history": _medical_history(
            pregnancy_status,
            risk_factors,
            state_definitions,
            risk_definitions,
        ),
        "health_status": _health_status(
            pregnancy_status,
            risk_factors,
            state_definitions,
            risk_definitions,
        ),
        "baseline": baseline,
        "wearable_baseline": _sample_wearable_baseline(
            rng,
            age_group=age_group,
            baseline=baseline,
            physiological_state=pregnancy_status,
            lifestyle=lifestyle,
            risk_factors=risk_factors,
            config=config,
        ),
    }

