import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleReturnHome = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    switch (user.role) {
      case 'Administrator':
        navigate('/admin');
        break;
      case 'Instructor':
        navigate('/instructor/upload');
        break;
      case 'Student':
      default:
        navigate('/student/player');
        break;
    }
  };

  return (
    <div className="py-5 flex-grow-1 d-flex align-items-center">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} md={8} lg={6}>
            <Card className="card-clean border-0 text-center p-4 shadow-sm rounded-4">
              <Card.Body>
                <div className="display-1 text-danger mb-3 opacity-75">
                  <i className="bi bi-shield-lock-fill"></i>
                </div>
                <h2 className="fw-bold text-dark mb-2">403 - Truy Cập Bị Từ Chối</h2>
                <p className="text-secondary mb-4">
                  Tài khoản của bạn ({user?.email} - Vai trò: <strong className="text-dark">{user?.role}</strong>) không có đủ thẩm quyền để truy cập trang này.
                </p>
                <div className="d-flex justify-content-center gap-3">
                  <Button className="btn-primary-pill" onClick={handleReturnHome}>
                    Về Trang Dành Cho {user?.role || 'Học Viên'}
                  </Button>
                  <Button className="btn-secondary-pill" onClick={logout}>
                    Đăng Xuất
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
