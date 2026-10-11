import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Key định danh lưu thông tin phiên đăng nhập trong SessionStorage
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
  // Keep the login through navigation/reloads in this tab, but not after it closes.
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.error('Lỗi phân tích cú pháp Auth SessionStorage:', err);
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Không thể xóa phiên đăng nhập cũ khỏi LocalStorage:', err);
    }
  }, []);

  /**
   * Hàm Đăng nhập: Lưu state và ghi vào sessionStorage
   * @param {Object} userData Gồm userId, name, email, role, token
   */
  const login = (userData) => {
    try {
      setUser(userData);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    } catch (err) {
      console.error('Không thể lưu phiên đăng nhập vào SessionStorage:', err);
    }
  };

  /**
   * Hàm Đăng xuất: Xóa state và làm sạch sessionStorage
   */
  const logout = () => {
    try {
      setUser(null);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Lỗi khi xóa Auth SessionStorage:', err);
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
