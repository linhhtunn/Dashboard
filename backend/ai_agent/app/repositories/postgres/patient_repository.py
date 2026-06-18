from __future__ import annotations

import logging
import re
import unicodedata
from typing import Any

from app.repositories.ports.errors import RepositoryItemNotFoundError

logger = logging.getLogger(__name__)


def determine_status(hr: float | None, spo2: float | None, sys_bp: float | None, dia_bp: float | None) -> str:
    if spo2 is not None and spo2 < 90:
        return "ABNORMAL"
    if hr is not None and (hr > 120 or hr < 50):
        return "ABNORMAL"
    if sys_bp is not None and (sys_bp > 160 or sys_bp < 80):
        return "ABNORMAL"
    if dia_bp is not None and (dia_bp > 100 or dia_bp < 50):
        return "ABNORMAL"
        
    if spo2 is not None and spo2 < 95:
        return "WARNING"
    if hr is not None and (hr > 100 or hr < 60):
        return "WARNING"
    if sys_bp is not None and (sys_bp > 140 or sys_bp < 90):
        return "WARNING"
    if dia_bp is not None and (dia_bp > 90 or dia_bp < 60):
        return "WARNING"
        
    return "NORMAL"



class PostgresPatientRepository:
    def __init__(self, db_connector: Any) -> None:
        self.db_connector = db_connector

    def get_by_id(self, patient_id: str) -> dict[str, Any]:
        logger.info("fetching_patient_from_postgres patient_id=%s", patient_id)
        
        try:
            with self.db_connector.connection() as conn:
                if _table_exists(conn, "patients"):
                    p_row = _fetch_patients_table_row(conn, patient_id)
                    if p_row:
                        return _patient_profile_from_patients_row(p_row, requested_patient_id=patient_id)

                if _table_exists(conn, "portal_patients"):
                    portal_row = _fetch_portal_patient_row(conn, patient_id)
                    if portal_row:
                        return _patient_profile_from_portal_row(portal_row, requested_patient_id=patient_id)

                raise RepositoryItemNotFoundError(f"Patient with ID {patient_id} not found in Supabase")

                # 4. Query diagnoses (ICD codes)
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT icd_code, icd_version 
                        FROM hosp_diagnoses_icd 
                        WHERE subject_id = %s
                        """,
                        (subject_id,),
                    )
                    diagnoses = cur.fetchall()
                
                is_af_confirmed = False
                has_hypertension = False
                has_diabetes = False
                has_stroke_history = False
                has_heart_failure = False
                has_vascular_disease = False

                history_items = []

                for diag in diagnoses:
                    code = diag["icd_code"]
                    version = diag["icd_version"]
                    
                    # Check Atrial Fibrillation: ICD-9 42731 or ICD-10 I48%
                    if code == "42731" or code.startswith("I48"):
                        if not is_af_confirmed:
                            is_af_confirmed = True
                            history_items.append("Rung nhĩ (AF)")
                    
                    # Check Hypertension: ICD-9 401-405 or ICD-10 I10-I15
                    if any(code.startswith(prefix) for prefix in ["401", "402", "403", "404", "405", "I10", "I11", "I12", "I13", "I15"]):
                        if not has_hypertension:
                            has_hypertension = True
                            history_items.append("Tăng huyết áp")

                    # Check Diabetes: ICD-9 250 or ICD-10 E08-E13
                    if code.startswith("250") or any(code.startswith(prefix) for prefix in ["E08", "E09", "E10", "E11", "E13"]):
                        if not has_diabetes:
                            has_diabetes = True
                            history_items.append("Đái tháo đường")

                    # Check Stroke/TIA: ICD-9 430-438, V1254 or ICD-10 I63, I64, G45, Z8673
                    if (code in ("V1254", "Z8673") or 
                        any(code.startswith(prefix) for prefix in ["430", "431", "432", "433", "434", "435", "436", "437", "438", "I63", "I64", "G45"])):
                        if not has_stroke_history:
                            has_stroke_history = True
                            history_items.append("Tiền sử Đột quỵ/TIA")

                    # Check Heart Failure: ICD-9 428 or ICD-10 I50
                    if code.startswith("428") or code.startswith("I50"):
                        if not has_heart_failure:
                            has_heart_failure = True
                            history_items.append("Suy tim (HF)")

                    # Check Vascular Disease: ICD-9 410, 412, 440, 443 or ICD-10 I21, I22, I25.2, I70, I73
                    if any(code.startswith(prefix) for prefix in ["410", "412", "440", "443", "I21", "I22", "I252", "I70", "I73"]):
                        if not has_vascular_disease:
                            has_vascular_disease = True
                            history_items.append("Bệnh mạch máu ngoại biên/MI")

                # Build medical history string
                if history_items:
                    medical_history = "Tiền sử bệnh lý: " + ", ".join(history_items)
                else:
                    medical_history = "Không có tiền sử bệnh lý đặc biệt."

                return {
                    "patient_id": patient_id,
                    "name": display_name,
                    "age": age,
                    "gender": gender,
                    "medical_history": medical_history,
                    "health_status": "NORMAL",
                    "recent_alerts": [],
                    "recent_vitals": [],
                    # Rich clinical features
                    "weight_kg": weight_kg,
                    "serum_creatinine": serum_creatinine,
                    "is_af_confirmed": is_af_confirmed,
                    "has_hypertension": has_hypertension,
                    "has_diabetes": has_diabetes,
                    "has_stroke_history": has_stroke_history,
                    "has_heart_failure": has_heart_failure,
                    "has_vascular_disease": has_vascular_disease,
                    "has_mechanical_valve": False,  # Default
                }

        except RepositoryItemNotFoundError:
            raise
        except Exception as exc:
            logger.error("postgres_query_error patient_id=%s reason=%s", patient_id, exc, exc_info=True)
            raise RuntimeError(f"Database query failed: {exc}") from exc

    def list_patient_directory(self, limit: int = 100) -> dict[str, Any]:
        try:
            with self.db_connector.connection() as conn:
                if _table_exists(conn, "patients"):
                    patients = _query_patients_table(conn, limit=limit)
                    return {
                        "patients": patients,
                        "data_availability": {
                            "patient_directory": True,
                            "source": "patients",
                            "notes": [],
                        },
                    }

                if _table_exists(conn, "portal_patients"):
                    patients = _query_portal_patients(conn, limit=limit)
                    return {
                        "patients": patients,
                        "data_availability": {
                            "patient_directory": True,
                            "source": "portal_patients",
                            "notes": [],
                        },
                    }

                return {
                    "patients": [],
                    "data_availability": {
                        "patient_directory": False,
                        "source": "supabase",
                        "notes": [
                            "Supabase patients or portal_patients table is unavailable.",
                        ],
                    },
                }
        except Exception as exc:
            logger.error("postgres_directory_list_error reason=%s", exc, exc_info=True)
            return {
                "patients": [],
                "data_availability": {
                    "patient_directory": False,
                    "source": "postgres",
                    "notes": [f"Patient directory could not be queried: {exc}"],
                },
            }

    def search_patients(self, query: str, limit: int = 10) -> dict[str, Any]:
        normalized_query = _normalize(query)
        if not normalized_query:
            return {
                "query": query,
                "patients": [],
                "match_status": "none",
                "data_availability": {
                    "patient_directory": False,
                    "notes": ["Search query is empty."],
                },
            }

        try:
            with self.db_connector.connection() as conn:
                if _table_exists(conn, "patients"):
                    patients = _search_patients_table(conn, query=query, normalized_query=normalized_query, limit=limit)
                    return {
                        "query": query,
                        "patients": patients,
                        "match_status": _match_status(patients),
                        "data_availability": {
                            "patient_directory": True,
                            "source": "patients",
                            "notes": [],
                        },
                    }

                if _table_exists(conn, "portal_patients"):
                    patients = _search_portal_patients(conn, query=query, normalized_query=normalized_query, limit=limit)
                    return {
                        "query": query,
                        "patients": patients,
                        "match_status": _match_status(patients),
                        "data_availability": {
                            "patient_directory": True,
                            "source": "portal_patients",
                            "notes": [],
                        },
                    }

                return {
                    "query": query,
                    "patients": [],
                    "match_status": "none",
                    "data_availability": {
                        "patient_directory": False,
                        "source": "supabase",
                        "notes": [
                            "Supabase patients or portal_patients table is unavailable.",
                        ],
                    },
                }
        except Exception as exc:
            logger.error("postgres_patient_search_error query=%s reason=%s", query, exc, exc_info=True)
            return {
                "query": query,
                "patients": [],
                "match_status": "none",
                "data_availability": {
                    "patient_directory": False,
                    "source": "postgres",
                    "notes": [f"Patient search could not be queried: {exc}"],
                },
            }


def _normalize(value: str) -> str:
    ascii_text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_text.lower().split())


def _table_exists(conn: Any, table_name: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT to_regclass(%s) AS table_ref", (f"public.{table_name}",))
        row = cur.fetchone()
    return bool(row and row.get("table_ref"))


def _column_exists(conn: Any, table_name: str, column_name: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1 AS found
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = %s
              AND column_name = %s
            LIMIT 1
            """,
            (table_name, column_name),
        )
        row = cur.fetchone()
    return bool(row and row.get("found"))


