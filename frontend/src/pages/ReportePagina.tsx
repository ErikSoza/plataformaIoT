import React, { useState, useEffect, useCallback } from 'react';
import { ContentSection } from '../components/layout';
import { readingService } from '../services/api';
import { Lectura } from '../types';

const ReportsPage: React.FC = () => {
  const [readings, setReadings] = useState<Lectura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredReadings, setFilteredReadings] = useState<Lectura[]>([]);
  const [filters, setFilters] = useState({
    estacion: '',
  });

  // Cargar datos de lecturas al montar el componente
  useEffect(() => {
    loadReadings();
  }, []);

  // Filtrar lecturas cuando cambian los filtros
  useEffect(() => {
    applyFilters();
  }, [readings, filters]);

  const loadReadings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await readingService.getAll();
      setReadings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar lecturas');
      console.error('Error cargando lecturas:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = readings;

    // Filtrar por estación
    if (filters.estacion) {
      filtered = filtered.filter(reading => 
        reading.estacion_nombre?.toLowerCase().includes(filters.estacion.toLowerCase())
      );
    }

    setFilteredReadings(filtered);
  }, [readings, filters.estacion]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getUniqueStations = () => {
    const stations = readings
      .map(r => r.estacion_nombre)
      .filter(Boolean)
      .filter((station, index, arr) => arr.indexOf(station) === index)
      .sort();
    return stations;
  };

  return (
    <ContentSection title="📊 Reportes y Análisis de Datos">
      <div style={styles.container}>
        {/* Estado de carga y errores */}
        {loading && (
          <div style={styles.loadingMessage}>
            🔄 Cargando datos de lecturas...
          </div>
        )}

        {error && (
          <div style={styles.errorMessage}>
            ❌ Error: {error}
            <button onClick={loadReadings} style={styles.retryButton}>
              Reintentar
            </button>
          </div>
        )}

        {/* Estadísticas rápidas */}
        {!loading && !error && (
          <div style={styles.statsSection}>
            <div style={styles.statCard}>
              <h4>📊 Total de Lecturas</h4>
              <p style={styles.statValue}>{filteredReadings.length}</p>
            </div>
            <div style={styles.statCard}>
              <h4>⏱️ Última Lectura</h4>
              <p style={styles.statValue}>
                {filteredReadings.length > 0
                  ? formatTimestamp(filteredReadings[filteredReadings.length - 1].timestamp)
                  : 'N/A'
                }
              </p>
            </div>
            <div style={styles.statCard}>
              <h4>🏢 Estaciones Activas</h4>
              <p style={styles.statValue}>{getUniqueStations().length}</p>
            </div>
            <div style={styles.statCard}>
              <h4>🌡️ Temp. Promedio</h4>
              <p style={styles.statValue}>
                {filteredReadings.length > 0
                  ? (filteredReadings.reduce((sum, r) => sum + (r.json.temperatura || 0), 0) / filteredReadings.length).toFixed(1)
                  : '0'
                }°C
              </p>
            </div>
            <div style={styles.statCard}>
              <h4>💧 Humedad Promedio</h4>
              <p style={styles.statValue}>
                {filteredReadings.length > 0
                  ? (filteredReadings.reduce((sum, r) => sum + (r.json.humedad || 0), 0) / filteredReadings.length).toFixed(1)
                  : '0'
                }%
              </p>
            </div>
              <div style={styles.statCard}>
                <h4>📈 Presión Promedio</h4>
                <p style={styles.statValue}>
                  {filteredReadings.length > 0
                    ? (filteredReadings.reduce((sum, r) => sum + (r.json.presion || 0), 0) / filteredReadings.length).toFixed(1)
                    : '0'
                  } hPa
                </p>
              </div>
              <div style={styles.statCard}>
                <h4>💨 Gas Promedio</h4>
                <p style={styles.statValue}>
                  {filteredReadings.length > 0
                    ? (filteredReadings.reduce((sum, r) => sum + (r.json.gas || 0), 0) / filteredReadings.length).toFixed(3)
                    : '0'
                  }
                </p>
              </div>
              <div style={styles.statCard}>
                <h4>☀️ Radiación Promedio</h4>
                <p style={styles.statValue}>
                  {filteredReadings.length > 0
                    ? (filteredReadings.reduce((sum, r) => sum + (r.json.radiacion || 0), 0) / filteredReadings.length).toFixed(1)
                    : '0'
                  }
                </p>
              </div>
              <div style={styles.statCard}>
                <h4>🌪️ Viento Promedio</h4>
                <p style={styles.statValue}>
                  {filteredReadings.length > 0
                    ? (filteredReadings.reduce((sum, r) => sum + (r.json.viento || 0), 0) / filteredReadings.length).toFixed(1)
                    : '0'
                  } m/s
                </p>
              </div>
          </div>
        )}
        {/* Tabla de datos */}
        {!loading && !error && (
          <div style={styles.tableSection}>
            <h4>🔍 Filtros de Búsqueda detallada: ({filteredReadings.length} registros)</h4>
          <div style={styles.filtersGrid}>
            <div style={styles.filterGroup}>
              <label>Estación:</label>
              <select
                value={filters.estacion}
                onChange={(e) => handleFilterChange('estacion', e.target.value)}
                style={styles.filterInput}
              >
                <option value="">Todas las estaciones</option>
                {getUniqueStations().map(station => (
                  <option key={station} value={station}>{station}</option>
                ))}
              </select>
            </div>
          </div>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th>ID</th>
                    <th>Estación</th>
                    <th>Ubicación</th>
                    <th>Fecha y Hora</th>
                    <th>Temp (°C)</th>
                    <th>Humedad (%)</th>
                    <th>Presión (hPa)</th>
                    <th>Gas</th>
                    <th>Radiación</th>
                    <th>Viento (m/s)</th>
                    <th>Batería (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReadings.map((reading) => (
                    <tr key={reading.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{reading.id}</td>
                      <td style={styles.tableCell}>{reading.estacion_nombre || 'N/A'}</td>
                      <td style={styles.tableCell}>{reading.localizacion || 'N/A'}</td>
                      <td style={styles.tableCell}>{formatTimestamp(reading.timestamp)}</td>
                      <td style={styles.tableCell}>{reading.json.temperatura?.toFixed(1) || 'N/A'}</td>
                      <td style={styles.tableCell}>{reading.json.humedad?.toFixed(1) || 'N/A'}</td>
                      <td style={styles.tableCell}>{reading.json.presion?.toFixed(1) || 'N/A'}</td>
                      <td style={styles.tableCell}>{reading.json.gas?.toFixed(3) || 'N/A'}</td>
                      <td style={styles.tableCell}>{reading.json.radiacion || 'N/A'}</td>
                      <td style={styles.tableCell}>{reading.json.viento?.toFixed(1) || 'N/A'}</td>
                      <td style={styles.tableCell}>{reading.json.bateria?.toFixed(0) || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredReadings.length === 0 && !loading && (
                <div style={styles.noDataMessage}>
                  📊 No hay lecturas que coincidan con los filtros aplicados
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ContentSection>
  );
};

const styles = {
  container: {
    padding: '20px',
  },

  header: {
    textAlign: 'center' as const,
    marginBottom: '30px',
    padding: '20px',
    background: 'linear-gradient(135deg, #00BCD4, #00ACC1)',
    color: 'white',
    borderRadius: '12px',
  },

  // Sección de filtros
  filtersSection: {
    background: 'white',
    padding: '10px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid #e9ecef',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },

  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '15px',
    alignItems: 'end',
  },

  filterGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
  },

  filterInput: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    marginTop: '5px',
    width: '25%',
  },

  filterActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },



  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },

  // Estados
  loadingMessage: {
    textAlign: 'center' as const,
    padding: '40px',
    fontSize: '18px',
    color: '#6c757d',
    background: '#f8f9fa',
    borderRadius: '12px',
    margin: '20px 0',
  },

  errorMessage: {
    textAlign: 'center' as const,
    padding: '20px',
    background: '#f8d7da',
    color: '#721c24',
    borderRadius: '12px',
    margin: '20px 0',
  },

  retryButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    marginLeft: '10px',
  },

  // Estadísticas
  statsSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '20px',
  },

  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center' as const,
    border: '1px solid #e9ecef',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },

  statValue: {
    fontSize: '24px',
    fontWeight: 'bold' as const,
    color: '#00BCD4',
    margin: '5px 0',
  },

  // Tabla
  tableSection: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e9ecef',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },

  tableContainer: {
    overflowX: 'auto' as const,
    marginTop: '15px',
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
  },

  tableHeader: {
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #dee2e6',
  },

  tableRow: {
    borderBottom: '1px solid #dee2e6',
  },

  tableCell: {
    padding: '12px 8px',
    textAlign: 'left' as const,
    verticalAlign: 'top' as const,
    borderRight: '1px solid #dee2e6',
  },

  noDataMessage: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#6c757d',
    fontSize: '16px',
  },
};

export default ReportsPage;