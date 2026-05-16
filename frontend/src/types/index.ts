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
  ubicacion?: string;
  latitud?: number;
  longitud?: number;
  descripcion?: string;
  estado: string;
  created_at: string;
  // Campos del JOIN con dispositivos
  device_id?: string;
  modelo?: string;
  estado_dispositivo?: string;
  bateria?: number;
  ultima_conexion?: string;
}

export interface Dispositivo {
  device_id: string;
  modelo: string;
  estado: 'disponible' | 'asignado' | 'mantenimiento';
  bateria?: number;
  ultima_conexion?: string;
  id_estacion?: number;
  created_at: string;
  // Campos del JOIN con estaciones
  nombre_estacion?: string;
  ubicacion_estacion?: string;
}

export interface Lectura {
  id: number;
  device_id: string;
  fecha_registro: string;
  raw_timestamp?: number;
  temperatura?: number;
  humedad?: number;
  presion_at?: number;
  velocidad_viento?: number;
  prediccion_temp?: number;
  // Gases MQ135 (null en lecturas sin sensor)
  gas_co2?: number | null;
  gas_nh3?: number | null;
  gas_alcohol?: number | null;
  gas_humo?: number | null;
  gas_benceno?: number | null;
  gas_acetona?: number | null;
  // Mapeo de compatibilidad
  pressure?: number;
  wind?: number;
  gas?: number | null;       // alias de gas_co2 para mapa de calor
  radiation?: number | null;
  // Campos adicionales de JOIN
  estacion_nombre?: string;
  ubicacion?: string;
  estacion_id?: number;
  modelo?: string;
}

// Tipo para los datos que envía el ESP32 (JSON v2.1)
export interface ESP32Data {
  id: string;
  timestamp: number;
  datos: {
    temperatura: string;
    humedad: string;
    presionAT: string;
    velocidadViento: string;
    prediccionTemp: string;
    gases?: {
      co2?: string;
      nh3?: string;
      alcohol?: string;
      humo?: string;
      benceno?: string;
      acetona?: string;
    };
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
  wind?: number;
  // gas = CO2 (usado por mapa de calor con métrica 'gas')
  gas?: number | null;
  // Gases individuales MQ135
  gas_co2?: number | null;
  gas_nh3?: number | null;
  gas_alcohol?: number | null;
  gas_humo?: number | null;
  gas_benceno?: number | null;
  gas_acetona?: number | null;
  radiation?: number | null;
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

  const co2 = latestReading?.gas_co2 ?? null;

  return {
    id: estacion.id,
    name: estacion.nombre,
    type: 'Sensor Ambiental IoT',
    status: mapStatus(estacion.estado),
    lastUpdate: latestReading?.fecha_registro || estacion.created_at,
    location: estacion.ubicacion || 'Sin ubicación',
    coordinates: estacion.latitud && estacion.longitud
      ? [estacion.latitud, estacion.longitud]
      : [0, 0],
    temperature:  latestReading?.temperatura,
    humidity:     latestReading?.humedad,
    battery:      estacion.bateria,
    pressure:     latestReading?.presion_at,
    wind:         latestReading?.velocidad_viento,
    gas:          co2,          // CO2 como proxy de calidad del aire (mapa de calor)
    gas_co2:      co2,
    gas_nh3:      latestReading?.gas_nh3    ?? null,
    gas_alcohol:  latestReading?.gas_alcohol ?? null,
    gas_humo:     latestReading?.gas_humo    ?? null,
    gas_benceno:  latestReading?.gas_benceno ?? null,
    gas_acetona:  latestReading?.gas_acetona ?? null,
    radiation:    null,
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
  ubicacion: string;
  latitud: number;
  longitud: number;
  descripcion?: string;
  estado?: string;
}
export interface NuevoDispositivoForm {
  device_id: string;
  modelo: string;
  estado: 'disponible' | 'asignado' | 'mantenimiento';
  bateria?: number;
  ultima_conexion?: string;
  id_estacion?: number;
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
    gas_co2?: number;
    gas_nh3?: number;
    gas_alcohol?: number;
    gas_humo?: number;
    gas_benceno?: number;
    gas_acetona?: number;
  };
}