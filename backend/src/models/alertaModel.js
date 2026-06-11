import pool from '../db/connection.js';

// ── LABELS / UNITS ────────────────────────────────────────────────────────────

const VARIABLE_LABELS = {
  temperatura: 'Temperatura',
  humedad: 'Humedad',
  presion_at: 'Presión Atm.',
  velocidad_viento: 'Vel. Viento',
  gas_co2: 'CO₂',
  gas_nh3: 'NH₃',
  gas_alcohol: 'Alcohol',
  gas_humo: 'Humo',
  gas_benceno: 'Benceno',
  gas_acetona: 'Acetona',
};

const VARIABLE_UNITS = {
  temperatura: '°C',
  humedad: '%',
  presion_at: 'hPa',
  velocidad_viento: 'm/s',
  gas_co2: 'ppm',
  gas_nh3: 'ppm',
  gas_alcohol: 'ppm',
  gas_humo: 'ppm',
  gas_benceno: 'ppm',
  gas_acetona: 'ppm',
};

// ── REGLAS ────────────────────────────────────────────────────────────────────

export const getAllReglas = async (id_usuario = null) => {
  const [rows] = await pool.query(`
    SELECT r.*, e.nombre AS estacion_nombre
    FROM reglas_alerta r
    JOIN estaciones e ON r.id_estacion = e.id
    ${id_usuario ? 'WHERE r.id_usuario = ?' : ''}
    ORDER BY r.created_at DESC
  `, id_usuario ? [id_usuario] : []);
  return rows;
};

export const getReglasByEstacion = async (id_estacion, id_usuario = null) => {
  const [rows] = await pool.query(`
    SELECT r.*, e.nombre AS estacion_nombre
    FROM reglas_alerta r
    JOIN estaciones e ON r.id_estacion = e.id
    WHERE r.id_estacion = ?
      ${id_usuario ? 'AND r.id_usuario = ?' : ''}
    ORDER BY r.created_at DESC
  `, id_usuario ? [id_estacion, id_usuario] : [id_estacion]);
  return rows;
};

export const createRegla = async ({ id_estacion, id_usuario, variable, condicion, umbral, nivel, nombre }) => {
  const [result] = await pool.query(
    `INSERT INTO reglas_alerta (id_estacion, id_usuario, variable, condicion, umbral, nivel, nombre)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id_estacion, id_usuario, variable, condicion, umbral, nivel || 'advertencia', nombre || null]
  );
  return result.insertId;
};

export const updateRegla = async (id, { variable, condicion, umbral, nivel, nombre, activa }) => {
  const [result] = await pool.query(
    `UPDATE reglas_alerta
     SET variable=?, condicion=?, umbral=?, nivel=?, nombre=?, activa=?
     WHERE id=?`,
    [variable, condicion, umbral, nivel, nombre || null, activa, id]
  );
  return result.affectedRows;
};

export const deleteRegla = async (id) => {
  const [result] = await pool.query('DELETE FROM reglas_alerta WHERE id=?', [id]);
  return result.affectedRows;
};

export const toggleRegla = async (id) => {
  await pool.query('UPDATE reglas_alerta SET activa = NOT activa WHERE id=?', [id]);
};

// ── ALERTAS ───────────────────────────────────────────────────────────────────

export const getAlertas = async ({ soloNoLeidas = false, id_usuario = null, limit = 50 } = {}) => {
  const conditions = [];
  const params = [];

  if (soloNoLeidas) conditions.push('a.leida = 0');
  if (id_usuario)   { conditions.push('a.id_usuario = ?'); params.push(id_usuario); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(`
    SELECT a.*, e.nombre AS estacion_nombre
    FROM alertas a
    JOIN estaciones e ON a.id_estacion = e.id
    ${where}
    ORDER BY a.created_at DESC
    LIMIT ?
  `, [...params, limit]);
  return rows;
};

export const createAlerta = async ({ id_estacion, id_usuario, variable, valor_detectado, umbral_configurado, condicion, nivel, mensaje, id_regla }) => {
  const [result] = await pool.query(
    `INSERT INTO alertas (id_estacion, id_usuario, variable, valor_detectado, umbral_configurado, condicion, nivel, mensaje, id_regla)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id_estacion, id_usuario || null, variable, valor_detectado, umbral_configurado, condicion, nivel, mensaje, id_regla || null]
  );
  return result.insertId;
};

