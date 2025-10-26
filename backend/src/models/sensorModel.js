/*
Obtener sensores por estación
CRUD completo de sensores
 */
import { pool } from '../db/connection.js';

// Obtener todos los sensores
export const getAllSensors = async () => {
    const [rows] = await pool.query(`
        SELECT s.*, e.nombre as estacion_nombre 
        FROM sensores s 
        LEFT JOIN estaciones e ON s.id_estacion = e.id
    `);
    return rows;
};

// Obtener sensores por estación
export const getSensorsByStation = async (stationId) => {
    const [rows] = await pool.query(`
        SELECT * FROM sensores WHERE id_estacion = ?
    `, [stationId]);
    return rows;
};

// Obtener sensor por ID
export const getSensorById = async (id) => {
    const [rows] = await pool.query(`
        SELECT s.*, e.nombre as estacion_nombre 
        FROM sensores s 
        LEFT JOIN estaciones e ON s.id_estacion = e.id 
        WHERE s.id = ?
    `, [id]);
    return rows[0];
};

// Agregar nuevo sensor
export const addSensor = async (sensor) => {
    const { id_estacion, nombre, tipo, estado } = sensor;
    const [result] = await pool.query(
        'INSERT INTO sensores (id_estacion, nombre, tipo, estado) VALUES (?, ?, ?, ?)',
        [id_estacion, nombre, tipo, estado || 'Activo']
    );
    return result.insertId;
};

// Actualizar sensor
export const updateSensor = async (id, sensor) => {
    const { id_estacion, nombre, tipo, estado } = sensor;
    const [result] = await pool.query(
        'UPDATE sensores SET id_estacion = ?, nombre = ?, tipo = ?, estado = ? WHERE id = ?',
        [id_estacion, nombre, tipo, estado, id]
    );
    return result.affectedRows;
};

// Eliminar sensor
export const deleteSensor = async (id) => {
    const [result] = await pool.query('DELETE FROM sensores WHERE id = ?', [id]);
    return result.affectedRows;
};