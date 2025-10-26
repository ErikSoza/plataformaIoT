import {
    getAllReadings,
    getReadingsBySensor,
    getReadingsByStation,
    getLatestReadingsByStation,
    getReadingById,
    addReading,
    getReadingStats,
} from '../models/readingModel.js';

export const getReadings = async (req, res) => {
    try {
        const readings = await getAllReadings();
        res.json(readings);
    } catch (error) {
        console.error('Error al obtener lecturas:', error);
        res.status(500).json({ error: 'Error al obtener las lecturas' });
    }
};

export const getReadingsBySensorId = async (req, res) => {
    try {
        const readings = await getReadingsBySensor(req.params.sensorId);
        res.json(readings);
    } catch (error) {
        console.error('Error al obtener lecturas por sensor:', error);
        res.status(500).json({ error: 'Error al obtener las lecturas del sensor' });
    }
};

export const getReadingsByStationId = async (req, res) => {
    try {
        const readings = await getReadingsByStation(req.params.stationId);
        res.json(readings);
    } catch (error) {
        console.error('Error al obtener lecturas por estación:', error);
        res.status(500).json({ error: 'Error al obtener las lecturas de la estación' });
    }
};

export const getLatestReadingsByStationId = async (req, res) => {
    try {
        const readings = await getLatestReadingsByStation(req.params.stationId);
        res.json(readings);
    } catch (error) {
        console.error('Error al obtener últimas lecturas:', error);
        res.status(500).json({ error: 'Error al obtener las últimas lecturas de la estación' });
    }
};

export const getReading = async (req, res) => {
    try {
        const reading = await getReadingById(req.params.id);
        if (!reading) return res.status(404).json({ error: 'Lectura no encontrada' });
        res.json(reading);
    } catch (error) {
        console.error('Error al obtener lectura:', error);
        res.status(500).json({ error: 'Error al obtener la lectura' });
    }
};

export const createReading = async (req, res) => {
    try {
        const id = await addReading(req.body);
        res.status(201).json({ message: 'Lectura creada correctamente', id });
    } catch (error) {
        console.error('Error al crear lectura:', error);
        res.status(500).json({ error: 'Error al crear la lectura' });
    }  
};

export const getStats = async (req, res) => {
    try {
        const stats = await getReadingStats();
        res.json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener las estadísticas' });
    }
};