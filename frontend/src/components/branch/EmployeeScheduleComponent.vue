<script setup>
  import { ref, computed, onMounted } from 'vue';
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
  } from 'lucide-vue-next';
  import { useCustomToast } from '../../composables/useCustomToast';
  import { useEmployeeScheduleStore } from '../../stores/employeeScheduleStore';
  import { useShiftTypesStore } from '../../stores/shiftTypesStore';
  import { useLeaveStore } from '../../stores/leaveStore';
  import { useAuthStore } from '../../stores/authStore';
  import ShiftManagementModal from './ShiftManagementModal.vue';

  const { showSuccess, showError, showWarning, showInfo } = useCustomToast();
  const scheduleStore = useEmployeeScheduleStore();
  const shiftTypesStore = useShiftTypesStore();
  const leaveStore = useLeaveStore();
  const authStore = useAuthStore();

  // Props
  const props = defineProps({
    employees: {
      type: Array,
      default: () => [],
    },
    branchId: {
      type: [String, Number],
      default: null,
    },
  });

  // Emits
  const emit = defineEmits(['schedule-updated']);

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

  // Computed from store
  const loading = computed(() => scheduleStore.loading);
  const shifts = computed(() => shiftTypesStore.getActiveShiftTypes);
  const isHR = computed(() => authStore.user?.department === 'Human Resource');

  // Form data for adding/editing shifts
  const shiftForm = ref({
    employeeId: null,
    date: '',
    shiftId: null,
    notes: '',
  });

  // Computed properties
  const weekDays = computed(() => {
    const days = [];
    const startOfWeek = new Date(currentWeek.value);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      // Normalize to Philippine date (Asia/Manila) for key matching with API
      const dateString = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(day);

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

  const employeeSchedules = computed(() => {
    const result = {};
    props.employees.forEach((emp) => {
      result[emp.id] = {
        ...emp,
        schedules: scheduleStore.getSchedulesForWeek(emp.id, weekDays.value),
      };
    });
    return result;
  });

  // Methods
  const navigateWeek = (direction) => {
    const newWeek = new Date(currentWeek.value);
    newWeek.setDate(newWeek.getDate() + direction * 7);
    currentWeek.value = newWeek;
    loadSchedules();
  };

  const goToCurrentWeek = () => {
    currentWeek.value = new Date();
    loadSchedules();
  };

  // Shift management
  const openShiftManagement = () => {
    showShiftManagementModal.value = true;
  };

  const handleShiftUpdated = async () => {
    await loadShiftTypes();
    await loadSchedules();
  };

  const loadSchedules = async () => {
    try {
      const startDate = weekDays.value[0].dateString;
      const endDate = weekDays.value[6].dateString;

      // Load leave data for the current week
      try {
        await leaveStore.fetchAllLeaveRequests({
          branch_id: props.branchId,
          page: 1,
          limit: 1000,
        });
      } catch (error) {
        console.warn('Could not load leave data:', error);
      }

      await scheduleStore.fetchSchedules(props.branchId, startDate, endDate);
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
    // Check if there's an existing schedule (e.g., Day Off) that will be replaced
    const existingSchedule = getShiftForEmployee(employee.id, date.dateString);

    selectedEmployee.value = employee;
    selectedDate.value = date;
    editingShift.value = existingSchedule || null; // Set if exists to allow override
    shiftForm.value = {
      employeeId: employee.id,
      date: date.dateString,
      shiftId: null,
      notes: existingSchedule?.notes || '',
    };
    showAddShiftModal.value = true;
  };

  const openEditShiftModal = (employee, date, schedule) => {
    // All days are working days - no restrictions
    selectedEmployee.value = employee;
    selectedDate.value = date;
    editingShift.value = schedule;

    // Find the shift type ID by matching the shift name
    const shiftType = shiftTypesStore.getShiftTypeByName(schedule.shift.name);
    const shiftTypeId = shiftType ? shiftType.id : null;

    shiftForm.value = {
      employeeId: employee.id,
      date: date.dateString,
      shiftId: shiftTypeId,
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

      const selectedShift = shifts.value.find(
        (s) => s.id === shiftForm.value.shiftId
      );

      const scheduleData = {
        employee_id: shiftForm.value.employeeId,
        branch_id: props.branchId,
        schedule_date: shiftForm.value.date,
        shift_name: selectedShift.name,
        start_time: selectedShift.start_time,
        end_time: selectedShift.end_time,
        notes: shiftForm.value.notes,
      };

      // Check if there's an existing schedule for this date (e.g., Day Off to override)
      const existingSchedule = getShiftForEmployee(
        shiftForm.value.employeeId,
        shiftForm.value.date
      );

      if (existingSchedule) {
        // Update existing schedule (e.g., changing Day Off to working shift)
        await scheduleStore.updateSchedule(existingSchedule.id, {
          shift_name: selectedShift.name,
          start_time: selectedShift.start_time,
          end_time: selectedShift.end_time,
          notes: shiftForm.value.notes,
        });
        showSuccess(
          existingSchedule.shift.name === 'Day Off'
            ? 'Working shift assigned (Day Off overridden)'
            : 'Shift updated successfully'
        );
      } else {
        // Create new schedule
        await scheduleStore.createSchedule(scheduleData);
        showSuccess('Shift assigned successfully');
      }

      closeModals();
      await loadSchedules(); // Reload schedules to show the new assignment
      emit('schedule-updated');
    } catch (error) {
      console.error('Error saving shift:', error);
      showError(error.message || 'Failed to save shift');
    }
  };

  const openDeleteConfirmModal = (employeeId, dateString) => {
    // All days are working days - no restrictions
    shiftToDelete.value = { employeeId, dateString };
    showDeleteConfirmModal.value = true;
  };

  const confirmDeleteShift = async () => {
    try {
      if (shiftToDelete.value) {
        const { employeeId, dateString } = shiftToDelete.value;
        const schedule = getShiftForEmployee(employeeId, dateString);

        if (schedule) {
          // Allow deletion of all shifts, including Day Off
          await scheduleStore.deleteSchedule(schedule.id);
          showSuccess('Shift removed successfully');
          emit('schedule-updated');
        }
      }
      closeModals();
    } catch (error) {
      console.error('Error deleting shift:', error);
      showError(error.message || 'Failed to remove shift');
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
      date: '',
      shiftId: null,
      notes: '',
    };
  };

  const getShiftForEmployee = (employeeId, dateString) => {
    // Check store first - all days are working days, no automatic day-off logic
    const storeSchedule =
      scheduleStore.schedules[`${employeeId}_${dateString}`];
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
        request.status === 'approved_by_hr' && // Only show "On Leave" when fully approved by HR
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
    await loadShiftTypes();
    await loadSchedules();
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Schedule Header -->
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
    >
      <div>
        <h2 class="text-2xl font-bold text-primaryColor flex items-center">
          <Calendar class="w-6 h-6 mr-2" />
          Employee Schedules
        </h2>
        <p class="text-gray-600 mt-1">Manage shift assignments for your team</p>
        <button
          @click="openShiftManagement"
          class="btn btn-outline btn-sm mt-2"
          v-if="isHR"
        >
          <Settings class="w-4 h-4 mr-2" />
          Manage Shift Types
        </button>
      </div>

      <!-- Week Navigation -->
      <div class="flex items-center space-x-2">
        <button
          @click="navigateWeek(-1)"
          class="btn btn-sm"
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

        <button @click="navigateWeek(1)" class="btn btn-sm" :disabled="loading">
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="loading loading-spinner loading-lg text-primaryColor"></div>
    </div>

    <!-- Schedule Table -->
    <div v-else class="card bg-white shadow-lg">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="font-semibold text-gray-700">Employee</th>
                <th
                  v-for="day in weekDays"
                  :key="day.dateString"
                  class="text-center font-semibold text-gray-700"
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
              <tr v-for="employee in employees" :key="employee.id">
                <!-- Employee Info -->
                <td class="font-medium">
                  <div class="flex items-center space-x-3">
                    <div
                      class="w-8 h-8 bg-primaryColor text-white rounded-full flex items-center justify-center text-sm font-semibold"
                    >
                      {{ employee.first_name.charAt(0)
                      }}{{ employee.last_name.charAt(0) }}
                    </div>
                    <div>
                      <div class="font-semibold">
                        {{ employee.first_name }} {{ employee.last_name }}
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ employee.role }}
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Schedule Cells -->
                <td
                  v-for="day in weekDays"
                  :key="`${employee.id}-${day.dateString}`"
                  class="text-center relative"
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
                        class="badge badge-sm mb-1 bg-warning/10 text-warning"
                      >
                        On Leave
                      </div>
                    </template>

                    <!-- Existing Shift (Only if not on leave) -->
                    <template
                      v-else-if="
                        getShiftForEmployee(employee.id, day.dateString)
                      "
                    >
                      <!-- Day Off Display -->
                      <template
                        v-if="
                          getShiftForEmployee(employee.id, day.dateString).shift
                            .name === 'Day Off'
                        "
                      >
                        <div
                          class="badge badge-sm mb-1 bg-gray-200 text-gray-700 font-semibold"
                        >
                          Day Off
                        </div>
                        <div class="text-xs text-gray-500 italic">
                          No work scheduled
                        </div>
                      </template>

                      <!-- Working Shift Display -->
                      <template v-else>
                        <div
                          class="badge badge-sm mb-1"
                          :class="
                            getShiftForEmployee(employee.id, day.dateString)
                              .shift.color
                          "
                        >
                          {{
                            getShiftForEmployee(employee.id, day.dateString)
                              .shift.name
                          }}
                        </div>
                        <div class="text-xs text-gray-600 font-mono">
                          {{
                            getShiftForEmployee(employee.id, day.dateString)
                              .shift.startTime
                          }}
                          -
                          {{
                            getShiftForEmployee(employee.id, day.dateString)
                              .shift.endTime
                          }}
                        </div>
                        <!-- Rest Day Override Indicator -->
                        <div
                          v-if="
                            getShiftForEmployee(employee.id, day.dateString)
                              .is_rest_day_override
                          "
                          class="text-xs text-primaryColor font-medium mt-0.5"
                        >
                          (Rest Day Pay)
                        </div>
                      </template>

                      <!-- Action Buttons -->
                      <div
                        class="flex space-x-1 mt-1"
                        v-if="canEditSchedule(day)"
                      >
                        <!-- For Day Off: Show "Add Working Shift" button to override with working shift -->
                        <template
                          v-if="
                            getShiftForEmployee(employee.id, day.dateString)
                              .shift.name === 'Day Off'
                          "
                        >
                          <button
                            @click="openAddShiftModal(employee, day)"
                            class="btn btn-ghost btn-xs text-primaryColor"
                            title="Add working shift (override Day Off)"
                          >
                            <Plus class="w-3 h-3 mr-1" />
                            Work
                          </button>
                          <button
                            @click="
                              openDeleteConfirmModal(
                                employee.id,
                                day.dateString
                              )
                            "
                            class="btn btn-ghost btn-xs text-error"
                            title="Remove Day Off"
                          >
                            <Trash2 class="w-3 h-3" />
                          </button>
                        </template>
                        <!-- For Regular Shifts: Show Edit and Delete -->
                        <template v-else>
                          <button
                            @click="
                              openEditShiftModal(
                                employee,
                                day,
                                getShiftForEmployee(employee.id, day.dateString)
                              )
                            "
                            class="btn btn-ghost btn-xs"
                            title="Edit shift"
                          >
                            <Edit class="w-3 h-3" />
                          </button>
                          <button
                            @click="
                              openDeleteConfirmModal(
                                employee.id,
                                day.dateString
                              )
                            "
                            class="btn btn-ghost btn-xs text-error"
                            title="Remove shift"
                          >
                            <Trash2 class="w-3 h-3" />
                          </button>
                        </template>
                      </div>
                    </template>

                    <!-- No Shift (Only if not on leave) -->
                    <template v-else>
                      <!-- Add Shift Button -->
                      <button
                        v-if="canEditSchedule(day)"
                        @click="openAddShiftModal(employee, day)"
                        class="btn btn-ghost btn-sm text-gray-400 hover:text-primaryColor"
                        title="Add shift"
                      >
                        <Plus class="w-4 h-4" />
                      </button>
                      <div v-else class="text-gray-300">
                        <X class="w-4 h-4 mx-auto" />
                      </div>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add Shift Modal -->
    <div v-if="showAddShiftModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          <template
            v-if="editingShift && editingShift.shift.name === 'Day Off'"
          >
            Add Working Shift (Override Day Off) -
            {{ selectedEmployee?.first_name }}
            {{ selectedEmployee?.last_name }}
          </template>
          <template v-else>
            Assign Shift - {{ selectedEmployee?.first_name }}
            {{ selectedEmployee?.last_name }}
          </template>
        </h3>
        <div
          v-if="editingShift && editingShift.shift.name === 'Day Off'"
          class="alert bg-info/10 border-info/50 mb-4"
        >
          <AlertCircle class="w-5 h-5" />
          <span>
            This employee has a Day Off scheduled. Adding a working shift will
            override it. The employee will be eligible for rest day pay rates in
            payroll.
          </span>
        </div>

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
          >
            Remove Shift
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
