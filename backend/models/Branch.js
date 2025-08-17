const { db } = require('../config/database');

class Branch {
  // Validation helpers
  static validateBranchData(data) {
    const errors = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Branch name is required');
    } else if (data.name.trim().length > 255) {
      errors.push('Branch name must not exceed 255 characters');
    }

    if (!data.code || data.code.trim().length === 0) {
      errors.push('Branch code is required');
    } else if (data.code.trim().length > 50) {
      errors.push('Branch code must not exceed 50 characters');
    }

    if (!data.address || data.address.trim().length === 0) {
      errors.push('Branch address is required');
    } else if (data.address.trim().length > 500) {
      errors.push('Branch address must not exceed 500 characters');
    }

    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    if (data.manager_email && !this.isValidEmail(data.manager_email)) {
      errors.push('Invalid manager email format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Get all branches
  static async getAll(includeStats = false) {
    try {
      let branches = await db('branches')
        .orderBy('name');

      if (includeStats) {
        // Add user count for each branch
        for (let branch of branches) {
          const userCount = await db('users')
            .where('branch_id', branch.id)
            .count('id as count')
            .first();
          branch.user_count = parseInt(userCount.count) || 0;
        }
      }

      return branches;
    } catch (error) {
      console.error('Error fetching branches:', error);
      throw new Error('Failed to retrieve branches from database');
    }
  }

  // Get branch by ID
  static async getById(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('Invalid branch ID provided');
      }

      const branch = await db('branches')
        .where('id', id)
        .first();

      if (branch) {
        // Add user count
        const userCount = await db('users')
          .where('branch_id', id)
          .count('id as count')
          .first();
        branch.user_count = parseInt(userCount.count) || 0;
      }

      return branch;
    } catch (error) {
      console.error('Error fetching branch by ID:', error);
      if (error.message === 'Invalid branch ID provided') {
        throw error;
      }
      throw new Error('Failed to retrieve branch information');
    }
  }

  // Get branch by code
  static async getBranchByCode(code) {
    try {
      const branch = await db('branches')
        .where('code', code)
        .first();

      return branch;
    } catch (error) {
      console.error('Error fetching branch by code:', error);
      throw new Error('Failed to retrieve branch by code');
    }
  }

  // Get active branches only
  static async getActiveBranches() {
    try {
      const branches = await db('branches')
        .where('is_active', true)
        .orderBy('name');

      return branches;
    } catch (error) {
      console.error('Error fetching active branches:', error);
      throw new Error('Failed to retrieve active branches');
    }
  }

  // Create new branch
  static async create(branchData) {
    try {
      // Validate input
      const validation = this.validateBranchData(branchData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if branch code already exists
      const existingBranch = await this.getBranchByCode(branchData.code.trim());
      if (existingBranch) {
        throw new Error('Branch code already exists');
      }

      // Prepare data for insertion
      const insertData = {
        name: branchData.name.trim(),
        code: branchData.code.trim(),
        address: branchData.address.trim(),
        phone: branchData.phone?.trim() || null,
        email: branchData.email?.trim() || null,
        manager_name: branchData.manager_name?.trim() || null,
        manager_email: branchData.manager_email?.trim() || null,
        manager_phone: branchData.manager_phone?.trim() || null,
        city: branchData.city?.trim() || null,
        state: branchData.state?.trim() || null,
        postal_code: branchData.postal_code?.trim() || null,
        country: branchData.country?.trim() || null,
        is_active: branchData.is_active !== undefined ? branchData.is_active : true,
        opening_hours: branchData.opening_hours || null,
        description: branchData.description?.trim() || null,
        created_at: new Date(),
        updated_at: new Date()
      };

      const [branch] = await db('branches')
        .insert(insertData)
        .returning('*');

      return branch;
    } catch (error) {
      console.error('Error creating branch:', error);

      // Handle specific database errors
      if (error.code === '23505') {
        throw new Error('Branch code already exists');
      }

      // Re-throw validation errors
      if (error.message.includes('Validation failed') ||
          error.message.includes('already exists')) {
        throw error;
      }

      throw new Error('Failed to create branch. Please try again.');
    }
  }

  // Update branch
  static async update(id, branchData) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('Invalid branch ID provided');
      }

      // Check if branch exists
      const existingBranch = await this.getById(id);
      if (!existingBranch) {
        throw new Error('Branch not found');
      }

