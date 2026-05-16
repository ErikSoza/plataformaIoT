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
LAG_WINDOW_TEMP       = 24   # temperatura: lags 1h–24h
LAG_WINDOW_HUM_VIENTO = 12   # humedad y viento: lags 1h–12h
LAG_WINDOW_PRESION    = 12   # presión: lags 1h–12h
PRESION_CURICO_MEDIA  = 993.0  # hPa — valor por defecto si el sensor no tiene presión

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
    presion: float,
    hora: int,
    dia_semana: int,
    mes: int,
    lags_temp: list[float],
    lags_hum: list[float],
    lags_viento: list[float],
    lags_presion: list[float],
) -> np.ndarray:
    """
    Construye el vector de 80 features v3 en el mismo orden que el modelo espera.

    lags_temp:    24 valores — índice 0 = T-1h, índice 23 = T-24h (ayer)
    lags_hum/viento/presion: 12 valores — índice 0 = T-1h, índice 11 = T-12h

    Estructura (debe coincidir con obtener_features() en train_model.py):
      [A] 4 actuales:   temp, humedad, viento, presion
      [B] 5 cíclicos:   hour_sin/cos, mes_sin/cos, dia_semana
      [C] 24 lags temp
      [D] 12 lags humedad
      [E] 12 lags viento
      [F] 12 lags presión
      [G] 4 deltas temperatura
      [H] 4 deltas presión
      [I] 3 rolling temperatura
    """
    feature_names = paquete_modelo["feature_names"]  # type: ignore[index]

    def _lag(lst: list[float], idx: int, fallback: float) -> float:
        return lst[idx] if idx < len(lst) else fallback

    # [B] Codificación cíclica
    hour_sin = float(np.sin(2 * np.pi * hora / 24))
    hour_cos = float(np.cos(2 * np.pi * hora / 24))
    mes_sin  = float(np.sin(2 * np.pi * mes / 12))
    mes_cos  = float(np.cos(2 * np.pi * mes / 12))

    # [G] Deltas temperatura
    delta_temp_1h  = temp - _lag(lags_temp, 0,  temp)
    delta_temp_3h  = temp - _lag(lags_temp, 2,  temp)
    delta_temp_6h  = temp - _lag(lags_temp, 5,  temp)
    delta_temp_24h = temp - _lag(lags_temp, 23, temp)

    # [H] Deltas presión (clave: caída rápida = frente de tormenta)
    delta_pres_1h  = presion - _lag(lags_presion, 0,  presion)
    delta_pres_3h  = presion - _lag(lags_presion, 2,  presion)
    delta_pres_6h  = presion - _lag(lags_presion, 5,  presion)
    delta_pres_12h = presion - _lag(lags_presion, 11, presion)

    # [I] Rolling temperatura
    temps_6h  = [temp] + [_lag(lags_temp, i, temp) for i in range(5)]
    temps_12h = [temp] + [_lag(lags_temp, i, temp) for i in range(11)]
    mean_6h  = float(np.mean(temps_6h))
    mean_12h = float(np.mean(temps_12h))
    std_6h   = float(np.std(temps_6h)) if len(temps_6h) > 1 else 0.0

    vector: dict[str, float] = {
        # [A]
        "air_temperature_C":       temp,
        "relative_humidity_percent": humedad,
        "wind_speed_kmh":          viento,
        "presion_hPa":             presion,
        # [B]
        "hour_sin":   hour_sin,
        "hour_cos":   hour_cos,
        "mes_sin":    mes_sin,
        "mes_cos":    mes_cos,
        "dia_semana": float(dia_semana),
    }

    # [C] Lags temperatura 1-24h
    for i in range(LAG_WINDOW_TEMP):
        vector[f"temp_lag_{i+1}h"] = _lag(lags_temp, i, temp)

    # [D] Lags humedad 1-12h
    for i in range(LAG_WINDOW_HUM_VIENTO):
        vector[f"hum_lag_{i+1}h"] = _lag(lags_hum, i, humedad)

    # [E] Lags viento 1-12h
    for i in range(LAG_WINDOW_HUM_VIENTO):
        vector[f"viento_lag_{i+1}h"] = _lag(lags_viento, i, viento)

    # [F] Lags presión 1-12h
    for i in range(LAG_WINDOW_PRESION):
        vector[f"presion_lag_{i+1}h"] = _lag(lags_presion, i, presion)

    # [G] Deltas temperatura
    vector["temp_delta_1h"]  = delta_temp_1h
    vector["temp_delta_3h"]  = delta_temp_3h
    vector["temp_delta_6h"]  = delta_temp_6h
    vector["temp_delta_24h"] = delta_temp_24h

    # [H] Deltas presión
    vector["presion_delta_1h"]  = delta_pres_1h
    vector["presion_delta_3h"]  = delta_pres_3h
    vector["presion_delta_6h"]  = delta_pres_6h
    vector["presion_delta_12h"] = delta_pres_12h

    # [I] Rolling temperatura
    vector["temp_mean_6h"]  = mean_6h
    vector["temp_mean_12h"] = mean_12h
    vector["temp_std_6h"]   = std_6h

    return np.array([[vector[f] for f in feature_names]])


