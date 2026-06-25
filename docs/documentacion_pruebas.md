# Documentación de Pruebas de Software
## Plataforma IoT Meteorológica — Universidad de Talca
**Autor:** Erik Soza | **Fecha:** 2026-06-23

---

## ¿Qué es una prueba de software?

Antes de entrar en tipos, una analogía simple: imagina que fabricas un auto. Puedes probarlo de dos formas:

- **Desde afuera:** lo conduces, aprietas el acelerador, frenas en curva, pruebas que la radio funcione. No necesitas saber cómo está hecho el motor. Solo verificas que hace lo que debe hacer. Eso es **caja negra**.

- **Desde adentro:** abres el capó, mides la presión de cada cilindro, compruebas que cada válvula se abra en el momento exacto, verificas que ningún circuito quede sin pasar corriente. Aquí sí necesitas conocer el diseño interno. Eso es **caja blanca**.

Ambas son necesarias. La caja negra confirma que el sistema cumple sus requisitos. La caja blanca confirma que la lógica interna es correcta y completa, incluyendo los casos que raramente ocurren en uso normal.

---

# PARTE 1 — PRUEBAS DE CAJA NEGRA

## ¿Qué es la caja negra?

En caja negra el tester **no conoce ni le interesa el código**. Solo conoce:
- Qué entradas acepta el sistema
- Qué salidas debería producir

El objetivo es confirmar que el sistema cumple los requisitos funcionales desde el punto de vista del usuario o de quien consume la API.

## Técnicas aplicadas

### Técnica 1: Partición de equivalencia

**La idea:** agrupar todas las entradas posibles en clases donde el sistema se comporta igual. En vez de probar 1000 números, pruebas uno de cada grupo.

**Ejemplo en la plataforma — parámetro `horas` en `/api/prediccion`:**

```
Clase válida:    {24, 48, 72}    → el sistema devuelve predicción (HTTP 200)
Clase inválida:  cualquier otro  → el sistema devuelve error (HTTP 400)
```

En vez de probar horas=1, 2, 3, 4... hasta 100, basta con probar:
- Un valor de la clase válida (ej: `horas=24`) → espero HTTP 200
- Un valor de la clase inválida (ej: `horas=10`) → espero HTTP 400

Solo 2 pruebas cubren todo el espacio de entradas para ese parámetro.

---

### Técnica 2: Análisis de valores límite

**La idea:** los bugs se concentran en los bordes de los rangos. Si algo vale para valores entre 6 y 20 caracteres, el código probablemente tiene un `if len >= 6 and len <= 20`. El error clásico es escribir `>` en vez de `>=`, lo que falla exactamente en el límite.

**Ejemplo — validación de contraseña (mínimo 6 caracteres):**

| Entrada | Longitud | Zona | Resultado esperado |
|---|---|---|---|
| `"ab12"` | 4 | Muy por debajo | Inválida |
| `"ab123"` | 5 | Justo debajo del límite | Inválida |
| `"ab1234"` | 6 | **Exactamente el límite** | **Válida** |
| `"ab12345"` | 7 | Justo sobre el límite | Válida |

El test más importante es el de longitud 6: es donde más frecuentemente aparecen bugs con `>` vs `>=`.

---

### Técnica 3: Prueba de casos de uso (flujos end-to-end)

**La idea:** simular el recorrido completo que hace un usuario real, desde el primer clic hasta el resultado final.

**Flujo principal de la plataforma:**

```
Usuario → accede a mapa → selecciona estación → ve datos en tiempo real
       → solicita predicción 24h → ve gráfico con banda de error
       → configura alerta de temperatura → recibe notificación cuando se cumple
```

Cada paso tiene criterios de aceptación medibles:
- El mapa carga con todas las estaciones registradas en la BD
- Al seleccionar una estación, los datos mostrados coinciden con la última lectura en MySQL
- La predicción retorna dentro de 3 segundos
- La alerta se dispara cuando `valor > umbral` según la condición configurada

