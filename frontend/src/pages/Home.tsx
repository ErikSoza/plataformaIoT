import React, { useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  UtalcaHeader, 
  TabNavigation, 
  MainLayout, 
  ContentSection, 
  StatsGrid, 
  DeviceList,
  InteractiveMap,
  TabItem, 
  StatCardData,
  DeviceData
} from '../components/layout';

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

  // Datos de sensores IoT - Todos manejan temperatura, humedad y batería
  const deviceData: DeviceData[] = [
    {
      id: 1,
      name: 'Sensor Centro Extensión Curicó',
      type: 'Sensor Ambiental IoT',
      status: 'Activo',
      lastUpdate: '2025-10-07 14:30',
      location: 'Centro de Extensión Curicó',
      coordinates: [-34.9849294, -71.2406668],
      temperature: 22.5,
      humidity: 65,
      battery: 87
    },
    {
      id: 2,
      name: 'Sensor Facultad Ingeniería',
      type: 'Sensor Ambiental IoT',
      status: 'Activo',
      lastUpdate: '2025-10-07 14:28',
      location: 'Facultad de Ingeniería',
      coordinates: [-35.0017581, -71.2297514],
      temperature: 24.1,
      humidity: 58,
      battery: 92
    },
    {
      id: 3,
      name: 'Sensor Biblioteca Central',
      type: 'Sensor Ambiental IoT',
      status: 'Mantenimiento',
      lastUpdate: '2025-10-07 12:15',
      location: 'Biblioteca Central',
      coordinates: [-35.0029305, -71.2292251],
      temperature: 20.8,
      humidity: 72,
      battery: 23
    },
    {
      id: 4,
      name: 'Sensor Edificio Mecánica',
      type: 'Sensor Ambiental IoT',
      status: 'Error',
      lastUpdate: '2025-10-07 11:45',
      location: 'Edificio de Mecánica',
      coordinates: [-35.0020822, -71.2291337],
      temperature: undefined,
      humidity: undefined,
      battery: 12
    },
    {
      id: 5,
      name: 'Sensor Cerro Condel',
      type: 'Sensor Ambiental IoT',
      status: 'Activo',
      lastUpdate: '2025-10-07 14:35',
      location: 'Cerro Condel',
      coordinates: [-34.9779525,-71.2260893], //Cerro Condel Curico
      temperature: 21.3,
      humidity: 68,
      battery: 76
    }
  ];

  // Configuración de tabs con estado dinámico
  const tabs: TabItem[] = [
    { id: 'monitoring', label: 'MONITOREO', active: activeTab === 'monitoring' },
    { id: 'devices', label: 'DISPOSITIVOS', active: activeTab === 'devices' },
    { id: 'reports', label: 'REPORTES', active: activeTab === 'reports' },
    { id: 'settings', label: 'CONFIGURACIÓN', active: activeTab === 'settings' },
  ];

  // Calcular estadísticas dinámicas
  const activeDevices = deviceData.filter(d => d.status === 'Activo').length;
  const totalDevices = deviceData.length;
  const alertsToday = deviceData.filter(d => d.status === 'Error' || d.battery! < 20).length;
  const avgTemperature = deviceData
    .filter(d => d.temperature)
    .reduce((sum, d) => sum + (d.temperature || 0), 0) / deviceData.filter(d => d.temperature).length;

  const statsData: StatCardData[] = [
    {
      title: 'Dispositivos Activos',
      value: `${activeDevices}/${totalDevices}`,
      subtitle: 'Campus Principal',
      icon: '🔌',
    },
    {
      title: 'Temperatura Promedio',
      value: `${avgTemperature.toFixed(1)}°C`,
      subtitle: 'Sensores activos',
      icon: '🌡️',
    },
    {
      title: 'Alertas Hoy',
      value: alertsToday.toString(),
      subtitle: 'Requieren atención',
      icon: '⚠️',
    },
    {
      title: 'Cobertura Campus',
      value: '95%',
      subtitle: 'Área monitoreada',
      icon: '📍',
    },
  ];

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

  const handleStatCardClick = (stat: StatCardData, index: number) => {
    console.log('Estadística seleccionada:', stat, 'Índice:', index);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'monitoring':
        return (
          <>
            {/* Sección del mapa general */}
            <ContentSection title="🌡️ Red de Sensores Ambientales - Campus UTalca">
              <InteractiveMap 
                devices={deviceData}
                selectedDevice={selectedDevice}
                onDeviceMarkerClick={handleDeviceMarkerClick}
                height="500px"
              />
            </ContentSection>

            {/* Sección de estadísticas */}
            <ContentSection title="Panel de Control - Estadísticas en Tiempo Real">
              <StatsGrid stats={statsData} onCardClick={handleStatCardClick} />
            </ContentSection>
          </>
        );

      case 'devices':
        return (
          <div style={styles.devicesView}>
            {/* Lista de dispositivos */}
            <div style={styles.deviceListContainer}>
              <ContentSection title="📋 Sensores Ambientales Distribuidos">
                <DeviceList
                  devices={deviceData}
                  selectedDeviceId={selectedDevice?.id}
                  onDeviceSelect={handleDeviceSelect}
                />
              </ContentSection>
            </div>

            {/* Mapa interactivo */}
            <div style={styles.deviceMapContainer}>
              <ContentSection title={selectedDevice ? `Ubicación: ${selectedDevice.name}` : "Selecciona un Dispositivo"}>
                <InteractiveMap 
                  devices={deviceData}
                  selectedDevice={selectedDevice}
                  onDeviceMarkerClick={handleDeviceSelect}
                  height="500px"
                />
              </ContentSection>
            </div>
          </div>
        );

      case 'reports':
        return (
          <ContentSection title="Reportes y Análisis">
            <div style={styles.placeholder}>
              <h3>📊 Sección de Reportes</h3>
              <p>Aquí puedes implementar gráficos y reportes de los datos IoT:</p>
              <ul>
                <li>Tendencias de temperatura y humedad</li>
                <li>Historial de actividad de dispositivos</li>
                <li>Reportes de mantenimiento</li>
                <li>Análisis de consumo de batería</li>
              </ul>
            </div>
          </ContentSection>
        );

      case 'settings':
        return (
          <ContentSection title="Configuración del Sistema">
            <div style={styles.placeholder}>
              <h3>⚙️ Configuración</h3>
              <p>Panel de configuración para:</p>
              <ul>
                <li>Gestión de usuarios y permisos</li>
                <li>Configuración de alertas y notificaciones</li>
                <li>Parámetros de los sensores</li>
                <li>Intervalos de actualización</li>
                <li>Backup y restauración de datos</li>
              </ul>
            </div>
          </ContentSection>
        );

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

  placeholder: {
    padding: '40px 20px',
    textAlign: 'center' as const,
    color: '#6c757d',
  },
};