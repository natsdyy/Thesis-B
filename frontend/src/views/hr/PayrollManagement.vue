<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { useRouter } from 'vue-router';
  import { usePayrollStore } from '../../stores/payrollStore.js';
  import { useCustomToast } from '../../composables/useCustomToast.js';
  import PayrollDetailsModal from '../../components/payroll/PayrollDetailsModal.vue';
  import {
    DollarSign,
    Calendar,
    Users,
    FileText,
    RefreshCcw,
    Eye,
    Check,
    X,
    Trash2,
    Send,
    Filter,
  } from 'lucide-vue-next';
  import {
    formatForDisplay,
    getCurrentPhilippineDate,
  } from '../../utils/timezoneUtils.js';

  const router = useRouter();
  const payrollStore = usePayrollStore();
  const { showSuccess, showError, showWarning, showInfo } = useCustomToast();

  // State
  const activeTab = ref('all');
  const searchQuery = ref('');
  const statusFilter = ref('');
  const dateFromFilter = ref('');
  const dateToFilter = ref('');
  const selectedPeriod = ref(null);
  const showDetailsModal = ref(false);
  const selectedPeriodId = ref(null);

  // Confirmation Modal State
  const confirmationModal = ref({
    show: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
    type: 'warning', // 'warning', 'danger', 'info'
  });

  // Action loading state
  const actionLoading = ref(false);

  // Computed
  const loading = computed(() => payrollStore.loading);
  const payrollPeriods = computed(() => payrollStore.payrollPeriods);

  // Filtered periods
  const filteredPeriods = computed(() => {
    let periods = payrollPeriods.value || [];

    // Filter by tab
    if (activeTab.value !== 'all') {
      const statusMap = {
        draft: 'draft',
        approved: ['approved', 'budget_released'], // Approved by Finance
        released: 'paid',
      };
      if (activeTab.value === 'approved') {
        periods = periods.filter((p) =>
          statusMap[activeTab.value].includes(p.status)
        );
      } else {
        periods = periods.filter(
          (p) => p.status === statusMap[activeTab.value]
        );
      }
    }

    // Filter by status
    if (statusFilter.value) {
      periods = periods.filter((p) => p.status === statusFilter.value);
    }

    // Filter by date range
    if (dateFromFilter.value) {
      periods = periods.filter(
        (p) => new Date(p.date_from) >= new Date(dateFromFilter.value)
      );
    }

    if (dateToFilter.value) {
      periods = periods.filter(
        (p) => new Date(p.date_to) <= new Date(dateToFilter.value)
      );
    }

    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      periods = periods.filter(
        (p) =>
          p.period_name.toLowerCase().includes(query) ||
          p.generated_by_name?.toLowerCase().includes(query)
      );
    }

    return periods;
  });

  // Methods
  const setActiveTab = (tab) => {
    activeTab.value = tab;
  };

  const showConfirmation = (
    title,
    message,
    onConfirm,
    type = 'warning',
    confirmText = 'Confirm'
  ) => {
    confirmationModal.value = {
      show: true,
      title,
      message,
      confirmText,
      cancelText: 'Cancel',
      onConfirm,
      type,
    };
  };

  const closeConfirmation = () => {
    confirmationModal.value.show = false;
  };

  const handleConfirm = async () => {
    if (confirmationModal.value.onConfirm) {
      actionLoading.value = true;
      try {
        await confirmationModal.value.onConfirm();
      } finally {
        actionLoading.value = false;
      }
    }
    closeConfirmation();
  };

  const refreshPeriods = async () => {
    actionLoading.value = true;
    try {
      await payrollStore.fetchPayrollPeriods({ limit: 100, offset: 0 });
      showSuccess('Payroll periods refreshed successfully');
    } catch (error) {
      showError(error.message || 'Failed to refresh payroll periods');
    } finally {
      actionLoading.value = false;
    }
  };

  const viewPeriodDetails = async (period) => {
    try {
      await payrollStore.fetchPeriodDetails(period.id);
      selectedPeriodId.value = period.id;
      showDetailsModal.value = true;
    } catch (error) {
      showError(error.message || 'Failed to load payroll details');
    }
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedPeriodId.value = null;
  };

  const handleRefreshAfterAction = async () => {
    await refreshPeriods();
    closeDetailsModal();
  };

  const submitToFinance = (period) => {
    showConfirmation(
      'Submit Payroll to Finance',
      `Are you sure you want to submit "${period.period_name}" to Finance for approval? This action cannot be undone.`,
      async () => {
        try {
          await payrollStore.submitToFinance(period.id);
          showSuccess('Payroll submitted to Finance successfully');
          await refreshPeriods();
        } catch (error) {
          showError(error.message || 'Failed to submit payroll to Finance');
        }
      },
      'info',
      'Submit to Finance'
    );
  };

  const deletePeriod = (period) => {
    showConfirmation(
      'Delete Payroll Period',
      `Are you sure you want to delete "${period.period_name}"? This action cannot be undone and will remove all payroll records associated with this period.`,
      async () => {
        try {
          await payrollStore.deletePayrollPeriod(period.id);
          showSuccess('Payroll period deleted successfully');
          await refreshPeriods();
        } catch (error) {
          showError(error.message || 'Failed to delete payroll period');
        }
      },
      'danger',
      'Delete Payroll'
    );
  };

  const formatDate = (date) => {
    if (!date) return '';
    return formatForDisplay(date, 'en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-neutral/10 text-neutral border-none';
      case 'pending_approval':
        return 'bg-warning/10 text-warning border-none';
      case 'approved':
        return 'bg-info/10 text-info border-none';
      case 'paid':
        return 'bg-success/10 text-success border-none';
      default:
        return 'bg-neutral/10 text-neutral border-none';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'pending_approval':
        return 'Pending Approval';
      case 'approved':
        return 'Approved';
      case 'paid':
        return 'Released';
      default:
        return status;
    }
  };

  // Lifecycle
  onMounted(async () => {
    await refreshPeriods();
  });
