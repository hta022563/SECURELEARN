import React, { useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  FloatingLabel,
  Button,
  ProgressBar,
  Spinner,
  Alert,
  Badge,
  Modal,
  Accordion,
} from 'react-bootstrap';
import { useVideoUpload, UPLOAD_STATUS } from '../hooks/useVideoUpload';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { createChapter, createLesson } from '../services/courseService';
import {
  courses as dbCourses,
  chapters as dbChapters,
  videos as dbVideos,
  users as dbUsers,
} from '../data/mockDatabase';
import CreateCourseModal from './CreateCourseModal';

/**
 * Helper format dung lượng file từ Bytes sang KB / MB / GB
 */
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 MB';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Helper format thời lượng từ giây sang mm:ss
 */
function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/**
 * =============================================================================
 * COMPONENT: UploadVideo (Mô hình upload video từng phần nhỏ theo chuẩn 4User)
 * =============================================================================
 * - 100% dữ liệu mềm từ mockDatabase: courses, chapters, videos
 * - Cấu trúc phân cấp: Khóa học -> Chương/Phần (Chapter) -> Video bài giảng nhỏ
 * - Cho phép chia nhỏ bài giảng tải lên từng phần để khớp chuẩn xác vào chương
 * - Mô phỏng Chunked Multipart Upload & Pipeline phân đoạn HLS AES-128
 * - Cây cấu trúc khóa học (Curriculum Tree) cập nhật trực quan thời gian thực
 * =============================================================================
 */
