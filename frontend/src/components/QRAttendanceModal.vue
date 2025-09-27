<template>
  <div v-if="isOpen" class="modal modal-open">
    <div class="modal-box max-w-md">
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-bold text-xl">QR Code Attendance</h3>
        <button @click="closeModal" class="btn btn-sm btn-circle btn-ghost">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Current Status -->
      <div class="mb-6">
        <div
          class="alert"
          :class="
            currentStatus === 'on-leave'
              ? 'bg-warning/10 border-warning'
              : 'bg-success/10 border-success'
          "
        >
          <Clock class="w-5 h-5" />
          <div>
            <div class="font-medium">Current Status</div>
            <div class="text-sm opacity-80">
              {{
                currentStatus === 'on-leave'
                  ? 'On Leave'
                  : currentStatus === 'checked-out'
                    ? 'Ready to Time In'
                    : 'Ready to Time Out'
              }}
            </div>
            <div
              v-if="isLateToday && tardinessMinutesToday > 0"
              class="text-xs mt-1 text-warning"
            >
              Late by {{ tardinessMinutesToday }} minute(s)
            </div>
            <div
              v-if="currentStatus === 'on-leave'"
              class="text-xs mt-1 text-warning"
            >
              Attendance tracking is disabled during your leave period
            </div>
          </div>
        </div>
      </div>

      <!-- Schedule Information -->
      <div class="mb-6">
        <div class="card bg-base-100 shadow-sm border">
          <div class="card-body p-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-sm flex items-center">
                <Calendar class="w-4 h-4 mr-2" />
                Today's Schedule
              </h4>
              <button
                @click="fetchScheduleInfo"
                :disabled="scheduleLoading"
                class="btn btn-xs btn-outline"
              >
                <span
                  v-if="scheduleLoading"
                  class="loading loading-spinner loading-xs"
                ></span>
                {{ scheduleLoading ? 'Loading...' : 'Refresh' }}
              </button>
            </div>

            <!-- Loading State -->
            <div v-if="scheduleLoading" class="text-center py-4">
              <div class="loading loading-spinner loading-sm"></div>
              <p class="text-xs text-gray-500 mt-2">Loading schedule...</p>
            </div>

            <!-- Schedule Display -->
            <div v-else-if="scheduleInfo">
              <div v-if="scheduleInfo.hasSchedule" class="space-y-2">
                <!-- Schedule Details -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <div
                      :class="[
                        'w-3 h-3 rounded-full',
                        scheduleValidation?.isValid
                          ? 'bg-success'
                          : scheduleValidation?.reason === 'NO_SCHEDULE'
                            ? 'bg-warning'
                            : 'bg-error',
                      ]"
                    ></div>
                    <span class="text-sm font-medium">
                      {{ scheduleInfo.schedule.shift_name }}
                    </span>
                  </div>
                  <div class="text-xs text-gray-600">
                    {{ scheduleInfo.schedule.start_time }} -
                    {{ scheduleInfo.schedule.end_time }}
                  </div>
                </div>

                <!-- Validation Status -->
                <div v-if="scheduleValidation" class="text-xs">
                  <div
                    :class="[
                      'flex items-center space-x-1',
                      scheduleValidation.isValid
                        ? 'text-success'
                        : 'text-warning',
                    ]"
                  >
                    <CheckCircle
                      v-if="scheduleValidation.isValid"
                      class="w-3 h-3"
                    />
                    <AlertCircle v-else class="w-3 h-3" />
                    <span>{{ scheduleValidation.message }}</span>
                  </div>
                  <div
                    v-if="
                      scheduleValidation.timeDifference &&
                      !scheduleValidation.isValid
                    "
                    class="text-xs text-gray-500 mt-1"
                  >
                    Current time: {{ scheduleValidation.currentTime }}
                  </div>
                </div>

                <!-- Notes -->
                <div
                  v-if="scheduleInfo.schedule.notes"
                  class="text-xs text-gray-600 bg-gray-50 p-2 rounded"
                >
                  <strong>Note:</strong> {{ scheduleInfo.schedule.notes }}
                </div>
              </div>

              <!-- No Schedule -->
              <div v-else class="text-center py-4">
                <AlertCircle class="w-8 h-8 text-warning mx-auto mb-2" />
                <p class="text-sm text-warning font-medium">No Schedule</p>
                <p class="text-xs text-gray-500">{{ scheduleInfo.message }}</p>
              </div>
            </div>

            <!-- Error State -->
            <div v-else class="text-center py-4">
              <AlertCircle class="w-8 h-8 text-error mx-auto mb-2" />
              <p class="text-sm text-error font-medium">
                Error Loading Schedule
              </p>
              <p class="text-xs text-gray-500">
                Unable to retrieve schedule information
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Location Status -->
      <div class="mb-6">
        <div class="card bg-base-100 shadow-sm border">
          <div class="card-body p-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-sm">Location Status</h4>
              <button
                @click="checkLocation"
                :disabled="locationChecking"
                class="btn btn-xs btn-outline"
              >
                <svg
                  v-if="!locationChecking"
                  class="w-3 h-3 mr-1"
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
                <span
                  v-if="locationChecking"
                  class="loading loading-spinner loading-xs"
                ></span>
                {{ locationChecking ? 'Checking...' : 'Check Location' }}
              </button>
            </div>

            <!-- Location Status Display -->
            <div v-if="locationStatus">
              <div class="flex items-center space-x-2 mb-2">
                <div
                  :class="[
                    'w-3 h-3 rounded-full',
                    locationStatus.withinRadius
                      ? 'bg-success'
                      : locationStatus.error
                        ? 'bg-warning'
                        : 'bg-error',
                  ]"
                ></div>
                <span class="text-sm font-medium">
                  {{
                    locationStatus.withinRadius
                      ? 'Within Range'
                      : locationStatus.error
                        ? 'Location Error'
                        : 'Too Far Away'
                  }}
                </span>
              </div>

              <div class="text-xs text-gray-600 space-y-1">
                <div>Distance: {{ locationStatus.distance || 'Unknown' }}</div>
                <div>
                  Required: Within {{ locationStatus.requiredRadius || '2m' }}
                </div>
                <div v-if="locationStatus.accuracy" class="text-gray-500">
                  GPS Accuracy: ±{{ locationStatus.accuracy }}m
                  <span
                    v-if="locationStatus.accuracy > 100"
                    class="text-warning font-medium"
                  >
                    (Poor signal - try moving to an open area)
                  </span>
                  <span
                    v-else-if="locationStatus.accuracy > 50"
                    class="text-warning font-medium"
                  >
                    (Fair signal)
                  </span>
                  <span v-else class="text-success font-medium">
                    (Good signal)
                  </span>
                </div>
                <div
                  v-if="locationStatus.error"
                  class="text-warning mt-2 p-2 bg-warning/10 rounded text-xs"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <strong>Error:</strong> {{ locationStatus.error }}
                      <div
                        v-if="locationStatus.error.includes('timeout')"
                        class="text-xs mt-1"
                      >
                        GPS is taking too long. Try moving to an open area or
                        retry.
                      </div>
                    </div>
                    <button
                      v-if="locationStatus.error.includes('timeout')"
                      @click="checkLocation"
                      :disabled="locationChecking"
                      class="btn btn-xs btn-outline ml-2"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-sm text-gray-700">
              <div class="mb-2 font-medium">
                Click "Check Location" to verify your position
              </div>
              <div
                class="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg font-thin"
              >
                <strong class="text-gray-800">Note:</strong> Location access is
                required for attendance validation. If you're having timeout
                issues, try:
                <ul class="list-disc list-inside mt-2 space-y-1 text-gray-700">
                  <li>Move to an open area with better GPS signal</li>
                  <li>Wait 30-60 seconds for GPS to lock</li>
                  <li>Allow location access in your browser</li>
                  <li>Ensure GPS is enabled on your device</li>
                  <li>Try refreshing the page if timeout persists</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- QR Code Generation -->
      <div class="text-center mb-6">
        <div class="bg-white p-6 rounded-lg shadow-lg inline-block">
          <div
            v-if="qrCodeLoading"
            class="flex flex-col items-center space-y-4"
          >
            <div class="loading loading-spinner loading-lg"></div>
            <p class="text-sm text-gray-500 font-thin">Generating QR Code...</p>
          </div>

          <div v-else-if="qrCodeData" class="space-y-4">
            <div class="flex justify-center min-h-[200px] items-center">
              <img
                v-if="qrCodeData.imageUrl"
                :src="qrCodeData.imageUrl"
                alt="QR Code"
                class="mx-auto border rounded-lg max-w-[200px] h-auto"
              />
              <div v-else class="text-center p-4">
                <div class="loading loading-spinner loading-lg mb-2"></div>
                <p class="text-sm text-gray-500 font-thin">
                  Generating QR image...
                </p>
              </div>
            </div>
            <div
              class="text-xs text-gray-500 max-w-48 mx-auto text-center font-thin"
            >
              <p class="font-medium">{{ qrCodeData.location_name }}</p>
              <p>
                {{ qrCodeData.action === 'time-in' ? 'Time In' : 'Time Out' }}
                QR Code
              </p>
              <p class="mt-2">
                Valid for: {{ formatValidUntil(qrCodeData.valid_until) }}
              </p>
              <p class="mt-1 text-xs">
                {{ qrCodeData.employee_name || 'Employee' }}
              </p>
              <div
                v-if="locationStatus && !locationStatus.withinRadius"
                class="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-orange-700"
              >
                <p class="text-xs font-medium">
                  ⚠️ Generated outside
                  {{ locationStatus.requiredRadius || '2m' }} radius
                </p>
                <p class="text-xs">
                  Scanning will require being within
                  {{ locationStatus.requiredRadius || '2m' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="qrCodeError" class="text-center py-8">
            <div class="flex flex-col items-center space-y-3">
              <AlertCircle class="w-12 h-12 text-red-500 mx-auto" />
              <div>
                <p class="text-sm font-medium text-red-600">
                  Failed to Generate QR Code
                </p>
                <p class="text-xs text-red-500 mt-1">{{ qrCodeError }}</p>
              </div>
              <button @click="clearQRCodeError" class="btn btn-sm btn-outline">
                Try Again
              </button>
            </div>
          </div>

          <!-- Default State -->
          <div v-else class="text-center py-8">
            <div class="flex flex-col items-center space-y-3">
              <div
                class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <svg
                  class="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  ></path>
                </svg>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-600">
                  Ready to Generate QR Code
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  Click the button below to generate your attendance QR code
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Instructions for QR scanning -->
        <div
          v-if="qrCodeData"
          class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div class="flex items-start space-x-2">
            <Smartphone class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p class="text-sm font-medium text-blue-800">
                How to use this QR code:
              </p>
              <p class="text-xs text-blue-700 mt-1">
                1. Open the Login page in another device or browser tab<br />
                2. Click "Scan QR Code" on the Login page<br />
                3. Point the camera at this QR code to scan it<br />
                4. Your attendance will be recorded automatically
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button
          @click="generateQRCode('time-in')"
          :disabled="
            qrCodeLoading ||
            currentStatus === 'on-leave' ||
            currentStatus === 'checked-in' ||
            (scheduleValidation &&
              !scheduleValidation.isValid &&
              scheduleValidation.reason !== 'NO_SCHEDULE')
          "
          :class="[
            'btn flex-1',
            currentStatus === 'on-leave'
              ? 'btn-outline opacity-50 cursor-not-allowed'
              : currentStatus === 'checked-out' &&
                  (!scheduleValidation || scheduleValidation.isValid)
                ? 'bg-primaryColor hover:bg-primaryColor/80 text-white font-thin  border-none'
                : 'btn-outline',
            scheduleValidation &&
            !scheduleValidation.isValid &&
            scheduleValidation.reason !== 'NO_SCHEDULE' &&
            currentStatus !== 'on-leave'
              ? 'opacity-50 cursor-not-allowed'
              : '',
          ]"
          :title="
            currentStatus === 'on-leave'
              ? 'Attendance tracking is disabled during leave'
              : currentStatus === 'checked-in'
                ? 'You have already timed in today'
                : scheduleValidation &&
                    !scheduleValidation.isValid &&
                    scheduleValidation.reason !== 'NO_SCHEDULE'
                  ? 'Time-in is outside scheduled hours'
                  : ''
          "
        >
          <LogIn class="w-4 h-4 mr-2" />
          {{ qrCodeLoading ? 'Generating...' : 'Generate Time In QR' }}
        </button>

        <button
          @click="generateQRCode('time-out')"
          :disabled="
            qrCodeLoading ||
            currentStatus === 'on-leave' ||
            currentStatus === 'checked-out'
          "
          :class="[
            'btn flex-1',
            currentStatus === 'on-leave'
              ? 'btn-outline opacity-50 cursor-not-allowed font-thin'
              : currentStatus === 'checked-in'
                ? 'bg-primaryColor text-white font-thin  border-none hover:bg-primaryColor/80'
                : 'btn-outline font-thin',
          ]"
          :title="
            currentStatus === 'on-leave'
              ? 'Attendance tracking is disabled during leave'
              : currentStatus === 'checked-out'
                ? 'You must time in before timing out'
                : ''
          "
        >
          <LogOut class="w-4 h-4 mr-2" />
          {{ qrCodeLoading ? 'Generating...' : 'Generate Time Out QR' }}
        </button>
      </div>

      <!-- View Records Button -->
      <div class="mb-4 mt-5">
        <button
          @click="viewAttendanceRecords"
          class="btn btn-outline btn-sm w-full"
        >
          <svg
            class="w-4 h-4 mr-2"
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
          View Attendance Records
        </button>
      </div>

      <!-- Debug Info (remove in production) -->
      <!-- <div v-if="qrCodeData" class="mt-4 p-2 bg-gray-100 rounded text-xs">
        <details>
          <summary class="cursor-pointer text-gray-600">Debug Info</summary>
          <pre class="mt-2 text-xs overflow-x-auto">{{
            JSON.stringify(qrCodeData, null, 2)
          }}</pre>
        </details>
      </div> -->
    </div>

    <!-- Attendance Records Modal -->
    <div v-if="showAttendanceRecords" class="modal modal-open">
      <div class="modal-box max-w-4xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-xl">My Attendance Records</h3>
          <div class="flex items-center gap-2">
            <select
              v-model="recordsRange"
              class="select select-bordered select-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <button
              @click="fetchAttendanceRecords"
              class="btn btn-sm btn-outline"
            >
              Refresh
            </button>
            <button
              @click="closeAttendanceRecords"
              class="btn btn-sm btn-circle btn-ghost"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="recordsLoading" class="text-center py-8">
          <div class="loading loading-spinner loading-lg"></div>
          <p class="text-gray-500 mt-2">Loading attendance records...</p>
        </div>

        <!-- Records Table -->
        <div v-else-if="attendanceRecords.length > 0" class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time In</th>
                <th>Time Out</th>

                <th>Overtime</th>

                <th>Hours Worked</th>
                <th>Status</th>
                <th>Tardiness</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in paginatedRecords" :key="record.id">
                <td>{{ formatDate(record.created_at) }}</td>
                <td>{{ formatTime(record.time_in) }}</td>
                <td>{{ formatTime(record.time_out) }}</td>

                <td>{{ formatHoursWorked(record.overtime_hours) }}</td>

                <td>
                  {{ formatHoursWorked(record.hours_worked) }}
                </td>
                <td>
                  <span
                    :class="[
                      'badge font-thin badge-sm',
                      record.status === 'present'
                        ? 'bg-success/20 text-success font-thin  border-none'
                        : record.status === 'late'
                          ? 'bg-warning/20 text-warning font-thin  border-none'
                          : 'bg-error/20 text-error font-thin  border-none',
                    ]"
                  >
                    {{ record.status || 'Present' }}
                  </span>
                </td>
                <td>
                  <span class="font-mono text-xs">{{
                    Number(record.tardiness_minutes || 0)
                  }}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="flex justify-center mt-4" v-if="recordsTotalPages > 1">
            <div class="join">
              <button
                class="join-item btn btn-sm"
                :disabled="recordsPage === 1"
                @click="recordsPage = Math.max(1, recordsPage - 1)"
              >
                «
              </button>
              <button class="join-item btn btn-sm">
                Page {{ recordsPage }} of {{ recordsTotalPages }}
              </button>
              <button
                class="join-item btn btn-sm"
                :disabled="recordsPage === recordsTotalPages"
                @click="
                  recordsPage = Math.min(recordsTotalPages, recordsPage + 1)
                "
              >
                »
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-8">
          <div class="text-gray-400 mb-4">
            <svg
              class="w-16 h-16 mx-auto"
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
          </div>
          <h3 class="text-lg font-medium text-gray-600 mb-2">
            No Attendance Records
          </h3>
          <p class="text-gray-500">You haven't recorded any attendance yet.</p>
        </div>
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccessModal" class="modal modal-open">
      <div class="modal-box max-w-md">
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-xl text-success">Attendance Recorded!</h3>
          <button
            @click="closeSuccessModal"
            class="btn btn-sm btn-circle btn-ghost"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="text-center">
          <div
            class="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle class="w-8 h-8 text-success" />
          </div>
          <h4 class="text-lg font-semibold text-success mb-2">Success!</h4>
          <p class="text-gray-700 mb-4">{{ successMessage }}</p>

          <!-- Show additional data if available -->
          <div
            v-if="successData"
            class="bg-gray-50 rounded-lg p-3 text-sm text-left"
          >
            <div v-if="successData.employee" class="mb-2">
              <span class="font-medium">Employee:</span>
              {{ successData.employee }}
            </div>
            <div v-if="successData.action" class="mb-2">
              <span class="font-medium">Action:</span>
              {{ successData.action.replace('-', ' ').toUpperCase() }}
            </div>
            <div v-if="successData.time" class="mb-2">
              <span class="font-medium">Time:</span>
              {{ new Date(successData.time).toLocaleString() }}
            </div>
            <div v-if="successData.location" class="mb-2">
              <span class="font-medium">Location:</span>
              {{ successData.location }}
            </div>
            <div v-if="successData.status" class="mb-2">
              <span class="font-medium">Status:</span>
              {{ successData.status.toUpperCase() }}
            </div>
            <div
              v-if="Number(successData.tardiness_minutes || 0) > 0"
              class="mb-2"
            >
              <span class="font-medium">Tardiness:</span>
              {{ Number(successData.tardiness_minutes) }} minute(s)
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeSuccessModal"
            class="btn bg-success text-white hover:bg-success/80 border-none"
          >
            Close
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeSuccessModal">close</button>
      </form>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
  import { useAuthStore } from '../stores/authStore';
  import { useAttendanceStore } from '../stores/attendanceStore';
  import { apiConfig } from '../config/api';
  import axios from 'axios';
  import QRCode from 'qrcode';
  import {
    X,
    Clock,
    LogIn,
    LogOut,
    AlertCircle,
    Smartphone,
    Calendar,
    CheckCircle,
  } from 'lucide-vue-next';

  const props = defineProps({
    isOpen: {
      type: Boolean,
      default: false,
    },
  });

  const emit = defineEmits(['close', 'viewRecords']);

  // Auth store
  const authStore = useAuthStore();
  const attendanceStore = useAttendanceStore();

  // Reactive data
  const qrCodeLoading = ref(false);
  const qrCodeData = ref(null);
  const qrCodeError = ref(null);
  const currentStatus = ref('checked-out'); // 'checked-in' or 'checked-out'
  const locationChecking = ref(false);
  const locationStatus = ref(null);
  const branchInfo = ref(null);

  // Helper: is the given timestamp on the same local day as now?
  const isSameLocalDay = (timestamp) => {
    if (!timestamp) return false;
    const d = new Date(timestamp);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  // Reactive computed property that automatically updates current status
  const currentStatusFromStore = computed(() => {
    const todayData = attendanceStore.todayAttendance;
    if (todayData) {
      // Check if employee is on leave first
      if (todayData.is_on_leave) {
        return 'on-leave';
      }

      // If time_in exists but it's not for today (local), treat as not checked in
      const hasTodayTimeIn = isSameLocalDay(todayData.time_in);
      if (!hasTodayTimeIn) {
        return 'checked-out';
      }
      return todayData.time_out ? 'checked-out' : 'checked-in';
    }
    return 'checked-out';
  });
  const isLateToday = computed(() => {
    const status = (
      attendanceStore.todayAttendance?.status || ''
    ).toLowerCase();
    return status === 'late';
  });
  const tardinessMinutesToday = computed(() => {
    return Number(attendanceStore.todayAttendance?.tardiness_minutes || 0);
  });

  // Watch for changes in the store and update local status
  watch(
    currentStatusFromStore,
    (newStatus) => {
      if (newStatus !== currentStatus.value) {
        console.log(
          'QRAttendanceModal - Status changed from',
          currentStatus.value,
          'to',
          newStatus
        );
        currentStatus.value = newStatus;
      }
    },
    { immediate: true }
  );
  const watchId = ref(null);
  const showAttendanceRecords = ref(false);
  const attendanceRecords = ref([]);
  const recordsLoading = ref(false);
  const recordsRange = ref('today');
  const recordsPage = ref(1);
  const recordsPerPage = ref(10);
  const recordsTotalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(attendanceRecords.value.length / recordsPerPage.value)
    )
  );
  const paginatedRecords = computed(() => {
    const start = (recordsPage.value - 1) * recordsPerPage.value;
    const end = start + recordsPerPage.value;
    return attendanceRecords.value.slice(start, end);
  });
  const scheduleInfo = ref(null);
  const scheduleValidation = ref(null);
  const scheduleLoading = ref(false);
  const showSuccessModal = ref(false);
  const successMessage = ref('');
  const successData = ref(null);
  const attendancePollingInterval = ref(null);
  const lastShownRecordId = ref(null);

  // API Configuration (only for branch coordinates)
  const API_BASE_URL = apiConfig.baseURL;
  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Methods
  const closeModal = () => {
    emit('close');
  };

  const viewAttendanceRecords = () => {
    showAttendanceRecords.value = true;
    fetchAttendanceRecords();
  };

  const fetchAttendanceRecords = async () => {
    try {
      recordsLoading.value = true;

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
      if (recordsRange.value === 'today') {
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        );
      } else if (recordsRange.value === 'week') {
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

      // Fetch report (current user) via store
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const currentUserId =
        authStore.user?.id || authStore.user?.employee_internal_id || null;
      const report = await attendanceStore.getAttendanceReport(
        currentUserId,
        startIso,
        endIso
      );
      attendanceRecords.value = Array.isArray(report) ? report : [];
      recordsPage.value = 1;
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      attendanceRecords.value = [];
    } finally {
      recordsLoading.value = false;
    }
  };

  const closeAttendanceRecords = () => {
    showAttendanceRecords.value = false;
    attendanceRecords.value = [];
  };

  // Location checking functions
  const checkLocation = async () => {
    console.log('Starting location check...');

    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      locationStatus.value = {
        withinRadius: false,
        distance: 'GPS not supported',
        requiredRadius: '2m',
        error: 'Geolocation is not supported by this browser',
      };
      return;
    }

    locationChecking.value = true;
    console.log('Requesting location with high accuracy...');

    try {
      // First try with high accuracy
      let position;
      try {
        position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 20000, // 20 seconds for high accuracy
            maximumAge: 0, // Don't use cached for high accuracy
          });
        });
        console.log('High accuracy GPS obtained');
      } catch (highAccuracyError) {
        console.log(
          'High accuracy failed, trying low accuracy...',
          highAccuracyError.message
        );

        // Fallback to low accuracy if high accuracy times out
        position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false, // Use network-based location
            timeout: 10000, // 10 seconds for low accuracy
            maximumAge: 300000, // Allow 5 minutes old location
          });
        });
        console.log('Low accuracy GPS obtained');
      }

      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      // Get branch coordinates from the user's branch
      let branchLat = null;
      let branchLon = null;
      let requiredRadius = 2.0;

      try {
        // Fetch branch coordinates from the user's branch
        const branchResponse = await axios.get(
          `${API_BASE_URL}/branches/${authStore.user.branch_id}/coordinates`
        );

        if (branchResponse.data.success && branchResponse.data.data) {
          const branch = branchResponse.data.data;
          branchLat = parseFloat(branch.latitude);
          branchLon = parseFloat(branch.longitude);
          requiredRadius = parseFloat(branch.radius_meters) || 2.0;
          branchInfo.value = {
            id: branch.id,
            name: branch.name,
            latitude: branchLat,
            longitude: branchLon,
            radius_meters: requiredRadius,
          };
        }
      } catch (error) {
        console.warn('Failed to fetch branch coordinates:', error);
        // Fallback to Dasmariñas coordinates if branch fetch fails
        branchLat = 14.3064;
        branchLon = 120.9671;
      }

      // If no coordinates available, show error
      if (!branchLat || !branchLon) {
        locationStatus.value = {
          withinRadius: false,
          distance: 'Branch location not configured',
          requiredRadius: '2m',
          error:
            'Branch GPS coordinates are not set. Please contact administrator.',
        };
        return;
      }

      // Calculate distance using Haversine formula
      const distance = calculateDistance(
        userLat,
        userLon,
        branchLat,
        branchLon
      );
      const withinRadius = distance <= requiredRadius;

      locationStatus.value = {
        withinRadius,
        distance: `${Math.round(distance)}m`,
        requiredRadius: `${requiredRadius}m`,
        accuracy: Math.round(accuracy),
        userLat,
        userLon,
        qrCodeLat: branchLat,
        qrCodeLon: branchLon,
      };
    } catch (error) {
      console.error('Location error:', error);

      let errorMessage = 'Unknown error';
      let distanceDisplay = 'Error';

      // Handle specific geolocation errors
      switch (error.code) {
        case 1: // PERMISSION_DENIED
          errorMessage =
            'Location access denied. Please allow location access and try again.';
          distanceDisplay = 'Permission denied';
          break;
        case 2: // POSITION_UNAVAILABLE
          errorMessage =
            'Location unavailable. Please check your GPS settings and try again.';
          distanceDisplay = 'GPS unavailable';
          break;
        case 3: // TIMEOUT
          errorMessage = 'Location request timed out. Please try again.';
          distanceDisplay = 'Timeout';
          break;
        default:
          errorMessage = error.message || 'Failed to get location';
          distanceDisplay = 'Error';
      }

      locationStatus.value = {
        withinRadius: false,
        distance: distanceDisplay,
        requiredRadius: '2m',
        error: errorMessage,
        errorCode: error.code,
      };
    } finally {
      locationChecking.value = false;
    }
  };

  // Haversine formula to calculate distance between two GPS coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
  };

  // Start watching location when modal opens
  const startLocationWatching = () => {
    if (navigator.geolocation && !watchId.value) {
      watchId.value = navigator.geolocation.watchPosition(
        (position) => {
          // Auto-update location status when position changes
          if (locationStatus.value) {
            checkLocation();
          }
        },
        (error) => {
          console.warn('Location watch error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        }
      );
    }
  };

  // Stop watching location when modal closes
  const stopLocationWatching = () => {
    if (watchId.value) {
      navigator.geolocation.clearWatch(watchId.value);
      watchId.value = null;
    }
  };

  const generateQRCode = async (action) => {
    try {
      qrCodeLoading.value = true;
      qrCodeError.value = null; // Clear any previous errors

      // Get employee information from auth store
      const employee = authStore.user;
      console.log('Current user:', employee);

      // Create QR code data with employee and branch info
      const qrData = {
        action: action, // 'time-in' or 'time-out'
        employee_id: employee?.employee_id || employee?.id,
        employee_name:
          `${employee?.first_name || employee?.name || ''} ${employee?.last_name || ''}`.trim(),
        branch_id: employee?.branch_id,
        branch_name:
          branchInfo.value?.name || employee?.branch_name || 'Branch',
        timestamp: new Date().toISOString(),
        location: 'Mobile App QR Code',
        valid_until: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
      };

      console.log('QR Data:', qrData);

      // Generate QR code URL that will be scanned
      const qrCodeUrl = `${window.location.origin}/attendance/scan?data=${encodeURIComponent(JSON.stringify(qrData))}`;

      // Store QR data for display (without imageUrl initially)
      qrCodeData.value = {
        ...qrData,
        location_name: qrData.branch_name || 'Mobile Device',
        url: qrCodeUrl,
        imageUrl: null, // Will be set after QR generation
      };

      // Generate visual QR code
      const imageUrl = await generateQRImage(qrCodeUrl);
      if (qrCodeData.value) {
        qrCodeData.value.imageUrl = imageUrl;
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      qrCodeData.value = null;
      qrCodeError.value =
        error.message || 'Failed to generate QR code. Please try again.';
    } finally {
      qrCodeLoading.value = false;
    }
  };

  const generateQRImage = async (url) => {
    try {
      console.log('Generating QR image for URL:', url);

      // Generate QR code as data URL
      const qrDataURL = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });

      console.log('QR Code data URL generated successfully');
      return qrDataURL;
    } catch (error) {
      console.error('Error generating QR image:', error);
      return null;
    }
  };

  const formatValidUntil = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
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

  const checkCurrentStatus = async () => {
    try {
      // First, fetch today's attendance to ensure we have the latest data
      await attendanceStore.fetchTodayAttendance();

      // Use the attendance store to get today's attendance
      const todayData = attendanceStore.todayAttendance;
      console.log('QRAttendanceModal - Today data:', todayData);

      if (todayData) {
        // Check if employee is on leave first
        if (todayData.is_on_leave) {
          currentStatus.value = 'on-leave';
        } else {
          // Consider checked-in ONLY if there is a time_in for today and no time_out yet
          const hasTodayTimeIn = isSameLocalDay(todayData.time_in);
          if (hasTodayTimeIn && !todayData.time_out) {
            currentStatus.value = 'checked-in';
          } else {
            currentStatus.value = 'checked-out';
          }
        }
        console.log(
          'QRAttendanceModal - Current status updated to:',
          currentStatus.value
        );
      } else {
        currentStatus.value = 'checked-out';
        console.log(
          'QRAttendanceModal - No today data, status set to checked-out'
        );
      }
    } catch (error) {
      console.error('Error checking attendance status:', error);
      currentStatus.value = 'checked-out';
    }
  };

  // Schedule-related methods
  const fetchScheduleInfo = async () => {
    try {
      scheduleLoading.value = true;
      scheduleInfo.value = await attendanceStore.fetchMySchedule();
    } catch (error) {
      console.error('Error fetching schedule info:', error);
      scheduleInfo.value = null;
    } finally {
      scheduleLoading.value = false;
    }
  };

  const validateCurrentSchedule = async () => {
    try {
      scheduleValidation.value = await attendanceStore.validateSchedule();
    } catch (error) {
      console.error('Error validating schedule:', error);
      scheduleValidation.value = null;
    }
  };

  // Success modal methods
  const closeSuccessModal = () => {
    showSuccessModal.value = false;
    successMessage.value = '';
    successData.value = null;
  };

  const clearQRCodeError = () => {
    qrCodeError.value = null;
  };

  const checkForNewAttendance = async () => {
    try {
      // Use the attendance store to get today's attendance
      const todayData = attendanceStore.todayAttendance;

      if (todayData) {
        console.log('CheckForNewAttendance - Latest record:', todayData);
        console.log(
          'CheckForNewAttendance - Current status:',
          currentStatus.value
        );
        console.log(
          'CheckForNewAttendance - Has time_in:',
          !!todayData.time_in
        );
        console.log(
          'CheckForNewAttendance - Has time_out:',
          !!todayData.time_out
        );

        // Check if this is a new attendance record (created in the last 60 seconds)
        const recordTime = new Date(todayData.created_at);
        const now = new Date();
        const timeDiff = (now - recordTime) / 1000; // seconds

        console.log('Time difference:', timeDiff, 'seconds');

        // Check if we have a time-in record and we were previously checked out
        if (
          todayData.time_in &&
          !todayData.time_out &&
          currentStatus.value === 'checked-out' &&
          lastShownRecordId.value !== todayData.id
        ) {
          // This is a new time-in record, show success modal
          successMessage.value = `Successfully timed in at ${recordTime.toLocaleTimeString()}`;
          successData.value = {
            employee:
              `${authStore.user?.first_name || ''} ${authStore.user?.last_name || ''}`.trim(),
            action: 'time-in',
            time: todayData.time_in,
            location: 'QR Code Scan',
            status: todayData.status,
            tardiness_minutes: todayData.tardiness_minutes,
          };
          showSuccessModal.value = true;
          lastShownRecordId.value = todayData.id;

          console.log('Showing success modal for time-in');

          // Update current status
          await checkCurrentStatus();
          await validateCurrentSchedule();
        }
        // Check if we have a time-out record and we were previously checked in
        else if (
          todayData.time_out &&
          currentStatus.value === 'checked-in' &&
          lastShownRecordId.value !== todayData.id
        ) {
          // This is a new time-out record, show success modal
          successMessage.value = `Successfully timed out at ${new Date(todayData.time_out).toLocaleTimeString()}`;
          successData.value = {
            employee:
              `${authStore.user?.first_name || ''} ${authStore.user?.last_name || ''}`.trim(),
            action: 'time-out',
            time: todayData.time_out,
            location: 'QR Code Scan',
          };
          showSuccessModal.value = true;
          lastShownRecordId.value = todayData.id;

          console.log('Showing success modal for time-out');

          // Update current status
          await checkCurrentStatus();
          await validateCurrentSchedule();
        }
      }
    } catch (error) {
      console.error('Error checking for new attendance:', error);
    }
  };

  // Polling methods
  const startAttendancePolling = () => {
    // Check for new attendance every 2 seconds for more responsive detection
    console.log('Starting attendance polling...');
    attendancePollingInterval.value = setInterval(checkForNewAttendance, 2000);
  };

  const stopAttendancePolling = () => {
    if (attendancePollingInterval.value) {
      clearInterval(attendancePollingInterval.value);
      attendancePollingInterval.value = null;
    }
  };

  // Direct attendance processing (without QR scanning)
  const processDirectAttendance = async (action) => {
    try {
      qrCodeLoading.value = true;

      // Get employee information from auth store
      const employee = authStore.user;

      // Create QR code data for direct processing
      const qrData = {
        action: action, // 'time-in' or 'time-out'
        employee_id: employee?.employee_id || employee?.id,
        employee_name:
          `${employee?.first_name || employee?.name || ''} ${employee?.last_name || ''}`.trim(),
        branch_id: employee?.branch_id,
        branch_name:
          branchInfo.value?.name || employee?.branch_name || 'Branch',
        timestamp: new Date().toISOString(),
        location: 'Direct Attendance Processing',
        valid_until: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      };

      console.log('Processing direct attendance:', qrData);

      // Process attendance directly using the attendance store
      const result = await attendanceStore.scanQRCode(qrData);

      // Show success message
      successMessage.value = result.message;
      successData.value = result.data;
      showSuccessModal.value = true;

      // Update current status and refresh schedule validation
      await checkCurrentStatus();
      await validateCurrentSchedule();

      // Clear QR data since we processed directly
      qrCodeData.value = null;
    } catch (error) {
      console.error('Error processing attendance:', error);
      showErrorMessage(
        error?.response?.data?.message ||
          error.message ||
          'Failed to process attendance'
      );
    } finally {
      qrCodeLoading.value = false;
    }
  };

  // Test QR generation on mount
  onMounted(() => {
    console.log('QRAttendanceModal mounted');
    console.log('QRCode library:', QRCode);
  });

  // Watch for modal open/close
  watch(
    () => props.isOpen,
    (isOpen) => {
      if (isOpen) {
        console.log('Modal opened, checking status...');
        checkCurrentStatus();
        fetchScheduleInfo();
        validateCurrentSchedule();
        startLocationWatching();
        startAttendancePolling(); // Start polling for new attendance records
        // Automatically check location when modal opens
        setTimeout(() => {
          checkLocation();
        }, 500); // Small delay to ensure modal is fully rendered
      } else {
        qrCodeData.value = null;
        qrCodeError.value = null;
        scheduleInfo.value = null;
        scheduleValidation.value = null;
        showSuccessModal.value = false;
        successMessage.value = '';
        successData.value = null;
        lastShownRecordId.value = null;
        stopLocationWatching();
        stopAttendancePolling();
      }
    }
  );

  // Cleanup when component unmounts
  onUnmounted(() => {
    qrCodeData.value = null;
    stopLocationWatching();
    stopAttendancePolling();
  });
</script>

<style scoped>
  .modal-box {
    max-height: 90vh;
    overflow-y: auto;
  }

  #qr-code canvas {
    border-radius: 8px;
  }
</style>
