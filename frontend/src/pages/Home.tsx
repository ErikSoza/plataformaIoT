import React, { useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  UtalcaHeader, 
  TabNavigation, 
  MainLayout,
  TabItem, 
  DeviceData
} from '../components/layout';

// Importar páginas separadas
import { MonitoringPage, DevicesPage, ReportsPage, SettingsPage } from './index';

// Importar datos de ejemplo
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

  // Obtener datos y estadísticas
  const devices = deviceData;
  const stats = calculateStats();

  // Configuración de tabs con estado dinámico
  const tabs: TabItem[] = [
    { id: 'monitoring', label: 'MONITOREO', active: activeTab === 'monitoring' },
    { id: 'devices', label: 'DISPOSITIVOS', active: activeTab === 'devices' },
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
            stats={stats}
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
};