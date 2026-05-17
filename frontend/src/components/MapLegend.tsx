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
      bottom: '28px',
      left: '10px',
      zIndex: 1000,
      background: 'rgba(255,255,255,0.88)',
      borderRadius: '8px',
      padding: '6px 10px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px', fontWeight: 600, letterSpacing: '0.2px' }}>
        {config.legendLabel}
      </div>
      <div style={{
        width: '180px',
        height: '7px',
        borderRadius: '4px',
        background: `linear-gradient(to right, ${gradientColors})`,
      }} />
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '9px',
        color: '#888',
        marginTop: '3px',
      }}>
        <span>{config.min} {config.unit}</span>
        <span>{config.max} {config.unit}</span>
      </div>
    </div>
  );
};

export default MapLegend;
