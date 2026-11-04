import FingerprintJS from '@fingerprintjs/fingerprintjs';

/**
 * =============================================================================
 * SECURELEARN - DEVICE FINGERPRINT SERVICE
 * =============================================================================
 * Tạo và quản lý `device_fingerprint` (visitorId) thực tế từ trình duyệt và
 * phần cứng của người dùng bằng thư viện @fingerprintjs/fingerprintjs.
 * =============================================================================
 */

const FINGERPRINT_STORAGE_KEY = 'securelearn_device_fingerprint';

let cachedFingerprint = null;
let pendingPromise = null;

/**
 * Lấy `device_fingerprint` thật của thiết bị người dùng từ @fingerprintjs/fingerprintjs.
 * Kết quả được lưu đệm vào RAM và sessionStorage trong suốt phiên làm việc.
 *
 * @returns {Promise<string>} Chuỗi visitorId duy nhất của thiết bị
 */
export async function getDeviceFingerprint() {
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      const saved = sessionStorage.getItem(FINGERPRINT_STORAGE_KEY);
      if (saved) {
        cachedFingerprint = saved;
        return saved;
      }
    }
  } catch {
    // Ignore storage access errors
  }

  if (!pendingPromise) {
    pendingPromise = (async () => {
      try {
        const fpLib = typeof FingerprintJS?.load === 'function' ? FingerprintJS : (FingerprintJS?.default || FingerprintJS);
        if (fpLib && typeof fpLib.load === 'function') {
          const fp = await fpLib.load({ monitoring: false });
          const result = await fp.get();
          if (result?.visitorId) {
            cachedFingerprint = result.visitorId;
          }
        }
      } catch (err) {
        console.warn('[fingerprintService] FingerprintJS error, using browser signal hash:', err?.message);
      }

      if (!cachedFingerprint) {
        try {
          const raw = [
            typeof navigator !== 'undefined' ? navigator.userAgent : '',
            typeof navigator !== 'undefined' ? navigator.language : '',
            typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '',
            typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
          ].join('|');
          if (typeof crypto !== 'undefined' && crypto.subtle) {
            const msgBuffer = new TextEncoder().encode(raw);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            cachedFingerprint = Array.from(new Uint8Array(hashBuffer))
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('')
              .slice(0, 32);
          }
        } catch {
          // ignore
        }
      }

      if (!cachedFingerprint) {
        cachedFingerprint = 'fp_default_visitor';
      }

      try {
        if (typeof sessionStorage !== 'undefined' && cachedFingerprint) {
          sessionStorage.setItem(FINGERPRINT_STORAGE_KEY, cachedFingerprint);
        }
      } catch {
        // ignore
      }

      return cachedFingerprint;
    })().finally(() => {
      pendingPromise = null;
    });
  }

  return pendingPromise;
}

/**
 * Đọc nhanh `device_fingerprint` đã khởi tạo từ bộ nhớ đệm (dùng cho callback
 * đồng bộ như `xhrSetup` của HLS.js).
 *
 * @returns {string | null}
 */
export function getCachedDeviceFingerprint() {
  if (cachedFingerprint) {
    return cachedFingerprint;
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      const saved = sessionStorage.getItem(FINGERPRINT_STORAGE_KEY);
      if (saved) {
        cachedFingerprint = saved;
        return saved;
      }
    }
  } catch {
    // Ignore
  }
  return null;
}

export default {
  getDeviceFingerprint,
  getCachedDeviceFingerprint,
};
