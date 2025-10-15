<script setup>
  import { computed, ref, onMounted, watch } from 'vue';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import SalesTrendsChart from '../../components/branch/SalesTrendsChart.vue';
  import SalesTrendChart from '../../components/finance/SalesTrendChart.vue';
  import SalesAnalytics from '../../components/finance/SalesAnalytics.vue';
  import RemitOrderDetailsModal from '../../components/finance/RemitOrderDetailsModal.vue';
  import RemittancesModal from '../../components/finance/RemittancesModal.vue';
  import { usePOSStore } from '../../stores/posStore';
  import { useBranchStore } from '../../stores/branchStore';
  import { useCustomToast } from '../../composables/useCustomToast.js';
  import {
    createPhilippineDate,
    formatForAPI,
  } from '../../utils/timezoneUtils.js';

  const branchContext = useBranchContextStore();
  const branchStore = useBranchStore();
  const posStore = usePOSStore();
  const { showToast } = useCustomToast();

  const isSuperAdmin = computed(() => branchContext.isSuperAdmin);
  const availableBranches = computed(
    () => branchContext.availableBranches || []
  );
  const currentBranch = computed(() => branchContext.currentBranch);

  // Filters
  const period = ref('today');
  // Exact date range (when period === 'dateRange')
  const startDate = ref(''); // YYYY-MM-DD
  const endDate = ref(''); // YYYY-MM-DD
  // Selected custom month in YYYY-MM when period === 'customMonth'
  const customMonth = ref(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const selectedBranchId = ref(null);
  const activeTab = ref('overview'); // overview | branches | analytics
  // Data source for loading entries: 'remittances' or 'salesTrends'
  const dataSource = ref('remittances');
  const page = ref(1);
  const pageSize = 10;
  const overviewPage = ref(1);
  const overviewPageSize = 10;

  // Real remitted sales data (per-branch entries)
  const mockRemittances = ref([]);
  const loading = ref(false);
  // Inline details panel (appears under the branch table)
  const selectedEntry = ref(null);
  const detailsMetric = ref('remitted');
  const detailsLabels = ref([]);
  const detailsSeries = ref([]);
  const detailsLoading = ref(false);
  const showRemitModal = ref(false);
  const showFinanceRemittances = ref(false);
  const selectedRemitBranchId = ref(null);
  const selectedRemittanceId = ref(null);
  const remittanceDateRange = ref(null);
  const realAnalytics = ref({
    labels: [],
    remitted: [],
    refunds: [],
    disposed: [],
    net: [],
  });
  const pendingCount = ref(0);

  // Fallback branches for selector
  const displayBranches = computed(() => {
    const ctxList = availableBranches.value || [];
    if (Array.isArray(ctxList) && ctxList.length) return ctxList;
    const activeList = branchStore.activeBranches || [];
    if (Array.isArray(activeList) && activeList.length) return activeList;
    return currentBranch.value ? [currentBranch.value] : [];
  });

  const initialize = async () => {
    if (!currentBranch.value) {
      await branchContext.initializeBranchContext();
    }
    selectedBranchId.value = currentBranch.value?.id ?? null;
    // Fallback for Super Admin: if no branches loaded, fetch active branches
    if (
      (availableBranches.value?.length || 0) === 0 &&
      branchContext.isSuperAdmin
    ) {
      await branchStore.fetchActiveBranches();
    }
    await loadRealRemits();
    await loadPendingCount();
  };

  const loadRealRemits = async () => {
    loading.value = true;
    try {
      const branches = (
        availableBranches.value && availableBranches.value.length
          ? availableBranches.value
          : []
      ).map((b) => ({ id: b.id, name: b.name }));

      // if none provided from store, fallback to current branch only
      const effective = branches.length
        ? branches
        : currentBranch.value
          ? [{ id: currentBranch.value.id, name: currentBranch.value.name }]
          : [];

      // posStore instantiated at top-level

      const getDateRange = () => {
        const now = new Date();
        const build = (start, end, bucket) => ({
          from: start.toISOString(),
          to: end.toISOString(),
          startMs: start.getTime(),
          endMs: end.getTime(),
          bucket,
        });

        if (period.value === 'dateRange') {
          // Use exact Philippine dates, inclusive of entire days
          const today = new Date();
          const [sy, sm, sd] = String(startDate.value || '')
            .split('-')
            .map((v) => Number(v));
          const [ey, em, ed] = String(endDate.value || '')
            .split('-')
            .map((v) => Number(v));
          const fallbackStart = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            0,
            0,
            0,
            0
          );
          const fallbackEnd = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            23,
            59,
            59,
            999
          );
          const start =
            Number.isFinite(sy) && Number.isFinite(sm) && Number.isFinite(sd)
              ? createPhilippineDate(sy, sm, sd, 0, 0, 0)
              : fallbackStart;
          const end =
            Number.isFinite(ey) && Number.isFinite(em) && Number.isFinite(ed)
              ? createPhilippineDate(ey, em, ed, 23, 59, 59)
              : fallbackEnd;
          const msDiff = end.getTime() - start.getTime();
          const oneDayMs = 24 * 60 * 60 * 1000;
          const bucket = msDiff <= oneDayMs ? 'hour' : 'day';
          return build(start, end, bucket);
        }

        if (period.value === 'today') {
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
          return build(start, end, 'hour');
        }
        if (period.value === 'week') {
          // For "This Week", show from Monday of current week to today
          // or from the start of the month if we're in the first week
          const currentDate = new Date(now);
          const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const dayOfMonth = currentDate.getDate();

          // If we're in the first week of the month (days 1-7), start from the 1st
          // Otherwise, start from Monday of current week
          let start;
          if (dayOfMonth <= 7) {
            // First week of month - start from 1st
            start = new Date(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              1,
              0,
              0,
              0,
              0
            );
          } else {
            // Regular week - start from Monday
            const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Handle Sunday as 6 days from Monday
            start = new Date(currentDate);
            start.setDate(currentDate.getDate() - daysFromMonday);
            start.setHours(0, 0, 0, 0);
          }

          const end = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999
          );
          return build(start, end, 'day');
        }
        if (period.value === 'customMonth') {
          const ym = String(customMonth.value || '').trim();
          const [yStr, mStr] = ym.split('-');
          const year = Number(yStr);
          const monthIndex = Number(mStr) - 1;
          const start =
            Number.isFinite(year) && Number.isFinite(monthIndex)
              ? new Date(year, monthIndex, 1, 0, 0, 0, 0)
              : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          const end =
            Number.isFinite(year) && Number.isFinite(monthIndex)
              ? new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
              : new Date(
                  now.getFullYear(),
                  now.getMonth() + 1,
                  0,
                  23,
                  59,
                  59,
                  999
                );
          return build(start, end, 'day');
        }
        if (period.value === 'month') {
          const start = new Date(
            now.getFullYear(),
            now.getMonth(),
            1,
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
          return build(start, end, 'day');
        }
        // year
        const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        const end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
        return build(start, end, 'month');
      };

      const { from, to, bucket, startMs, endMs } = getDateRange();
      // We filter by actual dates only. Ignore period_type entirely.
      const desiredType = null;
      const normalizedPeriod =
        period.value === 'customMonth'
          ? 'month'
          : period.value === 'dateRange'
            ? 'month'
            : period.value;

      const fetchers = {
        remittances: async (br) => {
          const { data: list } = await posStore.fetchRemittances({
            branchId: br.id,
            status: 'approved',
            // Do not pass date range here; we'll filter by approved_at client-side
            limit: 1000,
          });
          const filtered = (list || []).filter((r) => {
            const t = new Date(
              r.approved_at || r.created_at || r.date_to || r.date_from
            ).getTime();
            return Number.isFinite(t) ? t >= startMs && t <= endMs : true;
          });
          const entries = filtered
            .map((r) => {
              const df = r.date_from ? new Date(r.date_from) : null;
              const ym = df
                ? `${df.getFullYear()}-${String(df.getMonth() + 1).padStart(2, '0')}`
                : String(r.date_from || '').slice(0, 7);
              const ymd = df
                ? `${df.getFullYear()}-${String(df.getMonth() + 1).padStart(2, '0')}-${String(
                    df.getDate()
                  ).padStart(2, '0')}`
                : String(r.date_from || '').slice(0, 10);
              const label = r.period_type === 'month' ? ym : ymd;
              const derivedVoided = Math.max(
                0,
                Number(r.gross_sales || 0) -
                  Number(r.refunded_amount || 0) -
                  Number(r.net_sales || 0) || 0
              );
              return {
                id: String(r.id),
                branch_id: r.branch_id || br.id,
                branch_name: br.name,
                period_label: label,
                gross_sales: Number(r.gross_sales || 0),
                refunds: Number(r.refunded_amount || 0),
                disposed: Number(r.disposed || 0),
                voided_amount:
                  r.voided_amount !== undefined && r.voided_amount !== null
                    ? Number(r.voided_amount)
                    : derivedVoided,
                net_sales: Number(r.net_sales || 0),
                remitted_amount: Number(r.remitted_amount || 0),
                cashier_count: 0,
                submitted_by:
                  `${r.submitted_first_name || ''} ${r.submitted_last_name || ''}`.trim(),
                submitted_at: r.created_at || r.approved_at || '',
                _ts: new Date(
                  r.date_from || r.approved_at || r.created_at || Date.now()
                ).getTime(),
              };
            })
            .sort((a, b) => a._ts - b._ts);
          return { branch_id: br.id, branch_name: br.name, entries };
        },
        salesTrends: async (br) => {
          const data = await posStore.fetchSalesTrends(br.id, {
            dateFrom: from,
            dateTo: to,
            period: normalizedPeriod,
            bucket: 'auto',
          });
          const labels = Array.isArray(data.labels) ? data.labels : [];
          const grossArr = data.gross_sales || [];
          const refundsArr = data.refunds || data.refunded_amount || [];
          const disposedArr = data.disposed || [];
          const netArr = data.net_sales || [];
          const remitArr = data.remitted_amount || [];
          const entries = labels.map((label, idx) => ({
            id: `${br.id}-${label}`,
            branch_id: br.id,
            branch_name: br.name,
            period_label: label,
            gross_sales: Number(grossArr[idx] || 0),
            refunds: Number(refundsArr[idx] || 0),
            disposed: Number(disposedArr[idx] || 0),
            net_sales: Number(netArr[idx] || 0),
            remitted_amount: Number(remitArr[idx] || 0),
            cashier_count: 0,
            submitted_by: '',
            submitted_at: '',
          }));
          return { branch_id: br.id, branch_name: br.name, entries };
        },
      };

      const activeFetcher =
        period.value === 'customMonth'
          ? fetchers.salesTrends
          : fetchers[dataSource.value] || fetchers.remittances;
      let rows = [];
      if (effective.length > 0) {
        rows = await Promise.all(effective.map((br) => activeFetcher(br)));
      } else {
        // Fallback: fetch all remittances and group by branch
        const { data: allList } = await posStore.fetchRemittances({
          status: 'approved',
          limit: 1000,
        });
        const grouped = {};
        const list = Array.isArray(allList) ? allList : [];
        const filtered = list.filter((r) => {
          const t = new Date(
            r.approved_at || r.created_at || r.date_to || r.date_from
          ).getTime();
          return Number.isFinite(t) ? t >= startMs && t <= endMs : true;
        });
        filtered.forEach((r) => {
          const bid = r.branch_id;
          if (!grouped[bid]) grouped[bid] = [];
          grouped[bid].push(r);
        });
        rows = Object.entries(grouped).map(([bid, arr]) => ({
          branch_id: Number(bid),
          branch_name:
            arr[0]?.branch_name ||
            (availableBranches.value || []).find((b) => b.id === Number(bid))
              ?.name ||
            `Branch ${bid}`,
          entries: arr
            .map((r) => ({
              id: String(r.id),
              branch_id: r.branch_id,
              branch_name:
                r.branch_name ||
                (availableBranches.value || []).find(
                  (b) => b.id === Number(bid)
                )?.name ||
                `Branch ${bid}`,
              period_label: (() => {
                const df = r.date_from ? new Date(r.date_from) : null;
                const ym = df
                  ? `${df.getFullYear()}-${String(df.getMonth() + 1).padStart(2, '0')}`
                  : String(r.date_from || '').slice(0, 7);
                const ymd = df
                  ? `${df.getFullYear()}-${String(df.getMonth() + 1).padStart(2, '0')}-${String(
                      df.getDate()
                    ).padStart(2, '0')}`
                  : String(r.date_from || '').slice(0, 10);
                return r.period_type === 'month' ? ym : ymd;
              })(),
              gross_sales: Number(r.gross_sales || 0),
              refunds: Number(r.refunded_amount || 0),
              disposed: Number(r.disposed || 0),
              voided_amount:
                r.voided_amount !== undefined && r.voided_amount !== null
                  ? Number(r.voided_amount)
                  : Math.max(
                      0,
                      Number(r.gross_sales || 0) -
                        Number(r.refunded_amount || 0) -
                        Number(r.net_sales || 0) || 0
                    ),
              net_sales: Number(r.net_sales || 0),
              remitted_amount: Number(r.remitted_amount || 0),
              cashier_count: 0,
              submitted_by:
                `${r.submitted_first_name || ''} ${r.submitted_last_name || ''}`.trim(),
              submitted_at: r.created_at || r.approved_at || '',
              _ts: new Date(
                r.date_from || r.approved_at || r.created_at || Date.now()
              ).getTime(),
            }))
            .sort((a, b) => a._ts - b._ts),
        }));
      }

      mockRemittances.value = rows;

      // Auto-select latest entry for the current branch/period without requiring a click
      const preferredBranchId =
        branchIdToShow.value ?? rows[0]?.branch_id ?? null;
      const targetRow =
        rows.find((r) => r.branch_id === preferredBranchId) || rows[0];
      if (targetRow && targetRow.entries && targetRow.entries.length) {
        selectedEntry.value = targetRow.entries[targetRow.entries.length - 1];
      } else {
        selectedEntry.value = null;
      }

      // Build analytics from actual remittance data across selected branches
      // Since this is the "Remitted Sales" page, ALL data should come from remittances
      try {
        const branchesForAnalytics =
          selectedBranchId.value && selectedBranchId.value !== 0
            ? rows.filter((r) => r.branch_id === selectedBranchId.value)
            : rows;

        // Fetch remittances for all branches in the analytics scope
        const remittancePromises = branchesForAnalytics.map((r) =>
          posStore.fetchRemittances({
            branchId: r.branch_id,
            status: 'approved',
            limit: 1000,
          })
        );
        const remittanceResults = await Promise.all(remittancePromises);

        // Aggregate remittance data by date across all branches
        const dailyMap = new Map();

        remittanceResults.forEach((result) => {
          const remittances = result.data || [];
          remittances.forEach((r) => {
            const approvedAt = new Date(
              r.approved_at || r.created_at || r.date_to || r.date_from
            );
            const startDate = new Date(from);
            const endDate = new Date(to);

            if (approvedAt >= startDate && approvedAt <= endDate) {
              // Convert to Philippine timezone for date key
              const phDate = new Date(
                approvedAt.toLocaleString('en-US', { timeZone: 'Asia/Manila' })
              );
              const dateKey = phDate.toISOString().split('T')[0];

              // Get current totals for this date or initialize
              const current = dailyMap.get(dateKey) || {
                remitted: 0,
                refunds: 0,
                disposed: 0,
                net: 0,
              };

              // Add the remittance amounts
              current.remitted += Number(r.remitted_amount || 0);
              current.refunds += Number(r.refunded_amount || 0);
              current.disposed += Number(r.disposed || 0);
              current.net += Number(r.net_sales || 0);

              dailyMap.set(dateKey, current);
            }
          });
        });

        // Sort dates chronologically
        const sortedDates = Array.from(dailyMap.keys()).sort((a, b) => {
          // Sort dates chronologically, not alphabetically
          return new Date(a) - new Date(b);
        });

        // Build the analytics data arrays
        realAnalytics.value = {
          labels: sortedDates,
          remitted: sortedDates.map((date) =>
            Math.round(dailyMap.get(date)?.remitted || 0)
          ),
          refunds: sortedDates.map((date) =>
            Math.round(dailyMap.get(date)?.refunds || 0)
          ),
          disposed: sortedDates.map((date) =>
            Math.round(dailyMap.get(date)?.disposed || 0)
          ),
          net: sortedDates.map((date) =>
            Math.round(dailyMap.get(date)?.net || 0)
          ),
        };
      } catch (err) {
        console.warn('Analytics trend fetch failed', err);
        realAnalytics.value = {
          labels: [],
          remitted: [],
          refunds: [],
          disposed: [],
          net: [],
        };
      }
    } catch (error) {
      console.error('Failed to load remittances:', error);
      showToast('Failed to load sales data', 'error');
    } finally {
      loading.value = false;
    }
  };

  // Load pending remittance count for current filters
  const loadPendingCount = async () => {
    try {
      const branches = (
        availableBranches.value && availableBranches.value.length
          ? availableBranches.value
          : []
      ).map((b) => ({ id: b.id, name: b.name }));

      const effective = branches.length
        ? branches
        : currentBranch.value
          ? [{ id: currentBranch.value.id, name: currentBranch.value.name }]
          : [];

      // Reuse date range logic
      const now = new Date();
      let start, end;
      if (period.value === 'today') {
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        );
        end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
      } else if (period.value === 'week') {
        const dayOfWeek = now.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start = new Date(now);
        start.setDate(now.getDate() - daysFromMonday);
        start.setHours(0, 0, 0, 0);
        end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
      } else if (period.value === 'customMonth') {
        const ym = String(customMonth.value || '').trim();
        const [yStr, mStr] = ym.split('-');
        const year = Number(yStr);
        const monthIndex = Number(mStr) - 1;
        start =
          Number.isFinite(year) && Number.isFinite(monthIndex)
            ? new Date(year, monthIndex, 1, 0, 0, 0, 0)
            : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end =
          Number.isFinite(year) && Number.isFinite(monthIndex)
            ? new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
            : new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0,
                23,
                59,
                59,
                999
              );
      } else if (period.value === 'dateRange') {
        const [sy, sm, sd] = String(startDate.value || '')
          .split('-')
          .map((v) => Number(v));
        const [ey, em, ed] = String(endDate.value || '')
          .split('-')
          .map((v) => Number(v));
        const today = new Date();
        start =
          Number.isFinite(sy) && Number.isFinite(sm) && Number.isFinite(sd)
            ? createPhilippineDate(sy, sm, sd, 0, 0, 0)
            : new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
                0,
                0,
                0,
                0
              );
        end =
          Number.isFinite(ey) && Number.isFinite(em) && Number.isFinite(ed)
            ? createPhilippineDate(ey, em, ed, 23, 59, 59)
            : new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
                23,
                59,
                59,
                999
              );
      } else if (period.value === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
      } else {
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
      }

      const from = start.getTime();
      const to = end.getTime();

      let count = 0;
      if (effective.length > 0) {
        const results = await Promise.all(
          effective.map((br) =>
            posStore.fetchRemittances({
              branchId: br.id,
              status: 'pending',
              limit: 1000,
            })
          )
        );
        results.forEach((res) => {
          const list = res?.data || [];
          list.forEach((r) => {
            const t = new Date(
              r.created_at || r.date_to || r.date_from
            ).getTime();
            if (Number.isFinite(t) && t >= from && t <= to) count += 1;
          });
        });
      } else {
        const { data } = await posStore.fetchRemittances({
          status: 'pending',
          limit: 1000,
        });
        const list = Array.isArray(data) ? data : [];
        list.forEach((r) => {
          const t = new Date(
            r.created_at || r.date_to || r.date_from
          ).getTime();
          if (Number.isFinite(t) && t >= from && t <= to) count += 1;
        });
      }

      // If a specific branch is chosen, filter to that branch
      if (selectedBranchId.value && selectedBranchId.value !== 0) {
        // Recompute count only for that branch
        const { data } = await posStore.fetchRemittances({
          branchId: selectedBranchId.value,
          status: 'pending',
          limit: 1000,
        });
        const list = Array.isArray(data) ? data : [];
        count = list.filter((r) => {
          const t = new Date(
            r.created_at || r.date_to || r.date_from
          ).getTime();
          return Number.isFinite(t) && t >= from && t <= to;
        }).length;
      }

      pendingCount.value = count;
    } catch (e) {
      pendingCount.value = 0;
    }
  };

  const onSelectBranch = async (e) => {
    selectedBranchId.value = Number(e.target.value);
    await loadRealRemits();
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

  // Rows to render in Branches tab: if "All" is selected (0/null), show all branches
  const rowsToShow = computed(() => {
    const all = mockRemittances.value || [];
    if (!selectedBranchId.value || selectedBranchId.value === 0) return all;
    return all.filter((r) => r.branch_id === selectedBranchId.value);
  });

  // Window for current period (for display)
  const periodWindow = computed(() => {
    const now = new Date();
    let start = new Date(now),
      end = new Date(now);
    if (period.value === 'today') {
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );
      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
    } else if (period.value === 'week') {
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
    } else if (period.value === 'customMonth') {
      const ym = String(customMonth.value || '').trim();
      const [yStr, mStr] = ym.split('-');
      const year = Number(yStr);
      const monthIndex = Number(mStr) - 1;
      start =
        Number.isFinite(year) && Number.isFinite(monthIndex)
          ? new Date(year, monthIndex, 1, 0, 0, 0, 0)
          : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end =
        Number.isFinite(year) && Number.isFinite(monthIndex)
          ? new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
          : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period.value === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
    } else {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
    }
    const startLabel = start.toLocaleString();
    const endLabel = end.toLocaleString();
    return { start, end, startLabel, endLabel };
  });

  // Totals per branch row
  const getRowTotals = (row) => {
    const totals = {
      gross: 0,
      net: 0,
      refunds: 0,
      loss: 0,
      disposed: 0,
      remitted: 0,
      voidedAmount: 0,
    };
    (row?.entries || []).forEach((e) => {
      totals.gross += Number(e.gross_sales) || 0;
      totals.net += Number(e.net_sales) || 0;
      totals.refunds += Number(e.refunds) || 0;
      totals.disposed += Number(e.disposed) || 0;
      totals.remitted += Number(e.remitted_amount) || 0;
      totals.voidedAmount += Number(e.voided_amount) || 0;
      totals.loss += Number(e.voided_amount) || 0;
    });
    return totals;
  };

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

  const buildDetailsChart = async () => {
    if (!selectedEntry.value) return;
    detailsLoading.value = true;
    try {
      // Compute date range for the selected period
      const now = new Date();
      let start,
        end,
        bucket = 'auto';
      if (period.value === 'today') {
        start = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        );
        end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
        bucket = 'hour';
      } else if (period.value === 'week') {
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
        bucket = 'day';
      } else if (period.value === 'customMonth') {
        const ym = String(customMonth.value || '').trim();
        const [yStr, mStr] = ym.split('-');
        const year = Number(yStr);
        const monthIndex = Number(mStr) - 1;
        start =
          Number.isFinite(year) && Number.isFinite(monthIndex)
            ? new Date(year, monthIndex, 1, 0, 0, 0, 0)
            : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end =
          Number.isFinite(year) && Number.isFinite(monthIndex)
            ? new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
            : new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0,
                23,
                59,
                59,
                999
              );
        bucket = 'day';
      } else if (period.value === 'customMonth') {
        const ym = String(customMonth.value || '').trim();
        const [yStr, mStr] = ym.split('-');
        const year = Number(yStr);
        const monthIndex = Number(mStr) - 1;
        start =
          Number.isFinite(year) && Number.isFinite(monthIndex)
            ? new Date(year, monthIndex, 1, 0, 0, 0, 0)
            : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end =
          Number.isFinite(year) && Number.isFinite(monthIndex)
            ? new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
            : new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                0,
                23,
                59,
                59,
                999
              );
        bucket = 'day';
      } else if (period.value === 'dateRange') {
        const [sy, sm, sd] = String(startDate.value || '')
          .split('-')
          .map((v) => Number(v));
        const [ey, em, ed] = String(endDate.value || '')
          .split('-')
          .map((v) => Number(v));
        const today = new Date();
        start =
          Number.isFinite(sy) && Number.isFinite(sm) && Number.isFinite(sd)
            ? createPhilippineDate(sy, sm, sd, 0, 0, 0)
            : new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
                0,
                0,
                0,
                0
              );
        end =
          Number.isFinite(ey) && Number.isFinite(em) && Number.isFinite(ed)
            ? createPhilippineDate(ey, em, ed, 23, 59, 59)
            : new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
                23,
                59,
                59,
                999
              );
        const msDiff = end.getTime() - start.getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        bucket = msDiff <= oneDayMs ? 'hour' : 'day';
      } else if (period.value === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
        bucket = 'day';
      } else {
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        );
        bucket = 'month';
      }

      // Use remittance data when "Remitted" is selected, otherwise use sales trends
      let data;
      if (detailsMetric.value === 'remitted') {
        // Fetch actual remittance data for accurate remitted amounts
        const remittances = await posStore.fetchRemittances({
          branchId: selectedEntry.value.branch_id,
          status: 'approved',
          limit: 1000,
        });

        // Group remittances by date and aggregate amounts
        const dailyMap = new Map();
        (remittances.data || []).forEach((r) => {
          const approvedAt = new Date(
            r.approved_at || r.created_at || r.date_to || r.date_from
          );
          if (approvedAt >= start && approvedAt <= end) {
            const dateKey = approvedAt.toISOString().split('T')[0];
            const prev = dailyMap.get(dateKey) || 0;
            dailyMap.set(dateKey, prev + Number(r.remitted_amount || 0));
          }
        });

        const labels = Array.from(dailyMap.keys()).sort((a, b) => {
          // Sort dates chronologically, not alphabetically
          return new Date(a) - new Date(b);
        });
        const amounts = labels.map((date) => Number(dailyMap.get(date) || 0));

        data = {
          labels: labels,
          remitted_amount: amounts,
        };
      } else {
        // Use regular sales trends for other metrics
        data = await posStore.fetchSalesTrends(selectedEntry.value.branch_id, {
          dateFrom:
            period.value === 'dateRange'
              ? formatForAPI(start)
              : start.toISOString(),
          dateTo:
            period.value === 'dateRange'
              ? formatForAPI(end)
              : end.toISOString(),
          period:
            period.value === 'customMonth'
              ? 'month'
              : period.value === 'dateRange'
                ? 'month'
                : period.value,
          bucket,
        });
      }

      const labels = Array.isArray(data.labels) ? data.labels : [];
      const seriesMap = {
        refunds: data.refunds || [],
        disposed: data.disposed || [],
        net: data.net_sales || [],
        remitted: data.remitted_amount || [],
      };
      const key =
        detailsMetric.value === 'refunds'
          ? 'refunds'
          : detailsMetric.value === 'disposed'
            ? 'disposed'
            : detailsMetric.value === 'net'
              ? 'net'
              : 'remitted';
      const arr = seriesMap[key] || [];
      detailsLabels.value = labels;
      detailsSeries.value = labels.map((_, i) =>
        Math.round(Number(arr[i] || 0))
      );
    } catch (error) {
      console.error('Failed to build details chart:', error);
      showToast('Failed to load chart data', 'error');
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
    loadPendingCount();
  });

  watch([selectedBranchId, customMonth, startDate, endDate], () => {
    loadPendingCount();
  });

  const openRemitForBranch = async (row, specificEntry = null) => {
    try {
      if (
        isSuperAdmin.value &&
        row?.branch_id &&
        currentBranch.value?.id !== row.branch_id
      ) {
        await branchContext.setCurrentBranch(row.branch_id);
        showToast('Branch context updated', 'success');
      }
      selectedRemitBranchId.value = row?.branch_id || null;

      // Use the specific entry if provided, otherwise fall back to the latest
      const targetEntry =
        specificEntry || (row?.entries || [])[row?.entries?.length - 1];
      if (targetEntry && targetEntry.id) {
        // The entry.id should be the actual remittance ID
        selectedRemittanceId.value = Number(targetEntry.id);

        // Set the remittance date range for the chart
        remittanceDateRange.value = null; // Let the modal handle its own date range
      } else {
        selectedRemittanceId.value = null;
        remittanceDateRange.value = null;
      }

      showRemitModal.value = true;
    } catch (e) {
      console.error('Failed to open remit modal for branch', e);
      showToast('Failed to open remittance modal', 'error');
      selectedRemitBranchId.value = row?.branch_id || null;
      selectedRemittanceId.value = null;
      showRemitModal.value = true; // still open with current context as fallback
    }
  };
  const closeRemitModal = () => {
    showRemitModal.value = false;
    selectedRemitBranchId.value = null;
  };

  onMounted(() => {
    initialize();
  });
