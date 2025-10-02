<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2"
    >
      <h1 class="text-2xl sm:text-3xl font-bold">My Attendance</h1>
      <div class="text-sm text-base-content/70">
        Last updated: {{ lastUpdated.toLocaleTimeString() }}
        <span v-if="isStatusLoading || isHistoryLoading" class="ml-2">
          <span class="loading loading-spinner loading-xs"></span>
          Updating...
        </span>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed mb-4 justify-start w-full overflow-x-auto">
      <div class="flex flex-nowrap min-w-max">
        <button
          @click="setActiveTab('add')"
          class="tab whitespace-nowrap"
          :class="{ 'tab-active': activeTab === 'add' }"
        >
          <Clock class="w-4 h-4 mr-2" />
          <span class="hidden sm:inline">Add Attendance</span>
          <span class="sm:hidden">Add</span>
        </button>
        <button
          @click="setActiveTab('ot')"
          class="tab whitespace-nowrap"
          :class="{ 'tab-active': activeTab === 'ot' }"
        >
          <Timer class="w-4 h-4 mr-2" />
          <span class="hidden sm:inline">Apply Overtime</span>
          <span class="sm:hidden">OT</span>
        </button>
        <button
          @click="setActiveTab('leave')"
          class="tab whitespace-nowrap"
          :class="{ 'tab-active': activeTab === 'leave' }"
        >
          <FileText class="w-4 h-4 mr-2" />
          <span class="hidden sm:inline">Apply Leave</span>
          <span class="sm:hidden">Leave</span>
        </button>
      </div>
    </div>

    <!-- Add Attendance -->
    <div v-if="activeTab === 'add'" class="space-y-6">
      <!-- Current Status Card -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-2xl mb-4">
            Current Status
            <span
              v-if="isStatusLoading"
              class="loading loading-spinner loading-sm ml-2"
            ></span>
          </h2>

          <!-- Loading State -->
          <div
            v-if="isStatusLoading"
            class="flex items-center justify-center py-8"
          >
            <div class="flex flex-col items-center space-y-2">
              <span class="loading loading-spinner loading-md"></span>
              <p class="text-sm text-gray-500">Loading current status...</p>
            </div>
          </div>

          <!-- Status Display -->
          <div
            v-else
            class="alert"
            :class="
              currentStatus === 'on-leave'
                ? '!bg-warning/5 !text-warning !border-warning'
                : currentStatus === 'checked-in'
                  ? '!bg-success/5 !text-success !border-success'
                  : '!bg-info/5 !text-info !border-info'
            "
          >
            <Clock class="w-5 h-5" />
            <div>
              <div class="font-medium">{{ statusText }}</div>
              <div
                v-if="currentStatus === 'checked-in' && lastTimeIn"
                class="text-xs mt-1"
              >
                Since: {{ formatTime(lastTimeIn) }}
              </div>
              <div
                v-if="isLateToday && tardinessMinutesToday > 0"
                class="text-xs mt-1 text-neutral/50"
              >
                Late by {{ tardinessMinutesToday }} minute(s)
              </div>
              <div
                v-if="overtimeMinutesToday > 0"
                class="text-xs mt-1 text-neutral/50"
              >
                Overtime today: {{ overtimeMinutesToday }} minute(s)
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Leave Status Notice -->
      <div
        v-if="currentStatus === 'on-leave'"
        class="alert bg-primaryColor/5 border-primaryColor text-primaryColor font-thin"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="stroke-current shrink-0 w-6 h-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <div>
          <h3 class="font-bold">You are currently on approved leave</h3>
          <div class="text-xs">
            Attendance tracking is disabled during your leave period. You can
            still view your attendance history below.
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-1 md:grid-cols-1 gap-6">
        <!-- QR Code Generator -->
        <div class="card bg-base-100 shadow-xl">
          <div class="card-body">
            <h3 class="card-title">QR Code Attendance</h3>
            <p class="text-sm text-base-content/70 mb-4">
              Generate QR codes for time-in and time-out
            </p>
            <button
              @click="openQRModal"
              class="btn bg-primaryColor text-white font-thin w-full hover:bg-primaryColor/80"
              :disabled="currentStatus === 'on-leave'"
            >
              <Clock class="w-4 h-4 mr-2" />
              {{
                currentStatus === 'on-leave'
                  ? 'Unavailable (On Leave)'
                  : 'Open QR Generator'
              }}
            </button>
          </div>
        </div>
      </div>

      <!-- My Attendance History -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div
            class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 "
          >