def _query_directory_patients(conn: Any, *, limit: int) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                d.hospital_patient_code,
                d.subject_id::text AS subject_id,
                d.subject_id::text AS patient_id,
                d.display_name,
                p.gender,
                p.anchor_age AS age
            FROM patient_directory d
            LEFT JOIN hosp_patients p
              ON p.subject_id::text = d.subject_id::text
            WHERE d.is_active = TRUE
            ORDER BY d.hospital_patient_code
            LIMIT %s
            """,
            (limit,),
        )
        return [_candidate_from_row(row) for row in cur.fetchall()]


def _query_portal_patients(conn: Any, *, limit: int) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id AS patient_id,
                mrn AS hospital_patient_code,
                id AS subject_id,
                name AS display_name,
                gender,
                age
            FROM portal_patients
            ORDER BY id
            LIMIT %s
            """,
            (limit,),
        )
        return [_candidate_from_row(row) for row in cur.fetchall()]


def _search_portal_patients(
    conn: Any,
    *,
    query: str,
    normalized_query: str,
    limit: int,
) -> list[dict[str, Any]]:
    raw_pattern = f"%{query.strip()}%"
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id AS patient_id,
                mrn AS hospital_patient_code,
                id AS subject_id,
                name AS display_name,
                gender,
                age
            FROM portal_patients
            WHERE id ILIKE %s
               OR mrn ILIKE %s
               OR name ILIKE %s
            ORDER BY id
            LIMIT %s
            """,
            (raw_pattern, raw_pattern, raw_pattern, limit),
        )
        rows = cur.fetchall()

    if rows:
        return [_candidate_from_row(row) for row in rows]

    candidates = _query_portal_patients(conn, limit=max(limit * 20, 200))
    matches = [
        row
        for row in candidates
        if normalized_query in _normalize(str(row.get("display_name") or ""))
        or normalized_query in _normalize(str(row.get("patient_id") or ""))
        or normalized_query in _normalize(str(row.get("hospital_patient_code") or ""))
    ]
    return matches[:limit]


def _search_directory_patients(
    conn: Any,
    *,
    query: str,
    normalized_query: str,
    limit: int,
) -> list[dict[str, Any]]:
    subject_candidate = _numeric_token(query)
    p_code_candidate = _patient_code_token(query)
    raw_pattern = f"%{query.strip()}%"
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                d.hospital_patient_code,
                d.subject_id::text AS subject_id,
                d.subject_id::text AS patient_id,
                d.display_name,
                p.gender,
                p.anchor_age AS age
            FROM patient_directory d
            LEFT JOIN hosp_patients p
              ON p.subject_id::text = d.subject_id::text
            WHERE d.is_active = TRUE
              AND (
                (%s::text IS NOT NULL AND d.hospital_patient_code = %s::text)
                OR (%s::text IS NOT NULL AND d.subject_id::text = %s::text)
                OR d.display_name_normalized LIKE %s
                OR d.hospital_patient_code ILIKE %s
                OR d.subject_id::text ILIKE %s
              )
            ORDER BY
              CASE
                WHEN %s::text IS NOT NULL AND d.hospital_patient_code = %s::text THEN 0
                WHEN %s::text IS NOT NULL AND d.subject_id::text = %s::text THEN 1
                WHEN d.display_name_normalized = %s THEN 2
                ELSE 3
              END,
              d.hospital_patient_code
            LIMIT %s
            """,
            (
                p_code_candidate,
                p_code_candidate,
                subject_candidate,
                subject_candidate,
                f"%{normalized_query}%",
                raw_pattern,
                raw_pattern,
                p_code_candidate,
                p_code_candidate,
                subject_candidate,
                subject_candidate,
                normalized_query,
                limit,
            ),
        )
        return [_candidate_from_row(row) for row in cur.fetchall()]


