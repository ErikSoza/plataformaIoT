// ==================== INTERFACES UNIFICADAS ====================

export interface Station {
  // Campos de base de datos
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
  
  // Campos extendidos
  latestReading?: Reading | null;
  usuario?: Usuario;
  
  // Campos calculados/transformados para compatibilidad con componentes
  name?: string; // alias de nombre
  location?: string; // alias de localizacion
  coordinates?: [number, number]; // [latitud, longitud]
  status?: 'Activo' | 'Inactivo' | 'Mantenimiento' | 'Error';
  lastUpdate?: string; // alias de ultima_actualizacion
  type?: string; // tipo de dispositivo
  
  // Métricas de la última lectura (para fácil acceso)
  temperature?: number;
  humidity?: number;
  pressure?: number;
  gas?: number;
  radiation?: number;
  wind?: number;
}

export interface Reading {
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

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  contrasena?: string; // No incluir en respuestas del API
  rol: 'admin' | 'usuario';
  created_at: string;
}

// ==================== TIPOS HEREDADOS (PARA COMPATIBILIDAD) ====================

// Tipo para mantener compatibilidad con componentes existentes
export type DeviceData = Station;
export type EstacionCompleta = Station;

// Tipo para datos que envía el ESP32
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

// ==================== INTERFACES PARA COMPONENTES ====================

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

// ==================== FUNCIONES DE TRANSFORMACIÓN Y UTILIDADES ====================

/**
 * Transforma datos de estación de BD al formato unificado
 */
export const normalizeStationData = (rawStation: any): Station => {
  const station: Station = {
    // Campos de BD
    id: rawStation.id,
    id_usuario: rawStation.id_usuario,
    nombre: rawStation.nombre,
    localizacion: rawStation.localizacion,
    latitud: rawStation.latitud,
    longitud: rawStation.longitud,
    estado: rawStation.estado,
    bateria: rawStation.bateria,
    ultima_actualizacion: rawStation.ultima_actualizacion,
    created_at: rawStation.created_at,
    latestReading: rawStation.latestReading,
    usuario: rawStation.usuario,
    
    // Campos transformados para compatibilidad
    name: rawStation.nombre,
    location: rawStation.localizacion || 'Sin ubicación',
    coordinates: rawStation.latitud && rawStation.longitud 
      ? [rawStation.latitud, rawStation.longitud] 
      : [0, 0],
    lastUpdate: rawStation.latestReading?.timestamp || rawStation.ultima_actualizacion,
    type: 'Sensor Ambiental IoT',
  };

  // Mapear estado a valores válidos del componente
  const mapStatus = (estado: string): Station['status'] => {
    const normalizedStatus = estado.toLowerCase();
    if (normalizedStatus.includes('activo')) return 'Activo';
    if (normalizedStatus.includes('inactivo')) return 'Inactivo';
    if (normalizedStatus.includes('mantenimiento')) return 'Mantenimiento';
    return 'Error';
  };
  
  station.status = mapStatus(rawStation.estado);

  // Extraer métricas de la última lectura si existe
  if (rawStation.latestReading?.json) {
    const sensorData = rawStation.latestReading.json;
    station.temperature = sensorData.temperatura;
    station.humidity = sensorData.humedad;
    station.pressure = sensorData.presion;
    station.gas = sensorData.gas;
    station.radiation = sensorData.radiacion;
    station.wind = sensorData.viento;
    // Usar batería de la lectura o de la estación
    if (!station.bateria && sensorData.bateria) {
      station.bateria = sensorData.bateria;
    }
  }

  return station;
};

/**
 * Transforma múltiples estaciones
 */
export const normalizeStationsData = (rawStations: any[]): Station[] => {
  return rawStations.map(station => normalizeStationData(station));
};

/**
 * Alias para mantener compatibilidad con código existente
 * @deprecated Use normalizeStationData instead
 */
export const transformEstacionToDevice = (estacion: any): DeviceData => {
  return normalizeStationData(estacion);
};

/**
 * Alias para mantener compatibilidad con código existente
 * @deprecated Use normalizeStationsData instead
 */
export const transformEstacionesToDevices = (estaciones: any[]): DeviceData[] => {
  return normalizeStationsData(estaciones);
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

// ==================== VALIDADORES ====================

export const validateCoordinates = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

export const validateMetricValue = (value: number, metric: string): boolean => {
  const ranges = {
    temperatura: { min: -50, max: 60 },
    humedad: { min: 0, max: 100 },
    presion: { min: 950, max: 1050 },
    gas: { min: 0, max: 1 },
    radiacion: { min: 0, max: 2000 },
    viento: { min: 0, max: 100 },
    bateria: { min: 0, max: 100 },
  } as const;

  const range = ranges[metric as keyof typeof ranges];
  return range ? value >= range.min && value <= range.max : true;
};

// ==================== FILTROS Y UTILIDADES ====================

export const filterActiveStations = (stations: Station[]): Station[] => {
  return stations.filter(station => station.status === 'Activo');
};

export const getStationsWithRecentData = (stations: Station[], maxAgeHours: number = 24): Station[] => {
  const maxAge = Date.now() - (maxAgeHours * 60 * 60 * 1000);
  
  return stations.filter(station => {
    const lastUpdate = new Date(station.lastUpdate || station.ultima_actualizacion).getTime();
    return lastUpdate >= maxAge;
  });
};

export const sortStationsByLastUpdate = (stations: Station[]): Station[] => {
  return [...stations].sort((a, b) => {
    const dateA = new Date(a.lastUpdate || a.ultima_actualizacion).getTime();
    const dateB = new Date(b.lastUpdate || b.ultima_actualizacion).getTime();
    return dateB - dateA; // Más reciente primero
  });
};

// ==================== TIPOS PARA HOOKS ====================

export interface UseStationsReturn {
  stations: Station[];
  devices: DeviceData[]; // Alias para compatibilidad
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseStatsReturn {
  stats: StatCardData[];
  loading: boolean;
  error: string | null;
  recalculate: () => Promise<void>;
}

export interface UseApiConnectionReturn {
  isConnected: boolean | null;
  checking: boolean;
  checkConnection: () => Promise<void>;
}

const TypeUtilities = {
  normalizeStationData,
  normalizeStationsData,
  validateCoordinates,
  validateMetricValue,
  filterActiveStations,
  getStationsWithRecentData,
  sortStationsByLastUpdate,
};

export default TypeUtilities;