-- ==========================================================
-- MIGRACIÓN: Sistema de Alertas v2
-- Ejecutar UNA VEZ en la base de datos existente
-- ==========================================================

-- Tabla de reglas (umbrales definidos por el usuario)
CREATE TABLE IF NOT EXISTS reglas_alerta (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  id_estacion  INT NOT NULL,
  id_usuario   INT NOT NULL,
  variable     VARCHAR(50) NOT NULL,
  condicion    ENUM('>','<','>=','<=') NOT NULL DEFAULT '>',
  umbral       DECIMAL(10,2) NOT NULL,
  nivel        ENUM('info','advertencia','critico') NOT NULL DEFAULT 'advertencia',
  nombre       VARCHAR(100) NULL,
  activa       TINYINT(1) DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_regla_estacion FOREIGN KEY (id_estacion)
    REFERENCES estaciones(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_regla_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Recrear alertas con esquema completo (opción recomendada si la tabla está vacía)
DROP TABLE IF EXISTS alertas;
CREATE TABLE alertas (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  id_estacion         INT NOT NULL,
  id_usuario          INT NULL,
  variable            VARCHAR(50) NULL,
  valor_detectado     DECIMAL(10,2) NULL,
  umbral_configurado  DECIMAL(10,2) NULL,
  condicion           VARCHAR(5) NULL,
  mensaje             TEXT,
  nivel               VARCHAR(50) DEFAULT 'advertencia',
  leida               TINYINT(1) DEFAULT 0,
  id_regla            INT NULL,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_alerta_estacion
    FOREIGN KEY (id_estacion) REFERENCES estaciones(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
