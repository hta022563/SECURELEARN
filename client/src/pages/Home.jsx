import React, { useState, useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container, Row, Col, Card, Button, Badge, Modal } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { courses, users, entitlements } from '../data/mockDatabase';
import { checkCourseAccess, getEntitledCourseIds } from '../services/entitlementService';
import LearningTimeline from '../components/LearningTimeline';

// Danh sách câu hỏi thường gặp về SecureLearn (Bản quyền số, DRM, Mã hóa HLS & Hệ thống AI)
const FAQ_ITEMS = [
  {
    question: 'Khóa học tại SecureLearn được bảo vệ bản quyền như thế nào?',
    answer: 'Toàn bộ video bài giảng tại SecureLearn được mã hóa phân đoạn theo chuẩn HLS AES-128. Mỗi phân đoạn đều yêu cầu khóa giải mã bí mật được cấp phát theo phiên (session) hợp lệ, kết hợp với chữ ký số Signed URL ngăn chặn hoàn toàn việc tải trộm hay trích xuất qua DevTools và tiện ích mở rộng trình duyệt.',
  },
  {
    question: 'Watermark động hiển thị trên màn hình video có tác dụng gì?',
    answer: 'Trong suốt quá trình phát video, hệ thống tự động hiển thị mờ mã định danh cá nhân (StudentID / Timestamp) chuyển động ngẫu nhiên trên màn hình phát. Nếu có hành vi quay lén màn hình để phát tán ra ngoài, hệ thống sẽ truy vết chính xác nguồn gốc tài khoản để xử lý vi phạm bản quyền.',
  },
  {
    question: 'Tôi có thể tải video về máy để xem khi không có mạng (offline) không?',
    answer: 'Để bảo vệ an toàn tuyệt đối tài sản trí tuệ và quyền tác giả của Giảng viên, video bài giảng chỉ có thể phát trực tuyến bảo mật trên nền tảng SecureLearn thông qua trình phát DRM chuyên dụng. Nền tảng được tối ưu hóa qua Cloudflare R2 CDN giúp bạn xem mượt mà với độ trễ thấp ngay cả khi kết nối mạng không ổn định.',
  },
  {
    question: 'Hệ thống AI Anomaly Detection (Isolation Forest) hoạt động ra sao?',
    answer: 'Thuật toán Machine Learning Isolation Forest liên tục phân tích nhật ký truy cập (Access Log) theo thời gian thực nhằm phát hiện các hành vi bất thường như: chia sẻ tài khoản, đăng nhập đồng thời từ nhiều địa chỉ IP khác nhau, hoặc tua bài giảng bất thường. Khi phát hiện rủi ro, hệ thống sẽ lập tức cảnh báo và kích hoạt biện pháp bảo vệ tài khoản của bạn.',
  },
  {
    question: 'Làm thế nào để được cấp quyền xem một khóa học sau khi đăng ký?',
    answer: 'Khi bạn đăng ký khóa học thành công, hệ thống quản trị sẽ kích hoạt quyền truy cập (Entitlement) tương ứng cho tài khoản. Bạn chỉ cần điều hướng đến mục "Khóa học của tôi" là có thể truy cập ngay vào toàn bộ các chương và video bài giảng có bản quyền.',
  },
  {
    question: 'Giảng viên có thể đăng tải và quản lý khóa học bảo mật trên SecureLearn như thế nào?',
    answer: 'Giảng viên có Studio quản lý riêng để tải lên bài giảng. Hệ thống tự động mã hóa và lưu trữ an toàn trên hạ tầng Cloudflare R2, đồng thời cung cấp công cụ xem trước (Preview) nội dung và theo dõi số lượng học viên ghi danh theo thời gian thực.',
  },
  {
    question: 'Sau khi hoàn thành khóa học, tôi có nhận được chứng chỉ xác thực không?',
    answer: 'Có. Khi hoàn thành 100% thời lượng bài giảng và các đồ án thực chiến, học viên sẽ được cấp Chứng nhận số kèm mã định danh duy nhất. Nhà tuyển dụng và doanh nghiệp có thể tra cứu và xác thực tính hợp lệ của chứng chỉ trực tiếp trên cổng thông tin SecureLearn.',
  },
];

/**
 * =============================================================================
 * PAGE: Home (Trang Chủ - 100% Dữ Liệu Mềm)
 * =============================================================================
 */
