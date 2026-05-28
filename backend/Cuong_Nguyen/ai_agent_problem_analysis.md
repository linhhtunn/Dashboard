# BẢN PHÂN TÍCH VÀ THIẾT KẾ AI AGENT & CLINICAL ASSISTANT
*(Dành riêng cho vị trí AI Agent Engineer - Cường - Team 5)*

Tài liệu này tập trung phân tích bài toán, xác định các điểm nghẽn và thiết kế kiến trúc xử lý cho **AI Agent (Chatbot/Assistant)** để hỗ trợ bác sĩ. Đồng thời, tài liệu đề xuất giải pháp để Agent sinh dữ liệu có cấu trúc (Structured Output) giúp Frontend hiển thị bảng so sánh hoặc vẽ đồ thị biến thiên thời gian của sinh hiệu.

---

## 1. Xác định pain point qua 4 lăng kính (Dưới góc nhìn AI Agent)
*   **Lặp lại (Repetitive):**
    *   *Nội dung:* Bác sĩ phải mở từng file siêu âm, CT, đơn thuốc cũ để so khớp kích thước hạch/tổn thương hoặc đối chiếu liều dùng cũ - mới.
    *   *Giải pháp Agent:* Agent tự động thực hiện **Semantic Text Analysis** trên các kết luận văn bản phi cấu trúc, trích xuất thực thể (kích thước, vị trí, liều lượng) và trả về cấu trúc JSON so sánh để Frontend tự động vẽ bảng đối chiếu.
*   **Tốn thời gian (Time-consuming):**
    *   *Nội dung:* Rà soát lịch sử sinh hiệu và xét nghiệm cũ kéo dài để phát hiện xu hướng bất thường khi có cảnh báo mới.
    *   *Giải pháp Agent:* Thay vì bắt bác sĩ đọc qua hàng trăm dòng nhật ký thô, Agent (thông qua API `/summary`) sẽ lọc nhanh các điểm dữ liệu bất thường và trả về chuỗi dữ liệu chuỗi thời gian (time-series points) để vẽ đồ thị xu hướng.
*   **AI có thể làm tốt hơn (AI can do better):**
    *   *Nội dung:* Tổng hợp sự thay đổi tinh tế trong các ghi chép lâm sàng viết tay hoặc kết luận mô tả siêu âm; kết hợp phác đồ chuẩn y khoa để giải thích cặn kẽ nguyên nhân của cảnh báo (`/explain-alert`).
    *   *Giải pháp Agent:* LLM/Agent đọc hiểu ngữ cảnh lâm sàng sâu sắc từ database, kết hợp RAG y học để giải thích nguyên nhân cảnh báo (ví dụ: *"Nhịp tim bệnh nhân tăng vọt lên 135 bpm đồng thời SpO2 giảm xuống 91% trong khoảng thời gian từ 14:30 đến 14:35, phù hợp với dấu hiệu suy hô hấp cấp"*).
*   **Phàn nàn (Complaints):**
    *   *Nội dung:* Quá tải thông tin, dễ bỏ sót dữ liệu xét nghiệm quan trọng nếu không được cảnh báo/tập trung hóa.
    *   *Giải pháp Agent:* Chatbot Agent hoạt động như một **Bộ lọc ngữ cảnh thông minh (Contextual Filter)**. Bác sĩ có thể hỏi đáp tự nhiên để trích xuất nhanh thông tin quan trọng nhất mà không cần lục lọi cơ sở dữ liệu thô.

---

## 2. Áp dụng mô hình Kim cương kép (Double Diamond) cho AI Agent
### Kim cương 1: Tìm đúng vấn đề (Find the Right Problem)
*   **Discover (Mở rộng):** Khảo sát các giới hạn công nghệ của LLM trong bài toán y tế:
    *   LLM thông thường nếu không có RAG sẽ bị ảo tưởng thông tin phác đồ điều trị.
    *   LLM không thể đọc trực tiếp cơ sở dữ liệu lớn dạng time-series một cách hiệu quả do giới hạn token.
    *   Bác sĩ không muốn đọc một đoạn văn tóm tắt dài dòng của Chatbot; họ cần số liệu trực quan, biểu đồ xu hướng và bảng so sánh trực tiếp.
