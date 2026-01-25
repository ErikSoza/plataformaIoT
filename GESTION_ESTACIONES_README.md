# 🏢 Gestión de Estaciones - Documentación

## 📋 Descripción
Sistema completo de gestión de estaciones IoT que permite crear, administrar y asignar dispositivos Edge a estaciones de monitoreo ambiental.

## 🚀 Funcionalidades Implementadas

### 1. ➕ Crear Estación
- **Frontend**: Formulario modal con validaciones
- **Backend**: Endpoint `POST /api/estaciones`
- **Campos**: Nombre, Ubicación, Latitud, Longitud, Descripción
- **Validaciones**: Campos requeridos y formato de coordenadas

### 2. 🔗 Asignar Dispositivo (Edge) a Estación
- **Frontend**: Modal con dropdown de dispositivos disponibles
- **Backend**: Endpoint `POST /api/dispositivos/asignar`
- **Lógica**: Solo muestra dispositivos con `estado = 'disponible'` y `id_estacion IS NULL`
- **Restricción**: Una estación puede tener solo un dispositivo (UNIQUE constraint)

### 3. 🔓 Liberar Dispositivo de Estación
- **Frontend**: Botón de liberación con confirmación
- **Backend**: Endpoint `PUT /api/dispositivos/{deviceId}/liberar`
- **Lógica**: Actualiza `id_estacion = NULL` y `estado = 'disponible'`

## 🗃️ Estructura de Base de Datos

### Tabla `estaciones`
```sql
CREATE TABLE estaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  ubicacion VARCHAR(255),
  latitud DECIMAL(10,6),
  longitud DECIMAL(10,6),
  descripcion TEXT,
  estado VARCHAR(50) DEFAULT 'Activa',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla `dispositivos` 
```sql
CREATE TABLE dispositivos (
  device_id VARCHAR(50) PRIMARY KEY,
  modelo VARCHAR(50) DEFAULT 'TTGO T3 v1.6',
  estado ENUM('disponible', 'asignado', 'mantenimiento') DEFAULT 'disponible',
  bateria DECIMAL(5,2),
  ultima_conexion DATETIME,
  id_estacion INT UNIQUE NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dispositivo_estacion
    FOREIGN KEY (id_estacion) REFERENCES estaciones(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);
```

## 🔧 API Endpoints

### Estaciones
- `GET /api/estaciones` - Obtener todas las estaciones con dispositivos
- `POST /api/estaciones` - Crear nueva estación
- `GET /api/estaciones/{id}` - Obtener estación por ID
- `PUT /api/estaciones/{id}` - Actualizar estación
- `DELETE /api/estaciones/{id}` - Eliminar estación

### Dispositivos
- `GET /api/dispositivos` - Obtener todos los dispositivos
- `GET /api/dispositivos/disponibles` - Obtener dispositivos disponibles
- `GET /api/dispositivos/estacion/{stationId}` - Obtener dispositivo de estación
- `POST /api/dispositivos/asignar` - Asignar dispositivo a estación
- `PUT /api/dispositivos/{deviceId}/liberar` - Liberar dispositivo

## 📁 Estructura de Archivos

### Backend
```
backend/
├── src/
│   ├── controllers/
│   │   ├── stationContorollers.js (actualizado)
│   │   └── deviceControllers.js (nuevo)
│   ├── models/
│   │   ├── stationModel.js (actualizado)
│   │   └── deviceModel.js (nuevo)
│   └── routes/
│       ├── stationRouters.js
│       └── deviceRoutes.js (nuevo)
├── datos_prueba_estaciones.sql (nuevo)
└── app.js (actualizado)
```

### Frontend
```
frontend/
├── src/
│   ├── components/
│   │   └── GestionEstaciones/
│   │       ├── GestionEstaciones.tsx (nuevo)
│   │       └── GestionEstaciones.css (nuevo)
│   ├── pages/
│   │   ├── GestionEstacionesPagina.tsx (nuevo)
│   │   ├── Home.tsx (actualizado)
│   │   └── index.tsx (actualizado)
│   ├── services/
│   │   └── api.ts (actualizado)
│   └── types/
│       └── index.ts (actualizado)
```

## 🚀 Cómo Usar

### 1. Configurar Base de Datos
```bash
# Ejecutar el script de inicialización
mysql -u root -p < backend/init.sql

# (Opcional) Agregar datos de prueba
mysql -u root -p < backend/datos_prueba_estaciones.sql
```

### 2. Iniciar Backend
```bash
cd backend
npm install
npm start
```

### 3. Iniciar Frontend
```bash
cd frontend
npm install
npm start
```

### 4. Acceder al Sistema
1. Abrir `http://localhost:3001` en el navegador
2. Navegar a la pestaña "**ESTACIONES**"
3. Usar las funcionalidades:
   - **➕ Nueva Estación**: Crear estaciones
   - **🔗 Asignar**: Vincular dispositivos disponibles
   - **🔓 Liberar**: Desvincular dispositivos

## 🔄 Flujo de Trabajo

### Crear Nueva Estación
1. Click en "➕ Nueva Estación"
2. Llenar formulario (nombre, ubicación, coordenadas)
3. Confirmar creación
4. La estación aparece sin dispositivo asignado

### Asignar Dispositivo
1. Click en "🔗 Asignar" en una estación sin dispositivo
2. Seleccionar dispositivo del dropdown (solo disponibles)
3. Confirmar asignación
4. El dispositivo cambia a `estado = 'asignado'`

### Liberar Dispositivo
1. Click en "🔓 Liberar" en una estación con dispositivo
2. Confirmar liberación
3. El dispositivo vuelve a `estado = 'disponible'`

## ⚡ Características Técnicas

### Seguridad y Validaciones
- ✅ Validación de campos requeridos
- ✅ Constraint UNIQUE en asignación (1 dispositivo por estación)
- ✅ Manejo de errores con mensajes descriptivos
- ✅ Confirmaciones para acciones críticas

### UX/UI
- ✅ Interfaz responsive y moderna
- ✅ Modales con animaciones suaves
- ✅ Indicadores de estado visual
- ✅ Mensajes de éxito/error temporales
- ✅ Loading states durante operaciones

### Performance
- ✅ Consultas SQL optimizadas con JOINs
- ✅ Carga asíncrona de datos
- ✅ Actualización automática tras operaciones
- ✅ Manejo de errores de red

## 🧪 Casos de Prueba

### Pruebas Funcionales
1. **Crear estación**: Con todos los campos requeridos
2. **Asignar dispositivo disponible**: Verificar cambio de estado
3. **Liberar dispositivo**: Verificar retorno a disponible
4. **Restricción única**: Intentar asignar dispositivo ya asignado
5. **Dispositivos disponibles**: Solo mostrar los no asignados

### Pruebas de Error
1. **Crear estación sin campos requeridos**
2. **Asignar dispositivo inexistente**
3. **Liberar dispositivo no asignado**
4. **Conectividad de red**: Manejo offline

## 📞 Soporte y Mantenimiento

### Logs de Desarrollo
- Console.log detallados en servicios API
- Manejo de errores con stack traces
- Estados de loading visibles para debug

### Escalabilidad
- Estructura modular y extensible
- Separación clara Backend/Frontend
- API RESTful estándar
- TypeScript para mayor mantenibilidad

---

**✨ Sistema implementado exitosamente con todas las funcionalidades requeridas ✨**