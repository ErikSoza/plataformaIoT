import React, { useState, useEffect } from 'react';
import { stationService, deviceService } from '../../services/api';
import { Estacion, Dispositivo, NuevaEstacionForm } from '../../types';
import './GestionEstaciones.css';

// Componente principal
const GestionEstaciones: React.FC = () => {
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [dispositivosDisponibles, setDispositivosDisponibles] = useState<Dispositivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Estados del modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Estado del formulario de nueva estación
  const [nuevaEstacion, setNuevaEstacion] = useState<NuevaEstacionForm>({
    nombre: '',
    ubicacion: '',
    latitud: 0,
    longitud: 0,
    descripcion: ''
  });

  // Cargar datos iniciales
  useEffect(() => {
    cargarEstaciones();
    cargarDispositivosDisponibles();
  }, []);

  const cargarEstaciones = async () => {
    try {
      setLoading(true);
      const data = await stationService.getAll();
      setEstaciones(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarDispositivosDisponibles = async () => {
    try {
      const data = await deviceService.getAvailable();
      setDispositivosDisponibles(data);
    } catch (err: any) {
      console.error('Error al cargar dispositivos disponibles:', err.message);
    }
  };

  const limpiarMensajes = () => {
    setError('');
    setSuccess('');
  };

  // ====== CREAR ESTACIÓN ======
  const handleCrearEstacion = async (e: React.FormEvent) => {
    e.preventDefault();
    limpiarMensajes();
    
    try {
      setLoading(true);
      await stationService.create(nuevaEstacion);
      setSuccess('Estación creada exitosamente');
      setShowCreateModal(false);
      setNuevaEstacion({
        nombre: '',
        ubicacion: '',
        latitud: 0,
        longitud: 0,
        descripcion: ''
      });
      await cargarEstaciones();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ====== ASIGNAR DISPOSITIVO ======
  const abrirModalAsignar = (stationId: number) => {
    setSelectedStationId(stationId);
    setSelectedDeviceId('');
    setShowAssignModal(true);
    cargarDispositivosDisponibles();
  };

  const handleAsignarDispositivo = async () => {
    if (!selectedStationId || !selectedDeviceId) return;
    
    limpiarMensajes();
    
    try {
      setLoading(true);
      await deviceService.assign(selectedDeviceId, selectedStationId);
      setSuccess('Dispositivo asignado exitosamente');
      setShowAssignModal(false);
      await cargarEstaciones();
      await cargarDispositivosDisponibles();
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
      await cargarEstaciones();
      await cargarDispositivosDisponibles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gestion-estaciones">
      <div className="header-section">
        <h2>🏢 Gestión de Estaciones</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          ➕ Nueva Estación
        </button>
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

      {/* Lista de estaciones */}
      <div className="estaciones-grid">
        {loading ? (
          <div className="loading-spinner">Cargando...</div>
        ) : (
          estaciones.map((estacion) => (
            <EstacionCard
              key={estacion.id}
              estacion={estacion}
              onAsignarDispositivo={abrirModalAsignar}
              onLiberarDispositivo={handleLiberarDispositivo}
            />
          ))
        )}
      </div>

      {/* Modal Crear Estación */}
      {showCreateModal && (
        <ModalCrearEstacion
          nuevaEstacion={nuevaEstacion}
          setNuevaEstacion={setNuevaEstacion}
          onSubmit={handleCrearEstacion}
          onClose={() => setShowCreateModal(false)}
          loading={loading}
        />
      )}

      {/* Modal Asignar Dispositivo */}
      {showAssignModal && (
        <ModalAsignarDispositivo
          dispositivosDisponibles={dispositivosDisponibles}
          selectedDeviceId={selectedDeviceId}
          setSelectedDeviceId={setSelectedDeviceId}
          onSubmit={handleAsignarDispositivo}
          onClose={() => setShowAssignModal(false)}
          loading={loading}
        />
      )}
    </div>
  );
};

// ====== COMPONENTE: CARD DE ESTACIÓN ======
interface EstacionCardProps {
  estacion: Estacion;
  onAsignarDispositivo: (stationId: number) => void;
  onLiberarDispositivo: (deviceId: string) => void;
}

const EstacionCard: React.FC<EstacionCardProps> = ({ 
  estacion, 
  onAsignarDispositivo, 
  onLiberarDispositivo 
}) => {
  const tieneDispositivo = estacion.device_id;

  return (
    <div className="estacion-card">
      <div className="card-header">
        <h3>{estacion.nombre}</h3>
        <span className={`status-badge ${estacion.estado.toLowerCase()}`}>
          {estacion.estado}
        </span>
      </div>
      
      <div className="card-body">
        <div className="info-item">
          <strong>📍 Ubicación:</strong> {estacion.ubicacion || 'No especificada'}
        </div>
        
        {estacion.latitud && estacion.longitud && (
          <div className="info-item">
            <strong>🗺️ Coordenadas:</strong> {estacion.latitud}, {estacion.longitud}
          </div>
        )}
        
        {estacion.descripcion && (
          <div className="info-item">
            <strong>📝 Descripción:</strong> {estacion.descripcion}
          </div>
        )}
        
        <div className="dispositivo-section">
          <strong>📱 Dispositivo:</strong>
          {tieneDispositivo ? (
            <div className="dispositivo-asignado">
              <div className="dispositivo-info">
                <span className="device-id">{estacion.device_id}</span>
                <span className="device-model">{estacion.modelo}</span>
                {estacion.bateria && (
                  <span className="battery-level">🔋 {estacion.bateria}%</span>
                )}
              </div>
              <button 
                className="btn btn-danger btn-sm"
                onClick={() => onLiberarDispositivo(estacion.device_id!)}
                title="Liberar dispositivo"
              >
                🔓 Liberar
              </button>
            </div>
          ) : (
            <div className="sin-dispositivo">
              <span>Sin dispositivo asignado</span>
              <button 
                className="btn btn-success btn-sm"
                onClick={() => onAsignarDispositivo(estacion.id)}
                title="Asignar dispositivo"
              >
                🔗 Asignar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ====== COMPONENTE: MODAL CREAR ESTACIÓN ======
interface ModalCrearEstacionProps {
  nuevaEstacion: NuevaEstacionForm;
  setNuevaEstacion: React.Dispatch<React.SetStateAction<NuevaEstacionForm>>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

const ModalCrearEstacion: React.FC<ModalCrearEstacionProps> = ({
  nuevaEstacion,
  setNuevaEstacion,
  onSubmit,
  onClose,
  loading
}) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>➕ Crear Nueva Estación</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      
      <form onSubmit={onSubmit} className="modal-body">
        <div className="form-group">
          <label>Nombre de la Estación *</label>
          <input
            type="text"
            value={nuevaEstacion.nombre}
            onChange={(e) => setNuevaEstacion({ ...nuevaEstacion, nombre: e.target.value })}
            required
            placeholder="Ej: Campus Los Niches"
          />
        </div>
        
        <div className="form-group">
          <label>Ubicación *</label>
          <input
            type="text"
            value={nuevaEstacion.ubicacion}
            onChange={(e) => setNuevaEstacion({ ...nuevaEstacion, ubicacion: e.target.value })}
            required
            placeholder="Ej: Edificio Central, Piso 2"
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Latitud *</label>
            <input
              type="number"
              step="any"
              value={nuevaEstacion.latitud}
              onChange={(e) => setNuevaEstacion({ ...nuevaEstacion, latitud: parseFloat(e.target.value) || 0 })}
              required
              placeholder="-35.001"
            />
          </div>
          
          <div className="form-group">
            <label>Longitud *</label>
            <input
              type="number"
              step="any"
              value={nuevaEstacion.longitud}
              onChange={(e) => setNuevaEstacion({ ...nuevaEstacion, longitud: parseFloat(e.target.value) || 0 })}
              required
              placeholder="-71.229"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Descripción</label>
          <textarea
            value={nuevaEstacion.descripcion}
            onChange={(e) => setNuevaEstacion({ ...nuevaEstacion, descripcion: e.target.value })}
            placeholder="Descripción opcional de la estación..."
            rows={3}
          />
        </div>
        
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creando...' : 'Crear Estación'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

// ====== COMPONENTE: MODAL ASIGNAR DISPOSITIVO ======
interface ModalAsignarDispositivoProps {
  dispositivosDisponibles: Dispositivo[];
  selectedDeviceId: string;
  setSelectedDeviceId: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

const ModalAsignarDispositivo: React.FC<ModalAsignarDispositivoProps> = ({
  dispositivosDisponibles,
  selectedDeviceId,
  setSelectedDeviceId,
  onSubmit,
  onClose,
  loading
}) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>🔗 Asignar Dispositivo</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      
      <div className="modal-body">
        <div className="form-group">
          <label>Seleccionar Dispositivo Disponible *</label>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            required
          >
            <option value="">-- Seleccionar Dispositivo --</option>
            {dispositivosDisponibles.map((dispositivo) => (
              <option key={dispositivo.device_id} value={dispositivo.device_id}>
                {dispositivo.device_id} - {dispositivo.modelo}
                {dispositivo.bateria && ` (🔋 ${dispositivo.bateria}%)`}
              </option>
            ))}
          </select>
        </div>
        
        {dispositivosDisponibles.length === 0 && (
          <div className="no-devices-message">
            ⚠️ No hay dispositivos disponibles en este momento.
          </div>
        )}
        
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={onSubmit}
            disabled={loading || !selectedDeviceId}
          >
            {loading ? 'Asignando...' : 'Asignar Dispositivo'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default GestionEstaciones;