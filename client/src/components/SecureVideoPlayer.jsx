import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Badge,
  Button,
} from 'react-bootstrap';
import { useSecureHls } from '../hooks/useSecureHls';

/**
 * Component: SecureVideoPlayer
 * 
 * Trình phát video bảo vệ bản quyền DRM nội bộ SecureLearn:
 * - HLS AES-128 mã hóa đầu cuối.
 * - Trao đổi khóa bảo mật ECDH qua Web Crypto API can thiệp fLoader của HLS.js.
 * - Giao diện chuẩn React-Bootstrap responsive cho máy tính và di động.
 * 
 * @param {Object} props
 * @param {string} props.videoId ID video bài giảng
 * @param {string|number} props.studentId ID sinh viên xem video
 * @param {string} [props.title] Tiêu đề bài giảng
 */
export default function SecureVideoPlayer({
  videoId,
  studentId,
  title = 'Bài giảng SecureLearn',
  embedded = false,
}) {
  const videoRef = useRef(null);

  // Hook xử lý Signed URL, fLoader HLS.js và Handshake ECDH
  const { isLoading, error, isReady, securityStatus, reload } = useSecureHls(
    videoId,
    studentId,
    videoRef
  );

  const playerCard = (
    <Card className="card-clean shadow-sm border rounded-4 overflow-hidden bg-white">
      {/* Card Header: Tiêu đề và Badges trạng thái DRM */}
      <Card.Header className="bg-white border-bottom py-3 px-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="d-flex align-items-center gap-2">
          <span className="badge-status-ready">● DRM Protected</span>
          <h5 className="mb-0 text-truncate fw-bold text-dark" style={{ maxWidth: '420px' }}>
            {title}
          </h5>
        </div>

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="badge-status-ready">HLS AES-128</span>
          <span className="badge-pill-cyan">ECDH P-256</span>
          <span className="badge bg-light text-secondary border rounded-pill px-3 py-2">
            ID: {studentId}
          </span>
        </div>
      </Card.Header>

            {/* Khung chứa Video & Overlays (Responsive 16:9 Aspect Ratio) */}
            <div
              className="position-relative w-100 bg-black overflow-hidden"
              style={{
                aspectRatio: '16 / 9',
                maxHeight: '75vh',
                minHeight: '260px',
              }}
            >
              {/* Thẻ Video HTML5 */}
              <video
                ref={videoRef}
                className="w-100 h-100 d-block"
                controls
                controlsList="nodownload" // Chặn nút tải xuống trên trình duyệt Chromium
                playsInline
                style={{ objectFit: 'contain' }}
              />

              {/* 1. Loading State Overlay (Spinner căn giữa khi đang fetch Signed URL / tải Key) */}
              {isLoading && !error && (
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

              {/* 2. Error State Overlay (Alert variant="danger") */}
              {error && (
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
              {/* 3. Dynamic Watermark Overlay (Chống quay lén) */}
              {isReady && !error && (
                <DynamicWatermark studentId={studentId} />
              )}
            </div>

            {/* Card Footer: Thông tin phiên bảo mật và tình trạng bảo vệ bản quyền */}
            <Card.Footer className="bg-light border-top py-3 px-4">
              <Row className="align-items-center gy-2">
                <Col xs={12} sm={7}>
                  <div className="d-flex align-items-center gap-2">
                    <span
                      className={`badge rounded-pill ${
                        isReady ? 'badge-status-ready' : error ? 'badge-status-failed' : 'badge-status-processing'
                      }`}
                    >
                      {isReady ? 'Đã kích hoạt' : error ? 'Lỗi' : 'Đang xử lý'}
                    </span>
                    <small className="text-secondary text-truncate">
                      {securityStatus}
                    </small>
                  </div>
                </Col>

                <Col xs={12} sm={5} className="text-sm-end">
                  <small className="text-muted">
                    Mã phiên: <code className="text-primary">{videoId}-{studentId}</code>
                  </small>
                </Col>
              </Row>
            </Card.Footer>
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
  videoId: PropTypes.string.isRequired,
  studentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  title: PropTypes.string,
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
      User: {studentId} <br/> SecureLearn DRM
    </div>
  );
}
