# 🩺 AI Agent Clinical Assistant - Frontend Integration Guide

Tài liệu này hướng dẫn cách kết nối giao diện Frontend với backend AI Agent thông qua một Endpoint hợp nhất (Unified Chat Router) duy nhất `/api/agent/chat`. 

> [!NOTE]
> Các endpoint cũ như `/api/agent/summary` và `/api/agent/explain-alert` đã được loại bỏ hoàn toàn và gộp vào làm các intent tự động xử lý bên trong router của `/api/agent/chat`. 

---

## 🌐 1. Thông tin Endpoint

*   **API Path:** `/api/agent/chat`
*   **Method:** `POST`
*   **Content-Type:** `application/json`
*   **Base URL (Hugging Face Production):** `https://cuongnd03-health-app-1.hf.space`
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

## Langfuse Tracing

No frontend contract changes are required. The backend can optionally trace:

- selected chat intent,
- central tool execution from `ToolRegistry`,
- LLM generation calls.

Tracing is controlled by backend environment variables only. With `LANGFUSE_CAPTURE_CONTENT=false`, raw prompt/answer content is not sent to Langfuse.

### 📋 Chi tiết các trường:
*   `schema_version` *(bắt buộc, string)*: Phải luôn truyền là `"v1"`.
*   `patient_id` *(tùy chọn, string)*: Mã định danh bệnh nhân cần truy vấn (MIMIC Subject ID). Bắt buộc cho câu hỏi gắn với một bệnh nhân cụ thể; có thể bỏ qua cho câu hỏi doctor-scoped như tổng quan danh sách bệnh nhân hoặc tìm bệnh nhân.
*   `conversation_id` *(tùy chọn, string)*: ID của phiên chat hiện tại để agent nhớ ngữ cảnh hội thoại.
*   `doctor_id` *(tùy chọn, string)*: ID của bác sĩ thực hiện chat (mặc định là `"D1"`).
*   `message` *(bắt buộc, string)*: Nội dung câu hỏi/yêu cầu lâm sàng từ bác sĩ.
*   `metadata` *(tùy chọn, object)*: Dữ liệu bổ trợ để điều hướng UI, ví dụ:
    *   Truyền `{"alert_id": "A001"}` khi bác sĩ click nút "Giải thích cảnh báo" trên một cảnh báo cụ thể.

### Request doctor-scoped không có `patient_id`

```json
{
  "schema_version": "v1",
  "conversation_id": "doctor-d1-overview-001",
  "doctor_id": "D1",
  "message": "Hôm nay có những bệnh nhân nào nguy hiểm cần theo dõi?",
  "metadata": {}
}
```

```json
{
  "schema_version": "v1",
  "conversation_id": "doctor-d1-lookup-001",
  "doctor_id": "D1",
  "message": "Tìm bệnh nhân Nguyễn Văn A",
  "metadata": {}
}
```

---

## ⚡ 3. Các lệnh cURL test nhanh (Kèm payload thực tế)

Dưới đây là các câu lệnh cURL mẫu truy cập dữ liệu thực của 2 bệnh nhân có sẵn trên Supabase:

### 📑 Trường hợp 1: Yêu cầu tóm tắt bệnh án (Patient Summary)
*   **Mã bệnh nhân:** `10003400`
*   **Lệnh cURL:**
```bash
curl -X POST https://cuongnd03-health-app-1.hf.space/api/agent/chat \
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
curl -X POST https://cuongnd03-health-app-1.hf.space/api/agent/chat \
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

### 🔍 Trường hợp 3: Tìm kiếm/Điều hướng bệnh nhân (Patient Lookup & Navigation)
*   **Mục tiêu:** Bác sĩ yêu cầu tìm kiếm bệnh nhân theo tên (ví dụ: "Nguyễn Văn A"). Vì không có `patient_id` cụ thể lúc đầu, request gửi đi ở chế độ doctor-scoped (không truyền `patient_id`).
*   **Lệnh cURL:**
```bash
curl -X POST https://cuongnd03-health-app-1.hf.space/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "v1",
    "conversation_id": "session-lookup-abc",
    "doctor_id": "D1",
    "message": "Tìm bệnh nhân Nguyễn Văn A"
  }'
