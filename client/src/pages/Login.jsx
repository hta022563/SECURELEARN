import React, { useState } from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, AlertCircle, Zap, UserPlus, Grid, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { users } from '../data/mockDatabase';
import Logo from '../components/Logo';
import { COGNITO_LOGIN_URL } from '../services/courseService';
import { login as apiLogin, me as apiMe, mapCognitoRoleToDisplayRole, ROLE_REDIRECT } from '../services/authService';

// Map Role trong mockDb → Role trong RBAC routing (used for demo fallback)
const ROLE_MAP = {
  admin: 'Administrator',
  instructor: 'Instructor',
  student: 'Student',
};

/**
 * Tài khoản demo để điền nhanh — lấy thẳng từ mockDb.users
 */
const DEMO_ACCOUNTS = [
  { label: 'Admin', user: users.find(u => u.Role === 'admin') },
  { label: 'Instructor', user: users.find(u => u.Role === 'instructor') },
  { label: 'Student', user: users.find(u => u.Role === 'student') },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useParams();
  const { t } = useTranslation();
  const currentLang = lang || 'vi';

  /** Điền nhanh tài khoản demo */
  const handleSelectDemo = (acc) => {
    if (!acc.user) return;
    setEmail(acc.user.Username);
    setPassword('password123');
    setErrorMessage(null);
  };

  /** Submit: call real backend, fall back to mock only for demo accounts */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMessage(t('login.login_failed'));
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Authenticate with Cognito via backend
      const tokens = await apiLogin({ email: cleanEmail, password });

      // 2. Fetch the user's profile / role from the JWT claims
      const tempUser = { token: tokens.accessToken };
      sessionStorage.setItem('securelearn_auth_user', JSON.stringify(tempUser));

      const profile = await apiMe();

      // 3. Build the userData shape AuthContext + axiosClient expect
      const displayRole = mapCognitoRoleToDisplayRole(profile.roles || []);
      const userData = {
        userId: profile.sub,
        name: profile.name || cleanEmail.split('@')[0],
        email: profile.email || cleanEmail,
        role: displayRole,
        token: tokens.accessToken,
        idToken: tokens.idToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };

      login(userData);

      const targetPath = ROLE_REDIRECT[displayRole] || '/home';
      const from = location.state?.from?.pathname || targetPath;
      const finalPath = from.startsWith(`/${currentLang}`) ? from : `/${currentLang}${from}`;
      navigate(finalPath, { replace: true });

    } catch (err) {
      // If the backend is unreachable, fall back to mock demo accounts
      const found = users.find((u) => u.Username.toLowerCase() === cleanEmail);
      if (found) {
        const rbacRole = { admin: 'Administrator', instructor: 'Instructor', student: 'Student' }[found.Role] || 'Student';
        const userData = {
          userId: found.ID,
          name: found.Username.split('@')[0],
          email: found.Username,
          role: rbacRole,
          token: `mock_jwt_${found.Role}_${found.ID}_${Date.now()}`,
        };
        login(userData);
        const targetPath = ROLE_REDIRECT[rbacRole] || '/home';
        const from = location.state?.from?.pathname || targetPath;
        const finalPath = from.startsWith(`/${currentLang}`) ? from : `/${currentLang}${from}`;
        navigate(finalPath, { replace: true });
      } else {
        setErrorMessage(err.message || t('login.login_failed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-all">
        {/* Card Header */}
        <div className="bg-slate-50/50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 text-center py-6 px-6">
          <div className="mb-3 flex justify-center">
            <Logo size="lg" showBadge={true} badgeText="E-LEARNING" />
          </div>
          <h4 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">
            {t('login.title')}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('login.subtitle')}
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {/* Thông báo lỗi */}
          {errorMessage && (
            <div className="flex items-start justify-between gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-rose-600 p-0.5 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Đăng nhập nhanh bằng AWS Cognito (Hosted UI - OAuth2) */}
          <div>
            <a
              href={COGNITO_LOGIN_URL}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-xs transition-all no-underline"
            >
              <Shield className="h-4 w-4 text-amber-500" />
              <span>Đăng nhập với AWS Cognito (Hosted UI)</span>
            </a>
          </div>

          <div className="relative my-4 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">
                hoặc đăng nhập tài khoản
              </span>
            </div>
          </div>

          {/* Form Đăng Nhập */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('login.email_label')}
              </label>
              <input
                type="email"
                placeholder={t('login.email_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('login.password_label')}
              </label>
              <input
                type="password"
                placeholder={t('login.password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all mt-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{t('login.login_button')}</span>
              )}
            </button>
          </form>

          {/* Khu vực Đăng nhập Nhanh Demo */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-slate-500 dark:text-slate-400 text-xs font-medium mb-3">
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span>{t('login.demo_accounts')}</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {DEMO_ACCOUNTS.map((acc, index) => (
                <button
                  key={index}
                  type="button"
                  className="rounded-full border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                  onClick={() => handleSelectDemo(acc)}
                >
                  {acc.label}
                </button>
              ))}
            </div>

            {/* Links điều hướng sang Đăng ký & Catalog */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <Link
                to={`/${currentLang}/register`}
                className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 hover:underline no-underline"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{t('login.no_account')}</span>
              </Link>
              <Link
                to={`/${currentLang}/catalog`}
                className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 no-underline"
              >
                <Grid className="h-3.5 w-3.5" />
                <span>{t('login.explore_catalog')}</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-850/80 border-t border-slate-100 dark:border-slate-800 py-3 px-6 text-center">
          <small className="text-[11px] text-slate-400 dark:text-slate-500">
            Hệ thống bảo vệ phân quyền Role-Based Access Control (RBAC)
          </small>
        </div>
      </div>
    </div>
  );
}
