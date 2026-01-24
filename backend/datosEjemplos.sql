USE plataformaiot;

-- ==========================================================
-- 8. CARGA DE DATOS INICIALES (SEEDERS)
-- ==========================================================

-- Usuario Admin
INSERT INTO usuarios (nombre, email, contrasena, rol) VALUES 
('Administrador', 'admin@utalca.cl', 'admin123', 'admin');

-- Estaciones (Lugares)
INSERT INTO estaciones (nombre, latitud, longitud, ubicacion) VALUES 
('Campus Los Niches', -35.001, -71.229, 'Entrada Principal'),
('Campus Curicó', -34.985, -71.235, 'Edificio Ingeniería');


-- ==========================================================
-- 9. CARGA DE DATOS DE EJEMPLO (LECTURAS)
-- ==========================================================


INSERT INTO lecturas (device_id, fecha_registro, raw_timestamp, temperatura, humedad, presion_at, velocidad_viento, prediccion_temp) VALUES
-- DATOS ESTACIÓN 1
('UTALCA_01', '2026-01-15 08:00:00', 1768464000, 16.1, 81.1, 1015.7, 8.5, 17.2),
('UTALCA_01', '2026-01-15 09:00:00', 1768467600, 16.6, 75.0, 1013.5, 4.0, 17.4),
('UTALCA_01', '2026-01-15 10:00:00', 1768471200, 17.1, 70.2, 1012.1, 3.4, 19.0),
('UTALCA_01', '2026-01-15 11:00:00', 1768474800, 19.8, 64.9, 1011.2, 4.3, 20.7),
('UTALCA_01', '2026-01-15 12:00:00', 1768478400, 21.5, 57.2, 1015.1, 4.9, 23.3),

-- DATOS ESTACIÓN 2
('UTALCA_02', '2026-01-15 08:00:00', 1768464000, 14.6, 80.6, 1012.8, 0.2, 15.9),
('UTALCA_02', '2026-01-15 09:00:00', 1768467600, 16.9, 74.5, 1012.6, 3.6, 18.5),
('UTALCA_02', '2026-01-15 10:00:00', 1768471200, 18.4, 65.3, 1012.5, 4.1, 19.7),
('UTALCA_02', '2026-01-15 11:00:00', 1768474800, 19.2, 63.3, 1012.3, 5.0, 20.7),
('UTALCA_02', '2026-01-15 12:00:00', 1768478400, 21.2, 57.4, 1013.0, 5.8, 22.2);