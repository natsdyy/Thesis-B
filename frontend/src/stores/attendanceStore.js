import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const useAttendanceStore = defineStore('attendance', () => {
  // State
  const qrCodes = ref([]);
  const attendanceRecords = ref([]);
  const todayAttendance = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const isTimeInToday = computed(() => {
    return todayAttendance.value && todayAttendance.value.time_in;
  });

  const isTimeOutToday = computed(() => {
    return todayAttendance.value && todayAttendance.value.time_out;
  });

  const canTimeIn = computed(() => {
    return !isTimeInToday.value;
  });

  const canTimeOut = computed(() => {
    return isTimeInToday.value && !isTimeOutToday.value;
  });

  // Actions
  const fetchQRCodes = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await axios.get(`${API_BASE_URL}/attendance/qr-codes`);
      
      if (response.data.success) {
        qrCodes.value = response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createQRCode = async (locationName, description = '') => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await axios.post(`${API_BASE_URL}/attendance/qr-codes`, {
        location_name: locationName,
        description: description
      });
      
      if (response.data.success) {
        await fetchQRCodes(); // Refresh the list
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateQRCode = async (id, data) => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await axios.put(`${API_BASE_URL}/attendance/qr-codes/${id}`, data);
      
      if (response.data.success) {
        await fetchQRCodes(); // Refresh the list
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteQRCode = async (id) => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await axios.delete(`${API_BASE_URL}/attendance/qr-codes/${id}`);
      
      if (response.data.success) {
        await fetchQRCodes(); // Refresh the list
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const timeIn = async (qrCode) => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await axios.post(`${API_BASE_URL}/attendance/time-in`, {
        qr_code: qrCode
      });
      
      if (response.data.success) {
        await fetchTodayAttendance(); // Refresh today's attendance
        return response.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const timeOut = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await axios.post(`${API_BASE_URL}/attendance/time-out`);
      
      if (response.data.success) {
        await fetchTodayAttendance(); // Refresh today's attendance
        return response.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      loading.value = true;
      error.value = null;
      
      const response = await axios.get(`${API_BASE_URL}/attendance/today`);
      
      if (response.data.success) {
        todayAttendance.value = response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchMyAttendance = async (date = null) => {
    try {
      loading.value = true;
      error.value = null;
      
      const params = date ? { date } : {};
      const response = await axios.get(`${API_BASE_URL}/attendance/my-attendance`, { params });
      
      if (response.data.success) {
        attendanceRecords.value = response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const validateQRCode = async (qrCode) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/attendance/validate-qr`, {
        qr_code: qrCode
      });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message);
    }
  };

  const getAttendanceReport = async (userId = null, startDate, endDate) => {
    try {
      loading.value = true;
      error.value = null;
      
      const params = {
        start_date: startDate,
        end_date: endDate
      };
      
      if (userId) {
        params.user_id = userId;
      }
      
      const response = await axios.get(`${API_BASE_URL}/attendance/report`, { params });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message;
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
    qrCodes,
    attendanceRecords,
    todayAttendance,
    loading,
    error,
    
    // Getters
    isTimeInToday,
    isTimeOutToday,
    canTimeIn,
    canTimeOut,
    
    // Actions
    fetchQRCodes,
    createQRCode,
    updateQRCode,
    deleteQRCode,
    timeIn,
    timeOut,
    fetchTodayAttendance,
    fetchMyAttendance,
    validateQRCode,
    getAttendanceReport,
    clearError
  };
});
