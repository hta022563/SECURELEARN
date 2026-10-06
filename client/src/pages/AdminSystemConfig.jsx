import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Card, Form, Button, Badge, Alert, ProgressBar } from 'react-bootstrap';
import { useToast } from '../context/ToastProvider';
import { useTranslation } from 'react-i18next';
import {
  videos as dbVideos,
  courses as dbCourses,
  anomalyAlerts as dbAlerts,
  accessLogs as dbLogs,
} from '../data/mockDatabase';

/**
 * Helper format dung lượng từ bytes sang MB / GB
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(1)} MB`;
}

/**
 * =============================================================================
 * PAGE: AdminSystemConfig (100% Dữ Liệu Mềm Từ CSDL Chuẩn ERD)
 * =============================================================================
 * Quản trị viên theo dõi ngân sách Cloudflare R2, thông số mã hóa Web Crypto KMS
 * và ngưỡng cảnh báo AI Isolation Forest được tính toán động từ CSDL.
 * =============================================================================
 */
export default function AdminSystemConfig() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  // Tính toán dung lượng và số liệu động từ bảng videos và accessLogs
  const systemMetrics = useMemo(() => {
    const totalBytes = dbVideos.reduce((acc, v) => acc + (v.Size || 0), 0);
    const totalSeconds = dbVideos.reduce((acc, v) => acc + (v.Length || 0), 0);
    const totalGB = totalBytes / (1024 * 1024 * 1024);

    // Tính toán chi phí R2 động: $0.015/GB + $0.00036/1000 requests
    const estimatedCostUsd = Number((totalGB * 0.015 + (dbLogs.length * 0.0004) + 12.5).toFixed(2));

    return {
      totalBytes,
      totalFormatted: formatBytes(totalBytes),
      totalHours: (totalSeconds / 3600).toFixed(1),
      videoCount: dbVideos.length,
      courseCount: dbCourses.length,
      logsCount: dbLogs.length,
      openAlerts: dbAlerts.filter((a) => a.Status === 'open').length,
      estimatedCostUsd,
    };
  }, []);

  // State cấu hình hệ thống (ưu tiên nạp từ localStorage để giữ bền vững)
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('securelearn_admin_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(t('admin_config.config_parse_error'), e);
      }
    }
    return {
      budgetLimitUsd: 100,
      currentUsageUsd: systemMetrics.estimatedCostUsd,
      kmsRotationDays: 30,
      aiThreshold: 0.85,
      maxConcurrentSessions: 1,
      watermarkOpacity: 45,
      autoBanSuspicious: true,
      emailAlertsEnabled: true,
    };
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : Number(value) || value,
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);

    setTimeout(() => {
      setSaving(false);
      localStorage.setItem('securelearn_admin_config', JSON.stringify(config));
      showToast(t('admin_config.config_saved_success'), 'success');
    }, 500);
  };

  const budgetPercent = Math.min(
    Math.round((systemMetrics.estimatedCostUsd / (config.budgetLimitUsd || 100)) * 100),
    100
  );

  return (
    <div className="py-4">
      <Container fluid className="px-3 px-xl-5">
        {/* Tiêu đề trang */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <div className="badge-pill-soft mb-2">
              <span>{t('admin_config.drm_sys_admin_erd')}</span>
            </div>
            <h2 className="fw-bold text-dark mb-1">
              {t('admin_config.system_config')} <span className="text-primary">{t('admin_config.budget_alerts')}</span>
            </h2>
            <p className="text-secondary small mb-0">
              {t('admin_config.config_desc')}
            </p>
          </div>
          <Button
            type="submit"
            form="config-form"
            className="btn-primary-pill d-flex align-items-center gap-2"
            disabled={saving}
          >
            <i className="bi bi-check2-circle"></i>
            <span>{saving ? t('admin_config.saving') : t('admin_config.save_changes')}</span>
          </Button>
        </div>

        <Row className="g-4">
          {/* Cột Trái: Cảnh báo Ngân Sách Cloudflare R2 */}
          <Col lg={4}>
            <Card className="card-clean border-0 shadow-sm p-4 mb-4 bg-white">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold text-dark mb-0">
                  {t('admin_config.r2_storage_cost')}
                </h5>
                <Badge bg={budgetPercent > 75 ? 'danger' : 'success'} className="rounded-pill">
                  {budgetPercent}{t('admin_config.percent_limit')}
                </Badge>
              </div>

              <div className="text-center py-3 bg-light rounded-4 mb-3 border border-light-subtle">
                <span className="text-muted small d-block mb-1">{t('admin_config.est_monthly_cost')}</span>
                <h2 className="fw-extrabold text-primary mb-0">${systemMetrics.estimatedCostUsd}</h2>
                <small className="text-secondary">{t('admin_config.limit_usd')}{config.budgetLimitUsd}{t('admin_config.usd')}</small>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between small text-muted mb-1">
                  <span>{t('admin_config.budget_progress')}</span>
                  <span className="fw-bold text-dark">{budgetPercent}%</span>
                </div>
                <ProgressBar
                  now={budgetPercent}
                  variant={budgetPercent > 75 ? 'danger' : 'primary'}
                  style={{ height: '8px' }}
                  className="rounded-pill"
                />
              </div>

              <div className="p-3 bg-light rounded-3 border small mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">{t('admin_config.total_video_size')}</span>
                  <strong className="text-dark">{systemMetrics.totalFormatted}</strong>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">{t('admin_config.total_videos_stored')}</span>
                  <strong className="text-dark">{systemMetrics.videoCount}{t('admin_config.videos_suffix')}</strong>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">{t('admin_config.total_stream_hours')}</span>
                  <strong className="text-dark">{systemMetrics.totalHours}{t('admin_config.hours_suffix')}</strong>
                </div>
              </div>

              <Alert variant="info" className="small mb-0 rounded-3">
                <i className="bi bi-info-circle-fill me-1"></i>
                {t('admin_config.r2_alert_desc_1')}<strong>80%</strong>{t('admin_config.r2_alert_desc_2')}
              </Alert>
            </Card>

            {/* Trạng Thái An Toàn DRM */}
            <Card className="card-clean border-0 shadow-sm p-4 bg-white">
              <h5 className="fw-bold text-dark mb-3">
                {t('admin_config.kms_drm_status')}
              </h5>
              <div className="d-flex flex-column gap-3 small">
                <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                  <span className="text-secondary">{t('admin_config.encryption_standard')}</span>
                  <strong className="text-dark">{t('admin_config.hls_aes128')}</strong>
                </div>
                <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                  <span className="text-secondary">{t('admin_config.key_exchange')}</span>
                  <strong className="text-dark">{t('admin_config.web_crypto_ecdh')}</strong>
                </div>
                <div className="d-flex justify-content-between align-items-center pb-2 border-bottom">
                  <span className="text-secondary">{t('admin_config.key_rotation_cycle')}</span>
                  <span className="badge-pill-cyan">{config.kmsRotationDays}{t('admin_config.days_suffix')}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-secondary">{t('admin_config.ai_risk_alerts')}</span>
                  <span className={systemMetrics.openAlerts > 0 ? 'badge bg-warning text-dark rounded-pill' : 'badge-status-ready'}>
                    {systemMetrics.openAlerts}{t('admin_config.open_alerts_suffix')}
                  </span>
                </div>
              </div>
            </Card>
          </Col>

          {/* Cột Phải: Biểu Mẫu Cấu Hình */}
          <Col lg={8}>
            <Card className="card-clean border-0 shadow-sm p-4 bg-white">
              <Form id="config-form" onSubmit={handleSave}>
                <h5 className="fw-bold text-dark mb-3">
                  {t('admin_config.security_sys_params')}
                </h5>

                <Row className="g-3 mb-4">
                  <Col md={6}>
                    <Form.Group controlId="budgetLimitUsd">
                      <Form.Label className="small fw-semibold text-secondary">
                        {t('admin_config.r2_budget_limit')}
                      </Form.Label>
                      <Form.Control
                        type="number"
                        name="budgetLimitUsd"
                        value={config.budgetLimitUsd}
                        onChange={handleChange}
                        className="form-control-clean"
                        min="10"
                        max="10000"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="kmsRotationDays">
                      <Form.Label className="small fw-semibold text-secondary">
                        {t('admin_config.auto_kms_rotation')}
                      </Form.Label>
                      <Form.Control
                        type="number"
                        name="kmsRotationDays"
                        value={config.kmsRotationDays}
                        onChange={handleChange}
                        className="form-control-clean"
                        min="7"
                        max="365"
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="aiThreshold">
                      <Form.Label className="small fw-semibold text-secondary">
                        {t('admin_config.ai_sensitivity')}
                      </Form.Label>
                      <Form.Control
                        type="number"
                        step="0.05"
                        name="aiThreshold"
                        value={config.aiThreshold}
                        onChange={handleChange}
                        className="form-control-clean"
                        min="0.5"
                        max="1.0"
                        required
                      />
                      <Form.Text className="text-muted small">
                        {t('admin_config.ai_sensitivity_desc')}
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="watermarkOpacity">
                      <Form.Label className="small fw-semibold text-secondary">
                        {t('admin_config.student_watermark_opacity')}
                      </Form.Label>
                      <Form.Control
                        type="number"
                        name="watermarkOpacity"
                        value={config.watermarkOpacity}
                        onChange={handleChange}
                        className="form-control-clean"
                        min="10"
                        max="90"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <h5 className="fw-bold text-dark mb-3 pt-3 border-top">
                  {t('admin_config.auto_safety_rules')}
                </h5>

                <div className="d-flex flex-column gap-3 mb-4">
                  <Form.Check
                    type="switch"
                    id="autoBanSuspicious"
                    name="autoBanSuspicious"
                    label={
                      <div>
                        <span className="fw-semibold text-dark">{t('admin_config.auto_suspend_account')}</span>
                        <div className="text-secondary small">
                          {t('admin_config.auto_suspend_desc')}
                        </div>
                      </div>
                    }
                    checked={config.autoBanSuspicious}
                    onChange={handleChange}
                  />

                  <Form.Check
                    type="switch"
                    id="emailAlertsEnabled"
                    name="emailAlertsEnabled"
                    label={
                      <div>
                        <span className="fw-semibold text-dark">{t('admin_config.urgent_email_alerts')}</span>
                        <div className="text-secondary small">
                          {t('admin_config.urgent_email_desc')}
                        </div>
                      </div>
                    }
                    checked={config.emailAlertsEnabled}
                    onChange={handleChange}
                  />
                </div>
              </Form>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}
