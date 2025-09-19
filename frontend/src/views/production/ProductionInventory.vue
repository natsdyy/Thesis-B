<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import {
    Package,
    Plus,
    Search,
    Filter,
    RefreshCcw,
    Eye,
    Edit,
    Trash2,
    AlertTriangle,
    CheckCircle,
    TrendingUp,
    BarChart3,
    PhilippinePeso,
    Activity,
    AlertCircle,
    Target,
    Clock,
    Star,
    X,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Truck,
    History,
    Handshake,
    Minus,
    Settings,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import MenuItemApprovalChart from '../../components/production/MenuItemApprovalChart.vue';
  import SampleProductionTrendsChart from '../../components/production/SampleProductionTrendsChart.vue';
  import ProductionMetricsChart from '../../components/production/ProductionMetricsChart.vue';
  import InventoryTrendsChart from '../../components/production/InventoryTrendsChart.vue';
  import ProductionTransactionModal from '../../components/production/ProductionTransactionModal.vue';
  import { apiConfig, formatImageUrl } from '../../config/api.js';

  const productionStore = useProductionStore();
  const authStore = useAuthStore();

  // Reactive state
  const activeTab = ref('inventory');
  const searchQuery = ref('');
  const categoryFilter = ref('');
  const statusFilter = ref('');
  const showUpdateModal = ref(false);
  const showDetailsModal = ref(false);
  const showDistributionModal = ref(false);
  const selectedItem = ref(null);
  const currentPage = ref(1);
  const itemsPerPage = ref(6);
  const expandedItems = ref(new Set());

  // Recent activity and transaction modal state
  const recentActivity = ref([]);
  const showTransactionModal = ref(false);

  // Form data for stock/pricing updates
  const updateForm = ref({
    available_quantity: 0,
    selling_price: 0,
    notes: '',
    reason: '',
    adjustment_type: '',
    requires_approval: false,
    previous_quantity: 0,
    quantity_change: 0,
    adjustment_category: '',
    reference_number: '',
    physical_count_date: null,
    counted_by: '',
    verified_by: '',
  });

  // Form data for distribution
  const distributionForm = ref({
    quantity: 0,
    branch_id: '',
    transfer_price: 0,
    notes: '',
  });

  // Branch data
  const branches = ref([]);

  // Distribution data
  const distributions = ref([]);
  const distributionLoading = ref(false);

  // Distribution pagination and filtering
  const distributionCurrentPage = ref(1);
  const distributionItemsPerPage = ref(10);
  const distributionSearchQuery = ref('');
  const distributionBranchFilter = ref('');
  const distributionDateFrom = ref('');
  const distributionDateTo = ref('');

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const productionInventory = computed(
    () => productionStore.productionInventory
  );
  const productionInventoryStats = computed(
    () => productionStore.productionInventoryStats
  );

  // Calculate real-time statistics from current inventory data
  const realTimeStats = computed(() => {
    const items = productionInventory.value || [];

    const totalItems = items.length;
    const totalQuantity = items.reduce(
      (sum, item) => sum + (item.available_quantity || 0),
      0
    );
    const lowStockItems = items.filter(
      (item) => (item.available_quantity || 0) <= (item.reorder_point || 0)
    ).length;

    // Calculate average margin only for items with actual production (non-zero cost)
    const itemsWithProduction = items.filter(
      (item) => item.unit_cost && item.unit_cost > 0
    );
    const averageMargin =
      itemsWithProduction.length > 0
        ? itemsWithProduction.reduce((sum, item) => {
            const margin =
              ((item.selling_price - item.unit_cost) / item.unit_cost) * 100;
            return sum + margin;
          }, 0) / itemsWithProduction.length
        : 0;

    const totalDistributed = items.reduce(
      (sum, item) => sum + (item.total_distributed || 0),
      0
    );

    return {
      // Real-time calculated statistics (always accurate)
      total_items: totalItems,
      total_quantity: totalQuantity,
      low_stock_items: lowStockItems,
      average_margin: averageMargin,
      total_distributed_all_time: totalDistributed,

      // Keep only non-conflicting stats from backend
      total_distributions:
        productionStore.productionInventoryStats?.total_distributions || 0,
      branches_served:
        productionStore.productionInventoryStats?.branches_served || 0,
      items_distributed:
        productionStore.productionInventoryStats?.items_distributed || 0,
      recent_distributions:
        productionStore.productionInventoryStats?.recent_distributions || 0,
      recent_quantity_distributed:
        productionStore.productionInventoryStats?.recent_quantity_distributed ||
        0,
      total_quantity_distributed:
        productionStore.productionInventoryStats?.total_quantity_distributed ||
        0,
    };
  });

  // Filtered distributions
  const filteredDistributions = computed(() => {
    let filtered = [...distributions.value];

    if (distributionSearchQuery.value) {
      const query = distributionSearchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (dist) =>
          dist.menu_item_name?.toLowerCase().includes(query) ||
          dist.item_code?.toLowerCase().includes(query) ||
          dist.branch_name?.toLowerCase().includes(query)
      );
    }

    if (distributionBranchFilter.value) {
      filtered = filtered.filter(
        (dist) => dist.branch_id === distributionBranchFilter.value
      );
    }

    if (distributionDateFrom.value) {
      filtered = filtered.filter(
        (dist) =>
          new Date(dist.distribution_date) >=
          new Date(distributionDateFrom.value)
      );
    }

    if (distributionDateTo.value) {
      filtered = filtered.filter(
        (dist) =>
          new Date(dist.distribution_date) <= new Date(distributionDateTo.value)
      );
    }

    return filtered;
  });

  // Distribution pagination
  const totalDistributionPages = computed(() => {
    return Math.ceil(
      filteredDistributions.value.length / distributionItemsPerPage.value
    );
  });

  const paginatedDistributions = computed(() => {
    const start =
      (distributionCurrentPage.value - 1) * distributionItemsPerPage.value;
    const end = start + distributionItemsPerPage.value;
    return filteredDistributions.value.slice(start, end);
  });

  // Computed properties
  const distributionTotal = computed(() => {
    return (
      (distributionForm.value.quantity || 0) *
      (distributionForm.value.transfer_price || 0)
    );
  });

  // Stock update validation and calculations
  const stockUpdateValidation = computed(() => {
    const form = updateForm.value;
    const previousQty = form.previous_quantity || 0;
    const newQty = form.available_quantity || 0;
    const change = newQty - previousQty;
    const changePercent =
      previousQty > 0 ? Math.abs((change / previousQty) * 100) : 0;

    // Calculate cost impact based on adjustment type and quantity change
    const unitCost = selectedItem.value?.unit_cost || 0;
    const sellingPrice = selectedItem.value?.selling_price || 0;

    let costImpact = 0;
    let costImpactType = 'neutral';
    let costDescription = '';

    if (change !== 0 && unitCost > 0) {
      switch (form.adjustment_type) {
        case 'received_goods':
        case 'production_completed':
        case 'transfer_in':
          // Positive adjustments - inventory value increases
          costImpact = change * unitCost;
          costImpactType = 'positive';
          costDescription = 'Inventory value increased';
          break;

        case 'damage':
        case 'theft':
        case 'expired':
        case 'waste':
        case 'transfer_out':
          // Negative adjustments - inventory value decreases (loss)
          costImpact = Math.abs(change) * unitCost;
          costImpactType = 'negative';
          costDescription = 'Inventory value lost';
          break;

        case 'physical_count':
        case 'correction':
          // Neutral adjustments - just correcting records
          costImpact = Math.abs(change) * unitCost;
          costImpactType = change > 0 ? 'positive' : 'negative';
          costDescription =
            change > 0
              ? 'Inventory value corrected upward'
              : 'Inventory value corrected downward';
          break;

        default:
          // Default calculation
          costImpact = Math.abs(change) * unitCost;
          costImpactType = change > 0 ? 'positive' : 'negative';
          costDescription =
            change > 0
              ? 'Inventory value increased'
              : 'Inventory value decreased';
      }
    }

    // Calculate potential revenue impact for decreases
    const revenueImpact = change < 0 ? Math.abs(change) * sellingPrice : 0;

    // Determine if cost impact is significant (more than $100 or 10% of item value)
    const totalItemValue = previousQty * unitCost;
    const costImpactPercent =
      totalItemValue > 0 ? (costImpact / totalItemValue) * 100 : 0;
    const isSignificantCostImpact = costImpact > 100 || costImpactPercent > 10;

    return {
      quantityChange: change,
      changePercent: changePercent,
      isSignificantChange: changePercent > 20 || Math.abs(change) > 50,
      requiresApproval:
        changePercent > 20 ||
        Math.abs(change) > 50 ||
        form.adjustment_type === 'damage' ||
        form.adjustment_type === 'theft' ||
        isSignificantCostImpact,
      isValid: form.reason && form.adjustment_type && form.adjustment_category,
      changeType:
        change > 0 ? 'increase' : change < 0 ? 'decrease' : 'no_change',
      // Cost calculations
      costImpact: costImpact,
      costImpactType: costImpactType,
      costDescription: costDescription,
      revenueImpact: revenueImpact,
      costImpactPercent: costImpactPercent,
      isSignificantCostImpact: isSignificantCostImpact,
      unitCost: unitCost,
      totalItemValue: totalItemValue,
    };
  });

  const filteredInventory = computed(() => {
    let filtered = formattedInventory.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.item_name.toLowerCase().includes(query) ||
          item.item_code.toLowerCase().includes(query) ||
          item.category?.toLowerCase().includes(query) ||
          item.recipe_name?.toLowerCase().includes(query)
      );
    }

    if (categoryFilter.value) {
      filtered = filtered.filter(
        (item) => item.category === categoryFilter.value
      );
    }

    if (statusFilter.value) {
      if (statusFilter.value === 'low_stock') {
        filtered = filtered.filter(
          (item) => item.available_quantity <= item.reorder_point
        );
      } else if (statusFilter.value === 'featured') {
        filtered = filtered.filter((item) => item.is_featured);
      }
    }

    return filtered.sort((a, b) => a.item_name.localeCompare(b.item_name));
  });

  const paginatedInventory = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return filteredInventory.value.slice(start, start + itemsPerPage.value);
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredInventory.value.length / itemsPerPage.value);
  });

  const totalItems = computed(() => {
    return filteredInventory.value.length;
  });

  // Get unique categories for filter
  const availableCategories = computed(() => {
    const categories = new Set();
    productionInventory.value.forEach((item) => {
      if (item.category) categories.add(item.category);
    });
    return Array.from(categories).sort();
  });

  // Production Recommendations - High Demand Items
  const highDemandItems = computed(() => {
    const items = productionInventory.value || [];

    // Calculate demand metrics for each item
    const itemsWithDemand = items.map((item) => {
      const totalDistributed = item.total_distributed || 0;
      const availableQuantity = item.available_quantity || 0;
      const reorderPoint = item.reorder_point || 0;

      // Calculate demand rate (distributions per available stock)
      const demandRate =
        availableQuantity > 0 ? totalDistributed / availableQuantity : 0;

      // Calculate stock turnover (how quickly items are distributed)
      const stockTurnover =
        availableQuantity > 0
          ? totalDistributed / Math.max(availableQuantity, 1)
          : 0;

      // Determine if item should be considered "featured" based on distribution activity
      // Auto-feature items with high distribution volume (100+ units distributed)
      const shouldBeFeatured = totalDistributed >= 100;

      return {
        ...item,
        demandRate,
        stockTurnover,
        totalDistributed,
        availableQuantity,
        reorderPoint,
        shouldBeFeatured,
        // Show effective featured status (manual OR auto-featured)
        effectiveFeatured: item.is_featured || shouldBeFeatured,
      };
    });

    // Sort by demand rate and total distributed, return top 3
    return itemsWithDemand
      .filter((item) => item.totalDistributed > 0) // Only items with actual distribution history
      .sort((a, b) => {
        // Primary sort by total distributed (volume)
        if (b.totalDistributed !== a.totalDistributed) {
          return b.totalDistributed - a.totalDistributed;
        }
        // Secondary sort by demand rate
        return b.demandRate - a.demandRate;
      })
      .slice(0, 3);
  });

  // Production Recommendations - Low Stock Alerts
  const lowStockAlerts = computed(() => {
    const items = productionInventory.value || [];

    return items
      .filter((item) => {
        const availableQuantity = item.available_quantity || 0;
        const reorderPoint = item.reorder_point || 0;
        return availableQuantity <= reorderPoint && reorderPoint > 0;
      })
      .map((item) => ({
        ...item,
        availableQuantity: item.available_quantity || 0,
        reorderPoint: item.reorder_point || 0,
      }))
      .sort((a, b) => {
        // Sort by how critical the stock level is
        const aStockRatio = a.availableQuantity / a.reorderPoint;
        const bStockRatio = b.availableQuantity / b.reorderPoint;
        return aStockRatio - bStockRatio;
      })
      .slice(0, 5); // Show top 5 most critical low stock items
  });

  // Production Recommendations - Production Suggestions
  const productionSuggestions = computed(() => {
    const items = productionInventory.value || [];

    return items
      .map((item) => {
        const availableQuantity = item.available_quantity || 0;
        const reorderPoint = item.reorder_point || 0;
        const totalDistributed = item.total_distributed || 0;
        const batchSize = item.batch_size || 1;

        // Calculate suggested production quantity
        let suggestedQuantity = 0;
        let suggestionReason = '';

        if (availableQuantity <= reorderPoint && reorderPoint > 0) {
          // Critical: below reorder point
          suggestedQuantity = Math.max(reorderPoint * 2, batchSize);
          suggestionReason = 'Below reorder point';
        } else if (availableQuantity <= reorderPoint * 1.5) {
          // Warning: approaching reorder point
          suggestedQuantity = Math.max(reorderPoint, batchSize);
          suggestionReason = 'Approaching reorder point';
        } else if (
          totalDistributed > 0 &&
          availableQuantity < totalDistributed * 0.1
        ) {
          // Low stock relative to historical demand
          suggestedQuantity = Math.max(
            Math.ceil(totalDistributed * 0.2),
            batchSize
          );
          suggestionReason = 'Low stock vs. historical demand';
        }

        return {
          ...item,
          suggestedQuantity,
          suggestionReason,
          priority: availableQuantity <= reorderPoint ? 'High' : 'Medium',
        };
      })
      .filter((item) => item.suggestedQuantity > 0)
      .sort((a, b) => {
        // Sort by priority (High first) then by suggested quantity
        if (a.priority !== b.priority) {
          return a.priority === 'High' ? -1 : 1;
        }
        return b.suggestedQuantity - a.suggestedQuantity;
      })
      .slice(0, 5); // Show top 5 suggestions
  });

  // Branch Performance Analytics
  const branchPerformance = computed(() => {
    const distributionData = distributions.value || [];

    if (distributionData.length === 0) {
      return {
        topBranch: null,
        branchStats: [],
        averageDistributionSize: 0,
        totalDistributions: 0,
      };
    }

    // Group distributions by branch
    const branchGroups = {};
    distributionData.forEach((dist) => {
      const branchName = dist.branch_name || 'Unknown Branch';
      if (!branchGroups[branchName]) {
        branchGroups[branchName] = {
          branch_name: branchName,
          total_quantity: 0,
          distribution_count: 0,
          total_value: 0,
          items_distributed: new Set(),
        };
      }

      branchGroups[branchName].total_quantity += parseFloat(
        dist.quantity_distributed || 0
      );
      branchGroups[branchName].distribution_count += 1;
      branchGroups[branchName].total_value +=
        parseFloat(dist.transfer_price || 0) *
        parseFloat(dist.quantity_distributed || 0);
      branchGroups[branchName].items_distributed.add(dist.menu_item_name);
    });

    // Convert to array and calculate metrics
    const branchStats = Object.values(branchGroups).map((branch) => ({
      ...branch,
      items_distributed: branch.items_distributed.size,
      average_distribution_size:
        branch.total_quantity / branch.distribution_count,
      average_value_per_distribution:
        branch.total_value / branch.distribution_count,
    }));

    // Sort by total quantity distributed
    branchStats.sort((a, b) => b.total_quantity - a.total_quantity);

    const topBranch = branchStats.length > 0 ? branchStats[0] : null;
    const totalDistributions = distributionData.length;

    // Calculate average distribution size with proper error handling
    const totalQuantity = distributionData.reduce(
      (sum, dist) => sum + parseFloat(dist.quantity_distributed || 0),
      0
    );
    const averageDistributionSize =
      totalDistributions > 0 ? totalQuantity / totalDistributions : 0;

    return {
      topBranch,
      branchStats: branchStats.slice(0, 3), // Top 3 branches
      averageDistributionSize: Math.round(averageDistributionSize) || 0,
      totalDistributions,
    };
  });

  // Format image URLs to full URLs
  const formattedInventory = computed(() => {
    return productionInventory.value.map((item) => {
      if (item.image_url) {
        return {
          ...item,
          image_url: formatImageUrl(item.image_url),
        };
      }
      return item;
    });
  });

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  // Recent activity functions
  const fetchRecentActivity = async () => {
    try {
      const activity = await productionStore.fetchRecentActivity(5);
      recentActivity.value = activity;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      // Fallback to empty array if API fails
      recentActivity.value = [];
    }
  };

  const openTransactionModal = () => {
    showTransactionModal.value = true;
  };

  const closeTransactionModal = () => {
    showTransactionModal.value = false;
  };

  const getActivityTypeInfo = (actionType) => {
    const typeInfo = {
      INVENTORY_UPDATED: {
        icon: RefreshCcw,
        color: 'text-info',
        label: 'Stock Updated',
        bgColor: 'bg-info/10',
        badgeColor: 'bg-info/20 text-info',
        description: 'Inventory quantity was updated',
      },
      CREATED: {
        icon: Plus,
        color: 'text-success',
        label: 'Created',
        bgColor: 'bg-success/10',
        badgeColor: 'bg-success/20 text-success',
        description: 'New item was created',
      },
      UPDATED: {
        icon: Edit,
        color: 'text-warning',
        label: 'Updated',
        bgColor: 'bg-warning/10',
        badgeColor: 'bg-warning/20 text-warning',
        description: 'Item details were updated',
      },
      'In Progress': {
        icon: Activity,
        color: 'text-warning',
        label: 'Production Started',
        bgColor: 'bg-warning/10',
        badgeColor: 'bg-warning/20 text-warning',
        description: 'Production batch started',
      },
      Completed: {
        icon: CheckCircle,
        color: 'text-success',
        label: 'Production Completed',
        bgColor: 'bg-success/10',
        badgeColor: 'bg-success/20 text-success',
        description: 'Production batch completed',
      },
      'Quality Check': {
        icon: AlertCircle,
        color: 'text-info',
        label: 'Quality Check',
        bgColor: 'bg-info/10',
        badgeColor: 'bg-info/20 text-info',
        description: 'Production batch in quality check',
      },
      Failed: {
        icon: AlertTriangle,
        color: 'text-error',
        label: 'Production Failed',
        bgColor: 'bg-error/10',
        badgeColor: 'bg-error/20 text-error',
        description: 'Production batch failed',
      },
    };
    return (
      typeInfo[actionType] || {
        icon: Activity,
        color: 'text-neutral',
        label: actionType,
        bgColor: 'bg-neutral/10',
        badgeColor: 'bg-gray-100 text-gray-600',
        description: 'Activity information',
      }
    );
  };

  const formatActivityDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Show more specific time information
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    // For older dates, show the actual date and time
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityDetails = (activity) => {
    if (!activity.action_details) {
      return {};
    }

    try {
      const parsed = JSON.parse(activity.action_details);

      // Handle nested structure: {"basic_notes": {...}, "adjustment_details": {...}}
      if (parsed.basic_notes) {
        return parsed.basic_notes;
      }

      return parsed;
    } catch (error) {
      console.error('Error parsing activity details:', error);
      return {};
    }
  };

  const getFormattedReason = (activity) => {
    const details = getActivityDetails(activity);

    // If there's a user note, show that first
    if (details.notes && details.notes.trim()) {
      return details.notes;
    }

    // Format based on adjustment type and reason
    const adjustmentType = details.adjustment_type;
    const reason = details.reason;

    // Create user-friendly descriptions
    const reasonMap = {
      physical_inventory: 'Physical inventory count',
      transfer_in: 'Stock transfer received',
      transfer_out: 'Stock transfer sent',
      damage: 'Damaged goods adjustment',
      theft: 'Theft/loss adjustment',
      production: 'Production completion',
      waste: 'Production waste',
      other: 'Manual adjustment',
    };

    const typeMap = {
      physical_count: 'Physical count',
      transfer_in: 'Transfer received',
      transfer_out: 'Transfer sent',
      damage: 'Damage adjustment',
      theft: 'Loss adjustment',
      production: 'Production',
      waste: 'Waste',
      other: 'Manual adjustment',
    };

    // Return the most descriptive reason
    if (reason && reasonMap[reason]) {
      return reasonMap[reason];
    }

    if (adjustmentType && typeMap[adjustmentType]) {
      return typeMap[adjustmentType];
    }

    // For simple data structure, provide more descriptive reason based on quantity change
    const quantityChange = details.quantity_change;
    if (quantityChange > 0) {
      return 'Stock increase';
    } else if (quantityChange < 0) {
      return 'Stock decrease';
    }

    // Fallback to generic description
    return 'Stock adjustment';
  };

  const getFormattedAdjustmentType = (adjustmentType) => {
    const typeMap = {
      physical_count: 'Physical Count',
      transfer_in: 'Transfer In',
      transfer_out: 'Transfer Out',
      damage: 'Damage',
      theft: 'Loss/Theft',
      production: 'Production',
      waste: 'Waste',
      other: 'Manual Adjustment',
    };

    return typeMap[adjustmentType] || adjustmentType;
  };

  const getChangePercentage = (details) => {
    if (!details.old_quantity || details.old_quantity === 0) return 0;

    const change = details.quantity_change || 0;
    const percentage = (Math.abs(change) / details.old_quantity) * 100;
    return percentage.toFixed(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStockLevelBadgeClass = (item) => {
    if (!item) return 'badge-sm border-none font-medium bg-gray/20 text-gray';
    const current = item.available_quantity || 0;
    const reorderPoint = item.reorder_point || 0;

    if (current <= reorderPoint) {
      return 'badge-sm border-none font-medium bg-error/20 text-error';
    } else if (current <= reorderPoint * 1.5) {
      return 'badge-sm border-none font-medium bg-warning/20 text-warning';
    }
    return 'badge-sm border-none font-medium bg-success/20 text-success';
  };

  const getStockLevelText = (item) => {
    if (!item) return 'Unknown';
    const current = item.available_quantity || 0;
    const reorderPoint = item.reorder_point || 0;

    if (current <= reorderPoint) return 'Low Stock';
    if (current <= reorderPoint * 1.5) return 'Reorder Soon';
    return 'Good Stock';
  };

  const getProfitMarginColor = (margin) => {
    if (margin >= 50) return 'text-success font-bold';
    if (margin >= 30) return 'text-warning font-semibold';
    return 'text-error font-semibold';
  };

  const calculateProfitMargin = (sellingPrice, costPrice) => {
    // Handle edge cases for more realistic margin display
    if (!costPrice || costPrice === 0) return null; // No production cost recorded yet

    // If cost is extremely low (less than 1 peso), it's likely incomplete data
    if (costPrice < 1) return null;

    const margin = ((sellingPrice - costPrice) / costPrice) * 100;

    // Cap extremely high margins at 1000% to avoid misleading "Infinity" values
    // Margins above 1000% usually indicate data quality issues
    if (margin > 1000) return null;

    return Math.round(margin);
  };

  const getProductionCapacity = (item) => {
    if (!item) {
      return {
        max_batches: 0,
        limiting_factor: 'No item data',
        can_produce: false,
      };
    }

    // Use production capacity data from backend
    const capacity = item.production_capacity || {};

    // If no capacity data, provide meaningful defaults
    if (!capacity.limiting_factor) {
      return {
        max_batches: 0,
        limiting_factor: 'No recipe ingredients found',
        can_produce: false,
      };
    }

    return {
      max_batches: capacity.max_batches || 0,
      limiting_factor: capacity.limiting_factor || 'Unknown',
      limiting_ingredient: capacity.limiting_ingredient || null,
      can_produce: capacity.can_produce || false,
    };
  };

  const resetForm = () => {
    updateForm.value = {
      available_quantity: 0,
      selling_price: 0,
      notes: '',
      reason: '',
      adjustment_type: '',
      requires_approval: false,
      previous_quantity: 0,
      quantity_change: 0,
      adjustment_category: '',
      reference_number: '',
      physical_count_date: null,
      counted_by: '',
      verified_by: '',
    };
  };

  // Methods
  const fetchData = async () => {
    try {
      await Promise.all([
        productionStore.fetchProductionInventory(),
        productionStore.fetchProductionInventoryStats(),
        fetchBranches(),
        fetchRecentActivity(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const refreshInventory = async () => {
    try {
      await productionStore.forceRefreshProductionInventory();
      showToast('success', 'Production inventory refreshed successfully');
    } catch (error) {
      console.error('Error refreshing inventory:', error);
      showToast('error', 'Failed to refresh inventory');
    }
  };

  const fetchBranches = async () => {
    try {
      const branchData = await productionStore.fetchBranches();
      console.log('Fetched branches data:', branchData);
      branches.value = branchData || [];
    } catch (error) {
      console.error('Error fetching branches:', error);
      branches.value = [];
    }
  };

  const fetchDistributions = async () => {
    try {
      distributionLoading.value = true;
      const distributionData = await productionStore.fetchAllDistributions();
      // Map BranchDistribution data to expected format
      distributions.value = distributionData.map((dist) => ({
        id: dist.id,
        menu_item_name: dist.menu_item_name || dist.name,
        item_code: dist.item_code,
        branch_name: dist.branch_name,
        branch_id: dist.branch_id,
        quantity_distributed: dist.qty,
        transfer_price: dist.unit_price,
        distribution_date: dist.distribution_date,
        distributed_by_name: dist.distributed_by_name,
        notes: dist.notes,
        reference: dist.reference,
        category: dist.category,
      }));
    } catch (error) {
      console.error('Error fetching distributions:', error);
    } finally {
      distributionLoading.value = false;
    }
  };

  const openUpdateModal = (item, type) => {
    if (!item || !item.id) {
      console.error('Invalid item provided to openUpdateModal:', item);
      return;
    }
    selectedItem.value = item;

    // Initialize form with current values
    const currentQuantity = item.available_quantity || 0;
    updateForm.value = {
      available_quantity: currentQuantity,
      selling_price: item.selling_price || 0,
      notes: '',
      reason: '',
      adjustment_type: '',
      requires_approval: false,
      previous_quantity: currentQuantity,
      quantity_change: 0,
      adjustment_category: '',
      reference_number: '',
      physical_count_date: null,
      counted_by: authStore.user?.name || '',
      verified_by: '',
    };

    showUpdateModal.value = true;
  };

  const closeUpdateModal = () => {
    showUpdateModal.value = false;
    selectedItem.value = null;
    resetForm();
  };

  const openDetailsModal = (item) => {
    if (!item || !item.id) {
      console.error('Invalid item provided to openDetailsModal:', item);
      return;
    }
    selectedItem.value = item;
    showDetailsModal.value = true;
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedItem.value = null;
  };

  const openDistributionModal = (item) => {
    if (!item || !item.id) {
      console.error('Invalid item provided to openDistributionModal:', item);
      return;
    }
    selectedItem.value = item;
    distributionForm.value = {
      quantity: 0,
      branch_id: '',
      transfer_price: item.selling_price || 0,
      notes: '',
    };
    showDistributionModal.value = true;
  };

  const closeDistributionModal = () => {
    showDistributionModal.value = false;
    selectedItem.value = null;
    distributionForm.value = {
      quantity: 0,
      branch_id: '',
      transfer_price: 0,
      notes: '',
    };
  };

  const updateStock = async () => {
    try {
      // Validate form before submission
      if (!stockUpdateValidation.value.isValid) {
        showToast('error', 'Please fill in all required fields');
        return;
      }

      // Prepare comprehensive stock update data
      const stockUpdateData = {
        new_quantity: updateForm.value.available_quantity,
        previous_quantity: updateForm.value.previous_quantity,
        quantity_change: stockUpdateValidation.value.quantityChange,
        adjustment_type: updateForm.value.adjustment_type,
        adjustment_category: updateForm.value.adjustment_category,
        reason: updateForm.value.reason,
        reference_number: updateForm.value.reference_number,
        counted_by: updateForm.value.counted_by,
        verified_by: updateForm.value.verified_by,
        notes: updateForm.value.notes,
        requires_approval: stockUpdateValidation.value.requiresApproval,
        change_percentage: stockUpdateValidation.value.changePercent,
        // Cost impact data
        cost_impact: stockUpdateValidation.value.costImpact,
        cost_impact_type: stockUpdateValidation.value.costImpactType,
        cost_description: stockUpdateValidation.value.costDescription,
        revenue_impact: stockUpdateValidation.value.revenueImpact,
        cost_impact_percentage: stockUpdateValidation.value.costImpactPercent,
        unit_cost: stockUpdateValidation.value.unitCost,
        total_item_value: stockUpdateValidation.value.totalItemValue,
        is_significant_cost_impact:
          stockUpdateValidation.value.isSignificantCostImpact,
        timestamp: new Date().toISOString(),
      };

      await productionStore.updateInventoryStock(
        selectedItem.value.id,
        updateForm.value.available_quantity,
        stockUpdateData
      );

      closeUpdateModal();

      const message = stockUpdateValidation.value.requiresApproval
        ? 'Stock adjustment submitted for approval'
        : 'Stock updated successfully';
      showToast('success', message);
    } catch (error) {
      showToast('error', error.message || 'Failed to update stock');
    }
  };

  const updatePricing = async () => {
    try {
      await productionStore.updateInventoryPricing(
        selectedItem.value.id,
        updateForm.value.selling_price
      );
      closeUpdateModal();
      showToast('success', 'Pricing updated successfully');
    } catch (error) {
      showToast('error', error.message || 'Failed to update pricing');
    }
  };

  const recordDistribution = async () => {
    try {
      if (
        !distributionForm.value.quantity ||
        !distributionForm.value.branch_id
      ) {
        showToast('error', 'Please fill in all required fields');
        return;
      }

      if (
        distributionForm.value.quantity > selectedItem.value.available_quantity
      ) {
        showToast('error', 'Insufficient stock for distribution');
        return;
      }

      await productionStore.recordDistribution(
        selectedItem.value.id,
        distributionForm.value
      );
      closeDistributionModal();
      showToast('success', 'Distribution recorded successfully');

      // Refresh distributions if we're on the distributions tab
      if (activeTab.value === 'distributions') {
        await fetchDistributions();
      }
    } catch (error) {
      showToast('error', error.message || 'Failed to record distribution');
    }
  };

  const configureInventory = async (item) => {
    try {
      await productionStore.updateInitialStockFromRecipe(item.id);
      showToast(
        'success',
        `Production inventory configured - Stock remains at 0 until actual production`
      );
    } catch (error) {
      showToast('error', error.message || 'Failed to configure inventory');
    }
  };

  const showToast = (type, message) => {
    // Simple toast implementation
    console.log(`${type}: ${message}`);
  };

  const clearFilters = () => {
    searchQuery.value = '';
    categoryFilter.value = '';
    statusFilter.value = '';
    currentPage.value = 1;
  };

  // Pagination methods (matching SCM TransactionModal pattern)
  const goToPage = (page) => {
    currentPage.value = page;
  };

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++;
    }
  };

  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--;
    }
  };

  // Smart pagination helper (matching SCM pattern)
  const getPageRange = () => {
    const current = currentPage.value;
    const total = totalPages.value;
    const range = [];

    // Show pages around current page
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== total) {
        range.push(i);
      }
    }

    return range;
  };

  // Distribution pagination helper
  const getDistributionPageRange = () => {
    const current = distributionCurrentPage.value;
    const total = totalDistributionPages.value;
    const range = [];

    // Show pages around current page
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== total) {
        range.push(i);
      }
    }

    return range;
  };

  // Lifecycle
  onMounted(() => {
    fetchData();
  });

  // Watch for data changes
  watch([searchQuery, categoryFilter, statusFilter], () => {
    currentPage.value = 1;
  });

  // Watch for tab changes to fetch distributions
  watch(activeTab, (newTab) => {
    if (newTab === 'distributions' && distributions.value.length === 0) {
      fetchDistributions();
    }
  });

  // Watch for distribution filter changes to reset pagination
  watch(
    [
      distributionSearchQuery,
      distributionBranchFilter,
      distributionDateFrom,
      distributionDateTo,
    ],
    () => {
      distributionCurrentPage.value = 1;
    }
  );
