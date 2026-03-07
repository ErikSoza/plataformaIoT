import {
    getAvailableDevices,
    getDeviceByStationId,
    assignDeviceToStation,
    releaseDeviceFromStation,
    getAllDevicesWithStation,
    deleteDevice,
    createDevice
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

// Crear nuevo dispositivo
export const createDeviceController = async (req, res) => {
    try {
        const { device_id, modelo, estado, bateria, ultima_conexion, id_estacion } = req.body;
        
        // Validar datos requeridos
        if (!device_id || !modelo) {
            return res.status(400).json({ 
                error: 'device_id y modelo son campos requeridos' 
            });
        }

        // Validar que el device_id no exista ya
        const existingDevice = await getAllDevicesWithStation();
        const deviceExists = existingDevice.some(device => device.device_id === device_id);
        
        if (deviceExists) {
            return res.status(409).json({ 
                error: `Ya existe un dispositivo con el ID: ${device_id}` 
            });
        }

        const result = await createDevice({
            device_id,
            modelo,
            estado,
            bateria,
            ultima_conexion,
            id_estacion
        });

        res.status(201).json({ 
            message: 'Dispositivo creado correctamente',
            device_id: result.device_id,
            data: result
        });
    } catch (error) {
        console.error('Error al crear dispositivo:', error);
        
        // Si es error de duplicate key (por si acaso)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                error: 'Ya existe un dispositivo con este ID' 
            });
        }
        
        res.status(500).json({ error: 'Error al crear dispositivo' });
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