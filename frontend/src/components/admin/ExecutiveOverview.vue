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
  import { useBranchInventoryStore } from '../../stores/branchInventoryStore';
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
  const branchInventoryStore = useBranchInventoryStore();

  // Sales trend data
  const salesTrendLoading = ref(false);
  const salesTrendData = ref({
    labels: [],
    data: [],
  });

  // Derived alerts built from live branch inventory data
  const derivedAlerts = ref([]);
  const combinedAlerts = computed(() => {
    const source = [
      ...(Array.isArray(props.alerts) ? props.alerts : []),
      ...derivedAlerts.value,
    ];
    // Normalize and de-duplicate by (item, branch) keeping highest severity
    const byKey = new Map();
    for (const a of source) {
      if (!a || !a.text) continue;
      const parsed = normalizeAlert(a.text);
      if (!parsed) continue;
      const key = `${parsed.item}|${parsed.branch}`;
      const prev = byKey.get(key);
      if (
        !prev ||
        severityRank(parsed.severity) > severityRank(prev.severity)
      ) {
        byKey.set(key, {
          level: 'warning',
          text: formatAlertText(parsed),
          severity: parsed.severity,
        });
      }
    }
    return Array.from(byKey.values());
  });

  const severityRank = (s) => (String(s).toLowerCase().includes('out') ? 2 : 1);
  const normalizeAlert = (text) => {
    try {
      const m = String(text).match(
        /^(Low stock|Out of stock):\s*([^()]+)\s*\(([^)]+)\)/i
      );
      if (!m) return null;
      const severity = m[1].toLowerCase();
      const item = m[2].trim();
      const branch = m[3].trim();
      return { severity, item, branch };
    } catch {
      return null;
    }
  };
  const formatAlertText = ({ severity, item, branch }) => {
    const label = severity.includes('out') ? 'Out of stock' : 'Low stock';
    return `${label}: ${item} (${branch})`;
  };

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
    buildAlertsFromInventory();
  });

  // Watch for period changes and refetch data
  watch(
    () => props.period,
    () => {
      fetchSalesTrend();
    }
  );

  // Rebuild inventory-driven alerts whenever active branches change
  watch(
    () => branchStore.activeBranches,
    () => {
      buildAlertsFromInventory();
    },
    { deep: true }
  );

  // Top branches table: allow toggling between Top and Least by sales
  const sortMode = ref('top'); // 'top' | 'least'
  const sortedBranches = computed(() => {
    const list = Array.isArray(props.topBranches) ? [...props.topBranches] : [];
    return list.sort((a, b) => {
      const aSales = Number(a?.sales || 0);
      const bSales = Number(b?.sales || 0);
      return sortMode.value === 'least' ? aSales - bSales : bSales - aSales;
    });
  });

  // Build alerts from branch inventory (low/out of stock)
  const buildAlertsFromInventory = async () => {
    try {
      const branches = branchStore.activeBranches || [];
      const alerts = [];
      for (const b of branches) {
        const inv = await branchInventoryStore.fetchInventory(b.id);
        for (const it of inv) {
          const qty = Number(it.quantity || 0);
          const min = Number(it.minimum_stock || it.min_stock || 0);
          if (qty <= 0 || qty <= min) {
            const level = qty <= 0 ? 'warning' : 'warning';
            alerts.push({
              level,
              text: `${qty <= 0 ? 'Out of stock' : 'Low stock'}: ${it.name || it.item_name || it.item} (${b.name})`,
            });
          }
        }
      }
      derivedAlerts.value = alerts;
    } catch (e) {
      console.warn('Failed building inventory-driven alerts:', e);
    }
  };

  // Tooltip formatter for Out of Stock items
  const getOosTooltip = (b) => {
    const raw =
      b?.oosItems ||
      b?.oos_items ||
      b?.outOfStockItems ||
      b?.oosDetails ||
      b?.oos_details ||
      [];

    if (Array.isArray(raw)) {
      const names = raw
        .map((it) =>
          typeof it === 'string' ? it : it?.name || it?.item || it?.title || ''
        )
        .filter(Boolean);
      if (names.length === 0)
        return tryAlertsFallback(b) || 'No out-of-stock items listed';
      const preview = names.slice(0, 10);
      const rest = names.length - preview.length;
      return rest > 0
        ? `${preview.join(', ')}, +${rest} more`
        : preview.join(', ');
    }

    if (typeof raw === 'string' && raw.trim().length > 0) return raw;

    // Fallback: if we have a numeric count but no item list fields
    const count = Number(
      b?.oos ?? b?.out_of_stock ?? b?.oosCount ?? b?.oos_count ?? 0
    );
    if (count > 0) {
      const fromAlerts = tryAlertsFallback(b, count);
      if (fromAlerts) return fromAlerts;
      return `${count} item${count === 1 ? '' : 's'} out of stock`;
    }

    return 'No out-of-stock items listed';
  };

  // Get list of OOS item names (from row data or alerts fallback)
  const getOosNames = (b) => {
    const raw =
      b?.oosItems ||
      b?.oos_items ||
      b?.outOfStockItems ||
      b?.oosDetails ||
      b?.oos_details ||
      [];

    if (Array.isArray(raw)) {
      const names = raw
        .map((it) =>
          typeof it === 'string' ? it : it?.name || it?.item || it?.title || ''
        )
        .filter(Boolean);
      if (names.length > 0) return names;
    }

    // Fallback to alerts parsing
    const inferred = extractAlertsNames(b);
    return Array.isArray(inferred) && inferred.length > 0 ? inferred : [];
  };

  // Extract names from alerts array for a given branch
  const extractAlertsNames = (b) => {
    try {
      const branchName = String(b?.name || '').trim();
      if (!branchName) return [];
      const alerts = combinedAlerts.value;
      const names = [];
      for (const a of alerts) {
        const text = String(a?.text || '');
        const isStockAlert = /(low stock|out of stock)/i.test(text);
        const mentionsBranch =
          text.includes(`(${branchName})`) ||
          text.toLowerCase().includes(branchName.toLowerCase());
        if (!isStockAlert || !mentionsBranch) continue;
        const m = text.match(/:\s*([^()]+)\s*\(/);
        if (m && m[1]) names.push(m[1].trim());
      }
      return names;
    } catch (_) {
      return [];
    }
  };

  // Try to derive OOS item names from alerts feed when table row lacks details
  const tryAlertsFallback = (b, totalCountHint = 0) => {
    try {
      const branchName = String(b?.name || '').trim();
      if (!branchName) return '';
      const alerts = combinedAlerts.value;
      const names = [];
      for (const a of alerts) {
        const text = String(a?.text || '');
        const isStockAlert = /(low stock|out of stock)/i.test(text);
        const mentionsBranch =
          text.includes(`(${branchName})`) ||
          text.toLowerCase().includes(branchName.toLowerCase());
        if (!isStockAlert || !mentionsBranch) continue;
        const m = text.match(/:\s*([^()]+)\s*\(/); // capture item name before (Branch)
        if (m && m[1]) names.push(m[1].trim());
      }
      if (names.length > 0) {
        const preview = names.slice(0, 10);
        const inferredRest = Math.max(
          0,
          Number(totalCountHint || 0) - names.length
        );
        const rest = Math.max(0, names.length - preview.length) + inferredRest;
        return rest > 0
          ? `${preview.join(', ')}, +${rest} more`
          : preview.join(', ');
      }
      return '';
    } catch (_) {
      return '';
    }
  };

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
    <div
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4"
    >
      <div class="card bg-white shadow-lg">
        <div class="card-body p-4 flex flex-col gap-2">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-gray-500 font-medium">Today Sales</span>
            <PhilippinePeso class="w-4 h-4 text-primaryColor flex-shrink-0" />
          </div>
          <div class="text-2xl font-bold text-gray-900">
            ₱{{
              Number(props.kpis.todaySales || 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
            }}
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body p-4 flex flex-col gap-2">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-gray-500 font-medium">MTD Sales</span>
            <LayoutDashboard class="w-4 h-4 text-primaryColor flex-shrink-0" />
          </div>
          <div class="text-2xl font-bold text-gray-900">
            ₱{{
              Number(props.kpis.mtdSales || 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
            }}
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body p-4 flex flex-col gap-2">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-gray-500 font-medium">Gross Margin</span>
            <TrendingUp class="w-4 h-4 text-primaryColor flex-shrink-0" />
          </div>
          <div class="text-2xl font-bold text-gray-900">
            {{ Number(props.kpis.grossMarginPct || 0).toFixed(1) }}%
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body p-4 flex flex-col gap-2">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-gray-500 font-medium"
              >Active Branches</span
            >
            <Building2 class="w-4 h-4 text-primaryColor flex-shrink-0" />
          </div>
          <div class="text-2xl font-bold text-gray-900">
            {{ props.kpis.activeBranches }}
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body p-4 flex flex-col gap-2">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-gray-500 font-medium">Payroll MTD</span>
            <PhilippinePeso class="w-4 h-4 text-primaryColor flex-shrink-0" />
          </div>
          <div class="text-2xl font-bold text-gray-900">
            ₱{{
              Number(props.kpis.payrollMtd || 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
            }}
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body p-4 flex flex-col gap-2">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm text-gray-500 font-medium"
              >Payroll Approvals</span
            >
            <LayoutDashboard class="w-4 h-4 text-primaryColor flex-shrink-0" />
          </div>
          <div class="text-2xl font-bold text-gray-900">
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
          <h3 class="font-bold text-lg">Branch Performance</h3>
          <div class="join">
            <button
              class="btn btn-xs join-item"
              :class="
                sortMode === 'top'
                  ? 'bg-primaryColor text-white font-thin'
                  : 'btn-ghost'
              "
              @click="sortMode = 'top'"
            >
              Top
            </button>
            <button
              class="btn btn-xs join-item"
              :class="
                sortMode === 'least'
                  ? 'bg-primaryColor text-white font-thin'
                  : 'btn-ghost'
              "
              @click="sortMode = 'least'"
            >
              Least
            </button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th class="w-16 text-center">Rank</th>
                <th>Branch</th>
                <th class="text-right">Sales</th>
                <th class="text-right">Average Transaction</th>
                <th class="text-right">Growth</th>
                <th class="text-right">Out of Stock</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(b, idx) in sortedBranches" :key="b.name">
                <td class="text-center">
                  <span
                    class="px-2 py-0.5 text-xs font-bold rounded-full"
                    :class="
                      idx === 0
                        ? 'bg-yellow-100 text-yellow-700'
                        : idx === 1
                          ? 'bg-gray-200 text-gray-700'
                          : idx === 2
                            ? 'bg-amber-200 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                    "
                  >
                    {{ idx + 1 }}
                  </span>
                </td>
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
                <td class="text-right">
                  <template v-if="Number(b.oos || 0) > 0">
                    <div
                      class="tooltip tooltip-left inline-block"
                      :data-tip="getOosTooltip(b)"
                    >
                      <span class="underline decoration-dotted cursor-help">
                        {{ Number(b.oos || 0) }}
                      </span>
                    </div>
                  </template>
                  <template v-else>
                    <span class="text-gray-500">{{ Number(b.oos || 0) }}</span>
                  </template>
                </td>
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
            v-for="(a, idx) in combinedAlerts"
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
