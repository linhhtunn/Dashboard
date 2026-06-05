Ran command: `clear`

Yêu cầu `GET /favicon.ico` xuất hiện trong log của bạn là do hành vi mặc định của **Trình duyệt web** (như Chrome, Firefox, Edge, Safari) khi bạn truy cập vào các đường dẫn của dự án (ví dụ như trang Swagger `/docs` hoặc trang `/health`).

Cơ chế hoạt động cụ thể như sau:

### 1. Tại sao lại có yêu cầu `/favicon.ico`?
Khi bạn dùng trình duyệt mở một trang web bất kỳ, trình duyệt sẽ luôn tự động gửi thêm một yêu cầu phụ tới đường dẫn `/favicon.ico` ở thư mục gốc của server để lấy biểu tượng nhỏ (icon) hiển thị trên tab của trình duyệt. 
* Do ứng dụng FastAPI của bạn không khai báo route cho `/favicon.ico`, server sẽ trả về lỗi **`404 Not Found`**. Đây là điều hoàn toàn bình thường đối với các API backend thuần túy.

### 2. Sự khác nhau giữa các địa chỉ IP trong log của bạn:
* **IP `172.17.0.1` (gặp lỗi `favicon.ico 404`):** Đây là IP gateway của Docker bridge (trỏ từ máy thật của bạn vào container). Điều này chứng tỏ **bạn vừa dùng trình duyệt từ máy thật** để truy cập vào ứng dụng trong container.
* **IP `127.0.0.1` (gọi thành công `/health 200`):** Đây là localhost *bên trong* container. Yêu cầu này sinh ra do tiến trình **`HEALTHCHECK`** (được cấu hình trong `Dockerfile`) tự động gọi kiểm tra sức khỏe hệ thống định kỳ mỗi 30 giây bằng lệnh `urllib.request.urlopen`.