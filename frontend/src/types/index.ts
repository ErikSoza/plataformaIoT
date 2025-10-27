// ==================== INTERFACES DE BASE DE DATOS ====================

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  contrasena?: string; // No incluir en respuestas del API
  rol: 'admin' | 'usuario';
  created_at: string;
}

export interface Estacion {
  id: number;
  id_usuario?: number;
  nombre: string;
  localizacion?: string;
  latitud?: number;
  longitud?: number;
  estado: string;
  bateria?: number;
  ultima_actualizacion: string;
  created_at: string;
}

export interface Lectura {
  id: number;
  id_estacion: number;
  timestamp: string;
  json: {
    temperatura: number;
    humedad: number;
    presion: number;
    gas: number;
    radiacion: number;
    viento: number;
    bateria: number;
  };
  // Campos adicionales de JOIN
  estacion_nombre?: string;
  localizacion?: string;
}

// Tipo para los datos que envía el ESP32
export interface ESP32Data {
  id_estacion: number;
  timestamp: string;
  data: {
    temperatura: number;
    humedad: number;
    presion: number;
    gas: number;
    radiacion: number;
    viento: number;
    bateria: number;
  };
}

export interface Alerta {
  id: number;
  id_estacion: number;
  mensaje?: string;
  nivel?: string;
  created_at: string;
}

// ==================== INTERFACES EXTENDIDAS ====================

export interface EstacionCompleta extends Estacion {
  latestReading: Lectura | null;
  usuario?: Usuario;
}

// ==================== INTERFACES PARA COMPONENTES ====================

// Mantener compatibilidad con componentes existentes
export interface DeviceData {
  id: number;
  name: string;
  type: string;
  status: 'Activo' | 'Inactivo' | 'Mantenimiento' | 'Error';
  lastUpdate: string;
  location: string;
  coordinates: [number, number];
  temperature?: number;
  humidity?: number;
  battery?: number;
  pressure?: number;
  gas?: number;
  radiation?: number;
}

export interface StatCardData {
  title: string;
  value: string;
  icon: string;
}

export interface TabItem {
  id: string;
  label: string;
  active: boolean;
}

// ==================== INTERFACES DE API ====================

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface EstadisticasLecturas {
  sensor_tipo: string;
  total_lecturas: number;
  promedio: number;
  minimo: number;
  maximo: number;
  ultima_lectura: string;
}

// ==================== FUNCIONES DE TRANSFORMACIÓN ====================

// Transformar Estacion a DeviceData para compatibilidad
export const transformEstacionToDevice = (estacion: EstacionCompleta): DeviceData => {
  // Mapear estado a valores válidos
  const mapStatus = (estado: string): DeviceData['status'] => {
    const normalizedStatus = estado.toLowerCase();
    if (normalizedStatus.includes('activo')) return 'Activo';
    if (normalizedStatus.includes('inactivo')) return 'Inactivo';
    if (normalizedStatus.includes('mantenimiento')) return 'Mantenimiento';
    return 'Error';
  };

  // Extraer datos de la última lectura si existe
  const latestReading = estacion.latestReading;
  const sensorData = latestReading?.json;

  return {
    id: estacion.id,
    name: estacion.nombre,
    type: 'Sensor Ambiental IoT',
    status: mapStatus(estacion.estado),
    lastUpdate: latestReading?.timestamp || estacion.ultima_actualizacion,
    location: estacion.localizacion || 'Sin ubicación',
    coordinates: estacion.latitud && estacion.longitud 
      ? [estacion.latitud, estacion.longitud] 
      : [0, 0],
    temperature: sensorData?.temperatura,
    humidity: sensorData?.humedad,
    battery: sensorData?.bateria || estacion.bateria,
    pressure: sensorData?.presion,
    gas: sensorData?.gas,
    radiation: sensorData?.radiacion,
  };
};

// Transformar múltiples estaciones
// Convierte los datos de la base de datos al formato que esperan tus componentes React existentes, para no tener que cambiar todo el frontend.
export const transformEstacionesToDevices = (
  estaciones: EstacionCompleta[]
): DeviceData[] => {
  return estaciones.map(estacion => transformEstacionToDevice(estacion));
};

// ==================== TIPOS DE FORMULARIOS ====================

export interface NuevaEstacionForm {
  nombre: string;
  localizacion: string;
  latitud: number;
  longitud: number;
  id_usuario?: number;
}

export interface NuevaLecturaForm {
  id_estacion: number;
  timestamp?: string;
  json: {
    temperatura: number;
    humedad: number;
    presion: number;
    gas: number;
    radiacion: number;
    viento: number;
    bateria: number;
  };
}