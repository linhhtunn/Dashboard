# Biosignal Simulator

This package generates synthetic biosignal data for one patient.

The generated raw message intentionally does not include units, context, activity
state, or ground-truth labels. Units are fixed by the data contract. Context and
labels are exported separately through `scenario_ground_truth`.

## Generate P001 Sample

Run from the repository root:

```bash
python -m backend.simulator.generate_patient_simulation --config backend/simulator/config/default_generation_config.py
python -m backend.simulator.generate_patient_simulation
```

Default outputs:

```text
backend/simulator/output/activity_timeline_P001_2h.json
backend/simulator/output/generated_vitals_P001_2h.jsonl
backend/simulator/output/scenario_ground_truth_P001_2h.json
backend/simulator/output/fault_log_P001_2h.json
```

## Design

- `config/patient_profiles.json`: synthetic patient baselines by age/subject group.
- `config/default_generation_config.py`: run-level settings such as patient, start time, seed, output names, and timeline.
- `generation_config.py`: parser for generation config.
- `rules.py`: ranges and activity effects based on `biosignal_reference_summary.md`.
- `timeline.py`: fixed/template/generated activity timeline and ground-truth/context export.
- `signals.py`: Monte Carlo target sampling, temporal smoothing, and IMU variance.
- `faults.py`: probability-based data-quality fault injection for Team 2 validation.
- `generate_patient_simulation.py`: CLI entry point.

The default config now uses a generated 2-hour timeline:

```text
TIMELINE_MODE = "generated"
GENERATED_TIMELINE_RULES = {...}
MICRO_EVENT_RULES = {...}
```

The generator uses a simple Markov-style transition matrix for macro activity
blocks, then applies configured anchor segments for demo windows such as walking
or vigorous activity. Human behavior inside a macro activity is modeled as
unlabeled behavior noise, not as a long list of explicit events. For example,
when someone is sitting, the simulator does not need to know whether they are
talking, annoyed, laughing, or shifting posture; it only adds short hidden
variability pulses that affect HR, HRV, BP, accelerometer, or gyroscope
behavior. Some pulses are small, while rare strong pulses can be larger as long
as they are short and recover instead of becoming a sustained abnormal pattern.

Most values that change between runs should live in
`config/default_generation_config.py`, not in generator code:

```python
PATIENT_ID = "P001"
START_TIME = "2026-06-03T10:00:00Z"
SAMPLING_INTERVAL_SECONDS = 1
SEED = 42
OUTPUT_DIR = SIMULATOR_DIR / "output"
FILE_SUFFIX_TEMPLATE = "{patient_id}_{duration_label}"
```

To generate one message every 5 seconds, change:

```python
SAMPLING_INTERVAL_SECONDS = 5
```

To increase or decrease the total generated duration, keep
`TIMELINE_MODE = "generated"` and edit:

```python
GENERATED_TIMELINE_RULES = {
    "duration_minutes": 120,
    ...
}
```

The output file suffix uses `{duration_label}`, so names update automatically,
such as `P001_2h` or `P001_90m`.

Timeline modes:

```python
TIMELINE_MODE = "fixed"  # fixed | template | generated
FIXED_TIMELINE_SEGMENTS = [...]
TIMELINE_TEMPLATE_NAME = None
TIMELINE_TEMPLATES = {...}
GENERATED_TIMELINE_RULES = {...}
MICRO_EVENT_RULES = {...}
BEHAVIOR_NOISE_CONFIG = {...}
```

`fixed` is useful for exact deterministic demos. `template` selects a named
timeline template. `generated` uses the Markov-style generator plus optional
anchors. `MICRO_EVENT_RULES` is optional and disabled by default; use it only if
you intentionally want labeled context events in timeline/ground-truth files.
For normal realism, prefer `BEHAVIOR_NOISE_CONFIG`.

Behavior noise is controlled here:

```python
BEHAVIOR_NOISE_CONFIG = {
    "enabled": True,
    "probability_per_minute": 0.18,
    "activity_multipliers": {...},
    "profiles": [
        {"name": "minor_variability", "weight": 0.65, ...},
        {"name": "moderate_transient", "weight": 0.28, ...},
        {"name": "strong_short_spike", "weight": 0.07, ...},
    ],
}
```

Fault injection is controlled here:

```python
FAULT_INJECTOR_CONFIG = {
    "enabled": True,
    "max_faults": 20,
    "probabilities": {
        "missing_timestamp": 0.0010,
        "missing_patient_id": 0.0008,
        "missing_signal": 0.0010,
        "invalid_heart_rate": 0.0012,
        "invalid_spo2": 0.0012,
        "duplicate_message": 0.0010,
        "out_of_order_timestamp": 0.0010,
    },
}
```

The generated vitals JSONL may contain intentionally faulty messages when this
is enabled. `fault_log_P001_2h.json` records which messages were modified.
Turn `enabled` to `False` when you need a clean-only stream.

CLI flags such as `--patient-id`, `--start-time`, `--seed`, and `--output-dir`
exist only for quick local overrides.

## Replay to RabbitMQ

RabbitMQ code lives in `backend/rabbit_mq` so Team 1/2/3 can share the same
topology and connection utilities. See `backend/rabbit_mq/README.md`.
