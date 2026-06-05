Đúng. Mình viết lại theo hướng **Team 1 Simulator Architecture** hoàn chỉnh hơn, kết hợp các ý gần nhất: không cố merge dataset, dataset chỉ làm reference; simulator có nhiều layer; dữ liệu bình thường cũng phải có variance; sau đó tạo sẵn file rồi replay lên RabbitMQ/CloudAMQP.

# **Kiến trúc simulate data cho Team 1**

Team 1 nên xây simulator theo các layer sau:

Layer 0 — Reference & Rule Definition  
Layer 1 — Patient Profile Generator  
Layer 2 — Activity / Context Timeline Generator  
Layer 3 — Normal Signal Generator  
Layer 4 — Abnormal Scenario Injector  
Layer 5 — Fault / Data Quality Injector  
Layer 6 — Export & Replay to RabbitMQ/CloudAMQP

Nói ngắn gọn:

Dataset / bác sĩ / paper  
        ↓  
Tạo hồ sơ bệnh nhân  
        ↓  
Tạo timeline hoạt động theo thời gian  
        ↓  
Sinh signal bình thường có variance  
        ↓  
Inject abnormal scenarios  
        ↓  
Inject fault data nếu cần  
        ↓  
Xuất JSONL/CSV \+ replay vào broker

---

# **Layer 0 — Reference & Rule Definition**

## **Layer này làm gì?**

Layer này không sinh data trực tiếp. Nó là nơi Team 1 tổng hợp kiến thức để định nghĩa **range, rule, constraint** cho simulator.

Vì các public dataset quá rời rạc, phức tạp, khó merge, nên Team 1 không nên dùng dataset như input chính. Dataset chỉ nên dùng để tham khảo.

Ví dụ:

PAMAP2 / PPG-DaLiA / MMASH  
→ tham khảo HR/activity, accelerometer khi ngồi/đi/chạy/ngủ

SisFall / KFall  
→ tham khảo fall pattern, acc/gyro spike

CGM/glucose dataset  
→ tham khảo glucose trend, hypo không phải tụt random

VitalDB / PTT-PPG  
→ tham khảo BP/HR/SpO2 range và trend

## **Output của Layer 0**

Team 1 nên có mấy file cấu hình hoặc Google Sheet:

signal\_ranges.yaml / signal\_ranges.csv  
activity\_rules.yaml  
scenario\_rules.yaml  
patient\_profile\_rules.yaml

Ví dụ `signal_ranges.yaml`:

heart\_rate:  
  unit: bpm  
  normal\_resting:  
    young\_adult: \[55, 85\]  
    elderly: \[65, 95\]  
  walking\_delta:  
    mean: 25  
    std: 8  
  vigorous\_delta:  
    mean: 60  
    std: 15

spo2:  
  unit: percent  
  normal\_range: \[95, 100\]  
  low\_warning: \[90, 94\]  
  critical: "\<90"

blood\_pressure:  
  unit: mmHg  
  normal\_systolic: \[90, 120\]  
  hypertension\_warning: \[140, 159\]  
  hypertension\_critical: "\>=180"

## **Phương pháp dùng ở layer này**

Dataset review  
\+ doctor input  
\+ guideline/paper reference  
\+ manual rule definition

Layer này trả lời câu hỏi:

Các signal nên nằm trong khoảng nào và thay đổi thế nào để không bị phi lý?

---

# **Layer 1 — Patient Profile Generator**

## **Layer này làm gì?**

Layer này tạo ra **synthetic patients** với các thông tin trong gg sheet về độ tuổi và giới tính ứng vs các signal. Với MVP chỉ cần khoảng **10 bệnh nhân giả lập** là đủ.

Mỗi patient không chỉ là `patient_id`, mà phải có baseline và risk group. Vì cùng một trạng thái `walking`, người trẻ khỏe và người già phản ứng rất khác nhau.

Ví dụ:

