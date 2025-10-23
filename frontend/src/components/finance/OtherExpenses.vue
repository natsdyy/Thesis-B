<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { useUtilityExpensesStore } from '../../stores/utilityExpensesStore.js';
  import { useBranchContextStore } from '../../stores/branchContextStore.js';
  import { useBranchStore } from '../../stores/branchStore.js';
  import { useCustomToast } from '../../composables/useCustomToast.js';
  import { formatImageUrl } from '../../config/api.js';
  import {
    getCurrentPhilippineTime,
    createPhilippineDate,
  } from '../../utils/timezoneUtils.js';

  const props = defineProps({ branchId: { type: Number, default: 0 } });

  const utilityExpensesStore = useUtilityExpensesStore();
  const branchContext = useBranchContextStore();
  const branchStore = useBranchStore();
  const { showToast } = useCustomToast();

  // State
  const loading = ref(false);
  const approving = ref(false);
  const rejecting = ref(false);
  const selectedMonth = ref('');
  const selectedBranch = ref('');
  const selectedStatus = ref('');
  const selectedExpenseType = ref('');
  const currentPage = ref(1);
  const pageSize = ref(10);
  const showApprovalModal = ref(false);
  const showRejectionModal = ref(false);
  const selectedRemittance = ref(null);
  const rejectionReason = ref('');
  const showReceiptModal = ref(false);
  const receiptImageUrl = ref('');
  const imageError = ref(false);

  // Main office expense creation
  const showCreateModal = ref(false);
  const creating = ref(false);
  const newExpense = ref({
    entity_type: 'department',
    entity_name: '',
    expense_type: '',
    expense_description: '',
    amount: '',
    expense_month: '',
    notes: '',
  });
  const receiptFile = ref(null);
  const receiptPreview = ref(null);

  // Computed
  const remittances = computed(() => utilityExpensesStore.remittances);
  const mainOfficeExpenses = computed(
    () => utilityExpensesStore.mainOfficeExpenses || []
  );
  const pagination = computed(() => utilityExpensesStore.pagination);
  const availableBranches = computed(() => branchStore.activeBranches || []);
  const currentBranch = computed(() => branchContext.currentBranch);

  // Summary calculations
  const expenseSummary = computed(() => {
    const summary = {
      electricity: { branch: 0, main: 0, total: 0 },
      water: { branch: 0, main: 0, total: 0 },
      internet: { branch: 0, main: 0, total: 0 },
      other: { branch: 0, main: 0, total: 0 },
      grandTotal: 0,
    };

    // Calculate branch expenses (only approved)
    remittances.value.forEach((remittance) => {
      if (remittance.status === 'approved') {
        const amount = parseFloat(remittance.amount) || 0;
        summary[remittance.expense_type].branch += amount;
        summary[remittance.expense_type].total += amount;
        summary.grandTotal += amount;
      }
    });

    // Calculate main office expenses
    mainOfficeExpenses.value.forEach((expense) => {
      const amount = parseFloat(expense.amount) || 0;
      summary[expense.expense_type].main += amount;
      summary[expense.expense_type].total += amount;
      summary.grandTotal += amount;
    });

    return summary;
  });

  // Expense type options
  const expenseTypes = [
    { value: '', label: 'All Types' },
    { value: 'electricity', label: 'Electricity' },
    { value: 'water', label: 'Water' },
    { value: 'internet', label: 'Internet' },
    { value: 'other', label: 'Other' },
  ];

  // Status options
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  // Initialize default month (current month)
  const initializeMonth = () => {
    const now = getCurrentPhilippineTime();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    selectedMonth.value = `${year}-${month}`;
  };

  // Fetch remittances
  const fetchRemittances = async () => {
    loading.value = true;
    try {
      const filters = {
        branch_id:
          selectedBranch.value || props.branchId || currentBranch.value?.id,
        expense_type: selectedExpenseType.value,
        expense_month: selectedMonth.value,
        status: selectedStatus.value,
        limit: pageSize.value,
        offset: (currentPage.value - 1) * pageSize.value,
      };

      await utilityExpensesStore.fetchRemittances(filters);
    } catch (error) {
      console.error('Error fetching remittances:', error);
      showToast('Failed to fetch utilities remittances', 'error');
    } finally {
      loading.value = false;
    }
  };

  // Fetch main office expenses
  const fetchMainOfficeExpenses = async () => {
    try {
      const filters = {
        entity_type: 'department',
        expense_month: selectedMonth.value,
        limit: 50,
        offset: 0,
      };

      await utilityExpensesStore.fetchMainOfficeExpenses(filters);
    } catch (error) {
      console.error('Error fetching main office expenses:', error);
      showToast('Failed to fetch main office expenses', 'error');
    }
  };

  // Fetch branches
  const fetchBranches = async () => {
    try {
      await branchStore.fetchBranches();
    } catch (error) {
      console.error('Error fetching branches:', error);
      showToast('Failed to fetch branches', 'error');
    }
  };

  // Handle approval
  const handleApprove = (remittance) => {
    selectedRemittance.value = remittance;
    showApprovalModal.value = true;
  };

  const confirmApprove = async () => {
    if (!selectedRemittance.value) return;

    approving.value = true;
    try {
      await utilityExpensesStore.approveRemittance(selectedRemittance.value.id);
      showToast('Utilities remittance approved successfully', 'success');
      showApprovalModal.value = false;
      selectedRemittance.value = null;
      await fetchRemittances();
    } catch (error) {
      console.error('Error approving remittance:', error);
      showToast('Failed to approve remittance', 'error');
    } finally {
      approving.value = false;
    }
  };

  // Handle rejection
  const handleReject = (remittance) => {
    selectedRemittance.value = remittance;
    rejectionReason.value = '';
    showRejectionModal.value = true;
  };

  const confirmReject = async () => {
    if (!selectedRemittance.value || !rejectionReason.value.trim()) {
      showToast('Please provide a rejection reason', 'error');
      return;
    }

    rejecting.value = true;
    try {
      await utilityExpensesStore.rejectRemittance(
        selectedRemittance.value.id,
        rejectionReason.value
      );
      showToast('Utilities remittance rejected successfully', 'success');
      showRejectionModal.value = false;
      selectedRemittance.value = null;
      rejectionReason.value = '';
      await fetchRemittances();
    } catch (error) {
      console.error('Error rejecting remittance:', error);
      showToast('Failed to reject remittance', 'error');
    } finally {
      rejecting.value = false;
    }
  };

  // View receipt
  const viewReceipt = (receiptUrl) => {
    receiptImageUrl.value = formatImageUrl(receiptUrl);
    imageError.value = false; // Reset error state
    showReceiptModal.value = true;
  };

  // Handle image loading error
  const handleImageError = () => {
    imageError.value = true;
  };

  // Main office expense creation methods
  const openCreateModal = () => {
    // Initialize with current month
    const now = getCurrentPhilippineTime();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    newExpense.value.expense_month = `${year}-${month}`;

    showCreateModal.value = true;
  };

  const closeCreateModal = () => {
    showCreateModal.value = false;
    newExpense.value = {
      entity_type: 'department',
      entity_name: '',
      expense_type: '',
      expense_description: '',
      amount: '',
      expense_month: '',
      notes: '',
    };
    receiptFile.value = null;
    receiptPreview.value = null;
  };

  // Handle receipt file selection
  const handleReceiptChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      receiptFile.value = file;
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        receiptPreview.value = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove receipt
  const removeReceipt = () => {
    receiptFile.value = null;
    receiptPreview.value = null;
  };

  const createExpense = async () => {
    if (!newExpense.value.entity_name.trim()) {
      showToast('Please enter entity name', 'error');
      return;
    }
    if (!newExpense.value.expense_type) {
      showToast('Please select expense type', 'error');
      return;
    }
    if (!newExpense.value.amount || Number(newExpense.value.amount) <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    if (!newExpense.value.expense_month) {
      showToast('Please select expense month', 'error');
      return;
    }
    if (
      newExpense.value.expense_type === 'other' &&
      !newExpense.value.expense_description.trim()
    ) {
      showToast('Please enter expense description for "Other" type', 'error');
      return;
    }

    creating.value = true;
    try {
      // Prepare FormData for file upload
      const formData = new FormData();
      formData.append('entity_type', newExpense.value.entity_type);
      formData.append('entity_name', newExpense.value.entity_name);
      formData.append('department', newExpense.value.entity_name); // Backend expects 'department' field
      formData.append('expense_type', newExpense.value.expense_type);
      formData.append(
        'expense_description',
        newExpense.value.expense_description || ''
      );
      formData.append('amount', newExpense.value.amount);
      formData.append('expense_month', newExpense.value.expense_month);
      formData.append('notes', newExpense.value.notes || '');

      // Add receipt file if selected
      if (receiptFile.value) {
        formData.append('receipt', receiptFile.value);
      }

      await utilityExpensesStore.createExpense(formData);
      showToast('Utilities expense created successfully', 'success');
      closeCreateModal();
      await fetchRemittances();
      await fetchMainOfficeExpenses();
    } catch (error) {
      console.error('Error creating expense:', error);
      showToast('Failed to create expense', 'error');
    } finally {
      creating.value = false;
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-warning/20 text-warning';
      case 'approved':
        return 'bg-success/20 text-success';
      case 'rejected':
        return 'bg-error/20 text-error';
      default:
        return 'bg-neutral/20 text-neutral';
    }
  };

  // Watch for filter changes
  watch(
    [selectedMonth, selectedBranch, selectedStatus, selectedExpenseType],
    () => {
      currentPage.value = 1;
      fetchRemittances();
      fetchMainOfficeExpenses();
    }
  );

  // Watch for page changes
  watch(currentPage, () => {
    fetchRemittances();
  });

  onMounted(() => {
    initializeMonth();
    fetchBranches();
    fetchRemittances();
    fetchMainOfficeExpenses();
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
    >
      <div>
        <h2 class="text-xl font-bold text-primaryColor">
          Monthly Utilities Expenses
        </h2>
        <p class="text-sm text-gray-600">
          Review and approve branch utility expense remittances, and create main
          office expenses
        </p>
      </div>
      <div>
        <button
          @click="openCreateModal"
          class="btn bg-primaryColor text-white font-thin hover:bg-primaryColor/90 btn-sm"
        >
          <font-awesome-icon icon="fa-solid fa-plus" class="w-4 h-4 mr-2" />
          Create Main Office Expense
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 bg-base-100 p-3 sm:p-4 rounded-lg shadow-sm"
    >
      <!-- Month Filter -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text text-sm font-medium">Month</span>
        </label>
        <input
          v-model="selectedMonth"
          type="month"
          class="input input-bordered input-sm w-full"
        />
      </div>

      <!-- Branch Filter -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text text-sm font-medium">Branch</span>
        </label>
        <select
          v-model="selectedBranch"
          class="select select-bordered select-sm w-full"
        >
          <option value="">All Branches</option>
          <option
            v-for="branch in availableBranches"
            :key="branch.id"
            :value="branch.id"
          >
            {{ branch.name }}
          </option>
        </select>
      </div>

      <!-- Status Filter -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text text-sm font-medium">Status</span>
        </label>
        <select
          v-model="selectedStatus"
          class="select select-bordered select-sm w-full"
        >
          <option
            v-for="option in statusOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- Expense Type Filter -->
      <div class="form-control w-full">
        <label class="label">
          <span class="label-text text-sm font-medium">Expense Type</span>
        </label>
        <select
          v-model="selectedExpenseType"
          class="select select-bordered select-sm w-full"
        >
          <option value="">All</option>
          <option
            v-for="option in expenseTypes"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Expense Summary Card -->
    <div class="bg-base-100 p-6 rounded-lg shadow-sm">
      <h3 class="text-lg font-bold text-primaryColor mb-4">
        Monthly Utilities Summary - {{ selectedMonth || 'Current Month' }}
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- Electricity -->
        <div
          class="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200"
        >
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-semibold text-yellow-800">Electricity</h4>
            <font-awesome-icon
              icon="fa-solid fa-bolt"
              class="text-yellow-600"
            />
          </div>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Branch:</span>
              <span class="font-medium">{{
                formatCurrency(expenseSummary.electricity.branch)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Main Office:</span>
              <span class="font-medium">{{
                formatCurrency(expenseSummary.electricity.main)
              }}</span>
            </div>
            <div class="flex justify-between border-t border-yellow-500 pt-1">
              <span class="font-semibold text-yellow-800">Total:</span>
              <span class="font-bold text-yellow-800">{{
                formatCurrency(expenseSummary.electricity.total)
              }}</span>
            </div>
          </div>
        </div>

        <!-- Water -->
        <div
          class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200"
        >
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-semibold text-blue-800">Water</h4>
            <font-awesome-icon
              icon="fa-solid fa-droplet"
              class="text-blue-600"
            />
          </div>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Branch:</span>
              <span class="font-medium">{{
                formatCurrency(expenseSummary.water.branch)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Main Office:</span>
              <span class="font-medium">{{
                formatCurrency(expenseSummary.water.main)
              }}</span>
            </div>
            <div class="flex justify-between border-t border-blue-500 pt-1">
              <span class="font-semibold text-blue-800">Total:</span>
              <span class="font-bold text-blue-800">{{
                formatCurrency(expenseSummary.water.total)
              }}</span>
            </div>
          </div>
        </div>

        <!-- Internet -->
        <div
          class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200"
        >
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-semibold text-green-800">Internet</h4>
            <font-awesome-icon icon="fa-solid fa-wifi" class="text-green-600" />
          </div>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Branch:</span>
              <span class="font-medium">{{
                formatCurrency(expenseSummary.internet.branch)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Main Office:</span>
              <span class="font-medium">{{
                formatCurrency(expenseSummary.internet.main)
              }}</span>
            </div>
            <div class="flex justify-between border-t border-green-500 pt-1">
              <span class="font-semibold text-green-800">Total:</span>
              <span class="font-bold text-green-800">{{
                formatCurrency(expenseSummary.internet.total)
              }}</span>
            </div>
          </div>
        </div>

        <!-- Other -->
        <div
          class="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200"
        >
          <div class="flex items-center justify-between mb-2">
            <h4 class="font-semibold text-gray-800">Other</h4>
            <font-awesome-icon
              icon="fa-solid fa-ellipsis"
              class="text-gray-600"
            />
          </div>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Branch:</span>
              <span class="font-medium">{{
                formatCurrency(expenseSummary.other.branch)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Main Office:</span>
              <span class="font-medium">{{
                formatCurrency(expenseSummary.other.main)
              }}</span>
            </div>
            <div class="flex justify-between border-t border-gray-500 pt-1">
              <span class="font-semibold text-gray-800">Total:</span>
              <span class="font-bold text-gray-800">{{
                formatCurrency(expenseSummary.other.total)
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Grand Total -->
      <div
        class="bg-gradient-to-r from-primaryColor/10 to-primaryColor/5 p-4 rounded-lg border border-primaryColor/20"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <font-awesome-icon
              icon="fa-solid fa-calculator"
              class="text-primaryColor text-xl"
            />
            <h4 class="text-lg font-bold text-primaryColor">Grand Total</h4>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-primaryColor">
              {{ formatCurrency(expenseSummary.grandTotal) }}
            </div>
            <div class="text-sm text-gray-600">
              All utilities expenses for {{ selectedMonth || 'current month' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <div class="loading loading-spinner loading-lg text-primaryColor"></div>
    </div>

    <!-- Remittances Table -->
    <div v-else-if="remittances.length > 0" class="overflow-x-auto">
      <table class="table table-zebra w-full">
        <thead>
          <tr>
            <th>Branch</th>
            <th>Expense Type</th>
            <th>Amount</th>
            <th>Month</th>

            <th>Submitted By</th>
            <th>Submitted Date</th>
            <th>Receipt</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="remittance in remittances" :key="remittance.id">
            <td>
              <div class="font-medium">{{ remittance.branch_name }}</div>
            </td>
            <td>
              <div class="capitalize">{{ remittance.expense_type }}</div>
              <div
                v-if="remittance.expense_description"
                class="text-xs text-gray-500"
              >
                {{ remittance.expense_description }}
              </div>
            </td>
            <td class="font-medium">{{ formatCurrency(remittance.amount) }}</td>
            <td>{{ remittance.expense_month }}</td>

            <td>{{ remittance.submitted_by_name }}</td>
            <td>{{ formatDate(remittance.created_at) }}</td>
            <td>
              <button
                @click="viewReceipt(remittance.receipt_url)"
                class="btn btn-ghost btn-xs"
              >
                View Receipt
              </button>
            </td>
            <td>
              <span
                :class="[
                  'badge badge-sm',
                  getStatusBadgeClass(remittance.status),
                ]"
              >
                {{ remittance.status }}
              </span>
            </td>
            <td>
              <div class="flex gap-2">
                <!-- Approve Button -->
                <button
                  v-if="remittance.status === 'pending'"
                  @click="handleApprove(remittance)"
                  class="btn bg-success/10 text-success border-none btn-xs flex items-center gap-1 rounded-full"
                  title="Approve"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-check"
                    class="w-3.5 h-3.5"
                  />
                </button>

                <!-- Reject Button -->
                <button
                  v-if="remittance.status === 'pending'"
                  @click="handleReject(remittance)"
                  class="btn bg-error/10 text-error border-none btn-xs flex items-center gap-1 rounded-full"
                  title="Reject"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-xmark"
                    class="w-3.5 h-3.5"
                  />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination -->
      <div class="flex justify-center mt-6">
        <div class="join">
          <button
            @click="currentPage = Math.max(1, currentPage - 1)"
            :disabled="currentPage <= 1"
            class="join-item btn btn-sm"
          >
            «
          </button>
          <button class="join-item btn btn-sm">
            Page {{ currentPage }} of {{ pagination.pages }}
          </button>
          <button
            @click="currentPage = Math.min(pagination.pages, currentPage + 1)"
            :disabled="currentPage >= pagination.pages"
            class="join-item btn btn-sm"
          >
            »
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
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
            stroke-width="1"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          ></path>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">
        No Utilities Remittances
      </h3>
      <p class="text-gray-600">
        No utilities expense remittances found for the selected filters.
      </p>
    </div>

    <!-- Main Office Expenses Section -->
    <div class="mt-8">
      <h3 class="text-lg font-bold text-primaryColor mb-4">
        Main Office Expenses
      </h3>

      <!-- Main Office Expenses Table -->
      <div v-if="mainOfficeExpenses.length > 0" class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th>Entity</th>
              <th>Expense Type</th>
              <th>Amount</th>
              <th>Month</th>
              <th>Recorded By</th>
              <th>Recorded Date</th>
              <th>Receipt</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="expense in mainOfficeExpenses" :key="expense.id">
              <td>
                <div class="font-medium">{{ expense.entity_name }}</div>
              </td>
              <td>
                <div class="capitalize">{{ expense.expense_type }}</div>
                <div
                  v-if="expense.expense_description"
                  class="text-xs text-gray-500"
                >
                  {{ expense.expense_description }}
                </div>
              </td>
              <td class="font-medium">{{ formatCurrency(expense.amount) }}</td>
              <td>{{ expense.expense_month }}</td>
              <td>{{ expense.recorded_by_name }}</td>
              <td>{{ formatDate(expense.created_at) }}</td>
              <td>
                <button
                  v-if="expense.receipt_url"
                  @click="viewReceipt(expense.receipt_url)"
                  class="btn btn-ghost btn-xs"
                >
                  View Receipt
                </button>
                <span v-else class="text-gray-400 text-xs">No receipt</span>
              </td>
              <td>
                <div
                  v-if="expense.notes"
                  class="text-sm text-gray-600 max-w-xs truncate"
                >
                  {{ expense.notes }}
                </div>
                <span v-else class="text-gray-400 text-xs">No notes</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State for Main Office Expenses -->
      <div v-else class="text-center py-8 bg-gray-50 rounded-lg">
        <div class="text-gray-400 mb-4">
          <svg
            class="w-12 h-12 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            ></path>
          </svg>
        </div>
        <h4 class="text-md font-medium text-gray-700 mb-2">
          No Main Office Expenses
        </h4>
        <p class="text-gray-500 text-sm">
          No main office expenses found for the selected month.
        </p>
      </div>
    </div>

    <!-- Approval Modal -->
    <div v-if="showApprovalModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Approve Utilities Remittance</h3>
        <p class="mb-4">
          Are you sure you want to approve this utilities remittance?
        </p>
        <div v-if="selectedRemittance" class="bg-gray-50 p-4 rounded-lg mb-4">
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <strong>Branch:</strong> {{ selectedRemittance.branch_name }}
            </div>
            <div>
              <strong>Type:</strong> {{ selectedRemittance.expense_type }}
            </div>
            <div>
              <strong>Amount:</strong>
              {{ formatCurrency(selectedRemittance.amount) }}
            </div>
            <div>
              <strong>Month:</strong> {{ selectedRemittance.expense_month }}
            </div>
          </div>
        </div>
        <div class="modal-action">
          <button
            @click="showApprovalModal = false"
            class="btn btn-ghost btn-sm"
            :disabled="approving"
          >
            Cancel
          </button>
          <button
            @click="confirmApprove"
            class="btn bg-primaryColor text-white hover:bg-primaryColor/90 font-thin btn-sm"
            :disabled="approving"
          >
            {{ approving ? 'Approving...' : 'Approve' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Rejection Modal -->
    <div v-if="showRejectionModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Reject Utilities Remittance</h3>
        <p class="mb-4">
          Please provide a reason for rejecting this utilities remittance:
        </p>
        <div v-if="selectedRemittance" class="bg-gray-50 p-4 rounded-lg mb-4">
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <strong>Branch:</strong> {{ selectedRemittance.branch_name }}
            </div>
            <div>
              <strong>Type:</strong> {{ selectedRemittance.expense_type }}
            </div>
            <div>
              <strong>Amount:</strong>
              {{ formatCurrency(selectedRemittance.amount) }}
            </div>
            <div>
              <strong>Month:</strong> {{ selectedRemittance.expense_month }}
            </div>
          </div>
        </div>
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Rejection Reason</span>
          </label>
          <textarea
            v-model="rejectionReason"
            class="textarea textarea-bordered"
            placeholder="Enter reason for rejection..."
            rows="3"
            :disabled="rejecting"
          ></textarea>
        </div>
        <div class="modal-action">
          <button
            @click="showRejectionModal = false"
            class="btn btn-ghost btn-sm"
            :disabled="rejecting"
          >
            Cancel
          </button>
          <button
            @click="confirmReject"
            class="btn btn-error btn-sm"
            :disabled="rejecting"
          >
            {{ rejecting ? 'Rejecting...' : 'Reject' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Receipt Modal -->
    <div v-if="showReceiptModal" class="modal modal-open">
      <div class="modal-box w-full max-w-4xl">
        <h3 class="font-bold text-lg mb-4 text-gray-800">Receipt Image</h3>

        <!-- Receipt Image -->
        <div class="text-center">
          <img
            :src="receiptImageUrl"
            alt="Receipt"
            class="max-w-full max-h-96 mx-auto border rounded shadow-sm"
            @error="handleImageError"
          />
          <div
            v-if="imageError"
            class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <p class="text-red-600 text-sm">
              <svg
                class="w-4 h-4 inline mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                ></path>
              </svg>
              Unable to load receipt image. Please try again later.
            </p>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="modal-action">
          <button
            @click="showReceiptModal = false"
            class="btn btn-ghost btn-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Create Main Office Expense Modal -->
    <div v-if="showCreateModal" class="modal modal-open">
      <div class="modal-box w-full max-w-2xl">
        <h3 class="font-bold text-lg mb-4">
          Create Main Office Utilities Expense
        </h3>

        <!-- Responsive Form Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Entity Name -->
          <div class="form-control md:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Entity Name *</span>
            </label>
            <input
              v-model="newExpense.entity_name"
              type="text"
              class="input input-bordered w-full"
              placeholder="e.g., Main Office, Finance Department, HR Department"
              :disabled="creating"
            />
          </div>

          <!-- Expense Type -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Expense Type *</span>
            </label>
            <select
              v-model="newExpense.expense_type"
              class="select select-bordered w-full"
              :disabled="creating"
            >
              <option value="">Select Type</option>
              <option value="electricity">Electricity</option>
              <option value="water">Water</option>
              <option value="internet">Internet</option>
              <option value="other">Other</option>
            </select>
          </div>

          <!-- Expense Description (for Other type) -->
          <div
            v-if="newExpense.expense_type === 'other'"
            class="form-control md:col-span-2"
          >
            <label class="label">
              <span class="label-text font-medium">Expense Description *</span>
            </label>
            <input
              v-model="newExpense.expense_description"
              type="text"
              class="input input-bordered w-full"
              placeholder="Describe the expense..."
              :disabled="creating"
            />
          </div>

          <!-- Amount -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Amount *</span>
            </label>
            <input
              v-model="newExpense.amount"
              type="number"
              step="0.01"
              min="0"
              class="input input-bordered w-full"
              placeholder="0.00"
              :disabled="creating"
            />
          </div>

          <!-- Month -->
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Expense Month *</span>
            </label>
            <input
              v-model="newExpense.expense_month"
              type="month"
              class="input input-bordered w-full"
              :disabled="creating"
            />
          </div>

          <!-- Receipt Upload -->
          <div class="form-control md:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Receipt (Optional)</span>
            </label>
            <input
              type="file"
              @change="handleReceiptChange"
              accept="image/*"
              class="file-input file-input-bordered w-full"
              :disabled="creating"
            />
            <div v-if="receiptPreview" class="mt-2">
              <img
                :src="receiptPreview"
                alt="Receipt preview"
                class="w-32 h-32 object-cover rounded border"
              />
              <button
                @click="removeReceipt"
                class="btn btn-sm btn-error mt-2"
                :disabled="creating"
              >
                Remove Receipt
              </button>
            </div>
          </div>

          <!-- Notes -->
          <div class="form-control md:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Notes</span>
            </label>
            <textarea
              v-model="newExpense.notes"
              class="textarea textarea-bordered w-full"
              placeholder="Additional notes..."
              rows="3"
              :disabled="creating"
            ></textarea>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="modal-action flex flex-col sm:flex-row gap-2 justify-end">
          <button
            @click="closeCreateModal"
            class="btn btn-ghost btn-sm w-full sm:w-auto"
            :disabled="creating"
          >
            Cancel
          </button>
          <button
            @click="createExpense"
            class="btn bg-primaryColor text-white hover:bg-primaryColor/90 font-thin btn-sm w-full sm:w-auto"
            :disabled="creating"
          >
            {{ creating ? 'Creating...' : 'Create Expense' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
