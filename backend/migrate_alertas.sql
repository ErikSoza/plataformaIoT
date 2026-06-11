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

-- Agregar columnas nuevas a la tabla alertas existente
-- (ADD COLUMN IF NOT EXISTS requiere MySQL 8+; en 5.7 comentar las que ya existan)
ALTER TABLE alertas
  ADD COLUMN IF NOT EXISTS variable           VARCHAR(50)    NULL AFTER id_estacion,
  ADD COLUMN IF NOT EXISTS valor_detectado    DECIMAL(10,2)  NULL AFTER variable,
  ADD COLUMN IF NOT EXISTS umbral_configurado DECIMAL(10,2)  NULL AFTER valor_detectado,
  ADD COLUMN IF NOT EXISTS condicion          VARCHAR(5)     NULL AFTER umbral_configurado,
  ADD COLUMN IF NOT EXISTS leida              TINYINT(1)     DEFAULT 0 AFTER nivel,
  ADD COLUMN IF NOT EXISTS id_regla           INT            NULL AFTER leida;