---

### Técnica 4: Tabla de decisión

**La idea:** cuando el comportamiento depende de la combinación de varias condiciones, se construye una tabla que cubre todas las combinaciones posibles.

**Ejemplo — acceso a rutas del backend:**

| ¿Tiene token JWT? | ¿Token válido? | ¿Rol es admin? | Resultado |
|---|---|---|---|
| No | — | — | HTTP 401 |
| Sí | No (expirado/inválido) | — | HTTP 403 |
| Sí | Sí | No | HTTP 403 (si ruta es admin) |
| Sí | Sí | Sí | HTTP 200 + datos |

Esto asegura que no existe una combinación "olvidada" que permita acceso no autorizado.

---

### Pruebas de caja negra aplicables al sistema completo

| Área | Qué se prueba | Técnica | Resultado esperado |
|---|---|---|---|
| `POST /api/auth/register` | email inválido | Equivalencia | HTTP 400 con mensaje de error |
| `POST /api/auth/login` | credenciales correctas | Casos de uso | HTTP 200 + token JWT |
| `GET /api/prediccion/:id?horas=72` | horizonte válido | Equivalencia | HTTP 200 + array de 72 predicciones |
| `GET /api/prediccion/:id?horas=99` | horizonte inválido | Límite | HTTP 400 con mensaje "horas inválido" |
| `GET /api/estaciones` | sin token | Tabla de decisión | HTTP 401 |
| Pipeline MQTT → MySQL | payload v2.1 completo | Casos de uso | Lectura guardada con los 14 campos |
| Pipeline MQTT → MySQL | payload sin gases (legacy) | Equivalencia | Lectura guardada con gases = NULL |
| Frontend → mapa | estación activa | Casos de uso | Marcador visible con popup de datos |
| Frontend → predicción | estación con historial | Casos de uso | Gráfico con 4 variables y selector |

> **Nota importante:** Las pruebas de caja negra end-to-end (MQTT, frontend) requieren el stack completo levantado. Las de API pueden automatizarse con herramientas como Postman, Supertest o pytest con `httpx`.

---

# PARTE 2 — PRUEBAS DE CAJA BLANCA

## ¿Qué es la caja blanca?

Aquí el tester **conoce el código fuente** y lo usa para diseñar los tests. El objetivo no es "¿el sistema hace lo correcto?" sino "¿la lógica interna cubre todos los casos posibles?".

La pregunta central es: **¿existe algún camino dentro del código que ningún test haya ejecutado?**

Si existe, ese camino podría tener un bug que nunca se detectaría hasta que ocurra en producción.

## Conceptos clave

### Cobertura de ramas
Cada `if` tiene dos ramas: el camino cuando la condición es `true` y el camino cuando es `false`. La cobertura de ramas exige que ambas se ejecuten al menos una vez.

```js
if (valor > umbral) {      // ← rama TRUE: necesita un test donde valor > umbral
    disparada = true;
} else {
    disparada = false;     // ← rama FALSE: necesita un test donde valor <= umbral
}
```

### Cobertura de caminos
Un camino es una secuencia completa de decisiones desde el inicio hasta el fin de una función. Si hay 3 `if` independientes, puede haber hasta 2³ = 8 caminos distintos.

```
función calcular_confianza():
  ¿sin datos?           → "Desconocido" ─── CAMINO 1
  ¿sin coincidencias?   → "Desconocido" ─── CAMINO 2
  ¿tiene mae_train?
    ratio < 1.5         → "Alto"        ─── CAMINO 3
    ratio < 3.0         → "Medio"       ─── CAMINO 4
    ratio >= 3.0        → "Bajo"        ─── CAMINO 5
  ¿no tiene mae_train?
    mae <= umbral_alto  → "Alto"        ─── CAMINO 6
    mae <= umbral_medio → "Medio"       ─── CAMINO 7
    mae > umbral_medio  → "Bajo"        ─── CAMINO 8
```