export default function Home() {
  const { lang } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [blockedModalCourse, setBlockedModalCourse] = useState(null);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const [showAllFaq, setShowAllFaq] = useState(false);

  // Thống kê động (100% dữ liệu mềm từ CSDL mockDatabase)
  const totalCourses = courses?.length || 0;
  const totalEnrollments = entitlements?.length || 0;

  // Lọc số câu hỏi hiển thị
  const visibleFaqs = showAllFaq ? FAQ_ITEMS : FAQ_ITEMS.slice(0, 5);

  // Danh sách ID các khóa học đã được cấp quyền cho người dùng hiện tại
  const entitledIds = useMemo(() => {
    return getEntitledCourseIds(user);
  }, [user]);

  // Chỉ hiển thị 3 khóa học mới nhất — sắp xếp mềm theo "Creation Time" giảm dần
  const latestCourses = [...courses]
    .sort((a, b) => new Date(b["Creation Time"]) - new Date(a["Creation Time"]))
    .slice(0, 3);

  const handleCourseAction = (course) => {
    const access = checkCourseAccess(user, course.ID);

    if (access.hasAccess) {
      if (user?.role === 'Instructor') {
        navigate(`/instructor/preview/${course.ID}`);
      } else {
        navigate(`/student/player/${course.ID}`);
      }
    } else {
      setBlockedModalCourse({
        ...course,
        reasonMessage: access.message,
      });
    }
  };

  return (
    <div className="position-relative py-5">
      <Container className="position-relative">
        {/* =====================================================================
         * 1. HERO SECTION (SECURELEARN EXCLUSIVE - BẢN QUYỀN SỐ & E-LEARNING)
         * ===================================================================== */}
        <Row className="align-items-center mb-5 pb-5 g-5">
          <Col lg={7}>
            <div className="badge-pill-soft mb-3">
              <span>{t('home.hero_badge')}</span>
            </div>

            <h1 className="display-4 fw-extrabold mb-3 text-dark">
              {t('home.hero_title')}<span className="text-primary">{t('home.hero_title_highlight')}</span>
            </h1>

            <p className="text-secondary fs-5 mb-4" style={{ lineHeight: '1.7' }}>
              {t('home.hero_desc')}
            </p>

            <div className="d-flex flex-wrap gap-3">
              {!isAuthenticated ? (
                <>
                  <Link to={`/${lang}/register`} className="btn-primary-pill text-decoration-none">
                    {t('common.register')}
                  </Link>
                  <Link to={`/${lang}/catalog`} className="btn-secondary-pill text-decoration-none d-flex align-items-center gap-2">
                    <span>{t('common.explore_courses')}</span>
                    <i className="bi bi-arrow-right"></i>
                  </Link>
                </>
              ) : (
                <>
                  {user?.role === 'Student' && (
                    <Link to={`/${lang}/student/courses`} className="btn-primary-pill text-decoration-none d-flex align-items-center gap-2">
                      <i className="bi bi-mortarboard-fill"></i>
                      <span>{t('common.my_courses')}</span>
                    </Link>
                  )}
                  {user?.role === 'Instructor' && (
                    <Link to={`/${lang}/instructor/videos`} className="btn-primary-pill text-decoration-none d-flex align-items-center gap-2">
                      <i className="bi bi-film"></i>
                      <span>{t('common.video_management')}</span>
                    </Link>
                  )}
                  {user?.role === 'Administrator' && (
                    <Link to={`/${lang}/admin/alerts`} className="btn-primary-pill text-decoration-none d-flex align-items-center gap-2">
                      <i className="bi bi-shield-check"></i>
                      <span>{t('common.ai_dashboard')}</span>
                    </Link>
                  )}
                  <Link to={`/${lang}/catalog`} className="btn-secondary-pill text-decoration-none d-flex align-items-center gap-2">
                    <span>{t('common.explore_more')}</span>
                    <i className="bi bi-arrow-right"></i>
                  </Link>
                </>
              )}
            </div>
          </Col>

          {/* Cột phải: Thống kê số liệu quy mô nền tảng */}
          <Col lg={5} className="d-flex align-items-center">
            <div className="card-clean bg-white p-4 p-lg-5 rounded-4 shadow-sm border w-100">
              <div className="row g-0 align-items-center text-center">
                {/* Chỉ số 1: Khóa học */}
                <div className="col-6 px-2">
                  <div className="d-flex justify-content-center mb-2">
                    <i className="bi bi-mortarboard text-primary" style={{ fontSize: '2.5rem' }}></i>
                  </div>
                  <div className="display-4 fw-extrabold text-dark mb-1" style={{ letterSpacing: '-0.03em', fontWeight: 800 }}>
                    {totalCourses.toLocaleString('vi-VN')}
                  </div>
                  <div className="text-secondary fw-medium" style={{ fontSize: '1rem' }}>
                    {t('common.courses_count')}
                  </div>
                </div>

                {/* Chỉ số 2: Lượt đăng ký học (ngăn cách bởi vạch dọc) */}
                <div className="col-6 px-2 border-start border-light-subtle">
                  <div className="d-flex justify-content-center mb-2">
                    <i className="bi bi-people text-primary" style={{ fontSize: '2.5rem' }}></i>
                  </div>
                  <div className="display-4 fw-extrabold text-dark mb-1" style={{ letterSpacing: '-0.03em', fontWeight: 800 }}>
                    {totalEnrollments.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')}
                  </div>
                  <div className="text-secondary fw-medium" style={{ fontSize: '1rem' }}>
                    {t('common.enrollments_count')}
                  </div>
                </div>
              </div>

              {/* Dòng cam kết bảo mật & bản quyền số */}
              <div className="mt-4 pt-3 border-top border-light-subtle d-flex align-items-center justify-content-between small text-muted">
                <div className="d-flex align-items-center gap-2">
                  <span>{lang === 'vi' ? 'Bảo vệ bản quyền HLS AES-128' : 'HLS AES-128 Protection'}</span>
                </div>
                <span className="badge-pill-cyan">{t('common.drm_live')}</span>
              </div>
            </div>
          </Col>
        </Row>

        {/* =====================================================================
         * LỘ TRÌNH HỌC TẬP TIMELINE
         * ===================================================================== */}
        <LearningTimeline />

        {/* =====================================================================
         * 2. SECTION: VIDEO & BÀI GIẢNG MỚI NHẤT (CHỈ HIỂN THỊ TOP 3 MỚI NHẤT)
         * ===================================================================== */}
        <section className="mb-5 pb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end gap-3 mb-4">
            <div>
              <h2 className="fw-bold text-dark mb-1">
                {t('home.latest_videos')}<span className="text-primary">{t('home.latest_videos_highlight')}</span>
              </h2>
              <p className="text-secondary small mb-0">
                {t('home.latest_videos_desc')}
              </p>
            </div>

            <Link
              to={`/${lang}/catalog`}
              className="btn-secondary-pill text-decoration-none d-inline-flex align-items-center gap-2 small px-3 py-2"
            >
              <span>{t('home.view_all')} ({courses.length})</span>
              <i className="bi bi-arrow-right"></i>
            </Link>
          </div>

          <Row className="g-4">
            {latestCourses.map((course) => {
              const instructorUser = users.find((u) => u.ID === course.Owner);
              const isEntitled = entitledIds.includes(course.ID);

              return (
                <Col key={course.ID} xs={12} md={6} lg={4}>
                  <Card
                    className={`h-100 card-clean card-clean-hover overflow-hidden d-flex flex-column border-0 shadow-sm ${!isEntitled ? 'border-light' : ''
                      }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleCourseAction(course)}
                  >
                    {/* Header Khóa học */}
                    <div
                      className={`p-4 border-bottom d-flex flex-column justify-content-between ${isEntitled ? 'bg-primary bg-opacity-10' : 'bg-light'
                        }`}
                      style={{ minHeight: '130px' }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        {isEntitled ? (
                          <Badge bg="success" className="px-3 py-2 rounded-pill fw-semibold shadow-sm">
                            <i className="bi bi-shield-check me-1"></i>{t('home.entitled')}
                          </Badge>
                        ) : (
                          <Badge bg="secondary" className="px-3 py-2 rounded-pill fw-semibold bg-opacity-75">
                            <i className="bi bi-lock-fill me-1"></i>{t('home.not_entitled')}
                          </Badge>
                        )}
                        <span className="small text-muted font-monospace">
                          <code>{course.ID}</code>
                        </span>
                      </div>

                      {course["Creation Time"] && (
                        <small className="text-secondary mt-3">
                          <i className="bi bi-calendar-event me-1"></i>
                          {t('home.created_at')} {course["Creation Time"].split('T')[0]}
                        </small>
                      )}
                    </div>

                    <Card.Body className="d-flex flex-column p-4">
                      <Card.Title className="fw-bold fs-5 text-dark mb-2 text-truncate" title={course.Title}>
                        {course.Title}
                      </Card.Title>

                      <Card.Text className="text-secondary small mb-3 flex-grow-1" style={{ minHeight: '55px' }}>
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

                      <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                        <div>
                          <small className="text-muted d-block">{lang === 'vi' ? 'Học phí:' : 'Tuition:'}</small>
                          <span className="fw-bold fs-5 text-primary">
                            {course.Price === 0 ? t('home.free') : `${course.Price?.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US') ?? '?'} ${lang === 'vi' ? 'đ' : 'VND'}`}
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
                            <span>{t('home.start_learning')}</span>
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
                            <span>{t('home.not_entitled')}</span>
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </section>

        {/* =====================================================================
         * 3. SECTION: CÔNG NGHỆ BẢO VỆ BẢN QUYỀN ĐỘC QUYỀN
         * ===================================================================== */}
        <section className="mb-5 pb-4">
          <div className="text-center mb-5">
            <div className="badge-pill-soft mb-2">
              <span>{t('home.architecture_badge')}</span>
            </div>
            <h2 className="fw-bold text-dark">
              {t('home.architecture_title')}<span className="text-primary">SecureLearn</span>
            </h2>
            <p className="text-secondary mx-auto" style={{ maxWidth: '650px' }}>
              {t('home.architecture_desc')}
            </p>
          </div>

          <Row className="g-4">
            <Col md={6} lg={3}>
              <Card className="h-100 card-clean border-0 p-4 text-center">
                <div
                  className="rounded-circle bg-primary-subtle text-primary mx-auto mb-3 d-flex align-items-center justify-content-center"
                  style={{ width: '56px', height: '56px', fontSize: '1.6rem' }}
                >
                  <i className="bi bi-file-lock2"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">{t('home.hls_title')}</h5>
                <p className="text-secondary small mb-0">
                  {t('home.hls_desc')}
                </p>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 card-clean border-0 p-4 text-center">
                <div
                  className="rounded-circle bg-info-subtle text-info mx-auto mb-3 d-flex align-items-center justify-content-center"
                  style={{ width: '56px', height: '56px', fontSize: '1.6rem' }}
                >
                  <i className="bi bi-fingerprint"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">{t('home.watermark_title')}</h5>
                <p className="text-secondary small mb-0">
                  {t('home.watermark_desc')}
                </p>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 card-clean border-0 p-4 text-center">
                <div
                  className="rounded-circle bg-warning-subtle text-warning mx-auto mb-3 d-flex align-items-center justify-content-center"
                  style={{ width: '56px', height: '56px', fontSize: '1.6rem' }}
                >
                  <i className="bi bi-cpu"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">{t('home.ai_title')}</h5>
                <p className="text-secondary small mb-0">
                  {t('home.ai_desc')}
                </p>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="h-100 card-clean border-0 p-4 text-center">
                <div
                  className="rounded-circle bg-success-subtle text-success mx-auto mb-3 d-flex align-items-center justify-content-center"
                  style={{ width: '56px', height: '56px', fontSize: '1.6rem' }}
                >
                  <i className="bi bi-cloud-check"></i>
                </div>
                <h5 className="fw-bold text-dark mb-2">{t('home.cdn_title')}</h5>
                <p className="text-secondary small mb-0">
                  {t('home.cdn_desc')}
                </p>
              </Card>
            </Col>
          </Row>
        </section>

        {/* =====================================================================
         * 4. SECTION: CÂU HỎI THƯỜNG GẶP (FAQ VỀ SECURELEARN)
         * ===================================================================== */}
        <section className="mb-5 pb-4">
          <div className="text-center mb-4">
            <span className="text-secondary small fw-medium d-block mb-1">
              {t('home.faq_badge')}
            </span>
            <h2 className="fw-bold text-dark mb-0">
              {t('home.faq_title')}
            </h2>
          </div>

          <div
            className="card-clean bg-white rounded-4 shadow-sm border px-3 py-3 px-md-4 py-md-4 mx-auto"
            style={{ maxWidth: '700px' }}
          >
            <div>
              {visibleFaqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div key={index} className="faq-item">
                    <button
                      type="button"
                      className="faq-question-btn"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.question}</span>
                      <i
                        className={`bi bi-chevron-down faq-chevron ${isOpen ? 'open' : ''
                          }`}
                      ></i>
                    </button>
                    {isOpen && (
                      <div className="faq-answer">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-4 pt-2">
              <button
                type="button"
                className="btn-secondary-pill border d-inline-flex align-items-center gap-2 small px-4 py-2"
                onClick={() => setShowAllFaq(!showAllFaq)}
              >
                <span>{showAllFaq ? t('home.show_less_faq') : t('home.show_more_faq')}</span>
                <i className={`bi bi-chevron-${showAllFaq ? 'up' : 'down'}`}></i>
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================================
         * 5. BANNER KÊU GỌI HÀNH ĐỘNG (CTA) - TỰ ĐỘNG THAY ĐỔI KHI ĐÃ ĐĂNG NHẬP
         * ===================================================================== */}
        {!isAuthenticated ? (
          <div className="p-5 rounded-4 text-center card-clean bg-white shadow-sm border">
            <h3 className="fw-bold text-dark mb-2">{t('home.cta_guest_title')}</h3>
            <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '600px' }}>
              {t('home.cta_guest_desc')}
            </p>
            <div className="d-flex justify-content-center gap-3">
              <Link to={`/${lang}/register`} className="btn-primary-pill text-decoration-none px-4">
                {t('common.register')}
              </Link>
              <Link to={`/${lang}/catalog`} className="btn-secondary-pill text-decoration-none px-4">
                {t('common.explore_courses')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-4 text-center card-clean bg-white shadow-sm border">
            <div className="badge-pill-cyan mb-2">
              {t('home.cta_user_badge')} {user?.name} ({user?.role})
            </div>
            <h3 className="fw-bold text-dark mb-2">{t('home.cta_user_title')}</h3>
            <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '600px' }}>
              {t('home.cta_user_desc')}
            </p>
            <div className="d-flex justify-content-center gap-3">
              {user?.role === 'Student' && (
                <Link to={`/${lang}/student/courses`} className="btn-primary-pill text-decoration-none px-4 d-inline-flex align-items-center gap-2">
                  <i className="bi bi-mortarboard-fill"></i>
                  <span>{t('common.my_courses')}</span>
                </Link>
              )}
              {user?.role === 'Instructor' && (
                <Link to={`/${lang}/instructor/videos`} className="btn-primary-pill text-decoration-none px-4 d-inline-flex align-items-center gap-2">
                  <i className="bi bi-film"></i>
                  <span>{t('common.video_management')}</span>
                </Link>
              )}
              {user?.role === 'Administrator' && (
                <Link to={`/${lang}/admin/alerts`} className="btn-primary-pill text-decoration-none px-4 d-inline-flex align-items-center gap-2">
                  <i className="bi bi-shield-check"></i>
                  <span>{t('common.ai_dashboard')}</span>
                </Link>
              )}
              <Link to={`/${lang}/catalog`} className="btn-secondary-pill text-decoration-none px-4">
                {t('common.explore_more')}
              </Link>
            </div>
          </div>
        )}
      </Container>

      {/* MODAL THÔNG BÁO CHƯA ĐƯỢC CẤP QUYỀN XEM */}
      <Modal
        show={Boolean(blockedModalCourse)}
        onHide={() => setBlockedModalCourse(null)}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-bottom-0 pb-0">
          <Modal.Title className="fs-5 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="bi bi-shield-lock-fill text-warning fs-4"></i>
            <span>Chưa Được Cấp Quyền Xem</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="pt-3">
          <div className="alert alert-warning border-0 bg-warning bg-opacity-10 text-dark p-3 rounded-3 mb-3">
            <div className="fw-bold mb-1">{blockedModalCourse?.Title}</div>
            <small className="text-muted font-monospace">Mã khóa học: {blockedModalCourse?.ID}</small>
          </div>

          <p className="text-secondary small mb-3 leading-relaxed">
            Khóa học này hiện tại <strong>chưa được cấp quyền xem</strong> cho tài khoản của bạn.
          </p>

          <div className="p-3 bg-light rounded-3 border small mb-2">
            <i className="bi bi-info-circle-fill text-primary me-2"></i>
            <strong>Quy định bảo mật SecureLearn:</strong> Khóa học trong danh mục khóa học chưa được cấp quyền xem thì chưa thể xem được. Chỉ các khóa học đã được ghi danh trong <strong>"Khóa học của tôi"</strong> mới có thể xem video bài giảng.
          </div>
        </Modal.Body>

        <Modal.Footer className="border-top-0 pt-0">
          <Button
            variant="light"
            onClick={() => setBlockedModalCourse(null)}
            className="rounded-pill px-3"
          >
            Đóng
          </Button>

          {isAuthenticated && user?.role === 'Student' ? (
            <Button
              variant="primary"
              onClick={() => {
                setBlockedModalCourse(null);
                navigate('/student/courses');
              }}
              className="btn-primary-pill d-flex align-items-center gap-2 px-3"
            >
              <i className="bi bi-mortarboard-fill"></i>
              <span>Vào Khóa Học Của Tôi</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => {
                setBlockedModalCourse(null);
                navigate('/login');
              }}
              className="btn-primary-pill px-3"
            >
              Đăng Nhập
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
}
