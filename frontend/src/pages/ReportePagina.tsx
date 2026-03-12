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
import * as XLSX from 'xlsx';

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
  const [selectedSensor, setSelectedSensor] = useState<string>(''); // '' significa 'todos los sensores'
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Función auxiliar para normalizar datos numéricos
  const normalizeReadingData = useCallback((reading: any): Lectura => {
    return {
      ...reading,
      temperatura: reading.temperatura ? Number(reading.temperatura) : null,
      humedad: reading.humedad ? Number(reading.humedad) : null,
      presion_at: reading.presion_at ? Number(reading.presion_at) : null,
      velocidad_viento: reading.velocidad_viento ? Number(reading.velocidad_viento) : null,
      prediccion_temp: reading.prediccion_temp ? Number(reading.prediccion_temp) : null,
    };
  }, []);

  const loadReadings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await readingService.getAll();
      // Normalizar los datos para asegurar que los valores numéricos sean números
      const normalizedData = data.map(normalizeReadingData);
      setReadings(normalizedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar lecturas');
      console.error('Error cargando lecturas:', err);
    } finally {
      setLoading(false);
    }
  }, [normalizeReadingData]);

  // Cargar datos de lecturas al montar el componente
  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

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
        const fechaReading = new Date(reading.fecha_registro);
        return fechaReading >= fechaInicio;
      });
    }

    // Filtro por fecha de fin
    if (filters.fechaFin) {
      const fechaFin = new Date(filters.fechaFin);
      fechaFin.setHours(23, 59, 59, 999); //23:59:59 para incluir todo el día
      filtered = filtered.filter(reading => {
        const fechaReading = new Date(reading.fecha_registro);
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
    setCurrentPage(1); // Reset página al limpiar filtros
  };

  // Funciones de paginación
  const getTotalPages = () => Math.ceil(filteredReadings.length / itemsPerPage);
  
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredReadings.slice(startIndex, endIndex);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < getTotalPages()) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Reset página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredReadings.length]);

  const formatTimestamp = (fecha_registro: string) => {
    return new Date(fecha_registro).toLocaleString('es-CL', {
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
    
    const dates = readings.map(r => new Date(r.fecha_registro));
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

  // Función para descargar datos filtrados a Excel (XLSX)
  const downloadFilteredDataToExcel = () => {
    if (filteredReadings.length === 0) {
      alert('No hay datos para exportar. Aplique filtros para obtener datos.');
      return;
    }

    // Preparar datos para Excel con formato mejorado
    const excelData = filteredReadings.map(reading => ({
      'ID': reading.id,
      'Estación': reading.estacion_nombre || 'N/A',
      'Ubicación': reading.ubicacion || 'N/A', 
      'Fecha y Hora': formatTimestamp(reading.fecha_registro),
      'Temperatura (°C)': typeof reading.temperatura === 'number' ? reading.temperatura.toFixed(2) : 'N/A',
      'Humedad (%)': typeof reading.humedad === 'number' ? reading.humedad.toFixed(2) : 'N/A',
      'Presión Atmosférica (hPa)': typeof reading.presion_at === 'number' ? reading.presion_at.toFixed(2) : 'N/A',
      'Velocidad del Viento (m/s)': typeof reading.velocidad_viento === 'number' ? reading.velocidad_viento.toFixed(2) : 'N/A',
      'Predicción de Temperatura (°C)': typeof reading.prediccion_temp === 'number' ? reading.prediccion_temp.toFixed(2) : 'N/A',
      'Fecha de Registro Original': reading.fecha_registro
    }));

    // Crear libro de trabajo
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Configurar ancho de columnas optimizado
    const columnWidths = [
      { wch: 8 },  // ID
      { wch: 20 }, // Estación
      { wch: 25 }, // Ubicación
      { wch: 20 }, // Fecha y Hora
      { wch: 18 }, // Temperatura
      { wch: 15 }, // Humedad
      { wch: 25 }, // Presión
      { wch: 25 }, // Viento
      { wch: 30 }, // Predicción
      { wch: 25 }, // Fecha Original
    ];
    worksheet['!cols'] = columnWidths;

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos Meteorológicos');
    
    // Crear nombre del archivo
    let fileName = 'Reporte_Meteorologico';
    if (filters.estacion) {
      fileName += `_${filters.estacion.replace(/\s+/g, '_')}`;
    }
    if (filters.fechaInicio) {
      fileName += `_desde_${filters.fechaInicio}`;
    }
    if (filters.fechaFin) {
      fileName += `_hasta_${filters.fechaFin}`;
    }
    fileName += `_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Descargar archivo
    XLSX.writeFile(workbook, fileName);
    
    // Mostrar mensaje de éxito
    const totalRegistros = filteredReadings.length;
    alert(`✅ Descarga Excel completada!

📁 Archivo: ${fileName}
📊 Registros exportados: ${totalRegistros}
🎨 Formato: Excel con estilos y columnas optimizadas

🔍 Detalles del filtro aplicado:
${filters.estacion ? `• Estación: ${filters.estacion}\n` : ''}${filters.fechaInicio ? `• Fecha desde: ${filters.fechaInicio}\n` : ''}${filters.fechaFin ? `• Fecha hasta: ${filters.fechaFin}\n` : ''}
💡 El archivo Excel mantiene formato, anchos de columna y es ideal para análisis avanzado.`);
  };

  // Función para descargar datos filtrados a CSV (compatible con Excel)
  const downloadFilteredDataToCSV = () => {
    if (filteredReadings.length === 0) {
      alert('No hay datos para exportar. Aplique filtros para obtener datos.');
      return;
    }

    // Encabezados CSV
    const headers = [
      'ID',
      'Estación',
      'Ubicación',
      'Fecha y Hora',
      'Temperatura (°C)',
      'Humedad (%)',
      'Presión Atmosférica (hPa)',
      'Velocidad del Viento (m/s)',
      'Predicción de Temperatura (°C)',
      'Fecha de Registro Original'
    ];

    // Preparar datos para CSV
    const csvData = filteredReadings.map(reading => [
      reading.id,
      reading.estacion_nombre || 'N/A',
      reading.ubicacion || 'N/A',
      formatTimestamp(reading.fecha_registro),
      typeof reading.temperatura === 'number' ? reading.temperatura.toFixed(2) : 'N/A',
      typeof reading.humedad === 'number' ? reading.humedad.toFixed(2) : 'N/A',
      typeof reading.presion_at === 'number' ? reading.presion_at.toFixed(2) : 'N/A',
      typeof reading.velocidad_viento === 'number' ? reading.velocidad_viento.toFixed(2) : 'N/A',
      typeof reading.prediccion_temp === 'number' ? reading.prediccion_temp.toFixed(2) : 'N/A',
      reading.fecha_registro
    ]);

    // Convertir a formato CSV
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        row.map(field => {
          // Escapar comillas y envolver campos que contienen comas o comillas
          const fieldStr = String(field);
          if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
            return `"${fieldStr.replace(/"/g, '""')}"`;
          }
          return fieldStr;
        }).join(',')
      )
    ].join('\n');

    // Crear nombre del archivo con información de filtros
    let fileName = 'Reporte_Meteorologico';
    if (filters.estacion) {
      fileName += `_${filters.estacion.replace(/\s+/g, '_')}`;
    }
    if (filters.fechaInicio) {
      fileName += `_desde_${filters.fechaInicio}`;
    }
    if (filters.fechaFin) {
      fileName += `_hasta_${filters.fechaFin}`;
    }
    fileName += `_${new Date().toISOString().split('T')[0]}.csv`;

    // Crear blob y descargar
    const blob = new Blob(['\uFEFF' + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Mostrar mensaje de éxito
    const totalRegistros = filteredReadings.length;
    alert(`✅ Descarga CSV completada!

📁 Archivo: ${fileName}
📊 Registros exportados: ${totalRegistros}
💽 Formato: CSV (compatible con Excel)

🔍 Detalles del filtro aplicado:
${filters.estacion ? `• Estación: ${filters.estacion}\n` : ''}${filters.fechaInicio ? `• Fecha desde: ${filters.fechaInicio}\n` : ''}${filters.fechaFin ? `• Fecha hasta: ${filters.fechaFin}\n` : ''}
💡 Tip: Abra el archivo con Excel. El formato CSV es más liviano y universalmente compatible.`);
  };

  // Configuración de variables para el gráfico
  const variableOptions = [
    { key: 'temperatura', label: '🌡️ Temperatura (°C)', color: '#FF6384' },
    { key: 'humedad', label: '💧 Humedad (%)', color: '#36A2EB' },
    { key: 'presion', label: '📈 Presión (hPa)', color: '#FFCE56' },
    { key: 'viento', label: '🌪️ Viento (m/s)', color: '#9966FF' },
    { key: 'prediccion_temp', label: '🔮 Predicción Temp (°C)', color: '#FF9F40' },
  ];
  
  // Preparar datos para el gráfico
  const getChartData = () => {
    // Filtrar lecturas por sensor seleccionado
    let dataToUse = readings;
    if (selectedSensor) {
      dataToUse = readings.filter(reading => reading.estacion_nombre === selectedSensor);
    }

    const sortedReadings = [...dataToUse].sort((a, b) => 
      new Date(a.fecha_registro).getTime() - new Date(b.fecha_registro).getTime()
    );

    const selectedVar = variableOptions.find(v => v.key === selectedVariable);

    // Función para obtener el valor de la variable seleccionada
    const getValue = (reading: Lectura, variable: string) => {
      switch (variable) {
        case 'temperatura': return reading.temperatura;
        case 'humedad': return reading.humedad;
        case 'presion': return reading.presion_at;
        case 'viento': return reading.velocidad_viento;
        case 'prediccion_temp': return reading.prediccion_temp;
        default: return 0;
      }
    };

    return {
      labels: sortedReadings.map(reading => 
        new Date(reading.fecha_registro).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      ),
      datasets: [
        {
          label: `${selectedVar?.label || 'Variable'}${selectedSensor ? ` - ${selectedSensor}` : ' - Todos los sensores'}`,
          data: sortedReadings.map(reading => getValue(reading, selectedVariable)),
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
        text: `Evolución temporal de ${variableOptions.find(v => v.key === selectedVariable)?.label || 'Variable'}${selectedSensor ? ` - ${selectedSensor}` : ' - Todos los sensores'}`,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
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
              <h4>🏢 Estaciones Activas</h4>
              <p style={styles.statValue}>{getUniqueStations().length}</p>
            </div>
            <div style={styles.statCard}>
              <h4>🌡️ Temp. Promedio</h4>
              <p style={styles.statValue}>
                {filteredReadings.length > 0
                  ? (filteredReadings.reduce((sum, r) => sum + (typeof r.temperatura === 'number' ? r.temperatura : 0), 0) / filteredReadings.length).toFixed(1)
                  : '0'
                }°C
              </p>
            </div>
            <div style={styles.statCard}>
              <h4>💧 Humedad Promedio</h4>
              <p style={styles.statValue}>
                {filteredReadings.length > 0
                  ? (filteredReadings.reduce((sum, r) => sum + (typeof r.humedad === 'number' ? r.humedad : 0), 0) / filteredReadings.length).toFixed(1)
                  : '0'
                }%
              </p>
            </div>
              <div style={styles.statCard}>
                <h4>📈 Presión Promedio</h4>
                <p style={styles.statValue}>
                  {filteredReadings.length > 0
                    ? (filteredReadings.reduce((sum, r) => sum + (typeof r.presion_at === 'number' ? r.presion_at : 0), 0) / filteredReadings.length).toFixed(1)
                    : '0'
                  } hPa
                </p>
              </div>
              <div style={styles.statCard}>
                <h4>🌪️ Viento Promedio</h4>
                <p style={styles.statValue}>
                  {filteredReadings.length > 0
                    ? (filteredReadings.reduce((sum, r) => sum + (typeof r.velocidad_viento === 'number' ? r.velocidad_viento : 0), 0) / filteredReadings.length).toFixed(1)
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

            {/* Selector de sensor/estación */}
            <div style={styles.variableSelector}>
              <label style={styles.variableSelectorLabel}>Seleccionar sensor/estación:</label>
              <select
                value={selectedSensor}
                onChange={(e) => setSelectedSensor(e.target.value)}
                style={styles.variableSelectorInput}
              >
                <option value="">🌐 Todos los sensores</option>
                {getUniqueStations().map(station => (
                  <option key={station} value={station}>
                    🏢 {station}
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
            
            <div style={styles.downloadSection}>
              <div style={styles.downloadTitle}>📥 Descargar Datos ({filteredReadings.length} registros)</div>
              <div style={styles.downloadButtons}>
                <button
                  onClick={downloadFilteredDataToExcel}
                  style={styles.downloadButtonExcel}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1e7e34';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#28a745';
                    e.currentTarget.style.transform = 'translateY(0px)';
                  }}
                >
                  📊 Excel (.xlsx)<br/>
                  <small style={styles.downloadButtonSubtext}>Con formato y estilos</small>
                </button>
                
                <button
                  onClick={downloadFilteredDataToCSV}
                  style={styles.downloadButtonCSV}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#138496';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#17a2b8';
                    e.currentTarget.style.transform = 'translateY(0px)';
                  }}
                >
                  💾 CSV (.csv)<br/>
                  <small style={styles.downloadButtonSubtext}>Liviano y universal</small>
                </button>
              </div>
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
                    <th>Viento (m/s)</th>
                    <th>Predicción Temp (°C)</th>
                  </tr>
                </thead>
                <tbody>
                  {getCurrentPageData().map((reading) => (
                    <tr key={reading.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{reading.id}</td>
                      <td style={styles.tableCell}>{reading.estacion_nombre || 'N/A'}</td>
                      <td style={styles.tableCell}>{reading.ubicacion || 'N/A'}</td>
                      <td style={styles.tableCell}>{formatTimestamp(reading.fecha_registro)}</td>
                      <td style={styles.tableCell}>{typeof reading.temperatura === 'number' ? reading.temperatura.toFixed(1) : 'N/A'}</td>
                      <td style={styles.tableCell}>{typeof reading.humedad === 'number' ? reading.humedad.toFixed(1) : 'N/A'}</td>
                      <td style={styles.tableCell}>{typeof reading.presion_at === 'number' ? reading.presion_at.toFixed(1) : 'N/A'}</td>
                      <td style={styles.tableCell}>{typeof reading.velocidad_viento === 'number' ? reading.velocidad_viento.toFixed(1) : 'N/A'}</td>
                      <td style={styles.tableCell}>{typeof reading.prediccion_temp === 'number' ? reading.prediccion_temp.toFixed(1) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Controles de paginación */}
              {filteredReadings.length > 0 && (
                <div style={styles.paginationSection}>
                  {/* Selector de elementos por página */}
                  <div style={styles.itemsPerPageSelector}>
                    <label style={styles.paginationLabel}>Elementos por página:</label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      style={styles.paginationSelect}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  {/* Info de paginación */}
                  <div style={styles.paginationInfo}>
                    Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredReadings.length)} de {filteredReadings.length} registros
                  </div>

                  {/* Controles de navegación */}
                  <div style={styles.paginationControls}>
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      style={{
                        ...styles.paginationButton,
                        ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.background = '#00ACC1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.background = '#00BCD4';
                        }
                      }}
                    >
                      ← Anterior
                    </button>

                    <div style={styles.pageNumbers}>
                      {Array.from({ length: getTotalPages() }, (_, i) => i + 1)
                        .filter(page => {
                          // Mostrar solo algunas páginas alrededor de la actual
                          const range = 2;
                          return page === 1 || 
                                 page === getTotalPages() || 
                                 (page >= currentPage - range && page <= currentPage + range);
                        })
                        .map((page, index, array) => (
                          <React.Fragment key={page}>
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span style={styles.pageEllipsis}>...</span>
                            )}
                            <button
                              onClick={() => goToPage(page)}
                              style={{
                                ...styles.pageNumberButton,
                                ...(page === currentPage ? styles.pageNumberButtonActive : {})
                              }}
                              onMouseEnter={(e) => {
                                if (page !== currentPage) {
                                  e.currentTarget.style.background = '#e9ecef';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (page !== currentPage) {
                                  e.currentTarget.style.background = 'white';
                                }
                              }}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        ))}
                    </div>

                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === getTotalPages()}
                      style={{
                        ...styles.paginationButton,
                        ...(currentPage === getTotalPages() ? styles.paginationButtonDisabled : {})
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== getTotalPages()) {
                          e.currentTarget.style.background = '#00ACC1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== getTotalPages()) {
                          e.currentTarget.style.background = '#00BCD4';
                        }
                      }}
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}

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

  downloadButton: {
    padding: '12px 20px',
    backgroundColor: '#28A745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600' as const,
    transition: 'all 0.3s ease',
    width: '100%',
    height: 'fit-content',
    boxShadow: '0 2px 4px rgba(40, 167, 69, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },

  downloadSection: {
    marginTop: '15px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e9ecef',
  },

  downloadTitle: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
    color: '#495057',
    marginBottom: '15px',
    textAlign: 'center' as const,
  },

  downloadButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
  },

  downloadButtonExcel: {
    padding: '15px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600' as const,
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 6px rgba(40, 167, 69, 0.3)',
    textAlign: 'center' as const,
    lineHeight: 1.3,
  },

  downloadButtonCSV: {
    padding: '15px 20px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600' as const,
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 6px rgba(23, 162, 184, 0.3)',
    textAlign: 'center' as const,
    lineHeight: 1.3,
  },

  downloadButtonSubtext: {
    fontSize: '11px',
    opacity: 0.9,
    fontWeight: 'normal' as const,
    display: 'block',
    marginTop: '4px',
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
    gap: '10px',
    marginBottom: '10px',
    padding: '10px',
    flexWrap: 'wrap' as const,
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
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Estilos para paginación
  paginationSection: {
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '8px',
    marginTop: '15px',
    border: '1px solid #e9ecef',
  },

  itemsPerPageSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '15px',
  },

  paginationLabel: {
    fontWeight: 'bold' as const,
    color: '#495057',
    fontSize: '14px',
  },

  paginationSelect: {
    padding: '6px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
  },

  paginationInfo: {
    textAlign: 'center' as const,
    marginBottom: '15px',
    color: '#6c757d',
    fontSize: '14px',
  },

  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px',
  },

  paginationButton: {
    padding: '8px 16px',
    backgroundColor: '#00BCD4',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s ease',
  },

  paginationButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
    color: '#666',
  },

  pageNumbers: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },

  pageNumberButton: {
    padding: '8px 12px',
    backgroundColor: 'white',
    color: '#495057',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    minWidth: '40px',
  },

  pageNumberButtonActive: {
    backgroundColor: '#00BCD4',
    color: 'white',
    borderColor: '#00BCD4',
  },

  pageEllipsis: {
    padding: '8px 4px',
    color: '#6c757d',
    fontSize: '14px',
  },
};

export default ReportsPage;