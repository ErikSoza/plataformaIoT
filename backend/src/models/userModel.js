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
      const query = 'SELECT id, nombre, email, rol, created_at as fecha_registro FROM usuarios ORDER BY created_at DESC';
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
      const updateFields = [];
      const params = [];

      // Agregar campos dinámicamente según lo que se quiera actualizar
      if (userData.nombre !== undefined) {
        updateFields.push('nombre = ?');
        params.push(userData.nombre);
      }

      if (userData.email !== undefined) {
        updateFields.push('email = ?');
        params.push(userData.email);
      }

      if (userData.rol !== undefined) {
        updateFields.push('rol = ?');
        params.push(userData.rol);
      }

      if (userData.contrasena !== undefined) {
        updateFields.push('contrasena = ?');
        params.push(userData.contrasena);
      }

      if (updateFields.length === 0) {
        throw new Error('No se proporcionaron campos para actualizar');
      }

      // Agregar el ID al final
      params.push(id);

      const query = `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = ?`;
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

  // Obtener estaciones favoritas del usuario autenticado
  static async getFavoriteStationsByUser(userId) {
    try {
      const query = `
        SELECT
          e.id,
          e.nombre,
          e.ubicacion,
          e.latitud,
          e.longitud,
          e.descripcion,
          e.estado,
          e.created_at,
          f.created_at AS favorite_created_at
        FROM usuarios_estaciones_favoritas f
        INNER JOIN estaciones e ON e.id = f.id_estacion
        WHERE f.id_usuario = ?
        ORDER BY f.created_at DESC
      `;

      const [rows] = await pool.execute(query, [userId]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Obtener solo IDs de estaciones favoritas (uso eficiente en frontend)
  static async getFavoriteStationIdsByUser(userId) {
    try {
      const query = 'SELECT id_estacion FROM usuarios_estaciones_favoritas WHERE id_usuario = ?';
      const [rows] = await pool.execute(query, [userId]);
      return rows.map((row) => row.id_estacion);
    } catch (error) {
      throw error;
    }
  }

  // Agregar estación favorita a un usuario
  static async addFavoriteStation(userId, stationId) {
    try {
      const [stationRows] = await pool.execute('SELECT id FROM estaciones WHERE id = ?', [stationId]);
      if (!stationRows.length) {
        const notFoundError = new Error('Estación no encontrada');
        notFoundError.code = 'STATION_NOT_FOUND';
        throw notFoundError;
      }

      const query = `
        INSERT IGNORE INTO usuarios_estaciones_favoritas (id_usuario, id_estacion)
        VALUES (?, ?)
      `;
      const [result] = await pool.execute(query, [userId, stationId]);

      return {
        inserted: result.affectedRows > 0,
      };
    } catch (error) {
      throw error;
    }
  }

  // Eliminar estación favorita de un usuario
  static async removeFavoriteStation(userId, stationId) {
    try {
      const query = `
        DELETE FROM usuarios_estaciones_favoritas
        WHERE id_usuario = ? AND id_estacion = ?
      `;
      const [result] = await pool.execute(query, [userId, stationId]);

      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
}

export default UserModel;