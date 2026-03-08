import React, { useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {TabNavigation, MainLayout, TabItem, DeviceData} from '../components/layout';
import UserHeader from '../components/UserHeader';
import { useAuth } from '../contexts/AuthContext';

// Importar páginas separadas
import { MonitoringPage, DevicesPage, ReportsPage, SettingsPage, StationManagementPage, DeviceManagementPage } from './index';

// Importar hook unificado para datos de la API
import { useDeviceData } from '../hooks/useDeviceData';

// Importar datos de ejemplo como fallback
import { deviceData, calculateStats } from '../data/DatosEjemplos';

// Fix para los íconos de Leaflet en React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const Home: React.FC = () => {
  // Hook de autenticación
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Estados del componente
  const [activeTab, setActiveTab] = useState<string>('monitoring');
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | undefined>(undefined);

  // Obtener datos de la API usando hook unificado - DEBE estar al inicio
  const { 
    devices: apiDevices, 
    loading: devicesLoading, 
    error: devicesError,
    isConnected,
    stats 
  } = useDeviceData({
    autoRefresh: true,
    refreshInterval: 30000,
    includeInactive: true
  });

  // Mostrar loading si la autenticación está cargando
  if (authLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>🔄</div>
        <p style={styles.loadingText}>Cargando aplicación...</p>
      </div>
    );
  }

  // Si no está autenticado, mostrar landing page
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // Usar datos de la API si están disponibles, sino usar datos de ejemplo
  const devices = (isConnected && apiDevices.length > 0 ? apiDevices : deviceData) as DeviceData[];
  
  // Usar estadísticas calculadas o fallback
  const currentStats = stats.length > 0 ? stats : calculateStats();

  // Mostrar estado de carga o error si es necesario
  if (devicesLoading && devices === deviceData) {
    console.log('Cargando datos de la API...');
  }
  
  if (devicesError && !isConnected) {
    console.warn('Error al conectar con la API, usando datos de ejemplo:', devicesError);
  }

  // Configuración de tabs con estado dinámico
  const tabs: TabItem[] = [
    { id: 'monitoring', label: 'MONITOREO', active: activeTab === 'monitoring' },
    { id: 'devices', label: 'DISPOSITIVOS', active: activeTab === 'devices' },
    { id: 'stations', label: 'ESTACIONES', active: activeTab === 'stations' },
    { id: 'device-management', label: 'GESTIÓN DISPOSITIVOS', active: activeTab === 'device-management' },
    { id: 'reports', label: 'REPORTES', active: activeTab === 'reports' },
    { id: 'settings', label: 'CONFIGURACIÓN', active: activeTab === 'settings' },
  ];

  // Manejadores de eventos
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId !== 'devices') {
      setSelectedDevice(undefined);
    }
  };

  const handleDeviceSelect = (device: DeviceData) => {
    setSelectedDevice(device);
  };

  const handleDeviceMarkerClick = (device: DeviceData) => {
    setSelectedDevice(device);
    if (activeTab !== 'devices') {
      setActiveTab('devices');
    }
  };

  const handleStatCardClick = (stat: any, index: number) => {
    console.log('Estadística seleccionada:', stat, 'Índice:', index);
  };

  // Renderizar contenido según la pestaña activa
  const renderContent = () => {
    switch (activeTab) {
      case 'monitoring':
        return (
          <MonitoringPage
            devices={devices}
            stats={currentStats}
            selectedDevice={selectedDevice}
            onDeviceMarkerClick={handleDeviceMarkerClick}
            onStatCardClick={handleStatCardClick}
          />
        );

      case 'devices':
        return (
          <DevicesPage
            devices={devices}
            selectedDevice={selectedDevice}
            onDeviceSelect={handleDeviceSelect}
          />
        );

      case 'stations':
        return <StationManagementPage />;

      case 'device-management':
        return <DeviceManagementPage />;

      case 'reports':
        return <ReportsPage />;

      case 'settings':
        return <SettingsPage />;

      default:
        return null;
    }
  };

  // Renderizar la aplicación principal para usuarios autenticados
  return (
    <div style={styles.pageContainer}>
      {/* Header de usuario logueado */}
      <UserHeader />
      

      {/* Indicador de conexión API */}
      <div style={styles.connectionIndicator}>
        <span style={{
          ...styles.connectionDot,
          backgroundColor: isConnected ? '#28a745' : '#ffc107'
        }}></span>
        <span style={styles.connectionText}>
          {isConnected 
            ? `API Conectada - ${apiDevices.length} estaciones` 
            : 'Usando datos de ejemplo - API no disponible'
          }
        </span>
      </div>

      {/* Navegación de pestañas */}
      <TabNavigation tabs={tabs} onTabChange={handleTabChange} />
      {/* Contenido principal */}
      <MainLayout>
        {renderContent()}
      </MainLayout>
    </div>
  );
};

