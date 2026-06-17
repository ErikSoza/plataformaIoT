import React, { useState, useEffect } from 'react';

export interface StatCardData {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
}

interface StatCardProps extends StatCardData {
  onClick?: () => void;
  index?: number;
}

interface StatsGridProps {
  stats: StatCardData[];
  onCardClick?: (stat: StatCardData, index: number) => void;
}

// ── Configuración visual por métrica ────────────────────────────
interface MetricConfig {
  gradient: string;
  borderColor: string;
  textColor: string;
  glowClass: string;    // clase para stat-glow-layer
  iconClass: string;    // clase de animación del ícono
  decorColor: string;   // círculo decorativo de fondo
}

const METRIC_CONFIG: Record<string, MetricConfig> = {
  device: {
    gradient: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
    borderColor: '#00BCD4',
    textColor: '#006064',
    glowClass: 'stat-glow-device',
    iconClass: 'stat-icon-float',
    decorColor: 'rgba(0, 188, 212, 0.15)',
  },
  temperature: {
    gradient: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
    borderColor: '#FF9800',
    textColor: '#A84000',
    glowClass: '',
    iconClass: 'stat-icon-float',
    decorColor: 'rgba(255, 152, 0, 0.12)',
  },
  temperature_hot: {
    gradient: 'linear-gradient(135deg, #fbe9e7 0%, #ffccbc 100%)',
    borderColor: '#FF5722',
    textColor: '#962800',
    glowClass: 'stat-glow-temperature-hot',
    iconClass: 'stat-icon-float',
    decorColor: 'rgba(255, 87, 34, 0.15)',
  },
  temperature_cold: {
    gradient: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
    borderColor: '#2196F3',
    textColor: '#0D47A1',
    glowClass: 'stat-glow-temperature-cold',
    iconClass: 'stat-icon-float',
    decorColor: 'rgba(33, 150, 243, 0.15)',
  },
  humidity: {
    gradient: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
    borderColor: '#00ACC1',
    textColor: '#006064',
    glowClass: 'stat-glow-humidity',
    iconClass: 'stat-icon-float',
    decorColor: 'rgba(0, 172, 193, 0.15)',
  },
  pressure: {
    gradient: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
    borderColor: '#9C27B0',
    textColor: '#4A148C',
    glowClass: 'stat-glow-pressure',
    iconClass: 'stat-icon-float',
    decorColor: 'rgba(156, 39, 176, 0.12)',
  },
  wind: {
    gradient: 'linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%)',
    borderColor: '#0288D1',
    textColor: '#01579B',
    glowClass: 'stat-glow-wind',
    iconClass: 'stat-icon-wind',
    decorColor: 'rgba(2, 136, 209, 0.12)',
  },
  gas: {
    gradient: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
    borderColor: '#43A047',
    textColor: '#1B5E20',
    glowClass: 'stat-glow-gas',
    iconClass: 'stat-icon-float',
    decorColor: 'rgba(67, 160, 71, 0.12)',
  },
  radiation: {
    gradient: 'linear-gradient(135deg, #fffde7 0%, #fff9c4 100%)',
    borderColor: '#F9A825',
    textColor: '#7B3C00',
    glowClass: 'stat-glow-radiation',
    iconClass: 'stat-icon-sun',
    decorColor: 'rgba(249, 168, 37, 0.15)',
  },
};

// ── Detección de métrica desde título/ícono/valor ──────────────
const detectMetric = (title: string, icon?: string, value?: string | number): string => {
  const t = title.toLowerCase();
  const i = icon || '';

  if (t.includes('dispositivo') || t.includes('device') || i === '🔌' || i === '📡') return 'device';
  if (t.includes('humedad')  || i === '💧') return 'humidity';
  if (t.includes('presión')  || t.includes('presion') || i === '🌫️') return 'pressure';
  if (t.includes('viento')   || i === '💨') return 'wind';
  if (t.includes('gas')      || t.includes('aire')  || i === '🌪️') return 'gas';
  if (t.includes('radiaci')  || t.includes('solar') || i === '☀️') return 'radiation';

  if (t.includes('temperatura') || t.includes('temp') || i === '🌡️') {
    const num = parseFloat(String(value));
    if (!isNaN(num)) {
      if (num >= 28) return 'temperature_hot';
      if (num <= 15) return 'temperature_cold';
    }
    return 'temperature';
  }

  return 'device';
};

