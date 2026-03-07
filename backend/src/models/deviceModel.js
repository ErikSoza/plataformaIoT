import pool from '../db/connection.js';

// Crear nuevo dispositivo
export const createDevice = async (deviceData) => {
    const {
        device_id,
        modelo,
        estado = 'disponible', // Valor por defecto
        bateria = null,
        ultima_conexion = null,
        id_estacion = null
    } = deviceData;
    
    const [result] = await pool.query(
        'INSERT INTO dispositivos (device_id, modelo, estado, bateria, ultima_conexion, id_estacion) VALUES (?, ?, ?, ?, ?, ?)',
        [device_id, modelo, estado, bateria, ultima_conexion, id_estacion]
    );
    
    return {
        device_id,
        insertId: result.insertId,
        affectedRows: result.affectedRows
    };
};

// Obtener todos los dispositivos disponibles (no asignados)
export const getAvailableDevices = async () => {
    const [rows] = await pool.query(
        'SELECT * FROM dispositivos WHERE id_estacion IS NULL AND estado = "disponible"'
    );
    return rows;
};

// Obtener dispositivo asignado a una estación específica
export const getDeviceByStationId = async (stationId) => {
    const [rows] = await pool.query(
        'SELECT * FROM dispositivos WHERE id_estacion = ?',
        [stationId]
    );
    return rows[0];
};

// Asignar dispositivo a una estación
export const assignDeviceToStation = async (deviceId, stationId) => {
    const [result] = await pool.query(
        'UPDATE dispositivos SET id_estacion = ?, estado = "asignado" WHERE device_id = ?',
        [stationId, deviceId]
    );
    return result.affectedRows;
};

// Liberar dispositivo de una estación
export const releaseDeviceFromStation = async (deviceId) => {
    const [result] = await pool.query(
        'UPDATE dispositivos SET id_estacion = NULL, estado = "disponible" WHERE device_id = ?',
        [deviceId]
    );
    return result.affectedRows;
};

// Eliminar dispositivo
export const deleteDevice = async (deviceId) => {
    const [result] = await pool.query(
        'DELETE FROM dispositivos WHERE device_id = ?',
        [deviceId]
    );
    return result.affectedRows;
};

// Obtener todos los dispositivos con información de estación
export const getAllDevicesWithStation = async () => {
    const [rows] = await pool.query(`
        SELECT 
            d.device_id,
            d.modelo,
            d.estado,
            d.bateria,
            d.ultima_conexion,
            d.id_estacion,
            e.nombre as nombre_estacion,
            e.ubicacion as ubicacion_estacion
        FROM dispositivos d
        LEFT JOIN estaciones e ON d.id_estacion = e.id
        ORDER BY d.created_at DESC
    `);
    return rows;
};