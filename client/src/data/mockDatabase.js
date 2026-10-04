/**
 * =============================================================================
 * SECURELEARN - MOCK DATABASE (STRICT ERD COMPLIANCE 100%)
 * =============================================================================
 * Tuân thủ tuyệt đối danh sách 8 thực thể và các thuộc tính từ sơ đồ ERD chính thức:
 * 1. User: ID, Username, Password, Role, CreationTime
 * 2. Session: ID, ActiveTime, JoinTime, JWT credential
 * 3. Entitlement: UserID, CoursesID, Status, Join Date, Completion Date
 * 4. Course: ID, Title, Description, Price, Creation Time, Owner, AccessLogID, AnomalyAlertID
 * 5. Chapter: ID, ChapterNumber, Title, Description, CoursesID, AccessLogID
 * 6. Video: ID, Title, Length, Size, UploadTime, UploadedBy, AccessLogID, AnomalyAlertID
 * 7. AccessLog: ID, Action, AcessTime, SignedURLID
 * 8. AnomalyAlert: ID, Score, Timestamp, Status
 * 
 * Lưu ý: Giữ nguyên tên trường gốc kể cả lỗi chính tả (AcessTime) và khoảng trắng.
 * Tuyệt đối không thêm bất kỳ trường ngoài danh sách trên.
 * =============================================================================
 */

// 1. TABLE: AnomalyAlert — Fields: ID, Score, Timestamp, Status
export const anomalyAlerts = [
  { ID: "aa-001", Score: 0.12, Timestamp: "2025-01-10T08:05:00Z", Status: "resolved" },
  { ID: "aa-002", Score: 0.78, Timestamp: "2025-02-14T13:22:00Z", Status: "open" },
  { ID: "aa-003", Score: 0.05, Timestamp: "2025-03-01T09:00:00Z", Status: "resolved" },
  { ID: "aa-004", Score: 0.91, Timestamp: "2025-03-20T17:45:00Z", Status: "open" },
  { ID: "aa-005", Score: 0.33, Timestamp: "2025-04-05T11:10:00Z", Status: "resolved" },
];

// 2. TABLE: AccessLog — Fields: ID, Action, AcessTime, SignedURLID
export const accessLogs = [
  { ID: "al-001", Action: "PLAY", AcessTime: "2025-01-10T08:00:00Z", SignedURLID: "su-001" },
  { ID: "al-002", Action: "PAUSE", AcessTime: "2025-01-10T08:22:00Z", SignedURLID: "su-001" },
  { ID: "al-003", Action: "PLAY", AcessTime: "2025-02-14T13:00:00Z", SignedURLID: "su-002" },
  { ID: "al-004", Action: "SEEK", AcessTime: "2025-02-14T13:15:00Z", SignedURLID: "su-002" },
  { ID: "al-005", Action: "PLAY", AcessTime: "2025-03-01T09:00:00Z", SignedURLID: "su-003" },
  { ID: "al-006", Action: "STOP", AcessTime: "2025-03-01T09:45:00Z", SignedURLID: "su-003" },
  { ID: "al-007", Action: "PLAY", AcessTime: "2025-04-05T11:00:00Z", SignedURLID: "su-004" },
];

// 3. TABLE: User — Fields: ID, Username, Password, Role, CreationTime
export const users = [
  { ID: "u-001", Username: "admin@securelearn.vn", Password: "hashed_admin_pw_001", Role: "admin", CreationTime: "2024-06-01T00:00:00Z" },
  { ID: "u-002", Username: "alice.instructor@gmail.com", Password: "hashed_inst_pw_002", Role: "instructor", CreationTime: "2024-06-15T10:30:00Z" },
  { ID: "u-003", Username: "bob.instructor@gmail.com", Password: "hashed_inst_pw_003", Role: "instructor", CreationTime: "2024-07-01T09:00:00Z" },
  { ID: "u-004", Username: "charlie.stu@student.edu.vn", Password: "hashed_stu_pw_004", Role: "student", CreationTime: "2024-08-10T14:00:00Z" },
  { ID: "u-005", Username: "diana.stu@student.edu.vn", Password: "hashed_stu_pw_005", Role: "student", CreationTime: "2024-09-05T11:00:00Z" },
  { ID: "u-006", Username: "evan.stu@student.edu.vn", Password: "hashed_stu_pw_006", Role: "student", CreationTime: "2024-10-20T08:45:00Z" },
];

