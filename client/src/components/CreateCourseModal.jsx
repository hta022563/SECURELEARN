import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { GraduationCap, X, ShieldCheck, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createCourse, getCourses } from '../services/courseService';
import {
  getSubjects,
  createSubject,
  assignCourseToSubject,
} from '../services/subjectService';

/**
 * =============================================================================
 * COMPONENT: CreateCourseModal (Pure Tailwind CSS Modal with 100% i18n)
 * =============================================================================
 */
export default function CreateCourseModal({ show, onHide, onCourseCreated, defaultSubjectId = '' }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('499000');
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [showNewSubjectForm, setShowNewSubjectForm] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!show) return;
    const list = getSubjects();
    setSubjects(list);
    if (defaultSubjectId && defaultSubjectId !== 'unassigned') {
      setSubjectId(defaultSubjectId);
    } else if (list.length > 0) {
      setSubjectId((prev) => prev || list[0].id);
    } else {
      setSubjectId('');
    }
  }, [show, defaultSubjectId]);

  if (!show) return null;

  const handleCreateInlineSubject = () => {
    if (!newSubjectName.trim()) return;
    try {
      const created = createSubject({ name: newSubjectName.trim(), description: '' });
      setSubjects((prev) => [created, ...prev]);
      setSubjectId(created.id);
      setNewSubjectName('');
      setShowNewSubjectForm(false);
      showToast(
        `${t('subject_modal.create_success', 'Đã tạo môn học')}: "${created.name}"`,
        'success',
        t('subject_modal.create_success_title', 'Tạo Môn Học Thành Công')
      );
    } catch (err) {
      showToast(err.message, 'warning', t('course_modal.error', 'Lỗi'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast(
        t('course_modal.fill_required', 'Vui lòng điền đầy đủ Tiêu đề và Mô tả khóa học.'),
        'warning',
        t('course_modal.missing_data', 'Thiếu Dữ Liệu')
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const instructorVal = user?.name || user?.email || user?.userId || 'Instructor';
      const newCourse = await createCourse({
        title: title.trim(),
        description: description.trim(),
        prices: Number(price) || 0,
        price: Number(price) || 0,
        instructor: instructorVal,
      });

      let resolvedCourse = newCourse;
      if (subjectId) {
        // BE POST /course không trả về course.id, nên fetch lại danh sách để lấy ID thực từ DB và gán vào Môn học ở FE
        const allCourses = await getCourses();
        const matched = allCourses
          .filter(
            (c) =>
              (c.title || '').trim().toLowerCase() === title.trim().toLowerCase() &&
              (c.instructor || '').trim().toLowerCase() === instructorVal.trim().toLowerCase()
          )
          .sort((a, b) => new Date(b.creationTime || 0) - new Date(a.creationTime || 0))[0];

        if (matched?.id) {
          assignCourseToSubject(matched.id, subjectId);
          resolvedCourse = matched;
        }
      }

      showToast(
        `${t('course_modal.create_success', 'Đã tạo thành công khóa học')}: "${newCourse.Title}"!`,
        'success',
        t('course_modal.create_success_title', 'Tạo Khóa Học Thành Công')
      );

      // Reset form
      setTitle('');
      setDescription('');
      setPrice('499000');
      setShowNewSubjectForm(false);
      setNewSubjectName('');
      onHide();

      if (typeof onCourseCreated === 'function') {
        onCourseCreated(resolvedCourse);
      }
    } catch (err) {
      showToast(
        `${t('course_modal.create_failed', 'Không thể tạo khóa học')}: ${err.message}`,
        'danger',
        t('course_modal.error', 'Lỗi')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('course_modal.title', 'Thêm Khóa Học Mới')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onHide}
            disabled={isSubmitting}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t(
              'course_modal.desc',
              'Khởi tạo khóa học mới theo chuẩn bản quyền số DRM của SecureLearn. Sau khi tạo, bạn có thể thêm các Chương và tải lên video bài giảng.'
            )}
          </p>

          {/* Môn học */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="courseSubject" className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                {t('course_modal.subject_label', 'Thuộc Môn học')}
              </label>
              <button
                type="button"
                onClick={() => setShowNewSubjectForm((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Plus className="h-3 w-3" />
                <span>{showNewSubjectForm ? t('course_modal.cancel', 'Hủy') : t('course_modal.add_subject_inline', 'Tạo môn học mới')}</span>
              </button>
            </div>

            {showNewSubjectForm ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder={t('subject_modal.name_placeholder', 'Nhập tên môn học mới...')}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
                <button
                  type="button"
                  disabled={!newSubjectName.trim()}
                  onClick={handleCreateInlineSubject}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3.5 py-2 text-xs font-semibold text-white"
                >
                  {t('common.save', 'Lưu')}
                </button>
              </div>
            ) : (
              <select
                id="courseSubject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              >
                <option value="">
                  {t('course_modal.select_subject_optional', '-- Chưa phân môn học --')}
                </option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tiêu đề */}
          <div>
            <label htmlFor="courseTitle" className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              {t('course_modal.course_title', 'Tiêu đề khóa học')} <span className="text-rose-500">*</span>
            </label>
            <input
              id="courseTitle"
              type="text"
              placeholder={t('course_modal.course_title_placeholder', 'Ví dụ: Lập trình Web Frontend với ReactJS & Tailwind')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Mô tả */}
          <div>
            <label htmlFor="courseDesc" className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              {t('course_modal.course_desc', 'Mô tả tóm tắt nội dung')} <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="courseDesc"
              rows={3}
              placeholder={t('course_modal.course_desc_placeholder', 'Mô tả nội dung bài giảng, kỹ năng học viên sẽ đạt được...')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {/* Học phí */}
          <div>
            <label htmlFor="coursePrice" className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              {t('course_modal.tuition', 'Học phí (VNĐ)')}{' '}
              <span className="text-xs font-normal text-slate-400">
                {t('course_modal.tuition_free_hint', '(Nhập 0 nếu miễn phí)')}
              </span>
            </label>
            <div className="relative rounded-xl shadow-xs">
              <input
                id="coursePrice"
                type="number"
                min="0"
                step="1000"
                placeholder="499000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3.5 pr-10 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs font-semibold text-slate-400">
                đ
              </div>
            </div>
          </div>

          {/* Security info box */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                {t('course_modal.owner', 'Giảng viên sở hữu (Owner):')}
              </span>
              <strong className="font-mono text-slate-800 dark:text-slate-200">{user?.email || user?.userId || 'u-002'}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                {t('course_modal.protection_standard', 'Chuẩn bảo vệ:')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="h-3 w-3" />
                {t('course_modal.protection_value', 'HLS AES-128 & Watermark')}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={onHide}
              disabled={isSubmitting}
              className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              {t('course_modal.cancel', 'Hủy')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:shadow-lg disabled:opacity-50 transition-all"
            >
              {isSubmitting
                ? t('course_modal.creating', 'Đang tạo...')
                : t('course_modal.create_button', 'Tạo Khóa Học')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

CreateCourseModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onCourseCreated: PropTypes.func,
  defaultSubjectId: PropTypes.string,
};
