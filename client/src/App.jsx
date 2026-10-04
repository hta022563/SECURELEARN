import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';

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

// 3. Guest / Public Pages
import Home from './pages/Home';
import CourseCatalog from './pages/CourseCatalog';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

// 4. Shared Protected Pages
import UserProfile from './pages/UserProfile';

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

          <div className="min-vh-100 bg-light-blue text-dark d-flex flex-column position-relative">
            {/* Khung chuyển đổi màn hình (Routes Tree) */}
            <main className="flex-grow-1">
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
                   * ============================================================= */}
                  {/* Danh sách khóa học của học viên */}
                  <Route
                    path="student/courses"
                    element={
                      <ProtectedRoute allowedRoles={['Student', 'Instructor', 'Administrator']}>
                        <MyCourses />
                      </ProtectedRoute>
                    }
                  />

                  {/* Video Player - HLS & Watermark (Truyền tham số videoId hoặc courseId) */}
                  <Route
                    path="student/player/:videoId"
                    element={
                      <ProtectedRoute allowedRoles={['Student', 'Instructor', 'Administrator']}>
                        <StudentCoursePlayer />
                      </ProtectedRoute>
                    }
                  />
                  {/* Fallback khi truy cập /student/player không truyền videoId -> Chuyển về Khóa học của tôi */}
                  <Route
                    path="student/player"
                    element={<Navigate to="courses" replace />}
                  />

                  {/* =============================================================
                   * 3. NHÁNH INSTRUCTOR (Chỉ dành cho Role: Instructor & Administrator)
                   * ============================================================= */}
                  {/* My Videos / Metadata (Quản lý video bài giảng) */}
                  <Route
                    path="instructor/videos"
                    element={
                      <ProtectedRoute allowedRoles={['Instructor', 'Administrator']}>
                        <InstructorVideos />
                      </ProtectedRoute>
                    }
                  />

                  {/* Upload Video to R2 (Thêm mới video bảo mật DRM) */}
                  <Route
                    path="instructor/upload"
                    element={
                      <ProtectedRoute allowedRoles={['Instructor', 'Administrator']}>
                        <UploadVideo />
                      </ProtectedRoute>
                    }
                  />

                  {/* Preview Video - Watermarked (Xem trước video giảng viên) */}
                  <Route
                    path="instructor/preview/:videoId"
                    element={
                      <ProtectedRoute allowedRoles={['Instructor', 'Administrator']}>
                        <InstructorVideoPreview />
                      </ProtectedRoute>
                    }
                  />
                  {/* Fallback khi truy cập /instructor/preview không truyền videoId */}
                  <Route
                    path="instructor/preview"
                    element={<Navigate to="preview/v-001" replace />}
                  />

                  {/* =============================================================
                   * 4. NHÁNH ADMIN (Chỉ dành cho Role: Administrator)
                   * ============================================================= */}
                  {/* User Management (Quản lý học viên & phân quyền) */}
                  <Route
                    path="admin/users"
                    element={
                      <ProtectedRoute allowedRoles={['Administrator']}>
                        <AdminUserManagement />
                      </ProtectedRoute>
                    }
                  />

                  {/* Anomaly Alerts / Leak Tracing (Phát hiện gian lận & rò rỉ AI) */}
                  <Route
                    path="admin/alerts"
                    element={
                      <ProtectedRoute allowedRoles={['Administrator']}>
                        <AdminAnomalyDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* System Config / Budget Alerts (Cấu hình hệ thống & cảnh báo ngân sách R2) */}
                  <Route
                    path="admin/config"
                    element={
                      <ProtectedRoute allowedRoles={['Administrator']}>
                        <AdminSystemConfig />
                      </ProtectedRoute>
                    }
                  />

                  {/* Leak Tracing Tool Chuyên Sâu */}
                  <Route
                    path="admin/trace"
                    element={
                      <ProtectedRoute allowedRoles={['Administrator']}>
                        <LeakTracing />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback alias cho /admin */}
                  <Route path="admin" element={<Navigate to="alerts" replace />} />

                  {/* =============================================================
                   * 5. SHARED NODE: TÍNH NĂNG DÙNG CHUNG (Mọi Role đã đăng nhập)
                   * ============================================================= */}
                  {/* View/Update Profile & Password (Student, Instructor, Administrator) */}
                  <Route
                    path="profile"
                    element={
                      <ProtectedRoute allowedRoles={['Student', 'Instructor', 'Administrator']}>
                        <UserProfile />
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
            </main>


            {/* Footer chân trang SecureLearn */}
            <footer className="bg-white text-muted border-top border-light-subtle py-3 text-center small mt-auto">
              <div className="container d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
                <Logo size="sm" showBadge={false} />
                <span className="text-secondary">Nền tảng Video Trực Tuyến Bảo Mật • HLS AES-128 & Web Crypto ECDH</span>
                <span className="text-muted">© 2026 SecureLearn Inc. All rights reserved.</span>
              </div>
            </footer>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  </ThemeProvider>
  );
}
