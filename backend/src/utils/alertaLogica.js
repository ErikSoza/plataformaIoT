/**
 * Evalúa si un valor medido cumple la condición definida en una regla de alerta.
 * Extraído de verificarAlertas() para permitir pruebas unitarias independientes.
 *
 * @param {number} valor      - Valor medido por el sensor (ya parseado a float)
 * @param {string} condicion  - Operador: '>', '<', '>=', '<='
 * @param {number} umbral     - Umbral configurado en la regla (ya parseado a float)
 * @returns {boolean}         - true si la condición se cumple (alerta debe dispararse)
 */
export function evaluarCondicion(valor, condicion, umbral) {
  switch (condicion) {
    case '>':  return valor > umbral;
    case '<':  return valor < umbral;
    case '>=': return valor >= umbral;
    case '<=': return valor <= umbral;
    default:   return false;
  }
}
