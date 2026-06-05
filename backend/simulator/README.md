# Wearable Simulator v2

This package generates synthetic wearable data for one patient.

The active simulator flow is wearable v2. It no longer emits the old v1
`activity_timeline`, `generated_vitals`, or `scenario_ground_truth` files.

## Run

From the repository root:

```bash
python -m backend.simulator.generate_patient_simulation
```

Default run-level settings live in:

```text
backend/simulator/config/default_generation_config.py
```

The non-tech config selects the patient, health mode, start time, duration,
seed, and whether wearable fault injection is enabled.

## Active Outputs

Generated files are written to:

```text
backend/simulator/output/
```

Clean wearable outputs:

```text
wearable_continuous_{suffix}.jsonl
wearable_spo2_triggered_{suffix}.jsonl
wearable_ecg_triggered_{suffix}.jsonl
sleep_timeline_{suffix}.json
sleep_metrics_{suffix}.json
daily_metrics_{suffix}.json
```

Faulty test outputs, when `FAULT_INJECTION_ENABLED = True`:

```text
faulty_wearable_continuous_{suffix}.jsonl
faulty_wearable_spo2_triggered_{suffix}.jsonl
faulty_wearable_ecg_triggered_{suffix}.jsonl
wearable_fault_log_{suffix}.json
```

See the full output contract:

```text
backend/simulator/docs/wearable_simulator_expected_output.md
```

## Active v2 Files

- `generate_patient_simulation.py`: main CLI entry point.
- `generation_config.py`: loads the v2 run config and output file names.
- `profile_generator.py`: Monte Carlo patient profile generator.
- `profiles.py`: loads patient profiles.
- `wearable_timeline.py`: generates master sleep/activity timeline.
- `wearable_signals.py`: generates continuous, triggered, and daily wearable signals.
- `wearable_faults.py`: injects wearable-aware data quality faults.
- `exporters.py`: writes JSON and JSONL files.
- `config/default_generation_config.py`: non-tech run config for one generated user.
- `config/profile_generation_config.py`: demographic, pregnancy, lifestyle, and risk profile rules.
- `config/wearable_reference_config.py`: activity effects, sleep rules, signal noise rules.
- `config/wearable_dev_config.py`: output file names, windows, trigger schedule, ECG config.
- `config/fault_injector_config.py`: wearable fault injection probabilities.

## Wearable v2 Logic

Continuous output is emitted every second.

`heart_rate` and `respiratory_rate` are sliding-window estimates:

```python
WINDOWS = {
    "heart_rate_seconds": 30,
    "respiratory_rate_seconds": 60,
}
```

Continuous fields:

```text
steps
heart_rate
respiratory_rate
stress_score
```

Triggered fields:

```text
spo2
ecg waveform points
```

Daily fields:

```text
hrv_rmssd_morning
```

Sleep is generated as a night block with realistic jitter, stage cycles, and
micro-awake segments. `sleep_metrics` is derived from `sleep_timeline`; it is
not random and does not emit `good/fair/poor` labels.

## Legacy v1 Files

These files still exist for historical/reference purposes, but they are not used
by the current `generate_patient_simulation.py` flow:

```text
timeline.py
signals.py
rules.py
signal_expectations.py
faults.py
config/timeline_generation_config.py
config/behavior_noise_config.py
```

Do not build new Team 1/2/3 integration against those v1 outputs unless the
team explicitly decides to revive the old biosignal contract.

## Quick Checks

Compile:

```bash
python -m compileall -q backend/simulator
```

Generate:

```bash
python -m backend.simulator.generate_patient_simulation
```

Expected for a 24h run:

```text
wearable_continuous...jsonl -> 86400 clean records
faulty_wearable_continuous...jsonl -> may differ because of missing/duplicate records
wearable_fault_log...json -> records injected data quality faults
```
