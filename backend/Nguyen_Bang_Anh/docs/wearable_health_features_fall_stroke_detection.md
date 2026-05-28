# Wearable Health Monitoring Features for Fall & Stroke Detection

## 1. Raw / Primary Signals

Đây là các tín hiệu đo trực tiếp từ wearable device.

| Raw Signal | Sensor | Unit | Typical Range | Meaning | Simulation Dataset Description | Simulation Dataset Link |
|---|---|---|---|---|---|---|
| Acceleration X/Y/Z | Accelerometer | g hoặc m/s² | ±2g → ±16g | Chuyển động cơ thể | Bộ dữ liệu SisFall chứa dữ liệu gia tốc kế 3 trục đo chuyển động ngã và các hoạt động hàng ngày (ADLs). | [SisFall Dataset on Kaggle](https://www.kaggle.com/datasets/tawsifurrahman/sisfall-dataset) |
| Angular Velocity X/Y/Z | Gyroscope | deg/s | ±250 → ±2000 | Chuyển động quay | Bộ dữ liệu SisFall chứa dữ liệu con quay hồi chuyển 3 trục ghi lại vận tốc góc trong các sự kiện ngã và ADLs. | [SisFall Dataset on Kaggle](https://www.kaggle.com/datasets/tawsifurrahman/sisfall-dataset) |
| Magnetometer X/Y/Z | Magnetometer | µT | ±30–60 µT | Hướng/orientation | Bộ dữ liệu MHEALTH chứa dữ liệu cảm biến từ kế (Magnetometer) cùng với Acc và Gyro để theo dõi hướng chuyển động cơ thể khi hoạt động. | [MHEALTH Dataset on Kaggle](https://www.kaggle.com/datasets/tawsifurrahman/mhealth-dataset) |
| Heart Rate (HR) | PPG / ECG | BPM | 40–200 | Nhịp tim | Bộ dữ liệu Fitbit Fitness Tracker Data chứa dữ liệu nhịp tim (Heart Rate) được theo dõi liên tục theo phút của người dùng. | [Fitbit Fitness Tracker Data on Kaggle](https://www.kaggle.com/datasets/arashnic/fitbit) |
| RR Intervals | ECG / PPG | ms | 400–1500 ms | Khoảng cách nhịp tim | Bộ dữ liệu BIDMC PPG and Respiration Dataset chứa các thông số nhịp tim và khoảng cách RR (RR intervals) được trích xuất từ các tín hiệu ECG/PPG tần số cao. | [BIDMC PPG & Respiration on PhysioNet](https://physionet.org/content/bidmc/1.0.0/) |
| PPG Waveform | PPG | optical signal | device-specific | Pulse waveform | Bộ dữ liệu WESAD chứa dạng sóng PPG (BVP - Blood Volume Pulse) tần số 64Hz ghi lại từ cổ tay (thiết bị Empatica E4) của người tham gia. | [WESAD Dataset on Kaggle](https://www.kaggle.com/datasets/vasanth10/wesad-wearable-stress-and-affect-detection) |
| ECG Signal | ECG | mV | device-specific | Electrical heart activity | Bộ dữ liệu MHEALTH chứa tín hiệu ECG 2 kênh (2-lead ECG) tần số 50Hz ghi lại hoạt động điện tim của người dùng khi vận động. | [MHEALTH Dataset on Kaggle](https://www.kaggle.com/datasets/tawsifurrahman/mhealth-dataset) |
| SpO2 | Pulse Oximeter | % | 90–100% | Oxy máu | Bộ dữ liệu BIDMC PPG and Respiration Dataset chứa thông số độ bão hòa oxy trong máu (SpO2) được đo bằng pulse oximeter của bệnh nhân. | [BIDMC PPG & Respiration on PhysioNet](https://physionet.org/content/bidmc/1.0.0/) |
| Respiratory Signal | Respiration sensor / PPG | bpm | 10–30 | Nhịp thở | Bộ dữ liệu BIDMC PPG and Respiration Dataset chứa tín hiệu hô hấp (impedance pneumography) cùng với nhịp thở thực tế (ground-truth) để kiểm thử thuật toán. | [BIDMC PPG & Respiration on PhysioNet](https://physionet.org/content/bidmc/1.0.0/) |
| Skin Temperature | Temperature sensor | °C | 30–37°C | Nhiệt độ da | Bộ dữ liệu WESAD chứa nhiệt độ da được ghi lại liên tục từ cả thiết bị đeo ngực (RespiBAN) và thiết bị đeo cổ tay (Empatica E4). | [WESAD Dataset on Kaggle](https://www.kaggle.com/datasets/vasanth10/wesad-wearable-stress-and-affect-detection) |
| Step Count | Accelerometer | steps | 0+ | Số bước | Bộ dữ liệu Fitbit Fitness Tracker Data cung cấp số bước chân hàng ngày và hàng giờ của người dùng thiết bị đeo Fitbit. | [Fitbit Fitness Tracker Data on Kaggle](https://www.kaggle.com/datasets/arashnic/fitbit) |
| Sleep Stage | Sleep algorithm | categorical | REM/light/deep | Trạng thái ngủ | Bộ dữ liệu Fitbit Fitness Tracker Data chứa thông tin về các giai đoạn giấc ngủ (REM, light, deep, awake) được phân loại theo từng phút. | [Fitbit Fitness Tracker Data on Kaggle](https://www.kaggle.com/datasets/arashnic/fitbit) |
| Activity Label | Activity model | categorical | walking/running/etc | Context hoạt động | Bộ dữ liệu UCI HAR (Human Activity Recognition Using Smartphones) chứa nhãn hoạt động chi tiết (Walking, Walking Upstairs, Walking Downstairs, Sitting, Standing, Laying). | [UCI HAR Dataset on Kaggle](https://www.kaggle.com/datasets/uciml/human-activity-recognition-with-smartphones) |
| Barometric Pressure | Barometer | hPa | ~950–1050 | Thay đổi độ cao | Bộ dữ liệu FallAllD chứa dữ liệu cảm biến áp kế (Barometer) ghi nhận thay đổi áp suất không khí tại vùng thắt lưng, cổ và cổ tay trong các pha ngã. | [FallAllD Dataset on Kaggle](https://www.kaggle.com/datasets/danofer/fallalld) |
| Altitude | Barometer | m | variable | Độ cao | Bộ dữ liệu FallAllD sử dụng cảm biến áp kế để tính toán sự thay đổi độ cao tương đối (Altitude) khi người dùng di chuyển hoặc rơi tự do (ngã). | [FallAllD Dataset on Kaggle](https://www.kaggle.com/datasets/danofer/fallalld) |
| Device Motion State | IMU fusion | categorical | still/moving | Trạng thái thiết bị | Bộ dữ liệu MHEALTH chứa nhãn chuyển động và trạng thái thiết bị thu thập từ các cảm biến Shimmer2 đặt ở ngực, cổ tay và cổ chân. | [MHEALTH Dataset on Kaggle](https://www.kaggle.com/datasets/tawsifurrahman/mhealth-dataset) |

---

## 2. Engineered / Derived Features

Đây là các features được tính toán từ raw signals.

| Derived Feature | Ý nghĩa | Công thức / Độ đo | Phụ thuộc vào | Loại tăng cường |
|---|---|---|---|---|
| Acceleration Magnitude | Tổng lực chuyển động | a = sqrt(x²+y²+z²) | Acc X/Y/Z | Vector fusion |
| Jerk | Độ thay đổi gia tốc | Δa/Δt | Acc magnitude | Temporal derivative |
| Impact Peak | Va chạm mạnh | max(acc) | Accelerometer | Peak extraction |
| Signal Energy | Năng lượng movement | Σx² | Acc/Gyro | Energy feature |
| Orientation Change | Đổi tư thế | Δroll/pitch/yaw | Gyroscope | Pose estimation |
| Post-Fall Inactivity | Bất động sau té | movement variance | Accelerometer | Temporal aggregation |
| Step Variability | Bất thường bước chân | std(step interval) | Step timestamps | Statistical |
| Gait Symmetry | Mất cân bằng dáng đi | left/right periodicity | Acc/Gyro | Pattern analysis |
| Rolling Mean HR | Baseline tim | moving average | HR | Statistical smoothing |
| HR Deviation | Lệch baseline | HR-current − baseline | HR baseline | Personalized baseline |
| HR Z-score | Bất thường HR | z = (x-μ)/σ | HR mean/std | Statistical normalization |
| HR Recovery Rate | Hồi phục tim | BPM decrease/min | HR timeline | Temporal slope |
| Pulse Irregularity | Loạn nhịp | RR variance | RR intervals | Variability analysis |
| SDNN | Tổng HRV | std(RR intervals) | RR intervals | HRV metric |
| RMSSD | Parasympathetic activity | RMS successive diff | RR intervals | HRV metric |
| pNN50 | Recovery metric | % diff >50ms | RR intervals | HRV metric |
| LF/HF Ratio | Stress balance | LF/HF | RR frequency spectrum | Frequency-domain |
| Respiratory Variability | Bất ổn hô hấp | std(resp rate) | Respiration | Statistical |
| SpO2 Drop Rate | Giảm oxy nhanh | ΔSpO2/Δt | SpO2 timeline | Temporal derivative |
| Temperature Drift | Thay đổi nhiệt | Δtemp over time | Temperature | Temporal trend |
| Circadian HR Deviation | Lệch nhịp sinh học | HR vs time baseline | HR + timestamp | Contextual modeling |
| Sleep HR Suppression | HR giảm khi ngủ | sleep HR delta | HR + sleep state | Contextual |
| Stress Index | Stress tổng hợp | HR + HRV fusion | HR + RMSSD + LF/HF | Composite feature |
| Recovery Score | Mức phục hồi | HRV + sleep quality | HRV + sleep | Composite feature |
| Fatigue Score | Mệt mỏi | HRV suppression | RMSSD + activity | Composite feature |
| Fall Confidence | Xác suất té | weighted anomaly fusion | impact + posture + inactivity | Risk fusion |
| Collapse Probability | Nguy cơ collapse | physiological fusion | HR + SpO2 + motion | Multimodal fusion |
| Stroke Risk Score | Nguy cơ stroke | risk ensemble | HRV + perfusion + gait | Ensemble feature |
| Neurological Instability | Mất ổn định thần kinh | gait + tremor fusion | motion + HRV | Composite |
| Syncope Probability | Ngất | cardio-motion anomaly | HR + inactivity | Ensemble feature |
| Anomaly Score | Mức bất thường | model output | multiple features | ML/statistical |
| Reconstruction Error | Sai số tái tạo | error = ||x - x_hat||² | Autoencoder output | Deep anomaly |
| EWMA Trend | Trend realtime | S_t = αx_t + (1-α)S_(t-1) | time-series | Statistical smoothing |