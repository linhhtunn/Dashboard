from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.contracts import ToolResponse, tool_error, tool_not_found, tool_success
from app.repositories.ports import AlertRepository, PatientRepository, RepositoryItemNotFoundError
from app.services.clinical import (
    DrugSafetyEngine,
    FeatureService,
    GuidelineRetriever,
    RuleEngine,
    MedicationDomainRegistry,
)
from app.tools.base import ToolContext, ToolRequest
from app.tools.clinical.patient_context_tool import _resolve_patient_id
from app.tools.clinical.vitals_summary_tool import VitalsSummaryTool


CLINICIAN_REVIEW_CHECKLIST = [
    "Verify AF diagnosis and indication before clinical use.",
    "Review renal function, hepatic function, bleeding risk, and recent labs.",
    "Review active medications for drug-drug interactions.",
    "Confirm contraindications and guideline fit for this specific patient.",
    "Treat this as clinical decision support, not a final prescription.",
]

HYPERTENSION_REVIEW_CHECKLIST = [
    "Confirm repeated blood pressure measurements and measurement technique.",
    "Review kidney function, potassium, sodium, pregnancy status, gout history, bradycardia, and heart failure phenotype.",
    "Review current medications and orthostatic symptoms before medication changes.",
    "Treat this as clinical decision support, not a final prescription.",
]


@dataclass(frozen=True)
class PatientSummaryContextTool:
    patient_repository: PatientRepository

    name: str = "clinical.patient_summary_context"
    description: str = "Build structured patient summary context for routed chat responses."

    async def run(
        self,
        request: ToolRequest,
        context: ToolContext | None = None,
    ) -> ToolResponse:
        patient_id = _resolve_patient_id(request=request, context=context)
        if not patient_id:
            return tool_not_found(tool_name=self.name, message="patient_id is required")

        try:
            patient = self.patient_repository.get_by_id(patient_id)
        except RepositoryItemNotFoundError:
            return tool_not_found(tool_name=self.name, message=f"Patient not found: {patient_id}")
        except Exception as exc:
            return tool_error(tool_name=self.name, message=f"Failed to load patient context: {exc}")

        recent_alerts = patient.get("recent_alerts") or []
        recent_vitals = patient.get("recent_vitals") or []
        data_availability = {
            "patient": True,
            "recent_alerts": bool(recent_alerts),
            "recent_vitals": bool(recent_vitals),
            "notes": _availability_notes(recent_alerts=recent_alerts, recent_vitals=recent_vitals),
        }
        return tool_success(
            tool_name=self.name,
            data={
                "patient": patient,
                "recent_alerts": recent_alerts,
                "recent_vitals": recent_vitals,
                "data_availability": data_availability,
            },
        )


@dataclass(frozen=True)
class AlertExplanationContextTool:
    alert_repository: AlertRepository
    patient_repository: PatientRepository

    name: str = "clinical.alert_explanation_context"
    description: str = "Build structured alert explanation context for routed chat responses."

    async def run(
        self,
        request: ToolRequest,
        context: ToolContext | None = None,
    ) -> ToolResponse:
        alert_id = request.arguments.get("alert_id")
        if not isinstance(alert_id, str) or not alert_id.strip():
            patient_id = _resolve_patient_id(request=request, context=context)
            if not patient_id:
                return tool_not_found(tool_name=self.name, message="alert_id or patient_id is required")
            try:
                alert_id = self.alert_repository.get_latest_alert_id_by_patient(patient_id)
            except Exception as exc:
                return tool_error(tool_name=self.name, message=f"Failed to fetch latest alert for patient: {exc}")
            
            if not alert_id:
                return tool_success(
                    tool_name=self.name,
                    data={
                        "alert_id": None,
                        "alert": None,
                        "patient": None,
                        "sensor_context": [],
                        "data_availability": {
                            "alert": False,
                            "patient": False,
                            "sensor_context": False,
                            "notes": ["No alerts found for this patient."],
                        },
                    },
                    message="No alerts found for this patient.",
                )
        else:
            alert_id = alert_id.strip()

        patient = None
        try:
            alert = self.alert_repository.get_by_id(alert_id)
        except RepositoryItemNotFoundError:
            return tool_success(
                tool_name=self.name,
                data={
                    "alert_id": alert_id,
                    "alert": None,
                    "patient": None,
                    "sensor_context": [],
                    "data_availability": {
                        "alert": False,
                        "patient": False,
                        "sensor_context": False,
                        "notes": [
                            "Alert data is unavailable; upstream alert handoff may not be complete.",
                        ],
                    },
                },
                message=f"Alert not found: {alert_id}",
            )
        except Exception as exc:
            return tool_success(
                tool_name=self.name,
                data={
                    "alert_id": alert_id,
                    "alert": None,
                    "patient": None,
                    "sensor_context": [],
                    "data_availability": {
                        "alert": False,
                        "patient": False,
                        "sensor_context": False,
                        "notes": [
                            f"Alert data could not be queried: {exc}",
                        ],
                    },
                },
                message=f"Alert data unavailable: {exc}",
            )

        patient_id = alert.get("patient_id") or (context.patient_id if context else None)
        if patient_id:
            try:
                patient = self.patient_repository.get_by_id(str(patient_id))
            except Exception:
                patient = None

        sensor_context = alert.get("sensor_context") or []
        return tool_success(
            tool_name=self.name,
            data={
                "alert_id": alert_id,
                "alert": alert,
                "patient": patient,
                "sensor_context": sensor_context,
                "data_availability": {
                    "alert": True,
                    "patient": patient is not None,
                    "sensor_context": bool(sensor_context),
                    "notes": [] if sensor_context else ["Sensor context is unavailable or empty."],
                },
            },
        )


