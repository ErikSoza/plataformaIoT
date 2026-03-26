export const HEATMAP_CONFIG: Record<string, any> = {
  temperature: {
    // Gradiente térmico más acorde a la temperatura del sensor
    gradient: {  
      0.0: '#0066cc', // Hasta 10°C (Azul muy frío)
      0.2: '#0099ff', // Hasta 15°C (Azul frío)
      0.4: '#33cc33', // Hasta 20°C (Verde fresco)
      0.5: '#66ff66', // Hasta 25°C (Verde cálido)
      0.6: '#ffff00', // Hasta 30°C (Amarillo)
      0.8: '#ff9900', // Hasta 35°C (Naranja)
      1.0: '#ff0000'  // Más de 35°C (Rojo caliente)
    },
    radius: 90, // Radio aumentado para cubrir área aprox de 2km visible
    blur: 50,   // Mejor difuminado para radios grandes
    min: 0,     // Ajustado el min a 0 para que los colores coincidan mejor con la realidad de los sensores
    max: 45,
    unit: '°C',
    legendLabel: 'Temperatura ambiente'
  },
  humidity: {
    // Gradiente de agua/gases: Colores más suaves y pasteles para no opacar el mapa
    gradient: { 
      0.0: '#f4f1ea', // Muy seco (Arena claro translucido)
      0.3: '#cce0ee', // Seco-Normal (Celeste muy pastel)
      0.6: '#8bd9e6', // Confortable (Cian suave)
      0.8: '#68abd4', // Muy húmedo (Azul medio suave)
      1.0: '#8ba6b6'  // Saturado/Niebla (Azul humo pastel)
    },
    radius: 110, // Aumentado para simular una masa de aire en lugar de un punto
    blur: 65,    // Mucho más difuminado para mezclar áreas de humedad
    min: 0,
    max: 100,
    unit: '%',
    legendLabel: 'Humedad relativa'
  },
  pressure: {
    gradient: { 0.0: '#ff0000', 0.2: '#ff6600', 0.5: '#ffff00', 0.8: '#66ff66', 1.0: '#0066ff' },
    radius: 80,
    blur: 45,
    min: 980,
    max: 1040,
    unit: 'hPa',
    legendLabel: 'Presión Atmosférica'
  },
  wind: {
    gradient: { 0.0: '#f7fbff', 0.3: '#9ecae1', 0.7: '#3182bd', 1.0: '#08306b' },
    radius: 80,
    blur: 45,
    min: 0,
    max: 20,
    unit: 'm/s',
    legendLabel: 'Velocidad del viento'
  },
  gas: {
    gradient: { 0.0: '#00ff00', 0.25: '#66ff66', 0.4: '#ffff00', 0.8: '#ff0000', 1.0: '#7e0023' },
    radius: 80,
    blur: 45,
    min: 0,
    max: 0.1,
    unit: 'ppm',
    legendLabel: 'Concentración de gases'
  },
  radiation: {
    gradient: { 0.0: '#66ccff', 0.3: '#99ff99', 0.5: '#ffff66', 0.8: '#ff9966', 1.0: '#ff6666' },
    radius: 80,
    blur: 45,
    min: 0,
    max: 1000,
    unit: 'W/m²',
    legendLabel: 'Radiación solar'
  }
};

export function normalizar(valor: number, min: number, max: number): number {
  if (valor < min) return 0;
  if (valor > max) return 1;
  return (valor - min) / (max - min);
}
