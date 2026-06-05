from __future__ import annotations

from copy import deepcopy
from statistics import mean
from typing import Any


PATIENT_DIRECTORY: list[dict[str, Any]] = [
    {
        "id": "P001",
        "mrn": "MRN-2026-001",
        "name": "Nguyen Van An",
        "age": 68,
        "gender": "male",
        "status": "at_risk",
        "ward_code": "cardiology_ward",
        "ward_label": {"vi": "Khoa Tim mach", "en": "Cardiology ward"},
        "department_code": "cardiology",
        "department_label": {"vi": "Tim mach", "en": "Cardiology"},
        "bed": "A-102",
        "underlying_condition_codes": ["hypertension", "type_2_diabetes"],
        "medication_cycle": [
            {
                "medication": {"vi": "Amlodipine", "en": "Amlodipine"},
                "dosage": "5 mg",
                "schedule": {"vi": "08:00 hang ngay", "en": "08:00 daily"},
                "last_taken_at": None,
                "next_dose_at": "2026-06-03T08:00:00Z",
            }
        ],
        "recent_symptom_codes": ["shortness_of_breath"],
        "last_updated": "2026-06-02T08:12:00Z",
        "medical_history": "Tang huyet ap va dai thao duong type 2. Can theo doi SpO2 va nhip tim khi van dong.",
    },
    {
        "id": "P002",
        "mrn": "MRN-2026-002",
        "name": "Tran Thi Binh",
        "age": 57,
        "gender": "female",
        "status": "healthy",
        "ward_code": "general_ward",
        "ward_label": {"vi": "Khoa Noi tong quat", "en": "General ward"},
        "department_code": "internal_medicine",
        "department_label": {"vi": "Noi tong quat", "en": "Internal medicine"},
        "bed": "B-204",
        "underlying_condition_codes": ["asthma"],
        "medication_cycle": [],
        "recent_symptom_codes": [],
        "last_updated": "2026-06-02T08:10:00Z",
        "medical_history": "Hen phe quan on dinh, khong ghi nhan trieu chung moi.",
    },
    {
        "id": "P003",
        "mrn": "MRN-2026-003",
        "name": "Le Van Cuong",
        "age": 74,
        "gender": "male",
        "status": "critical",
        "ward_code": "icu",
        "ward_label": {"vi": "Hoi suc tich cuc", "en": "ICU"},
        "department_code": "emergency",
        "department_label": {"vi": "Cap cuu", "en": "Emergency"},
        "bed": "ICU-03",
        "underlying_condition_codes": ["coronary_artery_disease"],
        "medication_cycle": [
            {
                "medication": {"vi": "Nitroglycerin", "en": "Nitroglycerin"},
                "dosage": "0.4 mg",
                "schedule": {"vi": "Theo y lenh", "en": "As prescribed"},
                "last_taken_at": None,
                "next_dose_at": None,
            }
        ],
        "recent_symptom_codes": ["chest_discomfort"],
        "last_updated": "2026-06-02T08:09:00Z",
        "medical_history": "Benh mach vanh, co nguy co cao voi huyet ap va SpO2 giam.",
    },
    {
        "id": "P004",
        "mrn": "12345678",
        "name": "Minh Tran",
        "age": 62,
        "gender": "male",
        "status": "recent_symptom",
        "ward_code": "respiratory_ward",
        "ward_label": {"vi": "Khoa Ho hap", "en": "Respiratory ward"},
        "department_code": "pulmonology",
        "department_label": {"vi": "Ho hap", "en": "Pulmonology"},
        "bed": "R-118",
        "underlying_condition_codes": ["chronic_bronchitis"],
        "medication_cycle": [],
        "recent_symptom_codes": ["new_cough", "fatigue"],
        "last_updated": "2026-06-02T08:11:00Z",
        "medical_history": "Viem phe quan man, vua co dot trieu chung ho moi va met.",
    },
    {
        "id": "P005",
        "mrn": "MRN-2026-005",
        "name": "Pham Ngoc Lan",
        "age": 45,
        "gender": "female",
        "status": "healthy",
        "ward_code": "general_ward",
        "ward_label": {"vi": "Khoa Noi tong quat", "en": "General ward"},
        "department_code": "endocrinology",
        "department_label": {"vi": "Noi tiet", "en": "Endocrinology"},
        "bed": "C-105",
        "underlying_condition_codes": ["type_2_diabetes"],
        "medication_cycle": [],
        "recent_symptom_codes": [],
        "last_updated": "2026-06-02T08:05:00Z",
        "medical_history": "Dai thao duong type 2, chi so hien on dinh.",
    },
    {
        "id": "P006",
        "mrn": "MRN-2026-006",
        "name": "Do Gia Hung",
        "age": 51,
        "gender": "male",
        "status": "at_risk",
        "ward_code": "cardiology_ward",
        "ward_label": {"vi": "Khoa Tim mach", "en": "Cardiology ward"},
        "department_code": "cardiology",
        "department_label": {"vi": "Tim mach", "en": "Cardiology"},
        "bed": "A-108",
        "underlying_condition_codes": ["hypertension"],
        "medication_cycle": [],
        "recent_symptom_codes": ["fatigue"],
        "last_updated": "2026-06-02T08:03:00Z",
        "medical_history": "Tang huyet ap, dang co xu huong tang huyet ap trong cua so gan nhat.",
    },
    {
        "id": "P007",
        "mrn": "MRN-2026-007",
        "name": "Bui Thanh Mai",
        "age": 63,
        "gender": "female",
        "status": "critical",
        "ward_code": "stroke_unit",
        "ward_label": {"vi": "Don vi than kinh", "en": "Stroke unit"},
        "department_code": "neurology",
        "department_label": {"vi": "Than kinh", "en": "Neurology"},
        "bed": "N-12",
        "underlying_condition_codes": ["hypertension"],
        "medication_cycle": [],
        "recent_symptom_codes": ["dizziness"],
        "last_updated": "2026-06-02T08:02:00Z",
        "medical_history": "Tang huyet ap, co trieu chung than kinh can canh bao.",
    },
    {
        "id": "P008",
        "mrn": "MRN-2026-008",
        "name": "Hoang Duc Bao",
        "age": 59,
        "gender": "male",
        "status": "at_risk",
        "ward_code": "respiratory_ward",
        "ward_label": {"vi": "Khoa Ho hap", "en": "Respiratory ward"},
        "department_code": "pulmonology",
        "department_label": {"vi": "Ho hap", "en": "Pulmonology"},
        "bed": "R-203",
        "underlying_condition_codes": ["copd"],
        "medication_cycle": [],
        "recent_symptom_codes": ["shortness_of_breath"],
        "last_updated": "2026-06-02T08:01:00Z",
        "medical_history": "COPD, theo doi sat SpO2 va nhịp tim dao dong.",
    },
    {
        "id": "P009",
        "mrn": "MRN-2026-009",
        "name": "Ngo Thi Hoa",
        "age": 36,
        "gender": "female",
        "status": "recent_symptom",
        "ward_code": "observation",
        "ward_label": {"vi": "Khu theo doi ngan", "en": "Observation"},
        "department_code": "general_medicine",
        "department_label": {"vi": "Da khoa", "en": "General medicine"},
        "bed": "O-05",
        "underlying_condition_codes": [],
        "medication_cycle": [],
        "recent_symptom_codes": ["palpitations"],
        "last_updated": "2026-06-02T08:00:00Z",
        "medical_history": "Moi ghi nhan hoi hop trong cua so theo doi ngan.",
    },
    {
        "id": "P010",
        "mrn": "MRN-2026-010",
        "name": "Ly Quoc Khang",
        "age": 70,
        "gender": "male",
        "status": "healthy",
        "ward_code": "general_ward",
        "ward_label": {"vi": "Khoa Noi tong quat", "en": "General ward"},
        "department_code": "geriatrics",
        "department_label": {"vi": "Lao khoa", "en": "Geriatrics"},
        "bed": "G-14",
        "underlying_condition_codes": ["hypertension"],
        "medication_cycle": [],
        "recent_symptom_codes": [],
        "last_updated": "2026-06-02T07:58:00Z",
        "medical_history": "Nguoi benh cao tuoi, tang huyet ap da kiem soat.",
    },
    {
        "id": "P011",
        "mrn": "MRN-2026-011",
        "name": "Vo Yen Nhi",
        "age": 29,
        "gender": "female",
        "status": "healthy",
        "ward_code": "general_ward",
        "ward_label": {"vi": "Khoa Noi tong quat", "en": "General ward"},
        "department_code": "general_medicine",
        "department_label": {"vi": "Da khoa", "en": "General medicine"},
        "bed": "B-112",
        "underlying_condition_codes": [],
        "medication_cycle": [],
        "recent_symptom_codes": [],
        "last_updated": "2026-06-02T07:55:00Z",
        "medical_history": "Suc khoe tot, chi so van dong vien.",
    },
    {
        "id": "P012",
        "mrn": "MRN-2026-012",
        "name": "Duong Huu Phuc",
        "age": 66,
        "gender": "male",
        "status": "recent_symptom",
        "ward_code": "cardiology_ward",
        "ward_label": {"vi": "Khoa Tim mach", "en": "Cardiology ward"},
        "department_code": "cardiology",
        "department_label": {"vi": "Tim mach", "en": "Cardiology"},
        "bed": "A-212",
        "underlying_condition_codes": ["ischemic_heart_disease"],
        "medication_cycle": [],
        "recent_symptom_codes": ["chest_discomfort"],
        "last_updated": "2026-06-02T07:53:00Z",
        "medical_history": "Benh tim thieu mau cuc bo, dang co stress surge va kho chiu nguc.",
    },
    {
        "id": "P013",
        "mrn": "MRN-2026-013",
        "name": "Phan Tuan Kiet",
        "age": 48,
        "gender": "male",
        "status": "at_risk",
        "ward_code": "endocrine_ward",
        "ward_label": {"vi": "Khoa Noi tiet", "en": "Endocrine ward"},
        "department_code": "endocrinology",
        "department_label": {"vi": "Noi tiet", "en": "Endocrinology"},
        "bed": "E-07",
        "underlying_condition_codes": ["type_2_diabetes"],
        "medication_cycle": [],
        "recent_symptom_codes": ["fatigue"],
        "last_updated": "2026-06-02T07:50:00Z",
        "medical_history": "Dai thao duong type 2, HRV va huyet ap tang dan can theo doi.",
    },
    {
        "id": "P014",
        "mrn": "MRN-2026-014",
        "name": "Mai Thanh Tam",
        "age": 54,
        "gender": "female",
        "status": "critical",
        "ward_code": "icu",
        "ward_label": {"vi": "Hoi suc tich cuc", "en": "ICU"},
        "department_code": "critical_care",
        "department_label": {"vi": "Hoi suc", "en": "Critical care"},
        "bed": "ICU-08",
        "underlying_condition_codes": ["chronic_kidney_disease"],
        "medication_cycle": [],
        "recent_symptom_codes": ["confusion"],
        "last_updated": "2026-06-02T07:48:00Z",
        "medical_history": "Benh than man, dang co suy giam dong thoi SpO2, HR va huyet ap xau di.",
    },
]


