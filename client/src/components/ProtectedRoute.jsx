import React from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * =============================================================================
 * COMPONENT: ProtectedRoute (JWT Role Router - Gác Cổng Phân Quyền RBAC)
 * =============================================================================
 * 
 * CƠ CHẾ HOẠT ĐỘNG:
 * 1. Đọc trạng thái xác thực (`isAuthenticated`) và vai trò (`user.role`) từ AuthContext (lưu trong JWT / LocalStorage).
 * 2. KIỂM SOÁT XÁC THỰC (Authentication):
 *    - Nếu người dùng CHƯA đăng nhập: Chuyển hướng ngay lập tức về '/login'.
 *    - Lưu lại URL hiện tại qua `state={{ from: location }}` để tự động redirect lại sau khi đăng nhập thành công.
 * 3. KIỂM SOÁT PHÂN QUYỀN (Authorization / Role-Based Access Control):
 *    - Nếu người dùng ĐÃ đăng nhập nhưng role không khớp với `allowedRoles`:
 *      Chuyển hướng về trang '/unauthorized' (403 Forbidden).
 * 4. NẾU HỢP LỆ:
 *    - Cho phép render `children` hoặc `<Outlet />` của React Router v6.
 * 
 * @param {Object} props
 * @param {string[]} props.allowedRoles Danh sách vai trò được cấp quyền (ví dụ: ['Student'], ['Instructor', 'Administrator'])
 * @param {React.ReactNode} [props.children] Component con cần bảo vệ
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Đang kiểm tra token phiên làm việc
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang xác thực quyền truy cập...</span>
        </div>
      </div>
    );
  }

  // 1. Chưa đăng nhập -> Rẽ nhánh về trang /login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Sai vai trò thẩm quyền -> Chặn truy cập và chuyển hướng về /unauthorized
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3. Đầy đủ thẩm quyền -> Render component con hoặc Outlet
  return children ? children : <Outlet />;
}

ProtectedRoute.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  children: PropTypes.node,
};
