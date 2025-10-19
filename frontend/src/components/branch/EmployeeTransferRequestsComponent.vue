<script setup>
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
  import {
    Users,
    Search,
    Filter,
    Plus,
    Eye,
    ArrowRightLeft,
    Clock,
    Check,
    X,
    AlertCircle,
    Building2,
    User,
  } from 'lucide-vue-next';
  import { useEmployeeTransferRequestStore } from '../../stores/employeeTransferRequestStore';
  import { useCustomToast } from '../../composables/useCustomToast';

  // Props to reduce reactive dependencies
  const props = defineProps({
    currentBranch: {
      type: Object,
      required: true,
    },
    branchEmployees: {
      type: Array,
      default: () => [],
    },
    otherEmployees: {
      type: Array,
      default: () => [],
    },
    availableBranches: {
      type: Array,
      default: () => [],
    },
  });

  const transferRequestStore = useEmployeeTransferRequestStore();
  const { showSuccess, showError } = useCustomToast();

  // Component state
  const activeTab = ref('request');
  const loading = ref(false);
  const isInitializing = ref(false);
  const submitting = ref(false);
  const searchQuery = ref('');
  const statusFilter = ref('');

  // Component state
  const isMounted = ref(false);
  const hasLoadedData = ref(false);

  // Form state
  const transferForm = ref({
    employee_id: '',
    transfer_type: 'transfer_in',
    from_branch_id: '',
    to_branch_id: '',
    reason: '',
  });

  // Modal states
  const showConfirmationModal = ref(false);
  const selectedRequest = ref(null);

  // Use props instead of computed properties to reduce reactive dependencies

  const filteredRequests = computed(() => {
    let requests = transferRequestStore.transferRequests;

    // Filter by status
    if (statusFilter.value) {
      requests = requests.filter((req) => req.status === statusFilter.value);
    }

    // Filter by search query
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      requests = requests.filter(
        (req) =>
          req.employee_name.toLowerCase().includes(query) ||
          req.from_branch_name.toLowerCase().includes(query) ||
          req.to_branch_name.toLowerCase().includes(query) ||
          req.reason.toLowerCase().includes(query)
      );
    }

    return requests;
  });

  const availableEmployees = computed(() => {
    if (transferForm.value.transfer_type === 'transfer_out') {
      return props.branchEmployees;
    } else {
      // For transfer in, return available roles instead of employees
      return [
        { id: 'cashier', name: 'Cashier', role: 'Cashier' },
        { id: 'cook', name: 'Cook', role: 'Cook' },
        {
          id: 'kitchen_assistant',
          name: 'Kitchen Assistant',
          role: 'Kitchen Assistant',
        },
        { id: 'waiter', name: 'Waiter', role: 'Waiter' },
        { id: 'manager', name: 'Manager', role: 'Manager' },
      ];
    }
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
    if (loading.value) {
      return; // Prevent multiple simultaneous calls
    }

    loading.value = true;

    try {
      // Only fetch transfer requests, employees and branches are passed as props
      await transferRequestStore.fetchBranchTransferRequests(
        props.currentBranch?.id
      );
      hasLoadedData.value = true;
    } catch (error) {
      console.error('Error loading data:', error);
      showError(
        'Failed to load transfer request data. Please try again.',
        'Loading Error'
      );
    } finally {
      loading.value = false;
    }
  };

  const handleTransferTypeChange = () => {
    transferForm.value.employee_id = '';
    transferForm.value.to_branch_id = '';

    if (transferForm.value.transfer_type === 'transfer_out') {
      transferForm.value.from_branch_id = props.currentBranch?.id;
      transferForm.value.to_branch_id = ''; // User will select destination
    } else {
      // For transfer in, destination is automatically the current branch
      transferForm.value.from_branch_id = '';
      transferForm.value.to_branch_id = props.currentBranch?.id;
    }
  };

  const validateForm = () => {
    if (!transferForm.value.employee_id) {
      if (transferForm.value.transfer_type === 'transfer_out') {
        showError('Please select an employee', 'Validation Error');
      } else {
        showError('Please select a role', 'Validation Error');
      }
      return false;
    }

    // Only require destination branch selection for transfer out
    if (
      transferForm.value.transfer_type === 'transfer_out' &&
      !transferForm.value.to_branch_id
    ) {
      showError('Please select a destination branch', 'Validation Error');
      return false;
    }

    if (!transferForm.value.reason.trim()) {
      showError('Please provide a reason for the transfer', 'Validation Error');
      return false;
    }

    return true;
  };

  const submitTransferRequest = async () => {
    if (!validateForm()) return;

    const selectedItem = availableEmployees.value.find(
      (emp) => emp.id === transferForm.value.employee_id
    );

    selectedRequest.value = {
      employee_name:
        transferForm.value.transfer_type === 'transfer_out'
          ? `${selectedItem?.first_name || ''} ${selectedItem?.last_name || ''}`.trim() ||
            'Unknown'
          : selectedItem?.name || 'Unknown',
      employee_role:
        transferForm.value.transfer_type === 'transfer_out'
          ? selectedItem?.role || 'Unknown'
          : selectedItem?.role || 'Unknown',
      to_branch_name:
        transferForm.value.transfer_type === 'transfer_out'
          ? props.availableBranches.find(
              (branch) =>
                branch.id === parseInt(transferForm.value.to_branch_id)
            )?.name || 'Unknown'
          : props.currentBranch?.name || 'Unknown',
      transfer_type: transferForm.value.transfer_type,
      reason: transferForm.value.reason,
    };

    showConfirmationModal.value = true;
  };

  const confirmSubmit = async () => {
    submitting.value = true;

    try {
      const requestData = {
        employee_id:
          transferForm.value.transfer_type === 'transfer_out'
            ? parseInt(transferForm.value.employee_id)
            : null, // For transfer in, we don't have a specific employee
        employee_role:
          transferForm.value.transfer_type === 'transfer_in'
            ? transferForm.value.employee_id
            : null, // Store the role for transfer in requests
        transfer_type: transferForm.value.transfer_type,
        from_branch_id:
          transferForm.value.transfer_type === 'transfer_out'
            ? props.currentBranch?.id
            : null, // For transfer in, we don't know the source branch yet
        to_branch_id: parseInt(transferForm.value.to_branch_id),
        reason: transferForm.value.reason.trim(),
      };

      await transferRequestStore.createTransferRequest(requestData);

      showSuccess('Transfer request submitted successfully!', 'Success');

      // Reset form
      transferForm.value = {
        employee_id: '',
        transfer_type: 'transfer_out',
        from_branch_id: props.currentBranch?.id,
        to_branch_id: '',
        reason: '',
      };

      showConfirmationModal.value = false;

      // Refresh data
      await loadData();
    } catch (error) {
      showError(error.message || 'Failed to submit transfer request', 'Error');
    } finally {
      submitting.value = false;
    }
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

  // Initialize
  onMounted(() => {
    isMounted.value = true;
    loadData();
    // Initialize form with proper values based on transfer type
    handleTransferTypeChange();
  });

  // Debug: Watch for changes in currentBranch (using props)
  watch(
    () => props.currentBranch?.id,
    (newId, oldId) => {
      if (newId !== oldId) {
        console.log(
          'EmployeeTransferRequestsComponent: currentBranch.id changed from',
          oldId,
          'to',
          newId
        );
      }
    }
  );

  // Cleanup on unmount
  onUnmounted(() => {
    isMounted.value = false;
    hasLoadedData.value = false;
  });
</script>

<template>
  <div v-if="isMounted" class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-primaryColor">Transfer Requests</h2>
        <p class="text-gray-600 mt-1">
          Manage employee transfer requests for {{ props.currentBranch?.name }}
        </p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed mb-6">
      <button
        @click="activeTab = 'request'"
        class="tab flex-1"
        :class="{ 'tab-active': activeTab === 'request' }"
      >
        <Plus class="w-4 h-4 mr-2" />
        Request Transfer
      </button>
      <button
        @click="activeTab = 'requests'"
        class="tab flex-1"
        :class="{ 'tab-active': activeTab === 'requests' }"
      >
        <Eye class="w-4 h-4 mr-2" />
        My Requests
      </button>
    </div>

    <!-- Request Transfer Tab -->
    <template v-if="activeTab === 'request'">
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <h3 class="card-title text-primaryColor mb-4">
            <ArrowRightLeft class="w-5 h-5" />
            Create Transfer Request
          </h3>

          <form @submit.prevent="submitTransferRequest" class="space-y-6">
            <!-- Transfer Type -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Transfer Type</span>
              </label>
              <div class="flex gap-4">
                <label class="cursor-pointer label">
                  <input
                    v-model="transferForm.transfer_type"
                    type="radio"
                    value="transfer_in"
                    @change="handleTransferTypeChange"
                    class="radio checked:text-primaryColor radio-xs sm:radio-sm"
                  />
                  <span class="label-text ml-2"
                    >Transfer In (to this branch)</span
                  >
                </label>
                <label class="cursor-pointer label">
                  <input
                    v-model="transferForm.transfer_type"
                    type="radio"
                    value="transfer_out"
                    @change="handleTransferTypeChange"
                    class="radio checked:text-primaryColor radio-xs sm:radio-sm"
                  />
                  <span class="label-text ml-2"
                    >Transfer Out (from this branch)</span
                  >
                </label>
              </div>
            </div>

            <!-- Employee/Role Selection -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">
                  {{
                    transferForm.transfer_type === 'transfer_out'
                      ? 'Employee'
                      : 'Role'
                  }}
                </span>
              </label>
              <select
                v-model="transferForm.employee_id"
                class="select select-bordered w-full"
                required
              >
                <option value="">
                  {{
                    transferForm.transfer_type === 'transfer_out'
                      ? 'Select an employee'
                      : 'Select a role'
                  }}
                </option>
                <option
                  v-for="item in availableEmployees"
                  :key="item.id"
                  :value="item.id"
                >
                  <template
                    v-if="transferForm.transfer_type === 'transfer_out'"
                  >
                    {{ item.first_name }} {{ item.last_name }} ({{ item.role }})
                  </template>
                  <template v-else>
                    {{ item.role }}
                  </template>
                </option>
              </select>
            </div>

            <!-- Destination Branch (only for Transfer Out) -->
            <div
              v-if="transferForm.transfer_type === 'transfer_out'"
              class="form-control"
            >
              <label class="label">
                <span class="label-text font-medium">Destination Branch</span>
              </label>
              <select
                v-model="transferForm.to_branch_id"
                class="select select-bordered w-full"
                required
              >
                <option value="">Select destination branch</option>
                <option
                  v-for="branch in availableBranches"
                  :key="branch.id"
                  :value="branch.id"
                >
                  {{ branch.name }} ({{ branch.code }})
                </option>
              </select>
            </div>

            <!-- Reason -->
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Reason for Transfer</span>
              </label>
              <textarea
                v-model="transferForm.reason"
                class="textarea textarea-bordered w-full"
                rows="4"
                placeholder="Please provide a detailed reason for this transfer request..."
                required
              ></textarea>
            </div>

            <!-- Submit Button -->
            <div class="form-control mt-6">
              <button
                type="submit"
                :disabled="submitting"
                class="btn bg-primaryColor text-white hover:bg-primaryColor/80 font-thin"
              >
                <span
                  v-if="submitting"
                  class="loading loading-spinner loading-sm mr-2"
                ></span>
                <Plus v-else class="w-4 h-4 mr-2" />
                {{ submitting ? 'Submitting...' : 'Submit Transfer Request' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </template>

    <!-- My Requests Tab -->
    <template v-if="activeTab === 'requests'">
      <!-- Filters -->
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex flex-col md:flex-row gap-4">
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
          </div>
        </div>
      </div>

      <!-- Requests Table -->
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <h3 class="card-title text-primaryColor mb-4">
            <Clock class="w-5 h-5" />
            Transfer Requests
          </h3>

          <!-- Loading State -->
          <div v-if="loading" class="flex justify-center items-center py-12">
            <div
              class="loading loading-spinner loading-lg text-primaryColor"
            ></div>
          </div>

          <!-- Requests Table -->
          <div v-else-if="filteredRequests.length > 0" class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Employee</th>
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
                <tr v-for="request in filteredRequests" :key="request.id">
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
                      <Building2 class="w-4 h-4 mr-2 text-gray-400" />
                      {{ request.from_branch_name }}
                    </div>
                  </td>
                  <td>
                    <div class="flex items-center">
                      <Building2 class="w-4 h-4 mr-2 text-gray-400" />
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
    </template>

    <!-- Confirmation Modal -->
    <div v-if="showConfirmationModal" class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          <AlertCircle class="w-5 h-5 inline mr-2" />
          Confirm Transfer Request
        </h3>

        <div v-if="selectedRequest" class="space-y-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="font-medium">
                  {{
                    selectedRequest.transfer_type === 'transfer_out'
                      ? 'Employee:'
                      : 'Role:'
                  }}
                </span>
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
                <span class="font-medium">To Branch:</span>
                <span>{{ selectedRequest.to_branch_name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="font-medium">Reason:</span>
                <span class="text-right max-w-xs">{{
                  selectedRequest.reason
                }}</span>
              </div>
            </div>
          </div>

          <div class="alert bg-primaryColor/10 text-primaryColor">
            <AlertCircle class="w-4 h-4" />
            <span class="text-sm">
              Are you sure you want to submit this transfer request? This will
              require HR approval.
            </span>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="showConfirmationModal = false"
            class="btn btn-ghost btn-sm font-thin"
            :disabled="submitting"
          >
            Cancel
          </button>
          <button
            @click="confirmSubmit"
            class="btn bg-primaryColor text-white btn-sm font-thin"
            :disabled="submitting"
          >
            <span
              v-if="submitting"
              class="loading loading-spinner loading-sm mr-2"
            ></span>
            {{ submitting ? 'Submitting...' : 'Submit Request' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
