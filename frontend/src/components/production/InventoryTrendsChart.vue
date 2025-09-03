<template>
  <div class="bg-white p-6 rounded-lg shadow-sm border">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Inventory Trends</h3>
        <p class="text-sm text-gray-600">
          Stock levels and availability analysis
        </p>
      </div>
      <div class="flex items-center gap-2">
        <select
          v-model="timeRange"
          @change="fetchData"
          class="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primaryColor focus:border-transparent"
        >
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 6 months</option>
          <option value="365">Last year</option>
        </select>
        <button
          @click="fetchData"
          :disabled="loading"
          class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
        >
          <RefreshCcw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center h-64">
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-primaryColor"
      ></div>
    </div>

    <div
      v-else-if="inventoryData && inventoryData.trends.length > 0"
      class="space-y-4"
    >
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-blue-50 p-4 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-blue-600">Total Stock</p>
              <p class="text-2xl font-bold text-blue-800">{{ totalStock }}</p>
              <p class="text-xs text-blue-600 mt-1">units available</p>
            </div>
            <Package class="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div class="bg-yellow-50 p-4 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-yellow-600">Low Stock Items</p>
              <p class="text-2xl font-bold text-yellow-800">
                {{ lowStockCount }}
              </p>
              <p class="text-xs text-yellow-600 mt-1">need attention</p>
            </div>
            <AlertTriangle class="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div class="bg-red-50 p-4 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-red-600">Expiring Soon</p>
              <p class="text-2xl font-bold text-red-800">
                {{ expiringSoonCount }}
              </p>
              <p class="text-xs text-red-600 mt-1">within 30 days</p>
            </div>
            <Clock class="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-green-600">Stock Turnover</p>
              <p class="text-2xl font-bold text-green-800">
                {{ stockTurnover }}x
              </p>
              <p class="text-xs text-green-600 mt-1">per month</p>
            </div>
            <TrendingUp class="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Stock Level Trends -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-4">Stock Level Trends</h4>
          <div class="h-64">
            <Line :data="stockLevelData" :options="stockChartOptions" />
          </div>
        </div>

        <!-- Inventory Value Chart -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-4">
            Inventory Value Trend
          </h4>
          <div class="h-64">
            <Bar :data="inventoryValueData" :options="valueChartOptions" />
          </div>
        </div>
      </div>

      <!-- Category Analysis -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <h4 class="font-semibold text-gray-900 mb-4">Stock by Category</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            v-for="category in categoryAnalysis"
            :key="category.name"
            class="bg-white p-4 rounded-lg"
          >
            <div class="flex justify-between items-start mb-2">
              <h5 class="font-medium text-gray-900">{{ category.name }}</h5>
              <span class="text-sm font-bold text-gray-700"
                >{{ category.percentage }}%</span
              >
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                class="bg-blue-500 h-2 rounded-full"
                :style="{ width: `${category.percentage}%` }"
              ></div>
            </div>
            <div class="flex justify-between text-xs text-gray-600">
              <span>{{ category.items }} items</span>
              <span>{{ category.value }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Alerts Section -->
      <div
        v-if="alerts.length > 0"
        class="bg-red-50 p-4 rounded-lg border border-red-200"
      >
        <div class="flex items-center mb-3">
          <AlertTriangle class="w-5 h-5 text-red-500 mr-2" />
          <h4 class="font-semibold text-red-900">Inventory Alerts</h4>
        </div>
        <div class="space-y-2">
          <div
            v-for="alert in alerts"
            :key="alert.id"
            class="flex justify-between items-center bg-white p-3 rounded border border-red-200"
          >
            <div>
              <p class="font-medium text-gray-900">{{ alert.itemName }}</p>
              <p class="text-sm text-gray-600">{{ alert.message }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span
                :class="getAlertSeverityClass(alert.severity)"
                class="px-2 py-1 rounded-full text-xs font-medium"
              >
                {{ alert.severity }}
              </span>
              <span class="text-sm text-gray-500"
                >{{ alert.daysLeft }} days</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex items-center justify-center h-64 text-gray-500">
      <div class="text-center">
        <Package class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No inventory data available for the selected period</p>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { Line, Bar } from 'vue-chartjs';
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
    Filler,
  } from 'chart.js';
  import {
    RefreshCcw,
    Package,
    AlertTriangle,
    Clock,
    TrendingUp,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
  );

  const productionStore = useProductionStore();

  // Reactive data
  const loading = ref(false);
  const timeRange = ref(30);
  const inventoryData = ref(null);

  // Computed properties
  const stockLevelData = computed(() => {
    if (!inventoryData.value?.trends) return null;

    return {
      labels: inventoryData.value.trends.map((item) => item.date),
      datasets: [
        {
          label: 'Total Stock Level',
          data: inventoryData.value.trends.map((item) => item.totalStock),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Available Stock',
          data: inventoryData.value.trends.map((item) => item.availableStock),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Low Stock Items',
          data: inventoryData.value.trends.map((item) => item.lowStockCount),
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: false,
          tension: 0.4,
        },
      ],
    };
  });

  const stockChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Stock Level (units)',
        },
      },
    },
  }));

  const inventoryValueData = computed(() => {
    if (!inventoryData.value?.trends) return null;

    return {
      labels: inventoryData.value.trends.map((item) => item.date),
      datasets: [
        {
          label: 'Inventory Value (₱)',
          data: inventoryData.value.trends.map((item) => item.totalValue),
          backgroundColor: '#3B82F6',
          borderColor: '#3B82F6',
          borderWidth: 1,
        },
      ],
    };
  });

  const valueChartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Value (₱)',
        },
      },
    },
  }));

  const totalStock = computed(() => {
    return inventoryData.value?.currentStats?.totalStock || 0;
  });

  const lowStockCount = computed(() => {
    return inventoryData.value?.currentStats?.lowStockCount || 0;
  });

  const expiringSoonCount = computed(() => {
    return inventoryData.value?.currentStats?.expiringSoonCount || 0;
  });

  const stockTurnover = computed(() => {
    return inventoryData.value?.currentStats?.stockTurnover || 0;
  });

  const categoryAnalysis = computed(() => {
    return inventoryData.value?.categoryAnalysis || [];
  });

  const alerts = computed(() => {
    return inventoryData.value?.alerts || [];
  });

  // Methods
  const getAlertSeverityClass = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const fetchData = async () => {
    loading.value = true;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/menu/analytics/inventory-trends?days=${timeRange.value}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch inventory data');
      }

      const result = await response.json();
      if (result.success) {
        inventoryData.value = result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      inventoryData.value = null;
    } finally {
      loading.value = false;
    }
  };

  // Lifecycle
  onMounted(() => {
    fetchData();
  });
</script>
