# Plataforma IoT Meteorológica — Red de Estaciones Curicó/Maule

**Autor:** Erik Soza — Universidad de Talca, Ingeniería en Computación  
**Repositorio:** https://github.com/ErikSoza/plataformaIoT.git

---

## Descripción

Sistema completo de monitoreo meteorológico IoT de bajo costo para la zona de Curicó/Maule, Chile. Integra una red de estaciones físicas basadas en ESP32, un backend REST con pipeline MQTT, un microservicio de predicción con modelos XGBoost, y una SPA React con visualización en tiempo real, mapas de calor IDW y predicciones multi-variable a 24/48/72 horas.

---

## Arquitectura general

```
[ESP32 + Sensores]
       │  MQTT (JSON v2.1)
       ▼
[script_mqtt_a_mysql.py]  ← Suscriptor MQTT, parsea y persiste en MySQL
       │
       ▼
[MySQL]  ←──────────────────────────────────────────────┐
       │                                                 │
       ▼                                                 │
[Backend Node.js / Express]  ──/api/prediccion──►  [ML Service FastAPI :5001]
       │                                                 │
       ▼                                           XGBoost local (288 modelos)
[Frontend React + TypeScript :5173]                Open-Meteo Forecast API
  - Mapa Leaflet + heatmap IDW + leaflet-velocity
  - Gráficos Chart.js en tiempo real
  - PrediccionChart multi-variable
  - Sistema de alertas con notificaciones
  - Reportes + exportación Excel/CSV
```

### Capas de predicción

| Capa | Tecnología | Horizonte | Estado |
|------|-----------|-----------|--------|
| Edge | TinyML en ESP32 (R²=0.96) | 1 hora | Implementado |
| Backend | XGBoost local (288 modelos) | 24–72 horas | Implementado |
| Referencia | Open-Meteo Forecast API | 7–16 días | Integrado como validación |

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Firmware | C++ en ZY-ESP32 (ESP-WROOM-32) |
| Sensores | DHT11 (temp/hum), BMP280 (presión), MQ135 (6 gases), anemómetro WH-SP-WS01 |
| Pipeline MQTT | Python 3.12 + paho-mqtt + mysql-connector |
| Backend | Node.js 20 + Express 5, MySQL 8, JWT, bcrypt |
| ML Service | Python 3.12, XGBoost 2.0, FastAPI, httpx |
| Frontend | React 18 + TypeScript, Vite, Chart.js, Leaflet |
| Testing | Jest 29 (backend), pytest + pytest-cov (ML service) |

---

## Estructura del repositorio

```
plataformaIoT/
├── backend/                    # API REST Node.js + Express
│   ├── app.js                  # Punto de entrada, registra rutas
│   ├── init.sql                # Esquema MySQL completo (tablas + datos de ejemplo)
│   ├── src/
│   │   ├── controllers/        # Lógica de negocio
│   │   ├── models/             # Queries MySQL
│   │   ├── routes/             # Definición de endpoints
│   │   ├── middleware/
│   │   │   └── auth.js         # authenticateToken, requireAdmin (JWT)
│   │   └── utils/
│   │       ├── alertaLogica.js         # evaluarCondicion() — lógica pura
│   │       ├── prediccionValidacion.js # validarParametrosPrediccion()
│   │       └── userValidaciones.js     # isValidEmail/Password/Name()
│   └── tests/                  # Suite Jest — 83 tests, 100% cobertura módulos críticos
│       ├── alertaLogica.test.js
│       ├── prediccionValidacion.test.js
│       ├── userValidaciones.test.js
│       └── auth.middleware.test.js
├── frontend/                   # SPA React + TypeScript
│   └── src/
│       ├── components/         # PrediccionChart, AlertBell, MapaCalor, etc.
│       ├── pages/              # DispositivosPagina, ReportesPagina, etc.
│       └── services/           # api.ts — clientes HTTP hacia el backend
├── ml_service/                 # Microservicio FastAPI (puerto 5001)
│   ├── app.py                  # Endpoints /predict, /variables, /health, /metricas
│   ├── features_utils.py       # construir_lags() + constantes LAG_WINDOW_*
│   ├── train_model.py          # Entrenamiento de los 288 modelos XGBoost
│   ├── datos/                  # CSVs Open-Meteo 2023+2024
│   ├── modelos/                # .pkl generados por train_model.py (no versionados)
│   ├── requirements.txt
│   ├── requirements-dev.txt    # pytest, pytest-cov
│   └── tests/                  # Suite pytest — 42 tests
│       ├── test_confianza.py
│       ├── test_features_utils.py
│       └── test_metricas.py
├── script_mqtt_a_mysql.py      # Suscriptor MQTT → MySQL
├── simulador_esp32.py          # Simulador de estación para desarrollo
├── docs/
│   ├── pruebas_caja_negra_blanca.md
│   ├── pruebas_caja_blanca_implementacion.md
│   ├── documentacion_pruebas.md
│   └── accesibilidad_wave.md
└── CLAUDE.md
```

