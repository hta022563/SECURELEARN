import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { RefreshCw, X, Clock, HardDrive, AlertTriangle, UploadCloud, FileVideo, CheckCircle2, Loader2 } from 'lucide-react';
import { getPresignedUploadUrl, uploadFileToR2 } from '../services/uploadService';
import { reuploadVideo } from '../services/courseService';
import { useToast } from '../context/ToastContext';

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '0 phút';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m} phút ${s > 0 ? `${s}s` : ''}`.trim();
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

/**
 * =============================================================================
 * COMPONENT: ReuploadVideoModal (Pure Tailwind CSS Modal)
 * =============================================================================
 */
export default function ReuploadVideoModal({ show, onHide, video, onSuccess }) {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [segmentInfo] = useState({ current: 0, total: 8 });
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (show && video) {
      setSelectedFile(null);
      setNewTitle(video.Title || video.title || '');
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage('');
      setErrorMessage('');
    }
  }, [show, video]);

  if (!show) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|mkv|webm|avi)$/i)) {
        setErrorMessage('Vui lòng chọn file định dạng video (.mp4, .mov, .mkv, .webm)');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setErrorMessage('');
    }
  };

  const handleStartReupload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Vui lòng chọn file video mới để thay thế.');
      return;
    }

    if (!newTitle.trim()) {
      setErrorMessage('Tiêu đề bài học không được để trống.');
      return;
    }

    setIsUploading(true);
    setErrorMessage('');
    setUploadProgress(0);
    setUploadStage('uploading');

    try {
      const { uploadUrl, objectKey } = await getPresignedUploadUrl({
        fileName: selectedFile.name,
        contentType: selectedFile.type || 'video/mp4',
        courseId: video.courseId || video.CoursesID || null,
      });

      await uploadFileToR2(uploadUrl, selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      setUploadStage('processing');
      const updatedUrl = `https://stream.securelearn.edu/${objectKey}`;
      const updatedRecord = await reuploadVideo(video.ID, {
        url: updatedUrl,
        videoURL: updatedUrl,
        title: newTitle.trim(),
      });

      setUploadStage('done');
      showToast(
        `Đã tải lên và thay thế video "${newTitle.trim()}" trên Backend thành công!`,
        'success',
        'Thay Thế Video Thành Công'
      );

      if (onSuccess) {
        onSuccess(
          updatedRecord || {
            ...video,
            Title: newTitle.trim(),
            Length: 1500,
            Size: selectedFile.size,
            UploadTime: new Date().toISOString(),
          }
        );
      }

      setTimeout(() => {
        onHide();
      }, 700);
    } catch (err) {
      setErrorMessage(err.message || 'Có lỗi xảy ra trong quá trình thay thế video.');
      setUploadStage('');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <RefreshCw className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Tải Lên Lại / Thay Thế Video Bài Học
            </h3>
          </div>
          {!isUploading && (
            <button
              type="button"
              onClick={onHide}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleStartReupload} className="mt-4 space-y-4">
          {/* Thông tin bài học hiện tại */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Bài học hiện tại: <code className="text-blue-600 dark:text-blue-400 font-semibold">{video?.ID}</code>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                Bảo vệ DRM
              </span>
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1.5">{video?.Title}</h4>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                Thời lượng cũ: {formatDuration(video?.Length)}
              </span>
              <span className="flex items-center gap-1">
                <HardDrive className="h-3.5 w-3.5 text-slate-400" />
                Dung lượng cũ: {formatBytes(video?.Size)}
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Vùng upload file mới */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Chọn File Video Mới Thay Thế <span className="text-rose-500">*</span>
            </label>

            <div
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                selectedFile
                  ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/40 dark:bg-slate-800/30'
              } ${isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/x-m4v,video/*,.mkv,.webm"
                className="hidden"
                disabled={isUploading}
                onChange={handleFileChange}
              />

              {selectedFile ? (
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 mb-2">
                    <FileVideo className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{selectedFile.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Dung lượng: {formatBytes(selectedFile.size)} • Định dạng: {selectedFile.type || 'video/mp4'}
                  </p>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Đổi file khác
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 mb-2">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Kéo &amp; thả file video vào đây hoặc bấm để chọn
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Hỗ trợ định dạng MP4, MKV, MOV, WebM (Khuyên dùng chuẩn 1080p H.264)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tiêu đề bài học */}
          <div>
            <label htmlFor="reuploadTitle" className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Tiêu Đề Bài Giảng
            </label>
            <input
              id="reuploadTitle"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nhập tiêu đề bài giảng..."
              disabled={isUploading}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
            />
            <span className="block mt-1 text-[11px] text-slate-400">
              Bạn có thể cập nhật tiêu đề mới hoặc giữ nguyên tiêu đề hiện tại.
            </span>
          </div>

          {/* Khung hiển thị tiến trình khi đang upload / mã hóa */}
          {isUploading && (
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  {uploadStage === 'uploading' && 'Đang tải video mới lên Cloudflare R2...'}
                  {uploadStage === 'processing' && (
                    <span>
                      Đang mã hóa HLS AES-128 (Phân đoạn {segmentInfo.current}/{segmentInfo.total})...
                    </span>
                  )}
                  {uploadStage === 'done' && 'Đã hoàn tất thay thế video!'}
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {uploadStage === 'uploading' ? `${uploadProgress}%` : '100%'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    uploadStage === 'done' ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${uploadStage === 'uploading' ? uploadProgress : 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Cơ chế bảo mật: AES-128 Encryption</span>
                <span>Chữ ký: ECDH P-256</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onHide}
              disabled={isUploading}
              className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:shadow-lg disabled:opacity-50 transition-all"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang Xử Lý...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Bắt Đầu Thay Video</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

ReuploadVideoModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  video: PropTypes.object,
  onSuccess: PropTypes.func,
};
