// ==================== CONFIGURACIÓN DE MAPAS ====================

export const MAP_CONFIG = {
  // Centro por defecto (Campus UTalca)
  DEFAULT_CENTER: [-35.0020711, -71.2288796] as [number, number],
  DEFAULT_ZOOM: 15,
  SELECTED_ZOOM: 16,
  
  // Configuración de marcadores
  MARKER: {
    SELECTED_SIZE: 20,
    DEFAULT_SIZE: 15,
    BORDER_WIDTH: 3,
    BORDER_COLOR: 'white',
    SHADOW: '0 2px 8px rgba(0,0,0,0.3)',
  },
  
  // Configuración de animaciones
  ANIMATION: {
    PULSE_DURATION: '2s',
    FLY_TO_DURATION: 1.5,
  },
  
  // Configuración de mapa de calor
  HEATMAP: {
    RADIUS: 300,
    OPACITY: 0.7,
    BLUR: 25,
    MAX_ZOOM: 17,
  },
};

// ==================== COLORES DEL SISTEMA ====================

export const DEVICE_STATUS_COLORS = {
  Activo: '#28a745',
  Inactivo: '#6c757d',
  Mantenimiento: '#ffc107',
  Error: '#dc3545',
  Selected: '#FF6B35',
} as const;

export const THEME_COLORS = {
  primary: '#00BCD4',
  secondary: '#FF6B35',
  success: '#28a745',
  warning: '#ffc107',
  danger: '#dc3545',
  info: '#17a2b8',
  light: '#f8f9fa',
  dark: '#343a40',
} as const;

// ==================== CONFIGURACIÓN DE HEATMAP ====================

export const HEATMAP_GRADIENTS = {
  temperature: {
    '0.0': 'blue',
    '0.2': 'cyan',
    '0.4': 'lime',
    '0.6': 'yellow',
    '0.8': 'orange',
    '1.0': 'red'
  },
  humidity: {
    '0.0': '#f7fbff',
    '0.2': '#deebf7',
    '0.4': '#c6dbef',
    '0.6': '#9ecae1',
    '0.8': '#6baed6',
    '1.0': '#08519c'
  },
  battery: {
    '0.0': '#d73027',
    '0.1': '#f46d43',
    '0.2': '#fdae61',
    '0.3': '#fee08b',
    '0.4': '#ffffbf',
    '0.5': '#e6f598',
    '0.6': '#abdda4',
    '0.7': '#66c2a5',
    '0.8': '#3288bd',
    '1.0': '#5e4fa2'
  },
  pressure: {
    '0.0': '#800026',
    '0.2': '#bd0026',
    '0.4': '#e31a1c',
    '0.6': '#fc4e2a',
    '0.8': '#fd8d3c',
    '1.0': '#feb24c'
  },
  gas: {
    '0.0': '#00ff00',
    '0.2': '#80ff00',
    '0.4': '#ffff00',
    '0.6': '#ff8000',
    '0.8': '#ff4000',
    '1.0': '#ff0000'
  },
  radiation: {
    '0.0': '#ffffcc',
    '0.2': '#ffeda0',
    '0.4': '#fed976',
    '0.6': '#feb24c',
    '0.8': '#fd8d3c',
    '1.0': '#f03b20'
  }
} as const;

// ==================== CONFIGURACIÓN DE MÉTRICAS ====================

export const METRIC_CONFIG = {
  temperature: {
    icon: '🌡️',
    name: 'Temperatura',
    unit: '°C',
    normalizeRange: { min: 0, max: 40 },
    gradient: HEATMAP_GRADIENTS.temperature,
  },
  humidity: {
    icon: '💧',
    name: 'Humedad',
    unit: '%',
    normalizeRange: { min: 0, max: 100 },
    gradient: HEATMAP_GRADIENTS.humidity,
  },
  battery: {
    icon: '🔋',
    name: 'Batería',
    unit: '%',
    normalizeRange: { min: 0, max: 100 },
    gradient: HEATMAP_GRADIENTS.battery,
  },
  pressure: {
    icon: '🌫️',
    name: 'Presión',
    unit: 'hPa',
    normalizeRange: { min: 1000, max: 1020 },
    gradient: HEATMAP_GRADIENTS.pressure,
  },
  gas: {
    icon: '🌪️',
    name: 'Calidad del Aire',
    unit: '',
    normalizeRange: { min: 0, max: 0.1 },
    gradient: HEATMAP_GRADIENTS.gas,
  },
  radiation: {
    icon: '☀️',
    name: 'Radiación Solar',
    unit: 'W/m²',
    normalizeRange: { min: 0, max: 1000 },
    gradient: HEATMAP_GRADIENTS.radiation,
  },
} as const;

