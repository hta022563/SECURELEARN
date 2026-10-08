import React from 'react';
import PropTypes from 'prop-types';
import { Navbar, Nav, Container, NavDropdown, Badge } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastProvider';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import { logoutBackendSession } from '../services/courseService';

/**
 * =============================================================================
 * COMPONENT: MainNavbar (Thanh Điều Hướng Thích Ứng Theo Vai Trò JWT)
 * =============================================================================
 * Tự động rẽ nhánh các liên kết menu dựa theo vai trò (Role) đọc từ JWT / AuthContext:
 * - Khách vãng lai (Guest): Trang chủ, Khóa học, Đăng nhập, Đăng ký.
 * - Học viên (Student): Khóa học của tôi, Xem video DRM, Danh mục khóa học nội bộ.
 * - Giảng viên (Instructor): Quản lý Video, Upload R2 DRM, Xem trước Video (Preview), Khám phá khóa học.
 * - Quản trị viên (Administrator): Quản lý người dùng, Cảnh báo AI, Cấu hình & Ngân sách R2, Truy vết Watermark.
 * - Dùng chung (Shared): Hồ sơ cá nhân / Đổi mật khẩu (/profile), Đăng xuất.
 */
export default function MainNavbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const handleLogout = async () => {
    try {
      await logoutBackendSession();
    } catch (e) {
      // ignore
    }
    logout();
    showToast(t('navbar.logout_success'), 'info');
    navigate('/login');
  };

  /**
   * Helper kiểm tra active link
   */
  const isActive = (path) => location.pathname === path;

  /**
   * Helper hiển thị huy hiệu vai trò
   */
  const renderRoleBadge = (role) => {
    switch (role) {
      case 'Administrator':
        return <Badge bg="danger" className="ms-1 rounded-pill">Admin</Badge>;
      case 'Instructor':
        return <Badge bg="warning" text="dark" className="ms-1 rounded-pill">Instructor</Badge>;
      case 'Student':
      default:
        return <Badge bg="primary" className="ms-1 rounded-pill">Student</Badge>;
    }
  };

  return (
    <Navbar
      bg="white"
      expand="lg"
      sticky="top"
      className="border-bottom border-light-subtle py-2 shadow-sm"
      style={{ backgroundColor: '#ffffff', zIndex: 1030 }}
    >
      <Container fluid className="px-3 px-lg-4 px-xxl-5">
        {/* =====================================================================
         * 1. LOGO THƯƠNG HIỆU SECURELEARN HIỆN ĐẠI
         * ===================================================================== */}
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center me-3 me-xl-4 text-decoration-none py-0">
          <Logo size="sm" showBadge={true} badgeText="E-LEARNING" />
        </Navbar.Brand>

        {/* Nút Hamburger Toggle trên màn hình di động */}
        <Navbar.Toggle aria-controls="securelearn-main-navbar" className="border-0 shadow-none">
          <i className="bi bi-list fs-3 text-primary"></i>
        </Navbar.Toggle>

        <Navbar.Collapse id="securelearn-main-navbar">
          {/* =====================================================================
           * 2. MENU ĐIỀU HƯỚNG TỰ ĐỘNG THAY ĐỔI THEO ROLE TỪ JWT ROUTER
           * ===================================================================== */}
          <Nav className="me-auto my-2 my-lg-0 align-items-lg-center gap-1 gap-xl-2">
            {/* NHÁNH 1: KHÁCH VÃNG LAI (GUEST - CHƯA ĐĂNG NHẬP) */}
            {!isAuthenticated && (
              <>
                <Nav.Link
                  as={Link}
                  to="/"
                  className={isActive('/') ? 'nav-pill-active' : 'nav-link-custom'}
                >
                  {t('common.home')}
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/catalog"
                  className={isActive('/catalog') ? 'nav-pill-active' : 'nav-link-custom'}
                >
                  {t('common.catalog')}
                </Nav.Link>
              </>
            )}

            {/* NHÁNH 2: HỌC VIÊN (STUDENT) */}
            {isAuthenticated && user?.role === 'Student' && (
              <>
                <Nav.Link
                  as={Link}
                  to="/student/courses"
                  className={isActive('/student/courses') ? 'nav-pill-active' : 'nav-link-custom'}
                >
                  {t('navbar.my_courses')}
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/catalog"
                  className={isActive('/catalog') ? 'nav-pill-active' : 'nav-link-custom'}
                >
                  {t('navbar.course_catalog')}
                </Nav.Link>
              </>
            )}

            {/* NHÁNH 3: GIẢNG VIÊN (INSTRUCTOR) */}
            {isAuthenticated && user?.role === 'Instructor' && (
              <>
                <Nav.Link
                  as={Link}
                  to="/instructor/videos"
                  className={isActive('/instructor/videos') ? 'nav-pill-active' : 'nav-link-custom'}
                >
                  {t('navbar.manage_videos')}
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/instructor/upload"
                  className={isActive('/instructor/upload') ? 'nav-pill-active' : 'nav-link-custom'}
                >
                  {t('navbar.upload_drm')}
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/instructor/preview/v-001"
                  className={location.pathname.startsWith('/instructor/preview') ? 'nav-pill-active' : 'nav-link-custom'}
                >
                  {t('navbar.preview_video')}
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/catalog"
                  className={isActive('/catalog') ? 'nav-pill-active' : 'nav-link-custom'}
                >
                  {t('navbar.explore_courses')}
                </Nav.Link>
              </>
            )}

            {/* NHÁNH 4: QUẢN TRỊ VIÊN (ADMINISTRATOR) */}
            {isAuthenticated && user?.role === 'Administrator' && (
              <>
                <Nav.Link
                  as={Link}
                  to="/admin/users"
                  className={isActive('/admin/users') ? 'nav-pill-active' : 'nav-link-custom'}
                >
                  {t('navbar.manage_users')}
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/admin/alerts"
                  className={isActive('/admin/alerts') ? 'nav-pill-active' : 'nav-link-custom'}
                >
                  {t('navbar.ai_alerts')}
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/admin/config"
                  className={isActive('/admin/config') ? 'nav-pill-active' : 'nav-link-custom'}
                >
                  {t('navbar.r2_config')}
                </Nav.Link>
                <Nav.Link
                  as={Link}
                  to="/admin/trace"
                  className={isActive('/admin/trace') ? 'nav-pill-active' : 'nav-link-custom'}
                >
                  {t('navbar.watermark_tracing')}
                </Nav.Link>
              </>
            )}
          </Nav>

          {/* =====================================================================
           * 3. KHU VỰC PHẢI: USER PROFILE HOẶC ĐĂNG NHẬP / ĐĂNG KÝ
           * ===================================================================== */}
          <Nav className="align-items-lg-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            {isAuthenticated && user ? (
              <NavDropdown
                align="end"
                id="user-nav-dropdown"
                title={
                  <span className="d-inline-flex align-items-center text-dark fw-semibold">
                    <span
                      className="rounded-circle d-inline-flex align-items-center justify-content-center me-2 text-white fw-bold shadow-sm"
                      style={{
                        width: '34px',
                        height: '34px',
                        fontSize: '0.85rem',
                        background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                      }}
                    >
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                    <span className="me-2 text-truncate" style={{ maxWidth: '140px' }}>
                      {user.name || t('navbar.user_default')}
                    </span>
                    {renderRoleBadge(user.role)}
                  </span>
                }
                menuVariant="light"
                className="user-dropdown-custom shadow-sm"
              >
                {/* Thông tin tóm tắt trong Dropdown */}
                <div className="px-3 py-2 border-bottom bg-light">
                  <small className="text-muted d-block">{t('navbar.auth_account')}</small>
                  <strong className="text-primary">{user.name}</strong>
                  <div className="text-muted small text-truncate" style={{ maxWidth: '200px' }}>
                    {user.email}
                  </div>
                </div>

                {/* Tính Năng Dùng Chung (Shared Node): Hồ Sơ Cá Nhân & Đổi Mật Khẩu */}
                <NavDropdown.Item as={Link} to="/profile" className="py-2">
                  <i className="bi bi-person-gear me-2 text-primary"></i>{t('navbar.profile_password')}
                </NavDropdown.Item>

                <NavDropdown.Divider />

                {/* Đăng Xuất */}
                <NavDropdown.Item onClick={handleLogout} className="py-2 text-danger">
                  <i className="bi bi-box-arrow-right me-2"></i>{t('navbar.logout')}
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <div className="d-flex align-items-center gap-2 mt-2 mt-lg-0">
                <Link to="/login" className="btn-secondary-pill text-decoration-none small">
                  {t('common.login')}
                </Link>
                <Link to="/register" className="btn-primary-pill text-decoration-none small">
                  {t('common.register')}
                </Link>
              </div>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

MainNavbar.propTypes = {
  // MainNavbar lấy dữ liệu tự động từ AuthContext
};
