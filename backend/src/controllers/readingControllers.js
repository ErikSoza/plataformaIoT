import {
    getAllReadings,
    getReadingsByStation,
    getLatestReadingByStation,
    getLatestReadings,
    getReadingById,
    addReading,
    getReadingStats,
    getGlobalStats,
} from '../models/readingModel.js';
import * as readingModel from '../models/readingModel.js';

export const getReadings = async (req, res) => {
    try {
        const readings = await getAllReadings();
        res.json(readings);
    } catch (error) {
        console.error('Error al obtener lecturas:', error);
        res.status(500).json({ error: 'Error al obtener las lecturas' });
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

export const getLatestReadingByStationId = async (req, res) => {
    try {
        const reading = await getLatestReadingByStation(req.params.stationId);
        res.json(reading);
    } catch (error) {
        console.error('Error al obtener última lectura:', error);
        res.status(500).json({ error: 'Error al obtener la última lectura de la estación' });
    }
};

export const getLatestReadingsAll = async (req, res) => {
    try {
        const readings = await getLatestReadings();
        res.json(readings);
    } catch (error) {
        console.error('Error al obtener últimas lecturas:', error);
        res.status(500).json({ error: 'Error al obtener las últimas lecturas' });
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

export const getGlobalStatsController = async (req, res) => {
    try {
        const stats = await getGlobalStats();
        res.json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas globales:', error);
        res.status(500).json({ error: 'Error al obtener las estadísticas globales' });
    }
};

export const getReadingsForReports = async (req, res) => {
    try {
        const { limit = 100, offset = 0, estacion_id, fecha_inicio, fecha_fin } = req.query;
        
        const filters = {};
        if (estacion_id) filters.estacion_id = estacion_id;
        if (fecha_inicio) filters.fecha_inicio = fecha_inicio;
        if (fecha_fin) filters.fecha_fin = fecha_fin;

        const result = await readingModel.getReadingsForReports(
            parseInt(limit),
            parseInt(offset),
            filters
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error al obtener lecturas para reportes:', error);
        res.status(500).json({ error: 'Error al obtener lecturas para reportes' });
    }
};