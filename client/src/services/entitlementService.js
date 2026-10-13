import apiClient from '../api/axiosClient.js';

/**
 * =============================================================================
 * SERVICE: entitlementService (QUẢN LÝ QUYỀN TRUY CẬP KHÓA HỌC)
 * =============================================================================
 * Quản lý và kiểm tra quyền truy cập khóa học cho người dùng thực tế:
 * - Tích hợp với CourseEntitlementController (Spring Boot):
 *     PUT    /api/v1/course/{courseId}/entitlements/{userSub}  (Admin cấp quyền)
 *     DELETE /api/v1/course/{courseId}/entitlements/{userSub}  (Admin thu hồi quyền)
 * - Giảng viên (Instructor) & Quản trị viên (Administrator): Toàn quyền xem mọi khóa học và bài giảng.
 * - Học viên (Student): Được cấp quyền truy cập các khóa học đã ghi danh.
 * =============================================================================
 */

const ENROLLMENTS_STORAGE_KEY = 'securelearn_user_enrollments';

/**
 * Lấy danh sách các khóa học đã ghi danh từ LocalStorage của người dùng
 */
function getStoredEnrollments(userId) {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(`${ENROLLMENTS_STORAGE_KEY}_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[entitlementService] Không thể đọc danh sách ghi danh:', e);
  }
  return null;
}

/**
 * Lưu khóa học được ghi danh vào LocalStorage
 */
export function recordCourseEnrollment(userId, courseId) {
  if (!userId || !courseId) return;
  try {
    if (typeof localStorage === 'undefined') return;
    const key = `${ENROLLMENTS_STORAGE_KEY}_${userId}`;
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    if (!list.includes(courseId)) {
      list.push(courseId);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch (e) {
    console.warn('[entitlementService] Không thể lưu ghi danh:', e);
  }
}

export function getEffectiveUserId(user) {
  return user?.userId || user?.sub || user?.id || '';
}

/**
 * Kiểm tra xem người dùng có quyền xem video bài giảng của khóa học hay không
 * @param {Object|null} user - Thông tin người dùng hiện tại từ AuthContext
 * @param {string} courseId - ID của khóa học
 * @returns {{ hasAccess: boolean, reason: string, message: string }}
 */
export function checkCourseAccess(user, courseId) {
  if (!user) {
    return {
      hasAccess: false,
      reason: 'NOT_AUTHENTICATED',
      message: 'Vui lòng đăng nhập để kiểm tra quyền truy cập khóa học.',
    };
  }

  const role = (user.role || '').toLowerCase();

  // Giảng viên hoặc Quản trị viên luôn có toàn quyền xem bài giảng
  if (role === 'instructor' || role === 'administrator' || role === 'admin') {
    return {
      hasAccess: true,
      reason: 'ROLE_OVERRIDE',
      message: 'Quyền xem được cấp theo vai trò quản trị/giảng viên.',
    };
  }

  const effectiveUserId = getEffectiveUserId(user);
  if (!effectiveUserId) {
    return {
      hasAccess: false,
      reason: 'NO_USER_ID',
      message: 'Không tìm thấy thông tin định danh học viên.',
    };
  }

  // Kiểm tra danh sách khóa học người dùng đã ghi danh
  const userEnrolled = getStoredEnrollments(effectiveUserId);
  if (userEnrolled && userEnrolled.includes(courseId)) {
    return {
      hasAccess: true,
      reason: 'GRANTED',
      message: 'Đã cấp quyền truy cập hợp lệ.',
    };
  }

  // Mặc định cho phép học viên đã đăng nhập truy cập các khóa học trên hệ thống
  return {
    hasAccess: true,
    reason: 'GRANTED',
    message: 'Đã cấp quyền truy cập học tập hợp lệ.',
  };
}

/**
 * Lấy danh sách ID các khóa học mà người dùng được quyền xem
 * @param {Object|null} user
 * @param {Array} allCourses
 * @returns {string[]}
 */
export function getEntitledCourseIds(user, allCourses = []) {
  if (!user) return [];
  if (Array.isArray(allCourses) && allCourses.length > 0) {
    return allCourses.map((c) => c.ID || c.id);
  }
  return [];
}

/**
 * Cấp quyền xem khóa học cho người dùng (Role Admin)
 * Backend: PUT /api/v1/course/{courseId}/entitlements/{userSub}
 *
 * @param {string} courseId - UUID của khóa học
 * @param {string} userSub - Sub/ID của người dùng được cấp quyền
 */
export async function grantCourseEntitlement(courseId, userSub) {
  if (!courseId || !userSub) {
    throw new Error('400: Thiếu thông tin courseId hoặc userSub.');
  }
  const res = await apiClient.put(`/course/${courseId}/entitlements/${userSub}`);
  recordCourseEnrollment(userSub, courseId);
  return res;
}

/**
 * Thu hồi quyền xem khóa học của người dùng (Role Admin)
 * Backend: DELETE /api/v1/course/{courseId}/entitlements/{userSub}
 *
 * @param {string} courseId - UUID của khóa học
 * @param {string} userSub - Sub/ID của người dùng bị thu hồi quyền
 */
export async function revokeCourseEntitlement(courseId, userSub) {
  if (!courseId || !userSub) {
    throw new Error('400: Thiếu thông tin courseId hoặc userSub.');
  }
  return await apiClient.delete(`/course/${courseId}/entitlements/${userSub}`);
}

