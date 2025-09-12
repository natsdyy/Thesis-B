<template>
  <div class="bg-white p-6 rounded-lg shadow-sm border">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">
          Production Metrics Dashboard
        </h3>
        <p class="text-sm text-gray-600">
          Key performance indicators and efficiency metrics
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

    <div v-else-if="metricsData" class="space-y-6">
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          class="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200 shadow-sm"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-blue-700">Total Production</p>
              <p class="text-3xl font-bold text-blue-900">
                {{ formattedMetricsData?.totalProduction || '0kg' }}
              </p>
              <p class="text-xs text-blue-600 mt-2 flex items-center">
                <TrendingUp class="w-3 h-3 inline mr-1" />
                +{{ formattedMetricsData?.productionGrowth || 0 }}% vs last
                period
              </p>
            </div>
            <div class="p-3 bg-blue-100 rounded-lg">
              <Package class="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200 shadow-sm"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-green-700">Quality Score</p>
              <p class="text-3xl font-bold text-green-900">
                {{ formattedMetricsData?.qualityScore || '0.0' }}/5.0
              </p>
              <p class="text-xs text-green-600 mt-2 flex items-center">
                <TrendingUp class="w-3 h-3 inline mr-1" />
                +{{ formattedMetricsData?.qualityGrowth || 0 }}% vs last period
              </p>
            </div>
            <div class="p-3 bg-green-100 rounded-lg">
              <CheckCircle class="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200 shadow-sm"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-purple-700">Efficiency Rate</p>
              <p class="text-3xl font-bold text-purple-900">
                {{ formattedMetricsData?.efficiencyRate || 0 }}%
              </p>
              <p class="text-xs text-purple-600 mt-2 flex items-center">
                <TrendingUp class="w-3 h-3 inline mr-1" />
                +{{ formattedMetricsData?.efficiencyGrowth || 0 }}% vs last
                period
              </p>
            </div>
            <div class="p-3 bg-purple-100 rounded-lg">
              <Target class="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div
          class="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200 shadow-sm"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-orange-700">Cost Efficiency</p>
              <p class="text-3xl font-bold text-orange-900">
                ₱{{ formattedMetricsData?.costEfficiency || '0' }}
              </p>
              <p class="text-xs text-orange-600 mt-2 flex items-center">
                <ArrowDown class="w-3 h-3 inline mr-1" />
                -{{ formattedMetricsData?.costReduction || 0 }}% vs last period
              </p>
            </div>
            <div class="p-3 bg-orange-100 rounded-lg">
              <PhilippinePeso class="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Production Volume Chart -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-4">
            Production Volume Trend
          </h4>
          <div class="h-64">
            <Line :data="productionVolumeData" :options="volumeChartOptions" />
          </div>
        </div>

        <!-- Quality Metrics Chart -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-gray-900 mb-4">
            Quality Metrics Trend
          </h4>
          <div class="h-64">
            <Line :data="qualityMetricsData" :options="qualityChartOptions" />
          </div>
        </div>
      </div>

      <!-- Detailed Metrics -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Resource Utilization -->
        <div class="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
          <h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target class="w-5 h-5" />
            Resource Utilization
          </h4>
          <div class="space-y-5">
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700"
                  >Equipment Usage</span
                >
                <span class="text-sm font-bold text-blue-600">
                  {{ formattedMetricsData?.equipmentUsage || 0 }}%
                </span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-3">
                <div
                  class="bg-blue-500 h-3 rounded-full transition-all duration-500"
                  :style="{
                    width: `${formattedMetricsData?.equipmentUsage || 0}%`,
                  }"
                ></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700"
                  >Labor Efficiency</span
                >
                <span class="text-sm font-bold text-green-600">
                  {{ formattedMetricsData?.laborEfficiency || 0 }}%
                </span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-3">
                <div
                  class="bg-green-500 h-3 rounded-full transition-all duration-500"
                  :style="{
                    width: `${Math.min(formattedMetricsData?.laborEfficiency || 0, 100)}%`,
                  }"
                ></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700"
                  >Material Yield</span
                >
                <span class="text-sm font-bold text-purple-600">
                  {{ formattedMetricsData?.materialYield || 0 }}%
                </span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-3">
                <div
                  class="bg-purple-500 h-3 rounded-full transition-all duration-500"
                  :style="{
                    width: `${formattedMetricsData?.materialYield || 0}%`,
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quality Breakdown -->
        <div class="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
          <h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle class="w-5 h-5" />
            Quality Breakdown
          </h4>
          <div class="space-y-4">
            <div
              class="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100"
            >
              <span class="text-sm font-medium text-gray-700">Taste Score</span>
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-green-600">
                  {{ formattedMetricsData?.qualityBreakdown.taste || '0.0' }}/5
                </span>
                <div class="w-12 bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-green-500 h-2 rounded-full transition-all duration-500"
                    :style="{
                      width: `${(parseFloat(formattedMetricsData?.qualityBreakdown.taste || 0) / 5) * 100}%`,
                    }"
                  ></div>
                </div>
              </div>
            </div>
            <div
              class="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100"
            >
              <span class="text-sm font-medium text-gray-700"
                >Appearance Score</span
              >
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-blue-600">
                  {{
                    formattedMetricsData?.qualityBreakdown.appearance || '0.0'
                  }}/5
                </span>
                <div class="w-12 bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    :style="{
                      width: `${(parseFloat(formattedMetricsData?.qualityBreakdown.appearance || 0) / 5) * 100}%`,
                    }"
                  ></div>
                </div>
              </div>
            </div>
            <div
              class="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100"
            >
              <span class="text-sm font-medium text-gray-700"
                >Texture Score</span
              >
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-purple-600">
                  {{
                    formattedMetricsData?.qualityBreakdown.texture || '0.0'
                  }}/5
                </span>
                <div class="w-12 bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-purple-500 h-2 rounded-full transition-all duration-500"
                    :style="{
                      width: `${(parseFloat(formattedMetricsData?.qualityBreakdown.texture || 0) / 5) * 100}%`,
                    }"
                  ></div>
                </div>
              </div>
            </div>
            <div
              class="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100"
            >
              <span class="text-sm font-medium text-gray-700"
                >Overall Score</span
              >
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-orange-600">
                  {{
                    formattedMetricsData?.qualityBreakdown.overall || '0.0'
                  }}/5
                </span>
                <div class="w-12 bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-orange-500 h-2 rounded-full transition-all duration-500"
                    :style="{
                      width: `${(parseFloat(formattedMetricsData?.qualityBreakdown.overall || 0) / 5) * 100}%`,
                    }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Cost Analysis -->
        <div class="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
          <h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PhilippinePeso class="w-5 h-5" />
            Cost Analysis
          </h4>
          <div class="space-y-4">
            <div
              class="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100"
            >
              <span class="text-sm font-medium text-gray-700"
                >Avg. Cost per kg</span
              >
              <span class="text-sm font-bold text-orange-600">
                ₱{{ formattedMetricsData?.costAnalysis.avgCostPerKg || '0' }}
              </span>
            </div>
            <div
              class="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100"
            >
              <span class="text-sm font-medium text-gray-700"
                >Material Cost</span
              >
              <span class="text-sm font-bold text-blue-600">
                ₱{{ formattedMetricsData?.costAnalysis.materialCost || '0' }}
              </span>
            </div>
            <div
              class="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100"
            >
              <span class="text-sm font-medium text-gray-700">Labor Cost</span>
              <span class="text-sm font-bold text-green-600">
                ₱{{ formattedMetricsData?.costAnalysis.laborCost || '0' }}
              </span>
            </div>
            <div
              class="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100"
            >
              <span class="text-sm font-medium text-gray-700"
                >Overhead Cost</span
              >
              <span class="text-sm font-bold text-purple-600">
                ₱{{ formattedMetricsData?.costAnalysis.overheadCost || '0' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex items-center justify-center h-64 text-gray-500">
      <div class="text-center">
        <BarChart3 class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No production metrics available for the selected period</p>
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
    Package,
    CheckCircle,
    Target,
    DollarSign,
    TrendingUp,
    ArrowDown,
    BarChart3,
    PhilippinePeso,
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
  const metricsData = ref(null);

  // Computed properties
  const productionVolumeData = computed(() => {
    if (!metricsData.value?.productionTrend) return null;

    return {
      labels: metricsData.value.productionTrend.map((item) => item.date),
      datasets: [
        {
          label: 'Production Volume (kg)',
          data: metricsData.value.productionTrend.map((item) => item.volume),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Target Volume (kg)',
          data: metricsData.value.productionTrend.map((item) => item.target),
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: false,
          tension: 0.4,
          borderDash: [5, 5],
        },
      ],
    };
  });

  const volumeChartOptions = computed(() => ({
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
          text: 'Volume (kg)',
        },
      },
    },
  }));

  // Enhanced computed properties for better readability
  const formattedMetricsData = computed(() => {
    if (!metricsData.value) return null;

    const data = metricsData.value;

    return {
      // KPI Cards with better formatting
      totalProduction: data.totalProduction
        ? `${data.totalProduction}kg`
        : '0kg',
      productionGrowth: data.productionGrowth || 0,

      qualityScore: data.qualityScore
        ? parseFloat(data.qualityScore).toFixed(1)
        : '0.0',
      qualityGrowth: data.qualityGrowth || 0,

      efficiencyRate: data.efficiencyRate || 0,
      efficiencyGrowth: data.efficiencyGrowth || 0,

      costEfficiency: data.costEfficiency
        ? formatCurrency(data.costEfficiency)
        : '0',
      costReduction: data.costReduction || 0,

      // Resource Utilization with better handling
      equipmentUsage: Math.min(data.equipmentUsage || 0, 100),
      laborEfficiency: Math.min(data.laborEfficiency || 0, 100),
      materialYield: Math.min(data.materialYield || 0, 100),

      // Quality Breakdown with proper formatting
      qualityBreakdown: {
        taste: data.qualityBreakdown?.taste
          ? parseFloat(data.qualityBreakdown.taste).toFixed(1)
          : '0.0',
        appearance: data.qualityBreakdown?.appearance
          ? parseFloat(data.qualityBreakdown.appearance).toFixed(1)
          : '0.0',
        texture: data.qualityBreakdown?.texture
          ? parseFloat(data.qualityBreakdown.texture).toFixed(1)
          : '0.0',
        overall: data.qualityBreakdown?.overall
          ? parseFloat(data.qualityBreakdown.overall).toFixed(1)
          : '0.0',
      },

      // Cost Analysis with proper formatting
      costAnalysis: {
        avgCostPerKg: data.costAnalysis?.avgCostPerKg
          ? formatCurrency(data.costAnalysis.avgCostPerKg)
          : '0',
        materialCost: data.costAnalysis?.materialCost
          ? formatCurrency(data.costAnalysis.materialCost)
          : '0',
        laborCost: data.costAnalysis?.laborCost
          ? formatCurrency(data.costAnalysis.laborCost)
          : '0',
        overheadCost: data.costAnalysis?.overheadCost
          ? formatCurrency(data.costAnalysis.overheadCost)
          : '0',
      },
    };
  });

  // Helper function for currency formatting
  const formatCurrency = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return Math.round(num).toString();
  };

  const qualityMetricsData = computed(() => {
    if (!metricsData.value?.qualityTrend) return null;

    return {
      labels: metricsData.value.qualityTrend.map((item) => item.date),
      datasets: [
        {
          label: 'Overall Quality Score',
          data: metricsData.value.qualityTrend.map((item) => item.score),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Taste Score',
          data: metricsData.value.qualityTrend.map((item) => item.taste),
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: false,
          tension: 0.4,
        },
        {
          label: 'Appearance Score',
          data: metricsData.value.qualityTrend.map((item) => item.appearance),
          borderColor: '#8B5CF6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          fill: false,
          tension: 0.4,
        },
      ],
    };
  });

  const qualityChartOptions = computed(() => ({
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
        min: 0,
        max: 5,
        title: {
          display: true,
          text: 'Score (out of 5)',
        },
      },
    },
  }));

  // Methods
  const fetchData = async () => {
    loading.value = true;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/menu/analytics/production-metrics?days=${timeRange.value}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch metrics data');
      }

      const result = await response.json();
      if (result.success) {
        metricsData.value = result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching metrics data:', error);
      metricsData.value = null;
    } finally {
      loading.value = false;
    }
  };

  // Lifecycle
  onMounted(() => {
    fetchData();
  });
</script>
