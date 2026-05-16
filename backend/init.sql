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

-- Tabla: FAVORITOS DE USUARIO POR ESTACION
CREATE TABLE IF NOT EXISTS usuarios_estaciones_favoritas (
  id_usuario INT NOT NULL,
  id_estacion INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario, id_estacion),
  CONSTRAINT fk_favorito_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_favorito_estacion
    FOREIGN KEY (id_estacion) REFERENCES estaciones(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: DISPOSITIVOS (Hardware / Edges)
CREATE TABLE IF NOT EXISTS dispositivos (
  device_id VARCHAR(50) PRIMARY KEY,
  modelo VARCHAR(50) DEFAULT 'ZY-ESP32',
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
    -- Gases MQ135 (JSON v2.1 — NULL en lecturas anteriores al sensor)
    gas_co2     FLOAT NULL DEFAULT NULL COMMENT 'CO2 en ppm (400-5000)',
    gas_nh3     FLOAT NULL DEFAULT NULL COMMENT 'Amoniaco NH3 en ppm (10-300)',
    gas_alcohol FLOAT NULL DEFAULT NULL COMMENT 'Alcohol en ppm (10-300)',
    gas_humo    FLOAT NULL DEFAULT NULL COMMENT 'Humo en ppm (10-500)',
    gas_benceno FLOAT NULL DEFAULT NULL COMMENT 'Benceno en ppm (10-100)',
    gas_acetona FLOAT NULL DEFAULT NULL COMMENT 'Acetona en ppm (10-500)',
    CONSTRAINT fk_lectura_dispositivo
        FOREIGN KEY (device_id) REFERENCES dispositivos(device_id)
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Zonas del clima (configuracion admin)
CREATE TABLE IF NOT EXISTS zonas_clima (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 );

-- Tabla estaciones que componen la zona (configuracion admin)
 CREATE TABLE IF NOT EXISTS zona_estaciones (
    zona_id INT NOT NULL,
    estacion_id INT NOT NULL,
    PRIMARY KEY (zona_id, estacion_id),
    FOREIGN KEY (zona_id) REFERENCES zonas_clima(id) ON DELETE CASCADE,
    FOREIGN KEY (estacion_id) REFERENCES estaciones(id) ON DELETE CASCADE
 );

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
INSERT IGNORE INTO dispositivos (device_id, estado, id_estacion, modelo, bateria, ultima_conexion) VALUES 
('UTALCA_GENERICO', 'disponible', NULL, 'ESP32 DevKit', NULL, NULL),
('UTALCA_01', 'asignado', 1, 'ESP32 TTGO T3 v1.6', 85.3, '2026-01-15 12:00:00'),
('UTALCA_02', 'asignado', 2, 'ESP32 TTGO T3 v1.6', 92.7, '2026-01-15 12:00:00');