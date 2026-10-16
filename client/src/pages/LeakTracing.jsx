import React, { useState } from 'react';
import {
  Shield,
  Search,
  Scan,
  AlertTriangle,
  Lock,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import {
  users as dbUsers,
  courses as dbCourses,
  entitlements as dbEntitlements,
  sessions as dbSessions,
  anomalyAlerts as dbAlerts,
} from '../data/mockDatabase';

/**
 * =============================================================================
 * PAGE: LeakTracing (Pure Tailwind CSS, Lucide Icons & 100% i18n Localization)
 * =============================================================================
 */
export default function LeakTracing() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [searchWatermarkId, setSearchWatermarkId] = useState('');
  const [tracedStudent, setTracedStudent] = useState(null);
  const [traceError, setTraceError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);

  // Lịch sử đối soát rò rỉ sinh động từ bảng anomalyAlerts với Canonical Keys
  const [recentTraces, setRecentTraces] = useState(() => {
    return dbAlerts.map((alert, idx) => {
      const students = dbUsers.filter((u) => (u.Role || '').toLowerCase() === 'student');
      const student = students[idx % students.length] || dbUsers[3];
      const riskScore = Math.round(alert.Score * 100);

      let statusKey = 'under_investigation';
      let actionKey = 'warning_issued';
      if ((alert.Status || '').toLowerCase() === 'resolved') {
        statusKey = 'resolved';
        actionKey = 'rights_restored';
      } else if (riskScore > 80) {
        statusKey = 'leak_confirmed';
        actionKey = 'account_suspended';
      }

      return {
        id: `TRC-${alert.ID.replace('aa-', '9')}`,
        watermarkId: student?.ID || '',
        studentName: student?.Username || 'Student',
        statusKey,
        actionKey,
        tracedAt: alert.Timestamp ? alert.Timestamp.replace('T', ' ').replace('Z', '') : '2025-03-20 17:45',
        score: riskScore,
      };
    });
  });

  const renderStatusBadge = (statusKey) => {
    switch (statusKey) {
      case 'leak_confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 whitespace-nowrap">
            {t('watermark_trace.status_leak_confirmed')}
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
            {t('watermark_trace.status_resolved')}
          </span>
        );
      case 'under_investigation':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 whitespace-nowrap">
            {t('watermark_trace.status_under_investigation')}
          </span>
        );
    }
  };

  const renderActionText = (actionKey) => {
    switch (actionKey) {
      case 'rights_restored':
        return t('watermark_trace.action_rights_restored');
      case 'account_suspended':
        return t('watermark_trace.action_account_suspended');
      case 'access_revoked':
        return t('watermark_trace.action_access_revoked');
      case 'warning_issued':
      default:
        return t('watermark_trace.action_warning_issued');
    }
  };

  const handleTraceLeak = (e) => {
    e.preventDefault();
    const query = searchWatermarkId.trim().toLowerCase();

    if (!query) {
      setTraceError(t('watermark_trace.error_empty_input'));
      setTracedStudent(null);
      return;
    }

    setIsSearching(true);
    setTraceError(null);

    setTimeout(() => {
      setIsSearching(false);

      const matchedUser = dbUsers.find(
        (u) =>
          u.ID.toLowerCase() === query ||
          u.Username.toLowerCase().includes(query)
      );

      if (matchedUser) {
        const enrolledCourses = dbEntitlements
          .filter((e) => e.UserID === matchedUser.ID && (e.Status === 'active' || e.Status === 'completed'))
          .map((e) => {
            const c = dbCourses.find((course) => course.ID === e.CoursesID);
            return c ? c.Title : e.CoursesID;
          });

        const session = dbSessions.find((s) => s['JWT credential']?.includes(matchedUser.ID)) || dbSessions[0];

        setTracedStudent({
          id: matchedUser.ID,
          name: matchedUser.Username.split('@')[0],
          email: matchedUser.Username,
          role: matchedUser.Role,
          course: enrolledCourses.length > 0 ? enrolledCourses.join(', ') : t('watermark_trace.not_enrolled'),
          ip: '14.241.120.45 (Viettel - Hanoi)',
          device: 'Chrome / Windows 11',
          sessionJoinTime: session?.JoinTime ? session.JoinTime.replace('T', ' ').replace('Z', '') : '2025-01-10 07:55',
          riskLevel: matchedUser.Role === 'admin' ? t('watermark_trace.risk_safe_admin') : t('watermark_trace.risk_high_danger'),
        });
        setTraceError(null);
      } else {
        setTraceError(
          `${t('watermark_trace.error_not_found_part1')}${searchWatermarkId}${t('watermark_trace.error_not_found_part2')}`
        );
        setTracedStudent(null);
      }
    }, 300);
  };

  const handleConfirmBan = () => {
    if (!tracedStudent) return;

    dbEntitlements.forEach((e) => {
      if (e.UserID === tracedStudent.id) {
        e.Status = 'expired';
      }
    });

    setRecentTraces((prev) => [
      {
        id: `TRC-${Date.now().toString().slice(-4)}`,
        watermarkId: tracedStudent.id,
        studentName: tracedStudent.email,
        statusKey: 'leak_confirmed',
        actionKey: 'access_revoked',
        tracedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        score: 95,
      },
      ...prev,
    ]);

    setShowBanModal(false);
    showToast(
      t('watermark_trace.toast_revoked_success', { id: tracedStudent.id, email: tracedStudent.email }),
      'success',
      t('watermark_trace.toast_revoked_title')
    );
  };

  return (
    <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2 whitespace-nowrap">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span>{t('watermark_trace.badge_drm_security')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
            {t('watermark_trace.title_part1')}
            <span className="text-blue-600 dark:text-blue-400">{t('watermark_trace.title_part2')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t('watermark_trace.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Khung Nhập Mã Watermark */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-600 shrink-0" />
            <span>{t('watermark_trace.lookup_card_title')}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
            {t('watermark_trace.lookup_card_desc_part1')}
            <code className="text-blue-600 font-mono">u-004</code>,{' '}
            <code className="text-blue-600 font-mono">u-005</code>,{' '}
            <code className="text-blue-600 font-mono">u-006</code>
            {t('watermark_trace.lookup_card_desc_part2')}
          </p>

          <form onSubmit={handleTraceLeak} className="mb-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Scan className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder={t('watermark_trace.input_placeholder')}
                  value={searchWatermarkId}
                  onChange={(e) => setSearchWatermarkId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                {isSearching ? t('watermark_trace.btn_tracing') : t('watermark_trace.btn_trace')}
              </button>
            </div>
          </form>

          {traceError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 mb-4">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{traceError}</span>
            </div>
          )}

          {/* Chi tiết học viên khớp Watermark */}
          {tracedStudent && (
            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-850 border border-rose-200 dark:border-rose-900/60 mt-4 space-y-4">
              <div className="flex justify-between items-start flex-wrap gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 mb-2 whitespace-nowrap">
                    {t('watermark_trace.badge_matched')}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {tracedStudent.name} ({t('watermark_trace.code_prefix')}
                    <code className="text-blue-600 font-mono">{tracedStudent.id}</code>)
                  </h4>
                  <div className="text-xs text-slate-500">{tracedStudent.email}</div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBanModal(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-rose-300 dark:border-rose-800 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 whitespace-nowrap shrink-0"
                >
                  <Lock className="h-3 w-3 shrink-0" />
                  <span>{t('watermark_trace.btn_revoke_access')}</span>
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-slate-400">{t('watermark_trace.label_enrolled_courses')}</span>
                  <strong className="text-slate-800 dark:text-slate-200">{tracedStudent.course}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-slate-400">{t('watermark_trace.label_ip_device')}</span>
                  <strong className="text-slate-800 dark:text-slate-200">
                    {tracedStudent.ip} • {tracedStudent.device}
                  </strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-slate-400">{t('watermark_trace.label_session_join')}</span>
                  <span className="text-slate-600 dark:text-slate-300">{tracedStudent.sessionJoinTime}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">{t('watermark_trace.label_risk_level')}</span>
                  <strong className="text-rose-600 dark:text-rose-400 font-bold">
                    {tracedStudent.riskLevel}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hướng Dẫn Kỹ Thuật Watermark */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            {t('watermark_trace.mechanism_title')}
          </h3>
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <strong className="text-slate-900 dark:text-white block mb-1">
                {t('watermark_trace.step1_title')}
              </strong>
              {t('watermark_trace.step1_desc')}
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <strong className="text-slate-900 dark:text-white block mb-1">
                {t('watermark_trace.step2_title')}
              </strong>
              {t('watermark_trace.step2_desc')}
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <strong className="text-slate-900 dark:text-white block mb-1">
                {t('watermark_trace.step3_title')}
              </strong>
              {t('watermark_trace.step3_desc_part1')}
              <code className="text-blue-600 font-mono">users</code>
              {t('watermark_trace.step3_desc_part2')}
              <code className="text-blue-600 font-mono">sessions</code>
              {t('watermark_trace.step3_desc_part3')}
            </div>
          </div>
        </div>
      </div>

      {/* Lịch Sử Các Đợt Đối Soát Rò Rỉ */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-850">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-0">
            {t('watermark_trace.history_card_title')}
          </h4>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900 whitespace-nowrap">
            ERD Table: anomalyAlerts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-5 whitespace-nowrap">{t('watermark_trace.col_trace_id')}</th>
                <th className="py-3 px-5 whitespace-nowrap">{t('watermark_trace.col_watermark_id')}</th>
                <th className="py-3 px-5 whitespace-nowrap">{t('watermark_trace.col_account_email')}</th>
                <th className="py-3 px-5 whitespace-nowrap text-center">{t('watermark_trace.col_status')}</th>
                <th className="py-3 px-5 whitespace-nowrap">{t('watermark_trace.col_action_taken')}</th>
                <th className="py-3 px-5 whitespace-nowrap">{t('watermark_trace.col_trace_time')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTraces.map((trace) => (
                <tr key={trace.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-5 font-mono text-slate-500 whitespace-nowrap">
                    <code>{trace.id}</code>
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {trace.watermarkId}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    {trace.studentName}
                  </td>
                  <td className="py-3.5 px-5 text-center whitespace-nowrap">
                    {renderStatusBadge(trace.statusKey)}
                  </td>
                  <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {renderActionText(trace.actionKey)}
                  </td>
                  <td className="py-3.5 px-5 text-slate-400 whitespace-nowrap">
                    {trace.tracedAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
          {t('watermark_trace.showing_history_part1')}
          <strong className="text-slate-700 dark:text-slate-200">{recentTraces.length}</strong>
          {t('watermark_trace.showing_history_part2')}
        </div>
      </div>

      {/* MODAL THU HỒI QUYỀN */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-base font-bold text-rose-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>{t('watermark_trace.modal_revoke_title')}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowBanModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {t('watermark_trace.modal_revoke_msg')}
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
              <strong className="text-slate-900 dark:text-white block">{tracedStudent?.email}</strong>
              <span className="text-slate-400 font-mono">
                {t('watermark_trace.modal_code_prefix')}
                {tracedStudent?.id}
              </span>
            </div>

            <p className="text-[11px] text-rose-500">
              {t('watermark_trace.modal_revoke_warning')}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowBanModal(false)}
                className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50"
              >
                {t('watermark_trace.modal_btn_cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmBan}
                className="rounded-full bg-rose-600 hover:bg-rose-700 px-5 py-1.5 text-xs font-semibold text-white shadow-xs"
              >
                {t('watermark_trace.modal_btn_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