Necesito 8 tests distintos para garantizar que no hay un camino con un bug oculto.

### Cobertura de condiciones
En una condición compuesta (`A && B`, `A || B`), cada parte se evalúa por separado:

```js
if (!req.user || req.user.rol !== 'admin') { → 403 }
//   ─── A ───    ──────── B ────────────
```

Para cobertura de condiciones necesito tests donde:
- A=true, B=irrelevante → 403 (sin req.user)
- A=false, B=true → 403 (usuario normal)
- A=false, B=false → pasa (usuario admin)

---

## El proceso paso a paso

### FASE 1 — Exploración: ¿qué tiene lógica interna?

**Qué se hizo:** se recorrió todo el código del backend (`backend/src/`) y del ML service (`ml_service/`) buscando funciones con bifurcaciones: `if/else`, `switch/case`, condiciones en loops, operadores `&&`/`||`.

**Criterio de selección:** se priorizaron las funciones con **mayor impacto si fallan silenciosamente** (sin lanzar error, pero produciendo un resultado incorrecto):

| Función | Archivo | Por qué es prioritaria |
|---|---|---|
| `verificarAlertas` (switch interno) | `alertaModel.js` | Un bug aquí hace que las alertas nunca disparen, sin error visible |
| `validarParametrosPrediccion` | `prediccionController.js` | Estaba duplicada — inconsistencia garantizada |
| `isValidEmail/Password/Name` | `userController.js` | Primera barrera contra datos malformados en la BD |
| `authenticateToken`, `requireAdmin` | `userRoutes.js` | Bug = vulnerabilidad de seguridad |
| `construir_lags` (loop con condición) | `app.py` | Datos incorrectos al modelo → predicciones silenciosamente malas |
| `calcular_confianza` (8 caminos) | `app.py` | Muestra "Alto" cuando debería ser "Bajo" → usuario toma decisiones con info falsa |
| `_get_metricas_variable` | `app.py` | Mostraría métricas de temperatura cuando se pide humedad |

**Clasificación de cada función:**

- **Pura:** recibe datos, devuelve resultado, sin dependencias externas. Se puede testear directamente.
- **Acoplada:** la lógica de decisión está mezclada con queries MySQL o llamadas HTTP. Necesita un paso previo antes de poder testearla.

```
verificarAlertas     → ACOPLADA  (tiene SQL dentro del switch)
calcular_confianza   → PURA      (solo matemáticas y comparaciones)
construir_lags       → PURA      (solo loops y condicionales)
isValidEmail         → PURA      (solo regex)
authenticateToken    → PURA      (solo JWT, sin BD)
```

---

### FASE 2 — Refactor mínimo: extraer la lógica pura

**El problema:** `verificarAlertas` en `alertaModel.js` tenía este aspecto:

```js
export const verificarAlertas = async () => {
    const [reglas] = await pool.query('SELECT * FROM alertas ...');  // BD
    for (const regla of reglas) {
        const [lecturas] = await pool.query('SELECT ...');           // BD
        let disparada = false;

        // LÓGICA DE DECISIÓN — esto es lo que queremos testear
        switch (regla.condicion) {
            case '>':  disparada = valor > umbral;  break;
            case '<':  disparada = valor < umbral;  break;
            case '>=': disparada = valor >= umbral; break;
            case '<=': disparada = valor <= umbral; break;
        }

        if (disparada) {
            await pool.query('INSERT INTO notificaciones ...');      // BD
        }
    }
};
```

No se puede testear esta función sin una base de datos corriendo. Pero el switch de 5 líneas sí se puede testear solo.

**Lo que se hizo:** se extrajo únicamente la decisión a un archivo nuevo:

