import axios from 'axios';
import apiClient from '../api/axiosClient';

/**
 * =============================================================================
 * SECURELEARN - VIDEO UPLOAD SERVICE (TÍCH HỢP 100% BACKEND SPRING BOOT & R2)
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
 * Có fallback tự động nếu Backend đang offline (để môi trường dev không bị crash hoàn toàn)
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

  try {
    // 1. Xin Presigned URL từ Backend Spring Boot
    const { uploadUrl, objectKey } = await getPresignedUploadUrl({
      fileName: file.name,
      contentType: file.type || 'video/mp4',
      courseId: metadata.courseId,
    });

    // 2. Upload file trực tiếp lên R2 với thanh tiến độ thực
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
  } catch (backendError) {
    console.warn('[uploadService] Lỗi khi gọi Backend API thật:', backendError);
    throw backendError;
  }
}

/**
 * =============================================================================
 * HÀM MÔ PHỎNG DỰ PHÒNG (FALLBACK KHI DEV OFFLINE KHÔNG CÓ BACKEND HOẶC R2)
 * =============================================================================
 */

/**
 * Mô phỏng upload R2 dự phòng (chỉ dùng khi Backend offline hoàn toàn)
 */
export function simulateR2Upload(file, metadata, onProgress) {
  return new Promise((resolve) => {
    const totalSize = file ? file.size : 35 * 1024 * 1024;
    const CHUNK_SIZE = 5 * 1024 * 1024;
    const totalChunks = Math.max(1, Math.ceil(totalSize / CHUNK_SIZE));
    let currentChunk = 1;
    let currentPercent = 0;

    const interval = setInterval(() => {
      const step = Math.floor(Math.random() * 8) + 5;
      currentPercent = Math.min(100, currentPercent + step);
      currentChunk = Math.min(totalChunks, Math.max(1, Math.ceil((currentPercent / 100) * totalChunks)));
      const loadedBytes = Math.floor((currentPercent / 100) * totalSize);

      if (typeof onProgress === 'function') {
        onProgress(currentPercent, loadedBytes, totalSize, currentChunk, totalChunks);
      }

      if (currentPercent >= 100) {
        clearInterval(interval);
        resolve({
          fileId: `v-${Date.now().toString().slice(-4)}`,
          fileName: file ? file.name : `${metadata.title || 'lesson'}.mp4`,
          size: totalSize,
          length: Math.floor(Math.random() * 600) + 600,
          uploadedAt: new Date().toISOString(),
          metadata,
        });
      }
    }, 120);
  });
}

/**
 * Mô phỏng hàng đợi xử lý mã hóa HLS dự phòng
 */
export function simulateHlsProcessing(fileId, onSegmentProgress) {
  return new Promise((resolve) => {
    let seg = 1;
    const totalSegments = 8;
    const segInterval = setInterval(() => {
      if (typeof onSegmentProgress === 'function') {
        onSegmentProgress(seg, totalSegments);
      }
      seg++;
      if (seg > totalSegments) {
        clearInterval(segInterval);
        resolve({
          fileId,
          streamUrl: `https://drm.securelearn.edu/stream/${fileId}/master.m3u8`,
          status: 'ready',
          drmType: 'HLS-AES-128',
        });
      }
    }, 200);
  });
}
