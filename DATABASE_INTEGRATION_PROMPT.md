# 🌡️ PROMPT PARA CONEXIÓN A BASE DE DATOS - PLATAFORMA IoT METEOROLÓGICA

## CONTEXTO DEL PROYECTO

### Descripción General
Plataforma web IoT para monitoreo meteorológico en tiempo real del Campus Universidad de Talca, desarrollada en React + TypeScript con mapas interactivos de calor usando Leaflet. La aplicación visualiza datos de estaciones meteorológicas distribuidas geográficamente y requiere integración con base de datos PostgreSQL a través de PostgREST.

### Stack Tecnológico Actual
- **Frontend**: React 19.2.0 + TypeScript 4.9.5
- **Mapas**: Leaflet 1.9.4 + React-Leaflet 5.0.0 + Leaflet.heat
- **Base de Datos**: PostgreSQL + PostgREST (a implementar)
- **Build Tool**: React Scripts 5.0.1

---

## ARQUITECTURA DE COMPONENTES

### Estructura de Carpetas
```
src/
├── components/layout/
│   ├── UtalcaHeader.tsx           # Header institucional
│   ├── TabNavigation.tsx          # Navegación principal (4 tabs)
│   ├── MainLayout.tsx             # Layout principal wrapper
│   ├── ContentSection.tsx         # Contenedor de secciones
│   ├── StatsGrid.tsx              # Grid de estadísticas en tiempo real
│   ├── ListaDispositivos.tsx      # Lista lateral de estaciones
│   ├── InteractiveMap.tsx         # Mapa base con marcadores
│   ├── MapaInteractivo.tsx        # Mapa avanzado con controles heatmap
│   ├── MapaCalor.tsx              # Componente de capa de calor
│   └── index.tsx                  # Exportaciones centralizadas
├── pages/
│   ├── Home.tsx                   # Componente principal (estado global)
│   ├── MonitoringPage.tsx         # Vista de monitoreo con mapa de calor
│   ├── DevicesPage.tsx            # Vista de gestión de dispositivos
│   ├── ReportsPage.tsx            # Vista de reportes históricos
│   └── SettingsPage.tsx           # Vista de configuración
├── data/
│   └── DatosEjemplos.tsx          # Datos mock actuales
└── types/                         # Tipos TypeScript (pendiente)
```

### Flujo de Navegación
1. **MONITOREO**: Mapa de calor + estadísticas en tiempo real
2. **DISPOSITIVOS**: Lista detallada + gestión de estaciones
3. **REPORTES**: Análisis histórico y exportación
4. **CONFIGURACIÓN**: Ajustes del sistema

---

## MODELO DE DATOS ACTUAL

### Interface DeviceData (Estación Meteorológica)
```typescript
interface DeviceData {
  id: number;                                    // ID único de estación
  name: string;                                  // Nombre descriptivo
  type: string;                                  // Siempre "Sensor Ambiental IoT"
  status: 'Activo' | 'Inactivo' | 'Mantenimiento' | 'Error';
  lastUpdate: string;                            // Timestamp última lectura
  location: string;                              // Descripción ubicación
  coordinates: [number, number];                 // [latitud, longitud]
  temperature?: number;                          // °C
  humidity?: number;                             // % humedad relativa
  battery?: number;                              // % nivel batería
}
```

### Interface StatCardData (Estadísticas)
```typescript
interface StatCardData {
  title: string;                                 // Nombre de la métrica
  value: string;                                 // Valor formateado
  icon: string;                                  // Emoji para UI
}
```

