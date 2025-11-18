# 🌡️ Plataforma IoT de Monitoreo Meteorológico - UTalca

<div align="center">

![Plataforma IoT](https://img.shields.io/badge/Plataforma-IoT-blue)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-3178C6?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-Latest-339933?logo=node.js)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?logo=mysql)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?logo=leaflet)

**Sistema de monitoreo en tiempo real de estaciones meteorológicas IoT para el Campus Universidad de Talca**

*Visualización interactiva con mapas de calor, análisis de datos históricos y gestión centralizada de dispositivos*

</div>

---

## 📋 Descripción del Proyecto

La **Plataforma IoT de Monitoreo Meteorológico** es una aplicación web completa desarrollada para el Campus de la Universidad de Talca en Curicó. El sistema permite el monitoreo en tiempo real de múltiples estaciones meteorológicas distribuidas geográficamente, proporcionando visualización interactiva a través de mapas de calor, análisis estadístico y reportes históricos.

### 🎯 Características Principales

- **🗺️ Mapas Interactivos**: Visualización geoespacial con Leaflet y capas de calor
- **📊 Dashboard en Tiempo Real**: Monitoreo live de 8 estaciones meteorológicas
- **📈 Análisis Histórico**: Gráficos temporales y reportes exportables
- **🔧 Gestión de Dispositivos**: Control centralizado del estado de estaciones
- **⚡ Datos en Tiempo Real**: Actualización automática cada 30 segundos
- **📱 Diseño Responsivo**: Compatible con dispositivos móviles y desktop

### 🌟 Tecnologías Utilizadas

#### Frontend
- **React 19.2.0** con **TypeScript 4.9.5**
- **React Router DOM 7.9.5** para navegación SPA
- **Leaflet 1.9.4** + **React-Leaflet 5.0.0** para mapas interactivos
- **Chart.js 4.5.1** + **React-ChartJS-2** para visualizaciones
- **Axios 1.12.2** para comunicación HTTP
- **React Scripts 5.0.1** como build tool

#### Backend
- **Node.js** con **Express.js 5.1.0**
- **MySQL 8.0+** como base de datos principal
- **mysql2 3.15.2** driver con soporte para Promises
- **CORS 2.8.5** para comunicación cross-origin
- **dotenv 17.2.3** para variables de entorno
- **Nodemon 3.1.10** para desarrollo

---

## 🏗️ Arquitectura del Sistema

### Estructura del Proyecto

```
plataformaIoT/
├── 📁 frontend/                    # Aplicación React + TypeScript
│   ├── 📁 public/                  # Archivos estáticos
│   └── 📁 src/
│       ├── 📁 components/layout/   # Componentes de UI
│       │   ├── UtalcaHeader.tsx    # Header institucional
│       │   ├── MainLayout.tsx      # Layout principal
│       │   ├── MapaCalor.tsx       # Mapa de calor con Leaflet
│       │   ├── StatsGrid.tsx       # Grid de estadísticas
│       │   └── ListaDispositivos.tsx # Lista de estaciones
│       ├── 📁 pages/              # Páginas principales
│       │   ├── Home.tsx           # Dashboard principal
│       │   ├── MonitoreoPagina.tsx # Vista de monitoreo
│       │   ├── DispositivosPagina.tsx # Gestión dispositivos
│       │   └── ReportePagina.tsx   # Análisis y reportes
│       ├── 📁 services/           # Servicios API
│       ├── 📁 types/              # Definiciones TypeScript
│       └── 📁 data/               # Datos de ejemplo
├── 📁 backend/                    # API REST con Node.js
│   ├── 📁 src/
│   │   ├── 📁 controllers/        # Lógica de negocio
│   │   ├── 📁 models/            # Modelos de datos
│   │   ├── 📁 routes/            # Definición de rutas API
│   │   └── 📁 db/                # Configuración de BD
│   ├── init.sql                  # Script de inicialización
│   └── package.json              # Dependencias del backend
└── README.md                     # Este archivo
```

### Modelo de Datos

#### 🏢 Estaciones Meteorológicas
```typescript
interface DeviceData {
  id: number;                    // Identificador único
  nombre: string;                // Nombre descriptivo
  tipo: string;                  // "Sensor Ambiental IoT"
  estado: 'Activo' | 'Inactivo' | 'Mantenimiento' | 'Error';
  ultima_actualizacion: string;  // Timestamp última lectura
  localizacion: string;          // Descripción ubicación
  latitud: number;               // Coordenada GPS
  longitud: number;              // Coordenada GPS
  temperatura?: number;          // °C
  humedad?: number;              // % humedad relativa
  bateria?: number;              // % nivel batería
}
```

#### 📊 Lecturas de Sensores
```typescript
interface Lectura {
  id: number;
  id_estacion: number;
  timestamp: string;
  json: {
    temperatura: number;
    humedad: number;
    presion?: number;
    gas?: number;
    radiacion?: number;
    viento?: number;
    bateria: number;
  };
}
```

---

## 🚀 Instalación y Configuración

### Prerequisitos

- **Node.js** 16+ [Descargar aquí](https://nodejs.org/)
- **MySQL Server** 8.0+ [Descargar aquí](https://dev.mysql.com/downloads/)
- **Git** [Descargar aquí](https://git-scm.com/downloads)

### 1. Clonar el Repositorio

```bash
git clone https://github.com/ErikSoza/plataformaIoT.git
cd plataformaIoT
```

### 2. Configuración del Backend

#### Instalar Dependencias
```bash
cd backend
npm install
```

#### Configurar Base de Datos

1. **Crear la base de datos**:
   ```bash
   mysql -u root -p < init.sql
   ```

2. **Configurar variables de entorno**:
   Crear archivo `.env` en `/backend/`:
   ```env
   # Configuración de Base de Datos
   DB_HOST=localhost
   DB_USER=tu_usuario_mysql
   DB_PASSWORD=tu_contraseña_mysql
   DB_NAME=plataformaiot
   DB_PORT=3306

   # Configuración del Servidor
   PORT=3000
   ```

#### Ejecutar el Servidor
```bash
# Modo desarrollo (con auto-recarga)
npm run dev

# Modo producción
npm start
```

El backend estará disponible en: `http://localhost:3000`

### 3. Configuración del Frontend

#### Instalar Dependencias
```bash
cd frontend
npm install
```

#### Configurar Variables de Entorno (Opcional)
Crear archivo `.env.local` en `/frontend/`:
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_MAP_CENTER_LAT=-35.0025
REACT_APP_MAP_CENTER_LNG=-71.2295
```

#### Ejecutar la Aplicación
```bash
npm start
```

La aplicación estará disponible en: `http://localhost:3001`

---

## 📡 API Endpoints

### Base URL: `http://localhost:3000/api`

#### 🏢 Estaciones Meteorológicas
| Método | Endpoint | Descripción | Parámetros |
|--------|----------|-------------|------------|
| `GET` | `/estaciones` | Lista todas las estaciones | - |
| `GET` | `/estaciones/:id` | Obtiene estación específica | `id`: ID de estación |
| `POST` | `/estaciones` | Crea nueva estación | Body: Datos de estación |
| `PUT` | `/estaciones/:id` | Actualiza estación | `id`: ID, Body: Datos |
| `DELETE` | `/estaciones/:id` | Elimina estación | `id`: ID de estación |

#### 📊 Lecturas de Sensores
| Método | Endpoint | Descripción | Parámetros |
|--------|----------|-------------|------------|
| `GET` | `/lecturas` | Lista todas las lecturas | `?limit=100&offset=0` |
| `GET` | `/lecturas/:id` | Obtiene lectura específica | `id`: ID de lectura |
| `GET` | `/lecturas/reports` | Lecturas para reportes | - |
| `GET` | `/lecturas/latest` | Últimas lecturas de todas las estaciones | - |
| `GET` | `/estaciones/:stationId/lecturas` | Lecturas de una estación específica | `stationId`: ID de estación |
| `GET` | `/estaciones/:stationId/lecturas/latest` | Última lectura de una estación | `stationId`: ID de estación |
| `POST` | `/lecturas` | Crea nueva lectura | Body: Datos de lectura |


### Ejemplos de Uso

#### Obtener todas las estaciones
```bash
curl "http://localhost:3000/api/estaciones"
```

#### Obtener última lectura de una estación
```bash
curl "http://localhost:3000/api/estaciones/1/lecturas/latest"
```


#### Crear nueva lectura
```bash
curl -X POST "http://localhost:3000/api/lecturas" \
  -H "Content-Type: application/json" \
  -d '{
    "id_estacion": 1,
    "json": {
      "temperatura": 25.5,
      "humedad": 60,
      "bateria": 85
    }
  }'
```

---

## 🖥️ Guía de Uso

### Dashboard Principal
1. **Vista General**: Estadísticas en tiempo real de todas las estaciones
2. **Navegación**: 4 pestañas principales (Monitoreo, Dispositivos, Reportes, Configuración)

### 🗺️ Módulo de Monitoreo
- **Mapa Interactivo**: Visualización de estaciones con marcadores
- **Mapa de Calor**: Representación térmica de temperatura/humedad
- **Estadísticas Live**: Actualización automática cada 30 segundos
- **Filtros**: Por estado, rango de fechas, tipo de sensor

### 🔧 Gestión de Dispositivos
- **Lista Completa**: Todas las estaciones con estado actual
- **Detalles**: Información técnica, ubicación, histórico
- **Gestión**: Activar/desactivar, cambiar estado, editar información
- **Búsqueda**: Filtros por nombre, ubicación, estado

### 📊 Módulo de Reportes
- **Análisis Temporal**: Gráficos de evolución por variable
- **Exportación**: CSV, PDF de datos históricos
- **Filtros Avanzados**: Por estación, rango de fechas, variables
- **Estadísticas**: Promedios, máximos, mínimos por período

### ⚙️ Configuración
- **Parámetros del Sistema**: Intervalos de actualización
- **Gestión de Usuarios**: Permisos y roles (futuro)
- **Alertas**: Configuración de umbrales y notificaciones

---

## 🧪 Datos de Ejemplo

El sistema incluye 8 estaciones pre-configuradas en el Campus UTalca:

| ID | Nombre | Ubicación | Coordenadas | Estado |
|----|--------|-----------|-------------|--------|
| 1 | Centro Extensión Curicó | Campus Principal | -34.985, -71.241 | Activo |
| 2 | Facultad Ingeniería | Área Académica | -35.002, -71.230 | Activo |
| 3 | Biblioteca Central | Zona Estudiantil | -35.003, -71.229 | Mantenimiento |
| 4 | Edificio Mecánica | Laboratorios | -35.002, -71.229 | Activo |
| 5 | Cerro Condel | Área Elevada | -34.978, -71.226 | Activo |
| 6 | Lab. Química | Área Especializada | -35.002, -71.229 | Activo |
| 7 | Auditorio Principal | Zona Events | -35.003, -71.230 | Activo |
| 8 | Cafetería Central | Área Social | -35.002, -71.229 | Activo |

---

## 🔧 Desarrollo

### Scripts Disponibles

#### Frontend
```bash
npm start          # Servidor de desarrollo (puerto 3001)
npm test           # Ejecutar tests unitarios
npm run build      # Build para producción
npm run eject      # Exponer configuración (irreversible)
```

#### Backend
```bash
npm run dev        # Servidor con auto-recarga (nodemon)
npm start          # Servidor de producción
npm test           # Tests (por implementar)
```

### Estructura de Componentes React

```typescript
// Componente principal con estado global
const Home: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('monitoreo');
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [stats, setStats] = useState<StatCardData[]>([]);
  
  // Actualización automática cada 30 segundos
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <MainLayout>
      <UtalcaHeader />
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <ContentSection title={getTabTitle(activeTab)}>
        {renderTabContent()}
      </ContentSection>
    </MainLayout>
  );
};
```

### Configuración de Mapas Leaflet

```typescript
const MapaCalor: React.FC = ({ deviceData }) => {
  const position: LatLngTuple = [-35.0025, -71.2295]; // Centro UTalca
  
  const heatmapData = deviceData
    .filter(device => device.temperatura)
    .map(device => [
      device.coordinates[0],
      device.coordinates[1],
      device.temperatura! / 50 // Intensidad normalizada
    ]);

  return (
    <MapContainer center={position} zoom={16} style={{ height: '500px' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <HeatmapLayer points={heatmapData} />
      {/* Marcadores de estaciones */}
    </MapContainer>
  );
};
```

---

## 🐛 Solución de Problemas

### Backend

#### Error de Conexión a MySQL
```bash
Error: ER_ACCESS_DENIED_ERROR: Access denied for user 'root'@'localhost'
```
**Solución**:
1. Verificar credenciales en `.env`
2. Verificar que MySQL esté ejecutándose
3. Confirmar permisos del usuario

#### Puerto en Uso
```bash
Error: listen EADDRINUSE: address already in use :::3000
```
**Solución**:
```bash
# Cambiar puerto en .env
PORT=3001

# O matar proceso en puerto 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Frontend

#### Problemas con Dependencias
```bash
npm ERR! peer dep missing: react@">=16.8.0"
```
**Solución**:
```bash
rm -rf node_modules package-lock.json
npm install
```

#### Errores de TypeScript
```bash
Module '"@types/leaflet"' has no exported member 'HeatLatLngTuple'
```
**Solución**:
```bash
npm install --save-dev @types/leaflet.heat@latest
```

### Base de Datos

#### Tablas No Encontradas
```sql
Table 'plataformaiot.estaciones' doesn't exist
```
**Solución**:
```bash
mysql -u root -p plataformaiot < backend/init.sql
```

```
## 👥 Equipo de Desarrollo

### Desarrollador Principal
- **Erik Soza** - *Full Stack Developer* - [@ErikSoza](https://github.com/ErikSoza)

### Universidad de Talca
- **Campus Curicó** - *Institución Patrocinadora*
- **Facultad de Ingeniería** - *Departamento Técnico*

---


## 📊 Estadísticas del Proyecto

![GitHub repo size](https://img.shields.io/github/repo-size/ErikSoza/plataformaIoT)
![GitHub last commit](https://img.shields.io/github/last-commit/ErikSoza/plataformaIoT)
![GitHub issues](https://img.shields.io/github/issues/ErikSoza/plataformaIoT)
![GitHub pull requests](https://img.shields.io/github/issues-pr/ErikSoza/plataformaIoT)

---

<div align="center">

*Sistema de Monitoreo IoT - Campus Curicó*

</div>