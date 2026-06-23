import { describe, test, expect } from '@jest/globals';
import { isValidEmail, isValidPassword, isValidName } from '../src/utils/userValidaciones.js';

// ── isValidEmail ──────────────────────────────────────────────────────────────

describe('isValidEmail', () => {
  // Válidos
  test('COND-01: email estándar válido', () => {
    expect(isValidEmail('erik@utalca.cl')).toBe(true);
  });
  test('COND-02: email con subdominio válido', () => {
    expect(isValidEmail('usuario@correo.utalca.cl')).toBe(true);
  });
  test('COND-03: email con números válido', () => {
    expect(isValidEmail('erik123@gmail.com')).toBe(true);
  });

  // Inválidos — cada rama del regex
  test('COND-04: sin @ → inválido', () => {
    expect(isValidEmail('erikutalca.cl')).toBe(false);
  });
  test('COND-05: sin dominio después del @ → inválido', () => {
    expect(isValidEmail('erik@')).toBe(false);
  });
  test('COND-06: sin usuario antes del @ → inválido', () => {
    expect(isValidEmail('@utalca.cl')).toBe(false);
  });
  test('COND-07: sin TLD (sin punto en dominio) → inválido', () => {
    expect(isValidEmail('erik@utalca')).toBe(false);
  });
  test('COND-08: string vacío → inválido', () => {
    expect(isValidEmail('')).toBe(false);
  });
  test('COND-09: espacio en medio → inválido', () => {
    expect(isValidEmail('erik @utalca.cl')).toBe(false);
  });
});

// ── isValidPassword ───────────────────────────────────────────────────────────

describe('isValidPassword', () => {
  // Rama true: password && length >= 6
  test('COND-10: exactamente 6 caracteres → válida (valor límite)', () => {
    expect(isValidPassword('abc123')).toBe(true);
  });
  test('COND-11: más de 6 caracteres → válida', () => {
    expect(isValidPassword('segura123!')).toBe(true);
  });

  // Rama false: length < 6
  test('COND-12: 5 caracteres → inválida (bajo límite)', () => {
    expect(isValidPassword('ab123')).toBe(false);
  });
  test('COND-13: 1 carácter → inválida', () => {
    expect(isValidPassword('x')).toBe(false);
  });

  // Rama false: falsy (la función usa &&, retorna el valor falsy, no false estricto)
  test('COND-14: string vacío → inválida (falsy)', () => {
    expect(isValidPassword('')).toBeFalsy();
  });
  test('COND-15: null → inválida', () => {
    expect(isValidPassword(null)).toBeFalsy();
  });
  test('COND-16: undefined → inválida', () => {
    expect(isValidPassword(undefined)).toBeFalsy();
  });
  test('COND-17: 0 (número) → inválida', () => {
    expect(isValidPassword(0)).toBeFalsy();
  });
});

// ── isValidName ───────────────────────────────────────────────────────────────

describe('isValidName', () => {
  // Rama true: nombre && trim().length >= 2
  test('COND-18: exactamente 2 caracteres → válido (valor límite)', () => {
    expect(isValidName('AB')).toBe(true);
  });
  test('COND-19: nombre normal → válido', () => {
    expect(isValidName('Erik Soza')).toBe(true);
  });
  test('COND-20: nombre con espacios extremos que al trim queda >= 2 → válido', () => {
    expect(isValidName('  AB  ')).toBe(true);
  });

  // Rama false: trim().length < 2
  test('COND-21: exactamente 1 carácter → inválido (bajo límite)', () => {
    expect(isValidName('A')).toBe(false);
  });
  test('COND-22: solo espacios (trim = "") → inválido', () => {
    expect(isValidName('   ')).toBe(false);
  });
  test('COND-23: 1 carácter rodeado de espacios → inválido', () => {
    expect(isValidName('  A  ')).toBe(false);
  });

  // Rama false: falsy (la función usa &&, retorna el valor falsy, no false estricto)
  test('COND-24: string vacío → inválido (falsy)', () => {
    expect(isValidName('')).toBeFalsy();
  });
  test('COND-25: null → inválido', () => {
    expect(isValidName(null)).toBeFalsy();
  });
  test('COND-26: undefined → inválido', () => {
    expect(isValidName(undefined)).toBeFalsy();
  });
});