ALERT_DIRECTORY: list[dict[str, Any]] = [
    {
        "id": "alert-001",
        "patient_id": "P001",
        "type": "low_oxygen",
        "severity": "warning",
        "score": 7.2,
        "timestamp": "2026-06-02T08:09:00Z",
        "acknowledged": False,
        "message": "SpO2 giam nhe so voi baseline gan nhat.",
        "evidence": [
            {
                "kind": "metric_threshold",
                "metric": "spo2",
                "value": 94,
                "unit": "%",
                "timestamp": "2026-06-02T08:09:00Z",
                "note_key": "spo2_below_recent_baseline",
            }
        ],
    },
    {
        "id": "alert-002",
        "patient_id": "P003",
        "type": "high_blood_pressure",
        "severity": "critical",
        "score": 8.4,
        "timestamp": "2026-06-02T08:09:00Z",
        "acknowledged": False,
        "message": "Huyet ap tam thu vuot nguong nguy hiem.",
        "evidence": [
            {
                "kind": "metric_threshold",
                "metric": "systolic_bp",
                "value": 156,
                "unit": "mmHg",
                "timestamp": "2026-06-02T08:09:00Z",
                "note_key": "systolic_bp_above_threshold",
            }
        ],
    },
    {
        "id": "alert-003",
        "patient_id": "P006",
        "type": "high_blood_pressure",
        "severity": "warning",
        "score": 6.8,
        "timestamp": "2026-06-02T08:12:00Z",
        "acknowledged": False,
        "message": "Huyet ap tang dan trong 15 phut gan nhat.",
        "evidence": [
            {
                "kind": "trend_change",
                "metric": "systolic_bp",
                "value": 140,
                "unit": "mmHg",
                "comparison_value": 136,
                "comparison_window": "15m",
                "timestamp": "2026-06-02T08:12:00Z",
                "note_key": "bp_creeping_upward",
            }
        ],
    },
    {
        "id": "alert-004",
        "patient_id": "P007",
        "type": "stroke_risk",
        "severity": "critical",
        "score": 9.1,
        "timestamp": "2026-06-02T08:10:00Z",
        "acknowledged": False,
        "message": "Nguy co than kinh cap can duoc danh gia ngay.",
        "evidence": [
            {
                "kind": "symptom_report",
                "symptom_code": "dizziness",
                "timestamp": "2026-06-02T08:10:00Z",
                "note_key": "neurologic_symptom_reported",
            }
        ],
    },
    {
        "id": "alert-005",
        "patient_id": "P008",
        "type": "low_oxygen",
        "severity": "warning",
        "score": 7.5,
        "timestamp": "2026-06-02T08:09:00Z",
        "acknowledged": False,
        "message": "SpO2 nho hon nguong resting threshold.",
        "evidence": [
            {
                "kind": "metric_threshold",
                "metric": "spo2",
                "value": 93,
                "unit": "%",
                "timestamp": "2026-06-02T08:09:00Z",
                "note_key": "spo2_below_resting_threshold",
            }
        ],
    },
    {
        "id": "alert-006",
        "patient_id": "P012",
        "type": "high_heart_rate",
        "severity": "info",
        "score": 5.4,
        "timestamp": "2026-06-02T08:09:00Z",
        "acknowledged": False,
        "message": "Nhip tim tang ro sau stress surge.",
        "evidence": [
            {
                "kind": "trend_change",
                "metric": "heart_rate",
                "value": 99,
                "unit": "bpm",
                "comparison_value": 86,
                "comparison_window": "15m",
                "timestamp": "2026-06-02T08:09:00Z",
                "note_key": "heart_rate_upward_shift",
            }
        ],
    },
    {
        "id": "alert-007",
        "patient_id": "P013",
        "type": "deterioration_risk",
        "severity": "warning",
        "score": 6.9,
        "timestamp": "2026-06-02T08:12:00Z",
        "acknowledged": False,
        "message": "HRV giam dan va can danh gia nguy co dien tien xau.",
        "evidence": [
            {
                "kind": "trend_change",
                "metric": "hrv_rmssd",
                "value": 23,
                "unit": "ms",
                "comparison_value": 26,
                "comparison_window": "15m",
                "timestamp": "2026-06-02T08:12:00Z",
                "note_key": "hrv_downward_shift",
            }
        ],
    },
    {
        "id": "alert-008",
        "patient_id": "P014",
        "type": "high_blood_pressure",
        "severity": "critical",
        "score": 8.9,
        "timestamp": "2026-06-02T08:09:00Z",
        "acknowledged": False,
        "message": "Dong thoi co tang huyet ap va giam SpO2.",
        "evidence": [
            {
                "kind": "metric_threshold",
                "metric": "systolic_bp",
                "value": 158,
                "unit": "mmHg",
                "timestamp": "2026-06-02T08:09:00Z",
                "note_key": "systolic_bp_above_threshold",
            },
            {
                "kind": "metric_threshold",
                "metric": "spo2",
                "value": 91,
                "unit": "%",
                "timestamp": "2026-06-02T08:09:00Z",
                "note_key": "spo2_below_threshold",
            },
        ],
    },
]


