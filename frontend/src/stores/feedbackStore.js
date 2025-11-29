import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import feedbackService from '@/services/feedbackService';

export const useFeedbackStore = defineStore('feedback', () => {
  // State
  const orderRatings = ref([]);
  const generalFeedback = ref([]);
  const stats = ref({});
  const loading = ref(false);
  const error = ref(null);

  // Filters for order ratings
  const orderRatingFilters = ref({
    search: '',
    rating: '',
    source: '',
    status: '',
    order_number: '',
    branch_name: '',
    sort_by: 'created_at',
    sort_order: 'desc',
    limit: 20,
    offset: 0,
  });

  // Pagination for order ratings
  const orderRatingPagination = ref({
    total: 0,
    limit: 20,
    offset: 0,
  });

  // Filters for general feedback
  const generalFeedbackFilters = ref({
    search: '',
    rating: '',
    source: '',
    status: '',
    sort_by: 'created_at',
    sort_order: 'desc',
    limit: 20,
    offset: 0,
  });

  // Pagination for general feedback
  const generalFeedbackPagination = ref({
    total: 0,
    limit: 20,
    offset: 0,
  });

  // Getters
  const orderRatingsByRating = computed(() => (rating) => {
    return orderRatings.value.filter(
      (rating) => rating.overall_rating === rating
    );
  });

  const positiveOrderRatings = computed(() => {
    return orderRatings.value.filter((rating) => rating.overall_rating >= 4);
  });

  const negativeOrderRatings = computed(() => {
    return orderRatings.value.filter((rating) => rating.overall_rating <= 2);
  });

  const orderRatingsWithImages = computed(() => {
    return orderRatings.value.filter((rating) => rating.image_filename);
  });

  const satisfactionRate = computed(() => {
    if (!stats.value.total_ratings) return 0;
    const positive = stats.value.positive_ratings || 0;
    return Math.round((positive / stats.value.total_ratings) * 100);
  });

  // Actions
  const fetchOrderRatings = async (filters = {}) => {
    try {
      loading.value = true;
      error.value = null;

      // Merge provided filters with current filters
      const mergedFilters = { ...orderRatingFilters.value, ...filters };
      orderRatingFilters.value = mergedFilters;

      const data = await feedbackService.getOrderRatings(mergedFilters);

      if (data.success) {
        orderRatings.value = data.data;
        orderRatingPagination.value = data.pagination;
      } else {
        error.value = data.message || 'Failed to load order ratings';
        console.error('Failed to load order ratings:', data.message);
      }
    } catch (err) {
      error.value = err.message || 'Error loading order ratings';
      console.error('Error loading order ratings:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchGeneralFeedback = async (filters = {}) => {
    try {
      loading.value = true;
      error.value = null;

      // Merge provided filters with current filters
      const mergedFilters = { ...generalFeedbackFilters.value, ...filters };
      generalFeedbackFilters.value = mergedFilters;

      const data = await feedbackService.getFeedback(mergedFilters);

      if (data.success) {
        generalFeedback.value = data.data;
        generalFeedbackPagination.value = data.pagination;
      } else {
        error.value = data.message || 'Failed to load feedback';
        console.error('Failed to load feedback:', data.message);
      }
    } catch (err) {
      error.value = err.message || 'Error loading feedback';
      console.error('Error loading feedback:', err);
    } finally {
      loading.value = false;
    }
  };

  const fetchOrderRatingStats = async (filters = {}) => {
    try {
      error.value = null;
      const data = await feedbackService.getOrderRatingStats(filters);

      if (data.success) {
        stats.value = data.data;
      } else {
        error.value = data.message || 'Failed to load statistics';
        console.error('Failed to load order rating stats:', data.message);
      }
    } catch (err) {
      error.value = err.message || 'Error loading statistics';
      console.error('Error loading order rating stats:', err);
    }
  };

  const markAsRead = async (feedbackId) => {
    try {
      const data = await feedbackService.markAsRead(feedbackId);

      if (data.success) {
        // Update the item in the store
        const item = orderRatings.value.find((r) => r.id === feedbackId);
        if (item) {
          item.status = 'read';
        }
      } else {
        error.value = data.message || 'Failed to mark as read';
        console.error('Failed to mark as read:', data.message);
      }
    } catch (err) {
      error.value = err.message || 'Error marking as read';
      console.error('Error marking as read:', err);
    }
  };

  const archiveFeedback = async (feedbackId) => {
    try {
      const data = await feedbackService.archiveFeedback(feedbackId);

      if (data.success) {
        // Update the item in the store
        const item = orderRatings.value.find((r) => r.id === feedbackId);
        if (item) {
          item.status = 'archived';
        }
      } else {
        error.value = data.message || 'Failed to archive feedback';
        console.error('Failed to archive feedback:', data.message);
      }
    } catch (err) {
      error.value = err.message || 'Error archiving feedback';
      console.error('Error archiving feedback:', err);
    }
  };

  const sendReply = async (feedbackId, message, internalNote = '') => {
    try {
      // Use the order rating reply endpoint for order ratings
      const data = await feedbackService.sendOrderRatingReply(
        feedbackId,
        message,
        internalNote
      );

      if (data.success) {
        // Update the item in the store
        const item = orderRatings.value.find((r) => r.id === feedbackId);
        if (item) {
          item.status = 'replied';
        }
        return data;
      } else {
        error.value = data.message || 'Failed to send reply';
        console.error('Failed to send reply:', data.message);
        throw new Error(data.message);
      }
    } catch (err) {
      error.value = err.message || 'Error sending reply';
      console.error('Error sending reply:', err);
      throw err;
    }
  };

  const clearOrderRatingFilters = () => {
    orderRatingFilters.value = {
      search: '',
      rating: '',
      source: '',
      status: '',
      order_number: '',
      branch_name: '',
      sort_by: 'created_at',
      sort_order: 'desc',
      limit: 20,
      offset: 0,
    };
  };

  const clearGeneralFeedbackFilters = () => {
    generalFeedbackFilters.value = {
      search: '',
      rating: '',
      source: '',
      status: '',
      sort_by: 'created_at',
      sort_order: 'desc',
      limit: 20,
      offset: 0,
    };
  };

  const setOrderRatingFilters = (newFilters) => {
    orderRatingFilters.value = { ...orderRatingFilters.value, ...newFilters };
  };

  const setGeneralFeedbackFilters = (newFilters) => {
    generalFeedbackFilters.value = {
      ...generalFeedbackFilters.value,
      ...newFilters,
    };
  };

  const nextOrderRatingPage = () => {
    if (
      orderRatingPagination.value.offset + orderRatingPagination.value.limit <
      orderRatingPagination.value.total
    ) {
      orderRatingFilters.value.offset =
        orderRatingPagination.value.offset + orderRatingPagination.value.limit;
      fetchOrderRatings();
    }
  };

  const previousOrderRatingPage = () => {
    if (orderRatingPagination.value.offset > 0) {
      orderRatingFilters.value.offset =
        orderRatingPagination.value.offset - orderRatingPagination.value.limit;
      fetchOrderRatings();
    }
  };

  const nextGeneralFeedbackPage = () => {
    if (
      generalFeedbackPagination.value.offset +
        generalFeedbackPagination.value.limit <
      generalFeedbackPagination.value.total
    ) {
      generalFeedbackFilters.value.offset =
        generalFeedbackPagination.value.offset +
        generalFeedbackPagination.value.limit;
      fetchGeneralFeedback();
    }
  };

  const previousGeneralFeedbackPage = () => {
    if (generalFeedbackPagination.value.offset > 0) {
      generalFeedbackFilters.value.offset =
        generalFeedbackPagination.value.offset -
        generalFeedbackPagination.value.limit;
      fetchGeneralFeedback();
    }
  };

  const refreshData = async () => {
    await Promise.all([fetchOrderRatings(), fetchOrderRatingStats()]);
  };

  const clearError = () => {
    error.value = null;
  };

  return {
    // State
    orderRatings,
    generalFeedback,
    stats,
    loading,
    error,
    orderRatingFilters,
    orderRatingPagination,
    generalFeedbackFilters,
    generalFeedbackPagination,

    // Getters
    orderRatingsByRating,
    positiveOrderRatings,
    negativeOrderRatings,
    orderRatingsWithImages,
    satisfactionRate,

    // Actions
    fetchOrderRatings,
    fetchGeneralFeedback,
    fetchOrderRatingStats,
    markAsRead,
    archiveFeedback,
    sendReply,
    clearOrderRatingFilters,
    clearGeneralFeedbackFilters,
    setOrderRatingFilters,
    setGeneralFeedbackFilters,
    nextOrderRatingPage,
    previousOrderRatingPage,
    nextGeneralFeedbackPage,
    previousGeneralFeedbackPage,
    refreshData,
    clearError,
  };
});
