import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * =============================================================================
 * THEME CONTEXT & PROVIDER - QUẢN LÝ GIAO DIỆN SÁNG / TỐI (LIGHT / DARK THEME)
 * =============================================================================
 * - Tự động đồng bộ với thuộc tính data-bs-theme của Bootstrap 5.3
 * - Lưu trạng thái theme vào localStorage ('light' | 'dark')
 * - Cung cấp hook `useTheme()` với { theme, toggleTheme, setTheme }
 */

export const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const savedTheme = localStorage.getItem('securelearn_theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    // Mặc định kiểm tra chế độ hệ thống người dùng
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    // Cập nhật thuộc tính của thẻ <html> cho Bootstrap 5.3
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('securelearn_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
