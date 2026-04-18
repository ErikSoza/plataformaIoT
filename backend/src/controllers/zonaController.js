import {
    getAllZonas, getZonaById, createZona, updateZona, deleteZona,
    addEstacionToZona, removeEstacionFromZona,
} from '../models/zonaModel.js';

export const listZonas = async (req, res) => {
    try {
        const zonas = await getAllZonas();
        res.json(zonas);
    } catch (err) {
        console.error('Error listando zonas:', err);
        res.status(500).json({ error: 'Error al obtener zonas' });
    }
};

export const getZona = async (req, res) => {
    try {
        const zona = await getZonaById(req.params.id);
        if (!zona) return res.status(404).json({ error: 'Zona no encontrada' });
        res.json(zona);
    } catch (err) {
        console.error('Error obteniendo zona:', err);
        res.status(500).json({ error: 'Error al obtener la zona' });
    }
};

export const postZona = async (req, res) => {
    const { nombre, descripcion } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
    try {
        const id = await createZona({ nombre: nombre.trim(), descripcion });
        const zona = await getZonaById(id);
        res.status(201).json(zona);
    } catch (err) {
        console.error('Error creando zona:', err);
        res.status(500).json({ error: 'Error al crear la zona' });
    }
};

export const putZona = async (req, res) => {
    const { nombre, descripcion } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
    try {
        const affected = await updateZona(req.params.id, { nombre: nombre.trim(), descripcion });
        if (affected === 0) return res.status(404).json({ error: 'Zona no encontrada' });
        const zona = await getZonaById(req.params.id);
        res.json(zona);
    } catch (err) {
        console.error('Error actualizando zona:', err);
        res.status(500).json({ error: 'Error al actualizar la zona' });
    }
};

export const removeZona = async (req, res) => {
    try {
        const affected = await deleteZona(req.params.id);
        if (affected === 0) return res.status(404).json({ error: 'Zona no encontrada' });
        res.json({ message: 'Zona eliminada correctamente' });
    } catch (err) {
        console.error('Error eliminando zona:', err);
        res.status(500).json({ error: 'Error al eliminar la zona' });
    }
};

export const addEstacion = async (req, res) => {
    const { estacion_id } = req.body;
    if (!estacion_id) return res.status(400).json({ error: 'estacion_id es requerido' });
    try {
        await addEstacionToZona(req.params.id, estacion_id);
        const zona = await getZonaById(req.params.id);
        res.json(zona);
    } catch (err) {
        console.error('Error agregando estación a zona:', err);
        res.status(500).json({ error: 'Error al agregar la estación' });
    }
};

export const removeEstacion = async (req, res) => {
    try {
        await removeEstacionFromZona(req.params.id, req.params.estacion_id);
        const zona = await getZonaById(req.params.id);
        res.json(zona);
    } catch (err) {
        console.error('Error removiendo estación de zona:', err);
        res.status(500).json({ error: 'Error al remover la estación' });
    }
};
