# TÀI LIỆU KHẢO SÁT & THIẾT KẾ DỰ ÁN THỰC TẬP
 
## ĐỀ TÀI: E2E SIMULATION FOR AI HEALTH (Hệ thống mô phỏng và phân tích dữ liệu sức khỏe toàn diện)
 
### 1. Bối cảnh & Bài toán mục tiêu (Pain Point)
 
- **Thực trạng:** Dự án định hướng phát triển các giải pháp AI/AIoT trong lĩnh vực Y tế (Healthcare) nhưng hiện tại **chưa có thiết bị phần cứng wearable** (thiết bị đeo thông minh) để thu thập dữ liệu thực tế.
- **Giải pháp:** Xây dựng một **Hệ thống giả lập dữ liệu (Simulator)** hoạt động giống như thiết bị thật, có khả năng phát sinh dữ liệu sinh trắc học theo các kịch bản bệnh lý (ngã, tụt huyết áp, tiểu đường...). Dữ liệu này sẽ là dòng chảy cốt lõi (Data Pipeline) để nuôi sống các thuật toán AI phân tích, tìm điểm bất thường và hiển thị lên Dashboard phía người dùng cuối (Bác sĩ/Người nhà).
 
---
 
### 2. Sơ đồ phân rã Modules & Nhiệm vụ các Nhóm (Quest Assignment)
 
Dự án được chia thành **5 Quest** tương ứng với **5 Team** để tạo thành một chuỗi cung ứng dữ liệu khép kín (End-to-End Pipeline):
 
```
[Team 1: Simulator] ---> (RabbitMQ) ---> [Team 2: Algorithm & Pipeline]
                                                    │
                                                    ▼
[Team 4: FE & Dashboard] <--- [Team 5: AI Agent] <--- [Team 3: Anomaly Detection]
 
```
 
#### **TEAM 1: DATA SIMULATOR (Quest 1 - Sản xuất dữ liệu)**
 
- **Nhiệm vụ:** Thiết kế mô-đun giả lập phần cứng. Phát sinh dữ liệu sinh trắc học (Nhịp tim, huyết áp, lượng đường trong máu, gia tốc chuyển động...) theo thời gian thực (Real-time).
- **Yêu cầu:** Giả lập được các kịch bản bệnh lý cụ thể: Ngã đột ngột, hạ đường huyết, tăng/giảm huyết áp cấp tính.
 
#### **TEAM 2: ALGORITHM & INGESTION (Quest 2 - Verify & Consumer)**
 
- **Nhiệm vụ:** Đóng vai trò là Consumer tiếp nhận dòng dữ liệu từ Team 1 qua Message Broker. Thực hiện verify, tiền xử lý (preprocessing), chuẩn hóa dữ liệu cấu trúc/phi cấu trúc trước khi lưu trữ hoặc chuyển tiếp.
 
#### **TEAM 3: ANOMALY DETECTION (Quest 3 - Phân tích & Tìm điểm bất thường)**
 
- **Nhiệm vụ:** Ứng dụng các thuật toán Machine Learning/Deep Learning để phát hiện sớm các dấu hiệu bất thường từ dòng dữ liệu của Team 2 (ví dụ: phát hiện cú ngã - Fall Detection, phát hiện nhịp tim bất thường).
 
#### **TEAM 4: DATA VISUALIZATION & PORTAL (Quest 4 - Present & Dashboard)**
 
- **Nhiệm vụ:** Xây dựng giao diện Dashboard chuyên nghiệp dành cho Bác sĩ và Người theo dõi sức khỏe.
- **Tính năng:** Biểu diễn đồ thị nhịp tim/huyết áp real-time, bộ lọc (filter) danh sách bệnh nhân, quản lý Hồ sơ sức khỏe (Health Profile), hệ thống cảnh báo (Alert) khi Team 3 phát hiện bất thường.
 
#### **TEAM 5: INTELLIGENT AI AGENT (Quest 5 - Trợ lý ảo thông minh)**
 
- **Nhiệm vụ:** Tích hợp AI Agent (sử dụng LLM + RAG) vào Portal của Team 4.
- **Tính năng:** Đóng vai trò trợ lý y tế thông minh, trả lời câu hỏi _"Bệnh nhân X hiện tại có khỏe không?"_, tự động tóm tắt tình trạng sức khỏe dựa trên log dữ liệu và đưa ra gợi ý xử lý sơ bộ.
 
---
 
### 3. Công nghệ chủ đạo (Tech Stack)
 
- **Frontend (Team 4):** Next.js, React-Chart (hoặc Chart.js/Recharts để vẽ biểu đồ real-time).
- **Backend & AI (Team 1, 2, 3, 5):** Python (FastAPI/Flask), Pandas, NumPy, Scikit-learn, các framework triển khai LLM (LangChain/LlamaIndex).
- **Message Broker:** RabbitMQ (Đảm bảo truyền tải dữ liệu real-time giữa Simulator và Hệ thống phân tích).
- **Storage:** Các giải pháp lưu trữ tối ưu chi phí (Free Tier Cloud DB hoặc Local Docker DB như PostgreSQL/TimescaleDB cho dữ liệu chuỗi thời gian).
 
---
 
### 4. Sắp xếp nhân sự dựa trên năng lực (Resource Allocation)
 
Dựa trên Profile của các bạn thực tập sinh hiện có, dưới đây là đề xuất phân bổ vị trí tối ưu:
 
| Thành viên              | Nền tảng cốt lõi                                    | Vị trí đề xuất              | Vai trò & Lý do xếp cụ thể |
| ----------------------- | --------------------------------------------------- | --------------------------- | -------------------------- |
| **Nguyễn Thi Thu Hiền** | AIoT, Computer Vision, Fall Detection, Smart System | **Team 1 (Simulator)** <br> |
 
<br>hoặc **Team 3 (Anomaly)** | Phụ trách thuật toán phát hiện ngã (Fall Detection) hoặc trực tiếp thiết kế kịch bản dữ liệu giả lập cho Smart System/Healthcare đúng định hướng của bạn. |
| **Nguyễn Anh Hào** | Backend, Federated Learning, Deploy Edge (Jetson), Anomaly Detection | **Team 2 (Consumer/Pipeline)** <br>
 
<br>& **Team 3 (Anomaly)** | Gánh vác phần **Backend Pipeline/API** nhờ kinh nghiệm làm BE của bạn, đồng thời phụ trách tối ưu thuật toán **Anomaly Detection** để deploy mượt mà. |
| **Nguyễn Trọng Thiên Khôi** | Systems thinking, LLM Application, RAG, Agent Workflows | **Team 5 (AI Agent)** | Phù hợp nhất cho vai trò **Lead/Core kiến trúc Team 5**, xây dựng AI Agent, RAG và xử lý reasoning kết hợp với tư duy hệ thống (system thinking) sẵn có. |
 
---
 
### 5. Kế hoạch triển khai sơ bộ (Next Steps)
 
1. **Giai đoạn 1 (Tuần 1):** Định nghĩa cấu trúc dữ liệu chuẩn (Data Schema) giữa Team 1 và Team 2. Thiết lập kết nối RabbitMQ.
2. **Giai đoạn 2 (Tuần 2-3):**
 
- Team 1 + 2 hoàn thiện luồng luân chuyển dữ liệu thô.
- Team 3 bắt đầu nhận data để train/test mô hình anomaly.
- Team 4 lên layout UI/UX cho Dashboard.
 
3. **Giai đoạn 3 (Tuần 4):** Team 5 cấu hình Agent; tiến hành integration test toàn hệ thống (E2E) và chuẩn bị demo.