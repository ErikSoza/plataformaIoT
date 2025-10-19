CREATE DATABASE IF NOT EXISTS plataformaiot;
USE plataformaiot;

-- Tabla principal de estaciones meteorológicas
CREATE TABLE estaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,                    -- Nombre descriptivo
  tipo VARCHAR(50) DEFAULT 'Sensor Ambiental IoT', -- Tipo de dispositivo
  estado ENUM('Activo', 'Inactivo', 'Mantenimiento', 'Error') DEFAULT 'Activo',
  ultima_actualizacion DATETIME,                          -- Última lectura
  localizacion VARCHAR(150),                         -- Descripción textual
  latitud DECIMAL(10,7),                        -- Coordenadas
  longitud DECIMAL(10,7),
  temperatura DECIMAL(5,2),                      -- °C
  humedad DECIMAL(5,2),                         -- %
  bateria INT,                                   -- Nivel de batería (%)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos de ejemplo (8 estaciones del Campus UTalca + Curicó)
INSERT INTO estaciones (nombre, tipo, estado, ultima_actualizacion, localizacion, latitud, longitud, temperatura, humedad, bateria)
VALUES
('Sensor Centro Extensión Curicó', 'Sensor Ambiental IoT', 'Activo', '2025-10-07 14:30', 'Curicó, Campus UTalca', -34.9849294, -71.2406668, 22.5, 65, 87),
('Sensor Facultad Ingeniería', 'Sensor Ambiental IoT', 'Activo', '2025-10-07 14:28', 'Curicó, Facultad Ingeniería', -35.0017581, -71.2297514, 28.1, 45, 92),
('Sensor Biblioteca Central', 'Sensor Ambiental IoT', 'Mantenimiento', '2025-10-07 12:15', 'Campus UTalca, Biblioteca', -35.0029305, -71.2292251, 18.8, 82, 23),
('Sensor Edificio Mecánica', 'Sensor Ambiental IoT', 'Activo', '2025-10-07 11:45', 'Campus UTalca, Mecánica', -35.0020822, -71.2291337, 25.2, 52, 65),
('Sensor Cerro Condel', 'Sensor Ambiental IoT', 'Activo', '2025-10-07 14:35', 'Curicó, Cerro Condel', -34.9779525, -71.2260893, 16.3, 78, 76),
('Sensor Laboratorio Química', 'Sensor Ambiental IoT', 'Activo', '2025-10-07 14:32', 'Campus UTalca, Química', -35.0015225, -71.2285634, 31.5, 38, 88),
('Sensor Auditorio Principal', 'Sensor Ambiental IoT', 'Activo', '2025-10-07 14:29', 'Campus UTalca, Auditorio', -35.0025118, -71.2298467, 19.7, 60, 45),
('Sensor Cafetería Central', 'Sensor Ambiental IoT', 'Activo', '2025-10-07 14:33', 'Campus UTalca, Cafetería', -35.0022634, -71.2294852, 26.8, 55, 71);
