import express from 'express';
import { getPrediccion, getPrediccionZona } from '../controllers/prediccionController.js';

const router = express.Router();

router.get('/prediccion/zona/:zona_id', getPrediccionZona);
router.get('/prediccion/:estacion_id', getPrediccion);

export default router;