@dataclass(frozen=True)
class AFAnticoagulationRecommendationContextTool:
    patient_repository: PatientRepository
    rule_engine: RuleEngine
    guideline_retriever: GuidelineRetriever

    name: str = "clinical.af_anticoagulation_recommendation_context"
    description: str = "Evaluate AF anticoagulation CDSS recommendations and safety context."

    async def run(
        self,
        request: ToolRequest,
        context: ToolContext | None = None,
    ) -> ToolResponse:
        patient_id = _resolve_patient_id(request=request, context=context)
        if not patient_id:
            return tool_not_found(tool_name=self.name, message="patient_id is required")

        try:
            patient = self.patient_repository.get_by_id(patient_id)
        except RepositoryItemNotFoundError:
            return tool_not_found(tool_name=self.name, message=f"Patient not found: {patient_id}")
        except Exception as exc:
            return tool_error(tool_name=self.name, message=f"Failed to load patient context: {exc}")

        feature_service = FeatureService()
        clinical_features = feature_service.extract_all(patient)
        initial_recommendations = self.rule_engine.evaluate_initial_recommendations(clinical_features)
        safety_engine = DrugSafetyEngine(self.rule_engine)
        safety_payload = safety_engine.filter_drugs(clinical_features, initial_recommendations)
        triggered_rules = self.rule_engine.evaluate_triggered_rules(clinical_features)
        evidence = await self.guideline_retriever.retrieve(
            query=str(request.arguments.get("query") or ""),
            clinical_features=clinical_features,
            triggered_rules=triggered_rules,
        )
        missing_inputs = _missing_medication_inputs(clinical_features)

        return tool_success(
            tool_name=self.name,
            data={
                "patient": patient,
                "clinical_features": clinical_features,
                "initial_recommendations": initial_recommendations,
                "allowed_drugs": safety_payload.get("allowed_drugs", []),
                "blocked_drugs": safety_payload.get("blocked_drugs", {}),
                "requires_laao": safety_payload.get("requires_laao", False),
                "warning": safety_payload.get("warning"),
                "triggered_rules": triggered_rules,
                "retrieved_evidence": evidence,
                "clinician_review_required": CLINICIAN_REVIEW_CHECKLIST,
                "data_availability": {
                    "patient": True,
                    "clinical_features": True,
                    "missing_inputs": missing_inputs,
                    "notes": [
                        f"Missing clinical input: {item}" for item in missing_inputs
                    ],
                },
            },
        )


