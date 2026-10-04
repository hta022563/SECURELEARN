import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  fetchSignedUrl,
  generateClientECDHKeyPair,
  exportPublicKeyRaw,
  mockExchangeKeysApi,
  deriveAndDecryptContentKey,
} from '../services/cryptoService';

/**
 * Custom Hook: useSecureHls
 * 
 * Đảm nhiệm toàn bộ luồng DRM bảo mật cho video HLS:
 * 1. Lấy Cloudflare Signed URL (m3u8) theo videoId và studentId.
 * 2. Can thiệp vào HLS.js Fragment Loader (fLoader) để chặn request tải key mã hóa.
 * 3. Thực hiện Handshake trao đổi khóa bảo mật ECDH (P-256) bằng Web Crypto API.
 * 4. Giải mã lấy khóa AES-128 gốc trong bộ nhớ và cấp ngược lại cho HLS.js để phát video.
 * 
 * @param {string} videoId ID bài giảng video
 * @param {string|number} studentId ID sinh viên
 * @param {React.RefObject} videoRef Ref đến thẻ <video>
 */
export function useSecureHls(videoId, studentId, videoRef) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [securityStatus, setSecurityStatus] = useState('Đang khởi tạo...');

  const hlsInstanceRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    setIsReady(false);
    setSecurityStatus('Đang xin cấp Signed URL từ CDN Cloudflare R2...');

    // Hủy instance HLS cũ nếu đang chạy
    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    const initSecurePlayback = async () => {
      try {

        // BƯỚC 1: Lấy Signed URL của file manifest (.m3u8) từ CDN Cloudflare R2
        const { streamUrl } = await fetchSignedUrl(videoId, studentId);
        if (isCancelled) return;

        setSecurityStatus('Signed URL hợp lệ. Đang kiểm tra trình phát HLS...');

        // BƯỚC 2: Kiểm tra hỗ trợ HLS.js
        if (!Hls.isSupported()) {
          // Trường hợp Safari trên iOS/macOS hỗ trợ HLS native qua thẻ <video>
          const videoElement = videoRef.current;
          if (videoElement && videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = streamUrl;
            setIsLoading(false);
            setIsReady(true);
            setSecurityStatus('Phát qua Native HLS (Safari)');
            return;
          }
          throw new Error('Trình duyệt của bạn không hỗ trợ công nghệ giải mã video HLS.');
        }

        /**
         * =========================================================================
         * BƯỚC 3: CAN THIỆP VÀO fLoader (Fragment Loader) CỦA HLS.JS
         * =========================================================================
         * 
         * GIẢI THÍCH KIẾN TRÚC VÀ BẢO MẬT:
         * Trong chuẩn HLS AES-128, file .m3u8 chứa thẻ tag:
         *   #EXT-X-KEY:METHOD=AES-128,URI="https://drm.securelearn.edu/key/xxx",IV=...
         * 
         * Mặc định, HLS.js sẽ gửi một HTTP GET trực tiếp tới URI này để lấy 16-byte key.
         * Điều này có các lỗ hổng chí mạng:
         *  - Key bị lộ trong tab Network của DevTools.
         *  - Hacker có thể tải key về để giải mã toàn bộ video vĩnh viễn.
         *  - Dễ bị tấn công Man-in-the-Middle (MITM) hoặc replay attacks.
         * 
         * GIẢI PHÁP:
         * HLS.js định tuyến việc tải key thông qua Fragment Loader (`fLoader`)
         * (khi context.type === 'key' hoặc context.frag?.type === 'key').
         * Chúng ta tạo một Custom Loader kế thừa Hls.DefaultConfig.loader:
         *  - Chặn đứng request HTTP GET thông thường.
         *  - Kích hoạt quy trình bắt tay ECDH (Web Crypto API) bảo mật ở tầng ứng dụng.
         *  - Nhận khóa AES-128 đã mã hóa từ server -> giải mã trong RAM.
         *  - Trả thẳng ArrayBuffer chứa 16 bytes key gốc vào callbacks.onSuccess của HLS.js.
         *  - HLS.js tiếp tục giải mã các phân đoạn (.ts / .m4s) mượt mà như bình thường.
         */
        class SecureKeyFragmentLoader extends Hls.DefaultConfig.loader {
          constructor(config) {
            super(config);
          }

          load(context, config, callbacks) {
            // Kiểm tra xem request này có phải là request lấy khóa mã hóa không
            const isKeyRequest = context.type === 'key' || context.frag?.type === 'key';

            if (isKeyRequest) {
              setSecurityStatus('Bắt đầu trao đổi khóa bảo mật ECDH (P-256)...');

              (async () => {
                const startTime = performance.now();
                try {
                  // 1. Tạo cặp khóa ECDH Client (Ephemeral)
                  const clientKeyPair = await generateClientECDHKeyPair();

                  // 2. Xuất Public Key dạng Raw (Base64)
                  const clientPublicKeyB64 = await exportPublicKeyRaw(clientKeyPair.publicKey);

                  // 3. Gửi Public Key Client lên API /api/v1/keys/exchange
                  const exchangeResponse = await mockExchangeKeysApi({
                    videoId,
                    studentId,
                    clientPublicKeyB64,
                    keyUri: context.url,
                  });

                  // 4. Giải mã bằng Shared Secret để lấy khóa AES-128 gốc (Uint8Array / ArrayBuffer)
                  const rawAes128KeyBuffer = await deriveAndDecryptContentKey(
                    clientKeyPair,
                    exchangeResponse.serverPublicKey,
                    exchangeResponse.encryptedKey,
                    exchangeResponse.iv
                  );

                  if (isCancelled) return;
                  setSecurityStatus('Khóa AES-128 đã giải mã an toàn trong bộ nhớ. Sẵn sàng phát!');

                  // 5. Cung cấp khóa đã giải mã trực tiếp cho HLS.js qua callbacks.onSuccess
                  const loadTime = performance.now();
                  callbacks.onSuccess(
                    {
                      url: context.url,
                      data: rawAes128KeyBuffer, // ArrayBuffer 16 bytes khóa AES gốc
                    },
                    {
                      trequest: startTime,
                      tfirst: loadTime,
                      tload: loadTime,
                      loaded: rawAes128KeyBuffer.byteLength,
                      total: rawAes128KeyBuffer.byteLength,
                    },
                    context
                  );
                } catch (err) {
                  console.error('[SecureLearn DRM] Lỗi trao đổi khóa ECDH:', err);
                  setSecurityStatus('Lỗi trao đổi khóa bản quyền.');
                  callbacks.onError(
                    { code: 403, text: `Lỗi giải mã ECDH: ${err.message}` },
                    context,
                    null
                  );
                }
              })();

              // Dừng luồng, không gọi super.load() để ngăn HTTP GET thông thường
              return;
            }

            // Với các segment video (.ts, init.mp4), sử dụng loader mặc định của HLS.js
            super.load(context, config, callbacks);
          }
        }

        // BƯỚC 4: Cấu hình và khởi tạo Hls instance với Custom fLoader
        const hls = new Hls({
          fLoader: SecureKeyFragmentLoader,
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          xhrSetup: (xhr, url) => {
            // Đính kèm các token hoặc header bảo mật bổ sung nếu cần
            xhr.withCredentials = false;
          },
        });

        hlsInstanceRef.current = hls;

        const videoElement = videoRef.current;
        if (!videoElement) return;

        hls.attachMedia(videoElement);

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          hls.loadSource(streamUrl);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (isCancelled) return;
          setIsLoading(false);
          setIsReady(true);
        });

        hls.on(Hls.Events.KEY_LOADED, () => {
          setSecurityStatus('Khóa bảo mật AES-128 đã kích hoạt.');
        });

        // Xử lý các lỗi HLS.js phát sinh
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.warn('[SecureLearn HLS Event Error]', data);

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError('Lỗi kết nối mạng hoặc phiên truy cập video đã hết hạn. Đang thử khôi phục...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                setError('Lỗi giải mã khung hình video. Đang phục hồi...');
                hls.recoverMediaError();
                break;
              case Hls.ErrorTypes.KEY_SYSTEM_ERROR:
                setError('Lỗi xác thực hệ thống khóa DRM (Key System Error). Bạn không có quyền xem.');
                hls.destroy();
                break;
              default:
                setError(`Lỗi nghiêm trọng không thể phục hồi: ${data.details || 'Không rõ nguyên nhân'}`);
                hls.destroy();
                break;
            }
          }
        });
      } catch (err) {
        if (isCancelled) return;
        console.error('[SecureLearn Init Error]', err);
        setError(err.message || 'Không thể tải nội dung video bảo mật.');
        setIsLoading(false);
      }
    };

    initSecurePlayback();

    // Dọn dẹp tài nguyên khi unmount hoặc đổi videoId
    return () => {
      isCancelled = true;
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [videoId, studentId, videoRef]);

  // Hàm reload chủ động khi gặp lỗi
  const reload = () => {
    setError(null);
    setIsLoading(true);
    setIsReady(false);
    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }
  };

  return {
    isLoading,
    error,
    isReady,
    securityStatus,
    reload,
  };
}
