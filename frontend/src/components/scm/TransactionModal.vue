<script setup>
  import { ref, computed, watch, onMounted } from 'vue';
  import {
    X,
    Search,
    Filter,
    Calendar,
    Package,
    Minus,
    RefreshCcw,
    Download,
    HelpCircle,
    Trash,
    Handshake,
    ArrowRightLeft,
    Trash2,
  } from 'lucide-vue-next';
  import { useInventoryStore } from '../../stores/inventoryStore.js';

  // Props
  const props = defineProps({
    show: {
      type: Boolean,
      default: false,
    },
  });

  // Emits
  const emit = defineEmits(['close']);

  // Store
  const inventoryStore = useInventoryStore();

  // Local state
  const loading = ref(false);
  const transactions = ref([]);
  const currentPage = ref(1);
  const itemsPerPage = ref(10); // Changed to 10 per page
  const totalPages = ref(1);
  const totalTransactions = ref(0);

  // Filters
  const filters = ref({
    search: '',
    transaction_type: '',
    date_from: '',
    date_to: '',
    category_id: '',
    item_type_id: '',
  });

  // Available filter options
  const transactionTypes = [
    { value: '', label: 'All Types' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'consumption', label: 'Consumption' },
    { value: 'adjustment', label: 'Adjustment' },
    { value: 'return', label: 'Return' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'expiry', label: 'Expiry' },
    { value: 'damage', label: 'Damage' },
    { value: 'disposal', label: 'Disposal' },
  ];

  // Computed properties
  const categories = computed(() => inventoryStore.categories);
  const itemTypes = computed(() => inventoryStore.itemTypes);

  const filteredItemTypes = computed(() => {
    if (!filters.value.category_id) return [];
    return itemTypes.value.filter(
      (type) => type.category_id == filters.value.category_id
    );
  });

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

  const formatTransactionDate = (dateString) => {
    if (!dateString) return 'N/A';

    // Create dates in Philippine Time
    const date = new Date(dateString);
    const now = new Date();

    // Get Philippine timezone offset (UTC+8)
    const phOffset = 8 * 60; // 8 hours in minutes

    // Convert to Philippine time
    const datePh = new Date(date.getTime() + phOffset * 60 * 1000);
    const nowPh = new Date(now.getTime() + phOffset * 60 * 1000);

    // Compare dates (ignoring time)
    const datePhDate = new Date(
      datePh.getFullYear(),
      datePh.getMonth(),
      datePh.getDate()
    );
    const nowPhDate = new Date(
      nowPh.getFullYear(),
      nowPh.getMonth(),
      nowPh.getDate()
    );

    const diffTime = nowPhDate.getTime() - datePhDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return datePh.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTransactionTypeInfo = (type, adjustmentType = null) => {
    // For disposal adjustments, show as disposal instead of adjustment
    if (type === 'adjustment' && adjustmentType === 'disposal') {
      return {
        icon: Trash2,
        color: 'text-error',
        label: 'Disposed',
        bgColor: 'bg-error/10',
      };
    }

    const typeInfo = {
      receipt: {
        icon: Handshake,
        color: 'text-success',
        label: 'Received',
        bgColor: 'bg-success/10',
      },
      consumption: {
        icon: Minus,
        color: 'text-warning',
        label: 'Consumed',
        bgColor: 'bg-warning/10',
      },
      adjustment: {
        icon: RefreshCcw,
        color: 'text-info',
        label: 'Adjusted',
        bgColor: 'bg-info/10',
      },
      return: {
        icon: ArrowRightLeft,
        color: 'text-error',
        label: 'Returned',
        bgColor: 'bg-error/10',
      },
      transfer: {
        icon: ArrowRightLeft,
        color: 'text-primary',
        label: 'Transferred',
        bgColor: 'bg-primary/10',
      },
      expiry: {
        icon: Calendar,
        color: 'text-error',
        label: 'Expired',
        bgColor: 'bg-error/10',
      },
      damage: {
        icon: Minus,
        color: 'text-error',
        label: 'Damaged',
        bgColor: 'bg-error/10',
      },
      disposal: {
        icon: Trash,
        color: 'text-error',
        label: 'Disposed',
        bgColor: 'bg-error/10',
      },
    };
    return (
      typeInfo[type] || {
        icon: HelpCircle,
        color: 'text-neutral',
        label: type,
        bgColor: 'bg-neutral/10',
      }
    );
  };

  // Modal functions
  const closeModal = () => {
    const dlg = document.getElementById('transaction_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  watch(
    () => props.show,
    (newVal) => {
      const dlg = document.getElementById('transaction_modal');
      if (newVal) {
        if (dlg?.showModal) dlg.showModal();
        fetchTransactions();
      } else {
        if (dlg?.close) dlg.close();
      }
    }
  );

  // Fetch transactions
  const fetchTransactions = async () => {
    loading.value = true;
    try {
      const params = {
        page: currentPage.value,
        limit: itemsPerPage.value,
        ...filters.value,
      };

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (
          params[key] === '' ||
          params[key] === null ||
          params[key] === undefined
        ) {
          delete params[key];
        }
      });

      const response = await inventoryStore.fetchAllTransactions(params);
      transactions.value = response.data;
      totalTransactions.value = response.total;
      totalPages.value = Math.ceil(response.total / itemsPerPage.value);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      loading.value = false;
    }
  };

  // Filter functions
  const applyFilters = () => {
    currentPage.value = 1; // Reset to first page when filters are applied
    fetchTransactions();
  };

  const clearFilters = () => {
    filters.value = {
      search: '',
      transaction_type: '',
      date_from: '',
      date_to: '',
      category_id: '',
      item_type_id: '',
    };
    currentPage.value = 1; // Reset to first page when filters are cleared
    fetchTransactions();
  };

  // Pagination
  const goToPage = (page) => {
    currentPage.value = page;
    fetchTransactions();
  };

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++;
      fetchTransactions();
    }
  };

  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--;
      fetchTransactions();
    }
  };

  // Export function
  const exportTransactions = () => {
    // TODO: Implement export functionality
    console.log('Export transactions');
  };

  // Smart pagination helper (similar to RequestSupply)
  const getPageRange = () => {
    const current = currentPage.value;
    const total = totalPages.value;
    const range = [];

    // Show pages around current page
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== total) {
        range.push(i);
      }
    }

    return range;
  };

  // Lifecycle
  onMounted(() => {
    if (props.show) {
      fetchTransactions();
    }
  });

  // Auto-reset pagination when filters change
  watch(
    filters,
    () => {
      currentPage.value = 1;
    },
    { deep: true }
  );