@dataclass(frozen=True)
class MedicationRecommendationContextTool:
    patient_repository: PatientRepository
    domain_registry: MedicationDomainRegistry
    guideline_retriever: GuidelineRetriever | None = None

    name: str = "clinical.medication_recommendation_context"
    description: str = "Evaluate medication recommendations dynamically for the active domain."

    async def run(
        self,
        request: ToolRequest,
        context: ToolContext | None = None,
    ) -> ToolResponse:
        patient_id = _resolve_patient_id(request=request, context=context)
        if not patient_id:
            return tool_not_found(tool_name=self.name, message="patient_id is required")

        try:
            patient = self.patient_repository.get_by_id(patient_id)
        except RepositoryItemNotFoundError:
            return tool_not_found(tool_name=self.name, message=f"Patient not found: {patient_id}")
        except Exception as exc:
            return tool_error(tool_name=self.name, message=f"Failed to load patient context: {exc}")

        # Resolve domain
        domain_id = request.arguments.get("medication_domain")
        query = request.arguments.get("query") or ""
        if not domain_id and query:
            domain_id = self.domain_registry.match_domain(query)

        if not domain_id:
            return tool_error(
                tool_name=self.name,
                message="Could not resolve clinical medication domain. Please specify medication_domain."
            )

        domain = self.domain_registry.get_domain(domain_id)
        if not domain:
            return tool_error(
                tool_name=self.name,
                message=f"Medication domain '{domain_id}' is not loaded or invalid."
            )

        feature_service = FeatureService()
        clinical_features = feature_service.extract_all(patient)
        initial_recommendations = domain.rule_engine.evaluate_initial_recommendations(clinical_features)
        safety_engine = DrugSafetyEngine(domain.rule_engine)
        safety_payload = safety_engine.filter_drugs(
            clinical_features,
            initial_recommendations,
            fallback_drugs=domain.fallback_drugs,
            emergency_warning=domain.emergency_warning,
        )
        triggered_rules = domain.rule_engine.evaluate_triggered_rules(clinical_features)
        retriever = self.guideline_retriever or domain.guideline_retriever
        evidence = await retriever.retrieve(
            query=str(query),
            clinical_features=clinical_features,
            triggered_rules=triggered_rules,
        )
        missing_inputs = [f for f in domain.required_inputs if clinical_features.get(f) is None]

        # Populate domain-specific flags for backward compatibility
        requires_laao = safety_payload.get("requires_laao", False)
        requires_specialist_review = requires_laao if domain_id == "hypertension" else False
        laao_flag = requires_laao if domain_id == "af_anticoagulation" else False

        return tool_success(
            tool_name=self.name,
            data={
                "medication_domain": domain_id,
                "domain_display_name": domain.name,
                "rule_dir": domain.rule_engine.rule_directory,
                "patient": patient,
                "clinical_features": clinical_features,
                "initial_recommendations": initial_recommendations,
                "allowed_drugs": safety_payload.get("allowed_drugs", []),
                "blocked_drugs": safety_payload.get("blocked_drugs", {}),
                "requires_laao": laao_flag,
                "requires_specialist_review": requires_specialist_review,
                "warning": safety_payload.get("warning"),
                "triggered_rules": triggered_rules,
                "retrieved_evidence": evidence,
                "clinician_review_required": domain.clinician_review_checklist,
                "data_availability": {
                    "patient": True,
                    "clinical_features": True,
                    "missing_inputs": missing_inputs,
                    "notes": [
                        f"Missing clinical input: {item}" for item in missing_inputs
                    ],
                },
            },
        )


@dataclass(frozen=True)
class VitalsTrendContextTool:
    vitals_summary_tool: VitalsSummaryTool

    name: str = "clinical.vitals_trend_context"
    description: str = "Build structured vitals trend context with missing-data handling."

    async def run(
        self,
        request: ToolRequest,
        context: ToolContext | None = None,
    ) -> ToolResponse:
        patient_id = _resolve_patient_id(request=request, context=context)
        if not patient_id:
            return tool_not_found(tool_name=self.name, message="patient_id is required")

        response = await self.vitals_summary_tool.run(
            ToolRequest(
                name=self.vitals_summary_tool.name,
                arguments={
                    "patient_id": patient_id,
                    "time_window_minutes": request.arguments.get("time_window_minutes") or 60,
                    **(
                        {"interval_seconds": request.arguments["interval_seconds"]}
                        if request.arguments.get("interval_seconds") is not None
                        else {}
                    ),
                },
            ),
            context=context,
        )
        if not response.ok:
            return tool_success(
                tool_name=self.name,
                data={
                    "patient_id": patient_id,
                    "vitals_summary": {},
                    "data_availability": {
                        "vitals": False,
                        "notes": [
                            response.message
                            or "Vitals data is unavailable; upstream vitals handoff may not be complete.",
                        ],
                    },
                },
                message=response.message,
            )

        summary = response.data.get("summary") or []
        return tool_success(
            tool_name=self.name,
            data={
                "patient_id": patient_id,
                "vitals_summary": response.data,
                "data_availability": {
                    "vitals": bool(summary),
                    "notes": [] if summary else ["Vitals summary is empty."],
                },
            },
        )


def _availability_notes(*, recent_alerts: list, recent_vitals: list) -> list[str]:
    notes = []
    if not recent_alerts:
        notes.append("Recent alerts are unavailable or have not been handed off yet.")
    if not recent_vitals:
        notes.append("Recent vitals are unavailable or have not been handed off yet.")
    return notes


def _missing_medication_inputs(clinical_features: dict[str, Any]) -> list[str]:
    required = ["is_af_confirmed", "cha2ds2_vasc", "crcl", "serum_creatinine", "weight_kg"]
    return [name for name in required if clinical_features.get(name) is None]


def _missing_hypertension_inputs(clinical_features: dict[str, Any]) -> list[str]:
    required = ["has_hypertension", "latest_systolic_bp", "latest_diastolic_bp", "crcl"]
    return [name for name in required if clinical_features.get(name) is None]
