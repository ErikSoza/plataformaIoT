import React, { ReactNode } from 'react';

interface MapContainerProps {
  children: ReactNode;
  height?: string;
  borderRadius?: string;
}

const MapContainer: React.FC<MapContainerProps> = ({ 
  children, 
  height = '500px',
  borderRadius = '10px'
}) => {
  return (
    <div style={{
      ...styles.mapContainer,
      borderRadius
    }}>
      <div style={{ height, width: '100%' }}>
        {children}
      </div>
    </div>
  );
};

const styles = {
  mapContainer: {
    overflow: 'hidden' as const,
    boxShadow: '0 6px 25px rgba(0, 0, 0, 0.15)',
    border: '1px solid #dee2e6',
  },
};

export default MapContainer;