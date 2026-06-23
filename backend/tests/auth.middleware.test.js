import { describe, test, expect, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireAdmin } from '../src/middleware/auth.js';

const SECRET = process.env.JWT_SECRET || 'tu_secret_key_aqui';

/** Crea mocks de res y next reutilizables en cada test. */
function makeMocks() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json:   jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { res, next };
}

// ── authenticateToken ─────────────────────────────────────────────────────────

describe('authenticateToken — sin token', () => {
  test('COND-01: sin header Authorization → 401', () => {
    const req = { headers: {} };
    const { res, next } = makeMocks();
    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('COND-02: header Authorization vacío → 401', () => {
    const req = { headers: { authorization: '' } };
    const { res, next } = makeMocks();
    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('COND-03: header sin Bearer (sin espacio) → 401', () => {
    const req = { headers: { authorization: 'solotoken' } };
    const { res, next } = makeMocks();
    authenticateToken(req, res, next);
    // split(' ')[1] es undefined → falsy → 401
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('authenticateToken — token inválido', () => {
  test('COND-04: token con firma incorrecta → 403', () => {
    const req = { headers: { authorization: 'Bearer token.falso.123' } };
    const { res, next } = makeMocks();
    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('COND-05: token expirado → 403', () => {
    const expired = jwt.sign(
      { id: 1, email: 'test@test.cl', rol: 'usuario' },
      SECRET,
      { expiresIn: -10 }  // expirado hace 10 segundos
    );
    const req = { headers: { authorization: `Bearer ${expired}` } };
    const { res, next } = makeMocks();
    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('COND-06: token firmado con secret distinto → 403', () => {
    const malToken = jwt.sign({ id: 1, rol: 'admin' }, 'otro_secret_incorrecto');
    const req = { headers: { authorization: `Bearer ${malToken}` } };
    const { res, next } = makeMocks();
    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('authenticateToken — token válido', () => {
  test('COND-07: token válido → llama next() y popula req.user', () => {
    const payload = { id: 1, email: 'erik@utalca.cl', rol: 'usuario' };
    const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const { res, next } = makeMocks();
    authenticateToken(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user.email).toBe('erik@utalca.cl');
    expect(res.status).not.toHaveBeenCalled();
  });

  test('COND-08: token de admin válido → req.user.rol = admin', () => {
    const token = jwt.sign({ id: 2, email: 'admin@test.cl', rol: 'admin' }, SECRET, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const { res, next } = makeMocks();
    authenticateToken(req, res, next);
    expect(req.user.rol).toBe('admin');
  });
});

// ── requireAdmin ──────────────────────────────────────────────────────────────

describe('requireAdmin — acceso denegado', () => {
  test('COND-09: req.user ausente (no pasó por authenticateToken) → 403', () => {
    const req = {};
    const { res, next } = makeMocks();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('COND-10: rol = "usuario" → 403', () => {
    const req = { user: { id: 1, rol: 'usuario' } };
    const { res, next } = makeMocks();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('COND-11: rol = null → 403', () => {
    const req = { user: { id: 1, rol: null } };
    const { res, next } = makeMocks();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('COND-12: rol = "Admin" (mayúscula, case-sensitive) → 403', () => {
    const req = { user: { id: 1, rol: 'Admin' } };
    const { res, next } = makeMocks();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('requireAdmin — acceso concedido', () => {
  test('COND-13: rol = "admin" → llama next(), no llama res.status', () => {
    const req = { user: { id: 1, rol: 'admin' } };
    const { res, next } = makeMocks();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ── Camino compuesto: authenticateToken → requireAdmin ────────────────────────

describe('Camino compuesto autenticación + autorización', () => {
  test('CAMINO-01: usuario normal pasa auth pero falla admin', () => {
    const token = jwt.sign({ id: 1, email: 'u@t.cl', rol: 'usuario' }, SECRET, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const { res, next } = makeMocks();

    authenticateToken(req, res, next);
    expect(next).toHaveBeenCalled();  // auth OK

    const { res: res2, next: next2 } = makeMocks();
    requireAdmin(req, res2, next2);
    expect(res2.status).toHaveBeenCalledWith(403);  // admin rechazado
  });

  test('CAMINO-02: admin pasa auth Y admin', () => {
    const token = jwt.sign({ id: 2, email: 'a@t.cl', rol: 'admin' }, SECRET, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const { res, next } = makeMocks();

    authenticateToken(req, res, next);
    expect(next).toHaveBeenCalled();

    const { res: res2, next: next2 } = makeMocks();
    requireAdmin(req, res2, next2);
    expect(next2).toHaveBeenCalled();  // admin OK
  });
});
