import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { DeviceData } from './ListaDispositivos';
import { HEATMAP_CONFIG, normalizar } from '../../config/heatmapConfig';

// Importar leaflet.heat
import 'leaflet.heat';
import 'leaflet-velocity';
import 'leaflet-velocity/dist/leaflet-velocity.css';
// Importar estilos CSS
import './MapaCalor.css';

// Configuración del radio fijo para los círculos de datos
//const CIRCLE_RADIUS = 1500; // Radio fijo en metros (aprox 3km de cobertura por sensor)

// Extender la interfaz de Leaflet para incluir el plugin de heatmap
declare module 'leaflet' {
  namespace L {
    function heatLayer(latlngs: Array<[number, number, number?]>, options?: any): any;
    function velocityLayer(options?: any): any;
  }
}

// Función auxiliar para obtener el color estático desde el gradiente de HEATMAP_CONFIG
const getValueColorFromGradient = (value: number, metric: string): string => {
  const cfg = HEATMAP_CONFIG[metric];
  if (!cfg) return '#666666';
  
  const norm = normalizar(value, cfg.min, cfg.max);
  const stops = Object.keys(cfg.gradient).map(Number).sort((a, b) => a - b);
  
  // Buscar el color correspondiente al porcentaje del valor actual
  for (let i = 0; i < stops.length; i++) {
    if (norm <= stops[i]) {
      return cfg.gradient[stops[i] as keyof typeof cfg.gradient];
    }
  }
  return cfg.gradient[stops[stops.length - 1] as keyof typeof cfg.gradient];
};

// Componente para el Heatmap usando círculos de distancia geográfica realista
interface GeographicHeatmapLayerProps {
  devices: DeviceData[];
  metric: 'temperature' | 'humidity' | 'pressure' | 'wind' | 'gas' | 'radiation';
  visible: boolean;
}

const GeographicHeatmapLayer: React.FC<GeographicHeatmapLayerProps> = ({ devices, metric, visible }) => {
  const map = useMap();
  // Radio máximo estricto en metros para emular "un margen de 2km a su alrededor"
  const BASE_RADIUS_METERS = 2000; 

  useEffect(() => {
    let circleLayers: L.Circle[] = [];

    if (visible && devices.length > 0) {
      const validDevices = devices.filter(
        (s) => s[metric] !== undefined && s[metric] !== null && !isNaN(Number(s[metric]))
      );

      validDevices.forEach((device) => {
        const [lat, lng] = device.coordinates;
        const color = getValueColorFromGradient(Number(device[metric]), metric);
        
        // Simular un efecto "difuminado" (Glow/Heatmap) creando múltiples capas superpuestas
        // de mayor a menor radio, aumentando ligeramente la opacidad hacia el centro.
        //const scales = [1.0, 0.75]; // Radios relativos (100%, 75%, 50%, 25%)
        
        //scales.forEach((scale, index) => {
          const circle = L.circle([lat, lng], {
            radius: BASE_RADIUS_METERS,
            fillColor: color,
            color: 'transparent',    // Sin borde para no arruinar la ilusión de calor
            weight: 0,
            fillOpacity: 0.5, // Opacidad aumenta gradualmente al centro
            interactive: false,
            bubblingMouseEvents: false
          });
          
          circle.addTo(map);
          circleLayers.push(circle);
        //});
      });
    }

    return () => {
      circleLayers.forEach((circle) => {
        if (map.hasLayer(circle)) {
          map.removeLayer(circle);
        }
      });
      circleLayers = [];
    };
  }, [map, devices, metric, visible]);

  return null;
};

// Componente para etiquetas de temperatura fijas
interface TemperatureLabelProps {
  devices: DeviceData[];
  metric: 'temperature' | 'humidity' | 'pressure' | 'wind' | 'gas' | 'radiation';
  visible: boolean;
}

