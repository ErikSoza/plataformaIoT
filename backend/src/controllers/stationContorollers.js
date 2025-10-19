import {
    getAllStations,
    getStationById,
    addStation,
    updateStation,
    deleteStation,
} from '../models/stationModel.js';

export const getStations = async (req, res) => {
    try {
        const stations = await getAllStations();
        res.json(stations);
    } catch (error) {
        res.status(500).json({ error: 'error al obtener las estaciones' });
    }
};

export const getStation = async (req, res) => {
    try {
        const station = await getStationById(req.params.id);
        if (!station) return res.status(404).json({ error: 'estación no encontrada' });
        res.json(station);
    } catch (error) {
        res.status(500).json({ error: 'error al obtener la estación' });
    }
};

export const createStation = async (req, res) => {
    try {
        const id = await addStation(req.body);
        res.status(201).json({ message: 'estación creada correctamente', id });
    } catch (error) {
        res.status(500).json({ error: 'error al crear la estación' });
    }  
};

export const updateStationById = async (req, res) => {
    try {
        const update = await updateStation(req.params.id, req.body);
        if (!update) return res.status(404).json({ error: 'estación no encontrada' });
        res.json({ message: 'estación actualizada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'error al actualizar la estación' });
    }
  };

export const removeStation = async (req, res) => {
    try {
        const deleted = await deleteStation(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'estación no encontrada' });
        res.json({ message: 'estación eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'error al eliminar la estación' });
    }
};
