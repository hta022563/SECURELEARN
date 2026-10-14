import React from 'react';
import PropTypes from 'prop-types';

/**
 * =============================================================================
 * COMPONENT: Logo (SecureLearn S + L Interlocking Monogram - Pure Tailwind CSS)
 * =============================================================================
 */
export default function Logo({
  size = 'md',
  showBadge = true,
  badgeText = 'E-LEARNING',
  iconOnly = false,
  className = '',
}) {
  const sizeMap = {
    sm: { icon: 36, fontSize: 'text-lg', badgeSize: 'text-[10px]' },
    md: { icon: 42, fontSize: 'text-xl', badgeSize: 'text-[11px]' },
    lg: { icon: 56, fontSize: 'text-2xl', badgeSize: 'text-xs' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`sl-brand-wrapper inline-flex items-center no-underline ${className}`}>
      {/* 1. BIỂU TƯỢNG MONOGRAM S + L */}
      <div
        className="sl-logo-icon-container relative flex items-center justify-center shrink-0"
        style={{
          width: `${currentSize.icon}px`,
          height: `${currentSize.icon}px`,
        }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="sl-logo-svg w-full h-full"
          style={{
            filter: 'drop-shadow(0 4px 12px rgba(37, 99, 235, 0.32))',
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <defs>
            <linearGradient id="slGradientS" x1="12" y1="6" x2="38" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>

            <linearGradient id="slGradientL" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="60%" stopColor="#172554" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <linearGradient id="slBadgeBorder" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.2" />
            </linearGradient>

            <linearGradient id="slBadgeBg" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#eff6ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.6" />
            </linearGradient>
          </defs>

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

          <path
            d="M 11 9 C 11 7.34 12.34 6 14 6 H 18 C 19.66 6 21 7.34 21 9 V 31 C 21 31.55 21.45 32 22 32 H 37 C 38.66 32 40 33.34 40 35 V 38 C 40 39.66 38.66 41 37 41 H 15 C 12.79 41 11 39.21 11 37 V 9 Z"
            fill="url(#slGradientL)"
          />

          <path
            d="M 37 13 C 37 9.13 33.87 6 30 6 H 22 C 20.34 6 19 7.34 19 9 C 19 10.66 20.34 12 22 12 H 30 C 30.55 12 31 12.45 31 13 C 31 13.55 30.55 14 30 14 H 24 C 18.48 14 14 18.48 14 24 C 14 25.66 15.34 27 17 27 C 18.66 27 20 25.66 20 24 C 20 21.79 21.79 20 24 20 H 30 C 33.87 20 37 16.87 37 13 Z"
            fill="url(#slGradientS)"
          />

          <path
            d="M 28 20 C 26.34 20 25 21.34 25 23 C 25 24.66 26.34 26 28 26 H 31 C 32.66 26 34 27.34 34 29 C 34 30.66 32.66 32 31 32 H 24 C 22.34 32 21 33.34 21 35 C 21 36.66 22.34 38 24 38 H 31 C 35.97 38 40 33.97 40 29 C 40 24.03 35.97 20 31 20 H 28 Z"
            fill="url(#slGradientS)"
          />

          <circle cx="24" cy="24" r="2.2" fill="#38bdf8" />
          <circle cx="24" cy="24" r="1.1" fill="#ffffff" />
        </svg>
      </div>

      {/* 2. TYPOGRAPHY THƯƠNG HIỆU */}
      {!iconOnly && (
        <div className="flex items-center ml-2.5">
          <span
            className={`font-extrabold tracking-tight leading-none ${currentSize.fontSize}`}
          >
            <span className="text-slate-900 dark:text-white">Secure</span>
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Learn
            </span>
          </span>

          {/* Micro Badge */}
          {showBadge && (
            <span
              className={`ml-2 hidden sm:inline-flex items-center font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 ${currentSize.badgeSize}`}
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
