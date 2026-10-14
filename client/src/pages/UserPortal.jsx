import React from 'react';
import PropTypes from 'prop-types';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  Video,
  GraduationCap,
  Users,
  Sparkles,
  Sliders,
  Fingerprint,
  BookOpen,
  PlayCircle,
  UploadCloud,
  Eye,
  ArrowRight,
  Lock,
  Server,
  CheckCircle2,
  Activity,
  Flame,
  Zap,
  ExternalLink,
  Layers,
  Compass,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * =============================================================================
 * COMPONENT: UserPortal (Trang Cổng Chức Năng Riêng Biệt Cho Từng Role)
 * =============================================================================
 * - Bấm vào từ avatar dropdown góc phải navbar
 * - Có "THANH BÊN PHẢI" chứa danh sách các trang chức năng thuộc về User đó
 * - Khu vực trung tâm hiển thị Dashboard / Tổng quan toàn diện theo vai trò
 */
export default function UserPortal({ defaultRole }) {
  const { user } = useAuth();
  const { lang = 'vi' } = useParams();
  const location = useLocation();
  const { t } = useTranslation();

  // Xác định vai trò hiển thị (ưu tiên role người dùng đăng nhập hoặc role truyền từ route)
  let activeRole = defaultRole || user?.role || 'Student';
  if (location.pathname.includes('/admin')) {
    activeRole = 'Administrator';
  } else if (location.pathname.includes('/instructor')) {
    activeRole = 'Instructor';
  } else if (location.pathname.includes('/student')) {
    activeRole = 'Student';
  }

  // Định nghĩa các trang chức năng theo từng Role
  const getRoleConfig = () => {
    switch (activeRole) {
      case 'Administrator':
        return {
          title: t('navbar.admin_portal', 'Trang Quản Trị'),
          subtitle: t('navbar.admin_portal_subtitle', 'Trung tâm điều hành bảo mật & kiểm soát rủi ro'),
          heroDesc: t(
            'portal.admin_hero_desc',
            'Bảng điều phối trung tâm quản trị hệ thống, giám sát cảnh báo AI, phân quyền người dùng và kiểm soát dữ liệu rò rỉ.'
          ),
          badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80',
          accentColor: 'rose',
          gradientBg: 'from-rose-500/10 via-rose-500/5 to-transparent',
          icon: Shield,
          stats: [
            { label: t('portal.stat_users', 'Người dùng hệ thống'), value: '12', sub: '3 QTV • 3 GV • 6 HV', icon: Users, color: 'text-blue-600' },
            { label: t('portal.stat_alerts', 'Cảnh báo AI cần xử lý'), value: '4', sub: '2 Rủi ro cao', icon: Sparkles, color: 'text-amber-500' },
            { label: t('portal.stat_budget', 'Chi phí R2 hiện tại'), value: '$42.50', sub: 'Trần: $100.00/tháng', icon: Sliders, color: 'text-emerald-600' },
            { label: t('portal.stat_drm', 'Bản ghi Watermark DRM'), value: '16', sub: '100% Khớp dấu vân tay', icon: Fingerprint, color: 'text-rose-600' },
          ],
          pages: [
            {
              title: t('navbar.manage_users', 'Quản lý Người Dùng'),
              desc: t('navbar.manage_users_desc', 'Quản lý người dùng & phân quyền hệ thống'),
              path: `/${lang}/admin/users`,
              icon: Users,
              iconColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400',
              highlight: 'ERD Database Sync',
            },
            {
              title: t('navbar.ai_alerts', 'Cảnh Báo AI & Rò Rỉ'),
              desc: t('navbar.ai_alerts_desc', 'Phát hiện gian lận & bất thường từ mô hình AI'),
              path: `/${lang}/admin/alerts`,
              icon: Sparkles,
              iconColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400',
              highlight: 'Live Detection',
            },
            {
              title: t('navbar.r2_config', 'Cấu Hình & Ngân Sách R2'),
              desc: t('navbar.r2_config_desc', 'Cấu hình tham số KMS, Cloudflare R2 & ngân sách'),
              path: `/${lang}/admin/config`,
              icon: Sliders,
              iconColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400',
              highlight: 'Cost Optimization',
            },
            {
              title: t('navbar.watermark_tracing', 'Truy Vết Watermark'),
              desc: t('navbar.watermark_tracing_desc', 'Đối soát dấu vân tay số từ video bị rò rỉ'),
              path: `/${lang}/admin/trace`,
              icon: Fingerprint,
              iconColor: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400',
              highlight: 'Forensic Proof',
            },
          ],
        };

      case 'Instructor':
        return {
          title: t('navbar.instructor_portal', 'Trang Giảng Viên'),
          subtitle: t('navbar.instructor_portal_subtitle', 'Quản trị bài giảng & nội dung số'),
          heroDesc: t(
            'portal.instructor_hero_desc',
            'Trung tâm quản lý bài giảng bản quyền, tải lên video mã hóa HLS AES-128 lên Cloudflare R2 và kiểm tra watermark.'
          ),
          badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80',
          accentColor: 'amber',
          gradientBg: 'from-amber-500/10 via-amber-500/5 to-transparent',
          icon: Video,
          stats: [
            { label: t('portal.stat_my_videos', 'Bài giảng của tôi'), value: '8', sub: 'Đã xuất bản', icon: Video, color: 'text-amber-600' },
            { label: t('portal.stat_hls_ready', 'Đóng gói HLS DRM'), value: '100%', sub: 'AES-128 KMS Active', icon: Lock, color: 'text-emerald-600' },
            { label: t('portal.stat_storage', 'Lưu trữ Cloudflare R2'), value: '2.4 GB', sub: 'Phân đoạn .ts', icon: Server, color: 'text-blue-600' },
            { label: t('portal.stat_views', 'Lượt học bảo vệ'), value: '1,420', sub: 'Không có vi phạm', icon: Activity, color: 'text-indigo-600' },
          ],
          pages: [
            {
              title: t('navbar.manage_videos', 'Quản lý Bài Giảng'),
              desc: t('navbar.manage_videos_desc', 'Danh sách video & trạng thái HLS DRM'),
              path: `/${lang}/instructor/videos`,
              icon: Video,
              iconColor: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400',
              highlight: '8 Videos Ready',
            },
            {
              title: t('navbar.upload_drm', 'Đăng Tải Video'),
              desc: t('navbar.upload_drm_desc', 'Đóng gói mã hóa AES-128 lên Cloudflare R2'),
              path: `/${lang}/instructor/upload`,
              icon: UploadCloud,
              iconColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400',
              highlight: 'AES-128 + KMS',
            },
            {
              title: t('navbar.preview_video', 'Xem Trước Bài Giảng'),
              desc: t('navbar.preview_video_desc', 'Xem trước video với Watermark động'),
              path: `/${lang}/instructor/preview/v-001`,
              icon: Eye,
              iconColor: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400',
              highlight: 'Dynamic Overlay',
            },
          ],
        };

      case 'Student':
      default:
        return {
          title: t('navbar.student_portal', 'Trang Học Viên'),
          subtitle: t('navbar.student_portal_subtitle', 'Không gian học tập & bài giảng bản quyền'),
          heroDesc: t(
            'portal.student_hero_desc',
            'Không gian học tập cá nhân, theo dõi tiến độ bài giảng đã đăng ký và trải nghiệm xem video an toàn với Dynamic Watermark.'
          ),
          badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/80',
          accentColor: 'blue',
          gradientBg: 'from-blue-500/10 via-blue-500/5 to-transparent',
          icon: GraduationCap,
          stats: [
            { label: t('portal.stat_enrolled', 'Khóa học đã đăng ký'), value: '3', sub: 'Đang theo học', icon: BookOpen, color: 'text-blue-600' },
            { label: t('portal.stat_hours', 'Thời lượng học tập'), value: '18.5h', sub: 'Tháng này', icon: Zap, color: 'text-amber-500' },
            { label: t('portal.stat_progress', 'Tiến độ hoàn thành'), value: '68%', sub: 'Tăng 12% so với tuần trước', icon: Activity, color: 'text-emerald-600' },
            { label: t('portal.stat_certs', 'Chứng chỉ hoàn tất'), value: '2', sub: 'Đã xác thực chữ ký số', icon: CheckCircle2, color: 'text-indigo-600' },
          ],
          pages: [
            {
              title: t('navbar.my_courses', 'Khóa học của tôi'),
              desc: t('navbar.my_courses_desc', 'Quản lý tiến độ học tập & chứng chỉ'),
              path: `/${lang}/student/courses`,
              icon: BookOpen,
              iconColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400',
              highlight: '3 Khóa Đang Học',
            },
            {
              title: t('navbar.continue_learning', 'Trình phát bài giảng'),
              desc: t('navbar.continue_learning_desc', 'Xem video DRM với Watermark động'),
              path: `/${lang}/student/player/v-001`,
              icon: PlayCircle,
              iconColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400',
              highlight: 'Bảo Vệ Bản Quyền',
            },
          ],
        };
    }
  };

  const config = getRoleConfig();
  const RoleIcon = config.icon;

  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* =====================================================================
         * BỐ CỤC 2 CỘT: CỘT NỘI DUNG CHÍNH (TRÁI) & THANH BÊN PHẢI (RIGHT SIDEBAR)
         * ===================================================================== */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ===================================================================
           * CỘT NỘI DUNG CHÍNH (BÊN TRÁI): TỔNG QUAN, KPIS & FEATURE CARDS
           * =================================================================== */}
          <div className="flex-1 min-w-0 w-full space-y-6">
            {/* Hero Welcome Banner */}
            <div className={`relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br ${config.gradientBg} bg-white/80 p-6 sm:p-8 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider shadow-xs backdrop-blur-sm bg-white/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700">
                    <RoleIcon className="h-4 w-4" />
                    <span>{config.title}</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${config.badgeClass}`}>
                      {activeRole}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {t('portal.welcome', 'Xin chào')},{' '}
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {user?.name || t('navbar.user_default', 'Người dùng')}
                    </span>
                  </h1>

                  <p className="max-w-2xl text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {config.heroDesc}
                  </p>
                </div>

                <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 sm:border-l border-slate-200/60 dark:border-slate-800 pt-3 sm:pt-0 sm:pl-6">
                  <div className="text-left sm:text-right">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {t('portal.current_role', 'Vai trò hiện tại')}
                    </span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {activeRole}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{t('portal.system_online', 'Bảo vệ đang kích hoạt')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Thẻ Thống Kê Nhanh (KPIs Grid) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {config.stats.map((stat, idx) => {
                const StatIcon = stat.icon;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 transition-all duration-200 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                        {stat.label}
                      </span>
                      <StatIcon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white mb-0.5">
                      {stat.value}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                      {stat.sub}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Lưới Thẻ Các Trang Chức Năng (Featured Pages Grid) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-600" />
                    <span>{t('portal.page_directory', 'DANH MỤC TRANG CHỨC NĂNG')}</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('portal.page_directory_desc', 'Truy cập trực tiếp các trang chức năng thuộc vai trò của bạn')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.pages.map((p, idx) => {
                  const PageIcon = p.icon;
                  return (
                    <Link
                      key={idx}
                      to={p.path}
                      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 transition-all duration-200 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 no-underline"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${p.iconColor} shadow-xs`}>
                            <PageIcon className="h-5 w-5" />
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {p.highlight}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {p.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {p.desc}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                        <span>{t('portal.launch_page', 'Mở trang này')}</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Thẻ Bảo Mật & Hạ Tầng DRM */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-blue-600" />
                  <span>{t('portal.security_status', 'TRẠNG THÁI BẢO MẬT')}</span>
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Chuẩn ISO/IEC DRM</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">MÃ HÓA NỘI DUNG</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">AES-128 HLS Segments</div>
                  <div className="text-[11px] text-emerald-600 font-medium">Bảo vệ khóa qua ECDH KMS</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">WATERMARK ĐỘNG</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Forensic Fingerprinting</div>
                  <div className="text-[11px] text-blue-600 font-medium">Đối soát khi bị leak/quay màn hình</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">LƯU TRỮ ĐÁM MÂY</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">Cloudflare R2 Bucket</div>
                  <div className="text-[11px] text-indigo-600 font-medium">0$ Egress Fees & Budget Cap</div>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================
           * THANH BÊN PHẢI (RIGHT SIDEBAR): CHỨA CÁC MỤC PAGE RIÊNG CHO TỪNG USER
           * =================================================================== */}
          <aside className="w-full lg:w-80 xl:w-84 shrink-0 lg:sticky lg:top-24 space-y-4">
            {/* Card 1: Header Cổng & Các Trang Chức Năng (Thanh Bên Phải) */}
            <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 space-y-4">

              {/* Header Thanh Bên Phải */}
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.badgeClass}`}>
                    <RoleIcon className="h-3 w-3" />
                    <span>{activeRole}</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    NAV BAR
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {config.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {config.subtitle}
                </p>
              </div>

              {/* Danh sách các mục page riêng cho User */}
              <div className="space-y-1.5">
                <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  {t('portal.page_directory', 'DANH MỤC TRANG CHỨC NĂNG')}
                </div>

                {config.pages.map((p, idx) => {
                  const PageIcon = p.icon;
                  return (
                    <Link
                      key={idx}
                      to={p.path}
                      className="group flex items-center gap-3 rounded-2xl p-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200 no-underline"
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${p.iconColor}`}>
                        <PageIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {p.title}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal truncate">
                          {p.desc}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" />
                    </Link>
                  );
                })}
              </div>

              {/* Card Tài Khoản Nhỏ Bên Phải */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {user?.name || 'Tài khoản User'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {user?.email || 'user@securelearn.io'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Lối Tắt Điều Hướng Nhanh */}
            <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 space-y-2">
              <span className="block px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t('portal.quick_nav', 'ĐIỀU HƯỚNG NHANH')}
              </span>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  to={`/${lang}/home`}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 no-underline transition-colors"
                >
                  <Compass className="h-3.5 w-3.5 text-blue-600" />
                  <span>{t('navbar.home', 'Trang Chủ')}</span>
                </Link>

                <Link
                  to={`/${lang}/catalog`}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 no-underline transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{t('navbar.courses', 'Khóa Học')}</span>
                </Link>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}

UserPortal.propTypes = {
  defaultRole: PropTypes.string,
};
