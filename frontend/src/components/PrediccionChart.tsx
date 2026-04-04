import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { prediccionService, PrediccionResponse } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PrediccionChartProps {
  estacionId: number;
  estacionNombre?: string;
}

type Horizonte = 24 | 48 | 72;

const BADGE_COLOR: Record<string, string> = {
  Alto: '#28a745',
  Medio: '#ffc107',
  Bajo: '#dc3545',
  Desconocido: '#6c757d',
};

const PrediccionChart: React.FC<PrediccionChartProps> = ({ estacionId, estacionNombre }) => {
  const [datos, setDatos] = useState<PrediccionResponse | null>(null);
  const [horizonte, setHorizonte] = useState<Horizonte>(72);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarPrediccion = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resultado = await prediccionService.getByEstacion(estacionId, horizonte);
      setDatos(resultado);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la predicción');
    } finally {
      setCargando(false);
    }
  }, [estacionId, horizonte]);

  useEffect(() => {
    cargarPrediccion();
  }, [cargarPrediccion]);

  // ── Construcción del gráfico ──────────────────────────────
  const construirDatosGrafico = () => {
    if (!datos) return null;

    const predsLocal = datos.modelo_local.predicciones;
    const mae = datos.modelo_local.metricas_entrenamiento?.mae_celsius ?? 1.8;

    // Etiquetas: mostrar cada N horas para no saturar el eje
    const paso = horizonte <= 24 ? 2 : horizonte <= 48 ? 4 : 6;
    const etiquetas = predsLocal.map((p, i) => {
      if (i === 0 || (p.hora_offset % paso === 0)) {
        const fecha = new Date(p.datetime);
        return `${fecha.getDate()}/${fecha.getMonth() + 1} ${String(fecha.getHours()).padStart(2, '0')}h`;
      }
      return '';
    });

    const tempsLocal = predsLocal.map((p) => p.temperatura);

    // Banda de incertidumbre: upper y lower rellenados entre sí
    const upper = tempsLocal.map((t) => parseFloat((t + mae).toFixed(2)));
    const lower = tempsLocal.map((t) => parseFloat((t - mae).toFixed(2)));

    // Open-Meteo alineado por hora_offset
    const omMap = new Map(
      datos.validacion_openmeteo.predicciones.map((p) => [p.hora_offset, p.temperatura])
    );
    const tempsOM = predsLocal.map((p) => omMap.get(p.hora_offset) ?? null);

    return {
      labels: etiquetas,
      datasets: [
        // 1. Banda superior (invisible, referencia del fill)
        {
          label: '_upper',
          data: upper,
          borderColor: 'transparent',
          backgroundColor: 'rgba(0, 188, 212, 0.12)',
          pointRadius: 0,
          fill: '+1',  // rellena hasta el dataset siguiente (lower)
          tension: 0.4,
        },
        // 2. Banda inferior (invisible)
        {
          label: '_lower',
          data: lower,
          borderColor: 'transparent',
          backgroundColor: 'rgba(0, 188, 212, 0.12)',
          pointRadius: 0,
          fill: false,
          tension: 0.4,
        },
        // 3. Línea XGBoost (azul sólida)
        {
          label: 'XGBoost (modelo local)',
          data: tempsLocal,
          borderColor: '#0288D1',
          backgroundColor: '#0288D1',
          borderWidth: 2.5,
          pointRadius: (ctx: any) => (ctx.dataIndex % paso === 0 ? 4 : 0),
          pointHoverRadius: 6,
          tension: 0.4,
          fill: false,
        },
        // 4. Línea Open-Meteo (gris punteada)
        ...(datos.validacion_openmeteo.disponible
          ? [
              {
                label: 'Open-Meteo (referencia)',
                data: tempsOM,
                borderColor: '#9E9E9E',
                backgroundColor: '#9E9E9E',
                borderWidth: 1.8,
                borderDash: [6, 4],
                pointRadius: 0,
                pointHoverRadius: 5,
                tension: 0.4,
                fill: false,
              },
            ]
          : []),
      ],
    };
  };

  const opcionesGrafico = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: {
        display: true,
        labels: {
          filter: (item: any) => !item.text.startsWith('_'),
          color: '#495057',
          font: { size: 12 },
          usePointStyle: true,
          pointStyleWidth: 16,
        },
      },
      tooltip: {
        filter: (item: any) => !item.dataset.label.startsWith('_'),
        callbacks: {
          label: (ctx: any) => {
            if (ctx.parsed.y === null) return '';
            return ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}°C`;
          },
        },
      },
      title: { display: false },
    },
    scales: {
      x: {
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: {
          color: '#6c757d',
          font: { size: 11 },
          maxRotation: 45,
          autoSkip: false,
        },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.06)' },
        ticks: {
          color: '#6c757d',
          font: { size: 12 },
          callback: (v: any) => `${v}°C`,
        },
        title: {
          display: true,
          text: 'Temperatura (°C)',
          color: '#6c757d',
          font: { size: 12 },
        },
      },
    },
  };

  // ── Render ────────────────────────────────────────────────
  const datosGrafico = datos ? construirDatosGrafico() : null;
  const confianza = datos?.confianza;
  const metricas = datos?.modelo_local.metricas_entrenamiento;

  return (
    <div style={styles.container}>
      {/* Encabezado */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.titulo}>Predicción de Temperatura</h3>
          {estacionNombre && (
            <span style={styles.subtitulo}>{estacionNombre}</span>
          )}
        </div>

        {/* Selector horizonte */}
        <div style={styles.controles}>
          <span style={styles.controlLabel}>Horizonte:</span>
          {([24, 48, 72] as Horizonte[]).map((h) => (
            <button
              key={h}
              style={{
                ...styles.btnHorizonte,
                ...(horizonte === h ? styles.btnHorizonteActivo : {}),
              }}
              onClick={() => setHorizonte(h)}
              disabled={cargando}
            >
              {h}h
            </button>
          ))}
          <button style={styles.btnRefresh} onClick={cargarPrediccion} disabled={cargando} title="Actualizar">
            {cargando ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

      {/* Badge de confianza */}
      {confianza && (
        <div style={styles.badgeRow}>
          <span
            style={{
              ...styles.badge,
              backgroundColor: BADGE_COLOR[confianza.nivel] + '22',
              borderColor: BADGE_COLOR[confianza.nivel],
              color: BADGE_COLOR[confianza.nivel],
            }}
          >
            {confianza.badge} Confianza {confianza.nivel}
            {confianza.mae_diferencia !== null && (
              <span style={styles.badgeDetalle}> · Δ {confianza.mae_diferencia}°C vs Open-Meteo</span>
            )}
          </span>
          {datos && (
            <span style={styles.metaInfo}>
              {datos.meta.lags_reales
                ? `✅ ${datos.meta.lags_usados} lecturas reales`
                : '⚠️ Lags aproximados'}
            </span>
          )}
        </div>
      )}

      {/* Descripción confianza */}
      {confianza && (
        <p style={styles.confianzaDesc}>{confianza.descripcion}</p>
      )}

      {/* Estado: cargando / error / gráfico */}
      {cargando && (
        <div style={styles.estadoCentro}>
          <div style={styles.spinner} />
          <p style={styles.estadoTexto}>Calculando predicción…</p>
        </div>
      )}

      {!cargando && error && (
        <div style={styles.errorBox}>
          <span style={styles.errorIcono}>⚠️</span>
          <div>
            <strong>No se pudo obtener la predicción</strong>
            <p style={styles.errorDetalle}>{error}</p>
            <p style={styles.errorSugerencia}>
              Verifica que el microservicio ML esté corriendo en el puerto 5001.
            </p>
          </div>
        </div>
      )}

      {!cargando && !error && datosGrafico && (
        <>
          {/* Gráfico */}
          <div style={styles.chartWrapper}>
            <Line data={datosGrafico as any} options={opcionesGrafico} />
          </div>

          {/* Temperatura predicha final */}
          <div style={styles.resumenRow}>
            <div style={styles.resumenCard}>
              <span style={styles.resumenLabel}>Temp. actual</span>
              <span style={styles.resumenValor}>
                {datos!.meta.inputs.temp_actual.toFixed(1)}°C
              </span>
            </div>
            {Object.entries(datos!.modelo_local.puntos_ancla).map(([key, val]) => (
              <div key={key} style={styles.resumenCard}>
                <span style={styles.resumenLabel}>+{key}</span>
                <span style={{ ...styles.resumenValor, color: '#0288D1' }}>
                  {(val as number).toFixed(1)}°C
                </span>
              </div>
            ))}
          </div>

          {/* Métricas del modelo */}
          {metricas && (
            <div style={styles.metricasRow}>
              <span style={styles.metricaItem}>
                MAE entrenamiento: <strong>{metricas.mae_celsius}°C</strong>
              </span>
              <span style={styles.metricaSep}>·</span>
              <span style={styles.metricaItem}>
                R²: <strong>{metricas.r2_score}</strong>
              </span>
              <span style={styles.metricaSep}>·</span>
              <span style={styles.metricaItem}>
                Nivel: <strong>{metricas.nivel}</strong>
              </span>
              {datos?.validacion_openmeteo.disponible && (
                <>
                  <span style={styles.metricaSep}>·</span>
                  <span style={{ ...styles.metricaItem, color: '#9E9E9E' }}>
                    ⬚ Open-Meteo disponible
                  </span>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Estilos ─────────────────────────────────────────────────
const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e9ecef',
    borderLeft: '4px solid #00BCD4',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap' as const,
    gap: '12px',
    marginBottom: '16px',
  },
  titulo: {
    color: '#2c3e50',
    fontSize: '1.3rem',
    fontWeight: '500' as const,
    margin: '0 0 4px 0',
  },
  subtitulo: {
    color: '#6c757d',
    fontSize: '0.85rem',
  },
  controles: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  controlLabel: {
    color: '#6c757d',
    fontSize: '0.85rem',
    marginRight: '4px',
  },
  btnHorizonte: {
    padding: '5px 14px',
    borderRadius: '20px',
    border: '1.5px solid #dee2e6',
    backgroundColor: 'white',
    color: '#495057',
    fontSize: '0.82rem',
    fontWeight: '500' as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnHorizonteActivo: {
    backgroundColor: '#00BCD4',
    borderColor: '#00BCD4',
    color: 'white',
  },
  btnRefresh: {
    padding: '5px 10px',
    borderRadius: '20px',
    border: '1.5px solid #dee2e6',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '0.9rem',
    marginLeft: '4px',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
    marginBottom: '6px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 12px',
    borderRadius: '20px',
    border: '1.5px solid',
    fontSize: '0.82rem',
    fontWeight: '600' as const,
  },
  badgeDetalle: {
    fontWeight: '400' as const,
    opacity: 0.85,
  },
  metaInfo: {
    color: '#6c757d',
    fontSize: '0.78rem',
  },
  confianzaDesc: {
    color: '#6c757d',
    fontSize: '0.8rem',
    margin: '0 0 16px 0',
    fontStyle: 'italic' as const,
  },
  estadoCentro: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    gap: '12px',
  },
  spinner: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid #e9ecef',
    borderTop: '3px solid #00BCD4',
    animation: 'spin 0.8s linear infinite',
  },
  estadoTexto: {
    color: '#6c757d',
    fontSize: '0.9rem',
    margin: 0,
  },
  errorBox: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '8px',
  },
  errorIcono: {
    fontSize: '1.4rem',
    flexShrink: 0,
  },
  errorDetalle: {
    margin: '4px 0 2px',
    color: '#856404',
    fontSize: '0.85rem',
  },
  errorSugerencia: {
    margin: 0,
    color: '#6c757d',
    fontSize: '0.8rem',
  },
  chartWrapper: {
    height: '300px',
    marginBottom: '16px',
    position: 'relative' as const,
  },
  resumenRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
    marginBottom: '12px',
  },
  resumenCard: {
    flex: '1 1 80px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: '10px 14px',
    textAlign: 'center' as const,
    border: '1px solid #e9ecef',
  },
  resumenLabel: {
    display: 'block',
    color: '#6c757d',
    fontSize: '0.72rem',
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.4px',
    marginBottom: '4px',
  },
  resumenValor: {
    display: 'block',
    fontSize: '1.3rem',
    fontWeight: '300' as const,
    color: '#2c3e50',
  },
  metricasRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #f0f0f0',
  },
  metricaItem: {
    color: '#6c757d',
    fontSize: '0.78rem',
  },
  metricaSep: {
    color: '#dee2e6',
    fontSize: '0.8rem',
  },
};

// Inyectar keyframe del spinner una sola vez
if (typeof document !== 'undefined' && !document.getElementById('prediccion-spin-style')) {
  const style = document.createElement('style');
  style.id = 'prediccion-spin-style';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

export default PrediccionChart;