P001 — young healthy male  
P002 — young healthy female  
P003 — office worker, low activity  
P004 — elderly male  
P005 — elderly female  
P006 — hypertension risk  
P007 — diabetes risk  
P008 — low SpO2 risk  
P009 — fall risk elderly  
P010 — mixed risk elderly

## **Patient profile cần có gì?**

patient\_id: P001  
age: 24  
sex: male  
risk\_group:  
  \- healthy\_active  
activity\_level: high

baseline:  
  heart\_rate: 66  
  hrv: 75  
  systolic\_bp: 116  
  diastolic\_bp: 74  
  blood\_glucose: 5.2  
  spo2: 98

Ví dụ người già nguy cơ té ngã:

patient\_id: P009  
age: 76  
sex: female  
risk\_group:  
  \- elderly  
  \- fall\_risk  
  \- hypertension\_risk  
activity\_level: low

baseline:  
  heart\_rate: 78  
  hrv: 38  
  systolic\_bp: 138  
  diastolic\_bp: 84  
  blood\_glucose: 6.1  
  spo2: 96

## **Phương pháp nên dùng**

Layer này hợp với:

Monte Carlo \+ clinical constraints

Không cần tự viết tay tất cả. Có thể sample:

age\_group \~ categorical  
sex \~ categorical  
risk\_group \~ categorical  
baseline\_hr \~ Normal(mean, std)  
baseline\_bp \~ Normal(mean, std)  
baseline\_spo2 \~ Normal(mean, std)

Nhưng phải có constraint:

SpO2 bình thường không nên random xuống 80  
HR người bình thường không nên nhảy 40 → 160 khi đang sitting  
BP không nên mỗi giây nhảy lung tung

## **Output**

patient\_profiles.json  
hoặc  
patient\_profiles.yaml

Layer này trả lời câu hỏi:

Đây là ai, baseline của người này là gì, và người này thuộc nhóm nguy cơ nào?

---

# **Layer 2 — Activity / Context Timeline Generator**

## **Layer này làm gì?**

Layer này tạo lịch hoạt động theo thời gian. Nó chưa sinh signal như HR/BP/SpO2 ngay. Nó chỉ trả lời:

Tại thời điểm này bệnh nhân đang làm gì?

Các trạng thái MVP:

sleeping  
sitting  
standing  
walking  
vigorous\_activity  
resting

Có thể thêm sau:

post\_meal  
working  
stress\_context  
recovery

## **Vì sao cần layer này?**

Vì signal y tế phụ thuộc mạnh vào context.

Ví dụ:

HR \= 110 khi đang vigorous\_activity  
→ có thể bình thường

HR \= 110 khi đang sleeping  
→ đáng nghi hơn

Nếu không có activity/context thì Team 3 dễ tạo false alert.

## **Cách tạo timeline**

Có 2 cách.

### **Cách đơn giản cho MVP: schedule theo block thời gian**

Ví dụ 1 ngày hoặc 2 giờ demo:

timeline:  
  \- start: "00:00"  
    end: "06:30"  
    activity\_state: sleeping

  \- start: "06:30"  
    end: "07:00"  
    activity\_state: sitting

  \- start: "07:00"  
    end: "07:20"  
    activity\_state: walking

  \- start: "09:00"  
    end: "12:00"  
    activity\_state: sitting

  \- start: "18:00"  
    end: "18:30"  
    activity\_state: vigorous\_activity

  \- start: "23:00"  
    end: "24:00"  
    activity\_state: sleeping

Với demo ngắn 10 phút:

timeline:  
  \- start\_second: 0  
    end\_second: 120  
    activity\_state: sitting

  \- start\_second: 120  
    end\_second: 240  
    activity\_state: walking

  \- start\_second: 240  
    end\_second: 360  
    activity\_state: resting

  \- start\_second: 360  
    end\_second: 480  
    activity\_state: vigorous\_activity

  \- start\_second: 480  
    end\_second: 600  
    activity\_state: sitting

### **Cách tốt hơn: State machine / Markov**

