import React, { useState, useEffect, useCallback } from 'react';
import { ContentSection } from '../components/layout';
import { readingService } from '../services/api';
import { Lectura } from '../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ReportsPage: React.FC = () => {
  const [readings, setReadings] = useState<Lectura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredReadings, setFilteredReadings] = useState<Lectura[]>([]);
  const [filters, setFilters] = useState({
    estacion: '',
    fechaInicio: '',
    fechaFin: '',
  });
  const [selectedVariable, setSelectedVariable] = useState<string>('temperatura');

  // Cargar datos de lecturas al montar el componente
  useEffect(() => {
    loadReadings();
  }, []);

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

    // Filtro por fecha de inicio
    if (filters.fechaInicio) {
      const fechaInicio = new Date(filters.fechaInicio);
      filtered = filtered.filter(reading => {
        const fechaReading = new Date(reading.timestamp);
        return fechaReading >= fechaInicio;
      });
    }

    // Filtro por fecha de fin
    if (filters.fechaFin) {
      const fechaFin = new Date(filters.fechaFin);
      fechaFin.setHours(23, 59, 59, 999); //23:59:59 para incluir todo el día
      filtered = filtered.filter(reading => {
        const fechaReading = new Date(reading.timestamp);
        return fechaReading <= fechaFin;
      });
    }

    setFilteredReadings(filtered);
  }, [readings, filters.estacion, filters.fechaInicio, filters.fechaFin]);

  // Filtrar lecturas cuando cambian los filtros
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      estacion: '',
      fechaInicio: '',
      fechaFin: '',
    });
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

  const getDateRange = () => {
    if (readings.length === 0) return null;
    
    const dates = readings.map(r => new Date(r.timestamp));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    return {
      min: minDate.toISOString().split('T')[0],
      max: maxDate.toISOString().split('T')[0]
    };
  };

  const setQuickDateFilter = (days: number) => {
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - days);
    
    setFilters(prev => ({
      ...prev,
      fechaInicio: pastDate.toISOString().split('T')[0],
      fechaFin: today.toISOString().split('T')[0]
    }));
  };

  const getUniqueStations = () => {
    const stations = readings
      .map(r => r.estacion_nombre)
      .filter(Boolean)
      .filter((station, index, arr) => arr.indexOf(station) === index)
      .sort();
    return stations;
  };

  // Configuración de variables para el gráfico
  const variableOptions = [
    { key: 'temperatura', label: '🌡️ Temperatura (°C)', color: '#FF6384' },
    { key: 'humedad', label: '💧 Humedad (%)', color: '#36A2EB' },
    { key: 'presion', label: '📈 Presión (hPa)', color: '#FFCE56' },
    { key: 'gas', label: '💨 Gas', color: '#4BC0C0' },
    { key: 'radiacion', label: '☀️ Radiación', color: '#FF9F40' },
    { key: 'viento', label: '🌪️ Viento (m/s)', color: '#9966FF' },
    { key: 'bateria', label: '🔋 Batería (%)', color: '#FF6B6B' },
  ];

  // Preparar datos para el gráfico
  const getChartData = () => {
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const selectedVar = variableOptions.find(v => v.key === selectedVariable);
    
    return {
      labels: sortedReadings.map(reading => 
        new Date(reading.timestamp).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      ),
      datasets: [
        {
          label: selectedVar?.label || 'Variable',
          data: sortedReadings.map(reading => reading.json[selectedVariable as keyof typeof reading.json]),
          borderColor: selectedVar?.color || '#FF6384',
          backgroundColor: selectedVar?.color + '20' || '#FF638420',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        },
      ],
    };
  };

  // Opciones del gráfico
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Evolución temporal de ${variableOptions.find(v => v.key === selectedVariable)?.label || 'Variable'}`,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  return (
    <ContentSection title="📊 Reportes y Análisis de Datos Resumido">
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

        {/* Sección de Gráfico */}
        {!loading && !error && readings.length > 0 && (
          <div style={styles.chartSection}>
            <h4>📊 Análisis Gráfico Temporal</h4>
            
            {/* Selector de variable */}
            <div style={styles.variableSelector}>
              <label style={styles.variableSelectorLabel}>Seleccionar variable a visualizar:</label>
              <select
                value={selectedVariable}
                onChange={(e) => setSelectedVariable(e.target.value)}
                style={styles.variableSelectorInput}
              >
                {variableOptions.map(option => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Gráfico */}
            <div style={styles.chartContainer}>
              <Line data={getChartData()} options={chartOptions} />
            </div>
          </div>
        )}

        {/* Tabla de datos */}
        {!loading && !error && (
          <div style={styles.tableSection}>
            <h4>🔍 Búsqueda detallada: ({filteredReadings.length} registros)
              {(filters.estacion || filters.fechaInicio || filters.fechaFin) && (
                <span style={styles.activeFiltersInfo}>
                  {filters.estacion && ` | Estación: ${filters.estacion}`}
                  {filters.fechaInicio && ` | Desde: ${filters.fechaInicio}`}
                  {filters.fechaFin && ` | Hasta: ${filters.fechaFin}`}
                </span>
              )}
            </h4>
            
            {/* Filtros rápidos de fecha */}
            <div style={styles.quickFilters}>
              <span style={styles.quickFiltersLabel}>📅 Filtros rápidos:</span>
              <button 
                onClick={() => setQuickDateFilter(1)} 
                style={styles.quickFilterButton}
                onMouseEnter={(e) => e.currentTarget.style.background = '#00ACC1'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#00BCD4'}
              >
                Último día
              </button>
              <button 
                onClick={() => setQuickDateFilter(7)} 
                style={styles.quickFilterButton}
                onMouseEnter={(e) => e.currentTarget.style.background = '#00ACC1'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#00BCD4'}
              >
                Última semana
              </button>
              <button 
                onClick={() => setQuickDateFilter(30)} 
                style={styles.quickFilterButton}
                onMouseEnter={(e) => e.currentTarget.style.background = '#00ACC1'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#00BCD4'}
              >
                Último mes
              </button>
              <button 
                onClick={() => setQuickDateFilter(90)} 
                style={styles.quickFilterButton}
                onMouseEnter={(e) => e.currentTarget.style.background = '#00ACC1'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#00BCD4'}
              >
                Últimos 3 meses
              </button>
            </div>
            
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
                {getUniqueStations().length > 0 && (
                  <small style={styles.dateHint}>
                    {getUniqueStations().length} estaciones disponibles
                  </small>
                )}
              </div>
            
              <div style={styles.filterGroup}>
                <label>📅 Fecha desde:</label>
                <input
                  type="date"
                  value={filters.fechaInicio}
                  onChange={(e) => handleFilterChange('fechaInicio', e.target.value)}
                  style={styles.filterInput}
                  min={getDateRange()?.min}
                  max={getDateRange()?.max}
                />
                {getDateRange() && (
                  <small style={styles.dateHint}>
                    Disponible desde: {getDateRange()?.min}
                  </small>
                )}
              </div>
              
              <div style={styles.filterGroup}>
                <label>📅 Fecha hasta:</label>
                <input
                  type="date"
                  value={filters.fechaFin}
                  onChange={(e) => handleFilterChange('fechaFin', e.target.value)}
                  style={styles.filterInput}
                  min={getDateRange()?.min}
                  max={getDateRange()?.max}
                />
                {getDateRange() && (
                  <small style={styles.dateHint}>
                    Disponible hasta: {getDateRange()?.max}
                  </small>
                )}
              </div>
            
            <div style={styles.filterGroup}>
              <button
                onClick={clearFilters}
                style={styles.clearButton}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dc3545';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#6c757d';
                }}
              >
                🗑️ Limpiar filtros
              </button>
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
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
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
    width: '100%',
  },

  clearButton: {
    padding: '10px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    width: '100%',
    height: 'fit-content',
  },

  quickFilters: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    flexWrap: 'wrap' as const,
  },

  quickFiltersLabel: {
    fontWeight: 'bold' as const,
    color: '#495057',
    marginRight: '10px',
  },

  quickFilterButton: {
    padding: '6px 12px',
    backgroundColor: '#00BCD4',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.3s ease',
  },

  dateHint: {
    color: '#6c757d',
    fontSize: '11px',
    marginTop: '4px',
    display: 'block',
  },

  activeFiltersInfo: {
    fontSize: '14px',
    color: '#28a745',
    fontWeight: 'normal' as const,
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

  // Estilos para el gráfico
  chartSection: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid #e9ecef',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },

  variableSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '20px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },

  variableSelectorLabel: {
    fontWeight: 'bold' as const,
    color: '#495057',
    minWidth: 'fit-content',
  },

  variableSelectorInput: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '250px',
    backgroundColor: 'white',
  },

  chartContainer: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    height: '400px',
    position: 'relative' as const,
  },
};

export default ReportsPage;