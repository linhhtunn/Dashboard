from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class WatchlistItem(BaseModel):
    fact: str = Field(..., description="The clinical fact, follow-up, or suspicion to monitor.")
    status: str = Field(default="ACTIVE", description="Status of this watchlist item (e.g., ACTIVE, RESOLVED).")
    created_at: str = Field(..., description="ISO timestamp when the fact was first observed or recorded.")
    updated_at: str = Field(..., description="ISO timestamp of the latest change to this item.")


class PatientClinicalMemory(BaseModel):
    patient_id: str
    clinical_watchlist: List[WatchlistItem] = Field(default_factory=list)


class DoctorPreferenceMemory(BaseModel):
    doctor_id: str
    documentation_style: Optional[str] = Field(
        None, description="Preferred documentation/note formatting style, e.g., SOAP, bulleted lists."
    )
    clinical_rules: List[str] = Field(
        default_factory=list, description="Specific clinical preference rules or guidelines this doctor follows."
    )