def predecir_horario(X: np.ndarray, horas_max: int) -> dict[int, float]:
    """
    Ejecuta los 72 modelos independientes (T+1h … T+horas_max) sobre el
    mismo vector de features X y retorna un dict {hora: temperatura}.

    Direct Multi-Step Forecasting: cada modelo está especializado en su
    horizonte exacto. No hay interpolación — cada punto es una predicción
    real del modelo correspondiente.
    """
    modelos_pkg = paquete_modelo["modelos"]  # type: ignore[index]
    return {
        h: float(modelos_pkg[f"modelo_{h}h"].predict(X)[0])
        for h in range(1, horas_max + 1)
        if f"modelo_{h}h" in modelos_pkg
    }


def formatear_predicciones(pred_horario: dict[int, float], ahora: datetime) -> list[dict]:
    """Convierte el dict {hora: temp} al formato de lista que espera el frontend."""
    return [
        {
            "hora_offset": h,
            "datetime": (ahora + timedelta(hours=h)).strftime("%Y-%m-%dT%H:%M"),
            "temperatura": round(t, 2),
        }
        for h, t in sorted(pred_horario.items())
    ]


# interpolar_curva eliminada en v4: reemplazada por Direct Multi-Step Forecasting.
# Cada hora tiene su propio modelo XGBoost, no se interpola entre anclas.


def _interpolar_curva_legacy(
    anclas: dict[int, float],
    horas_max: int,
    ahora: datetime,
    lags_temp: list[float] | None = None,
) -> list[dict]:
    """
    Genera la curva horaria XGBoost usando los lags reales de la estación
    para calibrar el ciclo diurno propio (independiente de Open-Meteo).

    Algoritmo:
      1. Calcula media, amplitud y hora del pico desde los últimos 24 lags reales.
         Así el ciclo diurno refleja el comportamiento histórico de ESTA estación,
         no un valor genérico de Curicó.
      2. En cada ancla XGBoost (T+0h, T+24h, T+48h, T+72h) calcula el "residuo
         de tendencia": cuánto se aleja la predicción del ciclo diurno puro.
         Este residuo captura eventos de escala diaria (frentes, ondas de calor).
      3. Interpola linealmente el residuo entre anclas.
      4. Temperatura final = media + residuo_interpolado + ciclo_diurno(hora).

    La curva pasa exactamente por los 3 puntos ancla de XGBoost y tiene la
    forma diurna real de la estación. Open-Meteo se mantiene como línea
    de referencia separada, NO como base de esta curva.
    """
    temps_hist: list[float] = (lags_temp or [])[:24]

    HORA_MAX_MIN, HORA_MAX_MAX = 11, 18   # rango plausible para Curicó (Chile central)
    HORA_MAX_DEFAULT = 15                 # valor por defecto otoño/primavera

    if len(temps_hist) >= 6:
        daily_mean = float(np.mean(temps_hist))
        amplitud   = float(np.clip(
            (float(np.max(temps_hist)) - float(np.min(temps_hist))) / 2.0,
            2.5, 10.0,
        ))
        # Hora real del pico diario: lags[i] corresponde a la hora (ahora.hour - 1 - i) % 24
        idx_max  = int(np.argmax(temps_hist))
        hora_max = (ahora.hour - 1 - idx_max) % 24

        # Plausibilidad: si el pico cae fuera del rango diurno esperado para
        # la región (ocurre cuando los lags solo cubren pocas horas o el
        # sensor fue instalado recientemente), se usa el valor por defecto
        # para evitar que un hora_max incorrecto distorsione toda la curva.
        if not (HORA_MAX_MIN <= hora_max <= HORA_MAX_MAX):
            hora_max = HORA_MAX_DEFAULT
    else:
        daily_mean = float(anclas.get(0, 15.0))
        amplitud   = 5.0
        hora_max   = HORA_MAX_DEFAULT

    def diurno(hora_dia: int) -> float:
        return float(amplitud * np.cos(2 * np.pi * (hora_dia - hora_max) / 24))

    # Las anclas futuras ocurren siempre a la misma hora del día (ahora.hour),
    # por lo que tienen idéntica componente diurna. El residuo captura
    # exclusivamente la tendencia inter-diaria (cuánto sube o baja el nivel
    # base de temperatura de un día al siguiente).
    diurno_hora_ancla = diurno(ahora.hour)
    residuos: dict[int, float] = {
        h: t - daily_mean - diurno_hora_ancla
        for h, t in anclas.items()
    }
    puntos_residuo = sorted(residuos.items())

    def interp_residuo(i: int) -> float:
        if i <= puntos_residuo[0][0]:
            return puntos_residuo[0][1]
        if i >= puntos_residuo[-1][0]:
            return puntos_residuo[-1][1]
        for j in range(len(puntos_residuo) - 1):
            ha, ra = puntos_residuo[j]
            hb, rb = puntos_residuo[j + 1]
            if ha <= i <= hb:
                return ra + (rb - ra) * (i - ha) / (hb - ha)
        return puntos_residuo[-1][1]

    predicciones = []
    for i in range(1, horas_max + 1):
        hora_futura = (ahora.hour + i) % 24
        temp_i = daily_mean + interp_residuo(i) + diurno(hora_futura)
        predicciones.append({
            "hora_offset": i,
            "datetime": (ahora + timedelta(hours=i)).strftime("%Y-%m-%dT%H:%M"),
            "temperatura": round(temp_i, 2),
        })

    return predicciones


