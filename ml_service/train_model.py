"""
============================================================
  ENTRENAMIENTO MODELO XGBOOST — PREDICCIÓN METEOROLÓGICA
  Plataforma IoT - Estaciones Meteorológicas Curicó/Maule
============================================================

Este script entrena 3 modelos XGBoost independientes para predecir
la temperatura a horizontes de 24h, 48h y 72h, utilizando datos
históricos de Open-Meteo para la zona de Curicó, Chile.

Datasets: 2023 + 2024 (combinados = ~17,500 registros horarios)
Features: 42 columnas (6 actuales + 36 time-lag de 12h)
Output:   modelo_xgboost.pkl + metricas.json

Autor: Erik Soza — Universidad de Talca
Proyecto: Memoria Universitaria - Red IoT Meteorológica
"""

import os
import sys
import json
import warnings
from datetime import datetime

import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Intentar importar XGBoost; si no está, usar HistGradientBoosting de sklearn
try:
    from xgboost import XGBRegressor
    USE_XGBOOST = True
except ImportError:
    from sklearn.ensemble import HistGradientBoostingRegressor
    USE_XGBOOST = False

warnings.filterwarnings('ignore')

# ============================================================
# SECCIÓN 1 — RUTAS ABSOLUTAS
# ============================================================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATOS_DIR = os.path.join(SCRIPT_DIR, "datos")
MODELOS_DIR = os.path.join(SCRIPT_DIR, "modelos")

# Archivos de entrada (ambos datasets)
CSV_2023 = os.path.join(DATOS_DIR, "openmeteo_curico_2023.csv")
CSV_2024 = os.path.join(DATOS_DIR, "openmeteo_curico_2024.csv")

# Archivos de salida
MODELO_PATH = os.path.join(MODELOS_DIR, "modelo_xgboost.pkl")
METRICAS_PATH = os.path.join(MODELOS_DIR, "metricas.json")

# Crear carpeta de modelos si no existe
os.makedirs(MODELOS_DIR, exist_ok=True)

# Columnas requeridas del CSV
COLUMNAS_REQUERIDAS = [
    'time_index',
    'air_temperature_C',
    'relative_humidity_percent',
    'wind_speed_kmh',
    'hour'
]

# Horizontes de predicción (en horas)
HORIZONTES = [24, 48, 72]

# Ventana de time-lag (en horas)
LAG_WINDOW = 12

# Proporción train/test
TEST_SIZE = 0.20


def print_header():
    print("\n" + "=" * 60)
    print("  ENTRENAMIENTO MODELO XGBOOST — PREDICCIÓN METEOROLÓGICA")
    print("=" * 60)


# ============================================================
# SECCIÓN 2 — CARGA DEL DATASET
# ============================================================
def cargar_datasets():
    """Carga y combina los CSVs de 2023 y 2024."""
    print("\n📂 Cargando datasets...")

    dfs = []
    for csv_path, year in [(CSV_2023, "2023"), (CSV_2024, "2024")]:
        if not os.path.exists(csv_path):
            print(f"   ⚠️  Archivo {year} no encontrado: {csv_path}")
            print(f"       Continuando sin datos de {year}...")
            continue

        df = pd.read_csv(csv_path)
        print(f"   ✅ {year}: {len(df)} registros cargados")

        # Verificar columnas
        faltantes = [c for c in COLUMNAS_REQUERIDAS if c not in df.columns]
        if faltantes:
            print(f"   ❌ Columnas faltantes en {year}: {faltantes}")
            sys.exit(1)

        dfs.append(df)

    if not dfs:
        print("   ❌ No se encontró ningún archivo CSV.")
        sys.exit(1)

    # Combinar datasets
    df = pd.concat(dfs, ignore_index=True)
    print(f"\n   Columnas detectadas : {list(df.columns)}")
    print(f"   Total de registros  : {len(df)}")
    print(f"   Rango temporal      : {df['time_index'].iloc[0]} → {df['time_index'].iloc[-1]}")

    return df


# ============================================================
# SECCIÓN 3 — LIMPIEZA
# ============================================================
def limpiar_datos(df):
    """Convierte tipos, ordena cronológicamente, rellena nulos."""
    print("\n🧹 Limpiando datos...")

    nulos_antes = df.isnull().sum().sum()

    # Convertir time_index a datetime
    df['time_index'] = pd.to_datetime(df['time_index'])

    # Ordenar cronológicamente (obligatorio en series temporales)
    df = df.sort_values('time_index').reset_index(drop=True)

    # Rellenar nulos con forward-fill + backward-fill (mismo que Edge Impulse)
    df = df.ffill().bfill()

    nulos_despues = df.isnull().sum().sum()
    print(f"   Valores nulos corregidos: {nulos_antes} → {nulos_despues}")
    print(f"   Registros tras limpieza : {len(df)}")

    return df