export default function UploadVideo() {
  const { user } = useAuth();
  const { lang } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // State danh sách khóa học (hỗ trợ tạo thêm khóa học mới tại chỗ)
  const [allCourses, setAllCourses] = useState(dbCourses);

  // Dữ liệu mềm: Lấy danh sách khóa học do giảng viên này phụ trách (hoặc tất cả nếu demo)
  const instructorCourses = useMemo(() => {
    if (!allCourses || allCourses.length === 0) return [];
    const owned = allCourses.filter((c) => c.Owner === user?.userId);
    return owned.length > 0 ? owned : allCourses;
  }, [allCourses, user]);

  const location = useLocation();

  // State khóa học đang được chọn
  const [selectedCourseId, setSelectedCourseId] = useState(() => {
    return location.state?.courseId || instructorCourses[0]?.ID || 'c-001';
  });

  // State các chương (cho phép thêm chương mới mềm tại chỗ)
  const [allChapters, setAllChapters] = useState(dbChapters);

  // State các video bài giảng (đảm bảo không bị trùng lặp ID)
  const [allVideos, setAllVideos] = useState(() => {
    const unique = [];
    const seen = new Set();
    dbVideos.forEach((v) => {
      if (v && v.ID && !seen.has(v.ID)) {
        seen.add(v.ID);
        unique.push(v);
      }
    });
    return unique;
  });

  // State modal thêm khóa học mới
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);

  const handleCourseCreated = (newCourse) => {
    setAllCourses((prev) => [newCourse, ...prev]);
    setSelectedCourseId(newCourse.ID);
  };

  // Các chương thuộc khóa học đang chọn
  const currentCourseChapters = useMemo(() => {
    return allChapters
      .filter((ch) => ch.CoursesID === selectedCourseId)
      .sort((a, b) => a.ChapterNumber - b.ChapterNumber);
  }, [allChapters, selectedCourseId]);

  // State chương đang chọn để ghép video vào
  const [selectedChapterId, setSelectedChapterId] = useState(() => {
    return currentCourseChapters[0]?.ID || '';
  });

  // Cập nhật selectedChapterId khi đổi khóa học
  React.useEffect(() => {
    if (currentCourseChapters.length > 0) {
      setSelectedChapterId(currentCourseChapters[0].ID);
    } else {
      setSelectedChapterId('');
    }
  }, [selectedCourseId, currentCourseChapters]);

  // State Form nhập liệu bài giảng nhỏ
  const [lessonTitle, setLessonTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [recentUploadedVideoId, setRecentUploadedVideoId] = useState(null);

  // Modal tạo chương mới
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterDesc, setNewChapterDesc] = useState('');

  // Tham chiếu input file
  const fileInputRef = useRef(null);

  // Hook xử lý upload theo từng chunk nhỏ
  const {
    status,
    progress,
    uploadStats,
    chunkStats,
    segmentStats,
    error: uploadError,
    startUpload,
    isBusy,
  } = useVideoUpload();

  // Khóa học hiện tại
  const currentCourse = useMemo(() => {
    return dbCourses.find((c) => c.ID === selectedCourseId) || instructorCourses[0];
  }, [selectedCourseId, instructorCourses]);

  // Chương hiện tại đang chọn
  const currentChapter = useMemo(() => {
    return allChapters.find((ch) => ch.ID === selectedChapterId) || currentCourseChapters[0];
  }, [selectedChapterId, currentCourseChapters, allChapters]);

  // Ghép các video vào từng chương của khóa học hiện tại (Curriculum View)
  const courseCurriculum = useMemo(() => {
    if (currentCourseChapters.length === 0) return [];

    return currentCourseChapters.map((chap) => {
      // Chỉ lấy video thực sự thuộc về chương này:
      // 1. Video vừa được tải lên gán thẳng vào chương này: v.chapterId === chap.ID
      // 2. Hoặc video gốc từ CSDL có AccessLogID khớp và thuộc đúng khóa học gốc:
      const chapVideos = allVideos.filter((v) => {
        if (v.chapterId) {
          return v.chapterId === chap.ID;
        }
        // Với video gốc trong mockDatabase: chỉ khớp nếu thuộc đúng khóa học gốc và AccessLogID
        const isSeedCourse = ['c-001', 'c-002', 'c-003', 'c-004', 'c-005'].includes(selectedCourseId);
        return isSeedCourse && v.AccessLogID === chap.AccessLogID && chap.CoursesID === selectedCourseId;
      });

      // Loại bỏ hoàn toàn trùng lặp ID (ngăn lỗi double bài học)
      const uniqueChapVideos = [];
      const seenIds = new Set();
      for (const v of chapVideos) {
        if (v && v.ID && !seenIds.has(v.ID)) {
          seenIds.add(v.ID);
          uniqueChapVideos.push(v);
        }
      }

      // Sắp xếp bài học theo thứ tự thời gian tạo tăng dần (bài cũ ở trên, bài mới tải lên nằm ở DƯỚI CÙNG)
      uniqueChapVideos.sort((a, b) => new Date(a.UploadTime || 0) - new Date(b.UploadTime || 0));

      return {
        ...chap,
        videos: uniqueChapVideos,
      };
    });
  }, [currentCourseChapters, allVideos, selectedCourseId]);

  // Kiểm tra tính hợp lệ của file video
  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validMimeTypes = ['video/mp4', 'video/quicktime'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = fileName.endsWith('.mp4') || fileName.endsWith('.mov');
    const hasValidMime = validMimeTypes.includes(file.type);

    if (!hasValidMime && !hasValidExtension) {
      const errorMsg = t('upload.invalid_format_error');
      setValidationError(errorMsg);
      showToast(errorMsg, 'danger', t('upload.invalid_format'));
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
    showToast(`${t('upload.selected_lesson')} ${file.name} (${formatBytes(file.size)})`, 'info', t('upload.valid_file'));
  };

  // Tạo thêm Chương / Phần mới trong Khóa học (Lưu bền vững vào LocalStorage)
  const handleCreateNewChapter = async (e) => {
    e.preventDefault();
    if (!newChapterTitle.trim()) return;

    const nextChapNum = currentCourseChapters.length + 1;
    const createdChapter = await createChapter({
      courseId: selectedCourseId,
      chapterNumber: nextChapNum,
      title: newChapterTitle.trim(),
      description: newChapterDesc.trim() || `${t('upload.chapter_content')} ${nextChapNum}`,
    });

    setAllChapters((prev) => [...prev, createdChapter]);
    setSelectedChapterId(createdChapter.ID);
    setShowAddChapterModal(false);
    setNewChapterTitle('');
    setNewChapterDesc('');
    showToast(`${t('upload.created_chapter')} ${nextChapNum} - ${createdChapter.Title}`, 'success', t('upload.success'));
  };

  // Xử lý gửi Form tải lên bài giảng nhỏ (Lưu bền vững vào LocalStorage)
  const handleSubmitUpload = (e) => {
    e.preventDefault();
    if (!lessonTitle.trim() || !selectedFile || !selectedChapterId) {
      return;
    }

    const metadata = {
      title: lessonTitle.trim(),
      courseId: selectedCourseId,
      chapterId: selectedChapterId,
      chapterNumber: currentChapter?.ChapterNumber || 1,
      uploadedBy: user?.userId || 'u-002',
      accessLogId: currentChapter?.AccessLogID || 'al-001',
    };

    startUpload(selectedFile, metadata, (newVideoRecord) => {
      // 1. Thêm vào CUỐI mảng dbVideos nếu chưa có
      if (!dbVideos.some((v) => v.ID === newVideoRecord.ID)) {
        dbVideos.push(newVideoRecord);
      }

      // 2. Cập nhật state Cây bài học thời gian thực (đảm bảo không bị trùng ID)
      setAllVideos((prev) => {
        if (prev.some((v) => v.ID === newVideoRecord.ID)) {
          return prev;
        }
        return [...prev, newVideoRecord];
      });

      // 3. Gọi API Backend để lưu bài học vào DynamoDB (/lesson)
      createLesson({
        courseId: selectedCourseId,
        chapter: selectedChapterId,
        title: lessonTitle.trim(),
        description: currentChapter?.Title ? `Bài học thuộc chương ${currentChapter.Title}` : '',
        videoURL: newVideoRecord.ID || '',
      }).catch((err) => {
        console.warn('Lỗi đồng bộ bài học lên Backend:', err.message);
      });

      setRecentUploadedVideoId(newVideoRecord.ID);
      showToast(
        `${t('upload.uploaded_and_matched')} "${newVideoRecord.Title}" ${t('upload.into_chapter')} ${currentChapter?.ChapterNumber}!`,
        'success',
        t('upload.match_lesson_success')
      );
    });
  };

  // Reset form để tải bài nhỏ tiếp theo
  const handleContinueNextLesson = () => {
    setLessonTitle('');
    setSelectedFile(null);
    setValidationError(null);
    setRecentUploadedVideoId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isUploadDisabled =
    !lessonTitle.trim() || !selectedFile || !selectedChapterId || Boolean(validationError) || isBusy;

  return (
    <div className="py-4 bg-light min-vh-100">
      <Container fluid="xl">
        {/* ===================================================================
         * 1. TOP HEADER BANNER
         * =================================================================== */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4 pb-3 border-bottom">
          <div>
            <div className="badge-pill-soft mb-2">
              <i className="bi bi-diagram-3-fill text-primary"></i>
              <span>{t('upload.modular_curriculum')}</span>
            </div>
            <h2 className="fw-bold text-dark mb-1">
              {t('upload.upload_video')} <span className="text-primary">{t('upload.parts')}</span>
            </h2>
            <p className="text-secondary small mb-0">
              {t('upload.upload_desc')}
            </p>
          </div>

          <div className="d-flex align-items-center gap-2">
            <Link to={`/${lang}/instructor/videos`} className="btn-secondary-pill text-decoration-none d-flex align-items-center gap-2">
              <i className="bi bi-collection-play"></i>
              <span>{t('upload.uploaded_videos_list')}</span>
            </Link>
          </div>
        </div>

        {/* ===================================================================
         * 2. BỐ CỤC 2 CỘT (7:5) - FORM UPLOAD & CÂY CẤU TRÚC KHÓA HỌC
         * =================================================================== */}
        <Row className="g-4">
          {/* CỘT TRÁI (COL-7): FORM CHỌN KHÓA HỌC, CHỌN CHƯƠNG & UPLOAD BÀI NHỎ */}
          <Col lg={7}>
            <Card className="card-clean border-0 shadow-sm p-4 bg-white mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <h5 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-cloud-arrow-up-fill text-primary"></i>
                  <span>{t('upload.part_info')}</span>
                </h5>
                <span
                  className={`badge rounded-pill px-3 py-2 text-uppercase fs-6 fw-semibold ${status === UPLOAD_STATUS.READY
                      ? 'badge-status-ready'
                      : status === UPLOAD_STATUS.PROCESSING
                        ? 'badge-pill-cyan'
                        : status === UPLOAD_STATUS.UPLOADING
                          ? 'badge-status-processing'
                          : 'bg-light text-secondary border'
                    }`}
                >
                  {status === UPLOAD_STATUS.UPLOADING && t('upload.uploading_chunk')}
                  {status === UPLOAD_STATUS.PROCESSING && t('upload.hls_processing')}
                  {status === UPLOAD_STATUS.READY && t('upload.ready_and_matched')}
                  {status === UPLOAD_STATUS.IDLE && t('upload.ready')}
                  {status === UPLOAD_STATUS.ERROR && t('upload.error')}
                </span>
              </div>

              {/* BƯỚC 1: CHỌN KHÓA HỌC (DỮ LIỆU MỀM TỪ CSDL) */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label fw-bold small text-dark mb-0">
                    {t('upload.step_1_choose_course')}
                  </label>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="rounded-pill py-0 px-2 small"
                    onClick={() => setShowCreateCourseModal(true)}
                    disabled={isBusy}
                  >
                    <i className="bi bi-plus-circle me-1"></i>{t('upload.add_new_course')}
                  </Button>
                </div>
                <Form.Select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  disabled={isBusy}
                  className="form-control-clean fw-medium"
                >
                  {instructorCourses.map((c) => (
                    <option key={c.ID} value={c.ID}>
                      {c.Title} ({c.Price === 0 ? t('upload.free') : `${c.Price?.toLocaleString('vi-VN')} đ`})
                    </option>
                  ))}
                </Form.Select>
              </div>

              {/* BƯỚC 2: CHỌN CHƯƠNG / PHẦN BÀI HỌC (CHAPTER) */}
              <div className="mb-4 p-3 bg-light rounded-3 border">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label fw-bold small text-dark mb-0">
                    {t('upload.step_2_choose_chapter')}
                  </label>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="rounded-pill py-0 px-2 small"
                    onClick={() => setShowAddChapterModal(true)}
                    disabled={isBusy}
                  >
                    <i className="bi bi-plus-circle me-1"></i>{t('upload.add_new_chapter')}
                  </Button>
                </div>

                {currentCourseChapters.length === 0 ? (
                  <div className="text-center py-3 text-muted small">
                    {t('upload.no_chapters_prompt_3')} <strong>{t('upload.add_new_chapter')}</strong> {t('upload.to_start')}
                  </div>
                ) : (
                  <Form.Select
                    value={selectedChapterId}
                    onChange={(e) => setSelectedChapterId(e.target.value)}
                    disabled={isBusy}
                    className="form-control-clean bg-white"
                  >
                    {currentCourseChapters.map((ch) => (
                      <option key={ch.ID} value={ch.ID}>
                        {t('upload.chapter')} {ch.ChapterNumber}: {ch.Title}
                      </option>
                    ))}
                  </Form.Select>
                )}

                {currentChapter && (
                  <div className="mt-2 text-secondary small">
                    <i className="bi bi-info-circle me-1 text-primary"></i>
                    {currentChapter.Description}
                  </div>
                )}
              </div>

              {/* BƯỚC 3: NHẬP THÔNG TIN BÀI HỌC NHỎ & FILE VIDEO */}
              <Form onSubmit={handleSubmitUpload}>
                <fieldset disabled={isBusy}>
                  {/* Tiêu đề bài giảng nhỏ */}
                  <FloatingLabel
                    controlId="lessonTitleInput"
                    label={t('upload.step_3_lesson_title')}
                    className="mb-3 text-secondary"
                  >
                    <Form.Control
                      type="text"
                      placeholder={t('upload.lesson_title_placeholder')}
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      required
                      className="form-control-clean"
                    />
                  </FloatingLabel>

                  {/* Chọn File video bài học nhỏ */}
                  <Form.Group controlId="lessonFileInput" className="mb-4">
                    <Form.Label className="fw-semibold text-dark small d-flex justify-content-between">
                      <span>
                        {t('upload.video_file_label')} <span className="text-danger">*</span>
                      </span>
                      {selectedFile && (
                        <span className="text-primary fw-bold">
                          {formatBytes(selectedFile.size)}
                        </span>
                      )}
                    </Form.Label>
                    <Form.Control
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4, video/quicktime, .mp4, .mov"
                      onChange={handleFileChange}
                      className="form-control-clean"
                    />
                    <Form.Text className="text-muted small">
                      {t('upload.upload_recommendation')}
                    </Form.Text>
                  </Form.Group>

                  {/* THÔNG BÁO LỖI NẾU CÓ */}
                  {validationError && (
                    <Alert variant="danger" className="py-2 small mb-3 rounded-3">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      {validationError}
                    </Alert>
                  )}
                  {uploadError && (
                    <Alert variant="danger" className="py-2 small mb-3 rounded-3">
                      <i className="bi bi-x-circle-fill me-2"></i>
                      {uploadError}
                    </Alert>
                  )}

                  {/* TIẾN TRÌNH UPLOAD TỪNG CHUNK NHỎ */}
                  {status === UPLOAD_STATUS.UPLOADING && (
                    <div className="mb-4 p-3 rounded-3 bg-light border border-primary-subtle">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-semibold text-primary small">
                          <i className="bi bi-cloud-arrow-up me-2"></i>
                          {t('upload.uploading_chunk_progress')} {chunkStats.current}/{chunkStats.total}...
                        </span>
                        <span className="fw-bold text-primary">{progress}%</span>
                      </div>
                      <ProgressBar
                        animated
                        striped
                        variant="primary"
                        now={progress}
                        style={{ height: '14px' }}
                        className="rounded-pill mb-2"
                      />
                      <div className="d-flex justify-content-between text-muted small" style={{ fontSize: '0.8rem' }}>
                        <span>{t('upload.loaded')} {formatBytes(uploadStats.loaded)} / {formatBytes(uploadStats.total)}</span>
                        <span className="text-success"><i className="bi bi-lightning-charge me-1"></i>Multipart Chunk Ingest</span>
                      </div>
                    </div>
                  )}

                  {/* TIẾN TRÌNH MÃ HÓA HLS PHÂN ĐOẠN AES-128 */}
                  {status === UPLOAD_STATUS.PROCESSING && (
                    <div className="mb-4 p-3 rounded-3 bg-primary-subtle border border-primary-subtle text-center">
                      <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                      <span className="fw-bold text-primary small">
                        {t('upload.hls_segmenting')} {segmentStats.current}/{segmentStats.total}...
                      </span>
                      <p className="text-muted small mb-0 mt-1" style={{ fontSize: '0.78rem' }}>
                        {t('upload.hls_description')}
                      </p>
                    </div>
                  )}

                  {/* TRẠNG THÁI HOÀN THÀNH */}
                  {status === UPLOAD_STATUS.READY && recentUploadedVideoId && (
                    <Alert variant="success" className="p-3 mb-4 rounded-3 border-success shadow-sm">
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div>
                          <h6 className="fw-bold mb-1 text-success">
                            <i className="bi bi-check-circle-fill me-2"></i>
                            {t('upload.upload_success_title')}
                          </h6>
                          <small className="text-secondary">
                            {t('upload.lesson_added_to')} <strong>{t('upload.chapter')} {currentChapter?.ChapterNumber}: {currentChapter?.Title}</strong>.
                          </small>
                        </div>
                        <div className="d-flex gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            className="rounded-pill px-3"
                            onClick={() => navigate(`/${lang}/instructor/preview/${recentUploadedVideoId}`)}
                          >
                            <i className="bi bi-play-circle me-1"></i>{t('upload.preview')}
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="rounded-pill px-3"
                            onClick={handleContinueNextLesson}
                          >
                            <i className="bi bi-plus-lg me-1"></i>{t('upload.upload_another')}
                          </Button>
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* NÚT SUBMIT */}
                  {status !== UPLOAD_STATUS.READY && (
                    <Button
                      type="submit"
                      disabled={isUploadDisabled}
                      className="btn-primary-pill w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    >
                      {isBusy ? (
                        <>
                          <Spinner animation="border" size="sm" />
                          <span>{t('upload.processing_lesson')}</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-cloud-arrow-up-fill fs-5"></i>
                          <span>{t('upload.upload_and_match_to_chapter')} {currentChapter?.ChapterNumber || 1}</span>
                        </>
                      )}
                    </Button>
                  )}
                </fieldset>
              </Form>
            </Card>
          </Col>

          {/* CỘT PHẢI (COL-5): CÂY CẤU TRÚC KHÓA HỌC THỜI GIAN THỰC (CURRICULUM TREE) */}
          <Col lg={5}>
            <div className="card-clean border-0 shadow-sm p-4 bg-white sticky-top" style={{ top: '80px' }}>
              <div className="d-flex justify-content-between align-items-start mb-3 pb-2 border-bottom">
                <div>
                  <h6 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                    <i className="bi bi-list-task text-primary"></i>
                    <span>{t('upload.curriculum_tree')}</span>
                  </h6>
                  <small className="text-secondary text-truncate d-block" style={{ maxWidth: '280px' }}>
                    {currentCourse?.Title}
                  </small>
                </div>
                <Badge bg="primary" className="rounded-pill px-2 py-1">
                  {currentCourseChapters.length} {t('upload.chapter')}
                </Badge>
              </div>

              {/* Danh sách chương & các video nhỏ đã khớp */}
              {courseCurriculum.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  {t('upload.no_curriculum_data')}
                </div>
              ) : (
                <Accordion defaultActiveKey="0" className="accordion-clean">
                  {courseCurriculum.map((chap, idx) => {
                    const isSelectedChapter = chap.ID === selectedChapterId;

                    return (
                      <Accordion.Item
                        key={chap.ID}
                        eventKey={String(idx)}
                        className={`mb-2 border rounded-3 overflow-hidden ${isSelectedChapter ? 'border-primary bg-primary bg-opacity-10' : ''
                          }`}
                      >
                        <Accordion.Header>
                          <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                            <span className="fw-bold small text-dark text-truncate" style={{ maxWidth: '230px' }}>
                              {t('upload.part')} {chap.ChapterNumber}: {chap.Title}
                            </span>
                            <Badge bg="secondary" className="bg-opacity-25 text-dark fw-normal small">
                              {chap.videos.length} {t('upload.lessons_count')}
                            </Badge>
                          </div>
                        </Accordion.Header>
                        <Accordion.Body className="p-2 bg-white">
                          {chap.videos.length === 0 ? (
                            <div className="text-muted small p-2 text-center">
                              {t('upload.no_videos_in_part')}
                            </div>
                          ) : (
                            <div className="d-flex flex-column gap-1">
                              {chap.videos.map((vid, vIdx) => {
                                const isJustUploaded = vid.ID === recentUploadedVideoId;

                                return (
                                  <div
                                    key={vid.ID}
                                    className={`p-2 rounded-2 d-flex justify-content-between align-items-center small ${isJustUploaded
                                        ? 'bg-success bg-opacity-10 border border-success'
                                        : 'bg-light hover-bg-light'
                                      }`}
                                  >
                                    <div className="d-flex align-items-center gap-2 text-truncate" style={{ maxWidth: '240px' }}>
                                      <i className={`bi ${isJustUploaded ? 'bi-check-circle-fill text-success' : 'bi-play-circle text-primary'}`}></i>
                                      <span className="text-dark fw-medium text-truncate" title={vid.Title}>
                                        {vIdx + 1}. {vid.Title}
                                      </span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                      {isJustUploaded && (
                                        <Badge bg="success" className="px-2 py-1" style={{ fontSize: '0.65rem' }}>
                                          {t('upload.just_matched')}
                                        </Badge>
                                      )}
                                      <span className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
                                        {formatDuration(vid.Length)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Nút chọn nhanh chương này để upload */}
                          <div className="mt-2 pt-2 border-top text-end">
                            <Button
                              variant={isSelectedChapter ? 'primary' : 'outline-secondary'}
                              size="sm"
                              className="rounded-pill py-0 px-2 small"
                              style={{ fontSize: '0.75rem' }}
                              onClick={() => setSelectedChapterId(chap.ID)}
                            >
                              {isSelectedChapter ? t('upload.currently_selected_chapter') : t('upload.select_to_upload_here')}
                            </Button>
                          </div>
                        </Accordion.Body>
                      </Accordion.Item>
                    );
                  })}
                </Accordion>
              )}
            </div>
          </Col>
        </Row>
      </Container>

      {/* ===================================================================
       * MODAL TẠO CHƯƠNG / PHẦN MỚI
       * =================================================================== */}
      <Modal show={showAddChapterModal} onHide={() => setShowAddChapterModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-6 fw-bold">
            <i className="bi bi-folder-plus text-primary me-2"></i>
            {t('upload.add_new_chapter_modal')}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateNewChapter}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label small fw-bold text-dark">{t('upload.belongs_to_course')}</label>
              <div className="p-2 bg-light rounded text-dark small fw-semibold">
                {currentCourse?.Title} (<code>{currentCourse?.ID}</code>)
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small fw-bold text-dark">{t('upload.chapter_title_required')}</label>
              <Form.Control
                type="text"
                placeholder={t('upload.chapter_title_placeholder')}
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                required
                className="form-control-clean"
              />
            </div>

            <div className="mb-3">
              <label className="form-label small fw-bold text-dark">{t('instructor.short_description')}</label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder={t('upload.chapter_desc_placeholder')}
                value={newChapterDesc}
                onChange={(e) => setNewChapterDesc(e.target.value)}
                className="form-control-clean"
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowAddChapterModal(false)} className="rounded-pill px-3">
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" className="btn-primary-pill px-3">
              {t('upload.create_chapter')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      {/* MODAL TẠO KHÓA HỌC MỚI */}
      <CreateCourseModal
        show={showCreateCourseModal}
        onHide={() => setShowCreateCourseModal(false)}
        onCourseCreated={handleCourseCreated}
      />
    </div>
  );
}
