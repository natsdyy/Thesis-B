import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiConfig } from '../config/api';

export const useShiftTypesStore = defineStore('shiftTypes', () => {
  // State
  const shiftTypes = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Helper function to format time from HH:MM:SS to HH:MM
  const formatTime = (timeString) => {
    if (!timeString) return '';
    // Convert "06:00:00" to "06:00"
    return timeString.substring(0, 5);
  };

  // Getters
  const getShiftTypes = computed(() => shiftTypes.value);
  const getActiveShiftTypes = computed(() =>
    shiftTypes.value.filter((shift) => shift.is_active)
  );

  // Actions
  const fetchShiftTypes = async () => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${apiConfig.baseURL}/shift-types`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch shift types');
      }

      const result = await response.json();

      // Process the shift types to format times properly
      const processedShiftTypes = (result.data || []).map((shift) => ({
        ...shift,
        startTime: formatTime(shift.start_time),
        endTime: formatTime(shift.end_time),
      }));

      shiftTypes.value = processedShiftTypes;
      return processedShiftTypes;
    } catch (err) {
      error.value = err.message;
      console.error('Error fetching shift types:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createShiftType = async (shiftData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${apiConfig.baseURL}/shift-types`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shiftData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create shift type');
      }

      // Add the new shift type to local state with formatted times
      const processedShift = {
        ...result.data,
        startTime: formatTime(result.data.start_time),
        endTime: formatTime(result.data.end_time),
      };
      shiftTypes.value.push(processedShift);
      return processedShift;
    } catch (err) {
      error.value = err.message;
      console.error('Error creating shift type:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateShiftType = async (shiftId, updateData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `${apiConfig.baseURL}/shift-types/${shiftId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update shift type');
      }

      // Update the shift type in local state with formatted times
      const processedShift = {
        ...result.data,
        startTime: formatTime(result.data.start_time),
        endTime: formatTime(result.data.end_time),
      };

      const index = shiftTypes.value.findIndex((shift) => shift.id === shiftId);
      if (index !== -1) {
        shiftTypes.value[index] = processedShift;
      }

      return processedShift;
    } catch (err) {
      error.value = err.message;
      console.error('Error updating shift type:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteShiftType = async (shiftId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `${apiConfig.baseURL}/shift-types/${shiftId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete shift type');
      }

      // Remove the shift type from local state
      shiftTypes.value = shiftTypes.value.filter(
        (shift) => shift.id !== shiftId
      );
      return result;
    } catch (err) {
      error.value = err.message;
      console.error('Error deleting shift type:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearShiftTypes = () => {
    shiftTypes.value = [];
    error.value = null;
  };

  const getShiftTypeById = (id) => {
    return shiftTypes.value.find((shift) => shift.id === id);
  };

  const getShiftTypeByName = (name) => {
    return shiftTypes.value.find((shift) => shift.name === name);
  };

  return {
    // State
    shiftTypes,
    loading,
    error,

    // Getters
    getShiftTypes,
    getActiveShiftTypes,

    // Actions
    fetchShiftTypes,
    createShiftType,
    updateShiftType,
    deleteShiftType,
    clearShiftTypes,
    getShiftTypeById,
    getShiftTypeByName,
  };
});
