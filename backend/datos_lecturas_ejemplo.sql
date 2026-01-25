-- ==========================================================
-- 📊 DATOS DE EJEMPLO PARA LECTURAS - GESTIÓN DE ESTACIONES
-- ==========================================================

USE plataformaiot;

-- Primero, asegurarnos de que tenemos dispositivos asignados a estaciones
-- Asignar algunos dispositivos a las estaciones existentes si no están asignados

UPDATE dispositivos 
SET id_estacion = 1, estado = 'asignado' 
WHERE device_id = 'ESP32_001' AND estado = 'disponible';

UPDATE dispositivos 
SET id_estacion = 2, estado = 'asignado' 
WHERE device_id = 'TTGO_001' AND estado = 'disponible';

-- Insertar lecturas de ejemplo para los dispositivos asignados
INSERT INTO lecturas (device_id, fecha_registro, raw_timestamp, temperatura, humedad, presion_at, velocidad_viento, prediccion_temp) VALUES 
-- Lecturas para ESP32_001 (Estación 1: Campus Los Niches)
('ESP32_001', '2025-01-24 08:00:00', UNIX_TIMESTAMP('2025-01-24 08:00:00'), 22.5, 65.2, 1013.2, 2.1, 23.1),
('ESP32_001', '2025-01-24 08:30:00', UNIX_TIMESTAMP('2025-01-24 08:30:00'), 23.1, 63.8, 1012.8, 2.3, 23.8),
('ESP32_001', '2025-01-24 09:00:00', UNIX_TIMESTAMP('2025-01-24 09:00:00'), 24.2, 61.5, 1012.1, 2.7, 24.5),
('ESP32_001', '2025-01-24 09:30:00', UNIX_TIMESTAMP('2025-01-24 09:30:00'), 25.3, 58.9, 1011.7, 3.1, 25.8),
('ESP32_001', '2025-01-24 10:00:00', UNIX_TIMESTAMP('2025-01-24 10:00:00'), 26.1, 56.2, 1011.3, 3.4, 26.7),
('ESP32_001', '2025-01-24 10:30:00', UNIX_TIMESTAMP('2025-01-24 10:30:00'), 27.2, 53.1, 1010.9, 3.8, 27.9),

-- Lecturas para TTGO_001 (Estación 2: Campus Curicó)  
('TTGO_001', '2025-01-24 08:00:00', UNIX_TIMESTAMP('2025-01-24 08:00:00'), 20.8, 68.5, 1014.1, 1.8, 21.5),
('TTGO_001', '2025-01-24 08:30:00', UNIX_TIMESTAMP('2025-01-24 08:30:00'), 21.4, 66.9, 1013.9, 2.0, 22.1),
('TTGO_001', '2025-01-24 09:00:00', UNIX_TIMESTAMP('2025-01-24 09:00:00'), 22.6, 64.2, 1013.4, 2.4, 23.2),
('TTGO_001', '2025-01-24 09:30:00', UNIX_TIMESTAMP('2025-01-24 09:30:00'), 23.7, 61.8, 1013.0, 2.8, 24.4),
('TTGO_001', '2025-01-24 10:00:00', UNIX_TIMESTAMP('2025-01-24 10:00:00'), 24.5, 59.3, 1012.6, 3.2, 25.1),
('TTGO_001', '2025-01-24 10:30:00', UNIX_TIMESTAMP('2025-01-24 10:30:00'), 25.8, 56.7, 1012.2, 3.6, 26.5),

-- Lecturas adicionales para los últimos días
('ESP32_001', '2025-01-23 15:00:00', UNIX_TIMESTAMP('2025-01-23 15:00:00'), 28.5, 48.2, 1009.8, 4.2, 29.1),
('ESP32_001', '2025-01-23 15:30:00', UNIX_TIMESTAMP('2025-01-23 15:30:00'), 29.1, 45.6, 1009.3, 4.5, 30.2),
('TTGO_001', '2025-01-23 15:00:00', UNIX_TIMESTAMP('2025-01-23 15:00:00'), 26.3, 51.4, 1010.5, 3.8, 27.1),
('TTGO_001', '2025-01-23 15:30:00', UNIX_TIMESTAMP('2025-01-23 15:30:00'), 27.1, 49.2, 1010.1, 4.1, 28.0),

-- Lecturas de ayer
('ESP32_001', '2025-01-22 12:00:00', UNIX_TIMESTAMP('2025-01-22 12:00:00'), 31.2, 42.8, 1008.1, 5.1, 32.4),
('ESP32_001', '2025-01-22 18:00:00', UNIX_TIMESTAMP('2025-01-22 18:00:00'), 25.7, 58.9, 1011.2, 2.9, 26.3),
('TTGO_001', '2025-01-22 12:00:00', UNIX_TIMESTAMP('2025-01-22 12:00:00'), 29.4, 46.1, 1009.2, 4.7, 30.8),
('TTGO_001', '2025-01-22 18:00:00', UNIX_TIMESTAMP('2025-01-22 18:00:00'), 23.8, 61.5, 1012.8, 2.5, 24.6);

-- Verificar que las lecturas se insertaron correctamente
SELECT 
    COUNT(*) as total_lecturas,
    COUNT(DISTINCT device_id) as dispositivos_con_datos,
    MIN(fecha_registro) as primera_lectura,
    MAX(fecha_registro) as ultima_lectura
FROM lecturas;