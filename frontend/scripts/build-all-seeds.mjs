import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");
mkdirSync(join(dataDir, "shifts"), { recursive: true });

const patients = [
  ["P001","MRN-2026-001","Nguyễn Văn An",68,"male","at_risk","cardiology_ward","cardiology","A-102",["hypertension","type_2_diabetes"],["shortness_of_breath"],"2026-06-02T08:12:00Z",[["amlodipine","5 mg","daily_0800","2026-06-03T08:00:00Z"]]],
  ["P002","MRN-2026-002","Trần Thị Bình",57,"female","healthy","general_ward","internal_medicine","B-204",["asthma"],[],"2026-06-02T08:10:00Z",[]],
  ["P003","MRN-2026-003","Lê Văn Công",74,"male","critical","icu","emergency","ICU-03",["coronary_artery_disease"],["chest_discomfort"],"2026-06-02T08:09:00Z",[["nitroglycerin","0.4 mg","as_ordered",null]]],
  ["P004","12345678","Minh Trần",62,"male","recent_symptom","respiratory_ward","pulmonology","R-118",["chronic_bronchitis"],["new_cough","fatigue"],"2026-06-02T08:11:00Z",[]],
  ["P005","MRN-2026-005","Phạm Ngọc Lan",45,"female","healthy","general_ward","endocrinology","C-105",["type_2_diabetes"],[],"2026-06-02T08:05:00Z",[]],
  ["P006","MRN-2026-006","Đỗ Gia Hưng",51,"male","at_risk","cardiology_ward","cardiology","A-108",["hypertension"],["fatigue"],"2026-06-02T08:03:00Z",[]],
  ["P007","MRN-2026-007","Bùi Thanh Mai",63,"female","critical","stroke_unit","neurology","N-12",["hypertension"],["dizziness"],"2026-06-02T08:02:00Z",[]],
  ["P008","MRN-2026-008","Hoàng Đức Bảo",59,"male","at_risk","respiratory_ward","pulmonology","R-203",["copd"],["shortness_of_breath"],"2026-06-02T08:01:00Z",[]],
  ["P009","MRN-2026-009","Ngô Thị Hoa",36,"female","recent_symptom","observation","general_medicine","O-05",[],["palpitations"],"2026-06-02T08:00:00Z",[]],
  ["P010","MRN-2026-010","Lý Quốc Khang",70,"male","healthy","general_ward","geriatrics","G-14",["hypertension"],[],"2026-06-02T07:58:00Z",[]],
  ["P011","MRN-2026-011","Võ Yến Nhi",29,"female","healthy","general_ward","general_medicine","B-112",[],[],"2026-06-02T07:55:00Z",[]],
  ["P012","MRN-2026-012","Dương Hữu Phúc",66,"male","recent_symptom","cardiology_ward","cardiology","A-212",["ischemic_heart_disease"],["chest_discomfort"],"2026-06-02T07:53:00Z",[]],
  ["P013","MRN-2026-013","Phan Tuấn Kiệt",48,"male","at_risk","endocrine_ward","endocrinology","E-07",["type_2_diabetes"],["fatigue"],"2026-06-02T07:50:00Z",[]],
  ["P014","MRN-2026-014","Mai Thanh Tâm",54,"female","critical","icu","critical_care","ICU-08",["chronic_kidney_disease"],["confusion"],"2026-06-02T07:48:00Z",[]],
].map(([id,mrn,name,age,gender,status,ward_code,department_code,bed,underlying_condition_codes,recent_symptom_codes,last_updated,medications]) => ({
  id, mrn, name, age, gender, status, ward_code, department_code, bed,
  underlying_condition_codes,
  recent_symptom_codes,
  last_updated,
  medications: medications.map(([medication_code,dosage,schedule_code,next_dose_at]) => ({
    medication_code, dosage, schedule_code, last_taken_at: null, next_dose_at,
  })),
}));