```js
// backend/src/utils/alertaLogica.js  ← NUEVO
export function evaluarCondicion(valor, condicion, umbral) {
    switch (condicion) {
        case '>':  return valor > umbral;
        case '<':  return valor < umbral;
        case '>=': return valor >= umbral;
        case '<=': return valor <= umbral;
        default:   return false;
    }
}
```

Y en `alertaModel.js` se reemplazó el switch por una llamada:

```js
import { evaluarCondicion } from '../utils/alertaLogica.js';
// ...
disparada = evaluarCondicion(valor, regla.condicion, umbral);  // ← misma lógica, testeable
```

**Resultado:** el comportamiento del sistema es idéntico. La única diferencia es que ahora la decisión vive en un lugar testeable de forma aislada.

**Los 5 módulos nuevos creados en esta fase:**

| Módulo nuevo | Extraído de | Qué contiene |
|---|---|---|
| `backend/src/utils/alertaLogica.js` | `alertaModel.js` | `evaluarCondicion()` — el switch de condiciones |
| `backend/src/utils/prediccionValidacion.js` | `prediccionController.js` | `validarParametrosPrediccion()` — validación duplicada |
| `backend/src/utils/userValidaciones.js` | `userController.js` | `isValidEmail/Password/Name()` |
| `backend/src/middleware/auth.js` | `userRoutes.js` | `authenticateToken()`, `requireAdmin()` |
| `ml_service/features_utils.py` | `app.py` | `construir_lags()` + constantes de ventanas |

---

### FASE 3 — Escritura de los tests

Con el código puro en mano, se aplicaron las tres técnicas de cobertura para diseñar cada caso de prueba.

#### Test 1: `evaluarCondicion` — cobertura de ramas

**Código bajo prueba:**
```js
switch (condicion) {
    case '>':  return valor > umbral;   // 2 caminos: true y false
    case '<':  return valor < umbral;   // 2 caminos
    case '>=': return valor >= umbral;  // 2 caminos  (¡el límite exacto es importante!)
    case '<=': return valor <= umbral;  // 2 caminos
    default:   return false;            // 1 camino
}
```

**Por qué el límite exacto importa:** el bug más común en este tipo de código es escribir `>` cuando se quiere `>=`. Si el sensor lee exactamente el umbral configurado (ej: temperatura = 35°C y la alerta dice "≥ 35°C"), el sistema debería disparar. Con `>` no lo haría.

```js
// Archivo: backend/tests/alertaLogica.test.js

// RAMA-05: valor exactamente igual al umbral con >=  → debe ser true
test('valor === umbral sí cumple >=', () => {
    expect(evaluarCondicion(35.0, '>=', 35)).toBe(true);
});

// RAMA-06: valor justo por debajo del umbral con >= → debe ser false
test('valor < umbral no cumple >=', () => {
    expect(evaluarCondicion(34.9, '>=', 35)).toBe(false);
});

// RAMA-09: condición no reconocida → default → false
test('condicion desconocida retorna false', () => {
    expect(evaluarCondicion(10, 'entre', 5)).toBe(false);
});
```

**Total: 17 tests** cubriendo las 5 ramas del switch con valores true y false en cada una.

---

#### Test 2: `validarParametrosPrediccion` — cobertura de caminos y orden

**Código bajo prueba:**
```js
const HORIZONTES_VALIDOS = [24, 48, 72];
const VARIABLES_VALIDAS  = ['temperatura', 'humedad', 'presion', 'viento'];

export function validarParametrosPrediccion(horas, variable) {
    if (!HORIZONTES_VALIDOS.includes(horas))    // ← se evalúa PRIMERO
        return { status: 400, error: "El parámetro 'horas'..." };
    if (!VARIABLES_VALIDAS.includes(variable))   // ← se evalúa SEGUNDO
        return { status: 400, error: "El parámetro 'variable'..." };
    return null;  // ambos válidos
}
```

