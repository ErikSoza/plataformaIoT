import React, { useState, useEffect } from 'react';
import { ContentSection, StatsGrid, UnifiedMap, DeviceData, StatCardData } from '../components/layout';
import CitySearch from '../components/CitySearch';
import ResumenEstacion from '../components/ResumenEstacion';
import { prediccionService, PrediccionResponse, PuntoPrediccion, VariablePrediccion } from '../services/api';

const VARIABLE_DISPLAY: Record<VariablePrediccion, {
  label: string;
  unidad: string;
  color: string;
  formato: (v: number) => string;
  placeholder: string;
}> = {
  temperatura: { label: 'Temperatura', unidad: '°C',   color: '#0288D1', formato: v => `${v.toFixed(1)}°C`,    placeholder: '— °C'   },
  humedad:     { label: 'Humedad',     unidad: '%',    color: '#00897B', formato: v => `${v.toFixed(0)}%`,     placeholder: '— %'    },
  presion:     { label: 'Presión',     unidad: 'hPa',  color: '#7B1FA2', formato: v => `${v.toFixed(0)} hPa`,  placeholder: '— hPa'  },
  viento:      { label: 'Viento',      unidad: 'm/s',  color: '#E65100', formato: v => `${v.toFixed(1)} m/s`,  placeholder: '— m/s'  },
};

const VARIABLES_ORDEN: VariablePrediccion[] = ['temperatura', 'humedad', 'presion', 'viento'];

interface MonitoringPageProps {
  devices: DeviceData[];
  stats: StatCardData[];
  selectedDevice?: DeviceData;
  onDeviceMarkerClick: (device: DeviceData) => void;
  onStatCardClick: (stat: StatCardData, index: number) => void;
}

