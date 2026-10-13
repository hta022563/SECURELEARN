import apiClient from '../api/axiosClient.js';

/**
 * =============================================================================
 * SECURELEARN - PLAYBACK SERVICE (100% BACKEND SPRING BOOT API)
 * =============================================================================
 * Tích hợp trực tiếp với PlaybackController.java phía Spring Boot:
 * Base URL: http://localhost:8080/api/v1
 *
 * 1. Khởi tạo phiên phát video bảo mật (Protected Endpoint):
 *    - GET /api/v1/lesson/{id}/playback
 *    - Yêu cầu: Bearer Token qua Header Authorization (Cognito JWT)
 *    - Backend kiểm tra phân quyền:
 *        + Role ADMIN hoặc INSTRUCTOR: Toàn quyền truy cập
 *        + Role STUDENT: Phải có quyền trong CourseEntitlementService
 *    - Trả về:
 *        {
 *          "playbackUrl": "http://localhost:8080/api/v1/lesson/{id}/manifest?token=...",
 *          "expiresAt": 1728888888000
 *        }
 *        (Hoặc Presigned R2 URL đối với video MP4, hoặc HTTPS URL đối với link ngoài)
 *
 * 2. Tải Playlist HLS Manifest được ký bảo mật (Public with HMAC Token):
 *    - GET /api/v1/lesson/{id}/manifest?token={token}
 *    - Backend đọc file .m3u8 từ Cloudflare R2, ký từng đoạn .ts bằng R2 Presigned GET URLs
 *    - Trả về: text/plain (.m3u8 playlist) có hiệu lực ngắn hạn.
 * =============================================================================
 */

/**
 * Lấy URL phát video bảo mật từ Backend PlaybackController
 *
 * @param {string} lessonId - UUID của bài học (Lesson ID)
 * @returns {Promise<{ playbackUrl: string, expiresAt: number }>}
 */
export async function getLessonPlayback(lessonId) {
  if (!lessonId) {
    throw new Error('400: Lesson ID không được để trống.');
  }

  try {
    const response = await apiClient.get(`/lesson/${lessonId}/playback`);
    
    // axiosClient response interceptor returns response.data directly
    const playbackUrl = response?.playbackUrl;
    const expiresAt = response?.expiresAt || Date.now() + 2 * 3600 * 1000;

    if (!playbackUrl) {
      throw new Error('Backend không trả về playbackUrl hợp lệ.');
    }

    return {
      playbackUrl,
      expiresAt,
    };
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message;

    if (status === 401) {
      throw new Error('401: Phiên đăng nhập đã hết hạn hoặc chưa xác thực.');
    } else if (status === 403) {
      throw new Error('403: Bạn chưa được cấp quyền (Entitlement) để xem bài giảng này.');
    } else if (status === 404) {
      throw new Error(`404: Không tìm thấy bài giảng hoặc video của bài học "${lessonId}".`);
    }

    throw new Error(`Lỗi khởi tạo phát video: ${message}`);
  }
}

/**
 * Xây dựng URL manifest với token ký bảo mật
 * 
 * @param {string} lessonId - UUID của bài học
 * @param {string} token - HMAC token cấp từ backend
 * @returns {string} URL manifest hoàn chỉnh
 */
export function buildManifestUrl(lessonId, token) {
  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8080/api/v1';
  return `${baseUrl}/lesson/${lessonId}/manifest?token=${encodeURIComponent(token)}`;
}

export default {
  getLessonPlayback,
  buildManifestUrl,
};