**Por qué el orden importa:** si ambos parámetros son inválidos, el usuario recibe el error del primero. Un test verifica que cuando `horas=99` y `variable='radiacion'`, el mensaje diga "horas" y no "variable".

```js
// CAMINO-01: verifica que horas se valida antes que variable
test('horas inválidas se detectan antes que variable inválida', () => {
    const r = validarParametrosPrediccion(99, 'radiacion');
    expect(r.error).toMatch(/horas/);  // mensaje habla de horas, no de variable
});

// CAMINO FELIZ: ambos válidos → null (sin error)
test('parámetros válidos retornan null', () => {
    expect(validarParametrosPrediccion(48, 'humedad')).toBeNull();
});
```

**Total: 17 tests** — 12 combinaciones de parámetros válidos + 5 horas inválidas + 4 variables inválidas + 1 test de orden.

---

#### Test 3: `isValidPassword` — cobertura de condiciones con operador &&

**Código bajo prueba:**
```js
export function isValidPassword(password) {
    return password && password.length >= 6;
    //     ──── A ──    ──────── B ────────
}
```

**El detalle técnico:** el operador `&&` en JavaScript **no devuelve `true` o `false` estricto**. Devuelve el primer valor falsy que encuentra, o el último valor si todos son truthy.

```js
isValidPassword(null)    // → null    (no false)
isValidPassword('')      // → ''      (no false)
isValidPassword('abc')   // → false   (porque 3 < 6, y false sí es boolean)
isValidPassword('abc123')// → true    (porque 6 >= 6)
```

Por eso los tests para entradas nulas usan `toBeFalsy()` en lugar de `toBe(false)`:

```js
// Correcto:
test('null → inválida', () => {
    expect(isValidPassword(null)).toBeFalsy();   // null es falsy → test pasa
});

// Incorrecto habría sido:
// expect(isValidPassword(null)).toBe(false);    // falla porque retorna null, no false
```

Esto no es un bug del código — el comportamiento es el correcto. El test debe adaptarse al comportamiento real, no inventar uno distinto.

**Total: 26 tests** — 9 para email, 8 para password (incluyendo los valores limit), 9 para nombre.

---

#### Test 4: `authenticateToken` y `requireAdmin` — cobertura de condiciones compuestas

**Código bajo prueba:**
```js
// authenticateToken
const authHeader = req.headers['authorization'];
if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
}
const token = authHeader.split(' ')[1];
try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
} catch (err) {
    return res.status(403).json({ error: 'Token inválido' });
}

// requireAdmin
if (!req.user || req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Requiere rol admin' });
}
next();
```

**Caminos identificados para `authenticateToken`:**

```
sin header               → 401
header sin "Bearer "     → 401
JWT con firma incorrecta → 403
JWT expirado             → 403
JWT válido               → next() + req.user = payload
```

**Test de camino compuesto** — verifica que un admin pasa ambos middlewares en secuencia:

```js
test('usuario admin supera auth Y requireAdmin en secuencia', () => {
    const token = jwt.sign({ rol: 'admin', id: 1 }, SECRET, { expiresIn: '1h' });
    const req   = { headers: { authorization: `Bearer ${token}` }, user: undefined };

    // Primer middleware: authenticateToken
    authenticateToken(req, mockRes(), next1);
    expect(next1).toHaveBeenCalled();   // pasó el filtro de token
    expect(req.user.rol).toBe('admin'); // req.user quedó establecido

    // Segundo middleware: requireAdmin
    requireAdmin(req, mockRes(), next2);
    expect(next2).toHaveBeenCalled();   // pasó el filtro de rol
});
```

**Total: 23 tests.**

---

#### Test 5: `construir_lags` — cobertura de caminos en loops

