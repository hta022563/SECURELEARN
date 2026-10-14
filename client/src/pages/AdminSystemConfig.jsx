import React, { useState, useMemo } from 'react';
import {
  Settings,
  CheckCircle2,
  DollarSign,
  HardDrive,
  Shield,
  Info,
  Lock,
  AlertTriangle,
  Loader2,
  Sliders,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
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
 * PAGE: AdminSystemConfig (Pure Tailwind CSS & Lucide Icons)
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

    const estimatedCostUsd = Number(
      (totalGB * 0.015 + dbLogs.length * 0.0004 + 12.5).toFixed(2)
    );

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

  // State cấu hình hệ thống
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
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Tiêu đề trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2">
            <Sliders className="h-3.5 w-3.5" />
            <span>{t('admin_config.drm_sys_admin_erd')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
            {t('admin_config.system_config')}{' '}
            <span className="text-blue-600 dark:text-blue-400">
              {t('admin_config.budget_alerts')}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t('admin_config.config_desc')}
          </p>
        </div>

        <button
          type="submit"
          form="config-form"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('admin_config.saving')}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>{t('admin_config.save_changes')}</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Cột Trái: Cảnh báo Ngân Sách Cloudflare R2 & Trạng thái DRM */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card Ngân Sách */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-0">
                {t('admin_config.r2_storage_cost')}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  budgetPercent > 75
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}
              >
                {budgetPercent}
                {t('admin_config.percent_limit')}
              </span>
            </div>

            <div className="text-center py-5 bg-slate-50 dark:bg-slate-850 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">
                {t('admin_config.est_monthly_cost')}
              </span>
              <h2 className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mb-1">
                ${systemMetrics.estimatedCostUsd}
              </h2>
              <small className="text-slate-400 text-xs">
                {t('admin_config.limit_usd')} {config.budgetLimitUsd} {t('admin_config.usd')}
              </small>
            </div>

            <div className="mb-4 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{t('admin_config.budget_progress')}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{budgetPercent}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    budgetPercent > 75 ? 'bg-rose-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${budgetPercent}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">{t('admin_config.total_video_size')}</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {systemMetrics.totalFormatted}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t('admin_config.total_videos_stored')}</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {systemMetrics.videoCount} {t('admin_config.videos_suffix')}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t('admin_config.total_stream_hours')}</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {systemMetrics.totalHours} {t('admin_config.hours_suffix')}
                </strong>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200/60 dark:border-blue-900/60 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {t('admin_config.r2_alert_desc_1')}
                <strong>80%</strong>
                {t('admin_config.r2_alert_desc_2')}
              </span>
            </div>
          </div>

          {/* Trạng Thái An Toàn DRM */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
              {t('admin_config.kms_drm_status')}
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{t('admin_config.encryption_standard')}</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {t('admin_config.hls_aes128')}
                </strong>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{t('admin_config.key_exchange')}</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {t('admin_config.web_crypto_ecdh')}
                </strong>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">{t('admin_config.key_rotation_cycle')}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold font-mono">
                  {config.kmsRotationDays} {t('admin_config.days_suffix')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{t('admin_config.ai_risk_alerts')}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-semibold ${
                    systemMetrics.openAlerts > 0
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  }`}
                >
                  {systemMetrics.openAlerts} {t('admin_config.open_alerts_suffix')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cột Phải: Biểu Mẫu Cấu Hình */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 dark:border-slate-800">
            <form id="config-form" onSubmit={handleSave} className="space-y-6">
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4">
                {t('admin_config.security_sys_params')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('admin_config.r2_budget_limit')}
                  </label>
                  <input
                    type="number"
                    name="budgetLimitUsd"
                    value={config.budgetLimitUsd}
                    onChange={handleChange}
                    min="10"
                    max="10000"
                    required
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('admin_config.auto_kms_rotation')}
                  </label>
                  <input
                    type="number"
                    name="kmsRotationDays"
                    value={config.kmsRotationDays}
                    onChange={handleChange}
                    min="7"
                    max="365"
                    required
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('admin_config.ai_sensitivity')}
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    name="aiThreshold"
                    value={config.aiThreshold}
                    onChange={handleChange}
                    min="0.5"
                    max="1.0"
                    required
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {t('admin_config.ai_sensitivity_desc')}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('admin_config.student_watermark_opacity')}
                  </label>
                  <input
                    type="number"
                    name="watermarkOpacity"
                    value={config.watermarkOpacity}
                    onChange={handleChange}
                    min="10"
                    max="90"
                    required
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
                  {t('admin_config.auto_safety_rules')}
                </h3>

                {/* Switch 1: autoBanSuspicious */}
                <label className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 cursor-pointer">
                  <div className="pr-4">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                      {t('admin_config.auto_suspend_account')}
                    </span>
                    <span className="text-[11px] text-slate-400 leading-relaxed block mt-0.5">
                      {t('admin_config.auto_suspend_desc')}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    name="autoBanSuspicious"
                    checked={config.autoBanSuspicious}
                    onChange={handleChange}
                    className="w-5 h-5 mt-0.5 rounded text-blue-600 focus:ring-blue-500 shrink-0"
                  />
                </label>

                {/* Switch 2: emailAlertsEnabled */}
                <label className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 cursor-pointer">
                  <div className="pr-4">
                    <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                      {t('admin_config.urgent_email_alerts')}
                    </span>
                    <span className="text-[11px] text-slate-400 leading-relaxed block mt-0.5">
                      {t('admin_config.urgent_email_desc')}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    name="emailAlertsEnabled"
                    checked={config.emailAlertsEnabled}
                    onChange={handleChange}
                    className="w-5 h-5 mt-0.5 rounded text-blue-600 focus:ring-blue-500 shrink-0"
                  />
                </label>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
