import React from 'react';

// ── Tipos ──────────────────────────────────────────────────────────
export interface ForecastTimeSliderProps {
  isVisible:        boolean;
  offset:           number;         // hora actual (0-maxHours)
  maxHours:         24 | 48 | 72;
  currentHorizon:   24 | 48 | 72;
  isPlaying:        boolean;
  isLoading:        boolean;
  hasData:          boolean;
  rainProbability?: number;         // 0-100
  baseTime?:        Date;
  onOffsetChange:   (offset: number) => void;
  onPlayPause:      () => void;
  onExit:           () => void;
  onHorizonChange:  (h: 24 | 48 | 72) => void;
  onLoad:           () => void;
}

// ── Helpers ────────────────────────────────────────────────────────
const rainLabel = (prob: number) => {
  if (prob >= 70) return { icon: '🌧️', label: 'Lluvia intensa',   color: '#29B6F6' };
  if (prob >= 40) return { icon: '🌦️', label: 'Lluvia moderada',  color: '#4FC3F7' };
  if (prob >= 20) return { icon: '⛅',  label: 'Lluvia ligera',    color: '#81D4FA' };
  return           { icon: '☀️',  label: 'Sin lluvia',          color: '#FFF176' };
};

const HOUR_MARKS = [0, 6, 12, 18, 24, 36, 48, 72];

