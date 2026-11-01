import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  User,
  Mail,
  Lock,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  Loader2,
  LogIn,
  MailCheck,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Logo from '../components/Logo';
import OtpInput from '../components/OtpInput';
import {
  register as apiRegister,
  verifyRegisterOtp,
  resendOtp,
} from '../services/authService';

export default function Register() {
  const { lang } = useParams();
  const currentLang = lang || 'vi';

  // Step state: 'form' | 'otp'
  const [step, setStep] = useState('form');

  // Form State (Chỉ dành cho Học viên - Student; Giảng viên do Admin cấp)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP State
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [otpError, setOtpError] = useState(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Validation Errors State
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  // Countdown timer effect for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  /**
   * Kiểm tra tính hợp lệ của dữ liệu biểu mẫu đăng ký
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

    // 3. Password phải từ 8 ký tự trở lên (chuẩn AWS Cognito)
    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (password.length < 8) {
      newErrors.password = 'Mật khẩu phải có độ dài tối thiểu 8 ký tự theo chuẩn AWS Cognito.';
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
   * Xử lý Submit Form Đăng Ký (Gửi thông tin tài khoản lên Backend)
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await apiRegister({
        fullName,
        email: email.trim().toLowerCase(),
        password,
        role: 'student',
      });

      showToast(
        `Mã OTP xác thực đã được gửi tới ${email}. Vui lòng kiểm tra email của bạn.`,
        'success',
        'Xác Thực Email'
      );

      // Chuyển sang bước nhập OTP
      setStep('otp');
      setOtp('');
      setOtpError(null);
      setCountdown(60);
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

  /**
   * Xử lý Xác Nhận OTP đăng ký
   */
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError(null);

    if (!otp || otp.length < 6) {
      setOtpError('Vui lòng nhập đủ 6 chữ số mã OTP xác thực.');
      return;
    }

    setIsVerifyingOtp(true);

    try {
      await verifyRegisterOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });

      showToast(
        `Chúc mừng ${fullName}! Tài khoản của bạn đã được kích hoạt thành công. Vui lòng đăng nhập.`,
        'success',
        'Kích Hoạt Thành Công'
      );

      navigate(`/${currentLang}/login`, { replace: true });
    } catch (err) {
      setOtpError(
        err.message || 'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại.'
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  /**
   * Xử lý Gửi lại mã OTP
   */
  const handleResendOtp = async () => {
    if (countdown > 0 || isVerifyingOtp) return;
    setOtpError(null);
    setIsVerifyingOtp(true);

    try {
      await resendOtp({ email: email.trim().toLowerCase() });
      showToast('Mã OTP mới đã được gửi lại vào email của bạn.', 'info', 'Đã Gửi Lại Mã');
      setCountdown(60);
    } catch (err) {
      setOtpError(err.message || 'Gửi lại mã OTP thất bại.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 border border-slate-200/80 dark:border-slate-800 overflow-hidden transition-all">
        {/* Header Card */}
        <div className="bg-slate-50/50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800 text-center py-6 px-6">
          <div className="mb-3 flex justify-center">
            <Logo
              size="lg"
              showBadge={true}
              badgeText={step === 'form' ? 'JOIN PLATFORM' : 'VERIFY EMAIL'}
            />
          </div>
          <h4 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">
            {step === 'form' ? 'Đăng Ký Tài Khoản Mới' : 'Xác Thực Tài Khoản (OTP)'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {step === 'form'
              ? 'Tham gia nền tảng video học tập trực tuyến SecureLearn'
              : 'Nhập mã 6 chữ số đã được gửi đến email của bạn'}
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {/* ==============================================================
           * BƯỚC 1: BIỂU MẪU ĐĂNG KÝ
           * ============================================================== */}
          {step === 'form' && (
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
                    className={`w-full rounded-2xl border ${errors.fullName
                      ? 'border-rose-500 bg-rose-50/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60'
                      } px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${errors.fullName
                        ? 'focus:ring-rose-500/20 focus:border-rose-500'
                        : 'focus:ring-blue-500/20 focus:border-blue-500'
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
                  className={`w-full rounded-2xl border ${errors.email
                    ? 'border-rose-500 bg-rose-50/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60'
                    } px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${errors.email
                      ? 'focus:ring-rose-500/20 focus:border-rose-500'
                      : 'focus:ring-blue-500/20 focus:border-blue-500'
                    } transition-all`}
                />
                {errors.email && (
                  <div className="flex items-center gap-1.5 text-rose-500 text-xs mt-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>

              {/* Mật Khẩu (>= 8 ký tự) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mật khẩu (tối thiểu 8 ký tự) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Mật khẩu..."
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: null });
                  }}
                  className={`w-full rounded-2xl border ${errors.password
                    ? 'border-rose-500 bg-rose-50/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60'
                    } px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${errors.password
                      ? 'focus:ring-rose-500/20 focus:border-rose-500'
                      : 'focus:ring-blue-500/20 focus:border-blue-500'
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
                    if (errors.confirmPassword)
                      setErrors({ ...errors, confirmPassword: null });
                  }}
                  className={`w-full rounded-2xl border ${errors.confirmPassword
                    ? 'border-rose-500 bg-rose-50/20'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60'
                    } px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${errors.confirmPassword
                      ? 'focus:ring-rose-500/20 focus:border-rose-500'
                      : 'focus:ring-blue-500/20 focus:border-blue-500'
                    } transition-all`}
                />
                {errors.confirmPassword && (
                  <div className="flex items-center gap-1.5 text-rose-500 text-xs mt-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{errors.confirmPassword}</span>
                  </div>
                )}
              </div>

              {/* Thông tin Vai Trò (Chỉ Học Viên tự đăng ký; Giảng Viên do Admin tạo) */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs mt-0.5">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Đăng ký tài khoản Học Viên (Student)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Cổng đăng ký trực tuyến chỉ dành cho Học viên </p>
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
                    <span>Đang gửi thông tin đăng ký...</span>
                  </>
                ) : (
                  <span>Tiếp Tục & Nhận Mã OTP</span>
                )}
              </button>
            </form>
          )}

          {/* ==============================================================
           * BƯỚC 2: XÁC THỰC MÃ OTP
           * ============================================================== */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in duration-200">
              {/* Thông tin người nhận email */}
              <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                  <MailCheck className="h-5 w-5" />
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="text-slate-500 dark:text-slate-400">
                    Mã xác thực đã được gửi đến:
                  </div>
                  <div className="font-bold text-blue-700 dark:text-blue-300 break-all">
                    {email}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    Vui lòng kiểm tra hộp thư đến hoặc mục thư rác (Spam).
                  </div>
                </div>
              </div>

              {/* Thông báo lỗi OTP */}
              {otpError && (
                <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <div className="flex-1">{otpError}</div>
                </div>
              )}

              {/* Ô nhập OTP 6 số */}
              <div className="py-2">
                <label className="block text-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
                  Nhập mã OTP 6 chữ số <span className="text-rose-500">*</span>
                </label>
                <OtpInput
                  length={6}
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (otpError) setOtpError(null);
                  }}
                  disabled={isVerifyingOtp}
                  autoFocus={true}
                />
              </div>

              {/* Resend & Quay lại */}
              <div className="flex items-center justify-between text-xs px-1">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Sửa thông tin</span>
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || isVerifyingOtp}
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 disabled:text-slate-400 disabled:cursor-not-allowed hover:underline cursor-pointer"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${countdown > 0 ? '' : 'text-blue-600 dark:text-blue-400'}`} />
                  <span>
                    {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã OTP'}
                  </span>
                </button>
              </div>

              {/* Nút Kích Hoạt */}
              <button
                type="submit"
                disabled={isVerifyingOtp || otp.length < 6}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all mt-2 cursor-pointer"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Đang xác thực OTP...</span>
                  </>
                ) : (
                  <span>Kích Hoạt Tài Khoản</span>
                )}
              </button>
            </form>
          )}

          {/* Chuyển hướng sang Login nếu đã có tài khoản */}
          <div className="text-center pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400 mr-1.5">
              Bạn đã có tài khoản?
            </span>
            <Link
              to={`/${currentLang}/login`}
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
