<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { useUtilityExpensesStore } from '../../stores/utilityExpensesStore.js';
  import { useBranchContextStore } from '../../stores/branchContextStore.js';
  import { useCustomToast } from '../../composables/useCustomToast.js';
  import { formatImageUrl } from '../../config/api.js';
  import {
    getCurrentPhilippineTime,
    createPhilippineDate,
  } from '../../utils/timezoneUtils.js';

  const utilityExpensesStore = useUtilityExpensesStore();
  const branchContext = useBranchContextStore();
  const { showToast } = useCustomToast();

  // State
  const loading = ref(false);
  const submitting = ref(false);
  const updating = ref(false);
  const deleting = ref(false);
  const selectedMonth = ref('');
  const currentPage = ref(1);
  const pageSize = ref(10);
  const showSubmitModal = ref(false);
  const showEditModal = ref(false);
  const showDeleteModal = ref(false);
  const showReceiptModal = ref(false);
  const selectedRemittance = ref(null);
  const receiptPreview = ref(null);
  const imageError = ref(false);

  // Form data
  const formData = ref({
    expense_type: '',
    expense_description: '',
    amount: '',
    expense_month: '',
    receipt: null,
    notes: '',
  });

  // Computed
  const remittances = computed(() => utilityExpensesStore.remittances);
  const pagination = computed(() => utilityExpensesStore.pagination);
  const currentBranch = computed(() => branchContext.currentBranch);
  const pendingRemittances = computed(() =>
    remittances.value.filter((r) => r.status === 'pending')
  );
  const approvedRemittances = computed(() =>
    remittances.value.filter((r) => r.status === 'approved')
  );
  const rejectedRemittances = computed(() =>
    remittances.value.filter((r) => r.status === 'rejected')
  );

  // Summary calculations
  const totalExpenses = computed(() => {
    return remittances.value.reduce(
      (sum, r) => sum + parseFloat(r.amount || 0),
      0
    );
  });

  const expensesByType = computed(() => {
    const types = ['electricity', 'water', 'internet', 'other'];
    return types.map((type) => {
      const typeExpenses = remittances.value.filter(
        (r) => r.expense_type === type
      );
      const total = typeExpenses.reduce(
        (sum, r) => sum + parseFloat(r.amount || 0),
        0
      );
      return {
        type,
        count: typeExpenses.length,
        total,
      };
    });
  });

  // Expense type options
  const expenseTypes = [
    { value: 'electricity', label: 'Electricity' },
    { value: 'water', label: 'Water' },
    { value: 'internet', label: 'Internet' },
    { value: 'other', label: 'Other' },
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
    if (!currentBranch.value?.id) return;

    loading.value = true;
    try {
      const filters = {
        branch_id: currentBranch.value.id,
        expense_month: selectedMonth.value,
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

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      formData.value.receipt = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        receiptPreview.value = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit new remittance
  const submitRemittance = async () => {
    if (
      !formData.value.expense_type ||
      !formData.value.amount ||
      !formData.value.expense_month ||
      !formData.value.receipt
    ) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (
      formData.value.expense_type === 'other' &&
      !formData.value.expense_description.trim()
    ) {
      showToast('Please provide description for "Other" expense type', 'error');
      return;
    }

    submitting.value = true;
    try {
      const submitData = new FormData();
      submitData.append('branch_id', currentBranch.value.id);
      submitData.append('expense_type', formData.value.expense_type);
      submitData.append(
        'expense_description',
        formData.value.expense_description || ''
      );
      submitData.append('amount', formData.value.amount);
      submitData.append('expense_month', formData.value.expense_month);
      submitData.append('receipt', formData.value.receipt);
      submitData.append('notes', formData.value.notes || '');

      await utilityExpensesStore.createRemittance(submitData);
      showToast('Utilities remittance submitted successfully', 'success');
      showSubmitModal.value = false;
      resetForm();
      await fetchRemittances();
    } catch (error) {
      console.error('Error submitting remittance:', error);
      showToast('Failed to submit remittance', 'error');
    } finally {
      submitting.value = false;
    }
  };

  // Edit remittance
  const editRemittance = (remittance) => {
    if (remittance.status !== 'pending') {
      showToast('Cannot edit non-pending remittances', 'error');
      return;
    }

    selectedRemittance.value = remittance;
    formData.value = {
      expense_type: remittance.expense_type,
      expense_description: remittance.expense_description || '',
      amount: remittance.amount,
      expense_month: remittance.expense_month,
      receipt: null,
      notes: remittance.notes || '',
    };
    receiptPreview.value = null;
    showEditModal.value = true;
  };

  const updateRemittance = async () => {
    if (!selectedRemittance.value) return;

    updating.value = true;
    try {
      const updateData = new FormData();
      updateData.append('expense_type', formData.value.expense_type);
      updateData.append(
        'expense_description',
        formData.value.expense_description || ''
      );
      updateData.append('amount', formData.value.amount);
      updateData.append('expense_month', formData.value.expense_month);
      if (formData.value.receipt) {
        updateData.append('receipt', formData.value.receipt);
      }
      updateData.append('notes', formData.value.notes || '');

      await utilityExpensesStore.updateRemittance(
        selectedRemittance.value.id,
        updateData
      );
      showToast('Utilities remittance updated successfully', 'success');
      showEditModal.value = false;
      selectedRemittance.value = null;
      resetForm();
      await fetchRemittances();
    } catch (error) {
      console.error('Error updating remittance:', error);
      showToast('Failed to update remittance', 'error');
    } finally {
      updating.value = false;
    }
  };

  // View receipt
  const viewReceipt = (remittance) => {
    selectedRemittance.value = remittance;
    imageError.value = false; // Reset error state
    showReceiptModal.value = true;
  };

  // Handle image loading error
  const handleImageError = () => {
    imageError.value = true;
  };

  // Delete remittance
  const deleteRemittance = (remittance) => {
    if (remittance.status !== 'pending') {
      showToast('Cannot delete non-pending remittances', 'error');
      return;
    }

    selectedRemittance.value = remittance;
    showDeleteModal.value = true;
  };

  const confirmDelete = async () => {
    if (!selectedRemittance.value) return;

    deleting.value = true;
    try {
      await utilityExpensesStore.deleteRemittance(selectedRemittance.value.id);
      showToast('Utilities remittance deleted successfully', 'success');
      showDeleteModal.value = false;
      selectedRemittance.value = null;
      await fetchRemittances();
    } catch (error) {
      console.error('Error deleting remittance:', error);
      showToast('Failed to delete remittance', 'error');
    } finally {
      deleting.value = false;
    }
  };

  // Reset form
  const resetForm = () => {
    formData.value = {
      expense_type: '',
      expense_description: '',
      amount: '',
      expense_month: '',
      receipt: null,
      notes: '',
    };
    receiptPreview.value = null;
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
        return 'bg-warning/20 text-warning badge-sm border-none font-medium';
      case 'approved':
        return 'bg-success/20 text-success';
      case 'rejected':
        return 'bg-error/20 text-error';
      default:
        return 'bg-neutral/20 text-neutral badge-sm border-none font-medium';
    }
  };

  // Watch for month changes
  watch(selectedMonth, () => {
    currentPage.value = 1;
    fetchRemittances();
  });

  // Watch for page changes
  watch(currentPage, () => {
    fetchRemittances();
  });

  onMounted(() => {
    initializeMonth();
    fetchRemittances();
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
    >
      <div>
        <h1 class="text-2xl font-bold text-primaryColor">
          Monthly Utilities Expenses
        </h1>
        <p class="text-sm text-gray-600">
          Submit and manage your branch's monthly utility expenses
        </p>
      </div>
      <button
        @click="showSubmitModal = true"
        :disabled="submitting || updating || deleting"
        class="btn bg-primaryColor text-white font-thin hover:bg-primaryColor/90 btn-sm"
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
            d="M12 4v16m8-8H4"
          ></path>
        </svg>
        Submit New Expense
      </button>
    </div>

    <!-- Month Filter -->
    <div class="flex items-center gap-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text">Filter by Month</span>
        </label>
        <input
          v-model="selectedMonth"
          type="month"
          class="input input-bordered input-sm"
        />
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stat bg-base-100 shadow rounded-lg">
        <div class="stat-title">Total Expenses</div>
        <div class="stat-value text-gray-900">
          {{ formatCurrency(totalExpenses) }}
        </div>
        <div class="stat-desc">{{ remittances.length }} entries</div>
      </div>

      <div class="stat bg-base-100 shadow rounded-lg">
        <div class="stat-title">Pending</div>
        <div class="stat-value text-warning">
          {{ pendingRemittances.length }}
        </div>
        <div class="stat-desc">Awaiting approval</div>
      </div>

      <div class="stat bg-base-100 shadow rounded-lg">
        <div class="stat-title">Approved</div>
        <div class="stat-value text-success">
          {{ approvedRemittances.length }}
        </div>
        <div class="stat-desc">Approved by Finance</div>
      </div>

      <div class="stat bg-base-100 shadow rounded-lg">
        <div class="stat-title">Rejected</div>
        <div class="stat-value text-error">
          {{ rejectedRemittances.length }}
        </div>
        <div class="stat-desc">Requires attention</div>
      </div>
    </div>

    <!-- Expenses by Type -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h3 class="card-title">Expenses by Type</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            v-for="expense in expensesByType"
            :key="expense.type"
            class="text-center p-4 bg-gray-50 rounded-lg"
          >
            <div class="text-sm font-medium text-gray-600 capitalize">
              {{ expense.type }}
            </div>
            <div class="text-lg font-bold text-gray-900">
              {{ formatCurrency(expense.total) }}
            </div>
            <div class="text-xs text-gray-500">{{ expense.count }} entries</div>
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
            <th>Expense Type</th>
            <th>Amount</th>
            <th>Month</th>
            <th>Status</th>
            <th>Submitted Date</th>
            <th>Receipt</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="remittance in remittances" :key="remittance.id">
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
            <td>
              <span
                :class="[
                  'badge badge-sm',
                  getStatusBadgeClass(remittance.status),
                ]"
              >
                {{ remittance.status }}
              </span>
              <div
                v-if="
                  remittance.status === 'rejected' &&
                  remittance.rejection_reason
                "
                class="text-xs text-red-600 mt-1"
              >
                {{ remittance.rejection_reason }}
              </div>
            </td>
            <td>{{ formatDate(remittance.created_at) }}</td>
            <td>
              <button
                @click="viewReceipt(remittance)"
                class="btn btn-ghost btn-xs"
              >
                View Receipt
              </button>
            </td>
            <td>
              <div class="flex gap-2">
                <!-- Edit Button -->
                <button
                  v-if="remittance.status === 'pending'"
                  @click="editRemittance(remittance)"
                  :disabled="updating || deleting"
                  class="btn bg-warning/10 text-warning border-none btn-xs flex items-center justify-center"
                  title="Edit"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-pen-to-square"
                    class="w-3.5 h-3.5"
                  />
                </button>

                <!-- Delete Button -->
                <button
                  v-if="remittance.status === 'pending'"
                  @click="deleteRemittance(remittance)"
                  :disabled="updating || deleting"
                  class="btn bg-error/10 text-error border-none btn-xs flex items-center justify-center"
                  title="Delete"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-trash"
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
        No Utilities Expenses
      </h3>
      <p class="text-gray-600 mb-4">
        No utilities expenses found for the selected month.
      </p>
      <button
        @click="showSubmitModal = true"
        :disabled="submitting || updating || deleting"
        class="btn bg-primaryColor text-white font-thin hover:bg-primaryColor/90"
      >
        Submit First Expense
      </button>
    </div>

    <!-- Submit Modal -->
    <div v-if="showSubmitModal" class="modal modal-open">
      <div
        class="modal-box w-full max-w-2xl sm:max-w-lg md:max-w-2xl lg:max-w-3xl rounded-xl"
      >
        <h3 class="font-bold text-lg mb-4 text-gray-800">
          Submit New Utilities Expense
        </h3>

        <!-- Form Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Expense Type -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Expense Type *</span>
            </label>
            <select
              v-model="formData.expense_type"
              class="select select-bordered w-full"
            >
              <option value="">Select Type</option>
              <option
                v-for="option in expenseTypes"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Amount -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Amount *</span>
            </label>
            <input
              v-model="formData.amount"
              type="number"
              step="0.01"
              min="0"
              class="input input-bordered w-full"
              placeholder="0.00"
            />
          </div>

          <!-- Month -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Month *</span>
            </label>
            <input
              v-model="formData.expense_month"
              type="month"
              class="input input-bordered w-full"
            />
          </div>

          <!-- Receipt Upload -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Receipt *</span>
            </label>
            <input
              @change="handleFileSelect"
              type="file"
              accept="image/*,.pdf"
              class="file-input file-input-bordered w-full"
            />
          </div>
        </div>

        <!-- Description (for "Other" type) -->
        <div v-if="formData.expense_type === 'other'" class="form-control mt-4">
          <label class="label">
            <span class="label-text">Description *</span>
          </label>
          <input
            v-model="formData.expense_description"
            type="text"
            class="input input-bordered w-full"
            placeholder="Describe the expense..."
          />
        </div>

        <!-- Notes -->
        <div class="form-control mt-4">
          <label class="label">
            <span class="label-text">Notes</span>
          </label>
          <textarea
            v-model="formData.notes"
            class="textarea textarea-bordered w-full"
            placeholder="Additional notes..."
            rows="3"
          ></textarea>
        </div>

        <!-- Receipt Preview -->
        <div v-if="receiptPreview" class="mt-4">
          <label class="label">
            <span class="label-text">Receipt Preview</span>
          </label>
          <img
            :src="receiptPreview"
            alt="Receipt Preview"
            class="w-full sm:w-1/2 max-h-48 object-contain border rounded shadow-sm"
          />
        </div>

        <!-- Modal Actions -->
        <div
          class="modal-action flex flex-col sm:flex-row items-center justify-end gap-2 mt-6"
        >
          <button
            @click="
              showSubmitModal = false;
              resetForm();
            "
            class="btn btn-ghost btn-sm w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            @click="submitRemittance"
            :disabled="submitting"
            class="btn bg-primaryColor text-white hover:bg-primaryColor/90 font-thin btn-sm w-full sm:w-auto"
          >
            <span v-if="submitting">Submitting...</span>
            <span v-else>Submit Expense</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="showEditModal" class="modal modal-open">
      <div
        class="modal-box w-full max-w-2xl sm:max-w-lg md:max-w-2xl lg:max-w-3xl rounded-xl max-h-[90vh] overflow-y-auto"
      >
        <h3 class="font-bold text-lg mb-4 text-gray-800">
          Edit Utilities Expense
        </h3>

        <!-- Form Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Expense Type -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Expense Type *</span>
            </label>
            <select
              v-model="formData.expense_type"
              class="select select-bordered w-full"
            >
              <option value="">Select Type</option>
              <option
                v-for="option in expenseTypes"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Amount -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Amount *</span>
            </label>
            <input
              v-model="formData.amount"
              type="number"
              step="0.01"
              min="0"
              class="input input-bordered w-full"
              placeholder="0.00"
            />
          </div>

          <!-- Month -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Month *</span>
            </label>
            <input
              v-model="formData.expense_month"
              type="month"
              class="input input-bordered w-full"
            />
          </div>

          <!-- Receipt Upload -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Receipt (Optional)</span>
            </label>
            <input
              @change="handleFileSelect"
              type="file"
              accept="image/*,.pdf"
              class="file-input file-input-bordered w-full"
            />
            <div class="label">
              <span class="label-text-alt text-gray-500 text-xs">
                Leave empty to keep current receipt
              </span>
            </div>
          </div>
        </div>

        <!-- Description (for Other type) -->
        <div v-if="formData.expense_type === 'other'" class="form-control mt-4">
          <label class="label">
            <span class="label-text">Description *</span>
          </label>
          <input
            v-model="formData.expense_description"
            type="text"
            class="input input-bordered w-full"
            placeholder="Describe the expense..."
          />
        </div>

        <!-- Notes -->
        <div class="form-control mt-4">
          <label class="label">
            <span class="label-text">Notes</span>
          </label>
          <textarea
            v-model="formData.notes"
            class="textarea textarea-bordered w-full"
            placeholder="Additional notes..."
            rows="3"
          ></textarea>
        </div>

        <!-- Receipt Preview -->
        <div v-if="receiptPreview" class="mt-4">
          <label class="label">
            <span class="label-text">New Receipt Preview</span>
          </label>
          <img
            :src="receiptPreview"
            alt="Receipt Preview"
            class="w-full sm:w-1/2 max-h-48 object-contain border rounded shadow-sm"
          />
        </div>

        <!-- Modal Actions -->
        <div
          class="modal-action flex flex-col sm:flex-row items-center justify-end gap-2 mt-6"
        >
          <button
            @click="
              showEditModal = false;
              resetForm();
            "
            class="btn btn-ghost btn-sm w-full sm:w-auto"
          >
            Cancel
          </button>
          <button
            @click="updateRemittance"
            :disabled="updating"
            class="btn bg-primaryColor text-white hover:bg-primaryColor/90 font-thin btn-sm w-full sm:w-auto"
            :class="{ loading: updating }"
          >
            <span v-if="updating">Updating...</span>
            <span v-else>Update Expense</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Receipt Viewing Modal -->
    <div v-if="showReceiptModal" class="modal modal-open">
      <div class="modal-box w-full max-w-4xl">
        <h3 class="font-bold text-lg mb-4 text-gray-800">
          Receipt -
          {{
            selectedRemittance?.expense_type?.charAt(0).toUpperCase() +
            selectedRemittance?.expense_type?.slice(1)
          }}
          Expense
        </h3>

        <div v-if="selectedRemittance" class="space-y-4">
          <!-- Receipt Details -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
              <div>
                <strong>Status:</strong>
                <span
                  :class="[
                    'badge',
                    getStatusBadgeClass(selectedRemittance.status),
                  ]"
                >
                  {{ selectedRemittance.status }}
                </span>
              </div>
            </div>
            <div
              v-if="selectedRemittance.expense_description"
              class="mt-2 text-sm"
            >
              <strong>Description:</strong>
              {{ selectedRemittance.expense_description }}
            </div>
            <div v-if="selectedRemittance.notes" class="mt-2 text-sm">
              <strong>Notes:</strong> {{ selectedRemittance.notes }}
            </div>
          </div>

          <!-- Receipt Image -->
          <div class="text-center">
            <img
              :src="formatImageUrl(selectedRemittance.receipt_url)"
              :alt="`Receipt for ${selectedRemittance.expense_type} expense`"
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

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Delete Utilities Expense</h3>
        <p class="mb-4">
          Are you sure you want to delete this utilities expense? This action
          cannot be undone.
        </p>
        <div v-if="selectedRemittance" class="bg-gray-50 p-4 rounded-lg mb-4">
          <div class="grid grid-cols-2 gap-2 text-sm">
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
            <div><strong>Status:</strong> {{ selectedRemittance.status }}</div>
          </div>
        </div>
        <div class="modal-action">
          <button @click="showDeleteModal = false" class="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button
            @click="confirmDelete"
            :disabled="deleting"
            class="btn btn-error btn-sm"
            :class="{ loading: deleting }"
          >
            <span v-if="deleting">Deleting...</span>
            <span v-else>Delete</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
