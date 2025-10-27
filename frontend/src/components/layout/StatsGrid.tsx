import React from 'react';

export interface StatCardData {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
}

interface StatCardProps extends StatCardData {
  onClick?: () => void;
}

interface StatsGridProps {
  stats: StatCardData[];
  onCardClick?: (stat: StatCardData, index: number) => void;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  onClick 
}) => {
  return (
    <div style={styles.statCard} onClick={onClick}>
      <h3 style={styles.statCardTitle}>
        {icon && `${icon} `}{title}
      </h3>
      <div style={styles.statNumber}>{value}</div>
      {subtitle && (
        <small style={styles.statSubtitle}>{subtitle}</small>
      )}
    </div>
  );
};

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, onCardClick }) => {
  return (
    <div style={styles.statsGrid}>
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          {...stat}
          onClick={() => onCardClick?.(stat, index)}
        />
      ))}
    </div>
  );
};

const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginTop: '25px',
    maxWidth: '100%',
  },

  statCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
    padding: '25px 20px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
    textAlign: 'center' as const,
    border: '1px solid #e9ecef',
    borderLeft: '4px solid #00BCD4',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    position: 'relative' as const,
    minHeight: '120px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
  },

  statCardTitle: {
    margin: '0 0 15px 0',
    color: '#6c757d',
    fontSize: '0.85rem',
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    lineHeight: '1.2',
  },

  statNumber: {
    fontSize: '2.2rem',
    fontWeight: '300' as const,
    color: '#00BCD4',
    margin: '0',
    lineHeight: '1',
  },

  statSubtitle: {
    color: '#6c757d',
    fontSize: '0.8rem',
    display: 'block',
    marginTop: '8px',
  },
};

export default StatsGrid;