// Componente Landing Page para usuarios no autenticados
const LandingPage: React.FC = () => {
  return (
    <div style={landingStyles.container}>
      <div style={landingStyles.hero}>
        <h1 style={landingStyles.title}>🌐 Plataforma IoT UTalca</h1>
        <p style={landingStyles.subtitle}>
          Sistema de Monitoreo Meteorológico Inteligente
        </p>
        <p style={landingStyles.description}>
          Accede a datos en tiempo real de nuestras estaciones meteorológicas
          distribuidas por el campus universitario.
        </p>
        
        <div style={landingStyles.buttonContainer}>
          <button 
            style={landingStyles.loginButton}
            onClick={() => window.location.href = '/login'}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 188, 212, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            🚀 Iniciar Sesión
          </button>
          
          <button 
            style={landingStyles.registerButton}
            onClick={() => window.location.href = '/register'}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#00ACC1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            📝 Registrarse
          </button>
        </div>
        
        <div style={landingStyles.features}>
          <div style={landingStyles.feature}>
            <span style={landingStyles.featureIcon}>📊</span>
            <h3 style={landingStyles.featureTitle}>Datos en Tiempo Real</h3>
            <p style={landingStyles.featureText}>
              Monitoreo continuo de condiciones meteorológicas
            </p>
          </div>
          
          <div style={landingStyles.feature}>
            <span style={landingStyles.featureIcon}>🗺️</span>
            <h3 style={landingStyles.featureTitle}>Mapas Interactivos</h3>
            <p style={landingStyles.featureText}>
              Visualización geoespacial de todas las estaciones
            </p>
          </div>
          
          <div style={landingStyles.feature}>
            <span style={landingStyles.featureIcon}>📈</span>
            <h3 style={landingStyles.featureTitle}>Reportes Avanzados</h3>
            <p style={landingStyles.featureText}>
              Análisis histórico y tendencias climatológicas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

const styles = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    fontFamily: "'Roboto', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  connectionIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 16px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #dee2e6',
    fontSize: '14px',
    color: '#6c757d',
  },
  connectionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '8px',
    display: 'inline-block',
  },
  connectionText: {
    fontWeight: '500',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #00BCD4 0%, #00ACC1 50%, #0097A7 100%)',
  },
  loadingSpinner: {
    fontSize: '3rem',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px',
  },
  loadingText: {
    color: 'white',
    fontSize: '18px',
    fontWeight: '500' as const,
  }
};

const landingStyles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #00BCD4 0%, #00ACC1 50%, #0097A7 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  hero: {
    textAlign: 'center' as const,
    color: 'white',
    maxWidth: '1000px',
  },
  title: {
    fontSize: '3.5rem',
    fontWeight: 'bold' as const,
    marginBottom: '20px',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
  },
  subtitle: {
    fontSize: '1.5rem',
    marginBottom: '15px',
    opacity: 0.9,
  },
  description: {
    fontSize: '1.1rem',
    marginBottom: '40px',
    opacity: 0.8,
    lineHeight: 1.6,
  },
  buttonContainer: {
    display: 'flex',
    gap: '20px',
    justifyContent: 'center',
    marginBottom: '60px',
    flexWrap: 'wrap' as const,
  },
  loginButton: {
    backgroundColor: '#ffffff',
    color: '#00BCD4',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  registerButton: {
    backgroundColor: 'transparent',
    color: 'white',
    border: '2px solid white',
    padding: '15px 30px',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '30px',
    marginTop: '40px',
  },
  feature: {
    textAlign: 'center' as const,
    padding: '30px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)',
  },
  featureIcon: {
    fontSize: '3rem',
    marginBottom: '15px',
    display: 'block',
  },
  featureTitle: {
    fontSize: '1.3rem',
    marginBottom: '10px',
    fontWeight: '600' as const,
  },
  featureText: {
    fontSize: '1rem',
    opacity: 0.9,
    lineHeight: 1.5,
  }
};