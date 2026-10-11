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
import { getCourses, getChapters, createChapter, createLesson, getLessons } from '../services/courseService';
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

  // State danh sách khóa học (lấy từ Backend)
  const [allCourses, setAllCourses] = useState([]);

  // Dữ liệu: Lấy danh sách khóa học do giảng viên này phụ trách (hoặc tất cả nếu chưa lọc)
  const instructorCourses = useMemo(() => {
    if (!allCourses || allCourses.length === 0) return [];
    const owned = allCourses.filter((c) => c.Owner === user?.userId || c.owner === user?.userId || c.instructor === user?.username);
    return owned.length > 0 ? owned : allCourses;
  }, [allCourses, user]);

  const location = useLocation();

  // State khóa học đang được chọn
  const [selectedCourseId, setSelectedCourseId] = useState(() => {
    return location.state?.courseId || '';
  });

  // State các chương (nạp từ Backend)
  const [allChapters, setAllChapters] = useState([]);

  // State các video bài giảng lấy động theo Backend API
  const [allVideos, setAllVideos] = useState([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);

  // State modal thêm khóa học mới
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);

  const handleCourseCreated = (newCourse) => {
    setAllCourses((prev) => [newCourse, ...prev]);
    setSelectedCourseId(newCourse.ID || newCourse.id);
  };

  // Các chương thuộc khóa học đang chọn
  const currentCourseChapters = useMemo(() => {
    return allChapters
      .filter((ch) => ch.CoursesID === selectedCourseId || ch.course_id === selectedCourseId || ch.courseId === selectedCourseId)
      .sort((a, b) => (a.ChapterNumber || 1) - (b.ChapterNumber || 1));
  }, [allChapters, selectedCourseId]);

  // State chương đang chọn để ghép video vào
  const [selectedChapterId, setSelectedChapterId] = useState(() => {
    return currentCourseChapters[0]?.ID || currentCourseChapters[0]?.id || '';
  });

  // Nạp danh sách khóa học từ Backend API
  React.useEffect(() => {
    let isMounted = true;
    getCourses()
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setAllCourses(data);
          if (data.length > 0) {
            setSelectedCourseId((prev) => {
              if (prev && data.some((c) => (c.ID === prev || c.id === prev))) {
                return prev;
              }
              return data[0].ID || data[0].id;
            });
          }
        }
      })
      .catch((err) => console.warn('[UploadVideo] Lỗi nạp khóa học từ BE:', err));
    return () => {
      isMounted = false;
    };
  }, []);

  // Nạp danh sách chương của khóa học đang chọn từ Backend API
  React.useEffect(() => {
    if (!selectedCourseId) {
      setAllChapters([]);
      return;
    }
    let isMounted = true;
    getChapters(selectedCourseId)
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setAllChapters(data);
        }
      })
      .catch((err) => console.warn('[UploadVideo] Lỗi nạp chương từ BE:', err));
    return () => {
      isMounted = false;
    };
  }, [selectedCourseId]);

  // Cập nhật selectedChapterId khi đổi khóa học
  React.useEffect(() => {
    if (currentCourseChapters.length > 0) {
      setSelectedChapterId((prev) => {
        const exists = currentCourseChapters.some((ch) => (ch.ID === prev || ch.id === prev));
        return exists ? prev : (currentCourseChapters[0].ID || currentCourseChapters[0].id);
      });
    } else {
      setSelectedChapterId('');
    }
  }, [selectedCourseId, currentCourseChapters]);

  // Nạp động danh sách bài học của các chương từ Backend API (GET /api/v1/chapter/{chapterId}/lessons)
  const refreshLessonsFromBackend = React.useCallback(async (chapters) => {
    if (!chapters || chapters.length === 0) {
      setAllVideos([]);
      return;
    }
    setIsLoadingLessons(true);
    try {
      const lessonPromises = chapters.map(async (chap) => {
        const chapId = chap.ID || chap.id;
        try {
          const lessons = await getLessons(chapId);
          if (Array.isArray(lessons) && lessons.length > 0) {
            return lessons.map((l) => ({
              ...l,
              chapterId: chapId,
              courseId: selectedCourseId,
            }));
          }
          return [];
        } catch (e) {
          return [];
        }
      });

      const results = await Promise.all(lessonPromises);
      const flattened = results.flat();
      setAllVideos(flattened);
    } catch (err) {
      console.warn('[UploadVideo] Lỗi nạp bài học từ BE:', err);
    } finally {
      setIsLoadingLessons(false);
    }
  }, [selectedCourseId]);

  // Tự động kích hoạt nạp bài học khi danh sách chương thay đổi
  React.useEffect(() => {
    if (currentCourseChapters.length > 0) {
      refreshLessonsFromBackend(currentCourseChapters);
    } else {
      setAllVideos([]);
    }
  }, [currentCourseChapters, refreshLessonsFromBackend]);

  // State Form nhập liệu bài giảng nhỏ
  const [lessonTitle, setLessonTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'url'
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
    return allCourses.find((c) => (c.ID === selectedCourseId || c.id === selectedCourseId)) || instructorCourses[0] || null;
  }, [selectedCourseId, allCourses, instructorCourses]);

  // Chương hiện tại đang chọn
  const currentChapter = useMemo(() => {
    return currentCourseChapters.find((ch) => (ch.ID === selectedChapterId || ch.id === selectedChapterId)) || currentCourseChapters[0] || null;
  }, [selectedChapterId, currentCourseChapters]);

  // Ghép các video từ BE vào từng chương của khóa học hiện tại (Curriculum View)
  const courseCurriculum = useMemo(() => {
    if (currentCourseChapters.length === 0) return [];

    return currentCourseChapters.map((chap) => {
      const chapId = chap.ID || chap.id;

      // Lấy video thuộc về chương này dựa trên ID chương từ CSDL
      const chapVideos = allVideos.filter((v) => {
        const vChapId = v.chapterId || v.chapter_id || v.chapter;
        return vChapId && String(vChapId) === String(chapId);
      });

      // Loại bỏ hoàn toàn trùng lặp ID (ngăn lỗi double bài học)
      const uniqueChapVideos = [];
      const seenIds = new Set();
      for (const v of chapVideos) {
        const vId = v?.ID || v?.id;
        if (v && vId && !seenIds.has(vId)) {
          seenIds.add(vId);
          uniqueChapVideos.push(v);
        }
      }

      // Sắp xếp bài học theo thứ tự thời gian tạo tăng dần
      uniqueChapVideos.sort((a, b) => new Date(a.UploadTime || a.uploadTime || 0) - new Date(b.UploadTime || b.uploadTime || 0));

      return {
        ...chap,
        ID: chapId,
        videos: uniqueChapVideos,
      };
    });
  }, [currentCourseChapters, allVideos]);

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

  // Tạo thêm Chương / Phần mới trong Khóa học trên Backend (POST /api/v1/chapter)
  const handleCreateNewChapter = async (e) => {
    e.preventDefault();
    if (!newChapterTitle.trim()) return;

    const nextChapNum = currentCourseChapters.length + 1;
    try {
      await createChapter({
        courseId: selectedCourseId,
        course_id: selectedCourseId,
        chapterNumber: nextChapNum,
        title: newChapterTitle.trim(),
        description: newChapterDesc.trim() || `${t('upload.chapter_content')} ${nextChapNum}`,
      });

      // Nạp lại danh sách chương từ BE để nhận đúng UUID tạo từ CSDL
      const updatedChapters = await getChapters(selectedCourseId);
      if (Array.isArray(updatedChapters) && updatedChapters.length > 0) {
        setAllChapters((prev) => {
          const others = prev.filter(
            (ch) => ch.CoursesID !== selectedCourseId && ch.course_id !== selectedCourseId && ch.courseId !== selectedCourseId
          );
          return [...others, ...updatedChapters];
        });
        const createdOne = updatedChapters[updatedChapters.length - 1];
        if (createdOne) {
          setSelectedChapterId(createdOne.ID || createdOne.id);
        }
      }

      setShowAddChapterModal(false);
      setNewChapterTitle('');
      setNewChapterDesc('');
      showToast(`${t('upload.created_chapter')} ${nextChapNum} - ${newChapterTitle.trim()}`, 'success', t('upload.success'));
    } catch (err) {
      showToast(`Lỗi tạo chương: ${err.message}`, 'danger', 'Lỗi');
    }
  };

  // Xử lý gửi Form tải lên bài giảng nhỏ (Đồng bộ trực tiếp lên Backend Spring Boot: POST /api/v1/lesson)
  const handleSubmitUpload = async (e) => {
    e.preventDefault();
    if (!lessonTitle.trim() || !selectedChapterId) return;

    if (uploadMode === 'file' && !selectedFile) return;
    if (uploadMode === 'url' && !customVideoUrl.trim()) return;

    const targetChapterId = selectedChapterId;
    const targetCourseId = selectedCourseId;

    // Chế độ 1: Nhập trực tiếp Video URL từ Backend / CDN / S3
    if (uploadMode === 'url') {
      const targetVideoUrl = customVideoUrl.trim();

      try {
        // Gửi lên Backend Spring Boot: POST /api/v1/lesson
        await createLesson({
          courseId: targetCourseId,
          course_id: targetCourseId,
          chapter: targetChapterId,
          chapter_id: targetChapterId,
          title: lessonTitle.trim(),
          description: currentChapter?.Title ? `Bài học thuộc chương ${currentChapter.Title}` : '',
          url: targetVideoUrl,
          videoURL: targetVideoUrl,
        });

        // Nạp lại bài học từ Backend để lấy bản ghi thật
        const updatedLessons = await getLessons(targetChapterId);
        if (Array.isArray(updatedLessons) && updatedLessons.length > 0) {
          setAllVideos((prev) => {
            const others = prev.filter((v) => {
              const vChap = v.chapterId || v.chapter_id || v.chapter;
              return vChap !== targetChapterId;
            });
            return [...others, ...updatedLessons];
          });
          const lastLesson = updatedLessons[updatedLessons.length - 1];
          if (lastLesson) setRecentUploadedVideoId(lastLesson.ID || lastLesson.id);
        }

        showToast(
          `Đã lưu bài học "${lessonTitle.trim()}" vào Backend thành công!`,
          'success',
          'Lưu Bài Học Thành Công'
        );
        handleContinueNextLesson();
      } catch (err) {
        console.warn('Lỗi đồng bộ bài học lên Backend:', err.message);
        const updatedLessons = await getLessons(targetChapterId);
        setAllVideos((prev) => {
          const others = prev.filter((v) => {
            const vChap = v.chapterId || v.chapter_id || v.chapter;
            return vChap !== targetChapterId;
          });
          return [...others, ...updatedLessons];
        });
        showToast(
          `Không thể kết nối Backend (http://localhost:8080). Bài học "${lessonTitle.trim()}" đã được lưu tạm an toàn trên máy của bạn và KHÔNG bị mất khi tải lại trang!`,
          'warning',
          'Lưu ý: Backend Chưa Kết Nối'
        );
        handleContinueNextLesson();
      }
      return;
    }

    // Chế độ 2: Tải lên file video từ máy tính
    const metadata = {
      title: lessonTitle.trim(),
      courseId: targetCourseId,
      chapterId: targetChapterId,
      chapterNumber: currentChapter?.ChapterNumber || 1,
      uploadedBy: user?.userId || 'u-002',
      accessLogId: currentChapter?.AccessLogID || 'al-001',
    };

    startUpload(selectedFile, metadata, async (newVideoRecord) => {
      const effectiveVideoUrl = newVideoRecord.videoUrl || `https://stream.securelearn.edu/videos/${targetCourseId}/${newVideoRecord.ID}.m3u8`;

      try {
        // Gửi lên Backend Spring Boot: POST /api/v1/lesson
        await createLesson({
          courseId: targetCourseId,
          course_id: targetCourseId,
          chapter: targetChapterId,
          chapter_id: targetChapterId,
          title: lessonTitle.trim(),
          description: currentChapter?.Title ? `Bài học thuộc chương ${currentChapter.Title}` : '',
          url: effectiveVideoUrl,
          videoURL: effectiveVideoUrl,
        });

        // Đồng bộ lại danh sách bài học từ Backend API
        const updatedLessons = await getLessons(targetChapterId);
        if (Array.isArray(updatedLessons) && updatedLessons.length > 0) {
          setAllVideos((prev) => {
            const others = prev.filter((v) => {
              const vChap = v.chapterId || v.chapter_id || v.chapter;
              return vChap !== targetChapterId;
            });
            return [...others, ...updatedLessons];
          });
          const lastLesson = updatedLessons[updatedLessons.length - 1];
          setRecentUploadedVideoId(lastLesson?.ID || lastLesson?.id || newVideoRecord.ID);
        } else {
          setAllVideos((prev) => [...prev, newVideoRecord]);
          setRecentUploadedVideoId(newVideoRecord.ID);
        }

        showToast(
          `Đã tải lên và lưu bài học "${lessonTitle.trim()}" vào Backend thành công!`,
          'success',
          'Lưu Bài Học Thành Công'
        );
      } catch (err) {
        console.warn('Lỗi đồng bộ bài học lên Backend:', err.message);
        // Đồng bộ danh sách bài học từ bộ nhớ đệm bền vững
        const updatedLessons = await getLessons(targetChapterId);
        setAllVideos((prev) => {
          const others = prev.filter((v) => {
            const vChap = v.chapterId || v.chapter_id || v.chapter;
            return vChap !== targetChapterId;
          });
          return [...others, ...updatedLessons];
        });
        setRecentUploadedVideoId(newVideoRecord.ID);

        showToast(
          `Không thể kết nối Backend (http://localhost:8080). Video "${lessonTitle.trim()}" đã được lưu tạm an toàn trên máy và KHÔNG bị mất khi tải lại trang!`,
          'warning',
          'Lưu ý: Backend Chưa Kết Nối'
        );
      }
    });
  };

  // Reset form để tải bài nhỏ tiếp theo
  const handleContinueNextLesson = () => {
    setLessonTitle('');
    setSelectedFile(null);
    setCustomVideoUrl('');
    setValidationError(null);
    setRecentUploadedVideoId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isUploadDisabled =
    !lessonTitle.trim() ||
    (uploadMode === 'file' ? !selectedFile : !customVideoUrl.trim()) ||
    !selectedChapterId ||
    Boolean(validationError) ||
    isBusy;

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
                  {instructorCourses.length === 0 ? (
                    <option value="">-- Chưa có khóa học nào (Bấm Thêm khóa học mới) --</option>
                  ) : (
                    instructorCourses.map((c) => {
                      const cId = c.ID || c.id;
                      const title = c.Title || c.title || c.name || 'Khóa học';
                      const price = c.Price ?? c.price;
                      return (
                        <option key={cId} value={cId}>
                          {title} {price !== undefined ? `(${price === 0 ? t('upload.free') : `${price?.toLocaleString('vi-VN')} đ`})` : ''}
                        </option>
                      );
                    })
                  )}
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
                    {currentCourseChapters.map((ch) => {
                      const chId = ch.ID || ch.id;
                      const chNum = ch.ChapterNumber || ch.chapterNumber || ch.chapter_number || 1;
                      const title = ch.Title || ch.title || '';
                      return (
                        <option key={chId} value={chId}>
                          {t('upload.chapter')} {chNum}: {title}
                        </option>
                      );
                    })}
                  </Form.Select>
                )}

                {currentChapter && (
                  <div className="mt-2 text-secondary small">
                    <i className="bi bi-info-circle me-1 text-primary"></i>
                    {currentChapter.Description || currentChapter.description}
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

                  {/* TAB CHUYỂN ĐỔI PHƯƠNG THỨC: TẢI FILE HOẶC DÁN URL */}
                  <div className="mb-4">
                    <label className="form-label fw-bold small text-dark mb-2">
                      Phương Thức Nạp Video:
                    </label>
                    <div className="d-flex p-1 bg-light rounded-pill border" role="group">
                      <Button
                        type="button"
                        variant={uploadMode === 'file' ? 'primary' : 'light'}
                        size="sm"
                        className={`w-50 rounded-pill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 border-0 ${
                          uploadMode === 'file' ? 'shadow-sm' : 'text-secondary bg-transparent'
                        }`}
                        onClick={() => {
                          setUploadMode('file');
                          setValidationError(null);
                        }}
                        disabled={isBusy}
                      >
                        <i className="bi bi-file-earmark-play-fill"></i>
                        <span>Tải Tệp Từ Máy Tính</span>
                      </Button>

                      <Button
                        type="button"
                        variant={uploadMode === 'url' ? 'primary' : 'light'}
                        size="sm"
                        className={`w-50 rounded-pill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 border-0 ${
                          uploadMode === 'url' ? 'shadow-sm' : 'text-secondary bg-transparent'
                        }`}
                        onClick={() => {
                          setUploadMode('url');
                          setValidationError(null);
                        }}
                        disabled={isBusy}
                      >
                        <i className="bi bi-link-45deg fs-6"></i>
                        <span>Dán Đường Dẫn URL</span>
                      </Button>
                    </div>
                  </div>

                  {/* TAB 1: CHỌN FILE VIDEO TỪ MÁY TÍNH */}
                  {uploadMode === 'file' && (
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
                  )}

                  {/* TAB 2: NHẬP TRỰC TIẾP URL VIDEO TỪ BACKEND / CDN / S3 */}
                  {uploadMode === 'url' && (
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold text-dark small">
                        <i className="bi bi-link-45deg me-1 text-primary"></i>
                        Đường Dẫn Video Trực Tiếp (CDN / S3 / HLS .m3u8 hoặc .mp4): <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="url"
                        placeholder="https://example.com/stream/lesson.m3u8 hoặc https://example.com/video.mp4"
                        value={customVideoUrl}
                        onChange={(e) => setCustomVideoUrl(e.target.value)}
                        className="form-control-clean"
                      />
                      <Form.Text className="text-muted small">
                        Lưu trực tiếp link phát này vào CSDL Backend qua endpoint <code>POST /api/v1/lesson</code>.
                      </Form.Text>
                    </Form.Group>
                  )}

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
                      ) : uploadMode === 'file' ? (
                        <>
                          <i className="bi bi-cloud-arrow-up-fill fs-5"></i>
                          <span>{t('upload.upload_and_match_to_chapter')} {currentChapter?.ChapterNumber || 1}</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle-fill fs-5"></i>
                          <span>Lưu Bài Giảng Vào Chương {currentChapter?.ChapterNumber || 1}</span>
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
                <Badge bg="primary" className="rounded-pill px-2 py-1 d-flex align-items-center gap-1">
                  {isLoadingLessons ? (
                    <>
                      <Spinner animation="border" size="sm" style={{ width: '0.75rem', height: '0.75rem' }} />
                      <span style={{ fontSize: '0.75rem' }}>Đang nạp từ BE...</span>
                    </>
                  ) : (
                    <span>{currentCourseChapters.length} {t('upload.chapter')}</span>
                  )}
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
