import pool from '../db/connection.js';

class UserModel {
  // Crear un nuevo usuario
  static async create(userData) {
    const { nombre, email, contrasena, rol = 'usuario' } = userData;
    
    try {
      const query = `
        INSERT INTO usuarios (nombre, email, contrasena, rol, created_at) 
        VALUES (?, ?, ?, ?, NOW())
      `;
      
      const [result] = await pool.execute(query, [nombre, email, contrasena, rol]);
      
      return {
        id: result.insertId,
        nombre,
        email,
        rol,
        created_at: new Date()
      };
    } catch (error) {
      throw error;
    }
  }

  // Verificar si un email ya existe
  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM usuarios WHERE email = ?';
      const [rows] = await pool.execute(query, [email]);
      
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Obtener usuario por ID
  static async findById(id) {
    try {
      const query = 'SELECT id, nombre, email, rol, created_at FROM usuarios WHERE id = ?';
      const [rows] = await pool.execute(query, [id]);
      
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Obtener todos los usuarios (sin contraseñas)
  static async findAll() {
    try {
      const query = 'SELECT id, nombre, email, rol, created_at FROM usuarios ORDER BY created_at DESC';
      const [rows] = await pool.execute(query);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Verificar credenciales para login
  static async findByCredentials(email) {
    try {
      const query = 'SELECT * FROM usuarios WHERE email = ?';
      const [rows] = await pool.execute(query, [email]);
      
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Verificar si email existe (para validación en tiempo real)
  static async checkEmailExists(email) {
    try {
      const query = 'SELECT COUNT(*) as count FROM usuarios WHERE email = ?';
      const [rows] = await pool.execute(query, [email]);
      
      return rows[0].count > 0;
    } catch (error) {
      throw error;
    }
  }
}

export default UserModel;