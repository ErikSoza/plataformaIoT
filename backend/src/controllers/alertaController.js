import * as alertaModel from '../models/alertaModel.js';

// ── REGLAS ────────────────────────────────────────────────────────────────────

export const getReglas = async (req, res) => {
  try {
    const reglas = await alertaModel.getAllReglas();
    res.json(reglas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getReglasByEstacion = async (req, res) => {
  try {
    const reglas = await alertaModel.getReglasByEstacion(req.params.id);
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
    const limit = parseInt(req.query.limit) || 50;
    const alertas = await alertaModel.getAlertas({ soloNoLeidas, limit });
    res.json(alertas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const verificarAlertas = async (req, res) => {
  try {
    const nuevas = await alertaModel.verificarAlertas();
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
    await alertaModel.marcarTodasLeidas();
    res.json({ message: 'Todas las alertas marcadas como leídas' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
