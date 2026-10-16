import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { GraduationCap, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createCourse } from '../services/courseService';

/**
 * =============================================================================
 * COMPONENT: CreateCourseModal (Pure Tailwind CSS Modal with 100% i18n)
 * =============================================================================
 */
export default function CreateCourseModal({ show, onHide, onCourseCreated }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('499000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!show) return null;

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
      const newCourse = await createCourse({
        title: title.trim(),
        description: description.trim(),
        prices: Number(price) || 0,
        price: Number(price) || 0,
        instructor: user?.name || user?.email || user?.userId || 'Instructor',
      });

      showToast(
        `${t('course_modal.create_success', 'Đã tạo thành công khóa học')}: "${newCourse.Title}"!`,
        'success',
        t('course_modal.create_success_title', 'Tạo Khóa Học Thành Công')
      );

      // Reset form
      setTitle('');
      setDescription('');
      setPrice('499000');
      onHide();

      if (typeof onCourseCreated === 'function') {
        onCourseCreated(newCourse);
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
};
