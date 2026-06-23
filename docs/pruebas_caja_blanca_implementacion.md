# Implementación de Pruebas de Caja Blanca
## Plataforma IoT Meteorológica — Universidad de Talca

**Autor:** Erik Soza  
**Fecha:** 2026-06-23  
**Estado:** ✅ Implementado y ejecutado — 125 tests, 100% cobertura en módulos críticos

---

## 1. ¿Qué son las pruebas de caja blanca?

Las pruebas de **caja blanca** (también llamadas *pruebas estructurales* o *glass-box testing*) verifican el comportamiento interno del código. A diferencia de la caja negra —que solo mira entradas y salidas—, aquí el tester **conoce el código fuente** y diseña casos específicamente para ejecutar cada rama, camino y condición posible.

El objetivo es garantizar que **ningún camino lógico quede sin ejecutar**, lo que permite detectar bugs en condiciones poco comunes (valores límite, entradas nulas, combinaciones de parámetros poco frecuentes).

---

## 2. ¿Qué se hizo? — Resumen del trabajo

El proceso se ejecutó en 4 fases:

### Fase 1: Exploración del código
Se recorrió todo `backend/src/` y `ml_service/` buscando funciones con **lógica de decisión** (condicionales, switches, loops con condiciones). Se clasificó cada función como:

- **Pura**: recibe datos, devuelve resultado, sin dependencias externas (BD, red). Se puede testear directamente.
- **Acoplada**: mezcla lógica de decisión con queries MySQL o llamadas HTTP. Necesita refactor previo.

### Fase 2: Refactor mínimo
Se extrajeron las decisiones de las funciones acopladas a **módulos nuevos** sin tocar el comportamiento. La aplicación sigue funcionando exactamente igual.

**Módulos creados:**

| Módulo nuevo | Qué contiene | Extraído de |
|---|---|---|
| `backend/src/utils/alertaLogica.js` | `evaluarCondicion()` | `alertaModel.js` — el switch de condiciones |
| `backend/src/utils/prediccionValidacion.js` | `validarParametrosPrediccion()` | `prediccionController.js` — validación duplicada |
| `backend/src/utils/userValidaciones.js` | `isValidEmail/Password/Name()` | `userController.js` — funciones locales |
| `backend/src/middleware/auth.js` | `authenticateToken()`, `requireAdmin()` | `userRoutes.js` — middlewares locales |
| `ml_service/features_utils.py` | `construir_lags()` + constantes | `app.py` — construcción de lags en `predict_post` |

### Fase 3: Tests
Se escribieron 125 tests automatizados divididos en dos suites:

- **Backend**: 4 archivos Jest, 83 tests
- **ML Service**: 3 archivos pytest, 42 tests

### Fase 4: Ejecución y cobertura
Todos los tests pasan. Los módulos críticos tienen **100% de cobertura**.

---

## 3. Estructura de archivos creados

```
plataformaIoT/
├── backend/
│   ├── src/
│   │   ├── utils/
│   │   │   ├── alertaLogica.js          ← evaluarCondicion()
│   │   │   ├── prediccionValidacion.js  ← validarParametrosPrediccion()
│   │   │   └── userValidaciones.js      ← isValidEmail/Password/Name()
│   │   └── middleware/
│   │       └── auth.js                  ← authenticateToken(), requireAdmin()
│   └── tests/
│       ├── alertaLogica.test.js         ← 17 tests (switch de alertas)
│       ├── prediccionValidacion.test.js ← 17 tests (validación de parámetros)
│       ├── userValidaciones.test.js     ← 26 tests (validación de campos)
│       ├── auth.middleware.test.js      ← 23 tests (JWT + roles)
│       └── README.md
└── ml_service/
    ├── features_utils.py                ← construir_lags() + constantes
    ├── pytest.ini                       ← configuración de pytest
    ├── requirements-dev.txt             ← pytest, pytest-cov
    └── tests/
        ├── __init__.py
        ├── conftest.py                  ← fixtures compartidas
        ├── test_confianza.py            ← 18 tests (calcular_confianza)
        ├── test_features_utils.py       ← 14 tests (construir_lags)
        ├── test_metricas.py             ← 10 tests (_get_metricas_variable)
        └── README.md
```

---

## 4. ¿Qué hace cada módulo y por qué es crítico?

### 4.1 `evaluarCondicion(valor, condicion, umbral)` — `alertaLogica.js`

