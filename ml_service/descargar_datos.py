"""
python script para descargar_datos.py para entrenar el modelo (version v3)
  
Archivos generados en ml_service/datos/:
  openmeteo_curico_2020.csv ... openmeteo_curico_2025.csv

Variables descargadas:
  - temperature_2m        → air_temperature_C
  - relative_humidity_2m  → relative_humidity_percent
  - wind_speed_10m        → wind_speed_kmh
  - surface_pressure      → presion_hPa 
"""

import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
import json
from datetime import date

import pandas as pd

# ============================================================
# CONFIGURACIÓN
# ============================================================
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATOS_DIR  = os.path.join(SCRIPT_DIR, "datos")
os.makedirs(DATOS_DIR, exist_ok=True)

# Coordenadas Curicó, Chile
LAT = -34.9853
LON = -71.2368
TIMEZONE = "America/Santiago"

# Variables a descargar (Open-Meteo API names)
VARIABLES_API = [
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "surface_pressure",
]

# Renombres para coincidir con el formato existente + nueva columna
RENOMBRES = {
    "temperature_2m":       "air_temperature_C",
    "relative_humidity_2m": "relative_humidity_percent",
    "wind_speed_10m":       "wind_speed_kmh",
    "surface_pressure":     "presion_hPa",
}

# Años a descargar
ANIOS = list(range(2020, 2026))   # 2020, 2021, 2022, 2023, 2024, 2025

# URL de la API de archivo histórico
API_URL = "https://archive-api.open-meteo.com/v1/archive"

# Segundos de espera entre descargas (para no saturar la API)
PAUSA_ENTRE_ANIOS = 2


# ============================================================
# HELPERS
# ============================================================
def construir_url(anio: int) -> str:
    """Construye la URL completa para un año dado."""
    inicio = f"{anio}-01-01"
    # Para el año actual usar hasta el día de hoy, para años pasados el 31/12
    hoy = date.today()
    if anio == hoy.year:
        fin = hoy.strftime("%Y-%m-%d")
    else:
        fin = f"{anio}-12-31"

    params = {
        "latitude":   LAT,
        "longitude":  LON,
        "start_date": inicio,
        "end_date":   fin,
        "hourly":     ",".join(VARIABLES_API),
        "timezone":   TIMEZONE,
        "wind_speed_unit": "kmh",
    }
    query = urllib.parse.urlencode(params)
    return f"{API_URL}?{query}", inicio, fin


def descargar_json(url: str, anio: int, reintentos: int = 3) -> dict:
    """Descarga el JSON de la API con reintentos automáticos."""
    for intento in range(1, reintentos + 1):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "PlataformaIoT-UTalca/2.0"}
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = resp.read()
                return json.loads(raw)
        except urllib.error.HTTPError as e:
            print(f"      HTTP {e.code}: {e.reason}")
            if e.code == 429:
                print(f"      Rate limit — esperando 30s...")
                time.sleep(30)
            elif intento < reintentos:
                print(f"      Reintento {intento}/{reintentos - 1}...")
                time.sleep(5 * intento)
            else:
                raise
        except Exception as e:
            if intento < reintentos:
                print(f"      Error: {e}. Reintento {intento}/{reintentos - 1}...")
                time.sleep(5 * intento)
            else:
                raise


def json_a_dataframe(data: dict, anio: int) -> pd.DataFrame:
    """Convierte la respuesta JSON de Open-Meteo a un DataFrame limpio."""
    hourly = data.get("hourly", {})
    tiempos = hourly.get("time", [])

    if not tiempos:
        raise ValueError(f"La API no retornó datos para {anio}")

    df = pd.DataFrame({"time_index": pd.to_datetime(tiempos)})

    for var_api, col_nombre in RENOMBRES.items():
        valores = hourly.get(var_api, [])
        if not valores:
            print(f"      AVISO: '{var_api}' no retornó datos — se rellena con NaN")
            df[col_nombre] = float("nan")
        else:
            df[col_nombre] = valores

    # Columna hour (entero 0-23)
    df["hour"] = df["time_index"].dt.hour

    # target_temp: temperatura de la siguiente hora (mantiene compatibilidad con CSVs existentes)
    df["target_temp"] = df["air_temperature_C"].shift(-1)

    # Rellenar nulos con interpolación lineal (mejor que ffill para variables continuas)
    cols_numericas = [c for c in df.columns if c != "time_index"]
    df[cols_numericas] = df[cols_numericas].interpolate(method="linear", limit_direction="both")

    # Redondear para mantener mismo formato que CSVs anteriores
    df["air_temperature_C"]       = df["air_temperature_C"].round(1)
    df["relative_humidity_percent"] = df["relative_humidity_percent"].round(0).astype(int)
    df["wind_speed_kmh"]          = df["wind_speed_kmh"].round(1)
    df["presion_hPa"]             = df["presion_hPa"].round(1)
    df["target_temp"]             = df["target_temp"].round(1)

    # Orden de columnas
    df = df[[
        "time_index",
        "air_temperature_C",
        "relative_humidity_percent",
        "wind_speed_kmh",
        "presion_hPa",
        "hour",
        "target_temp",
    ]]

    return df


