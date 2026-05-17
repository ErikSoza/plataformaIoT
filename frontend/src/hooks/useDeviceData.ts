import { useState, useEffect, useCallback, useRef } from 'react';
import { stationService, readingService, apiUtils } from '../services/api';
import { 
  Station, 
  Reading, 
  StatCardData, 
  DeviceData,
  normalizeStationsData,
  filterActiveStations,
  getStationsWithRecentData,
  UseStationsReturn,
  UseStatsReturn,
  UseApiConnectionReturn
} from '../types/unified';

// ==================== HOOK PRINCIPAL UNIFICADO ====================

interface UseDeviceDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  includeInactive?: boolean;
  maxDataAgeHours?: number;
}

interface UseDeviceDataReturn extends UseStationsReturn {
  // Estadísticas
  stats: StatCardData[];
  statsLoading: boolean;
  statsError: string | null;
  
  // Conexión API
  isConnected: boolean | null;
  connectionChecking: boolean;
  
  // Acciones
  refreshStats: () => Promise<void>;
  checkConnection: () => Promise<void>;
  
  // Datos filtrados
  activeStations: Station[];
  recentStations: Station[];
  
  // Lecturas
  getStationReadings: (stationId: number) => Promise<Reading[]>;
  getLatestReading: (stationId: number) => Promise<Reading | null>;
}

/**
 * Hook unificado para el manejo completo de datos de estaciones/dispositivos
 */
