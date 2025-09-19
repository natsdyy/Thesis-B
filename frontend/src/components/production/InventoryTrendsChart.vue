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
        <div
          class="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200 shadow-sm"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-blue-700">Total Stock</p>
              <p class="text-3xl font-bold text-blue-900">{{ totalStock }}</p>
              <p class="text-xs text-blue-600 mt-2">units available</p>
            </div>
            <div class="p-3 bg-blue-100 rounded-lg">
              <Package class="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border border-yellow-200 shadow-sm"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-yellow-700">Low Stock Items</p>
              <p class="text-3xl font-bold text-yellow-900">
                {{ lowStockCount }}
              </p>
              <p class="text-xs text-yellow-600 mt-2">need attention</p>
            </div>
            <div class="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle class="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200 shadow-sm"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-red-700">Expiring Soon</p>
              <p class="text-3xl font-bold text-red-900">
                {{ expiringSoonCount }}
              </p>
              <p class="text-xs text-red-600 mt-2">within 30 days</p>
            </div>
            <div class="p-3 bg-red-100 rounded-lg">
              <Clock class="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200 shadow-sm"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-green-700">Stock Turnover</p>
              <p class="text-3xl font-bold text-green-900">
                {{ stockTurnover }}x
              </p>
              <p class="text-xs text-green-600 mt-2">per month</p>
            </div>
            <div class="p-3 bg-green-100 rounded-lg">
              <TrendingUp class="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Stock Level Trends -->
        <div class="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
          <h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp class="w-5 h-5" />
            Stock Level Trends
          </h4>
          <div class="h-64">
            <Line :data="stockLevelData" :options="stockChartOptions" />
          </div>
        </div>

        <!-- Inventory Value Chart -->
        <div class="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
          <h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package class="w-5 h-5" />
            Inventory Value Trend
          </h4>
          <div class="h-64">
            <Bar :data="inventoryValueData" :options="valueChartOptions" />
          </div>
        </div>
      </div>

      <!-- Category Analysis -->
      <div class="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
        <h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package class="w-5 h-5" />
          Stock by Category
        </h4>
        <div
          v-if="categoryAnalysis.length > 0"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div
            v-for="category in categoryAnalysis"
            :key="category.name"
            class="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
          >
            <div class="flex justify-between items-start mb-3">
              <h5 class="font-medium text-gray-900">{{ category.name }}</h5>
              <span class="text-sm font-bold text-blue-600"
                >{{ category.percentage }}%</span
              >
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3 mb-3">
              <div
                class="bg-blue-500 h-3 rounded-full transition-all duration-500"
                :style="{ width: `${category.percentage}%` }"
              ></div>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 font-medium">{{
                category.formattedItems
              }}</span>
              <span class="text-gray-900 font-semibold">{{
                category.formattedValue
              }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8">
          <div class="text-gray-400 mb-2">
            <Package class="w-12 h-12 mx-auto" />
          </div>
          <p class="text-gray-500 text-sm">No category data available</p>
        </div>
      </div>

      <!-- Alerts Section -->
      <div
        v-if="alerts.length > 0"
        class="bg-red-50 p-6 rounded-lg border border-red-200 shadow-sm"
      >
        <div class="flex items-center mb-4">
          <AlertTriangle class="w-5 h-5 text-red-500 mr-2" />
          <h4 class="font-semibold text-red-900">Inventory Alerts</h4>
        </div>
        <div class="space-y-3">
          <div
            v-for="alert in alerts"
            :key="alert.id"
            class="flex justify-between items-center bg-white p-4 rounded-lg border border-red-200 hover:shadow-sm transition-shadow"
          >
            <div class="flex-1">
              <p class="font-semibold text-gray-900 mb-1">
                {{ alert.itemName }}
              </p>
              <p class="text-sm text-gray-600">{{ alert.formattedMessage }}</p>
            </div>
            <div class="flex items-center gap-3 ml-4">
              <div class="text-right">
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-semibold',
                    alert.urgencyLevel.level === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : alert.urgencyLevel.level === 'urgent'
                        ? 'bg-orange-100 text-orange-800'
                        : alert.urgencyLevel.level === 'warning'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800',
                  ]"
                >
                  {{ alert.urgencyLevel.text }}
                </span>
                <p class="text-xs text-gray-500 mt-1">
                  {{
                    alert.urgencyLevel.level === 'critical'
                      ? 'Immediate action needed'
                      : alert.urgencyLevel.level === 'urgent'
                        ? 'Order soon'
                        : alert.urgencyLevel.level === 'warning'
                          ? 'Monitor closely'
                          : 'In good standing'
                  }}
                </p>
              </div>
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
      tooltip: {
        callbacks: {
          title: function (context) {
            const date = new Date(context[0].label);
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          callback: function (value, index, values) {
            const date = new Date(this.getLabelForValue(value));
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
          },
        },
      },
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
      tooltip: {
        callbacks: {
          title: function (context) {
            const date = new Date(context[0].label);
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
          },
          label: function (context) {
            return `Value: ₱${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          callback: function (value, index, values) {
            const date = new Date(this.getLabelForValue(value));
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
          },
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Value (₱)',
        },
        ticks: {
          callback: function (value) {
            return `₱${value.toLocaleString()}`;
          },
        },
      },
    },
  }));

  // Enhanced computed properties for better readability
  const formattedInventoryData = computed(() => {
    if (!inventoryData.value) return null;

    const data = inventoryData.value;

    return {
      // Summary stats with better formatting
      totalStock: data.currentStats?.totalStock || 0,
      lowStockCount: data.currentStats?.lowStockCount || 0,
      expiringSoonCount: data.currentStats?.expiringSoonCount || 0,
      stockTurnover: data.currentStats?.stockTurnover || 0,

      // Enhanced category analysis
      categoryAnalysis: (data.categoryAnalysis || []).map((category) => ({
        ...category,
        formattedValue: formatCurrency(category.value || 0),
        formattedItems: `${category.items || 0} ${(category.items || 0) === 1 ? 'item' : 'items'}`,
      })),

      // Enhanced alerts with better formatting
      alerts: (data.alerts || []).map((alert) => ({
        ...alert,
        formattedMessage: formatAlertMessage(alert),
        urgencyLevel: getUrgencyLevel(alert.daysLeft || 0),
      })),
    };
  });

  // Helper functions for formatting
  const formatCurrency = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '₱0';
    if (num >= 1000000) return `₱${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `₱${(num / 1000).toFixed(1)}k`;
    return `₱${Math.round(num)}`;
  };

  const formatAlertMessage = (alert) => {
    const stock = alert.currentStock || 0;
    const threshold = alert.reorderPoint || 0;
    return `${alert.itemName} - ${stock} units remaining (reorder at ${threshold})`;
  };

  const getUrgencyLevel = (daysLeft) => {
    if (daysLeft <= 0)
      return { level: 'critical', text: 'Immediate', color: 'text-red-600' };
    if (daysLeft <= 7)
      return {
        level: 'urgent',
        text: `${daysLeft} days`,
        color: 'text-orange-600',
      };
    if (daysLeft <= 30)
      return {
        level: 'warning',
        text: `${daysLeft} days`,
        color: 'text-yellow-600',
      };
    return { level: 'info', text: `${daysLeft} days`, color: 'text-blue-600' };
  };

  // Legacy computed properties for backward compatibility
  const totalStock = computed(() => {
    return formattedInventoryData.value?.totalStock || 0;
  });

  const lowStockCount = computed(() => {
    return formattedInventoryData.value?.lowStockCount || 0;
  });

  const expiringSoonCount = computed(() => {
    return formattedInventoryData.value?.expiringSoonCount || 0;
  });

  const stockTurnover = computed(() => {
    return formattedInventoryData.value?.stockTurnover || 0;
  });

  const categoryAnalysis = computed(() => {
    return formattedInventoryData.value?.categoryAnalysis || [];
  });

  const alerts = computed(() => {
    return formattedInventoryData.value?.alerts || [];
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
        `/api/menu/analytics/inventory-trends?days=${timeRange.value}`,
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
