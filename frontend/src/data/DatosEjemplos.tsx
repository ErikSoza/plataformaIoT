import { DeviceData, StatCardData } from '../components/layout';

// Datos de sensores IoT - Todos manejan temperatura, humedad y batería
export const deviceData: DeviceData[] = [
  {
    id: 1,
    name: 'Sensor Centro Extensión Curicó',
    type: 'Sensor Ambiental IoT',
    status: 'Activo',
    lastUpdate: '2025-10-07 14:30',
    location: 'Centro de Extensión Curicó',
    coordinates: [-34.9849294, -71.2406668],
    temperature: 22.5,
    humidity: 65,
    battery: 87
  },
  {
    id: 2,
    name: 'Sensor Facultad Ingeniería',
    type: 'Sensor Ambiental IoT',
    status: 'Activo',
    lastUpdate: '2025-10-07 14:28',
    location: 'Facultad de Ingeniería',
    coordinates: [-35.0017581, -71.2297514],
    temperature: 24.1,
    humidity: 58,
    battery: 92
  },
  {
    id: 3,
    name: 'Sensor Biblioteca Central',
    type: 'Sensor Ambiental IoT',
    status: 'Mantenimiento',
    lastUpdate: '2025-10-07 12:15',
    location: 'Biblioteca Central',
    coordinates: [-35.0029305, -71.2292251],
    temperature: 20.8,
    humidity: 72,
    battery: 23
  },
  {
    id: 4,
    name: 'Sensor Edificio Mecánica',
    type: 'Sensor Ambiental IoT',
    status: 'Error',
    lastUpdate: '2025-10-07 11:45',
    location: 'Edificio de Mecánica',
    coordinates: [-35.0020822, -71.2291337],
    temperature: undefined,
    humidity: undefined,
    battery: 12
  },
  {
    id: 5,
    name: 'Sensor Cerro Condel',
    type: 'Sensor Ambiental IoT',
    status: 'Activo',
    lastUpdate: '2025-10-07 14:35',
    location: 'Cerro Condel',
    coordinates: [-34.9779525, -71.2260893],
    temperature: 21.3,
    humidity: 68,
    battery: 76
  }
];

// Función para calcular estadísticas dinámicas
export const calculateStats = (): StatCardData[] => {
  const activeDevices = deviceData.filter(d => d.status === 'Activo').length;
  const totalDevices = deviceData.length;
  const alertsToday = deviceData.filter(d => d.status === 'Error' || d.battery! < 20).length;
  const avgTemperature = deviceData
    .filter(d => d.temperature)
    .reduce((sum, d) => sum + (d.temperature || 0), 0) / deviceData.filter(d => d.temperature).length;

  return [
    {
      title: 'Dispositivos Activos',
      value: `${activeDevices}/${totalDevices}`,
      icon: '🔌',
    },
    {
      title: 'Temperatura Promedio',
      value: `${avgTemperature.toFixed(1)}°C`,
      icon: '🌡️',
    },
  ];
};