export const useDeviceData = (options: UseDeviceDataOptions = {}): UseDeviceDataReturn => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 segundos
    includeInactive = true,
    maxDataAgeHours = 24,
  } = options;

  // Estados principales
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de estadísticas
  const [stats, setStats] = useState<StatCardData[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  
  // Estados de conexión
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [connectionChecking, setConnectionChecking] = useState(false);
  
  // Referencias para intervalos
  const refreshIntervalRef = useRef<number | null>(null);
  const connectionIntervalRef = useRef<number | null>(null);

  // ==================== FUNCIONES DE DATOS ====================

  const fetchStations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Obteniendo datos de estaciones...');
      const rawStationsData = await apiUtils.getStationsWithData();
      const normalizedStations = normalizeStationsData(rawStationsData);
      
      setStations(normalizedStations);
      console.log(`✅ Cargadas ${normalizedStations.length} estaciones`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar estaciones';
      setError(errorMessage);
      console.error('❌ Error al cargar estaciones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateStats = useCallback(async (stationsData: Station[] = stations) => {
    try {
      setStatsLoading(true);
      setStatsError(null);

      // Calcular promedios de métricas
      const calculateAverage = (field: keyof Station): number => {
        const devicesWithData = stationsData.filter(d => 
          d[field] !== undefined && d[field] !== null && !isNaN(Number(d[field]))
        );
        if (devicesWithData.length === 0) return 0;
        return devicesWithData.reduce((sum, d) => sum + Number(d[field]), 0) / devicesWithData.length;
      };
      const avgTemperature = calculateAverage('temperature');
      const avgHumidity = calculateAverage('humidity');
      const avgPressure = calculateAverage('pressure');
      const avgWind = calculateAverage('wind');
      const avgGas = calculateAverage('gas');

      // Intentar obtener estadísticas globales adicionales de la API
      let globalStats: any = {};
      try {
        if (isConnected && stationsData.length > 0) {
          globalStats = await readingService.getGlobalStats();
          console.log('📊 Estadísticas globales obtenidas:', globalStats);
        }
      } catch (error) {
        console.warn('⚠️ No se pudieron obtener estadísticas adicionales:', error);
      }

      const calculatedStats: StatCardData[] = [
        {
          title: 'Temperatura Promedio',
          value: avgTemperature > 0 ? `${avgTemperature.toFixed(1)}°C` : 'N/A',
        },
        {
          title: 'Humedad Promedio',
          value: avgHumidity > 0 ? `${avgHumidity.toFixed(1)}%` : 'N/A',
        },
        {
          title: 'Presión Promedio',
          value: avgPressure > 0 ? `${avgPressure.toFixed(1)} hPa` : 'N/A',
        },
        {
          title: 'Velocidad del Viento',
          value: avgWind > 0 ? `${avgWind.toFixed(1)} km/h` : 'N/A',
        },
        {
          title: 'Calidad del Aire',
          value: avgGas > 0 ? `${avgGas.toFixed(0)} ppm` : 'N/A',
          subtitle: avgGas > 0
            ? avgGas < 600  ? 'CO₂ — Bueno'
            : avgGas < 1000 ? 'CO₂ — Moderada'
            :                 'CO₂ — Elevada'
            : 'CO₂ sin datos',
        },
      ];

      setStats(calculatedStats);
      console.log('📈 Estadísticas calculadas exitosamente');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al calcular estadísticas';
      setStatsError(errorMessage);
      console.error('❌ Error al calcular estadísticas:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [stations, isConnected]);

  const checkConnection = useCallback(async () => {
    try {
      setConnectionChecking(true);
      const connected = await apiUtils.checkConnection();
      setIsConnected(connected);
      
      if (connected) {
        console.log('🔗 Conexión API establecida');
      } else {
        console.warn('🔌 API no disponible');
      }
    } catch (err) {
      setIsConnected(false);
      console.error('❌ Error al verificar conexión:', err);
    } finally {
      setConnectionChecking(false);
    }
  }, []);

  // ==================== FUNCIONES DE LECTURAS ====================

  const getStationReadings = useCallback(async (stationId: number): Promise<Reading[]> => {
    try {
      console.log(`📖 Obteniendo lecturas para estación ${stationId}`);
      const readings = await readingService.getByStation(stationId);
      return readings;
    } catch (error) {
      console.error(`❌ Error al obtener lecturas para estación ${stationId}:`, error);
      throw error;
    }
  }, []);

  const getLatestReading = useCallback(async (stationId: number): Promise<Reading | null> => {
    try {
      console.log(`📖 Obteniendo última lectura para estación ${stationId}`);
      const reading = await readingService.getLatestByStation(stationId);
      return reading;
    } catch (error) {
      console.error(`❌ Error al obtener última lectura para estación ${stationId}:`, error);
      return null;
    }
  }, []);

  // ==================== FUNCIONES DE ACTUALIZACIÓN ====================

  const refreshAll = useCallback(async () => {
    console.log('🔄 Actualizando todos los datos...');
    await Promise.all([
      fetchStations(),
      checkConnection(),
    ]);
  }, [fetchStations, checkConnection]);

  const refreshStats = useCallback(async () => {
    await calculateStats();
  }, [calculateStats]);

  // ==================== EFECTOS ====================

  // Cargar datos iniciales
  useEffect(() => {
    const initializeData = async () => {
      await checkConnection();
      await fetchStations();
    };
    
    initializeData();
  }, [checkConnection, fetchStations]);

  // Calcular estadísticas cuando cambian las estaciones
  useEffect(() => {
    if (stations.length > 0) {
      calculateStats(stations);
    }
  }, [stations, calculateStats]);

  // Configurar auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = window.setInterval(refreshAll, refreshInterval);
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, refreshAll]);

  // Configurar verificación periódica de conexión
  useEffect(() => {
    connectionIntervalRef.current = window.setInterval(checkConnection, 30000); // cada 30 segundos
    
    return () => {
      if (connectionIntervalRef.current) {
        clearInterval(connectionIntervalRef.current);
      }
    };
  }, [checkConnection]);

  // ==================== DATOS FILTRADOS ====================

  const activeStations = filterActiveStations(stations);
  const recentStations = getStationsWithRecentData(stations, maxDataAgeHours);
  const devices: DeviceData[] = includeInactive ? stations : activeStations;

  // ==================== RETURN ====================

  return {
    // Datos principales
    stations,
    devices,
    loading,
    error,
    refetch: fetchStations,
    
    // Estadísticas
    stats,
    statsLoading,
    statsError,
    refreshStats,
    
    // Conexión
    isConnected,
    connectionChecking,
    checkConnection,
    
    // Datos filtrados
    activeStations,
    recentStations,
    
    // Funciones de lecturas
    getStationReadings,
    getLatestReading,
  };
};

// ==================== HOOKS LEGACY (PARA COMPATIBILIDAD) ====================

/**
 * @deprecated Use useDeviceData instead
 */
export const useStations = (): UseStationsReturn => {
  const { stations, devices, loading, error, refetch } = useDeviceData();
  return { stations, devices, loading, error, refetch };
};

/**
 * @deprecated Use useDeviceData instead
 */
export const useStats = (devices: DeviceData[] = []): UseStatsReturn => {
  const { stats, statsLoading, statsError, refreshStats } = useDeviceData();
  
  return {
    stats,
    loading: statsLoading,
    error: statsError,
    recalculate: refreshStats,
  };
};

/**
 * @deprecated Use useDeviceData instead
 */
export const useApiConnection = (): UseApiConnectionReturn => {
  const { isConnected, connectionChecking, checkConnection } = useDeviceData();
  
  return {
    isConnected,
    checking: connectionChecking,
    checkConnection,
  };
};

// ==================== HOOKS ESPECIALIZADOS ====================

/**
 * Hook para lecturas de una estación específica
 */
export const useStationReadings = (stationId: number | null) => {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReadings = useCallback(async () => {
    if (!stationId) {
      setReadings([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const readingsData = await readingService.getByStation(stationId);
      setReadings(readingsData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('❌ Error al cargar lecturas:', err);
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  return {
    readings,
    loading,
    error,
    refetch: fetchReadings,
  };
};

/**
 * Hook para manejo de formularios de creación
 */
export const useCreateStation = () => {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createStation = useCallback(async (stationData: any) => {
    try {
      setCreating(true);
      setError(null);
      
      const result = await stationService.create(stationData);
      console.log('✅ Estación creada exitosamente:', result);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear estación';
      setError(errorMessage);
      console.error('❌ Error al crear estación:', err);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  return {
    createStation,
    creating,
    error,
  };
};

export default useDeviceData;