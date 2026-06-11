import express from 'express';
import {
  getReglas,
  getReglasByEstacion,
  createRegla,
  updateRegla,
  deleteRegla,
  toggleRegla,
  getAlertas,
  verificarAlertas,
  marcarLeida,
  marcarTodasLeidas,
} from '../controllers/alertaController.js';

const router = express.Router();

// ── Reglas (umbrales configurados por el usuario) ─────────────────────────────
router.get('/alertas/reglas',               getReglas);
router.get('/alertas/reglas/estacion/:id',  getReglasByEstacion);
router.post('/alertas/reglas',              createRegla);
router.put('/alertas/reglas/:id',           updateRegla);
router.delete('/alertas/reglas/:id',        deleteRegla);
router.patch('/alertas/reglas/:id/toggle',  toggleRegla);

// ── Alertas (eventos disparados) ─────────────────────────────────────────────
router.get('/alertas',                      getAlertas);
router.post('/alertas/verificar',           verificarAlertas);
// leer-todas DEBE ir antes de /:id para evitar conflicto de rutas
router.patch('/alertas/leer-todas',         marcarTodasLeidas);
router.patch('/alertas/:id/leer',           marcarLeida);

export default router;