### Datos de Ejemplo Actuales (8 estaciones)
```typescript
// Estaciones distribuidas en Campus UTalca + Curicó
const deviceData: DeviceData[] = [
  {
    id: 1,
    name: 'Sensor Centro Extensión Curicó',
    coordinates: [-34.9849294, -71.2406668],
    temperature: 22.5, humidity: 65, battery: 87,
    status: 'Activo', lastUpdate: '2025-10-07 14:30'
  },
  {
    id: 2,
    name: 'Sensor Facultad Ingeniería',
    coordinates: [-35.0017581, -71.2297514],
    temperature: 28.1, humidity: 45, battery: 92,
    status: 'Activo', lastUpdate: '2025-10-07 14:28'
  },
  {
    id: 3,
    name: 'Sensor Biblioteca Central',
    coordinates: [-35.0029305, -71.2292251],
    temperature: 18.8, humidity: 82, battery: 23,
    status: 'Mantenimiento', lastUpdate: '2025-10-07 12:15'
  },
  {
    id: 4,
    name: 'Sensor Edificio Mecánica',
    coordinates: [-35.0020822, -71.2291337],
    temperature: 25.2, humidity: 52, battery: 65,
    status: 'Activo', lastUpdate: '2025-10-07 11:45'
  },
  {
    id: 5,
    name: 'Sensor Cerro Condel',
    coordinates: [-34.9779525, -71.2260893],
    temperature: 16.3, humidity: 78, battery: 76,
    status: 'Activo', lastUpdate: '2025-10-07 14:35'
  },
  {
    id: 6,
    name: 'Sensor Laboratorio Química',
    coordinates: [-35.0015225, -71.2285634],
    temperature: 31.5, humidity: 38, battery: 88,
    status: 'Activo', lastUpdate: '2025-10-07 14:32'
  },
  {
    id: 7,
    name: 'Sensor Auditorio Principal',
    coordinates: [-35.0025118, -71.2298467],
    temperature: 19.7, humidity: 60, battery: 45,
    status: 'Activo', lastUpdate: '2025-10-07 14:29'
  },
  {
    id: 8,
    name: 'Sensor Cafetería Central',
    coordinates: [-35.0022634, -71.2294852],
    temperature: 26.8, humidity: 55, battery: 71,
    status: 'Activo', lastUpdate: '2025-10-07 14:33'
  }
];
```

---

## REQUERIMIENTOS PARA BASE DE DATOS

### Esquema PostgreSQL Propuesto

