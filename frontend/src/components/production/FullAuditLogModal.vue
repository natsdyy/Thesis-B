<script setup>
  import { ref, computed, watch, onMounted } from 'vue';
  import {
    X,
    Search,
    Filter,
    Calendar,
    Activity,
    RefreshCcw,
    Download,
    HelpCircle,
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
  const emit = defineEmits(['update:show', 'close']);

  // Store
  const productionStore = useProductionStore();

  // Local state
  const loading = ref(false);
  const auditLogs = ref([]);
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const totalPages = ref(1);
  const totalAuditLogs = ref(0);

  // Filters
  const filters = ref({
    search: '',
    action_type: '',
    user_name: '',
    date_from: '',
    date_to: '',
    menu_item_name: '',
  });

  // Action types for filter
  const actionTypes = [
    { value: '', label: 'All Actions' },
    { value: 'PLANNED', label: 'Planned' },
    { value: 'STARTED', label: 'Started' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'CREATED', label: 'Created' },
    { value: 'UPDATED', label: 'Updated' },
    { value: 'DELETED', label: 'Deleted' },
  ];

  // Computed properties
  const show = computed(() => props.show);

  const paginatedAuditLogs = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const filtered = filteredAuditLogs.value;
    return filtered.slice(start, start + itemsPerPage.value);
  });

  const filteredAuditLogs = computed(() => {
    let filtered = [...auditLogs.value];

    if (filters.value.search) {
      const searchTerm = filters.value.search.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          (log.menu_item_name || '').toLowerCase().includes(searchTerm) ||
          (log.sample_batch_number || '').toLowerCase().includes(searchTerm) ||
          (log.user_name || '').toLowerCase().includes(searchTerm) ||
          (log.notes || '').toLowerCase().includes(searchTerm)
      );
    }

    if (filters.value.action_type) {
      filtered = filtered.filter(
        (log) =>
          getDisplayAction(log).toLowerCase() ===
          filters.value.action_type.toLowerCase()
      );
    }

    if (filters.value.user_name) {
      filtered = filtered.filter((log) =>
        (log.user_name || '')
          .toLowerCase()
          .includes(filters.value.user_name.toLowerCase())
      );
    }

    if (filters.value.menu_item_name) {
      filtered = filtered.filter((log) =>
        (log.menu_item_name || '')
          .toLowerCase()
          .includes(filters.value.menu_item_name.toLowerCase())
      );
    }

    if (filters.value.date_from) {
      const fromDate = new Date(filters.value.date_from);
      filtered = filtered.filter((log) => new Date(log.created_at) >= fromDate);
    }

    if (filters.value.date_to) {
      const toDate = new Date(filters.value.date_to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => new Date(log.created_at) <= toDate);
    }

    totalAuditLogs.value = filtered.length;
    totalPages.value = Math.ceil(filtered.length / itemsPerPage.value);

    return filtered;
  });

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Helper functions from original component
  const normalizeActionType = (actionType) => {
    if (!actionType) return 'UNKNOWN';
    const upper = String(actionType).toUpperCase();
    if (upper.startsWith('SAMPLE_')) {
      return upper.replace('SAMPLE_', '');
    }
    return upper;
  };

  const allowedActions = new Set([
    'PLANNED',
    'STARTED',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'ARCHIVED',
    'DELETED',
    'CREATED',
    'UPDATED',
  ]);

  const actionFromStatus = (status) => {
    if (!status) return undefined;
    const map = {
      Planned: 'PLANNED',
      'In Progress': 'STARTED',
      Completed: 'COMPLETED',
      Failed: 'FAILED',
      Cancelled: 'CANCELLED',
    };
    return map[status];
  };

  const getDisplayAction = (log) => {
    const normalized = normalizeActionType(log?.action_type);
    const fromStatus = actionFromStatus(log?.action_details?.new_status);
    // Prefer status-derived action if present and differs from provided action
    if (fromStatus && fromStatus !== normalized) return fromStatus;
    // If provided action is unknown, fall back to status-derived value
    if (!allowedActions.has(normalized)) {
      const text =
        `${log?.action_details?.reason || ''} ${log?.notes || ''}`.toLowerCase();
      if (text.includes('cancel')) return 'CANCELLED';
      if (text.includes('archive')) return 'ARCHIVED';
      if (text.includes('delete')) return 'DELETED';
      return fromStatus || normalized || 'UNKNOWN';
    }
    return normalized;
  };

  const formatActionType = (actionType) => {
    return actionType || 'UNKNOWN';
  };

  const getActionBadgeClass = (actionType) => {
    const t = normalizeActionType(actionType);
    const classMap = {
      PLANNED: 'badge-xs border-none font-medium bg-info/20 text-info',
      STARTED: 'badge-xs border-none font-medium bg-warning/20 text-warning',
      COMPLETED: 'badge-xs border-none font-medium bg-success/20 text-success',
      FAILED: 'badge-xs border-none font-medium bg-error/20 text-error',
      CANCELLED:
        'badge-xs border-none font-medium bg-gray-500/20 text-gray-500',
      ARCHIVED:
        'badge-xs border-none font-medium bg-orange-500/20 text-orange-500',
      DELETED:
        'badge-xs border-none font-medium bg-orange-500/20 text-orange-500',
      CREATED: 'badge-xs border-none font-medium bg-primary/20 text-primary',
      UPDATED:
        'badge-xs border-none font-medium bg-secondary/20 text-secondary',
    };
    return (
      classMap[t] ||
      'badge-xs border-none font-medium bg-neutral/20 text-neutral'
    );
  };

  const getDetailsText = (log) => {
    const d = log?.action_details || {};
    const reason =
      d.failure_reason ||
      d.reason ||
      d.cancel_reason ||
      d.complete_reason ||
      d.start_reason;
    const note = log?.notes || d.production_notes || d.notes;
    const parts = [];
    if (reason) parts.push(`Reason: ${reason}`);
    if (note) parts.push(`Notes: ${note}`);
    return parts.length ? parts.join(' • ') : '—';
  };

  // Modal functions
  const closeModal = () => {
    emit('update:show', false);
    emit('close');
  };

  watch(
    () => props.show,
    (newVal) => {
      if (newVal) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          fetchAuditLogs();
        }, 10);
      }
    },
    { immediate: true }
  );

  // Fetch audit logs
  const fetchAuditLogs = async () => {
    loading.value = true;
    try {
      const logs = await productionStore.fetchSampleProductionAuditLogs();
      auditLogs.value = logs;
      totalAuditLogs.value = logs.length;
      totalPages.value = Math.ceil(logs.length / itemsPerPage.value);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      loading.value = false;
    }
  };

  // Filter functions
  const applyFilters = () => {
    currentPage.value = 1;
  };

  const clearFilters = () => {
    filters.value = {
      search: '',
      action_type: '',
      user_name: '',
      date_from: '',
      date_to: '',
      menu_item_name: '',
    };
    currentPage.value = 1;
  };

  // Pagination
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
    }
  };

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++;
    }
  };

  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--;
    }
  };

  // Export function
  const exportAuditLogs = () => {
    console.log('Export audit logs');
  };

  // Smart pagination helper
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
      fetchAuditLogs();
    }
  });
