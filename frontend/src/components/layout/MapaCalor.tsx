import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { DeviceData } from './ListaDispositivos';

// Importar leaflet.heat
import 'leaflet.heat';
// Importar estilos CSS
import './MapaCalor.css';

// Extender la interfaz de Leaflet para incluir el plugin de heatmap
declare module 'leaflet' {
  namespace L {
    function heatLayer(latlngs: Array<[number, number, number?]>, options?: any): any;
  }
}

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

interface HeatMapLayerProps {
  devices: DeviceData[];
  metric: 'temperature' | 'humidity' | 'pressure' | 'wind' | 'gas' | 'radiation';
  visible: boolean;
  showLabels?: boolean; // Nueva prop para controlar la visibilidad de las etiquetas
}

const HeatMapLayer: React.FC<HeatMapLayerProps> = ({ devices, metric, visible, showLabels = true }) => {
  const map = useMap();

  useEffect(() => {
    let heatLayer: any = null;

    if (visible) {
      // Filtrar dispositivos que tienen datos para la métrica seleccionada
      console.log(`🗺️ MapaCalor: Evaluando ${devices.length} dispositivos para métrica ${metric}`);
      
      const validDevices = devices.filter(device => {
        const value = device[metric];
        const isValid = value !== undefined && value !== null && !isNaN(Number(value)) && Number(value) > 0;
        
        if (!isValid) {
          console.log(`❌ Dispositivo ${device.name}: ${metric} = ${value} (inválido)`);
        } else {
          console.log(`✅ Dispositivo ${device.name}: ${metric} = ${value} (válido)`);
        }
        
        return isValid;
      });
      
      console.log(`🔍 MapaCalor: ${validDevices.length} dispositivos válidos de ${devices.length} total`);
      
      if (validDevices.length > 0) {
        // Preparar datos para el mapa de calor
        const heatData: Array<[number, number, number]> = validDevices.map(device => {
          const [lat, lng] = device.coordinates;
          let intensity = 0;

          // Normalizar los valores según la métrica
          switch (metric) {
            case 'temperature':
              // Normalizar temperatura (0°C = 0, 40°C = 1)
              intensity = Math.max(0, Math.min(1, (device.temperature! - 0) / 40));
              break;
            case 'humidity':
              // Normalizar humedad (0% = 0, 100% = 1)
              intensity = Math.max(0, Math.min(1, device.humidity! / 100));
              break;
            case 'pressure':
              // Normalizar presión (1000 hPa = 0, 1020 hPa = 1)
              intensity = Math.max(0, Math.min(1, (device.pressure! - 1000) / 20));
              break;
            case 'wind':
              // Normalizar velocidad del viento (0 m/s = 0, 20 m/s = 1)
              intensity = Math.max(0, Math.min(1, device.wind! / 20));
              break;
            case 'gas':
              // Normalizar calidad del aire (0 = 0, 0.1 = 1)
              intensity = Math.max(0, Math.min(1, device.gas! / 0.1));
              break;
            case 'radiation':
              // Normalizar radiación (0 W/m² = 0, 1000 W/m² = 1)
              intensity = Math.max(0, Math.min(1, device.radiation! / 1000));
              break;
          }

          return [lat, lng, intensity] as [number, number, number];
        });

        // Configurar opciones del mapa de calor según la métrica
        const getHeatmapOptions = () => {
          const baseOptions = {
            radius: 50,
            blur: 25, 
            maxZoom: 17, 
          };

          switch (metric) {
            case 'temperature':
              return {
                ...baseOptions,
                gradient: {
                  '0.0': 'blue',
                  '0.2': 'cyan',
                  '0.4': 'lime',
                  '0.6': 'yellow',
                  '0.8': 'orange',
                  '1.0': 'red'
                }
              };
            case 'humidity':
              return {
                ...baseOptions,
                gradient: {
                  '0.0': '#f7fbff',
                  '0.2': '#deebf7',
                  '0.4': '#c6dbef',
                  '0.6': '#9ecae1',
                  '0.8': '#6baed6',
                  '1.0': '#08519c'
                }
              };
            case 'pressure':
              return {
                ...baseOptions,
                gradient: {
                  '0.0': '#800026',
                  '0.2': '#bd0026',
                  '0.4': '#e31a1c',
                  '0.6': '#fc4e2a',
                  '0.8': '#fd8d3c',
                  '1.0': '#feb24c'
                }
              };
            case 'wind':
              return {
                ...baseOptions,
                gradient: {
                  '0.0': '#ffffb2',
                  '0.2': '#fecc5c',
                  '0.4': '#fd8d3c',
                  '0.6': '#f03b20',
                  '0.8': '#bd0026',
                  '1.0': '#800026'
                }
              };
            case 'gas':
              return {
                ...baseOptions,
                gradient: {
                  '0.0': '#00ff00',
                  '0.2': '#80ff00',
                  '0.4': '#ffff00',
                  '0.6': '#ff8000',
                  '0.8': '#ff4000',
                  '1.0': '#ff0000'
                }
              };
            case 'radiation':
              return {
                ...baseOptions,
                gradient: {
                  '0.0': '#ffffcc',
                  '0.2': '#ffeda0',
                  '0.4': '#fed976',
                  '0.6': '#feb24c',
                  '0.8': '#fd8d3c',
                  '1.0': '#f03b20'
                }
              };
            
            default:
              return baseOptions;
          }
        };

        // Crear y agregar capa de mapa de calor
        heatLayer = (L as any).heatLayer(heatData, getHeatmapOptions());
        map.addLayer(heatLayer);
      }
    }

    // Cleanup: remover la capa cuando el componente se desmonte o cambie
    return () => {
      if (heatLayer && map.hasLayer(heatLayer)) {
        map.removeLayer(heatLayer);
      }
    };
  }, [map, devices, metric, visible]);

  // Renderizar las etiquetas de temperatura junto con el mapa de calor
  return (
    <>
      <TemperatureLabels devices={devices} metric={metric} visible={visible && showLabels} />
    </>
  );
};

export default HeatMapLayer;