</script>

<template>
  <div class="container mx-auto p-4 sm:p-6 max-w-7xl">
    <!-- Header -->
    <div class="mb-4 sm:mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-primaryColor/10 text-primaryColor">
          <DollarSign class="w-5 h-5" />
        </div>
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-primaryColor">
            Payroll Management
          </h1>
          <p class="text-sm text-black/50">
            Manage employee payroll with approval workflows
          </p>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed mb-4 justify-start w-full">
      <button
        @click="setActiveTab('all')"
        class="tab"
        :class="{ 'tab-active': activeTab === 'all' }"
      >
        <FileText class="w-4 h-4 mr-2" />
        <span>All Payroll</span>
      </button>
      <button
        @click="setActiveTab('draft')"
        class="tab"
        :class="{ 'tab-active': activeTab === 'draft' }"
      >
        <Calendar class="w-4 h-4 mr-2" />
        <span>Draft</span>
      </button>
      <button
        @click="setActiveTab('approved')"
        class="tab"
        :class="{ 'tab-active': activeTab === 'approved' }"
      >
        <Check class="w-4 h-4 mr-2" />
        <span>Approved by Finance</span>
      </button>
      <button
        @click="setActiveTab('released')"
        class="tab"
        :class="{ 'tab-active': activeTab === 'released' }"
      >
        <Users class="w-4 h-4 mr-2" />
        <span>Released</span>
      </button>
    </div>

    <!-- Filters -->
    <div class="card bg-accentColor border border-black/10 shadow mb-4">
      <div class="card-body p-3 sm:p-4">
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap"
        >
          <!-- Search -->
          <div class="form-control flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by period name..."
              class="input input-sm input-bordered w-full"
            />
          </div>

          <!-- Date From -->
          <div class="form-control">
            <input
              v-model="dateFromFilter"
              type="date"
              class="input input-sm input-bordered"
            />
          </div>

          <!-- Date To -->
          <div class="form-control">
            <input
              v-model="dateToFilter"
              type="date"
              class="input input-sm input-bordered"
            />
          </div>

          <!-- Refresh Button -->
          <button
            class="btn btn-sm btn-outline text-primaryColor"
            @click="refreshPeriods"
            :disabled="loading || actionLoading"
          >
            <RefreshCcw
              class="w-4 h-4"
              :class="{ 'animate-spin': loading || actionLoading }"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Payroll Periods Table -->
    <div class="card bg-accentColor border border-black/10 shadow">
      <div class="card-body p-0">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-10">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <!-- No data -->
        <div
          v-else-if="!filteredPeriods.length"
          class="p-6 text-center text-black/60"
        >
          <FileText class="w-12 h-12 mx-auto mb-4 text-black/30" />
          <p class="text-lg font-medium mb-2">No payroll periods found</p>
          <p class="text-sm">
            Generate payroll from the Employee Manager to get started.
          </p>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Period Name</th>
                <th>Type</th>
                <th>Date Range</th>
                <th>Employees</th>
                <th>Gross Amount</th>
                <th>Net Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="period in filteredPeriods" :key="period.id">
                <td class="font-medium">{{ period.period_name }}</td>
                <td class="text-sm capitalize">{{ period.period_type }}</td>
                <td class="text-sm">
                  {{ formatDate(period.date_from) }} -
                  {{ formatDate(period.date_to) }}
                </td>
                <td class="text-sm">
                  {{ period.employee_count || period.records?.length || 0 }}
                </td>
                <td class="text-sm font-medium text-success">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{ formatCurrency(period.total_gross_amount) }}
                </td>
                <td class="text-sm font-medium text-primaryColor">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{ formatCurrency(period.total_net_amount) }}
                </td>
                <td>
                  <span
                    class="badge badge-sm"
                    :class="getStatusBadgeClass(period.status)"
                  >
                    {{ getStatusText(period.status) }}
                  </span>
                </td>
                <td>
                  <div class="flex gap-2">
                    <!-- View -->
                    <button
                      class="btn btn-xs btn-ghost"
                      @click="viewPeriodDetails(period)"
                      title="View Details"
                    >
                      <Eye class="w-4 h-4" />
                    </button>

                    <!-- Submit (draft only) -->
                    <button
                      v-if="period.status === 'draft'"
                      class="btn btn-xs bg-info/10 text-info hover:bg-info/20 border-none"
                      @click="submitToFinance(period)"
                      :disabled="actionLoading"
                      title="Submit to Finance"
                    >
                      <Send class="w-4 h-4" />
                    </button>

                    <!-- Delete (draft only) -->
                    <button
                      v-if="period.status === 'draft'"
                      class="btn btn-xs bg-error/10 text-error hover:bg-error/20 border-none"
                      @click="deletePeriod(period)"
                      :disabled="actionLoading"
                      title="Delete"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Confirmation Modal -->
  <div v-if="confirmationModal.show" class="modal modal-open">
    <div class="modal-box bg-white">
      <h3
        class="font-bold text-lg mb-4"
        :class="{
          'text-warning': confirmationModal.type === 'warning',
          'text-error': confirmationModal.type === 'danger',
          'text-info': confirmationModal.type === 'info',
        }"
      >
        {{ confirmationModal.title }}
      </h3>
      <p class="py-4 text-gray-700">{{ confirmationModal.message }}</p>
      <div class="modal-action">
        <button
          @click="closeConfirmation"
          class="btn btn-ghost btn-sm font-thin"
          :disabled="actionLoading"
        >
          {{ confirmationModal.cancelText }}
        </button>
        <button
          @click="handleConfirm"
          class="btn btn-sm font-thin"
          :class="{
            'bg-warning/10 text-warning hover:bg-warning/20 border-none':
              confirmationModal.type === 'warning',
            'bg-error/10 text-error hover:bg-error/20 border-none':
              confirmationModal.type === 'danger',
            'bg-info/10 text-info hover:bg-info/20 border-none':
              confirmationModal.type === 'info',
          }"
          :disabled="actionLoading"
        >
          <span
            v-if="actionLoading"
            class="loading loading-spinner loading-xs mr-2"
          ></span>
          {{ confirmationModal.confirmText }}
        </button>
      </div>
    </div>
    <div class="modal-backdrop bg-black/50" @click="closeConfirmation"></div>
  </div>

  <!-- Payroll Details Modal -->
  <PayrollDetailsModal
    :show="showDetailsModal"
    :periodId="selectedPeriodId"
    @close="closeDetailsModal"
    @refresh="handleRefreshAfterAction"
  />
</template>

<style scoped>
  .table-zebra tbody tr:nth-child(odd) {
    background-color: rgba(0, 0, 0, 0.05);
  }
</style>