def guardar_csv(df: pd.DataFrame, anio: int) -> str:
    """Guarda el DataFrame como CSV y retorna la ruta."""
    nombre = f"openmeteo_curico_{anio}.csv"
    ruta   = os.path.join(DATOS_DIR, nombre)
    df.to_csv(ruta, index=False)
    return ruta


def validar_dataframe(df: pd.DataFrame, anio: int) -> bool:
    """Verifica que el DataFrame tenga datos plausibles."""
    ok = True

    nulos = df.isnull().sum().sum()
    if nulos > 0:
        print(f"      AVISO: {nulos} valores nulos encontrados")
        ok = False

    temp_min = df["air_temperature_C"].min()
    temp_max = df["air_temperature_C"].max()
    if not (-10 <= temp_min <= 45 and -10 <= temp_max <= 45):
        print(f"      AVISO: temperaturas fuera de rango esperado ({temp_min}°C–{temp_max}°C)")
        ok = False

    pres_min = df["presion_hPa"].min()
    pres_max = df["presion_hPa"].max()
    if not (900 <= pres_min <= 1050 and 900 <= pres_max <= 1050):
        print(f"      AVISO: presión fuera de rango esperado ({pres_min}–{pres_max} hPa)")
        ok = False

    return ok


# ============================================================
# MAIN
# ============================================================
def main():
    print("\n" + "=" * 60)
    print("  DESCARGA OPEN-METEO HISTORICAL ARCHIVE — CURICO, CHILE")
    print("=" * 60)
    print(f"\n  Coordenadas : {LAT}, {LON}")
    print(f"  Variables   : {', '.join(VARIABLES_API)}")
    print(f"  Anos        : {ANIOS[0]}–{ANIOS[-1]}")
    print(f"  Destino     : {DATOS_DIR}")
    print()

    resultados = []

    for anio in ANIOS:
        print(f"  [{anio}] Descargando...")

        # Verificar si ya existe y preguntar si sobreescribir
        ruta_existente = os.path.join(DATOS_DIR, f"openmeteo_curico_{anio}.csv")
        if os.path.exists(ruta_existente):
            tam_kb = os.path.getsize(ruta_existente) / 1024
            print(f"      Archivo existente: {ruta_existente} ({tam_kb:.0f} KB)")
            resp = input(f"      Sobreescribir {anio}? [s/N]: ").strip().lower()
            if resp != "s":
                print(f"      Omitido.")
                resultados.append((anio, "omitido", 0, ruta_existente))
                continue

        try:
            url, fecha_inicio, fecha_fin = construir_url(anio)
            print(f"      Periodo : {fecha_inicio} → {fecha_fin}")

            data = descargar_json(url, anio)
            df   = json_a_dataframe(data, anio)

            valido = validar_dataframe(df, anio)
            ruta   = guardar_csv(df, anio)
            tam_kb = os.path.getsize(ruta) / 1024

            print(f"      Registros : {len(df):,} horas")
            print(f"      Temp      : {df['air_temperature_C'].min():.1f}°C – {df['air_temperature_C'].max():.1f}°C")
            print(f"      Presion   : {df['presion_hPa'].min():.0f} – {df['presion_hPa'].max():.0f} hPa")
            print(f"      Guardado  : {ruta} ({tam_kb:.0f} KB)")
            print(f"      Estado    : {'OK' if valido else 'OK con avisos'}")

            resultados.append((anio, "ok" if valido else "avisos", len(df), ruta))

        except Exception as e:
            print(f"      ERROR: {e}")
            resultados.append((anio, "error", 0, "—"))

        if anio != ANIOS[-1]:
            time.sleep(PAUSA_ENTRE_ANIOS)

    # Resumen final
    print("\n" + "=" * 60)
    print("  RESUMEN")
    print("=" * 60)
    total_registros = 0
    for anio, estado, n, ruta in resultados:
        icono = "OK" if estado == "ok" else ("--" if estado == "omitido" else ("!!" if estado == "avisos" else "XX"))
        print(f"  [{icono}] {anio}: {n:>6,} registros  {os.path.basename(ruta)}")
        total_registros += n

    print(f"\n  Total registros descargados: {total_registros:,}")
    print(f"\n  Siguiente paso:")
    print(f"  Actualiza COLUMNAS_REQUERIDAS en train_model.py para incluir")
    print(f"  'presion_hPa' y re-entrena con: python train_model.py\n")


if __name__ == "__main__":
    main()
