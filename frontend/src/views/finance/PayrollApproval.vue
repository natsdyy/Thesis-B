<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { usePayrollStore } from '../../stores/payrollStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
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
    Filter,
    CheckCircle,
    Clock,
    AlertCircle,
  } from 'lucide-vue-next';
  import {
    formatForDisplay,
    getCurrentPhilippineDate,
  } from '../../utils/timezoneUtils.js';

  const payrollStore = usePayrollStore();
  const authStore = useAuthStore();

  // State
  const activeTab = ref('pending');
  const searchQuery = ref('');
  const dateFromFilter = ref('');
  const dateToFilter = ref('');
  const selectedPeriod = ref(null);
  const showDetailsModal = ref(false);

  // Toast
  const toast = ref({ show: false, type: 'success', message: '' });
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => (toast.value.show = false), 3000);
  };

  // Computed
  const loading = computed(() => payrollStore.loading);
  const payrollPeriods = computed(() => payrollStore.payrollPeriods);

  // Stats
  const stats = computed(() => {
    const periods = payrollPeriods.value || [];
    return {
      pending: periods.filter((p) => p.status === 'pending_approval').length,
      approved: periods.filter(
        (p) => p.status === 'approved' || p.status === 'budget_released'
      ).length,
      total: periods.length,
      totalAmount: periods
        .filter((p) => p.status === 'pending_approval')
        .reduce((sum, p) => sum + Number(p.total_net_amount || 0), 0),
    };
  });

  // Filtered periods for Finance approval
  const filteredPeriods = computed(() => {
    let periods = payrollPeriods.value || [];

    // Finance should only see: pending_approval, approved, budget_released, paid
    periods = periods.filter((p) =>
      ['pending_approval', 'approved', 'budget_released', 'paid'].includes(
        p.status
      )
    );

    // Filter by tab
    if (activeTab.value === 'pending') {
      periods = periods.filter((p) => p.status === 'pending_approval');
    } else if (activeTab.value === 'approved') {
      periods = periods.filter(
        (p) => p.status === 'approved' || p.status === 'budget_released'
      );
    } else if (activeTab.value === 'completed') {
      periods = periods.filter((p) => p.status === 'paid');
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

  const refreshPeriods = async () => {
    try {
      await payrollStore.fetchPayrollPeriods({ limit: 100, offset: 0 });
      showToast('success', 'Payroll periods refreshed');
    } catch (error) {
      showToast('error', error.message || 'Failed to refresh');
    }
  };

  const viewPeriodDetails = async (period) => {
    try {
      const details = await payrollStore.fetchPeriodDetails(period.id);
      selectedPeriod.value = details;
      showDetailsModal.value = true;
    } catch (error) {
      showToast('error', error.message || 'Failed to load details');
    }
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedPeriod.value = null;
  };

  const handleRefresh = async () => {
    await refreshPeriods();
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
      case 'pending_approval':
        return 'bg-warning/10 text-warning';
      case 'approved':
      case 'budget_released':
        return 'bg-info/10 text-info';
      case 'paid':
        return 'bg-success/10 text-success';
      default:
        return 'bg-neutral/10 text-neutral';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending_approval':
        return 'Pending Approval';
      case 'approved':
        return 'Approved';
      case 'budget_released':
        return 'Budget Released';
      case 'paid':
        return 'Completed';
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
    <div class="mb-6">
      <div class="flex items-center gap-3 mb-4">
        <div class="p-3 rounded-lg bg-primaryColor/10 text-primaryColor">
          <DollarSign class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-primaryColor">
            Payroll Approval
          </h1>
          <p class="text-sm text-black/50">
            Review and approve employee payroll submitted by HR
          </p>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- Pending Approval -->
        <div
          class="card bg-white border border-black/10 shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="card-body p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs text-black/60 mb-1">Pending Approval</p>
                <p class="text-2xl font-bold text-warning">
                  {{ stats.pending }}
                </p>
              </div>
              <div class="p-3 rounded-lg bg-warning/10">
                <Clock class="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>
        </div>

        <!-- Approved -->
        <div
          class="card bg-white border border-black/10 shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="card-body p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs text-black/60 mb-1">Approved</p>
                <p class="text-2xl font-bold text-info">
                  {{ stats.approved }}
                </p>
              </div>
              <div class="p-3 rounded-lg bg-info/10">
                <CheckCircle class="w-6 h-6 text-info" />
              </div>
            </div>
          </div>
        </div>

        <!-- Total Amount Pending -->
        <div
          class="card bg-white border border-black/10 shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="card-body p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs text-black/60 mb-1">Pending Amount</p>
                <p class="text-lg font-bold text-error">
                  ₱{{ formatCurrency(stats.totalAmount) }}
                </p>
              </div>
              <div class="p-3 rounded-lg bg-error/10">
                <AlertCircle class="w-6 h-6 text-error" />
              </div>
            </div>
          </div>
        </div>

        <!-- Total Periods -->
        <div
          class="card bg-white border border-black/10 shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="card-body p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs text-black/60 mb-1">Total Periods</p>
                <p class="text-2xl font-bold text-primaryColor">
                  {{ stats.total }}
                </p>
              </div>
              <div class="p-3 rounded-lg bg-primaryColor/10">
                <FileText class="w-6 h-6 text-primaryColor" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed mb-4 justify-start w-full bg-white">
      <button
        @click="setActiveTab('pending')"
        class="tab"
        :class="{ 'tab-active': activeTab === 'pending' }"
      >
        <Clock class="w-4 h-4 mr-2" />
        <span>Pending Approval</span>
        <span
          v-if="stats.pending > 0"
          class="ml-2 badge badge-xs badge-warning"
        >
          {{ stats.pending }}
        </span>
      </button>
      <button
        @click="setActiveTab('approved')"
        class="tab"
        :class="{ 'tab-active': activeTab === 'approved' }"
      >
        <Check class="w-4 h-4 mr-2" />
        <span>Approved</span>
      </button>
      <button
        @click="setActiveTab('completed')"
        class="tab"
        :class="{ 'tab-active': activeTab === 'completed' }"
      >
        <CheckCircle class="w-4 h-4 mr-2" />
        <span>Completed</span>
      </button>
      <button
        @click="setActiveTab('all')"
        class="tab"
        :class="{ 'tab-active': activeTab === 'all' }"
      >
        <FileText class="w-4 h-4 mr-2" />
        <span>All</span>
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
              placeholder="Search by period name or generated by..."
              class="input input-sm input-bordered w-full"
            />
          </div>

          <!-- Date From -->
          <div class="form-control">
            <input
              v-model="dateFromFilter"
              type="date"
              class="input input-sm input-bordered"
              placeholder="From"
            />
          </div>

          <!-- Date To -->
          <div class="form-control">
            <input
              v-model="dateToFilter"
              type="date"
              class="input input-sm input-bordered"
              placeholder="To"
            />
          </div>

          <!-- Refresh Button -->
          <button
            class="btn btn-sm btn-outline text-primaryColor"
            @click="refreshPeriods"
            :disabled="loading"
          >
            <RefreshCcw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
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
            {{
              activeTab === 'pending'
                ? 'No pending approvals at this time.'
                : 'No payroll periods match your filters.'
            }}
          </p>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead class="">
              <tr>
                <th>Period Name</th>
                <th>Type</th>
                <th>Date Range</th>
                <th>Generated By</th>
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
                  {{ period.generated_by_name || 'N/A' }}
                </td>
                <td class="text-sm text-center">
                  {{ period.employee_count || period.records?.length || 0 }}
                </td>
                <td class="text-sm font-medium text-success">
                  ₱{{ formatCurrency(period.total_gross_amount) }}
                </td>
                <td class="text-sm font-medium text-primaryColor">
                  ₱{{ formatCurrency(period.total_net_amount) }}
                </td>
                <td>
                  <span
                    class="badge badge-sm border-none"
                    :class="getStatusBadgeClass(period.status)"
                  >
                    {{ getStatusText(period.status) }}
                  </span>
                </td>
                <td>
                  <div class="flex gap-2">
                    <!-- View/Approve -->
                    <button
                      class="btn btn-xs font-thin"
                      :class="
                        period.status === 'pending_approval'
                          ? 'bg-warning/10 text-warning hover:bg-warning/20 border-none'
                          : 'btn-ghost border border-black/10 hover:bg-black/5'
                      "
                      @click="viewPeriodDetails(period)"
                      :title="
                        period.status === 'pending_approval'
                          ? 'Review & Approve'
                          : 'View Details'
                      "
                    >
                      <Eye class="w-4 h-4" />
                      {{
                        period.status === 'pending_approval' ? 'Review' : 'View'
                      }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast.show" class="toast toast-end">
      <div
        :class="[
          'alert',
          toast.type === 'error' ? 'alert-error' : 'alert-success',
        ]"
      >
        <span>{{ toast.message }}</span>
      </div>
    </div>
  </div>

  <!-- Payroll Details Modal -->
  <PayrollDetailsModal
    v-if="showDetailsModal && selectedPeriod"
    :payroll-period="selectedPeriod"
    :show="showDetailsModal"
    @close="closeDetailsModal"
    @refresh="handleRefresh"
  />
</template>

<style scoped>
  .table-zebra tbody tr:nth-child(odd) {
    background-color: rgba(0, 0, 0, 0.05);
  }
</style>
