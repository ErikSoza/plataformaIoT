/*
Obtener lecturas por sensor/estación
Últimas lecturas (importante para el dashboard)
Estadísticas de lecturas
 */
import { pool } from '../db/connection.js';

// Obtener todas las lecturas con información de estación
export const getAllReadings = async () => {
    const [rows] = await pool.query(`
        SELECT l.*, e.nombre as estacion_nombre, e.localizacion
        FROM lecturas l
        LEFT JOIN estaciones e ON l.id_estacion = e.id
        ORDER BY l.timestamp DESC
    `);
    return rows;
};

// Obtener lecturas por estación
export const getReadingsByStation = async (stationId) => {
    const [rows] = await pool.query(`
        SELECT l.*, e.nombre as estacion_nombre, e.localizacion
        FROM lecturas l
        LEFT JOIN estaciones e ON l.id_estacion = e.id
        WHERE l.id_estacion = ?
        ORDER BY l.timestamp DESC
    `, [stationId]);
    return rows;
};

// Obtener última lectura por estación (útil para el dashboard)
export const getLatestReadingByStation = async (stationId) => {
    const [rows] = await pool.query(`
        SELECT l.*, e.nombre as estacion_nombre, e.localizacion
        FROM lecturas l
        LEFT JOIN estaciones e ON l.id_estacion = e.id
        WHERE l.id_estacion = ?
        ORDER BY l.timestamp DESC
        LIMIT 1
    `, [stationId]);
    return rows[0];
};

// Obtener últimas lecturas de todas las estaciones
export const getLatestReadings = async () => {
    const [rows] = await pool.query(`
        SELECT l.*, e.nombre as estacion_nombre, e.localizacion
        FROM lecturas l
        LEFT JOIN estaciones e ON l.id_estacion = e.id
        WHERE l.timestamp = (
            SELECT MAX(l2.timestamp)
            FROM lecturas l2
            WHERE l2.id_estacion = l.id_estacion
        )
        ORDER BY e.nombre
    `);
    return rows;
};

// Obtener lectura por ID
export const getReadingById = async (id) => {
    const [rows] = await pool.query(`
        SELECT l.*, e.nombre as estacion_nombre, e.localizacion
        FROM lecturas l
        LEFT JOIN estaciones e ON l.id_estacion = e.id
        WHERE l.id = ?
    `, [id]);
    return rows[0];
};

// Agregar nueva lectura desde ESP32
export const addReading = async (reading) => {
    const { id_estacion, timestamp, json } = reading;
    const [result] = await pool.query(
        'INSERT INTO lecturas (id_estacion, timestamp, json) VALUES (?, ?, ?)',
        [id_estacion, timestamp || new Date(), JSON.stringify(json)]
    );
    return result.insertId;
};

// Obtener estadísticas de lecturas por estación
export const getReadingStats = async () => {
    const [rows] = await pool.query(`
        SELECT 
            e.nombre as estacion_nombre,
            COUNT(l.id) as total_lecturas,
            MAX(l.timestamp) as ultima_lectura,
            AVG(JSON_EXTRACT(l.json, '$.temperatura')) as temp_promedio,
            AVG(JSON_EXTRACT(l.json, '$.humedad')) as humedad_promedio,
            AVG(JSON_EXTRACT(l.json, '$.bateria')) as bateria_promedio
        FROM lecturas l
        LEFT JOIN estaciones e ON l.id_estacion = e.id
        WHERE l.timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
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
            AVG(JSON_EXTRACT(l.json, '$.temperatura')) as temp_promedio_global,
            AVG(JSON_EXTRACT(l.json, '$.humedad')) as humedad_promedio_global,
            AVG(JSON_EXTRACT(l.json, '$.presion')) as presion_promedio,
            AVG(JSON_EXTRACT(l.json, '$.gas')) as gas_promedio,
            AVG(JSON_EXTRACT(l.json, '$.radiacion')) as radiacion_promedio,
            AVG(JSON_EXTRACT(l.json, '$.viento')) as viento_promedio,
            COUNT(CASE WHEN e.estado = 'Activo' THEN 1 END) as estaciones_activas
        FROM lecturas l
        LEFT JOIN estaciones e ON l.id_estacion = e.id
        WHERE l.timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `);
    return rows[0];
};

// Obtener lecturas para reportes con paginación
export const getReadingsForReports = async (limit = 100, offset = 0, filters = {}) => {
    let whereClause = '';
    let queryParams = [];

    // Construir filtros dinámicamente
    if (filters.estacion_id) {
        whereClause += ' AND l.id_estacion = ?';
        queryParams.push(filters.estacion_id);
    }

    if (filters.fecha_inicio) {
        whereClause += ' AND l.timestamp >= ?';
        queryParams.push(filters.fecha_inicio);
    }

    if (filters.fecha_fin) {
        whereClause += ' AND l.timestamp <= ?';
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
            l.id_estacion,
            l.timestamp,
            l.json,
            e.nombre as estacion_nombre,
            e.localizacion,
            e.estado as estacion_estado
        FROM lecturas l
        LEFT JOIN estaciones e ON l.id_estacion = e.id
        ${whereClause}
        ORDER BY l.timestamp DESC
        LIMIT ? OFFSET ?
    `, queryParams);

    // Obtener también el conteo total
    const countParams = queryParams.slice(0, -2); // Remover limit y offset
    const [countResult] = await pool.query(`
        SELECT COUNT(*) as total
        FROM lecturas l
        LEFT JOIN estaciones e ON l.id_estacion = e.id
        ${whereClause}
    `, countParams);

    return {
        data: rows,
        total: countResult[0].total,
        limit,
        offset
    };
};