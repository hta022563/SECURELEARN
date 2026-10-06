import React, { useState } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  FloatingLabel,
  Button,
  Badge,
} from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';

export default function UserProfile() {
  const { user, login } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  // State Phần 1: Chỉnh sửa thông tin cá nhân (Edit Profile)
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // State Phần 2: Đổi mật khẩu (Change Password)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  /* =========================================================================
   * PHẦN 1: XỬ LÝ CẬP NHẬT THÔNG TIN CÁ NHÂN (USER INFO)
   * ========================================================================= */
  const handleSaveProfile = (e) => {
    e.preventDefault();

    if (!nameInput.trim()) {
      showToast(t('profile.name_empty_error'), 'warning');
      return;
    }

    setIsSavingInfo(true);

    setTimeout(() => {
      setIsSavingInfo(false);

      // Cập nhật lại AuthContext và LocalStorage
      const updatedUser = {
        ...user,
        name: nameInput.trim(),
      };
      login(updatedUser);

      setIsEditingInfo(false);
      showToast(t('profile.name_updated_success'), 'success', t('profile.info_saved'));
    }, 400);
  };

  const handleCancelEdit = () => {
    setNameInput(user?.name || '');
    setIsEditingInfo(false);
  };

  /* =========================================================================
   * PHẦN 2: XỬ LÝ ĐỔI MẬT KHẨU (CHANGE PASSWORD)
   * ========================================================================= */
  const validatePasswordForm = () => {
    const errors = {};

    if (!currentPassword) {
      errors.currentPassword = t('profile.current_pwd_empty');
    }

    if (!newPassword) {
      errors.newPassword = t('profile.new_pwd_empty');
    } else if (newPassword.length <= 6) {
      errors.newPassword = t('profile.new_pwd_length');
    }

    if (!confirmPassword) {
      errors.confirmPassword = t('profile.confirm_pwd_empty');
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = t('profile.pwd_mismatch');
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = (e) => {
    e.preventDefault();

    if (!validatePasswordForm()) {
      return;
    }

    setIsSavingPassword(true);

    setTimeout(() => {
      setIsSavingPassword(false);

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordErrors({});

      showToast(t('profile.pwd_updated_success'), 'success', t('profile.change_pwd'));
    }, 500);
  };

  return (
    <Container fluid="lg" className="py-4 user-profile-page">
      {/* Header Banner */}
      <div className="mb-4 pb-3 border-bottom">
        <div className="badge-pill-soft mb-2">
          <i className="bi bi-person-circle text-primary"></i>
          <span>{t('profile.user_account')}</span>
        </div>
        <h2 className="fw-bold text-dark mb-1">
          {t('profile.user_profile')}
        </h2>
        <p className="text-secondary mb-0 small">
          {t('profile.profile_desc')}
        </p>
      </div>

      <Row className="g-4">
        {/* =========================================================================
         * PHẦN 1: USER INFO CARD
         * ========================================================================= */}
        <Col xs={12} lg={6}>
          <Card className="h-100 card-clean shadow-sm border rounded-4 overflow-hidden bg-white">
            <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fw-bold text-dark">
                {t('profile.account_info')}
              </h5>
              <span
                className={`badge rounded-pill px-3 py-1 ${
                  user?.role === 'Administrator'
                    ? 'bg-danger text-white'
                    : user?.role === 'Instructor'
                    ? 'bg-warning text-dark'
                    : 'bg-primary text-white'
                }`}
              >
                {user?.role || t('profile.user_default')}
              </span>
            </Card.Header>

            <Card.Body className="p-4 bg-white">
              {/* Avatar và Thông tin nhanh */}
              <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold fs-2 shadow-sm"
                  style={{
                    width: '80px',
                    height: '80px',
                    flexShrink: 0,
                    background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
                  }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>

                <div>
                  <h4 className="fw-bold text-dark mb-1">{user?.name || t('profile.name_not_updated')}</h4>
                  <div className="text-secondary small mb-1">{user?.email}</div>
                  <span className="badge-pill-cyan small">
                    {t('profile.id_code')} <code>{user?.userId || 'N/A'}</code>
                  </span>
                </div>
              </div>

              {/* Form Xem / Sửa Họ Tên */}
              {!isEditingInfo ? (
                <div className="d-flex flex-column gap-3">
                  <div className="p-3 rounded-3 bg-light border">
                    <span className="text-muted small d-block mb-1">{t('profile.display_name')}</span>
                    <strong className="text-dark fs-6">{user?.name}</strong>
                  </div>

                  <div className="p-3 rounded-3 bg-light border">
                    <span className="text-muted small d-block mb-1">{t('profile.linked_email')}</span>
                    <strong className="text-dark fs-6">{user?.email}</strong>
                  </div>

                  <div className="p-3 rounded-3 bg-light border">
                    <span className="text-muted small d-block mb-1">{t('profile.system_role')}</span>
                    <strong className="text-primary fs-6">{user?.role}</strong>
                  </div>

                  <div className="mt-3">
                    <Button
                      onClick={() => setIsEditingInfo(true)}
                      className="btn-primary-pill d-flex align-items-center gap-2"
                    >
                      <i className="bi bi-pencil-square"></i>
                      <span>{t('profile.edit_profile')}</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <Form onSubmit={handleSaveProfile}>
                  <FloatingLabel controlId="editProfileName" label={t('profile.full_name_req')} className="mb-3 text-secondary">
                    <Form.Control
                      type="text"
                      placeholder={t('profile.enter_full_name')}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      required
                      className="form-control-clean"
                    />
                  </FloatingLabel>

                  <FloatingLabel controlId="editProfileEmailReadOnly" label={t('profile.email_readonly')} className="mb-4 text-secondary">
                    <Form.Control
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-light text-muted form-control-clean"
                    />
                  </FloatingLabel>

                  <div className="d-flex gap-2">
                    <Button
                      type="submit"
                      disabled={isSavingInfo}
                      className="btn-primary-pill px-4"
                    >
                      {isSavingInfo ? t('profile.saving') : t('profile.save_changes')}
                    </Button>
                    <Button
                      variant="outline-secondary"
                      onClick={handleCancelEdit}
                      disabled={isSavingInfo}
                      className="rounded-pill px-3"
                    >
                      {t('profile.cancel')}
                    </Button>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* =========================================================================
         * PHẦN 2: CHANGE PASSWORD CARD
         * ========================================================================= */}
        <Col xs={12} lg={6}>
          <Card className="h-100 card-clean shadow-sm border rounded-4 overflow-hidden bg-white">
            <Card.Header className="bg-white border-bottom py-3 px-4">
              <h5 className="mb-0 fw-bold text-dark">
                {t('profile.change_pwd')}
              </h5>
            </Card.Header>

            <Card.Body className="p-4 bg-white">
              <p className="text-secondary small mb-4">
                {t('profile.pwd_desc')}
              </p>

              <Form onSubmit={handleChangePassword} noValidate>
                {/* Mật Khẩu Hiện Tại */}
                <div className="mb-3">
                  <FloatingLabel controlId="pwdCurrent" label={t('profile.current_pwd_req')} className="text-secondary">
                    <Form.Control
                      type="password"
                      placeholder={t('profile.current_pwd_placeholder')}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        if (passwordErrors.currentPassword) {
                          setPasswordErrors({ ...passwordErrors, currentPassword: null });
                        }
                      }}
                      isInvalid={Boolean(passwordErrors.currentPassword)}
                      className="form-control-clean"
                    />
                  </FloatingLabel>
                  {passwordErrors.currentPassword && (
                    <Form.Text className="text-danger small mt-1 d-block">
                      <i className="bi bi-exclamation-circle me-1"></i>{passwordErrors.currentPassword}
                    </Form.Text>
                  )}
                </div>

                {/* Mật Khẩu Mới (> 6 ký tự) */}
                <div className="mb-3">
                  <FloatingLabel controlId="pwdNew" label={t('profile.new_pwd_req')} className="text-secondary">
                    <Form.Control
                      type="password"
                      placeholder={t('profile.new_pwd_placeholder')}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (passwordErrors.newPassword) {
                          setPasswordErrors({ ...passwordErrors, newPassword: null });
                        }
                      }}
                      isInvalid={Boolean(passwordErrors.newPassword)}
                      className="form-control-clean"
                    />
                  </FloatingLabel>
                  {passwordErrors.newPassword && (
                    <Form.Text className="text-danger small mt-1 d-block">
                      <i className="bi bi-exclamation-circle me-1"></i>{passwordErrors.newPassword}
                    </Form.Text>
                  )}
                </div>

                {/* Xác Nhận Mật Khẩu Mới */}
                <div className="mb-4">
                  <FloatingLabel controlId="pwdConfirm" label={t('profile.confirm_pwd_req')} className="text-secondary">
                    <Form.Control
                      type="password"
                      placeholder={t('profile.confirm_pwd_placeholder')}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (passwordErrors.confirmPassword) {
                          setPasswordErrors({ ...passwordErrors, confirmPassword: null });
                        }
                      }}
                      isInvalid={Boolean(passwordErrors.confirmPassword)}
                      className="form-control-clean"
                    />
                  </FloatingLabel>
                  {passwordErrors.confirmPassword && (
                    <Form.Text className="text-danger small mt-1 d-block">
                      <i className="bi bi-exclamation-circle me-1"></i>{passwordErrors.confirmPassword}
                    </Form.Text>
                  )}
                </div>

                {/* Nút Submit Đổi Mật Khẩu */}
                <div className="d-grid">
                  <Button
                    type="submit"
                    disabled={isSavingPassword}
                    className="btn-primary-pill py-3 fw-bold"
                  >
                    {isSavingPassword ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        {t('profile.saving_pwd')}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-key-fill me-2"></i>{t('profile.update_pwd')}
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