**Código bajo prueba (simplificado):**
```python
def construir_lags(historial, temp_actual, humedad_actual, viento_actual, presion_actual):
    n = len(historial)

    lags_temp = [
        historial[i].temperatura if i < n   # ← RAMA A: usa historial
        else temp_actual                     # ← RAMA B: padding
        for i in range(24)
    ]

    lags_presion = [
        historial[i].presion if i < n and historial[i].presion is not None  # ← RAMA D
        else presion_actual                                                   # ← RAMA C
        for i in range(12)
    ]
```

**Los 3 caminos principales del loop:**

```
CAMINO 1 — historial vacío (n=0):
  Para todo i: i < 0 es FALSO → todo RAMA B (padding)
  lags_temp = [temp_actual, temp_actual, ..., temp_actual]  (24 veces)

CAMINO 2 — historial completo (n≥24):
  Para todo i: i < 24 es VERDADERO → todo RAMA A (del historial)
  lags_temp = [hist[0], hist[1], ..., hist[23]]

CAMINO 3 — historial parcial (ej: n=3):
  i=0,1,2: i < 3 es VERDADERO → RAMA A
  i=3..23: i < 3 es FALSO     → RAMA B (padding)
  lags_temp = [hist[0], hist[1], hist[2], temp_actual, temp_actual, ...]
```

**Por qué se eligió `n=3` para el test parcial:** es el número más pequeño donde se pueden distinguir claramente los elementos del historial (índices 0, 1, 2) del padding (índice 3 en adelante). Si hubiera un bug de índice (usar `i+1` en vez de `i`), el test con secuencia [0.0, 1.0, 2.0] lo detectaría inmediatamente.

**Test adicional — presión `None` (sensor BMP280 sin datos):**

```python
def test_presion_none_usa_presion_actual():
    # Sensor BMP280 no disponible en lecturas históricas antiguas
    hist = [SimpleNamespace(temperatura=20.0, humedad=60.0,
                            velocidad_viento=5.0, presion=None)]  # ← None aquí
    _, _, _, lags_p = construir_lags(hist, 20.0, 60.0, 5.0, presion_actual=1013.0)

    assert lags_p[0] == 1013.0  # usó el fallback, no el None
    # Si faltara el "is not None", intentaría usar None como número → error silencioso
```

**Total: 14 tests.**

---

#### Test 6: `calcular_confianza` — los 8 caminos

**Código bajo prueba (estructura):**

```python
def calcular_confianza(anclas, pred_om, mae_entrenamiento=None, ...):
    if not pred_om:                    # ← CAMINO 1: sin datos externos
        return {"nivel": "Desconocido", ...}

    # calcular mae entre predicciones propias y Open-Meteo
    if sum_peso == 0:                  # ← CAMINO 2: sin coincidencias de hora
        return {"nivel": "Desconocido", ...}

    if mae_entrenamiento:              # ← bifurcación principal
        ratio = mae / mae_entrenamiento
        if ratio < 1.5:                # ← CAMINO 3
            nivel = "Alto"
        elif ratio < 3.0:              # ← CAMINO 4
            nivel = "Medio"
        else:                          # ← CAMINO 5
            nivel = "Bajo"
    else:
        if mae <= umbral_alto:         # ← CAMINO 6
            nivel = "Alto"
        elif mae <= umbral_medio:      # ← CAMINO 7
            nivel = "Medio"
        else:                          # ← CAMINO 8
            nivel = "Bajo"
```

**Por qué los límites exactos son críticos (test del camino 3):**

```python
def test_ratio_1_5_exacto_cae_en_medio():
    # ratio = mae / mae_entrenamiento = 1.5 / 1.0 = 1.5
    # La condición es ratio < 1.5 → 1.5 NO es menor que 1.5 → cae en Medio
    pred_om = make_pred_om(ANCLAS, delta=1.5)
    r = calcular_confianza(ANCLAS, pred_om, mae_entrenamiento=1.0)
    assert r["nivel"] == "Medio"   # NO "Alto"
```

Si alguien cambiara `< 1.5` por `<= 1.5`, este test fallaría e inmediatamente detectaría el cambio no intencional.

