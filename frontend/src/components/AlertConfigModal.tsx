import React, { useState, useEffect } from 'react';
import { alertaService, stationService, ReglaAlerta, VariableAlerta, CondicionAlerta, NivelAlerta } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onClose: () => void;
}

const VARIABLES: { value: VariableAlerta; label: string; unit: string }[] = [
  { value: 'temperatura',      label: 'Temperatura',       unit: '°C'  },
  { value: 'humedad',          label: 'Humedad',           unit: '%'   },
  { value: 'presion_at',       label: 'Presión Atm.',      unit: 'hPa' },
  { value: 'velocidad_viento', label: 'Velocidad Viento',  unit: 'm/s' },
  { value: 'gas_co2',          label: 'CO₂',               unit: 'ppm' },
  { value: 'gas_nh3',          label: 'NH₃',               unit: 'ppm' },
  { value: 'gas_alcohol',      label: 'Alcohol',           unit: 'ppm' },
  { value: 'gas_humo',         label: 'Humo',              unit: 'ppm' },
  { value: 'gas_benceno',      label: 'Benceno',           unit: 'ppm' },
  { value: 'gas_acetona',      label: 'Acetona',           unit: 'ppm' },
];

const CONDICIONES: { value: CondicionAlerta; label: string }[] = [
  { value: '>',  label: 'Mayor que (>)'          },
  { value: '<',  label: 'Menor que (<)'          },
  { value: '>=', label: 'Mayor o igual que (>=)' },
  { value: '<=', label: 'Menor o igual que (<=)' },
];

const NIVELES: { value: NivelAlerta; label: string; color: string }[] = [
  { value: 'info',        label: 'Informativo', color: '#1976d2' },
  { value: 'advertencia', label: 'Advertencia', color: '#f9a825' },
  { value: 'critico',     label: 'Crítico',     color: '#c62828' },
];

const NIVEL_ICONS: Record<NivelAlerta, string> = {
  info: 'ℹ️', advertencia: '⚠️', critico: '🚨',
};

const initialForm = {
  id_estacion: 0,
  variable: 'temperatura' as VariableAlerta,
  condicion: '>' as CondicionAlerta,
  umbral: '',
  nivel: 'advertencia' as NivelAlerta,
  nombre: '',
};

