<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import {
    Package,
    Plus,
    Minus,
    Search,
    RefreshCcw,
    Bell,
    AlertTriangle,
    XCircle,
    CheckCircle,
    EllipsisVertical,
    MessageSquare,
    PhilippinePeso,
    BarChart3,
    History,
    TrendingDown,
    ChevronDown,
    ChevronUp,
    X,
    Filter,
    Calendar,
    HelpCircle,
    Trash,
    ArrowRightLeft,
  } from 'lucide-vue-next';
  import { useInventoryStore } from '../../stores/inventoryStore.js';
  import InventoryConsumptionModal from '../../components/scm/InventoryConsumptionModal.vue';
  import InventoryAdjustmentModal from '../../components/scm/InventoryAdjustmentModal.vue';
  import TransactionModal from '../../components/scm/TransactionModal.vue';
  import InventoryDetailsModal from '../../components/scm/InventoryDetailsModal.vue';
  import { useRouter } from 'vue-router';

  const router = useRouter();

  // Store
  const inventoryStore = useInventoryStore();

  // Access store values as computed properties
  const categories = computed(() => inventoryStore.categories);
  const itemTypes = computed(() => inventoryStore.itemTypes);
  const currentInventory = computed(() => inventoryStore.currentInventory);
  const inventorySummary = computed(() => inventoryStore.inventorySummary);
  const stats = computed(() => inventoryStore.stats);
  const expiringItems = computed(() => inventoryStore.expiringItems);
  const lowStockItems = computed(() => inventoryStore.lowStockItems);
  const recentActivity = computed(() => inventoryStore.recentActivity);
  const loading = computed(() => inventoryStore.loading);
  const error = computed(() => inventoryStore.error);
  const alertsCount = computed(() => inventoryStore.alertsCount);

  // Local state
  const activeTab = ref('overview');
  const alertTab = ref('expiring');
  const currentPage = ref(1);
  const itemsPerPage = ref(12);
  const searchQuery = ref('');
  const categoryFilter = ref('');
  const expandedItems = ref(new Set());

  // Enhanced Reports state
  const reportPeriod = ref('current');
  const reportSearchQuery = ref('');
  const reportCategoryFilter = ref('');
  const reportConditionFilter = ref('');
  const expandedCategories = ref(new Set());
  const forecastPeriod = ref('30');
  const forecastMethod = ref('moving_average');
  // Advanced forecasting controls
  const leadTimeDays = ref(7); // default 7 days
  const serviceLevel = ref(0.95); // 95%
  const windowProfile = ref('auto'); // auto|fast|medium|slow|custom
  const customWindowDays = ref(30);

  // Disposed Items state
  const disposedItems = ref([]);
  const disposedFromDate = ref('');
  const disposedToDate = ref('');
  const disposedCategoryFilter = ref('');

  // Modal state
  const modal = ref({
    type: null,
    show: false,
    item: null,
  });

  // Transaction modal state
  const transactionModal = ref({
    show: false,
  });

  // Confirmation modal state
  const confirmModal = ref({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  // Form data
  const stockForm = ref({
    category_id: '',
    item_type_id: '',
    item_name: '',
    quantity: '',
    unit_cost: '',
    batch_number: '',
    expiry_date: '',
    notes: '',
    supplier_id: null,
    received_by: 'SCM User',
  });

  // Toast state
  const toast = ref({ show: false, type: '', message: '' });

  // Computed properties for grouped inventory
  const groupedInventory = computed(() => {
    const grouped = {};

    // Group inventory by item type
    currentInventory.value?.forEach((batch) => {
      const itemKey = batch.item_type_id;
      if (!grouped[itemKey]) {
        grouped[itemKey] = {
          id: batch.item_type_id,
          item_type_name: batch.item_type_name,
          category_name: batch.category_name,
          unit_of_measure: batch.unit_of_measure,
          total_quantity: 0,
          batches: [],
          expanded: expandedItems.value.has(batch.item_type_id),
          expiring_soon_count: 0,
          expiring_count: 0,
          receipts_count: 0, // Initialize receipts_count
          first_received_at: null, // Initialize first_received_at
          status: 'active', // Default to active
        };
      }

      grouped[itemKey].batches.push(batch);
      grouped[itemKey].total_quantity += parseFloat(batch.quantity || 0);

      // Count expiring soon items
      if (batch.expiry_date) {
        const daysUntilExpiry = getDaysUntilExpiry(batch.expiry_date);
        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          grouped[itemKey].expiring_soon_count++;
        }
        if (daysUntilExpiry <= 0) {
          grouped[itemKey].expiring_count++;
        }
      }
      if (batch.status === 'expired') {
        grouped[itemKey].expired_count++;
      }

      // Update receipts_count and first_received_at
      const itemType = itemTypes.value.find(
        (type) => type.id === batch.item_type_id
      );
      if (itemType) {
        grouped[itemKey].receipts_count = parseInt(
          itemType.receipts_count || 0,
          10
        );
        grouped[itemKey].first_received_at = itemType.first_received_at;
        grouped[itemKey].status = itemType.status;
      }
    });

    // Sort batches by expiry date (FEFO - First Expired, First Out)
    Object.values(grouped).forEach((item) => {
      item.batches.sort((a, b) => {
        if (!a.expiry_date && !b.expiry_date) return 0;
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date) - new Date(b.expiry_date);
      });
    });

    // Filter based on search and category
    let filtered = Object.values(grouped);

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.item_type_name?.toLowerCase().includes(query) ||
          item.category_name?.toLowerCase().includes(query) ||
          item.batches.some(
            (batch) =>
              batch.batch_number?.toLowerCase().includes(query) ||
              batch.supplier_name?.toLowerCase().includes(query)
          )
      );
    }

    if (categoryFilter.value) {
      filtered = filtered.filter(
        (item) =>
          item.category_name ===
          categories.value?.find((cat) => cat.id == categoryFilter.value)?.name
      );
    }

    return filtered;
  });

  const paginatedInventory = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return groupedInventory.value.slice(start, start + itemsPerPage.value);
  });

  const totalPages = computed(() => {
    return Math.ceil(groupedInventory.value.length / itemsPerPage.value);
  });

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return Infinity;
    const today = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'badge-sm border-none font-medium bg-success/20 text-success',
      reserved: 'badge-sm border-none font-medium bg-warning/20 text-warning',
      expired: 'badge-sm border-none font-medium bg-error/20 text-error',
      damaged: 'badge-sm border-none font-medium bg-error/20 text-error',
      consumed: 'badge-sm border-none font-medium bg-neutral/20 text-neutral',
      draft: 'badge-sm border-none font-medium bg-info/20 text-info',
    };
    return (
      colors[status] ||
      'badge-sm border-none font-medium bg-neutral/20 text-neutral'
    );
  };

  const getExpiryColor = (expiryDate) => {
    if (!expiryDate) return 'text-gray-500';

    const daysUntilExpiry = getDaysUntilExpiry(expiryDate);

    if (daysUntilExpiry < 0) return 'text-error font-bold';
    if (daysUntilExpiry <= 3) return 'text-error';
    if (daysUntilExpiry <= 7) return 'text-warning';
    return 'text-success';
  };

  // Low-stock helpers
  const getLowStockSeverity = (item) => {
    const current = parseFloat(item.current_stock || 0);
    const minLevel = parseFloat(item.min_stock_level || 0);
    if (isNaN(current) || isNaN(minLevel) || minLevel <= 0) return 'info';
    if (current <= minLevel) return 'critical';
    if (current <= minLevel * 1.2) return 'warning';
    return 'ok';
  };

  // Estimate days of cover using recent consumption over the last 7 days
  const estimateDaysOfCover = (item) => {
    try {
      const now = new Date();
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const activity = recentActivity.value || [];
      const key = item.item_type_name?.toLowerCase();
      const lastWeekConsumption = activity
        .filter(
          (a) =>
            a.transaction_type === 'consumption' &&
            new Date(a.transaction_date) >= cutoff &&
            (a.item_type_name?.toLowerCase() === key ||
              a.item_name?.toLowerCase() === key)
        )
        .reduce((sum, a) => sum + parseFloat(a.quantity || 0), 0);

      const avgDaily = lastWeekConsumption / 7;
      if (!avgDaily || avgDaily <= 0) return 'N/A';
      const current = parseFloat(item.current_stock || 0);
      const days = current / avgDaily;
      return Math.max(0, Math.round(days));
    } catch (e) {
      return 'N/A';
    }
  };

  const acknowledgedLowStock = ref(new Set());
  const acknowledgeLowStock = (item) => {
    acknowledgedLowStock.value.add(item.item_type_id);
  };

  // Expiring alerts helpers (match low-stock UX)
  const getExpirySeverityLevel = (item) => {
    const days = getDaysUntilExpiry(item.expiry_date);
    if (days <= 0) return 'critical';
    if (days <= 3) return 'warning';
    if (days <= 7) return 'info';
    return 'ok';
  };

  const acknowledgedExpiring = ref(new Set());
  const acknowledgeExpiring = (item) => {
    acknowledgedExpiring.value.add(
      item.id || `${item.item_type_id}-${item.expiry_date}`
    );
  };

  // Enhanced Reports computed properties
  const filteredInventorySummary = computed(() => {
    if (!inventorySummary.value) return [];
    let filtered = [...inventorySummary.value];

    if (reportCategoryFilter.value) {
      filtered = filtered.filter(
        (item) => item.category_id == reportCategoryFilter.value
      );
    }

    return filtered;
  });

  const recentStockMovements = computed(() => {
    if (!recentActivity.value) return [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    return recentActivity.value
      .filter((activity) => new Date(activity.transaction_date) >= cutoff)
      .slice(0, 10)
      .sort(
        (a, b) => new Date(b.transaction_date) - new Date(a.transaction_date)
      );
  });

  const detailedCategoryReport = computed(() => {
    if (!categories.value || !currentInventory.value) return [];

    return categories.value
      .map((category) => {
        const categoryItems = currentInventory.value.filter((item) => {
          const matchesCategory = item.category_name === category.name;
          const matchesSearch =
            !reportSearchQuery.value ||
            item.item_type_name
              .toLowerCase()
              .includes(reportSearchQuery.value.toLowerCase()) ||
            item.item_name
              ?.toLowerCase()
              .includes(reportSearchQuery.value.toLowerCase());
          const matchesCondition =
            !reportConditionFilter.value ||
            item.status === reportConditionFilter.value;

          return matchesCategory && matchesSearch && matchesCondition;
        });

        if (categoryItems.length === 0) return null;

        const totalValue = categoryItems.reduce(
          (sum, item) => sum + parseFloat(item.total_value || 0),
          0
        );
        const totalItems = categoryItems.length;
        const availableItems = categoryItems.filter(
          (item) => item.status === 'available'
        ).length;
        const expiredItems = categoryItems.filter(
          (item) => item.status === 'expired'
        ).length;
        const expiringItems = categoryItems.filter((item) => {
          if (!item.expiry_date) return false;
          const days = getDaysUntilExpiry(item.expiry_date);
          return days <= 7 && days > 0;
        }).length;

        return {
          category_id: category.id,
          category_name: category.name,
          total_value: totalValue,
          total_items: totalItems,
          available_items: availableItems,
          expired_items: expiredItems,
          expiring_items: expiringItems,
          items: categoryItems,
        };
      })
      .filter(Boolean);
  });

  const lowStockAlertItems = computed(() => {
    return lowStockItems.value.filter((item) => {
      const matchesSearch =
        !reportSearchQuery.value ||
        item.item_type_name
          .toLowerCase()
          .includes(reportSearchQuery.value.toLowerCase());
      const matchesCategory =
        !reportCategoryFilter.value ||
        item.category_name ===
          categories.value?.find((c) => c.id == reportCategoryFilter.value)
            ?.name;

      return matchesSearch && matchesCategory;
    });
  });

  const inventoryForecasts = computed(() => {
    if (!currentInventory.value || !recentActivity.value) return [];

    const itemTypeMap = new Map();

    // Group current inventory by item type
    currentInventory.value.forEach((item) => {
      const key = item.item_type_id;
      if (!itemTypeMap.has(key)) {
        itemTypeMap.set(key, {
          item_type_id: key,
          item_type_name: item.item_type_name,
          current_stock: 0,
          total_value: 0,
          transactions: [],
        });
      }

      const existing = itemTypeMap.get(key);
      existing.current_stock += parseFloat(item.quantity || 0);
      existing.total_value += parseFloat(item.total_value || 0);
    });

    // Build per-item daily usage series for a chosen window
    const autoWindowForVelocity = (avgDaily) => {
      if (windowProfile.value === 'fast') return 14;
      if (windowProfile.value === 'medium') return 30;
      if (windowProfile.value === 'slow') return 60;
      if (windowProfile.value === 'custom')
        return Math.max(7, parseInt(customWindowDays.value || 30));
      // auto based on velocity
      if (avgDaily >= 5) return 14; // fast movers
      if (avgDaily >= 1) return 30; // medium
      return 60; // slow movers
    };

    // Helper: generate an array of dates for the last N days (oldest -> newest)
    const lastNDates = (n) => {
      const arr = [];
      const end = new Date();
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(end);
        d.setDate(end.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        arr.push(key);
      }
      return arr; // array of yyyy-mm-dd
    };

    const cutoffDays = parseInt(forecastPeriod.value);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - cutoffDays);

    // Build name->id fallback map for activities missing item_type_id
    const nameToId = new Map();
    Array.from(itemTypeMap.values()).forEach((it) => {
      if (it.item_type_name)
        nameToId.set(it.item_type_name.toLowerCase(), it.item_type_id);
    });

    recentActivity.value
      .filter(
        (activity) =>
          activity.transaction_type === 'consumption' &&
          new Date(activity.transaction_date) >= cutoff
      )
      .forEach((activity) => {
        let key = activity.item_type_id;
        if (!key) {
          const nm = (
            activity.item_type_name ||
            activity.item_name ||
            ''
          ).toLowerCase();
          if (nameToId.has(nm)) key = nameToId.get(nm);
        }
        if (key && itemTypeMap.has(key)) {
          itemTypeMap.get(key).transactions.push({
            date: activity.transaction_date,
            quantity: parseFloat(activity.quantity || 0),
          });
        }
      });

    return Array.from(itemTypeMap.values())
      .map((item) => {
        // Determine window days for this item (velocity-based if auto)
        const last30Total = item.transactions
          .filter(
            (t) => new Date(t.date) >= new Date(Date.now() - 30 * 86400000)
          )
          .reduce((s, t) => s + t.quantity, 0);
        const velocityAvgDaily = last30Total / 30;
        const windowDays = autoWindowForVelocity(velocityAvgDaily);

        // Build daily usage series for the window
        const dateKeys = lastNDates(windowDays);
        const usageByDate = new Map(dateKeys.map((k) => [k, 0]));
        item.transactions.forEach((t) => {
          const k = new Date(t.date).toISOString().slice(0, 10);
          if (usageByDate.has(k)) {
            usageByDate.set(k, usageByDate.get(k) + t.quantity);
          }
        });
        const dailySeries = dateKeys.map((k) => usageByDate.get(k)); // array length windowDays

        // Moving average (baseline)
        const totalUsageWindow = dailySeries.reduce((s, v) => s + v, 0);
        const maAvgDaily = totalUsageWindow / windowDays || 0;

        // Linear trend via least squares: y = a + b*x, x = 1..n (oldest->newest)
        const n = dailySeries.length;
        let sumX = 0,
          sumY = 0,
          sumXY = 0,
          sumX2 = 0;
        for (let i = 0; i < n; i++) {
          const x = i + 1;
          const y = dailySeries[i];
          sumX += x;
          sumY += y;
          sumXY += x * y;
          sumX2 += x * x;
        }
        const denom = n * sumX2 - sumX * sumX;
        const b = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
        const a = (sumY - b * sumX) / n;
        const todayIndex = n; // next day after series
        const trendDailyToday = Math.max(0, a + b * todayIndex);

        // Choose method
        const method = forecastMethod.value;
        const meanDaily =
          method === 'linear_trend' ? trendDailyToday : maAvgDaily;

        // Safety stock using normal approx
        const mean = maAvgDaily;
        const stddev = (() => {
          if (n <= 1) return 0;
          const variance =
            dailySeries.reduce((s, v) => s + Math.pow(v - mean, 2), 0) /
            (n - 1);
          return Math.sqrt(variance);
        })();
        const Z = (() => {
          const sl = parseFloat(serviceLevel.value);
          if (sl >= 0.999) return 3.09;
          if (sl >= 0.995) return 2.58;
          if (sl >= 0.99) return 2.33;
          if (sl >= 0.975) return 1.96;
          if (sl >= 0.95) return 1.65;
          if (sl >= 0.9) return 1.28;
          return 1.0;
        })();
        const lt = Math.max(0, parseInt(leadTimeDays.value || 0));
        const safetyStock = Z * stddev * Math.sqrt(lt);

        // ROP and projections
        const demandDuringLT = meanDaily * lt;
        const reorderPoint = demandDuringLT + safetyStock;
        const projectedDemand = meanDaily * parseInt(forecastPeriod.value);
        const daysUntilDepletion =
          meanDaily > 0 ? Math.floor(item.current_stock / meanDaily) : Infinity;

        // Reorder date recommendation
        let reorderDate = '-';
        if (meanDaily > 0) {
          const daysUntilROP = (item.current_stock - reorderPoint) / meanDaily;
          const d = new Date();
          if (daysUntilROP <= 0) {
            reorderDate = 'Today';
          } else {
            d.setDate(d.getDate() + Math.ceil(daysUntilROP));
            reorderDate = d.toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
          }
        }

        let recommendedAction = 'Monitor';
        const needsReorder = item.current_stock <= reorderPoint;
        if (needsReorder) recommendedAction = 'Urgent Reorder';
        else if (daysUntilDepletion <= 14) recommendedAction = 'Plan Reorder';
        else if (daysUntilDepletion <= 30)
          recommendedAction = 'Schedule Review';

        return {
          ...item,
          avg_daily_usage: meanDaily,
          projected_demand: projectedDemand,
          days_until_depletion: daysUntilDepletion,
          recommended_action: recommendedAction,
          safety_stock: safetyStock,
          reorder_point: reorderPoint,
          lead_time_days: lt,
          reorder_date: reorderDate,
          window_days: windowDays,
          trend_slope: b,
        };
      })
      .filter((item) => {
        const matchesSearch =
          !reportSearchQuery.value ||
          item.item_type_name
            .toLowerCase()
            .includes(reportSearchQuery.value.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => a.days_until_depletion - b.days_until_depletion);
  });

  const getBatchRowClass = (batch) => {
    if (!batch.expiry_date) return '';

    const daysUntilExpiry = getDaysUntilExpiry(batch.expiry_date);
    if (daysUntilExpiry < 0) return 'bg-error/10';
    if (daysUntilExpiry <= 3) return 'bg-error/5';
    if (daysUntilExpiry <= 7) return 'bg-warning/5';
    return '';
  };

  // Helper function to get transaction type icon and color
  const getTransactionTypeInfo = (type, adjustmentType = null) => {
    // For disposal adjustments, show as disposal instead of adjustment
    if (type === 'adjustment' && adjustmentType === 'disposal') {
      return { icon: Trash, color: 'text-error', label: 'Disposed' };
    }

    const typeInfo = {
      receipt: { icon: Package, color: 'text-success', label: 'Received' },
      consumption: { icon: Minus, color: 'text-warning', label: 'Consumed' },
      adjustment: { icon: RefreshCcw, color: 'text-info', label: 'Adjusted' },
      return: { icon: ArrowRightLeft, color: 'text-error', label: 'Returned' },
      transfer: {
        icon: ArrowRightLeft,
        color: 'text-primary',
        label: 'Transferred',
      },
      expiry: { icon: Calendar, color: 'text-error', label: 'Expired' },
      damage: { icon: Minus, color: 'text-error', label: 'Damaged' },
      disposal: { icon: Trash, color: 'text-error', label: 'Disposed' },
    };
    return (
      typeInfo[type] || { icon: HelpCircle, color: 'text-neutral', label: type }
    );
  };

  // Helper function to format transaction date
  const formatTransactionDate = (dateString) => {
    if (!dateString) return 'N/A';

    // Create dates in Philippine Time
    const date = new Date(dateString);
    const now = new Date();

    // Get Philippine timezone offset (UTC+8)
    const phOffset = 8 * 60; // 8 hours in minutes

    // Convert to Philippine time
    const datePh = new Date(date.getTime() + phOffset * 60 * 1000);
    const nowPh = new Date(now.getTime() + phOffset * 60 * 1000);

    // Compare dates (ignoring time)
    const datePhDate = new Date(
      datePh.getFullYear(),
      datePh.getMonth(),
      datePh.getDate()
    );
    const nowPhDate = new Date(
      nowPh.getFullYear(),
      nowPh.getMonth(),
      nowPh.getDate()
    );

    const diffTime = nowPhDate.getTime() - datePhDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return datePh.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Toggle item expansion
  const toggleItem = (itemId) => {
    if (expandedItems.value.has(itemId)) {
      expandedItems.value.delete(itemId);
    } else {
      expandedItems.value.add(itemId);
    }
  };

  // Show toast helper
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };

  // Modal functions
  const openConsumptionModal = () => {
    modal.value = { type: 'consumption', show: true, item: null };
  };

  const openAdjustmentModal = () => {
    modal.value = { type: 'adjustment', show: true, item: null };
  };

  const openTransactionModal = () => {
    transactionModal.value = { show: true };
  };

  // Dev: Seed usage pattern for forecasting demo
  const seedForecastTest = async () => {
    try {
      // Pick the first non-expired, positive-qty batch in current inventory as target
      const target = (currentInventory.value || []).find(
        (b) => parseFloat(b.quantity) > 0 && b.status !== 'expired'
      );
      if (!target) {
        showToast(
          'error',
          'No eligible inventory to seed (need non-expired with stock)'
        );
        return;
      }
      // Build a simple increasing usage pattern within the last 30 days
      const today = new Date();
      const daysOffsets = [28, 21, 14, 7, 3, 1];
      const quantities = [1, 2, 3, 4, 6, 8];
      const entries = daysOffsets.map((d, i) => {
        const dt = new Date(today);
        dt.setDate(today.getDate() - d);
        return { date: dt, quantity: quantities[i] };
      });
      await inventoryStore.seedTestConsumption(target.id, entries);
      showToast('success', 'Seeded test usage successfully');
    } catch (err) {
      console.error('Seed usage failed:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to seed test usage';
      showToast('error', msg);
    }
  };

  const closeModal = () => {
    modal.value = { type: null, show: false, item: null };
  };

  const closeTransactionModal = () => {
    transactionModal.value = { show: false };
  };

  // Batch-specific actions
  const consumeBatch = (batch) => {
    modal.value = { type: 'consumption', show: true, item: batch };
  };

  const adjustBatch = (batch) => {
    modal.value = { type: 'adjustment', show: true, item: batch };
  };

  // Details modal
  const detailsModal = ref({ show: false, inventoryItemId: null });
  const closeDetailsModal = () => {
    detailsModal.value = { show: false, inventoryItemId: null };
  };

  const viewBatchDetails = (batch) => {
    detailsModal.value = { show: true, inventoryItemId: batch.id };
  };

  const viewItemDetails = (item) => {
    showToast('info', `Viewing details for ${item.item_type_name}`);
  };

  // Enhanced Reports helper functions
  const getValuePercentage = (value) => {
    const total = filteredInventorySummary.value.reduce(
      (sum, item) => sum + parseFloat(item.total_value || 0),
      0
    );
    return total > 0 ? (parseFloat(value || 0) / total) * 100 : 0;
  };

  const toggleCategoryDetails = (categoryId) => {
    if (expandedCategories.value.has(categoryId)) {
      expandedCategories.value.delete(categoryId);
    } else {
      expandedCategories.value.add(categoryId);
    }
  };

  const getConditionBadgeClass = (status) => {
    const classes = {
      available: 'badge-success',
      reserved: 'badge-warning',
      expired: 'badge-error',
      damaged: 'badge-error',
    };
    return classes[status] || 'badge-neutral';
  };

  const getExpiryStatusBadgeClass = (expiryDate) => {
    const days = getDaysUntilExpiry(expiryDate);
    if (days <= 0) return 'badge-error';
    if (days <= 3) return 'badge-warning';
    if (days <= 7) return 'badge-info';
    return 'badge-success';
  };

  const getExpiryStatusText = (expiryDate) => {
    const days = getDaysUntilExpiry(expiryDate);
    if (days <= 0) return 'Expired';
    if (days <= 3) return `${days}d left`;
    if (days <= 7) return `${days}d left`;
    return 'Good';
  };

  const getStockLevelBadgeClass = (item) => {
    // Find if this item has low stock alert
    const lowStockItem = lowStockItems.value.find(
      (ls) => ls.item_type_id === item.item_type_id
    );
    if (lowStockItem) {
      const severity = getLowStockSeverity(lowStockItem);
      if (severity === 'critical') return 'badge-error';
      if (severity === 'warning') return 'badge-warning';
    }
    return 'badge-success';
  };

  const getStockLevelText = (item) => {
    const lowStockItem = lowStockItems.value.find(
      (ls) => ls.item_type_id === item.item_type_id
    );
    if (lowStockItem) {
      const severity = getLowStockSeverity(lowStockItem);
      if (severity === 'critical') return 'Critical';
      if (severity === 'warning') return 'Low';
    }
    return 'Normal';
  };

  const getForecastText = (item) => {
    const forecast = inventoryForecasts.value.find(
      (f) => f.item_type_id === item.item_type_id
    );
    if (!forecast) return 'N/A';

    if (forecast.avg_daily_usage <= 0) return 'No usage';
    return `${forecast.projected_demand.toFixed(0)} units`;
  };

  const getDepletionWarningClass = (days) => {
    if (days <= 7) return 'text-error font-bold';
    if (days <= 14) return 'text-warning font-medium';
    if (days <= 30) return 'text-info';
    return 'text-success';
  };

  const getActionBadgeClass = (action) => {
    const classes = {
      'Urgent Reorder': 'badge-error',
      'Plan Reorder': 'badge-warning',
      'Schedule Review': 'badge-info',
      Monitor: 'badge-success',
    };
    return classes[action] || 'badge-neutral';
  };

  const refreshReportData = async () => {
    try {
      await Promise.all([
        inventoryStore.fetchCurrentInventory(),
        inventoryStore.fetchInventorySummary(),
        inventoryStore.fetchLowStockItems(),
        inventoryStore.fetchRecentActivity(),
      ]);
      showToast('success', 'Report data refreshed successfully');
    } catch (error) {
      showToast('error', 'Failed to refresh report data');
    }
  };

  // Export functions
  const exportDetailedInventory = () => {
    const data = detailedCategoryReport.value.flatMap((category) =>
      category.items.map((item) => ({
        Category: category.category_name,
        'Item Name': item.item_type_name,
        Batch: item.batch_number || 'N/A',
        Quantity: item.quantity,
        Unit: item.unit_of_measure,
        'Unit Cost': item.unit_cost,
        'Total Value': item.total_value,
        Status: item.status,
        'Expiry Date': item.expiry_date ? formatDate(item.expiry_date) : 'N/A',
        Supplier: item.supplier_name || 'N/A',
      }))
    );
    downloadCSV(data, 'detailed_inventory_report.csv');
  };

  const exportValueAnalysis = () => {
    const data = filteredInventorySummary.value.map((summary) => ({
      Category: summary.category_name,
      'Total Items': summary.unique_items,
      'Total Quantity': summary.total_quantity,
      'Total Value': summary.total_value,
      Percentage: getValuePercentage(summary.total_value).toFixed(2) + '%',
    }));
    downloadCSV(data, 'value_analysis_report.csv');
  };

  const exportForecastReport = () => {
    const data = inventoryForecasts.value.map((forecast) => ({
      Item: forecast.item_type_name,
      'Current Stock': forecast.current_stock,
      'Avg Daily Usage': forecast.avg_daily_usage.toFixed(2),
      'Projected Demand': forecast.projected_demand.toFixed(0),
      'Days Until Depletion': forecast.days_until_depletion,
      'Recommended Action': forecast.recommended_action,
    }));
    downloadCSV(data, 'forecast_report.csv');
  };

  const exportLowStockAlert = () => {
    const data = lowStockAlertItems.value.map((item) => ({
      Item: item.item_type_name,
      Category: item.category_name,
      'Current Stock': item.current_stock,
      'Min Level': item.min_stock_level,
      Variance:
        parseFloat(item.current_stock) - parseFloat(item.min_stock_level),
      'Days of Cover': estimateDaysOfCover(item),
    }));
    downloadCSV(data, 'low_stock_alert.csv');
  };

  const downloadCSV = (data, filename) => {
    if (data.length === 0) {
      showToast('error', 'No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((header) => `"${row[header] || ''}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', `${filename} exported successfully`);
  };

  // Disposed Items functions
  const loadDisposedItems = async () => {
    try {
      const filters = {
        category_id: disposedCategoryFilter.value,
        disposed_from: disposedFromDate.value,
        disposed_to: disposedToDate.value,
      };

      const items = await inventoryStore.fetchDisposedItems(filters);

      // Normalize fields coming from the backend join
      disposedItems.value = items.map((item) => {
        const originalQty = parseFloat(item.original_quantity || 0); // from tr.quantity alias
        const unitCost = parseFloat(item.unit_cost || 0);
        return {
          ...item,
          original_quantity: originalQty,
          original_value: originalQty * unitCost,
        };
      });

      showToast('success', `Loaded ${items.length} disposed items`);
    } catch (error) {
      showToast('error', 'Failed to load disposed items');
    }
  };

  const refreshDisposedItems = async () => {
    await loadDisposedItems();
  };

  const getTotalDisposalCost = () => {
    return disposedItems.value.reduce(
      (sum, item) => sum + parseFloat(item.disposal_cost || 0),
      0
    );
  };

  const getTotalOriginalValue = () => {
    return disposedItems.value.reduce((sum, item) => {
      const qty = parseFloat(item.original_quantity || 0);
      const cost = parseFloat(item.unit_cost || 0);
      return sum + qty * cost;
    }, 0);
  };

  const exportDisposedItems = () => {
    const data = disposedItems.value.map((item) => ({
      'Item Name': item.item_type_name,
      Category: item.category_name,
      'Batch Number': item.batch_number || 'N/A',
      'Original Quantity': item.original_quantity,
      'Unit of Measure': item.unit_of_measure,
      'Unit Cost': item.unit_cost,
      'Original Value': item.total_value,
      'Disposal Cost': item.disposal_cost,
      'Disposed Date': formatDate(item.disposed_date),
      'Disposed By': item.disposed_by,
      'Disposal Reason': item.disposal_reason || '',
      'Disposal Notes': item.disposal_notes || '',
      Supplier: item.supplier_name || 'N/A',
    }));
    downloadCSV(data, 'disposed_items_report.csv');
  };

  const adjustItem = (item) => {
    modal.value = { type: 'adjustment', show: true, item };
  };

  const consumeItem = (item) => {
    modal.value = { type: 'consumption', show: true, item };
  };

  // Handle modal submissions
  const handleConsumption = async (consumptionData) => {
    try {
      // Build confirmation details
      const isSingle = consumptionData.items.length === 1;
      const firstItem = isSingle ? consumptionData.items[0] : null;
      const selected = isSingle
        ? currentInventory.value.find(
            (i) => i.id === firstItem.inventory_item_id
          )
        : null;
      const itemLabel = isSingle
        ? selected?.item_name || selected?.item_type_name || 'Selected Item'
        : `${consumptionData.items.length} items`;
      const qtyLabel = isSingle
        ? `${parseFloat(firstItem.quantity).toLocaleString()} ${selected?.unit_of_measure || ''}`
        : `${consumptionData.items.reduce((a, b) => a + parseFloat(b.quantity || 0), 0).toLocaleString()} units`;

      confirmModal.value = {
        show: true,
        title: 'Confirm Action',
        message: `Consume ${qtyLabel} from ${itemLabel}?`,
        onConfirm: async () => {
          try {
            if (isSingle) {
              await inventoryStore.singleConsumption({
                inventory_item_id: firstItem.inventory_item_id,
                quantity: firstItem.quantity,
                reason: firstItem.reason,
                reference_number: consumptionData.reference_number,
                notes: consumptionData.notes,
                performed_by: 'SCM User',
              });
            } else {
              await inventoryStore.bulkConsumption(consumptionData);
            }
            showToast('success', `${itemLabel} consumed successfully.`);
            closeModal();
          } catch (err) {
            showToast(
              'error',
              `Failed to update ${itemLabel}. Please try again.`
            );
          }
        },
      };
      document.getElementById('inventory_confirm_modal')?.showModal();
    } catch (error) {
      showToast('error', 'Failed to prepare confirmation');
    }
  };

  const handleAdjustment = async (adjustmentData) => {
    try {
      const selected = currentInventory.value.find(
        (i) => i.id == adjustmentData.inventory_item_id
      );
      const itemLabel =
        selected?.item_name || selected?.item_type_name || 'Selected Item';
      const qtyLabel =
        typeof adjustmentData.new_quantity === 'number'
          ? `${parseFloat(adjustmentData.new_quantity).toLocaleString()} ${selected?.unit_of_measure || ''}`
          : '';
      const actionLabel =
        adjustmentData.adjustment_type === 'mark_expired'
          ? 'Mark as expired'
          : adjustmentData.adjustment_type === 'mark_damaged'
            ? 'Mark as damaged'
            : 'Adjust quantity';

      confirmModal.value = {
        show: true,
        title: 'Confirm Action',
        message: `${actionLabel} for ${itemLabel}${qtyLabel ? ` to ${qtyLabel}` : ''}?`,
        onConfirm: async () => {
          try {
            await inventoryStore.stockAdjustment({
              inventory_item_id: adjustmentData.inventory_item_id,
              adjustment_type: adjustmentData.adjustment_type,
              new_quantity: adjustmentData.new_quantity,
              reason: adjustmentData.reason,
              reference_number: adjustmentData.reference_number,
              notes: adjustmentData.notes,
              performed_by: 'SCM User',
              new_expiry_date: adjustmentData.new_expiry_date, // pass through
              disposal_cost: adjustmentData.disposal_cost ?? null,
            });
            showToast('success', `${itemLabel} adjusted successfully.`);
            closeModal();
          } catch (err) {
            showToast(
              'error',
              `Failed to update ${itemLabel}. Please try again.`
            );
          }
        },
      };
      document.getElementById('inventory_confirm_modal')?.showModal();
    } catch (error) {
      showToast('error', 'Failed to prepare confirmation');
    }
  };
  // Confirmation modal controls
  const closeConfirmModal = () => {
    document.getElementById('inventory_confirm_modal')?.close();
    confirmModal.value = {
      show: false,
      title: '',
      message: '',
      onConfirm: null,
    };
  };

  const handleConfirmAction = async () => {
    if (confirmModal.value.onConfirm) {
      try {
        await confirmModal.value.onConfirm();
      } finally {
        closeConfirmModal();
      }
    }
  };

  // Refresh data
  const refreshData = async () => {
    try {
      await Promise.all([
        inventoryStore.fetchCategories(),
        inventoryStore.fetchItemTypes(),
        inventoryStore.fetchCurrentInventory(),
        inventoryStore.fetchInventorySummary(),
        inventoryStore.fetchStats(),
        inventoryStore.fetchExpiringItems(),
        inventoryStore.fetchLowStockItems(),
        inventoryStore.fetchRecentActivity(),
      ]);
      showToast('success', 'Data refreshed successfully');
    } catch (error) {
      showToast('error', 'Failed to refresh data');
    }
  };

  // Lifecycle
  onMounted(async () => {
    try {
      await Promise.all([
        inventoryStore.fetchCategories(),
        inventoryStore.fetchItemTypes(),
        inventoryStore.fetchCurrentInventory(),
        inventoryStore.fetchInventorySummary(),
        inventoryStore.fetchStats(),
        inventoryStore.fetchExpiringItems(),
        inventoryStore.fetchLowStockItems(),
        inventoryStore.fetchRecentActivity(),
      ]);

      // Load disposed items for reports
      await loadDisposedItems();

      // Add this debug logging
      console.log('Debug - Categories:', categories.value);
      console.log('Debug - Item Types:', itemTypes.value);
      console.log('Debug - Current Inventory:', currentInventory.value);
      console.log('Debug - Inventory Summary:', inventorySummary.value);
      console.log('Debug - Stats:', stats.value);

      // Add these additional debug logs
      console.log('Debug - Store object:', inventoryStore);
      console.log('Debug - Loading state:', loading.value);
      console.log('Debug - Error state:', error.value);

      // Test individual API calls
      try {
        console.log('Testing individual API calls...');
        const categoriesResponse = await inventoryStore.fetchCategories();
        console.log('Categories API response:', categoriesResponse);

        const inventoryResponse = await inventoryStore.fetchCurrentInventory();
        console.log('Inventory API response:', inventoryResponse);

        console.log('After individual calls - Categories:', categories.value);
        console.log(
          'After individual calls - Inventory:',
          currentInventory.value
        );
      } catch (err) {
        console.error('API call error:', err);
      }
    } catch (error) {
      showToast('error', 'Failed to load inventory data');
    }
  });

  // Watch for search/filter changes to reset pagination
  watch([searchQuery, categoryFilter], () => {
    currentPage.value = 1;
  });
</script>

<template>
  <div class="container mx-auto p-2 sm:p-4 lg:p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6 lg:mb-8">
      <h1
        class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primaryColor mb-2 text-shadow-xs"
      >
        Main Branch Inventory Management
      </h1>
      <p class="text-sm sm:text-base text-black/50 px-2">
        Track and manage inventory levels, consumption, and stock valuation for
        Countryside Steakhouse.
      </p>
    </div>

    <!-- Stats -->
    <div
      class="stats shadow w-full mb-4 sm:mb-6 bg-accentColor border border-black/10 stats-vertical lg:stats-horizontal xl:stats-horizontal rounded-lg"
    >
      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Package
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-primaryColor"
          />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Total Items
        </div>
        <div
          class="stat-value text-primaryColor text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ stats.total_item_types || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Unique item types
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <CheckCircle
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-success"
          />
        </div>
        <div class="stat-title text-black/50 text-xs sm:text-sm">Available</div>
        <div
          class="stat-value text-success text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ stats.total_inventory_entries || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Stock entries
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <AlertTriangle
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-warning"
          />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Expiring Soon
        </div>
        <div
          class="stat-value text-warning text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ stats.expiring_soon_count || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Within 7 days
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <XCircle class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-error" />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">Expired</div>
        <div
          class="stat-value text-error text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ stats.expired_count || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Items expired
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div
      class="flex flex-wrap gap-2 mb-4 sm:mb-6 justify-center sm:justify-start"
    >
      <button
        @click="openConsumptionModal"
        class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
        :disabled="loading"
      >
        <Minus class="w-4 h-4 mr-1" />
        Record Usage
      </button>
      <button
        @click="openAdjustmentModal"
        class="btn btn-outline btn-sm text-warning hover:bg-warning/10 font-thin hover:border-none hover:shadow-none"
        :disabled="loading"
      >
        <RefreshCcw class="w-4 h-4 mr-1" />
        Stock Adjustment
      </button>
      <button
        @click="refreshData"
        class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
        :disabled="loading"
      >
        <RefreshCcw class="w-4 h-4 mr-1" />
        Refresh
      </button>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed mb-4 sm:mb-6 justify-center sm:justify-start">
      <button
        @click="activeTab = 'overview'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'overview' }"
      >
        <BarChart3 class="w-4 h-4 mr-1" />
        Overview
      </button>
      <button
        @click="activeTab = 'inventory'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'inventory' }"
      >
        <Package class="w-4 h-4 mr-1" />
        Inventory List
      </button>
      <button
        @click="activeTab = 'alerts'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'alerts' }"
      >
        <Bell class="w-4 h-4 mr-1" />
        Alerts
        <span v-if="alertsCount > 0" class="badge badge-error badge-sm ml-1">
          {{ alertsCount }}
        </span>
      </button>
      <button
        @click="activeTab = 'reports'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'reports' }"
      >
        <TrendingDown class="w-4 h-4 mr-1" />
        Reports
      </button>
    </div>

    <!-- Tab Content -->
    <div
      class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10"
    >
      <div class="card-body p-3 sm:p-4 lg:p-6">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="space-y-6">
          <h2
            class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-4"
          >
            Inventory Overview
          </h2>

          <!-- Category Summary -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="summary in inventorySummary"
              :key="summary.category_id"
              class="card bg-base-100 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div class="card-body p-4">
                <h3 class="card-title text-sm font-semibold text-primaryColor">
                  {{ summary.category_name }}
                </h3>
                <div class="space-y-2 text-sm">
                  <p><strong>Items:</strong> {{ summary.unique_items }}</p>
                  <p>
                    <strong>Quantity:</strong>
                    {{
                      parseFloat(summary.total_quantity || 0).toLocaleString()
                    }}
                  </p>
                  <p>
                    <strong>Value:</strong> ₱{{
                      parseFloat(summary.total_value || 0).toLocaleString()
                    }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="card bg-base-100 border border-gray-200">
            <div class="card-body p-4">
              <div class="flex justify-between items-center mb-4">
                <h3 class="card-title text-sm font-semibold text-primaryColor">
                  Recent Activity
                </h3>
                <button
                  @click="refreshData"
                  class="btn btn-ghost btn-xs"
                  :disabled="loading"
                >
                  <RefreshCcw class="w-3 h-3" />
                </button>
              </div>

              <div v-if="loading" class="flex justify-center py-4">
                <span class="loading loading-spinner loading-sm"></span>
              </div>

              <div
                v-else-if="recentActivity.length === 0"
                class="text-center py-8"
              >
                <History class="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p class="text-gray-500">No recent activity</p>
              </div>

              <div v-else class="space-y-3 max-h-96 overflow-y-auto">
                <div
                  v-for="activity in recentActivity"
                  :key="activity.id"
                  class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div class="flex-shrink-0">
                    <component
                      :is="
                        getTransactionTypeInfo(
                          activity.transaction_type,
                          activity.adjustment_type
                        ).icon
                      "
                      class="w-4 h-4"
                    />
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start">
                      <div>
                        <h4 class="font-medium text-sm text-gray-900">
                          {{ activity.item_name || activity.item_type_name }}
                        </h4>
                        <p class="text-xs text-gray-600">
                          {{ activity.category_name }} •
                          {{ activity.unit_of_measure }}
                        </p>
                        <p
                          v-if="activity.batch_number"
                          class="text-xs text-gray-500"
                        >
                          Batch: {{ activity.batch_number }}
                        </p>
                      </div>

                      <div class="text-right">
                        <div
                          class="text-sm font-medium"
                          :class="
                            getTransactionTypeInfo(
                              activity.transaction_type,
                              activity.adjustment_type
                            ).color
                          "
                        >
                          {{
                            getTransactionTypeInfo(
                              activity.transaction_type,
                              activity.adjustment_type
                            ).label
                          }}
                        </div>
                        <div class="text-xs text-gray-600">
                          {{ formatTransactionDate(activity.transaction_date) }}
                        </div>
                      </div>
                    </div>

                    <div class="mt-2 flex justify-between items-center">
                      <div class="text-sm">
                        <span class="font-medium">
                          {{ parseFloat(activity.quantity).toLocaleString() }}
                        </span>
                        <span class="text-gray-600"> units</span>
                        <span class="text-gray-500"> • </span>
                        <span class="font-medium"
                          >₱{{
                            parseFloat(activity.total_value).toLocaleString()
                          }}</span
                        >
                        <div
                          v-if="activity.disposal_cost"
                          class="text-xs text-error mt-1"
                        >
                          Disposal Cost: ₱{{
                            parseFloat(activity.disposal_cost).toLocaleString()
                          }}
                        </div>
                      </div>

                      <div class="text-xs text-gray-500">
                        by {{ activity.performed_by }}
                      </div>
                    </div>

                    <div v-if="activity.reason || activity.notes" class="mt-1">
                      <p class="text-xs text-gray-600">
                        {{ activity.reason || activity.notes }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="recentActivity.length > 0" class="mt-4 text-center">
                <button
                  @click="openTransactionModal"
                  class="btn btn-outline btn-sm text-primaryColor font-thin hover:bg-primaryColor/10"
                >
                  View All Transactions
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Inventory List Tab -->
        <div v-if="activeTab === 'inventory'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4"
          >
            <h2
              class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl"
            >
              Current Inventory
            </h2>

            <!-- Search and Filters -->
            <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div class="join w-full">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search items..."
                  class="input input-bordered input-sm join-item"
                />
                <button class="btn btn-sm join-item">
                  <Search class="w-4 h-4" />
                </button>
              </div>

              <select
                v-model="categoryFilter"
                class="select select-bordered select-sm"
              >
                <option value="">All Categories</option>
                <option
                  v-for="category in categories"
                  :key="category.id"
                  :value="category.id"
                >
                  {{ category.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Grouped Inventory Display -->
          <div class="space-y-4">
            <div
              v-for="item in groupedInventory"
              :key="item.id"
              class="inventory-group border border-gray-200 rounded-lg overflow-hidden"
            >
              <!-- Item Header (Collapsible) -->
              <div
                class="item-header cursor-pointer hover:bg-base-200 transition-colors"
                @click="toggleItem(item.id)"
              >
                <div class="flex justify-between items-center p-4 bg-base-100">
                  <div class="flex-1">
                    <h3 class="font-semibold text-primaryColor text-lg">
                      {{ item.item_type_name }}
                    </h3>
                    <p class="text-sm text-gray-600">
                      {{ item.category_name }} • {{ item.unit_of_measure }}
                    </p>
                  </div>
                  <div class="text-right mr-4">
                    <div class="text-xl font-bold text-primaryColor">
                      {{ parseFloat(item.total_quantity).toLocaleString() }}
                    </div>
                    <div class="text-sm text-gray-600">Total Stock</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      v-if="item.expiring_soon_count > 0"
                      class="badge bg-warning/20 badge-sm border-none font-medium text-warning"
                    >
                      {{ item.expiring_soon_count }} expiring
                    </span>

                    <span
                      v-if="item.expired_count > 0"
                      class="badge bg-error/20 badge-sm border-none font-medium text-error"
                    >
                      {{ item.expired_count }} expired
                    </span>
                    <ChevronDown
                      v-if="!item.expanded"
                      class="w-5 h-5 text-gray-500"
                    />
                    <ChevronUp v-else class="w-5 h-5 text-gray-500" />
                  </div>
                </div>
              </div>

              <!-- Batch Details (Expandable) -->
              <div v-if="item.expanded" class="batch-details bg-base-50">
                <div class="overflow-x-auto">
                  <table class="table table-zebra w-full table-xs">
                    <thead>
                      <tr class="bg-base-200">
                        <th>Batch/Lot #</th>
                        <th>Item Name</th>
                        <th>Quantity</th>
                        <th>Expiry Date</th>
                        <th>Received Date</th>
                        <th>Supplier</th>
                        <th>Unit Cost</th>
                        <th>Total Value</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="batch in item.batches"
                        :key="batch.id"
                        :class="getBatchRowClass(batch)"
                        class="hover:bg-base-100"
                      >
                        <td>
                          <span class="font-mono text-sm">{{
                            batch.batch_number || 'N/A'
                          }}</span>
                        </td>
                        <td>
                          <span class="font-medium">
                            {{ batch.item_name || 'N/A' }}
                          </span>
                        </td>
                        <td>
                          <span class="font-medium">
                            {{ parseFloat(batch.quantity).toLocaleString() }}
                          </span>
                        </td>
                        <td>
                          <span
                            :class="getExpiryColor(batch.expiry_date)"
                            class="font-medium"
                          >
                            {{ formatDate(batch.expiry_date) }}
                          </span>
                        </td>
                        <td>
                          <span class="text-sm text-gray-600">
                            {{ formatDate(batch.received_date) }}
                          </span>
                        </td>
                        <td>
                          <span class="text-sm">{{
                            batch.supplier_name || 'N/A'
                          }}</span>
                        </td>
                        <td>
                          <span class="text-sm"
                            >₱{{
                              parseFloat(batch.unit_cost || 0).toLocaleString()
                            }}</span
                          >
                        </td>
                        <td>
                          <span class="font-medium"
                            >₱{{
                              parseFloat(
                                batch.total_value || 0
                              ).toLocaleString()
                            }}</span
                          >
                        </td>
                        <td>
                          <span
                            :class="getStatusColor(batch.status)"
                            class="badge badge-xs"
                          >
                            {{ batch.status }}
                          </span>
                        </td>
                        <td>
                          <div class="dropdown dropdown-end">
                            <button class="btn btn-ghost btn-xs">
                              <EllipsisVertical class="w-3 h-3" />
                            </button>
                            <ul
                              class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-40 z-50"
                            >
                              <li>
                                <button
                                  @click="consumeBatch(batch)"
                                  class="text-sm"
                                  :disabled="batch.status === 'expired'"
                                  :title="
                                    batch.status === 'expired'
                                      ? 'Cannot consume expired item'
                                      : ''
                                  "
                                >
                                  <Minus class="w-3 h-3 mr-1" />
                                  Consume
                                </button>
                              </li>
                              <li>
                                <button
                                  @click="adjustBatch(batch)"
                                  class="text-sm"
                                >
                                  <RefreshCcw class="w-3 h-3 mr-1" />
                                  Adjust
                                </button>
                              </li>
                              <li>
                                <button
                                  @click="viewBatchDetails(batch)"
                                  class="text-sm"
                                >
                                  <MessageSquare class="w-3 h-3 mr-1" />
                                  Details
                                </button>
                              </li>
                            </ul>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-if="groupedInventory.length === 0" class="text-center py-12">
              <Package class="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 class="text-lg font-medium text-gray-600 mb-2">
                No inventory found
              </h3>
              <p class="text-gray-500">Try adjusting your search or filters</p>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex justify-center">
            <div class="join">
              <button
                @click="currentPage = Math.max(1, currentPage - 1)"
                class="join-item btn btn-sm"
                :disabled="currentPage === 1"
              >
                «
              </button>
              <button
                v-for="page in totalPages"
                :key="page"
                @click="currentPage = page"
                class="join-item btn btn-sm"
                :class="{ 'btn-active': currentPage === page }"
              >
                {{ page }}
              </button>
              <button
                @click="currentPage = Math.min(totalPages, currentPage + 1)"
                class="join-item btn btn-sm"
                :disabled="currentPage === totalPages"
              >
                »
              </button>
            </div>
          </div>
        </div>

        <!-- Alerts Tab -->
        <div v-if="activeTab === 'alerts'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4"
          >
            <h2
              class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl"
            >
              Inventory Alerts
            </h2>

            <div class="tabs tabs-boxed">
              <button
                @click="alertTab = 'expiring'"
                class="tab tab-sm"
                :class="{ 'tab-active': alertTab === 'expiring' }"
              >
                Expiring Soon
              </button>
              <button
                @click="alertTab = 'lowstock'"
                class="tab tab-sm"
                :class="{ 'tab-active': alertTab === 'lowstock' }"
              >
                Low Stock
              </button>
            </div>
          </div>

          <!-- Expiring Items (enhanced UI) -->
          <div v-if="alertTab === 'expiring'" class="space-y-3">
            <div
              v-for="item in expiringItems"
              :key="item.id"
              class="border border-gray-200 rounded-lg bg-base-100 p-3 flex items-start gap-3"
            >
              <div>
                <XCircle
                  v-if="getExpirySeverityLevel(item) === 'critical'"
                  class="w-5 h-5 text-error"
                />
                <AlertTriangle
                  v-else-if="getExpirySeverityLevel(item) === 'warning'"
                  class="w-5 h-5 text-warning"
                />
                <Calendar v-else class="w-5 h-5 text-info" />
              </div>

              <div class="flex-1">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="font-semibold text-sm text-primaryColor">
                      {{ item.item_type_name }}
                    </h3>
                    <div class="text-xs text-gray-600">
                      {{ item.category_name }}
                    </div>
                  </div>
                  <div>
                    <span
                      v-if="getExpirySeverityLevel(item) === 'critical'"
                      class="badge bg-error/20 badge-sm text-error"
                      >Expired / Today</span
                    >
                    <span
                      v-else-if="getExpirySeverityLevel(item) === 'warning'"
                      class="badge bg-warning/20 badge-sm text-warning"
                      >Expiring ≤ 3d</span
                    >
                    <span v-else class="badge bg-info/20 badge-sm text-info"
                      >Expiring ≤ 7d</span
                    >
                  </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                  <div>
                    <div class="text-gray-500">Expiry Date</div>
                    <div class="font-medium">
                      {{ formatDate(item.expiry_date) }}
                    </div>
                  </div>
                  <div>
                    <div class="text-gray-500">Days Left</div>
                    <div class="font-medium">
                      {{ Math.max(0, getDaysUntilExpiry(item.expiry_date)) }}
                    </div>
                  </div>
                  <div>
                    <div class="text-gray-500">Quantity</div>
                    <div class="font-medium">
                      {{ parseFloat(item.quantity).toLocaleString() }}
                      {{ item.unit_of_measure }}
                    </div>
                  </div>
                  <div>
                    <div class="text-gray-500">Batch</div>
                    <div class="font-medium">
                      {{ item.batch_number || 'N/A' }}
                    </div>
                  </div>
                </div>

                <div class="mt-2 flex flex-wrap gap-2">
                  <button
                    class="btn btn-ghost btn-xs"
                    @click="viewBatchDetails(item)"
                  >
                    View Item
                  </button>
                  <button class="btn btn-ghost btn-xs" disabled>
                    Mark for Disposal
                  </button>
                  <button
                    class="btn btn-outline btn-xs"
                    :class="{
                      'btn-disabled': acknowledgedExpiring.has(
                        item.id || `${item.item_type_id}-${item.expiry_date}`
                      ),
                    }"
                    @click="acknowledgeExpiring(item)"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            </div>

            <div v-if="expiringItems.length === 0" class="text-center py-8">
              <CheckCircle class="w-12 h-12 mx-auto text-success mb-2" />
              <p class="text-gray-500">No items expiring soon!</p>
            </div>
          </div>

          <!-- Low Stock Items -->
          <div v-if="alertTab === 'lowstock'" class="space-y-3">
            <div
              v-for="item in lowStockItems"
              :key="item.item_type_id"
              class="border border-gray-200 rounded-lg bg-base-100 p-3 flex items-start gap-3"
            >
              <div>
                <XCircle
                  v-if="getLowStockSeverity(item) === 'critical'"
                  class="w-5 h-5 text-error"
                />
                <AlertTriangle
                  v-else-if="getLowStockSeverity(item) === 'warning'"
                  class="w-5 h-5 text-warning"
                />
                <Bell v-else class="w-5 h-5 text-info" />
              </div>

              <div class="flex-1">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="font-semibold text-sm text-primaryColor">
                      {{ item.item_type_name }}
                    </h3>
                    <div class="text-xs text-gray-600">
                      {{ item.category_name }}
                    </div>
                  </div>
                  <div>
                    <span
                      v-if="getLowStockSeverity(item) === 'critical'"
                      class="badge bg-error/20 badge-sm text-error"
                      >Critical</span
                    >
                    <span
                      v-else-if="getLowStockSeverity(item) === 'warning'"
                      class="badge bg-warning/20 badge-sm text-warning"
                      >Warning</span
                    >
                    <span v-else class="badge bg-info/20 badge-sm text-info"
                      >Info</span
                    >
                  </div>
                </div>

                <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs">
                  <div>
                    <div class="text-gray-500">Current Stock</div>
                    <div class="font-medium">
                      {{ parseFloat(item.current_stock).toLocaleString() }}
                    </div>
                  </div>
                  <div>
                    <div class="text-gray-500">Min Level</div>
                    <div class="font-medium">
                      {{ parseFloat(item.min_stock_level).toLocaleString() }}
                    </div>
                  </div>
                  <div>
                    <div class="text-gray-500">Variance</div>
                    <div class="font-medium">
                      {{
                        (
                          parseFloat(item.current_stock) -
                          parseFloat(item.min_stock_level)
                        ).toLocaleString()
                      }}
                    </div>
                  </div>
                  <div>
                    <div class="text-gray-500">Days of Cover</div>
                    <div class="font-medium">
                      {{ estimateDaysOfCover(item) }}
                    </div>
                  </div>
                </div>

                <div class="mt-2 flex flex-wrap gap-2">
                  <button class="btn btn-ghost btn-xs">View Item</button>
                  <button class="btn btn-ghost btn-xs" disabled>
                    Create Supply Request
                  </button>
                  <button
                    class="btn btn-outline btn-xs"
                    :class="{
                      'btn-disabled': acknowledgedLowStock.has(
                        item.item_type_id
                      ),
                    }"
                    @click="acknowledgeLowStock(item)"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            </div>

            <div v-if="lowStockItems.length === 0" class="text-center py-8">
              <CheckCircle class="w-12 h-12 mx-auto text-success mb-2" />
              <p class="text-gray-500">No low stock alerts!</p>
            </div>
          </div>
        </div>

        <!-- Reports Tab -->
        <div v-if="activeTab === 'reports'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4"
          >
            <h2
              class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl"
            >
              Enhanced Inventory Reports
            </h2>

            <!-- Report Controls -->
            <div class="flex flex-wrap gap-2">
              <select
                v-model="reportPeriod"
                class="select select-bordered select-sm"
              >
                <option value="current">Current Period</option>
                <option value="last_month">vs Last Month</option>
                <option value="last_quarter">vs Last Quarter</option>
              </select>
              <button @click="refreshReportData" class="btn btn-sm btn-outline">
                <RefreshCcw class="w-4 h-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>

          <!-- Search and Filter for Reports -->
          <div class="flex flex-col sm:flex-row gap-4 mb-6">
            <div class="join flex-1">
              <input
                v-model="reportSearchQuery"
                type="text"
                placeholder="Search items in reports..."
                class="input input-bordered input-sm join-item flex-1"
              />
              <button class="btn btn-sm join-item">
                <Search class="w-4 h-4" />
              </button>
            </div>
            <select
              v-model="reportCategoryFilter"
              class="select select-bordered select-sm"
            >
              <option value="">All Categories</option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
            <select
              v-model="reportConditionFilter"
              class="select select-bordered select-sm"
            >
              <option value="">All Conditions</option>
              <option value="available">Available</option>
              <option value="expired">Expired</option>
              <option value="damaged">Damaged</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>

          <!-- Visual Analytics Dashboard -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <!-- Inventory Distribution Chart -->
            <div class="card bg-base-100 border border-gray-200">
              <div class="card-body p-4">
                <h3
                  class="card-title text-sm font-semibold text-primaryColor mb-4"
                >
                  <BarChart3 class="w-4 h-4 mr-2" />
                  Inventory Value Distribution
                </h3>
                <div class="h-64 flex items-center justify-center">
                  <div class="w-full space-y-3">
                    <div
                      v-for="summary in filteredInventorySummary"
                      :key="summary.category_id"
                      class="relative"
                    >
                      <div class="flex justify-between items-center mb-1">
                        <span class="text-xs font-medium">{{
                          summary.category_name
                        }}</span>
                        <span class="text-xs"
                          >₱{{
                            parseFloat(
                              summary.total_value || 0
                            ).toLocaleString()
                          }}</span
                        >
                      </div>
                      <div class="w-full bg-gray-200 rounded-full h-2">
                        <div
                          class="bg-primaryColor h-2 rounded-full transition-all duration-300"
                          :style="{
                            width:
                              getValuePercentage(summary.total_value) + '%',
                          }"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Stock Movement Trends -->
            <div class="card bg-base-100 border border-gray-200">
              <div class="card-body p-4">
                <h3
                  class="card-title text-sm font-semibold text-primaryColor mb-4"
                >
                  <TrendingDown class="w-4 h-4 mr-2" />
                  Recent Stock Movements (7 Days)
                </h3>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                  <div
                    v-for="movement in recentStockMovements"
                    :key="movement.id"
                    class="flex justify-between items-center p-2 bg-gray-50 rounded text-xs"
                  >
                    <div class="flex items-center gap-2">
                      <component
                        :is="
                          getTransactionTypeInfo(
                            movement.transaction_type,
                            movement.adjustment_type
                          ).icon
                        "
                        class="w-3 h-3"
                      />
                      <span class="font-medium">{{
                        movement.item_type_name
                      }}</span>
                    </div>
                    <div class="text-right">
                      <div
                        class="font-medium"
                        :class="
                          getTransactionTypeInfo(
                            movement.transaction_type,
                            movement.adjustment_type
                          ).color
                        "
                      >
                        {{
                          movement.transaction_type === 'consumption'
                            ? '-'
                            : '+'
                        }}{{ parseFloat(movement.quantity).toLocaleString() }}
                      </div>
                      <div class="text-gray-500">
                        {{ formatTransactionDate(movement.transaction_date) }}
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="recentStockMovements.length === 0"
                    class="text-center py-4 text-gray-500"
                  >
                    No recent movements
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Enhanced Category Breakdown with Item Details -->
          <div class="space-y-4">
            <div
              v-for="category in detailedCategoryReport"
              :key="category.category_id"
              class="card bg-base-100 border border-gray-200"
            >
              <div class="card-body p-4">
                <div class="flex justify-between items-center mb-4">
                  <h3
                    class="card-title text-sm font-semibold text-primaryColor"
                  >
                    {{ category.category_name }}
                  </h3>
                  <div class="flex items-center gap-4">
                    <span class="text-sm font-medium"
                      >Total Value: ₱{{
                        parseFloat(category.total_value || 0).toLocaleString()
                      }}</span
                    >
                    <button
                      @click="toggleCategoryDetails(category.category_id)"
                      class="btn btn-ghost btn-xs"
                    >
                      <ChevronDown
                        v-if="!expandedCategories.has(category.category_id)"
                        class="w-4 h-4"
                      />
                      <ChevronUp v-else class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <!-- Category Summary Stats -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div class="text-center p-2 bg-gray-50 rounded">
                    <div class="text-lg font-bold text-primaryColor">
                      {{ category.total_items }}
                    </div>
                    <div class="text-xs text-gray-600">Total Items</div>
                  </div>
                  <div class="text-center p-2 bg-gray-50 rounded">
                    <div class="text-lg font-bold text-success">
                      {{ category.available_items }}
                    </div>
                    <div class="text-xs text-gray-600">Available</div>
                  </div>
                  <div class="text-center p-2 bg-gray-50 rounded">
                    <div class="text-lg font-bold text-warning">
                      {{ category.expiring_items }}
                    </div>
                    <div class="text-xs text-gray-600">Expiring</div>
                  </div>
                  <div class="text-center p-2 bg-gray-50 rounded">
                    <div class="text-lg font-bold text-error">
                      {{ category.expired_items }}
                    </div>
                    <div class="text-xs text-gray-600">Expired</div>
                  </div>
                </div>

                <!-- Detailed Item Breakdown -->
                <div
                  v-if="expandedCategories.has(category.category_id)"
                  class="mt-4"
                >
                  <div class="overflow-x-auto">
                    <table class="table table-zebra table-xs w-full">
                      <thead>
                        <tr class="bg-base-200">
                          <th>Item Name</th>
                          <th>Quantity</th>
                          <th>Unit Value</th>
                          <th>Total Value</th>
                          <th>Condition</th>
                          <th>Expiry Status</th>
                          <th>Stock Level</th>
                          <th>Forecast</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="item in category.items"
                          :key="item.id"
                          class="hover:bg-base-100"
                        >
                          <td>
                            <div class="font-medium">
                              {{ item.item_type_name }}
                            </div>
                            <div class="text-xs text-gray-500">
                              {{ item.batch_number || 'No batch' }}
                            </div>
                          </td>
                          <td class="font-medium">
                            {{ parseFloat(item.quantity).toLocaleString() }}
                            {{ item.unit_of_measure }}
                          </td>
                          <td>
                            ₱{{
                              parseFloat(item.unit_cost || 0).toLocaleString()
                            }}
                          </td>
                          <td class="font-medium">
                            ₱{{
                              parseFloat(item.total_value || 0).toLocaleString()
                            }}
                          </td>
                          <td>
                            <span
                              :class="getConditionBadgeClass(item.status)"
                              class="badge badge-xs"
                            >
                              {{ item.status }}
                            </span>
                          </td>
                          <td>
                            <span
                              v-if="item.expiry_date"
                              :class="
                                getExpiryStatusBadgeClass(item.expiry_date)
                              "
                              class="badge badge-xs"
                            >
                              {{ getExpiryStatusText(item.expiry_date) }}
                            </span>
                            <span v-else class="text-gray-400 text-xs"
                              >No expiry</span
                            >
                          </td>
                          <td>
                            <span
                              :class="getStockLevelBadgeClass(item)"
                              class="badge badge-xs"
                            >
                              {{ getStockLevelText(item) }}
                            </span>
                          </td>
                          <td>
                            <div class="text-xs">
                              <div class="font-medium">
                                {{ getForecastText(item) }}
                              </div>
                              <div class="text-gray-500">Next 30d</div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Low Stock Alerts Section -->
          <div class="card bg-base-100 border border-gray-200">
            <div class="card-body p-4">
              <h3 class="card-title text-sm font-semibold text-error mb-4">
                <AlertTriangle class="w-4 h-4 mr-2" />
                Low Stock Alerts
              </h3>
              <div class="space-y-2">
                <div
                  v-for="item in lowStockAlertItems"
                  :key="item.item_type_id"
                  class="flex justify-between items-center p-3 bg-error/10 border border-error/20 rounded"
                >
                  <div>
                    <div class="font-medium text-error">
                      {{ item.item_type_name }}
                    </div>
                    <div class="text-xs text-gray-600">
                      Current:
                      {{ parseFloat(item.current_stock).toLocaleString() }} |
                      Min:
                      {{ parseFloat(item.min_stock_level).toLocaleString() }}
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button class="btn btn-xs btn-outline btn-error">
                      Reorder
                    </button>
                    <button class="btn btn-xs btn-ghost">View Details</button>
                  </div>
                </div>
                <div
                  v-if="lowStockAlertItems.length === 0"
                  class="text-center py-4 text-gray-500"
                >
                  No low stock alerts
                </div>
              </div>
            </div>
          </div>

          <!-- Forecasting Section -->
          <div class="card bg-base-100 border border-gray-200">
            <div class="card-body p-4">
              <div class="flex justify-between items-center mb-4">
                <h3 class="card-title text-sm font-semibold text-primaryColor">
                  <BarChart3 class="w-4 h-4 mr-2" />
                  Inventory Forecasting
                </h3>
                <div class="flex gap-2 flex-wrap items-center">
                  <select
                    v-model="forecastPeriod"
                    class="select select-bordered select-xs"
                  >
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                  </select>
                  <select
                    v-model="forecastMethod"
                    class="select select-bordered select-xs"
                  >
                    <option value="moving_average">Moving Average</option>
                    <option value="linear_trend">Linear Trend</option>
                  </select>
                  <select
                    v-model="windowProfile"
                    class="select select-bordered select-xs"
                  >
                    <option value="auto">Window: Auto</option>
                    <option value="fast">Window: Fast (14d)</option>
                    <option value="medium">Window: Medium (30d)</option>
                    <option value="slow">Window: Slow (60d)</option>
                    <option value="custom">Window: Custom</option>
                  </select>
                  <input
                    v-if="windowProfile === 'custom'"
                    v-model.number="customWindowDays"
                    type="number"
                    min="7"
                    class="input input-bordered input-xs w-20"
                    placeholder="Days"
                  />
                  <input
                    v-model.number="leadTimeDays"
                    type="number"
                    min="0"
                    class="input input-bordered input-xs w-24"
                    placeholder="Lead time (d)"
                  />
                  <input
                    v-model.number="serviceLevel"
                    type="number"
                    step="0.01"
                    min="0.5"
                    max="0.999"
                    class="input input-bordered input-xs w-28"
                    placeholder="Service lvl (0.95)"
                  />
                  <button class="btn btn-xs" @click="seedForecastTest">
                    Test Usage
                  </button>
                </div>
              </div>

              <div class="overflow-x-auto">
                <table class="table table-zebra table-xs w-full">
                  <thead>
                    <tr class="bg-base-200">
                      <th>Item</th>
                      <th>Current Stock</th>
                      <th>Avg Daily Usage</th>
                      <th>Projected Demand</th>
                      <th>ROP</th>
                      <th>Reorder Date</th>
                      <th>Estimated Depletion</th>
                      <th>Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="forecast in inventoryForecasts"
                      :key="forecast.item_type_id"
                      class="hover:bg-base-100"
                    >
                      <td class="font-medium">{{ forecast.item_type_name }}</td>
                      <td>
                        {{
                          parseFloat(forecast.current_stock).toLocaleString()
                        }}
                      </td>
                      <td>{{ forecast.avg_daily_usage.toFixed(2) }}</td>
                      <td>{{ forecast.projected_demand.toFixed(0) }}</td>
                      <td>
                        {{ Math.ceil(forecast.reorder_point).toLocaleString() }}
                      </td>
                      <td>{{ forecast.reorder_date }}</td>
                      <td>
                        <span
                          :class="
                            getDepletionWarningClass(
                              forecast.days_until_depletion
                            )
                          "
                        >
                          {{
                            forecast.days_until_depletion > 0
                              ? forecast.days_until_depletion + ' days'
                              : 'Critical'
                          }}
                        </span>
                      </td>
                      <td>
                        <span
                          :class="
                            getActionBadgeClass(forecast.recommended_action)
                          "
                          class="badge badge-xs"
                        >
                          {{ forecast.recommended_action }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Disposed Items Report -->
          <div class="card bg-base-100 border border-gray-200">
            <div class="card-body p-4">
              <div class="flex justify-between items-center mb-4">
                <h3 class="card-title text-sm font-semibold text-error">
                  <Trash class="w-4 h-4 mr-2" />
                  Disposed Items Report
                </h3>
                <button
                  @click="refreshDisposedItems"
                  class="btn btn-xs btn-outline"
                >
                  <RefreshCcw class="w-3 h-3 mr-1" />
                  Refresh
                </button>
              </div>

              <!-- Disposed Items Filters -->
              <div class="flex flex-wrap gap-2 mb-4">
                <input
                  v-model="disposedFromDate"
                  type="date"
                  class="input input-bordered input-xs"
                  placeholder="From Date"
                />
                <input
                  v-model="disposedToDate"
                  type="date"
                  class="input input-bordered input-xs"
                  placeholder="To Date"
                />
                <select
                  v-model="disposedCategoryFilter"
                  class="select select-bordered select-xs"
                >
                  <option value="">All Categories</option>
                  <option
                    v-for="category in categories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}
                  </option>
                </select>
                <button
                  @click="loadDisposedItems"
                  class="btn btn-xs btn-primary"
                >
                  Apply Filters
                </button>
              </div>

              <!-- Disposed Items Table -->
              <div class="overflow-x-auto max-h-80">
                <table class="table table-zebra table-xs w-full">
                  <thead>
                    <tr class="bg-base-200">
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Batch #</th>
                      <th>Original Qty</th>
                      <th>Disposal Cost</th>
                      <th>Disposed Date</th>
                      <th>Disposed By</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in disposedItems"
                      :key="item.id"
                      class="hover:bg-base-100"
                    >
                      <td>
                        <div class="font-medium">{{ item.item_type_name }}</div>
                        <div class="text-xs text-gray-500">
                          {{ item.item_name || 'N/A' }}
                        </div>
                      </td>
                      <td>{{ item.category_name }}</td>
                      <td class="font-mono text-xs">
                        {{ item.batch_number || 'N/A' }}
                      </td>
                      <td>
                        {{
                          parseFloat(
                            item.original_quantity || 0
                          ).toLocaleString()
                        }}
                        {{ item.unit_of_measure }}
                      </td>
                      <td class="font-medium text-error">
                        ₱{{
                          parseFloat(item.disposal_cost || 0).toLocaleString()
                        }}
                      </td>
                      <td>{{ formatDate(item.disposed_date) }}</td>
                      <td>{{ item.disposed_by || 'N/A' }}</td>
                      <td
                        class="max-w-32 truncate"
                        :title="item.disposal_reason"
                      >
                        {{ item.disposal_reason || 'N/A' }}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div
                  v-if="disposedItems.length === 0"
                  class="text-center py-8 text-gray-500"
                >
                  <Trash class="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No disposed items found</p>
                  <p class="text-xs">Items will appear here after disposal</p>
                </div>
              </div>

              <!-- Disposal Summary -->
              <div
                v-if="disposedItems.length > 0"
                class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div class="text-center p-3 bg-error/10 rounded">
                  <div class="text-lg font-bold text-error">
                    {{ disposedItems.length }}
                  </div>
                  <div class="text-xs text-gray-600">Total Items Disposed</div>
                </div>
                <div class="text-center p-3 bg-error/10 rounded">
                  <div class="text-lg font-bold text-error">
                    ₱{{ getTotalDisposalCost().toLocaleString() }}
                  </div>
                  <div class="text-xs text-gray-600">Total Disposal Cost</div>
                </div>
                <div class="text-center p-3 bg-error/10 rounded">
                  <div class="text-lg font-bold text-error">
                    ₱{{ getTotalOriginalValue().toLocaleString() }}
                  </div>
                  <div class="text-xs text-gray-600">Original Value Lost</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Export Options -->
          <div class="card bg-base-100 border border-gray-200">
            <div class="card-body p-4">
              <h3
                class="card-title text-sm font-semibold text-primaryColor mb-4"
              >
                Export Enhanced Reports
              </h3>
              <div class="flex flex-wrap gap-2">
                <button
                  class="btn btn-sm btn-outline"
                  @click="exportDetailedInventory"
                >
                  <History class="w-4 h-4 mr-1" />
                  Export Detailed Inventory
                </button>
                <button
                  class="btn btn-sm btn-outline"
                  @click="exportValueAnalysis"
                >
                  <BarChart3 class="w-4 h-4 mr-1" />
                  Export Value Analysis
                </button>
                <button
                  class="btn btn-sm btn-outline"
                  @click="exportForecastReport"
                >
                  <TrendingDown class="w-4 h-4 mr-1" />
                  Export Forecast Report
                </button>
                <button
                  class="btn btn-sm btn-outline"
                  @click="exportLowStockAlert"
                >
                  <AlertTriangle class="w-4 h-4 mr-1" />
                  Export Low Stock Alert
                </button>
                <button
                  class="btn btn-sm btn-outline"
                  @click="exportDisposedItems"
                >
                  <Trash class="w-4 h-4 mr-1" />
                  Export Disposed Items
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <InventoryConsumptionModal
      :show="modal.show && modal.type === 'consumption'"
      :categories="categories"
      :item-types="itemTypes"
      :current-inventory="currentInventory"
      :loading="loading"
      @close="closeModal"
      @submit="handleConsumption"
    />

    <!-- Confirmation Modal (consistent with GRN Manager) -->
    <dialog id="inventory_confirm_modal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">{{ confirmModal.title }}</h3>
        <p class="py-4">{{ confirmModal.message }}</p>

        <div class="modal-action">
          <button
            type="button"
            class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none btn-sm"
            @click="closeConfirmModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn bg-primaryColor text-white btn-sm font-thin border-none hover:bg-primaryColor/80"
            @click="handleConfirmAction"
          >
            Confirm
          </button>
        </div>
      </div>
    </dialog>

    <InventoryAdjustmentModal
      :show="modal.show && modal.type === 'adjustment'"
      :categories="categories"
      :item-types="itemTypes"
      :current-inventory="currentInventory"
      :loading="loading"
      :preselected-item="modal.item"
      @close="closeModal"
      @submit="handleAdjustment"
    />

    <!-- Transaction Modal -->
    <TransactionModal
      :show="transactionModal.show"
      @close="closeTransactionModal"
    />

    <!-- Inventory Details Modal -->
    <InventoryDetailsModal
      :show="detailsModal.show"
      :inventory-item-id="detailsModal.inventoryItemId"
      @close="closeDetailsModal"
    />

    <!-- Toast Notifications -->
    <div
      v-if="toast.show"
      class="toast toast-end"
      :class="
        toast.type === 'error' ? 'alert alert-error' : 'alert alert-success'
      "
    >
      <span>{{ toast.message }}</span>
    </div>
  </div>
</template>

<style scoped>
  /* Consistent styling with PO component */
  .card:hover {
    transition: background-color 0.2s ease;
  }

  .stat:hover {
    background-color: rgba(var(--secondaryColor-rgb), 0.05);
    transition: background-color 0.2s ease;
  }

  .btn:hover {
    transform: translateY(-1px);
    transition: all 0.2s ease;
  }

  .toast {
    z-index: 9999;
  }

  @media (max-width: 640px) {
    .stats {
      grid-template-columns: 1fr;
    }

    .stat {
      padding: 1rem 0.5rem;
    }

    .stat-value {
      font-size: 1.5rem;
    }

    .tabs {
      flex-wrap: wrap;
    }

    .tab {
      flex: 1;
      min-width: 120px;
    }
  }
</style>
