import pool from '../db/connection.js';

/**
 * Obtiene hasta `limit` lecturas HORARIAS de una estación para los lags del modelo.
 *
 * Problema que resuelve:
 *   El modelo fue entrenado con datos horarios (Open-Meteo, 1 registro/hora).
 *   Si el ESP32 envía lecturas cada 5-10 minutos, las últimas 24 lecturas brutas
 *   sólo cubren 2-4 horas en lugar de 24h. Eso hace que lag_24h (el predictor
 *   más potente para +24h) represente "hace 2 horas" en vez de "ayer misma hora",
 *   distorsionando completamente las predicciones.
 *
 * Solución:
 *   Agrupa todas las lecturas por hora (DATE + HOUR), toma el promedio de cada
 *   bloque horario y devuelve hasta `limit` bloques (más reciente primero).
 *   Así lag_1h = promedio de hace 1 hora, lag_24h = promedio de hace 24 horas,
 *   que es exactamente el formato que el modelo espera.
 *
 * La primera fila (índice 0) es la hora actual (o la fracción de hora actual).
 * Las filas siguientes son los lags 1h, 2h, … 24h.
 */
export const getHistorialEstacion = async (stationId, limit = 25) => {
    const horasNecesarias = limit + 1;   // +1 de margen para no quedarse corto
    const [rows] = await pool.query(
        `SELECT
            AVG(l.temperatura)      AS temperatura,
            AVG(l.humedad)          AS humedad,
            AVG(l.presion_at)       AS presion_at,
            AVG(l.velocidad_viento) AS velocidad_viento,
            MAX(l.fecha_registro)   AS fecha_registro,
            e.latitud,
            e.longitud,
            e.nombre   AS estacion_nombre,
            e.ubicacion,
            e.estado   AS estacion_estado
         FROM lecturas l
         INNER JOIN dispositivos d ON l.device_id = d.device_id
         INNER JOIN estaciones e ON d.id_estacion = e.id
         WHERE e.id = ?
           AND l.fecha_registro >= DATE_SUB(NOW(), INTERVAL ? HOUR)
         GROUP BY
            DATE(l.fecha_registro),
            HOUR(l.fecha_registro),
            e.latitud, e.longitud, e.nombre, e.ubicacion, e.estado
         ORDER BY MAX(l.fecha_registro) DESC
         LIMIT ?`,
        [stationId, horasNecesarias, limit]
    );
    return rows;
};
