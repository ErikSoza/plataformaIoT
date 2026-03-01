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

// Componente para círculos de temperatura fijos (reemplaza el heatmap tradicional)
interface FixedTemperatureCirclesProps {
  devices: DeviceData[];
  metric: 'temperature' | 'humidity' | 'pressure' | 'wind' | 'gas' | 'radiation';
  visible: boolean;
}

const FixedTemperatureCircles: React.FC<FixedTemperatureCirclesProps> = ({ devices, metric, visible }) => {
  const map = useMap();

  // Función para obtener color fijo basado en el valor y métrica
  const getFixedColor = (value: number, metric: string) => {
    switch (metric) {
      case 'temperature':
        if (value <= 10) return '#0066cc'; // Azul muy frío
        if (value <= 15) return '#0099ff'; // Azul frío
        if (value <= 20) return '#33cc33'; // Verde fresco
        if (value <= 25) return '#66ff66'; // Verde cálido
        if (value <= 30) return '#ffff00'; // Amarillo
        if (value <= 35) return '#ff9900'; // Naranja
        return '#ff0000'; // Rojo caliente
      
      case 'humidity':
        if (value <= 20) return '#ffff99'; // Amarillo seco
        if (value <= 40) return '#99ff99'; // Verde seco
        if (value <= 60) return '#66ccff'; // Azul medio
        if (value <= 80) return '#0099ff'; // Azul húmedo
        return '#0066cc'; // Azul muy húmedo
      
      case 'pressure':
        if (value <= 1000) return '#ff0000'; // Rojo baja presión
        if (value <= 1005) return '#ff6600'; // Naranja
        if (value <= 1010) return '#ffff00'; // Amarillo
        if (value <= 1015) return '#66ff66'; // Verde
        return '#0066ff'; // Azul alta presión
      
      case 'wind':
        if (value <= 2) return '#99ff99'; // Verde suave
        if (value <= 5) return '#ffff66'; // Amarillo moderado
        if (value <= 10) return '#ff9966'; // Naranja fuerte
        return '#ff6666'; // Rojo muy fuerte
      
      case 'gas':
        if (value <= 0.02) return '#00ff00'; // Verde buena calidad
        if (value <= 0.05) return '#66ff66'; // Verde claro
        if (value <= 0.08) return '#ffff00'; // Amarillo moderado
        return '#ff0000'; // Rojo mala calidad
      
      case 'radiation':
        if (value <= 200) return '#66ccff'; // Azul baja
        if (value <= 400) return '#99ff99'; // Verde baja-media
        if (value <= 600) return '#ffff66'; // Amarillo media
        if (value <= 800) return '#ff9966'; // Naranja alta
        return '#ff6666'; // Rojo muy alta
      
      default:
        return '#666666';
    }
  };

  useEffect(() => {
    let circleMarkers: L.CircleMarker[] = [];

    if (visible) {
      // Filtrar dispositivos que tienen datos para la métrica seleccionada
      const validDevices = devices.filter(device => {
        const value = device[metric];
        return value !== undefined && value !== null && !isNaN(Number(value)) && Number(value) > 0;
      });

      // Crear círculos fijos para cada dispositivo válido
      validDevices.forEach(device => {
        const [lat, lng] = device.coordinates;
        const value = device[metric]!;
        const color = getFixedColor(value, metric);
        
        // Crear círculo con color fijo
        const circle = L.circleMarker([lat, lng], {
          radius: 80, // Radio fijo en píxeles
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.4,
          // Importante: no usar pane 'overlayPane' para evitar interferencia con zoom
        });
        
        circle.addTo(map);
        circleMarkers.push(circle);
      });
    }

    // Cleanup: remover los círculos cuando el componente se desmonte o cambie
    return () => {
      circleMarkers.forEach(circle => {
        if (map.hasLayer(circle)) {
          map.removeLayer(circle);
        }
      });
      circleMarkers = [];
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

interface HeatMapLayerProps {
  devices: DeviceData[];
  metric: 'temperature' | 'humidity' | 'pressure' | 'wind' | 'gas' | 'radiation';
  visible: boolean;
  showLabels?: boolean; // Nueva prop para controlar la visibilidad de las etiquetas
}

const HeatMapLayer: React.FC<HeatMapLayerProps> = ({ devices, metric, visible, showLabels = true }) => {
  // Nota: Ya no usamos el heatmap tradicional de leaflet.heat porque cambia con el zoom
  // En su lugar usamos círculos fijos que mantienen su color constante
  
  // Renderizar los círculos de temperatura fijos y las etiquetas
  return (
    <>
      <FixedTemperatureCircles devices={devices} metric={metric} visible={visible} />
      <TemperatureLabels devices={devices} metric={metric} visible={visible && showLabels} />
    </>
  );
};

export default HeatMapLayer;