Thay vì random từng giây, dùng transition hợp lý:

sleeping → sitting → standing → walking → sitting → resting → sleeping

Ví dụ transition:

Nếu đang sitting:  
\- 80% tiếp tục sitting  
\- 10% chuyển standing  
\- 10% chuyển walking

Nếu đang walking:  
\- 70% tiếp tục walking  
\- 20% chuyển sitting  
\- 10% chuyển vigorous\_activity

Không nên random kiểu:

sleeping → running → sleeping → walking → vigorous → sitting

vì rất giả.

## **Thêm variance trong activity layer**

Cùng là `walking`, không phải lúc nào cũng giống nhau. Nên thêm intensity:

activity\_state: walking  
intensity: light

Hoặc:

walking\_light  
walking\_normal  
walking\_fast

Ví dụ:

| Activity | Duration variance | Intensity variance |
| ----- | ----- | ----- |
| sleeping | 6–9h | light movement / deep sleep |
| sitting | 10–180min | relaxed / working / stressed |
| standing | 1–30min | still / small movement |
| walking | 2–60min | slow / normal / fast |
| vigorous\_activity | 5–60min | medium / high |

Ví dụ output layer 2:

{  
  "patient\_id": "P001",  
  "timestamp": "2026-05-29T09:15:00Z",  
  "activity\_state": "walking",  
  "activity\_intensity": "normal",  
  "context": {  
    "post\_meal": false,  
    "sleep\_state": "awake"  
  }  
}

Layer này trả lời câu hỏi:

Tại thời điểm này bệnh nhân đang ở trạng thái gì, trạng thái đó kéo dài bao lâu, và intensity ra sao?

---

# **Layer 3 — Normal Signal Generator**

## **Layer này làm gì?**

Layer này nhận:

patient profile  
\+  
activity/context timeline

rồi sinh signal bình thường:

"signals": {  
  "heart\_rate": 82,  
  "hrv": 45,  
  "systolic\_bp": 116,  
  "diastolic\_bp": 76,  
  "spo2": 98,  
  "acc\_x": 0.03,  
  "acc\_y": 0.02,  
  "acc\_z": 1.01,  
  "gyro\_x": 0.02,  
  "gyro\_y": 0.01,  
  "gyro\_z": 0.03  
}

## **Công thức tổng quát**

Không nên sinh random độc lập từng giây.

Sai:

heart\_rate \= random.randint(60, 130\)

Đúng hơn:

signal(t)  
\=  
patient\_baseline  
\+  
activity\_effect(t)  
\+  
context\_effect(t)  
\+  
smooth\_variance(t)  
\+  
sensor\_noise(t)

Ví dụ HR:

HR(t)  
\=  
baseline\_hr  
\+  
activity\_delta  
\+  
short\_term\_noise  
\+  
trend\_memory

## **Activity ảnh hưởng thế nào?**

Ví dụ rule cho HR:

| Activity | HR delta so với baseline | Variance |
| ----- | ----- | ----- |
| sleeping | \-10 đến \-20 bpm | thấp |
| sitting | \-5 đến \+8 bpm | thấp |
| standing | \+5 đến \+15 bpm | vừa |
| walking | \+15 đến \+40 bpm | vừa/cao |
| vigorous\_activity | \+50 đến \+100 bpm | cao |

Ví dụ với P001 baseline HR \= 68:

sleeping → 50–60  
sitting → 64–76  
walking → 88–110  
vigorous → 130–170

Với P009 baseline HR \= 78, elderly low fitness:

sleeping → 60–70  
sitting → 75–88  
walking → 105–125  
vigorous → có thể rất cao hoặc không tạo vigorous cho patient này

## **Variance trong normal data**

Đây là ý bạn nói rất đúng: **data bình thường cũng phải có variance**.

Có 3 loại variance.

### **1\. Physiological variance**

Cơ thể người luôn dao động tự nhiên.

Ví dụ đang sitting:

