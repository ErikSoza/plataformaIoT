# Tests de Caja Blanca — ML Service

## Cómo ejecutar

```bash
# Desde la carpeta ml_service/
pip install -r requirements-dev.txt
python -m pytest tests/ --cov=app --cov=features_utils --cov-report=term-missing -v
```

## Qué cubren

| Archivo de test | Función testeada | Tests | Cobertura |
|---|---|---|---|
| `test_confianza.py` | `calcular_confianza()` en `app.py` | 18 | 100% ramas |
| `test_features_utils.py` | `construir_lags()` en `features_utils.py` | 14 | 100% |
| `test_metricas.py` | `_get_metricas_variable()` en `app.py` | 10 | 100% ramas |

## Qué NO cubren

- Endpoints FastAPI (`GET /predict`, `POST /predict`, `/health`, `/variables`): requieren los modelos `.pkl` entrenados y el servidor activo.
- `construir_features()`: depende de `paquetes_modelos` (estado global cargado en startup).
- `consultar_openmeteo()`: hace llamadas HTTP reales a la API de Open-Meteo.
- `predecir_horario()`: requiere los modelos XGBoost cargados en memoria.
- Integración Node.js ↔ Python: requiere ambos servicios corriendo simultáneamente.
