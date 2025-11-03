<script setup>
  import { ref, onMounted, computed, watch } from 'vue';
  import { useCashMovementStore } from '../../stores/cashMovementStore.js';
  import { useCustomToast } from '../../composables/useCustomToast.js';
  import {
    getCurrentPhilippineTime,
    createPhilippineDate,
  } from '../../utils/timezoneUtils.js';

  const props = defineProps({ branchId: { type: Number, default: 0 } });

  const cashMovementStore = useCashMovementStore();
  const { showToast } = useCustomToast();

  // Period controls
  const period = ref('month'); // today | week | customMonth | month | year
  const customMonth = ref(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  const loading = computed(() => cashMovementStore.loading);
  const movements = computed(() => cashMovementStore.movements);
  const error = computed(() => cashMovementStore.error);

  // Pagination (10 per page)
  const currentPage = ref(1);
  const pageSize = ref(10);
  const totalPages = computed(() => {
    const total = movements.value?.length || 0;
    return Math.max(1, Math.ceil(total / pageSize.value));
  });
  const pagedMovements = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return (movements.value || []).slice(start, end);
  });

  const getDateRange = () => {
    const now = getCurrentPhilippineTime();
    const build = (start, end) => ({ start, end });
    if (period.value === 'today') {
      const start = createPhilippineDate(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        0,
        0,
        0
      );
      const end = createPhilippineDate(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        23,
        59,
        59
      );
      return build(start, end);
    }
    if (period.value === 'week') {
      const startTmp = new Date(now);
      startTmp.setDate(now.getDate() - now.getDay());
      const start = createPhilippineDate(
        startTmp.getFullYear(),
        startTmp.getMonth() + 1,
        startTmp.getDate(),
        0,
        0,
        0
      );
      const end = createPhilippineDate(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        23,
        59,
        59
      );
      return build(start, end);
    }
    if (period.value === 'customMonth') {
      const ym = String(customMonth.value || '').trim();
      const [yStr, mStr] = ym.split('-');
      const year = Number(yStr);
      const monthIndex = Number(mStr) - 1;
      const start =
        Number.isFinite(year) && Number.isFinite(monthIndex)
          ? createPhilippineDate(year, monthIndex + 1, 1, 0, 0, 0)
          : createPhilippineDate(
              now.getFullYear(),
              now.getMonth() + 1,
              1,
              0,
              0,
              0
            );
      const end =
        Number.isFinite(year) && Number.isFinite(monthIndex)
          ? createPhilippineDate(year, monthIndex + 2, 0, 23, 59, 59)
          : createPhilippineDate(
              now.getFullYear(),
              now.getMonth() + 2,
              0,
              23,
              59,
              59
            );
      return build(start, end);
    }
    if (period.value === 'month') {
      const start = createPhilippineDate(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
        0,
        0,
        0
      );
      const end = createPhilippineDate(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        23,
        59,
        59
      );
      return build(start, end);
    }
    // year
    const start = createPhilippineDate(now.getFullYear(), 1, 1, 0, 0, 0);
    const end = createPhilippineDate(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
      23,
      59,
      59
    );
    return build(start, end);
  };

  const loadMovements = async () => {
    try {
      const { start, end } = getDateRange();
      const filters = {
        branch_id: props.branchId || null,
        date_from: start.toISOString(),
        date_to: end.toISOString(),
        limit: 50,
        offset: 0,
        include_non_branch: true, // Include HQ/SCM budget release movements
      };

      await cashMovementStore.forceRefresh(filters);
      currentPage.value = 1;
    } catch (err) {
      console.error('Failed to load cash movements:', err);
      showToast('Failed to load cash movements', 'error');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMovementTypeLabel = (type) => {
    return type === 'in' ? 'Inflow' : 'Outflow';
  };

  const getMovementTypeClass = (type) => {
    return type === 'in'
      ? 'badge badge-sm bg-success/20 text-success'
      : 'badge badge-sm bg-error/20 text-error';
  };

  const formatBranchName = (branchName) => {
    if (!branchName) {
      return 'HQ/SCM';
    }
    return branchName;
  };

  const formatSource = (source) => {
    if (!source) return '—';

    const sourceMap = {
      remittance: 'Branch Remittance',
      budget_release: 'Budget Release',
      budget_return: 'Budget Return',
      po_deficit: 'PO Budget Deficit',
      manual: 'Manual Entry',
      loan: 'Loan',
      expense: 'Expense',
      disposal_loss: 'Inventory Disposal Loss',
      payroll: 'Payroll - Net Salary',
      payroll_employer_contributions: 'Payroll - Employer Contributions',
      payroll_employee_contributions: 'Payroll - Employee Contributions',
      utilities_expense: 'Utilities Expense',
    };

    return (
      sourceMap[source] ||
      source.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  onMounted(() => {
    loadMovements();
  });

  // Refresh when period changes
  watch(period, () => {
    loadMovements();
  });
  watch(customMonth, () => {
    if (period.value === 'customMonth') {
      loadMovements();
    }
  });
</script>

<template>
  <div class="card bg-white shadow border border-black/10">
    <div class="card-body">
      <div
        class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2"
      >
        <h3 class="text-sm font-medium text-gray-700">
          Cash Movement (In/Out)
        </h3>
        <div class="flex items-center gap-3">
          <select v-model="period" class="select select-bordered select-xs">
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="customMonth">Custom Month</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <input
            v-if="period === 'customMonth'"
            type="month"
            class="input input-bordered input-xs"
            v-model="customMonth"
          />
        </div>
      </div>
      <div v-if="loading" class="flex justify-center py-8">
        <div class="loading loading-spinner loading-md text-primaryColor"></div>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="table w-full text-sm table-zebra">
          <thead>
            <tr>
              <th>Date</th>
              <th>Branch</th>

              <th>Amount</th>
              <th>Source</th>
              <th>Type</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!movements.length">
              <td colspan="7" class="text-center text-gray-500">No records</td>
            </tr>
            <tr v-for="movement in pagedMovements" :key="movement.id">
              <td>{{ formatDate(movement.occurred_at) }}</td>
              <td>
                <span
                  :class="{ 'text-gray-500 italic': !movement.branch_name }"
                >
                  {{ formatBranchName(movement.branch_name) }}
                </span>
              </td>
              <td
                :class="{
                  'text-error  text-xs': movement.movement_type === 'out',
                  'text-success  text-xs': movement.movement_type === 'in',
                }"
              >
                <font-awesome-icon
                  icon="fa-solid fa-peso-sign"
                  class="!w-3 !h-3"
                />
                {{
                  Number(movement.amount || 0).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                }}
              </td>
              <td>
                <span class="text-xs">{{ formatSource(movement.source) }}</span>
              </td>
              <td>
                <span :class="getMovementTypeClass(movement.movement_type)">
                  {{ getMovementTypeLabel(movement.movement_type) }}
                </span>
              </td>
              <td class="max-w-xs">
                <div class="truncate" :title="movement.notes || ''">
                  {{ movement.notes || '—' }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div
          class="flex items-center justify-between mt-3 text-xs text-gray-600"
        >
          <div>Page {{ currentPage }} of {{ totalPages }}</div>
          <div class="flex items-center gap-2">
            <button
              class="btn btn-xs"
              :disabled="currentPage <= 1"
              @click="currentPage = Math.max(1, currentPage - 1)"
            >
              Prev
            </button>
            <button
              class="btn btn-xs"
              :disabled="currentPage >= totalPages"
              @click="currentPage = Math.min(totalPages, currentPage + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
