import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Key định danh lưu thông tin phiên đăng nhập trong LocalStorage
 */
const STORAGE_KEY = 'securelearn_auth_user';

/**
 * Khởi tạo AuthContext
 */
export const AuthContext = createContext(null);

/**
 * AuthProvider: Cung cấp State quản lý phiên đăng nhập toàn cục cho ứng dụng
 */
export function AuthProvider({ children }) {
  // Lấy trạng thái khởi tạo từ localStorage (đảm bảo không bị mất đăng nhập khi F5)
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.error('Lỗi phân tích cú pháp Auth LocalStorage:', err);
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  /**
   * Hàm Đăng nhập: Lưu state và ghi vào localStorage
   * @param {Object} userData Gồm userId, name, email, role, token
   */
  const login = (userData) => {
    try {
      setUser(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    } catch (err) {
      console.error('Không thể lưu phiên đăng nhập vào LocalStorage:', err);
    }
  };

  /**
   * Hàm Đăng xuất: Xóa state và làm sạch localStorage
   */
  const logout = () => {
    try {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Lỗi khi xóa Auth LocalStorage:', err);
    }
  };

  const value = {
    user,
    isAuthenticated: Boolean(user && user.token),
    role: user?.role || null,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Custom Hook: useAuth
 * Giúp các component con dễ dàng truy cập user, role, login, logout
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
}
