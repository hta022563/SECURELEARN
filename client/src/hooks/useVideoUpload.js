import { useState, useRef, useEffect, useCallback } from 'react';
import { simulateR2Upload, simulateHlsProcessing } from '../services/uploadService';

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
 * Quản lý State Machine cho quá trình upload:
 * Idle -> Uploading (0% -> 100%) -> Processing (Mã hóa HLS) -> Ready
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
   * Bắt đầu quy trình Upload & Transcode theo từng phần nhỏ
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
      setError(null);
      setShowSuccessNotification(false);

      // 2. Chạy mô phỏng Chunked Upload lên Cloudflare R2 với progress bar
      const uploadResult = await simulateR2Upload(
        file,
        metadata,
        (currentProgress, loaded, total, currentChunk, totalChunks) => {
          if (!isMountedRef.current) return;
          setProgress(currentProgress);
          setUploadStats({ loaded, total });
          setChunkStats({ current: currentChunk, total: totalChunks });
        }
      );

      if (!isMountedRef.current) return;

      // 3. Chuyển sang trạng thái PROCESSING (Server transcode & AES-128 HLS phân đoạn)
      setStatus(UPLOAD_STATUS.PROCESSING);

      const processingResult = await simulateHlsProcessing(
        uploadResult.fileId,
        (seg, totalSeg) => {
          if (!isMountedRef.current) return;
          setSegmentStats({ current: seg, total: totalSeg });
        }
      );

      if (!isMountedRef.current) return;

      // 4. Chuyển sang trạng thái READY
      setStatus(UPLOAD_STATUS.READY);
      const combinedResult = {
        ...processingResult,
        videoRecord: {
          ID: uploadResult.fileId,
          Title: metadata.title,
          Length: uploadResult.length,
          Size: uploadResult.size,
          UploadTime: uploadResult.uploadedAt,
          UploadedBy: metadata.uploadedBy || 'u-002',
          AccessLogID: metadata.accessLogId || 'al-001',
          AnomalyAlertID: null,
          chapterId: metadata.chapterId,
          chapterNumber: metadata.chapterNumber,
          courseId: metadata.courseId,
        },
      };

      setSuccessInfo(combinedResult);
      setShowSuccessNotification(true);

      // Kích hoạt callback thông báo cho component ngoài cập nhật Cây bài học
      if (typeof onComplete === 'function') {
        onComplete(combinedResult.videoRecord);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('[Upload Error]', err);
      setStatus(UPLOAD_STATUS.ERROR);
      setError(err.message || 'Đã xảy ra lỗi trong quá trình tải video lên.');
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
