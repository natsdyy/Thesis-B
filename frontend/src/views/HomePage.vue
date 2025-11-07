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
    Gift,
    Cake,
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../stores/branchContextStore';
  import { useAuthStore } from '../stores/authStore';
  import { useEmployeeScheduleStore } from '../stores/employeeScheduleStore';
  import { useEmployeeStore } from '../stores/employeeStore';
  import EmployeeScheduleCalendar from '../components/branch/EmployeeScheduleCalendar.vue';
  import { useRouter } from 'vue-router';
  import {
    getBirthdayEmployees,
    isMyBirthdayToday,
  } from '../utils/birthdayUtils';
  import { formatImageUrl, apiConfig } from '../config/api.js';

  const branchContextStore = useBranchContextStore();
  const authStore = useAuthStore();
  const scheduleStore = useEmployeeScheduleStore();
  const employeeStore = useEmployeeStore();
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

  // Birthday state
  const birthdayLoading = ref(false);
  const todayBirthdays = ref([]);
  const upcomingBirthdays = ref([]);
  const isMyBirthday = ref(false);
  const myFullProfile = ref(null);

  const me = computed(() => {
    const u =
      authStore.user || JSON.parse(localStorage.getItem('user') || 'null');
    return u || {};
  });

  // Computed
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const userRole = computed(() => branchContextStore.userRole);

  // Display: For branch employees show Branch - Role; for department employees show Department - Role
  const headerOrgAndRole = computed(() => {
    const branchName = currentBranch.value?.name || null;
    const branchRole = userRole.value || null;
    const dept = authStore.userDepartment || null;
    const role = authStore.userRole || branchRole || 'User';

    if (branchName) {
      return `${branchName} - ${branchRole || role}`;
    }
    return `${dept || 'Department'} - ${role}`;
  });
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
    // Prefetch schedules for this branch or department (expanded range to include previous/next month)
    const branchId = currentBranch.value?.id;
    const now = new Date();
    // Expand date range to include previous and next month to show schedules near month boundaries
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const toYMD = (d) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(d));
    try {
      // For department employees (no branch), use department_employees=true
      // For branch employees, use branchId
      if (branchId) {
        await scheduleStore.fetchSchedules(branchId, toYMD(start), toYMD(end));
      } else {
        // Department employee - fetch schedules without branch requirement
        await scheduleStore.fetchSchedules(
          null,
          toYMD(start),
          toYMD(end),
          true
        );
      }
    } catch (e) {
      // non-blocking
      console.warn('Failed to prefetch schedules', e);
    }
  };

  // Prefetch schedules for inline calendar on load
  const prefetchMySchedule = async () => {
    const branchId = currentBranch.value?.id;
    const now = new Date();
    // Expand date range to include previous and next month to show schedules near month boundaries
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const toYMD = (d) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(d));
    try {
      // For department employees (no branch), use department_employees=true
      // For branch employees, use branchId
      if (branchId) {
        await scheduleStore.fetchSchedules(branchId, toYMD(start), toYMD(end));
      } else {
        // Department employee - fetch schedules without branch requirement
        await scheduleStore.fetchSchedules(
          null,
          toYMD(start),
          toYMD(end),
          true
        );
      }
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

  // Load birthdays
  const loadBirthdays = async () => {
    birthdayLoading.value = true;
    try {
      // Fetch user's full profile to get birthday
      try {
        myFullProfile.value = await authStore.fetchMyFullProfile();
      } catch (error) {
        console.warn('Failed to fetch user profile for birthday check:', error);
      }

      // Check if it's user's birthday
      if (myFullProfile.value?.birthday) {
        isMyBirthday.value = isMyBirthdayToday(myFullProfile.value.birthday);
      }

      // Fetch employees for birthday filtering
      const branchId = currentBranch.value?.id;
      const department = authStore.userDepartment;

      let employees = [];

      if (branchId) {
        // Branch employee - fetch only from their branch
        employees = await employeeStore.fetchEmployeesForBirthdays(
          branchId,
          null
        );
      } else if (department) {
        // Department employee - fetch from ALL departments (HR, SCM, Production, Finance, CRM) except Branch
        const departmentList = [
          'Human Resource',
          'SCM',
          'Production',
          'Finance',
          'CRM',
        ];

        // Fetch employees from all departments (using direct API call to avoid store loading state interference)
        const allEmployeesPromises = departmentList.map(async (dept) => {
          try {
            const response = await fetch(
              `${apiConfig.baseURL}/employees?department=${encodeURIComponent(dept)}`,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
              }
            );

            if (!response.ok) {
              console.warn(`Failed to fetch employees for department ${dept}`);
              return [];
            }

            const data = await response.json();
            if (data.success && data.data) {
              // Filter out System/Super Admin and deleted employees
              return data.data.filter((emp) => {
                const role = (emp.role || '').toLowerCase();
                return (
                  role !== 'system admin' &&
                  role !== 'super admin' &&
                  !emp.deleted_at
                );
              });
            }
            return [];
          } catch (error) {
            console.error(
              `Error fetching employees for department ${dept}:`,
              error
            );
            return [];
          }
        });

        const allEmployeesArrays = await Promise.all(allEmployeesPromises);
        employees = allEmployeesArrays.flat(); // Flatten the array of arrays
      }

      // Filter employees by birthdays
      const { todayBirthdays: today, upcomingBirthdays: upcoming } =
        getBirthdayEmployees(employees);

      todayBirthdays.value = today;
      upcomingBirthdays.value = upcoming;
    } catch (error) {
      console.error('Error loading birthdays:', error);
      // Non-blocking error, just log it
    } finally {
      birthdayLoading.value = false;
    }
  };

  // Get photo URL helper
  const getPhotoUrl = (photoUrl) => {
    if (!photoUrl) return null;
    return formatImageUrl(photoUrl);
  };

  // Check if there are any birthdays to show
  const hasBirthdays = computed(() => {
    return (
      todayBirthdays.value.length > 0 || upcomingBirthdays.value.length > 0
    );
  });

  // Check if we should show department info (for department employees viewing cross-department birthdays)
  const shouldShowDepartment = computed(() => {
    // Show department if user is a department employee (not a branch employee)
    return !currentBranch.value?.id && authStore.userDepartment;
  });

  // Initialize
  onMounted(() => {
    quickActions.value = getQuickActions();
    loadDashboardData();
    prefetchMySchedule();
    loadBirthdays();
  });
