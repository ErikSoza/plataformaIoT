/*
El componente UnifiedMap utiliza la librería React Leaflet para renderizar un mapa interactivo. Permite a los usuarios ver la ubicación de varios dispositivos, seleccionar un dispositivo para ver más detalles y activar un mapa de calor que visualiza diferentes métricas ambientales (como temperatura, humedad, presión, calidad del aire y radiación solar) basándose en los datos recopilados por los dispositivos. El componente también incluye controles para personalizar la visualización del mapa de calor, como elegir la métrica a mostrar y activar o desactivar el mapa de calor.
*/

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { DeviceData } from './ListaDispositivos';
import HeatMapLayer from './MapaCalor';
import MapLegend from '../MapLegend';
import ForecastTimeSlider from '../ForecastTimeSlider';
import { prediccionService, PuntoPrediccion } from '../../services/api';

// ── Overlay de lluvia animada sobre el mapa ────────────────────────
interface RainOverlayProps { intensity: number; /* 0-100 */ }
const RainOverlay: React.FC<RainOverlayProps> = ({ intensity }) => {
  if (intensity < 10) return null;

  // Escalar parámetros según intensidad
  const i        = intensity / 100;
  const gap1     = Math.max(5,  22 - i * 17);  // gap entre gotas capa 1
  const gap2     = Math.max(10, 38 - i * 28);  // gap entre gotas capa 2
  const gap3     = Math.max(18, 55 - i * 37);  // gap entre gotas capa 3
  const alpha1   = Math.min(0.45, i * 0.5);
  const alpha2   = Math.min(0.22, i * 0.25);
  const alpha3   = Math.min(0.18, i * 0.2);
  const speed1   = Math.max(0.18, 0.65 - i * 0.47);
  const speed2   = Math.max(0.28, 0.95 - i * 0.67);
  const speed3   = Math.max(0.12, 0.45 - i * 0.33);
  const mist     = i > 0.6;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none', zIndex: 998,
      overflow: 'hidden', borderRadius: 'inherit',
    }}>
      {/* Capa 1 — gotas medianas (ángulo 108°) */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(
          108deg,
          transparent 0px, transparent ${gap1}px,
          rgba(174,214,241,${alpha1}) ${gap1}px, rgba(174,214,241,${alpha1}) ${gap1 + 1.2}px
        )`,
        backgroundSize: '300px 300px',
        animation: `rainFallMain ${speed1}s linear infinite`,
      }} />
      {/* Capa 2 — gotas finas (ángulo 105°) */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(
          105deg,
          transparent 0px, transparent ${gap2}px,
          rgba(140,200,230,${alpha2}) ${gap2}px, rgba(140,200,230,${alpha2}) ${gap2 + 0.8}px
        )`,
        backgroundSize: '200px 200px',
        animation: `rainFallSecondary ${speed2}s linear infinite`,
      }} />
      {/* Capa 3 — gotas gruesas (ángulo 112°) */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(
          112deg,
          transparent 0px, transparent ${gap3}px,
          rgba(100,170,220,${alpha3}) ${gap3}px, rgba(100,170,220,${alpha3}) ${gap3 + 2}px
        )`,
        backgroundSize: '400px 400px',
        animation: `rainFallHeavy ${speed3}s linear infinite`,
      }} />
      {/* Niebla (lluvia intensa) */}
      {mist && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(174,214,241,0.06)',
          animation: 'mistDrift 6s ease-in-out infinite',
        }} />
      )}
    </div>
  );
};

// Configuración de métricas disponibles
const MetricaVariables = {
  temperature: {
    id: 'temperature',
    name: 'Temperatura',
    icon: '🌡️',
    unit: '°C',
    description: 'Temperatura ambiente',
    color: '#FF6B35',
    gradient: ['#0066cc', '#33cc33', '#ffff00', '#ff6600', '#cc0000']
  },
  humidity: {
    id: 'humidity',
    name: 'Humedad y Lluvia',
    icon: '💧',
    unit: '%',
    description: 'Humedad relativa y probabilidad de lluvia',
    color: '#00BCD4',
    gradient: ['#f7fbff', '#deebf7', '#9ecae1', '#6baed6', '#08519c']
  },
  pressure: {
    id: 'pressure',
    name: 'Presión (Avanzado)',
    icon: '🌫️',
    unit: 'hPa',
    description: 'Presión atmosférica avanzada',
    color: '#9C27B0',
    gradient: ['#800026', '#bd0026', '#e31a1c', '#fc4e2a', '#feb24c']
  },
  wind: {
    id: 'wind',
    name: 'Velocidad del Viento',
    icon: '💨',
    unit: 'm/s',
    description: 'Velocidad del viento',
    color: '#3182bd',
    gradient: ['#f7fbff', '#9ecae1', '#3182bd', '#08306b']
  },
  gas: {
    id: 'gas',
    name: 'Calidad del Aire',
    icon: '🌪️',
    unit: 'ppm CO₂',
    description: 'CO₂ como indicador de calidad del aire',
    color: '#4CAF50',
    gradient: ['#00c853', '#80cc28', '#ffee58', '#ff8f00', '#d50000']
  },
  radiation: {
    id: 'radiation',
    name: 'Radiación Solar',
    icon: '☀️',
    unit: 'W/m²',
    description: 'Radiación solar (temporal)',
    color: '#FF9800',
    gradient: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#f03b20']
  }
} as const;

// Componente de selector dinámico de métricas
interface MetricSelectorProps {
  selectedMetric: 'temperature' | 'humidity' | 'pressure' | 'wind' | 'gas' | 'radiation';
  onMetricChange: (metric: 'temperature' | 'humidity' | 'pressure' | 'wind' | 'gas' | 'radiation') => void;
}

const MetricSelector: React.FC<MetricSelectorProps> = ({ selectedMetric, onMetricChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleMetricSelect = (metricId: typeof selectedMetric) => {
    onMetricChange(metricId);
    setIsOpen(false);
  };

  const selectedConfig = MetricaVariables[selectedMetric];

  return (
    <div style={{ position: 'relative', marginBottom: '10px' }}>
      <div style={{ marginBottom: '8px', fontSize: '0.9rem', fontWeight: 'bold', color: '#333' }}>
        Parámetro a visualizar:
      </div>
      
      {/* Botón selector principal */} 
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 10px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          border: `2px solid ${selectedConfig.color}`,
          borderRadius: '12px',
          cursor: 'pointer',
          minHeight: '50px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Indicador de color de fondo */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            background: selectedConfig.color,
          }}
        />
        
        {/* Contenido del selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1 }}>
          <span style={{ fontSize: '1.5em' }}>{selectedConfig.icon}</span>
          <div>
            <div style={{ fontWeight: '600', color: '#2c3e50', fontSize: '0.95em' }}>
              {selectedConfig.name}
            </div>
            <div style={{ fontSize: '0.75em', color: '#7f8c8d', marginTop: '2px' }}>
              {selectedConfig.description}
            </div>
          </div>
        </div>
        {/* Flecha indicadora */}
        <div style={{
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease',
          color: selectedConfig.color,
          fontWeight: 'bold',
          fontSize: '1.2em'
        }}>
          ▼
        </div>
      </div>

      {/* Dropdown de opciones */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 1001,
            marginTop: '4px', 
            maxHeight: '300px',
            overflowY: 'auto',
            animation: 'slideDown 0.3s ease-out',
            overflowX: 'hidden',
          }}
        >
          {Object.values(MetricaVariables).map((config) => (
            <div
              key={config.id}
              onClick={() => handleMetricSelect(config.id)}
              style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 16px',
          cursor: 'pointer',
          borderBottom: '1px solid #f0f0f0',
          transition: 'all 0.2s ease',
          background: selectedMetric === config.id 
            ? `linear-gradient(135deg, ${config.color}15, ${config.color}25)` 
            : 'white',
          position: 'relative'
              }}
              onMouseEnter={(e) => {
          if (selectedMetric !== config.id) {
            e.currentTarget.style.background = '#f8f9fa';
          }
              }}
              onMouseLeave={(e) => {
          if (selectedMetric !== config.id) {
            e.currentTarget.style.background = 'white';
          }
              }}
            >
              {/* Indicador de selección */}
              {selectedMetric === config.id && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '3px',
              background: config.color,
            }}
          />
              )}
              
              {/* Icono */}
              <span style={{ fontSize: '1.4em', minWidth: '24px' }}>{config.icon}</span>
              
              {/* Información de la métrica */}
              <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: selectedMetric === config.id ? '600' : '500', 
            color: selectedMetric === config.id ? config.color : '#2c3e50',
            fontSize: '0.9em'
          }}>
            {config.name}
          </div>
          {/* Descripción y unidad */}
          <div style={{ 
            fontSize: '0.75em', 
            color: '#7f8c8d',
            marginTop: '2px'
          }}>
            {config.description} • {config.unit}
          </div>
              </div>
              
              {/* Gradient preview */}
              <div style={{ display: 'flex', gap: '2px' }}>
          {config.gradient.map((color, index) => (
            <div
              key={index}
              style={{
                width: '8px',
                height: '20px',
                background: color,
                borderRadius: index === 0 ? '4px 0 0 4px' : 
                index === config.gradient.length - 1 ? '0 4px 4px 0' : '0'
              }}
            />
          ))}
              </div>
              
              {/* Check icon para seleccionado */}
              {selectedMetric === config.id && (
          <div style={{ 
            color: config.color, 
            fontWeight: 'bold',
            marginLeft: '8px'
          }}>
            ✓
          </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Estilos CSS para animación */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

interface UnifiedMapProps {
  devices: DeviceData[];
  selectedDevice?: DeviceData;
  onDeviceMarkerClick?: (device: DeviceData) => void;
  height?: string;
  // Nuevas props para controlar funcionalidades
  showHeatmapControls?: boolean;
  defaultHeatmapVisible?: boolean;
  defaultHeatmapMetric?: 'temperature' | 'humidity' | 'pressure' | 'wind' | 'gas' | 'radiation';
  // Nueva prop para controlar si se ejecuta la redirección o solo el centrado
  enableRedirection?: boolean;
  // Nuevas props para actualización automática
  autoRefresh?: boolean; // Si debe refrescar automáticamente
  refreshInterval?: number; // Intervalo en milisegundos (default: 30000 = 30 segundos)
  onDataRefresh?: () => void; // Función callback para refrescar los datos desde el componente padre
  // Nueva prop para detectar cambios automáticamente
  enableAutoDetection?: boolean; // Si debe detectar cambios automáticamente
  // Nuevas props para búsqueda inteligente por ciudad
  searchCenter?: [number, number] | null; // Centro basado en búsqueda
  shouldCenterToSearch?: boolean; // Si debe centrar hacia la búsqueda
}

// Componente para manejar el cambio de centro del mapa SOLO cuando el usuario selecciona un dispositivo o busca una ubicación
const MapController: React.FC<{ 
  center: [number, number]; 
  shouldCenter: boolean; 
  searchCenter?: [number, number] | null; 
  shouldCenterToSearch?: boolean;
}> = ({ center, shouldCenter, searchCenter, shouldCenterToSearch }) => {
  const map = useMap();
  
  useEffect(() => {
    // Priorizar búsqueda sobre selección de dispositivo
    if (shouldCenterToSearch && searchCenter) {
      map.flyTo(searchCenter, 12, {
        animate: true,
        duration: 2.0
      });
    } else if (shouldCenter) {
      // Solo centrar el mapa si shouldCenter es true (selección manual de dispositivo)
      map.flyTo(center, 16, {
        animate: true,
        duration: 1.5
      });
    }
  }, [center, map, shouldCenter, searchCenter, shouldCenterToSearch]);
  
  return null;
};

// Componente para invalidar el tamaño del mapa cuando cambia el modo de pantalla completa
const FullscreenResizer: React.FC<{ isFullscreen: boolean }> = ({ isFullscreen }) => {
  const map = useMap();
  
  useEffect(() => {
    // Retraso ligero para permitir que los estilos CSS se apliquen antes de recalcular
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timeout);
  }, [isFullscreen, map]);

  return null;
};

// componente que renderiza el mapa
const UnifiedMap: React.FC<UnifiedMapProps> = ({ 
  devices, 
  selectedDevice, 
  onDeviceMarkerClick,
  height = '500px',  
  showHeatmapControls = true,
  defaultHeatmapVisible = false,
  defaultHeatmapMetric = 'temperature',
  enableRedirection = false, // Por defecto NO redirige, solo centra el mapa
  autoRefresh = false, // Por defecto NO refresca automáticamente
  refreshInterval = 30000, // 30 segundos por defecto
  onDataRefresh,
  enableAutoDetection = true, // Por defecto SÍ detecta cambios automáticamente
  searchCenter = null, // Centro de búsqueda
  shouldCenterToSearch = false // Si debe centrar hacia búsqueda
}) => {
  const [showHeatmap] = useState(true);
  const [showTemperatureLabels] = useState(true);
  const [heatmapMetric, setHeatmapMetric] = useState<'temperature' | 'humidity' | 'pressure' | 'wind' | 'gas' | 'radiation'>(defaultHeatmapMetric);
  const [shouldCenterMap, setShouldCenterMap] = useState(false); // Nuevo estado para controlar cuándo centrar el mapa
  const [internalSelectedDevice, setInternalSelectedDevice] = useState<DeviceData | undefined>(selectedDevice); // Estado interno para manejar la selección
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date()); // Estado para trackear la última actualización
  const [previousDevicesLength, setPreviousDevicesLength] = useState<number>(devices.length); // Para detectar cambios en dispositivos
  
  // Estados para pantalla completa
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  // ── Estados del modo predicción temporal ─────────────────────────
  const [forecastMode,      setForecastMode]      = useState(false);
  const [forecastOffset,    setForecastOffset]    = useState(0);        // horas (0–72)
  const [forecastHorizon,   setForecastHorizon]   = useState<24|48|72>(72);
  const [forecastData,      setForecastData]      = useState<Map<number, PuntoPrediccion[]>>(new Map());
  const [forecastLoading,   setForecastLoading]   = useState(false);
  const [isPlayingForecast, setIsPlayingForecast] = useState(false);

  // Efecto para escuchar cambios de pantalla completa del navegador
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (mapWrapperRef.current?.requestFullscreen) {
        mapWrapperRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Centro por defecto (Campus UTalca)
  const defaultCenter: [number, number] = [-35.0020711, -71.2288796];

  // Usar el dispositivo seleccionado interno o el externo
  const currentSelectedDevice = internalSelectedDevice || selectedDevice;

  // ── Dispositivos con valores de predicción aplicados ─────────────
  const forecastDevices = useMemo<DeviceData[]>(() => {
    if (!forecastMode || forecastOffset === 0 || forecastData.size === 0) return devices;
    return devices.map(device => {
      const preds = forecastData.get(device.id);
      if (!preds || preds.length === 0) return device;
      // Encontrar la predicción más cercana al offset solicitado
      const pred = preds.reduce((best, p) =>
        Math.abs(p.hora_offset - forecastOffset) < Math.abs(best.hora_offset - forecastOffset) ? p : best
      );
      const tempDelta = pred.temperatura - (device.temperature ?? 20);
      return {
        ...device,
        temperature: parseFloat(pred.temperatura.toFixed(1)),
        // Humedad estimada: relación inversa aproximada con temperatura
        humidity: device.humidity != null
          ? Math.min(100, Math.max(0, parseFloat((device.humidity - tempDelta * 1.8).toFixed(0))))
          : device.humidity,
      };
    });
  }, [devices, forecastMode, forecastOffset, forecastData]);

  // ── Probabilidad de lluvia promedio (impulsa RainOverlay) ─────────
  const avgRainProbability = useMemo(() => {
    const src = forecastMode ? forecastDevices : devices;
    const valid = src.filter(d => d.temperature != null && d.humidity != null);
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, d) => {
      let prob = 0;
      const p  = d.pressure ?? 1013;
      const rh = d.humidity ?? 50;
      const t  = d.temperature ?? 20;
      if (p < 1000) prob += 50; else if (p < 1010) prob += 30; else if (p < 1015) prob += 10;
      if (rh > 85)  prob += 30; else if (rh > 70)  prob += 15;
      try {
        const alpha = 17.271, beta = 237.7;
        const gamma = (alpha * t) / (beta + t) + Math.log(rh / 100);
        const dew   = (beta * gamma) / (alpha - gamma);
        const spr   = t - dew;
        if (spr < 2) prob += 20; else if (spr < 4) prob += 10;
      } catch {}
      return acc + Math.min(100, Math.max(0, prob));
    }, 0);
    return sum / valid.length;
  }, [devices, forecastDevices, forecastMode]);

  // ── Cargar predicciones de todas las estaciones activas ──────────
  const loadForecastData = useCallback(async (horizon: 24|48|72) => {
    const activeDevices = devices.filter(
      d => d.status === 'Activo'
    );
    if (activeDevices.length === 0) return;

    setForecastLoading(true);
    try {
      const results = await Promise.allSettled(
        activeDevices.map(d => prediccionService.getByEstacion(d.id, horizon))
      );
      const newMap = new Map<number, PuntoPrediccion[]>();
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          newMap.set(activeDevices[i].id, result.value.modelo_local.predicciones);
        }
      });
      setForecastData(newMap);
      setForecastMode(true);
      setForecastOffset(0);
      // En modo predicción forzamos temperatura (es lo que el modelo predice)
      setHeatmapMetric('temperature');
    } catch (e) {
      console.error('[Forecast] Error cargando predicciones:', e);
    } finally {
      setForecastLoading(false);
    }
  }, [devices]);

  // ── Auto-avance de la línea de tiempo ────────────────────────────
  useEffect(() => {
    if (!isPlayingForecast || !forecastMode) return;
    const id = setInterval(() => {
      setForecastOffset(prev => {
        if (prev >= forecastHorizon) {
          setIsPlayingForecast(false);
          return 0;
        }
        return prev + 1;
      });
    }, 350); // 1 hora cada 350 ms → 72h en ~25 s
    return () => clearInterval(id);
  }, [isPlayingForecast, forecastMode, forecastHorizon]);
  
  // Determinar el centro del mapa - priorizar búsqueda, luego dispositivo seleccionado, luego por defecto
  const mapCenter = shouldCenterToSearch && searchCenter ? searchCenter : 
                   currentSelectedDevice ? currentSelectedDevice.coordinates : 
                   defaultCenter;

  // Función para refrescar los datos manualmente
  const handleManualRefresh = () => {
    if (onDataRefresh) {
      onDataRefresh();
      setLastRefresh(new Date());
    }
  };

  // Auto-refresh usando useEffect con setInterval
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    
    if (autoRefresh && onDataRefresh) {
      intervalId = setInterval(() => {
        onDataRefresh();
        setLastRefresh(new Date());
      }, refreshInterval);
    }
    
    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval, onDataRefresh]);

  // Detectar cambios automáticamente cuando cambia el número de dispositivos
  useEffect(() => {
    if (enableAutoDetection && onDataRefresh && devices.length !== previousDevicesLength) {
      // Solo refrescar si el número de dispositivos cambió y no es la carga inicial
      if (previousDevicesLength !== 0) {
        console.log('🔄 Detectado cambio en dispositivos - Actualizando automáticamente');
        onDataRefresh();
        setLastRefresh(new Date());
      }
      setPreviousDevicesLength(devices.length);
    }
  }, [devices.length, previousDevicesLength, enableAutoDetection, onDataRefresh]);

  // Detectar cuando la página vuelve a estar visible (para refrescar datos al volver)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      // Si la página vuelve a estar visible y han pasado más de 30 segundos, refrescar
      if (isVisible && enableAutoDetection && onDataRefresh) {
        const timeSinceLastRefresh = Date.now() - lastRefresh.getTime();
        if (timeSinceLastRefresh > 30000) { // 30 segundos
          console.log('📱 Página visible - Actualizando datos automáticamente');
          onDataRefresh();
          setLastRefresh(new Date());
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enableAutoDetection, onDataRefresh, lastRefresh]);

  // Detectar cambios en localStorage/sessionStorage (para cambios entre pestañas)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Si detectamos cambios en almacenamiento relacionados con estaciones/dispositivos
      if (enableAutoDetection && onDataRefresh && 
          (e.key?.includes('device') || e.key?.includes('station') || e.key?.includes('estacion'))) {
        console.log('💾 Detectado cambio en almacenamiento - Actualizando datos');
        setTimeout(() => {
          onDataRefresh();
          setLastRefresh(new Date());
        }, 500); // Reducido a 500ms para respuesta más rápida
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [enableAutoDetection, onDataRefresh]);

  // Detectar cambios más frecuentemente cuando enableAutoDetection está activo
  useEffect(() => {
    let quickCheckInterval: ReturnType<typeof setInterval>;
    
    if (enableAutoDetection && onDataRefresh) {
      quickCheckInterval = setInterval(() => {
        // Check rápido cada 5 segundos cuando está activa la detección automática
        const timeSinceLastRefresh = Date.now() - lastRefresh.getTime();
        if (timeSinceLastRefresh > 5000) { // Si han pasado más de 5 segundos
          onDataRefresh();
          setLastRefresh(new Date());
        }
      }, 5000); // Cada 5 segundos
    }
    
    return () => {
      if (quickCheckInterval) {
        clearInterval(quickCheckInterval);
      }
    };
  }, [enableAutoDetection, onDataRefresh, lastRefresh]);

  // Manejar click en dispositivo internamente
  const handleDeviceClick = (device: DeviceData) => {
    setInternalSelectedDevice(device);
    setShouldCenterMap(true);
    
    // Desactivar el centrado después de la animación
    setTimeout(() => setShouldCenterMap(false), 2000);
    
    // Solo llamar la función del padre si la redirección está habilitada
    if (enableRedirection && onDeviceMarkerClick) {
      onDeviceMarkerClick(device);
    }
  };

  // Solo activar el centrado cuando hay un selectedDevice nuevo desde el exterior
  useEffect(() => {
    if (selectedDevice && selectedDevice.id !== internalSelectedDevice?.id) {
      setInternalSelectedDevice(selectedDevice);
      setShouldCenterMap(true);
      // Desactivar después de un breve momento para permitir la animación
      const timeout = setTimeout(() => setShouldCenterMap(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [selectedDevice, internalSelectedDevice?.id]); // Usar selectedDevice completo para satisfacer react-hooks/exhaustive-deps

  const getMarkerColor = (device: DeviceData, isSelected: boolean) => {
    if (isSelected) return '#FF6B35'; // Naranja para seleccionado
    
    switch (device.status) {
      case 'Activo': return '#28a745';
      case 'Inactivo': return '#6c757d';
      case 'Mantenimiento': return '#ffc107';
      case 'Error': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Crear un ícono personalizado para los marcadores
  const createCustomIcon = (color: string, isSelected: boolean) => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="
          background-color: ${color};
          width: ${isSelected ? '20px' : '15px'};
          height: ${isSelected ? '20px' : '15px'};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ${isSelected ? 'animation: pulse 2s infinite;' : ''}
        "></div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
        </style>
      `,
      iconSize: [isSelected ? 26 : 21, isSelected ? 26 : 21],
      iconAnchor: [isSelected ? 13 : 10.5, isSelected ? 13 : 10.5]
    });
  };
  // Función para encontrar la fecha de actualización en diferentes campos posibles
  const findLastUpdateDate = (device: any) => {
    // Lista de posibles campos de fecha en orden de prioridad
    const possibleDateFields = [
      'lastUpdate', 
      'last_update', 
      'fecha_actualizacion',
      'fecha_registro',
      'timestamp', 
      'created_at', 
      'updated_at',
      'fecha',
      'date'
    ];
    
    for (const field of possibleDateFields) {
      if (device[field] && device[field] !== 'undefined') {
        return device[field];
      }
    }
    
    // Si no encuentra campos de fecha, usar una fecha por defecto reciente
    return new Date().toISOString();
  };

  // Formatear la fecha de la última actualización
  const formatLastUpdate = (deviceOrDateString: any) => {
    try {
      let dateString;
      
      // Si es un dispositivo completo, buscar la fecha
      if (typeof deviceOrDateString === 'object' && deviceOrDateString !== null && !(deviceOrDateString instanceof Date)) {
        dateString = findLastUpdateDate(deviceOrDateString);
      } else {
        dateString = deviceOrDateString;
      }
      
      let date: Date;
      
      // Si ya es un objeto Date
      if (dateString instanceof Date) {
        date = dateString;
      } else {
        // Intentar parsear el string
        date = new Date(dateString);
      }
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return 'Datos sin timestamp';
      }
      
      const formattedDate = date.toLocaleString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      return formattedDate;
    } catch (error) {
      return 'Error en formato de fecha';
    }
  };
  
  
  return (
    <div 
      ref={mapWrapperRef} 
      style={{ 
        position: 'relative', 
        height: isFullscreen ? '100vh' : 'auto',
        width: isFullscreen ? '100vw' : 'auto',
        backgroundColor: '#f8f9fa'
      }}
    >
      {/* Botón de Pantalla Completa */}
      <button
        onClick={toggleFullscreen}
        style={{
          position: 'absolute',
          top: '10px',
          left: '50px',
          zIndex: 1000,
          background: 'white',
          border: '2px solid rgba(0,0,0,0.2)',
          borderRadius: '4px',
          width: '34px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 1px 5px rgba(0,0,0,0.65)',
          fontSize: '18px'
        }}
        title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
      >
        {isFullscreen ? '↩️' : '⬆️'}
      </button>

      {/* Controles del Mapa de Calor - Solo mostrar si está habilitado */}
      {showHeatmapControls && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'rgba(255,255,255,0.97)',
          padding: '14px 16px',
          borderRadius: '14px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.16)',
          width: '285px',
          border: '1px solid rgba(0,188,212,0.2)',
        }}>
          <div style={{
            marginBottom: '14px',
            paddingBottom: '10px',
            borderBottom: '2px solid rgba(0,188,212,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '1.2rem' }}>🗺️</span>
            <strong style={{ color: '#00BCD4', fontSize: '1.05rem' }}>Mapa de Calor</strong>
          </div>

          {/* Control de actualización manual */}
          {onDataRefresh && (
            <div style={{ 
              marginBottom: '15px',
              borderBottom: '1px solid #e9ecef',
              paddingBottom: '10px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                  🔄 Actualización de datos
                </span>
                <button
                  onClick={handleManualRefresh}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Actualizar datos manualmente"
                >
                  🔄 Actualizar
                </button>
              </div>
              
              {/* Indicador de última actualización */}
              <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                <span>Última actualización:</span><br />
                <span>{formatLastUpdate(lastRefresh)}</span>
                <div style={{ marginTop: '4px' }}>
                  {autoRefresh && (
                    <span style={{ color: '#28a745' }}>
                      🔄 Auto-actualización cada {refreshInterval/1000}s
                    </span>
                  )}
                  {enableAutoDetection && (
                    <span style={{ 
                      color: '#007bff', 
                      marginLeft: autoRefresh ? '8px' : '0px' 
                    }}>
                      ⚡ Detección cada 5s
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* ── Modo Predicción Temporal ──────────────────────── */}
          <div style={{
            marginBottom: '14px',
            borderBottom: '1px solid #e9ecef',
            paddingBottom: '12px',
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2c3e50', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔮</span> Predicción Temporal
            </div>
            {!forecastMode ? (
              <button
                onClick={() => loadForecastData(forecastHorizon)}
                disabled={forecastLoading || devices.filter(d => d.status === 'Activo').length === 0}
                style={{
                  width:         '100%',
                  padding:       '8px 12px',
                  background:    forecastLoading
                    ? '#e9ecef'
                    : 'linear-gradient(135deg, #0d1b2a, #0f3460)',
                  color:         forecastLoading ? '#6c757d' : '#00BCD4',
                  border:        '1px solid #00BCD4',
                  borderRadius:  '8px',
                  fontSize:      '0.8rem',
                  fontWeight:    600,
                  cursor:        forecastLoading ? 'not-allowed' : 'pointer',
                  display:       'flex',
                  alignItems:    'center',
                  justifyContent:'center',
                  gap:           '6px',
                }}
              >
                {forecastLoading ? '⏳ Cargando…' : '▶ Ver evolución climática'}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="forecast-active-badge" style={{
                  background:   'rgba(0,188,212,0.1)',
                  border:       '1px solid rgba(0,188,212,0.4)',
                  borderRadius: '8px',
                  padding:      '6px 10px',
                  fontSize:     '0.78rem',
                  color:        '#00BCD4',
                  textAlign:    'center',
                  fontWeight:   600,
                }}>
                  🔮 Predicción activa: +{forecastOffset}h
                </div>
                <button
                  onClick={() => { setForecastMode(false); setForecastOffset(0); setIsPlayingForecast(false); }}
                  style={{
                    padding:      '5px',
                    background:   'rgba(220,53,69,0.08)',
                    border:       '1px solid rgba(220,53,69,0.3)',
                    color:        '#dc3545',
                    borderRadius: '6px',
                    fontSize:     '0.75rem',
                    cursor:       'pointer',
                  }}
                >
                  ✕ Volver a tiempo real
                </button>
              </div>
            )}
          </div>

          {/* Fecha del mapa de calor*/}
          {showHeatmap && devices.length > 0 && !forecastMode && (
            <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#6c757d' }}>
              <strong>Última actualización del mapa de calor:</strong><br />
              {formatLastUpdate(devices[0])}
            </div>
          )}
          {/* Selector de Métrica Dinámico */}
          {showHeatmap && (
            <MetricSelector
              selectedMetric={heatmapMetric}
              onMetricChange={setHeatmapMetric}
            />
          )}

        </div>
      )}

      {/* Mapa */}
      <div style={{ 
        height: isFullscreen ? '100%' : height, 
        width: '100%', 
        borderRadius: isFullscreen ? '0px' : '10px', 
        overflow: 'hidden',
        position: 'relative'
      }}>
        <LeafletMapContainer
          center={mapCenter}
          zoom={20}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <MapController 
            center={mapCenter} 
            shouldCenter={shouldCenterMap} 
            searchCenter={searchCenter}
            shouldCenterToSearch={shouldCenterToSearch}
          />
          <FullscreenResizer isFullscreen={isFullscreen} />
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Capa del Mapa de Calor — usa forecastDevices en modo predicción */}
          {showHeatmapControls && (
            <HeatMapLayer
              devices={forecastDevices}
              metric={heatmapMetric}
              visible={showHeatmap}
              showLabels={showTemperatureLabels}
            />
          )}
          {/* Marcadores para todos los dispositivos */}
          {devices.map((device) => {
            const isSelected = currentSelectedDevice?.id === device.id;
            const markerColor = getMarkerColor(device, isSelected);
            
            return (
              <Marker
                key={device.id}
                position={device.coordinates}
                icon={createCustomIcon(markerColor, isSelected)}
                eventHandlers={{
                  click: () => handleDeviceClick(device),
                }}
              >
                <Popup>
                  <div style={{ padding: '8px 10px', minWidth: '160px', maxWidth: '200px' }}>
                    <div style={{
                      fontWeight: 'bold',
                      color: '#00BCD4',
                      fontSize: '1rem',
                      marginBottom: '6px',
                    }}>
                      📡 {device.name}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#6c757d', marginBottom: '8px' }}>
                      #{device.id.toString().padStart(3, '0')} ·{' '}
                      <span style={{ color: getMarkerColor(device, false), fontWeight: 600 }}>
                        {device.status === 'Activo' ? '🟢' : device.status === 'Inactivo' ? '⚫' : device.status === 'Mantenimiento' ? '🟡' : '🔴'}
                        {' '}{device.status}
                      </span>
                    </div>
                    {(device.temperature !== undefined || device.humidity !== undefined) && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                        {device.temperature !== undefined && (
                          <span style={{ background: '#f0f4ff', padding: '3px 8px', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600 }}>
                            🌡️ {device.temperature}°C
                          </span>
                        )}
                        {device.humidity !== undefined && (
                          <span style={{ background: '#f0faff', padding: '3px 8px', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600 }}>
                            💧 {device.humidity}%
                          </span>
                        )}
                      </div>
                    )}
                    <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#bbb' }}>
                      {formatLastUpdate(device)}
                    </div>
                    <button
                      onClick={() => {
                        const el = document.getElementById('panel-predicciones');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      style={{
                        marginTop: '8px',
                        width: '100%',
                        padding: '5px 0',
                        background: 'linear-gradient(135deg, #00BCD4, #0097A7)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        letterSpacing: '0.2px',
                      }}
                    >
                      Ver predicciones ↓
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </LeafletMapContainer>
        
        {/* ── Overlay de lluvia animada ──────────────────────────── */}
        <RainOverlay intensity={avgRainProbability} />

        {/* ── Badge de predicción activa (visible sobre el mapa) ─── */}
        {forecastMode && forecastOffset > 0 && (
          <div style={{
            position:       'absolute',
            bottom:         '12px',
            left:           '50%',
            transform:      'translateX(-50%)',
            zIndex:         999,
            background:     'linear-gradient(135deg, rgba(13,27,42,0.92), rgba(15,52,96,0.92))',
            backdropFilter: 'blur(8px)',
            border:         '1px solid rgba(0,188,212,0.5)',
            borderRadius:   '20px',
            padding:        '6px 18px',
            display:        'flex',
            alignItems:     'center',
            gap:            '10px',
            color:          'white',
            fontSize:       '0.82rem',
            pointerEvents:  'none',
            boxShadow:      '0 4px 20px rgba(0,0,0,0.4)',
          }}>
            <span style={{ color: '#00BCD4', fontWeight: 700 }}>🔮 +{forecastOffset}h</span>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>|</span>
            <span>
              {new Date(Date.now() + forecastOffset * 3_600_000).toLocaleString('es-CL', {
                weekday: 'short', day: 'numeric', month: 'short',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
            {avgRainProbability >= 20 && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>|</span>
                <span style={{ color: '#29B6F6' }}>
                  {avgRainProbability >= 70 ? '🌧️' : avgRainProbability >= 40 ? '🌦️' : '⛅'}
                  {' '}{Math.round(avgRainProbability)}% lluvia
                </span>
              </>
            )}
          </div>
        )}

        {/* Leyenda de colores del mapa de calor */}
        {showHeatmapControls && showHeatmap && (
          <MapLegend variableActiva={heatmapMetric} />
        )}
      </div>

      {/* ── Barra de control de predicción temporal ───────────────── */}
      <ForecastTimeSlider
        isVisible={forecastMode}
        isLoading={forecastLoading}
        hasData={forecastData.size > 0}
        offset={forecastOffset}
        maxHours={forecastHorizon}
        currentHorizon={forecastHorizon}
        isPlaying={isPlayingForecast}
        rainProbability={avgRainProbability}
        baseTime={new Date()}
        onOffsetChange={setForecastOffset}
        onPlayPause={() => setIsPlayingForecast(p => !p)}
        onExit={() => {
          setForecastMode(false);
          setForecastOffset(0);
          setIsPlayingForecast(false);
        }}
        onHorizonChange={h => {
          setForecastHorizon(h);
          loadForecastData(h);
        }}
        onLoad={() => loadForecastData(forecastHorizon)}
      />
    </div>
  );
};

export default UnifiedMap;