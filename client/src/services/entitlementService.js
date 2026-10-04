import { entitlements, courses } from '../data/mockDatabase';

/**
 * =============================================================================
 * SERVICE: entitlementService
 * =============================================================================
 * Quản lý và kiểm tra quyền truy cập khóa học theo dữ liệu mềm từ bảng entitlements.
 * Quy định cốt lõi:
 * - Khóa học trong danh mục chưa được cấp quyền xem thì chưa thể xem được.
 * - Chỉ các khóa học đã được ghi danh hợp lệ (active / completed) trong "Khóa học của tôi"
 *   mới được phép xem video bài giảng.
 * =============================================================================
 */

export function getEffectiveUserId(user) {
  return user?.userId || '';
}

/**
 * Kiểm tra xem người dùng có quyền xem video bài giảng của khóa học hay không
 * @param {Object|null} user - Thông tin người dùng hiện tại từ AuthContext
 * @param {string} courseId - ID của khóa học (c-001, c-002, ...)
 * @returns {{ hasAccess: boolean, reason: string, message: string, entitlement?: Object }}
 */
export function checkCourseAccess(user, courseId) {
  if (!user) {
    return {
      hasAccess: false,
      reason: 'NOT_AUTHENTICATED',
      message: 'Vui lòng đăng nhập để kiểm tra quyền truy cập khóa học.',
    };
  }

  // Giảng viên hoặc Quản trị viên được xem trước nội dung
  if (user.role === 'Instructor' || user.role === 'Administrator') {
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

  const userEntitlement = entitlements.find(
    (e) => e.UserID === effectiveUserId && e.CoursesID === courseId
  );

  if (!userEntitlement) {
    return {
      hasAccess: false,
      reason: 'NOT_ENROLLED',
      message: 'Khóa học này bạn chưa được cấp quyền xem. Chỉ các khóa học có trong "Khóa học của tôi" mới có thể xem video bài giảng.',
    };
  }

  if (userEntitlement.Status === 'expired') {
    return {
      hasAccess: false,
      reason: 'EXPIRED',
      message: 'Thời hạn truy cập khóa học này của bạn đã kết thúc.',
      entitlement: userEntitlement,
    };
  }

  if (userEntitlement.Status === 'active' || userEntitlement.Status === 'completed') {
    return {
      hasAccess: true,
      reason: 'GRANTED',
      message: 'Đã cấp quyền truy cập hợp lệ.',
      entitlement: userEntitlement,
    };
  }

  return {
    hasAccess: false,
    reason: 'STATUS_INVALID',
    message: 'Trạng thái quyền truy cập chưa được kích hoạt.',
  };
}

/**
 * Lấy danh sách ID các khóa học mà người dùng đã được cấp quyền xem
 * @param {Object|null} user
 * @returns {string[]}
 */
export function getEntitledCourseIds(user) {
  if (!user) return [];
  if (user.role === 'Instructor' || user.role === 'Administrator') {
    return courses.map((c) => c.ID);
  }
  const effectiveUserId = getEffectiveUserId(user);
  return entitlements
    .filter(
      (e) =>
        e.UserID === effectiveUserId &&
        (e.Status === 'active' || e.Status === 'completed')
    )
    .map((e) => e.CoursesID);
}
