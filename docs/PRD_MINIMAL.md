<!-- generated-by: gsd-doc-writer -->
> **Production pilot amendment:** the authoritative production scope is one hospital with
> `coordinator`, `doctor`, and `admin`; no floor-nurse login, family portal, multi-hospital
> tenancy, or legal-EMR claim. Admin has no PHI by default. Critical noise requires assigned
> doctor review. HIS/EMR remains canonical; CareSignal owns operational workflow/audit and
> necessary vitals. Go-live targets are 99.9% availability, RPO ≤5m, RTO ≤30m, critical UI
> delivery p95 <2s, ack ≤60s and assignment ≤5m. Rollout is shadow then controlled, never
> big-bang. External legal, hospital and clinical sign-off remain mandatory.

# PRD tối giản — CareSignal AI MVP

## 1. Tóm tắt sản phẩm

CareSignal AI là hệ thống hỗ trợ đội ngũ bệnh viện theo dõi bệnh nhân, xử lý cảnh báo sinh hiệu và phối hợp công việc giữa điều phối viên với bác sĩ. AI đóng vai trò trợ lý tổng hợp dữ liệu và hỗ trợ tham khảo lâm sàng; quyết định cuối cùng luôn thuộc về nhân viên y tế.

## 2. Vấn đề cần giải quyết

- Cảnh báo bệnh nhân nằm rải rác, khó ưu tiên theo mức độ nghiêm trọng.
- Việc bàn giao từ điều phối viên sang bác sĩ thiếu trạng thái và người chịu trách nhiệm rõ ràng.
- Bác sĩ mất thời gian ghép hồ sơ, sinh hiệu, cảnh báo và lịch sử xử lý trước khi ra quyết định.
- Hoạt động đã xử lý trong ngày chưa được tổng hợp thành báo cáo ngắn, có thể kiểm tra lại.

## 3. Mục tiêu MVP

1. Cho phép người dùng đăng nhập và chỉ truy cập chức năng đúng vai trò.
2. Hiển thị bệnh nhân, sinh hiệu và cảnh báo theo một luồng thống nhất.
3. Theo dõi cảnh báo từ lúc mở đến khi được bác sĩ xác nhận.
4. Ghi nhận người xử lý, thông tin can thiệp và bác sĩ được phân công.
5. Cho bác sĩ sử dụng AI để đọc nhanh ngữ cảnh bệnh nhân và cảnh báo.
6. Tạo báo cáo hoạt động trong ngày của từng bác sĩ.

## 4. Người dùng mục tiêu

| Persona | Nhu cầu chính | Quyền chính trong MVP |
|---|---|---|
| Điều phối viên | Theo dõi cảnh báo, ghi nhận xử lý ban đầu và phân công bác sĩ | Xem dữ liệu lâm sàng, ghi treatment/noise/follow-up, chọn bác sĩ |
| Bác sĩ | Đánh giá bệnh nhân được giao, tham khảo AI và xác nhận kết luận | Xem dữ liệu lâm sàng, xác nhận alert được giao, xem báo cáo ngày |
| Quản trị viên | Quản lý tài khoản và vai trò | Quản lý user/role, truy cập chức năng quản trị |
| Điều dưỡng tầng | Thực hiện can thiệp do điều phối viên ghi nhận | Là đối tượng được chọn trong treatment; chưa phải persona đăng nhập độc lập của MVP |

## 5. Luồng nghiệp vụ chính

### Luồng A — Theo dõi bệnh nhân

1. Người dùng mở dashboard hoặc danh sách bệnh nhân.
2. Hệ thống hiển thị tình trạng, sinh hiệu gần nhất và số cảnh báo chưa đóng.
3. Người dùng mở hồ sơ bệnh nhân để xem chuỗi sinh hiệu, cảnh báo và ngữ cảnh liên quan.

### Luồng B — Điều phối cảnh báo

1. Cảnh báo mới có trạng thái `open`.
2. Điều phối viên kiểm tra bằng chứng và chọn một trong các hướng:
   - ghi nhận điều dưỡng đã xử lý;
   - đánh dấu cần theo dõi thêm;
   - đánh dấu nhiễu;
   - phân công bác sĩ tiếp nhận.
3. Hệ thống lưu người thực hiện, thời gian và nội dung xử lý.

### Luồng C — Bác sĩ xác nhận

1. Bác sĩ chỉ thấy hoặc xử lý cảnh báo được phân công cho mình.
2. Bác sĩ xem hồ sơ, sinh hiệu, lịch sử xử lý và có thể hỏi AI.
3. Bác sĩ nhập triệu chứng, ghi chú lâm sàng và kết luận.
4. Hệ thống chuyển cảnh báo sang `doctor_confirmed` và tạo encounter hoàn tất.

### Luồng D — Báo cáo ngày

1. Bác sĩ mở báo cáo ngày.
2. Hệ thống tổng hợp số bệnh nhân đã xem, số encounter, số ca nghiêm trọng và số xác nhận còn chờ.
3. Bác sĩ xem danh sách hoạt động đã hoàn thành trong ngày.

## 6. Yêu cầu chức năng MVP