const TemperatureLabels: React.FC<TemperatureLabelProps> = ({ devices, metric, visible }) => {
  const map = useMap();

  // Función para obtener el color de fondo basado en el valor y métrica
  const getValueColor = (value: number, metric: string) => {
    switch (metric) {
      case 'temperature':
        if (value <= 15) return { bg: 'rgba(0, 123, 255, 0.95)', border: '#007bff', class: 'temperature-label-low' };
        if (value >= 30) return { bg: 'rgba(220, 53, 69, 0.95)', border: '#dc3545', class: 'temperature-label-high' };
        return { bg: 'rgba(40, 167, 69, 0.95)', border: '#28a745', class: 'temperature-label-medium' };
      
      case 'humidity':
        if (value <= 30) return { bg: 'rgba(255, 193, 7, 0.95)', border: '#ffc107', class: 'temperature-label-low' };
        if (value >= 80) return { bg: 'rgba(0, 123, 255, 0.95)', border: '#007bff', class: 'temperature-label-high' };
        return { bg: 'rgba(40, 167, 69, 0.95)', border: '#28a745', class: 'temperature-label-medium' };
      
      case 'pressure':
        if (value <= 1005) return { bg: 'rgba(220, 53, 69, 0.95)', border: '#dc3545', class: 'temperature-label-low' };
        if (value >= 1015) return { bg: 'rgba(0, 123, 255, 0.95)', border: '#007bff', class: 'temperature-label-high' };
        return { bg: 'rgba(40, 167, 69, 0.95)', border: '#28a745', class: 'temperature-label-medium' };
      
      default:
        return { bg: 'rgba(255, 255, 255, 0.95)', border: '#00BCD4', class: '' };
    }
  };

  useEffect(() => {
    let labelMarkers: L.Marker[] = [];

    if (visible) {
      // Filtrar dispositivos que tienen datos para la métrica seleccionada
      const validDevices = devices.filter(device => {
        const value = device[metric];
        return value !== undefined && value !== null && !isNaN(Number(value)) && Number(value) > 0;
      });

      // Crear marcadores de etiquetas para cada dispositivo válido
      validDevices.forEach(device => {
        const [lat, lng] = device.coordinates;
        const value = device[metric];
        
        // Formatear el valor según la métrica
        let displayValue = '';
        let unitSymbol = '';
        
        switch (metric) {
          case 'temperature':
            displayValue = Math.round(value!).toString();
            unitSymbol = '°C';
            break;
          case 'humidity':
            displayValue = Math.round(value!).toString();
            unitSymbol = '%';
            break;
          case 'pressure':
            displayValue = Math.round(value!).toString();
            unitSymbol = ' hPa';
            break;
          case 'wind':
            displayValue = value!.toFixed(1);
            unitSymbol = ' m/s';
            break;
          case 'gas':
            displayValue = value!.toFixed(2);
            unitSymbol = ' ppm';
            break;
          case 'radiation':
            displayValue = Math.round(value!).toString();
            unitSymbol = ' W/m²';
            break;
        }

        // Obtener colores dinámicos
        const colorInfo = getValueColor(value!, metric);
        
        // Crear ícono personalizado con el valor de la métrica
        const labelIcon = L.divIcon({
          className: `temperature-label-icon ${colorInfo.class}`,
          html: `
            <div style="
              background: ${colorInfo.bg};
              color: white;
              padding: 4px 8px;
              border-radius: 12px;
              font-weight: bold;
              font-size: 13px;
              text-align: center;
              white-space: nowrap;
              border: 2px solid ${colorInfo.border};
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
              min-width: 45px;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              backdrop-filter: blur(8px);
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
            ">
              ${displayValue}${unitSymbol}
            </div>
          `,
          iconSize: [60, 24],
          iconAnchor: [30, 12]
        });

        // Crear el marcador y agregarlo al mapa
        const labelMarker = L.marker([lat, lng], { icon: labelIcon });
        labelMarker.addTo(map);
        labelMarkers.push(labelMarker);
      });
    }

    // Cleanup: remover las etiquetas cuando el componente se desmonte o cambie
    return () => {
      labelMarkers.forEach(marker => {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      });
      labelMarkers = [];
    };
  }, [map, devices, metric, visible]);

  return null;
};