</script>

<template>
  <div class="space-y-6 p-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-primaryColor">Employee Dashboard</h1>
        <p class="text-gray-600 mt-1">
          {{ headerOrgAndRole }}
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
      <!-- Birthday Message Banner (only on user's birthday) -->
      <div
        v-if="isMyBirthday"
        class="bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg p-6 shadow-lg"
      >
        <div class="flex items-center gap-4">
          <div class="flex-shrink-0">
            <Cake class="w-12 h-12" />
          </div>
          <div class="flex-1">
            <h2 class="text-2xl font-bold mb-1">Happy Birthday! 🎉</h2>
            <p class="text-lg opacity-90">
              Wishing you a wonderful day filled with joy and happiness,
              {{ me?.first_name || me?.firstName || 'there' }}!
            </p>
          </div>
        </div>
      </div>

      <!-- Birthday Widget -->
      <div
        v-if="hasBirthdays || birthdayLoading"
        class="bg-white rounded-lg shadow-md p-4"
      >
        <div class="flex items-center gap-2 mb-4">
          <Gift class="w-5 h-5 text-primaryColor" />
          <h3 class="text-lg font-semibold text-gray-800">
            Employee Birthdays
          </h3>
        </div>

        <div v-if="birthdayLoading" class="flex justify-center py-4">
          <div
            class="loading loading-spinner loading-sm text-primaryColor"
          ></div>
        </div>

        <div v-else class="space-y-4">
          <!-- Today's Birthdays -->
          <div v-if="todayBirthdays.length > 0">
            <h4 class="text-sm font-medium text-gray-600 mb-2">Today</h4>
            <div class="space-y-2">
              <div
                v-for="employee in todayBirthdays"
                :key="employee.id"
                class="flex items-center gap-3 p-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <div class="avatar">
                  <div
                    class="w-10 h-10 rounded-full overflow-hidden bg-primaryColor/10"
                  >
                    <img
                      v-if="
                        employee.photo_url && getPhotoUrl(employee.photo_url)
                      "
                      :src="getPhotoUrl(employee.photo_url)"
                      :alt="`${employee.first_name} ${employee.last_name}`"
                      class="w-full h-full object-cover"
                      @error="(e) => (e.target.style.display = 'none')"
                    />
                    <div
                      v-else
                      class="w-10 h-10 flex items-center justify-center text-primaryColor font-semibold"
                    >
                      {{ (employee.first_name || 'E').charAt(0) }}
                    </div>
                  </div>
                </div>
                <div class="flex-1">
                  <div class="font-medium text-gray-800">
                    {{ employee.first_name }} {{ employee.last_name }}
                  </div>
                  <div class="text-xs text-gray-500">
                    <span v-if="employee.role">{{ employee.role }}</span>
                    <template
                      v-if="shouldShowDepartment && employee.department"
                    >
                      <span v-if="employee.role" class="mx-1">•</span>
                      <span class="font-medium text-gray-600">{{
                        employee.department
                      }}</span>
                    </template>
                    <template
                      v-else-if="
                        !shouldShowDepartment &&
                        !employee.role &&
                        employee.department
                      "
                    >
                      {{ employee.department }}
                    </template>
                  </div>
                </div>
                <div class="text-xs font-medium text-green-600">
                  {{ employee.birthdayDisplay }}
                </div>
              </div>
            </div>
          </div>

          <!-- Upcoming Birthdays -->
          <div v-if="upcomingBirthdays.length > 0">
            <h4 class="text-sm font-medium text-gray-600 mb-2">
              Upcoming This Week
            </h4>
            <div class="space-y-2">
              <div
                v-for="employee in upcomingBirthdays"
                :key="employee.id"
                class="flex items-center gap-3 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div class="avatar">
                  <div
                    class="w-10 h-10 rounded-full overflow-hidden bg-primaryColor/10"
                  >
                    <img
                      v-if="
                        employee.photo_url && getPhotoUrl(employee.photo_url)
                      "
                      :src="getPhotoUrl(employee.photo_url)"
                      :alt="`${employee.first_name} ${employee.last_name}`"
                      class="w-full h-full object-cover"
                      @error="(e) => (e.target.style.display = 'none')"
                    />
                    <div
                      v-else
                      class="w-10 h-10 flex items-center justify-center text-primaryColor font-semibold"
                    >
                      {{ (employee.first_name || 'E').charAt(0) }}
                    </div>
                  </div>
                </div>
                <div class="flex-1">
                  <div class="font-medium text-gray-800">
                    {{ employee.first_name }} {{ employee.last_name }}
                  </div>
                  <div class="text-xs text-gray-500">
                    <span v-if="employee.role">{{ employee.role }}</span>
                    <template
                      v-if="shouldShowDepartment && employee.department"
                    >
                      <span v-if="employee.role" class="mx-1">•</span>
                      <span class="font-medium text-gray-600">{{
                        employee.department
                      }}</span>
                    </template>
                    <template
                      v-else-if="
                        !shouldShowDepartment &&
                        !employee.role &&
                        employee.department
                      "
                    >
                      {{ employee.department }}
                    </template>
                  </div>
                </div>
                <div class="text-xs font-medium text-blue-600">
                  {{ employee.birthdayDisplay }}
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-if="!birthdayLoading && !hasBirthdays"
            class="text-center py-4 text-gray-500 text-sm"
          >
            No birthdays this week
          </div>
        </div>
      </div>

      <!-- My Schedule Calendar (inline) -->
      <EmployeeScheduleCalendar
        :inline="true"
        :employee="{
          id: me?.id,
          first_name: me?.first_name || me?.firstName || '',
          last_name: me?.last_name || me?.lastName || '',
        }"
        :branch-id="currentBranch?.id || null"
        :schedules="scheduleStore.schedules"
        :show-shift-label="false"
      />
    </div>
  </div>

  <!-- Calendar modal removed; shown inline above -->
</template>

<style scoped></style>