#### Tabla: weather_stations
```sql
CREATE TABLE weather_stations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  type VARCHAR(100) DEFAULT 'Sensor Ambiental IoT',
  status VARCHAR(20) CHECK (status IN ('Activo', 'Inactivo', 'Mantenimiento', 'Error')),
  installation_date TIMESTAMP DEFAULT NOW(),
  last_maintenance TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabla: sensor_readings
```sql
CREATE TABLE sensor_readings (
  id SERIAL PRIMARY KEY,
  station_id INTEGER REFERENCES weather_stations(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  temperature DECIMAL(5, 2),              -- °C con 2 decimales
  humidity DECIMAL(5, 2),                 -- % con 2 decimales
  battery_level INTEGER,                  -- % entero 0-100
  signal_strength INTEGER,                -- dBm señal
  data_quality VARCHAR(20) DEFAULT 'good', -- good, fair, poor
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Tabla: station_alerts
```sql
CREATE TABLE station_alerts (
  id SERIAL PRIMARY KEY,
  station_id INTEGER REFERENCES weather_stations(id),
  alert_type VARCHAR(50),                 -- 'low_battery', 'offline', 'sensor_error'
  severity VARCHAR(20),                   -- 'low', 'medium', 'high', 'critical'
  message TEXT,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

### Views para PostgREST
```sql
-- Vista para datos en tiempo real
CREATE VIEW real_time_stations AS
SELECT 
  ws.id,
  ws.name,
  ws.location,
  ws.latitude,
  ws.longitude,
  ws.status,
  sr.temperature,
  sr.humidity,
  sr.battery_level,
  sr.timestamp as last_update
FROM weather_stations ws
LEFT JOIN LATERAL (
  SELECT temperature, humidity, battery_level, timestamp
  FROM sensor_readings 
  WHERE station_id = ws.id 
  ORDER BY timestamp DESC 
  LIMIT 1
) sr ON true
WHERE ws.is_active = true;

-- Vista para estadísticas
CREATE VIEW station_statistics AS
SELECT 
  COUNT(*) as total_stations,
  COUNT(*) FILTER (WHERE status = 'Activo') as active_stations,
  ROUND(AVG(sr.temperature), 1) as avg_temperature,
  ROUND(AVG(sr.humidity), 1) as avg_humidity
FROM weather_stations ws
LEFT JOIN LATERAL (
  SELECT temperature, humidity
  FROM sensor_readings 
  WHERE station_id = ws.id 
  ORDER BY timestamp DESC 
  LIMIT 1
) sr ON true
WHERE ws.is_active = true;
```

---

## CONFIGURACIÓN POSTGREST

### Archivo postgrest.conf
```ini
db-uri = "postgres://username:password@localhost:5432/weather_iot"
db-schema = "public"
db-anon-role = "web_anon"
server-host = "localhost"
server-port = 3000
```

### Roles de Base de Datos
```sql
-- Rol para consultas públicas
CREATE ROLE web_anon NOLOGIN;
GRANT USAGE ON SCHEMA public TO web_anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO web_anon;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO web_anon;

-- Rol para escritura (inserción de datos IoT)
CREATE ROLE iot_writer NOLOGIN;
GRANT USAGE ON SCHEMA public TO iot_writer;
GRANT INSERT, UPDATE ON sensor_readings TO iot_writer;
GRANT UPDATE ON weather_stations TO iot_writer;
```

---

## INTEGRACIÓN FRONTEND REQUERIDA

### Servicios API a Crear
```typescript
// services/api.ts
class WeatherAPI {
  private baseUrl = 'http://localhost:3000';
  
  // GET /real_time_stations
  async getStations(): Promise<DeviceData[]> {
    const response = await fetch(`${this.baseUrl}/real_time_stations`);
    const data = await response.json();
    return this.transformStationData(data);
  }
  
  // GET /station_statistics
  async getStatistics(): Promise<StatCardData[]> {
    const response = await fetch(`${this.baseUrl}/station_statistics`);
    const data = await response.json();
    return this.transformStatistics(data);
  }
  
  // GET /sensor_readings?station_id=eq.{id}&order=timestamp.desc&limit=100
  async getStationHistory(stationId: number): Promise<SensorReading[]> {
    const response = await fetch(
      `${this.baseUrl}/sensor_readings?station_id=eq.${stationId}&order=timestamp.desc&limit=100`
    );
    return await response.json();
  }
  
  // POST /sensor_readings (para simulación)
  async insertReading(reading: SensorReading): Promise<void> {
    await fetch(`${this.baseUrl}/sensor_readings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reading)
    });
  }

  private transformStationData(apiResponse: any[]): DeviceData[] {
    return apiResponse.map(station => ({
      id: station.id,
      name: station.name,
      type: 'Sensor Ambiental IoT',
      status: station.status,
      lastUpdate: station.last_update,
      location: station.location,
      coordinates: [station.latitude, station.longitude],
      temperature: station.temperature,
      humidity: station.humidity,
      battery: station.battery_level
    }));
  }
}
```

### Hooks React a Implementar
```typescript
// hooks/useWeatherData.ts
import { useState, useEffect } from 'react';
import { WeatherAPI } from '../services/api';

export const useWeatherData = () => {
  const [stations, setStations] = useState<DeviceData[]>([]);
  const [statistics, setStatistics] = useState<StatCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = new WeatherAPI();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stationsData, statsData] = await Promise.all([
        api.getStations(),
        api.getStatistics()
      ]);
      setStations(stationsData);
      setStatistics(statsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  // Polling cada 30 segundos para datos en tiempo real
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return { stations, statistics, loading, error, refetch: fetchData };
};
```

### Migración de Datos
```sql
-- Script para migrar datos existentes
INSERT INTO weather_stations (id, name, location, latitude, longitude, status) VALUES
(1, 'Sensor Centro Extensión Curicó', 'Centro de Extensión Curicó', -34.9849294, -71.2406668, 'Activo'),
(2, 'Sensor Facultad Ingeniería', 'Facultad de Ingeniería', -35.0017581, -71.2297514, 'Activo'),
(3, 'Sensor Biblioteca Central', 'Biblioteca Central', -35.0029305, -71.2292251, 'Mantenimiento'),
(4, 'Sensor Edificio Mecánica', 'Edificio de Mecánica', -35.0020822, -71.2291337, 'Activo'),
(5, 'Sensor Cerro Condel', 'Cerro Condel', -34.9779525, -71.2260893, 'Activo'),
(6, 'Sensor Laboratorio Química', 'Laboratorio de Química', -35.0015225, -71.2285634, 'Activo'),
(7, 'Sensor Auditorio Principal', 'Auditorio Principal', -35.0025118, -71.2298467, 'Activo'),
(8, 'Sensor Cafetería Central', 'Cafetería Central', -35.0022634, -71.2294852, 'Activo');

-- Insertar lecturas de ejemplo
INSERT INTO sensor_readings (station_id, temperature, humidity, battery_level, timestamp) VALUES
(1, 22.5, 65, 87, '2025-10-07 14:30:00'),
(2, 28.1, 45, 92, '2025-10-07 14:28:00'),
(3, 18.8, 82, 23, '2025-10-07 12:15:00'),
(4, 25.2, 52, 65, '2025-10-07 11:45:00'),
(5, 16.3, 78, 76, '2025-10-07 14:35:00'),
(6, 31.5, 38, 88, '2025-10-07 14:32:00'),
(7, 19.7, 60, 45, '2025-10-07 14:29:00'),
(8, 26.8, 55, 71, '2025-10-07 14:33:00');
```

---

## OBJETIVOS DE IMPLEMENTACIÓN

### Fase 1: Conexión Básica
- [x] Estructura de componentes establecida
- [ ] Configuración PostgreSQL + PostgREST
- [ ] Migración de datos mock a BD
- [ ] API service layer

### Fase 2: Tiempo Real
- [ ] Polling automático de datos
- [ ] WebSocket para actualizaciones live
- [ ] Manejo de errores de conexión
- [ ] Cache local para offline

### Fase 3: Funcionalidades Avanzadas
- [ ] Histórico de datos y gráficos
- [ ] Sistema de alertas
- [ ] Exportación de reportes
- [ ] Dashboard administrativo

---

## CONSIDERACIONES TÉCNICAS

### Manejo de Estados
- Mantener compatibilidad con interfaces actuales
- Agregar loading/error states
- Implementar retry logic para requests fallidos
- Cache inteligente para reducir consultas

### Seguridad
- Validación de datos en frontend
- Rate limiting en PostgREST
- Sanitización de inputs
- CORS configurado correctamente

### Performance
- Paginación para datos históricos
- Compresión gzip en PostgREST
- Índices optimizados en PostgreSQL
- Lazy loading de componentes pesados

---

## COMANDOS ÚTILES

### Iniciar PostgREST
```bash
postgrest postgrest.conf
```

### Conectar a PostgreSQL
```bash
psql -h localhost -d weather_iot -U username
```

### Verificar APIs
```bash
# Listar estaciones
curl "http://localhost:3000/real_time_stations"

# Obtener estadísticas
curl "http://localhost:3000/station_statistics"

# Histórico de una estación
curl "http://localhost:3000/sensor_readings?station_id=eq.1&order=timestamp.desc&limit=10"
```

---

**Este archivo contiene toda la información necesaria para implementar la conexión a base de datos en la plataforma IoT meteorológica.**