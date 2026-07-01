from datetime import timedelta

from simulator.realtime import runtime as runtime_module
from simulator.realtime.runtime import RealtimeRunConfig, RealtimeSimulationRun


def _running_run() -> RealtimeSimulationRun:
    run = RealtimeSimulationRun(
        run_id="test-runtime",
        config=RealtimeRunConfig(
            patient_id="SIM-TEST",
            publish_rabbitmq=False,
            speed=1,
            seed=123,
        ),
    )
    run.status = "running"
    return run


def _advance(run: RealtimeSimulationRun, seconds: int) -> None:
    for _ in range(seconds):
        run._tick_locked()


class _AlreadyAliveThread:
    def is_alive(self) -> bool:
        return True


def test_start_reanchors_new_run_time_to_wall_clock(monkeypatch) -> None:
    run = RealtimeSimulationRun(
        run_id="test-start-time",
        config=RealtimeRunConfig(patient_id="SIM-START", publish_rabbitmq=False, seed=123),
    )
    created_time = run.start_time
    start_time = created_time + timedelta(minutes=12)
    monkeypatch.setattr(runtime_module, "utc_now", lambda: start_time)
    run._thread = _AlreadyAliveThread()

    snapshot = run.start()

    assert run.start_time == start_time
    assert snapshot["sim_time"] == runtime_module.format_utc_datetime(start_time)


def test_stop_discards_pending_rabbitmq_publishes() -> None:
    run = RealtimeSimulationRun(
        run_id="test-stop",
        config=RealtimeRunConfig(patient_id="SIM-STOP", patient_source="existing", publish_rabbitmq=True, seed=123),
    )
    run.publisher._publish_queue.put_nowait(("wearable_continuous", {"message_id": "m1"}))
    run.publisher._publish_queue.put_nowait(("wearable_motion_batch", {"message_id": "m2"}))

    snapshot = run.stop()

    assert snapshot["publisher"]["pending"] == 0
    assert run.publisher.stats()["pending"] == 0


def test_pause_discards_pending_publish_but_keeps_publish_setting() -> None:
    run = RealtimeSimulationRun(
        run_id="test-pause",
        config=RealtimeRunConfig(patient_id="SIM-PAUSE", patient_source="existing", publish_rabbitmq=True, seed=123),
    )
    run.status = "running"
    old_publisher = run.publisher
    old_publisher._publish_queue.put_nowait(("wearable_continuous", {"message_id": "m1"}))

    snapshot = run.pause()

    assert snapshot["status"] == "paused"
    assert snapshot["publish_rabbitmq"] is True
    assert old_publisher.stats()["pending"] == 0
    assert run.publisher is not old_publisher
    assert run.publisher.enabled is True


def test_publisher_close_keeps_stop_event_set_when_publish_lock_is_busy() -> None:
    run = RealtimeSimulationRun(
        run_id="test-busy-publisher",
        config=RealtimeRunConfig(patient_id="SIM-BUSY", patient_source="existing", publish_rabbitmq=True, seed=123),
    )
    run.publisher._publish_queue.put_nowait(("wearable_continuous", {"message_id": "m1"}))
    run.publisher._lock.acquire()
    try:
        run.publisher.close(drain=False)
        assert run.publisher._stop_event.is_set()
        assert run.publisher.stats()["pending"] == 0
    finally:
        run.publisher._lock.release()


def test_reenabling_publish_uses_fresh_publisher() -> None:
    run = RealtimeSimulationRun(
        run_id="test-publish-toggle",
        config=RealtimeRunConfig(patient_id="SIM-TOGGLE", patient_source="existing", publish_rabbitmq=True, seed=123),
    )
    old_publisher = run.publisher

    run.set_publish_rabbitmq(True)

    assert run.publisher is not old_publisher
    assert run.publisher.enabled is True


