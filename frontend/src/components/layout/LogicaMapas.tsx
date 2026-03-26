/*
El componente UnifiedMap utiliza la librería React Leaflet para renderizar un mapa interactivo. Permite a los usuarios ver la ubicación de varios dispositivos, seleccionar un dispositivo para ver más detalles y activar un mapa de calor que visualiza diferentes métricas ambientales (como temperatura, humedad, presión, calidad del aire y radiación solar) basándose en los datos recopilados por los dispositivos. El componente también incluye controles para personalizar la visualización del mapa de calor, como elegir la métrica a mostrar y activar o desactivar el mapa de calor.
*/

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { DeviceData } from './ListaDispositivos';
import HeatMapLayer from './MapaCalor';
import MapLegend from '../MapLegend';

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
    unit: 'ppm',
    description: 'Calidad del aire y gases (temporal)',
    color: '#4CAF50',
    gradient: ['#00ff00', '#80ff00', '#ffff00', '#ff8000', '#ff0000']
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
  const [showHeatmap, setShowHeatmap] = useState(defaultHeatmapVisible);
  const [showTemperatureLabels, setShowTemperatureLabels] = useState(true); // Nuevo estado para etiquetas
  const [heatmapMetric, setHeatmapMetric] = useState<'temperature' | 'humidity' | 'pressure' | 'wind' | 'gas' | 'radiation'>(defaultHeatmapMetric);
  const [shouldCenterMap, setShouldCenterMap] = useState(false); // Nuevo estado para controlar cuándo centrar el mapa
  const [internalSelectedDevice, setInternalSelectedDevice] = useState<DeviceData | undefined>(selectedDevice); // Estado interno para manejar la selección
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date()); // Estado para trackear la última actualización
  const [previousDevicesLength, setPreviousDevicesLength] = useState<number>(devices.length); // Para detectar cambios en dispositivos
  
  // Estados para pantalla completa
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapWrapperRef = useRef<HTMLDivElement>(null);

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
  // Obtener configuración de la métrica seleccionada
  const getMetricConfig = (metric: string) => {
    return MetricaVariables[metric as keyof typeof MetricaVariables] || MetricaVariables.temperature;
  };
  
  // Obtener colores para la leyenda del mapa de calor
  const getLegendColors = (metric: string) => {
    const config = getMetricConfig(metric);
    const gradient = config.gradient;
    return { 
      low: gradient[0], 
      high: gradient[gradient.length - 1],
      gradient: gradient
    };
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
          background: 'white',
          padding: '10px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          minWidth: '200px'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <strong style={{ color: '#00BCD4' }}>🗺️ Mapa de Calor</strong>
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

          {/* Controles de activación */}
          <div style={{ marginBottom: '15px' }}>
            {/* Toggle Mapa de Calor */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              marginBottom: '8px' 
            }}>
              <input 
                type="checkbox" 
                id="heatmap-toggle"
                checked={showHeatmap} 
                onChange={(e) => setShowHeatmap(e.target.checked)}
                style={{
                  accentColor: '#00BCD4',
                  transform: 'scale(1.2)'
                }}
              />
              <label htmlFor="heatmap-toggle" style={{ 
                fontSize: '0.9rem', 
                fontWeight: '500',
                cursor: 'pointer'
              }}>
                Mostrar círculos de temperatura
              </label>
            </div>
            
            {/* Toggle Etiquetas de Temperatura */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px' 
            }}>
              <input 
                type="checkbox" 
                id="labels-toggle"
                checked={showTemperatureLabels} 
                onChange={(e) => setShowTemperatureLabels(e.target.checked)}
                style={{
                  accentColor: '#FF6B35',
                  transform: 'scale(1.2)'
                }}
              />
              <label htmlFor="labels-toggle" style={{ 
                fontSize: '0.9rem', 
                fontWeight: '500',
                cursor: 'pointer'
              }}>
                Mostrar valores sobre el mapa
              </label>
            </div>
          </div>

          {/* Fecha del mapa de calor*/}
          {showHeatmap && devices.length > 0 && (
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

          {/* Leyenda del Mapa de Calor Mejorada */}
          {showHeatmap && (
            <div style={{ 
              marginTop: '5px' ,  
              padding: '5px',
              background: 'white', 
              fontSize: '0.8rem',
            }}>
              <div style={{ 
                fontWeight: 'bold', 
                marginBottom: '8px',
                color: '#2c3e50',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>{getMetricConfig(heatmapMetric).icon}</span>
                Leyenda - {getMetricConfig(heatmapMetric).name}
              </div>
              
              {/* Gradient bar */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ 
                  height: '12px',
                  borderRadius: '6px',
                  background: `linear-gradient(to right, ${getLegendColors(heatmapMetric).gradient.join(', ')})`,
                  border: '1px solid #dee2e6',
                  position: 'relative'
                }}>

                  {/* Marcadores en el gradiente */}
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    left: '0',
                    right: '0',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ width: '2px', height: '20px', background: '#6c757d' }} />
                    <div style={{ width: '2px', height: '20px', background: '#6c757d' }} />
                  </div>
                </div>
                
                {/* Labels del gradiente */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginTop: '6px',
                  fontSize: '0.75em',
                  color: '#6c757d'
                }}>
                  <span>
                    {heatmapMetric === 'temperature' && '0°C'}
                    {heatmapMetric === 'humidity' && '0%'}
                    {heatmapMetric === 'pressure' && '1000 hPa'}
                    {heatmapMetric === 'wind' && '0 m/s'}
                    {heatmapMetric === 'gas' && '0 ppm'}
                    {heatmapMetric === 'radiation' && '0 W/m²'}
                  </span>
                  <span>
                    {heatmapMetric === 'temperature' && '40°C'}
                    {heatmapMetric === 'humidity' && '100%'}
                    {heatmapMetric === 'pressure' && '1020 hPa'}
                    {heatmapMetric === 'wind' && '20 m/s'}
                    {heatmapMetric === 'gas' && '0.1 ppm'}
                    {heatmapMetric === 'radiation' && '1000 W/m²'}
                  </span>
                </div>
              </div>
            </div>
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

          {/* Capa del Mapa de Calor - Solo mostrar si está habilitado */}
          {showHeatmapControls && (
            <HeatMapLayer 
              devices={devices} 
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
                  <div style={{ padding: '10px', minWidth: '200px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      marginBottom: '10px',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      color: '#00BCD4'
                    }}>
                      📡 {device.name}
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <strong>📍 Ubicación:</strong> {device.location}
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <strong>🆔 Sensor:</strong> #{device.id.toString().padStart(3, '0')}
                    </div>
                    
                    <div style={{ 
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <strong>Estado:</strong>
                      <span style={{ 
                        color: getMarkerColor(device, false),
                        fontWeight: 'bold'
                      }}>
                        {device.status === 'Activo' && '🟢'}
                        {device.status === 'Inactivo' && '⚫'}
                        {device.status === 'Mantenimiento' && '🟡'}
                        {device.status === 'Error' && '🔴'}
                        {' '}{device.status}
                      </span>
                    </div>
                    
                    <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#6c757d' }}>
                      <strong>Última actualización:</strong><br />
                      {formatLastUpdate(device)}
                    </div>

                    {/* Métricas adicionales */}
                    {(device.temperature || device.humidity || device.battery) && (
                      <div style={{ 
                        borderTop: '1px solid #e9ecef', 
                        paddingTop: '8px',
                        display: 'flex',
                        flexWrap: 'wrap' as const,
                        gap: '8px'
                      }}>
                        {device.temperature && (
                          <span style={{ 
                            background: '#f8f9fa', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}>
                            🌡️ {device.temperature}°C
                          </span>
                        )}
                        {device.humidity && (
                          <span style={{ 
                            background: '#f8f9fa', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}>
                            💧 {device.humidity}%
                          </span>
                        )}
                        {device.battery && (
                          <span style={{ 
                            background: '#f8f9fa', 
                            padding: '2px 6px', 
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}>
                            🔋 {device.battery}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </LeafletMapContainer>
        
        {/* Leyenda de colores del mapa de calor */}
        {showHeatmapControls && showHeatmap && (
          <MapLegend variableActiva={heatmapMetric} />
        )}
      </div>
    </div>
  );
};

export default UnifiedMap;