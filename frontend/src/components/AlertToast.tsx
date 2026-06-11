import React, { useEffect, useState } from 'react';
import { useAlerts } from '../contexts/AlertContext';
import { AlertaEvento, NivelAlerta } from '../services/api';

const AUTO_DISMISS_MS = 7000;

const NIVEL_COLORS: Record<NivelAlerta, { bg: string; border: string; icon: string }> = {
  info:        { bg: '#e3f2fd', border: '#1976d2', icon: 'ℹ️' },
  advertencia: { bg: '#fff8e1', border: '#f9a825', icon: '⚠️' },
  critico:     { bg: '#ffebee', border: '#c62828', icon: '🚨' },
};

const VARIABLE_LABELS: Record<string, string> = {
  temperatura: 'Temperatura',
  humedad: 'Humedad',
  presion_at: 'Presión',
  velocidad_viento: 'Viento',
  gas_co2: 'CO₂',
  gas_nh3: 'NH₃',
  gas_alcohol: 'Alcohol',
  gas_humo: 'Humo',
  gas_benceno: 'Benceno',
  gas_acetona: 'Acetona',
};

const VARIABLE_UNITS: Record<string, string> = {
  temperatura: '°C', humedad: '%', presion_at: 'hPa', velocidad_viento: 'm/s',
  gas_co2: 'ppm', gas_nh3: 'ppm', gas_alcohol: 'ppm',
  gas_humo: 'ppm', gas_benceno: 'ppm', gas_acetona: 'ppm',
};

const SingleToast: React.FC<{ alerta: AlertaEvento; onDismiss: () => void }> = ({ alerta, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade in
    const showTimer = setTimeout(() => setVisible(true), 50);
    // Auto-dismiss
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, AUTO_DISMISS_MS);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [onDismiss]);

  const colors = NIVEL_COLORS[alerta.nivel] || NIVEL_COLORS.advertencia;
  const label = alerta.variable_label || VARIABLE_LABELS[alerta.variable] || alerta.variable;
  const unit = alerta.variable_unit || VARIABLE_UNITS[alerta.variable] || '';

  return (
    <div
      style={{
        ...styles.toast,
        background: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(120%)',
      }}
    >
      <div style={styles.toastHeader}>
        <span style={styles.toastIcon}>{colors.icon}</span>
        <span style={styles.toastTitle}>{alerta.estacion_nombre}</span>
        <button
          style={styles.closeBtn}
          onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
          title="Cerrar"
        >
          ×
        </button>
      </div>
      <div style={styles.toastBody}>
        <strong>{label}</strong>
        {': '}
        <span style={{ color: colors.border, fontWeight: 700 }}>
          {alerta.valor_detectado} {unit}
        </span>
        <span style={styles.toastThreshold}>
          {' '}(umbral: {alerta.condicion} {alerta.umbral_configurado} {unit})
        </span>
      </div>
      <div style={{ ...styles.progressBar, background: colors.border }} />
    </div>
  );
};

const AlertToast: React.FC = () => {
  const { toastsNuevos, dismissToast } = useAlerts();
  // Mostrar máximo 3 toasts a la vez
  const visibles = toastsNuevos.slice(0, 3);

  if (visibles.length === 0) return null;

  return (
    <div style={styles.container}>
      {visibles.map((alerta) => (
        <SingleToast
          key={alerta.id}
          alerta={alerta}
          onDismiss={() => dismissToast(alerta.id)}
        />
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 99999,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    pointerEvents: 'none',
  },
  toast: {
    pointerEvents: 'auto',
    width: '320px',
    borderRadius: '8px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    padding: '12px 14px 8px',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  toastHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  toastIcon: { fontSize: '16px' },
  toastTitle: { fontWeight: 700, fontSize: '13px', flex: 1, color: '#1a1a1a' },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#666',
    lineHeight: 1,
    padding: '0 2px',
  },
  toastBody: { fontSize: '13px', color: '#333', lineHeight: 1.4 },
  toastThreshold: { fontSize: '11px', color: '#666' },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: '3px',
    width: '100%',
    opacity: 0.5,
    animation: `shrink ${AUTO_DISMISS_MS}ms linear forwards`,
  },
};

// Inyectar keyframe para la barra de progreso
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = `@keyframes shrink { from { width: 100%; } to { width: 0%; } }`;
  document.head.appendChild(styleEl);
}

export default AlertToast;
