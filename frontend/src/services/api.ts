import axios from 'axios';

// Configuración base de axios
const API_BASE_URL = 'http://localhost:3000/api';

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

// ==================== SENSORES ====================

export const sensorService = {
  // Obtener todos los sensores
  getAll: async () => {
    try {
      const response = await api.get('/sensores');
      return response.data;
    } catch (error) {
      throw new Error('Error al obtener los sensores');
    }
  },

  // Obtener sensores por estación
  getByStation: async (stationId: number) => {
    try {
      const response = await api.get(`/estaciones/${stationId}/sensores`);
      return response.data;
    } catch (error) {
      throw new Error(`Error al obtener los sensores de la estación ${stationId}`);
    }
  },

  // Obtener sensor por ID
  getById: async (id: number) => {
    try {
      const response = await api.get(`/sensores/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error al obtener el sensor ${id}`);
    }
  },

  // Crear nuevo sensor
  create: async (sensorData: any) => {
    try {
      const response = await api.post('/sensores', sensorData);
      return response.data;
    } catch (error) {
      throw new Error('Error al crear el sensor');
    }
  },

  // Actualizar sensor
  update: async (id: number, sensorData: any) => {
    try {
      const response = await api.put(`/sensores/${id}`, sensorData);
      return response.data;
    } catch (error) {
      throw new Error(`Error al actualizar el sensor ${id}`);
    }
  },

  // Eliminar sensor
  delete: async (id: number) => {
    try {
      const response = await api.delete(`/sensores/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error al eliminar el sensor ${id}`);
    }
  },
};

// ==================== LECTURAS ====================

export const readingService = {
  // Obtener todas las lecturas
  getAll: async () => {
    try {
      const response = await api.get('/lecturas');
      return response.data;
    } catch (error) {
      throw new Error('Error al obtener las lecturas');
    }
  },

  // Obtener lecturas por sensor
  getBySensor: async (sensorId: number) => {
    try {
      const response = await api.get(`/sensores/${sensorId}/lecturas`);
      return response.data;
    } catch (error) {
      throw new Error(`Error al obtener las lecturas del sensor ${sensorId}`);
    }
  },

  // Obtener lecturas por estación
  getByStation: async (stationId: number) => {
    try {
      const response = await api.get(`/estaciones/${stationId}/lecturas`);
      return response.data;
    } catch (error) {
      throw new Error(`Error al obtener las lecturas de la estación ${stationId}`);
    }
  },

  // Obtener últimas lecturas por estación
  getLatestByStation: async (stationId: number) => {
    try {
      const response = await api.get(`/estaciones/${stationId}/lecturas/latest`);
      return response.data;
    } catch (error) {
      throw new Error(`Error al obtener las últimas lecturas de la estación ${stationId}`);
    }
  },

  // Obtener lectura por ID
  getById: async (id: number) => {
    try {
      const response = await api.get(`/lecturas/${id}`);
      return response.data;
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

  // Obtener estadísticas
  getStats: async () => {
    try {
      const response = await api.get('/estadisticas');
      return response.data;
    } catch (error) {
      throw new Error('Error al obtener las estadísticas');
    }
  },
};

// ==================== UTILIDADES ====================

export const apiUtils = {
  // Función para obtener datos completos de estaciones con sensores y lecturas
  getStationsWithData: async () => {
    try {
      const stations = await stationService.getAll();
      
      // Para cada estación, obtener sus sensores y últimas lecturas
      const stationsWithData = await Promise.all(
        stations.map(async (station: any) => {
          try {
            const sensors = await sensorService.getByStation(station.id);
            const latestReadings = await readingService.getLatestByStation(station.id);
            
            return {
              ...station,
              sensors,
              latestReadings,
            };
          } catch (error) {
            console.warn(`Error al obtener datos para la estación ${station.id}:`, error);
            return {
              ...station,
              sensors: [],
              latestReadings: [],
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