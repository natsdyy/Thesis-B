<script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { Activity, Calendar, X } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';

  // Props
  const props = defineProps({
    show: {
      type: Boolean,
      default: false,
    },
  });

  // Emits
  const emit = defineEmits(['update:show']);

  // Store
  const productionStore = useProductionStore();

  // State
  const auditLogs = ref([]);
  const loading = ref(false);

  // Pagination
  const auditLogCurrentPage = ref(1);
  const auditLogItemsPerPage = ref(10);

  // Date filtering
  const auditLogFilterType = ref('today');
  const showAuditLogCustomMonthPicker = ref(false);
  const auditLogCustomMonthPicker = ref({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // Filter options
  const auditLogFilterOptions = ref([
    { type: 'today', label: 'Today', count: 0 },
    { type: 'week', label: 'This Week', count: 0 },
    { type: 'month', label: 'This Month', count: 0 },
  ]);

  // Month options for custom picker
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  // Computed properties
  const filteredAuditLogsByDate = computed(() => {
    let filtered = [...auditLogs.value];

    if (auditLogFilterType.value) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (auditLogFilterType.value) {
        case 'today':
          filtered = filtered.filter((log) => {
            const logDate = new Date(log.created_at);
            logDate.setHours(0, 0, 0, 0);
            return logDate.getTime() === today.getTime();
          });
          break;
        case 'week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay() + 1);
          const endOfWeek = new Date(today);
          endOfWeek.setHours(23, 59, 59, 999);
          filtered = filtered.filter((log) => {
            const logDate = new Date(log.created_at);
            return logDate >= startOfWeek && logDate <= endOfWeek;
          });
          break;
        case 'month':
          const startOfMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );
          const endOfMonth = new Date(today);
          endOfMonth.setHours(23, 59, 59, 999);
          filtered = filtered.filter((log) => {
            const logDate = new Date(log.created_at);
            return logDate >= startOfMonth && logDate <= endOfMonth;
          });
          break;
        case 'custom':
          const startOfCustomMonth = new Date(
            auditLogCustomMonthPicker.value.year,
            auditLogCustomMonthPicker.value.month - 1,
            1
          );
          const endOfCustomMonth = new Date(
            auditLogCustomMonthPicker.value.year,
            auditLogCustomMonthPicker.value.month,
            0,
            23,
            59,
            59,
            999
          );
          filtered = filtered.filter((log) => {
            const logDate = new Date(log.created_at);
            return logDate >= startOfCustomMonth && logDate <= endOfCustomMonth;
          });
          break;
      }
    }
    return filtered;
  });

  const filteredAuditLogs = computed(() => {
    return filteredAuditLogsByDate.value;
  });

  const paginatedAuditLogs = computed(() => {
    const start = (auditLogCurrentPage.value - 1) * auditLogItemsPerPage.value;
    return filteredAuditLogs.value.slice(
      start,
      start + auditLogItemsPerPage.value
    );
  });

  const totalAuditLogPages = computed(() => {
    return Math.ceil(
      filteredAuditLogs.value.length / auditLogItemsPerPage.value
    );
  });

  // Methods
  const fetchAuditLogs = async () => {
    try {
      loading.value = true;
      const logs = await productionStore.fetchSampleProductionAuditLogs();
      auditLogs.value = logs;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      loading.value = false;
    }
  };

  const toggleAuditLogs = () => {
    emit('update:show', !props.show);
    if (!props.show && auditLogs.value.length === 0) {
      fetchAuditLogs();
    }
  };

  // Pagination methods
  const goToAuditLogPage = (page) => {
    if (page >= 1 && page <= totalAuditLogPages.value) {
      auditLogCurrentPage.value = page;
    }
  };

  const changeAuditLogItemsPerPage = (newPerPage) => {
    auditLogItemsPerPage.value = newPerPage;
    auditLogCurrentPage.value = 1;
  };

  // Filter methods
  const selectAuditLogFilter = (option) => {
    auditLogFilterType.value = option.type;
    auditLogCurrentPage.value = 1;
    showAuditLogCustomMonthPicker.value = false;
  };

  const toggleAuditLogCustomMonthPicker = () => {
    showAuditLogCustomMonthPicker.value = !showAuditLogCustomMonthPicker.value;
    if (showAuditLogCustomMonthPicker.value)
      auditLogFilterType.value = 'custom';
  };

  const applyAuditLogCustomMonthFilter = () => {
    auditLogFilterType.value = 'custom';
    auditLogCurrentPage.value = 1;
    showAuditLogCustomMonthPicker.value = false;
  };

  const clearAuditLogFilters = () => {
    auditLogFilterType.value = 'today';
    auditLogCurrentPage.value = 1;
    showAuditLogCustomMonthPicker.value = false;
  };

  // Display text for audit log filter
  const getAuditLogFilterDisplayText = () => {
    switch (auditLogFilterType.value) {
      case 'today':
        return `Today (${formatDate(new Date())})`;
      case 'week': {
        const startOfWeek = new Date();
        startOfWeek.setDate(new Date().getDate() - new Date().getDay() + 1);
        return `This Week (${formatDate(startOfWeek)} - ${formatDate(new Date())})`;
      }
      case 'month': {
        const startOfMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        );
        return `This Month (${formatDate(startOfMonth)} - ${formatDate(new Date())})`;
      }
      case 'custom': {
        const monthName = months.find(
          (m) => m.value === auditLogCustomMonthPicker.value.month
        )?.label;
        return `${monthName} ${auditLogCustomMonthPicker.value.year}`;
      }
      default:
        return 'All Time';
    }
  };

  // Helper functions
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatTime = (time) => {
    if (!time) return 'N/A';
    return new Date(time).toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: 'numeric',
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
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Build consistent, labeled details for display
  const mapActionDetails = (log) => {
    const d = log?.action_details || {};
    const entries = [];
    const pushIf = (label, value) => {
      if (value !== undefined && value !== null && value !== '') {
        entries.push({ label, value });
      }
    };
    pushIf(
      'sample_batch_number',
      d.sample_batch_number || log.sample_batch_number
    );
    pushIf('old_status', d.old_status || d.from || d?.status?.from);
    pushIf('new_status', d.new_status || d.to || d?.status?.to);
    pushIf('batch_size', d.batch_size);
    pushIf('batch_unit', d.batch_unit || (log.batch_unit ?? undefined));
    pushIf('quantity_produced', d.quantity_produced);
    pushIf('quantity_lost', d.quantity_lost);
    pushIf('production_cost', d.production_cost);
    pushIf('failure_reason', d.failure_reason);
    // Notes may be saved separately
    if (log.notes) pushIf('notes', log.notes);

    // Include changes object if present
    if (d.changes) {
      try {
        const pretty =
          typeof d.changes === 'string' ? d.changes : JSON.stringify(d.changes);
        pushIf('changes', pretty);
      } catch (e) {
        pushIf('changes', String(d.changes));
      }
    }

    // Fallback for any remaining keys not explicitly handled
    const handled = new Set(entries.map((e) => e.label));
    Object.entries(d).forEach(([key, value]) => {
      if (!handled.has(key)) {
        pushIf(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    });
    return entries;
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
    return parts.length ? parts.join('  •  ') : '—';
  };

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
    // Align colors and sizes with previous planning view badges
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

  // Lifecycle
  const refreshAuditLogsHandler = () => {
    if (props.show) fetchAuditLogs();
  };

  onMounted(() => {
    if (props.show) {
      fetchAuditLogs();
    }
    // Listen for external refresh events (triggered after actions)
    window.addEventListener('refresh-audit-logs', refreshAuditLogsHandler);
  });

  onUnmounted(() => {
    window.removeEventListener('refresh-audit-logs', refreshAuditLogsHandler);
  });
</script>

<template>
  <!-- Audit Log Section -->
  <div class="mt-8">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-primaryColor">
        Sample Production Audit Log
      </h3>
      <button
        @click="toggleAuditLogs"
        class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
      >
        <Activity class="w-4 h-4 mr-2" />
        {{ show ? 'Hide' : 'Show' }} Audit Log
      </button>
    </div>

    <div
      v-if="show"
      class="bg-white rounded-lg border border-gray-200 shadow-sm"
    >
      <!-- Date Filter Section -->
      <div class="p-4 border-b border-gray-200">
        <div
          class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div
            class="flex flex-col sm:flex-row items-start sm:items-center gap-3"
          >
            <span class="text-sm font-medium text-gray-700">Filter by:</span>

            <!-- Date Filter Buttons -->
            <div class="flex flex-wrap gap-2">
              <button
                v-for="option in auditLogFilterOptions"
                :key="option.type"
                class="btn btn-sm font-thin border border-primaryColor/30 hover:border-primaryColor shadow-none"
                :class="{
                  'bg-primaryColor text-white':
                    auditLogFilterType === option.type,
                  'bg-white text-primaryColor hover:bg-primaryColor/10':
                    auditLogFilterType !== option.type,
                }"
                @click="selectAuditLogFilter(option)"
              >
                {{ option.label }}
              </button>
            </div>

            <!-- Custom Month Selection -->
            <div class="flex items-center gap-2">
              <div class="relative">
                <button
                  class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
                  @click="toggleAuditLogCustomMonthPicker"
                >
                  <Calendar class="w-4 h-4 mr-1" />
                  Custom Month
                </button>

                <!-- Custom Month Picker -->
                <div
                  v-if="showAuditLogCustomMonthPicker"
                  class="absolute top-full left-0 mt-1 bg-white border border-primaryColor/30 rounded-lg shadow-lg z-10 p-3 min-w-64"
                >
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="text-sm font-medium text-gray-700">
                      Select Month
                    </h4>
                    <button
                      @click="showAuditLogCustomMonthPicker = false"
                      class="btn btn-xs btn-ghost"
                    >
                      <X class="w-3 h-3" />
                    </button>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="label label-text-alt text-gray-600"
                        >Month</label
                      >
                      <select
                        v-model="auditLogCustomMonthPicker.month"
                        class="select select-bordered select-sm w-full"
                      >
                        <option
                          v-for="month in months"
                          :key="month.value"
                          :value="month.value"
                        >
                          {{ month.label }}
                        </option>
                      </select>
                    </div>

                    <div>
                      <label class="label label-text-alt text-gray-600"
                        >Year</label
                      >
                      <select
                        v-model="auditLogCustomMonthPicker.year"
                        class="select select-bordered select-sm w-full"
                      >
                        <option
                          v-for="year in Array.from(
                            { length: 5 },
                            (_, i) => new Date().getFullYear() - 2 + i
                          )"
                          :key="year"
                          :value="year"
                        >
                          {{ year }}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div class="flex justify-end gap-2 mt-3">
                    <button
                      @click="showAuditLogCustomMonthPicker = false"
                      class="btn btn-sm btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      @click="applyAuditLogCustomMonthFilter"
                      class="btn btn-sm bg-primaryColor text-white"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Current Filter Display -->
          <div class="text-xs text-gray-500">
            {{ getAuditLogFilterDisplayText() }}
          </div>
        </div>
      </div>

      <div class="p-4">
        <div
          v-if="filteredAuditLogs.length === 0"
          class="text-center py-8 text-gray-500"
        >
          <Activity class="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No audit logs found</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-xs">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Action</th>
                <th>User</th>
                <th>Menu Item</th>
                <th>Batch Number</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in paginatedAuditLogs" :key="log.id">
                <td class="text-xs">
                  <div class="flex flex-col items-start">
                    <span class="text-xs">{{
                      formatDateTime(log.created_at)
                    }}</span>
                    <span class="text-xs text-black/50">
                      {{ formatTime(log.created_at) }}
                    </span>
                  </div>
                </td>
                <td>
                  <span
                    class="badge badge-xs"
                    :class="getActionBadgeClass(getDisplayAction(log))"
                  >
                    {{ formatActionType(getDisplayAction(log)) }}
                  </span>
                </td>
                <td class="text-xs">{{ log.user_name || 'System' }}</td>
                <td class="text-xs">{{ log.menu_item_name || 'N/A' }}</td>
                <td class="text-xs">{{ log.sample_batch_number || 'N/A' }}</td>
                <td class="text-xs max-w-xs">
                  <div class="" v-if="log.action_details.reason">
                    <span class="!font-bold">Reason:</span>
                    {{ log.action_details.reason }}
                  </div>
                  <div class="">
                    <span class="!font-bold">Notes:</span>
                    {{ log.notes }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Audit Log Pagination -->
        <div
          class="flex flex-col sm:flex-row justify-between items-center mt-4 sm:mt-6 gap-3"
          v-if="filteredAuditLogs.length > 0 && totalAuditLogPages > 1"
        >
          <div class="flex flex-col sm:flex-row items-center gap-3">
            <div
              class="text-xs sm:text-sm text-black/60 text-center sm:text-left"
            >
              Showing
              {{ (auditLogCurrentPage - 1) * auditLogItemsPerPage + 1 }}
              to
              {{
                Math.min(
                  auditLogCurrentPage * auditLogItemsPerPage,
                  filteredAuditLogs.length
                )
              }}
              of {{ filteredAuditLogs.length }} audit logs
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-black/60">Show:</span>
              <select
                v-model="auditLogItemsPerPage"
                @change="changeAuditLogItemsPerPage(auditLogItemsPerPage)"
                class="select select-bordered select-xs w-16"
              >
                <option :value="5">5</option>
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
              </select>
            </div>
          </div>
          <div class="join">
            <button
              class="join-item btn font-thin !bg-gray-200 text-black/50 btn-xs sm:btn-sm border border-none hover:bg-gray-300"
              :disabled="auditLogCurrentPage <= 1"
              @click="goToAuditLogPage(auditLogCurrentPage - 1)"
            >
              « Prev
            </button>
            <button
              v-for="page in Math.min(5, totalAuditLogPages)"
              :key="page"
              class="join-item btn font-thin btn-xs sm:btn-sm"
              :class="{
                '!bg-primaryColor text-white': auditLogCurrentPage === page,
              }"
              @click="goToAuditLogPage(page)"
            >
              {{ page }}
            </button>
            <button
              class="join-item btn font-thin btn-xs sm:btn-sm !bg-gray-200 text-black/50 border border-none"
              :disabled="auditLogCurrentPage >= totalAuditLogPages"
              @click="goToAuditLogPage(auditLogCurrentPage + 1)"
            >
              Next »
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
