<script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import {
    Factory,
    Clock,
    CheckCircle,
    AlertTriangle,
    TrendingUp,
    Calendar,
    Users,
    Package,
    BarChart3,
    Settings,
    Shield,
    Trash2,
    ChevronRight,
    Play,
    Pause,
    AlertCircle,
    Target,
    Activity,
    Zap,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';
  import { useRouter } from 'vue-router';

  const router = useRouter();
  const productionStore = useProductionStore();

  // Reactive state
  const currentTime = ref(new Date());
  const refreshInterval = ref(null);

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const dashboardStats = computed(() => productionStore.dashboardStats);
  const activeProductionOrders = computed(
    () => productionStore.activeProductionOrders
  );
  const todayProductionOrders = computed(
    () => productionStore.todayProductionOrders
  );
  const urgentOrders = computed(() => productionStore.urgentOrders);
  const pendingWorkOrders = computed(() => productionStore.pendingWorkOrders);
  const overdueMaintenance = computed(() => productionStore.overdueMaintenance);

  // Computed properties for dashboard metrics
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

  const alertsCount = computed(() => {
    return urgentOrders.value.length + overdueMaintenance.value.length;
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

  const navigateTo = (route) => {
    router.push(route);
  };

  const refreshData = async () => {
    try {
      await Promise.all([
        productionStore.fetchDashboardStats(),
        productionStore.fetchProductionOrders({ limit: 10 }),
        productionStore.fetchWorkOrders({ status: 'Pending', limit: 5 }),
        productionStore.fetchMaintenanceSchedules(),
      ]);
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
    }
  };

  // Lifecycle hooks
  onMounted(async () => {
    await refreshData();

    // Update time every second
    refreshInterval.value = setInterval(updateCurrentTime, 1000);

    // Auto-refresh data every 30 seconds
    setInterval(refreshData, 30000);
  });

  onUnmounted(() => {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
    }
  });
</script>

<template>
  <div class="p-6 space-y-6 bg-base-100 min-h-screen">
    <!-- Header Section -->
    <div
      class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
    >
      <div>
        <h1
          class="text-3xl font-bold text-primaryColor flex items-center gap-3"
        >
          <Factory class="w-8 h-8" />
          Production Dashboard
        </h1>
        <p class="text-base-content/70 mt-1">
          Real-time production monitoring and management
        </p>
      </div>

      <!-- Real-time Clock -->
      <div class="bg-accentColor rounded-xl p-4 shadow-sm border">
        <div class="text-center">
          <div class="text-2xl font-mono font-bold text-primaryColor">
            {{ formatTime(currentTime) }}
          </div>
          <div class="text-sm text-base-content/70 mt-1">
            {{ formatDate(currentTime) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Key Metrics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Total Orders -->
      <div
        class="bg-accentColor rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Total Orders</p>
            <p class="text-3xl font-bold text-primaryColor">
              {{ dashboardStats.total_orders || 0 }}
            </p>
            <p class="text-sm text-success mt-1">
              {{ dashboardStats.today_orders || 0 }} today
            </p>
          </div>
          <div class="p-3 bg-primaryColor/10 rounded-full">
            <Package class="w-8 h-8 text-primaryColor" />
          </div>
        </div>
      </div>

      <!-- Production Efficiency -->
      <div
        class="bg-accentColor rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              Overall Efficiency
            </p>
            <p class="text-3xl font-bold text-primaryColor">
              {{ productionEfficiency }}%
            </p>
            <p class="text-sm text-info mt-1">{{ todayEfficiency }}% today</p>
          </div>
          <div class="p-3 bg-info/10 rounded-full">
            <Target class="w-8 h-8 text-info" />
          </div>
        </div>
      </div>

      <!-- Active Orders -->
      <div
        class="bg-accentColor rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              Active Orders
            </p>
            <p class="text-3xl font-bold text-primaryColor">
              {{ dashboardStats.in_progress_orders || 0 }}
            </p>
            <p class="text-sm text-warning mt-1">
              {{ dashboardStats.scheduled_orders || 0 }} scheduled
            </p>
          </div>
          <div class="p-3 bg-warning/10 rounded-full">
            <Activity class="w-8 h-8 text-warning" />
          </div>
        </div>
      </div>

      <!-- Alerts -->
      <div
        class="bg-accentColor rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Alerts</p>
            <p class="text-3xl font-bold text-primaryColor">
              {{ alertsCount }}
            </p>
            <p class="text-sm text-error mt-1">Requires attention</p>
          </div>
          <div class="p-3 bg-error/10 rounded-full">
            <AlertTriangle class="w-8 h-8 text-error" />
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
      <h2
        class="text-xl font-semibold text-primaryColor mb-4 flex items-center gap-2"
      >
        <Zap class="w-5 h-5" />
        Quick Actions
      </h2>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <button
          @click="navigateTo('/production/orders')"
          class="btn btn-outline btn-sm flex-col h-20 gap-2 hover:bg-primaryColor hover:text-white hover:border-primaryColor"
        >
          <Package class="w-5 h-5" />
          <span class="text-xs">Orders</span>
        </button>
        <button
          @click="navigateTo('/production/planning')"
          class="btn btn-outline btn-sm flex-col h-20 gap-2 hover:bg-primaryColor hover:text-white hover:border-primaryColor"
        >
          <Calendar class="w-5 h-5" />
          <span class="text-xs">Planning</span>
        </button>
        <button
          @click="navigateTo('/production/work-orders')"
          class="btn btn-outline btn-sm flex-col h-20 gap-2 hover:bg-primaryColor hover:text-white hover:border-primaryColor"
        >
          <Users class="w-5 h-5" />
          <span class="text-xs">Work Orders</span>
        </button>
        <button
          @click="navigateTo('/production/quality-control')"
          class="btn btn-outline btn-sm flex-col h-20 gap-2 hover:bg-primaryColor hover:text-white hover:border-primaryColor"
        >
          <Shield class="w-5 h-5" />
          <span class="text-xs">Quality</span>
        </button>
        <button
          @click="navigateTo('/production/maintenance')"
          class="btn btn-outline btn-sm flex-col h-20 gap-2 hover:bg-primaryColor hover:text-white hover:border-primaryColor"
        >
          <Settings class="w-5 h-5" />
          <span class="text-xs">Maintenance</span>
        </button>
        <button
          @click="navigateTo('/production/analytics')"
          class="btn btn-outline btn-sm flex-col h-20 gap-2 hover:bg-primaryColor hover:text-white hover:border-primaryColor"
        >
          <BarChart3 class="w-5 h-5" />
          <span class="text-xs">Analytics</span>
        </button>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Today's Production Orders -->
      <div class="lg:col-span-2 bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between mb-4">
          <h2
            class="text-xl font-semibold text-primaryColor flex items-center gap-2"
          >
            <Calendar class="w-5 h-5" />
            Today's Production Schedule
          </h2>
          <button
            @click="navigateTo('/production/orders')"
            class="btn btn-ghost btn-sm text-primaryColor hover:bg-primaryColor hover:text-white"
          >
            View All
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
          <span
            class="loading loading-spinner loading-lg text-primaryColor"
          ></span>
        </div>

        <div
          v-else-if="todayProductionOrders.length === 0"
          class="text-center py-8"
        >
          <Calendar class="w-12 h-12 text-base-content/30 mx-auto mb-2" />
          <p class="text-base-content/70">
            No production orders scheduled for today
          </p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="order in todayProductionOrders.slice(0, 5)"
            :key="order.id"
            class="flex items-center justify-between p-4 bg-base-100 rounded-lg border hover:shadow-sm transition-shadow"
          >
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-1">
                <h3 class="font-medium text-primaryColor">
                  {{ order.product_name }}
                </h3>
                <div class="badge" :class="getStatusBadgeClass(order.status)">
                  {{ order.status }}
                </div>
                <div
                  class="badge"
                  :class="getPriorityBadgeClass(order.priority)"
                >
                  {{ order.priority }}
                </div>
              </div>
              <p class="text-sm text-base-content/70">
                Order #{{ order.order_number }} • {{ order.quantity_planned }}
                {{ order.unit_of_measure }}
              </p>
              <p class="text-sm text-base-content/60">
                Assigned to: {{ order.assigned_to_name || 'Unassigned' }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium text-primaryColor">
                {{ order.quantity_produced || 0 }} /
                {{ order.quantity_planned }}
              </p>
              <p class="text-xs text-base-content/60">
                {{
                  Math.round(
                    ((order.quantity_produced || 0) / order.quantity_planned) *
                      100
                  )
                }}% Complete
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Alerts & Notifications -->
      <div class="space-y-6">
        <!-- Urgent Orders -->
        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h2
            class="text-lg font-semibold text-error mb-4 flex items-center gap-2"
          >
            <AlertTriangle class="w-5 h-5" />
            Urgent Orders
          </h2>

          <div v-if="urgentOrders.length === 0" class="text-center py-4">
            <CheckCircle class="w-8 h-8 text-success mx-auto mb-2" />
            <p class="text-sm text-success">No urgent orders</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="order in urgentOrders.slice(0, 3)"
              :key="order.id"
              class="p-3 bg-error/5 border border-error/20 rounded-lg"
            >
              <p class="font-medium text-error text-sm">
                {{ order.product_name }}
              </p>
              <p class="text-xs text-base-content/70">
                {{ order.order_number }}
              </p>
              <p class="text-xs text-base-content/60 mt-1">
                Due: {{ new Date(order.planned_end_date).toLocaleDateString() }}
              </p>
            </div>
          </div>
        </div>

        <!-- Overdue Maintenance -->
        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h2
            class="text-lg font-semibold text-warning mb-4 flex items-center gap-2"
          >
            <Settings class="w-5 h-5" />
            Overdue Maintenance
          </h2>

          <div v-if="overdueMaintenance.length === 0" class="text-center py-4">
            <CheckCircle class="w-8 h-8 text-success mx-auto mb-2" />
            <p class="text-sm text-success">All maintenance up to date</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="maintenance in overdueMaintenance.slice(0, 3)"
              :key="maintenance.id"
              class="p-3 bg-warning/5 border border-warning/20 rounded-lg"
            >
              <p class="font-medium text-warning text-sm">
                {{ maintenance.task_name }}
              </p>
              <p class="text-xs text-base-content/70">
                {{ maintenance.equipment_name }}
              </p>
              <p class="text-xs text-base-content/60 mt-1">
                Due:
                {{ new Date(maintenance.next_due_date).toLocaleDateString() }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
      <h2
        class="text-xl font-semibold text-primaryColor mb-4 flex items-center gap-2"
      >
        <Clock class="w-5 h-5" />
        Recent Activity
      </h2>

      <div class="space-y-3">
        <div class="flex items-center gap-3 p-3 bg-base-100 rounded-lg">
          <div class="w-2 h-2 bg-success rounded-full"></div>
          <div class="flex-1">
            <p class="text-sm font-medium">
              Production Order PO20250125001 completed
            </p>
            <p class="text-xs text-base-content/60">2 minutes ago</p>
          </div>
        </div>

        <div class="flex items-center gap-3 p-3 bg-base-100 rounded-lg">
          <div class="w-2 h-2 bg-info rounded-full"></div>
          <div class="flex-1">
            <p class="text-sm font-medium">
              Quality inspection passed for Batch B001
            </p>
            <p class="text-xs text-base-content/60">15 minutes ago</p>
          </div>
        </div>

        <div class="flex items-center gap-3 p-3 bg-base-100 rounded-lg">
          <div class="w-2 h-2 bg-warning rounded-full"></div>
          <div class="flex-1">
            <p class="text-sm font-medium">
              Equipment maintenance scheduled for Oven #2
            </p>
            <p class="text-xs text-base-content/60">1 hour ago</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="alert alert-error">
      <AlertCircle class="w-5 h-5" />
      <span>{{ error }}</span>
    </div>
  </div>
</template>
