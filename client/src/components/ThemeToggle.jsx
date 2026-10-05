import React from 'react';
import { Button } from 'react-bootstrap';
import { useTheme } from '../context/ThemeContext';

/**
 * =============================================================================
 * COMPONENT: ThemeToggle (Nút chuyển đổi chế độ Sáng / Tối)
 * =============================================================================
 * Tương thích giao diện Navbar với LanguageSwitcher.
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="light"
      onClick={toggleTheme}
      className="d-flex align-items-center justify-content-center rounded-circle border-0 bg-light bg-opacity-75"
      style={{ width: '40px', height: '40px' }}
      title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? (
        <i className="bi bi-sun-fill fs-5 text-warning"></i>
      ) : (
        <i className="bi bi-moon-stars-fill fs-5 text-secondary"></i>
      )}
    </Button>
  );
}
