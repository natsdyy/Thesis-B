<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { useAttendanceStore } from '../../stores/attendanceStore.js';
  import {
    Calendar,
    Clock,
    Download,
    RefreshCcw,
    TrendingUp,
    UserCheck,
    AlertTriangle,
    FileText,
  } from 'lucide-vue-next';
  import {
    getCurrentPhilippineDate,
    formatForDisplay,
    formatTimeForDisplay,
  } from '../../utils/timezoneUtils.js';

  const props = defineProps({
    employeeId: {
      type: [String, Number],
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
  });

  const attendanceStore = useAttendanceStore();

  // State
  const loading = ref(false);
  const error = ref(null);
  const attendanceData = ref(null);
  const dateRange = ref('today');
  const selectedMonth = ref(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const currentPage = ref(1);
  const itemsPerPage = ref(10);

  // Date range options
  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'thisWeek', label: 'This Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'custom', label: 'Custom Month' },
  ];

  // Computed date range
  const dateRangeComputed = computed(() => {
    const today = new Date(getCurrentPhilippineDate());

    switch (dateRange.value) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
        };

      case 'thisWeek':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return {
          start: startOfWeek.toISOString().split('T')[0],
          end: endOfWeek.toISOString().split('T')[0],
        };

      case 'thisMonth':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          0
        );
        return {
          start: startOfMonth.toISOString().split('T')[0],
          end: endOfMonth.toISOString().split('T')[0],
        };

      case 'custom':
        if (selectedMonth.value) {
          const [year, month] = selectedMonth.value.split('-').map(Number);
          const startOfCustomMonth = new Date(year, month - 1, 1);
          const endOfCustomMonth = new Date(year, month, 0);
          return {
            start: startOfCustomMonth.toISOString().split('T')[0],
            end: endOfCustomMonth.toISOString().split('T')[0],
          };
        }
        return null;

      default:
        return null;
    }
  });

  // Process attendance data into daily records
  const processedAttendanceData = computed(() => {
    if (!attendanceData.value) return [];

    const { attendance, overtime, leave, schedules } = attendanceData.value;
    const dailyRecords = new Map();

    // Process attendance records
    attendance.forEach((record) => {
      const date = new Date(record.created_at).toISOString().split('T')[0];

      // Skip invalid dates
      if (isNaN(new Date(date).getTime())) {
        console.warn('Invalid attendance date:', record.created_at);
        return;
      }

      if (!dailyRecords.has(date)) {
        dailyRecords.set(date, {
          date,
          attendance: null,
          overtime: null,
          leave: null,
          schedule: null,
        });
      }

      // Only set attendance if not already set (prevent duplicates)
      if (!dailyRecords.get(date).attendance) {
        dailyRecords.get(date).attendance = record;
      }
    });

    // Process overtime records
    overtime.forEach((otRecord) => {
      const date = otRecord.overtime_date;

      // Skip invalid dates
      if (!date || isNaN(new Date(date).getTime())) {
        console.warn('Invalid overtime date:', otRecord.overtime_date);
        return;
      }

      if (!dailyRecords.has(date)) {
        dailyRecords.set(date, {
          date,
          attendance: null,
          overtime: null,
          leave: null,
          schedule: null,
        });
      }

      // Only set overtime if not already set (prevent duplicates)
      if (!dailyRecords.get(date).overtime) {
        dailyRecords.get(date).overtime = otRecord;
      }
    });

    // Process leave records
    leave.forEach((leaveRecord) => {
      const startDate = new Date(leaveRecord.from_date);
      const endDate = new Date(leaveRecord.to_date);

      // Skip invalid date ranges
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn(
          'Invalid leave date range:',
          leaveRecord.from_date,
          leaveRecord.to_date
        );
        return;
      }

      for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
      ) {
        const date = d.toISOString().split('T')[0];

        if (!dailyRecords.has(date)) {
          dailyRecords.set(date, {
            date,
            attendance: null,
            overtime: null,
            leave: null,
            schedule: null,
          });
        }

        // Only set leave if not already set (prevent duplicates)
        if (!dailyRecords.get(date).leave) {
          dailyRecords.get(date).leave = leaveRecord;
        }
      }
    });

    // Process schedules
    schedules.forEach((schedule) => {
      const date = schedule.schedule_date;

      // Skip invalid dates
      if (!date || isNaN(new Date(date).getTime())) {
        console.warn('Invalid schedule date:', schedule.schedule_date);
        return;
      }

      if (!dailyRecords.has(date)) {
        dailyRecords.set(date, {
          date,
          attendance: null,
          overtime: null,
          leave: null,
          schedule: null,
        });
      }

      // Only set schedule if not already set (prevent duplicates)
      if (!dailyRecords.get(date).schedule) {
        dailyRecords.get(date).schedule = schedule;
      }
    });

    // Convert to array and sort by date (newest first)
    return Array.from(dailyRecords.values()).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  });

  // Pagination computed properties
  const paginatedAttendanceData = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return processedAttendanceData.value.slice(start, end);
  });

  const totalPages = computed(() => {
    return Math.max(
      1,
      Math.ceil(processedAttendanceData.value.length / itemsPerPage.value)
    );
  });

  // Calculate hours worked - use database value instead of time difference
  const calculateHoursWorked = (attendanceRecord) => {
    if (
      !attendanceRecord ||
      !attendanceRecord.time_in ||
      !attendanceRecord.time_out
    )
      return '—';

    // Use the hours_worked field from the database
    const hours = parseFloat(attendanceRecord.hours_worked) || 0;
    const overtimeHours = parseFloat(attendanceRecord.overtime_hours) || 0;
    const totalHours = hours + overtimeHours;

    if (totalHours === 0) return '—';

    const wholeHours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - wholeHours) * 60);

    return `${wholeHours}h ${minutes}m`;
  };

  // Calculate late minutes
  const calculateLateMinutes = (timeIn, scheduleStart) => {
    if (!timeIn || !scheduleStart) return 0;

    const timeInDate = new Date(timeIn);
    const scheduleDate = new Date(
      `${timeInDate.toISOString().split('T')[0]}T${scheduleStart}`
    );

    const diffMs = timeInDate - scheduleDate;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    return Math.max(0, diffMinutes); // Return 0 if not late, otherwise minutes late
  };

  // Calculate late minutes for display (with text)
  const calculateLateMinutesDisplay = (timeIn, scheduleStart) => {
    const minutes = calculateLateMinutes(timeIn, scheduleStart);
    if (minutes === 0) return 'On Time';
    return `${minutes}m late`;
  };

  // Get attendance status
  const getAttendanceStatus = (record) => {
    if (record.leave) return 'On Leave';
    if (record.schedule?.shift_name === 'Day Off') return 'Day Off';
    if (record.attendance?.status === 'present') return 'Present';
    if (record.attendance?.status === 'late') return 'Late';
    return 'Absent';
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Present':
        return 'badge-sm border-none bg-success/20 text-success';
      case 'Late':
        return 'badge-sm border-none bg-warning/20 text-warning';
      case 'On Leave':
        return 'badge-sm border-none bg-info/20 text-info';
      case 'Day Off':
        return 'badge-sm border-none bg-neutral/20 text-neutral';
      case 'Absent':
        return 'badge-sm border-none bg-error/20 text-error';
      default:
        return 'badge-sm border-none bg-neutral/20 text-neutral';
    }
  };

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    if (!dateRangeComputed.value) {
      error.value = 'Please select a valid date range';
      return;
    }

    try {
      loading.value = true;
      error.value = null;

      const data = await attendanceStore.getEmployeeComprehensiveAttendance(
        props.employeeId,
        dateRangeComputed.value.start,
        dateRangeComputed.value.end
      );

      attendanceData.value = data;
    } catch (err) {
      error.value = err.message || 'Failed to fetch attendance data';
    } finally {
      loading.value = false;
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!processedAttendanceData.value.length) {
      error.value = 'No data to export';
      return;
    }

    const headers = [
      'Date',
      'Day',
      'Time In',
      'Time Out',
      'Hours Worked',
      'Status',
      'Late Minutes',
      'OT Hours',
      'Leave Type',
      'Schedule',
    ];

    const csvData = processedAttendanceData.value
      .map((record) => {
        // Ensure we have a valid date
        const date = new Date(record.date);
        if (isNaN(date.getTime())) {
          console.warn('Invalid date:', record.date);
          return null; // Skip invalid dates
        }

        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

        // Calculate late minutes (numeric value for CSV)
        const lateMinutes =
          record.attendance?.time_in && record.schedule?.start_time
            ? calculateLateMinutes(
                record.attendance.time_in,
                record.schedule.start_time
              )
            : 0;

        // Format date as YYYY-MM-DD for better Excel compatibility
        const formattedDate = record.date; // Already in YYYY-MM-DD format

        // Calculate hours worked - return empty string for non-working days
        let hoursWorked = '';
        if (record.attendance?.time_in && record.attendance?.time_out) {
          hoursWorked = calculateHoursWorked(record.attendance);
        }

        return [
          formattedDate,
          dayName,
          record.attendance?.time_in || '',
          record.attendance?.time_out || '',
          hoursWorked,
          getAttendanceStatus(record),
          lateMinutes > 0 ? lateMinutes.toString() : '',
          record.attendance?.overtime_hours &&
          parseFloat(record.attendance.overtime_hours) > 0
            ? parseFloat(record.attendance.overtime_hours).toString()
            : '',
          record.leave?.leave_type || '',
          record.schedule?.shift_name || '',
        ];
      })
      .filter((row) => row !== null); // Remove any null rows from invalid dates

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${props.employeeName.replace(/\s+/g, '_')}_attendance_${dateRangeComputed.value.start}_to_${dateRangeComputed.value.end}.csv`
    );
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Watch for date range changes
  watch([dateRange, selectedMonth], () => {
    if (dateRangeComputed.value) {
      fetchAttendanceData();
    }
  });

  // Initialize with today's data
  onMounted(() => {
    fetchAttendanceData();
  });
</script>

<template>
  <div class="space-y-4">
    <!-- Header with filters -->
    <div class="card bg-accentColor border border-black/10 shadow">
      <div class="card-body p-4">
        <!-- Header Section -->
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-primaryColor/10 text-primaryColor">
              <Calendar class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-primaryColor">
                {{ employeeName }} - Attendance History
              </h3>
              <p class="text-sm text-black/60 hidden sm:block">
                View comprehensive attendance records with overtime and leave
                data
              </p>
            </div>
          </div>

          <!-- Controls Section - Stacked for Mobile -->
          <div
            class="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between"
          >
            <!-- Date Range Controls -->
            <div class="flex flex-col sm:flex-row gap-2">
              <select
                v-model="dateRange"
                class="select select-sm select-bordered bg-white w-full sm:w-auto"
              >
                <option
                  v-for="option in dateRangeOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>

              <!-- Custom Month Picker -->
              <input
                v-if="dateRange === 'custom'"
                type="month"
                v-model="selectedMonth"
                class="input input-sm input-bordered bg-white w-full sm:w-auto"
              />
            </div>

            <!-- Right Side Controls -->
            <div
              class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
            >
              <!-- Items Per Page Selector -->
              <div class="flex items-center gap-2">
                <label class="text-sm text-black/60 whitespace-nowrap"
                  >Show:</label
                >
                <select
                  v-model="itemsPerPage"
                  @change="currentPage = 1"
                  class="select select-sm select-bordered bg-white"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
                <span class="text-sm text-black/60 hidden sm:inline"
                  >per page</span
                >
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-2">
                <button
                  @click="fetchAttendanceData"
                  :disabled="loading"
                  class="btn btn-sm btn-outline text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white flex-1 sm:flex-none"
                >
                  <RefreshCcw
                    :class="['w-4 h-4', loading ? 'animate-spin' : '']"
                  />
                  <span class="hidden sm:inline">Refresh</span>
                </button>

                <button
                  @click="exportToCSV"
                  :disabled="!processedAttendanceData.length || loading"
                  class="btn btn-sm bg-primaryColor text-white border-none hover:bg-primaryColor/90 font-thin flex-1 sm:flex-none"
                >
                  <Download class="w-4 h-4" />
                  <span class="hidden sm:inline">Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="alert alert-error">
      <AlertTriangle class="w-4 h-4" />
      <span>{{ error }}</span>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg text-primaryColor"></span>
    </div>

    <!-- Attendance Data -->
    <div
      v-else-if="processedAttendanceData.length"
      class="card bg-accentColor border border-black/10 shadow"
    >
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table table-zebra min-w-full">
            <thead>
              <tr>
                <th class="whitespace-nowrap sticky left-0 bg-base-100 z-10">
                  Date
                </th>
                <th class="whitespace-nowrap hidden md:table-cell">Time In</th>
                <th class="whitespace-nowrap hidden md:table-cell">Time Out</th>
                <th class="whitespace-nowrap">Hours</th>
                <th class="whitespace-nowrap">Status</th>
                <th class="whitespace-nowrap hidden lg:table-cell">Late</th>
                <th class="whitespace-nowrap hidden lg:table-cell">OT</th>
                <th class="whitespace-nowrap hidden xl:table-cell">Leave</th>
                <th class="whitespace-nowrap hidden xl:table-cell">Schedule</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in paginatedAttendanceData" :key="record.date">
                <!-- Date Column - Always visible, sticky on mobile -->
                <td class="sticky left-0 bg-base-100 z-10">
                  <div class="font-medium">
                    {{ formatForDisplay(record.date) }}
                  </div>
                  <div class="text-xs text-black/60">
                    {{
                      new Date(record.date).toLocaleDateString('en-PH', {
                        weekday: 'short',
                      })
                    }}
                  </div>
                  <!-- Mobile: Show time info inline -->
                  <div class="md:hidden text-xs text-black/50 mt-1">
                    <div v-if="record.attendance?.time_in">
                      In: {{ formatTimeForDisplay(record.attendance.time_in) }}
                    </div>
                    <div v-if="record.attendance?.time_out">
                      Out:
                      {{ formatTimeForDisplay(record.attendance.time_out) }}
                    </div>
                  </div>
                </td>

                <!-- Time In Column - Hidden on mobile -->
                <td class="hidden md:table-cell">
                  <div
                    v-if="record.attendance?.time_in"
                    class="flex items-center gap-2"
                  >
                    <Clock class="w-3 h-3 text-success" />
                    <span class="text-sm">
                      {{ formatTimeForDisplay(record.attendance.time_in) }}
                    </span>
                  </div>
                  <span v-else class="text-black/40">—</span>
                </td>

                <!-- Time Out Column - Hidden on mobile -->
                <td class="hidden md:table-cell">
                  <div
                    v-if="record.attendance?.time_out"
                    class="flex items-center gap-2"
                  >
                    <Clock class="w-3 h-3 text-error" />
                    <span class="text-sm">
                      {{ formatTimeForDisplay(record.attendance.time_out) }}
                    </span>
                  </div>
                  <span v-else class="text-black/40">—</span>
                </td>

                <!-- Hours Worked Column - Always visible -->
                <td>
                  <span class="text-sm font-medium">
                    {{ calculateHoursWorked(record.attendance) }}
                  </span>
                </td>

                <!-- Status Column - Always visible -->
                <td>
                  <span
                    :class="[
                      'badge badge-sm',
                      getStatusBadgeClass(getAttendanceStatus(record)),
                    ]"
                  >
                    {{ getAttendanceStatus(record) }}
                  </span>
                </td>

                <!-- Late Column - Hidden on mobile/tablet -->
                <td class="hidden lg:table-cell">
                  <span class="text-sm">
                    {{
                      record.attendance?.time_in
                        ? calculateLateMinutesDisplay(
                            record.attendance.time_in,
                            record.schedule?.start_time
                          )
                        : '—'
                    }}
                  </span>
                </td>

                <!-- OT Hours Column - Hidden on mobile/tablet -->
                <td class="hidden lg:table-cell">
                  <div
                    v-if="
                      record.attendance?.overtime_hours &&
                      parseFloat(record.attendance.overtime_hours) > 0
                    "
                    class="flex items-center gap-1"
                  >
                    <TrendingUp class="w-3 h-3 text-warning" />
                    <span class="text-sm font-medium">
                      {{ parseFloat(record.attendance.overtime_hours) }}h
                    </span>
                  </div>
                  <span v-else class="text-black/40">—</span>
                </td>

                <!-- Leave Type Column - Hidden on smaller screens -->
                <td class="hidden xl:table-cell">
                  <div v-if="record.leave" class="flex items-center gap-1">
                    <UserCheck class="w-3 h-3 text-info" />
                    <span class="text-sm">
                      {{ record.leave.leave_type }}
                    </span>
                  </div>
                  <span v-else class="text-black/40">—</span>
                </td>

                <!-- Schedule Column - Hidden on smaller screens -->
                <td class="hidden xl:table-cell">
                  <span v-if="record.schedule" class="text-sm">
                    {{ record.schedule.shift_name }}
                  </span>
                  <span v-else class="text-black/40">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          class="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center p-4 border-t border-black/10"
        >
          <div class="text-sm text-black/60 text-center sm:text-left">
            Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
            {{
              Math.min(
                currentPage * itemsPerPage,
                processedAttendanceData.length
              )
            }}
            of {{ processedAttendanceData.length }} records
          </div>
          <div class="join mx-auto sm:mx-0">
            <button
              class="join-item btn btn-sm"
              :disabled="currentPage === 1"
              @click="currentPage = Math.max(1, currentPage - 1)"
            >
              «
            </button>
            <button class="join-item btn btn-sm">
              <span class="hidden sm:inline">Page </span>{{ currentPage
              }}<span class="hidden sm:inline"> of {{ totalPages }}</span>
            </button>
            <button
              class="join-item btn btn-sm"
              :disabled="currentPage === totalPages"
              @click="currentPage = Math.min(totalPages, currentPage + 1)"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="card bg-accentColor border border-black/10 shadow">
      <div class="card-body p-8 text-center">
        <FileText class="w-12 h-12 mx-auto mb-4 text-black/30" />
        <h3 class="text-lg font-medium text-black/70 mb-2">
          No Attendance Records
        </h3>
        <p class="text-sm text-black/60">
          No attendance records found for the selected date range.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .table-zebra tbody tr:nth-child(odd) {
    background-color: rgba(0, 0, 0, 0.02);
  }
</style>
