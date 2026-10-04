import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

/**
 * =============================================================================
 * TOAST PROVIDER & CONTEXT - HỆ THỐNG THÔNG BÁO TOÀN CỤC CHO SECURELEARN
 * =============================================================================
 * 
 * - Cung cấp hàm `showToast(message, variant, title)` cho toàn bộ component con
 * - Tự động ẩn (autohide) sau 3000ms
 * - Render ngăn nắp tại vị trí `bottom-end` (hoặc `top-end`) với `ToastContainer`
 * - Hỗ trợ các variant chuẩn: 'success', 'danger', 'warning', 'info'
 */

export const ToastContext = createContext(null);

export function ToastProvider({ children, position = 'bottom-end' }) {
  const [toasts, setToasts] = useState([]);

  /**
   * Kích hoạt hiển thị Toast mới
   * @param {string} message Nội dung thông báo
   * @param {'success'|'danger'|'warning'|'info'} variant Loại thông báo (mặc định: 'info')
   * @param {string} [title] Tiêu đề tùy chọn
   */
  const showToast = useCallback((message, variant = 'info', title = '') => {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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

  /**
   * Đóng Toast thủ công
   * @param {string} id ID của Toast cần xóa
   */
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Helper xác định tiêu đề mặc định theo variant
   */
  function getDefaultTitle(variant) {
    switch (variant) {
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

  /**
   * Helper render Icon theo variant
   */
  function renderToastIcon(variant) {
    switch (variant) {
      case 'success':
        return <i className="bi bi-check-circle-fill text-success fs-6 me-2"></i>;
      case 'danger':
        return <i className="bi bi-x-circle-fill text-danger fs-6 me-2"></i>;
      case 'warning':
        return <i className="bi bi-exclamation-triangle-fill text-warning fs-6 me-2"></i>;
      case 'info':
      default:
        return <i className="bi bi-info-circle-fill text-info fs-6 me-2"></i>;
    }
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Container hiển thị danh sách Toast nổi trên màn hình */}
      <ToastContainer
        position={position}
        className="p-3"
        style={{ zIndex: 9999, position: 'fixed' }}
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            onClose={() => removeToast(toast.id)}
            show={true}
            delay={3000}
            autohide
            className={`shadow-lg border-0 mb-2 text-white overflow-hidden rounded-3 ${
              toast.variant === 'danger'
                ? 'bg-danger'
                : toast.variant === 'warning'
                ? 'bg-warning text-dark'
                : toast.variant === 'success'
                ? 'bg-success'
                : 'bg-dark border border-secondary'
            }`}
          >
            {/* Header Toast */}
            <Toast.Header
              closeButton
              className={`border-0 py-2 ${
                toast.variant === 'warning'
                  ? 'bg-warning text-dark'
                  : toast.variant === 'danger'
                  ? 'bg-danger text-white'
                  : toast.variant === 'success'
                  ? 'bg-success text-white'
                  : 'bg-secondary bg-opacity-25 text-white'
              }`}
            >
              <div className="d-flex align-items-center me-auto fw-bold">
                {renderToastIcon(toast.variant)}
                <span>{toast.title}</span>
              </div>
              <small className={toast.variant === 'warning' ? 'text-dark opacity-75' : 'text-white opacity-75'}>
                {toast.timestamp}
              </small>
            </Toast.Header>

            {/* Body Toast */}
            <Toast.Body className={`fw-medium py-2 px-3 small ${toast.variant === 'warning' ? 'text-dark' : 'text-white'}`}>
              {toast.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

/**
 * Custom Hook: useToast
 * Cho phép bất kỳ component nào trong ứng dụng gọi showToast(message, variant)
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast phải được sử dụng bên trong ToastProvider');
  }
  return context;
}

export default ToastProvider;
