import { useEffect, useRef, useState } from 'react';

/**
 * Custom Hook: useDynamicWatermark
 * 
 * Tạo hiệu ứng Watermark động nhảy đập màn hình (DVD Screensaver bounce effect)
 * phục vụ chống quay lén màn hình (anti-camcorder/anti-screen-recording).
 * 
 * @param {React.RefObject} containerRef Ref của container bao bọc video
 * @param {string|number} studentId ID sinh viên hiển thị trên watermark
 */
export function useDynamicWatermark(containerRef, studentId) {
  const watermarkRef = useRef(null);
  const [timestamp, setTimestamp] = useState(() => new Date().toLocaleString());

  // Trạng thái tọa độ và vận tốc chuyển động
  const stateRef = useRef({
    x: 20,
    y: 20,
    vx: 1.5, // Vận tốc trục X (pixels/frame)
    vy: 1.2, // Vận tốc trục Y (pixels/frame)
    animFrameId: null,
  });

  // Cập nhật timestamp mỗi giây để tăng tính pháp lý khi truy vết rò rỉ video
  useEffect(() => {
    const timer = setInterval(() => {
      setTimestamp(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const watermark = watermarkRef.current;
    if (!container || !watermark) return;

    let isRunning = true;

    // Khởi tạo tọa độ ngẫu nhiên ban đầu để tránh vị trí cố định
    const initBounds = () => {
      const cRect = container.getBoundingClientRect();
      const wRect = watermark.getBoundingClientRect();

      const maxX = Math.max(10, cRect.width - wRect.width - 10);
      const maxY = Math.max(10, cRect.height - wRect.height - 10);

      stateRef.current.x = Math.random() * maxX;
      stateRef.current.y = Math.random() * maxY;

      // Góc bay ngẫu nhiên (+1 hoặc -1) với tốc độ vừa phải
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.6;
      stateRef.current.vx = Math.cos(angle) * speed;
      stateRef.current.vy = Math.sin(angle) * speed;
    };

    initBounds();

    // Vòng lặp vật lý sử dụng requestAnimationFrame (60 FPS mượt mà)
    const animate = () => {
      if (!isRunning) return;

      const cRect = container.getBoundingClientRect();
      const wRect = watermark.getBoundingClientRect();

      // Nếu container bị ẩn hoặc chưa có kích thước thực
      if (cRect.width > 0 && cRect.height > 0 && wRect.width > 0) {
        const maxX = cRect.width - wRect.width;
        const maxY = cRect.height - wRect.height;

        let { x, y, vx, vy } = stateRef.current;

        x += vx;
        y += vy;

        // Xử lý va chạm biên trục X (Bouncing)
        if (x <= 0) {
          x = 0;
          vx = Math.abs(vx) + (Math.random() * 0.2 - 0.1); // Thêm nhiễu ngẫu nhiên
        } else if (x >= maxX) {
          x = maxX;
          vx = -Math.abs(vx) + (Math.random() * 0.2 - 0.1);
        }

        // Xử lý va chạm biên trục Y (Bouncing)
        if (y <= 0) {
          y = 0;
          vy = Math.abs(vy) + (Math.random() * 0.2 - 0.1);
        } else if (y >= maxY) {
          y = maxY;
          vy = -Math.abs(vy) + (Math.random() * 0.2 - 0.1);
        }

        // Giới hạn vận tốc trong khoảng tối ưu
        vx = Math.max(-2.5, Math.min(2.5, vx));
        vy = Math.max(-2.5, Math.min(2.5, vy));

        stateRef.current.x = x;
        stateRef.current.y = y;
        stateRef.current.vx = vx;
        stateRef.current.vy = vy;

        // Tối ưu hiệu năng: Thao tác trực tiếp qua transform CSS3 (GPU Acceleration)
        // Không trigger React Re-render để tránh giật lag khi phát video
        watermark.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      stateRef.current.animFrameId = requestAnimationFrame(animate);
    };

    stateRef.current.animFrameId = requestAnimationFrame(animate);

    return () => {
      isRunning = false;
      if (stateRef.current.animFrameId) {
        cancelAnimationFrame(stateRef.current.animFrameId);
      }
    };
  }, [containerRef]);

  return {
    watermarkRef,
    timestamp,
    watermarkText: `Student ID: ${studentId} | ${timestamp}`,
  };
}
