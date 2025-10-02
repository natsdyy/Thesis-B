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
      const labelsSorted = Array.from(perDayTotals.keys()).sort();
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

      // Tunable thresholds
      const isPopularAllSeason =
        tags.includes('popular') &&
        tags.includes('all-season') &&
        dailyAvg >= 0.5;
      const isPopularSeason =
        tags.includes('popular') && tags.includes(season) && dailyAvg >= 0.4;
      const isSignature = tags.includes('signature');
      const isLowDemand = dailyAvg < Math.max(0.3, 0.5 * globalAvg);
      const isOverstock =
        totalProduced > 0 &&
        availableQty > 0.4 * totalProduced &&
        dailyAvg < 1 &&
        daysSinceActivity >= 3;

      const best = chooseBest([
        isOverstock
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Overstock Risk',
              action: 'Run promo to clear stock',
              note: `Available ${availableQty} > 40% of produced ${totalProduced} with slow sales; last activity ${daysSinceActivity} day(s) ago.`,
              priority: 1,
            }
          : null,
        isLowDemand
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Low-Demand',
              action: 'Consider promo/rebranding or phase-out',
              note: 'Low sales in recent period; evaluate marketing or removal.',
              priority: 2,
            }
          : null,
        isPopularSeason
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: `Popular in ${season}`,
              action: 'Boost production (seasonal peak)',
              note: `Increase output during ${season} season to meet demand.`,
              priority: 3,
            }
          : null,
        isPopularAllSeason
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Popular & All-Season',
              action: 'Always stock high',
              note: 'Top seller all year — maintain strong stock levels.',
              priority: 4,
            }
          : null,
        isSignature
          ? {
              itemId,
              name,
              branchName: branchLabel,
              rule: 'Signature',
              action: 'Always available; keep minimum stock',
              note: 'Do not remove from menu; ensure baseline inventory.',
              priority: 5,
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
  </div>
</template>

<style scoped></style>
