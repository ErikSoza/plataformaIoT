import React, { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {TabNavigation, MainLayout, TabItem, DeviceData} from '../components/layout';
import UserHeader from '../components/UserHeader';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';

// Importar páginas separadas
import { MonitoringPage, DevicesPage, FavoritesPage, ReportsPage, SettingsPage, StationManagementPage, DeviceManagementPage } from './index';

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

// ── Loader meteorológico animado ─────────────────────────────────
const WeatherLoader: React.FC = () => (
  <div style={{
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            '16px',
    marginBottom:   '8px',
  }}>
    {/* Anillo giratorio exterior */}
    <div style={{ position: 'relative', width: '80px', height: '80px' }}>
      <div style={{
        position:    'absolute',
        inset:       0,
        borderRadius:'50%',
        border:      '4px solid rgba(255,255,255,0.2)',
        borderTop:   '4px solid white',
        animation:   'weatherLoaderSpin 1s linear infinite',
      }} />
      {/* Sol central */}
      <div style={{
        position:     'absolute',
        top:          '50%',
        left:         '50%',
        transform:    'translate(-50%, -50%)',
        fontSize:     '2rem',
        animation:    'weatherLoaderSpin 8s linear infinite reverse',
      }}>
        🌤️
      </div>
    </div>

    {/* Gotas de lluvia animadas */}
    <div style={{ display: 'flex', gap: '6px' }}>
      {[0, 0.2, 0.4].map((delay, i) => (
        <div key={i} style={{
          width:           '6px',
          height:          '6px',
          borderRadius:    '50%',
          backgroundColor: 'rgba(255,255,255,0.7)',
          animation:       `rainBead 1.2s ease-in-out ${delay}s infinite`,
        }} />
      ))}
    </div>

    {/* Keyframes inyectados una sola vez */}
    <style>{`
      @keyframes weatherLoaderSpin { to { transform: rotate(360deg); } }
      @keyframes rainBead {
        0%   { opacity:0; transform:translateY(-8px); }
        40%  { opacity:1; }
        100% { opacity:0; transform:translateY(10px); }
      }
    `}</style>
  </div>
);

const Home: React.FC = () => {
  // Hook de autenticación
  const { isAuthenticated, user, token, isLoading: authLoading } = useAuth();
  
  // Estados del componente
  const [activeTab, setActiveTab] = useState<string>('monitoring');
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | undefined>(undefined);
  const [favoriteStationIds, setFavoriteStationIds] = useState<number[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

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

  useEffect(() => {
    let isMounted = true;

    const fetchFavoriteStations = async () => {
      if (!isAuthenticated || !token) {
        setFavoriteStationIds([]);
        setFavoritesLoading(false);
        return;
      }

      try {
        setFavoritesLoading(true);
        const response = await authService.getFavoriteStations(token);

        if (isMounted) {
          const favoriteIds = Array.isArray(response.favoriteStationIds)
            ? response.favoriteStationIds
            : [];
          setFavoriteStationIds(favoriteIds);
        }
      } catch (error) {
        console.error('No se pudieron cargar los favoritos del usuario:', error);
        if (isMounted) {
          setFavoriteStationIds([]);
        }
      } finally {
        if (isMounted) {
          setFavoritesLoading(false);
        }
      }
    };

    fetchFavoriteStations();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, token]);

  // Mostrar loading si la autenticación está cargando
  if (authLoading) {
    return (
      <div style={styles.loadingContainer}>
        <WeatherLoader />
        <p style={styles.loadingText}>Cargando plataforma meteorológica...</p>
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
        { id: 'favorites', label: 'FAVORITOS', active: activeTab === 'favorites' },
        { id: 'reports', label: 'REPORTES', active: activeTab === 'reports' },
        { id: 'settings', label: 'CONFIGURACIÓN', active: activeTab === 'settings' },
      ];
    }

    // Para administradores - Acceso completo
    if (user?.rol === 'admin') {
      return [
        { id: 'monitoring', label: 'MONITOREO', active: activeTab === 'monitoring' },
        { id: 'devices', label: 'DISPOSITIVOS', active: activeTab === 'devices' },
        { id: 'favorites', label: 'FAVORITOS', active: activeTab === 'favorites' },
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

  const handleToggleFavorite = async (stationId: number) => {
    if (!isAuthenticated || !token) {
      return;
    }

    const isFavorite = favoriteStationIds.includes(stationId);

    // Actualización optimista para una UI fluida
    setFavoriteStationIds((prev) => (
      isFavorite ? prev.filter((id) => id !== stationId) : [...prev, stationId]
    ));

    try {
      if (isFavorite) {
        await authService.removeFavoriteStation(token, stationId);
      } else {
        await authService.addFavoriteStation(token, stationId);
      }
    } catch (error) {
      console.error('No se pudo actualizar favorito:', error);

      // Revertir si falla la petición
      setFavoriteStationIds((prev) => (
        isFavorite ? [...prev, stationId] : prev.filter((id) => id !== stationId)
      ));
    }
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
            favoriteStationIds={favoriteStationIds}
            onToggleFavorite={handleToggleFavorite}
            favoritesLoading={favoritesLoading}
          />
        );

      case 'favorites':
        // Para usuarios registrados y administradores
        if (!isAuthenticated) {
          return (
            <div style={styles.accessDenied}>
              <h3>🔒 Acceso Restringido</h3>
              <p>Debes iniciar sesión para ver tus estaciones favoritas.</p>
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
          <FavoritesPage
            devices={devices}
            favoriteStationIds={favoriteStationIds}
            onToggleFavorite={handleToggleFavorite}
            favoritesLoading={favoritesLoading}
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
        if (!isAuthenticated || (user?.rol !== 'admin' && user?.rol !== 'usuario')) {
          return (
            <div style={styles.accessDenied}>
              <h3>🔒 Acceso Restringido</h3>
              <p>Solo los administradores y usuarios pueden acceder a la configuración.</p>
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
            {/* Logo/Título */}
            <div style={styles.guestBrandSection}>
              <h2 style={styles.guestBrandTitle}>🌐 Plataforma IoT UTalca</h2>
              <span style={styles.guestSubtitle}>Vista Visitante</span>
            </div>

            {/* Botones de acción */}
            <div style={styles.guestActions}>
              <button 
                style={styles.guestLoginBtn}
                onClick={() => window.location.href = '/login'}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f8ff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                🚀 Iniciar Sesión
              </button>
              <button 
                style={styles.guestRegisterBtn}
                onClick={() => window.location.href = '/register'}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#00BCD4';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                📝 Registrarse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de conexión API */}
      <div style={styles.connectionIndicator}>
        <span
          className={isConnected ? 'connection-dot-connected' : 'connection-dot-disconnected'}
          style={{
            ...styles.connectionDot,
            backgroundColor: isConnected ? '#28a745' : '#ffc107',
          }}
        />
        <span style={styles.connectionText}>
          {isConnected
            ? `🟢 API Conectada — ${apiDevices.length} estaciones en línea`
            : '🟡 Modo demostración — API no disponible'}
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
    backgroundColor: 'white',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    borderBottom: '3px solid #00BCD4',
    padding: '0',
    position: 'sticky' as const,
    top: 0,
    zIndex: 9999,
  },
  guestHeaderContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  guestBrandSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  guestBrandTitle: {
    margin: 0,
    color: '#00BCD4',
    fontSize: '24px',
    fontWeight: '600' as const,
  },
  guestSubtitle: {
    color: '#6c757d',
    fontSize: '14px',
    fontWeight: '500' as const,
    backgroundColor: '#f8f9fa',
    padding: '4px 12px',
    borderRadius: '12px',
    border: '1px solid #e9ecef',
  },
  guestActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  guestLoginBtn: {
    backgroundColor: 'white',
    color: '#00BCD4',
    border: '2px solid #00BCD4',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  guestRegisterBtn: {
    backgroundColor: 'transparent',
    color: '#00BCD4',
    border: '2px solid #00BCD4',
    padding: '8px 16px',
    borderRadius: '6px',
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
    position: 'sticky' as const,
    top: 0,
    zIndex: 9998,
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