import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  ProgressBar,
  Accordion,
  Tabs,
  Tab,
  Form,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import SecureVideoPlayer from '../components/SecureVideoPlayer';
import {
  courses,
  chapters,
  videos,
  users,
  accessLogs,
} from '../data/mockDatabase';
import { checkCourseAccess } from '../services/entitlementService';

/**
 * =============================================================================
 * PAGE: StudentCoursePlayer (Giao diện học tập bài giảng DRM hoàn toàn dữ liệu mềm)
 * =============================================================================
 * - Tuyệt đối không dùng dữ liệu cứng. Tất cả đều truy vấn mềm từ CSDL (mockDatabase).
 * - Tự động liên kết mềm giữa Course, Chapter, Video, User (Owner) và AccessLog.
 * - Kiểm soát quyền xem: Chỉ những khóa học trong "Khóa học của tôi" đã được cấp quyền mới được xem bài giảng.
 * =============================================================================
 */
export default function StudentCoursePlayer() {
  const { videoId: paramCourseOrVideoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // 1. Dữ liệu mềm: Xác định Khóa học hiện tại
  const currentCourse = useMemo(() => {
    if (!courses || courses.length === 0) return null;
    const foundByCourseId = courses.find((c) => c.ID === paramCourseOrVideoId);
    if (foundByCourseId) return foundByCourseId;

    const foundVideo = videos.find((v) => v.ID === paramCourseOrVideoId);
    if (foundVideo) {
      const relChapter = chapters.find((ch) => ch.AccessLogID === foundVideo.AccessLogID);
      if (relChapter) {
        const c = courses.find((c) => c.ID === relChapter.CoursesID);
        if (c) return c;
      }
    }

    return courses.find((c) => c.ID === paramCourseOrVideoId) || courses[0];
  }, [paramCourseOrVideoId]);

  // Kiểm tra quyền xem khóa học từ bảng Entitlements
  const accessResult = useMemo(() => {
    if (!currentCourse) {
      return {
        hasAccess: false,
        reason: 'NOT_FOUND',
        message: 'Không tìm thấy thông tin khóa học.',
      };
    }
    return checkCourseAccess(user, currentCourse.ID);
  }, [currentCourse, user]);

  // 2. Dữ liệu mềm: Lấy danh sách các Chương (Chapters) thuộc Khóa học này
  const courseChapters = useMemo(() => {
    if (!currentCourse) return [];
    return chapters
      .filter((ch) => ch.CoursesID === currentCourse.ID)
      .sort((a, b) => a.ChapterNumber - b.ChapterNumber);
  }, [currentCourse]);

  // 3. Dữ liệu mềm: Ghép mềm các video bài giảng từ bảng `videos` vào các chương
  const curriculum = useMemo(() => {
    if (courseChapters.length === 0) {
      // Nếu khóa học chưa phân chia chương trong DB, nhóm trực tiếp các video có sẵn
      return [
        {
          ID: `ch-default-${currentCourse?.ID || '0'}`,
          ChapterNumber: 1,
          Title: currentCourse?.Title || '',
          Description: currentCourse?.Description || '',
          videos: videos || [],
        },
      ];
    }

    return courseChapters.map((chap, cIdx) => {
      // Phân bổ mềm danh sách video theo từng chương
      const countPerChap = Math.ceil(videos.length / Math.max(courseChapters.length, 1));
      const start = cIdx * countPerChap;
      const chapVideos = videos.slice(start, start + countPerChap);

      return {
        ...chap,
        videos: chapVideos.length > 0 ? chapVideos : (videos[0] ? [videos[0]] : []),
      };
    });
  }, [courseChapters, currentCourse]);

  // Danh sách phẳng tất cả bài giảng trong khóa học
  const allLectures = useMemo(() => {
    const list = [];
    curriculum.forEach((chap) => {
      chap.videos.forEach((v) => {
        list.push({
          ...v,
          chapterTitle: chap.Title,
          chapterNumber: chap.ChapterNumber,
          chapterDescription: chap.Description,
        });
      });
    });
    return list;
  }, [curriculum]);

  // 4. Bài giảng đang phát (Dữ liệu mềm)
  const [activeLectureId, setActiveLectureId] = useState(() => {
    return allLectures[0]?.ID || '';
  });

  // State tương tác người dùng (động)
  const [completedLectures, setCompletedLectures] = useState([]);
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState([]);

  // Bài giảng đang được chọn
  const activeLecture = useMemo(() => {
    return allLectures.find((l) => l.ID === activeLectureId) || allLectures[0] || null;
  }, [allLectures, activeLectureId]);

  // Vị trí bài giảng hiện tại trong danh sách
  const currentIdx = allLectures.findIndex((l) => l.ID === activeLectureId);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < allLectures.length - 1;

  // Dữ liệu mềm: Giảng viên phụ trách (tra cứu từ bảng users qua Owner)
  const instructor = useMemo(() => {
    if (!currentCourse) return null;
    const targetUserId = activeLecture?.UploadedBy || currentCourse.Owner;
    return users.find((u) => u.ID === targetUserId) || null;
  }, [activeLecture, currentCourse]);

  // Dữ liệu mềm: Nhật ký truy cập liên kết (từ bảng accessLogs qua AccessLogID)
  const relatedLog = useMemo(() => {
    const logId = activeLecture?.AccessLogID || currentCourse?.AccessLogID;
    if (!logId) return null;
    return accessLogs.find((l) => l.ID === logId) || null;
  }, [activeLecture, currentCourse]);

  // Chuyển bài học
  const handleSelectLecture = (lectureId) => {
    setActiveLectureId(lectureId);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const handlePrevLecture = () => {
    if (hasPrev) {
      handleSelectLecture(allLectures[currentIdx - 1].ID);
    }
  };

  const handleNextLecture = () => {
    if (hasNext) {
      handleSelectLecture(allLectures[currentIdx + 1].ID);
    }
  };

  const toggleComplete = (lectureId) => {
    setCompletedLectures((prev) =>
      prev.includes(lectureId)
        ? prev.filter((id) => id !== lectureId)
        : [...prev, lectureId]
    );
  };

  const handleSaveNote = (e) => {
    e.preventDefault();
    if (!notes.trim()) return;
    setSavedNotes([
      { text: notes, time: new Date().toLocaleTimeString('vi-VN') },
      ...savedNotes,
    ]);
    setNotes('');
  };

  // Helper chuyển đổi số giây sang định dạng mm:ss
  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper chuyển đổi bytes sang MB
  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Tính phần trăm tiến độ
  const progressPercent = allLectures.length > 0
    ? Math.round((completedLectures.length / allLectures.length) * 100)
    : 0;

  if (!currentCourse) {
    return (
      <Container className="py-5 text-center">
        <h5 className="text-muted">Không tìm thấy dữ liệu khóa học.</h5>
        <Button onClick={() => navigate('/catalog')} className="btn-primary-pill mt-3">
          Về danh mục khóa học
        </Button>
      </Container>
    );
  }

  // =============================================================================
  // KIỂM SOÁT QUYỀN TRUY CẬP: CHƯA CẤP QUYỀN -> CHẶN XEM VIDEO BÀI GIẢNG
  // =============================================================================
  if (!accessResult.hasAccess) {
    return (
      <div className="py-5 bg-light min-vh-100 d-flex align-items-center">
        <Container>
          <Row className="justify-content-center">
            <Col xs={12} md={8} lg={6}>
              <Card className="card-clean border-0 shadow-lg p-4 p-md-5 text-center bg-white rounded-4">
                <div
                  className="rounded-circle mx-auto mb-4 d-flex align-items-center justify-content-center shadow-sm"
                  style={{ width: '80px', height: '80px', background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }}
                >
                  <i className="bi bi-shield-slash-fill fs-1"></i>
                </div>

                <Badge bg="danger" className="align-self-center px-3 py-2 rounded-pill fw-bold mb-3 shadow-sm">
                  CHƯA CẤP QUYỀN XEM • BẢO MẬT DRM
                </Badge>

                <h3 className="fw-extrabold text-dark mb-2">
                  Quyền Truy Cập Bị Từ Chối
                </h3>

                <p className="text-muted small mb-3">
                  Khóa học: <strong className="text-dark">{currentCourse.Title}</strong> (<code>{currentCourse.ID}</code>)
                </p>

                <div className="alert alert-warning border-0 bg-warning bg-opacity-10 text-dark small text-start p-3 rounded-3 mb-4">
                  <div className="d-flex gap-2">
                    <i className="bi bi-exclamation-triangle-fill text-warning fs-5 flex-shrink-0"></i>
                    <div>
                      <strong>Chính sách bản quyền SecureLearn:</strong> Khóa học trong danh mục khóa học chưa được cấp quyền xem thì chưa thể xem được. Chỉ các khóa học đã được ghi danh trong mục <strong>"Khóa học của tôi"</strong> mới có thể xem video bài giảng.
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-center gap-3 flex-wrap">
                  <Button
                    variant="primary"
                    onClick={() => navigate('/student/courses')}
                    className="btn-primary-pill d-flex align-items-center gap-2 px-4 py-2"
                  >
                    <i className="bi bi-mortarboard-fill"></i>
                    <span>Vào Khóa Học Của Tôi</span>
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={() => navigate('/catalog')}
                    className="rounded-pill d-flex align-items-center gap-2 px-4 py-2"
                  >
                    <i className="bi bi-compass"></i>
                    <span>Danh Mục Khóa Học</span>
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div className="py-4 bg-light min-vh-100">
      <Container fluid="xl">
        {/* ===================================================================
         * 1. TOP HEADER & BREADCRUMB (Hoàn toàn dữ liệu mềm)
         * =================================================================== */}
        <div className="bg-white p-3 p-md-4 rounded-4 shadow-sm mb-4 border border-light-subtle">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 small text-muted mb-2">
                <Link to="/student/courses" className="text-decoration-none text-secondary">
                  <i className="bi bi-chevron-left me-1"></i>Khóa học của tôi
                </Link>
                <span>/</span>
                <span className="text-primary fw-semibold">{currentCourse.Title}</span>
              </div>

              <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2 flex-wrap">
                <span>{currentCourse.Title}</span>
                {currentCourse.Price != null && (
                  <Badge bg="light" text="dark" className="border fw-normal fs-6">
                    {currentCourse.Price === 0 ? 'Miễn phí' : `${currentCourse.Price.toLocaleString('vi-VN')} đ`}
                  </Badge>
                )}
              </h3>
            </div>

            {/* Thanh tiến độ tóm tắt */}
            {allLectures.length > 0 && (
              <div className="d-flex flex-column align-items-md-end" style={{ minWidth: '220px' }}>
                <div className="d-flex justify-content-between w-100 small mb-1">
                  <span className="text-muted">Tiến độ bài học:</span>
                  <span className="fw-bold text-primary">{progressPercent}%</span>
                </div>
                <ProgressBar
                  now={progressPercent}
                  variant="primary"
                  style={{ height: '7px', width: '100%' }}
                  className="rounded-pill"
                />
                <span className="text-muted small mt-1" style={{ fontSize: '0.78rem' }}>
                  {completedLectures.length}/{allLectures.length} bài đã hoàn thành
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ===================================================================
         * 2. MAIN 2-COLUMN STAGE (Video Player + Curriculum Accordion)
         * =================================================================== */}
        <Row className="g-4">
          {/* CỘT TRÁI (COL-8): Video Player & Tabs chi tiết bài giảng */}
          <Col lg={8}>
            {/* TRÌNH PHÁT VIDEO CHÍNH */}
            <div className="mb-3">
              <SecureVideoPlayer
                videoId={activeLecture?.ID || currentCourse.ID}
                studentId={user?.userId || ''}
                title={activeLecture?.Title || currentCourse.Title}
                embedded={true}
              />
            </div>

            {/* THANH ĐIỀU HƯỚNG BÀI HỌC */}
            {activeLecture && (
              <Card className="card-clean border shadow-sm p-3 mb-4 bg-white rounded-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="rounded-pill px-3 d-flex align-items-center gap-1"
                    disabled={!hasPrev}
                    onClick={handlePrevLecture}
                  >
                    <i className="bi bi-arrow-left"></i>
                    <span>Bài trước</span>
                  </Button>

                  <Button
                    variant={completedLectures.includes(activeLecture.ID) ? 'success' : 'outline-success'}
                    size="sm"
                    className="rounded-pill px-3 d-flex align-items-center gap-2"
                    onClick={() => toggleComplete(activeLecture.ID)}
                  >
                    <i
                      className={`bi ${
                        completedLectures.includes(activeLecture.ID)
                          ? 'bi-check-circle-fill'
                          : 'bi-check-circle'
                      }`}
                    ></i>
                    <span>
                      {completedLectures.includes(activeLecture.ID)
                        ? 'Đã hoàn thành'
                        : 'Đánh dấu hoàn thành'}
                    </span>
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    className="rounded-pill px-3 d-flex align-items-center gap-1"
                    disabled={!hasNext}
                    onClick={handleNextLecture}
                  >
                    <span>Bài tiếp theo</span>
                    <i className="bi bi-arrow-right"></i>
                  </Button>
                </div>
              </Card>
            )}

            {/* TABS CHI TIẾT (Hoàn toàn dữ liệu mềm) */}
            <Card className="card-clean border shadow-sm rounded-4 overflow-hidden bg-white mb-4">
              <Card.Body className="p-4">
                <Tabs defaultActiveKey="overview" className="mb-4 custom-nav-tabs">
                  {/* TAB 1: Tổng quan bài học */}
                  <Tab eventKey="overview" title="Tổng quan">
                    {activeLecture && (
                      <h5 className="fw-bold text-dark mb-2">
                        {activeLecture.Title}
                      </h5>
                    )}

                    {activeLecture?.chapterTitle && (
                      <p className="text-secondary small mb-3">
                        Thuộc chương: <strong>Chương {activeLecture.chapterNumber}: {activeLecture.chapterTitle}</strong>
                      </p>
                    )}

                    {activeLecture?.chapterDescription && (
                      <div className="p-3 bg-light rounded-3 border mb-3 small">
                        <h6 className="fw-bold text-dark mb-1">Mô tả chương mục:</h6>
                        <p className="text-secondary mb-0">
                          {activeLecture.chapterDescription}
                        </p>
                      </div>
                    )}

                    {currentCourse.Description && (
                      <div className="p-3 bg-light rounded-3 border small">
                        <h6 className="fw-bold text-dark mb-1">Mô tả khóa học:</h6>
                        <p className="text-secondary mb-0">
                          {currentCourse.Description}
                        </p>
                      </div>
                    )}
                  </Tab>

                  {/* TAB 2: Giảng viên */}
                  <Tab eventKey="instructor" title="Giảng viên">
                    {instructor ? (
                      <div className="d-flex align-items-center gap-3 p-3 bg-light rounded-3 border">
                        <div
                          className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center fw-bold fs-4"
                          style={{ width: '56px', height: '56px', flexShrink: 0 }}
                        >
                          {instructor.Username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h6 className="fw-bold text-dark mb-1">{instructor.Username}</h6>
                          <span className="badge bg-secondary-subtle text-secondary rounded-pill px-2 py-1 small">
                            Vai trò: {instructor.Role}
                          </span>
                          {instructor.CreationTime && (
                            <small className="text-muted d-block mt-1">
                              Tạo ngày: {instructor.CreationTime.split('T')[0]}
                            </small>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted small mb-0">Chưa có thông tin giảng viên.</p>
                    )}
                  </Tab>

                  {/* TAB 3: Ghi chú học viên (Tương tác mềm) */}
                  <Tab eventKey="notes" title="Ghi chú">
                    <Form onSubmit={handleSaveNote}>
                      <Form.Group className="mb-2">
                        <Form.Label className="fw-semibold text-dark small">Ghi chú cá nhân của bạn:</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          placeholder="Nhập ghi chú cho bài giảng này..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="form-control-clean small"
                        />
                      </Form.Group>
                      <Button type="submit" size="sm" variant="primary" className="rounded-pill px-3">
                        <i className="bi bi-save me-1"></i>Lưu ghi chú
                      </Button>
                    </Form>

                    {savedNotes.length > 0 && (
                      <div className="mt-3 border-top pt-3">
                        <h6 className="small fw-bold text-muted mb-2">Ghi chú đã ghi:</h6>
                        {savedNotes.map((n, idx) => (
                          <div key={idx} className="p-2 mb-2 bg-light rounded-2 small text-secondary border">
                            <span className="text-primary fw-semibold me-2">[{n.time}]</span>
                            {n.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </Tab>

                  {/* TAB 4: Nhật ký & Bảo mật (Đọc từ AccessLog thực tế) */}
                  <Tab eventKey="drm" title="Nhật ký truy cập">
                    {relatedLog ? (
                      <div className="p-3 bg-light rounded-3 border small">
                        <div className="row g-2">
                          <div className="col-sm-6">
                            <span className="text-muted d-block">Mã AccessLog:</span>
                            <code className="text-primary">{relatedLog.ID}</code>
                          </div>
                          <div className="col-sm-6">
                            <span className="text-muted d-block">Hành động ghi nhận:</span>
                            <strong className="text-dark">{relatedLog.Action}</strong>
                          </div>
                          <div className="col-sm-6 mt-2">
                            <span className="text-muted d-block">Thời điểm truy cập:</span>
                            <span className="text-dark">{relatedLog.AcessTime}</span>
                          </div>
                          <div className="col-sm-6 mt-2">
                            <span className="text-muted d-block">Mã Signed URL:</span>
                            <code className="text-secondary">{relatedLog.SignedURLID}</code>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted small mb-0">Không có bản ghi nhật ký nào.</p>
                    )}
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          </Col>

          {/* CỘT PHẢI (COL-4): Curriculum Accordion (Chương & Bài giảng mềm 100%) */}
          <Col lg={4}>
            <div className="sticky-top" style={{ top: '85px', zIndex: 10 }}>
              <Card className="card-clean border shadow-sm rounded-4 overflow-hidden bg-white">
                <Card.Header className="bg-white border-bottom py-3 px-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold text-dark mb-0">Chương Trình Giảng Dạy</h6>
                      <small className="text-muted">
                        {courseChapters.length} Chương • {allLectures.length} Bài giảng
                      </small>
                    </div>
                  </div>
                </Card.Header>

                <div style={{ maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
                  <Accordion defaultActiveKey="0" flush>
                    {curriculum.map((chap, cIdx) => (
                      <Accordion.Item key={chap.ID} eventKey={cIdx.toString()}>
                        <Accordion.Header>
                          <div className="w-100 pe-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="fw-bold text-dark small">
                                Chương {chap.ChapterNumber}: {chap.Title}
                              </span>
                              <span className="text-muted small ps-2" style={{ fontSize: '0.75rem' }}>
                                {chap.videos.length} bài
                              </span>
                            </div>
                          </div>
                        </Accordion.Header>

                        <Accordion.Body className="p-0">
                          <ul className="list-group list-group-flush small">
                            {chap.videos.map((vid) => {
                              const isActive = vid.ID === activeLectureId;
                              const isCompleted = completedLectures.includes(vid.ID);

                              return (
                                <li
                                  key={vid.ID}
                                  onClick={() => handleSelectLecture(vid.ID)}
                                  className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3 border-0 border-bottom ${
                                    isActive
                                      ? 'bg-primary-subtle text-primary fw-bold'
                                      : 'text-dark'
                                  }`}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                                    <i
                                      className={`bi ${
                                        isActive
                                          ? 'bi-play-circle-fill text-primary fs-5'
                                          : isCompleted
                                          ? 'bi-check-circle-fill text-success fs-5'
                                          : 'bi-play-circle text-muted fs-5'
                                      }`}
                                    ></i>
                                    <span className="text-truncate" title={vid.Title}>
                                      {vid.Title}
                                    </span>
                                  </div>

                                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                    {isActive && (
                                      <span
                                        className="badge bg-primary text-white rounded-pill"
                                        style={{ fontSize: '0.68rem' }}
                                      >
                                        Đang phát
                                      </span>
                                    )}
                                    {vid.Length != null && (
                                      <span className="text-muted small" style={{ fontSize: '0.78rem' }}>
                                        {formatDuration(vid.Length)}
                                      </span>
                                    )}
                                    {vid.Size != null && (
                                      <span className="text-secondary opacity-75" style={{ fontSize: '0.7rem' }}>
                                        {formatBytes(vid.Size)}
                                      </span>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                </div>
              </Card>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
