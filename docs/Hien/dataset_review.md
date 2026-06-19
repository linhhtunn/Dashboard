# Dataset Review - Normal Biosignal Thresholds

Project: E2E Simulation for AI Health  
Scope: Team 1 normal data generation first. The simulator should generate `NORMAL` streams by patient group and activity state; abnormal values are documented only for later anomaly injection.

Survey inputs:

- `biosignal_reference_table - Subjects and Gender Range.pdf`
- `biosignal_reference_table - Signal Ranges by Activity.pdf`

## Biosignals Required By Simulator

These are the fields the simulator should be able to generate for `clean_vitals`:

| Category | Fields |
| --- | --- |
| Cardiac | `heart_rate`, `rr_interval_ms`, `hrv_rmssd` |
| Blood pressure | `systolic_bp`, `diastolic_bp` |
| Oxygen | `spo2` |
| Accelerometer | `acc_x`, `acc_y`, `acc_z`, `acc_magnitude` |
| Gyroscope | `gyro_x`, `gyro_y`, `gyro_z`, `gyro_magnitude` |

## Patient Groups

| Simulator group | DB mapping | Description |
| --- | --- | --- |
| `young_male` | `age_group = young`, `gender = male` | Male, 18-35 years old |
| `young_female` | `age_group = young`, `gender = female` | Female, 18-35 years old |
| `pregnant` | `age_group = pregnant` | Pregnant patient, any trimester |
| `elderly_male` | `age_group = elderly`, `gender = male` | Male, >=65 years old |
| `elderly_female` | `age_group = elderly`, `gender = female` | Female, >=65 years old |

## Subject Group Normal Ranges

Use this table to personalize the normal baseline before applying activity-state adjustments.

| Signal | Unit | young_male | young_female | pregnant | elderly_male | elderly_female | Sources |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Resting `heart_rate` | bpm | 60-75 | 65-80 | 70-90 | 65-85 | 70-90 | AHA Heart Rate; BMC Med 2019 PMID 31506067; Health average HR |
| Walking/active `heart_rate` | bpm | 80-120 | 85-125 | 75-110 | 80-115 | 80-115 | Subject survey table; AHA exercise HR guidance |
| Max exercise HR reference | bpm | 185-200 | 185-200 | 140-155 | 130-155 | 130-155 | Tanaka PMID 11153730; ACOG exercise in pregnancy |
| `spo2` | % | 96-100 | 96-100 | 95-100 | 94-99 | 94-99 | eMedicineHealth; Healthline; cosinuss; FDA pulse oximeter limitations |
| Sitting/rest `systolic_bp` | mmHg | 100-119 | 95-115 | 105-135 | 110-139 | 105-135 | AHA BP; BMC Med 2019; MedicineNet; BP sex/age studies |
| Sitting/rest `diastolic_bp` | mmHg | 60-79 | 58-76 | 60-85 | 65-89 | 62-87 | BMC Med 2019; MedicineNet; ACOG pregnancy BP |
| Walking `acc_magnitude` | g | 1.0-2.5 | 1.0-2.4 | 0.8-2.0 | 0.6-1.8 | 0.6-1.8 | Wrist fall detection PMID 29701721; Frontiers Digital Health PMID 35911615 |
| Standing/sitting `acc_z` | g | 0.8-1.2 | 0.8-1.2 | 0.75-1.2 | 0.75-1.15 | 0.75-1.15 | Chest-mounted posture study PMID 27556340; IMU physics |
| Walking `gyro_magnitude` average | rad/s | 0.1-0.5 | 0.1-0.5 | 0.08-0.4 | 0.05-0.3 | 0.05-0.3 | Wrist fall detection PMID 29701721; Frontiers Digital Health PMID 35911615 |

## Activity-State Normal Ranges

This table comes from the activity survey PDF. It is the main source for state-based generation.