// --- INICIO PARCHE LEAFLET-VELOCITY ---
// Esto soluciona un error crítico de React (Strict Mode) donde los callbacks 
// intentan acceder a this._map después de que el componente (y la capa) fue desmontado.
if (typeof L !== 'undefined' && (L as any).CanvasLayer) {
  const origDrawLayer = (L as any).CanvasLayer.prototype.drawLayer;
  if (origDrawLayer && !origDrawLayer.__patched) {
    (L as any).CanvasLayer.prototype.drawLayer = function(...args: any[]) {
      if (!this._map) return;
      return origDrawLayer.apply(this, args);
    };
    (L as any).CanvasLayer.prototype.drawLayer.__patched = true;
  }

  const origOnLayerDidMove = (L as any).CanvasLayer.prototype._onLayerDidMove;
  if (origOnLayerDidMove && !origOnLayerDidMove.__patched) {
    (L as any).CanvasLayer.prototype._onLayerDidMove = function(...args: any[]) {
      if (!this._map) return;
      return origOnLayerDidMove.apply(this, args);
    };
    (L as any).CanvasLayer.prototype._onLayerDidMove.__patched = true;
  }
}
if (typeof L !== 'undefined' && (L as any).VelocityLayer) {
  const origStartWindy = (L as any).VelocityLayer.prototype._startWindy;
  if (origStartWindy && !origStartWindy.__patched) {
    (L as any).VelocityLayer.prototype._startWindy = function(...args: any[]) {
      if (!this._map) return;
      return origStartWindy.apply(this, args);
    };
    (L as any).VelocityLayer.prototype._startWindy.__patched = true;
  }
}
// --- FIN PARCHE ---

// Componente para animación de viento
interface WindAnimationLayerProps {
  devices: DeviceData[];
  metric: string;
  visible: boolean;
}

