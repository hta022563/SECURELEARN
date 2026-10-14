import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  FolderPlus,
  UploadCloud,
  Plus,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  FileVideo,
  Link2,
  Zap,
  Sparkles,
} from 'lucide-react';
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
 * COMPONENT: UploadVideo (Pure Tailwind CSS)
 * =============================================================================
 */
export default function UploadVideo() {
  const { user } = useAuth();
  const { lang } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const fileInputRef = useRef(null);

  // Hook upload chunk và xử lý HLS Cloudflare R2
  const {
    status,
    progress,
    error: uploadError,
    uploadStats,
    chunkStats,
    segmentStats,
    startUpload,
    resetUpload,
  } = useVideoUpload();

  // Dữ liệu mềm nạp từ Backend API
  const [courses, setCourses] = useState([]);
  const [allChapters, setAllChapters] = useState([]);
  const [allVideos, setAllVideos] = useState([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);

  // Form State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Modal tạo nhanh Khóa học & Chương mới
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterDesc, setNewChapterDesc] = useState('');

  // Chế độ nạp bài giảng: 'file' (Tải từ máy) hoặc 'url' (Dán URL có sẵn)
  const [uploadMode, setUploadMode] = useState('file');
  const [customVideoUrl, setCustomVideoUrl] = useState('');

  // ID của video vừa upload thành công để hiển thị nút Xem Trước
  const [recentUploadedVideoId, setRecentUploadedVideoId] = useState(null);

  // Accordion state
  const [openAccordions, setOpenAccordions] = useState({ 0: true });
  const toggleAccordion = (idx) => {
    setOpenAccordions((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // 1. Nạp danh sách Khóa học từ Backend API
  useEffect(() => {
    let isMounted = true;
    async function fetchCourseList() {
      setIsLoadingCourses(true);
      try {
        const data = await getCourses();
        if (isMounted && Array.isArray(data)) {
          setCourses(data);
          const queryParams = new URLSearchParams(location.search);
          const initialCourseId = queryParams.get('courseId') || (data[0] && (data[0].ID || data[0].id)) || '';
          setSelectedCourseId(initialCourseId);
        }
      } catch (err) {
        console.error('Lỗi khi nạp danh sách khóa học:', err);
      } finally {
        if (isMounted) setIsLoadingCourses(false);
      }
    }
    fetchCourseList();
    return () => {
      isMounted = false;
    };
  }, [location.search]);

  // 2. Nạp danh sách Chương khi selectedCourseId thay đổi
  useEffect(() => {
    let isMounted = true;
    if (!selectedCourseId) {
      setSelectedChapterId('');
      return;
    }

    async function fetchChapters() {
      setIsLoadingChapters(true);
      try {
        const data = await getChapters(selectedCourseId);
        if (isMounted && Array.isArray(data)) {
          setAllChapters((prev) => {
            const others = prev.filter(
              (ch) => ch.CoursesID !== selectedCourseId && ch.course_id !== selectedCourseId && ch.courseId !== selectedCourseId
            );
            return [...others, ...data];
          });
          if (data.length > 0) {
            setSelectedChapterId(data[0].ID || data[0].id);
          } else {
            setSelectedChapterId('');
          }
        }
      } catch (err) {
        console.error(`Lỗi nạp chương của khóa học ${selectedCourseId}:`, err);
      } finally {
        if (isMounted) setIsLoadingChapters(false);
      }
    }

    fetchChapters();
    return () => {
      isMounted = false;
    };
  }, [selectedCourseId]);

  // Danh sách chương của khóa học hiện tại
  const currentCourseChapters = useMemo(() => {
    return allChapters
      .filter((ch) => ch.CoursesID === selectedCourseId || ch.course_id === selectedCourseId || ch.courseId === selectedCourseId)
      .sort((a, b) => (a.ChapterNumber || a.chapter_number || 0) - (b.ChapterNumber || b.chapter_number || 0));
  }, [allChapters, selectedCourseId]);

  // 3. Nạp danh sách Bài học (Lessons)
  useEffect(() => {
    let isMounted = true;
    if (!currentCourseChapters.length) return;

    async function fetchAllLessonsOfChapters() {
      setIsLoadingLessons(true);
      try {
        const promises = currentCourseChapters.map((ch) => {
          const chapId = ch.ID || ch.id;
          return getLessons(chapId).catch(() => []);
        });

        const results = await Promise.all(promises);
        if (isMounted) {
          const mergedLessons = results.flat();
          setAllVideos((prev) => {
            const currentChapIds = new Set(currentCourseChapters.map((c) => c.ID || c.id));
            const others = prev.filter((v) => {
              const vChap = v.chapterId || v.chapter_id || v.chapter;
              return !currentChapIds.has(vChap);
            });
            return [...others, ...mergedLessons];
          });
        }
      } catch (err) {
        console.error('Lỗi khi nạp danh sách bài học:', err);
      } finally {
        if (isMounted) setIsLoadingLessons(false);
      }
    }

    fetchAllLessonsOfChapters();
    return () => {
      isMounted = false;
    };
  }, [currentCourseChapters]);

  const currentCourse = useMemo(() => {
    return courses.find((c) => c.ID === selectedCourseId || c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

  const currentChapter = useMemo(() => {
    return currentCourseChapters.find((ch) => ch.ID === selectedChapterId || ch.id === selectedChapterId);
  }, [currentCourseChapters, selectedChapterId]);

  // Cấu trúc giáo trình
  const courseCurriculum = useMemo(() => {
    return currentCourseChapters.map((chap) => {
      const chapId = chap.ID || chap.id;
      const videosInChap = allVideos.filter(
        (v) => v.chapterId === chapId || v.chapter_id === chapId || v.chapter === chapId
      );
      return {
        ...chap,
        videos: videosInChap,
      };
    });
  }, [currentCourseChapters, allVideos]);

  // Xử lý kiểm tra file hợp lệ
  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validExtensions = ['.mp4', '.mov'];
    const validMimeTypes = ['video/mp4', 'video/quicktime'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const hasValidExtension = validExtensions.includes(fileExt);
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

  // Tạo thêm Chương mới
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
      showToast(`${t('upload.cannot_create_chapter')} ${err.message}`, 'danger', t('upload.error'));
    }
  };

  // Callback sau khi tạo Khóa học mới
  const handleCourseCreated = (newCourse) => {
    setCourses((prev) => [newCourse, ...prev]);
    setSelectedCourseId(newCourse.ID);
  };

  // Reset form để upload bài tiếp theo
  const handleContinueNextLesson = () => {
    resetUpload();
    setLessonTitle('');
    setSelectedFile(null);
    setCustomVideoUrl('');
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Bắt đầu upload
  const handleSubmitUpload = async (e) => {
    e.preventDefault();

    if (!lessonTitle.trim()) {
      setValidationError(t('upload.please_enter_title'));
      return;
    }
    if (!selectedCourseId) {
      setValidationError(t('upload.please_choose_course'));
      return;
    }
    if (!selectedChapterId) {
      setValidationError(t('upload.please_choose_chapter'));
      return;
    }

    if (uploadMode === 'file' && !selectedFile) {
      setValidationError(t('upload.please_choose_file'));
      return;
    }
    if (uploadMode === 'url' && !customVideoUrl.trim()) {
      setValidationError(t('upload.please_enter_url'));
      return;
    }

    setValidationError(null);
    const targetCourseId = selectedCourseId;
    const targetChapterId = selectedChapterId;

    if (uploadMode === 'url') {
      try {
        await createLesson({
          courseId: targetCourseId,
          course_id: targetCourseId,
          chapter: targetChapterId,
          chapter_id: targetChapterId,
          title: lessonTitle.trim(),
          description: currentChapter?.Title ? `${t('upload.lesson_in_chapter')} ${currentChapter.Title}` : '',
          url: customVideoUrl.trim(),
          videoURL: customVideoUrl.trim(),
        });

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

        showToast(`${t('upload.lesson_saved_success')} "${lessonTitle.trim()}"!`, 'success', t('upload.save_success_title'));
        handleContinueNextLesson();
      } catch (err) {
        console.warn('Lỗi đồng bộ bài học lên Backend:', err.message);
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
        if (!newVideoRecord?.fromBackendProcess) {
          await createLesson({
            courseId: targetCourseId,
            course_id: targetCourseId,
            chapter: targetChapterId,
            chapter_id: targetChapterId,
            title: lessonTitle.trim(),
            description: currentChapter?.Title ? `${t('upload.lesson_in_chapter')} ${currentChapter.Title}` : '',
            url: effectiveVideoUrl,
            videoURL: effectiveVideoUrl,
          });
        }

        const updatedLessons = await getLessons(targetChapterId);
        if (Array.isArray(updatedLessons) && updatedLessons.length > 0) {
          setAllVideos((prev) => {
            const others = prev.filter((v) => {
              const vChap = v.chapterId || v.chapter_id || v.chapter;
              return vChap !== targetChapterId;
            });
            return [...others, ...updatedLessons];
          });
        }
      } catch (err) {
        console.warn('Lỗi khi nạp lại bài học sau khi upload:', err.message);
      }

      setRecentUploadedVideoId(newVideoRecord.ID);
      showToast(
        `${t('upload.lesson_uploaded_success')} "${lessonTitle.trim()}" ${t('upload.matched_to_chapter')} ${currentChapter?.ChapterNumber || 1}!`,
        'success',
        t('upload.success')
      );
    });
  };

  const isBusy = status === UPLOAD_STATUS.UPLOADING || status === UPLOAD_STATUS.PROCESSING;
  const isUploadDisabled =
    isBusy ||
    !selectedCourseId ||
    !selectedChapterId ||
    !lessonTitle.trim() ||
    (uploadMode === 'file' && !selectedFile) ||
    (uploadMode === 'url' && !customVideoUrl.trim());

  return (
    <div className="py-8 bg-transparent">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ===================================================================
         * 1. HEADER SECTION
         * =================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2 shadow-xs">
              <Layers className="h-3.5 w-3.5" />
              <span>{t('upload.modular_curriculum')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('upload.upload_video')}{' '}
              <span className="text-blue-600 dark:text-blue-400">{t('upload.parts')}</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
              {t('upload.upload_desc')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/${lang}/instructor/videos`}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-all no-underline"
            >
              <PlayCircle className="h-4 w-4" />
              <span>{t('upload.uploaded_videos_list')}</span>
            </Link>
          </div>
        </div>

        {/* ===================================================================
         * 2. BỐ CỤC 2 CỘT (7:5) - FORM UPLOAD & CÂY CẤU TRÚC KHÓA HỌC
         * =================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* CỘT TRÁI (COL-7): FORM UPLOAD */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-xl space-y-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <UploadCloud className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {t('upload.part_info')}
                  </h3>
                </div>

                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    status === UPLOAD_STATUS.READY
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : status === UPLOAD_STATUS.PROCESSING
                      ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                      : status === UPLOAD_STATUS.UPLOADING
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {status === UPLOAD_STATUS.UPLOADING && t('upload.uploading_chunk')}
                  {status === UPLOAD_STATUS.PROCESSING && t('upload.hls_processing')}
                  {status === UPLOAD_STATUS.READY && t('upload.ready_and_matched')}
                  {status === UPLOAD_STATUS.IDLE && t('upload.ready')}
                  {status === UPLOAD_STATUS.ERROR && t('upload.error')}
                </span>
              </div>

              {/* BƯỚC 1: CHỌN KHÓA HỌC */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t('upload.step_1_choose_course')} <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCreateCourseModal(true)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/40 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('upload.add_new_course')}
                  </button>
                </div>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  disabled={isBusy}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  {isLoadingCourses ? (
                    <option value="">{t('upload.loading_courses_backend')}</option>
                  ) : courses.length === 0 ? (
                    <option value="">{t('upload.no_courses_available')}</option>
                  ) : (
                    courses.map((course) => {
                      const cId = course.ID || course.id;
                      const cTitle = course.Title || course.title || '';
                      return (
                        <option key={cId} value={cId}>
                          {cTitle} ({cId})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              {/* BƯỚC 2: CHỌN CHƯƠNG */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {t('upload.step_2_choose_chapter')} <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddChapterModal(true)}
                    disabled={isBusy || !selectedCourseId}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/40 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('upload.add_chapter')}
                  </button>
                </div>

                {isLoadingChapters ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    {t('upload.loading_chapters')}
                  </div>
                ) : currentCourseChapters.length === 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
                    <span>{t('upload.course_has_no_chapters')}</span>
                    <button
                      type="button"
                      onClick={() => setShowAddChapterModal(true)}
                      className="font-bold underline"
                    >
                      {t('upload.create_chapter_1_now')}
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedChapterId}
                    onChange={(e) => setSelectedChapterId(e.target.value)}
                    disabled={isBusy}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  >
                    {currentCourseChapters.map((ch) => {
                      const chId = ch.ID || ch.id;
                      const chNum = ch.ChapterNumber || ch.chapter_number || 1;
                      const title = ch.Title || ch.title || '';
                      return (
                        <option key={chId} value={chId}>
                          {t('upload.chapter')} {chNum}: {title}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* BƯỚC 3: NHẬP THÔNG TIN BÀI HỌC NHỎ & FILE VIDEO */}
              <form onSubmit={handleSubmitUpload} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <fieldset disabled={isBusy} className="space-y-4">
                  {/* Tiêu đề bài giảng */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                      {t('upload.step_3_lesson_title')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder={t('upload.lesson_title_placeholder')}
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>

                  {/* Chuyển đổi phương thức: File hoặc URL */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                      {t('upload.video_source_method')}
                    </label>
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200/80 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMode('file');
                          setValidationError(null);
                        }}
                        className={`flex-1 rounded-full py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          uploadMode === 'file'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <FileVideo className="h-4 w-4" />
                        <span>{t('upload.upload_from_computer')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMode('url');
                          setValidationError(null);
                        }}
                        className={`flex-1 rounded-full py-2 text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          uploadMode === 'url'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <Link2 className="h-4 w-4" />
                        <span>{t('upload.paste_url')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Tab File */}
                  {uploadMode === 'file' && (
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {t('upload.video_file_label')} <span className="text-rose-500">*</span>
                        </label>
                        {selectedFile && (
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                            {formatBytes(selectedFile.size)}
                          </span>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/mp4, video/quicktime, .mp4, .mov"
                        onChange={handleFileChange}
                        className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-300 cursor-pointer"
                      />
                      <p className="mt-1 text-[11px] text-slate-400">
                        {t('upload.upload_recommendation')}
                      </p>
                    </div>
                  )}

                  {/* Tab URL */}
                  {uploadMode === 'url' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                        {t('upload.direct_video_url')} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="url"
                        placeholder={t('upload.direct_video_url_placeholder')}
                        value={customVideoUrl}
                        onChange={(e) => setCustomVideoUrl(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      />
                    </div>
                  )}

                  {/* Lỗi xác thực */}
                  {validationError && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300">
                      <XCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Tiến trình Upload Chunk */}
                  {status === UPLOAD_STATUS.UPLOADING && (
                    <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                          <UploadCloud className="h-4 w-4" />
                          {t('upload.uploading_chunk_progress')} {chunkStats.current}/{chunkStats.total}...
                        </span>
                        <span className="font-bold text-blue-700 dark:text-blue-300">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>
                          {t('upload.loaded')} {formatBytes(uploadStats.loaded)} / {formatBytes(uploadStats.total)}
                        </span>
                        <span className="text-emerald-600 font-semibold">Multipart Chunk Ingest</span>
                      </div>
                    </div>
                  )}

                  {/* Tiến trình mã hóa HLS */}
                  {status === UPLOAD_STATUS.PROCESSING && (
                    <div className="rounded-2xl border border-cyan-200 dark:border-cyan-900 bg-cyan-50/50 dark:bg-cyan-950/30 p-4 text-center space-y-1">
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>
                          {t('upload.hls_segmenting')} {segmentStats.current}/{segmentStats.total}...
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{t('upload.hls_description')}</p>
                    </div>
                  )}

                  {/* Trạng thái hoàn thành */}
                  {status === UPLOAD_STATUS.READY && recentUploadedVideoId && (
                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          {t('upload.upload_success_title')}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          {t('upload.lesson_added_to')}{' '}
                          <strong>
                            {t('upload.chapter')} {currentChapter?.ChapterNumber}: {currentChapter?.Title}
                          </strong>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/${lang}/instructor/preview/${recentUploadedVideoId}`)}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-xs font-semibold shadow-xs"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          {t('upload.preview')}
                        </button>
                        <button
                          type="button"
                          onClick={handleContinueNextLesson}
                          className="rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                        >
                          {t('upload.upload_another')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Nút Submit */}
                  {status !== UPLOAD_STATUS.READY && (
                    <button
                      type="submit"
                      disabled={isUploadDisabled}
                      className="w-full rounded-full bg-blue-600 hover:bg-blue-700 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {isBusy ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t('upload.processing_lesson')}</span>
                        </>
                      ) : uploadMode === 'file' ? (
                        <>
                          <UploadCloud className="h-4 w-4" />
                          <span>
                            {t('upload.upload_and_match_to_chapter')} {currentChapter?.ChapterNumber || 1}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>
                            {t('upload.save_lesson_to_chapter')} {currentChapter?.ChapterNumber || 1}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </fieldset>
              </form>
            </div>
          </div>

          {/* CỘT PHẢI (COL-5): CÂY CẤU TRÚC KHÓA HỌC THỜI GIAN THỰC (CURRICULUM TREE) */}
          <div className="lg:col-span-5 sticky top-20">
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <span>{t('upload.curriculum_tree')}</span>
                  </h3>
                  <small className="text-xs text-slate-500 dark:text-slate-400 block truncate max-w-[220px]">
                    {currentCourse?.Title}
                  </small>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {isLoadingLessons ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>{t('common.loading', 'Loading...')}</span>
                    </>
                  ) : (
                    <span>
                      {currentCourseChapters.length} {t('upload.chapter')}
                    </span>
                  )}
                </span>
              </div>

              {/* Danh sách chương & Accordion thuần Tailwind */}
              {courseCurriculum.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  {t('upload.no_curriculum_data')}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {courseCurriculum.map((chap, idx) => {
                    const isSelectedChapter = chap.ID === selectedChapterId;
                    const isOpen = Boolean(openAccordions[idx]);

                    return (
                      <div
                        key={chap.ID}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          isSelectedChapter
                            ? 'border-blue-400 bg-blue-50/30 dark:border-blue-700 dark:bg-blue-950/20'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                        }`}
                      >
                        {/* Header Accordion */}
                        <button
                          type="button"
                          onClick={() => toggleAccordion(idx)}
                          className="w-full flex items-center justify-between p-3.5 text-left transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {t('upload.part')} {chap.ChapterNumber}: {chap.Title}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {chap.videos.length} {t('upload.lessons_count')}
                            </span>
                          </div>
                          {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />}
                        </button>

                        {/* Body Accordion */}
                        {isOpen && (
                          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            {chap.videos.length === 0 ? (
                              <p className="text-[11px] text-slate-400 text-center py-2">
                                {t('upload.no_videos_in_part')}
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {chap.videos.map((vid, vIdx) => {
                                  const isJustUploaded = vid.ID === recentUploadedVideoId;

                                  return (
                                    <div
                                      key={vid.ID}
                                      className={`p-2.5 rounded-xl flex items-center justify-between text-xs transition-all ${
                                        isJustUploaded
                                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate pr-2">
                                        <PlayCircle className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                        <span className="font-medium truncate" title={vid.Title}>
                                          {vIdx + 1}. {vid.Title}
                                        </span>
                                      </div>
                                      <span className="font-mono text-[10px] text-slate-400 flex-shrink-0">
                                        {formatDuration(vid.Length)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Nút chọn nhanh chương */}
                            <div className="pt-2 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedChapterId(chap.ID)}
                                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                                  isSelectedChapter
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                {isSelectedChapter ? t('upload.currently_selected_chapter') : t('upload.select_to_upload_here')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================
       * MODAL TẠO CHƯƠNG / PHẦN MỚI
       * =================================================================== */}
      {showAddChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('upload.add_new_chapter_modal')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddChapterModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewChapter} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  {t('upload.belongs_to_course')}
                </label>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {currentCourse?.Title} ({currentCourse?.ID})
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  {t('upload.chapter_title_required')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t('upload.chapter_title_placeholder')}
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  {t('instructor.short_description')}
                </label>
                <textarea
                  rows={2}
                  placeholder={t('upload.chapter_desc_placeholder')}
                  value={newChapterDesc}
                  onChange={(e) => setNewChapterDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddChapterModal(false)}
                  className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-1.5 text-xs font-semibold text-white shadow-xs"
                >
                  {t('upload.create_chapter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TẠO KHÓA HỌC MỚI */}
      <CreateCourseModal
        show={showCreateCourseModal}
        onHide={() => setShowCreateCourseModal(false)}
        onCourseCreated={handleCourseCreated}
      />
    </div>
  );
}
