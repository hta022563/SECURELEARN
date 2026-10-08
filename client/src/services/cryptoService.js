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
    true, // extractable (cần extract Public Key gửi lên Server)
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
 *
 * Server-side logic (mô phỏng):
 * - Tạo cặp khóa ECDH của Server
 * - Dùng Public Key Client + Private Key Server để sinh Shared Secret
 * - Dùng Shared Secret dẫn xuất khóa AES-GCM (256-bit)
 * - Mã hóa khóa nội dung AES-128 (16 bytes thật của video) bằng khóa AES-GCM
 * - Trả về: Server Public Key, Ciphertext của AES-128 Key, và IV (Initialization Vector)
 */
export async function mockExchangeKeysApi(payload) {
  const { videoId, studentId, clientPublicKeyB64, keyUri } = payload;

  // Giả lập độ trễ mạng khi handshake
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (!clientPublicKeyB64) {
    throw new Error('400: Không nhận được Public Key từ Client.');
  }

  // 1. Server sinh cặp khóa ECDH tạm thời (Ephemeral ECDH Key Pair)
  const serverKeyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveKey', 'deriveBits']
  );

  // 2. Server import Client Public Key
  const clientPublicKeyBuffer = base64ToArrayBuffer(clientPublicKeyB64);
  const clientPubKey = await window.crypto.subtle.importKey(
    'raw',
    clientPublicKeyBuffer,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    []
  );

  // 3. Server tính Shared Secret và dẫn xuất khóa AES-GCM để wrap key
  const serverSharedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: clientPubKey,
    },
    serverKeyPair.privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt']
  );

  // 4. Khóa AES-128 gốc của video (16 bytes = 128 bit)
  // Trong thực tế, Server truy xuất khóa này từ Key Management Service (KMS) ứng với videoId
  const rawAes128Key = new Uint8Array([
    0x2b, 0x7e, 0x15, 0x16, 0x28, 0xae, 0xd2, 0xa6,
    0xab, 0xf7, 0x15, 0x88, 0x09, 0xcf, 0x4f, 0x3c,
  ]);

  // 5. Server mã hóa khóa AES-128 bằng Shared Key (AES-GCM)
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV tiêu chuẩn cho AES-GCM
  const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    serverSharedKey,
    rawAes128Key
  );

  // 6. Server export Public Key của chính mình
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
 * 
 * @param {CryptoKeyPair} clientKeyPair Cặp khóa của Client
 * @param {string} serverPublicKeyB64 Public Key từ Server
 * @param {string} encryptedKeyB64 Khóa AES-128 đã mã hóa
 * @param {string} ivB64 Vector khởi tạo IV
 * @returns {Promise<ArrayBuffer>} Khóa AES-128 16 bytes thô
 */
export async function deriveAndDecryptContentKey(
  clientKeyPair,
  serverPublicKeyB64,
  encryptedKeyB64,
  ivB64
) {
  // 1. Import Server Public Key vào Web Crypto
  const serverPubKeyBuffer = base64ToArrayBuffer(serverPublicKeyB64);
  const serverPublicKey = await window.crypto.subtle.importKey(
    'raw',
    serverPubKeyBuffer,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    []
  );

  // 2. Client tính Shared Secret giống hệt Server (Tính chất đối xứng của ECDH)
  const clientSharedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: serverPublicKey,
    },
    clientKeyPair.privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['decrypt']
  );

  // 3. Dùng Shared Key để giải mã lấy ra khóa AES-128 gốc
  const encryptedBuffer = base64ToArrayBuffer(encryptedKeyB64);
  const ivBuffer = base64ToArrayBuffer(ivB64);

  const decryptedAesKeyBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer),
    },
    clientSharedKey,
    encryptedBuffer
  );

  // Trả về ArrayBuffer 16 bytes sẵn sàng cho HLS.js
  return decryptedAesKeyBuffer;
}
