-- Script para actualizar estados de estaciones existentes
USE plataformaiot;

-- Actualizar estaciones que no tienen estado definido
UPDATE estaciones 
SET estado = 'Activa' 
WHERE estado IS NULL OR estado = '' OR estado = 'Activo' OR estado = 'activo';

-- Verificar el resultado
SELECT id, nombre, estado FROM estaciones;