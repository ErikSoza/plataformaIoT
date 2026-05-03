/**
 * SQL para crear las tablas necesarias (ejecutar una vez en MySQL):
 *
 * CREATE TABLE IF NOT EXISTS zonas_clima (
 *   id INT AUTO_INCREMENT PRIMARY KEY,
 *   nombre VARCHAR(100) NOT NULL,
 *   descripcion VARCHAR(255),
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 *
 * CREATE TABLE IF NOT EXISTS zona_estaciones (
 *   zona_id INT NOT NULL,
 *   estacion_id INT NOT NULL,
 *   PRIMARY KEY (zona_id, estacion_id),
 *   FOREIGN KEY (zona_id) REFERENCES zonas_clima(id) ON DELETE CASCADE,
 *   FOREIGN KEY (estacion_id) REFERENCES estaciones(id) ON DELETE CASCADE
 * );
 */

import pool from '../db/connection.js';
import { getHistorialEstacion } from './prediccionModel.js';

export const getAllZonas = async () => {
    const [zonas] = await pool.query(
        `SELECT z.id, z.nombre, z.descripcion, z.created_at,
                COUNT(ze.estacion_id) AS total_estaciones
         FROM zonas_clima z
         LEFT JOIN zona_estaciones ze ON ze.zona_id = z.id
         GROUP BY z.id
         ORDER BY z.nombre`
    );

    const [asignaciones] = await pool.query(
        `SELECT ze.zona_id, e.id, e.nombre, e.ubicacion, e.estado
         FROM zona_estaciones ze
         INNER JOIN estaciones e ON e.id = ze.estacion_id
         ORDER BY e.nombre`
    );

    return zonas.map(z => ({
        ...z,
        estaciones: asignaciones.filter(a => a.zona_id === z.id).map(({ zona_id, ...e }) => e),
    }));
};

export const getZonaById = async (id) => {
    const [[zona]] = await pool.query('SELECT * FROM zonas_clima WHERE id = ?', [id]);
    if (!zona) return null;

    const [estaciones] = await pool.query(
        `SELECT e.id, e.nombre, e.ubicacion, e.estado
         FROM zona_estaciones ze
         INNER JOIN estaciones e ON e.id = ze.estacion_id
         WHERE ze.zona_id = ?
         ORDER BY e.nombre`,
        [id]
    );

    return { ...zona, estaciones };
};

export const createZona = async ({ nombre, descripcion }) => {
    const [result] = await pool.query(
        'INSERT INTO zonas_clima (nombre, descripcion) VALUES (?, ?)',
        [nombre, descripcion || null]
    );
    return result.insertId;
};

export const updateZona = async (id, { nombre, descripcion }) => {
    const [result] = await pool.query(
        'UPDATE zonas_clima SET nombre = ?, descripcion = ? WHERE id = ?',
        [nombre, descripcion || null, id]
    );
    return result.affectedRows;
};

export const deleteZona = async (id) => {
    const [result] = await pool.query('DELETE FROM zonas_clima WHERE id = ?', [id]);
    return result.affectedRows;
};

export const addEstacionToZona = async (zonaId, estacionId) => {
    await pool.query(
        'INSERT IGNORE INTO zona_estaciones (zona_id, estacion_id) VALUES (?, ?)',
        [zonaId, estacionId]
    );
};

export const removeEstacionFromZona = async (zonaId, estacionId) => {
    const [result] = await pool.query(
        'DELETE FROM zona_estaciones WHERE zona_id = ? AND estacion_id = ?',
        [zonaId, estacionId]
    );
    return result.affectedRows;
};

/**
 * Obtiene un historial promediado de todas las estaciones de una zona.
 * Devuelve el mismo formato que getHistorialEstacion para ser compatible
 * con el controlador de predicción.
 */
export const getHistorialZona = async (zonaId, limit = 25) => {
    const zona = await getZonaById(zonaId);
    if (!zona || zona.estaciones.length === 0) return [];

    const historiales = await Promise.all(
        zona.estaciones.map(e => getHistorialEstacion(e.id, limit))
    );

    const validos = historiales.filter(h => h.length > 0);
    if (validos.length === 0) return [];

    const avgAt = (pos) => {
        const rows = validos.map(h => h[pos] ?? h[h.length - 1]).filter(Boolean);
        if (rows.length === 0) return null;
        const n = rows.length;
        const sum = (f) => rows.reduce((s, r) => s + (Number(r[f]) || 0), 0);
        return {
            temperatura:      sum('temperatura') / n,
            humedad:          sum('humedad') / n,
            presion_at:       sum('presion_at') / n,
            velocidad_viento: sum('velocidad_viento') / n,
            fecha_registro:   rows[0].fecha_registro,
            latitud:          sum('latitud') / n,
            longitud:         sum('longitud') / n,
            estacion_nombre:  `Zona: ${zona.nombre}`,
            ubicacion:        `Zona meteorológica (${n} estaciones)`,
            estacion_estado:  'Activa',
        };
    };

    const result = [];
    for (let i = 0; i < limit; i++) {
        const row = avgAt(i);
        if (row) result.push(row);
    }
    return result;
};
