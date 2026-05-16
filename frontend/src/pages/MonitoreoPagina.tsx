import React, { useState } from 'react';
import { ContentSection, StatsGrid, UnifiedMap, DeviceData, StatCardData } from '../components/layout';
import CitySearch from '../components/CitySearch';
import ResumenEstacion from '../components/ResumenEstacion';

interface MonitoringPageProps {
  devices: DeviceData[];
  stats: StatCardData[];
  selectedDevice?: DeviceData;
  onDeviceMarkerClick: (device: DeviceData) => void;
  onStatCardClick: (stat: StatCardData, index: number) => void;
}

const MonitoringPage: React.FC<MonitoringPageProps> = ({
  devices,
  stats,
  selectedDevice,
  onDeviceMarkerClick,
  onStatCardClick
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [shouldCenterToSearch, setShouldCenterToSearch] = useState(false);
  // Estado local: estación activa en el panel de Monitoreo (independiente del estado global)
  const [panelDevice, setPanelDevice] = useState<DeviceData | null>(null);

  // Click en marcador del mapa: actualiza panel local sin cambiar de pestaña
  const handleMapMarkerClick = (device: DeviceData) => {
    setPanelDevice(device);
  };

  // Estación a mostrar: selección local → global → central UTalca por defecto
  const estacionCentral =
    devices.find(d => /central|los niches|campus/i.test(d.name)) ?? devices[0] ?? null;
  const estacionMostrada = panelDevice ?? selectedDevice ?? estacionCentral;
  const esDefecto = !panelDevice && !selectedDevice && estacionMostrada != null;

  // Manejar selección de ubicación desde la búsqueda
  const handleLocationSelect = (coordinates: [number, number], cityName: string) => {
    console.log('🗺️ Navegando a:', cityName, coordinates);
    setMapCenter(coordinates);
    setShouldCenterToSearch(true);
    
    // Resetear el centrado después de un tiempo para permitir navegación libre
    setTimeout(() => setShouldCenterToSearch(false), 3000);
  };

  // Limpiar búsqueda
  const handleClearSearch = () => {
    setMapCenter(null);
    setShouldCenterToSearch(false);
  };
  return (
    <>
      {/* Sección de bienvenida */}
      <div className="stat-card-enter" style={{ ...styles.welcomeSection, animationDelay: '0s' }}>
        <div style={styles.welcomeContent}>
          <h2 style={styles.welcomeTitle}>
            🌡️ Bienvenido al Sistema de Monitoreo Meteorológico UTalca
          </h2>
          <p style={styles.welcomeText}>
            Accede a información meteorológica en tiempo real de nuestra red de estaciones distribuidas 
            por el campus universitario. Monitorea temperatura, humedad, presión atmosférica y más datos 
            ambientales recolectados por nuestros sensores IoT de alta precisión.
          </p>
        </div>
      </div>

      {/* Sección del mapa general */}
      <ContentSection title="🌐 Red de Sensores Ambientales - Campus UTalca">
        {/* Búsqueda inteligente de ciudades */}
        <div style={styles.searchContainer}>
          <CitySearch
            onLocationSelect={handleLocationSelect}
            onClear={handleClearSearch}
            isSearching={shouldCenterToSearch}
          />
        </div>
        
        <UnifiedMap
          devices={devices}
          selectedDevice={panelDevice ?? selectedDevice}
          onDeviceMarkerClick={handleMapMarkerClick}
          enableRedirection={true}
          height="75vh"
          showHeatmapControls={true}
          defaultHeatmapVisible={true}
          defaultHeatmapMetric="temperature"
          searchCenter={mapCenter}
          shouldCenterToSearch={shouldCenterToSearch}
        />
      </ContentSection>

      {/* Panel de condiciones actuales */}
      {estacionMostrada && (
        <div style={{ margin: '0 20px' }}>
          <ResumenEstacion device={estacionMostrada} esDefecto={esDefecto} />
        </div>
      )}

      {/* Sección de estadísticas */}
      <ContentSection title="📊 Panel de Control - Estadísticas en Tiempo Real">
        <StatsGrid stats={stats} onCardClick={onStatCardClick} />
      </ContentSection>

      {/* Panel Acerca de */}
      <div style={styles.aboutSection}>
        <div style={styles.aboutContent}>
          <h3 style={styles.aboutTitle}>ℹ️ Acerca de la Plataforma</h3>
          <div style={styles.aboutGrid}>
            {[
              {
                icon: '🎓',
                title: 'Proyecto Universitario',
                text: 'Desarrollado por estudiantes de la Universidad de Talca para el monitoreo ambiental del campus usando tecnología IoT de última generación.',
                delay: '0.1s',
              },
              {
                icon: '⚡',
                title: 'Tecnología IoT',
                text: 'Red de sensores conectados que recopilan datos meteorológicos cada minuto, transmitidos en tiempo real a través de protocolos de comunicación avanzados.',
                delay: '0.2s',
              },
              {
                icon: '🌱',
                title: 'Impacto Ambiental',
                text: 'Los datos recopilados contribuyen a investigaciones sobre cambio climático y apoyan la toma de decisiones para un campus más sustentable.',
                delay: '0.3s',
              },
              {
                icon: '📱',
                title: 'Acceso Abierto',
                text: 'Información disponible 24/7 para la comunidad universitaria y público general. Regístrate para acceder a funciones avanzadas y reportes detallados.',
                delay: '0.4s',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="about-card-animate"
                style={{ ...styles.aboutCard, animationDelay: card.delay }}
              >
                <div className="about-icon-float" style={styles.aboutCardIcon}>{card.icon}</div>
                <h4 style={styles.aboutCardTitle}>{card.title}</h4>
                <p style={styles.aboutCardText}>{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const styles = {
  welcomeSection: {
    backgroundColor: 'white',
    margin: '0 20px 20px 20px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  welcomeContent: {
    padding: '30px',
    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    borderLeft: '5px solid #00BCD4',
  },
  welcomeTitle: {
    color: '#2c3e50',
    fontSize: '24px',
    fontWeight: '600' as const,
    margin: '0 0 15px 0',
    lineHeight: 1.3,
  },
  welcomeText: {
    color: '#6c757d',
    fontSize: '16px',
    lineHeight: 1.6,
    margin: 0,
  },
  aboutSection: {
    backgroundColor: 'white',
    margin: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  aboutContent: {
    padding: '30px',
  },
  aboutTitle: {
    color: '#2c3e50',
    fontSize: '20px',
    fontWeight: '600' as const,
    margin: '0 0 25px 0',
    textAlign: 'center' as const,
  },
  aboutGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  aboutCard: {
    backgroundColor: '#f8f9fa',
    padding: '25px',
    borderRadius: '10px',
    textAlign: 'center' as const,
    border: '1px solid #e9ecef',
    transition: 'all 0.3s ease',
  },
  aboutCardIcon: {
    fontSize: '2.5rem',
    marginBottom: '15px',
  },
  aboutCardTitle: {
    color: '#00BCD4',
    fontSize: '16px',
    fontWeight: '600' as const,
    margin: '0 0 12px 0',
  },
  aboutCardText: {
    color: '#6c757d',
    fontSize: '14px',
    lineHeight: 1.5,
    margin: 0,
  },
  searchContainer: {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0 20px',
  },
};

export default MonitoringPage;