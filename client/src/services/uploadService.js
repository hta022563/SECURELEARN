/**
 * SecureLearn - Video Upload & Cloudflare R2 Simulation Service
 * 
 * Xử lý mô phỏng quá trình tải video dung lượng bài học nhỏ lên Cloudflare R2
 * theo từng phân đoạn (Chunked Multipart Upload) và pipeline mã hóa HLS AES-128.
 */

/**
 * Mô phỏng upload file theo từng phân đoạn nhỏ (Chunked Upload) lên Cloudflare R2
 * 
 * @param {File} file File video cần tải lên
 * @param {Object} metadata Dữ liệu bài giảng { title, courseId, chapterId, chapterNumber }
 * @param {Function} onProgress Callback cập nhật (percent, loadedBytes, totalSize, currentChunk, totalChunks)
 * @returns {Promise<{ fileId: string, fileName: string, size: number, metadata: Object }>}
 */
export function simulateR2Upload(file, metadata, onProgress) {
  return new Promise((resolve) => {
    const totalSize = file ? file.size : 35 * 1024 * 1024; // Mặc định ~35MB cho 1 bài giảng nhỏ
    const CHUNK_SIZE = 5 * 1024 * 1024; // Mỗi chunk nhỏ ~5MB
    const totalChunks = Math.max(1, Math.ceil(totalSize / CHUNK_SIZE));
    let currentChunk = 1;
    let currentPercent = 0;

    const interval = setInterval(() => {
      // Tăng ngẫu nhiên theo tiến độ chunk
      const step = Math.floor(Math.random() * 8) + 5;
      currentPercent = Math.min(100, currentPercent + step);

      // Tính toán chunk hiện tại dựa trên %
      currentChunk = Math.min(totalChunks, Math.max(1, Math.ceil((currentPercent / 100) * totalChunks)));
      const loadedBytes = Math.floor((currentPercent / 100) * totalSize);

      if (typeof onProgress === 'function') {
        onProgress(currentPercent, loadedBytes, totalSize, currentChunk, totalChunks);
      }

      if (currentPercent >= 100) {
        clearInterval(interval);
        resolve({
          fileId: `v-${Date.now().toString().slice(-4)}`,
          fileName: file ? file.name : `${metadata.title || 'lesson'}.mp4`,
          size: totalSize,
          length: Math.floor(Math.random() * 600) + 600, // 10 - 20 phút (600 - 1200 giây)
          uploadedAt: new Date().toISOString(),
          metadata,
        });
      }
    }, 120);
  });
}

/**
 * Mô phỏng hàng đợi xử lý mã hóa HLS phân đoạn nhỏ (Cloudflare Stream / AES-128 HLS)
 * 
 * @param {string} fileId
 * @param {Function} onSegmentProgress Callback tiến độ mã hóa segment
 * @returns {Promise<{ fileId: string, streamUrl: string, status: string, drmType: string }>}
 */
export function simulateHlsProcessing(fileId, onSegmentProgress) {
  return new Promise((resolve) => {
    let seg = 1;
    const totalSegments = 8;
    const segInterval = setInterval(() => {
      if (typeof onSegmentProgress === 'function') {
        onSegmentProgress(seg, totalSegments);
      }
      seg++;
      if (seg > totalSegments) {
        clearInterval(segInterval);
        resolve({
          fileId,
          streamUrl: `https://drm.securelearn.edu/stream/${fileId}/master.m3u8`,
          status: 'ready',
          drmType: 'HLS-AES-128',
        });
      }
    }, 200);
  });
}
