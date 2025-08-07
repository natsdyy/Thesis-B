const { db } = require('../config/database');

class User {
  // Note: Table creation is now handled by Knex migrations

  // Get all users
  static async getAll(includeDeleted = false) {
    try {
      let query = db('users').select('*');
      if(!includeDeleted){
        query = query.whereNull('deleted_at');
      }
      const users = await query.orderBy('created_at', 'desc');
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  // Get user by ID
  static async getById(id) {
    try {
      const user = await db('users')
        .select('*')
        .where('id', id)
        .whereNull('deleted_at')
        .first();
      return user;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  // Create new user
  static async create(userData) {
    const { name, email } = userData;
    try {
      const [user] = await db('users')
        .insert({
          name,
          email,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        })
        .returning('*');
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Update user
  static async update(id, userData) {
    const { name, email } = userData;
    try {
      const [user] = await db('users')
        .where('id', id)
        .update({
          name,
          email,
          updated_at: db.fn.now()
        })
        .returning('*');
      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Soft delete user
  static async delete(id) {
    try {
      const [user] = await db('users')
        .where('id', id)
        .update({
          deleted_at: db.fn.now(),
          updated_at: db.fn.now(),
          is_active: false
        })

        .returning('*');
      return user;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Restore soft deleted user
  static async restore(id) {
    try {
      const [user] = await db('users')
        .where('id', id)
        .update({
          deleted_at: null,
          updated_at: db.fn.now(),
          is_active: true
        })
        .returning('*');
      return user;
    } catch (error) {
      console.error('Error restoring user:', error);
      throw error;
    }
  }
}

module.exports = User;