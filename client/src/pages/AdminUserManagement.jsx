import React, { useState, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Modal,
  Form,
  FloatingLabel,
} from 'react-bootstrap';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import {
  users as dbUsers,
  courses as dbCourses,
  entitlements as dbEntitlements,
} from '../data/mockDatabase';

/**
 * =============================================================================
 * PAGE: AdminUserManagement (100% Dữ Liệu Mềm Từ CSDL Chuẩn ERD)
 * =============================================================================
 * Quản trị người dùng & Cấp quyền khóa học (User Entitlement):
 * - Đọc và đồng bộ động trực tiếp từ các bảng users, courses, entitlements
 * - Cấp quyền (Assign Course) cập nhật trực tiếp vào bảng entitlements
 * - Thêm mới User tuân thủ cấu trúc thực thể User (ID, Username, Password, Role, CreationTime)
 * =============================================================================
 */
export default function AdminUserManagement() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  // Dữ liệu mềm được đồng bộ thời gian thực từ mockDatabase
  const [usersList, setUsersList] = useState(dbUsers);
  const [entitlementsList, setEntitlementsList] = useState(dbEntitlements);

  // State Modal 1: Tạo Người Dùng Mới
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Student');

  // State Modal 2: Cấp Quyền Khóa Học (Assign Course)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [tempAssignedCourses, setTempAssignedCourses] = useState([]);

  // Danh mục khóa học mềm có sẵn trong CSDL
  const availableCourses = useMemo(() => {
    return dbCourses.map((c) => ({
      id: c.ID,
      code: c.ID.toUpperCase(),
      name: `${c.ID.toUpperCase()}: ${c.Title}`,
      price: c.Price,
    }));
  }, []);

  // Chuyển đổi Role sang format hiển thị
  const formatRole = (role) => {
    const r = (role || '').toLowerCase();
    if (r === 'admin' || r === 'administrator') return 'Administrator';
    if (r === 'instructor') return 'Instructor';
    return 'Student';
  };

  /* =========================================================================
   * LOGIC MODAL 1: TẠO NGƯỜI DÙNG MỚI
   * ========================================================================= */
  const handleOpenAddModal = () => {
    setNewEmail('');
    setNewPassword('');
    setNewRole('Student');
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };

  const handleCreateUser = (e) => {
    e.preventDefault();

    if (!newEmail.trim() || !newPassword) {
      showToast(t('admin_users.missing_email_password'), 'warning', t('admin_users.missing_info'));
      return;
    }

    const emailTrimmed = newEmail.trim().toLowerCase();

    // Kiểm tra trùng username
    if (dbUsers.some((u) => u.Username.toLowerCase() === emailTrimmed)) {
      showToast(t('admin_users.username_exists'), 'danger', t('admin_users.duplicate'));
      return;
    }

    const nextNumber = dbUsers.length + 1;
    const newUserId = `u-${String(nextNumber).padStart(3, '0')}`;
    const rawRole = newRole === 'Administrator' ? 'admin' : newRole === 'Instructor' ? 'instructor' : 'student';

    const newUser = {
      ID: newUserId,
      Username: emailTrimmed,
      Password: `hashed_${newPassword}`,
      Role: rawRole,
      CreationTime: new Date().toISOString(),
    };

    // Cập nhật CSDL mềm
    dbUsers.push(newUser);
    setUsersList([...dbUsers]);

    // Nếu tạo Student thì cấp quyền mặc định khóa đầu tiên
    if (rawRole === 'student' && dbCourses.length > 0) {
      const defaultEntitlement = {
        UserID: newUserId,
        CoursesID: dbCourses[0].ID,
        Status: 'active',
        'Join Date': new Date().toISOString(),
        'Completion Date': null,
      };
      dbEntitlements.push(defaultEntitlement);
      setEntitlementsList([...dbEntitlements]);
    }

    showToast(`${t('admin_users.created_account')} "${emailTrimmed}" (${newRole}) ${t('admin_users.success_suffix')}`, 'success', t('admin_users.success'));
    handleCloseAddModal();
  };

  /* =========================================================================
   * LOGIC MODAL 2: CẤP QUYỀN KHÓA HỌC CHO HỌC VIÊN (ENTITLEMENT)
   * ========================================================================= */
  const handleOpenAssignModal = (student) => {
    setSelectedStudent(student);
    const assignedIds = entitlementsList
      .filter((e) => e.UserID === student.ID && (e.Status === 'active' || e.Status === 'completed'))
      .map((e) => e.CoursesID);
    setTempAssignedCourses(assignedIds);
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedStudent(null);
    setTempAssignedCourses([]);
  };

  const handleToggleCourseCheckbox = (courseId) => {
    setTempAssignedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSaveAssignedCourses = (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const studentId = selectedStudent.ID;

    // Cập nhật bảng dbEntitlements
    dbCourses.forEach((c) => {
      const isSelected = tempAssignedCourses.includes(c.ID);
      const existingIdx = dbEntitlements.findIndex(
        (e) => e.UserID === studentId && e.CoursesID === c.ID
      );

      if (isSelected) {
        if (existingIdx !== -1) {
          dbEntitlements[existingIdx].Status = 'active';
        } else {
          dbEntitlements.push({
            UserID: studentId,
            CoursesID: c.ID,
            Status: 'active',
            'Join Date': new Date().toISOString(),
            'Completion Date': null,
          });
        }
      } else {
        if (existingIdx !== -1) {
          dbEntitlements[existingIdx].Status = 'expired';
        }
      }
    });

    setEntitlementsList([...dbEntitlements]);

    showToast(
      `${t('admin_users.updated_entitlements')} ${tempAssignedCourses.length} ${t('admin_users.courses_for_student')} ${selectedStudent.Username}!`,
      'success',
      t('admin_users.grant_success')
    );
    handleCloseAssignModal();
  };

  /* =========================================================================
   * HELPER RENDER BADGE
   * ========================================================================= */
  const renderRoleBadge = (role) => {
    const r = formatRole(role);
    switch (r) {
      case 'Administrator':
        return <Badge bg="danger" className="rounded-pill px-3 py-1">Admin</Badge>;
      case 'Instructor':
        return <Badge bg="warning" text="dark" className="rounded-pill px-3 py-1">Instructor</Badge>;
      case 'Student':
      default:
        return <Badge bg="primary" className="rounded-pill px-3 py-1">Student</Badge>;
    }
  };

  // Thống kê nhanh từ dữ liệu mềm
  const totalUsers = usersList.length;
  const studentCount = usersList.filter((u) => formatRole(u.Role) === 'Student').length;
  const instructorCount = usersList.filter((u) => formatRole(u.Role) === 'Instructor').length;
  const adminCount = usersList.filter((u) => formatRole(u.Role) === 'Administrator').length;

  return (
    <Container fluid className="px-3 px-xl-5 py-4 admin-user-management-page">
      {/* Header Banner & Nút Add New User */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4 pb-3 border-bottom">
        <div>
          <div className="badge-pill-soft mb-2">
            <i className="bi bi-people-fill text-primary"></i>
            <span>{t('admin_users.user_management_erd')}</span>
          </div>
          <h2 className="fw-bold text-dark mb-1">
            {t('admin_users.user_management_title')} <span className="text-primary">{t('admin_users.user_entitlement')}</span>
          </h2>
          <p className="text-secondary mb-0 small">
            {t('admin_users.sync_desc')}
          </p>
        </div>

        <div>
          <Button
            onClick={handleOpenAddModal}
            className="btn-primary-pill d-flex align-items-center gap-2"
          >
            <i className="bi bi-person-plus-fill fs-5"></i>
            <span>{t('admin_users.add_user')}</span>
          </Button>
        </div>
      </div>

      {/* Thống kê tài khoản mềm */}
      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <Card className="card-clean bg-white border">
            <Card.Body className="py-3">
              <div className="text-muted small mb-1">{t('admin_users.total_accounts')}</div>
              <h4 className="fw-bold mb-0 text-dark">{totalUsers}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="card-clean bg-white border">
            <Card.Body className="py-3">
              <div className="text-primary small mb-1 fw-semibold">{t('admin_users.students')}</div>
              <h4 className="fw-bold mb-0 text-primary">{studentCount}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="card-clean bg-white border">
            <Card.Body className="py-3">
              <div className="text-warning small mb-1 fw-semibold">{t('admin_users.instructors')}</div>
              <h4 className="fw-bold mb-0 text-warning">{instructorCount}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="card-clean bg-white border">
            <Card.Body className="py-3">
              <div className="text-danger small mb-1 fw-semibold">{t('admin_users.admins')}</div>
              <h4 className="fw-bold mb-0 text-danger">{adminCount}</h4>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Bảng Danh Sách Người Dùng (Table) */}
      <Card className="card-clean shadow-sm border rounded-4 overflow-hidden bg-white">
        <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold text-dark">{t('admin_users.system_user_list')}</h5>
          <span className="badge-pill-cyan">ERD Table: users &amp; entitlements</span>
        </Card.Header>

        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="table-clean mb-0 align-middle text-nowrap">
              <thead>
                <tr>
                  <th style={{ width: '90px' }}>User ID</th>
                  <th>Username / Email</th>
                  <th style={{ width: '130px' }}>Role</th>
                  <th style={{ width: '120px' }}>{t('admin_users.creation_date')}</th>
                  <th>{t('admin_users.entitled_courses')}</th>
                  <th style={{ width: '150px' }} className="text-center">{t('admin_users.actions')}</th>
                </tr>
              </thead>

              <tbody>
                {usersList.map((item) => {
                  const roleFormatted = formatRole(item.Role);
                  const isStudent = roleFormatted === 'Student';
                  const activeEntitlements = entitlementsList.filter(
                    (e) => e.UserID === item.ID && (e.Status === 'active' || e.Status === 'completed')
                  );

                  return (
                    <tr key={item.ID}>
                      {/* User ID */}
                      <td className="text-muted small">
                        <code>{item.ID}</code>
                      </td>

                      {/* Username / Email */}
                      <td className="fw-bold text-dark">
                        {item.Username}
                      </td>

                      {/* Role */}
                      <td>{renderRoleBadge(item.Role)}</td>

                      {/* Ngày Tạo */}
                      <td className="text-secondary small">
                        {item.CreationTime ? item.CreationTime.split('T')[0] : '—'}
                      </td>

                      {/* Cột hiển thị số lượng khóa học được cấp quyền */}
                      <td>
                        {isStudent ? (
                          <div className="d-flex align-items-center gap-1 flex-wrap">
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">
                              {activeEntitlements.length} {t('admin_users.courses')}
                            </span>
                            {activeEntitlements.map((ent) => (
                              <span key={ent.CoursesID} className="badge bg-light text-dark border rounded-pill">
                                {ent.CoursesID.toUpperCase()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted small fst-italic">{t('admin_users.full_system_access')}</span>
                        )}
                      </td>

                      {/* Actions: Nút Assign Course cho Role là Student */}
                      <td className="text-center">
                        {isStudent ? (
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleOpenAssignModal(item)}
                            className="rounded-pill px-3 fw-medium"
                          >
                            <i className="bi bi-key-fill me-1"></i>{t('admin_users.grant_course_access')}
                          </Button>
                        ) : (
                          <span className="text-muted small">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card.Body>

        <Card.Footer className="bg-light border-top py-3 px-4 text-muted small">
          {t('admin_users.displaying')} <strong>{usersList.length}</strong> {t('admin_users.accounts_in_db')}
        </Card.Footer>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL 1: TẠO NGƯỜI DÙNG MỚI (ADD NEW USER)                                 */}
      {/* ========================================================================= */}
      <Modal
        show={showAddModal}
        onHide={handleCloseAddModal}
        centered
        backdrop="static"
        contentClassName="bg-white border rounded-4 shadow-lg overflow-hidden"
      >
        <Modal.Header closeButton className="border-bottom bg-light">
          <Modal.Title className="fs-5 fw-bold text-dark">
            <i className="bi bi-person-plus-fill text-primary me-2"></i>{t('admin_users.add_new_user')}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleCreateUser}>
          <Modal.Body className="py-4">
            {/* Email / Username */}
            <FloatingLabel controlId="addUserEmail" label={t('admin_users.email_username_required')} className="mb-3 text-secondary">
              <Form.Control
                type="email"
                placeholder="user@securelearn.edu.vn"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="form-control-clean"
                autoFocus
              />
            </FloatingLabel>

            {/* Mật Khẩu */}
            <FloatingLabel controlId="addUserPassword" label={t('admin_users.initial_password_required')} className="mb-3 text-secondary">
              <Form.Control
                type="password"
                placeholder={t('admin_users.password_placeholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="form-control-clean"
              />
            </FloatingLabel>

            {/* Chọn Role */}
            <FloatingLabel controlId="addUserRole" label={t('admin_users.role')} className="mb-2 text-secondary">
              <Form.Select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="form-control-clean"
              >
                <option value="Student">{t('admin_users.role_student')}</option>
                <option value="Instructor">{t('admin_users.role_instructor')}</option>
                <option value="Administrator">{t('admin_users.role_admin')}</option>
              </Form.Select>
            </FloatingLabel>
          </Modal.Body>

          <Modal.Footer className="border-top bg-light">
            <Button variant="outline-secondary" size="sm" onClick={handleCloseAddModal} className="rounded-pill px-3">
              {t('common.cancel')}
            </Button>
            <Button size="sm" type="submit" className="btn-primary-pill px-4">
              {t('admin_users.save_user')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: CẤP QUYỀN KHÓA HỌC (ASSIGN COURSES TO STUDENT)                    */}
      {/* ========================================================================= */}
      <Modal
        show={showAssignModal}
        onHide={handleCloseAssignModal}
        centered
        backdrop="static"
        size="lg"
        contentClassName="bg-white border rounded-4 shadow-lg overflow-hidden"
      >
        <Modal.Header closeButton className="border-bottom bg-light">
          <Modal.Title className="fs-5 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="bi bi-shield-lock-fill text-primary"></i>
            <span>{t('admin_users.grant_access_entitlement')}</span>
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSaveAssignedCourses}>
          <Modal.Body className="p-4">
            <div className="alert alert-info bg-primary bg-opacity-10 border-0 text-dark small mb-4 rounded-3 d-flex align-items-center gap-2">
              <i className="bi bi-info-circle-fill text-primary fs-5"></i>
              <div>
                {t('admin_users.granting_access_for')} <strong>{selectedStudent?.Username}</strong> {t('admin_users.code_prefix')}
                <code>{selectedStudent?.ID}</code>).
              </div>
            </div>

            <p className="fw-bold text-dark small mb-3">
              {t('admin_users.select_courses_desc')}
            </p>

            <div className="d-flex flex-column gap-2 mb-3">
              {availableCourses.map((c) => {
                const isChecked = tempAssignedCourses.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => handleToggleCourseCheckbox(c.id)}
                    className={`p-3 rounded-3 border d-flex justify-content-between align-items-center cursor-pointer transition ${
                      isChecked
                        ? 'border-primary bg-primary bg-opacity-10 shadow-sm'
                        : 'border-light-subtle bg-white hover-bg-light'
                    }`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex align-items-center gap-3">
                      <Form.Check
                        type="checkbox"
                        id={`course-check-${c.id}`}
                        checked={isChecked}
                        onChange={() => {}}
                        className="fs-5 m-0"
                      />
                      <div>
                        <div className="fw-bold text-dark">{c.name}</div>
                        <small className="text-secondary">
                          {t('admin_users.course_code')} <code>{c.id}</code> • {t('admin_users.tuition_fee')}
                          {c.price ? `${c.price.toLocaleString('vi-VN')} đ` : t('admin_users.free')}
                        </small>
                      </div>
                    </div>

                    <Badge bg={isChecked ? 'primary' : 'secondary'} className="rounded-pill px-3 py-1">
                      {isChecked ? t('admin_users.granted') : t('admin_users.not_granted')}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Modal.Body>

          <Modal.Footer className="border-top bg-light">
            <Button variant="outline-secondary" size="sm" onClick={handleCloseAssignModal} className="rounded-pill px-3">
              {t('common.cancel')}
            </Button>
            <Button size="sm" type="submit" className="btn-primary-pill px-4">
              {t('admin_users.save_access_rights')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
