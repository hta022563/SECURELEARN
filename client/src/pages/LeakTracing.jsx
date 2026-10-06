import React, { useState, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  InputGroup,
  Form,
  Button,
  Alert,
  Badge,
  Modal,
  Table,
} from 'react-bootstrap';
import { useToast } from '../context/ToastContext';
import {
  users as dbUsers,
  courses as dbCourses,
  entitlements as dbEntitlements,
  sessions as dbSessions,
  anomalyAlerts as dbAlerts,
} from '../data/mockDatabase';

/**
 * =============================================================================
 * PAGE: LeakTracing (100% Dữ Liệu Mềm Từ CSDL Chuẩn ERD)
 * =============================================================================
 * Công cụ chuyên sâu phục vụ đối soát dấu vân tay Watermark từ video rò rỉ:
 * - Tra cứu động trực tiếp từ bảng users, entitlements, courses, sessions
 * - Đối soát lịch sử cảnh báo rò rỉ từ bảng anomalyAlerts
 * =============================================================================
 */
export default function LeakTracing() {
  const { showToast } = useToast();

  const [searchWatermarkId, setSearchWatermarkId] = useState('');
  const [tracedStudent, setTracedStudent] = useState(null);
  const [traceError, setTraceError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);

  // Lịch sử đối soát rò rỉ sinh động từ bảng anomalyAlerts
  const [recentTraces, setRecentTraces] = useState(() => {
    return dbAlerts.map((alert, idx) => {
      const students = dbUsers.filter((u) => (u.Role || '').toLowerCase() === 'student');
      const student = students[idx % students.length] || dbUsers[3];
      const riskScore = Math.round(alert.Score * 100);

      let status = 'Đang Điều Tra';
      let actionTaken = 'Đã Phát Cảnh Báo';
      if (alert.Status === 'resolved') {
        status = 'Đã Giải Quyết';
        actionTaken = 'Khôi Phục Quyền';
      } else if (riskScore > 80) {
        status = 'Xác Nhận Rò Rỉ';
        actionTaken = 'Đình Chỉ Tài Khoản';
      }

      return {
        id: `TRC-${alert.ID.replace('aa-', '9')}`,
        watermarkId: student?.ID || '',
        studentName: student?.Username || 'Học viên',
        status,
        actionTaken,
        tracedAt: alert.Timestamp ? alert.Timestamp.replace('T', ' ').replace('Z', '') : '2025-03-20 17:45',
        score: riskScore,
      };
    });
  });

  const handleTraceLeak = (e) => {
    e.preventDefault();
    const query = searchWatermarkId.trim().toLowerCase();

    if (!query) {
      setTraceError('Vui lòng nhập Mã Watermark (User ID hoặc Email) để tiến hành truy vết.');
      setTracedStudent(null);
      return;
    }

    setIsSearching(true);
    setTraceError(null);

    setTimeout(() => {
      setIsSearching(false);

      // Tra cứu trực tiếp từ bảng dbUsers
      const matchedUser = dbUsers.find(
        (u) =>
          u.ID.toLowerCase() === query ||
          u.Username.toLowerCase().includes(query)
      );

      if (matchedUser) {
        const enrolledCourses = dbEntitlements
          .filter((e) => e.UserID === matchedUser.ID && (e.Status === 'active' || e.Status === 'completed'))
          .map((e) => {
            const c = dbCourses.find((course) => course.ID === e.CoursesID);
            return c ? c.Title : e.CoursesID;
          });

        const session = dbSessions.find((s) => s['JWT credential']?.includes(matchedUser.ID)) || dbSessions[0];

        setTracedStudent({
          id: matchedUser.ID,
          name: matchedUser.Username.split('@')[0],
          email: matchedUser.Username,
          role: matchedUser.Role,
          course: enrolledCourses.length > 0 ? enrolledCourses.join(', ') : 'Chưa ghi danh khóa học',
          ip: '14.241.120.45 (Viettel - Hà Nội)',
          device: 'Chrome / Windows 11',
          sessionJoinTime: session?.JoinTime ? session.JoinTime.replace('T', ' ').replace('Z', '') : '2025-01-10 07:55',
          leakSource: 'Phát hiện dấu vân tay số từ thuật toán Dynamic Watermark',
          riskLevel: matchedUser.Role === 'admin' ? 'An toàn (Admin)' : 'Cực kỳ nguy hiểm (High Risk)',
        });
        setTraceError(null);
      } else {
        setTraceError(
          `Không tìm thấy dữ liệu khớp với mã "${searchWatermarkId}". Vui lòng thử các mã mẫu trong CSDL: u-004, u-005, u-006 hoặc email sinh viên.`
        );
        setTracedStudent(null);
      }
    }, 300);
  };

  const handleConfirmBan = () => {
    if (!tracedStudent) return;

    // Cập nhật CSDL mềm: Thu hồi quyền các khóa học
    dbEntitlements.forEach((e) => {
      if (e.UserID === tracedStudent.id) {
        e.Status = 'expired';
      }
    });

    // Cập nhật lịch sử đối soát
    setRecentTraces((prev) => [
      {
        id: `TRC-${Date.now().toString().slice(-4)}`,
        watermarkId: tracedStudent.id,
        studentName: tracedStudent.email,
        status: 'Xác Nhận Rò Rỉ',
        actionTaken: 'Đã Thu Hồi Quyền',
        tracedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        score: 95,
      },
      ...prev,
    ]);

    setShowBanModal(false);
    showToast(
      `Đã thu hồi toàn bộ quyền truy cập bài giảng của học viên ${tracedStudent.id} (${tracedStudent.email})!`,
      'success',
      'Đã Thu Hồi Quyền'
    );
  };

  return (
    <Container fluid className="px-3 px-xl-5 py-4 leak-tracing-page">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4 pb-3 border-bottom">
        <div>
          <div className="badge-pill-soft mb-2">
            <span>Bảo Mật DRM Bản Quyền</span>
          </div>
          <h2 className="fw-bold text-dark mb-1">
            Đối Soát Dấu Vân Tay &amp; <span className="text-primary">Truy Vết Rò Rỉ Video</span>
          </h2>
          <p className="text-secondary mb-0 small">
            Tra cứu và xác thực danh tính người phát tán video bài giảng trái phép từ mã Watermark động trong CSDL.
          </p>
        </div>
      </div>

      <Row className="g-4 mb-4">
        {/* Khung Nhập Mã Watermark */}
        <Col lg={7}>
          <Card className="card-clean shadow-sm border rounded-4 p-4 bg-white h-100">
            <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-search text-primary"></i>
              <span>Tra Cứu Mã Định Danh Watermark</span>
            </h5>
            <p className="text-secondary small mb-4">
              Nhập mã định danh học viên (Ví dụ: <code>u-004</code>, <code>u-005</code>, <code>u-006</code> hoặc email) hiển thị mờ trên video bị quay lén:
            </p>

            <Form onSubmit={handleTraceLeak}>
              <InputGroup className="mb-3">
                <InputGroup.Text className="bg-light border-end-0">
                  <i className="bi bi-upc-scan text-muted"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Nhập mã sinh viên / email (Ví dụ: u-004, charlie.stu)..."
                  value={searchWatermarkId}
                  onChange={(e) => setSearchWatermarkId(e.target.value)}
                  className="border-start-0 form-control-clean"
                />
                <Button type="submit" disabled={isSearching} className="btn-primary-pill px-4">
                  {isSearching ? 'Đang tra...' : 'Truy Vết'}
                </Button>
              </InputGroup>
            </Form>

            {traceError && (
              <Alert variant="danger" className="py-2 small">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {traceError}
              </Alert>
            )}

            {/* Chi tiết học viên khớp Watermark */}
            {tracedStudent && (
              <div className="p-4 rounded-4 bg-light border border-primary border-opacity-25 mt-3">
                <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
                  <div>
                    <Badge bg="danger" className="px-3 py-1 mb-2">
                      Trùng Khớp Watermark
                    </Badge>
                    <h5 className="fw-bold text-dark mb-0">
                      {tracedStudent.name} (Mã: <code>{tracedStudent.id}</code>)
                    </h5>
                    <div className="text-secondary small">{tracedStudent.email}</div>
                  </div>

                  <Button
                    variant="outline-danger"
                    size="sm"
                    className="rounded-pill px-3"
                    onClick={() => setShowBanModal(true)}
                  >
                    <i className="bi bi-lock-fill me-1"></i>Thu Hồi Quyền
                  </Button>
                </div>

                <div className="d-flex flex-column gap-2 small">
                  <div className="d-flex justify-content-between border-bottom pb-1">
                    <span className="text-muted">Khóa học đã ghi danh:</span>
                    <strong className="text-dark">{tracedStudent.course}</strong>
                  </div>
                  <div className="d-flex justify-content-between border-bottom pb-1">
                    <span className="text-muted">Địa chỉ IP &amp; Thiết bị:</span>
                    <strong className="text-dark">{tracedStudent.ip} • {tracedStudent.device}</strong>
                  </div>
                  <div className="d-flex justify-content-between border-bottom pb-1">
                    <span className="text-muted">Thời điểm tham gia phiên:</span>
                    <span className="text-secondary">{tracedStudent.sessionJoinTime}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Mức độ rủi ro:</span>
                    <strong className="text-danger">{tracedStudent.riskLevel}</strong>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </Col>

        {/* Hướng Dẫn Kỹ Thuật Watermark */}
        <Col lg={5}>
          <Card className="card-clean shadow-sm border rounded-4 p-4 bg-white h-100">
            <h5 className="fw-bold text-dark mb-3">
              Cơ Chế Dynamic Watermarking
            </h5>
            <div className="d-flex flex-column gap-3 small text-secondary">
              <div className="p-3 bg-light rounded-3 border">
                <strong className="text-dark d-block mb-1">1. Tọa độ ngẫu nhiên không lặp</strong>
                Watermark di chuyển liên tục theo chu kỳ, khiến người quay lén không thể dùng bộ lọc cắt ghép hay làm mờ cố định.
              </div>
              <div className="p-3 bg-light rounded-3 border">
                <strong className="text-dark d-block mb-1">2. Mã hóa danh tính theo phiên</strong>
                Mã sinh viên được gắn kèm thời gian phát thực tế và chữ ký số HMAC-SHA256 để chống giả mạo danh tính học viên khác.
              </div>
              <div className="p-3 bg-light rounded-3 border">
                <strong className="text-dark d-block mb-1">3. Đối soát CSDL thời gian thực</strong>
                Mọi hành vi trích xuất đều được đối soát lập tức với bảng <code>users</code> và <code>sessions</code>.
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Lịch Sử Các Đợt Đối Soát Rò Rỉ */}
      <Card className="card-clean shadow-sm border rounded-4 overflow-hidden bg-white">
        <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold text-dark">Lịch Sử Đối Soát Rò Rỉ Bản Quyền Gần Đây</h5>
          <span className="badge-pill-cyan">ERD Table: anomalyAlerts</span>
        </Card.Header>

        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="table-clean mb-0 align-middle text-nowrap">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Mã Đối Soát</th>
                  <th>Mã Watermark (User ID)</th>
                  <th>Tài Khoản / Email</th>
                  <th>Trạng Thái</th>
                  <th>Biện Pháp Xử Lý</th>
                  <th>Thời Gian Đối Soát</th>
                </tr>
              </thead>
              <tbody>
                {recentTraces.map((trace) => (
                  <tr key={trace.id}>
                    <td>
                      <code>{trace.id}</code>
                    </td>
                    <td>
                      <Badge bg="secondary" className="px-2 py-1 font-monospace">
                        {trace.watermarkId}
                      </Badge>
                    </td>
                    <td className="fw-semibold text-dark">{trace.studentName}</td>
                    <td>
                      <span
                        className={
                          trace.status === 'Xác Nhận Rò Rỉ'
                            ? 'badge-status-failed'
                            : trace.status === 'Đã Giải Quyết'
                            ? 'badge-status-ready'
                            : 'badge-status-processing'
                        }
                      >
                        {trace.status}
                      </span>
                    </td>
                    <td className="text-secondary small">{trace.actionTaken}</td>
                    <td className="text-muted small">{trace.tracedAt}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>

        <Card.Footer className="bg-light border-top py-3 px-4 text-muted small">
          Hiển thị <strong>{recentTraces.length}</strong> nhật ký đối soát từ CSDL mềm.
        </Card.Footer>
      </Card>

      {/* MODAL THU HỒI QUYỀN */}
      <Modal show={showBanModal} onHide={() => setShowBanModal(false)} centered backdrop="static">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-6 fw-bold text-danger">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>Xác Nhận Thu Hồi Quyền Học Viên
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4">
          <p className="mb-2">
            Bạn có chắc chắn muốn thu hồi toàn bộ quyền xem video bài giảng của học viên này do vi phạm bản quyền:
          </p>
          <div className="p-3 bg-light rounded-3 border">
            <strong>{tracedStudent?.email}</strong> (Mã: <code>{tracedStudent?.id}</code>)
          </div>
          <small className="text-danger mt-2 d-block">
            * Hành động này sẽ cập nhật các khóa học của học viên sang trạng thái <code>expired</code> trong bảng <code>entitlements</code>.
          </small>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setShowBanModal(false)} className="rounded-pill px-3">
            Hủy
          </Button>
          <Button variant="danger" size="sm" onClick={handleConfirmBan} className="rounded-pill px-3">
            Xác Nhận Thu Hồi
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
