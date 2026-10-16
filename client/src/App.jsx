import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// 1. Context Providers & Guards
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastProvider';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

// 2. Navigation & Shared Components
import LayoutWithLanguage from './components/LayoutWithLanguage';
import SecureVideoPlayer from './components/SecureVideoPlayer';
import MeshGradientBackground from './components/MeshGradientBackground';
import Logo from './components/Logo';
import ErrorBoundary from './components/ErrorBoundary';

// 3. Guest / Public Pages
import Home from './pages/Home';
import CourseCatalog from './pages/CourseCatalog';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

// 4. Shared Protected Pages
import UserProfile from './pages/UserProfile';
import UserPortal from './pages/UserPortal';
import RolePortalLayout from './components/RolePortalLayout';

/**
 * Helper điều hướng Portal theo Role người dùng
 */
function RolePortalRedirect() {
  const { user } = useAuth();
  const { lang = 'vi' } = useParams();
  const role = user?.role || 'Student';
  if (role === 'Administrator') {
    return <Navigate to={`/${lang}/admin/alerts`} replace />;
  }
  if (role === 'Instructor') {
    return <Navigate to={`/${lang}/instructor/videos`} replace />;
  }
  return <Navigate to={`/${lang}/student/courses`} replace />;
}

/**
 * Helper điều hướng Hồ sơ & Mật khẩu theo Role để luôn giữ Nav Portal
 */
function ProfileRedirect() {
  const { user } = useAuth();
  const { lang = 'vi' } = useParams();
  const role = user?.role || 'Student';
  if (role === 'Administrator') {
    return <Navigate to={`/${lang}/admin/profile`} replace />;
  }
  if (role === 'Instructor') {
    return <Navigate to={`/${lang}/instructor/profile`} replace />;
  }
  return <Navigate to={`/${lang}/student/profile`} replace />;
}

// 5. Student Branch Pages
import MyCourses from './pages/MyCourses';
import StudentCoursePlayer from './pages/StudentCoursePlayer';

// 6. Instructor Branch Pages
import InstructorVideos from './pages/InstructorVideos';
import UploadVideo from './components/UploadVideo';
import InstructorVideoPreview from './pages/InstructorVideoPreview';

// 7. Administrator Branch Pages
import AdminUserManagement from './pages/AdminUserManagement';
import AdminAnomalyDashboard from './components/AdminAnomalyDashboard';
import AdminSystemConfig from './pages/AdminSystemConfig';
import LeakTracing from './pages/LeakTracing';

// 8. Dev Tool — Mock Database Explorer
import DbExplorer from './pages/DbExplorer';