*   **Define (Thu hẹp):** Xác định điểm nghẽn kỹ thuật chính của Agent:
    *   *Why 1:* Bác sĩ khó nắm bắt xu hướng sức khỏe từ câu trả lời văn bản của Chatbot.
    *   *Why 2:* Vì văn bản thuần túy không biểu diễn trực quan được sự biến thiên của hàng trăm điểm dữ liệu sinh hiệu.
    *   *Why 3:* Vì Agent chưa được thiết kế để sinh đầu ra có cấu trúc (Structured Output).
    *   *Why 4:* Vì hệ thống chưa định nghĩa chuẩn JSON đầu ra để tích hợp giữa Agent API với thư viện vẽ đồ thị ở Frontend (như Chart.js, Recharts).
    *   **Bài toán cốt lõi của Agent:** Thiết kế một **Agent sinh đầu ra hỗn hợp (Hybrid Output)**: vừa trả về nội dung giải thích bằng Markdown, vừa sinh cấu trúc dữ liệu JSON chuẩn để Frontend vẽ đồ thị thời gian và bảng so sánh các lần khám.

### Kim cương 2: Tìm giải pháp (Find the Right Solution)
*   **Discover (Mở rộng):** Nghiên cứu kiến trúc Agent:
    *   *Giải pháp 2.1:* Thiết lập System Prompt và sử dụng tính năng **Structured Outputs (JSON Mode / Pydantic)** của LLM để ép Agent trả về đúng schema mong muốn.
    *   *Giải pháp 2.2:* Thiết kế RAG kết hợp VectorDB (ChromaDB) lưu phác đồ sơ cứu để đảm bảo Agent tư vấn chuẩn xác.
    *   *Giải pháp 2.3:* Định nghĩa định dạng dữ liệu so sánh hình ảnh học (ví dụ: siêu âm cũ vs mới) và dữ liệu chuỗi thời gian để vẽ biểu đồ.
*   **Define (Thu hẹp):** Thiết kế cấu trúc phản hồi chi tiết của Agent:
    *   Agent API (`/summary` và `/explain-alert`) sẽ trả về JSON theo cấu trúc mẫu sau để Frontend trực quan hóa:

```json
{
  "patient_id": "P12345",
  "narrative_summary": "Tóm tắt bệnh án bằng Markdown...",
  "visualizations": {
    "has_chart": true,
    "chart_type": "time-series",
    "chart_title": "Biến thiên nhịp tim trong khoảng thời gian xảy ra cảnh báo",
    "data_points": [
      {"timestamp": "2026-05-28T14:30:00Z", "heart_rate": 80, "status": "NORMAL"},
      {"timestamp": "2026-05-28T14:31:00Z", "heart_rate": 110, "status": "WARNING"},
      {"timestamp": "2026-05-28T14:32:00Z", "heart_rate": 135, "status": "CRITICAL"},
      {"timestamp": "2026-05-28T14:33:00Z", "heart_rate": 120, "status": "ABNORMAL"},
      {"timestamp": "2026-05-28T14:34:00Z", "heart_rate": 85, "status": "NORMAL"}
    ]
  },
  "comparisons": {
    "has_comparison": true,
    "comparison_type": "ultrasound-lesions",
    "headers": ["Chỉ tiêu", "Siêu âm cũ (28/04)", "Siêu âm mới (28/05)", "Thay đổi"],
    "rows": [
      ["Hạch nách trái", "Kích thước 5x8mm", "Kích thước 8x12mm", "Tăng kích thước (+3x4mm)"],
      ["Hạch nhóm II", "Không phát hiện", "Kích thước 4mm", "Xuất hiện hạch mới"]
    ]
  }
}
```

---

## 3. Đặt 5 câu hỏi then chốt (Dành riêng cho AI Agent)
1.  **Pain point xảy ra với tần suất bao nhiêu lần?**
    *   *Trả lời:* Xảy ra liên tục mỗi khi bác sĩ mở bệnh án hoặc có cảnh báo y tế mới được kích hoạt. Agent cần xử lý hàng trăm truy vấn thời gian thực mỗi ngày với độ trễ (Latency) dưới 3 giây.
2.  **Quy trình (workflow) của Agent là gì?**
    *   *Trả lời:* Bác sĩ click nút tóm tắt/giải thích cảnh báo hoặc chat tự nhiên -> Frontend gọi Agent API -> Agent truy vấn PostgreSQL lấy lịch sử sinh hiệu và cảnh báo -> Agent gọi LLM sinh phân tích dạng Markdown + JSON -> Frontend hiển thị biểu đồ và bảng so sánh từ JSON đó.
