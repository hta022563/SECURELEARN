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
export const courses = [];

// 6. TABLE: Entitlement — Fields: UserID, CoursesID, Status, "Join Date", "Completion Date"
export const entitlements = [];

// 7. TABLE: Chapter — Fields: ID, ChapterNumber, Title, Description, CoursesID, AccessLogID
export const chapters = [];

// 8. TABLE: Video — Fields: ID, Title, Length, Size, UploadTime, UploadedBy, AccessLogID, AnomalyAlertID
export const videos = [];

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


