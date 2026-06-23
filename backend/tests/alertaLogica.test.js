import { describe, test, expect } from '@jest/globals';
import { evaluarCondicion } from '../src/utils/alertaLogica.js';

// ── Cobertura de ramas: cada case del switch en true Y false ──────────────────

describe('evaluarCondicion — operador >', () => {
  test('RAMA-01: valor > umbral → true', () => {
    expect(evaluarCondicion(36.5, '>', 35)).toBe(true);
  });
  test('RAMA-02: valor < umbral → false', () => {
    expect(evaluarCondicion(34.0, '>', 35)).toBe(false);
  });
  test('RAMA-03: valor === umbral no cumple > (solo cumple >=)', () => {
    expect(evaluarCondicion(35.0, '>', 35)).toBe(false);
  });
});

describe('evaluarCondicion — operador <', () => {
  test('RAMA-04: valor < umbral → true', () => {
    expect(evaluarCondicion(5.0, '<', 10)).toBe(true);
  });
  test('RAMA-05: valor > umbral → false', () => {
    expect(evaluarCondicion(15.0, '<', 10)).toBe(false);
  });
  test('RAMA-06: valor === umbral no cumple <', () => {
    expect(evaluarCondicion(10.0, '<', 10)).toBe(false);
  });
});

describe('evaluarCondicion — operador >=', () => {
  test('RAMA-07: valor === umbral sí cumple >= (límite inferior)', () => {
    expect(evaluarCondicion(35.0, '>=', 35)).toBe(true);
  });
  test('RAMA-08: valor > umbral → true', () => {
    expect(evaluarCondicion(35.1, '>=', 35)).toBe(true);
  });
  test('RAMA-09: valor < umbral → false', () => {
    expect(evaluarCondicion(34.9, '>=', 35)).toBe(false);
  });
});

describe('evaluarCondicion — operador <=', () => {
  test('RAMA-10: valor === umbral sí cumple <= (límite superior)', () => {
    expect(evaluarCondicion(35.0, '<=', 35)).toBe(true);
  });
  test('RAMA-11: valor < umbral → true', () => {
    expect(evaluarCondicion(30.0, '<=', 35)).toBe(true);
  });
  test('RAMA-12: valor > umbral → false', () => {
    expect(evaluarCondicion(35.1, '<=', 35)).toBe(false);
  });
});

// ── Cobertura del camino por defecto (ningún case coincide) ──────────────────

describe('evaluarCondicion — operador desconocido (default)', () => {
  test('CAMINO-01: operador no soportado retorna false', () => {
    expect(evaluarCondicion(30, 'entre', 35)).toBe(false);
  });
  test('CAMINO-02: string vacío retorna false', () => {
    expect(evaluarCondicion(30, '', 35)).toBe(false);
  });
  test('CAMINO-03: undefined retorna false', () => {
    expect(evaluarCondicion(30, undefined, 35)).toBe(false);
  });
  test('CAMINO-04: null retorna false', () => {
    expect(evaluarCondicion(30, null, 35)).toBe(false);
  });
});

// ── Casos de borde de valores numéricos ───────────────────────────────────────

describe('evaluarCondicion — valores límite físicos', () => {
  test('BORDE-01: temperatura mínima válida (-10°C) contra umbral 0', () => {
    expect(evaluarCondicion(-10, '<', 0)).toBe(true);
  });
  test('BORDE-02: humedad 100% contra umbral 90', () => {
    expect(evaluarCondicion(100, '>', 90)).toBe(true);
  });
  test('BORDE-03: presión igual al umbral con >=', () => {
    expect(evaluarCondicion(1013.25, '>=', 1013.25)).toBe(true);
  });
  test('BORDE-04: viento 0 m/s (calma total) contra umbral > 0', () => {
    expect(evaluarCondicion(0, '>', 0)).toBe(false);
  });
});
