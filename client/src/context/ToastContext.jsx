import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

/**
 * =============================================================================
 * TOAST PROVIDER & CONTEXT - HỆ THỐNG THÔNG BÁO TOÀN CỤC CHO SECURELEARN
 * =============================================================================
 * - Pure Tailwind CSS (Loại bỏ hoàn toàn react-bootstrap)
 * - Tự động ẩn (autohide) sau 3500ms
 * - Render nổi tại góc màn hình với hiệu ứng trượt mượt mà (slide-in)
 * - Hỗ trợ các variant: 'success', 'danger', 'warning', 'info'
 */

export const ToastContext = createContext(null);

function SingleToast({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const variantStyles = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />,
      badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200',
    },
    danger: {
      bg: 'bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100',
      icon: <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />,
      badge: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/90 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100',
      icon: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />,
      badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/90 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
      icon: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />,
      badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200',
    },
  };

  const style = variantStyles[toast.variant] || variantStyles.info;

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex w-full max-w-sm overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-right-5 ${style.bg}`}
    >
      <div className="flex w-full items-start gap-3">
        {style.icon}
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold tracking-tight">{toast.title}</h4>
            <span className="text-[10px] font-medium opacity-60">{toast.timestamp}</span>
          </div>
          <p className="mt-1 text-xs font-normal leading-relaxed opacity-90">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(toast.id)}
          className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          aria-label="Close toast"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

SingleToast.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.string.isRequired,
    variant: PropTypes.string,
    title: PropTypes.string,
    message: PropTypes.string,
    timestamp: PropTypes.string,
  }).isRequired,
  onRemove: PropTypes.func.isRequired,
};

export function ToastProvider({ children, position = 'bottom-end' }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, variant = 'info', title = '') => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    function getDefaultTitle(v) {
      switch (v) {
        case 'success':
          return 'Thành Công';
        case 'danger':
          return 'Lỗi Thao Tác';
        case 'warning':
          return 'Cảnh Báo';
        case 'info':
        default:
          return 'Thông Báo Hệ Thống';
      }
    }

    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        variant,
        title: title || getDefaultTitle(variant),
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Xác định vị trí container
  const positionClasses = {
    'bottom-end': 'bottom-5 right-5',
    'bottom-start': 'bottom-5 left-5',
    'top-end': 'top-5 right-5',
    'top-start': 'top-5 left-5',
  };

  const containerPos = positionClasses[position] || positionClasses['bottom-end'];

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Container hiển thị danh sách Toast nổi trên màn hình */}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed z-50 flex flex-col gap-2.5 max-w-sm w-full p-4 sm:p-0 ${containerPos}`}
      >
        {toasts.map((toast) => (
          <SingleToast key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
  position: PropTypes.string,
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast phải được sử dụng bên trong ToastProvider');
  }
  return context;
}

export default ToastProvider;
