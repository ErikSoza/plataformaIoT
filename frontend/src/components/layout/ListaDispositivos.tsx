import React from 'react';

export interface DeviceData {
  id: number;
  name: string;
  type: string;
  status: 'Activo' | 'Inactivo' | 'Mantenimiento' | 'Error';
  lastUpdate: string;
  location: string;
  coordinates: [number, number];
  temperature?: number;
  humidity?: number;
  battery?: number;
  pressure?: number;
  wind?: number;
  // gas = CO2 (alias para mapa de calor)
  gas?: number | null;
  // Gases individuales MQ135
  gas_co2?: number | null;
  gas_nh3?: number | null;
  gas_alcohol?: number | null;
  gas_humo?: number | null;
  gas_benceno?: number | null;
  gas_acetona?: number | null;
  radiation?: number | null;
}

interface DeviceListProps {
  devices: DeviceData[];
  selectedDeviceId?: number;
  onDeviceSelect: (device: DeviceData) => void;
  favoriteStationIds: number[];
  onToggleFavorite: (stationId: number) => void;
  favoritesLoading: boolean;
}

const DeviceList: React.FC<DeviceListProps> = ({ 
  devices, 
  selectedDeviceId, 
  onDeviceSelect,
  favoriteStationIds,
  onToggleFavorite,
  favoritesLoading,
}) => {
  const getStatusColor = (status: DeviceData['status']) => {
    switch (status) {
      case 'Activo': return '#28a745';
      case 'Inactivo': return '#6c757d';
      case 'Mantenimiento': return '#ffc107';
      case 'Error': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status: DeviceData['status']) => {
    switch (status) {
      case 'Activo': return '🟢';
      case 'Inactivo': return '⚫';
      case 'Mantenimiento': return '🟡';
      case 'Error': return '🔴';
      default: return '⚫';
    }
  };

  return (
    <div style={styles.deviceList}>
      {devices.map((device) => {
        const isFavorite = favoriteStationIds.includes(device.id);

        return (
        <div
          key={device.id}
          style={{
            ...styles.deviceCard,
            ...(selectedDeviceId === device.id ? styles.deviceCardSelected : {})
          }}
          onClick={() => onDeviceSelect(device)}
        >
          <div style={styles.deviceHeader}>
            <div style={styles.deviceName}>
              <span style={styles.deviceIcon}>📡</span>
              {device.name}
            </div>
            <div style={styles.deviceHeaderActions}>
              <button
                style={{
                  ...styles.favoriteButton,
                  ...(isFavorite ? styles.favoriteButtonActive : {})
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleFavorite(device.id);
                }}
                disabled={favoritesLoading}
                title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              >
                {isFavorite ? '★ Favorito' : '☆ Favorito'}
              </button>
              <div style={{
                ...styles.deviceStatus,
                color: getStatusColor(device.status)
              }}>
                {getStatusIcon(device.status)} {device.status}
              </div>
            </div>
          </div>
          
          <div style={styles.deviceInfo}>
            <div style={styles.deviceLocation}>
              <strong>📍 Ubicación:</strong> {device.location}
            </div>
            <div style={styles.deviceUpdate}>
              <strong>⏰ Última actualización:</strong> {device.lastUpdate}
            </div>
            <div style={styles.deviceId}>
              <strong>🆔 ID Sensor:</strong> #{device.id.toString().padStart(3, '0')}
            </div>
          </div>

          {/* Datos adicionales si están disponibles */}
          {(device.temperature || device.humidity || device.battery) && (
            <div style={styles.deviceMetrics}>
              {device.temperature && (
                <span style={styles.metric}>
                  🌡️ {device.temperature}°C
                </span>
              )}
              {device.humidity && (
                <span style={styles.metric}>
                  💧 {device.humidity}%
                </span>
              )}
              {device.battery && (
                <span style={styles.metric}>
                  🔋 {device.battery}%
                </span>
              )}
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
};

const styles = {
  deviceList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px',
    maxHeight: '600px',
    overflowY: 'auto' as const,
    padding: '10px',
  },

  deviceCard: {
    background: 'white',
    border: '2px solid #e9ecef',
    borderRadius: '12px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  },

  deviceCardSelected: {
    borderColor: '#00BCD4',
    boxShadow: '0 4px 15px rgba(0, 188, 212, 0.2)',
    transform: 'translateY(-2px)',
  },

  deviceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },

  deviceHeaderActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  deviceName: {
    fontSize: '1.1rem',
    fontWeight: '600' as const,
    color: '#2c3e50',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  deviceIcon: {
    fontSize: '1.2rem',
  },

  deviceStatus: {
    fontSize: '0.9rem',
    fontWeight: '600' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },

  favoriteButton: {
    border: '1px solid #ffc107',
    background: '#fff8e1',
    color: '#8a6d3b',
    borderRadius: '999px',
    padding: '4px 10px',
    fontSize: '0.75rem',
    fontWeight: '600' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  favoriteButtonActive: {
    background: '#ffc107',
    color: '#3d2f00',
    borderColor: '#e0a800',
  },

  deviceInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginBottom: '15px',
  },

  deviceType: {
    fontSize: '0.9rem',
    color: '#495057',
  },

  deviceLocation: {
    fontSize: '0.9rem',
    color: '#495057',
  },

  deviceUpdate: {
    fontSize: '0.85rem',
    color: '#6c757d',
  },

  deviceId: {
    fontSize: '0.85rem',
    color: '#6c757d',
  },

  deviceMetrics: {
    display: 'flex',
    gap: '15px',
    paddingTop: '10px',
    borderTop: '1px solid #e9ecef',
  },

  metric: {
    fontSize: '0.85rem',
    color: '#495057',
    background: '#f8f9fa',
    padding: '4px 8px',
    borderRadius: '6px',
    fontWeight: '500' as const,
  },
};

export default DeviceList;