</script>

<template>
  <div v-if="show" class="modal modal-open" @click="closeModal">
    <div
      class="modal-box w-11/12 max-w-7xl max-h-[90vh] overflow-y-auto"
      @click.stop
    >
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-bold text-xl text-primaryColor">
          Sample Production Audit Log
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
                  placeholder="Search audit logs..."
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

            <!-- User Name -->
            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm font-medium">User</span>
              </label>
              <input
                v-model="filters.user_name"
                type="text"
                placeholder="Filter by user..."
                class="input input-bordered input-sm w-full"
                @keyup.enter="applyFilters"
              />
            </div>

            <!-- Menu Item -->
            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm font-medium">Menu Item</span>
              </label>
              <input
                v-model="filters.menu_item_name"
                type="text"
                placeholder="Filter by menu item..."
                class="input input-bordered input-sm w-full"
                @keyup.enter="applyFilters"
              />
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
              @click="exportAuditLogs"
              class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
              :disabled="loading"
            >
              <Download class="w-4 h-4 mr-1" />
              Export
            </button>
          </div>
        </div>
      </div>

      <!-- Audit Logs Table -->
      <div class="card bg-base-100 border border-gray-200">
        <div class="card-body p-0">
          <!-- Table Header -->
          <div
            class="flex justify-between items-center p-4 border-b border-gray-200"
          >
            <h4 class="font-semibold text-primaryColor">
              Audit Logs ({{ totalAuditLogs }})
            </h4>
            <button
              @click="fetchAuditLogs"
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
          <div
            v-else-if="filteredAuditLogs.length === 0"
            class="text-center py-12"
          >
            <Activity class="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 class="text-lg font-medium text-gray-600 mb-2">
              No audit logs found
            </h3>
            <p class="text-gray-500">Try adjusting your filters</p>
          </div>

          <!-- Audit Logs Table -->
          <div v-else class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
                <tr class="bg-base-200">
                  <th class="text-sm font-medium">Date & Time</th>
                  <th class="text-sm font-medium">Action</th>
                  <th class="text-sm font-medium">Menu Item</th>
                  <th class="text-sm font-medium">Batch</th>
                  <th class="text-sm font-medium">User</th>
                  <th class="text-sm font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in paginatedAuditLogs" :key="log.id">
                  <td class="text-xs">
                    <div class="flex flex-col">
                      <span class="font-medium">{{
                        formatDate(log.created_at)
                      }}</span>
                      <span class="text-gray-500">{{
                        new Date(log.created_at).toLocaleTimeString('en-PH')
                      }}</span>
                    </div>
                  </td>
                  <td>
                    <div
                      class="badge badge-sm"
                      :class="getActionBadgeClass(getDisplayAction(log))"
                    >
                      {{ formatActionType(getDisplayAction(log)) }}
                    </div>
                  </td>
                  <td class="text-xs">{{ log.menu_item_name || 'N/A' }}</td>
                  <td class="text-xs">
                    <span
                      class="font-mono bg-gray-100 px-2 py-1 rounded text-xs"
                    >
                      {{ log.sample_batch_number || 'N/A' }}
                    </span>
                  </td>
                  <td class="text-xs">{{ log.user_name || 'System' }}</td>
                  <td class="text-xs max-w-xs">
                    <div class="truncate">{{ getDetailsText(log) }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div
            v-if="filteredAuditLogs.length > 0 && totalPages > 1"
            class="flex flex-col sm:flex-row justify-between items-center p-4 border-t border-gray-200"
          >
            <div class="text-sm text-gray-600 mb-2 sm:mb-0">
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
              {{
                Math.min(currentPage * itemsPerPage, filteredAuditLogs.length)
              }}
              of {{ filteredAuditLogs.length }} audit logs
            </div>
            <div class="join">
              <button
                class="join-item btn btn-sm"
                :disabled="currentPage <= 1"
                @click="prevPage"
              >
                « Prev
              </button>
              <button
                v-if="totalPages > 1"
                class="join-item btn btn-sm"
                :class="{ 'btn-active': currentPage === 1 }"
                @click="goToPage(1)"
              >
                1
              </button>
              <button
                v-for="page in getPageRange()"
                :key="page"
                class="join-item btn btn-sm"
                :class="{ 'btn-active': currentPage === page }"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>
              <button
                v-if="totalPages > 1"
                class="join-item btn btn-sm"
                :class="{ 'btn-active': currentPage === totalPages }"
                @click="goToPage(totalPages)"
              >
                {{ totalPages }}
              </button>
              <button
                class="join-item btn btn-sm"
                :disabled="currentPage >= totalPages"
                @click="nextPage"
              >
                Next »
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