// 4. TABLE: Session — Fields: ID, ActiveTime, JoinTime, "JWT credential"
export const sessions = [
  {
    ID: "ses-001",
    ActiveTime: "2025-01-10T08:00:00Z",
    JoinTime: "2025-01-10T07:55:00Z",
    "JWT credential": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJJRCI6InUtMDA0IiwiUm9sZSI6InN0dWRlbnQifQ.mockSignature001",
  },
  {
    ID: "ses-002",
    ActiveTime: "2025-02-14T13:00:00Z",
    JoinTime: "2025-02-14T12:58:00Z",
    "JWT credential": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJJRCI6InUtMDA1IiwiUm9sZSI6InN0dWRlbnQifQ.mockSignature002",
  },
  {
    ID: "ses-003",
    ActiveTime: "2025-03-01T09:00:00Z",
    JoinTime: "2025-03-01T08:59:00Z",
    "JWT credential": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJJRCI6InUtMDAyIiwiUm9sZSI6Imluc3RydWN0b3IifQ.mockSignature003",
  },
  {
    ID: "ses-004",
    ActiveTime: "2025-04-05T11:00:00Z",
    JoinTime: "2025-04-05T10:57:00Z",
    "JWT credential": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJJRCI6InUtMDAxIiwiUm9sZSI6ImFkbWluIn0.mockSignature004",
  },
];

// 5. TABLE: Course — Fields: ID, Title, Description, Price, "Creation Time", Owner, AccessLogID, AnomalyAlertID
export const courses = [
  {
    ID: "c-001",
    Title: "Network Security Fundamentals",
    Description: "Học các nguyên tắc bảo mật mạng cơ bản: tường lửa thế hệ mới, VPN bảo mật, mã hóa dữ liệu và phát hiện xâm nhập IDS/IPS.",
    Price: 499000,
    "Creation Time": "2024-07-10T10:00:00Z",
    Owner: "u-002",
    AccessLogID: "al-001",
    AnomalyAlertID: "aa-001",
  },
  {
    ID: "c-002",
    Title: "Ethical Hacking & Penetration Testing",
    Description: "Khóa học toàn diện về Pentest: từ thu thập thông tin trinh sát OSINT, khai thác lỗ hổng với Metasploit đến viết báo cáo chuyên nghiệp.",
    Price: 799000,
    "Creation Time": "2024-08-01T09:30:00Z",
    Owner: "u-002",
    AccessLogID: "al-003",
    AnomalyAlertID: "aa-002",
  },
  {
    ID: "c-003",
    Title: "Web Application Security (OWASP Top 10)",
    Description: "Phân tích chuyên sâu Top 10 lỗ hổng bảo mật OWASP phổ biến (SQLi, XSS, CSRF, SSRF) và kỹ thuật vá lỗi an toàn.",
    Price: 650000,
    "Creation Time": "2024-09-15T14:00:00Z",
    Owner: "u-003",
    AccessLogID: "al-005",
    AnomalyAlertID: "aa-003",
  },
  {
    ID: "c-004",
    Title: "Cloud Security & Zero-Trust Architecture",
    Description: "Bảo mật hạ tầng đám mây đa nền tảng (AWS/Azure/GCP), quản lý IAM chặt chẽ và triển khai mô hình Zero-Trust.",
    Price: 899000,
    "Creation Time": "2024-10-05T08:00:00Z",
    Owner: "u-003",
    AccessLogID: "al-006",
    AnomalyAlertID: "aa-004",
  },
  {
    ID: "c-005",
    Title: "Malware Analysis & Reverse Engineering",
    Description: "Kỹ thuật dịch ngược mã nhị phân PE, phân tích tĩnh và phân tích động mã độc trong môi trường sandbox an toàn.",
    Price: 720000,
    "Creation Time": "2024-11-20T11:00:00Z",
    Owner: "u-002",
    AccessLogID: "al-007",
    AnomalyAlertID: "aa-005",
  },
];

