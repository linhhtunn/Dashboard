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
                subject_id = patient_id
                display_name = f"MIMIC Patient {patient_id}"

                if _table_exists(conn, "patients"):
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            SELECT patient_id, mimic_subject_id, name
                            FROM patients
                            WHERE lower(patient_id) = lower(%s)
                               OR mimic_subject_id::text = %s
                            LIMIT 1
                            """,
                            (patient_id, patient_id),
                        )
                        p_row = cur.fetchone()
                    if p_row:
                        if p_row.get("mimic_subject_id") is not None:
                            subject_id = str(p_row["mimic_subject_id"])
                        if p_row.get("name") is not None:
                            display_name = p_row["name"]

                # 1. Query demographics
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT gender, anchor_age, anchor_year 
                        FROM hosp_patients 
                        WHERE subject_id = %s
                        """,
                        (subject_id,),
                    )
                    row = cur.fetchone()
                
                if not row:
                    raise RepositoryItemNotFoundError(f"Patient with ID {patient_id} not found in database")
                
                gender_raw = row["gender"]
                age = int(row["anchor_age"])
                
                # Map gender for rules/consistency
                gender = "Nam" if gender_raw == "M" else "Nu" if gender_raw == "F" else gender_raw

                # 2. Query Creatinine (itemid = 50912)
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT valuenum 
                        FROM hosp_labevents 
                        WHERE subject_id = %s AND itemid = '50912' 
                        ORDER BY charttime DESC 
                        LIMIT 1
                        """,
                        (subject_id,),
                    )
                    creatinine_row = cur.fetchone()
                serum_creatinine = float(creatinine_row["valuenum"]) if (creatinine_row and creatinine_row["valuenum"] is not None) else None

                # 3. Query Weight
                weight_kg = 70.0  # Fallback standard weight
                
                # Check table existence before querying to prevent aborting database transactions
                has_icu_chartevents = False
                has_hosp_omr = False
                
                try:
                    with conn.cursor() as cur:
                        cur.execute("SELECT to_regclass('public.icu_chartevents') as val")
                        row_chk = cur.fetchone()
                        has_icu_chartevents = row_chk and row_chk["val"] is not None
                        
                        cur.execute("SELECT to_regclass('public.hosp_omr') as val")
                        row_chk = cur.fetchone()
                        has_hosp_omr = row_chk and row_chk["val"] is not None
                except Exception:
                    # If the metadata check fails, assume tables do not exist to be safe
                    pass

                # Try ICU admission weight in kg first if table exists
                if has_icu_chartevents:
                    try:
                        with conn.cursor() as cur:
                            cur.execute(
                                """
                                SELECT valuenum 
                                FROM icu_chartevents 
                                WHERE subject_id = %s AND itemid IN ('226512', '224639') 
                                ORDER BY charttime DESC 
                                LIMIT 1
                                """,
                                (subject_id,),
                            )
                            icu_weight_row = cur.fetchone()
                        if icu_weight_row and icu_weight_row["valuenum"] is not None:
                            weight_kg = float(icu_weight_row["valuenum"])
                        else:
                            raise ValueError("No ICU weight found")
                    except Exception:
                        conn.rollback()
                        
                # Try OMR outpatient weight in Lbs if needed and table exists
                if weight_kg == 70.0 and has_hosp_omr:
                    try:
                        with conn.cursor() as cur:
                            cur.execute(
                                """
                                SELECT result_value 
                                FROM hosp_omr 
                                WHERE subject_id = %s AND result_name = 'Weight (Lbs)' 
                                ORDER BY chartdate DESC 
                                LIMIT 1
                                """,
                                (subject_id,),
                            )
                            omr_weight_row = cur.fetchone()
                        if omr_weight_row and omr_weight_row["result_value"] is not None:
                            try:
                                weight_kg = float(omr_weight_row["result_value"]) * 0.45359237
                            except ValueError:
                                weight_kg = 70.0
                    except Exception:
                        conn.rollback()
                        weight_kg = 70.0


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

                if _table_exists(conn, "patient_directory"):
                    patients = _query_directory_patients(conn, limit=limit)
                    return {
                        "patients": patients,
                        "data_availability": {
                            "patient_directory": True,
                            "source": "patient_directory",
                            "notes": [],
                        },
                    }

                patients = _query_hosp_patient_candidates(conn, query="", limit=limit)
                return {
                    "patients": patients,
                    "data_availability": {
                        "patient_directory": False,
                        "source": "hosp_patients",
                        "notes": [
                            "patient_directory table is unavailable; using hosp_patients subject IDs only.",
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

                if _table_exists(conn, "patient_directory"):
                    patients = _search_directory_patients(conn, query=query, normalized_query=normalized_query, limit=limit)
                    return {
                        "query": query,
                        "patients": patients,
                        "match_status": _match_status(patients),
                        "data_availability": {
                            "patient_directory": True,
                            "source": "patient_directory",
                            "notes": [],
                        },
                    }

                patients = _query_hosp_patient_candidates(conn, query=query, limit=limit)
                return {
                    "query": query,
                    "patients": patients,
                    "match_status": _match_status(patients),
                    "data_availability": {
                        "patient_directory": False,
                        "source": "hosp_patients",
                        "notes": [
                            "patient_directory table is unavailable; name and hospital-code lookup are disabled.",
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
                p.gender,
                p.anchor_age AS age
            FROM patients d
            LEFT JOIN hosp_patients p
              ON p.subject_id = d.mimic_subject_id
            WHERE d.status = 'active'
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
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                d.patient_id,
                d.name AS display_name,
                p.gender,
                p.anchor_age AS age
            FROM patients d
            LEFT JOIN hosp_patients p
              ON p.subject_id = d.mimic_subject_id
            WHERE d.status = 'active'
              AND (
                d.patient_id ILIKE %s
                OR d.name ILIKE %s
                OR d.mimic_subject_id::text ILIKE %s
              )
            ORDER BY d.patient_id
            LIMIT %s
            """,
            (raw_pattern, raw_pattern, raw_pattern, limit),
        )
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
                p.gender,
                p.anchor_age AS age
            FROM patients d
            LEFT JOIN hosp_patients p
              ON p.subject_id = d.mimic_subject_id
            WHERE d.status = 'active'
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
