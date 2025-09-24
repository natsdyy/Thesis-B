<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold">My Attendance</h1>
      <div class="text-sm text-base-content/70">
        Last updated: {{ new Date().toLocaleDateString() }}
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
          <h2 class="card-title text-2xl mb-4">Current Status</h2>
          <div
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
            <h3 class="card-title">My Attendance History</h3>
            <button
              @click="refreshAttendance"
              class="btn btn-sm btn-outline font-thin"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                ></path>
              </svg>
              Refresh
            </button>
          </div>

          <div class="overflow-x-auto">
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
                    <span v-if="row.duration" class="font-mono text-sm">{{
                      row.duration
                    }}</span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td>
                    <span v-if="row.overtime" class="font-mono text-sm">{{
                      row.overtime
                    }}</span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td>
                    <span v-if="row.tardiness" class="font-mono text-sm">{{
                      row.tardiness
                    }}</span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                </tr>
                <tr v-if="mergedHistory.length === 0">
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
              <button type="button" class="btn bg-primaryColor text-white font-thin hover:bg-primaryColor/80">
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
  import { ref, onMounted, computed } from 'vue';
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
  const isSubmitting = ref(false);
  const showQRModal = ref(false);
  const showManualModal = ref(false);
  const activeTab = ref('add');
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
    // Merge separate time-in/time-out events for the same day into one row
    const byDate = {};
    attendanceHistory.value.forEach((rec) => {
      const dateKey = new Date(rec.created_at).toISOString().split('T')[0];
      if (!byDate[dateKey])
        byDate[dateKey] = {
          date: dateKey,
          timeIn: null,
          timeOut: null,
          location: rec.location_name || null,
          duration: null,
        };
      if (rec.event_type === 'time-in') {
        byDate[dateKey].timeIn = rec.created_at;
      } else if (rec.event_type === 'time-out') {
        byDate[dateKey].timeOut = rec.created_at;
      }
      // Prefer latest known location if available
      if (rec.location_name) byDate[dateKey].location = rec.location_name;
      if (rec.duration) byDate[dateKey].duration = rec.duration;
    });
    return Object.values(byDate).sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
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

  const closeQRModal = () => {
    showQRModal.value = false;
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

  const fetchAttendanceHistory = async () => {
    try {
      isLoading.value = true;
      const today = new Date().toISOString().split('T')[0];
      const response = await axios.get(`${API_BASE_URL}/attendance/history`, {
        headers: authHeaders(),
        params: {
          start_date: today,
          end_date: today,
          employee_id: authStore.user?.employee_id,
        },
      });

      if (response.data.success) {
        attendanceHistory.value = response.data.data || [];
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
      attendanceHistory.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const checkCurrentStatus = async () => {
    try {
      await attendanceStore.fetchTodayAttendance();
    } catch (error) {
      console.error('Error checking attendance status:', error);
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

  const refreshAttendance = () => {
    Promise.all([checkCurrentStatus(), fetchAttendanceHistory()]);
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

  // Lifecycle
  onMounted(() => {
    Promise.all([checkCurrentStatus(), fetchAttendanceHistory()]);
  });
</script>

<style scoped>
  /* Add any custom styles here */
</style>
