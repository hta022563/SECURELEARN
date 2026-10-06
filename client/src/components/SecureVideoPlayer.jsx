import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Button,
} from 'react-bootstrap';
import { useSecurePlayer } from '../hooks/useSecurePlayer';
import { useSecureHls } from '../hooks/useSecureHls';

/**
 * Component: SecureVideoPlayer
 * Trình phát video bảo vệ bản quyền nâng cao (Client-Side DRM & Anti-Piracy):
 * - Focus-based Blackout (Tự động phủ đen & pause khi mất tiêu điểm / rời tab / mở Snipping Tool)
 * - Anti-PrintScreen (Ghi đè Clipboard và phủ đen màn hình 3 giây khi chụp màn hình)
 * - Anti-Debugging (Chặn F12, DevTools, Inspect Element, View Source, Copy, Chuột phải)
 * - Chặn Picture-in-Picture & Tải xuống (disablePictureInPicture, nodownload)
 * - Tương thích luồng HLS mã hóa AES-128 & ECDH hoặc Video URL trực tiếp
 */
export default function SecureVideoPlayer({
  videoUrl,
  videoId,
  studentId = 'STUDENT',
  title = 'Bài giảng SecureLearn',
  embedded = false,
}) {
  const videoRef = useRef(null);

  // Hook bảo vệ Client-side: Focus Blackout, Anti-PrintScreen, Anti-Debugging
  const { isScreenHidden, hideReason } = useSecurePlayer(videoRef);

  // Hook xử lý Signed URL HLS và giải mã ECDH (chỉ chạy khi có videoId và không truyền trực tiếp videoUrl)
  const activeVideoId = videoUrl ? null : videoId;
  const { isLoading, error, isReady, securityStatus, reload } = useSecureHls(
    activeVideoId,
    studentId,
    videoRef
  );

  const playerCard = (
    <Card className="card-clean shadow-sm border rounded-4 overflow-hidden bg-white">
      {/* Card Header: Tiêu đề bài giảng */}
      <Card.Header className="bg-white border-bottom py-3 px-4">
        <h5 className="mb-0 fw-bold text-dark text-truncate">
          {title}
        </h5>
      </Card.Header>

      {/* Khung chứa Video & Overlays (Responsive 16:9 Aspect Ratio) */}
      <div
        className="position-relative w-100 bg-black overflow-hidden"
        style={{
          aspectRatio: '16 / 9',
          maxHeight: '75vh',
          minHeight: '260px',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Thẻ Video HTML5 với đầy đủ các thuộc tính bảo mật theo yêu cầu */}
        <video
          ref={videoRef}
          src={videoUrl || undefined}
          className="w-100 h-100 d-block"
          controls
          controlsList="nodownload" // Chặn nút tải xuống trên trình duyệt Chromium
          disablePictureInPicture // Chặn Picture-in-Picture để tránh lách thu nhỏ cửa sổ
          onContextMenu={(e) => e.preventDefault()} // Chặn menu chuột phải trên video
          playsInline
          style={{ objectFit: 'contain' }}
        />

        {/* =========================================================================
            GIAO DIỆN BÔI ĐEN (BLACKOUT OVERLAY): Render khi isScreenHidden === true
            z-index cực cao (9999), nền đen tuyền, che phủ hoàn toàn video
            ========================================================================= */}
        {isScreenHidden && (
          <div
            className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center text-center p-4 user-select-none"
            style={{
              backgroundColor: '#000000',
              zIndex: 9999, // z-index cực cao đè kín hoàn toàn video
            }}
          >
            <div style={{ maxWidth: '480px' }}>
              <h4 className="text-white fw-bold mb-2 text-uppercase tracking-wider">
                Nội dung đã được bảo vệ bản quyền
              </h4>
              <p className="text-secondary small mb-3">
                {hideReason === 'print_screen'
                  ? 'Phát hiện thao tác chụp màn hình (PrintScreen). Hình ảnh đã bị vô hiệu hóa trong Clipboard và màn hình tạm thời bị ẩn trong 3 giây.'
                  : 'Phát hiện mất tiêu điểm cửa sổ hoặc thao tác ghi màn hình. Video đã tạm dừng và phủ đen để bảo vệ nội dung bài giảng.'}
              </p>
              <div className="p-2 border border-secondary border-opacity-25 rounded-3 bg-dark bg-opacity-50">
                <small className="text-light text-opacity-75">
                  Vui lòng quay lại cửa sổ bài học và bấm phát tiếp tục để theo dõi.
                </small>
              </div>
            </div>
          </div>
        )}

        {/* 1. Loading State Overlay (khi tải HLS) */}
        {!videoUrl && isLoading && !error && (
          <div
            className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center bg-black bg-opacity-75"
            style={{ zIndex: 30 }}
          >
            <Spinner
              animation="border"
              variant="primary"
              role="status"
              style={{ width: '3.5rem', height: '3.5rem' }}
            >
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-3 text-light text-center px-3 small">
              {securityStatus}
            </p>
          </div>
        )}

        {/* 2. Error State Overlay (khi tải HLS gặp sự cố) */}
        {!videoUrl && error && (
          <div
            className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3 bg-black bg-opacity-90"
            style={{ zIndex: 40 }}
          >
            <Alert
              variant="danger"
              className="w-100 text-center shadow-lg border-danger mb-0"
              style={{ maxWidth: '520px' }}
            >
              <Alert.Heading className="fs-5 fw-bold mb-2">
                <i className="bi bi-shield-x me-2"></i>Không Thể Phát Video Bảo Mật
              </Alert.Heading>
              <p className="small mb-3">{error}</p>
              <hr className="my-2 border-danger opacity-25" />
              <div className="d-flex justify-content-center gap-2">
                <Button variant="outline-danger" size="sm" onClick={reload}>
                  Thử Lại (Retry)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Tải Lại Trang
                </Button>
              </div>
            </Alert>
          </div>
        )}

        {/* 3. Dynamic Watermark Overlay */}
        {(!isLoading || videoUrl) && !error && (
          <DynamicWatermark studentId={studentId} />
        )}
      </div>
    </Card>
  );

  if (embedded) {
    return playerCard;
  }

  return (
    <Container fluid="md" className="py-4 securelearn-player-container">
      <Row className="justify-content-center">
        <Col xs={12} lg={10} xl={9}>
          {playerCard}
        </Col>
      </Row>
    </Container>
  );
}

SecureVideoPlayer.propTypes = {
  videoUrl: PropTypes.string,
  videoId: PropTypes.string,
  studentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  title: PropTypes.string,
  embedded: PropTypes.bool,
};

/**
 * Component: DynamicWatermark (Lớp phủ chống quay lén)
 * - Cố định góc trên bên phải
 * - Làm mờ (opacity thấp)
 */
function DynamicWatermark({ studentId }) {
  return (
    <div
      className="position-absolute user-select-none"
      style={{
        top: '12px',
        right: '14px',
        color: 'rgba(255, 255, 255, 0.45)',
        fontSize: '13px',
        fontWeight: '600',
        textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
        zIndex: 50,
        pointerEvents: 'none',
        lineHeight: 1.5,
        textAlign: 'right',
      }}
    >
      User: {studentId} <br /> SecureLearn
    </div>
  );
}
