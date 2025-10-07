import React from 'react';

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
  return (
    <div style={styles.utalcaHeader}>
      <div style={styles.headerContent}>
        <div style={styles.logoSection}>
          <div style={styles.logoPlaceholder}>{logoText}</div>
          <div style={styles.headerText}>
            <h1 style={styles.headerTitle}>{title}</h1>
            <p style={styles.headerSubtitle}>{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
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
};

export default UtalcaHeader;