# ============================================================
# SECCIÓN 4 — FEATURE ENGINEERING (TIME-LAG)
# ============================================================
def generar_features(df):
    """
    Genera features con time-lag y targets para cada horizonte.

    Features creados (42 total):
    - 6 valores actuales: temp, humedad, viento, hora, día_semana, mes
    - 36 valores históricos: 12h × 3 variables (temp, humedad, viento)

    Targets:
    - target_24h: temperatura 24 horas adelante
    - target_48h: temperatura 48 horas adelante
    - target_72h: temperatura 72 horas adelante
    """
    print("\n⚙️  Generando features con time-lag...")

    # --- Features temporales adicionales ---
    df['dia_semana'] = df['time_index'].dt.dayofweek    # 0=Lunes ... 6=Domingo
    df['mes'] = df['time_index'].dt.month               # 1-12

    # --- Time-lag features (ventana de 12 horas) ---
    variables_lag = {
        'air_temperature_C': 'temp',
        'relative_humidity_percent': 'hum',
        'wind_speed_kmh': 'viento'
    }

    for col_original, prefijo in variables_lag.items():
        for lag in range(1, LAG_WINDOW + 1):
            df[f'{prefijo}_lag_{lag}h'] = df[col_original].shift(lag)

    # --- Targets: temperatura N horas hacia adelante ---
    for h in HORIZONTES:
        df[f'target_{h}h'] = df['air_temperature_C'].shift(-h)

    # --- Eliminar filas incompletas ---
    registros_antes = len(df)
    df = df.dropna().reset_index(drop=True)
    registros_despues = len(df)

    print(f"   Filas eliminadas (bordes): {registros_antes - registros_despues}")
    print(f"   Registros válidos p/ entrenar: {registros_despues}")

    return df


# ============================================================
# SECCIÓN 5 — DEFINICIÓN DE FEATURES
# ============================================================
def obtener_features():
    """
    Retorna la lista de 42 columnas que el modelo recibe como entrada.

    6 valores actuales:
      - air_temperature_C, relative_humidity_percent, wind_speed_kmh
      - hour, dia_semana, mes

    36 valores históricos (12h × 3 variables):
      - temp_lag_1h ... temp_lag_12h
      - hum_lag_1h ... hum_lag_12h
      - viento_lag_1h ... viento_lag_12h
    """
    features = [
        'air_temperature_C',
        'relative_humidity_percent',
        'wind_speed_kmh',
        'hour',
        'dia_semana',
        'mes'
    ]

    for prefijo in ['temp', 'hum', 'viento']:
        for lag in range(1, LAG_WINDOW + 1):
            features.append(f'{prefijo}_lag_{lag}h')

    return features


# ============================================================
# SECCIÓN 6 — ENTRENAMIENTO
# ============================================================
def entrenar_modelos(df):
    """
    Entrena 3 modelos XGBoost independientes (24h, 48h, 72h).

    - Split 80/20 con shuffle=False (series temporales)
    - XGBRegressor con hiperparámetros ajustados para meteorología
    - Métricas: MAE, RMSE, R²
    """
    print("\n🤖 Entrenando modelos...")
    if USE_XGBOOST:
        print("   Motor: XGBRegressor (XGBoost)")
    else:
        print("   Motor: HistGradientBoostingRegressor (sklearn)")
        print("   ℹ️  Para usar XGBoost: pip install xgboost")

    feature_names = obtener_features()
    X = df[feature_names]

    modelos = {}
    metricas = {}

    for h in HORIZONTES:
        target_col = f'target_{h}h'
        y = df[target_col]

        # Split temporal: 80% train (cronológicamente primero), 20% test (último)
        split_idx = int(len(X) * (1 - TEST_SIZE))
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

        # Crear modelo según disponibilidad
        if USE_XGBOOST:
            modelo = XGBRegressor(
                n_estimators=500,
                max_depth=6,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                min_child_weight=5,
                reg_alpha=0.1,
                reg_lambda=1.0,
                random_state=42,
                n_jobs=-1,
                verbosity=0
            )
            modelo.fit(
                X_train, y_train,
                eval_set=[(X_test, y_test)],
                verbose=False
            )
        else:
            modelo = HistGradientBoostingRegressor(
                max_iter=500,
                max_depth=6,
                learning_rate=0.05,
                min_samples_leaf=5,
                l2_regularization=1.0,
                random_state=42,
                validation_fraction=0.1,
                n_iter_no_change=20,
                early_stopping=True
            )
            modelo.fit(X_train, y_train)

        # Predecir y evaluar
        y_pred = modelo.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)

        # Clasificar rendimiento
        if r2 >= 0.90:
            nivel = "🟢 Excelente"
        elif r2 >= 0.85:
            nivel = "🟡 Bueno"
        elif r2 >= 0.75:
            nivel = "🟠 Aceptable"
        else:
            nivel = "🔴 Revisar"

        modelos[f'modelo_{h}h'] = modelo
        metricas[f'modelo_{h}h'] = {
            'horizonte_horas': h,
            'mae_celsius': round(mae, 4),
            'rmse_celsius': round(rmse, 4),
            'r2_score': round(r2, 4),
            'nivel': nivel.split(' ')[1],  # Solo texto sin emoji
            'train_size': len(X_train),
            'test_size': len(X_test)
        }

        print(f"\n   ✅ Modelo {h}h  ({nivel})")
        print(f"      MAE  = {mae:.2f} °C")
        print(f"      RMSE = {rmse:.2f} °C")
        print(f"      R²   = {r2:.4f}")
        print(f"      Train: {len(X_train)} | Test: {len(X_test)}")

    return modelos, metricas


