/**
 * SecureLearn DRM - Real Backend Playback & Key Services
 *
 * Kết nối 100% tới Backend Spring Boot (PlaybackController & Cloudflare R2)
 * để lấy Signed HLS Manifest và khóa giải mã AES-128 thực tế.
 */

import apiClient from '../api/axiosClient.js';
import { getLessonPlayback } from './playbackService.js';
import { getDeviceFingerprint } from './fingerprintService.js';
import { getCourseWithLessons, getCourseById } from './courseService.js';

/**
 * Lấy URL luồng video phát bảo mật từ Backend PlaybackController (Spring Boot / Cloudflare R2)
 * Endpoint Backend:
 * - GET /api/v1/lesson/{id}/playback (Tạo phiên phát & cấp token / presigned URL)
 */
export async function fetchSignedUrl(videoId, studentId = null, courseId = null) {
  if (!videoId) {
    throw new Error('400: Thiếu thông tin định danh Video/Lesson ID.');
  }

  if (videoId === 'unauthorized') {
    throw new Error('403: Sinh viên chưa thanh toán hoặc không có quyền truy cập bài giảng này.');
  }

  if (videoId === 'expired') {
    throw new Error('410: Signed URL bài giảng đã hết hạn truy cập.');
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let effectiveLessonId = videoId;

  // 0. Nếu videoId là ID mẫu cũ ('v-001') hoặc không phải UUID: tự động phân giải mềm sang bài giảng đầu tiên
  if (
    typeof effectiveLessonId === 'string' &&
    !effectiveLessonId.startsWith('http://') &&
    !effectiveLessonId.startsWith('https://') &&
    !effectiveLessonId.startsWith('blob:') &&
    !uuidRegex.test(effectiveLessonId)
  ) {
    try {
      console.warn(`[cryptoService] videoId ("${effectiveLessonId}") là ID cứng/mẫu cũ. Đang tự động phân giải sang bài giảng thực tế từ Backend...`);
      const defaultCourse = await getCourseWithLessons(null);
      const fallbackId =
        defaultCourse?.targetLessonId ||
        defaultCourse?.lessons?.[0]?.id ||
        defaultCourse?.lessons?.[0]?.ID;
      if (fallbackId && uuidRegex.test(fallbackId)) {
        effectiveLessonId = fallbackId;
      }
    } catch {
      // ignore
    }
  }

  // 1. Tự động bảo vệ nếu videoId là Course ID: Tự động chuyển đổi sang Lesson ID thực tế của khóa học
  let isCourse = Boolean(courseId && String(effectiveLessonId).toLowerCase() === String(courseId).toLowerCase());
  if (!isCourse && uuidRegex.test(effectiveLessonId)) {
    try {
      const maybeCourse = await getCourseById(effectiveLessonId);
      if (maybeCourse && (maybeCourse.id || maybeCourse.ID)) {
        isCourse = true;
      }
    } catch {
      // ignore
    }
  }

  if (isCourse) {
    console.warn(`[cryptoService] videoId ("${effectiveLessonId}") là Course ID. Tự động chuyển đổi sang Lesson ID của khóa học...`);
    try {
      const courseDetails = await getCourseWithLessons(effectiveLessonId);
      const firstLessonId =
        courseDetails?.targetLessonId ||
        courseDetails?.lessons?.[0]?.id ||
        courseDetails?.lessons?.[0]?.ID;
      if (firstLessonId && String(firstLessonId).toLowerCase() !== String(effectiveLessonId).toLowerCase()) {
        effectiveLessonId = firstLessonId;
      } else {
        throw new Error(`Khóa học "${effectiveLessonId}" hiện chưa có video bài giảng nào.`);
      }
    } catch (resolveErr) {
      throw new Error(`Không thể phát video: ${resolveErr.message}`);
    }
  }

  // 1. Nếu videoId là một URL trực tiếp hợp lệ từ Backend (http://, https://, blob:)
  if (
    typeof effectiveLessonId === 'string' &&
    (effectiveLessonId.startsWith('http://') || effectiveLessonId.startsWith('https://') || effectiveLessonId.startsWith('blob:'))
  ) {
    return {
      streamUrl: effectiveLessonId,
      expiresAt: Date.now() + 3600000,
    };
  }

  // 2. Gọi PlaybackController Backend: GET /api/v1/lesson/{id}/playback
  try {
    const playbackData = await getLessonPlayback(effectiveLessonId);
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
    console.warn(`[cryptoService] Gọi /lesson/${effectiveLessonId}/playback không thành công, thử tra cứu metadata:`, playbackErr.message);
  }

  // 3. Tra cứu Lesson metadata từ Backend: GET /api/v1/lesson/{id}
  try {
    const res = await apiClient.get(`/lesson/${effectiveLessonId}`);
    const stream = res?.url || res?.videoURL || res?.videoUrl;
    if (stream && (stream.startsWith('http://') || stream.startsWith('https://') || stream.startsWith('blob:'))) {
      return {
        streamUrl: stream,
        expiresAt: Date.now() + 3600000,
      };
    }
  } catch (e) {
    console.warn(`[cryptoService] Không tìm thấy bài học qua GET /lesson/${effectiveLessonId}:`, e.message);
  }

  throw new Error(`404: Không tìm thấy đường dẫn video cho bài giảng "${effectiveLessonId}" trên hệ thống Backend.`);
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
