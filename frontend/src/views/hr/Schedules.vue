<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import {
    Calendar,
    Clock,
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    User,
    Users,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    AlertCircle,
    Settings,
    Building2,
    Search,
    Filter,
  } from 'lucide-vue-next';
  import { useCustomToast } from '../../composables/useCustomToast';
  import { useEmployeeScheduleStore } from '../../stores/employeeScheduleStore';
  import { useShiftTypesStore } from '../../stores/shiftTypesStore';
  import { useEmployeeStore } from '../../stores/employeeStore';
  import { useLeaveStore } from '../../stores/leaveStore';
  import ShiftManagementModal from '../../components/branch/ShiftManagementModal.vue';

  const { showSuccess, showError, showWarning, showInfo } = useCustomToast();
  const scheduleStore = useEmployeeScheduleStore();
  const shiftTypesStore = useShiftTypesStore();
  const employeeStore = useEmployeeStore();
  const leaveStore = useLeaveStore();

  // Local state
  const currentWeek = ref(new Date());
  const showAddShiftModal = ref(false);
  const showEditShiftModal = ref(false);
  const showDeleteConfirmModal = ref(false);
  const showShiftManagementModal = ref(false);
  const selectedEmployee = ref(null);
  const selectedDate = ref(null);
  const editingShift = ref(null);
  const shiftToDelete = ref(null);
  const loading = ref(false);

  // Search and filters
  const searchQuery = ref('');
  const departmentFilter = ref('');

  // Pagination
  const currentPage = ref(1);
  const itemsPerPage = ref(10);

  // Data
  const allEmployees = ref([]);
  const departments = ref([
    'Human Resource',
    'Finance',
    'Supply Chain',
    'Production',
    'Customer Relationship',
  ]);

  // Form data for adding/editing shifts
  const shiftForm = ref({
    employeeId: null,
    branchId: null,
    date: '',
    shiftId: null,
    notes: '',
  });

  // Computed from store
  const shifts = computed(() => shiftTypesStore.getActiveShiftTypes);

  // Computed properties
  const weekDays = computed(() => {
    const days = [];
    const startOfWeek = new Date(currentWeek.value);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      // Format date as YYYY-MM-DD in local timezone to avoid UTC conversion issues
      const year = day.getFullYear();
      const month = String(day.getMonth() + 1).padStart(2, '0');
      const dayOfMonth = String(day.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${dayOfMonth}`;

      days.push({
        date: day,
        dateString: dateString,
        dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: day.getDate(),
        isToday: day.toDateString() === new Date().toDateString(),
        isPast:
          day < new Date() &&
          !day.toDateString().includes(new Date().toDateString()),
      });
    }
    return days;
  });

  const currentWeekString = computed(() => {
    const start = weekDays.value[0];
    const end = weekDays.value[6];
    return `${start.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  });

  // Filtered employees based on search and filters
  const filteredEmployees = computed(() => {
    let filtered = allEmployees.value;

    // Apply search filter
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.first_name?.toLowerCase().includes(query) ||
          emp.last_name?.toLowerCase().includes(query) ||
          emp.role?.toLowerCase().includes(query) ||
          emp.department?.toLowerCase().includes(query)
      );
    }

    // Apply department filter
    if (departmentFilter.value) {
      filtered = filtered.filter(
        (emp) => emp.department === departmentFilter.value
      );
    }

    return filtered;
  });

  // Paginated employees for display
  const paginatedEmployees = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return filteredEmployees.value.slice(start, end);
  });

  // Total pages for pagination
  const totalPages = computed(() => {
    return Math.ceil(filteredEmployees.value.length / itemsPerPage.value);
  });

  // Pagination info
  const paginationInfo = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value + 1;
    const end = Math.min(
      currentPage.value * itemsPerPage.value,
      filteredEmployees.value.length
    );
    return {
      start,
      end,
      total: filteredEmployees.value.length,
    };
  });

  const employeeSchedules = computed(() => {
    const result = {};
    paginatedEmployees.value.forEach((emp) => {
      result[emp.id] = {
        ...emp,
        schedules: scheduleStore.getSchedulesForWeek(emp.id, weekDays.value),
      };
    });
    return result;
  });

  // Methods
  const navigateWeek = async (direction) => {
    const newWeek = new Date(currentWeek.value);
    newWeek.setDate(newWeek.getDate() + direction * 7);
    currentWeek.value = newWeek;

    // Load leave data for the new week
    const startDate = weekDays.value[0].dateString;
    const endDate = weekDays.value[6].dateString;

    try {
      await leaveStore.fetchAllLeaveRequests({
        page: 1,
        limit: 1000,
      });
    } catch (error) {
      console.warn('Could not load leave data:', error);
    }

    loadSchedules();
  };

  const goToCurrentWeek = async () => {
    currentWeek.value = new Date();

    // Load leave data for the current week
    const startDate = weekDays.value[0].dateString;
    const endDate = weekDays.value[6].dateString;

    try {
      await leaveStore.fetchAllLeaveRequests({
        page: 1,
        limit: 1000,
      });
    } catch (error) {
      console.warn('Could not load leave data:', error);
    }

    loadSchedules();
  };

  // Pagination functions
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
    }
  };

  const goToNextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++;
    }
  };

  const goToPreviousPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--;
    }
  };

  // Reset pagination when filters change
  watch([filteredEmployees, itemsPerPage], () => {
    currentPage.value = 1;
  });

  // Shift management
  const openShiftManagement = () => {
    showShiftManagementModal.value = true;
  };

  const handleShiftUpdated = async () => {
    await loadShiftTypes();
    await loadSchedules();
  };

  const loadEmployees = async () => {
    try {
      loading.value = true;
      // Fetch all employees without pagination
      await employeeStore.fetchEmployees(false, 1, 1000); // Large limit to get all employees
      const employees = employeeStore.employees || [];

      // Filter out branch employees - only show department employees (HR, SCM, Finance, Production, CRM)
      const departmentEmployees = employees.filter(
        (emp) =>
          emp.department &&
          !emp.department.toLowerCase().includes('branch') &&
          [
            'Human Resource',
            'HR',
            'Supply Chain',
            'SCM',
            'Finance',
            'Production',
            'Customer Relationship',
            'CRM',
          ].includes(emp.department)
      );
      allEmployees.value = departmentEmployees;
    } catch (error) {
      console.error('Error loading employees:', error);
      showError('Failed to load employees');
    } finally {
      loading.value = false;
    }
  };

  const loadSchedules = async () => {
    try {
      const startDate = weekDays.value[0].dateString;
      const endDate = weekDays.value[6].dateString;

      // Load schedules for department employees
      await scheduleStore.fetchSchedules(null, startDate, endDate, true); // true for department_employees
    } catch (error) {
      console.error('Error loading schedules:', error);
      showError('Failed to load schedules');
    }
  };

  const loadShiftTypes = async () => {
    try {
      await shiftTypesStore.fetchShiftTypes();
    } catch (error) {
      console.error('Error loading shift types:', error);
      showError('Failed to load shift types');
    }
  };

  const openAddShiftModal = (employee, date) => {
    // All days are working days - no restrictions
    selectedEmployee.value = employee;
    selectedDate.value = date;
    shiftForm.value = {
      employeeId: employee.id,
      branchId: null, // Department employees don't have branch_id
      date: date.dateString,
      shiftId: null,
      notes: '',
    };
    showAddShiftModal.value = true;
  };

  const openEditShiftModal = (employee, date, schedule) => {
    // All days are working days - no restrictions
    selectedEmployee.value = employee;
    selectedDate.value = date;
    editingShift.value = schedule;
    shiftForm.value = {
      employeeId: employee.id,
      branchId: null, // Department employees don't have branch_id
      date: date.dateString,
      shiftId: schedule.shift.id,
      notes: schedule.notes || '',
    };
    showEditShiftModal.value = true;
  };

  const saveShift = async () => {
    try {
      if (!shiftForm.value.shiftId) {
        showWarning('Please select a shift');
        return;
      }

      loading.value = true; // Set loading state

      const selectedShift = shifts.value.find(
        (s) => s.id === shiftForm.value.shiftId
      );

      const scheduleData = {
        employee_id: shiftForm.value.employeeId,
        branch_id: shiftForm.value.branchId, // Will be null for department employees
        schedule_date: shiftForm.value.date,
        shift_name: selectedShift.name,
        start_time: selectedShift.start_time,
        end_time: selectedShift.end_time,
        notes: shiftForm.value.notes,
      };

      if (editingShift.value) {
        // Update existing schedule
        await scheduleStore.updateSchedule(editingShift.value.shift.id, {
          shift_name: selectedShift.name,
          start_time: selectedShift.start_time,
          end_time: selectedShift.end_time,
          notes: shiftForm.value.notes,
        });
        showSuccess('Shift updated successfully');
      } else {
        // Create new schedule
        await scheduleStore.createSchedule(scheduleData);
        showSuccess('Shift assigned successfully');
      }

      closeModals();
      await loadSchedules(); // Reload schedules to show the new assignment
    } catch (error) {
      console.error('Error saving shift:', error);
      showError(error.message || 'Failed to save shift');
    } finally {
      loading.value = false; // Clear loading state
    }
  };

  const openDeleteConfirmModal = (employeeId, dateString) => {
    // All days are working days - no restrictions
    shiftToDelete.value = { employeeId, dateString };
    showDeleteConfirmModal.value = true;
  };

  const confirmDeleteShift = async () => {
    try {
      loading.value = true; // Set loading state

      if (shiftToDelete.value) {
        const { employeeId, dateString } = shiftToDelete.value;
        const schedule = getShiftForEmployee(employeeId, dateString);

        if (schedule && schedule.shift.id !== 'day-off') {
          await scheduleStore.deleteSchedule(schedule.shift.id);
          showSuccess('Shift removed successfully');
        }
      }
      closeModals();
    } catch (error) {
      console.error('Error deleting shift:', error);
      showError(error.message || 'Failed to remove shift');
    } finally {
      loading.value = false; // Clear loading state
    }
  };

  const closeModals = () => {
    showAddShiftModal.value = false;
    showEditShiftModal.value = false;
    showDeleteConfirmModal.value = false;
    selectedEmployee.value = null;
    selectedDate.value = null;
    editingShift.value = null;
    shiftToDelete.value = null;
    shiftForm.value = {
      employeeId: null,
      branchId: null,
      date: '',
      shiftId: null,
      notes: '',
    };
  };

  const getShiftForEmployee = (employeeId, dateString) => {
    // Check store first - all days are working days, no automatic day-off logic
    const storeSchedule =
      scheduleStore.schedules[`${employeeId}_${dateString}`];

    // Return store schedule if it exists, otherwise null (no automatic day-off)
    if (storeSchedule) {
      return storeSchedule;
    }
    return null;
  };

  const isEmployeeOnLeave = (employeeId, dateString) => {
    // Check if employee has approved leave for this date
    const date = new Date(dateString);
    const leaveRequests = leaveStore.allLeaveRequests || [];

    return leaveRequests.some(
      (request) =>
        request.employee_id === employeeId &&
        (request.status === 'approved_by_hr' ||
          request.status === 'approved_by_manager') &&
        new Date(request.from_date) <= date &&
        new Date(request.to_date) >= date
    );
  };

  const canEditSchedule = (date) => {
    // All days are working days - no automatic day-off restrictions
    return !date.isPast;
  };

  const isDayOff = (date) => {
    // No automatic day-off logic - Day Off is now a shift type that can be assigned
    return false;
  };

  const getShiftColor = (shiftName) => {
    const colorMap = {
      'Morning Shift': 'bg-blue-100 text-blue-800',
      'Afternoon Shift': 'bg-green-100 text-green-800',
      'Night Shift': 'bg-purple-100 text-purple-800',
      'Day Off': 'bg-gray-100 text-gray-600',
    };
    return colorMap[shiftName] || 'bg-gray-100 text-gray-800';
  };

  // Initialize
  onMounted(async () => {
    // Clear any existing schedule data to start fresh
    scheduleStore.clearSchedules();

    // Load leave data for the current week
    const startDate = weekDays.value[0].dateString;
    const endDate = weekDays.value[6].dateString;

    try {
      await leaveStore.fetchAllLeaveRequests({
        page: 1,
        limit: 1000,
      });
    } catch (error) {
      console.warn('Could not load leave data:', error);
    }

    await Promise.all([loadEmployees(), loadShiftTypes(), loadSchedules()]);
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Schedule Header -->
    <div
      class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
    >
      <div>
        <h2 class="text-2xl font-bold text-primaryColor flex items-center">
          <Calendar class="w-6 h-6 mr-2" />
          Employee Schedules
        </h2>
        <p class="text-gray-600 mt-1">
          Manage shift assignments for department employees (HR, SCM, Finance,
          Production, CRM)
        </p>
        <button
          @click="openShiftManagement"
          class="btn btn-outline btn-sm mt-2"
        >
          <Settings class="w-4 h-4 mr-2" />
          Manage Shift Types
        </button>
      </div>

      <!-- Week Navigation -->
      <div class="flex items-center space-x-2">
        <button
          @click="navigateWeek(-1)"
          class="btn btn-outline btn-sm"
          :disabled="loading"
        >
          <ChevronLeft class="w-4 h-4" />
        </button>

        <div class="text-center min-w-[200px]">
          <div class="font-semibold">{{ currentWeekString }}</div>
          <button
            @click="goToCurrentWeek"
            class="text-xs text-primaryColor hover:underline"
          >
            Go to current week
          </button>
        </div>

        <button
          @click="navigateWeek(1)"
          class="btn btn-outline btn-sm"
          :disabled="loading"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-white shadow-sm">
      <div class="card-body p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Search -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Search Employees</span>
            </label>
            <div class="relative">
              <Search
                class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Name, role, department..."
                class="input input-bordered w-full pl-10"
              />
            </div>
          </div>

          <!-- Department Filter -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Department</span>
            </label>
            <select v-model="departmentFilter" class="select select-bordered">
              <option value="">All Departments</option>
              <option v-for="dept in departments" :key="dept" :value="dept">
                {{ dept }}
              </option>
            </select>
          </div>

          <!-- Items Per Page -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Per Page</span>
            </label>
            <select v-model="itemsPerPage" class="select select-bordered">
              <option value="5">5 per page</option>
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
            </select>
          </div>

          <!-- Results Count -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Results</span>
            </label>
            <div class="flex items-center h-12 px-3 bg-gray-50 rounded-lg">
              <Users class="w-4 h-4 mr-2 text-gray-400" />
              <span class="text-sm"
                >{{ filteredEmployees.length }} employees</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="loading loading-spinner loading-lg text-primaryColor"></div>
    </div>

    <!-- Schedule Table -->
    <div v-else class="card bg-white shadow-lg">
      <div class="card-body p-0">
        <div
          class="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        >
          <table class="table w-full min-w-[800px]">
            <thead class="bg-gray-50">
              <tr>
                <th class="font-semibold text-gray-700 min-w-[200px]">
                  Employee
                </th>
                <th
                  v-for="day in weekDays"
                  :key="day.dateString"
                  class="text-center font-semibold text-gray-700 min-w-[120px]"
                  :class="{ 'bg-primaryColor/10': day.isToday }"
                >
                  <div class="flex flex-col items-center">
                    <span class="text-sm">{{ day.dayName }}</span>
                    <span
                      class="text-xs"
                      :class="{
                        'font-bold text-primaryColor': day.isToday,
                        'text-gray-400': day.isPast,
                      }"
                    >
                      {{ day.dayNumber }}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="employee in paginatedEmployees" :key="employee.id">
                <!-- Employee Info -->
                <td class="font-medium min-w-[200px]">
                  <div class="flex items-center space-x-3">
                    <div
                      class="w-8 h-8 bg-primaryColor text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                    >
                      {{ employee.first_name?.charAt(0) || 'E'
                      }}{{ employee.last_name?.charAt(0) || 'E' }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="font-semibold truncate">
                        {{ employee.first_name }} {{ employee.last_name }}
                      </div>
                      <div class="text-xs text-gray-500 truncate">
                        {{ employee.role }}
                      </div>
                      <div
                        class="text-xs text-gray-400 flex items-center truncate"
                      >
                        <Building2 class="w-3 h-3 mr-1 flex-shrink-0" />
                        <span class="truncate">{{ employee.department }}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Schedule Cells -->
                <td
                  v-for="day in weekDays"
                  :key="`${employee.id}-${day.dateString}`"
                  class="text-center relative min-w-[120px]"
                  :class="{ 'bg-gray-50': day.isPast }"
                >
                  <div
                    class="min-h-[60px] flex flex-col items-center justify-center"
                  >
                    <!-- Leave Status (Priority) -->
                    <template
                      v-if="isEmployeeOnLeave(employee.id, day.dateString)"
                    >
                      <div
                        class="badge badge-xs sm:badge-sm mb-1 bg-warning/20 text-warning"
                      >
                        <span class="hidden sm:inline">On Leave</span>
                        <span class="sm:hidden">Leave</span>
                      </div>
                    </template>

                    <!-- Existing Shift (Only if not on leave) -->
                    <template
                      v-else-if="
                        getShiftForEmployee(employee.id, day.dateString)
                      "
                    >
                      <div
                        class="badge badge-xs sm:badge-sm mb-1 text-xs"
                        :class="
                          getShiftForEmployee(employee.id, day.dateString).shift
                            .color
                        "
                      >
                        <span class="hidden sm:inline">{{
                          getShiftForEmployee(employee.id, day.dateString).shift
                            .name
                        }}</span>
                        <span class="sm:hidden">{{
                          getShiftForEmployee(
                            employee.id,
                            day.dateString
                          ).shift.name.split(' ')[0]
                        }}</span>
                      </div>
                      <div
                        v-if="
                          getShiftForEmployee(employee.id, day.dateString).shift
                            .name !== 'Day Off'
                        "
                        class="text-xs text-gray-600 hidden sm:block"
                      >
                        {{
                          getShiftForEmployee(employee.id, day.dateString).shift
                            .startTime
                        }}
                        -
                        {{
                          getShiftForEmployee(employee.id, day.dateString).shift
                            .endTime
                        }}
                      </div>
                      <div
                        v-if="
                          getShiftForEmployee(employee.id, day.dateString).shift
                            .name !== 'Day Off'
                        "
                        class="text-xs text-gray-600 sm:hidden"
                      >
                        {{
                          getShiftForEmployee(employee.id, day.dateString).shift
                            .startTime
                        }}-{{
                          getShiftForEmployee(employee.id, day.dateString).shift
                            .endTime
                        }}
                      </div>

                      <!-- Action Buttons -->
                      <div
                        class="flex space-x-1 mt-1"
                        v-if="canEditSchedule(day)"
                      >
                        <button
                          @click="
                            openEditShiftModal(
                              employee,
                              day,
                              getShiftForEmployee(employee.id, day.dateString)
                            )
                          "
                          class="btn btn-ghost btn-xs hidden sm:flex"
                          title="Edit shift"
                        >
                          <Edit class="w-3 h-3" />
                        </button>
                        <button
                          @click="
                            openDeleteConfirmModal(employee.id, day.dateString)
                          "
                          class="btn btn-ghost btn-xs text-error hidden sm:flex"
                          title="Remove shift"
                        >
                          <Trash2 class="w-3 h-3" />
                        </button>
                      </div>
                    </template>

                    <!-- No Shift (Only if not on leave) -->
                    <template v-else>
                      <!-- Add Shift Button -->
                      <button
                        v-if="canEditSchedule(day)"
                        @click="openAddShiftModal(employee, day)"
                        class="btn btn-ghost btn-xs sm:btn-sm text-gray-400 hover:text-primaryColor"
                        title="Add shift"
                      >
                        <Plus class="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                      <div v-else class="text-gray-300">
                        <X class="w-3 h-3 sm:w-4 sm:h-4 mx-auto" />
                      </div>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="filteredEmployees.length > 0"
          class="flex flex-col sm:flex-row items-center justify-between p-4 gap-3 border-t border-gray-200"
        >
          <!-- Pagination Info -->
          <div class="text-xs sm:text-sm text-gray-600">
            Showing {{ paginationInfo.start }} to {{ paginationInfo.end }} of
            {{ paginationInfo.total }} employees
          </div>

          <!-- Pagination Controls -->
          <div class="flex items-center gap-2">
            <!-- Previous Button -->
            <button
              @click="goToPreviousPage"
              :disabled="currentPage === 1"
              class="btn btn-sm btn-outline"
            >
              Previous
            </button>

            <!-- Page Numbers -->
            <div class="flex items-center gap-1">
              <button
                v-for="page in Math.min(5, totalPages)"
                :key="page"
                @click="goToPage(page)"
                :class="[
                  'btn btn-sm',
                  page === currentPage
                    ? 'bg-primaryColor text-white border-primaryColor'
                    : 'btn-outline',
                ]"
              >
                {{ page }}
              </button>

              <!-- Show ellipsis if there are more pages -->
              <span v-if="totalPages > 5" class="px-2 text-gray-500">...</span>

              <!-- Show last page if it's not in the visible range -->
              <button
                v-if="totalPages > 5 && currentPage < totalPages - 2"
                @click="goToPage(totalPages)"
                class="btn btn-sm btn-outline"
              >
                {{ totalPages }}
              </button>
            </div>

            <!-- Next Button -->
            <button
              @click="goToNextPage"
              :disabled="currentPage === totalPages"
              class="btn btn-sm btn-outline"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredEmployees.length === 0" class="text-center py-12">
      <Users class="w-16 h-16 mx-auto text-gray-400 mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        No department employees found
      </h3>
      <p class="text-gray-600">
        Try adjusting your search criteria. Only department employees (HR, SCM,
        Finance, Production, CRM) are shown here.
      </p>
    </div>

    <!-- Add Shift Modal -->
    <div v-if="showAddShiftModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          Assign Shift - {{ selectedEmployee?.first_name }}
          {{ selectedEmployee?.last_name }}
        </h3>

        <div class="space-y-4">
          <div>
            <label class="label">
              <span class="label-text">Date</span>
            </label>
            <input
              v-model="shiftForm.date"
              type="date"
              class="input input-bordered w-full"
              readonly
            />
          </div>

          <div>
            <label class="label">
              <span class="label-text">Department</span>
            </label>
            <input
              :value="selectedEmployee?.department"
              class="input input-bordered w-full"
              readonly
            />
          </div>

          <div>
            <label class="label">
              <span class="label-text">Shift</span>
            </label>
            <select
              v-model="shiftForm.shiftId"
              class="select select-bordered w-full"
            >
              <option value="">Select a shift</option>
              <option v-for="shift in shifts" :key="shift.id" :value="shift.id">
                {{ shift.name }} ({{ shift.startTime }} - {{ shift.endTime }})
              </option>
            </select>
          </div>

          <div>
            <label class="label">
              <span class="label-text">Notes (Optional)</span>
            </label>
            <textarea
              v-model="shiftForm.notes"
              class="textarea textarea-bordered w-full"
              placeholder="Add any notes about this shift..."
              rows="3"
            ></textarea>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeModals"
            class="btn btn-sm font-thin bg-gray-200 text-black/50 border-none hover:bg-gray-300 shadow-none w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            @click="saveShift"
            class="btn bg-primaryColor text-white btn-sm font-thin border-none hover:bg-primaryColor/80 w-full sm:w-auto"
            :disabled="loading"
          >
            <span
              v-if="loading"
              class="loading loading-spinner loading-xs mr-2"
            ></span>
            {{ loading ? 'Assigning...' : 'Assign Shift' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Shift Modal -->
    <div v-if="showEditShiftModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          Edit Shift - {{ selectedEmployee?.first_name }}
          {{ selectedEmployee?.last_name }}
        </h3>

        <div class="space-y-4">
          <div>
            <label class="label">
              <span class="label-text">Date</span>
            </label>
            <input
              v-model="shiftForm.date"
              type="date"
              class="input input-bordered w-full"
              readonly
            />
          </div>

          <div>
            <label class="label">
              <span class="label-text">Department</span>
            </label>
            <input
              :value="selectedEmployee?.department"
              class="input input-bordered w-full"
              readonly
            />
          </div>

          <div>
            <label class="label">
              <span class="label-text">Shift</span>
            </label>
            <select
              v-model="shiftForm.shiftId"
              class="select select-bordered w-full"
            >
              <option value="">Select a shift</option>
              <option v-for="shift in shifts" :key="shift.id" :value="shift.id">
                {{ shift.name }} ({{ shift.startTime }} - {{ shift.endTime }})
              </option>
            </select>
          </div>

          <div>
            <label class="label">
              <span class="label-text">Notes</span>
            </label>
            <textarea
              v-model="shiftForm.notes"
              class="textarea textarea-bordered w-full"
              placeholder="Add any notes about this shift..."
              rows="3"
            ></textarea>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeModals"
            class="btn btn-sm font-thin bg-gray-200 text-black/50 border-none hover:bg-gray-300 shadow-none w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            @click="saveShift"
            class="btn bg-primaryColor text-white btn-sm font-thin border-none hover:bg-primaryColor/80 w-full sm:w-auto"
            :disabled="loading"
          >
            <span
              v-if="loading"
              class="loading loading-spinner loading-xs mr-2"
            ></span>
            {{ loading ? 'Updating...' : 'Update Shift' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirmModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4 text-error">
          <Trash2 class="w-6 h-6 inline mr-2" />
          Remove Shift Assignment
        </h3>

        <div class="space-y-4">
          <div class="alert bg-warning/10 text-warning border-warning">
            <AlertCircle class="w-5 h-5" />
            <span>Are you sure you want to remove this shift assignment?</span>
          </div>

          <div class="text-sm text-gray-600">
            This action cannot be undone. The employee will no longer be
            scheduled for this shift.
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeModals"
            class="btn btn-sm font-thin bg-gray-200 text-black/50 border-none hover:bg-gray-300 shadow-none w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            @click="confirmDeleteShift"
            class="btn bg-error text-white btn-sm font-thin border-none hover:bg-error/80 w-full sm:w-auto"
            :disabled="loading"
          >
            <span
              v-if="loading"
              class="loading loading-spinner loading-xs mr-2"
            ></span>
            {{ loading ? 'Removing...' : 'Remove Shift' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Shift Management Modal -->
    <ShiftManagementModal
      :is-open="showShiftManagementModal"
      @close="showShiftManagementModal = false"
      @shift-updated="handleShiftUpdated"
    />
  </div>
</template>

<style scoped>
  /* Custom scrollbar styling */
  .scrollbar-thin {
    scrollbar-width: thin;
  }

  .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
    background-color: #d1d5db;
    border-radius: 0.375rem;
  }

  .scrollbar-track-gray-100::-webkit-scrollbar-track {
    background-color: #f3f4f6;
  }

  .scrollbar-thin::-webkit-scrollbar {
    height: 8px;
    width: 8px;
  }

  /* Responsive table improvements */
  @media (max-width: 640px) {
    .table th,
    .table td {
      padding: 0.5rem 0.25rem;
    }
  }

  /* Ensure table doesn't break on very small screens */
  @media (max-width: 480px) {
    .table th,
    .table td {
      padding: 0.25rem 0.125rem;
    }
  }
</style>
