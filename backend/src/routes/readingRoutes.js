import express from 'express';
import {
    getReadings,
    getReadingsByStationId,
    getLatestReadingByStationId,
    getLatestReadingsAll,
    getReading,
    createReading,
    getStats,
    getGlobalStatsController,
    getReadingsForReports,
} from '../controllers/readingControllers.js';

const router = express.Router();

router.get('/lecturas', getReadings);
router.get('/lecturas/:id', getReading);
router.get('/lecturas/reports', getReadingsForReports);
router.get('/estaciones/:stationId/lecturas', getReadingsByStationId);
router.get('/estaciones/:stationId/lecturas/latest', getLatestReadingByStationId);
router.get('/lecturas/latest', getLatestReadingsAll);
router.get('/estadisticas', getStats);
router.get('/estadisticas/global', getGlobalStatsController);
router.post('/lecturas', createReading);

export default router;