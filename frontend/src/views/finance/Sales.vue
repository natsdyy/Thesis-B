<script setup>
  import { computed, ref, onMounted, watch } from 'vue';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import SalesTrendsChart from '../../components/branch/SalesTrendsChart.vue';
  import RemitOrderDetailsModal from '../../components/finance/RemitOrderDetailsModal.vue';

  const branchContext = useBranchContextStore();

  const isSuperAdmin = computed(() => branchContext.isSuperAdmin);
  const availableBranches = computed(
    () => branchContext.availableBranches || []
  );
  const currentBranch = computed(() => branchContext.currentBranch);

  // Filters
  const period = ref('today');
  const selectedBranchId = ref(null);
  const activeTab = ref('overview'); // overview | branches | analytics
  const overallMetric = ref('remitted');
  const page = ref(1);
  const pageSize = 10;
  const overviewPage = ref(1);
  const overviewPageSize = 10;

  // Mock remitted sales data
  const mockRemittances = ref([]);
  const loading = ref(false);
  // Inline details panel (appears under the branch table)
  const selectedEntry = ref(null);
  const detailsMetric = ref('remitted');
  const detailsLabels = ref([]);
  const detailsSeries = ref([]);
  const detailsLoading = ref(false);
  const showRemitModal = ref(false);

  const initialize = async () => {
    if (!currentBranch.value) {
      await branchContext.initializeBranchContext();
    }
    selectedBranchId.value = currentBranch.value?.id ?? null;
    await loadMockRemits();
  };

  const loadMockRemits = async () => {
    loading.value = true;
    try {
      // Simple deterministic mock data
      const branches = (
        availableBranches.value && availableBranches.value.length
          ? availableBranches.value
          : [
              { id: 1, name: 'Main Branch' },
              { id: 2, name: 'Downtown Branch' },
              { id: 3, name: 'Uptown Branch' },
            ]
      ).map((b) => ({ id: b.id, name: b.name }));

      const MANILA_TZ = 'Asia/Manila';
      const MANILA_OFFSET = '+08:00';

      const toManilaYmd = (date) => {
        const fmt = new Intl.DateTimeFormat('en-CA', {
          timeZone: MANILA_TZ,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        return fmt.format(date); // en-CA yields YYYY-MM-DD
      };

      const manilaEpochFromLabel = (label) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
          return Date.parse(`${label}T00:00:00${MANILA_OFFSET}`);
        }
        if (/^\d{4}-\d{2}$/.test(label)) {
          return Date.parse(`${label}-01T00:00:00${MANILA_OFFSET}`);
        }
        return Date.now();
      };

      const now = new Date();

      const base =
        period.value === 'today'
          ? [0]
          : period.value === 'week'
            ? Array.from({ length: 7 }, (_, i) => i)
            : period.value === 'month'
              ? Array.from({ length: 30 }, (_, i) => i)
              : Array.from({ length: 12 }, (_, i) => i);

      const rows = [];
      branches.forEach((br) => {
        const entries = base.map((offset) => {
          const d = new Date(now);
          if (period.value === 'year') {
            d.setMonth(d.getMonth() - (base.length - 1 - offset));
            d.setDate(1);
          } else {
            d.setDate(d.getDate() - (base.length - 1 - offset));
          }
          const gross = Math.round(5000 + Math.random() * 20000);
          const refunds = Math.round(Math.random() * 500);
          const disposed = Math.round(Math.random() * 10);
          const net = gross - refunds;
          const remit = net; // for mock, remitted equals net sales
          return {
            id: `${br.id}-${offset}`,
            branch_id: br.id,
            branch_name: br.name,
            period_label:
              period.value === 'year'
                ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                : toManilaYmd(d),
            gross_sales: gross,
            refunds,
            disposed,
            net_sales: net,
            remitted_amount: remit,
            cashier_count: Math.ceil(1 + Math.random() * 4),
            submitted_by: 'Manager',
            submitted_at: d.toISOString(),
          };
        });
        rows.push({ branch_id: br.id, branch_name: br.name, entries });
      });

      mockRemittances.value = rows;

      // expose helpers for other computations
      window.__manilaHelpers = { manilaEpochFromLabel };
    } finally {
      loading.value = false;
    }
  };

  const onSelectBranch = (e) => {
    selectedBranchId.value = Number(e.target.value);
  };

  // Aggregations across branches for Overview/Analytics
  const filteredRows = computed(() => {
    if (!mockRemittances.value) return [];
    const branchFilter = selectedBranchId.value;
    if (!branchFilter || branchFilter === 0) return mockRemittances.value;
    return mockRemittances.value.filter((r) => r.branch_id === branchFilter);
  });

  const flattenedEntries = computed(() => {
    return filteredRows.value.flatMap((r) => r.entries || []);
  });

  const overviewTotals = computed(() => {
    const totals = { gross: 0, net: 0, refunds: 0, disposed: 0, remitted: 0 };
    flattenedEntries.value.forEach((e) => {
      totals.gross += Number(e.gross_sales) || 0;
      totals.net += Number(e.net_sales) || 0;
      totals.refunds += Number(e.refunds) || 0;
      totals.disposed += Number(e.disposed) || 0;
      totals.remitted += Number(e.remitted_amount) || 0;
    });
    return totals;
  });

  const analyticsLabels = computed(() => {
    const labels = Array.from(
      new Set(flattenedEntries.value.map((e) => e.period_label))
    );
    // Sort YMD or YYYY-MM labels
    return labels.sort();
  });

  const analyticsSeries = computed(() => {
    const map = Object.create(null);
    analyticsLabels.value.forEach((l) => (map[l] = 0));
    flattenedEntries.value.forEach((e) => {
      const key = e.period_label;
      if (!(key in map)) map[key] = 0;
      const metric =
        overallMetric.value === 'refunds'
          ? Number(e.refunds) || 0
          : overallMetric.value === 'disposed'
            ? Number(e.disposed) || 0
            : overallMetric.value === 'net'
              ? Number(e.net_sales) || 0
              : Number(e.remitted_amount) || 0;
      map[key] += metric;
    });
    return analyticsLabels.value.map((l) => Math.round(map[l] || 0));
  });

  // Recent activity for Overview (latest entries across branches)
  const allRecentActivities = computed(() => {
    const entries = flattenedEntries.value.map((e) => {
      // parse YMD or YYYY-MM to a comparable date value
      const label = String(e.period_label || '');
      const MANILA_OFFSET = '+08:00';
      let dateVal = Date.now();
      if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
        dateVal = Date.parse(`${label}T00:00:00${MANILA_OFFSET}`);
      } else if (/^\d{4}-\d{2}$/.test(label)) {
        dateVal = Date.parse(`${label}-01T00:00:00${MANILA_OFFSET}`);
      }
      return { ...e, _dateVal: dateVal };
    });
    entries.sort((a, b) => b._dateVal - a._dateVal);
    return entries;
  });

  const recentActivities = computed(() => {
    const start = (overviewPage.value - 1) * overviewPageSize;
    return allRecentActivities.value.slice(start, start + overviewPageSize);
  });

  const overviewTotalPages = computed(() =>
    Math.max(
      1,
      Math.ceil((allRecentActivities.value.length || 0) / overviewPageSize)
    )
  );

  // Helper: ensure a concrete branch is selected for Branches tab display
  const branchIdToShow = computed(() => {
    const list =
      availableBranches.value && availableBranches.value.length
        ? availableBranches.value
        : [
            { id: 1, name: 'Main Branch' },
            { id: 2, name: 'Downtown Branch' },
            { id: 3, name: 'Uptown Branch' },
          ];
    if (!selectedBranchId.value || selectedBranchId.value === 0) {
      return list[0]?.id ?? null;
    }
    return selectedBranchId.value;
  });

  const currentRow = computed(() => {
    return (
      mockRemittances.value.find(
        (r) => r.branch_id === branchIdToShow.value
      ) || { entries: [], branch_name: '', branch_id: null }
    );
  });

  const totalEntries = computed(
    () => (currentRow.value.entries && currentRow.value.entries.length) || 0
  );
  const totalPages = computed(() =>
    Math.max(1, Math.ceil(totalEntries.value / pageSize))
  );
  const visibleEntries = computed(() => {
    const entries = currentRow.value.entries || [];
    const start = (page.value - 1) * pageSize;
    return entries.slice(start, start + pageSize);
  });

  const selectEntry = (entry) => {
    selectedEntry.value = entry;
    detailsMetric.value = 'remitted';
    buildDetailsChart();
  };

  const buildDetailsChart = () => {
    if (!selectedEntry.value) return;
    detailsLoading.value = true;
    try {
      const total =
        detailsMetric.value === 'refunds'
          ? Number(selectedEntry.value.refunds) || 0
          : detailsMetric.value === 'disposed'
            ? Number(selectedEntry.value.disposed) || 0
            : detailsMetric.value === 'net'
              ? Number(selectedEntry.value.net_sales) || 0
              : Number(selectedEntry.value.remitted_amount) || 0;
      const labels = [];
      const points = [];
      let n = 24;
      if (period.value === 'today') {
        n = 24;
        for (let i = 0; i < n; i++) {
          labels.push(`${String(i).padStart(2, '0')}:00`);
        }
      } else if (period.value === 'week') {
        n = 7;
        for (let i = 0; i < n; i++) labels.push(`Day ${i + 1}`);
      } else if (period.value === 'month') {
        n = 30;
        for (let i = 0; i < n; i++) labels.push(`${i + 1}`);
      } else {
        // year
        n = 12;
        const monthNames = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        for (let i = 0; i < n; i++) labels.push(monthNames[i]);
      }
      let remaining = total;
      for (let i = 0; i < n; i++) {
        const base = total / n;
        const variance = (Math.random() - 0.5) * base * 0.3;
        let value = Math.max(0, base + variance);
        if (detailsMetric.value === 'disposed') value = Math.round(value);
        points.push(value);
        remaining -= value;
      }
      if (points.length > 0) {
        let v = Math.max(0, points[points.length - 1] + remaining);
        points[points.length - 1] =
          detailsMetric.value === 'disposed' ? Math.round(v) : v;
      }
      detailsLabels.value = labels;
      detailsSeries.value = points.map((v) => Math.round(v));
    } finally {
      detailsLoading.value = false;
    }
  };

  // Auto-select most recent entry based on branch and period
  watch([mockRemittances, branchIdToShow, period], () => {
    const row = mockRemittances.value.find(
      (r) => r.branch_id === branchIdToShow.value
    );
    if (row && row.entries && row.entries.length) {
      selectedEntry.value = row.entries[row.entries.length - 1];
      buildDetailsChart();
    } else {
      selectedEntry.value = null;
      detailsLabels.value = [];
      detailsSeries.value = [];
    }
  });

  // Reset pagination when branch or period changes
  watch([branchIdToShow, period], () => {
    page.value = 1;
    overviewPage.value = 1;
  });

  const openRemitForBranch = async (row) => {
    try {
      if (
        isSuperAdmin.value &&
        row?.branch_id &&
        currentBranch.value?.id !== row.branch_id
      ) {
        await branchContext.setCurrentBranch(row.branch_id);
      }
      showRemitModal.value = true;
    } catch (e) {
      console.error('Failed to open remit modal for branch', e);
      showRemitModal.value = true; // still open with current context as fallback
    }
  };
  const closeRemitModal = () => {
    showRemitModal.value = false;
  };

  onMounted(() => {
    initialize();
  });
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
    >
      <div>
        <h1 class="text-2xl font-bold text-primaryColor">Remitted Sales</h1>
        <p class="text-sm text-gray-600">
          Finance view of per-branch remittances
        </p>
      </div>
      <div class="flex flex-wrap gap-2 items-center">
        <select
          v-model="period"
          @change="loadMockRemits"
          class="select select-bordered select-sm"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
        <div class="flex items-center gap-2">
          <label class="text-sm text-gray-600">Branch</label>
          <select
            class="select select-bordered select-sm"
            :value="selectedBranchId"
            @change="onSelectBranch"
          >
            <option :value="0">All</option>
            <option v-for="b in availableBranches" :key="b.id" :value="b.id">
              {{ b.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed w-full">
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'overview' }"
        @click="activeTab = 'overview'"
      >
        <font-awesome-icon icon="fa-solid fa-chart-pie" class="mr-2" />
        Overview
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'branches' }"
        @click="activeTab = 'branches'"
      >
        <font-awesome-icon icon="fa-solid fa-store" class="mr-2" />
        Branches
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'analytics' }"
        @click="activeTab = 'analytics'"
      >
        <font-awesome-icon icon="fa-solid fa-chart-line" class="mr-2" />
        Analytics
      </a>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="loading loading-spinner loading-lg text-primaryColor"></div>
    </div>
    <div v-else>
      <!-- OVERVIEW TAB -->
      <div v-show="activeTab === 'overview'" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div class="card bg-white shadow border border-black/10">
            <div class="card-body py-4">
              <div class="text-xs text-gray-500">Gross Sales</div>
              <div class="text-lg font-semibold text-primaryColor">
                <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                  overviewTotals.gross.toLocaleString()
                }}
              </div>
            </div>
          </div>
          <div class="card bg-white shadow border border-black/10">
            <div class="card-body py-4">
              <div class="text-xs text-gray-500">Net Sales</div>
              <div class="text-lg font-semibold text-primaryColor">
                <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                  overviewTotals.net.toLocaleString()
                }}
              </div>
            </div>
          </div>
          <div class="card bg-white shadow border border-black/10">
            <div class="card-body py-4">
              <div class="text-xs text-gray-500">Refunds</div>
              <div class="text-lg font-semibold">
                <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                  overviewTotals.refunds.toLocaleString()
                }}
              </div>
            </div>
          </div>
          <div class="card bg-white shadow border border-black/10">
            <div class="card-body py-4">
              <div class="text-xs text-gray-500">Void</div>
              <div class="text-lg font-semibold">
                {{ overviewTotals.disposed.toLocaleString() }}
              </div>
            </div>
          </div>
          <div class="card bg-white shadow border border-black/10">
            <div class="card-body py-4">
              <div class="text-xs text-gray-500">Remitted</div>
              <div class="text-lg font-semibold text-primaryColor">
                <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                  overviewTotals.remitted.toLocaleString()
                }}
              </div>
            </div>
          </div>
        </div>
        <div class="card bg-white shadow border border-black/10">
          <div class="card-body">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-gray-700">Recent Activity</h3>
              <span class="text-xs text-gray-500"
                >Latest across selected branches</span
              >
            </div>
            <div class="overflow-x-auto">
              <table class="table w-full">
                <thead>
                  <tr>
                    <th class="text-xs">Date/Period</th>
                    <th class="text-xs">Branch</th>
                    <th class="text-xs">Gross</th>
                    <th class="text-xs">Net</th>
                    <th class="text-xs">Refunds</th>
                    <th class="text-xs">Void</th>
                    <th class="text-xs">Remitted</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in recentActivities" :key="item.id">
                    <td class="text-xs">{{ item.period_label }}</td>
                    <td class="text-xs">{{ item.branch_name }}</td>
                    <td class="text-xs">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                        item.gross_sales.toLocaleString()
                      }}
                    </td>
                    <td class="text-xs">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                        item.net_sales.toLocaleString()
                      }}
                    </td>
                    <td class="text-xs">{{ item.refunds.toLocaleString() }}</td>
                    <td class="text-xs">{{ item.disposed }}</td>
                    <td class="text-xs font-semibold text-primaryColor">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                        item.remitted_amount.toLocaleString()
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Overview pagination -->
            <div class="mt-3 flex items-center justify-between text-sm">
              <div class="text-gray-600">
                Page {{ overviewPage }} of {{ overviewTotalPages }}
              </div>
              <div class="join">
                <button
                  class="btn btn-xs join-item"
                  :disabled="overviewPage <= 1"
                  @click="overviewPage = Math.max(1, overviewPage - 1)"
                >
                  Prev
                </button>
                <button
                  class="btn btn-xs join-item"
                  :disabled="overviewPage >= overviewTotalPages"
                  @click="
                    overviewPage = Math.min(
                      overviewTotalPages,
                      overviewPage + 1
                    )
                  "
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- BRANCHES TAB -->
      <div v-show="activeTab === 'branches'" class="space-y-6">
        <div
          v-for="row in mockRemittances.filter(
            (r) => r.branch_id === branchIdToShow
          )"
          :key="row.branch_id"
          class="card bg-white shadow border border-black/10"
        >
          <div class="card-body">
            <div class="flex items-center justify-between">
              <h2 class="card-title text-primaryColor">
                {{ row.branch_name }}
              </h2>
            </div>
            <div class="overflow-x-auto mt-2">
              <table class="table w-full">
                <thead>
                  <tr>
                    <th class="text-xs">Period</th>
                    <th class="text-xs">Gross Sales</th>
                    <th class="text-xs">Net Sales</th>
                    <th class="text-xs">Refunds</th>
                    <th class="text-xs">Void</th>
                    <th class="text-xs">Remitted</th>
                    <th class="text-xs">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="entry in visibleEntries"
                    :key="entry.id"
                    class="cursor-pointer hover:bg-gray-50"
                    @click="selectEntry(entry)"
                  >
                    <td class="text-xs">{{ entry.period_label }}</td>
                    <td class="text-xs text-primaryColor font-semibold">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                        entry.gross_sales.toLocaleString()
                      }}
                    </td>
                    <td class="text-xs text-primaryColor">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                        entry.net_sales.toLocaleString()
                      }}
                    </td>
                    <td class="text-xs">
                      {{ entry.refunds.toLocaleString() }}
                    </td>
                    <td class="text-xs">{{ entry.disposed }}</td>
                    <td class="text-xs font-semibold text-primaryColor">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                        entry.remitted_amount.toLocaleString()
                      }}
                    </td>
                    <td class="text-xs">
                      <button
                        class="btn btn-xs btn-outline text-primaryColor"
                        @click.stop="openRemitForBranch(row)"
                      >
                        View Remit
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Pagination controls -->
            <div class="mt-3 flex items-center justify-between text-sm">
              <div class="text-gray-600">
                Page {{ page }} of {{ totalPages }}
              </div>
              <div class="join">
                <button
                  class="btn btn-xs join-item"
                  :disabled="page <= 1"
                  @click="page = Math.max(1, page - 1)"
                >
                  Prev
                </button>
                <button
                  class="btn btn-xs join-item"
                  :disabled="page >= totalPages"
                  @click="page = Math.min(totalPages, page + 1)"
                >
                  Next
                </button>
              </div>
            </div>
            <!-- Inline reactive details -->
            <div v-if="selectedEntry" class="mt-4 space-y-3">
              <div class="divider my-2"></div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div
                  class="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2"
                >
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Period</span>
                    <span class="text-right">{{
                      selectedEntry.period_label
                    }}</span>
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Gross Sales</span>
                    <span class="text-right">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                        selectedEntry.gross_sales.toLocaleString()
                      }}
                    </span>
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Refunds</span>
                    <span class="text-right">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                        selectedEntry.refunds.toLocaleString()
                      }}
                    </span>
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Net Sales</span>
                    <span class="text-right">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                        selectedEntry.net_sales.toLocaleString()
                      }}
                    </span>
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Void Items</span>
                    <span class="text-right">{{ selectedEntry.disposed }}</span>
                  </div>
                  <div class="grid grid-cols-2 font-semibold">
                    <span class="text-gray-600">Remitted Amount</span>
                    <span class="text-right text-primaryColor">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                        selectedEntry.remitted_amount.toLocaleString()
                      }}
                    </span>
                  </div>
                </div>

                <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="text-sm font-medium text-gray-700">Trend</h4>
                    <select
                      class="select select-bordered select-xs"
                      v-model="detailsMetric"
                      @change="buildDetailsChart"
                    >
                      <option value="remitted">Remitted</option>
                      <option value="refunds">Refunds</option>
                      <option value="disposed">Void</option>
                      <option value="net">Net Sales</option>
                    </select>
                  </div>
                  <div v-if="detailsLoading" class="flex justify-center py-8">
                    <div
                      class="loading loading-spinner loading-md text-primaryColor"
                    ></div>
                  </div>
                  <div v-else>
                    <SalesTrendsChart
                      :labels="detailsLabels"
                      :data="detailsSeries"
                      :metric="
                        detailsMetric === 'remitted' || detailsMetric === 'net'
                          ? 'totalSales'
                          : detailsMetric === 'refunds'
                            ? 'refundedAmount'
                            : 'totalDisposed'
                      "
                    />
                  </div>
                </div>
              </div>
              <div class="flex justify-end">
                <button class="btn btn-xs" @click="selectedEntry = null">
                  Hide details
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="(!mockRemittances || mockRemittances.length === 0) && !loading"
          class="text-center text-gray-500 py-12"
        >
          No remittances found.
        </div>
      </div>

      <!-- ANALYTICS TAB (duplicate trend selector for convenience) -->
      <div v-show="activeTab === 'analytics'" class="space-y-4">
        <div class="card bg-white shadow border border-black/10">
          <div class="card-body">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-gray-700">Overall Trend</h3>
              <select
                class="select select-bordered select-xs"
                v-model="overallMetric"
              >
                <option value="remitted">Remitted</option>
                <option value="refunds">Refunds</option>
                <option value="disposed">Void</option>
                <option value="net">Net Sales</option>
              </select>
            </div>
            <SalesTrendsChart
              :labels="analyticsLabels"
              :data="analyticsSeries"
              :metric="
                overallMetric === 'remitted' || overallMetric === 'net'
                  ? 'totalSales'
                  : overallMetric === 'refunds'
                    ? 'refundedAmount'
                    : 'totalDisposed'
              "
            />
          </div>
        </div>
      </div>
    </div>

    <RemitOrderDetailsModal
      :show="showRemitModal"
      :period="period"
      @close="closeRemitModal"
    />
  </div>
</template>

<style scoped></style>