async def consultar_openmeteo(
    horas: int, lat: float, lon: float, ahora: datetime
) -> Optional[list[dict]]:
    """
    Consulta Open-Meteo Forecast API para las próximas `horas` horas
    en las coordenadas dadas, empezando desde la hora actual (no desde medianoche).

    El array de Open-Meteo siempre empieza a las 00:00 del día actual.
    Sin alinear, a las 14:00 los primeros 14 índices son del pasado y
    hora_offset=1 apuntaría a las 01:00 en lugar de a las 15:00, lo que
    produce una divergencia artificial con las predicciones de XGBoost.

    Retorna lista de {hora_offset, datetime, temperatura} o None si falla.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m",
        "forecast_days": max(4, (horas // 24) + 2),  # +2 para garantizar datos hasta T+72h
        "timezone": "America/Santiago",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        tiempos = data["hourly"]["time"]
        temps = data["hourly"]["temperature_2m"]

        # Encontrar el índice que corresponde a la hora actual
        hora_actual_str = ahora.strftime("%Y-%m-%dT%H:00")
        start_idx = 0
        for i, t in enumerate(tiempos):
            if t >= hora_actual_str:
                start_idx = i
                break
        # hora_offset=1 debe ser T+1h (la siguiente hora), no T+0h
        start_idx += 1

        disponibles = len(tiempos) - start_idx
        if disponibles <= 0:
            logger.warning("Open-Meteo: no hay datos futuros suficientes")
            return None

        return [
            {
                "hora_offset": i + 1,
                "datetime": tiempos[start_idx + i],
                "temperatura": round(temps[start_idx + i], 1),
            }
            for i in range(min(horas, disponibles))
        ]
    except Exception as exc:
        logger.warning(f"Open-Meteo no disponible: {exc}")
        return None


def calcular_confianza(
    anclas: dict[int, float], pred_om: Optional[list[dict]]
) -> dict:
    """
    Compara los puntos ancla de XGBoost (T+24h, T+48h, T+72h) contra Open-Meteo
    en esas mismas horas. Medir la confianza solo en los anclas es correcto porque:
      - Son las predicciones reales del modelo, no interpolaciones.
      - Comparar la curva horaria completa penaliza la interpolación (no el modelo).
    """
    if not pred_om:
        return {
            "nivel": "Desconocido",
            "badge": "⚪",
            "mae_diferencia": None,
            "descripcion": "No se pudo conectar con Open-Meteo para validar",
        }

    om_por_offset = {p["hora_offset"]: p["temperatura"] for p in pred_om}
    diffs = []
    for h, t_xgb in anclas.items():
        if h > 0 and h in om_por_offset:
            diffs.append(abs(t_xgb - om_por_offset[h]))

    if not diffs:
        return {
            "nivel": "Desconocido",
            "badge": "⚪",
            "mae_diferencia": None,
            "descripcion": "Datos insuficientes para calcular confianza",
        }

    mae = float(np.mean(diffs))

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
    # El backend (Node.js) sobreescribirá esto con lecturas de MySQL.
    lags_temp     = [temp_actual] * LAG_WINDOW_TEMP
    lags_hum      = [humedad]     * LAG_WINDOW_HUM_VIENTO
    lags_viento   = [viento]      * LAG_WINDOW_HUM_VIENTO
    lags_presion  = [presion]     * LAG_WINDOW_PRESION

    # Construir vector de features y obtener predicciones ancla
    X = construir_features(
        temp=temp_actual,
        humedad=humedad,
        viento=viento,
        presion=presion,
        hora=ahora.hour,
        dia_semana=ahora.weekday(),
        mes=ahora.month,
        lags_temp=lags_temp,
        lags_hum=lags_hum,
        lags_viento=lags_viento,
        lags_presion=lags_presion,
    )

    # 72 predicciones horarias — una por modelo (Direct Multi-Step)
    pred_horario = predecir_horario(X, horas)
    predicciones_locales = formatear_predicciones(pred_horario, ahora)
    temp_final_predicha = pred_horario.get(horas, 0.0)

    # Métricas del horizonte máximo solicitado
    metricas_modelo = None
    if metricas_globales:
        m = metricas_globales["resultados"].get(f"modelo_{horas}h", {})
        if m:
            metricas_modelo = {
                "mae_celsius":  m["mae_celsius"],
                "rmse_celsius": m["rmse_celsius"],
                "r2_score":     m["r2_score"],
                "nivel":        m["nivel"],
            }

    # Open-Meteo: referencia independiente hora a hora
    lat_om = lat if lat is not None else CURICO_LAT
    lon_om = lon if lon is not None else CURICO_LON
    pred_openmeteo = await consultar_openmeteo(horas, lat_om, lon_om, ahora)

    # Confianza: MAE en los horizontes clave (24h, 48h, 72h)
    horas_clave = {h: pred_horario[h] for h in [24, 48, 72] if h in pred_horario}
    confianza = calcular_confianza(horas_clave, pred_openmeteo)

    return {
        "modelo_local": {
            "horizonte_horas": horas,
            "temperatura_predicha_final": round(temp_final_predicha, 2),
            "puntos_ancla": {
                f"{h}h": round(pred_horario[h], 2)
                for h in [24, 48, 72] if h in pred_horario
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
            "modelos_ejecutados": len(pred_horario),
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
    presion: Optional[float] = None   # BMP280 — None si el sensor no tiene presión


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
            "Últimas lecturas históricas, de más reciente (T-1h) a más antigua (T-24h). "
            "Se necesitan hasta 24 entradas para activar lag_24h. "
            "Si se omiten o hay menos de 24, se rellena con los valores actuales."
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
        historial[i].temperatura      if i < n_hist else body.temp_actual
        for i in range(LAG_WINDOW_TEMP)
    ]
    lags_hum = [
        historial[i].humedad          if i < n_hist else body.humedad
        for i in range(LAG_WINDOW_HUM_VIENTO)
    ]
    lags_viento = [
        historial[i].velocidad_viento if i < n_hist else body.viento
        for i in range(LAG_WINDOW_HUM_VIENTO)
    ]
    presion_actual = body.presion if body.presion is not None else PRESION_CURICO_MEDIA
    lags_presion = [
        historial[i].presion          if i < n_hist and historial[i].presion is not None
        else presion_actual
        for i in range(LAG_WINDOW_PRESION)
    ]

    X = construir_features(
        temp=body.temp_actual,
        humedad=body.humedad,
        viento=body.viento,
        presion=presion_actual,
        hora=ahora.hour,
        dia_semana=ahora.weekday(),
        mes=ahora.month,
        lags_temp=lags_temp,
        lags_hum=lags_hum,
        lags_viento=lags_viento,
        lags_presion=lags_presion,
    )

    # 72 predicciones horarias — una por modelo (Direct Multi-Step)
    pred_horario = predecir_horario(X, body.horas)
    predicciones_locales = formatear_predicciones(pred_horario, ahora)
    temp_final_predicha = pred_horario.get(body.horas, 0.0)

    metricas_modelo = None
    if metricas_globales:
        m = metricas_globales["resultados"].get(f"modelo_{body.horas}h", {})
        if m:
            metricas_modelo = {
                "mae_celsius":  m["mae_celsius"],
                "rmse_celsius": m["rmse_celsius"],
                "r2_score":     m["r2_score"],
                "nivel":        m["nivel"],
            }

    # Open-Meteo: referencia independiente hora a hora
    lat_om = body.lat if body.lat is not None else CURICO_LAT
    lon_om = body.lon if body.lon is not None else CURICO_LON
    pred_openmeteo = await consultar_openmeteo(body.horas, lat_om, lon_om, ahora)

    # Confianza: MAE en los horizontes clave (24h, 48h, 72h)
    horas_clave = {h: pred_horario[h] for h in [24, 48, 72] if h in pred_horario}
    confianza = calcular_confianza(horas_clave, pred_openmeteo)

    return {
        "modelo_local": {
            "horizonte_horas": body.horas,
            "temperatura_predicha_final": round(temp_final_predicha, 2),
            "puntos_ancla": {
                f"{h}h": round(pred_horario[h], 2)
                for h in [24, 48, 72] if h in pred_horario
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
            "lags_reales":       n_hist > 0,
            "lags_usados":       n_hist,
            "modelos_ejecutados": len(pred_horario),
        },
    }


# ============================================================
# ENTRADA DIRECTA
# ============================================================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=True)