</script>

<template>
  <div class="space-y-6">
    <div
      class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 justify-between items-center"
    >
      <div>
        <h1 class="text-2xl font-bold text-primaryColor">Remitted Sales</h1>
        <p class="text-sm text-gray-600">
          Finance view of per-branch remittances
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <!-- Period Select -->
        <div>
          <select
            v-model="period"
            @change="loadRealRemits"
            class="select select-bordered select-sm"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="dateRange">Date Range</option>
            <option value="customMonth">Custom Month</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>

        <!-- Custom Month Input -->
        <div v-if="period === 'customMonth'">
          <input
            type="month"
            class="input input-bordered input-sm"
            v-model="customMonth"
            @change="loadRealRemits"
          />
        </div>

        <!-- Exact Date Range Inputs -->
        <div v-if="period === 'dateRange'" class="flex items-center gap-2">
          <input
            type="date"
            class="input input-bordered input-sm"
            v-model="startDate"
            @change="loadRealRemits"
          />
          <span class="text-sm">to</span>
          <input
            type="date"
            class="input input-bordered input-sm"
            v-model="endDate"
            @change="loadRealRemits"
          />
        </div>

        <!-- Branch Filter -->
        <div class="flex items-center gap-2">
          <select
            class="select select-bordered select-sm"
            :value="selectedBranchId"
            @change="onSelectBranch"
          >
            <option :value="0">All</option>
            <option v-for="b in displayBranches" :key="b.id" :value="b.id">
              {{ b.name }}
            </option>
          </select>
        </div>

        <!-- Review Button -->
        <div class="ml-auto">
          <button
            class="btn btn-sm font-thin hover:bg-gray-100 relative"
            @click="showFinanceRemittances = true"
          >
            <font-awesome-icon icon="fa-solid fa-file-invoice" class="mr-2" />
            Review Remittances
            <span
              v-if="pendingCount > 0"
              class="badge badge-error badge-xs absolute -top-2 -right-2"
            >
              {{ pendingCount }}
            </span>
          </button>
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
          v-for="row in rowsToShow"
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
                    <th class="text-xs">Loss (Voids)</th>
                    <th class="text-xs">Void</th>
                    <th class="text-xs">Remitted</th>
                    <th class="text-xs">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="entry in row.branch_id === branchIdToShow
                      ? visibleEntries
                      : row.entries || []"
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
                      ₱{{ Number(entry.refunds || 0).toLocaleString() }}
                    </td>
                    <td class="text-xs">
                      ₱{{ Number(entry.voided_amount || 0).toLocaleString() }}
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
                        @click.stop="openRemitForBranch(row, entry)"
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
            <!-- Always show trend for current branch -->
            <div class="mt-4 space-y-3">
              <div class="divider my-2"></div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div
                  class="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2"
                >
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Branch</span>
                    <span class="text-right">{{ row.branch_name }}</span>
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Period</span>
                    <span class="text-right capitalize">{{ period }}</span>
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Date Range</span>
                    <span class="text-right"
                      >{{ periodWindow.startLabel }} —
                      {{ periodWindow.endLabel }}</span
                    >
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Latest Activity</span>
                    <span class="text-right">{{
                      row.entries?.[row.entries.length - 1]?.period_label || '—'
                    }}</span>
                  </div>
                  <div class="divider my-2"></div>
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Total Entries</span>
                    <span class="text-right">{{
                      row.entries?.length || 0
                    }}</span>
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Gross</span>
                    <span class="text-right text-primaryColor font-semibold">
                      ₱{{ getRowTotals(row).gross.toLocaleString() }}
                    </span>
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Net</span>
                    <span class="text-right text-primaryColor">
                      ₱{{ getRowTotals(row).net.toLocaleString() }}
                    </span>
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Refunds</span>
                    <span class="text-right"
                      >₱{{ getRowTotals(row).refunds.toLocaleString() }}</span
                    >
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Void (Count)</span>
                    <span class="text-right">{{
                      getRowTotals(row).disposed.toLocaleString()
                    }}</span>
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Loss (Voids)</span>
                    <span class="text-right"
                      >₱{{ getRowTotals(row).loss.toLocaleString() }}</span
                    >
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Voided Amount</span>
                    <span class="text-right"
                      >₱{{
                        getRowTotals(row).voidedAmount.toLocaleString()
                      }}</span
                    >
                  </div>
                  <div class="grid grid-cols-2">
                    <span class="text-gray-600">Remitted</span>
                    <span class="text-right text-primaryColor font-semibold">
                      ₱{{ getRowTotals(row).remitted.toLocaleString() }}
                    </span>
                  </div>
                </div>

                <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="text-sm font-medium text-gray-700">Trend</h4>
                    <select
                      class="select select-bordered select-xs"
                      v-model="detailsMetric"
                    >
                      <option value="remitted">Remitted</option>
                      <option value="refunds">Refunds</option>
                      <option value="disposed">Void</option>
                      <option value="net">Net Sales</option>
                    </select>
                  </div>
                  <SalesTrendChart
                    :branch-id="row.branch_id"
                    :period="selectedRemittanceId ? 'dateRange' : period"
                    :metric="detailsMetric"
                    :auto-load="true"
                    :custom-month="customMonth"
                    :remittance-date-range="remittanceDateRange"
                  >
                    <template #default="{ labels, series, loading }">
                      <div v-if="loading" class="flex justify-center py-8">
                        <div
                          class="loading loading-spinner loading-md text-primaryColor"
                        ></div>
                      </div>
                      <div v-else>
                        <SalesTrendsChart
                          :labels="labels"
                          :data="series"
                          :metric="
                            detailsMetric === 'remitted' ||
                            detailsMetric === 'net'
                              ? 'totalSales'
                              : detailsMetric === 'refunds'
                                ? 'refundedAmount'
                                : 'totalDisposed'
                          "
                        />
                      </div>
                    </template>
                  </SalesTrendChart>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="(!rowsToShow || rowsToShow.length === 0) && !loading"
          class="text-center text-gray-500 py-12"
        >
          No remittances found.
        </div>
      </div>

      <!-- ANALYTICS TAB -->
      <div v-show="activeTab === 'analytics'">
        <SalesAnalytics :analytics-data="realAnalytics" :loading="loading" />
      </div>
    </div>

    <RemitOrderDetailsModal
      :show="showRemitModal"
      :period="period"
      :branch-id="selectedRemitBranchId || branchIdToShow"
      :custom-month="customMonth"
      :start-date="startDate"
      :end-date="endDate"
      :remittance-id="selectedRemittanceId"
      @close="closeRemitModal"
    />
    <RemittancesModal
      :show="showFinanceRemittances"
      @close="showFinanceRemittances = false"
      @updated="loadRealRemits()"
    />
  </div>
</template>

<style scoped></style>
