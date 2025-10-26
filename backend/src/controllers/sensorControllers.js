import {
    getAllSensors,
    getSensorsByStation,
    getSensorById,
    addSensor,
    updateSensor,
    deleteSensor,
} from '../models/sensorModel.js';

export const getSensors = async (req, res) => {
    try {
        const sensors = await getAllSensors();
        res.json(sensors);
    } catch (error) {
        console.error('Error al obtener sensores:', error);
        res.status(500).json({ error: 'Error al obtener los sensores' });
    }
};

export const getSensorsByStationId = async (req, res) => {
    try {
        const sensors = await getSensorsByStation(req.params.stationId);
        res.json(sensors);
    } catch (error) {
        console.error('Error al obtener sensores por estación:', error);
        res.status(500).json({ error: 'Error al obtener los sensores de la estación' });
    }
};

export const getSensor = async (req, res) => {
    try {
        const sensor = await getSensorById(req.params.id);
        if (!sensor) return res.status(404).json({ error: 'Sensor no encontrado' });
        res.json(sensor);
    } catch (error) {
        console.error('Error al obtener sensor:', error);
        res.status(500).json({ error: 'Error al obtener el sensor' });
    }
};

export const createSensor = async (req, res) => {
    try {
        const id = await addSensor(req.body);
        res.status(201).json({ message: 'Sensor creado correctamente', id });
    } catch (error) {
        console.error('Error al crear sensor:', error);
        res.status(500).json({ error: 'Error al crear el sensor' });
    }  
};

export const updateSensorById = async (req, res) => {
    try {
        const updated = await updateSensor(req.params.id, req.body);
        if (!updated) return res.status(404).json({ error: 'Sensor no encontrado' });
        res.json({ message: 'Sensor actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar sensor:', error);
        res.status(500).json({ error: 'Error al actualizar el sensor' });
    }
};

export const removeSensor = async (req, res) => {
    try {
        const deleted = await deleteSensor(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Sensor no encontrado' });
        res.json({ message: 'Sensor eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar sensor:', error);
        res.status(500).json({ error: 'Error al eliminar el sensor' });
    }
};