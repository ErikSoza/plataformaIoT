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
  gas?: number | null; // Campo obsoleto - no existe en BD actual
  radiation?: number | null; // Campo obsoleto - no existe en BD actual
  wind?: number;
}

export interface Reading {
  id: number;
  device_id: string;
  fecha_registro: string;
  raw_timestamp?: number;
  temperatura?: number;
  humedad?: number;
  presion_at?: number;
  velocidad_viento?: number;
  prediccion_temp?: number;
  // Campos mapeados para compatibilidad
  pressure?: number; // alias de presion_at
  wind?: number; // alias de velocidad_viento
  gas?: number | null; // no existe en BD actual
  radiation?: number | null; // no existe en BD actual
  // Campos adicionales de JOIN
  device_id_dispositivo?: string;
  modelo?: string;
  estacion_nombre?: string;
  ubicacion?: string;
  estacion_id?: number;
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
    lastUpdate: rawStation.latestReading?.fecha_registro || rawStation.latestReading?.timestamp || rawStation.ultima_actualizacion,
    type: 'Sensor Ambiental IoT',
  };

  // Mapear estado a valores válidos del componente
  const mapStatus = (estacionEstado: string, dispositivoEstado?: string): Station['status'] => {
    // Priorizar el estado del dispositivo si existe, sino usar el estado de la estación
    const estadoAUsar = dispositivoEstado || estacionEstado || 'error';
    const normalizedStatus = estadoAUsar.toLowerCase();
    
    if (normalizedStatus.includes('activ') || normalizedStatus.includes('asignado')) return 'Activo';
    if (normalizedStatus.includes('inactiv') || normalizedStatus.includes('disponible')) return 'Inactivo';
    if (normalizedStatus.includes('mantenimiento')) return 'Mantenimiento';
    return 'Error';
  };
  
  station.status = mapStatus(rawStation.estado, rawStation.estado_dispositivo);

  // Extraer métricas de la última lectura si existe
  if (rawStation.latestReading) {
    const reading = rawStation.latestReading;
    station.temperature = reading.temperatura;
    station.humidity = reading.humedad;
    station.pressure = reading.presion_at || reading.pressure;
    station.wind = reading.velocidad_viento || reading.wind;
    // TODO: Implementar en dispositivo - valores temporales por ahora
    station.gas = 0.040; // Valor temporal representativo
    station.radiation = 650; // Valor temporal representativo
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
    viento: number;
    bateria: number;
    gas?: number; // TODO: Implementar en dispositivo
    radiacion?: number; // TODO: Implementar en dispositivo
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
    viento: { min: 0, max: 100 },
    bateria: { min: 0, max: 100 },
    gas: { min: 0, max: 1 }, // TODO: Ajustar cuando se implemente
    radiacion: { min: 0, max: 2000 }, // TODO: Ajustar cuando se implemente
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