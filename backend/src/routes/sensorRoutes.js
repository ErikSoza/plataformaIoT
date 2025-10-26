import express from 'express';
import {
    getSensors,
    getSensorsByStationId,
    getSensor,
    createSensor,
    updateSensorById,
    removeSensor,
} from '../controllers/sensorControllers.js';

const router = express.Router();

router.get('/sensores', getSensors);
router.get('/sensores/:id', getSensor);
router.get('/estaciones/:stationId/sensores', getSensorsByStationId);
router.post('/sensores', createSensor);
router.put('/sensores/:id', updateSensorById);
router.delete('/sensores/:id', removeSensor);

export default router;