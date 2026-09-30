# SECURELEARN
Dự án SecureLearn là hệ thống nền tảng học trực tuyến (LMS) hướng đến việc bảo vệ nội dung video bài giảng. Dưới đây là phân chia nhiệm vụ cụ thể cho hai phân hệ
##  Công Nghệ
* **Frontend (`client`):** ReactJS, Hls.js
* **Backend (`server`):** Java Spring Boot, JWT

##  *Dự Kiến*
* **Frontend (`client` - ReactJS):**
  * Giao diện Admin: Quản lý khóa học và upload video.
  * Giao diện User: Để xem video Khóa học
  * Trình phát video: Tích hợp **Hls.js** và **Watermark động** chống quay lén
* **Backend (`server` - Java Spring Boot):**
  * Xác thực & Phân quyền: Đăng nhập, phân vai trò, cấp mã **JWT**
  * Nghiệp vụ dữ liệu: CRUD khóa học, bài giảng và metadata
  * Bảo mật: Kiểm tra quyền và cấp Signed URL xem video
 Hướng Dẫn Chạy Dự Án
1. Chạy Backend (Spring Boot)
Mở thư mục server/ bằng IntelliJ IDEA hoặc IDE hỗ trợ Java.

Cấu hình kết nối cơ sở dữ liệu trong file application.properties hoặc application.yml.

Chạy file ứng dụng chính (có annotation @SpringBootApplication).

Backend thường chạy ở cổng: http://localhost:8080

2. Chạy Frontend (ReactJS)
Mở terminal tại thư mục client/.

Cài đặt các thư viện phụ thuộc:

Bash
npm install
Khởi động môi trường phát triển:

Bash
npm run dev
# hoặc npm start
Frontend thường chạy ở cổng: http://localhost:3000 hoặc 5173
