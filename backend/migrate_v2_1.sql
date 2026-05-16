-- ==========================================================
-- MIGRACIÓN v2.1: Soporte MQ135 (6 gases independientes)
-- Ejecutar SOLO UNA VEZ sobre la BD existente
-- ==========================================================

USE plataformaiot;

-- Eliminar columna antigua si existía en alguna versión anterior
ALTER TABLE lecturas
DROP COLUMN IF EXISTS gases_ppm;

-- Agregar las 6 columnas del MQ135
ALTER TABLE lecturas
ADD COLUMN gas_co2     FLOAT NULL DEFAULT NULL COMMENT 'CO2 en ppm (400-5000)',
ADD COLUMN gas_nh3     FLOAT NULL DEFAULT NULL COMMENT 'Amoniaco NH3 en ppm (10-300)',
ADD COLUMN gas_alcohol FLOAT NULL DEFAULT NULL COMMENT 'Alcohol en ppm (10-300)',
ADD COLUMN gas_humo    FLOAT NULL DEFAULT NULL COMMENT 'Humo en ppm (10-500)',
ADD COLUMN gas_benceno FLOAT NULL DEFAULT NULL COMMENT 'Benceno en ppm (10-100)',
ADD COLUMN gas_acetona FLOAT NULL DEFAULT NULL COMMENT 'Acetona en ppm (10-500)';

-- Verificación post-migración
DESCRIBE lecturas;

SELECT
  COUNT(*) AS total_filas,
  SUM(CASE WHEN gas_co2 IS NULL THEN 1 ELSE 0 END) AS filas_sin_gases
FROM lecturas;
