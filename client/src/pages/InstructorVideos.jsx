import React, { useState, useMemo, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Button,
  Modal,
  Form,
  FloatingLabel,
  InputGroup,
  Accordion,
} from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  courses as dbCourses,
  chapters as dbChapters,
  videos as dbVideos,
} from '../data/mockDatabase';
import {
  getCourses,
  updateVideoTitle,
  deleteVideo,
  updateChapterTitle,
  deleteChapter,
} from '../services/courseService';
import CreateCourseModal from '../components/CreateCourseModal';
import ReuploadVideoModal from '../components/ReuploadVideoModal';

/**
 * Helper format thời lượng từ giây sang mm:ss hoặc X phút
 */
function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '0 phút';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m} phút ${s > 0 ? `${s}s` : ''}`.trim();
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
 * COMPONENT: InstructorVideos (Cấu trúc phân cấp gọn gàng: Khóa Học -> Bài Nhỏ)
 * =============================================================================
 * - Hiển thị Khóa học tổng thể trước (Parent), không bung hàng loạt bài nhỏ gây rối mắt
 * - Nhấn vào từng khóa học để mở giao diện quản lý / chỉnh sửa từng phần nhỏ bên trong
 * =============================================================================
 */
export default function InstructorVideos() {
  const { user } = useAuth();
  const { lang } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [coursesList, setCoursesList] = useState(dbCourses);
  const [chaptersList, setChaptersList] = useState(dbChapters);
  const [videosList, setVideosList] = useState(dbVideos);

  useEffect(() => {
    let isMounted = true;
    getCourses()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setCoursesList(data);
        }
      })
      .catch((err) => console.warn('[InstructorVideos] Lỗi nạp khóa học:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);

  // State Modal quản lý chi tiết bài giảng của Khóa học được chọn
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState(null);

  // State Modal chỉnh sửa tiêu đề của bài giảng nhỏ
  const [editingVideo, setEditingVideo] = useState(null);
  const [formVideoTitle, setFormVideoTitle] = useState('');

  // State Modal chỉnh sửa chương
  const [editingChapter, setEditingChapter] = useState(null);
  const [chapterFormTitle, setChapterFormTitle] = useState('');
  const [chapterFormDesc, setChapterFormDesc] = useState('');

  // State Modal up lại / thay thế video bài giảng
  const [reuploadingVideo, setReuploadingVideo] = useState(null);

  const handleOpenReuploadModal = (video) => {
    setReuploadingVideo(video);
  };

  const handleReuploadSuccess = (updatedVideo) => {
    setVideosList((prev) =>
      prev.map((v) => (v.ID === updatedVideo.ID ? { ...v, ...updatedVideo } : v))
    );

    if (selectedCourseForDetail) {
      setSelectedCourseForDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          structuredChapters: prev.structuredChapters.map((chap) => ({
            ...chap,
            videos: chap.videos.map((vid) =>
              vid.ID === updatedVideo.ID ? { ...vid, ...updatedVideo } : vid
            ),
          })),
        };
      });
    }
  };

  // Tính toán dữ liệu tổng hợp từng Khóa học (Parent Overview)
  const courseSummaries = useMemo(() => {
    // Lọc các khóa học của giảng viên (hoặc tất cả nếu demo)
    const myCourses = coursesList.filter((c) => c.Owner === user?.userId);
    const targetCourses = myCourses.length > 0 ? myCourses : coursesList;

    return targetCourses.map((course) => {
      // Các chương thuộc khóa học này
      const courseChaps = chaptersList
        .filter((ch) => ch.CoursesID === course.ID)
        .sort((a, b) => a.ChapterNumber - b.ChapterNumber);

      // Các video thuộc khóa học này
      const courseVideos = videosList.filter((v) => {
        if (v.courseId) return v.courseId === course.ID;
        return courseChaps.some((ch) => ch.AccessLogID === v.AccessLogID);
      });

      const totalSeconds = courseVideos.reduce((acc, v) => acc + (v.Length || 0), 0);
      const totalBytes = courseVideos.reduce((acc, v) => acc + (v.Size || 0), 0);

      // Cấu trúc phân cấp từng chương chứa các bài nhỏ
      const structuredChapters = courseChaps.map((chap) => {
        const chapVideos = courseVideos.filter((v) => {
          if (v.chapterId) return v.chapterId === chap.ID;
          return v.AccessLogID === chap.AccessLogID;
        });

        // Loại bỏ trùng lặp ID (ngăn lỗi double bài học)
        const uniqueChapVideos = [];
        const seenIds = new Set();
        for (const v of chapVideos) {
          if (v && v.ID && !seenIds.has(v.ID)) {
            seenIds.add(v.ID);
            uniqueChapVideos.push(v);
          }
        }

        // Sắp xếp bài học theo thứ tự thời gian tạo (bài cũ ở trên, bài mới ở DƯỚI CÙNG)
        uniqueChapVideos.sort((a, b) => new Date(a.UploadTime || 0) - new Date(b.UploadTime || 0));

        return {
          ...chap,
          videos: uniqueChapVideos,
        };
      });

      return {
        ...course,
        chaptersCount: courseChaps.length,
        videosCount: courseVideos.length,
        totalSeconds,
        totalBytes,
        structuredChapters,
      };
    });
  }, [coursesList, chaptersList, videosList, user]);

  // Lọc theo từ khóa tìm kiếm
  const filteredCourses = courseSummaries.filter((c) => {
    const term = searchTerm.toLowerCase();
    return c.Title.toLowerCase().includes(term) || c.Description.toLowerCase().includes(term);
  });

  // Mở modal sửa tên bài nhỏ
  const handleOpenEditVideoModal = (video) => {
    setEditingVideo(video);
    setFormVideoTitle(video.Title || video.title || '');
  };

  // Lưu chỉnh sửa bài nhỏ (Lưu bền vững vào LocalStorage)
  const handleSaveVideoTitle = async (e) => {
    e.preventDefault();
    if (!formVideoTitle.trim()) {
      showToast(t('instructor.video_title_empty_error'), 'warning', t('instructor.missing_data'));
      return;
    }

    const updatedTitle = formVideoTitle.trim();
    await updateVideoTitle(editingVideo.ID, updatedTitle);

    setVideosList((prev) =>
      prev.map((v) => (v.ID === editingVideo.ID ? { ...v, Title: updatedTitle } : v))
    );

    // Cập nhật cả trong modal chi tiết nếu đang mở
    if (selectedCourseForDetail) {
      setSelectedCourseForDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          structuredChapters: prev.structuredChapters.map((chap) => ({
            ...chap,
            videos: chap.videos.map((vid) =>
              vid.ID === editingVideo.ID ? { ...vid, Title: updatedTitle } : vid
            ),
          })),
        };
      });
    }

    showToast(t('instructor.video_title_updated'), 'success', t('instructor.success'));
    setEditingVideo(null);
  };

  // Xóa bài giảng nhỏ
  const handleDeleteVideo = async (videoId, videoTitle) => {
    if (window.confirm(`${t('instructor.delete_video_confirm')} "${videoTitle}"?`)) {
      await deleteVideo(videoId);
      setVideosList((prev) => prev.filter((v) => v.ID !== videoId));
      if (selectedCourseForDetail) {
        setSelectedCourseForDetail((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            videosCount: Math.max(0, prev.videosCount - 1),
            structuredChapters: prev.structuredChapters.map((chap) => ({
              ...chap,
              videos: chap.videos.filter((vid) => vid.ID !== videoId),
            })),
          };
        });
      }
      showToast(`${t('instructor.deleted_video')} ${videoTitle}`, 'info', t('instructor.deleted'));
    }
  };

  // Mở modal sửa chương
  const handleOpenEditChapterModal = (chapter, e) => {
    if (e) e.stopPropagation();
    setEditingChapter(chapter);
    setChapterFormTitle(chapter.Title || '');
    setChapterFormDesc(chapter.Description || '');
  };

  // Lưu chỉnh sửa chương
  const handleSaveChapter = async (e) => {
    e.preventDefault();
    if (!chapterFormTitle.trim()) {
      showToast(t('instructor.chapter_title_empty_error'), 'warning', t('instructor.missing_data'));
      return;
    }

    const updatedTitle = chapterFormTitle.trim();
    const updatedDesc = chapterFormDesc.trim();

    await updateChapterTitle(editingChapter.ID, updatedTitle, updatedDesc);

    setChaptersList((prev) =>
      prev.map((c) =>
        c.ID === editingChapter.ID ? { ...c, Title: updatedTitle, Description: updatedDesc } : c
      )
    );

    if (selectedCourseForDetail) {
      setSelectedCourseForDetail((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          structuredChapters: prev.structuredChapters.map((chap) =>
            chap.ID === editingChapter.ID
              ? { ...chap, Title: updatedTitle, Description: updatedDesc }
              : chap
          ),
        };
      });
    }

    showToast(t('instructor.chapter_info_updated'), 'success', t('instructor.success'));
    setEditingChapter(null);
  };

  // Xóa chương
  const handleDeleteChapter = async (chapterId, chapterTitle, e) => {
    if (e) e.stopPropagation();
    if (window.confirm(`${t('instructor.delete_chapter_confirm')} "${chapterTitle}" ${t('instructor.delete_chapter_confirm_suffix')}`)) {
      await deleteChapter(chapterId);
      setChaptersList((prev) => prev.filter((c) => c.ID !== chapterId));
      if (selectedCourseForDetail) {
        setSelectedCourseForDetail((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            chaptersCount: Math.max(0, prev.chaptersCount - 1),
            structuredChapters: prev.structuredChapters.filter((chap) => chap.ID !== chapterId),
          };
        });
      }
      showToast(`${t('instructor.deleted_chapter')} ${chapterTitle}`, 'info', t('instructor.deleted'));
    }
  };

  return (
    <Container fluid="lg" className="py-4">
      {/* ===================================================================
       * 1. HEADER BANNER & THAO TÁC NHANH
       * =================================================================== */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4 pb-3 border-bottom">
        <div>
          <div className="badge-pill-soft mb-2">
            <i className="bi bi-mortarboard-fill text-primary"></i>
            <span>{t('instructor.management_space')}</span>
          </div>
          <h2 className="fw-bold text-dark mb-1">
            {t('instructor.courses_and_videos')} <span className="text-primary">{t('instructor.my_courses_suffix')}</span>
          </h2>
          <p className="text-secondary mb-0 small">
            {t('instructor.management_desc')}
          </p>
        </div>

        <div className="d-flex gap-2">
          <Button
            variant="outline-primary"
            onClick={() => setShowCreateCourseModal(true)}
            className="rounded-pill d-flex align-items-center gap-2 px-3 fw-medium"
          >
            <i className="bi bi-folder-plus"></i>
            <span>{t('instructor.add_course')}</span>
          </Button>
          <Button
            onClick={() => navigate(`/${lang}/instructor/upload`)}
            className="btn-primary-pill d-flex align-items-center gap-2"
          >
            <i className="bi bi-cloud-arrow-up fs-5"></i>
            <span>{t('instructor.upload_video_part')}</span>
          </Button>
        </div>
      </div>

      {/* ===================================================================
       * 2. BỘ TÌM KIẾM
       * =================================================================== */}
      <div className="card-clean border shadow-sm p-3 mb-4 bg-white">
        <Row className="g-3 align-items-center justify-content-between">
          <Col md={6}>
            <InputGroup size="sm">
              <InputGroup.Text className="bg-light border-light-subtle text-muted">
                <i className="bi bi-search"></i>
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder={t('instructor.search_course_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control-clean border-start-0"
              />
            </InputGroup>
          </Col>
          <Col md={6} className="text-md-end text-muted small">
            {t('instructor.manage')} <strong className="text-primary">{filteredCourses.length}</strong> {t('instructor.copyrighted_courses')}
          </Col>
        </Row>
      </div>

      {/* ===================================================================
       * 3. DANH SÁCH KHÓA HỌC GỐC (PARENT COURSES - GỌN GÀNG, KHÔNG RỐI MẮT)
       * =================================================================== */}
      <Row className="g-4 mb-4">
        {filteredCourses.length === 0 ? (
          <Col xs={12} className="text-center py-5 card-clean bg-white border">
            <i className="bi bi-journal-x fs-1 text-muted d-block mb-2"></i>
            <h6 className="text-dark fw-bold">{t('instructor.no_course_found')}</h6>
            <p className="text-secondary small mb-3">{t('instructor.create_course_prompt')}</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateCourseModal(true)}
              className="btn-primary-pill px-3"
            >
              {t('instructor.add_course')}
            </Button>
          </Col>
        ) : (
          filteredCourses.map((course) => (
            <Col key={course.ID} xs={12} md={6} lg={4}>
              <Card className="h-100 card-clean card-clean-hover overflow-hidden d-flex flex-column border shadow-sm bg-white">
                {/* Header Thẻ Khóa Học */}
                <div className="p-3 bg-primary bg-opacity-10 border-bottom d-flex justify-content-between align-items-center">
                  <Badge bg="primary" className="px-3 py-2 rounded-pill fw-semibold">
                    <i className="bi bi-shield-check me-1"></i>DRM HLS Ready
                  </Badge>
                  <span className="small text-muted font-monospace">
                    <code>{course.ID}</code>
                  </span>
                </div>

                <Card.Body className="d-flex flex-column p-4">
                  <Card.Title className="fw-bold fs-5 text-dark mb-2 text-truncate" title={course.Title}>
                    {course.Title}
                  </Card.Title>

                  <Card.Text className="text-secondary small mb-3 flex-grow-1" style={{ minHeight: '50px' }}>
                    {course.Description}
                  </Card.Text>

                  {/* Thống kê cấu trúc: Số chương & Số bài học nhỏ */}
                  <div className="p-3 bg-light rounded-3 mb-3 border small">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">{t('instructor.course_structure')}</span>
                      <strong className="text-dark">
                        {course.chaptersCount} {t('instructor.chapters')} • {course.videosCount} {t('instructor.lessons')}
                      </strong>
                    </div>
                    <div className="d-flex justify-content-between text-muted">
                      <span>{t('instructor.duration_and_size')}</span>
                      <span>
                        {formatDuration(course.totalSeconds)} • {formatBytes(course.totalBytes)}
                      </span>
                    </div>
                  </div>

                  {/* Thao tác chính: Mở quản lý bài giảng nhỏ & Xem trước */}
                  <div className="d-flex gap-2 mt-auto">
                    <Button
                      variant="primary"
                      className="btn-primary-pill flex-grow-1 d-flex align-items-center justify-content-center gap-1 small py-2"
                      onClick={() => setSelectedCourseForDetail(course)}
                    >
                      <i className="bi bi-pencil-square"></i>
                      <span>{t('instructor.edit_lesson')}</span>
                    </Button>
                    <Button
                      variant="outline-primary"
                      className="rounded-pill px-3 py-2 small d-flex align-items-center justify-content-center gap-1"
                      onClick={() => navigate(`/${lang}/instructor/preview/${course.ID}`)}
                    >
                      <i className="bi bi-play-circle"></i>
                      <span>{t('instructor.view')}</span>
                    </Button>
                    <Button
                      variant="outline-secondary"
                      className="rounded-pill px-3 py-2 small d-flex align-items-center justify-content-center"
                      onClick={() => navigate(`/${lang}/instructor/upload`, { state: { courseId: course.ID } })}
                    >
                      <i className="bi bi-cloud-arrow-up"></i>
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        )}
      </Row>

      {/* ===================================================================
       * 4. MODAL CHI TIẾT: QUẢN LÝ TỪNG CHƯƠNG & CHỈNH SỬA TỪNG BÀI NHỎ
       * =================================================================== */}
      <Modal
        show={Boolean(selectedCourseForDetail)}
        onHide={() => setSelectedCourseForDetail(null)}
        size="lg"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-bottom bg-light">
          <Modal.Title className="fs-5 fw-bold text-dark d-flex align-items-center gap-2">
            <i className="bi bi-folder2-open text-primary fs-4"></i>
            <span>{t('instructor.lecture_structure')} {selectedCourseForDetail?.Title}</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          <div className="alert alert-info border-0 bg-primary bg-opacity-10 text-dark small p-3 rounded-3 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <i className="bi bi-info-circle-fill text-primary me-2"></i>
              {t('instructor.course_contains')} <strong>{selectedCourseForDetail?.chaptersCount} {t('instructor.chapters_and')}</strong>
              <strong>{selectedCourseForDetail?.videosCount} {t('instructor.lessons_dot')}</strong>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="rounded-pill px-3"
              onClick={() => {
                const cid = selectedCourseForDetail?.ID;
                setSelectedCourseForDetail(null);
                navigate(`/${lang}/instructor/upload`, { state: { courseId: cid } });
              }}
            >
              <i className="bi bi-plus-lg me-1"></i>{t('instructor.upload_more_lessons')}
            </Button>
          </div>

          {/* Cây danh mục theo từng chương */}
          {selectedCourseForDetail?.structuredChapters.length === 0 ? (
            <div className="text-center py-4 text-muted small">
              {t('instructor.no_chapters_prompt_1')} <strong>{t('instructor.upload_video_part')}</strong> {t('instructor.no_chapters_prompt_2')}
            </div>
          ) : (
            <Accordion defaultActiveKey="0" className="accordion-clean">
              {selectedCourseForDetail?.structuredChapters.map((chap, idx) => (
                <Accordion.Item key={chap.ID} eventKey={String(idx)} className="mb-3 border rounded-3 overflow-hidden">
                  <Accordion.Header>
                    <div className="d-flex justify-content-between align-items-center w-100 pe-3 flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold text-dark">
                          {t('instructor.chapters')} {chap.ChapterNumber}: {chap.Title}
                        </span>
                        <Badge bg="secondary" className="bg-opacity-25 text-dark fw-normal small">
                          {chap.videos.length} {t('instructor.lessons_count')}
                        </Badge>
                      </div>

                      <div className="d-flex align-items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="light"
                          size="sm"
                          className="rounded-pill px-2 py-0 small text-primary"
                          style={{ fontSize: '0.75rem' }}
                          onClick={(e) => handleOpenEditChapterModal(chap, e)}
                        >
                          <i className="bi bi-pencil me-1"></i>{t('instructor.edit_chapter')}
                        </Button>
                        <Button
                          variant="light"
                          size="sm"
                          className="rounded-pill px-2 py-0 small text-success"
                          style={{ fontSize: '0.75rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const cid = selectedCourseForDetail?.ID;
                            setSelectedCourseForDetail(null);
                            navigate(`/${lang}/instructor/upload`, { state: { courseId: cid, chapterId: chap.ID } });
                          }}
                        >
                          <i className="bi bi-plus me-1"></i>{t('instructor.add_lesson')}
                        </Button>
                        <Button
                          variant="light"
                          size="sm"
                          className="rounded-pill px-2 py-0 small text-danger"
                          style={{ fontSize: '0.75rem' }}
                          onClick={(e) => handleDeleteChapter(chap.ID, chap.Title, e)}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                    </div>
                  </Accordion.Header>

                  <Accordion.Body className="p-0 bg-white">
                    {chap.Description && (
                      <div className="p-3 bg-light border-bottom text-muted small fst-italic">
                        {chap.Description}
                      </div>
                    )}
                    {chap.videos.length === 0 ? (
                      <div className="text-muted small p-3 text-center">
                        {t('instructor.no_videos_in_chapter')}{' '}
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-decoration-none"
                          onClick={() => {
                            const cid = selectedCourseForDetail?.ID;
                            setSelectedCourseForDetail(null);
                            navigate(`/${lang}/instructor/upload`, { state: { courseId: cid, chapterId: chap.ID } });
                          }}
                        >
                          <span dangerouslySetInnerHTML={{ __html: t('instructor.upload_lesson_now') }} />
                        </Button>
                      </div>
                    ) : (
                      <div className="list-group list-group-flush">
                        {chap.videos.map((vid, vIdx) => (
                          <div
                            key={vid.ID}
                            className="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2 p-3 hover-bg-light"
                          >
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center fw-bold"
                                style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}
                              >
                                {vIdx + 1}
                              </div>
                              <div>
                                <h6 className="fw-bold text-dark mb-0">{vid.Title}</h6>
                                <div className="small text-muted d-flex gap-3 mt-1">
                                  <span>
                                    <i className="bi bi-clock me-1 text-primary"></i>
                                    {formatDuration(vid.Length)}
                                  </span>
                                  <span>
                                    <i className="bi bi-hdd me-1 text-secondary"></i>
                                    {formatBytes(vid.Size)}
                                  </span>
                                  <span>
                                    <code>{vid.ID}</code>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="d-flex gap-2">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="rounded-pill px-3 d-flex align-items-center gap-1"
                                onClick={() => navigate(`/${lang}/instructor/preview/${vid.ID}`)}
                              >
                                <i className="bi bi-play-circle"></i>
                                <span>{t('instructor.view')}</span>
                              </Button>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                className="rounded-pill px-3 d-flex align-items-center gap-1"
                                onClick={() => handleOpenEditVideoModal(vid)}
                              >
                                <i className="bi bi-pencil"></i>
                                <span>{t('instructor.edit_name')}</span>
                              </Button>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="rounded-pill px-3 d-flex align-items-center gap-1"
                                onClick={() => handleOpenReuploadModal(vid)}
                              >
                                <i className="bi bi-arrow-repeat"></i>
                                <span>{t('instructor.reupload_video')}</span>
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                className="rounded-pill px-2 d-flex align-items-center"
                                onClick={() => handleDeleteVideo(vid.ID, vid.Title)}
                              >
                                <i className="bi bi-trash"></i>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Accordion.Body>
                </Accordion.Item>
              ))}
            </Accordion>
          )}
        </Modal.Body>

        <Modal.Footer className="border-top bg-light">
          <Button variant="secondary" onClick={() => setSelectedCourseForDetail(null)} className="rounded-pill px-4">
            {t('common.close')}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===================================================================
       * 5. MODAL SỬA TIÊU ĐỀ BÀI HỌC NHỎ
       * =================================================================== */}
      <Modal show={Boolean(editingVideo)} onHide={() => setEditingVideo(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">
            <i className="bi bi-pencil-square text-primary me-2"></i>
            {t('instructor.edit_video_title')}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveVideoTitle}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label small text-muted">{t('instructor.video_id')} </label>{' '}
              <code>{editingVideo?.ID}</code>
            </div>

            <FloatingLabel controlId="editVideoTitle" label={t('instructor.lesson_title_required')} className="mb-3 text-secondary">
              <Form.Control
                type="text"
                value={formVideoTitle}
                onChange={(e) => setFormVideoTitle(e.target.value)}
                required
                className="form-control-clean"
                autoFocus
              />
            </FloatingLabel>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setEditingVideo(null)} className="rounded-pill px-3">
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" className="btn-primary-pill px-3">
              {t('common.save')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* ===================================================================
       * 6. MODAL SỬA THÔNG TIN CHƯƠNG / PHẦN HỌC
       * =================================================================== */}
      <Modal show={Boolean(editingChapter)} onHide={() => setEditingChapter(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">
            <i className="bi bi-folder-check text-primary me-2"></i>
            {t('instructor.edit_chapter_info')}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveChapter}>
          <Modal.Body>
            <FloatingLabel controlId="editChapterTitle" label={t('instructor.chapter_title_required')} className="mb-3 text-secondary">
              <Form.Control
                type="text"
                value={chapterFormTitle}
                onChange={(e) => setChapterFormTitle(e.target.value)}
                required
                className="form-control-clean"
                autoFocus
              />
            </FloatingLabel>
            <FloatingLabel controlId="editChapterDesc" label={t('instructor.short_description')} className="mb-3 text-secondary">
              <Form.Control
                as="textarea"
                style={{ height: '90px' }}
                value={chapterFormDesc}
                onChange={(e) => setChapterFormDesc(e.target.value)}
                className="form-control-clean"
              />
            </FloatingLabel>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setEditingChapter(null)} className="rounded-pill px-3">
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" className="btn-primary-pill px-3">
              {t('common.save')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* MODAL TẠO KHÓA HỌC MỚI */}
      <CreateCourseModal
        show={showCreateCourseModal}
        onHide={() => setShowCreateCourseModal(false)}
        onCourseCreated={(newCourse) => {
          setCoursesList((prev) => [newCourse, ...prev]);
        }}
      />

      {/* MODAL UP LẠI / THAY THẾ VIDEO BÀI HỌC KHÁC */}
      <ReuploadVideoModal
        show={Boolean(reuploadingVideo)}
        onHide={() => setReuploadingVideo(null)}
        video={reuploadingVideo}
        onSuccess={handleReuploadSuccess}
      />
    </Container>
  );
}
