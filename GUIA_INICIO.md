# Guía de inicio — Levantar la plataforma desde cero

Checklist práctico para alguien que acaba de clonar el repo y necesita dejar
todo el sistema funcionando: base de datos, backend, ML service, frontend,
broker MQTT y los scripts opcionales (simulador, descargas históricas).

Para referencia de arquitectura y endpoints ver [`README.md`](README.md).
Esta guía es solo la secuencia de arranque.

---

Todo se levanta de forma manual, servicio por servicio, en su propia
terminal — no se usa Docker ni Nginx (el `docker-compose.yml` y el
`nginx/` del repo quedaron sin terminar de configurar y no forman parte de
este flujo).

## 0. Requisitos previos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | >= 20 | backend + frontend |
| Python | >= 3.10 (probado en 3.12) | ML service, scripts MQTT/descarga |
| MySQL | 8.x | persistencia |
| Mosquitto (u otro broker MQTT) | 2.x | pipeline de sensores, instalado local |

Verificar: `node -v`, `python --version`, `mysql --version`, `mosquitto -v`.

---

## 1. Base de datos (MySQL)

```bash
mysql -u root -p < backend/init.sql
```

Esto crea la BD `plataformaiot`, todas las tablas y un usuario admin +
un par de estaciones/dispositivos de ejemplo.

**Opcional — datos de prueba con lecturas históricas** (para ver gráficos
con contenido sin esperar a que lleguen datos reales por MQTT):

```bash
mysql -u root -p plataformaiot < backend/datos_pruebas.sql
```

### `backend/.env`

Crear el archivo (no está versionado):

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=plataformaiot
DB_PORT=3306
PORT=3000
JWT_SECRET=una_clave_larga_y_secreta
ML_SERVICE_URL=http://localhost:5001
```

`ML_SERVICE_URL` es opcional — si se omite, el backend usa
`http://localhost:5001` por defecto (correcto en desarrollo local).

---

## 2. Backend (Node.js / Express)

```bash
cd backend
npm install
npm run dev     # con nodemon, recarga automática
# o: npm start  # sin recarga, "producción"
```

Disponible en `http://localhost:3000`. Probar: `GET http://localhost:3000/api`.

---

## 3. ML Service (FastAPI + XGBoost)

Los CSV históricos de Open-Meteo (2020–2025) **ya vienen incluidos en el
repo** en `ml_service/datos/`, así que no es obligatorio descargarlos de
nuevo para entrenar.

```bash
cd ml_service
pip install -r requirements.txt

# Entrenar los 288 modelos (4 variables x 72 horizontes).
# Tarda varios minutos. Genera ml_service/modelos/*.pkl (no versionados).
python train_model.py

uvicorn app:app --port 5001 --reload
```

Disponible en `http://localhost:5001`. Probar: `GET http://localhost:5001/health`
(debe listar los 4 modelos cargados) y `GET http://localhost:5001/metricas`.

**Si no quieres entrenar de inmediato:** el servicio arranca igual, pero
`/predict` responde 503 hasta que existan los `.pkl`. `train_model.py` solo
hay que volver a correrlo si cambias los CSV de `datos/` o el código de
features.

**Refrescar los datos históricos (opcional, no obligatorio):**

```bash
cd ml_service
python descargar_datos.py
```

Vuelve a descargar año por año desde la API de Open-Meteo (pregunta antes
de sobreescribir cada archivo existente). Solo tiene sentido si quieres
datos más recientes antes de re-entrenar.

---

## 4. Frontend (React + TypeScript)

```bash
cd frontend
npm install
npm start
```

`frontend/.env` ya trae `PORT=3001` versionado. Si el backend no corre en
`localhost:3000`, agregar en ese mismo `.env`:

```env
REACT_APP_API_URL=http://localhost:3000/api
```

Disponible en `http://localhost:3001`.

---

## 5. Pipeline MQTT — datos en vivo

Se necesita un broker MQTT corriendo en `localhost:1883`. Instalar
Mosquitto localmente y levantarlo con la config del repo:

