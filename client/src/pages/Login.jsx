import React, { useState } from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  FloatingLabel,
  Button,
  Alert,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { users } from '../data/mockDatabase';
import Logo from '../components/Logo';
import { COGNITO_LOGIN_URL } from '../services/courseService';

// Map Role trong mockDb → Role trong RBAC routing
const ROLE_MAP = {
  admin: 'Administrator',
  instructor: 'Instructor',
  student: 'Student',
};

// Redirect mặc định theo Role
const ROLE_REDIRECT = {
  Administrator: '/admin',
  Instructor: '/instructor/videos',
  Student: '/student/courses',
};

/**
 * Tài khoản demo để điền nhanh — lấy thẳng từ mockDb.users
 */
const DEMO_ACCOUNTS = [
  { label: 'Admin', user: users.find(u => u.Role === 'admin') },
  { label: 'Instructor', user: users.find(u => u.Role === 'instructor') },
  { label: 'Student', user: users.find(u => u.Role === 'student') },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useParams();
  const { t } = useTranslation();
  const currentLang = lang || 'vi';

  /** Điền nhanh tài khoản demo */
  const handleSelectDemo = (acc) => {
    if (!acc.user) return;
    setEmail(acc.user.Username);
    setPassword('password123');
    setErrorMessage(null);
  };

  /** Submit: tra cứu trong mockDb.users */
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setErrorMessage(t('login.login_failed'));
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);

      // Tìm user trong mockDb theo Username (email)
      const found = users.find(
        (u) => u.Username.toLowerCase() === cleanEmail
      );

      if (!found) {
        setErrorMessage(
          t('login.login_failed')
        );
        return;
      }

      // Mock: chấp nhận bất kỳ mật khẩu nào (chưa có BE)
      // Khi có BE: so sánh hash thật tại đây
      if (!password) {
        setErrorMessage(t('login.login_failed'));
        return;
      }

      const rbacRole = ROLE_MAP[found.Role] || 'Student';
      const targetPath = ROLE_REDIRECT[rbacRole] || '/home';

      const userData = {
        userId: found.ID,
        name: found.Username.split('@')[0],   // hiển thị phần trước @
        email: found.Username,
        role: rbacRole,
        token: `mock_jwt_${found.Role}_${found.ID}_${Date.now()}`,
      };

      login(userData);

      const from = location.state?.from?.pathname || targetPath;
      // Nếu path chưa có /lang/, tự động thêm vào
      const finalPath = from.startsWith(`/${currentLang}`) ? from : `/${currentLang}${from}`;

      navigate(finalPath, { replace: true });
    }, 400);
  };

  return (
    <div className="py-5 flex-grow-1 d-flex align-items-center">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            <Card className="card-clean shadow-lg overflow-hidden border">
              {/* Card Header Trắng Xanh */}
              <Card.Header className="bg-white border-bottom text-center py-4">
                <div className="mb-3 d-flex justify-content-center">
                  <Logo size="lg" showBadge={true} badgeText="E-LEARNING" />
                </div>
                <h4 className="fw-bold mb-1 text-dark">
                  {t('login.title')}
                </h4>
                <p className="text-muted small mb-0">
                  {t('login.subtitle')}
                </p>
              </Card.Header>

              <Card.Body className="p-4 p-md-5 bg-white">
                {/* Thông báo lỗi */}
                {errorMessage && (
                  <Alert variant="danger" dismissible onClose={() => setErrorMessage(null)} className="small py-2 mb-4 rounded-3">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {errorMessage}
                  </Alert>
                )}

                {/* Đăng nhập nhanh bằng AWS Cognito (Hosted UI - OAuth2) */}
                <div className="d-grid mb-3">
                  <a
                    href={COGNITO_LOGIN_URL}
                    className="btn btn-outline-dark rounded-pill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm text-decoration-none"
                  >
                    <i className="bi bi-shield-lock-fill text-warning fs-5"></i>
                    <span>Đăng nhập với AWS Cognito (Hosted UI)</span>
                  </a>
                </div>

                <div className="position-relative my-4 text-center">
                  <hr className="text-muted opacity-25" />
                  <span className="position-absolute top-50 start-50 translate-middle bg-white px-3 small text-muted">
                    hoặc đăng nhập tài khoản
                  </span>
                </div>

                {/* Form Đăng Nhập */}
                <Form onSubmit={handleSubmit}>
                  <FloatingLabel controlId="loginEmail" label={t('login.email_label')} className="mb-3 text-secondary">
                    <Form.Control
                      type="email"
                      placeholder={t('login.email_placeholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="form-control-clean"
                    />
                  </FloatingLabel>

                  <FloatingLabel controlId="loginPassword" label={t('login.password_label')} className="mb-4 text-secondary">
                    <Form.Control
                      type="password"
                      placeholder={t('login.password_placeholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="form-control-clean"
                    />
                  </FloatingLabel>

                  <div className="d-grid mb-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary-pill py-3 fw-bold"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Processing...
                        </>
                      ) : (
                        t('login.login_button')
                      )}
                    </Button>
                  </div>
                </Form>

                {/* Khu vực Đăng nhập Nhanh Demo */}
                <div className="pt-3 border-top text-center">
                  <div className="text-muted small mb-3 fw-medium">
                    <i className="bi bi-lightning-charge-fill me-1 text-warning"></i>{t('login.demo_accounts')}
                  </div>
                  <div className="d-flex flex-wrap gap-2 justify-content-center mb-3">
                    {DEMO_ACCOUNTS.map((acc, index) => (
                      <button
                        key={index}
                        type="button"
                        className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-medium"
                        onClick={() => handleSelectDemo(acc)}
                      >
                        {acc.label}
                      </button>
                    ))}
                  </div>

                  {/* Links điều hướng sang Đăng ký & Catalog */}
                  <div className="pt-3 border-top text-center d-flex justify-content-between small flex-wrap gap-2">
                    <Link to={`/${currentLang}/register`} className="text-primary fw-semibold text-decoration-none">
                      <i className="bi bi-person-plus me-1"></i>{t('login.no_account')}
                    </Link>
                    <Link to={`/${currentLang}/catalog`} className="text-muted text-decoration-none">
                      <i className="bi bi-collection me-1"></i>{t('login.explore_catalog')}
                    </Link>
                  </div>
                </div>
              </Card.Body>

              <Card.Footer className="bg-light border-top py-3 text-center">
                <small className="text-muted">
                  Hệ thống bảo vệ phân quyền Role-Based Access Control (RBAC)
                </small>
              </Card.Footer>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