const WindAnimationLayer: React.FC<WindAnimationLayerProps> = ({ devices, metric, visible }) => {
  const map = useMap();
  const velocityLayerRef = useRef<any>(null);

  useEffect(() => {
    // Si no es la métrica visible de viento o temperatura, limpiamos de forma segura y salimos
    if (!visible || (metric !== 'wind' && metric !== 'temperature')) {
      if (velocityLayerRef.current) {
        try {
          if (map && map.hasLayer(velocityLayerRef.current)) {
            map.removeLayer(velocityLayerRef.current);
          }
        } catch (e) {
          // Ignorar errores de capa fantasma
        }
        velocityLayerRef.current = null;
      }
      return;
    }

    const sensoresViento = devices.filter(s =>
      s.wind != null && !isNaN(Number(s.wind))
    );

    if (sensoresViento.length < 2) {
      console.warn('[Viento] Se necesitan al menos 2 sensores con wind');
      return;
    }

    const puntosUV = sensoresViento.map(s => {
      const spd = Number(s.wind);
      const dir = (s as any).windDirection ?? ((s.id * 37) % 360);
      return {
        lat: s.coordinates[0],
        lng: s.coordinates[1],
        U: -spd * Math.sin(dir * Math.PI / 180),
        V: -spd * Math.cos(dir * Math.PI / 180)
      };
    });

    const lats = puntosUV.map(p => p.lat);
    const lngs = puntosUV.map(p => p.lng);
    const minLat = Math.min(...lats) - 0.05;
    const maxLat = Math.max(...lats) + 0.05;
    const minLng = Math.min(...lngs) - 0.05;
    const maxLng = Math.max(...lngs) + 0.05;
    const nx = 40, ny = 40;

    const interpolar = (campo: 'U' | 'V') => {
      const resultado: number[] = [];

      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const lat = maxLat - j * (maxLat - minLat) / (ny - 1);
          const lng = minLng + i * (maxLng - minLng) / (nx - 1);

          let sumPeso = 0, sumValor = 0;
          let menorDistanciaMts = Infinity;

          for (const p of puntosUV) {
            // calculamos la distancia fisica real en metro de leaflet

            const distanciaMetros = map.distance([lat, lng], [p.lat, p.lng]);

            if (distanciaMetros < menorDistanciaMts) {
              menorDistanciaMts = distanciaMetros;
            }

            // Mantenemos el calculo IDW pero con un peso máximo para evitar distorsiones extremas
            const dist2 = (p.lat - lat) ** 2 + (p.lng - lng) ** 2;
            const peso = dist2 < 1e-10 ? 1e10 : 1 / dist2;
            sumPeso += peso;
            sumValor += peso * p[campo];
          }
          if (menorDistanciaMts > 2000) {
            resultado.push(NaN); // No hay viento real, forzamos a NaN (vacío) para que no se dibujen partículas quietas.
          } else {
            resultado.push(sumValor / sumPeso); // Sí hay viento interpolado.
          }
        }
      }
      return resultado;
    };

    const dataU = interpolar('U');
    const dataV = interpolar('V');
    const dx = (maxLng - minLng) / (nx - 1);
    const dy = (maxLat - minLat) / (ny - 1);

    const jsonVelocity = [
      {
        header: {
          parameterCategory: 2,
          parameterNumber: 2,
          parameterUnit: 'm.s-1',
          lo1: minLng, la1: maxLat, lo2: maxLng, la2: minLat,
          nx, ny, dx, dy
        },
        data: dataU
      },
      {
        header: {
          parameterCategory: 2,
          parameterNumber: 3,
          parameterUnit: 'm.s-1',
          lo1: minLng, la1: maxLat, lo2: maxLng, la2: minLat,
          nx, ny, dx, dy
        },
        data: dataV
      }
    ];

    if (velocityLayerRef.current) {
      try {
        if (map.hasLayer(velocityLayerRef.current)) {
           map.removeLayer(velocityLayerRef.current);
        }
      } catch (e) { }
    }

    try {
      const isTemperature = metric === 'temperature';

      const velLayer = (L as any).velocityLayer({
        displayValues: true,
        displayOptions: {
          velocityType: 'Viento',
          displayPosition: 'bottomleft',
          displayEmptyString: 'Sin datos de viento',
          angleConvention: 'bearingCW',
          speedUnit: 'm/s'
        },
        data: jsonVelocity,
        maxVelocity: 15,
        colorScale: isTemperature ? ['#ffffff'] : ['#72b9ff','#9ecae1','#3182bd','#08306b'],
        velocityScale: 0.01,
        particleAge: isTemperature ? 20 : 40,
        lineWidth: 1,
        particleMultiplier: isTemperature ? 0.0005 : 0.002,
      });

      velocityLayerRef.current = velLayer;
      velLayer.addTo(map);

    } catch(e) {
      console.error('Error montando velocityLayer:', e);
    }

    // Cleanup profundo cuando el componente finalice o haya re-render
    return () => {
      if (velocityLayerRef.current) {
        try {
          if (map && map.hasLayer(velocityLayerRef.current)) {
            map.removeLayer(velocityLayerRef.current);
          }
        } catch(e) {}
        velocityLayerRef.current = null;
      }
    };
  }, [map, devices, metric, visible]);

  return null;
};

interface HeatMapLayerProps {
  devices: DeviceData[];
  metric: 'temperature' | 'humidity' | 'pressure' | 'wind' | 'gas' | 'radiation';
  visible: boolean;
  showLabels?: boolean; // Nueva prop para controlar la visibilidad de las etiquetas
}

const HeatMapLayer: React.FC<HeatMapLayerProps> = ({ devices, metric, visible, showLabels = true }) => {
  return (
    <>
      {metric !== 'wind' && <GeographicHeatmapLayer devices={devices} metric={metric} visible={visible} />}
      {(metric === 'wind' || metric === 'temperature') && <WindAnimationLayer devices={devices} metric={metric} visible={visible} />}
      <TemperatureLabels devices={devices} metric={metric} visible={visible && showLabels} />
    </>
  );
};

export default HeatMapLayer;