const MonitoringPage: React.FC<MonitoringPageProps> = ({
  devices,
  stats,
  selectedDevice,
  onDeviceMarkerClick,
  onStatCardClick
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [shouldCenterToSearch, setShouldCenterToSearch] = useState(false);
  // Estado local: estación activa en el panel de Monitoreo (independiente del estado global)
  const [panelDevice, setPanelDevice] = useState<DeviceData | null>(null);
  const [prediccionData, setPrediccionData] = useState<PrediccionResponse | null>(null);
  const [prediccionLoading, setPrediccionLoading] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<VariablePrediccion>('temperatura');
  const [horizonHours, setHorizonHours] = useState(1);

  // Click en marcador del mapa: actualiza panel local sin cambiar de pestaña
  const handleMapMarkerClick = (device: DeviceData) => {
    setPanelDevice(device);
  };

  // Estación a mostrar: selección local → global → central UTalca por defecto
  const estacionCentral =
    devices.find(d => /central|los niches|campus/i.test(d.name)) ?? devices[0] ?? null;
  const estacionMostrada = panelDevice ?? selectedDevice ?? estacionCentral;
  const esDefecto = !panelDevice && !selectedDevice && estacionMostrada != null;

  // Cargar predicciones al cambiar de estación
  const estacionId = estacionMostrada?.id ?? null;
  const estacionStatus = estacionMostrada?.status;
  useEffect(() => {
    if (!estacionId || estacionStatus !== 'Activo') {
      setPrediccionData(null);
      return;
    }
    let cancelled = false;
    setPrediccionLoading(true);
    prediccionService.getByEstacion(estacionId, 72, selectedVariable)
      .then(data => { if (!cancelled) setPrediccionData(data); })
      .catch(() => { if (!cancelled) setPrediccionData(null); })
      .finally(() => { if (!cancelled) setPrediccionLoading(false); });
    return () => { cancelled = true; };
  }, [estacionId, estacionStatus, selectedVariable]);

  const getPredAtHour = (preds: PuntoPrediccion[] | undefined, h: number): number | null => {
    if (!preds || preds.length === 0) return null;
    const pt = preds.reduce((best, p) =>
      Math.abs(p.hora_offset - h) < Math.abs(best.hora_offset - h) ? p : best
    );
    return pt.valor ?? pt.temperatura;
  };

  const varDisp = VARIABLE_DISPLAY[selectedVariable];

  const fmtVal = (val: number | null | undefined): string =>
    val != null ? varDisp.formato(Number(val)) : varDisp.placeholder;

  const fmtTemp = (val: number | null | undefined): string =>
    val != null ? `${Number(val).toFixed(1)}°C` : '— °C';

  // Manejar selección de ubicación desde la búsqueda
  const handleLocationSelect = (coordinates: [number, number], cityName: string) => {
    console.log('🗺️ Navegando a:', cityName, coordinates);
    setMapCenter(coordinates);
    setShouldCenterToSearch(true);
    
    // Resetear el centrado después de un tiempo para permitir navegación libre
    setTimeout(() => setShouldCenterToSearch(false), 3000);
  };

  // Limpiar búsqueda
  const handleClearSearch = () => {
    setMapCenter(null);
    setShouldCenterToSearch(false);
  };
  return (
    <>
      {/* Sección de estadísticas */}
      <ContentSection title="📊 Resumen Estadisticas Actuales Curico">
        <StatsGrid stats={stats} onCardClick={onStatCardClick} />
      </ContentSection>

      {/* Sección del mapa general */}
      <ContentSection title="🌐 Red de Sensores Ambientales - Campus UTalca">
        {/* Búsqueda inteligente de ciudades */}
        <div style={styles.searchContainer}>
          <CitySearch
            onLocationSelect={handleLocationSelect}
            onClear={handleClearSearch}
            isSearching={shouldCenterToSearch}
          />
        </div>
        
        <UnifiedMap
          devices={devices}
          selectedDevice={panelDevice ?? selectedDevice}
          onDeviceMarkerClick={handleMapMarkerClick}
          enableRedirection={true}
          height="75vh"
          showHeatmapControls={true}
          defaultHeatmapVisible={true}
          defaultHeatmapMetric="temperature"
          searchCenter={mapCenter}
          shouldCenterToSearch={shouldCenterToSearch}
        />
      </ContentSection>

      {/* Panel de Predicciones Climáticas */}
      {estacionMostrada && (
        <ContentSection title={`🔮 Predicciones Climáticas — ${estacionMostrada.name ?? 'Estación'}`} id="panel-predicciones">
          {/* Selector de variable climática */}
          <div style={styles.varSelectorRow}>
            <span style={styles.horizonLabel}>Variable:</span>
            {VARIABLES_ORDEN.map(v => {
              const vd = VARIABLE_DISPLAY[v];
              const active = selectedVariable === v;
              return (
                <button
                  key={v}
                  onClick={() => setSelectedVariable(v)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '20px',
                    border: `2px solid ${vd.color}`,
                    background: active ? vd.color : 'transparent',
                    color: active ? '#fff' : vd.color,
                    fontWeight: '600',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {vd.label}
                </button>
              );
            })}
          </div>

          {/* Control de horizonte temporal compartido */}
          <div style={styles.horizonControl}>
            <div style={styles.horizonHeader}>
              <span style={styles.horizonLabel}>Horizonte de predicción:</span>
              <span style={styles.horizonValue}>+{horizonHours}h</span>
              <span style={styles.horizonTime}>
                {new Date(Date.now() + horizonHours * 3_600_000).toLocaleString('es-CL', {
                  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="72"
              value={horizonHours}
              onChange={e => setHorizonHours(Number(e.target.value))}
              style={styles.horizonSlider}
            />
            <div style={styles.horizonTicks}>
              {[1, 12, 24, 36, 48, 60, 72].map(h => (
                <span
                  key={h}
                  style={{
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: horizonHours === h ? '700' : '400',
                    color: horizonHours === h ? '#00BCD4' : '#aaa',
                    transition: 'color 0.2s',
                  }}
                  onClick={() => setHorizonHours(h)}
                >
                  +{h}h
                </span>
              ))}
            </div>
          </div>

          {/* Tarjetas de predicción */}
          <div style={styles.predCardsGrid}>

            {/* ── Card 1: Edge TinyML ── */}
            <div style={styles.predCard}>
              <div style={styles.predCardTop}>
                <div style={{ ...styles.predCardIconBg, background: 'linear-gradient(135deg, #FF9800, #F57C00)' }}>⚡</div>
                <div>
                  <div style={styles.predCardTitle}>Edge TinyML</div>
                  <div style={styles.predCardSubtitle}>Horizonte fijo: +1h · Temperatura</div>
                </div>
              </div>
              <div style={styles.predCardValue}>
                {fmtTemp(estacionMostrada.prediccion_temp)}
              </div>
              <div style={styles.predCardMeta}>
                Modelo en dispositivo ESP32 · R²=0.96
                {selectedVariable !== 'temperatura' && (
                  <span style={{ display: 'block', color: '#E65100', marginTop: '4px' }}>
                    Solo predice temperatura (hardware)
                  </span>
                )}
              </div>
              <div style={{ ...styles.predCardBadge, background: '#FFF3E0', color: '#E65100', border: '1px solid #FFB74D' }}>
                Microcontrolador - ESP32
              </div>
            </div>

            {/* ── Card 2: XGBoost local ── */}
            <div style={styles.predCard}>
              <div style={styles.predCardTop}>
                <div style={{ ...styles.predCardIconBg, background: 'linear-gradient(135deg, #00BCD4, #0097A7)' }}>🤖</div>
                <div>
                  <div style={styles.predCardTitle}>XGBoost Local</div>
                  <div style={styles.predCardSubtitle}>Ajustable 1–72h</div>
                </div>
              </div>
              {prediccionLoading ? (
                <div style={styles.predCardLoading}>⏳ Calculando...</div>
              ) : (
                <div style={styles.predCardValue}>
                  {fmtVal(prediccionData
                    ? getPredAtHour(prediccionData.modelo_local.predicciones, horizonHours)
                    : null)}
                </div>
              )}
              <div style={styles.predCardMeta}>
                {prediccionData?.modelo_local.metricas_entrenamiento
                  ? `MAE ±${prediccionData.modelo_local.metricas_entrenamiento.mae_celsius.toFixed(2)}${varDisp.unidad} · R²=${prediccionData.modelo_local.metricas_entrenamiento.r2_score.toFixed(3)}`
                  : estacionMostrada.status !== 'Activo'
                    ? 'Estación inactiva'
                    : 'Servicio ML no disponible'}
              </div>
              <div style={{ ...styles.predCardBadge, background: '#E0F7FA', color: '#006064', border: '1px solid #80DEEA' }}>
                Modelo ML Pagina Web
              </div>
            </div>

            {/* ── Card 3: Open-Meteo ── */}
            <div style={styles.predCard}>
              <div style={styles.predCardTop}>
                <div style={{ ...styles.predCardIconBg, background: 'linear-gradient(135deg, #4CAF50, #388E3C)' }}>🌍</div>
                <div>
                  <div style={styles.predCardTitle}>Open-Meteo</div>
                  <div style={styles.predCardSubtitle}>API meteorológica externa</div>
                </div>
              </div>
              {prediccionLoading ? (
                <div style={styles.predCardLoading}>⏳ Consultando...</div>
              ) : (
                <div style={styles.predCardValue}>
                  {prediccionData?.validacion_openmeteo.disponible
                    ? fmtVal(getPredAtHour(prediccionData.validacion_openmeteo.predicciones, horizonHours))
                    : varDisp.placeholder}
                </div>
              )}
              <div style={styles.predCardMeta}>
                {prediccionData?.validacion_openmeteo.disponible
                  ? 'Validación externa · forecast gratuito'
                  : prediccionLoading
                    ? 'Consultando API...'
                    : 'API no disponible en este momento'}
              </div>
              <div style={{ ...styles.predCardBadge, background: '#E8F5E9', color: '#1B5E20', border: '1px solid #A5D6A7' }}>
                API pública - OpenMeteo
              </div>
            </div>

          </div>

          {/* Badge de nivel de confianza */}
          {prediccionData?.confianza && (
            <div style={{
              ...styles.confianzaBadge,
              background: prediccionData.confianza.nivel === 'Alto' ? '#E8F5E9'
                : prediccionData.confianza.nivel === 'Medio' ? '#FFF8E1'
                : prediccionData.confianza.nivel === 'Bajo' ? '#FFEBEE'
                : '#F5F5F5',
              border: `1px solid ${prediccionData.confianza.nivel === 'Alto' ? '#A5D6A7'
                : prediccionData.confianza.nivel === 'Medio' ? '#FFE082'
                : prediccionData.confianza.nivel === 'Bajo' ? '#EF9A9A'
                : '#E0E0E0'}`,
            }}>
              <span style={{ fontSize: '1.2rem' }}>{prediccionData.confianza.badge}</span>
              <span>
                <strong>Confianza {prediccionData.confianza.nivel}:</strong>{' '}
                {prediccionData.confianza.descripcion}
                {prediccionData.confianza.mae_diferencia != null && (
                  <span style={{ color: '#6c757d', marginLeft: '8px' }}>
                    (diferencia XGBoost–Open-Meteo: ±{prediccionData.confianza.mae_diferencia.toFixed(2)}{varDisp.unidad})
                  </span>
                )}
              </span>
            </div>
          )}
        </ContentSection>
      )}

      {/* Panel de condiciones actuales */}
      <ContentSection title="🌍 Panel de Condiciones Actuales - Estacion Seleccionada">
        {estacionMostrada && (
        <div>
          <ResumenEstacion device={estacionMostrada} esDefecto={esDefecto} />
        </div>
      )}
      </ContentSection>

      {/* Panel Acerca de */}
      <div style={styles.aboutSection}>
        <div style={styles.aboutContent}>
          <h3 style={styles.aboutTitle}>ℹ️ Acerca de la Plataforma</h3>
          <div style={styles.aboutGrid}>
            {[
              {
                icon: '🎓',
                title: 'Proyecto Universitario',
                text: 'Desarrollado por estudiantes de la Universidad de Talca para el monitoreo ambiental del campus usando tecnología IoT y aplicando modelos de predicción basados en Machine Learning.',
                delay: '0.1s',
              },
              {
                icon: '⚡',
                title: 'Tecnología IoT',
                text: 'Red de sensores IoT conectados que recopilan datos meteorológicos cada hora, transmitidos en tiempo real a través de protocolos de comunicación avanzados.',
                delay: '0.2s',
              },
              {
                icon: '🌱',
                title: 'Impacto Ambiental',
                text: 'Los datos recopilados contribuyen a investigaciones sobre cambio climático aportando con un repositorio donde se almacenan todos los datos registrados.',
                delay: '0.3s',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="about-card-animate"
                style={{ ...styles.aboutCard, animationDelay: card.delay }}
              >
                <div className="about-icon-float" style={styles.aboutCardIcon}>{card.icon}</div>
                <h4 style={styles.aboutCardTitle}>{card.title}</h4>
                <p style={styles.aboutCardText}>{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const styles = {
  welcomeSection: {
    backgroundColor: 'white',
    margin: '0 20px 20px 20px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  welcomeContent: {
    padding: '30px',
    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    borderLeft: '5px solid #00BCD4',
  },
  welcomeTitle: {
    color: '#2c3e50',
    fontSize: '24px',
    fontWeight: '600' as const,
    margin: '0 0 15px 0',
    lineHeight: 1.3,
  },
  welcomeText: {
    color: '#6c757d',
    fontSize: '16px',
    lineHeight: 1.6,
    margin: 0,
  },
  aboutSection: {
    backgroundColor: 'white',
    margin: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  aboutContent: {
    padding: '30px',
  },
  aboutTitle: {
    color: '#2c3e50',
    fontSize: '20px',
    fontWeight: '600' as const,
    margin: '0 0 25px 0',
    textAlign: 'center' as const,
  },
  aboutGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  aboutCard: {
    backgroundColor: '#f8f9fa',
    padding: '25px',
    borderRadius: '10px',
    textAlign: 'center' as const,
    border: '1px solid #e9ecef',
    transition: 'all 0.3s ease',
  },
  aboutCardIcon: {
    fontSize: '2.5rem',
    marginBottom: '15px',
  },
  aboutCardTitle: {
    color: '#00BCD4',
    fontSize: '16px',
    fontWeight: '600' as const,
    margin: '0 0 12px 0',
  },
  aboutCardText: {
    color: '#6c757d',
    fontSize: '14px',
    lineHeight: 1.5,
    margin: 0,
  },
  searchContainer: {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '0 20px',
  },

  // ── Prediction panel styles ───────────────────────────────────────
  varSelectorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
    marginBottom: '16px',
  },
  horizonControl: {
    background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '20px',
    border: '1px solid #dee2e6',
  },
  horizonHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
    flexWrap: 'wrap' as const,
  },
  horizonLabel: {
    fontWeight: '600' as const,
    color: '#2c3e50',
    fontSize: '0.95rem',
  },
  horizonValue: {
    fontWeight: '700' as const,
    color: '#00BCD4',
    fontSize: '1.15rem',
    minWidth: '44px',
  },
  horizonTime: {
    color: '#6c757d',
    fontSize: '0.82rem',
  },
  horizonSlider: {
    width: '100%',
    accentColor: '#00BCD4',
    cursor: 'pointer',
    marginBottom: '8px',
    display: 'block',
  },
  horizonTicks: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 2px',
  },
  predCardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '16px',
  },
  predCard: {
    background: 'white',
    borderRadius: '14px',
    padding: '18px 16px',
    border: '1px solid #e9ecef',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  predCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  predCardIconBg: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.3rem',
    flexShrink: 0,
  },
  predCardTitle: {
    fontWeight: '700' as const,
    color: '#2c3e50',
    fontSize: '0.95rem',
  },
  predCardSubtitle: {
    color: '#6c757d',
    fontSize: '0.78rem',
    marginTop: '2px',
  },
  predCardValue: {
    fontSize: '2.1rem',
    fontWeight: '800' as const,
    color: '#2c3e50',
    lineHeight: 1,
    letterSpacing: '-0.5px',
  },
  predCardMeta: {
    color: '#6c757d',
    fontSize: '0.78rem',
    lineHeight: 1.4,
    flexGrow: 1,
  },
  predCardBadge: {
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.72rem',
    fontWeight: '600' as const,
    alignSelf: 'flex-start',
  },
  predCardLoading: {
    color: '#6c757d',
    fontSize: '0.9rem',
    fontStyle: 'italic' as const,
    padding: '12px 0',
  },
  confianzaBadge: {
    marginTop: '4px',
    padding: '10px 16px',
    borderRadius: '10px',
    color: '#333',
    fontSize: '0.88rem',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
};

export default MonitoringPage;