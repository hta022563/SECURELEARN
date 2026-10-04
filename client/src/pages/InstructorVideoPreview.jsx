import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Accordion,
  Tabs,
  Tab,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import SecureVideoPlayer from '../components/SecureVideoPlayer';
import ReuploadVideoModal from '../components/ReuploadVideoModal';
import {
  courses as dbCourses,
  chapters as dbChapters,
  videos as dbVideos,
  accessLogs as dbAccessLogs,
} from '../data/mockDatabase';

/**
 * Helper format thời lượng từ giây sang mm:ss hoặc X phút
 */
function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '0 phút';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Helper format dung lượng từ bytes sang MB / GB
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

/**
 * =============================================================================
 * PAGE: InstructorVideoPreview (Xem Trước Video Phân Cấp Từng Chương)
 * =============================================================================
 * - Trải nghiệm giống hệt giao diện học tập của Student:
 *   + Cột trái: Trình phát DRM HLS AES-128 + Watermark Giảng viên + Thông tin bài học
 *   + Cột phải: Cây cấu trúc giáo trình phân theo từng Chương (Accordion),
 *     bấm vào bất kỳ bài nào để phát ngay bài học đó.
 * - 100% dữ liệu mềm tự động tra cứu từ mockDatabase & LocalStorage
 * =============================================================================
 */
