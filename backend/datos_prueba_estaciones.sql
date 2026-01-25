-- ==========================================================
-- 🔧 DATOS DE PRUEBA PARA GESTIÓN DE ESTACIONES
-- ==========================================================

USE plataformaiot;

-- Insertar dispositivos de ejemplo para pruebas
INSERT IGNORE INTO dispositivos (device_id, modelo, estado, bateria, ultima_conexion, id_estacion) VALUES 
('ESP32_001', 'ESP32 DevKit V1', 'disponible', 85.5, '2025-01-24 10:30:00', NULL),
('ESP32_002', 'ESP32 DevKit V1', 'disponible', 92.3, '2025-01-24 11:15:00', NULL),
('TTGO_001', 'TTGO T3 v1.6', 'disponible', 78.9, '2025-01-24 09:45:00', NULL),
('TTGO_002', 'TTGO T3 v1.6', 'disponible', 95.1, '2025-01-24 12:00:00', NULL),
('NODE_001', 'NodeMCU v2', 'disponible', 67.8, '2025-01-24 08:30:00', NULL),
('WEMOS_001', 'Wemos D1 Mini', 'disponible', 88.4, '2025-01-24 13:20:00', NULL),
('FEATHER_001', 'Adafruit Feather', 'disponible', 90.7, '2025-01-24 14:15:00', NULL);

-- Actualizar el dispositivo genérico para que esté disponible
UPDATE dispositivos 
SET estado = 'disponible', id_estacion = NULL 
WHERE device_id = 'UTALCA_GENERICO';

-- Crear algunas estaciones de ejemplo adicionales si no existen
INSERT IGNORE INTO estaciones (id, nombre, latitud, longitud, ubicacion, descripcion) VALUES 
(3, 'Campus Linares', -35.845, -71.606, 'Edificio Administración', 'Estación de monitoreo ambiental del campus Linares'),
(4, 'Campus Santiago', -33.449, -70.657, 'Centro de Investigación', 'Estación urbana de monitoreo de calidad del aire'),
(5, 'Campo Experimental', -35.012, -71.194, 'Invernadero Principal', 'Monitoreo de condiciones ambientales en agricultura'),
(6, 'Laboratorio Central', -34.995, -71.225, 'Piso 3, Ala Norte', 'Control ambiental de laboratorios de investigación');

-- Opcional: Asignar algunos dispositivos a estaciones para demostración
-- (Descomenta las siguientes líneas si quieres ver estaciones con dispositivos ya asignados)

-- UPDATE dispositivos 
-- SET id_estacion = 1, estado = 'asignado' 
-- WHERE device_id = 'ESP32_001';

-- UPDATE dispositivos 
-- SET id_estacion = 2, estado = 'asignado' 
-- WHERE device_id = 'TTGO_001';