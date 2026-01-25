import pool from '../db/connection.js';

export const getAllStations = async () => {
    const [rows] = await pool.query(`
        SELECT 
            e.*,
            d.device_id,
            d.modelo,
            d.estado as estado_dispositivo,
            d.bateria,
            d.ultima_conexion
        FROM estaciones e
        LEFT JOIN dispositivos d ON e.id = d.id_estacion
        ORDER BY e.created_at DESC
    `);
    return rows;
};
 export const getStationById = async (id) => {
    const [rows] = await pool.query('SELECT * FROM estaciones WHERE id = ?', [id]);
    return rows[0];
};
export const addStation = async (station) => {
    const {
        nombre,
        latitud,
        longitud,
        ubicacion,
        descripcion
    } = station;
    const [result] = await pool.query(
        'INSERT INTO estaciones (nombre, latitud, longitud, ubicacion, descripcion) VALUES (?, ?, ?, ?, ?)',
        [nombre, latitud, longitud, ubicacion, descripcion || null]
    );
    return result.insertId;
};

export const updateStation = async (id, station) => {
    const {
        nombre,
        latitud,
        longitud,
        ubicacion,
        descripcion
    } = station;
    const [result] = await pool.query(
        'UPDATE estaciones SET nombre = ?, latitud = ?, longitud = ?, ubicacion = ?, descripcion = ? WHERE id = ?',
        [nombre, latitud, longitud, ubicacion, descripcion, id]
    );
    return result.affectedRows;
};
export const deleteStation = async (id) => {
    const [result] = await pool.query('DELETE FROM estaciones WHERE id = ?', [id]);
    return result.affectedRows;
};