<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">CRM Dashboard</h1>
      <p class="text-gray-600 mt-2">Customer Relationship Management Overview</p>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-blue-100 text-blue-600">
            <font-awesome-icon icon="fa-solid fa-users" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Customers</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.total_customers || 0 }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-green-100 text-green-600">
            <font-awesome-icon icon="fa-solid fa-user-check" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Active Customers</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.active_customers || 0 }}</p>
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
            <p class="text-2xl font-bold text-gray-900">{{ (stats.overall_average_rating || 0).toFixed(1) }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-purple-100 text-purple-600">
            <font-awesome-icon icon="fa-solid fa-dollar-sign" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Revenue</p>
            <p class="text-2xl font-bold text-gray-900">₱{{ (stats.total_revenue || 0).toLocaleString() }}</p>
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
            to="/crm/customers"
            class="flex items-center p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200"
          >
            <font-awesome-icon icon="fa-solid fa-users" class="w-5 h-5 text-green-600 mr-3" />
            <div>
              <p class="font-medium text-gray-900">Manage Customers</p>
              <p class="text-sm text-gray-600">View and manage customer data</p>
            </div>
          </router-link>
          
          <router-link
            to="/crm/feedback"
            class="flex items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
          >
            <font-awesome-icon icon="fa-solid fa-comments" class="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <p class="font-medium text-gray-900">View Feedback</p>
              <p class="text-sm text-gray-600">Customer feedback and reviews</p>
            </div>
          </router-link>
          
          <router-link
            to="/crm/analytics"
            class="flex items-center p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors duration-200"
          >
            <font-awesome-icon icon="fa-solid fa-chart-bar" class="w-5 h-5 text-purple-600 mr-3" />
            <div>
              <p class="font-medium text-gray-900">Analytics</p>
              <p class="text-sm text-gray-600">Customer insights and reports</p>
            </div>
          </router-link>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <div v-if="loading" class="text-center py-4">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
        </div>
        <div v-else-if="recentActivity.length === 0" class="text-center py-4 text-gray-500">
          No recent activity
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="activity in recentActivity"
            :key="activity.id"
            class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex-shrink-0">
              <div class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <font-awesome-icon icon="fa-solid fa-user" class="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900">{{ activity.description }}</p>
              <p class="text-xs text-gray-500">{{ formatDate(activity.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Customers -->
    <div class="bg-white rounded-lg shadow">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">Top Customers by Spending</h3>
      </div>
      <div v-if="loading" class="p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <p class="mt-2 text-gray-600">Loading...</p>
      </div>
      <div v-else-if="topCustomers.length === 0" class="p-8 text-center text-gray-500">
        No customers found
      </div>
      <div v-else class="divide-y divide-gray-200">
        <div
          v-for="(customer, index) in topCustomers"
          :key="customer.id"
          class="px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span class="text-sm font-medium text-green-600">
                  {{ customer.name.charAt(0).toUpperCase() }}
                </span>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-900">{{ customer.name }}</p>
              <p class="text-sm text-gray-500">{{ customer.email }}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-medium text-gray-900">₱{{ (customer.total_spent || 0).toLocaleString() }}</p>
            <p class="text-xs text-gray-500">{{ customer.total_orders || 0 }} orders</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faUsers,
  faUserCheck,
  faStar,
  faDollarSign,
  faComments,
  faChartBar,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import customerService from '../../services/customerService';

library.add(faUsers, faUserCheck, faStar, faDollarSign, faComments, faChartBar, faUser);

// Reactive data
const stats = ref({});
const topCustomers = ref([]);
const recentActivity = ref([]);
const loading = ref(false);

// Methods
const loadStats = async () => {
  try {
    const response = await customerService.getCustomerStats();
    if (response.success) {
      stats.value = response.data;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
};

const loadTopCustomers = async () => {
  try {
    loading.value = true;
    const response = await customerService.getTopCustomers(5);
    if (response.success) {
      topCustomers.value = response.data;
    }
  } catch (error) {
    console.error('Error loading top customers:', error);
  } finally {
    loading.value = false;
  }
};

const loadRecentActivity = async () => {
  try {
    // This would typically come from a separate activity endpoint
    // For now, we'll simulate with recent customers
    const response = await customerService.getCustomers({ limit: 5, sort_by: 'created_at', sort_order: 'desc' });
    if (response.success) {
      recentActivity.value = response.data.map(customer => ({
        id: customer.id,
        description: `New customer ${customer.name} registered`,
        created_at: customer.created_at
      }));
    }
  } catch (error) {
    console.error('Error loading recent activity:', error);
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Lifecycle
onMounted(() => {
  loadStats();
  loadTopCustomers();
  loadRecentActivity();
});
</script>

<style scoped>
/* Custom styles if needed */
</style>