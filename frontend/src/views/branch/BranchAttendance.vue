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

    <!-- Tabs (mirrors BranchSales style) -->
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
            class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4"
          >
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
            <div
              class="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full justify-end"
            >
              <div
                class="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto"
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
                  <td colspan="7" class="text-center py-8 text-gray-500">
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

          <!-- Load More Button -->
          <div class="flex justify-center mt-4" v-if="totalPages > 1">
            <div class="join">
              <button
                class="join-item btn btn-sm"
                :disabled="currentPage === 1"
                @click="currentPage = Math.max(1, currentPage - 1)"
              >
                «
              </button>
              <button class="join-item btn btn-sm">
                Page {{ currentPage }} of {{ totalPages }}
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

          <!-- Loading More Indicator -->
          <div
            v-if="isHistoryLoading && attendanceHistory.length > 0"
            class="flex justify-center mt-4"
          >
            <div class="flex items-center space-x-2 text-sm text-gray-500">
              <span class="loading loading-spinner loading-sm"></span>
              <span>Loading more records...</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Apply OT -->
    <div v-if="activeTab === 'ot'">
      <OvertimeRequest />
    </div>

    <!-- Apply Leave -->
    <div v-if="activeTab === 'leave'">
      <LeaveRequest />
    </div>

    <!-- QR Attendance Modal -->
    <QRAttendanceModal
      :isOpen="showQRModal"
      @close="closeQRModal"
      @viewRecords="viewAttendanceRecords"
    />

    <!-- Manual Entry Modal -->
    <div v-if="activeTab === 'add' && showManualModal" class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4">Manual Attendance Entry</h3>
        <form @submit.prevent="submitManualEntry" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Action</span>
            </label>
            <select
              v-model="manualEntry.action"
              class="select select-bordered w-full"
              required
            >
              <option value="">Select Action</option>
              <option value="time-in">Time In</option>
              <option value="time-out">Time Out</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Location</span>
            </label>
            <input
              v-model="manualEntry.location"
              type="text"
              placeholder="Enter location"
              class="input input-bordered w-full"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Notes (Optional)</span>
            </label>
            <textarea
              v-model="manualEntry.notes"
              placeholder="Additional notes..."
              class="textarea textarea-bordered w-full"
              rows="3"
            ></textarea>
          </div>

          <div class="modal-action">
            <button
              type="button"
              @click="closeManualModal"
              class="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="isSubmitting"
            >
              <span
                v-if="isSubmitting"
                class="loading loading-spinner loading-sm"
              ></span>
              {{ isSubmitting ? 'Submitting...' : 'Submit' }}
            </button>
          </div>
        </form>
      </div>
    </div>
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
  import { getCurrentPhilippineTime } from '../../utils/timezoneUtils';

  // Stores
  const authStore = useAuthStore();
  const attendanceStore = useAttendanceStore();

  // Helpers for Asia/Manila time handling
  const toPhYmd = (date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(date));

  const toPhIso = (date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(new Date(date))
      .reduce((acc, p) => ((acc[p.type] = p.value), acc), {});
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+08:00`;
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
  const validTabs = new Set(['add', 'ot', 'leave']);
  const setActiveTab = (tab) => {
    const nextTab = validTabs.has(tab) ? tab : 'add';
    if (activeTab.value !== nextTab) {
      activeTab.value = nextTab;
    }
    // Update URL query without reloading component
    router.replace({
      query: { ...route.query, tab: nextTab },
    });
  };

  // Initialize tab from query on mount
  const initTabFromRoute = () => {
    const qTab = (route.query?.tab || '').toString();
    if (validTabs.has(qTab)) {
      activeTab.value = qTab;
    }
  };

  // Watch route changes (e.g., when navigated from dropdown)
  watch(
    () => route.query.tab,
    (newVal) => {
      const qTab = (newVal || '').toString();
      if (validTabs.has(qTab) && activeTab.value !== qTab) {
        activeTab.value = qTab;
      }
    }
  );

  const autoRefreshInterval = ref(null);
  const lastUpdated = ref(new Date());

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
  const scheduleValidation = ref(null);
  const currentStatus = computed(() => {
    if (today.value?.is_on_leave) return 'on-leave';
    if (hasTimeIn.value && !hasTimeOut.value) return 'checked-in';
    return 'checked-out';
  });
  const statusText = computed(() => {
    if (today.value?.is_on_leave) return 'On Leave';
    if (hasTimeIn.value && !hasTimeOut.value) return 'Currently Checked In';
    if (hasTimeIn.value && hasTimeOut.value) return 'Checked Out';
    // Respect schedule validation when available
    if (
      scheduleValidation.value &&
      scheduleValidation.value.isValid === false &&
      scheduleValidation.value.reason !== 'NO_SCHEDULE'
    ) {
      return (
        scheduleValidation.value.message || 'Time-in outside scheduled hours'
      );
    }
    if (
      scheduleValidation.value &&
      scheduleValidation.value.reason === 'NO_SCHEDULE'
    ) {
      return 'No Schedule Today';
    }
    return 'Ready to Check In';
  });
  const lastTimeIn = computed(() => today.value?.time_in || null);
  const attendanceHistory = ref([]);
  const mergedHistory = computed(() => {
    // Process attendance records for display
    console.log(
      'mergedHistory computed - attendanceHistory.value:',
      attendanceHistory.value
    );

    if (!attendanceHistory.value || attendanceHistory.value.length === 0) {
      console.log('No attendance history data found');
      return [];
    }

    // If we have a single record (today's attendance), format it for display
    const records = Array.isArray(attendanceHistory.value)
      ? attendanceHistory.value
      : [attendanceHistory.value];
    console.log('Records to process:', records);

    const byDate = {};
    records.forEach((rec) => {
      const dateKey = toPhYmd(rec.created_at || rec.time_in);
      console.log('Processing record:', rec, 'Date key:', dateKey);

      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          date: dateKey,
          timeIn: null,
          timeOut: null,
          location: rec.location_name || 'QR Code Scan',
          duration: null,
          overtime: null,
          tardiness: null,
        };
      }

      // Handle both single record format and event-based format
      if (rec.time_in) {
        byDate[dateKey].timeIn = rec.time_in;
      }
      if (rec.time_out) {
        byDate[dateKey].timeOut = rec.time_out;
      }

      // Handle event_type format (legacy)
      if (rec.event_type === 'time-in') {
        byDate[dateKey].timeIn = rec.created_at;
      } else if (rec.event_type === 'time-out') {
        byDate[dateKey].timeOut = rec.created_at;
      }

      // Prefer latest known location if available
      if (rec.location_name) byDate[dateKey].location = rec.location_name;
      if (rec.duration) byDate[dateKey].duration = rec.duration;
      if (rec.overtime_hours && parseFloat(rec.overtime_hours) > 0) {
        byDate[dateKey].overtime = rec.overtime_hours;
      }
      if (typeof rec.tardiness_minutes !== 'undefined') {
        byDate[dateKey].tardiness = rec.tardiness_minutes;
      }

      // Map hours_worked to duration for display
      if (rec.hours_worked) {
        byDate[dateKey].duration = rec.hours_worked;
      }

      // Map overtime_hours to overtime for display
      if (rec.overtime_hours && parseFloat(rec.overtime_hours) > 0) {
        byDate[dateKey].overtime = rec.overtime_hours;
      }
    });

    let result = Object.values(byDate).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    // Apply range filter
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    let start;
    if (historyRange.value === 'today') {
      start = startOfToday;
    } else if (historyRange.value === 'week') {
      const day = startOfToday.getDay();
      const diff = (day + 6) % 7; // Monday as start (optional)
      start = new Date(startOfToday);
      start.setDate(start.getDate() - diff);
    } else if (historyRange.value === 'custom') {
      // Custom month selection
      start = new Date(customYear.value, customMonth.value, 1);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Filter using PH date strings to avoid TZ drift
    const startKey = toPhYmd(start);
    result = result.filter((r) => r.date >= startKey);

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

  // Manual entry form
  const manualEntry = ref({
    action: '',
    location: '',
    notes: '',
  });

  // API Configuration
  const API_BASE_URL = apiConfig.baseURL;
  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

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
    manualEntry.value = { action: '', location: '', notes: '' };
  };

  const onHistoryRangeChange = () => {
    // Reset to first page when changing range
    currentPage.value = 1;
    // Fetch new data based on selected range
    fetchAttendanceHistory();
  };

  const viewAttendanceRecords = () => {
    closeQRModal();
    // For branch employees, we'll show their own records in this component
    fetchAttendanceHistory();
  };

  const fetchAttendanceHistory = async (loadMore = false) => {
    try {
      isHistoryLoading.value = true;

      // Determine date range
      const now = new Date();
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
        start = new Date(startOfToday);
        start.setDate(start.getDate() - diff);
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

      // Fetch report for current user over the selected range
      // Use PH ISO boundaries
      const startIso = toPhIso(start);
      const endIso = toPhIso(end);
      const currentUserId =
        authStore.user?.id || authStore.user?.employee_internal_id || null;
      const report = await attendanceStore.getAttendanceReport(
        currentUserId,
        startIso,
        endIso
      );
      attendanceHistory.value = Array.isArray(report) ? report : [];
      totalRecords.value = attendanceHistory.value.length;
      hasMoreRecords.value = false;
      lastUpdated.value = new Date();
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      if (!loadMore) {
        attendanceHistory.value = [];
      }
    } finally {
      isHistoryLoading.value = false;
    }
  };

  const loadMoreHistory = () => {
    currentPage.value += 1;
    fetchAttendanceHistory(true);
  };

  const checkCurrentStatus = async () => {
    try {
      isStatusLoading.value = true;
      await attendanceStore.fetchTodayAttendance();
      // Also validate schedule to drive accurate status messaging
      try {
        const nowPh = getCurrentPhilippineTime();
        scheduleValidation.value =
          await attendanceStore.validateSchedule(nowPh);
      } catch (e) {
        scheduleValidation.value = null;
      }
      lastUpdated.value = new Date();
    } catch (error) {
      console.error('Error checking attendance status:', error);
    } finally {
      isStatusLoading.value = false;
    }
  };

  const submitManualEntry = async () => {
    try {
      isSubmitting.value = true;

      if (manualEntry.value.action === 'time-in') {
        await attendanceStore.timeIn(
          'MANUAL_ENTRY',
          manualEntry.value.location
        );
      } else if (manualEntry.value.action === 'time-out') {
        await attendanceStore.timeOut();
      }

      closeManualModal();
      await Promise.all([checkCurrentStatus(), fetchAttendanceHistory()]);
    } catch (error) {
      console.error('Error submitting manual entry:', error);
    } finally {
      isSubmitting.value = false;
    }
  };

  const refreshAttendance = async () => {
    currentPage.value = 1;
    await Promise.all([checkCurrentStatus(), fetchAttendanceHistory()]);
  };

  // Auto-refresh methods
  const startAutoRefresh = () => {
    // Refresh every 30 seconds
    autoRefreshInterval.value = setInterval(async () => {
      await checkCurrentStatus();
      // Only refresh history if we're on the attendance tab
      if (activeTab.value === 'add') {
        await fetchAttendanceHistory();
      }
    }, 30000);
  };

  const stopAutoRefresh = () => {
    if (autoRefreshInterval.value) {
      clearInterval(autoRefreshInterval.value);
      autoRefreshInterval.value = null;
    }
  };

  const getEventTypeBadgeClass = (eventType) => {
    switch (eventType) {
      case 'time-in':
        return 'badge-success';
      case 'time-out':
        return 'badge-warning';
      default:
        return 'badge-ghost';
    }
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
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatHoursWorked = (hoursString) => {
    if (!hoursString) return 'N/A';

    // Convert string to number
    const hours = parseFloat(hoursString);

    if (isNaN(hours)) return 'N/A';

    // Convert hours to minutes for display
    const totalMinutes = Math.round(hours * 60);
    const hoursPart = Math.floor(totalMinutes / 60);
    const minutesPart = totalMinutes % 60;

    if (hoursPart > 0) {
      return minutesPart > 0
        ? `${hoursPart}h ${minutesPart}m`
        : `${hoursPart}h`;
    } else {
      return `${minutesPart}m`;
    }
  };

  // Lifecycle
  onMounted(() => {
    Promise.all([checkCurrentStatus(), fetchAttendanceHistory()]).then(() => {
      startAutoRefresh();
    });
  });

  // Cleanup on unmount
  onUnmounted(() => {
    stopAutoRefresh();
  });
</script>

<style scoped>
  /* Add any custom styles here */
</style>
