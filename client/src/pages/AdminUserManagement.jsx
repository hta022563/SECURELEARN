import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Trash2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { getCourses } from '../services/courseService';
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUserPassword,
  deleteAdminUser,
} from '../services/adminService';
import {
  grantCourseEntitlement,
  revokeCourseEntitlement,
} from '../services/entitlementService';

export default function AdminUserManagement() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  // State danh sách người dùng & khóa học
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [realCourses, setRealCourses] = useState([]);

  // State bộ lọc & tìm kiếm
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // State Modal 1: Tạo Người Dùng Mới
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Student');
  const [submitting, setSubmitting] = useState(false);

  // State Modal 2: Cấp Quyền Khóa Học (Entitlements)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [tempAssignedCourses, setTempAssignedCourses] = useState([]);
  const [initialAssignedCourses, setInitialAssignedCourses] = useState([]);

  // State Modal 3: Đổi Mật Khẩu (Admin Reset Password)
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [userForPassword, setUserForPassword] = useState(null);
  const [updatedPassword, setUpdatedPassword] = useState('');

  // State Modal 4: Xóa Tài Khoản (Admin Delete User)
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userForDelete, setUserForDelete] = useState(null);

  // 1. Tải danh sách người dùng thật từ AWS Cognito qua AdminController
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await getAdminUsers({ limit: 60 });
      setUsersList(data.users || []);
    } catch (err) {
      console.warn('[AdminUserManagement] Lỗi tải danh sách người dùng:', err);
      showToast(
        err.response?.data?.error || err.message || 'Không thể tải danh sách người dùng từ hệ thống.',
        'warning',
        'Cảnh báo'
      );
    } finally {
      setLoadingUsers(false);
    }
  }, [showToast]);

  // 2. Tải danh sách khóa học để cấp quyền
  useEffect(() => {
    fetchUsers();
    getCourses()
      .then((data) => {
        if (Array.isArray(data)) setRealCourses(data);
      })
      .catch((err) => console.warn('[AdminUserManagement] Lỗi nạp khóa học:', err));
  }, [fetchUsers]);

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

  // Danh sách người dùng sau khi lọc
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchSearch =
        !searchTerm.trim() ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
        (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
        (u.fullName && u.fullName.toLowerCase().includes(searchTerm.toLowerCase().trim()));

      const matchRole =
        roleFilter === 'ALL' ||
        formatRole(u.role).toLowerCase() === roleFilter.toLowerCase();

      return matchSearch && matchRole;
    });
  }, [usersList, searchTerm, roleFilter]);

  // =========================================================================
  // XỬ LÝ 1: TẠO NGƯỜI DÙNG MỚI (POST /api/v1/admin/register)
  // =========================================================================
  const handleOpenAddModal = () => {
    setNewFullName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('Student');
    setShowAddModal(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!newEmail.trim() || !newPassword) {
      showToast('Vui lòng nhập đầy đủ Email và Mật khẩu.', 'warning', 'Thiếu thông tin');
      return;
    }

    if (newPassword.length < 8) {
      showToast('Mật khẩu phải có tối thiểu 8 ký tự.', 'warning', 'Mật khẩu yếu');
      return;
    }

    const emailTrimmed = newEmail.trim().toLowerCase();
    setSubmitting(true);

    try {
      const res = await createAdminUser({
        fullName: newFullName.trim() || emailTrimmed.split('@')[0],
        email: emailTrimmed,
        password: newPassword,
        role: newRole,
      });

      showToast(
        res?.message || `Đã tạo tài khoản "${emailTrimmed}" (${newRole}) thành công!`,
        'success',
        'Thành công'
      );
      setShowAddModal(false);
      await fetchUsers();
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Tạo tài khoản thất bại';
      showToast(errMsg, 'danger', 'Lỗi tạo người dùng');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // XỬ LÝ 2: ĐỔI MẬT KHẨU (POST /api/v1/admin/update)
  // =========================================================================
  const handleOpenPasswordModal = (user) => {
    setUserForPassword(user);
    setUpdatedPassword('');
    setShowPasswordModal(true);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!userForPassword) return;

    if (!updatedPassword || updatedPassword.length < 8) {
      showToast('Mật khẩu mới phải có ít nhất 8 ký tự.', 'warning', 'Mật khẩu không hợp lệ');
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateAdminUserPassword({
        email: userForPassword.email || userForPassword.username,
        password: updatedPassword,
      });

      showToast(
        res?.message || `Đã cập nhật mật khẩu mới cho ${userForPassword.email}!`,
        'success',
        'Đổi mật khẩu thành công'
      );
      setShowPasswordModal(false);
      setUserForPassword(null);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Cập nhật mật khẩu thất bại';
      showToast(errMsg, 'danger', 'Lỗi đổi mật khẩu');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // XỬ LÝ 3: XÓA NGƯỜI DÙNG (DELETE /api/v1/admin/delete)
  // =========================================================================
  const handleOpenDeleteModal = (user) => {
    setUserForDelete(user);
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userForDelete) return;

    setSubmitting(true);
    try {
      const email = userForDelete.email || userForDelete.username;
      const res = await deleteAdminUser(email);

      showToast(
        res?.message || `Đã xóa tài khoản "${email}" khỏi hệ thống!`,
        'success',
        'Xóa tài khoản thành công'
      );
      setShowDeleteModal(false);
      setUserForDelete(null);
      await fetchUsers();
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Xóa người dùng thất bại';
      showToast(errMsg, 'danger', 'Lỗi xóa tài khoản');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // XỬ LÝ 4: CẤP QUYỀN KHÓA HỌC (PUT / DELETE /api/v1/course/.../entitlements)
  // =========================================================================
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

  const handleSaveAssignedCourses = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const userSub = selectedStudent.sub || selectedStudent.id || selectedStudent.username;
    setSubmitting(true);

    try {
      // 1. Cấp quyền các khóa học mới
      const toGrant = tempAssignedCourses.filter((id) => !initialAssignedCourses.includes(id));
      for (const courseId of toGrant) {
        await grantCourseEntitlement(courseId, userSub);
      }

      // 2. Thu hồi quyền các khóa học bị bỏ chọn
      const toRevoke = initialAssignedCourses.filter((id) => !tempAssignedCourses.includes(id));
      for (const courseId of toRevoke) {
        await revokeCourseEntitlement(courseId, userSub);
      }

      // Cập nhật lại state danh sách khóa học của học viên
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === selectedStudent.id ? { ...u, assignedCourses: tempAssignedCourses } : u
        )
      );

      showToast(
        `Đã cập nhật quyền ${tempAssignedCourses.length} khóa học cho ${selectedStudent.username}!`,
        'success',
        'Cấp quyền thành công'
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
      {/* Header & Công cụ tìm kiếm / Thêm mới */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Quản Lý Người Dùng
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Quản trị danh sách tài khoản AWS Cognito, đặt lại mật khẩu và phân quyền khóa học
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            disabled={loadingUsers}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition disabled:opacity-50"
            title="Làm mới danh sách từ AWS Cognito"
          >
            <RefreshCw size={16} className={loadingUsers ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Làm Mới</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition"
          >
            <UserPlus size={18} />
            <span>Thêm Người Dùng</span>
          </button>
        </div>
      </div>

      {/* Thanh công cụ tìm kiếm và lọc vai trò */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-850 p-4 rounded-xl shadow-xs border border-gray-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo email, tên đăng nhập hoặc họ tên..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-transparent focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Vai trò:</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value="Student">Student (Học viên)</option>
            <option value="Instructor">Instructor (Giảng viên)</option>
            <option value="Administrator">Administrator (Quản trị viên)</option>
          </select>
        </div>
      </div>

      {/* Bảng danh sách người dùng */}
      <div className="bg-white dark:bg-slate-850 rounded-xl shadow-xs border border-gray-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-900/60 text-gray-600 dark:text-gray-400 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3.5 text-left">Email / Người dùng</th>
                <th className="px-6 py-3.5 text-left">Vai Trò</th>
                <th className="px-6 py-3.5 text-left">Trạng Thái</th>
                <th className="px-6 py-3.5 text-left">Ngày Tạo</th>
                <th className="px-6 py-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-sm">
              {loadingUsers ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                      <span>Đang nạp danh sách người dùng từ AWS Cognito...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-10 w-10 text-gray-300" />
                      <p className="font-medium text-gray-600 dark:text-gray-300">Không tìm thấy người dùng nào</p>
                      <p className="text-xs text-gray-400">
                        {searchTerm ? 'Thử thay đổi từ khóa tìm kiếm' : 'Nhấn "Thêm Người Dùng" để tạo tài khoản mới qua API'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {user.email || user.username}
                        </div>
                        {user.fullName && user.fullName !== user.email && (
                          <div className="text-xs text-gray-400 mt-0.5">{user.fullName}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          formatRole(user.role) === 'Administrator'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            : formatRole(user.role) === 'Instructor'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          user.status === 'CONFIRMED'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.status === 'CONFIRMED' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        {user.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                      {user.creationTime
                        ? new Date(user.creationTime).toLocaleString('vi-VN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Nút Cấp quyền khóa học cho học viên */}
                        {formatRole(user.role) === 'Student' && (
                          <button
                            onClick={() => handleOpenAssignModal(user)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-md transition"
                            title="Cấp quyền truy cập bài giảng khóa học"
                          >
                            <GraduationCap size={14} />
                            <span className="hidden md:inline">Cấp Quyền</span>
                          </button>
                        )}

                        {/* Nút Đổi mật khẩu (Admin Update) */}
                        <button
                          onClick={() => handleOpenPasswordModal(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-md transition"
                          title="Đặt lại mật khẩu cho tài khoản này"
                        >
                          <Key size={14} />
                          <span className="hidden md:inline">Đổi MK</span>
                        </button>

                        {/* Nút Xóa tài khoản (Admin Delete) */}
                        <button
                          onClick={() => handleOpenDeleteModal(user)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-md transition"
                          title="Xóa tài khoản vĩnh viễn"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Tạo Người Dùng Mới (POST /api/v1/admin/register) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                <span>Tạo Tài Khoản Mới</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Họ và Tên
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-transparent rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email / Tên đăng nhập *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-transparent rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mật khẩu *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự (hoa, thường, số)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-transparent rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Mật khẩu phải thỏa mãn chính sách bảo mật của AWS Cognito.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vai trò hệ thống
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-transparent rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Student">Student (Học viên)</option>
                  <option value="Instructor">Instructor (Giảng viên)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 transition"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  <span>{submitting ? 'Đang tạo...' : 'Tạo Tài Khoản'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Đổi Mật Khẩu (POST /api/v1/admin/update) */}
      {showPasswordModal && userForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Key className="h-5 w-5 text-amber-500" />
                <span>Đặt Lại Mật Khẩu</span>
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                Bạn đang đặt lại mật khẩu cho tài khoản:{' '}
                <strong>{userForPassword.email || userForPassword.username}</strong>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mật khẩu mới *
                </label>
                <input
                  type="password"
                  required
                  value={updatedPassword}
                  onChange={(e) => setUpdatedPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 bg-transparent rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 transition"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  <span>{submitting ? 'Đang lưu...' : 'Cập Nhật Mật Khẩu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Xóa Người Dùng (DELETE /api/v1/admin/delete) */}
      {showDeleteModal && userForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 dark:bg-red-950/60 rounded-full">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Xác Nhận Xóa Tài Khoản</h3>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              Bạn có chắc chắn muốn xóa tài khoản{' '}
              <strong className="text-red-600">{userForDelete.email || userForDelete.username}</strong> khỏi
              hệ thống AWS Cognito không? Hành động này không thể hoàn tác.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteUser}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 transition"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                <span>{submitting ? 'Đang xóa...' : 'Xóa Tài Khoản'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Cấp Quyền Khóa Học (PUT/DELETE /api/v1/course/.../entitlements) */}
      {showAssignModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <span>
                  Cấp Quyền Cho: <span className="text-indigo-600">{selectedStudent.username}</span>
                </span>
              </h3>
              <button
                onClick={handleCloseAssignModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tích chọn các khóa học mà học viên được phép xem video bài giảng bảo mật HLS DRM:
            </p>

            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl p-2 space-y-1">
              {availableCourses.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">Không có khóa học nào trên hệ thống</div>
              ) : (
                availableCourses.map((course) => {
                  const isChecked = tempAssignedCourses.includes(course.id);
                  return (
                    <label
                      key={course.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition ${
                        isChecked
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-800/60 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCourseCheckbox(course.id)}
                        className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{course.name}</div>
                        <div className="text-[11px] text-gray-400">Mã: {course.code}</div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCloseAssignModal}
                className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveAssignedCourses}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm disabled:opacity-50 transition"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                <span>{submitting ? 'Đang lưu...' : 'Lưu Quyền Hạn'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
