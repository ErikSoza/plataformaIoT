-- ==========================================================
-- 🌤️ INIT SCRIPT: PLATAFORMA IoT (Versión Segura/Producción)
-- ==========================================================

-- 1. CREACIÓN DE BASE DE DATOS (Solo si no existe)
CREATE DATABASE IF NOT EXISTS plataformaiot
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE plataformaiot;

-- ==========================================================
-- 2. TABLAS MAESTRAS (Orden: Usuarios -> Estaciones -> Dispositivos)
-- ==========================================================

-- Tabla: USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  contrasena VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'usuario') DEFAULT 'usuario',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: ESTACIONES (Ubicaciones Lógicas)
CREATE TABLE IF NOT EXISTS estaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NULL,
  nombre VARCHAR(100) NOT NULL,
  ubicacion VARCHAR(255),
  latitud DECIMAL(10,6),
  longitud DECIMAL(10,6),
  descripcion TEXT,
  estado VARCHAR(50) DEFAULT 'Activa',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_estacion_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: DISPOSITIVOS (Hardware / Edges)
CREATE TABLE IF NOT EXISTS dispositivos (
  device_id VARCHAR(50) PRIMARY KEY,
  modelo VARCHAR(50) DEFAULT 'TTGO T3 v1.6',
  estado ENUM('disponible', 'asignado', 'mantenimiento') DEFAULT 'disponible',
  bateria DECIMAL(5,2),
  ultima_conexion DATETIME,
  id_estacion INT UNIQUE NULL, 
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dispositivo_estacion
    FOREIGN KEY (id_estacion) REFERENCES estaciones(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 3. TABLAS DE DATOS (Orden: Lecturas, Alertas)
-- ==========================================================

-- Tabla: LECTURAS
CREATE TABLE IF NOT EXISTS lecturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL, 
    fecha_registro DATETIME,
    raw_timestamp BIGINT,
    temperatura DECIMAL(5, 2),
    humedad DECIMAL(5, 2),
    presion_at DECIMAL(6, 1),
    velocidad_viento DECIMAL(5, 2),
    prediccion_temp DECIMAL(5, 2),
    CONSTRAINT fk_lectura_dispositivo
        FOREIGN KEY (device_id) REFERENCES dispositivos(device_id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: ALERTAS
CREATE TABLE IF NOT EXISTS alertas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_estacion INT NOT NULL,
  mensaje TEXT,
  nivel VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_alerta_estacion
    FOREIGN KEY (id_estacion) REFERENCES estaciones(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- 4. CARGA DE DATOS SEGURA (SEEDERS)
-- ==========================================================

-- Usamos INSERT IGNORE para que no falle si los datos ya existen.

-- Admin Default
INSERT IGNORE INTO usuarios (id, nombre, email, contrasena, rol) VALUES 
(1, 'Administrador', 'admin@utalca.cl', 'admin123', 'admin');

-- Estaciones Base
INSERT IGNORE INTO estaciones (id, nombre, latitud, longitud, ubicacion) VALUES 
(1, 'Campus Los Niches', -35.001, -71.229, 'Entrada Principal'),
(2, 'Campus Curicó', -34.985, -71.235, 'Edificio Ingeniería');

-- (Opcional) Hardware de prueba si lo necesitas
INSERT IGNORE INTO dispositivos (device_id, estado, id_estacion, modelo) VALUES 
('UTALCA_GENERICO', 'disponible', NULL, 'ESP32 DevKit');