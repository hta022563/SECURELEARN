import React, { useState, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  InputGroup,
  Form,
  Button,
  Table,
  Badge,
  Alert,
  Modal,
  Toast,
  ToastContainer,
  Nav,
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import {
  anomalyAlerts as dbAlerts,
  accessLogs as dbLogs,
  users as dbUsers,
  courses as dbCourses,
  entitlements as dbEntitlements,
  sessions as dbSessions,
} from '../data/mockDatabase';

/**
 * =============================================================================
 * COMPONENT: AdminAnomalyDashboard (100% Dữ Liệu Mềm Từ CSDL Chuẩn ERD)
 * =============================================================================
 * Bảng điều khiển phân tích AI Isolation Forest & Phát hiện rò rỉ bản quyền:
 * - Đọc trực tiếp từ bảng: anomalyAlerts, accessLogs, users, courses, sessions
 * - Tự động đối soát dấu vân tay Watermark theo mã sinh viên thực tế trong CSDL
 * =============================================================================
 */
export default function AdminAnomalyDashboard() {
  const { t } = useTranslation();

  // Chuyển đổi dữ liệu cảnh báo từ bảng anomalyAlerts thành format đầy đủ
  const [alerts, setAlerts] = useState(() => {
    return dbAlerts.map((item, idx) => {
      const relatedCourse = dbCourses.find((c) => c.AnomalyAlertID === item.ID) || dbCourses[idx % dbCourses.length];
      const students = dbUsers.filter((u) => (u.Role || '').toLowerCase() === 'student');
      const student = students[idx % students.length] || dbUsers[3];
      const riskScore = Math.round(item.Score * 100);

      let anomalyType = t('admin_alerts.account_sharing');
      let details = t('admin_alerts.account_sharing_desc');
      if (item.Score >= 0.8) {
        anomalyType = t('admin_alerts.spam_ecdh');
        details = t('admin_alerts.spam_ecdh_desc');
      } else if (item.Score >= 0.5) {
        anomalyType = t('admin_alerts.bot_viewing');
        details = t('admin_alerts.bot_viewing_desc');
      } else {
        anomalyType = t('admin_alerts.geo_anomaly');
        details = t('admin_alerts.geo_anomaly_desc');
      }

      const statusFormatted =
        item.Status === 'resolved' ? 'Resolved' : riskScore > 75 ? 'New' : 'Acknowledged';

      return {
        id: item.ID,
        studentId: student?.ID || 'u-004',
        studentName: student?.Username || t('admin_alerts.securelearn_student'),
        anomalyType,
        riskScore,
        timestamp: item.Timestamp ? item.Timestamp.replace('T', ' ').replace('Z', '') : '2025-03-20 17:45',
        status: statusFormatted,
        details,
        courseTitle: relatedCourse?.Title || t('admin_alerts.info_sec_course'),
      };
    });
  });

  // State công cụ truy vết rò rỉ (Watermark Leak Tracing)
  const [searchWatermarkId, setSearchWatermarkId] = useState('');
  const [tracedStudent, setTracedStudent] = useState(null);
  const [traceError, setTraceError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // State Modal khóa tài khoản (Ban User)
  const [selectedUserToBan, setSelectedUserToBan] = useState(null);
  const [showBanModal, setShowBanModal] = useState(false);

  // State Toast thông báo
  const [toastMessage, setToastMessage] = useState(null);

  // State 2 bảng (Chưa xử lý / Đã xử lý) & Tìm kiếm theo tên user
  const [activeTableTab, setActiveTableTab] = useState('pending'); // 'pending' | 'resolved'
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Lọc danh sách cảnh báo CHỈ THEO TÊN USER (studentName hoặc studentId)
  const filteredAlerts = useMemo(() => {
    if (!userSearchTerm.trim()) return alerts;
    const term = userSearchTerm.toLowerCase().trim();
    return alerts.filter(
      (a) =>
        (a.studentName && a.studentName.toLowerCase().includes(term)) ||
        (a.studentId && a.studentId.toLowerCase().includes(term))
    );
  }, [alerts, userSearchTerm]);

  // Bảng 1: Chưa xử lý
  const pendingAlerts = useMemo(
    () => filteredAlerts.filter((a) => a.status !== 'Resolved'),
    [filteredAlerts]
  );

  // Bảng 2: Đã xử lý
  const resolvedAlerts = useMemo(
    () => filteredAlerts.filter((a) => a.status === 'Resolved'),
    [filteredAlerts]
  );

  /**
   * 1. Xử lý Truy vết rò rỉ từ Mã Watermark (Student ID) - 100% dữ liệu mềm từ DB
   */
  const handleTraceLeak = (e) => {
    e.preventDefault();
    const query = searchWatermarkId.trim().toLowerCase();

    if (!query) {
      setTraceError(t('admin_alerts.missing_watermark_id'));
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
        // Tìm các khóa học đã ghi danh từ dbEntitlements
        const enrolledCourses = dbEntitlements
          .filter((e) => e.UserID === matchedUser.ID && (e.Status === 'active' || e.Status === 'completed'))
          .map((e) => {
            const c = dbCourses.find((course) => course.ID === e.CoursesID);
            return c ? c.Title : e.CoursesID;
          });

        // Tìm phiên gần nhất từ dbSessions
        const session = dbSessions[0];

        setTracedStudent({
          id: matchedUser.ID,
          name: matchedUser.Username.split('@')[0],
          email: matchedUser.Username,
          role: matchedUser.Role,
          course: enrolledCourses.length > 0 ? enrolledCourses.join(', ') : t('admin_alerts.not_enrolled'),
          ip: t('admin_alerts.mock_ip'),
          device: t('admin_alerts.mock_device'),
          leakSource: t('admin_alerts.mock_leak_source'),
          riskLevel: matchedUser.Role === 'admin' ? t('admin_alerts.safe') : t('admin_alerts.needs_monitoring'),
        });
        setTraceError(null);
      } else {
        setTraceError(`${t('admin_alerts.no_account_matched')} "${searchWatermarkId}"${t('admin_alerts.no_account_matched_suggestion')}`);
        setTracedStudent(null);
      }
    }, 300);
  };

  /**
   * 2. Xử lý nút "Resolve" -> Cập nhật trạng thái thành "Resolved" (Chuyển sang bảng Đã Xử Lý)
   */
  const handleResolveAlert = (alertId) => {
    setAlerts((prevAlerts) =>
      prevAlerts.map((item) =>
        item.id === alertId ? { ...item, status: 'Resolved' } : item
      )
    );

    // Cập nhật CSDL mềm
    const alertInDb = dbAlerts.find((a) => a.ID === alertId);
    if (alertInDb) alertInDb.Status = 'resolved';

    setToastMessage(`${t('admin_alerts.marked_alert')} ${alertId}${t('admin_alerts.as_resolved')} (Đã chuyển sang bảng Đã Xử Lý)`);
  };

  /**
   * 2b. Xử lý nút "Reopen" -> Cập nhật trạng thái thành "New" (Chuyển ngược lại về bảng Chưa Xử Lý)
   */
  const handleReopenAlert = (alertId) => {
    setAlerts((prevAlerts) =>
      prevAlerts.map((item) =>
        item.id === alertId ? { ...item, status: 'New' } : item
      )
    );

    // Cập nhật CSDL mềm
    const alertInDb = dbAlerts.find((a) => a.ID === alertId);
    if (alertInDb) alertInDb.Status = 'open';

    setToastMessage(`Đã hoàn tác cảnh báo ${alertId} (Đã chuyển về bảng Chưa Xử Lý)`);
  };

  /**
   * 3. Xử lý mở Modal "Ban User"
   */
  const handleOpenBanModal = (item) => {
    setSelectedUserToBan(item);
    setShowBanModal(true);
  };

  /**
   * Xác nhận khóa quyền truy cập của học viên
   */
  const handleConfirmBan = () => {
    if (!selectedUserToBan) return;

    setAlerts((prevAlerts) =>
      prevAlerts.map((item) =>
        item.studentId === selectedUserToBan.studentId
          ? { ...item, status: 'Resolved' }
          : item
      )
    );

    // Thu hồi entitlement trong CSDL mềm
    dbEntitlements.forEach((e) => {
      if (e.UserID === selectedUserToBan.studentId) {
        e.Status = 'expired';
      }
    });

    setShowBanModal(false);
    setToastMessage(
      `${t('admin_alerts.revoked_access_for')} ${selectedUserToBan.studentId} (${selectedUserToBan.studentName}).`
    );
    setSelectedUserToBan(null);
  };

  // Helper render Badge cho Risk Score
  const renderRiskScoreBadge = (score) => {
    if (score > 80) {
      return (
        <Badge bg="danger" className="px-2 py-1 fs-7">
          {score} / 100 {t('admin_alerts.high')}
        </Badge>
      );
    }
    if (score >= 50) {
      return (
        <Badge bg="warning" text="dark" className="px-2 py-1 fs-7">
          {score} / 100 {t('admin_alerts.medium')}
        </Badge>
      );
    }
    return (
      <Badge bg="info" className="px-2 py-1 fs-7">
        {score} / 100 {t('admin_alerts.low')}
      </Badge>
    );
  };

  // Helper render Badge cho Status
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'New':
        return <Badge bg="danger" className="px-2 py-1">New</Badge>;
      case 'Acknowledged':
        return <Badge bg="primary" className="px-2 py-1">Acknowledged</Badge>;
      case 'Resolved':
        return <Badge bg="success" className="px-2 py-1">Resolved</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  // Thống kê nhanh
  const totalAlerts = alerts.length;
  const newAlertsCount = alerts.filter((a) => a.status === 'New').length;
  const highRiskCount = alerts.filter((a) => a.riskScore > 80).length;

  return (
    <Container fluid className="px-3 px-xl-5 py-4 admin-anomaly-dashboard">
      {/* Header Banner */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4 pb-3 border-bottom">
        <div>
          <div className="badge-pill-soft mb-2">
            <span>{t('admin_alerts.ai_anomaly_detection_erd')}</span>
          </div>
          <h2 className="fw-bold text-dark mb-1">
            {t('admin_alerts.anomaly_alerts_board')}<span className="text-primary">{t('admin_alerts.leak_tracing')}</span>
          </h2>
          <p className="text-secondary mb-0 small">
            {t('admin_alerts.sync_desc')}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <Card className="card-clean bg-white border">
            <Card.Body className="py-3">
              <div className="text-muted small mb-1">{t('admin_alerts.total_ai_alerts')}</div>
              <h4 className="fw-bold mb-0 text-dark">{totalAlerts}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="card-clean bg-white border">
            <Card.Body className="py-3">
              <div className="text-danger small mb-1 fw-semibold">{t('admin_alerts.new_alerts')}</div>
              <h4 className="fw-bold mb-0 text-danger">{newAlertsCount}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="card-clean bg-white border">
            <Card.Body className="py-3">
              <div className="text-warning small mb-1 fw-semibold">{t('admin_alerts.high_risk')}</div>
              <h4 className="fw-bold mb-0 text-warning">{highRiskCount}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="card-clean bg-white border">
            <Card.Body className="py-3">
              <div className="text-primary small mb-1 fw-semibold">{t('admin_alerts.access_logs')}</div>
              <h4 className="fw-bold mb-0 text-primary">{dbLogs.length} {t('admin_alerts.events')}</h4>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* SECTION 1: CÔNG CỤ TRUY VẾT RÒ RỈ TỪ DẤU VÂN TAY WATERMARK */}
      <Card className="card-clean shadow-sm border rounded-4 mb-4 bg-white">
        <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="bi bi-fingerprint text-primary fs-4"></i>
            <span>{t('admin_alerts.watermark_leak_tracing_tool')}</span>
          </h5>
          <span className="badge-pill-cyan">{t('admin_alerts.search_student_db')}</span>
        </Card.Header>
        <Card.Body className="p-4">
          <p className="text-secondary small mb-3">
            {t('admin_alerts.leak_desc_1')} <strong>{t('admin_alerts.watermark_code')}</strong> {t('admin_alerts.eg')}
            <code>u-004</code>, <code>u-005</code>{t('admin_alerts.leak_desc_2')}
          </p>

          <Form onSubmit={handleTraceLeak}>
            <Row className="g-2">
              <Col md={8} lg={9}>
                <InputGroup>
                  <InputGroup.Text className="bg-light border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder={t('admin_alerts.search_placeholder')}
                    value={searchWatermarkId}
                    onChange={(e) => setSearchWatermarkId(e.target.value)}
                    className="border-start-0 form-control-clean"
                  />
                </InputGroup>
              </Col>
              <Col md={4} lg={3}>
                <Button
                  type="submit"
                  disabled={isSearching}
                  className="btn-primary-pill w-100 d-flex align-items-center justify-content-center gap-2"
                >
                  {isSearching ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      <span>{t('admin_alerts.searching')}</span>
                    </>
                  ) : (
                    <span>{t('admin_alerts.trace_identity')}</span>
                  )}
                </Button>
              </Col>
            </Row>
          </Form>

          {traceError && (
            <Alert variant="danger" className="mt-3 mb-0 small">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {traceError}
            </Alert>
          )}

          {/* KẾT QUẢ ĐỐI SOÁT WATERMARK TỪ DB */}
          {tracedStudent && (
            <div className="mt-4 p-4 rounded-4 bg-light border border-primary border-opacity-25">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                <div>
                  <Badge bg="danger" className="px-3 py-1 mb-2">
                    {t('admin_alerts.watermark_matched')}
                  </Badge>
                  <h5 className="fw-bold text-dark mb-0">
                    {tracedStudent.name} ({t('admin_alerts.code_prefix')}<code>{tracedStudent.id}</code>)
                  </h5>
                  <div className="text-secondary small">{tracedStudent.email}</div>
                </div>

                <Button
                  variant="outline-danger"
                  size="sm"
                  className="rounded-pill px-3"
                  onClick={() =>
                    handleOpenBanModal({
                      studentId: tracedStudent.id,
                      studentName: tracedStudent.name,
                    })
                  }
                >
                  <i className="bi bi-lock-fill me-1"></i>{t('admin_alerts.revoke_access')}
                </Button>
              </div>

              <Row className="g-3 small">
                <Col sm={6} md={4}>
                  <div className="text-muted">{t('admin_alerts.enrolled_courses')}</div>
                  <div className="fw-bold text-dark">{tracedStudent.course}</div>
                </Col>
                <Col sm={6} md={4}>
                  <div className="text-muted">{t('admin_alerts.ip_session')}</div>
                  <div className="fw-bold text-dark">{tracedStudent.ip}</div>
                </Col>
                <Col sm={6} md={4}>
                  <div className="text-muted">{t('admin_alerts.risk_level')}</div>
                  <div className="fw-bold text-danger">{tracedStudent.riskLevel}</div>
                </Col>
              </Row>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* SECTION 2: BẢNG CẢNH BÁO BẤT THƯỜNG AI (CHIA 2 BẢNG: CHƯA XỬ LÝ & ĐÃ XỬ LÝ) */}
      <Card className="card-clean shadow-sm border rounded-4 overflow-hidden bg-white">
        <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h5 className="mb-0 fw-bold text-dark">{t('admin_alerts.ai_anomaly_list')}</h5>
            <small className="text-secondary">Quản lý và đối soát cảnh báo phân tách theo trạng thái xử lý</small>
          </div>
          <span className="badge-pill-cyan">ERD Table: anomalyAlerts</span>
        </Card.Header>

        {/* Thanh điều khiển: Chuyển giữa 2 bảng & Tìm kiếm theo tên user */}
        <div className="p-3 border-bottom bg-light d-flex justify-content-between align-items-center flex-wrap gap-3">
          {/* 2 Tab chuyển đổi giữa 2 bảng */}
          <Nav variant="pills" activeKey={activeTableTab} onSelect={(k) => setActiveTableTab(k)} className="gap-2">
            <Nav.Item>
              <Nav.Link
                eventKey="pending"
                className={`d-flex align-items-center gap-2 px-3 py-2 fw-semibold rounded-pill ${
                  activeTableTab === 'pending'
                    ? 'bg-danger text-white shadow-sm'
                    : 'bg-white text-secondary border'
                }`}
                style={{ cursor: 'pointer' }}
              >
                <span>Chưa Xử Lý</span>
                <Badge
                  bg={activeTableTab === 'pending' ? 'light' : 'danger'}
                  text={activeTableTab === 'pending' ? 'danger' : 'light'}
                  className="rounded-pill"
                >
                  {pendingAlerts.length}
                </Badge>
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                eventKey="resolved"
                className={`d-flex align-items-center gap-2 px-3 py-2 fw-semibold rounded-pill ${
                  activeTableTab === 'resolved'
                    ? 'bg-success text-white shadow-sm'
                    : 'bg-white text-secondary border'
                }`}
                style={{ cursor: 'pointer' }}
              >
                <span>Đã Xử Lý</span>
                <Badge
                  bg={activeTableTab === 'resolved' ? 'light' : 'success'}
                  text={activeTableTab === 'resolved' ? 'success' : 'light'}
                  className="rounded-pill"
                >
                  {resolvedAlerts.length}
                </Badge>
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {/* Ô Tìm kiếm chỉ theo tên user */}
          <div style={{ maxWidth: '300px', width: '100%' }}>
            <InputGroup size="sm">
              <InputGroup.Text className="bg-white border-end-0">
                <i className="bi bi-search text-muted"></i>
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Tìm kiếm theo tên user..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="border-start-0 bg-white"
              />
              {userSearchTerm && (
                <Button
                  variant="outline-secondary"
                  onClick={() => setUserSearchTerm('')}
                  title="Xóa tìm kiếm"
                  className="border-start-0 bg-white"
                >
                  ✕
                </Button>
              )}
            </InputGroup>
          </div>
        </div>

        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="table-clean mb-0 align-middle text-nowrap">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>{t('admin_alerts.alert_id')}</th>
                  <th>{t('admin_alerts.student_id')}</th>
                  <th>{t('admin_alerts.abnormal_behavior')}</th>
                  <th>{t('admin_alerts.related_course')}</th>
                  <th style={{ width: '130px' }}>{t('admin_alerts.risk_score')}</th>
                  <th style={{ width: '150px' }}>{t('admin_alerts.time')}</th>
                  <th style={{ width: '110px' }}>{t('admin_alerts.status')}</th>
                  <th style={{ width: '180px' }} className="text-center">{t('admin_alerts.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {(activeTableTab === 'pending' ? pendingAlerts : resolvedAlerts).length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted">
                      {userSearchTerm ? (
                        <div>
                          <p className="mb-1 fw-semibold text-secondary">
                            Không tìm thấy học viên nào khớp với tên "{userSearchTerm}".
                          </p>
                          <small>Vui lòng thử tìm với từ khóa khác hoặc xóa tìm kiếm.</small>
                        </div>
                      ) : activeTableTab === 'pending' ? (
                        <div>
                          <p className="mb-1 fw-semibold text-success">
                            Không có cảnh báo nào chưa xử lý!
                          </p>
                          <small>Tất cả cảnh báo đã được giải quyết hoặc chưa phát sinh cảnh báo mới.</small>
                        </div>
                      ) : (
                        <div>
                          <p className="mb-1 fw-semibold text-secondary">
                            Chưa có cảnh báo nào ở bảng Đã Xử Lý.
                          </p>
                          <small>Bấm nút "Xử lý" ở bảng "Chưa Xử Lý" để chuyển cảnh báo sang đây.</small>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  (activeTableTab === 'pending' ? pendingAlerts : resolvedAlerts).map((item) => (
                    <tr key={item.id}>
                      <td>
                        <code>{item.id}</code>
                      </td>
                      <td>
                        <div className="fw-bold text-dark">{item.studentName}</div>
                        <small className="text-muted font-monospace">{item.studentId}</small>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{item.anomalyType}</div>
                        <small className="text-secondary text-truncate d-inline-block" style={{ maxWidth: '280px' }}>
                          {item.details}
                        </small>
                      </td>
                      <td>
                        <span className="small text-secondary">{item.courseTitle}</span>
                      </td>
                      <td>{renderRiskScoreBadge(item.riskScore)}</td>
                      <td className="small text-muted">{item.timestamp}</td>
                      <td>{renderStatusBadge(item.status)}</td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-1">
                          {activeTableTab === 'pending' ? (
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="rounded-pill px-2 d-flex align-items-center gap-1"
                              title="Đánh dấu đã xử lý (Chuyển sang bảng Đã Xử Lý)"
                              onClick={() => handleResolveAlert(item.id)}
                            >
                              <i className="bi bi-check-lg"></i>
                              <span style={{ fontSize: '0.75rem' }}>Xử lý</span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="rounded-pill px-2 d-flex align-items-center gap-1"
                              title="Mở lại (Chuyển về bảng Chưa Xử Lý)"
                              onClick={() => handleReopenAlert(item.id)}
                            >
                              <i className="bi bi-arrow-counterclockwise"></i>
                              <span style={{ fontSize: '0.75rem' }}>Mở lại</span>
                            </Button>
                          )}
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="rounded-pill px-2"
                            title={t('admin_alerts.block_student_rights')}
                            onClick={() => handleOpenBanModal(item)}
                          >
                            <i className="bi bi-shield-x"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>

        <Card.Footer className="bg-light border-top py-3 px-4 d-flex justify-content-between align-items-center text-muted small flex-wrap gap-2">
          <span>
            Đang hiển thị <strong>{(activeTableTab === 'pending' ? pendingAlerts : resolvedAlerts).length}</strong> cảnh báo trong bảng <strong>{activeTableTab === 'pending' ? 'Chưa Xử Lý' : 'Đã Xử Lý'}</strong>
            {userSearchTerm && ` (Lọc theo tên user: "${userSearchTerm}")`}.
          </span>
          <span className="text-secondary">
            Tổng cộng: <strong>{alerts.length}</strong> cảnh báo trên toàn hệ thống.
          </span>
        </Card.Footer>
      </Card>

      {/* MODAL KHÓA TÀI KHOẢN */}
      <Modal show={showBanModal} onHide={() => setShowBanModal(false)} centered backdrop="static">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-6 fw-bold text-danger">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{t('admin_alerts.confirm_revoke_access')}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4">
          <p className="mb-2">
            {t('admin_alerts.confirm_revoke_msg')}
          </p>
          <div className="p-3 bg-light rounded-3 border">
            <strong>{selectedUserToBan?.studentName}</strong> ({t('admin_alerts.code_prefix')}<code>{selectedUserToBan?.studentId}</code>)
          </div>
          <small className="text-danger mt-2 d-block">
            {t('admin_alerts.revoke_warning')}
          </small>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={() => setShowBanModal(false)} className="rounded-pill px-3">
            {t('common.cancel')}
          </Button>
          <Button variant="danger" size="sm" onClick={handleConfirmBan} className="rounded-pill px-3">
            {t('admin_alerts.confirm_revoke')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* TOAST THÔNG BÁO */}
      <ToastContainer position="bottom-end" className="p-3 position-fixed" style={{ zIndex: 1090 }}>
        {toastMessage && (
          <Toast onClose={() => setToastMessage(null)} delay={4000} autohide bg="dark">
            <Toast.Header>
              <i className="bi bi-bell-fill text-primary me-2"></i>
              <strong className="me-auto text-dark">{t('admin_alerts.ai_security_system')}</strong>
              <small>{t('admin_alerts.just_now')}</small>
            </Toast.Header>
            <Toast.Body className="text-white small">{toastMessage}</Toast.Body>
          </Toast>
        )}
      </ToastContainer>
    </Container>
  );
}