</script>

<template>
  <dialog id="transaction_modal" class="modal">
    <div class="modal-box w-11/12 max-w-7xl max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-bold text-xl text-primaryColor">Transaction History</h3>
        <button @click="closeModal" class="btn btn-ghost btn-sm btn-circle">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Filters -->
      <div class="card bg-base-100 border border-gray-200 mb-6">
        <div class="card-body p-4">
          <div class="flex items-center gap-2 mb-4">
            <Filter class="w-4 h-4 text-primaryColor" />
            <h4 class="font-semibold text-primaryColor">Filters</h4>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Search -->
            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm font-medium">Search</span>
              </label>
              <div class="join w-full">
                <input
                  v-model="filters.search"
                  type="text"
                  placeholder="Search transactions..."
                  class="input input-bordered input-sm join-item w-full"
                  @keyup.enter="applyFilters"
                />
                <button
                  @click="applyFilters"
                  class="btn btn-sm join-item"
                  :disabled="loading"
                >
                  <Search class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Transaction Type -->
            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm font-medium"
                  >Transaction Type</span
                >
              </label>
              <select
                v-model="filters.transaction_type"
                class="select select-bordered select-sm w-full"
                @change="applyFilters"
              >
                <option
                  v-for="type in transactionTypes"
                  :key="type.value"
                  :value="type.value"
                >
                  {{ type.label }}
                </option>
              </select>
            </div>

            <!-- Category -->
            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm font-medium">Category</span>
              </label>
              <select
                v-model="filters.category_id"
                class="select select-bordered select-sm w-full"
                @change="applyFilters"
              >
                <option value="">All Categories</option>
                <option
                  v-for="category in categories"
                  :key="category.id"
                  :value="category.id"
                >
                  {{ category.name }}
                </option>
              </select>
            </div>

            <!-- Item Type -->
            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm font-medium">Item Type</span>
              </label>
              <select
                v-model="filters.item_type_id"
                class="select select-bordered select-sm w-full"
                @change="applyFilters"
                :disabled="!filters.category_id"
              >
                <option value="">All Item Types</option>
                <option
                  v-for="type in filteredItemTypes"
                  :key="type.id"
                  :value="type.id"
                >
                  {{ type.name }}
                </option>
              </select>
            </div>

            <!-- Date From -->
            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm font-medium">Date From</span>
              </label>
              <input
                v-model="filters.date_from"
                type="date"
                class="input input-bordered input-sm w-full"
                @change="applyFilters"
              />
            </div>

            <!-- Date To -->
            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm font-medium">Date To</span>
              </label>
              <input
                v-model="filters.date_to"
                type="date"
                class="input input-bordered input-sm w-full"
                @change="applyFilters"
              />
            </div>
          </div>

          <!-- Filter Actions -->
          <div class="flex justify-between items-center mt-4">
            <button
              @click="clearFilters"
              class="btn btn-outline btn-sm text-gray-600 hover:bg-gray-100"
              :disabled="loading"
            >
              Clear Filters
            </button>
            <button
              @click="exportTransactions"
              class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
              :disabled="loading"
            >
              <Download class="w-4 h-4 mr-1" />
              Export
            </button>
          </div>
        </div>
      </div>

      <!-- Transactions Table -->
      <div class="card bg-base-100 border border-gray-200">
        <div class="card-body p-0">
          <!-- Table Header -->
          <div
            class="flex justify-between items-center p-4 border-b border-gray-200"
          >
            <h4 class="font-semibold text-primaryColor">
              Transactions ({{ totalTransactions }})
            </h4>
            <button
              @click="fetchTransactions"
              class="btn btn-ghost btn-sm"
              :disabled="loading"
            >
              <RefreshCcw class="w-4 h-4" />
            </button>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-md"></span>
          </div>

          <!-- Empty State -->
          <div v-else-if="transactions.length === 0" class="text-center py-12">
            <Package class="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 class="text-lg font-medium text-gray-600 mb-2">
              No transactions found
            </h3>
            <p class="text-gray-500">Try adjusting your filters</p>
          </div>

          <!-- Transactions List -->
          <div v-else class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
                <tr class="bg-base-200">
                  <th class="text-sm font-medium">Type</th>
                  <th class="text-sm font-medium">Item</th>
                  <th class="text-sm font-medium">Category</th>
                  <th class="text-sm font-medium">Quantity</th>
                  <th class="text-sm font-medium">Value</th>
                  <th class="text-sm font-medium">Date</th>
                  <th class="text-sm font-medium">Performed By</th>
                  <th class="text-sm font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="transaction in transactions"
                  :key="transaction.id"
                  class="hover:bg-base-100"
                >
                  <!-- Transaction Type -->
                  <td>
                    <div class="flex items-center gap-2">
                      <component
                        :is="
                          getTransactionTypeInfo(
                            transaction.transaction_type,
                            transaction.adjustment_type
                          ).icon
                        "
                        class="w-4 h-4"
                      />
                      <span
                        class="badge badge-sm"
                        :class="
                          getTransactionTypeInfo(
                            transaction.transaction_type,
                            transaction.adjustment_type
                          ).bgColor
                        "
                      >
                        {{
                          getTransactionTypeInfo(
                            transaction.transaction_type,
                            transaction.adjustment_type
                          ).label
                        }}
                      </span>
                    </div>
                  </td>

                  <!-- Item Name -->
                  <td>
                    <div>
                      <div class="font-medium text-sm">
                        {{
                          transaction.item_name || transaction.item_type_name
                        }}
                      </div>
                      <div
                        v-if="transaction.batch_number"
                        class="text-xs text-gray-500 font-mono"
                      >
                        {{ transaction.batch_number }}
                      </div>
                    </div>
                  </td>

                  <!-- Category -->
                  <td>
                    <span class="text-sm text-gray-600">
                      {{ transaction.category_name }}
                    </span>
                  </td>

                  <!-- Quantity -->
                  <td>
                    <div class="text-sm">
                      <span class="font-medium">
                        {{ parseFloat(transaction.quantity).toLocaleString() }}
                      </span>
                      <span class="text-gray-500">
                        {{ transaction.unit_of_measure }}
                      </span>
                    </div>
                  </td>

                  <!-- Value -->
                  <td>
                    <div class="text-sm">
                      <span class="font-medium">
                        ₱{{
                          parseFloat(transaction.total_value).toLocaleString()
                        }}
                      </span>
                      <div
                        v-if="transaction.disposal_cost"
                        class="text-xs text-error mt-1"
                      >
                        Disposal Cost: ₱{{
                          parseFloat(transaction.disposal_cost).toLocaleString()
                        }}
                      </div>
                    </div>
                  </td>

                  <!-- Date -->
                  <td>
                    <div class="text-sm">
                      <div class="font-medium">
                        {{ formatDate(transaction.transaction_date) }}
                      </div>
                      <div class="text-gray-500">
                        {{
                          formatTransactionDate(transaction.transaction_date)
                        }}
                      </div>
                    </div>
                  </td>

                  <!-- Performed By -->
                  <td>
                    <span class="text-sm text-gray-600">
                      {{ transaction.performed_by }}
                    </span>
                  </td>

                  <!-- Reference -->
                  <td>
                    <div class="text-sm">
                      <div
                        v-if="transaction.reference_number"
                        class="font-mono text-xs bg-gray-100 px-2 py-1 rounded"
                      >
                        {{ transaction.reference_number }}
                      </div>
                      <div
                        v-if="transaction.reason"
                        class="text-xs text-gray-500 mt-1"
                      >
                        {{ transaction.reason }}
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Enhanced Pagination with Date Context -->
          <div
            class="flex flex-col sm:flex-row justify-between items-center mt-4"
            v-if="totalPages > 1"
          >
            <div class="text-sm text-black/60 mb-2 sm:mb-0">
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
              {{ Math.min(currentPage * itemsPerPage, totalTransactions) }}
              of {{ totalTransactions }} transactions
            </div>

            <div class="join space-x-1">
              <button
                class="join-item btn font-thin !bg-gray-200 text-black/50 btn-sm border border-none hover:bg-gray-300"
                :disabled="currentPage <= 1"
                @click="prevPage"
              >
                « Prev
              </button>

              <!-- First page -->
              <button
                v-if="totalPages > 1"
                class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
                :class="{
                  'btn-active': currentPage === 1,
                  '!bg-primaryColor text-white': currentPage === 1,
                }"
                @click="goToPage(1)"
              >
                1
              </button>

              <!-- Ellipsis before current page group -->
              <button
                v-if="currentPage > 4"
                class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
                disabled
              >
                ...
              </button>

              <!-- Current page group -->
              <button
                v-for="page in getPageRange()"
                :key="page"
                class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
                :class="{
                  'btn-active': currentPage === page,
                  '!bg-primaryColor text-white': currentPage === page,
                }"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>

              <!-- Ellipsis after current page group -->
              <button
                v-if="currentPage < totalPages - 3"
                class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
                disabled
              >
                ...
              </button>

              <!-- Last page -->
              <button
                v-if="totalPages > 1 && currentPage < totalPages"
                class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
                :class="{
                  'btn-active': currentPage === totalPages,
                  '!bg-primaryColor text-white': currentPage === totalPages,
                }"
                @click="goToPage(totalPages)"
              >
                {{ totalPages }}
              </button>

              <button
                class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
                :disabled="currentPage >= totalPages"
                @click="nextPage"
              >
                Next »
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Actions -->
      <div class="modal-action mt-6">
        <button
          @click="closeModal"
          class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none"
        >
          Close
        </button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
  .modal-box {
    max-height: 90vh;
    overflow-y: auto;
  }

  .table th {
    background-color: #f8f9fa;
    font-weight: 600;
    color: #374151;
  }

  .badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }
</style>
