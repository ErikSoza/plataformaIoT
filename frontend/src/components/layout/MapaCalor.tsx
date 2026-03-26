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
  const overlayRef = useRef<L.ImageOverlay | null>(null);

  useEffect(() => {
    // Si se oculta o no hay datos, limpiamos la capa
    if (!visible || devices.length === 0) {
      if (overlayRef.current && map.hasLayer(overlayRef.current)) {
        map.removeLayer(overlayRef.current);
        overlayRef.current = null;
      }
      return;
    }

    const validDevices = devices.filter(
      (s) => s[metric] !== undefined && s[metric] !== null && !isNaN(Number(s[metric]))
    );

    if (validDevices.length === 0) return;

    // 0. Pre-procesar dispositivos a números estrictos para máxima velocidad y evitar errores de NaN
    const parsedDevices = validDevices.map(d => ({
      val: Number(d[metric]),
      lat: Number(d.coordinates[0]),
      lng: Number(d.coordinates[1])
    }));

    // 1. Calcular el Bounding Box exacto que engloba a todos los sensores
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    parsedDevices.forEach((device) => {
      if (device.lat < minLat) minLat = device.lat;
      if (device.lat > maxLat) maxLat = device.lat;
      if (device.lng < minLng) minLng = device.lng;
      if (device.lng > maxLng) maxLng = device.lng;
    });

    // 2. Expandir el bounding box para cubrir visualmente el radio de acción
    // Si es humedad, la "masa de aire" la hacemos más expansiva (3km), de lo contrario 2km.
    const MAX_DISTANCE_METERS = metric === 'humidity' ? 3000 : 2000;
    const padding = metric === 'humidity' ? 0.04 : 0.03; 
    minLat -= padding;
    maxLat += padding;
    minLng -= padding;
    maxLng += padding;

    const bounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);

    // 3. Crear un grid "Canvas" off-screen para dibujar los pixeles de calor
    const GRID_SIZE = 150; // Resolución equilibrada para rendimiento y calidad visual
    const canvas = document.createElement('canvas');
    canvas.width = GRID_SIZE;
    canvas.height = GRID_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 4. Utilidad rápida de distancia entre coordenadas (Haversine optimizado)
    const deg2rad = Math.PI / 180;
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3;
      const x = (lon2 - lon1) * Math.cos((lat1 + lat2) / 2 * deg2rad);
      const y = lat2 - lat1;
      return Math.sqrt(x * x + y * y) * R * deg2rad;
    };

    // 5. Interpolarización por IDW (Inverse Distance Weighting)
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        // Mapear Coordenadas Canvas (X,Y) -> Grados Geográficos (Lat, Lng)
        const pointLat = maxLat - (y / GRID_SIZE) * (maxLat - minLat);
        const pointLng = minLng + (x / GRID_SIZE) * (maxLng - minLng);

        let sumWeights = 0;
        let sumValues = 0;
        let minDist = Infinity;

        // Medir distancias y pesos para cada sensor
        parsedDevices.forEach((d) => {
          // d.lat y d.lng ahora son 100% numéricos, previniendo errores NaN de interpolación
          let d_mts = getDistance(pointLat, pointLng, d.lat, d.lng);
          
          if (d_mts < minDist) minDist = d_mts;

          // Truco: min distance de 1 metro para evitar división entre cero si está a 0
          if (d_mts < 1) d_mts = 1;
          
          const weight = 1 / Math.pow(d_mts, 2.5); // Fricción/potencia de IDW
          sumWeights += weight;
          sumValues += (d.val * weight);
        });

        // 6. Si el punto de la cuadrícula evaluada está a menos de 2km de AL MENOS 1 sensor
        if (minDist <= MAX_DISTANCE_METERS && sumWeights > 0 && !isNaN(sumValues) && !isNaN(sumWeights)) {
          const interpolatedValue = sumValues / sumWeights;
          const color = getValueColorFromGradient(interpolatedValue, metric);
          
          // Difuminado de bordes para que no se vea cortado seco
          let alpha = metric === 'humidity' ? 0.85 : 0.7; // Opacidad máxima base
          const fadeOutDistance = metric === 'humidity' ? 1500 : 800; // La humedad se desvanece más gradualmente
          
          if (minDist > MAX_DISTANCE_METERS - fadeOutDistance) {
            // Un "fade out" en los bordes
            alpha *= (MAX_DISTANCE_METERS - minDist) / fadeOutDistance;
          }

          if (alpha > 0) {
             // Pintar la matriz (sobreponiendo 1px extra para evitar rejillas transparentes)
             ctx.fillStyle = color;
             ctx.globalAlpha = alpha;
             ctx.fillRect(x, y, 2, 2);
          }
        }
      }
    }

    // 7. Generar Imagen Base64 desde el Canvas
    const dataUrl = canvas.toDataURL('image/png');
    
    // Remover la capa estática anterior si está presenté
    if (overlayRef.current && map.hasLayer(overlayRef.current)) {
      map.removeLayer(overlayRef.current);
    }

    // Y montamos el Grid interpolado recién pintado al Leaflet
    overlayRef.current = L.imageOverlay(dataUrl, bounds, {
      opacity: metric === 'humidity' ? 0.65 : 0.4,
      interactive: false,
      className: metric === 'humidity' ? 'humidity-breath-effect' : '',
    }).addTo(map);

    // Limpieza habitual del Hook
    return () => {
      if (overlayRef.current && map.hasLayer(overlayRef.current)) {
        map.removeLayer(overlayRef.current);
      }
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
        if (value <= 30) return { bg: 'rgba(215, 205, 185, 0.9)', border: '#b89d78', class: 'temperature-label-low' };
        if (value >= 80) return { bg: 'rgba(75, 155, 206, 0.9)', border: '#4b9bce', class: 'temperature-label-high' };
        return { bg: 'rgba(102, 217, 232, 0.9)', border: '#66d9e8', class: 'temperature-label-medium' };
      
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
        let extraInfoHtml = ''; // Para agregar info adicional como el punto de rocío
        
        switch (metric) {
          case 'temperature':
            displayValue = Math.round(value!).toString();
            unitSymbol = '°C';
            break;
          case 'humidity':
            displayValue = Math.round(value!).toString();
            unitSymbol = '%';
            
            // Calculo del Punto de Rocío (Dew Point) usando aproximación de Magnus-Tetens
            if (device.temperature !== undefined && device.temperature !== null) {
              const t = Number(device.temperature);
              const rh = Number(value);
              const alpha = 17.271;
              const beta = 237.7;
              const gamma = (alpha * t) / (beta + t) + Math.log(rh / 100.0);
              const dewPoint = (beta * gamma) / (alpha - gamma);
              
              // Simulación de predicción de lluvia (Zambretti simplificado)
              let rainProb = 0;
              if (device.pressure !== undefined) {
                const p = Number(device.pressure);
                if (p < 1000) rainProb += 50;
                else if (p < 1010) rainProb += 30;
                else if (p < 1015) rainProb += 10;
              }
              
              if (rh > 85) rainProb += 30;
              else if (rh > 70) rainProb += 15;
              
              if (t - dewPoint < 2) rainProb += 20;
              else if (t - dewPoint < 4) rainProb += 10;
              
              rainProb = Math.min(100, Math.max(0, rainProb));
              const rainMood = rainProb > 70 ? '🌧️' : rainProb > 40 ? '🌦️' : '⛅';
              
              extraInfoHtml = `
                <div style="font-size: 10px; font-weight: 500; margin-top: 3px; color: rgba(255,255,255,0.95); border-top: 1px solid rgba(255,255,255,0.4); padding-top: 2px;">
                  Rocío: ${dewPoint.toFixed(1)}°C <br/>
                  Pred. Lluvia: ${Math.round(rainProb)}% ${rainMood}
                </div>
              `;
            }
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
          className: `temperature-label-icon ${colorInfo.class} ${metric === 'humidity' ? 'humidity-pulse-effect' : ''}`,
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
              <div>${displayValue}${unitSymbol}</div>
              ${extraInfoHtml}
            </div>
          `,
          iconSize: [60, extraInfoHtml ? 42 : 24],
          iconAnchor: [30, extraInfoHtml ? 21 : 12]
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
        lineWidth: 2,
        particleMultiplier: isTemperature ? 0.00005 : 0.001,
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