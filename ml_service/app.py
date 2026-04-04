"""
============================================================
  MICROSERVICIO FASTAPI — PREDICCIÓN METEOROLÓGICA
  Plataforma IoT - Estaciones Meteorológicas Curicó/Maule
============================================================

Expone endpoints REST que consumen los modelos XGBoost entrenados
localmente y validan contra Open-Meteo Forecast API.

Arquitectura:
  - /predict  → Predicción principal (modelo local + Open-Meteo)
  - /health   → Estado del servicio
  - /metricas → Métricas de entrenamiento

Autor: Erik Soza — Universidad de Talca
Proyecto: Memoria Universitaria - Red IoT Meteorológica
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Optional

import numpy as np
import joblib
import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ============================================================
# CONFIGURACIÓN
# ============================================================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODELOS_DIR = os.path.join(SCRIPT_DIR, "modelos")
MODELO_PATH = os.path.join(MODELOS_DIR, "modelo_xgboost.pkl")
METRICAS_PATH = os.path.join(MODELOS_DIR, "metricas.json")

# Coordenadas de Curicó, Chile
CURICO_LAT = -34.9853
CURICO_LON = -71.2368

HORIZONTES_VALIDOS = [24, 48, 72]
LAG_WINDOW = 12

logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(message)s")
logger = logging.getLogger(__name__)

# ============================================================
# ESTADO GLOBAL (cargado al iniciar)
# ============================================================
paquete_modelo: Optional[dict] = None
metricas_globales: Optional[dict] = None


def cargar_modelo() -> None:
    """Carga el .pkl y las métricas al iniciar el servicio."""
    global paquete_modelo, metricas_globales

    if not os.path.exists(MODELO_PATH):
        raise FileNotFoundError(
            f"Modelo no encontrado en: {MODELO_PATH}\n"
            "Ejecuta train_model.py primero para generar el .pkl"
        )

    paquete_modelo = joblib.load(MODELO_PATH)
    logger.info(f"Modelo cargado — versión {paquete_modelo.get('version', 'N/A')}, "
                f"{len(paquete_modelo['feature_names'])} features, "
                f"horizontes {paquete_modelo['horizontes']}h")

    if os.path.exists(METRICAS_PATH):
        with open(METRICAS_PATH, "r", encoding="utf-8") as f:
            metricas_globales = json.load(f)
        logger.info("Métricas cargadas correctamente")


# ============================================================
# APP FASTAPI
# ============================================================
app = FastAPI(
    title="ML Service — Predicción Meteorológica IoT",
    description=(
        "Microservicio de predicción de temperatura a 24h/48h/72h "
        "para la red de estaciones meteorológicas en Curicó, Chile."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    cargar_modelo()


# ============================================================
# HELPERS
# ============================================================
def construir_features(
    temp: float,
    humedad: float,
    viento: float,
    hora: int,
    dia_semana: int,
    mes: int,
    lags_temp: list[float],
    lags_hum: list[float],
    lags_viento: list[float],
) -> np.ndarray:
    """
    Construye el vector de 42 features en el mismo orden que el modelo espera.

    lags_* deben tener LAG_WINDOW (12) valores: índice 0 = lag_1h (más reciente),
    índice 11 = lag_12h (más antiguo).
    """
    feature_names = paquete_modelo["feature_names"]  # type: ignore[index]
    vector: dict[str, float] = {
        "air_temperature_C": temp,
        "relative_humidity_percent": humedad,
        "wind_speed_kmh": viento,
        "hour": float(hora),
        "dia_semana": float(dia_semana),
        "mes": float(mes),
    }
    for i in range(LAG_WINDOW):
        vector[f"temp_lag_{i+1}h"] = lags_temp[i]
        vector[f"hum_lag_{i+1}h"] = lags_hum[i]
        vector[f"viento_lag_{i+1}h"] = lags_viento[i]

    return np.array([[vector[f] for f in feature_names]])


def predecir_anchors(X: np.ndarray, horas_max: int) -> dict[int, float]:
    """
    Ejecuta los modelos disponibles hasta horas_max y retorna
    un dict {horizonte: temperatura_predicha}.
    Incluye el punto 0 (temperatura actual, tomada del feature vector).
    """
    anclas: dict[int, float] = {0: float(X[0][0])}  # feature 0 = air_temperature_C
    for h in HORIZONTES_VALIDOS:
        if h <= horas_max:
            modelo = paquete_modelo["modelos"][f"modelo_{h}h"]  # type: ignore[index]
            anclas[h] = float(modelo.predict(X)[0])
    return anclas


def interpolar_curva(
    anclas: dict[int, float], horas_max: int, ahora: datetime
) -> list[dict]:
    """
    Genera una predicción horaria interpolando linealmente entre los puntos
    ancla (0h, 24h, 48h, 72h según disponibilidad).

    Retorna lista de {hora_offset, datetime, temperatura}.
    """
    puntos_ordenados = sorted(anclas.items())  # [(0, t0), (24, t24), ...]
    predicciones = []

    for i in range(1, horas_max + 1):
        # Encontrar el segmento que contiene la hora i
        t_inicio, temp_inicio = puntos_ordenados[0]
        t_fin, temp_fin = puntos_ordenados[-1]

        for j in range(len(puntos_ordenados) - 1):
            h_a, temp_a = puntos_ordenados[j]
            h_b, temp_b = puntos_ordenados[j + 1]
            if h_a <= i <= h_b:
                t_inicio, temp_inicio = h_a, temp_a
                t_fin, temp_fin = h_b, temp_b
                break

        if t_fin == t_inicio:
            temp_i = temp_inicio
        else:
            fraccion = (i - t_inicio) / (t_fin - t_inicio)
            temp_i = temp_inicio + (temp_fin - temp_inicio) * fraccion

        predicciones.append({
            "hora_offset": i,
            "datetime": (ahora + timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M"),
            "temperatura": round(temp_i, 2),
        })

    return predicciones


async def consultar_openmeteo(horas: int, lat: float, lon: float) -> Optional[list[dict]]:
    """
    Consulta Open-Meteo Forecast API para las próximas `horas` horas
    en las coordenadas dadas.

    Retorna lista de {hora_offset, datetime, temperatura} o None si falla.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m",
        "forecast_days": max(4, (horas // 24) + 1),
        "timezone": "America/Santiago",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        tiempos = data["hourly"]["time"]
        temps = data["hourly"]["temperature_2m"]

        return [
            {
                "hora_offset": i + 1,
                "datetime": tiempos[i],
                "temperatura": round(temps[i], 1),
            }
            for i in range(min(horas, len(tiempos)))
        ]
    except Exception as exc:
        logger.warning(f"Open-Meteo no disponible: {exc}")
        return None


def calcular_confianza(
    pred_local: list[dict], pred_om: Optional[list[dict]]
) -> dict:
    """
    Compara predicciones locales vs Open-Meteo.
    Clasifica la confianza según el MAE entre ambas fuentes.
    """
    if not pred_om:
        return {
            "nivel": "Desconocido",
            "badge": "⚪",
            "mae_diferencia": None,
            "descripcion": "No se pudo conectar con Open-Meteo para validar",
        }

    temps_local = np.array([p["temperatura"] for p in pred_local])
    temps_om = np.array([p["temperatura"] for p in pred_om[: len(pred_local)]])
    n = min(len(temps_local), len(temps_om))

    if n == 0:
        return {
            "nivel": "Desconocido",
            "badge": "⚪",
            "mae_diferencia": None,
            "descripcion": "Datos insuficientes para calcular confianza",
        }

    mae = float(np.mean(np.abs(temps_local[:n] - temps_om[:n])))

    if mae <= 1.5:
        nivel, badge = "Alto", "🟢"
        desc = f"Diferencia promedio de {mae:.2f}°C con Open-Meteo — predicción confiable"
    elif mae <= 3.0:
        nivel, badge = "Medio", "🟡"
        desc = f"Diferencia promedio de {mae:.2f}°C con Open-Meteo — revisar condiciones locales"
    else:
        nivel, badge = "Bajo", "🔴"
        desc = f"Diferencia de {mae:.2f}°C con Open-Meteo — posible evento meteorológico inusual"

    return {
        "nivel": nivel,
        "badge": badge,
        "mae_diferencia": round(mae, 2),
        "descripcion": desc,
    }


# ============================================================
# ENDPOINTS
# ============================================================
@app.get("/")
async def root() -> dict:
    """Health check básico."""
    return {
        "servicio": "ML Service — Predicción Meteorológica",
        "version": "1.0.0",
        "estado": "activo",
        "modelo_cargado": paquete_modelo is not None,
        "endpoints": ["/predict", "/health", "/metricas"],
    }


@app.get("/health")
async def health() -> dict:
    """Estado detallado del servicio."""
    if paquete_modelo is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado")
    return {
        "estado": "ok",
        "modelo_version": paquete_modelo.get("version"),
        "fecha_entrenamiento": paquete_modelo.get("fecha_entrenamiento"),
        "horizontes_disponibles": paquete_modelo["horizontes"],
        "num_features": len(paquete_modelo["feature_names"]),
    }


@app.get("/predict")
async def predict(
    horas: int = Query(
        ..., description="Horizonte de predicción en horas. Valores válidos: 24, 48, 72"
    ),
    temp_actual: float = Query(..., description="Temperatura actual en °C"),
    humedad: float = Query(..., description="Humedad relativa en %"),
    presion: float = Query(..., description="Presión atmosférica en hPa (referencia, no usada por el modelo)"),
    viento: float = Query(..., description="Velocidad del viento en km/h"),
    lat: Optional[float] = Query(None, description="Latitud de la estación (default: Curicó -34.9853)"),
    lon: Optional[float] = Query(None, description="Longitud de la estación (default: Curicó -71.2368)"),
) -> dict:
    """
    Predice la temperatura para las próximas `horas` horas.

    Utiliza los modelos XGBoost locales (24h/48h/72h) como puntos ancla
    e interpola linealmente para generar la curva horaria completa.

    Los lags de 12h se aproximan con los valores actuales cuando no se
    dispone de historial real. El backend (Paso 3) enviará historial real
    desde MySQL, mejorando la precisión de los lags.

    Valida la predicción contra Open-Meteo Forecast API y calcula
    una métrica de confianza basada en el MAE entre ambas fuentes.
    """
    if paquete_modelo is None:
        raise HTTPException(status_code=503, detail="Modelo no inicializado")

    if horas not in HORIZONTES_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"horas debe ser uno de {HORIZONTES_VALIDOS}. Recibido: {horas}",
        )

    ahora = datetime.now()

    # Lags aproximados con valor constante cuando no hay historial real.
    # El backend (Paso 3) sobreescribirá esto con lecturas de MySQL.
    lags_temp = [temp_actual] * LAG_WINDOW
    lags_hum = [humedad] * LAG_WINDOW
    lags_viento = [viento] * LAG_WINDOW

    # Construir vector de features y obtener predicciones ancla
    X = construir_features(
        temp=temp_actual,
        humedad=humedad,
        viento=viento,
        hora=ahora.hour,
        dia_semana=ahora.weekday(),
        mes=ahora.month,
        lags_temp=lags_temp,
        lags_hum=lags_hum,
        lags_viento=lags_viento,
    )

    anclas = predecir_anchors(X, horas)
    predicciones_locales = interpolar_curva(anclas, horas, ahora)

    # Temperatura predicha en el horizonte solicitado (punto final)
    temp_final_predicha = anclas[horas]

    # Métricas del modelo principal
    metricas_modelo = None
    if metricas_globales:
        m = metricas_globales["resultados"][f"modelo_{horas}h"]
        metricas_modelo = {
            "mae_celsius": m["mae_celsius"],
            "rmse_celsius": m["rmse_celsius"],
            "r2_score": m["r2_score"],
            "nivel": m["nivel"],
        }

    # Consulta Open-Meteo
    lat_om = lat if lat is not None else CURICO_LAT
    lon_om = lon if lon is not None else CURICO_LON
    pred_openmeteo = await consultar_openmeteo(horas, lat_om, lon_om)

    # Confianza
    confianza = calcular_confianza(predicciones_locales, pred_openmeteo)

    return {
        "modelo_local": {
            "horizonte_horas": horas,
            "temperatura_predicha_final": round(temp_final_predicha, 2),
            "puntos_ancla": {
                f"{h}h": round(t, 2) for h, t in sorted(anclas.items()) if h > 0
            },
            "predicciones": predicciones_locales,
            "metricas_entrenamiento": metricas_modelo,
        },
        "validacion_openmeteo": {
            "disponible": pred_openmeteo is not None,
            "fuente": "Open-Meteo Forecast API",
            "coordenadas": {"lat": lat_om, "lon": lon_om},
            "predicciones": pred_openmeteo or [],
        },
        "confianza": confianza,
        "meta": {
            "timestamp": ahora.isoformat(),
            "inputs": {
                "temp_actual": temp_actual,
                "humedad": humedad,
                "presion": presion,
                "viento": viento,
            },
            "nota_lags": (
                "Lags aproximados con valor actual — "
                "el backend enviará historial real desde MySQL (Paso 3)"
            ),
        },
    }


@app.get("/metricas")
async def get_metricas() -> dict:
    """Retorna las métricas de entrenamiento del modelo cargado."""
    if metricas_globales is None:
        raise HTTPException(status_code=503, detail="Métricas no disponibles")
    return metricas_globales


# ============================================================
# MODELOS PYDANTIC (para POST /predict)
# ============================================================
class LecturaHistorial(BaseModel):
    """Una lectura histórica individual para los lags del modelo."""
    temperatura: float
    humedad: float
    velocidad_viento: float


class PredictRequest(BaseModel):
    """
    Cuerpo del POST /predict — utilizado por el proxy Node.js (Paso 3).
    Acepta el historial real de la estación desde MySQL.
    """
    horas: int = Field(..., description="Horizonte: 24, 48 o 72")
    temp_actual: float = Field(..., description="Temperatura actual en °C")
    humedad: float = Field(..., description="Humedad relativa en %")
    presion: float = Field(..., description="Presión atmosférica en hPa")
    viento: float = Field(..., description="Velocidad del viento en km/h")
    lat: Optional[float] = Field(None, description="Latitud de la estación")
    lon: Optional[float] = Field(None, description="Longitud de la estación")
    historial: Optional[list[LecturaHistorial]] = Field(
        None,
        description=(
            "Últimas lecturas históricas, de más reciente (T-1h) a más antigua (T-12h). "
            "Si se omite o tiene menos de 12 elementos, se rellena con valores actuales."
        ),
    )


# ============================================================
# POST /predict — usado por el proxy Node.js con historial real
# ============================================================
@app.post("/predict")
async def predict_post(body: PredictRequest) -> dict:
    """
    Predice la temperatura usando el historial real de lecturas (lags reales).

    Llamado por el proxy Node.js (Paso 3) que lee las últimas 12 lecturas
    de MySQL y las envía en el campo `historial`.
    """
    if paquete_modelo is None:
        raise HTTPException(status_code=503, detail="Modelo no inicializado")

    if body.horas not in HORIZONTES_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"horas debe ser uno de {HORIZONTES_VALIDOS}. Recibido: {body.horas}",
        )

    ahora = datetime.now()

    # Construir lags desde el historial recibido; rellenar si faltan
    historial = body.historial or []
    n_hist = len(historial)

    lags_temp = [
        historial[i].temperatura if i < n_hist else body.temp_actual
        for i in range(LAG_WINDOW)
    ]
    lags_hum = [
        historial[i].humedad if i < n_hist else body.humedad
        for i in range(LAG_WINDOW)
    ]
    lags_viento = [
        historial[i].velocidad_viento if i < n_hist else body.viento
        for i in range(LAG_WINDOW)
    ]

    X = construir_features(
        temp=body.temp_actual,
        humedad=body.humedad,
        viento=body.viento,
        hora=ahora.hour,
        dia_semana=ahora.weekday(),
        mes=ahora.month,
        lags_temp=lags_temp,
        lags_hum=lags_hum,
        lags_viento=lags_viento,
    )

    anclas = predecir_anchors(X, body.horas)
    predicciones_locales = interpolar_curva(anclas, body.horas, ahora)
    temp_final_predicha = anclas[body.horas]

    metricas_modelo = None
    if metricas_globales:
        m = metricas_globales["resultados"][f"modelo_{body.horas}h"]
        metricas_modelo = {
            "mae_celsius": m["mae_celsius"],
            "rmse_celsius": m["rmse_celsius"],
            "r2_score": m["r2_score"],
            "nivel": m["nivel"],
        }

    lat_om = body.lat if body.lat is not None else CURICO_LAT
    lon_om = body.lon if body.lon is not None else CURICO_LON
    pred_openmeteo = await consultar_openmeteo(body.horas, lat_om, lon_om)
    confianza = calcular_confianza(predicciones_locales, pred_openmeteo)

    return {
        "modelo_local": {
            "horizonte_horas": body.horas,
            "temperatura_predicha_final": round(temp_final_predicha, 2),
            "puntos_ancla": {
                f"{h}h": round(t, 2) for h, t in sorted(anclas.items()) if h > 0
            },
            "predicciones": predicciones_locales,
            "metricas_entrenamiento": metricas_modelo,
        },
        "validacion_openmeteo": {
            "disponible": pred_openmeteo is not None,
            "fuente": "Open-Meteo Forecast API",
            "coordenadas": {"lat": lat_om, "lon": lon_om},
            "predicciones": pred_openmeteo or [],
        },
        "confianza": confianza,
        "meta": {
            "timestamp": ahora.isoformat(),
            "inputs": {
                "temp_actual": body.temp_actual,
                "humedad": body.humedad,
                "presion": body.presion,
                "viento": body.viento,
            },
            "lags_reales": n_hist > 0,
            "lags_usados": n_hist,
        },
    }


# ============================================================
# ENTRADA DIRECTA
# ============================================================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=True)
