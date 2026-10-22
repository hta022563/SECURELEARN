import React, { useRef, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import shaka from 'shaka-player';
import { ShieldAlert, RefreshCw, RotateCcw, Loader2, Play, Lock } from 'lucide-react';
import { useSecurePlayer } from '../hooks/useSecurePlayer';
import { useSecureHls } from '../hooks/useSecureHls';

/**
 * =============================================================================
 * COMPONENT: SecureVideoPlayer
 * =============================================================================
 * Trình phát video bảo mật tích hợp Google Shaka Player & W3C EME Clear Key DRM:
 *
 * 1. Hỗ trợ chuẩn DRM W3C EME (Clear Key):
 *    - Shaka polyfill.installAll() & kiểm tra Player.isBrowserSupported().
 *    - Cấu hình server license: player.configure({ drm: { servers: { "org.w3.clearkey": licenseUrl } } }).
 *    - NetworkingEngine Request Filter tự động gắn "Authorization: Bearer ${playbackToken}"
 *      cho cả 3 loại request: MANIFEST, SEGMENT và LICENSE.
 *
 * 2. Bảo mật nâng cao:
 *    - Tuyệt đối KHÔNG log token, JWT, raw CEK hoặc license response body ra console (chỉ log error code).
 *    - Tích hợp Dynamic Watermark di chuyển vị trí ngẫu nhiên định kỳ:
 *      hiển thị Username, UserID, SessionID / SignedURLID.
 *    - Chống PrintScreen, Focus Blackout và Anti-DevTools qua useSecurePlayer.
 *
 * 3. Tương thích ngược:
 *    - Tự động chuyển đổi mượt mà giữa DRM DASH_CENC (Shaka) và HLS truyền thống (hls.js).
 * =============================================================================
 */

// Cài đặt Shaka polyfill 1 lần duy nhất khi file được nạp
if (typeof window !== 'undefined' && shaka?.polyfill?.installAll) {
  shaka.polyfill.installAll();
}

export default function SecureVideoPlayer({
  manifestUrl,
  licenseUrl,
  playbackToken,
  watermarkInfo,
  videoUrl,
  videoId,
  courseId,
  studentId = 'STUDENT',
  title = 'Bài giảng SecureLearn DRM',
  embedded = false,
  onEnded,
}) {
  const videoRef = useRef(null);
  const shakaPlayerRef = useRef(null);

  // Client-side Protections: Focus Blackout, Anti-PrintScreen, Anti-Debugging
  const { isScreenHidden, hideReason } = useSecurePlayer(videoRef);

  // States quản lý trình phát
  const [isShakaLoading, setIsShakaLoading] = useState(false);
  const [shakaError, setShakaError] = useState(null);
  const [isShakaReady, setIsShakaReady] = useState(false);

  // Xác định chế độ phát: DRM Shaka Player (DASH / ClearKey) hay HLS truyền thống
  const isDrmMode = Boolean(manifestUrl && licenseUrl);
  const isDirectUrl = Boolean(
    typeof videoUrl === 'string' &&
      (videoUrl.startsWith('http://') || videoUrl.startsWith('https://') || videoUrl.startsWith('blob:'))
  );

  // Hook HLS dự phòng cho bài giảng truyền thống không dùng DRM Clear Key
  const activeVideoId = isDrmMode || isDirectUrl ? null : (videoId || videoUrl);
  const {
    isLoading: isHlsLoading,
    error: hlsError,
    securityStatus: hlsSecurityStatus,
    reload: reloadHls,
  } = useSecureHls(activeVideoId, studentId, videoRef, courseId);

  /**
   * Khởi tạo & Cấu hình Shaka Player cho luồng DRM W3C Clear Key
   */
  const initShakaPlayer = useCallback(async () => {
    if (!videoRef.current || !manifestUrl || !licenseUrl) return;

    if (!shaka.Player.isBrowserSupported()) {
      setShakaError('Trình duyệt hiện tại không hỗ trợ W3C EME & Clear Key DRM.');
      return;
    }

    setIsShakaLoading(true);
    setShakaError(null);
    setIsShakaReady(false);

    try {
      // Hủy instance cũ nếu có
      if (shakaPlayerRef.current) {
        await shakaPlayerRef.current.destroy();
        shakaPlayerRef.current = null;
      }

      const player = new shaka.Player();
      await player.attach(videoRef.current);
      shakaPlayerRef.current = player;

      // 1. Cấu hình W3C Clear Key License Server
      player.configure({
        drm: {
          servers: {
            'org.w3.clearkey': licenseUrl,
          },
        },
      });

      // 2. Đăng ký Request Filter cho NetworkingEngine để tự động gắn Bearer Token
      //    Áp dụng cho cả 3 loại: MANIFEST, SEGMENT, và LICENSE
      const netEngine = player.getNetworkingEngine();
      netEngine.clearAllRequestFilters();
      netEngine.registerRequestFilter((type, request) => {
        const RequestType = shaka.net.NetworkingEngine.RequestType;
        if (
          type === RequestType.MANIFEST ||
          type === RequestType.SEGMENT ||
          type === RequestType.LICENSE
        ) {
          if (playbackToken) {
            request.headers['Authorization'] = `Bearer ${playbackToken}`;
          }
        }
      });

      // 3. Lắng nghe sự kiện lỗi — TUYỆT ĐỐI KHÔNG log token, JWT, raw CEK hoặc body
      player.addEventListener('error', (event) => {
        const errDetail = event.detail;
        const errorCode = errDetail?.code || 'UNKNOWN_CODE';
        // Chỉ log mã lỗi ngắn gọn
        console.error('[SecureVideoPlayer] DRM Error Code:', errorCode);
        setShakaError(`Không thể giải mã bài giảng bảo mật (Mã lỗi EME: ${errorCode}).`);
      });

      // 4. Tải Manifest
      await player.load(manifestUrl);
      setIsShakaReady(true);
    } catch (err) {
      const errorCode = err?.code || 'INIT_ERROR';
      console.error('[SecureVideoPlayer] Shaka Init Error Code:', errorCode);
      setShakaError(`Khởi tạo luồng phát DRM thất bại (Mã lỗi: ${errorCode}).`);
    } finally {
      setIsShakaLoading(false);
    }
  }, [manifestUrl, licenseUrl, playbackToken]);

  // Kích hoạt Shaka Player khi props DRM thay đổi
  useEffect(() => {
    let active = true;

    if (isDrmMode) {
      initShakaPlayer();
    } else {
      // Nếu không ở chế độ DRM, hủy Shaka Player nếu đang chạy
      if (shakaPlayerRef.current) {
        shakaPlayerRef.current.destroy().catch(() => {});
        shakaPlayerRef.current = null;
      }
    }

    return () => {
      active = false;
      if (shakaPlayerRef.current) {
        shakaPlayerRef.current.destroy().catch(() => {});
        shakaPlayerRef.current = null;
      }
    };
  }, [isDrmMode, initShakaPlayer]);

  // Direct URL video handler
  useEffect(() => {
    if (videoRef.current && isDirectUrl && !isDrmMode) {
      videoRef.current.src = videoUrl;
      videoRef.current.load();
    }
  }, [videoUrl, isDirectUrl, isDrmMode]);

  // Loading & Error states
  const isLoading = isDrmMode ? isShakaLoading : !isDirectUrl && isHlsLoading;
  const currentError = isDrmMode ? shakaError : !isDirectUrl && hlsError;

  const handleReload = () => {
    if (isDrmMode) {
      initShakaPlayer();
    } else {
      reloadHls();
    }
  };

  const playerCard = (
    <div className="relative w-full overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl isolate">
      {/* Header: Tiêu đề bài giảng & Badge DRM */}
      <div className="border-b border-slate-100 dark:border-slate-800 px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
          {title}
        </h3>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900 whitespace-nowrap shrink-0">
          <Lock className="h-3 w-3 text-blue-500" />
          <span>{isDrmMode ? 'W3C EME ClearKey DRM' : 'HLS AES-128 Protected'}</span>
        </span>
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
          className="w-full h-full block object-contain"
          controls
          controlsList="nodownload"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          playsInline
          onEnded={onEnded}
        />

        {/* GIAO DIỆN BÔI ĐEN BẢO VỆ (BLACKOUT OVERLAY) */}
        {isScreenHidden && (
          <div className="absolute inset-0 z-30 flex flex-col justify-center items-center text-center p-6 select-none bg-black">
            <div className="max-w-md">
              <h4 className="text-white font-extrabold text-base sm:text-lg mb-2 uppercase tracking-wider">
                Nội dung đã được bảo vệ bản quyền
              </h4>
              <p className="text-slate-400 text-xs sm:text-sm mb-4 leading-relaxed">
                {hideReason === 'print_screen'
                  ? 'Phát hiện thao tác chụp màn hình (PrintScreen). Hình ảnh đã bị vô hiệu hóa trong Clipboard và màn hình tạm thời bị ẩn để bảo vệ bài giảng.'
                  : 'Phát hiện mất tiêu điểm cửa sổ hoặc thao tác ghi màn hình. Video đã tạm dừng và phủ đen để bảo vệ nội dung.'}
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
        {isLoading && !currentError && (
          <div className="absolute inset-0 z-10 flex flex-col justify-center items-center bg-black/80 backdrop-blur-xs p-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-3" />
            <p className="text-white text-xs sm:text-sm text-center font-medium max-w-sm">
              {isDrmMode
                ? 'Đang khởi tạo phiên phát W3C Clear Key DRM an toàn...'
                : hlsSecurityStatus || 'Đang kết nối luồng phát bảo mật...'}
            </p>
          </div>
        )}

        {/* Error State Overlay */}
        {currentError && (
          <div className="absolute inset-0 z-20 flex justify-center items-center p-4 bg-black/90 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-slate-950/95 p-6 text-center text-white shadow-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-950/80 text-rose-400 mx-auto mb-3">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-rose-400 mb-1.5">
                Không Thể Phát Video Bảo Mật
              </h4>
              <p className="text-xs text-slate-300 mb-4">{currentError}</p>
              <div className="flex justify-center gap-2.5">
                <button
                  type="button"
                  onClick={handleReload}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-500 bg-transparent px-4 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/50 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Thử Lại
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Tải Lại Trang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Watermark Overlay (Di chuyển vị trí ngẫu nhiên định kỳ) */}
        {!isLoading && !currentError && (
          <DynamicWatermark watermarkInfo={watermarkInfo} studentId={studentId} />
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
  manifestUrl: PropTypes.string,
  licenseUrl: PropTypes.string,
  playbackToken: PropTypes.string,
  watermarkInfo: PropTypes.shape({
    username: PropTypes.string,
    userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    sessionId: PropTypes.string,
    signedUrlId: PropTypes.string,
  }),
  videoUrl: PropTypes.string,
  videoId: PropTypes.string,
  courseId: PropTypes.string,
  studentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  title: PropTypes.string,
  embedded: PropTypes.bool,
  onEnded: PropTypes.func,
};

/**
 * =============================================================================
 * COMPONENT: DynamicWatermark (Lớp phủ Watermark động bảo vệ bản quyền)
 * =============================================================================
 * - Di chuyển ngẫu nhiên trên khung hình mỗi 5 giây.
 * - Hiển thị mờ nhận diện: Username, UserID, SessionID / SignedURLID.
 * - Chống sao chép, pointer-events none để không cản trở thao tác video.
 */
function DynamicWatermark({ watermarkInfo, studentId }) {
  const [position, setPosition] = useState({ top: 18, left: 22 });

  useEffect(() => {
    const updatePosition = () => {
      // Giữ tọa độ trong khoảng an toàn (15% - 75%) để không tràn khung hình
      const top = Math.floor(Math.random() * 60) + 15;
      const left = Math.floor(Math.random() * 60) + 15;
      setPosition({ top, left });
    };

    const interval = setInterval(updatePosition, 5000);
    return () => clearInterval(interval);
  }, []);

  const username = watermarkInfo?.username || studentId || 'Student';
  const userId = watermarkInfo?.userId || watermarkInfo?.id || studentId || 'u-student';
  const sessionId = watermarkInfo?.sessionId || watermarkInfo?.signedUrlId || 'SES-ACTIVE';

  return (
    <div
      className="absolute pointer-events-none select-none z-20 font-mono text-[11px] font-semibold tracking-wide leading-tight px-3 py-1.5 rounded-xl border border-white/10 bg-black/35 backdrop-blur-[1px] transition-all duration-1000 ease-in-out shadow-xs"
      style={{
        top: `${position.top}%`,
        left: `${position.left}%`,
        transform: 'translate(-50%, -50%)',
        color: 'rgba(255, 255, 255, 0.45)',
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
      }}
    >
      <div className="flex items-center gap-1.5 text-blue-400/80 text-[9px] uppercase tracking-wider font-bold mb-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400/80 animate-ping inline-block" />
        SecureLearn DRM Protected
      </div>
      <div>
        ID: <span className="text-white/60">{userId}</span> • {username}
      </div>
      <div className="text-[10px] text-white/35">
        Session: <span className="font-mono">{sessionId}</span>
      </div>
    </div>
  );
}

DynamicWatermark.propTypes = {
  watermarkInfo: PropTypes.shape({
    username: PropTypes.string,
    userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    sessionId: PropTypes.string,
    signedUrlId: PropTypes.string,
  }),
  studentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
