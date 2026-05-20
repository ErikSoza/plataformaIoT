"""
============================================================
  ENTRENAMIENTO XGBOOST v5 — PREDICCIÓN METEOROLÓGICA MULTI-VARIABLE
  Plataforma IoT - Estaciones Meteorológicas Curicó/Maule
============================================================

Mejoras v5 sobre v4:
  - Multi-variable: entrena modelos para temperatura, humedad,
    presión atmosférica y velocidad del viento.
  - Un .pkl independiente por variable (backward compatible con v4).
  - metricas.json unificado con resultados de las 4 variables.
  - La arquitectura de temperatura (72 modelos Direct Multi-Step,
    80 features, hiperparámetros XGBoost) no cambia en absoluto.

Features v5 (80 total, idénticas a v4):
  [A]  4  actuales:       temp, humedad, viento, presion
  [B]  5  cíclicos:       hour_sin/cos, mes_sin/cos, dia_semana
  [C] 24  lags temp:      T-1h … T-24h
  [D] 12  lags humedad:   T-1h … T-12h
  [E] 12  lags viento:    T-1h … T-12h
  [F] 12  lags presión:   T-1h … T-12h
  [G]  4  deltas temp:    Δ1h, Δ3h, Δ6h, Δ24h
  [H]  4  deltas presión: Δ1h, Δ3h, Δ6h, Δ12h
  [I]  3  rolling temp:   mean_6h, mean_12h, std_6h
  Total: 4+5+24+12+12+12+4+4+3 = 80

Modelos generados (288 en total):
  modelo_xgboost.pkl  → temperatura (backward compatible con v4)
  modelo_humedad.pkl  → humedad relativa
  modelo_presion.pkl  → presión atmosférica
  modelo_viento.pkl   → velocidad del viento

Autor: Erik Soza — Universidad de Talca
Proyecto: Memoria Universitaria - Red IoT Meteorológica
"""

import os
import sys
import glob
import json
import time
import warnings
from datetime import datetime

import numpy as np
import pandas as pd
import joblib
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

try:
    from xgboost import XGBRegressor
    USE_XGBOOST = True
except ImportError:
    from sklearn.ensemble import HistGradientBoostingRegressor
    USE_XGBOOST = False

warnings.filterwarnings('ignore')

# ============================================================
# SECCIÓN 1 — RUTAS
# ============================================================
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
DATOS_DIR   = os.path.join(SCRIPT_DIR, "datos")
MODELOS_DIR = os.path.join(SCRIPT_DIR, "modelos")

METRICAS_PATH = os.path.join(MODELOS_DIR, "metricas.json")

os.makedirs(MODELOS_DIR, exist_ok=True)

# Columnas mínimas que debe tener cada CSV
COLUMNAS_REQUERIDAS = [
    'time_index',
    'air_temperature_C',
    'relative_humidity_percent',
    'wind_speed_kmh',
    'hour',
]
# Presión: columna opcional (se rellena con media climatológica si falta)
PRESION_CURICO_MEDIA = 993.0   # hPa — media histórica de Curicó a 225 msnm

HORIZONTES = list(range(1, 73))   # 72 modelos: T+1h … T+72h (Direct Multi-Step)

# Ventanas de lag por variable
LAG_WINDOW_TEMP       = 24   # captura "misma hora de ayer"
LAG_WINDOW_HUM_VIENTO = 12
LAG_WINDOW_PRESION    = 12   # 12h de historial de presión

# Split temporal
TEST_SIZE = 0.20   # último 20% para evaluación final
VAL_SIZE  = 0.10   # 10% previo al test para early stopping

