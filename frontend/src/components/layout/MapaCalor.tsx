import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { DeviceData } from './ListaDispositivos';

// Importar leaflet.heat de manera que extienda L
require('leaflet.heat');

// Extendemos la interfaz de Leaflet para incluir el plugin de heatmap
declare global {
  interface Window {
    L: typeof L & {
      heatLayer: (latlngs: number[][], options?: any) => any;
    };
  }
}

// Extender el namespace L directamente
(L as any).heatLayer = (L as any).heatLayer;

interface HeatMapLayerProps {
  devices: DeviceData[];
  metric: 'temperature' | 'humidity' | 'battery';
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
        const heatData = validDevices.map(device => {
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
            case 'battery':
              // Normalizar batería (0% = 0, 100% = 1)
              intensity = Math.max(0, Math.min(1, device.battery! / 100));
              break;
          }

          return [lat, lng, intensity];
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
                  0.0: 'blue',
                  0.2: 'cyan',
                  0.4: 'lime',
                  0.6: 'yellow',
                  0.8: 'orange',
                  1.0: 'red'
                }
              };
            case 'humidity':
              return {
                ...baseOptions,
                gradient: {
                  0.0: '#f7fbff',
                  0.2: '#deebf7',
                  0.4: '#c6dbef',
                  0.6: '#9ecae1',
                  0.8: '#6baed6',
                  1.0: '#08519c'
                }
              };
            case 'battery':
              return {
                ...baseOptions,
                gradient: {
                  0.0: '#d73027',
                  0.1: '#f46d43',
                  0.2: '#fdae61',
                  0.3: '#fee08b',
                  0.4: '#ffffbf',
                  0.5: '#e6f598',
                  0.6: '#abdda4',
                  0.7: '#66c2a5',
                  0.8: '#3288bd',
                  1.0: '#5e4fa2'
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