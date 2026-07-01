from __future__ import annotations

import json
from pathlib import Path

from simulator.core.models import PatientProfile


DEFAULT_PROFILES_PATH = Path(__file__).parent / "config" / "patient_profiles.json"


def load_profiles(path: Path = DEFAULT_PROFILES_PATH) -> list[PatientProfile]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return [PatientProfile.from_dict(item) for item in data]


def get_profile(patient_id: str, path: Path = DEFAULT_PROFILES_PATH) -> PatientProfile:
    for profile in load_profiles(path):
        if profile.patient_id == patient_id:
            return profile
    raise ValueError(f"Patient profile not found: {patient_id}")
