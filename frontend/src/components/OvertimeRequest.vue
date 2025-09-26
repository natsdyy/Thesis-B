<template>
  <div class="space-y-6">
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
              :min="scheduleEndTime ? scheduleEndTime.slice(0, 5) : undefined"
            />
            <div v-if="scheduleEndTime" class="text-xs text-neutral/60 mt-1">
              Scheduled end time: {{ scheduleEndTime.slice(0, 5) }} — OT starts
              from here
            </div>
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
            <label class="label"><span class="label-text">Reason</span></label>
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
            <span v-if="myOtRequests.length > 0" class="badge badge-ghost ml-2">
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
                  <span class="font-mono text-sm">{{ req.total_hours }}h</span>
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

          <div v-if="otError" class="alert bg-error/10 text-error">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11V5a1 1 0 10-2 0v2a1 1 0 002 0zm0 6a1 1 0 10-2 0v-4a1 1 0 102 0v4z"
                clip-rule="evenodd"
              ></path>
            </svg>
            <span class="text-sm">{{ otError }}</span>
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
            :disabled="isSubmitDisabled"
            :title="`Debug: isSubmittingOT=${isSubmittingOT}, otError='${otError}', disabled=${isSubmitDisabled}`"
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
  import { ref, computed, onMounted, watch } from 'vue';
  import { useOvertimeStore } from '../stores/overtimeStore';
  import { apiConfig } from '../config/api';

  // Store
  const overtimeStore = useOvertimeStore();

  // OT form data
  const otDate = ref('');
  const otStartTime = ref('');
  const otEndTime = ref('');
  const otReason = ref('');
  const scheduleEndTime = ref('');
  const showOTConfirmModal = ref(false);
  const isSubmittingOT = ref(false);
  const otError = ref('');

  // My overtime requests data
  const myOtRequests = ref([]);
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

  // Debug computed property for button state
  const isSubmitDisabled = computed(() => {
    const disabled = isSubmittingOT.value || !!otError.value;
    console.log('Button disabled check:', {
      isSubmittingOT: isSubmittingOT.value,
      otError: otError.value,
      disabled,
    });
    return disabled;
  });

  // API Configuration
  const API_BASE_URL = apiConfig.baseURL;
  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Helper function to convert time to minutes for comparison
  const timeToMinutes = (timeString) => {
    if (!timeString) return 0;
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Methods
  const openOTConfirmModal = () => {
    // Basic validation before showing modal
    if (!otDate.value || !otStartTime.value || !otEndTime.value) {
      return;
    }

    // Validate that start time is after scheduled end time
    if (scheduleEndTime.value && otStartTime.value) {
      const scheduledEnd = scheduleEndTime.value.slice(0, 5); // Get HH:MM format
      const startTime = otStartTime.value;

      // Convert times to comparable format (HH:MM)
      const scheduledEndMinutes = timeToMinutes(scheduledEnd);
      const startTimeMinutes = timeToMinutes(startTime);

      console.log('Validation:', {
        scheduledEnd,
        startTime,
        scheduledEndMinutes,
        startTimeMinutes,
        isValid: startTimeMinutes > scheduledEndMinutes,
      });

      if (startTimeMinutes <= scheduledEndMinutes) {
        otError.value = `Overtime must start after your scheduled end time (${scheduledEnd})`;
        showOTConfirmModal.value = true;
        return;
      }
    }

    // Validate that end time is after start time
    if (otStartTime.value && otEndTime.value) {
      const startTimeMinutes = timeToMinutes(otStartTime.value);
      const endTimeMinutes = timeToMinutes(otEndTime.value);

      if (startTimeMinutes >= endTimeMinutes) {
        otError.value = 'End time must be after start time';
        showOTConfirmModal.value = true;
        return;
      }
    }

    // Clear any previous errors since validation passed
    otError.value = '';
    // Ensure submitting state is false when opening modal
    isSubmittingOT.value = false;
    console.log('Opening modal with otError:', otError.value);
    console.log('Opening modal with isSubmittingOT:', isSubmittingOT.value);
    showOTConfirmModal.value = true;
  };

  const closeOTModal = () => {
    if (isSubmittingOT.value) return;
    showOTConfirmModal.value = false;
    // Clear any errors when closing modal
    otError.value = '';
  };

  const submitOTRequestConfirmed = async () => {
    try {
      // Don't submit if there are validation errors
      if (otError.value) {
        return;
      }

      isSubmittingOT.value = true;
      otError.value = '';
      // Compute hours and submit to API
      const start = new Date(`${otDate.value}T${otStartTime.value}:00`);
      const end = new Date(`${otDate.value}T${otEndTime.value}:00`);
      const hours = Math.max(0, (end - start) / (1000 * 60 * 60));

      await overtimeStore.submitRequest({
        ot_date: otDate.value,
        start_time: otStartTime.value,
        end_time: otEndTime.value,
        total_hours: Math.round(hours * 100) / 100,
        reason: otReason.value,
      });

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
      // Refresh list
      await fetchMyOtRequests();
    } catch (e) {
      console.error('Error submitting OT request:', e);
      otError.value = e?.message || 'Failed to submit OT request';
      return;
    } finally {
      isSubmittingOT.value = false;
    }
  };

  // Fetch schedule end time for selected date and enforce min
  const fetchScheduleForDate = async () => {
    try {
      scheduleEndTime.value = '';
      if (!otDate.value) return;
      const res = await fetch(
        `${API_BASE_URL.replace(/\/?$/, '')}/attendance/my-schedule?date=${otDate.value}`,
        { headers: { 'Content-Type': 'application/json', ...authHeaders() } }
      );
      const json = await res.json();
      const endTime = json?.data?.schedule?.end_time || json?.data?.end_time;
      if (endTime) {
        scheduleEndTime.value = endTime; // format HH:MM:SS from backend
        // If chosen start time is earlier than end time, bump it to end time
        if (otStartTime.value && scheduleEndTime.value) {
          const startVal = otStartTime.value;
          const minVal = scheduleEndTime.value.slice(0, 5);
          if (startVal < minVal) {
            otStartTime.value = minVal;
          }
        }
      }
    } catch (_) {}
  };

  // Watch date change to fetch schedule
  watch(
    () => otDate.value,
    async () => {
      await fetchScheduleForDate();
    }
  );

  const fetchMyOtRequests = async () => {
    await overtimeStore.fetchMyRequests(1, 50);
    myOtRequests.value = overtimeStore.myRequests;
  };

  // Utility methods
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

  // Watch for modal state changes
  watch(showOTConfirmModal, (newVal) => {
    if (newVal) {
      console.log('Modal opened, otError value:', otError.value);
      console.log('Modal opened, isSubmittingOT value:', isSubmittingOT.value);
    }
  });

  // Lifecycle
  onMounted(() => {
    fetchMyOtRequests();
  });
</script>

<style scoped>
  /* Add any custom styles here */
</style>
