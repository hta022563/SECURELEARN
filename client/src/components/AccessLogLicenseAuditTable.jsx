import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  RotateCcw,
  Ban,
  Clock,
  Key,
  Video,
  User,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Lock,
  Layers,
  FileCode,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  getAdminLicenseAudit,
  getAdminDrmAssets,
  revokeDrmSession,
} from '../services/drmService';
import { revokeCourseEntitlement } from '../services/entitlementService';

/**
 * =============================================================================
 * COMPONENT: AccessLogLicenseAuditTable
 * =============================================================================
 * Bảng hiển thị Nhật ký truy cập & Cấp phép DRM (AccessLog & License Audit)
 * và Quản lý trạng thái mã hóa Video DRM (DRM Assets).
 *
 * Khớp 100% với Database Schema & DRM License Server Spec:
 * - ID, UserID, Username, VideoID, assetId
 * - Action: PLAY_VIDEO, REQUEST_LICENSE, GRANTED, DENIED
 * - reasonCode: NO_ENTITLEMENT, PLAYBACK_SESSION_INVALID, KID_NOT_AUTHORIZED_FOR_ASSET, ASSET_NOT_READY
 * - SignedURLID / sessionId (đối chiếu Dynamic Watermark)
 * - AccessTime
 * - Thao tác: "Thu hồi phiên (Revoke)" & "Khóa quyền"
 * =============================================================================
 */
