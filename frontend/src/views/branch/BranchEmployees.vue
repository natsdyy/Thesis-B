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
    Check,
    X,
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { useEmployeeStore } from '../../stores/employeeStore.js';
  import { useAttendanceStore } from '../../stores/attendanceStore';
  import { apiConfig } from '../../config/api';
  import { useOvertimeStore } from '../../stores/overtimeStore';
  import EmployeeScheduleComponent from '../../components/branch/EmployeeScheduleComponent.vue';

  const branchContextStore = useBranchContextStore();
  const employeeStore = useEmployeeStore();
  const attendanceStore = useAttendanceStore();
  const overtimeStore = useOvertimeStore();

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

  // OT requests from API
  const otRequests = ref([]);
  const API_BASE_URL = apiConfig.baseURL;

  const otStats = ref({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    totalOvertimeHours: 0,
  });

  // Modal states
  const showApprovalModal = ref(false);
  const showRejectionModal = ref(false);
  const selectedRequest = ref(null);
  const isProcessing = ref(false);
  const rejectionNotes = ref('');

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

  // OT Approval computed properties
  const filteredOtRequests = computed(() => {
    let requests = otRequests.value;

    // Filter by status if needed
    if (statusFilter.value && statusFilter.value !== '') {
      requests = requests.filter((req) => req.status === statusFilter.value);
    }

    // Filter by search query
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      requests = requests.filter(
        (req) =>
          req.employee_name.toLowerCase().includes(query) ||
          req.employee_role.toLowerCase().includes(query) ||
          req.reason.toLowerCase().includes(query)
      );
    }

    return requests;
  });

  const pendingOtRequests = computed(() => {
    return otRequests.value.filter((req) => req.status === 'pending');
  });

  const approvedOtRequests = computed(() => {
    return otRequests.value.filter((req) => req.status === 'approved');
  });

  const rejectedOtRequests = computed(() => {
    return otRequests.value.filter((req) => req.status === 'rejected');
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
          // Mark Present/Late only if currently on duty today (time-in exists, no time-out, and same local date)
          const hasTimeIn = Boolean(record.time_in);
          const hasTimeOut = Boolean(record.time_out);
          if (hasTimeIn && !hasTimeOut) {
            const timeInLocalDate = new Date(record.time_in).toLocaleDateString(
              'en-CA'
            );
            const todayLocalDate = new Date().toLocaleDateString('en-CA');
            if (timeInLocalDate === todayLocalDate) {
              const status = (record.status || '').toLowerCase();
              attendanceToday = status === 'late' ? 'Late' : 'Present';
              isOnDuty = true;
            }
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

  // OT Approval methods
  const updateOtStats = () => {
    otStats.value = {
      totalRequests: otRequests.value.length,
      pendingRequests: pendingOtRequests.value.length,
      approvedRequests: approvedOtRequests.value.length,
      rejectedRequests: rejectedOtRequests.value.length,
      totalOvertimeHours: approvedOtRequests.value.reduce(
        (sum, req) => sum + req.total_hours,
        0
      ),
    };
  };

  const loadOtRequests = async () => {
    await overtimeStore.fetchRequests({
      branch_id: currentBranch?.value?.id,
      page: 1,
      limit: 100,
    });
    otRequests.value = overtimeStore.requests;
    updateOtStats();
  };

  const openApprovalModal = (requestId) => {
    selectedRequest.value = otRequests.value.find(
      (req) => req.id === requestId
    );
    showApprovalModal.value = true;
  };

  const openRejectionModal = (requestId) => {
    selectedRequest.value = otRequests.value.find(
      (req) => req.id === requestId
    );
    rejectionNotes.value = '';
    showRejectionModal.value = true;
  };

  const approveOtRequest = async () => {
    if (!selectedRequest.value) return;

    try {
      isProcessing.value = true;
      await overtimeStore.approve(
        selectedRequest.value.id,
        selectedRequest.value.notes || ''
      );
      await loadOtRequests();

      showApprovalModal.value = false;
      selectedRequest.value = null;
    } catch (error) {
      console.error('Error approving OT request:', error);
    } finally {
      isProcessing.value = false;
    }
  };

  const rejectOtRequest = async () => {
    if (!selectedRequest.value) return;

    try {
      isProcessing.value = true;
      await overtimeStore.reject(
        selectedRequest.value.id,
        rejectionNotes.value || ''
      );
      await loadOtRequests();

      showRejectionModal.value = false;
      selectedRequest.value = null;
      rejectionNotes.value = '';
    } catch (error) {
      console.error('Error rejecting OT request:', error);
    } finally {
      isProcessing.value = false;
    }
  };

  const closeModals = () => {
    showApprovalModal.value = false;
    showRejectionModal.value = false;
    selectedRequest.value = null;
    rejectionNotes.value = '';
    isProcessing.value = false;
  };

  const getStatusBadgeClass = (status) => {
    const badges = {
      pending: 'bg-warning/20 text-warning',
      approved: 'bg-success/20 text-success',
      rejected: 'bg-error/20 text-error',
    };
    return badges[status] || 'bg-gray-500/20 text-gray-500';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Initialize
  onMounted(() => {
    loadBranchEmployees();
    loadOtRequests();
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
                                  : employee.attendance_today === 'Late'
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
        <!-- OT Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Total Requests</p>
                  <p class="text-2xl font-bold text-primaryColor">
                    {{ otStats.totalRequests }}
                  </p>
                </div>
                <div class="p-3 bg-primaryColor/10 rounded-full">
                  <BadgeCheck class="w-6 h-6 text-primaryColor" />
                </div>
              </div>
            </div>
          </div>

          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Pending</p>
                  <p class="text-2xl font-bold text-warning">
                    {{ otStats.pendingRequests }}
                  </p>
                </div>
                <div class="p-3 bg-warning/10 rounded-full">
                  <Clock class="w-6 h-6 text-warning" />
                </div>
              </div>
            </div>
          </div>

          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Approved</p>
                  <p class="text-2xl font-bold text-success">
                    {{ otStats.approvedRequests }}
                  </p>
                </div>
                <div class="p-3 bg-success/10 rounded-full">
                  <UserCheck class="w-6 h-6 text-success" />
                </div>
              </div>
            </div>
          </div>

          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600">Total OT Hours</p>
                  <p class="text-2xl font-bold text-gray-600">
                    {{ otStats.totalOvertimeHours }}h
                  </p>
                </div>
                <div class="p-3 bg-gray-600/10 rounded-full">
                  <Calendar class="w-6 h-6 text-gray-600" />
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
                    placeholder="Search OT requests..."
                    class="input input-bordered w-full pl-10"
                  />
                </div>
              </div>

              <!-- Status Filter -->
              <select v-model="statusFilter" class="select select-bordered">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <!-- OT Requests Table -->
        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <h2 class="card-title text-primaryColor mb-4">
              <BadgeCheck class="w-5 h-5" />
              Overtime Requests
            </h2>

            <!-- Loading State -->
            <div v-if="loading" class="flex justify-center items-center py-12">
              <div
                class="loading loading-spinner loading-lg text-primaryColor"
              ></div>
            </div>

            <!-- OT Requests Table -->
            <div
              v-else-if="filteredOtRequests.length > 0"
              class="overflow-x-auto"
            >
              <table class="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Hours</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="request in filteredOtRequests" :key="request.id">
                    <td>
                      <div>
                        <div class="font-semibold">
                          {{ request.employee_name }}
                        </div>
                        <div class="text-sm text-gray-500">
                          {{ request.employee_role }}
                        </div>
                      </div>
                    </td>
                    <td>{{ formatDate(request.date) }}</td>
                    <td>
                      <div class="text-sm">
                        <div>
                          {{ formatTime(request.start_time) }} -
                          {{ formatTime(request.end_time) }}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="font-mono text-sm"
                        >{{ request.total_hours }}h</span
                      >
                    </td>
                    <td>
                      <div class="max-w-xs truncate" :title="request.reason">
                        {{ request.reason }}
                      </div>
                    </td>
                    <td>
                      <div
                        :class="[
                          'badge badge-sm border-none font-medium',
                          getStatusBadgeClass(request.status),
                        ]"
                      >
                        {{
                          request.status.charAt(0).toUpperCase() +
                          request.status.slice(1)
                        }}
                      </div>
                    </td>
                    <td>
                      <div class="flex space-x-2">
                        <button
                          v-if="request.status === 'pending'"
                          title="Approve"
                          @click="openApprovalModal(request.id)"
                          class="btn btn-xs bg-success/10 rounded-full font-thin shadow-none border border-none hover:bg-success/30 text-success"
                        >
                          <Check class="w-4 h-4" />
                        </button>
                        <button
                          v-if="request.status === 'pending'"
                          title="Reject"
                          @click="openRejectionModal(request.id)"
                          class="btn btn-xs bg-error/10 rounded-full font-thin shadow-none border border-none hover:bg-error/30 text-error"
                        >
                          <X class="w-4 h-4" />
                        </button>
                        <button
                          v-if="request.status !== 'pending'"
                          class="btn btn-sm btn-ghost"
                          :title="request.notes || ''"
                          disabled
                        >
                          {{ request.approved_by || '—' }}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-12">
              <BadgeCheck class="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 class="text-lg font-medium text-gray-900 mb-2">
                No overtime requests found
              </h3>
              <p class="text-gray-600">Try adjusting your search criteria</p>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Approval Confirmation Modal -->
    <div v-if="showApprovalModal" class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          <UserCheck class="w-5 h-5 inline mr-2" />
          Approve Overtime Request
        </h3>

        <div v-if="selectedRequest" class="space-y-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h4 class="font-semibold">
                  {{ selectedRequest.employee_name }}
                </h4>
                <p class="text-sm text-gray-600">
                  {{ selectedRequest.employee_role }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium">
                  {{ formatDate(selectedRequest.date) }}
                </p>
                <p class="text-sm text-gray-600">
                  {{ formatTime(selectedRequest.start_time) }} -
                  {{ formatTime(selectedRequest.end_time) }}
                </p>
              </div>
            </div>
            <div class="mt-2">
              <span class="badge badge-sm bg-primaryColor/10 text-primaryColor"
                >{{ selectedRequest.total_hours }} hours</span
              >
            </div>
            <div class="mt-3">
              <p class="text-sm text-gray-700">
                <strong>Reason:</strong> {{ selectedRequest.reason }}
              </p>
            </div>
          </div>

          <div class="alert bg-primaryColor/10 text-primaryColor">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              ></path>
            </svg>
            <span class="text-sm"
              >Are you sure you want to approve this overtime request?</span
            >
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeModals"
            class="btn btn-ghost btn-sm font-thin shadow-none border border-none hover:bg-primaryColor/10"
            :disabled="isProcessing"
          >
            Cancel
          </button>
          <button
            @click="approveOtRequest"
            class="btn bg-primaryColor font-thin text-white btn-sm shadow-none border border-none hover:bg-primaryColor/80"
            :disabled="isProcessing"
          >
            <span
              v-if="isProcessing"
              class="loading loading-spinner loading-sm mr-2"
            ></span>
            <UserCheck v-else class="w-4 h-4 mr-2" />
            {{ isProcessing ? 'Approving...' : 'Approve Request' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Rejection Confirmation Modal -->
    <div v-if="showRejectionModal" class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4 text-error">
          <UserX class="w-5 h-5 inline mr-2" />
          Reject Overtime Request
        </h3>

        <div v-if="selectedRequest" class="space-y-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h4 class="font-semibold">
                  {{ selectedRequest.employee_name }}
                </h4>
                <p class="text-sm text-gray-600">
                  {{ selectedRequest.employee_role }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium">
                  {{ formatDate(selectedRequest.date) }}
                </p>
                <p class="text-sm text-gray-600">
                  {{ formatTime(selectedRequest.start_time) }} -
                  {{ formatTime(selectedRequest.end_time) }}
                </p>
              </div>
            </div>
            <div class="mt-2">
              <span class="badge badge-sm bg-primaryColor/10 text-primaryColor"
                >{{ selectedRequest.total_hours }} hours</span
              >
            </div>
            <div class="mt-3">
              <p class="text-sm text-gray-700">
                <strong>Reason:</strong> {{ selectedRequest.reason }}
              </p>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Rejection Notes (Optional)</span>
            </label>
            <textarea
              v-model="rejectionNotes"
              class="textarea textarea-bordered w-full"
              rows="3"
              placeholder="Provide feedback on why this request is being rejected..."
            ></textarea>
          </div>

          <div class="alert bg-warning/10 text-warning">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              ></path>
            </svg>
            <span class="text-sm"
              >Are you sure you want to reject this overtime request?</span
            >
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeModals"
            class="btn btn-ghost btn-sm font-thin shadow-none border border-none hover:bg-gray-100"
            :disabled="isProcessing"
          >
            Cancel
          </button>
          <button
            @click="rejectOtRequest"
            class="btn btn-error text-white btn-sm shadow-none border border-none hover:bg-error/80 font-thin"
            :disabled="isProcessing"
          >
            <span
              v-if="isProcessing"
              class="loading loading-spinner loading-sm mr-2"
            ></span>
            <UserX v-else class="w-4 h-4 mr-2" />
            {{ isProcessing ? 'Rejecting...' : 'Reject Request' }}
          </button>
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