def test_create_run_stops_existing_publishers_by_default() -> None:
    manager = runtime_module.SimulationManager()
    first = manager.create_run(
        RealtimeRunConfig(patient_id="SIM-FIRST", patient_source="existing", publish_rabbitmq=True, seed=123)
    )
    first_run = manager.get(first["run_id"])
    first_run.status = "running"

    second = manager.create_run(RealtimeRunConfig(patient_id="SIM-SECOND", publish_rabbitmq=False, seed=456))

    assert second["run_id"] != first["run_id"]
    assert first_run.status == "stopped"
    assert first_run.publish_rabbitmq is False
    assert first_run.publisher.enabled is False


def test_sandbox_run_forces_publish_off() -> None:
    run = RealtimeSimulationRun(
        run_id="test-sandbox",
        config=RealtimeRunConfig(patient_id="SIM-SANDBOX", patient_source="sandbox", publish_rabbitmq=True, seed=123),
    )

    snapshot = run.snapshot()

    assert snapshot["patient_source"] == "sandbox"
    assert snapshot["publish_rabbitmq"] is False
    assert run.publisher.enabled is False


def test_sandbox_run_rejects_publish_toggle() -> None:
    run = RealtimeSimulationRun(
        run_id="test-sandbox-toggle",
        config=RealtimeRunConfig(patient_id="SIM-SANDBOX", patient_source="sandbox", publish_rabbitmq=False, seed=123),
    )

    try:
        run.set_publish_rabbitmq(True)
    except ValueError as exc:
        assert "existing patient" in str(exc)
    else:
        raise AssertionError("sandbox publish toggle should fail")


def test_spo2_drop_updates_spo2_stream_immediately() -> None:
    run = _running_run()
    baseline_spo2 = run.snapshot()["baseline"]["spo2"]

    snapshot = run.inject_abnormal("spo2_drop", duration_seconds=120)

    latest_spo2 = snapshot["latest"]["spo2_triggered"]
    assert latest_spo2 is not None
    assert latest_spo2["spo2"] < baseline_spo2
    assert snapshot["samples"][-1]["vitals"]["spo2"] == latest_spo2["spo2"]
    assert snapshot["raw_feed"][0]["stream_name"] == "wearable_spo2_triggered"


def test_fall_event_creates_motion_spike_and_ground_truth() -> None:
    run = _running_run()

    run.inject_abnormal("fall_event", duration_seconds=30)
    _advance(run, 2)
    snapshot = run.snapshot()

    assert snapshot["active_abnormal"]["episode_type"] == "fall_event"
    assert snapshot["latest"]["panels"]["motion"]["fall_spike"] is True
    assert snapshot["ground_truth"]["events"][-1]["expected_alert_type"] == "fall_detected"


def test_sandbox_run_does_not_persist_ground_truth(monkeypatch) -> None:
    persisted: list[dict] = []

    def fake_persist(self, ground_truth: dict) -> None:
        persisted.append(ground_truth)

    monkeypatch.setattr(RealtimeSimulationRun, "_persist_ground_truth_async", fake_persist)
    run = _running_run()

    snapshot = run.inject_abnormal("fall_event", duration_seconds=30)

    assert snapshot["ground_truth"]["events"][-1]["expected_alert_type"] == "fall_detected"
    assert persisted == []


def test_existing_run_persists_ground_truth_on_inject(monkeypatch) -> None:
    persisted: list[dict] = []

    def fake_persist(self, ground_truth: dict) -> None:
        persisted.append(ground_truth)

    monkeypatch.setattr(RealtimeSimulationRun, "_persist_ground_truth_async", fake_persist)
    run = RealtimeSimulationRun(
        run_id="test-existing-persist",
        config=RealtimeRunConfig(
            patient_id="P001",
            patient_source="existing",
            publish_rabbitmq=False,
            seed=123,
        ),
    )

    run.inject_abnormal("spo2_drop", duration_seconds=120)

    assert persisted
    assert persisted[-1]["patient_id"] == "P001"
    assert persisted[-1]["episode_type"] == "spo2_drop"


