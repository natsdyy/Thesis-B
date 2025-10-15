<script setup>
  import {
    PhilippinePeso,
    TrendingUp,
    TrendingDown,
    Building2,
    LayoutDashboard,
    AlertTriangle,
    CheckCircle,
  } from 'lucide-vue-next';
  import { ref, computed, onMounted, watch } from 'vue';
  import SalesTrendsChart from '../branch/SalesTrendsChart.vue';
  import { usePOSStore } from '../../stores/posStore';
  import { useBranchStore } from '../../stores/branchStore';
  import { getCurrentPhilippineTime } from '../../utils/timezoneUtils';

  const props = defineProps({
    kpis: { type: Object, required: true },
    topBranches: { type: Array, default: () => [] },
    alerts: { type: Array, default: () => [] },
    period: { type: String, default: 'month' },
    customMonth: { type: String, default: '' },
  });

  const posStore = usePOSStore();
  const branchStore = useBranchStore();

  // Sales trend data
  const salesTrendLoading = ref(false);
  const salesTrendData = ref({
    labels: [],
    data: [],
  });

  // Calculate date range based on period
  const getDateRange = () => {
    const now = getCurrentPhilippineTime();
    const build = (start, end) => ({ start, end });

    if (props.period === 'today') {
      const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      return build(start, end);
    }

    if (props.period === 'week') {
      const jsDay = now.getDay();
      const daysSinceMonday = (jsDay + 6) % 7;
      const startTmp = new Date(now);
      startTmp.setDate(now.getDate() - daysSinceMonday);
      const start = new Date(
        startTmp.getFullYear(),
        startTmp.getMonth(),
        startTmp.getDate(),
        0,
        0,
        0,
        0
      );
      const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      return build(start, end);
    }

    if (props.period === 'customMonth') {
      const ym = String(props.customMonth || '').trim();
      const [yStr, mStr] = ym.split('-');
      const year = Number(yStr);
      const monthIndex = Number(mStr) - 1;
      const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      const end = new Date(year, monthIndex, lastDay, 23, 59, 59, 999);
      return build(start, end);
    }

    // default this month
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    return build(start, end);
  };

  // Fetch sales trend based on selected period
  const fetchSalesTrend = async () => {
    try {
      salesTrendLoading.value = true;

      // Get all active branches
      const branches = branchStore.activeBranches || [];
      if (branches.length === 0) {
        salesTrendData.value = { labels: [], data: [] };
        return;
      }

      // Calculate date range based on period
      const { start, end } = getDateRange();

      // Aggregate remittances across all branches
      const dailyMap = new Map();

      for (const branch of branches) {
        const remittances = await posStore.fetchRemittances({
          branchId: branch.id,
          status: 'approved',
          limit: 1000,
        });

        // Group remittances by approval date
        (remittances.data || []).forEach((r) => {
          const approvedAt = new Date(r.approved_at || r.created_at);
          if (approvedAt >= start && approvedAt <= end) {
            const dateKey = approvedAt.toISOString().split('T')[0];
            const current = dailyMap.get(dateKey) || 0;
            dailyMap.set(dateKey, current + Number(r.remitted_amount || 0));
          }
        });
      }

      // Sort dates chronologically
      const sortedDates = Array.from(dailyMap.keys()).sort((a, b) => {
        return new Date(a) - new Date(b);
      });

      // Build chart data
      salesTrendData.value = {
        labels: sortedDates,
        data: sortedDates.map((date) => Math.round(dailyMap.get(date) || 0)),
      };
    } catch (error) {
      console.error('Failed to fetch sales trend:', error);
      salesTrendData.value = { labels: [], data: [] };
    } finally {
      salesTrendLoading.value = false;
    }
  };

  onMounted(() => {
    fetchSalesTrend();
  });

  // Watch for period changes and refetch data
  watch(
    () => props.period,
    () => {
      fetchSalesTrend();
    }
  );

  watch(
    () => props.customMonth,
    () => {
      if (props.period === 'customMonth') {
        fetchSalesTrend();
      }
    }
  );
</script>