<div class="">
              <h3 class="card-title text-lg sm:text-xl">
              My Attendance History
              <span
                v-if="isHistoryLoading"
                class="loading loading-spinner loading-sm ml-2"
              ></span>
              <span
                v-if="!isHistoryLoading && attendanceHistory.length > 0"
                class="badge badge-ghost ml-2"
              >
                {{ attendanceHistory.length }} records
              </span>
            </h3>
</div>
            <div
              class="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full justify-end"
            >
              <div
                class="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto "
              >
                <select
                  v-model="historyRange"
                  class="select select-bordered select-sm w-full sm:w-auto"
                  @change="onHistoryRangeChange"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Month</option>
                </select>
                <!-- Custom Month Picker -->
                <div
                  v-if="historyRange === 'custom'"
                  class="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto"
                >
                  <select
                    v-model="customMonth"
                    class="select select-bordered select-sm w-full sm:min-w-[120px]"
                  >
                    <option value="0">January</option>
                    <option value="1">February</option>
                    <option value="2">March</option>
                    <option value="3">April</option>
                    <option value="4">May</option>
                    <option value="5">June</option>
                    <option value="6">July</option>
                    <option value="7">August</option>
                    <option value="8">September</option>
                    <option value="9">October</option>
                    <option value="10">November</option>
                    <option value="11">December</option>
                  </select>
                  <span class="text-sm text-gray-600 px-2 py-1">
                    {{ customYear }}
                  </span>
                </div>
              </div>
              <button
                @click="refreshAttendance"
                class="btn btn-sm btn-outline font-thin w-full sm:w-auto"
                :disabled="isHistoryLoading"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  :class="{ 'animate-spin': isHistoryLoading }"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  ></path>
                </svg>
                {{ isHistoryLoading ? 'Refreshing...' : 'Refresh' }}
              </button>
            </div>
          </div>

          <!-- Loading State for Table -->
          <div
            v-if="isHistoryLoading"
            class="flex items-center justify-center py-12"
          >
            <div class="flex flex-col items-center space-y-3">
              <span class="loading loading-spinner loading-lg"></span>
              <p class="text-sm text-gray-500">Loading attendance history...</p>
            </div>
          </div>

          <!-- Table Content -->
          <div v-else class="overflow-x-auto">
            <table class="table table-zebra w-full text-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Total Minutes</th>
                  <th>Overtime Minutes</th>
                  <th>Tardiness Minutes</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in paginatedHistory"
                  :key="row.date + '-' + row.timeIn + '-' + row.timeOut"
                >
                  <td>{{ formatDate(row.date) }}</td>
                  <td class="font-mono text-sm">
                    {{ formatTime(row.timeIn) }}
                  </td>
                  <td class="font-mono text-sm">
                    {{ formatTime(row.timeOut) }}
                  </td>

                  <td>
                    <span v-if="row.duration" class="font-mono text-sm">
                      {{ formatHoursWorked(row.duration) }}
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td>
                    <span v-if="row.overtime" class="font-mono text-sm">
                      {{ formatHoursWorked(row.overtime) }}
                    </span>
                    <span v-else class="text-neutral font-mono text-sm"
                      >N/A</span
                    >
                  </td>
                  <td>
                    <span v-if="row.tardiness" class="font-mono text-sm">{{
                      row.tardiness
                    }}</span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                </tr>
                <tr v-if="mergedHistory.length === 0 && !isHistoryLoading">
                  <td colspan="6" class="text-center py-8 text-gray-500">
                    <div class="flex flex-col items-center space-y-2">
                      <svg
                        class="w-12 h-12 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        ></path>
                      </svg>
                      <p>No attendance records found</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div
            v-if="totalPages > 1"
            class="flex justify-center items-center space-x-2 mt-4"
          >
            <button
              @click="currentPage = Math.max(1, currentPage - 1)"
              :disabled="currentPage === 1"
              class="btn btn-sm btn-outline"
            >
              Previous
            </button>
            <span class="text-sm text-gray-500">
              Page {{ currentPage }} of {{ totalPages }}
            </span>
            <button
              @click="currentPage = Math.min(totalPages, currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="btn btn-sm btn-outline"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Overtime Request -->
    <div v-if="activeTab === 'ot'" class="space-y-6">
      <OvertimeRequest @overtime-submitted="handleOvertimeSubmitted" />
    </div>

    <!-- Leave Request -->
    <div v-if="activeTab === 'leave'" class="space-y-6">
      <LeaveRequest @leave-submitted="handleLeaveSubmitted" />
    </div>

    <!-- QR Attendance Modal -->
    <QRAttendanceModal
      :isOpen="showQRModal"
      @close="closeQRModal"
      @viewRecords="refreshAttendance"
    />
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useAuthStore } from '../../stores/authStore';
  import { useAttendanceStore } from '../../stores/attendanceStore';
  import { apiConfig } from '../../config/api';
  import axios from 'axios';
  import QRAttendanceModal from '../../components/QRAttendanceModal.vue';
  import LeaveRequest from '../../components/LeaveRequest.vue';
  import OvertimeRequest from '../../components/OvertimeRequest.vue';
  import { Clock, Timer, FileText } from 'lucide-vue-next';
  import { useCustomToast } from '../../composables/useCustomToast';
  import {
    getCurrentPhilippineTime,
    createPhilippineDate,
    formatForAPI,
  } from '../../utils/timezoneUtils';

  // Stores
  const authStore = useAuthStore();
  const attendanceStore = useAttendanceStore();
  const { showSuccess, showError } = useCustomToast();

  // Helpers for Asia/Manila timezone using timezone utilities
  const toPhYmd = (date) => {
    const phDate = new Date(date);
    return phDate.toLocaleDateString('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // Reactive data
  const isLoading = ref(false);
  const isStatusLoading = ref(false);
  const isHistoryLoading = ref(false);
  const isSubmitting = ref(false);
  const showQRModal = ref(false);
  const showManualModal = ref(false);
  const activeTab = ref('add');
  const route = useRoute();
  const router = useRouter();

  // Tab routing helpers (sync tab with URL query)
  const setActiveTab = (tab) => {
    activeTab.value = tab;
    // Update URL without triggering navigation
    const newQuery = { ...route.query, tab };
    router.replace({ query: newQuery });
  };

  // Watch for URL changes to sync tab
  watch(
    () => route.query.tab,
    (newTab) => {
      if (newTab && ['add', 'ot', 'leave'].includes(newTab)) {
        activeTab.value = newTab;
      }
    },
    { immediate: true }
  );

  const autoRefreshInterval = ref(null);
  const lastUpdated = ref(getCurrentPhilippineTime());

  // Pagination for attendance history
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const totalRecords = ref(0);
  const hasMoreRecords = ref(false);
  const historyRange = ref('today'); // today | week | month | custom
  const customMonth = ref(new Date().getMonth());
  const customYear = ref(new Date().getFullYear());

  // Watch for custom month/year changes
  watch([customMonth, customYear], () => {
    if (historyRange.value === 'custom') {
      currentPage.value = 1;
      fetchAttendanceHistory();
    }
  });

  // Derive real-time status from attendance store
  const today = computed(() => attendanceStore.todayAttendance);
  const hasTimeIn = computed(() => Boolean(today.value?.time_in));
  const hasTimeOut = computed(() => Boolean(today.value?.time_out));
  const isLateToday = computed(
    () => (today.value?.status || '').toLowerCase() === 'late'
  );
  const tardinessMinutesToday = computed(() =>
    Number(today.value?.tardiness_minutes || 0)
  );
  const overtimeMinutesToday = computed(() => {
    const hours = Number(today.value?.overtime_hours || 0);
    if (isNaN(hours)) return 0;
    return Math.round(hours * 60);
  });
  const currentStatus = computed(() => {
    if (today.value?.is_on_leave) return 'on-leave';
    if (hasTimeIn.value && !hasTimeOut.value) return 'checked-in';
    return 'checked-out';
  });
  const statusText = computed(() => {
    if (today.value?.is_on_leave) return 'On Leave';
    if (hasTimeIn.value && !hasTimeOut.value) return 'Currently Checked In';
    if (hasTimeIn.value && hasTimeOut.value) return 'Checked Out';
    return 'Ready to Check In';
  });
  const lastTimeIn = computed(() => today.value?.time_in || null);
  const attendanceHistory = ref([]);

  // Available years for custom month picker (current year ± 2 years)
  const availableYears = computed(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
      years.push(i);
    }
    return years;
  });
  const mergedHistory = computed(() => {
    // Process attendance records for display
    console.log(
      'mergedHistory computed - attendanceHistory.value:',
      attendanceHistory.value
    );

    if (!attendanceHistory.value || attendanceHistory.value.length === 0) {
      return [];
    }

    const result = attendanceHistory.value.map((record) => {
      const timeIn = record.time_in ? new Date(record.time_in) : null;
      const timeOut = record.time_out ? new Date(record.time_out) : null;
      let duration = null;
      let overtime = null;

      if (timeIn && timeOut) {
        const diffMs = timeOut - timeIn;
        const totalMinutes = Math.floor(diffMs / (1000 * 60));
        duration = totalMinutes;

        // Calculate overtime (assuming 8 hours = 480 minutes standard)
        const standardMinutes = 480; // 8 hours
        if (totalMinutes > standardMinutes) {
          overtime = totalMinutes - standardMinutes;
        }
      }

      return {
        date: toPhYmd(
          record.date ||
            record.attendance_date ||
            record.created_at ||
            record.time_in
        ),
        timeIn: timeIn,
        timeOut: timeOut,
        duration: duration,
        overtime: overtime,
        tardiness: record.tardiness_minutes || 0,
        status: record.status || 'Present',
      };
    });

    console.log('mergedHistory result:', result);
    return result;
  });

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(mergedHistory.value.length / itemsPerPage.value))
  );
  const paginatedHistory = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return mergedHistory.value.slice(start, end);
  });

  // Methods
  const openQRModal = () => {
    showQRModal.value = true;
  };

  const closeQRModal = async () => {
    showQRModal.value = false;
    // Refresh data when QR modal closes to get latest attendance status
    await refreshAttendance();
  };

  const openManualModal = () => {
    showManualModal.value = true;
  };

  const closeManualModal = () => {
    showManualModal.value = false;
  };

  const onHistoryRangeChange = () => {
    // Reset to first page when changing range
    currentPage.value = 1;
    // Fetch new data based on selected range
    fetchAttendanceHistory();
  };

  const fetchAttendanceHistory = async (loadMore = false) => {
    try {
      isHistoryLoading.value = true;

      // Determine PH range boundaries using timezone utilities
      const now = getCurrentPhilippineTime();
      let end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      let start;

      if (historyRange.value === 'today') {
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        );
      } else if (historyRange.value === 'week') {
        const startOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const day = startOfToday.getDay();
        const diff = (day + 6) % 7; // Monday start
        const weekStart = new Date(startOfToday);
        weekStart.setDate(weekStart.getDate() - diff);
        start = new Date(
          weekStart.getFullYear(),
          weekStart.getMonth(),
          weekStart.getDate(),
          0,
          0,
          0,
          0
        );
      } else if (historyRange.value === 'custom') {
        // Custom month selection - use native Date constructor for better control
        start = new Date(customYear.value, customMonth.value, 1, 0, 0, 0, 0);
        // Get the last day of the selected month
        const lastDay = new Date(
          customYear.value,
          customMonth.value + 1,
          0
        ).getDate();
        end = new Date(
          customYear.value,
          customMonth.value,
          lastDay,
          23,
          59,
          59,
          999
        );
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      }

      // Format dates for API using timezone utilities
      const startIsoStr = formatForAPI(start);
      const endIsoStr = formatForAPI(end);

      // Use the numeric employee ID (primary key) for the attendance API
      const currentUserId = authStore.user?.id || null;

      const report = await attendanceStore.getAttendanceReport(
        currentUserId,
        startIsoStr,
        endIsoStr
      );

      const newRecords = Array.isArray(report) ? report : [];
      attendanceHistory.value = newRecords;
      currentPage.value = 1;
      hasMoreRecords.value = false;
      totalRecords.value = newRecords.length;
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      showError('Failed to load attendance history');
    } finally {
      isHistoryLoading.value = false;
    }
  };

  const loadMoreHistory = () => {
    if (!isHistoryLoading.value && hasMoreRecords.value) {
      fetchAttendanceHistory(true);
    }
  };

  const checkCurrentStatus = async () => {
    try {
      isStatusLoading.value = true;
      await attendanceStore.fetchTodayAttendance();
      lastUpdated.value = getCurrentPhilippineTime();
    } catch (error) {
      console.error('Error checking current status:', error);
    } finally {
      isStatusLoading.value = false;
    }
  };

  const submitManualEntry = async () => {
    try {
      isSubmitting.value = true;

      const response = await axios.post(
        `${apiConfig.baseURL}/attendance/manual`,
        {
          employee_id: authStore.user.id,
          action: manualEntry.value.action,
          location: manualEntry.value.location,
          notes: manualEntry.value.notes,
        }
      );

      if (response.data.success) {
        showSuccess('Attendance recorded successfully');
        closeManualModal();
        await refreshAttendance();
      } else {
        showError(response.data.message || 'Failed to record attendance');
      }
    } catch (error) {
      console.error('Error submitting manual entry:', error);
      showError('Failed to record attendance');
    } finally {
      isSubmitting.value = false;
    }
  };

  const refreshAttendance = async () => {
    currentPage.value = 1;
    await Promise.all([checkCurrentStatus(), fetchAttendanceHistory()]);
  };

  // Manual entry form
  const manualEntry = ref({
    action: '',
    location: '',
    notes: '',
  });

  const formatTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatHoursWorked = (minutes) => {
    if (!minutes || minutes === 0) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleOvertimeSubmitted = () => {
    showSuccess('Overtime request submitted successfully');
  };

  const handleLeaveSubmitted = () => {
    showSuccess('Leave request submitted successfully');
  };

  // Auto-refresh every 30 seconds
  const startAutoRefresh = () => {
    autoRefreshInterval.value = setInterval(async () => {
      await checkCurrentStatus();
    }, 30000); // 30 seconds
  };

  const stopAutoRefresh = () => {
    if (autoRefreshInterval.value) {
      clearInterval(autoRefreshInterval.value);
      autoRefreshInterval.value = null;
    }
  };

  // Initialize
  onMounted(async () => {
    await Promise.all([checkCurrentStatus(), fetchAttendanceHistory()]);
    startAutoRefresh();
  });

  onUnmounted(() => {
    stopAutoRefresh();
  });
</script>

<style scoped></style>
