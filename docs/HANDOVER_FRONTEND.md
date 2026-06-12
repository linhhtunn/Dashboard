# 🩺 AI Agent Clinical Assistant - Frontend Integration Guide

Tài liệu này hướng dẫn cách kết nối giao diện Frontend với backend AI Agent thông qua một Endpoint hợp nhất (Unified Chat Router) duy nhất `/api/agent/chat`. 

> [!NOTE]
> Các endpoint cũ như `/api/agent/summary` và `/api/agent/explain-alert` đã được loại bỏ hoàn toàn và gộp vào làm các intent tự động xử lý bên trong router của `/api/agent/chat`. 

---

## 🌐 1. Thông tin Endpoint

*   **API Path:** `/api/agent/chat`
*   **Method:** `POST`
*   **Content-Type:** `application/json`
*   **Base URL (Hugging Face Production):** `https://cuongnd03-health-app.hf.space`
*   **Base URL (Local):** `http://127.0.0.1:8005` (hoặc cấu hình theo biến môi trường `PORT` của docker container).


---

## 📥 2. Cấu trúc Request Body (`ChatRequest`)

Frontend gửi yêu cầu lên theo cấu trúc JSON sau:

```json
{
  "schema_version": "v1",
  "patient_id": "10003400",
  "conversation_id": "test-session-001",
  "doctor_id": "D1",
  "message": "Tóm tắt bệnh án của bệnh nhân này và cho tôi biết có cần dùng thuốc gì không?",
  "metadata": {}
}
```

### 📋 Chi tiết các trường:
*   `schema_version` *(bắt buộc, string)*: Phải luôn truyền là `"v1"`.
*   `patient_id` *(bắt buộc, string)*: Mã định danh bệnh nhân cần truy vấn (MIMIC Subject ID).
*   `conversation_id` *(tùy chọn, string)*: ID của phiên chat hiện tại để agent nhớ ngữ cảnh hội thoại.
*   `doctor_id` *(tùy chọn, string)*: ID của bác sĩ thực hiện chat (mặc định là `"D1"`).
*   `message` *(bắt buộc, string)*: Nội dung câu hỏi/yêu cầu lâm sàng từ bác sĩ.
*   `metadata` *(tùy chọn, object)*: Dữ liệu bổ trợ để điều hướng UI, ví dụ:
    *   Truyền `{"alert_id": "A001"}` khi bác sĩ click nút "Giải thích cảnh báo" trên một cảnh báo cụ thể.

---

## 📤 3. Cấu trúc Response Body (`AgentResponse` - Contract v1)

Backend sẽ luôn trả về một cấu trúc dữ liệu nhất quán để frontend dễ dàng phân tích và hiển thị thành các thành phần UI:

```json
{
  "schema_version": "v1",
  "response_type": "chat",
  "patient_id": "10003400",
  "source_id": "test-session-001",
  "generated_at": "2026-06-12T08:23:09.860896Z",
  "narrative_summary": "Nội dung phản hồi chính bằng Markdown...",
  "visualizations": {
    "has_chart": false,
    "chart_type": "time-series",
    "chart_title": "",
    "data_points": []
  },
  "comparisons": {
    "has_comparison": false,
    "comparison_type": "vitals-vs-activity",
    "headers": [],
    "rows": []
  }
}
```

### 🎨 Hướng dẫn Render Giao diện từ Response:

#### 1. Phần Văn bản chính (`narrative_summary`)
*   **Định dạng:** Markdown văn bản thô.
*   **Cách hiển thị:** Sử dụng một thư viện render Markdown (như `react-markdown` cho React, hoặc `marked` cho JS thuần) để hiển thị văn bản có định dạng tiêu đề, danh sách, chữ đậm/nghiêng.

#### 2. Phần Biểu đồ (`visualizations`)
*   Nếu `has_chart` là `true`:
    *   **Loại biểu đồ:** Dùng `chart_type` (thường là `"time-series"`) và `chart_title` làm tiêu đề cho biểu đồ.
    *   **Dữ liệu:** Vẽ biểu đồ đường (Line Chart) hoặc cột (Bar Chart) từ danh sách `data_points`. Mỗi điểm dữ liệu gồm:
        *   `timestamp` (thời gian điểm dữ liệu).
        *   `metric` (tên chỉ số ví dụ: `cha2ds2_vasc`, `crcl`, `serum_creatinine`).
        *   `value` (giá trị số).
        *   `unit` (đơn vị đo).
        *   `status` (`NORMAL`, `WARNING`, `ABNORMAL`, `CRITICAL` - dùng để tô màu điểm biểu đồ).
*   Nếu `has_chart` is `false`: Ẩn phần biểu đồ trên UI.

#### 3. Bảng so sánh / Đối chiếu (`comparisons`)
*   Nếu `has_comparison` là `true`:
    *   **Cách hiển thị:** Vẽ một bảng dữ liệu (Data Table) sử dụng danh sách cột trong `headers` và danh sách hàng trong `rows`.
    *   **Ví dụ:**
        *   `headers`: `["Tiêu chí", "Giá trị", "Trạng thái", "Bằng chứng"]`
        *   `rows`: `[["CHA2DS2-VASc", "6", "WARNING", "Nguy cơ huyết khối cao"], ...]`
