<script setup>
  import { useBranchReturnStore } from '../../stores/branchReturnStore';
  // Branch Returns Approval UI state
  const branchReturnStore = useBranchReturnStore();
  const showReturnsPanel = ref(false);
  const pendingReturns = computed(() =>
    (branchReturnStore.returns || []).filter((r) => r.status === 'Pending')
  );

  const loadPendingReturns = async () => {
    try {
      await branchReturnStore.fetchReturns({ status: 'Pending' });
    } catch (e) {
      console.error('Failed to load branch returns:', e);
    }
  };

  const refreshTimer = ref(null);
  onMounted(async () => {
    // Handle preloaded distribution from SCM RequestSupply Process action
    try {
      const state = router.options?.history?.state || {};
      const preload = state.preloadDistribution;
      if (preload && preload.items && preload.items.length) {
        if (preload.branch_id) inventoryStore.setCartBranch(preload.branch_id);
        for (const it of preload.items) {
          try {
            inventoryStore.addToDistributionCart({
              source: it.source || 'scm',
              item: it,
              item_id: it.menu_item_id || it.name,
              name: it.name,
              unit: it.unit,
              unit_price: Number(it.unit_price || 0),
              quantity: Number(it.quantity || 0),
              branch_id: preload.branch_id,
              mode: 'set',
            });
          } catch (e) {
            // skip invalid items
          }
        }
        // If we have a tab system, switch to distribution tab
        if (typeof switchToDistributionTab === 'function') {
          switchToDistributionTab();
        }
        // IMPORTANT: consume the preload so reloads don't re-add the draft
        try {
          const newState = { ...state };
          delete newState.preloadDistribution;
          window.history.replaceState(newState, document.title);
        } catch (_) {}
      }
    } catch (_) {}
    await loadPendingReturns();
    // Lightweight polling to surface new returns without full reload
    refreshTimer.value = setInterval(loadPendingReturns, 15000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadPendingReturns();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    // Store cleanup fn on the ref for removal in unmounted
    refreshTimer._onVisibility = onVisibility;
  });

  onUnmounted(() => {
    if (refreshTimer.value) clearInterval(refreshTimer.value);
    if (refreshTimer._onVisibility) {
      document.removeEventListener(
        'visibilitychange',
        refreshTimer._onVisibility
      );
    }
  });
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
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
    ChevronDown,
    ChevronUp,
    X,
    Filter,
    Calendar,
    HelpCircle,
    Trash,
    ArrowRightLeft,
    Info,
    Truck,
    Building2,
    Grid3X3,
    List,
    BriefcaseBusiness,
  } from 'lucide-vue-next';
  import { useInventoryStore } from '../../stores/inventoryStore.js';
  import { useBranchStore } from '../../stores/branchStore.js';
  import { useProductionStore } from '../../stores/productionStore.js';
  import InventoryConsumptionModal from '../../components/scm/InventoryConsumptionModal.vue';
  import InventoryAdjustmentModal from '../../components/scm/InventoryAdjustmentModal.vue';
  import TransactionModal from '../../components/scm/TransactionModal.vue';
  import InventoryDetailsModal from '../../components/scm/InventoryDetailsModal.vue';
  import BranchDistributionModal from '../../components/scm/BranchDistributionModal.vue';
  import BranchDistributionReceiptModal from '../../components/scm/BranchDistributionReceiptModal.vue';
  import { useBranchDistributionStore } from '../../stores/branchDistributionStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import { useRouter } from 'vue-router';
  // TinyMCE WYSIWYG editor (default export) and sanitizer for proofs
  // The TinyMCE Vue package exports the component as default
  import Editor from '@tinymce/tinymce-vue';
  const TinyMCEEditor = Editor;
  import { sanitizeHtml } from '../../utils/sanitizeHtml.js';
  import { getApiUrl, formatImageUrl } from '../../config/api.js';
  // Self-hosted TinyMCE runtime and plugins (avoid Tiny Cloud API key)
  import 'tinymce/tinymce';
  import tinymce from 'tinymce/tinymce';
  import 'tinymce/icons/default';
  import 'tinymce/themes/silver';
  import 'tinymce/models/dom/model';
  import 'tinymce/plugins/link';
  import 'tinymce/plugins/lists';
  import 'tinymce/plugins/image';
  // Local skin to prevent CDN fetch
  import 'tinymce/skins/ui/oxide/skin.min.css';
  // Ensure license applied before any editor inits
  try {
    tinymce?.EditorManager?.overrideDefaults?.({ license_key: 'gpl' });
  } catch (_) {}

  // TinyMCE configuration
  const tinyMCEConfig = computed(() => ({
    menubar: false,
    height: 200,
    plugins: 'link lists',
    toolbar:
      'undo redo | bold italic underline | bullist numlist | link customimage',
    automatic_uploads: true,
    images_upload_url: '/api/uploads/proofs',
    file_picker_types: 'image',
    // Ensure images inside the editor never overflow and scale responsively
    content_style:
      'html,body{max-width:100%;} img{max-width:100%;height:auto;display:block;margin:6px 0;}',
    // Allow styling on images and common inline elements
    valid_elements:
      'p,b,i,u,strong,em,ul,ol,li,br,a[href|target|rel],img[src|alt|title|class|style],span[class|style],div[class|style]',
    setup: (ed) => {
      ed.ui.registry.addButton('customimage', {
        icon: 'image',
        tooltip: 'Insert image',
        onAction: () => {
          pickAndUploadImage(
            (url) => ed.insertContent(`<img src="${formatImageUrl(url)}" />`),
            'inventory_confirm_modal'
          );
        },
      });
    },
    branding: false,
    skin: false,
    content_css: false,
    license_key: 'gpl',
    ui_container: 'body',
  }));
  const pickAndUploadImage = (
    callback,
    modalId = 'inventory_confirm_modal'
  ) => {
    try {
      const modal = document.getElementById(modalId);
      const wasOpen = !!modal?.open;
      // Close modal to avoid z-index issues with native pickers
      if (wasOpen)
        try {
          modal.close();
        } catch (_) {}
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg';
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        try {
          const res = await fetch(getApiUrl('/uploads/proofs'), {
            method: 'POST',
            body: fd,
          });
          const json = await res.json();
          if (res.ok && json.location) {
            callback(json.location);
          } else {
            alert(json.message || 'Upload failed');
          }
        } catch (e) {
          alert('Upload failed');
        }
        // Reopen modal after upload attempt
        if (wasOpen)
          try {
            modal.showModal();
          } catch (_) {}
      };
      input.click();
    } catch (_) {}
  };

  const router = useRouter();

  // Store
  const inventoryStore = useInventoryStore();
  const branchStore = useBranchStore();
  const productionStore = useProductionStore();
  const branchDistributionStore = useBranchDistributionStore();
  const authStore = useAuthStore();

  // Access store values as computed properties
  const categories = computed(() => inventoryStore.categories);
  // Branch Distribution History state
  const historyLoading = computed(() => branchDistributionStore.isLoading);
  const distributionHistory = computed(
    () => branchDistributionStore.distributions || []
  );
  const historyPagination = computed(() => branchDistributionStore.pagination);
  const historyStatusFilter = ref('');

  // Filtered distribution history
  const filteredDistributionHistory = computed(() => {
    let filtered = [...distributionHistory.value];

    if (historyStatusFilter.value) {
      filtered = filtered.filter(
        (dist) => dist.status === historyStatusFilter.value
      );
    }

    return filtered;
  });

  const fetchDistributionHistory = async (page = 1) => {
    try {
      await branchDistributionStore.fetchDistributions({ page, limit: 10 });
    } catch (_) {
      // noop toast handled in store
    }
  };

  const openHistoryReceipt = async (id) => {
    try {
      const dist = await branchDistributionStore.fetchDistributionById(id);
      if (!dist) return;

      // If distribution is rejected, show rejection notification instead of receipt
      if (dist.status === 'rejected') {
        showRejectionNotification(dist);
        return;
      }

      const receiptForModal = {
        completed_at: dist.created_at,
        reference: dist.reference,
        branch_name: dist.branch_name,
        status: dist.status,
        prepared_by:
          dist.prepared_by ||
          `${authStore?.user?.first_name || ''} ${authStore?.user?.last_name || ''}`.trim() ||
          authStore?.user?.full_name ||
          authStore?.user?.email ||
          'System',
        processed_by: dist.processed_by || null,
        completed_by: dist.completed_by || null,
        received_by: dist.processed_by || dist.completed_by || '',
        notes: dist.notes,
        // Include proofs uploaded by SCM (prepared) and Branch (received)
        prepared_proof_html: dist.prepared_proof_html || null,
        received_proof_html: dist.received_proof_html || null,
        items: (dist.items || []).map((it) => ({
          source: it.source,
          item_name: it.name,
          item_quantity: it.qty,
          item_unit: it.unit,
          item_unitPrice: it.unit_price,
          item_amount: it.amount,
        })),
        total_amount: dist.total_amount,
        rejected_items: dist.rejected_items || [],
      };
      distributionReceipt.value = { show: true, receipt: receiptForModal };
    } catch (_) {}
  };

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

  // Branches (from branchStore)
  const branches = computed(() => branchStore.branches || []);

  // Branch Distribution computed properties
  const availableInventoryForDistribution = computed(() => {
    if (distributionInventoryType.value === 'production') {
      return productionStore.productionInventory || [];
    }
    return currentInventory.value || [];
  });

  const filteredDistributionInventory = computed(() => {
    let filtered = availableInventoryForDistribution.value;

    if (distributionSearchQuery.value) {
      const query = distributionSearchQuery.value.toLowerCase();
      filtered = filtered.filter((item) => {
        const itemName =
          distributionInventoryType.value === 'production'
            ? item.item_name || item.menu_item_name
            : item.item_name || item.item_type_name;
        const categoryField = (
          item.category ||
          item.category_name ||
          ''
        ).toLowerCase();
        return (
          itemName?.toLowerCase().includes(query) ||
          item.item_code?.toLowerCase().includes(query) ||
          categoryField.includes(query)
        );
      });
    }

    if (distributionCategoryFilter.value) {
      filtered = filtered.filter(
        (item) =>
          (item.category || item.category_name) ===
          distributionCategoryFilter.value
      );
    }

    // Only show items with available stock and not expired (for SCM)
    filtered = filtered.filter((item) => {
      const quantity =
        distributionInventoryType.value === 'production'
          ? item.available_quantity || 0
          : parseFloat(item.quantity) || 0;
      if (quantity <= 0) return false;
      if (distributionInventoryType.value !== 'scm') return true;
      const exp = item.expiry_date || item.expiry || null;
      if (!exp || exp === 'N/A') return true;
      const today = new Date();
      const expDate = new Date(exp);
      return expDate >= new Date(today.toDateString());
    });

    return filtered.sort((a, b) => {
      const nameA =
        distributionInventoryType.value === 'production'
          ? a.item_name || a.menu_item_name
          : a.item_name || a.item_type_name;
      const nameB =
        distributionInventoryType.value === 'production'
          ? b.item_name || b.menu_item_name
          : b.item_name || b.item_type_name;
      return nameA?.localeCompare(nameB) || 0;
    });
  });

  const paginatedDistributionInventory = computed(() => {
    const start =
      (distributionCurrentPage.value - 1) * distributionItemsPerPage.value;
    return filteredDistributionInventory.value.slice(
      start,
      start + distributionItemsPerPage.value
    );
  });

  const totalDistributionPages = computed(() => {
    return Math.ceil(
      filteredDistributionInventory.value.length /
        distributionItemsPerPage.value
    );
  });

  const availableDistributionCategories = computed(() => {
    const categories = new Set();
    availableInventoryForDistribution.value.forEach((item) => {
      const cat = item.category || item.category_name;
      if (cat) categories.add(cat);
    });
    return Array.from(categories).sort();
  });

  // Local state
  const activeTab = ref('overview');
  const alertTab = ref('expiring');
  const currentPage = ref(1);
  const viewMode = ref('list'); // Add view mode for overview tab - default to cards

  const itemsPerPage = ref(10);
  const searchQuery = ref('');
  const categoryFilter = ref('');
  const expandedItems = ref(new Set());

  const forecastPeriod = ref('30');
  const forecastMethod = ref('moving_average');
  // Advanced forecasting controls
  const leadTimeDays = ref(7); // default 7 days
  const serviceLevel = ref(0.95); // 95%
  const windowProfile = ref('auto'); // auto|fast|medium|slow|custom
  const customWindowDays = ref(30);

  // Forecasting filter state
  const forecastCategoryFilter = ref('');
  const forecastPriorityFilter = ref('');
  const forecastConfidenceFilter = ref('');
  const forecastSearchQuery = ref('');
  const forecastShowItems = ref('all');

  // Forecasting pagination state
  const forecastCurrentPage = ref(1);
  const forecastItemsPerPage = ref(10);

  // Branch Distribution state
  // branches now from branchStore, productionInventory from productionStore
  const distributionLoading = ref(false);
  const distributionSearchQuery = ref('');
  const distributionCategoryFilter = ref('');
  const distributionInventoryType = ref('scm'); // 'scm' or 'production'
  const distributionCurrentPage = ref(1);
  const distributionItemsPerPage = ref(12);

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

  // Proof HTML from TinyMCE editor (Prepared By only; branch will provide Received By proof)
  const preparedProofHtml = ref('');

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
    received_by:
      `${authStore?.user?.first_name || ''} ${authStore?.user?.last_name || ''}`.trim() ||
      authStore?.user?.full_name ||
      authStore?.user?.email ||
      'System',
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

  const totalItems = computed(() => {
    return groupedInventory.value.length;
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

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'N/A';

    const now = new Date();
    const date = new Date(dateString);
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
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

  // Build low-stock items with example underlying item names from current inventory
  const lowStockAlertItems = computed(() => {
    const byTypeId = new Map();
    // Index current inventory by item_type_id -> array of items with quantities
    (currentInventory.value || []).forEach((inv) => {
      if (!byTypeId.has(inv.item_type_id)) byTypeId.set(inv.item_type_id, []);
      byTypeId.get(inv.item_type_id).push(inv);
    });

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

      if (!(matchesSearch && matchesCategory)) return false;

      // Attach top underlying item names (e.g., Coke, Sprite) with quantities
      const invList = byTypeId.get(item.item_type_id) || [];
      const nameTotals = new Map();
      invList.forEach((row) => {
        const key = row.item_name || row.item_type_name;
        const qty = parseFloat(row.quantity || 0);
        nameTotals.set(key, (nameTotals.get(key) || 0) + qty);
      });
      const topItems = Array.from(nameTotals.entries())
        .sort((a, b) => a[1] - b[1]) // show lowest first
        .slice(0, 3)
        .map(([name, qty]) => ({ name, qty }));
      item._top_items = topItems; // non-reactive decoration for rendering
      return true;
    });
  });

  // Item-level forecasting with granular data
  const inventoryForecasts = computed(() => {
    if (!currentInventory.value || !recentActivity.value) return [];

    // Create individual item forecasts instead of grouping by item type
    const itemForecasts = [];

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
      return arr;
    };

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

    const cutoffDays = parseInt(forecastPeriod.value);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - cutoffDays);

    // Process each individual inventory item
    currentInventory.value.forEach((item) => {
      // Find consumption transactions for this specific item
      const itemTransactions = recentActivity.value
        .filter(
          (activity) =>
            activity.transaction_type === 'consumption' &&
            new Date(activity.transaction_date) >= cutoff &&
            (activity.inventory_item_id == item.id ||
              activity.item_type_id == item.item_type_id)
        )
        .map((t) => ({
          date: t.transaction_date,
          quantity: parseFloat(t.quantity || 0),
        }));

      // Calculate usage statistics
      const last30Total = itemTransactions
        .filter((t) => new Date(t.date) >= new Date(Date.now() - 30 * 86400000))
        .reduce((s, t) => s + t.quantity, 0);
      const velocityAvgDaily = last30Total / 30;
      const windowDays = autoWindowForVelocity(velocityAvgDaily);

      // Build daily usage series for the window
      const dateKeys = lastNDates(windowDays);
      const usageByDate = new Map(dateKeys.map((k) => [k, 0]));
      itemTransactions.forEach((t) => {
        const k = new Date(t.date).toISOString().slice(0, 10);
        if (usageByDate.has(k)) {
          usageByDate.set(k, usageByDate.get(k) + t.quantity);
        }
      });
      const dailySeries = dateKeys.map((k) => usageByDate.get(k));

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
      const todayIndex = n;
      const trendDailyToday = Math.max(0, a + b * todayIndex);

      // Choose method
      const method = forecastMethod.value;
      const meanDaily =
        method === 'linear_trend' ? trendDailyToday : maAvgDaily;

      // Safety stock using normal approximation
      const mean = maAvgDaily;
      const stddev = (() => {
        if (n <= 1) return 0;
        const variance =
          dailySeries.reduce((s, v) => s + Math.pow(v - maAvgDaily, 2), 0) /
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
        meanDaily > 0 ? Math.floor(item.quantity / meanDaily) : Infinity;

      // Reorder date recommendation
      let reorderDate = '-';
      if (meanDaily > 0) {
        const daysUntilROP = (item.quantity - reorderPoint) / meanDaily;
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

      // Recommended action with priority levels
      let recommendedAction = 'Monitor';
      let priority = 0;
      if (meanDaily > 0) {
        if (daysUntilDepletion <= 7) {
          recommendedAction = 'Urgent';
          priority = 1;
        } else if (daysUntilDepletion <= 14) {
          recommendedAction = 'Reorder Soon';
          priority = 2;
        } else if (daysUntilDepletion <= 30) {
          recommendedAction = 'Plan Reorder';
          priority = 3;
        } else if (item.quantity <= reorderPoint) {
          recommendedAction = 'Reorder';
          priority = 4;
        } else {
          priority = 5;
        }
      }

      // Create individual item forecast
      itemForecasts.push({
        // Item identification
        id: item.id,
        item_name: item.item_name || item.item_type_name || 'Unnamed Item',
        item_type_id: item.item_type_id,
        item_type_name: item.item_type_name,
        category_name: item.category_name,

        // Stock details
        current_stock: parseFloat(item.quantity || 0),
        unit_of_measure: item.unit_of_measure,
        batch_number: item.batch_number,
        supplier_name: item.supplier_name,

        // Usage and forecasting
        avg_daily_usage: meanDaily,
        projected_demand: projectedDemand,
        reorder_point: reorderPoint,
        safety_stock: safetyStock,

        // Timing
        reorder_date: reorderDate,
        days_until_depletion: daysUntilDepletion,

        // Recommendations
        recommended_action: recommendedAction,
        priority: priority,

        // Financial
        unit_cost: parseFloat(item.unit_cost || 0),
        total_value: parseFloat(item.total_value || 0),

        // Metadata
        last_activity:
          itemTransactions.length > 0
            ? new Date(
                Math.max(...itemTransactions.map((t) => new Date(t.date)))
              ).toLocaleDateString()
            : 'No activity',
        usage_confidence: n >= 7 ? 'High' : n >= 3 ? 'Medium' : 'Low',
      });
    });

    // Sort by priority (urgent first) and then by days until depletion
    return itemForecasts.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (
        a.days_until_depletion !== Infinity &&
        b.days_until_depletion !== Infinity
      ) {
        return a.days_until_depletion - b.days_until_depletion;
      }
      if (a.days_until_depletion === Infinity) return 1;
      if (b.days_until_depletion === Infinity) return -1;
      return 0;
    });
  });

  // Filtered forecasts based on user selections
  const filteredInventoryForecasts = computed(() => {
    let filtered = inventoryForecasts.value;

    // Category filter
    if (forecastCategoryFilter.value) {
      filtered = filtered.filter(
        (item) =>
          item.category_name &&
          item.category_name
            .toLowerCase()
            .includes(forecastCategoryFilter.value.toLowerCase())
      );
    }

    // Priority filter
    if (forecastPriorityFilter.value) {
      filtered = filtered.filter(
        (item) => item.priority == forecastPriorityFilter.value
      );
    }

    // Confidence filter
    if (forecastConfidenceFilter.value) {
      filtered = filtered.filter(
        (item) => item.usage_confidence === forecastConfidenceFilter.value
      );
    }

    // Search query filter
    if (forecastSearchQuery.value) {
      const query = forecastSearchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.item_name.toLowerCase().includes(query) ||
          (item.supplier_name &&
            item.supplier_name.toLowerCase().includes(query)) ||
          (item.batch_number &&
            item.batch_number.toLowerCase().includes(query)) ||
          item.item_type_name.toLowerCase().includes(query)
      );
    }

    // Show items filter
    switch (forecastShowItems.value) {
      case 'with_usage':
        filtered = filtered.filter((item) => item.avg_daily_usage > 0);
        break;
      case 'critical':
        filtered = filtered.filter((item) => item.days_until_depletion <= 7);
        break;
      case 'needs_reorder':
        filtered = filtered.filter((item) => item.priority <= 4);
        break;
      default:
        // 'all' - no filtering
        break;
    }

    return filtered;
  });

  // Pagination computed properties for forecasting
  const paginatedInventoryForecasts = computed(() => {
    const start = (forecastCurrentPage.value - 1) * forecastItemsPerPage.value;
    return filteredInventoryForecasts.value.slice(
      start,
      start + forecastItemsPerPage.value
    );
  });

  const totalForecastPages = computed(() =>
    Math.ceil(
      filteredInventoryForecasts.value.length / forecastItemsPerPage.value
    )
  );

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
      return {
        icon: Trash,
        color: 'text-error',
        label: 'Disposed',
        badgeColor: 'bg-error/20 text-error',
        description:
          'Item was disposed due to damage, expiry, or other reasons',
      };
    }

    // Treat reduce_quantity adjustments as Distribution (transfer-out)
    if (type === 'adjustment' && adjustmentType === 'reduce_quantity') {
      return {
        icon: ArrowRightLeft,
        color: 'text-primary',
        label: 'Distribution',
        badgeColor: 'bg-primary/20 text-primary',
        description: 'Item was distributed/transferred out to a branch',
      };
    }

    const typeInfo = {
      receipt: {
        icon: Package,
        color: 'text-success',
        label: 'Received',
        badgeColor: 'bg-success/20 text-success',
        description: 'Item was received and added to inventory',
      },
      consumption: {
        icon: Minus,
        color: 'text-warning',
        label: 'Consumed',
        badgeColor: 'bg-warning/20 text-warning',
        description: 'Item was consumed or used in operations',
      },
      adjustment: {
        icon: RefreshCcw,
        color: 'text-info',
        label: 'Adjusted',
        badgeColor: 'bg-info/20 text-info',
        description: 'Item quantity was adjusted for corrections',
      },
      return: {
        icon: ArrowRightLeft,
        color: 'text-error',
        label: 'Returned',
        badgeColor: 'bg-error/20 text-error',
        description: 'Item was returned to supplier or source',
      },
      transfer: {
        icon: ArrowRightLeft,
        color: 'text-primary',
        label: 'Transferred',
        badgeColor: 'bg-primary/20 text-primary',
        description: 'Item was transferred between locations',
      },
      expiry: {
        icon: Calendar,
        color: 'text-error',
        label: 'Expired',
        badgeColor: 'bg-error/20 text-error',
        description: 'Item has reached its expiration date',
      },
      damage: {
        icon: Minus,
        color: 'text-error',
        label: 'Damaged',
        badgeColor: 'bg-error/20 text-error',
        description: 'Item was damaged and removed from stock',
      },
      disposal: {
        icon: Trash,
        color: 'text-error',
        label: 'Disposed',
        badgeColor: 'bg-error/20 text-error',
        description:
          'Item was disposed due to damage, expiry, or other reasons',
      },
      production_consumption: {
        icon: Package,
        color: 'text-primary',
        label: 'Production',
        badgeColor: 'bg-primary/20 text-primary',
        description: 'Item was consumed for production batch',
      },
      production_output: {
        icon: Package,
        color: 'text-success',
        label: 'Produced',
        badgeColor: 'bg-success/20 text-success',
        description: 'Finished goods added from production',
      },
    };
    return (
      typeInfo[type] || {
        icon: HelpCircle,
        color: 'text-neutral',
        label: type,
        badgeColor: 'bg-gray-100 text-gray-600',
        description: 'Transaction type information',
      }
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

  // Helper function to get category status information
  const getCategoryStatusInfo = (status) => {
    const statusInfo = {
      active: {
        icon: CheckCircle,
        color: 'text-success',
        label: 'Active',
        description: 'Category has active items with good stock levels',
      },
      low_stock: {
        icon: AlertTriangle,
        color: 'text-warning',
        label: 'Low Stock',
        description: 'Category has items with limited stock',
      },
      out_of_stock: {
        icon: XCircle,
        color: 'text-error',
        label: 'Out of Stock',
        description: 'Category has items but no current stock',
      },
      empty: {
        icon: Package,
        color: 'text-gray-500',
        label: 'Empty',
        description: 'Category has no items configured',
      },
      disabled: {
        icon: XCircle,
        color: 'text-error',
        label: 'Disabled',
        description: 'Category is disabled in the system',
      },
    };
    return statusInfo[status] || statusInfo.disabled;
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

  // Clear filters helper
  const clearFilters = () => {
    searchQuery.value = '';
    categoryFilter.value = '';
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

  const closeModal = () => {
    modal.value = { type: null, show: false, item: null };
  };

  const closeTransactionModal = () => {
    transactionModal.value = { show: false };
  };

  // Handle query parameters for production integration
  const handleQueryParameters = () => {
    const query = router.currentRoute.value.query;

    // Check if we should open transaction modal with production filter
    if (query.filter === 'production' && query.transaction_type) {
      // Open transaction modal with production transactions filter
      transactionModal.value = {
        show: true,
        initialFilter: {
          transaction_type: query.transaction_type,
        },
      };

      // Clear the query parameters after handling
      router.replace({ path: '/scm/main-inventory' });
    }
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

  // Open InventoryDetailsModal from low stock alert card by selecting a representative batch
  const viewItemDetailsFromAlert = (alertItem) => {
    // Prefer the exact batch from the alert payload when available
    if (alertItem && alertItem.id) {
      // Open details by ID even if it's not in the current list (e.g., qty=0 hidden)
      detailsModal.value = { show: true, inventoryItemId: alertItem.id };
      return;
    }
    // Fallback: search by item_type and pick a sensible candidate
    const batches = (currentInventory.value || []).filter(
      (b) => b.item_type_id === alertItem.item_type_id
    );
    if (!batches.length) {
      showToast('error', 'No batch found for this item');
      return;
    }
    // Prefer the batch with quantity below threshold if present
    const threshold = parseFloat(
      alertItem.min_stock_level ?? alertItem.reorder_level ?? 0
    );
    const below = batches.filter(
      (b) => parseFloat(b.quantity || 0) <= threshold
    );
    const target = (below.length ? below : batches).sort(
      (a, b) => parseFloat(a.quantity || 0) - parseFloat(b.quantity || 0)
    )[0];
    detailsModal.value = { show: true, inventoryItemId: target.id };
  };

  // Navigate to RequestSupply and preload items derived from related alerts
  const createSupplyRequestFromAlert = (alertItem) => {
    // Build items from all low-stock alerts in the same category as the clicked alert
    const sameCategoryAlerts = (lowStockItems.value || []).filter(
      (x) => x.category_name === alertItem.category_name
    );

    // Helper to resolve unit
    const resolveUnit = (it) => {
      if (it.unit_of_measure) return it.unit_of_measure;
      const m = (currentInventory.value || []).find(
        (b) => b.id == it.id || b.item_type_id === it.item_type_id
      );
      return m?.unit_of_measure || '';
    };

    // Helper to resolve a fair unit price from existing batches
    const resolveUnitPrice = (it) => {
      try {
        // Use provided unit_cost when available (per-batch alerts)
        const direct = parseFloat(it.unit_cost || it.unit_price || 0);
        if (!isNaN(direct) && direct > 0) return direct;

        // Otherwise compute weighted-average from current inventory for the same item_type
        const batches = (currentInventory.value || []).filter(
          (b) => b.item_type_id === it.item_type_id
        );
        if (!batches.length) return 0;
        const totals = batches.reduce(
          (acc, b) => {
            const q = parseFloat(b.quantity || 0) || 0;
            const c = parseFloat(b.unit_cost || 0) || 0;
            acc.qty += q;
            acc.value += q * c;
            return acc;
          },
          { qty: 0, value: 0 }
        );
        if (totals.qty > 0 && totals.value > 0)
          return totals.value / totals.qty;
        // Fallback to first available batch cost
        const first = batches.find((b) => parseFloat(b.unit_cost || 0) > 0);
        return first ? parseFloat(first.unit_cost) : 0;
      } catch {
        return 0;
      }
    };

    const items = sameCategoryAlerts.map((it) => {
      const unit = resolveUnit(it);
      const deficit = Math.max(
        1,
        Math.ceil(
          Math.max(
            0,
            parseFloat(it.min_stock_level || 0) -
              parseFloat(it.current_stock || 0)
          )
        )
      );

      // Debug logging to help identify the issue
      console.log('Processing alert item:', {
        id: it.id,
        item_name: it.item_name,
        item_type_name: it.item_type_name,
        item_type_id: it.item_type_id,
        category_name: it.category_name,
        current_stock: it.current_stock,
        min_stock_level: it.min_stock_level,
      });

      // Ensure we have a proper item name
      const itemName = it.item_name || it.item_type_name || 'Unknown Item';

      return {
        name: itemName,
        unit,
        unit_price: resolveUnitPrice(it),
        quantity: deficit,
        item_type_id: it.item_type_id, // Include item_type_id for matching with supplier products
      };
    });

    // Pass preload via router state
    try {
      const state = {
        preloadDistribution: null,
        preloadSupplyRequest: {
          items,
          category: alertItem.category_name,
          item_type_id: alertItem.item_type_id,
          source: 'scm',
          // Include supplier information - prefer explicit alert supplier, then item-type defaults, then current inventory
          supplier_id: (() => {
            if (alertItem.supplier_id) return alertItem.supplier_id;
            // Try to resolve from itemTypes metadata (preferred/default supplier)
            try {
              const type = (itemTypes.value || []).find(
                (t) => t.id === alertItem.item_type_id
              );
              if (type) {
                const typeSupplierId =
                  type.preferred_supplier_id ||
                  type.default_supplier_id ||
                  type.supplier_id ||
                  null;
                if (typeSupplierId) return typeSupplierId;
              }
            } catch (_) {}
            // Fallback to any matching current inventory batch (may be absent if stock is zero)
            try {
              const inventoryItem = (currentInventory.value || []).find(
                (item) =>
                  item.item_type_id === alertItem.item_type_id ||
                  item.id === alertItem.id
              );
              return inventoryItem?.supplier_id || null;
            } catch (_) {
              return null;
            }
          })(),
          supplier_name: (() => {
            if (alertItem.supplier_name) return alertItem.supplier_name;
            // Try to resolve from itemTypes metadata
            try {
              const type = (itemTypes.value || []).find(
                (t) => t.id === alertItem.item_type_id
              );
              if (type) {
                const typeSupplierName =
                  type.preferred_supplier_name ||
                  type.default_supplier_name ||
                  type.supplier_name ||
                  null;
                if (typeSupplierName) return typeSupplierName;
              }
            } catch (_) {}
            // Fallback to current inventory
            try {
              const inventoryItem = (currentInventory.value || []).find(
                (item) =>
                  item.item_type_id === alertItem.item_type_id ||
                  item.id === alertItem.id
              );
              return inventoryItem?.supplier_name || null;
            } catch (_) {
              return null;
            }
          })(),
        },
      };
      console.log(
        'MainInventory - Navigating to RequestSupply with state:',
        state
      );
      console.log('Alert item data:', alertItem);
      console.log('Alert item keys:', Object.keys(alertItem));
      console.log('Alert item supplier info:', {
        supplier_id: alertItem.supplier_id,
        supplier_name: alertItem.supplier_name,
        hasSupplierId: 'supplier_id' in alertItem,
        hasSupplierName: 'supplier_name' in alertItem,
      });

      // Check current inventory for supplier info
      const inventoryItem = currentInventory.value.find(
        (item) =>
          item.item_type_id === alertItem.item_type_id ||
          item.id === alertItem.id
      );
      console.log('Found inventory item for supplier lookup:', inventoryItem);
      console.log('Final supplier info being sent:', {
        supplier_id: state.preloadSupplyRequest.supplier_id,
        supplier_name: state.preloadSupplyRequest.supplier_name,
      });

      // Store preload data in sessionStorage as a backup
      sessionStorage.setItem(
        'preloadSupplyRequest',
        JSON.stringify(state.preloadSupplyRequest)
      );

      router.push({
        name: 'RequestSupply',
        state: state,
      });
    } catch (e) {
      showToast('error', 'Failed to navigate to Request Supply');
    }
  };

  const getExpiryStatusText = (expiryDate) => {
    const days = getDaysUntilExpiry(expiryDate);
    if (days <= 0) return 'Expired';
    if (days <= 3) return `${days}d left`;
    if (days <= 7) return `${days}d left`;
    return 'Good';
  };

  // Batch-level low stock evaluation (UI override for Status column)
  const getBatchStockStatus = (batch) => {
    try {
      const qty = parseFloat(batch.quantity ?? 0);
      const threshold = parseFloat(
        batch.reorder_level ?? batch.min_stock_level ?? 0
      );
      if (!isNaN(qty) && !isNaN(threshold) && threshold > 0) {
        if (qty <= threshold) {
          // Show critical when qty is 0 or <= 20% of threshold
          return qty === 0 || qty <= threshold * 0.2 ? 'critical' : 'low';
        }
      }
      return 'normal';
    } catch (_) {
      return 'normal';
    }
  };

  const getBatchStatusBadgeClass = (batch) => {
    const state = getBatchStockStatus(batch);
    if (state === 'critical')
      return 'badge-sm border-none font-medium bg-error/20 text-error';
    if (state === 'low')
      return 'badge-sm border-none font-medium bg-warning/20 text-warning';
    // Fall back to existing status color mapping
    return getStatusColor(batch.status);
  };

  const getBatchStatusText = (batch) => {
    const state = getBatchStockStatus(batch);
    if (state === 'critical') return 'critical';
    if (state === 'low') return 'low stock';
    return batch.status || 'available';
  };

  // Helper function to format batch numbers for better readability
  const formatBatchNumber = (batchNumber) => {
    if (!batchNumber || batchNumber === 'N/A') return 'N/A';

    // Handle PO-generated batch numbers: PO-1756625418014-ITEM-32-6-20250831
    if (batchNumber.startsWith('PO-')) {
      const parts = batchNumber.split('-');
      if (parts.length >= 6) {
        const poNumber = parts[1];
        const date = parts[5];

        // Extract year, month, and day from date: 20250831 -> 25-08-31
        const year = date.substring(2, 4); // Last 2 digits of year
        const month = date.substring(4, 6);
        const day = date.substring(6, 8);

        return `Batch #${poNumber.substring(poNumber.length - 2)}-${year}${month}${day}`;
      }
    }

    // Handle GRN-generated batch numbers: GRN-26-26-6-20250905-1430
    if (batchNumber.startsWith('GRN-')) {
      const parts = batchNumber.split('-');
      if (parts.length >= 6) {
        const grnId = parts[1];
        const itemType = parts[2];
        const date = parts[4];

        // Extract year, month, and day from date: 20250905 -> 25-09-05
        const year = date.substring(2, 4); // Last 2 digits of year
        const month = date.substring(4, 6);
        const day = date.substring(6, 8);

        return `Batch #${grnId}-${year}${month}${day}`;
      }
    }

    // For other formats, return a simplified version
    return batchNumber.length > 20
      ? `${batchNumber.substring(0, 20)}...`
      : batchNumber;
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
                performed_by:
                  `${authStore?.user?.first_name || ''} ${authStore?.user?.last_name || ''}`.trim() ||
                  authStore?.user?.full_name ||
                  authStore?.user?.email ||
                  'System',
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
              performed_by:
                `${authStore?.user?.first_name || ''} ${authStore?.user?.last_name || ''}`.trim() ||
                authStore?.user?.full_name ||
                authStore?.user?.email ||
                'System',
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

  const confirmLoading = ref(false);

  const handleConfirmAction = async () => {
    if (confirmModal.value.onConfirm) {
      try {
        confirmLoading.value = true;
        await confirmModal.value.onConfirm();
      } finally {
        confirmLoading.value = false;
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

  // Refresh data for Branch Distribution tab only (no full page reload)
  const refreshDistributionData = async () => {
    try {
      distributionLoading.value = true;
      await Promise.all([
        fetchBranches(),
        distributionInventoryType.value === 'production'
          ? fetchProductionInventory()
          : inventoryStore.fetchCurrentInventory(),
      ]);
      showToast('success', 'Branch Distribution refreshed');
    } catch (error) {
      showToast('error', 'Failed to refresh Branch Distribution');
    } finally {
      distributionLoading.value = false;
    }
  };

  // Reset forecasting pagination
  const resetForecastPagination = () => {
    forecastCurrentPage.value = 1;
  };

  // Handle forecasting page change
  const goToForecastPage = (page) => {
    if (page >= 1 && page <= totalForecastPages.value) {
      forecastCurrentPage.value = page;
    }
  };

  // Handle forecasting items per page change
  const changeForecastItemsPerPage = (newPerPage) => {
    forecastItemsPerPage.value = newPerPage;
    forecastCurrentPage.value = 1; // Reset to first page
  };

  // Export current page of forecasts
  const exportCurrentPageForecasts = () => {
    const currentPageData = paginatedInventoryForecasts.value;
    if (currentPageData.length === 0) {
      showToast('warning', 'No forecasts to export');
      return;
    }

    // Create CSV content
    const headers = [
      'Item Name',
      'Category',
      'Current Stock',
      'Daily Usage',
      'Days Until Depletion',
      'Recommended Action',
      'Priority',
    ];
    const csvContent = [
      headers.join(','),
      ...currentPageData.map((item) =>
        [
          item.item_name,
          item.category_name,
          item.current_stock,
          item.avg_daily_usage,
          item.days_until_depletion,
          item.recommended_action,
          item.priority,
        ].join(',')
      ),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_forecasts_page_${forecastCurrentPage}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showToast(
      'success',
      `Exported ${currentPageData.length} forecasts from page ${forecastCurrentPage}`
    );
  };

  // Handle keyboard navigation for forecasting pagination
  const handleForecastKeyNavigation = (event) => {
    if (event.target.closest('.forecasting-section')) {
      switch (event.key) {
        case 'ArrowLeft':
          if (forecastCurrentPage.value > 1) {
            event.preventDefault();
            goToForecastPage(forecastCurrentPage.value - 1);
          }
          break;
        case 'ArrowRight':
          if (forecastCurrentPage.value < totalForecastPages.value) {
            event.preventDefault();
            goToForecastPage(forecastCurrentPage.value + 1);
          }
          break;
        case 'Home':
          event.preventDefault();
          goToForecastPage(1);
          break;
        case 'End':
          event.preventDefault();
          goToForecastPage(totalForecastPages.value);
          break;
      }
    }
  };

  // Branch Distribution Methods
  const fetchBranches = async () => {
    try {
      await branchStore.fetchBranches(true);
    } catch (error) {
      console.error('Error fetching branches:', error);
      showToast('error', 'Failed to fetch branches');
    }
  };

  const fetchProductionInventory = async () => {
    try {
      await productionStore.fetchProductionInventory();
    } catch (error) {
      console.error('Error fetching production inventory:', error);
      showToast('error', 'Failed to fetch production inventory');
    }
  };

  const openDistributionModal = (item) => {
    if (!item || !item.id) {
      console.error('Invalid item provided to openDistributionModal:', item);
      return;
    }
    modal.value = { type: 'distribution', show: true, item };
  };

  const handleDistribution = async (distributionData) => {
    try {
      const isProduction = distributionInventoryType.value === 'production';
      const itemName = isProduction
        ? distributionData.item.item_name ||
          distributionData.item.menu_item_name
        : distributionData.item.item_name ||
          distributionData.item.item_type_name;

      // Build confirmation details
      const qtyLabel = `${parseFloat(distributionData.quantity).toLocaleString()} ${distributionData.item.unit_of_measure || 'units'}`;
      const branchName =
        branches.value.find((b) => b.id === distributionData.branch_id)?.name ||
        'Selected Branch';

      confirmModal.value = {
        show: true,
        title: 'Confirm Distribution',
        message: `Distribute ${qtyLabel} of ${itemName} to ${branchName}?`,
        onConfirm: async () => {
          try {
            if (isProduction) {
              await productionStore.recordDistribution(
                distributionData.item.menu_item_id || distributionData.item.id,
                {
                  branch_id: distributionData.branch_id,
                  quantity: distributionData.quantity,
                  transfer_price: distributionData.transfer_price,
                  notes: distributionData.notes,
                }
              );
            } else {
              // Use bulk method even for single items for consistency
              const preparedName =
                `${authStore?.user?.first_name || ''} ${authStore?.user?.last_name || ''}`.trim() ||
                authStore?.user?.full_name ||
                authStore?.user?.email ||
                'System';

              const currentQty =
                parseFloat(distributionData.item.quantity) || 0;
              const distributeQty = parseFloat(distributionData.quantity) || 0;
              const newQty = currentQty - distributeQty;

              await inventoryStore.bulkDistributeToBranch(
                [
                  {
                    inventory_item_id: distributionData.item.id,
                    current_quantity: currentQty,
                    new_quantity: newQty,
                    branch_id: distributionData.branch_id,
                    transfer_price: distributionData.transfer_price,
                    notes: distributionData.notes,
                  },
                ],
                preparedName
              );
            }

            showToast(
              'success',
              `${itemName} distributed successfully to ${branchName}`
            );
            closeModal();
            // Refresh data
            if (isProduction) {
              await fetchProductionInventory();
            } else {
              await inventoryStore.fetchCurrentInventory();
            }
          } catch (err) {
            showToast(
              'error',
              err.message || `Failed to distribute ${itemName}`
            );
          }
        },
      };
      document.getElementById('inventory_confirm_modal')?.showModal();
    } catch (error) {
      showToast('error', error.message || 'Failed to process distribution');
    }
  };

  // Add-to-cart from modal (draft receipt)
  const handleAddToDistributionCart = (distributionData) => {
    try {
      const isProduction = distributionInventoryType.value === 'production';
      const name = isProduction
        ? distributionData.item.item_name ||
          distributionData.item.menu_item_name
        : distributionData.item.item_name ||
          distributionData.item.item_type_name;
      const unit = distributionData.item.unit_of_measure || 'units';
      const unitPrice = Number(distributionData.transfer_price || 0);

      try {
        inventoryStore.addToDistributionCart({
          source: isProduction ? 'production' : 'scm',
          item: distributionData.item,
          item_id: distributionData.item.id,
          name,
          unit,
          unit_price: unitPrice,
          quantity: Number(distributionData.quantity || 0),
          branch_id: distributionData.branch_id,
          mode: 'set',
        });
      } catch (error) {
        showToast('error', error.message);
        return;
      }

      showToast('success', `${name} added to draft`);
      closeModal();
    } catch (err) {
      showToast('error', err.message || 'Failed to add to draft');
    }
  };

  const switchDistributionInventoryType = (type) => {
    distributionInventoryType.value = type;
    distributionCurrentPage.value = 1;
    distributionSearchQuery.value = '';
    distributionCategoryFilter.value = '';
    // Ensure the visible list reflects the selected source
    refreshDistributionData();
  };

  const goToDistributionPage = (page) => {
    if (page >= 1 && page <= totalDistributionPages.value) {
      distributionCurrentPage.value = page;
    }
  };

  const changeDistributionItemsPerPage = (newPerPage) => {
    distributionItemsPerPage.value = newPerPage;
    distributionCurrentPage.value = 1;
  };

  // Draft checkout: process cart items and build receipt
  const checkoutDistributionDraft = async () => {
    try {
      const cart = inventoryStore.distributionCart;
      if (!cart.branch_id || cart.items.length === 0) {
        showToast('error', 'Select a branch and add at least one item');
        return;
      }

      confirmModal.value = {
        show: true,
        title: 'Confirm Branch Distribution',
        message: '',
        details: {
          branch_name:
            branches.value.find((b) => b.id === cart.branch_id)?.name ||
            'Branch',
          items: cart.items.map((x) => ({
            key: x.key,
            name: x.name,
            source: x.source,
            qty: Number(x.quantity || 0),
            unit: x.unit,
            price: Number(x.unit_price || 0),
            amount: Number(x.unit_price || 0) * Number(x.quantity || 0),
            expiry_date: x.item?.expiry_date || null,
          })),
          total: cart.items.reduce(
            (s, x) => s + Number(x.unit_price || 0) * Number(x.quantity || 0),
            0
          ),
          notes: inventoryStore.distributionCart.notes || '',
        },
        onConfirm: async () => {
          let createdReceipt = null;
          try {
            // Step 1: Create consolidated receipt first
            const preparedName =
              `${authStore?.user?.first_name || ''} ${authStore?.user?.last_name || ''}`.trim() ||
              authStore?.user?.full_name ||
              authStore?.user?.email ||
              'System';

            const receiptData = {
              branch_id: cart.branch_id,
              prepared_by: preparedName,
              total_amount: cart.items.reduce(
                (s, x) => s + Number(x.unit_price) * Number(x.quantity),
                0
              ),
              notes: inventoryStore.distributionCart.notes || '',
              prepared_proof_html: sanitizeHtml(preparedProofHtml.value),
              items: cart.items.map((x) => ({
                source: x.source,
                item_ref_id: x.item_id,
                name: x.name,
                unit: x.unit,
                qty: x.quantity,
                unit_price: x.unit_price,
                amount: Number(x.unit_price) * Number(x.quantity),
                category:
                  x.item?.category_name || x.item?.category || 'Uncategorized',
                expiry_date: x.item?.expiry_date || null,
                notes: null,
              })),
            };

            createdReceipt =
              await branchDistributionStore.createDistribution(receiptData);

            // Step 2: Execute stock movements using bulk operations (optimized)
            const scmItems = [];
            const productionItems = [];

            // Separate items by source
            for (const it of cart.items) {
              if (it.source === 'production') {
                productionItems.push({
                  menu_item_id: it.item?.menu_item_id || it.item_id,
                  branch_id: cart.branch_id,
                  quantity: it.quantity,
                  transfer_price: it.unit_price,
                  notes: `Receipt: ${createdReceipt.reference}`,
                });
              } else {
                const currentQty = parseFloat(it.item.quantity) || 0;
                const distributeQty = parseFloat(it.quantity) || 0;
                const newQty = currentQty - distributeQty;

                const scmItem = {
                  inventory_item_id: it.item_id,
                  current_quantity: currentQty,
                  new_quantity: newQty,
                  branch_id: cart.branch_id,
                  transfer_price: it.unit_price,
                  notes: `Receipt: ${createdReceipt.reference}`,
                };
                scmItems.push(scmItem);
              }
            }

            // Create distribution records without deducting from main inventory
            // Items will only be deducted when accepted by the branch
            const distributionData = {
              branch_id: cart.branch_id,
              prepared_by: preparedName,
              total_amount: cart.total_amount,
              notes: `Receipt: ${createdReceipt.reference}`,
              items: [...scmItems, ...productionItems],
            };

            // Distribution record already created above via createDistribution
            // No need to call bulk-distribute here

            // Step 3: Show receipt toast (cart is cleared in finally)
            showToast(
              'success',
              `Distribution completed - Receipt ${createdReceipt.reference}`
            );

            // Step 4: Show the persisted receipt in modal
            const fullName =
              `${authStore?.user?.first_name || ''} ${authStore?.user?.last_name || ''}`.trim() ||
              authStore?.user?.full_name ||
              authStore?.user?.email ||
              'SCM User';

            const receiptForModal = {
              completed_at:
                createdReceipt.completed_at || createdReceipt.created_at,
              reference: createdReceipt.reference,
              branch_name: createdReceipt.branch_name,
              prepared_by: createdReceipt.prepared_by || fullName,
              processed_by: createdReceipt.processed_by || null,
              completed_by: createdReceipt.completed_by || null,
              received_by:
                createdReceipt.processed_by ||
                createdReceipt.completed_by ||
                '',
              notes: createdReceipt.notes,
              prepared_proof_html:
                createdReceipt.prepared_proof_html ||
                sanitizeHtml(preparedProofHtml.value),
              received_proof_html: createdReceipt.received_proof_html,
              items: createdReceipt.items.map((item) => ({
                source: item.source,
                item_name: item.name,
                item_quantity: item.qty,
                item_unit: item.unit,
                item_unitPrice: item.unit_price,
                item_amount: item.amount,
              })),
              total_amount: createdReceipt.total_amount,
            };

            distributionReceipt.value = {
              show: true,
              receipt: receiptForModal,
            };
          } catch (err) {
            showToast('error', err.message || 'Checkout failed');
          } finally {
            // Ensure the draft is cleared after a successful creation
            if (createdReceipt) {
              inventoryStore.clearDistributionCart();
            }
          }
        },
      };
      document.getElementById('inventory_confirm_modal')?.showModal();
    } catch (err) {
      showToast('error', err.message || 'Failed to checkout');
    }
  };

  // Remove a single item from confirm modal (also updates cart and totals)
  const removeItemFromConfirm = (key) => {
    try {
      if (!key) return;
      inventoryStore.removeFromCart(key);
      // Recompute confirm details
      const cart = inventoryStore.distributionCart;
      if (!confirmModal.value?.details) return;
      confirmModal.value.details.items =
        confirmModal.value.details.items.filter((x) => x.key !== key);
      confirmModal.value.details.total = cart.items.reduce(
        (s, x) => s + Number(x.unit_price || 0) * Number(x.quantity || 0),
        0
      );

      // If cart is empty, close modal
      if (cart.items.length === 0) {
        closeConfirmModal();
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to remove item');
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
        fetchBranches(),
        fetchProductionInventory(),
        fetchDistributionHistory(1),
      ]);

      // Handle query parameters for production integration
      handleQueryParameters();

      // Note: avoid re-calling inventory fetches here to prevent duplicates

      // Add keyboard navigation for forecasting pagination
      document.addEventListener('keydown', handleForecastKeyNavigation);
    } catch (error) {
      showToast('error', 'Failed to load inventory data');
    }
  });

  // Cleanup on unmount
  onUnmounted(() => {
    document.removeEventListener('keydown', handleForecastKeyNavigation);
  });

  // Receipt modal state
  const distributionReceipt = ref({ show: false, receipt: null });
  const closeDistributionReceipt = () => {
    distributionReceipt.value = { show: false, receipt: null };
  };

  // Rejection notification modal state
  const rejectionNotification = ref({
    show: false,
    distribution: null,
    acknowledging: false,
  });

  const showRejectionNotification = (distribution) => {
    rejectionNotification.value = {
      show: true,
      distribution: distribution,
      acknowledging: false,
    };
  };

  const closeRejectionNotification = () => {
    rejectionNotification.value = {
      show: false,
      distribution: null,
      acknowledging: false,
    };
  };

  const acknowledgeRejection = async () => {
    if (!rejectionNotification.value.distribution) return;

    rejectionNotification.value.acknowledging = true;

    try {
      // Use the store to acknowledge the rejection
      await branchDistributionStore.acknowledgeRejection(
        rejectionNotification.value.distribution.id,
        {
          acknowledged_by:
            authStore.user?.name ||
            `${authStore.user?.first_name || ''} ${authStore.user?.last_name || ''}`.trim() ||
            authStore.user?.email ||
            'System',
          acknowledgment_notes:
            'Rejection acknowledged via Main Inventory interface',
        }
      );

      // Close the notification
      closeRejectionNotification();

      // Show success message using the helper function (auto-closes after 3 seconds)
      showToast(
        'success',
        'Rejection acknowledged. Quantities have been returned to inventory.'
      );

      // Refresh the distribution history
      await fetchDistributionHistory(historyPagination.value.page || 1);
    } catch (error) {
      console.error('Error acknowledging rejection:', error);
      showToast('error', 'Failed to acknowledge rejection. Please try again.');
    } finally {
      rejectionNotification.value.acknowledging = false;
    }
  };

  // Watch for search/filter changes to reset pagination
  watch([searchQuery, categoryFilter], () => {
    currentPage.value = 1;
  });

  // Watch for forecasting filter changes to reset pagination
  watch(
    [
      forecastCategoryFilter,
      forecastPriorityFilter,
      forecastConfidenceFilter,
      forecastSearchQuery,
      forecastShowItems,
    ],
    () => {
      forecastCurrentPage.value = 1;
    }
  );

  // Watch for pagination changes to ensure current page is valid
  watch([filteredInventoryForecasts, forecastItemsPerPage], () => {
    const maxPage = totalForecastPages.value;
    if (forecastCurrentPage.value > maxPage && maxPage > 0) {
      forecastCurrentPage.value = maxPage;
    }
  });
</script>

<template>
  <div class="mx-auto p-2 sm:p-4 lg:p-6">
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
      class="flex flex-wrap gap-2 mb-4 sm:mb-6 !justify-end sm:justify-start !items-end"
    >
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
    <div
      class="tabs tabs-boxed mb-4 sm:mb-6 justify-center sm:justify-start flex-wrap gap-1 sm:gap-0"
    >
      <button
        @click="activeTab = 'overview'"
        class="tab flex-1 sm:flex-none min-w-0 text-xs sm:text-sm"
        :class="{ 'tab-active': activeTab === 'overview' }"
      >
        <BarChart3 class="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
        <span class="truncate">Overview</span>
      </button>
      <button
        @click="activeTab = 'inventory'"
        class="tab flex-1 sm:flex-none min-w-0 text-xs sm:text-sm"
        :class="{ 'tab-active': activeTab === 'inventory' }"
      >
        <Package class="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
        <span class="truncate">Inventory</span>
      </button>
      <button
        @click="activeTab = 'alerts'"
        class="tab flex-1 sm:flex-none min-w-0 text-xs sm:text-sm relative"
        :class="{ 'tab-active': activeTab === 'alerts' }"
        aria-label="Alerts"
      >
        <span
          v-if="alertsCount > 0"
          class="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full"
          aria-hidden="true"
        ></span>
        <Bell class="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
        <span class="truncate">Alerts</span>
        <span
          v-if="alertsCount > 0"
          class="badge badge-xs sm:badge-sm border-none font-medium bg-error/20 text-error ml-1 flex-shrink-0"
        >
          {{ alertsCount }}
        </span>
      </button>
      <button
        @click="activeTab = 'distribution'"
        class="tab flex-1 sm:flex-none min-w-0 text-xs sm:text-sm"
        :class="{ 'tab-active': activeTab === 'distribution' }"
      >
        <Truck class="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
        <span class="truncate">Distribution</span>
      </button>
      <button
        @click="activeTab = 'Distribution History'"
        class="tab flex-1 sm:flex-none min-w-0 text-xs sm:text-sm"
        :class="{ 'tab-active': activeTab === 'Distribution History' }"
      >
        <BriefcaseBusiness class="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
        <span class="truncate">History</span>
      </button>
    </div>

    <!-- Tab Content -->
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
                Inventory Overview
              </h2>
              <p class="text-sm text-gray-600">
                Comprehensive view of your inventory status and recent
                activities
              </p>
            </div>
            <div class="flex gap-2">
              <button
                @click="refreshData"
                class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
                :disabled="loading"
              >
                <RefreshCcw class="w-4 h-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>

          <!-- View Toggle -->
          <div
            class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4"
          >
            <div
              class="flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <h3 class="text-base sm:text-lg font-medium text-gray-900">
                Inventory Categories
              </h3>
              <div class="flex items-center space-x-1 sm:space-x-2">
                <button
                  @click="viewMode = 'list'"
                  :class="[
                    'px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer flex items-center',
                    viewMode === 'list'
                      ? 'bg-primaryColor/10 text-primaryColor'
                      : 'text-gray-500 hover:text-gray-700',
                  ]"
                >
                  <List class="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span class="hidden sm:inline">List</span>
                </button>
                <button
                  @click="viewMode = 'cards'"
                  :class="[
                    'px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer flex items-center',
                    viewMode === 'cards'
                      ? 'bg-primaryColor/10 text-primaryColor'
                      : 'text-gray-500 hover:text-gray-700',
                  ]"
                >
                  <Grid3X3 class="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span class="hidden sm:inline">Cards</span>
                </button>
              </div>
            </div>
            <div class="text-xs sm:text-sm text-gray-500">
              {{ inventorySummary.length }} categories
            </div>
          </div>

          <!-- Card View -->
          <div v-if="viewMode === 'cards'" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div
                v-for="summary in inventorySummary"
                :key="summary.category_id"
                class="card bg-gradient-to-br from-base-100 to-base-50 border border-gray-200 hover:shadow-xl duration-300 cursor-pointer"
              >
                <div class="card-body p-6">
                  <!-- Header with Icon and Title -->
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-12 h-12 rounded-full flex items-center justify-center"
                        :class="{
                          'bg-success/10': summary.category_status === 'active',
                          'bg-warning/10':
                            summary.category_status === 'low_stock',
                          'bg-error/10':
                            summary.category_status === 'out_of_stock',
                          'bg-gray-100': summary.category_status === 'empty',
                          'bg-error/10': summary.category_status === 'disabled',
                        }"
                      >
                        <component
                          :is="
                            getCategoryStatusInfo(summary.category_status).icon
                          "
                          class="w-6 h-6"
                          :class="
                            getCategoryStatusInfo(summary.category_status).color
                          "
                        />
                      </div>
                      <div>
                        <h3
                          class="card-title text-lg font-bold text-primaryColor"
                        >
                          {{ summary.category_name }}
                        </h3>
                        <p class="text-xs text-gray-500">Category Overview</p>
                        <div
                          class="tooltip tooltip-right"
                          :data-tip="
                            summary.status_description ||
                            getCategoryStatusInfo(summary.category_status)
                              .description
                          "
                        >
                          <Info class="w-3 h-3 text-gray-400 cursor-help" />
                        </div>
                      </div>
                    </div>
                    <div
                      class="badge-sm border-none font-medium badge"
                      :class="{
                        'bg-success/20 text-success':
                          summary.category_status === 'active',
                        'bg-warning/20 text-warning':
                          summary.category_status === 'low_stock',
                        'bg-error/20 text-error':
                          summary.category_status === 'out_of_stock',
                        'bg-gray-100 text-gray-600':
                          summary.category_status === 'empty',
                        'bg-error/20 text-error':
                          summary.category_status === 'disabled',
                      }"
                    >
                      {{ getCategoryStatusInfo(summary.category_status).label }}
                    </div>
                  </div>

                  <!-- Main Stats Grid -->
                  <div class="grid grid-cols-2 gap-4 mb-4">
                    <div
                      class="stat bg-white/50 rounded-lg p-3 border border-gray-100"
                    >
                      <div class="stat-title text-xs text-gray-600">
                        Total Items
                      </div>
                      <div
                        class="stat-value text-lg font-bold text-primaryColor"
                      >
                        {{ summary.unique_items }}
                      </div>
                      <div class="stat-desc text-xs text-gray-500">
                        Unique types
                      </div>
                    </div>

                    <div
                      class="stat bg-white/50 rounded-lg p-3 border border-gray-100"
                    >
                      <div class="stat-title text-xs text-gray-600">
                        Total Quantity
                      </div>
                      <div class="stat-value text-lg font-bold text-success">
                        {{
                          parseFloat(
                            summary.total_quantity || 0
                          ).toLocaleString()
                        }}
                      </div>
                      <div class="stat-desc text-xs text-gray-500">
                        Units in stock
                      </div>
                    </div>
                  </div>

                  <!-- Additional Metrics -->
                  <div class="space-y-2">
                    <div class="flex justify-between items-center text-xs">
                      <span class="text-gray-600">Stock Level:</span>
                      <span
                        class="font-medium"
                        :class="{
                          'text-success': summary.category_status === 'active',
                          'text-warning':
                            summary.category_status === 'low_stock',
                          'text-error':
                            summary.category_status === 'out_of_stock',
                          'text-gray-500': summary.category_status === 'empty',
                          'text-error': summary.category_status === 'disabled',
                        }"
                      >
                        {{
                          summary.category_status === 'active'
                            ? 'Good'
                            : summary.category_status === 'low_stock'
                              ? 'Low'
                              : summary.category_status === 'out_of_stock'
                                ? 'Out of Stock'
                                : summary.category_status === 'empty'
                                  ? 'No Items'
                                  : 'Disabled'
                        }}
                      </span>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                      <span class="text-gray-600">Last Updated:</span>
                      <span class="font-medium">{{
                        formatTimeAgo(summary.last_updated)
                      }}</span>
                    </div>
                  </div>

                  <!-- Item Type Breakdown -->
                  <div
                    v-if="
                      summary.item_breakdown &&
                      summary.item_breakdown.length > 0
                    "
                    class="mt-4 pt-4 border-t border-gray-200"
                  >
                    <div class="text-xs text-gray-600 font-medium mb-3">
                      Item Breakdown:
                    </div>
                    <div class="space-y-2 max-h-32 overflow-y-auto">
                      <div
                        v-for="item in summary.item_breakdown"
                        :key="item.item_type_id"
                        class="flex justify-between items-center text-xs bg-gray-50 rounded-lg p-2"
                      >
                        <div class="flex-1 min-w-0">
                          <div class="font-medium text-gray-800 truncate">
                            {{ item.item_type_name }}
                          </div>
                          <div class="text-gray-500">
                            {{ parseFloat(item.quantity).toLocaleString() }}
                            {{ item.unit_of_measure }}
                          </div>
                        </div>
                        <div class="text-right ml-2">
                          <div class="font-medium text-success">
                            ₱{{ parseFloat(item.total_value).toLocaleString() }}
                          </div>
                          <div class="text-gray-500">
                            {{ item.batch_count }} batch{{
                              item.batch_count !== 1 ? 'es' : ''
                            }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- List View -->
          <div
            v-if="viewMode === 'list'"
            class="bg-white rounded-lg shadow overflow-hidden"
          >
            <div class="overflow-x-auto">
              <!-- Mobile Card Layout (hidden on larger screens) -->
              <div class="block sm:hidden space-y-3 p-4">
                <div
                  v-for="summary in inventorySummary"
                  :key="summary.category_id"
                  class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div class="flex items-start space-x-3">
                    <!-- Category Icon -->
                    <div class="flex-shrink-0">
                      <div
                        class="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
                        :class="{
                          'bg-success/10': summary.category_status === 'active',
                          'bg-warning/10':
                            summary.category_status === 'low_stock',
                          'bg-error/10':
                            summary.category_status === 'out_of_stock',
                          'bg-gray-100': summary.category_status === 'empty',
                          'bg-error/10': summary.category_status === 'disabled',
                        }"
                      >
                        <Package
                          class="w-5 h-5 sm:w-6 sm:h-6"
                          :class="{
                            'text-success':
                              summary.category_status === 'active',
                            'text-warning':
                              summary.category_status === 'low_stock',
                            'text-error':
                              summary.category_status === 'out_of_stock',
                            'text-gray-500':
                              summary.category_status === 'empty',
                            'text-error':
                              summary.category_status === 'disabled',
                          }"
                        />
                      </div>
                    </div>

                    <!-- Category Details -->
                    <div class="flex-1 min-w-0">
                      <h3 class="text-sm font-medium text-gray-900 truncate">
                        {{ summary.category_name }}
                      </h3>
                      <p class="text-xs text-gray-500 truncate">
                        {{ summary.total_items }} items
                      </p>

                      <!-- Stock and Status Info -->
                      <div class="mt-2 space-y-1">
                        <div class="flex items-center justify-between text-xs">
                          <span class="text-gray-600">Total Quantity:</span>
                          <span class="font-medium"
                            >{{ summary.total_quantity }} units</span
                          >
                        </div>
                        <div class="flex items-center justify-between text-xs">
                          <span class="text-gray-600">Status:</span>
                          <span
                            class="font-medium px-2 py-1 rounded-full text-xs"
                            :class="{
                              'bg-success/20 text-success':
                                summary.category_status === 'active',
                              'bg-warning/20 text-warning':
                                summary.category_status === 'low_stock',
                              'bg-error/20 text-error':
                                summary.category_status === 'out_of_stock',
                              'bg-gray-100 text-gray-600':
                                summary.category_status === 'empty',
                              'bg-error/20 text-error':
                                summary.category_status === 'disabled',
                            }"
                          >
                            {{
                              summary.category_status === 'active'
                                ? 'Active'
                                : summary.category_status === 'low_stock'
                                  ? 'Low Stock'
                                  : summary.category_status === 'out_of_stock'
                                    ? 'Out of Stock'
                                    : summary.category_status === 'empty'
                                      ? 'Empty'
                                      : 'Disabled'
                            }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Desktop Table Layout (hidden on mobile) -->
              <table
                class="min-w-full divide-y divide-gray-200 hidden sm:table"
              >
                <thead class="bg-gray-50">
                  <tr>
                    <th
                      class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Category
                    </th>
                    <th
                      class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Items
                    </th>
                    <th
                      class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell"
                    >
                      Total Quantity
                    </th>
                    <th
                      class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell"
                    >
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr
                    v-for="summary in inventorySummary"
                    :key="summary.category_id"
                    class="hover:bg-gray-50 cursor-pointer"
                  >
                    <td class="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div
                          class="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12"
                        >
                          <div
                            class="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center"
                            :class="{
                              'bg-success/10':
                                summary.category_status === 'active',
                              'bg-warning/10':
                                summary.category_status === 'low_stock',
                              'bg-error/10':
                                summary.category_status === 'out_of_stock',
                              'bg-gray-100':
                                summary.category_status === 'empty',
                              'bg-error/10':
                                summary.category_status === 'disabled',
                            }"
                          >
                            <Package
                              class="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6"
                              :class="{
                                'text-success':
                                  summary.category_status === 'active',
                                'text-warning':
                                  summary.category_status === 'low_stock',
                                'text-error':
                                  summary.category_status === 'out_of_stock',
                                'text-gray-500':
                                  summary.category_status === 'empty',
                                'text-error':
                                  summary.category_status === 'disabled',
                              }"
                            />
                          </div>
                        </div>
                        <div class="ml-3 sm:ml-4">
                          <div
                            class="text-sm font-medium text-gray-900 truncate"
                          >
                            {{ summary.category_name }}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-medium text-gray-900">
                        {{ summary.total_items }}
                      </div>
                      <div class="text-xs text-gray-500">unique items</div>
                    </td>
                    <td
                      class="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell"
                    >
                      <div class="text-sm font-medium text-gray-900">
                        {{ summary.total_quantity }}
                      </div>
                      <div class="text-xs text-gray-500">total units</div>
                    </td>
                    <td class="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span
                        class="badge badge-xs sm:badge-sm"
                        :class="{
                          'bg-success/20 text-success':
                            summary.category_status === 'active',
                          'bg-warning/20 text-warning':
                            summary.category_status === 'low_stock',
                          'bg-error/20 text-error':
                            summary.category_status === 'out_of_stock',
                          'bg-gray-100 text-gray-600':
                            summary.category_status === 'empty',
                          'bg-error/20 text-error':
                            summary.category_status === 'disabled',
                        }"
                      >
                        {{
                          summary.category_status === 'active'
                            ? 'Active'
                            : summary.category_status === 'low_stock'
                              ? 'Low Stock'
                              : summary.category_status === 'out_of_stock'
                                ? 'Out of Stock'
                                : summary.category_status === 'empty'
                                  ? 'Empty'
                                  : 'Disabled'
                        }}
                      </span>
                    </td>
                    <td
                      class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell"
                    >
                      {{ formatTimeAgo(summary.last_updated) }}
                    </td>
                  </tr>
                </tbody>
              </table>
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
                    class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primaryColor/10 flex items-center justify-center"
                  >
                    <History class="w-4 h-4 sm:w-5 sm:h-5 text-primaryColor" />
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
                  @click="refreshData"
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

              <div v-else class="space-y-3 max-h-96 overflow-y-auto px-1">
                <div
                  v-for="activity in recentActivity"
                  :key="activity.id"
                  class="flex items-start gap-3 p-3 sm:p-4 bg-white/70 rounded-xl hover:bg-white transition-all duration-200 hover:shadow-md border border-gray-100"
                >
                  <div class="flex-shrink-0">
                    <div
                      class="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center"
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
                        class="w-4 h-4 sm:w-5 sm:h-5"
                        :class="
                          getTransactionTypeInfo(
                            activity.transaction_type,
                            activity.adjustment_type
                          ).color
                        "
                      />
                    </div>
                  </div>

                  <div class="flex-1 min-w-0 overflow-hidden">
                    <!-- Header Section -->
                    <div
                      class="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2"
                    >
                      <div class="flex-1 min-w-0">
                        <h4
                          class="font-bold text-sm text-gray-900 mb-1 truncate"
                        >
                          {{ activity.item_name || activity.item_type_name }}
                        </h4>
                        <div
                          class="flex flex-wrap items-center gap-1 sm:gap-2 text-xs text-gray-600 mb-1"
                        >
                          <span
                            class="bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap"
                          >
                            {{ activity.category_name }}
                          </span>
                          <span class="hidden sm:inline">•</span>
                          <span class="text-gray-400 sm:hidden">|</span>
                          <span class="whitespace-nowrap">{{
                            activity.unit_of_measure
                          }}</span>
                        </div>
                      </div>

                      <div class="flex flex-col sm:text-right gap-1">
                        <div
                          class="flex items-center gap-2 justify-start sm:justify-end"
                        >
                          <div
                            class="badge badge-sm border-none font-medium whitespace-nowrap"
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
                            <Info
                              class="w-3 h-3 text-gray-400 cursor-help flex-shrink-0"
                            />
                          </div>
                        </div>
                        <div class="text-xs text-gray-500 font-medium">
                          {{ formatTransactionDate(activity.transaction_date) }}
                        </div>
                      </div>
                    </div>

                    <!-- Quantity and Value Section -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-xs text-gray-600 mb-1">Quantity</div>
                        <div
                          class="text-base sm:text-lg font-bold text-primaryColor"
                        >
                          {{ parseFloat(activity.quantity).toLocaleString() }}
                          <span class="text-sm font-normal text-gray-500"
                            >units</span
                          >
                        </div>
                      </div>

                      <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-xs text-gray-600 mb-1">Value</div>
                        <div
                          class="text-base sm:text-lg font-bold text-success"
                        >
                          <font-awesome-icon icon="fa-solid fa-peso-sign" />
                          {{
                            parseFloat(activity.total_value).toLocaleString(
                              'en-PH',
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )
                          }}
                        </div>
                      </div>
                    </div>

                    <!-- Disposal Cost Section -->
                    <div
                      v-if="activity.disposal_cost"
                      class="bg-error/10 border border-error/20 rounded-lg p-3 mb-3"
                    >
                      <div class="text-xs text-error font-medium mb-1">
                        Disposal Cost
                      </div>
                      <div
                        class="text-sm font-bold text-error flex items-center gap-1"
                      >
                        <font-awesome-icon
                          icon="fa-solid fa-peso-sign"
                          class="text-error"
                        />
                        {{
                          Number(activity.disposal_cost || 0).toLocaleString(
                            'en-PH',
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )
                        }}
                      </div>
                    </div>

                    <!-- Footer Section -->
                    <div
                      class="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-3 border-t border-gray-100 gap-2"
                    >
                      <div class="text-xs text-gray-500 truncate">
                        <span class="font-medium">Performed by:</span>
                        <span class="truncate">{{
                          activity.performed_by
                        }}</span>
                      </div>
                    </div>

                    <!-- Reason/Notes Section -->
                    <div
                      v-if="activity.reason || activity.notes"
                      class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div class="text-xs text-blue-700 font-medium mb-1">
                        {{ activity.reason ? 'Reason' : 'Notes' }}
                      </div>
                      <p class="text-xs text-blue-800 break-words">
                        {{ activity.reason || activity.notes }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="recentActivity.length > 0" class="mt-6 text-center">
                <button
                  @click="openTransactionModal"
                  class="btn btn-sm bg-primaryColor text-white font-thin hover:bg-primaryColor/90 transition-all duration-200 shadow-lg hover:shadow-xl"
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
                  :disabled="loading"
                />
                <button class="btn btn-sm join-item" :disabled="loading">
                  <Search class="w-4 h-4" />
                </button>
              </div>

              <select
                v-model="categoryFilter"
                class="select select-bordered select-sm"
                :disabled="loading"
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
            <!-- Loading State - Skeleton Cards -->
            <div
              v-if="loading"
              v-for="n in 5"
              :key="`skeleton-${n}`"
              class="inventory-group border border-gray-200 rounded-lg overflow-hidden animate-pulse"
            >
              <!-- Skeleton Item Header -->
              <div class="item-header">
                <div class="flex justify-between items-center p-4 bg-base-100">
                  <div class="flex-1">
                    <!-- Skeleton Title -->
                    <div class="h-6 bg-gray-200 rounded mb-2 w-3/4"></div>
                    <!-- Skeleton Subtitle -->
                    <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div class="text-right mr-4">
                    <!-- Skeleton Total Stock -->
                    <div class="h-6 bg-gray-200 rounded mb-1 w-16"></div>
                    <div class="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div class="flex items-center gap-2">
                    <!-- Skeleton Badges -->
                    <div class="h-5 bg-gray-200 rounded w-16"></div>
                    <div class="h-5 bg-gray-200 rounded w-5"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actual Inventory Items -->
            <div
              v-else-if="groupedInventory.length > 0"
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
                          <div class="flex flex-col">
                            <span class="font-medium text-sm">
                              {{ formatBatchNumber(batch.batch_number) }}
                            </span>
                            <span
                              v-if="
                                batch.batch_number &&
                                batch.batch_number !== 'N/A'
                              "
                              class="text-xs text-gray-500 font-mono"
                            >
                            </span>
                          </div>
                        </td>
                        <td>
                          <span class="font-bold">
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
                          <span
                            :class="getBatchStatusBadgeClass(batch)"
                            class="badge badge-xs"
                          >
                            {{ getBatchStatusText(batch) }}
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
            <div
              v-if="!loading && groupedInventory.length === 0"
              class="text-center py-12"
            >
              <Package class="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 class="text-lg font-medium text-gray-600 mb-2">
                No inventory found
              </h3>
              <p class="text-gray-500">
                {{
                  searchQuery || categoryFilter
                    ? 'Try adjusting your search or filters'
                    : 'No inventory items available at the moment'
                }}
              </p>
              <div class="flex gap-3 justify-center mt-4">
                <button
                  v-if="searchQuery || categoryFilter"
                  @click="clearFilters"
                  class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
                >
                  <X class="w-4 h-4 mr-1" />
                  Clear Filters
                </button>
                <button
                  @click="fetchData"
                  class="btn bg-primaryColor font-thin btn-sm text-white"
                >
                  <RefreshCcw class="w-4 h-4 mr-1" />
                  Refresh
                </button>
              </div>
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
                <Calendar v-else class="w-5 h-5 text-primaryColor" />
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
              :key="item.id || item.item_type_id"
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
                      {{ item.item_name || item.item_type_name }}
                    </h3>
                    <div class="text-xs text-gray-600">
                      {{ item.category_name }}
                      <span v-if="item.item_type_name">
                        • {{ item.item_type_name }}</span
                      >
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
                  <button
                    class="btn btn-ghost btn-xs"
                    @click="viewItemDetailsFromAlert(item)"
                  >
                    View Item
                  </button>
                  <button
                    class="btn btn-ghost btn-xs"
                    @click="createSupplyRequestFromAlert(item)"
                  >
                    Create Supply Request
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

        <!-- Branch Distribution Tab -->
        <div v-if="activeTab === 'distribution'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4"
          >
            <h2
              class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl"
            >
              Branch Distribution
            </h2>

            <div class="flex flex-col sm:flex-row gap-2">
              <!-- Inventory Type Toggle -->
              <div class="join">
                <button
                  @click="switchDistributionInventoryType('scm')"
                  class="btn btn-sm join-item font-thin"
                  :class="{
                    'bg-primaryColor text-white':
                      distributionInventoryType === 'scm',
                    'btn-outline border-none':
                      distributionInventoryType !== 'scm',
                  }"
                >
                  <Package class="w-4 h-4 mr-1" />
                  SCM Inventory
                </button>
                <button
                  @click="switchDistributionInventoryType('production')"
                  class="btn btn-sm join-item font-thin"
                  :class="{
                    'bg-primaryColor text-white':
                      distributionInventoryType === 'production',
                    'btn-outline border-none':
                      distributionInventoryType !== 'production',
                  }"
                >
                  <Building2 class="w-4 h-4 mr-1" />
                  Production Inventory
                </button>
              </div>

              <button
                @click="refreshData"
                class="btn btn-sm btn-outline"
                :disabled="loading"
              >
                <RefreshCcw
                  class="w-4 h-4 mr-1"
                  :class="{ 'animate-spin': loading }"
                />
                Refresh
              </button>
            </div>
          </div>

          <!-- Filters -->
          <div class="card bg-base-100 border border-gray-200">
            <div class="card-body p-4">
              <div class="flex flex-col sm:flex-row gap-4">
                <!-- Search -->
                <div class="form-control flex-1">
                  <div class="relative">
                    <Search
                      class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                    />
                    <input
                      v-model="distributionSearchQuery"
                      type="text"
                      placeholder="Search items..."
                      class="input input-bordered w-full pl-10 text-sm"
                    />
                  </div>
                </div>

                <!-- Category Filter -->
                <div class="form-control">
                  <select
                    v-model="distributionCategoryFilter"
                    class="select select-bordered"
                  >
                    <option value="">All Categories</option>
                    <option
                      v-for="category in availableDistributionCategories"
                      :key="category"
                      :value="category"
                    >
                      {{ category }}
                    </option>
                  </select>
                </div>

                <!-- Items Per Page -->
                <div class="form-control">
                  <select
                    v-model="distributionItemsPerPage"
                    @change="
                      changeDistributionItemsPerPage(distributionItemsPerPage)
                    "
                    class="select select-bordered"
                  >
                    <option :value="6">6 per page</option>
                    <option :value="12">12 per page</option>
                    <option :value="24">24 per page</option>
                    <option :value="48">48 per page</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Inventory Items Grid -->
          <div
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
          >
            <div
              v-for="item in paginatedDistributionInventory"
              :key="item.id"
              class="card bg-white border border-gray-200 hover:shadow-xl duration-300"
            >
              <div class="card-body p-4 flex flex-col h-full">
                <div
                  class="flex justify-between items-start mb-2"
                  style="min-height: 40px"
                >
                  <h3
                    class="card-title text-sm sm:text-base font-semibold text-primaryColor"
                  >
                    {{
                      distributionInventoryType === 'production'
                        ? item.item_name || item.menu_item_name
                        : item.item_name || item.item_type_name
                    }}
                  </h3>
                  <div
                    class="badge badge-xs sm:badge-sm border"
                    :class="{
                      'bg-success/20 text-success border-success/30':
                        (distributionInventoryType === 'production'
                          ? item.available_quantity
                          : parseFloat(item.quantity)) > 50,
                      'bg-warning/20 text-warning border-warning/30':
                        (distributionInventoryType === 'production'
                          ? item.available_quantity
                          : parseFloat(item.quantity)) <= 50 &&
                        (distributionInventoryType === 'production'
                          ? item.available_quantity
                          : parseFloat(item.quantity)) > 10,
                      'bg-error/20 text-error border-error/30':
                        (distributionInventoryType === 'production'
                          ? item.available_quantity
                          : parseFloat(item.quantity)) <= 10,
                    }"
                  >
                    {{
                      distributionInventoryType === 'production'
                        ? (item.available_quantity || 0).toLocaleString()
                        : (parseFloat(item.quantity) || 0).toLocaleString()
                    }}
                    {{ item.unit_of_measure || 'units' }}
                  </div>
                </div>

                <div
                  class="text-xs text-gray-600 mb-2"
                  style="min-height: 36px"
                >
                  <div v-if="item.category || item.category_name" class="mb-1">
                    {{ item.category || item.category_name }}
                  </div>
                  <div
                    v-if="
                      distributionInventoryType === 'production' &&
                      item.selling_price
                    "
                    class="mb-1"
                  >
                    ₱{{ parseFloat(item.selling_price).toLocaleString() }}
                  </div>
                </div>

                <div class="card-actions justify-end mt-auto">
                  <button
                    @click="openDistributionModal(item)"
                    class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
                    :disabled="
                      (distributionInventoryType === 'production'
                        ? item.available_quantity
                        : parseFloat(item.quantity)) <= 0
                    "
                  >
                    <Truck class="w-4 h-4 mr-1" />
                    Distribute
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div
            v-if="totalDistributionPages > 1"
            class="flex justify-center mt-6"
          >
            <div class="join">
              <button
                class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
                :disabled="distributionCurrentPage === 1"
                @click="goToDistributionPage(distributionCurrentPage - 1)"
                :class="{ 'btn-disabled': distributionCurrentPage === 1 }"
              >
                « Prev
              </button>

              <button
                class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
                v-for="page in totalDistributionPages"
                :key="page"
                :class="{
                  'btn-active': distributionCurrentPage === page,
                  '!bg-primaryColor text-white':
                    distributionCurrentPage === page,
                }"
                @click="goToDistributionPage(page)"
              >
                {{ page }}
              </button>

              <button
                class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
                :disabled="distributionCurrentPage >= totalDistributionPages"
                @click="goToDistributionPage(distributionCurrentPage + 1)"
                :class="{
                  'btn-disabled':
                    distributionCurrentPage >= totalDistributionPages,
                }"
              >
                Next »
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="filteredDistributionInventory.length === 0"
            class="text-center py-12"
          >
            <Package class="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 class="text-lg font-semibold text-gray-600 mb-2">
              No Items Available
            </h3>
            <p class="text-gray-500">
              {{
                distributionSearchQuery || distributionCategoryFilter
                  ? 'No items match your current filters.'
                  : `No ${distributionInventoryType === 'production' ? 'production' : 'SCM'} inventory items available for distribution.`
              }}
            </p>
          </div>
        </div>

        <!-- Distribution History Tab -->
        <div v-if="activeTab === 'Distribution History'" class="space-y-6">
          <!-- Branch Distribution History -->
          <div class="card bg-base-100 border border-gray-200 mt-10">
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-base">Distribution History</h3>
                <div class="flex items-center gap-2">
                  <select
                    v-model="historyStatusFilter"
                    class="select select-bordered select-xs"
                  >
                    <option value="">All Status</option>
                    <option value="delivered">Delivered</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button
                    class="btn btn-xs btn-outline"
                    :disabled="historyLoading"
                    @click="
                      fetchDistributionHistory(historyPagination.page || 1)
                    "
                  >
                    <RefreshCcw
                      class="w-3 h-3 mr-1"
                      :class="{ 'animate-spin': historyLoading }"
                    />
                    Refresh
                  </button>
                </div>
              </div>
              <div class="overflow-x-auto">
                <table class="table table-zebra w-full text-sm">
                  <thead>
                    <tr>
                      <th>Date</th>

                      <th>Branch</th>
                      <th>Prepared By</th>
                      <th class="text-right">Total</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="dist in filteredDistributionHistory"
                      :key="dist.id"
                    >
                      <td>
                        {{ new Date(dist.created_at).toLocaleString('en-PH') }}
                      </td>

                      <td>{{ dist.branch_name || 'Branch' }}</td>
                      <td>{{ dist.prepared_by }}</td>
                      <td class="text-right">
                        <font-awesome-icon
                          icon="fa-solid fa-peso-sign"
                          class="mr-1"
                        />
                        {{
                          Number(dist.total_amount || 0).toLocaleString(
                            'en-PH',
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )
                        }}
                      </td>

                      <td>
                        <span
                          class="badge badge-sm border-none font-medium"
                          :class="{
                            'badge-success text-success bg-success/20':
                              dist.status === 'completed',
                            'badge-warning text-warning bg-warning/20':
                              dist.status === 'delivered',
                            'badge-error text-error bg-error/20':
                              dist.status === 'rejected',
                          }"
                        >
                          {{
                            dist.status === 'completed'
                              ? 'Completed'
                              : dist.status === 'rejected'
                                ? 'Rejected'
                                : 'Delivered'
                          }}
                        </span>
                      </td>
                      <td class="flex gap-2">
                        <button
                          class="btn btn-ghost btn-xs"
                          @click="openHistoryReceipt(dist.id)"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                    <tr v-if="!filteredDistributionHistory.length">
                      <td colspan="7" class="text-center text-gray-400 py-6">
                        No distributions found
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Pagination -->
              <div class="flex items-center justify-between mt-3">
                <div class="text-xs text-gray-500">
                  Page {{ historyPagination.page }} of
                  {{ historyPagination.pages }} • Total:
                  {{ historyPagination.total }}
                </div>
                <div class="join">
                  <button
                    class="btn btn-xs join-item"
                    :disabled="
                      (historyPagination.page || 1) <= 1 || historyLoading
                    "
                    @click="
                      fetchDistributionHistory(
                        (historyPagination.page || 1) - 1
                      )
                    "
                  >
                    Prev
                  </button>
                  <button
                    class="btn btn-xs join-item"
                    :disabled="
                      (historyPagination.page || 1) >=
                        (historyPagination.pages || 1) || historyLoading
                    "
                    @click="
                      fetchDistributionHistory(
                        (historyPagination.page || 1) + 1
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
      </div>
    </div>

    <!-- Modals -->
    <InventoryConsumptionModal
      :show="modal.show && modal.type === 'consumption'"
      :categories="categories"
      :item-types="itemTypes"
      :current-inventory="currentInventory"
      :loading="loading"
      :preselected-item="modal.item"
      @close="closeModal"
      @submit="handleConsumption"
    />

    <BranchDistributionModal
      :show="modal.show && modal.type === 'distribution'"
      :item="modal.item"
      :branches="branches"
      :inventory-type="distributionInventoryType"
      :loading="distributionLoading"
      @close="closeModal"
      @add-to-cart="handleAddToDistributionCart"
    />

    <!-- Confirmation Modal (consistent with GRN Manager) -->
    <dialog id="inventory_confirm_modal" class="modal">
      <div class="modal-box max-w-1xl">
        <h3 class="font-bold text-lg mb-2">{{ confirmModal.title }}</h3>
        <p v-if="confirmModal.message" class="mb-2">
          {{ confirmModal.message }}
        </p>

        <!-- Details table (optional) -->
        <div v-if="confirmModal.details" class="mb-4">
          <div class="text-sm mb-2">
            <span class="font-medium">Branch:</span>
            {{ confirmModal.details.branch_name }}
          </div>
          <div class="overflow-x-auto">
            <table class="table table-xs w-full">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Source</th>
                  <th class="text-right">Qty</th>
                  <th>Unit</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(x, idx) in confirmModal.details.items"
                  :key="x.key || idx"
                >
                  <td>{{ idx + 1 }}</td>
                  <td>{{ x.name }}</td>
                  <td>{{ x.source.toUpperCase() }}</td>
                  <td class="text-right">{{ x.qty.toLocaleString() }}</td>
                  <td>{{ x.unit }}</td>
                  <td class="text-right">₱{{ x.price.toLocaleString() }}</td>
                  <td class="text-right">₱{{ x.amount.toLocaleString() }}</td>
                  <td class="text-right">
                    <button
                      class="btn btn-ghost btn-xs text-error"
                      @click="removeItemFromConfirm(x.key)"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
                <tr>
                  <td colspan="6" class="text-right font-semibold">Total</td>
                  <td class="text-right font-semibold">
                    ₱{{ confirmModal.details.total.toLocaleString() }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="confirmModal.details.notes" class="text-xs mt-2">
            <span class="font-medium">Notes:</span>
            {{ confirmModal.details.notes }}
          </div>
          <!-- Proof editor (TinyMCE) - Prepared By only; branch will attach Received By on acceptance -->
          <div class="mt-4 grid grid-cols-1 gap-4">
            <div>
              <div class="text-xs font-medium mb-1">Prepared By Proof</div>
              <TinyMCEEditor
                v-model="preparedProofHtml"
                :init="tinyMCEConfig"
              />
            </div>
          </div>
        </div>

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
            class="btn bg-primaryColor text-white btn-sm font-thin border-none hover:bg-primaryColor/80 disabled:opacity-60 disabled:cursor-not-allowed"
            @click="handleConfirmAction"
            :disabled="confirmLoading"
          >
            <span v-if="confirmLoading">Confirming...</span>
            <span v-else>Confirm</span>
          </button>
        </div>
      </div>
    </dialog>

    <!-- Floating actions container (bottom-left corner) -->
    <div class="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
      <!-- Branch Returns Approval (first, appears on top) -->
      <div v-if="pendingReturns.length > 0" class="card shadow-xl bg-base-100">
        <div class="card-body p-4">
          <div class="flex items-center justify-between gap-6">
            <div>
              <div class="text-sm font-medium">Branch Returns</div>
              <div class="text-xs text-gray-500">
                {{ pendingReturns.length }} pending
              </div>
            </div>
            <button
              class="btn btn-xs"
              @click="
                showReturnsPanel = true;
                loadPendingReturns();
              "
            >
              Review
            </button>
          </div>
        </div>
      </div>

      <!-- Draft Checkout Controls (below) -->
      <div
        v-if="inventoryStore.cartItemCount > 0"
        class="card shadow-xl bg-base-100"
      >
        <div class="card-body p-4">
          <div class="text-sm font-medium">Draft Distribution</div>
          <div class="text-xs text-gray-500">
            {{ inventoryStore.cartItemCount }} items • ₱{{
              inventoryStore.cartTotalValue.toLocaleString()
            }}
          </div>
          <div class="mt-2 flex gap-2">
            <button class="btn btn-xs" @click="checkoutDistributionDraft">
              Checkout
            </button>
            <button
              class="btn btn-xs btn-ghost"
              @click="inventoryStore.clearDistributionCart"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Returns Review Modal -->
    <dialog id="returns_review_modal" class="modal" :open="showReturnsPanel">
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg mb-3">Pending Branch Returns</h3>
        <div class="overflow-x-auto max-h-[60vh]">
          <table class="table table-zebra table-xs w-full">
            <thead>
              <tr class="bg-base-200">
                <th>ID</th>
                <th>Branch</th>
                <th>Type</th>
                <th>Items</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ret in pendingReturns" :key="ret.id">
                <td class="font-medium">#{{ ret.id }}</td>
                <td>{{ ret.branch_name || ret.branch_id }}</td>
                <td class="uppercase">{{ ret.return_type }}</td>
                <td>
                  <div class="text-xs">
                    <div v-for="it in ret.items" :key="it.id">
                      {{ it.item_name }} - {{ it.quantity }} {{ it.unit }}
                    </div>
                  </div>
                </td>
                <td class="text-xs text-gray-500">{{ ret.notes || '—' }}</td>
                <td>
                  <div class="flex gap-1">
                    <button
                      class="btn btn-xs btn-success"
                      :disabled="branchReturnStore.loading"
                      @click="
                        branchReturnStore
                          .approveReturn(ret.id)
                          .then(loadPendingReturns)
                      "
                    >
                      <span
                        v-if="branchReturnStore.loading"
                        class="loading loading-spinner loading-xs mr-1"
                      ></span>
                      {{
                        branchReturnStore.loading ? 'Approving...' : 'Approve'
                      }}
                    </button>
                    <button
                      class="btn btn-xs btn-ghost"
                      :disabled="branchReturnStore.loading"
                      @click="
                        branchReturnStore
                          .rejectReturn(ret.id)
                          .then(loadPendingReturns)
                      "
                    >
                      <span
                        v-if="branchReturnStore.loading"
                        class="loading loading-spinner loading-xs mr-1"
                      ></span>
                      {{
                        branchReturnStore.loading ? 'Rejecting...' : 'Reject'
                      }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="pendingReturns.length === 0">
                <td colspan="6" class="text-center text-sm text-gray-500 py-6">
                  No pending returns.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-action">
          <button class="btn btn-sm" @click="showReturnsPanel = false">
            Close
          </button>
        </div>
      </div>
    </dialog>

    <BranchDistributionReceiptModal
      :show="distributionReceipt.show"
      :receipt="distributionReceipt.receipt"
      :onClose="closeDistributionReceipt"
    />

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
      :initial-filter="transactionModal.initialFilter"
      @close="closeTransactionModal"
    />

    <!-- Inventory Details Modal -->
    <InventoryDetailsModal
      :show="detailsModal.show"
      :inventory-item-id="detailsModal.inventoryItemId"
      @close="closeDetailsModal"
    />

    <!-- Rejection Notification Modal -->
    <dialog :class="{ 'modal-open': rejectionNotification.show }" class="modal">
      <div class="modal-box max-w-2xl">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex-shrink-0">
            <div
              class="w-12 h-12 bg-error/20 rounded-full flex items-center justify-center"
            >
              <svg
                class="w-6 h-6 text-error"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
          </div>
          <div>
            <h3 class="font-bold text-lg text-error">Distribution Rejected</h3>
            <p class="text-sm text-gray-600">
              Reference: {{ rejectionNotification.distribution?.reference }}
            </p>
          </div>
        </div>

        <div v-if="rejectionNotification.distribution" class="space-y-4">
          <!-- Rejection Details -->
          <div class="bg-error/5 border border-error/20 rounded-lg p-4">
            <h4 class="font-semibold text-error mb-2">Rejection Details</h4>
            <div class="space-y-2 text-sm">
              <div>
                <span class="font-medium">Rejected by:</span>
                <span class="ml-2">{{
                  rejectionNotification.distribution.rejected_by || 'Unknown'
                }}</span>
              </div>
              <div>
                <span class="font-medium">Rejected at:</span>
                <span class="ml-2">
                  {{
                    new Date(
                      rejectionNotification.distribution.rejected_at ||
                        rejectionNotification.distribution.created_at
                    ).toLocaleString('en-PH')
                  }}
                </span>
              </div>
              <div>
                <span class="font-medium">Reason:</span>
                <p class="mt-1 text-gray-700 bg-white p-2 rounded border">
                  {{
                    rejectionNotification.distribution.rejection_reason ||
                    'No reason provided'
                  }}
                </p>
              </div>
              <div v-if="rejectionNotification.distribution.rejection_notes">
                <span class="font-medium">Notes:</span>
                <p class="mt-1 text-gray-700 bg-white p-2 rounded border">
                  {{ rejectionNotification.distribution.rejection_notes }}
                </p>
              </div>
              <div v-if="rejectionNotification.distribution.acknowledged_by">
                <span class="font-medium">Acknowledged by:</span>
                <span class="ml-2 text-green-700 font-medium">{{
                  rejectionNotification.distribution.acknowledged_by
                }}</span>
              </div>
              <div v-if="rejectionNotification.distribution.acknowledged_at">
                <span class="font-medium">Acknowledged at:</span>
                <span class="ml-2 text-green-700">
                  {{
                    new Date(
                      rejectionNotification.distribution.acknowledged_at
                    ).toLocaleString('en-PH')
                  }}
                </span>
              </div>
            </div>
          </div>

          <!-- Distribution Items -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="font-semibold mb-3">Items in Distribution</h4>
            <div class="space-y-2">
              <div
                v-for="item in rejectionNotification.distribution.items || []"
                :key="item.id"
                class="flex justify-between items-center bg-white p-2 rounded border"
              >
                <div>
                  <span class="font-medium">{{ item.name }}</span>
                  <span class="text-sm text-gray-500 ml-2"
                    >({{ item.source }})</span
                  >
                </div>
                <div class="text-right">
                  <div class="font-medium">
                    {{ Number(item.qty).toFixed(2) }} {{ item.unit }}
                  </div>
                  <div class="text-sm text-gray-500">
                    ₱{{ Number(item.amount).toFixed(2) }}
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-200">
              <div class="flex justify-between items-center font-semibold">
                <span>Total Amount:</span>
                <span
                  >₱{{
                    Number(
                      rejectionNotification.distribution.total_amount
                    ).toFixed(2)
                  }}</span
                >
              </div>
            </div>
          </div>

          <!-- Action Notice -->
          <div
            v-if="!rejectionNotification.distribution?.acknowledged_by"
            class="bg-warning/10 border border-warning/30 rounded-lg p-4"
          >
            <div class="flex items-start gap-3">
              <svg
                class="w-5 h-5 text-warning mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 class="font-semibold text-warning mb-1">Action Required</h4>
                <p class="text-sm text-gray-700">
                  The quantities for these items have been automatically
                  returned to the main inventory. Please acknowledge this
                  rejection to confirm the inventory adjustment.
                </p>
              </div>
            </div>
          </div>
          <!-- Acknowledgment Confirmation -->
          <div
            v-else
            class="bg-green-50 border border-green-200 rounded-lg p-4"
          >
            <div class="flex items-start gap-3">
              <svg
                class="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <div>
                <h4 class="font-semibold text-green-800 mb-1">Acknowledged</h4>
                <p class="text-sm text-gray-700">
                  This rejection has been acknowledged and the inventory
                  adjustment has been confirmed.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="modal-action">
          <button
            class="btn btn-sm bg-gray-200 font-thin text-black/50 border border-none hover:bg-gray-300"
            @click="closeRejectionNotification"
            :disabled="rejectionNotification.acknowledging"
          >
            Close
          </button>
          <button
            v-if="!rejectionNotification.distribution?.acknowledged_by"
            class="btn btn-sm bg-primaryColor font-thin text-white border border-none hover:bg-primaryColor/80"
            @click="acknowledgeRejection"
            :disabled="rejectionNotification.acknowledging"
            :class="{ loading: rejectionNotification.acknowledging }"
          >
            <svg
              v-if="!rejectionNotification.acknowledging"
              class="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            {{
              rejectionNotification.acknowledging
                ? 'Acknowledging...'
                : 'Acknowledge & Return to Inventory'
            }}
          </button>
          <div
            v-else
            class="btn btn-sm bg-green-100 font-thin text-green-800 border border-green-300 cursor-default"
          >
            <svg
              class="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
            Acknowledged by
            {{ rejectionNotification.distribution.acknowledged_by }}
          </div>
        </div>
      </div>
    </dialog>

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

<style>
  /* Ensure TinyMCE popups (image dialog, link dialog, pickers) appear above DaisyUI modals */
  .tox,
  .tox-tinymce-aux,
  .tox-silver-sink,
  .tox-dialog-wrap,
  .tox-dialog {
    z-index: 99999 !important;
  }
  /* Avoid stacking-context issues from transform animations in DaisyUI modal */
  #inventory_confirm_modal .modal-box {
    transform: none !important;
  }
</style>
