<script setup>
  import { ref, computed, watch, onMounted } from 'vue';
  import { useBranchContextStore } from '../../stores/branchContextStore.js';
  import { useBranchStore } from '../../stores/branchStore.js';
  import { usePOSStore } from '../../stores/posStore.js';
  import { useBranchInventoryStore } from '../../stores/branchInventoryStore.js';

  // Props
  const props = defineProps({
    loading: {
      type: Boolean,
      default: false,
    },
  });

  // State
  const inventoryForecastData = ref(null);
  const inventoryLoading = ref(false);
  const selectedInventoryBranch = ref('all');
  const selectedInventoryItem = ref('all');
  const forecastDaysInventory = ref(7);

  // Pagination for inventory table
  const inventoryCurrentPage = ref(1);
  const inventoryItemsPerPage = ref(10);

  // Pagination for stock projections
  const projectionsCurrentPage = ref(1);
  const projectionsItemsPerPage = ref(10);

  // Stores for real data
  const branchContext = useBranchContextStore();
  const posStore = usePOSStore();
  const branchStore = useBranchStore();
  const branchInventoryStore = useBranchInventoryStore();

  // Real branches from store
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

  // Branch inventory data - get current inventory items per branch
  const branchInventoryData = ref({});
  const branchInventoryLoading = ref(false);

  // Real menu products fetched from POS per branch context (not inventory-derived)
  const products = ref([{ id: 'all', name: 'All Products' }]);

  const loadProducts = async () => {
    try {
      const activeList = branchStore.activeBranches || [];
      const ctxList = branchContext.availableBranches || [];
      const baseList = activeList.length ? activeList : ctxList;
      const ids =
        selectedInventoryBranch.value === 'all'
          ? baseList.length
            ? baseList.map((b) => b.id)
            : branchContext.currentBranch
              ? [branchContext.currentBranch.id]
              : []
          : [parseInt(selectedInventoryBranch.value)];

      const lists = await Promise.all(
        ids.map((bid) =>
          posStore.fetchBranchMenuItems(bid, { includeUnavailable: true })
        )
      );
      const merged = new Map();
      lists.flat().forEach((it) => {
        // Filter for production items only - exclude beverages, SCM items, and Item 0
        const isProductionItem =
          it.item_type === 'production' &&
          it.id !== 0 &&
          it.id !== '0' &&
          it.name !== 'Item 0' &&
          it.name !== 'item 0' &&
          it.name !== 'Item0' &&
          it.name !== 'item0' &&
          it.name !== '0' &&
          it.item_type !== 'scm' &&
          it.category !== 'SCM' &&
          it.category !== 'scm' &&
          it.category !== 'Beverage' &&
          it.category !== 'beverage' &&
          !it.category?.toLowerCase().includes('beverage') &&
          !it.name?.toLowerCase().includes('drink') &&
          !it.name?.toLowerCase().includes('juice') &&
          !it.name?.toLowerCase().includes('water') &&
          !it.name?.toLowerCase().includes('coffee') &&
          !it.name?.toLowerCase().includes('tea') &&
          !it.name?.toLowerCase().includes('soda') &&
          !it.name?.toLowerCase().includes('coke') &&
          !it.name?.toLowerCase().includes('pepsi') &&
          !it.name?.toLowerCase().includes('sprite') &&
          !it.name?.toLowerCase().includes('item 0') &&
          !it.name?.toLowerCase().includes('item0');

        if (isProductionItem && !merged.has(it.id)) {
          merged.set(it.id, {
            id: it.id,
            name: it.name,
            category: it.category,
          });
        }
      });
      const arr = Array.from(merged.values()).sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      );
      products.value = [{ id: 'all', name: 'All Production Items' }, ...arr];
      if (
        !products.value.find((p) => p.id === selectedInventoryItem.value) &&
        selectedInventoryItem.value !== 'all'
      ) {
        selectedInventoryItem.value = 'all';
      }
    } catch (e) {
      products.value = [{ id: 'all', name: 'All Products' }];
      selectedInventoryItem.value = 'all';
    }
  };

  // Load branch inventory data using store
  const loadBranchInventory = async () => {
    try {
      branchInventoryLoading.value = true;

      // Get all branches to fetch inventory for
      let branches = [];
      if (selectedInventoryBranch.value === 'all') {
        branches = (branchStore.activeBranches || []).map((b) => b.id);

        // If no active branches, try to get them from branchContext as fallback
        if (branches.length === 0) {
          branches = (branchContext.availableBranches || []).map((b) => b.id);
        }
      } else {
        branches = [parseInt(selectedInventoryBranch.value)];
      }

      if (branches.length === 0) {
        console.warn('❌ No branches found to fetch inventory for');
        branchInventoryData.value = {};
        return;
      }

      // Use the store's multiple branch inventory method - focus on production items only, exclude SCM
      const result = await branchInventoryStore.fetchMultipleBranchInventory(
        branches,
        {
          item_type: 'production',
          category: 'Production',
          exclude_scm: true,
          exclude_item_zero: true,
        }
      );

      // Store results by branch ID
      branchInventoryData.value = result;

      // Basic integrity check
      branches.forEach((branchId) => {
        const branchData = result[branchId] || [];
        return branchData.length;
      });
    } catch (error) {
      // ignore, UI will show empty state
    } finally {
      branchInventoryLoading.value = false;
    }
  };

  // Calculate consumption STRICTLY from REMITTED orders (approved remittances) via POS order history
  const calculateConsumptionFromRemittedOrders = async (
    menuItemId,
    branchId,
    days = 30
  ) => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const history = await posStore.fetchOrderHistory({
        branch_id: branchId,
        status: 'completed',
        limit: 1000,
        date_from: startDate.toISOString(),
        date_to: endDate.toISOString(),
      });
      const orders = Array.isArray(history?.data) ? history.data : [];
      const remittedOnly = orders.filter((o) => {
        const hasRemit = o && o.remittance_id != null;
        const status = String(o?.remittance_status || '').toLowerCase();
        const isApproved = status === 'approved';
        return hasRemit && isApproved;
      });

      let totalQuantity = 0;
      let orderCount = 0;
      const remittanceIds = new Set();
      remittedOnly.forEach((o) => {
        const items = Array.isArray(o.items) ? o.items : [];
        const matched = items.filter(
          (it) =>
            Number(it.menu_item_id) === Number(menuItemId) &&
            it.menu_item_id !== 0 &&
            it.item_name !== 'Item 0' &&
            it.item_name !== 'item 0' &&
            it.item_name !== 'Item0' &&
            it.item_name !== 'item0' &&
            it.item_name !== '0' &&
            it.item_type === 'production' &&
            it.item_type !== 'scm' &&
            it.category !== 'SCM' &&
            it.category !== 'scm' &&
            it.category !== 'Beverage' &&
            it.category !== 'beverage' &&
            !it.category?.toLowerCase().includes('beverage') &&
            !it.name?.toLowerCase().includes('drink') &&
            !it.name?.toLowerCase().includes('juice') &&
            !it.name?.toLowerCase().includes('water') &&
            !it.name?.toLowerCase().includes('coffee') &&
            !it.name?.toLowerCase().includes('tea') &&
            !it.name?.toLowerCase().includes('soda') &&
            !it.name?.toLowerCase().includes('coke') &&
            !it.name?.toLowerCase().includes('pepsi') &&
            !it.name?.toLowerCase().includes('sprite')
        );
        if (matched.length > 0) {
          orderCount += 1;
          if (o.remittance_id != null) remittanceIds.add(o.remittance_id);
          matched.forEach((it) => {
            totalQuantity += Number(it.quantity || 0);
          });
        }
      });

      const dailyConsumption = days > 0 ? totalQuantity / days : 0;

      return {
        totalQuantity,
        orderCount,
        dailyConsumption: Math.round(dailyConsumption * 100) / 100,
        periodDays: days,
        remittanceIds: Array.from(remittanceIds),
      };
    } catch (error) {
      return {
        totalQuantity: 0,
        orderCount: 0,
        dailyConsumption: 0,
        periodDays: days,
        remittanceIds: [],
      };
    }
  };

  // Main inventory demand calculation function
  const calculateInventoryDemand = async () => {
    inventoryLoading.value = true;

    try {
      // Load branch inventory data first
      await loadBranchInventory();

      const branches =
        selectedInventoryBranch.value === 'all'
          ? (branchStore.activeBranches || []).map((b) => b.id)
          : [parseInt(selectedInventoryBranch.value)];

      const forecastResults = [];

      for (const branchId of branches) {
        const branchList = Array.isArray(allBranches.value)
          ? allBranches.value
          : [];
        const branchName =
          branchList.find((b) => b.id === branchId)?.name ||
          `Branch ${branchId}`;

        // Build list of menu items to process from POS products - production items only
        const menuItemsAll = (
          Array.isArray(products.value) ? products.value : []
        ).filter((p) => p.id !== 'all');

        // Additional filter to ensure only production items are processed - exclude Item 0 and SCM items
        const productionItemsOnly = menuItemsAll.filter((item) => {
          return (
            item.item_type === 'production' &&
            item.id !== 0 &&
            item.id !== '0' &&
            item.name !== 'Item 0' &&
            item.name !== 'item 0' &&
            item.name !== 'Item0' &&
            item.name !== 'item0' &&
            item.name !== '0' &&
            item.item_type !== 'scm' &&
            item.category !== 'SCM' &&
            item.category !== 'scm' &&
            item.category !== 'Beverage' &&
            item.category !== 'beverage' &&
            !item.category?.toLowerCase().includes('beverage') &&
            !item.name?.toLowerCase().includes('coke') &&
            !item.name?.toLowerCase().includes('pepsi') &&
            !item.name?.toLowerCase().includes('sprite') &&
            !item.name?.toLowerCase().includes('item 0') &&
            !item.name?.toLowerCase().includes('item0')
          );
        });

        const menuItemsToProcess =
          selectedInventoryItem.value === 'all'
            ? productionItemsOnly
            : productionItemsOnly.filter(
                (p) => Number(p.id) === Number(selectedInventoryItem.value)
              );

        // Inventory list for stock lookup
        const branchItems = branchInventoryData.value[branchId] || [];

        for (const product of menuItemsToProcess) {
          if (!product) continue;

          const itemId = Number(product.id);
          const itemName = product.name || `Item ${itemId}`;

          // Try to find matching inventory record for current stock by menu_item_id
          const invMatch =
            branchItems.find(
              (bi) =>
                Number(bi.menu_item_id || bi.menuItemId) === Number(itemId)
            ) || {};

          const currentStock = Number(invMatch.quantity || 0);
          const reorderPoint = Number(invMatch.minimum_quantity || 5);
          const maxStock = Number(
            invMatch.maximum_quantity || currentStock * 2
          );

          // Calculate consumption from REMITTED orders
          const consumptionData = await calculateConsumptionFromRemittedOrders(
            itemId,
            branchId,
            30
          );

          const dailyConsumption = consumptionData.dailyConsumption || 0;

          // Calculate days until stockout
          const daysUntilStockout =
            dailyConsumption > 0
              ? Math.floor(currentStock / dailyConsumption)
              : Infinity;

          // Calculate projected stock levels for forecast period
          const projectedStock = [];
          const stockoutDate = new Date();
          stockoutDate.setDate(stockoutDate.getDate() + daysUntilStockout);

          for (let day = 1; day <= forecastDaysInventory.value; day++) {
            const projected = Math.max(
              0,
              currentStock - dailyConsumption * day
            );
            projectedStock.push(projected);
          }

          // Determine if reorder is needed
          const needsReorder = daysUntilStockout <= forecastDaysInventory.value;
          const reorderQuantity = Math.ceil(dailyConsumption * 7 * 1.5); // 1.5 weeks supply

          const urgencyLevel =
            daysUntilStockout <= 2
              ? 'critical'
              : daysUntilStockout <= 5
                ? 'high'
                : daysUntilStockout <= 10
                  ? 'medium'
                  : 'low';

          forecastResults.push({
            branchId,
            branchName,
            itemId,
            itemName: itemName,
            unit: invMatch.unit_of_measure || 'servings',
            category: invMatch.category || 'Production',
            currentStock,
            dailyConsumption,
            minStock: reorderPoint,
            maxStock,
            daysUntilStockout:
              daysUntilStockout === Infinity ? 999 : daysUntilStockout,
            stockoutDate:
              daysUntilStockout === Infinity
                ? 'Never'
                : stockoutDate.toISOString().split('T')[0],
            projectedStock,
            needsReorder,
            reorderQuantity,
            urgencyLevel,
            projectedStockLevels: projectedStock.map((level, index) => ({
              day: index + 1,
              date: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0],
              stock: level,
              status:
                level <= reorderPoint
                  ? 'low'
                  : level <= reorderPoint * 1.5
                    ? 'warning'
                    : 'good',
            })),
            // include remittance IDs used for this demand window for traceability
            remittanceIds: consumptionData.remittanceIds || [],
          });
        }
      }

      // If a specific item is selected but no results found, show warning
      if (
        selectedInventoryItem.value !== 'all' &&
        forecastResults.length === 0
      ) {
        inventoryForecastData.value = {
          results: [],
          summary: {
            totalItems: 0,
            criticalItems: 0,
            highPriorityItems: 0,
            needsReorder: 0,
          },
          warning: `Selected menu item is not found in branch inventory. Please ensure the item is distributed to branches.`,
        };
        return;
      }

      inventoryForecastData.value = {
        results: forecastResults,
        summary: {
          totalItems: forecastResults.length,
          criticalItems: forecastResults.filter(
            (r) => r.urgencyLevel === 'critical'
          ).length,
          highPriorityItems: forecastResults.filter(
            (r) => r.urgencyLevel === 'high'
          ).length,
          needsReorder: forecastResults.filter((r) => r.needsReorder).length,
        },
      };
    } catch (error) {
      inventoryForecastData.value = {
        results: [],
        summary: {
          totalItems: 0,
          criticalItems: 0,
          highPriorityItems: 0,
          needsReorder: 0,
        },
      };
    } finally {
      inventoryLoading.value = false;
    }
  };

  // Pagination computed properties for inventory table
  const paginatedInventoryResults = computed(() => {
    if (!inventoryForecastData.value?.results) return [];
    const start =
      (inventoryCurrentPage.value - 1) * inventoryItemsPerPage.value;
    const end = start + inventoryItemsPerPage.value;
    return inventoryForecastData.value.results.slice(start, end);
  });

  const inventoryTotalPages = computed(() => {
    if (!inventoryForecastData.value?.results) return 1;
    return Math.ceil(
      inventoryForecastData.value.results.length / inventoryItemsPerPage.value
    );
  });

  const inventoryStartItem = computed(() => {
    return (inventoryCurrentPage.value - 1) * inventoryItemsPerPage.value + 1;
  });

  const inventoryEndItem = computed(() => {
    const total = inventoryForecastData.value?.results?.length || 0;
    return Math.min(
      inventoryCurrentPage.value * inventoryItemsPerPage.value,
      total
    );
  });

  // Pagination computed properties for stock projections
  const paginatedProjections = computed(() => {
    if (!inventoryForecastData.value?.results) return [];

    // Show items that need reorder within forecast period OR items with lower stock levels (within 60 days) or high consumption
    const itemsNeedingReorder = inventoryForecastData.value.results.filter(
      (r) =>
        r.needsReorder || r.daysUntilStockout <= 60 || r.dailyConsumption >= 0.2
    );

    const start =
      (projectionsCurrentPage.value - 1) * projectionsItemsPerPage.value;
    const end = start + projectionsItemsPerPage.value;
    return itemsNeedingReorder.slice(start, end);
  });

  const projectionsTotalPages = computed(() => {
    if (!inventoryForecastData.value?.results) return 1;

    // Show items that need reorder within forecast period OR items with lower stock levels (within 60 days) or high consumption
    const itemsNeedingReorder = inventoryForecastData.value.results.filter(
      (r) =>
        r.needsReorder || r.daysUntilStockout <= 60 || r.dailyConsumption >= 0.2
    );

    return Math.ceil(
      itemsNeedingReorder.length / projectionsItemsPerPage.value
    );
  });

  const projectionsStartItem = computed(() => {
    const itemsNeedingReorder =
      inventoryForecastData.value?.results?.filter(
        (r) => r.needsReorder || r.daysUntilStockout <= 30
      ) || [];
    return (
      (projectionsCurrentPage.value - 1) * projectionsItemsPerPage.value + 1
    );
  });

  const projectionsEndItem = computed(() => {
    const itemsNeedingReorder =
      inventoryForecastData.value?.results?.filter(
        (r) => r.needsReorder || r.daysUntilStockout <= 30
      ) || [];
    const total = itemsNeedingReorder.length;
    return Math.min(
      projectionsCurrentPage.value * projectionsItemsPerPage.value,
      total
    );
  });

  // Pagination functions
  const goToInventoryPage = (page) => {
    inventoryCurrentPage.value = Math.max(
      1,
      Math.min(page, inventoryTotalPages.value)
    );
  };

  const nextInventoryPage = () => {
    if (inventoryCurrentPage.value < inventoryTotalPages.value) {
      inventoryCurrentPage.value++;
    }
  };

  const prevInventoryPage = () => {
    if (inventoryCurrentPage.value > 1) {
      inventoryCurrentPage.value--;
    }
  };

  const changeInventoryItemsPerPage = (itemsPerPage) => {
    inventoryItemsPerPage.value = itemsPerPage;
    inventoryCurrentPage.value = 1;
  };

  // Pagination functions for stock projections
  const goToProjectionsPage = (page) => {
    projectionsCurrentPage.value = Math.max(
      1,
      Math.min(page, projectionsTotalPages.value)
    );
  };

  const nextProjectionsPage = () => {
    if (projectionsCurrentPage.value < projectionsTotalPages.value) {
      projectionsCurrentPage.value++;
    }
  };

  const prevProjectionsPage = () => {
    if (projectionsCurrentPage.value > 1) {
      projectionsCurrentPage.value--;
    }
  };

  const changeProjectionsItemsPerPage = (itemsPerPage) => {
    projectionsItemsPerPage.value = itemsPerPage;
    projectionsCurrentPage.value = 1;
  };

  // Manual refresh function
  const refreshBranchesAndInventory = async () => {
    try {
      await branchContext.initializeBranchContext();
    } catch (e) {}
    try {
      await branchStore.fetchActiveBranches();
    } catch (e) {}

    // Clear cache and recalculate
    branchInventoryStore.clearInventoryCache();
    await calculateInventoryDemand();
  };

  // Initialize component
  onMounted(async () => {
    try {
      await branchContext.initializeBranchContext();
    } catch (e) {}
    try {
      await branchStore.fetchActiveBranches();
    } catch (e) {}
    await loadProducts();
    // Only calculate inventory demand if we have branches
    if (branchStore.activeBranches && branchStore.activeBranches.length > 0) {
      await calculateInventoryDemand();
    }
  });

  // Watch for changes
  watch([selectedInventoryBranch], () => {
    loadProducts().then(() => calculateInventoryDemand());
  });

  watch(
    () =>
      [
        (branchContext.availableBranches || []).map((b) => b.id).join(','),
        (branchStore.activeBranches || []).map((b) => b.id).join(','),
      ].join('|'),
    () => {
      calculateInventoryDemand();
    }
  );

  watch([selectedInventoryItem, forecastDaysInventory], () => {
    calculateInventoryDemand();
  });

  // Watch products list to reset selected item if it's no longer available
  watch(products, (newProducts) => {
    if (
      !newProducts.find((p) => p.id === selectedInventoryItem.value) &&
      selectedInventoryItem.value !== 'all'
    ) {
      selectedInventoryItem.value = 'all';
    }
  });
