<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p class="text-gray-600 mt-2">Comprehensive insights into customer behavior and business performance</p>
        </div>
        <div class="flex items-center space-x-4">
          <button
            @click="refreshData"
            :disabled="loading"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
          >
            <font-awesome-icon icon="fa-solid fa-refresh" :class="{ 'animate-spin': loading }" />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-6 mb-8">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Filters</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Date From</label>
          <input
            v-model="filters.date_from"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            @change="applyFilters"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Date To</label>
          <input
            v-model="filters.date_to"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            @change="applyFilters"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Branch</label>
          <select
            v-model="filters.branch_id"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            @change="applyFilters"
          >
            <option value="">All Branches</option>
            <option v-for="branch in branches" :key="branch.id" :value="branch.id">
              {{ branch.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Period</label>
          <select
            v-model="filters.period"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            @change="applyFilters"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Overview Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-blue-100 text-blue-600">
            <font-awesome-icon icon="fa-solid fa-users" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Customers</p>
            <p class="text-2xl font-bold text-gray-900">{{ overview.customers?.total_customers || 0 }}</p>
            <p class="text-xs text-green-600">{{ overview.customers?.active_customers || 0 }} active</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-green-100 text-green-600">
            <font-awesome-icon icon="fa-solid fa-comments" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Feedback</p>
            <p class="text-2xl font-bold text-gray-900">{{ overview.feedback?.total_feedback || 0 }}</p>
            <p class="text-xs text-green-600">{{ overview.feedback?.positive_feedback || 0 }} positive</p>
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
            <p class="text-2xl font-bold text-gray-900">{{ (overview.ratings?.average_order_rating || 0).toFixed(1) }}</p>
            <p class="text-xs text-green-600">{{ overview.ratings?.positive_ratings || 0 }} positive</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-purple-100 text-purple-600">
            <font-awesome-icon icon="fa-solid fa-dollar-sign" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Sales</p>
            <p class="text-2xl font-bold text-gray-900">₱{{ (overview.sales?.total_sales || 0).toLocaleString() }}</p>
            <p class="text-xs text-green-600">{{ overview.sales?.total_orders || 0 }} orders</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row 1 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Rating Distribution -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Rating Distribution</h3>
        <div class="h-64">
          <DoughnutChart
            v-if="ratingDistributionData"
            :data="ratingDistributionData"
            :options="doughnutOptions"
          />
        </div>
      </div>

      <!-- Branch Performance -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Branch Performance</h3>
        <div class="h-64">
          <BarChart
            v-if="branchPerformanceData"
            :data="branchPerformanceData"
            :options="barOptions"
          />
        </div>
      </div>
    </div>

    <!-- Charts Row 2 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Sales Trends -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Sales Trends</h3>
        <div class="h-64">
          <LineChart
            v-if="salesTrendsData"
            :data="salesTrendsData"
            :options="lineOptions"
          />
        </div>
      </div>

      <!-- Customer Growth -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Customer Growth</h3>
        <div class="h-64">
          <LineChart
            v-if="customerTrendsData"
            :data="customerTrendsData"
            :options="lineOptions"
          />
        </div>
      </div>
    </div>

    <!-- Top Foods and Branch Analytics -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Top Foods -->
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Top Rated Foods</h3>
        </div>
        <div class="p-6">
          <div v-if="loading" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p class="mt-2 text-gray-600">Loading...</p>
          </div>
          <div v-else-if="topFoods.length === 0" class="text-center py-8 text-gray-500">
            No food ratings available
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="(food, index) in topFoods"
              :key="food.name"
              class="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center">
                <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <span class="text-sm font-bold text-green-600">{{ index + 1 }}</span>
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ food.name }}</p>
                  <p class="text-sm text-gray-500">{{ food.total_ratings }} ratings</p>
                </div>
              </div>
              <div class="text-right">
                <div class="flex items-center text-yellow-600">
                  <font-awesome-icon icon="fa-solid fa-star" class="w-4 h-4 mr-1" />
                  <span class="font-bold">{{ food.average_rating.toFixed(1) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Branch Analytics -->
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Branch Analytics</h3>
        </div>
        <div class="p-6">
          <div v-if="loading" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p class="mt-2 text-gray-600">Loading...</p>
          </div>
          <div v-else-if="branchPerformance.length === 0" class="text-center py-8 text-gray-500">
            No branch data available
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="branch in branchPerformance"
              :key="branch.branch_name"
              class="p-4 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-gray-900">{{ branch.branch_name }}</h4>
                <div class="flex items-center text-yellow-600">
                  <font-awesome-icon icon="fa-solid fa-star" class="w-4 h-4 mr-1" />
                  <span class="font-bold">{{ (branch.average_rating || 0).toFixed(1) }}</span>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-gray-600">Sales</p>
                  <p class="font-bold text-green-600">₱{{ (branch.total_sales || 0).toLocaleString() }}</p>
                </div>
                <div>
                  <p class="text-gray-600">Orders</p>
                  <p class="font-bold text-blue-600">{{ branch.total_orders || 0 }}</p>
                </div>
                <div>
                  <p class="text-gray-600">Feedback</p>
                  <p class="font-bold text-purple-600">{{ branch.total_feedback || 0 }}</p>
                </div>
                <div>
                  <p class="text-gray-600">Avg Order</p>
                  <p class="font-bold text-orange-600">₱{{ (branch.average_order_value || 0).toLocaleString() }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Feedback Trends -->
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Feedback Trends</h3>
      <div class="h-64">
        <LineChart
          v-if="feedbackTrendsData"
          :data="feedbackTrendsData"
          :options="lineOptions"
        />
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
  faComments,
  faStar,
  faDollarSign,
  faRefresh
} from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Doughnut, Bar, Line } from 'vue-chartjs';

library.add(faUsers, faComments, faStar, faDollarSign, faRefresh);

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Chart components
const DoughnutChart = Doughnut;
const BarChart = Bar;
const LineChart = Line;

// Reactive data
const loading = ref(false);
const overview = ref({});
const topFoods = ref([]);
const branchPerformance = ref([]);
const branches = ref([]);

// Filters
const filters = ref({
  date_from: '',
  date_to: '',
  branch_id: '',
  period: 'month'
});

// Chart data
const ratingDistributionData = ref(null);
const branchPerformanceData = ref(null);
const salesTrendsData = ref(null);
const customerTrendsData = ref(null);
const feedbackTrendsData = ref(null);

// Chart options
const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom'
    }
  }
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top'
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top'
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
};

