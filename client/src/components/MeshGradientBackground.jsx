import React from 'react';
import PropTypes from 'prop-types';

/**
 * =============================================================================
 * COMPONENT: MeshGradientBackground
 * =============================================================================
 * Hiệu ứng nền Ambient Mesh Gradient chuyển động mượt mà, siêu nhẹ, không gây phân tâm.
 * - Sử dụng CSS hardware acceleration (GPU)
 * - pointer-events: none bảo đảm không che khuất hay cản trở tương tác chuột
 * - Phù hợp tinh tế với các thẻ Card, Table và Video Player của SecureLearn
 */
export default function MeshGradientBackground({ className = '' }) {
  return (
    <div className={`sl-mesh-canvas ${className}`} aria-hidden="true">
      {/* Vầng hào quang trung tâm Hero */}
      <div className="sl-hero-spotlight" />

      {/* Lưới điểm tọa độ ma trận công nghệ Cyber Matrix */}
      <div className="sl-mesh-grid-overlay" />

      {/* 4 khối cầu quang phổ chuyển động đa chiều */}
      <div className="sl-mesh-blur-layer">
        <div className="sl-orb sl-orb-1" />
        <div className="sl-orb sl-orb-2" />
        <div className="sl-orb sl-orb-3" />
        <div className="sl-orb sl-orb-4" />
      </div>
    </div>
  );
}

MeshGradientBackground.propTypes = {
  className: PropTypes.string,
};