</script>

<template>
  <div class="container mx-auto p-2 sm:p-4 lg:p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6 lg:mb-8">
      <h1
        class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primaryColor mb-2 text-shadow-xs"
      >
        Production Inventory
      </h1>
      <p class="text-sm sm:text-base text-black/50 px-2">
        Manage approved menu items ready for production and track inventory
        levels.
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
          {{ realTimeStats.total_items || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Menu items in inventory
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Target class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-success" />
        </div>
        <div class="stat-title text-black/50 text-xs sm:text-sm">
          Total Stock
        </div>
        <div
          class="stat-value text-success text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ realTimeStats.total_quantity || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Units available
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
          Low Stock
        </div>
        <div
          class="stat-value text-warning text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ realTimeStats.low_stock_items || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Items below reorder point
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <TrendingUp
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-black/50"
          />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Avg. Margin
        </div>
        <div
          class="stat-value text-black/50 text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ Number(realTimeStats.average_margin || 0).toFixed(0) }}%
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Profit margin
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Truck class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-warning" />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Distributed
        </div>
        <div
          class="stat-value text-warning text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ realTimeStats.total_distributed_all_time || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Units distributed to branches
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div
      class="flex flex-wrap gap-2 mb-4 sm:mb-6 justify-center sm:justify-start"
    >
      <button
        @click="fetchData"
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
        @click="activeTab = 'inventory'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'inventory' }"
      >
        <Package class="w-4 h-4 mr-1" />
        Inventory
      </button>
      <button
        @click="activeTab = 'analytics'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'analytics' }"
      >
        <BarChart3 class="w-4 h-4 mr-1" />
        Analytics
      </button>
      <button
        @click="activeTab = 'distributions'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'distributions' }"
      >
        <Truck class="w-4 h-4 mr-1" />
        Distributions
      </button>
      <button
        @click="activeTab = 'alerts'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'alerts' }"
      >
        <AlertCircle class="w-4 h-4 mr-1" />
        Alerts
      </button>
    </div>

    <!-- Tab Content -->
    <div
      class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10"
    >
      <div class="card-body p-3 sm:p-4 lg:p-6">
        <!-- Inventory Tab -->
        <div v-if="activeTab === 'inventory'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Production Inventory
              </h2>
              <p class="text-sm text-gray-600">
                View and manage your approved menu items ready for production.
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

          <!-- Search and Filters -->
          <div class="flex flex-col sm:flex-row gap-4 mb-6">
            <div class="flex-1">
              <div class="relative">
                <Search
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search inventory items..."
                  class="input input-bordered w-full pl-10"
                  :disabled="loading"
                />
              </div>
            </div>
            <div class="flex gap-2">
              <select
                v-model="categoryFilter"
                class="select select-bordered"
                :disabled="loading"
              >
                <option value="">All Categories</option>
                <option
                  v-for="category in availableCategories"
                  :key="category"
                  :value="category"
                >
                  {{ category }}
                </option>
              </select>
              <select
                v-model="statusFilter"
                class="select select-bordered"
                :disabled="loading"
              >
                <option value="">All Status</option>
                <option value="low_stock">Low Stock</option>
                <option value="featured">Featured</option>
              </select>
            </div>
          </div>

          <!-- Inventory Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Loading State - Skeleton Cards -->
            <div
              v-if="loading"
              v-for="n in 6"
              :key="`skeleton-${n}`"
              class="card bg-white border border-gray-200 animate-pulse"
            >
              <div class="card-body p-6">
                <!-- Skeleton Image -->
                <div class="mb-4">
                  <div class="w-full h-32 bg-gray-200 rounded-lg"></div>
                </div>

                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <!-- Skeleton Title -->
                    <div class="h-6 bg-gray-200 rounded mb-2 w-3/4"></div>
                    <!-- Skeleton Subtitle -->
                    <div class="h-4 bg-gray-200 rounded mb-2 w-1/2"></div>
                    <!-- Skeleton Badges -->
                    <div class="flex items-center gap-2 mb-3">
                      <div class="h-5 bg-gray-200 rounded w-16"></div>
                      <div class="h-5 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>

                <!-- Skeleton Stock Info -->
                <div class="mb-4">
                  <div class="h-4 bg-gray-200 rounded mb-1 w-2/3"></div>
                  <div class="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>

                <!-- Skeleton Financial Info -->
                <div class="mb-4">
                  <div class="h-4 bg-gray-200 rounded mb-1 w-1/2"></div>
                  <div class="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>

                <!-- Skeleton Production Info -->
                <div class="mb-4">
                  <div class="h-4 bg-gray-200 rounded mb-1 w-3/4"></div>
                  <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>

                <!-- Skeleton Buttons -->
                <div class="flex gap-2">
                  <div class="h-8 bg-gray-200 rounded flex-1"></div>
                  <div class="h-8 bg-gray-200 rounded flex-1"></div>
                </div>
              </div>
            </div>

            <!-- Actual Inventory Items -->
            <div
              v-else-if="paginatedInventory.length > 0"
              v-for="item in paginatedInventory"
              :key="item.id"
              class="card bg-white border border-gray-200 hover:shadow-xl duration-300 cursor-pointer"
              @click="openDetailsModal(item)"
            >
              <div class="card-body p-6">
                <!-- Menu Item Image -->
                <div v-if="item.image_url" class="mb-4">
                  <img
                    :src="item.image_url"
                    :alt="item.item_name"
                    class="w-full h-32 object-cover rounded-lg"
                  />
                </div>

                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <h3
                      class="card-title text-lg font-bold text-primaryColor mb-2"
                    >
                      {{ item.item_name }}
                    </h3>
                    <p class="text-sm text-gray-600 mb-2">
                      {{ item.recipe_name }}
                    </p>
                    <div class="flex items-center gap-2 mb-3">
                      <span
                        class="badge"
                        :class="getStockLevelBadgeClass(item)"
                      >
                        {{ getStockLevelText(item) }}
                      </span>
                      <span class="badge badge-sm bg-gray-100 text-gray-600">
                        {{ item.category }}
                      </span>
                      <span
                        v-if="item.is_featured || item.total_distributed >= 100"
                        class="badge badge-sm bg-yellow-100 text-yellow-800"
                      >
                        <Star class="w-3 h-3 mr-1" />
                        {{ item.is_featured ? 'Featured' : 'Popular' }}
                      </span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-lg font-bold text-primaryColor">
                      {{ item.available_quantity }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ item.unit_of_measure }}
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                      Reorder: {{ item.reorder_point || 0 }}
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-between mb-4">
                  <div class="text-sm text-gray-600">
                    <div class="font-medium">
                      {{ formatCurrency(item.selling_price) }}
                    </div>
                    <div
                      :class="
                        calculateProfitMargin(
                          item.selling_price,
                          item.unit_cost
                        ) === null
                          ? 'text-gray-500 font-medium'
                          : getProfitMarginColor(
                              calculateProfitMargin(
                                item.selling_price,
                                item.unit_cost
                              )
                            )
                      "
                    >
                      {{
                        calculateProfitMargin(
                          item.selling_price,
                          item.unit_cost
                        ) === null
                          ? 'Cost Data Needed'
                          : `${calculateProfitMargin(item.selling_price, item.unit_cost)}% margin`
                      }}
                    </div>
                  </div>
                  <div class="text-right text-sm text-gray-600">
                    <div>Last produced:</div>
                    <div class="font-medium">
                      {{
                        item.last_produced_date
                          ? formatDate(item.last_produced_date)
                          : 'Never'
                      }}
                    </div>
                  </div>
                </div>

                <!-- Production Capacity -->
                <div class="bg-blue-50 p-3 rounded-lg mb-4">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-600">Production Capacity:</span>
                    <span
                      class="font-medium"
                      :class="
                        item.available_quantity > 0
                          ? 'text-success'
                          : getProductionCapacity(item).can_produce
                            ? 'text-warning'
                            : 'text-error'
                      "
                    >
                      {{
                        item.available_quantity > 0
                          ? 'In Stock'
                          : getProductionCapacity(item).can_produce
                            ? 'Ready to Produce'
                            : 'Limited'
                      }}
                    </span>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ getProductionCapacity(item).limiting_factor }}
                  </div>
                </div>

                <div class="flex gap-2">
                  <button
                    v-if="item.available_quantity === 0"
                    @click.stop="configureInventory(item)"
                    class="btn btn-ghost btn-xs text-warning hover:bg-warning/10 flex-1"
                    :disabled="loading"
                  >
                    <RefreshCcw
                      class="w-4 h-4 mr-1"
                      :class="{ 'animate-spin': loading }"
                    />
                    Configure Inventory
                  </button>
                  <button
                    v-else
                    @click.stop="openUpdateModal(item, 'stock')"
                    class="btn btn-ghost btn-xs text-primaryColor hover:bg-primaryColor/10 flex-1"
                  >
                    <Package class="w-4 h-4 mr-1" />
                    Update Stock
                  </button>
                  <button
                    @click.stop="openDetailsModal(item)"
                    class="btn btn-ghost btn-xs text-gray-600 hover:bg-gray-100"
                  >
                    <Eye class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-if="paginatedInventory.length === 0"
              class="col-span-full flex flex-col items-center justify-center py-12"
            >
              <Package class="w-16 h-16 text-gray-300 mb-4" />
              <h3 class="text-lg font-medium text-gray-600 mb-2">
                No inventory items found
              </h3>
              <p class="text-sm text-gray-500 text-center mb-4">
                {{
                  searchQuery || categoryFilter || statusFilter
                    ? 'Try adjusting your filters'
                    : 'No approved menu items in inventory yet. Complete quality inspections to add items.'
                }}
              </p>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="!loading && paginatedInventory.length === 0"
            class="text-center py-12"
          >
            <div class="mb-4">
              <Package class="w-16 h-16 mx-auto text-gray-400" />
            </div>
            <h3 class="text-xl font-semibold text-gray-600 mb-2">
              No inventory items found
            </h3>
            <p class="text-gray-500 mb-6 max-w-md mx-auto">
              {{
                searchQuery || categoryFilter || statusFilter
                  ? 'Try adjusting your search filters to find inventory items.'
                  : 'No production inventory items are available at the moment.'
              }}
            </p>
            <div class="flex gap-3 justify-center">
              <button
                v-if="searchQuery || categoryFilter || statusFilter"
                @click="clearFilters"
                class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
              >
                <X class="w-4 h-4 mr-1" />
                Clear Filters
              </button>
              <button
                @click="fetchData"
                class="btn bg-primaryColor font-thin hover:border-none hover:shadow-none btn-sm text-white"
              >
                <RefreshCcw class="w-4 h-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>

          <!-- Enhanced Pagination (matching SCM TransactionModal pattern) -->
          <div
            class="flex flex-col sm:flex-row justify-between items-center mt-6"
            v-if="!loading && totalPages > 1"
          >
            <div class="text-sm text-black/60 mb-2 sm:mb-0">
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
              {{ Math.min(currentPage * itemsPerPage, totalItems) }}
              of {{ totalItems }} inventory items
            </div>

            <div class="join space-x-1">
              <button
                class="join-item btn font-thin !bg-gray-200 text-black/50 btn-sm border border-none hover:bg-gray-300"
                :disabled="currentPage <= 1"
                @click="prevPage"
              >
                « Prev
              </button>

              <!-- First page -->
              <button
                v-if="totalPages > 1"
                class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
                :class="{
                  'btn-active': currentPage === 1,
                  '!bg-primaryColor text-white': currentPage === 1,
                }"
                @click="goToPage(1)"
              >
                1
              </button>

              <!-- Ellipsis before current page group -->
              <button
                v-if="currentPage > 4"
                class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
                disabled
              >
                ...
              </button>

              <!-- Current page group -->
              <button
                v-for="page in getPageRange()"
                :key="page"
                class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
                :class="{
                  'btn-active': currentPage === page,
                  '!bg-primaryColor text-white': currentPage === page,
                }"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>

              <!-- Ellipsis after current page group -->
              <button
                v-if="currentPage < totalPages - 3"
                class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
                disabled
              >
                ...
              </button>

              <!-- Last page -->
              <button
                v-if="totalPages > 1 && currentPage < totalPages"
                class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
                :class="{
                  'btn-active': currentPage === totalPages,
                  '!bg-primaryColor text-white': currentPage === totalPages,
                }"
                @click="goToPage(totalPages)"
              >
                {{ totalPages }}
              </button>

              <button
                class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
                :disabled="currentPage >= totalPages"
                @click="nextPage"
              >
                Next »
              </button>
            </div>
          </div>
        </div>

        <!-- Analytics Tab -->
        <div v-if="activeTab === 'analytics'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Production Analytics Dashboard
              </h2>
              <p class="text-sm text-gray-600">
                Comprehensive analytics for menu management, production
                efficiency, and inventory performance.
              </p>
            </div>
          </div>

          <!-- Analytics Components -->
          <div class="space-y-6">
            <!-- Menu Item Approval Chart -->
            <MenuItemApprovalChart />

            <!-- Sample Production Trends Chart -->
            <SampleProductionTrendsChart />

            <!-- Production Metrics Chart -->
            <ProductionMetricsChart />

            <!-- Inventory Trends Chart -->
            <InventoryTrendsChart />
          </div>
        </div>

        <!-- Distributions Tab -->
        <div v-if="activeTab === 'distributions'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Distribution Management
              </h2>
              <p class="text-sm text-gray-600">
                Track and manage distributions to branch restaurants.
              </p>
            </div>
          </div>

          <!-- Distribution Stats -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="card bg-white border border-gray-200">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-2xl font-bold text-primaryColor">
                      {{ productionInventoryStats.total_distributions || 0 }}
                    </div>
                    <div class="text-sm text-gray-600">Total Distributions</div>
                  </div>
                  <Truck class="w-8 h-8 text-primaryColor" />
                </div>
              </div>
            </div>

            <div class="card bg-white border border-gray-200">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-2xl font-bold text-success">
                      {{ productionInventoryStats.branches_served || 0 }}
                    </div>
                    <div class="text-sm text-gray-600">Branches Served</div>
                  </div>
                  <Target class="w-8 h-8 text-success" />
                </div>
              </div>
            </div>

            <div class="card bg-white border border-gray-200">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-2xl font-bold text-info">
                      {{ productionInventoryStats.recent_distributions || 0 }}
                    </div>
                    <div class="text-sm text-gray-600">Recent (30 days)</div>
                  </div>
                  <Activity class="w-8 h-8 text-info" />
                </div>
              </div>
            </div>

            <div class="card bg-white border border-gray-200">
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-2xl font-bold text-warning">
                      {{
                        productionInventoryStats.recent_quantity_distributed ||
                        0
                      }}
                    </div>
                    <div class="text-sm text-gray-600">Units (30 days)</div>
                  </div>
                  <TrendingUp class="w-8 h-8 text-warning" />
                </div>
              </div>
            </div>
          </div>

          <!-- Branch Demand Planning -->
          <div class="card bg-white border border-gray-200">
            <div class="card-body p-6">
              <h3 class="text-lg font-semibold text-primaryColor mb-4">
                Branch Demand Planning
              </h3>

              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Production Recommendations -->
                <div class="space-y-4">
                  <h4 class="font-medium text-gray-700">
                    Production Recommendations
                  </h4>
                  <div class="space-y-3">
                    <!-- High Demand Items -->
                    <div
                      v-if="highDemandItems.length > 0"
                      class="alert bg-secondaryColor/10 border-primaryColor"
                    >
                      <div class="flex items-start">
                        <Target class="w-5 h-5 mr-2 mt-0.5" />
                        <div class="flex-1">
                          <div class="font-medium">High Demand Items</div>
                          <div class="text-sm mt-1 space-y-1">
                            <div
                              v-for="item in highDemandItems"
                              :key="item.id"
                              class="flex justify-between items-center"
                            >
                              <span class="font-medium">{{
                                item.menu_item_name || item.item_name
                              }}</span>
                              <span
                                class="text-xs bg-secondaryColor/10 text-primaryColor px-2 py-1 rounded"
                              >
                                {{ item.totalDistributed }} distributed
                              </span>
                            </div>
                          </div>
                          <div class="text-xs text-gray-600 mt-2">
                            Consider increasing production for these popular
                            items
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Low Stock Alerts -->
                    <div
                      v-if="lowStockAlerts.length > 0"
                      class="alert bg-warning/10 border-warning"
                    >
                      <div class="flex items-start">
                        <AlertTriangle class="w-5 h-5 mr-2 mt-0.5" />
                        <div class="flex-1">
                          <div class="font-medium">Low Stock Alerts</div>
                          <div class="text-sm mt-1 space-y-1">
                            <div
                              v-for="item in lowStockAlerts"
                              :key="item.id"
                              class="flex justify-between items-center"
                            >
                              <span class="font-medium">{{
                                item.menu_item_name || item.item_name
                              }}</span>
                              <span
                                class="text-xs bg-warning/10 text-warning px-2 py-1 rounded"
                              >
                                {{ item.availableQuantity || 0 }}/{{
                                  item.reorderPoint || 0
                                }}
                              </span>
                            </div>
                          </div>
                          <div class="text-xs text-gray-600 mt-2">
                            Urgent: These items need immediate restocking
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Production Suggestions -->
                    <div
                      v-if="productionSuggestions.length > 0"
                      class="alert bg-success/10 border-success"
                    >
                      <div class="flex items-start">
                        <CheckCircle class="w-5 h-5 mr-2 mt-0.5" />
                        <div class="flex-1">
                          <div class="font-medium">Production Suggestions</div>
                          <div class="text-sm mt-1 space-y-1">
                            <div
                              v-for="item in productionSuggestions"
                              :key="item.id"
                              class="flex justify-between items-center"
                            >
                              <div class="flex-1">
                                <span class="font-medium">{{
                                  item.menu_item_name || item.item_name
                                }}</span>
                                <div class="text-xs text-gray-600">
                                  {{ item.suggestionReason }}
                                </div>
                              </div>
                              <span
                                :class="[
                                  'text-xs px-2 py-1 rounded',
                                  item.priority === 'High'
                                    ? 'bg-success/10 text-success'
                                    : 'bg-warning/10 text-warning',
                                ]"
                              >
                                {{ item.suggestedQuantity }} units
                              </span>
                            </div>
                          </div>
                          <div class="text-xs text-gray-600 mt-2">
                            Recommended production quantities based on demand
                            patterns
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- No Recommendations -->
                    <div
                      v-if="
                        highDemandItems.length === 0 &&
                        lowStockAlerts.length === 0 &&
                        productionSuggestions.length === 0
                      "
                      class="alert bg-secondaryColor/10 border-primaryColor"
                    >
                      <div class="flex items-center">
                        <CheckCircle class="w-5 h-5 mr-2" />
                        <div>
                          <div class="font-medium">All Good!</div>
                          <div class="text-sm">
                            No immediate production recommendations at this time
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Branch Performance -->
                <div class="space-y-4">
                  <h4 class="font-medium text-gray-700">Branch Performance</h4>
                  <div class="space-y-3">
                    <!-- Top Performing Branch -->
                    <div
                      v-if="branchPerformance.topBranch"
                      class="flex justify-between items-center p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <div class="font-medium">Top Performing Branch</div>
                        <div class="text-sm text-gray-600">
                          {{ branchPerformance.topBranch.branch_name }}
                        </div>
                        <div class="text-xs text-gray-500">
                          {{
                            Math.round(
                              branchPerformance.topBranch.total_quantity || 0
                            )
                          }}
                          units •
                          {{ branchPerformance.topBranch.distribution_count }}
                          distributions
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="font-bold text-success">
                          {{
                            formatCurrency(
                              branchPerformance.topBranch.total_value
                            )
                          }}
                        </div>
                        <div class="text-xs text-gray-500">Total Value</div>
                      </div>
                    </div>

                    <!-- Distribution Efficiency -->
                    <div
                      class="flex justify-between items-center p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <div class="font-medium">Distribution Efficiency</div>
                        <div class="text-sm text-gray-600">
                          Average per distribution
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="font-bold text-info">
                          {{ branchPerformance.averageDistributionSize }}
                          units
                        </div>
                        <div class="text-xs text-gray-500">
                          {{ branchPerformance.totalDistributions }} total
                          distributions
                        </div>
                      </div>
                    </div>

                    <!-- Branch Rankings -->
                    <div
                      v-if="branchPerformance.branchStats.length > 1"
                      class="space-y-2"
                    >
                      <div class="text-sm font-medium text-gray-700">
                        Branch Rankings
                      </div>
                      <div class="space-y-1">
                        <div
                          v-for="(
                            branch, index
                          ) in branchPerformance.branchStats"
                          :key="branch.branch_name"
                          class="flex justify-between items-center p-2 bg-white border border-gray-200 rounded text-xs"
                        >
                          <div class="flex items-center gap-2">
                            <span
                              class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                              :class="
                                index === 0
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : index === 1
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-orange-100 text-orange-800'
                              "
                            >
                              {{ index + 1 }}
                            </span>
                            <span class="font-medium">{{
                              branch.branch_name
                            }}</span>
                          </div>
                          <div class="text-right">
                            <div class="font-semibold">
                              {{ Math.round(branch.total_quantity || 0) }} units
                            </div>
                            <div class="text-gray-500">
                              {{ branch.distribution_count }} orders
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- No Data State -->
                    <div
                      v-if="!branchPerformance.topBranch"
                      class="text-center py-4 text-gray-500"
                    >
                      <Truck class="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <div class="text-sm">No distribution data available</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Distribution History -->
          <div class="card bg-white border border-gray-200">
            <div class="card-body p-6">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-primaryColor">
                  Distribution History
                </h3>
                <button
                  @click="fetchDistributions"
                  class="btn btn-outline btn-sm"
                  :disabled="distributionLoading"
                >
                  <RefreshCcw
                    class="w-4 h-4 mr-1"
                    :class="{ 'animate-spin': distributionLoading }"
                  />
                  Refresh
                </button>
              </div>

              <!-- Distribution Filters -->
              <div v-if="distributions.length > 0" class="mb-6 space-y-4">
                <div
                  class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  <!-- Search -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Search</span>
                    </label>
                    <div class="relative">
                      <Search
                        class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      />
                      <input
                        v-model="distributionSearchQuery"
                        type="text"
                        placeholder="Search distributions..."
                        class="input input-bordered w-full pl-10"
                      />
                    </div>
                  </div>

                  <!-- Branch Filter -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">Branch</span>
                    </label>
                    <select
                      v-model="distributionBranchFilter"
                      class="select select-bordered"
                    >
                      <option value="">All Branches</option>
                      <option
                        v-for="branch in branches"
                        :key="branch.id"
                        :value="branch.id"
                      >
                        {{ branch.name }}
                      </option>
                    </select>
                  </div>

                  <!-- Date From -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">From Date</span>
                    </label>
                    <input
                      v-model="distributionDateFrom"
                      type="date"
                      class="input input-bordered"
                    />
                  </div>

                  <!-- Date To -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">To Date</span>
                    </label>
                    <input
                      v-model="distributionDateTo"
                      type="date"
                      class="input input-bordered"
                    />
                  </div>
                </div>

                <!-- Results Summary -->
                <div
                  class="flex justify-between items-center text-sm text-gray-600"
                >
                  <div>
                    Showing {{ paginatedDistributions.length }} of
                    {{ filteredDistributions.length }} distributions
                    <span
                      v-if="
                        distributionSearchQuery ||
                        distributionBranchFilter ||
                        distributionDateFrom ||
                        distributionDateTo
                      "
                    >
                      (filtered from {{ distributions.length }} total)
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <label class="label">
                      <span class="label-text">Per page:</span>
                    </label>
                    <select
                      v-model="distributionItemsPerPage"
                      class="select select-sm select-bordered"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Distribution Table -->
              <div v-if="distributionLoading" class="text-center py-8">
                <RefreshCcw
                  class="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin"
                />
                <p class="text-gray-500">Loading distributions...</p>
              </div>

              <div
                v-else-if="distributions.length === 0"
                class="text-center py-8"
              >
                <Truck class="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 class="text-lg font-medium text-gray-600 mb-2">
                  No Distributions Yet
                </h3>
                <p class="text-sm text-gray-500">
                  Start distributing items to branches to see history here.
                </p>
              </div>

              <div
                v-else-if="filteredDistributions.length === 0"
                class="text-center py-8"
              >
                <Search class="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 class="text-lg font-medium text-gray-600 mb-2">
                  No Matching Distributions
                </h3>
                <p class="text-sm text-gray-500">
                  Try adjusting your search criteria or filters.
                </p>
              </div>

              <div v-else class="overflow-x-auto">
                <table class="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Branch</th>
                      <th>Quantity</th>
                      <th>Transfer Price</th>
                      <th>Total Cost</th>
                      <th>Date</th>
                      <th>Distributed By</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="distribution in paginatedDistributions"
                      :key="distribution.id"
                    >
                      <td>
                        <div>
                          <div class="font-medium">
                            {{ distribution.menu_item_name }}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="font-medium">
                          {{ distribution.branch_name }}
                        </div>
                      </td>
                      <td>
                        <span
                          class="badge bg-info/20 text-info font-medium badge-sm"
                        >
                          {{
                            Number(distribution.quantity_distributed).toFixed(2)
                          }}
                        </span>
                      </td>
                      <td>
                        <div class="font-medium text-success">
                          ₱{{
                            Number(distribution.transfer_price || 0).toFixed(2)
                          }}
                        </div>
                      </td>
                      <td>
                        <div class="font-medium text-primaryColor">
                          ₱{{
                            Number(
                              (distribution.quantity_distributed || 0) *
                                (distribution.transfer_price || 0)
                            ).toFixed(2)
                          }}
                        </div>
                      </td>
                      <td>
                        <div class="text-sm">
                          {{ formatDate(distribution.distribution_date) }}
                        </div>
                      </td>
                      <td>
                        <div class="text-sm">
                          {{ distribution.distributed_by_name }}
                        </div>
                      </td>
                      <td>
                        <div class="text-sm text-gray-500 max-w-xs truncate">
                          {{ distribution.notes || 'No notes' }}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- Distribution Pagination -->
                <div
                  v-if="totalDistributionPages > 1"
                  class="flex justify-center items-center mt-6 space-x-2"
                >
                  <button
                    @click="
                      distributionCurrentPage = Math.max(
                        1,
                        distributionCurrentPage - 1
                      )
                    "
                    :disabled="distributionCurrentPage <= 1"
                    class="btn btn-sm btn-outline"
                  >
                    <ChevronLeft class="w-4 h-4" />
                    Previous
                  </button>

                  <div class="join">
                    <button
                      v-for="page in getDistributionPageRange()"
                      :key="page"
                      @click="distributionCurrentPage = page"
                      :class="[
                        'btn btn-sm join-item',
                        page === distributionCurrentPage
                          ? 'btn-primary'
                          : 'btn-outline',
                      ]"
                    >
                      {{ page }}
                    </button>
                  </div>

                  <button
                    @click="
                      distributionCurrentPage = Math.min(
                        totalDistributionPages,
                        distributionCurrentPage + 1
                      )
                    "
                    :disabled="
                      distributionCurrentPage >= totalDistributionPages
                    "
                    class="btn btn-sm btn-outline"
                  >
                    Next
                    <ChevronRight class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Alerts Tab -->
        <div v-if="activeTab === 'alerts'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Inventory Alerts
              </h2>
              <p class="text-sm text-gray-600">
                Monitor low stock items and production capacity issues.
              </p>
            </div>
          </div>

          <!-- Low Stock Alerts -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-primaryColor">
              Low Stock Alerts
            </h3>
            <div class="grid gap-4">
              <div
                v-for="item in productionInventory.filter(
                  (i) => i.available_quantity <= i.reorder_point
                )"
                :key="item.id"
                class="card bg-yellow-50 border border-yellow-200 cursor-pointer hover:shadow-md"
                @click="openDetailsModal(item)"
              >
                <div class="card-body p-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-100"
                      >
                        <AlertTriangle class="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <div class="font-medium text-primaryColor">
                          {{ item.item_name }}
                        </div>
                        <div class="text-sm text-gray-600">
                          {{ item.category }}
                        </div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-lg font-bold text-yellow-600">
                        {{ item.available_quantity }} / {{ item.reorder_point }}
                      </div>
                      <div class="text-sm text-gray-600">
                        Current / Reorder Point
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                v-if="
                  productionInventory.filter(
                    (i) => i.available_quantity <= i.reorder_point
                  ).length === 0
                "
                class="text-center py-8 text-gray-500"
              >
                No low stock alerts at this time
              </div>
            </div>
          </div>

          <!-- Production Capacity Issues -->
          <div class="space-y-4">
            <h3 class="text-lg font-semibold text-primaryColor">
              Production Capacity Issues
            </h3>
            <div class="grid gap-4">
              <div
                v-for="item in productionInventory.filter(
                  (i) => !getProductionCapacity(i).can_produce
                )"
                :key="item.id"
                class="card bg-red-50 border border-red-200 cursor-pointer hover:shadow-md"
                @click="openDetailsModal(item)"
              >
                <div class="card-body p-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center bg-red-100"
                      >
                        <X class="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <div class="font-medium text-primaryColor">
                          {{ item.item_name }}
                        </div>
                        <div class="text-sm text-gray-600">
                          {{ item.category }}
                        </div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-medium text-red-600">
                        {{ getProductionCapacity(item).limiting_factor }}
                      </div>
                      <div class="text-sm text-gray-600">Capacity Issue</div>
                    </div>
                  </div>
                </div>
              </div>
              <div
                v-if="
                  productionInventory.filter(
                    (i) => !getProductionCapacity(i).can_produce
                  ).length === 0
                "
                class="text-center py-8 text-gray-500"
              >
                No production capacity issues detected
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity Section -->
    <div
      class="card bg-gradient-to-br from-base-100 to-base-50 border border-gray-200 shadow-lg"
    >
      <div class="card-body p-6 overflow-y-auto max-h-[500px]">
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
                Latest production inventory movements
              </p>
            </div>
          </div>
          <button
            @click="fetchData"
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

        <div v-else-if="recentActivity.length === 0" class="text-center py-8">
          <History class="w-12 h-12 mx-auto text-gray-400 mb-2" />
          <h3 class="text-lg font-medium text-gray-600 mb-2">
            No recent activity
          </h3>
          <p class="text-gray-500">Recent inventory changes will appear here</p>
        </div>

        <div v-else class="space-y-4 overflow-y-auto">
          <div
            v-for="activity in recentActivity.slice(0, 5)"
            :key="activity.id"
            class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center"
                  :class="getActivityTypeInfo(activity.action_type).bgColor"
                >
                  <component
                    :is="getActivityTypeInfo(activity.action_type).icon"
                    class="w-4 h-4"
                    :class="getActivityTypeInfo(activity.action_type).color"
                  />
                </div>
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <span
                      class="badge badge-sm border-none font-medium"
                      :class="
                        getActivityTypeInfo(activity.action_type).badgeColor
                      "
                    >
                      {{ getActivityTypeInfo(activity.action_type).label }}
                    </span>
                    <span class="text-sm text-gray-500">
                      {{ formatActivityDate(activity.created_at) }}
                    </span>
                  </div>
                  <h4 class="font-semibold text-gray-800">
                    {{ activity.item_name }}
                  </h4>
                </div>
              </div>
            </div>

            <!-- Inventory Activity Details -->
            <div
              v-if="activity.activity_source === 'inventory'"
              class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3"
            >
              <div class="text-center">
                <div class="text-xs text-gray-500 mb-1">Previous</div>
                <div class="font-semibold text-gray-700">
                  {{ activity.old_quantity || 0 }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500 mb-1">New</div>
                <div class="font-semibold text-gray-700">
                  {{ activity.new_quantity || 0 }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500 mb-1">Change</div>
                <div
                  class="font-semibold"
                  :class="{
                    'text-success': activity.quantity_change > 0,
                    'text-error': activity.quantity_change < 0,
                    'text-gray-500': activity.quantity_change === 0,
                  }"
                >
                  {{ activity.quantity_change > 0 ? '+' : ''
                  }}{{ activity.quantity_change || 0 }}
                </div>
              </div>
            </div>

            <!-- Production Activity Details -->
            <div
              v-else-if="activity.activity_source === 'production'"
              class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3"
            >
              <div class="text-center">
                <div class="text-xs text-gray-500 mb-1">Batch Size</div>
                <div class="font-semibold text-gray-700">
                  {{ activity.batch_size || 0 }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500 mb-1">Produced</div>
                <div class="font-semibold text-gray-700">
                  {{ activity.quantity_produced || 0 }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-xs text-gray-500 mb-1">Status</div>
                <div class="font-semibold text-gray-700">
                  {{ activity.action_type }}
                </div>
              </div>
            </div>

            <div
              class="flex justify-between items-center pt-3 border-t border-gray-100"
            >
              <div class="text-xs text-gray-500">
                <span class="font-medium">Performed by:</span>
                {{ activity.performed_by }}
              </div>
              <div class="text-xs text-gray-400">
                Activity ID: #{{ activity.id }}
              </div>
            </div>

            <!-- Activity Details -->
            <div
              v-if="
                getActivityDetails(activity).notes ||
                getActivityDetails(activity).reason ||
                getActivityDetails(activity).adjustment_type ||
                activity.action_details
              "
              class="mt-3 space-y-2"
            >
              <!-- Reason/Notes Display -->
              <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div class="text-xs text-blue-700 font-medium mb-1">Reason</div>
                <p class="text-xs text-blue-800">
                  {{ getFormattedReason(activity) }}
                </p>
              </div>

              <!-- Additional Details -->
              <div
                v-if="
                  getActivityDetails(activity).adjustment_type ||
                  getActivityDetails(activity).cost_impact ||
                  getActivityDetails(activity).production_inventory_id
                "
                class="p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <!-- Adjustment Type -->
                  <div
                    v-if="getActivityDetails(activity).adjustment_type"
                    class="flex justify-between"
                  >
                    <span class="text-gray-600">Type:</span>
                    <span class="font-medium text-gray-800">
                      {{
                        getFormattedAdjustmentType(
                          getActivityDetails(activity).adjustment_type
                        )
                      }}
                    </span>
                  </div>

                  <!-- Cost Impact -->
                  <div
                    v-if="getActivityDetails(activity).cost_impact"
                    class="flex justify-between"
                  >
                    <span class="text-gray-600">Cost Impact:</span>
                    <span
                      class="font-medium"
                      :class="{
                        'text-success':
                          getActivityDetails(activity).cost_impact_type ===
                          'positive',
                        'text-error':
                          getActivityDetails(activity).cost_impact_type ===
                          'negative',
                        'text-gray-600':
                          getActivityDetails(activity).cost_impact_type ===
                          'neutral',
                      }"
                    >
                      ₱{{
                        getActivityDetails(activity).cost_impact?.toFixed(2)
                      }}
                    </span>
                  </div>

                  <!-- Reference Number -->
                  <div
                    v-if="getActivityDetails(activity).reference_number"
                    class="flex justify-between"
                  >
                    <span class="text-gray-600">Reference:</span>
                    <span class="font-medium text-gray-800">
                      {{ getActivityDetails(activity).reference_number }}
                    </span>
                  </div>

                  <!-- Approval Status -->
                  <div
                    v-if="getActivityDetails(activity).requires_approval"
                    class="flex justify-between"
                  >
                    <span class="text-gray-600">Status:</span>
                    <span class="badge badge-warning badge-xs"
                      >Approval Required</span
                    >
                  </div>

                  <!-- Change Percentage -->
                  <div
                    v-if="
                      getActivityDetails(activity).old_quantity &&
                      getActivityDetails(activity).new_quantity
                    "
                    class="flex justify-between"
                  >
                    <span class="text-gray-600">Change %:</span>
                    <span
                      class="font-medium"
                      :class="{
                        'text-success':
                          getActivityDetails(activity).quantity_change > 0,
                        'text-error':
                          getActivityDetails(activity).quantity_change < 0,
                        'text-gray-600':
                          getActivityDetails(activity).quantity_change === 0,
                      }"
                    >
                      {{ getChangePercentage(getActivityDetails(activity)) }}%
                    </span>
                  </div>
                </div>
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
    <!-- Update Modal -->
    <dialog
      id="update_modal"
      class="modal"
      :class="{
        'modal-open': showUpdateModal && selectedItem && selectedItem.id,
      }"
    >
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg text-primaryColor mb-6">
          <Package class="w-5 h-5 inline mr-2" />
          Stock Adjustment - {{ selectedItem?.item_name }}
        </h3>

        <form @submit.prevent="updateStock" class="space-y-6">
          <!-- Current Stock Information -->
          <div
            class="bg-secondaryColor/10 border border-primaryColor/20 p-4 rounded-xl"
          >
            <h4 class="font-semibold text-primaryColor mb-3">
              <Activity class="w-4 h-4 inline mr-2" />
              Current Stock Information
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text text-black/70 font-medium text-sm"
                    >Previous Quantity</span
                  >
                </label>
                <div class="text-lg font-bold text-primaryColor">
                  {{ updateForm.previous_quantity }}
                  {{ selectedItem?.unit_of_measure }}
                </div>
              </div>
              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text text-black/70 font-medium text-sm"
                    >New Quantity</span
                  >
                </label>
                <input
                  v-model.number="updateForm.available_quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  class="input input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  placeholder="Enter new quantity"
                  required
                />
              </div>
              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text text-black/70 font-medium text-sm"
                    >Change</span
                  >
                </label>
                <div
                  class="text-lg font-bold"
                  :class="{
                    'text-success': stockUpdateValidation.quantityChange > 0,
                    'text-error': stockUpdateValidation.quantityChange < 0,
                    'text-gray-500': stockUpdateValidation.quantityChange === 0,
                  }"
                >
                  {{ stockUpdateValidation.quantityChange > 0 ? '+' : ''
                  }}{{ stockUpdateValidation.quantityChange }}
                  {{ selectedItem?.unit_of_measure }}
                </div>
              </div>
            </div>
          </div>

          <!-- Cost Impact Analysis -->
          <div
            v-if="stockUpdateValidation.costImpact > 0"
            class="bg-white border border-black/10 p-4 rounded-xl"
          >
            <h4 class="font-semibold text-primaryColor mb-4">
              <TrendingUp class="w-4 h-4 inline mr-2" />
              Cost Impact Analysis
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text text-black/70 font-medium text-sm"
                    >Unit Cost</span
                  >
                </label>
                <div class="text-sm font-semibold text-primaryColor">
                  {{ formatCurrency(stockUpdateValidation.unitCost) }}
                </div>
              </div>

              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text text-black/70 font-medium text-sm"
                    >Cost Impact</span
                  >
                </label>
                <div
                  class="text-lg font-bold"
                  :class="{
                    'text-success':
                      stockUpdateValidation.costImpactType === 'positive',
                    'text-error':
                      stockUpdateValidation.costImpactType === 'negative',
                    'text-gray-500':
                      stockUpdateValidation.costImpactType === 'neutral',
                  }"
                >
                  {{
                    stockUpdateValidation.costImpactType === 'positive'
                      ? '+'
                      : stockUpdateValidation.costImpactType === 'negative'
                        ? '-'
                        : ''
                  }}{{ formatCurrency(stockUpdateValidation.costImpact) }}
                </div>
                <div class="text-xs text-black/50">
                  {{ stockUpdateValidation.costDescription }}
                </div>
              </div>

              <div
                v-if="stockUpdateValidation.revenueImpact > 0"
                class="form-control"
              >
                <label class="label mb-1">
                  <span class="label-text text-black/70 font-medium text-sm"
                    >Revenue Impact</span
                  >
                </label>
                <div class="text-lg font-bold text-warning">
                  -{{ formatCurrency(stockUpdateValidation.revenueImpact) }}
                </div>
                <div class="text-xs text-black/50">Potential lost sales</div>
              </div>

              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text text-black/70 font-medium text-sm"
                    >Impact %</span
                  >
                </label>
                <div
                  class="text-sm font-semibold"
                  :class="{
                    'text-success': stockUpdateValidation.costImpactPercent < 5,
                    'text-warning':
                      stockUpdateValidation.costImpactPercent >= 5 &&
                      stockUpdateValidation.costImpactPercent < 10,
                    'text-error': stockUpdateValidation.costImpactPercent >= 10,
                  }"
                >
                  {{ stockUpdateValidation.costImpactPercent.toFixed(1) }}%
                </div>
                <div class="text-xs text-black/50">of total item value</div>
              </div>
            </div>

            <!-- Significant Cost Impact Warning -->
            <div
              v-if="stockUpdateValidation.isSignificantCostImpact"
              class="alert alert-warning mt-4"
            >
              <AlertTriangle class="w-5 h-5" />
              <div>
                <h3 class="font-bold">Significant Cost Impact</h3>
                <div class="text-sm">
                  This adjustment has a significant financial impact ({{
                    formatCurrency(stockUpdateValidation.costImpact)
                  }}
                  - {{ stockUpdateValidation.costImpactPercent.toFixed(1) }}% of
                  item value) and may require additional approval.
                </div>
              </div>
            </div>
          </div>

          <!-- Adjustment Details -->
          <div class="bg-white border border-black/10 p-4 rounded-xl">
            <h4 class="font-semibold text-primaryColor mb-4">
              <AlertTriangle class="w-4 h-4 inline mr-2" />
              Adjustment Details
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text text-black/70 font-medium text-sm"
                    >Adjustment Type *</span
                  >
                </label>
                <select
                  v-model="updateForm.adjustment_type"
                  class="select select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  required
                >
                  <option value="">Select adjustment type</option>
                  <option value="physical_count">Physical Count</option>
                  <option value="received_goods">Received Goods</option>
                  <option value="production_completed">
                    Production Completed
                  </option>
                  <option value="damage">Damage/Loss</option>
                  <option value="theft">Theft/Missing</option>
                  <option value="expired">Expired Items</option>
                  <option value="transfer_in">Transfer In</option>
                  <option value="transfer_out">Transfer Out</option>
                  <option value="waste">Waste/Spillage</option>
                  <option value="correction">Data Correction</option>
                </select>
              </div>

              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text text-black/70 font-medium text-sm"
                    >Adjustment Category *</span
                  >
                </label>
                <select
                  v-model="updateForm.adjustment_category"
                  class="select select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  required
                >
                  <option value="">Select category</option>
                  <option value="routine">Routine Adjustment</option>
                  <option value="audit">Audit Correction</option>
                  <option value="emergency">Emergency Adjustment</option>
                  <option value="system">System Correction</option>
                </select>
              </div>

              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text text-black/70 font-medium text-sm"
                    >Reason for Adjustment *</span
                  >
                </label>
                <select
                  v-model="updateForm.reason"
                  class="select select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  required
                >
                  <option value="">Select reason</option>
                  <option value="physical_inventory">
                    Physical Inventory Count
                  </option>
                  <option value="delivery_received">Delivery Received</option>
                  <option value="production_batch">
                    Production Batch Completed
                  </option>
                  <option value="damaged_items">Items Damaged</option>
                  <option value="missing_items">Items Missing/Stolen</option>
                  <option value="expired_items">Items Expired</option>
                  <option value="branch_transfer">Branch Transfer</option>
                  <option value="data_error">Data Entry Error</option>
                  <option value="quality_issue">Quality Issue</option>
                  <option value="other">Other (specify in notes)</option>
                </select>
              </div>

              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text text-black/70 font-medium text-sm"
                    >Reference Number</span
                  >
                </label>
                <input
                  v-model="updateForm.reference_number"
                  type="text"
                  class="input input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  placeholder="PO#, Invoice#, etc."
                />
              </div>
            </div>
          </div>

          <!-- Personnel Information -->
          <div class="bg-white border border-black/10 p-4 rounded-xl">
            <h4 class="font-semibold text-primaryColor mb-4">
              <CheckCircle class="w-4 h-4 inline mr-2" />
              Personnel Information
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text text-black/70 font-medium text-sm"
                    >Counted/Updated By *</span
                  >
                </label>
                <input
                  v-model="updateForm.counted_by"
                  type="text"
                  class="input input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  placeholder="Your name"
                  required
                />
              </div>

              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text text-black/70 font-medium text-sm"
                    >Verified By</span
                  >
                </label>
                <input
                  v-model="updateForm.verified_by"
                  type="text"
                  class="input input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  placeholder="Supervisor/Manager name"
                />
              </div>
            </div>
          </div>

          <!-- Additional Notes -->
          <div class="form-control">
            <label class="label mb-1">
              <span class="label-text text-black/70 font-medium text-sm"
                >Additional Notes</span
              >
            </label>
            <textarea
              v-model="updateForm.notes"
              class="textarea textarea-bordered w-full textarea-sm bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              rows="3"
              placeholder="Additional details, observations, or special circumstances..."
            ></textarea>
          </div>

          <!-- Approval Warning -->
          <div
            v-if="stockUpdateValidation.requiresApproval"
            class="alert alert-warning"
          >
            <AlertTriangle class="w-5 h-5" />
            <div>
              <h3 class="font-bold">Approval Required</h3>
              <div class="text-sm">
                This adjustment requires manager approval due to:
                <ul class="list-disc list-inside mt-2 space-y-1">
                  <li v-if="stockUpdateValidation.changePercent > 20">
                    Significant quantity change ({{
                      stockUpdateValidation.changePercent.toFixed(1)
                    }}% change)
                  </li>
                  <li
                    v-if="Math.abs(stockUpdateValidation.quantityChange) > 50"
                  >
                    Large quantity adjustment ({{
                      Math.abs(stockUpdateValidation.quantityChange)
                    }}
                    units)
                  </li>
                  <li
                    v-if="
                      updateForm.adjustment_type === 'damage' ||
                      updateForm.adjustment_type === 'theft'
                    "
                  >
                    High-risk adjustment type ({{ updateForm.adjustment_type }})
                  </li>
                  <li v-if="stockUpdateValidation.isSignificantCostImpact">
                    Significant cost impact ({{
                      formatCurrency(stockUpdateValidation.costImpact)
                    }}
                    - {{ stockUpdateValidation.costImpactPercent.toFixed(1) }}%
                    of item value)
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end gap-3 pt-4 border-t border-black/10">
            <button
              type="button"
              @click="closeUpdateModal"
              class="btn btn-sm bg-white text-black/70 border border-black/20 hover:bg-primaryColor/10 hover:border-primaryColor/40 rounded-lg shadow-none font-thin"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
              :disabled="loading || !stockUpdateValidation.isValid"
            >
              <span
                class="loading loading-spinner loading-sm mr-2"
                v-if="loading"
              ></span>
              <Package class="w-4 h-4 mr-2" v-else />
              {{
                stockUpdateValidation.requiresApproval
                  ? 'Submit for Approval'
                  : 'Update Stock'
              }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeUpdateModal">close</button>
      </form>
    </dialog>

    <!-- Details Modal -->
    <dialog
      id="details_modal"
      class="modal"
      :class="{
        'modal-open': showDetailsModal && selectedItem && selectedItem.id,
      }"
    >
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg text-primaryColor mb-6">
          {{ selectedItem?.item_name }} Details
        </h3>

        <div class="space-y-6">
          <!-- Menu Item Image -->
          <div v-if="selectedItem?.image_url" class="text-center">
            <img
              :src="selectedItem.image_url"
              :alt="selectedItem.item_name"
              class="w-64 h-48 object-cover rounded-xl mx-auto shadow-lg border border-black/10"
            />
          </div>

          <!-- Item Information -->
          <div
            class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Item Code</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ selectedItem?.item_code }}
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Recipe</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ selectedItem?.recipe_name }}
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Category</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ selectedItem?.category }}
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Unit of Measure</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ selectedItem?.unit_of_measure }}
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Status</span
                >
              </label>
              <div class="flex items-center gap-2">
                <span
                  class="badge badge-sm border-none"
                  :class="
                    selectedItem?.is_featured
                      ? 'bg-warning/20 text-warning'
                      : selectedItem?.total_distributed >= 100
                        ? 'bg-success/20 text-success'
                        : 'bg-neutral/20 text-neutral'
                  "
                >
                  {{
                    selectedItem?.is_featured
                      ? 'Featured'
                      : selectedItem?.total_distributed >= 100
                        ? 'Popular'
                        : 'Standard'
                  }}
                </span>
                <span
                  v-if="
                    selectedItem?.total_distributed >= 100 &&
                    !selectedItem?.is_featured
                  "
                  class="text-xs text-gray-500"
                >
                  ({{ selectedItem.total_distributed }} distributed)
                </span>
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Status</span
                >
              </label>
              <div>
                <span
                  class="badge badge-sm"
                  :class="getStockLevelBadgeClass(selectedItem)"
                >
                  {{ getStockLevelText(selectedItem) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Stock & Pricing Information -->
          <div
            class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Available Stock</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ selectedItem?.available_quantity }}
                {{ selectedItem?.unit_of_measure }}
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Reorder Point</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ selectedItem?.reorder_point || 0 }}
                {{ selectedItem?.unit_of_measure }}
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Selling Price</span
                >
              </label>
              <div class="text-sm text-success font-semibold">
                {{ formatCurrency(selectedItem?.selling_price) }}
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Unit Cost</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ formatCurrency(selectedItem?.unit_cost) }}
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Profit Margin</span
                >
              </label>
              <div
                class="text-sm font-semibold"
                :class="
                  calculateProfitMargin(
                    selectedItem?.selling_price,
                    selectedItem?.unit_cost
                  ) === null
                    ? 'text-gray-500'
                    : getProfitMarginColor(
                        calculateProfitMargin(
                          selectedItem?.selling_price,
                          selectedItem?.unit_cost
                        )
                      )
                "
              >
                {{
                  calculateProfitMargin(
                    selectedItem?.selling_price,
                    selectedItem?.unit_cost
                  ) === null
                    ? 'Cost Data Needed'
                    : `${calculateProfitMargin(selectedItem?.selling_price, selectedItem?.unit_cost)}%`
                }}
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Last Updated</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ formatDate(selectedItem?.updated_at) }}
              </div>
            </div>
          </div>

          <!-- Production History -->
          <div
            class="bg-secondaryColor/10 border border-primaryColor/20 p-4 rounded-xl"
          >
            <h4 class="font-semibold text-primaryColor mb-4">
              <Activity class="w-4 h-4 inline mr-2" />
              Production History
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-primaryColor">
                  {{ selectedItem?.total_produced || 0 }}
                </div>
                <div class="text-xs text-primaryColor">Total Produced</div>
                <div class="text-xs text-gray-500">
                  {{ selectedItem?.unit_of_measure }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-primaryColor">
                  {{ selectedItem?.last_batch_size || 0 }}
                </div>
                <div class="text-xs text-primaryColor">Last Batch Size</div>
                <div class="text-xs text-gray-500">
                  {{ selectedItem?.unit_of_measure }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-primaryColor">
                  {{
                    selectedItem?.last_produced_date
                      ? formatDate(selectedItem.last_produced_date)
                      : 'Never'
                  }}
                </div>
                <div class="text-xs text-primaryColor">Last Produced</div>
                <div class="text-xs text-gray-500">Date</div>
              </div>
            </div>
          </div>

          <!-- Production Capacity -->
          <div
            class="bg-secondaryColor/10 border border-primaryColor/20 p-4 rounded-xl"
          >
            <h4 class="font-semibold text-primaryColor mb-4">
              <Target class="w-4 h-4 inline mr-2" />
              Production Capacity
            </h4>
            <div
              class="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
            >
              <div class="form-control">
                <label class="label mb-1">
                  <span
                    class="label-text text-black/70 font-medium text-sm sm:text-base"
                    >Current Status</span
                  >
                </label>
                <div>
                  <span
                    class="badge badge-sm border-none font-medium"
                    :class="
                      selectedItem?.available_quantity > 0
                        ? 'badge-success bg-success/20 text-success'
                        : getProductionCapacity(selectedItem).can_produce
                          ? 'badge-warning bg-warning/20 text-warning'
                          : 'badge-error bg-error/20 text-error'
                    "
                  >
                    {{
                      selectedItem?.available_quantity > 0
                        ? 'In Stock'
                        : getProductionCapacity(selectedItem).can_produce
                          ? 'Ready to Produce'
                          : 'Capacity Limited'
                    }}
                  </span>
                </div>
              </div>

              <div class="form-control">
                <label class="label mb-1">
                  <span
                    class="label-text text-black/70 font-medium text-sm sm:text-base"
                    >Max Batches</span
                  >
                </label>
                <div class="text-sm text-primaryColor font-semibold">
                  {{ getProductionCapacity(selectedItem).max_batches }}
                  <span class="text-xs text-black/50">batches</span>
                </div>
              </div>

              <div class="form-control">
                <label class="label mb-1">
                  <span
                    class="label-text text-black/70 font-medium text-sm sm:text-base"
                    >Limiting Factor</span
                  >
                </label>
                <div class="text-sm text-primaryColor font-semibold">
                  {{ getProductionCapacity(selectedItem).limiting_factor }}
                </div>
                <div
                  v-if="getProductionCapacity(selectedItem).limiting_ingredient"
                  class="text-xs text-black/50 mt-1"
                >
                  Ingredient:
                  {{ getProductionCapacity(selectedItem).limiting_ingredient }}
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Quality Inspections -->
          <div
            v-if="
              selectedItem?.recent_inspections &&
              selectedItem.recent_inspections.length > 0
            "
            class="bg-secondaryColor/10 border border-primaryColor/20 p-4 rounded-xl"
          >
            <h4 class="font-semibold text-primaryColor mb-4">
              <CheckCircle class="w-4 h-4 inline mr-2" />
              Recent Quality Inspections
            </h4>
            <div class="space-y-3">
              <div
                v-for="inspection in selectedItem.recent_inspections"
                :key="inspection.inspection_date"
                class="flex items-center justify-between p-3 bg-white border border-black/10 rounded-xl"
              >
                <div>
                  <div class="font-medium text-primaryColor">
                    {{ formatDate(inspection.inspection_date) }}
                  </div>
                  <div class="text-sm text-black/70">
                    by {{ inspection.inspector_name }}
                  </div>
                </div>
                <div class="text-right">
                  <span
                    class="badge badge-sm"
                    :class="
                      inspection.result === 'Pass'
                        ? 'badge-success'
                        : 'badge-error'
                    "
                  >
                    {{ inspection.result }}
                  </span>
                  <div
                    v-if="inspection.overall_quality_score"
                    class="text-sm text-primaryColor font-semibold mt-1"
                  >
                    Score: {{ inspection.overall_quality_score }}/10
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeDetailsModal"
            class="btn btn-sm bg-white text-black/70 border border-black/20 hover:bg-primaryColor/10 hover:border-primaryColor/40 rounded-lg shadow-none font-thin"
          >
            Close
          </button>
          <button
            @click="openUpdateModal(selectedItem, 'stock')"
            class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
          >
            <Package class="w-4 h-4 mr-2" />
            Update Stock
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDetailsModal">close</button>
      </form>
    </dialog>

    <!-- Distribution Modal -->
    <dialog
      id="distribution_modal"
      class="modal"
      :class="{
        'modal-open': showDistributionModal && selectedItem && selectedItem.id,
      }"
    >
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg text-primaryColor mb-6">
          Distribute {{ selectedItem?.item_name }}
        </h3>

        <form @submit.prevent="recordDistribution" class="space-y-4">
          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
                >Available Stock</span
              >
            </label>
            <div class="text-lg font-bold text-primaryColor">
              {{ selectedItem?.available_quantity }}
              {{ selectedItem?.unit_of_measure }}
            </div>
          </div>

          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
                >Quantity to Distribute</span
              >
            </label>
            <input
              v-model.number="distributionForm.quantity"
              type="number"
              min="1"
              :max="selectedItem?.available_quantity"
              class="input input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              placeholder="Enter quantity to distribute"
              required
            />
            <div class="label">
              <span class="label-text-alt text-black/50">
                Unit: {{ selectedItem?.unit_of_measure }}
              </span>
            </div>
          </div>

          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
                >Branch</span
              >
            </label>
            <select
              v-model="distributionForm.branch_id"
              class="select select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              required
            >
              <option value="">Select branch</option>
              <option
                v-for="branch in branches"
                :key="branch.id"
                :value="branch.id"
              >
                {{ branch.name }} ({{ branch.code }})
              </option>
            </select>
          </div>

          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
                >Transfer Price</span
              >
            </label>
            <div class="relative">
              <span
                class="absolute left-3 top-1/2 transform -translate-y-1/2 text-black/50"
                >₱</span
              >
              <input
                v-model.number="distributionForm.transfer_price"
                type="number"
                min="0"
                step="0.01"
                class="input input-bordered w-full pl-8 bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                placeholder="0.00"
                required
              />
            </div>
            <div class="label">
              <span class="label-text-alt text-black/50">
                Price per unit for this distribution
              </span>
            </div>
          </div>

          <!-- Total Cost Display -->
          <div
            v-if="
              distributionForm.quantity > 0 &&
              distributionForm.transfer_price > 0
            "
            class="bg-secondaryColor/10 border border-primaryColor/20 p-4 rounded-xl"
          >
            <div class="flex items-center">
              <PhilippinePeso class="w-5 h-5 mr-2 text-primaryColor" />
              <div>
                <div class="font-medium text-primaryColor">
                  Total Distribution Cost
                </div>
                <div class="text-lg font-bold text-primaryColor">
                  ₱{{ Number(distributionTotal).toFixed(2) }}
                </div>
              </div>
            </div>
          </div>

          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
                >Notes (Optional)</span
              >
            </label>
            <textarea
              v-model="distributionForm.notes"
              class="textarea textarea-bordered w-full textarea-sm bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              rows="3"
              placeholder="Distribution notes..."
            ></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-black/10">
            <button
              type="button"
              @click="closeDistributionModal"
              class="btn btn-sm bg-white text-black/70 border border-black/20 hover:bg-primaryColor/10 hover:border-primaryColor/40 rounded-lg shadow-none font-thin"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
              :disabled="loading"
            >
              <span
                class="loading loading-spinner loading-sm mr-2"
                v-if="loading"
              ></span>
              <Truck class="w-4 h-4 mr-2" v-else />
              Record Distribution
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDistributionModal">close</button>
      </form>
    </dialog>

    <!-- Production Transaction Modal -->
    <ProductionTransactionModal
      :show="showTransactionModal"
      @close="closeTransactionModal"
    />
  </div>
</template>

<style scoped>
  .text-shadow-xs {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
</style>
