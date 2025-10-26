import { pool } from '../db/connection.js';

export const getAllStations = async () => {
    const [rows] = await pool.query('SELECT * FROM estaciones');
    return rows;
};
 export const getStationById = async (id) => {
    const [rows] = await pool.query('SELECT * FROM estaciones WHERE id = ?', [id]);
    return rows[0];
};
export const addStation = async (station) => {
    const{
        id_usuario,
        nombre,
        localizacion,
        latitud,
        longitud,
        estado,
        bateria,
    } = station;
    const [result] = await pool.query(
        'INSERT INTO estaciones (id_usuario, nombre, localizacion, latitud, longitud, estado, bateria) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id_usuario || null, nombre, localizacion, latitud, longitud, estado || 'Activo', bateria]
    );
    return result.insertId;
};

export const updateStation = async (id, station) => {
    const {
        id_usuario,
        nombre,
        localizacion,
        latitud,
        longitud,
        estado,
        bateria,
    } = station;
    const [result] = await pool.query(
        'UPDATE estaciones SET id_usuario = ?, nombre = ?, localizacion = ?, latitud = ?, longitud = ?, estado = ?, bateria = ?, ultima_actualizacion = CURRENT_TIMESTAMP WHERE id = ?',
        [id_usuario, nombre, localizacion, latitud, longitud, estado, bateria, id]
    );
    return result.affectedRows;
};
export const deleteStation = async (id) => {
    const [result] = await pool.query('DELETE FROM estaciones WHERE id = ?', [id]);
    return result.affectedRows;
};