VITAL_SAMPLES: list[dict[str, Any]] = [
    {"patient_id": "P001", "timestamp": "2026-06-02T08:00:00Z", "heart_rate": 74, "hrv_rmssd": 38, "systolic_bp": 118, "diastolic_bp": 76, "spo2": 98},
    {"patient_id": "P001", "timestamp": "2026-06-02T08:03:00Z", "heart_rate": 89, "hrv_rmssd": 31, "systolic_bp": 124, "diastolic_bp": 80, "spo2": 97},
    {"patient_id": "P001", "timestamp": "2026-06-02T08:06:00Z", "heart_rate": 116, "hrv_rmssd": 22, "systolic_bp": 132, "diastolic_bp": 86, "spo2": 95},
    {"patient_id": "P001", "timestamp": "2026-06-02T08:09:00Z", "heart_rate": 128, "hrv_rmssd": 17, "systolic_bp": 138, "diastolic_bp": 90, "spo2": 93},
    {"patient_id": "P001", "timestamp": "2026-06-02T08:12:00Z", "heart_rate": 108, "hrv_rmssd": 24, "systolic_bp": 130, "diastolic_bp": 84, "spo2": 95},
    {"patient_id": "P002", "timestamp": "2026-06-02T08:00:00Z", "heart_rate": 68, "hrv_rmssd": 52, "systolic_bp": 112, "diastolic_bp": 70, "spo2": 99},
    {"patient_id": "P002", "timestamp": "2026-06-02T08:03:00Z", "heart_rate": 70, "hrv_rmssd": 54, "systolic_bp": 114, "diastolic_bp": 72, "spo2": 99},
    {"patient_id": "P002", "timestamp": "2026-06-02T08:06:00Z", "heart_rate": 69, "hrv_rmssd": 53, "systolic_bp": 113, "diastolic_bp": 71, "spo2": 99},
    {"patient_id": "P002", "timestamp": "2026-06-02T08:09:00Z", "heart_rate": 71, "hrv_rmssd": 55, "systolic_bp": 114, "diastolic_bp": 72, "spo2": 99},
    {"patient_id": "P002", "timestamp": "2026-06-02T08:12:00Z", "heart_rate": 68, "hrv_rmssd": 53, "systolic_bp": 112, "diastolic_bp": 70, "spo2": 99},
    {"patient_id": "P003", "timestamp": "2026-06-02T08:00:00Z", "heart_rate": 116, "hrv_rmssd": 14, "systolic_bp": 158, "diastolic_bp": 96, "spo2": 91},
    {"patient_id": "P003", "timestamp": "2026-06-02T08:03:00Z", "heart_rate": 122, "hrv_rmssd": 12, "systolic_bp": 166, "diastolic_bp": 100, "spo2": 90},
    {"patient_id": "P003", "timestamp": "2026-06-02T08:06:00Z", "heart_rate": 130, "hrv_rmssd": 9, "systolic_bp": 174, "diastolic_bp": 104, "spo2": 88},
    {"patient_id": "P003", "timestamp": "2026-06-02T08:09:00Z", "heart_rate": 138, "hrv_rmssd": 7, "systolic_bp": 182, "diastolic_bp": 108, "spo2": 86},
    {"patient_id": "P003", "timestamp": "2026-06-02T08:12:00Z", "heart_rate": 142, "hrv_rmssd": 6, "systolic_bp": 186, "diastolic_bp": 110, "spo2": 85},
    {"patient_id": "P004", "timestamp": "2026-06-02T08:00:00Z", "heart_rate": 112, "hrv_rmssd": 16, "systolic_bp": 152, "diastolic_bp": 96, "spo2": 92},
    {"patient_id": "P004", "timestamp": "2026-06-02T08:03:00Z", "heart_rate": 102, "hrv_rmssd": 21, "systolic_bp": 146, "diastolic_bp": 92, "spo2": 94},
    {"patient_id": "P004", "timestamp": "2026-06-02T08:06:00Z", "heart_rate": 90, "hrv_rmssd": 28, "systolic_bp": 138, "diastolic_bp": 86, "spo2": 96},
    {"patient_id": "P004", "timestamp": "2026-06-02T08:09:00Z", "heart_rate": 80, "hrv_rmssd": 36, "systolic_bp": 128, "diastolic_bp": 80, "spo2": 97},
    {"patient_id": "P004", "timestamp": "2026-06-02T08:12:00Z", "heart_rate": 74, "hrv_rmssd": 42, "systolic_bp": 122, "diastolic_bp": 76, "spo2": 98},
    {"patient_id": "P005", "timestamp": "2026-06-02T08:00:00Z", "heart_rate": 66, "hrv_rmssd": 50, "systolic_bp": 116, "diastolic_bp": 74, "spo2": 99},
    {"patient_id": "P005", "timestamp": "2026-06-02T08:03:00Z", "heart_rate": 84, "hrv_rmssd": 38, "systolic_bp": 122, "diastolic_bp": 78, "spo2": 98},
    {"patient_id": "P005", "timestamp": "2026-06-02T08:06:00Z", "heart_rate": 90, "hrv_rmssd": 34, "systolic_bp": 126, "diastolic_bp": 80, "spo2": 97},
    {"patient_id": "P005", "timestamp": "2026-06-02T08:09:00Z", "heart_rate": 76, "hrv_rmssd": 44, "systolic_bp": 118, "diastolic_bp": 75, "spo2": 98},
    {"patient_id": "P005", "timestamp": "2026-06-02T08:12:00Z", "heart_rate": 67, "hrv_rmssd": 51, "systolic_bp": 115, "diastolic_bp": 73, "spo2": 99},
    {"patient_id": "P006", "timestamp": "2026-06-02T08:00:00Z", "heart_rate": 86, "hrv_rmssd": 30, "systolic_bp": 136, "diastolic_bp": 86, "spo2": 97},
    {"patient_id": "P006", "timestamp": "2026-06-02T08:03:00Z", "heart_rate": 90, "hrv_rmssd": 27, "systolic_bp": 144, "diastolic_bp": 90, "spo2": 96},
    {"patient_id": "P006", "timestamp": "2026-06-02T08:06:00Z", "heart_rate": 94, "hrv_rmssd": 24, "systolic_bp": 152, "diastolic_bp": 96, "spo2": 96},
    {"patient_id": "P006", "timestamp": "2026-06-02T08:09:00Z", "heart_rate": 98, "hrv_rmssd": 21, "systolic_bp": 160, "diastolic_bp": 100, "spo2": 95},
    {"patient_id": "P006", "timestamp": "2026-06-02T08:12:00Z", "heart_rate": 96, "hrv_rmssd": 22, "systolic_bp": 158, "diastolic_bp": 98, "spo2": 95},
    {"patient_id": "P007", "timestamp": "2026-06-02T08:00:00Z", "heart_rate": 102, "hrv_rmssd": 20, "systolic_bp": 142, "diastolic_bp": 88, "spo2": 94},
    {"patient_id": "P007", "timestamp": "2026-06-02T08:03:00Z", "heart_rate": 112, "hrv_rmssd": 16, "systolic_bp": 150, "diastolic_bp": 94, "spo2": 92},
    {"patient_id": "P007", "timestamp": "2026-06-02T08:06:00Z", "heart_rate": 124, "hrv_rmssd": 12, "systolic_bp": 158, "diastolic_bp": 100, "spo2": 89},
    {"patient_id": "P007", "timestamp": "2026-06-02T08:09:00Z", "heart_rate": 136, "hrv_rmssd": 9, "systolic_bp": 166, "diastolic_bp": 106, "spo2": 86},
    {"patient_id": "P007", "timestamp": "2026-06-02T08:12:00Z", "heart_rate": 144, "hrv_rmssd": 7, "systolic_bp": 172, "diastolic_bp": 110, "spo2": 83},
    {"patient_id": "P008", "timestamp": "2026-06-02T08:00:00Z", "heart_rate": 88, "hrv_rmssd": 18, "systolic_bp": 128, "diastolic_bp": 82, "spo2": 95},
    {"patient_id": "P008", "timestamp": "2026-06-02T08:03:00Z", "heart_rate": 106, "hrv_rmssd": 14, "systolic_bp": 132, "diastolic_bp": 84, "spo2": 94},
    {"patient_id": "P008", "timestamp": "2026-06-02T08:06:00Z", "heart_rate": 78, "hrv_rmssd": 20, "systolic_bp": 126, "diastolic_bp": 80, "spo2": 95},
    {"patient_id": "P008", "timestamp": "2026-06-02T08:09:00Z", "heart_rate": 118, "hrv_rmssd": 12, "systolic_bp": 134, "diastolic_bp": 86, "spo2": 93},
    {"patient_id": "P008", "timestamp": "2026-06-02T08:12:00Z", "heart_rate": 82, "hrv_rmssd": 17, "systolic_bp": 128, "diastolic_bp": 82, "spo2": 94},
    {"patient_id": "P009", "timestamp": "2026-06-02T08:00:00Z", "heart_rate": 98, "hrv_rmssd": 26, "systolic_bp": 134, "diastolic_bp": 84, "spo2": 96},
    {"patient_id": "P009", "timestamp": "2026-06-02T08:03:00Z", "heart_rate": 102, "hrv_rmssd": 24, "systolic_bp": 138, "diastolic_bp": 88, "spo2": 96},
    {"patient_id": "P009", "timestamp": "2026-06-02T08:06:00Z", "heart_rate": 96, "hrv_rmssd": 27, "systolic_bp": 132, "diastolic_bp": 84, "spo2": 97},
    {"patient_id": "P009", "timestamp": "2026-06-02T08:09:00Z", "heart_rate": 104, "hrv_rmssd": 23, "systolic_bp": 140, "diastolic_bp": 88, "spo2": 95},
    {"patient_id": "P009", "timestamp": "2026-06-02T08:12:00Z", "heart_rate": 99, "hrv_rmssd": 25, "systolic_bp": 136, "diastolic_bp": 86, "spo2": 96},
    {"patient_id": "P010", "timestamp": "2026-06-02T08:00:00Z", "heart_rate": 64, "hrv_rmssd": 28, "systolic_bp": 138, "diastolic_bp": 84, "spo2": 97},
    {"patient_id": "P010", "timestamp": "2026-06-02T08:03:00Z", "heart_rate": 65, "hrv_rmssd": 29, "systolic_bp": 136, "diastolic_bp": 82, "spo2": 97},
    {"patient_id": "P010", "timestamp": "2026-06-02T08:06:00Z", "heart_rate": 64, "hrv_rmssd": 28, "systolic_bp": 137, "diastolic_bp": 83, "spo2": 97},
    {"patient_id": "P010", "timestamp": "2026-06-02T08:09:00Z", "heart_rate": 66, "hrv_rmssd": 30, "systolic_bp": 135, "diastolic_bp": 82, "spo2": 98},
    {"patient_id": "P010", "timestamp": "2026-06-02T08:12:00Z", "heart_rate": 64, "hrv_rmssd": 29, "systolic_bp": 136, "diastolic_bp": 82, "spo2": 97},
    {"patient_id": "P011", "timestamp": "2026-06-02T08:00:00Z", "heart_rate": 52, "hrv_rmssd": 72, "systolic_bp": 106, "diastolic_bp": 66, "spo2": 99},
    {"patient_id": "P011", "timestamp": "2026-06-02T08:03:00Z", "heart_rate": 54, "hrv_rmssd": 74, "systolic_bp": 108, "diastolic_bp": 68, "spo2": 99},
    {"patient_id": "P011", "timestamp": "2026-06-02T08:06:00Z", "heart_rate": 53, "hrv_rmssd": 73, "systolic_bp": 107, "diastolic_bp": 67, "spo2": 99},
    {"patient_id": "P011", "timestamp": "2026-06-02T08:09:00Z", "heart_rate": 55, "hrv_rmssd": 75, "systolic_bp": 108, "diastolic_bp": 68, "spo2": 99},
    {"patient_id": "P011", "timestamp": "2026-06-02T08:12:00Z", "heart_rate": 52, "hrv_rmssd": 72, "systolic_bp": 106, "diastolic_bp": 66, "spo2": 99},
    {"patient_id": "P012", "timestamp": "2026-06-02T08:00:00Z", "heart_rate": 80, "hrv_rmssd": 34, "systolic_bp": 122, "diastolic_bp": 78, "spo2": 97},
    {"patient_id": "P012", "timestamp": "2026-06-02T08:03:00Z", "heart_rate": 104, "hrv_rmssd": 22, "systolic_bp": 140, "diastolic_bp": 90, "spo2": 96},
    {"patient_id": "P012", "timestamp": "2026-06-02T08:06:00Z", "heart_rate": 118, "hrv_rmssd": 18, "systolic_bp": 152, "diastolic_bp": 96, "spo2": 95},
    {"patient_id": "P012", "timestamp": "2026-06-02T08:09:00Z", "heart_rate": 114, "hrv_rmssd": 19, "systolic_bp": 150, "diastolic_bp": 94, "spo2": 95},
    {"patient_id": "P012", "timestamp": "2026-06-02T08:12:00Z", "heart_rate": 110, "hrv_rmssd": 20, "systolic_bp": 148, "diastolic_bp": 92, "spo2": 96},
    {"patient_id": "P013", "timestamp": "2026-06-02T08:00:00Z", "heart_rate": 80, "hrv_rmssd": 32, "systolic_bp": 128, "diastolic_bp": 80, "spo2": 97},
    {"patient_id": "P013", "timestamp": "2026-06-02T08:03:00Z", "heart_rate": 83, "hrv_rmssd": 30, "systolic_bp": 132, "diastolic_bp": 82, "spo2": 97},
    {"patient_id": "P013", "timestamp": "2026-06-02T08:06:00Z", "heart_rate": 86, "hrv_rmssd": 28, "systolic_bp": 136, "diastolic_bp": 85, "spo2": 96},
    {"patient_id": "P013", "timestamp": "2026-06-02T08:09:00Z", "heart_rate": 88, "hrv_rmssd": 27, "systolic_bp": 140, "diastolic_bp": 88, "spo2": 96},
    {"patient_id": "P013", "timestamp": "2026-06-02T08:12:00Z", "heart_rate": 90, "hrv_rmssd": 26, "systolic_bp": 142, "diastolic_bp": 90, "spo2": 96},
    {"patient_id": "P014", "timestamp": "2026-06-02T08:00:00Z", "heart_rate": 126, "hrv_rmssd": 10, "systolic_bp": 164, "diastolic_bp": 102, "spo2": 88},
    {"patient_id": "P014", "timestamp": "2026-06-02T08:03:00Z", "heart_rate": 134, "hrv_rmssd": 8, "systolic_bp": 172, "diastolic_bp": 106, "spo2": 86},
    {"patient_id": "P014", "timestamp": "2026-06-02T08:06:00Z", "heart_rate": 140, "hrv_rmssd": 7, "systolic_bp": 180, "diastolic_bp": 110, "spo2": 84},
    {"patient_id": "P014", "timestamp": "2026-06-02T08:09:00Z", "heart_rate": 148, "hrv_rmssd": 5, "systolic_bp": 188, "diastolic_bp": 114, "spo2": 82},
    {"patient_id": "P014", "timestamp": "2026-06-02T08:12:00Z", "heart_rate": 152, "hrv_rmssd": 4, "systolic_bp": 192, "diastolic_bp": 116, "spo2": 80},
]


