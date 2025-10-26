-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS plataformaiot
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE plataformaiot;

-- ==========================================================
-- Tabla: Usuario
-- ==========================================================
CREATE TABLE IF NOT EXISTS usuarios(
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
-- Tabla: Sensores
-- ==========================================================
CREATE TABLE IF NOT EXISTS sensores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_estacion INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  estado VARCHAR(50) DEFAULT 'Activo',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sensor_estacion
    FOREIGN KEY (id_estacion) REFERENCES estaciones(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================
-- Tabla: Lecturas
-- ==========================================================
CREATE TABLE IF NOT EXISTS lecturas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_sensor INT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  valor FLOAT,
  json JSON,
  CONSTRAINT fk_lectura_sensor
    FOREIGN KEY (id_sensor) REFERENCES sensores(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================
-- Tabla: Alertas
-- ==========================================================
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