<template>
  <div class="space-y-6">
    <!-- KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">Today Sales</div>
            <PhilippinePeso class="w-4 h-4 text-primaryColor" />
          </div>
          <div class="text-2xl font-bold">
            ₱{{
              Number(props.kpis.todaySales || 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
            }}
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">MTD Sales</div>
            <LayoutDashboard class="w-4 h-4 text-primaryColor" />
          </div>
          <div class="text-2xl font-bold">
            ₱{{
              Number(props.kpis.mtdSales || 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
            }}
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">Gross Margin</div>
            <TrendingUp class="w-4 h-4 text-primaryColor" />
          </div>
          <div class="text-2xl font-bold">
            {{ Number(props.kpis.grossMarginPct || 0).toFixed(1) }}%
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">Active Branches</div>
            <Building2 class="w-4 h-4 text-primaryColor" />
          </div>
          <div class="text-2xl font-bold">{{ props.kpis.activeBranches }}</div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">Payroll MTD</div>
            <PhilippinePeso class="w-4 h-4 text-primaryColor" />
          </div>
          <div class="text-2xl font-bold">
            ₱{{
              Number(props.kpis.payrollMtd || 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
            }}
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">Payroll Approvals</div>
            <LayoutDashboard class="w-4 h-4 text-primaryColor" />
          </div>
          <div class="text-2xl font-bold">
            {{ props.kpis.pendingPayrollApprovals }}
          </div>
        </div>
      </div>
    </div>

    <!-- Sales Trend Delta -->
    <div class="card bg-white shadow-lg">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="text-sm font-semibold text-gray-700">
              Sales Trend ({{
                period === 'today'
                  ? 'Today'
                  : period === 'week'
                    ? 'This Week'
                    : period === 'customMonth'
                      ? customMonth
                      : 'This Month'
              }})
            </div>
            <component
              :is="
                (props.kpis.salesTrendDeltaPct || 0) >= 0
                  ? TrendingUp
                  : TrendingDown
              "
              class="w-4 h-4"
              :class="
                (props.kpis.salesTrendDeltaPct || 0) >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              "
            />
            <span
              class="text-sm font-semibold"
              :class="
                (props.kpis.salesTrendDeltaPct || 0) >= 0
                  ? 'text-green-700'
                  : 'text-red-700'
              "
            >
              {{ (props.kpis.salesTrendDeltaPct || 0) >= 0 ? '+' : ''
              }}{{ Number(props.kpis.salesTrendDeltaPct || 0).toFixed(1) }}%
            </span>
          </div>
        </div>

        <!-- Sales Trend Chart -->
        <div v-if="salesTrendLoading" class="flex justify-center py-8">
          <div
            class="loading loading-spinner loading-md text-primaryColor"
          ></div>
        </div>
        <div
          v-else-if="salesTrendData.labels.length === 0"
          class="text-center py-8 text-gray-500"
        >
          No sales data available for the last 7 days
        </div>
        <SalesTrendsChart
          v-else
          :labels="salesTrendData.labels"
          :data="salesTrendData.data"
          :metric="'totalSales'"
        />
      </div>
    </div>

    <!-- Top Branches -->
    <div class="card bg-white shadow-lg">
      <div class="card-body">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-lg">Top Branch Performance</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Branch</th>
                <th class="text-right">Sales</th>
                <th class="text-right">Average Transaction</th>
                <th class="text-right">Growth</th>
                <th class="text-right">Out of Stock</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in props.topBranches" :key="b.name">
                <td>{{ b.name }}</td>
                <td class="text-right">
                  ₱{{
                    Number(b.sales || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })
                  }}
                </td>
                <td class="text-right">₱{{ Number(b.aov || 0).toFixed(1) }}</td>
                <td
                  class="text-right"
                  :class="
                    (b.growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  "
                >
                  {{ Number(b.growth || 0).toFixed(1) }}%
                </td>
                <td class="text-right">{{ b.oos || 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Alerts -->
    <div class="card bg-white shadow-lg">
      <div class="card-body">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-lg">Alerts</h3>
        </div>
        <div
          v-if="(props.alerts || []).length === 0"
          class="p-3 rounded-lg bg-gray-50"
        >
          <span class="text-sm text-gray-500">No alerts at this time.</span>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="(a, idx) in props.alerts"
            :key="idx"
            class="flex items-start gap-2 p-3 rounded-lg"
            :class="a.level === 'warning' ? 'bg-orange-50' : 'bg-gray-50'"
          >
            <AlertTriangle
              v-if="a.level === 'warning'"
              class="w-4 h-4 text-orange-600 mt-0.5"
            />
            <CheckCircle v-else class="w-4 h-4 text-green-600 mt-0.5" />
            <span class="text-sm text-gray-700">{{ a.text }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
