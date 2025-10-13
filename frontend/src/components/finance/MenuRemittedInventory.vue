<script setup>
  import { ref, computed, watch, onMounted } from 'vue';
  import { useBranchContextStore } from '../../stores/branchContextStore.js';
  import { useBranchStore } from '../../stores/branchStore.js';
  import { usePOSStore } from '../../stores/posStore.js';
  import { useProductionStore } from '../../stores/productionStore.js';
  import SalesTrendsChart from '../branch/SalesTrendsChart.vue';
  import BarChartJS from '../finance/BarChartJS.vue';
  import SalesForecastChart from '../finance/SalesForecastChart.vue';
  import {
    getCurrentPhilippineTime,
    convertUTCToPhilippine,
  } from '../../utils/timezoneUtils.js';

  // Props
  const props = defineProps({
    loading: { type: Boolean, default: false },
  });

  // Stores
  const branchContext = useBranchContextStore();
  const branchStore = useBranchStore();
  const posStore = usePOSStore();
  const productionStore = useProductionStore();

  // Controls
  const selectedBranch = ref('all');
  const selectedProduct = ref('all');
  const lookbackDays = ref(30);
  const itemsPerPage = ref(10);
  const currentPage = ref(1);

  // Data
  const products = ref([{ id: 'all', name: 'All Products' }]);
  const rows = ref([]);
  const loading = ref(false);
  const trendLabels = ref([]);
  const trendData = ref([]);
  const chartMode = ref('sum');
  const perMenuLabels = ref([]);
  const perMenuData = ref([]);
  const perMenuDaily = ref({});
  const forecastDays = ref(14);
  const forecast = ref({
    labels: [],
    historical: [],
    future: [],
    analysis: null,
  });
  const allForecasts = ref([]);

  const itemIdToTags = ref(new Map());
  const inventoryByItemId = ref(new Map());
  const parseTags = (val) =>
    String(val || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

  // Branches
  const allBranches = computed(() => {
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

  const loadProducts = async () => {
    try {
      await productionStore.fetchProductionInventory();
      const list = Array.isArray(productionStore.productionInventory)
        ? productionStore.productionInventory
        : [];
      // index tags by menu_item_id for DSS filtering
      const map = new Map();
      const invMap = new Map();
      list.forEach((it) => {
        const key = Number(it.menu_item_id || it.id);
        const tags = parseTags(it.tags);
        map.set(key, tags);
        invMap.set(key, it);
      });
      itemIdToTags.value = map;
      inventoryByItemId.value = invMap;
      const unique = new Map();
      list.forEach((it) => {
        const key = Number(it.menu_item_id || it.id);
        const name = it.menu_item_name || it.item_name || `Item ${key}`;

        // Filter out Item 0 and SCM items from products list
        const isProductionItem =
          key !== 0 &&
          key !== '0' &&
          name !== 'Item 0' &&
          name !== 'item 0' &&
          name !== 'Item0' &&
          name !== 'item0' &&
          name !== '0' &&
          it.item_type === 'production' &&
          it.item_type !== 'scm' &&
          it.category !== 'SCM' &&
          it.category !== 'scm' &&
          it.category !== 'Beverage' &&
          it.category !== 'beverage' &&
          !it.category?.toLowerCase().includes('beverage') &&
          !name?.toLowerCase().includes('drink') &&
          !name?.toLowerCase().includes('juice') &&
          !name?.toLowerCase().includes('water') &&
          !name?.toLowerCase().includes('coffee') &&
          !name?.toLowerCase().includes('tea') &&
          !name?.toLowerCase().includes('soda') &&
          !name?.toLowerCase().includes('coke') &&
          !name?.toLowerCase().includes('pepsi') &&
          !name?.toLowerCase().includes('sprite') &&
          !name?.toLowerCase().includes('item 0') &&
          !name?.toLowerCase().includes('item0');

        if (isProductionItem && !unique.has(key)) {
          unique.set(key, { id: key, name });
        }
      });
      const arr = Array.from(unique.values()).sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      );
      products.value = [{ id: 'all', name: 'All Production Items' }, ...arr];
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

  // Core: build movements from remitted orders only
  const buildRemittedMovements = async () => {
    try {
      loading.value = true;
      const endDate = getCurrentPhilippineTime();
      const startDate = new Date(getCurrentPhilippineTime());
      startDate.setDate(
        endDate.getDate() - Math.max(1, parseInt(lookbackDays.value || 30))
      );

      // Which branches
      let branchIds = [];
      if (selectedBranch.value === 'all') {
        const storeList = branchStore.activeBranches || [];
        const ctxList = branchContext.availableBranches || [];
        const list = (storeList.length ? storeList : ctxList) || [];
        branchIds = list.length
          ? list.map((b) => b.id)
          : branchContext.currentBranch
            ? [branchContext.currentBranch.id]
            : [];
      } else {
        branchIds = [parseInt(selectedBranch.value)];
      }

      const perBranch = [];
      const perDayTotals = new Map();
      const perMenuTotals = new Map();
      const menuDaily = new Map();
      for (const bid of branchIds) {
        const hist = await posStore.fetchOrderHistory({
          branch_id: bid,
          status: 'completed',
          limit: 1000,
          date_from: startDate.toISOString(),
          date_to: endDate.toISOString(),
        });
        const orders = Array.isArray(hist?.data) ? hist.data : [];

        const remittedOnly = orders.filter((o) => {
          const hasRemit = o && o.remittance_id != null;
          const status = String(o?.remittance_status || '').toLowerCase();
          return hasRemit && status === 'approved';
        });

        // Aggregate by menu_item_id
        const byItem = new Map();
        remittedOnly.forEach((o) => {
          const items = Array.isArray(o.items) ? o.items : [];

          const filtered = items.filter((it) => {
            // First check if it matches the selected product filter
            const matchesProduct =
              selectedProduct.value === 'all'
                ? true
                : Number(it.menu_item_id) === Number(selectedProduct.value);

            // Then apply production item filtering - exclude Item 0 and SCM items
            // Note: POS order items don't have item_type/category fields, so we filter by name patterns
            const isProductionItem =
              it.menu_item_id !== 0 &&
              it.menu_item_id !== '0' &&
              it.item_name !== 'Item 0' &&
              it.item_name !== 'item 0' &&
              it.item_name !== 'Item0' &&
              it.item_name !== 'item0' &&
              it.item_name !== '0' &&
              it.item_name !== null &&
              it.item_name !== undefined &&
              !it.item_name?.toLowerCase().includes('drink') &&
              !it.item_name?.toLowerCase().includes('juice') &&
              !it.item_name?.toLowerCase().includes('water') &&
              !it.item_name?.toLowerCase().includes('coffee') &&
              !it.item_name?.toLowerCase().includes('tea') &&
              !it.item_name?.toLowerCase().includes('soda') &&
              !it.item_name?.toLowerCase().includes('coke') &&
              !it.item_name?.toLowerCase().includes('pepsi') &&
              !it.item_name?.toLowerCase().includes('sprite') &&
              !it.item_name?.toLowerCase().includes('mineral water') &&
              !it.item_name?.toLowerCase().includes('bottles') &&
              !it.item_name?.toLowerCase().includes('item 0') &&
              !it.item_name?.toLowerCase().includes('item0');

            return matchesProduct && isProductionItem;
          });

          filtered.forEach((it) => {
            const key = Number(it.menu_item_id);
            if (!byItem.has(key))
              byItem.set(key, {
                branch_id: bid,
                menu_item_id: key,
                menu_item_name: it.menu_item_name || `Item ${key}`,
                orders_count: 0,
                total_quantity: 0,
                total_amount: 0,
                remittance_ids: new Set(),
                last_activity: null,
                per_day: new Map(),
              });
            const rec = byItem.get(key);
            rec.orders_count += 1;
            rec.total_quantity += Number(it.quantity || 0);
            rec.total_amount += Number(it.total_price || 0);
            if (o.remittance_id != null)
              rec.remittance_ids.add(o.remittance_id);
            const created = o.created_at || o.completed_at || o.processed_at;
            if (created) {
              const d = convertUTCToPhilippine(created);
              const keyDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              rec.per_day.set(
                keyDay,
                (rec.per_day.get(keyDay) || 0) + Number(it.quantity || 0)
              );
              if (!rec.last_activity || new Date(rec.last_activity) < d)
                rec.last_activity = d.toISOString();
            }
          });
        });

        const branchName =
          (branchStore.activeBranches || []).find((b) => b.id === bid)?.name ||
          (branchContext.availableBranches || []).find((b) => b.id === bid)
            ?.name ||
          `Branch ${bid}`;

        byItem.forEach((rec) => {
          const days = Math.max(1, parseInt(lookbackDays.value || 30));
          const dailyAvgQty = rec.total_quantity / days;
          const dailyAvgAmt = rec.total_amount / days;
          const movement = {
            branchId: bid,
            branchName,
            itemId: rec.menu_item_id,
            itemName: rec.menu_item_name,
            ordersCount: rec.orders_count,
            totalQuantity: Math.round(rec.total_quantity * 100) / 100,
            totalAmount: Math.round(rec.total_amount),
            dailyAvgQty: Math.round(dailyAvgQty * 100) / 100,
            dailyAvgAmount: Math.round(dailyAvgAmt),
            uniqueRemittances: rec.remittance_ids.size,
            remittanceIds: Array.from(rec.remittance_ids),
            lastActivity: rec.last_activity
              ? rec.last_activity.slice(0, 10)
              : '',
          };
          perBranch.push(movement);

          // roll up daily quantities for trend chart
          rec.per_day.forEach((qty, dayKey) => {
            perDayTotals.set(
              dayKey,
              (perDayTotals.get(dayKey) || 0) + Number(qty || 0)
            );
          });
          // accumulate per-menu totals for bar chart
          const menuKey = rec.menu_item_name || `Item ${rec.menu_item_id}`;
          perMenuTotals.set(
            menuKey,
            (perMenuTotals.get(menuKey) || 0) + Number(rec.total_quantity || 0)
          );
          // capture daily per menu for forecasting
          const ex = menuDaily.get(rec.menu_item_id) || {
            name: rec.menu_item_name,
            byDay: new Map(),
          };
          rec.per_day.forEach((qty, dayKey) => {
            ex.byDay.set(
              dayKey,
              (ex.byDay.get(dayKey) || 0) + Number(qty || 0)
            );
          });
          menuDaily.set(rec.menu_item_id, ex);
        });
      }

      // Sort by daily average quantity desc
      perBranch.sort((a, b) => b.dailyAvgQty - a.dailyAvgQty);
      rows.value = perBranch;
      currentPage.value = 1;

      // Build trend arrays (oldest -> newest)
      const labelsSorted = Array.from(perDayTotals.keys()).sort((a, b) => {
        // Sort dates chronologically, not alphabetically
        return new Date(a) - new Date(b);
      });
      trendLabels.value = labelsSorted;
      trendData.value = labelsSorted.map((d) =>
        Math.round(Number(perDayTotals.get(d) || 0))
      );

      // Build per-menu arrays (limit to top 20 by quantity for readability)
      const menuPairs = Array.from(perMenuTotals.entries());
      menuPairs.sort((a, b) => b[1] - a[1]);
      const limited = menuPairs.slice(0, 20);
      perMenuLabels.value = limited.map(([name]) => name);
      perMenuData.value = limited.map(([, qty]) =>
        Math.round(Number(qty || 0))
      );

      // persist daily per-menu and compute initial forecast
      perMenuDaily.value = Object.fromEntries(
        Array.from(menuDaily.entries()).map(([id, obj]) => [
          String(id),
          {
            name: obj.name,
            byDay: Object.fromEntries(Array.from(obj.byDay.entries())),
          },
        ])
      );
      await generateMenuForecast?.();
      await generateAllMenuForecasts?.();
      await buildDSSRecommendations();
      await generatePromoSuggestions();
    } finally {
      loading.value = false;
    }
  };

  // ---------- Lightweight forecasting helpers ----------
  const movingAverage = (arr, window = 3) => {
    const data = (Array.isArray(arr) ? arr : []).map((v) => Number(v) || 0);
    if (data.length === 0 || window <= 1) return data.slice();
    const out = new Array(data.length).fill(0);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
      if (i >= window) sum -= data[i - window];
      out[i] = sum / Math.min(i + 1, window);
    }
    return out;
  };
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
    if (have < 5) return new Array(7).fill(1);
    const mean = factors.reduce((a, b) => a + b, 0) / 7;
    return factors.map((f) => (mean > 0 ? f / mean : 1));
  };
  const linearRegression = (data) => {
    const y = (Array.isArray(data) ? data : []).map((v) => Number(v) || 0);
    const n = y.length;
    if (n <= 1) return { slope: 0, intercept: y[0] || 0 };
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
    const sumXX = x.reduce((s, xi) => s + xi * xi, 0);
    const denom = n * sumXX - sumX * sumX;
    const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
  };

  // Build forecast for the currently selected menu item (if any)
  const generateMenuForecast = async () => {
    try {
      // Reset when viewing All Products
      if (selectedProduct.value === 'all') {
        forecast.value = {
          labels: [],
          historical: [],
          future: [],
          analysis: null,
        };
        return;
      }

      const rec = perMenuDaily.value[String(selectedProduct.value)];
      if (!rec || !rec.byDay) {
        forecast.value = {
          labels: [],
          historical: [],
          future: [],
          analysis: null,
        };
        return;
      }

      const days = Object.keys(rec.byDay || {}).sort();
      if (!days.length) {
        forecast.value = {
          labels: [],
          historical: [],
          future: [],
          analysis: null,
        };
        return;
      }

      const values = days.map((d) => Number(rec.byDay[d] || 0));
      const smoothed = movingAverage(values, 3);
      const seasonality = computeWeeklySeasonality(days, smoothed);
      const deseasonalized = smoothed.map((v, i) => {
        const wd = new Date(days[i]).getDay();
        const f = seasonality[wd] || 1;
        return f > 0 ? v / f : v;
      });
      const { slope, intercept } = linearRegression(deseasonalized);

      const horizon = Math.max(7, Number(forecastDays.value || 14));
      const lastDate = new Date(days[days.length - 1]);
      const futureLabels = [];
      const fValues = [];
      for (let i = 1; i <= horizon; i++) {
        const d = new Date(lastDate);
        d.setDate(lastDate.getDate() + i);
        const x = deseasonalized.length + i - 1;
        let pred = slope * x + intercept;
        pred *= seasonality[d.getDay()] || 1;
        if (!Number.isFinite(pred)) pred = 0;
        futureLabels.push(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        );
        fValues.push(Math.max(0, Math.round(pred)));
      }

      const predictedAverage = fValues.length
        ? Math.round(fValues.reduce((a, b) => a + b, 0) / fValues.length)
        : 0;

      forecast.value = {
        labels: [...days, ...futureLabels],
        historical: values,
        future: fValues,
        analysis: { predictedAverage },
      };
    } catch (e) {
      forecast.value = {
        labels: [],
        historical: [],
        future: [],
        analysis: null,
      };
    }
  };

  // Build compact forecasts for ALL menu items
  const generateAllMenuForecasts = async () => {
    try {
      const horizon = Math.max(7, Number(forecastDays.value || 14));
      const results = [];
      for (const [id, rec] of Object.entries(perMenuDaily.value || {})) {
        const days = Object.keys(rec.byDay || {}).sort();
        if (!days.length) continue;
        const values = days.map((d) => Number(rec.byDay[d] || 0));
        const smoothed = movingAverage(values, 3);
        const seasonality = computeWeeklySeasonality(days, smoothed);
        const deseasonalized = smoothed.map((v, i) => {
          const wd = new Date(days[i]).getDay();
          const f = seasonality[wd] || 1;
          return f > 0 ? v / f : v;
        });
        const { slope, intercept } = linearRegression(deseasonalized);
        const lastDate = new Date(days[days.length - 1]);
        const fValues = [];
        for (let i = 1; i <= horizon; i++) {
          const d = new Date(lastDate);
          d.setDate(lastDate.getDate() + i);
          const x = deseasonalized.length + i - 1;
          let pred = slope * x + intercept;
          pred *= seasonality[d.getDay()] || 1;
          if (!Number.isFinite(pred)) pred = 0;
          fValues.push(Math.max(0, Math.round(pred)));
        }
        const predictedAverage = fValues.length
          ? Math.round(fValues.reduce((a, b) => a + b, 0) / fValues.length)
          : 0;
        const recent = values.slice(-Math.min(7, values.length));
        const older = values.length > 7 ? values.slice(-14, -7) : recent;
        const avgRecent = recent.length
          ? recent.reduce((a, b) => a + b, 0) / recent.length
          : 0;
        const avgOlder = older.length
          ? older.reduce((a, b) => a + b, 0) / older.length
          : 0;
        // Robust trend: treat small fluctuations as stable; avoid huge swings when avgOlder≈0
        let trendDirection = 'stable';
        let trendPercentage = 0;
        if (avgOlder === 0 && avgRecent > 0) {
          trendDirection = 'up';
          trendPercentage = 0;
        } else if (avgOlder > 0) {
          trendPercentage = Math.round(
            ((avgRecent - avgOlder) / avgOlder) * 100
          );
          const stableThreshold = 15; // ±15% considered stable
          if (trendPercentage > stableThreshold) trendDirection = 'up';
          else if (trendPercentage < -stableThreshold) trendDirection = 'down';
          else {
            trendDirection = 'stable';
            trendPercentage = 0;
          }
        }
        results.push({
          id,
          name: rec.name,
          predictedAverage,
          trendDirection,
          trendPercentage,
        });
      }
      results.sort((a, b) => b.predictedAverage - a.predictedAverage);
      allForecasts.value = results;
    } catch (e) {
      allForecasts.value = [];
    }
  };

  // ---------------- DSS Recommendations ----------------
  const recommendations = ref([]);

  // ---------------- Intelligent Promo Suggestions ----------------
  const promoSuggestions = ref([]);
  const promoLoading = ref(false);
  const promoSuggestionsCurrentPage = ref(1);
  const promoSuggestionsItemsPerPage = ref(5);
  const promoSuggestionsViewMode = ref('list'); // 'card' or 'list'

  const getCurrentPhilippineSeason = () => {
    const m = getCurrentPhilippineTime().getMonth() + 1; // 1-12
    if (m >= 3 && m <= 5) return 'summer';
    if (m >= 6 && m <= 10) return 'rainy';
    if (m >= 11 && m <= 12) return 'christmas';
    return 'all-season';
  };
  const buildDSSRecommendations = async () => {
    const season = getCurrentPhilippineSeason();

    // Aggregate per item across branches
    const perItem = new Map();
    (rows.value || []).forEach((r) => {
      const itemId = Number(r.itemId);
      const rec = perItem.get(itemId) || {
        itemId,
        name: r.itemName,
        dailyAvgSum: 0,
        ordersSum: 0,
        lastActivity: null,
      };
      rec.dailyAvgSum += Number(r.dailyAvgQty) || 0;
      rec.ordersSum += Number(r.ordersCount) || 0;
      const la = r.lastActivity ? new Date(r.lastActivity) : null;
      if (la) {
        const cur = rec.lastActivity ? new Date(rec.lastActivity) : null;
        if (!cur || la > cur) rec.lastActivity = la.toISOString();
      }
      perItem.set(itemId, rec);
    });

    const chooseBest = (arr) =>
      arr.filter(Boolean).sort((a, b) => a.priority - b.priority)[0] || null;

    const out = [];
    // Determine display branch label based on current filter
    const branchLabel =
      selectedBranch.value === 'all'
        ? 'All Branches'
        : rows.value?.[0]?.branchName || 'Branch';
    // Compute global average daily movement across items for relative thresholds
    const perItemArray = Array.from(perItem.values());
    const globalAvg = perItemArray.length
      ? perItemArray.reduce(
          (sum, it) => sum + (Number(it.dailyAvgSum) || 0),
          0
        ) / perItemArray.length
      : 0;
    perItem.forEach((agg, itemId) => {
      const inv = inventoryByItemId.value.get(itemId) || {};
      const tags = (itemIdToTags.value.get(itemId) || []).map((t) =>
        t.toLowerCase()
      );
      const name =
        inv.menu_item_name || inv.item_name || agg.name || `Item ${itemId}`;
      const dailyAvg = Number(agg.dailyAvgSum) || 0;
      const totalProduced = Number(inv.total_produced || 0);
      const availableQty = Number(inv.available_quantity || 0);
      const daysSinceActivity = (() => {
        if (!agg.lastActivity) return Infinity;
        const now = getCurrentPhilippineTime();
        const last = new Date(agg.lastActivity);
        return Math.max(0, Math.round((now - last) / (1000 * 60 * 60 * 24)));
      })();

      // Comprehensive analysis thresholds
      const isPopularAllSeason =
        dailyAvg >= 2.0 && // High daily average (top 20% of items)
        dailyAvg >= globalAvg * 1.5; // Significantly above global average
      const isPopularSeason =
        dailyAvg >= 1.5 && // Good daily average
        dailyAvg >= globalAvg * 1.2; // Above global average
      const isSignature = tags.includes('signature');
      const isLowDemand = dailyAvg < Math.max(0.3, 0.5 * globalAvg);
      const isOverstock =
        totalProduced > 0 &&
        availableQty > 0.4 * totalProduced &&
        dailyAvg < 1 &&
        daysSinceActivity >= 3;

      // Additional comprehensive analysis using actual available tags
      const isHighGrowth = dailyAvg >= globalAvg * 1.3 && dailyAvg >= 1.0;
      const isDeclining = dailyAvg < globalAvg * 0.7 && dailyAvg > 0;
      const isStagnant = dailyAvg >= 0.1 && dailyAvg <= globalAvg * 0.8;
      const isOutOfStock = availableQty <= 0 && dailyAvg > 0;
      const isUnderstocked = availableQty > 0 && availableQty < dailyAvg * 3;
      const isWellStocked = availableQty >= dailyAvg * 7;
      const isNewItem =
        tags.includes('new') || (daysSinceActivity <= 7 && dailyAvg > 0);
      const isLowDemandTag = tags.includes('low-demand');
      const isPopularTag = tags.includes('popular');

      // Seasonality tags
      const isSummer = tags.includes('summer');
      const isRainy = tags.includes('rainy');
      const isChristmas = tags.includes('christmas');
      const isAllSeason = tags.includes('all-season');
      const isSeasonalPeak =
        (isSummer || isRainy || isChristmas) && dailyAvg >= globalAvg;

      // Protein/Category tags
      const isPork = tags.includes('pork');
      const isBeef = tags.includes('beef');
      const isChicken = tags.includes('chicken');
      const isFish = tags.includes('fish');
      const isVegetarian = tags.includes('vegetarian');

      // Special tags
      const isGroupMeal = tags.includes('group-meal');
      const isQuickServe = tags.includes('quick-serve');

      // Meal time detection based on name patterns
      const isBreakfast =
        name.toLowerCase().includes('silog') ||
        name.toLowerCase().includes('breakfast');
      const isLunch =
        name.toLowerCase().includes('lunch') ||
        name.toLowerCase().includes('main');
      const isDinner =
        name.toLowerCase().includes('dinner') ||
        name.toLowerCase().includes('heavy');

      const best = chooseBest([
        // Critical Issues (Priority 1-3)
        isOutOfStock
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Out of Stock',
              action: 'URGENT: Restock immediately',
              note: `Item is out of stock but has demand (${dailyAvg.toFixed(1)} avg/day). Lost sales opportunity.`,
              priority: 1,
            }
          : null,
        isOverstock
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Overstock Risk',
              action: 'Run promo to clear stock',
              note: `Available ${availableQty} > 40% of produced ${totalProduced} with slow sales; last activity ${daysSinceActivity} day(s) ago.`,
              priority: 2,
            }
          : null,
        isUnderstocked
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Understocked',
              action: 'Increase production to meet demand',
              note: `Only ${availableQty} units available for ${dailyAvg.toFixed(1)} daily demand. Risk of stockout in ${Math.ceil(availableQty / dailyAvg)} days.`,
              priority: 3,
            }
          : null,

        // Performance Issues (Priority 4-6)
        isDeclining
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Declining Performance',
              action: 'Investigate and revitalize',
              note: `Sales declining (${dailyAvg.toFixed(1)} avg/day vs ${globalAvg.toFixed(1)} global avg). Check quality, pricing, or marketing.`,
              priority: 4,
            }
          : null,
        isLowDemand
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Low-Demand',
              action: 'Consider promo/rebranding or phase-out',
              note: `Very low sales (${dailyAvg.toFixed(1)} avg/day). Evaluate marketing strategy or consider removal.`,
              priority: 5,
            }
          : null,
        isStagnant
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Stagnant Sales',
              action: 'Boost marketing or adjust strategy',
              note: `Consistent but low sales (${dailyAvg.toFixed(1)} avg/day). Consider promotional campaigns or menu positioning.`,
              priority: 6,
            }
          : null,

        // Growth Opportunities (Priority 7-9)
        isHighGrowth
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'High Growth Potential',
              action: 'Scale up production and marketing',
              note: `Strong performance (${dailyAvg.toFixed(1)} avg/day). Consider increasing production capacity and marketing investment.`,
              priority: 7,
            }
          : null,
        isNewItem
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'New Item Launch',
              action: 'Monitor and promote actively',
              note: `New item showing promise (${dailyAvg.toFixed(1)} avg/day). Focus on customer feedback and marketing.`,
              priority: 8,
            }
          : null,
        isSeasonalPeak
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: `Seasonal Peak (${season})`,
              action: 'Maximize seasonal opportunity',
              note: `Peak season performance (${dailyAvg.toFixed(1)} avg/day). Increase production and marketing during this period.`,
              priority: 9,
            }
          : null,

        // Category-Specific Recommendations (Priority 10-15)
        isBreakfast && isHighGrowth
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Breakfast Champion',
              action: 'Expand breakfast menu presence',
              note: `Top breakfast performer (${dailyAvg.toFixed(1)} avg/day). Consider breakfast combo deals or early bird promotions.`,
              priority: 10,
            }
          : null,
        isLunch && isHighGrowth
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Lunch Leader',
              action: 'Optimize lunch service',
              note: `Strong lunch performance (${dailyAvg.toFixed(1)} avg/day). Focus on quick service and lunch combos.`,
              priority: 11,
            }
          : null,
        isDinner && isHighGrowth
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Dinner Star',
              action: 'Enhance dinner experience',
              note: `Excellent dinner performance (${dailyAvg.toFixed(1)} avg/day). Consider premium presentation and dinner specials.`,
              priority: 12,
            }
          : null,

        // Protein-Specific Recommendations (Priority 13-17)
        isPork && isHighGrowth
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Pork Powerhouse',
              action: 'Leverage pork popularity',
              note: `Strong pork item performance (${dailyAvg.toFixed(1)} avg/day). Consider pork combo meals and family packs.`,
              priority: 13,
            }
          : null,
        isBeef && isHighGrowth
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Beef Champion',
              action: 'Premium beef positioning',
              note: `Excellent beef item performance (${dailyAvg.toFixed(1)} avg/day). Focus on quality and premium pricing.`,
              priority: 14,
            }
          : null,
        isChicken && isHighGrowth
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Chicken Star',
              action: 'Expand chicken offerings',
              note: `Top chicken performer (${dailyAvg.toFixed(1)} avg/day). Consider chicken variations and healthy options.`,
              priority: 15,
            }
          : null,
        isFish && isHighGrowth
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Fish Favorite',
              action: 'Promote healthy fish options',
              note: `Strong fish item performance (${dailyAvg.toFixed(1)} avg/day). Emphasize health benefits and freshness.`,
              priority: 16,
            }
          : null,
        isVegetarian && isHighGrowth
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Vegetarian Victory',
              action: 'Cater to health-conscious customers',
              note: `Growing vegetarian demand (${dailyAvg.toFixed(1)} avg/day). Expand plant-based menu options.`,
              priority: 17,
            }
          : null,

        // Special Category Recommendations (Priority 18-22)
        isGroupMeal && isHighGrowth
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Group Meal Success',
              action: 'Promote family/group dining',
              note: `Popular group meal option (${dailyAvg.toFixed(1)} avg/day). Focus on family deals and bulk orders.`,
              priority: 18,
            }
          : null,
        isQuickServe && isHighGrowth
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Quick-Serve Winner',
              action: 'Streamline operations',
              note: `Fast-moving quick-serve item (${dailyAvg.toFixed(1)} avg/day). Optimize preparation time and service efficiency.`,
              priority: 19,
            }
          : null,
        isWellStocked && isHighGrowth
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Well-Managed Stock',
              action: 'Maintain current strategy',
              note: `Good stock levels (${availableQty} units) with strong demand (${dailyAvg.toFixed(1)} avg/day). Current strategy is working well.`,
              priority: 20,
            }
          : null,

        // Tag-Based Performance Analysis (Priority 21-25)
        isLowDemandTag && isLowDemand
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Tagged Low-Demand Confirmed',
              action: 'Consider removal or major rebranding',
              note: `Item correctly tagged as low-demand (${dailyAvg.toFixed(1)} avg/day). Consider phase-out or complete menu redesign.`,
              priority: 21,
            }
          : null,
        isPopularTag && !isHighGrowth
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Popular Tag Mismatch',
              action: 'Review and update tags',
              note: `Tagged as popular but underperforming (${dailyAvg.toFixed(1)} avg/day). Update tags to reflect actual performance.`,
              priority: 22,
            }
          : null,
        isNewItem && isHighGrowth
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'New Item Success',
              action: 'Scale up and promote',
              note: `New item exceeding expectations (${dailyAvg.toFixed(1)} avg/day). Increase production and marketing investment.`,
              priority: 23,
            }
          : null,

        // Legacy Categories (Priority 24-26)
        isPopularAllSeason
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Popular & All-Season',
              action: 'Always stock high',
              note: `Top seller all year (${dailyAvg.toFixed(1)} avg/day) — maintain strong stock levels.`,
              priority: 24,
            }
          : null,
        isPopularSeason
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: `Popular in ${season}`,
              action: 'Boost production (seasonal peak)',
              note: `Seasonal favorite (${dailyAvg.toFixed(1)} avg/day). Increase output during ${season} season.`,
              priority: 25,
            }
          : null,
        isSignature
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Signature Item',
              action: 'Always available; keep minimum stock',
              note: `Brand signature item. Do not remove from menu; ensure baseline inventory.`,
              priority: 26,
            }
          : null,
      ]);

      if (best) out.push(best);
    });

    out.sort(
      (a, b) =>
        a.priority - b.priority || String(a.name).localeCompare(String(b.name))
    );
    recommendations.value = out;
  };

  // Generate intelligent promo suggestions based on sales trends and inventory levels
  const generatePromoSuggestions = async () => {
    promoLoading.value = true;
    try {
      const suggestions = [];

      if (!rows.value?.length) {
        promoSuggestions.value = [];
        return;
      }

      const branches =
        selectedBranch.value === 'all'
          ? (branchStore.activeBranches || []).map((b) => b.id)
          : [parseInt(selectedBranch.value)];

      // Track unique suggestions to avoid duplicates
      const uniqueSuggestions = new Set();

      for (const branchId of branches) {
        const branchResults = rows.value.filter((r) => r.branchId === branchId);

        for (const item of branchResults) {
          const itemSuggestions = [];
          const inv = inventoryByItemId.value.get(item.itemId) || {};
          const availableQty = Number(inv.available_quantity || 0);
          const totalProduced = Number(inv.total_produced || 0);
          const dailyConsumption = Number(item.dailyAvgQty || 0);
          const daysSinceActivity = (() => {
            if (!item.lastActivity) return Infinity;
            const now = getCurrentPhilippineTime();
            const last = new Date(item.lastActivity);
            return Math.max(
              0,
              Math.round((now - last) / (1000 * 60 * 60 * 24))
            );
          })();

          // Realistic metrics
          const daysOfCover =
            availableQty > 0
              ? Math.ceil(availableQty / Math.max(dailyConsumption, 0.1))
              : 0;
          const daysUntilStockout = daysOfCover;
          const forecastEntry = (allForecasts.value || []).find(
            (f) => Number(f.id) === Number(item.itemId)
          );
          const trendDirection = forecastEntry?.trendDirection || 'stable';

          // 1) URGENT: very low days-of-cover regardless of trend
          if (availableQty > 0 && daysOfCover <= 3) {
            itemSuggestions.push({
              type: 'urgent',
              priority: 'critical',
              title: 'Urgent Stock Clearance',
              reason: `Very low days of cover (${daysOfCover}d) with current sales of ${dailyConsumption.toFixed(1)}/day`,
              recommendation: `Launch immediate 15-25% discount to accelerate sell-through`,
              discountType: 'percentage',
              discountValue: 20,
              duration: '3-5 days',
              expectedImpact: `Clear ${Math.min(Math.round(availableQty * 0.8), availableQty)} units`,
              icon: 'fa-solid fa-exclamation-triangle',
              color: 'text-error',
            });
          }

          // 2) CLEARANCE: overstocked or long days-of-cover, esp. with flat/down trend
          if (
            availableQty >= 200 &&
            (daysOfCover >= 25 ||
              (availableQty > totalProduced * 0.4 && dailyConsumption < 1.0) ||
              (trendDirection === 'down' && daysOfCover >= 15))
          ) {
            itemSuggestions.push({
              type: 'clearance',
              priority: 'high',
              title: 'Clearance Sale Opportunity',
              reason: `Overstocked: ${availableQty} units (~${daysOfCover} days of cover)`,
              recommendation: `Run 20-30% markdown to reduce excess inventory`,
              discountType: 'percentage',
              discountValue: 25,
              duration: '1-2 weeks',
              expectedImpact: 'Reduce stock by 40-60%',
              icon: 'fa-solid fa-tags',
              color: 'text-warning',
            });
          }

          // 3) BOOST: demand soft / declining but inventory is adequate
          if (
            (trendDirection === 'down' || dailyConsumption <= 1.0) &&
            daysOfCover >= 7 &&
            daysOfCover <= 25
          ) {
            itemSuggestions.push({
              type: 'boost',
              priority: 'medium',
              title: 'Sales Boost Campaign',
              reason: `Soft demand (${dailyConsumption.toFixed(1)}/day) with ${daysOfCover}d cover`,
              recommendation: `Run a 10-15% promo to stimulate demand`,
              discountType: 'percentage',
              discountValue: 12,
              duration: '1-2 weeks',
              expectedImpact: 'Increase daily sales by 30-70%',
              icon: 'fa-solid fa-chart-line',
              color: 'text-info',
            });
          }

          // 4. Seasonal/Weather-based Promo Suggestions
          const currentMonth = new Date().getMonth() + 1;
          const isSummer = currentMonth >= 3 && currentMonth <= 5;
          const isRainy = currentMonth >= 6 && currentMonth <= 10;
          const isChristmas = currentMonth >= 11 || currentMonth <= 1;

          if (isSummer && dailyConsumption < 0.8) {
            itemSuggestions.push({
              type: 'seasonal',
              priority: 'medium',
              title: 'Summer Promotion',
              reason: 'Summer season with lower demand patterns',
              recommendation: `Launch "Summer Special" with 10-15% discount`,
              discountType: 'percentage',
              discountValue: 12,
              duration: '2-3 weeks',
              expectedImpact: 'Maintain sales during low season',
              icon: 'fa-solid fa-sun',
              color: 'text-warning',
            });
          }

          if (isChristmas && dailyConsumption > 1.5) {
            itemSuggestions.push({
              type: 'seasonal',
              priority: 'high',
              title: 'Holiday Bundle Promotion',
              reason: 'High demand during Christmas season',
              recommendation: `Create bundle deals or volume discounts`,
              discountType: 'percentage',
              discountValue: 15,
              duration: '1 month',
              expectedImpact: 'Maximize holiday sales revenue',
              icon: 'fa-solid fa-gift',
              color: 'text-success',
            });
          }

          // 5) VOLUME: strong trend up, healthy stock, reasonable days-of-cover
          if (
            trendDirection === 'up' &&
            dailyConsumption >= 2.0 &&
            availableQty >= Math.max(20, Math.round(dailyConsumption * 7)) &&
            daysOfCover >= 5 &&
            daysOfCover <= 15
          ) {
            itemSuggestions.push({
              type: 'volume',
              priority: 'medium',
              title: 'Volume Discount Promotion',
              reason: `High demand (${dailyConsumption.toFixed(1)}/day), ${daysOfCover}d cover, trend up`,
              recommendation: `Offer "Buy More, Save More" volume discounts`,
              discountType: 'percentage',
              discountValue: 10,
              duration: '2 weeks',
              expectedImpact: 'Increase average order value by 30%',
              icon: 'fa-solid fa-shopping-cart',
              color: 'text-primaryColor',
            });
          }

          // Add suggestions to the main array, but only if they're unique
          itemSuggestions.forEach((suggestion) => {
            const suggestionKey = `${suggestion.type}-${item.branchId}-${item.itemId}`;

            if (!uniqueSuggestions.has(suggestionKey)) {
              uniqueSuggestions.add(suggestionKey);
              suggestions.push({
                ...suggestion,
                branchId: item.branchId,
                branchName: item.branchName,
                itemId: item.itemId,
                itemName: item.itemName,
                currentStock: availableQty,
                dailyConsumption: dailyConsumption,
                unit: 'units',
                daysUntilStockout: daysUntilStockout,
              });
            }
          });
        }
      }

      // Sort suggestions by priority and type
      suggestions.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      promoSuggestions.value = suggestions;
    } catch (error) {
      console.error('Error generating promo suggestions:', error);
      promoSuggestions.value = [];
    } finally {
      promoLoading.value = false;
    }
  };

  const totalPages = computed(() =>
    Math.max(
      1,
      Math.ceil((rows.value.length || 0) / (itemsPerPage.value || 10))
    )
  );
  const pagedRows = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return rows.value.slice(start, start + itemsPerPage.value);
  });

  // Pagination for promo suggestions
  const promoSuggestionsTotalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(
        (promoSuggestions.value.length || 0) /
          promoSuggestionsItemsPerPage.value
      )
    )
  );
  const pagedPromoSuggestions = computed(() => {
    const start =
      (promoSuggestionsCurrentPage.value - 1) *
      promoSuggestionsItemsPerPage.value;
    return promoSuggestions.value.slice(
      start,
      start + promoSuggestionsItemsPerPage.value
    );
  });

  onMounted(async () => {
    try {
      await branchContext.initializeBranchContext();
    } catch (e) {}
    try {
      await branchStore.fetchActiveBranches();
    } catch (e) {}
    await loadProducts();
    await buildRemittedMovements();
  });

  watch([selectedBranch], () => {
    buildRemittedMovements();
  });
  watch([selectedProduct, lookbackDays], () => {
    buildRemittedMovements();
  });

  // simple forecast generation trigger
  watch([selectedProduct, forecastDays], async () => {
    await generateMenuForecast?.();
    await generateAllMenuForecasts?.();
  });

  watch(products, (newProducts) => {
    if (
      !newProducts.find((p) => p.id === selectedProduct.value) &&
      selectedProduct.value !== 'all'
    ) {
      selectedProduct.value = 'all';
    }
  });
