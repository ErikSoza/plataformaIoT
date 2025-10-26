import express from 'express';
import {
    getReadings,
    getReadingsBySensorId,
    getReadingsByStationId,
    getLatestReadingsByStationId,
    getReading,
    createReading,
    getStats,
} from '../controllers/readingControllers.js';

const router = express.Router();

router.get('/lecturas', getReadings);
router.get('/lecturas/:id', getReading);
router.get('/sensores/:sensorId/lecturas', getReadingsBySensorId);
router.get('/estaciones/:stationId/lecturas', getReadingsByStationId);
router.get('/estaciones/:stationId/lecturas/latest', getLatestReadingsByStationId);
router.get('/estadisticas', getStats);
router.post('/lecturas', createReading);

export default router;