const alerts = [
  { id:"alert-001", patient_id:"P001", type:"low_oxygen", severity:"warning", score:7.2, timestamp:"2026-06-02T08:09:00Z", acknowledged:false, evidence:[{ kind:"metric_threshold", metric:"spo2", value:94, unit:"%", timestamp:"2026-06-02T08:09:00Z", note_key:"spo2_below_recent_baseline" }] },
  { id:"alert-002", patient_id:"P003", type:"high_blood_pressure", severity:"critical", score:8.4, timestamp:"2026-06-02T08:09:00Z", acknowledged:false, evidence:[{ kind:"metric_threshold", metric:"systolic_bp", value:156, unit:"mmHg", timestamp:"2026-06-02T08:09:00Z", note_key:"systolic_bp_above_threshold" }] },
  { id:"alert-003", patient_id:"P006", type:"high_blood_pressure", severity:"warning", score:6.8, timestamp:"2026-06-02T08:12:00Z", acknowledged:false, evidence:[{ kind:"trend_change", metric:"systolic_bp", value:140, unit:"mmHg", comparison_value:136, comparison_window:"15m", timestamp:"2026-06-02T08:12:00Z" }] },
  { id:"alert-004", patient_id:"P007", type:"stroke_risk", severity:"critical", score:9.1, timestamp:"2026-06-02T08:10:00Z", acknowledged:false, evidence:[{ kind:"symptom_report", symptom_code:"dizziness", timestamp:"2026-06-02T08:10:00Z", note_key:"neurologic_symptom_reported" }] },
  { id:"alert-005", patient_id:"P008", type:"low_oxygen", severity:"warning", score:7.5, timestamp:"2026-06-02T08:09:00Z", acknowledged:false, evidence:[{ kind:"metric_threshold", metric:"spo2", value:93, unit:"%", timestamp:"2026-06-02T08:09:00Z", note_key:"spo2_below_resting_threshold" }] },
  { id:"alert-006", patient_id:"P012", type:"high_heart_rate", severity:"info", score:5.4, timestamp:"2026-06-02T08:09:00Z", acknowledged:false, evidence:[{ kind:"trend_change", metric:"heart_rate", value:99, unit:"bpm", comparison_value:86, comparison_window:"15m", timestamp:"2026-06-02T08:09:00Z" }] },
  { id:"alert-007", patient_id:"P013", type:"deterioration_risk", severity:"warning", score:6.9, timestamp:"2026-06-02T08:12:00Z", acknowledged:false, evidence:[{ kind:"trend_change", metric:"respiratory_rate", value:23, unit:"rpm", comparison_value:18, comparison_window:"15m", timestamp:"2026-06-02T08:12:00Z" }] },
  { id:"alert-008", patient_id:"P014", type:"high_blood_pressure", severity:"critical", score:8.9, timestamp:"2026-06-02T08:09:00Z", acknowledged:false, evidence:[{ kind:"metric_threshold", metric:"systolic_bp", value:158, unit:"mmHg", timestamp:"2026-06-02T08:09:00Z" }, { kind:"metric_threshold", metric:"spo2", value:91, unit:"%", timestamp:"2026-06-02T08:09:00Z" }] },
];

const roster = [
  { id:"staff-coord-1", name:"ĐD. Lan Nguyễn", role:"coordinator", zone_code:"coordination", status:"active" },
  { id:"staff-coord-2", name:"ĐD. Hoa Phạm", role:"coordinator", zone_code:"coordination", status:"break" },
  { id:"staff-doc-1", name:"BS. Minh Phạm", role:"doctor", zone_code:"ward_wide", status:"active" },
  { id:"staff-doc-2", name:"BS. An Vũ", role:"doctor", zone_code:"ward_wide", status:"active" },
  { id:"staff-nurse-1", name:"YT. Hương Trần", role:"floor_nurse", zone_code:"zone_a", status:"active" },
  { id:"staff-nurse-2", name:"YT. Mai Lê", role:"floor_nurse", zone_code:"zone_a", status:"active" },
  { id:"staff-nurse-3", name:"YT. Thảo Nguyễn", role:"floor_nurse", zone_code:"zone_a", status:"break" },
  { id:"staff-nurse-4", name:"YT. Linh Đặng", role:"floor_nurse", zone_code:"zone_b", status:"active" },
  { id:"staff-nurse-5", name:"YT. Vy Phan", role:"floor_nurse", zone_code:"zone_b", status:"active" },
  { id:"staff-nurse-6", name:"YT. Hà Lý", role:"floor_nurse", zone_code:"zone_b", status:"off" },
  { id:"staff-nurse-7", name:"YT. Chi Bùi", role:"floor_nurse", zone_code:"zone_c", status:"active" },
  { id:"staff-nurse-8", name:"YT. Nga Võ", role:"floor_nurse", zone_code:"zone_c", status:"active" },
  { id:"staff-nurse-9", name:"YT. Trang Đinh", role:"floor_nurse", zone_code:"zone_c", status:"active" },
  { id:"staff-nurse-10", name:"YT. Loan Hoàng", role:"floor_nurse", zone_code:"zone_d", status:"active" },
  { id:"staff-nurse-11", name:"YT. Phương Cao", role:"floor_nurse", zone_code:"zone_d", status:"break" },
];

const shift = {
  id: "shift-demo-1",
  ward_code: "icu_3",
  started_at: "2026-06-02T06:00:00Z",
  coordinator_id: "staff-coord-1",
};

const operatorSession = {
  roles: {
    coordinator: { actor_id: "staff-coord-1", staff_id: "staff-coord-1" },
    doctor: { actor_id: "staff-doc-1", staff_id: "staff-doc-1" },
  },
};

writeFileSync(join(dataDir, "patients.seed.json"), JSON.stringify(patients, null, 2));
writeFileSync(join(dataDir, "alerts.seed.json"), JSON.stringify(alerts, null, 2));
writeFileSync(join(dataDir, "shifts", "roster.seed.json"), JSON.stringify(roster, null, 2));
writeFileSync(join(dataDir, "shifts", "shift.seed.json"), JSON.stringify(shift, null, 2));
writeFileSync(join(dataDir, "operator-session.seed.json"), JSON.stringify(operatorSession, null, 2));

// vitals from existing export if present
const vitalsPath = join(dataDir, "vitals.seed.json");
try {
  readFileSync(vitalsPath);
} catch {
  writeFileSync(vitalsPath, "[]");
}

console.log("Built seed JSON:", patients.length, "patients,", alerts.length, "alerts,", roster.length, "staff");
