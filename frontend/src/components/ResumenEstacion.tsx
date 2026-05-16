import React from 'react';
import { DeviceData } from './layout';

// ─── Configuración de gases ────────────────────────────────────────────────────
interface GasConfig {
  key: keyof DeviceData;
  label: string;
  unit: string;
  low: number;
  mid: number;
}

const GAS_FIELDS: GasConfig[] = [
  { key: 'gas_co2',     label: 'CO₂',     unit: 'ppm', low: 800,  mid: 1200 },
  { key: 'gas_nh3',     label: 'NH₃',     unit: 'ppm', low: 25,   mid: 50   },
  { key: 'gas_alcohol', label: 'Alcohol', unit: 'ppm', low: 10,   mid: 50   },
  { key: 'gas_humo',    label: 'Humo',    unit: 'ppm', low: 50,   mid: 150  },
  { key: 'gas_benceno', label: 'Benceno', unit: 'ppm', low: 5,    mid: 25   },
  { key: 'gas_acetona', label: 'Acetona', unit: 'ppm', low: 50,   mid: 200  },
];

function semColor(val: number | null | undefined, low: number, mid: number): string {
  if (val == null) return '#bdbdbd';
  return val < low ? '#2e7d32' : val < mid ? '#e65100' : '#b71c1c';
}

function semLabel(val: number | null | undefined, low: number, mid: number): string {
  if (val == null) return 'Sin datos';
  return val < low ? 'Bueno' : val < mid ? 'Moderado' : 'Elevado';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatFecha(raw: string | undefined): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// ─── Componente principal ──────────────────────────────────────────────────────
interface ResumenEstacionProps {
  device: DeviceData;
  esDefecto?: boolean;
}

const ResumenEstacion: React.FC<ResumenEstacionProps> = ({ device, esDefecto = false }) => {
  const tieneGases = GAS_FIELDS.some(f => device[f.key] != null);

  const meteo = [
    { icon: '🌡️', label: 'Temperatura', value: device.temperature != null ? `${device.temperature.toFixed(1)} °C` : '—', color: '#e53935' },
    { icon: '💧', label: 'Humedad',      value: device.humidity    != null ? `${device.humidity.toFixed(0)} %`    : '—', color: '#1e88e5' },
    { icon: '🔵', label: 'Presión',      value: device.pressure    != null ? `${device.pressure.toFixed(1)} hPa`  : '—', color: '#6d4c41' },
    { icon: '💨', label: 'Viento',       value: device.wind        != null ? `${device.wind.toFixed(1)} m/s`      : '—', color: '#00897b' },
  ];

  return (
    <div style={rs.card}>
      {/* Cabecera */}
      <div style={rs.header}>
        <span style={rs.headerIcon}>📡</span>
        <div>
          <h3 style={rs.headerTitle}>{device.name}</h3>
          <span style={rs.headerSub}>Condiciones Actuales{esDefecto ? ' — Estación por defecto' : ''}</span>
        </div>
        <div style={rs.headerRight}>
          <span style={{ ...rs.statusDot, background: device.status === 'Activo' ? '#43a047' : '#e53935' }} />
          <span style={rs.statusText}>{device.status}</span>
          <span style={rs.updateText}>Últ. lectura: {formatFecha(device.lastUpdate)}</span>
        </div>
      </div>

      {/* Métricas meteorológicas */}
      <div style={rs.meteoGrid}>
        {meteo.map(m => (
          <div key={m.label} style={rs.meteoCard}>
            <span style={rs.meteoIcon}>{m.icon}</span>
            <div style={{ ...rs.meteoValue, color: m.color }}>{m.value}</div>
            <div style={rs.meteoLabel}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Calidad del aire */}
      <div style={rs.gasSection}>
        <div style={rs.gasSectionTitle}>
          <span>🌬️</span>
          <span>Calidad del Aire — MQ135</span>
        </div>
        {!tieneGases ? (
          <div style={rs.sinDatos}>
            Sin datos de gases para esta estación — las lecturas históricas no incluyen sensor MQ135
          </div>
        ) : (
          <div style={rs.gasGrid}>
            {GAS_FIELDS.map(({ key, label, unit, low, mid }) => {
              const val = device[key] as number | null | undefined;
              const color = semColor(val, low, mid);
              return (
                <div key={key} style={{ ...rs.gasCard, borderTopColor: color }}>
                  <div style={rs.gasName}>{label}</div>
                  <div style={{ ...rs.gasVal, color }}>{val != null ? val.toFixed(1) : '—'}</div>
                  {val != null && <div style={rs.gasUnit}>{unit}</div>}
                  <div style={{ ...rs.gasBadge, background: color }}>{semLabel(val, low, mid)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const rs: Record<string, React.CSSProperties> = {
  card: { backgroundColor: '#fff', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e9ecef', borderLeft: '4px solid #00BCD4' },
  header: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' },
  headerIcon: { fontSize: '1.6rem' },
  headerTitle: { margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#2c3e50' },
  headerSub: { fontSize: '0.83rem', color: '#607d8b' },
  headerRight: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  statusDot: { width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block' },
  statusText: { fontSize: '0.82rem', fontWeight: 600, color: '#546e7a' },
  updateText: { fontSize: '0.78rem', color: '#90a4ae', marginLeft: '6px' },
  meteoGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' },
  meteoCard: { background: '#f8f9fa', borderRadius: '10px', padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center' },
  meteoIcon: { fontSize: '1.4rem' },
  meteoValue: { fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.1 },
  meteoLabel: { fontSize: '0.72rem', color: '#90a4ae', textTransform: 'uppercase', letterSpacing: '0.04em' },
  gasSection: { borderTop: '1px solid #eceff1', paddingTop: '16px' },
  gasSectionTitle: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#546e7a', marginBottom: '12px' },
  sinDatos: { color: '#bdbdbd', fontSize: '0.88rem', textAlign: 'center', padding: '10px 0' },
  gasGrid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' },
  gasCard: { borderTop: '3px solid #bdbdbd', borderRadius: '8px', padding: '10px 8px', background: '#f8f9fa', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', textAlign: 'center' },
  gasName: { fontSize: '0.72rem', fontWeight: 600, color: '#546e7a', textTransform: 'uppercase', letterSpacing: '0.04em' },
  gasVal: { fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.1 },
  gasUnit: { fontSize: '0.68rem', color: '#b0bec5' },
  gasBadge: { marginTop: '3px', padding: '2px 7px', borderRadius: '10px', fontSize: '0.66rem', fontWeight: 600, color: '#fff' },
};

export default ResumenEstacion;
