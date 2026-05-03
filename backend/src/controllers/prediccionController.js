import { getHistorialEstacion } from '../models/prediccionModel.js';
import { getHistorialZona, getZonaById } from '../models/zonaModel.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
// v2: temperatura usa lags 1-24h → necesitamos 24 lecturas históricas + 1 actual
const LAG_WINDOW = 24;

/**
 * GET /api/prediccion/:estacion_id?horas=72
 *
 * Proxy entre el frontend y el microservicio FastAPI:
 *   1. Lee las últimas 25 lecturas de MySQL (1 actual + 24 lags)
 *   2. Llama internamente a ml_service /predict con el historial real
 *   3. Retorna la respuesta enriquecida con datos de la estación
 */
export const getPrediccion = async (req, res) => {
    const { estacion_id } = req.params;
    const horas = parseInt(req.query.horas) || 72;

    const horizontesValidos = [24, 48, 72];
    if (!horizontesValidos.includes(horas)) {
        return res.status(400).json({
            error: `El parámetro 'horas' debe ser uno de ${horizontesValidos.join(', ')}`,
        });
    }

    // 1 ── Obtener lecturas de MySQL
    let historial;
    try {
        historial = await getHistorialEstacion(estacion_id, LAG_WINDOW + 1);
    } catch (dbError) {
        console.error('Error al consultar MySQL para predicción:', dbError);
        return res.status(500).json({ error: 'Error al obtener lecturas de la estación' });
    }

    if (!historial || historial.length === 0) {
        return res.status(404).json({
            error: `No se encontraron lecturas para la estación ${estacion_id}`,
        });
    }

    // 2 ── Extraer lectura actual y lags
    const actual = historial[0];
    // Los lags van de T-1h (índice 1) a T-24h (índice 24)
    // Si hay menos lecturas, se rellena con la lectura más antigua disponible
    const lags = [];
    for (let i = 1; i <= LAG_WINDOW; i++) {
        lags.push(historial[i] ?? historial[historial.length - 1]);
    }

    const payload = {
        horas,
        temp_actual: actual.temperatura,
        humedad: actual.humedad,
        presion: actual.presion_at,
        viento: actual.velocidad_viento,
        lat: actual.latitud,
        lon: actual.longitud,
        historial: lags.map((l) => ({
            temperatura:      l.temperatura,
            humedad:          l.humedad,
            velocidad_viento: l.velocidad_viento,
            presion:          l.presion_at ?? null,   // BMP280 — null si no disponible
        })),
    };

    // 3 ── Llamar al microservicio Python
    let mlResponse;
    try {
        const response = await fetch(`${ML_SERVICE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
            const detalle = await response.text();
            console.error(`ml_service respondió ${response.status}:`, detalle);
            return res.status(502).json({
                error: 'El servicio de predicción devolvió un error',
                detalle: response.status === 400 ? JSON.parse(detalle) : undefined,
            });
        }

        mlResponse = await response.json();
    } catch (fetchError) {
        console.error('Error al contactar ml_service:', fetchError.message);
        return res.status(503).json({
            error: 'El microservicio de predicción no está disponible',
            sugerencia: 'Verifica que ml_service esté corriendo en el puerto 5001',
        });
    }

    // 4 ── Enriquecer respuesta con datos de la estación
    return res.json({
        estacion: {
            id: parseInt(estacion_id),
            nombre: actual.estacion_nombre,
            ubicacion: actual.ubicacion,
            estado: actual.estacion_estado,
            coordenadas: { lat: actual.latitud, lon: actual.longitud },
            lecturas_usadas: historial.length,
        },
        ...mlResponse,
    });
};

/**
 * GET /api/prediccion/zona/:zona_id?horas=72
 *
 * Igual que getPrediccion pero usa el promedio de todas las estaciones de la zona.
 */
export const getPrediccionZona = async (req, res) => {
    const { zona_id } = req.params;
    const horas = parseInt(req.query.horas) || 72;

    const horizontesValidos = [24, 48, 72];
    if (!horizontesValidos.includes(horas)) {
        return res.status(400).json({ error: `El parámetro 'horas' debe ser uno de ${horizontesValidos.join(', ')}` });
    }

    let historial;
    try {
        historial = await getHistorialZona(zona_id, LAG_WINDOW + 1);
    } catch (dbError) {
        console.error('Error al consultar historial de zona:', dbError);
        return res.status(500).json({ error: 'Error al obtener lecturas de la zona' });
    }

    if (!historial || historial.length === 0) {
        return res.status(404).json({ error: `No se encontraron lecturas para la zona ${zona_id}` });
    }

    const actual = historial[0];
    const lags = [];
    for (let i = 1; i <= LAG_WINDOW; i++) {
        lags.push(historial[i] ?? historial[historial.length - 1]);
    }

    const payload = {
        horas,
        temp_actual: actual.temperatura,
        humedad: actual.humedad,
        presion: actual.presion_at,
        viento: actual.velocidad_viento,
        lat: actual.latitud,
        lon: actual.longitud,
        historial: lags.map((l) => ({
            temperatura:      l.temperatura,
            humedad:          l.humedad,
            velocidad_viento: l.velocidad_viento,
            presion:          l.presion_at ?? null,
        })),
    };

    let mlResponse;
    try {
        const response = await fetch(`${ML_SERVICE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
            const detalle = await response.text();
            return res.status(502).json({ error: 'El servicio de predicción devolvió un error', detalle: response.status === 400 ? JSON.parse(detalle) : undefined });
        }

        mlResponse = await response.json();
    } catch (fetchError) {
        console.error('Error al contactar ml_service:', fetchError.message);
        return res.status(503).json({ error: 'El microservicio de predicción no está disponible', sugerencia: 'Verifica que ml_service esté corriendo en el puerto 5001' });
    }

    const zona = await getZonaById(zona_id);

    return res.json({
        zona: {
            id: parseInt(zona_id),
            nombre: zona?.nombre || actual.estacion_nombre,
            descripcion: zona?.descripcion,
            total_estaciones: zona?.estaciones?.length || 0,
            lecturas_usadas: historial.length,
        },
        ...mlResponse,
    });
};