def test_fall_event_duration_is_clamped_for_detector_window() -> None:
    run = _running_run()

    snapshot = run.inject_abnormal("fall_event", duration_seconds=2)

    event = snapshot["ground_truth"]["events"][-1]
    assert event["episode_type"] == "fall_event"
    assert event["duration_seconds"] == 30


def test_manual_abnormal_duration_uses_reference_config_minimum() -> None:
    run = _running_run()

    snapshot = run.inject_abnormal("tachycardia", duration_seconds=2)

    event = snapshot["ground_truth"]["events"][-1]
    assert event["episode_type"] == "tachycardia"
    assert event["duration_seconds"] == 300


def test_afib_episode_shows_ppi_hrv_preview_before_full_patch() -> None:
    run = _running_run()

    run.inject_abnormal("afib_episode", duration_seconds=120)
    _advance(run, 4)
    snapshot = run.snapshot()
    ppi_panel = snapshot["latest"]["panels"]["ppi"]

    assert snapshot["active_abnormal"]["episode_type"] == "afib_episode"
    assert ppi_panel["ppi_intervals_ms"] == []
    assert len(ppi_panel["preview_intervals_ms"]) >= 5
    assert ppi_panel["preview_rmssd"] is not None
    assert ppi_panel["preview_irregularity"] is not None


def test_ppi_patch_uses_canonical_key_after_15_seconds() -> None:
    run = _running_run()

    _advance(run, 15)
    snapshot = run.snapshot()

    ppi_batch = snapshot["latest"]["ppi_batch"]
    assert ppi_batch is not None
    assert "ppi_intervals_ms" in ppi_batch
    assert "ppi_interval_ms" not in ppi_batch
    assert len(ppi_batch["ppi_intervals_ms"]) >= 5


def test_realtime_payloads_include_run_context_for_observability() -> None:
    run = _running_run()

    run.inject_abnormal("fall_event", duration_seconds=30)
    snapshot = run.snapshot()

    motion = snapshot["latest"]["motion_batch"]
    context = motion["context"]
    assert context["run_id"] == "test-runtime"
    assert context["trace_id"] == motion["message_id"]
    assert context["abnormal_event_type"] == "fall_event"
    assert context["abnormal_event_time"] == motion["timestamp"]
    assert snapshot["raw_feed"][0]["payload"]["context"]["run_id"] == "test-runtime"


def test_tachycardia_increases_live_heart_rate() -> None:
    run = _running_run()
    baseline_hr = run.snapshot()["baseline"]["heart_rate"]

    run.inject_abnormal("tachycardia", duration_seconds=120)
    _advance(run, 20)
    snapshot = run.snapshot()

    assert snapshot["latest"]["continuous"]["heart_rate"] > baseline_hr + 5


def test_bradycardia_decreases_live_heart_rate() -> None:
    run = _running_run()
    baseline_hr = run.snapshot()["baseline"]["heart_rate"]

    run.inject_abnormal("bradycardia", duration_seconds=120)
    _advance(run, 20)
    snapshot = run.snapshot()

    assert snapshot["latest"]["continuous"]["heart_rate"] < baseline_hr - 3


def test_hypertension_episode_increases_triggered_bp() -> None:
    run = _running_run()
    baseline_bp = run.snapshot()["baseline"]["systolic_bp"]

    snapshot = run.inject_abnormal("hypertension_episode", duration_seconds=120)

    assert snapshot["latest"]["bp_triggered"]["systolic_bp"] > baseline_bp + 20


def test_stress_episode_increases_stress_panel() -> None:
    run = _running_run()
    baseline_stress = run.snapshot()["latest"]["panels"]["activity"]["stress_score"]

    run.inject_abnormal("stress_episode", duration_seconds=120)
    _advance(run, 30)
    snapshot = run.snapshot()

    assert snapshot["latest"]["panels"]["activity"]["stress_score"] > baseline_stress + 5
