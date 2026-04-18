import requests
from datetime import datetime
import time
import random

# Coordenadas de Curicó
LATITUD = -34.9828
LONGITUD = -71.2394

# Tus sensores
SENSORES = ['UTALCA_A4CF12', 'UTALCA_B788AA', 'UTALCA_ASDFGH']

# Endpoint ajustado: past_days=3 y forecast_days=1 para limitar la data
url = f"https://api.open-meteo.com/v1/forecast?latitude={LATITUD}&longitude={LONGITUD}&past_days=3&forecast_days=1&hourly=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m&timezone=America%2FSantiago"

response = requests.get(url)

if response.status_code == 200:
    data = response.json()
    hourly = data['hourly']
    
    # Obtener el timestamp actual para filtrar el futuro
    current_timestamp = int(time.time())
    
    print("INSERT INTO lecturas (device_id, fecha_registro, raw_timestamp, temperatura, humedad, presion_at, velocidad_viento, prediccion_temp) VALUES")
    
    values_list = []
    
    for sensor in SENSORES:
        for i in range(len(hourly['time'])):
            time_str = hourly['time'][i]
            temp = hourly['temperature_2m'][i]
            hum = hourly['relative_humidity_2m'][i]
            pres = hourly['surface_pressure'][i]
            wind = hourly['wind_speed_10m'][i]
            
            if temp is None:
                continue
                
            dt_obj = datetime.fromisoformat(time_str)
            fecha_registro = dt_obj.strftime('%Y-%m-%d %H:%M:%S')
            raw_timestamp = int(time.mktime(dt_obj.timetuple()))
            
            # EL FILTRO: Si la hora del dato es mayor a la hora actual, lo saltamos
            if raw_timestamp > current_timestamp:
                continue
            
            # Simulación de la predicción pasada (temperatura real + margen aleatorio)
            pred_temp = round(temp + random.uniform(1.0, 2.0), 2)
            
            values_list.append(f"  ('{sensor}', '{fecha_registro}', {raw_timestamp}, {temp}, {hum}, {pres}, {wind}, {pred_temp})")
    
    query_final = ",\n".join(values_list) + ";"
    print(query_final)
    
else:
    print(f"Error al conectar con la API de Open-Meteo. Código de estado: {response.status_code}")