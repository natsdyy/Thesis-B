<script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import {
    Activity,
    RefreshCcw,
    Play,
    Pause,
    Clock,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle,
    Package,
    Users,
    Zap,
    BarChart3,
    Target,
    Timer,
    DollarSign,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';

  const productionStore = useProductionStore();

  // Reactive state
  const currentTime = ref(new Date());
  const refreshInterval = ref(null);
  const selectedTimeframe = ref('today');
  const autoRefresh = ref(true);
  const refreshRate = ref(30); // seconds

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const productionOrders = computed(() => productionStore.productionOrders);
  const workOrders = computed(() => productionStore.workOrders);
  const dashboardStats = computed(() => productionStore.dashboardStats);

  // Real-time computed properties
  const activeOrders = computed(() =>
    productionOrders.value.filter((order) => order.status === 'In Progress')
  );

  const activeWorkOrders = computed(() =>
    workOrders.value.filter((order) => order.status === 'In Progress')
  );

  const todayOrders = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return productionOrders.value.filter(
      (order) => order.planned_start_date === today
    );
  });

  const overdueOrders = computed(() => {
    const now = new Date();
    return productionOrders.value.filter((order) => {
      const endDate = new Date(order.planned_end_date);
      return (
        endDate < now &&
        (order.status === 'Scheduled' || order.status === 'In Progress')
      );
    });
  });

  const productionEfficiency = computed(() => {
    const planned = parseFloat(
      dashboardStats.value.total_planned_quantity || 0
    );
    const produced = parseFloat(
      dashboardStats.value.total_produced_quantity || 0
    );
    return planned > 0 ? Math.round((produced / planned) * 100) : 0;
  });

  const todayEfficiency = computed(() => {
    const planned = parseFloat(dashboardStats.value.today_planned || 0);
    const produced = parseFloat(dashboardStats.value.today_produced || 0);
    return planned > 0 ? Math.round((produced / planned) * 100) : 0;
  });

  // Real-time metrics
  const realTimeMetrics = computed(() => {
    const totalActiveTime = activeOrders.value.reduce((total, order) => {
      if (order.actual_start_date) {
        const start = new Date(order.actual_start_date);
        const now = new Date();
        return total + Math.floor((now - start) / (1000 * 60)); // minutes
      }
      return total;
    }, 0);

    const averageOrderTime =
      activeOrders.value.length > 0
        ? Math.round(totalActiveTime / activeOrders.value.length)
        : 0;

    return {
      activeProductionTime: totalActiveTime,
      averageOrderTime,
      activeStations: activeWorkOrders.value.length,
      completionRate: todayEfficiency.value,
    };
  });

  // Methods
  const updateCurrentTime = () => {
    currentTime.value = new Date();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Completed':
        return 'badge-success';
      case 'In Progress':
        return 'badge-info';
      case 'Scheduled':
        return 'badge-warning';
      case 'Draft':
        return 'badge-neutral';
      case 'Cancelled':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Urgent':
        return 'badge-error';
      case 'High':
        return 'badge-warning';
      case 'Normal':
        return 'badge-info';
      case 'Low':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  };

  const getProgressPercentage = (order) => {
    return Math.round(
      ((order.quantity_produced || 0) / order.quantity_planned) * 100
    );
  };

  const getTimeRemaining = (order) => {
    if (!order.planned_end_date) return 'No deadline';

    const now = new Date();
    const endDate = new Date(order.planned_end_date);
    const diffMs = endDate - now;

    if (diffMs < 0) return 'Overdue';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }

    return `${hours}h ${minutes}m`;
  };

  const refreshData = async () => {
    try {
      await Promise.all([
        productionStore.fetchProductionOrders(),
        productionStore.fetchWorkOrders(),
        productionStore.fetchDashboardStats(),
      ]);
    } catch (error) {
      console.error('Error refreshing monitoring data:', error);
    }
  };

  const toggleAutoRefresh = () => {
    autoRefresh.value = !autoRefresh.value;
    if (autoRefresh.value) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  };

  const startAutoRefresh = () => {
    if (refreshInterval.value) clearInterval(refreshInterval.value);
    refreshInterval.value = setInterval(refreshData, refreshRate.value * 1000);
  };

  const stopAutoRefresh = () => {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
      refreshInterval.value = null;
    }
  };

  // Lifecycle hooks
  onMounted(async () => {
    await refreshData();

    // Update time every second
    setInterval(updateCurrentTime, 1000);

    // Start auto-refresh if enabled
    if (autoRefresh.value) {
      startAutoRefresh();
    }
  });

  onUnmounted(() => {
    stopAutoRefresh();
  });
