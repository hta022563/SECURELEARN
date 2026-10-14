import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import {
  users as dbUsers,
  entitlements as dbEntitlements,
  courses as dbCourses,
} from '../data/mockDatabase';
import { getCourses } from '../services/courseService';

/**
 * =============================================================================
 * PAGE: AdminUserManagement (Pure Tailwind CSS & Lucide Icons)
 * =============================================================================
 */
export default function AdminUserManagement() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [usersList, setUsersList] = useState(dbUsers);
  const [entitlementsList, setEntitlementsList] = useState(dbEntitlements);
  const [realCourses, setRealCourses] = useState([]);

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

  // State Modal 2: Cấp Quyền Khóa Học (Assign Course)
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [tempAssignedCourses, setTempAssignedCourses] = useState([]);

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

  const handleCreateUser = (e) => {
    e.preventDefault();

    if (!newEmail.trim() || !newPassword) {
      showToast(t('admin_users.missing_email_password'), 'warning', t('admin_users.missing_info'));
      return;
    }

    const emailTrimmed = newEmail.trim().toLowerCase();

    if (dbUsers.some((u) => u.Username.toLowerCase() === emailTrimmed)) {
      showToast(t('admin_users.username_exists'), 'danger', t('admin_users.duplicate'));
      return;
    }

    const nextNumber = dbUsers.length + 1;
    const newUserId = `u-${String(nextNumber).padStart(3, '0')}`;
    const rawRole =
      newRole === 'Administrator' ? 'admin' : newRole === 'Instructor' ? 'instructor' : 'student';

    const newUser = {
      ID: newUserId,
      Username: emailTrimmed,
      Password: `hashed_${newPassword}`,
      Role: rawRole,
      CreationTime: new Date().toISOString(),
    };

    dbUsers.push(newUser);
    setUsersList([...dbUsers]);

    if (rawRole === 'student' && dbCourses.length > 0) {
      const defaultEntitlement = {
        UserID: newUserId,
        CoursesID: dbCourses[0].ID,
        Status: 'active',
        'Join Date': new Date().toISOString(),
        'Completion Date': null,
      };
      dbEntitlements.push(defaultEntitlement);
      setEntitlementsList([...dbEntitlements]);
    }

    showToast(
      `${t('admin_users.created_account')} "${emailTrimmed}" (${newRole}) ${t(
        'admin_users.success_suffix'
      )}`,
      'success',
      t('admin_users.success')
    );
    handleCloseAddModal();
  };

  const handleOpenAssignModal = (student) => {
    setSelectedStudent(student);
    const assignedIds = entitlementsList
      .filter((e) => e.UserID === student.ID && (e.Status === 'active' || e.Status === 'completed'))
      .map((e) => e.CoursesID);
    setTempAssignedCourses(assignedIds);
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedStudent(null);
    setTempAssignedCourses([]);
  };

  const handleToggleCourseCheckbox = (courseId) => {
    setTempAssignedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSaveAssignedCourses = (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const studentId = selectedStudent.ID;

    dbCourses.forEach((c) => {
      const isSelected = tempAssignedCourses.includes(c.ID);
      const existingIdx = dbEntitlements.findIndex(
        (e) => e.UserID === studentId && e.CoursesID === c.ID
      );

      if (isSelected) {
        if (existingIdx !== -1) {
          dbEntitlements[existingIdx].Status = 'active';
        } else {
          dbEntitlements.push({
            UserID: studentId,
            CoursesID: c.ID,
            Status: 'active',
            'Join Date': new Date().toISOString(),
            'Completion Date': null,
          });
        }
      } else {
        if (existingIdx !== -1) {
          dbEntitlements[existingIdx].Status = 'expired';
        }
      }
    });

    setEntitlementsList([...dbEntitlements]);

    showToast(
      `${t('admin_users.updated_entitlements')} ${tempAssignedCourses.length} ${t(
        'admin_users.courses_for_student'
      )} ${selectedStudent.Username}!`,
      'success',
      t('admin_users.grant_success')
    );
    handleCloseAssignModal();
  };

  const renderRoleBadge = (role) => {
    const r = formatRole(role);
    switch (r) {
      case 'Administrator':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60">
            <ShieldAlert className="h-3 w-3" />
            <span>Admin</span>
          </span>
        );
      case 'Instructor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60">
            <Briefcase className="h-3 w-3" />
            <span>Instructor</span>
          </span>
        );
      case 'Student':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60">
            <GraduationCap className="h-3 w-3" />
            <span>Student</span>
          </span>
        );
    }
  };

  const totalUsers = usersList.length;
  const studentCount = usersList.filter((u) => formatRole(u.Role) === 'Student').length;
  const instructorCount = usersList.filter((u) => formatRole(u.Role) === 'Instructor').length;
  const adminCount = usersList.filter((u) => formatRole(u.Role) === 'Administrator').length;

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Banner & Nút Add New User */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2">
            <Users className="h-3.5 w-3.5" />
            <span>{t('admin_users.user_management_erd')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
            {t('admin_users.user_management_title')}{' '}
            <span className="text-blue-600 dark:text-blue-400">
              {t('admin_users.user_entitlement')}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t('admin_users.sync_desc')}
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>{t('admin_users.add_user')}</span>
          </button>
        </div>
      </div>

      {/* Thống kê tài khoản */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-400 mb-1">{t('admin_users.total_accounts')}</div>
          <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-0">
            {totalUsers}
          </h4>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">
            {t('admin_users.students')}
          </div>
          <h4 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mb-0">
            {studentCount}
          </h4>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold mb-1">
            {t('admin_users.instructors')}
          </div>
          <h4 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mb-0">
            {instructorCount}
          </h4>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold mb-1">
            {t('admin_users.admins')}
          </div>
          <h4 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mb-0">
            {adminCount}
          </h4>
        </div>
      </div>

      {/* Bảng Danh Sách Người Dùng */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-850">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-0">
            {t('admin_users.system_user_list')}
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900">
            ERD Table: users &amp; entitlements
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-5">User ID</th>
                <th className="py-3 px-5">Username / Email</th>
                <th className="py-3 px-5">Role</th>
                <th className="py-3 px-5">{t('admin_users.creation_date')}</th>
                <th className="py-3 px-5">{t('admin_users.entitled_courses')}</th>
                <th className="py-3 px-5 text-center">{t('admin_users.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usersList.map((item) => {
                const roleFormatted = formatRole(item.Role);
                const isStudent = roleFormatted === 'Student';
                const activeEntitlements = entitlementsList.filter(
                  (e) => e.UserID === item.ID && (e.Status === 'active' || e.Status === 'completed')
                );

                return (
                  <tr key={item.ID} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-slate-500">
                      <code>{item.ID}</code>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">
                      {item.Username}
                    </td>
                    <td className="py-3.5 px-5">{renderRoleBadge(item.Role)}</td>
                    <td className="py-3.5 px-5 text-slate-400">
                      {item.CreationTime ? item.CreationTime.split('T')[0] : '—'}
                    </td>
                    <td className="py-3.5 px-5">
                      {isStudent ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                            {activeEntitlements.length} {t('admin_users.courses')}
                          </span>
                          {activeEntitlements.map((ent) => (
                            <span
                              key={ent.CoursesID}
                              className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                            >
                              {ent.CoursesID.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">
                          {t('admin_users.full_system_access')}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      {isStudent ? (
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(item)}
                          className="inline-flex items-center gap-1 rounded-full border border-blue-200 dark:border-blue-900 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all cursor-pointer"
                        >
                          <Key className="h-3 w-3" />
                          <span>{t('admin_users.grant_course_access')}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
          {t('admin_users.displaying')} <strong>{usersList.length}</strong>{' '}
          {t('admin_users.accounts_in_db')}
        </div>
      </div>

      {/* MODAL 1: TẠO NGƯỜI DÙNG MỚI */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <span>{t('admin_users.add_new_user')}</span>
              </h4>
              <button
                type="button"
                onClick={handleCloseAddModal}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('admin_users.email_username_required')}
                </label>
                <input
                  type="email"
                  placeholder="user@securelearn.edu.vn"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('admin_users.initial_password_required')}
                </label>
                <input
                  type="password"
                  placeholder={t('admin_users.password_placeholder')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('admin_users.role')}
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Student">{t('admin_users.role_student')}</option>
                  <option value="Instructor">{t('admin_users.role_instructor')}</option>
                  <option value="Administrator">{t('admin_users.role_admin')}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-1.5 text-xs font-semibold text-white shadow-xs"
                >
                  {t('admin_users.save_user')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CẤP QUYỀN KHÓA HỌC */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <span>{t('admin_users.grant_access_entitlement')}</span>
              </h4>
              <button
                type="button"
                onClick={handleCloseAssignModal}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignedCourses} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4">
                <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/60 rounded-2xl text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2.5">
                  <Info className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    {t('admin_users.granting_access_for')} <strong>{selectedStudent?.Username}</strong>{' '}
                    {t('admin_users.code_prefix')}
                    <code className="text-blue-600 font-mono">{selectedStudent?.ID}</code>).
                  </div>
                </div>

                <p className="font-bold text-xs text-slate-900 dark:text-white">
                  {t('admin_users.select_courses_desc')}
                </p>

                <div className="space-y-2">
                  {availableCourses.map((c) => {
                    const isChecked = tempAssignedCourses.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleToggleCourseCheckbox(c.id)}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {c.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {t('admin_users.course_code')} <code className="text-blue-600">{c.id}</code> •{' '}
                              {t('admin_users.tuition_fee')}{' '}
                              {c.price ? `${c.price.toLocaleString('vi-VN')} đ` : t('admin_users.free')}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold ${
                            isChecked
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isChecked ? t('admin_users.granted') : t('admin_users.not_granted')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseAssignModal}
                  className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-1.5 text-xs font-semibold text-white shadow-xs"
                >
                  {t('admin_users.save_access_rights')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
