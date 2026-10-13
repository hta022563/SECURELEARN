/**
 * SecureLearn DRM - Web Crypto API & Mock API Services
 * 
 * Mô phỏng luồng trao đổi khóa ECDH (Elliptic Curve Diffie-Hellman)
 * và các API ký Signed URL phục vụ giải mã video HLS AES-128.
 */

// Helper: Chuyển đổi ArrayBuffer sang Base64
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Chuyển đổi Base64 sang ArrayBuffer
export function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

import apiClient from '../api/axiosClient';

/**
 * Lấy URL luồng video từ Backend API (Spring Boot / DynamoDB / S3)
 * Endpoint Backend:
 * - GET /api/v1/lesson (với partitionKey và sortKey)
 * - hoặc GET /api/v1/course (với partitionKey)
 */
export async function fetchSignedUrl(videoId, studentId, courseId = null) {
  if (!studentId || !videoId) {
    throw new Error('400: Thiếu thông tin xác thực Video ID hoặc Student ID.');
  }

  if (videoId === 'unauthorized') {
    throw new Error('403: Sinh viên chưa thanh toán hoặc không có quyền truy cập bài giảng này.');
  }

  if (videoId === 'expired') {
    throw new Error('410: Signed URL bài giảng đã hết hạn truy cập.');
  }

  // 1. Thử gọi API Backend lấy Lesson theo ID: GET /api/v1/lesson/{id}
  try {
    const res = await apiClient.get(`/lesson/${videoId}`);
    const stream = res?.url || res?.videoURL || res?.videoUrl;
    if (stream) {
      return {
        streamUrl: stream,
        expiresAt: Date.now() + 3600000,
      };
    }
  } catch (e) {
    console.warn(`[cryptoService] Không tìm thấy bài học qua GET /lesson/${videoId}:`, e.message);
  }

  // 3. Nếu videoId tự thân là một URL trực tiếp (http://, https://, blob:)
  if (typeof videoId === 'string' && (videoId.startsWith('http://') || videoId.startsWith('https://') || videoId.startsWith('blob:'))) {
    return {
      streamUrl: videoId,
      expiresAt: Date.now() + 3600000,
    };
  }

  // 4. Nếu không tìm thấy video trên Backend
  throw new Error(`404: Không tìm thấy đường dẫn video (videoURL) cho bài giảng "${videoId}" trên hệ thống Backend.`);
}

/**
 * 2. Web Crypto API: Khởi tạo cặp khóa ECDH tại Client
 * Curve: P-256 (Chuẩn Web Crypto được hỗ trợ rộng rãi và bảo mật cao)
 */
export async function generateClientECDHKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * 3. Xuất Public Key của Client sang định dạng Raw (Base64)
 */
export async function exportPublicKeyRaw(publicKey) {
  const exported = await window.crypto.subtle.exportKey('raw', publicKey);
  return arrayBufferToBase64(exported);
}

/**
 * 4. Mock Backend Server: Xử lý trao đổi khóa ECDH
 * POST /api/v1/keys/exchange
 */
export async function mockExchangeKeysApi(payload) {
  const { videoId, studentId, clientPublicKeyB64, keyUri } = payload;
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (!clientPublicKeyB64) {
    throw new Error('400: Không nhận được Public Key từ Client.');
  }

  const serverKeyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
  const clientPublicKeyBuffer = base64ToArrayBuffer(clientPublicKeyB64);
  const clientPubKey = await window.crypto.subtle.importKey(
    'raw',
    clientPublicKeyBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const serverSharedKey = await window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: clientPubKey },
    serverKeyPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const rawAes128Key = new Uint8Array([
    0x2b, 0x7e, 0x15, 0x16, 0x28, 0xae, 0xd2, 0xa6,
    0xab, 0xf7, 0x15, 0x88, 0x09, 0xcf, 0x4f, 0x3c,
  ]);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    serverSharedKey,
    rawAes128Key
  );
  const serverPublicKeyRaw = await window.crypto.subtle.exportKey('raw', serverKeyPair.publicKey);

  return {
    serverPublicKey: arrayBufferToBase64(serverPublicKeyRaw),
    encryptedKey: arrayBufferToBase64(encryptedKeyBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    keyUri,
  };
}

/**
 * 5. Client giải mã ECDH để lấy lại Key AES-128 gốc
 */
export async function deriveAndDecryptContentKey(
  clientKeyPair,
  serverPublicKeyB64,
  encryptedKeyB64,
  ivB64
) {
  const serverPubKeyBuffer = base64ToArrayBuffer(serverPublicKeyB64);
  const serverPublicKey = await window.crypto.subtle.importKey(
    'raw',
    serverPubKeyBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const clientSharedKey = await window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: serverPublicKey },
    clientKeyPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  const encryptedBuffer = base64ToArrayBuffer(encryptedKeyB64);
  const ivBuffer = base64ToArrayBuffer(ivB64);
  return await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
    clientSharedKey,
    encryptedBuffer
  );
}