| Biosignal | Unit | Sleeping | Sitting | Standing | Walking | Exercise reference | Sources |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `heart_rate` | bpm | 40-60 | 55-75 | 60-85 | 80-110 | 120-180 | AHA/Circulation 2023; AHA Heart Rate |
| `rr_interval_ms` | ms | 1000-1500 | 800-1090 | 705-1000 | 545-750 | 333-500 | Derived from HR as `60000 / heart_rate` |
| `hrv_rmssd` | ms | 40-100 | 35-75 | 30-70 | 20-55 | 10-35 | Frontiers Public Health HRV; ESC HRV standards; Kubios HRV |
| `systolic_bp` | mmHg | 88-108 | 100-120 | 100-125 | 110-140 | 140-200 | HOPE Asia/VSH BP; exercise BP cohort note from survey |
| `diastolic_bp` | mmHg | 52-72 | 60-80 | 60-82 | 62-85 | 65-90 | HOPE Asia/VSH BP |
| `spo2` | % | 95-100 | 95-100 | 95-100 | 94-100 | 93-100 | FDA Pulse Oximeter Safety Communication; eMedicineHealth; Healthline |
| `acc_x` | g | -0.1 to 0.1 | -0.3 to 0.3 | -0.5 to 0.5 | -1.5 to 1.5 | -3.0 to 3.0 | Bosch BMI270/BMA400; activity survey heuristic |
| `acc_y` | g | -0.1 to 0.1 | -0.3 to 0.3 | -0.5 to 0.5 | -2.0 to 2.0 | -3.5 to 3.5 | Bosch BMI270/BMA400; activity survey heuristic |
| `acc_z` | g | 0.9-1.1 | 0.85-1.05 | 0.8-1.1 | 0.5-1.5 | 0.3-2.0 | Chest-mounted posture study PMID 27556340 |
| `acc_magnitude` | g | 0.9-1.1 | 0.9-1.15 | 0.9-1.2 | 1.0-2.5 | 1.5-4.0 | Bosch BMA400; wrist fall detection PMID 29701721 |
| `gyro_x` | rad/s | -0.02 to 0.02 | -0.05 to 0.05 | -0.1 to 0.1 | -2.1 to 2.1 | -3.5 to 3.5 | Bosch BMI270; Sensors 2020 wrist IMU arm-swing |
| `gyro_y` | rad/s | -0.02 to 0.02 | -0.05 to 0.05 | -0.1 to 0.1 | -2.1 to 2.1 | -3.5 to 3.5 | Bosch BMI270; Sensors 2020 wrist IMU arm-swing |
| `gyro_z` | rad/s | -0.01 to 0.01 | -0.03 to 0.03 | -0.05 to 0.05 | -1.0 to 1.0 | -2.5 to 2.5 | Tibial rotation biomechanics PMID 28531131 |
| `gyro_magnitude` | rad/s | 0.00-0.03 | 0.00-0.08 | 0.02-0.15 | 0.3-2.5 | 1.0-5.5 | Derived from gyro axes; Sensors 2020; Bosch BMI270 |

Do not use `Exercise reference` for the first normal stream unless the patient scenario explicitly enters an exercise state. For Day 2/Day 3 normal simulator, prefer sleeping/sitting/standing/walking.

## Normal Generation Rules

| Activity state | Generation rule |
| --- | --- |
| `sleeping` / `lying` | Use sleeping HR, BP, SpO2, HRV ranges. Keep ACC magnitude near 1g and gyro near 0. |
| `sitting` | Use sitting HR/BP/SpO2/HRV ranges. ACC_Z should stay near 1g and gyro should be low. |
| `standing` | Use standing HR/BP/SpO2/HRV ranges. Add small posture jitter to ACC/GYRO. |
| `walking` | Use walking HR/BP/SpO2/HRV ranges. Align ACC/GYRO to walking ranges. |

Recommended normal activity mix:

| Activity state | Probability |
| --- | --- |
| `sitting` | 35% |
| `walking` | 30% |
| `standing` | 20% |
| `sleeping` / `lying` | 15% |

## Derived Field Rules

| Field | Rule |
| --- | --- |
| `rr_interval_ms` | Calculate from HR: `60000 / heart_rate`. Example: 60 bpm -> 1000 ms, 100 bpm -> 600 ms. |
| `acc_magnitude` | Calculate as `sqrt(acc_x^2 + acc_y^2 + acc_z^2)`. Keep within the activity-state range. |
| `gyro_magnitude` | Calculate as `sqrt(gyro_x^2 + gyro_y^2 + gyro_z^2)`. Keep within the activity-state range. |
| `hrv_rmssd` | Use activity-state ranges. Keep normal data far below AFib proxy threshold `>150 ms`. |

