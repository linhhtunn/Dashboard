from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from math import sqrt
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field, model_validator


class ActivityState(str, Enum):
    SLEEPING = "sleeping"
    LYING = "lying"
    SITTING = "sitting"
    STANDING = "standing"
    WALKING = "walking"


class BloodPressure(BaseModel):
    systolic: float = Field(..., ge=60, le=250, description="Systolic blood pressure in mmHg")
    diastolic: float = Field(..., ge=40, le=150, description="Diastolic blood pressure in mmHg")

    @model_validator(mode="after")
    def validate_pressure_order(self) -> "BloodPressure":
        if self.systolic <= self.diastolic:
            raise ValueError("systolic blood pressure must be greater than diastolic blood pressure")
        return self


class Accelerometer(BaseModel):
    x: float = Field(..., ge=-20, le=20, description="Acceleration on X axis in g")
    y: float = Field(..., ge=-20, le=20, description="Acceleration on Y axis in g")
    z: float = Field(..., ge=-20, le=20, description="Acceleration on Z axis in g")
    magnitude: Optional[float] = Field(None, ge=0, le=20, description="Resultant acceleration magnitude in g")

    @model_validator(mode="after")
    def fill_or_validate_magnitude(self) -> "Accelerometer":
        calculated = sqrt((self.x * self.x) + (self.y * self.y) + (self.z * self.z))
        if self.magnitude is None:
            self.magnitude = round(calculated, 4)
            return self

        if abs(self.magnitude - calculated) > 0.25:
            raise ValueError("accelerometer magnitude is not consistent with x/y/z axes")
        return self


class Gyroscope(BaseModel):
    x: float = Field(..., ge=-20, le=20, description="Angular velocity on X axis in rad/s")
    y: float = Field(..., ge=-20, le=20, description="Angular velocity on Y axis in rad/s")
    z: float = Field(..., ge=-20, le=20, description="Angular velocity on Z axis in rad/s")
    magnitude: Optional[float] = Field(None, ge=0, le=20, description="Resultant angular velocity in rad/s")

    @model_validator(mode="after")
    def fill_or_validate_magnitude(self) -> "Gyroscope":
        calculated = sqrt((self.x * self.x) + (self.y * self.y) + (self.z * self.z))
        if self.magnitude is None:
            self.magnitude = round(calculated, 4)
            return self

        if abs(self.magnitude - calculated) > 0.25:
            raise ValueError("gyroscope magnitude is not consistent with x/y/z axes")
        return self


class SensorData(BaseModel):
    patient_id: str = Field(..., min_length=1, description="Patient id, e.g. P001")
    timestamp: datetime
    activity_state: ActivityState = Field(..., description="Current activity/posture state")

    heart_rate: float = Field(..., ge=30, le=220, description="Heart rate in bpm")
    rr_interval_ms: Optional[float] = Field(None, ge=250, le=2000, description="RR interval in ms")
    hrv_rmssd: Optional[float] = Field(None, ge=0, le=500, description="HRV RMSSD in ms")

    blood_pressure: BloodPressure
    spo2: float = Field(..., ge=70, le=100, description="Oxygen saturation percentage")

    accelerometer: Accelerometer
    gyroscope: Gyroscope

    @model_validator(mode="after")
    def fill_or_validate_derived_fields(self) -> "SensorData":
        calculated_rr = 60000.0 / self.heart_rate
        if self.rr_interval_ms is None:
            self.rr_interval_ms = round(calculated_rr, 2)
        elif abs(self.rr_interval_ms - calculated_rr) > 150:
            raise ValueError("rr_interval_ms is not consistent with heart_rate")

        return self

    def to_clean_vitals_row(self) -> Dict[str, Any]:
        return {
            "patient_id": self.patient_id,
            "timestamp": self.timestamp,
            "heart_rate": self.heart_rate,
            "rr_interval_ms": self.rr_interval_ms,
            "hrv_rmssd": self.hrv_rmssd,
            "systolic_bp": self.blood_pressure.systolic,
            "diastolic_bp": self.blood_pressure.diastolic,
            "spo2": self.spo2,
            "acc_x": self.accelerometer.x,
            "acc_y": self.accelerometer.y,
            "acc_z": self.accelerometer.z,
            "acc_magnitude": self.accelerometer.magnitude,
            "gyro_x": self.gyroscope.x,
            "gyro_y": self.gyroscope.y,
            "gyro_z": self.gyroscope.z,
            "gyro_magnitude": self.gyroscope.magnitude,
        }

    def flat_signals(self) -> Dict[str, float | None]:
        """Flat numeric fields for range / fault checks in cleaner."""
        return {
            "heart_rate": self.heart_rate,
            "spo2": self.spo2,
            "hrv_rmssd": self.hrv_rmssd,
        }


