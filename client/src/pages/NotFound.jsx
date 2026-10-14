import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';

/**
 * Component: NotFound (Trang lỗi 404)
 * Pure Tailwind CSS & Lucide Icons
 */
export default function NotFound() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md text-center bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200/80 dark:border-slate-800 transition-all">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-6 shadow-sm">
          <Compass className="h-10 w-10 stroke-[1.75] animate-spin-slow" />
        </div>

        <span className="inline-block px-3 py-1 text-xs font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40 rounded-full mb-3">
          Error 404
        </span>

        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
          Page Not Found
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Trang bạn đang tìm kiếm không tồn tại, đã bị đổi tên hoặc bạn chưa được phân quyền truy cập.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay Lại</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-xs transition-all"
          >
            <Home className="h-4 w-4 text-slate-400" />
            <span>Về Trang Chủ</span>
          </button>
        </div>
      </div>
    </div>
  );
}
