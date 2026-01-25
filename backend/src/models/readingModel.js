/*
Modelo para lecturas - adaptado a la estructura real de la BD:
- tabla 'lecturas' tiene: id, device_id, fecha_registro, raw_timestamp, temperatura, humedad, presion_at, velocidad_viento, prediccion_temp
- JOIN con dispositivos y estaciones a través de device_id
*/
import pool from '../db/connection.js';

// Obtener todas las lecturas con información de estación y dispositivo
export const getAllReadings = async () => {
    const [rows] = await pool.query(`
        SELECT 
            l.*,
            d.device_id,
            d.modelo,
            e.nombre as estacion_nombre, 
            e.ubicacion,
            e.id as estacion_id
        FROM lecturas l
        LEFT JOIN dispositivos d ON l.device_id = d.device_id
        LEFT JOIN estaciones e ON d.id_estacion = e.id
        ORDER BY l.fecha_registro DESC
    `);
    return rows;
};

// Obtener lecturas por estación (a través del dispositivo)
export const getReadingsByStation = async (stationId) => {
    const [rows] = await pool.query(`
        SELECT 
            l.*,
            d.device_id,
            d.modelo,
            e.nombre as estacion_nombre, 
            e.ubicacion
        FROM lecturas l
        LEFT JOIN dispositivos d ON l.device_id = d.device_id
        LEFT JOIN estaciones e ON d.id_estacion = e.id
        WHERE e.id = ?
        ORDER BY l.fecha_registro DESC
    `, [stationId]);
    return rows;
};

// Obtener última lectura por estación (útil para el dashboard)
export const getLatestReadingByStation = async (stationId) => {
    const [rows] = await pool.query(`
        SELECT 
            l.*,
            d.device_id,
            d.modelo,
            e.nombre as estacion_nombre, 
            e.ubicacion
        FROM lecturas l
        LEFT JOIN dispositivos d ON l.device_id = d.device_id
        LEFT JOIN estaciones e ON d.id_estacion = e.id
        WHERE e.id = ?
        ORDER BY l.fecha_registro DESC
        LIMIT 1
    `, [stationId]);
    return rows[0];
};

// Obtener últimas lecturas de todas las estaciones
export const getLatestReadings = async () => {
    const [rows] = await pool.query(`
        SELECT 
            l.*,
            d.device_id,
            d.modelo,
            e.nombre as estacion_nombre, 
            e.ubicacion,
            e.id as estacion_id
        FROM lecturas l
        INNER JOIN dispositivos d ON l.device_id = d.device_id
        INNER JOIN estaciones e ON d.id_estacion = e.id
        WHERE l.fecha_registro = (
            SELECT MAX(l2.fecha_registro)
            FROM lecturas l2
            WHERE l2.device_id = l.device_id
        )
        ORDER BY e.nombre
    `);
    return rows;
};

// Obtener lectura por ID
export const getReadingById = async (id) => {
    const [rows] = await pool.query(`
        SELECT 
            l.*,
            d.device_id,
            d.modelo,
            e.nombre as estacion_nombre, 
            e.ubicacion
        FROM lecturas l
        LEFT JOIN dispositivos d ON l.device_id = d.device_id
        LEFT JOIN estaciones e ON d.id_estacion = e.id
        WHERE l.id = ?
    `, [id]);
    return rows[0];
};

// Agregar nueva lectura desde ESP32
export const addReading = async (reading) => {
    const { 
        device_id, 
        fecha_registro, 
        raw_timestamp, 
        temperatura, 
        humedad, 
        presion_at, 
        velocidad_viento, 
        prediccion_temp 
    } = reading;
    
    const [result] = await pool.query(
        'INSERT INTO lecturas (device_id, fecha_registro, raw_timestamp, temperatura, humedad, presion_at, velocidad_viento, prediccion_temp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [device_id, fecha_registro || new Date(), raw_timestamp, temperatura, humedad, presion_at, velocidad_viento, prediccion_temp]
    );
    return result.insertId;
};

// Obtener estadísticas de lecturas por estación
export const getReadingStats = async () => {
    const [rows] = await pool.query(`
        SELECT 
            e.nombre as estacion_nombre,
            e.id as estacion_id,
            COUNT(l.id) as total_lecturas,
            MAX(l.fecha_registro) as ultima_lectura,
            AVG(l.temperatura) as temp_promedio,
            AVG(l.humedad) as humedad_promedio,
            AVG(l.presion_at) as presion_promedio,
            AVG(l.velocidad_viento) as viento_promedio
        FROM lecturas l
        INNER JOIN dispositivos d ON l.device_id = d.device_id
        INNER JOIN estaciones e ON d.id_estacion = e.id
        WHERE l.fecha_registro >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY e.id, e.nombre
        ORDER BY e.nombre
    `);
    return rows;
};

// Obtener estadísticas globales
export const getGlobalStats = async () => {
    const [rows] = await pool.query(`
        SELECT 
            COUNT(DISTINCT e.id) as total_estaciones,
            COUNT(l.id) as total_lecturas_24h,
            AVG(l.temperatura) as temp_promedio_global,
            AVG(l.humedad) as humedad_promedio_global,
            AVG(l.presion_at) as presion_promedio,
            AVG(l.velocidad_viento) as viento_promedio,
            COUNT(CASE WHEN e.estado = 'Activa' THEN 1 END) as estaciones_activas
        FROM lecturas l
        INNER JOIN dispositivos d ON l.device_id = d.device_id
        INNER JOIN estaciones e ON d.id_estacion = e.id
        WHERE l.fecha_registro >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    return rows[0];
};

// Obtener lecturas para reportes con paginación
export const getReadingsForReports = async (limit = 100, offset = 0, filters = {}) => {
    let whereClause = '';
    let queryParams = [];

    // Construir filtros dinámicamente
    if (filters.estacion_id) {
        whereClause += ' AND e.id = ?';
        queryParams.push(filters.estacion_id);
    }

    if (filters.fecha_inicio) {
        whereClause += ' AND l.fecha_registro >= ?';
        queryParams.push(filters.fecha_inicio);
    }

    if (filters.fecha_fin) {
        whereClause += ' AND l.fecha_registro <= ?';
        queryParams.push(filters.fecha_fin);
    }

    // Remover el primer 'AND' si existe
    if (whereClause) {
        whereClause = 'WHERE' + whereClause.substring(4);
    }

    queryParams.push(limit, offset);

    const [rows] = await pool.query(`
        SELECT 
            l.id,
            l.device_id,
            l.fecha_registro,
            l.temperatura,
            l.humedad,
            l.presion_at,
            l.velocidad_viento,
            l.prediccion_temp,
            d.modelo,
            e.nombre as estacion_nombre,
            e.ubicacion,
            e.estado as estacion_estado
        FROM lecturas l
        INNER JOIN dispositivos d ON l.device_id = d.device_id
        INNER JOIN estaciones e ON d.id_estacion = e.id
        ${whereClause}
        ORDER BY l.fecha_registro DESC
        LIMIT ? OFFSET ?
    `, queryParams);

    // Obtener también el conteo total
    const countParams = queryParams.slice(0, -2); // Remover limit y offset
    const [countResult] = await pool.query(`
        SELECT COUNT(*) as total
        FROM lecturas l
        INNER JOIN dispositivos d ON l.device_id = d.device_id
        INNER JOIN estaciones e ON d.id_estacion = e.id
        ${whereClause}
    `, countParams);

    return {
        data: rows,
        total: countResult[0].total,
        limit,
        offset
    };
};