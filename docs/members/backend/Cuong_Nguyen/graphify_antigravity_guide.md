# Hướng dẫn Cài đặt & Sử dụng `graphify` trên Google Antigravity (Không dùng API ngoài)

Dự án `graphify` là một công cụ biến codebase, tài liệu, hình ảnh, video thành một đồ thị tri thức (Knowledge Graph). Trên Google Antigravity, bạn hoàn toàn có thể chạy `graphify` mà không cần các API ngoài (như OpenAI, Gemini, Claude) bằng cách tận dụng sức mạnh xử lý của chính Antigravity hoặc mô hình LLM chạy cục bộ (như **Ollama**).

---

## 1. Cài đặt trên Antigravity

Dự án này đã được cài đặt sẵn cấu hình `graphify` cho Antigravity tại thư mục `.agents/` của workspace:
* **Skill**: `.agents/skills/graphify/SKILL.md` (chứa toàn bộ logic trích xuất cấu trúc và ngữ nghĩa)
* **Workflow**: `.agents/workflows/graphify.md`

Nếu bạn muốn cài đặt mới hoặc cài đặt trên một dự án khác:
1. Đảm bảo đã cài `uv` hoặc `pipx`:
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```
2. Cài đặt công cụ `graphifyy` (tên trên PyPI là `graphifyy` với hai chữ `y`):
   ```bash
   uv tool install graphifyy
   ```
3. Đăng ký skill với Antigravity:
   ```bash
   graphify antigravity install --project
   ```

---

## 2. Cách chạy Graphify Không dùng API (Offline & Local)

Khi chạy trích xuất dữ liệu mà không có `GEMINI_API_KEY` hay `GOOGLE_API_KEY`, bạn có 3 giải pháp chính sau:

### Cách A: Tận dụng Ollama với mô hình chạy cục bộ (Khuyên dùng)
Hệ thống của bạn hiện đang chạy **Ollama** cục bộ với mô hình `qwen2.5:7b` ở cổng `11434`. Chúng ta có thể cấu hình `graphify` sử dụng chính mô hình này:

1. **Cài đặt thư viện hỗ trợ Ollama (OpenAI client) vào môi trường cô lập của graphify**:
   ```bash
   uv tool install "graphifyy[ollama]" --force
   ```
   *(Lưu ý: Chấp nhận khi Antigravity yêu cầu phê duyệt lệnh chạy này).*

2. **Chạy trích xuất đồ thị bằng mô hình cục bộ**:
   ```bash
   graphify extract . --backend ollama --model qwen2.5:7b --max-concurrency 1
   ```
   > [!IMPORTANT]
   > Hãy đặt `--max-concurrency 1` khi dùng LLM cục bộ (Ollama) để tránh quá tải RAM/CPU.

---

### Cách B: Chế độ AST-Only (Chỉ trích xuất cấu trúc mã nguồn)
Nếu bạn chỉ thay đổi mã nguồn (các file `.py`, `.ts`, v.v.) và không thay đổi tài liệu (`.md`, `.txt`), bạn có thể chạy cập nhật đồ thị hoàn toàn miễn phí và tức thì mà không cần LLM:
```bash
graphify update .
```
Lệnh này chạy bộ phân tích cú pháp tĩnh (AST Parser) cục bộ để cập nhật các hàm, class, mối quan hệ import/call mà không cần gọi LLM.

---

### Cách C: Sử dụng chính phiên thảo luận Antigravity làm LLM trích xuất ngữ nghĩa (Agent-as-LLM)
Khi không có API Key, skill `graphify` quy định rằng **chính phiên thảo luận hiện tại của Antigravity** đóng vai trò là LLM để xử lý ngữ nghĩa:
1. Antigravity sẽ quét danh sách các tài liệu (`.md`, `.txt`, v.v.) qua tệp tin `.graphify_uncached.txt`.
2. Antigravity sẽ tự động đọc nội dung của các file này theo từng cụm (20-25 files) và thực hiện trích xuất các Thực thể (Entities) & Mối quan hệ (Relationships) dựa trên prompt đặc tả trong `references/extraction-spec.md`.
3. Sau khi thu thập đủ dữ liệu JSON từ việc tự trích xuất, Antigravity sẽ ghép nối với phần mã nguồn (AST) để tạo ra đồ thị hoàn chỉnh.

---

## 3. Cách Truy vấn & Điều hướng Đồ thị sau khi tạo

Khi đồ thị đã được tạo ở thư mục `graphify-out/graph.json`, bạn có thể truy vấn nhanh cấu trúc dự án ngay trong chat mà không cần quét lại file:

* **Hỏi đáp chung về Codebase**:
  ```bash
  graphify query "Hệ thống quản lý bộ nhớ hoạt động thế nào?"
  ```
* **Tìm đường đi giữa hai khái niệm/module**:
  ```bash
  graphify path "ClinicalAgent" "PatientRepository"
  ```
* **Giải thích chi tiết một Concept/Hàm**:
  ```bash
  graphify explain "ClinicalAgent"
  ```
* **Xem giao diện đồ thị trực quan**:
  Mở file `graphify-out/graph.html` bằng trình duyệt của bạn để xem và tương tác trực quan với đồ thị.
