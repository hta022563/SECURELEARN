/**
 * SecureLearn DRM - Real Backend Playback & Key Services
 *
 * Kết nối 100% tới Backend Spring Boot (PlaybackController & Cloudflare R2)
 * để lấy Signed HLS Manifest và khóa giải mã AES-128 thực tế.
 */

import apiClient from '../api/axiosClient.js';
import { getLessonPlayback } from './playbackService.js';
import { getDeviceFingerprint } from './fingerprintService.js';

/**
 * Lấy URL luồng video phát bảo mật từ Backend PlaybackController (Spring Boot / Cloudflare R2)
 * Endpoint Backend:
 * - GET /api/v1/lesson/{id}/playback (Tạo phiên phát & cấp token / presigned URL)
 */
export async function fetchSignedUrl(videoId) {
  if (!videoId) {
    throw new Error('400: Thiếu thông tin định danh Video/Lesson ID.');
  }

  // 1. Nếu videoId là một URL trực tiếp hợp lệ từ Backend (http://, https://, blob:)
  if (
    typeof videoId === 'string' &&
    (videoId.startsWith('http://') || videoId.startsWith('https://') || videoId.startsWith('blob:'))
  ) {
    return {
      streamUrl: videoId,
      expiresAt: Date.now() + 3600000,
    };
  }

  // 2. Gọi PlaybackController Backend: GET /api/v1/lesson/{id}/playback
  try {
    const playbackData = await getLessonPlayback(videoId);
    if (playbackData?.playbackUrl) {
      return {
        streamUrl: playbackData.playbackUrl,
        expiresAt: playbackData.expiresAt || Date.now() + 3600000,
      };
    }
  } catch (playbackErr) {
    if (playbackErr.message?.includes('403') || playbackErr.message?.includes('401')) {
      throw playbackErr;
    }
    console.warn(`[cryptoService] Gọi /lesson/${videoId}/playback không thành công, thử tra cứu metadata:`, playbackErr.message);
  }

  // 3. Tra cứu Lesson metadata từ Backend: GET /api/v1/lesson/{id}
  try {
    const res = await apiClient.get(`/lesson/${videoId}`);
    const stream = res?.url || res?.videoURL || res?.videoUrl;
    if (stream && (stream.startsWith('http://') || stream.startsWith('https://') || stream.startsWith('blob:'))) {
      return {
        streamUrl: stream,
        expiresAt: Date.now() + 3600000,
      };
    }
  } catch (e) {
    console.warn(`[cryptoService] Không tìm thấy bài học qua GET /lesson/${videoId}:`, e.message);
  }

  throw new Error(`404: Không tìm thấy đường dẫn video cho bài giảng "${videoId}" trên hệ thống Backend.`);
}

/**
 * Lấy khóa giải mã AES-128 thật từ Backend PlaybackController (Spring Boot & Cloudflare R2)
 * Endpoint: GET /api/v1/lesson/{id}/key?token=...
 *
 * @param {string} keyUrl - URL lấy khóa từ manifest HLS (chứa HMAC token hợp lệ)
 * @returns {Promise<ArrayBuffer>} 16-byte raw AES-128 key buffer
 */
export async function fetchContentKey(keyUrl) {
  if (!keyUrl) {
    throw new Error('400: Thiếu URL khóa giải mã.');
  }

  const deviceFingerprint = await getDeviceFingerprint();
  const headers = {
    Accept: 'application/octet-stream',
    'X-Device-Fingerprint': deviceFingerprint,
  };

  try {
    const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('securelearn_auth_user') : null;
    if (stored) {
      const user = JSON.parse(stored);
      if (user?.token) {
        headers.Authorization = `Bearer ${user.token}`;
      }
    }
  } catch {
    // Ignore
  }

  const response = await fetch(keyUrl, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Lỗi lấy khóa từ Backend (HTTP ${response.status}: ${errorText || response.statusText})`);
  }

  const keyBuffer = await response.arrayBuffer();
  if (!keyBuffer || keyBuffer.byteLength === 0) {
    throw new Error('Khóa giải mã trả về từ Backend rỗng.');
  }

  return keyBuffer;
}
