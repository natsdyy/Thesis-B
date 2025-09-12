<template>
  <div class="bg-white p-6 rounded-lg shadow-sm border">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">
          Sample Production Trends
        </h3>
        <p class="text-sm text-gray-600">Production volume and success rates</p>
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
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-blue-700">Total Samples</p>
              <p class="text-2xl font-bold text-blue-900">
                {{ formattedTotalSamples }}
              </p>
              <p class="text-xs text-blue-600 mt-1">Across all periods</p>
            </div>
            <div class="p-2 bg-blue-100 rounded-lg">
              <FlaskConical class="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div class="bg-green-50 p-4 rounded-lg border border-green-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-green-700">Success Rate</p>
              <p class="text-2xl font-bold text-green-900">
                {{ successRate }}%
              </p>
              <p class="text-xs text-green-600 mt-1">
                {{
                  sampleData.reduce(
                    (sum, item) => sum + (item.successful_samples || 0),
                    0
                  )
                }}
                successful
              </p>
            </div>
            <div class="p-2 bg-green-100 rounded-lg">
              <CheckCircle class="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div class="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-orange-700">
                Avg. Production Time
              </p>
              <p class="text-2xl font-bold text-orange-900">
                {{ formattedAvgProductionTime }}
              </p>
              <p class="text-xs text-orange-600 mt-1">Per batch</p>
            </div>
            <div class="p-2 bg-orange-100 rounded-lg">
              <Clock class="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div class="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-purple-700">Total Yield</p>
              <p class="text-2xl font-bold text-purple-900">
                {{ formattedTotalYield }}
              </p>
              <p class="text-xs text-purple-600 mt-1">Total production</p>
            </div>
            <div class="p-2 bg-purple-100 rounded-lg">
              <Package class="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- Chart -->
      <div class="h-80">
        <Line :data="chartData" :options="chartOptions" />
      </div>

      <!-- Status Breakdown -->
      <div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity class="w-5 h-5" />
          Production Status Breakdown
        </h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            class="text-center p-3 bg-white rounded-lg border border-blue-200"
          >
            <div class="text-2xl font-bold text-blue-600">
              {{ statusBreakdown.planned }}
            </div>
            <div class="text-sm text-gray-600 font-medium">Planned</div>
            <div class="text-xs text-gray-500 mt-1">Ready to start</div>
          </div>
          <div
            class="text-center p-3 bg-white rounded-lg border border-yellow-200"
          >
            <div class="text-2xl font-bold text-yellow-600">
              {{ statusBreakdown.inProgress }}
            </div>
            <div class="text-sm text-gray-600 font-medium">In Progress</div>
            <div class="text-xs text-gray-500 mt-1">Currently active</div>
          </div>
          <div
            class="text-center p-3 bg-white rounded-lg border border-green-200"
          >
            <div class="text-2xl font-bold text-green-600">
              {{ statusBreakdown.completed }}
            </div>
            <div class="text-sm text-gray-600 font-medium">Completed</div>
            <div class="text-xs text-gray-500 mt-1">Successfully finished</div>
          </div>
          <div
            class="text-center p-3 bg-white rounded-lg border border-red-200"
          >
            <div class="text-2xl font-bold text-red-600">
              {{ statusBreakdown.failed }}
            </div>
            <div class="text-sm text-gray-600 font-medium">Failed</div>
            <div class="text-xs text-gray-500 mt-1">Needs attention</div>
          </div>
        </div>
      </div>

      <!-- Top Performing Items -->
      <div class="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp class="w-5 h-5" />
          Top Performing Menu Items
        </h4>
        <div
          v-if="topPerformingItems && topPerformingItems.length > 0"
          class="space-y-3"
        >
          <div
            v-for="(item, index) in topPerformingItems.slice(0, 5)"
            :key="item.name"
            class="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-6 h-6 bg-primaryColor/10 text-primaryColor rounded-full flex items-center justify-center text-xs font-bold"
              >
                {{ index + 1 }}
              </div>
              <span class="text-sm font-medium text-gray-900">{{
                item.name
              }}</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right">
                <div class="text-sm font-semibold text-gray-900">
                  {{ item.successRate }}% success
                </div>
                <div class="text-xs text-gray-500">
                  {{ item.totalSamples || 0 }} samples
                </div>
              </div>
              <div class="w-20 bg-gray-200 rounded-full h-2">
                <div
                  class="h-2 rounded-full transition-all duration-300"
                  :class="
                    item.successRate >= 80
                      ? 'bg-green-500'
                      : item.successRate >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  "
                  :style="{ width: `${Math.min(item.successRate, 100)}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-8">
          <div class="text-gray-400 mb-2">
            <Package class="w-12 h-12 mx-auto" />
          </div>
          <p class="text-gray-500 text-sm">No performance data available</p>
          <p class="text-gray-400 text-xs mt-1">
            Start producing samples to see performance metrics
          </p>
        </div>
      </div>
    </div>

    <div v-else class="flex items-center justify-center h-64 text-gray-500">
      <div class="text-center">
        <FlaskConical class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No sample production data available for the selected period</p>
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
    FlaskConical,
    CheckCircle,
    Clock,
    Package,
    TrendingUp,
    Activity,
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
  const sampleData = ref([]);
  const topPerformingItems = ref([]);

  // Computed properties
  const chartData = computed(() => {
    if (!sampleData.value.length) return null;

    const labels = sampleData.value.map((item) => item.date);
    const totalSamples = sampleData.value.map((item) => item.total_samples);
    const successfulSamples = sampleData.value.map(
      (item) => item.successful_samples
    );
    const avgYield = sampleData.value.map((item) => item.average_yield);

    return {
      labels,
      datasets: [
        {
          label: 'Total Samples',
          data: totalSamples,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Successful Samples',
          data: successfulSamples,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Avg. Yield (kg)',
          data: avgYield,
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: false,
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
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (context.datasetIndex === 2) {
              return `${label}: ${value}kg`;
            }
            return `${label}: ${value}`;
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
          text: 'Number of Samples',
        },
        min: 0,
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Yield (kg)',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  }));

  const totalSamples = computed(() => {
    return sampleData.value.reduce((sum, item) => sum + item.total_samples, 0);
  });

  const successRate = computed(() => {
    if (!sampleData.value.length) return 0;
    const totalSuccessful = sampleData.value.reduce(
      (sum, item) => sum + (item.successful_samples || 0),
      0
    );
    const totalSamples = sampleData.value.reduce(
      (sum, item) => sum + (item.total_samples || 0),
      0
    );
    return totalSamples > 0
      ? Math.round((totalSuccessful / totalSamples) * 100)
      : 0;
  });

  const avgProductionTime = computed(() => {
    if (!sampleData.value.length) return 0;
    const validItems = sampleData.value.filter(
      (item) => item.avg_production_time && item.avg_production_time > 0
    );
    if (validItems.length === 0) return 0;

    const totalTime = validItems.reduce(
      (sum, item) => sum + parseFloat(item.avg_production_time),
      0
    );
    return Math.round(totalTime / validItems.length);
  });

  const totalYield = computed(() => {
    return sampleData.value.reduce(
      (sum, item) =>
        sum +
        parseFloat(item.average_yield || 0) *
          parseFloat(item.total_samples || 0),
      0
    );
  });

  // Enhanced computed properties for better readability
  const formattedAvgProductionTime = computed(() => {
    const time = avgProductionTime.value;
    if (time === 0) return 'No data';
    if (time < 1) return `${Math.round(time * 60)}m`;
    if (time < 24) return `${time}h`;
    return `${Math.round(time / 24)}d`;
  });

  const formattedTotalYield = computed(() => {
    const totalYieldValue = totalYield.value;
    if (totalYieldValue === 0) return '0kg';
    if (totalYieldValue < 1) return `${Math.round(totalYieldValue * 1000)}g`;
    if (totalYieldValue < 1000) return `${totalYieldValue.toFixed(1)}kg`;
    return `${(totalYieldValue / 1000).toFixed(1)}t`;
  });

  const formattedTotalSamples = computed(() => {
    const samples = totalSamples.value;
    if (samples === 0) return '0';
    if (samples < 1000) return samples.toString();
    if (samples < 1000000) return `${(samples / 1000).toFixed(1)}k`;
    return `${(samples / 1000000).toFixed(1)}M`;
  });

  const statusBreakdown = computed(() => {
    const current = sampleData.value[sampleData.value.length - 1] || {
      planned: 0,
      in_progress: 0,
      completed: 0,
      failed: 0,
    };

    return {
      planned: current.planned || 0,
      inProgress: current.in_progress || 0,
      completed: current.completed || 0,
      failed: current.failed || 0,
    };
  });

  // Methods
  const fetchData = async () => {
    loading.value = true;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/menu/analytics/sample-production-trends?days=${timeRange.value}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch sample data');
      }

      const result = await response.json();
      if (result.success) {
        sampleData.value = result.data.trends;
        topPerformingItems.value = result.data.topPerformingItems;
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching sample data:', error);
      sampleData.value = [];
      topPerformingItems.value = [];
    } finally {
      loading.value = false;
    }
  };

  // Lifecycle
  onMounted(() => {
    fetchData();
  });
</script>
