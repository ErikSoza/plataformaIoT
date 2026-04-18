import React, { useState, useEffect, useCallback } from 'react';
import { zonaService, stationService, ZonaClima } from '../services/api';
import { Estacion } from '../types';

const ZonasClimaAdmin: React.FC = () => {
  const [zonas, setZonas] = useState<ZonaClima[]>([]);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal nueva/editar zona
  const [modal, setModal] = useState<{ open: boolean; mode: 'crear' | 'editar'; zona?: ZonaClima }>({ open: false, mode: 'crear' });
  const [formNombre, setFormNombre] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Añadir estación
  const [addingToZona, setAddingToZona] = useState<number | null>(null);
  const [stationToAdd, setStationToAdd] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [z, e] = await Promise.all([zonaService.getAll(), stationService.getAll()]);
      setZonas(z);
      setEstaciones(e);
    } catch {
      setError('Error al cargar datos. Verifica que el servidor esté activo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const openCrear = () => {
    setFormNombre('');
    setFormDesc('');
    setModal({ open: true, mode: 'crear' });
  };

  const openEditar = (zona: ZonaClima) => {
    setFormNombre(zona.nombre);
    setFormDesc(zona.descripcion || '');
    setModal({ open: true, mode: 'editar', zona });
  };

  const closeModal = () => setModal({ open: false, mode: 'crear' });

  const handleSave = async () => {
    if (!formNombre.trim()) return;
    setFormSaving(true);
    try {
      if (modal.mode === 'crear') {
        await zonaService.create(formNombre.trim(), formDesc.trim() || undefined);
        flash('Zona creada correctamente');
      } else if (modal.zona) {
        await zonaService.update(modal.zona.id, formNombre.trim(), formDesc.trim() || undefined);
        flash('Zona actualizada correctamente');
      }
      closeModal();
      await load();
    } catch {
      setError('Error al guardar la zona');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (zona: ZonaClima) => {
    if (!window.confirm(`¿Eliminar la zona "${zona.nombre}"? Se desasignarán todas sus estaciones.`)) return;
    try {
      await zonaService.delete(zona.id);
      flash('Zona eliminada');
      await load();
    } catch {
      setError('Error al eliminar la zona');
    }
  };

  const handleAddEstacion = async (zonaId: number) => {
    if (!stationToAdd) return;
    try {
      await zonaService.addEstacion(zonaId, Number(stationToAdd));
      setStationToAdd('');
      setAddingToZona(null);
      flash('Estación agregada a la zona');
      await load();
    } catch {
      setError('Error al agregar la estación');
    }
  };

  const handleRemoveEstacion = async (zonaId: number, estacionId: number, estacionNombre: string) => {
    if (!window.confirm(`¿Quitar "${estacionNombre}" de esta zona?`)) return;
    try {
      await zonaService.removeEstacion(zonaId, estacionId);
      flash('Estación removida de la zona');
      await load();
    } catch {
      setError('Error al remover la estación');
    }
  };

  const estacionesDisponibles = (zona: ZonaClima) => {
    const asignadasIds = new Set(zona.estaciones.map(e => e.id));
    return estaciones.filter(e => !asignadasIds.has(e.id));
  };

  return (
    <div style={s.page}>
      {/* Encabezado */}
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Zonas de Clima</h2>
          <p style={s.subtitulo}>
            Define agrupaciones de estaciones para calcular predicciones meteorológicas regionales promediadas.
          </p>
        </div>
        <button style={s.btnPrimary} onClick={openCrear}>+ Nueva zona</button>
      </div>

      {/* Mensajes */}
      {successMsg && <div style={s.alertSuccess}>{successMsg}</div>}
      {error && (
        <div style={s.alertError}>
          {error}
          <button style={s.btnLink} onClick={() => setError(null)}>Cerrar</button>
        </div>
      )}

      {/* Cargando */}
      {loading && <div style={s.stateBox}>Cargando zonas…</div>}

      {/* Lista de zonas */}
      {!loading && zonas.length === 0 && (
        <div style={s.emptyState}>
          <p style={s.emptyIcon}>🗺️</p>
          <p style={s.emptyText}>No hay zonas de clima configuradas.</p>
          <p style={s.emptyHint}>Crea una zona y asígnale estaciones para generar predicciones regionales.</p>
          <button style={s.btnPrimary} onClick={openCrear}>Crear primera zona</button>
        </div>
      )}

      {!loading && zonas.map(zona => (
        <div key={zona.id} style={s.zonaCard}>
          {/* Cabecera zona */}
          <div style={s.zonaHeader}>
            <div>
              <h3 style={s.zonaNombre}>{zona.nombre}</h3>
              {zona.descripcion && <p style={s.zonaDesc}>{zona.descripcion}</p>}
              <span style={s.zonaMeta}>{zona.total_estaciones} estación{zona.total_estaciones !== 1 ? 'es' : ''} asignada{zona.total_estaciones !== 1 ? 's' : ''}</span>
            </div>
            <div style={s.zonaActions}>
              <button style={s.btnSecondary} onClick={() => openEditar(zona)}>Editar</button>
              <button style={s.btnDanger} onClick={() => handleDelete(zona)}>Eliminar</button>
            </div>
          </div>

          {/* Estaciones asignadas */}
          <div style={s.estacionesGrid}>
            {zona.estaciones.map(e => (
              <div key={e.id} style={s.estacionChip}>
                <div style={s.chipDot} />
                <div style={s.chipInfo}>
                  <span style={s.chipNombre}>{e.nombre}</span>
                  {e.ubicacion && <span style={s.chipUbicacion}>{e.ubicacion}</span>}
                </div>
                <button
                  style={s.chipRemove}
                  title="Quitar de esta zona"
                  onClick={() => handleRemoveEstacion(zona.id, e.id, e.nombre)}
                >
                  ×
                </button>
              </div>
            ))}

            {/* Agregar estación */}
            {addingToZona === zona.id ? (
              <div style={s.addEstacionRow}>
                <select
                  style={s.select}
                  value={stationToAdd}
                  onChange={e => setStationToAdd(e.target.value)}
                  autoFocus
                >
                  <option value="">Seleccionar estación…</option>
                  {estacionesDisponibles(zona).map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}{e.ubicacion ? ` — ${e.ubicacion}` : ''}</option>
                  ))}
                </select>
                <button style={s.btnPrimary} onClick={() => handleAddEstacion(zona.id)} disabled={!stationToAdd}>
                  Agregar
                </button>
                <button style={s.btnLink} onClick={() => { setAddingToZona(null); setStationToAdd(''); }}>
                  Cancelar
                </button>
              </div>
            ) : (
              estacionesDisponibles(zona).length > 0 && (
                <button style={s.btnAddEstacion} onClick={() => { setAddingToZona(zona.id); setStationToAdd(''); }}>
                  + Agregar estación
                </button>
              )
            )}
          </div>

          {zona.estaciones.length === 0 && addingToZona !== zona.id && (
            <p style={s.zonaVacia}>Esta zona no tiene estaciones asignadas — la predicción no estará disponible hasta asignar al menos una.</p>
          )}
        </div>
      ))}

      {/* Modal crear/editar */}
      {modal.open && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={s.modalBox}>
            <h3 style={s.modalTitulo}>{modal.mode === 'crear' ? 'Nueva zona de clima' : 'Editar zona'}</h3>

            <div style={s.fieldGroup}>
              <label style={s.label}>Nombre *</label>
              <input
                style={s.input}
                value={formNombre}
                onChange={e => setFormNombre(e.target.value)}
                placeholder="Ej: Zona Curicó Centro"
                maxLength={100}
                autoFocus
              />
            </div>

            <div style={s.fieldGroup}>
              <label style={s.label}>Descripción <span style={s.opcional}>(opcional)</span></label>
              <textarea
                style={s.textarea}
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="Descripción de la zona meteorológica…"
                rows={3}
                maxLength={255}
              />
            </div>

            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={closeModal} disabled={formSaving}>Cancelar</button>
              <button style={s.btnPrimary} onClick={handleSave} disabled={!formNombre.trim() || formSaving}>
                {formSaving ? 'Guardando…' : modal.mode === 'crear' ? 'Crear zona' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Estilos ───────────────────────────────────────────────────
const s = {
  page: { display: 'flex', flexDirection: 'column' as const, gap: '16px' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' as const, gap: '12px', marginBottom: '4px' },
  titulo: { margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: '600' as const, color: '#2c3e50' },
  subtitulo: { margin: 0, color: '#6c757d', fontSize: '0.85rem', maxWidth: '520px' },

  alertSuccess: { padding: '12px 16px', background: '#d4edda', color: '#155724', borderRadius: '8px', border: '1px solid #c3e6cb', fontSize: '0.875rem' },
  alertError: { padding: '12px 16px', background: '#f8d7da', color: '#721c24', borderRadius: '8px', border: '1px solid #f5c6cb', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  stateBox: { padding: '32px', textAlign: 'center' as const, borderRadius: '10px', background: '#f8f9fa', color: '#6c757d' },

  emptyState: { padding: '48px 24px', textAlign: 'center' as const, background: 'white', borderRadius: '12px', border: '1px dashed #dee2e6' },
  emptyIcon: { fontSize: '3rem', margin: '0 0 8px 0' },
  emptyText: { margin: '0 0 4px 0', fontWeight: '600' as const, color: '#2c3e50', fontSize: '1rem' },
  emptyHint: { margin: '0 0 20px 0', color: '#6c757d', fontSize: '0.85rem' },

  // Zona card
  zonaCard: { background: 'white', borderRadius: '12px', padding: '20px 24px', border: '1px solid #e9ecef', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: '4px solid #00BCD4' },
  zonaHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' as const, gap: '12px', marginBottom: '16px' },
  zonaNombre: { margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '600' as const, color: '#2c3e50' },
  zonaDesc: { margin: '0 0 4px 0', color: '#6c757d', fontSize: '0.83rem' },
  zonaMeta: { fontSize: '0.75rem', color: '#00BCD4', fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: '0.4px' },
  zonaActions: { display: 'flex', gap: '8px' },
  zonaVacia: { margin: '8px 0 0 0', color: '#856404', fontSize: '0.82rem', background: '#fff3cd', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ffc107' },

  // Chips de estaciones
  estacionesGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: '8px', alignItems: 'center' },
  estacionChip: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f0fdff', border: '1px solid #b2ebf2', borderRadius: '8px' },
  chipDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#00BCD4', flexShrink: 0 },
  chipInfo: { display: 'flex', flexDirection: 'column' as const },
  chipNombre: { fontSize: '0.83rem', fontWeight: '500' as const, color: '#2c3e50' },
  chipUbicacion: { fontSize: '0.72rem', color: '#6c757d' },
  chipRemove: { background: 'none', border: 'none', cursor: 'pointer', color: '#9E9E9E', fontSize: '1.1rem', padding: '0 0 0 4px', lineHeight: 1, fontWeight: 'bold' as const },
  addEstacionRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const },
  btnAddEstacion: { padding: '6px 12px', background: 'transparent', color: '#00BCD4', border: '1px dashed #00BCD4', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '500' as const },

  // Modal
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: 'white', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitulo: { margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: '600' as const, color: '#2c3e50' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
  fieldGroup: { display: 'flex', flexDirection: 'column' as const, gap: '6px', marginBottom: '16px' },
  label: { fontSize: '0.78rem', color: '#6c757d', fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: '0.4px' },
  opcional: { fontWeight: 'normal' as const, textTransform: 'none' as const },
  input: { padding: '9px 12px', border: '1px solid #dee2e6', borderRadius: '7px', fontSize: '0.9rem', outline: 'none' },
  textarea: { padding: '9px 12px', border: '1px solid #dee2e6', borderRadius: '7px', fontSize: '0.9rem', resize: 'vertical' as const, outline: 'none', fontFamily: 'inherit' },
  select: { padding: '7px 10px', border: '1px solid #dee2e6', borderRadius: '6px', fontSize: '0.85rem', background: 'white', minWidth: '220px' },

  // Botones
  btnPrimary: { padding: '8px 18px', background: '#00BCD4', color: 'white', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' as const },
  btnSecondary: { padding: '8px 18px', background: 'white', color: '#495057', border: '1px solid #dee2e6', borderRadius: '7px', cursor: 'pointer', fontSize: '0.85rem' },
  btnDanger: { padding: '8px 18px', background: 'white', color: '#dc3545', border: '1px solid #f5c6cb', borderRadius: '7px', cursor: 'pointer', fontSize: '0.85rem' },
  btnLink: { background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', fontSize: '0.85rem', padding: '4px 8px' },
};

export default ZonasClimaAdmin;