# ============================================================
# VARIABLES A PREDECIR — Configuración multi-variable v5
#
# Cada variable usa las mismas 80 features de entrada.
# Solo cambia la columna objetivo (target) durante el entrenamiento.
# pkl es el nombre de archivo donde se guardan los 72 modelos de esa variable.
# ============================================================
VARIABLES_CONFIG = {
    'temperatura': {
        'col':    'air_temperature_C',
        'nombre': 'Temperatura',
        'unidad': '°C',
        'pkl':    os.path.join(MODELOS_DIR, 'modelo_xgboost.pkl'),   # nombre v4 → backward compat
    },
    'humedad': {
        'col':    'relative_humidity_percent',
        'nombre': 'Humedad Relativa',
        'unidad': '%',
        'pkl':    os.path.join(MODELOS_DIR, 'modelo_humedad.pkl'),
    },
    'presion': {
        'col':    'presion_hPa',
        'nombre': 'Presión Atmosférica',
        'unidad': 'hPa',
        'pkl':    os.path.join(MODELOS_DIR, 'modelo_presion.pkl'),
    },
    'viento': {
        'col':    'wind_speed_kmh',
        'nombre': 'Velocidad del Viento',
        'unidad': 'km/h',
        'pkl':    os.path.join(MODELOS_DIR, 'modelo_viento.pkl'),
    },
}


def print_header():
    print("\n" + "=" * 60)
    print("  ENTRENAMIENTO XGBOOST v5 — MULTI-VARIABLE")
    print("  4 variables × 72 horizontes = 288 modelos")
    print("=" * 60)


# ============================================================
# SECCIÓN 2 — CARGA AUTOMÁTICA DE TODOS LOS CSVs
# ============================================================
def cargar_datasets() -> pd.DataFrame:
    """
    Auto-descubre todos los openmeteo_curico_YYYY.csv en datos/
    y los combina en orden cronológico.
    """
    print("\n[1/5] Cargando datasets...")

    patron  = os.path.join(DATOS_DIR, "openmeteo_curico_*.csv")
    archivos = sorted(glob.glob(patron))

    if not archivos:
        print(f"  ERROR: No se encontraron CSVs en {DATOS_DIR}")
        print(f"  Ejecuta primero: python descargar_datos.py")
        sys.exit(1)

    print(f"  Archivos encontrados: {len(archivos)}")

    dfs = []
    for ruta in archivos:
        nombre = os.path.basename(ruta)
        df = pd.read_csv(ruta)

        faltantes = [c for c in COLUMNAS_REQUERIDAS if c not in df.columns]
        if faltantes:
            print(f"  ERROR en {nombre}: columnas faltantes {faltantes}")
            sys.exit(1)

        if 'presion_hPa' not in df.columns:
            print(f"  AVISO {nombre}: sin presion_hPa — relleno con {PRESION_CURICO_MEDIA} hPa")
            df['presion_hPa'] = PRESION_CURICO_MEDIA

        print(f"  {nombre}: {len(df):>6,} registros  "
              f"[{df['time_index'].iloc[0]} ... {df['time_index'].iloc[-1]}]")
        dfs.append(df)

    df_total = pd.concat(dfs, ignore_index=True)
    print(f"\n  Total combinado : {len(df_total):,} registros")
    return df_total


# ============================================================
# SECCIÓN 3 — LIMPIEZA
# ============================================================
def limpiar_datos(df: pd.DataFrame) -> pd.DataFrame:
    print("\n[2/5] Limpiando datos...")

    nulos_antes = df.isnull().sum().sum()
    df['time_index'] = pd.to_datetime(df['time_index'])
    df = df.sort_values('time_index').reset_index(drop=True)

    duplicados = df.duplicated(subset=['time_index']).sum()
    if duplicados:
        df = df.drop_duplicates(subset=['time_index']).reset_index(drop=True)
        print(f"  Duplicados eliminados: {duplicados}")

    df = df.ffill().bfill()
    nulos_despues = df.isnull().sum().sum()
    print(f"  Nulos: {nulos_antes} -> {nulos_despues}")
    print(f"  Registros tras limpieza: {len(df):,}")
    return df


