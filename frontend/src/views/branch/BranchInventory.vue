<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import {
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
    ChevronDown,
    ChevronUp,
    Settings,
    History,
    PhilippinePeso,
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { useBranchDistributionStore } from '../../stores/branchDistributionStore';
  import { useAuthStore } from '../../stores/authStore';
  import { useBranchInventoryStore } from '../../stores/branchInventoryStore';
  import BranchDistributionReceiptModal from '../../components/scm/BranchDistributionReceiptModal.vue';
  import BranchRequestSupply from '../../components/branch/BranchRequestSupply.vue';

  const branchContextStore = useBranchContextStore();
  const branchDistributionStore = useBranchDistributionStore();
  const authStore = useAuthStore();
  const branchInventoryStore = useBranchInventoryStore();

  // Local state following MainInventory pattern
  const activeTab = ref('overview');
  const inventoryType = ref('scm'); // 'scm' or 'production'
  const searchQuery = ref('');
  const categoryFilter = ref('');
  const statusFilter = ref('');
  const currentPage = ref(1);
  const itemsPerPage = ref(12);
  const loading = ref(false);

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

  const inventoryStats = computed(() => {
    const stats = branchInventoryStore.stats || {};
    return {
      totalItems: stats.totalItems || 0,
      lowStockItems: stats.lowStockItems || 0,
      outOfStockItems: stats.outOfStockItems || 0,
      totalValue: stats.totalValue || 0,
    };
  });

  const productionStats = computed(() => {
    const productionItems = productionInventory.value;
    return {
      totalItems: productionItems.length,
      lowStockItems: productionItems.filter(
        (item) => item.status === 'low_stock'
      ).length,
      outOfStockItems: productionItems.filter(
        (item) => item.status === 'out_of_stock'
      ).length,
      totalValue: productionItems.reduce(
        (sum, item) => sum + parseFloat(item.total_value || 0),
        0
      ),
    };
  });

  const lowStockItems = computed(
    () => branchInventoryStore.lowStockItems || []
  );
  const recentActivity = computed(
    () => branchInventoryStore.recentActivity || []
  );
  const alerts = ref([]);
  const reports = ref([]);

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
        (item) => item.quantity <= item.minimum_stock && item.quantity > 0
      ).length;
      const outOfStockItems = category.items.filter(
        (item) => item.quantity === 0
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

  // Distribution-related state
  const pendingDistributions = ref([]);
  const distributionLoading = ref(false);
  const selectedDistribution = ref(null);
  const showAcceptanceModal = ref(false);
  const showReceiptModal = ref(false);
  const distributionCurrentPage = ref(1);
  const distributionItemsPerPage = ref(10);

  // Computed
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const userRole = computed(() => branchContextStore.userRole);
  const canEdit = computed(() => branchContextStore.canAccessInventory);

  const currentInventoryData = computed(() => {
    return inventoryType.value === 'scm'
      ? branchInventory.value
      : productionInventory.value;
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
      items = items.filter((item) => item.quantity <= item.minimum_stock);
    } else if (statusFilter.value === 'out_of_stock') {
      items = items.filter((item) => item.quantity === 0);
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
    if (item.quantity === 0)
      return { status: 'out', class: 'badge-error', text: 'Out of Stock' };
    if (item.quantity <= item.minimum_stock)
      return { status: 'low', class: 'badge-warning', text: 'Low Stock' };
    return { status: 'good', class: 'badge-success', text: 'In Stock' };
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
      inventoryStats.value = {
        totalItems: branchInventory.value.length,
        lowStockItems: branchInventory.value.filter(
          (item) => item.quantity <= item.minimum_stock && item.quantity > 0
        ).length,
        outOfStockItems: branchInventory.value.filter(
          (item) => item.quantity === 0
        ).length,
        totalValue: branchInventory.value.reduce(
          (total, item) => total + parseFloat(item.total_value || 0),
          0
        ),
      };

      // Calculate Production stats
      productionStats.value = {
        totalItems: productionInventory.value.length,
        lowStockItems: productionInventory.value.filter(
          (item) => item.quantity <= item.minimum_stock && item.quantity > 0
        ).length,
        outOfStockItems: productionInventory.value.filter(
          (item) => item.quantity === 0
        ).length,
        totalValue: productionInventory.value.reduce(
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
          action: 'Stock Received',
          item: item.item_name,
          quantity: parseFloat(item.quantity),
          time: formatTimeAgo(new Date(item.created_at || new Date())),
          type: 'distribution',
          category: item.category,
          unit: item.unit,
        });

        // Add low stock warning if applicable
        if (item.quantity <= item.minimum_stock && item.quantity > 0) {
          realRecentActivity.push({
            id: `low_stock_${item.id}`,
            action: 'Low Stock Alert',
            item: item.item_name,
            quantity: parseFloat(item.quantity),
            time: 'Just now',
            type: 'alert',
            category: item.category,
            unit: item.unit,
          });
        }

        // Add out of stock warning if applicable
        if (item.quantity === 0) {
          realRecentActivity.push({
            id: `out_stock_${item.id}`,
            action: 'Out of Stock',
            item: item.item_name,
            quantity: 0,
            time: 'Just now',
            type: 'alert',
            category: item.category,
            unit: item.unit,
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
        (item) => item.quantity <= item.minimum_stock && item.quantity > 0
      );
      console.log('Low stock items for alerts:', lowStockItems);
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
        (item) => item.quantity === 0
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
      lowStockItems.value = [
        ...branchInventory.value,
        ...productionInventory.value,
      ].filter((item) => item.quantity <= item.minimum_stock);

      // Generate real reports from branch inventory data
      const realReports = [];

      // Current inventory summary report
      const totalItems = branchInventory.value.length;
      const totalValue = branchInventory.value.reduce(
        (sum, item) => sum + parseFloat(item.total_value || 0),
        0
      );
      const lowStockCount = branchInventory.value.filter(
        (item) => item.quantity <= item.minimum_stock && item.quantity > 0
      ).length;
      const outOfStockCount = branchInventory.value.filter(
        (item) => item.quantity === 0
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
              (item) => item.quantity <= item.minimum_stock && item.quantity > 0
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
            items: branchInventory.value.filter((item) => item.quantity === 0),
            count: outOfStockCount,
          },
        });
      }

      // Inventory value analysis report
      const scmItems = branchInventory.value.filter(
        (item) => item.item_type === 'scm'
      );
      const productionItems = branchInventory.value.filter(
        (item) => item.item_type === 'production'
      );
      const scmValue = scmItems.reduce(
        (sum, item) => sum + parseFloat(item.total_value || 0),
        0
      );
      const productionValue = productionItems.reduce(
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
    selectedDistribution.value = distribution;
    showAcceptanceModal.value = true;
  };

  const closeAcceptanceModal = () => {
    selectedDistribution.value = null;
    showAcceptanceModal.value = false;
  };

  const acceptDistribution = async (distribution) => {
    try {
      // Update distribution status to completed
      await branchDistributionStore.updateDistributionStatus(
        distribution.id,
        'completed'
      );

      // Add items to branch inventory
      for (const item of distribution.items) {
        if (item.source === 'scm') {
          // Add to SCM inventory
          await addToBranchInventory(item, 'scm');
        } else if (item.source === 'production') {
          // Add to production inventory
          await addToBranchInventory(item, 'production');
        }
      }

      // Refresh data
      await loadPendingDistributions();
      await loadBranchInventory();

      closeAcceptanceModal();

      // Show success message
      console.log('Distribution accepted successfully');
    } catch (error) {
      console.error('Error accepting distribution:', error);
    }
  };

  const addToBranchInventory = async (item, type) => {
    // This would integrate with your branch inventory API
    // For now, we'll add to local state
    const inventoryItem = {
      id: Date.now() + Math.random(),
      name: item.name,
      category: item.category || 'General',
      quantity: parseFloat(item.qty) || 0,
      unit: item.unit,
      minimum_stock: 10, // Default minimum
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

  const rejectDistribution = async (distribution) => {
    try {
      // You might want to add a rejection reason or just mark as rejected
      console.log('Distribution rejected:', distribution);
      closeAcceptanceModal();
    } catch (error) {
      console.error('Error rejecting distribution:', error);
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
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
            <div class="card bg-white shadow-lg">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Total Items</p>
                    <p class="text-2xl font-bold text-primaryColor">
                      {{
                        inventoryStats.totalItems + productionStats.totalItems
                      }}
                    </p>
                  </div>
                  <div class="p-3 bg-blue-100 rounded-full">
                    <Package class="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>

            <div class="card bg-white shadow-lg">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Low Stock</p>
                    <p class="text-2xl font-bold text-orange-600">
                      {{
                        inventoryStats.lowStockItems +
                        productionStats.lowStockItems
                      }}
                    </p>
                  </div>
                  <div class="p-3 bg-orange-100 rounded-full">
                    <AlertTriangle class="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            <div class="card bg-white shadow-lg">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Out of Stock</p>
                    <p class="text-2xl font-bold text-red-600">
                      {{
                        inventoryStats.outOfStockItems +
                        productionStats.outOfStockItems
                      }}
                    </p>
                  </div>
                  <div class="p-3 bg-red-100 rounded-full">
                    <TrendingDown class="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            <div class="card bg-white shadow-lg">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600">Total Value</p>
                    <p class="text-2xl font-bold text-green-600">
                      ₱{{
                        (
                          inventoryStats.totalValue + productionStats.totalValue
                        ).toLocaleString()
                      }}
                    </p>
                  </div>
                  <div class="p-3 bg-green-100 rounded-full">
                    <BarChart3 class="w-6 h-6 text-green-600" />
                  </div>
                </div>
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
                        'bg-green-100': activity.quantity > 0,
                        'bg-red-100': activity.quantity < 0,
                        'bg-blue-100': activity.quantity === 0,
                      }"
                    >
                      <component
                        :is="
                          activity.quantity > 0
                            ? 'Plus'
                            : activity.quantity < 0
                              ? 'Minus'
                              : 'Package'
                        "
                        class="w-5 h-5"
                        :class="{
                          'text-green-600': activity.quantity > 0,
                          'text-red-600': activity.quantity < 0,
                          'text-blue-600': activity.quantity === 0,
                        }"
                      />
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <p class="text-sm font-medium text-gray-900 truncate">
                        {{ activity.action }}
                      </p>
                      <span
                        class="text-sm font-semibold"
                        :class="{
                          'text-green-600': activity.quantity > 0,
                          'text-red-600': activity.quantity < 0,
                          'text-gray-600': activity.quantity === 0,
                        }"
                      >
                        {{ activity.quantity > 0 ? '+' : ''
                        }}{{ activity.quantity
                        }}{{ activity.unit ? ' ' + activity.unit : '' }}
                      </span>
                    </div>
                    <p class="text-sm text-gray-600 truncate">
                      {{ activity.item }}
                      <span
                        v-if="activity.category"
                        class="text-xs text-gray-500 ml-2"
                      >
                        ({{ activity.category }})
                      </span>
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                      {{ activity.time }}
                    </p>
                  </div>
                </div>
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
                        <th>Status</th>
                        <th>Last Updated</th>
                        <th v-if="canEdit">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in paginatedInventory" :key="item.id">
                        <td>
                          <div class="font-semibold">{{ item.name }}</div>
                          <div class="text-sm text-gray-500">
                            ₱{{ item.cost_price }} per {{ item.unit }}
                            <span v-if="item.selling_price" class="ml-2">
                              (Sell: ₱{{ item.selling_price }})
                            </span>
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
              <Bell class="w-5 h-5 sm:w-6 sm:h-6" />
              Inventory Alerts
            </h2>
          </div>

          <!-- Alerts List -->
          <div class="space-y-4">
            <div
              v-for="alert in alerts"
              :key="alert.id"
              class="card bg-white shadow-lg"
            >
              <div class="card-body">
                <div class="flex items-start justify-between">
                  <div class="flex items-start space-x-3">
                    <div
                      class="p-2 rounded-full"
                      :class="
                        alert.severity === 'error'
                          ? 'bg-red-100'
                          : 'bg-orange-100'
                      "
                    >
                      <AlertTriangle
                        class="w-5 h-5"
                        :class="
                          alert.severity === 'error'
                            ? 'text-red-600'
                            : 'text-orange-600'
                        "
                      />
                    </div>
                    <div>
                      <h3 class="font-semibold text-gray-900">
                        {{ alert.message }}
                      </h3>
                      <p class="text-sm text-gray-600 mt-1">
                        Item: {{ alert.item }} • {{ alert.time }}
                      </p>
                    </div>
                  </div>
                  <div
                    class="badge badge-sm border-none font-medium"
                    :class="
                      alert.severity === 'error'
                        ? 'bg-error/20 text-error'
                        : 'bg-warning/20 text-warning'
                    "
                  >
                    {{ alert.severity === 'error' ? 'Critical' : 'Warning' }}
                  </div>
                </div>
              </div>
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
                <div class="flex justify-end space-x-2">
                  <button
                    @click="viewDistributionReceipt(distribution)"
                    class="btn btn-sm text-black/50 bg-gray-200 font-thin border border-none hover:bg-gray-300"
                  >
                    <Eye class="w-4 h-4 mr-1" />
                    View Receipt
                  </button>
                  <button
                    @click="openAcceptanceModal(distribution)"
                    class="btn btn-sm text-white bg-primaryColor font-thin border border-none hover:bg-primaryColor/80"
                  >
                    <CheckCircle class="w-4 h-4 mr-1" />
                    Accept Distribution
                  </button>
                  <button
                    @click="rejectDistribution(distribution)"
                    class="btn btn-sm text-error bg-gray-200 font-thin border border-none hover:bg-gray-300"
                  >
                    <X class="w-4 h-4 mr-1" />
                    Reject
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
      v-if="showAcceptanceModal"
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
          <div class="modal-action">
            <button
              @click="closeAcceptanceModal"
              class="btn btn-ghost btn-sm font-thin shadow-none"
            >
              Cancel
            </button>
            <button
              @click="rejectDistribution(selectedDistribution)"
              class="btn btn-outline btn-sm text-error hover:bg-error/10"
            >
              <X class="w-4 h-4 mr-1" />
              Reject
            </button>
            <button
              @click="acceptDistribution(selectedDistribution)"
              class="btn btn-primary btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80 shadow-none"
            >
              <CheckCircle class="w-4 h-4 mr-1" />
              Accept & Add to Inventory
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
  </div>
</template>

<style scoped>
  /* Following MainInventory.vue patterns */
</style>
