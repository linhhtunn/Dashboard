"""
Seed the 7 MIMIC-clinical tables from simulator P001-P010 output + MIMIC SQLite.

Replaces patient_lab_results with normalized tables:
  hosp_patients        ← MIMIC SQLite (real demographics for each mimic_subject_id)
  patient_directory    ← bridge P001-P010 → mimic_subject_id + display info
  hosp_d_labitems      ← catalog of the 17 lab tests the simulator generates
  hosp_labevents       ← per-patient lab values from lab_results.json
  hosp_d_icd_diagnoses ← ICD code descriptions from MIMIC SQLite
  hosp_diagnoses_icd   ← per-patient diagnoses from MIMIC SQLite
  hosp_omr             ← MIMIC SQLite outpatient records + height/weight baseline

Usage (from backend/):
    python -m database.seeds.load_clinical_to_supabase
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import psycopg2
import psycopg2.extras

from database.clients import SupabaseDbClient

SIMULATOR_DIR = Path(__file__).parents[2] / "simulator" / "output" / "abnormal"
SQLITE_PATH   = Path(__file__).parents[5] / "nimic" / "outputs" / "mimic_iv_demo.sqlite"

# ── Lab item catalog ──────────────────────────────────────────────────────────
# (simulator test_name) → (itemid, label, fluid, category, unit, ref_lo, ref_hi)
# Item IDs match actual MIMIC-IV hosp_d_labitems IDs.
LAB_ITEMS: dict[str, tuple] = {
    "glucose_mg_dl":          (50931, "Glucose",                          "Blood", "Chemistry",  "mg/dL",  70.0,  99.0),
    "creatinine_mg_dl":       (50912, "Creatinine",                       "Blood", "Chemistry",  "mg/dL",   0.6,   1.2),
    "sodium_meq_l":           (50983, "Sodium",                           "Blood", "Chemistry",  "mEq/L", 136.0, 145.0),
    "potassium_meq_l":        (50971, "Potassium",                        "Blood", "Chemistry",  "mEq/L",   3.5,   5.0),
    "chloride_meq_l":         (50902, "Chloride",                         "Blood", "Chemistry",  "mEq/L",  98.0, 107.0),
    "bicarbonate_meq_l":      (50882, "Bicarbonate",                      "Blood", "Chemistry",  "mEq/L",  22.0,  29.0),
    "urea_nitrogen_mg_dl":    (51006, "Urea Nitrogen",                    "Blood", "Chemistry",  "mg/dL",   7.0,  20.0),
    "calcium_mg_dl":          (50893, "Calcium, Total",                   "Blood", "Chemistry",  "mg/dL",   8.5,  10.5),
    "alt_iu_l":               (50861, "Alanine Aminotransferase (ALT)",   "Blood", "Chemistry",  "IU/L",    7.0,  56.0),
    "ast_iu_l":               (50878, "Aspartate Aminotransferase (AST)", "Blood", "Chemistry",  "IU/L",   10.0,  40.0),
    "bilirubin_total_mg_dl":  (50885, "Bilirubin, Total",                 "Blood", "Chemistry",  "mg/dL",   0.1,   1.2),
    # Hematology — ref ranges below are for males; females adjusted at insert time
    "hemoglobin_g_dl":        (51222, "Hemoglobin",                       "Blood", "Hematology", "g/dL",   13.5,  17.5),
    "hematocrit_pct":         (51221, "Hematocrit",                       "Blood", "Hematology", "%",      41.0,  53.0),
    "white_blood_cells_k_ul": (51301, "White Blood Cells",                "Blood", "Hematology", "K/uL",    4.5,  11.0),
    "platelet_count_k_ul":    (51265, "Platelet Count",                   "Blood", "Hematology", "K/uL",  150.0, 400.0),
    "inr":                    (51237, "INR(PT)",                          "Blood", "Hematology", None,      0.8,   1.2),
    "ptt_sec":                (51274, "PTT",                              "Blood", "Hematology", "sec",    25.0,  35.0),
}

# Female ref ranges for gender-sensitive tests
FEMALE_RANGES: dict[int, tuple[float, float]] = {
    51222: (12.0, 15.5),   # Hemoglobin
    51221: (36.0, 46.0),   # Hematocrit
}


def _flag(value: float, lo: float, hi: float) -> str | None:
    if value < lo:
        return "low"
    if value > hi:
        return "high"
    return None


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _patient_dirs() -> list[Path]:
    return sorted(p for p in SIMULATOR_DIR.iterdir() if p.is_dir())


# ── Seed functions ─────────────────────────────────────────────────────────────

def seed_hosp_patients(pg_conn, sqlite_conn: sqlite3.Connection, subject_ids: list[int]) -> int:
    rows = sqlite_conn.execute(
        "SELECT subject_id, gender, anchor_age, anchor_year, anchor_year_group, dod "
        "FROM hosp_patients WHERE subject_id IN (%s)" % ",".join("?" * len(subject_ids)),
        subject_ids,
    ).fetchall()

    with pg_conn.cursor() as cur:
        psycopg2.extras.execute_batch(
            cur,
            """INSERT INTO public.hosp_patients
               (subject_id, gender, anchor_age, anchor_year, anchor_year_group, dod)
               VALUES (%s,%s,%s,%s,%s,%s)
               ON CONFLICT (subject_id) DO NOTHING""",
            rows,
        )
    pg_conn.commit()
    return len(rows)


def seed_patient_directory(pg_conn, patients: list[dict]) -> int:
    rows = [
        (
            p["patient_id"],
            p["mimic_subject_id"],
            p["name"],
            p["name"].lower().strip(),
            True,
        )
        for p in patients
    ]
    with pg_conn.cursor() as cur:
        psycopg2.extras.execute_batch(
            cur,
            """INSERT INTO public.patient_directory
               (hospital_patient_code, subject_id, display_name, display_name_normalized, is_active)
               VALUES (%s,%s,%s,%s,%s)
               ON CONFLICT (hospital_patient_code) DO UPDATE
               SET subject_id=EXCLUDED.subject_id,
                   display_name=EXCLUDED.display_name,
                   display_name_normalized=EXCLUDED.display_name_normalized""",
            rows,
        )
    pg_conn.commit()
    return len(rows)


def seed_hosp_d_labitems(pg_conn) -> int:
    rows = [
        (itemid, label, fluid, category)
        for _, (itemid, label, fluid, category, *_) in LAB_ITEMS.items()
    ]
    with pg_conn.cursor() as cur:
        psycopg2.extras.execute_batch(
            cur,
            """INSERT INTO public.hosp_d_labitems (itemid, label, fluid, category)
               VALUES (%s,%s,%s,%s)
               ON CONFLICT (itemid) DO NOTHING""",
            rows,
        )
    pg_conn.commit()
    return len(rows)


def seed_hosp_labevents(pg_conn, patients: list[dict]) -> int:
    rows = []
    labevent_id = 1

    for p in patients:
        lab_path = SIMULATOR_DIR / p["patient_id"] / "lab_results.json"
        if not lab_path.exists():
            continue
        raw = _read_json(lab_path)
        subject_id = p["mimic_subject_id"]
        gender = p.get("gender", "male")
        charttime = raw["sampled_at"] + "T08:00:00"  # morning lab draw

        for panel in ("chemistry", "hematology", "coagulation"):
            tests = raw.get(panel)
            if not isinstance(tests, dict):
                continue
            for test_name, value in tests.items():
                if test_name not in LAB_ITEMS:
                    continue
                itemid, label, fluid, category, unit, ref_lo, ref_hi = LAB_ITEMS[test_name]

                # Apply gender-specific ref range
                if gender == "female" and itemid in FEMALE_RANGES:
                    ref_lo, ref_hi = FEMALE_RANGES[itemid]

                value_num = float(value) if isinstance(value, (int, float)) else None
                value_str = str(value)
                flag = _flag(value_num, ref_lo, ref_hi) if value_num is not None else None

                rows.append((
                    labevent_id,
                    subject_id,
                    None,           # hadm_id
                    None,           # specimen_id
                    itemid,
                    None,           # order_provider_id
                    charttime,
                    charttime,      # storetime = charttime
                    value_str,
                    value_num,
                    unit,
                    ref_lo,
                    ref_hi,
                    flag,
                    "ROUTINE",
                    None,           # comments
                ))
                labevent_id += 1

    with pg_conn.cursor() as cur:
        psycopg2.extras.execute_batch(
            cur,
            """INSERT INTO public.hosp_labevents
               (labevent_id, subject_id, hadm_id, specimen_id, itemid,
                order_provider_id, charttime, storetime, value, valuenum,
                valueuom, ref_range_lower, ref_range_upper, flag, priority, comments)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
               ON CONFLICT (labevent_id) DO NOTHING""",
            rows,
        )
    pg_conn.commit()
    return len(rows)


def seed_hosp_diagnoses(
    pg_conn, sqlite_conn: sqlite3.Connection, subject_ids: list[int]
) -> tuple[int, int]:
    # Pull diagnoses from MIMIC for our subjects
    diag_rows = sqlite_conn.execute(
        "SELECT subject_id, hadm_id, seq_num, icd_code, icd_version "
        "FROM hosp_diagnoses_icd WHERE subject_id IN (%s)" % ",".join("?" * len(subject_ids)),
        subject_ids,
    ).fetchall()

    # Pull ICD descriptions for those codes
    codes = list({(r[3], r[4]) for r in diag_rows})
    if codes:
        placeholders = " OR ".join("(icd_code=? AND icd_version=?)" for _ in codes)
        flat = [x for pair in codes for x in pair]
        icd_rows = sqlite_conn.execute(
            "SELECT icd_code, icd_version, long_title "
            "FROM hosp_d_icd_diagnoses WHERE " + placeholders,
            flat,
        ).fetchall()
    else:
        icd_rows = []

    with pg_conn.cursor() as cur:
        psycopg2.extras.execute_batch(
            cur,
            """INSERT INTO public.hosp_d_icd_diagnoses (icd_code, icd_version, long_title)
               VALUES (%s,%s,%s)
               ON CONFLICT (icd_code, icd_version) DO NOTHING""",
            icd_rows,
        )
        psycopg2.extras.execute_batch(
            cur,
            """INSERT INTO public.hosp_diagnoses_icd
               (subject_id, hadm_id, seq_num, icd_code, icd_version)
               VALUES (%s,%s,%s,%s,%s)
               ON CONFLICT (subject_id, hadm_id, seq_num) DO NOTHING""",
            diag_rows,
        )
    pg_conn.commit()
    return len(icd_rows), len(diag_rows)


def seed_hosp_omr(
    pg_conn, sqlite_conn: sqlite3.Connection, patients: list[dict]
) -> int:
    subject_ids = [p["mimic_subject_id"] for p in patients]
    omr_rows = sqlite_conn.execute(
        "SELECT subject_id, chartdate, seq_num, result_name, result_value "
        "FROM hosp_omr WHERE subject_id IN (%s)" % ",".join("?" * len(subject_ids)),
        subject_ids,
    ).fetchall()
    rows = list(omr_rows)

    # Add height / weight / BMI from simulator patient_info
    for p in patients:
        sid = p["mimic_subject_id"]
        chartdate = "2026-06-09"
        h_cm  = p.get("height_cm")
        w_kg  = p.get("weight_kg")
        seq   = 900  # high seq_num to avoid collision with MIMIC OMR rows
        if h_cm:
            rows.append((sid, chartdate, seq,     "Height (Inches)", str(round(h_cm / 2.54, 1))))
        if w_kg:
            rows.append((sid, chartdate, seq + 1, "Weight (Lbs)",    str(round(w_kg * 2.2046, 1))))
        if h_cm and w_kg:
            bmi = round(w_kg / (h_cm / 100) ** 2, 1)
            rows.append((sid, chartdate, seq + 2, "BMI (kg/m2)",     str(bmi)))

    with pg_conn.cursor() as cur:
        psycopg2.extras.execute_batch(
            cur,
            """INSERT INTO public.hosp_omr
               (subject_id, chartdate, seq_num, result_name, result_value)
               VALUES (%s,%s,%s,%s,%s)""",
            rows,
        )
    pg_conn.commit()
    return len(rows)


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    if not SQLITE_PATH.exists():
        raise FileNotFoundError(f"MIMIC SQLite not found: {SQLITE_PATH}")

    client = SupabaseDbClient()
    sqlite_conn = sqlite3.connect(SQLITE_PATH)

    # Load all patient info
    patients: list[dict] = []
    for pdir in _patient_dirs():
        info = _read_json(pdir / "patient_info.json")
        patients.append(info)

    subject_ids = [p["mimic_subject_id"] for p in patients]
    print(f"Patients : {[p['patient_id'] for p in patients]}")
    print(f"Subject IDs: {subject_ids}\n")

    with client.connection() as conn:
        n = seed_hosp_patients(conn, sqlite_conn, subject_ids)
        print(f"  hosp_patients       : {n} rows")

        n = seed_patient_directory(conn, patients)
        print(f"  patient_directory   : {n} rows")

        n = seed_hosp_d_labitems(conn)
        print(f"  hosp_d_labitems     : {n} rows")

        n = seed_hosp_labevents(conn, patients)
        print(f"  hosp_labevents      : {n} rows")

        n_icd, n_diag = seed_hosp_diagnoses(conn, sqlite_conn, subject_ids)
        print(f"  hosp_d_icd_diagnoses: {n_icd} rows")
        print(f"  hosp_diagnoses_icd  : {n_diag} rows")

        n = seed_hosp_omr(conn, sqlite_conn, patients)
        print(f"  hosp_omr            : {n} rows")

    sqlite_conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
