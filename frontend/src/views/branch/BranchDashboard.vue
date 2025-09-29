<script setup>
  import { ref, computed, onMounted } from 'vue';
  import {
    LayoutDashboard,
    CreditCard,
    Package,
    Users,
    BarChart3,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle,
    AlertTriangle,
    Eye,
    ArrowRight,
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { useAuthStore } from '../../stores/authStore';
  import { useEmployeeScheduleStore } from '../../stores/employeeScheduleStore';
  import EmployeeScheduleCalendar from '../../components/branch/EmployeeScheduleCalendar.vue';
  import { useRouter } from 'vue-router';

  const branchContextStore = useBranchContextStore();
  const authStore = useAuthStore();
  const scheduleStore = useEmployeeScheduleStore();
  const router = useRouter();

  // Local state
  const loading = ref(false);
  const dashboardStats = ref({
    todaySales: 0,
    todayTransactions: 0,
    lowStockItems: 0,
    activeEmployees: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0,
  });

  const recentActivity = ref([]);
  const quickActions = ref([]);
  const showScheduleModal = ref(false);

  const me = computed(() => {
    const u =
      authStore.user || JSON.parse(localStorage.getItem('user') || 'null');
    return u || {};
  });

  // Computed
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const userRole = computed(() => branchContextStore.userRole);
  const availableOperations = computed(
    () => branchContextStore.availableOperations
  );

  // Quick actions based on role
  const getQuickActions = () => {
    const actions = [];

    if (branchContextStore.canAccessPOS) {
      actions.push({
        title: 'Open POS',
        description: 'Start processing transactions',
        icon: CreditCard,
        route: '/branch/pos',
        color: 'bg-blue-500',
      });
    }

    if (branchContextStore.canAccessInventory) {
      actions.push({
        title: 'Check Inventory',
        description: 'View stock levels',
        icon: Package,
        route: '/branch/inventory',
        color: 'bg-green-500',
      });
    }

    if (branchContextStore.canAccessSales) {
      actions.push({
        title: 'Sales Report',
        description: 'View sales analytics',
        icon: BarChart3,
        route: '/branch/sales',
        color: 'bg-purple-500',
      });
    }

    if (branchContextStore.canAccessEmployees) {
      actions.push({
        title: 'Manage Staff',
        description: 'Employee management',
        icon: Users,
        route: '/branch/employees',
        color: 'bg-orange-500',
      });
    }

    actions.push({
      title: 'My Profile',
      description: 'Update personal info',
      icon: Users,
      route: '/branch/profile',
      color: 'bg-gray-500',
    });

    return actions;
  };

  // Methods
  const navigateTo = (route) => {
    router.push(route);
  };

  const openMySchedule = async () => {
    // Prefetch current month schedules for this branch
    const branchId = currentBranch.value?.id;
    if (!branchId) {
      return;
    }
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const toYMD = (d) => new Date(d).toISOString().split('T')[0];
    try {
      await scheduleStore.fetchSchedules(branchId, toYMD(start), toYMD(end));
    } catch (e) {
      // non-blocking
      console.warn('Failed to prefetch schedules', e);
    }
  };

  // Prefetch schedules for inline calendar on load
  const prefetchMySchedule = async () => {
    const branchId = currentBranch.value?.id;
    if (!branchId) return;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const toYMD = (d) => new Date(d).toISOString().split('T')[0];
    try {
      await scheduleStore.fetchSchedules(branchId, toYMD(start), toYMD(end));
    } catch (e) {
      console.warn('Failed to prefetch schedules', e);
    }
  };

  const loadDashboardData = async () => {
    loading.value = true;

    try {
      // TODO: Fetch real dashboard data from API
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      dashboardStats.value = {
        todaySales: 15420.5,
        todayTransactions: 87,
        lowStockItems: 3,
        activeEmployees: 12,
        weeklyGrowth: 8.5,
        monthlyGrowth: 15.2,
      };

      recentActivity.value = [
        {
          id: 1,
          type: 'sale',
          message: 'New order completed - ₱850.00',
          time: '2 minutes ago',
          icon: CreditCard,
          color: 'text-green-600',
        },
        {
          id: 2,
          type: 'inventory',
          message: 'Low stock alert: Beef Steak',
          time: '15 minutes ago',
          icon: AlertTriangle,
          color: 'text-orange-600',
        },
        {
          id: 3,
          type: 'employee',
          message: 'John Doe checked in',
          time: '1 hour ago',
          icon: Users,
          color: 'text-blue-600',
        },
      ];
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      loading.value = false;
    }
  };

  // Initialize
  onMounted(() => {
    quickActions.value = getQuickActions();
    loadDashboardData();
    prefetchMySchedule();
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-primaryColor">Branch Dashboard</h1>
        <p class="text-gray-600 mt-1">
          {{ currentBranch?.name }} - {{ userRole }}
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="text-center">
        <div class="loading loading-spinner loading-lg text-primaryColor"></div>
        <p class="mt-2 text-gray-600">Loading dashboard...</p>
      </div>
    </div>

    <div v-else class="space-y-6">
      <!-- My Schedule Calendar (inline) -->
      <EmployeeScheduleCalendar
        :inline="true"
        :employee="{
          id: me?.id,
          first_name: me?.first_name || me?.firstName || '',
          last_name: me?.last_name || me?.lastName || '',
        }"
        :branch-id="currentBranch?.id"
        :schedules="scheduleStore.schedules"
        :show-shift-label="true"
      />
    </div>
  </div>

  <!-- Calendar modal removed; shown inline above -->
</template>

<style scoped>
  /* Custom styles following the reference patterns */
  /* .card {
    @apply transition-shadow duration-200;
  }

  .card:hover {
    @apply shadow-xl;
  }

  .btn {
    @apply transition-all duration-200;
  } */

  /* Stats card hover effects */
  /* .card-body:hover .text-primaryColor {
    @apply scale-105;
    transition: transform 0.2s ease;
  } */
</style>
