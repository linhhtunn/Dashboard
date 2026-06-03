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
```

## Design

- `config/patient_profiles.json`: synthetic patient baselines by age/subject group.
- `config/default_generation_config.py`: run-level settings such as patient, start time, seed, output names, and timeline.
- `generation_config.py`: parser for generation config.
- `rules.py`: ranges and activity effects based on `biosignal_reference_summary.md`.
- `timeline.py`: configured activity timeline and ground-truth/context export.
- `signals.py`: Monte Carlo target sampling, temporal smoothing, and IMU variance.
- `generate_patient_simulation.py`: CLI entry point.

The current Sprint 1 template generates a normal stream only:

```text
00:00-20:00 sitting
20:00-45:00 walking
45:00-60:00 resting
60:00-80:00 vigorous_activity
80:00-120:00 sitting
```

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
`TIMELINE_MODE = "fixed"` and edit the final `end_minute` or add/remove blocks
in `FIXED_TIMELINE_SEGMENTS`. For example, a final `end_minute` of `120` means
2 hours. A final `end_minute` of `90` means 90 minutes. The output file suffix
uses `{duration_label}`, so names update automatically, such as `P001_2h` or
`P001_90m`.

Timeline scaffolding for future layers:

```python
TIMELINE_MODE = "fixed"  # fixed | template | generated
FIXED_TIMELINE_SEGMENTS = [...]
TIMELINE_TEMPLATE_NAME = None
GENERATED_TIMELINE_RULES = None
```

Only `fixed` is implemented right now. `template` and `generated` intentionally
raise `NotImplementedError` until those timeline layers are built.

CLI flags such as `--patient-id`, `--start-time`, `--seed`, and `--output-dir`
exist only for quick local overrides.

## Replay to RabbitMQ

RabbitMQ code lives in `backend/rabbit_mq` so Team 1/2/3 can share the same
topology and connection utilities. See `backend/rabbit_mq/README.md`.
