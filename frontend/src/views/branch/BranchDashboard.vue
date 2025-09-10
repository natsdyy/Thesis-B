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
  import { useRouter } from 'vue-router';

  const branchContextStore = useBranchContextStore();
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
      <div class="flex items-center space-x-2">
        <div class="badge badge-success">
          <CheckCircle class="w-3 h-3 mr-1" />
          Active
        </div>
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
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <!-- Today's Sales -->
        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Today's Sales</p>
                <p class="text-2xl font-bold text-primaryColor">
                  ₱{{ dashboardStats.todaySales.toLocaleString() }}
                </p>
                <div class="flex items-center mt-1">
                  <TrendingUp class="w-4 h-4 text-green-500 mr-1" />
                  <span class="text-sm text-green-600"
                    >+{{ dashboardStats.weeklyGrowth }}%</span
                  >
                </div>
              </div>
              <div class="p-3 bg-green-100 rounded-full">
                <BarChart3 class="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <!-- Transactions -->
        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Transactions</p>
                <p class="text-2xl font-bold text-primaryColor">
                  {{ dashboardStats.todayTransactions }}
                </p>
                <div class="flex items-center mt-1">
                  <Clock class="w-4 h-4 text-blue-500 mr-1" />
                  <span class="text-sm text-blue-600">Today</span>
                </div>
              </div>
              <div class="p-3 bg-blue-100 rounded-full">
                <CreditCard class="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <!-- Inventory Alerts -->
        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Low Stock Items</p>
                <p class="text-2xl font-bold text-primaryColor">
                  {{ dashboardStats.lowStockItems }}
                </p>
                <div class="flex items-center mt-1">
                  <AlertTriangle class="w-4 h-4 text-orange-500 mr-1" />
                  <span class="text-sm text-orange-600">Needs attention</span>
                </div>
              </div>
              <div class="p-3 bg-orange-100 rounded-full">
                <Package class="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <!-- Active Employees -->
        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Active Staff</p>
                <p class="text-2xl font-bold text-primaryColor">
                  {{ dashboardStats.activeEmployees }}
                </p>
                <div class="flex items-center mt-1">
                  <CheckCircle class="w-4 h-4 text-green-500 mr-1" />
                  <span class="text-sm text-green-600">On duty</span>
                </div>
              </div>
              <div class="p-3 bg-purple-100 rounded-full">
                <Users class="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <h2 class="card-title text-primaryColor mb-4">
            <LayoutDashboard class="w-5 h-5" />
            Quick Actions
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              v-for="action in quickActions"
              :key="action.title"
              @click="navigateTo(action.route)"
              class="flex items-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow group"
            >
              <div :class="[action.color, 'p-3 rounded-full mr-4']">
                <component :is="action.icon" class="w-6 h-6 text-white" />
              </div>
              <div class="text-left flex-1">
                <h3
                  class="font-semibold text-gray-900 group-hover:text-primaryColor"
                >
                  {{ action.title }}
                </h3>
                <p class="text-sm text-gray-600">{{ action.description }}</p>
              </div>
              <ArrowRight
                class="w-4 h-4 text-gray-400 group-hover:text-primaryColor"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <h2 class="card-title text-primaryColor mb-4">
            <Clock class="w-5 h-5" />
            Recent Activity
          </h2>

          <div class="space-y-4">
            <div
              v-for="activity in recentActivity"
              :key="activity.id"
              class="flex items-center p-3 bg-gray-50 rounded-lg"
            >
              <div class="p-2 bg-white rounded-full mr-3">
                <component
                  :is="activity.icon"
                  :class="[activity.color, 'w-4 h-4']"
                />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">
                  {{ activity.message }}
                </p>
                <p class="text-xs text-gray-500">{{ activity.time }}</p>
              </div>
            </div>
          </div>

          <div class="text-center mt-4">
            <button
              class="btn btn-outline btn-sm text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white"
            >
              <Eye class="w-4 h-4 mr-1" />
              View All Activity
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
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
