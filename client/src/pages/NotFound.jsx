import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

/**
 * Component: NotFound (Trang lỗi 404)
 * 
 * Hiển thị khi người dùng truy cập vào đường dẫn không tồn tại
 * hoặc không đủ quyền truy cập.
 */
export default function NotFound() {
  const navigate = useNavigate();

  const handleBack = () => {
    // Điều hướng về trang trước đó nếu có lịch sử duyệt, hoặc về trang chủ
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="py-5 flex-grow-1 d-flex align-items-center justify-content-center">
      <Container>
        <Row className="justify-content-center text-center">
          <Col xs={12} sm={10} md={8} lg={6}>
            <Card className="card-clean shadow-lg border rounded-4 p-4 p-md-5 bg-white">
              <Card.Body>
                {/* Số 404 cỡ lớn và Icon */}
                <div className="display-1 fw-bolder text-primary mb-2">
                  404
                </div>
                <div className="fs-1 mb-3 text-primary">
                  <i className="bi bi-compass"></i>
                </div>

                <h2 className="fw-bold text-dark mb-3">
                  404 - Page Not Found
                </h2>

                <p className="text-secondary mb-4 px-md-3">
                  The page you are looking for does not exist or you do not have permission to access it.
                </p>

                <div className="d-flex justify-content-center gap-3 flex-wrap">
                  <Button
                    onClick={handleBack}
                    className="btn-primary-pill d-flex align-items-center gap-2 px-4"
                  >
                    <i className="bi bi-arrow-left"></i>
                    <span>Back to Dashboard</span>
                  </Button>

                  <Button
                    onClick={() => navigate('/')}
                    className="btn-secondary-pill px-4"
                  >
                    <i className="bi bi-house-door me-1"></i>Trang Chủ
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
