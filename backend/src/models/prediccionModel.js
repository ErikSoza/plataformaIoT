import pool from '../db/connection.js';

/**
 * Obtiene las últimas N lecturas de una estación, ordenadas de más reciente
 * a más antigua, junto con las coordenadas de la estación.
 *
 * La primera fila (índice 0) es la lectura actual.
 * Las filas siguientes (índices 1..N-1) son los lags temporales.
 */
export const getHistorialEstacion = async (stationId, limit = 13) => {
    const [rows] = await pool.query(
        `SELECT
            l.temperatura,
            l.humedad,
            l.presion_at,
            l.velocidad_viento,
            l.fecha_registro,
            e.latitud,
            e.longitud,
            e.nombre   AS estacion_nombre,
            e.ubicacion,
            e.estado   AS estacion_estado
         FROM lecturas l
         INNER JOIN dispositivos d ON l.device_id = d.device_id
         INNER JOIN estaciones e ON d.id_estacion = e.id
         WHERE e.id = ?
         ORDER BY l.fecha_registro DESC
         LIMIT ?`,
        [stationId, limit]
    );
    return rows;
};
