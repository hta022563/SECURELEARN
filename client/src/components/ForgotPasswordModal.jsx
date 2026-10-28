import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  KeyRound,
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import OtpInput from './OtpInput';
import { forgotPassword, resetPassword } from '../services/authService';
import { useToast } from '../context/ToastContext';

export default function ForgotPasswordModal({
  show,
  onHide,
  initialEmail = '',
  onSuccess,
}) {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password, 3: Completed
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [countdown, setCountdown] = useState(0);

  const { showToast } = useToast();

  // Reset state when modal is opened / closed
  useEffect(() => {
    if (show) {
      setEmail(initialEmail || '');
      setOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setStep(1);
      setErrorMessage(null);
      setCountdown(0);
    }
  }, [show, initialEmail]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (!show) return null;

  // Step 1: Send OTP to Email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword({ email: cleanEmail });
      showToast(
        `Mã OTP xác thực đã được gửi tới ${cleanEmail}. Vui lòng kiểm tra email.`,
        'success',
        'Đã Gửi Mã OTP'
      );
      setStep(2);
      setCountdown(60);
    } catch (err) {
      setErrorMessage(
        err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await forgotPassword({ email: email.trim().toLowerCase() });
      showToast('Mã OTP mới đã được gửi lại vào email của bạn.', 'info', 'Đã Gửi Lại Mã');
      setCountdown(60);
    } catch (err) {
      setErrorMessage(err.message || 'Gửi lại mã OTP thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Submit OTP & Reset Password
  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!otp || otp.length < 6) {
      setErrorMessage('Vui lòng nhập đầy đủ 6 chữ số mã OTP xác thực.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setErrorMessage('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });

      showToast(
        'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.',
        'success',
        'Thành Công'
      );
      setStep(3);
      if (typeof onSuccess === 'function') {
        onSuccess(email.trim().toLowerCase());
      }
    } catch (err) {
      setErrorMessage(
        err.message || 'Mã OTP không đúng hoặc đã hết hạn. Vui lòng kiểm tra lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Quên Mật Khẩu
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {step === 1 && 'Bước 1: Nhập email tài khoản'}
                {step === 2 && 'Bước 2: Nhập OTP & Đặt mật khẩu mới'}
                {step === 3 && 'Hoàn tất đặt lại mật khẩu'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onHide}
            disabled={isSubmitting}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Thông báo lỗi */}
        {errorMessage && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* STEP 1: Nhập Email để gửi OTP */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="mt-4 space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Nhập địa chỉ email liên kết với tài khoản của bạn. Hệ thống sẽ gửi mã xác thực OTP gồm 6 chữ số để đặt lại mật khẩu.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Địa chỉ Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all mt-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang gửi mã OTP...</span>
                </>
              ) : (
                <span>Gửi Mã Xác Thực OTP</span>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Nhập OTP & Mật khẩu mới */}
        {step === 2 && (
          <form onSubmit={handleConfirmReset} className="mt-4 space-y-4">
            <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs">
              <span className="text-slate-600 dark:text-slate-400">Mã OTP đã gửi đến: </span>
              <span className="font-semibold text-blue-700 dark:text-blue-300">{email}</span>
            </div>

            {/* OTP Input */}
            <div>
              <label className="block text-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Nhập mã OTP 6 chữ số <span className="text-rose-500">*</span>
              </label>
              <OtpInput
                length={6}
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isSubmitting}
                autoFocus={true}
              />
            </div>

            {/* Resend OTP button */}
            <div className="flex items-center justify-between text-xs px-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Đổi email khác</span>
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={countdown > 0 || isSubmitting}
                className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 disabled:text-slate-400 disabled:cursor-not-allowed hover:underline"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${countdown > 0 ? '' : 'text-blue-600 dark:text-blue-400'}`} />
                <span>
                  {countdown > 0 ? `Gửi lại sau ${countdown}s` : 'Gửi lại mã OTP'}
                </span>
              </button>
            </div>

            {/* Mật khẩu mới */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mật khẩu mới (tối thiểu 8 ký tự) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Nhập mật khẩu mới..."
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu mới */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Xác nhận lại mật khẩu mới <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="Nhập lại mật khẩu mới..."
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otp.length < 6 || !newPassword}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all mt-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang đặt lại mật khẩu...</span>
                </>
              ) : (
                <span>Xác Nhận & Đổi Mật Khẩu</span>
              )}
            </button>
          </form>
        )}

        {/* STEP 3: Hoàn thành */}
        {step === 3 && (
          <div className="mt-4 text-center py-4 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Đặt Lại Mật Khẩu Thành Công!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                Mật khẩu cho tài khoản <span className="font-semibold text-slate-700 dark:text-slate-200">{email}</span> đã được cập nhật thành công.
              </p>
            </div>

            <button
              type="button"
              onClick={onHide}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition-all cursor-pointer"
            >
              <span>Đăng Nhập Ngay</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

ForgotPasswordModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  initialEmail: PropTypes.string,
  onSuccess: PropTypes.func,
};
