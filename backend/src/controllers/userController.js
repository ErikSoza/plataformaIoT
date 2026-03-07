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
  }
};

export default userController;