export default function InstructorVideoPreview() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showReuploadModal, setShowReuploadModal] = useState(false);

  // 1. Xác định video ban đầu từ params
  const initialVideo = useMemo(() => {
    if (!dbVideos || dbVideos.length === 0) return null;
    return dbVideos.find((v) => v.ID === videoId) || dbVideos[0];
  }, [videoId]);

  // 2. Xác định Khóa học hiện tại (từ video -> chapter -> course hoặc direct courseId)
  const currentCourse = useMemo(() => {
    if (!dbCourses || dbCourses.length === 0) return null;

    // Nếu videoId chính là mã khóa học
    const directCourse = dbCourses.find((c) => c.ID === videoId);
    if (directCourse) return directCourse;

    if (initialVideo) {
      if (initialVideo.courseId) {
        const c = dbCourses.find((c) => c.ID === initialVideo.courseId);
        if (c) return c;
      }
      if (initialVideo.chapterId) {
        const chap = dbChapters.find((ch) => ch.ID === initialVideo.chapterId);
        if (chap) {
          const c = dbCourses.find((c) => c.ID === chap.CoursesID);
          if (c) return c;
        }
      }
      const chap = dbChapters.find((ch) => ch.AccessLogID === initialVideo.AccessLogID);
      if (chap) {
        const c = dbCourses.find((c) => c.ID === chap.CoursesID);
        if (c) return c;
      }
    }

    return dbCourses[0];
  }, [videoId, initialVideo]);

  // 3. Lấy danh sách các Chương của khóa học này
  const courseChapters = useMemo(() => {
    if (!currentCourse) return [];
    return dbChapters
      .filter((ch) => ch.CoursesID === currentCourse.ID)
      .sort((a, b) => a.ChapterNumber - b.ChapterNumber);
  }, [currentCourse]);

  // 4. Ghép các video vào từng chương (Curriculum Tree) - có khử trùng lặp và sắp xếp tăng dần
  const curriculum = useMemo(() => {
    if (courseChapters.length === 0) {
      return [
        {
          ID: `ch-default-${currentCourse?.ID || '0'}`,
          ChapterNumber: 1,
          Title: currentCourse?.Title || 'Chương 1',
          Description: currentCourse?.Description || '',
          videos: dbVideos.filter((v) => v.courseId === currentCourse?.ID || v.ID === videoId),
        },
      ];
    }

    return courseChapters.map((chap) => {
      const chapVideos = dbVideos.filter((v) => {
        if (v.chapterId) return v.chapterId === chap.ID;
        const isSeed = ['c-001', 'c-002', 'c-003', 'c-004', 'c-005'].includes(currentCourse?.ID);
        return isSeed && v.AccessLogID === chap.AccessLogID && chap.CoursesID === currentCourse?.ID;
      });

      // Khử trùng lặp ID
      const unique = [];
      const seen = new Set();
      for (const v of chapVideos) {
        if (v && v.ID && !seen.has(v.ID)) {
          seen.add(v.ID);
          unique.push(v);
        }
      }

      // Sắp xếp bài học theo thời gian tạo tăng dần
      unique.sort((a, b) => new Date(a.UploadTime || 0) - new Date(b.UploadTime || 0));

      return {
        ...chap,
        videos: unique,
      };
    });
  }, [courseChapters, currentCourse, videoId]);

  // 5. Danh sách phẳng tất cả bài giảng trong khóa học
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

  // 6. Bài giảng đang được xem
  const [activeLectureId, setActiveLectureId] = useState(() => {
    if (videoId && dbVideos.some((v) => v.ID === videoId)) return videoId;
    return allLectures[0]?.ID || dbVideos[0]?.ID || 'v-001';
  });

  // Tự động đồng bộ khi param videoId thay đổi
  useEffect(() => {
    if (videoId && dbVideos.some((v) => v.ID === videoId)) {
      setActiveLectureId(videoId);
    } else if (allLectures && allLectures.length > 0) {
      setActiveLectureId(allLectures[0].ID);
    }
  }, [videoId, allLectures]);

  // Chi tiết bài giảng đang phát
  const activeLecture = useMemo(() => {
    return (
      allLectures.find((l) => l.ID === activeLectureId) ||
      dbVideos.find((v) => v.ID === activeLectureId) ||
      allLectures[0] ||
      null
    );
  }, [allLectures, activeLectureId]);

  // Vị trí bài giảng hiện tại trong danh sách
  const currentIdx = allLectures.findIndex((l) => l.ID === activeLectureId);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < allLectures.length - 1;

  // Điều hướng bài trước / tiếp theo
  const handlePrevLecture = () => {
    if (hasPrev) {
      const prev = allLectures[currentIdx - 1];
      setActiveLectureId(prev.ID);
      navigate(`/instructor/preview/${prev.ID}`, { replace: true });
    }
  };

  const handleNextLecture = () => {
    if (hasNext) {
      const next = allLectures[currentIdx + 1];
      setActiveLectureId(next.ID);
      navigate(`/instructor/preview/${next.ID}`, { replace: true });
    }
  };

  const handleSelectLecture = (id) => {
    setActiveLectureId(id);
    navigate(`/instructor/preview/${id}`, { replace: true });
  };

  // Tra cứu nhật ký truy cập (AccessLog) liên kết
  const relatedLog = useMemo(() => {
    const logId = activeLecture?.AccessLogID || currentCourse?.AccessLogID;
    if (!logId) return null;
    return dbAccessLogs.find((l) => l.ID === logId) || null;
  }, [activeLecture, currentCourse]);

  return (
    <div className="py-4 bg-light min-vh-100">
      <Container fluid="xl">
        {/* ===================================================================
         * 1. TOP HEADER & BREADCRUMB
         * =================================================================== */}
        <div className="bg-white p-3 p-md-4 rounded-4 shadow-sm mb-4 border border-light-subtle">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 small text-muted mb-2">
                <Link to="/instructor/videos" className="text-decoration-none text-secondary d-flex align-items-center gap-1">
                  <i className="bi bi-chevron-left"></i>Quản lý khóa học & bài giảng
                </Link>
                <span>/</span>
                <span className="text-primary fw-semibold">{currentCourse?.Title}</span>
              </div>

              <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2 flex-wrap">
                <span>{activeLecture?.Title || currentCourse?.Title}</span>
                <Badge bg="primary" className="fw-semibold px-3 py-1 rounded-pill small">
                  <i className="bi bi-eye-fill me-1"></i>Chế Độ Xem Trước (Instructor)
                </Badge>
                <Badge bg="success" className="bg-opacity-10 text-success border border-success fw-normal px-2 py-1 rounded-pill small">
                  <i className="bi bi-shield-check me-1"></i>HLS AES-128 Active
                </Badge>
              </h3>
              <p className="text-secondary small mb-0">
                {currentCourse?.Title}
                {activeLecture?.chapterTitle ? ` • Chương ${activeLecture.chapterNumber}: ${activeLecture.chapterTitle}` : ''}
              </p>
            </div>

            <div className="d-flex gap-2 flex-wrap">
              <Button
                variant="outline-primary"
                size="sm"
                className="rounded-pill px-3 d-flex align-items-center gap-1"
                onClick={() => navigate('/instructor/videos')}
              >
                <i className="bi bi-pencil-square"></i>
                <span>Chỉnh Sửa Bài Giảng</span>
              </Button>
              <Button
                variant="outline-info"
                size="sm"
                className="rounded-pill px-3 d-flex align-items-center gap-1 text-primary border-primary border-opacity-25"
                onClick={() => setShowReuploadModal(true)}
                title="Tải lên và thay thế file video khác cho bài giảng này"
              >
                <i className="bi bi-arrow-repeat"></i>
                <span>Up Lại Video Khác</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="btn-primary-pill px-3 d-flex align-items-center gap-1"
                onClick={() => navigate('/instructor/upload', { state: { courseId: currentCourse?.ID } })}
              >
                <i className="bi bi-cloud-arrow-up"></i>
                <span>Tải Thêm Bài Nhỏ</span>
              </Button>
            </div>
          </div>
        </div>

        {/* ===================================================================
         * 2. MAIN 2-COLUMN STAGE (Video Player + Curriculum Accordion giống Student)
         * =================================================================== */}
        <Row className="g-4">
          {/* CỘT TRÁI (COL-8): Video Player & Tabs chi tiết bài giảng */}
          <Col lg={8}>
            {/* TRÌNH PHÁT VIDEO CHÍNH */}
            <div className="mb-3">
              <SecureVideoPlayer
                videoId={activeLecture?.ID || currentCourse?.ID || 'v-001'}
                studentId={`INS-${user?.name || user?.userId || 'INSTRUCTOR'}`}
                title={activeLecture?.Title || currentCourse?.Title || 'Video Bài Giảng'}
                embedded={true}
              />
            </div>

            {/* THANH ĐIỀU HƯỚNG BÀI HỌC NHANH */}
            {allLectures.length > 0 && (
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

                  <div className="text-center small text-muted">
                    Bài <strong className="text-primary">{currentIdx + 1}</strong> / {allLectures.length} trong khóa học
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="btn-primary-pill px-3 d-flex align-items-center gap-1"
                    disabled={!hasNext}
                    onClick={handleNextLecture}
                  >
                    <span>Bài tiếp theo</span>
                    <i className="bi bi-arrow-right"></i>
                  </Button>
                </div>
              </Card>
            )}

            {/* TABS CHI TIẾT BÀI HỌC VÀ BẢO MẬT DRM */}
            <Card className="card-clean border shadow-sm rounded-4 overflow-hidden bg-white mb-4">
              <Card.Body className="p-4">
                <Tabs defaultActiveKey="overview" className="mb-4 custom-nav-tabs">
                  {/* TAB 1: Tổng quan bài học */}
                  <Tab eventKey="overview" title="Tổng quan bài giảng">
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
                        <strong className="text-dark d-block mb-1">Mục tiêu chương:</strong>
                        <p className="text-secondary mb-0">{activeLecture.chapterDescription}</p>
                      </div>
                    )}

                    {/* Metadata bài học nhỏ */}
                    <div className="row g-3 p-3 bg-light rounded-3 border small">
                      <div className="col-sm-4">
                        <span className="text-muted d-block">Thời lượng:</span>
                        <strong className="text-dark">
                          <i className="bi bi-clock me-1 text-primary"></i>
                          {formatDuration(activeLecture?.Length)}
                        </strong>
                      </div>
                      <div className="col-sm-4">
                        <span className="text-muted d-block">Dung lượng file:</span>
                        <strong className="text-dark">
                          <i className="bi bi-hdd me-1 text-secondary"></i>
                          {formatBytes(activeLecture?.Size)}
                        </strong>
                      </div>
                      <div className="col-sm-4">
                        <span className="text-muted d-block">Mã định danh (ID):</span>
                        <code>{activeLecture?.ID}</code>
                      </div>
                    </div>
                  </Tab>

                  {/* TAB 2: Bảo mật bản quyền & DRM */}
                  <Tab eventKey="security" title="Kiểm định DRM & Watermark">
                    <div className="p-3 bg-light rounded-3 border small mb-3">
                      <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                        <i className="bi bi-shield-lock-fill text-success"></i>
                        <span>Cơ Chế Bảo Mật Video Bản Quyền SecureLearn</span>
                      </h6>
                      <ul className="mb-0 text-secondary ps-3">
                        <li className="mb-1">
                          <strong>Mã hóa phân đoạn AES-128:</strong> Toàn bộ video được chia thành các chunk .ts nhỏ 6 giây và mã hóa với khóa phiên riêng biệt.
                        </li>
                        <li className="mb-1">
                          <strong>Watermark động chống quay trộm:</strong> Tự động hiển thị mờ tên tài khoản và mã định danh của giảng viên/học viên trôi ngẫu nhiên trên màn hình.
                        </li>
                        <li className="mb-1">
                          <strong>Chống tải lậu & trích xuất URL:</strong> Đường dẫn video phát qua Signed URL với chữ ký HMAC SHA-256 có thời hạn ngắn, tự hết hạn sau 1 giờ.
                        </li>
                        <li>
                          <strong>Chống tua lách bài:</strong> Khóa học theo dõi tiến độ thực tế, cảnh báo bất thường nếu có hành vi tua tốc độ gian lận.
                        </li>
                      </ul>
                    </div>
                  </Tab>

                  {/* TAB 3: Nhật ký truy cập (AccessLog) */}
                  <Tab eventKey="logs" title="Nhật ký truy cập">
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
                      <p className="text-muted small mb-0 p-3 bg-light rounded-3 border">
                        Chưa có bản ghi nhật ký nào được ghi nhận cho bài học này.
                      </p>
                    )}
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          </Col>

          {/* CỘT PHẢI (COL-4): Cây cấu trúc giáo trình từng chương (Curriculum Accordion giống Student) */}
          <Col lg={4}>
            <div className="sticky-top" style={{ top: '85px', zIndex: 10 }}>
              <Card className="card-clean border shadow-sm rounded-4 overflow-hidden bg-white">
                <Card.Header className="bg-white border-bottom py-3 px-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                        <i className="bi bi-collection-play-fill text-primary"></i>
                        <span>Giáo Trình Khóa Học</span>
                      </h6>
                      <small className="text-muted">
                        {courseChapters.length} Chương • {allLectures.length} Bài giảng nhỏ
                      </small>
                    </div>
                    <Badge bg="primary" className="rounded-pill px-2 py-1 small">
                      Xem Trước
                    </Badge>
                  </div>
                </Card.Header>

                <div style={{ maxHeight: 'calc(100vh - 210px)', overflowY: 'auto' }}>
                  <Accordion defaultActiveKey="0" flush>
                    {curriculum.map((chap, cIdx) => (
                      <Accordion.Item key={chap.ID} eventKey={cIdx.toString()}>
                        <Accordion.Header>
                          <div className="w-100 pe-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="fw-bold text-dark small text-truncate" style={{ maxWidth: '210px' }}>
                                Chương {chap.ChapterNumber}: {chap.Title}
                              </span>
                              <span className="text-muted small ps-2" style={{ fontSize: '0.75rem' }}>
                                {chap.videos.length} bài
                              </span>
                            </div>
                          </div>
                        </Accordion.Header>

                        <Accordion.Body className="p-0">
                          {chap.videos.length === 0 ? (
                            <div className="p-3 text-center text-muted small fst-italic">
                              Chưa có bài giảng trong chương này.
                            </div>
                          ) : (
                            <ul className="list-group list-group-flush small mb-0">
                              {chap.videos.map((vid, vIdx) => {
                                const isActive = vid.ID === activeLectureId;

                                return (
                                  <li
                                    key={vid.ID}
                                    onClick={() => handleSelectLecture(vid.ID)}
                                    className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3 border-0 border-bottom ${
                                      isActive
                                        ? 'bg-primary-subtle text-primary fw-bold border-start border-primary border-3'
                                        : 'text-dark hover-bg-light'
                                    }`}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                                      <i
                                        className={`bi ${
                                          isActive
                                            ? 'bi-play-circle-fill text-primary fs-6'
                                            : 'bi-play-circle text-secondary'
                                        }`}
                                      ></i>
                                      <span className="text-truncate" title={vid.Title}>
                                        {vIdx + 1}. {vid.Title}
                                      </span>
                                    </div>

                                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                      {isActive && (
                                        <Badge bg="primary" className="px-2 py-1" style={{ fontSize: '0.65rem' }}>
                                          Đang xem
                                        </Badge>
                                      )}
                                      <span
                                        className="text-muted font-monospace"
                                        style={{ fontSize: '0.75rem' }}
                                      >
                                        {formatDuration(vid.Length)}
                                      </span>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
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

      {/* MODAL UP LẠI / THAY THẾ VIDEO KHÁC */}
      <ReuploadVideoModal
        show={showReuploadModal}
        onHide={() => setShowReuploadModal(false)}
        video={activeLecture}
        onSuccess={(updated) => {
          if (updated?.ID) {
            setActiveLectureId(updated.ID);
          }
        }}
      />
    </div>
  );
}
