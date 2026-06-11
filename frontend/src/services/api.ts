import axios from 'axios';

// Configuración base de axios
// Usar variable de entorno si existe (inyectada por el contenedor Docker), 
// de lo contrario usar el localhost:3000 por defecto para desarrollo nativo sin Docker
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejo de errores
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ Error en API:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// ==================== ESTACIONES ====================

// ==================== USUARIOS/AUTENTICACIÓN ====================

export const authService = {
  // Registrar nuevo usuario
  register: async (userData: {
    nombre: string;
    email: string;
    contrasena: string;
    confirmPassword: string;
  }) => {
    try {
      console.log('🔄 Registrando usuario:', userData.email);
      const response = await api.post('/auth/register', userData);
      console.log('✅ Registro exitoso:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error en registro:', error.response?.data || error.message);
      throw error; // Propagamos el error para manejarlo en el componente
    }
  },

  // Verificar si email existe
  checkEmailExists: async (email: string) => {
    try {
      console.log('🔄 Verificando email:', email);
      const response = await api.get(`/auth/check-email?email=${encodeURIComponent(email)}`);
      console.log('✅ Email verificado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error verificando email:', error.response?.data || error.message);
      throw error;
    }
  },

  // Login de usuario
  login: async (credentials: {
    email: string;
    password: string;
  }) => {
    try {
      console.log('🔄 Intentando login:', credentials.email);
      const response = await api.post('/auth/login', credentials);
      console.log('✅ Login exitoso:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error en login:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener perfil del usuario autenticado
  getProfile: async (token: string) => {
    try {
      console.log('🔄 Obteniendo perfil del usuario');
      const response = await api.get('/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Perfil obtenido:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error obteniendo perfil:', error.response?.data || error.message);
      throw error;
    }
  },

  // Actualizar perfil del usuario
  updateProfile: async (token: string, profileData: {
    nombre: string;
    email: string;
    currentPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
  }) => {
    try {
      console.log('🔄 Actualizando perfil del usuario:', profileData.email);
      const response = await api.put('/auth/profile', profileData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Perfil actualizado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error actualizando perfil:', error.response?.data || error.message);
      throw error;
    }
  },

  // Eliminar cuenta del usuario
  deleteAccount: async (token: string, password: string) => {
    try {
      console.log('🔄 Eliminando cuenta del usuario');
      const response = await api.delete('/auth/account', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        data: {
          password
        }
      });
      console.log('✅ Cuenta eliminada:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error eliminando cuenta:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener estaciones favoritas del usuario autenticado
  getFavoriteStations: async (token: string) => {
    try {
      console.log('🔄 Obteniendo estaciones favoritas del usuario');
      const response = await api.get('/auth/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Favoritos obtenidos:', response.data.favoriteStationIds?.length || 0);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error obteniendo favoritos:', error.response?.data || error.message);
      throw error;
    }
  },

  // Agregar estación a favoritos
  addFavoriteStation: async (token: string, stationId: number) => {
    try {
      console.log('🔄 Agregando estación a favoritos:', stationId);
      const response = await api.post('/auth/favorites', { stationId }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Estación agregada a favoritos');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error agregando favorito:', error.response?.data || error.message);
      throw error;
    }
  },

  // Eliminar estación de favoritos
  removeFavoriteStation: async (token: string, stationId: number) => {
    try {
      console.log('🔄 Eliminando estación de favoritos:', stationId);
      const response = await api.delete(`/auth/favorites/${stationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Estación eliminada de favoritos');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error eliminando favorito:', error.response?.data || error.message);
      throw error;
    }
  },

  // ==================== GESTIÓN DE USUARIOS (Solo Administradores) ====================
  
  // Obtener todos los usuarios (solo admin)
  getAllUsers: async (token: string) => {
    try {
      console.log('🔄 Obteniendo todos los usuarios');
      const response = await api.get('/auth/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Usuarios obtenidos:', response.data.length || 0);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error obteniendo usuarios:', error.response?.data || error.message);
      throw error;
    }
  },

  // Crear nuevo usuario (solo admin)
  createUser: async (token: string, userData: {
    nombre: string;
    email: string;
    contrasena: string;
    rol: 'admin' | 'usuario';
  }) => {
    try {
      console.log('🔄 Creando usuario:', userData.email);
      const response = await api.post('/auth/users', userData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Usuario creado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error creando usuario:', error.response?.data || error.message);
      throw error;
    }
  },

  // Actualizar usuario (solo admin)
  updateUser: async (token: string, userId: number, userData: {
    nombre?: string;
    email?: string;
    rol?: 'admin' | 'usuario';
    newPassword?: string;
  }) => {
    try {
      console.log('🔄 Actualizando usuario:', userId);
      const response = await api.put(`/auth/users/${userId}`, userData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Usuario actualizado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error actualizando usuario:', error.response?.data || error.message);
      throw error;
    }
  },

  // Eliminar usuario (solo admin)
  deleteUser: async (token: string, userId: number) => {
    try {
      console.log('🔄 Eliminando usuario:', userId);
      const response = await api.delete(`/auth/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Usuario eliminado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error eliminando usuario:', error.response?.data || error.message);
      throw error;
    }
  }
};

export const stationService = {
  // Obtener todas las estaciones
  getAll: async () => {
    try {
      console.log('🔄 Obteniendo estaciones de:', `${API_BASE_URL}/estaciones`);
      const response = await api.get('/estaciones');
      console.log('✅ Estaciones obtenidas:', response.data.length || 0);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al obtener estaciones:', error.response?.data || error.message);
      throw new Error(`Error al obtener las estaciones: ${error.response?.data?.error || error.message}`);
    }
  },

  // Obtener estación por ID
  getById: async (id: number) => {
    try {
      const response = await api.get(`/estaciones/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error al obtener la estación ${id}`);
    }
  },

  // Crear nueva estación
  create: async (stationData: any) => {
    try {
      const response = await api.post('/estaciones', stationData);
      return response.data;
    } catch (error) {
      throw new Error('Error al crear la estación');
    }
  },

  // Actualizar estación
  update: async (id: number, stationData: any) => {
    try {
      const response = await api.put(`/estaciones/${id}`, stationData);
      return response.data;
    } catch (error) {
      throw new Error(`Error al actualizar la estación ${id}`);
    }
  },

  // Eliminar estación
  delete: async (id: number) => {
    try {
      const response = await api.delete(`/estaciones/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error al eliminar la estación ${id}`);
    }
  },
};



// ==================== DISPOSITIVOS ====================

export const deviceService = {
  // Obtener todos los dispositivos
  getAll: async () => {
    try {
      console.log('🔄 Obteniendo dispositivos de:', `${API_BASE_URL}/dispositivos`);
      const response = await api.get('/dispositivos');
      console.log('✅ Dispositivos obtenidos:', response.data.length || 0);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al obtener dispositivos:', error.response?.data || error.message);
      throw new Error(`Error al obtener dispositivos: ${error.response?.data?.error || error.message}`);
    }
  },

  // Crear nuevo dispositivo
  create: async (deviceData: any) => {
    try {
      console.log('🔄 Creando nuevo dispositivo:', deviceData.device_id);
      const response = await api.post('/dispositivos', deviceData);
      console.log('✅ Dispositivo creado exitosamente');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al crear dispositivo:', error.response?.data || error.message);
      throw new Error(`Error al crear dispositivo: ${error.response?.data?.error || error.message}`);
    }
  },

  // Obtener dispositivos disponibles
  getAvailable: async () => {
    try {
      console.log('🔄 Obteniendo dispositivos disponibles');
      const response = await api.get('/dispositivos/disponibles');
      console.log('✅ Dispositivos disponibles obtenidos:', response.data.length || 0);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al obtener dispositivos disponibles:', error.response?.data || error.message);
      throw new Error(`Error al obtener dispositivos disponibles: ${error.response?.data?.error || error.message}`);
    }
  },

  // Obtener dispositivo de una estación
  getByStationId: async (stationId: number) => {
    try {
      const response = await api.get(`/dispositivos/estacion/${stationId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No hay dispositivo asignado
      }
      throw new Error(`Error al obtener dispositivo de la estación: ${error.response?.data?.error || error.message}`);
    }
  },

  // Asignar dispositivo a estación
  assign: async (deviceId: string, stationId: number) => {
    try {
      console.log(`🔄 Asignando dispositivo ${deviceId} a estación ${stationId}`);
      const response = await api.post('/dispositivos/asignar', { 
        deviceId, 
        stationId 
      });
      console.log('✅ Dispositivo asignado exitosamente');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al asignar dispositivo:', error.response?.data || error.message);
      throw new Error(`Error al asignar dispositivo: ${error.response?.data?.error || error.message}`);
    }
  },

  // Liberar dispositivo
  release: async (deviceId: string) => {
    try {
      console.log(`🔄 Liberando dispositivo ${deviceId}`);
      const response = await api.put(`/dispositivos/${deviceId}/liberar`);
      console.log('✅ Dispositivo liberado exitosamente');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al liberar dispositivo:', error.response?.data || error.message);
      throw new Error(`Error al liberar dispositivo: ${error.response?.data?.error || error.message}`);
    }
  },

  // Eliminar dispositivo
  delete: async (deviceId: string) => {
    try {
      console.log(`🔄 Eliminando dispositivo ${deviceId}`);
      const response = await api.delete(`/dispositivos/${deviceId}`);
      console.log('✅ Dispositivo eliminado exitosamente');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al eliminar dispositivo:', error.response?.data || error.message);
      throw new Error(`Error al eliminar dispositivo: ${error.response?.data?.error || error.message}`);
    }
  },
};


// ==================== LECTURAS ====================

// Función auxiliar para normalizar datos de lecturas
const normalizeReadingData = (reading: any) => {
  const toNum = (v: any) => (v !== null && v !== undefined ? Number(v) : null);

  const gas_co2     = toNum(reading.gas_co2);
  const gas_nh3     = toNum(reading.gas_nh3);
  const gas_alcohol = toNum(reading.gas_alcohol);
  const gas_humo    = toNum(reading.gas_humo);
  const gas_benceno = toNum(reading.gas_benceno);
  const gas_acetona = toNum(reading.gas_acetona);

  return {
    ...reading,
    temperatura:      toNum(reading.temperatura),
    humedad:          toNum(reading.humedad),
    presion_at:       toNum(reading.presion_at),
    pressure:         toNum(reading.presion_at),
    velocidad_viento: toNum(reading.velocidad_viento),
    wind:             toNum(reading.velocidad_viento),
    prediccion_temp:  toNum(reading.prediccion_temp),
    raw_timestamp:    toNum(reading.raw_timestamp),
    // Gases MQ135 — null si la lectura no tiene sensor
    gas_co2,
    gas_nh3,
    gas_alcohol,
    gas_humo,
    gas_benceno,
    gas_acetona,
    gas:       gas_co2,  // alias CO2 para mapa de calor
    radiation: null,
  };
};

export const readingService = {
  // Obtener todas las lecturas
  getAll: async () => {
    try {
      const response = await api.get('/lecturas');
      // Normalizar datos para asegurar que valores numéricos sean números
      const normalizedData = response.data.map(normalizeReadingData);
      return normalizedData;
    } catch (error) {
      throw new Error('Error al obtener las lecturas');
    }
  },

  // Obtener lecturas por estación
  getByStation: async (stationId: number) => {
    try {
      const response = await api.get(`/estaciones/${stationId}/lecturas`);
      const normalizedData = Array.isArray(response.data) ? response.data.map(normalizeReadingData) : [];
      return normalizedData;
    } catch (error) {
      throw new Error(`Error al obtener las lecturas de la estación ${stationId}`);
    }
  },

  // Obtener última lectura por estación
  getLatestByStation: async (stationId: number) => {
    try {
      const response = await api.get(`/estaciones/${stationId}/lecturas/latest`);
      return response.data ? normalizeReadingData(response.data) : null;
    } catch (error) {
      throw new Error(`Error al obtener la última lectura de la estación ${stationId}`);
    }
  },

  // Obtener últimas lecturas de todas las estaciones
  getLatestAll: async () => {
    try {
      const response = await api.get('/lecturas/latest');
      const normalizedData = Array.isArray(response.data) ? response.data.map(normalizeReadingData) : [];
      return normalizedData;
    } catch (error) {
      throw new Error('Error al obtener las últimas lecturas de todas las estaciones');
    }
  },

  // Obtener lectura por ID
  getById: async (id: number) => {
    try {
      const response = await api.get(`/lecturas/${id}`);
      return response.data ? normalizeReadingData(response.data) : null;
    } catch (error) {
      throw new Error(`Error al obtener la lectura ${id}`);
    }
  },

  // Crear nueva lectura
  create: async (readingData: any) => {
    try {
      const response = await api.post('/lecturas', readingData);
      return response.data;
    } catch (error) {
      throw new Error('Error al crear la lectura');
    }
  },

  // Obtener estadísticas por estación
  getStats: async () => {
    try {
      const response = await api.get('/estadisticas');
      return response.data;
    } catch (error) {
      throw new Error('Error al obtener las estadísticas');
    }
  },

  // Obtener estadísticas globales
  getGlobalStats: async () => {
    try {
      const response = await api.get('/estadisticas/global');
      return response.data;
    } catch (error) {
      throw new Error('Error al obtener las estadísticas globales');
    }
  },
};

// ==================== PREDICCIÓN ML ====================

export type VariablePrediccion = 'temperatura' | 'humedad' | 'presion' | 'viento';

export interface PuntoPrediccion {
  hora_offset: number;
  datetime: string;
  valor: number;
  temperatura: number;  // alias backward compat
}

export interface VariableInfo {
  nombre: string;
  unidad: string;
  color: string;
  color_om: string;
}

export interface MetricasEntrenamiento {
  mae_celsius: number;
  rmse_celsius: number;
  r2_score: number;
  nivel: string;
  unidad?: string;
}

export interface PrediccionResponse {
  variable: VariablePrediccion;
  variable_info: VariableInfo;
  estacion?: {
    id: number;
    nombre: string;
    ubicacion: string;
    estado: string;
    coordenadas: { lat: number; lon: number };
    lecturas_usadas: number;
  };
  zona?: {
    id: number;
    nombre: string;
    descripcion?: string;
    total_estaciones: number;
    lecturas_usadas: number;
  };
  modelo_local: {
    horizonte_horas: number;
    valor_predicho_final: number;
    temperatura_predicha_final: number;  // alias backward compat
    puntos_ancla: Record<string, number>;
    predicciones: PuntoPrediccion[];
    metricas_entrenamiento: MetricasEntrenamiento | null;
  };
  validacion_openmeteo: {
    disponible: boolean;
    fuente: string;
    variable_om?: string;
    coordenadas: { lat: number; lon: number };
    predicciones: PuntoPrediccion[];
  };
  confianza: {
    nivel: string;
    badge: string;
    mae_diferencia: number | null;
    descripcion: string;
  };
  meta: {
    timestamp: string;
    inputs: { temp_actual: number; humedad: number; presion: number; viento: number };
    lags_reales: boolean;
    lags_usados: number;
    modelos_ejecutados?: number;
  };
}

export const prediccionService = {
  getByEstacion: async (
    estacionId: number,
    horas: 24 | 48 | 72 = 72,
    variable: VariablePrediccion = 'temperatura',
  ): Promise<PrediccionResponse> => {
    try {
      const response = await api.get(`/prediccion/${estacionId}`, { params: { horas, variable } });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al obtener predicción:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Error al obtener la predicción');
    }
  },
  getByZona: async (
    zonaId: number,
    horas: 24 | 48 | 72 = 72,
    variable: VariablePrediccion = 'temperatura',
  ): Promise<PrediccionResponse> => {
    try {
      const response = await api.get(`/prediccion/zona/${zonaId}`, { params: { horas, variable } });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error al obtener predicción de zona:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Error al obtener la predicción de zona');
    }
  },
};

// ==================== ZONAS DE CLIMA ====================

export interface ZonaEstacion {
  id: number;
  nombre: string;
  ubicacion?: string;
  estado: string;
}

export interface ZonaClima {
  id: number;
  nombre: string;
  descripcion?: string;
  total_estaciones: number;
  created_at: string;
  estaciones: ZonaEstacion[];
}

export const zonaService = {
  getAll: async (): Promise<ZonaClima[]> => {
    const response = await api.get('/zonas');
    return response.data;
  },
  getById: async (id: number): Promise<ZonaClima> => {
    const response = await api.get(`/zonas/${id}`);
    return response.data;
  },
  create: async (nombre: string, descripcion?: string): Promise<ZonaClima> => {
    const response = await api.post('/zonas', { nombre, descripcion });
    return response.data;
  },
  update: async (id: number, nombre: string, descripcion?: string): Promise<ZonaClima> => {
    const response = await api.put(`/zonas/${id}`, { nombre, descripcion });
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/zonas/${id}`);
  },
  addEstacion: async (zonaId: number, estacionId: number): Promise<ZonaClima> => {
    const response = await api.post(`/zonas/${zonaId}/estaciones`, { estacion_id: estacionId });
    return response.data;
  },
  removeEstacion: async (zonaId: number, estacionId: number): Promise<ZonaClima> => {
    const response = await api.delete(`/zonas/${zonaId}/estaciones/${estacionId}`);
    return response.data;
  },
};

// ==================== ALERTAS ====================

export type NivelAlerta = 'info' | 'advertencia' | 'critico';
export type CondicionAlerta = '>' | '<' | '>=' | '<=';
export type VariableAlerta =
  | 'temperatura' | 'humedad' | 'presion_at' | 'velocidad_viento'
  | 'gas_co2' | 'gas_nh3' | 'gas_alcohol' | 'gas_humo' | 'gas_benceno' | 'gas_acetona';

export interface ReglaAlerta {
  id: number;
  id_estacion: number;
  id_usuario: number;
  estacion_nombre: string;
  variable: VariableAlerta;
  condicion: CondicionAlerta;
  umbral: number;
  nivel: NivelAlerta;
  nombre: string | null;
  activa: number;
  created_at: string;
}

export interface AlertaEvento {
  id: number;
  id_estacion: number;
  estacion_nombre: string;
  variable: VariableAlerta;
  variable_label?: string;
  variable_unit?: string;
  valor_detectado: number;
  umbral_configurado: number;
  condicion: CondicionAlerta;
  mensaje: string;
  nivel: NivelAlerta;
  leida: number;
  id_regla: number | null;
  created_at: string;
}

export const alertaService = {
  // ── Reglas ──────────────────────────────────────────────────────────────────
  getReglas: async (): Promise<ReglaAlerta[]> => {
    const response = await api.get('/alertas/reglas');
    return response.data;
  },

  getReglasByEstacion: async (id_estacion: number): Promise<ReglaAlerta[]> => {
    const response = await api.get(`/alertas/reglas/estacion/${id_estacion}`);
    return response.data;
  },

  createRegla: async (data: {
    id_estacion: number;
    variable: VariableAlerta;
    condicion: CondicionAlerta;
    umbral: number;
    nivel: NivelAlerta;
    nombre?: string;
  }): Promise<{ id: number; message: string }> => {
    const response = await api.post('/alertas/reglas', data);
    return response.data;
  },

  updateRegla: async (id: number, data: Partial<ReglaAlerta>): Promise<void> => {
    await api.put(`/alertas/reglas/${id}`, data);
  },

  deleteRegla: async (id: number): Promise<void> => {
    await api.delete(`/alertas/reglas/${id}`);
  },

  toggleRegla: async (id: number): Promise<void> => {
    await api.patch(`/alertas/reglas/${id}/toggle`);
  },

  // ── Alertas (eventos) ────────────────────────────────────────────────────────
  getAlertas: async (soloNoLeidas = false): Promise<AlertaEvento[]> => {
    const response = await api.get('/alertas', {
      params: soloNoLeidas ? { leidas: 'false' } : {},
    });
    return response.data;
  },

  verificar: async (): Promise<{ nuevas_alertas: number; alertas: AlertaEvento[] }> => {
    const response = await api.post('/alertas/verificar');
    return response.data;
  },

  marcarLeida: async (id: number): Promise<void> => {
    await api.patch(`/alertas/${id}/leer`);
  },

  marcarTodasLeidas: async (): Promise<void> => {
    await api.patch('/alertas/leer-todas');
  },
};

// ==================== UTILIDADES ====================

export const apiUtils = {
  // Función para obtener datos completos de estaciones con última lectura
  getStationsWithData: async () => {
    try {
      const stations = await stationService.getAll();
      
      // Para cada estación, obtener su última lectura
      const stationsWithData = await Promise.all(
        stations.map(async (station: any) => {
          try {
            const latestReading = await readingService.getLatestByStation(station.id);
            
            return {
              ...station,
              latestReading: latestReading || null,
            };
          } catch (error) {
            console.warn(`Error al obtener datos para la estación ${station.id}:`, error);
            return {
              ...station,
              latestReading: null,
            };
          }
        })
      );
      
      return stationsWithData;
    } catch (error) {
      throw new Error('Error al obtener datos completos de las estaciones');
    }
  },

  // Función para verificar la conexión con la API
  checkConnection: async () => {
    try {
      // Usar un endpoint válido desde /api, o usar la base URL directamente
      // (Dado que usamos API_BASE_URL, si no está disponible fallará)
      const response = await axios.get(API_BASE_URL);
      return response.status === 200;
    } catch (error) {
      console.warn('No se pudo conectar con la API:', error);
      return false;
    }
  },
};

export default api;