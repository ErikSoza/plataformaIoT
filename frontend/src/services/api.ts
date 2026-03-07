import axios from 'axios';

// Configuración base de axios
const API_BASE_URL = 'http://localhost:3000/api';

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
  return {
    ...reading,
    temperatura: reading.temperatura ? Number(reading.temperatura) : null,
    humedad: reading.humedad ? Number(reading.humedad) : null,
    presion_at: reading.presion_at ? Number(reading.presion_at) : null,
    // Mapear presion_at a pressure para compatibilidad con frontend
    pressure: reading.presion_at ? Number(reading.presion_at) : null,
    velocidad_viento: reading.velocidad_viento ? Number(reading.velocidad_viento) : null,
    // Mapear velocidad_viento a wind para compatibilidad con frontend
    wind: reading.velocidad_viento ? Number(reading.velocidad_viento) : null,
    prediccion_temp: reading.prediccion_temp ? Number(reading.prediccion_temp) : null,
    raw_timestamp: reading.raw_timestamp ? Number(reading.raw_timestamp) : null,
    // TODO: Implementar en dispositivo - valores temporales por ahora
    gas: 0.040, // Valor temporal representativo
    radiation: 650, // Valor temporal representativo
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
      // Probar con el endpoint base del servidor (sin /api)
      const response = await axios.get('http://localhost:3000/');
      return response.status === 200;
    } catch (error) {
      console.warn('No se pudo conectar con la API:', error);
      return false;
    }
  },
};

export default api;