"""
============================================================
  MICROSERVICIO FASTAPI v2 — PREDICCIÓN METEOROLÓGICA MULTI-VARIABLE
  Plataforma IoT - Estaciones Meteorológicas Curicó/Maule
============================================================

Expone endpoints REST que consumen los modelos XGBoost entrenados
localmente y validan contra Open-Meteo Forecast API.

Novedades v2:
  - Predicción multi-variable: temperatura, humedad, presión, viento.
  - Parámetro `variable` en GET/POST /predict (default: "temperatura").
  - Carga selectiva de modelos: si un .pkl no existe, esa variable
    retorna 503 sin afectar las demás.
  - /variables → lista variables disponibles con metadatos.
  - Backward compatible: respuesta incluye campo "temperatura" como
    alias de "valor" para no romper frontend antiguo.

Arquitectura:
  - /predict       → Predicción principal (modelo local + Open-Meteo)
  - /variables     → Variables disponibles y sus metadatos
  - /health        → Estado del servicio
  - /metricas      → Métricas de entrenamiento

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
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
MODELOS_DIR = os.path.join(SCRIPT_DIR, "modelos")
METRICAS_PATH = os.path.join(MODELOS_DIR, "metricas.json")

# Coordenadas de Curicó, Chile
CURICO_LAT = -34.9853
CURICO_LON = -71.2368

HORIZONTES_VALIDOS    = [24, 48, 72]
LAG_WINDOW_TEMP       = 24
LAG_WINDOW_HUM_VIENTO = 12
LAG_WINDOW_PRESION    = 12
PRESION_CURICO_MEDIA  = 993.0

logging.basicConfig(level=logging.INFO, format="%(levelname)s:     %(message)s")
logger = logging.getLogger(__name__)

# ============================================================
# VARIABLES CONFIG
#
# openmeteo_var: nombre de la variable en la API de Open-Meteo
# color:         color hex para el frontend
# pkl:           ruta al archivo .pkl entrenado
# ============================================================
VARIABLES_CONFIG: dict[str, dict] = {
    'temperatura': {
        'nombre':       'Temperatura',
        'unidad':       '°C',
        'openmeteo_var': 'temperature_2m',
        'color':        '#0288D1',
        'color_om':     '#9E9E9E',
        'pkl':          os.path.join(MODELOS_DIR, 'modelo_xgboost.pkl'),
    },
    'humedad': {
        'nombre':       'Humedad Relativa',
        'unidad':       '%',
        'openmeteo_var': 'relative_humidity_2m',
        'color':        '#00897B',
        'color_om':     '#80CBC4',
        'pkl':          os.path.join(MODELOS_DIR, 'modelo_humedad.pkl'),
    },
    'presion': {
        'nombre':       'Presión Atmosférica',
        'unidad':       'hPa',
        'openmeteo_var': 'surface_pressure',
        'color':        '#7B1FA2',
        'color_om':     '#CE93D8',
        'pkl':          os.path.join(MODELOS_DIR, 'modelo_presion.pkl'),
    },
    'viento': {
        'nombre':       'Velocidad del Viento',
        'unidad':       'km/h',
        'openmeteo_var': 'wind_speed_10m',
        'color':        '#F57C00',
        'color_om':     '#FFCC80',
        'pkl':          os.path.join(MODELOS_DIR, 'modelo_viento.pkl'),
    },
}

# ============================================================
# ESTADO GLOBAL (cargado al iniciar)
# ============================================================
paquetes_modelos: dict[str, Optional[dict]] = {k: None for k in VARIABLES_CONFIG}
metricas_globales: Optional[dict] = None


def cargar_modelos() -> None:
    """Carga todos los .pkl disponibles al iniciar el servicio."""
    global paquetes_modelos, metricas_globales

    cargados = []
    for var_key, var_cfg in VARIABLES_CONFIG.items():
        pkl_path = var_cfg['pkl']
        if os.path.exists(pkl_path):
            paquetes_modelos[var_key] = joblib.load(pkl_path)
            version = paquetes_modelos[var_key].get('version', 'N/A')
            logger.info(
                f"[{var_key}] Modelo cargado — v{version}, "
                f"{len(paquetes_modelos[var_key]['feature_names'])} features"
            )
            cargados.append(var_key)
        else:
            paquetes_modelos[var_key] = None
            logger.warning(f"[{var_key}] Modelo no encontrado: {pkl_path}")

    if not cargados:
        raise FileNotFoundError(
            "No se encontró ningún modelo. Ejecuta train_model.py primero."
        )
    logger.info(f"Variables disponibles: {cargados}")

    if os.path.exists(METRICAS_PATH):
        with open(METRICAS_PATH, "r", encoding="utf-8") as f:
            metricas_globales = json.load(f)
        logger.info("Métricas cargadas correctamente")


# ============================================================
# APP FASTAPI
# ============================================================
app = FastAPI(
    title="ML Service v2 — Predicción Meteorológica Multi-Variable IoT",
    description=(
        "Microservicio de predicción multi-variable (temperatura, humedad, "
        "presión, viento) a 24h/48h/72h para estaciones meteorológicas en Curicó, Chile."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event() -> None:
    cargar_modelos()


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
    Construye el vector de 80 features en el mismo orden que el modelo espera.
    Idéntico para todas las variables — solo cambia el modelo que predice.

    lags_temp:    24 valores — índice 0 = T-1h, índice 23 = T-24h
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
    # Usamos feature_names del primer modelo disponible (son idénticos para todas las variables)
    paquete_ref = next(p for p in paquetes_modelos.values() if p is not None)
    feature_names = paquete_ref["feature_names"]

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

    # [H] Deltas presión
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
        "air_temperature_C":         temp,
        "relative_humidity_percent": humedad,
        "wind_speed_kmh":            viento,
        "presion_hPa":               presion,
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

    # [G]
    vector["temp_delta_1h"]  = delta_temp_1h
    vector["temp_delta_3h"]  = delta_temp_3h
    vector["temp_delta_6h"]  = delta_temp_6h
    vector["temp_delta_24h"] = delta_temp_24h

    # [H]
    vector["presion_delta_1h"]  = delta_pres_1h
    vector["presion_delta_3h"]  = delta_pres_3h
    vector["presion_delta_6h"]  = delta_pres_6h
    vector["presion_delta_12h"] = delta_pres_12h

    # [I]
    vector["temp_mean_6h"]  = mean_6h
    vector["temp_mean_12h"] = mean_12h
    vector["temp_std_6h"]   = std_6h

    return np.array([[vector[f] for f in feature_names]])


def predecir_horario(X: np.ndarray, horas_max: int, variable: str = 'temperatura') -> dict[int, float]:
    """
    Ejecuta los modelos independientes T+1h…T+horas_max para la variable solicitada.
    Cada punto es una predicción real del modelo de ese horizonte exacto.
    """
    paquete = paquetes_modelos.get(variable)
    if paquete is None:
        raise HTTPException(
            status_code=503,
            detail=f"Modelo para '{variable}' no disponible. Ejecuta train_model.py para entrenar esta variable."
        )
    modelos_pkg = paquete["modelos"]
    return {
        h: float(modelos_pkg[f"modelo_{h}h"].predict(X)[0])
        for h in range(1, horas_max + 1)
        if f"modelo_{h}h" in modelos_pkg
    }


def formatear_predicciones(pred_horario: dict[int, float], ahora: datetime) -> list[dict]:
    """
    Convierte dict {hora: valor} al formato de lista que espera el frontend.
    Incluye campo 'temperatura' como alias de 'valor' para backward compat.
    """
    return [
        {
            "hora_offset": h,
            "datetime":    (ahora + timedelta(hours=h)).strftime("%Y-%m-%dT%H:%M"),
            "valor":       round(v, 2),
            "temperatura": round(v, 2),   # alias backward compat
        }
        for h, v in sorted(pred_horario.items())
    ]


def _get_metricas_variable(variable: str, horas: int) -> Optional[dict]:
    """Lee las métricas de entrenamiento para (variable, horizonte) desde metricas.json."""
    if metricas_globales is None:
        return None

    resultados = metricas_globales.get("resultados", {})

    # Formato nuevo v5: {"temperatura": {"modelo_24h": {...}}}
    if variable in resultados:
        m = resultados[variable].get(f"modelo_{horas}h", {})
    else:
        # Formato legado v4: {"modelo_24h": {...}} (solo temperatura)
        m = resultados.get(f"modelo_{horas}h", {}) if variable == 'temperatura' else {}

    if not m:
        return None

    var_cfg = VARIABLES_CONFIG.get(variable, {})
    return {
        "mae_celsius":  m.get("mae_celsius"),
        "rmse_celsius": m.get("rmse_celsius"),
        "r2_score":     m.get("r2_score"),
        "nivel":        m.get("nivel"),
        "unidad":       var_cfg.get("unidad", "°C"),
    }


async def consultar_openmeteo(
    horas: int,
    lat: float,
    lon: float,
    ahora: datetime,
    variable: str = 'temperatura',
) -> Optional[list[dict]]:
    """
    Consulta Open-Meteo Forecast API para la variable solicitada.

    Alineación temporal: el array de Open-Meteo empieza a las 00:00 del
    día actual. Se busca el índice correspondiente a la hora actual para
    que hora_offset=1 apunte correctamente a T+1h.
    """
    var_cfg = VARIABLES_CONFIG.get(variable, VARIABLES_CONFIG['temperatura'])
    om_var  = var_cfg['openmeteo_var']

    url    = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude":       lat,
        "longitude":      lon,
        "hourly":         om_var,
        "forecast_days":  max(4, (horas // 24) + 2),
        "timezone":       "America/Santiago",
        "wind_speed_unit": "kmh",   # garantiza km/h para wind_speed_10m
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

        tiempos  = data["hourly"]["time"]
        valores  = data["hourly"][om_var]

        # Encontrar índice de la hora actual
        hora_actual_str = ahora.strftime("%Y-%m-%dT%H:00")
        start_idx = 0
        for i, t in enumerate(tiempos):
            if t >= hora_actual_str:
                start_idx = i
                break
        start_idx += 1   # hora_offset=1 debe ser T+1h

        disponibles = len(tiempos) - start_idx
        if disponibles <= 0:
            logger.warning("Open-Meteo: no hay datos futuros suficientes")
            return None

        return [
            {
                "hora_offset": i + 1,
                "datetime":    tiempos[start_idx + i],
                "valor":       round(float(valores[start_idx + i]), 1),
                "temperatura": round(float(valores[start_idx + i]), 1),  # alias compat
            }
            for i in range(min(horas, disponibles))
        ]
    except Exception as exc:
        logger.warning(f"Open-Meteo no disponible [{variable}]: {exc}")
        return None


def calcular_confianza(
    anclas: dict[int, float],
    pred_om: Optional[list[dict]],
    horizonte: int = 72,
    mae_entrenamiento: Optional[float] = None,
    unidad: str = '°C',
) -> dict:
    """
    Compara puntos ancla del modelo local (T+24h, T+48h, T+72h) contra Open-Meteo.

    Ratio = MAE_acuerdo / MAE_entrenamiento:
      < 1.5  → Alto   (acuerdo dentro del error habitual del modelo)
      < 3.0  → Medio  (divergencia moderada)
      ≥ 3.0  → Bajo   (desacuerdo significativo)

    La unidad se usa solo para el texto descriptivo.
    """
    if not pred_om:
        return {
            "nivel": "Desconocido",
            "badge": "⚪",
            "mae_diferencia": None,
            "descripcion": "No se pudo conectar con Open-Meteo para validar",
        }

    PESOS: dict[int, float] = {24: 0.20, 48: 0.35, 72: 0.45}

    om_por_offset = {p["hora_offset"]: p["valor"] for p in pred_om}
    sum_pond = 0.0
    sum_peso = 0.0
    for h, v_local in anclas.items():
        if h > 0 and h in om_por_offset:
            diff = abs(v_local - om_por_offset[h])
            peso = PESOS.get(h, 1.0 / max(len(anclas), 1))
            sum_pond += diff * peso
            sum_peso += peso

    if sum_peso == 0:
        return {
            "nivel": "Desconocido",
            "badge": "⚪",
            "mae_diferencia": None,
            "descripcion": "Datos insuficientes para calcular confianza",
        }

    mae = sum_pond / sum_peso

    if mae_entrenamiento and mae_entrenamiento > 0:
        ratio = mae / mae_entrenamiento
        if ratio < 1.5:
            nivel, badge = "Alto", "🟢"
            desc = f"Δ{mae:.2f}{unidad} vs Open-Meteo ({ratio:.1f}× MAE entrenamiento) — predicción coherente"
        elif ratio < 3.0:
            nivel, badge = "Medio", "🟡"
            desc = f"Δ{mae:.2f}{unidad} vs Open-Meteo ({ratio:.1f}× MAE entrenamiento) — divergencia dentro de lo esperable"
        else:
            nivel, badge = "Bajo", "🔴"
            desc = f"Δ{mae:.2f}{unidad} vs Open-Meteo ({ratio:.1f}× MAE entrenamiento) — desacuerdo significativo con referencia"
    else:
        UMBRALES: dict[int, tuple[float, float]] = {
            24: (1.5, 2.5),
            48: (2.0, 4.0),
            72: (2.5, 5.0),
        }
        u_alto, u_medio = UMBRALES.get(horizonte, (2.5, 5.0))
        if mae <= u_alto:
            nivel, badge = "Alto", "🟢"
            desc = f"Diferencia promedio de {mae:.2f} {unidad} con Open-Meteo — predicción confiable"
        elif mae <= u_medio:
            nivel, badge = "Medio", "🟡"
            desc = f"Diferencia promedio de {mae:.2f} {unidad} con Open-Meteo — revisar condiciones locales"
        else:
            nivel, badge = "Bajo", "🔴"
            desc = f"Diferencia de {mae:.2f} {unidad} con Open-Meteo — posible evento meteorológico inusual"

    return {
        "nivel":          nivel,
        "badge":          badge,
        "mae_diferencia": round(mae, 2),
        "descripcion":    desc,
    }


def _construir_respuesta(
    variable: str,
    horas: int,
    pred_horario: dict[int, float],
    pred_openmeteo: Optional[list[dict]],
    ahora: datetime,
    lat_om: float,
    lon_om: float,
    inputs: dict,
    n_hist: int = 0,
) -> dict:
    """
    Construye el dict de respuesta unificado para GET y POST /predict.
    Centraliza la lógica para evitar duplicación entre ambos endpoints.
    """
    var_cfg       = VARIABLES_CONFIG[variable]
    pred_final    = pred_horario.get(horas, 0.0)
    predicciones  = formatear_predicciones(pred_horario, ahora)
    metricas_mod  = _get_metricas_variable(variable, horas)
    horas_clave   = {h: pred_horario[h] for h in [24, 48, 72] if h in pred_horario}
    mae_train     = metricas_mod["mae_celsius"] if metricas_mod else None
    unidad        = var_cfg["unidad"]
    confianza     = calcular_confianza(
        horas_clave, pred_openmeteo, horizonte=horas,
        mae_entrenamiento=mae_train, unidad=unidad
    )

    return {
        "variable":      variable,
        "variable_info": {
            "nombre":   var_cfg["nombre"],
            "unidad":   unidad,
            "color":    var_cfg["color"],
            "color_om": var_cfg["color_om"],
        },
        "modelo_local": {
            "horizonte_horas":           horas,
            "valor_predicho_final":      round(pred_final, 2),
            "temperatura_predicha_final": round(pred_final, 2),   # backward compat
            "puntos_ancla": {
                f"{h}h": round(pred_horario[h], 2)
                for h in [24, 48, 72] if h in pred_horario
            },
            "predicciones":          predicciones,
            "metricas_entrenamiento": metricas_mod,
        },
        "validacion_openmeteo": {
            "disponible":  pred_openmeteo is not None,
            "fuente":      "Open-Meteo Forecast API",
            "variable_om": var_cfg["openmeteo_var"],
            "coordenadas": {"lat": lat_om, "lon": lon_om},
            "predicciones": pred_openmeteo or [],
        },
        "confianza": confianza,
        "meta": {
            "timestamp":         ahora.isoformat(),
            "inputs":            inputs,
            "lags_reales":       n_hist > 0,
            "lags_usados":       n_hist,
            "modelos_ejecutados": len(pred_horario),
        },
    }


# ============================================================
# ENDPOINTS
# ============================================================
@app.get("/")
async def root() -> dict:
    disponibles = [k for k, v in paquetes_modelos.items() if v is not None]
    return {
        "servicio":        "ML Service v2 — Predicción Meteorológica Multi-Variable",
        "version":         "2.0.0",
        "estado":          "activo",
        "variables_disponibles": disponibles,
        "endpoints": ["/predict", "/variables", "/health", "/metricas"],
    }


@app.get("/variables")
async def get_variables() -> dict:
    """Lista las variables disponibles con sus metadatos y estado del modelo."""
    resultado = {}
    for var_key, var_cfg in VARIABLES_CONFIG.items():
        paquete   = paquetes_modelos.get(var_key)
        disponible = paquete is not None
        resultado[var_key] = {
            "nombre":      var_cfg["nombre"],
            "unidad":      var_cfg["unidad"],
            "color":       var_cfg["color"],
            "disponible":  disponible,
            "version":     paquete.get("version") if disponible else None,
            "fecha_entrenamiento": paquete.get("fecha_entrenamiento") if disponible else None,
        }
    return {"variables": resultado}


@app.get("/health")
async def health() -> dict:
    """Estado detallado del servicio."""
    disponibles = [k for k, v in paquetes_modelos.items() if v is not None]
    if not disponibles:
        raise HTTPException(status_code=503, detail="Ningún modelo cargado")
    paquete_ref = paquetes_modelos[disponibles[0]]
    return {
        "estado":                "ok",
        "variables_disponibles": disponibles,
        "modelo_version":        paquete_ref.get("version"),
        "fecha_entrenamiento":   paquete_ref.get("fecha_entrenamiento"),
        "horizontes_disponibles": paquete_ref["horizontes"],
        "num_features":          len(paquete_ref["feature_names"]),
    }


@app.get("/metricas")
async def get_metricas() -> dict:
    """Retorna las métricas de entrenamiento de todos los modelos cargados."""
    if metricas_globales is None:
        raise HTTPException(status_code=503, detail="Métricas no disponibles")
    return metricas_globales


# ============================================================
# GET /predict — acceso directo (sin historial real)
# ============================================================
@app.get("/predict")
async def predict(
    horas: int = Query(..., description="Horizonte en horas. Valores válidos: 24, 48, 72"),
    temp_actual: float = Query(..., description="Temperatura actual en °C"),
    humedad: float = Query(..., description="Humedad relativa en %"),
    presion: float = Query(..., description="Presión atmosférica en hPa"),
    viento: float = Query(..., description="Velocidad del viento en km/h"),
    variable: str = Query("temperatura", description="Variable a predecir: temperatura, humedad, presion, viento"),
    lat: Optional[float] = Query(None, description="Latitud de la estación"),
    lon: Optional[float] = Query(None, description="Longitud de la estación"),
) -> dict:
    """
    Predice la variable climática para las próximas `horas` horas.
    Sin historial real: los lags se aproximan con los valores actuales.
    El backend (Node.js) usará POST /predict con historial real de MySQL.
    """
    if variable not in VARIABLES_CONFIG:
        raise HTTPException(
            status_code=400,
            detail=f"variable debe ser uno de {list(VARIABLES_CONFIG.keys())}. Recibido: '{variable}'"
        )
    if paquetes_modelos.get(variable) is None:
        raise HTTPException(
            status_code=503,
            detail=f"Modelo para '{variable}' no disponible. Ejecuta train_model.py."
        )
    if horas not in HORIZONTES_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"horas debe ser uno de {HORIZONTES_VALIDOS}. Recibido: {horas}",
        )

    ahora = datetime.now()

    lags_temp    = [temp_actual] * LAG_WINDOW_TEMP
    lags_hum     = [humedad]     * LAG_WINDOW_HUM_VIENTO
    lags_viento  = [viento]      * LAG_WINDOW_HUM_VIENTO
    lags_presion = [presion]     * LAG_WINDOW_PRESION

    X = construir_features(
        temp=temp_actual, humedad=humedad, viento=viento, presion=presion,
        hora=ahora.hour, dia_semana=ahora.weekday(), mes=ahora.month,
        lags_temp=lags_temp, lags_hum=lags_hum,
        lags_viento=lags_viento, lags_presion=lags_presion,
    )

    pred_horario   = predecir_horario(X, horas, variable)
    lat_om         = lat if lat is not None else CURICO_LAT
    lon_om         = lon if lon is not None else CURICO_LON
    pred_openmeteo = await consultar_openmeteo(horas, lat_om, lon_om, ahora, variable)

    return _construir_respuesta(
        variable=variable, horas=horas, pred_horario=pred_horario,
        pred_openmeteo=pred_openmeteo, ahora=ahora, lat_om=lat_om, lon_om=lon_om,
        inputs={
            "temp_actual": temp_actual, "humedad": humedad,
            "presion": presion, "viento": viento,
        },
    )


# ============================================================
# MODELOS PYDANTIC (para POST /predict)
# ============================================================
class LecturaHistorial(BaseModel):
    """Una lectura histórica para los lags del modelo."""
    temperatura:      float
    humedad:          float
    velocidad_viento: float
    presion:          Optional[float] = None


class PredictRequest(BaseModel):
    """
    Cuerpo del POST /predict — utilizado por el proxy Node.js.
    Acepta el historial real de la estación desde MySQL.
    """
    horas:       int   = Field(..., description="Horizonte: 24, 48 o 72")
    temp_actual: float = Field(..., description="Temperatura actual en °C")
    humedad:     float = Field(..., description="Humedad relativa en %")
    presion:     float = Field(..., description="Presión atmosférica en hPa")
    viento:      float = Field(..., description="Velocidad del viento en km/h")
    variable:    str   = Field("temperatura", description="Variable a predecir")
    lat:         Optional[float] = Field(None)
    lon:         Optional[float] = Field(None)
    historial:   Optional[list[LecturaHistorial]] = Field(
        None,
        description=(
            "Últimas lecturas históricas, de más reciente (T-1h) a más antigua (T-24h). "
            "Se necesitan hasta 24 entradas para activar lag_24h."
        ),
    )


# ============================================================
# POST /predict — usado por el proxy Node.js con historial real
# ============================================================
@app.post("/predict")
async def predict_post(body: PredictRequest) -> dict:
    """
    Predice la variable climática usando el historial real de lecturas.
    Llamado por el proxy Node.js que lee las últimas lecturas de MySQL.
    """
    if body.variable not in VARIABLES_CONFIG:
        raise HTTPException(
            status_code=400,
            detail=f"variable debe ser uno de {list(VARIABLES_CONFIG.keys())}. Recibido: '{body.variable}'"
        )
    if paquetes_modelos.get(body.variable) is None:
        raise HTTPException(
            status_code=503,
            detail=f"Modelo para '{body.variable}' no disponible. Ejecuta train_model.py."
        )
    if body.horas not in HORIZONTES_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"horas debe ser uno de {HORIZONTES_VALIDOS}. Recibido: {body.horas}",
        )

    ahora    = datetime.now()
    historial = body.historial or []
    n_hist   = len(historial)

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
        temp=body.temp_actual, humedad=body.humedad,
        viento=body.viento, presion=presion_actual,
        hora=ahora.hour, dia_semana=ahora.weekday(), mes=ahora.month,
        lags_temp=lags_temp, lags_hum=lags_hum,
        lags_viento=lags_viento, lags_presion=lags_presion,
    )

    pred_horario   = predecir_horario(X, body.horas, body.variable)
    lat_om         = body.lat if body.lat is not None else CURICO_LAT
    lon_om         = body.lon if body.lon is not None else CURICO_LON
    pred_openmeteo = await consultar_openmeteo(body.horas, lat_om, lon_om, ahora, body.variable)

    return _construir_respuesta(
        variable=body.variable, horas=body.horas, pred_horario=pred_horario,
        pred_openmeteo=pred_openmeteo, ahora=ahora, lat_om=lat_om, lon_om=lon_om,
        inputs={
            "temp_actual": body.temp_actual, "humedad": body.humedad,
            "presion": body.presion, "viento": body.viento,
        },
        n_hist=n_hist,
    )


# ============================================================
# ENTRADA DIRECTA
# ============================================================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=5001, reload=True)