```
*   **Response mẫu trả về (khi tìm thấy nhiều kết quả trùng tên):**
```json
{
  "schema_version": "v1",
  "response_type": "chat",
  "patient_id": null,
  "source_id": "session-lookup-abc",
  "generated_at": "2026-06-12T08:24:15.123456Z",
  "narrative_summary": "Tìm thấy 2 bệnh nhân có tên Nguyễn Văn A trong hệ thống. Vui lòng chọn một bệnh nhân dưới đây để bắt đầu phiên làm việc.",
  "visualizations": {
    "has_chart": false,
    "chart_type": "time-series",
    "chart_title": "Không có dữ liệu sinh hiệu gần đây để vẽ biểu đồ",
    "data_points": []
  },
  "comparisons": {
    "has_comparison": false,
    "comparison_type": "vitals-vs-activity",
    "headers": ["Chi so", "Gia tri", "Trang thai", "Bang chung"],
    "rows": []
  },
  "actions": [
    {
      "type": "select_patient_for_chat",
      "label": "Mo benh nhan nay",
      "patient_id": "10003400",
      "hospital_patient_code": "P001",
      "display_name": "Nguyễn Văn A"
    },
    {
      "type": "select_patient_for_chat",
      "label": "Mo benh nhan nay",
      "patient_id": "10014354",
      "hospital_patient_code": "P002",
      "display_name": "Nguyễn Văn A"
    }
  ]
}
```
*   **Cách Frontend xử lý:** Render danh sách các bệnh nhân tìm được dưới dạng các nút bấm hoặc thẻ (Card) từ mảng `actions`. Khi người dùng click nút tương ứng, Frontend kích hoạt tải hồ sơ bệnh nhân đó bằng cách gọi lại API chat kèm theo `patient_id` đã chọn (ví dụ: `10003400`).

---

## ⚡ 4. Hướng dẫn Tích hợp Server-Sent Events (SSE) Streaming

Backend hỗ trợ endpoint streaming `/api/agent/chat/stream` dùng Server-Sent Events (SSE) để tối ưu hóa trải nghiệm người dùng (real-time typing effect) khi hiển thị câu trả lời dạng văn bản dài.

*   **API Path:** `/api/agent/chat/stream`
*   **Method:** `POST`
*   **Headers:**
    *   `Content-Type: application/json`
    *   `Accept: text/event-stream`

### Các loại Sự kiện (Event Types) trong Stream:
Endpoint sẽ trả về stream dữ liệu phân tách theo định dạng SSE chuẩn (`event: <tên_sự_kiện>\ndata: <nội_dung>\n\n`):

1.  **`event: status`**: Báo cáo trạng thái xử lý hiện tại của AI Agent (dùng để hiển thị trạng thái đang suy nghĩ/chạy tool).
    *   *Nội dung data:* Tên trạng thái (`loading_context`, `classifying_intent`, `running_tool:medication_recommendation`, `generating`).
2.  **`event: token`**: Các mảnh/từ của phần tóm tắt văn bản (`narrative_summary`) được sinh ra trong thời gian thực.
    *   *Nội dung data:* Chuỗi ký tự (token) mới sinh ra. Frontend ghép dần vào chuỗi text chính để tạo hiệu ứng gõ chữ.
3.  **`event: result`**: Chứa toàn bộ object `AgentResponse` đã được kiểm tra tính hợp lệ và sửa lỗi cấu trúc tự động (Contract v1).
    *   *Nội dung data:* Chuỗi JSON của object `AgentResponse` đầy đủ (bao gồm `narrative_summary`, `visualizations`, và `comparisons`).
    *   *Sử dụng:* Khi nhận được sự kiện này, frontend cập nhật/vẽ biểu đồ (`visualizations`) và bảng (`comparisons`) tương ứng.

### Lệnh cURL Test SSE Streaming:
> [!IMPORTANT]
> Lưu ý phải thêm cờ `-N` (hoặc `--no-buffer`) trong lệnh `curl` để tắt bộ nhớ đệm và hiển thị kết quả stream ngay lập tức. Ngoài ra, hãy gọi bằng giao thức HTTP thuần `http://` khi test local, tránh HTTPS `https://` nếu không có cấu hình SSL.

```bash
curl -N -X POST http://127.0.0.1:8005/api/agent/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "schema_version": "v1",
    "patient_id": "10003400",
    "conversation_id": "test-stream-session",
    "doctor_id": "D1",
    "message": "Tóm tắt bệnh án của bệnh nhân này."
  }'
```

### Hướng dẫn Code Javascript tiêu chuẩn để tiêu thụ Stream:
```javascript
const response = await fetch("http://127.0.0.1:8005/api/agent/chat/stream", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    schema_version: "v1",
    patient_id: "10003400",
    conversation_id: "test-stream-session",
    doctor_id: "D1",
    message: "Tóm tắt bệnh án của bệnh nhân này."
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  buffer += decoder.decode(value, { stream: true });
  const blocks = buffer.split("\n\n");
  buffer = blocks.pop(); // Giữ lại khối dang dở ở cuối cùng
  
  for (const block of blocks) {
    if (!block.trim()) continue;
    
    // Tách các dòng trong khối để phân tích event và data độc lập
    const lines = block.split("\n");
    let eventType = "";
    let eventData = "";
    
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        eventType = line.substring(7).trim();
      } else if (line.startsWith("event:")) {
        eventType = line.substring(6).trim();
      } else if (line.startsWith("data: ")) {
        eventData = line.substring(6); // Giữ nguyên khoảng trắng của token
      } else if (line.startsWith("data:")) {
        eventData = line.substring(5);
      }
    }
    
    if (eventType === "status") {
      console.log("Trạng thái AI:", eventData);
      // Hiển thị trạng thái đang suy nghĩ tương ứng trên UI
    } else if (eventType === "token") {
      // Nhận token sinh ra và append trực tiếp vào UI để tạo hiệu ứng gõ chữ
      process.stdout.write(eventData); 
    } else if (eventType === "result") {
      // Khi nhận được sự kiện này, vẽ biểu đồ và bảng dựa trên visualizations và comparisons
      const fullResponse = JSON.parse(eventData.trim());
      console.log("Full response with charts/tables:", fullResponse);
    } else if (eventType === "error") {
      console.error("Lỗi từ AI Agent:", eventData);
    }
  }
}
```
