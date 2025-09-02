<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        SCM Analytics Dashboard
      </h1>
      <p class="text-gray-600">
        Comprehensive insights and forecasting for supply chain management
      </p>
    </div>

    <!-- Timeframe Selector -->
    <div class="mb-6 flex items-center gap-4">
      <label class="text-sm font-medium text-gray-700">Timeframe:</label>
      <select
        v-model="selectedTimeframe"
        @change="loadDashboardData"
        class="select select-bordered select-sm w-32"
      >
        <option value="7">7 Days</option>
        <option value="30">30 Days</option>
        <option value="90">90 Days</option>
        <option value="365">1 Year</option>
      </select>
      <button
        @click="refreshAll"
        :disabled="loading"
        class="btn btn-primary btn-sm"
      >
        <RefreshCcw v-if="!loading" class="w-4 h-4" />
        <span v-else class="loading loading-spinner loading-sm"></span>
        Refresh
      </button>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="alert alert-error mb-6">
      <AlertTriangle class="w-5 h-5" />
      <span>{{ error }}</span>
      <button @click="analyticsStore.clearError()" class="btn btn-sm btn-ghost">
        ×
      </button>
    </div>

    <!-- Analytics Widgets -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Total Items Widget -->
      <div class="card bg-white shadow-sm">
        <div class="card-body p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Items</p>
              <p class="text-2xl font-bold text-gray-900">
                {{ analyticsStore.totalItems }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 rounded-full">
              <Package class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- Total Consumption Widget -->
      <div class="card bg-white shadow-sm">
        <div class="card-body p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Total Consumption</p>
              <p class="text-2xl font-bold text-gray-900">
                {{ analyticsStore.totalConsumption }}
              </p>
            </div>
            <div class="p-3 bg-green-100 rounded-full">
              <TrendingDown class="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- Inventory Turnover Widget -->
      <div class="card bg-white shadow-sm">
        <div class="card-body p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Turnover Rate</p>
              <p class="text-2xl font-bold text-gray-900">
                {{ analyticsStore.turnoverRate.toFixed(2) }}
              </p>
            </div>
            <div class="p-3 bg-purple-100 rounded-full">
              <BarChart3 class="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- Low Stock Alerts Widget -->
      <div class="card bg-white shadow-sm">
        <div class="card-body p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p class="text-2xl font-bold text-red-600">
                {{ analyticsStore.lowStockCount }}
              </p>
            </div>
            <div class="p-3 bg-red-100 rounded-full">
              <AlertTriangle class="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Consumption Trend Chart -->
      <div class="card bg-white shadow-sm">
        <div class="card-body">
          <h3 class="card-title text-lg font-semibold mb-4">
            Consumption Trends
          </h3>
          <ConsumptionTrendChart
            :data="analyticsStore.consumptionTrendChartData"
            height="300px"
          />
        </div>
      </div>

      <!-- Category Breakdown Chart -->
      <div class="card bg-white shadow-sm">
        <div class="card-body">
          <h3 class="card-title text-lg font-semibold mb-4">
            Consumption by Category
          </h3>
          <CategoryBreakdownChart
            :data="analyticsStore.categoryBreakdownChartData"
            height="300px"
          />
        </div>
      </div>
    </div>

    <!-- Forecasting Section -->
    <div class="card bg-white shadow-sm mb-8">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <h3 class="card-title text-lg font-semibold">Forecasting Analysis</h3>
          <div class="flex items-center gap-4">
            <select
              v-model="selectedForecastItem"
              @change="loadForecastData"
              class="select select-bordered select-sm w-48"
            >
              <option value="">Select Item</option>
              <option
                v-for="item in analyticsStore.formattedMostUsedItems"
                :key="item.item_name"
                :value="item.item_name"
              >
                {{ item.item_name }}
              </option>
            </select>
            <select
              v-model="forecastPeriods"
              @change="handleForecastPeriodsChange"
              class="select select-bordered select-sm w-24"
            >
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>
          </div>
        </div>

        <div v-if="analyticsStore.forecastChartData" class="h-80">
          <ForecastChart
            :data="analyticsStore.forecastChartData"
            height="100%"
          />
        </div>
        <div v-else class="h-80 flex items-center justify-center text-gray-500">
          Select an item to view forecast
        </div>
      </div>
    </div>

    <!-- Most and Least Used Items -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Most Used Items -->
      <div class="card bg-white shadow-sm">
        <div class="card-body">
          <h3 class="card-title text-lg font-semibold mb-4">Most Used Items</h3>
          <div class="space-y-3">
            <div
              v-for="(item, index) in analyticsStore.formattedMostUsedItems"
              :key="item.item_name"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center"
                >
                  <span class="text-sm font-bold text-blue-600">{{
                    index + 1
                  }}</span>
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ item.item_name }}</p>
                  <p class="text-sm text-gray-600">{{ item.category_name }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-semibold text-gray-900">
                  {{ item.total_consumed }}
                </p>
                <p class="text-xs text-gray-500">{{ item.frequency }} times</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Least Used Items -->
      <div class="card bg-white shadow-sm">
        <div class="card-body">
          <h3 class="card-title text-lg font-semibold mb-4">
            Least Used Items
          </h3>
          <div class="space-y-3">
            <div
              v-for="(item, index) in analyticsStore.formattedLeastUsedItems"
              :key="item.item_name"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center"
                >
                  <span class="text-sm font-bold text-orange-600">{{
                    index + 1
                  }}</span>
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ item.item_name }}</p>
                  <p class="text-sm text-gray-600">{{ item.category_name }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-semibold text-gray-900">
                  {{ item.total_consumed }}
                </p>
                <p class="text-xs text-gray-500">{{ item.frequency }} times</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Low Stock Alerts and Reorder Recommendations -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Low Stock Alerts -->
      <div class="card bg-white shadow-sm">
        <div class="card-body">
          <h3 class="card-title text-lg font-semibold mb-4 text-red-600">
            <AlertTriangle class="w-5 h-5 inline mr-2" />
            Low Stock Alerts
          </h3>
          <div class="space-y-3">
            <div
              v-for="item in analyticsStore.lowStockItems"
              :key="item.item_type_id"
              class="p-3 border border-red-200 rounded-lg bg-red-50"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-gray-900">
                    {{ item.item_type_name }}
                  </p>
                  <p class="text-sm text-gray-600">{{ item.category_name }}</p>
                </div>
                <div class="text-right">
                  <p class="text-red-600 font-semibold">
                    {{ item.current_stock }} remaining
                  </p>
                  <p class="text-xs text-gray-500">
                    Min: {{ item.min_stock_level }}
                  </p>
                </div>
              </div>
            </div>
            <div
              v-if="analyticsStore.lowStockItems.length === 0"
              class="text-center text-gray-500 py-4"
            >
              No low stock alerts
            </div>
          </div>
        </div>
      </div>

      <!-- Reorder Recommendations -->
      <div class="card bg-white shadow-sm">
        <div class="card-body">
          <h3 class="card-title text-lg font-semibold mb-4 text-blue-600">
            <MessageSquare class="w-5 h-5 inline mr-2" />
            Reorder Recommendations
          </h3>
          <div class="space-y-3">
            <div
              v-for="item in analyticsStore.reorderRecommendations"
              :key="item.item_type_id"
              class="p-3 border border-blue-200 rounded-lg bg-blue-50"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-gray-900">
                    {{ item.item_type_name }}
                  </p>
                  <p class="text-sm text-gray-600">{{ item.category_name }}</p>
                </div>
                <div class="text-right">
                  <p class="text-blue-600 font-semibold">
                    Reorder: {{ item.recommended_quantity }}
                  </p>
                  <p class="text-xs text-gray-500">Based on usage trends</p>
                </div>
              </div>
            </div>
            <div
              v-if="analyticsStore.reorderRecommendations.length === 0"
              class="text-center text-gray-500 py-4"
            >
              No reorder recommendations
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="card bg-white shadow-sm">
      <div class="card-body">
        <h3 class="card-title text-lg font-semibold mb-4">
          <History class="w-5 h-5 inline mr-2" />
          Recent Transactions
        </h3>
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Item</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="transaction in analyticsStore.recentTransactions"
                :key="transaction.id"
              >
                <td>{{ transaction.item_name }}</td>
                <td>
                  <span
                    :class="
                      getTransactionTypeClass(transaction.transaction_type)
                    "
                  >
                    {{ transaction.transaction_type }}
                  </span>
                </td>
                <td>{{ transaction.quantity }}</td>
                <td>{{ formatDate(transaction.transaction_date) }}</td>
                <td>
                  <span class="badge badge-success badge-sm">Completed</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed } from 'vue';
  import {
    Package,
    TrendingDown,
    BarChart3,
    AlertTriangle,
    RefreshCcw,
    MessageSquare,
    History,
  } from 'lucide-vue-next';
  import { useAnalyticsStore } from '../../stores/analyticsStore';
  import ConsumptionTrendChart from '../../components/scm/ConsumptionTrendChart.vue';
  import ForecastChart from '../../components/scm/ForecastChart.vue';
  import CategoryBreakdownChart from '../../components/scm/CategoryBreakdownChart.vue';

  // Store
  const analyticsStore = useAnalyticsStore();

  // Local state
  const selectedTimeframe = ref(analyticsStore.selectedTimeframe);
  const selectedForecastItem = ref(analyticsStore.selectedForecastItem);
  const forecastPeriods = ref(analyticsStore.forecastPeriods);

  // Computed properties
  const loading = computed(() => analyticsStore.loading);
  const error = computed(() => analyticsStore.error);

  // Methods
  const loadDashboardData = async () => {
    await analyticsStore.setTimeframe(selectedTimeframe.value);
  };

  const loadForecastData = async () => {
    await analyticsStore.setForecastItem(selectedForecastItem.value);
  };

  const handleForecastPeriodsChange = async () => {
    await analyticsStore.setForecastPeriods(forecastPeriods.value);
  };

  const refreshAll = async () => {
    await analyticsStore.refreshAll();
  };

  const getTransactionTypeClass = (type) => {
    const classes = {
      consumption: 'badge badge-error badge-sm',
      receipt: 'badge badge-success badge-sm',
      adjustment: 'badge badge-warning badge-sm',
      return: 'badge badge-info badge-sm',
    };
    return classes[type] || 'badge badge-neutral badge-sm';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Lifecycle
  onMounted(() => {
    loadDashboardData();
  });
</script>

<style scoped></style>