---

## Instalación y puesta en marcha

### Requisitos previos

- Node.js >= 20
- Python >= 3.10
- MySQL 8
- Broker MQTT (Mosquitto u otro)

### 1. Base de datos

```bash
# Crear esquema completo (tablas, relaciones y datos de ejemplo)
mysql -u root -p < backend/init.sql
```

Crear `backend/.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=plataformaiot
DB_PORT=3306
PORT=3000
JWT_SECRET=tu_clave_secreta_larga
```

### 2. Backend

```bash
cd backend
npm install
npm run dev     # desarrollo con nodemon
npm start       # producción
```

Disponible en `http://localhost:3000`.

### 3. ML Service

```bash
cd ml_service
pip install -r requirements.txt

# Entrenar los modelos (primera vez o al cambiar datos históricos)
python train_model.py
# Genera: modelos/modelo_xgboost.pkl, modelo_humedad.pkl,
#          modelo_presion.pkl, modelo_viento.pkl, metricas.json

uvicorn app:app --port 5001 --reload
```

Disponible en `http://localhost:5001`.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Disponible en `http://localhost:3001`.

### 5. Pipeline MQTT

```bash
# Suscriptor MQTT (conecta al broker y persiste en MySQL)
python script_mqtt_a_mysql.py

# Para desarrollo sin hardware real:
python simulador_esp32.py
```

---

## API REST — Endpoints

**Base URL:** `http://localhost:3000/api`

### Autenticación (`/api/auth`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/registro` | Registrar nuevo usuario | No |
| POST | `/auth/login` | Login, devuelve JWT | No |
| GET | `/auth/perfil` | Perfil del usuario autenticado | JWT |
| PUT | `/auth/perfil` | Actualizar nombre, email o contraseña | JWT |
| DELETE | `/auth/cuenta` | Eliminar cuenta propia | JWT |
| GET | `/auth/usuarios` | Listar todos los usuarios | Admin |
| POST | `/auth/usuarios` | Crear usuario (admin) | Admin |
| PUT | `/auth/usuarios/:id` | Actualizar usuario | Admin |
| DELETE | `/auth/usuarios/:id` | Eliminar usuario | Admin |

### Estaciones y dispositivos

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/estaciones` | Listar estaciones activas | No |
| GET | `/estaciones/:id` | Detalle de estación | No |
| POST | `/estaciones` | Crear estación | Admin |
| PUT | `/estaciones/:id` | Actualizar estación | Admin |
| DELETE | `/estaciones/:id` | Eliminar estación | Admin |
| GET | `/dispositivos` | Listar dispositivos ESP32 | JWT |
| POST | `/dispositivos/asignar` | Asignar dispositivo a estación | Admin |
| PUT | `/dispositivos/:id/liberar` | Desasociar dispositivo | Admin |

### Lecturas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/lecturas/:estacion_id` | Últimas lecturas de una estación |
| GET | `/lecturas/:estacion_id/historial` | Historial con filtro de fechas |
| GET | `/lecturas/reportes` | Lecturas para exportación |

