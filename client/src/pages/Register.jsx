import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, User, Mail, Lock, ShieldCheck, GraduationCap, Briefcase, Loader2, LogIn } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Logo from '../components/Logo';
import { register as apiRegister } from '../services/authService';

export default function Register() {
  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Student'); // 'Student' | 'Instructor'

  // Validation Errors State
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  /**
   * Hàm kiểm tra tính hợp lệ của dữ liệu (Validation)
   */
  const validateForm = () => {
    const newErrors = {};

    // 1. Kiểm tra Họ và Tên
    if (!fullName.trim()) {
      newErrors.fullName = 'Họ và tên không được để trống.';
    }

    // 2. Bắt lỗi Email không đúng định dạng regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Địa chỉ email không đúng định dạng (Ví dụ: user@domain.com).';
    }

    // 3. Password phải lớn hơn 6 ký tự
    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (password.length <= 6) {
      newErrors.password = 'Mật khẩu phải có độ dài lớn hơn 6 ký tự.';
    }

    // 4. Confirm Password phải khớp với Password
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu xác nhận.';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp với mật khẩu đã nhập.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Xử lý Submit Form Đăng Ký
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRegister({
        fullName,
        email: email.trim().toLowerCase(),
        password,
        role: role.toLowerCase(),
      });

      showToast(
        `Chúc mừng ${fullName}! Tài khoản ${role} đã được tạo thành công. Vui lòng đăng nhập.`,
        'success',
        'Đăng Ký Thành Công'
      );

      navigate('/login');
    } catch (err) {
      showToast(
        err.message || 'Đăng ký thất bại. Vui lòng thử lại.',
        'danger',
        'Đăng Ký Thất Bại'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-all">
        {/* Header Card */}
        <div className="bg-slate-50/50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 text-center py-6 px-6">
          <div className="mb-3 flex justify-center">
            <Logo size="lg" showBadge={true} badgeText="JOIN PLATFORM" />
          </div>
          <h4 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">
            Đăng Ký Tài Khoản Mới
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tham gia nền tảng video học tập trực tuyến SecureLearn
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Họ và Tên */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Họ và Tên <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors({ ...errors, fullName: null });
                  }}
                  className={`w-full rounded-2xl border ${errors.fullName ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60'
                    } px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${errors.fullName ? 'focus:ring-rose-500/20 focus:border-rose-500' : 'focus:ring-blue-500/20 focus:border-blue-500'
                    } transition-all`}
                />
              </div>
              {errors.fullName && (
                <div className="flex items-center gap-1.5 text-rose-500 text-xs mt-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.fullName}</span>
                </div>
              )}
            </div>

            {/* Địa chỉ Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Địa chỉ Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
                className={`w-full rounded-2xl border ${errors.email ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60'
                  } px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${errors.email ? 'focus:ring-rose-500/20 focus:border-rose-500' : 'focus:ring-blue-500/20 focus:border-blue-500'
                  } transition-all`}
              />
              {errors.email && (
                <div className="flex items-center gap-1.5 text-rose-500 text-xs mt-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.email}</span>
                </div>
              )}
            </div>

            {/* Mật Khẩu (> 6 ký tự) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mật khẩu (&gt; 6 ký tự) <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                placeholder="Mật khẩu..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                className={`w-full rounded-2xl border ${errors.password ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60'
                  } px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${errors.password ? 'focus:ring-rose-500/20 focus:border-rose-500' : 'focus:ring-blue-500/20 focus:border-blue-500'
                  } transition-all`}
              />
              {errors.password && (
                <div className="flex items-center gap-1.5 text-rose-500 text-xs mt-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.password}</span>
                </div>
              )}
            </div>

            {/* Nhập Lại Mật Khẩu */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Xác nhận mật khẩu <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                placeholder="Nhập lại mật khẩu..."
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                }}
                className={`w-full rounded-2xl border ${errors.confirmPassword ? 'border-rose-500 bg-rose-50/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60'
                  } px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${errors.confirmPassword ? 'focus:ring-rose-500/20 focus:border-rose-500' : 'focus:ring-blue-500/20 focus:border-blue-500'
                  } transition-all`}
              />
              {errors.confirmPassword && (
                <div className="flex items-center gap-1.5 text-rose-500 text-xs mt-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.confirmPassword}</span>
                </div>
              )}
            </div>

            {/* Chọn Vai Trò (Role: Student / Instructor) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Vai trò tài khoản bạn muốn đăng ký:
              </span>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setRole('Student')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs transition-all ${role === 'Student'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                >
                  <GraduationCap className={`h-4 w-4 ${role === 'Student' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  <div>
                    <div>Học Viên</div>
                    <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">Student</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('Instructor')}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs transition-all ${role === 'Instructor'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                >
                  <Briefcase className={`h-4 w-4 ${role === 'Instructor' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  <div>
                    <div>Giảng Viên</div>
                    <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">Instructor</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Nút Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all mt-3 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang tạo tài khoản...</span>
                </>
              ) : (
                <span>Đăng Ký Ngay</span>
              )}
            </button>
          </form>

          {/* Chuyển hướng sang Login nếu đã có tài khoản */}
          <div className="text-center pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400 mr-1.5">Bạn đã có tài khoản?</span>
            <Link
              to="/login"
              className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline no-underline"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Đăng nhập tại đây</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