3.  **Chi phí/Thời gian hao phí nếu không có Agent?**
    *   *Trả lời:* Bác sĩ mất 5-10 phút để tự truy vấn cơ sở dữ liệu, đọc lại các văn bản PDF cũ và đối chiếu thủ công. Mục tiêu của Agent là rút ngắn thời gian này xuống còn dưới 3 giây.
4.  **Nếu AI làm sai thì điểm nào cần con người duyệt (human in the loop)?**
    *   *Trả lời:* Bác sĩ xem và xác nhận thông tin tóm tắt/giải thích của Agent trước khi lưu vào hồ sơ khám. Bác sĩ có nút feedback (Thích/Không thích) để thu thập log dữ liệu giúp cải tiến prompt và RAG của Agent.
5.  **Chỉ số đo lường (metric) nào quyết định sự thành công của Agent?**
    *   *Trả lời:*
        *   Tỷ lệ sinh cấu trúc JSON hợp lệ để vẽ đồ thị/bảng so sánh đạt 100%.
        *   Độ chính xác của câu trả lời y tế (không bị ảo tưởng thông tin) đạt $\ge 95\%$.
        *   Thời gian phản hồi của API (Latency) dưới 3 giây.

---

## 4. Khung 6 ô (Problem Statement) cho AI Agent
| Yếu tố | Định nghĩa chi tiết cho AI Agent |
| :--- | :--- |
| **Actor** | <ul><li>**Cường (AI Agent Engineer):** Người thiết kế kiến trúc Agent, RAG và API.</li><li>**Bác sĩ điều trị:** Người tương tác trực tiếp với Chatbot/Giao diện để đọc báo cáo phân tích của Agent.</li></ul> |
| **Workflow** | <ol><li>Bác sĩ gửi truy vấn qua Chatbot hoặc nhấn nút `/summary` hoặc `/explain-alert`.</li><li>Agent API kết nối Database để lấy dữ liệu sinh hiệu (bảng `clean_vitals`/`vital_features`) và bằng chứng cảnh báo (bảng `health_alerts`).</li><li>Agent truy xuất VectorDB (ChromaDB) để lấy phác đồ sơ cứu chuẩn (RAG).</li><li>LLM xử lý dữ liệu và trả về cấu trúc JSON (gồm text Markdown giải thích + mảng dữ liệu so sánh/vẽ đồ thị).</li><li>Frontend nhận JSON và vẽ đồ thị thời gian thực hoặc bảng so sánh.</li></ol> |
| **Bottle neck** | <ul><li>LLM dễ bị ảo tưởng (hallucination) khi đưa ra lời khuyên y tế.</li><li>LLM gặp khó khăn khi đọc hiểu và phân tích xu hướng của một lượng lớn dữ liệu số thô nếu không được lọc và cấu trúc trước khi đưa vào context.</li><li>Văn bản thuần túy của Chatbot không đủ trực quan cho bác sĩ trong môi trường lâm sàng bận rộn.</li></ul> |
| **Impact** | Nếu Agent phản hồi chậm hoặc đưa ra thông tin sai lệch, bác sĩ sẽ mất lòng tin, ngừng sử dụng hệ thống và quay lại quy trình tra cứu thủ công gây lãng phí thời gian và tăng áp lực công việc. |
| **Success metric** | <ul><li>Độ trễ phản hồi API của Agent dưới 3 giây.</li><li>Độ chính xác thông tin y tế (được kiểm chứng qua Ground Truth) $\ge 95\%$.</li><li>100% phản hồi của Agent chứa cấu trúc JSON hợp lệ khi có yêu cầu vẽ đồ thị/so sánh.</li></ul> |
| **Boundary** | <ul><li>**Agent được phép:** Đọc dữ liệu lịch sử bệnh án; Đề xuất cấu trúc dữ liệu vẽ đồ thị; So sánh văn bản chẩn đoán cũ-mới; Trích xuất phác đồ sơ cứu từ RAG để tư vấn tham khảo.</li><li>**Bác sĩ bắt buộc phải duyệt:** Quyết định chẩn đoán lâm sàng cuối cùng; Quyết định đơn thuốc và liều lượng. AI Agent tuyệt đối không tự chẩn đoán xác định hay tự ý kê đơn thuốc.</li></ul> |
