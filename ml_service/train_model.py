"""
============================================================
  ENTRENAMIENTO MODELO XGBOOST v3 — PREDICCIÓN METEOROLÓGICA
  Plataforma IoT - Estaciones Meteorológicas Curicó/Maule
============================================================

Mejoras v3 sobre v2:
  - Auto-descubrimiento de todos los CSVs en datos/ (2020-2025)
    → 52,000+ registros vs 17,000 anteriores
  - presion_hPa como feature y sus lags/deltas
    → la tendencia de presión es el mejor predictor de cambio climático:
      presión bajando = frente de tormenta = temperatura cae
      presión subiendo = despejado = temperatura sube
  - 80 features en total (vs 63 en v2)

Features v3 (80 total):
  [A]  4  actuales:       temp, humedad, viento, presion
  [B]  5  cíclicos:       hour_sin/cos, mes_sin/cos, dia_semana
  [C] 24  lags temp:      T-1h … T-24h
  [D] 12  lags humedad:   T-1h … T-12h
  [E] 12  lags viento:    T-1h … T-12h
  [F] 12  lags presión:   T-1h … T-12h
  [G]  4  deltas temp:    Δ1h, Δ3h, Δ6h, Δ24h
  [H]  4  deltas presión: Δ1h, Δ3h, Δ6h, Δ12h
  [I]  3  rolling temp:   mean_6h, mean_12h, std_6h
  [J]  0  (reservado para futuras variables)
  Total: 4+5+24+12+12+12+4+4+3 = 80

Autor: Erik Soza — Universidad de Talca
Proyecto: Memoria Universitaria - Red IoT Meteorológica
"""

import os
import sys
import glob
import json
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
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATOS_DIR  = os.path.join(SCRIPT_DIR, "datos")
MODELOS_DIR = os.path.join(SCRIPT_DIR, "modelos")

MODELO_PATH   = os.path.join(MODELOS_DIR, "modelo_xgboost.pkl")
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

HORIZONTES = [24, 48, 72]

# Ventanas de lag por variable
LAG_WINDOW_TEMP    = 24   # captura "misma hora de ayer"
LAG_WINDOW_HUM_VIENTO = 12
LAG_WINDOW_PRESION = 12   # 12h de historial de presión

# Split temporal
TEST_SIZE = 0.20   # último 20% para evaluación final
VAL_SIZE  = 0.10   # 10% previo al test para early stopping


