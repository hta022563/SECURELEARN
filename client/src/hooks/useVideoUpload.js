import { useState, useRef, useEffect, useCallback } from 'react';
import { uploadVideoPipeline } from '../services/uploadService';

/**
 * Các trạng thái trong vòng đời Upload video lên Cloudflare R2
 */
export const UPLOAD_STATUS = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  READY: 'ready',
  ERROR: 'error',
};

/**
 * Custom Hook: useVideoUpload
 * 
 * Quản lý quy trình upload video kết nối 100% Backend Spring Boot & Cloudflare R2:
 * 1. Xin Presigned URL từ Backend: POST /api/v1/upload/presign
 * 2. Upload trực tiếp file lên Cloudflare R2 với tiến độ phần trăm byte thực
 * 3. Báo Backend xử lý HLS (FFmpeg) và lưu vào Database: POST /api/v1/upload/process
 * 
 * KHÔNG dùng mô phỏng. Bắt buộc gọi Backend API thực tế.
 * 
 * @returns {Object} Các state và action điều khiển upload
 */
export function useVideoUpload() {
  const [status, setStatus] = useState(UPLOAD_STATUS.IDLE);
  const [progress, setProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState({ loaded: 0, total: 0 });
  const [chunkStats, setChunkStats] = useState({ current: 1, total: 1 });
  const [segmentStats, setSegmentStats] = useState({ current: 1, total: 8 });
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // useRef kiểm soát unmount để tránh memory leak khi component bị hủy giữa chừng
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Bắt đầu quy trình Upload & Transcode qua Backend API
   * 
   * @param {File} file Đối tượng File video
   * @param {Object} metadata Dữ liệu bài giảng { title, description, courseId, chapterId, chapterNumber }
   * @param {Function} onComplete Callback gọi khi hoàn thành để cập nhật danh mục ngoài UI
   */
  const startUpload = useCallback(async (file, metadata, onComplete) => {
    if (!file) {
      setError('Vui lòng chọn file video trước khi upload.');
      return;
    }

    try {
      // 1. Chuyển sang trạng thái UPLOADING
      setStatus(UPLOAD_STATUS.UPLOADING);
      setProgress(0);
      setUploadStats({ loaded: 0, total: file.size || 0 });
      setError(null);
      setShowSuccessNotification(false);

      // GỌI 100% BACKEND SPRING BOOT API THẬT
      const backendUploadResult = await uploadVideoPipeline(file, metadata, {
        onUploadProgress: (currentProgress, loaded, total) => {
          if (!isMountedRef.current) return;
          setProgress(currentProgress);
          setUploadStats({ loaded, total });
        },
        onProcessing: () => {
          if (!isMountedRef.current) return;
          // 2. Chuyển sang trạng thái PROCESSING (Server Spring Boot transcode HLS & lưu DB)
          setStatus(UPLOAD_STATUS.PROCESSING);
        },
      });

      if (!isMountedRef.current) return;

      const resultRecord = {
        ID: backendUploadResult.lessonId,
        id: backendUploadResult.lessonId,
        Title: metadata.title,
        Length: Math.floor((file.size / (1024 * 1024)) * 30) || 600,
        Size: file.size,
        UploadTime: backendUploadResult.uploadedAt,
        UploadedBy: metadata.uploadedBy || 'Giảng viên',
        AccessLogID: metadata.accessLogId || 'al-001',
        AnomalyAlertID: null,
        chapterId: metadata.chapterId,
        chapterNumber: metadata.chapterNumber,
        courseId: metadata.courseId,
        videoUrl: backendUploadResult.playlistUrl,
        streamUrl: backendUploadResult.playlistUrl,
        url: backendUploadResult.playlistUrl,
        fromBackendProcess: true, // Đã được backend tạo trực tiếp trong CSDL
      };

      // 3. Chuyển sang trạng thái READY
      setStatus(UPLOAD_STATUS.READY);
      const combinedResult = {
        videoRecord: resultRecord,
      };

      setSuccessInfo(combinedResult);
      setShowSuccessNotification(true);

      // Kích hoạt callback thông báo cho component ngoài cập nhật Cây bài học
      if (typeof onComplete === 'function') {
        onComplete(combinedResult.videoRecord);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('[Upload Error - Backend API]', err);
      setStatus(UPLOAD_STATUS.ERROR);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Không thể kết nối hoặc tải video lên Backend (http://localhost:8080).';
      setError(errorMsg);
    }
  }, []);

  // Reset về trạng thái ban đầu
  const resetUpload = useCallback(() => {
    setStatus(UPLOAD_STATUS.IDLE);
    setProgress(0);
    setUploadStats({ loaded: 0, total: 0 });
    setError(null);
    setSuccessInfo(null);
    setShowSuccessNotification(false);
  }, []);

  const closeNotification = useCallback(() => {
    setShowSuccessNotification(false);
  }, []);

  const isBusy = status === UPLOAD_STATUS.UPLOADING || status === UPLOAD_STATUS.PROCESSING;

  return {
    status,
    progress,
    uploadStats,
    chunkStats,
    segmentStats,
    error,
    setError,
    successInfo,
    showSuccessNotification,
    closeNotification,
    startUpload,
    resetUpload,
    isBusy,
  };
}