</script>

<template>
  <div class="p-6 space-y-6 bg-base-100 min-h-screen">
    <!-- Header with Real-time Clock -->
    <div
      class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
    >
      <div>
        <h1
          class="text-3xl font-bold text-primaryColor flex items-center gap-3"
        >
          <Activity class="w-8 h-8" />
          Real-time Production Monitoring
        </h1>
        <p class="text-base-content/70 mt-1">
          Live production status and performance tracking
        </p>
      </div>

      <!-- Control Panel -->
      <div class="flex items-center gap-3">
        <div class="bg-accentColor rounded-lg p-3 border">
          <div class="text-center">
            <div class="text-lg font-mono font-bold text-primaryColor">
              {{ formatTime(currentTime) }}
            </div>
            <div class="text-xs text-base-content/70">
              {{ formatDate(currentTime) }}
            </div>
          </div>
        </div>

        <div class="form-control">
          <label class="cursor-pointer label gap-2">
            <input
              v-model="autoRefresh"
              type="checkbox"
              class="toggle toggle-primary toggle-sm"
              @change="toggleAutoRefresh"
            />
            <span class="label-text text-sm">Auto-refresh</span>
          </label>
        </div>

        <button
          @click="refreshData"
          class="btn btn-ghost btn-sm"
          :disabled="loading"
        >
          <RefreshCcw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Real-time Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Active Production Time -->
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              Active Production Time
            </p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ formatDuration(realTimeMetrics.activeProductionTime) }}
            </p>
            <p class="text-sm text-info mt-1">
              {{ activeOrders.length }} orders running
            </p>
          </div>
          <div class="p-3 bg-primaryColor/10 rounded-full">
            <Timer class="w-8 h-8 text-primaryColor" />
          </div>
        </div>
      </div>

      <!-- Active Stations -->
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              Active Stations
            </p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ realTimeMetrics.activeStations }}
            </p>
            <p class="text-sm text-info mt-1">Work orders in progress</p>
          </div>
          <div class="p-3 bg-info/10 rounded-full">
            <Users class="w-8 h-8 text-info" />
          </div>
        </div>
      </div>

      <!-- Today's Efficiency -->
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              Today's Efficiency
            </p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ todayEfficiency }}%
            </p>
            <p
              class="text-sm"
              :class="todayEfficiency >= 80 ? 'text-success' : 'text-warning'"
            >
              {{ todayEfficiency >= 80 ? 'On target' : 'Below target' }}
            </p>
          </div>
          <div class="p-3 bg-success/10 rounded-full">
            <Target class="w-8 h-8 text-success" />
          </div>
        </div>
      </div>

      <!-- Alerts -->
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              Active Alerts
            </p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ overdueOrders.length }}
            </p>
            <p class="text-sm text-error mt-1">Overdue orders</p>
          </div>
          <div class="p-3 bg-error/10 rounded-full">
            <AlertTriangle class="w-8 h-8 text-error" />
          </div>
        </div>
      </div>
    </div>

    <!-- Live Production Status -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Active Production Orders -->
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between mb-4">
          <h2
            class="text-xl font-semibold text-primaryColor flex items-center gap-2"
          >
            <Play class="w-5 h-5" />
            Active Production Orders
          </h2>
          <div class="badge badge-info">{{ activeOrders.length }} running</div>
        </div>

        <div v-if="activeOrders.length === 0" class="text-center py-8">
          <Pause class="w-12 h-12 text-base-content/30 mx-auto mb-2" />
          <p class="text-base-content/70">No active production orders</p>
        </div>

        <div v-else class="space-y-4 max-h-96 overflow-y-auto">
          <div
            v-for="order in activeOrders"
            :key="order.id"
            class="p-4 bg-base-100 rounded-lg border"
          >
            <div class="flex items-center justify-between mb-3">
              <div>
                <h3 class="font-medium text-primaryColor">
                  {{ order.product_name }}
                </h3>
                <p class="text-sm text-base-content/70">
                  {{ order.order_number }}
                </p>
              </div>
              <div class="text-right">
                <div
                  class="badge"
                  :class="getPriorityBadgeClass(order.priority)"
                >
                  {{ order.priority }}
                </div>
                <p class="text-xs text-base-content/60 mt-1">
                  {{ getTimeRemaining(order) }}
                </p>
              </div>
            </div>

            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-base-content/70">Progress:</span>
              <span class="text-sm font-medium">
                {{ order.quantity_produced || 0 }} /
                {{ order.quantity_planned }} {{ order.unit_of_measure }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <progress
                class="progress progress-primary flex-1"
                :value="order.quantity_produced || 0"
                :max="order.quantity_planned"
              ></progress>
              <span class="text-sm font-medium text-primaryColor">
                {{ getProgressPercentage(order) }}%
              </span>
            </div>

            <div
              v-if="order.assigned_to_name"
              class="text-xs text-base-content/60 mt-2"
            >
              Assigned to: {{ order.assigned_to_name }}
            </div>
          </div>
        </div>
      </div>

      <!-- Active Work Stations -->
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between mb-4">
          <h2
            class="text-xl font-semibold text-primaryColor flex items-center gap-2"
          >
            <Users class="w-5 h-5" />
            Active Work Stations
          </h2>
          <div class="badge badge-info">
            {{ activeWorkOrders.length }} stations
          </div>
        </div>

        <div v-if="activeWorkOrders.length === 0" class="text-center py-8">
          <Users class="w-12 h-12 text-base-content/30 mx-auto mb-2" />
          <p class="text-base-content/70">No active work stations</p>
        </div>

        <div v-else class="space-y-4 max-h-96 overflow-y-auto">
          <div
            v-for="workOrder in activeWorkOrders"
            :key="workOrder.id"
            class="p-4 bg-base-100 rounded-lg border"
          >
            <div class="flex items-center justify-between mb-2">
              <div>
                <h3 class="font-medium text-primaryColor">
                  {{ workOrder.task_name }}
                </h3>
                <p class="text-sm text-base-content/70">
                  {{ workOrder.task_type }}
                </p>
              </div>
              <div class="text-right">
                <div class="badge badge-info">In Progress</div>
                <p class="text-xs text-base-content/60 mt-1">
                  {{ workOrder.work_order_number }}
                </p>
              </div>
            </div>

            <div class="flex items-center justify-between text-sm">
              <span class="text-base-content/70">Duration:</span>
              <span class="font-medium">{{
                formatDuration(workOrder.estimated_duration_minutes)
              }}</span>
            </div>

            <div class="flex items-center justify-between text-sm">
              <span class="text-base-content/70">Worker:</span>
              <span class="font-medium">{{
                workOrder.assigned_to_name || 'Unassigned'
              }}</span>
            </div>

            <div
              v-if="workOrder.actual_start"
              class="text-xs text-base-content/60 mt-2"
            >
              Started:
              {{ new Date(workOrder.actual_start).toLocaleTimeString() }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Performance Dashboard -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Today's Performance -->
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <h3
          class="text-lg font-semibold text-primaryColor mb-4 flex items-center gap-2"
        >
          <BarChart3 class="w-5 h-5" />
          Today's Performance
        </h3>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-base-content/70">Orders Scheduled:</span>
            <span class="font-bold text-lg text-primaryColor">{{
              todayOrders.length
            }}</span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-base-content/70">Orders Completed:</span>
            <span class="font-bold text-lg text-success">
              {{ todayOrders.filter((o) => o.status === 'Completed').length }}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-base-content/70">Efficiency Rate:</span>
            <span
              class="font-bold text-lg"
              :class="todayEfficiency >= 80 ? 'text-success' : 'text-warning'"
            >
              {{ todayEfficiency }}%
            </span>
          </div>

          <div class="divider my-2"></div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-base-content/70">Planned Quantity:</span>
            <span class="font-medium">{{
              dashboardStats.today_planned || 0
            }}</span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-sm text-base-content/70">Produced Quantity:</span>
            <span class="font-medium">{{
              dashboardStats.today_produced || 0
            }}</span>
          </div>
        </div>
      </div>

      <!-- Resource Utilization -->
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <h3
          class="text-lg font-semibold text-primaryColor mb-4 flex items-center gap-2"
        >
          <Zap class="w-5 h-5" />
          Resource Utilization
        </h3>

        <div class="space-y-4">
          <div>
            <div class="flex justify-between items-center mb-1">
              <span class="text-sm text-base-content/70"
                >Production Capacity</span
              >
              <span class="text-sm font-medium"
                >{{
                  Math.min(100, Math.round((activeOrders.length / 10) * 100))
                }}%</span
              >
            </div>
            <progress
              class="progress progress-primary w-full"
              :value="
                Math.min(100, Math.round((activeOrders.length / 10) * 100))
              "
              max="100"
            ></progress>
          </div>

          <div>
            <div class="flex justify-between items-center mb-1">
              <span class="text-sm text-base-content/70"
                >Workforce Utilization</span
              >
              <span class="text-sm font-medium"
                >{{
                  Math.min(
                    100,
                    Math.round((activeWorkOrders.length / 20) * 100)
                  )
                }}%</span
              >
            </div>
            <progress
              class="progress progress-info w-full"
              :value="
                Math.min(100, Math.round((activeWorkOrders.length / 20) * 100))
              "
              max="100"
            ></progress>
          </div>

          <div>
            <div class="flex justify-between items-center mb-1">
              <span class="text-sm text-base-content/70"
                >Quality Pass Rate</span
              >
              <span class="text-sm font-medium">95%</span>
            </div>
            <progress
              class="progress progress-success w-full"
              value="95"
              max="100"
            ></progress>
          </div>
        </div>
      </div>

      <!-- Alerts & Issues -->
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <h3
          class="text-lg font-semibold text-primaryColor mb-4 flex items-center gap-2"
        >
          <AlertTriangle class="w-5 h-5" />
          Alerts & Issues
        </h3>

        <div v-if="overdueOrders.length === 0" class="text-center py-4">
          <CheckCircle class="w-8 h-8 text-success mx-auto mb-2" />
          <p class="text-sm text-success">No active alerts</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="order in overdueOrders.slice(0, 5)"
            :key="order.id"
            class="p-3 bg-error/10 border border-error/20 rounded-lg"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-error text-sm">
                  {{ order.product_name }}
                </p>
                <p class="text-xs text-base-content/70">
                  {{ order.order_number }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-xs text-error font-medium">OVERDUE</p>
                <p class="text-xs text-base-content/60">
                  Due: {{ formatDate(order.planned_end_date) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Live Production Timeline -->
    <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
      <h2
        class="text-xl font-semibold text-primaryColor mb-4 flex items-center gap-2"
      >
        <Clock class="w-5 h-5" />
        Live Production Timeline
      </h2>

      <div class="space-y-3">
        <!-- Sample timeline entries - would be populated with real data -->
        <div class="flex items-center gap-3 p-3 bg-base-100 rounded-lg">
          <div class="w-3 h-3 bg-success rounded-full animate-pulse"></div>
          <div class="flex-1">
            <p class="text-sm font-medium">
              Production Order PO20250125003 started
            </p>
            <p class="text-xs text-base-content/60">
              {{ formatTime(currentTime) }} - Grilled Chicken Batch
            </p>
          </div>
          <div class="badge badge-info">Live</div>
        </div>

        <div class="flex items-center gap-3 p-3 bg-base-100 rounded-lg">
          <div class="w-3 h-3 bg-info rounded-full"></div>
          <div class="flex-1">
            <p class="text-sm font-medium">
              Quality inspection passed for Batch B002
            </p>
            <p class="text-xs text-base-content/60">
              2 minutes ago - Caesar Salad
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3 p-3 bg-base-100 rounded-lg">
          <div class="w-3 h-3 bg-warning rounded-full"></div>
          <div class="flex-1">
            <p class="text-sm font-medium">
              Work Order WO-001 requires attention
            </p>
            <p class="text-xs text-base-content/60">
              5 minutes ago - Kitchen Station 2
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Production Metrics Chart Placeholder -->
    <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
      <h2
        class="text-xl font-semibold text-primaryColor mb-4 flex items-center gap-2"
      >
        <TrendingUp class="w-5 h-5" />
        Production Metrics
      </h2>

      <div class="text-center py-12">
        <BarChart3 class="w-16 h-16 text-base-content/30 mx-auto mb-4" />
        <p class="text-lg font-medium text-base-content/70">Real-time Charts</p>
        <p class="text-base-content/50">
          Production metrics visualization will be implemented here
        </p>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="alert alert-error">
      <AlertTriangle class="w-5 h-5" />
      <span>{{ error }}</span>
    </div>
  </div>
</template>
