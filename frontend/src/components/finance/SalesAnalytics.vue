<script setup>
  import { ref, computed, watch, onMounted } from 'vue';
  import SalesTrendsChart from '../branch/SalesTrendsChart.vue';
  import BarChartJS from './BarChartJS.vue';
  import SalesForecastChart from './SalesForecastChart.vue';
  import MenuRemittedInventory from './MenuRemittedInventory.vue';
  import { useBranchContextStore } from '../../stores/branchContextStore.js';
  import { useBranchStore } from '../../stores/branchStore.js';
  import { usePOSStore } from '../../stores/posStore.js';
  import { getCurrentPhilippineTime } from '../../utils/timezoneUtils.js';

  const props = defineProps({
    analyticsData: {
      type: Object,
      required: true,
      default: () => ({
        labels: [],
        remitted: [],
        refunds: [],
        disposed: [],
        net: [],
      }),
    },
    loading: {
      type: Boolean,
      default: false,
    },
  });

  // Analytics tab state
  const activeAnalyticsTab = ref('trends'); // 'trends' | 'forecasting' | 'inventory'
  const overallMetric = ref('remitted');

  // Forecasting state
  const forecastType = ref('branch'); // 'branch' | 'product'
  const forecastPeriod = ref('week'); // 'week' | 'month' | 'quarter'
  const selectedBranch = ref('all'); // 'all' | specific branch id
  const selectedProduct = ref('all'); // 'all' | specific product id
  const productForecastMetric = ref('amount'); // 'amount' | 'orders'
  const forecastDays = ref(7); // Number of days to forecast
  const forecastMethod = ref('linear'); // 'linear' | 'exponential'
  const forecastData = ref(null);
  const forecastLoading = ref(false);
  const historicalDataArr = ref([]);
  // Cash flow & remittance forecast
  const cashFlowLoading = ref(false);
  const cashFlow = ref({
    byBranch: [],
    totals: { daily7: 0, weekly4: 0, monthly1: 0 },
  });

  // Stores for real data
  const branchContext = useBranchContextStore();
  const posStore = usePOSStore();
  const branchStore = useBranchStore();

  // Real branches from store
  const allBranches = computed(() => {
    // Prefer full active list from branchStore when available
    const active = branchStore.activeBranches || [];
    const source = active.length
      ? active
      : branchContext.availableBranches || [];
    const mapped = Array.isArray(source)
      ? source.map((b) => ({ id: b.id, name: b.name }))
      : [];
    if (mapped.length === 0 && branchContext.currentBranch) {
      mapped.push({
        id: branchContext.currentBranch.id,
        name: branchContext.currentBranch.name || 'Current Branch',
      });
    }
    return [{ id: 'all', name: 'All Branches' }, ...mapped];
  });

  // Real products fetched from backend per branch context
  const products = ref([{ id: 'all', name: 'All Products' }]);
  const forecastTimer = ref(null);

  const loadProducts = async () => {
    try {
      const activeList = branchStore.activeBranches || [];
      const ctxList = branchContext.availableBranches || [];
      const baseList = activeList.length ? activeList : ctxList;
      const ids =
        selectedBranch.value === 'all'
          ? baseList.length
            ? baseList.map((b) => b.id)
            : branchContext.currentBranch
              ? [branchContext.currentBranch.id]
              : []
          : [parseInt(selectedBranch.value)];

      const lists = await Promise.all(
        ids.map((bid) =>
          posStore.fetchBranchMenuItems(bid, { includeUnavailable: true })
        )
      );
      const merged = new Map();
      lists.flat().forEach((it) => {
        if (!merged.has(it.id)) merged.set(it.id, { id: it.id, name: it.name });
      });
      const arr = Array.from(merged.values()).sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      );
      products.value = [{ id: 'all', name: 'All Products' }, ...arr];
      if (
        !products.value.find((p) => p.id === selectedProduct.value) &&
        selectedProduct.value !== 'all'
      ) {
        selectedProduct.value = 'all';
      }
    } catch (e) {
      products.value = [{ id: 'all', name: 'All Products' }];
      selectedProduct.value = 'all';
    }
  };

  const scheduleForecast = () => {
    if (forecastTimer.value) clearTimeout(forecastTimer.value);
    forecastTimer.value = setTimeout(() => {
      generateForecast();
    }, 150);
  };

  const analyticsLabels = computed(() => props.analyticsData.labels || []);

  // Align forecast horizon to selected period unless user explicitly overrides to a larger value
  const derivedForecastDays = computed(() => {
    const base =
      forecastPeriod.value === 'quarter'
        ? 90
        : forecastPeriod.value === 'month'
          ? 30
          : 7; // week
    const user = Number(forecastDays.value || 0);
    // If user entered a number, honor it when larger; otherwise use base
    return Number.isFinite(user) && user > base ? user : base;
  });

  const analyticsSeries = computed(() => {
    const a = props.analyticsData;
    if (!a || !Array.isArray(a.labels)) return [];
    return overallMetric.value === 'refunds'
      ? a.refunds
      : overallMetric.value === 'disposed'
        ? a.disposed
        : overallMetric.value === 'net'
          ? a.net
          : a.remitted;
  });

  const chartMetric = computed(() => {
    return overallMetric.value === 'remitted' || overallMetric.value === 'net'
      ? 'totalSales'
      : overallMetric.value === 'refunds'
        ? 'refundedAmount'
        : 'totalDisposed';
  });

  // Dynamic display format for product forecast metrics
  const displayFormat = computed(() => {
    if (
      forecastType.value === 'product' &&
      productForecastMetric.value === 'orders'
    ) {
      return {
        prefix: '',
        suffix: ' orders',
        formatter: (value) => Math.round(value).toLocaleString(),
      };
    }
    return {
      prefix: '₱',
      suffix: '',
      formatter: (value) => Math.round(value).toLocaleString(),
    };
  });

  // Branch remitted leaderboard (daily/weekly/monthly)
  const branchRankLoading = ref(false);
  const branchRankPeriod = ref('day'); // 'day' | 'week' | 'month'
  const branchRank = ref({ labels: [], data: [] });
  const branchRankNet = ref([]);
  const branchRankMax = computed(() => {
    const arr = Array.isArray(branchRank.value?.data)
      ? branchRank.value.data
      : [];
    return arr.reduce((m, v) => Math.max(m, Number(v || 0)), 0) || 1;
  });

  const generateBranchRemitRank = async () => {
    try {
      branchRankLoading.value = true;
      // Determine rolling window using Philippine timezone
      const now = getCurrentPhilippineTime();
      const days =
        branchRankPeriod.value === 'month'
          ? 30
          : branchRankPeriod.value === 'week'
            ? 7
            : 1;
      const start = new Date(now);
      start.setDate(now.getDate() - days);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);

      // Prepare branch list
      const storeList = branchStore.activeBranches || [];
      const ctxList = branchContext.availableBranches || [];
      const list = (storeList.length ? storeList : ctxList) || [];
      const ids = list.length
        ? list.map((b) => b.id)
        : branchContext.currentBranch
          ? [branchContext.currentBranch.id]
          : [];

      const labels = [];
      const data = [];
      const dataNet = [];
      for (const bid of ids) {
        // Fetch actual remittances instead of sales trends
        const remittances = await posStore.fetchRemittances({
          branchId: bid,
          status: 'approved',
          limit: 1000,
        });

        // Filter remittances by date range (now properly stored in Philippine timezone)
        const filteredRemittances = (remittances.data || []).filter((r) => {
          const approvedAt = new Date(r.approved_at || r.created_at);
          return approvedAt >= start && approvedAt <= end;
        });

        // Calculate total remitted amount (only actual remittances)
        const totalRemitted = filteredRemittances.reduce((sum, r) => {
          return sum + Number(r.remitted_amount || 0);
        }, 0);

        // Calculate net sales from remittances only
        const totalNetSales = filteredRemittances.reduce((sum, r) => {
          return sum + Number(r.net_sales || 0);
        }, 0);

        const name = list.find((b) => b.id === bid)?.name || `Branch ${bid}`;
        labels.push(name);
        data.push(Math.round(totalRemitted));
        dataNet.push(Math.round(totalNetSales));
      }
      // Sort by value desc while keeping label alignment
      const pairs = labels.map((l, i) => ({ l, v: data[i], vn: dataNet[i] }));
      pairs.sort((a, b) => b.v - a.v);
      branchRank.value = {
        labels: pairs.map((p) => p.l),
        data: pairs.map((p) => p.v),
      };
      branchRankNet.value = pairs.map((p) => p.vn);
    } finally {
      branchRankLoading.value = false;
    }
  };

  // Generate mock historical data for forecasting
  const generateMockHistoricalData = (days = 30, baseAmount = 50000) => {
    const data = [];
    const labels = [];
    const today = getCurrentPhilippineTime();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Add some realistic variation and trends
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const weekendMultiplier = isWeekend ? 1.3 : 1.0;

      // Add seasonal variation
      const month = date.getMonth();
      const seasonalMultiplier = 1 + 0.2 * Math.sin((month / 12) * 2 * Math.PI);

      // Add random variation
      const randomVariation = 0.8 + Math.random() * 0.4; // ±20% variation

      const amount = Math.round(
        baseAmount * weekendMultiplier * seasonalMultiplier * randomVariation
      );

      labels.push(date.toISOString().split('T')[0]);
      data.push(amount);
    }

    return { labels, data };
  };

  // Enhanced linear regression with trend damping for forecasting
  const calculateLinearRegression = (data) => {
    const y = (Array.isArray(data) ? data : []).map((v) => Number(v) || 0);
    const n = y.length;
    if (n <= 1) {
      return { slope: 0, intercept: y[0] || 0 };
    }
    const x = Array.from({ length: n }, (_, i) => i);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const denominator = n * sumXX - sumX * sumX;
    let slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Calculate average value for trend damping
    const avgValue = sumY / n;

    // Apply trend damping to prevent excessive extrapolation
    // Limit slope to reasonable bounds (±10% of average value per period for more conservative forecasts)
    const maxSlope = avgValue * 0.1; // Maximum 10% growth per period
    const minSlope = -avgValue * 0.1; // Maximum 10% decline per period

    // Apply damping factor based on data length (more data = less damping)
    const dampingFactor = Math.min(1, Math.max(0.5, n / 30)); // 50% damping minimum, full by 30 points

    slope = Math.max(minSlope, Math.min(maxSlope, slope * dampingFactor));

    return { slope, intercept };
  };

  // Exponential smoothing for more stable forecasts
  const calculateExponentialSmoothing = (data, alpha = 0.3) => {
    const y = (Array.isArray(data) ? data : []).map((v) => Number(v) || 0);
    const n = y.length;
    if (n === 0) return { forecast: 0, trend: 0 };
    if (n === 1) return { forecast: y[0], trend: 0 };

    // Simple exponential smoothing
    let smoothed = y[0];
    for (let i = 1; i < n; i++) {
      smoothed = alpha * y[i] + (1 - alpha) * smoothed;
    }

    // Calculate trend using Holt's method
    let trend = 0;
    if (n >= 2) {
      const firstHalf = y.slice(0, Math.floor(n / 2));
      const secondHalf = y.slice(Math.floor(n / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      trend = (secondAvg - firstAvg) / Math.floor(n / 2);

      // Apply trend damping
      const avgValue = y.reduce((a, b) => a + b, 0) / n;
      const maxTrend = avgValue * 0.1; // Max 10% trend per period
      trend = Math.max(-maxTrend, Math.min(maxTrend, trend));
    }

    return { forecast: smoothed, trend };
  };

  // Estimate confidence from historical fit error (MAPE) with small-sample damping
  const computeForecastConfidence = (historical, slope, intercept) => {
    const y = (Array.isArray(historical) ? historical : []).map(
      (v) => Number(v) || 0
    );
    const n = y.length;
    if (n === 0) return 70; // neutral default when no data

    const preds = y.map((_, i) => slope * i + intercept);
    const errors = y.map((actual, i) => Math.abs((preds[i] || 0) - actual));

    const nonZero = y.filter((v) => v > 0);
    let mape = 1;
    if (nonZero.length > 0) {
      const terms = nonZero.map((actual, i) => {
        // Map nonZero index back to original for aligned error
        const origIdx = y.findIndex(
          (v, idx) =>
            v > 0 && y.slice(0, idx).filter((vv) => vv > 0).length === i
        );
        const err = errors[origIdx] || 0;
        return Math.min(1, err / actual);
      });
      mape = terms.reduce((a, b) => a + b, 0) / terms.length;
    } else {
      const mae = errors.reduce((a, b) => a + b, 0) / n;
      const avg = y.reduce((a, b) => a + b, 0) / (n || 1);
      mape = Math.min(1, avg > 0 ? mae / avg : 1);
    }

    let base = 100 * (1 - Math.min(1, mape));
    // Small-sample damping (fewer points → lower confidence)
    const damping = 0.6 + 0.4 * Math.min(1, n / 14); // reaches 1 by 14 points
    const conf = Math.max(50, Math.min(97, Math.round(base * damping)));
    return conf;
  };

  // Simple trailing moving average smoothing
  const movingAverage = (arr, window = 3) => {
    const data = (Array.isArray(arr) ? arr : []).map((v) => Number(v) || 0);
    const n = data.length;
    if (n === 0 || window <= 1) return data.slice();
    const out = new Array(n).fill(0);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += data[i];
      if (i >= window) sum -= data[i - window];
      const denom = Math.min(i + 1, window);
      out[i] = sum / denom;
    }
    return out;
  };

  // Enhanced weekly seasonality calculation with better validation
  const computeWeeklySeasonality = (labels, series) => {
    const y = (Array.isArray(series) ? series : []).map((v) => Number(v) || 0);
    const l = Array.isArray(labels) ? labels : [];
    const sums = new Array(7).fill(0);
    const counts = new Array(7).fill(0);

    // Collect data by day of week
    for (let i = 0; i < y.length && i < l.length; i++) {
      const d = new Date(l[i]);
      if (isNaN(d)) continue;
      const wd = d.getDay();
      sums[wd] += y[i];
      counts[wd] += 1;
    }

    const overallAvg = y.length ? y.reduce((a, b) => a + b, 0) / y.length : 0;
    const factors = new Array(7).fill(1);
    let validDays = 0;

    // Calculate factors with improved validation
    for (let i = 0; i < 7; i++) {
      if (counts[i] >= 2 && overallAvg > 0) {
        // Need at least 2 data points
        const dayAvg = sums[i] / counts[i];
        const factor = dayAvg / overallAvg;

        // Apply conservative bounds (0.5 to 1.8) to prevent extreme seasonality variations
        factors[i] = Math.max(0.5, Math.min(1.8, factor));
        validDays++;
      } else if (counts[i] === 1 && overallAvg > 0) {
        // Single data point - use conservative factor
        const dayAvg = sums[i] / counts[i];
        const factor = Math.max(0.6, Math.min(1.4, dayAvg / overallAvg));
        factors[i] = factor;
        validDays++;
      }
    }

    // Need at least 4 valid days for reliable seasonality
    if (validDays < 4) return new Array(7).fill(1); // not enough coverage

    // Normalize factors to mean 1 to preserve overall level
    const mean = factors.reduce((a, b) => a + b, 0) / 7;
    const normalizedFactors = mean > 0 ? factors.map((f) => f / mean) : factors;

    // Apply smoothing to reduce noise in seasonality
    const smoothedFactors = normalizedFactors.map((factor, i) => {
      const prevFactor = normalizedFactors[(i + 6) % 7];
      const nextFactor = normalizedFactors[(i + 1) % 7];
      return (prevFactor + factor + nextFactor) / 3;
    });

    return smoothedFactors;
  };

  // Generate forecast data (real data based)
  const generateForecast = async () => {
    try {
      forecastLoading.value = true;

      // Ensure branch context is initialized
      if (!branchContext.currentBranch) {
        try {
          await branchContext.initializeBranchContext();
        } catch (e) {}
      }

      // Determine lookback window based on selected period using Philippine timezone
      const today = getCurrentPhilippineTime();
      const lookbackDays =
        forecastPeriod.value === 'quarter'
          ? 120
          : forecastPeriod.value === 'month'
            ? 60
            : 30;
      const start = new Date(today);
      start.setDate(today.getDate() - lookbackDays);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);

      // Determine branches to include
      let branchIds = [];
      if (selectedBranch.value === 'all') {
        const storeList = branchStore.activeBranches || [];
        const ctxList = branchContext.availableBranches || [];
        const list =
          Array.isArray(storeList) && storeList.length ? storeList : ctxList;
        branchIds =
          Array.isArray(list) && list.length
            ? list.map((b) => b.id)
            : branchContext.currentBranch
              ? [branchContext.currentBranch.id]
              : [];
      } else {
        branchIds = [parseInt(selectedBranch.value)];
      }

      // Build historical series based on forecast type
      let labelsSorted = [];
      let historicalDataArrLocal = [];

      if (forecastType.value === 'product') {
        // Per Product: aggregate REMITTED (approved) orders' item totals by day for the selected product
        const allLabelsSet = new Set();
        const perDaySum = new Map();

        const historyFetches = branchIds.map((bid) =>
          posStore.fetchOrderHistory({
            branch_id: bid,
            status: 'completed',
            limit: 1000,
            date_from: start.toISOString(),
            date_to: end.toISOString(),
          })
        );
        const histories = await Promise.all(historyFetches);

        histories.forEach((h) => {
          const orders = Array.isArray(h?.data) ? h.data : [];
          // Only include orders that were actually remitted and linked to an APPROVED remittance
          const remittedOnly = orders.filter((o) => {
            const hasRemit = o && o.remittance_id != null;
            const status = String(o?.remittance_status || '').toLowerCase();
            return hasRemit && status === 'approved';
          });
          remittedOnly.forEach((o) => {
            const created = o.created_at || o.completed_at || o.processed_at;
            if (!created) return;
            const d = new Date(created);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
              d.getDate()
            ).padStart(2, '0')}`;
            const items = Array.isArray(o.items) ? o.items : [];
            const reducer = (s, it) =>
              s +
              (productForecastMetric.value === 'orders'
                ? Number(it.quantity || 0)
                : Number(it.total_price || 0));
            const filtered =
              selectedProduct.value === 'all'
                ? items
                : items.filter(
                    (it) =>
                      Number(it.menu_item_id) === Number(selectedProduct.value)
                  );
            const matchSum = filtered.reduce(reducer, 0);
            if (matchSum > 0) {
              allLabelsSet.add(key);
              perDaySum.set(key, (perDaySum.get(key) || 0) + matchSum);
            }
          });
        });

        labelsSorted = Array.from(allLabelsSet).sort((a, b) => {
          // Sort dates chronologically, not alphabetically
          return new Date(a) - new Date(b);
        });
        historicalDataArrLocal = labelsSorted.map((lbl) =>
          Math.round(Number(perDaySum.get(lbl) || 0))
        );
      } else {
        // Per Branch (default): aggregate ONLY remitted amounts by day across branches
        const allLabelsSet = new Set();
        const perLabelSum = new Map();

        // Fetch actual remittances for each branch instead of sales trends
        for (const bid of branchIds) {
          const remittances = await posStore.fetchRemittances({
            branchId: bid,
            status: 'approved',
            limit: 1000,
          });

          // Group remittances by approval date (now properly stored in Philippine timezone)
          (remittances.data || []).forEach((r) => {
            const approvedAt = new Date(r.approved_at);

            if (approvedAt >= start && approvedAt <= end) {
              const dateKey = approvedAt.toISOString().split('T')[0];
              allLabelsSet.add(dateKey);
              const prev = perLabelSum.get(dateKey) || 0;
              perLabelSum.set(dateKey, prev + Number(r.remitted_amount || 0));
            }
          });
        }

        labelsSorted = Array.from(allLabelsSet).sort((a, b) => {
          // Sort dates chronologically, not alphabetically
          return new Date(a) - new Date(b);
        });
        historicalDataArrLocal = labelsSorted.map((lbl) =>
          Math.round(Number(perLabelSum.get(lbl) || 0))
        );
      }

      // Fallback if no data
      if (labelsSorted.length === 0) {
        forecastData.value = {
          historical: { labels: [], data: [] },
          forecast: { labels: [], data: [] },
          analysis: {
            trendDirection: 'up',
            trendPercentage: 0,
            averageHistorical: 0,
            predictedAverage: 0,
            confidence: 80,
          },
        };
        return;
      }

      // Store historical data in reactive variable for template access
      historicalDataArr.value = historicalDataArrLocal;

      // Get dynamic forecast days for calculations
      const forecastDaysForAvg = derivedForecastDays.value;

      // Seasonality-aware smoothing and regression
      const smoothed = movingAverage(historicalDataArrLocal, 3);
      const seasonality = computeWeeklySeasonality(labelsSorted, smoothed);
      const deseasonalized = smoothed.map((v, i) => {
        const d = new Date(labelsSorted[i]);
        const wd = isNaN(d) ? 0 : d.getDay();
        const f = seasonality[wd] || 1;
        return f > 0 ? v / f : v;
      });

      // Choose forecasting method
      let slope = 0,
        intercept = 0,
        expForecast = 0,
        expTrend = 0;

      if (forecastMethod.value === 'exponential') {
        const expResult = calculateExponentialSmoothing(deseasonalized, 0.3);
        expForecast = expResult.forecast;
        expTrend = expResult.trend;
      } else {
        const linearResult = calculateLinearRegression(deseasonalized);
        slope = linearResult.slope;
        intercept = linearResult.intercept;
      }

      // Calculate baseline minimum from recent data
      const recentData = historicalDataArrLocal.slice(-forecastDaysForAvg); // Last forecast days
      const baselineMinimum =
        recentData.length > 0
          ? Math.max(
              0,
              (recentData.reduce((a, b) => a + b, 0) / recentData.length) * 0.6
            ) // 60% of recent average
          : 0;

      // Forward forecast with minimum baseline protection
      const forecastLabels = [];
      const forecastValues = [];
      for (let i = 1; i <= Number(derivedForecastDays.value || 7); i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i);
        const label = futureDate.toISOString().split('T')[0];
        forecastLabels.push(label);

        let predicted;
        if (forecastMethod.value === 'exponential') {
          // Exponential smoothing forecast
          predicted = expForecast + expTrend * i;
        } else {
          // Linear regression forecast
          const x = deseasonalized.length + i - 1;
          predicted = slope * x + intercept;
        }

        const wd = futureDate.getDay();
        const f = seasonality[wd] || 1;
        predicted *= f;
        if (!Number.isFinite(predicted))
          predicted = avgRecent || baselineMinimum;

        // Apply minimum baseline to prevent unrealistic low predictions
        predicted = Math.max(baselineMinimum, Math.round(predicted));
        forecastValues.push(predicted);
      }

      // Trend analysis - use dynamic forecast days
      const recent = historicalDataArrLocal.slice(
        -Math.min(forecastDaysForAvg, historicalDataArrLocal.length)
      );
      const older =
        historicalDataArrLocal.length > forecastDaysForAvg
          ? historicalDataArrLocal.slice(
              -(forecastDaysForAvg * 2),
              -forecastDaysForAvg
            )
          : [];
      const avgRecent = recent.length
        ? recent.reduce((a, b) => a + b, 0) / recent.length
        : 0;

      const avgOlder = older.length
        ? older.reduce((a, b) => a + b, 0) / older.length
        : avgRecent || 1;
      const trendDirection = avgRecent >= avgOlder ? 'up' : 'down';
      const trendPercentage = Math.round(
        Math.abs(((avgRecent - avgOlder) / (avgOlder || 1)) * 100)
      );

      const confidence = computeForecastConfidence(
        deseasonalized,
        slope,
        intercept
      );

      // Apply confidence-based adjustments to forecast values
      const confidenceAdjustment = confidence / 100; // Convert to 0-1 scale
      const adjustedForecastValues = forecastValues.map((value, index) => {
        // Blend forecast with recent average based on confidence
        const blendFactor = Math.max(0.3, confidenceAdjustment); // Minimum 30% forecast weight
        const blendedValue =
          value * blendFactor + avgRecent * (1 - blendFactor);

        // Reduced smoothing for low confidence - don't eliminate day-to-day variation
        if (confidence < 70) {
          // For low confidence, apply lighter smoothing (30% instead of 70%)
          const smoothingFactor = 0.3; // 30% weight to recent average
          const result = Math.round(
            blendedValue * (1 - smoothingFactor) + avgRecent * smoothingFactor
          );
          return result;
        }

        return Math.round(blendedValue);
      });

      const totalForecasted = Math.round(
        adjustedForecastValues.length
          ? adjustedForecastValues.reduce((a, b) => a + b, 0)
          : 0
      );

      forecastData.value = {
        historical: { labels: labelsSorted, data: historicalDataArrLocal },
        forecast: { labels: forecastLabels, data: adjustedForecastValues },
        analysis: {
          trendDirection,
          trendPercentage,
          averageHistorical: Math.round(avgRecent),
          predictedAverage: totalForecasted,
          confidence,
        },
      };
    } finally {
      forecastLoading.value = false;
    }
  };

  // Per-branch cash flow & remittance forecast (daily/weekly/monthly)
  const generateCashFlowForecast = async () => {
    try {
      cashFlowLoading.value = true;

      // Prepare branch list
      let branchIds = [];
      if (selectedBranch.value === 'all') {
        const storeList = branchStore.activeBranches || [];
        const ctxList = branchContext.availableBranches || [];
        const list =
          Array.isArray(storeList) && storeList.length ? storeList : ctxList;
        branchIds =
          Array.isArray(list) && list.length
            ? list.map((b) => b.id)
            : branchContext.currentBranch
              ? [branchContext.currentBranch.id]
              : [];
      } else {
        branchIds = [parseInt(selectedBranch.value)];
      }

      // Lookback window and forecast horizon using Philippine timezone
      const today = getCurrentPhilippineTime();
      const lookbackDays =
        forecastPeriod.value === 'quarter'
          ? 120
          : forecastPeriod.value === 'month'
            ? 60
            : 30;
      const horizonDays = 30; // use 30 days to derive weekly/monthly aggregates reliably
      const start = new Date(today);
      start.setDate(today.getDate() - lookbackDays);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);

      const byBranch = [];
      for (const bid of branchIds) {
        // Fetch actual remittances for lookback
        const remittances = await posStore.fetchRemittances({
          branchId: bid,
          status: 'approved',
          limit: 1000,
        });

        // Group remittances by date (now properly stored in Philippine timezone)
        const dailyMap = new Map();
        (remittances.data || []).forEach((r) => {
          const approvedAt = new Date(r.approved_at || r.created_at);
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
        const series = labels.map((date) => Number(dailyMap.get(date) || 0));

        // Smooth, deseasonalize, regress
        const smoothed = movingAverage(series, 3);
        const seasonality = computeWeeklySeasonality(labels, smoothed);
        const deseasonalized = smoothed.map((v, i) => {
          const d = new Date(labels[i]);
          const wd = isNaN(d) ? 0 : d.getDay();
          const f = seasonality[wd] || 1;
          return f > 0 ? v / f : v;
        });
        const { slope, intercept } = calculateLinearRegression(deseasonalized);

        // Forward daily forecast horizonDays
        const daily = [];
        for (let i = 1; i <= horizonDays; i++) {
          const futureDate = new Date(today);
          futureDate.setDate(today.getDate() + i);
          const x = deseasonalized.length + i - 1;
          let predicted = slope * x + intercept;
          const f = seasonality[futureDate.getDay()] || 1;
          predicted *= f;
          predicted = Math.max(0, Math.round(predicted));
          daily.push({
            date: futureDate.toISOString().split('T')[0],
            amount: predicted,
          });
        }

        // Aggregate to weeks (next 4 weeks) and month (next 30 days)
        const toWeekKey = (dStr) => {
          const d = new Date(dStr);
          const oneJan = new Date(d.getFullYear(), 0, 1);
          const week = Math.ceil(
            ((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7
          );
          return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
        };
        const weekMap = new Map();
        daily.forEach((r) => {
          const wk = toWeekKey(r.date);
          weekMap.set(wk, (weekMap.get(wk) || 0) + r.amount);
        });
        const weekly = Array.from(weekMap.entries())
          .slice(0, 4)
          .map(([week, amount]) => ({ week, amount }));
        const monthly = [
          {
            month: today.toISOString().slice(0, 7),
            amount: daily.reduce((a, b) => a + b.amount, 0),
          },
        ];

        const nameLookup = (branchStore.activeBranches || []).find(
          (b) => b.id === bid
        ) ||
          (branchContext.availableBranches || []).find((b) => b.id === bid) || {
            name: `Branch ${bid}`,
          };
        byBranch.push({
          branch_id: bid,
          branch_name: nameLookup.name,
          daily,
          weekly,
          monthly,
          totals: {
            daily7: daily.slice(0, 7).reduce((a, b) => a + b.amount, 0),
            weekly4: weekly.slice(0, 4).reduce((a, b) => a + b.amount, 0),
            monthly1: monthly[0].amount,
          },
        });
      }

      const totals = byBranch.reduce(
        (acc, b) => ({
          daily7: acc.daily7 + b.totals.daily7,
          weekly4: acc.weekly4 + b.totals.weekly4,
          monthly1: acc.monthly1 + b.totals.monthly1,
        }),
        { daily7: 0, weekly4: 0, monthly1: 0 }
      );

      cashFlow.value = { byBranch, totals };
    } finally {
      cashFlowLoading.value = false;
    }
  };

  // Combined chart data for forecasting
  const forecastChartData = computed(() => {
    if (!forecastData.value)
      return { labels: [], historical: [], forecast: [] };

    const allLabels = [
      ...forecastData.value.historical.labels,
      ...forecastData.value.forecast.labels,
    ];

    const historicalData = [
      ...forecastData.value.historical.data,
      ...new Array(forecastData.value.forecast.data.length).fill(null),
    ];

    const forecastDataArray = [
      ...new Array(forecastData.value.historical.data.length).fill(null),
      ...forecastData.value.forecast.data,
    ];

    return {
      labels: allLabels,
      historical: historicalData,
      forecast: forecastDataArray,
    };
  });

  // Detailed forecast pagination (10 per page)
  const detailPage = ref(1);
  const detailPageSize = 10;
  const forecastRows = computed(() => {
    const fd = forecastData.value;
    if (!fd || !Array.isArray(fd.forecast?.labels)) return [];
    const labels = fd.forecast.labels || [];
    const data = fd.forecast.data || [];
    return labels.map((label, i) => ({
      date: label,
      value: Number(data[i] || 0),
    }));
  });
  const totalDetailPages = computed(() =>
    Math.max(1, Math.ceil((forecastRows.value.length || 0) / detailPageSize))
  );
  const pagedForecastRows = computed(() => {
    const start = (detailPage.value - 1) * detailPageSize;
    return forecastRows.value.slice(start, start + detailPageSize);
  });
  watch(
    () => [
      forecastData.value?.forecast?.labels?.length || 0,
      derivedForecastDays.value,
    ],
    () => {
      detailPage.value = 1;
    }
  );

  // Watch for changes in analytics data to reset metric if needed
  watch(
    () => props.analyticsData,
    (newData) => {
      if (newData && newData.labels && newData.labels.length === 0) {
        // Reset to default when no data
        overallMetric.value = 'remitted';
      }
    },
    { deep: true }
  );

  // Remove sample data; forecasting now uses real data

  // Initialize with real data on component mount
  onMounted(async () => {
    try {
      await branchContext.initializeBranchContext();
    } catch (e) {}
    try {
      await branchStore.fetchActiveBranches();
    } catch (e) {}
    await loadProducts();
    setTimeout(() => {
      generateForecast();
      generateCashFlowForecast();
      generateBranchRemitRank();
    }, 0);
  });

  // Reactive refresh
  watch([selectedBranch], () => {
    loadProducts().then(() => {
      setTimeout(() => {
        generateForecast();
        generateCashFlowForecast();
        generateBranchRemitRank();
      }, 0);
    });
  });
  watch(
    () =>
      [
        (branchContext.availableBranches || []).map((b) => b.id).join(','),
        (branchStore.activeBranches || []).map((b) => b.id).join(','),
      ].join('|'),
    () => {
      loadProducts().then(() => {
        setTimeout(() => {
          generateForecast();
          generateCashFlowForecast();
          generateBranchRemitRank();
        }, 0);
      });
    }
  );
  watch(
    [
      forecastType,
      selectedProduct,
      forecastPeriod,
      forecastDays,
      productForecastMetric,
      forecastMethod,
    ],
    () => {
      setTimeout(() => {
        generateForecast();
        generateCashFlowForecast();
        generateBranchRemitRank();
      }, 0);
    }
  );
</script>

<template>
  <div class="space-y-4">
    <!-- Analytics Tabs -->
    <div class="tabs tabs-boxed w-full">
      <a
        class="tab"
        :class="{ 'tab-active': activeAnalyticsTab === 'trends' }"
        @click="activeAnalyticsTab = 'trends'"
      >
        <font-awesome-icon icon="fa-solid fa-chart-line" class="mr-2" />
        Sales Trends
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeAnalyticsTab === 'forecasting' }"
        @click="activeAnalyticsTab = 'forecasting'"
      >
        <font-awesome-icon icon="fa-solid fa-chart-area" class="mr-2" />
        Sales Forecasting
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeAnalyticsTab === 'inventory' }"
        @click="activeAnalyticsTab = 'inventory'"
      >
        <font-awesome-icon icon="fa-solid fa-boxes-stacked" class="mr-2" />
        Menu Inventory Demand
      </a>
    </div>

    <!-- Sales Trends Tab -->
    <div
      v-show="activeAnalyticsTab === 'trends'"
      class="card bg-white shadow border border-black/10"
    >
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

        <div v-if="loading" class="flex justify-center py-8">
          <div
            class="loading loading-spinner loading-md text-primaryColor"
          ></div>
        </div>

        <div
          v-else-if="analyticsLabels.length === 0"
          class="text-center py-8 text-gray-500"
        >
          No analytics data available for the selected period.
        </div>

        <SalesTrendsChart
          v-else
          :labels="analyticsLabels"
          :data="analyticsSeries"
          :metric="chartMetric"
        />
      </div>
    </div>

    <!-- Branch Remitted Leaderboard -->
    <div
      v-show="activeAnalyticsTab === 'trends'"
      class="card bg-white shadow border border-black/10"
    >
      <div class="card-body">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <div class="text-sm font-semibold text-gray-800">
              Top Branches by Remitted Sales
            </div>
            <div
              class="badge bg-primaryColor/10 text-primaryColor border-primaryColor/20"
            >
              Compact
            </div>
          </div>
          <div class="flex items-center gap-2">
            <select
              class="select select-bordered select-xs"
              v-model="branchRankPeriod"
              @change="generateBranchRemitRank"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
            <button
              class="btn btn-xs "
              :disabled="branchRankLoading"
              @click="generateBranchRemitRank"
            >
              <font-awesome-icon
                icon="fa-solid fa-sync-alt"
                :class="{ 'animate-spin': branchRankLoading }"
              />
            </button>
          </div>
        </div>

        <div v-if="branchRankLoading" class="flex justify-center py-6">
          <div
            class="loading loading-spinner loading-md text-primaryColor"
          ></div>
        </div>
        <div
          v-else-if="branchRank.labels.length === 0"
          class="text-center py-6 text-gray-500"
        >
          No remitted data
        </div>
        <div v-else>
          <BarChartJS
            :labels="branchRank.labels"
            :datasets="[
              { label: 'Remitted', data: branchRank.data, color: '#466114' },
              {
                label: 'Net Sales',
                data: branchRankNet,
                color: '#16a34a',
              },
            ]"
            :height="320"
          />
        </div>
      </div>
    </div>

    <!-- Sales Forecasting Tab -->
    <div v-show="activeAnalyticsTab === 'forecasting'" class="space-y-4">
      <!-- Forecasting Controls -->
      <div class="card bg-white shadow border border-black/10">
        <div class="card-body">
          <h3 class="text-sm font-medium text-gray-700 mb-4">
            Forecasting Parameters
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="label">
                <span class="label-text text-xs">Forecast Type</span>
              </label>
              <select
                class="select select-bordered select-sm w-full"
                v-model="forecastType"
                @change="generateForecast"
              >
                <option value="branch">Per Branch</option>
                <option value="product">Per Product</option>
              </select>
            </div>

            <div>
              <label class="label">
                <span class="label-text text-xs">Branch</span>
              </label>
              <select
                class="select select-bordered select-sm w-full"
                v-model="selectedBranch"
                @change="generateForecast"
              >
                <option
                  v-for="branch in allBranches"
                  :key="branch.id"
                  :value="branch.id"
                >
                  {{ branch.name }}
                </option>
              </select>
            </div>

            <div v-if="forecastType === 'product'">
              <label class="label">
                <span class="label-text text-xs">Product</span>
              </label>
              <select
                class="select select-bordered select-sm w-full"
                v-model="selectedProduct"
                @change="generateForecast"
              >
                <option
                  v-for="product in products"
                  :key="product.id"
                  :value="product.id"
                >
                  {{ product.name }}
                </option>
              </select>
            </div>

            <div v-if="forecastType === 'product'">
              <label class="label">
                <span class="label-text text-xs">Product Forecast Metric</span>
              </label>
              <select
                class="select select-bordered select-sm w-full"
                v-model="productForecastMetric"
                @change="generateForecast"
              >
                <option value="amount">By Remitted Amount (₱)</option>
                <option value="orders">By Order Count</option>
              </select>
            </div>

            <div>
              <label class="label">
                <span class="label-text text-xs">Forecast Period</span>
              </label>
              <select
                class="select select-bordered select-sm w-full"
                v-model="forecastPeriod"
                @change="generateForecast"
              >
                <option value="week">Next Week</option>
                <option value="month">Next Month</option>
                <option value="quarter">Next Quarter</option>
              </select>
            </div>

            <div>
              <label class="label">
                <span class="label-text text-xs">Days to Forecast</span>
              </label>
              <input
                type="number"
                class="input input-bordered input-sm w-full"
                v-model="forecastDays"
                min="1"
                max="90"
                @change="generateForecast"
              />
            </div>

            <div>
              <label class="label">
                <span class="label-text text-xs">Forecast Method</span>
              </label>
              <select
                class="select select-bordered select-sm w-full"
                v-model="forecastMethod"
                @change="generateForecast"
              >
                <option value="linear">Linear Regression</option>
                <option value="exponential">Exponential Smoothing</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Forecasting Results -->
      <div class="card bg-white shadow border border-black/10">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-gray-700">Sales Forecast</h3>
            <button
              class="btn btn-sm "
              @click="generateForecast"
              :disabled="forecastLoading"
            >
              <font-awesome-icon
                icon="fa-solid fa-sync-alt"
                :class="{ 'animate-spin': forecastLoading }"
                class="mr-2"
              />
              Refresh Forecast
            </button>
          </div>

          <div v-if="forecastLoading" class="flex justify-center py-8">
            <div
              class="loading loading-spinner loading-md text-primaryColor"
            ></div>
          </div>

          <div v-else-if="forecastData" class="space-y-4">
            <!-- Forecast Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div class="stat bg-gray-50 rounded-lg p-4">
                <div class="stat-title text-xs">Trend Direction</div>
                <div class="stat-value text-lg">
                  <font-awesome-icon
                    :icon="
                      forecastData.analysis.trendDirection === 'up'
                        ? 'fa-solid fa-arrow-trend-up'
                        : 'fa-solid fa-arrow-trend-down'
                    "
                    :class="
                      forecastData.analysis.trendDirection === 'up'
                        ? 'text-success'
                        : 'text-error'
                    "
                  />
                  {{
                    forecastData.analysis.trendDirection === 'up'
                      ? 'Growing'
                      : 'Declining'
                  }}
                </div>
                <div class="stat-desc text-xs">
                  {{ forecastData.analysis.trendPercentage }}% change
                </div>
              </div>

              <div class="stat bg-gray-50 rounded-lg p-4">
                <div class="stat-title text-xs">Historical Average</div>
                <div class="stat-value text-lg text-primaryColor">
                  {{ displayFormat.prefix
                  }}{{
                    displayFormat.formatter(
                      forecastData.analysis.averageHistorical
                    )
                  }}{{ displayFormat.suffix }}
                </div>
                <div class="stat-desc text-xs">
                  Last
                  {{
                    Math.min(
                      derivedForecastDays,
                      historicalDataArr?.length || derivedForecastDays
                    )
                  }}
                  days
                </div>
              </div>

              <div class="stat bg-gray-50 rounded-lg p-4">
                <div class="stat-title text-xs">Predicted Total</div>
                <div class="stat-value text-lg text-warning">
                  {{ displayFormat.prefix
                  }}{{
                    displayFormat.formatter(
                      forecastData.analysis.predictedAverage
                    )
                  }}{{ displayFormat.suffix }}
                </div>
                <div class="stat-desc text-xs">
                  Next {{ derivedForecastDays }} days
                </div>
              </div>

              <div class="stat bg-gray-50 rounded-lg p-4">
                <div class="stat-title text-xs">Confidence Level</div>
                <div class="stat-value text-lg text-gray-600">
                  {{ forecastData.analysis.confidence }}%
                </div>
                <div class="stat-desc text-xs">Prediction accuracy</div>
              </div>
            </div>

            <!-- Forecast Chart -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-700 mb-3">
                Historical vs Forecasted Sales
              </h4>
              <SalesForecastChart
                :labels="forecastChartData.labels"
                :historical="forecastChartData.historical"
                :forecast="forecastChartData.forecast"
                :formatTooltip="
                  forecastType === 'product' &&
                  productForecastMetric === 'orders'
                    ? 'orders'
                    : 'currency'
                "
              />
            </div>

            <!-- Forecast Details Table -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h4 class="text-sm font-medium text-gray-700 mb-3">
                Detailed Forecast
              </h4>
              <div class="overflow-x-auto">
                <table class="table w-full">
                  <thead>
                    <tr>
                      <th class="text-xs">Date</th>
                      <th class="text-xs">
                        {{
                          forecastType === 'product' &&
                          productForecastMetric === 'orders'
                            ? 'Predicted Orders'
                            : 'Predicted Sales'
                        }}
                      </th>
                      <th class="text-xs">Confidence</th>
                      <th class="text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in pagedForecastRows" :key="row.date">
                      <td class="text-xs">{{ row.date }}</td>
                      <td class="text-xs font-semibold text-primaryColor">
                        {{ displayFormat.prefix
                        }}{{ displayFormat.formatter(row.value)
                        }}{{ displayFormat.suffix }}
                      </td>
                      <td class="text-xs">
                        <div class="">
                          {{ forecastData.analysis.confidence }}%
                        </div>
                      </td>
                      <td class="text-xs">
                        <div class="badge bg-warning/10 text-warning">
                          Forecast
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <!-- Pagination -->
              <div class="mt-3 flex items-center justify-between text-sm">
                <div class="text-gray-600">
                  Page {{ detailPage }} of {{ totalDetailPages }}
                </div>
                <div class="join">
                  <button
                    class="btn btn-xs join-item"
                    :disabled="detailPage <= 1"
                    @click="detailPage = Math.max(1, detailPage - 1)"
                  >
                    Prev
                  </button>
                  <button
                    class="btn btn-xs join-item"
                    :disabled="detailPage >= totalDetailPages"
                    @click="
                      detailPage = Math.min(totalDetailPages, detailPage + 1)
                    "
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8 text-gray-500">
            No forecast data available. Click "Refresh Forecast" to generate
            predictions.
          </div>
        </div>
      </div>
    </div>

    <!-- Cash Flow & Remittance Forecast Tab (inline section below forecasting) -->
    <div v-show="activeAnalyticsTab === 'forecasting'" class="space-y-4">
      <div class="card bg-white shadow border border-black/10">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-gray-700">
              Cash Flow & Remittance Forecast
            </h3>
            <button
              class="btn btn-sm "
              :disabled="cashFlowLoading"
              @click="generateCashFlowForecast"
            >
              <font-awesome-icon
                icon="fa-solid fa-sync-alt"
                :class="{ 'animate-spin': cashFlowLoading }"
                class="mr-2"
              />
              Refresh
            </button>
          </div>

          <div v-if="cashFlowLoading" class="flex justify-center py-8">
            <div
              class="loading loading-spinner loading-md text-primaryColor"
            ></div>
          </div>

          <div v-else class="space-y-4">
            <!-- Summary cards -->
            <div class="grid grid-cols-1 md:grid-cols-1 gap-4">
              <div class="stat bg-gray-50 rounded-lg p-4">
                <div class="stat-title text-xs">Next 7 Days (All Branches)</div>
                <div class="stat-value text-lg text-primaryColor">
                  ₱{{ (cashFlow.totals.daily7 || 0).toLocaleString() }}
                </div>
              </div>
            </div>

            <!-- Per-branch table -->
            <div class="overflow-x-auto">
              <table class="table w-full">
                <thead>
                  <tr>
                    <th class="text-xs">Branch</th>
                    <th class="text-xs">Next 7 Days</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="b in cashFlow.byBranch" :key="b.branch_id">
                    <td class="text-xs">{{ b.branch_name }}</td>
                    <td class="text-xs font-medium text-right">
                      <i class="fa-solid fa-peso-sign mr-1"></i>
                      {{
                        Number(b.totals.daily7 || 0).toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                        })
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Inventory Demand Forecasting Tab -->
    <div v-show="activeAnalyticsTab === 'inventory'" class="space-y-4">
      <MenuRemittedInventory :loading="loading" />
    </div>
  </div>
</template>

<style scoped></style>