def _query_hosp_patient_candidates(conn: Any, *, query: str, limit: int) -> list[dict[str, Any]]:
    token = _numeric_token(query)
    if query and token is None:
        return []
    pattern = f"{token or ''}%"
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                subject_id::text AS subject_id,
                subject_id::text AS patient_id,
                gender,
                anchor_age AS age
            FROM hosp_patients
            WHERE subject_id::text LIKE %s
            ORDER BY subject_id
            LIMIT %s
            """,
            (pattern, limit),
        )
        rows = cur.fetchall()
    return [
        _candidate_from_row(
            {
                **row,
                "hospital_patient_code": None,
                "display_name": f"MIMIC Patient {row['subject_id']}",
            }
        )
        for row in rows
    ]


def _candidate_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "hospital_patient_code": row.get("hospital_patient_code"),
        "subject_id": str(row.get("subject_id") or row.get("patient_id")),
        "patient_id": str(row.get("patient_id") or row.get("subject_id")),
        "display_name": row.get("display_name") or f"MIMIC Patient {row.get('subject_id')}",
        "age": row.get("age"),
        "gender": row.get("gender"),
        "health_status": "UNKNOWN",
        "recent_alerts": [],
        "recent_vitals": [],
        "match_reasons": [],
    }


def _fetch_patients_table_row(conn: Any, patient_id: str) -> dict[str, Any] | None:
    has_mimic_subject_id = _column_exists(conn, "patients", "mimic_subject_id")
    lookup_sql = (
        """
        SELECT *
        FROM patients
        WHERE lower(patient_id) = lower(%s)
           OR mimic_subject_id::text = %s
        LIMIT 1
        """
        if has_mimic_subject_id
        else """
        SELECT *
        FROM patients
        WHERE lower(patient_id) = lower(%s)
        LIMIT 1
        """
    )
    params = (patient_id, patient_id) if has_mimic_subject_id else (patient_id,)
    with conn.cursor() as cur:
        cur.execute(lookup_sql, params)
        return cur.fetchone()


def _fetch_portal_patient_row(conn: Any, patient_id: str) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT *
            FROM portal_patients
            WHERE lower(id) = lower(%s)
               OR lower(mrn) = lower(%s)
            LIMIT 1
            """,
            (patient_id, patient_id),
        )
        return cur.fetchone()


