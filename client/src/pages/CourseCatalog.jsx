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
 * PAGE: CourseCatalog (Danh Mục Môn Học & Lọc Theo Khóa Học - FE Only)
 * =============================================================================
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
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');

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

  const filteredSubjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return displaySubjects.filter((subject) => {
      const subjectCourses = subject.courses || [];

      if (selectedCourseFilter) {
        const hasSelectedCourse = subjectCourses.some(
          (c) => String(c.id || c.ID) === String(selectedCourseFilter)
        );
        if (!hasSelectedCourse) return false;
      }

      if (!term) return true;

      const matchSubject =
        (subject.name || '').toLowerCase().includes(term) ||
        (subject.description || '').toLowerCase().includes(term);

      const matchCourse = subjectCourses.some(
        (c) =>
          (c.title || c.Title || '').toLowerCase().includes(term) ||
          (c.description || c.Description || '').toLowerCase().includes(term) ||
          (c.instructor || c.Instructor || '').toLowerCase().includes(term)
      );

      return matchSubject || matchCourse;
    });
  }, [displaySubjects, searchTerm, selectedCourseFilter]);

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

  const selectedCourseObj = useMemo(() => {
    if (!selectedCourseFilter) return null;
    const found = allCourses.find(
      (c) => String(c.id || c.ID) === String(selectedCourseFilter)
    );
    if (!found) return null;
    const subId = found.subjectId;
    const subObj = displaySubjects.find((s) => String(s.id) === String(subId));
    return {
      ...found,
      subjectId: subId,
      subjectName: subObj?.name || '',
    };
  }, [allCourses, selectedCourseFilter, displaySubjects]);

  const canManage =
    isAuthenticated && (user?.role === 'Instructor' || user?.role === 'Administrator');

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
          {t(
            'catalog.subjects_subtitle',
            'Chọn môn học để khám phá toàn bộ bài giảng và lọc nhanh theo từng khóa học.'
          )}
        </p>
      </div>

      {/* 2. BỘ TÌM KIẾM & LỌC THEO KHÓA HỌC */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 mb-8 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder={t(
                'catalog.search_subject_or_course_placeholder',
                'Tìm kiếm theo tên môn học hoặc tên khóa học...'
              )}
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

          <div className="flex items-center gap-2 min-w-[240px]">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              aria-label={t('catalog.filter_by_course', 'Lọc theo khóa học')}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">
                {t('catalog.all_courses_filter', 'Lọc theo khóa học: Tất cả')} ({allCourses.length})
              </option>
              {allCourses.map((course) => {
                const subId = course.subjectId;
                const subName = subId
                  ? displaySubjects.find((s) => String(s.id) === String(subId))?.name
                  : null;
                return (
                  <option key={course.id || course.ID} value={course.id || course.ID}>
                    {course.title}
                    {subName ? ` — ${subName}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

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

        {selectedCourseObj && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/70 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                {t('catalog.filtering_course', 'Đang lọc khóa học:')}{' '}
              </span>
              <strong className="text-slate-900 dark:text-white">{selectedCourseObj.title}</strong>
              {selectedCourseObj.subjectName && (
                <span className="text-blue-600 dark:text-blue-400 ml-1.5">
                  ({selectedCourseObj.subjectName})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleOpenSubject(
                    selectedCourseObj.subjectId,
                    selectedCourseObj.id || selectedCourseObj.ID
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer"
              >
                <Play className="h-3 w-3 fill-white" />
                <span>{t('catalog.view_course_lectures', 'Xem bài giảng của khóa học này')}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCourseFilter('')}
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
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('common.loading', 'Đang nạp...')}
          </p>
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
          {(searchTerm || selectedCourseFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCourseFilter('');
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
            const matchingCourses = selectedCourseFilter
              ? subjectCourses.filter(
                  (c) => String(c.id || c.ID) === String(selectedCourseFilter)
                )
              : term
              ? subjectCourses.filter((c) =>
                  (c.title || c.Title || '').toLowerCase().includes(term)
                )
              : subjectCourses;
            const previewCourses = (matchingCourses.length > 0 ? matchingCourses : subjectCourses).slice(
              0,
              3
            );

            return (
              <div
                key={subject.id}
                onClick={() => handleOpenSubject(subject.id, selectedCourseFilter || '')}
                className="group flex flex-col rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer"
              >
                {/* Header thẻ Môn học */}
                <div className="p-5 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/40 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shrink-0 shadow-xs">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {t('catalog.subject_badge', 'Môn học')}
                      </span>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {subject.name}
                      </h3>
                    </div>
                  </div>

                  {canManage && !subject.isVirtual && (
                    <button
                      type="button"
                      title={t('catalog.delete_subject', 'Xóa môn học')}
                      onClick={(e) => handleDeleteSubject(e, subject)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
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

                  {/* Thống kê */}
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
                        {subjectCourses.length > previewCourses.length && !selectedCourseFilter && (
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
  );
}