export type MetricType = keyof typeof METRIC_CONFIG;

// ==================== ESTILOS COMPARTIDOS ====================

export const SHARED_STYLES = {
  // Contenedores
  pageContainer: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    fontFamily: "'Roboto', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  
  // Componentes de mapa
  mapControlPanel: {
    position: 'absolute' as const,
    top: '10px',
    right: '10px',
    zIndex: 1000,
    background: 'white',
    padding: '15px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    minWidth: '200px',
  },
  
  mapContainer: {
    overflow: 'hidden' as const,
    boxShadow: '0 6px 25px rgba(0, 0, 0, 0.15)',
    border: '1px solid #dee2e6',
    borderRadius: '10px',
  },
  
  // Estados de conexión
  connectionIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 16px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #dee2e6',
    fontSize: '14px',
    color: '#6c757d',
  },
  
  connectionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '8px',
    display: 'inline-block' as const,
  },
  
  // Popups y tooltips
  popupContainer: {
    padding: '10px',
    minWidth: '200px',
  },
  
  popupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: THEME_COLORS.primary,
  },
  
  metricsContainer: {
    borderTop: '1px solid #e9ecef',
    paddingTop: '8px',
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  
  metricBadge: {
    background: '#f8f9fa',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.85rem',
  },
  
  // Formularios y controles
  controlLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    marginBottom: '5px',
  },
  
  legend: {
    marginTop: '10px',
    padding: '8px',
    background: '#f8f9fa',
    borderRadius: '5px',
    fontSize: '0.8rem',
  },
};

// ==================== UTILIDADES DE FORMATO ====================

export const FORMATTERS = {
  // Formatear fecha para Chile
  formatDate: (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-CL');
    } catch {
      return dateString;
    }
  },
  
  // Formatear ID con padding
  formatDeviceId: (id: number): string => {
    return `#${id.toString().padStart(3, '0')}`;
  },
  
  // Formatear valores con unidades
  formatMetricValue: (value: number | undefined, metric: MetricType): string => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    
    const config = METRIC_CONFIG[metric];
    const formattedValue = metric === 'radiation' || metric === 'pressure' 
      ? value.toFixed(0) 
      : value.toFixed(1);
    
    return `${formattedValue}${config.unit}`;
  },
  
  // Normalizar valores para heatmap
  normalizeValue: (value: number, metric: MetricType): number => {
    const config = METRIC_CONFIG[metric];
    const { min, max } = config.normalizeRange;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  },
};

// ==================== CONSTANTES DE VALIDACIÓN ====================

export const VALIDATION = {
  // Coordenadas de Chile (aprox)
  CHILE_BOUNDS: {
    north: -17.5,
    south: -56.0,
    east: -66.0,
    west: -75.0,
  },
  
  // Rangos válidos para métricas
  METRIC_RANGES: {
    temperature: { min: -50, max: 60 },
    humidity: { min: 0, max: 100 },
    battery: { min: 0, max: 100 },
    pressure: { min: 950, max: 1050 },
    gas: { min: 0, max: 1 },
    radiation: { min: 0, max: 2000 },
  },
};

// ==================== CONFIGURACIÓN DE API ====================

export const API_CONFIG = {
  BASE_URL: 'http://localhost:3000/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  CHECK_INTERVAL: 30000, // 30 segundos
};

const CONFIG = {
  MAP_CONFIG,
  DEVICE_STATUS_COLORS,
  THEME_COLORS,
  METRIC_CONFIG,
  SHARED_STYLES,
  FORMATTERS,
  VALIDATION,
  API_CONFIG,
};

export default CONFIG;