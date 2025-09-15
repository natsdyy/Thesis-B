<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { useToast } from 'vue-toastification';
  import {
    Calendar,
    Package,
    Search,
    Filter,
    RefreshCcw,
    Plus,
    Minus,
    AlertTriangle,
    CheckCircle,
    Eye,
    Edit,
    TrendingDown,
    BarChart3,
    Clock,
    ArrowRightLeft,
    Bell,
    TrendingUp,
    Truck,
    Handshake,
    FileText,
    Activity,
    AlertCircle,
    Target,
    Star,
    X,
    XCircle,
    ChevronDown,
    ChevronUp,
    Settings,
    History,
    PhilippinePeso,
    Info,
    ArrowRightLeft as ArrowRightLeftIcon,
    Trash,
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { useBranchDistributionStore } from '../../stores/branchDistributionStore';
  import { useAuthStore } from '../../stores/authStore';
  import { useBranchInventoryStore } from '../../stores/branchInventoryStore';
  import BranchDistributionReceiptModal from '../../components/scm/BranchDistributionReceiptModal.vue';
  import BranchRequestSupply from '../../components/branch/BranchRequestSupply.vue';
  import ItemLevelAcceptRejectModal from '../../components/branch/ItemLevelAcceptRejectModal.vue';
  import { apiConfig } from '../../config/api';

  const branchContextStore = useBranchContextStore();
  const branchDistributionStore = useBranchDistributionStore();
  const authStore = useAuthStore();
  const branchInventoryStore = useBranchInventoryStore();
  const toast = useToast();

  // Local state following MainInventory pattern
  const activeTab = ref('overview');
  const inventoryType = ref('scm'); // 'scm' or 'production'
  const searchQuery = ref('');
  const categoryFilter = ref('');
  const statusFilter = ref('');
  const currentPage = ref(1);
  const itemsPerPage = ref(12);
  const loading = ref(false);

  // Alerts tab state to mirror MainInventory
  const alertTab = ref('expiring');

  // Real data from branch inventory store
  const branchInventory = computed(() => branchInventoryStore.inventory || []);
  const productionInventory = computed(
    () =>
      branchInventoryStore.inventory.filter(
        (item) => item.item_type === 'production'
      ) || []
  );
  const scmInventory = computed(
    () =>
      branchInventoryStore.inventory.filter(
        (item) => item.item_type === 'scm'
      ) || []
  );
  const categories = computed(() => {
    const cats = [
      ...new Set(branchInventoryStore.inventory.map((item) => item.category)),
    ];
    return cats.filter(Boolean).map((cat) => ({ name: cat }));
  });

  // Convert to reactive refs instead of computed properties
  const inventoryStats = ref({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalValue: 0,
  });

  const productionStats = ref({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    totalValue: 0,
  });

  // Additional stats to match MainInventory
  const expiringSoonCount = computed(() => {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return branchInventory.value.filter((item) => {
      if (!item.expiry_date) return false;
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= sevenDaysFromNow && expiryDate > now;
    }).length;
  });

  const expiredCount = computed(() => {
    const now = new Date();
    return branchInventory.value.filter((item) => {
      if (!item.expiry_date) return false;
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= now;
    }).length;
  });

  const lowStockItems = computed(
    () => branchInventoryStore.lowStockItems || []
  );
  const recentActivity = ref([]);
  const alerts = ref([]);
  const reports = ref([]);

  // Helper sets for acknowledging alerts (UI-only)
  const acknowledgedExpiring = ref(new Set());
  const acknowledgedLowStock = ref(new Set());

  const acknowledgeExpiring = (item) => {
    acknowledgedExpiring.value.add(
      item.id || `${item.id || item.item_type_id}-${item.expiry_date}`
    );
  };
  const acknowledgeLowStock = (item) => {
    acknowledgedLowStock.value.add(item.id || item.item_type_id);
  };

  // Category summary for overview
  const categorySummary = computed(() => {
    const categories = {};

    branchInventory.value.forEach((item) => {
      const category = item.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = {
          category,
          itemCount: 0,
          totalQuantity: 0,
          totalValue: 0,
          items: [],
        };
      }

      categories[category].itemCount++;
      categories[category].totalQuantity += parseFloat(item.quantity || 0);
      categories[category].totalValue += parseFloat(item.total_value || 0);
      categories[category].items.push(item);
    });

    // Determine status for each category
    return Object.values(categories).map((category) => {
      const lowStockItems = category.items.filter(
        (item) =>
          parseFloat(item.quantity) <= parseFloat(item.minimum_stock) &&
          parseFloat(item.quantity) > 0
      ).length;
      const outOfStockItems = category.items.filter(
        (item) => parseFloat(item.quantity) === 0
      ).length;

      let status = 'active';
      if (outOfStockItems > 0) {
        status = 'out_of_stock';
      } else if (lowStockItems > 0) {
        status = 'low_stock';
      } else if (category.itemCount === 0) {
        status = 'empty';
      }

      return {
        ...category,
        status,
        lowStockItems,
        outOfStockItems,
      };
    });
  });

  // Helper function for category status info
  const getCategoryStatusInfo = (status) => {
    const statusMap = {
      active: {
        icon: 'CheckCircle',
        color: 'text-success',
        description: 'All items in stock',
      },
      low_stock: {
        icon: 'AlertTriangle',
        color: 'text-warning',
        description: 'Some items running low',
      },
      out_of_stock: {
        icon: 'XCircle',
        color: 'text-error',
        description: 'Some items out of stock',
      },
      empty: {
        icon: 'Package',
        color: 'text-gray-500',
        description: 'No items in this category',
      },
    };
    return statusMap[status] || statusMap.empty;
  };

  // Helper function to format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Helper function to get transaction type info (matching MainInventory)
  const getTransactionTypeInfo = (transactionType, adjustmentType) => {
    const typeMap = {
      consumption: {
        icon: 'Minus',
        color: 'text-error',
        badgeColor: 'bg-error/20 text-error',
        label: 'Consumed',
        description: 'Item was consumed or used',
      },
      adjustment: {
        icon: 'RefreshCcw',
        color: 'text-warning',
        badgeColor: 'bg-warning/20 text-warning',
        label: adjustmentType === 'increase' ? 'Adjusted' : 'Adjusted',
        description: 'Stock quantity was adjusted',
      },
      distribution: {
        icon: 'Truck',
        color: 'text-info',
        badgeColor: 'bg-info/20 text-info',
        label: 'Distributed',
        description: 'Item was distributed to branch',
      },
      receipt: {
        icon: 'Plus',
        color: 'text-success',
        badgeColor: 'bg-success/20 text-success',
        label: 'Received',
        description: 'Item was received from distribution',
      },
      disposal: {
        icon: 'Trash',
        color: 'text-error',
        badgeColor: 'bg-error/20 text-error',
        label: 'Disposed',
        description: 'Item was disposed of',
      },
    };

    return (
      typeMap[transactionType] || {
        icon: 'Package',
        color: 'text-gray-600',
        badgeColor: 'bg-gray-100 text-gray-600',
        label: 'Activity',
        description: 'Inventory activity',
      }
    );
  };

  // Helper function to format transaction date
  const formatTransactionDate = (date) => {
    if (!date) return 'Unknown';

    const transactionDate = new Date(date);
    const now = new Date();
    const diffInDays = Math.floor(
      (now - transactionDate) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return transactionDate.toLocaleDateString();
    }
  };

  // Helper function to format batch number
  const formatBatchNumber = (batchNumber) => {
    if (!batchNumber || batchNumber === 'N/A') return 'N/A';
    return batchNumber.length > 20
      ? `${batchNumber.substring(0, 20)}...`
      : batchNumber;
  };

  // Date/expiry helpers to align with MainInventory
  const formatDate = (date) => {
    try {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString();
    } catch (e) {
      return 'N/A';
    }
  };

  const formatShortDate = (date) => {
    try {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const getDaysUntilExpiry = (date) => {
    if (!date) return Infinity;
    const now = new Date();
    const d = new Date(date);
    return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
  };

  const getExpirySeverityLevel = (item) => {
    const days = getDaysUntilExpiry(item.expiry_date);
    if (!Number.isFinite(days)) return 'info';
    if (days <= 0) return 'critical';
    if (days <= 3) return 'warning';
    return 'info';
  };

  const getExpiryFriendlyText = (date) => {
    const days = getDaysUntilExpiry(date);
    const d = formatDate(date);
    if (!Number.isFinite(days)) return `Expiry: ${d}`;
    if (days < 0) {
      const ago = Math.abs(days);
      return ago <= 1 ? `Expired today (${d})` : `Expired ${ago}d ago (${d})`;
    }
    if (days === 0) return `Expires today (${d})`;
    if (days === 1) return `Expires tomorrow (${d})`;
    return `Expires in ${days}d (${d})`;
  };

  const getLowStockSeverity = (item) => {
    const current = parseFloat(item.quantity || item.current_stock || 0);
    const min = parseFloat(item.minimum_stock || item.min_stock_level || 0);
    if (current <= 0) return 'critical';
    if (current <= min) return 'warning';
    return 'info';
  };

  const estimateDaysOfCover = (item) => {
    // Simple placeholder: assume daily usage of 1 unit if unknown
    const current = parseFloat(item.quantity || 0);
    const dailyUsage = 1;
    if (current <= 0) return 0;
    return Math.max(0, Math.floor(current / dailyUsage));
  };

  const viewBatchDetails = (/* item */) => {
    // Placeholder action hook for future modal
  };

  // Mirror ProductionInventory behavior: compute formatted inventory with full image URLs
  const formatImageUrl = (url) => {
    if (!url) return url;
    if (url.startsWith('/uploads/')) {
      const baseUrl = (apiConfig?.baseURL || '').replace('/api', '');
      return `${baseUrl}${url}`;
    }
    return url;
  };

  const formattedBranchInventory = computed(() => {
    return branchInventory.value.map((item) => {
      if (
        inventoryType.value === 'production' &&
        item.image_url &&
        item.image_url.startsWith('/uploads/')
      ) {
        return { ...item, image_url: formatImageUrl(item.image_url) };
      }
      return item;
    });
  });

  // Transaction modal handler
  const openTransactionModal = () => {
    // This would open a transaction modal - for now just log
    console.log('Opening transaction modal');
  };

  // Helper function to calculate dynamic minimum stock
  const calculateMinimumStock = (quantity) => {
    const qty = parseFloat(quantity) || 0;
    if (qty <= 0) return 1; // Minimum of 1 for any item

    // Calculate 15% of quantity, with minimum of 1 and maximum of 50
    const calculatedMin = Math.ceil(qty * 0.15);
    return Math.max(1, Math.min(calculatedMin, 50));
  };

  // Distribution-related state
  const pendingDistributions = ref([]);
  const distributionLoading = ref(false);
  const selectedDistribution = ref(null);
  const showAcceptanceModal = ref(false);
  const showReceiptModal = ref(false);
  const showRejectionModal = ref(false);
  const showItemLevelModal = ref(false);
  const distributionCurrentPage = ref(1);
  const distributionItemsPerPage = ref(10);
  const distributionActionLoading = ref(false);
  const itemLevelModal = ref(null);

  // Rejection form state
  const rejectionForm = ref({
    reason: '',
    notes: '',
  });

  // Computed
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const userRole = computed(() => branchContextStore.userRole);
  const canEdit = computed(() => branchContextStore.canAccessInventory);

  const currentInventoryData = computed(() => {
    const source =
      inventoryType.value === 'scm'
        ? formattedBranchInventory.value.filter(
            (item) => item.item_type === 'scm'
          )
        : formattedBranchInventory.value.filter(
            (item) => item.item_type === 'production'
          );
    return source;
  });

  const currentStats = computed(() => {
    return inventoryType.value === 'scm'
      ? inventoryStats.value
      : productionStats.value;
  });

  const filteredInventory = computed(() => {
    let items = currentInventoryData.value;

    // Filter by search query
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (categoryFilter.value) {
      items = items.filter((item) => item.category === categoryFilter.value);
    }

    // Filter by status
    if (statusFilter.value === 'low_stock') {
      items = items.filter(
        (item) => parseFloat(item.quantity) <= parseFloat(item.minimum_stock)
      );
    } else if (statusFilter.value === 'out_of_stock') {
      items = items.filter((item) => parseFloat(item.quantity) === 0);
    }

    return items;
  });

  const paginatedInventory = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return filteredInventory.value.slice(start, end);
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredInventory.value.length / itemsPerPage.value);
  });

  // Distribution computed properties
  const filteredDistributions = computed(() => {
    // Since we're already filtering in loadPendingDistributions, just return the pending distributions
    return pendingDistributions.value;
  });

  const paginatedDistributions = computed(() => {
    const start =
      (distributionCurrentPage.value - 1) * distributionItemsPerPage.value;
    const end = start + distributionItemsPerPage.value;
    return filteredDistributions.value.slice(start, end);
  });

  const totalDistributionPages = computed(() => {
    return Math.ceil(
      filteredDistributions.value.length / distributionItemsPerPage.value
    );
  });

  const pendingDistributionsCount = computed(() => {
    return filteredDistributions.value.length;
  });

  // Methods
  const getStockStatus = (item) => {
    if (parseFloat(item.quantity) === 0)
      return { status: 'out', class: 'badge-error', text: 'Out of Stock' };
    if (parseFloat(item.quantity) <= parseFloat(item.minimum_stock))
      return { status: 'low', class: 'badge-warning', text: 'Low Stock' };
    return { status: 'good', class: 'badge-success', text: 'In Stock' };
  };

  // Consistent item display name across different data shapes
  const getItemDisplayName = (item) => {
    return (
      item?.item_name ||
      item?.name ||
      item?.item_type_name ||
      item?.item ||
      'Unnamed Item'
    );
  };

  const loadBranchInventory = async () => {
    loading.value = true;

    try {
      if (!currentBranch.value?.id) {
        console.warn('No current branch selected');
        return;
      }

      // Load real data from branch inventory store
      await branchInventoryStore.loadAllData(currentBranch.value.id);

      // Calculate SCM stats
      const scmItems = branchInventory.value.filter(
        (item) => item.item_type === 'scm'
      );
      inventoryStats.value = {
        totalItems: scmItems.length,
        lowStockItems: scmItems.filter(
          (item) =>
            parseFloat(item.quantity) <= parseFloat(item.minimum_stock) &&
            parseFloat(item.quantity) > 0
        ).length,
        outOfStockItems: scmItems.filter(
          (item) => parseFloat(item.quantity) === 0
        ).length,
        totalValue: scmItems.reduce(
          (total, item) => total + parseFloat(item.total_value || 0),
          0
        ),
      };

      // Calculate Production stats
      const productionItems = branchInventory.value.filter(
        (item) => item.item_type === 'production'
      );
      productionStats.value = {
        totalItems: productionItems.length,
        lowStockItems: productionItems.filter(
          (item) =>
            parseFloat(item.quantity) <= parseFloat(item.minimum_stock) &&
            parseFloat(item.quantity) > 0
        ).length,
        outOfStockItems: productionItems.filter(
          (item) => parseFloat(item.quantity) === 0
        ).length,
        totalValue: productionItems.reduce(
          (total, item) => total + parseFloat(item.total_value || 0),
          0
        ),
      };

      // Generate real recent activity from branch inventory data
      const realRecentActivity = [];

      // Create activity entries for each inventory item based on their distribution
      branchInventory.value.forEach((item, index) => {
        // Add distribution activity
        realRecentActivity.push({
          id: `dist_${item.id}`,
          transaction_type: 'receipt',
          action: 'Stock Received',
          item_name: item.item_name,
          item_type_name: item.item_name,
          item: item.item_name,
          quantity: parseFloat(item.quantity),
          total_value: parseFloat(item.total_value || 0),
          value: parseFloat(item.total_value || 0),
          time: formatTimeAgo(new Date(item.created_at || new Date())),
          transaction_date: item.created_at || new Date(),
          type: 'distribution',
          category_name: item.category,
          category: item.category,
          unit_of_measure: item.unit,
          unit: item.unit,
          performed_by: 'Branch Manager',
          reason: 'Branch Distribution',
          batch_number: item.batch_number || null,
        });

        // Add low stock warning if applicable
        if (
          parseFloat(item.quantity) <= parseFloat(item.minimum_stock) &&
          parseFloat(item.quantity) > 0
        ) {
          realRecentActivity.push({
            id: `low_stock_${item.id}`,
            transaction_type: 'alert',
            action: 'Low Stock Alert',
            item_name: item.item_name,
            item_type_name: item.item_name,
            item: item.item_name,
            quantity: parseFloat(item.quantity),
            total_value: parseFloat(item.total_value || 0),
            value: parseFloat(item.total_value || 0),
            time: 'Just now',
            transaction_date: new Date(),
            type: 'alert',
            category_name: item.category,
            category: item.category,
            unit_of_measure: item.unit,
            unit: item.unit,
            performed_by: 'System',
            notes: `Item is running low on stock (${item.quantity} ${item.unit} remaining)`,
            batch_number: item.batch_number || null,
          });
        }

        // Add out of stock warning if applicable
        if (parseFloat(item.quantity) === 0) {
          realRecentActivity.push({
            id: `out_stock_${item.id}`,
            transaction_type: 'alert',
            action: 'Out of Stock',
            item_name: item.item_name,
            item_type_name: item.item_name,
            item: item.item_name,
            quantity: 0,
            total_value: 0,
            value: 0,
            time: 'Just now',
            transaction_date: new Date(),
            type: 'alert',
            category_name: item.category,
            category: item.category,
            unit_of_measure: item.unit,
            unit: item.unit,
            performed_by: 'System',
            notes: 'Item is out of stock',
            batch_number: item.batch_number || null,
          });
        }
      });

      // Sort by most recent first
      realRecentActivity.sort((a, b) => {
        if (a.time === 'Just now') return -1;
        if (b.time === 'Just now') return 1;
        return new Date(b.time) - new Date(a.time);
      });

      recentActivity.value = realRecentActivity.slice(0, 10); // Limit to 10 most recent

      // Generate real alerts from branch inventory data
      const realAlerts = [];
      console.log('Branch inventory data for alerts:', branchInventory.value);

      // Low stock alerts
      const lowStockItems = branchInventory.value.filter(
        (item) =>
          parseFloat(item.quantity) <= parseFloat(item.minimum_stock) &&
          parseFloat(item.quantity) > 0
      );
      console.log('Low stock items for alerts:', lowStockItems);
      console.log(
        'Debug - Item details:',
        branchInventory.value.map((item) => ({
          name: item.item_name,
          quantity: item.quantity,
          minimum_stock: item.minimum_stock,
          isLowStock:
            parseFloat(item.quantity) <= parseFloat(item.minimum_stock) &&
            parseFloat(item.quantity) > 0,
        }))
      );
      lowStockItems.forEach((item, index) => {
        realAlerts.push({
          id: `low_stock_${item.id}`,
          type: 'low_stock',
          message: `${item.item_name} is running low on stock (${item.quantity} ${item.unit} remaining)`,
          item: item.item_name,
          severity: 'warning',
          time: 'Just now',
          currentStock: item.quantity,
          minimumStock: item.minimum_stock,
        });
      });

      // Out of stock alerts
      const outOfStockItems = branchInventory.value.filter(
        (item) => parseFloat(item.quantity) === 0
      );
      outOfStockItems.forEach((item, index) => {
        realAlerts.push({
          id: `out_of_stock_${item.id}`,
          type: 'out_of_stock',
          message: `${item.item_name} is out of stock`,
          item: item.item_name,
          severity: 'error',
          time: 'Just now',
          currentStock: item.quantity,
        });
      });

      // Expiring items alerts (if we had expiry dates)
      const expiringItems = branchInventory.value.filter(
        (item) =>
          item.expiry_date &&
          new Date(item.expiry_date) <=
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );
      expiringItems.forEach((item, index) => {
        const daysUntilExpiry = Math.ceil(
          (new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
        );
        realAlerts.push({
          id: `expiring_${item.id}`,
          type: 'expiring',
          message: `${item.item_name} will expire in ${daysUntilExpiry} days`,
          item: item.item_name,
          severity: daysUntilExpiry <= 2 ? 'error' : 'warning',
          time: 'Just now',
          expiryDate: item.expiry_date,
          daysUntilExpiry: daysUntilExpiry,
        });
      });

      console.log('Generated alerts:', realAlerts);
      alerts.value = realAlerts;

      // Low stock items
      lowStockItems.value = branchInventory.value.filter(
        (item) => parseFloat(item.quantity) <= parseFloat(item.minimum_stock)
      );

      // Generate real reports from branch inventory data
      const realReports = [];

      // Current inventory summary report
      const totalItems = branchInventory.value.length;
      const totalValue = branchInventory.value.reduce(
        (sum, item) => sum + parseFloat(item.total_value || 0),
        0
      );
      const lowStockCount = branchInventory.value.filter(
        (item) =>
          parseFloat(item.quantity) <= parseFloat(item.minimum_stock) &&
          parseFloat(item.quantity) > 0
      ).length;
      const outOfStockCount = branchInventory.value.filter(
        (item) => parseFloat(item.quantity) === 0
      ).length;

      realReports.push({
        id: 'current_summary',
        title: 'Current Inventory Summary',
        type: 'summary',
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
        data: {
          totalItems,
          totalValue,
          lowStockCount,
          outOfStockCount,
          averageValue: totalItems > 0 ? totalValue / totalItems : 0,
        },
      });

      // Low stock items report
      if (lowStockCount > 0) {
        realReports.push({
          id: 'low_stock_report',
          title: 'Low Stock Items Report',
          type: 'low_stock',
          date: new Date().toISOString().split('T')[0],
          status: 'completed',
          data: {
            items: branchInventory.value.filter(
              (item) =>
                parseFloat(item.quantity) <= parseFloat(item.minimum_stock) &&
                parseFloat(item.quantity) > 0
            ),
            count: lowStockCount,
          },
        });
      }

      // Out of stock items report
      if (outOfStockCount > 0) {
        realReports.push({
          id: 'out_of_stock_report',
          title: 'Out of Stock Items Report',
          type: 'out_of_stock',
          date: new Date().toISOString().split('T')[0],
          status: 'completed',
          data: {
            items: branchInventory.value.filter(
              (item) => parseFloat(item.quantity) === 0
            ),
            count: outOfStockCount,
          },
        });
      }

      // Inventory value analysis report
      const scmItemsForReport = branchInventory.value.filter(
        (item) => item.item_type === 'scm'
      );
      const productionItemsForReport = branchInventory.value.filter(
        (item) => item.item_type === 'production'
      );
      const scmValue = scmItemsForReport.reduce(
        (sum, item) => sum + parseFloat(item.total_value || 0),
        0
      );
      const productionValue = productionItemsForReport.reduce(
        (sum, item) => sum + parseFloat(item.total_value || 0),
        0
      );

      realReports.push({
        id: 'value_analysis',
        title: 'Inventory Value Analysis',
        type: 'analysis',
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
        data: {
          scmItems: scmItems.length,
          productionItems: productionItems.length,
          scmValue,
          productionValue,
          totalValue,
          scmPercentage: totalValue > 0 ? (scmValue / totalValue) * 100 : 0,
          productionPercentage:
            totalValue > 0 ? (productionValue / totalValue) * 100 : 0,
        },
      });

      reports.value = realReports;
    } catch (error) {
      console.error('Error loading branch inventory:', error);
    } finally {
      loading.value = false;
    }
  };

  const refreshInventory = () => {
    loadBranchInventory();
  };

  const switchInventoryType = (type) => {
    inventoryType.value = type;
    currentPage.value = 1; // Reset pagination
  };

  const handleRequestCreated = (request) => {
    console.log('Request created:', request);
    // Refresh inventory data if needed
    loadBranchInventory();
  };

  const handleRequestUpdated = (request) => {
    console.log('Request updated:', request);
    // Refresh inventory data if needed
    loadBranchInventory();
  };

  // Distribution methods
  const loadPendingDistributions = async () => {
    if (!currentBranch.value?.id) return;

    distributionLoading.value = true;
    try {
      // Use the same method as MainInventory.vue - fetch all distributions
      await branchDistributionStore.fetchDistributions({
        page: distributionCurrentPage.value,
        limit: distributionItemsPerPage.value,
      });

      // Get the distributions from the store
      const allDistributions = branchDistributionStore.distributions || [];

      // Filter for current branch and delivered status
      const branchDistributions = allDistributions.filter(
        (dist) =>
          dist.branch_id === currentBranch.value.id &&
          dist.status === 'delivered'
      );

      // Fetch full distribution details with items for each distribution
      const distributionsWithItems = [];
      for (const dist of branchDistributions) {
        try {
          const fullDistribution =
            await branchDistributionStore.fetchDistributionById(dist.id);
          if (fullDistribution) {
            distributionsWithItems.push(fullDistribution);
          }
        } catch (error) {
          console.error('Error loading distribution details:', error);
          // If we can't fetch the full details, use the basic distribution
          distributionsWithItems.push(dist);
        }
      }

      // Process each distribution to ensure it has the correct format
      pendingDistributions.value = distributionsWithItems.map((dist) => ({
        ...dist,
        // Set received_by to the actual branch manager's name
        received_by:
          dist.received_by ||
          (() => {
            const user = authStore.user;
            if (user?.first_name && user?.last_name) {
              return `${user.first_name} ${user.last_name}`;
            }
            return user?.name || 'Branch Manager';
          })(),
        // Ensure items are properly formatted
        items:
          dist.items?.map((item) => ({
            ...item,
            // Convert string numbers to numbers for proper display
            qty: parseFloat(item.qty) || 0,
            unit_price: parseFloat(item.unit_price) || 0,
            amount: parseFloat(item.amount) || 0,
          })) || [],
      }));

      console.log('All distributions:', allDistributions);
      console.log('Filtered for branch:', branchDistributions);
      console.log('Processed distributions:', pendingDistributions.value);
    } catch (error) {
      console.error('Error loading pending distributions:', error);
      // Only use mock data if API completely fails
      pendingDistributions.value = [];
    } finally {
      distributionLoading.value = false;
    }
  };

  const openAcceptanceModal = (distribution) => {
    console.log('Opening acceptance modal for distribution:', distribution);
    selectedDistribution.value = distribution;
    showAcceptanceModal.value = true;
    // Open the modal using DaisyUI's modal system
    document.getElementById('distribution_acceptance_modal')?.showModal();
  };

  const closeAcceptanceModal = () => {
    selectedDistribution.value = null;
    showAcceptanceModal.value = false;
    // Close the modal using DaisyUI's modal system
    document.getElementById('distribution_acceptance_modal')?.close();
  };

  const openRejectionModal = (distribution) => {
    console.log('Opening rejection modal for distribution:', distribution);
    selectedDistribution.value = distribution;
    showRejectionModal.value = true;
    // Reset rejection form
    rejectionForm.value = {
      reason: '',
      notes: '',
    };
    // Open the modal using DaisyUI's modal system
    document.getElementById('distribution_rejection_modal')?.showModal();
  };

  const closeRejectionModal = () => {
    selectedDistribution.value = null;
    showRejectionModal.value = false;
    // Reset rejection form
    rejectionForm.value = {
      reason: '',
      notes: '',
    };
    // Close the modal using DaisyUI's modal system
    document.getElementById('distribution_rejection_modal')?.close();
  };

  const openItemLevelModal = (distribution) => {
    console.log('Opening item-level modal for distribution:', distribution);
    selectedDistribution.value = distribution;
    showItemLevelModal.value = true;
    // Open the modal using the component's exposed method
    itemLevelModal.value?.openModal();
  };

  const closeItemLevelModal = () => {
    selectedDistribution.value = null;
    showItemLevelModal.value = false;
    // Close the modal using the component's exposed method
    itemLevelModal.value?.closeModal();
  };

  const acceptDistribution = async (distribution) => {
    try {
      console.log('Starting accept distribution process for:', distribution);
      distributionActionLoading.value = true;

      // Complete distribution and add items to branch inventory
      console.log(
        'Completing distribution and adding items to branch inventory...'
      );
      await branchDistributionStore.completeDistribution(distribution.id, {
        completed_by: authStore.user?.name || 'Branch Manager',
      });
      console.log(
        'Distribution completed successfully and items added to branch inventory'
      );

      // Refresh data
      console.log('Refreshing data...');
      await loadPendingDistributions();
      await loadBranchInventory();
      console.log('Data refreshed successfully');

      closeAcceptanceModal();

      // Show success message
      console.log('Distribution accepted successfully');
      toast.success(
        'Distribution accepted successfully! Items have been added to your inventory.'
      );
    } catch (error) {
      console.error('Error accepting distribution:', error);
      toast.error('Error accepting distribution: ' + error.message);
    } finally {
      distributionActionLoading.value = false;
    }
  };

  const addToBranchInventory = async (item, type) => {
    // This would integrate with your branch inventory API
    // For now, we'll add to local state
    const quantity = parseFloat(item.qty) || 0;
    const minimumStock = calculateMinimumStock(quantity);

    const inventoryItem = {
      id: Date.now() + Math.random(),
      name: item.name,
      category: item.category || 'General',
      quantity: quantity,
      unit: item.unit,
      minimum_stock: minimumStock, // Dynamic minimum stock calculation
      cost_price: parseFloat(item.unit_price) || 0,
      selling_price:
        type === 'production' ? (parseFloat(item.unit_price) || 0) * 1.2 : null,
      last_updated: new Date().toISOString(),
    };

    if (type === 'scm') {
      branchInventory.value.push(inventoryItem);
    } else {
      productionInventory.value.push(inventoryItem);
    }
  };

  const addToBranchInventoryAPI = async (item, type) => {
    try {
      // This function should make actual API calls to add items to branch inventory
      // The exact API endpoint and payload structure would depend on your backend implementation

      const quantity = parseFloat(item.qty) || 0;
      const minimumStock = calculateMinimumStock(quantity);

      console.log(
        `Calculating minimum stock for ${item.name}: quantity=${quantity}, minimum=${minimumStock}`
      );

      const inventoryData = {
        item_id: item.item_id || item.id,
        item_name: item.name,
        category: item.category || 'General',
        quantity: quantity,
        unit: item.unit,
        unit_price: parseFloat(item.unit_price) || 0,
        total_value: parseFloat(item.amount) || 0,
        minimum_stock: minimumStock, // Dynamic minimum stock calculation
        item_type: type, // 'scm' or 'production'
        source: item.source,
        batch_number: item.batch_number || null,
        expiry_date: item.expiry_date || null,
        branch_id: currentBranch.value?.id,
        received_by: authStore.user?.name || 'Branch Manager',
        distribution_id: item.distribution_id || null,
      };

      // Make API call to add item to branch inventory
      // This would typically be something like:
      // await branchInventoryStore.addInventoryItem(inventoryData);

      // For now, we'll add to local state and log the action
      console.log('Adding item to branch inventory:', inventoryData);

      // Add to local state as fallback
      if (type === 'scm') {
        branchInventory.value.push({
          ...inventoryData,
          id: Date.now() + Math.random(),
          last_updated: new Date().toISOString(),
        });
      } else {
        productionInventory.value.push({
          ...inventoryData,
          id: Date.now() + Math.random(),
          last_updated: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error adding item to branch inventory:', error);
      throw error; // Re-throw to be handled by the calling function
    }
  };

  const rejectDistribution = async (distribution) => {
    try {
      console.log('Starting reject distribution process for:', distribution);
      distributionActionLoading.value = true;

      // Validate rejection form
      if (!rejectionForm.value.reason.trim()) {
        toast.warning('Please provide a reason for rejection.');
        return;
      }

      // Reject distribution and return quantities to main inventory
      console.log(
        'Rejecting distribution and returning quantities to main inventory...'
      );
      await branchDistributionStore.rejectDistribution(distribution.id, {
        rejected_by: authStore.user?.name || 'Branch Manager',
        rejection_reason: rejectionForm.value.reason,
        rejection_notes: rejectionForm.value.notes,
      });
      console.log(
        'Distribution rejected successfully and quantities returned to main inventory'
      );

      // Refresh data
      console.log('Refreshing pending distributions...');
      await loadPendingDistributions();
      closeRejectionModal();

      // Show success message
      console.log('Distribution rejected successfully');
      toast.success(
        'Distribution rejected successfully! Quantities have been returned to main inventory.'
      );
    } catch (error) {
      console.error('Error rejecting distribution:', error);
      toast.error('Error rejecting distribution: ' + error.message);
    } finally {
      distributionActionLoading.value = false;
    }
  };

  const handleItemLevelProcessing = async (actionData) => {
    try {
      console.log(
        'Starting item-level processing for distribution:',
        selectedDistribution.value
      );
      console.log('Action data:', actionData);
      distributionActionLoading.value = true;

      // Call the new partial accept/reject method
      const result = await branchDistributionStore.partialAcceptReject(
        selectedDistribution.value.id,
        {
          action_by: authStore.user?.name || 'Branch Manager',
          ...actionData,
        }
      );

      console.log('Item-level processing result:', result);

      // Close the modal
      closeItemLevelModal();

      // Refresh data
      await loadPendingDistributions();
      await loadBranchInventory();

      // Show success message with details
      const acceptedCount = actionData.accepted_items?.length || 0;
      const rejectedCount = actionData.rejected_items?.length || 0;

      let message = `Distribution processed successfully! `;
      if (acceptedCount > 0) {
        message += `${acceptedCount} item(s) accepted and added to inventory. `;
      }
      if (rejectedCount > 0) {
        message += `${rejectedCount} item(s) rejected and returned to main inventory.`;
      }

      toast.success(message);
    } catch (error) {
      console.error('Error processing items:', error);
      toast.error('Error processing items: ' + error.message);
    } finally {
      distributionActionLoading.value = false;
    }
  };

  const viewDistributionReceipt = (distribution) => {
    // Format the distribution data to match the receipt modal expectations
    const receiptData = {
      ...distribution,
      completed_at: distribution.created_at,
      received_by:
        distribution.received_by ||
        (() => {
          const user = authStore.user;
          if (user?.first_name && user?.last_name) {
            return `${user.first_name} ${user.last_name}`;
          }
          return user?.name || 'Branch Manager';
        })(),
      items:
        distribution.items?.map((item) => ({
          item_name: item.name,
          source: item.source,
          item_quantity: parseFloat(item.qty) || 0,
          item_unit: item.unit,
          item_unitPrice: parseFloat(item.unit_price) || 0,
          item_amount: parseFloat(item.amount) || 0,
        })) || [],
    };

    selectedDistribution.value = receiptData;
    showReceiptModal.value = true;
  };

  const closeReceiptModal = () => {
    selectedDistribution.value = null;
    showReceiptModal.value = false;
  };

  // Watch for currentBranch changes and load data when available
  watch(
    currentBranch,
    (newBranch) => {
      if (newBranch?.id) {
        console.log(
          'Branch changed, loading inventory data for:',
          newBranch.name
        );
        loadBranchInventory();
        loadPendingDistributions();
      }
    },
    { immediate: true }
  );

  // Initialize
  onMounted(() => {
    // Data will be loaded by the watcher when currentBranch is available
    console.log('BranchInventory mounted, currentBranch:', currentBranch.value);
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-primaryColor">Branch Inventory</h1>
        <p class="text-gray-600 mt-1">
          {{ currentBranch?.name }} - Stock Management
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <button
          @click="refreshInventory"
          :disabled="loading"
          class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
        >
          <RefreshCcw :class="['w-4 h-4 mr-2', { 'animate-spin': loading }]" />
          Refresh
        </button>
      </div>
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
        <span
          v-if="alerts.length > 0"
          class="badge badge-sm border-none font-medium bg-error/20 text-error ml-1"
        >
          {{ alerts.length }}
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
      <button
        @click="activeTab = 'pending_distributions'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'pending_distributions' }"
      >
        <Truck class="w-4 h-4 mr-1" />
        Pending Distributions
        <span
          v-if="pendingDistributionsCount > 0"
          class="badge badge-sm border-none font-medium bg-warning/20 text-warning ml-1"
        >
          {{ pendingDistributionsCount }}
        </span>
      </button>
      <button
        @click="activeTab = 'request_supply'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'request_supply' }"
      >
        <Handshake class="w-4 h-4 mr-1" />
        Request Supply
      </button>
    </div>

    <!-- Main Content Card -->
    <div
      class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10"
    >
      <div class="card-body p-3 sm:p-4 lg:p-6">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                <BarChart3 class="w-5 h-5 sm:w-6 sm:h-6" />
                Inventory Overview
              </h2>
              <p class="text-sm text-gray-600">
                Comprehensive view of your inventory status and recent
                activities
              </p>
            </div>
            <div class="flex gap-2">
              <button
                @click="refreshInventory"
                class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
                :disabled="loading"
              >
                <RefreshCcw class="w-4 h-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>

          <!-- Stats Cards -->
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
                {{ inventoryStats.totalItems + productionStats.totalItems }}
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
              <div class="stat-title text-black/50 text-xs sm:text-sm">
                Available
              </div>
              <div
                class="stat-value text-success text-lg sm:text-xl lg:text-2xl xl:text-3xl"
              >
                {{
                  inventoryStats.totalItems +
                  productionStats.totalItems -
                  (inventoryStats.outOfStockItems +
                    productionStats.outOfStockItems)
                }}
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
                {{ expiringSoonCount }}
              </div>
              <div class="stat-desc text-black/50 !text-xs sm:text-sm">
                Within 7 days
              </div>
            </div>

            <div
              class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
            >
              <div class="stat-figure">
                <XCircle
                  class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-error"
                />
              </div>
              <div class="stat-title text-black/50 !text-xs sm:text-sm">
                Expired
              </div>
              <div
                class="stat-value text-error text-lg sm:text-xl lg:text-2xl xl:text-3xl"
              >
                {{ expiredCount }}
              </div>
              <div class="stat-desc text-black/50 !text-xs sm:text-sm">
                Items expired
              </div>
            </div>
          </div>

          <!-- Enhanced Recent Activity -->
          <div
            class="card bg-gradient-to-br from-base-100 to-base-50 border border-gray-200 shadow-lg"
          >
            <div class="card-body p-6">
              <div class="flex justify-between items-center mb-6">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full bg-primaryColor/10 flex items-center justify-center"
                  >
                    <History class="w-5 h-5 text-primaryColor" />
                  </div>
                  <div>
                    <h3 class="card-title text-lg font-bold text-primaryColor">
                      Recent Activity
                    </h3>
                    <p class="text-xs text-gray-500">
                      Latest inventory movements
                    </p>
                  </div>
                </div>
                <button
                  @click="refreshInventory"
                  class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
                  :disabled="loading"
                >
                  <RefreshCcw class="w-4 h-4 mr-1" />
                  Refresh
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

              <div v-else class="space-y-4 max-h-96 overflow-y-auto">
                <div
                  v-for="activity in recentActivity"
                  :key="activity.id"
                  class="flex items-start gap-4 p-4 bg-white/70 rounded-xl hover:bg-white transition-all duration-200 hover:shadow-md border border-gray-100"
                >
                  <div class="flex-shrink-0">
                    <div
                      class="w-10 h-10 rounded-full flex items-center justify-center"
                      :class="{
                        'bg-success/10': getTransactionTypeInfo(
                          activity.transaction_type,
                          activity.adjustment_type
                        ).badgeColor.includes('success'),
                        'bg-warning/10': getTransactionTypeInfo(
                          activity.transaction_type,
                          activity.adjustment_type
                        ).badgeColor.includes('warning'),
                        'bg-error/10': getTransactionTypeInfo(
                          activity.transaction_type,
                          activity.adjustment_type
                        ).badgeColor.includes('error'),
                        'bg-info/10': getTransactionTypeInfo(
                          activity.transaction_type,
                          activity.adjustment_type
                        ).badgeColor.includes('info'),
                        'bg-primary/10': getTransactionTypeInfo(
                          activity.transaction_type,
                          activity.adjustment_type
                        ).badgeColor.includes('primary'),
                        'bg-gray-100': getTransactionTypeInfo(
                          activity.transaction_type,
                          activity.adjustment_type
                        ).badgeColor.includes('gray'),
                      }"
                    >
                      <component
                        :is="
                          getTransactionTypeInfo(
                            activity.transaction_type,
                            activity.adjustment_type
                          ).icon
                        "
                        class="w-5 h-5"
                        :class="
                          getTransactionTypeInfo(
                            activity.transaction_type,
                            activity.adjustment_type
                          ).color
                        "
                      />
                    </div>
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start mb-3">
                      <div class="flex-1">
                        <h4 class="font-bold text-sm text-gray-900 mb-1">
                          {{
                            activity.item_name ||
                            activity.item_type_name ||
                            activity.item
                          }}
                        </h4>
                        <div
                          class="flex items-center gap-2 text-xs text-gray-600 mb-1"
                        >
                          <span class="bg-gray-100 px-2 py-1 rounded-full">
                            {{ activity.category_name || activity.category }}
                          </span>
                          <span>•</span>
                          <span>{{
                            activity.unit_of_measure || activity.unit
                          }}</span>
                        </div>
                        <p
                          v-if="activity.batch_number"
                          class="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded inline-block"
                        >
                          Batch: {{ formatBatchNumber(activity.batch_number) }}
                        </p>
                      </div>

                      <div class="text-right">
                        <div class="flex items-center gap-2 justify-end mb-1">
                          <div
                            class="badge badge-sm border-none font-medium"
                            :class="
                              getTransactionTypeInfo(
                                activity.transaction_type,
                                activity.adjustment_type
                              ).badgeColor
                            "
                          >
                            {{
                              getTransactionTypeInfo(
                                activity.transaction_type,
                                activity.adjustment_type
                              ).label
                            }}
                          </div>
                          <div
                            class="tooltip tooltip-left"
                            :data-tip="
                              getTransactionTypeInfo(
                                activity.transaction_type,
                                activity.adjustment_type
                              ).description
                            "
                          >
                            <Info class="w-3 h-3 text-gray-400 cursor-help" />
                          </div>
                        </div>
                        <div class="text-xs text-gray-500 font-medium">
                          {{
                            formatTransactionDate(
                              activity.transaction_date || activity.time
                            )
                          }}
                        </div>
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 mb-3">
                      <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-xs text-gray-600 mb-1">Quantity</div>
                        <div class="text-lg font-bold text-primaryColor">
                          {{
                            parseFloat(activity.quantity || 0).toLocaleString()
                          }}
                          <span class="text-sm font-normal text-gray-500"
                            >units</span
                          >
                        </div>
                      </div>

                      <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-xs text-gray-600 mb-1">Value</div>
                        <div class="text-lg font-bold text-success">
                          ₱{{
                            parseFloat(
                              activity.total_value || activity.value || 0
                            ).toLocaleString()
                          }}
                        </div>
                      </div>
                    </div>

                    <div
                      v-if="activity.disposal_cost"
                      class="bg-error/10 border border-error/20 rounded-lg p-3 mb-3"
                    >
                      <div class="text-xs text-error font-medium mb-1">
                        Disposal Cost
                      </div>
                      <div class="text-sm font-bold text-error">
                        ₱{{
                          parseFloat(activity.disposal_cost).toLocaleString()
                        }}
                      </div>
                    </div>

                    <div
                      class="flex justify-between items-center pt-3 border-t border-gray-100"
                    >
                      <div class="text-xs text-gray-500">
                        <span class="font-medium">Performed by:</span>
                        {{ activity.performed_by || 'Branch Manager' }}
                      </div>
                      <div class="text-xs text-gray-400">
                        Transaction ID: #{{ activity.id }}
                      </div>
                    </div>

                    <div
                      v-if="activity.reason || activity.notes"
                      class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div class="text-xs text-blue-700 font-medium mb-1">
                        {{ activity.reason ? 'Reason' : 'Notes' }}
                      </div>
                      <p class="text-xs text-blue-800">
                        {{ activity.reason || activity.notes }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="recentActivity.length > 0" class="mt-6 text-center">
                <button
                  @click="openTransactionModal"
                  class="btn btn-sm btn-outline bg-primaryColor text-white font-thin hover:bg-primaryColor/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <BarChart3 class="w-4 h-4 mr-2" />
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
              <Package class="w-5 h-5 sm:w-6 sm:h-6" />
              Inventory List
            </h2>
          </div>

          <!-- Inventory Type Toggle -->
          <div class="flex justify-center mb-6 sm:mb-4 lg:mb-6">
            <div class="join gap-1">
              <button
                @click="switchInventoryType('scm')"
                class="join-item btn btn-sm font-thin"
                :class="
                  inventoryType === 'scm'
                    ? '!bg-primaryColor/10 text-primaryColor border border-none'
                    : '!bg-gray-200 text-black/50 border border-none hover:bg-gray-300'
                "
              >
                <Package class="w-4 h-4 mr-2" />
                SCM Inventory
              </button>
              <button
                @click="switchInventoryType('production')"
                class="join-item btn btn-sm font-thin"
                :class="
                  inventoryType === 'production'
                    ? '!bg-primaryColor/10 text-primaryColor border border-none'
                    : '!bg-gray-200 text-black/50 border border-none hover:bg-gray-300'
                "
              >
                <Settings class="w-4 h-4 mr-2" />
                Production Inventory
              </button>
            </div>
          </div>

          <!-- Search and Filters -->
          <div class="card bg-white shadow-lg">
            <div class="card-body p-4">
              <div class="flex flex-col md:flex-row gap-4">
                <!-- Search -->
                <div class="flex-1">
                  <div class="join w-full">
                    <input
                      v-model="searchQuery"
                      type="text"
                      placeholder="Search items..."
                      class="input input-bordered input-sm join-item flex-1"
                    />
                    <button
                      class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 join-item"
                    >
                      <Search class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <!-- Category Filter -->
                <select
                  v-model="categoryFilter"
                  class="select select-bordered select-sm"
                >
                  <option value="">All Categories</option>
                  <option
                    v-for="category in categories"
                    :key="category"
                    :value="category"
                  >
                    {{ category }}
                  </option>
                </select>

                <!-- Status Filter -->
                <select
                  v-model="statusFilter"
                  class="select select-bordered select-sm"
                >
                  <option value="">All Status</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Inventory Items -->
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <h3 class="card-title text-primaryColor mb-4">
                <Package class="w-5 h-5" />
                {{ inventoryType === 'scm' ? 'SCM' : 'Production' }} Inventory
                Items
              </h3>

              <!-- Loading State -->
              <div
                v-if="loading"
                class="flex justify-center items-center py-12"
              >
                <div
                  class="loading loading-spinner loading-lg text-primaryColor"
                ></div>
              </div>

              <!-- Items Grid -->
              <div v-else-if="paginatedInventory.length > 0" class="space-y-4">
                <div class="overflow-x-auto">
                  <table class="table table-zebra w-full table-xs">
                    <thead>
                      <tr class="bg-base-200">
                        <th>Item</th>
                        <th>Category</th>
                        <th>Quantity</th>
                        <th v-if="inventoryType === 'production'">
                          Selling Price
                        </th>
                        <th>Expiry</th>
                        <th>Status</th>
                        <th>Last Updated</th>
                        <th v-if="canEdit">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in paginatedInventory" :key="item.id">
                        <td>
                          <div class="flex items-center gap-2">
                            <div
                              v-if="
                                inventoryType === 'production' && item.image_url
                              "
                              class="avatar"
                            >
                              <div class="w-6 rounded">
                                <img :src="item.image_url" alt="item" />
                              </div>
                            </div>
                            <div class="font-semibold">
                              {{ getItemDisplayName(item) }}
                            </div>
                          </div>

                          <div
                            v-if="item.expiry_date"
                            class="text-[11px] mt-1"
                            :class="{
                              'text-error':
                                getDaysUntilExpiry(item.expiry_date) <= 0,
                              'text-warning':
                                getDaysUntilExpiry(item.expiry_date) > 0 &&
                                getDaysUntilExpiry(item.expiry_date) <= 7,
                              'text-gray-500':
                                getDaysUntilExpiry(item.expiry_date) > 7,
                            }"
                          >
                            {{ getExpiryFriendlyText(item.expiry_date) }}
                          </div>
                        </td>
                        <td>
                          <div class="badge badge-xs">
                            {{ item.category }}
                          </div>
                        </td>
                        <td>
                          <div class="font-medium">
                            {{ item.quantity }} {{ item.unit }}
                          </div>
                          <div class="text-sm text-gray-500">
                            Min: {{ item.minimum_stock }}
                          </div>
                        </td>
                        <td v-if="inventoryType === 'production'">
                          <div class="font-medium" v-if="item.selling_price">
                            ₱{{
                              parseFloat(item.selling_price).toLocaleString()
                            }}
                          </div>
                          <div v-else class="text-gray-400">N/A</div>
                        </td>
                        <td>
                          <span v-if="item.expiry_date" class="text-xs">
                            {{ formatShortDate(item.expiry_date) }}
                          </span>
                          <span v-else class="text-gray-400 text-xs">N/A</span>
                        </td>
                        <td>
                          <div
                            :class="[
                              'badge badge-sm border-none font-medium',
                              getStockStatus(item).status === 'out'
                                ? 'bg-error/20 text-error'
                                : getStockStatus(item).status === 'low'
                                  ? 'bg-warning/20 text-warning'
                                  : 'bg-info/20 text-info',
                            ]"
                          >
                            {{ getStockStatus(item).text }}
                          </div>
                        </td>
                        <td>
                          <div class="text-sm">
                            {{
                              new Date(item.last_updated).toLocaleDateString()
                            }}
                          </div>
                        </td>
                        <td v-if="canEdit">
                          <div class="flex items-center space-x-1">
                            <button class="btn btn-ghost btn-xs">
                              <Eye class="w-4 h-4" />
                            </button>
                            <button class="btn btn-ghost btn-xs">
                              <Edit class="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Pagination -->
                <div class="flex justify-center mt-6">
                  <div class="join space-x-1">
                    <button
                      :disabled="currentPage === 1"
                      @click="currentPage--"
                      class="join-item btn font-thin !bg-gray-200 text-black/50 btn-sm border border-none hover:bg-gray-300"
                    >
                      «
                    </button>
                    <button
                      class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
                    >
                      Page {{ currentPage }} of {{ totalPages }}
                    </button>
                    <button
                      :disabled="currentPage === totalPages"
                      @click="currentPage++"
                      class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
                    >
                      »
                    </button>
                  </div>
                </div>
              </div>

              <!-- Empty State -->
              <div v-else class="text-center py-12">
                <Package class="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 class="text-lg font-medium text-gray-900 mb-2">
                  No items found
                </h3>
                <p class="text-gray-600">
                  Try adjusting your search or filters
                </p>
              </div>
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

          <!-- Expiring Items -->
          <div v-if="alertTab === 'expiring'" class="space-y-3">
            <div
              v-for="item in branchInventory.filter((i) => i.expiry_date)"
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
                      {{ item.item_name || item.name }}
                    </h3>
                    <div class="text-xs text-gray-600">
                      {{ item.category }}
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
                      {{ item.unit }}
                    </div>
                  </div>
                  <div>
                    <div class="text-gray-500">Batch</div>
                    <div class="font-medium">
                      {{ formatBatchNumber(item.batch_number) }}
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
                        item.id || `${item.id}-${item.expiry_date}`
                      ),
                    }"
                    @click="acknowledgeExpiring(item)"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            </div>

            <div
              v-if="branchInventory.filter((i) => i.expiry_date).length === 0"
              class="text-center py-8"
            >
              <CheckCircle class="w-12 h-12 mx-auto text-success mb-2" />
              <p class="text-gray-500">No items expiring soon!</p>
            </div>
          </div>

          <!-- Low Stock Items -->
          <div v-if="alertTab === 'lowstock'" class="space-y-3">
            <div
              v-for="item in branchInventory.filter(
                (i) => parseFloat(i.quantity) <= parseFloat(i.minimum_stock)
              )"
              :key="item.id"
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
                      {{ item.item_name || item.name }}
                    </h3>
                    <div class="text-xs text-gray-600">
                      {{ item.category }}
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
                      {{ parseFloat(item.quantity).toLocaleString() }}
                    </div>
                  </div>
                  <div>
                    <div class="text-gray-500">Min Level</div>
                    <div class="font-medium">
                      {{ parseFloat(item.minimum_stock).toLocaleString() }}
                    </div>
                  </div>
                  <div>
                    <div class="text-gray-500">Variance</div>
                    <div class="font-medium">
                      {{
                        (
                          parseFloat(item.quantity) -
                          parseFloat(item.minimum_stock)
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
                      'btn-disabled': acknowledgedLowStock.has(item.id),
                    }"
                    @click="acknowledgeLowStock(item)"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            </div>

            <div
              v-if="
                branchInventory.filter(
                  (i) => parseFloat(i.quantity) <= parseFloat(i.minimum_stock)
                ).length === 0
              "
              class="text-center py-8"
            >
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
              <FileText class="w-5 h-5 sm:w-6 sm:h-6" />
              Inventory Reports
            </h2>
          </div>

          <!-- Reports List -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              v-for="report in reports"
              :key="report.id"
              class="card bg-white shadow-lg"
            >
              <div class="card-body">
                <div class="flex items-start justify-between mb-4">
                  <div>
                    <h3 class="font-semibold text-gray-900">
                      {{ report.title }}
                    </h3>
                    <p class="text-sm text-gray-600">{{ report.date }}</p>
                  </div>
                  <div
                    class="badge badge-sm border-none font-medium"
                    :class="
                      report.status === 'completed'
                        ? 'bg-success/20 text-success'
                        : 'bg-warning/20 text-warning'
                    "
                  >
                    {{ report.status }}
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-500">{{ report.type }}</span>
                  <button
                    class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
                  >
                    <Eye class="w-4 h-4 mr-1" />
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pending Distributions Tab -->
        <div v-if="activeTab === 'pending_distributions'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4"
          >
            <h2
              class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl"
            >
              <Truck class="w-5 h-5 sm:w-6 sm:h-6" />
              Pending Distributions
            </h2>
            <button
              @click="loadPendingDistributions"
              :disabled="distributionLoading"
              class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
            >
              <RefreshCcw
                :class="[
                  'w-4 h-4 mr-2',
                  { 'animate-spin': distributionLoading },
                ]"
              />
              Refresh
            </button>
          </div>

          <!-- Loading State -->
          <div
            v-if="distributionLoading"
            class="flex justify-center items-center py-12"
          >
            <div
              class="loading loading-spinner loading-lg text-primaryColor"
            ></div>
          </div>

          <!-- Distributions List -->
          <div
            v-if="!distributionLoading && paginatedDistributions.length > 0"
            class="space-y-4"
          >
            <div
              v-for="distribution in paginatedDistributions"
              :key="distribution.id"
              class="card bg-white shadow-lg"
            >
              <div class="card-body">
                <div class="flex items-start justify-between mb-4">
                  <div>
                    <h3 class="font-semibold text-lg text-primaryColor">
                      {{ distribution.reference }}
                    </h3>
                    <p class="text-sm text-gray-600">
                      Prepared by: {{ distribution.prepared_by }}
                    </p>
                    <p class="text-sm text-gray-600">
                      Date:
                      {{
                        new Date(distribution.created_at).toLocaleDateString()
                      }}
                    </p>
                  </div>
                  <div class="text-right">
                    <div class="text-lg font-bold text-primaryColor">
                      ₱{{
                        parseFloat(distribution.total_amount).toLocaleString()
                      }}
                    </div>
                    <div
                      class="badge badge-sm border-none font-medium bg-warning/20 text-warning"
                    >
                      {{ distribution.status }}
                    </div>
                  </div>
                </div>

                <!-- Distribution Items -->
                <div class="overflow-x-auto mb-4">
                  <table class="table table-zebra w-full table-xs">
                    <thead>
                      <tr class="bg-base-200">
                        <th>Item</th>
                        <th>Source</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in distribution.items" :key="item.id">
                        <td>
                          <div class="font-medium">{{ item.name }}</div>
                          <div class="text-xs text-gray-500">
                            {{ item.unit }}
                          </div>
                        </td>
                        <td>
                          <div class="badge badge-xs">
                            {{ item.source.toUpperCase() }}
                          </div>
                        </td>
                        <td>{{ item.qty }}</td>
                        <td>₱{{ parseFloat(item.unit_price).toFixed(2) }}</td>
                        <td>₱{{ parseFloat(item.amount).toFixed(2) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Notes -->
                <div v-if="distribution.notes" class="mb-4">
                  <p class="text-sm text-gray-600">
                    <strong>Notes:</strong> {{ distribution.notes }}
                  </p>
                </div>

                <!-- Actions -->
                <div
                  class="flex flex-col sm:flex-row justify-end sm:space-x-2 space-y-2 sm:space-y-0 w-full sm:w-auto"
                >
                  <button
                    @click="
                      () => {
                        console.log(
                          'Item-level processing button clicked for distribution:',
                          distribution
                        );
                        openItemLevelModal(distribution);
                      }
                    "
                    class="btn btn-sm text-white bg-primaryColor font-thin border border-none hover:bg-primaryColor/80 w-full sm:w-auto"
                    :disabled="distributionActionLoading"
                  >
                    <Package class="w-4 h-4 mr-1" />
                    Select Items
                  </button>
                  <button
                    @click="
                      () => {
                        console.log(
                          'Accept button clicked for distribution:',
                          distribution
                        );
                        openAcceptanceModal(distribution);
                      }
                    "
                    class="btn btn-sm text-white bg-primaryColor font-thin border border-none hover:bg-primaryColor/80 w-full sm:w-auto"
                    :disabled="distributionActionLoading"
                  >
                    <CheckCircle class="w-4 h-4 mr-1" />
                    Accept All
                  </button>
                  <button
                    @click="viewDistributionReceipt(distribution)"
                    class="btn btn-sm text-black/50 bg-gray-200 font-thin border border-none hover:bg-gray-300 w-full sm:w-auto"
                  >
                    <Eye class="w-4 h-4 mr-1" />
                    View Receipt
                  </button>

                  <button
                    @click="
                      () => {
                        console.log(
                          'Reject button clicked for distribution:',
                          distribution
                        );
                        openRejectionModal(distribution);
                      }
                    "
                    class="btn btn-sm text-error bg-gray-200 font-thin border border-none hover:bg-gray-300 w-full sm:w-auto"
                    :disabled="distributionActionLoading"
                  >
                    <X class="w-4 h-4 mr-1" />
                    Reject All
                  </button>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div class="flex justify-center mt-6">
              <div class="join space-x-1">
                <button
                  :disabled="distributionCurrentPage === 1"
                  @click="distributionCurrentPage--"
                  class="join-item btn font-thin !bg-gray-200 text-black/50 btn-sm border border-none hover:bg-gray-300 shadow-none"
                >
                  «
                </button>
                <button
                  class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none hover:bg-gray-300"
                >
                  Page {{ distributionCurrentPage }} of
                  {{ totalDistributionPages }}
                </button>
                <button
                  :disabled="distributionCurrentPage === totalDistributionPages"
                  @click="distributionCurrentPage++"
                  class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none hover:bg-gray-300"
                >
                  »
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-12">
            <Truck class="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 class="text-lg font-medium text-gray-900 mb-2">
              No pending distributions
            </h3>
            <p class="text-gray-600">
              All distributions have been processed or none are available
            </p>
          </div>
        </div>

        <!-- Request Supply Tab -->
        <div v-if="activeTab === 'request_supply'" class="space-y-6">
          <BranchRequestSupply
            :inventory-type="inventoryType"
            @request-created="handleRequestCreated"
            @request-updated="handleRequestUpdated"
          />
        </div>
      </div>
    </div>

    <!-- Distribution Acceptance Modal -->
    <dialog
      id="distribution_acceptance_modal"
      class="modal"
      :class="{ 'modal-open': showAcceptanceModal }"
      @click="(e) => e.target === e.currentTarget && closeAcceptanceModal()"
    >
      <div class="modal-box w-11/12 max-w-4xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-xl text-primaryColor">
            <CheckCircle class="w-6 h-6 inline mr-2" />
            Accept Distribution
          </h3>
          <button
            @click="closeAcceptanceModal"
            class="btn btn-sm btn-circle btn-ghost"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div v-if="selectedDistribution" class="space-y-6">
          <!-- Distribution Header -->
          <div class="card bg-base-200">
            <div class="card-body p-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 class="font-semibold text-lg">
                    {{ selectedDistribution.reference }}
                  </h4>
                  <p class="text-sm text-gray-600">
                    Prepared by: {{ selectedDistribution.prepared_by }}
                  </p>
                  <p class="text-sm text-gray-600">
                    Date:
                    {{
                      new Date(
                        selectedDistribution.created_at
                      ).toLocaleDateString()
                    }}
                  </p>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold text-primaryColor">
                    ₱{{
                      parseFloat(
                        selectedDistribution.total_amount
                      ).toLocaleString()
                    }}
                  </div>
                  <div
                    class="badge badge-sm border-none font-medium bg-warning/20 text-warning"
                  >
                    {{ selectedDistribution.status }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Items to be Added to Inventory -->
          <div>
            <h4 class="font-semibold text-lg mb-4">
              Items to be Added to Inventory
            </h4>
            <div class="overflow-x-auto">
              <table class="table table-zebra w-full table-xs">
                <thead>
                  <tr class="bg-base-200">
                    <th>Item</th>
                    <th>Source</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Unit Price</th>
                    <th>Amount</th>
                    <th>Inventory Type</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in selectedDistribution.items" :key="item.id">
                    <td>
                      <div class="font-medium">{{ item.name }}</div>
                    </td>
                    <td>
                      <div class="badge badge-xs">
                        {{ item.source.toUpperCase() }}
                      </div>
                    </td>
                    <td>{{ item.qty }}</td>
                    <td>{{ item.unit }}</td>
                    <td>₱{{ parseFloat(item.unit_price).toFixed(2) }}</td>
                    <td>₱{{ parseFloat(item.amount).toFixed(2) }}</td>
                    <td>
                      <div
                        class="badge badge-xs"
                        :class="
                          item.source === 'scm'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-green-100 text-green-600'
                        "
                      >
                        {{
                          item.source === 'scm'
                            ? 'SCM Inventory'
                            : 'Production Inventory'
                        }}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="selectedDistribution.notes">
            <h4 class="font-semibold text-lg mb-2">Notes</h4>
            <div class="p-3 bg-gray-50 rounded-lg">
              <p class="text-sm text-gray-700">
                {{ selectedDistribution.notes }}
              </p>
            </div>
          </div>

          <!-- Confirmation Message -->
          <div class="alert alert-info">
            <AlertCircle class="w-4 h-4" />
            <span>
              By accepting this distribution, all items will be added to your
              branch inventory. This action cannot be undone.
            </span>
          </div>

          <!-- Modal Actions -->
          <div
            class="modal-action flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-3"
          >
            <button
              @click="closeAcceptanceModal"
              class="btn btn-ghost btn-sm font-thin shadow-none w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              @click="rejectDistribution(selectedDistribution)"
              class="btn btn-outline btn-sm text-error hover:bg-error/10 w-full sm:w-auto"
              :disabled="distributionActionLoading"
            >
              <X class="w-4 h-4 mr-1" />
              Reject
            </button>
            <button
              @click="acceptDistribution(selectedDistribution)"
              class="btn btn-primary btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80 shadow-none w-full sm:w-auto"
              :disabled="distributionActionLoading"
            >
              <CheckCircle class="w-4 h-4 mr-1" />
              <span v-if="distributionActionLoading">Processing...</span>
              <span v-else>Accept & Add to Inventory</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>

    <!-- Distribution Rejection Modal -->
    <dialog
      id="distribution_rejection_modal"
      class="modal"
      :class="{ 'modal-open': showRejectionModal }"
      @click="(e) => e.target === e.currentTarget && closeRejectionModal()"
    >
      <div class="modal-box w-11/12 max-w-2xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-xl text-error">
            <X class="w-6 h-6 inline mr-2" />
            Reject Distribution
          </h3>
          <button
            @click="closeRejectionModal"
            class="btn btn-sm btn-circle btn-ghost"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <div v-if="selectedDistribution" class="space-y-6">
          <!-- Distribution Header -->
          <div class="card bg-base-200">
            <div class="card-body p-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 class="font-semibold text-lg">
                    {{ selectedDistribution.reference }}
                  </h4>
                  <p class="text-sm text-gray-600">
                    Prepared by: {{ selectedDistribution.prepared_by }}
                  </p>
                  <p class="text-sm text-gray-600">
                    Date:
                    {{
                      new Date(
                        selectedDistribution.created_at
                      ).toLocaleDateString()
                    }}
                  </p>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold text-primaryColor">
                    ₱{{
                      parseFloat(
                        selectedDistribution.total_amount
                      ).toLocaleString()
                    }}
                  </div>
                  <div
                    class="badge badge-sm border-none font-medium bg-warning/20 text-warning"
                  >
                    {{ selectedDistribution.status }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Rejection Form -->
          <div class="space-y-4">
            <div>
              <label class="label">
                <span class="label-text font-medium"
                  >Reason for Rejection *</span
                >
              </label>
              <select
                v-model="rejectionForm.reason"
                class="select select-bordered w-full"
                required
              >
                <option value="">Select a reason...</option>
                <option value="Damaged Items">Damaged Items</option>
                <option value="Wrong Items">Wrong Items</option>
                <option value="Insufficient Quantity">
                  Insufficient Quantity
                </option>
                <option value="Quality Issues">Quality Issues</option>
                <option value="Expired Items">Expired Items</option>
                <option value="Not Requested">Not Requested</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label class="label">
                <span class="label-text font-medium">Additional Notes</span>
              </label>
              <textarea
                v-model="rejectionForm.notes"
                class="textarea textarea-bordered w-full h-24"
                placeholder="Please provide additional details about the rejection..."
              ></textarea>
            </div>
          </div>

          <!-- Warning Message -->
          <div class="alert alert-warning">
            <AlertTriangle class="w-4 h-4" />
            <span>
              By rejecting this distribution, the items will be returned to the
              main inventory. This action cannot be undone.
            </span>
          </div>

          <!-- Modal Actions -->
          <div
            class="modal-action flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-3"
          >
            <button
              @click="closeRejectionModal"
              class="btn btn-ghost btn-sm font-thin shadow-none w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              @click="rejectDistribution(selectedDistribution)"
              class="btn btn-error btn-sm text-white font-thin border-none hover:bg-error/80 shadow-none w-full sm:w-auto"
              :disabled="
                distributionActionLoading || !rejectionForm.reason.trim()
              "
            >
              <X class="w-4 h-4 mr-1" />
              <span v-if="distributionActionLoading">Rejecting...</span>
              <span v-else>Reject Distribution</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>

    <!-- Distribution Receipt Modal -->
    <BranchDistributionReceiptModal
      :receipt="selectedDistribution"
      :show="showReceiptModal"
      :onClose="closeReceiptModal"
    />

    <!-- Item-Level Accept/Reject Modal -->
    <ItemLevelAcceptRejectModal
      ref="itemLevelModal"
      :distribution="selectedDistribution"
      :loading="distributionActionLoading"
      @close="closeItemLevelModal"
      @process="handleItemLevelProcessing"
    />
  </div>
</template>

<style scoped>
  /* Following MainInventory.vue patterns */
</style>
