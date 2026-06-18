from typing import Any
import sqlite3
import logging
from app.repositories.ports.errors import RepositoryItemNotFoundError

logger = logging.getLogger(__name__)

class SQLitePatientRepository:
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path

    def get_by_id(self, patient_id: str) -> dict[str, Any]:
        logger.info("fetching_patient_from_sqlite patient_id=%s", patient_id)
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()

            # 1. Query demographics
            cur.execute(
                """
                SELECT gender, anchor_age, anchor_year 
                FROM hosp_patients 
                WHERE subject_id = ?
                """,
                (patient_id,),
            )
            row = cur.fetchone()
            if not row:
                raise RepositoryItemNotFoundError(f"Patient with ID {patient_id} not found in SQLite database")
            
            gender_raw = row["gender"]
            age = int(row["anchor_age"])
            
            # Map gender for rules/consistency
            gender = "Nam" if gender_raw == "M" else "Nu" if gender_raw == "F" else gender_raw

            # 2. Query Creatinine (itemid = 50912)
            cur.execute(
                """
                SELECT valuenum 
                FROM hosp_labevents 
                WHERE subject_id = ? AND itemid = '50912' 
                ORDER BY charttime DESC 
                LIMIT 1
                """,
                (patient_id,),
            )
            creatinine_row = cur.fetchone()
            serum_creatinine = float(creatinine_row["valuenum"]) if (creatinine_row and creatinine_row["valuenum"] is not None) else None

            # 3. Query Weight
            # Try ICU admission weight in kg first
            cur.execute(
                """
                SELECT valuenum 
                FROM icu_chartevents 
                WHERE subject_id = ? AND itemid IN ('226512', '224639') 
                ORDER BY charttime DESC 
                LIMIT 1
                """,
                (patient_id,),
            )
            icu_weight_row = cur.fetchone()
            
            if icu_weight_row and icu_weight_row["valuenum"] is not None:
                weight_kg = float(icu_weight_row["valuenum"])
            else:
                # Try OMR outpatient weight in Lbs
                cur.execute(
                    """
                    SELECT result_value 
                    FROM hosp_omr 
                    WHERE subject_id = ? AND result_name = 'Weight (Lbs)' 
                    ORDER BY chartdate DESC 
                    LIMIT 1
                    """,
                    (patient_id,),
                )
                omr_weight_row = cur.fetchone()
                if omr_weight_row and omr_weight_row["result_value"] is not None:
                    try:
                        weight_kg = float(omr_weight_row["result_value"]) * 0.45359237
                    except ValueError:
                        weight_kg = 70.0
                else:
                    weight_kg = 70.0  # Fallback standard weight

            # 4. Query diagnoses (ICD codes)
            cur.execute(
                """
                SELECT icd_code, icd_version 
                FROM hosp_diagnoses_icd 
                WHERE subject_id = ?
                """,
                (patient_id,),
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

            conn.close()

            return {
                "patient_id": patient_id,
                "name": f"MIMIC Patient {patient_id}",
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
                "has_mechanical_valve": False,  # Default, can be overridden/extended
            }

        except RepositoryItemNotFoundError:
            raise
        except Exception as exc:
            logger.error("sqlite_query_error patient_id=%s reason=%s", patient_id, exc, exc_info=True)
            raise RuntimeError(f"SQLite query failed: {exc}") from exc