</script>

<template>
  <div class="space-y-4">
    <div class="card bg-white shadow border border-black/10">
      <div class="card-body">
        <h3 class="text-sm font-medium text-gray-700 mb-4">
          Menu Movement (Remitted Orders Only)
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label class="label"
              ><span class="label-text text-xs">Branch</span></label
            >
            <select
              class="select select-bordered select-sm w-full"
              v-model="selectedBranch"
              @change="buildRemittedMovements"
            >
              <option v-for="b in allBranches" :key="b.id" :value="b.id">
                {{ b.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="label"
              ><span class="label-text text-xs">Menu Item</span></label
            >
            <select
              class="select select-bordered select-sm w-full"
              v-model="selectedProduct"
              @change="buildRemittedMovements"
            >
              <option v-for="p in products" :key="p.id" :value="p.id">
                {{ p.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="label"
              ><span class="label-text text-xs">Lookback Days</span></label
            >
            <input
              type="number"
              class="input input-bordered input-sm w-full"
              v-model="lookbackDays"
              min="1"
              max="120"
              @change="buildRemittedMovements"
            />
          </div>
          <div>
            <label class="label"
              ><span class="label-text text-xs">Items per page</span></label
            >
            <select
              class="select select-bordered select-sm w-full"
              :value="itemsPerPage"
              @change="
                itemsPerPage = parseInt($event.target.value);
                currentPage = 1;
              "
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
          <div class="flex items-end">
            <button
              class="btn btn-sm btn-outline w-full"
              :disabled="loading"
              @click="buildRemittedMovements"
            >
              <font-awesome-icon
                icon="fa-solid fa-sync-alt"
                :class="{ 'animate-spin': loading }"
                class="mr-2"
              />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="card bg-white shadow border border-black/10">
      <div class="card-body">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-gray-700">
            Remitted Menu Movements
          </h3>
          <div class="text-xs text-gray-500">
            Derived from approved remittances only
          </div>
        </div>

        <div v-if="loading" class="flex justify-center py-8">
          <div
            class="loading loading-spinner loading-md text-primaryColor"
          ></div>
        </div>

        <div v-else>
          <!-- Summary Statistics -->
          <div
            class="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg"
          >
            <div class="stat-item">
              <div class="text-xs text-gray-600">Total Orders</div>
              <div class="text-lg font-semibold text-gray-800">
                {{ rows.reduce((sum, r) => sum + r.ordersCount, 0) }}
              </div>
            </div>
            <div class="stat-item">
              <div class="text-xs text-gray-600">Total Items Sold</div>
              <div class="text-lg font-semibold text-gray-800">
                {{ rows.reduce((sum, r) => sum + r.totalQuantity, 0) }}
              </div>
            </div>
            <div class="stat-item">
              <div class="text-xs text-gray-600">Avg Items/Order</div>
              <div class="text-lg font-semibold text-gray-800">
                {{
                  rows.length > 0
                    ? (
                        rows.reduce((sum, r) => sum + r.totalQuantity, 0) /
                        rows.reduce((sum, r) => sum + r.ordersCount, 0)
                      ).toFixed(1)
                    : '0'
                }}
              </div>
            </div>
            <div class="stat-item">
              <div class="text-xs text-gray-600">Unique Menu Items</div>
              <div class="text-lg font-semibold text-gray-800">
                {{ rows.length }}
              </div>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="table w-full">
              <thead>
                <tr>
                  <th class="text-xs">Branch</th>
                  <th class="text-xs">Menu Item</th>
                  <th class="text-xs">
                    Orders <span class="text-gray-400">(count)</span>
                  </th>
                  <th class="text-xs">Avg Qty/Day</th>
                  <th class="text-xs">Remittances</th>
                  <th class="text-xs">
                    Total Sold <span class="text-gray-400">(quantity)</span>
                  </th>
                  <th class="text-xs">Last Activity</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in pagedRows" :key="`${r.branchId}-${r.itemId}`">
                  <td class="text-xs">{{ r.branchName }}</td>
                  <td class="text-xs">{{ r.itemName }}</td>
                  <td class="text-xs">{{ r.ordersCount }}</td>
                  <td class="text-xs">{{ r.dailyAvgQty.toLocaleString() }}</td>
                  <td class="text-xs">{{ r.uniqueRemittances }}</td>
                  <td class="text-xs">
                    {{ r.totalQuantity.toLocaleString() }}
                  </td>
                  <td class="text-xs">{{ r.lastActivity }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-3 flex items-center justify-between text-sm">
          <div class="text-gray-600">
            Page {{ currentPage }} of {{ totalPages }}
          </div>
          <div class="join">
            <button
              class="btn btn-xs join-item"
              :disabled="currentPage <= 1"
              @click="currentPage = Math.max(1, currentPage - 1)"
            >
              Prev
            </button>
            <button
              class="btn btn-xs join-item"
              :disabled="currentPage >= totalPages"
              @click="currentPage = Math.min(totalPages, currentPage + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Trend Chart -->
    <div class="card bg-white shadow border border-black/10">
      <div class="card-body">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-gray-700">
            Remitted Menu Movement Trends
          </h3>
          <div class="flex items-center gap-2">
            <select
              class="select select-bordered select-xs"
              v-model="chartMode"
            >
              <option value="sum">Daily Sum (Line)</option>
              <option value="perMenu">Per Menu (Bar)</option>
            </select>
          </div>
        </div>
        <div v-if="chartMode === 'sum'">
          <SalesTrendsChart
            :labels="trendLabels"
            :data="trendData"
            metric="totalTransactions"
          />
        </div>
        <div v-else>
          <BarChartJS
            :labels="perMenuLabels"
            :data="perMenuData"
            dataset-label="Total Items Sold"
            color="#f59e0b"
            :height="320"
            format-tooltip="enhanced-quantity"
          />
        </div>
      </div>
    </div>

    <!-- DSS Recommendations -->
    <div class="card bg-white shadow border border-black/10">
      <div class="card-body">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-gray-700">DSS Recommendations</h3>
          <div class="text-xs text-gray-500">
            Rules A–E applied to remitted sales + inventory
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead>
              <tr>
                <th class="text-xs">Branch</th>
                <th class="text-xs">Menu Item</th>
                <th class="text-xs">Rule</th>
                <th class="text-xs">Action</th>
                <th class="text-xs">Note</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in recommendations"
                :key="`${r.rule}-${r.itemId}-${r.branchName || 'all'}`"
              >
                <td class="text-xs">{{ r.branchName || 'All Branches' }}</td>
                <td class="text-xs">{{ r.name }}</td>
                <td class="text-xs">{{ r.rule }}</td>
                <td class="text-xs font-medium">{{ r.action }}</td>
                <td class="text-xs text-gray-600">{{ r.note }}</td>
              </tr>
              <tr v-if="!recommendations.length">
                <td colspan="4" class="text-center text-xs text-gray-500">
                  No recommendations yet — adjust filters or date range.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Intelligent Promo Suggestions -->
    <div class="card bg-white shadow border border-black/10">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-gray-700">
            <font-awesome-icon icon="fa-solid fa-bullseye" />
            Intelligent Promo Suggestions
          </h3>
          <div class="flex items-center gap-2">
            <div class="badge badge-sm bg-primaryColor/10 text-primaryColor">
              {{ promoSuggestions.length }} Suggestions
            </div>
            <button
              class="btn btn-xs bg-gray-100 text-gray-800 hover:bg-gray-200"
              @click="generatePromoSuggestions"
              :disabled="promoLoading"
            >
              <font-awesome-icon
                icon="fa-solid fa-sync-alt"
                :class="{ 'animate-spin': promoLoading }"
                class="mr-1"
              />
              Refresh
            </button>
          </div>
        </div>

        <!-- View Controls -->
        <div
          v-if="promoSuggestions.length > 0"
          class="flex items-center justify-between mb-4"
        >
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-600">View:</span>
            <div class="btn-group btn-group-xs gap-2 flex flex-row">
              <div class="">
                <button
                  class="btn btn-xs font-thin"
                  :class="
                    promoSuggestionsViewMode === 'list'
                      ? 'bg-primaryColor text-white'
                      : 'bg-gray-100 text-gray-800'
                  "
                  @click="promoSuggestionsViewMode = 'list'"
                >
                  <font-awesome-icon icon="fa-solid fa-list" class="mr-1" />
                  List
                </button>
              </div>
              <div class="">
                <button
                  class="btn btn-xs font-thin"
                  :class="
                    promoSuggestionsViewMode === 'card'
                      ? 'bg-primaryColor text-white'
                      : 'bg-gray-100 text-gray-800'
                  "
                  @click="promoSuggestionsViewMode = 'card'"
                >
                  <font-awesome-icon icon="fa-solid fa-th" class="mr-1" />
                  Cards
                </button>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-600">Items per page:</span>
            <select
              class="select select-bordered select-xs"
              :value="promoSuggestionsItemsPerPage"
              @change="
                promoSuggestionsItemsPerPage = parseInt($event.target.value);
                promoSuggestionsCurrentPage = 1;
              "
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
            </select>
          </div>
        </div>

        <!-- Promo Suggestions Display -->
        <div v-if="promoSuggestions.length > 0">
          <!-- Card View -->
          <div
            v-if="promoSuggestionsViewMode === 'card'"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <div
              v-for="suggestion in pagedPromoSuggestions"
              :key="`${suggestion.branchId}-${suggestion.itemId}-${suggestion.type}`"
              class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border-l-4"
              :class="{
                'border-error': suggestion.priority === 'critical',
                'border-warning': suggestion.priority === 'high',
                'border-primaryColor': suggestion.priority === 'medium',
                'border-secondary': suggestion.priority === 'low',
              }"
            >
              <!-- Header -->
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                  <font-awesome-icon
                    :icon="suggestion.icon"
                    :class="suggestion.color"
                    class="text-lg"
                  />
                  <div>
                    <h4 class="text-sm font-semibold text-gray-800">
                      {{ suggestion.title }}
                    </h4>
                    <div class="text-xs text-gray-600">
                      {{ suggestion.branchName }} • {{ suggestion.itemName }}
                    </div>
                  </div>
                </div>
                <div
                  class="badge badge-xs"
                  :class="{
                    'bg-error/10 text-error':
                      suggestion.priority === 'critical',
                    'bg-warning/10 text-warning':
                      suggestion.priority === 'high',
                    'bg-primaryColor/10 text-primaryColor':
                      suggestion.priority === 'medium',
                    'bg-gray-100 text-gray-800': suggestion.priority === 'low',
                  }"
                >
                  {{ suggestion.priority.toUpperCase() }}
                </div>
              </div>

              <!-- Reason -->
              <div class="mb-3">
                <p class="text-xs text-gray-700 font-medium mb-1">Reason:</p>
                <p class="text-xs text-gray-600">{{ suggestion.reason }}</p>
              </div>

              <!-- Recommendation -->
              <div class="mb-3">
                <p class="text-xs text-gray-700 font-medium mb-1">
                  Recommendation:
                </p>
                <p class="text-xs text-gray-800">
                  {{ suggestion.recommendation }}
                </p>
              </div>

              <!-- Promo Details -->
              <div class="bg-white rounded-md p-3 mb-3">
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span class="text-gray-600">Discount:</span>
                    <div class="font-semibold text-primaryColor">
                      {{ suggestion.discountValue }}%
                      {{
                        suggestion.discountType === 'percentage'
                          ? 'off'
                          : 'fixed'
                      }}
                    </div>
                  </div>
                  <div>
                    <span class="text-gray-600">Duration:</span>
                    <div class="font-semibold">{{ suggestion.duration }}</div>
                  </div>
                  <div>
                    <span class="text-gray-600">Current Stock:</span>
                    <div class="font-semibold">
                      {{ suggestion.currentStock }} {{ suggestion.unit }}
                    </div>
                  </div>
                  <div>
                    <span class="text-gray-600">Daily Sales:</span>
                    <div class="font-semibold">
                      {{ suggestion.dailyConsumption }}
                      {{ suggestion.unit }}/day
                    </div>
                  </div>
                </div>
              </div>

              <!-- Expected Impact -->
              <div class="mb-3">
                <p class="text-xs text-gray-700 font-medium mb-1">
                  Expected Impact:
                </p>
                <p class="text-xs text-green-700 font-medium">
                  {{ suggestion.expectedImpact }}
                </p>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-2">
                <button
                  class="btn btn-xs bg-primaryColor text-white flex-1 font-thin"
                >
                  <font-awesome-icon icon="fa-solid fa-plus" class="mr-1" />
                  Create Promo
                </button>
                <button
                  class="btn btn-xs font-thin border-gray-300 text-gray-600"
                  :title="`Detailed analysis for ${suggestion.itemName}: ${suggestion.reason}`"
                >
                  <font-awesome-icon icon="fa-solid fa-info-circle" />
                </button>
              </div>
            </div>
          </div>

          <!-- List View -->
          <div
            v-else-if="promoSuggestionsViewMode === 'list'"
            class="space-y-3"
          >
            <div
              v-for="suggestion in pagedPromoSuggestions"
              :key="`${suggestion.branchId}-${suggestion.itemId}-${suggestion.type}`"
              class="bg-white border rounded-lg p-4 border-l-4"
              :class="{
                'border-error': suggestion.priority === 'critical',
                'border-warning': suggestion.priority === 'high',
                'border-primaryColor': suggestion.priority === 'medium',
                'border-secondary': suggestion.priority === 'low',
              }"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <font-awesome-icon
                    :icon="suggestion.icon"
                    :class="suggestion.color"
                    class="text-lg"
                  />
                  <div>
                    <h4 class="text-sm font-semibold text-gray-800">
                      {{ suggestion.title }}
                    </h4>
                    <div class="text-xs text-gray-600">
                      {{ suggestion.branchName }} • {{ suggestion.itemName }}
                    </div>
                  </div>
                </div>
                <div
                  class="badge badge-xs"
                  :class="{
                    'bg-red-100 text-red-800':
                      suggestion.priority === 'critical',
                    'bg-orange-100 text-orange-800':
                      suggestion.priority === 'high',
                    'bg-blue-100 text-blue-800':
                      suggestion.priority === 'medium',
                    'bg-gray-100 text-gray-800': suggestion.priority === 'low',
                  }"
                >
                  {{ suggestion.priority.toUpperCase() }}
                </div>
              </div>

              <div class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p class="text-xs text-gray-700 font-medium mb-1">Reason:</p>
                  <p class="text-xs text-gray-600">{{ suggestion.reason }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-700 font-medium mb-1">
                    Recommendation:
                  </p>
                  <p class="text-xs text-gray-800">
                    {{ suggestion.recommendation }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-gray-700 font-medium mb-1">
                    Expected Impact:
                  </p>
                  <p class="text-xs text-green-700 font-medium">
                    {{ suggestion.expectedImpact }}
                  </p>
                </div>
              </div>

              <div class="mt-3 flex items-center justify-between">
                <div class="flex items-center gap-4 text-xs">
                  <div>
                    <span class="text-gray-600">Discount:</span>
                    <span class="font-semibold text-primaryColor ml-1">
                      {{ suggestion.discountValue }}%
                      {{
                        suggestion.discountType === 'percentage'
                          ? 'off'
                          : 'fixed'
                      }}
                    </span>
                  </div>
                  <div>
                    <span class="text-gray-600">Duration:</span>
                    <span class="font-semibold ml-1">{{
                      suggestion.duration
                    }}</span>
                  </div>
                  <div>
                    <span class="text-gray-600">Stock:</span>
                    <span class="font-semibold ml-1"
                      >{{ suggestion.currentStock }} {{ suggestion.unit }}</span
                    >
                  </div>
                  <div>
                    <span class="text-gray-600">Daily Sales:</span>
                    <span class="font-semibold ml-1"
                      >{{ suggestion.dailyConsumption }}
                      {{ suggestion.unit }}/day</span
                    >
                  </div>
                </div>
                <div class="flex gap-2">
                  <button
                    class="btn btn-xs bg-primaryColor text-white font-thin"
                  >
                    <font-awesome-icon icon="fa-solid fa-plus" class="mr-1" />
                    Create Promo
                  </button>
                  <button
                    class="btn btn-xs font-thin border-gray-300 text-gray-600"
                    :title="`Detailed analysis for ${suggestion.itemName}: ${suggestion.reason}`"
                  >
                    <font-awesome-icon icon="fa-solid fa-info-circle" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div
            v-if="promoSuggestionsTotalPages > 1"
            class="mt-4 flex items-center justify-between text-sm"
          >
            <div class="text-gray-600">
              Page {{ promoSuggestionsCurrentPage }} of
              {{ promoSuggestionsTotalPages }} ({{ promoSuggestions.length }}
              total suggestions)
            </div>
            <div class="join">
              <button
                class="btn btn-xs join-item"
                :disabled="promoSuggestionsCurrentPage <= 1"
                @click="
                  promoSuggestionsCurrentPage = Math.max(
                    1,
                    promoSuggestionsCurrentPage - 1
                  )
                "
              >
                Prev
              </button>
              <button
                class="btn btn-xs join-item"
                :disabled="
                  promoSuggestionsCurrentPage >= promoSuggestionsTotalPages
                "
                @click="
                  promoSuggestionsCurrentPage = Math.min(
                    promoSuggestionsTotalPages,
                    promoSuggestionsCurrentPage + 1
                  )
                "
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <!-- No Suggestions State -->
        <div v-else-if="!promoLoading" class="text-center py-8 text-gray-500">
          <font-awesome-icon
            icon="fa-solid fa-lightbulb"
            class="text-4xl mb-4 text-gray-300"
          />
          <div class="space-y-2">
            <div class="text-sm font-medium">
              No Promo Suggestions Available
            </div>
            <div class="text-xs">
              All menu items are performing well or have adequate stock levels.
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-else class="text-center py-8">
          <div class="loading loading-spinner loading-md text-purple-600"></div>
          <div class="text-sm text-gray-600 mt-2">
            Analyzing promo opportunities...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