class WearableVitals(BaseModel):
    """
    Wearable v2 record (continuous or merged triggered fields).
    Matches `backend/simulator/docs/wearable_simulator_expected_output.md`.
    """

    patient_id: str = Field(..., min_length=1)
    timestamp: datetime
    steps: Optional[int] = Field(None, ge=0)
    distance_km: Optional[float] = Field(None, ge=0)
    heart_rate: Optional[float] = Field(None, ge=0)
    respiratory_rate: Optional[float] = Field(None, ge=0)
    spo2: Optional[float] = Field(None, ge=0)
    temperature_c: Optional[float] = None
    hrv_rmssd: Optional[float] = Field(None, ge=0)
    stress_score: Optional[int] = Field(None, ge=0, le=99)
    ecg_status: Optional[str] = None
    ecg_heart_rhythm: Optional[str] = None
    sleep_stage: Optional[str] = None
    sleep_quality: Optional[str] = None

    def to_clean_vitals_row(self) -> Dict[str, Any]:
        return {
            "patient_id": self.patient_id,
            "timestamp": self.timestamp,
            "steps": self.steps,
            "distance_km": self.distance_km,
            "heart_rate": self.heart_rate,
            "respiratory_rate": self.respiratory_rate,
            "spo2": self.spo2,
            "temperature_c": self.temperature_c,
            "hrv_rmssd": self.hrv_rmssd,
            "stress_score": self.stress_score,
            "ecg_status": self.ecg_status,
            "ecg_heart_rhythm": self.ecg_heart_rhythm,
            "sleep_stage": self.sleep_stage,
            "sleep_quality": self.sleep_quality,
        }

    def flat_signals(self) -> Dict[str, float | None]:
        return {
            "heart_rate": self.heart_rate,
            "respiratory_rate": self.respiratory_rate,
            "spo2": self.spo2,
            "temperature_c": self.temperature_c,
            "hrv_rmssd": self.hrv_rmssd,
            "stress_score": float(self.stress_score) if self.stress_score is not None else None,
        }


@dataclass(frozen=True)
class ParsedQueueMessage:
    message_id: str
    sensor: Any
    scenario_id: str | None = None


def _parse_timestamp(value: Any) -> Any:
    if isinstance(value, str) and value.endswith("Z"):
        return value.replace("Z", "+00:00")
    return value


BROKER_REQUIRED_SIGNAL_KEYS: tuple[str, ...] = (
    "heart_rate",
    "systolic_bp",
    "diastolic_bp",
    "spo2",
    "acc_x",
    "acc_y",
    "acc_z",
    "gyro_x",
    "gyro_y",
    "gyro_z",
)


def _require_broker_signals(signals: dict[str, Any]) -> None:
    missing = [key for key in BROKER_REQUIRED_SIGNAL_KEYS if key not in signals]
    if missing:
        raise ValueError(f"missing signals: {missing}")


def _signal_hrv_rmssd(signals: dict[str, Any]) -> float | None:
    """Simulator uses hrv_rmssd; legacy fixtures may use hrv."""
    if signals.get("hrv_rmssd") is not None:
        return signals["hrv_rmssd"]
    return signals.get("hrv")


