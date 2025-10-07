import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para los íconos de Leaflet en React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const Home: React.FC = () => {
  // Coordenadas de ejemplo (Madrid, España) - cambia estas por tu ubicación
  const position: [number, number] = [40.4168, -3.7038];

  return (
    <div style={styles.homeContainer}>
      <div style={styles.homeHeader}>
        <h1 style={styles.headerTitle}>Plataforma IoT</h1>
        <p style={styles.headerSubtitle}>Bienvenido a tu plataforma de monitoreo IoT</p>
      </div>
      
      <div style={styles.mapSection}>
        <h2 style={styles.sectionTitle}>Mapa de Dispositivos</h2>
        <div style={styles.mapContainer}>
          <MapContainer
            center={position}
            zoom={13}
            style={{ height: '500px', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={position}>
              <Popup>
                <div>
                  <strong>Dispositivo IoT Principal</strong>
                  <br />
                  Estado: Activo
                  <br />
                  Última actualización: {new Date().toLocaleString()}
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>

      <div style={styles.statsSection}>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <h3 style={styles.statCardTitle}>Dispositivos Activos</h3>
            <div style={styles.statNumber}>5</div>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statCardTitle}>Sensores Monitoreando</h3>
            <div style={styles.statNumber}>12</div>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statCardTitle}>Alertas Hoy</h3>
            <div style={styles.statNumber}>3</div>
          </div>
          <div style={styles.statCard}>
            <h3 style={styles.statCardTitle}>Uptime Sistema</h3>
            <div style={styles.statNumber}>99.8%</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;

const styles = {
    homeContainer: {
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    homeHeader: {
      textAlign: 'center' as const,
      marginBottom: '40px',
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
    },
    headerTitle: {
      margin: '0 0 10px 0',
      fontSize: '2.5rem',
      fontWeight: '300' as const,
    },
    headerSubtitle: {
      margin: '0',
      fontSize: '1.2rem',
      opacity: 0.9,
    },
    mapSection: {
      marginBottom: '40px',
    },
    sectionTitle: {
      color: '#333',
      marginBottom: '20px',
      fontSize: '1.8rem',
      fontWeight: '500' as const,
    },
    mapContainer: {
      borderRadius: '12px',
      overflow: 'hidden' as const,
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
      border: '2px solid #e0e0e0',
    },
    statsSection: {
      marginTop: '40px',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      marginTop: '20px',
    },
    statCard: {
      background: 'white',
      padding: '30px',
      borderRadius: '12px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
      textAlign: 'center' as const,
      borderLeft: '4px solid #667eea',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      cursor: 'pointer',
    },
    statCardTitle: {
      margin: '0 0 15px 0',
      color: '#666',
      fontSize: '1rem',
      fontWeight: '500' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    statNumber: {
      fontSize: '2.5rem',
      fontWeight: 'bold' as const,
      color: '#333',
      margin: '0',
    },
  };