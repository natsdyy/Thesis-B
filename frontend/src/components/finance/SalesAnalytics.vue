<script setup>
  import { ref, computed, watch, onMounted } from 'vue';
  import SalesTrendsChart from '../branch/SalesTrendsChart.vue';
  import SalesForecastChart from './SalesForecastChart.vue';
  import MenuInventoryDemand from './MenuInventoryDemand.vue';
  import { useBranchContextStore } from '../../stores/branchContextStore.js';
  import { useBranchStore } from '../../stores/branchStore.js';
  import { usePOSStore } from '../../stores/posStore.js';

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
  const forecastData = ref(null);
  const forecastLoading = ref(false);

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

  // Generate mock historical data for forecasting
  const generateMockHistoricalData = (days = 30, baseAmount = 50000) => {
    const data = [];
    const labels = [];
    const today = new Date();

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

  // Simple linear regression for forecasting
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
    const slope =
      denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
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

  // Compute weekly seasonality factors (0..6). Returns array of length 7.
  const computeWeeklySeasonality = (labels, series) => {
    const y = (Array.isArray(series) ? series : []).map((v) => Number(v) || 0);
    const l = Array.isArray(labels) ? labels : [];
    const sums = new Array(7).fill(0);
    const counts = new Array(7).fill(0);
    for (let i = 0; i < y.length && i < l.length; i++) {
      const d = new Date(l[i]);
      if (isNaN(d)) continue;
      const wd = d.getDay();
      sums[wd] += y[i];
      counts[wd] += 1;
    }
    const overallAvg = y.length ? y.reduce((a, b) => a + b, 0) / y.length : 0;
    const factors = new Array(7).fill(1);
    let have = 0;
    for (let i = 0; i < 7; i++) {
      if (counts[i] > 0 && overallAvg > 0) {
        factors[i] = Math.max(
          0.2,
          Math.min(3, sums[i] / counts[i] / overallAvg)
        );
        have++;
      }
    }
    if (have < 5) return new Array(7).fill(1); // not enough coverage
    // Normalize factors to mean 1
    const mean = factors.reduce((a, b) => a + b, 0) / 7;
    return factors.map((f) => (mean > 0 ? f / mean : 1));
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

      // Determine lookback window based on selected period
      const today = new Date();
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
      let historicalDataArr = [];

      if (forecastType.value === 'product') {
        // Per Product: aggregate completed orders' item totals by day for the selected product
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
          orders.forEach((o) => {
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

        labelsSorted = Array.from(allLabelsSet).sort();
        historicalDataArr = labelsSorted.map((lbl) =>
          Math.round(Number(perDaySum.get(lbl) || 0))
        );
      } else {
        // Per Branch (default): aggregate remitted amounts by day across branches
        const allLabelsSet = new Set();
        const perLabelSum = new Map();
        const fetchPromises = branchIds.map((bid) =>
          posStore.fetchSalesTrends(bid, {
            dateFrom: start.toISOString(),
            dateTo: end.toISOString(),
            bucket: 'day',
          })
        );
        const results = await Promise.all(fetchPromises);

        results.forEach((r) => {
          const labels = Array.isArray(r?.labels) ? r.labels : [];
          const rem = Array.isArray(r?.remitted_amount)
            ? r.remitted_amount
            : [];
          labels.forEach((lbl, idx) => {
            const key = String(lbl);
            allLabelsSet.add(key);
            const prev = perLabelSum.get(key) || 0;
            perLabelSum.set(key, prev + Number(rem[idx] || 0));
          });
        });

        labelsSorted = Array.from(allLabelsSet).sort();
        historicalDataArr = labelsSorted.map((lbl) =>
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

      // Seasonality-aware smoothing and regression
      const smoothed = movingAverage(historicalDataArr, 3);
      const seasonality = computeWeeklySeasonality(labelsSorted, smoothed);
      const deseasonalized = smoothed.map((v, i) => {
        const d = new Date(labelsSorted[i]);
        const wd = isNaN(d) ? 0 : d.getDay();
        const f = seasonality[wd] || 1;
        return f > 0 ? v / f : v;
      });
      const { slope, intercept } = calculateLinearRegression(deseasonalized);

      // Forward forecast
      const forecastLabels = [];
      const forecastValues = [];
      for (let i = 1; i <= Number(forecastDays.value || 7); i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i);
        const label = futureDate.toISOString().split('T')[0];
        forecastLabels.push(label);
        const x = deseasonalized.length + i - 1;
        let predicted = slope * x + intercept;
        const wd = futureDate.getDay();
        const f = seasonality[wd] || 1;
        predicted *= f;
        if (!Number.isFinite(predicted)) predicted = avgRecent || 0;
        predicted = Math.max(0, Math.round(predicted));
        forecastValues.push(predicted);
      }

      // Trend analysis
      const recent = historicalDataArr.slice(
        -Math.min(7, historicalDataArr.length)
      );
      const older =
        historicalDataArr.length > 7 ? historicalDataArr.slice(-14, -7) : [];
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

      forecastData.value = {
        historical: { labels: labelsSorted, data: historicalDataArr },
        forecast: { labels: forecastLabels, data: forecastValues },
        analysis: {
          trendDirection,
          trendPercentage,
          averageHistorical: Math.round(avgRecent),
          predictedAverage: Math.round(
            forecastValues.length
              ? forecastValues.reduce((a, b) => a + b, 0) /
                  forecastValues.length
              : 0
          ),
          confidence,
        },
      };
    } finally {
      forecastLoading.value = false;
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
    }, 0);
  });

  // Reactive refresh
  watch([selectedBranch], () => {
    loadProducts().then(() => {
      setTimeout(() => generateForecast(), 0);
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
        setTimeout(() => generateForecast(), 0);
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
    ],
    () => {
      setTimeout(() => generateForecast(), 0);
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
          </div>
        </div>
      </div>

      <!-- Forecasting Results -->
      <div class="card bg-white shadow border border-black/10">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-gray-700">Sales Forecast</h3>
            <button
              class="btn btn-sm btn-outline"
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
                  ₱{{
                    forecastData.analysis.averageHistorical.toLocaleString()
                  }}
                </div>
                <div class="stat-desc text-xs">Last 7 days</div>
              </div>

              <div class="stat bg-gray-50 rounded-lg p-4">
                <div class="stat-title text-xs">Predicted Average</div>
                <div class="stat-value text-lg text-warning">
                  ₱{{ forecastData.analysis.predictedAverage.toLocaleString() }}
                </div>
                <div class="stat-desc text-xs">
                  Next {{ forecastDays }} days
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
                      <th class="text-xs">Predicted Sales</th>
                      <th class="text-xs">Confidence</th>
                      <th class="text-xs">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(value, index) in forecastData.forecast.data"
                      :key="index"
                    >
                      <td class="text-xs">
                        {{ forecastData.forecast.labels[index] }}
                      </td>
                      <td class="text-xs font-semibold text-primaryColor">
                        ₱{{ value.toLocaleString() }}
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
            </div>
          </div>

          <div v-else class="text-center py-8 text-gray-500">
            No forecast data available. Click "Refresh Forecast" to generate
            predictions.
          </div>
        </div>
      </div>
    </div>

    <!-- Inventory Demand Forecasting Tab -->
    <div v-show="activeAnalyticsTab === 'inventory'" class="space-y-4">
      <MenuInventoryDemand :loading="loading" />
    </div>
  </div>
</template>

<style scoped></style>
