<template>
  <div class="space-y-6">
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title text-2xl mb-4">Apply Leave</h2>
        <form class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label"><span class="label-text">From</span></label>
            <input
              v-model="leaveFromDate"
              type="date"
              class="input input-bordered w-full"
            />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">To</span></label>
            <input
              v-model="leaveToDate"
              type="date"
              class="input input-bordered w-full"
            />
          </div>
          <div class="form-control col-span-2">
            <label class="label"
              ><span class="label-text">Leave Type</span></label
            >
            <select v-model="leaveType" class="select select-bordered w-full">
              <option value="">Select type</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Vacation Leave">Vacation Leave</option>
              <option value="Emergency Leave">Emergency Leave</option>
              <option value="Maternity Leave">Maternity Leave</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <!-- SIL Toggle Section -->
          <div class="form-control col-span-2">
            <div class="card bg-base-200 p-4">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h4 class="font-medium text-base mb-1">
                    Service Incentive Leave (SIL)
                  </h4>
                  <p class="text-sm text-gray-600 mb-2">
                    Use your SIL credits for this leave request
                  </p>
                  <div v-if="silCredits !== null" class="text-sm">
                    <span class="font-medium">Available SIL Credits:</span>
                    <span class="ml-1 "
                      >{{ silCredits.available_credits }} days</span
                    >
                  </div>
                </div>
                <div class="flex items-center space-x-3">
                  <label class="label cursor-pointer">
                    <span class="label-text mr-2">Use SIL</span>
                    <input
                      v-model="useSIL"
                      type="checkbox"
                      class="toggle checked:text-white"
                      :disabled="!canUseSIL"
                    />
                  </label>
                </div>
              </div>

              <!-- SIL Usage Info -->
              <div
                v-if="useSIL && silCredits !== null"
                class="mt-3 p-3 bg-info/10 rounded-lg"
              >
                <div class="flex items-center space-x-2 text-sm">
                  <svg
                    class="w-4 h-4 text-info"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                  <span class="text-info">
                    You will use {{ calculateSILDays() }} SIL day(s) for this
                    leave request
                  </span>
                </div>
              </div>

              <!-- SIL Insufficient Credits Warning -->
              <div
                v-if="
                  useSIL &&
                  silCredits !== null &&
                  silCredits.available_credits < calculateSILDays()
                "
                class="mt-3 p-3 bg-warning/10 rounded-lg"
              >
                <div class="flex items-center space-x-2 text-sm">
                  <svg
                    class="w-4 h-4 text-warning"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                  <span class="text-warning">
                    Insufficient SIL credits. You have
                    {{ silCredits.available_credits }} days available but need
                    {{ calculateSILDays() }} days.
                  </span>
                </div>
              </div>
            </div>
          </div>
          <!-- Conditional text area for "Other" leave type -->
          <div v-if="leaveType === 'Other'" class="form-control md:col-span-2">
            <label class="label"
              ><span class="label-text">Specify Leave Type</span></label
            >
            <textarea
              v-model="leaveOtherSpecify"
              class="textarea textarea-bordered w-full"
              rows="2"
              placeholder="Please specify the type of leave"
            ></textarea>
          </div>
          <div class="form-control md:col-span-2">
            <label class="label"
              ><span class="label-text">Reason Leave of Absence</span></label
            >
            <textarea
              v-model="leaveReason"
              class="textarea textarea-bordered w-full"
              rows="3"
              placeholder="Describe the reason"
            ></textarea>
          </div>
          <div class="md:col-span-2 flex justify-end">
            <button
              type="button"
              class="btn bg-primaryColor text-white font-thin hover:bg-primaryColor/80"
              @click="openLeaveConfirmModal"
            >
              <span
                v-if="isSubmitting"
                class="loading loading-spinner loading-sm mr-2"
              ></span>
              {{ isSubmitting ? 'Submitting...' : 'Submit Leave Request' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- My Leave Requests -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h3 class="card-title">
            My Leave Requests
            <span
              v-if="myLeaveRequests.length > 0"
              class="badge badge-ghost ml-2"
            >
              {{ myLeaveRequests.length }} records
            </span>
          </h3>
        </div>

        <div
          v-if="myLeaveRequests.length === 0"
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
            <p>No leave requests yet</p>
          </div>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>From Date</th>
                <th>To Date</th>
                <th>Leave Type</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="req in paginatedMyLeaveRequests" :key="req.id">
                <td>{{ formatDate(req.from_date) }}</td>
                <td>{{ formatDate(req.to_date) }}</td>
                <td>
                  <div class="max-w-xs truncate" :title="req.leave_type">
                    {{ req.leave_type }}
                  </div>
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
                      getLeaveBadgeClass(req.status),
                    ]"
                  >
                    {{ getStatusDisplayText(req.status) }}
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
                :disabled="leaveCurrentPage === 1"
                @click="leaveCurrentPage = Math.max(1, leaveCurrentPage - 1)"
              >
                «
              </button>
              <button class="join-item btn btn-sm">
                Page {{ leaveCurrentPage }} of {{ leaveTotalPages }}
              </button>
              <button
                class="join-item btn btn-sm"
                :disabled="leaveCurrentPage === leaveTotalPages"
                @click="
                  leaveCurrentPage = Math.min(
                    leaveTotalPages,
                    leaveCurrentPage + 1
                  )
                "
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Submit Leave Confirmation Modal -->
    <div v-if="showLeaveConfirmModal" class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Confirm Leave Request
        </h3>

        <div class="space-y-3">
          <div class="grid grid-cols-3 gap-2 text-sm">
            <div class="text-gray-600">From Date</div>
            <div class="col-span-2 font-medium">
              {{ formatDate(leaveFromDate) }}
            </div>
            <div class="text-gray-600">To Date</div>
            <div class="col-span-2 font-medium">
              {{ formatDate(leaveToDate) }}
            </div>
            <div class="text-gray-600">Leave Type</div>
            <div class="col-span-2 font-medium">
              {{ leaveType === 'Other' ? leaveOtherSpecify : leaveType }}
            </div>
            <div class="text-gray-600">SIL Usage</div>
            <div class="col-span-2 font-medium">
              <span v-if="useSIL" class="">
                {{ calculateSILDays() }} SIL day(s)
              </span>
              <span v-else class="text-gray-500">Not using SIL</span>
            </div>
            <div class="text-gray-600">Reason</div>
            <div class="col-span-2">{{ leaveReason || '—' }}</div>
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
              >Are you sure you want to submit this leave request?</span
            >
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeLeaveModal"
            class="btn btn-ghost btn-sm font-thin"
            :disabled="isSubmitting"
          >
            Cancel
          </button>
          <button
            @click="submitLeaveRequestConfirmed"
            class="btn bg-primaryColor text-white btn-sm font-thin"
            :disabled="isSubmitting"
          >
            <span
              v-if="isSubmitting"
              class="loading loading-spinner loading-sm mr-2"
            ></span>
            {{ isSubmitting ? 'Submitting...' : 'Submit Request' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { useCustomToast } from '../composables/useCustomToast';
  import { useLeaveStore } from '../stores/leaveStore';

  const { showSuccess, showError } = useCustomToast();
  const leaveStore = useLeaveStore();

  // Leave form data
  const leaveFromDate = ref('');
  const leaveToDate = ref('');
  const leaveType = ref('');
  const leaveReason = ref('');
  const leaveOtherSpecify = ref('');
  const isSubmitting = ref(false);
  const showLeaveConfirmModal = ref(false);

  // SIL related data
  const useSIL = ref(false);
  const silCredits = ref(null);

  // Pagination data
  const leaveCurrentPage = ref(1);
  const leaveItemsPerPage = ref(5);

  // Use store data
  const myLeaveRequests = computed(() => leaveStore.myLeaveRequests);
  const leaveTotalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(myLeaveRequests.value.length / leaveItemsPerPage.value)
    )
  );
  const paginatedMyLeaveRequests = computed(() => {
    const start = (leaveCurrentPage.value - 1) * leaveItemsPerPage.value;
    const end = start + leaveItemsPerPage.value;
    return myLeaveRequests.value.slice(start, end);
  });

  // SIL related computed properties
  const canUseSIL = computed(() => {
    return silCredits.value !== null && silCredits.value.available_credits > 0;
  });

  // Calculate SIL days needed for the leave request
  const calculateSILDays = () => {
    if (!leaveFromDate.value || !leaveToDate.value) return 0;

    const fromDate = new Date(leaveFromDate.value);
    const toDate = new Date(leaveToDate.value);

    // Calculate business days (excluding weekends)
    let days = 0;
    const currentDate = new Date(fromDate);

    while (currentDate <= toDate) {
      const dayOfWeek = currentDate.getDay();
      // Count only weekdays (Monday = 1, Friday = 5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        days++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  };

  // Check for overlapping approved leave requests (only current/future ones)
  const checkForOverlappingLeave = (fromDate, toDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    const approvedRequests = myLeaveRequests.value.filter((request) => {
      const isApproved = ['approved_by_manager', 'approved_by_hr'].includes(
        request.status
      );
      const hasNotEnded = new Date(request.to_date) >= today;
      return isApproved && hasNotEnded;
    });

    return approvedRequests.find((request) => {
      const existingFrom = new Date(request.from_date);
      const existingTo = new Date(request.to_date);

      // Check if dates overlap using the same logic as backend
      return (
        // New request starts during existing approved period
        (existingFrom <= fromDate && existingTo >= fromDate) ||
        // New request ends during existing approved period
        (existingFrom <= toDate && existingTo >= toDate) ||
        // New request completely contains existing approved period
        (existingFrom >= fromDate && existingTo <= toDate) ||
        // Existing approved period completely contains new request
        (existingFrom <= fromDate && existingTo >= toDate)
      );
    });
  };

  const openLeaveConfirmModal = () => {
    // Basic validation before showing modal
    if (!leaveFromDate.value || !leaveToDate.value || !leaveType.value) {
      showError('Please fill in all required fields');
      return;
    }

    if (leaveType.value === 'Other' && !leaveOtherSpecify.value.trim()) {
      showError('Please specify the leave type when "Other" is selected');
      return;
    }

    if (!leaveReason.value.trim()) {
      showError('Please provide a reason for your leave request');
      return;
    }

    // Validate date range
    const fromDate = new Date(leaveFromDate.value);
    const toDate = new Date(leaveToDate.value);

    if (fromDate > toDate) {
      showError('From date cannot be later than To date');
      return;
    }

    // Validate SIL usage
    if (useSIL.value) {
      const silDaysNeeded = calculateSILDays();
      if (silCredits.value === null) {
        showError('Unable to load SIL credits. Please try again.');
        return;
      }
      if (silCredits.value.available_credits < silDaysNeeded) {
        showError(
          `Insufficient SIL credits. You need ${silDaysNeeded} days but only have ${silCredits.value.available_credits} days available.`
        );
        return;
      }
    }

    // Check for overlapping approved leave requests
    const overlappingRequest = checkForOverlappingLeave(fromDate, toDate);
    if (overlappingRequest) {
      const existingFrom = new Date(
        overlappingRequest.from_date
      ).toLocaleDateString();
      const existingTo = new Date(
        overlappingRequest.to_date
      ).toLocaleDateString();
      showError(
        `You already have an approved leave request from ${existingFrom} to ${existingTo}. ` +
          `Please choose different dates or contact HR if you need to modify your existing leave.`
      );
      return;
    }

    showLeaveConfirmModal.value = true;
  };

  const closeLeaveModal = () => {
    if (isSubmitting.value) return;
    showLeaveConfirmModal.value = false;
  };

  const submitLeaveRequestConfirmed = async () => {
    try {
      isSubmitting.value = true;

      // Prepare leave data
      const leaveData = {
        from_date: leaveFromDate.value,
        to_date: leaveToDate.value,
        leave_type:
          leaveType.value === 'Other'
            ? leaveOtherSpecify.value
            : leaveType.value,
        reason: leaveReason.value,
        use_sil: useSIL.value,
        sil_days: useSIL.value ? calculateSILDays() : 0,
      };

      // Submit leave request using store
      await leaveStore.createLeaveRequest(leaveData);

      showSuccess('Leave request submitted successfully');

      // Reset form
      resetForm();
      showLeaveConfirmModal.value = false;
    } catch (error) {
      console.error('Error submitting leave request:', error);
      showError(
        error.message || 'Failed to submit leave request. Please try again.'
      );
    } finally {
      isSubmitting.value = false;
    }
  };

  const resetForm = () => {
    leaveFromDate.value = '';
    leaveToDate.value = '';
    leaveType.value = '';
    leaveReason.value = '';
    leaveOtherSpecify.value = '';
    useSIL.value = false;
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

  const getLeaveBadgeClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'approved_by_hr':
        return 'bg-success/20 text-success';
      case 'approved_by_manager':
        return 'bg-info/20 text-info';
      case 'rejected':
        return 'bg-error/20 text-error';
      case 'pending':
      default:
        return 'bg-warning/20 text-warning';
    }
  };

  const getStatusDisplayText = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'approved_by_hr':
        return 'Approved';
      case 'approved_by_manager':
        return 'Manager Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  // Fetch leave requests using store
  const fetchMyLeaveRequests = async () => {
    try {
      await leaveStore.fetchMyLeaveRequests(
        leaveCurrentPage.value,
        leaveItemsPerPage.value
      );
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      // Don't show error toast for initial load to avoid spamming user
      if (myLeaveRequests.value.length > 0) {
        showError('Failed to refresh leave requests');
      }
    }
  };

  // Fetch SIL credits for the current year
  const fetchSILCredits = async () => {
    try {
      const data = await leaveStore.fetchSILCredits();
      silCredits.value = data;
    } catch (error) {
      console.error('Error fetching SIL credits:', error);
      silCredits.value = null;
    }
  };

  // Lifecycle
  onMounted(() => {
    fetchMyLeaveRequests();
    fetchSILCredits();
  });
</script>

<style scoped>
  /* Add any custom styles here */
</style>