HR: 72, 73, 75, 74, 76, 73  
SpO2: 98, 98, 97, 98, 99  
BP: 118/76, 119/77, 117/75

### **2\. Context variance**

Cùng là walking nhưng intensity khác nhau:

walking\_light → HR \+15  
walking\_normal → HR \+25  
walking\_fast → HR \+35

### **3\. Person variance**

Cùng activity nhưng mỗi người phản ứng khác nhau:

young healthy walking → HR 90–105  
elderly low activity walking → HR 105–125

## **Temporal correlation**

Quan trọng: variance không được nhảy lung tung.

Sai:

70, 95, 68, 110, 72

Đúng:

70, 72, 73, 75, 76, 78

Có thể dùng:

random walk  
AR(1)  
moving average noise  
Ornstein-Uhlenbeck process

Với MVP, chỉ cần làm đơn giản:

current\_hr \= previous\_hr \+ 0.2 \* (target\_hr \- previous\_hr) \+ noise

Nghĩa là signal tiến dần về target, không nhảy ngay.

Ví dụ:

sitting HR target \= 72  
walking HR target \= 100

Khi chuyển sitting → walking:  
72, 76, 81, 86, 91, 95, 98, 100

Cái này làm data thật hơn rất nhiều.

## **Ví dụ rule cho từng signal**

### **Heart rate**

baseline\_hr \+ activity\_delta \+ smooth\_noise

### **HRV**

HRV thường giảm khi activity/stress tăng.

sleeping → HRV cao hơn  
vigorous\_activity → HRV thấp hơn  
stress/activity → HRV giảm

Ví dụ:

HRV \= baseline\_hrv \- activity\_stress\_effect \+ noise

### **Blood pressure**

BP không nên dao động mạnh từng giây. Nên thay đổi chậm hơn HR.

sitting/resting → gần baseline  
walking/exercise → systolic tăng nhẹ/vừa  
sleeping → giảm nhẹ

### **SpO2**

SpO2 bình thường khá ổn định.

normal → 96–99  
sleeping → có thể thấp hơn nhẹ  
vigorous → thường vẫn ổn nếu healthy

Không nên random SpO2 90–100 liên tục nếu không có scenario.

### **Accelerometer / Gyroscope**

Phụ thuộc mạnh vào activity.

sleeping/sitting → acc gần gravity, gyro thấp  
walking → acc/gyro dao động tuần hoàn  
vigorous → biên độ lớn  
fall → xử lý ở Layer 4

Với MVP, không cần mô phỏng vật lý quá phức tạp. Có thể dùng:

acc\_z quanh 1g khi đứng/ngồi  
acc\_x/y dao động nhỏ khi sitting  
walking có sinusoidal pattern \+ noise  
vigorous có amplitude lớn hơn

Ví dụ walking:

acc\_x \= 0.3 \* sin(2πft) \+ noise  
acc\_y \= 0.2 \* sin(2πft \+ phase) \+ noise  
acc\_z \= 1.0 \+ 0.15 \* sin(2πft) \+ noise

Layer này trả lời câu hỏi:

Với patient này và activity này, signal bình thường nên biến thiên như thế nào theo thời gian?

---

# **Layer 4 — Abnormal Scenario Injector**

## **Layer này làm gì?**

Layer này lấy normal signal từ Layer 3 rồi **chèn abnormal event** vào một khoảng thời gian.

MVP nên có:

fall  
hypoglycemia  
hypertension / hypotension  
low\_spo2 nếu kịp  
abnormal\_heart\_rate nếu kịp

Mỗi scenario có phase:

baseline → onset → peak → recovery

Layer này cũng tạo ground truth cho Team 3\.

## **Scenario 1: Fall**

### **Input context**

Fall thường nên xảy ra khi:

walking  
standing  
vigorous\_activity

Không nên inject fall khi patient đang sleeping trừ khi muốn mô phỏng fall from bed riêng.

### **Pattern**

baseline:  
walking normal

onset:  
movement đổi nhanh

