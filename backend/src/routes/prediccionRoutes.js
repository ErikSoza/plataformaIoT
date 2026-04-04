import express from 'express';
import { getPrediccion } from '../controllers/prediccionController.js';

const router = express.Router();

router.get('/prediccion/:estacion_id', getPrediccion);

export default router;
