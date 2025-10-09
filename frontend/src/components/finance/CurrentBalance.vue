<script setup>
  import { ref, onMounted, computed, watch } from 'vue';
  import axios from 'axios';
  import { useFinanceBalanceStore } from '../../stores/financeBalanceStore.js';
  import { useBranchContextStore } from '../../stores/branchContextStore.js';
  import { usePOSStore } from '../../stores/posStore.js';
  import { useCashMovementStore } from '../../stores/cashMovementStore.js';
  import { useCustomToast } from '../../composables/useCustomToast.js';
  import { apiConfig } from '../../config/api.js';
  import {
    getCurrentPhilippineTime,
    createPhilippineDate,
  } from '../../utils/timezoneUtils.js';
  const props = defineProps({ branchId: { type: Number, default: 0 } });

  const financeBalanceStore = useFinanceBalanceStore();
  const branchContext = useBranchContextStore();
  const posStore = usePOSStore();
  const cashMovementStore = useCashMovementStore();
  const { showToast } = useCustomToast();

  const loading = ref(false);
  const balances = computed(() => financeBalanceStore.totals);
  const branchBreakdown = ref([]);
  const totalExpenses = ref(0); // Total outflows from cash movements
  const disposalLosses = ref([]); // Disposal losses by branch
  const payrollExpenses = ref({
    netSalary: 0,
    employerContributions: 0,
    employeeContributions: 0,
    total: 0,
  }); // Payroll expense breakdown
  const currentPage = ref(1);
  const pageSize = ref(10);
  const totalPages = computed(() => {
    const total = branchBreakdown.value.length || 0;
    return Math.max(1, Math.ceil(total / pageSize.value));
  });
  const pagedBreakdown = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return branchBreakdown.value.slice(start, end);
  });

  // Period controls
  const period = ref('month'); // today | week | customMonth | month | year
  const customMonth = ref(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  const availableBranches = computed(
    () => branchContext.availableBranches || []
  );
  const currentBranch = computed(() => branchContext.currentBranch);

  // Total loss across branches (sum of voided_amount from remittances + disposal losses)
  const totalLoss = computed(() => {
    const remittanceLosses = (branchBreakdown.value || []).reduce(
      (acc, row) => {
        return acc + Number(row.loss || 0);
      },
      0
    );

    const disposalLossTotal = (disposalLosses.value || []).reduce(
      (acc, row) => {
        return acc + Number(row.disposal_loss || 0);
      },
      0
    );

    return remittanceLosses + disposalLossTotal;
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
      // Start week on Monday (ISO week): compute days since Monday
      const jsDay = now.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
      const daysSinceMonday = (jsDay + 6) % 7; // Mon->0, Tue->1, ... Sun->6
      const startTmp = new Date(now);
      startTmp.setDate(now.getDate() - daysSinceMonday);
      // Clamp to month start so This Week never exceeds This Month totals
      const monthStart = createPhilippineDate(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
        0,
        0,
        0
      );
      const startCandidate = createPhilippineDate(
        startTmp.getFullYear(),
        startTmp.getMonth() + 1,
        startTmp.getDate(),
        0,
        0,
        0
      );
      const start = startCandidate < monthStart ? monthStart : startCandidate;
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
      // Compute the last day of the target month explicitly to avoid "day 0" invalid dates
      const end = (() => {
        if (Number.isFinite(year) && Number.isFinite(monthIndex)) {
          const lastDay = new Date(year, monthIndex + 1, 0).getDate();
          return createPhilippineDate(
            year,
            monthIndex + 1,
            lastDay,
            23,
            59,
            59
          );
        }
        const currentYear = now.getFullYear();
        const currentMonthIndex = now.getMonth();
        const lastDay = new Date(
          currentYear,
          currentMonthIndex + 1,
          0
        ).getDate();
        return createPhilippineDate(
          currentYear,
          currentMonthIndex + 1,
          lastDay,
          23,
          59,
          59
        );
      })();
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

  const loadBalances = async () => {
    loading.value = true;
    try {
      if (!currentBranch.value) {
        await branchContext.initializeBranchContext();
      }
      if (
        (availableBranches.value?.length || 0) === 0 &&
        branchContext.isSuperAdmin
      ) {
        await branchContext.fetchAvailableBranches?.();
      }

      // Fetch company-wide totals
      await financeBalanceStore.fetchTotals();

      // Fetch total expenses (cash outflows) for the period
      const { start, end } = getDateRange();
      try {
        await cashMovementStore.fetchMovements({
          movement_type: 'out',
          date_from: start.toISOString(),
          date_to: end.toISOString(),
          include_non_branch: true,
          limit: 9999,
        });

        // Calculate total from outflow movements and break down payroll expenses
        totalExpenses.value = 0;
        payrollExpenses.value = {
          netSalary: 0,
          employerContributions: 0,
          employeeContributions: 0,
          total: 0,
        };

        cashMovementStore.outflowMovements.forEach((movement) => {
          const amount = Number(movement.amount || 0);
          totalExpenses.value += amount;

          // Track payroll-specific expenses
          const source = (movement.source || '').toLowerCase();
          if (source === 'payroll') {
            payrollExpenses.value.netSalary += amount;
            payrollExpenses.value.total += amount;
          } else if (source === 'payroll_employer_contributions') {
            payrollExpenses.value.employerContributions += amount;
            payrollExpenses.value.total += amount;
          } else if (source === 'payroll_employee_contributions') {
            payrollExpenses.value.employeeContributions += amount;
            payrollExpenses.value.total += amount;
          }
        });
      } catch (err) {
        console.error('Failed to fetch expenses:', err);
        totalExpenses.value = 0;
      }

      // Fetch disposal losses by branch for the period
      try {
        const disposalResponse = await axios.get(
          `${apiConfig.baseURL}/cash-movements/disposal-losses`,
          {
            params: {
              date_from: start.toISOString(),
              date_to: end.toISOString(),
            },
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (disposalResponse.data.success) {
          disposalLosses.value = disposalResponse.data.data;
        }
      } catch (err) {
        console.error('Failed to fetch disposal losses:', err);
        disposalLosses.value = [];
      }

      // Fetch branch breakdown from remittances
      const { data: remittances } = await posStore.fetchRemittances({
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
        status: 'approved',
        limit: 9999,
      });

      // Aggregate remittances by branch
      const aggregatedBreakdown = {};

      // Initialize all available branches with zero values
      if (availableBranches.value && availableBranches.value.length > 0) {
        availableBranches.value.forEach((branch) => {
          aggregatedBreakdown[branch.id] = {
            branch_id: branch.id,
            branch_name: branch.name,
            profit: 0,
            sales_remittances: 0,
            loss: 0,
            disposal_loss: 0,
          };
        });
      }

      // Sum up remittances for each branch
      if (remittances && remittances.length > 0) {
        remittances.forEach((remittance) => {
          const branchId = remittance.branch_id;
          if (!aggregatedBreakdown[branchId]) {
            aggregatedBreakdown[branchId] = {
              branch_id: branchId,
              branch_name: remittance.branch_name || `Branch ${branchId}`,
              profit: 0,
              sales_remittances: 0,
              loss: 0,
              disposal_loss: 0,
            };
          }
          aggregatedBreakdown[branchId].profit += Number(
            remittance.net_sales || 0
          );
          aggregatedBreakdown[branchId].sales_remittances += Number(
            remittance.remitted_amount || 0
          );
          // Capture voids as loss impact
          aggregatedBreakdown[branchId].loss += Number(
            remittance.voided_amount || 0
          );
        });
      }

      // Add disposal losses to branch breakdown
      if (disposalLosses.value && disposalLosses.value.length > 0) {
        disposalLosses.value.forEach((disposal) => {
          const branchId = disposal.branch_id;
          if (!aggregatedBreakdown[branchId]) {
            aggregatedBreakdown[branchId] = {
              branch_id: branchId,
              branch_name: disposal.branch_name || `Branch ${branchId}`,
              profit: 0,
              sales_remittances: 0,
              loss: 0,
              disposal_loss: 0,
            };
          }
          aggregatedBreakdown[branchId].disposal_loss += Number(
            disposal.disposal_loss || 0
          );
        });
      }

      branchBreakdown.value = Object.values(aggregatedBreakdown);
      currentPage.value = 1;
    } catch (err) {
      console.error('Failed to load current balance:', err);
      showToast('Failed to load balance data', 'error');
    } finally {
      loading.value = false;
    }
  };

  onMounted(() => {
    loadBalances();
  });

  // Refresh when period changes
  watch(period, () => {
    loadBalances();
  });
  watch(customMonth, () => {
    if (period.value === 'customMonth') {
      loadBalances();
    }
  });
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
    <div class="card bg-white shadow border border-black/10">
      <div class="card-body py-4">
        <div class="text-xs text-gray-500">Capital</div>
        <div class="text-lg font-semibold text-primaryColor">
          <font-awesome-icon icon="fa-solid fa-peso-sign" class="!w-4 !h-4" />
          {{
            Number(balances.capital).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          }}
        </div>
      </div>
    </div>
    <div class="card bg-white shadow border border-black/10">
      <div class="card-body py-4">
        <div class="text-xs text-gray-500">Profit</div>
        <div class="text-lg font-semibold text-primaryColor">
          <font-awesome-icon icon="fa-solid fa-peso-sign" class="!w-4 !h-4" />
          {{
            Number(balances.profit).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          }}
        </div>
      </div>
    </div>
    <div class="card bg-white shadow border border-black/10">
      <div class="card-body py-4">
        <div class="text-xs text-gray-500">Sales Remittances</div>
        <div class="text-lg font-semibold text-primaryColor">
          <font-awesome-icon icon="fa-solid fa-peso-sign" class="!w-4 !h-4" />
          {{
            Number(balances.sales_remittances || 0).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          }}
        </div>
      </div>
    </div>
    <div class="card bg-white shadow border border-black/10">
      <div class="card-body py-4">
        <div class="text-xs text-gray-500">Current Balance</div>
        <div class="text-lg font-semibold text-primaryColor">
          <font-awesome-icon icon="fa-solid fa-peso-sign" class="!w-4 !h-4" />
          {{
            Number(balances.total_balance || 0).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          }}
        </div>
      </div>
    </div>
    <div class="card bg-white shadow border border-black/10">
      <div class="card-body py-4">
        <div class="text-xs text-gray-500">Total Expenses</div>
        <div class="text-lg font-semibold text-warning">
          <font-awesome-icon icon="fa-solid fa-peso-sign" class="!w-4 !h-4" />
          {{
            Number(totalExpenses || 0).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          }}
        </div>
      </div>
    </div>
    <div class="card bg-white shadow border border-black/10">
      <div class="card-body py-4">
        <div class="text-xs text-gray-500">Total Loss</div>
        <div class="text-lg font-semibold text-error">
          <font-awesome-icon icon="fa-solid fa-peso-sign" class="!w-4 !h-4" />
          {{
            Number(totalLoss || 0).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          }}
        </div>
      </div>
    </div>
  </div>

  <!-- Payroll Expenses Breakdown -->
  <div
    v-if="payrollExpenses.total > 0"
    class="card mt-4 bg-white shadow border border-black/10"
  >
    <div class="card-body">
      <h3 class="text-sm font-medium text-gray-700 mb-3">
        Payroll Expenses Breakdown
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div class="stats shadow border border-gray-200">
          <div class="stat p-3">
            <div class="stat-title text-xs">Net Salary Paid</div>
            <div class="stat-value text-lg text-purple-600">
              <font-awesome-icon
                icon="fa-solid fa-peso-sign"
                class="!w-4 !h-4"
              />
              {{
                Number(payrollExpenses.netSalary).toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              }}
            </div>
            <div class="stat-desc text-xs">Employee salaries</div>
          </div>
        </div>
        <div class="stats shadow border border-gray-200">
          <div class="stat p-3">
            <div class="stat-title text-xs">Employer Contributions</div>
            <div class="stat-value text-lg text-orange-600">
              <font-awesome-icon
                icon="fa-solid fa-peso-sign"
                class="!w-4 !h-4"
              />
              {{
                Number(payrollExpenses.employerContributions).toLocaleString(
                  'en-PH',
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )
              }}
            </div>
            <div class="stat-desc text-xs">SSS, PhilHealth, Pag-IBIG</div>
          </div>
        </div>
        <div class="stats shadow border border-gray-200">
          <div class="stat p-3">
            <div class="stat-title text-xs">Employee Contributions</div>
            <div class="stat-value text-lg text-blue-600">
              <font-awesome-icon
                icon="fa-solid fa-peso-sign"
                class="!w-4 !h-4"
              />
              {{
                Number(payrollExpenses.employeeContributions).toLocaleString(
                  'en-PH',
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )
              }}
            </div>
            <div class="stat-desc text-xs">To be remitted</div>
          </div>
        </div>
        <div class="stats shadow border border-gray-200">
          <div class="stat p-3">
            <div class="stat-title text-xs">Total Payroll Expense</div>
            <div class="stat-value text-lg text-error">
              <font-awesome-icon
                icon="fa-solid fa-peso-sign"
                class="!w-4 !h-4"
              />
              {{
                Number(payrollExpenses.total).toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              }}
            </div>
            <div class="stat-desc text-xs">Total payroll cost</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="card mt-4 bg-white shadow border border-black/10">
    <div class="card-body">
      <div
        class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-2"
      >
        <h3 class="text-sm font-medium text-gray-700">Branch Breakdown</h3>
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
              <th>Branch</th>
              <th>Profit</th>
              <th>Sales Remittances</th>
              <th>Loss</th>
              <th>Disposal Loss</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!branchBreakdown.length">
              <td colspan="5" class="text-center text-gray-500">No data</td>
            </tr>
            <tr v-for="row in pagedBreakdown" :key="row.branch_id">
              <td>{{ row.branch_name }}</td>
              <td>
                <font-awesome-icon
                  icon="fa-solid fa-peso-sign"
                  class="!w-3 !h-3"
                />
                {{
                  Number(row.profit || 0).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                }}
              </td>
              <td>
                <font-awesome-icon
                  icon="fa-solid fa-peso-sign"
                  class="!w-3 !h-3"
                />
                {{
                  Number(row.sales_remittances || 0).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                }}
              </td>
              <td :class="{ 'text-error': row.loss > 0 }">
                <font-awesome-icon
                  icon="fa-solid fa-peso-sign"
                  class="!w-3 !h-3"
                />
                {{
                  Number(row.loss || 0).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                }}
              </td>
              <td :class="{ 'text-error': row.disposal_loss > 0 }">
                <font-awesome-icon
                  icon="fa-solid fa-peso-sign"
                  class="!w-3 !h-3"
                />
                {{
                  Number(row.disposal_loss || 0).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                }}
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