STATUS_TO_HEALTH = {
    "healthy": "NORMAL",
    "at_risk": "WARNING",
    "critical": "ABNORMAL",
    "recent_symptom": "WARNING",
}


def list_patients() -> list[dict[str, Any]]:
    return deepcopy(PATIENT_DIRECTORY)


def get_patient_record(patient_id: str) -> dict[str, Any]:
    for patient in PATIENT_DIRECTORY:
        if patient["id"] == patient_id:
            return deepcopy(patient)
    raise KeyError(patient_id)


def list_alerts() -> list[dict[str, Any]]:
    return deepcopy(ALERT_DIRECTORY)


def get_alert_record(alert_id: str) -> dict[str, Any]:
    for alert in ALERT_DIRECTORY:
        if alert["id"] == alert_id:
            return deepcopy(alert)
    raise KeyError(alert_id)


def list_vitals(patient_id: str) -> list[dict[str, Any]]:
    return deepcopy([item for item in VITAL_SAMPLES if item["patient_id"] == patient_id])


def summarize_metrics(patient_id: str) -> list[dict[str, Any]]:
    samples = list_vitals(patient_id)
    if not samples:
        return []

    ordered = sorted(samples, key=lambda item: item["timestamp"])
    latest = ordered[-1]
    previous = ordered[-2] if len(ordered) > 1 else latest

    def change_pct(current: float, baseline: float) -> int:
        if baseline == 0:
            return 0
        return round(((current - baseline) / baseline) * 100)

    def metric_status(metric: str, value: float) -> str:
        if metric == "spo2":
            if value <= 92:
                return "critical"
            if value <= 95:
                return "recent_symptom"
            return "healthy"
        if metric == "heart_rate":
            if value >= 110 or value <= 50:
                return "critical"
            if value >= 95 or value <= 58:
                return "at_risk"
            return "healthy"
        if metric == "systolic_bp":
            if value >= 150 or value <= 90:
                return "critical"
            if value >= 130 or value <= 100:
                return "at_risk"
            return "healthy"
        if metric == "diastolic_bp":
            if value >= 95 or value <= 55:
                return "critical"
            if value >= 85 or value <= 60:
                return "at_risk"
            return "healthy"
        if metric == "hrv_rmssd":
            if value <= 18:
                return "critical"
            if value <= 28:
                return "at_risk"
            return "healthy"
        return "healthy"

    def build(metric: str, unit: str, key: str) -> dict[str, Any]:
        values = [item[key] for item in ordered]
        current = latest[key]
        baseline = previous[key]
        delta = change_pct(current, baseline)
        return {
            "metric": metric,
            "current_value": current,
            "unit": unit,
            "average_15m": round(mean(values)),
            "trend": "stable" if delta == 0 else "up" if delta > 0 else "down",
            "change_pct": delta,
            "status": metric_status(metric, current),
        }

    return [
        build("heart_rate", "bpm", "heart_rate"),
        build("hrv_rmssd", "ms", "hrv_rmssd"),
        build("spo2", "%", "spo2"),
        build("systolic_bp", "mmHg", "systolic_bp"),
        build("diastolic_bp", "mmHg", "diastolic_bp"),
    ]


