import axios from 'axios';
import apiClient from '../api/axiosClient';

/**
 * =============================================================================
 * SECURELEARN - VIDEO UPLOAD SERVICE (100% BACKEND SPRING BOOT & CLOUDFLARE R2)
 * =============================================================================
 * Quy trình upload video bài học chuẩn thực tế:
 * 
 * Bước 1: POST /api/v1/upload/presign
 *   - Gửi: { fileName, contentType, courseId }
 *   - Nhận: { uploadUrl, objectKey } (Presigned PUT URL cấp quyền tải trực tiếp lên Cloudflare R2)
 * 
 * Bước 2: Direct HTTP PUT lên Cloudflare R2
 *   - Client tải trực tiếp file binary lên uploadUrl của Cloudflare R2
 *   - Lắng nghe tiến độ thực qua Axios onUploadProgress (loaded, total, %)
 * 
 * Bước 3: POST /api/v1/upload/process
 *   - Gửi: { objectKey, title, description, chapterId, courseId }
 *   - Backend Spring Boot tải file từ R2 -> Chạy FFmpeg chuyển mã sang HLS (AES-128)
 *     -> Đẩy playlist và các segment .ts lên R2
 *     -> Tự động lưu bản ghi Lesson vào Database
 *   - Nhận: { lessonId, playlistUrl }
 * =============================================================================
 */

/**
 * Bước 1: Gọi Backend Spring Boot xin Presigned URL để tải trực tiếp lên Cloudflare R2
 * 
 * @param {Object} params
 * @param {string} params.fileName Tên file video (vd: "bai-hoc-1.mp4")
 * @param {string} params.contentType Định dạng MIME (vd: "video/mp4")
 * @param {string} [params.courseId] UUID của khóa học (để phân vùng thư mục trên R2)
 * @returns {Promise<{ uploadUrl: string, objectKey: string }>}
 */
export async function getPresignedUploadUrl({ fileName, contentType, courseId }) {
  const payload = {
    fileName,
    contentType: contentType || 'video/mp4',
    courseId: courseId || null,
  };

  const response = await apiClient.post('/upload/presign', payload);
  return {
    uploadUrl: response.uploadUrl,
    objectKey: response.objectKey,
  };
}

/**
 * Bước 2: Tải trực tiếp file video lên Cloudflare R2 qua Presigned PUT URL
 * 
 * @param {string} uploadUrl URL Presigned từ Bước 1
 * @param {File} file Đối tượng File video từ trình duyệt
 * @param {Function} [onProgress] Callback nhận tiến độ thực: (percent, loadedBytes, totalBytes)
 * @returns {Promise<void>}
 */
export async function uploadFileToR2(uploadUrl, file, onProgress) {
  await axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': file.type || 'video/mp4',
    },
    onUploadProgress: (progressEvent) => {
      if (typeof onProgress === 'function' && progressEvent.total) {
        const percent = Math.min(100, Math.round((progressEvent.loaded * 100) / progressEvent.total));
        onProgress(percent, progressEvent.loaded, progressEvent.total);
      }
    },
  });
}

/**
 * Bước 3: Thông báo Backend Spring Boot xử lý phân đoạn HLS và lưu vào Database
 * 
 * @param {Object} params
 * @param {string} params.objectKey Đường dẫn file trên R2 nhận từ Bước 1
 * @param {string} params.title Tiêu đề bài giảng
 * @param {string} params.description Mô tả bài giảng
 * @param {string} params.chapterId UUID chương học
 * @param {string} params.courseId UUID khóa học
 * @returns {Promise<{ lessonId: string, playlistUrl: string }>}
 */
export async function processVideoOnBackend({ objectKey, title, description, chapterId, courseId }) {
  const payload = {
    objectKey,
    title: title || 'Bài giảng mới',
    description: description || `Nội dung video bài học: ${title}`,
    chapterId,
    courseId,
  };

  const response = await apiClient.post('/upload/process', payload);
  return {
    lessonId: response.lessonId,
    playlistUrl: response.playlistUrl,
  };
}

/**
 * Hàm tích hợp trọn gói: Upload video thật lên Backend Spring Boot & Cloudflare R2
 * Toàn bộ dữ liệu xử lý trực tiếp qua Backend, KHÔNG dùng mô phỏng.
 * 
 * @param {File} file File video cần tải lên
 * @param {Object} metadata Dữ liệu { title, description, courseId, chapterId, chapterNumber }
 * @param {Object} callbacks Các hàm callback cập nhật tiến độ
 * @param {Function} callbacks.onUploadProgress Tiến độ upload R2 (percent, loaded, total)
 * @param {Function} callbacks.onProcessing Báo hiệu chuyển sang bước mã hóa FFmpeg HLS trên Backend
 * @returns {Promise<{ lessonId: string, playlistUrl: string, isRealBackend: boolean }>}
 */
export async function uploadVideoPipeline(file, metadata, callbacks = {}) {
  const { onUploadProgress, onProcessing } = callbacks;

  // 1. Xin Presigned URL từ Backend Spring Boot
  const { uploadUrl, objectKey } = await getPresignedUploadUrl({
    fileName: file.name,
    contentType: file.type || 'video/mp4',
    courseId: metadata.courseId,
  });

  // 2. Upload file trực tiếp lên R2 với thanh tiến độ thực từ bytes truyền đi
  await uploadFileToR2(uploadUrl, file, onUploadProgress);

  // 3. Thông báo Backend chạy pipeline FFmpeg -> HLS và lưu DB
  if (typeof onProcessing === 'function') {
    onProcessing();
  }

  const processResult = await processVideoOnBackend({
    objectKey,
    title: metadata.title,
    description: metadata.description || `Bài giảng ${metadata.title}`,
    chapterId: metadata.chapterId,
    courseId: metadata.courseId,
  });

  return {
    lessonId: processResult.lessonId,
    playlistUrl: processResult.playlistUrl,
    isRealBackend: true,
    fileId: processResult.lessonId,
    streamUrl: processResult.playlistUrl,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };
}