```bash
mosquitto -c mosquitto/config/mosquitto.conf -v
```

(`allow_anonymous true`, sin autenticación — pensado solo para desarrollo
local.)

Con el broker arriba, el suscriptor que persiste lecturas en MySQL:

```bash
pip install paho-mqtt mysql-connector-python
python script_mqtt_a_mysql.py
```

Usa las mismas credenciales que `backend/.env` (variables `DB_HOST`,
`DB_USER`, `DB_PASSWORD`, `DB_NAME`, con fallback a `localhost/root/
millahue343/plataformaiot` si no están en el entorno).

### No tienes una estación ESP32 física — usar el simulador

```bash
pip install paho-mqtt requests
python simulador_esp32.py --historico 72   # publica las últimas 72h y termina (poblar BD rápido)
python simulador_esp32.py --continuo       # publica en cada hora exacta, para dejarlo corriendo
python simulador_esp32.py --dry-run --historico 5   # solo imprime el JSON, no publica nada
```

El simulador trae datos reales de Open-Meteo (clima + calidad del aire) y
los publica en el tópico `datos` con el mismo formato JSON v2.1 que usa el
firmware real, así que llega igual a `script_mqtt_a_mysql.py` y a la BD.

### Alternativa rápida sin MQTT — SQL directo de los últimos 7 días

`Descarga_datos_OpenMeteo.py` (en la raíz del repo) no publica por MQTT:
imprime por consola un `INSERT INTO lecturas ...` con los últimos 7 días de
datos reales de Open-Meteo para 3 sensores de ejemplo (`UTALCA_A4CF12`,
`UTALCA_B788AA`, `UTALCA_ASDFGH`). Útil para poblar la BD de un tirón sin
esperar al simulador hora a hora.

```bash
pip install requests
python Descarga_datos_OpenMeteo.py > seed_7dias.sql
mysql -u root -p plataformaiot < seed_7dias.sql
```

Ojo: los `device_id` que usa (`UTALCA_A4CF12`, etc.) deben existir en la
tabla `dispositivos` o crearse antes (revisar `backend/init.sql` /
`datos_pruebas.sql`, o editar la lista `SENSORES` en el script).

---

## 6. Firmware / hardware real (opcional)

`Codigo_Final_ESP32_Predicciones.ino` es el firmware para la estación real
(ZY-ESP32 + DHT11 + BMP280 + MQ135 + anemómetro). Solo aplica si vas a
flashear una placa física; para desarrollo de software basta con el
simulador del paso 5.

---

## 7. Checklist de verificación

| Servicio | URL | Qué debería responder |
|---|---|---|
| Backend | `http://localhost:3000/api` | JSON `status: online` |
| ML Service | `http://localhost:5001/health` | modelos cargados |
| Frontend | `http://localhost:3001` | la SPA carga y pide login |
| Mosquitto | `localhost:1883` | acepta conexión del simulador/script |

Login de prueba (si corriste `init.sql`): `admin@utalca.cl` / `admin123`.

---

## 8. Correr los tests

```bash
# Backend — Jest, no requiere MySQL activo
cd backend
npm test
npm run test:coverage

# ML service — pytest, no requiere .pkl ni internet
cd ml_service
pip install -r requirements-dev.txt
python -m pytest tests/ --cov=app --cov=features_utils --cov-report=term-missing -v
```

---

## Orden recomendado (resumen)

1. `mysql -u root -p < backend/init.sql` (+ `datos_pruebas.sql` opcional)
2. Crear `backend/.env`
3. `cd backend && npm install && npm run dev`
4. `cd ml_service && pip install -r requirements.txt && python train_model.py && uvicorn app:app --port 5001 --reload`
5. `cd frontend && npm install && npm start`
6. `mosquitto -c mosquitto/config/mosquitto.conf -v` + `python script_mqtt_a_mysql.py`
7. Sin hardware: `python simulador_esp32.py --historico 72` para poblar datos, luego `--continuo` para dejarlo en vivo

Con eso queda igual a como se corre en desarrollo local para este proyecto.
