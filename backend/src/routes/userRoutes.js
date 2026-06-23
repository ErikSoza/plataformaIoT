import express from 'express';
import userController from '../controllers/userController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Rutas públicas (no requieren autenticación)
router.post('/register', userController.register);
router.post('/login', userController.login);
router.get('/check-email', userController.checkEmail);

// Rutas protegidas (requieren autenticación)
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);
router.delete('/account', authenticateToken, userController.deleteAccount);
router.get('/favorites', authenticateToken, userController.getFavoriteStations);
router.post('/favorites', authenticateToken, userController.addFavoriteStation);
router.delete('/favorites/:stationId', authenticateToken, userController.removeFavoriteStation);

// Rutas de administración (requieren autenticación y rol admin)
router.get('/users', authenticateToken, requireAdmin, userController.getAllUsers);
router.post('/users', authenticateToken, requireAdmin, userController.createUser);
router.put('/users/:id', authenticateToken, requireAdmin, userController.updateUser);
router.delete('/users/:id', authenticateToken, requireAdmin, userController.deleteUser);

export default router;
