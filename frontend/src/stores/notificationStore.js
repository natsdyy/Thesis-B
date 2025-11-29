import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiConfig } from '../config/api';
import axios from 'axios';

export const useNotificationStore = defineStore('notification', () => {
  // State
  const notifications = ref([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  const error = ref(null);
  const pollingInterval = ref(null);

  // Computed
  const unreadNotifications = computed(() => 
    notifications.value.filter(n => !n.is_read)
  );

  const readNotifications = computed(() => 
    notifications.value.filter(n => n.is_read)
  );

  // Actions
  const fetchNotifications = async (filters = {}) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      
      if (filters.is_read !== undefined) {
        params.append('is_read', filters.is_read);
      }
      if (filters.notification_type) {
        params.append('notification_type', filters.notification_type);
      }
      if (filters.limit) {
        params.append('limit', filters.limit);
      }

      const response = await axios.get(
        `${apiConfig.baseURL}/notifications?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        notifications.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch notifications';
      console.error('Error fetching notifications:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/notifications/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        unreadCount.value = response.data.data.unread_count;
        return response.data.data.unread_count;
      } else {
        throw new Error(response.data.message || 'Failed to fetch unread count');
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
      // Don't throw error for unread count to avoid breaking the UI
      return 0;
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await axios.patch(
        `${apiConfig.baseURL}/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        // Update local state
        const notification = notifications.value.find(n => n.id === notificationId);
        if (notification) {
          notification.is_read = true;
        }
        
        // Update unread count
        await fetchUnreadCount();
        
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to mark notification as read');
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message || 'Failed to mark notification as read';
      console.error('Error marking notification as read:', err);
      throw err;
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await axios.patch(
        `${apiConfig.baseURL}/notifications/mark-all-read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        // Update local state
        notifications.value.forEach(n => n.is_read = true);
        unreadCount.value = 0;
        
        return true;
      } else {
        throw new Error(response.data.message || 'Failed to mark all notifications as read');
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message || 'Failed to mark all notifications as read';
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const response = await axios.delete(
        `${apiConfig.baseURL}/notifications/${notificationId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.data.success) {
        // Remove from local state
        notifications.value = notifications.value.filter(n => n.id !== notificationId);
        
        // Update unread count
        await fetchUnreadCount();
        
        return true;
      } else {
        throw new Error(response.data.message || 'Failed to delete notification');
      }
    } catch (err) {
      error.value = err.response?.data?.message || err.message || 'Failed to delete notification';
      console.error('Error deleting notification:', err);
      throw err;
    }
  };

  const startPolling = () => {
    // Clear existing interval
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value);
    }

    // Poll every 30 seconds
    pollingInterval.value = setInterval(async () => {
      try {
        await fetchUnreadCount();
      } catch (err) {
        console.error('Error in notification polling:', err);
      }
    }, 30000);
  };

  const stopPolling = () => {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value);
      pollingInterval.value = null;
    }
  };

  const clearError = () => {
    error.value = null;
  };

  const reset = () => {
    notifications.value = [];
    unreadCount.value = 0;
    loading.value = false;
    error.value = null;
    stopPolling();
  };

  return {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    
    // Computed
    unreadNotifications,
    readNotifications,
    
    // Actions
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    startPolling,
    stopPolling,
    clearError,
    reset,
  };
});