// ── Hook: contador animado al montar/cambiar valor ─────────────
const useAnimatedValue = (value: string | number): string | number => {
  const [display, setDisplay] = useState<string | number>(value);

  useEffect(() => {
    const strVal = String(value);

    // No animar: ratios con "/", valores "N/A", o no numéricos
    if (strVal.startsWith('N/A') || strVal.includes('/') || strVal === '-') {
      setDisplay(value);
      return;
    }

    const match = strVal.match(/^(-?\d+\.?\d*)(.*)/);
    if (!match) { setDisplay(value); return; }

    const target   = parseFloat(match[1]);
    const suffix   = match[2];
    const decimals = (match[1].split('.')[1] || '').length;

    if (isNaN(target)) { setDisplay(value); return; }

    const DURATION  = 1100; // ms
    const startTime = performance.now();
    let rafId: number;

    const animate = (now: number) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / DURATION, 1);
      const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cúbico
      const current  = target * eased;

      setDisplay(
        decimals === 0
          ? Math.round(current) + suffix
          : current.toFixed(decimals) + suffix
      );

      if (progress < 1) rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return display;
};

// ── StatCard ────────────────────────────────────────────────────
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  onClick,
  index = 0,
}) => {
  const metricKey     = detectMetric(title, icon, value);
  const config        = METRIC_CONFIG[metricKey] || METRIC_CONFIG.device;
  const animatedValue = useAnimatedValue(value);
  const [hovered, setHovered]   = useState(false);

  const cardStyle: React.CSSProperties = {
    background:   config.gradient,
    padding:      '22px 20px',
    borderRadius: '14px',
    boxShadow:    hovered
      ? `0 10px 32px rgba(0,0,0,0.12), 0 0 0 2px ${config.borderColor}50`
      : '0 4px 20px rgba(0,0,0,0.06)',
    textAlign:      'center',
    border:         '1px solid rgba(255,255,255,0.9)',
    borderLeft:     `4px solid ${config.borderColor}`,
    transition:     'all 0.3s ease',
    cursor:         'pointer',
    position:       'relative',
    minHeight:      '130px',
    display:        'flex',
    flexDirection:  'column',
    justifyContent: 'space-between',
    overflow:       'hidden',
    transform:      hovered ? 'translateY(-5px)' : 'translateY(0)',
    // delay de entrada escalonada (stagger)
    animationDelay: `${index * 0.07}s`,
  };

  return (
    <div
      className="stat-card-enter"
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Capa de brillo continuo por métrica */}
      <div className={`stat-glow-layer ${config.glowClass}`} />

      {/* Círculo decorativo en esquina superior derecha */}
      <div style={{
        position:     'absolute',
        top:          '-18px',
        right:        '-18px',
        width:        '80px',
        height:       '80px',
        borderRadius: '50%',
        background:   `radial-gradient(circle, ${config.decorColor} 0%, transparent 70%)`,
        pointerEvents: 'none',
        zIndex:        0,
      }} />

      {/* Título con ícono animado */}
      <h3 style={{
        margin:       '0 0 10px 0',
        color:        '#495057',
        fontSize:     '0.875rem',
        fontWeight:   700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        lineHeight:    1.2,
        position:     'relative',
        zIndex:        1,
      }}>
        {icon && (
          <span
            className={config.iconClass}
            style={{ marginRight: '5px', fontSize: '1rem' }}
          >
            {icon}
          </span>
        )}
        {title}
      </h3>

      {/* Valor animado */}
      <div style={{
        fontSize:      '2.1rem',
        fontWeight:    300,
        color:         config.textColor,
        margin:        '0',
        lineHeight:    1,
        letterSpacing: '-0.5px',
        position:      'relative',
        zIndex:         1,
      }}>
        {animatedValue}
      </div>

      {/* Subtítulo */}
      {subtitle && (
        <small style={{
          color:      '#495057',
          fontSize:   '0.875rem',
          display:    'block',
          marginTop:  '8px',
          position:   'relative',
          zIndex:      1,
        }}>
          {subtitle}
        </small>
      )}
    </div>
  );
};

// ── StatsGrid ───────────────────────────────────────────────────
export const StatsGrid: React.FC<StatsGridProps> = ({ stats, onCardClick }) => {
  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
      gap:                 '16px',
      marginTop:           '20px',
      maxWidth:            '100%',
    }}>
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          {...stat}
          index={index}
          onClick={() => onCardClick?.(stat, index)}
        />
      ))}
    </div>
  );
};

export default StatsGrid;
