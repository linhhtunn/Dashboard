from __future__ import annotations

import importlib.util
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEFAULT_CONFIG_PATH = Path(__file__).parent / "config" / "default_generation_config.py"


@dataclass(frozen=True)
class OutputFileConfig:
    activity_timeline: str
    generated_vitals: str
    scenario_ground_truth: str


@dataclass(frozen=True)
class TimelineSegmentConfig:
    activity_state: str
    activity_intensity: str
    start_second: int
    end_second: int
    scenario_id: str | None = None
    event_type: str | None = None
    ground_truth_label: str = "NORMAL"
    expected_severity: str = "LOW"


@dataclass(frozen=True)
class TimelineConfig:
    segments: list[TimelineSegmentConfig]
    scenario_id_template: str = "SCN_NORMAL_{patient_id}_{index:03d}"


@dataclass(frozen=True)
class GenerationConfig:
    config_path: Path
    run_name: str
    patient_id: str
    profiles_path: Path
    output_dir: Path
    start_time: str
    sampling_interval_seconds: int
    seed: int
    file_suffix_template: str
    output_files: OutputFileConfig
    timeline: TimelineConfig
    layers: dict[str, Any]

    @property
    def duration_seconds(self) -> int:
        return max(segment.end_second for segment in self.timeline.segments)

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
            sampling_interval_seconds=self.sampling_interval_seconds,
            duration_seconds=self.duration_seconds,
            duration_label=self.duration_label,
        )

    def output_path(self, output_type: str) -> Path:
        filename_template = getattr(self.output_files, output_type)
        filename = filename_template.format(
            patient_id=self.patient_id,
            run_name=self.run_name,
            suffix=self.file_suffix,
            sampling_interval_seconds=self.sampling_interval_seconds,
            duration_seconds=self.duration_seconds,
            duration_label=self.duration_label,
        )
        return self.output_dir / filename


def _resolve_path(value: str | Path, base_dir: Path) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return (base_dir / path).resolve()


def _segment_from_dict(data: dict[str, Any]) -> TimelineSegmentConfig:
    if "start_second" in data and "end_second" in data:
        start_second = int(data["start_second"])
        end_second = int(data["end_second"])
    else:
        start_second = int(data["start_minute"]) * 60
        end_second = int(data["end_minute"]) * 60

    if end_second <= start_second:
        raise ValueError(f"Invalid timeline segment: end_second <= start_second: {data}")

    return TimelineSegmentConfig(
        scenario_id=data.get("scenario_id"),
        event_type=data.get("event_type"),
        activity_state=data["activity_state"],
        activity_intensity=data.get("activity_intensity", "normal"),
        start_second=start_second,
        end_second=end_second,
        ground_truth_label=data.get("ground_truth_label", "NORMAL"),
        expected_severity=data.get("expected_severity", "LOW"),
    )


def _load_timeline(data: dict[str, Any]) -> TimelineConfig:
    segments = [_segment_from_dict(item) for item in data["segments"]]
    return TimelineConfig(
        segments=segments,
        scenario_id_template=data.get("scenario_id_template", "SCN_NORMAL_{patient_id}_{index:03d}"),
    )


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
    timeline_mode = getattr(module, "TIMELINE_MODE", "fixed")
    if timeline_mode != "fixed":
        raise NotImplementedError(
            f"TIMELINE_MODE={timeline_mode!r} is not implemented yet. "
            "Use 'fixed' until template/generated timeline layers are added."
        )

    output_files_data = getattr(module, "OUTPUT_FILES", {})
    return GenerationConfig(
        config_path=config_path,
        run_name=getattr(module, "RUN_NAME", config_path.stem),
        patient_id=module.PATIENT_ID,
        profiles_path=Path(module.PROFILES_PATH).resolve(),
        output_dir=Path(module.OUTPUT_DIR).resolve(),
        start_time=module.START_TIME,
        sampling_interval_seconds=int(getattr(module, "SAMPLING_INTERVAL_SECONDS", 1)),
        seed=int(getattr(module, "SEED", 42)),
        file_suffix_template=getattr(module, "FILE_SUFFIX_TEMPLATE", "{patient_id}_{duration_label}"),
        output_files=OutputFileConfig(
            activity_timeline=output_files_data.get("activity_timeline", "activity_timeline_{suffix}.json"),
            generated_vitals=output_files_data.get("generated_vitals", "generated_vitals_{suffix}.jsonl"),
            scenario_ground_truth=output_files_data.get(
                "scenario_ground_truth",
                "scenario_ground_truth_{suffix}.json",
            ),
        ),
        timeline=TimelineConfig(
            segments=[_segment_from_dict(item) for item in module.FIXED_TIMELINE_SEGMENTS],
            scenario_id_template=getattr(module, "SCENARIO_ID_TEMPLATE", "SCN_NORMAL_{patient_id}_{index:03d}"),
        ),
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
        sampling_interval_seconds=config.sampling_interval_seconds,
        seed=seed if seed is not None else config.seed,
        file_suffix_template=config.file_suffix_template,
        output_files=config.output_files,
        timeline=config.timeline,
        layers=config.layers,
    )
