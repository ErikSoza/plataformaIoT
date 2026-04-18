import express from 'express';
import { listZonas, getZona, postZona, putZona, removeZona, addEstacion, removeEstacion } from '../controllers/zonaController.js';

const router = express.Router();

router.get('/zonas', listZonas);
router.get('/zonas/:id', getZona);
router.post('/zonas', postZona);
router.put('/zonas/:id', putZona);
router.delete('/zonas/:id', removeZona);
router.post('/zonas/:id/estaciones', addEstacion);
router.delete('/zonas/:id/estaciones/:estacion_id', removeEstacion);

export default router;
