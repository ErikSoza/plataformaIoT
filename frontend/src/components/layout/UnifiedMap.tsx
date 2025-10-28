import React, { useState, useEffect } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { DeviceData } from './ListaDispositivos';
import HeatMapLayer from './MapaCalor';

interface UnifiedMapProps {
  devices: DeviceData[];
  selectedDevice?: DeviceData;
  onDeviceMarkerClick?: (device: DeviceData) => void;
  height?: string;
  // Nuevas props para controlar funcionalidades
  showHeatmapControls?: boolean;
  defaultHeatmapVisible?: boolean;
  defaultHeatmapMetric?: 'temperature' | 'humidity' | 'pressure' | 'gas' | 'radiation';
}

// Componente para manejar el cambio de centro del mapa
const MapController: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    map.flyTo(center, 16, {
      animate: true,
      duration: 1.5
    });
  }, [center, map]);
  
  return null;
};

const UnifiedMap: React.FC<UnifiedMapProps> = ({ 
  devices, 
  selectedDevice, 
  onDeviceMarkerClick,
  height = '500px',
  showHeatmapControls = true,
  defaultHeatmapVisible = false,
  defaultHeatmapMetric = 'temperature'
}) => {
  const [showHeatmap, setShowHeatmap] = useState(defaultHeatmapVisible);
  const [heatmapMetric, setHeatmapMetric] = useState<'temperature' | 'humidity' | 'pressure' | 'gas' | 'radiation'>(defaultHeatmapMetric);

  // Centro por defecto (Campus UTalca)
  const defaultCenter: [number, number] = [-35.0020711, -71.2288796];
  const mapCenter = selectedDevice ? selectedDevice.coordinates : defaultCenter;

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

  const formatLastUpdate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-CL');
    } catch {
      return dateString;
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'temperature': return '🌡️';
      case 'humidity': return '💧';
      case 'pressure': return '🌫️';
      case 'gas': return '🌪️';
      case 'radiation': return '☀️';
      default: return '📊';
    }
  };

  const getMetricName = (metric: string) => {
    switch (metric) {
      case 'temperature': return 'Temperatura';
      case 'humidity': return 'Humedad';
      case 'pressure': return 'Presión';
      case 'gas': return 'Calidad del Aire';
      case 'radiation': return 'Radiación Solar';
      default: return 'Métrica';
    }
  };

  const getLegendColors = (metric: string) => {
    switch (metric) {
      case 'temperature':
        return { low: 'blue', high: 'red' };
      case 'humidity':
        return { low: '#f7fbff', high: '#08519c' };    
      case 'pressure':
        return { low: '#800026', high: '#feb24c' };
      case 'gas':
        return { low: '#00ff00', high: '#ff0000' };
      case 'radiation':
        return { low: '#ffffcc', high: '#f03b20' };
      default:
        return { low: '#cccccc', high: '#333333' };
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Controles del Mapa de Calor - Solo mostrar si está habilitado */}
      {showHeatmapControls && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'white',
          padding: '15px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          minWidth: '200px'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <strong style={{ color: '#00BCD4' }}>🗺️ Mapa de Calor</strong>
          </div>
          
          {/* Toggle del Mapa de Calor */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
              <span>Mostrar Mapa de Calor</span>
            </label>
          </div>

          {/* Selector de Métrica */}
          {showHeatmap && (
            <div>
              <div style={{ marginBottom: '8px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                Métrica a visualizar:
              </div>
              {['temperature', 'humidity', 'pressure', 'gas', 'radiation'].map((metric) => (
                <label key={metric} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  cursor: 'pointer',
                  marginBottom: '5px'
                }}>
                  <input
                    type="radio"
                    name="heatmapMetric"
                    value={metric}
                    checked={heatmapMetric === metric}
                    onChange={(e) => setHeatmapMetric(e.target.value as 'temperature' | 'humidity' | 'pressure' | 'gas' | 'radiation')}
                  />
                  <span>
                    {getMetricIcon(metric)} {getMetricName(metric)}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Leyenda del Mapa de Calor */}
          {showHeatmap && (
            <div style={{ 
              marginTop: '10px', 
              padding: '8px', 
              background: '#f8f9fa', 
              borderRadius: '5px',
              fontSize: '0.8rem'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                Leyenda - {getMetricName(heatmapMetric)}:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                <div style={{ 
                  width: '15px', 
                  height: '15px', 
                  background: getLegendColors(heatmapMetric).low,
                  borderRadius: '3px'
                }}></div>
                <span>Bajo</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ 
                  width: '15px', 
                  height: '15px', 
                  background: getLegendColors(heatmapMetric).high,
                  borderRadius: '3px'
                }}></div>
                <span>Alto</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mapa */}
      <div style={{ height, width: '100%', borderRadius: '10px', overflow: 'hidden' }}>
        <LeafletMapContainer
          center={mapCenter}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <MapController center={mapCenter} />
          
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
            />
          )}

          {/* Marcadores para todos los dispositivos */}
          {devices.map((device) => {
            const isSelected = selectedDevice?.id === device.id;
            const markerColor = getMarkerColor(device, isSelected);
            
            return (
              <Marker
                key={device.id}
                position={device.coordinates}
                icon={createCustomIcon(markerColor, isSelected)}
                eventHandlers={{
                  click: () => onDeviceMarkerClick?.(device),
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
                      {formatLastUpdate(device.lastUpdate)}
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
      </div>
    </div>
  );
};

export default UnifiedMap;