/**
 * =============================================================================
 * ROOT COMPONENT: App (Kiến Trúc Routing Toàn Diện Cho Dự Án SecureLearn)
 * =============================================================================
 * Xây dựng dựa trên Use Case và Screen Flow:
 * - Guest Node: '/', '/login', '/register', '/catalog'
 * - JWT Role Router: ProtectedRoute (kiểm tra Role từ JWT trong AuthContext)
 * - Student Branch: '/student/courses', '/student/player/:videoId'
 * - Instructor Branch: '/instructor/videos', '/instructor/upload', '/instructor/preview/:videoId'
 * - Admin Branch: '/admin/users', '/admin/alerts', '/admin/config'
 * - Shared Node: '/profile', '/catalog'
 */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider position="bottom-end">
          <BrowserRouter>
            {/* Nền Ambient Mesh Gradient động phủ toàn cầu toàn bộ ứng dụng */}
            <MeshGradientBackground />

            <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex flex-col relative z-10">
              <ErrorBoundary>
                <Routes>
                  {/* Redirect / về mặc định /vi/home */}
                  <Route path="/" element={<Navigate to="/vi/home" replace />} />

                    {/* Bọc toàn bộ ứng dụng trong Layout có tham số :lang */}
                    <Route path="/:lang" element={<LayoutWithLanguage />}>

                      {/* =============================================================
                   * 1. GUEST & PUBLIC ROUTES (Không yêu cầu đăng nhập)
                   * ============================================================= */}
                      {/* Trang chủ: Giới thiệu nền tảng & Video mới nhất */}
                      <Route path="home" element={<Home />} />
                      <Route index element={<Navigate to="home" replace />} />

                      {/* Trang Khóa học: Danh mục khóa học toàn diện & Bộ lọc */}
                      <Route path="catalog" element={<CourseCatalog />} />

                      {/* Xác thực người dùng */}
                      <Route path="login" element={<Login />} />
                      <Route path="register" element={<Register />} />

                      {/* Trang thông báo không đủ thẩm quyền 403 Forbidden */}
                      <Route path="unauthorized" element={<Unauthorized />} />

                      {/* =============================================================
                   * 2. NHÁNH STUDENT (Chỉ dành cho Role: Student, mở rộng xem cho Instructor/Admin)
                   * Bố cục 2 phần: Nav chức năng bên phải & Workspace làm việc bên trái
                   * ============================================================= */}
                      <Route
                        path="student"
                        element={
                          <ProtectedRoute allowedRoles={['Student', 'Instructor', 'Administrator']}>
                            <RolePortalLayout role="Student" />
                          </ProtectedRoute>
                        }
                      >
                        <Route index element={<Navigate to="courses" replace />} />
                        <Route path="portal" element={<Navigate to="../courses" replace relative="path" />} />
                        <Route path="courses" element={<MyCourses />} />
                        <Route path="player/:videoId" element={<StudentCoursePlayer />} />
                        <Route path="player" element={<Navigate to="../player/v-001" replace relative="path" />} />
                        <Route path="profile" element={<UserProfile />} />
                      </Route>

                      {/* =============================================================
                   * 3. NHÁNH INSTRUCTOR (Chỉ dành cho Role: Instructor & Administrator)
                   * Bố cục 2 phần: Nav chức năng bên phải & Workspace làm việc bên trái
                   * ============================================================= */}
                      <Route
                        path="instructor"
                        element={
                          <ProtectedRoute allowedRoles={['Instructor', 'Administrator']}>
                            <RolePortalLayout role="Instructor" />
                          </ProtectedRoute>
                        }
                      >
                        <Route index element={<Navigate to="videos" replace />} />
                        <Route path="portal" element={<Navigate to="../videos" replace relative="path" />} />
                        <Route path="videos" element={<InstructorVideos />} />
                        <Route path="upload" element={<UploadVideo />} />
                        <Route path="preview/:videoId" element={<InstructorVideoPreview />} />
                        <Route path="preview" element={<Navigate to="../preview/v-001" replace relative="path" />} />
                        <Route path="profile" element={<UserProfile />} />
                      </Route>

                      {/* =============================================================
                   * 4. NHÁNH ADMIN (Chỉ dành cho Role: Administrator)
                   * Bố cục 2 phần: Nav chức năng bên phải & Workspace làm việc bên trái
                   * ============================================================= */}
                      <Route
                        path="admin"
                        element={
                          <ProtectedRoute allowedRoles={['Administrator']}>
                            <RolePortalLayout role="Administrator" />
                          </ProtectedRoute>
                        }
                      >
                        <Route index element={<Navigate to="alerts" replace />} />
                        <Route path="portal" element={<Navigate to="../alerts" replace relative="path" />} />
                        <Route path="alerts" element={<AdminAnomalyDashboard />} />
                        <Route path="users" element={<AdminUserManagement />} />
                        <Route path="config" element={<AdminSystemConfig />} />
                        <Route path="trace" element={<LeakTracing />} />
                        <Route path="profile" element={<UserProfile />} />
                      </Route>

                      {/* =============================================================
                   * 5. SHARED NODE: TÍNH NĂNG DÙNG CHUNG (Mọi Role đã đăng nhập)
                   * ============================================================= */}
                      {/* Portal chung tự chuyển theo Role */}
                      <Route
                        path="portal"
                        element={
                          <ProtectedRoute allowedRoles={['Student', 'Instructor', 'Administrator']}>
                            <RolePortalRedirect />
                          </ProtectedRoute>
                        }
                      />

                      {/* View/Update Profile & Password: Tự chuyển hướng theo Role để luôn giữ Nav Portal */}
                      <Route
                        path="profile"
                        element={
                          <ProtectedRoute allowedRoles={['Student', 'Instructor', 'Administrator']}>
                            <ProfileRedirect />
                          </ProtectedRoute>
                        }
                      />

                      {/* =============================================================
                   * 6. DEV TOOL — MOCK DATABASE EXPLORER (Development Only)
                   * ============================================================= */}
                      <Route path="db-explorer" element={<DbExplorer />} />

                      {/* =============================================================
                   * 7. CATCH-ALL ROUTE (404 NOT FOUND)
                   * ============================================================= */}
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Routes>
                </ErrorBoundary>
            </div>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
