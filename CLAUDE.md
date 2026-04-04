# CLAUDE.md — Plataforma IoT Meteorológica

## Proyecto
Red de estaciones meteorológicas IoT de bajo costo para la zona de Curicó/Maule, Chile.
Memoria universitaria de Erik Soza — Universidad de Talca, Ingeniería en Computación.

## Stack Técnico
- **Firmware:** C++ en ESP32 TTGO LoRa32 T3 v1.6.1 (sensores AHT20, BMP280, anemómetro WH-SP-WS01)
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

## Estado Actual del Modelo ML (Paso 1 — COMPLETADO)
- Datasets: Open-Meteo 2023+2024 combinados = 17,541 registros horarios
- Features: 42 (6 actuales + 36 time-lag 12h)
- Split: 80% train / 20% test (temporal, sin shuffle)
- Resultados:
  - Modelo 24h: MAE=1.74°C, RMSE=2.22°C, R²=0.897
  - Modelo 48h: MAE=2.13°C, RMSE=2.67°C, R²=0.852
  - Modelo 72h: MAE=2.24°C, RMSE=2.79°C, R²=0.837
- Archivos generados: modelo_xgboost.pkl (5.3MB), metricas.json

## Plan de Implementación (Pasos Pendientes)

### Paso 2 — Microservicio FastAPI (SIGUIENTE)
- Archivo: `ml_service/app.py` en puerto 5001
- Endpoint: `GET /predict?horas=72&temp_actual=22.5&humedad=65&presion=1013&viento=12`
- Respuesta JSON con 3 bloques: modelo_local, validacion_openmeteo, confianza
- Carga modelo_xgboost.pkl al iniciar
- Consulta Open-Meteo Forecast API como referencia
- Calcula métrica de confianza (MAE entre ambas predicciones)

### Paso 3 — Proxy en Node.js ✅ COMPLETADO
- Endpoint: `GET /api/prediccion/:estacion_id?horas=72`
- Lee últimas 13 lecturas de MySQL (1 actual + 12 lags reales)
- Llama internamente a `POST localhost:5001/predict` con historial completo
- Retorna respuesta enriquecida con datos de la estación
- El microservicio Python NO se expone directamente al frontend
- Archivos: `backend/src/models/prediccionModel.js`, `controllers/prediccionController.js`, `routes/prediccionRoutes.js`

### Paso 4 — Visualización en React ✅ COMPLETADO
- Componente: `frontend/src/components/PrediccionChart.tsx`
- Línea azul sólida (#0288D1): predicción XGBoost
- Línea gris punteada (#9E9E9E): referencia Open-Meteo
- Banda sombreada: incertidumbre ±MAE del modelo de entrenamiento
- Badge de confianza: 🟢 Alto / 🟡 Medio / 🔴 Bajo / ⚪ Desconocido
- Selector de horizonte: 24h / 48h / 72h con recarga automática
- Tarjetas de puntos ancla: temperatura actual + 24h/48h/72h
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

## Preferencias del Desarrollador
- Idioma: Español
- Respuestas paso a paso con verificación explícita
- No romper funcionalidad existente al agregar código nuevo
- Priorizar eficiencia y output limpio
