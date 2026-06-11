import React, { useState, useRef, useEffect } from 'react';
import { useAlerts } from '../contexts/AlertContext';
import { useNavigation } from '../contexts/NavigationContext';
import { AlertaEvento, NivelAlerta } from '../services/api';

const NIVEL_COLORS: Record<NivelAlerta, string> = {
  info: '#1976d2',
  advertencia: '#f9a825',
  critico: '#c62828',
};

const NIVEL_BG: Record<NivelAlerta, string> = {
  info: '#e3f2fd',
  advertencia: '#fff8e1',
  critico: '#ffebee',
};

const NIVEL_ICON: Record<NivelAlerta, string> = {
  info: 'ℹ️',
  advertencia: '⚠️',
  critico: '🚨',
};

const VARIABLE_LABELS: Record<string, string> = {
  temperatura: 'Temperatura', humedad: 'Humedad', presion_at: 'Presión',
  velocidad_viento: 'Viento', gas_co2: 'CO₂', gas_nh3: 'NH₃',
  gas_alcohol: 'Alcohol', gas_humo: 'Humo', gas_benceno: 'Benceno', gas_acetona: 'Acetona',
};
const VARIABLE_UNITS: Record<string, string> = {
  temperatura: '°C', humedad: '%', presion_at: 'hPa', velocidad_viento: 'm/s',
  gas_co2: 'ppm', gas_nh3: 'ppm', gas_alcohol: 'ppm', gas_humo: 'ppm', gas_benceno: 'ppm', gas_acetona: 'ppm',
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const AlertBell: React.FC = () => {
  const { alertas, noLeidas, marcarLeida, marcarTodasLeidas, recargar } = useAlerts();
  const { navigateToTab } = useNavigation();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'noLeidas' | 'todas'>('noLeidas');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const lista: AlertaEvento[] = activeTab === 'noLeidas'
    ? alertas.filter((a) => a.leida === 0)
    : alertas.slice(0, 30);

  const handleMarcarLeida = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await marcarLeida(id);
  };

  const handleMarcarTodas = async () => {
    await marcarTodasLeidas();
    await recargar();
  };

  return (
    <>
      <div ref={dropdownRef} style={styles.wrapper}>
        {/* Botón campana */}
        <button
          style={styles.bellBtn}
          onClick={() => setOpen((v) => !v)}
          title="Alertas"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={styles.bellIcon}>🔔</span>
          {noLeidas > 0 && (
            <span style={styles.badge}>{noLeidas > 99 ? '99+' : noLeidas}</span>
          )}
        </button>

        {/* Panel desplegable */}
        {open && (
          <div style={styles.dropdown}>
            {/* Cabecera */}
            <div style={styles.dropHead}>
              <span style={styles.dropTitle}>Alertas</span>
              <div style={styles.dropActions}>
                {noLeidas > 0 && (
                  <button style={styles.textBtn} onClick={handleMarcarTodas}>
                    Marcar todas leídas
                  </button>
                )}
                <button
                  style={styles.configBtn}
                  onClick={() => { setOpen(false); navigateToTab('settings', 'alertas'); }}
                >
                  ⚙️ Configurar
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabs}>
              <button
                style={activeTab === 'noLeidas' ? styles.tabActive : styles.tab}
                onClick={() => setActiveTab('noLeidas')}
              >
                No leídas {noLeidas > 0 && <span style={styles.tabBadge}>{noLeidas}</span>}
              </button>
              <button
                style={activeTab === 'todas' ? styles.tabActive : styles.tab}
                onClick={() => setActiveTab('todas')}
              >
                Historial
              </button>
            </div>

            {/* Lista */}
            <div style={styles.list}>
              {lista.length === 0 ? (
                <div style={styles.empty}>
                  {activeTab === 'noLeidas' ? '✅ Sin alertas pendientes' : '📭 Sin alertas registradas'}
                </div>
              ) : (
                lista.map((alerta) => {
                  const label = alerta.variable_label || VARIABLE_LABELS[alerta.variable] || alerta.variable;
                  const unit = alerta.variable_unit || VARIABLE_UNITS[alerta.variable] || '';
                  const color = NIVEL_COLORS[alerta.nivel] || '#666';
                  const bg = NIVEL_BG[alerta.nivel] || '#f5f5f5';
                  const icon = NIVEL_ICON[alerta.nivel] || '🔔';
                  return (
                    <div
                      key={alerta.id}
                      style={{
                        ...styles.alertItem,
                        background: alerta.leida ? '#fafafa' : bg,
                        opacity: alerta.leida ? 0.7 : 1,
                      }}
                    >
                      <div style={styles.alertRow}>
                        <span style={{ fontSize: '16px' }}>{icon}</span>
                        <div style={styles.alertContent}>
                          <div style={styles.alertStation}>{alerta.estacion_nombre}</div>
                          <div style={styles.alertDetail}>
                            <strong>{label}:</strong>{' '}
                            <span style={{ color, fontWeight: 700 }}>
                              {alerta.valor_detectado} {unit}
                            </span>
                            <span style={styles.alertThreshold}>
                              {' '}({alerta.condicion} {alerta.umbral_configurado} {unit})
                            </span>
                          </div>
                          <div style={styles.alertTime}>{formatTime(alerta.created_at)}</div>
                        </div>
                        {alerta.leida === 0 && (
                          <button
                            style={styles.readBtn}
                            onClick={(e) => handleMarcarLeida(e, alerta.id)}
                            title="Marcar como leída"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: { position: 'relative' },

  bellBtn: {
    position: 'relative',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 8px',
    borderRadius: '8px',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center',
  },
  bellIcon: { fontSize: '20px', lineHeight: 1 },
  badge: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    background: '#e53935',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 700,
    borderRadius: '10px',
    padding: '1px 5px',
    minWidth: '16px',
    textAlign: 'center',
    lineHeight: '14px',
  },

  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: '360px',
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    zIndex: 99998,
    overflow: 'hidden',
    border: '1px solid #e0e0e0',
  },

  dropHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px 10px',
    borderBottom: '1px solid #f0f0f0',
  },
  dropTitle: { fontWeight: 700, fontSize: '15px', color: '#1a1a1a' },
  dropActions: { display: 'flex', gap: '8px', alignItems: 'center' },

  textBtn: {
    background: 'none',
    border: 'none',
    color: '#00BCD4',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '4px 0',
    fontWeight: 600,
  },
  configBtn: {
    background: '#f5f5f5',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '5px 10px',
    fontWeight: 600,
    color: '#333',
    transition: 'background 0.2s',
  },

  tabs: {
    display: 'flex',
    borderBottom: '1px solid #f0f0f0',
  },
  tab: {
    flex: 1,
    background: 'none',
    border: 'none',
    padding: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#888',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  tabActive: {
    flex: 1,
    background: 'none',
    border: 'none',
    borderBottom: '2px solid #00BCD4',
    padding: '10px',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#00BCD4',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  tabBadge: {
    background: '#e53935',
    color: '#fff',
    borderRadius: '10px',
    padding: '0 6px',
    fontSize: '11px',
    fontWeight: 700,
  },

  list: {
    maxHeight: '320px',
    overflowY: 'auto',
  },
  empty: {
    padding: '32px 16px',
    textAlign: 'center',
    color: '#888',
    fontSize: '14px',
  },

  alertItem: {
    padding: '10px 14px',
    borderBottom: '1px solid #f5f5f5',
    transition: 'background 0.15s',
  },
  alertRow: { display: 'flex', gap: '10px', alignItems: 'flex-start' },
  alertContent: { flex: 1, minWidth: 0 },
  alertStation: { fontWeight: 700, fontSize: '13px', color: '#1a1a1a', marginBottom: '2px' },
  alertDetail: { fontSize: '12px', color: '#444', lineHeight: 1.4 },
  alertThreshold: { fontSize: '11px', color: '#999' },
  alertTime: { fontSize: '11px', color: '#aaa', marginTop: '3px' },
  readBtn: {
    background: '#e8f5e9',
    border: 'none',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    color: '#388e3c',
    fontWeight: 700,
    fontSize: '14px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default AlertBell;
