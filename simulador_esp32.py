#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
simulador_esp32.py
==================
Simula una estacion ESP32 meteorologica obteniendo datos reales de
Open-Meteo y publicandolos via MQTT en el formato JSON v2.1.

Modos
-----
  --historico N   Carga las ultimas N horas y termina (poblar BD).
  --continuo      Publica una vez ahora y luego en cada hora exacta (:00).
  --dry-run       Imprime los payloads sin conectarse al broker.

Ejemplos
--------
  python simulador_esp32.py --historico 72
  python simulador_esp32.py --continuo
  python simulador_esp32.py --dry-run --historico 5
  python simulador_esp32.py --dry-run --continuo

Dependencias
------------
  pip install paho-mqtt requests
"""

import argparse
import json
import logging
import math
import random
import sys
import time
from datetime import datetime, timedelta

import requests
import paho.mqtt.client as mqtt

# =============================================================================
# CONFIGURACION
# =============================================================================

# -- Broker MQTT --------------------------------------------------------------
MQTT_BROKER = "192.168.1.93"
MQTT_PORT   = 1883
MQTT_TOPIC  = "datos"

# -- Estacion simulada --------------------------------------------------------
ESTACION = {
    "device_id": "UTALCA_SIM001AA",
    "nombre":    "Curico Centro (Simulada)",
    "lat":       -34.9853,
    "lon":       -71.2368,
    # Parametros base sensor MQ135 para zona urbana/agricola del Maule
    "co2_base":  405.0,   # ppm
    "nh3_base":    3.5,   # ppm
}

# Retardo entre mensajes en modo --historico (evita saturar el broker)
RETARDO_HISTORICO_SEG = 0.4

# Zona horaria para Open-Meteo
TIMEZONE = "America/Santiago"

# =============================================================================
# LOGGING
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("simulador")

# =============================================================================
# OPEN-METEO
# =============================================================================

def fetch_openmeteo(lat: float, lon: float, dias_pasados: int) -> list:
    """
    Descarga datos horarios reales de Open-Meteo.
    Retorna lista ordenada de dicts, uno por hora, mas antigua primero.
    Cada dict incluye temp_siguiente (T+1h) para simular la prediccion TinyML.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude":        lat,
        "longitude":       lon,
        "hourly": "temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m",
        "past_days":       dias_pasados,
        "forecast_days":   1,
        "timezone":        TIMEZONE,
        "wind_speed_unit": "ms",
    }

    log.info(f"Consultando Open-Meteo ({lat}, {lon}) — {dias_pasados} dias pasados...")
    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
    except requests.RequestException as e:
        log.error(f"Error Open-Meteo: {e}")
        return []

    h     = resp.json()["hourly"]
    temps = h["temperature_2m"]
    result = []
    for i, t_str in enumerate(h["time"]):
        dt = datetime.fromisoformat(t_str)
        result.append({
            "datetime":         dt,
            "timestamp":        int(dt.timestamp()),
            "temperatura":      temps[i],
            "humedad":          h["relative_humidity_2m"][i],
            "presion_at":       h["surface_pressure"][i],
            "velocidad_viento": h["wind_speed_10m"][i],
            "temp_siguiente":   temps[i + 1] if i + 1 < len(temps) else temps[i],
        })

    log.info(f"Open-Meteo: {len(result)} lecturas horarias descargadas.")
    return result

# =============================================================================
# SIMULACION DE SENSORES
# =============================================================================

def simular_gases(
    temperatura: float,
    humedad: float,
    hora: int,
    velocidad_viento: float,
    co2_base: float,
    nh3_base: float,
) -> dict:
    """
    Genera lecturas MQ135 realistas para una estacion exterior en zona agricola.
    Correlaciones fisicas aplicadas:
      CO2: ciclo diurno (fotosintesis vs respiracion) + dilucion por viento.
      NH3: volatilizacion de fertilizantes aumenta con temperatura.
      Alcohol: traza de fermentacion (region vitivinicola del Maule).
      Humo: inversamente proporcional al viento (peor dispersion = mas humo).
    """
    rng = random.Random()

    ciclo_co2    = 2.0 * math.cos(math.pi * (hora - 14) / 12)
    diluc_viento = -min(velocidad_viento * 0.6, 5.0)
    co2 = max(380.0, co2_base + ciclo_co2 + diluc_viento + rng.gauss(0, 1.5))

    factor_nh3 = max(0.0, (temperatura - 15) * 0.1)
    nh3 = max(0.5, nh3_base + factor_nh3 + rng.gauss(0, 0.4))

    alcohol_base = 1.2 if 15 <= temperatura <= 30 else 0.6
    alcohol = max(0.1, rng.gauss(alcohol_base, 0.3))

    humo_base = 8.0 / max(1.0, velocidad_viento)
    humo = max(0.5, rng.gauss(humo_base, 1.2))

    benceno = max(0.1, rng.gauss(1.5 + temperatura * 0.02, 0.3))
    acetona = max(0.1, rng.gauss(1.8, 0.4))

    return {
        "co2":     round(co2, 1),
        "nh3":     round(nh3, 1),
        "alcohol": round(alcohol, 1),
        "humo":    round(humo, 1),
        "benceno": round(benceno, 1),
        "acetona": round(acetona, 1),
    }


