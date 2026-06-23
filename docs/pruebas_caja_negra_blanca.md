# Pruebas de Software — Plataforma IoT Meteorológica

**Proyecto:** Red de Estaciones Meteorológicas IoT — Universidad de Talca  
**Autor:** Erik Soza  
**Fecha:** 2026-06-18  

---

## Índice

1. [Introducción](#1-introducción)
2. [Pruebas de Caja Negra](#2-pruebas-de-caja-negra)
   - 2.1 Partición de Equivalencia
   - 2.2 Análisis de Valores Límite
   - 2.3 Pruebas de Casos de Uso
   - 2.4 Pruebas de Transición de Estados
   - 2.5 Pruebas de API REST
   - 2.6 Pruebas de Interfaz de Usuario
3. [Pruebas de Caja Blanca](#3-pruebas-de-caja-blanca)
   - 3.1 Cobertura de Sentencias
   - 3.2 Cobertura de Ramas
   - 3.3 Cobertura de Caminos
   - 3.4 Pruebas de Condición
   - 3.5 Análisis de Flujo de Datos
4. [Matriz de Trazabilidad](#4-matriz-de-trazabilidad)
5. [Herramientas Sugeridas](#5-herramientas-sugeridas)

---

## 1. Introducción

Este documento describe los tipos de pruebas de software aplicables a la Plataforma IoT Meteorológica, que incluye tres capas principales:

- **Backend:** API REST en Node.js/Express + MySQL
- **Frontend:** SPA en React + TypeScript + Vite
- **ML Service:** Microservicio FastAPI en Python (modelos XGBoost)

Las pruebas se dividen en dos grandes enfoques:

| Enfoque | Qué observa | Quién la diseña |
|---------|-------------|-----------------|
| **Caja Negra** | Entradas y salidas del sistema, sin ver el código | Tester / usuario final |
| **Caja Blanca** | Lógica interna, ramas y caminos del código | Desarrollador |

---

## 2. Pruebas de Caja Negra

Las pruebas de caja negra validan el comportamiento externo del sistema basándose únicamente en sus especificaciones funcionales, sin importar la implementación interna.

---

### 2.1 Partición de Equivalencia

Se dividen los datos de entrada en clases válidas e inválidas para reducir la cantidad de casos de prueba necesarios.

#### Módulo: Registro de Usuario (`POST /auth/register`)

| ID | Clase | Entrada (campo `email`) | Resultado Esperado |
|----|-------|------------------------|-------------------|
| PE-01 | Válida | `erik@utalca.cl` | Usuario creado, HTTP 201 |
| PE-02 | Inválida | `erikutalca.cl` (sin @) | HTTP 400, mensaje de error |
| PE-03 | Inválida | `@utalca.cl` (sin usuario) | HTTP 400, mensaje de error |
| PE-04 | Inválida | `""` (vacío) | HTTP 400, campo requerido |
| PE-05 | Inválida | `erik@` (sin dominio) | HTTP 400, mensaje de error |

| ID | Clase | Entrada (campo `contrasena`) | Resultado Esperado |
|----|-------|------------------------------|-------------------|
| PE-06 | Válida | `"Segura123!"` (≥8 chars) | HTTP 201 |
| PE-07 | Inválida | `"123"` (<8 chars) | HTTP 400, contraseña muy corta |
| PE-08 | Inválida | `""` (vacío) | HTTP 400, campo requerido |

#### Módulo: Reglas de Alerta (`POST /alertas/reglas`)

| ID | Clase | Entrada (campo `variable`) | Resultado Esperado |
|----|-------|---------------------------|-------------------|
| PE-09 | Válida | `"temperatura"` | Regla creada, HTTP 201 |
| PE-10 | Válida | `"humedad"` | Regla creada, HTTP 201 |
| PE-11 | Válida | `"presion_at"` | Regla creada, HTTP 201 |
| PE-12 | Válida | `"velocidad_viento"` | Regla creada, HTTP 201 |
| PE-13 | Inválida | `"temperatura2"` (no existe) | HTTP 400 |
| PE-14 | Inválida | `""` (vacío) | HTTP 400 |

| ID | Clase | Entrada (campo `condicion`) | Resultado Esperado |
|----|-------|----------------------------|-------------------|
| PE-15 | Válida | `">"` | Regla creada |
| PE-16 | Válida | `"<"` | Regla creada |
| PE-17 | Válida | `">="` | Regla creada |
| PE-18 | Inválida | `"entre"` (no soportado) | HTTP 400 |

#### Módulo: Predicción ML (`GET /api/prediccion/:estacion_id`)

| ID | Clase | Parámetro `horas` | Resultado Esperado |
|----|-------|-------------------|-------------------|
| PE-19 | Válida | `24` | Arreglo de 24 predicciones |
| PE-20 | Válida | `48` | Arreglo de 48 predicciones |
| PE-21 | Válida | `72` | Arreglo de 72 predicciones |
| PE-22 | Inválida | `0` | HTTP 400 |
| PE-23 | Inválida | `100` (fuera de rango) | HTTP 400 |
| PE-24 | Inválida | `"abc"` (no numérico) | HTTP 400 |

| ID | Clase | Parámetro `variable` | Resultado Esperado |
|----|-------|---------------------|-------------------|
| PE-25 | Válida | `"temperatura"` | Predicciones en °C |
| PE-26 | Válida | `"humedad"` | Predicciones en % |
| PE-27 | Válida | `"presion"` | Predicciones en hPa |
| PE-28 | Válida | `"viento"` | Predicciones en km/h |
| PE-29 | Inválida | `"radiacion"` (no soportada) | HTTP 400 o 503 |

---

### 2.2 Análisis de Valores Límite

Se prueban los valores en los extremos de los rangos válidos, donde los errores son más frecuentes.

#### Módulo: Valores Físicos de Sensores (lecturas desde ESP32)

Los rangos físicos razonables para la zona de Curicó/Maule son:

| Variable | Límite inferior | Límite superior | Unidad |
|----------|-----------------|-----------------|--------|
| temperatura | -10 | 45 | °C |
| humedad | 0 | 100 | % |
| presion_at | 900 | 1100 | hPa |
| velocidad_viento | 0 | 120 | km/h |
| gas_co2 | 350 | 5000 | ppm |

| ID | Variable | Valor de Prueba | Resultado Esperado |
|----|----------|----------------|--------------------|
| VL-01 | temperatura | `-10` (límite inferior) | Lectura guardada |
| VL-02 | temperatura | `-10.01` (bajo límite) | Rechazada o flagged |
| VL-03 | temperatura | `45` (límite superior) | Lectura guardada |
| VL-04 | temperatura | `45.01` (sobre límite) | Rechazada o flagged |
| VL-05 | humedad | `0` (mínimo absoluto) | Lectura guardada |
| VL-06 | humedad | `-1` (imposible físicamente) | Rechazada |
| VL-07 | humedad | `100` (máximo absoluto) | Lectura guardada |
| VL-08 | humedad | `100.1` (imposible) | Rechazada |
| VL-09 | presion_at | `900` (límite inferior) | Lectura guardada |
| VL-10 | presion_at | `1100` (límite superior) | Lectura guardada |
| VL-11 | velocidad_viento | `0` (calma total) | Lectura guardada |
| VL-12 | velocidad_viento | `-0.1` (imposible) | Rechazada |

#### Módulo: Paginación de Reportes

| ID | Parámetro | Valor | Resultado Esperado |
|----|-----------|-------|--------------------|
| VL-13 | `page` | `1` (primera página) | Primeros N registros |
| VL-14 | `page` | `0` | HTTP 400 o página 1 |
| VL-15 | `page` | `-1` | HTTP 400 |
| VL-16 | `limit` | `1` (mínimo) | 1 registro |
| VL-17 | `limit` | `1000` (máximo razonable) | Registros correctos |
| VL-18 | `limit` | `0` | HTTP 400 |

#### Módulo: Coordenadas Geográficas de Estaciones

| ID | Campo | Valor | Resultado Esperado |
|----|-------|-------|--------------------|
| VL-19 | `latitud` | `-90` (Polo Sur) | Aceptado |
| VL-20 | `latitud` | `-90.1` | HTTP 400 |
| VL-21 | `latitud` | `90` (Polo Norte) | Aceptado |
| VL-22 | `latitud` | `90.1` | HTTP 400 |
| VL-23 | `longitud` | `-180` | Aceptado |
| VL-24 | `longitud` | `180` | Aceptado |
| VL-25 | `longitud` | `-181` | HTTP 400 |
| VL-26 | longitud (Curicó) | `-71.2` | Aceptado (rango Chile) |

---

### 2.3 Pruebas de Casos de Uso

Se verifican flujos completos del sistema tal como los usa un actor real.

#### CU-01: Flujo de Monitoreo en Tiempo Real

**Actor:** Operador de la plataforma  
**Precondición:** Al menos una estación activa enviando datos MQTT

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Usuario ingresa a la plataforma | Se muestra mapa con estaciones |
| 2 | Usuario hace clic en una estación | Popup con última lectura (temp, hum, presión, viento) |
| 3 | Popup muestra badges de gases MQ135 | 6 badges con colores semáforo (verde/amarillo/rojo) |
| 4 | Usuario navega a "Dispositivos" | Lista de estaciones con datos actualizados |
| 5 | Usuario selecciona una estación | Aparece `PrediccionChart` con selector de variable |
| 6 | Usuario selecciona "Humedad" + "48h" | Gráfico se actualiza con predicciones de humedad |

#### CU-02: Configuración y Disparo de Alerta

**Actor:** Usuario registrado  
**Precondición:** Usuario autenticado, estación disponible

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Usuario va a configuración de alertas | Modal `AlertConfigModal` disponible |
| 2 | Crea regla: `temperatura > 35°C`, nivel `crítico` | Regla guardada en BD |
| 3 | Estación envía lectura `temperatura = 36.2` | Sistema ejecuta `verificarAlertas` |
| 4 | Alerta disparada | Registro creado en tabla `alertas` |
| 5 | Campana `AlertBell` muestra contador +1 | Badge numérico visible |
| 6 | Usuario abre notificaciones | Toast con mensaje descriptivo |
| 7 | Usuario marca alerta como leída | Contador decrementado, `leida = true` |

#### CU-03: Generación de Reporte Histórico

**Actor:** Investigador / administrador  
**Precondición:** Historial de lecturas en BD

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Usuario navega a "Reportes" | Selector de variable, fecha inicio/fin |
| 2 | Selecciona `gas_co2` como variable | Gráfico de CO₂ en el tiempo |
| 3 | Filtra por estación específica | Solo datos de esa estación |
| 4 | Hace clic en "Exportar Excel" | Descarga `.xlsx` con datos filtrados |
| 5 | Hace clic en "Exportar CSV" | Descarga `.csv` con mismos datos |

#### CU-04: Predicción Meteorológica Multi-variable

**Actor:** Usuario final / investigador

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Selecciona estación en DispositivosPagina | `PrediccionChart` carga con variable `temperatura` por defecto |
| 2 | Cambia selector a `Presión` | Gráfico muestra predicciones en hPa, línea color azul |
| 3 | Cambia horizonte a `72h` | Gráfico extiende eje X, métricas actualizadas |
| 4 | Verifica badge de confianza | Muestra `± X hPa` calculado vs Open-Meteo |
| 5 | Verifica métricas al pie | MAE, R² y nivel de confianza del modelo |

#### CU-05: Administración de Estaciones (Rol Admin)

**Actor:** Administrador del sistema

| Paso | Acción | Resultado Esperado |
|------|--------|--------------------|
| 1 | Accede a Gestión de Estaciones | Lista completa con estado |
| 2 | Crea nueva estación con coordenadas Curicó | Estación aparece en mapa |
| 3 | Asigna dispositivo ESP32 disponible | Dispositivo vinculado (`id_estacion` actualizado) |
| 4 | Desactiva estación | Estado cambia a `inactiva`, no aparece en mapa |
| 5 | Elimina estación sin lecturas | Eliminada de BD |
| 6 | Intenta eliminar estación con lecturas asociadas | Error protegido por FK o advertencia |

---

### 2.4 Pruebas de Transición de Estados

Se verifica que el sistema transicione correctamente entre estados definidos.

#### Dispositivo ESP32

```
[Disponible] --asignar--> [Asignado] --liberar--> [Disponible]
[Asignado]   --eliminar-> [Eliminado]
[Disponible] --eliminar-> [Eliminado]
```

| ID | Estado Inicial | Acción | Estado Final Esperado |
|----|----------------|--------|-----------------------|
| TS-01 | Disponible | `POST /dispositivos/asignar` con `id_estacion` válido | Asignado |
| TS-02 | Asignado | `PUT /dispositivos/:id/liberar` | Disponible |
| TS-03 | Asignado | `POST /dispositivos/asignar` (reasignar sin liberar) | HTTP 409 o error |
| TS-04 | Disponible | `DELETE /dispositivos/:id` | Eliminado (HTTP 200) |
| TS-05 | Asignado | `DELETE /dispositivos/:id` | HTTP 409 (en uso) o eliminación en cascada |

#### Alerta

```
[Activa, No leída] --leer--> [Activa, Leída]
[Activa] --toggle--> [Inactiva]
[Inactiva] --toggle--> [Activa]
```

| ID | Estado Inicial | Acción | Estado Final Esperado |
|----|----------------|--------|-----------------------|
| TS-06 | No leída | `PATCH /alertas/:id/leer` | Leída (`leida = true`) |
| TS-07 | Leída | `PATCH /alertas/:id/leer` (idempotente) | Sigue leída, HTTP 200 |
| TS-08 | Regla activa | `PATCH /alertas/reglas/:id/toggle` | Regla inactiva |
| TS-09 | Regla inactiva | `PATCH /alertas/reglas/:id/toggle` | Regla activa |
| TS-10 | Regla inactiva | Lectura supera umbral | **No** dispara alerta |
| TS-11 | Regla activa | Lectura supera umbral | Dispara alerta |

#### Sesión de Usuario

```
[No autenticado] --login--> [Autenticado] --logout--> [No autenticado]
[Autenticado] --token expirado--> [No autenticado]
```

| ID | Estado | Acción | Estado Final Esperado |
|----|--------|--------|-----------------------|
| TS-12 | No autenticado | `GET /auth/profile` | HTTP 401 |
| TS-13 | No autenticado | `POST /auth/login` (credenciales válidas) | Autenticado + JWT |
| TS-14 | Autenticado | `GET /auth/profile` con JWT | HTTP 200 + datos |
| TS-15 | Autenticado | `GET /auth/users` (rol `usuario`) | HTTP 403 Forbidden |
| TS-16 | Autenticado (admin) | `GET /auth/users` | HTTP 200 + lista |

---

### 2.5 Pruebas de API REST

Se verifica el comportamiento de cada endpoint evaluando códigos HTTP, estructura de respuesta y manejo de errores.

#### Endpoint: `GET /estaciones/:id`

| ID | Entrada | Código HTTP Esperado | Body Esperado |
|----|---------|---------------------|---------------|
| API-01 | ID existente (ej: `1`) | 200 | `{ id, nombre, latitud, longitud, estado, ... }` |
| API-02 | ID no existente (`9999`) | 404 | `{ error: "Estación no encontrada" }` |
| API-03 | ID no numérico (`"abc"`) | 400 | `{ error: "ID inválido" }` |
| API-04 | Sin autenticación (ruta protegida) | 401 | `{ error: "Token requerido" }` |

#### Endpoint: `POST /lecturas` (desde ESP32 vía MQTT → script Python)

| ID | Payload | Código Esperado | Resultado |
|----|---------|-----------------|-----------|
| API-05 | JSON v2.1 completo (con gases) | 201 | Lectura + gases guardados |
| API-06 | JSON sin subobjeto `gases` (retrocompat.) | 201 | Lectura guardada, gases = NULL |
| API-07 | JSON con `device_id` inexistente | 404 | `{ error: "Dispositivo no encontrado" }` |
| API-08 | JSON con `temperatura: "abc"` | 400 | Error de validación |
| API-09 | Payload vacío `{}` | 400 | `{ error: "Campos requeridos" }` |

#### Endpoint: `GET /api/prediccion/:estacion_id`

| ID | Entrada | Código Esperado | Resultado |
|----|---------|-----------------|-----------|
| API-10 | Estación con ≥25 lecturas, `horas=24` | 200 | Array 24 predicciones + métricas |
| API-11 | Estación con <25 lecturas | 200 ó 503 | Predicción con datos parciales o error informativo |
| API-12 | `variable=temperatura&horas=72` | 200 | 72 puntos en °C |
| API-13 | ML Service caído | 503 | `{ error: "Microservicio ML no disponible" }` |
| API-14 | `horas=48&variable=presion` | 200 | 48 puntos en hPa + MAE correcto |

#### Endpoint: `GET /health` (ML Service FastAPI)

| ID | Condición | Código Esperado | Body |
|----|-----------|-----------------|------|
| API-15 | Todos los .pkl cargados | 200 | `{ status: "ok", modelos: { temperatura: true, ... } }` |
| API-16 | Falta `modelo_humedad.pkl` | 200 | `{ status: "degraded", modelos: { humedad: false, ... } }` |
| API-17 | Ningún .pkl presente | 503 | `{ status: "error" }` |

---

### 2.6 Pruebas de Interfaz de Usuario

Se verifica el comportamiento visual y la interacción del usuario con la SPA React.

#### Componente: `PrediccionChart`

| ID | Acción | Resultado Esperado |
|----|--------|--------------------|
| UI-01 | Carga inicial sin estación seleccionada | Componente no visible |
| UI-02 | Selección de estación válida | Gráfico renderiza con variable `temperatura` por defecto |
| UI-03 | Click en selector "Humedad" | Línea del gráfico cambia a color azul, eje Y muestra `%` |
| UI-04 | Click en selector "Presión" | Línea cambia a color morado, eje Y muestra `hPa` |
| UI-05 | Click en selector "Viento" | Línea cambia a color verde, eje Y muestra `km/h` |
| UI-06 | Cambio horizonte `24h → 72h` | Eje X se extiende, datos se actualizan |
| UI-07 | ML Service no disponible | Mensaje de error claro, no pantalla en blanco |
| UI-08 | Hover sobre punto del gráfico | Tooltip con valor + unidad + hora |
| UI-09 | Banda ±MAE visible | Área sombreada alrededor de la línea de predicción |

#### Componente: `AlertBell`

| ID | Condición | Resultado Esperado |
|----|-----------|-------------------|
| UI-10 | Sin alertas no leídas | Icono de campana sin badge |
| UI-11 | 1 alerta no leída | Badge con número `1` visible |
| UI-12 | 10+ alertas no leídas | Badge muestra `10+` o el número exacto |
| UI-13 | Click en campana | Panel/dropdown de alertas se abre |

#### Pruebas de Responsividad

| ID | Resolución | Resultado Esperado |
|----|------------|-------------------|
| UI-14 | 1920×1080 (desktop) | Layout completo, mapa y gráficos visibles |
| UI-15 | 768×1024 (tablet) | Layout adaptado, sin desbordamiento horizontal |
| UI-16 | 375×667 (móvil) | Menú colapsado, gráficos redimensionados |

#### Pruebas de Accesibilidad (complemento WAVE)

| ID | Elemento | Verificación |
|----|----------|-------------|
| UI-17 | Badges de calidad de aire | Texto alternativo + no solo depende del color |
| UI-18 | Gráficos Chart.js | Tabla de datos accesible como alternativa |
| UI-19 | Formulario de login | Labels asociados a cada input (`for` + `id`) |
| UI-20 | Alertas críticas | Rol ARIA `alert` o `aria-live` configurado |

---

## 3. Pruebas de Caja Blanca

Las pruebas de caja blanca analizan la estructura interna del código para verificar que todos los caminos lógicos, ramas y condiciones sean ejecutados correctamente.

---

### 3.1 Cobertura de Sentencias

Se verifica que cada línea de código ejecutable sea invocada al menos una vez.

#### Módulo: `backend/src/models/prediccionModel.js` — función `getHistorialEstacion`

```javascript
// Lógica simplificada de la función:
async function getHistorialEstacion(estacionId) {
  const [rows] = await pool.query(
    `SELECT DATE(fecha_registro) as fecha,
            HOUR(fecha_registro) as hora,
            AVG(temperatura) as temperatura,
            AVG(humedad) as humedad,
            AVG(presion_at) as presion_at,
            AVG(velocidad_viento) as velocidad_viento
     FROM lecturas l
     JOIN dispositivos d ON l.device_id = d.device_id
     WHERE d.id_estacion = ?
       AND fecha_registro >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
     GROUP BY DATE(fecha_registro), HOUR(fecha_registro)
     ORDER BY fecha DESC, hora DESC
     LIMIT 25`,
    [estacionId]
  );
  return rows;
}
```

| ID | Caso de Prueba | Sentencias Cubiertas |
|----|----------------|---------------------|
| CB-01 | Estación con 25 lecturas en últimas 24h | Consulta completa, retorno con datos |
| CB-02 | Estación sin lecturas recientes | Consulta ejecutada, retorno array vacío |
| CB-03 | `estacionId` null o undefined | Manejo de error (línea try/catch) |

**Meta de cobertura:** 100% de sentencias en funciones de modelo.

#### Módulo: `ml_service/app.py` — función `predict` (endpoint POST)

```python
# Lógica de ramas en la función de predicción:
@app.post("/predict")
async def predict(request: PredictRequest):
    variable = request.variable
    horas = request.horas
    
    # Rama 1: verificar modelo disponible
    if variable not in modelos or modelos[variable] is None:
        raise HTTPException(status_code=503, ...)
    
    # Rama 2: construir features
    features = build_features(request.historial, request.datos_actuales)
    
    # Rama 3: generar predicciones por horizonte
    predicciones = []
    for h in range(1, horas + 1):
        pred = modelos[variable][f"modelo_{h}h"].predict(features)
        predicciones.append(pred[0])
    
    # Rama 4: consultar Open-Meteo si hay coordenadas
    openmeteo_data = None
    if request.lat and request.lon:
        openmeteo_data = await fetch_openmeteo(request.lat, request.lon, variable)
    
    return PredictResponse(predicciones=predicciones, openmeteo=openmeteo_data)
```

| ID | Caso | Ramas Cubiertas |
|----|------|-----------------|
| CB-04 | Variable disponible, con coordenadas | Ramas 1(falsa), 2, 3, 4(verdadera) |
| CB-05 | Variable disponible, sin coordenadas | Ramas 1(falsa), 2, 3, 4(falsa) |
| CB-06 | Variable no disponible | Rama 1(verdadera) → excepción HTTP 503 |

---

### 3.2 Cobertura de Ramas

Se asegura que cada rama de cada estructura condicional (if/else, switch, try/catch) sea ejecutada tanto en su valor `true` como `false`.

#### Módulo: `backend/src/models/alertaModel.js` — función `verificarAlertas`

```javascript
// Pseudocódigo de las ramas lógicas:
function verificarCondicion(valorActual, condicion, umbral) {
  if (condicion === '>') return valorActual > umbral;      // Rama A
  if (condicion === '<') return valorActual < umbral;      // Rama B
  if (condicion === '>=') return valorActual >= umbral;    // Rama C
  if (condicion === '<=') return valorActual <= umbral;    // Rama D
  return false;                                            // Rama E (defecto)
}
```

| ID | `condicion` | `valorActual` | `umbral` | Rama | Resultado |
|----|-------------|---------------|----------|------|-----------|
| CR-01 | `">"` | `36.5` | `35` | A (true) | `true` — alerta disparada |
| CR-02 | `">"` | `34.0` | `35` | A (false) | `false` — sin alerta |
| CR-03 | `"<"` | `5.0` | `10` | B (true) | `true` |
| CR-04 | `"<"` | `15.0` | `10` | B (false) | `false` |
| CR-05 | `">="` | `35.0` | `35` | C (true) | `true` (igual = dispara) |
| CR-06 | `">="` | `34.9` | `35` | C (false) | `false` |
| CR-07 | `"<="` | `35.0` | `35` | D (true) | `true` |
| CR-08 | `"<="` | `35.1` | `35` | D (false) | `false` |
| CR-09 | `"entre"` | cualquiera | cualquiera | E (defecto) | `false` |

#### Módulo: `backend/src/controllers/prediccionController.js`

```javascript
// Ramas de manejo de errores del proxy ML:
async function getPrediccion(req, res) {
  try {
    const historial = await prediccionModel.getHistorialEstacion(id);
    
    if (historial.length === 0) {                    // Rama F: sin historial
      return res.status(404).json({ error: ... });
    }
    
    const mlResponse = await axios.post(ML_URL, ...);
    
    if (mlResponse.data.openmeteo) {                 // Rama G: Open-Meteo disponible
      confianza = calcularConfianza(mlResponse.data);
    } else {
      confianza = null;                              // Rama G: Open-Meteo no disponible
    }
    
    res.json({ predicciones: mlResponse.data, confianza });
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {             // Rama H: ML Service caído
      res.status(503).json({ error: "ML no disponible" });
    } else {
      res.status(500).json({ error: "Error interno" }); // Rama H: otro error
    }
  }
}
```

| ID | Condición | Rama | Resultado Esperado |
|----|-----------|------|--------------------|
| CR-10 | Historial vacío | F (true) | HTTP 404 |
| CR-11 | Historial con datos | F (false) | Continúa flujo |
| CR-12 | Open-Meteo responde | G (true) | Confianza calculada |
| CR-13 | Open-Meteo sin datos | G (false) | `confianza = null` |
| CR-14 | ML Service caído (ECONNREFUSED) | H (true) | HTTP 503 |
| CR-15 | Error de BD | H (false) | HTTP 500 |

---

### 3.3 Cobertura de Caminos

Se identifican todos los caminos independientes a través del código (Caminos de McCabe) y se genera un caso de prueba por cada camino.

#### Función: `verificarAlertas` — Grafo de Flujo de Control

```
Inicio
  │
  ▼
[1] Obtener últimas lecturas de todas las estaciones activas
  │
  ▼
[2] Para cada estación, obtener reglas activas
  │
  ├─ [3] ¿Hay reglas? ──No──► [Fin estación]
  │         │
  │        Sí
  │         ▼
  │   [4] Para cada regla, evaluar condición
  │         │
  │    ┌────┴────┐
  │   Sí        No
  │    │         │
  │   [5]       [6]
  │  Crear    Continuar
  │  alerta   siguiente
  │    │       regla
  │    └───┬───┘
  │        │
  │        ▼
  │   [7] ¿Más reglas? ──Sí──► [4]
  │         │
  │        No
  │         ▼
  │   [8] ¿Más estaciones? ──Sí──► [2]
  │         │
  │        No
  │         ▼
  │       [Fin]
```

**Caminos independientes (base = complejidad ciclomática = 4):**

| Camino | Descripción | Caso de Prueba |
|--------|-------------|----------------|
| C1 | Estación sin reglas | Estación activa, 0 reglas configuradas |
| C2 | Regla activa, condición **no** cumplida | Regla `temp > 40`, lectura = `25°C` |
| C3 | Regla activa, condición cumplida | Regla `temp > 40`, lectura = `42°C` → alerta creada |
| C4 | Múltiples reglas, mezcla cumplidas/no | Regla A cumplida, regla B no → solo 1 alerta |

**Complejidad ciclomática:** V(G) = Número de caminos independientes = **4**

#### Función: `build_features` en `ml_service/app.py`

```
Inicio
  │
  ├─ [1] ¿historial tiene ≥ 24 registros?
  │      ├─ Sí: usar 24 lags reales
  │      └─ No: rellenar lags faltantes con valor actual (padding)
  │
  ├─ [2] Calcular deltas (temp[t] - temp[t-1])
  │
  ├─ [3] Calcular rolling means (ventana 3h, 6h, 12h)
  │
  └─ [4] ¿Hay dato de presión disponible?
         ├─ Sí: calcular ecuación Zambretti
         └─ No: feature Zambretti = 0 (neutro)
```

| Camino | Condición | Caso de Prueba |
|--------|-----------|----------------|
| C5 | ≥24 registros + presión disponible | Estación con historial completo |
| C6 | ≥24 registros + sin presión | Historial completo, presión NULL |
| C7 | <24 registros + presión disponible | Estación nueva, pocas lecturas |
| C8 | <24 registros + sin presión | Estación nueva sin sensor BMP280 |

---

### 3.4 Pruebas de Condición

Se verifican todas las combinaciones posibles de condiciones compuestas.

#### Middleware de Autorización (backend)

```javascript
// Condición compuesta en middleware:
function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];  // Cond A
  if (!token) return res.status(401).json(...);
  
  const decoded = verifyJWT(token);                         // Puede lanzar
  if (!decoded) return res.status(401).json(...);           // Cond B
  
  if (decoded.rol !== 'admin') return res.status(403)...;  // Cond C
  
  next();
}
```

| ID | A: token existe | B: JWT válido | C: rol = admin | Resultado |
|----|-----------------|---------------|----------------|-----------|
| CC-01 | No | — | — | HTTP 401 |
| CC-02 | Sí | No (expirado) | — | HTTP 401 |
| CC-03 | Sí | Sí | No (usuario) | HTTP 403 |
| CC-04 | Sí | Sí | Sí (admin) | `next()` — acceso concedido |

#### Función de Confianza en `prediccionController.js`

```javascript
// Condición compuesta para calcular nivel de confianza:
function calcularNivelConfianza(mae, r2, variable) {
  if (r2 >= 0.9 && mae <= umbralBueno[variable]) return 'alta';
  if (r2 >= 0.7 || mae <= umbralAceptable[variable]) return 'media';
  return 'baja';
}
```

| ID | R² | MAE vs umbral | Resultado |
|----|-----|---------------|-----------|
| CC-05 | ≥0.9 | ≤ umbralBueno | `'alta'` |
| CC-06 | ≥0.9 | > umbralBueno | `'media'` (R² cumple OR) |
| CC-07 | 0.7–0.9 | ≤ umbralAceptable | `'media'` (MAE cumple OR) |
| CC-08 | <0.7 | > umbralAceptable | `'baja'` |

---

### 3.5 Análisis de Flujo de Datos

Se verifica que las variables sean correctamente definidas antes de usarse y que no existan anomalías (def sin uso, uso sin def).

#### Variable `historial` en el flujo de predicción

```
[prediccionController.js]
  DEF historial = await prediccionModel.getHistorialEstacion(id)  ← Definición
  USO if (historial.length === 0)                                  ← Uso 1
  USO body = { historial, datos_actuales }                         ← Uso 2
  
[prediccionModel.js → MySQL → Python]
  DEF features = build_features(historial, datos_actuales)         ← Re-DEF
  USO modelos[variable].predict(features)                          ← Uso 3
```

| ID | Variable | Anomalía a Verificar | Prueba |
|----|----------|---------------------|--------|
| FD-01 | `historial` | Uso antes de definición | Verificar que no se use `historial` sin `await` completado |
| FD-02 | `features` | Array con NaN si historial incompleto | Estación nueva (< 25 lecturas) |
| FD-03 | `confianza` | Puede quedar `undefined` si Open-Meteo falla | Simular timeout de Open-Meteo |
| FD-04 | `predicciones` | Array vacío si loop `for` no ejecuta | Llamar con `horas=0` |
| FD-05 | `decoded` (JWT) | Uso de propiedad `.rol` sin verificar si `decoded` es null | Token con payload malformado |

#### Variable `lecturas` en el pipeline MQTT

```
[script_mqtt_a_mysql.py]
  DEF payload = json.loads(mqtt_message)
  DEF gases = payload.get('datos', {}).get('gases', {})  ← DEF con default {}
  USO gas_co2 = gases.get('co2', None)                    ← Uso seguro
  USO INSERT INTO lecturas (..., gas_co2, ...)            ← Uso final
```

| ID | Condición | Anomalía | Prueba |
|----|-----------|----------|--------|
| FD-06 | Payload v2.0 (sin `gases`) | `gases = {}` → `gas_co2 = None` → `NULL` en BD | Enviar JSON sin subobjeto gases |
| FD-07 | Payload v2.1 con `gases.co2` = `"abc"` | Conversión float fallará | Enviar valor no numérico |
| FD-08 | Payload con `datos` ausente | `payload.get('datos', {})` retorna `{}` | Enviar JSON sin clave `datos` |

---

## 4. Matriz de Trazabilidad

Relaciona cada tipo de prueba con el componente del sistema que verifica.

| Componente | Partición Equiv. | Valores Límite | Casos de Uso | Trans. Estados | API REST | UI | Cobertura Sent. | Cobertura Ramas | Caminos | Condición | Flujo Datos |
|------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Auth / Usuarios | ✅ | — | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ |
| Estaciones / Dispositivos | — | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | — | — | — |
| Lecturas (pipeline MQTT) | ✅ | ✅ | — | — | ✅ | — | ✅ | ✅ | — | — | ✅ |
| Sistema de Alertas | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Predicción ML (backend) | ✅ | — | ✅ | — | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| ML Service (FastAPI) | ✅ | — | — | — | ✅ | — | ✅ | ✅ | ✅ | — | ✅ |
| PrediccionChart (React) | ✅ | — | ✅ | — | — | ✅ | — | — | — | — | — |
| Reportes / Exportación | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | — | — | — | — |
| Zonas Climáticas | — | ✅ | — | — | ✅ | — | — | ✅ | — | — | — |

---

## 5. Herramientas Sugeridas

### Para Pruebas de Caja Negra (API y Backend)

| Herramienta | Tipo | Uso en este proyecto |
|-------------|------|---------------------|
| **Postman** | Manual / automatizable | Colecciones para todos los endpoints REST |
| **Thunder Client** (VSCode) | Manual | Pruebas rápidas durante desarrollo |
| **Jest + Supertest** | Automatizado (Node.js) | Pruebas de integración del backend |
| **pytest + httpx** | Automatizado (Python) | Pruebas del ML Service FastAPI |

### Para Pruebas de Caja Negra (Frontend / UI)

| Herramienta | Tipo | Uso en este proyecto |
|-------------|------|---------------------|
| **Cypress** | E2E automatizado | Flujos CU-01 a CU-05 |
| **Playwright** | E2E automatizado | Alternativa a Cypress |
| **React Testing Library** | Unitario React | PrediccionChart, AlertBell |
| **WAVE** | Accesibilidad | Auditoría de componentes (ya utilizado) |

### Para Pruebas de Caja Blanca

| Herramienta | Tipo | Uso en este proyecto |
|-------------|------|---------------------|
| **Jest + c8/nyc** | Cobertura Node.js | Cobertura de sentencias y ramas del backend |
| **pytest-cov** | Cobertura Python | Cobertura del ML Service |
| **Istanbul** | Cobertura JS/TS | Frontend TypeScript |
| **SonarQube** / **SonarCloud** | Análisis estático | Calidad de código, complejidad ciclomática |

### Ejemplo: Configuración mínima Jest para Backend

```json
// backend/package.json (sección jest)
{
  "jest": {
    "testEnvironment": "node",
    "collectCoverage": true,
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 90,
        "lines": 90,
        "statements": 90
      }
    }
  }
}
```

### Ejemplo: Prueba unitaria para `verificarCondicion`

```javascript
// backend/tests/alertaModel.test.js
const { verificarCondicion } = require('../src/models/alertaModel');

describe('verificarCondicion', () => {
  test('CR-01: mayor que — condición cumplida', () => {
    expect(verificarCondicion(36.5, '>', 35)).toBe(true);
  });
  test('CR-02: mayor que — condición no cumplida', () => {
    expect(verificarCondicion(34.0, '>', 35)).toBe(false);
  });
  test('CR-05: mayor o igual — valor igual al umbral', () => {
    expect(verificarCondicion(35.0, '>=', 35)).toBe(true);
  });
  test('CR-09: condición no soportada', () => {
    expect(verificarCondicion(30, 'entre', 35)).toBe(false);
  });
});
```

### Ejemplo: Prueba de integración FastAPI

```python
# ml_service/tests/test_api.py
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def test_health_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert "modelos" in response.json()

def test_predict_variable_invalida():
    response = client.post("/predict", json={
        "variable": "radiacion",
        "horas": 24,
        "datos_actuales": {"temperatura": 22, "humedad": 60, "presion": 1013, "viento": 5},
        "historial": []
    })
    assert response.status_code in [400, 503]

def test_predict_sin_historial():
    response = client.post("/predict", json={
        "variable": "temperatura",
        "horas": 24,
        "datos_actuales": {"temperatura": 22, "humedad": 60, "presion": 1013, "viento": 5},
        "historial": []
    })
    # Con historial vacío, debe usar padding (no fallar)
    assert response.status_code == 200
    assert len(response.json()["predicciones"]) == 24
```

---

*Documento generado para la Memoria Universitaria — Universidad de Talca, Ingeniería en Computación.*
