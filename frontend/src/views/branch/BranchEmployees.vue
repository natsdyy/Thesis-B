<script setup>
  import { ref, computed, onMounted } from 'vue';
  import {
    Users,
    Search,
    Filter,
    RefreshCcw,
    Eye,
    Edit,
    UserCheck,
    UserX,
    Clock,
    Calendar,
    Phone,
    Mail,
    MapPin,
    BadgeCheck,
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { useEmployeeStore } from '../../stores/employeeStore.js';
  import { useAttendanceStore } from '../../stores/attendanceStore';
  import { apiConfig } from '../../config/api';
  import EmployeeScheduleComponent from '../../components/branch/EmployeeScheduleComponent.vue';

  const branchContextStore = useBranchContextStore();
  const employeeStore = useEmployeeStore();
  const attendanceStore = useAttendanceStore();

  // Local state following EmployeeManager pattern
  const searchQuery = ref('');
  const departmentFilter = ref('');
  const statusFilter = ref('');
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const loading = ref(false);
  const activeTab = ref('overview');

  const branchEmployees = ref([]);
  const employeeStats = ref({
    totalEmployees: 0,
    activeEmployees: 0,
    onDutyEmployees: 0,
    onLeaveEmployees: 0,
  });

  // Computed
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const userRole = computed(() => branchContextStore.userRole);
  const canManageEmployees = computed(
    () => branchContextStore.canAccessEmployees
  );

  const filteredEmployees = computed(() => {
    let employees = branchEmployees.value;

    // Filter by search query
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      employees = employees.filter(
        (emp) =>
          emp.first_name.toLowerCase().includes(query) ||
          emp.last_name.toLowerCase().includes(query) ||
          emp.email.toLowerCase().includes(query) ||
          emp.role.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter.value) {
      employees = employees.filter((emp) => emp.status === statusFilter.value);
    }

    return employees;
  });

  const paginatedEmployees = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return filteredEmployees.value.slice(start, end);
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredEmployees.value.length / itemsPerPage.value);
  });

  // Methods
  const resolvePhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    // If already absolute (http/https/blob), return as-is
    if (/^(https?:)?\/\//i.test(photoPath) || photoPath.startsWith('blob:')) {
      return photoPath;
    }
    // Build from backend base (strip trailing /api if present)
    const backendBase = (apiConfig.baseURL || '').replace(/\/?api\/?$/, '');
    return `${backendBase}${photoPath}`;
  };
  const getStatusBadge = (status) => {
    const badges = {
      Active: { class: 'bg-success/20 text-success', text: 'Active' },
      'On Leave': { class: 'bg-warning/20 text-warning', text: 'On Leave' },
      Inactive: { class: 'bg-error/20 text-error', text: 'Inactive' },
    };
    return (
      badges[status] || { class: 'bg-gray-500/20 text-gray-500', text: status }
    );
  };

  const loadBranchEmployees = async () => {
    loading.value = true;

    try {
      // Fetch real employees from API via Pinia store
      // Grab a large page to cover typical branch sizes; pagination UI can be added later
      await employeeStore.fetchEmployees(false, 1, 500, false);

      const branchId = branchContextStore.currentBranch?.id || null;
      const all = Array.isArray(employeeStore.employees)
        ? employeeStore.employees
        : [];

      // Filter by current branch; fallback to all if branch not set
      const byBranch = branchId
        ? all.filter((e) => e.branch_id === branchId)
        : all;

      // Fetch today's attendance records for all employees (full-day window)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const startIso = startOfDay.toISOString();
      const endIso = endOfDay.toISOString();

      const attendanceReport = await attendanceStore.getAttendanceReport(
        null,
        startIso,
        endIso
      );
      const todaysRecords = Array.isArray(attendanceReport)
        ? attendanceReport
        : [];

      // Build latest record per employee for accurate on-duty computation
      const latestByEmployeeKey = {};
      const toMillis = (rec) => {
        const fallback = rec.created_at || rec.time_in || rec.time_out;
        const preferred = rec.time_out || rec.time_in || fallback;
        return preferred ? new Date(preferred).getTime() : 0;
      };
      todaysRecords.forEach((rec) => {
        const key = String(rec.employee_id);
        const current = latestByEmployeeKey[key];
        if (!current || toMillis(rec) > toMillis(current)) {
          latestByEmployeeKey[key] = rec;
        }
      });

      // Map to view model fields used in template and merge attendance
      const mapped = byBranch.map((e) => {
        const record =
          latestByEmployeeKey[String(e.id)] ||
          latestByEmployeeKey[String(e.employee_id)];
        const isOnLeave = (e.status || '').toLowerCase() === 'on leave';
        let attendanceToday = 'Absent';
        let isOnDuty = false;
        if (isOnLeave) {
          attendanceToday = 'On Leave';
        } else if (record) {
          // If timed in today, mark Present; if timed out exists, still Present but not on duty
          const hasTimeIn = Boolean(record.time_in);
          const hasTimeOut = Boolean(record.time_out);
          if (hasTimeIn) {
            attendanceToday = 'Present';
            isOnDuty = !hasTimeOut;
          }
        }

        return {
          id: e.id,
          employee_id: e.employee_id,
          first_name: e.first_name,
          last_name: e.last_name,
          photo_url: e.photo_url,
          email: e.email,
          phone: e.phone_number,
          role: e.role || e.job_title || 'Staff',
          department: e.department,
          status: e.status || (e.is_active ? 'Active' : 'Inactive'),
          hire_date: e.created_at,
          last_login: e.last_login,
          attendance_today: attendanceToday,
          _on_duty: isOnDuty,
        };
      });

      branchEmployees.value = mapped;

      employeeStats.value = {
        totalEmployees: mapped.length,
        activeEmployees: mapped.filter((emp) => emp.status === 'Active').length,
        onDutyEmployees: mapped.filter((emp) => emp._on_duty).length,
        onLeaveEmployees: mapped.filter((emp) => emp.status === 'On Leave')
          .length,
      };
    } catch (error) {
      console.error('Error loading branch employees:', error);
    } finally {
      loading.value = false;
    }
  };

  const refreshEmployees = () => {
    loadBranchEmployees();
  };

  const viewEmployee = (employee) => {
    // TODO: Implement view employee details
    console.log('View employee:', employee);
  };

  const editEmployee = (employee) => {
    // TODO: Implement edit employee
    console.log('Edit employee:', employee);
  };

  // Initialize
  onMounted(() => {
    loadBranchEmployees();
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-primaryColor">
          Employee Management
        </h1>
        <p class="text-gray-600 mt-1">
          {{ currentBranch?.name }} - Staff Management
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <button
          @click="refreshEmployees"
          :disabled="loading"
          class="btn btn-outline text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white"
        >
          <RefreshCcw :class="['w-4 h-4 mr-2', { 'animate-spin': loading }]" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Access Control Check -->
    <div v-if="!canManageEmployees" class="alert alert-warning">
      <UserX class="w-5 h-5" />
      <span
        >You don't have permission to manage employees. Contact your
        administrator for access.</span
      >
    </div>

    <div v-else class="space-y-6">
      <!-- Tabs -->
      <div
        class="tabs tabs-boxed mb-4 sm:mb-6 justify-center sm:justify-start w-full"
      >
        <button
          @click="activeTab = 'overview'"
          class="tab flex-1 sm:flex-none"
          :class="{ 'tab-active': activeTab === 'overview' }"
        >
          <Users class="w-4 h-4 mr-1 sm:mr-2" />
          <span class="hidden xs:inline">Overview</span>
          <span class="xs:hidden">Overview</span>
        </button>
        <button
          @click="activeTab = 'schedules'"
          class="tab flex-1 sm:flex-none"
          :class="{ 'tab-active': activeTab === 'schedules' }"
        >
          <Calendar class="w-4 h-4 mr-1 sm:mr-2" />
          <span class="hidden xs:inline">Schedules</span>
          <span class="xs:hidden">Schedules</span>
        </button>
        <button
          @click="activeTab = 'overtime'"
          class="tab flex-1 sm:flex-none"
          :class="{ 'tab-active': activeTab === 'overtime' }"
        >
          <BadgeCheck class="w-4 h-4 mr-1 sm:mr-2" />
          <span class="hidden xs:inline">Overtime Approvals</span>
          <span class="xs:hidden">Overtime</span>
        </button>
      </div>

      <!-- Overview Tab -->
      <template v-if="activeTab === 'overview'">
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Total Staff</p>
                  <p class="text-2xl font-bold text-primaryColor">
                    {{ employeeStats.totalEmployees }}
                  </p>
                </div>
                <div class="p-3 bg-primaryColor/10 rounded-full">
                  <Users class="w-6 h-6 text-primaryColor" />
                </div>
              </div>
            </div>
          </div>

          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Active</p>
                  <p class="text-2xl font-bold text-primaryColor">
                    {{ employeeStats.activeEmployees }}
                  </p>
                </div>
                <div class="p-3 bg-primaryColor/10 rounded-full">
                  <UserCheck class="w-6 h-6 text-primaryColor" />
                </div>
              </div>
            </div>
          </div>

          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">On Duty</p>
                  <p class="text-2xl font-bold text-gray-600">
                    {{ employeeStats.onDutyEmployees }}
                  </p>
                </div>
                <div class="p-3 bg-gray-600/10 rounded-full">
                  <Clock class="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </div>
          </div>

          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">On Leave</p>
                  <p class="text-2xl font-bold text-warning">
                    {{ employeeStats.onLeaveEmployees }}
                  </p>
                </div>
                <div class="p-3 bg-warning/10 rounded-full">
                  <Calendar class="w-6 h-6 text-warning" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Search and Filters -->
        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <div class="flex flex-col md:flex-row gap-4">
              <!-- Search -->
              <div class="flex-1">
                <div class="relative">
                  <Search
                    class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                  />
                  <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Search employees..."
                    class="input input-bordered w-full pl-10"
                  />
                </div>
              </div>

              <!-- Status Filter -->
              <select v-model="statusFilter" class="select select-bordered">
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Employee List -->
        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <h2 class="card-title text-primaryColor mb-4">
              <Users class="w-5 h-5" />
              Branch Staff
            </h2>

            <!-- Loading State -->
            <div v-if="loading" class="flex justify-center items-center py-12">
              <div
                class="loading loading-spinner loading-lg text-primaryColor"
              ></div>
            </div>

            <!-- Employee Table -->
            <div v-else-if="paginatedEmployees.length > 0" class="space-y-4">
              <div class="overflow-x-auto">
                <table class="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Position</th>
                      <th>Contact</th>

                      <th>Attendance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="employee in paginatedEmployees"
                      :key="employee.id"
                    >
                      <td>
                        <div class="flex items-center space-x-3">
                          <template v-if="resolvePhotoUrl(employee.photo_url)">
                            <img
                              :src="resolvePhotoUrl(employee.photo_url)"
                              alt="employee avatar"
                              class="w-10 h-10 rounded-full object-cover"
                            />
                          </template>
                          <template v-else>
                            <div
                              class="w-10 h-10 bg-primaryColor text-white rounded-full flex items-center justify-center font-semibold"
                            >
                              {{ employee.first_name.charAt(0)
                              }}{{ employee.last_name.charAt(0) }}
                            </div>
                          </template>
                          <div>
                            <div class="font-semibold">
                              {{ employee.first_name }} {{ employee.last_name }}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="font-medium">
                          {{ employee.role }}
                        </div>
                      </td>
                      <td>
                        <div class="text-sm">
                          <div class="flex items-center mb-1">
                            <Mail class="w-3 h-3 mr-1 text-gray-400" />
                            {{ employee.email }}
                          </div>
                          <div class="flex items-center">
                            <Phone class="w-3 h-3 mr-1 text-gray-400" />
                            {{ employee.phone }}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div class="flex items-center">
                          <div
                            :class="[
                              'w-2 h-2 rounded-full mr-2',
                              employee.attendance_today === 'Present'
                                ? 'bg-success'
                                : employee.attendance_today === 'On Leave'
                                  ? 'bg-warning'
                                  : 'bg-error',
                            ]"
                          ></div>
                          <span class="text-sm">{{
                            employee.attendance_today
                          }}</span>
                        </div>
                      </td>
                      <td>
                        <div
                          :class="[
                            'badge badge-sm border-none font-medium',
                            getStatusBadge(employee.status).class,
                          ]"
                        >
                          {{ getStatusBadge(employee.status).text }}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Pagination -->
              <div class="flex justify-center mt-6">
                <div class="join">
                  <button
                    :disabled="currentPage === 1"
                    @click="currentPage--"
                    class="join-item btn"
                  >
                    «
                  </button>
                  <button class="join-item btn">
                    Page {{ currentPage }} of {{ totalPages }}
                  </button>
                  <button
                    :disabled="currentPage === totalPages"
                    @click="currentPage++"
                    class="join-item btn"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-12">
              <Users class="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 class="text-lg font-medium text-gray-900 mb-2">
                No employees found
              </h3>
              <p class="text-gray-600">Try adjusting your search criteria</p>
            </div>
          </div>
        </div>
      </template>

      <!-- Schedules Tab -->
      <template v-else-if="activeTab === 'schedules'">
        <EmployeeScheduleComponent
          :employees="branchEmployees"
          :branch-id="currentBranch?.id"
          @schedule-updated="refreshEmployees"
        />
      </template>

      <!-- Overtime Approvals Tab -->
      <template v-else>
        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <h2 class="card-title text-primaryColor mb-2">
              <BadgeCheck class="w-5 h-5" />
              Overtime Approvals
            </h2>
            <p class="text-gray-600">
              Review, approve, or reject overtime requests submitted by branch
              staff.
            </p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
  /* Following EmployeeManager.vue patterns */
  /* .table th {
    @apply bg-gray-50 text-gray-700 font-medium;
  }

  .table tr:hover {
    @apply bg-gray-50;
  }

  .badge {
    @apply text-xs;
  }

  .card {
    @apply transition-shadow duration-200;
  }

  .card:hover {
    @apply shadow-xl;
  } */
</style>