**Qué hace:** Decide si un valor medido por un sensor cumple la condición de una regla de alerta. Es el núcleo del sistema de alertas.

**Por qué es crítico:** Si hay un bug aquí, **ninguna alerta funciona**. Un error en el operador `>=` haría que alertas de "mayor o igual" nunca disparen.

**Ramas que tiene:**
```
switch (condicion):
  case '>':  → rama A
  case '<':  → rama B
  case '>=': → rama C
  case '<=': → rama D
  default:   → rama E (condición no reconocida)
```

**Ejemplo de test:**
```js
// RAMA-07: valor === umbral debe cumplir >= (el límite es inclusivo)
test('valor === umbral sí cumple >=', () => {
  expect(evaluarCondicion(35.0, '>=', 35)).toBe(true);
});
```
Este test es importante porque un bug típico sería usar `>` en vez de `>=`, haciendo que el valor exacto al umbral no dispare la alerta.

---

### 4.2 `validarParametrosPrediccion(horas, variable)` — `prediccionValidacion.js`

**Qué hace:** Valida que los parámetros de una predicción sean válidos antes de llamar al ML Service. Retorna `null` si son válidos o un objeto `{status, error}` si no.

**Por qué es crítico:** Estaba duplicado en dos funciones del controlador (`getPrediccion` y `getPrediccionZona`). Un bug en la validación haría que el sistema llame al ML Service con parámetros incorrectos.

**Ramas que tiene:**
```
if horas no está en [24, 48, 72]  → error "horas inválido"   (se evalúa PRIMERO)
if variable no está en lista       → error "variable inválida"
ambos válidos                      → retorna null
```

**Ejemplo de test:**
```js
// CAMINO-01: el orden de validación importa
test('horas inválidas se detectan ANTES que variable inválida', () => {
  const r = validarParametrosPrediccion(99, 'radiacion');
  expect(r.error).toMatch(/horas/);   // error de horas, no de variable
});
```
Este test verifica que si ambos parámetros son inválidos, el mensaje de error sea correcto (primero reporta `horas`, no `variable`).

---

### 4.3 `isValidEmail / isValidPassword / isValidName` — `userValidaciones.js`

**Qué hacen:** Validan el formato de los campos de usuario antes de guardarlos en la base de datos.

**Por qué son críticas:** Son la primera línea de defensa contra datos malformados. Si `isValidEmail` tiene un bug, usuarios con emails inválidos podrían registrarse.

**Ramas de `isValidPassword`:**
```
password falsy (null, undefined, '', 0)  → retorna valor falsy
password.length < 6                       → retorna false
password.length >= 6                      → retorna true
```

**Nota sobre los tests:** La función usa el operador `&&` en JavaScript, que **devuelve el valor falsy original**, no `false` estricto. Por eso los tests para entradas nulas usan `toBeFalsy()` en lugar de `toBe(false)`:
```js
// La función retorna '' (no false), pero '' es falsy — ambos son inválidos
expect(isValidPassword('')).toBeFalsy();
```

---

### 4.4 `authenticateToken` y `requireAdmin` — `auth.js`

**Qué hacen:** Son middlewares de Express que protegen las rutas.
- `authenticateToken`: verifica que el JWT en el header `Authorization` sea válido.
- `requireAdmin`: verifica que el usuario autenticado tenga rol `admin`.

**Por qué son críticos:** Un bug aquí podría permitir acceso no autorizado a rutas de administración, o bloquear a usuarios legítimos.

**Ramas de `authenticateToken`:**
```
sin header Authorization   → 401
header sin "Bearer "       → 401 (split(' ')[1] = undefined)
JWT con firma incorrecta   → 403
JWT expirado               → 403
JWT válido                 → next(), req.user = payload
```

**Ramas de `requireAdmin`:**
```
req.user ausente           → 403
req.user.rol ≠ 'admin'    → 403
req.user.rol = 'admin'    → next()
```

**Ejemplo de test de camino compuesto:**
```js
// CAMINO-02: verifica que un admin pasa AMBOS middlewares
test('admin pasa auth Y admin', () => {
  const token = jwt.sign({ rol: 'admin' }, SECRET, { expiresIn: '1h' });
  const req = { headers: { authorization: `Bearer ${token}` } };

  authenticateToken(req, res, next);
  expect(next).toHaveBeenCalled();   // pasó auth

  requireAdmin(req, res2, next2);
  expect(next2).toHaveBeenCalled();  // pasó admin
});
```

