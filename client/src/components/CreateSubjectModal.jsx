import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { BookOpen, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { createSubject } from '../services/subjectService';

export default function CreateSubjectModal({ show, onHide, onSubjectCreated }) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(
        t('subject_modal.name_required', 'Vui lòng nhập tên môn học.'),
        'warning',
        t('course_modal.missing_data', 'Thiếu Dữ Liệu')
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createSubject({ name: name.trim() });

      showToast(
        `${t('subject_modal.create_success', 'Đã tạo môn học')}: "${created.name}"`,
        'success',
        t('subject_modal.create_success_title', 'Tạo Môn Học Thành Công')
      );

      setName('');
      onHide();

      if (typeof onSubjectCreated === 'function') {
        onSubjectCreated(created);
      }
    } catch (err) {
      showToast(
        `${t('subject_modal.create_failed', 'Không thể tạo môn học')}: ${err.message}`,
        'danger',
        t('course_modal.error', 'Lỗi')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('subject_modal.title', 'Thêm Môn Học Mới')}
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t(
              'subject_modal.desc',
              'Tạo môn học để phân nhóm các khóa học. Học viên sẽ vào môn học để xem và lọc bài giảng theo từng khóa học.'
            )}
          </p>

          <div>
            <label htmlFor="subjectName" className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              {t('subject_modal.name_label', 'Tên môn học')} <span className="text-rose-500">*</span>
            </label>
            <input
              id="subjectName"
              type="text"
              placeholder={t('subject_modal.name_placeholder', 'Ví dụ: An toàn thông tin, Mạng máy tính...')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
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
              disabled={isSubmitting || !name.trim()}
              className="rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
            >
              {isSubmitting
                ? t('subject_modal.creating', 'Đang tạo...')
                : t('subject_modal.create_button', 'Tạo Môn Học')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

CreateSubjectModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onSubjectCreated: PropTypes.func,
};
