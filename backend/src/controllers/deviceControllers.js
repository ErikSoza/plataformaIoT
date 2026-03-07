import {
    getAvailableDevices,
    getDeviceByStationId,
    assignDeviceToStation,
    releaseDeviceFromStation,
    getAllDevicesWithStation,
    deleteDevice
} from '../models/deviceModel.js';

// Obtener todos los dispositivos disponibles
export const getAvailableDevicesController = async (req, res) => {
    try {
        const devices = await getAvailableDevices();
        res.json(devices);
    } catch (error) {
        console.error('Error al obtener dispositivos disponibles:', error);
        res.status(500).json({ error: 'Error al obtener dispositivos disponibles' });
    }
};

// Asignar dispositivo a estación
export const assignDevice = async (req, res) => {
    try {
        const { deviceId, stationId } = req.body;
        
        if (!deviceId || !stationId) {
            return res.status(400).json({ error: 'deviceId y stationId son requeridos' });
        }

        const result = await assignDeviceToStation(deviceId, stationId);
        
        if (result === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado o no disponible' });
        }

        res.json({ 
            message: 'Dispositivo asignado correctamente a la estación',
            deviceId,
            stationId
        });
    } catch (error) {
        console.error('Error al asignar dispositivo:', error);
        
        // Verificar si es un error de constraint (estación ya tiene dispositivo)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ 
                error: 'La estación ya tiene un dispositivo asignado' 
            });
        }
        
        res.status(500).json({ error: 'Error al asignar dispositivo a la estación' });
    }
};

// Liberar dispositivo de estación
export const releaseDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;
        
        if (!deviceId) {
            return res.status(400).json({ error: 'deviceId es requerido' });
        }

        const result = await releaseDeviceFromStation(deviceId);
        
        if (result === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }

        res.json({ 
            message: 'Dispositivo liberado correctamente',
            deviceId
        });
    } catch (error) {
        console.error('Error al liberar dispositivo:', error);
        res.status(500).json({ error: 'Error al liberar dispositivo' });
    }
};

// Obtener dispositivo de una estación específica
export const getStationDevice = async (req, res) => {
    try {
        const { stationId } = req.params;
        const device = await getDeviceByStationId(stationId);
        
        if (!device) {
            return res.status(404).json({ message: 'Esta estación no tiene dispositivo asignado' });
        }
        
        res.json(device);
    } catch (error) {
        console.error('Error al obtener dispositivo de la estación:', error);
        res.status(500).json({ error: 'Error al obtener dispositivo de la estación' });
    }
};

// Obtener todos los dispositivos con información de estación
export const getAllDevices = async (req, res) => {
    try {
        const devices = await getAllDevicesWithStation();
        res.json(devices);
    } catch (error) {
        console.error('Error al obtener dispositivos:', error);
        res.status(500).json({ error: 'Error al obtener dispositivos' });
    }
};

// Eliminar dispositivo
export const removeDevice = async (req, res) => {
    try {
        const { deviceId } = req.params;
        
        if (!deviceId) {
            return res.status(400).json({ error: 'deviceId es requerido' });
        }

        const result = await deleteDevice(deviceId);
        
        if (result === 0) {
            return res.status(404).json({ error: 'Dispositivo no encontrado' });
        }

        res.json({ 
            message: 'Dispositivo eliminado correctamente',
            deviceId
        });
    } catch (error) {
        console.error('Error al eliminar dispositivo:', error);
        res.status(500).json({ error: 'Error al eliminar dispositivo' });
    }
};