---

### 4.5 `construir_lags(historial, ...)` — `features_utils.py`

**Qué hace:** Construye los 4 arrays de lags (temperatura, humedad, viento, presión) que el modelo XGBoost necesita como entrada. Si el historial es más corto que la ventana requerida, rellena con el valor actual (padding).

**Por qué es crítico:** Si los lags están mal construidos, el modelo predice con datos incorrectos. En particular, la lógica de presión `None` es importante porque el sensor BMP280 puede no estar disponible en lecturas antiguas.

**Ramas que tiene:**
```
Para temperatura, humedad, viento:
  i < n_historial  → usa historial[i].campo   (RAMA-A)
  i >= n_historial → usa valor_actual          (RAMA-B, padding)

Para presión (rama adicional):
  i < n AND presion is not None → usa historial[i].presion  (RAMA-D)
  i >= n OR presion is None     → usa presion_actual        (RAMA-C, fallback)
```

**Caminos identificados:**
- `CAMINO-1`: historial vacío → todo padding
- `CAMINO-2`: historial completo (≥ ventana) → todo del historial
- `CAMINO-3`: historial parcial (mezcla)

**Ejemplo de test:**
```python
# RAMA-C: sensor BMP280 sin datos en una lectura histórica
def test_presion_none_usa_presion_actual(self):
    hist = [SimpleNamespace(temperatura=20.0, humedad=60.0,
                            velocidad_viento=5.0, presion=None)]
    _, _, _, lp = construir_lags(hist, 20.0, 60.0, 5.0, 1013.0)
    assert lp[0] == 1013.0   # usa el fallback, no el None
```

---

### 4.6 `calcular_confianza(anclas, pred_om, ...)` — `app.py`

**Qué hace:** Compara las predicciones del modelo local contra Open-Meteo en los puntos ancla (T+24h, T+48h, T+72h) y asigna un nivel de confianza: Alto 🟢, Medio 🟡 o Bajo 🔴.

**Por qué es crítico:** Es lo que el usuario ve en el frontend para decidir si confiar en la predicción. Un bug aquí podría mostrar "Alto" cuando en realidad el modelo difiere mucho de Open-Meteo.

**8 caminos independientes (complejidad ciclomática = 8):**

| Camino | Condición | Resultado |
|---|---|---|
| C1 | `pred_om` es None o `[]` | "Desconocido" ⚪ |
| C2 | Ninguna ancla coincide con horas de Open-Meteo | "Desconocido" ⚪ |
| C3 | Con `mae_entrenamiento`, `ratio < 1.5` | "Alto" 🟢 |
| C4 | Con `mae_entrenamiento`, `1.5 ≤ ratio < 3.0` | "Medio" 🟡 |
| C5 | Con `mae_entrenamiento`, `ratio ≥ 3.0` | "Bajo" 🔴 |
| C6 | Sin `mae_entrenamiento`, `mae ≤ u_alto(horizonte)` | "Alto" 🟢 |
| C7 | Sin `mae_entrenamiento`, `mae ≤ u_medio(horizonte)` | "Medio" 🟡 |
| C8 | Sin `mae_entrenamiento`, `mae > u_medio(horizonte)` | "Bajo" 🔴 |

**Ejemplo de test de límite exacto:**
```python
# Límite: ratio=1.5 no cumple "< 1.5", cae en Medio
def test_C3_limite_exacto_ratio_1_5(self):
    pred_om = make_pred_om(ANCLAS, delta=1.5)  # MAE ≈ 1.5, mae_train=1.0
    r = calcular_confianza(ANCLAS, pred_om, mae_entrenamiento=1.0)
    assert r["nivel"] == "Medio"  # no "Alto"
```
Este test es valioso porque verifica exactamente el comportamiento en el límite, donde los bugs de `<` vs `<=` son más comunes.

---

### 4.7 `_get_metricas_variable(variable, horas)` — `app.py`

**Qué hace:** Lee las métricas de entrenamiento (MAE, R², nivel) para una variable y horizonte específico desde el archivo `metricas.json`.

**Por qué es crítico:** Estas métricas aparecen en el frontend. Si la función no distingue el formato v5 del legacy v4, mostraría datos de temperatura cuando el usuario pidió humedad.

**Ramas:**
```
metricas_globales is None              → None
variable en formato v5:
  horizonte existe                     → dict con métricas
  horizonte no existe                  → None
variable NO en v5:
  variable == 'temperatura' (legacy)   → busca formato antiguo
  variable != 'temperatura'            → {} → None
```