export const marcarLeida = async (id) => {
  await pool.query('UPDATE alertas SET leida=1 WHERE id=?', [id]);
};

export const marcarTodasLeidas = async (id_usuario = null) => {
  if (id_usuario) {
    await pool.query('UPDATE alertas SET leida=1 WHERE leida=0 AND id_usuario=?', [id_usuario]);
  } else {
    await pool.query('UPDATE alertas SET leida=1 WHERE leida=0');
  }
};

// ── VERIFICAR LECTURAS vs REGLAS ──────────────────────────────────────────────

export const verificarAlertas = async (id_usuario = null) => {
  // Obtener reglas activas del usuario (o todas si no se especifica)
  const [reglas] = await pool.query(`
    SELECT
      r.*,
      e.nombre AS estacion_nombre,
      l.temperatura, l.humedad, l.presion_at, l.velocidad_viento,
      l.gas_co2, l.gas_nh3, l.gas_alcohol, l.gas_humo, l.gas_benceno, l.gas_acetona,
      l.fecha_registro AS ultima_lectura
    FROM reglas_alerta r
    JOIN estaciones e ON r.id_estacion = e.id
    JOIN dispositivos d ON d.id_estacion = e.id
    JOIN lecturas l ON l.device_id = d.device_id
    WHERE r.activa = 1
      ${id_usuario ? 'AND r.id_usuario = ?' : ''}
      AND l.fecha_registro = (
        SELECT MAX(l2.fecha_registro)
        FROM lecturas l2
        JOIN dispositivos d2 ON l2.device_id = d2.device_id
        WHERE d2.id_estacion = e.id
      )
  `, id_usuario ? [id_usuario] : []);

  const nuevasAlertas = [];

  for (const regla of reglas) {
    const rawValor = regla[regla.variable];
    if (rawValor === null || rawValor === undefined) continue;

    const valor = parseFloat(rawValor);
    const umbral = parseFloat(regla.umbral);
    let disparada = false;

    switch (regla.condicion) {
      case '>':  disparada = valor > umbral;  break;
      case '<':  disparada = valor < umbral;  break;
      case '>=': disparada = valor >= umbral; break;
      case '<=': disparada = valor <= umbral; break;
    }

    if (!disparada) continue;

    // Evitar duplicados: no crear alerta si ya existe una no leída del mismo usuario en los últimos 10 minutos
    const [existing] = await pool.query(
      `SELECT id FROM alertas
       WHERE id_regla=? AND id_usuario=? AND leida=0
         AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
       LIMIT 1`,
      [regla.id, regla.id_usuario]
    );
    if (existing.length > 0) continue;

    const label = VARIABLE_LABELS[regla.variable] || regla.variable;
    const unit = VARIABLE_UNITS[regla.variable] || '';
    const mensaje = `${regla.estacion_nombre}: ${label} = ${valor} ${unit} (umbral: ${regla.condicion} ${umbral} ${unit})`;

    const id = await createAlerta({
      id_estacion: regla.id_estacion,
      id_usuario: regla.id_usuario,
      variable: regla.variable,
      valor_detectado: valor,
      umbral_configurado: umbral,
      condicion: regla.condicion,
      nivel: regla.nivel,
      mensaje,
      id_regla: regla.id,
    });

    nuevasAlertas.push({
      id,
      mensaje,
      nivel: regla.nivel,
      estacion_nombre: regla.estacion_nombre,
      variable: regla.variable,
      variable_label: label,
      variable_unit: unit,
      valor_detectado: valor,
      umbral_configurado: umbral,
      condicion: regla.condicion,
      created_at: new Date().toISOString(),
    });
  }

  return nuevasAlertas;
};