def simular_prediccion_tinyml(temp_actual: float, temp_siguiente: float) -> float:
    """
    Simula la prediccion T+1h del modelo TinyML (Edge Impulse, R2=0.96).
    Usa el valor real de Open-Meteo como base y agrega ruido gaussiano
    calibrado al MAE del modelo (~0.45 grados C).
    """
    return round(temp_siguiente + random.gauss(0, 0.45), 2)

# =============================================================================
# CONSTRUCCION DEL PAYLOAD JSON v2.1
# =============================================================================

def construir_payload(lectura: dict) -> dict:
    """
    Ensambla el JSON v2.1 identico al que envia el firmware ESP32.
    Valores numericos como strings con decimales fijos (igual que dtostrf en Arduino).
    """
    temp  = lectura["temperatura"]
    hum   = lectura["humedad"]
    pres  = lectura["presion_at"]
    vient = lectura["velocidad_viento"]
    hora  = lectura["datetime"].hour

    pred  = simular_prediccion_tinyml(temp, lectura["temp_siguiente"])
    gases = simular_gases(
        temp, hum, hora, vient,
        ESTACION["co2_base"], ESTACION["nh3_base"]
    )

    return {
        "id":        ESTACION["device_id"],
        "timestamp": lectura["timestamp"],
        "datos": {
            "temperatura":     f"{temp:.2f}",
            "humedad":         f"{hum:.2f}",
            "presionAT":       f"{pres:.1f}",
            "velocidadViento": f"{vient:.2f}",
            "prediccionTemp":  f"{pred:.2f}",
            "gases":           {k: f"{v:.1f}" for k, v in gases.items()},
        },
    }

# =============================================================================
# CLIENTE MQTT
# =============================================================================

class ClienteMQTT:
    def __init__(self, broker: str, port: int):
        self.broker    = broker
        self.port      = port
        self.conectado = False
        self._client   = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self._client.on_connect    = self._on_connect
        self._client.on_disconnect = self._on_disconnect

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        self.conectado = (reason_code == 0)
        if self.conectado:
            log.info(f"Broker MQTT conectado ({self.broker}:{self.port})")
        else:
            log.error(f"MQTT: fallo de conexion, codigo {reason_code}")

    def _on_disconnect(self, client, userdata, flags, reason_code, properties):
        self.conectado = False
        if reason_code != 0:
            log.warning("MQTT: desconexion inesperada.")

    def conectar(self) -> bool:
        try:
            self._client.connect(self.broker, self.port, keepalive=60)
            self._client.loop_start()
            time.sleep(1.5)
            return self.conectado
        except (OSError, ConnectionRefusedError) as e:
            log.error(f"No se pudo conectar al broker: {e}")
            return False

    def publicar(self, payload: dict) -> bool:
        if not self.conectado:
            log.warning("MQTT sin conexion, reintentando...")
            if not self.conectar():
                return False
        msg    = json.dumps(payload, ensure_ascii=False)
        result = self._client.publish(MQTT_TOPIC, msg, qos=1)
        result.wait_for_publish(timeout=5)
        return result.is_published()

    def desconectar(self):
        self._client.loop_stop()
        self._client.disconnect()

# =============================================================================
# LOGICA DE PUBLICACION
# =============================================================================

def publicar_lectura(lectura: dict, cliente, dry_run: bool) -> bool:
    """Construye el payload, lo publica y registra el resultado en consola."""
    payload = construir_payload(lectura)
    datos   = payload["datos"]
    dt_str  = lectura["datetime"].strftime("%Y-%m-%d %H:%M")

    linea = (
        f"{dt_str}  "
        f"T={datos['temperatura']} C  "
        f"H={datos['humedad']}%  "
        f"P={datos['presionAT']} hPa  "
        f"V={datos['velocidadViento']} m/s  "
        f"CO2={datos['gases']['co2']} ppm"
    )

    if dry_run:
        log.info(f"[DRY-RUN]  {linea}")
        return True

    ok = cliente.publicar(payload)
    log.info(f"[{'OK    ' if ok else 'FALLO '}]  {linea}")
    return ok

# =============================================================================
# MODO HISTORICO
# =============================================================================