def build_patient_fixture(patient_id: str) -> dict[str, Any]:
    patient = get_patient_record(patient_id)
    recent_vitals = []
    for item in list_vitals(patient_id)[-5:]:
        recent_vitals.append(
            {
                "timestamp": item["timestamp"],
                "heart_rate": item["heart_rate"],
                "hrv": item["hrv_rmssd"],
                "systolic_bp": item["systolic_bp"],
                "diastolic_bp": item["diastolic_bp"],
                "spo2": item["spo2"],
                "activity_state": "resting",
                "status": STATUS_TO_HEALTH.get(patient["status"], "NORMAL"),
            }
        )

    recent_alerts = [
        {
            "alert_id": alert["id"],
            "alert_type": alert["type"],
            "severity": alert["severity"].upper(),
            "confidence": round((alert.get("score") or 5) / 10, 2),
            "message": alert["message"],
        }
        for alert in list_alerts()
        if alert["patient_id"] == patient_id and not alert["acknowledged"]
    ]

    return {
        "patient_id": patient["id"],
        "name": patient["name"],
        "age": patient["age"],
        "gender": "Nam" if patient["gender"] == "male" else "Nu" if patient["gender"] == "female" else "Khac",
        "medical_history": patient["medical_history"],
        "health_status": STATUS_TO_HEALTH.get(patient["status"], "NORMAL"),
        "recent_vitals": recent_vitals,
        "recent_alerts": recent_alerts,
    }


def build_alert_fixture(alert_id: str) -> dict[str, Any]:
    alert = get_alert_record(alert_id)
    patient = get_patient_record(alert["patient_id"])
    vitals = list_vitals(alert["patient_id"])[-5:]
    sensor_context = []
    for item in vitals:
        sensor_context.append(
            {
                "timestamp": item["timestamp"],
                "heart_rate": item["heart_rate"],
                "spo2": item["spo2"],
                "systolic_bp": item["systolic_bp"],
                "diastolic_bp": item["diastolic_bp"],
                "acc_magnitude": None,
                "movement_level": None,
                "status": STATUS_TO_HEALTH.get(patient["status"], "NORMAL"),
            }
        )

    return {
        "alert_id": alert["id"],
        "patient_id": alert["patient_id"],
        "timestamp": alert["timestamp"],
        "alert_type": alert["type"],
        "health_status": STATUS_TO_HEALTH.get(patient["status"], "NORMAL"),
        "severity": alert["severity"].upper(),
        "confidence": round((alert.get("score") or 5) / 10, 2),
        "message": alert["message"],
        "evidence": deepcopy(alert["evidence"]),
        "sensor_context": sensor_context,
    }