</script>

<template>
  <div class="space-y-4">
    <!-- Inventory Forecasting Controls -->
    <div class="card bg-white shadow border border-black/10">
      <div class="card-body">
        <h3 class="text-sm font-medium text-gray-700 mb-4">
          Production Menu Inventory Forecasting Parameters
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label class="label">
              <span class="label-text text-xs">Branch</span>
            </label>
            <select
              class="select select-bordered select-sm w-full"
              v-model="selectedInventoryBranch"
              @change="calculateInventoryDemand"
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

          <div>
            <label class="label">
              <span class="label-text text-xs">Production Menu Item</span>
            </label>
            <select
              class="select select-bordered select-sm w-full"
              v-model="selectedInventoryItem"
              @change="calculateInventoryDemand"
            >
              <option v-for="item in products" :key="item.id" :value="item.id">
                {{ item.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="label">
              <span class="label-text text-xs">Forecast Days</span>
            </label>
            <input
              type="number"
              class="input input-bordered input-sm w-full"
              v-model="forecastDaysInventory"
              min="1"
              max="30"
              @change="calculateInventoryDemand"
            />
          </div>

          <div class="flex items-end">
            <button
              class="btn btn-sm btn-outline w-full"
              @click="calculateInventoryDemand"
              :disabled="inventoryLoading || branchInventoryLoading"
            >
              <font-awesome-icon
                icon="fa-solid fa-sync-alt"
                :class="{
                  'animate-spin': inventoryLoading || branchInventoryLoading,
                }"
                class="mr-2"
              />
              Update Forecast
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Inventory Forecast Results -->
    <div v-if="inventoryForecastData" class="space-y-4">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="stat bg-gray-50 rounded-lg p-4">
          <div class="stat-title text-xs">Total Items</div>
          <div class="stat-value text-lg text-primaryColor">
            {{ inventoryForecastData.summary.totalItems }}
          </div>
          <div class="stat-desc text-xs">Items analyzed</div>
        </div>

        <div class="stat bg-gray-50 rounded-lg p-4">
          <div class="stat-title text-xs">Critical Items</div>
          <div class="stat-value text-lg text-error">
            {{ inventoryForecastData.summary.criticalItems }}
          </div>
          <div class="stat-desc text-xs">Stockout in ≤2 days</div>
        </div>

        <div class="stat bg-gray-50 rounded-lg p-4">
          <div class="stat-title text-xs">High Priority</div>
          <div class="stat-value text-lg text-warning">
            {{ inventoryForecastData.summary.highPriorityItems }}
          </div>
          <div class="stat-desc text-xs">Stockout in ≤5 days</div>
        </div>

        <div class="stat bg-gray-50 rounded-lg p-4">
          <div class="stat-title text-xs">Need Reproduce</div>
          <div class="stat-value text-lg text-gray-600">
            {{ inventoryForecastData.summary.needsReorder }}
          </div>
          <div class="stat-desc text-xs">Items requiring reproduction</div>
        </div>
      </div>

      <!-- Inventory Forecast Table -->
      <div class="card bg-white shadow border border-black/10">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-gray-700">
              Production Menu Inventory Demand Forecast
            </h3>
            <div class="flex items-center gap-2 flex-wrap">
              <label class="text-xs text-gray-600">Items per page:</label>
              <select
                class="select select-bordered select-xs"
                :value="inventoryItemsPerPage"
                @change="
                  changeInventoryItemsPerPage(parseInt($event.target.value))
                "
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
          <div class="overflow-x-auto">
            <table class="table w-full">
              <thead>
                <tr>
                  <th class="text-xs">Branch</th>
                  <th class="text-xs">Menu Item</th>
                  <th class="text-xs">Current Stock</th>
                  <th class="text-xs">Daily Sales</th>
                  <th class="text-xs">Days Until Stockout</th>
                  <th class="text-xs">Stockout Date</th>
                  <th class="text-xs">Reproduce Qty</th>
                  <th class="text-xs">Priority</th>
                  <th class="text-xs">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in paginatedInventoryResults"
                  :key="`${item.branchId}-${item.itemId}`"
                >
                  <td class="text-xs">{{ item.branchName }}</td>
                  <td class="text-xs">
                    <div class="font-medium">{{ item.itemName }}</div>
                    <div class="text-gray-500 text-xs">{{ item.unit }}</div>
                  </td>
                  <td class="text-xs">
                    <div class="font-semibold">
                      {{ item.currentStock }} {{ item.unit }}
                    </div>
                    <div class="text-xs text-gray-500">
                      Min: {{ item.minStock }} {{ item.unit }}
                    </div>
                  </td>
                  <td class="text-xs">
                    {{ item.dailyConsumption }} {{ item.unit }}/day
                  </td>
                  <td class="text-xs">
                    <div
                      class="font-semibold"
                      :class="{
                        'text-error': item.daysUntilStockout <= 2,
                        'text-warning': item.daysUntilStockout <= 5,
                        'text-info': item.daysUntilStockout <= 10,
                        'text-success': item.daysUntilStockout > 10,
                      }"
                    >
                      {{
                        item.daysUntilStockout === 999
                          ? '∞'
                          : item.daysUntilStockout
                      }}
                      days
                    </div>
                  </td>
                  <td class="text-xs">{{ item.stockoutDate }}</td>
                  <td class="text-xs">
                    <div class="font-semibold text-primaryColor">
                      {{ item.reorderQuantity }} {{ item.unit }}
                    </div>
                  </td>
                  <td class="text-xs">
                    <div
                      class="badge badge-xs"
                      :class="{
                        'bg-error/10 text-error':
                          item.urgencyLevel === 'critical',
                        'bg-warning/10 text-warning':
                          item.urgencyLevel === 'high',
                        'bg-info/10 text-info': item.urgencyLevel === 'medium',
                        'bg-success/10 text-success':
                          item.urgencyLevel === 'low',
                      }"
                    >
                      {{ item.urgencyLevel.toUpperCase() }}
                    </div>
                  </td>
                  <td class="text-xs">
                    <button
                      v-if="item.needsReorder"
                      class="btn btn-xs btn-outline text-primaryColor"
                      @click="
                        alert(
                          `Reproduce ${item.reorderQuantity} ${item.unit} of ${item.itemName} for ${item.branchName}`
                        )
                      "
                    >
                      Reproduce
                    </button>
                    <span v-else class="text-gray-400">No action needed</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Controls -->
          <div class="flex items-center justify-between mt-4">
            <div class="text-sm text-gray-600">
              Showing {{ inventoryStartItem }} to {{ inventoryEndItem }} of
              {{ inventoryForecastData.results.length }} items
            </div>
            <div class="flex items-center gap-2">
              <button
                class="btn btn-xs"
                :disabled="inventoryCurrentPage <= 1"
                @click="prevInventoryPage"
              >
                <font-awesome-icon
                  icon="fa-solid fa-chevron-left"
                  class="mr-1"
                />
                Previous
              </button>

              <div class="flex items-center gap-1">
                <button
                  v-for="page in Math.min(5, inventoryTotalPages)"
                  :key="page"
                  class="btn btn-xs"
                  :class="{
                    'bg-primaryColor text-white': inventoryCurrentPage === page,
                    'bg-gray-200 text-gray-500': inventoryCurrentPage !== page,
                  }"
                  @click="goToInventoryPage(page)"
                >
                  {{ page }}
                </button>
                <span
                  v-if="inventoryTotalPages > 5"
                  class="text-xs text-gray-500"
                  >...</span
                >
                <button
                  v-if="inventoryTotalPages > 5"
                  class="btn btn-xs"
                  @click="goToInventoryPage(inventoryTotalPages)"
                >
                  {{ inventoryTotalPages }}
                </button>
              </div>

              <button
                class="btn btn-xs"
                :disabled="inventoryCurrentPage >= inventoryTotalPages"
                @click="nextInventoryPage"
              >
                Next
                <font-awesome-icon
                  icon="fa-solid fa-chevron-right"
                  class="ml-1"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Stock Level Projections -->
      <div class="card bg-white shadow border border-black/10">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-medium text-gray-700">
              Production Menu Stock Level Projections
            </h3>
            <div class="flex items-center gap-2 flex-wrap">
              <label class="text-xs text-gray-600">Items per page:</label>
              <select
                class="select select-bordered select-xs"
                :value="projectionsItemsPerPage"
                @change="
                  changeProjectionsItemsPerPage(parseInt($event.target.value))
                "
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="item in paginatedProjections"
              :key="`projection-${item.branchId}-${item.itemId}`"
              class="bg-gray-50 rounded-lg p-4"
            >
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium">{{ item.itemName }}</h4>
                <div
                  class="badge badge-sm"
                  :class="{
                    'bg-error/10 text-error': item.urgencyLevel === 'critical',
                    'bg-warning/10 text-warning': item.urgencyLevel === 'high',
                    'bg-info/10 text-info': item.urgencyLevel === 'medium',
                    'bg-success/10 text-success': item.urgencyLevel === 'low',
                  }"
                >
                  {{ item.urgencyLevel }}
                </div>
              </div>
              <div class="text-xs text-gray-600 mb-2">
                {{ item.branchName }}
              </div>
              <div class="space-y-1">
                <div class="flex justify-between text-xs">
                  <span>Current:</span>
                  <span class="font-semibold"
                    >{{ item.currentStock }} {{ item.unit }}</span
                  >
                </div>
                <div class="flex justify-between text-xs">
                  <span>Daily Usage:</span>
                  <span>{{ item.dailyConsumption }} {{ item.unit }}</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span>Days Left:</span>
                  <span
                    class="font-semibold"
                    :class="{
                      'text-error': item.daysUntilStockout <= 2,
                      'text-warning': item.daysUntilStockout <= 5,
                    }"
                  >
                    {{
                      item.daysUntilStockout === 999
                        ? '∞'
                        : item.daysUntilStockout
                    }}
                  </span>
                </div>
                <div class="flex justify-between text-xs">
                  <span>Reproduce Qty:</span>
                  <span class="font-semibold text-primaryColor"
                    >{{ item.reorderQuantity }} {{ item.unit }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination Controls for Stock Projections -->
          <div class="flex items-center justify-between mt-4">
            <div class="text-sm text-gray-600">
              Showing {{ projectionsStartItem }} to {{ projectionsEndItem }} of
              {{
                inventoryForecastData.results.filter(
                  (r) =>
                    r.needsReorder ||
                    r.daysUntilStockout <= 60 ||
                    r.dailyConsumption >= 0.2
                ).length
              }}
              items needing reproduction
            </div>
            <div class="flex items-center gap-2">
              <button
                class="btn btn-xs"
                :disabled="projectionsCurrentPage <= 1"
                @click="prevProjectionsPage"
              >
                <font-awesome-icon
                  icon="fa-solid fa-chevron-left"
                  class="mr-1"
                />
                Previous
              </button>

              <div class="flex items-center gap-1">
                <button
                  v-for="page in Math.min(5, projectionsTotalPages)"
                  :key="page"
                  class="btn btn-xs"
                  :class="{
                    'bg-primaryColor text-white':
                      projectionsCurrentPage === page,
                    'bg-gray-200 text-gray-500':
                      projectionsCurrentPage !== page,
                  }"
                  @click="goToProjectionsPage(page)"
                >
                  {{ page }}
                </button>
                <span
                  v-if="projectionsTotalPages > 5"
                  class="text-xs text-gray-500"
                  >...</span
                >
                <button
                  v-if="projectionsTotalPages > 5"
                  class="btn btn-xs"
                  @click="goToProjectionsPage(projectionsTotalPages)"
                >
                  {{ projectionsTotalPages }}
                </button>
              </div>

              <button
                class="btn btn-xs"
                :disabled="projectionsCurrentPage >= projectionsTotalPages"
                @click="nextProjectionsPage"
              >
                Next
                <font-awesome-icon
                  icon="fa-solid fa-chevron-right"
                  class="ml-1"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-else-if="inventoryLoading || branchInventoryLoading"
      class="flex justify-center py-8"
    >
      <div class="loading loading-spinner loading-md text-primaryColor"></div>
    </div>

    <div v-else class="text-center py-8 text-gray-500">
      <div class="space-y-2">
        <div>No inventory forecast data available.</div>
        <div class="text-sm">
          Click "Update Forecast" to generate predictions.
        </div>
        <div
          v-if="Object.keys(branchInventoryData).length === 0"
          class="text-xs text-yellow-600 mt-2"
        >
          Note: No branch inventory data found. Make sure menu items are
          distributed to branches.
        </div>
        <div
          v-if="branchInventoryStore.error"
          class="text-xs text-red-600 mt-2"
        >
          Error loading branch inventory: {{ branchInventoryStore.error }}
        </div>
        <div
          v-if="inventoryForecastData?.warning"
          class="text-xs text-orange-600 mt-2"
        >
          {{ inventoryForecastData.warning }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
