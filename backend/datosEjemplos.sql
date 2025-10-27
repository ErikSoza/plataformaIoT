-- Insertar estaciones de ejemplo (basadas en los datos del frontend)
INSERT INTO estaciones (id_usuario, nombre, localizacion, latitud, longitud, estado, bateria) VALUES
(1, 'Sensor Centro Extensión Curicó', 'Centro de Extensión Curicó', -34.9849294, -71.2406668, 'Activo', 87),
(1, 'Sensor Facultad Ingeniería', 'Facultad de Ingeniería', -35.0017581, -71.2297514, 'Activo', 92),
(1, 'Sensor Biblioteca Central', 'Biblioteca Central', -35.0029305, -71.2292251, 'Mantenimiento', 23),
(1, 'Sensor Edificio Mecánica', 'Edificio de Mecánica', -35.0020822, -71.2291337, 'Activo', 65),
(1, 'Sensor Cerro Condel', 'Cerro Condel', -34.9779525, -71.2260893, 'Activo', 76),
(1, 'Sensor Laboratorio Química', 'Laboratorio de Química', -35.0015225, -71.2285634, 'Activo', 88),
(1, 'Sensor Auditorio Principal', 'Auditorio Principal', -35.0025118, -71.2298467, 'Activo', 45),
(1, 'Sensor Cafetería Central', 'Cafetería Central', -35.0022634, -71.2294852, 'Activo', 71)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Insertar lecturas con formato JSON desde ESP32
INSERT INTO lecturas (id_estacion, timestamp, json) VALUES
-- Estación 1: Centro Extensión Curicó
(1, '2025-10-26 14:30:00', '{"temperatura": 22.5, "humedad": 65.0, "presion": 1013.2, "gas": 0.05, "radiacion": 350, "viento": 2.1, "bateria": 87}'),

-- Estación 2: Facultad Ingeniería  
(2, '2025-10-26 14:28:00', '{"temperatura": 28.1, "humedad": 45.0, "presion": 1012.8, "gas": 0.03, "radiacion": 380, "viento": 3.2, "bateria": 92}'),

-- Estación 3: Biblioteca Central (datos antiguos por mantenimiento)
(3, '2025-10-26 12:15:00', '{"temperatura": 18.8, "humedad": 82.0, "presion": 1014.1, "gas": 0.02, "radiacion": 200, "viento": 1.5, "bateria": 23}'),

-- Estación 4: Edificio Mecánica
(4, '2025-10-26 11:45:00', '{"temperatura": 25.2, "humedad": 52.0, "presion": 1011.5, "gas": 0.04, "radiacion": 320, "viento": 2.8, "bateria": 65}'),

-- Estación 5: Cerro Condel
(5, '2025-10-26 14:35:00', '{"temperatura": 16.3, "humedad": 78.0, "presion": 1015.3, "gas": 0.01, "radiacion": 280, "viento": 4.5, "bateria": 76}'),

-- Estación 6: Laboratorio Química
(6, '2025-10-26 14:32:00', '{"temperatura": 31.5, "humedad": 38.0, "presion": 1010.2, "gas": 0.08, "radiacion": 420, "viento": 1.2, "bateria": 88}'),

-- Estación 7: Auditorio Principal
(7, '2025-10-26 14:29:00', '{"temperatura": 19.7, "humedad": 60.0, "presion": 1013.8, "gas": 0.03, "radiacion": 300, "viento": 2.0, "bateria": 45}'),

-- Estación 8: Cafetería Central
(8, '2025-10-26 14:33:00', '{"temperatura": 26.8, "humedad": 55.0, "presion": 1012.1, "gas": 0.06, "radiacion": 340, "viento": 2.5, "bateria": 71}');

-- Insertar algunas lecturas adicionales para mostrar historial
INSERT INTO lecturas (id_estacion, timestamp, json) VALUES
-- Historial Estación 1
(1, '2025-10-26 13:30:00', '{"temperatura": 21.8, "humedad": 67.0, "presion": 1013.0, "gas": 0.04, "radiacion": 330, "viento": 2.3, "bateria": 87}'),
(1, '2025-10-26 12:30:00', '{"temperatura": 20.5, "humedad": 69.0, "presion": 1013.5, "gas": 0.04, "radiacion": 310, "viento": 1.8, "bateria": 88}'),
(1, '2025-10-26 11:30:00', '{"temperatura": 19.2, "humedad": 71.0, "presion": 1014.0, "gas": 0.03, "radiacion": 290, "viento": 1.5, "bateria": 89}'),

-- Historial Estación 2
(2, '2025-10-26 13:28:00', '{"temperatura": 27.5, "humedad": 47.0, "presion": 1012.5, "gas": 0.03, "radiacion": 370, "viento": 3.0, "bateria": 93}'),
(2, '2025-10-26 12:28:00', '{"temperatura": 26.8, "humedad": 49.0, "presion": 1013.0, "gas": 0.03, "radiacion": 360, "viento": 2.8, "bateria": 94}'),
(2, '2025-10-26 11:28:00', '{"temperatura": 25.1, "humedad": 51.0, "presion": 1013.2, "gas": 0.02, "radiacion": 340, "viento": 2.5, "bateria": 95}');
