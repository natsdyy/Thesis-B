import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useRoleStore = defineStore('role', () => {
  // State
  const roles = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const roleCount = computed(
    () => roles.value.filter((role) => !role.deleted_at).length
  );
  const hasRoles = computed(() => roles.value.length > 0);
  const deletedRoles = computed(() =>
    roles.value.filter((role) => role.deleted_at)
  );
  const activeRoles = computed(() =>
    roles.value.filter((role) => !role.deleted_at)
  );

  // Get roles by department
  const getRolesByDepartment = computed(() => {
    return (department) => {
      return roles.value.filter(
        (role) => !role.deleted_at && role.department === department
      );
    };
  });

  // Actions
  const fetchRoles = async (includeDeleted = false) => {
    loading.value = true;
    error.value = null;

    try {
      const url = `http://localhost:5000/api/roles${includeDeleted ? '?includeDeleted=true' : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        roles.value = data.data;
      } else {
        throw new Error(data.message || 'Failed to fetch roles');
      }
    } catch (err) {
      error.value = err.message;
      console.error('Error fetching roles:', err);
    } finally {
      loading.value = false;
    }
  };

  const createRole = async (roleData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch('http://localhost:5000/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: roleData.role,
          department: roleData.department,
          description: roleData.description,
        }),
      });

      const data = await response.json();

      if (data.success) {
        roles.value.push(data.data);
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to create role');
      }
    } catch (err) {
      error.value = err.message;
      console.error('Error creating role:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateRole = async (roleId, roleData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `http://localhost:5000/api/roles/${roleId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: roleData.role,
            department: roleData.department,
            description: roleData.description,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        const index = roles.value.findIndex((role) => role.role_id === roleId);
        if (index !== -1) {
          roles.value[index] = data.data;
        }
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to update role');
      }
    } catch (err) {
      error.value = err.message;
      console.error('Error updating role:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteRole = async (roleId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `http://localhost:5000/api/roles/${roleId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (data.success) {
        const index = roles.value.findIndex((role) => role.role_id === roleId);
        if (index !== -1) {
          roles.value[index] = data.data;
        }
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to delete role');
      }
    } catch (err) {
      error.value = err.message;
      console.error('Error deleting role:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const restoreRole = async (roleId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `http://localhost:5000/api/roles/${roleId}/restore`,
        {
          method: 'PATCH',
        }
      );

      const data = await response.json();

      if (data.success) {
        const index = roles.value.findIndex((role) => role.role_id === roleId);
        if (index !== -1) {
          roles.value[index] = data.data;
        }
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to restore role');
      }
    } catch (err) {
      error.value = err.message;
      console.error('Error restoring role:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchRolesByDepartment = async (department, includeDeleted = false) => {
    loading.value = true;
    error.value = null;

    try {
      const url = `http://localhost:5000/api/roles/department/${encodeURIComponent(department)}${includeDeleted ? '?includeDeleted=true' : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to fetch roles by department');
      }
    } catch (err) {
      error.value = err.message;
      console.error('Error fetching roles by department:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    roles,
    loading,
    error,
    // Getters
    roleCount,
    hasRoles,
    deletedRoles,
    activeRoles,
    getRolesByDepartment,
    // Actions
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    restoreRole,
    fetchRolesByDepartment,
    clearError,
  };
});
