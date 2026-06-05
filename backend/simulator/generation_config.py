from __future__ import annotations

import importlib.util
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEFAULT_CONFIG_PATH = Path(__file__).parent / "config" / "default_generation_config.py"


@dataclass(frozen=True)
class OutputFileConfig:
    wearable_continuous: str
    wearable_spo2_triggered: str
    wearable_ecg_triggered: str
    faulty_wearable_continuous: str
    faulty_wearable_spo2_triggered: str
    faulty_wearable_ecg_triggered: str
    wearable_fault_log: str
    sleep_timeline: str
    sleep_metrics: str
    daily_metrics: str


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
            wearable_continuous=output_files_data.get(
                "wearable_continuous",
                "wearable_continuous_{suffix}.jsonl",
            ),
            wearable_spo2_triggered=output_files_data.get(
                "wearable_spo2_triggered",
                "wearable_spo2_triggered_{suffix}.jsonl",
            ),
            wearable_ecg_triggered=output_files_data.get(
                "wearable_ecg_triggered",
                "wearable_ecg_triggered_{suffix}.jsonl",
            ),
            faulty_wearable_continuous=output_files_data.get(
                "faulty_wearable_continuous",
                "faulty_wearable_continuous_{suffix}.jsonl",
            ),
            faulty_wearable_spo2_triggered=output_files_data.get(
                "faulty_wearable_spo2_triggered",
                "faulty_wearable_spo2_triggered_{suffix}.jsonl",
            ),
            faulty_wearable_ecg_triggered=output_files_data.get(
                "faulty_wearable_ecg_triggered",
                "faulty_wearable_ecg_triggered_{suffix}.jsonl",
            ),
            wearable_fault_log=output_files_data.get("wearable_fault_log", "wearable_fault_log_{suffix}.json"),
            sleep_timeline=output_files_data.get("sleep_timeline", "sleep_timeline_{suffix}.json"),
            sleep_metrics=output_files_data.get("sleep_metrics", "sleep_metrics_{suffix}.json"),
            daily_metrics=output_files_data.get("daily_metrics", "daily_metrics_{suffix}.json"),
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
    seed: int | None = None,
    output_dir: Path | None = None,
) -> GenerationConfig:
    return GenerationConfig(
        config_path=config.config_path,
        run_name=config.run_name,
        patient_id=patient_id or config.patient_id,
        profiles_path=config.profiles_path,
        output_dir=output_dir.resolve() if output_dir else config.output_dir,
        start_time=start_time or config.start_time,
        duration_hours=config.duration_hours,
        seed=seed if seed is not None else config.seed,
        file_suffix_template=config.file_suffix_template,
        output_files=config.output_files,
        profile_generator=config.profile_generator,
        wearable=config.wearable,
        wearable_fault_injector=config.wearable_fault_injector,
        layers=config.layers,
    )
