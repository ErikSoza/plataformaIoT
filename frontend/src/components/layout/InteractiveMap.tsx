import React, { useEffect } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { DeviceData } from './ListaDispositivos';

interface InteractiveMapProps {
  devices: DeviceData[];
  selectedDevice?: DeviceData;
  onDeviceMarkerClick?: (device: DeviceData) => void;
  height?: string;
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

const InteractiveMap: React.FC<InteractiveMapProps> = ({ 
  devices, 
  selectedDevice, 
  onDeviceMarkerClick,
  height = '500px'
}) => {
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

  return (
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
  );
};

export default InteractiveMap;