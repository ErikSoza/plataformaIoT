# Guía de Dockerización del Proyecto IoT

Esta guía explica el contenido del archivo `docker-compose.yml` que permite levantar todo el ecosistema de la plataforma IoT con un solo comando de forma local y enfocada al desarrollo (hot-reload).

## 🚀 ¿Cómo levantar el proyecto?

1. Es indispensable tener instalado **Docker** y **Docker Compose**.
2. Estar posicionado en la raíz principal del proyecto (donde se encuentra `docker-compose.yml`).
3. Ejecutar el siguiente comando:

```bash
docker-compose up --build
```
*(Puedes añadir el flag `-d` al final para correrlo en background y no bloquear tu terminal)*.

## 🏗️ Servicios Configurados (Contenedores)

El archivo Compose configura y conecta **5 contenedores** (ahora con un Proxy Inverso) que corresponden a los bloques de tu arquitectura:

### 1. `db` (Base de Datos MySQL)
- **Imagen**: Se utiliza `mysql:8.0`.
- **Datos iniciales**: Se montan de manera automática los archivos `./backend/init.sql` y `./backend/datos_pruebas.sql` para que el contenedor los ejecute si la base de datos se crea por primera vez.
- **Persistencia**: Se utiliza un volumen de docker llamado `db_data` para evitar la pérdida de los datos.
- **Conectividad:** **No expone puertos hacia el exterior.** Solo es accesible internamente desde la red de Docker por los otros servicios (como el backend y script Python).

### 2. `backend` (Servidor Node.js / Express)
- **Imagen**: Se utiliza `node:20-alpine` por ser muy ligera.
- **Port Mapping**: Tu backend corre en el puerto `3000` pero **no está expuesto al exterior**. Solo escucha dentro de la red de Docker.
- **Desarrollo**: Se mapea tu código en `backend` hacia el contenedor, e internamente corre `npm install && npm run dev` para usar `Nodemon`.

### 3. `frontend` (Sitio en React)
- **Imagen**: Usa la misma que el puerto interior, `node:20-alpine`.
- **Port Mapping**: Corre internamente en el puerto `3001` pero **no está expuesto al exterior**.
- **Desarrollo**: Mapea tu código de la carpeta frontend y ejecuta `npm start`. Está configurado para enviar la variable de entorno `REACT_APP_API_URL` a `/api` de manera relativa, permitiendo que Nginx maneje el enrutamiento.

### 4. `script-mqtt` (Script Python: Captura de MQTT a MySQL)
- **Imagen**: `python:3.9-slim`.
- **Acción**: Instala las librerías `paho-mqtt` y `mysql-connector-python` "al vuelo" y levanta el archivo `script_mqtt_a_mysql.py` (con `restart: always` para que nunca se caiga).

### 5. `nginx` (Proxy Inverso)
- **Imagen**: `nginx:alpine`.
- **Port Mapping**: Es el **único contenedor que expone un puerto hacia el exterior** (80:80). Actúa como punto de entrada de la arquitectura para el servidor de la universidad.
- **Función**: 
  - Todo el tráfico raíz (`/`) lo dirige al servicio `frontend` (React) en su puerto `3001`.
  - Todo el tráfico hacia `/api/` lo redirige internamente al servicio `backend` (Node) en su puerto `3000`. 
> 💡 *Nota técnica para el código en tu python*: Para que funcione perfecto dentro de Docker, tu script en Python tiene parametrizado 'localhost' como base de datos. Tendrías que ajustarlo para que apunte contra el container (ej: `host: 'db'`) u obtener el valor usando la librería `os.getenv()`.

## 🛑 Cómo apagar la plataforma

Para detener los servicios, matar los contenedores y limpiar la conexión de la red, usa:

```bash
docker-compose down
```

*(Si quisieras destruir todo desde cero incluyendo los volúmenes con datos de bases de datos persistidos, deberías correr `docker-compose down -v`)*.
