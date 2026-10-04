import React, { useCallback } from 'react';
import Particles from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';

/**
 * =============================================================================
 * COMPONENT: ParticleBackground (Option 1: Mạng Lưới Bảo Mật - Cyber Network)
 * =============================================================================
 * Thư viện: @tsparticles/react & @tsparticles/slim
 * Đặc điểm:
 * - Các nút hạt (particles) màu Cyan (#06b6d4) và Xanh Dương (#3b82f6)
 * - Tự động kết nối mạng lưới bằng đường line phát quang khi các hạt đến gần nhau
 * - Hiệu ứng tương tác: Đẩy hạt nhẹ khi di chuột qua (hover repulse)
 * - Tối ưu hiệu năng: Giới hạn số lượng hạt (density), FPS 60, tiêu thụ ít CPU
 * - position: fixed; inset: 0; z-index: 0; pointer-events: none;
 */
export default function ParticleBackground({ isDarkMode = true }) {
  // Khởi tạo engine slim của tsParticles (kích thước nhỏ nhẹ nhất)
  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  // Cấu hình mạng lưới Cyber Network Node & Links
  const options = {
    background: {
      color: {
        value: isDarkMode ? '#0a0f1d' : '#f0f7ff', // Nền tối sâu hoặc Trắng xanh
      },
    },
    fpsLimit: 60,
    interactivity: {
      events: {
        onHover: {
          enable: true,
          mode: 'grab', // Tự bắt dính các đường liên kết khi rê chuột
        },
        onClick: {
          enable: true,
          mode: 'push', // Thêm hạt khi click
        },
        resize: true,
      },
      modes: {
        grab: {
          distance: 140,
          links: {
            opacity: 0.8,
            color: '#06b6d4',
          },
        },
        push: {
          quantity: 2,
        },
      },
    },
    particles: {
      color: {
        value: ['#2563eb', '#06b6d4', '#60a5fa', '#ffffff'],
      },
      links: {
        color: isDarkMode ? '#38bdf8' : '#60a5fa',
        distance: 140,
        enable: true,
        opacity: isDarkMode ? 0.25 : 0.4,
        width: 1.2,
      },
      collisions: {
        enable: false,
      },
      move: {
        direction: 'none',
        enable: true,
        outModes: {
          default: 'bounce',
        },
        random: false,
        speed: 0.8, // Trôi nổi nhẹ nhàng, êm dịu không gây rối mắt
        straight: false,
      },
      number: {
        density: {
          enable: true,
          area: 900,
        },
        value: 50, // Giữ số lượng hạt vừa phải để không giật lag
      },
      opacity: {
        value: { min: 0.3, max: 0.7 },
      },
      shape: {
        type: 'circle',
      },
      size: {
        value: { min: 1.5, max: 3.5 },
      },
    },
    detectRetina: true,
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none', // Cực kỳ quan trọng: Cho phép click xuyên thấu qua các nút và card bên trên
      }}
    >
      <Particles
        id="securelearn-tsparticles"
        init={particlesInit}
        options={options}
        className="w-100 h-100"
      />
    </div>
  );
}
