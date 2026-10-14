import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  X,
  PlusCircle,
  Calendar,
  User,
  Play,
  Lock,
  Info,
  GraduationCap,
  LogIn,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkCourseAccess, getEntitledCourseIds } from '../services/entitlementService';
import { getCourses, searchCourses } from '../services/courseService';
import CreateCourseModal from '../components/CreateCourseModal';

/**
 * =============================================================================
 * PAGE: CourseCatalog (Danh Mục Khóa Học Toàn Diện - Pure Tailwind CSS)
 * =============================================================================
 */
export default function CourseCatalog() {
  const { lang } = useParams();
  const { t } = useTranslation();
  const [courseList, setCourseList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'ENTITLED' | 'UNENTITLED'
  const [blockedModalCourse, setBlockedModalCourse] = useState(null);
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      const fetchPromise = searchTerm.trim()
        ? searchCourses(searchTerm.trim())
        : getCourses();

      fetchPromise
        .then((data) => {
          if (isMounted && Array.isArray(data)) {
            setCourseList(data);
          }
        })
        .catch((err) => {
          console.warn('[CourseCatalog] Lỗi nạp khóa học:', err);
          if (isMounted) setCourseList([]);
        });
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Danh sách ID các khóa học đã được cấp quyền cho người dùng hiện tại
  const entitledIds = useMemo(() => {
    return getEntitledCourseIds(user, courseList);
  }, [user, courseList]);

  // Lọc mềm theo từ khóa tìm kiếm và trạng thái quyền
  const filteredCourses = courseList.filter((course) => {
    const term = searchTerm.toLowerCase();
    const courseId = course.ID || course.id;
    const title = (course.Title || course.title || '').toLowerCase();
    const desc = (course.Description || course.description || '').toLowerCase();
    const matchesSearch = title.includes(term) || desc.includes(term);

    if (!matchesSearch) return false;

    const hasAccess = entitledIds.includes(courseId);
    if (filterType === 'ENTITLED') return hasAccess;
    if (filterType === 'UNENTITLED') return !hasAccess;
    return true;
  });

  // Xử lý khi nhấn vào khóa học
  const handleCourseAction = (course) => {
    const courseId = course.ID || course.id;
    const access = checkCourseAccess(user, courseId);

    if (access.hasAccess) {
      if (user?.role === 'Instructor') {
        navigate(`/${lang}/instructor/preview/${courseId}`);
      } else {
        navigate(`/${lang}/student/player/${courseId}`);
      }
    } else {
      setBlockedModalCourse({
        ...course,
        ID: courseId,
        reasonMessage: access.message,
      });
    }
  };

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* 1. HEADER BANNER */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          {t('catalog.title')}{' '}
          <span className="text-blue-600 dark:text-blue-400">
            {t('catalog.title_highlight')}
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {t('catalog.subtitle')}
        </p>
      </div>

      {/* 2. BỘ TÌM KIẾM ĐỘNG & BỘ LỌC QUYỀN TRUY CẬP */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 mb-8">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder={t('catalog.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Bộ nút lọc & Thêm khóa học */}
          <div className="flex flex-wrap items-center gap-2">
            {isAuthenticated && (user?.role === 'Instructor' || user?.role === 'Administrator') && (
              <button
                type="button"
                onClick={() => setShowCreateCourseModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>{t('catalog.add_course')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                filterType === 'ALL'
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t('catalog.filter_all')} ({courseList.length})
            </button>

            {isAuthenticated && user?.role === 'Student' && (
              <>
                <button
                  type="button"
                  onClick={() => setFilterType('ENTITLED')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    filterType === 'ENTITLED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  {t('catalog.filter_entitled')} ({entitledIds.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('UNENTITLED')}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    filterType === 'UNENTITLED'
                      ? 'bg-slate-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {t('catalog.filter_unentitled')} ({Math.max(0, courseList.length - entitledIds.length)})
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. LƯỚI KHÓA HỌC */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <BookOpen className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {t('catalog.no_results')}
          </h5>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            {t('catalog.no_results_desc')}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterType('ALL');
            }}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs"
          >
            {t('catalog.clear_filter')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredCourses.map((course) => {
            const cId = course.ID || course.id;
            const title = course.Title || course.title || 'Khóa học';
            const desc = course.Description || course.description || '';
            const instructorName = course.Instructor || course.instructor || course.Owner || course.owner;
            const isEntitled = entitledIds.includes(cId);

            return (
              <div
                key={cId}
                onClick={() => handleCourseAction(course)}
                className="group flex flex-col rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer"
              >
                {/* Header Thẻ Khóa học */}
                <div
                  className={`p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col justify-between ${
                    isEntitled
                      ? 'bg-blue-50/70 dark:bg-blue-950/30'
                      : 'bg-slate-50/70 dark:bg-slate-850'
                  }`}
                  style={{ minHeight: '120px' }}
                >
                  <div className="flex items-center justify-between">
                    {isEntitled ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 rounded-full shadow-xs">
                        {t('catalog.entitled')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 rounded-full">
                        {t('catalog.not_entitled')}
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      {cId}
                    </span>
                  </div>

                  {(course["Creation Time"] || course.createdAt || course.creation_time) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-3">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {t('catalog.created_at')}{' '}
                        {(course["Creation Time"] || course.createdAt || course.creation_time).split('T')[0]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Nội dung Thẻ */}
                <div className="p-5 flex flex-col flex-1">
                  <h3
                    className="font-bold text-base text-slate-900 dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                    title={title}
                  >
                    {title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 flex-1 leading-relaxed">
                    {desc}
                  </p>

                  {/* Giảng viên */}
                  {instructorName && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <User className="h-3.5 w-3.5 text-blue-500" />
                      <span>{instructorName}</span>
                    </div>
                  )}

                  {/* Học phí & Nút hành động */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        {t('catalog.tuition')}
                      </span>
                      <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                        {course.Price === 0
                          ? t('catalog.free')
                          : `${course.Price?.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US')} ${lang === 'vi' ? 'đ' : 'VND'}`}
                      </span>
                    </div>

                    {isEntitled ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCourseAction(course);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all"
                      >
                        <Play className="h-3.5 w-3.5 fill-white" />
                        <span>{t('catalog.start_learning')}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCourseAction(course);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span>{t('catalog.not_entitled')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. MODAL THÔNG BÁO CHƯA ĐƯỢC CẤP QUYỀN XEM KHÓA HỌC */}
      {Boolean(blockedModalCourse) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-amber-500">
                <Lock className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('catalog.modal_denied_title')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBlockedModalCourse(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs">
              <div className="font-bold text-amber-800 dark:text-amber-200">{blockedModalCourse?.Title}</div>
              <small className="text-amber-700/70 font-mono">ID: {blockedModalCourse?.ID}</small>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('catalog.modal_denied_desc')}
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <span>{t('catalog.modal_denied_policy')}</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBlockedModalCourse(null)}
                className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {t('common.close')}
              </button>
              {isAuthenticated && user?.role === 'Student' ? (
                <button
                  type="button"
                  onClick={() => {
                    setBlockedModalCourse(null);
                    navigate(`/${lang}/student/courses`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-1.5 text-xs font-semibold text-white shadow-xs"
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>{t('common.my_courses')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBlockedModalCourse(null);
                    navigate(`/${lang}/login`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-1.5 text-xs font-semibold text-white shadow-xs"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{t('common.login')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẠO KHÓA HỌC MỚI */}
      <CreateCourseModal
        show={showCreateCourseModal}
        onHide={() => setShowCreateCourseModal(false)}
        onCourseCreated={(newCourse) => {
          setCourseList((prev) => [newCourse, ...prev]);
        }}
      />
    </div>
  );
}