def _finalize_constructed_sensor(sensor: SensorData) -> SensorData:
    if sensor.heart_rate and sensor.rr_interval_ms is None:
        sensor.rr_interval_ms = round(60000.0 / sensor.heart_rate, 2)
    acc = sensor.accelerometer
    if acc.magnitude is None:
        acc.magnitude = round(sqrt((acc.x * acc.x) + (acc.y * acc.y) + (acc.z * acc.z)), 4)
    gyro = sensor.gyroscope
    if gyro.magnitude is None:
        gyro.magnitude = round(sqrt((gyro.x * gyro.x) + (gyro.y * gyro.y) + (gyro.z * gyro.z)), 4)
    return sensor


def _activity_from_context(context: dict[str, Any] | None) -> ActivityState:
    if not context:
        return ActivityState.SITTING
    raw = context.get("activity_state", "sitting")
    try:
        return ActivityState(str(raw).lower())
    except ValueError:
        return ActivityState.SITTING


def parse_queue_payload(data: dict[str, Any]) -> ParsedQueueMessage:
    """
    Parse RabbitMQ JSON into SensorData.

    Supports broker envelope (message_id + signals.*) or nested SensorData fields.
    """
    message_id = str(data.get("message_id") or "")
    context = data.get("context")
    scenario_id = context.get("scenario_id") if isinstance(context, dict) else None

    if "signals" in data:
        # Broker payloads may contain fault values; cleaner classifies them.
        signals = data["signals"]
        _require_broker_signals(signals)
        for key in ("message_id", "patient_id", "timestamp"):
            if key not in data:
                raise ValueError(f"missing field: {key}")
        ts = _parse_timestamp(data["timestamp"])
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts)
        sensor = SensorData.model_construct(
            patient_id=data["patient_id"],
            timestamp=ts,
            activity_state=_activity_from_context(context if isinstance(context, dict) else None),
            heart_rate=signals["heart_rate"],
            rr_interval_ms=signals.get("rr_interval_ms"),
            hrv_rmssd=_signal_hrv_rmssd(signals),
            blood_pressure=BloodPressure.model_construct(
                systolic=signals["systolic_bp"],
                diastolic=signals["diastolic_bp"],
            ),
            spo2=signals["spo2"],
            accelerometer=Accelerometer.model_construct(
                x=signals["acc_x"],
                y=signals["acc_y"],
                z=signals["acc_z"],
                magnitude=signals.get("acc_magnitude"),
            ),
            gyroscope=Gyroscope.model_construct(
                x=signals["gyro_x"],
                y=signals["gyro_y"],
                z=signals["gyro_z"],
                magnitude=signals.get("gyro_magnitude"),
            ),
        )
        sensor = _finalize_constructed_sensor(sensor)
    elif "patient_id" in data and "timestamp" in data and (
        "heart_rate" in data
        or "respiratory_rate" in data
        or "stress_score" in data
        or "steps" in data
        or "spo2" in data
        or "ecg_status" in data
        or "sleep_stage" in data
    ):
        body = dict(data)
        body.pop("schema_version", None)
        body.pop("device_id", None)
        body.pop("context", None)
        body.pop("message_id", None)
        if "timestamp" in body:
            body["timestamp"] = _parse_timestamp(body["timestamp"])
        sensor = WearableVitals.model_validate(body)
    else:
        body = {k: v for k, v in data.items() if k not in ("message_id", "schema_version", "device_id", "context")}
        if "timestamp" in body:
            body["timestamp"] = _parse_timestamp(body["timestamp"])
        sensor = SensorData.model_validate(body)

    if not message_id:
        message_id = f"msg_{sensor.patient_id}_{int(sensor.timestamp.timestamp())}"

    return ParsedQueueMessage(message_id=message_id, sensor=sensor, scenario_id=scenario_id)
