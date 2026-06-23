# Tests de Caja Blanca — Backend

## Cómo ejecutar

```bash
# Desde la carpeta backend/
npm run test:coverage
```

## Qué cubren

| Archivo de test | Módulo testeado | Tests | Cobertura |
|---|---|---|---|
| `alertaLogica.test.js` | `src/utils/alertaLogica.js` | 17 | 100% |
| `prediccionValidacion.test.js` | `src/utils/prediccionValidacion.js` | 17 | 100% |
| `userValidaciones.test.js` | `src/utils/userValidaciones.js` | 26 | 100% |
| `auth.middleware.test.js` | `src/middleware/auth.js` | 23 | 100% |

## Qué NO cubren

- Controladores completos (`userController`, `prediccionController`, `alertaController`): dependen de MySQL y no se pueden testear sin la base de datos activa.
- Modelos (`alertaModel`, `prediccionModel`): mezclan lógica con queries SQL — requieren una BD de prueba o mocks de `pool`.
- Endpoints Express completos: requieren levantar el servidor con `supertest`.
- Frontend React: no está en el scope de estas pruebas.
