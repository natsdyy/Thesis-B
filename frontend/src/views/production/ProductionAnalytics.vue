<script setup>
  import { ref, computed, onMounted } from 'vue';
  import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Clock,
    Package,
    Target,
    Activity,
    RefreshCcw,
    Download,
    Calendar,
    Filter,
    Eye,
    AlertTriangle,
    CheckCircle,
    PieChart,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';

  const productionStore = useProductionStore();

  // Reactive state
  const activeTab = ref('overview');
  const timeRange = ref('this_month');
  const metricType = ref('all');
  const showExportModal = ref(false);
  const selectedMetric = ref(null);

  // Form data
  const exportForm = ref({
    format: 'pdf',
    date_from: '',
    date_to: '',
    include_charts: true,
    include_details: true,
  });

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const productionOrders = computed(() => productionStore.productionOrders);
  const dashboardStats = computed(() => productionStore.dashboardStats);
  const productionMetrics = computed(() => productionStore.productionMetrics);
  const productionWaste = computed(() => productionStore.productionWaste);

  // Computed analytics
  const performanceMetrics = computed(() => {
    const orders = productionOrders.value;
    const completedOrders = orders.filter((o) => o.status === 'Completed');

    const totalPlanned = orders.reduce(
      (sum, o) => sum + (o.quantity_planned || 0),
      0
    );
    const totalProduced = orders.reduce(
      (sum, o) => sum + (o.quantity_produced || 0),
      0
    );
    const totalCost = orders.reduce((sum, o) => sum + (o.actual_cost || 0), 0);
    const avgCostPerUnit = totalProduced > 0 ? totalCost / totalProduced : 0;

    // Efficiency metrics
    const efficiency =
      totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0;

    // On-time delivery
    const onTimeOrders = completedOrders.filter((order) => {
      if (!order.actual_end_date || !order.planned_end_date) return false;
      return (
        new Date(order.actual_end_date) <= new Date(order.planned_end_date)
      );
    });
    const onTimeRate =
      completedOrders.length > 0
        ? (onTimeOrders.length / completedOrders.length) * 100
        : 0;

    // Quality metrics (placeholder)
    const qualityRate = 95; // TODO: Calculate from actual quality data

    return {
      efficiency: Math.round(efficiency),
      onTimeRate: Math.round(onTimeRate),
      qualityRate,
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      totalProduced,
      totalCost,
      avgCostPerUnit,
    };
  });

  const productionTrends = computed(() => {
    // Group orders by date
    const trends = {};
    productionOrders.value.forEach((order) => {
      const date = order.planned_start_date;
      if (!trends[date]) {
        trends[date] = {
          date,
          orders: 0,
          planned: 0,
          produced: 0,
          cost: 0,
        };
      }
      trends[date].orders++;
      trends[date].planned += order.quantity_planned || 0;
      trends[date].produced += order.quantity_produced || 0;
      trends[date].cost += order.actual_cost || 0;
    });

    return Object.values(trends).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  });

  const wasteAnalytics = computed(() => {
    const waste = productionWaste.value;
    const totalWasteCost = waste.reduce(
      (sum, w) => sum + parseFloat(w.estimated_cost || 0),
      0
    );
    const totalWasteQuantity = waste.reduce(
      (sum, w) => sum + parseFloat(w.quantity_wasted || 0),
      0
    );
    const preventableWaste = waste.filter((w) => w.is_preventable);
    const preventableCost = preventableWaste.reduce(
      (sum, w) => sum + parseFloat(w.estimated_cost || 0),
      0
    );

    const wasteByType = {};
    waste.forEach((w) => {
      if (!wasteByType[w.waste_type]) {
        wasteByType[w.waste_type] = { count: 0, cost: 0, quantity: 0 };
      }
      wasteByType[w.waste_type].count++;
      wasteByType[w.waste_type].cost += parseFloat(w.estimated_cost || 0);
      wasteByType[w.waste_type].quantity += parseFloat(w.quantity_wasted || 0);
    });

    return {
      totalWasteCost,
      totalWasteQuantity,
      preventableCost,
      preventableRate:
        waste.length > 0 ? (preventableWaste.length / waste.length) * 100 : 0,
      wasteByType,
    };
  });

  const kpiMetrics = computed(() => {
    const pm = performanceMetrics.value;
    const wa = wasteAnalytics.value;

    return [
      {
        name: 'Production Efficiency',
        value: pm.efficiency,
        unit: '%',
        trend: 'up',
        target: 85,
        status:
          pm.efficiency >= 85
            ? 'good'
            : pm.efficiency >= 70
              ? 'warning'
              : 'poor',
      },
      {
        name: 'On-Time Delivery',
        value: pm.onTimeRate,
        unit: '%',
        trend: 'up',
        target: 90,
        status:
          pm.onTimeRate >= 90
            ? 'good'
            : pm.onTimeRate >= 75
              ? 'warning'
              : 'poor',
      },
      {
        name: 'Quality Pass Rate',
        value: pm.qualityRate,
        unit: '%',
        trend: 'stable',
        target: 95,
        status:
          pm.qualityRate >= 95
            ? 'good'
            : pm.qualityRate >= 85
              ? 'warning'
              : 'poor',
      },
      {
        name: 'Waste Reduction',
        value: 100 - wa.preventableRate,
        unit: '%',
        trend: 'up',
        target: 80,
        status:
          wa.preventableRate <= 20
            ? 'good'
            : wa.preventableRate <= 35
              ? 'warning'
              : 'poor',
      },
    ];
  });

  // Methods
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getKpiStatusClass = (status) => {
    switch (status) {
      case 'good':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'poor':
        return 'text-error';
      default:
        return 'text-base-content/70';
    }
  };

  const getKpiStatusIcon = (status) => {
    switch (status) {
      case 'good':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'poor':
        return AlertTriangle;
      default:
        return Activity;
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return Activity;
    }
  };

  const openExportModal = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    exportForm.value.date_from = firstDayOfMonth.toISOString().split('T')[0];
    exportForm.value.date_to = today.toISOString().split('T')[0];
    showExportModal.value = true;
  };

  const closeExportModal = () => {
    showExportModal.value = false;
  };

  const exportReport = async () => {
    try {
      // TODO: Implement report export
      closeExportModal();
      showToast('Report exported successfully!', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to export report', 'error');
    }
  };

  const refreshData = async () => {
    try {
      await Promise.all([
        productionStore.fetchProductionOrders(),
        productionStore.fetchProductionWaste(),
        productionStore.fetchProductionMetrics(),
        productionStore.fetchDashboardStats(),
      ]);
    } catch (error) {
      console.error('Error refreshing analytics data:', error);
    }
  };

  const showToast = (message, type) => {
    // TODO: Implement toast notification
    console.log(`${type}: ${message}`);
  };

  // Lifecycle
  onMounted(async () => {
    await refreshData();
  });
</script>

<template>
  <div class="p-6 space-y-6 bg-base-100 min-h-screen">
    <!-- Header -->
    <div
      class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
    >
      <div>
        <h1
          class="text-3xl font-bold text-primaryColor flex items-center gap-3"
        >
          <BarChart3 class="w-8 h-8" />
          Production Analytics
        </h1>
        <p class="text-base-content/70 mt-1">
          Analyze production performance and identify improvement opportunities
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="form-control">
          <select v-model="timeRange" class="select select-bordered select-sm">
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
          </select>
        </div>
        <button
          @click="refreshData"
          class="btn btn-ghost btn-sm"
          :disabled="loading"
        >
          <RefreshCcw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
        <button @click="openExportModal" class="btn btn-outline btn-sm">
          <Download class="w-4 h-4" />
          Export Report
        </button>
      </div>
    </div>

    <!-- KPI Dashboard -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div
        v-for="kpi in kpiMetrics"
        :key="kpi.name"
        class="bg-accentColor rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <p class="text-sm font-medium text-base-content/70">
              {{ kpi.name }}
            </p>
            <div class="flex items-center gap-2">
              <p class="text-3xl font-bold text-primaryColor">
                {{ kpi.value }}
              </p>
              <span class="text-lg text-base-content/60">{{ kpi.unit }}</span>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1">
            <component
              :is="getKpiStatusIcon(kpi.status)"
              class="w-6 h-6"
              :class="getKpiStatusClass(kpi.status)"
            />
            <component
              :is="getTrendIcon(kpi.trend)"
              class="w-4 h-4 text-base-content/50"
            />
          </div>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-xs text-base-content/60"
            >Target: {{ kpi.target }}{{ kpi.unit }}</span
          >
          <div class="flex items-center gap-1">
            <div
              class="w-2 h-2 rounded-full"
              :class="{
                'bg-success': kpi.status === 'good',
                'bg-warning': kpi.status === 'warning',
                'bg-error': kpi.status === 'poor',
              }"
            ></div>
            <span class="text-xs" :class="getKpiStatusClass(kpi.status)">
              {{
                kpi.status === 'good'
                  ? 'On Target'
                  : kpi.status === 'warning'
                    ? 'Below Target'
                    : 'Critical'
              }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed bg-accentColor w-fit">
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'overview' }"
        @click="activeTab = 'overview'"
      >
        Overview
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'efficiency' }"
        @click="activeTab = 'efficiency'"
      >
        Efficiency
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'quality' }"
        @click="activeTab = 'quality'"
      >
        Quality
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'costs' }"
        @click="activeTab = 'costs'"
      >
        Cost Analysis
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'waste' }"
        @click="activeTab = 'waste'"
      >
        Waste Analysis
      </a>
    </div>

    <!-- Overview Tab -->
    <div v-if="activeTab === 'overview'" class="space-y-6">
      <!-- Production Summary -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Production Summary
          </h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Total Orders:</span>
              <span class="font-bold text-lg text-primaryColor">{{
                performanceMetrics.totalOrders
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Completed Orders:</span>
              <span class="font-bold text-lg text-success">{{
                performanceMetrics.completedOrders
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Total Produced:</span>
              <span class="font-bold text-lg text-primaryColor"
                >{{
                  performanceMetrics.totalProduced.toLocaleString()
                }}
                units</span
              >
            </div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Total Cost:</span>
              <span class="font-bold text-lg text-primaryColor">{{
                formatCurrency(performanceMetrics.totalCost)
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Avg Cost/Unit:</span>
              <span class="font-bold text-lg text-primaryColor">{{
                formatCurrency(performanceMetrics.avgCostPerUnit)
              }}</span>
            </div>
          </div>
        </div>

        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Production Trends
          </h3>
          <div class="text-center py-8">
            <TrendingUp class="w-16 h-16 text-base-content/30 mx-auto mb-4" />
            <p class="text-base-content/70">
              Production trend chart will be implemented here
            </p>
          </div>
        </div>
      </div>

      <!-- Recent Performance -->
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <h3 class="text-lg font-semibold text-primaryColor mb-4">
          Recent Performance
        </h3>
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Orders</th>
                <th>Planned</th>
                <th>Produced</th>
                <th>Efficiency</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="trend in productionTrends.slice(-7)" :key="trend.date">
                <td>{{ formatDate(trend.date) }}</td>
                <td>{{ trend.orders }}</td>
                <td>{{ trend.planned.toLocaleString() }}</td>
                <td>{{ trend.produced.toLocaleString() }}</td>
                <td>
                  <div class="flex items-center gap-2">
                    <span
                      >{{
                        Math.round((trend.produced / trend.planned) * 100)
                      }}%</span
                    >
                    <div
                      class="w-2 h-2 rounded-full"
                      :class="{
                        'bg-success': trend.produced / trend.planned >= 0.85,
                        'bg-warning': trend.produced / trend.planned >= 0.7,
                        'bg-error': trend.produced / trend.planned < 0.7,
                      }"
                    ></div>
                  </div>
                </td>
                <td>{{ formatCurrency(trend.cost) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Efficiency Tab -->
    <div v-else-if="activeTab === 'efficiency'" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Efficiency Metrics
          </h3>
          <div class="space-y-6">
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-base-content/70"
                  >Overall Efficiency</span
                >
                <span class="font-bold text-primaryColor"
                  >{{ performanceMetrics.efficiency }}%</span
                >
              </div>
              <progress
                class="progress progress-primary w-full"
                :value="performanceMetrics.efficiency"
                max="100"
              ></progress>
            </div>

            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-base-content/70"
                  >On-Time Delivery</span
                >
                <span class="font-bold text-primaryColor"
                  >{{ performanceMetrics.onTimeRate }}%</span
                >
              </div>
              <progress
                class="progress progress-success w-full"
                :value="performanceMetrics.onTimeRate"
                max="100"
              ></progress>
            </div>

            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-base-content/70">Quality Rate</span>
                <span class="font-bold text-primaryColor"
                  >{{ performanceMetrics.qualityRate }}%</span
                >
              </div>
              <progress
                class="progress progress-info w-full"
                :value="performanceMetrics.qualityRate"
                max="100"
              ></progress>
            </div>
          </div>
        </div>

        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Efficiency Trends
          </h3>
          <div class="text-center py-8">
            <Activity class="w-16 h-16 text-base-content/30 mx-auto mb-4" />
            <p class="text-base-content/70">
              Efficiency trend analysis will be implemented here
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quality Tab -->
    <div v-else-if="activeTab === 'quality'" class="space-y-6">
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <h3 class="text-lg font-semibold text-primaryColor mb-4">
          Quality Metrics
        </h3>
        <div class="text-center py-12">
          <Target class="w-16 h-16 text-base-content/30 mx-auto mb-4" />
          <p class="text-lg font-medium text-base-content/70">
            Quality Analytics
          </p>
          <p class="text-base-content/50">
            Quality metrics and trends will be displayed here
          </p>
        </div>
      </div>
    </div>

    <!-- Cost Analysis Tab -->
    <div v-else-if="activeTab === 'costs'" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Cost Breakdown
          </h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Total Production Cost:</span>
              <span class="font-bold text-lg text-primaryColor">{{
                formatCurrency(performanceMetrics.totalCost)
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Average Cost per Unit:</span>
              <span class="font-bold text-lg text-primaryColor">{{
                formatCurrency(performanceMetrics.avgCostPerUnit)
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Waste Cost:</span>
              <span class="font-bold text-lg text-error">{{
                formatCurrency(wasteAnalytics.totalWasteCost)
              }}</span>
            </div>
            <div class="divider"></div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Net Production Value:</span>
              <span class="font-bold text-xl text-success">
                {{
                  formatCurrency(
                    performanceMetrics.totalCost - wasteAnalytics.totalWasteCost
                  )
                }}
              </span>
            </div>
          </div>
        </div>

        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Cost Trends
          </h3>
          <div class="text-center py-8">
            <DollarSign class="w-16 h-16 text-base-content/30 mx-auto mb-4" />
            <p class="text-base-content/70">
              Cost analysis charts will be implemented here
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Waste Analysis Tab -->
    <div v-else-if="activeTab === 'waste'" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Waste Summary
          </h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Total Waste Cost:</span>
              <span class="font-bold text-lg text-error">{{
                formatCurrency(wasteAnalytics.totalWasteCost)
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Preventable Waste:</span>
              <span class="font-bold text-lg text-warning">{{
                formatCurrency(wasteAnalytics.preventableCost)
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Preventable Rate:</span>
              <span class="font-bold text-lg text-warning"
                >{{ Math.round(wasteAnalytics.preventableRate) }}%</span
              >
            </div>
            <div class="divider"></div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Potential Savings:</span>
              <span class="font-bold text-xl text-success">
                {{ formatCurrency(wasteAnalytics.preventableCost * 0.7) }}
              </span>
            </div>
          </div>
        </div>

        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Waste by Type
          </h3>
          <div class="space-y-3">
            <div
              v-for="[type, data] in Object.entries(
                wasteAnalytics.wasteByType
              ).slice(0, 5)"
              :key="type"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <div class="badge" :class="getWasteTypeClass(type)">
                  {{ type }}
                </div>
                <span class="text-sm">{{ data.count }} records</span>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium text-primaryColor">
                  {{ formatCurrency(data.cost) }}
                </p>
                <p class="text-xs text-base-content/60">
                  {{ data.quantity.toFixed(2) }} units
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Export Report Modal -->
    <dialog :class="{ 'modal modal-open': showExportModal }" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Export Production Report
        </h3>

        <form @submit.prevent="exportReport" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Report Format</span>
            </label>
            <select v-model="exportForm.format" class="select select-bordered">
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">From Date</span>
              </label>
              <input
                v-model="exportForm.date_from"
                type="date"
                class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">To Date</span>
              </label>
              <input
                v-model="exportForm.date_to"
                type="date"
                class="input input-bordered"
              />
            </div>
          </div>

          <div class="form-control">
            <label class="cursor-pointer label">
              <input
                v-model="exportForm.include_charts"
                type="checkbox"
                class="checkbox checkbox-primary"
              />
              <span class="label-text ml-2">Include charts and graphs</span>
            </label>
          </div>

          <div class="form-control">
            <label class="cursor-pointer label">
              <input
                v-model="exportForm.include_details"
                type="checkbox"
                class="checkbox checkbox-primary"
              />
              <span class="label-text ml-2">Include detailed data</span>
            </label>
          </div>

          <div class="modal-action">
            <button
              type="button"
              @click="closeExportModal"
              class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
              :disabled="loading"
            >
              <span
                v-if="loading"
                class="loading loading-spinner loading-sm"
              ></span>
              <Download class="w-4 h-4 mr-2" />
              Export Report
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeExportModal">close</button>
      </form>
    </dialog>

    <!-- Error Display -->
    <div v-if="error" class="alert alert-error">
      <AlertTriangle class="w-5 h-5" />
      <span>{{ error }}</span>
    </div>
  </div>
</template>