// ── Componente ─────────────────────────────────────────────────────
const ForecastTimeSlider: React.FC<ForecastTimeSliderProps> = ({
  isVisible,
  offset,
  maxHours,
  currentHorizon,
  isPlaying,
  isLoading,
  hasData,
  rainProbability = 0,
  baseTime,
  onOffsetChange,
  onPlayPause,
  onExit,
  onHorizonChange,
  onLoad,
}) => {
  // Cálculo de fecha/hora prevista
  const base = baseTime ?? new Date();
  const predictedTime = new Date(base.getTime() + offset * 3_600_000);
  const timeLabel  = offset === 0 ? 'AHORA' : `+${offset}h`;
  const dateStr    = predictedTime.toLocaleString('es-CL', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });

  const rain    = rainLabel(rainProbability);
  const pct     = Math.round((offset / maxHours) * 100);
  const visible = isVisible || isLoading;

  if (!visible) return null;

  return (
    <div style={styles.wrapper}>
      {/* ── Línea decorativa superior ─────────────────────────────── */}
      <div style={styles.topLine} />

      {/* ── Fila superior: título · fecha · lluvia · horizonte · salir ── */}
      <div style={styles.topRow}>
        {/* Modo predicción badge */}
        <div style={styles.modeBadge}>🔮 MODO PREDICCIÓN</div>

        {/* Fecha/hora prevista */}
        <div style={styles.timeBlock}>
          <span style={{
            ...styles.offsetBadge,
            borderColor:     offset === 0 ? '#28a745' : '#00BCD4',
            color:           offset === 0 ? '#28a745' : '#00BCD4',
            backgroundColor: offset === 0 ? 'rgba(40,167,69,0.12)' : 'rgba(0,188,212,0.12)',
          }}>
            {timeLabel}
          </span>
          <span style={styles.dateStr}>{dateStr}</span>
        </div>

        {/* Lluvia */}
        {rainProbability > 0 && (
          <div style={styles.rainBadge}>
            <span style={{ fontSize: '1.05rem' }}>{rain.icon}</span>
            <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem' }}>{rain.label}</span>
            <span style={{ color: rain.color, fontWeight: 700, fontSize: '0.8rem' }}>
              {Math.round(rainProbability)}%
            </span>
          </div>
        )}

        {/* Horizonte */}
        <div style={styles.horizonGroup}>
          {([24, 48, 72] as const).map(h => (
            <button
              key={h}
              onClick={() => onHorizonChange(h)}
              style={{
                ...styles.horizonBtn,
                borderColor:     currentHorizon === h ? '#00BCD4' : 'rgba(255,255,255,0.18)',
                color:           currentHorizon === h ? '#00BCD4' : 'rgba(255,255,255,0.55)',
                backgroundColor: currentHorizon === h ? 'rgba(0,188,212,0.15)' : 'transparent',
              }}
            >
              {h}h
            </button>
          ))}
        </div>

        {/* Salir */}
        <button onClick={onExit} style={styles.exitBtn}>✕ Salir</button>
      </div>

      {/* ── Fila del slider ───────────────────────────────────────── */}
      <div style={styles.sliderRow}>
        {/* Play / Pause */}
        <button
          onClick={onPlayPause}
          disabled={isLoading || !hasData}
          title={isPlaying ? 'Pausar reproducción' : 'Reproducir avance temporal'}
          style={styles.playBtn}
        >
          {isLoading ? '⏳' : isPlaying ? '⏸' : '▶'}
        </button>

        {/* Slider + barra de progreso */}
        <div style={styles.sliderWrap}>
          {/* Track colorido */}
          <div style={styles.sliderTrack}>
            <div style={{ ...styles.sliderFill, width: `${pct}%` }} />
          </div>

          <input
            type="range"
            min={0}
            max={maxHours}
            step={1}
            value={offset}
            onChange={e => onOffsetChange(Number(e.target.value))}
            disabled={isLoading || !hasData}
            style={styles.sliderInput}
          />
        </div>

        {/* Rango */}
        <span style={styles.rangeLabel}>
          0h&nbsp;/&nbsp;<span style={{ color: '#00BCD4' }}>{maxHours}h</span>
        </span>
      </div>

      {/* ── Marcas de tiempo ─────────────────────────────────────── */}
      <div style={styles.marksRow}>
        {HOUR_MARKS.filter(h => h <= maxHours).map(h => (
          <span
            key={h}
            onClick={() => onOffsetChange(h)}
            style={{
              ...styles.mark,
              color:      offset === h ? '#00BCD4' : 'rgba(255,255,255,0.28)',
              fontWeight: offset === h ? 700 : 400,
            }}
          >
            {h === 0 ? 'Ahora' : `+${h}h`}
          </span>
        ))}
      </div>

      {/* ── Overlay de carga ─────────────────────────────────────── */}
      {isLoading && (
        <div style={styles.loadingOverlay}>
          <span style={{ fontSize: '1.3rem', animation: 'spin 1s linear infinite' }}>⏳</span>
          <span>Cargando predicciones para todas las estaciones…</span>
          {/* Keyframe de spin (reutiliza el de prediccionChart) */}
          <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
};

// ── Estilos ────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    background:    'linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #0f3460 100%)',
    borderTop:     '1px solid rgba(0,188,212,0.25)',
    padding:       '14px 20px 10px',
    position:      'relative',
    overflow:      'hidden',
    borderRadius:  '0 0 10px 10px',
  },
  topLine: {
    position:      'absolute',
    top:           0, left: 0, right: 0,
    height:        '2px',
    background:    'linear-gradient(90deg, transparent, #00BCD4, #29B6F6, #00BCD4, transparent)',
  },
  topRow: {
    display:        'flex',
    alignItems:     'center',
    flexWrap:       'wrap',
    gap:            '10px',
    marginBottom:   '12px',
  },
  modeBadge: {
    background:    'linear-gradient(135deg, #00BCD4, #0288D1)',
    color:         'white',
    padding:       '4px 14px',
    borderRadius:  '20px',
    fontSize:      '0.72rem',
    fontWeight:    700,
    letterSpacing: '0.8px',
    whiteSpace:    'nowrap',
  },
  timeBlock: {
    display:     'flex',
    alignItems:  'center',
    gap:         '8px',
    flex:        '1 1 auto',
    minWidth:    '160px',
  },
  offsetBadge: {
    border:        '1px solid',
    padding:       '2px 10px',
    borderRadius:  '20px',
    fontSize:      '0.82rem',
    fontWeight:    700,
    whiteSpace:    'nowrap',
  },
  dateStr: {
    color:      'rgba(255,255,255,0.6)',
    fontSize:   '0.78rem',
    whiteSpace: 'nowrap',
  },
  rainBadge: {
    display:         'flex',
    alignItems:      'center',
    gap:             '6px',
    background:      'rgba(255,255,255,0.05)',
    border:          '1px solid rgba(255,255,255,0.1)',
    padding:         '4px 12px',
    borderRadius:    '20px',
    whiteSpace:      'nowrap',
  },
  horizonGroup: {
    display: 'flex',
    gap:     '4px',
  },
  horizonBtn: {
    padding:      '3px 10px',
    borderRadius: '12px',
    border:       '1px solid',
    fontSize:     '0.72rem',
    fontWeight:   600,
    cursor:       'pointer',
    transition:   'all 0.2s',
  },
  exitBtn: {
    background:   'rgba(220,53,69,0.15)',
    border:       '1px solid rgba(220,53,69,0.4)',
    color:        '#ff6b6b',
    padding:      '4px 12px',
    borderRadius: '8px',
    fontSize:     '0.75rem',
    cursor:       'pointer',
    fontWeight:   600,
    whiteSpace:   'nowrap',
  },
  sliderRow: {
    display:     'flex',
    alignItems:  'center',
    gap:         '12px',
    marginBottom: '6px',
  },
  playBtn: {
    width:          '36px',
    height:         '36px',
    borderRadius:   '50%',
    border:         '2px solid #00BCD4',
    background:     'rgba(0,188,212,0.15)',
    color:          '#00BCD4',
    fontSize:       '1rem',
    cursor:         'pointer',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    transition:     'all 0.2s',
  },
  sliderWrap: {
    flex:     1,
    position: 'relative',
    height:   '36px',
    display:  'flex',
    alignItems: 'center',
  },
  sliderTrack: {
    position:     'absolute',
    left:         0, right: 0,
    top:          '50%',
    transform:    'translateY(-50%)',
    height:       '4px',
    background:   'rgba(255,255,255,0.1)',
    borderRadius: '2px',
    overflow:     'hidden',
    pointerEvents: 'none',
  },
  sliderFill: {
    height:      '100%',
    background:  'linear-gradient(90deg, #00BCD4, #29B6F6)',
    borderRadius:'2px',
    transition:  'width 0.2s ease',
  },
  sliderInput: {
    width:      '100%',
    cursor:     'pointer',
    position:   'relative',
    zIndex:     1,
    background: 'transparent',
    outline:    'none',
    appearance: 'none' as any,
  },
  rangeLabel: {
    color:      'rgba(255,255,255,0.4)',
    fontSize:   '0.7rem',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  marksRow: {
    display:        'flex',
    justifyContent: 'space-between',
    paddingLeft:    '48px',
    paddingRight:   '50px',
  },
  mark: {
    fontSize:   '0.62rem',
    cursor:     'pointer',
    transition: 'all 0.2s',
  },
  loadingOverlay: {
    position:       'absolute',
    inset:          0,
    background:     'rgba(0,0,0,0.65)',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '10px',
    color:          '#00BCD4',
    fontSize:       '0.88rem',
    backdropFilter: 'blur(4px)',
  },
};

export default ForecastTimeSlider;
