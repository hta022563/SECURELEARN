import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import {
  UserPlus,
  Key,
  ShieldCheck,
  Check,
  X,
  Users,
  GraduationCap,
  Briefcase,
  ShieldAlert,
  Info,
  Loader2,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { getCourses } from '../services/courseService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export default function AdminUserManagement() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  // State dữ liệu người dùng & khóa học thật
  const [usersList, setUsersList] = useState([]);
  const [realCourses, setRealCourses] = useState([]);

  // Helper lấy token đăng nhập của Admin
  const getAuthHeader = () => {
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // 1. Load danh sách khóa học thật từ BE
  useEffect(() => {
    getCourses()
      .then((data) => {
        if (Array.isArray(data)) setRealCourses(data);
      })
      .catch((err) => console.warn('[AdminUserManagement] Lỗi nạp khóa học:', err));
  }, []);

  // State Modal 1: Tạo Người Dùng Mới
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Student');
  const [submitting, setSubmitting] = useState(false);

  // State Modal 2: Cấp Quyền Khóa Học (Entitlements)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [tempAssignedCourses, setTempAssignedCourses] = useState([]);
  const [initialAssignedCourses, setInitialAssignedCourses] = useState([]);

  const availableCourses = useMemo(() => {
    return realCourses.map((c) => ({
      id: c.ID || c.id,
      code: String(c.ID || c.id).slice(0, 8).toUpperCase(),
      name: `${c.Title || c.title}`,
      price: c.Price || c.price || 0,
    }));
  }, [realCourses]);

  const formatRole = (role) => {
    const r = (role || '').toLowerCase();
    if (r === 'admin' || r === 'administrator') return 'Administrator';
    if (r === 'instructor') return 'Instructor';
    return 'Student';
  };

  const handleOpenAddModal = () => {
    setNewEmail('');
    setNewPassword('');
    setNewRole('Student');
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
  };

  // =========================================================================
  // GỌI API THẬT: POST /api/v1/auth/register
  // =========================================================================
  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!newEmail.trim() || !newPassword) {
      showToast(t('admin_users.missing_email_password'), 'warning', t('admin_users.missing_info'));
      return;
    }

    const emailTrimmed = newEmail.trim().toLowerCase();
    const rawRole = newRole === 'Instructor' ? 'instructor' : 'student';

    setSubmitting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/auth/register`, {
        fullName: emailTrimmed.split('@')[0],
        email: emailTrimmed,
        password: newPassword,
        role: rawRole,
      });

      // Thêm user mới vào danh sách hiển thị
      const createdUser = {
        ID: emailTrimmed,
        Username: emailTrimmed,
        Role: rawRole,
        CreationTime: new Date().toISOString(),
        assignedCourses: [],
      };
      setUsersList((prev) => [createdUser, ...prev]);

      showToast(
        response.data?.message || `Đã tạo tài khoản "${emailTrimmed}" (${newRole}) thành công!`,
        'success',
        t('admin_users.success')
      );
      handleCloseAddModal();
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Tạo tài khoản thất bại';
      showToast(errMsg, 'danger', 'Lỗi tạo người dùng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAssignModal = (student) => {
    setSelectedStudent(student);
    const assignedIds = student.assignedCourses || [];
    setTempAssignedCourses(assignedIds);
    setInitialAssignedCourses(assignedIds);
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedStudent(null);
    setTempAssignedCourses([]);
    setInitialAssignedCourses([]);
  };

  const handleToggleCourseCheckbox = (courseId) => {
    setTempAssignedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  // =========================================================================
  // GỌI API THẬT: PUT/DELETE /api/v1/course/{courseId}/entitlements/{userSub}
  // =========================================================================
  const handleSaveAssignedCourses = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const userSub = selectedStudent.ID || selectedStudent.Username;
    setSubmitting(true);

    try {
      // 1. Tìm các khóa học mới được chọn -> gọi API CẤP QUYỀN (PUT)
      const toGrant = tempAssignedCourses.filter((id) => !initialAssignedCourses.includes(id));
      for (const courseId of toGrant) {
        await axios.put(
          `${API_BASE_URL}/api/v1/course/${courseId}/entitlements/${userSub}`,
          {},
          { headers: getAuthHeader() }
        );
      }

      // 2. Tìm các khóa học bị bỏ chọn -> gọi API THU HỒI QUYỀN (DELETE)
      const toRevoke = initialAssignedCourses.filter((id) => !tempAssignedCourses.includes(id));
      for (const courseId of toRevoke) {
        await axios.delete(
          `${API_BASE_URL}/api/v1/course/${courseId}/entitlements/${userSub}`,
          { headers: getAuthHeader() }
        );
      }

      // Cập nhật lại state danh sách khóa học của học viên
      setUsersList((prev) =>
        prev.map((u) =>
          u.ID === selectedStudent.ID ? { ...u, assignedCourses: tempAssignedCourses } : u
        )
      );

      showToast(
        `Đã cập nhật quyền ${tempAssignedCourses.length} khóa học cho ${selectedStudent.Username}!`,
        'success',
        t('admin_users.grant_success')
      );
      handleCloseAssignModal();
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Cập nhật quyền thất bại';
      showToast(errMsg, 'danger', 'Lỗi cấp quyền');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Nút thêm người dùng */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản Lý Người Dùng</h1>
          <p className="text-gray-500 text-sm">Quản lý tài khoản và phân quyền khóa học của học viên</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition"
        >
          <UserPlus size={18} />
          <span>Thêm Người Dùng</span>
        </button>
      </div>

      {/* Bảng danh sách người dùng */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-3 text-left">Email / Username</th>
              <th className="px-6 py-3 text-left">Vai Trò</th>
              <th className="px-6 py-3 text-left">Ngày Tạo</th>
              <th className="px-6 py-3 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {usersList.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                  Chưa có người dùng nào. Nhấn "Thêm Người Dùng" để tạo tài khoản mới qua API.
                </td>
              </tr>
            ) : (
              usersList.map((user) => (
                <tr key={user.ID} className="hover:bg-gray-50/80">
                  <td className="px-6 py-4 font-medium text-gray-800">{user.Username}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        formatRole(user.Role) === 'Administrator'
                          ? 'bg-purple-100 text-purple-800'
                          : formatRole(user.Role) === 'Instructor'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {formatRole(user.Role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(user.CreationTime).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatRole(user.Role) === 'Student' && (
                      <button
                        onClick={() => handleOpenAssignModal(user)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition"
                      >
                        <GraduationCap size={15} />
                        <span>Cấp Quyền Khóa Học</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: Tạo Người Dùng */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Tạo Tài Khoản Mới</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Student">Student (Học viên)</option>
                  <option value="Instructor">Instructor (Giảng viên)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Đang tạo...' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Cấp Quyền Khóa Học */}
      {showAssignModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Cấp Quyền Cho: <span className="text-indigo-600">{selectedStudent.Username}</span>
            </h3>
            <p className="text-sm text-gray-500">Tích chọn các khóa học mà học viên được phép vào học:</p>
            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg p-2">
              {availableCourses.map((course) => (
                <label key={course.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempAssignedCourses.includes(course.id)}
                    onChange={() => handleToggleCourseCheckbox(course.id)}
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <div className="flex-1 text-sm font-medium text-gray-800">{course.name}</div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloseAssignModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveAssignedCourses}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Đang lưu...' : 'Lưu Quyền Hạn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
