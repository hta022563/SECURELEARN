import { useState, useEffect, useRef } from 'react';

/**
 * Custom Hook: useSecurePlayer
 * Đảm nhiệm 3 lớp bảo vệ bản quyền video phía Client:
 * - Chức năng A: Focus-based Blackout (Tự động phủ đen & pause khi mất tiêu điểm / rời tab / mở Snipping Tool)
 * - Chức năng B: Anti-PrintScreen (Ghi đè Clipboard và phủ đen màn hình 3 giây khi bấm PrintScreen)
 * - Chức năng C: Chặn phím tắt DevTools, Copy, View Source & Chặn chuột phải
 * 
 * @param {React.RefObject<HTMLVideoElement>} videoRef - Tham chiếu tới thẻ HTML5 <video>
 * @returns {{ isScreenHidden: boolean, hideReason: string }}
 */
export function useSecurePlayer(videoRef) {
  const [isScreenHidden, setIsScreenHidden] = useState(false);
  const [hideReason, setHideReason] = useState('');
  const printScreenTimeoutRef = useRef(null);

  useEffect(() => {
    // =========================================================================
    // CHỨC NĂNG A: FOCUS-BASED BLACKOUT (Phủ đen mất tiêu điểm)
    // =========================================================================
    const handleBlurOrHidden = () => {
      // Khi mất tiêu điểm (mở Snipping Tool, Win+Shift+S, Alt+Tab, click cửa sổ khác)
      setIsScreenHidden(true);
      setHideReason('focus_lost');

      // Tạm dừng video ngay lập tức
      if (videoRef?.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    };

    const handleFocusOrVisible = () => {
      // Khi người dùng quay lại ứng dụng: khôi phục giao diện nếu không trong 3s phạt PrintScreen
      if (!printScreenTimeoutRef.current) {
        setIsScreenHidden(false);
        setHideReason('');
      }
      // TUYỆT ĐỐI KHÔNG tự động gọi videoRef.current.play() (người dùng tự bấm phát tiếp)
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        handleBlurOrHidden();
      } else {
        handleFocusOrVisible();
      }
    };

    window.addEventListener('blur', handleBlurOrHidden);
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // =========================================================================
    // =========================================================================
    // CHỨC NĂNG B: ANTI-PRINTSCREEN & CHỐNG SNIPPING TOOL (Bắt ngay tại KEYDOWN)
    // =========================================================================
    const purgeClipboardAndHide = (reason = 'print_screen') => {
      // 1. Ghi đè bộ nhớ tạm Clipboard ngay lập tức
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText('⚠️ Nội dung được bảo vệ bản quyền bởi SecureLearn. Nghiêm cấm sao chép, chụp ảnh màn hình!')
          .catch(() => {});
      }

      // 2. Dừng phát video
      if (videoRef?.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }

      // 3. Kích hoạt phủ đen cưỡng chế trong 3.5 giây
      setIsScreenHidden(true);
      setHideReason(reason);

      if (printScreenTimeoutRef.current) {
        clearTimeout(printScreenTimeoutRef.current);
      }

      printScreenTimeoutRef.current = setTimeout(() => {
        printScreenTimeoutRef.current = null;
        if (document.hasFocus() && !document.hidden) {
          setIsScreenHidden(false);
          setHideReason('');
        }
      }, 3500);
    };

    const handleKeyUp = (e) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        purgeClipboardAndHide('print_screen');
      }
    };

    window.addEventListener('keyup', handleKeyUp);

    // =========================================================================
    // CHỨC NĂNG C: CHẶN PHÍM TẮT, SNIPPING TOOL & ANTI-DEBUGGING (Capture Phase)
    // =========================================================================
    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const keyUpper = e.key ? e.key.toUpperCase() : '';
      const code = e.code || '';

      // 1. Bắt phím PrintScreen ngay tại sự kiện KEYDOWN (trước khi OS hoàn tất ghi file)
      if (e.key === 'PrintScreen' || code === 'PrintScreen') {
        e.preventDefault();
        purgeClipboardAndHide('print_screen');
        return false;
      }

      // 2. Bắt tổ hợp Snipping Tool: Win + Shift + S hoặc Ctrl + Shift + S
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && (keyUpper === 'S' || code === 'KeyS')) {
        e.preventDefault();
        e.stopPropagation();
        purgeClipboardAndHide('snipping_tool');
        return false;
      }

      // 3. Bắt phím Win + G hoặc Win + Alt + R (Game Bar screen record)
      if (e.metaKey && (keyUpper === 'G' || code === 'KeyG')) {
        purgeClipboardAndHide('screen_record');
      }
      if (e.metaKey && e.altKey && (keyUpper === 'R' || code === 'KeyR')) {
        purgeClipboardAndHide('screen_record');
      }

      // 4. Chặn F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // 5. Chặn Ctrl/Cmd + Shift + I / J / C (Inspect Element / Console)
      if (isCtrlOrCmd && e.shiftKey) {
        if (keyUpper === 'I' || keyUpper === 'J' || keyUpper === 'C') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }

      // 6. Chặn Ctrl/Cmd + U (View Source), Ctrl/Cmd + S (Save), Ctrl/Cmd + C (Copy)
      if (isCtrlOrCmd) {
        if (keyUpper === 'U' || keyUpper === 'S' || keyUpper === 'C') {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    // Chặn menu chuột phải (Context Menu)
    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);

    // =========================================================================
    // CLEANUP: Dọn dẹp toàn bộ Event Listeners và Timeout tránh Memory Leak
    // =========================================================================
    return () => {
      window.removeEventListener('blur', handleBlurOrHidden);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);

      if (printScreenTimeoutRef.current) {
        clearTimeout(printScreenTimeoutRef.current);
      }
    };
  }, [videoRef]);

  return { isScreenHidden, hideReason };
}

export default useSecurePlayer;