// Methods
const loadOverview = async () => {
  try {
    const params = new URLSearchParams();
    if (filters.value.date_from) params.append('date_from', filters.value.date_from);
    if (filters.value.date_to) params.append('date_to', filters.value.date_to);
    if (filters.value.branch_id) params.append('branch_id', filters.value.branch_id);

    const response = await fetch(`/api/analytics/overview?${params.toString()}`);
    const data = await response.json();

    if (data.success) {
      overview.value = data.data;
    }
  } catch (error) {
    console.error('Error loading overview:', error);
  }
};

const loadTopFoods = async () => {
  try {
    const params = new URLSearchParams();
    if (filters.value.date_from) params.append('date_from', filters.value.date_from);
    if (filters.value.date_to) params.append('date_to', filters.value.date_to);
    if (filters.value.branch_id) params.append('branch_id', filters.value.branch_id);

    const response = await fetch(`/api/analytics/top-foods?${params.toString()}`);
    const data = await response.json();

    if (data.success) {
      topFoods.value = data.data;
    }
  } catch (error) {
    console.error('Error loading top foods:', error);
  }
};

const loadBranchPerformance = async () => {
  try {
    const params = new URLSearchParams();
    if (filters.value.date_from) params.append('date_from', filters.value.date_from);
    if (filters.value.date_to) params.append('date_to', filters.value.date_to);

    const response = await fetch(`/api/analytics/branch-performance?${params.toString()}`);
    const data = await response.json();

    if (data.success) {
      branchPerformance.value = data.data;
      updateBranchPerformanceChart(data.data);
    }
  } catch (error) {
    console.error('Error loading branch performance:', error);
  }
};

const loadTrends = async () => {
  try {
    const params = new URLSearchParams();
    params.append('period', filters.value.period);
    if (filters.value.date_from) params.append('date_from', filters.value.date_from);
    if (filters.value.date_to) params.append('date_to', filters.value.date_to);

    const response = await fetch(`/api/analytics/trends?${params.toString()}`);
    const data = await response.json();

    if (data.success) {
      updateSalesTrendsChart(data.data.sales);
      updateCustomerTrendsChart(data.data.customers);
      updateFeedbackTrendsChart(data.data.feedback);
    }
  } catch (error) {
    console.error('Error loading trends:', error);
  }
};

