<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import {
    FileText,
    Search,
    Filter,
    Download,
    RefreshCcw,
    Eye,
    Calendar,
    AlertTriangle,
    CheckCircle,
    Clock,
    User,
    Package,
    DollarSign,
  } from 'lucide-vue-next';
  import { usePurchaseOrderStore } from '../../stores/purchaseOrderStore.js';

  // Props
  const props = defineProps({
    show: {
      type: Boolean,
      default: false,
    },
    purchaseOrderId: {
      type: [Number, String],
      default: null,
    },
    onClose: {
      type: Function,
      required: true,
    },
  });

  // Emits - Add the missing viewReturnDetails event
  const emit = defineEmits([
    'return-processed',
    'return-cancelled',
    'viewReturnDetails',
  ]);

  // Store
  const purchaseOrderStore = usePurchaseOrderStore();

  // Local state
  const loading = ref(false);
  const searchQuery = ref('');
  const statusFilter = ref('');
  const reasonFilter = ref('');
  const dateFilter = ref('');
  const currentPage = ref(1);
  const itemsPerPage = ref(10);

  // Toast state
  const toast = ref({ show: false, type: '', message: '' });

  // Show toast helper
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      Pending: 'badge-warning',
      Processed: 'badge-info',
      Completed: 'badge-success',
    };
    return colors[status] || 'badge-neutral';
  };

  const getReasonColor = (reason) => {
    const colors = {
      'Back Order': 'text-info',
      Defective: 'text-error',
      'Wrong Item': 'text-warning',
      'Poor Quality': 'text-error',
      'Damaged in Transit': 'text-error',
      Other: 'text-neutral',
    };
    return colors[reason] || 'text-neutral';
  };

  // Computed properties
  const itemReturns = computed(() => {
    let returns = purchaseOrderStore.itemReturns;

    // Filter by purchase order if specified
    if (props.purchaseOrderId) {
      returns = returns.filter(
        (returnItem) => returnItem.purchase_order_id == props.purchaseOrderId
      );
    }

    return returns;
  });

  const filteredReturns = computed(() => {
    let filtered = [...itemReturns.value];

    // Search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (returnItem) =>
          returnItem.item_name?.toLowerCase().includes(query) ||
          returnItem.return_reason?.toLowerCase().includes(query) ||
          returnItem.logged_by?.toLowerCase().includes(query) ||
          returnItem.notes?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter.value) {
      filtered = filtered.filter(
        (returnItem) => returnItem.status === statusFilter.value
      );
    }

    // Reason filter
    if (reasonFilter.value) {
      filtered = filtered.filter(
        (returnItem) => returnItem.return_reason === reasonFilter.value
      );
    }

    // Date filter
    if (dateFilter.value) {
      filtered = filtered.filter((returnItem) => {
        const returnDate = new Date(returnItem.created_at)
          .toISOString()
          .split('T')[0];
        return returnDate === dateFilter.value;
      });
    }

    return filtered;
  });

  const paginatedReturns = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return filteredReturns.value.slice(start, start + itemsPerPage.value);
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredReturns.value.length / itemsPerPage.value);
  });

  const uniqueReasons = computed(() => {
    const reasons = [
      ...new Set(itemReturns.value.map((item) => item.return_reason)),
    ];
    return reasons.filter(Boolean).sort();
  });

  const uniqueStatuses = computed(() => {
    const statuses = [...new Set(itemReturns.value.map((item) => item.status))];
    return statuses.filter(Boolean).sort();
  });

  // Statistics
  const returnStats = computed(() => {
    const returns = itemReturns.value;
    return {
      total: returns.length,
      pending: returns.filter((r) => r.status === 'Pending').length,
      completed: returns.filter((r) => r.status === 'Completed').length,
      totalValue: returns.reduce((sum, r) => sum + (r.return_value || 0), 0),
    };
  });

  // Methods
  const loadItemReturns = async () => {
    loading.value = true;
    try {
      await purchaseOrderStore.fetchItemReturns(props.purchaseOrderId);
    } catch (error) {
      console.error('Error loading item returns:', error);
      showToast('error', 'Failed to load return history');
    } finally {
      loading.value = false;
    }
  };

  const clearFilters = () => {
    searchQuery.value = '';
    statusFilter.value = '';
    reasonFilter.value = '';
    dateFilter.value = '';
    currentPage.value = 1;
  };

  const exportToCSV = () => {
    const headers = [
      'Return ID',
      'Item Name',
      'Return Quantity',
      'Return Reason',
      'Status',
      'Logged By',
      'Logged Date',
      'Processed By',
      'Processed Date',
      'Notes',
      'Return Value',
    ];

    const csvContent = [
      headers.join(','),
      ...filteredReturns.value.map((returnItem) =>
        [
          returnItem.id,
          returnItem.item_name || 'N/A',
          returnItem.return_quantity,
          returnItem.return_reason,
          returnItem.status,
          returnItem.logged_by,
          formatDate(returnItem.created_at),
          returnItem.processed_by || 'N/A',
          formatDate(returnItem.processed_at),
          returnItem.notes || '',
          returnItem.return_value || 0,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `item_returns_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showToast('success', 'Return history exported to CSV');
  };

  const viewReturnDetails = (returnItem) => {
    // Emit event to parent component to show detailed view
    emit('viewReturnDetails', returnItem);
  };

  const completeReturn = async (returnItem) => {
    if (!['Pending', 'Processed'].includes(returnItem.status)) {
      showToast('error', 'Only pending or processed returns can be completed');
      return;
    }

    try {
      await purchaseOrderStore.completeItemReturn(returnItem.id);
      showToast('success', 'Return completed successfully');
      emit('return-processed', returnItem);
    } catch (error) {
      showToast('error', error.message || 'Failed to complete return');
    }
  };

  const cancelReturn = async (returnItem) => {
    if (returnItem.status === 'Completed') {
      showToast('error', 'Completed returns cannot be cancelled');
      return;
    }

    try {
      await purchaseOrderStore.cancelItemReturn(returnItem.id);
      showToast('success', 'Return cancelled successfully');
      emit('return-cancelled', returnItem);
    } catch (error) {
      showToast('error', error.message || 'Failed to cancel return');
    }
  };

  // Lifecycle
  onMounted(() => {
    loadItemReturns();
  });

  watch(
    () => props.purchaseOrderId,
    () => {
      if (props.show) {
        loadItemReturns();
      }
    }
  );

  watch(
    () => props.show,
    (newValue) => {
      if (newValue) {
        loadItemReturns();
      }
    }
  );
</script>

<template>
  <dialog id="po_return_items_modal" class="modal" :open="show">
    <div class="modal-box bg-accentColor text-black/50 shadow-lg max-w-7xl">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="font-bold text-xl text-black">Item Returns Audit Trail</h3>
          <p class="text-sm text-black/60">
            {{
              props.purchaseOrderId
                ? `Purchase Order #${props.purchaseOrderId}`
                : 'All Purchase Orders'
            }}
          </p>
        </div>
        <button class="btn btn-ghost btn-sm" @click="onClose">✕</button>
      </div>

      <!-- Statistics -->
      <div
        class="stats shadow w-full mb-6 bg-white border border-black/10 stats-vertical lg:stats-horizontal"
      >
        <div class="stat">
          <div class="stat-figure">
            <Package class="w-6 h-6 text-primaryColor" />
          </div>
          <div class="stat-title text-black/50">Total Returns</div>
          <div class="stat-value text-primaryColor">
            {{ returnStats.total }}
          </div>
        </div>

        <div class="stat">
          <div class="stat-figure">
            <Clock class="w-6 h-6 text-warning" />
          </div>
          <div class="stat-title text-black/50">Pending</div>
          <div class="stat-value text-warning">{{ returnStats.pending }}</div>
        </div>

        <div class="stat">
          <div class="stat-figure">
            <CheckCircle class="w-6 h-6 text-success" />
          </div>
          <div class="stat-title text-black/50">Completed</div>
          <div class="stat-value text-success">{{ returnStats.completed }}</div>
        </div>

        <div class="stat">
          <div class="stat-figure">
            <DollarSign class="w-6 h-6 text-info" />
          </div>
          <div class="stat-title text-black/50">Total Value</div>
          <div class="stat-value text-info">
            ₱{{ returnStats.totalValue.toLocaleString() }}
          </div>
        </div>
      </div>

      <!-- Filters and Actions -->
      <div
        class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6"
      >
        <!-- Search and Filters -->
        <div class="flex flex-col sm:flex-row gap-3 flex-1">
          <!-- Search -->
          <div class="relative">
            <Search
              class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-black/50"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search returns..."
              class="input input-sm input-bordered bg-white border-primaryColor/30 text-black/70 pl-10 w-full"
            />
          </div>

          <!-- Status Filter -->
          <select
            v-model="statusFilter"
            class="select select-sm select-bordered bg-white border-primaryColor/30 text-black/70"
          >
            <option value="">All Statuses</option>
            <option
              v-for="status in uniqueStatuses"
              :key="status"
              :value="status"
            >
              {{ status }}
            </option>
          </select>

          <!-- Reason Filter -->
          <select
            v-model="reasonFilter"
            class="select select-sm select-bordered bg-white border-primaryColor/30 text-black/70"
          >
            <option value="">All Reasons</option>
            <option
              v-for="reason in uniqueReasons"
              :key="reason"
              :value="reason"
            >
              {{ reason }}
            </option>
          </select>

          <!-- Date Filter -->
          <input
            v-model="dateFilter"
            type="date"
            class="input input-sm input-bordered bg-white border-primaryColor/30 text-black/70"
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2">
          <button
            class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
            @click="clearFilters"
          >
            <RefreshCcw class="w-4 h-4 mr-1" />
            Clear
          </button>
          <button
            class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
            @click="exportToCSV"
          >
            <Download class="w-4 h-4 mr-1" />
            Export
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredReturns.length === 0" class="text-center py-8">
        <div class="mb-4">
          <Package class="w-16 h-16 mx-auto text-primaryColor/40" />
        </div>
        <h4 class="text-lg font-semibold mb-2 text-black">No Returns Found</h4>
        <p class="text-black/60">
          {{
            searchQuery || statusFilter || reasonFilter || dateFilter
              ? 'No returns match your current filters.'
              : 'No item returns have been logged yet.'
          }}
        </p>
      </div>

      <!-- Returns Table -->
      <div v-else class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr class="bg-primaryColor/10">
              <th class="text-black font-semibold">Return ID</th>
              <th class="text-black font-semibold">Item</th>
              <th class="text-black font-semibold">Quantity</th>
              <th class="text-black font-semibold">Reason</th>
              <th class="text-black font-semibold">Status</th>
              <th class="text-black font-semibold">Logged By</th>
              <th class="text-black font-semibold">Date</th>
              <th class="text-black font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="returnItem in paginatedReturns"
              :key="returnItem.id"
              class="hover:bg-base-200"
            >
              <td class="font-mono text-sm">#{{ returnItem.id }}</td>
              <td>
                <div class="font-medium">
                  {{ returnItem.item_name || 'N/A' }}
                </div>
                <div class="text-xs text-black/60">
                  PO: {{ returnItem.purchase_order_id }}
                </div>
              </td>
              <td class="font-medium">{{ returnItem.return_quantity }}</td>
              <td>
                <span :class="getReasonColor(returnItem.return_reason)">
                  {{ returnItem.return_reason }}
                </span>
              </td>
              <td>
                <span
                  class="badge badge-sm"
                  :class="getStatusColor(returnItem.status)"
                >
                  {{ returnItem.status }}
                </span>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <User class="w-4 h-4 text-black/50" />
                  <span class="text-sm">{{ returnItem.logged_by }}</span>
                </div>
              </td>
              <td>
                <div class="text-sm">
                  {{ formatDate(returnItem.created_at) }}
                </div>
                <div
                  v-if="returnItem.processed_at"
                  class="text-xs text-black/60"
                >
                  Processed: {{ formatDate(returnItem.processed_at) }}
                </div>
              </td>
              <td>
                <div class="dropdown dropdown-left">
                  <label tabindex="0" class="btn btn-ghost btn-xs"> ⋯ </label>
                  <ul
                    tabindex="0"
                    class="dropdown-content menu p-2 shadow bg-white rounded-box w-32 border border-black/10"
                  >
                    <li>
                      <a
                        @click="viewReturnDetails(returnItem)"
                        class="text-info"
                      >
                        <Eye class="w-4 h-4" />
                        View Details
                      </a>
                    </li>

                    <!-- Complete Return (Pending or Processed) -->
                    <li
                      v-if="
                        ['Pending', 'Processed'].includes(returnItem.status)
                      "
                    >
                      <a
                        @click="completeReturn(returnItem)"
                        class="text-success"
                      >
                        <CheckCircle class="w-4 h-4" />
                        Complete
                      </a>
                    </li>

                    <!-- Cancel Return (Pending only) -->
                    <li v-if="returnItem.status === 'Pending'">
                      <a @click="cancelReturn(returnItem)" class="text-error">
                        <AlertTriangle class="w-4 h-4" />
                        Cancel
                      </a>
                    </li>
                  </ul>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div
          v-if="totalPages > 1"
          class="flex justify-between items-center mt-6"
        >
          <div class="text-sm text-black/60">
            Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
            {{ Math.min(currentPage * itemsPerPage, filteredReturns.length) }}
            of {{ filteredReturns.length }} returns
          </div>

          <div class="join">
            <button
              class="join-item btn btn-sm"
              :disabled="currentPage <= 1"
              @click="currentPage--"
            >
              «
            </button>
            <button
              v-for="page in totalPages"
              :key="page"
              class="join-item btn btn-sm"
              :class="{ 'btn-active': currentPage === page }"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
            <button
              class="join-item btn btn-sm"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  </dialog>

  <!-- Toast Notification -->
  <div class="toast toast-end" v-if="toast.show">
    <div
      :class="{
        'alert alert-success': toast.type === 'success',
        'alert alert-error': toast.type === 'error',
      }"
    >
      <span>{{ toast.message }}</span>
    </div>
  </div>
</template>

<style scoped>
  .modal-box {
    max-height: 90vh;
    overflow-y: auto;
  }

  .table th {
    font-weight: 600;
    font-size: 0.875rem;
  }

  .table td {
    vertical-align: middle;
    padding: 0.75rem;
  }

  .badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }

  .dropdown-content {
    z-index: 1000;
  }

  .dropdown-content li a {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }

  .dropdown-content li a:hover {
    background-color: rgba(var(--primaryColor-rgb), 0.1);
  }

  @media (max-width: 768px) {
    .stats {
      grid-template-columns: repeat(2, 1fr);
    }

    .table {
      font-size: 0.75rem;
    }

    .table th,
    .table td {
      padding: 0.5rem 0.25rem;
    }
  }
</style>
