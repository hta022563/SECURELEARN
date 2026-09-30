# SECURELEARN
Dự án SecureLearn là hệ thống nền tảng học trực tuyến (LMS) hướng đến việc bảo vệ nội dung video bài giảng. Dưới đây là phân chia nhiệm vụ cụ thể cho hai phân hệ
1. Phía Frontend (client - ReactJS)
Cổng quản trị (Admin Portal):
Xây dựng màn hình đăng nhập và xác thực người dùng dựa trên token.
Giao diện quản lý khóa học, danh sách bài giảng và tính năng tải lên (upload) video bài giảng mới.
Hiển thị Dashboard quản lý thông tin metadata và trạng thái xử lý video.
Trang xem video & Trình phát (Video Player):
Thiết kế trang xem video trực tuyến thân thiện, mượt mà.
Tích hợp thư viện Hls.js để xử lý phát định dạng video phân phối trực tuyến.
2. Backend (server - Java Spring Boot)
Xác thực & Phân quyền (Auth & Authorization):
Xây dựng API đăng ký, đăng nhập tài khoản.
Triển khai phân quyền rõ ràng giữa Giảng viên và Học viên.
Phát hành và xác thực mã JWT (JSON Web Token) cho mỗi phiên đăng nhập hợp lệ.
Thiết kế cơ sở dữ liệu và API quản lý thông tin khóa học, chi tiết bài giảng, metadata video.
Xử lý cập nhật trạng thái video từ các tiến trình lưu trữ/mã hóa lên database.
Kiểm soát Truy cập & Bảo mật:
Xây dựng tầng dịch vụ kiểm tra quyền hạn, cấp đường dẫn xem video bảo mật có thời hạn (Signed URL) cho người dùng hợp lệ.
Cấu hình CORS để kết nối an toàn với ứng dụng ReactJS.
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