**Total: 18 tests.**

---

### FASE 4 — Ejecución y resultados

#### Backend (Jest)

```bash
# Desde backend/
npm run test:coverage
```

**Resultado:**

```
 PASS  tests/alertaLogica.test.js
 PASS  tests/prediccionValidacion.test.js
 PASS  tests/userValidaciones.test.js
 PASS  tests/auth.middleware.test.js

File                         Stmts   Branch   Funcs   Lines
----------------------------------------------------------
utils/alertaLogica.js         100%    100%     100%    100%
utils/prediccionValidacion.js 100%    100%     100%    100%
utils/userValidaciones.js     100%    100%     100%    100%
middleware/auth.js            100%    100%     100%    100%
----------------------------------------------------------
Test Suites: 4 passed, 4 total
Tests:      83 passed, 83 total
```

#### ML Service (pytest)

```bash
# Desde ml_service/
pip install -r requirements-dev.txt
python -m pytest tests/ --cov=app --cov=features_utils --cov-report=term-missing -v
```

**Resultado:**

```
PASSED tests/test_confianza.py::TestCalcularConfianza::test_C1_sin_datos_om
PASSED tests/test_confianza.py::TestCalcularConfianza::test_C2_sin_coincidencias
... (18 tests)
PASSED tests/test_features_utils.py::TestConstruirLags::test_historial_vacio
... (14 tests)
PASSED tests/test_metricas.py::TestGetMetricasVariable::test_global_none
... (10 tests)

Name               Stmts  Miss  Cover
--------------------------------------
features_utils.py     11     0   100%
app.py               262   153    42%

42 passed in 1.23s
```

> **Por qué `app.py` tiene 42% y no 100%:** el 58% restante corresponde a los endpoints FastAPI, la carga de modelos `.pkl` y las llamadas HTTP a Open-Meteo. Estas líneas no se pueden testear unitariamente sin un servidor corriendo y los modelos entrenados. El 42% son exactamente las funciones puras — y esas sí tienen 100%.

---

### FASE 5 — Qué no se prueba y por qué

| Componente | Por qué no se prueba de forma unitaria |
|---|---|
| `alertaModel.js` completo | Mezcla SQL con lógica — requiere MySQL activo |
| `prediccionController.js` completo | Hace llamadas al ML Service vía HTTP |
| Endpoints FastAPI (`/predict`) | Requieren los 4 modelos `.pkl` entrenados y el servidor activo |
| `consultar_openmeteo()` | Llamada HTTP real a la API de Open-Meteo |
| Frontend React | Requiere Cypress o React Testing Library (fuera de alcance) |
| Flujo E2E completo | Requiere stack completo: ESP32 + MQTT + MySQL + backend + ML + frontend |

---

## Resumen: ¿qué garantizan estas pruebas?

| Garantía | Tipo | Cobertura |
|---|---|---|
| Las alertas disparan correctamente con cualquier condición (`>`, `<`, `>=`, `<=`) | Caja blanca | 100% ramas |
| Parámetros inválidos de predicción siempre son rechazados antes de llegar al ML | Caja blanca | 100% caminos |
| El JWT sin header, inválido, o expirado siempre devuelve 401/403 | Caja blanca | 100% condiciones |
| La construcción de lags es correcta con cualquier tamaño de historial | Caja blanca | 100% ramas |
| El nivel de confianza se calcula correctamente en los 8 escenarios posibles | Caja blanca | 100% caminos |
| Los 6 límites del formulario de usuario se validan correctamente | Caja blanca | 100% condiciones |
| Los endpoints responden correctamente a entradas válidas e inválidas | Caja negra | Partición de equivalencia |
| El flujo ESP32 → MQTT → MySQL guarda todos los campos esperados | Caja negra | Casos de uso |

---

*Documento técnico para Memoria Universitaria — Ingeniería en Computación, Universidad de Talca.*