def _patient_profile_from_patients_row(
    row: dict[str, Any],
    *,
    requested_patient_id: str,
) -> dict[str, Any]:
    patient_id = str(row.get("patient_id") or requested_patient_id)
    history = _medical_history_from_row(row)
    return {
        "patient_id": patient_id,
        "name": row.get("name") or patient_id,
        "age": row.get("age"),
        "gender": _gender_label(row.get("gender")),
        "medical_history": history,
        "health_status": row.get("health_status") or row.get("status") or "UNKNOWN",
        "recent_alerts": [],
        "recent_vitals": [],
        "weight_kg": _float_or_none(row.get("weight_kg")),
        "serum_creatinine": _float_or_none(row.get("serum_creatinine")),
        "is_af_confirmed": _contains_any(history, ["rung nhi", "atrial fibrillation", " af"]),
        "has_hypertension": _contains_any(history, ["tang huyet ap", "hypertension"]),
        "has_diabetes": _contains_any(history, ["dai thao duong", "diabetes"]),
        "has_stroke_history": _contains_any(history, ["dot quy", "stroke", "tia"]),
        "has_heart_failure": _contains_any(history, ["suy tim", "heart failure"]),
        "has_vascular_disease": _contains_any(history, ["mach mau", "vascular", "myocardial", "mi"]),
        "has_mechanical_valve": _contains_any(history, ["mechanical valve", "van tim co hoc"]),
    }


def _patient_profile_from_portal_row(
    row: dict[str, Any],
    *,
    requested_patient_id: str,
) -> dict[str, Any]:
    patient_id = str(row.get("id") or requested_patient_id)
    history = _medical_history_from_portal_row(row)
    return {
        "patient_id": patient_id,
        "name": row.get("name") or patient_id,
        "age": row.get("age"),
        "gender": _gender_label(row.get("gender")),
        "medical_history": history,
        "health_status": row.get("status") or "UNKNOWN",
        "recent_alerts": [],
        "recent_vitals": [],
        "weight_kg": None,
        "serum_creatinine": None,
        "is_af_confirmed": _contains_any(history, ["rung nhi", "atrial fibrillation", " af"]),
        "has_hypertension": _contains_any(history, ["tang huyet ap", "hypertension"]),
        "has_diabetes": _contains_any(history, ["dai thao duong", "diabetes"]),
        "has_stroke_history": _contains_any(history, ["dot quy", "stroke", "tia"]),
        "has_heart_failure": _contains_any(history, ["suy tim", "heart failure"]),
        "has_vascular_disease": _contains_any(history, ["mach mau", "vascular", "myocardial", "mi"]),
        "has_mechanical_valve": _contains_any(history, ["mechanical valve", "van tim co hoc"]),
    }


