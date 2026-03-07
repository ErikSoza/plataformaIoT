import express from 'express';
import {
    getAvailableDevicesController,
    assignDevice,
    releaseDevice,
    getStationDevice,
    getAllDevices,
    removeDevice
} from '../controllers/deviceControllers.js';

const router = express.Router();

// Rutas para dispositivos
router.get('/dispositivos', getAllDevices);
router.get('/dispositivos/disponibles', getAvailableDevicesController);
router.get('/dispositivos/estacion/:stationId', getStationDevice);
router.post('/dispositivos/asignar', assignDevice);
router.put('/dispositivos/:deviceId/liberar', releaseDevice);
router.delete('/dispositivos/:deviceId', removeDevice);

export default router;