// 6. TABLE: Entitlement — Fields: UserID, CoursesID, Status, "Join Date", "Completion Date"
export const entitlements = [
  { UserID: "u-004", CoursesID: "c-001", Status: "completed", "Join Date": "2024-08-15T00:00:00Z", "Completion Date": "2024-11-01T00:00:00Z" },
  { UserID: "u-004", CoursesID: "c-002", Status: "active", "Join Date": "2024-11-05T00:00:00Z", "Completion Date": null },
  { UserID: "u-005", CoursesID: "c-001", Status: "active", "Join Date": "2024-09-10T00:00:00Z", "Completion Date": null },
  { UserID: "u-005", CoursesID: "c-003", Status: "active", "Join Date": "2024-10-01T00:00:00Z", "Completion Date": null },
  { UserID: "u-006", CoursesID: "c-002", Status: "expired", "Join Date": "2024-07-01T00:00:00Z", "Completion Date": null },
  { UserID: "u-006", CoursesID: "c-004", Status: "active", "Join Date": "2024-11-10T00:00:00Z", "Completion Date": null },
];

// 7. TABLE: Chapter — Fields: ID, ChapterNumber, Title, Description, CoursesID, AccessLogID
export const chapters = [
  { ID: "ch-001", ChapterNumber: 1, Title: "Giới thiệu về Bảo mật Mạng", Description: "Tổng quan về bảo mật mạng, các mối đe dọa phổ biến và mô hình CIA Triad.", CoursesID: "c-001", AccessLogID: "al-001" },
  { ID: "ch-002", ChapterNumber: 2, Title: "Tường lửa & Kiến trúc DMZ", Description: "Cấu hình tường lửa stateful, phân vùng DMZ và lọc gói tin nâng cao.", CoursesID: "c-001", AccessLogID: "al-002" },
  { ID: "ch-003", ChapterNumber: 3, Title: "VPN và Mã hóa Dữ liệu", Description: "Triển khai VPN IPSec/SSL, giao thức mã hóa AES, RSA và quản lý chứng chỉ.", CoursesID: "c-001", AccessLogID: "al-003" },
  { ID: "ch-004", ChapterNumber: 1, Title: "Giai đoạn Thu thập Thông tin (Recon)", Description: "Kỹ thuật passive/active reconnaissance: OSINT, Shodan, Nmap scanning.", CoursesID: "c-002", AccessLogID: "al-004" },
  { ID: "ch-005", ChapterNumber: 2, Title: "Khai thác Lỗ hổng với Metasploit", Description: "Sử dụng Metasploit Framework để khai thác lỗ hổng, leo thang đặc quyền.", CoursesID: "c-002", AccessLogID: "al-005" },
  { ID: "ch-006", ChapterNumber: 1, Title: "SQL Injection & NoSQL Injection", Description: "Phân tích, khai thác và vá các lỗ hổng injection trong ứng dụng web hiện đại.", CoursesID: "c-003", AccessLogID: "al-006" },
  { ID: "ch-007", ChapterNumber: 2, Title: "XSS, CSRF và Broken Auth", Description: "Tấn công Cross-Site Scripting, CSRF token bypass và khai thác lỗ hổng xác thực.", CoursesID: "c-003", AccessLogID: "al-007" },
  { ID: "ch-008", ChapterNumber: 1, Title: "Bảo mật AWS IAM & S3", Description: "Cấu hình IAM Policy, S3 Bucket Policy và phát hiện cấu hình sai trên AWS.", CoursesID: "c-004", AccessLogID: "al-001" },
  { ID: "ch-009", ChapterNumber: 1, Title: "Phân tích Tĩnh (Static Analysis)", Description: "Đọc PE headers, tìm IOC, dùng Ghidra/IDA để disassemble mã độc.", CoursesID: "c-005", AccessLogID: "al-002" },
  { ID: "ch-010", ChapterNumber: 2, Title: "Phân tích Động (Dynamic Analysis)", Description: "Chạy malware trong sandbox, theo dõi API calls, network traffic và registry.", CoursesID: "c-005", AccessLogID: "al-003" },
];