const AlertConfigModal: React.FC<Props> = ({ onClose }) => {
  const { user } = useAuth();
  const [reglas, setReglas] = useState<ReglaAlerta[]>([]);
  const [estaciones, setEstaciones] = useState<{ id: number; nombre: string }[]>([]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [reglasData, estData] = await Promise.all([
          alertaService.getReglas(),
          stationService.getAll(),
        ]);
        setReglas(reglasData);
        setEstaciones(estData);
        if (estData.length > 0) {
          setForm((f) => ({ ...f, id_estacion: estData[0].id }));
        }
      } catch {
        setError('Error al cargar datos');
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  const selectedVar = VARIABLES.find((v) => v.value === form.variable);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.id_estacion) { setError('Selecciona una estación'); return; }
    if (!form.umbral || isNaN(Number(form.umbral))) { setError('El umbral debe ser un número válido'); return; }
    setSaving(true);
    try {
      await alertaService.createRegla({
        id_estacion: form.id_estacion,
        variable: form.variable,
        condicion: form.condicion,
        umbral: Number(form.umbral),
        nivel: form.nivel,
        nombre: form.nombre || undefined,
      });
      const updated = await alertaService.getReglas();
      setReglas(updated);
      setForm((f) => ({ ...initialForm, id_estacion: f.id_estacion }));
    } catch {
      setError('Error al guardar la regla');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar esta regla?')) return;
    try {
      await alertaService.deleteRegla(id);
      setReglas((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError('Error al eliminar');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await alertaService.toggleRegla(id);
      setReglas((prev) =>
        prev.map((r) => (r.id === id ? { ...r, activa: r.activa ? 0 : 1 } : r))
      );
    } catch {
      setError('Error al actualizar');
    }
  };

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.modalHead}>
          <h2 style={styles.modalTitle}>🔔 Configurar Alertas</h2>
          <button style={styles.closeBtn} onClick={onClose} title="Cerrar">×</button>
        </div>

        <div style={styles.body}>
          {/* Formulario nueva regla */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Nueva regla de umbral</h3>
            <form onSubmit={handleSave} style={styles.form}>
              {/* Estación */}
              <div style={styles.field}>
                <label style={styles.label}>Estación</label>
                <select
                  style={styles.select}
                  value={form.id_estacion}
                  onChange={(e) => setForm((f) => ({ ...f, id_estacion: Number(e.target.value) }))}
                  disabled={loadingData}
                >
                  {estaciones.map((est) => (
                    <option key={est.id} value={est.id}>{est.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Variable */}
              <div style={styles.field}>
                <label style={styles.label}>Variable</label>
                <select
                  style={styles.select}
                  value={form.variable}
                  onChange={(e) => setForm((f) => ({ ...f, variable: e.target.value as VariableAlerta }))}
                >
                  {VARIABLES.map((v) => (
                    <option key={v.value} value={v.value}>{v.label} ({v.unit})</option>
                  ))}
                </select>
              </div>

              {/* Condición + Umbral */}
              <div style={styles.row}>
                <div style={{ ...styles.field, flex: 1 }}>
                  <label style={styles.label}>Condición</label>
                  <select
                    style={styles.select}
                    value={form.condicion}
                    onChange={(e) => setForm((f) => ({ ...f, condicion: e.target.value as CondicionAlerta }))}
                  >
                    {CONDICIONES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ ...styles.field, flex: 1 }}>
                  <label style={styles.label}>Umbral ({selectedVar?.unit})</label>
                  <input
                    style={styles.input}
                    type="number"
                    step="any"
                    placeholder={`ej: ${form.variable === 'temperatura' ? '35' : form.variable === 'humedad' ? '80' : '1000'}`}
                    value={form.umbral}
                    onChange={(e) => setForm((f) => ({ ...f, umbral: e.target.value }))}
                  />
                </div>
              </div>

              {/* Nivel */}
              <div style={styles.field}>
                <label style={styles.label}>Nivel de severidad</label>
                <div style={styles.nivelRow}>
                  {NIVELES.map((n) => (
                    <button
                      key={n.value}
                      type="button"
                      style={{
                        ...styles.nivelBtn,
                        borderColor: form.nivel === n.value ? n.color : '#e0e0e0',
                        background: form.nivel === n.value ? n.color + '18' : '#fafafa',
                        color: form.nivel === n.value ? n.color : '#555',
                        fontWeight: form.nivel === n.value ? 700 : 400,
                      }}
                      onClick={() => setForm((f) => ({ ...f, nivel: n.value }))}
                    >
                      {NIVEL_ICONS[n.value]} {n.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre opcional */}
              <div style={styles.field}>
                <label style={styles.label}>Nombre descriptivo (opcional)</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="ej: Temperatura alta verano"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  maxLength={100}
                />
              </div>

              {error && <div style={styles.errorMsg}>{error}</div>}

              <button type="submit" style={styles.saveBtn} disabled={saving}>
                {saving ? 'Guardando…' : '+ Agregar regla'}
              </button>
            </form>
          </div>

          {/* Lista de reglas existentes */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Reglas configuradas ({reglas.length})</h3>
            {loadingData ? (
              <div style={styles.emptyList}>Cargando…</div>
            ) : reglas.length === 0 ? (
              <div style={styles.emptyList}>No hay reglas configuradas aún.</div>
            ) : (
              <div style={styles.reglasList}>
                {reglas.map((regla) => {
                  const varInfo = VARIABLES.find((v) => v.value === regla.variable);
                  const nivelInfo = NIVELES.find((n) => n.value === regla.nivel);
                  return (
                    <div key={regla.id} style={{ ...styles.reglaItem, opacity: regla.activa ? 1 : 0.55 }}>
                      <div style={styles.reglaMain}>
                        <span style={{ fontSize: '16px' }}>{NIVEL_ICONS[regla.nivel]}</span>
                        <div style={styles.reglaInfo}>
                          <div style={styles.reglaTitle}>
                            {regla.nombre || `${regla.estacion_nombre} — ${varInfo?.label}`}
                          </div>
                          <div style={styles.reglaSub}>
                            <span style={styles.reglaTag}>{regla.estacion_nombre}</span>
                            <span style={{ color: '#555' }}>
                              {varInfo?.label} {regla.condicion} <strong>{regla.umbral} {varInfo?.unit}</strong>
                            </span>
                            <span style={{ ...styles.reglaTag, background: nivelInfo?.color + '20', color: nivelInfo?.color }}>
                              {nivelInfo?.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={styles.reglaBtns}>
                        <button
                          style={{ ...styles.iconBtn, background: regla.activa ? '#e8f5e9' : '#f5f5f5' }}
                          onClick={() => handleToggle(regla.id)}
                          title={regla.activa ? 'Desactivar' : 'Activar'}
                        >
                          {regla.activa ? '✓' : '○'}
                        </button>
                        <button
                          style={{ ...styles.iconBtn, background: '#ffebee', color: '#c62828' }}
                          onClick={() => handleDelete(regla.id)}
                          title="Eliminar regla"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 100000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  modal: {
    background: '#fff',
    borderRadius: '14px',
    boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
    width: '100%',
    maxWidth: '620px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  modalHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 20px 14px',
    borderBottom: '2px solid #00BCD4',
  },
  modalTitle: { margin: 0, fontSize: '18px', color: '#1a1a1a', fontWeight: 700 },
  closeBtn: {
    background: 'none', border: 'none', fontSize: '24px',
    cursor: 'pointer', color: '#666', lineHeight: 1, padding: '0 4px',
  },
  body: { overflowY: 'auto', padding: '0' },
  section: { padding: '18px 20px', borderBottom: '1px solid #f0f0f0' },
  sectionTitle: { margin: '0 0 14px', fontSize: '14px', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.5px' },

  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px' },
  row: { display: 'flex', gap: '12px' },
  label: { fontSize: '12px', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.4px' },
  select: {
    padding: '9px 12px', borderRadius: '8px',
    border: '1px solid #ddd', fontSize: '14px',
    background: '#fafafa', outline: 'none',
  },
  input: {
    padding: '9px 12px', borderRadius: '8px',
    border: '1px solid #ddd', fontSize: '14px',
    background: '#fafafa', outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  nivelRow: { display: 'flex', gap: '8px' },
  nivelBtn: {
    flex: 1, padding: '8px 4px', borderRadius: '8px',
    border: '2px solid', cursor: 'pointer',
    fontSize: '13px', transition: 'all 0.15s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
  },
  errorMsg: {
    background: '#ffebee', color: '#c62828',
    padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
  },
  saveBtn: {
    padding: '11px', background: '#00BCD4', color: '#fff',
    border: 'none', borderRadius: '8px', fontWeight: 700,
    fontSize: '14px', cursor: 'pointer',
    transition: 'background 0.2s',
  },

  emptyList: { color: '#aaa', fontSize: '14px', padding: '12px 0' },
  reglasList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  reglaItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: '#fafafa', border: '1px solid #eee', borderRadius: '8px',
    padding: '10px 12px', transition: 'opacity 0.2s',
  },
  reglaMain: { display: 'flex', gap: '10px', alignItems: 'flex-start', flex: 1, minWidth: 0 },
  reglaInfo: { flex: 1, minWidth: 0 },
  reglaTitle: { fontWeight: 600, fontSize: '13px', color: '#1a1a1a', marginBottom: '4px' },
  reglaSub: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', fontSize: '12px' },
  reglaTag: {
    background: '#f0f0f0', color: '#555',
    borderRadius: '4px', padding: '1px 6px', fontSize: '11px',
  },
  reglaBtns: { display: 'flex', gap: '6px', flexShrink: 0 },
  iconBtn: {
    border: 'none', borderRadius: '6px', cursor: 'pointer',
    width: '28px', height: '28px', fontSize: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'filter 0.15s',
  },
};

export default AlertConfigModal;
