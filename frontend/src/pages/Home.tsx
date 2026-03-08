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
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  
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

  // Función para obtener tabs según el rol del usuario
  const getTabsByRole = (): TabItem[] => {
    // Para visitantes (no autenticados) - Solo vista básica de monitoreo
    if (!isAuthenticated) {
      return [
        { id: 'monitoring', label: 'MONITOREO CLIMA', active: activeTab === 'monitoring' },
      ];
    }

    // Para usuarios registrados
    if (user?.rol === 'usuario') {
      return [
        { id: 'monitoring', label: 'MONITOREO', active: activeTab === 'monitoring' },
        { id: 'devices', label: 'DISPOSITIVOS', active: activeTab === 'devices' },
        { id: 'reports', label: 'REPORTES', active: activeTab === 'reports' },
        { id: 'settings', label: 'CONFIGURACIÓN', active: activeTab === 'settings' },
      ];
    }

    // Para administradores - Acceso completo
    if (user?.rol === 'admin') {
      return [
        { id: 'monitoring', label: 'MONITOREO', active: activeTab === 'monitoring' },
        { id: 'devices', label: 'DISPOSITIVOS', active: activeTab === 'devices' },
        { id: 'stations', label: 'ESTACIONES', active: activeTab === 'stations' },
        { id: 'device-management', label: 'GESTIÓN DISPOSITIVOS', active: activeTab === 'device-management' },
        { id: 'reports', label: 'REPORTES', active: activeTab === 'reports' },
        { id: 'settings', label: 'CONFIGURACIÓN', active: activeTab === 'settings' },
      ];
    }

    // Por defecto, mostrar solo monitoreo
    return [
      { id: 'monitoring', label: 'MONITOREO', active: activeTab === 'monitoring' },
    ];
  };

  // Configuración de tabs con estado dinámico según rol
  const tabs: TabItem[] = getTabsByRole();

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

  // Renderizar contenido según la pestaña activa y rol del usuario
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
        // Solo para usuarios autenticados
        if (!isAuthenticated) {
          return (
            <div style={styles.accessDenied}>
              <h3>🔒 Acceso Restringido</h3>
              <p>Debes iniciar sesión para ver información detallada de dispositivos.</p>
              <button 
                style={styles.accessDeniedBtn}
                onClick={() => window.location.href = '/login'}
              >
                Iniciar Sesión
              </button>
            </div>
          );
        }
        return (
          <DevicesPage
            devices={devices}
            selectedDevice={selectedDevice}
            onDeviceSelect={handleDeviceSelect}
          />
        );

      case 'stations':
        // Solo para administradores
        if (!isAuthenticated || user?.rol !== 'admin') {
          return (
            <div style={styles.accessDenied}>
              <h3>🔒 Acceso Restringido</h3>
              <p>Solo los administradores pueden gestionar estaciones.</p>
            </div>
          );
        }
        return <StationManagementPage />;

      case 'device-management':
        // Solo para administradores
        if (!isAuthenticated || user?.rol !== 'admin') {
          return (
            <div style={styles.accessDenied}>
              <h3>🔒 Acceso Restringido</h3>
              <p>Solo los administradores pueden gestionar dispositivos.</p>
            </div>
          );
        }
        return <DeviceManagementPage />;

      case 'reports':
        // Para usuarios registrados y administradores
        if (!isAuthenticated) {
          return (
            <div style={styles.accessDenied}>
              <h3>🔒 Acceso Restringido</h3>
              <p>Debes iniciar sesión para acceder a los reportes.</p>
              <button 
                style={styles.accessDeniedBtn}
                onClick={() => window.location.href = '/login'}
              >
                Iniciar Sesión
              </button>
            </div>
          );
        }
        return <ReportsPage />;

      case 'settings':
        // Solo para administradores y usuarios
        if (!isAuthenticated || user?.rol !== 'admin' && user?.rol !== 'usuario') {
          return (
            <div style={styles.accessDenied}>
              <h3>🔒 Acceso Restringido</h3>
              <p>Solo los administradores pueden acceder a la configuración.</p>
            </div>
          );
        }
        return <SettingsPage />;

      default:
        return null;
    }
  };

  // Renderizar la aplicación principal
  return (
    <div style={styles.pageContainer}>
      {/* Header condicional según autenticación */}
      {isAuthenticated ? (
        <UserHeader />
      ) : (
        <div style={styles.guestHeader}>
          <div style={styles.guestHeaderContent}>
            <h2 style={styles.guestTitle}>🌐 Plataforma IoT UTalca - Vista Visitante</h2>
            <p style={styles.guestSubtitle}>Datos meteorológicos en tiempo real</p>
            <div style={styles.guestActions}>
              <button 
                style={styles.guestLoginBtn}
                onClick={() => window.location.href = '/login'}
              >
                🚀 Iniciar Sesión
              </button>
              <button 
                style={styles.guestRegisterBtn}
                onClick={() => window.location.href = '/register'}
              >
                📝 Registrarse
              </button>
            </div>
          </div>
        </div>
      )}

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

export default Home;

const styles = {
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    fontFamily: "'Roboto', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  guestHeader: {
    background: 'linear-gradient(135deg, #00BCD4 0%, #00ACC1 50%, #0097A7 100%)',
    padding: '20px 0',
    color: 'white',
    textAlign: 'center' as const,
  },
  guestHeaderContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
  },
  guestTitle: {
    margin: '0 0 8px 0',
    fontSize: '1.8rem',
    fontWeight: '600' as const,
  },
  guestSubtitle: {
    margin: '0 0 20px 0',
    fontSize: '1rem',
    opacity: 0.9,
  },
  guestActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap' as const,
  },
  guestLoginBtn: {
    backgroundColor: '#ffffff',
    color: '#00BCD4',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '5px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  guestRegisterBtn: {
    backgroundColor: 'transparent',
    color: 'white',
    border: '2px solid white',
    padding: '8px 18px',
    borderRadius: '5px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
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
  accessDenied: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center' as const,
    color: '#6c757d',
    backgroundColor: '#fff',
    margin: '20px',
    borderRadius: '8px',
    minHeight: '400px',
  },
  accessDeniedBtn: {
    backgroundColor: '#00BCD4',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500' as const,
    cursor: 'pointer',
    marginTop: '20px',
    transition: 'all 0.3s ease',
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