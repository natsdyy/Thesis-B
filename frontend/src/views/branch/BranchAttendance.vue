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
                ? '!bg-success/5 !text-success !border-success'
                : '!bg-success/5 !text-success !border-success'
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
            <div class="flex items-center gap-2">
              <select
                v-model="historyRange"
                class="select select-bordered select-sm"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
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
    <div v-if="activeTab === 'ot'" class="space-y-6">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title text-2xl mb-4">Apply Overtime</h2>
          <form class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control md:col-span-2">
              <label class="label"><span class="label-text">Date</span></label>
              <input
                v-model="otDate"
                type="date"
                class="input input-bordered w-full"
              />
            </div>
            <div class="form-control">
              <label class="label"
                ><span class="label-text">Start Time</span></label
              >
              <input
                v-model="otStartTime"
                type="time"
                class="input input-bordered w-full"
              />
            </div>
            <div class="form-control">
              <label class="label"
                ><span class="label-text">End Time</span></label
              >
              <input
                v-model="otEndTime"
                type="time"
                class="input input-bordered w-full"
              />
            </div>
            <div class="form-control md:col-span-2">
              <label class="label"
                ><span class="label-text">Reason</span></label
              >
              <textarea
                v-model="otReason"
                class="textarea textarea-bordered w-full"
                rows="3"
                placeholder="Describe the reason"
              ></textarea>
            </div>
            <div class="md:col-span-2 flex justify-end">
              <button
                type="button"
                @click="openOTConfirmModal"
                class="btn bg-primaryColor text-white font-thin hover:bg-primaryColor/80"
              >
                Submit OT Request
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- My Overtime Requests -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h3 class="card-title">
              My Overtime Requests
              <span
                v-if="myOtRequests.length > 0"
                class="badge badge-ghost ml-2"
              >
                {{ myOtRequests.length }} records
              </span>
            </h3>
          </div>

          <div
            v-if="myOtRequests.length === 0"
            class="text-center py-8 text-gray-500"
          >
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
              <p>No overtime requests yet</p>
            </div>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Hours</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="req in paginatedMyOtRequests" :key="req.id">
                  <td>{{ formatDate(req.date) }}</td>
                  <td class="font-mono text-sm">
                    {{ formatTime(req.start_at) }} -
                    {{ formatTime(req.end_at) }}
                  </td>
                  <td>
                    <span class="font-mono text-sm"
                      >{{ req.total_hours }}h</span
                    >
                  </td>
                  <td>
                    <div class="max-w-xs truncate" :title="req.reason">
                      {{ req.reason }}
                    </div>
                  </td>
                  <td>
                    <div
                      :class="[
                        'badge badge-sm border-none font-medium',
                        getOtBadgeClass(req.status),
                      ]"
                    >
                      {{
                        req.status.charAt(0).toUpperCase() + req.status.slice(1)
                      }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Pagination Controls -->
            <div class="flex justify-center mt-4">
              <div class="join">
                <button
                  class="join-item btn btn-sm"
                  :disabled="otCurrentPage === 1"
                  @click="otCurrentPage = Math.max(1, otCurrentPage - 1)"
                >
                  «
                </button>
                <button class="join-item btn btn-sm">
                  Page {{ otCurrentPage }} of {{ otTotalPages }}
                </button>
                <button
                  class="join-item btn btn-sm"
                  :disabled="otCurrentPage === otTotalPages"
                  @click="
                    otCurrentPage = Math.min(otTotalPages, otCurrentPage + 1)
                  "
                >
                  »
                </button>
              </div>
            </div>
          </div>
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

    <!-- Submit OT Confirmation Modal -->
    <div v-if="showOTConfirmModal" class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Confirm Overtime Request
        </h3>

        <div class="space-y-3">
          <div class="grid grid-cols-3 gap-2 text-sm">
            <div class="text-gray-600">Date</div>
            <div class="col-span-2 font-medium">{{ formatDate(otDate) }}</div>
            <div class="text-gray-600">Time</div>
            <div class="col-span-2 font-medium">
              {{ otStartTime }} - {{ otEndTime }}
            </div>
            <div class="text-gray-600">Reason</div>
            <div class="col-span-2">{{ otReason || '—' }}</div>
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
              >Are you sure you want to submit this overtime request?</span
            >
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeOTModal"
            class="btn btn-ghost btn-sm font-thin"
            :disabled="isSubmittingOT"
          >
            Cancel
          </button>
          <button
            @click="submitOTRequestConfirmed"
            class="btn bg-primaryColor text-white btn-sm font-thin"
            :disabled="isSubmittingOT"
          >
            <span
              v-if="isSubmittingOT"
              class="loading loading-spinner loading-sm mr-2"
            ></span>
            {{ isSubmittingOT ? 'Submitting...' : 'Submit Request' }}
          </button>
        </div>
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
  const showOTConfirmModal = ref(false);
  const isSubmittingOT = ref(false);
  const otDate = ref('');
  const otStartTime = ref('');
  const otEndTime = ref('');
  const otReason = ref('');
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
  const historyRange = ref('today'); // today | week | month
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
  // Mock: My overtime requests (replace with API/store when available)
  const myOtRequests = ref([
    {
      id: 1,
      date: new Date().toISOString().split('T')[0],
      start_at: '2025-09-25T18:00:00Z',
      end_at: '2025-09-25T21:00:00Z',
      total_hours: 3,
      reason: 'Assisted with end-of-day inventory and cleanup',
      status: 'pending', // pending | approved | rejected
    },
    {
      id: 2,
      date: '2025-09-24',
      start_at: '2025-09-24T17:30:00Z',
      end_at: '2025-09-24T20:00:00Z',
      total_hours: 2.5,
      reason: 'Handled late orders during peak hours',
      status: 'approved',
    },
    {
      id: 3,
      date: '2025-09-22',
      start_at: '2025-09-22T19:00:00Z',
      end_at: '2025-09-22T22:00:00Z',
      total_hours: 3,
      reason: 'Training for new POS features',
      status: 'rejected',
    },
  ]);

  // Pagination for My OT Requests
  const otCurrentPage = ref(1);
  const otItemsPerPage = ref(5);
  const otTotalPages = computed(() =>
    Math.max(1, Math.ceil(myOtRequests.value.length / otItemsPerPage.value))
  );
  const paginatedMyOtRequests = computed(() => {
    const start = (otCurrentPage.value - 1) * otItemsPerPage.value;
    const end = start + otItemsPerPage.value;
    return myOtRequests.value.slice(start, end);
  });
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
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    result = result.filter((r) => new Date(r.date) >= start);

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

  const openOTConfirmModal = () => {
    // Basic validation before showing modal
    if (!otDate.value || !otStartTime.value || !otEndTime.value) {
      // Keep UX simple here; in your app you might use a toast
      return;
    }
    showOTConfirmModal.value = true;
  };

  const closeOTModal = () => {
    if (isSubmittingOT.value) return;
    showOTConfirmModal.value = false;
  };

  const submitOTRequestConfirmed = async () => {
    try {
      isSubmittingOT.value = true;
      // Simulate API latency
      await new Promise((r) => setTimeout(r, 1200));

      // Compute hours quickly (naive, for mock/demo)
      const start = new Date(`${otDate.value}T${otStartTime.value}:00`);
      const end = new Date(`${otDate.value}T${otEndTime.value}:00`);
      const hours = Math.max(0, (end - start) / (1000 * 60 * 60));

      myOtRequests.value = [
        {
          id: Date.now(),
          date: otDate.value,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          total_hours: Math.round(hours * 10) / 10,
          reason: otReason.value,
          status: 'pending',
        },
        ...myOtRequests.value,
      ];

      // Reset form
      otDate.value = '';
      otStartTime.value = '';
      otEndTime.value = '';
      otReason.value = '';

      // Reset pagination to first page to show newest item
      if (typeof otCurrentPage !== 'undefined' && otCurrentPage) {
        otCurrentPage.value = 1;
      }

      showOTConfirmModal.value = false;
    } catch (e) {
      console.error('Error submitting OT request:', e);
    } finally {
      isSubmittingOT.value = false;
    }
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

      // Determine date range
      const now = new Date();
      const end = new Date(
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
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      }

      // Fetch report for current user over the selected range
      const startIso = start.toISOString();
      const endIso = end.toISOString();
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

  const getOtBadgeClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'approved':
        return 'bg-success/20 text-success';
      case 'rejected':
        return 'bg-error/20 text-error';
      case 'pending':
      default:
        return 'bg-warning/20 text-warning';
    }
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
