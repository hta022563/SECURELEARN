import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut, ArrowRight } from 'lucide-react';

export default function Unauthorized() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleReturnHome = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    switch (user.role) {
      case 'Administrator':
        navigate('/admin');
        break;
      case 'Instructor':
        navigate('/instructor/upload');
        break;
      case 'Student':
      default:
        navigate('/student/player');
        break;
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md text-center bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200/80 dark:border-slate-800 transition-all">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 mb-6 shadow-sm">
          <ShieldAlert className="h-10 w-10 stroke-[1.75]" />
        </div>

        <span className="inline-block px-3 py-1 text-xs font-bold tracking-wider uppercase text-rose-600 dark:text-rose-400 bg-rose-100/60 dark:bg-rose-900/40 rounded-full mb-3">
          Error 403
        </span>

        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">
          Truy Cập Bị Từ Chối
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Tài khoản của bạn ({user?.email} - Vai trò: <strong className="text-slate-800 dark:text-slate-200">{user?.role}</strong>) không có đủ thẩm quyền để truy cập trang này.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleReturnHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all"
          >
            <span>Về Trang Dành Cho {user?.role || 'Học Viên'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-xs transition-all"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            <span>Đăng Xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
}