def _medical_history_from_row(row: dict[str, Any]) -> str:
    raw = row.get("medical_history")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    risk_factors = row.get("risk_factors")
    if isinstance(risk_factors, list) and risk_factors:
        return ", ".join(str(item) for item in risk_factors if item)
    return "No medical history recorded in Supabase."


def _medical_history_from_portal_row(row: dict[str, Any]) -> str:
    codes = row.get("underlying_condition_codes")
    if isinstance(codes, list) and codes:
        return ", ".join(str(item) for item in codes if item)
    return "No medical history recorded in Supabase."


def _gender_label(value: Any) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip().lower()
    if normalized in {"m", "male", "nam"}:
        return "Nam"
    if normalized in {"f", "female", "nu", "nữ"}:
        return "Nu"
    return str(value)


def _float_or_none(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _contains_any(text: str, needles: list[str]) -> bool:
    normalized = _normalize(text)
    return any(needle in normalized for needle in needles)


def _match_status(matches: list[dict[str, Any]]) -> str:
    if not matches:
        return "none"
    if len(matches) == 1:
        return "single"
    return "multiple"


def _numeric_token(query: str) -> str | None:
    match = re.search(r"\b\d{3,}\b", query)
    return match.group(0) if match else None


def _patient_code_token(query: str) -> str | None:
    match = re.search(r"\bP\d{1,3}\b", query, flags=re.I)
    if not match:
        return None
    prefix = match.group(0).upper()
    letter = prefix[0]
    digits = prefix[1:]
    return f"{letter}{int(digits):03d}"


def _query_patients_table(conn: Any, *, limit: int) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                d.patient_id,
                d.name AS display_name,
                d.gender,
                d.age
            FROM patients d
            ORDER BY d.patient_id
            LIMIT %s
            """,
            (limit,),
        )
        return [_candidate_from_patients_row(row) for row in cur.fetchall()]


def _search_patients_table(
    conn: Any,
    *,
    query: str,
    normalized_query: str,
    limit: int,
) -> list[dict[str, Any]]:
    raw_pattern = f"%{query.strip()}%"
    has_mimic_subject_id = _column_exists(conn, "patients", "mimic_subject_id")
    lookup_sql = (
        """
        SELECT
            d.patient_id,
            d.name AS display_name,
            d.gender,
            d.age
        FROM patients d
        WHERE (
            d.patient_id ILIKE %s
            OR d.name ILIKE %s
            OR d.mimic_subject_id::text ILIKE %s
          )
        ORDER BY d.patient_id
        LIMIT %s
        """
        if has_mimic_subject_id
        else """
        SELECT
            d.patient_id,
            d.name AS display_name,
            d.gender,
            d.age
        FROM patients d
        WHERE (
            d.patient_id ILIKE %s
            OR d.name ILIKE %s
          )
        ORDER BY d.patient_id
        LIMIT %s
        """
    )
    params = (
        (raw_pattern, raw_pattern, raw_pattern, limit)
        if has_mimic_subject_id
        else (raw_pattern, raw_pattern, limit)
    )
    with conn.cursor() as cur:
        cur.execute(lookup_sql, params)
        rows = cur.fetchall()

    if not rows:
        rows = _search_patients_table_by_normalized_name(
            conn,
            normalized_query=normalized_query,
            limit=limit,
        )

    return [_candidate_from_patients_row(row) for row in rows]


def _search_patients_table_by_normalized_name(
    conn: Any,
    *,
    normalized_query: str,
    limit: int,
) -> list[dict[str, Any]]:
    scan_limit = max(limit * 20, 200)
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                d.patient_id,
                d.name AS display_name,
                d.gender,
                d.age
            FROM patients d
            ORDER BY d.patient_id
            LIMIT %s
            """,
            (scan_limit,),
        )
        candidates = cur.fetchall()

    matches = [
        row
        for row in candidates
        if normalized_query in _normalize(str(row.get("display_name") or ""))
    ]
    return matches[:limit]


def _candidate_from_patients_row(row: dict[str, Any]) -> dict[str, Any]:
    gender_raw = row.get("gender")
    gender = "Nam" if gender_raw in ("M", "male") else "Nu" if gender_raw in ("F", "female") else gender_raw
    return {
        "hospital_patient_code": None,
        "subject_id": str(row.get("patient_id")),
        "patient_id": str(row.get("patient_id")),
        "display_name": row.get("display_name"),
        "age": row.get("age"),
        "gender": gender,
        "health_status": "UNKNOWN",
        "recent_alerts": [],
        "recent_vitals": [],
        "match_reasons": [],
    }
