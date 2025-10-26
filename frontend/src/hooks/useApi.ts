import { useState, useEffect, useCallback } from 'react';
import {stationService, readingService, apiUtils} from '../services/api';
import {DeviceData, EstacionCompleta, StatCardData, transformEstacionesToDevices} from '../types';

// Hook principal para datos de estaciones
export const useStations = () => {
  const [stations, setStations] = useState<EstacionCompleta[]>([]);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const stationsData = await apiUtils.getStationsWithData();
      setStations(stationsData);
      
      // Transformar a formato compatible con componentes existentes
      const devicesData = transformEstacionesToDevices(stationsData);
      setDevices(devicesData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error al cargar estaciones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  return {
    stations,
    devices,
    loading,
    error,
    refetch: fetchStations,
  };
};

// Hook para estadísticas
export const useStats = (devices: DeviceData[] = []) => {
  const [stats, setStats] = useState<StatCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Estadísticas básicas de dispositivos
      const activeDevices = devices.filter(d => d.status === 'Activo').length;
      const totalDevices = devices.length;
      
      // Calcular temperatura promedio
      const devicesWithTemp = devices.filter(d => d.temperature !== undefined);
      const avgTemperature = devicesWithTemp.length > 0
        ? devicesWithTemp.reduce((sum, d) => sum + (d.temperature || 0), 0) / devicesWithTemp.length
        : 0;

      // Calcular humedad promedio
      const devicesWithHumidity = devices.filter(d => d.humidity !== undefined);
      const avgHumidity = devicesWithHumidity.length > 0
        ? devicesWithHumidity.reduce((sum, d) => sum + (d.humidity || 0), 0) / devicesWithHumidity.length
        : 0;

      // Calcular batería promedio
      const devicesWithBattery = devices.filter(d => d.battery !== undefined);
      const avgBattery = devicesWithBattery.length > 0
        ? devicesWithBattery.reduce((sum, d) => sum + (d.battery || 0), 0) / devicesWithBattery.length
        : 0;

      const calculatedStats: StatCardData[] = [
        {
          title: 'Dispositivos Activos',
          value: `${activeDevices}/${totalDevices}`,
          icon: '🔌',
        },
        {
          title: 'Temperatura Promedio',
          value: avgTemperature > 0 ? `${avgTemperature.toFixed(1)}°C` : 'N/A',
          icon: '🌡️',
        },
        {
          title: 'Humedad Promedio',
          value: avgHumidity > 0 ? `${avgHumidity.toFixed(1)}%` : 'N/A',
          icon: '💧',
        },
        {
          title: 'Batería Promedio',
          value: avgBattery > 0 ? `${avgBattery.toFixed(0)}%` : 'N/A',
          icon: '🔋',
        },
      ];

      setStats(calculatedStats);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al calcular estadísticas';
      setError(errorMessage);
      console.error('Error al calcular estadísticas:', err);
    } finally {
      setLoading(false);
    }
  }, [devices]);

  useEffect(() => {
    if (devices.length > 0) {
      calculateStats();
    }
  }, [devices, calculateStats]);

  return {
    stats,
    loading,
    error,
    recalculate: calculateStats,
  };
};

// Hook para lecturas de una estación específica
export const useStationReadings = (stationId: number | null) => {
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReadings = useCallback(async () => {
    if (!stationId) return;

    try {
      setLoading(true);
      setError(null);
      
      const readingsData = await readingService.getByStation(stationId);
      setReadings(readingsData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('Error al cargar lecturas:', err);
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

// Hook para verificar conectividad con la API
export const useApiConnection = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      setChecking(true);
      const connected = await apiUtils.checkConnection();
      setIsConnected(connected);
    } catch (err) {
      setIsConnected(false);
      console.error('Error al verificar conexión:', err);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
    
    // Verificar cada 30 segundos
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, [checkConnection]);

  return {
    isConnected,
    checking,
    checkConnection,
  };
};

// Hook para manejo de formularios de creación
export const useCreateStation = () => {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createStation = useCallback(async (stationData: any) => {
    try {
      setCreating(true);
      setError(null);
      
      const result = await stationService.create(stationData);
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear estación';
      setError(errorMessage);
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