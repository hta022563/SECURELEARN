import { useState, useEffect, useRef } from 'react';

/**
 * Custom Hook: useVideoVisibility
 * Giám sát độ tập trung của học viên dựa trên Page Visibility API.
 * 
 * @param {React.RefObject<HTMLVideoElement>} videoRef - Ref trỏ tới thẻ <video>
 * @param {Object} [options]
 * @param {Function} [options.onLogPayload] - Callback nhận payload log để bắn về API sau này
 * @returns {{ showWarning: boolean, dismissWarning: () => void }}
 */
export function useVideoVisibility(videoRef, options = {}) {
  const [showWarning, setShowWarning] = useState(false);
  const wasPlayingRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const handleVisibilityChange = () => {
      const video = videoRef?.current;
      if (!video) return;

      if (document.hidden || document.visibilityState === 'hidden') {
        // Kiểm tra xem video có đang phát hay không
        const isPlaying = !video.paused && !video.ended;
        wasPlayingRef.current = isPlaying;

        if (isPlaying) {
          // 1. Dừng video ngay lập tức
          video.pause();

          // 2. Đóng gói log payload theo đúng yêu cầu
          const logPayload = {
            action: 'BACKGROUND_PLAY',
            timestamp: new Date().toISOString(),
            position: Number(video.currentTime.toFixed(2)),
          };

          console.log('[SecureLearn Focus Monitor] 🚨 Rời tab khi video đang phát:', logPayload);

          if (typeof optionsRef.current.onLogPayload === 'function') {
            optionsRef.current.onLogPayload(logPayload);
          }

          // 3. Kích hoạt lớp phủ (overlay) cảnh báo
          setShowWarning(true);
        }
      } else if (document.visibilityState === 'visible') {
        // Khi quay lại tab: TUYỆT ĐỐI KHÔNG tự động play() để tránh gây giật mình
        if (wasPlayingRef.current) {
          console.log('[SecureLearn Focus Monitor] 👁️ Học viên đã quay lại tab. Video vẫn ở trạng thái Pause.');
        }
      }
    };

    // Đăng ký sự kiện visibilitychange trên document
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup: gỡ bỏ listener khi unmount để tránh rò rỉ bộ nhớ
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [videoRef]);

  // Hàm tắt lớp phủ và tiếp tục
  const dismissWarning = () => {
    setShowWarning(false);
    wasPlayingRef.current = false;
  };

  return {
    showWarning,
    dismissWarning,
  };
}

export default useVideoVisibility;