      // Validate input
      const validation = this.validateBranchData(branchData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if branch code already exists (excluding current branch)
      if (branchData.code && branchData.code.trim() !== existingBranch.code) {
        const codeExists = await db('branches')
          .where('code', branchData.code.trim())
          .whereNot('id', id)
          .first();

        if (codeExists) {
          throw new Error('Branch code already exists');
        }
      }

      // Prepare data for update
      const updateData = {
        name: branchData.name.trim(),
        code: branchData.code.trim(),
        address: branchData.address.trim(),
        phone: branchData.phone?.trim() || null,
        email: branchData.email?.trim() || null,
        manager_name: branchData.manager_name?.trim() || null,
        manager_email: branchData.manager_email?.trim() || null,
        manager_phone: branchData.manager_phone?.trim() || null,
        city: branchData.city?.trim() || null,
        state: branchData.state?.trim() || null,
        postal_code: branchData.postal_code?.trim() || null,
        country: branchData.country?.trim() || null,
        is_active: branchData.is_active !== undefined ? branchData.is_active : existingBranch.is_active,
        opening_hours: branchData.opening_hours || null,
        description: branchData.description?.trim() || null,
        updated_at: new Date()
      };

      const [branch] = await db('branches')
        .where('id', id)
        .update(updateData)
        .returning('*');

      return branch;
    } catch (error) {
      console.error('Error updating branch:', error);

      // Re-throw validation errors
      if (error.message.includes('Invalid') ||
          error.message.includes('not found') ||
          error.message.includes('Validation failed') ||
          error.message.includes('already exists')) {
        throw error;
      }

      throw new Error('Failed to update branch. Please try again.');
    }
  }

  // Delete branch (only if no users assigned)
  static async delete(id) {
    try {
      if (!id || isNaN(id)) {
        throw new Error('Invalid branch ID provided');
      }

      // Check if branch exists
      const existingBranch = await this.getById(id);
      if (!existingBranch) {
        throw new Error('Branch not found');
      }

      // Check if branch has assigned users
      const userCount = await db('users')
        .where('branch_id', id)
        .count('id as count')
        .first();

      if (parseInt(userCount.count) > 0) {
        throw new Error(`Cannot delete branch. ${userCount.count} users are assigned to this branch.`);
      }

      await db('branches')
        .where('id', id)
        .del();

      return true;
    } catch (error) {
      console.error('Error deleting branch:', error);

      // Re-throw validation errors
      if (error.message.includes('Invalid') ||
          error.message.includes('not found') ||
          error.message.includes('Cannot delete')) {
        throw error;
      }

      throw new Error('Failed to delete branch. Please try again.');
    }
  }

  // Get users assigned to branch
  static async getUsers(branchId) {
    try {
      if (!branchId || isNaN(branchId)) {
        throw new Error('Invalid branch ID provided');
      }

      // Check if branch exists
      const branch = await this.getById(branchId);
      if (!branch) {
        throw new Error('Branch not found');
      }

      const users = await db('users')
        .leftJoin('user_roles', 'users.role_id', 'user_roles.role_id')
        .select(
          'users.*',
          'user_roles.role',
          'user_roles.department'
        )
        .where('users.branch_id', branchId)
        .whereNull('users.deleted_at')
        .orderBy('users.name');

      return users;
    } catch (error) {
      console.error('Error fetching branch users:', error);

      if (error.message.includes('Invalid') ||
          error.message.includes('not found')) {
        throw error;
      }

      throw new Error('Failed to retrieve branch users');
    }
  }

  // Get branch statistics
  static async getBranchStats() {
    try {
      const totalBranches = await db('branches').count('id as count').first();
      const activeBranches = await db('branches').where('is_active', true).count('id as count').first();
      const totalUsersInBranches = await db('users').whereNotNull('branch_id').count('id as count').first();

      return {
        total_branches: parseInt(totalBranches.count) || 0,
        active_branches: parseInt(activeBranches.count) || 0,
        inactive_branches: (parseInt(totalBranches.count) || 0) - (parseInt(activeBranches.count) || 0),
        total_users_in_branches: parseInt(totalUsersInBranches.count) || 0
      };
    } catch (error) {
      console.error('Error fetching branch statistics:', error);
      throw new Error('Failed to retrieve branch statistics');
    }
  }
}

module.exports = Branch;
