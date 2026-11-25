import apiClient from '../api/axiosClient.js';

/**
 * =============================================================================
 * SERVICE: adminService (QUẢN TRỊ NGƯỜI DÙNG SPRING BOOT & AWS COGNITO)
 * =============================================================================
 * Tích hợp trực tiếp với AdminController.java phía Spring Boot:
 * Base URL: http://localhost:8080/api/v1
 *
 * 1. GET    /api/v1/admin/user?limit={limit}&nextToken={token} -> Lấy danh sách người dùng AWS Cognito
 * 2. POST   /api/v1/admin/register                             -> Admin đăng ký tài khoản mới
 * 3. POST   /api/v1/admin/update                               -> Admin cập nhật mật khẩu người dùng
 * 4. DELETE /api/v1/admin/delete                               -> Admin xóa tài khoản
 * =============================================================================
 */

/**
 * Lấy danh sách người dùng từ AWS Cognito qua AdminController
 * @param {{ limit?: number, nextToken?: string }} params
 * @returns {Promise<{ users: Array, nextToken: string|null }>}
 */
export async function getAdminUsers({ limit = 50, nextToken = null } = {}) {
  const params = { limit };
  if (nextToken) params.nextToken = nextToken;

  const res = await apiClient.get('/admin/user', { params });
  const rawUsers = res?.users || [];

  const users = rawUsers.map((u) => {
    const rawAttrs = u.attributes || u.Attributes || [];
    const getAttr = (name) => {
      const found = rawAttrs.find(
        (a) => (a.name || a.Name)?.toLowerCase() === name.toLowerCase()
      );
      return found ? (found.value || found.Value) : '';
    };

    const username = u.username || u.Username || '';
    const email = getAttr('email') || username;
    const name = getAttr('name') || email.split('@')[0];
    const sub = getAttr('sub') || username;
    const roleAttr = u.role || getAttr('custom:role') || getAttr('role');

    // Phân loại Vai trò
    let role = 'Student';
    if (roleAttr) {
      const r = roleAttr.toLowerCase();
      if (r === 'admin' || r === 'administrator') role = 'Administrator';
      else if (r === 'instructor') role = 'Instructor';
    } else if (email.toLowerCase().includes('admin')) {
      role = 'Administrator';
    } else if (email.toLowerCase().includes('instructor')) {
      role = 'Instructor';
    }

    return {
      id: sub || username || email,
      sub: sub || username || email,
      username: email || username,
      email: email,
      fullName: name,
      role: role,
      status: u.userStatus || u.UserStatus || 'CONFIRMED',
      enabled: u.enabled !== undefined ? u.enabled : (u.Enabled !== undefined ? u.Enabled : true),
      creationTime: u.userCreateDate || u.UserCreateDate || new Date().toISOString(),
      lastModified: u.userLastModifiedDate || u.UserLastModifiedDate,
      assignedCourses: [],
    };
  });

  return {
    users,
    nextToken: res?.nextToken || null,
  };
}

/**
 * Đăng ký tài khoản người dùng bởi Admin
 * @param {{ fullName: string, email: string, password: string, role: string }} payload
 */
export async function createAdminUser({ fullName, email, password, role }) {
  return await apiClient.post('/admin/register', {
    fullName: fullName || email.split('@')[0],
    email: email.trim().toLowerCase(),
    password,
    role: (role || 'instructor').toLowerCase(),
  });
}

/**
 * Admin đặt lại mật khẩu cho tài khoản người dùng
 * @param {{ email: string, password: string }} payload
 */
export async function updateAdminUserPassword({ email, password }) {
  return await apiClient.post('/admin/update', {
    email: email.trim().toLowerCase(),
    password,
  });
}

/**
 * Admin xóa tài khoản khỏi AWS Cognito
 * @param {string} email
 */
export async function deleteAdminUser(email) {
  return await apiClient.delete('/admin/delete', {
    data: email.trim().toLowerCase(),
    headers: { 'Content-Type': 'text/plain' },
  });
}

// Endpoint lấy AccessLog và Anomaly Alerts cho Admin (chỉnh path tại đây nếu BE đặt route khác)
export const ADMIN_LOGS_ENDPOINT = '/admin/logs';
export const ADMIN_ALERTS_ENDPOINT = '/admin/alerts';

/**
 * Lấy danh sách AccessLog từ bảng AccessLog (không dùng /ai/logs vốn dành cho AI đọc raw log)
 * @returns {Promise<Array>}
 */
export async function getAccessLogs() {
  const res = await apiClient.get(ADMIN_LOGS_ENDPOINT);
  const rawLogs = Array.isArray(res) ? res : res?.logs || res?.data || [];
  return rawLogs.map((log, idx) => ({
    logId: log.logId || log.id || `log-${idx}`,
    userEmail: (log.userEmail || log.email || '').trim(),
    accessedTime: log.accessedTime || log.timestamp || null,
    actionType: log.actionType || 'UNKNOWN',
    ipAddress: log.ipAddress || '',
    userAgent: log.userAgent || '',
    deviceFingerprint: log.device_fingerprint || log.deviceFingerprint || '',
    downloadInterval: Number(log.downloadInterval || 0),
    statusCode: Number(log.statusCode || 200),
    segmentCount: Number(log.segmentCount || 0),
    lessonId: log.lessonId || null,
  }));
}

/**
 * Lấy danh sách cảnh báo bất thường (AI Alerts / aiLog) từ Backend
 * @returns {Promise<Array>}
 */
export async function getAnomalyAlerts() {
  const res = await apiClient.get(ADMIN_ALERTS_ENDPOINT);
  return Array.isArray(res) ? res : res?.alerts || res?.data || [];
}
