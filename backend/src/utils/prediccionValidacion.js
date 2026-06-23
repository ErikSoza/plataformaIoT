const HORIZONTES_VALIDOS = [24, 48, 72];
const VARIABLES_VALIDAS  = ['temperatura', 'humedad', 'presion', 'viento'];

/**
 * Valida los parámetros de una petición de predicción.
 * Extraído de getPrediccion() y getPrediccionZona() para eliminar duplicación
 * y permitir pruebas unitarias independientes.
 *
 * @param {number} horas     - Horizonte de predicción en horas
 * @param {string} variable  - Variable meteorológica a predecir
 * @returns {null | {status: number, error: string}}
 *   null si los parámetros son válidos; objeto de error si no lo son.
 */
export function validarParametrosPrediccion(horas, variable) {
  if (!HORIZONTES_VALIDOS.includes(horas)) {
    return {
      status: 400,
      error: `El parámetro 'horas' debe ser uno de ${HORIZONTES_VALIDOS.join(', ')}`,
    };
  }
  if (!VARIABLES_VALIDAS.includes(variable)) {
    return {
      status: 400,
      error: `El parámetro 'variable' debe ser uno de ${VARIABLES_VALIDAS.join(', ')}`,
    };
  }
  return null;
}
