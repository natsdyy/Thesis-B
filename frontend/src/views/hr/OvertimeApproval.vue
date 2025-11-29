<template>
  <div class="space-y-6 p-4">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
    >
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold">Overtime Approval</h1>
        <p class="text-sm text-gray-600 mt-1 hidden sm:block">
          Manage overtime requests from all departments
        </p>
      </div>
      <div class="text-sm text-base-content/70">
        <span class="hidden sm:inline">Last updated: </span
        >{{ lastUpdated.toLocaleTimeString() }}
        <span v-if="isLoading" class="ml-2">
          <span class="loading loading-spinner loading-xs"></span>
          <span class="hidden sm:inline">Updating...</span>
        </span>
      </div>
    </div>

    <!-- Summary Stats (match Branch overtime tab) -->
    <div class="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 gap-4">
      <div class="card bg-white shadow-lg">
        <div class="card-body py-4">
          <div class="text-sm opacity-60">Pending</div>
          <div class="text-2xl font-semibold">
            {{ otStats.pendingRequests }}
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              v-model="filters.status"
              @change="applyFilters"
              class="select select-bordered w-full"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              Department
            </label>
            <select
              v-model="filters.department"
              @change="applyFilters"
              class="select select-bordered w-full"
            >
              <option value="">All Departments</option>
              <option
                v-for="dept in departments"
                :key="dept.name"
                :value="dept.name"
              >
                {{ dept.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs: Requests | History (match LeaveApprovals style) -->
    <div class="tabs tabs-boxed bg-base-200">
      <button
        @click="activeTab = 'requests'"
        :class="['tab tab-lg', activeTab === 'requests' ? 'tab-active' : '']"
      >
        Overtime Requests
        <span
          v-if="isLoading"
          class="loading loading-spinner loading-sm ml-2"
        ></span>
        <span
          v-if="!isLoading && pendingRequests.length > 0"
          class="badge badge-ghost ml-2"
        >
          {{ pendingRequests.length }}
        </span>
      </button>
      <button
        @click="activeTab = 'history'"
        :class="['tab tab-lg', activeTab === 'history' ? 'tab-active' : '']"
      >
        Overtime History
        <span v-if="historyRows.length > 0" class="badge badge-ghost ml-2">
          {{ historyRows.length }}
        </span>
      </button>
    </div>

    <!-- Overtime Requests Table -->
    <div v-if="activeTab === 'requests'" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div
          class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4"
        >
          <h3 class="card-title text-primaryColor">
            <BadgeCheck class="w-5 h-5" />
            Overtime Requests
            <span
              v-if="isLoading"
              class="loading loading-spinner loading-sm ml-2"
            ></span>
            <span
              v-if="!isLoading && pendingRequests.length > 0"
              class="badge badge-ghost ml-2"
            >
              {{ pendingRequests.length }} requests
            </span>
          </h3>
          <button
            @click="refreshData"
            class="btn bg-gray-100 text-gray-700 hover:bg-gray-200 btn-sm gap-2"
            :disabled="isLoading"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              :class="{ 'animate-spin': isLoading }"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              ></path>
            </svg>
            <span class="hidden sm:inline">{{
              isLoading ? 'Refreshing...' : 'Refresh'
            }}</span>
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <div class="flex flex-col items-center space-y-3">
            <span class="loading loading-spinner loading-lg"></span>
            <p class="text-sm text-gray-500">Loading overtime requests...</p>
          </div>
        </div>

        <!-- Table Content -->
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Date</th>
                <th>Time</th>
                <th>Hours</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="request in paginatedPendingRequests" :key="request.id">
                <td>
                  <div class="flex items-center space-x-3">
                    <div>
                      <div class="font-bold">
                        {{ request.first_name }} {{ request.last_name }}
                      </div>
                      <div class="text-sm opacity-50">
                        {{ request.employee_code }}
                      </div>
                    </div>
                  </div>
                </td>
                <td>{{ request.department || 'Department Employee' }}</td>
                <td>{{ formatDate(request.date) }}</td>
                <td class="text-sm">
                  {{ formatTime(request.start_time) }} -
                  {{ formatTime(request.end_time) }}
                </td>
                <td class="text-sm">
                  {{ formatHours(request.total_hours) }}
                </td>
                <td>
                  <div class="max-w-xs truncate" :title="request.reason">
                    {{ request.reason }}
                  </div>
                </td>
                <td>
                  <div
                    :class="[
                      'badge badge-sm border-none font-medium',
                      getStatusBadgeClass(request.status),
                    ]"
                  >
                    {{ getStatusDisplayText(request.status, request) }}
                  </div>
                </td>
                <td>
                  <div class="flex space-x-2">
                    <button
                      v-if="canApprove(request)"
                      title="Approve"
                      @click="openApprovalModal(request)"
                      class="btn btn-xs bg-success/10 rounded-full font-thin shadow-none border border-none hover:bg-success/30 text-success"
                      :disabled="isProcessing"
                    >
                      <Check class="w-4 h-4" />
                    </button>
                    <button
                      v-if="canReject(request)"
                      title="Reject"
                      @click="openRejectionModal(request)"
                      class="btn btn-xs bg-error/10 rounded-full font-thin shadow-none border border-none hover:bg-error/30 text-error"
                      :disabled="isProcessing"
                    >
                      <X class="w-4 h-4" />
                    </button>
                    <button
                      @click="viewDetails(request)"
                      class="btn btn-xs btn-ghost"
                      title="View details"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="pendingRequests.length === 0 && !isLoading">
                <td colspan="8" class="text-center py-8 text-gray-500">
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
                    <p>No overtime requests found</p>
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

    <!-- Overtime History -->
    <div v-if="activeTab === 'history'" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h3 class="card-title text-primaryColor">
            <BadgeCheck class="w-5 h-5" />
            Overtime History
          </h3>
          <div class="flex gap-3 items-end">
            <div class="form-control">
              <select
                v-model="historyStatus"
                class="select select-bordered select-sm"
              >
                <option value="approved">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div class="form-control">
              <select
                v-model="historyPreset"
                @change="setPreset(historyPreset)"
                class="select select-bordered select-sm"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom_month">Custom Month</option>
              </select>
            </div>
            <!-- Custom Month Picker -->
            <div class="form-control" v-if="historyPreset === 'custom_month'">
              <input
                type="month"
                v-model="historyCustomMonth"
                class="input input-bordered input-sm"
              />
            </div>
            <div class="form-control">
              <button
                class="btn bg-gray-100 text-gray-700 hover:bg-gray-200 btn-sm"
                @click="exportHistoryToCSV"
                :disabled="historyRows.length === 0"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Date</th>
                <th>Time</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in historyRows" :key="row.id">
                <td>
                  <div class="font-medium">
                    {{ row.first_name }} {{ row.last_name }}
                  </div>
                  <div class="text-xs opacity-50">{{ row.employee_code }}</div>
                </td>
                <td>{{ row.department || 'Department Employee' }}</td>
                <td>{{ formatDate(row.date) }}</td>
                <td class="text-sm">
                  {{ formatTime(row.start_time) }} -
                  {{ formatTime(row.end_time) }}
                </td>
                <td class="text-sm">{{ formatHours(row.total_hours) }}</td>
                <td>
                  <div
                    :class="[
                      'badge badge-sm border-none',
                      getStatusBadgeClass(row.status),
                    ]"
                  >
                    {{ getStatusDisplayText(row.status, row) }}
                  </div>
                </td>
              </tr>
              <tr v-if="historyRows.length === 0">
                <td colspan="6" class="text-center py-8 text-gray-500">
                  No records found
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Request Details Modal -->
    <div v-if="showDetailsModal" class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Overtime Request Details</h3>

        <div v-if="selectedRequest" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">
                <span class="label-text font-semibold">Employee</span>
              </label>
              <p>
                {{ selectedRequest.first_name }} {{ selectedRequest.last_name }}
              </p>
            </div>
            <div>
              <label class="label">
                <span class="label-text font-semibold">Department</span>
              </label>
              <p>{{ selectedRequest.department || 'Department Employee' }}</p>
            </div>
            <div>
              <label class="label">
                <span class="label-text font-semibold">Date</span>
              </label>
              <p>{{ formatDate(selectedRequest.date) }}</p>
            </div>
            <div>
              <label class="label">
                <span class="label-text font-semibold">Time</span>
              </label>
              <p>
                {{ formatTime(selectedRequest.start_time) }} -
                {{ formatTime(selectedRequest.end_time) }}
              </p>
            </div>
            <div>
              <label class="label">
                <span class="label-text font-semibold">Hours</span>
              </label>
              <p>{{ formatHours(selectedRequest.total_hours) }}</p>
            </div>
            <div>
              <label class="label">
                <span class="label-text font-semibold">Status</span>
              </label>
              <span
                class="badge"
                :class="getStatusBadgeClass(selectedRequest.status)"
              >
                {{
                  getStatusDisplayText(selectedRequest.status, selectedRequest)
                }}
              </span>
            </div>
          </div>

          <div>
            <label class="label">
              <span class="label-text font-semibold">Reason</span>
            </label>
            <p class="p-3 bg-base-200 rounded-lg">
              {{ selectedRequest.reason }}
            </p>
          </div>

          <div v-if="selectedRequest.approved_by">
            <label class="label">
              <span class="label-text font-semibold">Approved By</span>
            </label>
            <p>
              {{ selectedRequest.approver_first_name }}
              {{ selectedRequest.approver_last_name }}
            </p>
          </div>

          <div v-if="selectedRequest.approved_at">
            <label class="label">
              <span class="label-text font-semibold">Approved At</span>
            </label>
            <p>{{ formatDateTime(selectedRequest.approved_at) }}</p>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeDetailsModal"
            class="btn btn-ghost btn-sm font-thin shadow-none border border-none hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Approve Confirmation Modal (match Branch pattern) -->
    <div v-if="showApprovalModal" class="modal modal-open">
      <div class="modal-box w-full max-w-lg">
        <div class="flex items-center gap-2 mb-3">
          <BadgeCheck class="w-5 h-5 text-primaryColor" />
          <h3 class="font-bold text-lg text-primaryColor">
            Approve Overtime Request
          </h3>
        </div>
        <!-- Details card -->
        <div class="card bg-base-400 mb-4">
          <div class="card-body py-3 bg-gray-50 p-3 rounded-lg">
            <div class="flex items-start justify-between">
              <div>
                <div class="font-semibold">
                  {{ selectedRequest?.first_name }}
                  {{ selectedRequest?.last_name }}
                </div>
                <div class="mt-2 text-xs">
                  <span class="badge badge-ghost mr-2">{{
                    selectedRequest?.department || 'Department Employee'
                  }}</span>
                  <span class="badge bg-primaryColor/10 text-primaryColor">
                    {{ formatHours(selectedRequest?.total_hours) }}</span
                  >
                </div>
              </div>
              <div class="text-right text-sm">
                <div class="font-medium">
                  {{ formatDate(selectedRequest?.date) }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ formatTime(selectedRequest?.start_time) }} -
                  {{ formatTime(selectedRequest?.end_time) }}
                </div>
              </div>
            </div>
            <div class="mt-2 text-sm">
              <span class="font-semibold">Reason:</span>
              {{ selectedRequest?.reason || '—' }}
            </div>
          </div>
        </div>
        <!-- Confirmation box -->
        <div class="alert bg-primaryColor/10 text-primaryColor mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="stroke-current shrink-0 w-5 h-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="text-sm"
            >Are you sure you want to approve this overtime request?</span
          >
        </div>
        <div class="modal-action">
          <button
            class="btn btn-sm border border-none font-thin hover:bg-gray-200"
            @click="closeModals"
            :disabled="isProcessing"
          >
            Cancel
          </button>
          <button
            class="btn bg-primaryColor text-white font-thin btn-sm hover:bg-primaryColor/90"
            @click="confirmApprove"
            :disabled="isProcessing"
          >
            <span
              v-if="isProcessing"
              class="loading loading-spinner loading-xs mr-2"
            ></span>
            {{ isProcessing ? 'Approving...' : 'Approve Request' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reject Confirmation Modal (match Branch pattern) -->
    <div v-if="showRejectionModal" class="modal modal-open">
      <div class="modal-box w-full max-w-lg">
        <div class="flex items-center gap-2 mb-3">
          <X class="w-5 h-5 text-error" />
          <h3 class="font-bold text-lg text-error">Reject Overtime Request</h3>
        </div>
        <div class="card bg-base-100 mb-4">
          <div class="card-body py-3 bg-gray-50 p-3 rounded-lg">
            <div class="flex items-start justify-between">
              <div>
                <div class="font-semibold">
                  {{ selectedRequest?.first_name }}
                  {{ selectedRequest?.last_name }}
                </div>
                <div class="mt-2 text-xs">
                  <span class="badge badge-ghost mr-2">{{
                    selectedRequest?.department || 'Department Employee'
                  }}</span>
                  <span class="badge bg-primaryColor/10 text-primaryColor">
                    {{ formatHours(selectedRequest?.total_hours) }}</span
                  >
                </div>
              </div>
              <div class="text-right text-sm">
                <div class="font-medium">
                  {{ formatDate(selectedRequest?.date) }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ formatTime(selectedRequest?.start_time) }} -
                  {{ formatTime(selectedRequest?.end_time) }}
                </div>
              </div>
            </div>
            <div class="mt-2">
              <label class="label"
                ><span class="label-text text-sm"
                  >Add note (optional)</span
                ></label
              >
              <textarea
                v-model="rejectionNotes"
                class="textarea textarea-bordered w-full"
                rows="3"
                placeholder="Reason or notes (optional)"
              ></textarea>
            </div>

            <div class="alert bg-warning/10 text-warning">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                ></path>
              </svg>
              <span class="text-sm"
                >Are you sure you want to reject this overtime request?</span
              >
            </div>
          </div>
        </div>
        <div class="modal-action">
          <button
            class="btn btn-ghost btn-sm border border-none font-thin hover:bg-gray-200"
            @click="closeModals"
            :disabled="isProcessing"
          >
            Cancel
          </button>
          <button
            class="btn btn-error text-white font-thin btn-sm hover:bg-error/90 border-none"
            @click="confirmReject"
            :disabled="isProcessing"
          >
            <span
              v-if="isProcessing"
              class="loading loading-spinner loading-xs mr-2"
            ></span>
            {{ isProcessing ? 'Rejecting...' : 'Reject Request' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Processing overlay -->
    <div
      v-if="isProcessing"
      class="fixed inset-0 bg-black/10 pointer-events-none flex items-center justify-center"
    >
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed } from 'vue';
  import { useAuthStore } from '../../stores/authStore';
  import { useOvertimeStore } from '../../stores/overtimeStore';
  import { apiConfig } from '../../config/api';
  import axios from 'axios';
  import { Check, X, Eye, BadgeCheck } from 'lucide-vue-next';
  import { useCustomToast } from '../../composables/useCustomToast';

  // Stores
  const authStore = useAuthStore();
  const { showSuccess, showError } = useCustomToast();
  const overtimeStore = useOvertimeStore();

  // Current user
  const currentUser = computed(() => authStore.user);
  const isBoardMember = computed(
    () =>
      authStore.userRole === 'Board of Directors' ||
      authStore.userRole === 'Chairman of the Board'
  );

  // Reactive data
  const isLoading = ref(false);
  const isProcessing = ref(false);
  const lastUpdated = ref(new Date());
  const activeTab = ref('requests'); // 'requests' | 'history'
  const overtimeRequests = ref([]);
  const departments = ref([]);
  const showDetailsModal = ref(false);
  const selectedRequest = ref(null);
  const showApprovalModal = ref(false);
  const showRejectionModal = ref(false);
  const rejectionNotes = ref('');

  // Filters
  const filters = ref({
    status: '',
    department: '',
  });

  // History filters
  const historyStatus = ref('approved'); // 'approved' (Completed) or 'rejected'
  const historyPreset = ref('today'); // today | week | month
  const historyCustomMonth = ref(''); // YYYY-MM

  const setPreset = (preset) => {
    historyPreset.value = preset;
    // If switching to custom month and not set, default to current YYYY-MM
    if (preset === 'custom_month' && !historyCustomMonth.value) {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      historyCustomMonth.value = `${y}-${m}`;
    }
  };

  // Pagination
  const currentPage = ref(1);
  const itemsPerPage = ref(10);

  // Computed
  const pendingRequests = computed(() => {
    let list = (overtimeRequests.value || []).filter(
      (r) => r.status === 'pending'
    );

    // For Board Members: show only HR department requests, prefer HR Manager when role metadata exists
    if (isBoardMember.value) {
      list = list.filter((r) => {
        const isHR = (r.department || '').toLowerCase() === 'human resource';
        const roleFields = [
          r.role,
          r.requestor_role,
          r.employee_role,
          r.job_title,
        ]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase());
        const hasRoleMetadata = roleFields.length > 0;
        const isManager = roleFields.some((v) => v.includes('manager'));
        return isHR && (!hasRoleMetadata || isManager);
      });
    }

    return list;
  });

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(pendingRequests.value.length / itemsPerPage.value))
  );

  const paginatedPendingRequests = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return pendingRequests.value.slice(start, end);
  });

  // History computed
  const startEndForPreset = (preset) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    if (preset === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'week') {
      const day = now.getDay(); // 0=Sun
      const diffToMonday = (day + 6) % 7; // Mon=0
      start.setDate(now.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1, 0); // last day of month
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'custom_month') {
      // Expect historyCustomMonth as 'YYYY-MM'
      const [y, m] = (historyCustomMonth.value || '')
        .split('-')
        .map((n) => parseInt(n));
      if (!isNaN(y) && !isNaN(m)) {
        start.setFullYear(y, m - 1, 1);
        start.setHours(0, 0, 0, 0);
        end.setFullYear(y, m, 0);
        end.setHours(23, 59, 59, 999);
      } else {
        // fallback to current month if invalid
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(start.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
      }
    }
    return { start, end };
  };

  const historyRows = computed(() => {
    const desiredStatus = historyStatus.value;
    const { start, end } = startEndForPreset(historyPreset.value);
    let rows = (overtimeRequests.value || []).filter(
      (r) => r.status === desiredStatus
    );
    // For Board Members: limit history to HR department (prefer manager when available)
    if (isBoardMember.value) {
      rows = rows.filter((r) => {
        const isHR = (r.department || '').toLowerCase() === 'human resource';
        const roleFields = [
          r.role,
          r.requestor_role,
          r.employee_role,
          r.job_title,
        ]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase());
        const hasRoleMetadata = roleFields.length > 0;
        const isManager = roleFields.some((v) => v.includes('manager'));
        return isHR && (!hasRoleMetadata || isManager);
      });
    }
    return rows.filter((r) => {
      // r.date is YYYY-MM-DD
      const d = new Date(`${r.date}T12:00:00`); // noon to avoid TZ shift
      return d >= start && d <= end;
    });
  });

  // Stats (mirror Branch overtime tab)
  const otStats = ref({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    totalOvertimeHours: 0,
  });

  const recomputeStats = () => {
    const list = overtimeRequests.value || [];
    otStats.value = {
      totalRequests: list.length,
      pendingRequests: list.filter((r) => r.status === 'pending').length,
      approvedRequests: list.filter((r) => r.status === 'approved').length,
      rejectedRequests: list.filter((r) => r.status === 'rejected').length,
      totalOvertimeHours: list
        .filter((r) => r.status === 'approved')
        .reduce((sum, r) => sum + Number(r.total_hours || 0), 0),
    };
  };

  // Methods
  const fetchOvertimeRequests = async () => {
    try {
      isLoading.value = true;
      await overtimeStore.fetchRequests({
        status: filters.value.status || undefined,
        // Use hr_only filter: shows department employees + branch managers only
        hr_only: true,
        department_id: filters.value.department || undefined,
        page: 1,
        limit: 200,
      });
      overtimeRequests.value = overtimeStore.requests || [];
      recomputeStats();
    } catch (error) {
      console.error('Error fetching overtime requests:', error);
      showError('Failed to load overtime requests');
    } finally {
      isLoading.value = false;
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/employees/departments-with-roles`
      );
      if (response.data.success) {
        const raw = response.data.data || {};
        // Normalize department names to avoid duplicates
        const departmentMapping = {
          SCM: 'Supply Chain',
          CRM: 'Customer Relationship',
        };

        // Convert object keyed by department names to [{ name }], excluding only Admin for HR view
        // Include Branch so HR can filter Branch Manager overtime requests
        const departmentSet = new Set();
        Object.keys(raw).forEach((name) => {
          if (name !== 'Admin') {
            const normalizedName = departmentMapping[name] || name;
            departmentSet.add(normalizedName);
          }
        });

        departments.value = Array.from(departmentSet)
          .sort()
          .map((name) => ({ name }));
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const applyFilters = () => {
    currentPage.value = 1;
    fetchOvertimeRequests();
  };

  const clearFilters = () => {
    filters.value = {
      status: '',
      department: '',
    };
    currentPage.value = 1;
    fetchOvertimeRequests();
    recomputeStats();
  };

  const refreshData = () => {
    fetchOvertimeRequests();
    lastUpdated.value = new Date();
  };

  const openApprovalModal = (request) => {
    selectedRequest.value = request;
    showApprovalModal.value = true;
  };

  const openRejectionModal = (request) => {
    selectedRequest.value = request;
    rejectionNotes.value = '';
    showRejectionModal.value = true;
  };

  // Check if current user can approve/reject request (prevent self-approval/rejection)
  const canApprove = (request) => {
    if (!request || !currentUser.value) return false;
    if (request.employee_id === currentUser.value.id) return false;
    return request.status === 'pending';
  };

  const canReject = (request) => {
    if (!request || !currentUser.value) return false;
    if (request.employee_id === currentUser.value.id) return false;
    return request.status === 'pending';
  };

  const confirmApprove = async () => {
    if (!selectedRequest.value) return;
    try {
      isProcessing.value = true;
      await overtimeStore.approve(selectedRequest.value.id, '');
      showSuccess('Overtime request approved successfully');
      await fetchOvertimeRequests();
      closeModals();
    } catch (error) {
      console.error('Error approving request:', error);

      // Handle self-approval error specifically
      const errorMessage = error.response?.data?.message || error.message || '';
      const errorCode = error.response?.data?.code || '';

      if (
        errorCode === 'SELF_APPROVAL_NOT_ALLOWED' ||
        errorMessage.includes('cannot approve your own overtime request')
      ) {
        showError(
          'You cannot approve your own overtime request. Please have another manager or HR staff member handle this approval.',
          'Self-Approval Not Allowed'
        );
      } else {
        showError('Failed to approve overtime request');
      }
    } finally {
      isProcessing.value = false;
    }
  };

  const confirmReject = async () => {
    if (!selectedRequest.value) return;
    try {
      isProcessing.value = true;
      await overtimeStore.reject(
        selectedRequest.value.id,
        rejectionNotes.value || ''
      );
      showSuccess('Overtime request rejected successfully');
      await fetchOvertimeRequests();
      closeModals();
    } catch (error) {
      console.error('Error rejecting request:', error);

      // Handle self-rejection error specifically
      const errorMessage = error.response?.data?.message || error.message || '';
      const errorCode = error.response?.data?.code || '';

      if (
        errorCode === 'SELF_REJECTION_NOT_ALLOWED' ||
        errorMessage.includes('cannot reject your own overtime request')
      ) {
        showError(
          'You cannot reject your own overtime request. Please have a manager or HR staff member handle this.',
          'Self-Rejection Not Allowed'
        );
      } else {
        showError('Failed to reject overtime request');
      }
    } finally {
      isProcessing.value = false;
    }
  };

  const viewDetails = (request) => {
    selectedRequest.value = request;
    showDetailsModal.value = true;
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedRequest.value = null;
  };

  const closeModals = () => {
    showApprovalModal.value = false;
    showRejectionModal.value = false;
    showDetailsModal.value = false;
    selectedRequest.value = null;
    rejectionNotes.value = '';
  };

  const getStatusBadgeClass = (status) => {
    const badges = {
      pending: 'bg-warning/20 text-warning',
      approved: 'bg-success/20 text-success',
      rejected: 'bg-error/20 text-error',
    };
    return badges[status] || 'bg-gray-500/20 text-gray-500';
  };

  // Get status display text (handle HR staff special case)
  const getStatusDisplayText = (status, request = null) => {
    switch ((status || '').toLowerCase()) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        // Check if this is an HR staff member's request
        if (request && request.department === 'Human Resource') {
          return 'Pending Board Approval';
        }
        return 'Pending';
      default:
        // Check if this is an HR staff member's request
        if (request && request.department === 'Human Resource') {
          return 'Pending Board Approval';
        }
        return 'Pending';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(`${dateString}T00:00:00+08:00`);
    if (isNaN(d)) return 'N/A';
    return d.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    let iso = timeString;
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeString)) {
      iso = `1970-01-01T${timeString}${timeString.length === 5 ? ':00' : ''}+08:00`;
    }
    const d = new Date(iso);
    if (isNaN(d)) return 'N/A';
    return d.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila',
    });
  };

  const formatHours = (hours) => {
    if (!hours) return 'N/A';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (isNaN(d)) return 'N/A';
    return d.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila',
    });
  };

  // Export History CSV (filtered rows)
  const exportHistoryToCSV = () => {
    try {
      const rows = historyRows.value || [];
      const csv = generateHistoryCSV(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `overtime_history_${today}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Failed to export overtime history:', e);
    }
  };

  const generateHistoryCSV = (data) => {
    const safe = (v) => String(v ?? '').replace(/"/g, '""');
    const headers = [
      'Employee Name',
      'Department',
      'Date',
      'Start Time',
      'End Time',
      'Hours',
      'Status',
      'Reason',
    ];
    const lines = data.map((r) => [
      `"${safe(`${r.first_name} ${r.last_name}`)}"`,
      `"${safe(r.department || 'Department Employee')}"`,
      `"${safe(formatDate(r.date))}"`,
      `"${safe(formatTime(r.start_time))}"`,
      `"${safe(formatTime(r.end_time))}"`,
      `"${safe(formatHours(r.total_hours))}"`,
      `"${safe(r.status)}"`,
      `"${safe(r.reason || '')}"`,
    ]);
    return [headers.join(','), ...lines.map((l) => l.join(','))].join('\n');
  };

  // Initialize
  onMounted(async () => {
    await Promise.all([fetchOvertimeRequests(), fetchDepartments()]);
  });
</script>

<style scoped>
  /* Add any custom styles here */
</style>
