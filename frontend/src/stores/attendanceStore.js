import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { apiConfig, getApiUrl } from '../config/api.js';

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
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };
  const fetchQRCodes = async () => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.get(
        getApiUrl('/attendance/qr-codes'),
        getAuthHeaders()
      );

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

      const response = await axios.post(
        getApiUrl('/attendance/qr-codes'),
        {
          location_name: locationName,
          description: description,
        },
        getAuthHeaders()
      );

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

      const response = await axios.put(
        getApiUrl(`/attendance/qr-codes/${id}`),
        data,
        getAuthHeaders()
      );

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

      const response = await axios.delete(
        getApiUrl(`/attendance/qr-codes/${id}`),
        getAuthHeaders()
      );

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

      // Try to get current GPS coordinates (non-blocking fallback)
      const getPosition = () =>
        new Promise((resolve) => {
          if (!navigator.geolocation) return resolve(null);
          navigator.geolocation.getCurrentPosition(
            (pos) =>
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
          );
        });

      const coords = await getPosition();
      const payload = coords
        ? {
            qr_code: qrCode,
            latitude: coords.latitude,
            longitude: coords.longitude,
          }
        : { qr_code: qrCode };

      const response = await axios.post(
        getApiUrl('/attendance/time-in'),
        payload,
        getAuthHeaders()
      );

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

      const response = await axios.post(
        getApiUrl('/attendance/time-out'),
        {},
        getAuthHeaders()
      );

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

      const response = await axios.get(
        getApiUrl('/attendance/today'),
        getAuthHeaders()
      );

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
      const response = await axios.get(getApiUrl('/attendance/my-attendance'), {
        ...getAuthHeaders(),
        params,
      });

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

  // Fetch attendance status for multiple employees
  const fetchBulkAttendanceStatus = async (filters = {}) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.get(getApiUrl('/attendance/bulk-status'), {
        ...getAuthHeaders(),
        params: filters,
      });

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

  const validateQRCode = async (qrCode) => {
    try {
      const response = await axios.post(getApiUrl('/attendance/validate-qr'), {
        qr_code: qrCode,
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

  const scanQRCode = async (qrData) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.post(getApiUrl('/attendance/scan'), {
        qrData: qrData,
      });

      if (response.data.success) {
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

  const getAttendanceReport = async (userId = null, startDate, endDate) => {
    try {
      loading.value = true;
      error.value = null;

      const params = {
        start_date: startDate,
        end_date: endDate,
      };

      // Backend expects user_id parameter; only include if numeric
      if (userId !== null && userId !== undefined) {
        const numericId = Number(userId);
        if (!Number.isNaN(numericId) && Number.isFinite(numericId)) {
          params.user_id = numericId;
        }
      }

      const response = await axios.get(getApiUrl('/attendance/report'), {
        ...getAuthHeaders(),
        params,
      });

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

  // Schedule-related methods
  const fetchMySchedule = async () => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.get(
        getApiUrl('/attendance/my-schedule'),
        getAuthHeaders()
      );

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

  const validateSchedule = async (currentTime = null) => {
    try {
      loading.value = true;
      error.value = null;

      const response = await axios.post(
        getApiUrl('/attendance/validate-schedule'),
        { currentTime },
        getAuthHeaders()
      );

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
    fetchBulkAttendanceStatus,
    validateQRCode,
    scanQRCode,
    getAttendanceReport,
    fetchMySchedule,
    validateSchedule,
    clearError,
  };
});
