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
    fault_log: str


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
    context_event: str | None = None
    context_effects: dict[str, float] | None = None
    source: str = "configured"


@dataclass(frozen=True)
class TimelineConfig:
    segments: list[TimelineSegmentConfig]
    scenario_id_template: str = "SCN_NORMAL_{patient_id}_{index:03d}"
    mode: str = "fixed"
    generated_rules: dict[str, Any] | None = None
    micro_event_rules: dict[str, Any] | None = None


@dataclass(frozen=True)
class FaultInjectorConfig:
    enabled: bool
    probabilities: dict[str, float]
    max_faults: int | None = None


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
    fault_injector: FaultInjectorConfig
    behavior_noise: dict[str, Any]
    layers: dict[str, Any]

    @property
    def duration_seconds(self) -> int:
        if self.timeline.mode == "generated" and self.timeline.generated_rules:
            return int(self.timeline.generated_rules.get("duration_minutes", 120)) * 60
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
        context_event=data.get("context_event"),
        context_effects=data.get("context_effects"),
        source=data.get("source", "configured"),
    )


def _load_timeline(data: dict[str, Any]) -> TimelineConfig:
    segments = [_segment_from_dict(item) for item in data["segments"]]
    return TimelineConfig(
        segments=segments,
        scenario_id_template=data.get("scenario_id_template", "SCN_NORMAL_{patient_id}_{index:03d}"),
        mode=data.get("mode", "fixed"),
        generated_rules=data.get("generated_rules"),
        micro_event_rules=data.get("micro_event_rules"),
    )


def _load_fault_injector(module: Any) -> FaultInjectorConfig:
    config = getattr(module, "FAULT_INJECTOR_CONFIG", None)
    if not config:
        return FaultInjectorConfig(enabled=False, probabilities={}, max_faults=None)
    return FaultInjectorConfig(
        enabled=bool(config.get("enabled", False)),
        probabilities=dict(config.get("probabilities", {})),
        max_faults=config.get("max_faults"),
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
    supported_timeline_modes = {"fixed", "template", "generated"}
    if timeline_mode not in supported_timeline_modes:
        known = ", ".join(sorted(supported_timeline_modes))
        raise NotImplementedError(
            f"TIMELINE_MODE={timeline_mode!r} is not implemented. Known: {known}"
        )

    output_files_data = getattr(module, "OUTPUT_FILES", {})
    if timeline_mode == "template":
        template_name = getattr(module, "TIMELINE_TEMPLATE_NAME", None)
        templates = getattr(module, "TIMELINE_TEMPLATES", {})
        if not template_name or template_name not in templates:
            known = ", ".join(sorted(templates))
            raise ValueError(f"Unknown TIMELINE_TEMPLATE_NAME={template_name!r}. Known: {known}")
        timeline_segments = templates[template_name]
    else:
        timeline_segments = getattr(module, "FIXED_TIMELINE_SEGMENTS", [])

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
            fault_log=output_files_data.get("fault_log", "fault_log_{suffix}.json"),
        ),
        timeline=TimelineConfig(
            segments=[_segment_from_dict(item) for item in timeline_segments],
            scenario_id_template=getattr(module, "SCENARIO_ID_TEMPLATE", "SCN_NORMAL_{patient_id}_{index:03d}"),
            mode=timeline_mode,
            generated_rules=getattr(module, "GENERATED_TIMELINE_RULES", None),
            micro_event_rules=getattr(module, "MICRO_EVENT_RULES", None),
        ),
        fault_injector=_load_fault_injector(module),
        behavior_noise=getattr(module, "BEHAVIOR_NOISE_CONFIG", {}),
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
        fault_injector=config.fault_injector,
        behavior_noise=config.behavior_noise,
        layers=config.layers,
    )