### Predicción

| Método | Endpoint | Parámetros | Descripción |
|--------|----------|------------|-------------|
| GET | `/prediccion/:estacion_id` | `?variable=temperatura&horas=72` | Predicción vía proxy al ML Service |
| GET | `/prediccion/zona` | `?variable=humedad&horas=48` | Predicción promedio de zona |

### Alertas

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/alertas/reglas` | Reglas configuradas por el usuario | JWT |
| POST | `/alertas/reglas` | Crear nueva regla | JWT |
| PATCH | `/alertas/reglas/:id/toggle` | Activar/desactivar regla | JWT |
| DELETE | `/alertas/reglas/:id` | Eliminar regla | JWT |
| GET | `/alertas` | Alertas disparadas no leídas | JWT |
| PATCH | `/alertas/:id/leer` | Marcar alerta como leída | JWT |

### Zonas climáticas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/zonas` | Listar zonas climáticas |
| GET | `/zonas/:id/datos` | Datos agregados de una zona |

---

## ML Service — Endpoints FastAPI

**Base URL:** `http://localhost:5001`

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET/POST | `/predict` | Predicción `?variable=temperatura&horas=72` |
| GET | `/variables` | Variables disponibles y estado de cada modelo |
| GET | `/health` | Estado del servicio y modelos cargados |
| GET | `/metricas` | Métricas de entrenamiento (MAE, R², nivel) |

**Variables disponibles:** `temperatura` (°C) · `humedad` (%) · `presion` (hPa) · `viento` (km/h)

**Ejemplo de respuesta `/predict`:**
```json
{
  "variable": "temperatura",
  "unidad": "°C",
  "predicciones": [
    { "hora_offset": 1, "datetime": "2026-06-25T15:00", "valor": 22.4 }
  ],
  "openmeteo": [...],
  "confianza": {
    "nivel": "Alto",
    "badge": "🟢",
    "mae_diferencia": 0.8,
    "descripcion": "Diferencia media de ±0.8°C respecto a Open-Meteo"
  },
  "metricas": { "mae_celsius": 1.2, "r2_score": 0.94, "nivel": "Bueno" }
}
```

---

## Payload MQTT — JSON v2.1

```json
{
  "id": "UTALCA_AABBCCDDEE",
  "timestamp": 1747400000,
  "datos": {
    "temperatura":     "22.50",
    "humedad":         "49.00",
    "presionAT":       "1013.2",
    "velocidadViento": "0.0",
    "prediccionTemp":  "23.10",
    "gases": {
      "co2":     "402.6",
      "nh3":     "3.9",
      "alcohol": "1.2",
      "humo":    "10.0",
      "benceno": "10.0",
      "acetona": "10.0"
    }
  }
}
```

El subobjeto `gases` es opcional. El suscriptor MQTT usa `.get('gases', {})` para retrocompatibilidad con firmware anterior al MQ135.

---

## Esquema de base de datos — Tabla `lecturas`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | INT AUTO_INCREMENT | PK |
| device_id | VARCHAR(50) | FK → dispositivos |
| fecha_registro | DATETIME | Timestamp legible |
| raw_timestamp | BIGINT | Unix timestamp del ESP32 |
| temperatura | DECIMAL(5,2) | °C — DHT11 |
| humedad | DECIMAL(5,2) | % — DHT11 |
| presion_at | DECIMAL(6,1) | hPa — BMP280 |
| velocidad_viento | DECIMAL(5,2) | m/s — anemómetro |
| prediccion_temp | DECIMAL(5,2) | °C — TinyML Edge |
| gas_co2 | FLOAT NULL | ppm CO₂ — MQ135 |
| gas_nh3 | FLOAT NULL | ppm NH₃ — MQ135 |
| gas_alcohol | FLOAT NULL | ppm alcohol — MQ135 |
| gas_humo | FLOAT NULL | ppm humo — MQ135 |
| gas_benceno | FLOAT NULL | ppm benceno — MQ135 |
| gas_acetona | FLOAT NULL | ppm acetona — MQ135 |