peak:  
acc\_magnitude spike lớn  
gyro thay đổi mạnh

post\_fall:  
movement thấp hoặc bất thường

recovery:  
có thể đứng dậy hoặc vẫn low movement

### **Signal effect**

acc\_x/y/z: spike  
gyro\_x/y/z: spike  
heart\_rate: tăng nhẹ sau event  
activity\_state: post\_fall / lying / low\_movement

Ví dụ:

acc\_magnitude trước fall: 1.0–1.8g  
peak fall: 3–6g  
post-fall: acc variance thấp

### **Monte Carlo dùng ở đâu?**

Sample:

fall\_severity: low / medium / high  
fall\_duration: 2–8s  
post\_fall\_duration: 10–60s  
acc\_peak: theo severity  
hr\_increase\_after\_fall: 5–25 bpm

### **Ground truth**

{  
  "scenario\_id": "SCN\_FALL\_001",  
  "patient\_id": "P009",  
  "event\_type": "fall",  
  "ground\_truth\_label": "ABNORMAL",  
  "event\_start": "2026-05-29T10:05:00Z",  
  "event\_end": "2026-05-29T10:05:08Z",  
  "expected\_severity": "HIGH",  
  "expected\_pattern": {  
    "acc\_spike": true,  
    "gyro\_spike": true,  
    "post\_event\_low\_movement": true  
  }  
}

---

## **Scenario 2: Atrial Fibrillation**



### **Monte Carlo dùng ở đâu?**

onset\_time  
drop\_rate  
minimum\_glucose  
duration\_below\_threshold  
recovery\_rate  
severity

### **Ground truth**

{  
  "scenario\_id": "SCN\_HYPO\_001",  
  "patient\_id": "P007",  
  "event\_type": "Atrial Fibrillation",  
  "ground\_truth\_label": "ABNORMAL",  
  "event\_start": "2026-05-29T11:00:00Z",  
  "event\_end": "2026-05-29T11:30:00Z",  
  "expected\_severity": "MEDIUM",  
  "expected\_pattern": {  
    "below\_warning\_threshold": true,  
    "recovery\_phase": true  
  }  
}

---

## **Scenario 3: Blood Pressure Abnormality**

### **Pattern**

BP abnormal không nên chỉ là một điểm cao/thấp. Nên có duration hoặc trend.

baseline:  
BP gần baseline

onset:  
BP tăng/giảm dần

peak:  
BP nằm ngoài range

recovery:  
trở lại gần baseline

### **Signal effect**

systolic\_bp tăng/giảm chậm  
diastolic\_bp tăng/giảm tương ứng  
heart\_rate có thể thay đổi nhẹ

Ví dụ hypertension:

128/80 → 135/84 → 145/90 → 155/94 → 162/96 → 150/90 → 138/84

### **Monte Carlo dùng ở đâu?**

systolic\_peak  
diastolic\_peak  
duration\_above\_threshold  
trend\_slope  
severity

---

## **Scenario 4: Low SpO2**

### **Pattern**

SpO2 thấp nên có duration, không nên một điểm đơn lẻ.

baseline:  
97–99

onset:  
96 → 94 → 92

peak:  
88–91

recovery:  
92 → 95 → 97

### **Signal effect**

spo2 giảm dần  
heart\_rate có thể tăng nhẹ  
activity có thể là sleeping/resting

---

Layer này trả lời câu hỏi:

Abnormal event xảy ra khi nào, ảnh hưởng signal nào, kéo dài bao lâu, và ground truth là gì?

---

# **Layer 5 — Fault / Data Quality Injector**

## **Layer này làm gì?**

Layer này tạo lỗi kỹ thuật để Team 2 test validation.

Quan trọng:

FAULT ≠ ABNORMAL

* `FAULT` là lỗi dữ liệu/sensor/pipeline.  
* `ABNORMAL` là bất thường sức khỏe.

## **Các fault nên có**

