import React, { useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {UtalcaHeader, TabNavigation, MainLayout, TabItem, DeviceData} from '../components/layout';

// Importar páginas separadas
import { MonitoringPage, DevicesPage, ReportsPage, SettingsPage, StationManagementPage } from './index';

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
  // Estados del componente
  const [activeTab, setActiveTab] = useState<string>('monitoring');
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | undefined>(undefined);

  // Obtener datos de la API usando hook unificado
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

      case 'reports':
        return <ReportsPage />;

      case 'settings':
        return <SettingsPage />;

      default:
        return null;
    }
  };

  return (
    <div style={styles.pageContainer}>
      {/* Header principal con diseño UTalca */}
      <UtalcaHeader
        title="Clima Utalca"
        subtitle="Universidad de Talca - Sistema de Monitoreo IoT"
      />

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
};