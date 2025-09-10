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

  const branchContextStore = useBranchContextStore();

  // Local state following EmployeeManager pattern
  const searchQuery = ref('');
  const departmentFilter = ref('');
  const statusFilter = ref('');
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const loading = ref(false);

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
  const getStatusBadge = (status) => {
    const badges = {
      Active: { class: 'badge-success', text: 'Active' },
      'On Leave': { class: 'badge-warning', text: 'On Leave' },
      Inactive: { class: 'badge-error', text: 'Inactive' },
    };
    return badges[status] || { class: 'badge-ghost', text: status };
  };

  const loadBranchEmployees = async () => {
    loading.value = true;

    try {
      // TODO: Fetch real employee data from API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock data
      branchEmployees.value = [
        {
          id: 1,
          employee_id: 'EMP001',
          first_name: 'Maria',
          last_name: 'Santos',
          email: 'maria.santos@branch.com',
          phone: '+63 912 345 6789',
          role: 'Manager',
          department: 'Branch',
          status: 'Active',
          hire_date: '2023-01-15',
          last_login: '2024-01-15T14:30:00Z',
          attendance_today: 'Present',
        },
        {
          id: 2,
          employee_id: 'EMP002',
          first_name: 'Juan',
          last_name: 'Dela Cruz',
          email: 'juan.delacruz@branch.com',
          phone: '+63 912 345 6790',
          role: 'Cashier',
          department: 'Branch',
          status: 'Active',
          hire_date: '2023-03-20',
          last_login: '2024-01-15T13:45:00Z',
          attendance_today: 'Present',
        },
        {
          id: 3,
          employee_id: 'EMP003',
          first_name: 'Ana',
          last_name: 'Rodriguez',
          email: 'ana.rodriguez@branch.com',
          phone: '+63 912 345 6791',
          role: 'Cook',
          department: 'Branch',
          status: 'Active',
          hire_date: '2023-05-10',
          last_login: '2024-01-15T12:00:00Z',
          attendance_today: 'Present',
        },
        {
          id: 4,
          employee_id: 'EMP004',
          first_name: 'Pedro',
          last_name: 'Garcia',
          email: 'pedro.garcia@branch.com',
          phone: '+63 912 345 6792',
          role: 'Waiter',
          department: 'Branch',
          status: 'On Leave',
          hire_date: '2023-07-01',
          last_login: '2024-01-14T18:00:00Z',
          attendance_today: 'On Leave',
        },
      ];

      // Calculate stats
      employeeStats.value = {
        totalEmployees: branchEmployees.value.length,
        activeEmployees: branchEmployees.value.filter(
          (emp) => emp.status === 'Active'
        ).length,
        onDutyEmployees: branchEmployees.value.filter(
          (emp) => emp.attendance_today === 'Present'
        ).length,
        onLeaveEmployees: branchEmployees.value.filter(
          (emp) => emp.status === 'On Leave'
        ).length,
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
              <div class="p-3 bg-blue-100 rounded-full">
                <Users class="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">Active</p>
                <p class="text-2xl font-bold text-green-600">
                  {{ employeeStats.activeEmployees }}
                </p>
              </div>
              <div class="p-3 bg-green-100 rounded-full">
                <UserCheck class="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">On Duty</p>
                <p class="text-2xl font-bold text-blue-600">
                  {{ employeeStats.onDutyEmployees }}
                </p>
              </div>
              <div class="p-3 bg-blue-100 rounded-full">
                <Clock class="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-600">On Leave</p>
                <p class="text-2xl font-bold text-orange-600">
                  {{ employeeStats.onLeaveEmployees }}
                </p>
              </div>
              <div class="p-3 bg-orange-100 rounded-full">
                <Calendar class="w-6 h-6 text-orange-600" />
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
              <table class="table w-full">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Role</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Attendance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="employee in paginatedEmployees" :key="employee.id">
                    <td>
                      <div class="flex items-center space-x-3">
                        <div
                          class="w-10 h-10 bg-primaryColor text-white rounded-full flex items-center justify-center font-semibold"
                        >
                          {{ employee.first_name.charAt(0)
                          }}{{ employee.last_name.charAt(0) }}
                        </div>
                        <div>
                          <div class="font-semibold">
                            {{ employee.first_name }} {{ employee.last_name }}
                          </div>
                          <div class="text-sm text-gray-500">
                            {{ employee.employee_id }}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="badge badge-outline">{{ employee.role }}</div>
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
                      <div
                        :class="[
                          'badge',
                          getStatusBadge(employee.status).class,
                        ]"
                      >
                        {{ getStatusBadge(employee.status).text }}
                      </div>
                    </td>
                    <td>
                      <div class="flex items-center">
                        <div
                          :class="[
                            'w-2 h-2 rounded-full mr-2',
                            employee.attendance_today === 'Present'
                              ? 'bg-green-500'
                              : employee.attendance_today === 'On Leave'
                                ? 'bg-orange-500'
                                : 'bg-red-500',
                          ]"
                        ></div>
                        <span class="text-sm">{{
                          employee.attendance_today
                        }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="flex items-center space-x-2">
                        <button
                          @click="viewEmployee(employee)"
                          class="btn btn-sm btn-ghost"
                          title="View Details"
                        >
                          <Eye class="w-4 h-4" />
                        </button>
                        <button
                          @click="editEmployee(employee)"
                          class="btn btn-sm btn-ghost"
                          title="Edit Employee"
                        >
                          <Edit class="w-4 h-4" />
                        </button>
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