Las columnas de gases son `NULL` en lecturas históricas sin sensor MQ135.

---

## Modelo ML — Detalles técnicos

**Arquitectura v5 (multi-variable):** 4 variables × 72 horizontes = 288 modelos XGBoost independientes. Cada modelo predice exactamente T+Xh para una variable específica.

**Features por modelo (80 total):**

| Grupo | Features |
|-------|---------|
| Variables actuales | temperatura, humedad, viento, presión |
| Tiempo cíclico | hora_sin, hora_cos, mes_sin, mes_cos, dia_semana |
| Lags temperatura | lag_1h … lag_24h |
| Lags humedad/viento | lag_1h … lag_12h (cada uno) |
| Lags presión | lag_1h … lag_12h |
| Deltas temperatura | delta a 1h, 3h, 6h, 24h |
| Deltas presión | delta a 1h, 3h, 6h, 12h |
| Rolling temperatura | media y std a 6h y 12h |

**Split temporal:** 70% train / 10% validación (early stopping) / 20% test

**Archivos generados por `train_model.py`:**

| Archivo | Variable | Nota |
|---------|---------|------|
| `modelos/modelo_xgboost.pkl` | temperatura | Compatible con v4 anterior |
| `modelos/modelo_humedad.pkl` | humedad relativa | |
| `modelos/modelo_presion.pkl` | presión atmosférica | |
| `modelos/modelo_viento.pkl` | velocidad del viento | |
| `modelos/metricas.json` | todas | Versionado en git |

Los `.pkl` no se versionan — se regeneran localmente con `train_model.py`.

---

## Pruebas de software

### Caja blanca — Backend (Jest)

```bash
cd backend
npm test                   # ejecutar tests
npm run test:coverage      # ejecutar con reporte de cobertura
```

| Módulo | Tests | Cobertura |
|--------|-------|-----------|
| `utils/alertaLogica.js` — `evaluarCondicion()` | 17 | 100% |
| `utils/prediccionValidacion.js` — validación parámetros | 17 | 100% |
| `utils/userValidaciones.js` — email/password/nombre | 26 | 100% |
| `middleware/auth.js` — JWT + roles | 23 | 100% |
| **Total** | **83** | **100% ramas/funciones** |

No requiere MySQL ni servidor activo.

### Caja blanca — ML Service (pytest)

```bash
cd ml_service
pip install -r requirements-dev.txt   # solo la primera vez
python -m pytest tests/ --cov=app --cov=features_utils --cov-report=term-missing -v
```

| Módulo | Tests | Cobertura |
|--------|-------|-----------|
| `features_utils.py` — `construir_lags()` | 14 | 100% |
| `app.py` — `calcular_confianza()` | 18 | función completa |
| `app.py` — `_get_metricas_variable()` | 10 | función completa |
| **Total** | **42** | **44% de app.py** |

El 56% restante de `app.py` son endpoints FastAPI, carga de `.pkl` y llamadas a Open-Meteo — requieren infraestructura activa y están fuera del alcance unitario.

No requiere modelos `.pkl` ni conexión a internet.

### Caja negra (documentada)

Ver [`docs/pruebas_caja_negra_blanca.md`](docs/pruebas_caja_negra_blanca.md):
- Partición de equivalencia (PE-01 a PE-29)
- Análisis de valores límite (VL-01 a VL-26)
- Pruebas de casos de uso (CU-01 a CU-05)
- Pruebas de transición de estados (TS-01 a TS-16)
- Pruebas de API REST (API-01 a API-17)
- Matriz de trazabilidad completa

---

## Accesibilidad

Auditoría con **WAVE Web Accessibility Evaluation Tool** sobre la vista principal:

