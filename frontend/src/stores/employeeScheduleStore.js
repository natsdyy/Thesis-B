import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiConfig } from '../config/api';

export const useEmployeeScheduleStore = defineStore('employeeSchedule', () => {
  // State
  const schedules = ref({});
  const shiftTypes = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const getSchedulesForWeek = computed(() => (employeeId, weekDays) => {
    const weekSchedules = {};
    weekDays.forEach((day) => {
      const schedule = schedules.value[`${employeeId}_${day.dateString}`];
      if (schedule) {
        weekSchedules[day.dateString] = schedule;
      }
    });
    return weekSchedules;
  });

  const getShiftTypes = computed(() => shiftTypes.value);

  // Actions
  const fetchSchedules = async (branchId, startDate, endDate) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `${apiConfig.baseURL}/employee-schedules?branch_id=${branchId}&start_date=${startDate}&end_date=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }

      const result = await response.json();
      const apiSchedules = result.data || [];

      // Process API data into schedules object
      const processedSchedules = {};
      apiSchedules.forEach((schedule) => {
        // Normalize date to YYYY-MM-DD format for consistent key matching
        const normalizedDate = schedule.schedule_date.split('T')[0];
        const key = `${schedule.employee_id}_${normalizedDate}`;
        processedSchedules[key] = {
          id: schedule.id,
          employee_id: schedule.employee_id,
          employee_name: schedule.employee_name,
          employee_role: schedule.employee_role,
          employee_email: schedule.employee_email,
          branch_id: schedule.branch_id,
          schedule_date: schedule.schedule_date,
          shift: {
            id: schedule.id,
            name: schedule.shift_name,
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            color: getShiftColor(schedule.shift_name),
          },
          notes: schedule.notes || '',
          is_active: schedule.is_active,
          created_at: schedule.created_at,
          updated_at: schedule.updated_at,
        };
      });

      schedules.value = processedSchedules;
      return processedSchedules;
    } catch (err) {
      error.value = err.message;
      console.error('Error fetching schedules:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchShiftTypes = async () => {
    try {
      const response = await fetch(
        `${apiConfig.baseURL}/employee-schedules/shift-types`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch shift types');
      }

      const result = await response.json();
      shiftTypes.value = result.data || [];
      return result.data;
    } catch (err) {
      error.value = err.message;
      console.error('Error fetching shift types:', err);
      throw err;
    }
  };

  const createSchedule = async (scheduleData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${apiConfig.baseURL}/employee-schedules`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create schedule');
      }

      // Add the new schedule to local state
      const newSchedule = result.data;
      const key = `${newSchedule.employee_id}_${newSchedule.schedule_date}`;
      schedules.value[key] = {
        id: newSchedule.id,
        employee_id: newSchedule.employee_id,
        employee_name: newSchedule.employee_name,
        employee_role: newSchedule.role,
        employee_email: newSchedule.email,
        branch_id: newSchedule.branch_id,
        schedule_date: newSchedule.schedule_date,
        shift: {
          id: newSchedule.id,
          name: newSchedule.shift_name,
          startTime: newSchedule.start_time,
          endTime: newSchedule.end_time,
          color: getShiftColor(newSchedule.shift_name),
        },
        notes: newSchedule.notes || '',
        is_active: newSchedule.is_active,
        created_at: newSchedule.created_at,
        updated_at: newSchedule.updated_at,
      };

      return newSchedule;
    } catch (err) {
      error.value = err.message;
      console.error('Error creating schedule:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateSchedule = async (scheduleId, updateData) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `${apiConfig.baseURL}/employee-schedules/${scheduleId}`,
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
        throw new Error(result.message || 'Failed to update schedule');
      }

      // Update the schedule in local state
      const updatedSchedule = result.data;
      const key = `${updatedSchedule.employee_id}_${updatedSchedule.schedule_date}`;
      if (schedules.value[key]) {
        schedules.value[key] = {
          ...schedules.value[key],
          shift: {
            id: updatedSchedule.id,
            name: updatedSchedule.shift_name,
            startTime: updatedSchedule.start_time,
            endTime: updatedSchedule.end_time,
            color: getShiftColor(updatedSchedule.shift_name),
          },
          notes: updatedSchedule.notes || '',
          updated_at: updatedSchedule.updated_at,
        };
      }

      return updatedSchedule;
    } catch (err) {
      error.value = err.message;
      console.error('Error updating schedule:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteSchedule = async (scheduleId) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `${apiConfig.baseURL}/employee-schedules/${scheduleId}`,
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
        throw new Error(result.message || 'Failed to delete schedule');
      }

      // Remove the schedule from local state
      Object.keys(schedules.value).forEach((key) => {
        if (schedules.value[key].id === scheduleId) {
          delete schedules.value[key];
        }
      });

      return result;
    } catch (err) {
      error.value = err.message;
      console.error('Error deleting schedule:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearSchedules = () => {
    schedules.value = {};
    error.value = null;
  };

  // Helper function
  const getShiftColor = (shiftName) => {
    const colorMap = {
      'Morning Shift': 'bg-blue-100 text-blue-800',
      'Afternoon Shift': 'bg-green-100 text-green-800',
      'Night Shift': 'bg-purple-100 text-purple-800',
    };
    return colorMap[shiftName] || 'bg-gray-100 text-gray-800';
  };

  return {
    // State
    schedules,
    shiftTypes,
    loading,
    error,

    // Getters
    getSchedulesForWeek,
    getShiftTypes,

    // Actions
    fetchSchedules,
    fetchShiftTypes,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    clearSchedules,
  };
});
