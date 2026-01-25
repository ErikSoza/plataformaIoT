import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { DeviceData } from './ListaDispositivos';

// Importar leaflet.heat
import 'leaflet.heat';

// Extender la interfaz de Leaflet para incluir el plugin de heatmap
declare module 'leaflet' {
  namespace L {
    function heatLayer(latlngs: Array<[number, number, number?]>, options?: any): any;
  }
}

interface HeatMapLayerProps {
  devices: DeviceData[];
  metric: 'temperature' | 'humidity' | 'pressure' | 'wind';
  visible: boolean;
}

const HeatMapLayer: React.FC<HeatMapLayerProps> = ({ devices, metric, visible }) => {
  const map = useMap();

  useEffect(() => {
    let heatLayer: any = null;

    if (visible) {
      // Filtrar dispositivos que tienen datos para la métrica seleccionada
      const validDevices = devices.filter(device => {
        const value = device[metric];
        return value !== undefined && value !== null && !isNaN(Number(value));
      });
      
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

  return null;
};

export default HeatMapLayer;