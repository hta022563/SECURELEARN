import React, { useEffect, useState } from 'react';
import { Outlet, useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Navbar, Nav, Container, Dropdown, Badge, NavDropdown, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastProvider';
import Logo from './Logo';
import { logoutBackendSession } from '../services/courseService';

export default function LayoutWithLanguage() {
  const { lang } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const { showToast } = useToast();

  // ── Theme state (light / dark) ──────────────────────────────────────────
  const [theme, setTheme] = useState(() => localStorage.getItem('securelearn-theme') || 'light');

  useEffect(() => {
    localStorage.setItem('securelearn-theme', theme);
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  // ────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (lang !== 'vi' && lang !== 'en') {
      // Nếu URL không có tiền tố ngôn ngữ (ví dụ user bấm Link to="/catalog")
      // Ta lấy toàn bộ path hiện tại và gắn thêm ngôn ngữ đang lưu
      const savedLang = localStorage.getItem('i18nextLng') || 'vi';
      const fallbackLang = (savedLang === 'en' || savedLang === 'vi') ? savedLang : 'vi';

      // location.pathname lúc này là "/catalog", location.search là "?abc"
      navigate(`/${fallbackLang}${location.pathname}${location.search}${location.hash}`, { replace: true });
    } else if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n, navigate, location]);

  // Ngăn render sai UI khi URL đang được redirect
  if (lang !== 'vi' && lang !== 'en') {
    return null;
  }

  const changeLanguage = (newLang) => {
    const pathSegments = location.pathname.split('/');
    pathSegments[1] = newLang;
    const newPath = pathSegments.join('/') + location.search + location.hash;
    navigate(newPath);
  };

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

  const isActive = (path) => location.pathname === `/${lang}${path}`;

  const renderRoleBadge = (role) => {
    switch (role) {
      case 'Administrator': return <Badge bg="danger" className="ms-1 rounded-pill">Admin</Badge>;
      case 'Instructor': return <Badge bg="warning" text="dark" className="ms-1 rounded-pill">Instructor</Badge>;
      case 'Student':
      default: return <Badge bg="primary" className="ms-1 rounded-pill">Student</Badge>;
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar bg="white" expand="lg" sticky="top" className="border-bottom py-2 shadow-sm" style={{ zIndex: 1030 }}>
        <Container fluid className="px-3 px-lg-4 px-xxl-5">
          <Navbar.Brand as={Link} to={`/${lang}/home`} className="d-flex align-items-center me-3 me-xl-4 text-decoration-none py-0">
            <Logo size="sm" showBadge={true} badgeText="E-LEARNING" />
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="main-navbar">
            <i className="bi bi-list fs-3 text-primary"></i>
          </Navbar.Toggle>

          <Navbar.Collapse id="main-navbar">
            <Nav className="me-auto my-2 my-lg-0 align-items-lg-center gap-1 gap-xl-2">
              {!isAuthenticated && (
                <>
                  <Nav.Link as={Link} to={`/${lang}/home`} className={isActive('/home') ? 'nav-pill-active' : 'nav-link-custom'}>
                    {t('common.home', 'Home')}
                  </Nav.Link>
                  <Nav.Link as={Link} to={`/${lang}/catalog`} className={isActive('/catalog') ? 'nav-pill-active' : 'nav-link-custom'}>
                    {t('common.catalog', 'Catalog')}
                  </Nav.Link>
                </>
              )}

              {isAuthenticated && user?.role === 'Student' && (
                <>
                  <Nav.Link as={Link} to={`/${lang}/student/courses`} className={isActive('/student/courses') ? 'nav-pill-active' : 'nav-link-custom'}>
                    {t('navbar.my_courses')}
                  </Nav.Link>
                  <Nav.Link as={Link} to={`/${lang}/catalog`} className={isActive('/catalog') ? 'nav-pill-active' : 'nav-link-custom'}>
                    {t('navbar.course_catalog')}
                  </Nav.Link>
                </>
              )}

              {isAuthenticated && user?.role === 'Instructor' && (
                <>
                  <Nav.Link as={Link} to={`/${lang}/instructor/videos`} className={isActive('/instructor/videos') ? 'nav-pill-active' : 'nav-link-custom'}>
                    {t('navbar.manage_videos')}
                  </Nav.Link>
                  <Nav.Link as={Link} to={`/${lang}/instructor/upload`} className={isActive('/instructor/upload') ? 'nav-pill-active' : 'nav-link-custom'}>
                    {t('navbar.upload_drm')}
                  </Nav.Link>
                  <Nav.Link as={Link} to={`/${lang}/catalog`} className={isActive('/catalog') ? 'nav-pill-active' : 'nav-link-custom'}>
                    {t('navbar.explore_courses')}
                  </Nav.Link>
                </>
              )}

              {isAuthenticated && user?.role === 'Administrator' && (
                <>
                  <Nav.Link as={Link} to={`/${lang}/admin/users`} className={isActive('/admin/users') ? 'nav-pill-active' : 'nav-link-custom'}>
                    {t('navbar.manage_users')}
                  </Nav.Link>
                  <Nav.Link as={Link} to={`/${lang}/admin/alerts`} className={isActive('/admin/alerts') ? 'nav-pill-active' : 'nav-link-custom'}>
                    {t('navbar.ai_alerts')}
                  </Nav.Link>
                  <Nav.Link as={Link} to={`/${lang}/admin/config`} className={isActive('/admin/config') ? 'nav-pill-active' : 'nav-link-custom'}>
                    {t('navbar.r2_config')}
                  </Nav.Link>
                  <Nav.Link as={Link} to={`/${lang}/admin/trace`} className={isActive('/admin/trace') ? 'nav-pill-active' : 'nav-link-custom'}>
                    {t('navbar.watermark_tracing')}
                  </Nav.Link>
                </>
              )}
            </Nav>

            <Nav className="align-items-lg-center gap-2">

              {/* ── THEME TOGGLE ☀️🌙 ─────────────────────────────── */}
              <Button
                variant="link"
                onClick={toggleTheme}
                className="d-flex align-items-center justify-content-center rounded-circle border-0 p-0 text-secondary"
                style={{ width: '40px', height: '40px', textDecoration: 'none' }}
                title={theme === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
              >
                {theme === 'light'
                  ? <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256"><path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56,104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"/></svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="#f59e0b" viewBox="0 0 256 256"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg>
                }
              </Button>

              <Dropdown align="end">
                <Dropdown.Toggle
                  variant="link"
                  id="dropdown-language"
                  className="d-flex align-items-center justify-content-center rounded-circle border-0 text-secondary hover-bg-light"
                  style={{ width: '40px', height: '40px', padding: 0 }}
                  title="Toggle Language"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M247.15,212.42l-56-112a8,8,0,0,0-14.31,0l-21.71,43.43A88,88,0,0,1,108,126.93,103.65,103.65,0,0,0,135.69,64H160a8,8,0,0,0,0-16H104V32a8,8,0,0,0-16,0V48H32a8,8,0,0,0,0,16h87.63A87.76,87.76,0,0,1,96,116.35a87.74,87.74,0,0,1-19-31,8,8,0,1,0-15.08,5.34A103.63,103.63,0,0,0,84,127a87.55,87.55,0,0,1-52,17,8,8,0,0,0,0,16,103.46,103.46,0,0,0,64-22.08,104.18,104.18,0,0,0,51.44,21.31l-26.6,53.19a8,8,0,0,0,14.31,7.16L148.94,192h70.11l13.79,27.58A8,8,0,0,0,240,224a8,8,0,0,0,7.15-11.58ZM156.94,176,184,121.89,211.05,176Z"></path>
                  </svg>
                </Dropdown.Toggle>

                <Dropdown.Menu className="shadow-sm border-0 rounded-4 mt-2 p-2" style={{ minWidth: '140px' }}>
                  <Dropdown.Item
                    onClick={() => changeLanguage('en')}
                    className={`rounded-3 d-flex align-items-center gap-2 py-2 fw-medium ${lang === 'en' ? 'bg-primary bg-opacity-10 text-primary' : 'text-dark'}`}
                  >
                    <span>English</span>
                  </Dropdown.Item>

                  <Dropdown.Item
                    onClick={() => changeLanguage('vi')}
                    className={`rounded-3 d-flex align-items-center gap-2 py-2 fw-medium ${lang === 'vi' ? 'bg-primary bg-opacity-10 text-primary' : 'text-dark'}`}
                  >
                    <span>Tiếng Việt</span>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              {isAuthenticated && user ? (
                <NavDropdown
                  align="end"
                  title={
                    <span className="d-inline-flex align-items-center text-dark fw-semibold">
                      <span
                        className="rounded-circle d-inline-flex align-items-center justify-content-center me-2 text-white fw-bold shadow-sm"
                        style={{ width: '34px', height: '34px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}
                      >
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </span>
                      <span className="me-2 text-truncate" style={{ maxWidth: '140px' }}>
                        {user.name || t('navbar.user_default')}
                      </span>
                      {renderRoleBadge(user.role)}
                    </span>
                  }
                  className="user-dropdown-custom shadow-sm"
                >
                  <div className="px-3 py-2 border-bottom bg-light">
                    <small className="text-muted d-block">{t('navbar.auth_account')}</small>
                    <strong className="text-primary">{user.name}</strong>
                    <div className="text-muted small text-truncate" style={{ maxWidth: '200px' }}>
                      {user.email}
                    </div>
                  </div>
                  <NavDropdown.Item as={Link} to={`/${lang}/profile`} className="py-2">
                    <i className="bi bi-person-gear me-2 text-primary"></i>{t('navbar.profile_password')}
                  </NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout} className="py-2 text-danger">
                    <i className="bi bi-box-arrow-right me-2"></i>{t('navbar.logout')}
                  </NavDropdown.Item>
                </NavDropdown>
              ) : (
                <div className="d-flex align-items-center gap-2 mt-2 mt-lg-0">
                  <Link to={`/${lang}/login`} className="btn-secondary-pill text-decoration-none small">
                    {t('common.login', 'Login')}
                  </Link>
                  <Link to={`/${lang}/register`} className="btn-primary-pill text-decoration-none small">
                    {t('common.register', 'Register')}
                  </Link>
                </div>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main className="flex-grow-1 bg-transparent">
        <Outlet />
      </main>
    </div>
  );
}
