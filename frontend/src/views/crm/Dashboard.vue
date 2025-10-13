<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">CRM Dashboard</h1>
      <p class="text-gray-600 mt-2">
        Customer Relationship Management Overview
      </p>
    </div>

    <!-- Quick Stats (from Customer Feedback) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-primaryColor/10 text-primaryColor">
            <font-awesome-icon icon="fa-solid fa-comments" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Ratings</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ feedbackStats.total_ratings || 0 }}
            </p>
          </div>
        </div>
      </div>


      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
            <font-awesome-icon icon="fa-solid fa-star" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Avg Rating</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ (feedbackStats.average_rating || 0).toFixed(1) }}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-success/10 text-success">
            <font-awesome-icon icon="fa-solid fa-thumbs-up" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Satisfaction Rate</p>
            <p class="text-2xl font-bold text-gray-900">
              {{ satisfactionRate }}%
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div class="space-y-3">
          <router-link
            to="/crm/feedback"
            class="flex items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200"
          >
            <font-awesome-icon
              icon="fa-solid fa-comments"
              class="w-5 h-5 text-green-600 mr-3"
            />
            <div>
              <p class="font-medium text-gray-900">Manage Feedback</p>
              <p class="text-sm text-gray-600">
                View and manage customer feedback
              </p>
            </div>
          </router-link>

          <router-link
            to="/crm/analytics"
            class="flex items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
          >
            <font-awesome-icon
              icon="fa-solid fa-chart-bar"
              class="w-5 h-5 text-blue-600 mr-3"
            />
            <div>
              <p class="font-medium text-gray-900">View Analytics</p>
              <p class="text-sm text-gray-600">Customer insights and reports</p>
            </div>
          </router-link>

        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Ratings</h3>
        <div v-if="loading" class="text-center py-4">
          <div
            class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"
          ></div>
        </div>
        <div
          v-else-if="recentRatings.length === 0"
          class="text-center py-4 text-gray-500"
        >
          No recent ratings
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="rating in recentRatings"
            :key="rating.id"
            class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex-shrink-0">
              <div
                class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"
              >
                <font-awesome-icon
                  icon="fa-solid fa-comments"
                  class="w-4 h-4 text-green-600"
                />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900">
                {{ rating.customer_name }} rated
                {{ rating.overall_rating || 'N/A' }}/5
              </p>
              <p class="text-xs text-gray-500">
                {{ formatDate(rating.created_at) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Ratings Detailed List -->
    <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">Latest Ratings</h3>
      </div>
      <div v-if="loading" class="p-8 text-center">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"
        ></div>
        <p class="mt-2 text-gray-600">Loading...</p>
      </div>
      <div
        v-else-if="recentRatings.length === 0"
        class="p-8 text-center text-gray-500"
      >
        No ratings found
      </div>
      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="rating in recentRatings"
          :key="rating.id"
          class="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div
                class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"
              >
                <span class="text-sm font-medium text-green-600">
                  {{ (rating.customer_name || '?').charAt(0).toUpperCase() }}
                </span>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-900">
                {{ rating.customer_name }}
              </p>
              <p class="text-sm text-gray-500">
                Order: {{ rating.order_number }}
              </p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-medium text-gray-900">
              {{ rating.overall_rating || 'N/A' }}/5
            </p>
            <p class="text-xs text-gray-500">
              {{ formatDate(rating.created_at) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed } from 'vue';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { library } from '@fortawesome/fontawesome-svg-core';
  import {
    faUsers,
    faUserCheck,
    faStar,
    faDollarSign,
    faComments,
    faChartBar,
    faUser,
    faThumbsUp,
  } from '@fortawesome/free-solid-svg-icons';
  import { useFeedbackStore } from '@/stores/feedbackStore';

  library.add(
    faUsers,
    faUserCheck,
    faStar,
    faDollarSign,
    faComments,
    faChartBar,
    faUser,
    faThumbsUp
  );

  // Store
  const feedbackStore = useFeedbackStore();

  // Reactive data from feedback
  const feedbackStats = computed(() => feedbackStore.stats || {});
  const satisfactionRate = computed(() => feedbackStore.satisfactionRate || 0);
  const recentRatings = computed(() => {
    const list = Array.isArray(feedbackStore.orderRatings)
      ? feedbackStore.orderRatings
      : [];
    // Ensure sorted by created_at desc; take latest 10
    return [...list]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);
  });
  const loading = computed(() => feedbackStore.loading);

  // Methods
  const loadFeedback = async () => {
    try {
      await Promise.all([
        feedbackStore.fetchOrderRatingStats(),
        feedbackStore.fetchOrderRatings({
          limit: 20,
          offset: 0,
          sort_by: 'created_at',
          sort_order: 'desc',
        }),
      ]);
    } catch (error) {
      console.error('Error loading feedback data:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Lifecycle
  onMounted(() => {
    loadFeedback();
  });
</script>

<style scoped>
  /* Custom styles if needed */
</style>
