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

  // Actualizar usuario
  static async update(id, userData) {
    try {
      const { nombre, email, contrasena } = userData;
      let query;
      let params;

      if (contrasena) {
        // Si se incluye contraseña, actualizarla también
        query = 'UPDATE usuarios SET nombre = ?, email = ?, contrasena = ? WHERE id = ?';
        params = [nombre, email, contrasena, id];
      } else {
        // Solo actualizar nombre y email
        query = 'UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?';
        params = [nombre, email, id];
      }
      
      await pool.execute(query, params);
      
      // Retornar el usuario actualizado (sin contraseña)
      return await UserModel.findById(id);
    } catch (error) {
      throw error;
    }
  }

  // Eliminar usuario
  static async delete(id) {
    try {
      const query = 'DELETE FROM usuarios WHERE id = ?';
      const [result] = await pool.execute(query, [id]);
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Verificar si email existe para otro usuario (útil para actualizaciones)
  static async checkEmailExistsForOtherUser(email, userId) {
    try {
      const query = 'SELECT COUNT(*) as count FROM usuarios WHERE email = ? AND id != ?';
      const [rows] = await pool.execute(query, [email, userId]);
      
      return rows[0].count > 0;
    } catch (error) {
      throw error;
    }
  }
}

export default UserModel;