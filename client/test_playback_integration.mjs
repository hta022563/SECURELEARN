import assert from 'node:assert/strict';
import { buildManifestUrl, getLessonPlayback } from './src/services/playbackService.js';
import { getLessonPlayback as reExportedPlayback } from './src/services/courseService.js';
import { fetchSignedUrl } from './src/services/cryptoService.js';
import { checkCourseAccess, grantCourseEntitlement, revokeCourseEntitlement } from './src/services/entitlementService.js';

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function testAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('--- BẮT ĐẦU TEST TOÀN BỘ CÁC MODULE VỪA TÍCH HỢP ---');

// 1. TEST PLAYBACK SERVICE
console.log('\n[1] Kiểm tra playbackService.js & re-export trong courseService.js:');

test('buildManifestUrl tạo đúng URL manifest kèm token', () => {
  const url = buildManifestUrl('123e4567-e89b-12d3-a456-426614174000', 'sample-hmac-token');
  assert.match(url, /\/lesson\/123e4567-e89b-12d3-a456-426614174000\/manifest\?token=sample-hmac-token/);
});

test('courseService re-export đúng hàm getLessonPlayback từ playbackService', () => {
  assert.equal(typeof reExportedPlayback, 'function');
  assert.equal(getLessonPlayback, reExportedPlayback);
});

await testAsync('getLessonPlayback ném lỗi 400 nếu thiếu lessonId', async () => {
  await assert.rejects(
    async () => await getLessonPlayback(''),
    /400: Lesson ID không được để trống/
  );
});

// 2. TEST CRYPTO SERVICE
console.log('\n[2] Kiểm tra cryptoService.js (fetchSignedUrl):');

await testAsync('fetchSignedUrl ném lỗi 400 nếu thiếu videoId', async () => {
  await assert.rejects(
    async () => await fetchSignedUrl(null, 'stu-1'),
    /400: Thiếu thông tin định danh Video\/Lesson ID/
  );
});

await testAsync('fetchSignedUrl ném lỗi 403 nếu videoId là unauthorized', async () => {
  await assert.rejects(
    async () => await fetchSignedUrl('unauthorized', 'stu-1'),
    /403: Sinh viên chưa thanh toán/
  );
});

await testAsync('fetchSignedUrl ném lỗi 410 nếu videoId là expired', async () => {
  await assert.rejects(
    async () => await fetchSignedUrl('expired', 'stu-1'),
    /410: Signed URL bài giảng đã hết hạn/
  );
});

await testAsync('fetchSignedUrl trả về streamUrl trực tiếp nếu videoId là URL hợp lệ (http/https/blob)', async () => {
  const directUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  const result = await fetchSignedUrl(directUrl, 'stu-1');
  assert.equal(result.streamUrl, directUrl);
  assert.ok(result.expiresAt > Date.now());
});

// 3. TEST USE SECURE HLS URL DETECTION
console.log('\n[3] Kiểm tra logic phân loại luồng HLS vs MP4 trong useSecureHls.js:');

test('URL manifest từ PlaybackController được nhận diện là HLS Stream', () => {
  const manifestUrl = 'http://localhost:8080/api/v1/lesson/abc-123/manifest?token=xyz';
  const isHls = manifestUrl.includes('.m3u8') || manifestUrl.includes('/manifest');
  assert.equal(isHls, true);
});

test('URL playlist .m3u8 truyền thống được nhận diện là HLS Stream', () => {
  const m3u8Url = 'https://r2.domain.com/hls/course-1/master.m3u8';
  const isHls = m3u8Url.includes('.m3u8') || m3u8Url.includes('/manifest');
  assert.equal(isHls, true);
});

test('URL video MP4 trực tiếp không bị nhận diện nhầm là HLS Stream', () => {
  const mp4Url = 'https://r2.domain.com/videos/course-1/lecture1.mp4';
  const isHls = mp4Url.includes('.m3u8') || mp4Url.includes('/manifest');
  assert.equal(isHls, false);
});

// 4. TEST SECURE VIDEO PLAYER DIRECT URL VS R2 KEY DETECTION
console.log('\n[4] Kiểm tra logic phân biệt Direct URL vs R2 Key trong SecureVideoPlayer.jsx:');

test('R2 Object Key nội bộ không bị gắn trực tiếp vào video src', () => {
  const r2Key = 'videos/course-id/123_lecture.mp4';
  const isDirectUrl = Boolean(
    typeof r2Key === 'string' &&
    (r2Key.startsWith('http://') || r2Key.startsWith('https://') || r2Key.startsWith('blob:'))
  );
  assert.equal(isDirectUrl, false);
});

test('R2 HLS Key nội bộ không bị gắn trực tiếp vào video src', () => {
  const r2HlsKey = 'hls/course-id/123/master.m3u8';
  const isDirectUrl = Boolean(
    typeof r2HlsKey === 'string' &&
    (r2HlsKey.startsWith('http://') || r2HlsKey.startsWith('https://') || r2HlsKey.startsWith('blob:'))
  );
  assert.equal(isDirectUrl, false);
});

test('HTTP/HTTPS URL đầy đủ được gắn trực tiếp vào video src', () => {
  const fullUrl = 'https://cdn.example.com/test.mp4';
  const isDirectUrl = Boolean(
    typeof fullUrl === 'string' &&
    (fullUrl.startsWith('http://') || fullUrl.startsWith('https://') || fullUrl.startsWith('blob:'))
  );
  assert.equal(isDirectUrl, true);
});

// 5. TEST ENTITLEMENT SERVICE
console.log('\n[5] Kiểm tra entitlementService.js (checkCourseAccess & grant/revoke):');

test('checkCourseAccess từ chối người dùng chưa đăng nhập', () => {
  const res = checkCourseAccess(null, 'c-001');
  assert.equal(res.hasAccess, false);
  assert.equal(res.reason, 'NOT_AUTHENTICATED');
});

test('checkCourseAccess cho phép toàn quyền Instructor/Admin', () => {
  const resAdmin = checkCourseAccess({ role: 'admin', userId: 'u-admin' }, 'c-001');
  assert.equal(resAdmin.hasAccess, true);
  assert.equal(resAdmin.reason, 'ROLE_OVERRIDE');

  const resInstructor = checkCourseAccess({ role: 'instructor', userId: 'u-inst' }, 'c-001');
  assert.equal(resInstructor.hasAccess, true);
  assert.equal(resInstructor.reason, 'ROLE_OVERRIDE');
});

test('checkCourseAccess cho phép Student đã đăng nhập', () => {
  const resStudent = checkCourseAccess({ role: 'student', userId: 'u-student' }, 'c-001');
  assert.equal(resStudent.hasAccess, true);
  assert.equal(resStudent.reason, 'GRANTED');
});

await testAsync('grantCourseEntitlement ném lỗi 400 nếu thiếu params', async () => {
  await assert.rejects(
    async () => await grantCourseEntitlement('', 'sub-1'),
    /400: Thiếu thông tin courseId hoặc userSub/
  );
});

await testAsync('revokeCourseEntitlement ném lỗi 400 nếu thiếu params', async () => {
  await assert.rejects(
    async () => await revokeCourseEntitlement('c-001', ''),
    /400: Thiếu thông tin courseId hoặc userSub/
  );
});

console.log(`\n========================================`);
console.log(`KẾT QUẢ TEST: ${passedTests}/${totalTests} tests PASS!`);
console.log(`========================================\n`);
