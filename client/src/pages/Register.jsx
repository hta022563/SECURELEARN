import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  FloatingLabel,
  Button,
} from 'react-bootstrap';
import { useToast } from '../context/ToastContext';
import Logo from '../components/Logo';

export default function Register() {
  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Student'); // 'Student' | 'Instructor'

  // Validation Errors State
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  /**
   * Hàm kiểm tra tính hợp lệ của dữ liệu (Validation)
   */
  const validateForm = () => {
    const newErrors = {};

    // 1. Kiểm tra Họ và Tên
    if (!fullName.trim()) {
      newErrors.fullName = 'Họ và tên không được để trống.';
    }

    // 2. Bắt lỗi Email không đúng định dạng regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Địa chỉ email không đúng định dạng (Ví dụ: user@domain.com).';
    }

    // 3. Password phải lớn hơn 6 ký tự
    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (password.length <= 6) {
      newErrors.password = 'Mật khẩu phải có độ dài lớn hơn 6 ký tự.';
    }

    // 4. Confirm Password phải khớp với Password
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu xác nhận.';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp với mật khẩu đã nhập.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Xử lý Submit Form Đăng Ký
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Giả lập gọi API đăng ký tài khoản (Network latency 500ms)
    setTimeout(() => {
      setIsSubmitting(false);

      // Bắn Toast thông báo thành công
      showToast(
        `Chúc mừng ${fullName}! Tài khoản ${role} đã được tạo thành công. Vui lòng đăng nhập.`,
        'success',
        'Đăng Ký Thành Công'
      );

      // Chuyển hướng người dùng về trang Đăng Nhập
      navigate('/login');
    }, 500);
  };

  return (
    <div className="py-5 flex-grow-1 d-flex align-items-center">
      <Container>
        <Row className="justify-content-center">
          <Col xs={12} sm={10} md={8} lg={6} xl={5}>
            <Card className="card-clean shadow-lg overflow-hidden border">
              {/* Header Card Trắng Xanh */}
              <Card.Header className="bg-white border-bottom text-center py-4">
                <div className="mb-3 d-flex justify-content-center">
                  <Logo size="lg" showBadge={true} badgeText="JOIN PLATFORM" />
                </div>
                <h4 className="fw-bold mb-1 text-dark">
                  Đăng Ký Tài Khoản Mới
                </h4>
                <p className="text-muted small mb-0">
                  Tham gia nền tảng video học tập trực tuyến SecureLearn DRM
                </p>
              </Card.Header>

              <Card.Body className="p-4 p-md-5 bg-white">
                <Form onSubmit={handleSubmit} noValidate>
                  {/* Họ và Tên */}
                  <div className="mb-3">
                    <FloatingLabel controlId="regFullName" label="Họ và Tên *" className="text-secondary">
                      <Form.Control
                        type="text"
                        placeholder="Nguyễn Văn A"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (errors.fullName) setErrors({ ...errors, fullName: null });
                        }}
                        isInvalid={Boolean(errors.fullName)}
                        className="form-control-clean"
                      />
                    </FloatingLabel>
                    {errors.fullName && (
                      <Form.Text className="text-danger small mt-1 d-block">
                        <i className="bi bi-exclamation-circle me-1"></i>{errors.fullName}
                      </Form.Text>
                    )}
                  </div>

                  {/* Địa chỉ Email */}
                  <div className="mb-3">
                    <FloatingLabel controlId="regEmail" label="Địa chỉ Email *" className="text-secondary">
                      <Form.Control
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors({ ...errors, email: null });
                        }}
                        isInvalid={Boolean(errors.email)}
                        className="form-control-clean"
                      />
                    </FloatingLabel>
                    {errors.email && (
                      <Form.Text className="text-danger small mt-1 d-block">
                        <i className="bi bi-exclamation-circle me-1"></i>{errors.email}
                      </Form.Text>
                    )}
                  </div>

                  {/* Mật Khẩu (> 6 ký tự) */}
                  <div className="mb-3">
                    <FloatingLabel controlId="regPassword" label="Mật khẩu (> 6 ký tự) *" className="text-secondary">
                      <Form.Control
                        type="password"
                        placeholder="Mật khẩu..."
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errors.password) setErrors({ ...errors, password: null });
                        }}
                        isInvalid={Boolean(errors.password)}
                        className="form-control-clean"
                      />
                    </FloatingLabel>
                    {errors.password && (
                      <Form.Text className="text-danger small mt-1 d-block">
                        <i className="bi bi-exclamation-circle me-1"></i>{errors.password}
                      </Form.Text>
                    )}
                  </div>

                  {/* Nhập Lại Mật Khẩu */}
                  <div className="mb-4">
                    <FloatingLabel controlId="regConfirmPassword" label="Xác nhận mật khẩu *" className="text-secondary">
                      <Form.Control
                        type="password"
                        placeholder="Nhập lại mật khẩu..."
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                        }}
                        isInvalid={Boolean(errors.confirmPassword)}
                        className="form-control-clean"
                      />
                    </FloatingLabel>
                    {errors.confirmPassword && (
                      <Form.Text className="text-danger small mt-1 d-block">
                        <i className="bi bi-exclamation-circle me-1"></i>{errors.confirmPassword}
                      </Form.Text>
                    )}
                  </div>

                  {/* Chọn Vai Trò (Role: Student / Instructor) */}
                  <div className="mb-4 p-3 rounded-3 bg-light border border-light-subtle">
                    <Form.Label className="text-secondary small fw-bold d-block mb-2">
                      Vai trò tài khoản bạn muốn đăng ký:
                    </Form.Label>
                    <div className="d-flex gap-4">
                      <Form.Check
                        type="radio"
                        id="role-student"
                        name="regRole"
                        label={<span className="text-dark fw-semibold">Học Viên (Student)</span>}
                        checked={role === 'Student'}
                        onChange={() => setRole('Student')}
                      />
                      <Form.Check
                        type="radio"
                        id="role-instructor"
                        name="regRole"
                        label={<span className="text-dark fw-semibold">Giảng Viên (Instructor)</span>}
                        checked={role === 'Instructor'}
                        onChange={() => setRole('Instructor')}
                      />
                    </div>
                  </div>

                  {/* Nút Submit */}
                  <div className="d-grid mb-3">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary-pill py-3 fw-bold"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Đang tạo tài khoản...
                        </>
                      ) : (
                        'Đăng Ký Ngay'
                      )}
                    </Button>
                  </div>
                </Form>

                {/* Chuyển hướng sang Login nếu đã có tài khoản */}
                <div className="text-center pt-3 border-top">
                  <span className="text-muted small me-1">Bạn đã có tài khoản?</span>
                  <Link to="/login" className="text-primary fw-semibold small text-decoration-none">
                    Đăng nhập tại đây
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