missing timestamp  
missing patient\_id  
heart\_rate \= \-20  
spo2 \= 140  
blood\_glucose \= null  
duplicate message\_id  
out-of-order timestamp  
delayed message  
wrong unit

## **Monte Carlo dùng ở đâu?**

Sample xác suất lỗi:

fault\_probability:  
  missing\_value: 0.01  
  outlier: 0.005  
  duplicate: 0.002  
  out\_of\_order\_timestamp: 0.002

Ví dụ:

99% message bình thường  
1% message có lỗi nhỏ

Layer này giúp Team 2 test:

VALID  
FAULT  
MISSING\_VALUE  
SENSOR\_FAULT  
OUT\_OF\_RANGE  
DUPLICATE

---

# **Layer 6 — Export & Replay to RabbitMQ/CloudAMQP**

## **Layer này làm gì?**

Sau khi generate xong, Team 1 không nhất thiết chạy simulator realtime trực tiếp. Cách tốt hơn cho MVP:

generate trước → lưu file → replay dần vào broker

## **Output files**

patient\_profiles.json  
generated\_vitals.jsonl  
ground\_truth.json  
scenario\_schedule.json

Ví dụ `generated_vitals.jsonl`:

{"message\_id":"msg\_000001","patient\_id":"P001","timestamp":"2026-05-29T10:00:00Z","signals":{"heart\_rate":72,"hrv":68,"systolic\_bp":118,"diastolic\_bp":76,"spo2":98,"acc\_x":0.02,"acc\_y":0.01,"acc\_z":1.01,"gyro\_x":0.01,"gyro\_y":0.02,"gyro\_z":0.01},"context":{"activity\_state":"sitting","scenario\_id":"SCN\_NORMAL\_001","event\_phase":"baseline","source":"simulator"}}  
{"message\_id":"msg\_000002","patient\_id":"P001","timestamp":"2026-05-29T10:00:01Z","signals":{"heart\_rate":73,"hrv":67,"systolic\_bp":118,"diastolic\_bp":76,"spo2":98,"acc\_x":0.03,"acc\_y":0.02,"acc\_z":1.00,"gyro\_x":0.01,"gyro\_y":0.02,"gyro\_z":0.01},"context":{"activity\_state":"sitting","scenario\_id":"SCN\_NORMAL\_001","event\_phase":"baseline","source":"simulator"}}

Replay:

generated\_vitals.jsonl  
→ replay\_to\_broker.py  
→ CloudAMQP/RabbitMQ  
→ Team 2

Có thể chạy:

python replay\_to\_broker.py \--input generated\_vitals.jsonl \--env cloud \--speed 1x  
python replay\_to\_broker.py \--input generated\_vitals.jsonl \--env cloud \--speed 5x

Layer này trả lời câu hỏi:

Làm sao biến dữ liệu đã generate thành stream realtime cho Team 2/3?

---

# **Message nên chứa gì?**

Vì bạn muốn tách user/context để giống thực tế hơn, nên thiết kế như sau:

## **Database chứa thông tin nền**

patients table:  
\- patient\_id  
\- age  
\- sex  
\- risk\_group  
\- baseline\_hr  
\- baseline\_hrv  
\- baseline\_bp  
\- baseline\_glucose  
\- baseline\_spo2

scenario\_ground\_truth table:  
\- scenario\_id  
\- patient\_id  
\- event\_type  
\- event\_start  
\- event\_end  
\- ground\_truth\_label  
\- expected\_severity

## **RabbitMQ chỉ bắn realtime stream**

Message nên chứa:

patient\_id  
timestamp  
device\_id  
signals  
context nhỏ:  
  activity\_state  
  scenario\_id  
  event\_phase

Không cần nhét age/sex/baseline vào mỗi message.

Ví dụ:

