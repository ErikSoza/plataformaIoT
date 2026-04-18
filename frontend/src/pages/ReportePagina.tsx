import React, { useState, useEffect, useCallback } from 'react';
import { ContentSection } from '../components/layout';
import { readingService } from '../services/api';
import { Lectura } from '../types';
import PrediccionChart from '../components/PrediccionChart';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const ReportsPage: React.FC = () => {
  const [readings, setReadings] = useState<Lectura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filteredReadings, setFilteredReadings] = useState<Lectura[]>([]);
  const [filters, setFilters] = useState({ estacion: '', fechaInicio: '', fechaFin: '' });
  const [selectedVariable, setSelectedVariable] = useState<string>('temperatura');
  const [selectedSensor, setSelectedSensor] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedPredStation, setSelectedPredStation] = useState<{ id: number; nombre: string } | null>(null);

  const normalizeReadingData = useCallback((reading: any): Lectura => ({
    ...reading,
    temperatura: reading.temperatura ? Number(reading.temperatura) : null,
    humedad: reading.humedad ? Number(reading.humedad) : null,
    presion_at: reading.presion_at ? Number(reading.presion_at) : null,
    velocidad_viento: reading.velocidad_viento ? Number(reading.velocidad_viento) : null,
    prediccion_temp: reading.prediccion_temp ? Number(reading.prediccion_temp) : null,
  }), []);

  const loadReadings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await readingService.getAll();
      const normalizedData = data.map(normalizeReadingData);
      setReadings(normalizedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar lecturas');
    } finally {
      setLoading(false);
    }
  }, [normalizeReadingData]);

  useEffect(() => { loadReadings(); }, [loadReadings]);

  const applyFilters = useCallback(() => {
    let filtered = readings;
    if (filters.estacion) {
      filtered = filtered.filter(r =>
        r.estacion_nombre?.toLowerCase().includes(filters.estacion.toLowerCase())
      );
    }
    if (filters.fechaInicio) {
      const fechaInicio = new Date(filters.fechaInicio);
      filtered = filtered.filter(r => new Date(r.fecha_registro) >= fechaInicio);
    }
    if (filters.fechaFin) {
      const fechaFin = new Date(filters.fechaFin);
      fechaFin.setHours(23, 59, 59, 999);
      filtered = filtered.filter(r => new Date(r.fecha_registro) <= fechaFin);
    }
    setFilteredReadings(filtered);
  }, [readings, filters.estacion, filters.fechaInicio, filters.fechaFin]);

  useEffect(() => { applyFilters(); }, [applyFilters]);
  useEffect(() => { setCurrentPage(1); }, [filteredReadings.length]);

  const handleFilterChange = (field: string, value: string) =>
    setFilters(prev => ({ ...prev, [field]: value }));

  const clearFilters = () => {
    setFilters({ estacion: '', fechaInicio: '', fechaFin: '' });
    setCurrentPage(1);
  };

  const getTotalPages = () => Math.ceil(filteredReadings.length / itemsPerPage);
  const getCurrentPageData = () => filteredReadings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getDateRange = () => {
    if (readings.length === 0) return null;
    const dates = readings.map(r => new Date(r.fecha_registro));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    return { min: minDate.toISOString().split('T')[0], max: maxDate.toISOString().split('T')[0] };
  };

  const setQuickDateFilter = (days: number) => {
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - days);
    setFilters(prev => ({
      ...prev,
      fechaInicio: pastDate.toISOString().split('T')[0],
      fechaFin: today.toISOString().split('T')[0],
    }));
  };

  const getUniqueStations = () =>
    readings
      .map(r => r.estacion_nombre)
      .filter(Boolean)
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .sort() as string[];

  const getUniqueStationsWithIds = () => {
    const map = new Map<number, string>();
    readings.forEach(r => {
      if (r.estacion_id && r.estacion_nombre) {
        map.set(r.estacion_id, r.estacion_nombre);
      }
    });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  };

  const formatTimestamp = (fecha_registro: string) =>
    new Date(fecha_registro).toLocaleString('es-CL', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  const avg = (field: keyof Lectura) => {
    const vals = filteredReadings.filter(r => typeof r[field] === 'number').map(r => r[field] as number);
    return vals.length > 0 ? (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : '—';
  };

  // ── Exportación ───────────────────────────────────────────
  const prepareExportData = () =>
    filteredReadings.map(r => ({
      'ID': r.id,
      'Estación': r.estacion_nombre || 'N/A',
      'Ubicación': r.ubicacion || 'N/A',
      'Fecha y Hora': formatTimestamp(r.fecha_registro),
      'Temperatura (°C)': typeof r.temperatura === 'number' ? r.temperatura.toFixed(2) : 'N/A',
      'Humedad (%)': typeof r.humedad === 'number' ? r.humedad.toFixed(2) : 'N/A',
      'Presión (hPa)': typeof r.presion_at === 'number' ? r.presion_at.toFixed(2) : 'N/A',
      'Viento (m/s)': typeof r.velocidad_viento === 'number' ? r.velocidad_viento.toFixed(2) : 'N/A',
      'Pred. Temp (°C)': typeof r.prediccion_temp === 'number' ? r.prediccion_temp.toFixed(2) : 'N/A',
    }));

  const downloadExcel = () => {
    if (filteredReadings.length === 0) return alert('No hay datos para exportar.');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(prepareExportData());
    ws['!cols'] = [8, 20, 25, 20, 16, 14, 14, 14, 16].map(wch => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, 'Datos Meteorológicos');
    XLSX.writeFile(wb, `Reporte_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadCSV = () => {
    if (filteredReadings.length === 0) return alert('No hay datos para exportar.');
    const data = prepareExportData();
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      Object.values(row).map(v => {
        const s = String(v);
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    );
    const blob = new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // ── Gráfico temporal ──────────────────────────────────────
  const variableOptions = [
    { key: 'temperatura', label: 'Temperatura (°C)', color: '#FF6384' },
    { key: 'humedad', label: 'Humedad (%)', color: '#36A2EB' },
    { key: 'presion', label: 'Presión (hPa)', color: '#FFCE56' },
    { key: 'viento', label: 'Viento (m/s)', color: '#9966FF' },
    { key: 'prediccion_temp', label: 'Predicción Temp (°C)', color: '#FF9F40' },
  ];

  const getChartData = () => {
    const dataToUse = selectedSensor
      ? readings.filter(r => r.estacion_nombre === selectedSensor)
      : readings;
    const sorted = [...dataToUse].sort((a, b) =>
      new Date(a.fecha_registro).getTime() - new Date(b.fecha_registro).getTime()
    );
    const selVar = variableOptions.find(v => v.key === selectedVariable);
    const getValue = (r: Lectura): number | null => {
      switch (selectedVariable) {
        case 'temperatura': return r.temperatura ?? null;
        case 'humedad': return r.humedad ?? null;
        case 'presion': return r.presion_at ?? null;
        case 'viento': return r.velocidad_viento ?? null;
        case 'prediccion_temp': return r.prediccion_temp ?? null;
        default: return null;
      }
    };
    return {
      labels: sorted.map(r =>
        new Date(r.fecha_registro).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      ),
      datasets: [{
        label: `${selVar?.label}${selectedSensor ? ` — ${selectedSensor}` : ' — Todas'}`,
        data: sorted.map(r => getValue(r)),
        borderColor: selVar?.color || '#FF6384',
        backgroundColor: (selVar?.color || '#FF6384') + '20',
        borderWidth: 2,
        fill: false,
        tension: 0.3,
        pointRadius: 2,
      }],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: false },
    },
    scales: { y: { beginAtZero: false } },
  };

  const stationsWithIds = getUniqueStationsWithIds();

  // ── Render ────────────────────────────────────────────────
  return (
    <ContentSection title="Reportes y Análisis de Datos">
      <div style={s.page}>

        {/* ── Estado ── */}
        {loading && <div style={s.stateBox}>Cargando datos de lecturas…</div>}
        {error && (
          <div style={{ ...s.stateBox, ...s.stateError }}>
            Error: {error}
            <button onClick={loadReadings} style={s.retryBtn}>Reintentar</button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── 1. Resumen estadístico ── */}
            <section style={s.section}>
              <h3 style={s.sectionTitle}>Resumen estadístico</h3>
              <div style={s.statsGrid}>
                {[
                  //{ label: 'Total lecturas', value: String(filteredReadings.length), unit: '' },
                  { label: 'Estaciones activas', value: String(getUniqueStations().length), unit: '' },
                  { label: 'Temp. promedio', value: avg('temperatura'), unit: '°C' },
                  { label: 'Humedad promedio', value: avg('humedad'), unit: '%' },
                  { label: 'Presión promedio', value: avg('presion_at'), unit: ' hPa' },
                  { label: 'Viento promedio', value: avg('velocidad_viento'), unit: ' m/s' },
                ].map(({ label, value, unit }) => (
                  <div key={label} style={s.statCard}>
                    <span style={s.statLabel}>{label}</span>
                    <span style={s.statValue}>{value}{unit}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 2. Predicción de temperatura ── */}
            <section style={s.section}>
              <h3 style={s.sectionTitle}>Predicción de temperatura</h3>
              <p style={s.sectionDesc}>
                Selecciona una estación para ver la predicción XGBoost comparada con Open-Meteo como referencia.
              </p>

              {stationsWithIds.length > 0 ? (
                <>
                  <div style={s.predStationRow}>
                    <label style={s.inputLabel}>Estación:</label>
                    <select
                      style={s.select}
                      value={selectedPredStation?.id ?? ''}
                      onChange={e => {
                        const id = Number(e.target.value);
                        const st = stationsWithIds.find(s => s.id === id) || null;
                        setSelectedPredStation(st);
                      }}
                    >
                      <option value="">Seleccionar estación…</option>
                      {stationsWithIds.map(st => (
                        <option key={st.id} value={st.id}>{st.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {selectedPredStation ? (
                    <PrediccionChart
                      estacionId={selectedPredStation.id}
                      estacionNombre={selectedPredStation.nombre}
                    />
                  ) : (
                    <div style={s.predPlaceholder}>
                      Selecciona una estación para visualizar la predicción
                    </div>
                  )}
                </>
              ) : (
                <div style={s.predPlaceholder}>No hay estaciones con ID disponibles en las lecturas</div>
              )}
            </section>

            {/* ── 3. Análisis gráfico temporal ── */}
            {readings.length > 0 && (
              <section style={s.section}>
                <h3 style={s.sectionTitle}>Análisis gráfico temporal</h3>
                <div style={s.chartControls}>
                  <div style={s.controlGroup}>
                    <label style={s.inputLabel}>Variable:</label>
                    <select style={s.select} value={selectedVariable} onChange={e => setSelectedVariable(e.target.value)}>
                      {variableOptions.map(o => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={s.controlGroup}>
                    <label style={s.inputLabel}>Estación:</label>
                    <select style={s.select} value={selectedSensor} onChange={e => setSelectedSensor(e.target.value)}>
                      <option value="">Todas las estaciones</option>
                      {getUniqueStations().map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={s.chartBox}>
                  <Line data={getChartData()} options={chartOptions} />
                </div>
              </section>
            )}

            {/* ── 4. Tabla de datos ── */}
            <section style={s.section}>
              <h3 style={s.sectionTitle}>Tabla de datos</h3>

              {/* Filtros rápidos */}
              <div style={s.quickRow}>
                <span style={s.quickLabel}>Filtros rápidos:</span>
                {[['Hoy', 1], ['7 días', 7], ['30 días', 30], ['90 días', 90]].map(([label, days]) => (
                  <button
                    key={label}
                    style={s.chipBtn}
                    onClick={() => setQuickDateFilter(Number(days))}
                  >
                    {label}
                  </button>
                ))}
                {(filters.estacion || filters.fechaInicio || filters.fechaFin) && (
                  <button style={{ ...s.chipBtn, ...s.chipBtnClear }} onClick={clearFilters}>
                    Limpiar filtros
                  </button>
                )}
              </div>

              {/* Filtros avanzados */}
              <div style={s.filtersGrid}>
                <div style={s.fieldGroup}>
                  <label style={s.inputLabel}>Estación</label>
                  <select style={s.select} value={filters.estacion} onChange={e => handleFilterChange('estacion', e.target.value)}>
                    <option value="">Todas</option>
                    {getUniqueStations().map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.inputLabel}>Fecha desde</label>
                  <input type="date" style={s.select} value={filters.fechaInicio}
                    onChange={e => handleFilterChange('fechaInicio', e.target.value)}
                    min={getDateRange()?.min} max={getDateRange()?.max} />
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.inputLabel}>Fecha hasta</label>
                  <input type="date" style={s.select} value={filters.fechaFin}
                    onChange={e => handleFilterChange('fechaFin', e.target.value)}
                    min={getDateRange()?.min} max={getDateRange()?.max} />
                </div>
                <div style={{ ...s.fieldGroup, justifyContent: 'flex-end' }}>
                  <label style={s.inputLabel}>Exportar ({filteredReadings.length})</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={s.btnExcel} onClick={downloadExcel}>Excel</button>
                    <button style={s.btnCSV} onClick={downloadCSV}>CSV</button>
                  </div>
                </div>
              </div>

              {/* Tabla */}
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={s.th}>ID</th>
                      <th style={s.th}>Estación</th>
                      <th style={s.th}>Ubicación</th>
                      <th style={s.th}>Fecha y hora</th>
                      <th style={s.th}>Temp (°C)</th>
                      <th style={s.th}>Hum (%)</th>
                      <th style={s.th}>Presión (hPa)</th>
                      <th style={s.th}>Viento (m/s)</th>
                      <th style={s.th}>Pred. Temp (°C)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getCurrentPageData().map((r, idx) => (
                      <tr key={r.id} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8f9fa' }}>
                        <td style={s.td}>{r.id}</td>
                        <td style={s.td}>{r.estacion_nombre || '—'}</td>
                        <td style={s.td}>{r.ubicacion || '—'}</td>
                        <td style={s.td}>{formatTimestamp(r.fecha_registro)}</td>
                        <td style={s.td}>{typeof r.temperatura === 'number' ? r.temperatura.toFixed(1) : '—'}</td>
                        <td style={s.td}>{typeof r.humedad === 'number' ? r.humedad.toFixed(1) : '—'}</td>
                        <td style={s.td}>{typeof r.presion_at === 'number' ? r.presion_at.toFixed(1) : '—'}</td>
                        <td style={s.td}>{typeof r.velocidad_viento === 'number' ? r.velocidad_viento.toFixed(1) : '—'}</td>
                        <td style={{ ...s.td, color: typeof r.prediccion_temp === 'number' ? '#0288D1' : undefined }}>
                          {typeof r.prediccion_temp === 'number' ? r.prediccion_temp.toFixed(1) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredReadings.length === 0 && (
                  <div style={s.emptyState}>No hay registros que coincidan con los filtros aplicados</div>
                )}
              </div>

              {/* Paginación */}
              {filteredReadings.length > 0 && (
                <div style={s.pagination}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={s.pageInfo}>Filas por página:</span>
                    <select style={s.pageSelect} value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                      {[5, 10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <span style={s.pageInfo}>
                    {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredReadings.length)} de {filteredReadings.length}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button style={s.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>←</button>
                    {Array.from({ length: getTotalPages() }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === getTotalPages() || Math.abs(p - currentPage) <= 1)
                      .reduce<(number | string)[]>((acc, p, i, arr) => {
                        if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === '…'
                          ? <span key={`e${i}`} style={s.pageInfo}>…</span>
                          : <button key={p} style={{ ...s.pageBtn, ...(p === currentPage ? s.pageBtnActive : {}) }} onClick={() => setCurrentPage(Number(p))}>{p}</button>
                      )
                    }
                    <button style={s.pageBtn} disabled={currentPage === getTotalPages()} onClick={() => setCurrentPage(p => p + 1)}>→</button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </ContentSection>
  );
};

// ── Estilos ───────────────────────────────────────────────────
const s = {
  page: { padding: '8px 0', display: 'flex', flexDirection: 'column' as const, gap: '24px' },

  stateBox: {
    padding: '32px', textAlign: 'center' as const, borderRadius: '10px',
    background: '#f8f9fa', color: '#6c757d', fontSize: '15px',
  },
  stateError: { background: '#f8d7da', color: '#721c24' },
  retryBtn: {
    marginLeft: '12px', padding: '6px 14px', background: '#dc3545',
    color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
  },

  section: {
    background: 'white', borderRadius: '12px', padding: '24px',
    border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '600' as const,
    color: '#2c3e50', paddingLeft: '12px',
    borderLeft: '3px solid #00BCD4',
  },
  sectionDesc: { margin: '6px 0 16px 0', color: '#6c757d', fontSize: '0.85rem' },

  // Stats
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '12px', marginTop: '16px',
  },
  statCard: {
    background: '#f8f9fa', borderRadius: '8px', padding: '16px 14px',
    display: 'flex', flexDirection: 'column' as const, gap: '6px',
    border: '1px solid #e9ecef',
  },
  statLabel: { fontSize: '0.75rem', color: '#6c757d', fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: '0.4px' },
  statValue: { fontSize: '1.5rem', fontWeight: '300' as const, color: '#00BCD4' },

  // Predicción
  predStationRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' as const },
  predPlaceholder: {
    padding: '40px', textAlign: 'center' as const, background: '#f8f9fa',
    borderRadius: '8px', color: '#6c757d', fontSize: '0.9rem',
    border: '1px dashed #dee2e6',
  },

  // Gráfico
  chartControls: { display: 'flex', gap: '20px', flexWrap: 'wrap' as const, marginTop: '16px', marginBottom: '16px' },
  controlGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
  chartBox: { height: '360px', position: 'relative' as const },

  // Filtros tabla
  quickRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const, marginTop: '12px', marginBottom: '16px' },
  quickLabel: { fontSize: '0.82rem', color: '#6c757d', fontWeight: '600' as const, marginRight: '4px' },
  chipBtn: {
    padding: '5px 12px', background: '#e9ecef', color: '#495057',
    border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '0.78rem',
    fontWeight: '500' as const,
  },
  chipBtnClear: { background: '#f8d7da', color: '#721c24' },

  filtersGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px', marginBottom: '16px', padding: '16px',
    background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef',
  },
  fieldGroup: { display: 'flex', flexDirection: 'column' as const, gap: '6px' },
  inputLabel: { fontSize: '0.78rem', color: '#6c757d', fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: '0.4px' },
  select: {
    padding: '7px 10px', border: '1px solid #dee2e6', borderRadius: '6px',
    fontSize: '0.85rem', background: 'white', color: '#495057',
  },

  btnExcel: {
    padding: '7px 14px', background: '#28a745', color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '500' as const,
  },
  btnCSV: {
    padding: '7px 14px', background: '#17a2b8', color: 'white',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '500' as const,
  },

  // Tabla
  tableWrap: { overflowX: 'auto' as const },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.83rem' },
  thead: { background: '#f8f9fa' },
  th: { padding: '10px 12px', textAlign: 'left' as const, fontWeight: '600' as const, color: '#495057', borderBottom: '2px solid #dee2e6', whiteSpace: 'nowrap' as const },
  td: { padding: '10px 12px', color: '#495057', borderBottom: '1px solid #f0f0f0' },
  emptyState: { padding: '40px', textAlign: 'center' as const, color: '#6c757d', fontSize: '0.9rem' },

  // Paginación
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap' as const, gap: '12px', marginTop: '16px',
    padding: '12px 16px', background: '#f8f9fa', borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  pageInfo: { fontSize: '0.82rem', color: '#6c757d' },
  pageSelect: { padding: '4px 8px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '0.82rem', background: 'white' },
  pageBtn: {
    padding: '5px 10px', background: 'white', color: '#495057',
    border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer', fontSize: '0.82rem',
  },
  pageBtnActive: { background: '#00BCD4', color: 'white', borderColor: '#00BCD4' },
};

export default ReportsPage;
