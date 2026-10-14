import React, { useState } from 'react';
import { UserCircle, Edit3, Key, AlertCircle, Loader2, Shield, Mail, Hash, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';

export default function UserProfile() {
  const { user, login } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  // State Phần 1: Chỉnh sửa thông tin cá nhân (Edit Profile)
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // State Phần 2: Đổi mật khẩu (Change Password)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  /* =========================================================================
   * PHẦN 1: XỬ LÝ CẬP NHẬT THÔNG TIN CÁ NHÂN (USER INFO)
   * ========================================================================= */
  const handleSaveProfile = (e) => {
    e.preventDefault();

    if (!nameInput.trim()) {
      showToast(t('profile.name_empty_error'), 'warning');
      return;
    }

    setIsSavingInfo(true);

    setTimeout(() => {
      setIsSavingInfo(false);

      const updatedUser = {
        ...user,
        name: nameInput.trim(),
      };
      login(updatedUser);

      setIsEditingInfo(false);
      showToast(t('profile.name_updated_success'), 'success', t('profile.info_saved'));
    }, 400);
  };

  const handleCancelEdit = () => {
    setNameInput(user?.name || '');
    setIsEditingInfo(false);
  };

  /* =========================================================================
   * PHẦN 2: XỬ LÝ ĐỔI MẬT KHẨU (CHANGE PASSWORD)
   * ========================================================================= */
  const validatePasswordForm = () => {
    const errors = {};

    if (!currentPassword) {
      errors.currentPassword = t('profile.current_pwd_empty');
    }

    if (!newPassword) {
      errors.newPassword = t('profile.new_pwd_empty');
    } else if (newPassword.length <= 6) {
      errors.newPassword = t('profile.new_pwd_length');
    }

    if (!confirmPassword) {
      errors.confirmPassword = t('profile.confirm_pwd_empty');
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = t('profile.pwd_mismatch');
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = (e) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    setIsSavingPassword(true);

    setTimeout(() => {
      setIsSavingPassword(false);

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});

      showToast(t('profile.pwd_updated_success'), 'success', t('profile.change_pwd'));
    }, 500);
  };

  return (
    <div className="py-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="mb-8 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2">
          <UserCircle className="h-4 w-4" />
          <span>{t('profile.user_account')}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
          {t('profile.user_profile')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {t('profile.profile_desc')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* =========================================================================
         * PHẦN 1: USER INFO CARD
         * ========================================================================= */}
        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="bg-slate-50/60 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 py-4 px-6 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-0">
              {t('profile.account_info')}
            </h3>
            <span
              className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full ${
                user?.role === 'Administrator'
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                  : user?.role === 'Instructor'
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
              }`}
            >
              {user?.role || t('profile.user_default')}
            </span>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            {/* Avatar và Thông tin nhanh */}
            <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800 mb-6">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl sm:text-3xl shadow-md shrink-0 bg-gradient-to-tr from-blue-600 to-cyan-500"
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {user?.name || t('profile.name_not_updated')}
                </h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span>{user?.email}</span>
                </div>
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  <Hash className="h-3 w-3" />
                  <span>{user?.userId || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Form Xem / Sửa Họ Tên */}
            {!isEditingInfo ? (
              <div className="space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                      {t('profile.display_name')}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                      {user?.name}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                      {t('profile.linked_email')}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                      {user?.email}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">
                      {t('profile.system_role')}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">
                      {user?.role}
                    </span>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>{t('profile.edit_profile')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('profile.full_name_req')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('profile.enter_full_name')}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1.5">
                    {t('profile.email_readonly')}
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSavingInfo}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
                  >
                    {isSavingInfo ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{t('profile.saving')}</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>{t('profile.save_changes')}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSavingInfo}
                    className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-all cursor-pointer"
                  >
                    {t('profile.cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* =========================================================================
         * PHẦN 2: CHANGE PASSWORD CARD
         * ========================================================================= */}
        <div className="flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="bg-slate-50/60 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 py-4 px-6 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-0">
              {t('profile.change_pwd')}
            </h3>
            <Key className="h-4 w-4 text-slate-400" />
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              {t('profile.pwd_desc')}
            </p>

            <form onSubmit={handleChangePassword} noValidate className="space-y-4">
              {/* Mật Khẩu Hiện Tại */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('profile.current_pwd_req')}
                </label>
                <input
                  type="password"
                  placeholder={t('profile.current_pwd_placeholder')}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (passwordErrors.currentPassword) {
                      setPasswordErrors({ ...passwordErrors, currentPassword: null });
                    }
                  }}
                  className={`w-full rounded-2xl border ${
                    passwordErrors.currentPassword ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60'
                  } px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    passwordErrors.currentPassword ? 'focus:ring-rose-500/20 focus:border-rose-500' : 'focus:ring-blue-500/20 focus:border-blue-500'
                  } transition-all`}
                />
                {passwordErrors.currentPassword && (
                  <div className="flex items-center gap-1.5 text-rose-500 text-xs mt-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{passwordErrors.currentPassword}</span>
                  </div>
                )}
              </div>

              {/* Mật Khẩu Mới (> 6 ký tự) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('profile.new_pwd_req')}
                </label>
                <input
                  type="password"
                  placeholder={t('profile.new_pwd_placeholder')}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordErrors.newPassword) {
                      setPasswordErrors({ ...passwordErrors, newPassword: null });
                    }
                  }}
                  className={`w-full rounded-2xl border ${
                    passwordErrors.newPassword ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60'
                  } px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    passwordErrors.newPassword ? 'focus:ring-rose-500/20 focus:border-rose-500' : 'focus:ring-blue-500/20 focus:border-blue-500'
                  } transition-all`}
                />
                {passwordErrors.newPassword && (
                  <div className="flex items-center gap-1.5 text-rose-500 text-xs mt-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{passwordErrors.newPassword}</span>
                  </div>
                )}
              </div>

              {/* Xác Nhận Mật Khẩu Mới */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('profile.confirm_pwd_req')}
                </label>
                <input
                  type="password"
                  placeholder={t('profile.confirm_pwd_placeholder')}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordErrors.confirmPassword) {
                      setPasswordErrors({ ...passwordErrors, confirmPassword: null });
                    }
                  }}
                  className={`w-full rounded-2xl border ${
                    passwordErrors.confirmPassword ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60'
                  } px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    passwordErrors.confirmPassword ? 'focus:ring-rose-500/20 focus:border-rose-500' : 'focus:ring-blue-500/20 focus:border-blue-500'
                  } transition-all`}
                />
                {passwordErrors.confirmPassword && (
                  <div className="flex items-center gap-1.5 text-rose-500 text-xs mt-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{passwordErrors.confirmPassword}</span>
                  </div>
                )}
              </div>

              {/* Nút Submit Đổi Mật Khẩu */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                >
                  {isSavingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('profile.saving_pwd')}</span>
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" />
                      <span>{t('profile.update_pwd')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
