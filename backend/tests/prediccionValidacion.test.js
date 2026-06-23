import { describe, test, expect } from '@jest/globals';
import { validarParametrosPrediccion } from '../src/utils/prediccionValidacion.js';

// ── Parámetros válidos — todas las combinaciones posibles ────────────────────

describe('validarParametrosPrediccion — parámetros válidos', () => {
  const horasValidas    = [24, 48, 72];
  const variablesValidas = ['temperatura', 'humedad', 'presion', 'viento'];

  for (const h of horasValidas) {
    for (const v of variablesValidas) {
      test(`RAMA-VÁLIDA [${h}h, ${v}] → retorna null`, () => {
        expect(validarParametrosPrediccion(h, v)).toBeNull();
      });
    }
  }
});

// ── horas inválidas ───────────────────────────────────────────────────────────

describe('validarParametrosPrediccion — horas inválidas', () => {
  test('RAMA-01: horas=0 → error 400 con mención a horas', () => {
    const r = validarParametrosPrediccion(0, 'temperatura');
    expect(r).not.toBeNull();
    expect(r.status).toBe(400);
    expect(r.error).toMatch(/horas/);
  });
  test('RAMA-02: horas=100 (fuera de rango) → error 400', () => {
    expect(validarParametrosPrediccion(100, 'temperatura').status).toBe(400);
  });
  test('RAMA-03: horas=36 (valor intermedio no permitido) → error 400', () => {
    expect(validarParametrosPrediccion(36, 'temperatura').status).toBe(400);
  });
  test('RAMA-04: horas=-24 (negativo) → error 400', () => {
    expect(validarParametrosPrediccion(-24, 'temperatura').status).toBe(400);
  });
  test('RAMA-05: horas=NaN → error 400', () => {
    expect(validarParametrosPrediccion(NaN, 'temperatura').status).toBe(400);
  });
});

// ── variable inválida ─────────────────────────────────────────────────────────

describe('validarParametrosPrediccion — variable inválida', () => {
  test('RAMA-06: variable="radiacion" (no soportada) → error 400 con mención a variable', () => {
    const r = validarParametrosPrediccion(24, 'radiacion');
    expect(r).not.toBeNull();
    expect(r.status).toBe(400);
    expect(r.error).toMatch(/variable/);
  });
  test('RAMA-07: variable="" (vacía) → error 400', () => {
    expect(validarParametrosPrediccion(24, '').status).toBe(400);
  });
  test('RAMA-08: variable="Temperatura" (mayúscula) → error 400 (case-sensitive)', () => {
    expect(validarParametrosPrediccion(24, 'Temperatura').status).toBe(400);
  });
  test('RAMA-09: variable=undefined → error 400', () => {
    expect(validarParametrosPrediccion(24, undefined).status).toBe(400);
  });
});

// ── Cobertura de camino: orden de validación ──────────────────────────────────

describe('validarParametrosPrediccion — orden de validación', () => {
  test('CAMINO-01: horas inválidas se detectan ANTES que variable inválida', () => {
    const r = validarParametrosPrediccion(99, 'radiacion');
    expect(r.error).toMatch(/horas/);
    expect(r.error).not.toMatch(/variable/);
  });
});
