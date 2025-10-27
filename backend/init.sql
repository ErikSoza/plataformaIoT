-- ==========================================================
-- 🌤️ Proyecto: Estaciones Meteorológicas IoT
-- ==========================================================

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS plataformaiot
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE plataformaiot;

-- ==========================================================
-- Tabla: Usuarios
-- ==========================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'usuario') DEFAULT 'usuario',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================
-- Tabla: Estaciones
-- ==========================================================
CREATE TABLE IF NOT EXISTS estaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NULL,
  nombre VARCHAR(100) NOT NULL,
  localizacion VARCHAR(255),
  latitud DECIMAL(10,6),
  longitud DECIMAL(10,6),
  estado VARCHAR(50) DEFAULT 'Activo',
  bateria DECIMAL(5,2),
  ultima_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_estacion_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================
-- Tabla: Lecturas
-- ==========================================================
-- Cada fila representa una lectura completa enviada por una estación.
-- El campo 'json' almacena todos los valores de sensores (temperatura, humedad, etc.)
CREATE TABLE IF NOT EXISTS lecturas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_estacion INT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  json JSON NOT NULL,
  CONSTRAINT fk_lectura_estacion
    FOREIGN KEY (id_estacion) REFERENCES estaciones(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================
-- Tabla: Alertas
-- ==========================================================
-- Registra eventos o notificaciones de cada estación
CREATE TABLE IF NOT EXISTS alertas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_estacion INT NOT NULL,
  mensaje TEXT,
  nivel VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_alerta_estacion
    FOREIGN KEY (id_estacion) REFERENCES estaciones(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================
-- Datos de ejemplo opcionales
-- ==========================================================
INSERT INTO usuarios (nombre, email, contrasena, rol)
VALUES ('Admin Principal', 'admin@utalca.cl', 'hash123', 'admin')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO estaciones (id_usuario, nombre, localizacion, latitud, longitud, estado, bateria)
VALUES 
(NULL, 'Sensor Facultad Ingeniería', 'Campus Curicó', -35.0017581, -71.2297514, 'Activo', 92),
(NULL, 'Sensor Biblioteca Central', 'Campus Curicó', -35.0029305, -71.2292251, 'Mantenimiento', 23)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);
