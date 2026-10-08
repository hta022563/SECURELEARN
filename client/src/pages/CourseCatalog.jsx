import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  InputGroup,
  Form,
  Modal,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { courses, users } from '../data/mockDatabase';
import { checkCourseAccess, getEntitledCourseIds } from '../services/entitlementService';
import { getCourses, searchCourses } from '../services/courseService';
import CreateCourseModal from '../components/CreateCourseModal';

/**
 * =============================================================================
 * PAGE: CourseCatalog (Danh Mục Khóa Học Toàn Diện - 100% Dữ Liệu Mềm)
 * =============================================================================
 * - Đọc trực tiếp từ Backend API (GET /allcourses, GET /course/search?title=)
 * - Kiểm tra quyền Entitlement: khóa học chưa được cấp quyền KHÔNG THỂ xem video bài giảng
 * - Chỉ khóa học trong "Khóa học của tôi" (đã ghi danh active/completed) mới được phép vào học
 * =============================================================================
 */
export default function CourseCatalog() {
  const { lang } = useParams();
  const { t } = useTranslation();
  const [courseList, setCourseList] = useState(courses);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'ENTITLED' | 'UNENTITLED'
  const [blockedModalCourse, setBlockedModalCourse] = useState(null);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      const fetchPromise = searchTerm.trim()
        ? searchCourses(searchTerm.trim())
        : getCourses();

      fetchPromise
        .then((data) => {
          if (isMounted && Array.isArray(data)) {
            setCourseList(data);
          }
        })
        .catch((err) => console.warn('[CourseCatalog] Lỗi nạp khóa học:', err));
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Danh sách ID các khóa học đã được cấp quyền cho người dùng hiện tại
  const entitledIds = useMemo(() => {
    return getEntitledCourseIds(user);
  }, [user]);

  // Lọc mềm theo từ khóa tìm kiếm và trạng thái quyền
  const filteredCourses = courseList.filter((course) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      course.Title.toLowerCase().includes(term) ||
      course.Description.toLowerCase().includes(term);

    if (!matchesSearch) return false;

    const hasAccess = entitledIds.includes(course.ID);
    if (filterType === 'ENTITLED') return hasAccess;
    if (filterType === 'UNENTITLED') return !hasAccess;
    return true;
  });

  // Xử lý khi nhấn vào khóa học
  const handleCourseAction = (course) => {
    const access = checkCourseAccess(user, course.ID);

    if (access.hasAccess) {
      // Giảng viên -> Chuyển vào trang Preview bài giảng của Giảng viên
      if (user?.role === 'Instructor') {
        navigate(`/instructor/preview/${course.ID}`);
      } else {
        // Học viên & Quản trị viên -> Chuyển vào trình phát video
        navigate(`/student/player/${course.ID}`);
      }
    } else {
      // Chưa được cấp quyền xem -> Chặn và hiển thị thông báo chính sách DRM
      setBlockedModalCourse({
        ...course,
        reasonMessage: access.message,
      });
    }
  };

  return (
    <div className="py-5">
      <Container>
        {/* =====================================================================
         * 1. HEADER BANNER
         * ===================================================================== */}
        <div className="text-center mb-5 pb-2">
          <h1 className="display-5 fw-extrabold text-dark mb-2">
            {t('catalog.title')}<span className="text-primary">{t('catalog.title_highlight')}</span>
          </h1>
          <p className="text-secondary mx-auto" style={{ maxWidth: '650px' }}>
            {t('catalog.subtitle')}
          </p>
        </div>

        {/* =====================================================================
         * 2. BỘ TÌM KIẾM ĐỘNG & BỘ LỌC QUYỀN TRUY CẬP
         * ===================================================================== */}
        <div className="card-clean border-0 shadow-sm p-4 mb-4 bg-white">
          <Row className="g-3 align-items-center">
            <Col lg={6} md={6}>
              <InputGroup>
                <InputGroup.Text className="bg-light border-light-subtle text-muted">
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder={t('catalog.search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-control-clean border-start-0"
                />
                {searchTerm && (
                  <Button
                    variant="outline-secondary"
                    onClick={() => setSearchTerm('')}
                    className="border-light-subtle"
                  >
                    <i className="bi bi-x"></i>
                  </Button>
                )}
              </InputGroup>
            </Col>

            <Col lg={6} md={6} className="d-flex justify-content-md-end gap-2 flex-wrap align-items-center">
              {isAuthenticated && (user?.role === 'Instructor' || user?.role === 'Administrator') && (
                <Button
                  variant="primary"
                  size="sm"
                  className="rounded-pill px-3 py-1 fw-medium me-md-2"
                  onClick={() => setShowCreateCourseModal(true)}
                >
                  <i className="bi bi-plus-circle me-1"></i>{t('catalog.add_course')}
                </Button>
              )}
              <Button
                variant={filterType === 'ALL' ? 'primary' : 'outline-secondary'}
                size="sm"
                className="rounded-pill px-3"
                onClick={() => setFilterType('ALL')}
              >
                {t('catalog.filter_all')} ({courseList.length})
              </Button>
              {isAuthenticated && user?.role === 'Student' && (
                <>
                  <Button
                    variant={filterType === 'ENTITLED' ? 'success' : 'outline-success'}
                    size="sm"
                    className="rounded-pill px-3"
                    onClick={() => setFilterType('ENTITLED')}
                  >
                    {t('catalog.filter_entitled')} ({entitledIds.length})
                  </Button>
                  <Button
                    variant={filterType === 'UNENTITLED' ? 'secondary' : 'outline-secondary'}
                    size="sm"
                    className="rounded-pill px-3"
                    onClick={() => setFilterType('UNENTITLED')}
                  >
                    {t('catalog.filter_unentitled')} ({courses.length - entitledIds.length})
                  </Button>
                </>
              )}
            </Col>
          </Row>
        </div>

        {/* =====================================================================
         * 3. LƯỚI KHÓA HỌC (COURSES GRID - DỮ LIỆU MỀM)
         * ===================================================================== */}
        <Row className="g-4 mb-5">
          {filteredCourses.length === 0 ? (
            <Col xs={12} className="text-center py-5 my-4 card-clean bg-white p-5 border">
              <i className="bi bi-search fs-1 d-block mb-3 text-muted opacity-50"></i>
              <h5 className="text-dark fw-bold mb-2">{t('catalog.no_results')}</h5>
              <p className="text-secondary small mb-4">
                {t('catalog.no_results_desc')}
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('ALL');
                }}
                className="btn-primary-pill"
              >
                {t('catalog.clear_filter')}
              </Button>
            </Col>
          ) : (
            filteredCourses.map((course) => {
              const instructorUser = users.find((u) => u.ID === course.Owner);
              const isEntitled = entitledIds.includes(course.ID);

              return (
                <Col key={course.ID} xs={12} md={6} lg={4}>
                  <Card
                    className={`h-100 card-clean card-clean-hover overflow-hidden d-flex flex-column border-0 shadow-sm ${
                      !isEntitled ? 'border-light' : ''
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleCourseAction(course)}
                  >
                    {/* Header Khóa học */}
                    <div
                      className={`p-4 border-bottom d-flex flex-column justify-content-between ${
                        isEntitled ? 'bg-primary bg-opacity-10' : 'bg-light'
                      }`}
                      style={{ minHeight: '140px' }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        {isEntitled ? (
                          <Badge bg="success" className="px-3 py-2 rounded-pill fw-semibold shadow-sm">
                            {t('catalog.entitled')}
                          </Badge>
                        ) : (
                          <Badge bg="secondary" className="px-3 py-2 rounded-pill fw-semibold bg-opacity-75">
                            {t('catalog.not_entitled')}
                          </Badge>
                        )}
                        <span className="small text-muted font-monospace">
                          <code>{course.ID}</code>
                        </span>
                      </div>

                      {course["Creation Time"] && (
                        <small className="text-secondary mt-3">
                          <i className="bi bi-calendar-event me-1"></i>
                          {t('catalog.created_at')} {course["Creation Time"].split('T')[0]}
                        </small>
                      )}
                    </div>

                    <Card.Body className="d-flex flex-column p-4">
                      <Card.Title className="fw-bold fs-5 text-dark mb-2 text-truncate" title={course.Title}>
                        {course.Title}
                      </Card.Title>

                      <Card.Text className="text-secondary small mb-3 flex-grow-1" style={{ minHeight: '60px' }}>
                        {course.Description}
                      </Card.Text>

                      {/* Giảng viên */}
                      {instructorUser && (
                        <div className="d-flex justify-content-between text-muted small mb-3 border-top pt-2">
                          <span>
                            <i className="bi bi-person-fill text-primary me-1"></i>
                            {instructorUser.Username}
                          </span>
                        </div>
                      )}

                      {/* Học phí & Nút hành động */}
                      <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                        <div>
                          <small className="text-muted d-block">{t('catalog.tuition')}</small>
                          <span className="fw-bold fs-5 text-primary">
                            {course.Price === 0 ? t('catalog.free') : `${course.Price?.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')} ${lang === 'vi' ? 'đ' : 'VND'}`}
                          </span>
                        </div>

                        {isEntitled ? (
                          <Button
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCourseAction(course);
                            }}
                            className="btn-primary-pill d-flex align-items-center gap-2 small px-3 py-2"
                          >
                            <i className="bi bi-play-circle-fill"></i>
                            <span>{t('catalog.start_learning')}</span>
                          </Button>
                        ) : (
                          <Button
                            variant="light"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCourseAction(course);
                            }}
                            className="btn-unentitled-pill d-flex align-items-center gap-2 small px-3 py-2"
                          >
                            <i className="bi bi-lock-fill"></i>
                            <span>{t('catalog.not_entitled')}</span>
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })
          )}
        </Row>
      </Container>

      {/* =====================================================================
       * 4. MODAL THÔNG BÁO CHƯA ĐƯỢC CẤP QUYỀN XEM KHÓA HỌC
       * ===================================================================== */}
      <Modal
        show={Boolean(blockedModalCourse)}
        onHide={() => setBlockedModalCourse(null)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-bottom-0 pb-0">
          <Modal.Title className="fs-5 fw-bold text-dark">
            {t('catalog.modal_denied_title')}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="pt-3">
          <div className="alert alert-warning border-0 bg-warning bg-opacity-10 text-dark p-3 rounded-3 mb-3">
            <div className="fw-bold mb-1">{blockedModalCourse?.Title}</div>
            <small className="text-muted font-monospace">ID: {blockedModalCourse?.ID}</small>
          </div>

          <p className="text-secondary small mb-3 leading-relaxed">
            {t('catalog.modal_denied_desc')}
          </p>

          <div className="p-3 bg-light rounded-3 border small mb-2">
            <i className="bi bi-info-circle-fill text-primary me-2"></i>
            {t('catalog.modal_denied_policy')}
          </div>
        </Modal.Body>

        <Modal.Footer className="border-top-0 pt-0">
          <Button
            variant="light"
            onClick={() => setBlockedModalCourse(null)}
            className="rounded-pill px-3"
          >
            {t('common.close')}
          </Button>

          {isAuthenticated && user?.role === 'Student' ? (
            <Button
              variant="primary"
              onClick={() => {
                setBlockedModalCourse(null);
                navigate(`/${lang}/student/courses`);
              }}
              className="btn-primary-pill d-flex align-items-center gap-2 px-3"
            >
              <i className="bi bi-mortarboard-fill"></i>
              <span>{t('common.my_courses')}</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                setBlockedModalCourse(null);
                navigate(`/${lang}/login`);
              }}
              className="btn-primary-pill px-3"
            >
              {t('common.login')}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* MODAL TẠO KHÓA HỌC MỚI */}
      <CreateCourseModal
        show={showCreateCourseModal}
        onHide={() => setShowCreateCourseModal(false)}
        onCourseCreated={(newCourse) => {
          setCourseList((prev) => [newCourse, ...prev]);
        }}
      />
    </div>
  );
}
