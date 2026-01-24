import json
import time
from datetime import datetime
import paho.mqtt.client as mqtt
import mysql.connector

# --- CONFIGURACIÓN ---
# 1. Datos MQTT (Tu Broker)
MQTT_BROKER = "192.168.1.93" 
MQTT_PORT = 1883
MQTT_TOPIC = "datos"

# 2. Datos MySQL (Tu Base de Datos Local)
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'millahue343',
    'database': 'plataformaiot'
}

# --- FUNCIONES ---

def guardar_en_bd(data):
    """
    Recibe el diccionario JSON, asegura que el dispositivo exista y luego inserta la lectura.
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
        temp = valores['temperatura']
        hum = valores['humedad']
        pres = valores['presionAT']
        viento = valores['velocidadViento']
        pred = valores['prediccionTemp']

        # ==============================================================================
        # [NUEVA LÓGICA] AUTO-REGISTRO DEL DISPOSITIVO (Auto-Provisioning)
        # ==============================================================================
        # Esta consulta hace dos cosas:
        # 1. Intenta CREAR el dispositivo si no existe.
        # 2. Si ya existe, actualiza su 'ultima_conexion' (ON DUPLICATE KEY UPDATE).
        
        sql_device = """
            INSERT INTO dispositivos (device_id, modelo, estado, ultima_conexion, created_at)
            VALUES (%s, 'Auto-Detectado', 'disponible', %s, NOW())
            ON DUPLICATE KEY UPDATE ultima_conexion = VALUES(ultima_conexion)
        """
        
        # Ejecutamos el registro/actualización del dispositivo PRIMERO
        cursor.execute(sql_device, (device_id, fecha_legible))

        # ==============================================================================
        # 2. INSERTAR LA LECTURA (Ahora es seguro porque el dispositivo existe)
        # ==============================================================================
        sql_lectura = """INSERT INTO lecturas 
                         (device_id, fecha_registro, raw_timestamp, temperatura, humedad, presion_at, velocidad_viento, prediccion_temp) 
                         VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
        
        val_lectura = (device_id, fecha_legible, raw_ts, temp, hum, pres, viento, pred)

        cursor.execute(sql_lectura, val_lectura)
        connection.commit()
        
        print(f"✅ [{device_id}] Dato guardado: {fecha_legible} | Temp: {temp}°C")

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