import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Modal,
  Button,
  Form,
  ProgressBar,
  Alert,
  Badge,
  Spinner,
} from 'react-bootstrap';
import { simulateR2Upload, simulateHlsProcessing } from '../services/uploadService';
import { reuploadVideo } from '../services/courseService';
import { useToast } from '../context/ToastContext';

/**
 * Helper format thời lượng từ giây sang mm:ss hoặc X phút
 */
function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '0 phút';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m} phút ${s > 0 ? `${s}s` : ''}`.trim();
}

/**
 * Helper format dung lượng từ bytes sang MB / GB
 */
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
 * COMPONENT: ReuploadVideoModal
 * =============================================================================
 * Cho phép Giảng viên tải lên và thay thế file video khác cho một bài giảng đã có:
 * - Giữ nguyên mã bài giảng (ID), cấu trúc chương và vị trí trong giáo trình
 * - Tự động mã hóa phân đoạn HLS AES-128 mới cho file thay thế
 * - Cập nhật dung lượng, thời lượng và thời gian tải lên mới
 * =============================================================================
 */
export default function ReuploadVideoModal({ show, onHide, video, onSuccess }) {
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState(''); // 'uploading' | 'processing' | 'done' | ''
  const [segmentInfo, setSegmentInfo] = useState({ current: 0, total: 8 });
  const [errorMessage, setErrorMessage] = useState('');

  // Khởi tạo khi mở modal
  React.useEffect(() => {
    if (show && video) {
      setSelectedFile(null);
      setNewTitle(video.Title || video.title || '');
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage('');
      setErrorMessage('');
    }
  }, [show, video]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Kiểm tra định dạng video
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
      // 1. Mô phỏng upload file mới lên Cloudflare R2
      const uploadResult = await simulateR2Upload(
        selectedFile,
        {
          title: newTitle.trim(),
          fileId: video.ID,
        },
        (progress) => {
          setUploadProgress(progress);
        }
      );

      // 2. Chuyển sang giai đoạn mã hóa HLS AES-128
      setUploadStage('processing');
      await simulateHlsProcessing(uploadResult.fileId, (seg, totalSeg) => {
        setSegmentInfo({ current: seg, total: totalSeg });
      });

      // 3. Hoàn tất cập nhật vào cơ sở dữ liệu mềm
      setUploadStage('done');
      const updatedRecord = await reuploadVideo(video.ID, {
        title: newTitle.trim(),
        length: uploadResult.length || 1500,
        size: selectedFile.size,
      });

      showToast(
        `Đã tải lên và thay thế video "${newTitle.trim()}" thành công!`,
        'success',
        'Thay Thế Video Thành Công'
      );

      if (onSuccess) {
        onSuccess(updatedRecord || {
          ...video,
          Title: newTitle.trim(),
          Length: uploadResult.length || 1500,
          Size: selectedFile.size,
          UploadTime: new Date().toISOString(),
        });
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
    <Modal
      show={show}
      onHide={isUploading ? undefined : onHide}
      centered
      backdrop={isUploading ? 'static' : true}
      size="lg"
    >
      <Modal.Header closeButton={!isUploading} className="border-bottom bg-light">
        <Modal.Title className="fs-5 fw-bold text-dark d-flex align-items-center gap-2">
          <i className="bi bi-arrow-repeat text-primary fs-4"></i>
          <span>Tải Lên Lại / Thay Thế Video Bài Học</span>
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleStartReupload}>
        <Modal.Body className="p-4">
          {/* Thông tin bài học hiện tại */}
          <div className="p-3 bg-light rounded-3 border mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
              <span className="small text-muted">
                Bài học hiện tại: <code>{video?.ID}</code>
              </span>
              <Badge bg="secondary" className="px-2 py-1 rounded-pill fw-normal">
                Bảo vệ DRM
              </Badge>
            </div>
            <h6 className="fw-bold text-dark mb-1">{video?.Title}</h6>
            <div className="small text-secondary d-flex gap-3">
              <span>
                <i className="bi bi-clock me-1 text-primary"></i>
                Thời lượng cũ: {formatDuration(video?.Length)}
              </span>
              <span>
                <i className="bi bi-hdd me-1 text-secondary"></i>
                Dung lượng cũ: {formatBytes(video?.Size)}
              </span>
            </div>
          </div>

          {errorMessage && (
            <Alert variant="danger" className="py-2 small">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {errorMessage}
            </Alert>
          )}

          {/* Vùng chọn file video mới */}
          <div className="mb-4">
            <label className="form-label fw-bold text-dark small">
              Chọn File Video Mới Thay Thế *
            </label>

            <div
              className={`border border-2 rounded-4 p-4 text-center ${selectedFile ? 'border-primary bg-primary bg-opacity-10' : 'border-dashed bg-white'
                }`}
              style={{
                cursor: isUploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/x-m4v,video/*,.mkv,.webm"
                className="d-none"
                disabled={isUploading}
                onChange={handleFileChange}
              />

              {selectedFile ? (
                <div>
                  <i className="bi bi-file-earmark-play-fill text-primary display-5 mb-2 d-block"></i>
                  <h6 className="fw-bold text-dark mb-1">{selectedFile.name}</h6>
                  <p className="small text-muted mb-0">
                    Dung lượng mới: {formatBytes(selectedFile.size)} • Định dạng: {selectedFile.type || 'video/mp4'}
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-primary text-decoration-none p-0 mt-2"
                    disabled={isUploading}
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Đổi file khác
                  </Button>
                </div>
              ) : (
                <div>
                  <i className="bi bi-cloud-arrow-up text-primary display-5 mb-2 d-block"></i>
                  <h6 className="fw-bold text-dark mb-1">Kéo &amp; thả file video vào đây hoặc bấm để chọn</h6>
                  <p className="small text-muted mb-0">
                    Hỗ trợ định dạng MP4, MKV, MOV, WebM (Khuyên dùng chuẩn 1080p H.264)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tiêu đề bài học */}
          <div className="mb-3">
            <label className="form-label fw-bold text-dark small">
              Tiêu Đề Bài Giảng
            </label>
            <Form.Control
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nhập tiêu đề bài giảng..."
              disabled={isUploading}
              className="form-control-clean"
            />
            <Form.Text className="text-muted small">
              Bạn có thể cập nhật tiêu đề mới hoặc giữ nguyên tiêu đề hiện tại.
            </Form.Text>
          </div>

          {/* Khung hiển thị tiến trình khi đang upload / mã hóa */}
          {isUploading && (
            <div className="p-3 bg-light rounded-3 border mt-3">
              <div className="d-flex justify-content-between align-items-center mb-2 small">
                <span className="fw-bold text-dark d-flex align-items-center gap-2">
                  <Spinner animation="border" size="sm" variant="primary" />
                  {uploadStage === 'uploading' && 'Đang tải video mới lên Cloudflare R2...'}
                  {uploadStage === 'processing' && (
                    <span>
                      Đang mã hóa HLS AES-128 (Phân đoạn {segmentInfo.current}/{segmentInfo.total})...
                    </span>
                  )}
                  {uploadStage === 'done' && 'Đã hoàn tất thay thế video!'}
                </span>
                <span className="fw-bold text-primary font-monospace">
                  {uploadStage === 'uploading' ? `${uploadProgress}%` : '100%'}
                </span>
              </div>

              <ProgressBar
                now={uploadStage === 'uploading' ? uploadProgress : 100}
                variant={uploadStage === 'done' ? 'success' : 'primary'}
                animated={uploadStage !== 'done'}
                style={{ height: '8px' }}
                className="rounded-pill"
              />

              <div className="mt-2 small text-muted d-flex justify-content-between">
                <span>Cơ chế bảo mật: AES-128 Encryption</span>
                <span>Chữ ký: ECDH P-256</span>
              </div>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className="border-top bg-light">
          <Button
            variant="secondary"
            onClick={onHide}
            disabled={isUploading}
            className="rounded-pill px-4"
          >
            Hủy
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isUploading || !selectedFile}
            className="btn-primary-pill px-4 d-inline-flex align-items-center gap-2"
          >
            {isUploading ? (
              <>
                <Spinner animation="border" size="sm" />
                <span>Đang Xử Lý...</span>
              </>
            ) : (
              <>
                <i className="bi bi-cloud-check-fill"></i>
                <span>Bắt Đầu Thay Video</span>
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

ReuploadVideoModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  video: PropTypes.object,
  onSuccess: PropTypes.func,
};
