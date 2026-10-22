import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  ShieldAlert,
  AlertTriangle,
  GraduationCap,
  Compass,
  ChevronDown,
  ChevronUp,
  Play,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Save,
  User,
  Clock,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SecureVideoPlayer from '../components/SecureVideoPlayer';
import { checkCourseAccess } from '../services/entitlementService';
import { getCourseWithLessons } from '../services/courseService';
import { createDrmSession, closeDrmSession } from '../services/drmService';

/**
 * =============================================================================
 * PAGE: StudentCoursePlayer (Giao diện học tập kết nối Backend API)
 * Pure Tailwind CSS & Lucide Icons
 * =============================================================================
 */
export default function StudentCoursePlayer() {
  const { lang, videoId: paramCourseOrVideoId } = useParams();
  const currentLang = lang || 'vi';
  const navigate = useNavigate();
  const { user } = useAuth();

  // Nạp dữ liệu từ Backend API
  const [backendData, setBackendData] = useState(null);
  const [isLoadingBackend, setIsLoadingBackend] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState('overview');

  // Accordion State
  const [openChapters, setOpenChapters] = useState({ 0: true });

  const toggleChapter = (index) => {
    setOpenChapters((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoadingBackend(true);
    getCourseWithLessons(paramCourseOrVideoId)
      .then((res) => {
        if (isMounted && res) {
          setBackendData(res);
        }
      })
      .catch((err) => {
        console.warn('[StudentCoursePlayer] Lỗi nạp từ Backend API:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingBackend(false);
      });

    return () => {
      isMounted = false;
    };
  }, [paramCourseOrVideoId]);

  // 1. Dữ liệu: Xác định Khóa học hiện tại
  const currentCourse = useMemo(() => {
    return backendData?.course || null;
  }, [backendData]);

  // Kiểm tra quyền xem khóa học từ bảng Entitlements
  const accessResult = useMemo(() => {
    if (!currentCourse) {
      return {
        hasAccess: false,
        reason: 'NOT_FOUND',
        message: 'Không tìm thấy thông tin khóa học trên hệ thống.',
      };
    }
    return checkCourseAccess(user, currentCourse.ID || currentCourse.id);
  }, [currentCourse, user]);

  // 2. Dữ liệu: Ghép các video bài giảng từ Backend API vào các chương
  const curriculum = useMemo(() => {
    if (backendData?.chapters && backendData.chapters.length > 0) {
      return backendData.chapters.map((chap, idx) => ({
        ID: chap.id || chap.ID,
        ChapterNumber: chap.ChapterNumber || (idx + 1),
        Title: chap.title || chap.Title || `Chương ${idx + 1}`,
        Description: chap.description || chap.Description || '',
        videos: (chap.lessons || chap.videos || []).map((l) => ({
          ...l,
          ID: l.id || l.ID,
          Title: l.title || l.Title,
          Description: l.description || l.Description,
          videoUrl: l.url || l.videoURL || l.videoUrl,
        })),
      }));
    }

    if (backendData?.lessons && backendData.lessons.length > 0) {
      const grouped = {};
      backendData.lessons.forEach((l) => {
        const chapKey = l.chapterId || l.chapter_id || 'ch-main';
        if (!grouped[chapKey]) {
          grouped[chapKey] = {
            ID: chapKey,
            ChapterNumber: Object.keys(grouped).length + 1,
            Title: l.chapterTitle || `Phần: ${chapKey}`,
            Description: l.description || '',
            videos: [],
          };
        }
        grouped[chapKey].videos.push({
          ...l,
          ID: l.id || l.ID,
          Title: l.title || l.Title,
          Description: l.description || l.Description,
          videoUrl: l.url || l.videoURL || l.videoUrl,
        });
      });
      return Object.values(grouped);
    }

    return [];
  }, [backendData]);

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

  // 3. Bài giảng đang phát
  const [activeLectureId, setActiveLectureId] = useState('');

  useEffect(() => {
    if (allLectures && allLectures.length > 0) {
      setActiveLectureId((prev) => {
        if (prev && allLectures.some((l) => l.ID === prev)) return prev;
        return allLectures[0].ID;
      });
    } else {
      setActiveLectureId('');
    }
  }, [allLectures]);

  // State tương tác người dùng
  const [completedLectures, setCompletedLectures] = useState([]);
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState([]);

  // Bài giảng đang được chọn
  const activeLecture = useMemo(() => {
    return allLectures.find((l) => l.ID === activeLectureId) || allLectures[0] || null;
  }, [allLectures, activeLectureId]);

  // DRM Session State & Lifecycle
  const [drmSession, setDrmSession] = useState(null);
  const activeSessionIdRef = useRef(null);

  useEffect(() => {
    const lessonId = activeLecture?.ID;
    if (!lessonId) return;

    let isMounted = true;

    // Đóng phiên cũ trước khi chuyển bài giảng
    if (activeSessionIdRef.current) {
      closeDrmSession(activeSessionIdRef.current);
      activeSessionIdRef.current = null;
    }

    createDrmSession({ lessonId })
      .then((sessionData) => {
        if (isMounted && sessionData) {
          setDrmSession(sessionData);
          activeSessionIdRef.current = sessionData.sessionId;
        }
      })
      .catch(() => {
        // Nếu bài giảng dùng HLS thông thường, chuyển về null để kích hoạt trình phát HLS
        if (isMounted) {
          setDrmSession(null);
        }
      });

    return () => {
      isMounted = false;
      if (activeSessionIdRef.current) {
        closeDrmSession(activeSessionIdRef.current);
        activeSessionIdRef.current = null;
      }
    };
  }, [activeLecture?.ID]);

  const currentIdx = allLectures.findIndex((l) => l.ID === activeLectureId);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < allLectures.length - 1;

  const instructorName =
    activeLecture?.uploadedBy ||
    activeLecture?.UploadedBy ||
    currentCourse?.instructor ||
    currentCourse?.Instructor ||
    currentCourse?.owner ||
    currentCourse?.Owner;

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

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const progressPercent = allLectures.length > 0
    ? Math.round((completedLectures.length / allLectures.length) * 100)
    : 0;

  if (!currentCourse) {
    return (
      <div className="py-20 text-center max-w-md mx-auto px-4">
        <h5 className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          Không tìm thấy dữ liệu khóa học.
        </h5>
        <button
          onClick={() => navigate(`/${currentLang}/catalog`)}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-xs font-semibold text-white shadow-xs"
        >
          Về danh mục khóa học
        </button>
      </div>
    );
  }

  // =============================================================================
  // KIỂM SOÁT QUYỀN TRUY CẬP: CHƯA CẤP QUYỀN -> CHẶN XEM VIDEO BÀI GIẢNG
  // =============================================================================
  if (!accessResult.hasAccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md text-center bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200/80 dark:border-slate-800 transition-all">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mb-6 shadow-sm">
            <ShieldAlert className="h-10 w-10 stroke-[1.75]" />
          </div>

          <span className="inline-block px-3 py-1 text-xs font-bold tracking-wider uppercase text-rose-600 dark:text-rose-400 bg-rose-100/60 dark:bg-rose-900/40 rounded-full mb-3">
            CHƯA CẤP QUYỀN XEM • BẢO MẬT DRM
          </span>

          <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            Quyền Truy Cập Bị Từ Chối
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Khóa học: <strong className="text-slate-800 dark:text-slate-200">{currentCourse.Title}</strong> (
            <code className="text-blue-600">{currentCourse.ID}</code>)
          </p>

          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-200 text-left flex items-start gap-2.5 mb-6 leading-relaxed">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong>Chính sách bản quyền SecureLearn:</strong> Khóa học trong danh mục khóa học chưa được cấp quyền xem thì chưa thể xem được. Chỉ các khóa học đã được ghi danh trong mục <strong>"Khóa học của tôi"</strong> mới có thể xem video bài giảng.
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate(`/${currentLang}/student/courses`)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20"
            >
              <GraduationCap className="h-4 w-4" />
              <span>Vào Khóa Học Của Tôi</span>
            </button>
            <button
              onClick={() => navigate(`/${currentLang}/catalog`)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-xs"
            >
              <Compass className="h-4 w-4 text-slate-400" />
              <span>Danh Mục Khóa Học</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm mb-6 border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
              <Link
                to={`/${currentLang}/student/courses`}
                className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 no-underline font-medium"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Khóa học của tôi</span>
              </Link>
              <span>/</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold truncate max-w-xs sm:max-w-md">
                {currentCourse.Title}
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {currentCourse.Title}
              </h2>
              {currentCourse.Price != null && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {currentCourse.Price === 0 ? 'Miễn phí' : `${currentCourse.Price.toLocaleString('vi-VN')} đ`}
                </span>
              )}
            </div>
          </div>

          {/* Thanh tiến độ tóm tắt */}
          {allLectures.length > 0 && (
            <div className="w-full md:w-56 shrink-0 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Tiến độ bài học:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400 block text-right">
                {completedLectures.length}/{allLectures.length} bài đã hoàn thành
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN STAGE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (COL-8): Video Player & Tabs */}
        <div className="lg:col-span-8 space-y-5">
          {/* TRÌNH PHÁT VIDEO CHÍNH */}
          <div>
            {drmSession && drmSession.playbackType === 'DASH_CENC' ? (
              // 1. Luồng phát DRM DASH CENC (Shaka Player + W3C Clear Key EME)
              <SecureVideoPlayer
                manifestUrl={drmSession.manifestUrl}
                licenseUrl={drmSession.licenseUrl}
                playbackToken={drmSession.sessionToken}
                watermarkInfo={{
                  username: user?.username || user?.email || user?.fullName || 'Học viên',
                  userId: user?.userId || user?.sub || user?.id || 'u-student',
                  sessionId: drmSession.sessionId,
                }}
                title={activeLecture?.Title || currentCourse.Title}
                embedded={true}
                onEnded={handleNextLecture}
              />
            ) : (
              // 2. Trình phát HLS thông thường hiện có (Giữ nguyên tương thích ngược)
              <SecureVideoPlayer
                videoId={activeLecture?.ID || currentCourse.ID}
                courseId={currentCourse?.ID}
                videoUrl={activeLecture?.videoURL || activeLecture?.videoUrl}
                studentId={user?.userId || user?.sub || 'STUDENT'}
                watermarkInfo={{
                  username: user?.username || user?.email || 'Học viên',
                  userId: user?.userId || user?.sub || 'u-student',
                  sessionId: drmSession?.sessionId || 'SES-HLS-ACTIVE',
                }}
                title={activeLecture?.Title || currentCourse.Title}
                embedded={true}
                onEnded={handleNextLecture}
              />
            )}
          </div>

          {/* THANH ĐIỀU HƯỚNG BÀI HỌC */}
          {activeLecture && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-xs flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                disabled={!hasPrev}
                onClick={handlePrevLecture}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Bài trước</span>
              </button>

              <button
                type="button"
                onClick={() => toggleComplete(activeLecture.ID)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  completedLectures.includes(activeLecture.ID)
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'border border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                }`}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>
                  {completedLectures.includes(activeLecture.ID)
                    ? 'Đã hoàn thành'
                    : 'Đánh dấu hoàn thành'}
                </span>
              </button>

              <button
                type="button"
                disabled={!hasNext}
                onClick={handleNextLecture}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
              >
                <span>Bài tiếp theo</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* TABS CHI TIẾT */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
            {/* Tab Buttons */}
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5 overflow-x-auto">
              {[
                { id: 'overview', label: 'Tổng quan' },
                { id: 'instructor', label: 'Giảng viên' },
                { id: 'notes', label: 'Ghi chú' },
                { id: 'drm', label: 'Nhật ký truy cập' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {activeLecture && (
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeLecture.Title}
                  </h4>
                )}

                {activeLecture?.chapterTitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Thuộc chương:{' '}
                    <strong className="text-slate-700 dark:text-slate-300">
                      Chương {activeLecture.chapterNumber}: {activeLecture.chapterTitle}
                    </strong>
                  </p>
                )}

                {activeLecture?.chapterDescription && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                    <h6 className="font-bold text-slate-900 dark:text-white mb-1">Mô tả chương mục:</h6>
                    <p className="text-slate-500 dark:text-slate-400 mb-0">
                      {activeLecture.chapterDescription}
                    </p>
                  </div>
                )}

                {currentCourse.Description && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                    <h6 className="font-bold text-slate-900 dark:text-white mb-1">Mô tả khóa học:</h6>
                    <p className="text-slate-500 dark:text-slate-400 mb-0">
                      {currentCourse.Description}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'instructor' && (
              <div>
                {instructorName ? (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shrink-0">
                      {String(instructorName).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-0.5">
                        {instructorName}
                      </h5>
                      <span className="text-[11px] text-slate-400">Giảng viên phụ trách</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mb-0">Chưa có thông tin giảng viên.</p>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-4">
                <form onSubmit={handleSaveNote} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Ghi chú cá nhân của bạn:
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Nhập ghi chú cho bài giảng này..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Lưu ghi chú</span>
                  </button>
                </form>

                {savedNotes.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <h6 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Ghi chú đã ghi:
                    </h6>
                    {savedNotes.map((n, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800 flex items-start gap-2"
                      >
                        <span className="text-blue-600 dark:text-blue-400 font-semibold shrink-0">
                          [{n.time}]
                        </span>
                        <span>{n.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'drm' && (
              <div className="space-y-3 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-slate-400">Trạng thái phiên DRM:</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {drmSession ? 'Đang hoạt động (ACTIVE)' : 'HLS Fallback Protected'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-slate-400">Mã phiên phát (Session ID):</span>
                    <code className="text-blue-600 dark:text-blue-400 font-mono font-semibold">
                      {drmSession?.sessionId || 'ses-drm-live'}
                    </code>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-slate-400">Định dạng giải mã:</span>
                    <strong className="text-slate-700 dark:text-slate-300">
                      {drmSession?.playbackType === 'DASH_CENC' ? 'MPEG-DASH CENC (W3C Clear Key)' : 'HLS AES-128'}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-slate-400">Định danh gán Watermark:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono">
                      {user?.userId || user?.sub || 'STUDENT'} ({user?.email || user?.username || 'user'})
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400">Thời hạn phiên phát:</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {drmSession?.expiresAt ? new Date(drmSession.expiresAt).toLocaleTimeString('vi-VN') : '2 giờ từ lúc tạo'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  * Mọi tương tác phát video đều được ghi nhận vào nhật ký kiểm toán (AccessLog & License Audit) để bảo vệ bản quyền.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI (COL-4): Curriculum Accordion */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="bg-slate-50/60 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 py-4 px-5">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-0.5">
                Chương Trình Giảng Dạy
              </h4>
              <p className="text-[11px] text-slate-400 mb-0">
                {curriculum.length} Chương • {allLectures.length} Bài giảng
              </p>
            </div>

            <div className="max-h-[calc(100vh-220px)] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {curriculum.map((chap, cIdx) => {
                const isOpen = openChapters[cIdx] !== false;

                return (
                  <div key={chap.ID}>
                    {/* Chapter Header */}
                    <button
                      type="button"
                      onClick={() => toggleChapter(cIdx)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="pr-2">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                          Chương {chap.ChapterNumber}: {chap.Title}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {chap.videos.length} bài
                        </span>
                      </div>
                      <div className="text-slate-400">
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </button>

                    {/* Chapter Video List */}
                    {isOpen && (
                      <div className="bg-slate-50/40 dark:bg-slate-950/20 divide-y divide-slate-100 dark:divide-slate-800">
                        {chap.videos.map((vid) => {
                          const isActive = vid.ID === activeLectureId;
                          const isCompleted = completedLectures.includes(vid.ID);

                          return (
                            <div
                              key={vid.ID}
                              onClick={() => handleSelectLecture(vid.ID)}
                              className={`flex items-center justify-between p-3.5 text-xs transition-colors cursor-pointer ${
                                isActive
                                  ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold border-l-4 border-blue-600'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden mr-2">
                                {isActive ? (
                                  <Play className="h-4 w-4 text-blue-600 fill-blue-600 shrink-0" />
                                ) : isCompleted ? (
                                  <CheckCircle className="h-4 w-4 text-emerald-500 fill-emerald-500 shrink-0" />
                                ) : (
                                  <Play className="h-4 w-4 text-slate-400 shrink-0" />
                                )}
                                <span className="truncate" title={vid.Title}>
                                  {vid.Title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400">
                                {isActive && (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-semibold">
                                    Đang phát
                                  </span>
                                )}
                                {vid.Length != null && (
                                  <span>{formatDuration(vid.Length)}</span>
                                )}
                                {vid.Size != null && (
                                  <span>{formatBytes(vid.Size)}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
