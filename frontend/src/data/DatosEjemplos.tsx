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
    battery: 87,
    pressure: 1013.2,
    gas: 0.045,
    radiation: 650
  },
  {
    id: 2,
    name: 'Sensor Facultad Ingeniería',
    type: 'Sensor Ambiental IoT',
    status: 'Activo',
    lastUpdate: '2025-10-07 14:28',
    location: 'Facultad de Ingeniería',
    coordinates: [-35.0017581, -71.2297514],
    temperature: 28.1,
    humidity: 45,
    battery: 92,
    pressure: 1015.8,
    gas: 0.032,
    radiation: 820
  },
  {
    id: 3,
    name: 'Sensor Biblioteca Central',
    type: 'Sensor Ambiental IoT',
    status: 'Mantenimiento',
    lastUpdate: '2025-10-07 12:15',
    location: 'Biblioteca Central',
    coordinates: [-35.0029305, -71.2292251],
    temperature: 18.8,
    humidity: 82,
    battery: 23,
    pressure: 1009.5,
    gas: 0.058,
    radiation: 420
  },
  {
    id: 4,
    name: 'Sensor Edificio Mecánica',
    type: 'Sensor Ambiental IoT',
    status: 'Activo',
    lastUpdate: '2025-10-07 11:45',
    location: 'Edificio de Mecánica',
    coordinates: [-35.0020822, -71.2291337],
    temperature: 25.2,
    humidity: 52,
    battery: 65,
    pressure: 1011.7,
    gas: 0.039,
    radiation: 750
  },
  {
    id: 5,
    name: 'Sensor Cerro Condel',
    type: 'Sensor Ambiental IoT',
    status: 'Activo',
    lastUpdate: '2025-10-07 14:35',
    location: 'Cerro Condel',
    coordinates: [-34.9779525, -71.2260893],
    temperature: 16.3,
    humidity: 78,
    battery: 76,
    pressure: 1008.3,
    gas: 0.025,
    radiation: 520
  },
  {
    id: 6,
    name: 'Sensor Laboratorio Química',
    type: 'Sensor Ambiental IoT',
    status: 'Activo',
    lastUpdate: '2025-10-07 14:32',
    location: 'Laboratorio de Química',
    coordinates: [-35.0015225, -71.2285634],
    temperature: 31.5,
    humidity: 38,
    battery: 88,
    pressure: 1016.9,
    gas: 0.067,
    radiation: 920
  },
  {
    id: 7,
    name: 'Sensor Auditorio Principal',
    type: 'Sensor Ambiental IoT',
    status: 'Activo',
    lastUpdate: '2025-10-07 14:29',
    location: 'Auditorio Principal',
    coordinates: [-35.0025118, -71.2298467],
    temperature: 39.7,
    humidity: 60,
    battery: 45,
    pressure: 1010.4,
    gas: 0.041,
    radiation: 580
  },
  {
    id: 8,
    name: 'Sensor Cafetería Central',
    type: 'Sensor Ambiental IoT',
    status: 'Activo',
    lastUpdate: '2025-10-07 14:33',
    location: 'Cafetería Central',
    coordinates: [-35.0022634, -71.2294852],
    temperature: 26.8,
    humidity: 55,
    battery: 71,
    pressure: 1012.6,
    gas: 0.048,
    radiation: 690
  }
];

// Función para calcular estadísticas dinámicas
export const calculateStats = (): StatCardData[] => {
  const activeDevices = deviceData.filter(d => d.status === 'Activo').length;
  const totalDevices = deviceData.length;
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