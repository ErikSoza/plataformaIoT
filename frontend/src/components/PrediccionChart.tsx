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
import { prediccionService, PrediccionResponse, VariablePrediccion } from '../services/api';

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
  estacionId?: number;
  zonaId?: number;
  estacionNombre?: string;
}

type Horizonte = 24 | 48 | 72;

// ── Configuración visual por variable ─────────────────────────
interface VarDisplay {
  label: string;
  labelCorto: string;
  unidad: string;
  color: string;
  colorOM: string;
  colorBanda: string;
  inputsKey: keyof { temp_actual: number; humedad: number; presion: number; viento: number };
  formato: (v: number) => string;
  defaultMae: number;
}

const VARIABLE_DISPLAY: Record<VariablePrediccion, VarDisplay> = {
  temperatura: {
    label:      'Temperatura',
    labelCorto: 'Temp.',
    unidad:     '°C',
    color:      '#0288D1',
    colorOM:    '#9E9E9E',
    colorBanda: 'rgba(2, 136, 209, 0.10)',
    inputsKey:  'temp_actual',
    formato:    (v) => `${v.toFixed(1)}°C`,
    defaultMae: 1.8,
  },
  humedad: {
    label:      'Humedad Relativa',
    labelCorto: 'Humedad',
    unidad:     '%',
    color:      '#00897B',
    colorOM:    '#80CBC4',
    colorBanda: 'rgba(0, 137, 123, 0.10)',
    inputsKey:  'humedad',
    formato:    (v) => `${v.toFixed(0)}%`,
    defaultMae: 5.0,
  },
  presion: {
    label:      'Presión Atmosférica',
    labelCorto: 'Presión',
    unidad:     'hPa',
    color:      '#7B1FA2',
    colorOM:    '#CE93D8',
    colorBanda: 'rgba(123, 31, 162, 0.10)',
    inputsKey:  'presion',
    formato:    (v) => `${v.toFixed(1)} hPa`,
    defaultMae: 1.5,
  },
  viento: {
    label:      'Velocidad del Viento',
    labelCorto: 'Viento',
    unidad:     'km/h',
    color:      '#F57C00',
    colorOM:    '#FFCC80',
    colorBanda: 'rgba(245, 124, 0, 0.10)',
    inputsKey:  'viento',
    formato:    (v) => `${v.toFixed(1)} km/h`,
    defaultMae: 3.0,
  },
};

const BADGE_COLOR: Record<string, string> = {
  Alto:        '#28a745',
  Medio:       '#ffc107',
  Bajo:        '#dc3545',
  Desconocido: '#6c757d',
};

const VARIABLES_ORDEN: VariablePrediccion[] = ['temperatura', 'humedad', 'presion', 'viento'];

