import React, { useState } from 'react';
import { ContentSection, DeviceList, UnifiedMap, DeviceData } from '../components/layout';
import CitySearch from '../components/CitySearch';

interface DevicesPageProps {
  devices: DeviceData[];
  selectedDevice?: DeviceData;
  onDeviceSelect: (device: DeviceData) => void;
}

const DevicesPage: React.FC<DevicesPageProps> = ({
  devices,
  selectedDevice,
  onDeviceSelect
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [searchedLocation, setSearchedLocation] = useState<string | null>(null);
  const [shouldCenterToSearch, setShouldCenterToSearch] = useState(false);

  // Manejar selección de ubicación desde la búsqueda
  const handleLocationSelect = (coordinates: [number, number], cityName: string) => {
    console.log('🗺️ Navegando a:', cityName, coordinates);
    setMapCenter(coordinates);
    setSearchedLocation(cityName);
    setShouldCenterToSearch(true);
    
    // Reset después de un momento para permitir la animación
    setTimeout(() => {
      setShouldCenterToSearch(false);
    }, 3000);
  };

  // Limpiar búsqueda y volver al centro por defecto
  const handleClearSearch = () => {
    setMapCenter(null);
    setSearchedLocation(null);
    setShouldCenterToSearch(false);
  };

  return (
    <div style={styles.devicesView}>
      {/* Lista de dispositivos con buscador */}
      <div style={styles.deviceListContainer}>
        <ContentSection title="📋 Sensores Ambientales Distribuidos">
          {/* Búsqueda inteligente por ciudad */}
          <div style={styles.searchContainer}>
            <h4 style={styles.searchTitle}>🔍 Explorar Regiones</h4>
            <CitySearch 
              onLocationSelect={handleLocationSelect}
              onClear={handleClearSearch}
            />
            {searchedLocation && (
              <div style={styles.searchStatus}>
                <span style={styles.searchIcon}>📍</span>
                Explorando: <strong>{searchedLocation}</strong>
                <button 
                  onClick={handleClearSearch}
                  style={styles.clearLocationButton}
                  title="Volver al campus"
                >
                  🏠 Volver al Campus
                </button>
              </div>
            )}
          </div>
          
          <DeviceList
            devices={devices}
            selectedDeviceId={selectedDevice?.id}
            onDeviceSelect={onDeviceSelect}
          />
        </ContentSection>
      </div>

      {/* Mapa interactivo con búsqueda */}
      <div style={styles.deviceMapContainer}>
        <ContentSection title={
          searchedLocation 
            ? `🌍 Mapa: ${searchedLocation}` 
            : selectedDevice 
              ? `📍 Ubicación: ${selectedDevice.name}` 
              : "🗺️ Selecciona un Dispositivo o Explora una Ciudad"
        }>
          <SmartMap 
            devices={devices}
            selectedDevice={selectedDevice}
            onDeviceMarkerClick={onDeviceSelect}
            height="500px"
            showHeatmapControls={false}
            searchCenter={mapCenter}
            shouldCenterToSearch={shouldCenterToSearch}
          />
        </ContentSection>
      </div>
    </div>
  );
};

// Componente SmartMap que extiende UnifiedMap con funcionalidad de búsqueda
interface SmartMapProps {
  devices: DeviceData[];
  selectedDevice?: DeviceData;
  onDeviceMarkerClick?: (device: DeviceData) => void;
  height?: string;
  showHeatmapControls?: boolean;
  searchCenter?: [number, number] | null;
  shouldCenterToSearch?: boolean;
}

const SmartMap: React.FC<SmartMapProps> = ({
  devices,
  selectedDevice,
  onDeviceMarkerClick,
  height = '500px',
  showHeatmapControls = false,
  searchCenter,
  shouldCenterToSearch = false
}) => {
  return (
    <div style={{ position: 'relative' }}>
      {/* Indicador de búsqueda activa */}
      {shouldCenterToSearch && searchCenter && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1000,
          background: 'rgba(0, 188, 212, 0.9)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '0.9rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        }}>
          <span>🔍</span>
          Explorando ubicación
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'white',
            animation: 'pulse 1.5s infinite'
          }} />
        </div>
      )}
      
      <UnifiedMap
        devices={devices}
        selectedDevice={selectedDevice}
        onDeviceMarkerClick={onDeviceMarkerClick}
        height={height}
        showHeatmapControls={showHeatmapControls}
        searchCenter={searchCenter}
        shouldCenterToSearch={shouldCenterToSearch}
      />
      
      {/* Estilos CSS para animaciones */}
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const styles = {
  devicesView: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },

  deviceListContainer: {
    minHeight: '600px',
  },

  deviceMapContainer: {
    minHeight: '600px',
  },

  searchContainer: {
    marginBottom: '25px',
    padding: '20px',
    background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
    borderRadius: '15px',
    border: '2px solid #00BCD4',
  },

  searchTitle: {
    margin: '0 0 15px 0',
    color: '#2c3e50',
    fontSize: '1.1rem',
    fontWeight: '600',
  },

  searchStatus: {
    marginTop: '15px',
    padding: '12px 16px',
    background: 'white',
    borderRadius: '10px',
    border: '1px solid #00BCD4',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.95rem',
  },

  searchIcon: {
    fontSize: '1.2rem',
  },

  clearLocationButton: {
    marginLeft: 'auto',
    padding: '6px 12px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
  },
};

export default DevicesPage;