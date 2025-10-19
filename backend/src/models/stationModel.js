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
        nombre,
        tipo,
        estado,
        ultima_actualizacion,
        localizacion,
        latitud,
        longitud,
        temperatura,
        humedad,
        bateria,
    } = station;
    const [result] = await pool.query(
        'INSERT INTO estaciones (nombre, tipo, estado, ultima_actualizacion, localizacion, latitud, longitud, temperatura, humedad, bateria) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [nombre, tipo, estado, ultima_actualizacion, localizacion, latitud, longitud, temperatura, humedad, bateria]
    );
    return result.insertId;
};

export const updateStation = async (id, station) => {
    const {
        nombre,
        tipo,
        estado,
        ultima_actualizacion,
        localizacion,
        latitud,
        longitud,
        temperatura,
        humedad,
        bateria,
    } = station;
    const [result] = await pool.query(
        'UPDATE estaciones SET nombre = ?, tipo = ?, estado = ?, ultima_actualizacion = ?, localizacion = ?, latitud = ?, longitud = ?, temperatura = ?, humedad = ?, bateria = ? WHERE id = ?',
        [nombre, tipo, estado, ultima_actualizacion, localizacion, latitud, longitud, temperatura, humedad, bateria, id]
    );
    return result.affectedRows;
};
export const deleteStation = async (id) => {
    const [result] = await pool.query('DELETE FROM estaciones WHERE id = ?', [id]);
    return result.affectedRows;
};