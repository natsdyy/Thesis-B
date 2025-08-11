import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null);
  const isAuthenticated = ref(false);
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const userRole = computed(() => user.value?.role || null);
  const userDepartment = computed(() => user.value?.department || null);
  const isSuperAdmin = computed(() => userRole.value === 'Super Admin');

  // Actions
  const login = async (credentials) => {
    loading.value = true;
    error.value = null;

    try {
      // Simulate API call - replace with actual API endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (data.success) {
        user.value = data.user;
        isAuthenticated.value = true;
        return data.user;
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    user.value = null;
    isAuthenticated.value = false;
    error.value = null;
  };

  const setUser = (userData) => {
    user.value = userData;
    isAuthenticated.value = true;
  };

  // Mock user for testing - remove in production
  const setMockUser = (role, department = null) => {
    const mockUsers = {
      'Super Admin': {
        id: 1,
        name: 'John Doe',
        email: 'admin@company.com',
        role: 'Super Admin',
        department: null,
      },
      'HR Manager': {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@company.com',
        role: 'Manager',
        department: 'Human Resource',
      },
      'SCM Staff': {
        id: 3,
        name: 'Bob Johnson',
        email: 'bob@company.com',
        role: 'Staff',
        department: 'Supply Chain',
      },
    };

    setUser(mockUsers[role] || mockUsers['HR Manager']);
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    user,
    isAuthenticated,
    loading,
    error,

    // Getters
    userRole,
    userDepartment,
    isSuperAdmin,

    // Actions
    login,
    logout,
    setUser,
    setMockUser,
    clearError,
  };
});