| Métrica | Antes | Después |
|---------|-------|---------|
| AIM Score | 4.3 / 10 | ~8+ / 10 |
| Errores de contraste | 31 | 0 |
| Errores de formulario | 2 | 0 |
| Alertas de estructura HTML | 18 | 0 |

Cambios aplicados: landmarks semánticos (`<main>`, `<header>`, `<nav>`), jerarquía de encabezados correcta, tabs navegables con teclado (`<button>` + `aria-current`), ratios de contraste WCAG AA en todos los textos.

Ver [`docs/accesibilidad_wave.md`](docs/accesibilidad_wave.md) para el detalle completo.

---

## Hardware — Estación meteorológica

**Placa principal:** ZY-ESP32 (ESP-WROOM-32 estándar)

| Sensor | Variable medida | Interfaz |
|--------|----------------|----------|
| DHT11 | Temperatura (°C), Humedad (%) | GPIO 4 digital |
| BMP280 | Presión atmosférica (hPa) | I2C (SDA/SCL) |
| MQ135 | CO₂, NH₃, alcohol, humo, benceno, acetona | GPIO 34 (ADC) |
| Anemómetro WH-SP-WS01 | Velocidad del viento (m/s) | GPIO 27 pulsos |

El firmware incluye modelo TinyML (entrenado en Edge Impulse, R²=0.96) para predicción local de temperatura a 1 hora, enviado como campo `prediccionTemp` en el payload MQTT.

**Hardware anterior descartado:** TTGO LoRa32 T3 v1.6.1 con AHT20 + MQ-2 — reemplazado por problemas físicos con la placa.

---

## Ecuaciones físicas implementadas

- **Zambretti:** predicción cualitativa de lluvia basada en tendencia de presión barométrica
- **Magnus-Tetens:** cálculo de punto de rocío (dew point) a partir de temperatura y humedad

Son indicadores físicos complementarios al modelo ML principal, no el sistema de predicción central.

---

## Convenciones de desarrollo

- **Backend:** JavaScript ES6+, rutas en `backend/src/routes/`
- **Frontend:** TypeScript estricto, componentes funcionales con hooks
- **Python:** PEP 8, type hints, docstrings en español
- **Commits:** formato convencional — `feat(scope): descripción` / `fix(scope): descripción`
- **No commitear:** `.pkl`, `.env`, `node_modules/`, `__pycache__/`, `coverage/`
- **Sí commitear:** `metricas.json` (documentación del modelo entrenado)

---

## Solución de problemas frecuentes

### `npm test` falla con SyntaxError en Windows
El `.bin/jest` es un script bash, no compatible con Node en Windows. Usar:
```bash
node --experimental-vm-modules node_modules/jest/bin/jest.js
```
El `package.json` ya tiene esta corrección aplicada.

### ML Service — warnings de FastAPI `on_event`
Resuelto: `app.py` ya usa el patrón `lifespan` con `@asynccontextmanager` en lugar del deprecado `@app.on_event("startup")`.

### MySQL no conecta
1. Verificar que el servicio MySQL esté corriendo
2. Confirmar credenciales en `backend/.env`
3. Verificar que la BD `plataformaiot` exista — si no: `mysql -u root -p < backend/init.sql`

### ML Service arranca pero todas las variables retornan 503
Los modelos `.pkl` no están entrenados aún. Ejecutar `python train_model.py` desde `ml_service/`.

---

## Objetivos específicos de la memoria universitaria

| OE | Descripción | Estado |
|----|-------------|--------|
| OE2 | Modelo ML con métricas documentadas | Completado |
| OE3 | Endpoint + visualización en plataforma web | Completado |
| OE4 | Comparación XGBoost vs Open-Meteo (badge de confianza) | Completado |
| OE5 | Revalidación al instalar estaciones en terreno | Pendiente — instalación física |

---

*Universidad de Talca — Facultad de Ingeniería — Ingeniería en Computación — Curicó, Chile*
