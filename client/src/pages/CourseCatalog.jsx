import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  X,
  PlusCircle,
  BookOpen,
  Layers,
  ArrowRight,
  Play,
  Filter,
  FolderPlus,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getCourses } from '../services/courseService';
import {
  loadSubjects,
  groupCoursesBySubjects,
  deleteSubject,
} from '../services/subjectService';
import CreateCourseModal from '../components/CreateCourseModal';
import CreateSubjectModal from '../components/CreateSubjectModal';

/**
 * =============================================================================
 * PAGE: CourseCatalog (Danh Mục Môn Học & Lọc Theo Môn Học - FE Only)
 * =============================================================================
 * Mỗi khóa học thuộc về một môn học cụ thể. Người dùng vào môn học sẽ xem được
 * danh sách toàn bộ bài giảng và có thể lọc danh mục theo Môn Học.
 */
export default function CourseCatalog() {
  const { lang } = useParams();
  const currentLang = lang || 'vi';
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [allCourses, setAllCourses] = useState([]);
  const [subjectVersion, setSubjectVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');

  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [showCreateSubjectModal, setShowCreateSubjectModal] = useState(false);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const [coursesData] = await Promise.all([getCourses(), loadSubjects()]);
      setSubjectVersion((v) => v + 1);
      setAllCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (err) {
      console.warn('[CourseCatalog] Lỗi nạp khóa học:', err);
      setAllCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const displaySubjects = useMemo(() => {
    return groupCoursesBySubjects(allCourses);
  }, [allCourses, subjectVersion]);

  // Bộ lọc danh mục theo Môn Học & Tìm kiếm từ khóa
  const filteredSubjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return displaySubjects.filter((subject) => {
      // 1. Lọc theo Môn Học đã chọn
      if (selectedSubjectFilter) {
        if (String(subject.id) !== String(selectedSubjectFilter)) {
          return false;
        }
      }

      // 2. Tìm kiếm theo từ khóa
      if (!term) return true;

      const matchSubject =
        (subject.name || '').toLowerCase().includes(term) ||
        (subject.description || '').toLowerCase().includes(term);

      const subjectCourses = subject.courses || [];
      const matchCourse = subjectCourses.some(
        (c) =>
          (c.title || c.Title || '').toLowerCase().includes(term) ||
          (c.description || c.Description || '').toLowerCase().includes(term) ||
          (c.instructor || c.Instructor || '').toLowerCase().includes(term)
      );

      return matchSubject || matchCourse;
    });
  }, [displaySubjects, searchTerm, selectedSubjectFilter]);

  const handleOpenSubject = (subjectId, courseId = '') => {
    const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
    navigate(`/${currentLang}/catalog/subject/${subjectId}${query}`);
  };

  const handleDeleteSubject = async (e, subject) => {
    e.stopPropagation();
    const courseCount = subject.courseCount || 0;
    if (
      !window.confirm(
        `${t('catalog.delete_subject_confirm', 'Bạn có chắc muốn xóa môn học')} "${subject.name}"?` +
          (courseCount > 0
            ? `
${t('catalog.delete_subject_cascade_warning', 'Thao tác này sẽ XÓA VĨNH VIỄN cả khóa học thuộc môn này:')} ${courseCount}`
            : '')
      )
    ) {
      return;
    }
    try {
      await deleteSubject(subject.id);
      await loadCourses();
      showToast(
        `${t('catalog.deleted_subject', 'Đã xóa môn học')}: "${subject.name}"`,
        'info',
        t('instructor.deleted', 'Đã Xóa')
      );
    } catch (err) {
      showToast(err.message, 'danger', t('course_modal.error', 'Lỗi'));
    }
  };

  const selectedSubjectObj = useMemo(() => {
    if (!selectedSubjectFilter) return null;
    return displaySubjects.find((s) => String(s.id) === String(selectedSubjectFilter)) || null;
  }, [displaySubjects, selectedSubjectFilter]);

  const canManage =
    isAuthenticated && (user?.role === 'Instructor' || user?.role === 'Administrator');

  return (
    <div className="pb-12">
      {/* 1. FULL-WIDTH DEEP-BLUE HERO BANNER (UNIFIED EDITORIAL FORMAT) */}
      <section className="relative bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white overflow-hidden">
        <div className="pointer-events-none absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #93c5fd 1px, transparent 0)',
            backgroundSize: '26px 26px',
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-14 sm:pb-20 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-3">
            {t('catalog.title')}{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              {t('catalog.title_highlight')}
            </span>
          </h1>
          <p className="text-sm sm:text-base text-blue-100/80 max-w-2xl mx-auto leading-relaxed">
            {t(
              'catalog.subjects_subtitle',
              'Chọn môn học để khám phá toàn bộ bài giảng và học tập theo lộ trình rõ ràng.'
            )}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
      {/* 2. BỘ TÌM KIẾM & LỌC THEO MÔN HỌC */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 shadow-lg border border-blue-100/90 dark:border-slate-800 mb-8 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="search"
              aria-label={t('catalog.search_subject_or_course_placeholder', 'Tìm kiếm theo tên môn học hoặc tên khóa học...')}
              placeholder={t(
                'catalog.search_subject_or_course_placeholder',
                'Tìm kiếm theo tên môn học hoặc tên khóa học...'
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
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

          {/* Dropdown Lọc Theo Môn Học */}
          <div className="flex items-center gap-2 min-w-[240px]">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              aria-label={t('catalog.filter_by_subject', 'Lọc theo môn học')}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-3.5 py-2.5 text-base sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
              <option value="">
                {t('catalog.all_subjects_filter', 'Lọc theo môn học: Tất cả')} ({displaySubjects.length})
              </option>
              {displaySubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name} ({subject.courseCount || subject.courses?.length || 0} {t('subject_lectures.courses_label', 'khóa học')})
                </option>
              ))}
            </select>
          </div>

          {/* Các nút hành động quản lý cho Instructor / Admin */}
          {canManage && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateSubjectModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-600/30 bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100 px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 transition-all cursor-pointer"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span>{t('catalog.add_subject', 'Thêm Môn Học')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCreateCourseModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>{t('catalog.add_course')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Thanh nút lọc nhanh Môn Học (Pills) */}
        {displaySubjects.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              {t('catalog.filter_by_subject', 'Lọc môn học')}:
            </span>
            <button
              type="button"
              onClick={() => setSelectedSubjectFilter('')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                !selectedSubjectFilter
                  ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t('catalog.filter_all', 'Tất cả')} ({displaySubjects.length})
            </button>
            {displaySubjects.map((sub) => {
              const active = String(selectedSubjectFilter) === String(sub.id);
              const count = sub.courseCount || sub.courses?.length || 0;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubjectFilter(active ? '' : sub.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <BookOpen className="h-3 w-3" />
                  <span>{sub.name}</span>
                  <span className="opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Banner thông báo trạng thái lọc theo môn học cụ thể */}
        {selectedSubjectObj && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/70 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                {t('catalog.filtering_subject', 'Đang lọc môn học:')}{' '}
              </span>
              <strong className="text-slate-900 dark:text-white">{selectedSubjectObj.name}</strong>
              <span className="text-blue-600 dark:text-blue-400 ml-1.5">
                ({selectedSubjectObj.courseCount || selectedSubjectObj.courses?.length || 0}{' '}
                {t('subject_lectures.courses_label', 'khóa học')})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenSubject(selectedSubjectObj.id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer"
              >
                <Play className="h-3 w-3 fill-white" />
                <span>{t('catalog.view_subject_lectures', 'Vào xem bài giảng')}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSubjectFilter('')}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t('catalog.clear_filter')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. DANH SÁCH MÔN HỌC */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12" aria-busy="true">
          {[0, 1, 2].map((sk) => (
            <div
              key={sk}
              className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-blue-100/80 dark:border-slate-800 shadow-sm animate-pulse"
            >
              <div className="h-20 bg-slate-200/80 dark:bg-slate-800" />
              <div className="p-5 space-y-3">
                <div className="h-3.5 w-full rounded-lg bg-slate-200 dark:bg-slate-800" />
                <div className="h-3.5 w-2/3 rounded-lg bg-slate-100 dark:bg-slate-800/70" />
                <div className="h-6 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="h-3.5 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
                  <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <BookOpen className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <h5 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {t('catalog.no_subjects', 'Không tìm thấy môn học nào phù hợp')}
          </h5>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            {t('catalog.no_results_desc')}
          </p>
          {(searchTerm || selectedSubjectFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedSubjectFilter('');
              }}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs"
            >
              {t('catalog.clear_filter')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredSubjects.map((subject) => {
            const subjectCourses = subject.courses || [];
            const term = searchTerm.trim().toLowerCase();
            const matchingCourses = term
              ? subjectCourses.filter((c) =>
                  (c.title || c.Title || '').toLowerCase().includes(term) ||
                  (c.description || c.Description || '').toLowerCase().includes(term) ||
                  (c.instructor || c.Instructor || '').toLowerCase().includes(term)
                )
              : subjectCourses;
            const previewCourses = (matchingCourses.length > 0 ? matchingCourses : subjectCourses).slice(
              0,
              4
            );

            return (
              <div
                key={subject.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenSubject(subject.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenSubject(subject.id);
                  }
                }}
                className="group flex flex-col rounded-3xl overflow-hidden bg-blue-50/30 dark:bg-slate-900 border border-blue-100/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer"
              >
                {/* Header thẻ Môn học */}
                <div className="p-5 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 text-white shrink-0">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-200">
                        {t('catalog.subject_badge', 'Môn học')}
                      </span>
                      <h3 className="font-bold text-base text-white truncate">
                        {subject.name}
                      </h3>
                    </div>
                  </div>

                  {canManage && !subject.isVirtual && (
                    <button
                      type="button"
                      title={t('catalog.delete_subject', 'Xóa môn học')}
                      onClick={(e) => handleDeleteSubject(e, subject)}
                      className="p-1.5 rounded-full text-blue-100/80 hover:text-white hover:bg-rose-500/80 transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Nội dung thẻ */}
                <div className="p-5 flex flex-col flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {subject.description ||
                      t(
                        'catalog.default_subject_desc',
                        'Khám phá các khóa học và bài giảng thuộc môn học này.'
                      )}
                  </p>

                  {/* Thống kê khóa học */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                      <Layers className="h-3 w-3 text-blue-500" />
                      <span>
                        {subject.courseCount} {t('subject_lectures.courses_label', 'khóa học')}
                      </span>
                    </span>
                  </div>

                  {/* Danh sách các Khóa học thuộc môn */}
                  {previewCourses.length > 0 && (
                    <div className="mb-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 flex-1">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {t('catalog.courses_in_subject', 'Khóa học thuộc môn:')}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {previewCourses.map((c) => (
                          <button
                            key={c.id || c.ID}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSubject(subject.id, c.id || c.ID);
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          >
                            <span className="truncate max-w-[160px]">{c.title}</span>
                          </button>
                        ))}
                        {subjectCourses.length > previewCourses.length && (
                          <span className="inline-flex items-center px-2 py-1 text-[11px] text-slate-400">
                            +{subjectCourses.length - previewCourses.length}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer CTA */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-auto flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {t('catalog.enter_subject', 'Vào xem bài giảng')}
                    </span>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL TẠO MÔN HỌC MỚI */}
      <CreateSubjectModal
        show={showCreateSubjectModal}
        onHide={() => setShowCreateSubjectModal(false)}
        onSubjectCreated={() => {
          setSubjectVersion((v) => v + 1);
        }}
      />

      {/* MODAL TẠO KHÓA HỌC MỚI */}
      <CreateCourseModal
        show={showCreateCourseModal}
        onHide={() => setShowCreateCourseModal(false)}
        onCourseCreated={() => {
          loadCourses();
          setSubjectVersion((v) => v + 1);
        }}
      />
      </div>
    </div>
  );
}
