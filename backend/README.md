# Backend - Plataforma IoT de Estaciones Meteorológicas

## 📋 Descripción

Este es el backend de la plataforma IoT para la gestión y monitoreo de estaciones meteorológicas del Campus UTalca. Proporciona una API REST para administrar datos de sensores ambientales distribuidos en diferentes ubicaciones del campus universitario en Curicó.

## 🏗️ Arquitectura del Proyecto

El proyecto sigue el patrón **MVC (Model-View-Controller)** con una estructura modular y escalable:

```
backend/
├── src/
│   ├── app.js              # Servidor principal y configuración
│   ├── controllers/        # Lógica de negocio
│   │   └── stationControllers.js
│   ├── db/                # Configuración de base de datos
│   │   └── connection.js
│   ├── models/            # Modelos de datos y queries
│   │   └── stationModel.js
│   └── routes/            # Definición de rutas API
│       └── stationRouters.js
├── init.sql               # Script de inicialización de BD
├── package.json           # Dependencias y scripts
└── README.md             # Documentación
```

## 🚀 Tecnologías Utilizadas

- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web minimalista
- **MySQL** - Base de datos relacional
- **mysql2** - Driver MySQL para Node.js con soporte para Promises
- **dotenv** - Gestión de variables de entorno
- **nodemon** - Auto-recarga durante desarrollo

## 🛠️ Instalación y Configuración

### 1. Instalación de Dependencias

```bash
cd backend
npm install
```

### 2. Configuración de Base de Datos

Ejecuta el archivo `init.sql` en tu servidor MySQL para crear la base de datos y las tablas:

```sql
-- El archivo ya incluye:
-- - Creación de la BD 'plataformaiot'
-- - Tabla 'estaciones' con estructura completa
-- - 8 registros de ejemplo del Campus UTalca
```

### 3. Variables de Entorno

Crea un archivo `.env` en la raíz del backend con la configuración de tu base de datos:

```env
# Configuración de Base de Datos
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=plataformaiot
DB_PORT=3306

# Configuración del Servidor
PORT=3000
```

### 4. Ejecutar el Servidor

```bash
# Desarrollo (con auto-recarga)
npm run dev

# Producción
npm start
```

El servidor estará disponible en: `http://localhost:3000`

## 📡 API Endpoints

### Base URL: `http://localhost:3000/api`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/stations` | Obtener todas las estaciones |
| GET | `/stations/:id` | Obtener estación por ID |
| POST | `/stations` | Crear nueva estación |
| PUT | `/stations/:id` | Actualizar estación existente |
| DELETE | `/stations/:id` | Eliminar estación |

### Ejemplos de Uso

#### 1. Obtener Todas las Estaciones
```bash
GET http://localhost:3000/api/stations
```

**Respuesta:**
```json
[
  {
    "id": 1,
    "nombre": "Sensor Centro Extensión Curicó",
    "tipo": "Sensor Ambiental IoT",
    "estado": "Activo",
    "ultima_actualizacion": "2025-10-07T14:30:00.000Z",
    "localizacion": "Curicó, Campus UTalca",
    "latitud": "-34.9849294",
    "longitud": "-71.2406668",
    "temperatura": "22.50",
    "humedad": "65.00",
    "bateria": 87,
    "created_at": "2025-10-19T..."
  }
  // ... más estaciones
]
```

#### 2. Obtener Estación Específica
```bash
GET http://localhost:3000/api/stations/1
```

#### 3. Crear Nueva Estación
```bash
POST http://localhost:3000/api/stations
Content-Type: application/json

{
  "nombre": "Sensor Nuevo Campus",
  "tipo": "Sensor Ambiental IoT",
  "estado": "Activo",
  "ultima_actualizacion": "2025-10-19 15:00:00",
  "localizacion": "Nueva ubicación",
  "latitud": -35.0025,
  "longitud": -71.2290,
  "temperatura": 23.5,
  "humedad": 68,
  "bateria": 95
}
```

#### 4. Actualizar Estación
```bash
PUT http://localhost:3000/api/stations/1
Content-Type: application/json

{
  "nombre": "Sensor Actualizado",
  "temperatura": 25.0,
  "humedad": 70,
  "bateria": 85
}
```

#### 5. Eliminar Estación
```bash
DELETE http://localhost:3000/api/stations/1
```

## 🗄️ Estructura de Base de Datos