## Later Abnormal Boundaries

These are not for the first normal generator. Keep for anomaly injection.

| Signal | Abnormal boundary |
| --- | --- |
| Resting HR, young male | <50 or >100 bpm |
| Resting HR, young female | <55 or >100 bpm |
| Resting HR, pregnant | <60 or >110 bpm |
| Resting HR, elderly male | <55 or >95 bpm |
| Resting HR, elderly female | <60 or >100 bpm |
| SpO2, young/pregnant | <94% |
| SpO2, elderly | <90% requires intervention |
| Systolic BP, young | <90 or >=130 mmHg |
| Systolic BP, pregnant | <95 or >=140 mmHg |
| Systolic BP, elderly | <90 or >=140 mmHg |
| Diastolic BP, young | <50 or >=80 mmHg |
| Diastolic BP, pregnant | <50 or >=90 mmHg |
| Diastolic BP, elderly | <55 or >=90 mmHg |
| ACC fall spike | `acc_magnitude > 4g` in <200ms |
| GYRO fall spike | young >1.5 rad/s, pregnant >1.2 rad/s, elderly >1.0 rad/s in <300ms |
| AFib/stroke proxy | Irregular HR plus `hrv_rmssd > 150 ms` |

## PubMed/PMC Evidence Mapping

This table records how the two local survey PDFs were cross-checked with PubMed/PMC literature. Use it when explaining why a biosignal range is in the simulator.

| Biosignal(s) | Evidence used | How it is used in simulator |
| --- | --- | --- |
| `heart_rate`, `systolic_bp`, `diastolic_bp` for pregnancy | BMC Medicine systematic review/meta-analysis, PMID 31506067; pregnancy BP trajectory PMID 25255393 | Supports pregnancy-specific HR/BP ranges and stricter abnormal BP boundary. |
| `heart_rate` max reference | Tanaka age-predicted max HR, PMID 11153730 | Used only as exercise reference; not used for normal Sprint 1 stream. |
| `hrv_rmssd`, `rr_interval_ms` | Frontiers HRV review; ESC HRV standards; Kubios HRV normal values | Defines RMSSD as short-term HRV metric and supports age/activity-sensitive HRV generation. RR interval is derived from HR. |
| `spo2` | FDA pulse oximeter limitations; eMedicineHealth; Healthline; cosinuss SpO2 reference | Keeps normal SpO2 stream inside 94/95-100% group-specific ranges and avoids false clinical certainty. |
| `acc_x`, `acc_y`, `acc_z`, `acc_magnitude` | Bosch BMI270/BMA400 datasheets; chest-mounted posture study PMID 27556340; wrist accelerometer fall detection PMID 29701721 | Uses physics-based static ranges near 1g and walking/fall technical thresholds for IMU simulation. |
| `gyro_x`, `gyro_y`, `gyro_z`, `gyro_magnitude` | Sensors 2020 wrist IMU arm-swing; tibial rotation biomechanics PMID 28531131; hybrid accelerometer/gyroscope fall detection PMID 30207983; near-fall ACC+GYRO PMID 23367256 | Supports gyro ranges by activity state and later fall/anomaly thresholds. |
| ACC/GYRO fall/anomaly boundaries | Wrist fall detection PMID 29701721; Frontiers Digital Health fall-risk review PMID 35911615; smartwatch fall detection PMID 35311686; SmartFall PMC6210545 | Kept for later anomaly injection, not for the first normal data generator. |

## Full Source List

