from __future__ import annotations

import copy
import importlib.util
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEFAULT_CONFIG_PATH = Path(__file__).parent / "config" / "default_generation_config.py"


@dataclass(frozen=True)
class OutputFileConfig:
    patient_info: str
    lab_results: str
    wearable_continuous: str
    wearable_steps_event: str
    wearable_stress: str
    wearable_ppi_batch: str
    wearable_motion_batch: str
    wearable_bp_triggered: str
    wearable_spo2_triggered: str
    wearable_battery: str
    wearable_ecg_triggered: str
    wearable_fault_log: str
    sleep_timeline: str
    daily_metrics: str
    activity_timeline: str
    abnormal_episodes: str


@dataclass(frozen=True)
class GenerationConfig:
    config_path: Path
    run_name: str
    patient_id: str
    profiles_path: Path
    output_dir: Path
    start_time: str
    duration_hours: int
    seed: int
    file_suffix_template: str
    output_files: OutputFileConfig
    profile_generator: dict[str, Any]
    wearable: dict[str, Any]
    wearable_fault_injector: dict[str, Any]
    layers: dict[str, Any]

    @property
    def duration_seconds(self) -> int:
        return int(self.duration_hours) * 3600

    @property
    def duration_label(self) -> str:
        total_seconds = self.duration_seconds
        if total_seconds % 3600 == 0:
            return f"{total_seconds // 3600}h"
        if total_seconds % 60 == 0:
            return f"{total_seconds // 60}m"
        return f"{total_seconds}s"

    @property
    def file_suffix(self) -> str:
        return self.file_suffix_template.format(
            patient_id=self.patient_id,
            run_name=self.run_name,
            duration_seconds=self.duration_seconds,
            duration_label=self.duration_label,
        )

    def output_path(self, output_type: str) -> Path:
        filename_template = getattr(self.output_files, output_type)
        filename = filename_template.format(
            patient_id=self.patient_id,
            run_name=self.run_name,
            suffix=self.file_suffix,
            duration_seconds=self.duration_seconds,
            duration_label=self.duration_label,
        )
        return self.output_dir / filename


def _load_python_config(path: Path) -> Any:
    spec = importlib.util.spec_from_file_location("simulator_generation_config", path)
    if spec is None or spec.loader is None:
        raise ValueError(f"Cannot load generation config: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_generation_config(path: Path = DEFAULT_CONFIG_PATH) -> GenerationConfig:
    config_path = path.resolve()
    module = _load_python_config(config_path)
    output_files_data = getattr(module, "OUTPUT_FILES", {})

    return GenerationConfig(
        config_path=config_path,
        run_name=getattr(module, "RUN_NAME", config_path.stem),
        patient_id=module.PATIENT_ID,
        profiles_path=Path(module.PROFILES_PATH).resolve(),
        output_dir=Path(module.OUTPUT_DIR).resolve(),
        start_time=module.START_TIME,
        duration_hours=int(getattr(module, "DURATION_HOURS", 24)),
        seed=int(getattr(module, "SEED", 42)),
        file_suffix_template=getattr(module, "FILE_SUFFIX_TEMPLATE", "{patient_id}_{duration_label}"),
        output_files=OutputFileConfig(
            patient_info=output_files_data.get("patient_info", "patient_info_{suffix}.json"),
            lab_results=output_files_data.get("lab_results", "lab_results_{suffix}.json"),
            wearable_continuous=output_files_data.get("wearable_continuous", "wearable_continuous_{suffix}.jsonl"),
            wearable_steps_event=output_files_data.get("wearable_steps_event", "wearable_steps_event_{suffix}.jsonl"),
            wearable_stress=output_files_data.get("wearable_stress", "wearable_stress_{suffix}.jsonl"),
            wearable_ppi_batch=output_files_data.get("wearable_ppi_batch", "wearable_ppi_batch_{suffix}.jsonl"),
            wearable_motion_batch=output_files_data.get("wearable_motion_batch", "wearable_motion_batch_{suffix}.jsonl"),
            wearable_bp_triggered=output_files_data.get("wearable_bp_triggered", "wearable_bp_triggered_{suffix}.jsonl"),
            wearable_spo2_triggered=output_files_data.get("wearable_spo2_triggered", "wearable_spo2_triggered_{suffix}.jsonl"),
            wearable_battery=output_files_data.get("wearable_battery", "wearable_battery_{suffix}.jsonl"),
            wearable_ecg_triggered=output_files_data.get("wearable_ecg_triggered", "wearable_ecg_triggered_{suffix}.jsonl"),
            wearable_fault_log=output_files_data.get("wearable_fault_log", "wearable_fault_log_{suffix}.json"),
            sleep_timeline=output_files_data.get("sleep_timeline", "sleep_timeline_{suffix}.json"),
            daily_metrics=output_files_data.get("daily_metrics", "daily_metrics_{suffix}.json"),
            activity_timeline=output_files_data.get("activity_timeline", "activity_timeline_{suffix}.json"),
            abnormal_episodes=output_files_data.get("abnormal_episodes", "abnormal_episodes_{suffix}.json"),
        ),
        profile_generator=getattr(module, "PROFILE_GENERATOR_CONFIG", {}),
        wearable=getattr(module, "WEARABLE_CONFIG", {}),
        wearable_fault_injector=getattr(module, "WEARABLE_FAULT_INJECTOR_CONFIG", {}),
        layers=getattr(module, "LAYERS", {}),
    )


def with_overrides(
    config: GenerationConfig,
    *,
    patient_id: str | None = None,
    start_time: str | None = None,
    duration_hours: int | None = None,
    seed: int | None = None,
    output_dir: Path | None = None,
) -> GenerationConfig:
    profile_generator = copy.deepcopy(config.profile_generator)
    if seed is not None:
        profile_generator["seed"] = seed
    if patient_id and isinstance(profile_generator.get("selected_user"), dict):
        profile_generator["selected_user"]["patient_id"] = patient_id

    layers = copy.deepcopy(config.layers)
    if patient_id:
        layers.setdefault("profile", {})["patient_id"] = patient_id
    if start_time:
        layers.setdefault("wearable", {})["start_time"] = start_time
    if duration_hours is not None:
        layers.setdefault("wearable", {})["duration_hours"] = int(duration_hours)

    return GenerationConfig(
        config_path=config.config_path,
        run_name=config.run_name,
        patient_id=patient_id or config.patient_id,
        profiles_path=config.profiles_path,
        output_dir=output_dir.resolve() if output_dir else config.output_dir,
        start_time=start_time or config.start_time,
        duration_hours=int(duration_hours) if duration_hours is not None else config.duration_hours,
        seed=seed if seed is not None else config.seed,
        file_suffix_template=config.file_suffix_template,
        output_files=config.output_files,
        profile_generator=profile_generator,
        wearable=config.wearable,
        wearable_fault_injector=config.wearable_fault_injector,
        layers=layers,
    )
