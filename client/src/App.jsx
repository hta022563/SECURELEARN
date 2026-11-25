import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// 1. Context Providers & Guards
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastProvider';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

// 2. Navigation & Shared Components
import LayoutWithLanguage from './components/LayoutWithLanguage';
import MeshGradientBackground from './components/MeshGradientBackground';
import ErrorBoundary from './components/ErrorBoundary';
import RolePortalLayout from './components/RolePortalLayout';

// 3. Eager Public Entry Pages (Instant First Paint)
import Home from './pages/Home';
import CourseCatalog from './pages/CourseCatalog';
import Login from './pages/Login';
import Register from './pages/Register';

// 4. Lazy-Loaded Secondary & Role-Specific Pages (Code-Splitting for Fast Load)
const SubjectLectures = lazy(() => import('./pages/SubjectLectures'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const NotFound = lazy(() => import('./pages/NotFound'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const MyCourses = lazy(() => import('./pages/MyCourses'));
const StudentCoursePlayer = lazy(() => import('./pages/StudentCoursePlayer'));
const InstructorVideos = lazy(() => import('./pages/InstructorVideos'));
const UploadVideo = lazy(() => import('./components/UploadVideo'));
const InstructorVideoPreview = lazy(() => import('./pages/InstructorVideoPreview'));
const AdminUserManagement = lazy(() => import('./pages/AdminUserManagement'));
const AdminAnomalyDashboard = lazy(() => import('./components/AdminAnomalyDashboard'));
const LeakTracing = lazy(() => import('./pages/LeakTracing'));
const DbExplorer = lazy(() => import('./pages/DbExplorer'));

function PageLoadingFallback() {
  return (
    <div className="min-h-[55vh] flex flex-col items-center justify-center gap-3 py-16">
      <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
    </div>
  );
}

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

/**
 * =============================================================================
 * ROOT COMPONENT: App (Kiến Trúc Routing Toàn Diện Cho Dự Án SecureLearn)
 * =============================================================================
 * Xây dựng dựa trên Use Case và Screen Flow:
 * - Guest Node: '/', '/login', '/register', '/catalog'
 * - JWT Role Router: ProtectedRoute (kiểm tra Role từ JWT trong AuthContext)
 * - Student Branch: '/student/courses', '/student/player/:videoId'
 * - Instructor Branch: '/instructor/videos', '/instructor/upload', '/instructor/preview/:videoId'
 * - Admin Branch: '/admin/users', '/admin/alerts', '/admin/trace'
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
                <Suspense fallback={<PageLoadingFallback />}>
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

                      {/* Trang Khóa học: Danh mục môn học & Chi tiết bài giảng theo môn */}
                      <Route path="catalog" element={<CourseCatalog />} />
                      <Route path="catalog/subject/:subjectId" element={<SubjectLectures />} />

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
                        <Route path="player" element={<StudentCoursePlayer />} />
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
                        <Route path="preview" element={<InstructorVideoPreview />} />
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
                </Suspense>
                </ErrorBoundary>
            </div>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
