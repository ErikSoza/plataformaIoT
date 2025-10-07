import React from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {UtalcaHeader, TabNavigation, MainLayout, ContentSection, StatsGrid, MapContainer, TabItem, StatCardData} from '../components/layout';

// Fix para los íconos de Leaflet en React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const Home: React.FC = () => {
  // Coordenadas de Talca, Chile - Campus Universidad de Talca
  const position: [number, number] = [-35.0020711,-71.2288796];

  // Configuración de tabs
  const tabs: TabItem[] = [
    { id: 'monitoring', label: 'MONITOREO', active: true },
    { id: 'devices', label: 'DISPOSITIVOS' },
    { id: 'reports', label: 'REPORTES' },
    { id: 'settings', label: 'CONFIGURACIÓN' },
  ];

  // Datos de estadísticas
  const statsData: StatCardData[] = [
    {
      title: 'Dispositivos Activos',
      value: '5',
      subtitle: 'Campus Principal',
      icon: '🔌',
    },
    {
      title: 'Alertas Hoy',
      value: '3',
      subtitle: 'Últimas 24 horas',
      icon: '⚠️',
    },
  ];

const handleTabChange = (tabId: string) => {
    console.log('Tab seleccionado:', tabId);
    // Aquí puedes manejar el cambio de pestaña
};

// Datos de dispositivos IoT
const deviceData = [
    {
        id: 1,
        name: 'Sensor Principal',
        type: 'Temperatura/Humedad',
        status: 'Activo',
        lastUpdate: '2024-01-15 14:30',
        location: 'Facultad de Ingeniería'
    },
    {
        id: 2,
        name: 'Estación Meteorológica',
        type: 'Clima Completo',
        status: 'Activo',
        lastUpdate: '2024-01-15 14:28',
        location: 'Campus Central'
    },
    {
        id: 3,
        name: 'Sensor Biblioteca',
        type: 'Calidad de Aire',
        status: 'Mantenimiento',
        lastUpdate: '2024-01-15 12:15',
        location: 'Biblioteca Central'
    }
];

  const handleStatCardClick = (stat: StatCardData, index: number) => {
    console.log('Estadística seleccionada:', stat, 'Índice:', index);
    // Aquí puedes manejar el click en las cards de estadísticas
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
        {/* Sección del mapa */}
        <ContentSection title="Mapa de Dispositivos - Campus UTalca">
          <MapContainer>
            <LeafletMapContainer
              center={position}
              zoom={15}
              style={{ height: '500px', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={position}>
                <Popup>
                  <div style={{ padding: '10px' }}>
                    <strong style={{ color: '#00BCD4' }}>🎓 Campus Universidad de Talca</strong>
                    <br />
                    <strong>📡 Dispositivo IoT Principal</strong>
                    <br />
                    Estado: <span style={{ color: '#28a745', fontWeight: 'bold' }}>🟢 Activo</span>
                    <br />
                    Última actualización: {new Date().toLocaleString()}
                    <br />
                    <small style={{ color: '#6c757d' }}>Facultad de Ingeniería</small>
                  </div>
                </Popup>
              </Marker>
            </LeafletMapContainer>
          </MapContainer>
        </ContentSection>

        {/* Sección de estadísticas */}
        <ContentSection title="Panel de Control - Estadísticas en Tiempo Real">
          <StatsGrid stats={statsData} onCardClick={handleStatCardClick} />
        </ContentSection>
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