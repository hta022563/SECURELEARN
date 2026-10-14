import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  Settings,
  Shield,
  GraduationCap,
  BookOpen,
  PlayCircle,
  Video,
  UploadCloud,
  Eye,
  Users,
  Sparkles,
  Sliders,
  Fingerprint,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastProvider';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import { logoutBackendSession } from '../services/courseService';

/**
 * =============================================================================
 * COMPONENT: MainNavbar (Thanh Điều Hướng Thích Ứng - Pure Tailwind CSS)
 * =============================================================================
 * - Pure Tailwind CSS & Lucide Icons
 * - Dùng chung Trang Chủ & Khóa Học cho TẤT CẢ User
 * - Cổng thông tin (Portal) chuyên biệt theo vai trò User (Student / Instructor / Admin)
 * - Tương thích đa ngôn ngữ và hỗ trợ theme mượt mà
 */
export default function MainNavbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang: urlLang } = useParams();
  const { showToast } = useToast();

  const lang = urlLang || (location.pathname.startsWith('/en') ? 'en' : 'vi');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const userDropdownRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tự động đóng mobile menu & popovers khi chuyển trang
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logoutBackendSession();
    } catch (e) {
      // ignore
    }
    logout();
    showToast(t('navbar.logout_success'), 'info');
    navigate(`/${lang}/login`);
  };

  const isActive = (path) => {
    return location.pathname === `/${lang}${path}` || location.pathname === path;
  };

  const renderRoleBadge = (role) => {
    switch (role) {
      case 'Administrator':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 whitespace-nowrap">
            Admin
          </span>
        );
      case 'Instructor':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 whitespace-nowrap">
            Instructor
          </span>
        );
      case 'Student':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 whitespace-nowrap">
            Student
          </span>
        );
    }
  };

  const getNavLinkClass = (path) => {
    const active = isActive(path);
    return active
      ? 'px-3 xl:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 transition-all duration-200 no-underline whitespace-nowrap shrink-0'
      : 'px-3 xl:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60 transition-all duration-200 no-underline whitespace-nowrap shrink-0';
  };

  const getProfilePath = () => {
    if (user?.role === 'Administrator') return `/${lang}/admin/profile`;
    if (user?.role === 'Instructor') return `/${lang}/instructor/profile`;
    return `/${lang}/student/profile`;
  };

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
        {/* =====================================================================
         * 1. CỤM TRÁI: LOGO THƯƠNG HIỆU SECURELEARN + MENU CHUNG (TRANG CHỦ & KHÓA HỌC)
         * ===================================================================== */}
        <div className="flex items-center gap-5 xl:gap-6 min-w-0">
          <Link to={`/${lang}/home`} className="flex items-center gap-2 no-underline shrink-0">
            <Logo size="sm" showBadge={true} badgeText="E-LEARNING" />
          </Link>

          {/* Desktop Navigation: Nằm ngay sát cạnh Logo bên trái */}
          <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 shrink-0">
            <Link to={`/${lang}/home`} className={getNavLinkClass('/home')}>
              {t('navbar.home', 'Trang Chủ')}
            </Link>
            <Link to={`/${lang}/catalog`} className={getNavLinkClass('/catalog')}>
              {t('navbar.courses', 'Khóa Học')}
            </Link>
          </div>
        </div>

        {/* Mobile Action Controls: Theme + Lang + Hamburger Button */}
        <div className="flex items-center gap-1.5 lg:hidden">
          <ThemeToggle />
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/80 text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* =====================================================================
         * 3. KHU VỰC PHẢI: USER PROFILE HOẶC ĐĂNG NHẬP / ĐĂNG KÝ (DESKTOP)
         * ===================================================================== */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          <ThemeToggle />
          <LanguageSwitcher />

          {isAuthenticated && user ? (
            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 p-1.5 pr-3 text-slate-800 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                aria-expanded={userDropdownOpen}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </span>
                <span className="max-w-[130px] truncate text-xs font-semibold">
                  {user.name || t('navbar.user_default')}
                </span>
                {renderRoleBadge(user.role)}
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 mb-1">
                    <span className="block text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {t('navbar.auth_account')}
                    </span>
                    <strong className="block text-sm font-bold text-slate-900 dark:text-white truncate">
                      {user.name}
                    </strong>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </div>
                  </div>

                  {/* Phím tắt đến Trang vai trò của User */}
                  {user.role === 'Administrator' && (
                    <Link
                      to={`/${lang}/admin/portal`}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:text-rose-300 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 transition-colors no-underline mb-1"
                    >
                      <Shield className="h-4 w-4" />
                      <span>{t('navbar.admin_portal', 'Trang Quản Trị')}</span>
                    </Link>
                  )}
                  {user.role === 'Instructor' && (
                    <Link
                      to={`/${lang}/instructor/portal`}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:text-amber-300 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 transition-colors no-underline mb-1"
                    >
                      <Video className="h-4 w-4" />
                      <span>{t('navbar.instructor_portal', 'Trang Giảng Viên')}</span>
                    </Link>
                  )}
                  {user.role === 'Student' && (
                    <Link
                      to={`/${lang}/student/portal`}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-300 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 transition-colors no-underline mb-1"
                    >
                      <GraduationCap className="h-4 w-4" />
                      <span>{t('navbar.student_portal', 'Trang Học Viên')}</span>
                    </Link>
                  )}

                  <Link
                    to={getProfilePath()}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors no-underline"
                  >
                    <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>{t('navbar.profile_password')}</span>
                  </Link>

                  <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t('navbar.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to={`/${lang}/login`}
                className="inline-flex items-center justify-center rounded-full border border-slate-200/80 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-all duration-200 no-underline"
              >
                {t('common.login', 'Login')}
              </Link>
              <Link
                to={`/${lang}/register`}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-all duration-200 no-underline"
              >
                {t('common.register', 'Register')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
       * 4. MOBILE DRAWER MENU: CHỈ COMMON LINKS (TRANG CHỦ & KHÓA HỌC)
       * ===================================================================== */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200/80 bg-white/95 px-4 pt-3 pb-5 dark:border-slate-800 dark:bg-slate-900/95 lg:hidden animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1.5">
            {/* Common Links: Trang Chủ & Khóa Học */}
            <Link to={`/${lang}/home`} className={getNavLinkClass('/home')}>
              {t('navbar.home', 'Trang Chủ')}
            </Link>
            <Link to={`/${lang}/catalog`} className={getNavLinkClass('/catalog')}>
              {t('navbar.courses', 'Khóa Học')}
            </Link>

            {/* Guest Login/Register for Mobile */}
            {!isAuthenticated && (
              <div className="mt-3 flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Link
                  to={`/${lang}/login`}
                  className="flex-1 text-center py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 no-underline"
                >
                  {t('common.login', 'Login')}
                </Link>
                <Link
                  to={`/${lang}/register`}
                  className="flex-1 text-center py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white no-underline"
                >
                  {t('common.register', 'Register')}
                </Link>
              </div>
            )}

            {/* Logged in User Profile in Mobile */}
            {isAuthenticated && user && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                  </div>
                  {renderRoleBadge(user.role)}
                </div>

                {/* Nút bấm vào Portal riêng biệt trong Mobile */}
                {user.role === 'Administrator' && (
                  <Link
                    to={`/${lang}/admin/portal`}
                    className="w-full text-center py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-xs font-bold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center justify-center gap-2 no-underline"
                  >
                    <Shield className="h-4 w-4" />
                    <span>{t('navbar.admin_portal', 'Trang Quản Trị')}</span>
                  </Link>
                )}
                {user.role === 'Instructor' && (
                  <Link
                    to={`/${lang}/instructor/portal`}
                    className="w-full text-center py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 flex items-center justify-center gap-2 no-underline"
                  >
                    <Video className="h-4 w-4" />
                    <span>{t('navbar.instructor_portal', 'Trang Giảng Viên')}</span>
                  </Link>
                )}
                {user.role === 'Student' && (
                  <Link
                    to={`/${lang}/student/portal`}
                    className="w-full text-center py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-xs font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center justify-center gap-2 no-underline"
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span>{t('navbar.student_portal', 'Trang Học Viên')}</span>
                  </Link>
                )}

                <div className="flex gap-2">
                  <Link
                    to={getProfilePath()}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 no-underline"
                  >
                    {t('navbar.profile_password')}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex-1 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-xs font-semibold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                  >
                    {t('navbar.logout')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

MainNavbar.propTypes = {};

