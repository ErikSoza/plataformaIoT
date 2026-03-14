import React from 'react';
import { ContentSection, DeviceData } from '../components/layout';

interface FavoritesPageProps {
  devices: DeviceData[];
  favoriteStationIds: number[];
  onToggleFavorite: (stationId: number) => void;
  favoritesLoading: boolean;
}

const FavoritesPage: React.FC<FavoritesPageProps> = ({
  devices,
  favoriteStationIds,
  onToggleFavorite,
  favoritesLoading,
}) => {
  const favoriteDevices = devices.filter((device) => favoriteStationIds.includes(device.id));

  const getStatusColor = (status?: DeviceData['status']) => {
    switch (status) {
      case 'Activo': return '#2e7d32';
      case 'Inactivo': return '#616161';
      case 'Mantenimiento': return '#f57c00';
      case 'Error': return '#c62828';
      default: return '#616161';
    }
  };

  return (
    <ContentSection title="⭐ Sensores Favoritos">
      <div style={styles.container}>
        <div style={styles.summaryRow}>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>Total favoritos</span>
            <span style={styles.summaryValue}>{favoriteDevices.length}</span>
          </div>
        </div>

        {favoritesLoading && (
          <div style={styles.loadingBox}>Cargando favoritos...</div>
        )}

        {!favoritesLoading && favoriteDevices.length === 0 && (
          <div style={styles.emptyState}>
            <h3 style={styles.emptyTitle}>No tienes sensores favoritos todavía</h3>
            <p style={styles.emptyText}>
              Ve a la pestaña Dispositivos y marca con estrella los sensores que quieras seguir de cerca.
            </p>
          </div>
        )}

        {!favoritesLoading && favoriteDevices.length > 0 && (
          <div style={styles.grid}>
            {favoriteDevices.map((device) => (
              <article key={device.id} style={styles.card}>
                <header style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.cardTitle}>{device.name || `Sensor #${device.id}`}</h3>
                    <p style={styles.cardSubtitle}>{device.type || 'Sensor Ambiental IoT'}</p>
                  </div>
                  <div style={styles.headerActions}>
                    <span style={{ ...styles.statusBadge, color: getStatusColor(device.status) }}>
                      {device.status || 'Sin estado'}
                    </span>
                    <button
                      style={styles.removeFavoriteBtn}
                      onClick={() => onToggleFavorite(device.id)}
                      title="Quitar de favoritos"
                    >
                      ★
                    </button>
                  </div>
                </header>

                <div style={styles.cardBody}>
                  <div style={styles.infoRow}><strong>ID:</strong> #{String(device.id).padStart(3, '0')}</div>
                  <div style={styles.infoRow}><strong>Ubicación:</strong> {device.location || 'Sin ubicación'}</div>
                  <div style={styles.infoRow}><strong>Última actualización:</strong> {device.lastUpdate || 'Sin datos'}</div>
                </div>

                <div style={styles.metricsGrid}>
                  <Metric label="Temperatura" value={device.temperature} unit="°C" />
                  <Metric label="Humedad" value={device.humidity} unit="%" />
                  <Metric label="Presión" value={device.pressure} unit="hPa" />
                  <Metric label="Viento" value={device.wind} unit="m/s" />
                  <Metric label="Batería" value={device.battery} unit="%" />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </ContentSection>
  );
};

interface MetricProps {
  label: string;
  value?: number;
  unit: string;
}

const Metric: React.FC<MetricProps> = ({ label, value, unit }) => {
  const hasValue = value !== undefined && value !== null && !Number.isNaN(value);

  return (
    <div style={styles.metricBox}>
      <span style={styles.metricLabel}>{label}</span>
      <span style={styles.metricValue}>{hasValue ? `${Number(value).toFixed(1)} ${unit}` : 'N/A'}</span>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  summaryRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '14px',
    alignItems: 'stretch',
  },
  summaryCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    minWidth: '190px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #fff7d6 0%, #ffe99f 100%)',
    border: '1px solid #f4d03f',
    padding: '14px 16px',
  },
  summaryLabel: {
    color: '#6b5c00',
    fontSize: '0.85rem',
    fontWeight: '600' as const,
  },
  summaryValue: {
    color: '#3d2f00',
    fontSize: '1.8rem',
    fontWeight: '700' as const,
    lineHeight: 1.1,
    marginTop: '4px',
  },
  summaryHint: {
    flex: 1,
    minWidth: '260px',
    borderRadius: '12px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    color: '#495057',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
  },
  loadingBox: {
    border: '1px dashed #cfd4da',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center' as const,
    color: '#6c757d',
    backgroundColor: '#f8f9fa',
  },
  emptyState: {
    border: '1px dashed #d6d9df',
    borderRadius: '16px',
    padding: '28px',
    textAlign: 'center' as const,
    backgroundColor: '#fcfcfd',
  },
  emptyTitle: {
    margin: '0 0 10px 0',
    color: '#343a40',
    fontSize: '1.2rem',
  },
  emptyText: {
    margin: 0,
    color: '#6c757d',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e9ecef',
    borderRadius: '14px',
    padding: '16px',
    boxShadow: '0 3px 12px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
  },
  cardTitle: {
    margin: 0,
    color: '#1f2937',
    fontSize: '1.08rem',
    fontWeight: '700' as const,
  },
  cardSubtitle: {
    margin: '3px 0 0 0',
    color: '#6c757d',
    fontSize: '0.85rem',
  },
  headerActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '8px',
  },
  statusBadge: {
    backgroundColor: '#f5f6f7',
    border: '1px solid #dfe3e8',
    borderRadius: '20px',
    padding: '5px 10px',
    fontSize: '0.75rem',
    fontWeight: '700' as const,
  },
  removeFavoriteBtn: {
    border: '1px solid #f4c430',
    backgroundColor: '#ffe082',
    color: '#5d4300',
    fontSize: '1rem',
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontWeight: '700' as const,
    lineHeight: 1,
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  infoRow: {
    fontSize: '0.9rem',
    color: '#495057',
  },
  metricsGrid: {
    borderTop: '1px solid #edf1f5',
    paddingTop: '10px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '8px',
  },
  metricBox: {
    border: '1px solid #edf1f5',
    borderRadius: '10px',
    padding: '8px 10px',
    backgroundColor: '#fafbfc',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  metricLabel: {
    color: '#6c757d',
    fontSize: '0.75rem',
    fontWeight: '600' as const,
  },
  metricValue: {
    color: '#1f2937',
    fontSize: '0.95rem',
    fontWeight: '700' as const,
    marginTop: '2px',
  },
};

export default FavoritesPage;
