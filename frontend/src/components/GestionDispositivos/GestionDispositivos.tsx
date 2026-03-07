import React, { useState, useEffect } from 'react';
import { deviceService, stationService } from '../../services/api';
import { Dispositivo, Estacion } from '../../types';
import './GestionDispositivos.css';

// Estados disponibles para los dispositivos
const ESTADOS_DISPONIBLES = [
  { value: 'disponible', label: 'Disponible', icon: '🟢' },
  { value: 'asignado', label: 'Asignado', icon: '🟡' },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: '🔴' }
];

// Componente Card de Dispositivo
const DispositivoCard: React.FC<{
  dispositivo: Dispositivo,
  estaciones: Estacion[],
  onReasignarDispositivo: (deviceId: string) => void,
  onLiberarDispositivo: (deviceId: string) => void,
  onEliminarDispositivo: (deviceId: string, modelo: string) => void
}> = ({ dispositivo, estaciones, onReasignarDispositivo, onLiberarDispositivo, onEliminarDispositivo }) => {
  
  const getEstadoIcon = (estado: string) => {
    const estadoItem = ESTADOS_DISPONIBLES.find(e => e.value === estado);
    return estadoItem ? estadoItem.icon : '❓';
  };

  const getEstadoLabel = (estado: string) => {
    const estadoItem = ESTADOS_DISPONIBLES.find(e => e.value === estado);
    return estadoItem ? estadoItem.label : estado;
  };

  const isOrphan = dispositivo.id_estacion && !dispositivo.nombre_estacion;
  const hasValidStation = dispositivo.id_estacion && dispositivo.nombre_estacion;

  return (
    <div className={`dispositivo-card ${isOrphan ? 'dispositivo-orphan' : ''}`}>
      <div className="dispositivo-header">
        <div className="dispositivo-id">
          <h3>📱 {dispositivo.device_id}</h3>
          <span className={`estado-badge estado-${dispositivo.estado}`}>
            {getEstadoIcon(dispositivo.estado)} {getEstadoLabel(dispositivo.estado)}
          </span>
        </div>
        {isOrphan && (
          <div className="orphan-badge">
            ⚠️ HUÉRFANO
          </div>
        )}
      </div>

      <div className="dispositivo-details">
        <div className="detail-item">
          <span className="label">Modelo:</span>
          <span className="value">{dispositivo.modelo}</span>
        </div>
        
        {dispositivo.bateria && (
          <div className="detail-item">
            <span className="label">Batería:</span>
            <span className="value">{dispositivo.bateria}%</span>
          </div>
        )}

        {dispositivo.ultima_conexion && (
          <div className="detail-item">
            <span className="label">Última conexión:</span>
            <span className="value">{new Date(dispositivo.ultima_conexion).toLocaleString()}</span>
          </div>
        )}

        <div className="detail-item">
          <span className="label">Estación asignada:</span>
          <span className="value">
            {hasValidStation ? (
              <span className="estacion-asignada">
                🏢 {dispositivo.nombre_estacion}
                {dispositivo.ubicacion_estacion && (
                  <small> ({dispositivo.ubicacion_estacion})</small>
                )}
              </span>
            ) : isOrphan ? (
              <span className="estacion-orphan">
                ❌ Estación ID {dispositivo.id_estacion} (INEXISTENTE)
              </span>
            ) : (
              <span className="sin-estacion">Sin asignar</span>
            )}
          </span>
        </div>
      </div>

      <div className="dispositivo-actions">
        {dispositivo.estado === 'asignado' && (
          <button
            className="btn btn-warning btn-sm"
            onClick={() => onLiberarDispositivo(dispositivo.device_id)}
            title="Liberar dispositivo de la estación"
          >
            🔓 Liberar
          </button>
        )}
        
        {(dispositivo.estado === 'disponible' || isOrphan) && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onReasignarDispositivo(dispositivo.device_id)}
            title="Asignar dispositivo a una estación"
          >
            🔗 {isOrphan ? 'Reasignar' : 'Asignar'}
          </button>
        )}

        <button
          className="btn btn-danger btn-sm"
          onClick={() => onEliminarDispositivo(dispositivo.device_id, dispositivo.modelo)}
          title="Eliminar dispositivo permanentemente"
        >
          🗑️ Eliminar
        </button>
      </div>
    </div>
  );
};