{  
  "message\_id": "msg\_000001",  
  "schema\_version": "v1",  
  "patient\_id": "P001",  
  "device\_id": "SIM\_WATCH\_001",  
  "timestamp": "2026-05-29T10:00:00Z",  
  "signals": {  
    "heart\_rate": 82,  
    "hrv": 45,  
    "systolic\_bp": 116,  
    "diastolic\_bp": 76,  
    "spo2": 98,  
    "acc\_x": 0.03,  
    "acc\_y": 0.01,  
    "acc\_z": 1.02,  
    "gyro\_x": 0.02,  
    "gyro\_y": 0.01,  
    "gyro\_z": 0.01  
  
  }  
}
ground truth
  "context": {  
    "activity\_state": "walking",  
    "activity\_intensity": "normal",  
    "scenario\_id": "SCN\_NORMAL\_001",  
    "event\_phase": "baseline",  
    "source": "simulator"  }
---

# **Phương pháp áp vào từng layer**

| Layer | Làm gì | Phương pháp phù hợp |
| ----- | ----- | ----- |
| Layer 0 | Lấy rule/range/pattern từ dataset, bác sĩ, paper | Dataset review, domain rules |
| Layer 1 | Tạo synthetic patient profiles | Monte Carlo \+ constraints |
| Layer 2 | Tạo timeline activity/context | State machine, Markov, schedule blocks |
| Layer 3 | Sinh signal bình thường có variance | Rule-based physiology \+ temporal noise \+ Monte Carlo |
| Layer 4 | Inject abnormal scenarios | Scenario engine \+ state machine \+ Monte Carlo |
| Layer 5 | Inject fault data | Probability-based fault injection |
| Layer 6 | Xuất file và replay | JSONL/CSV replay \+ RabbitMQ producer |

---

# **Câu mô tả chuẩn cho tài liệu**

Bạn có thể đưa nguyên đoạn này vào tài liệu:

\#\# Team 1 Simulation Architecture

Team 1 will build the simulator as a layered synthetic data generation pipeline rather than directly merging multiple public datasets. Public datasets and clinical references are used only to define plausible ranges, distributions, activity effects, and abnormal patterns.

The simulator contains six main layers:

1\. \*\*Reference & Rule Definition\*\*: collect signal ranges, activity effects, and abnormal scenario rules from papers, datasets, and doctor feedback.  
2\. \*\*Patient Profile Generator\*\*: create around 10 synthetic patients for the MVP with age, sex, risk group, baseline HR, HRV, BP, glucose, SpO2, and activity level.  
3\. \*\*Activity / Context Timeline Generator\*\*: generate a time-based activity timeline such as sleeping, sitting, standing, walking, vigorous activity, and resting. Each activity has duration and intensity variance.  
4\. \*\*Normal Signal Generator\*\*: generate normal physiological signals from patient baseline plus activity effect, context effect, temporal variance, and sensor noise.  
5\. \*\*Abnormal Scenario Injector\*\*: inject abnormal events such as fall, hypoglycemia, hypertension/hypotension, low SpO2, or abnormal heart rate using baseline–onset–peak–recovery phases.  
6\. \*\*Fault Injector & Replay\*\*: optionally inject data-quality faults for Team 2 validation, export data as JSONL/CSV, and replay the generated stream to RabbitMQ/CloudAMQP.

This approach allows the system to generate realistic enough synthetic data with clear ground-truth metadata, while avoiding the complexity of merging heterogeneous public datasets.

# **Chốt ngắn**

Kiến trúc hợp lý nhất của Team 1 là:

Dataset/paper/doctor \= reference  
Patient profile \= ai đang được mô phỏng  
Activity timeline \= người đó đang làm gì theo thời gian  
Normal signal generator \= chỉ số bình thường có variance  
Abnormal injector \= chèn tình huống bất thường  
Fault injector \= tạo lỗi kỹ thuật cho Team 2  
Replay \= bắn dữ liệu vào CloudAMQP như realtime

Và điểm quan trọng nhất bạn vừa nêu:

**Normal data cũng phải có variance và temporal correlation. Nếu không, data sẽ quá sạch, quá giả, và Team 3 detect quá dễ.**

