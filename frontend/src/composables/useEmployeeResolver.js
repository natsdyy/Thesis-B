import { ref, readonly } from 'vue';
import axios from 'axios';
import { apiConfig } from '../config/api.js';

export function useEmployeeResolver() {
  const employeeCache = ref(new Map());
  const loading = ref(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const resolveEmployeeName = async (employeeId) => {
    if (!employeeId) return null;

    // Check cache first
    if (employeeCache.value.has(employeeId)) {
      return employeeCache.value.get(employeeId);
    }

    // If it's already a name (not a numeric ID), return it
    if (isNaN(employeeId)) {
      return employeeId;
    }

    try {
      loading.value = true;
      const response = await axios.get(
        `${apiConfig.baseURL}/employees/${employeeId}`,
        { headers: getAuthHeaders() }
      );

      if (response.data.success && response.data.data) {
        const employee = response.data.data;
        const fullName = `${employee.first_name} ${employee.last_name}`.trim();

        // Cache the result
        employeeCache.value.set(employeeId, fullName);

        return fullName;
      }
    } catch (error) {
      console.warn(
        `Failed to resolve employee name for ID ${employeeId}:`,
        error
      );
    } finally {
      loading.value = false;
    }

    // Fallback to the original ID if resolution fails
    return employeeId;
  };

  const resolveMultipleEmployeeNames = async (employeeIds) => {
    const results = {};

    for (const id of employeeIds) {
      if (id && !results[id]) {
        results[id] = await resolveEmployeeName(id);
      }
    }

    return results;
  };

  const clearCache = () => {
    employeeCache.value.clear();
  };

  return {
    resolveEmployeeName,
    resolveMultipleEmployeeNames,
    clearCache,
    loading: readonly(loading),
  };
}
