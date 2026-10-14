import React from 'react';
import PropTypes from 'prop-types';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

/**
 * =============================================================================
 * COMPONENT: ProtectedRoute (JWT Role Router - Pure Tailwind CSS)
 * =============================================================================
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Đang kiểm tra token phiên làm việc
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
        <span className="sr-only">Đang xác thực quyền truy cập...</span>
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
