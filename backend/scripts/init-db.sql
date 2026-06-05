-- E2E Simulation schema setup

CREATE TABLE IF NOT EXISTS patients (
    patient_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    age INT,
    gender VARCHAR(20),
    medical_history TEXT,
    health_status VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS raw_vitals (
    message_id VARCHAR(100) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    timestamp TIMESTAMP WITH TIME ZONE,
    raw_payload JSONB
);

CREATE TABLE IF NOT EXISTS clean_vitals (
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    timestamp TIMESTAMP WITH TIME ZONE,
    heart_rate FLOAT,
    rr_interval_ms FLOAT,
    hrv_rmssd FLOAT,
    systolic_bp FLOAT,
    diastolic_bp FLOAT,
    spo2 FLOAT,
    acc_x FLOAT,
    acc_y FLOAT,
    acc_z FLOAT,
    acc_magnitude FLOAT,
    gyro_x FLOAT,
    gyro_y FLOAT,
    gyro_z FLOAT,
    gyro_magnitude FLOAT,
    PRIMARY KEY (patient_id, timestamp)
);

CREATE TABLE IF NOT EXISTS health_alerts (
    alert_id VARCHAR(100) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES patients(patient_id),
    timestamp TIMESTAMP WITH TIME ZONE,
    alert_type VARCHAR(100),
    health_status VARCHAR(50),
    severity VARCHAR(50),
    confidence FLOAT,
    evidence JSONB,
    message TEXT
);

-- Seed a patient P001 for testing and development
INSERT INTO patients (patient_id, name, age, gender, medical_history, health_status)
VALUES ('P001', 'John Doe', 45, 'Male', 'Hypertension, Sleep Apnea', 'NORMAL')
ON CONFLICT (patient_id) DO NOTHING;