const PrediccionChart: React.FC<PrediccionChartProps> = ({ estacionId, zonaId, estacionNombre }) => {
  const [datos,     setDatos]     = useState<PrediccionResponse | null>(null);
  const [horizonte, setHorizonte] = useState<Horizonte>(72);
  const [variable,  setVariable]  = useState<VariablePrediccion>('temperatura');
  const [cargando,  setCargando]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const cargarPrediccion = useCallback(async () => {
    if (!estacionId && !zonaId) return;
    setCargando(true);
    setError(null);
    try {
      const resultado = zonaId
        ? await prediccionService.getByZona(zonaId, horizonte, variable)
        : await prediccionService.getByEstacion(estacionId!, horizonte, variable);
      setDatos(resultado);
    } catch (err: any) {
      setError(err.message || 'Error al cargar la predicción');
    } finally {
      setCargando(false);
    }
  }, [estacionId, zonaId, horizonte, variable]);

  useEffect(() => {
    cargarPrediccion();
  }, [cargarPrediccion]);

  // ── Construcción del gráfico ──────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const construirDatosGrafico = (): any => {
    if (!datos) return null;

    const varDisp   = VARIABLE_DISPLAY[variable];
    const predsLocal = datos.modelo_local.predicciones;
    const mae       = datos.modelo_local.metricas_entrenamiento?.mae_celsius ?? varDisp.defaultMae;

    // Etiquetas: mostrar cada N horas
    const paso = horizonte <= 24 ? 2 : horizonte <= 48 ? 4 : 6;
    const etiquetas = predsLocal.map((p, i) => {
      if (i === 0 || p.hora_offset % paso === 0) {
        const fecha = new Date(p.datetime);
        return `${fecha.getDate()}/${fecha.getMonth() + 1} ${String(fecha.getHours()).padStart(2, '0')}h`;
      }
      return '';
    });

    const valoresLocal = predsLocal.map((p) => p.valor ?? p.temperatura);
    const upper = valoresLocal.map((v) => parseFloat((v + mae).toFixed(2)));
    const lower = valoresLocal.map((v) => parseFloat((v - mae).toFixed(2)));

    // Open-Meteo alineado por hora_offset
    const omMap = new Map(
      datos.validacion_openmeteo.predicciones.map((p) => [p.hora_offset, p.valor ?? p.temperatura])
    );
    const valoresOM = predsLocal.map((p) => omMap.get(p.hora_offset) ?? null);

    return {
      labels: etiquetas,
      datasets: [
        // 1. Banda superior (invisible, referencia del fill)
        {
          label: '_upper',
          data: upper,
          borderColor: 'transparent',
          backgroundColor: varDisp.colorBanda,
          pointRadius: 0,
          fill: '+1',
          tension: 0.4,
        },
        // 2. Banda inferior (invisible)
        {
          label: '_lower',
          data: lower,
          borderColor: 'transparent',
          backgroundColor: varDisp.colorBanda,
          pointRadius: 0,
          fill: false,
          tension: 0.4,
        },
        // 3. Línea modelo local
        {
          label: `XGBoost — ${varDisp.label}`,
          data: valoresLocal,
          borderColor: varDisp.color,
          backgroundColor: varDisp.color,
          borderWidth: 2.5,
          pointRadius: (ctx: any) => (ctx.dataIndex % paso === 0 ? 4 : 0),
          pointHoverRadius: 6,
          tension: 0.4,
          fill: false,
        },
        // 4. Línea Open-Meteo (punteada)
        ...(datos.validacion_openmeteo.disponible
          ? [
              {
                label: 'Open-Meteo (referencia)',
                data: valoresOM,
                borderColor: varDisp.colorOM,
                backgroundColor: varDisp.colorOM,
                borderWidth: 1.8,
                pointRadius: 0,
                pointHoverRadius: 5,
                tension: 0.4,
                fill: false,
                segment: { borderDash: () => [6, 4] },
              },
            ]
          : []),
      ],
    };
  };

  const varDisp = VARIABLE_DISPLAY[variable];

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
            return ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(varDisp.unidad === '%' ? 0 : 1)} ${varDisp.unidad}`;
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
          callback: (v: any) => `${v} ${varDisp.unidad}`,
        },
        title: {
          display: true,
          text: `${varDisp.label} (${varDisp.unidad})`,
          color: '#6c757d',
          font: { size: 12 },
        },
      },
    },
  };

  // ── Render ────────────────────────────────────────────────
  const datosGrafico = datos ? construirDatosGrafico() : null;
  const confianza    = datos?.confianza;
  const metricas     = datos?.modelo_local.metricas_entrenamiento;

  // Valor actual de la variable seleccionada desde inputs del servidor
  const valorActual  = datos?.meta.inputs[varDisp.inputsKey] ?? null;

  return (
    <div style={{ ...styles.container, borderLeft: `4px solid ${varDisp.color}` }}>
      {/* ── Encabezado ─────────────────────────────────────── */}
      <div style={styles.header}>
        <div>
          <h3 style={styles.titulo}>Predicción Meteorológica</h3>
          {estacionNombre && <span style={styles.subtitulo}>{estacionNombre}</span>}
        </div>

        <div style={styles.controlesBloque}>
          {/* Selector de variable */}
          <div style={styles.controles}>
            <span style={styles.controlLabel}>Variable:</span>
            {VARIABLES_ORDEN.map((v) => {
              const cfg = VARIABLE_DISPLAY[v];
              const activo = variable === v;
              return (
                <button
                  key={v}
                  style={{
                    ...styles.btnHorizonte,
                    ...(activo ? { backgroundColor: cfg.color, borderColor: cfg.color, color: 'white' } : {}),
                  }}
                  onClick={() => setVariable(v)}
                  disabled={cargando}
                  title={cfg.label}
                >
                  {cfg.labelCorto}
                </button>
              );
            })}
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
            <button
              style={styles.btnRefresh}
              onClick={cargarPrediccion}
              disabled={cargando}
              title="Actualizar"
            >
              {cargando ? '⏳' : '🔄'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Badge de confianza ─────────────────────────────── */}
      {confianza && (
        <div style={styles.badgeRow}>
          <span
            style={{
              ...styles.badge,
              backgroundColor: BADGE_COLOR[confianza.nivel] + '22',
              borderColor:     BADGE_COLOR[confianza.nivel],
              color:           BADGE_COLOR[confianza.nivel],
            }}
          >
            {confianza.badge} Confianza {confianza.nivel}
            {confianza.mae_diferencia !== null && (
              <span style={styles.badgeDetalle}>
                {' · '}Δ {confianza.mae_diferencia} {varDisp.unidad} vs Open-Meteo
              </span>
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

      {confianza && (
        <p style={styles.confianzaDesc}>{confianza.descripcion}</p>
      )}

      {/* ── Estado: cargando / error / gráfico ─────────────── */}
      {cargando && (
        <div style={styles.estadoCentro}>
          <div style={{ ...styles.spinner, borderTop: `3px solid ${varDisp.color}` }} />
          <p style={styles.estadoTexto}>
            Calculando predicción de {varDisp.label.toLowerCase()}…
          </p>
        </div>
      )}

      {!cargando && error && (
        <div style={styles.errorBox}>
          <span style={styles.errorIcono}>⚠️</span>
          <div>
            <strong>No se pudo obtener la predicción</strong>
            <p style={styles.errorDetalle}>{error}</p>
            <p style={styles.errorSugerencia}>
              Verifica que el microservicio ML esté corriendo en el puerto 5001
              {variable !== 'temperatura' ? ' y que el modelo para esta variable esté entrenado.' : '.'}
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

          {/* Tarjetas de resumen */}
          <div style={styles.resumenRow}>
            {/* Valor actual */}
            <div
              className="resumen-card-animate"
              style={{ ...styles.resumenCard, animationDelay: '0.05s' }}
            >
              <span style={styles.resumenLabel}>{varDisp.labelCorto} actual</span>
              <span style={styles.resumenValor}>
                {valorActual !== null ? varDisp.formato(valorActual) : '—'}
              </span>
            </div>

            {/* Puntos ancla predichos */}
            {Object.entries(datos!.modelo_local.puntos_ancla).map(([key, val], i) => (
              <div
                key={key}
                className="resumen-card-animate"
                style={{ ...styles.resumenCard, animationDelay: `${(i + 1) * 0.1 + 0.05}s` }}
              >
                <span style={styles.resumenLabel}>+{key}</span>
                <span style={{ ...styles.resumenValor, color: varDisp.color }}>
                  {varDisp.formato(val as number)}
                </span>
              </div>
            ))}
          </div>

          {/* Métricas del modelo */}
          {metricas && (
            <div style={styles.metricasRow}>
              <span style={styles.metricaItem}>
                MAE: <strong>{metricas.mae_celsius} {metricas.unidad ?? varDisp.unidad}</strong>
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
                  <span style={{ ...styles.metricaItem, color: varDisp.colorOM }}>
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
    borderLeft: '4px solid #00BCD4',  // sobreescrito dinámicamente
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
  controlesBloque: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    alignItems: 'flex-end',
  },
  controles: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  controlLabel: {
    color: '#6c757d',
    fontSize: '0.82rem',
    marginRight: '2px',
  },
  btnHorizonte: {
    padding: '4px 12px',
    borderRadius: '20px',
    border: '1.5px solid #dee2e6',
    backgroundColor: 'white',
    color: '#495057',
    fontSize: '0.80rem',
    fontWeight: '500' as const,
    cursor: 'pointer',
    transition: 'all 0.18s',
  },
  btnHorizonteActivo: {
    backgroundColor: '#00BCD4',
    borderColor: '#00BCD4',
    color: 'white',
  },
  btnRefresh: {
    padding: '4px 10px',
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
    borderTop: '3px solid #00BCD4',  // sobreescrito dinámicamente
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
    fontSize: '1.25rem',
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
