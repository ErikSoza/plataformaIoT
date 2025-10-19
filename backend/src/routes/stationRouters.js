import express from 'express';
import {
    getStations,
    getStation,
    createStation,
    updateStationById,
    removeStation,
} from '../controllers/stationContorollers.js';

const router = express.Router();

router.get('/estaciones', getStations);
router.get('/estaciones/:id', getStation);
router.post('/estaciones', createStation);
router.put('/estaciones/:id', updateStationById);
router.delete('/estaciones/:id', removeStation);

export default router;
