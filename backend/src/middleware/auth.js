import jwt from 'jsonwebtoken';

/**
 * Middleware que verifica el JWT en el header Authorization.
 * Extraído de userRoutes.js para permitir pruebas unitarias sin
 * instanciar el router de Express.
 *
 * Flujo:
 *   sin header     → 401
 *   token inválido → 403
 *   token válido   → next(), req.user = payload decodificado
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido',
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'tu_secret_key_aqui', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido',
      });
    }
    req.user = user;
    next();
  });
}

/**
 * Middleware que verifica que el usuario autenticado tenga rol 'admin'.
 * Debe usarse DESPUÉS de authenticateToken.
 *
 *   req.user ausente o rol ≠ admin → 403
 *   rol = admin                     → next()
 */
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren privilegios de administrador.',
    });
  }
  next();
}