# ============================================================
# SECCIÓN 4 — FEATURE ENGINEERING v5
# ============================================================
def generar_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Genera las 80 features (idénticas a v4) más los targets para las
    4 variables climáticas. Los targets se generan para todos los
    horizontes ANTES de dropna, así cada variable queda alineada.

    Las features NO cambian entre variables — el mismo vector de 80
    posiciones sirve para predecir temperatura, humedad, presión y viento.
    XGBoost aprende qué features importan para cada objetivo.
    """
    print("\n[3/5] Generando features v5 (80 variables, targets × 4 variables)...")

    # [B] Codificación cíclica
    df['hour_sin']   = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos']   = np.cos(2 * np.pi * df['hour'] / 24)
    mes = df['time_index'].dt.month
    df['mes_sin']    = np.sin(2 * np.pi * mes / 12)
    df['mes_cos']    = np.cos(2 * np.pi * mes / 12)
    df['dia_semana'] = df['time_index'].dt.dayofweek

    # [C] Lags temperatura 1-24h
    for lag in range(1, LAG_WINDOW_TEMP + 1):
        df[f'temp_lag_{lag}h'] = df['air_temperature_C'].shift(lag)

    # [D] Lags humedad 1-12h
    for lag in range(1, LAG_WINDOW_HUM_VIENTO + 1):
        df[f'hum_lag_{lag}h'] = df['relative_humidity_percent'].shift(lag)

    # [E] Lags viento 1-12h
    for lag in range(1, LAG_WINDOW_HUM_VIENTO + 1):
        df[f'viento_lag_{lag}h'] = df['wind_speed_kmh'].shift(lag)

    # [F] Lags presión 1-12h
    for lag in range(1, LAG_WINDOW_PRESION + 1):
        df[f'presion_lag_{lag}h'] = df['presion_hPa'].shift(lag)

    # [G] Deltas temperatura
    df['temp_delta_1h']  = df['air_temperature_C'] - df['air_temperature_C'].shift(1)
    df['temp_delta_3h']  = df['air_temperature_C'] - df['air_temperature_C'].shift(3)
    df['temp_delta_6h']  = df['air_temperature_C'] - df['air_temperature_C'].shift(6)
    df['temp_delta_24h'] = df['air_temperature_C'] - df['air_temperature_C'].shift(24)

    # [H] Deltas presión
    df['presion_delta_1h']  = df['presion_hPa'] - df['presion_hPa'].shift(1)
    df['presion_delta_3h']  = df['presion_hPa'] - df['presion_hPa'].shift(3)
    df['presion_delta_6h']  = df['presion_hPa'] - df['presion_hPa'].shift(6)
    df['presion_delta_12h'] = df['presion_hPa'] - df['presion_hPa'].shift(12)

    # [I] Estadísticas rodantes temperatura
    df['temp_mean_6h']  = df['air_temperature_C'].rolling(window=6,  min_periods=1).mean()
    df['temp_mean_12h'] = df['air_temperature_C'].rolling(window=12, min_periods=1).mean()
    df['temp_std_6h']   = df['air_temperature_C'].rolling(window=6,  min_periods=2).std().fillna(0)

    # Targets para TODAS las variables (un target por variable × horizonte)
    for var_key, var_cfg in VARIABLES_CONFIG.items():
        for h in HORIZONTES:
            df[f'target_{var_key}_{h}h'] = df[var_cfg['col']].shift(-h)

    registros_antes = len(df)
    df = df.dropna().reset_index(drop=True)
    print(f"  Filas eliminadas (bordes lag_24h + targets): {registros_antes - len(df):,}")
    print(f"  Registros válidos para entrenar: {len(df):,}")
    return df


# ============================================================
# SECCIÓN 5 — LISTA DE FEATURES (debe coincidir con app.py)
# ============================================================
def obtener_features() -> list[str]:
    """
    80 features en orden exacto. app.py construye el vector en el mismo orden.
    Cualquier cambio aquí debe replicarse en construir_features() de app.py.
    """
    features = [
        # [A] Actuales
        'air_temperature_C',
        'relative_humidity_percent',
        'wind_speed_kmh',
        'presion_hPa',
        # [B] Cíclicos
        'hour_sin', 'hour_cos',
        'mes_sin',  'mes_cos',
        'dia_semana',
    ]
    # [C] Lags temp 1-24h
    for lag in range(1, LAG_WINDOW_TEMP + 1):
        features.append(f'temp_lag_{lag}h')
    # [D] Lags humedad 1-12h
    for lag in range(1, LAG_WINDOW_HUM_VIENTO + 1):
        features.append(f'hum_lag_{lag}h')
    # [E] Lags viento 1-12h
    for lag in range(1, LAG_WINDOW_HUM_VIENTO + 1):
        features.append(f'viento_lag_{lag}h')
    # [F] Lags presión 1-12h
    for lag in range(1, LAG_WINDOW_PRESION + 1):
        features.append(f'presion_lag_{lag}h')
    # [G] Deltas temperatura
    features += ['temp_delta_1h', 'temp_delta_3h', 'temp_delta_6h', 'temp_delta_24h']
    # [H] Deltas presión
    features += ['presion_delta_1h', 'presion_delta_3h', 'presion_delta_6h', 'presion_delta_12h']
    # [I] Rolling temperatura
    features += ['temp_mean_6h', 'temp_mean_12h', 'temp_std_6h']

    assert len(features) == 80, f"Error en conteo de features: {len(features)} != 80"
    return features


# ============================================================
# SECCIÓN 6 — ENTRENAMIENTO POR VARIABLE (genérico)
# ============================================================
def entrenar_variable(
    df: pd.DataFrame,
    feature_names: list[str],
    var_key: str,
    var_cfg: dict,
    var_num: int,
    total_vars: int,
) -> tuple[dict, dict]:
    """
    Entrena 72 modelos XGBoost para una variable objetivo.

    Direct Multi-Step Forecasting: un modelo independiente por horizonte
    T+1h … T+72h. Mismos hiperparámetros que la configuración de temperatura
    de v4 (garantiza que temperatura no pierde calidad al refactorizar).
    """
    col_nombre = var_cfg['nombre']
    unidad     = var_cfg['unidad']

    print(f"\n  ▶ Variable {var_num}/{total_vars}: {col_nombre} ({unidad})")
    print(f"    Entrenando {len(HORIZONTES)} modelos — T+1h a T+{max(HORIZONTES)}h")
    if USE_XGBOOST:
        print("    Motor: XGBRegressor (XGBoost)")
    else:
        print("    Motor: HistGradientBoostingRegressor (sklearn fallback)")

    X = df[feature_names]
    n = len(X)

    test_idx = int(n * (1 - TEST_SIZE))
    val_idx  = int(n * (1 - TEST_SIZE - VAL_SIZE))

    modelos  = {}
    metricas = {}
    t_inicio_total = time.time()

    for idx, h in enumerate(HORIZONTES, start=1):
        t_inicio = time.time()
        y = df[f'target_{var_key}_{h}h']

        X_train, y_train = X.iloc[:val_idx],          y.iloc[:val_idx]
        X_val,   y_val   = X.iloc[val_idx:test_idx],  y.iloc[val_idx:test_idx]
        X_test,  y_test  = X.iloc[test_idx:],         y.iloc[test_idx:]

        if USE_XGBOOST:
            modelo = XGBRegressor(
                n_estimators=3000,
                max_depth=5,
                learning_rate=0.025,
                subsample=0.85,
                colsample_bytree=0.65,
                min_child_weight=15,
                reg_alpha=0.8,
                reg_lambda=2.5,
                gamma=0.1,
                random_state=42,
                n_jobs=-1,
                verbosity=0,
                early_stopping_rounds=100,
                eval_metric='mae',
            )
            modelo.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                verbose=False,
            )
            n_trees = modelo.best_iteration
        else:
            modelo = HistGradientBoostingRegressor(
                max_iter=3000,
                max_depth=5,
                learning_rate=0.025,
                min_samples_leaf=15,
                l2_regularization=2.5,
                random_state=42,
                validation_fraction=VAL_SIZE / (1 - TEST_SIZE),
                n_iter_no_change=100,
                early_stopping=True,
            )
            modelo.fit(X_train, y_train)
            n_trees = modelo.n_iter_

        y_pred = modelo.predict(X_test)
        mae  = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2   = r2_score(y_test, y_pred)
        t_modelo = time.time() - t_inicio

        if r2 >= 0.93:
            nivel = "Excelente"
        elif r2 >= 0.89:
            nivel = "Muy bueno"
        elif r2 >= 0.82:
            nivel = "Bueno"
        else:
            nivel = "Revisar"

        modelos[f'modelo_{h}h'] = modelo
        metricas[f'modelo_{h}h'] = {
            'horizonte_horas':     h,
            'mae_celsius':         round(mae,  4),   # MAE en la unidad nativa de la variable
            'rmse_celsius':        round(rmse, 4),   # RMSE en la unidad nativa
            'r2_score':            round(r2,   4),
            'nivel':               nivel,
            'n_estimators_usados': int(n_trees) if n_trees else 3000,
            'train_size':          len(X_train),
            'val_size':            len(X_val),
            'test_size':           len(X_test),
        }

        transcurrido  = time.time() - t_inicio_total
        restante_est  = (transcurrido / idx) * (len(HORIZONTES) - idx)
        print(
            f"    [{idx:2d}/{len(HORIZONTES)}] T+{h:2d}h | "
            f"MAE={mae:.3f}{unidad}  R2={r2:.3f}  arboles={n_trees}  "
            f"({t_modelo:.0f}s)  |  restante ~{restante_est/60:.0f}min"
        )

    t_total = time.time() - t_inicio_total
    print(f"    Tiempo total {col_nombre}: {t_total/60:.1f} minutos")
    return modelos, metricas


# ============================================================
# SECCIÓN 7 — GUARDADO POR VARIABLE
# ============================================================
def guardar_variable(
    modelos: dict,
    metricas: dict,
    feature_names: list[str],
    var_key: str,
    var_cfg: dict,
) -> None:
    """Guarda el paquete .pkl de una variable con metadatos completos."""
    pkl_path = var_cfg['pkl']

    paquete = {
        'modelos':              modelos,
        'feature_names':        feature_names,
        'horizontes':           HORIZONTES,
        'lag_window_temp':      LAG_WINDOW_TEMP,
        'lag_window_hum_viento': LAG_WINDOW_HUM_VIENTO,
        'lag_window_presion':   LAG_WINDOW_PRESION,
        'variable':             var_key,
        'variable_col':         var_cfg['col'],
        'variable_nombre':      var_cfg['nombre'],
        'variable_unidad':      var_cfg['unidad'],
        'version':              '5.0.0',
        'fecha_entrenamiento':  datetime.now().isoformat(),
        'descripcion': (
            f"XGBoost v5 — Direct Multi-Step Forecasting: 72 modelos independientes "
            f"(T+1h a T+72h) para {var_cfg['nombre']}. "
            f"80 features compartidas: presion_hPa + lags/deltas, lag_24h, "
            f"cod. ciclica, rolling stats. Curico, Chile."
        )
    }
    joblib.dump(paquete, pkl_path)
    tam = os.path.getsize(pkl_path) / (1024 * 1024)
    print(f"    Guardado → {os.path.basename(pkl_path)}  ({tam:.2f} MB)")


# ============================================================
# SECCIÓN 8 — MÉTRICAS GLOBALES UNIFICADAS
# ============================================================
def guardar_metricas_globales(
    metricas_por_variable: dict,
    feature_names: list[str],
) -> None:
    """
    Guarda metricas.json unificado con resultados de las 4 variables.

    Formato: { "resultados": { "temperatura": {...}, "humedad": {...} } }
    app.py detecta este formato y consulta metricas_globales["resultados"][variable].
    """
    print("\n  Guardando métricas globales...")

    patron     = os.path.join(DATOS_DIR, "openmeteo_curico_*.csv")
    años_usados = [
        os.path.basename(f).replace('openmeteo_curico_', '').replace('.csv', '')
        for f in sorted(glob.glob(patron))
    ]

    metricas_completas = {
        'proyecto':  'Plataforma IoT - Estaciones Meteorologicas',
        'ubicacion': 'Curico, Region del Maule, Chile',
        'version_modelo': '5.0.0',
        'dataset': {
            'fuente':              'Open-Meteo Historical Weather API',
            'años':                años_usados,
            'variables_entrada':   len(feature_names),
            'variables_prediccion': list(VARIABLES_CONFIG.keys()),
            'lag_temperatura':     f'{LAG_WINDOW_TEMP}h (incluye lag_24h)',
            'lag_hum_viento':      f'{LAG_WINDOW_HUM_VIENTO}h',
            'lag_presion':         f'{LAG_WINDOW_PRESION}h + deltas 1/3/6/12h',
            'split': '70% train / 10% val (early stopping) / 20% test',
        },
        'algoritmo': {
            'nombre': 'XGBRegressor' if USE_XGBOOST else 'HistGradientBoostingRegressor',
            'mejoras_v5': [
                'Multi-variable: temperatura, humedad, presión, viento',
                'Un .pkl por variable → carga selectiva en app.py',
                'Mismas 80 features para todas las variables',
                'Hiperparámetros idénticos a v4 (no se degrada temperatura)',
                '288 modelos totales (4 variables × 72 horizontes)',
            ],
            'hiperparametros': {
                'n_estimators_max':      3000,
                'early_stopping_rounds': 100,
                'max_depth':            5,
                'learning_rate':        0.025,
                'subsample':            0.85,
                'colsample_bytree':     0.65,
                'min_child_weight':     15,
                'reg_alpha':            0.8,
                'reg_lambda':           2.5,
                'gamma':                0.1,
            }
        },
        'resultados': metricas_por_variable,   # {var: {modelo_Xh: {...}}}
        'fecha_entrenamiento': datetime.now().isoformat(),
        'notas': [
            'mae_celsius = MAE en la unidad nativa de cada variable (°C, %, hPa, km/h)',
            'rmse_celsius = RMSE en la unidad nativa',
            'R² es adimensional — mismos umbrales para todas las variables',
            'presion_delta es el predictor meteorológico más potente para cambios abruptos',
            'lag_24h de temperatura captura el patrón diurno dominante',
        ]
    }

    with open(METRICAS_PATH, 'w', encoding='utf-8') as f:
        json.dump(metricas_completas, f, indent=2, ensure_ascii=False)
    print(f"    Métricas → {METRICAS_PATH}")


# ============================================================
# MAIN
# ============================================================
def main():
    print_header()

    df = cargar_datasets()
    df = limpiar_datos(df)
    df = generar_features(df)

    feature_names = obtener_features()
    print(f"\n  Features totales : {len(feature_names)}")
    print(f"  Lags temp        : 1h-{LAG_WINDOW_TEMP}h")
    print(f"  Lags hum/viento  : 1h-{LAG_WINDOW_HUM_VIENTO}h")
    print(f"  Lags presion     : 1h-{LAG_WINDOW_PRESION}h + deltas")
    print(f"\n  Variables a entrenar: {list(VARIABLES_CONFIG.keys())}")

    n_vars = len(VARIABLES_CONFIG)
    estim_min = n_vars * 60   # ~60 min por variable (varía por hardware)
    print(f"  Tiempo estimado total: {estim_min // 60}h {estim_min % 60}min")
    print("\n[4/5] Entrenando modelos...")

    metricas_por_variable = {}
    t_global = time.time()

    for i, (var_key, var_cfg) in enumerate(VARIABLES_CONFIG.items(), start=1):
        modelos, metricas = entrenar_variable(
            df, feature_names, var_key, var_cfg, var_num=i, total_vars=n_vars
        )
        guardar_variable(modelos, metricas, feature_names, var_key, var_cfg)
        metricas_por_variable[var_key] = metricas

    t_global_total = time.time() - t_global
    print(f"\n  ✓ Entrenamiento total: {t_global_total/60:.1f} minutos")

    print("\n[5/5] Guardando métricas globales...")
    guardar_metricas_globales(metricas_por_variable, feature_names)

    print("\n" + "=" * 60)
    print("  ENTRENAMIENTO v5 COMPLETADO")
    print(f"  {n_vars} variables × {len(HORIZONTES)} horizontes = {n_vars * len(HORIZONTES)} modelos")
    print("=" * 60)

    # Resumen de métricas clave (T+24h, T+48h, T+72h)
    print("\n  RESUMEN MÉTRICAS (horizontes clave):")
    print(f"  {'Variable':<15} {'T+24h MAE':>10} {'T+48h MAE':>10} {'T+72h MAE':>10}  {'Unidad':<6}")
    print("  " + "-" * 60)
    for var_key, var_cfg in VARIABLES_CONFIG.items():
        metr = metricas_por_variable[var_key]
        m24  = metr.get('modelo_24h', {}).get('mae_celsius', 'N/A')
        m48  = metr.get('modelo_48h', {}).get('mae_celsius', 'N/A')
        m72  = metr.get('modelo_72h', {}).get('mae_celsius', 'N/A')
        fmt  = lambda v: f"{v:.3f}" if isinstance(v, float) else str(v)
        print(f"  {var_cfg['nombre']:<15} {fmt(m24):>10} {fmt(m48):>10} {fmt(m72):>10}  {var_cfg['unidad']:<6}")

    print(f"\n  Siguiente: reiniciar app.py para cargar los nuevos modelos\n")


if __name__ == '__main__':
    main()
