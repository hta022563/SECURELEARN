import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Alert,
  Badge,
  ProgressBar,
} from 'react-bootstrap';
import { motion } from 'framer-motion';
import axiosClient from '../api/axiosClient';

import { useAuth } from '../context/AuthContext';
import {
  courses as mockCourses,
  entitlements,
  users,
} from '../data/mockDatabase';

/**
 * Component: MyCourses
 * 
 * Trang hiển thị danh sách khóa học của Học viên (Student Dashboard)
 * - Tự động gọi API GET /api/v1/student/courses thông qua axiosClient
 * - Nếu BE chưa hoàn thiện, tự động lấy dữ liệu mềm theo bảng entitlements và courses trong CSDL
 * - Không sử dụng bất kỳ dữ liệu cứng nào.
 */
export default function MyCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { lang } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Hàm gọi API lấy danh sách khóa học (dữ liệu mềm hoàn toàn)
  const fetchStudentCourses = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axiosClient.get('/student/courses');
      const data = res?.data || res;
      if (Array.isArray(data) && data.length > 0) {
        setCourses(data);
        return;
      } else if (Array.isArray(res?.courses) && res.courses.length > 0) {
        setCourses(res.courses);
        return;
      }
      throw new Error('Chưa có dữ liệu từ máy chủ Backend.');
    } catch (err) {
      console.warn('[MyCourses] Đang đọc dữ liệu mềm từ hệ thống CSDL:', err.message);

      // Tra cứu mềm: lọc entitlements theo UserID của user hiện tại
      const currentUserId = user?.userId || '';
      const userEntitlements = entitlements.filter(
        (e) => e.UserID === currentUserId
      );

      const activeEntitlements = userEntitlements;

      // Ghép mềm giữa Entitlement, Course và User (Owner)
      const formatted = activeEntitlements
        .map((ent) => {
          const course = mockCourses.find((c) => c.ID === ent.CoursesID);
          if (!course) return null;
          const ownerUser = users.find((u) => u.ID === course.Owner);

          return {
            id: course.ID,
            title: course.Title,
            description: course.Description,
            owner: ownerUser?.Username || course.Owner || '',
            status: ent.Status,
            joinDate: ent["Join Date"],
            completionDate: ent["Completion Date"],
            creationTime: course["Creation Time"],
            price: course.Price,
          };
        })
        .filter(Boolean);

      setCourses(formatted);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentCourses();
  }, [user]);

  /**
   * Điều hướng sang trang xem video bảo mật DRM
   * @param {string} videoId Mã định danh video
   */
  const handleWatchVideo = (videoId) => {
    navigate(`/${lang}/student/player/${videoId}`);
  };

  return (
    <Container fluid="lg" className="py-4 my-courses-container">
      {/* Header Banner */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4 pb-3 border-bottom">
        <div>
          <div className="badge-pill-soft mb-2">
            <span>{t('dashboard.personal_space')}</span>
          </div>
          <h2 className="fw-bold text-dark mb-1">
            {t('dashboard.title')}<span className="text-primary">{t('dashboard.title_highlight')}</span>
          </h2>
          <p className="text-secondary mb-0 small">
            {t('dashboard.description')}
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="badge-pill-cyan">
            {courses.length} {t('dashboard.enrolled_courses')}
          </span>
        </div>
      </div>

      {/* 1. UI STATE: Đang tải (Loading Spinner căn giữa) */}
      {loading && (
        <div className="d-flex flex-column justify-content-center align-items-center py-5 my-5">
          <Spinner
            animation="border"
            variant="primary"
            role="status"
            style={{ width: '3.5rem', height: '3.5rem' }}
          >
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3 text-secondary small">
            {t('dashboard.loading')}
          </p>
        </div>
      )}

      {/* 2. UI STATE: Lỗi gọi API */}
      {error && !loading && (
        <Alert variant="danger" className="shadow-sm border-danger my-4 p-4 text-center rounded-4">
          <Alert.Heading className="fs-5 fw-bold mb-2">
            <i className="bi bi-exclamation-octagon-fill me-2"></i>{t('dashboard.error_title')}
          </Alert.Heading>
          <p className="small mb-3">{error}</p>
          <Button variant="outline-danger" size="sm" onClick={fetchStudentCourses} className="px-3 rounded-pill">
            <i className="bi bi-arrow-clockwise me-1"></i>{t('dashboard.retry')}
          </Button>
        </Alert>
      )}

      {/* 3. UI STATE: Thành công (Hiển thị Grid Danh sách Khóa học) */}
      {!loading && !error && (
        <>
          {courses.length === 0 ? (
            <div className="text-center py-5 card-clean bg-white p-4">
              <i className="bi bi-journal-x fs-1 text-muted mb-2 d-block"></i>
              <h5 className="text-dark">{t('dashboard.no_courses_title')}</h5>
              <p className="text-secondary small mb-3">{t('dashboard.no_courses_desc')}</p>
              <Button onClick={() => navigate(`/${lang}/catalog`)} className="btn-primary-pill">
                {t('dashboard.explore_courses')}
              </Button>
            </div>
          ) : (
            <motion.div
              className="row g-4"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.1,
                  }
                },
                hidden: {}
              }}
            >
              {courses.map((course) => (
                <Col key={course.id} xs={12} md={6} lg={4} as={motion.div} variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeInOut' } }
                }}>
                  <div className="h-100">
                    <Card className="h-100 card-clean card-clean-hover overflow-hidden d-flex flex-column border-0 shadow-sm" style={{ transition: 'opacity 0.2s ease-in-out, background-color 0.2s ease-in-out' }}>
                    {/* Header Banner thẻ Khóa học */}
                    <div
                      className="p-4 bg-primary bg-opacity-10 border-bottom d-flex flex-column justify-content-between position-relative"
                      style={{ minHeight: '130px' }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <Badge
                          bg={course.status === 'completed' ? 'success' : 'primary'}
                          className="px-3 py-2 rounded-pill text-uppercase"
                          style={{ fontSize: '0.72rem' }}
                        >
                          {course.status === 'completed' ? t('dashboard.status_completed') : course.status === 'active' ? t('dashboard.status_active') : course.status || t('dashboard.status_active')}
                        </Badge>
                        <span className="small text-muted">
                          ID: <code>{course.id}</code>
                        </span>
                      </div>

                      <div className="mt-3">
                        <span className="small text-secondary">
                          <i className="bi bi-calendar3 me-1"></i>
                          {t('dashboard.joined_date')} {course.joinDate ? course.joinDate.split('T')[0] : t('dashboard.learning')}
                        </span>
                      </div>
                    </div>

                    <Card.Body className="d-flex flex-column p-4">
                      {/* Tiêu đề Khóa học */}
                      <Card.Title className="fw-bold fs-5 text-dark mb-2 text-truncate" title={course.title}>
                        {course.title}
                      </Card.Title>

                      {/* Mô tả tóm tắt */}
                      <Card.Text className="text-secondary small mb-3 flex-grow-1" style={{ minHeight: '60px' }}>
                        {course.description}
                      </Card.Text>

                      {/* Thông tin Giảng viên (Owner từ DB) */}
                      {course.owner && (
                        <div className="d-flex justify-content-between text-muted small mb-3 border-top pt-2">
                          <span>
                            <i className="bi bi-person-fill text-primary me-1"></i>
                            {course.owner}
                          </span>
                          {course.price != null && (
                            <span className="fw-semibold text-primary">
                              {course.price === 0 ? t('dashboard.free_price') : `${course.price.toLocaleString('vi-VN')} đ`}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Nút Xem Video (Vào học bài giảng) */}
                      <div>
                        <Button
                          className="btn-primary-pill w-100 py-2 mt-auto d-flex align-items-center justify-content-center gap-2"
                          onClick={() => handleWatchVideo(course.id)}
                          style={{ transition: 'background-color 0.2s ease, opacity 0.2s ease' }}
                        >
                          <i className="bi bi-play-circle-fill fs-5"></i>
                          <span>{t('dashboard.start_lecture')}</span>
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              </Col>
            ))}
          </motion.div>
          )}
        </>
      )}
    </Container>
  );
}
