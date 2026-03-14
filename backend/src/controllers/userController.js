import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UserModel from '../models/userModel.js';

// Función para validar email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Función para validar contraseña (mínimo 6 caracteres)
const isValidPassword = (password) => {
  return password && password.length >= 6;
};

// Función para validar nombre (mínimo 2 caracteres)
const isValidName = (nombre) => {
  return nombre && nombre.trim().length >= 2;
};

const userController = {
  // Registrar nuevo usuario
  register: async (req, res) => {
    try {
      const { nombre, email, contrasena, confirmPassword } = req.body;

      // Validación de campos requeridos
      if (!nombre || !email || !contrasena || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos'
        });
      }

      // Validar nombre
      if (!isValidName(nombre)) {
        return res.status(400).json({
          success: false,
          message: 'El nombre debe tener al menos 2 caracteres'
        });
      }

      // Validar email
      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'El email no tiene un formato válido'
        });
      }

      // Validar contraseña
      if (!isValidPassword(contrasena)) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
      }

      // Verificar que las contraseñas coincidan
      if (contrasena !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Las contraseñas no coinciden'
        });
      }

      // Verificar si el email ya existe
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Este email ya está registrado',
          field: 'email'
        });
      }

      // Hash de la contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

      // Crear usuario
      const newUser = await UserModel.create({
        nombre: nombre.trim(),
        email: email.toLowerCase().trim(),
        contrasena: hashedPassword,
        rol: 'usuario'
      });

      // Generar JWT token
      const token = jwt.sign(
        { 
          id: newUser.id, 
          email: newUser.email,
          rol: newUser.rol 
        },
        process.env.JWT_SECRET || 'tu_secret_key_aqui',
        { expiresIn: '7d' }
      );

      // Respuesta exitosa (sin devolver la contraseña)
      res.status(201).json({
        success: true,
        message: '¡Registro exitoso! Bienvenido a la plataforma IOT UTALCA',
        user: {
          id: newUser.id,
          nombre: newUser.nombre,
          email: newUser.email,
          rol: newUser.rol,
          created_at: newUser.created_at
        },
        token
      });

    } catch (error) {
      console.error('Error en registro:', error);
      
      // Manejo de errores específicos de MySQL
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'Este email ya está registrado',
          field: 'email'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor. Intenta nuevamente.'
      });
    }
  },

  // Verificar si email existe (para validación en tiempo real)
  checkEmail: async (req, res) => {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email requerido'
        });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Email no válido'
        });
      }

      const exists = await UserModel.checkEmailExists(email.toLowerCase().trim());
      
      res.json({
        success: true,
        exists,
        message: exists ? 'Este email ya está registrado' : 'Email disponible'
      });

    } catch (error) {
      console.error('Error verificando email:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar email'
      });
    }
  },

  // Login de usuario
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validación de campos
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos'
        });
      }

      // Buscar usuario
      const user = await UserModel.findByCredentials(email.toLowerCase().trim());
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar contraseña
      const validPassword = await bcrypt.compare(password, user.contrasena);
      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Generar JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email,
          rol: user.rol 
        },
        process.env.JWT_SECRET || 'tu_secret_key_aqui',
        { expiresIn: '7d' }
      );

      // Respuesta exitosa
      res.json({
        success: true,
        message: 'Login exitoso',
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol,
          created_at: user.created_at
        },
        token
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // Obtener perfil del usuario (requiere autenticación)
  getProfile: async (req, res) => {
    try {
      const user = await UserModel.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        user
      });

    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // Actualizar perfil del usuario
  updateProfile: async (req, res) => {
    try {
      const userId = req.user.id;
      const { nombre, email, currentPassword, newPassword, confirmNewPassword } = req.body;

      // Validar campos requeridos
      if (!nombre || !email) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y email son requeridos'
        });
      }

      // Validar nombre
      if (!isValidName(nombre)) {
        return res.status(400).json({
          success: false,
          message: 'El nombre debe tener al menos 2 caracteres'
        });
      }

      // Validar email
      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'El email no tiene un formato válido'
        });
      }

      // Verificar si el email ya existe para otro usuario
      const emailExists = await UserModel.checkEmailExistsForOtherUser(email.toLowerCase().trim(), userId);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Este email ya está registrado por otro usuario',
          field: 'email'
        });
      }

      // Obtener los datos actuales del usuario
      const currentUser = await UserModel.findByCredentials(req.user.email);
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      let updateData = {
        nombre: nombre.trim(),
        email: email.toLowerCase().trim()
      };

      // Si se quiere cambiar la contraseña
      if (newPassword) {
        // Validar contraseña actual
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            message: 'Contraseña actual requerida para cambiar la contraseña'
          });
        }

        const validCurrentPassword = await bcrypt.compare(currentPassword, currentUser.contrasena);
        if (!validCurrentPassword) {
          return res.status(400).json({
            success: false,
            message: 'Contraseña actual incorrecta',
            field: 'currentPassword'
          });
        }

        // Validar nueva contraseña
        if (!isValidPassword(newPassword)) {
          return res.status(400).json({
            success: false,
            message: 'La nueva contraseña debe tener al menos 6 caracteres'
          });
        }

        // Verificar confirmación de nueva contraseña
        if (newPassword !== confirmNewPassword) {
          return res.status(400).json({
            success: false,
            message: 'Las contraseñas nuevas no coinciden'
          });
        }

        // Hash de la nueva contraseña
        const saltRounds = 12;
        updateData.contrasena = await bcrypt.hash(newPassword, saltRounds);
      }

      // Actualizar usuario
      const updatedUser = await UserModel.update(userId, updateData);

      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        user: updatedUser
      });

    } catch (error) {
      console.error('Error actualizando perfil:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'Este email ya está registrado',
          field: 'email'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // Eliminar cuenta del usuario
  deleteAccount: async (req, res) => {
    try {
      const userId = req.user.id;
      const { password } = req.body;

      // Validar contraseña
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña requerida para eliminar la cuenta'
        });
      }

      // Obtener los datos actuales del usuario para verificar la contraseña
      const currentUser = await UserModel.findByCredentials(req.user.email);
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Verificar contraseña
      const validPassword = await bcrypt.compare(password, currentUser.contrasena);
      if (!validPassword) {
        return res.status(400).json({
          success: false,
          message: 'Contraseña incorrecta'
        });
      }

      // Eliminar usuario
      const deleted = await UserModel.delete(userId);
      
      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'No se pudo eliminar la cuenta'
        });
      }

      res.json({
        success: true,
        message: 'Cuenta eliminada exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando cuenta:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // ==================== FAVORITOS DE ESTACIONES ====================

  // Obtener favoritos del usuario autenticado
  getFavoriteStations: async (req, res) => {
    try {
      const userId = req.user.id;

      const favorites = await UserModel.getFavoriteStationsByUser(userId);
      const favoriteStationIds = favorites.map((favorite) => favorite.id);

      res.json({
        success: true,
        favorites,
        favoriteStationIds
      });
    } catch (error) {
      console.error('Error obteniendo estaciones favoritas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // Agregar estación a favoritos del usuario autenticado
  addFavoriteStation: async (req, res) => {
    try {
      const userId = req.user.id;
      const stationId = parseInt(req.body.stationId, 10);

      if (!stationId || isNaN(stationId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de estación inválido'
        });
      }

      const result = await UserModel.addFavoriteStation(userId, stationId);

      res.status(result.inserted ? 201 : 200).json({
        success: true,
        message: result.inserted
          ? 'Estación agregada a favoritos'
          : 'La estación ya estaba en favoritos',
      });
    } catch (error) {
      console.error('Error agregando estación a favoritos:', error);

      if (error.code === 'STATION_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: 'Estación no encontrada'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // Quitar estación de favoritos del usuario autenticado
  removeFavoriteStation: async (req, res) => {
    try {
      const userId = req.user.id;
      const stationId = parseInt(req.params.stationId, 10);

      if (!stationId || isNaN(stationId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de estación inválido'
        });
      }

      const deleted = await UserModel.removeFavoriteStation(userId, stationId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'La estación no estaba en favoritos'
        });
      }

      res.json({
        success: true,
        message: 'Estación eliminada de favoritos'
      });
    } catch (error) {
      console.error('Error eliminando estación de favoritos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // ==================== GESTIÓN DE USUARIOS (Solo Administradores) ====================

  // Obtener todos los usuarios
  getAllUsers: async (req, res) => {
    try {
      const users = await UserModel.findAll();
      
      // Eliminar contraseñas de la respuesta
      const usersWithoutPasswords = users.map(user => ({
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        fecha_registro: user.fecha_registro
      }));

      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // Crear nuevo usuario
  createUser: async (req, res) => {
    try {
      const { nombre, email, contrasena, rol } = req.body;

      // Validación de campos requeridos
      if (!nombre || !email || !contrasena || !rol) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos'
        });
      }

      // Validar nombre
      if (!isValidName(nombre)) {
        return res.status(400).json({
          success: false,
          message: 'El nombre debe tener al menos 2 caracteres'
        });
      }

      // Validar email
      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'El email no tiene un formato válido'
        });
      }

      // Validar contraseña
      if (!isValidPassword(contrasena)) {
        return res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
      }

      // Validar rol
      if (!['admin', 'usuario'].includes(rol)) {
        return res.status(400).json({
          success: false,
          message: 'Rol inválido'
        });
      }

      // Verificar si el email ya existe
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Este email ya está registrado'
        });
      }

      // Hash de la contraseña
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(contrasena, saltRounds);

      // Crear usuario
      const newUser = await UserModel.create({
        nombre: nombre.trim(),
        email: email.toLowerCase().trim(),
        contrasena: hashedPassword,
        rol: rol
      });

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        user: {
          id: newUser.id,
          nombre: newUser.nombre,
          email: newUser.email,
          rol: newUser.rol,
          fecha_registro: newUser.fecha_registro
        }
      });

    } catch (error) {
      console.error('Error creando usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // Actualizar usuario
  updateUser: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { nombre, email, rol, newPassword } = req.body;

      if (!userId || isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de usuario inválido'
        });
      }

      // Verificar que el usuario existe
      const existingUser = await UserModel.findById(userId);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Preparar datos de actualización
      const updateData = {};

      if (nombre !== undefined) {
        if (!isValidName(nombre)) {
          return res.status(400).json({
            success: false,
            message: 'El nombre debe tener al menos 2 caracteres'
          });
        }
        updateData.nombre = nombre.trim();
      }

      if (email !== undefined) {
        if (!isValidEmail(email)) {
          return res.status(400).json({
            success: false,
            message: 'El email no tiene un formato válido'
          });
        }

        // Verificar que el email no esté en uso por otro usuario
        if (email !== existingUser.email) {
          const emailInUse = await UserModel.findByEmail(email);
          if (emailInUse && emailInUse.id !== userId) {
            return res.status(400).json({
              success: false,
              message: 'Este email ya está en uso'
            });
          }
        }
        updateData.email = email.toLowerCase().trim();
      }

      if (rol !== undefined) {
        if (!['admin', 'usuario'].includes(rol)) {
          return res.status(400).json({
            success: false,
            message: 'Rol inválido'
          });
        }
        updateData.rol = rol;
      }

      if (newPassword !== undefined && newPassword !== '') {
        if (!isValidPassword(newPassword)) {
          return res.status(400).json({
            success: false,
            message: 'La contraseña debe tener al menos 6 caracteres'
          });
        }
        const saltRounds = 12;
        updateData.contrasena = await bcrypt.hash(newPassword, saltRounds);
      }

      // Actualizar usuario
      const updatedUser = await UserModel.update(userId, updateData);

      res.json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        user: {
          id: updatedUser.id,
          nombre: updatedUser.nombre,
          email: updatedUser.email,
          rol: updatedUser.rol,
          fecha_registro: updatedUser.fecha_registro
        }
      });

    } catch (error) {
      console.error('Error actualizando usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  },

  // Eliminar usuario
  deleteUser: async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (!userId || isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de usuario inválido'
        });
      }

      // Verificar que el usuario existe
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Prevenir que un admin se elimine a sí mismo
      if (userId === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'No puedes eliminar tu propia cuenta desde esta función'
        });
      }

      // Eliminar usuario
      await UserModel.delete(userId);

      res.json({
        success: true,
        message: 'Usuario eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error eliminando usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
};

export default userController;