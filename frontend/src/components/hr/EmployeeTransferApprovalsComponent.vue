<script setup>
  import { ref, computed, onMounted } from 'vue';
  import {
    Users,
    Search,
    Filter,
    RefreshCcw,
    Check,
    X,
    Eye,
    ArrowRightLeft,
    Clock,
    UserCheck,
    UserX,
    Building2,
    AlertCircle,
    User,
  } from 'lucide-vue-next';
  import { useEmployeeTransferRequestStore } from '../../stores/employeeTransferRequestStore';
  import { useBranchStore } from '../../stores/branchStore';
  import { useCustomToast } from '../../composables/useCustomToast';

  const transferRequestStore = useEmployeeTransferRequestStore();
  const branchStore = useBranchStore();
  const { showSuccess, showError } = useCustomToast();

  // Component state
  const loading = ref(false);
  const processing = ref(false);
  const searchQuery = ref('');
  const statusFilter = ref('pending');
  const branchFilter = ref('');
  const currentPage = ref(1);
  const itemsPerPage = ref(10);

  // Modal states
  const showApprovalModal = ref(false);
  const showRejectionModal = ref(false);
  const selectedRequest = ref(null);
  const approvalNotes = ref('');
  const rejectionNotes = ref('');

  // Computed properties
  const filteredRequests = computed(() => {
    let requests = transferRequestStore.transferRequests;

    // Filter by status
    if (statusFilter.value) {
      requests = requests.filter((req) => req.status === statusFilter.value);
    }

    // Filter by branch
    if (branchFilter.value) {
      const branchId = parseInt(branchFilter.value);
      requests = requests.filter(
        (req) =>
          req.from_branch_id === branchId || req.to_branch_id === branchId
      );
    }

    // Filter by search query
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      requests = requests.filter(
        (req) =>
          req.employee_name.toLowerCase().includes(query) ||
          req.requested_by_name.toLowerCase().includes(query) ||
          req.from_branch_name.toLowerCase().includes(query) ||
          req.to_branch_name.toLowerCase().includes(query) ||
          req.reason.toLowerCase().includes(query)
      );
    }

    return requests;
  });

  const paginatedRequests = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return filteredRequests.value.slice(start, end);
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredRequests.value.length / itemsPerPage.value);
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'bg-warning/20 text-warning', text: 'Pending' },
      approved: { class: 'bg-success/20 text-success', text: 'Approved' },
      rejected: { class: 'bg-error/20 text-error', text: 'Rejected' },
    };
    return (
      badges[status] || { class: 'bg-gray-500/20 text-gray-500', text: status }
    );
  };

  const getTransferTypeBadge = (type) => {
    const badges = {
      transfer_in: { class: 'bg-info/20 text-info', text: 'Transfer In' },
      transfer_out: {
        class: 'bg-primaryColor/20 text-primaryColor',
        text: 'Transfer Out',
      },
    };
    return (
      badges[type] || { class: 'bg-gray-500/20 text-gray-500', text: type }
    );
  };

  // Methods
  const loadData = async () => {
    loading.value = true;
    try {
      await Promise.all([
        transferRequestStore.fetchTransferRequests(),
        transferRequestStore.fetchTransferRequestStats(),
        branchStore.fetchActiveBranches(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      loading.value = false;
    }
  };

  const openApprovalModal = (request) => {
    selectedRequest.value = request;
    approvalNotes.value = '';
    showApprovalModal.value = true;
  };

  const openRejectionModal = (request) => {
    selectedRequest.value = request;
    rejectionNotes.value = '';
    showRejectionModal.value = true;
  };

  const approveRequest = async () => {
    if (!selectedRequest.value) return;

    processing.value = true;
    try {
      await transferRequestStore.approveTransferRequest(
        selectedRequest.value.id,
        approvalNotes.value
      );

      const displayName =
        selectedRequest.value.transfer_type === 'transfer_in'
          ? selectedRequest.value.employee_role || 'Role Request'
          : selectedRequest.value.employee_name || 'Unknown Employee';

      showSuccess(
        `Transfer request for ${displayName} has been approved.`,
        'Transfer Request Approved'
      );

      showApprovalModal.value = false;
      selectedRequest.value = null;
      approvalNotes.value = '';

      // Refresh data
      await loadData();
    } catch (error) {
      showError(
        error.message || 'Failed to approve transfer request',
        'Approval Failed'
      );
    } finally {
      processing.value = false;
    }
  };

  const rejectRequest = async () => {
    if (!selectedRequest.value) return;

    if (!rejectionNotes.value.trim()) {
      showError('Rejection notes are required', 'Validation Error');
      return;
    }

    processing.value = true;
    try {
      await transferRequestStore.rejectTransferRequest(
        selectedRequest.value.id,
        rejectionNotes.value
      );

      const displayName =
        selectedRequest.value.transfer_type === 'transfer_in'
          ? selectedRequest.value.employee_role || 'Role Request'
          : selectedRequest.value.employee_name || 'Unknown Employee';

      showSuccess(
        `Transfer request for ${displayName} has been rejected.`,
        'Transfer Request Rejected'
      );

      showRejectionModal.value = false;
      selectedRequest.value = null;
      rejectionNotes.value = '';

      // Refresh data
      await loadData();
    } catch (error) {
      showError(
        error.message || 'Failed to reject transfer request',
        'Rejection Failed'
      );
    } finally {
      processing.value = false;
    }
  };

  const closeModals = () => {
    showApprovalModal.value = false;
    showRejectionModal.value = false;
    selectedRequest.value = null;
    approvalNotes.value = '';
    rejectionNotes.value = '';
    processing.value = false;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const resetFilters = () => {
    searchQuery.value = '';
    statusFilter.value = '';
    branchFilter.value = '';
    currentPage.value = 1;
  };

  // Initialize
  onMounted(() => {
    loadData();
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-primaryColor">Transfer Approvals</h2>
        <p class="text-gray-600 mt-1">
          Review and approve employee transfer requests
        </p>
      </div>
      <button
        @click="loadData"
        :disabled="loading"
        class="btn btn-outline text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white"
      >
        <RefreshCcw :class="['w-4 h-4 mr-2', { 'animate-spin': loading }]" />
        Refresh
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Total Requests</p>
              <p class="text-2xl font-bold text-primaryColor">
                {{ transferRequestStore.stats.totalRequests }}
              </p>
            </div>
            <div class="p-3 bg-primaryColor/10 rounded-full">
              <ArrowRightLeft class="w-6 h-6 text-primaryColor" />
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Pending</p>
              <p class="text-2xl font-bold text-warning">
                {{ transferRequestStore.stats.pendingRequests }}
              </p>
            </div>
            <div class="p-3 bg-warning/10 rounded-full">
              <Clock class="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Approved</p>
              <p class="text-2xl font-bold text-success">
                {{ transferRequestStore.stats.approvedRequests }}
              </p>
            </div>
            <div class="p-3 bg-success/10 rounded-full">
              <UserCheck class="w-6 h-6 text-success" />
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600">Rejected</p>
              <p class="text-2xl font-bold text-error">
                {{ transferRequestStore.stats.rejectedRequests }}
              </p>
            </div>
            <div class="p-3 bg-error/10 rounded-full">
              <UserX class="w-6 h-6 text-error" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-white shadow-lg">
      <div class="card-body">
        <div class="flex flex-col lg:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1">
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
              />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search requests..."
                class="input input-bordered w-full pl-10"
              />
            </div>
          </div>

          <!-- Status Filter -->
          <select v-model="statusFilter" class="select select-bordered">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <!-- Branch Filter -->
          <select v-model="branchFilter" class="select select-bordered">
            <option value="">All Branches</option>
            <option
              v-for="branch in branchStore.branches"
              :key="branch.id"
              :value="branch.id"
            >
              {{ branch.name }}
            </option>
          </select>

          <!-- Reset Filters -->
          <button @click="resetFilters" class="btn btn-outline">
            <Filter class="w-4 h-4 mr-2" />
            Reset
          </button>
        </div>
      </div>
    </div>

    <!-- Requests Table -->
    <div class="card bg-white shadow-lg">
      <div class="card-body">
        <h3 class="card-title text-primaryColor mb-4">
          <ArrowRightLeft class="w-5 h-5" />
          Transfer Requests
        </h3>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center py-12">
          <div
            class="loading loading-spinner loading-lg text-primaryColor"
          ></div>
        </div>

        <!-- Requests Table -->
        <div v-else-if="paginatedRequests.length > 0" class="space-y-4">
          <div class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Requested By</th>
                  <th>Type</th>
                  <th>From Branch</th>
                  <th>To Branch</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Date Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="request in paginatedRequests" :key="request.id">
                  <td>
                    <div class="flex items-center space-x-3">
                      <div>
                        <div class="font-semibold">
                          {{
                            request.transfer_type === 'transfer_in'
                              ? request.employee_role || 'Role Request'
                              : request.employee_name || 'Unknown Employee'
                          }}
                        </div>
                        <div class="text-sm text-gray-500">
                          {{
                            request.transfer_type === 'transfer_in'
                              ? 'Role Request'
                              : ''
                          }}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="flex items-center">
                      {{ request.requested_by_name }}
                    </div>
                  </td>
                  <td>
                    <div
                      :class="[
                        'badge badge-sm border-none font-medium',
                        getTransferTypeBadge(request.transfer_type).class,
                      ]"
                    >
                      {{ getTransferTypeBadge(request.transfer_type).text }}
                    </div>
                  </td>
                  <td>
                    <div class="flex items-center">
                      {{
                        request.transfer_type === 'transfer_in'
                          ? 'N/A'
                          : request.from_branch_name || 'Unknown Branch'
                      }}
                    </div>
                  </td>
                  <td>
                    <div class="flex items-center">
                      {{ request.to_branch_name }}
                    </div>
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
                        getStatusBadge(request.status).class,
                      ]"
                    >
                      {{ getStatusBadge(request.status).text }}
                    </div>
                  </td>
                  <td>
                    <div class="text-sm">
                      {{ formatDate(request.created_at) }}
                    </div>
                  </td>
                  <td>
                    <div class="flex space-x-2">
                      <!-- Action buttons for pending requests -->
                      <template v-if="request.status === 'pending'">
                        <button
                          @click="openApprovalModal(request)"
                          title="Approve"
                          class="btn btn-xs bg-success/10 rounded-full font-thin shadow-none border border-none hover:bg-success/30 text-success"
                        >
                          <Check class="w-4 h-4" />
                        </button>
                        <button
                          @click="openRejectionModal(request)"
                          title="Reject"
                          class="btn btn-xs bg-error/10 rounded-full font-thin shadow-none border border-none hover:bg-error/30 text-error"
                        >
                          <X class="w-4 h-4" />
                        </button>
                      </template>

                      <!-- View details for all requests -->
                      <button
                        @click="
                          transferRequestStore.fetchTransferRequestById(
                            request.id
                          )
                        "
                        class="btn btn-xs btn-ghost"
                        title="View Details"
                      >
                        <Eye class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="flex justify-center mt-6">
            <div class="join">
              <button
                :disabled="currentPage === 1"
                @click="currentPage--"
                class="join-item btn"
              >
                «
              </button>
              <button class="join-item btn">
                Page {{ currentPage }} of {{ totalPages }}
              </button>
              <button
                :disabled="currentPage === totalPages"
                @click="currentPage++"
                class="join-item btn"
              >
                »
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <ArrowRightLeft class="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            No transfer requests found
          </h3>
          <p class="text-gray-600">Try adjusting your search criteria</p>
        </div>
      </div>
    </div>

    <!-- Approval Confirmation Modal -->
    <div v-if="showApprovalModal" class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          <UserCheck class="w-5 h-5 inline mr-2" />
          Approve Transfer Request
        </h3>

        <div v-if="selectedRequest" class="space-y-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="font-medium">{{
                  selectedRequest.transfer_type === 'transfer_in'
                    ? 'Role:'
                    : 'Employee:'
                }}</span>
                <span>{{
                  selectedRequest.transfer_type === 'transfer_in'
                    ? selectedRequest.employee_role || 'Role Request'
                    : selectedRequest.employee_name || 'Unknown Employee'
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="font-medium">Type:</span>
                <span>{{
                  getTransferTypeBadge(selectedRequest.transfer_type).text
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="font-medium">From:</span>
                <span>{{ selectedRequest.from_branch_name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="font-medium">To:</span>
                <span>{{ selectedRequest.to_branch_name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="font-medium">Requested By:</span>
                <span>{{ selectedRequest.requested_by_name }}</span>
              </div>
              <div class="mt-3">
                <span class="font-medium">Reason:</span>
                <p class="text-sm text-gray-700 mt-1">
                  {{ selectedRequest.reason }}
                </p>
              </div>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Approval Notes (Optional)</span>
            </label>
            <textarea
              v-model="approvalNotes"
              class="textarea textarea-bordered w-full"
              rows="3"
              placeholder="Add any notes about this approval..."
            ></textarea>
          </div>

          <div class="alert bg-primaryColor/10 text-primaryColor">
            <AlertCircle class="w-4 h-4" />
            <span class="text-sm">
              Are you sure you want to approve this transfer request? This will
              update the employee's branch assignment.
            </span>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeModals"
            class="btn btn-ghost btn-sm font-thin"
            :disabled="processing"
          >
            Cancel
          </button>
          <button
            @click="approveRequest"
            class="btn bg-primaryColor hover:bg-primaryColor/80 text-white btn-sm font-thin"
            :disabled="processing"
          >
            <span
              v-if="processing"
              class="loading loading-spinner loading-sm mr-2"
            ></span>
            <UserCheck v-else class="w-4 h-4 mr-2" />
            {{ processing ? 'Approving...' : 'Approve Request' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Rejection Confirmation Modal -->
    <div v-if="showRejectionModal" class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4 text-error">
          <UserX class="w-5 h-5 inline mr-2" />
          Reject Transfer Request
        </h3>

        <div v-if="selectedRequest" class="space-y-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="font-medium">Employee:</span>
                <span>{{ selectedRequest.employee_name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="font-medium">Type:</span>
                <span>{{
                  getTransferTypeBadge(selectedRequest.transfer_type).text
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="font-medium">From:</span>
                <span>{{ selectedRequest.from_branch_name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="font-medium">To:</span>
                <span>{{ selectedRequest.to_branch_name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="font-medium">Requested By:</span>
                <span>{{ selectedRequest.requested_by_name }}</span>
              </div>
              <div class="mt-3">
                <span class="font-medium">Reason:</span>
                <p class="text-sm text-gray-700 mt-1">
                  {{ selectedRequest.reason }}
                </p>
              </div>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Rejection Notes (Required)</span>
            </label>
            <textarea
              v-model="rejectionNotes"
              class="textarea textarea-bordered w-full"
              rows="3"
              placeholder="Provide feedback on why this request is being rejected..."
              required
            ></textarea>
          </div>

          <div class="alert bg-warning/10 text-warning">
            <AlertCircle class="w-4 h-4" />
            <span class="text-sm">
              Are you sure you want to reject this transfer request?
            </span>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeModals"
            class="btn btn-ghost btn-sm"
            :disabled="processing"
          >
            Cancel
          </button>
          <button
            @click="rejectRequest"
            class="btn bg-error text-white btn-sm"
            :disabled="processing || !rejectionNotes.trim()"
          >
            <span
              v-if="processing"
              class="loading loading-spinner loading-sm mr-2"
            ></span>
            <UserX v-else class="w-4 h-4 mr-2" />
            {{ processing ? 'Rejecting...' : 'Reject Request' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
