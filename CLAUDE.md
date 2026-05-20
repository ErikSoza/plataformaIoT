# CLAUDE.md — Plataforma IoT Meteorológica

## Proyecto
Red de estaciones meteorológicas IoT de bajo costo para la zona de Curicó/Maule, Chile.
Memoria universitaria de Erik Soza — Universidad de Talca, Ingeniería en Computación.

## Stack Técnico
- **Firmware v2.1:** C++ en ZY-ESP32 (ESP-WROOM-32 estándar) — sensores DHT11 (temp/hum), BMP280 (presión), MQ135 (6 gases), anemómetro WH-SP-WS01
- **Hardware anterior:** TTGO LoRa32 T3 v1.6.1 con AHT20 + MQ-2 (reemplazado por problemas físicos)
- **TinyML:** Modelo entrenado en Edge Impulse (R²=0.96, horizonte 1h)
- **Backend:** Node.js + Express, MySQL, MQTT
- **Frontend:** React + TypeScript + Vite, Chart.js, Leaflet (heatmap IDW, leaflet-velocity)
- **ML Service:** Python (XGBoost/HistGradientBoosting), FastAPI (puerto 5001)
- **Repositorio:** https://github.com/ErikSoza/plataformaIoT.git

## Estructura del Repositorio
```
plataformaIoT/
├── backend/              # Node.js + Express
├── frontend/             # React + TypeScript
├── ml_service/           # Microservicio Python ML (NUEVO)
│   ├── datos/            # CSVs Open-Meteo 2023+2024
│   ├── modelos/          # modelo_xgboost.pkl, metricas.json
│   ├── train_model.py    # Script entrenamiento (COMPLETADO)
│   ├── app.py            # FastAPI microservicio (COMPLETADO - Paso 2)
│   └── requirements.txt  # Dependencias Python
├── firmware/             # Código ESP32
└── CLAUDE.md             # Este archivo
```

## Arquitectura de Predicción (3 capas)
| Capa | Componente | Horizonte | Estado |
|------|-----------|-----------|--------|
| Edge | TinyML en ESP32 (R²=0.96) | 1 hora | ✅ Implementado |
| Backend | XGBoost entrenado localmente | 24-72 horas | ✅ Modelo entrenado, ✅ FastAPI completado |
| Referencia | Open-Meteo Forecast API | 7-16 días | ⏳ Pendiente integración |

## Estado Actual del Modelo ML
- Arquitectura v5 (multi-variable): 4 variables × 72 horizontes = 288 modelos XGBoost
- Features: 80 (idénticas para todas las variables — solo cambia el target)
- Split: 70% train / 10% val (early stopping) / 20% test (temporal)
- Variables y archivos .pkl generados:
  - `modelo_xgboost.pkl` → temperatura (backward compat con v4)
  - `modelo_humedad.pkl` → humedad relativa (%)
  - `modelo_presion.pkl` → presión atmosférica (hPa)
  - `modelo_viento.pkl`  → velocidad del viento (km/h)
- `metricas.json` unificado: `resultados[variable][modelo_Xh]`
- **Requiere re-entrenamiento** para generar los 3 nuevos .pkl

## Plan de Implementación (Pasos Completados)

### Paso 2 — Microservicio FastAPI ✅ COMPLETADO (v2 multi-variable)
- Archivo: `ml_service/app.py` en puerto 5001
- Endpoint: `GET|POST /predict?variable=temperatura|humedad|presion|viento&horas=72`
- Nuevo endpoint: `GET /variables` → lista variables disponibles y estado de cada modelo
- Carga los 4 .pkl al iniciar; si alguno falta, esa variable retorna 503
- Open-Meteo mapeado por variable: temperature_2m, relative_humidity_2m, surface_pressure, wind_speed_10m

### Paso 3 — Proxy en Node.js ✅ COMPLETADO
- Endpoint: `GET /api/prediccion/:estacion_id?horas=72&variable=temperatura`
- Lee últimas 25 lecturas de MySQL (1 actual + 24 lags reales)
- Pasa `variable` al microservicio Python
- Archivos: `backend/src/models/prediccionModel.js`, `controllers/prediccionController.js`, `routes/prediccionRoutes.js`

### Paso 4 — Visualización en React ✅ COMPLETADO (v2 multi-variable)
- Componente: `frontend/src/components/PrediccionChart.tsx`
- Selector de variable: Temp. | Humedad | Presión | Viento (con color dinámico)
- Color de línea y borde del card cambia según variable seleccionada
- Unidades dinámicas en eje Y, tooltips y tarjetas de resumen
- Banda sombreada ±MAE en unidad nativa de la variable
- Badge de confianza con unidad correcta (°C / % / hPa / km/h)
- Selector de horizonte: 24h / 48h / 72h
- Métricas de entrenamiento (MAE, R², nivel) al pie del gráfico
- Integrado en `DispositivosPagina.tsx` — aparece al seleccionar estación
- `prediccionService` agregado a `frontend/src/services/api.ts`

## Objetivos Específicos de la Memoria
- **OE2:** Modelo ML con métricas documentadas ✅
- **OE3:** Endpoint + visualización en plataforma web (Pasos 2-4)
- **OE4:** Comparación XGBoost vs Open-Meteo = métricas de evaluación continua
- **OE5:** Revalidación al instalar estaciones en terreno

## Convenciones de Código
- Backend: JavaScript ES6+, Express routes en `backend/src/routes/`
- Frontend: TypeScript, React functional components con hooks
- Python: PEP 8, type hints, docstrings en español
- Commits: formato convencional `feat(scope): descripción`
- Los archivos .pkl NO se versionan en git (se regeneran con train_model.py)
- metricas.json SÍ se versiona (es documentación)

## Ecuaciones Implementadas
- **Zambretti:** Predicción cualitativa de lluvia basada en presión barométrica
- **Magnus-Tetens:** Cálculo de punto de rocío (dew point)
- Ambas son indicadores físicos complementarios, NO el modelo ML principal

## Documentación en Notion
- Path: Privado → Universidad → Memoria Universitaria → Semana 28
- Página principal: "🤖 Modelo Predictivo Web — Análisis, Decisión e Implementación"
- Documentación técnica completa del entrenamiento está en sub-página

## Payload MQTT — JSON v2.1 (firmware actual)
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
El subobjeto `gases` es nuevo en v2.1. El script `script_mqtt_a_mysql.py` lo parsea con `.get('gases', {})` para retrocompatibilidad.

## Tabla `lecturas` — Columnas actuales
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

Columnas de gases = NULL en lecturas históricas (Open-Meteo o ESP32 anterior sin MQ135).

## Migración v2.1
- Script: `backend/migrate_v2_1.sql` — ejecutar UNA vez sobre la BD existente
- El `init.sql` ya refleja el nuevo esquema

## Estado de la Plataforma Web (actualizado 2026-05-16)
- **Popup del mapa:** Sección "Calidad del Aire (MQ135)" con 6 badges de color semáforo
- **Mapa de calor:** Métrica "Calidad del Aire" = CO₂ (rango 400–1200 ppm, gradiente verde→rojo)
- **Vista de Reportes:** 6 gases disponibles como variable en el gráfico temporal y export Excel/CSV
- **Pipeline MQTT:** Compatible con JSON v2.1 (subobjeto `gases`) y versiones anteriores (sin gases → NULL)

## Preferencias del Desarrollador
- Idioma: Español
- Respuestas paso a paso con verificación explícita
- No romper funcionalidad existente al agregar código nuevo
- Priorizar eficiencia y output limpio
