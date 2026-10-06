import React from 'react';
import PropTypes from 'prop-types';

/**
 * =============================================================================
 * COMPONENT: Logo (SecureLearn S + L Interlocking Monogram)
 * =============================================================================
 * Biểu tượng lồng ghép 2 chữ cái thương hiệu:
 * - Chữ "S" (Secure): Dải ruy băng bảo mật uốn lượn đa chiều màu Electric Blue.
 * - Chữ "L" (Learn): Bệ đỡ hình khối góc vuông kiến trúc màu Deep Navy Blue.
 * - Tâm điểm nút vi mạch quang học (Cryptographic Optical Node).
 */
export default function Logo({
  size = 'md',
  showBadge = true,
  badgeText = 'E-LEARNING',
  iconOnly = false,
  className = '',
}) {
  // Cấu hình kích cỡ biểu tượng
  const sizeMap = {
    sm: { icon: 36, fontSize: '1.25rem', badgeSize: '0.65rem' },
    md: { icon: 42, fontSize: '1.5rem', badgeSize: '0.70rem' },
    lg: { icon: 56, fontSize: '2rem', badgeSize: '0.80rem' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`sl-brand-wrapper d-inline-flex align-items-center text-decoration-none ${className}`}>
      {/* 1. BIỂU TƯỢNG MONOGRAM S + L */}
      <div
        className="sl-logo-icon-container position-relative d-flex align-items-center justify-content-center"
        style={{
          width: `${currentSize.icon}px`,
          height: `${currentSize.icon}px`,
          flexShrink: 0,
        }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="sl-logo-svg w-100 h-100"
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(37, 99, 235, 0.32))',
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <defs>
            {/* Gradient cho chữ S: Xanh ngọc nhạt -> Xanh dương Electric */}
            <linearGradient id="slGradientS" x1="12" y1="6" x2="38" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            {/* Gradient cho chữ L: Xanh Navy đậm vững chãi */}
            <linearGradient id="slGradientL" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="60%" stopColor="#172554" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Gradient cho viền khung phát sáng */}
            <linearGradient id="slBadgeBorder" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.2" />
            </linearGradient>

            {/* Khung nền tinh thể mờ (Frosted Squircle) */}
            <linearGradient id="slBadgeBg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#eff6ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Khung Squircle công nghệ bảo vệ bên ngoài */}
          <rect
            x="2"
            y="2"
            width="44"
            height="44"
            rx="12"
            fill="url(#slBadgeBg)"
            stroke="url(#slBadgeBorder)"
            strokeWidth="1.2"
          />

          {/* =============================================================
           * CHỮ "L" (LEARN) - Khối kiến trúc góc vuông vững chãi
           * Tạo thành cột dọc bên trái và thanh đỡ nằm ngang phía dưới
           * ============================================================= */}
          <path
            d="M 11 9 C 11 7.34 12.34 6 14 6 H 18 C 19.66 6 21 7.34 21 9 V 31 C 21 31.55 21.45 32 22 32 H 37 C 38.66 32 40 33.34 40 35 V 38 C 40 39.66 38.66 41 37 41 H 15 C 12.79 41 11 39.21 11 37 V 9 Z"
            fill="url(#slGradientL)"
          />

          {/* =============================================================
           * CHỮ "S" (SECURE) - Dải ruy băng an ninh số uốn lượn đa chiều
           * Uốn lượn từ trên phải, cắt xuyên tâm và khóa vào chân chữ L
           * ============================================================= */}
          {/* Nửa trên chữ S (Vòng uốn lượn đỉnh) */}
          <path
            d="M 37 13 C 37 9.13 33.87 6 30 6 H 22 C 20.34 6 19 7.34 19 9 C 19 10.66 20.34 12 22 12 H 30 C 30.55 12 31 12.45 31 13 C 31 13.55 30.55 14 30 14 H 24 C 18.48 14 14 18.48 14 24 C 14 25.66 15.34 27 17 27 C 18.66 27 20 25.66 20 24 C 20 21.79 21.79 20 24 20 H 30 C 33.87 20 37 16.87 37 13 Z"
            fill="url(#slGradientS)"
          />

          {/* Nửa dưới chữ S (Vòng uốn lượn đáy) */}
          <path
            d="M 28 20 C 26.34 20 25 21.34 25 23 C 25 24.66 26.34 26 28 26 H 31 C 32.66 26 34 27.34 34 29 C 34 30.66 32.66 32 31 32 H 24 C 22.34 32 21 33.34 21 35 C 21 36.66 22.34 38 24 38 H 31 C 35.97 38 40 33.97 40 29 C 40 24.03 35.97 20 31 20 H 28 Z"
            fill="url(#slGradientS)"
          />

          {/* Điểm nút quang học bảo mật kết nối S và L */}
          <circle cx="24" cy="24" r="2.2" fill="#38bdf8" />
          <circle cx="24" cy="24" r="1.1" fill="#ffffff" />
        </svg>
      </div>

      {/* 2. TYPOGRAPHY THƯƠNG HIỆU */}
      {!iconOnly && (
        <div className="d-flex align-items-center ms-2 ps-1">
          <span
            className="sl-brand-title fw-extrabold"
            style={{
              fontSize: currentSize.fontSize,
              letterSpacing: '-0.035em',
              lineHeight: 1,
            }}
          >
            <span className="text-dark">Secure</span>
            <span
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #0284c7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Learn
            </span>
          </span>

          {/* Micro Badge */}
          {showBadge && (
            <span
              className="sl-brand-badge ms-2 d-none d-sm-inline-flex align-items-center"
              style={{
                fontSize: currentSize.badgeSize,
                fontWeight: 700,
                letterSpacing: '0.04em',
                padding: '0.2rem 0.5rem',
                borderRadius: '9999px',
                background: 'rgba(37, 99, 235, 0.08)',
                color: '#2563eb',
                border: '1px solid rgba(37, 99, 235, 0.22)',
                lineHeight: 1.1,
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

Logo.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showBadge: PropTypes.bool,
  badgeText: PropTypes.string,
  iconOnly: PropTypes.bool,
  className: PropTypes.string,
};
