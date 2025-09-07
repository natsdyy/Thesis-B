<template>
  <div class="bg-white p-6 rounded-lg shadow-sm border">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">
          Menu Item Approval Rates
        </h3>
        <p class="text-sm text-gray-600">Approval success rate over time</p>
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

    <div v-else-if="chartData && chartData.labels.length > 0" class="space-y-4">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-green-50 p-4 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-green-600">Approval Rate</p>
              <p class="text-2xl font-bold text-green-800">
                {{ overallApprovalRate }}%
              </p>
            </div>
            <CheckCircle class="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div class="bg-blue-50 p-4 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-blue-600">Total Items</p>
              <p class="text-2xl font-bold text-blue-800">{{ totalItems }}</p>
            </div>
            <Package class="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div class="bg-orange-50 p-4 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-orange-600">
                Avg. Processing Time
              </p>
              <p class="text-2xl font-bold text-orange-800">
                {{ avgProcessingTime }} days
              </p>
            </div>
            <Clock class="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      <!-- Chart -->
      <div class="h-80">
        <Line :data="chartData" :options="chartOptions" />
      </div>

      <!-- Detailed Breakdown -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <h4 class="font-semibold text-gray-900 mb-3">Category Breakdown</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="category in categoryBreakdownComputed"
            :key="category.category"
            class="flex justify-between items-center"
          >
            <span class="text-sm font-medium">{{ category.category }}</span>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600"
                >{{ category.approved }}/{{ category.total }}</span
              >
              <span
                :class="getApprovalRateColor(category.rate)"
                class="text-sm font-medium"
              >
                {{ category.rate }}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex items-center justify-center h-64 text-gray-500">
      <div class="text-center">
        <BarChart3 class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No approval data available for the selected period</p>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { Line } from 'vue-chartjs';
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
  } from 'chart.js';
  import {
    RefreshCcw,
    CheckCircle,
    Package,
    Clock,
    BarChart3,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  );

  const productionStore = useProductionStore();

  // Reactive data
  const loading = ref(false);
  const timeRange = ref(30);
  const approvalData = ref([]);
  const categoryBreakdown = ref([]);

  // Computed properties
  const chartData = computed(() => {
    if (!approvalData.value.length) return null;

    const labels = approvalData.value.map((item) => item.date);
    const approvalRates = approvalData.value.map((item) => item.approval_rate);
    const totalItems = approvalData.value.map((item) => item.total_items);

    return {
      labels,
      datasets: [
        {
          label: 'Approval Rate (%)',
          data: approvalRates,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Total Items',
          data: totalItems,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y1',
        },
      ],
    };
  });

  const chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            if (context.datasetIndex === 0) {
              return `Approval Rate: ${context.parsed.y}%`;
            }
            return `Total Items: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Approval Rate (%)',
        },
        min: 0,
        max: 100,
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Total Items',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  }));

  const overallApprovalRate = computed(() => {
    if (!approvalData.value.length) return 0;
    const totalApproved = approvalData.value.reduce(
      (sum, item) => sum + item.approved_items,
      0
    );
    const totalItems = approvalData.value.reduce(
      (sum, item) => sum + item.total_items,
      0
    );
    return totalItems > 0 ? Math.round((totalApproved / totalItems) * 100) : 0;
  });

  const totalItems = computed(() => {
    return approvalData.value.reduce((sum, item) => sum + item.total_items, 0);
  });

  const avgProcessingTime = computed(() => {
    if (!approvalData.value.length) return 0;
    const totalTime = approvalData.value.reduce(
      (sum, item) => sum + item.avg_processing_days,
      0
    );
    return Math.round(totalTime / approvalData.value.length);
  });

  const categoryBreakdownComputed = computed(() => {
    return categoryBreakdown.value.map((cat) => ({
      category: cat.category,
      approved: cat.approved,
      total: cat.total,
      rate: cat.rate,
    }));
  });

  // Methods
  const getApprovalRateColor = (rate) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const fetchData = async () => {
    loading.value = true;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/menu/analytics/menu-item-approvals?days=${timeRange.value}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch approval data');
      }

      const result = await response.json();
      if (result.success) {
        approvalData.value = result.data.trends;
        categoryBreakdown.value = result.data.categoryBreakdown;
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching approval data:', error);
      approvalData.value = [];
      categoryBreakdown.value = [];
    } finally {
      loading.value = false;
    }
  };

  // Lifecycle
  onMounted(() => {
    fetchData();
  });
</script>