export default function AccessLogLicenseAuditTable({
  initialSearchQuery = '',
  embedded = false,
  showAssetsTab = true,
}) {
  const { showToast } = useToast();

  // State Quản lý Tab: 'audit' (AccessLog & License Audit) hoặc 'assets' (DRM Encrypted Assets)
  const [activeSubTab, setActiveSubTab] = useState('audit');

  // Dữ liệu Audit Logs & Assets
  const [logs, setLogs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc & Tìm kiếm
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal Khóa quyền
  const [banModalData, setBanModalData] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Nạp dữ liệu từ Backend API
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [auditData, assetsData] = await Promise.all([
        getAdminLicenseAudit(),
        getAdminDrmAssets(),
      ]);
      setLogs(auditData || []);
      setAssets(assetsData || []);
    } catch (err) {
      console.warn('[AccessLogAudit] Lỗi tải dữ liệu audit/assets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Đồng bộ khi initialSearchQuery từ bên ngoài thay đổi
  useEffect(() => {
    if (initialSearchQuery) {
      setSearchTerm(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  // Xử lý Lọc danh sách Audit Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      // 1. Lọc theo trạng thái
      if (statusFilter !== 'ALL') {
        if (item.action !== statusFilter) return false;
      }

      // 2. Tìm kiếm theo UserID, Username, SignedURLID / sessionId
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchUser = (item.userId || '').toLowerCase().includes(q) ||
                          (item.username || '').toLowerCase().includes(q);
        const matchSession = (item.signedUrlId || '').toLowerCase().includes(q) ||
                             (item.sessionId || '').toLowerCase().includes(q);
        const matchVideo = (item.videoId || '').toLowerCase().includes(q) ||
                           (item.assetId || '').toLowerCase().includes(q);
        if (!matchUser && !matchSession && !matchVideo) return false;
      }

      return true;
    });
  }, [logs, statusFilter, searchTerm]);

  // Xử lý: Thu hồi phiên phát khẩn cấp (DELETE /api/v1/drm/session/{sessionId})
  const handleRevokeSession = async (item) => {
    const sessionId = item.sessionId || item.signedUrlId;
    if (!sessionId) {
      showToast('Không xác định được Session ID để thu hồi.', 'warning');
      return;
    }

    try {
      const res = await revokeDrmSession(sessionId);
      showToast(
        res?.message || `Đã thu hồi phiên DRM "${sessionId}" thành công!`,
        'success',
        'Thu hồi phiên thành công'
      );

      // Cập nhật giao diện sang trạng thái REVOKED
      setLogs((prev) =>
        prev.map((log) =>
          (log.sessionId === sessionId || log.signedUrlId === sessionId)
            ? { ...log, action: 'DENIED', reasonCode: 'SESSION_REVOKED' }
            : log
        )
      );
    } catch (err) {
      showToast(err.message || 'Lỗi khi thu hồi phiên phát.', 'danger');
    }
  };

  // Mở modal xác nhận khóa quyền học viên
  const handleOpenBanModal = (item) => {
    setBanModalData(item);
  };

  // Xác nhận khóa quyền
  const handleConfirmBanEntitlement = async () => {
    if (!banModalData) return;
    setIsRevoking(true);
    try {
      const userSub = banModalData.userId || banModalData.username;
      const courseOrVideo = banModalData.videoId || banModalData.assetId || 'course-all';

      await revokeCourseEntitlement(courseOrVideo, userSub);
      showToast(
        `Đã khóa quyền truy cập khóa học của học viên ${banModalData.username} (${userSub})!`,
        'success',
        'Khóa quyền thành công'
      );
      setBanModalData(null);
    } catch (err) {
      showToast(err.message || 'Khóa quyền thất bại.', 'danger');
    } finally {
      setIsRevoking(false);
    }
  };

  // Badge hiển thị Action & reasonCode
  const renderActionBadge = (action, reasonCode) => {
    switch (action) {
      case 'GRANTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            GRANTED
          </span>
        );
      case 'DENIED':
        return (
          <div className="flex flex-col items-start gap-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
              <XCircle className="h-3 w-3" />
              DENIED
            </span>
            {reasonCode && (
              <span
                className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                title={`Mã lý do từ chối: ${reasonCode}`}
              >
                {reasonCode}
              </span>
            )}
          </div>
        );
      case 'REQUEST_LICENSE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
            <Key className="h-3 w-3" />
            REQUEST_LICENSE
          </span>
        );
      case 'PLAY_VIDEO':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
            <Video className="h-3 w-3" />
            {action || 'PLAY_VIDEO'}
          </span>
        );
    }
  };

  const renderAssetStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'READY') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          READY
        </span>
      );
    }
    if (s === 'PROCESSING') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
          <Loader2 className="h-3 w-3 animate-spin" />
          PROCESSING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
        <AlertTriangle className="h-3 w-3" />
        FAILED
      </span>
    );
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden ${embedded ? '' : 'my-6'}`}>
      {/* 1. Header & Tab Điều Hướng */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mb-0.5 flex items-center gap-2">
              <span>Nhật ký truy cập & Cấp phép DRM</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold">
                AccessLog & License Audit
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0">
              Đối soát quyền xem (Entitlement), mã phiên Watermark và cấp phát License W3C Clear Key
            </p>
          </div>
        </div>

        {/* Tab Switcher & Nút Tải Lại */}
        <div className="flex items-center gap-2 shrink-0">
          {showAssetsTab && (
            <div className="inline-flex p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setActiveSubTab('audit')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSubTab === 'audit'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Nhật ký License ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('assets')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeSubTab === 'assets'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Tài sản mã hóa ({assets.length})
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Làm mới dữ liệu từ Backend API"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. TAB: LICENSE AUDIT & ACCESS LOG */}
      {activeSubTab === 'audit' && (
        <div>
          {/* Thanh tìm kiếm & Bộ lọc trạng thái */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo UserID, SignedURLID, Mã phiên, VideoID..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 font-semibold mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Lọc:
              </span>
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'GRANTED', label: 'Cấp phép (GRANTED)' },
                { id: 'DENIED', label: 'Từ chối (DENIED)' },
                { id: 'REQUEST_LICENSE', label: 'Yêu cầu khóa' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStatusFilter(item.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    statusFilter === item.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bảng Dữ Liệu */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Học viên (User)</th>
                  <th className="py-3 px-4">Bài giảng / Asset</th>
                  <th className="py-3 px-4">Hành động & Lý do</th>
                  <th className="py-3 px-4">Mã phiên / Signed URL ID</th>
                  <th className="py-3 px-4">Thời gian truy cập</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600 mb-2" />
                      Đang tải dữ liệu kiểm toán từ hệ thống...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Không tìm thấy bản ghi kiểm toán phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Log ID */}
                      <td className="py-3 px-4 font-mono text-slate-500">
                        <code>{item.id}</code>
                      </td>

                      {/* Học viên (UserID / Username) */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.username}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {item.userId}
                        </div>
                      </td>

                      {/* VideoID / Asset */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-800 dark:text-slate-200">
                          {item.videoId || item.assetId}
                        </div>
                        {item.assetId && item.assetId !== item.videoId && (
                          <div className="font-mono text-[10px] text-slate-400">
                            Asset: {item.assetId}
                          </div>
                        )}
                      </td>

                      {/* Hành động (Action) kèm lý do (reasonCode) */}
                      <td className="py-3 px-4">
                        {renderActionBadge(item.action, item.reasonCode)}
                      </td>

                      {/* SignedURLID / SessionID (Đối chiếu Watermark) */}
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-blue-600 dark:text-blue-400 border border-slate-200/60 dark:border-slate-700">
                          <span>{item.signedUrlId || item.sessionId}</span>
                        </div>
                      </td>

                      {/* Thời gian */}
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          <span>
                            {item.accessTime
                              ? item.accessTime.replace('T', ' ').slice(0, 19)
                              : 'Vừa truy cập'}
                          </span>
                        </div>
                        {item.ip && (
                          <div className="text-[10px] text-slate-400">IP: {item.ip}</div>
                        )}
                      </td>

                      {/* Thao tác: Thu hồi phiên & Khóa quyền */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Nút Thu hồi phiên */}
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Hủy phiên DRM này ngay lập tức (Chuyển sang REVOKED)"
                          >
                            <Ban className="h-3 w-3" />
                            <span>Thu hồi</span>
                          </button>

                          {/* Nút Khóa quyền */}
                          <button
                            type="button"
                            onClick={() => handleOpenBanModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Tước quyền xem khóa học của học viên này"
                          >
                            <Lock className="h-3 w-3" />
                            <span>Khóa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer thông tin số lượng */}
          <div className="p-3.5 bg-slate-50/50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>
              Hiển thị <strong className="text-slate-700 dark:text-slate-200">{filteredLogs.length}</strong> / {logs.length} bản ghi kiểm toán
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Database: AccessLog & DRM License Server Audit
            </span>
          </div>
        </div>
      )}

      {/* 3. TAB: DRM ENCRYPTED ASSETS */}
      {showAssetsTab && activeSubTab === 'assets' && (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Asset ID (Content ID)</th>
                  <th className="py-3 px-4">Tiêu đề & Bài giảng</th>
                  <th className="py-3 px-4">Trạng thái mã hóa</th>
                  <th className="py-3 px-4">Key ID (KID Hex)</th>
                  <th className="py-3 px-4">Đường dẫn Manifest</th>
                  <th className="py-3 px-4">Thời gian tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      Chưa có video DRM nào được mã hóa trong hệ thống.
                    </td>
                  </tr>
                ) : (
                  assets.map((asset) => (
                    <tr
                      key={asset.assetId}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {asset.assetId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {asset.title}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          Lecture: {asset.lectureId}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {renderAssetStatusBadge(asset.status)}
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {asset.kidHex || 'N/A'}
                        </code>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {asset.manifestPath || '/drm/manifests/stream.mpd'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {asset.createdAt ? asset.createdAt.slice(0, 10) : '2026-10-18'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL KHÓA QUYỀN HỌC VIÊN */}
      {banModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-base font-bold text-rose-600 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <span>Xác nhận khóa quyền truy cập</span>
              </h4>
              <button
                type="button"
                onClick={() => setBanModalData(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn tước quyền xem khóa học của học viên này? Hành động này sẽ gọi API thu hồi Entitlement và ngay lập tức chặn truy cập video.
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div>
                <strong className="text-slate-900 dark:text-white">Học viên:</strong> {banModalData.username}
              </div>
              <div className="text-slate-500 font-mono">
                User ID: {banModalData.userId}
              </div>
              <div className="text-slate-500 font-mono">
                Session ID: {banModalData.sessionId || banModalData.signedUrlId}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBanModalData(null)}
                className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isRevoking}
                onClick={handleConfirmBanEntitlement}
                className="rounded-full bg-rose-600 hover:bg-rose-700 px-5 py-1.5 text-xs font-semibold text-white shadow-xs disabled:opacity-60"
              >
                {isRevoking ? 'Đang khóa...' : 'Xác nhận khóa quyền'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

AccessLogLicenseAuditTable.propTypes = {
  initialSearchQuery: PropTypes.string,
  embedded: PropTypes.bool,
  showAssetsTab: PropTypes.bool,
};