def modo_historico(horas: int, dry_run: bool):
    """Descarga y publica las ultimas N horas en orden cronologico."""
    dias     = math.ceil(horas / 24) + 1
    lecturas = fetch_openmeteo(ESTACION["lat"], ESTACION["lon"], dias)
    if not lecturas:
        log.error("Sin datos de Open-Meteo. Abortando.")
        sys.exit(1)

    # Filtrar usando el timestamp del ultimo punto disponible como referencia
    ts_ultimo = lecturas[-1]["timestamp"]
    ts_corte  = ts_ultimo - horas * 3600
    filtradas = [l for l in lecturas if l["timestamp"] > ts_corte]

    log.info(f"Publicando {len(filtradas)} lecturas historicas ({horas}h)...")
    log.info("-" * 70)

    cliente = None
    if not dry_run:
        cliente = ClienteMQTT(MQTT_BROKER, MQTT_PORT)
        if not cliente.conectar():
            log.error("Sin conexion MQTT. Abortando.")
            sys.exit(1)

    ok_count = 0
    for i, lectura in enumerate(filtradas, 1):
        ok = publicar_lectura(lectura, cliente, dry_run)
        if ok:
            ok_count += 1
        if not dry_run:
            time.sleep(RETARDO_HISTORICO_SEG)

    if cliente:
        cliente.desconectar()

    log.info("-" * 70)
    log.info(f"Historico completado: {ok_count}/{len(filtradas)} mensajes publicados.")

# =============================================================================
# MODO CONTINUO
# =============================================================================

def modo_continuo(dry_run: bool):
    """
    Publica datos en tiempo real alineados al ciclo horario del reloj.

    Ciclo:
      1. Publica la lectura de la hora actual (inmediatamente al arrancar).
      2. Calcula cuantos segundos faltan para la proxima hora en punto (:00).
      3. Duerme ese tiempo exacto.
      4. Publica y repite.

    Tolerancias:
      - Si Open-Meteo falla: reintenta cada 5 minutos sin perder el ciclo.
      - Si MQTT falla: reintenta la publicacion 3 veces antes de continuar.
    """
    cliente = None
    if not dry_run:
        cliente = ClienteMQTT(MQTT_BROKER, MQTT_PORT)
        if not cliente.conectar():
            log.error("Sin conexion MQTT. Abortando.")
            sys.exit(1)

    log.info("Modo continuo activo. Publica en cada hora exacta (:00).")
    log.info("Presiona Ctrl+C para detener.")
    log.info("-" * 70)

    try:
        while True:
            # Obtener datos frescos de Open-Meteo
            lecturas = fetch_openmeteo(ESTACION["lat"], ESTACION["lon"], dias_pasados=1)

            if not lecturas:
                log.warning("Open-Meteo no respondio. Reintentando en 5 min...")
                time.sleep(300)
                continue

            # Seleccionar la lectura mas cercana al momento actual sin pasarse
            ahora          = datetime.now()
            lectura_actual = None
            for l in reversed(lecturas):
                if l["datetime"] <= ahora and l["temperatura"] is not None:
                    lectura_actual = l
                    break
            if lectura_actual is None:
                lectura_actual = lecturas[-1]

            # Publicar con hasta 3 reintentos
            publicado = False
            for intento in range(1, 4):
                if publicar_lectura(lectura_actual, cliente, dry_run):
                    publicado = True
                    break
                log.warning(f"Publicacion fallida (intento {intento}/3). Reintentando en 5s...")
                time.sleep(5)

            if not publicado:
                log.error("No se pudo publicar tras 3 intentos. Se retomara en la proxima hora.")

            # Calcular espera hasta la proxima hora en punto
            ahora        = datetime.now()
            proxima_hora = ahora.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
            espera_seg   = (proxima_hora - ahora).total_seconds()

            log.info(
                f"Proxima publicacion: {proxima_hora.strftime('%H:%M:%S')}  "
                f"(en {int(espera_seg // 60)}m {int(espera_seg % 60)}s)"
            )
            log.info("-" * 70)
            time.sleep(espera_seg)

    except KeyboardInterrupt:
        log.info("Simulador detenido por el usuario.")
    finally:
        if cliente:
            cliente.desconectar()

# =============================================================================
# ENTRADA PRINCIPAL
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Simulador de estacion ESP32 — Plataforma IoT UTALCA",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  python simulador_esp32.py --historico 72         # carga 72 horas a la BD
  python simulador_esp32.py --continuo             # publica en tiempo real
  python simulador_esp32.py --dry-run --historico 5
  python simulador_esp32.py --dry-run --continuo
        """,
    )
    modo = parser.add_mutually_exclusive_group(required=True)
    modo.add_argument("--historico", metavar="N", type=int,
                      help="Publica las ultimas N horas de datos y termina.")
    modo.add_argument("--continuo", action="store_true",
                      help="Publica en tiempo real, una vez por hora en punto.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Imprime los payloads sin conectarse al broker MQTT.")
    args = parser.parse_args()

    log.info("=" * 70)
    log.info(f"  Simulador ESP32 — {ESTACION['nombre']}")
    log.info(f"  device_id : {ESTACION['device_id']}")
    log.info(f"  Ubicacion : lat={ESTACION['lat']}  lon={ESTACION['lon']}")
    log.info(f"  Broker    : {MQTT_BROKER}:{MQTT_PORT}  topic={MQTT_TOPIC}")
    log.info(f"  Dry-run   : {'Si' if args.dry_run else 'No'}")
    log.info("=" * 70)

    if args.historico:
        modo_historico(args.historico, args.dry_run)
    else:
        modo_continuo(args.dry_run)


if __name__ == "__main__":
    main()