# ============================================================
# SECCIÓN 7 — GUARDADO
# ============================================================
def guardar_resultados(modelos, metricas, feature_names):
    """Guarda modelos en .pkl y métricas en .json."""
    print("\n💾 Guardando resultados...")

    # Guardar modelos con joblib
    paquete = {
        'modelos': modelos,
        'feature_names': feature_names,
        'horizontes': HORIZONTES,
        'lag_window': LAG_WINDOW,
        'version': '1.0.0',
        'fecha_entrenamiento': datetime.now().isoformat(),
        'descripcion': 'Modelos XGBoost para predicción de temperatura a 24h, 48h y 72h - Curicó, Chile'
    }
    joblib.dump(paquete, MODELO_PATH)
    modelo_size = os.path.getsize(MODELO_PATH) / (1024 * 1024)
    print(f"   📦 Modelo guardado: {MODELO_PATH}")
    print(f"      Tamaño: {modelo_size:.2f} MB")

    # Guardar métricas
    metricas_completas = {
        'proyecto': 'Plataforma IoT - Estaciones Meteorológicas',
        'ubicacion': 'Curicó, Región del Maule, Chile',
        'dataset': {
            'fuente': 'Open-Meteo Historical Weather API',
            'años': ['2023', '2024'],
            'total_registros_originales': 17541,
            'registros_usados_entrenamiento': sum(m['train_size'] + m['test_size'] for m in metricas.values()) // len(metricas),
            'variables_entrada': 42,
            'ventana_lag': f'{LAG_WINDOW} horas',
            'split': f'{int((1-TEST_SIZE)*100)}% train / {int(TEST_SIZE*100)}% test (temporal, sin shuffle)'
        },
        'algoritmo': {
            'nombre': 'XGBRegressor (XGBoost)' if USE_XGBOOST else 'HistGradientBoostingRegressor (sklearn)',
            'version': 'xgboost >= 2.0' if USE_XGBOOST else 'sklearn >= 1.3',
            'nota': 'Ambos motores son gradient boosted trees con rendimiento comparable' if not USE_XGBOOST else None,
            'hiperparametros': {
                'n_estimators': 500,
                'max_depth': 6,
                'learning_rate': 0.05,
                'subsample': 0.8,
                'colsample_bytree': 0.8,
                'min_child_weight': 5,
            }
        },
        'resultados': metricas,
        'fecha_entrenamiento': datetime.now().isoformat(),
        'notas': [
            'MAE esperable que aumente con el horizonte temporal (comportamiento natural)',
            'R² de referencia: TinyML en Edge Impulse alcanzó 0.96 para horizonte de 1h',
            'Sensores AHT20/BMP280 tienen ±0.5°C de error propio',
            'Modelos entrenados con datos de Open-Meteo como proxy de sensores reales'
        ]
    }

    with open(METRICAS_PATH, 'w', encoding='utf-8') as f:
        json.dump(metricas_completas, f, indent=2, ensure_ascii=False)
    print(f"   📊 Métricas guardadas: {METRICAS_PATH}")


# ============================================================
# MAIN
# ============================================================
def main():
    print_header()

    # Paso 1: Cargar datos
    df = cargar_datasets()

    # Paso 2: Limpiar
    df = limpiar_datos(df)

    # Paso 3: Feature engineering
    df = generar_features(df)

    # Paso 4: Obtener lista de features
    feature_names = obtener_features()
    print(f"\n   Features totales: {len(feature_names)}")

    # Paso 5: Entrenar
    modelos, metricas = entrenar_modelos(df)

    # Paso 6: Guardar
    guardar_resultados(modelos, metricas, feature_names)

    # Resumen final
    print("\n" + "=" * 60)
    print("  🎉 ENTRENAMIENTO COMPLETADO EXITOSAMENTE")
    print("=" * 60)
    print(f"\n   Archivos generados:")
    print(f"   • {MODELO_PATH}")
    print(f"   • {METRICAS_PATH}")
    print(f"\n   Siguiente paso: Crear microservicio FastAPI (Paso 2)")
    print(f"   → El archivo modelo_xgboost.pkl será cargado por app.py\n")


if __name__ == '__main__':
    main()