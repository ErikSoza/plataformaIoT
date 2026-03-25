export const HEATMAP_CONFIG: Record<string, any> = {
  temperature: {
    gradient: { 0.0: '#313695', 0.2: '#4575b4', 0.4: '#74add1', 0.6: '#fee090', 0.8: '#f46d43', 1.0: '#d73027' },
    radius: 50,
    blur: 35,
    min: -10,
    max: 45,
    unit: '°C',
    legendLabel: 'Temperatura ambiente'
  },
  humidity: {
    gradient: { 0.0: '#543005', 0.3: '#bf812d', 0.6: '#35978f', 1.0: '#003c30' },
    radius: 50,
    blur: 35,
    min: 0,
    max: 100,
    unit: '%',
    legendLabel: 'Humedad relativa'
  },
  pressure: {
    gradient: { 0.0: '#40004b', 0.4: '#9970ab', 0.7: '#a6dba0', 1.0: '#00441b' },
    radius: 50,
    blur: 35,
    min: 980,
    max: 1040,
    unit: 'hPa',
    legendLabel: 'Presión atmosférica'
  },
  wind: {
    gradient: { 0.0: '#f7fbff', 0.3: '#9ecae1', 0.7: '#3182bd', 1.0: '#08306b' },
    radius: 55,
    blur: 40,
    min: 0,
    max: 20,
    unit: 'm/s',
    legendLabel: 'Velocidad del viento'
  },
  gas: {
    gradient: { 0.0: '#00e400', 0.25: '#ffff00', 0.5: '#ff7e00', 0.75: '#ff0000', 1.0: '#7e0023' },
    radius: 50,
    blur: 35,
    min: 0,
    max: 500,
    unit: 'ppm',
    legendLabel: 'Concentración de gases'
  },
  radiation: {
    gradient: { 0.0: '#ffffcc', 0.3: '#41b6c4', 0.7: '#2c7fb8', 1.0: '#253494' },
    radius: 50,
    blur: 35,
    min: 0,
    max: 1200,
    unit: 'W/m²',
    legendLabel: 'Radiación solar'
  }
};

export function normalizar(valor: number, min: number, max: number): number {
  if (valor < min) return 0;
  if (valor > max) return 1;
  return (valor - min) / (max - min);
}
