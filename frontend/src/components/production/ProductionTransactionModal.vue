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
    Plus,
    Edit,
    Activity,
    CheckCircle,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';

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
  const productionStore = useProductionStore();

  // Local state
  const loading = ref(false);
  const transactions = ref([]);
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const totalPages = ref(1);
  const totalTransactions = ref(0);

  // Filters
  const filters = ref({
    search: '',
    action_type: '',
    date_from: '',
    date_to: '',
    menu_item_id: '',
  });

  // Available filter options
  const actionTypes = [
    { value: '', label: 'All Types' },
    { value: 'CREATED', label: 'Created' },
    { value: 'UPDATED', label: 'Updated' },
    { value: 'INVENTORY_UPDATED', label: 'Stock Updated' },
    { value: 'SAMPLE_PLANNED', label: 'Sample Planned' },
    { value: 'SAMPLE_STARTED', label: 'Sample Started' },
    { value: 'SAMPLE_COMPLETED', label: 'Sample Completed' },
    { value: 'QUALITY_INSPECTION', label: 'Quality Inspection' },
    { value: 'QUALITY_PASSED', label: 'Quality Passed' },
    { value: 'QUALITY_FAILED', label: 'Quality Failed' },
    { value: 'APPROVED_FOR_PRODUCTION', label: 'Approved for Production' },
    { value: 'ADDED_TO_INVENTORY', label: 'Added to Inventory' },
    { value: 'DELETED', label: 'Deleted' },
  ];

  // Computed properties
  const menuItems = computed(() => productionStore.productionInventory || []);

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

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getActionTypeInfo = (actionType) => {
    const typeInfo = {
      CREATED: {
        icon: Plus,
        color: 'text-success',
        label: 'Created',
        bgColor: 'bg-success/10',
        badgeColor: 'bg-success/20 text-success',
        description: 'New item was created',
      },
      UPDATED: {
        icon: Edit,
        color: 'text-warning',
        label: 'Updated',
        bgColor: 'bg-warning/10',
        badgeColor: 'bg-warning/20 text-warning',
        description: 'Item details were updated',
      },
      INVENTORY_UPDATED: {
        icon: RefreshCcw,
        color: 'text-info',
        label: 'Stock Updated',
        bgColor: 'bg-info/10',
        badgeColor: 'bg-info/20 text-info',
        description: 'Inventory quantity was updated',
      },
      SAMPLE_PLANNED: {
        icon: Calendar,
        color: 'text-primary',
        label: 'Sample Planned',
        bgColor: 'bg-primary/10',
        badgeColor: 'bg-primary/20 text-primary',
        description: 'Sample production was planned',
      },
      SAMPLE_STARTED: {
        icon: Activity,
        color: 'text-warning',
        label: 'Sample Started',
        bgColor: 'bg-warning/10',
        badgeColor: 'bg-warning/20 text-warning',
        description: 'Sample production was started',
      },
      SAMPLE_COMPLETED: {
        icon: CheckCircle,
        color: 'text-success',
        label: 'Sample Completed',
        bgColor: 'bg-success/10',
        badgeColor: 'bg-success/20 text-success',
        description: 'Sample production was completed',
      },
      QUALITY_INSPECTION: {
        icon: Search,
        color: 'text-info',
        label: 'Quality Inspection',
        bgColor: 'bg-info/10',
        badgeColor: 'bg-info/20 text-info',
        description: 'Quality inspection was performed',
      },
      QUALITY_PASSED: {
        icon: CheckCircle,
        color: 'text-success',
        label: 'Quality Passed',
        bgColor: 'bg-success/10',
        badgeColor: 'bg-success/20 text-success',
        description: 'Item passed quality inspection',
      },
      QUALITY_FAILED: {
        icon: X,
        color: 'text-error',
        label: 'Quality Failed',
        bgColor: 'bg-error/10',
        badgeColor: 'bg-error/20 text-error',
        description: 'Item failed quality inspection',
      },
      APPROVED_FOR_PRODUCTION: {
        icon: CheckCircle,
        color: 'text-success',
        label: 'Approved',
        bgColor: 'bg-success/10',
        badgeColor: 'bg-success/20 text-success',
        description: 'Item approved for production',
      },
      ADDED_TO_INVENTORY: {
        icon: Package,
        color: 'text-success',
        label: 'Added to Inventory',
        bgColor: 'bg-success/10',
        badgeColor: 'bg-success/20 text-success',
        description: 'Item added to production inventory',
      },
      DELETED: {
        icon: Trash,
        color: 'text-error',
        label: 'Deleted',
        bgColor: 'bg-error/10',
        badgeColor: 'bg-error/20 text-error',
        description: 'Item was deleted',
      },
    };
    return (
      typeInfo[actionType] || {
        icon: Activity,
        color: 'text-neutral',
        label: actionType,
        bgColor: 'bg-neutral/10',
        badgeColor: 'bg-gray-100 text-gray-600',
        description: 'Activity information',
      }
    );
  };

  const getFormattedNotes = (transaction) => {
    // Helper function to parse and format JSON data
    const parseAndFormatData = (dataString) => {
      try {
        const details = JSON.parse(dataString);

        // Handle nested structure: {"basic_notes": {...}, "adjustment_details": {...}}
        const basicNotes = details.basic_notes || details;

        // If there's a user note in the details, show that
        if (basicNotes.notes && basicNotes.notes.trim()) {
          return basicNotes.notes;
        }

        // Format based on adjustment type and reason
        const adjustmentType = basicNotes.adjustment_type;
        const reason = basicNotes.reason;
        const quantityChange = basicNotes.quantity_change;

        // Create user-friendly descriptions
        const reasonMap = {
          physical_inventory: 'Physical inventory count',
          transfer_in: 'Stock transfer received',
          transfer_out: 'Stock transfer sent',
          damage: 'Damaged goods adjustment',
          theft: 'Theft/loss adjustment',
          production: 'Production completion',
          waste: 'Production waste',
          other: 'Manual adjustment',
        };

        const typeMap = {
          physical_count: 'Physical count',
          transfer_in: 'Transfer received',
          transfer_out: 'Transfer sent',
          damage: 'Damage adjustment',
          theft: 'Loss adjustment',
          production: 'Production',
          waste: 'Waste',
          other: 'Manual adjustment',
        };

        // Return the most descriptive reason
        if (reason && reasonMap[reason]) {
          return reasonMap[reason];
        }

        if (adjustmentType && typeMap[adjustmentType]) {
          return typeMap[adjustmentType];
        }

        // For simple data structure, provide more descriptive reason based on quantity change
        if (quantityChange > 0) {
          return 'Stock increase';
        } else if (quantityChange < 0) {
          return 'Stock decrease';
        }

        return null; // Couldn't format this data
      } catch (error) {
        return null; // Not valid JSON
      }
    };

    // Check if notes field contains JSON data
    if (transaction.notes && transaction.notes.trim()) {
      // If notes looks like JSON, try to parse and format it
      if (
        transaction.notes.trim().startsWith('{') ||
        transaction.notes.trim().startsWith('[')
      ) {
        const formatted = parseAndFormatData(transaction.notes);
        if (formatted) {
          return formatted;
        }
      }
      // If it's not JSON or couldn't be formatted, return as-is (user note)
      return transaction.notes;
    }

    // Parse action_details for more information
    if (transaction.action_details) {
      const formatted = parseAndFormatData(transaction.action_details);
      if (formatted) {
        return formatted;
      }
    }

    // Fallback to generic description
    return 'Transaction recorded';
  };

  const getFormattedDetails = (transaction) => {
    // Try to get data from action_details first
    let dataToFormat = null;

    if (transaction.action_details) {
      try {
        dataToFormat = JSON.parse(transaction.action_details);
      } catch (error) {
        console.error('Error parsing action_details:', error);
      }
    }

    // If no action_details, try notes field
    if (!dataToFormat && transaction.notes) {
      try {
        if (
          transaction.notes.trim().startsWith('{') ||
          transaction.notes.trim().startsWith('[')
        ) {
          dataToFormat = JSON.parse(transaction.notes);
        }
      } catch (error) {
        console.error('Error parsing notes:', error);
      }
    }

    if (!dataToFormat) {
      return null;
    }

    // Handle nested structure
    const basicNotes = dataToFormat.basic_notes || dataToFormat;

    // Create formatted details object
    const formattedDetails = {};

    // Quantity information
    if (
      basicNotes.old_quantity !== undefined ||
      basicNotes.previous_quantity !== undefined
    ) {
      const oldQty = basicNotes.old_quantity || basicNotes.previous_quantity;
      const newQty = basicNotes.new_quantity;
      const change = basicNotes.quantity_change;

      formattedDetails['Quantity Change'] =
        `${oldQty} → ${newQty} (${change > 0 ? '+' : ''}${change})`;
    }

    // Adjustment information
    if (basicNotes.adjustment_type) {
      const typeMap = {
        physical_count: 'Physical Count',
        transfer_in: 'Transfer Received',
        transfer_out: 'Transfer Sent',
        damage: 'Damage Adjustment',
        theft: 'Loss Adjustment',
        production: 'Production',
        waste: 'Waste',
        other: 'Manual Adjustment',
      };
      formattedDetails['Adjustment Type'] =
        typeMap[basicNotes.adjustment_type] || basicNotes.adjustment_type;
    }

    if (basicNotes.adjustment_category) {
      formattedDetails['Category'] = basicNotes.adjustment_category;
    }

    if (basicNotes.reason) {
      const reasonMap = {
        physical_inventory: 'Physical Inventory',
        transfer_in: 'Stock Transfer Received',
        transfer_out: 'Stock Transfer Sent',
        damage: 'Damaged Goods',
        theft: 'Theft/Loss',
        production: 'Production',
        waste: 'Production Waste',
        other: 'Other',
      };
      formattedDetails['Reason'] =
        reasonMap[basicNotes.reason] || basicNotes.reason;
    }

    // Cost information
    if (basicNotes.unit_cost) {
      formattedDetails['Unit Cost'] =
        `$${parseFloat(basicNotes.unit_cost).toFixed(2)}`;
    }

    if (basicNotes.cost_impact !== undefined) {
      const impact = parseFloat(basicNotes.cost_impact);
      const impactType =
        basicNotes.cost_impact_type ||
        (impact > 0 ? 'positive' : impact < 0 ? 'negative' : 'neutral');
      formattedDetails['Cost Impact'] =
        `$${Math.abs(impact).toFixed(2)} (${impactType})`;
    }

    if (basicNotes.revenue_impact !== undefined) {
      formattedDetails['Revenue Impact'] =
        `$${parseFloat(basicNotes.revenue_impact).toFixed(2)}`;
    }

    // Personnel information
    if (basicNotes.counted_by) {
      formattedDetails['Counted By'] = basicNotes.counted_by;
    }

    if (basicNotes.verified_by) {
      formattedDetails['Verified By'] = basicNotes.verified_by;
    }

    // Reference information
    if (basicNotes.reference_number) {
      formattedDetails['Reference Number'] = basicNotes.reference_number;
    }

    if (basicNotes.physical_count_date) {
      formattedDetails['Count Date'] = new Date(
        basicNotes.physical_count_date
      ).toLocaleDateString();
    }

    // Approval information
    if (basicNotes.requires_approval !== undefined) {
      formattedDetails['Approval Required'] = basicNotes.requires_approval
        ? 'Yes'
        : 'No';
    }

    // Percentage information
    if (basicNotes.change_percentage !== undefined) {
      formattedDetails['Change %'] =
        `${parseFloat(basicNotes.change_percentage).toFixed(1)}%`;
    }

    if (basicNotes.cost_impact_percentage !== undefined) {
      formattedDetails['Cost Impact %'] =
        `${parseFloat(basicNotes.cost_impact_percentage).toFixed(1)}%`;
    }

    // Inventory ID
    if (basicNotes.production_inventory_id) {
      formattedDetails['Inventory ID'] = basicNotes.production_inventory_id;
    }

    return formattedDetails;
  };

  // Modal functions
  const closeModal = () => {
    const dlg = document.getElementById('production_transaction_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  watch(
    () => props.show,
    (newVal) => {
      const dlg = document.getElementById('production_transaction_modal');
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

      const response = await productionStore.fetchAllTransactions(params);
      transactions.value = response.data;
      totalTransactions.value = response.total;
      totalPages.value = response.totalPages;
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      loading.value = false;
    }
  };

  // Filter functions
  const applyFilters = () => {
    currentPage.value = 1;
    fetchTransactions();
  };

  const clearFilters = () => {
    filters.value = {
      search: '',
      action_type: '',
      date_from: '',
      date_to: '',
      menu_item_id: '',
    };
    currentPage.value = 1;
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

  // Smart pagination helper
  const getPageRange = () => {
    const current = currentPage.value;
    const total = totalPages.value;
    const range = [];

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
  <dialog id="production_transaction_modal" class="modal">
    <div class="modal-box w-11/12 max-w-7xl max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-bold text-xl text-primaryColor">
          Production Inventory Transaction History
        </h3>
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

            <!-- Action Type -->
            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm font-medium">Action Type</span>
              </label>
              <select
                v-model="filters.action_type"
                class="select select-bordered select-sm w-full"
                @change="applyFilters"
              >
                <option
                  v-for="type in actionTypes"
                  :key="type.value"
                  :value="type.value"
                >
                  {{ type.label }}
                </option>
              </select>
            </div>

            <!-- Menu Item -->
            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm font-medium">Menu Item</span>
              </label>
              <select
                v-model="filters.menu_item_id"
                class="select select-bordered select-sm w-full"
                @change="applyFilters"
              >
                <option value="">All Menu Items</option>
                <option
                  v-for="item in menuItems"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.item_name }}
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
                  <th class="text-sm font-medium">Quantity Change</th>
                  <th class="text-sm font-medium">Date</th>
                  <th class="text-sm font-medium">Performed By</th>
                  <th class="text-sm font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="transaction in transactions"
                  :key="transaction.id"
                  class="hover:bg-base-100"
                >
                  <!-- Action Type -->
                  <td>
                    <div class="flex items-center gap-2">
                      <component
                        :is="getActionTypeInfo(transaction.action_type).icon"
                        class="w-4 h-4"
                      />
                      <span
                        class="badge badge-sm border-none font-medium"
                        :class="
                          getActionTypeInfo(transaction.action_type).badgeColor
                        "
                      >
                        {{ getActionTypeInfo(transaction.action_type).label }}
                      </span>
                    </div>
                  </td>

                  <!-- Item Name -->
                  <td>
                    <div>
                      <div class="font-medium text-sm">
                        {{ transaction.item_name }}
                      </div>
                      <div class="text-xs text-gray-500">
                        ID: {{ transaction.menu_item_id }}
                      </div>
                    </div>
                  </td>

                  <!-- Quantity Change -->
                  <td>
                    <div class="text-sm">
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500">
                          {{ transaction.old_quantity || 0 }} →
                        </span>
                        <span class="font-medium">
                          {{ transaction.new_quantity || 0 }}
                        </span>
                      </div>
                      <div
                        class="text-xs font-medium"
                        :class="{
                          'text-success': transaction.quantity_change > 0,
                          'text-error': transaction.quantity_change < 0,
                          'text-gray-500': transaction.quantity_change === 0,
                        }"
                      >
                        {{ transaction.quantity_change > 0 ? '+' : ''
                        }}{{ transaction.quantity_change || 0 }}
                      </div>
                    </div>
                  </td>

                  <!-- Date -->
                  <td>
                    <div class="text-sm">
                      <div class="font-medium">
                        {{ formatDate(transaction.created_at) }}
                      </div>
                      <div class="text-gray-500">
                        {{ formatTransactionDate(transaction.created_at) }}
                      </div>
                    </div>
                  </td>

                  <!-- Performed By -->
                  <td>
                    <span class="text-sm text-gray-600">
                      {{ transaction.performed_by }}
                    </span>
                  </td>

                  <!-- Notes -->
                  <td>
                    <div class="text-sm">
                      <div class="text-gray-600">
                        {{ getFormattedNotes(transaction) }}
                      </div>
                      <div
                        v-if="
                          transaction.action_details ||
                          (transaction.notes &&
                            (transaction.notes.trim().startsWith('{') ||
                              transaction.notes.trim().startsWith('[')))
                        "
                        class="text-xs text-gray-500 mt-1"
                      >
                        <details class="collapse collapse-arrow">
                          <summary class="collapse-title text-xs p-0 min-h-0">
                            View Details
                          </summary>
                          <div class="collapse-content p-0 mt-2">
                            <div
                              v-if="getFormattedDetails(transaction)"
                              class="bg-gray-50 p-3 rounded-lg"
                            >
                              <div
                                v-for="(value, key) in getFormattedDetails(
                                  transaction
                                )"
                                :key="key"
                                class="flex justify-between items-center py-1 text-xs"
                              >
                                <span class="font-medium text-gray-700"
                                  >{{ key }}:</span
                                >
                                <span class="text-gray-600">{{ value }}</span>
                              </div>
                            </div>
                            <div v-else class="text-xs text-gray-500 italic">
                              No additional details available
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Enhanced Pagination -->
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
