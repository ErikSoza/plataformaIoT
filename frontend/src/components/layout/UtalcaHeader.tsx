import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface UtalcaHeaderProps {
  title: string;
  subtitle: string;
  logoText?: string;
}

const UtalcaHeader: React.FC<UtalcaHeaderProps> = ({ 
  title, 
  subtitle, 
  logoText = "UTalca"
}) => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLoginClick = () => {
    navigate('/login');
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Cerrar dropdown cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  return (
    <>
      {/* Estilos CSS para animaciones */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      
      <div style={styles.utalcaHeader}>
      <div style={styles.headerContent}>
        <div style={styles.logoSection}>
          <div style={styles.logoPlaceholder}>{logoText}</div>
          <div style={styles.headerText}>
            <h1 style={styles.headerTitle}>{title}</h1>
            <p style={styles.headerSubtitle}>{subtitle}</p>
          </div>
        </div>
        
        {/* Sección de autenticación con dropdown */}
        <div style={styles.authSection} ref={dropdownRef}>
          <div 
            style={{
              ...styles.userIcon,
              cursor: 'pointer',
              transform: isDropdownOpen ? 'scale(1.1)' : 'scale(1)',
              background: isDropdownOpen ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)',
            }}
            onClick={toggleDropdown}
            onMouseEnter={(e) => {
              if (!isDropdownOpen) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isDropdownOpen) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            👤
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div style={styles.dropdown}>
              <div style={styles.dropdownHeader}>
                <div>
                  <div style={styles.dropdownTitle}>Mi Cuenta</div>
                </div>
              </div>
              
              <div style={styles.dropdownDivider}></div>
              
              <button 
                style={styles.dropdownButton}
                onClick={handleLoginClick}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8f9fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div>
                  <div style={styles.dropdownButtonTitle}>Iniciar Sesión</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

const styles = {
  utalcaHeader: {
    background: 'linear-gradient(135deg, #00BCD4 0%, #00ACC1 50%, #0097A7 100%)',
    padding: '0',
    boxShadow: '0 4px 20px rgba(0, 188, 212, 0.3)',
    position: 'relative' as const,
  },

  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },

  logoPlaceholder: {
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '15px 20px',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1.5rem',
    fontWeight: 'bold' as const,
    border: '2px solid rgba(255, 255, 255, 0.3)',
    minWidth: '80px',
    textAlign: 'center' as const,
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    margin: '0 0 5px 0',
    fontSize: '2.2rem',
    fontWeight: '400' as const,
    color: 'white',
    letterSpacing: '-0.5px',
  },

  headerSubtitle: {
    margin: '0',
    fontSize: '1rem',
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '300' as const,
  },

  authSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    position: 'relative' as const,
  },

  userIcon: {
    fontSize: '2rem',
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '10px',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '50px',
    height: '50px',
    transition: 'all 0.3s ease',
  },

  dropdown: {
    position: 'absolute' as const,
    top: '70px',
    right: '0',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    border: '1px solid #e0e0e0',
    minWidth: '280px',
    zIndex: 1000,
    overflow: 'hidden',
    animation: 'slideDown 0.3s ease-out',
  },

  dropdownHeader: {
    padding: '16px 20px',
    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  dropdownIcon: {
    fontSize: '1.5rem',
    background: '#00BCD4',
    color: 'white',
    padding: '8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
  },

  dropdownTitle: {
    fontSize: '1rem',
    fontWeight: '600' as const,
    color: '#2c3e50',
    margin: '0',
  },

  dropdownSubtitle: {
    fontSize: '0.85rem',
    color: '#7f8c8d',
    margin: '2px 0 0 0',
  },

  dropdownDivider: {
    height: '1px',
    background: '#e9ecef',
    margin: '0',
  },

  dropdownButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    textAlign: 'left' as const,
  },

  dropdownButtonIcon: {
    fontSize: '1.2rem',
    background: 'rgba(0, 188, 212, 0.1)',
    color: '#00BCD4',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
  },

  dropdownButtonTitle: {
    fontSize: '0.95rem',
    fontWeight: '500' as const,
    color: '#2c3e50',
    margin: '0',
  },

  dropdownButtonSubtitle: {
    fontSize: '0.8rem',
    color: '#7f8c8d',
    margin: '2px 0 0 0',
  },

  authButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },

  loginButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500' as const,
    transition: 'all 0.3s ease',
    minWidth: '120px',
  },

  registerButton: {
    background: 'transparent',
    border: '2px solid white',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500' as const,
    transition: 'all 0.3s ease',
    minWidth: '120px',
  },
};

export default UtalcaHeader;