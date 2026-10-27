import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  fetchSignedUrl,
  fetchContentKey,
  generateClientECDHKeyPair,
  exportPublicKeyRaw,
  mockExchangeKeysApi,
  deriveAndDecryptContentKey,
} from '../services/cryptoService';

const STORAGE_KEY = 'securelearn_auth_user';
/**
 * Custom Hook: useSecureHls
 *
 * Đảm nhiệm toàn bộ luồng DRM bảo mật cho video HLS:
 * 1. Lấy URL luồng theo videoId và studentId.
 * 2. Chặn request tải key mã hóa qua HLS.js Fragment Loader.
 * 3. Thực hiện trao đổi khóa ECDH (P-256) bằng Web Crypto API.
 * 4. Giải mã khóa AES-128 trong bộ nhớ và cấp cho HLS.js.
 */
export function useSecureHls(videoId, studentId, videoRef, courseId = null) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [securityStatus, setSecurityStatus] = useState('Đang khởi tạo...');
  const hlsInstanceRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;

    if (!videoId) {
      setIsLoading(false);
      setIsReady(true);
      setSecurityStatus('Sẵn sàng phát video');
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsReady(false);
    setSecurityStatus('Đang kết nối Backend lấy thông tin video...');

    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }

    const initSecurePlayback = async () => {
      try {
        const { streamUrl } = await fetchSignedUrl(videoId, studentId, courseId);
        if (isCancelled) return;

        const isHlsStream = streamUrl.includes('.m3u8') || streamUrl.includes('/manifest');

        if (!isHlsStream) {
          const videoElement = videoRef.current;
          if (videoElement) {
            videoElement.src = streamUrl;
            setIsLoading(false);
            setIsReady(true);
            setSecurityStatus('Đang phát trực tiếp từ Backend');
            return;
          }
        }

        setSecurityStatus('Đã kết nối luồng HLS. Đang kiểm tra trình phát HLS...');
        if (!Hls.isSupported()) {
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

        class SecureKeyFragmentLoader extends Hls.DefaultConfig.loader {
          constructor(config) {
            super(config);
          }

          load(context, config, callbacks) {
            const isKeyRequest = context.type === 'key' || context.frag?.type === 'key';

            if (isKeyRequest) {
              setSecurityStatus('Đang lấy khóa giải mã bảo mật từ Backend...');
              (async () => {
                const startTime = performance.now();
                try {
                  let rawAes128KeyBuffer;
                  const isBackendKeyUrl =
                    typeof context.url === 'string' &&
                    (context.url.includes('/api/v1/lesson/') || context.url.includes('/key'));

                  if (isBackendKeyUrl) {
                    // Lấy khóa AES-128 thật từ Backend PlaybackController (Spring Boot / Cloudflare R2)
                    rawAes128KeyBuffer = await fetchContentKey(context.url);
                  } else {
                    // Fallback giả lập ECDH cho bài giảng mock/offline
                    const clientKeyPair = await generateClientECDHKeyPair();
                    const clientPublicKeyB64 = await exportPublicKeyRaw(clientKeyPair.publicKey);
                    const exchangeResponse = await mockExchangeKeysApi({
                      videoId,
                      studentId,
                      clientPublicKeyB64,
                      keyUri: context.url,
                    });
                    rawAes128KeyBuffer = await deriveAndDecryptContentKey(
                      clientKeyPair,
                      exchangeResponse.serverPublicKey,
                      exchangeResponse.encryptedKey,
                      exchangeResponse.iv
                    );
                  }

                  if (isCancelled) return;
                  setSecurityStatus('Khóa AES-128 đã nạp an toàn vào bộ nhớ. Sẵn sàng phát!');
                  const loadTime = performance.now();
                  callbacks.onSuccess(
                    { url: context.url, data: rawAes128KeyBuffer },
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
                  console.error('[SecureLearn DRM] Lỗi nạp khóa giải mã:', err);
                  setSecurityStatus('Lỗi nạp khóa bảo mật bài giảng.');
                  callbacks.onError({ code: 403, text: `Lỗi khóa bảo mật: ${err.message}` }, context, null);
                }
              })();
              return;
            }
            super.load(context, config, callbacks);
          }
        }

        const hls = new Hls({
          fLoader: SecureKeyFragmentLoader,
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          manifestLoadingTimeOut: 30000,
          fragLoadingTimeOut: 60000,
          keyLoadingTimeOut: 30000,
          xhrSetup: (xhr, url) => {
            xhr.withCredentials = false;
            if (url.includes('/api/v1/lesson/')) {
              xhr.open('GET', url, true);
              const user = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
              if(user?.token) {
              xhr.setRequestHeader('Authorization', `Bearer ${user.token}`);
              }
            }
          },
        });
        hlsInstanceRef.current = hls;
        const videoElement = videoRef.current;
        if (!videoElement) return;
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(streamUrl));
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!isCancelled) {
            setIsLoading(false);
            setIsReady(true);
          }
        });
        hls.on(Hls.Events.KEY_LOADED, () => setSecurityStatus('Khóa bảo mật AES-128 đã kích hoạt.'));
        hls.on(Hls.Events.ERROR, (_event, data) => {
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
    return () => {
      isCancelled = true;
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [videoId, studentId, videoRef, courseId]);

  const reload = () => {
    setError(null);
    setIsLoading(true);
    setIsReady(false);
    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }
  };

  return { isLoading, error, isReady, securityStatus, reload };
}