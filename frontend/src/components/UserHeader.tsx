import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const UserHeader: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) return null;

  const handleLogout = () => {
    const confirmed = window.confirm('¿Estás seguro que deseas cerrar sesión?');
    if (confirmed) {
      logout();
      navigate('/');
    }
  };

  const getRoleDisplayName = (rol: string): string => {
    switch (rol) {
      case 'admin':
        return 'Administrador';
      case 'usuario':
        return 'Usuario';
      default:
        return rol;
    }
  };

  return (
    <div style={styles.headerContainer}>
      <div style={styles.headerContent}>
        {/* Logo/Título */}
        <div style={styles.brandSection}>
          <h2 style={styles.brandTitle}>🌐 Plataforma IoT - Universidad de Talca</h2>
        </div>

        {/* Información del usuario */}
        <div style={styles.userSection}>
          <div style={styles.userInfo}>
            <span style={styles.welcomeText}>
              👋 Hola, <strong>{user.nombre}</strong>
            </span>
            <span style={styles.roleText}>
              {getRoleDisplayName(user.rol)}
            </span>
          </div>
          
          <button 
            onClick={handleLogout}
            style={styles.logoutButton}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f44336';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ff5722';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  headerContainer: {
    backgroundColor: 'white',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    borderBottom: '3px solid #00BCD4',
    padding: '0',
    position: 'sticky' as const,
    top: 0,
    zIndex: 9999,
  },
  
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  brandSection: {
    display: 'flex',
    alignItems: 'center',
  },
  
  brandTitle: {
    margin: 0,
    color: '#00BCD4',
    fontSize: '24px',
    fontWeight: '600' as const,
  },
  
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  
  userInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end',
    gap: '2px',
  },
  
  welcomeText: {
    fontSize: '16px',
    color: '#2c3e50',
  },
  
  roleText: {
    fontSize: '12px',
    color: '#7f8c8d',
    backgroundColor: '#ecf0f1',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: '500' as const,
  },
  
  logoutButton: {
    backgroundColor: '#ff5722',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
    transition: 'all 0.2s ease',
  },
};

export default UserHeader;