import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Eye,
  ShieldCheck,
  Edit,
  RefreshCw,
  UploadCloud,
  Play,
  ArrowLeft,
  ArrowRight,
  Clock,
  HardDrive,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SecureVideoPlayer from '../components/SecureVideoPlayer';
import ReuploadVideoModal from '../components/ReuploadVideoModal';
import { getCourseWithLessons } from '../services/courseService';

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
 * Pure Tailwind CSS & Lucide Icons
 * =============================================================================
 */
export default function InstructorVideoPreview() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showReuploadModal, setShowReuploadModal] = useState(false);

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

  // Nạp dữ liệu từ Backend API
  const [backendData, setBackendData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getCourseWithLessons(videoId)
      .then((res) => {
        if (isMounted && res) {
          setBackendData(res);
        }
      })
      .catch((err) => {
        console.warn('[InstructorVideoPreview] Lỗi tải từ Backend API:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [videoId]);

  // 1. Xác định Khóa học hiện tại
  const currentCourse = useMemo(() => {
    return backendData?.course || null;
  }, [backendData]);

  // 2. Ghép các video vào từng chương
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

  // 3. Danh sách phẳng tất cả bài giảng trong khóa học
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

  // 4. Bài giảng đang được xem
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

  // Chi tiết bài giảng đang phát
  const activeLecture = useMemo(() => {
    return allLectures.find((l) => l.ID === activeLectureId) || allLectures[0] || null;
  }, [allLectures, activeLectureId]);

  const currentIdx = allLectures.findIndex((l) => l.ID === activeLectureId);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < allLectures.length - 1;

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

  return (
    <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm mb-6 border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
              <Link
                to="/instructor/videos"
                className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 no-underline font-medium"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Quản lý khóa học & bài giảng</span>
              </Link>
              <span>/</span>
              <span className="text-blue-600 dark:text-blue-400 font-semibold truncate max-w-xs sm:max-w-md">
                {currentCourse?.Title}
              </span>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {activeLecture?.Title || currentCourse?.Title}
              </h2>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                <Eye className="h-3 w-3" />
                <span>Chế Độ Xem Trước (Instructor)</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="h-3 w-3" />
                <span>HLS AES-128 Active</span>
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-1">
              {currentCourse?.Title}
              {activeLecture?.chapterTitle
                ? ` • Chương ${activeLecture.chapterNumber}: ${activeLecture.chapterTitle}`
                : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => navigate('/instructor/videos')}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-900 px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Chỉnh Sửa Bài Giảng</span>
            </button>
            <button
              type="button"
              onClick={() => setShowReuploadModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Up Lại Video Khác</span>
            </button>
            <button
              type="button"
              onClick={() =>
                navigate('/instructor/upload', { state: { courseId: currentCourse?.ID } })
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white shadow-xs"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Tải Thêm Bài Nhỏ</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN STAGE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (COL-8): Video Player & Tabs */}
        <div className="lg:col-span-8 space-y-5">
          {/* TRÌNH PHÁT VIDEO CHÍNH */}
          <div>
            <SecureVideoPlayer
              videoId={activeLecture?.ID || currentCourse?.ID || 'v-001'}
              courseId={currentCourse?.ID}
              videoUrl={activeLecture?.videoURL || activeLecture?.videoUrl}
              studentId={`INS-${user?.name || user?.userId || 'INSTRUCTOR'}`}
              title={activeLecture?.Title || currentCourse?.Title || 'Video Bài Giảng'}
              embedded={true}
            />
          </div>

          {/* THANH ĐIỀU HƯỚNG BÀI HỌC NHANH */}
          {allLectures.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 shadow-xs flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                disabled={!hasPrev}
                onClick={handlePrevLecture}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Bài trước</span>
              </button>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Bài <strong className="text-blue-600 dark:text-blue-400 font-bold">{currentIdx + 1}</strong> / {allLectures.length} trong khóa học
              </div>

              <button
                type="button"
                disabled={!hasNext}
                onClick={handleNextLecture}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 px-4 py-1.5 text-xs font-semibold text-white shadow-xs"
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
                { id: 'overview', label: 'Tổng quan bài giảng' },
                { id: 'security', label: 'Kiểm định DRM & Watermark' },
                { id: 'logs', label: 'Nhật ký truy cập' },
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
                    <strong className="text-slate-900 dark:text-white block mb-1">Mục tiêu chương:</strong>
                    <p className="text-slate-500 dark:text-slate-400 mb-0">
                      {activeLecture.chapterDescription}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Thời lượng:</span>
                    <strong className="text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      <span>{formatDuration(activeLecture?.Length)}</span>
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Dung lượng file:</span>
                    <strong className="text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <HardDrive className="h-3.5 w-3.5 text-slate-400" />
                      <span>{formatBytes(activeLecture?.Size)}</span>
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Mã định danh (ID):</span>
                    <code className="text-blue-600 font-mono">{activeLecture?.ID}</code>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-3">
                <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Cơ Chế Bảo Mật Video Bản Quyền SecureLearn</span>
                </h5>
                <ul className="text-slate-600 dark:text-slate-300 space-y-2 pl-4 list-disc">
                  <li>
                    <strong>Mã hóa phân đoạn AES-128:</strong> Toàn bộ video được chia thành các chunk .ts nhỏ 6 giây và mã hóa với khóa phiên riêng biệt.
                  </li>
                  <li>
                    <strong>Watermark động chống quay trộm:</strong> Tự động hiển thị mờ tên tài khoản và mã định danh của giảng viên/học viên trôi ngẫu nhiên trên màn hình.
                  </li>
                  <li>
                    <strong>Chống tải lậu & trích xuất URL:</strong> Đường dẫn video phát qua Signed URL với chữ ký HMAC SHA-256 có thời hạn ngắn, tự hết hạn sau 1 giờ.
                  </li>
                  <li>
                    <strong>Chống tua lách bài:</strong> Khóa học theo dõi tiến độ thực tế, cảnh báo bất thường nếu có hành vi tua tốc độ gian lận.
                  </li>
                </ul>
              </div>
            )}

            {activeTab === 'logs' && (
              <p className="text-xs text-slate-400 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 mb-0">
                Chưa có bản ghi nhật ký nào được ghi nhận cho bài học này.
              </p>
            )}
          </div>
        </div>

        {/* CỘT PHẢI (COL-4): Curriculum Accordion */}
        <div className="lg:col-span-4">
          <div className="sticky top-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="bg-slate-50/60 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 py-4 px-5 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-0.5 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span>Giáo Trình Khóa Học</span>
                </h4>
                <p className="text-[11px] text-slate-400 mb-0">
                  {curriculum.length} Chương • {allLectures.length} Bài giảng nhỏ
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                Xem Trước
              </span>
            </div>

            <div className="max-h-[calc(100vh-220px)] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {curriculum.map((chap, cIdx) => {
                const isOpen = openChapters[cIdx] !== false;

                return (
                  <div key={chap.ID}>
                    <button
                      type="button"
                      onClick={() => toggleChapter(cIdx)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="pr-2">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate max-w-[200px]">
                          Chương {chap.ChapterNumber}: {chap.Title}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {chap.videos.length} bài
                        </span>
                      </div>
                      <div className="text-slate-400">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="bg-slate-50/40 dark:bg-slate-950/20 divide-y divide-slate-100 dark:divide-slate-800">
                        {chap.videos.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400 italic">
                            Chưa có bài giảng trong chương này.
                          </div>
                        ) : (
                          chap.videos.map((vid, vIdx) => {
                            const isActive = vid.ID === activeLectureId;

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
                                  ) : (
                                    <Play className="h-4 w-4 text-slate-400 shrink-0" />
                                  )}
                                  <span className="truncate" title={vid.Title}>
                                    {vIdx + 1}. {vid.Title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400">
                                  {isActive && (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-semibold">
                                      Đang xem
                                    </span>
                                  )}
                                  <span className="font-mono">
                                    {formatDuration(vid.Length)}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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
