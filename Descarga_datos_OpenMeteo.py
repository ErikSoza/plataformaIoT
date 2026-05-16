import requests
from datetime import datetime
import time
import random

# Coordenadas de Curicó
LATITUD = -34.9828
LONGITUD = -71.2394

# Tus sensores
SENSORES = ['UTALCA_A4CF12', 'UTALCA_B788AA', 'UTALCA_ASDFGH']

# ── API 1: Datos meteorológicos ────────────────────────────────────────────────
url_meteo = (
    f"https://api.open-meteo.com/v1/forecast"
    f"?latitude={LATITUD}&longitude={LONGITUD}"
    f"&past_days=7&forecast_days=1"
    f"&hourly=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m"
    f"&timezone=America%2FSantiago"
)

# ── API 2: Calidad del aire ────────────────────────────────────────────────────
# Variables disponibles más cercanas a los gases del MQ135:
#   carbon_monoxide  (CO  µg/m³) → proxy acetona/VOCs
#   nitrogen_dioxide (NO₂ µg/m³) → proxy NH₃ (ambos nitrogenados)
#   ozone            (O₃  µg/m³) → proxy alcohol (oxidantes)
#   pm10             (PM10 µg/m³) → proxy humo (partículas gruesas)
#   pm2_5            (PM2.5 µg/m³) → proxy benceno (partículas finas) y CO₂
url_aqi = (
    f"https://air-quality-api.open-meteo.com/v1/air-quality"
    f"?latitude={LATITUD}&longitude={LONGITUD}"
    f"&past_days=7&forecast_days=1"
    f"&hourly=carbon_monoxide,nitrogen_dioxide,ozone,pm10,pm2_5"
    f"&timezone=America%2FSantiago"
)


def convertir_gases(co, no2, o3, pm10, pm25):
    """
    Convierte variables de Open-Meteo Air Quality a las columnas del MQ135.

    Open-Meteo entrega µg/m³; el MQ135 reporta ppm.
    Conversión a 25 °C y 1 atm: ppm = µg/m³ ÷ (peso_molecular × 40.9)
      CO  → ÷ 1163   NO₂ → ÷ 1913   O₃ → ÷ 1996

    Los factores de escala adicionales ajustan al rango típico de cada
    salida del MQ135, para que los datos sean útiles en las pruebas de UI.
    """
    def safe(val, factor):
        return round(val * factor, 2) if val is not None else None

    # CO₂ (ppm 400-800): PM2.5 es indicador de actividad humana → CO₂ sube con ella
    gas_co2 = round(420 + (pm25 or 0) * 3.0, 1) if pm25 is not None else None

    # NH₃ (ppm 1-50): NO₂ como proxy nitrogenado, escalado al rango del MQ135
    gas_nh3 = safe(no2, 1 / 1913 * 60) if no2 is not None else None

    # Alcohol (ppm 1-50): O₃ como proxy de oxidantes volátiles (VOCs)
    gas_alcohol = safe(o3, 1 / 1996 * 120) if o3 is not None else None

    # Humo (ppm 5-150): PM10 escala directamente (partículas gruesas = humo/polvo)
    gas_humo = safe(pm10, 2.0) if pm10 is not None else None

    # Benceno (ppm 1-25): PM2.5 como proxy de compuestos orgánicos finos
    gas_benceno = safe(pm25, 0.4) if pm25 is not None else None

    # Acetona (ppm 5-200): CO como proxy de compuestos carbonílicos
    gas_acetona = safe(co, 1 / 1163 * 35) if co is not None else None

    return gas_co2, gas_nh3, gas_alcohol, gas_humo, gas_benceno, gas_acetona


# ── Descargar ambas APIs ───────────────────────────────────────────────────────
resp_meteo = requests.get(url_meteo)
resp_aqi   = requests.get(url_aqi)

if resp_meteo.status_code == 200 and resp_aqi.status_code == 200:
    hourly     = resp_meteo.json()['hourly']
    hourly_aqi = resp_aqi.json()['hourly']

    # Indexar calidad del aire por timestamp para cruzar con los datos meteo
    aqi_por_tiempo = {}
    for i, t in enumerate(hourly_aqi['time']):
        aqi_por_tiempo[t] = {
            'co':   hourly_aqi['carbon_monoxide'][i],
            'no2':  hourly_aqi['nitrogen_dioxide'][i],
            'o3':   hourly_aqi['ozone'][i],
            'pm10': hourly_aqi['pm10'][i],
            'pm25': hourly_aqi['pm2_5'][i],
        }

    current_timestamp = int(time.time())

    print(
        "INSERT INTO lecturas "
        "(device_id, fecha_registro, raw_timestamp, temperatura, humedad, "
        "presion_at, velocidad_viento, prediccion_temp, "
        "gas_co2, gas_nh3, gas_alcohol, gas_humo, gas_benceno, gas_acetona) VALUES"
    )

    values_list = []

    for sensor in SENSORES:
        for i in range(len(hourly['time'])):
            time_str = hourly['time'][i]
            temp = hourly['temperature_2m'][i]
            hum  = hourly['relative_humidity_2m'][i]
            pres = hourly['surface_pressure'][i]
            wind = hourly['wind_speed_10m'][i]

            if temp is None:
                continue

            dt_obj        = datetime.fromisoformat(time_str)
            fecha_registro = dt_obj.strftime('%Y-%m-%d %H:%M:%S')
            raw_timestamp  = int(time.mktime(dt_obj.timetuple()))

            # EL FILTRO: Si la hora del dato es mayor a la hora actual, lo saltamos
            if raw_timestamp > current_timestamp:
                continue

            # Simulación de la predicción pasada (temperatura real + margen aleatorio)
            pred_temp = round(temp + random.uniform(1.0, 2.0), 2)

            # Obtener gases del índice AQI (None si no hay dato para esa hora)
            aqi = aqi_por_tiempo.get(time_str, {})
            gas_co2, gas_nh3, gas_alcohol, gas_humo, gas_benceno, gas_acetona = convertir_gases(
                aqi.get('co'),
                aqi.get('no2'),
                aqi.get('o3'),
                aqi.get('pm10'),
                aqi.get('pm25'),
            )

            def fmt(v):
                return str(v) if v is not None else 'NULL'

            values_list.append(
                f"  ('{sensor}', '{fecha_registro}', {raw_timestamp}, "
                f"{temp}, {hum}, {pres}, {wind}, {pred_temp}, "
                f"{fmt(gas_co2)}, {fmt(gas_nh3)}, {fmt(gas_alcohol)}, "
                f"{fmt(gas_humo)}, {fmt(gas_benceno)}, {fmt(gas_acetona)})"
            )

    query_final = ",\n".join(values_list) + ";"
    print(query_final)

else:
    if resp_meteo.status_code != 200:
        print(f"Error API meteorológica. Código: {resp_meteo.status_code}")
    if resp_aqi.status_code != 200:
        print(f"Error API calidad del aire. Código: {resp_aqi.status_code}")