// 8. TABLE: Video — Fields: ID, Title, Length, Size, UploadTime, UploadedBy, AccessLogID, AnomalyAlertID
export const videos = [
  { ID: "v-001", Title: "CIA Triad - Confidentiality, Integrity, Availability", Length: 1320, Size: 524288000, UploadTime: "2024-07-11T10:00:00Z", UploadedBy: "u-002", AccessLogID: "al-001", AnomalyAlertID: "aa-001" },
  { ID: "v-002", Title: "Các loại tấn công mạng phổ biến năm 2024", Length: 1800, Size: 720896000, UploadTime: "2024-07-12T11:00:00Z", UploadedBy: "u-002", AccessLogID: "al-002", AnomalyAlertID: null },
  { ID: "v-003", Title: "Cấu hình Firewall với iptables trên Linux", Length: 2400, Size: 960000000, UploadTime: "2024-07-15T09:30:00Z", UploadedBy: "u-002", AccessLogID: "al-003", AnomalyAlertID: "aa-002" },
  { ID: "v-004", Title: "OSINT với Shodan và Maltego", Length: 2700, Size: 1080000000, UploadTime: "2024-08-05T10:00:00Z", UploadedBy: "u-002", AccessLogID: "al-004", AnomalyAlertID: null },
  { ID: "v-005", Title: "Metasploit: Từ cơ bản đến nâng cao", Length: 3600, Size: 1440000000, UploadTime: "2024-08-10T14:00:00Z", UploadedBy: "u-002", AccessLogID: "al-005", AnomalyAlertID: "aa-003" },
  { ID: "v-006", Title: "SQLMap - Tự động hóa tấn công SQL Injection", Length: 1980, Size: 792000000, UploadTime: "2024-09-18T10:00:00Z", UploadedBy: "u-003", AccessLogID: "al-006", AnomalyAlertID: null },
  { ID: "v-007", Title: "XSS Stored vs Reflected - Demo thực tế", Length: 2160, Size: 864000000, UploadTime: "2024-09-20T11:30:00Z", UploadedBy: "u-003", AccessLogID: "al-007", AnomalyAlertID: "aa-004" },
  { ID: "v-008", Title: "AWS IAM: Principle of Least Privilege", Length: 2520, Size: 1008000000, UploadTime: "2024-10-08T09:00:00Z", UploadedBy: "u-003", AccessLogID: "al-001", AnomalyAlertID: null },
  { ID: "v-009", Title: "Phân tích PE Header bằng PEStudio", Length: 3000, Size: 1200000000, UploadTime: "2024-11-22T08:00:00Z", UploadedBy: "u-002", AccessLogID: "al-002", AnomalyAlertID: "aa-005" },
  { ID: "v-010", Title: "Cuckoo Sandbox - Phân tích động mã độc", Length: 2880, Size: 1152000000, UploadTime: "2024-11-25T10:00:00Z", UploadedBy: "u-002", AccessLogID: "al-003", AnomalyAlertID: null },
];

// Single Database Object Export
const mockDatabase = {
  users,
  sessions,
  entitlements,
  courses,
  chapters,
  videos,
  accessLogs,
  anomalyAlerts,
};

export default mockDatabase;


