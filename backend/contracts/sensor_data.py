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