---

## 5. Resultados de cobertura

### Backend (Jest)

```
File                      | % Stmts | % Branch | % Funcs | % Lines
--------------------------|---------|----------|---------|--------
middleware/auth.js        |   100   |   100    |   100   |   100
utils/alertaLogica.js     |   100   |   100    |   100   |   100
utils/prediccionValidacion|   100   |   100    |   100   |   100
utils/userValidaciones.js |   100   |   100    |   100   |   100
--------------------------+---------+----------+---------+--------
TOTAL                     |   100   |   100    |   100   |   100

Test Suites: 4 passed
Tests:       83 passed
```

### ML Service (pytest)

```
Name               Stmts  Miss  Cover
--------------------------------------
features_utils.py     11     0   100%
app.py               262   153    42%   (solo funciones puras testeadas)

42 passed
```

> **Nota sobre `app.py` al 42%:** El 58% restante corresponde a los endpoints FastAPI, la carga de modelos `.pkl` y las llamadas a Open-Meteo — funciones que requieren infraestructura (servidor activo, modelos entrenados, red) y están fuera del alcance de las pruebas unitarias.

---

## 6. Cómo ejecutar las pruebas

### Backend

```bash
# Desde plataformaIoT/backend/

# Solo ejecutar (sin reporte)
npm test

# Ejecutar con reporte de cobertura
npm run test:coverage
```

**Requisitos:** Node.js ≥ 20, `npm install` (Jest ya incluido como devDependency)  
**No requiere:** MySQL, servidor Express corriendo, variables de entorno

---

### ML Service

```bash
# Desde plataformaIoT/ml_service/

# Instalar dependencias de testing (solo la primera vez)
pip install -r requirements-dev.txt

# Ejecutar con cobertura y detalle por línea
python -m pytest tests/ --cov=app --cov=features_utils --cov-report=term-missing -v
```

**Requisitos:** Python ≥ 3.10, dependencias de `requirements.txt`  
**No requiere:** Modelos `.pkl`, servidor FastAPI corriendo, conexión a internet

---

## 7. ¿Por qué estas pruebas y no otras?

### Por qué se eligió caja blanca

Las pruebas de caja negra (endpoints, UI) verifican **qué hace** el sistema. Las de caja blanca verifican **cómo lo hace**. Para una memoria universitaria, ambas son necesarias:

- Las de caja negra demuestran que el sistema cumple sus requisitos funcionales.
- Las de caja blanca demuestran que la **lógica interna es correcta y completa**, especialmente en los casos extremos.

### Por qué estos módulos específicos

Se priorizaron las funciones con **mayor impacto si fallan**:

1. **`evaluarCondicion`** — falla silenciosa: el sistema no daría errores, simplemente nunca dispararía alertas (o las dispararía siempre).
2. **`calcular_confianza`** — afecta directamente la información que ve el usuario final sobre la fiabilidad del modelo.
3. **`construir_lags`** — datos de entrada incorrectos al modelo XGBoost producirían predicciones silenciosamente erróneas, sin lanzar ninguna excepción.
4. **Middlewares JWT** — un bug aquí es una vulnerabilidad de seguridad, no solo un error funcional.

### Por qué no se mockeó la base de datos

Siguiendo el principio de no crear mocks frágiles: las funciones que mezclan lógica de negocio con SQL (`verificarAlertas`, `getHistorialEstacion`) se testearon extrayendo **solo** la lógica pura a módulos separados. Esto es más robusto que mockar `mysql2/pool` porque los mocks de BD tienden a romperse cuando cambia el esquema.

---

## 8. Limitaciones conocidas

| Área | Qué no está cubierto | Por qué |
|---|---|---|
| Controllers completos | `userController`, `alertaController`, `prediccionController` | Dependen de MySQL activo |
| Endpoints FastAPI | `GET /predict`, `POST /predict` | Requieren modelos `.pkl` entrenados |
| Open-Meteo | `consultar_openmeteo()` | Llamada HTTP externa |
| Frontend React | `PrediccionChart`, `AlertBell` | Fuera del scope (requiere Cypress o React Testing Library) |
| Integración E2E | Flujo completo ESP32 → MQTT → MySQL → API → Frontend | Requiere stack completo levantado |

---

*Documento generado para la Memoria Universitaria — Ingeniería en Computación, Universidad de Talca.*
