import * as alertaModel from '../models/alertaModel.js';

// ── REGLAS ────────────────────────────────────────────────────────────────────

export const getReglas = async (req, res) => {
  try {
    const id_usuario = req.query.id_usuario ? parseInt(req.query.id_usuario) : null;
    const reglas = await alertaModel.getAllReglas(id_usuario);
    res.json(reglas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getReglasByEstacion = async (req, res) => {
  try {
    const id_usuario = req.query.id_usuario ? parseInt(req.query.id_usuario) : null;
    const reglas = await alertaModel.getReglasByEstacion(req.params.id, id_usuario);
    res.json(reglas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createRegla = async (req, res) => {
  try {
    const { id_estacion, variable, condicion, umbral, nivel, nombre } = req.body;

    if (!id_estacion || !variable || !condicion || umbral === undefined || umbral === null) {
      return res.status(400).json({ error: 'Campos requeridos: id_estacion, variable, condicion, umbral' });
    }

    const CONDICIONES_VALIDAS = ['>', '<', '>=', '<='];
    if (!CONDICIONES_VALIDAS.includes(condicion)) {
      return res.status(400).json({ error: `Condición inválida. Use: ${CONDICIONES_VALIDAS.join(', ')}` });
    }

    // id_usuario viene del token si hay middleware de auth, o del body como fallback
    const id_usuario = req.user?.id || req.body.id_usuario || 1;

    const id = await alertaModel.createRegla({ id_estacion, id_usuario, variable, condicion, umbral, nivel, nombre });
    res.status(201).json({ id, message: 'Regla creada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateRegla = async (req, res) => {
  try {
    const affected = await alertaModel.updateRegla(req.params.id, req.body);
    if (affected === 0) return res.status(404).json({ error: 'Regla no encontrada' });
    res.json({ message: 'Regla actualizada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteRegla = async (req, res) => {
  try {
    const affected = await alertaModel.deleteRegla(req.params.id);
    if (affected === 0) return res.status(404).json({ error: 'Regla no encontrada' });
    res.json({ message: 'Regla eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleRegla = async (req, res) => {
  try {
    await alertaModel.toggleRegla(req.params.id);
    res.json({ message: 'Estado de regla actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── ALERTAS ───────────────────────────────────────────────────────────────────

export const getAlertas = async (req, res) => {
  try {
    const soloNoLeidas = req.query.leidas === 'false';
    const id_usuario = req.query.id_usuario ? parseInt(req.query.id_usuario) : null;
    const limit = parseInt(req.query.limit) || 50;
    const alertas = await alertaModel.getAlertas({ soloNoLeidas, id_usuario, limit });
    res.json(alertas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const verificarAlertas = async (req, res) => {
  try {
    const id_usuario = req.query.id_usuario ? parseInt(req.query.id_usuario) : null;
    const nuevas = await alertaModel.verificarAlertas(id_usuario);
    res.json({ nuevas_alertas: nuevas.length, alertas: nuevas });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const marcarLeida = async (req, res) => {
  try {
    await alertaModel.marcarLeida(req.params.id);
    res.json({ message: 'Alerta marcada como leída' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const marcarTodasLeidas = async (req, res) => {
  try {
    const id_usuario = req.query.id_usuario ? parseInt(req.query.id_usuario) : null;
    await alertaModel.marcarTodasLeidas(id_usuario);
    res.json({ message: 'Todas las alertas marcadas como leídas' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
