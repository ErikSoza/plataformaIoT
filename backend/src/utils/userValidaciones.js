/**
 * Funciones de validación de campos de usuario.
 * Extraídas de userController.js para permitir pruebas unitarias sin
 * importar la cadena de dependencias DB (pool → connection.js).
 */

/** Valida formato de email con expresión regular básica. */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/** Valida que la contraseña exista y tenga al menos 6 caracteres. */
export const isValidPassword = (password) => {
  return password && password.length >= 6;
};

/** Valida que el nombre exista y tenga al menos 2 caracteres (sin espacios extremos). */
export const isValidName = (nombre) => {
  return nombre && nombre.trim().length >= 2;
};
