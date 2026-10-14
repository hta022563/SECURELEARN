import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  GraduationCap,
  FolderPlus,
  UploadCloud,
  Search,
  ShieldCheck,
  Edit,
  Play,
  Trash2,
  FolderOpen,
  Info,
  Plus,
  Clock,
  HardDrive,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  getCourses,
  deleteCourse,
  updateCourse,
  updateVideoTitle,
  deleteVideo,
  updateChapterTitle,
  deleteChapter,
  getCourseWithLessons,
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
 * COMPONENT: InstructorVideos (Pure Tailwind CSS & Lucide Icons)
 * =============================================================================
 */
export default function InstructorVideos() {
  const { user } = useAuth();
  const { lang } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [coursesList, setCoursesList] = useState([]);
  const [chaptersList, setChaptersList] = useState([]);
  const [videosList, setVideosList] = useState([]);

  useEffect(() => {
    let isMounted = true;
    getCourses()
      .then(async (data) => {
        if (!isMounted) return;
        if (Array.isArray(data)) {
          setCoursesList(data);

          if (data.length > 0) {
            try {
              const courseDetails = await Promise.all(
                data.map((c) => getCourseWithLessons(c.ID || c.id))
              );
              if (isMounted) {
                const allFetchedChapters = courseDetails.flatMap((cd) => cd.chapters || []);
                const allFetchedLessons = courseDetails.flatMap((cd) => cd.lessons || []);

                setChaptersList(allFetchedChapters);
                setVideosList(allFetchedLessons);
              }
            } catch (e) {
              console.warn('[InstructorVideos] Lỗi nạp chi tiết bài học từ BE:', e);
            }
          } else {
            setChaptersList([]);
            setVideosList([]);
          }
        }
      })
      .catch((err) => {
        console.warn('[InstructorVideos] Lỗi nạp khóa học:', err);
        if (isMounted) {
          setCoursesList([]);
          setChaptersList([]);
          setVideosList([]);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);

  // State Modal quản lý chi tiết bài giảng của Khóa học được chọn
  const [selectedCourseForDetail, setSelectedCourseForDetail] = useState(null);
  const [openDetailChapters, setOpenDetailChapters] = useState({ 0: true });

  const toggleDetailChapter = (idx) => {
    setOpenDetailChapters((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

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
    const myCourses = coursesList.filter(
      (c) => c.Owner === user?.userId || c.owner === user?.userId || c.instructor === user?.username
    );
    const targetCourses = myCourses.length > 0 ? myCourses : coursesList;

    return targetCourses.map((course) => {
      const courseId = course.ID || course.id;
      const courseChaps = chaptersList
        .filter((ch) => ch.CoursesID === courseId || ch.course_id === courseId || ch.courseId === courseId)
        .sort((a, b) => (a.ChapterNumber || 1) - (b.ChapterNumber || 1));

      const courseVideos = videosList.filter((v) => {
        const vCourseId = v.courseId || v.course_id;
        if (vCourseId) return String(vCourseId) === String(courseId);
        return courseChaps.some((ch) => {
          const chId = ch.ID || ch.id;
          return (
            (v.chapterId && String(v.chapterId) === String(chId)) ||
            (v.chapter_id && String(v.chapter_id) === String(chId))
          );
        });
      });

      const totalSeconds = courseVideos.reduce((acc, v) => acc + (v.Length || v.duration || 0), 0);
      const totalBytes = courseVideos.reduce((acc, v) => acc + (v.Size || v.file_size || 0), 0);

      const structuredChapters = courseChaps.map((chap) => {
        const chapId = chap.ID || chap.id;
        const chapVideos = courseVideos.filter((v) => {
          const vChapId = v.chapterId || v.chapter_id || v.chapter;
          return vChapId && String(vChapId) === String(chapId);
        });

        const uniqueChapVideos = [];
        const seenIds = new Set();
        for (const v of chapVideos) {
          const vId = v?.ID || v?.id;
          if (v && vId && !seenIds.has(vId)) {
            seenIds.add(vId);
            uniqueChapVideos.push(v);
          }
        }

        uniqueChapVideos.sort(
          (a, b) =>
            new Date(a.UploadTime || a.uploadTime || 0) - new Date(b.UploadTime || b.uploadTime || 0)
        );

        return {
          ...chap,
          ID: chapId,
          videos: uniqueChapVideos,
        };
      });

      return {
        ...course,
        ID: courseId,
        chaptersCount: courseChaps.length,
        videosCount: courseVideos.length,
        totalSeconds,
        totalBytes,
        structuredChapters,
      };
    });
  }, [coursesList, chaptersList, videosList, user]);

  const filteredCourses = courseSummaries.filter((c) => {
    const term = searchTerm.toLowerCase();
    const title = (c.Title || c.title || '').toLowerCase();
    const desc = (c.Description || c.description || '').toLowerCase();
    return title.includes(term) || desc.includes(term);
  });

  const handleOpenEditVideoModal = (video) => {
    setEditingVideo(video);
    setFormVideoTitle(video.Title || video.title || '');
  };

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

  const handleOpenCourseDetail = async (course) => {
    setSelectedCourseForDetail(course);
    try {
      const detailed = await getCourseWithLessons(course.ID || course.id);
      if (detailed?.chapters) {
        setSelectedCourseForDetail((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            chaptersCount: detailed.chapters.length,
            videosCount: detailed.lessons.length,
            structuredChapters: detailed.chapters,
          };
        });
      }
    } catch (e) {
      console.warn('Lỗi đồng bộ chi tiết khóa học từ BE:', e);
    }
  };

  const handleDeleteCourse = async (courseId, courseTitle, e) => {
    if (e) e.stopPropagation();
    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa khóa học "${courseTitle}"? Thao tác này sẽ xóa toàn bộ chương và bài học bên trong.`
      )
    ) {
      try {
        await deleteCourse(courseId);
        setCoursesList((prev) => prev.filter((c) => c.ID !== courseId && c.id !== courseId));
        showToast(`Đã xóa thành công khóa học: "${courseTitle}".`, 'info', 'Đã Xóa Khóa Học');
      } catch (err) {
        showToast(`Lỗi xóa khóa học: ${err.message}`, 'danger', 'Lỗi');
      }
    }
  };

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

  const handleOpenEditChapterModal = (chapter, e) => {
    if (e) e.stopPropagation();
    setEditingChapter(chapter);
    setChapterFormTitle(chapter.Title || '');
    setChapterFormDesc(chapter.Description || '');
  };

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

  const handleDeleteChapter = async (chapterId, chapterTitle, e) => {
    if (e) e.stopPropagation();
    if (
      window.confirm(
        `${t('instructor.delete_chapter_confirm')} "${chapterTitle}" ${t(
          'instructor.delete_chapter_confirm_suffix'
        )}`
      )
    ) {
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
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 1. HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>{t('instructor.management_space')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
            {t('instructor.courses_and_videos')}{' '}
            <span className="text-blue-600 dark:text-blue-400">
              {t('instructor.my_courses_suffix')}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t('instructor.management_desc')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowCreateCourseModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-600/30 bg-blue-50/50 dark:bg-blue-950/30 px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-all cursor-pointer"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>{t('instructor.add_course')}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(`/${lang}/instructor/upload`)}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>{t('instructor.upload_video_part')}</span>
          </button>
        </div>
      </div>

      {/* 2. BỘ TÌM KIẾM */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder={t('instructor.search_course_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {t('instructor.manage')}{' '}
            <strong className="text-blue-600 dark:text-blue-400 font-bold">
              {filteredCourses.length}
            </strong>{' '}
            {t('instructor.copyrighted_courses')}
          </div>
        </div>
      </div>

      {/* 3. DANH SÁCH KHÓA HỌC GỐC */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredCourses.length === 0 ? (
          <div className="col-span-full text-center py-16 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <FolderOpen className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h6 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {t('instructor.no_course_found')}
            </h6>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {t('instructor.create_course_prompt')}
            </p>
            <button
              type="button"
              onClick={() => setShowCreateCourseModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white shadow-xs"
            >
              {t('instructor.add_course')}
            </button>
          </div>
        ) : (
          filteredCourses.map((course) => (
            <div
              key={course.ID}
              className="flex flex-col rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
            >
              {/* Header Thẻ Khóa Học */}
              <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 rounded-full">
                  <ShieldCheck className="h-3 w-3 text-blue-600" />
                  <span>DRM HLS Ready</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {course.ID}
                </span>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <h3
                  className="font-bold text-base text-slate-900 dark:text-white mb-2 line-clamp-1"
                  title={course.Title}
                >
                  {course.Title}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">
                  {course.Description}
                </p>

                {/* Thống kê cấu trúc */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('instructor.course_structure')}</span>
                    <strong className="text-slate-700 dark:text-slate-300">
                      {course.chaptersCount} {t('instructor.chapters')} • {course.videosCount} {t('instructor.lessons')}
                    </strong>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{t('instructor.duration_and_size')}</span>
                    <span>
                      {formatDuration(course.totalSeconds)} • {formatBytes(course.totalBytes)}
                    </span>
                  </div>
                </div>

                {/* Thao tác */}
                <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenCourseDetail(course)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>{t('instructor.edit_lesson')}</span>
                  </button>

                  <button
                    type="button"
                    title={t('instructor.view')}
                    onClick={() => navigate(`/${lang}/instructor/preview/${course.ID || course.id}`)}
                    className="p-2 rounded-full border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    title="Upload video"
                    onClick={() =>
                      navigate(`/${lang}/instructor/upload`, {
                        state: { courseId: course.ID || course.id },
                      })
                    }
                    className="p-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <UploadCloud className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    title="Xóa khóa học"
                    onClick={(e) => handleDeleteCourse(course.ID || course.id, course.Title, e)}
                    className="p-2 rounded-full border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. MODAL CHI TIẾT: QUẢN LÝ TỪNG CHƯƠNG */}
      {Boolean(selectedCourseForDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('instructor.lecture_structure')} {selectedCourseForDetail?.Title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCourseForDetail(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/60 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Info className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>
                    {t('instructor.course_contains')}{' '}
                    <strong>{selectedCourseForDetail?.chaptersCount} {t('instructor.chapters_and')}</strong>{' '}
                    <strong>{selectedCourseForDetail?.videosCount} {t('instructor.lessons_dot')}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const cid = selectedCourseForDetail?.ID;
                    setSelectedCourseForDetail(null);
                    navigate(`/${lang}/instructor/upload`, { state: { courseId: cid } });
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
                >
                  <Plus className="h-3 w-3" />
                  <span>{t('instructor.upload_more_lessons')}</span>
                </button>
              </div>

              {/* Danh sách chương */}
              {selectedCourseForDetail?.structuredChapters.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  {t('instructor.no_chapters_prompt_1')} <strong>{t('instructor.upload_video_part')}</strong> {t('instructor.no_chapters_prompt_2')}
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedCourseForDetail?.structuredChapters.map((chap, idx) => {
                    const isOpen = openDetailChapters[idx] !== false;

                    return (
                      <div
                        key={chap.ID}
                        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900"
                      >
                        <div
                          onClick={() => toggleDetailChapter(idx)}
                          className="flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-850 hover:bg-slate-100/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {t('instructor.chapters')} {chap.ChapterNumber}: {chap.Title}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {chap.videos.length} {t('instructor.lessons_count')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditChapterModal(chap, e)}
                              className="px-2 py-1 rounded-full text-[11px] font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            >
                              {t('instructor.edit_chapter')}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const cid = selectedCourseForDetail?.ID;
                                setSelectedCourseForDetail(null);
                                navigate(`/${lang}/instructor/upload`, {
                                  state: { courseId: cid, chapterId: chap.ID },
                                });
                              }}
                              className="px-2 py-1 rounded-full text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            >
                              {t('instructor.add_lesson')}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteChapter(chap.ID, chap.Title, e)}
                              className="p-1 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <div className="text-slate-400 ml-1">
                              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {chap.Description && (
                              <div className="p-3 bg-slate-50/40 dark:bg-slate-850/40 text-xs text-slate-400 italic">
                                {chap.Description}
                              </div>
                            )}

                            {chap.videos.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-400">
                                {t('instructor.no_videos_in_chapter')}
                              </div>
                            ) : (
                              chap.videos.map((vid, vIdx) => (
                                <div
                                  key={vid.ID}
                                  className="p-3.5 flex items-center justify-between flex-wrap gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                                      {vIdx + 1}
                                    </div>
                                    <div>
                                      <h5 className="font-bold text-xs text-slate-900 dark:text-white mb-0.5">
                                        {vid.Title}
                                      </h5>
                                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 text-blue-500" />
                                          {formatDuration(vid.Length)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <HardDrive className="h-3 w-3 text-slate-400" />
                                          {formatBytes(vid.Size)}
                                        </span>
                                        <span className="font-mono">{vid.ID}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/${lang}/instructor/preview/${vid.ID}`)}
                                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-900 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50"
                                    >
                                      <Play className="h-3 w-3" />
                                      <span>{t('instructor.view')}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditVideoModal(vid)}
                                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                                    >
                                      <Edit className="h-3 w-3" />
                                      <span>{t('instructor.edit_name')}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReuploadModal(vid)}
                                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-900 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50"
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                      <span>{t('instructor.reupload_video')}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteVideo(vid.ID, vid.Title)}
                                      className="p-1.5 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCourseForDetail(null)}
                className="rounded-full border border-slate-200 dark:border-slate-700 px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL SỬA TIÊU ĐỀ BÀI HỌC NHỎ */}
      {Boolean(editingVideo) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit className="h-4 w-4 text-blue-600" />
                <span>{t('instructor.edit_video_title')}</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVideoTitle} className="space-y-4">
              <div className="text-xs text-slate-400">
                <span>{t('instructor.video_id')} </span>
                <code className="text-blue-600">{editingVideo?.ID}</code>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('instructor.lesson_title_required')}
                </label>
                <input
                  type="text"
                  value={formVideoTitle}
                  onChange={(e) => setFormVideoTitle(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-1.5 text-xs font-semibold text-white shadow-xs"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL SỬA THÔNG TIN CHƯƠNG */}
      {Boolean(editingChapter) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-blue-600" />
                <span>{t('instructor.edit_chapter_info')}</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingChapter(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveChapter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('instructor.chapter_title_required')}
                </label>
                <input
                  type="text"
                  value={chapterFormTitle}
                  onChange={(e) => setChapterFormTitle(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('instructor.short_description')}
                </label>
                <textarea
                  rows={3}
                  value={chapterFormDesc}
                  onChange={(e) => setChapterFormDesc(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingChapter(null)}
                  className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-1.5 text-xs font-semibold text-white shadow-xs"
                >
                  {t('common.save')}
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
    </div>
  );
}
