import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ShieldAlert, RefreshCw, RotateCcw, Loader2 } from 'lucide-react';
import { useSecurePlayer } from '../hooks/useSecurePlayer';
import { useSecureHls } from '../hooks/useSecureHls';

/**
 * =============================================================================
 * COMPONENT: SecureVideoPlayer (Pure Tailwind CSS Player)
 * =============================================================================
 */
export default function SecureVideoPlayer({
  videoUrl,
  videoId,
  courseId,
  studentId = 'STUDENT',
  title = 'Bài giảng SecureLearn',
  embedded = false,
}) {
  const videoRef = useRef(null);

  // Hook bảo vệ Client-side: Focus Blackout, Anti-PrintScreen, Anti-Debugging
  const { isScreenHidden, hideReason } = useSecurePlayer(videoRef);

  const isDirectUrl = Boolean(
    typeof videoUrl === 'string' &&
      (videoUrl.startsWith('http://') || videoUrl.startsWith('https://') || videoUrl.startsWith('blob:'))
  );

  useEffect(() => {
    if (videoRef.current && isDirectUrl) {
      videoRef.current.load();
    }
  }, [videoUrl, isDirectUrl]);

  const activeVideoId = isDirectUrl ? null : (videoId || videoUrl);
  const { isLoading, error, securityStatus, reload } = useSecureHls(
    activeVideoId,
    studentId,
    videoRef,
    courseId
  );

  const playerCard = (
    <div className="relative w-full overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl isolate">
      {/* Header: Tiêu đề bài giảng */}
      <div className="border-b border-slate-100 dark:border-slate-800 px-5 sm:px-6 py-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
          {title}
        </h3>
      </div>

      {/* Khung chứa Video & Overlays (16:9 Aspect Ratio) */}
      <div
        className="relative w-full bg-black overflow-hidden"
        style={{
          aspectRatio: '16 / 9',
          maxHeight: '75vh',
          minHeight: '260px',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Thẻ Video HTML5 */}
        <video
          ref={videoRef}
          src={isDirectUrl ? videoUrl : undefined}
          className="w-full h-full block object-contain"
          controls
          controlsList="nodownload"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          playsInline
        />

        {/* GIAO DIỆN BÔI ĐEN (BLACKOUT OVERLAY) */}
        {isScreenHidden && (
          <div
            className="absolute inset-0 z-30 flex flex-col justify-center items-center text-center p-6 select-none bg-black"
          >
            <div className="max-w-md">
              <h4 className="text-white font-extrabold text-base sm:text-lg mb-2 uppercase tracking-wider">
                Nội dung đã được bảo vệ bản quyền
              </h4>
              <p className="text-slate-400 text-xs sm:text-sm mb-4 leading-relaxed">
                {hideReason === 'print_screen'
                  ? 'Phát hiện thao tác chụp màn hình (PrintScreen). Hình ảnh đã bị vô hiệu hóa trong Clipboard và màn hình tạm thời bị ẩn trong 3 giây.'
                  : 'Phát hiện mất tiêu điểm cửa sổ hoặc thao tác ghi màn hình. Video đã tạm dừng và phủ đen để bảo vệ nội dung bài giảng.'}
              </p>
              <div className="p-3 rounded-2xl border border-slate-800 bg-slate-900/60">
                <span className="text-xs text-slate-300">
                  Vui lòng quay lại cửa sổ bài học và bấm phát tiếp tục để theo dõi.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Loading State Overlay */}
        {!videoUrl && isLoading && !error && (
          <div className="absolute inset-0 z-10 flex flex-col justify-center items-center bg-black/80 backdrop-blur-xs p-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-3" />
            <p className="text-white text-xs sm:text-sm text-center font-medium max-w-sm">
              {securityStatus}
            </p>
          </div>
        )}

        {/* Error State Overlay */}
        {!videoUrl && error && (
          <div className="absolute inset-0 z-20 flex justify-center items-center p-4 bg-black/90 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-slate-950/95 p-6 text-center text-white shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-950/80 text-rose-400 mx-auto mb-3">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-rose-400 mb-1.5">
                Không Thể Phát Video Bảo Mật
              </h4>
              <p className="text-xs text-slate-300 mb-4">{error}</p>
              <div className="flex justify-center gap-2.5">
                <button
                  type="button"
                  onClick={reload}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-500 bg-transparent px-4 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/50 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Thử Lại
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Tải Lại Trang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Watermark Overlay */}
        {(!isLoading || videoUrl) && !error && (
          <DynamicWatermark studentId={studentId} />
        )}
      </div>
    </div>
  );

  if (embedded) {
    return playerCard;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
      {playerCard}
    </div>
  );
}

SecureVideoPlayer.propTypes = {
  videoUrl: PropTypes.string,
  videoId: PropTypes.string,
  courseId: PropTypes.string,
  studentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  title: PropTypes.string,
  embedded: PropTypes.bool,
};

function DynamicWatermark({ studentId }) {
  return (
    <div
      className="absolute top-3 right-4 select-none pointer-events-none z-10 text-right text-xs font-semibold"
      style={{
        color: 'rgba(255, 255, 255, 0.45)',
        textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
        lineHeight: 1.5,
      }}
    >
      User: {studentId} <br /> SecureLearn
    </div>
  );
}

DynamicWatermark.propTypes = {
  studentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
