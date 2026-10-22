import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Fingerprint,
  Search,
  AlertTriangle,
  Check,
  RotateCcw,
  ShieldAlert,
  X,
  Lock,
  ShieldCheck,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  anomalyAlerts as dbAlerts,
  accessLogs as dbLogs,
  users as dbUsers,
  courses as dbCourses,
  entitlements as dbEntitlements,
  sessions as dbSessions,
} from '../data/mockDatabase';
import { useToast } from '../context/ToastContext';
import AccessLogLicenseAuditTable from './AccessLogLicenseAuditTable';

/**
 * =============================================================================
 * COMPONENT: AdminAnomalyDashboard (Pure Tailwind CSS)
 * =============================================================================
 */
export default function AdminAnomalyDashboard() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();

  // Chuyển đổi dữ liệu cảnh báo từ bảng anomalyAlerts thành format đầy đủ
  const [alerts, setAlerts] = useState(() => {
    return dbAlerts.map((item, idx) => {
      const relatedCourse = dbCourses.find((c) => c.AnomalyAlertID === item.ID) || dbCourses[idx % dbCourses.length];
      const students = dbUsers.filter((u) => (u.Role || '').toLowerCase() === 'student');
      const student = students[idx % students.length] || dbUsers[3];
      const riskScore = Math.round(item.Score * 100);

      let anomalyTypeKey = 'admin_alerts.account_sharing';
      let detailsKey = 'admin_alerts.account_sharing_desc';
      if (item.Score >= 0.8) {
        anomalyTypeKey = 'admin_alerts.spam_ecdh';
        detailsKey = 'admin_alerts.spam_ecdh_desc';
      } else if (item.Score >= 0.5) {
        anomalyTypeKey = 'admin_alerts.bot_viewing';
        detailsKey = 'admin_alerts.bot_viewing_desc';
      } else {
        anomalyTypeKey = 'admin_alerts.geo_anomaly';
        detailsKey = 'admin_alerts.geo_anomaly_desc';
      }

      const rawUsername = student?.Username ? student.Username.split('@')[0] : '';
      const formattedName = student?.Name || (rawUsername
        ? rawUsername
            .split('.')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
        : '');

      return {
        id: item.ID,
        studentId: student?.ID || 'u-004',
        studentName: formattedName,
        studentEmail: student?.Email || student?.Username || 'student@securelearn.edu',
        courseId: relatedCourse?.ID || 'c-001',
        courseTitle: relatedCourse?.Title || null,
        anomalyTypeKey,
        detailsKey,
        riskScore,
        rawTimestamp: item.Timestamp ? new Date(item.Timestamp) : new Date(Date.now() - idx * 3600000 * 4),
        status: item.Status || 'open',
        accessLogId: item.AccessLogID,
      };
    });
  });

  // State tìm kiếm dấu vân tay Watermark
  const [searchWatermarkId, setSearchWatermarkId] = useState('');
  const [tracedStudent, setTracedStudent] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [traceError, setTraceError] = useState('');

  // State Modal khóa quyền học viên
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedUserToBan, setSelectedUserToBan] = useState(null);

  // State chuyển tab chính của Admin Anomaly Dashboard: 'alerts' | 'audit' | 'assets'
  const [mainDashboardTab, setMainDashboardTab] = useState('alerts');

  // State quản lý tab phân chia 2 bảng: 'pending' (Chưa xử lý) hoặc 'resolved' (Đã xử lý)
  const [activeTableTab, setActiveTableTab] = useState('pending');

  // State tìm kiếm theo tên học viên
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Lọc danh sách cảnh báo chưa xử lý
  const pendingAlerts = useMemo(() => {
    return alerts
      .filter((a) => (a.status || '').toLowerCase() !== 'resolved')
      .filter((a) => {
        if (!userSearchTerm.trim()) return true;
        const term = userSearchTerm.toLowerCase();
        return (
          (a.studentName && a.studentName.toLowerCase().includes(term)) ||
          (a.studentEmail && a.studentEmail.toLowerCase().includes(term)) ||
          (a.studentId && a.studentId.toLowerCase().includes(term))
        );
      });
  }, [alerts, userSearchTerm]);

  // Lọc danh sách cảnh báo đã xử lý
  const resolvedAlerts = useMemo(() => {
    return alerts
      .filter((a) => (a.status || '').toLowerCase() === 'resolved')
      .filter((a) => {
        if (!userSearchTerm.trim()) return true;
        const term = userSearchTerm.toLowerCase();
        return (
          (a.studentName && a.studentName.toLowerCase().includes(term)) ||
          (a.studentEmail && a.studentEmail.toLowerCase().includes(term)) ||
          (a.studentId && a.studentId.toLowerCase().includes(term))
        );
      });
  }, [alerts, userSearchTerm]);

  // Xử lý truy vết dấu vết Watermark từ DB
  const handleTraceLeak = (e) => {
    e.preventDefault();
    if (!searchWatermarkId.trim()) {
      setTraceError(t('admin_alerts.error_empty_watermark'));
      setTracedStudent(null);
      return;
    }

    setIsSearching(true);
    setTraceError('');

    setTimeout(() => {
      const keyword = searchWatermarkId.trim().toLowerCase();
      const matchedUser = dbUsers.find(
        (u) =>
          u.ID.toLowerCase() === keyword ||
          (u.Name && u.Name.toLowerCase().includes(keyword)) ||
          (u.Email && u.Email.toLowerCase().includes(keyword))
      );

      if (matchedUser) {
        const studentLogs = dbLogs.filter((l) => l.UserID === matchedUser.ID);
        const latestLog = studentLogs[studentLogs.length - 1];
        const studentEntitlements = dbEntitlements.filter((en) => en.UserID === matchedUser.ID);
        const enrolledCourseIds = studentEntitlements.map((en) => en.CoursesID);
        const enrolledCourses = dbCourses.filter((c) => enrolledCourseIds.includes(c.ID));
        const courseNames = enrolledCourses.map((c) => c.Title).join(', ') || t('admin_alerts.no_course_records');
        const session = dbSessions.find((s) => s.UserID === matchedUser.ID);

        setTracedStudent({
          id: matchedUser.ID,
          name: matchedUser.Name,
          email: matchedUser.Email,
          course: courseNames,
          ip: latestLog?.IPAddress || session?.IPAddress || '118.69.182.45 (Viettel Corp)',
          device: latestLog?.UserAgent || session?.DeviceInfo || 'Chrome 122.0.0 Win10 x64',
          timestamp: latestLog?.Timestamp || new Date().toLocaleString('vi-VN'),
          riskLevel: latestLog?.Action === 'ANOMALY_SHARE' ? t('admin_alerts.risk_critical') : t('admin_alerts.risk_elevated'),
        });
        showToast(
          `${t('admin_alerts.toast_watermark_matched')} ${matchedUser.Name} (${matchedUser.ID})`,
          'success',
          t('admin_alerts.toast_watermark_title')
        );
      } else {
        setTraceError(
          `${t('admin_alerts.error_watermark_not_found_1')} "${searchWatermarkId.trim()}" ${t('admin_alerts.error_watermark_not_found_2')}`
        );
        setTracedStudent(null);
      }
      setIsSearching(false);
    }, 600);
  };

  const handleResolveAlert = (alertId) => {
    setAlerts((prev) =>
      prev.map((item) =>
        item.id === alertId ? { ...item, status: 'Resolved' } : item
      )
    );
    showToast(
      `${t('admin_alerts.toast_resolved_1')} ${alertId} ${t('admin_alerts.toast_resolved_2')}`,
      'success',
      t('admin_alerts.toast_status_updated')
    );
  };

  const handleReopenAlert = (alertId) => {
    setAlerts((prev) =>
      prev.map((item) =>
        item.id === alertId ? { ...item, status: 'open' } : item
      )
    );
    showToast(
      `${t('admin_alerts.toast_reopen_msg_1')} ${alertId} ${t('admin_alerts.toast_reopen_msg_2')}`,
      'info',
      t('admin_alerts.toast_status_updated')
    );
  };

  const handleOpenBanModal = (alertOrStudent) => {
    setSelectedUserToBan(alertOrStudent);
    setShowBanModal(true);
  };

  const handleConfirmBan = () => {
    if (!selectedUserToBan) return;
    const targetId = selectedUserToBan.studentId || selectedUserToBan.id;
    const targetName = selectedUserToBan.studentName || selectedUserToBan.name;

    setAlerts((prev) =>
      prev.map((a) =>
        a.studentId === targetId ? { ...a, status: 'Resolved' } : a
      )
    );

    setShowBanModal(false);
    showToast(
      `${t('admin_alerts.toast_revoked_1')} ${targetName} (${targetId}) ${t('admin_alerts.toast_revoked_2')}`,
      'danger',
      t('admin_alerts.toast_revoked_title')
    );
  };

  const renderRiskScoreBadge = (score) => {
    if (score >= 80) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 whitespace-nowrap">
          {score} / 100 {t('admin_alerts.high')}
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 whitespace-nowrap">
          {score} / 100 {t('admin_alerts.medium')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap">
        {score} / 100 {t('admin_alerts.low')}
      </span>
    );
  };

  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'resolved') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 whitespace-nowrap">
          {t('admin_alerts.status_resolved', 'Resolved')}
        </span>
      );
    }
    if (s === 'open' || s === 'new') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 whitespace-nowrap">
          {t('admin_alerts.status_open', 'Open')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 whitespace-nowrap">
        {status}
      </span>
    );
  };

  const totalAlerts = alerts.length;
  const newAlertsCount = alerts.filter((a) => (a.status || '').toLowerCase() !== 'resolved').length;
  const highRiskCount = alerts.filter((a) => a.riskScore > 80).length;

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t('admin_alerts.ai_anomaly_detection_erd')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('admin_alerts.anomaly_alerts_board')}{' '}
            <span className="text-blue-600 dark:text-blue-400">{t('admin_alerts.leak_tracing')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('admin_alerts.sync_desc')}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
            {t('admin_alerts.total_ai_alerts')}
          </span>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalAlerts}</h3>
        </div>

        <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 block mb-1">
            {t('admin_alerts.new_alerts')}
          </span>
          <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{newAlertsCount}</h3>
        </div>

        <div className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mb-1">
            {t('admin_alerts.high_risk')}
          </span>
          <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{highRiskCount}</h3>
        </div>

        <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block mb-1">
            {t('admin_alerts.access_logs')}
          </span>
          <h3 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
            {dbLogs.length} {t('admin_alerts.events')}
          </h3>
        </div>
      </div>

      {/* Primary Dashboard Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setMainDashboardTab('alerts')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            mainDashboardTab === 'alerts'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          Cảnh Báo AI & Rò Rỉ ({totalAlerts})
        </button>

        <button
          type="button"
          onClick={() => setMainDashboardTab('audit')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            mainDashboardTab === 'audit'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          Nhật Ký Truy Cập & Cấp Phép DRM (AccessLog & License Audit)
        </button>

        <button
          type="button"
          onClick={() => setMainDashboardTab('assets')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            mainDashboardTab === 'assets'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          Trạng Thái Mã Hóa Video DRM
        </button>
      </div>

      {/* VIEW 1: TRUY VẾT & CẤP PHÉP RIÊNG */}
      {mainDashboardTab === 'audit' && (
        <AccessLogLicenseAuditTable showAssetsTab={false} initialSearchQuery={searchWatermarkId} />
      )}

      {/* VIEW 2: TÀI SẢN MÃ HÓA DRM RIÊNG */}
      {mainDashboardTab === 'assets' && (
        <AccessLogLicenseAuditTable showAssetsTab={true} />
      )}

      {/* VIEW 3: CẢNH BÁO BẤT THƯỜNG AI & BẢNG ACCESSLOG LIÊN KẾT */}
      {mainDashboardTab === 'alerts' && (
        <>
          {/* SECTION 1: CÔNG CỤ TRUY VẾT RÒ RỈ TỪ WATERMARK */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {t('admin_alerts.watermark_leak_tracing_tool')}
                </h3>
              </div>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full border border-blue-200">
                {t('admin_alerts.search_student_db')}
              </span>
            </div>


        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t('admin_alerts.leak_desc_1')} <strong>{t('admin_alerts.watermark_code')}</strong> {t('admin_alerts.eg')}
          <code className="text-blue-600 font-bold mx-1">u-004</code>, <code className="text-blue-600 font-bold mx-1">u-005</code>
          {t('admin_alerts.leak_desc_2')}
        </p>

        <form onSubmit={handleTraceLeak} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={t('admin_alerts.search_placeholder')}
              value={searchWatermarkId}
              onChange={(e) => setSearchWatermarkId(e.target.value)}
              className="w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-xs font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{t('admin_alerts.searching')}</span>
              </>
            ) : (
              <span>{t('admin_alerts.trace_identity')}</span>
            )}
          </button>
        </form>

        {traceError && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{traceError}</span>
          </div>
        )}

        {/* KẾT QUẢ ĐỐI SOÁT WATERMARK TỪ DB */}
        {tracedStudent && (
          <div className="rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white mb-1.5">
                  {t('admin_alerts.watermark_matched')}
                </span>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">
                  {tracedStudent.name} ({t('admin_alerts.code_prefix')}
                  <code className="text-blue-600">{tracedStudent.id}</code>)
                </h4>
                <div className="text-xs text-slate-500 dark:text-slate-400">{tracedStudent.email}</div>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleOpenBanModal({
                    studentId: tracedStudent.id,
                    studentName: tracedStudent.name,
                  })
                }
                className="inline-flex items-center gap-1 rounded-full border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 text-rose-600 px-4 py-1.5 text-xs font-semibold hover:bg-rose-50 shadow-xs"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>{t('admin_alerts.revoke_access')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-blue-200/50 dark:border-blue-900/50">
              <div>
                <div className="text-slate-500 dark:text-slate-400">{t('admin_alerts.enrolled_courses')}</div>
                <div className="font-bold text-slate-800 dark:text-slate-200">{tracedStudent.course}</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">{t('admin_alerts.ip_session')}</div>
                <div className="font-bold text-slate-800 dark:text-slate-200">{tracedStudent.ip}</div>
              </div>
              <div>
                <div className="text-slate-500 dark:text-slate-400">{t('admin_alerts.risk_level')}</div>
                <div className="font-bold text-rose-600 dark:text-rose-400">{tracedStudent.riskLevel}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: BẢNG CẢNH BÁO BẤT THƯỜNG */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xl">
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {t('admin_alerts.ai_anomaly_list')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('admin_alerts.ai_anomaly_subtitle')}
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">ERD Table: anomalyAlerts</span>
        </div>

        {/* Controls Bar: Tabs & Search */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTableTab('pending')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTableTab === 'pending'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>{t('admin_alerts.tab_pending')}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTableTab === 'pending' ? 'bg-white text-rose-600' : 'bg-rose-100 text-rose-700'}`}>
                {pendingAlerts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTableTab('resolved')}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTableTab === 'resolved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>{t('admin_alerts.tab_resolved')}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTableTab === 'resolved' ? 'bg-white text-emerald-600' : 'bg-emerald-100 text-emerald-700'}`}>
                {resolvedAlerts.length}
              </span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={t('admin_alerts.search_user_placeholder')}
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              className="w-full rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-7 py-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            {userSearchTerm && (
              <button
                type="button"
                onClick={() => setUserSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 font-semibold whitespace-nowrap">{t('admin_alerts.alert_id')}</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap">{t('admin_alerts.student_id')}</th>
                <th className="py-3 px-3 font-semibold min-w-[170px]">{t('admin_alerts.abnormal_behavior')}</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap">{t('admin_alerts.related_course')}</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap text-center">{t('admin_alerts.risk_score')}</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap text-center">{t('admin_alerts.time')}</th>
                <th className="py-3 px-3 font-semibold whitespace-nowrap text-center">{t('admin_alerts.status')}</th>
                <th className="py-3 px-3 font-semibold text-center whitespace-nowrap">{t('admin_alerts.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(activeTableTab === 'pending' ? pendingAlerts : resolvedAlerts).length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    {userSearchTerm ? (
                      <div>{t('admin_alerts.no_user_found_matching')} "{userSearchTerm}".</div>
                    ) : activeTableTab === 'pending' ? (
                      <div className="text-emerald-600 font-semibold">
                        {t('admin_alerts.no_pending_alerts')}
                      </div>
                    ) : (
                      <div>{t('admin_alerts.no_resolved_alerts')}</div>
                    )}
                  </td>
                </tr>
              ) : (
                (activeTableTab === 'pending' ? pendingAlerts : resolvedAlerts).map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">{item.id}</td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {item.studentName || t('admin_alerts.anonymous_student')}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{item.studentId}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {t(item.anomalyTypeKey)}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                        {t(item.detailsKey)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {item.courseTitle || t('admin_alerts.info_sec_course')}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-center">{renderRiskScoreBadge(item.riskScore)}</td>
                    <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap text-center">
                      {item.rawTimestamp ? (
                        <div className="leading-tight">
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            {item.rawTimestamp.toLocaleTimeString(i18n.language === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {item.rawTimestamp.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN')}
                          </span>
                        </div>
                      ) : ''}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-center">{renderStatusBadge(item.status)}</td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        {activeTableTab === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => handleResolveAlert(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 whitespace-nowrap shrink-0 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5 shrink-0" />
                            <span>{t('admin_alerts.resolve_action')}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReopenAlert(item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 whitespace-nowrap shrink-0 transition-colors"
                          >
                            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                            <span>{t('admin_alerts.reopen_action')}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenBanModal(item)}
                          className="p-1 rounded-full text-rose-600 hover:bg-rose-50 border border-rose-200 shrink-0 transition-colors"
                          title={t('admin_alerts.block_student_rights')}
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {t('admin_alerts.showing_part1')}{' '}
            <strong>{(activeTableTab === 'pending' ? pendingAlerts : resolvedAlerts).length}</strong>{' '}
            {t('admin_alerts.showing_part2')}{' '}
            <strong>{activeTableTab === 'pending' ? t('admin_alerts.tab_pending') : t('admin_alerts.tab_resolved')}</strong>.
          </span>
          <span>
            {t('admin_alerts.total_part1')} <strong>{alerts.length}</strong>{' '}
            {t('admin_alerts.total_part2')}
          </span>
        </div>
      </div>

      {/* BẢNG NHẬT KÝ TRUY CẬP & CẤP PHÉP DRM LIÊN KẾT TRỰC TIẾP TRONG TAB CẢNH BÁO */}
      <AccessLogLicenseAuditTable embedded={true} initialSearchQuery={searchWatermarkId} />
    </>
  )}

      {/* MODAL KHÓA TÀI KHOẢN */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('admin_alerts.confirm_revoke_access')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBanModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {t('admin_alerts.confirm_revoke_msg')}
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200">
              {selectedUserToBan?.studentName} ({t('admin_alerts.code_prefix')}
              <code>{selectedUserToBan?.studentId}</code>)
            </div>

            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              {t('admin_alerts.revoke_warning')}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowBanModal(false)}
                className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmBan}
                className="rounded-full bg-rose-600 hover:bg-rose-700 px-4 py-1.5 text-xs font-semibold text-white shadow-xs"
              >
                {t('admin_alerts.confirm_revoke')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