| Source key | Link |
| --- | --- |
| AHA Heart Rate | https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/all-about-heart-rate-pulse |
| AHA Tachycardia / resting HR | https://www.heart.org/en/health-topics/arrhythmia/about-arrhythmia/tachycardia--fast-heart-rate |
| AHA/Circulation 2023 guideline source from activity survey | https://www.ahajournals.org/doi/10.1161/CIR.0000000000001123 |
| BMC Medicine pregnancy HR/BP meta-analysis, PMID 31506067 | https://pubmed.ncbi.nlm.nih.gov/31506067/ |
| BMC Medicine full text pregnancy BP | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6737610/ |
| Health average heart rate | https://www.health.com/average-heart-rate-7106508 |
| Tanaka max HR, PMID 11153730 | https://pubmed.ncbi.nlm.nih.gov/11153730/ |
| ACOG exercise in pregnancy | https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2020/04/physical-activity-and-exercise-during-pregnancy-and-the-postpartum-period |
| FDA pulse oximeter accuracy and limitations | https://www.fda.gov/medical-devices/products-and-medical-procedures/pulse-oximeters |
| eMedicineHealth SpO2 chart | https://www.emedicinehealth.com/what_is_a_good_oxygen_rate_by_age/article_em.htm |
| Healthline normal blood oxygen | https://www.healthline.com/health/normal-blood-oxygen-level |
| cosinuss SpO2 reference | https://www.cosinuss.com/en/measured-data/vital-signs/oxygen-saturation/ |
| Cleveland Clinic vital signs / respiratory rate | https://my.clevelandclinic.org/health/articles/10881-vital-signs |
| HOPE Asia Network BP statement | https://pmc.ncbi.nlm.nih.gov/articles/PMC8925006/ |
| HOPE Asia home BP monitoring | https://pmc.ncbi.nlm.nih.gov/articles/PMC8031139/ |
| MedicineNet BP by age and gender | https://www.medicinenet.com/what_is_normal_blood_pressure_and_pulse_by_age/article.htm |
| Sex differences in BP, PMC4283814 | https://pmc.ncbi.nlm.nih.gov/articles/PMC4283814/ |
| BP changes with age, PMC7268741 | https://pmc.ncbi.nlm.nih.gov/articles/PMC7268741/ |
| Pregnancy BP trajectory, PMID 25255393 | https://pubmed.ncbi.nlm.nih.gov/25255393/ |
| HRV review, Frontiers Public Health 2017 | https://www.frontiersin.org/articles/10.3389/fpubh.2017.00258/full |
| Kubios HRV normal values 2024 | https://www.kubios.com/blog/hrv-normal-values/ |
| Bosch BMI270 IMU | https://www.bosch-sensortec.com/products/motion-sensors/imus/bmi270/ |
| Bosch BMA400 accelerometer | https://www.bosch-sensortec.com/products/motion-sensors/accelerometers/bma400/ |
| Chest-mounted posture study, PMID 27556340 | https://pubmed.ncbi.nlm.nih.gov/27556340/ |
| Wrist accelerometer fall detection, PMID 29701721 | https://pubmed.ncbi.nlm.nih.gov/29701721/ |
| Frontiers Digital Health fall risk review, PMID 35911615 | https://pubmed.ncbi.nlm.nih.gov/35911615/ |
| Near-fall vs daily activity ACC+GYRO, PMID 23367256 | https://pubmed.ncbi.nlm.nih.gov/23367256/ |
| Hybrid accelerometer/gyroscope threshold fall detection, PMID 30207983 | https://pubmed.ncbi.nlm.nih.gov/30207983/ |
| Smartwatch induced-fall detection, PMID 35311686 | https://pubmed.ncbi.nlm.nih.gov/35311686/ |
| SmartFall smartwatch fall detection, PMC6210545 | https://pmc.ncbi.nlm.nih.gov/articles/PMC6210545/ |
| Improving fall detection using an on-wrist wearable accelerometer, PMC5982860 | https://pmc.ncbi.nlm.nih.gov/articles/PMC5982860/ |
| Sensors 2020 wrist IMU arm-swing | https://www.mdpi.com/1424-8220/20/4/1171 |
| Tibial rotation biomechanics, PMID 28531131 | https://pubmed.ncbi.nlm.nih.gov/28531131/ |
| ESC HRV standards | ESC HRV Task Force 1996, referenced in survey table |
| AHA Stroke / ESC AFib | Referenced in subject survey table for AFib/stroke proxy |