def print_header():
    print("\n" + "=" * 60)
    print("  ENTRENAMIENTO XGBOOST v3 — PREDICCION METEOROLOGICA")
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

    patron = os.path.join(DATOS_DIR, "openmeteo_curico_*.csv")
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

        # Validar columnas mínimas
        faltantes = [c for c in COLUMNAS_REQUERIDAS if c not in df.columns]
        if faltantes:
            print(f"  ERROR en {nombre}: columnas faltantes {faltantes}")
            sys.exit(1)

        # presion_hPa: agregar con media climatológica si el CSV no la tiene
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

    # Eliminar duplicados en tiempo (puede ocurrir en años bisiestos)
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
# SECCIÓN 4 — FEATURE ENGINEERING v3
# ============================================================
def generar_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Genera las 80 features en el orden definido por obtener_features().

    Grupos:
      [A] Valores actuales (temp, humedad, viento, presion)
      [B] Codificación cíclica de tiempo
      [C] Lags temperatura 1-24h
      [D] Lags humedad 1-12h
      [E] Lags viento 1-12h
      [F] Lags presión 1-12h
      [G] Deltas temperatura (tendencia de subida/bajada)
      [H] Deltas presión (tendencia → predictor de frentes)
      [I] Estadísticas rodantes de temperatura
    """
    print("\n[3/5] Generando features v3 (80 variables)...")

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

    # [G] Deltas de temperatura (¿sube o baja? y a qué velocidad)
    df['temp_delta_1h']  = df['air_temperature_C'] - df['air_temperature_C'].shift(1)
    df['temp_delta_3h']  = df['air_temperature_C'] - df['air_temperature_C'].shift(3)
    df['temp_delta_6h']  = df['air_temperature_C'] - df['air_temperature_C'].shift(6)
    df['temp_delta_24h'] = df['air_temperature_C'] - df['air_temperature_C'].shift(24)

    # [H] Deltas de presión (clave meteorológica: caída = frente, subida = despejado)
    df['presion_delta_1h']  = df['presion_hPa'] - df['presion_hPa'].shift(1)
    df['presion_delta_3h']  = df['presion_hPa'] - df['presion_hPa'].shift(3)
    df['presion_delta_6h']  = df['presion_hPa'] - df['presion_hPa'].shift(6)
    df['presion_delta_12h'] = df['presion_hPa'] - df['presion_hPa'].shift(12)

    # [I] Estadísticas rodantes de temperatura
    df['temp_mean_6h']  = df['air_temperature_C'].rolling(window=6,  min_periods=1).mean()
    df['temp_mean_12h'] = df['air_temperature_C'].rolling(window=12, min_periods=1).mean()
    df['temp_std_6h']   = df['air_temperature_C'].rolling(window=6,  min_periods=2).std().fillna(0)

    # Targets
    for h in HORIZONTES:
        df[f'target_{h}h'] = df['air_temperature_C'].shift(-h)

    registros_antes = len(df)
    df = df.dropna().reset_index(drop=True)
    print(f"  Filas eliminadas (bordes lag_24h + targets): {registros_antes - len(df):,}")
    print(f"  Registros validos para entrenar: {len(df):,}")
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

    # Verificación: 4+5+24+12+12+12+4+4+3 = 80
    assert len(features) == 80, f"Error en conteo de features: {len(features)} != 80"
    return features


# ============================================================
# SECCIÓN 6 — ENTRENAMIENTO
# ============================================================
def entrenar_modelos(df: pd.DataFrame):
    """
    Entrena 3 modelos XGBoost (24h, 48h, 72h) con split temporal:
      70% train efectivo | 10% validación (early stopping) | 20% test final
    """
    print("\n[4/5] Entrenando modelos v3...")
    if USE_XGBOOST:
        print("  Motor: XGBRegressor (XGBoost)")
    else:
        print("  Motor: HistGradientBoostingRegressor (sklearn fallback)")

    feature_names = obtener_features()
    X = df[feature_names]
    n = len(X)

    test_idx = int(n * (1 - TEST_SIZE))
    val_idx  = int(n * (1 - TEST_SIZE - VAL_SIZE))

    modelos  = {}
    metricas = {}

    for h in HORIZONTES:
        y = df[f'target_{h}h']

        X_train, y_train = X.iloc[:val_idx],    y.iloc[:val_idx]
        X_val,   y_val   = X.iloc[val_idx:test_idx], y.iloc[val_idx:test_idx]
        X_test,  y_test  = X.iloc[test_idx:],   y.iloc[test_idx:]

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
            'horizonte_horas': h,
            'mae_celsius':  round(mae, 4),
            'rmse_celsius': round(rmse, 4),
            'r2_score':     round(r2, 4),
            'nivel':        nivel,
            'n_estimators_usados': int(n_trees) if n_trees else 3000,
            'train_size': len(X_train),
            'val_size':   len(X_val),
            'test_size':  len(X_test),
        }

        print(f"\n  Modelo {h}h — {nivel}")
        print(f"    MAE  = {mae:.4f} C")
        print(f"    RMSE = {rmse:.4f} C")
        print(f"    R2   = {r2:.4f}")
        print(f"    Arboles usados : {n_trees}")
        print(f"    Train/Val/Test : {len(X_train):,}/{len(X_val):,}/{len(X_test):,}")

    return modelos, metricas


# ============================================================
# SECCIÓN 7 — GUARDADO
# ============================================================
def guardar_resultados(modelos, metricas, feature_names):
    print("\n[5/5] Guardando resultados...")

    paquete = {
        'modelos':              modelos,
        'feature_names':        feature_names,
        'horizontes':           HORIZONTES,
        'lag_window_temp':      LAG_WINDOW_TEMP,
        'lag_window_hum_viento': LAG_WINDOW_HUM_VIENTO,
        'lag_window_presion':   LAG_WINDOW_PRESION,
        'version':              '3.0.0',
        'fecha_entrenamiento':  datetime.now().isoformat(),
        'descripcion': (
            'XGBoost v3 — 80 features: presion_hPa + lags/deltas, '
            'lag_24h, cod. ciclica, rolling stats. '
            '2020-2025 (52k registros). Curico, Chile.'
        )
    }
    joblib.dump(paquete, MODELO_PATH)
    tam = os.path.getsize(MODELO_PATH) / (1024 * 1024)
    print(f"  Modelo  : {MODELO_PATH}  ({tam:.2f} MB)")

    # Contar CSVs usados
    patron = os.path.join(DATOS_DIR, "openmeteo_curico_*.csv")
    años_usados = [
        os.path.basename(f).replace('openmeteo_curico_','').replace('.csv','')
        for f in sorted(glob.glob(patron))
    ]

    metricas_completas = {
        'proyecto':  'Plataforma IoT - Estaciones Meteorologicas',
        'ubicacion': 'Curico, Region del Maule, Chile',
        'version_modelo': '3.0.0',
        'dataset': {
            'fuente':   'Open-Meteo Historical Weather API',
            'años':     años_usados,
            'variables_entrada': len(feature_names),
            'lag_temperatura':   f'{LAG_WINDOW_TEMP}h (incluye lag_24h)',
            'lag_hum_viento':    f'{LAG_WINDOW_HUM_VIENTO}h',
            'lag_presion':       f'{LAG_WINDOW_PRESION}h + deltas 1/3/6/12h',
            'split': '70% train / 10% val (early stopping) / 20% test',
        },
        'algoritmo': {
            'nombre': 'XGBRegressor' if USE_XGBOOST else 'HistGradientBoostingRegressor',
            'mejoras_v3': [
                'presion_hPa como feature: actual + 12 lags + deltas 1/3/6/12h',
                'Auto-descubrimiento de CSVs: todos los años en datos/',
                '52,000+ registros (vs 17,000 en v1)',
                '80 features totales (vs 63 en v2, 42 en v1)',
                'Regularizacion aumentada (colsample=0.65, reg_alpha=0.8, gamma=0.1)',
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
        'resultados': metricas,
        'fecha_entrenamiento': datetime.now().isoformat(),
        'notas': [
            'presion_delta es el predictor meteorologico mas potente para cambios abruptos',
            'lag_24h de temperatura captura el patron diurno dominante',
            'Con 6 años el modelo ha visto suficientes frentes, niñas y heladas atipicas',
            'MAE naturalmente mayor a mayor horizonte temporal',
            'Sensores AHT20/BMP280 tienen ±0.5C de error propio',
        ]
    }

    with open(METRICAS_PATH, 'w', encoding='utf-8') as f:
        json.dump(metricas_completas, f, indent=2, ensure_ascii=False)
    print(f"  Metricas: {METRICAS_PATH}")


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

    modelos, metricas = entrenar_modelos(df)
    guardar_resultados(modelos, metricas, feature_names)

    print("\n" + "=" * 60)
    print("  ENTRENAMIENTO v3 COMPLETADO")
    print("=" * 60)
    print(f"\n  Siguiente: reiniciar app.py para cargar el nuevo modelo\n")


if __name__ == '__main__':
    main()