*   Nếu `has_comparison` là `false`: Ẩn phần bảng trên UI.

---

## ⚡ 4. Các lệnh cURL test nhanh (Kèm payload thực tế)

Dưới đây là các câu lệnh cURL mẫu truy cập dữ liệu thực của 2 bệnh nhân có sẵn trên Supabase:

### 📑 Trường hợp 1: Yêu cầu tóm tắt bệnh án (Patient Summary)
*   **Mã bệnh nhân:** `10003400`
*   **Lệnh cURL:**
```bash
curl -X POST https://cuongnd03-health-app.hf.space/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "v1",
    "patient_id": "10003400",
    "conversation_id": "session-sum-10003400",
    "doctor_id": "D1",
    "message": "Tóm tắt bệnh án của bệnh nhân này."
  }'
```
*   **Response mẫu trả về:**
```json
{
  "schema_version": "v1",
  "response_type": "chat",
  "patient_id": "10003400",
  "source_id": "session-sum-10003400",
  "generated_at": "2026-06-12T08:23:09.860896Z",
  "narrative_summary": "### Tóm tắt bệnh án\n- **Bệnh nhân:** Nữ, 72 tuổi.\n- **Tiền sử bệnh lý:** Tăng huyết áp, rung nhĩ (AF) đã xác nhận, suy tim (HF).\n- **Chỉ số bổ sung có trong context:** cân nặng **97.52 kg**, creatinine huyết thanh **1.2**.\n- **Tình trạng hiện tại trong context:** `health_status = NORMAL`.\n...",
  "visualizations": {
    "has_chart": false,
    "chart_type": "time-series",
    "chart_title": "Không có dữ liệu sinh hiệu gần đây để vẽ biểu đồ",
    "data_points": []
  },
  "comparisons": {
    "has_comparison": false,
    "comparison_type": "vitals-vs-activity",
    "headers": ["Chi so","Gia tri","Trang thai","Bang chung"],
    "rows": []
  }
}
```

---

### 💊 Trường hợp 2: Đề xuất thuốc lâm sàng (Medication Recommendation & CDSS)
*   **Mã bệnh nhân:** `10014354` (Bệnh nhân có chẩn đoán Rung nhĩ & Suy tim)
*   **Lệnh cURL:**
```bash
curl -X POST https://cuongnd03-health-app.hf.space/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "v1",
    "patient_id": "10014354",
    "conversation_id": "session-med-10014354",
    "doctor_id": "D1",
    "message": "Đề xuất thuốc chống đông cho bệnh nhân này."
  }'
```
*   **Response mẫu trả về:**
```json
{
  "schema_version": "v1",
  "response_type": "chat",
  "patient_id": "10014354",
  "source_id": "session-med-10014354",
  "generated_at": "2026-06-12T08:23:38.666962Z",
  "narrative_summary": "- **Mục tiêu CDSS:** hỗ trợ bác sĩ cân nhắc **chống đông đường uống** cho bệnh nhân rung nhĩ đã xác nhận.\n- **Dữ liệu then chốt từ tool:**\n  - AF đã xác nhận: **true**\n  - CHA2DS2-VASc: **6**\n  - CrCl: **129.85 mL/phút**\n- **Khuyến nghị từ CDSS/ESC 2020 Section 10.1:** apixaban, rivaroxaban, dabigatran.\n- **Mức khuyến nghị:** Class **I**, Level **A**.\n...",
  "visualizations": {
    "has_chart": true,
    "chart_type": "time-series",
    "chart_title": "AF anticoagulation decision support snapshot",
    "data_points": [
      {
        "timestamp": "2026-06-12T00:00:00Z",
        "metric": "cha2ds2_vasc",
        "value": 6.0,
        "unit": "score",
        "status": "WARNING"
      },
      {
        "timestamp": "2026-06-12T00:00:00Z",
        "metric": "crcl",
        "value": 129.85,
        "unit": "mL/min",
        "status": "NORMAL"
      }
    ]
  },
  "comparisons": {
    "has_comparison": true,
    "comparison_type": "alert-evidence",
    "headers": [
      "Tiêu chí",
      "Giá trị",
      "Trạng thái",
      "Bằng chứng"
    ],
    "rows": [
      [
        "AF confirmed",
        "true",
        "NORMAL",
        "Tool output xác nhận rung nhĩ"
      ],
      [
        "CHA2DS2-VASc",
        "6",
        "WARNING",
        "Nguy cơ huyết khối cao; rule kích hoạt khuyến nghị OAC"
      ]
    ]
  }
}
```

---

## 🧪 5. Bệnh nhân có sẵn để thử nghiệm (MIMIC Subject ID)
Frontend có thể dùng các ID sau để kiểm tra dữ liệu thật của các bệnh nhân đã được đồng bộ trên Supabase:
`10014354, 10040025, 10012853, 10015931, 10010471, 10007818, 10020306, 10003400, 10015272, 10004457`