### Tabla: `estaciones`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INT (PK) | Identificador único |
| `nombre` | VARCHAR(150) | Nombre descriptivo de la estación |
| `tipo` | VARCHAR(50) | Tipo de dispositivo (default: "Sensor Ambiental IoT") |
| `estado` | ENUM | Estados: Activo, Inactivo, Mantenimiento, Error |
| `ultima_actualizacion` | DATETIME | Timestamp de última lectura |
| `localizacion` | VARCHAR(150) | Descripción textual de ubicación |
| `latitud` | DECIMAL(10,7) | Coordenada de latitud |
| `longitud` | DECIMAL(10,7) | Coordenada de longitud |
| `temperatura` | DECIMAL(5,2) | Temperatura en grados Celsius |
| `humedad` | DECIMAL(5,2) | Porcentaje de humedad |
| `bateria` | INT | Nivel de batería (0-100%) |
| `created_at` | TIMESTAMP | Fecha de creación del registro |

## 📁 Detalles de Implementación

### 1. **app.js** - Servidor Principal
- Configuración de Express
- Middleware para JSON parsing
- Integración de rutas API bajo el prefijo `/api`
- Inicialización del servidor en puerto configurable

### 2. **connection.js** - Conexión a Base de Datos
- Pool de conexiones MySQL para mejor rendimiento
- Configuración mediante variables de entorno
- Uso de mysql2/promise para operaciones asíncronas

### 3. **stationModel.js** - Capa de Datos
Funciones implementadas:
- `getAllStations()` - Recupera todas las estaciones
- `getStationById(id)` - Busca estación por ID
- `addStation(station)` - Inserta nueva estación
- `updateStation(id, station)` - Actualiza estación existente
- `deleteStation(id)` - Elimina estación por ID

### 4. **stationControllers.js** - Lógica de Negocio
Controladores implementados:
- `getStations()` - Manejo de GET /stations
- `getStation()` - Manejo de GET /stations/:id
- `createStation()` - Manejo de POST /stations
- `updateStationById()` - Manejo de PUT /stations/:id
- `removeStation()` - Manejo de DELETE /stations/:id

Cada controlador incluye:
- Manejo de errores con try/catch
- Respuestas HTTP apropiadas
- Validación básica de existencia de recursos

### 5. **stationRouters.js** - Definición de Rutas
- Mapeo de endpoints HTTP a controladores
- Uso de parámetros de ruta para IDs
- Estructura RESTful completa

## ⚡ Características Técnicas

### Manejo de Errores
- Try/catch en todos los controladores
- Respuestas HTTP standardizadas (200, 201, 404, 500)
- Mensajes de error descriptivos en español

### Seguridad
- Uso de prepared statements para prevenir SQL injection
- Variables de entorno para configuración sensible
- Validación de existencia de recursos antes de operaciones

### Escalabilidad
- Pool de conexiones para manejo eficiente de BD
- Estructura modular fácil de extender
- Separación clara de responsabilidades (MVC)

## 🧪 Datos de Prueba

El sistema incluye 8 estaciones de ejemplo distribuidas en el Campus UTalca:

1. **Sensor Centro Extensión Curicó** - Ubicación principal
2. **Sensor Facultad Ingeniería** - Área académica
3. **Sensor Biblioteca Central** - (En mantenimiento)
4. **Sensor Edificio Mecánica** - Laboratorios
5. **Sensor Cerro Condel** - Área elevada
6. **Sensor Laboratorio Química** - Área especializada
7. **Sensor Auditorio Principal** - Área de eventos
8. **Sensor Cafetería Central** - Área social

## 🔧 Scripts Disponibles

```json
{
  "dev": "nodemon src/app.js",    // Desarrollo con auto-recarga
  "start": "node src/app.js"      // Producción
}
```

## 🚨 Solución de Problemas

### Error de Conexión a Base de Datos
1. Verificar que MySQL esté ejecutándose
2. Confirmar credenciales en archivo `.env`
3. Asegurar que la base de datos `plataformaiot` exista

### Puerto en Uso
- Modificar la variable `PORT` en `.env`
- O usar: `PORT=3001 npm run dev`

### Problemas con CORS (Frontend)
- El backend actualmente no incluye configuración de CORS
- Para producción, agregar middleware de CORS según necesidades del frontend

## 📈 Próximas Mejoras

- [ ] Implementación de CORS para frontend
- [ ] Sistema de autenticación y autorización
- [ ] Validación de datos de entrada con bibliotecas como Joi
- [ ] Logging estructurado
- [ ] Tests unitarios y de integración
- [ ] Documentación API con Swagger
- [ ] Paginación para grandes conjuntos de datos
- [ ] Filtros y búsquedas avanzadas

## 🤝 Contribución

Para contribuir al proyecto:
1. Mantener la estructura MVC
2. Seguir las convenciones de naming establecidas
3. Incluir manejo de errores apropiado
4. Documentar nuevas funcionalidades

---

**Desarrollado para el Campus UTalca - Curicó**  
*Sistema de Monitoreo de Estaciones Meteorológicas IoT*