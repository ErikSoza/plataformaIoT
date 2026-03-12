import express from 'express';
import jwt from 'jsonwebtoken';
import userController from '../controllers/userController.js';

const router = express.Router();

// Rutas públicas (no requieren autenticación)
router.post('/register', userController.register);
router.post('/login', userController.login);
router.get('/check-email', userController.checkEmail);

// Rutas protegidas (requieren autenticación)
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);
router.delete('/account', authenticateToken, userController.deleteAccount);

// Rutas de administración (requieren autenticación y rol admin)
router.get('/users', authenticateToken, requireAdmin, userController.getAllUsers);
router.post('/users', authenticateToken, requireAdmin, userController.createUser);
router.put('/users/:id', authenticateToken, requireAdmin, userController.updateUser);
router.delete('/users/:id', authenticateToken, requireAdmin, userController.deleteUser);

// Middleware de autenticación (opcional, para rutas futuras)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acceso requerido'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'tu_secret_key_aqui', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token inválido'
      });
    }
    req.user = user;
    next();
  });
}

// Middleware para verificar que el usuario sea administrador
function requireAdmin(req, res, next) {
  if (!req.user || req.user.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren privilegios de administrador.'
    });
  }
  next();
}

export default router;