| ID | Yêu cầu | Tiêu chí chấp nhận tối thiểu |
|---|---|---|
| FR-01 | Đăng nhập và phân quyền | User chỉ mở được page/API phù hợp với role `coordinator`, `doctor` hoặc `admin` |
| FR-02 | Danh sách bệnh nhân | Hiển thị danh tính, trạng thái, sinh hiệu gần nhất và số alert đang mở |
| FR-03 | Chi tiết bệnh nhân | Hiển thị hồ sơ, chuỗi sinh hiệu và alert theo bệnh nhân |
| FR-04 | Quản lý cảnh báo | Cho phép lọc/xem alert, bằng chứng và lịch sử thao tác |
| FR-05 | Xử lý của điều phối viên | Ghi nhận treatment, follow-up hoặc noise kèm actor và thời gian |
| FR-06 | Phân công bác sĩ | Coordinator chọn được một user có role doctor cho alert |
| FR-07 | Xác nhận của bác sĩ | Chỉ bác sĩ được assign mới confirm; bắt buộc có thông tin encounter |
| FR-08 | Trợ lý AI | Trả lời theo ngữ cảnh patient/alert, có cảnh báo an toàn và không thay thế quyết định bác sĩ |
| FR-09 | Báo cáo ngày | Doctor xem được thống kê và hoạt động hoàn tất của chính mình trong ngày |
| FR-10 | Audit cơ bản | Mỗi hành động alert lưu actor, loại hành động, payload và thời gian |

## 7. Quy tắc nghiệp vụ

- Alert có một trong các trạng thái: `open`, `nurse_treated`, `needs_follow_up`, `noise`, `doctor_confirmed`.
- Chỉ coordinator được ghi treatment, follow-up hoặc noise.
- Khi dùng Supabase auth, treatment/noise phải gắn alert với một bác sĩ.
- Chỉ bác sĩ được phân công mới được confirm alert.
- Doctor confirmation phải có thời điểm bắt đầu, triệu chứng, clinical notes và kết luận.
- Encounter hoàn tất thuộc về đúng bác sĩ xác nhận và được dùng cho báo cáo ngày.
- AI chỉ cung cấp clinical decision support; không tự tạo chẩn đoán hay đơn thuốc cuối cùng.
- Dữ liệu và nội dung lâm sàng không được đưa vào telemetry nếu chưa có phê duyệt bảo mật.

## 8. Chỉ số thành công ban đầu

| Chỉ số | Cách đo đề xuất |
|---|---|
| Alert có owner | Tỷ lệ alert cần theo dõi đã được assign bác sĩ |
| Thời gian phản hồi | Thời gian từ `open` đến hành động đầu tiên |
| Thời gian đóng alert | Thời gian từ `open` đến `doctor_confirmed` hoặc `noise` |
| Hoàn thiện hồ sơ | Tỷ lệ doctor confirmation có đủ encounter fields |
| Mức dùng AI | Số phiên AI có gắn patient/alert context |
| Tính ổn định | Tỷ lệ request clinical/AI thành công, không lỗi 5xx |

MVP chưa đặt ngưỡng KPI tuyệt đối; cần thu baseline trong giai đoạn pilot trước khi chốt SLA.

## 9. Ngoài phạm vi MVP

- AI tự chẩn đoán, kê đơn hoặc thay bác sĩ ra quyết định.
- Điều khiển trực tiếp thiết bị y tế hoặc simulator từ dashboard.
- Hồ sơ bệnh án điện tử đầy đủ như một HIS/EMR.
- Billing, bảo hiểm, lịch hẹn và quản lý giường hoàn chỉnh.
- Ứng dụng mobile native và notification đa kênh production-grade.
- Phân tích ML/anomaly model lifecycle đầy đủ trong repository này.

## 10. Phụ thuộc và rủi ro

- Cần Supabase Auth, role/profile và migration encounter để chạy luồng phân công thật.
- Chất lượng dashboard phụ thuộc độ đầy đủ của patient, alert và vitals data từ các team nguồn.
- TimescaleDB và Supabase có nhiều bảng tương thích; mapping sai ID/timestamp có thể làm sai ngữ cảnh.
- Demo mode không đại diện đầy đủ cho phân quyền và quy trình production.
- AI backend yêu cầu bearer token và có thể phụ thuộc OpenAI; cần fallback rõ ràng khi dịch vụ ngoài lỗi.
- Dữ liệu y tế nhạy cảm; logging, tracing và quyền truy cập phải theo nguyên tắc tối thiểu cần thiết.

## 11. Điều kiện hoàn thành MVP

- Ba persona đăng nhập và bị giới hạn đúng quyền.
- Coordinator xử lý và assign được alert cho doctor.
- Doctor xem đúng alert được giao, confirm và tạo encounter.
- Báo cáo ngày phản ánh encounter của đúng bác sĩ.
- Patient/vitals/alert APIs trả dữ liệu nhất quán cho UI.
- AI chat hoạt động với patient context hoặc fallback an toàn khi thiếu dữ liệu/dịch vụ.
- Các luồng chính có kiểm thử chấp nhận trên dữ liệu demo và một môi trường Supabase tích hợp.
