import json
import time
import os
from datetime import datetime
import paho.mqtt.client as mqtt
import mysql.connector

# --- CONFIGURACIÓN ---
# 1. Datos MQTT (Tu Broker)
MQTT_BROKER = "192.168.1.93" 
MQTT_PORT = 1883
MQTT_TOPIC = "datos"

# 2. Datos MySQL (Tu Base de Datos Local o en Docker)
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'millahue343'),
    'database': os.getenv('DB_NAME', 'plataformaiot')
}

# --- FUNCIONES ---

def guardar_en_bd(data):
    """
    Recibe el diccionario JSON (v2.1), asegura que el dispositivo exista e inserta la lectura.
    Compatible con JSON v2.1 (subobjeto 'gases') y versiones anteriores (sin gases).
    """
    connection = None
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()

        # 1. Extraer datos del JSON
        device_id = data['id']
        raw_ts = data['timestamp']

        # Convertir timestamp Unix a formato Fecha MySQL
        fecha_legible = datetime.fromtimestamp(raw_ts).strftime('%Y-%m-%d %H:%M:%S')

        # Extraer el objeto anidado "datos"
        valores = data['datos']
        temp   = valores.get('temperatura')
        hum    = valores.get('humedad')
        pres   = valores.get('presionAT')
        viento = valores.get('velocidadViento')
        pred   = valores.get('prediccionTemp')

        # Extraer subobjeto "gases" (JSON v2.1 — dict vacío si no viene)
        gases      = valores.get('gases', {})
        gas_co2    = gases.get('co2')
        gas_nh3    = gases.get('nh3')
        gas_alcohol = gases.get('alcohol')
        gas_humo   = gases.get('humo')
        gas_benceno = gases.get('benceno')
        gas_acetona = gases.get('acetona')

        # ==============================================================================
        # AUTO-REGISTRO DEL DISPOSITIVO (Auto-Provisioning)
        # Crea el dispositivo si no existe; si ya existe, actualiza ultima_conexion.
        # ==============================================================================
        sql_device = """
            INSERT INTO dispositivos (device_id, modelo, estado, ultima_conexion, created_at)
            VALUES (%s, 'ZY-ESP32', 'disponible', %s, NOW())
            ON DUPLICATE KEY UPDATE ultima_conexion = VALUES(ultima_conexion)
        """
        cursor.execute(sql_device, (device_id, fecha_legible))

        # ==============================================================================
        # INSERTAR LECTURA con los 6 campos de gases (NULL si el JSON no los trae)
        # ==============================================================================
        sql_lectura = """
            INSERT INTO lecturas
              (device_id, fecha_registro, raw_timestamp,
               temperatura, humedad, presion_at, velocidad_viento, prediccion_temp,
               gas_co2, gas_nh3, gas_alcohol, gas_humo, gas_benceno, gas_acetona)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        val_lectura = (
            device_id, fecha_legible, raw_ts,
            temp, hum, pres, viento, pred,
            gas_co2, gas_nh3, gas_alcohol, gas_humo, gas_benceno, gas_acetona
        )

        cursor.execute(sql_lectura, val_lectura)
        connection.commit()

        gases_str = f"CO2={gas_co2}" if gas_co2 is not None else "sin gases"
        print(f"✅ [{device_id}] Dato guardado: {fecha_legible} | Temp: {temp}°C | {gases_str}")

    except mysql.connector.Error as err:
        print(f"❌ Error SQL: {err}")
    except KeyError as e:
        print(f"⚠️ Error de Formato JSON: Falta la clave {e}")
    except Exception as e:
        print(f"❌ Error General: {e}")
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("📡 Conectado al Broker MQTT!")
        client.subscribe(MQTT_TOPIC)
    else:
        print(f"Falló la conexión, código: {rc}")

def on_message(client, userdata, msg):
    try:
        payload = msg.payload.decode('utf-8')
        print(f"\n📩 Recibido: {payload}")
        data_json = json.loads(payload)
        guardar_en_bd(data_json)
    except json.JSONDecodeError:
        print("⚠️ El mensaje recibido no es un JSON válido")

# --- EJECUCIÓN PRINCIPAL ---
client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

print(f"Iniciando puente MQTT ({MQTT_BROKER}) -> MySQL...")
print("Presiona CTRL+C para detener.")

try:
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_forever()
except KeyboardInterrupt:
    print("\n🛑 Puente detenido por el usuario.")
    client.disconnect()