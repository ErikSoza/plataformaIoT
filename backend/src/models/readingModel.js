/*
Obtener lecturas por sensor/estación
Últimas lecturas (importante para el dashboard)
Estadísticas de lecturas
 */
import { pool } from '../db/connection.js';

// Obtener todas las lecturas con información del sensor y estación
export const getAllReadings = async () => {
    const [rows] = await pool.query(`
        SELECT l.*, s.nombre as sensor_nombre, s.tipo as sensor_tipo,
               e.nombre as estacion_nombre, e.localizacion
        FROM lecturas l
        LEFT JOIN sensores s ON l.id_sensor = s.id
        LEFT JOIN estaciones e ON s.id_estacion = e.id
        ORDER BY l.timestamp DESC
    `);
    return rows;
};

// Obtener lecturas por sensor
export const getReadingsBySensor = async (sensorId) => {
    const [rows] = await pool.query(`
        SELECT l.*, s.nombre as sensor_nombre, s.tipo as sensor_tipo
        FROM lecturas l
        LEFT JOIN sensores s ON l.id_sensor = s.id
        WHERE l.id_sensor = ?
        ORDER BY l.timestamp DESC
    `, [sensorId]);
    return rows;
};

// Obtener lecturas por estación
export const getReadingsByStation = async (stationId) => {
    const [rows] = await pool.query(`
        SELECT l.*, s.nombre as sensor_nombre, s.tipo as sensor_tipo
        FROM lecturas l
        LEFT JOIN sensores s ON l.id_sensor = s.id
        WHERE s.id_estacion = ?
        ORDER BY l.timestamp DESC
    `, [stationId]);
    return rows;
};

// Obtener últimas lecturas por estación (útil para el dashboard)
export const getLatestReadingsByStation = async (stationId) => {
    const [rows] = await pool.query(`
        SELECT l.*, s.nombre as sensor_nombre, s.tipo as sensor_tipo
        FROM lecturas l
        LEFT JOIN sensores s ON l.id_sensor = s.id
        WHERE s.id_estacion = ? AND l.timestamp = (
            SELECT MAX(l2.timestamp) 
            FROM lecturas l2 
            WHERE l2.id_sensor = l.id_sensor
        )
        ORDER BY s.tipo, s.nombre
    `, [stationId]);
    return rows;
};

// Obtener lectura por ID
export const getReadingById = async (id) => {
    const [rows] = await pool.query(`
        SELECT l.*, s.nombre as sensor_nombre, s.tipo as sensor_tipo,
               e.nombre as estacion_nombre
        FROM lecturas l
        LEFT JOIN sensores s ON l.id_sensor = s.id
        LEFT JOIN estaciones e ON s.id_estacion = e.id
        WHERE l.id = ?
    `, [id]);
    return rows[0];
};

// Agregar nueva lectura
export const addReading = async (reading) => {
    const { id_sensor, valor, json } = reading;
    const [result] = await pool.query(
        'INSERT INTO lecturas (id_sensor, valor, json) VALUES (?, ?, ?)',
        [id_sensor, valor, json ? JSON.stringify(json) : null]
    );
    return result.insertId;
};

// Obtener estadísticas de lecturas (promedio, min, max) por tipo de sensor
export const getReadingStats = async () => {
    const [rows] = await pool.query(`
        SELECT 
            s.tipo as sensor_tipo,
            COUNT(l.id) as total_lecturas,
            AVG(l.valor) as promedio,
            MIN(l.valor) as minimo,
            MAX(l.valor) as maximo,
            MAX(l.timestamp) as ultima_lectura
        FROM lecturas l
        LEFT JOIN sensores s ON l.id_sensor = s.id
        WHERE l.timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY s.tipo
    `);
    return rows;
};