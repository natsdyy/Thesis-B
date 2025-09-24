<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold">My Attendance</h1>
      <div class="text-sm text-base-content/70">
        Last updated: {{ lastUpdated.toLocaleTimeString() }}
        <span v-if="isStatusLoading || isHistoryLoading" class="ml-2">
          <span class="loading loading-spinner loading-xs"></span>
          Updating...
        </span>
      </div>
    </div>

    <!-- Tabs (mirrors BranchSales style) -->
    <div class="tabs tabs-boxed mb-4 justify-start w-full">
      <button
        @click="activeTab = 'add'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'add' }"
      >
        <Clock class="w-4 h-4 mr-2" />
        <span>Add Attendance</span>
      </button>
      <button
        @click="activeTab = 'ot'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'ot' }"
      >
        <Timer class="w-4 h-4 mr-2" />
        <span>Apply Overtime</span>
      </button>
      <button
        @click="activeTab = 'leave'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'leave' }"
      >
        <FileText class="w-4 h-4 mr-2" />
        <span>Apply Leave</span>
      </button>
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
              currentStatus === 'checked-in'
                ? 'alert-success border-none'
                : 'bg-success/5 text-success border-success'
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
            </div>
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
            >
              <Clock class="w-4 h-4 mr-2" />
              Open QR Generator
            </button>
          </div>
        </div>
      </div>

      <!-- My Attendance History -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h3 class="card-title">
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
            <button
              @click="refreshAttendance"
              class="btn btn-sm btn-outline font-thin"
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
            <table class="table table-zebra w-full">
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
                <tr v-for="row in mergedHistory" :key="row.date">
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
                    <span v-else class="text-gray-400">-</span>
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
          <div
            v-if="hasMoreRecords && !isHistoryLoading"
            class="flex justify-center mt-4"
          >
            <button @click="loadMoreHistory" class="btn btn-outline btn-sm">
              Load More Records
            </button>
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
    <div v-if="activeTab === 'ot'" class="space-y-6">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-2xl mb-4">Apply Overtime</h2>
          <form class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control md:col-span-2">
              <label class="label"><span class="label-text">Date</span></label>
              <input type="date" class="input input-bordered w-full" />
            </div>
            <div class="form-control">
              <label class="label"
                ><span class="label-text">Start Time</span></label
              >
              <input type="time" class="input input-bordered w-full" />
            </div>
            <div class="form-control">
              <label class="label"
                ><span class="label-text">End Time</span></label
              >
              <input type="time" class="input input-bordered w-full" />
            </div>
            <div class="form-control md:col-span-2">
              <label class="label"
                ><span class="label-text">Reason</span></label
              >
              <textarea
                class="textarea textarea-bordered w-full"
                rows="3"
                placeholder="Describe the reason"
              ></textarea>
            </div>
            <div class="md:col-span-2 flex justify-end">
              <button
                type="button"
                class="btn bg-primaryColor text-white font-thin hover:bg-primaryColor/80"
              >
                Submit OT Request
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Apply Leave -->
    <div v-if="activeTab === 'leave'" class="space-y-6">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-2xl mb-4">Apply Leave</h2>
          <form class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text">From</span></label>
              <input type="date" class="input input-bordered w-full" />
            </div>
            <div class="form-control">
              <label class="label"><span class="label-text">To</span></label>
              <input type="date" class="input input-bordered w-full" />
            </div>
            <div class="form-control">
              <label class="label"
                ><span class="label-text">Leave Type</span></label
              >
              <select class="select select-bordered w-full">
                <option value="">Select type</option>
                <option>Sick Leave</option>
                <option>Vacation Leave</option>
                <option>Emergency Leave</option>
                <option>Maternity Leave</option>
                <option>Other</option>
              </select>
            </div>
            <div class="form-control md:col-span-2">
              <label class="label"
                ><span class="label-text">Reason</span></label
              >
              <textarea
                class="textarea textarea-bordered w-full"
                rows="3"
                placeholder="Describe the reason"
              ></textarea>
            </div>
            <div class="md:col-span-2 flex justify-end">
              <button type="button" class="btn bg-primaryColor text-white">
                Submit Leave Request
              </button>
            </div>
          </form>
        </div>
      </div>
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
  import { ref, onMounted, onUnmounted, computed } from 'vue';
  import { useAuthStore } from '../../stores/authStore';
  import { useAttendanceStore } from '../../stores/attendanceStore';
  import { apiConfig } from '../../config/api';
  import axios from 'axios';
  import QRAttendanceModal from '../../components/QRAttendanceModal.vue';
  import { Clock, Timer, FileText } from 'lucide-vue-next';

  // Stores
  const authStore = useAuthStore();
  const attendanceStore = useAttendanceStore();

  // Reactive data
  const isLoading = ref(false);
  const isStatusLoading = ref(false);
  const isHistoryLoading = ref(false);
  const isSubmitting = ref(false);
  const showQRModal = ref(false);
  const showManualModal = ref(false);
  const activeTab = ref('add');
  const autoRefreshInterval = ref(null);
  const lastUpdated = ref(new Date());

  // Pagination for attendance history
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const totalRecords = ref(0);
  const hasMoreRecords = ref(false);
  // Derive real-time status from attendance store
  const today = computed(() => attendanceStore.todayAttendance);
  const hasTimeIn = computed(() => Boolean(today.value?.time_in));
  const hasTimeOut = computed(() => Boolean(today.value?.time_out));
  const currentStatus = computed(() => {
    if (hasTimeIn.value && !hasTimeOut.value) return 'checked-in';
    return 'checked-out';
  });
  const statusText = computed(() => {
    if (hasTimeIn.value && !hasTimeOut.value) return 'Currently Checked In';
    if (hasTimeIn.value && hasTimeOut.value) return 'Checked Out';
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
      const dateKey = new Date(rec.created_at || rec.time_in)
        .toISOString()
        .split('T')[0];
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
      if (rec.overtime_hours) byDate[dateKey].overtime = rec.overtime_hours;

      // Map hours_worked to duration for display
      if (rec.hours_worked) {
        byDate[dateKey].duration = rec.hours_worked;
      }

      // Map overtime_hours to overtime for display
      if (rec.overtime_hours) {
        byDate[dateKey].overtime = rec.overtime_hours;
      }
    });

    const result = Object.values(byDate).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    console.log('mergedHistory result:', result);
    return result;
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

  const viewAttendanceRecords = () => {
    closeQRModal();
    // For branch employees, we'll show their own records in this component
    fetchAttendanceHistory();
  };

  const fetchAttendanceHistory = async (loadMore = false) => {
    try {
      isHistoryLoading.value = true;

      if (!loadMore) {
        currentPage.value = 1;
        attendanceHistory.value = [];
      }

      // For now, let's use today's attendance data from the store
      // This will show the current attendance record in the history table
      const todayData = attendanceStore.todayAttendance;

      if (todayData) {
        // Convert today's attendance record to array format for display
        const historyArray = [todayData];
        console.log('Today data found:', todayData);
        console.log('History array:', historyArray);

        if (loadMore) {
          attendanceHistory.value = [
            ...attendanceHistory.value,
            ...historyArray,
          ];
        } else {
          attendanceHistory.value = historyArray;
        }

        console.log('Attendance history updated:', attendanceHistory.value);

        // Update pagination info
        totalRecords.value = historyArray.length;
        hasMoreRecords.value = false; // For now, we only show today's record
        lastUpdated.value = new Date();
      } else {
        // If no today's data, try to fetch from API directly
        const today = new Date().toISOString().split('T')[0];
        const response = await axios.get(`${API_BASE_URL}/attendance/today`, {
          headers: authHeaders(),
        });

        if (response.data.success && response.data.data) {
          const historyArray = [response.data.data];

          if (loadMore) {
            attendanceHistory.value = [
              ...attendanceHistory.value,
              ...historyArray,
            ];
          } else {
            attendanceHistory.value = historyArray;
          }

          totalRecords.value = historyArray.length;
          hasMoreRecords.value = false;
          lastUpdated.value = new Date();
        }
      }
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