const loadRatingDistribution = async () => {
  try {
    const params = new URLSearchParams();
    if (filters.value.date_from) params.append('date_from', filters.value.date_from);
    if (filters.value.date_to) params.append('date_to', filters.value.date_to);
    if (filters.value.branch_id) params.append('branch_id', filters.value.branch_id);

    const response = await fetch(`/api/analytics/rating-distribution?${params.toString()}`);
    const data = await response.json();

    if (data.success) {
      updateRatingDistributionChart(data.data);
    }
  } catch (error) {
    console.error('Error loading rating distribution:', error);
  }
};

const loadBranches = async () => {
  try {
    const response = await fetch('/api/branches');
    const data = await response.json();

    if (data.success) {
      branches.value = data.data;
    }
  } catch (error) {
    console.error('Error loading branches:', error);
  }
};

const updateRatingDistributionChart = (data) => {
  const labels = [];
  const counts = [];
  const colors = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  // Combine feedback and order ratings
  const combined = {};
  [...(data.feedback || []), ...(data.order_ratings || [])].forEach(item => {
    if (!combined[item.rating]) {
      combined[item.rating] = 0;
    }
    combined[item.rating] += item.count;
  });

  Object.keys(combined).sort().forEach(rating => {
    labels.push(`${rating} Star${rating > 1 ? 's' : ''}`);
    counts.push(combined[rating]);
  });

  ratingDistributionData.value = {
    labels,
    datasets: [{
      data: counts,
      backgroundColor: colors.slice(0, labels.length),
      borderWidth: 0
    }]
  };
};

const updateBranchPerformanceChart = (data) => {
  const labels = data.map(branch => branch.branch_name);
  const sales = data.map(branch => branch.total_sales || 0);
  const ratings = data.map(branch => (branch.average_rating || 0) * 1000); // Scale for visibility

  branchPerformanceData.value = {
    labels,
    datasets: [
      {
        label: 'Total Sales (₱)',
        data: sales,
        backgroundColor: '#10B981',
        yAxisID: 'y'
      },
      {
        label: 'Average Rating (×1000)',
        data: ratings,
        backgroundColor: '#F59E0B',
        yAxisID: 'y1'
      }
    ]
  };
};

const updateSalesTrendsChart = (data) => {
  const labels = data.map(item => item.period);
  const sales = data.map(item => item.total_sales || 0);
  const orders = data.map(item => item.total_orders || 0);

  salesTrendsData.value = {
    labels,
    datasets: [
      {
        label: 'Total Sales (₱)',
        data: sales,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      },
      {
        label: 'Total Orders',
        data: orders,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }
    ]
  };
};

const updateCustomerTrendsChart = (data) => {
  const labels = data.map(item => item.period);
  const customers = data.map(item => item.new_customers || 0);
  const revenue = data.map(item => item.revenue || 0);

  customerTrendsData.value = {
    labels,
    datasets: [
      {
        label: 'New Customers',
        data: customers,
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'Revenue (₱)',
        data: revenue,
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4
      }
    ]
  };
};

const updateFeedbackTrendsChart = (data) => {
  const labels = data.map(item => item.period);
  const feedback = data.map(item => item.total_feedback || 0);
  const ratings = data.map(item => (item.average_rating || 0) * 10); // Scale for visibility

  feedbackTrendsData.value = {
    labels,
    datasets: [
      {
        label: 'Total Feedback',
        data: feedback,
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4
      },
      {
        label: 'Average Rating (×10)',
        data: ratings,
        borderColor: '#06B6D4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        tension: 0.4
      }
    ]
  };
};

const applyFilters = () => {
  loadAllData();
};

const refreshData = async () => {
  loading.value = true;
  await loadAllData();
  loading.value = false;
};

const loadAllData = async () => {
  await Promise.all([
    loadOverview(),
    loadTopFoods(),
    loadBranchPerformance(),
    loadTrends(),
    loadRatingDistribution()
  ]);
};

// Lifecycle
onMounted(() => {
  // Set default date range (last 30 days)
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  filters.value.date_from = thirtyDaysAgo.toISOString().split('T')[0];
  filters.value.date_to = today.toISOString().split('T')[0];
  
  loadBranches();
  loadAllData();
});
</script>

<style scoped>
/* Custom styles if needed */
</style>
