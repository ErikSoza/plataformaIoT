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

export interface Sensor {
  id: number;
  id_estacion: number;
  nombre: string;
  tipo: string;
  estado: string;
  created_at: string;
  // Campos adicionales de JOIN
  estacion_nombre?: string;
}

export interface Lectura {
  id: number;
  id_sensor: number;
  timestamp: string;
  valor?: number;
  json?: any;
  // Campos adicionales de JOIN
  sensor_nombre?: string;
  sensor_tipo?: string;
  estacion_nombre?: string;
  localizacion?: string;
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
  sensors: Sensor[];
  latestReadings: Lectura[];
  usuario?: Usuario;
}

export interface SensorConLecturas extends Sensor {
  lecturas: Lectura[];
  ultimaLectura?: Lectura;
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
export const transformEstacionToDevice = (
  estacion: EstacionCompleta, 
  lecturas: Lectura[] = []
): DeviceData => {
  // Buscar lecturas de temperatura, humedad, etc.
  const temperaturaReading = lecturas.find(l => 
    l.sensor_tipo?.toLowerCase().includes('temperatura') || 
    l.sensor_tipo?.toLowerCase().includes('temp')
  );
  
  const humedadReading = lecturas.find(l => 
    l.sensor_tipo?.toLowerCase().includes('humedad') || 
    l.sensor_tipo?.toLowerCase().includes('humidity')
  );

  // Mapear estado a valores válidos
  const mapStatus = (estado: string): DeviceData['status'] => {
    const normalizedStatus = estado.toLowerCase();
    if (normalizedStatus.includes('activo')) return 'Activo';
    if (normalizedStatus.includes('inactivo')) return 'Inactivo';
    if (normalizedStatus.includes('mantenimiento')) return 'Mantenimiento';
    return 'Error';
  };

  return {
    id: estacion.id,
    name: estacion.nombre,
    type: 'Sensor Ambiental IoT',
    status: mapStatus(estacion.estado),
    lastUpdate: estacion.ultima_actualizacion,
    location: estacion.localizacion || 'Sin ubicación',
    coordinates: estacion.latitud && estacion.longitud 
      ? [estacion.latitud, estacion.longitud] 
      : [0, 0],
    temperature: temperaturaReading?.valor,
    humidity: humedadReading?.valor,
    battery: estacion.bateria,
  };
};

// Transformar múltiples estaciones
export const transformEstacionesToDevices = (
  estaciones: EstacionCompleta[]
): DeviceData[] => {
  return estaciones.map(estacion => 
    transformEstacionToDevice(estacion, estacion.latestReadings)
  );
};

// ==================== TIPOS DE FORMULARIOS ====================

export interface NuevaEstacionForm {
  nombre: string;
  localizacion: string;
  latitud: number;
  longitud: number;
  id_usuario?: number;
}

export interface NuevoSensorForm {
  id_estacion: number;
  nombre: string;
  tipo: string;
  estado?: string;
}

export interface NuevaLecturaForm {
  id_sensor: number;
  valor?: number;
  json?: any;
}