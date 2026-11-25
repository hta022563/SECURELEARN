import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Outlet, Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  Video,
  GraduationCap,
  Users,
  ShieldAlert,
  Fingerprint,
  BookOpen,
  PlayCircle,
  UploadCloud,
  Eye,
  Menu,
  X,
  UserCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * =============================================================================
 * COMPONENT: RolePortalLayout (Bố Cục Sidebar Dài Toàn Bộ Chiều Cao Từ Trên Xuống)
 * =============================================================================
 * - BÊN TRÁI: Thanh Nav kéo dài từ trên xuống (Full Height Left Sidebar), phân tách
 *   với không gian làm việc bằng đường border-r liền mạch.
 * - BÊN PHẢI: Không gian làm việc (Workspace) trực tiếp dùng các chức năng đó.
 *   Bao gồm cả quản lý thông tin Hồ sơ & Mật khẩu của từng vai trò.
 */
export default function RolePortalLayout({ role }) {
  const { user } = useAuth();
  const { lang = 'vi' } = useParams();
  const location = useLocation();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Xác định vai trò từ prop hoặc đường dẫn hiện tại
  let currentRole = role || user?.role || 'Student';
  if (location.pathname.includes('/admin')) {
    currentRole = 'Administrator';
  } else if (location.pathname.includes('/instructor')) {
    currentRole = 'Instructor';
  } else if (location.pathname.includes('/student')) {
    currentRole = 'Student';
  }

  // Cấu hình các chức năng theo từng Role (Tối giản, không rườm rà)
  const getRoleConfig = () => {
    switch (currentRole) {
      case 'Administrator':
        return {
          title: t('navbar.admin_portal', 'Trang Quản Trị'),
          badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80',
          activeItemClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-semibold',
          activeIconClass: 'text-rose-600 dark:text-rose-400',
          roleIcon: Shield,
          pages: [
            {
              id: 'alerts',
              title: t('navbar.ai_alerts', 'Cảnh Báo AI & Rò Rỉ'),
              path: `/${lang}/admin/alerts`,
              icon: ShieldAlert,
            },
            {
              id: 'users',
              title: t('navbar.manage_users', 'Quản lý Người Dùng'),
              path: `/${lang}/admin/users`,
              icon: Users,
            },
            {
              id: 'trace',
              title: t('navbar.watermark_tracing', 'Truy Vết Watermark'),
              path: `/${lang}/admin/trace`,
              icon: Fingerprint,
            },
            {
              id: 'profile',
              title: t('navbar.profile_password', 'Hồ sơ & Mật khẩu'),
              path: `/${lang}/admin/profile`,
              icon: UserCircle,
            },
          ],
        };

      case 'Instructor':
        return {
          title: t('navbar.instructor_portal', 'Trang Giảng Viên'),
          badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80',
          activeItemClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold',
          activeIconClass: 'text-amber-600 dark:text-amber-400',
          roleIcon: Video,
          pages: [
            {
              id: 'videos',
              title: t('navbar.manage_videos', 'Quản lý Bài Giảng'),
              path: `/${lang}/instructor/videos`,
              icon: Video,
            },
            {
              id: 'upload',
              title: t('navbar.upload_drm', 'Đăng Tải Video'),
              path: `/${lang}/instructor/upload`,
              icon: UploadCloud,
            },
            {
              id: 'preview',
              title: t('navbar.preview_video', 'Xem Trước Bài Giảng'),
              path: `/${lang}/instructor/preview`,
              icon: Eye,
            },
            {
              id: 'profile',
              title: t('navbar.profile_password', 'Hồ sơ & Mật khẩu'),
              path: `/${lang}/instructor/profile`,
              icon: UserCircle,
            },
          ],
        };

      case 'Student':
      default:
        return {
          title: t('navbar.student_portal', 'Trang Học Viên'),
          badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/80',
          activeItemClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold',
          activeIconClass: 'text-blue-600 dark:text-blue-400',
          roleIcon: GraduationCap,
          pages: [
            {
              id: 'courses',
              title: t('navbar.my_courses', 'Khóa học của tôi'),
              path: `/${lang}/student/courses`,
              icon: BookOpen,
            },
            {
              id: 'player',
              title: t('navbar.continue_learning', 'Trình phát bài giảng'),
              path: `/${lang}/student/player`,
              icon: PlayCircle,
            },
            {
              id: 'profile',
              title: t('navbar.profile_password', 'Hồ sơ & Mật khẩu'),
              path: `/${lang}/student/profile`,
              icon: UserCircle,
            },
          ],
        };
    }
  };

  const config = getRoleConfig();

  // Tìm trang hiện tại đang hoạt động
  const activePage =
    config.pages.find((p) => {
      if (location.pathname === p.path) return true;
      if (p.id === 'preview' && location.pathname.includes('/preview')) return true;
      if (p.id === 'player' && location.pathname.includes('/player')) return true;
      if (p.id === 'profile' && location.pathname.includes('/profile')) return true;
      if (location.pathname.startsWith(p.path)) return true;
      return false;
    }) || config.pages[0];

  return (
    <div className="min-h-[calc(100vh-3.75rem)] flex flex-col lg:flex-row w-full">
      {/* Mobile Toggle Button */}
      <div className="lg:hidden m-3 flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="min-w-0">
          <span className="block text-[10px] uppercase font-bold text-slate-400">
            {config.title}
          </span>
          <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">
            {activePage?.title}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
        >
          {mobileMenuOpen ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
          <span>{mobileMenuOpen ? t('common.close', 'Đóng') : t('common.menu', 'Menu')}</span>
        </button>
      </div>

      {/* =========================================================================
       * BỐ CỤC 2 PHẦN:
       * - BÊN TRÁI: THANH NAV KÉO DÀI TỪ TRÊN XUỐNG DƯỚI (Full Height Left Sidebar)
       * - BÊN PHẢI: KHÔNG GIAN LÀM VIỆC ĐỂ TRỰC TIẾP DÙNG CHỨC NĂNG
       * ========================================================================= */}
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* 1. THANH NAV CHỨC NĂNG: DRAWER TRÊN MOBILE, FIXED SIDEBAR TRÊN DESKTOP */}
      <aside
        className={`w-72 max-w-[82vw] lg:w-60 xl:w-64 shrink-0 border-r border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md fixed top-[61px] bottom-0 left-0 z-30 flex flex-col p-4 transition-transform duration-200 overflow-y-auto ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Tiêu đề Cổng vai trò (Deep Blue Editorial Header) */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 p-3.5 mb-4 text-white shadow-sm border border-blue-900/50 flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold tracking-tight truncate">
            {config.title}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-blue-200 border border-white/15 shrink-0">
            {currentRole}
          </span>
        </div>

        {/* Danh sách Menu chức năng (gọn gàng, tối giản, thanh lịch) */}
        <nav className="space-y-1 flex-1 overflow-y-auto" aria-label="Portal Navigation">
          {config.pages.map((item) => {
            const ItemIcon = item.icon;
            const isCurrent =
              location.pathname === item.path ||
              (item.id === 'preview' && location.pathname.includes('/preview')) ||
              (item.id === 'player' && location.pathname.includes('/player')) ||
              (item.id === 'profile' && location.pathname.endsWith('/profile')) ||
              location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-colors no-underline ${
                  isCurrent
                    ? config.activeItemClass
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                }`}
              >
                <ItemIcon
                  className={`h-4 w-4 shrink-0 ${
                    isCurrent
                      ? config.activeIconClass
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 2. KHÔNG GIAN LÀM VIỆC (WORKSPACE NẰM BÊN PHẢI) - BÙ ĐỘ RỘNG SIDEBAR FIXED */}
      <div className="flex-1 min-w-0 w-full lg:pl-60 xl:pl-64 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </div>
    </div>
  );
}

RolePortalLayout.propTypes = {
  role: PropTypes.string,
};
