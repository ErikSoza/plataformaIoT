import React from 'react';
import { HEATMAP_CONFIG } from '../config/heatmapConfig';

interface MapLegendProps {
  variableActiva: string;
}

const MapLegend: React.FC<MapLegendProps> = ({ variableActiva }) => {
  const config = HEATMAP_CONFIG[variableActiva];

  if (!config) return null;

  const gradientColors = Object.values(config.gradient).join(', ');

  return (
    <div style={{
      position: 'absolute',
      bottom: '30px',
      right: '10px',
      zIndex: 1000,
      background: 'rgba(255, 255, 255, 0.9)',
      borderRadius: '8px',
      padding: '10px 14px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
    }}>
      <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px', fontWeight: 'bold' }}>
        {config.legendLabel}
      </div>
      <div style={{
        width: '180px',
        height: '10px',
        borderRadius: '4px',
        background: `linear-gradient(to right, ${gradientColors})`
      }} />
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '10px',
        color: '#666',
        marginTop: '6px'
      }}>
        <span>{config.min} {config.unit}</span>
        <span>{config.max} {config.unit}</span>
      </div>
    </div>
  );
};

export default MapLegend;