// Modal para asignar/reasignar dispositivo
const ModalAsignarDispositivo: React.FC<{
  estaciones: Estacion[],
  deviceId: string,
  currentStationId?: number | null,
  selectedStationId: string,
  setSelectedStationId: (id: string) => void,
  onSubmit: () => void,
  onClose: () => void,
  loading: boolean
}> = ({ estaciones, deviceId, currentStationId, selectedStationId, setSelectedStationId, onSubmit, onClose, loading }) => {
  
  // Filtrar estaciones que no tienen dispositivo asignado (excepto la actual si existe)
  const estacionesDisponibles = estaciones.filter(estacion => 
    !estacion.device_id || estacion.id === currentStationId
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🔗 Asignar Dispositivo</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p><strong>Dispositivo:</strong> {deviceId}</p>
          
          <div className="form-group">
            <label>Seleccionar Estación:</label>
            <select
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(e.target.value)}
              className="form-control"
              disabled={loading}
            >
              <option value="">-- Seleccionar estación --</option>
              {estacionesDisponibles.map(estacion => (
                <option key={estacion.id} value={estacion.id}>
                  {estacion.nombre} {estacion.ubicacion ? `(${estacion.ubicacion})` : ''}
                  {estacion.device_id && estacion.id !== currentStationId ? ' [Ocupada]' : ''}
                </option>
              ))}
            </select>
          </div>

          {estacionesDisponibles.length === 0 && (
            <div className="alert alert-warning">
              ⚠️ No hay estaciones disponibles. Todas las estaciones ya tienen dispositivos asignados.
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            className="btn btn-primary"
            onClick={onSubmit}
            disabled={loading || !selectedStationId || estacionesDisponibles.length === 0}
          >
            {loading ? 'Asignando...' : 'Asignar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente principal
const GestionDispositivos: React.FC = () => {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Estados del modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  const [currentStationId, setCurrentStationId] = useState<number | null>(null);

  // Estados de filtros
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroOrfanos, setFiltroOrfanos] = useState<boolean>(false);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [dispositivosData, estacionesData] = await Promise.all([
        deviceService.getAll(),
        stationService.getAll()
      ]);
      setDispositivos(dispositivosData);
      setEstaciones(estacionesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const limpiarMensajes = () => {
    setError('');
    setSuccess('');
  };

  // ====== ASIGNAR/REASIGNAR DISPOSITIVO ======
  const abrirModalAsignar = (deviceId: string) => {
    const dispositivo = dispositivos.find(d => d.device_id === deviceId);
    setSelectedDeviceId(deviceId);
    setCurrentStationId(dispositivo?.id_estacion || null);
    setSelectedStationId('');
    setShowAssignModal(true);
  };

  const handleAsignarDispositivo = async () => {
    if (!selectedDeviceId || !selectedStationId) return;
    
    limpiarMensajes();
    
    try {
      setLoading(true);
      await deviceService.assign(selectedDeviceId, parseInt(selectedStationId));
      setSuccess('Dispositivo asignado exitosamente');
      setShowAssignModal(false);
      await cargarDatos();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ====== LIBERAR DISPOSITIVO ======
  const handleLiberarDispositivo = async (deviceId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres liberar este dispositivo?')) {
      return;
    }

    limpiarMensajes();
    
    try {
      setLoading(true);
      await deviceService.release(deviceId);
      setSuccess('Dispositivo liberado exitosamente');
      await cargarDatos();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ====== ELIMINAR DISPOSITIVO ======
  const handleEliminarDispositivo = async (deviceId: string, modelo: string) => {
    const confirmacion = window.confirm(
      `¿Estás seguro de que quieres ELIMINAR PERMANENTEMENTE el dispositivo "${deviceId}" (${modelo})?\n\n⚠️ Esta acción NO SE PUEDE DESHACER.\n\n• Se eliminarán todos los datos del dispositivo\n• Se perderán todas las lecturas asociadas\n• No se podrá recuperar la información`
    );
    
    if (!confirmacion) return;

    limpiarMensajes();
    
    try {
      setLoading(true);
      await deviceService.delete(deviceId);
      setSuccess('Dispositivo eliminado exitosamente');
      await cargarDatos();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ====== FILTROS ======
  const dispositivosFiltrados = dispositivos.filter(dispositivo => {
    // Filtro por estado
    if (filtroEstado && dispositivo.estado !== filtroEstado) {
      return false;
    }
    
    // Filtro de huérfanos
    if (filtroOrfanos) {
      const isOrphan = dispositivo.id_estacion && !dispositivo.nombre_estacion;
      return isOrphan;
    }
    
    return true;
  });

  // Estadísticas
  const stats = {
    total: dispositivos.length,
    disponibles: dispositivos.filter(d => d.estado === 'disponible').length,
    asignados: dispositivos.filter(d => d.estado === 'asignado').length,
    mantenimiento: dispositivos.filter(d => d.estado === 'mantenimiento').length,
    huerfanos: dispositivos.filter(d => d.id_estacion && !d.nombre_estacion).length
  };

  return (
    <div className="gestion-dispositivos">
      <div className="header-section">
        <h2>📱 Gestión de Dispositivos</h2>
        <button 
          className="btn btn-secondary"
          onClick={cargarDatos}
          disabled={loading}
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Estadísticas */}
      <div className="stats-section">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card disponible">
          <div className="stat-number">{stats.disponibles}</div>
          <div className="stat-label">Disponibles</div>
        </div>
        <div className="stat-card asignado">
          <div className="stat-number">{stats.asignados}</div>
          <div className="stat-label">Asignados</div>
        </div>
        <div className="stat-card mantenimiento">
          <div className="stat-number">{stats.mantenimiento}</div>
          <div className="stat-label">Mantenimiento</div>
        </div>
        {stats.huerfanos > 0 && (
          <div className="stat-card orphan">
            <div className="stat-number">{stats.huerfanos}</div>
            <div className="stat-label">Huérfanos</div>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Estado:</label>
          <select 
            value={filtroEstado} 
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos</option>
            {ESTADOS_DISPONIBLES.map(estado => (
              <option key={estado.value} value={estado.value}>
                {estado.icon} {estado.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>
            <input
              type="checkbox"
              checked={filtroOrfanos}
              onChange={(e) => setFiltroOrfanos(e.target.checked)}
            />
            Solo huérfanos
          </label>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="alert alert-danger" onClick={limpiarMensajes}>
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" onClick={limpiarMensajes}>
          ✅ {success}
        </div>
      )}

      {/* Lista de dispositivos */}
      <div className="dispositivos-grid">
        {loading ? (
          <div className="loading-spinner">Cargando dispositivos...</div>
        ) : dispositivosFiltrados.length === 0 ? (
          <div className="no-data">
            {filtroOrfanos ? 
              '🎉 No hay dispositivos huérfanos' : 
              'No se encontraron dispositivos con los filtros aplicados'
            }
          </div>
        ) : (
          dispositivosFiltrados.map((dispositivo) => (
            <DispositivoCard
              key={dispositivo.device_id}
              dispositivo={dispositivo}
              estaciones={estaciones}
              onReasignarDispositivo={abrirModalAsignar}
              onLiberarDispositivo={handleLiberarDispositivo}
              onEliminarDispositivo={handleEliminarDispositivo}
            />
          ))
        )}
      </div>

      {/* Modal Asignar Dispositivo */}
      {showAssignModal && (
        <ModalAsignarDispositivo
          estaciones={estaciones}
          deviceId={selectedDeviceId}
          currentStationId={currentStationId}
          selectedStationId={selectedStationId}
          setSelectedStationId={setSelectedStationId}
          onSubmit={handleAsignarDispositivo}
          onClose={() => setShowAssignModal(false)}
          loading={loading}
        />
      )}
    </div>
  );
};

export default GestionDispositivos;