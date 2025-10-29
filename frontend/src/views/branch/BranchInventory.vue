<script setup>
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
  import BranchInventoryDetailsModal from '../../components/branch/BranchInventoryDetailsModal.vue';
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
  import BranchInventoryConsumptionModal from '../../components/branch/BranchInventoryConsumptionModal.vue';
  import BranchInventoryAdjustmentModal from '../../components/branch/BranchInventoryAdjustmentModal.vue';
  import BranchInventoryTransactionModal from '../../components/branch/BranchInventoryTransactionModal.vue';
  // Use centralized API helpers
  import { formatImageUrl, getApiUrl } from '../../config/api.js';
  import { useRouter } from 'vue-router';
  // TinyMCE (self-hosted) for Received By proof capture
  import Editor from '@tinymce/tinymce-vue';
  const TinyMCEEditor = Editor;
  import { sanitizeHtml } from '../../utils/sanitizeHtml.js';
  import tinymce from 'tinymce/tinymce';
  import 'tinymce/tinymce';
  import 'tinymce/icons/default';
  import 'tinymce/themes/silver';
  import 'tinymce/models/dom/model';
  import 'tinymce/plugins/link';
  import 'tinymce/plugins/lists';
  import 'tinymce/plugins/image';
  import 'tinymce/skins/ui/oxide/skin.min.css';
  try {
    tinymce?.EditorManager?.overrideDefaults?.({ license_key: 'gpl' });
  } catch (_) {}

  // TinyMCE configuration
  const tinyMCEConfig = computed(() => ({
    menubar: false,
    height: 220,
    plugins: 'link lists',
    // Only show the explicit upload image button; remove overflow/ellipsis
    toolbar: 'uploadimage',
    toolbar_mode: 'wrap',
    automatic_uploads: true,
    images_upload_url: '/api/uploads/proofs',
    file_picker_types: 'image',
    // Make editor images responsive to avoid oversized previews
    content_style:
      'html,body{max-width:100%;} img{max-width:100%;height:auto;display:block;margin:6px 0;}',
    valid_elements:
      'p,b,i,u,strong,em,ul,ol,li,br,a[href|target|rel],img[src|alt|title|class|style],span[class|style],div[class|style]',
    setup: (ed) => {
      ed.ui.registry.addButton('uploadimage', {
        text: 'Upload Image',
        tooltip: 'Upload image',
        onAction: () => {
          pickAndUploadImage(
            (url) => ed.insertContent(`<img src="${formatImageUrl(url)}" />`),
            'auto'
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

  const pickAndUploadImage = (callback, modalId = 'auto') => {
    try {
      // Detect currently open dialog if auto
      const activeModalId =
        modalId === 'auto'
          ? document.querySelector('dialog[open]')?.id ||
            'distribution_acceptance_modal'
          : modalId;
      const modal = document.getElementById(activeModalId);
      const wasOpen = !!modal?.open;
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
        if (wasOpen)
          try {
            modal.showModal();
          } catch (_) {}
      };
      input.click();
    } catch (_) {}
  };

  const branchContextStore = useBranchContextStore();
  const branchDistributionStore = useBranchDistributionStore();
  const authStore = useAuthStore();
  const branchInventoryStore = useBranchInventoryStore();
  const toast = useToast();
  const router = useRouter();

  // Local state following MainInventory pattern
  const activeTab = ref('overview');
  const inventoryType = ref('scm'); // 'scm' or 'production'
  const searchQuery = ref('');
  const categoryFilter = ref('');
  const statusFilter = ref('');
  const currentPage = ref(1);
  const itemsPerPage = ref(12);
  const loading = ref(false);
  // Branch-provided proof for Received By
  const receivedProofHtml = ref('');

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
  // Normalize category name from mixed shapes (string or { name })
  const getItemCategoryName = (item) => {
    const raw = item?.category ?? item?.category_name ?? null;
    if (!raw) return null;
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object') return raw.name || null;
    return null;
  };

  // Category lists per inventory type
  const scmCategories = computed(() => {
    const set = new Set(
      (branchInventoryStore.inventory || [])
        .filter((i) => i.item_type === 'scm')
        .map((i) => getItemCategoryName(i))
    );
    set.delete(null);
    set.delete('Uncategorized');
    return Array.from(set).sort();
  });

  const productionCategories = computed(() => {
    const set = new Set(
      (branchInventoryStore.inventory || [])
        .filter((i) => i.item_type === 'production')
        .map((i) => getItemCategoryName(i))
    );
    set.delete(null);
    set.delete('Uncategorized');
    return Array.from(set).sort();
  });

  const categories = computed(() =>
    inventoryType.value === 'scm'
      ? scmCategories.value
      : productionCategories.value
  );

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
      // Exclude disposed items from expiring soon stats
      if (item.status === 'disposed') return false;
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= sevenDaysFromNow && expiryDate > now;
    }).length;
  });

  const expiredCount = computed(() => {
    const now = new Date();
    return branchInventory.value.filter((item) => {
      if (!item.expiry_date) return false;
      // Exclude disposed items from expired stats
      if (item.status === 'disposed') return false;
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= now;
    }).length;
  });

  const lowStockItems = computed(
    () => branchInventoryStore.lowStockItems || []
  );
  const recentActivity = ref([]);
  const alerts = ref([]);
  // const reports = ref([]); // Reports tab removed

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

  // Time formatter used by Distribution History rows
  const formatTime = (date) => {
    try {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return '';
      return d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return '';
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

  // Inventory details modal state
  const showInventoryDetails = ref(false);
  const selectedBranchItem = ref(null);
  const selectedBranchItemType = ref('scm');

  const resolveInventoryItemId = async (item) => {
    // Prefer explicit identifiers present on the item
    const explicitId = item?.id || item?.inventory_item_id;
    if (explicitId) return explicitId;

    // Fallback: try mapping by item name to the latest/current inventory id
    const nameKey = (item?.item_name || item?.name || '').toLowerCase();
    if (!nameKey) return null;

    try {
      // Ensure inventory store is loaded
      if (!invStoreSingleton) {
        const invMod = await import('../../stores/inventoryStore');
        invStoreSingleton = invMod.useInventoryStore();
      }
      if (
        !invStoreSingleton.currentInventory ||
        invStoreSingleton.currentInventory.length === 0
      ) {
        await invStoreSingleton.fetchCurrentInventory();
      }

      const candidates = (invStoreSingleton.currentInventory || []).filter(
        (x) => (x.item_name || '').toLowerCase() === nameKey
      );
      if (candidates.length === 0) return null;

      // Choose the most recent by received_date if available, else first
      candidates.sort((a, b) => {
        const da = a.received_date ? new Date(a.received_date).getTime() : 0;
        const db = b.received_date ? new Date(b.received_date).getTime() : 0;
        return db - da;
      });
      return candidates[0].id;
    } catch (_) {
      return null;
    }
  };

  // Open the same inventory details modal used in SCM by pushing to modal route/state
  const viewBatchDetails = async (item) => {
    try {
      let id = item?.id || item?.inventory_item_id;
      if (!id) {
        id = await resolveInventoryItemId(item);
      }
      if (!id) {
        try {
          toast.warning('Unable to locate item details.');
        } catch (_) {}
        return;
      }
      selectedBranchItem.value = item;
      selectedBranchItemType.value =
        inventoryType.value === 'production' ? 'production' : 'scm';
      showInventoryDetails.value = true;
    } catch (_) {}
  };

  // Create Supply Request from alert → switch to in-page BranchRequestSupply tab with prefilled row
  const createSupplyRequestFromAlert = (item) => {
    try {
      // Determine source (scm | production) from the alert item
      const srcType =
        (item?.item_type || '').toLowerCase() === 'production'
          ? 'production'
          : 'scm';
      // Ensure the Request Supply tab reflects the correct source
      inventoryType.value = srcType;
      activeTab.value = 'request_supply';
      // Broadcast a custom event for BranchRequestSupply to pick up and prefill
      const payload = {
        items: [
          {
            name: item.item_name || item.name,
            quantity:
              Math.max(
                0,
                (parseFloat(item.minimum_stock) || 0) -
                  (parseFloat(item.quantity) || 0)
              ) || 1,
            unit: item.unit || item.unit_of_measure || '',
            unit_price:
              parseFloat(
                item.unit_cost != null
                  ? item.unit_cost
                  : item.selling_price || 0
              ) || 0,
            source: srcType,
          },
        ],
        category: item.category || item.category_name || '',
        source: srcType,
        item_type_id: null,
        item_type_name: srcType === 'production' ? 'Production' : 'SCM',
      };
      // Stash payload so the component can consume it on mount
      window.__branchPrefillSupplyRequest = payload;
      // Defer event until after tab renders and component mounts
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('branch-prefill-supply-request', { detail: payload })
        );
      }, 50);
    } catch (_) {}
  };

  // Use the centralized formatImageUrl function from api.js

  const formattedBranchInventory = computed(() => {
    return branchInventory.value.map((item) => {
      // Format image URL for all items that have image_url, not just production items
      if (item.image_url) {
        return { ...item, image_url: formatImageUrl(item.image_url) };
      }
      return item;
    });
  });

  // Transaction modal handler
  const showBranchTransactions = ref(false);
  const openTransactionModal = () => {
    showBranchTransactions.value = true;
  };
  const closeTransactionModal = () => {
    showBranchTransactions.value = false;
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
  const completedDistributions = ref([]);
  const distributionLoading = ref(false);
  const historyLoading = ref(false);
  // Distribution history pagination and date filter
  const historyCurrentPage = ref(1);
  const historyItemsPerPage = ref(10);
  const historyDateFilter = ref({
    type: 'today',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const selectedDistribution = ref(null);
  const showAcceptanceModal = ref(false);
  const showReceiptModal = ref(false);
  const receiptLoading = ref(false);
  // Loading states for actions
  const consumptionSubmitting = ref(false);
  const adjustmentSubmitting = ref(false);
  const showRejectionModal = ref(false);
  const showItemLevelModal = ref(false);
  const distributionCurrentPage = ref(1);
  const distributionItemsPerPage = ref(10);
  const distributionActionLoading = ref(false);
  const itemLevelModal = ref(null);

  // Local modals for consume/adjust (match MainInventory.vue)
  const actionModal = ref({ type: null, show: false, item: null });

  // Return Items state
  const returnType = ref('scm'); // 'scm' | 'production'
  const returnCart = ref([]); // [{ id, item_name, available, unit, quantity, notes }]
  const returnNotes = ref('');
  const returnSubmitting = ref(false);

  const resetReturn = () => {
    returnType.value = 'scm';
    returnCart.value = [];
    returnNotes.value = '';
  };

  const currentReturnSource = computed(() =>
    (formattedBranchInventory.value || []).filter(
      (i) => i.item_type === returnType.value && i.status !== 'disposed'
    )
  );

  // Mapping options for main (SCM) and production menu items
  const scmInventoryOptions = ref([]); // { id, label }
  const productionMenuOptions = ref([]); // { id, label }
  const scmNameToId = ref({});
  const productionNameToId = ref({});
  let invStoreSingleton = null;
  let prodStoreSingleton = null;

  const loadMappingOptions = async () => {
    try {
      // SCM options - cache store and results
      if (!invStoreSingleton) {
        const invMod = await import('../../stores/inventoryStore');
        invStoreSingleton = invMod.useInventoryStore();
      }
      if (
        !invStoreSingleton.currentInventory ||
        invStoreSingleton.currentInventory.length === 0
      ) {
        await invStoreSingleton.fetchCurrentInventory();
      }
      if (scmInventoryOptions.value.length === 0) {
        scmInventoryOptions.value = (
          invStoreSingleton.currentInventory || []
        ).map((x) => ({
          id: x.id,
          label: `${x.item_name} (${x.quantity} ${x.unit_of_measure || x.unit || ''})`,
        }));
        const map = {};
        (invStoreSingleton.currentInventory || []).forEach((x) => {
          map[(x.item_name || '').toLowerCase()] = x.id;
        });
        scmNameToId.value = map;
      }

      // Production options - cache store and results
      if (!prodStoreSingleton) {
        const prodMod = await import('../../stores/productionStore');
        prodStoreSingleton = prodMod.useProductionStore();
      }
      if (
        !prodStoreSingleton.menuItems ||
        prodStoreSingleton.menuItems.length === 0
      ) {
        await prodStoreSingleton.fetchMenuItems();
      }
      if (productionMenuOptions.value.length === 0) {
        productionMenuOptions.value = (prodStoreSingleton.menuItems || []).map(
          (m) => ({
            id: m.id,
            label: `${m.menu_item_name}`,
          })
        );
        const map2 = {};
        (prodStoreSingleton.menuItems || []).forEach((m) => {
          map2[(m.menu_item_name || '').toLowerCase()] = m.id;
        });
        productionNameToId.value = map2;
      }
    } catch (e) {
      console.warn('Failed loading mapping options', e);
    }
  };

  const addToReturnCart = (item) => {
    if (!item?.id) return;
    const exists = returnCart.value.find((r) => r.id === item.id);
    if (exists) return;
    const newRow = {
      id: item.id,
      item_name: item.item_name || item.name,
      available: parseFloat(item.quantity || 0),
      unit: item.unit || item.unit_of_measure,
      quantity: 0,
      notes: '',
      source: returnType.value,
      main_inventory_item_id: null,
      menu_item_id: null,
    };

    // Attempt auto-mapping to main/production item ids by name
    const tryAutoMap = async () => {
      try {
        if (newRow.source === 'scm') {
          await loadMappingOptions();
          const id = scmNameToId.value[(newRow.item_name || '').toLowerCase()];
          if (id) newRow.main_inventory_item_id = id;
        } else if (newRow.source === 'production') {
          await loadMappingOptions();
          const mid =
            productionNameToId.value[(newRow.item_name || '').toLowerCase()];
          if (mid) newRow.menu_item_id = mid;
        }
      } catch (e) {
        console.warn('Auto-map failed', e);
      }
    };

    // Fire and forget auto-map; no need to block UI
    tryAutoMap();

    returnCart.value.push(newRow);
  };

  const removeFromReturnCart = (id) => {
    returnCart.value = returnCart.value.filter((r) => r.id !== id);
  };

  const validateReturnCart = () => {
    if (returnCart.value.length === 0)
      return 'Please select at least one item.';
    for (const row of returnCart.value) {
      const qty = parseFloat(row.quantity || 0);
      if (!qty || qty <= 0) return `Set a valid quantity for ${row.item_name}.`;
      if (qty > parseFloat(row.available || 0))
        return `Return qty exceeds available for ${row.item_name}.`;
    }
    return null;
  };

  const submitReturnItems = async () => {
    const errorMsg = validateReturnCart();
    if (errorMsg) {
      toast.error(errorMsg);
      return;
    }

    const totalLines = returnCart.value.length;
    const totalQty = returnCart.value.reduce(
      (s, r) => s + parseFloat(r.quantity || 0),
      0
    );

    confirmModal.value = {
      show: true,
      title: 'Confirm Return to Main',
      message: `Return ${totalQty} ${totalQty === 1 ? 'unit' : 'units'} across ${totalLines} ${
        totalLines === 1 ? 'item' : 'items'
      } from ${currentBranch.value?.name} → Main (${returnType.value.toUpperCase()})?`,
      onConfirm: async () => {
        returnSubmitting.value = true;
        try {
          // Create a branch return request instead of immediate decrement
          const itemsPayload = returnCart.value.map((row) => ({
            branch_inventory_item_id: row.id,
            item_name: row.item_name,
            unit: row.unit,
            quantity: row.quantity,
            item_type: row.source,
            main_inventory_item_id: row.main_inventory_item_id || null,
            menu_item_id: row.menu_item_id || null,
            notes: row.notes || null,
          }));

          const scmItems = itemsPayload.filter((it) => it.item_type === 'scm');
          const prodItems = itemsPayload.filter(
            (it) => it.item_type === 'production'
          );

          const mod = await import('../../stores/branchReturnStore');
          const branchReturnStore = mod.useBranchReturnStore();
          // Submit separate requests per type to satisfy backend enum
          if (scmItems.length > 0) {
            await branchReturnStore.createReturn({
              branch_id: currentBranch.value?.id,
              return_type: 'scm',
              items: scmItems,
              notes: returnNotes.value || null,
            });
          }
          if (prodItems.length > 0) {
            await branchReturnStore.createReturn({
              branch_id: currentBranch.value?.id,
              return_type: 'production',
              items: prodItems,
              notes: returnNotes.value || null,
            });
          }

          toast.success('Return request submitted for approval.');
          resetReturn();
        } catch (e) {
          console.error('Return failed:', e);
          toast.error('Failed to process return.');
        } finally {
          returnSubmitting.value = false;
        }
      },
      onCancel: () => {},
    };
    openConfirmDialog();
  };

  // Confirmation modal state (mirrors MainInventory)
  const confirmModal = ref({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const confirmLoading = ref(false);

  const openConfirmDialog = () => {
    document.getElementById('branch_inventory_confirm_modal')?.showModal();
  };

  const closeConfirmModal = () => {
    document.getElementById('branch_inventory_confirm_modal')?.close();
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
        confirmLoading.value = true;
        await confirmModal.value.onConfirm();
      } finally {
        confirmLoading.value = false;
        closeConfirmModal();
      }
    }
  };

  // Approved returns floating panel logic
  const approvedReturns = ref([]);
  const approvedLoading = ref(false);
  const showApprovedReturnsPanel = ref(false);
  const branchAckLoadingId = ref(null);
  const rejectedReturns = ref([]);
  const rejectedLoading = ref(false);
  const returnsTab = ref('approved');

  const loadApprovedReturns = async () => {
    try {
      approvedLoading.value = true;
      const mod = await import('../../stores/branchReturnStore');
      const store = mod.useBranchReturnStore();
      const res = await store.fetchReturns({ status: 'Approved' });
      const rows = res?.data || res?.data?.data || store.returns || [];
      approvedReturns.value = (rows || []).filter(
        (r) => !r.branch_acknowledged_at && !r.branch_acknowledged_by
      );
    } catch (e) {
      console.warn('Failed to load approved returns', e);
    } finally {
      approvedLoading.value = false;
    }
  };

  const loadRejectedReturns = async () => {
    try {
      rejectedLoading.value = true;
      const mod = await import('../../stores/branchReturnStore');
      const store = mod.useBranchReturnStore();
      const res = await store.fetchReturns({ status: 'Rejected' });
      const rows = res?.data || res?.data?.data || store.returns || [];
      rejectedReturns.value = (rows || []).filter(
        (r) => !r.branch_acknowledged_at && !r.branch_acknowledged_by
      );
    } catch (e) {
      console.warn('Failed to load rejected returns', e);
    } finally {
      rejectedLoading.value = false;
    }
  };

  const loadReturnsAwaitingAck = async () => {
    await Promise.all([loadApprovedReturns(), loadRejectedReturns()]);
  };

  onMounted(async () => {
    // Preload any awaiting acknowledgment so the floating badge appears
    await loadReturnsAwaitingAck();
  });

  const acknowledgeReturnComplete = async (id) => {
    try {
      branchAckLoadingId.value = id;
      const mod = await import('../../stores/branchReturnStore');
      const store = mod.useBranchReturnStore();
      await store.acknowledgeReturn(id);
      await loadApprovedReturns();
      toast.success('Return acknowledged.');
    } catch (e) {
      toast.error('Failed to acknowledge return.');
    } finally {
      branchAckLoadingId.value = null;
    }
  };

  // Auto-refresh returns awaiting acknowledgment to avoid manual page reloads
  const returnsRefreshTimer = ref(null);
  onMounted(async () => {
    await loadReturnsAwaitingAck();
    returnsRefreshTimer.value = setInterval(loadReturnsAwaitingAck, 15000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadReturnsAwaitingAck();
    };
    document.addEventListener('visibilitychange', onVisibility);
    // attach for cleanup
    returnsRefreshTimer._onVisibility = onVisibility;
  });

  onUnmounted(() => {
    if (returnsRefreshTimer.value) clearInterval(returnsRefreshTimer.value);
    if (returnsRefreshTimer._onVisibility) {
      document.removeEventListener(
        'visibilitychange',
        returnsRefreshTimer._onVisibility
      );
    }
  });

  const openConsumeModal = (item) => {
    actionModal.value = { type: 'consumption', show: true, item };
  };

  const openAdjustModal = (item) => {
    actionModal.value = { type: 'adjustment', show: true, item };
  };

  // Pre-populate adjustment modal for disposal
  const markForDisposal = (item) => {
    actionModal.value = {
      type: 'adjustment',
      show: true,
      item,
      prefill: { adjustment_type: 'disposal', reason: 'Expiry' },
    };
    // Slight delay to allow modal to mount before user interaction
    setTimeout(() => {
      try {
        // No direct refs to set inner form; the modal auto-locks to disposal when expired
        // and shows disposal cost field. Passing the item is enough for preselection.
      } catch (_) {}
    }, 0);
  };

  const closeActionModal = () => {
    actionModal.value = { type: null, show: false, item: null };
  };

  // Build lightweight category and itemType lists for the modals from branch data
  const modalCategories = computed(() => {
    const nameToId = new Map();
    const result = [];
    let nextId = 1;
    branchInventory.value.forEach((x) => {
      const name = x.category || 'Uncategorized';
      if (!nameToId.has(name)) {
        nameToId.set(name, nextId++);
        result.push({ id: nameToId.get(name), name });
      }
    });
    return result;
  });

  const modalItemTypes = computed(() => {
    const out = new Map();
    const catIndex = new Map(modalCategories.value.map((c) => [c.name, c.id]));
    branchInventory.value.forEach((x) => {
      const key = x.item_type_id || `${x.item_name}`;
      if (!out.has(key)) {
        out.set(key, {
          id: x.item_type_id || key,
          name: x.item_name || x.item_type_name || x.name || 'Item',
          category_id: catIndex.get(x.category || 'Uncategorized') || 0,
        });
      }
    });
    return Array.from(out.values());
  });

  const modalCurrentInventory = computed(() => {
    const mapStatus = (it) => {
      if (it?.expiry_date) {
        const d = getDaysUntilExpiry(it.expiry_date);
        if (Number.isFinite(d) && d <= 0) return 'expired';
      }
      return 'available';
    };
    return branchInventory.value.map((it) => ({
      id: it.id,
      item_type_id: it.item_type_id || it.id,
      item_name: it.item_name || it.name,
      quantity: parseFloat(it.quantity || 0),
      unit_of_measure: it.unit || it.unit_of_measure || '',
      batch_number: it.batch_number || null,
      expiry_date: it.expiry_date || null,
      unit_cost: parseFloat(it.unit_price || it.unit_cost || 0),
      total_value: parseFloat(it.total_value || 0),
      status: mapStatus(it),
    }));
  });

  const handleConsumptionSubmit = async (payload) => {
    try {
      const items = Array.isArray(payload?.items) ? payload.items : [];
      const qtyLabel = items
        .map((it) => `${parseFloat(it.quantity || 0)} ${it.unit || ''}`.trim())
        .join(', ');
      const itemLabel =
        items.length === 1
          ? items[0]?.item_name || items[0]?.name || 'this item'
          : `${items.length} items`;

      confirmModal.value = {
        show: true,
        title: 'Confirm Usage',
        message: `Record usage of ${qtyLabel} for ${itemLabel}?`,
        onConfirm: async () => {
          consumptionSubmitting.value = true;
          try {
            for (const it of items) {
              const current = branchInventory.value.find(
                (s) => s.id == it.inventory_item_id
              );
              const currentQty = parseFloat(current?.quantity || 0);
              const consumeQty = parseFloat(it.quantity || 0);
              const newQty = Math.max(0, currentQty - consumeQty);
              await branchInventoryStore.updateQuantity(
                it.inventory_item_id,
                newQty,
                'consumption'
              );
            }
            toast.success('Usage recorded.');
          } catch (err) {
            console.error('Failed to record consumption:', err);
            toast.error('Failed to record usage.');
          } finally {
            consumptionSubmitting.value = false;
            closeActionModal();
            await loadBranchInventory();
          }
        },
      };
      openConfirmDialog();
    } catch (err) {
      console.error('Failed to prepare usage confirmation:', err);
      toast.error('Failed to prepare confirmation.');
    }
  };

  const handleAdjustmentSubmit = async (payload) => {
    try {
      if (!payload?.inventory_item_id) return;

      const current = branchInventory.value.find(
        (s) => s.id == payload.inventory_item_id
      );
      const currentQty = parseFloat(current?.quantity || 0);

      let previewQty = currentQty;
      switch (payload.adjustment_type) {
        case 'set_quantity':
          previewQty = parseFloat(payload.new_quantity);
          break;
        case 'add_quantity':
          previewQty = currentQty + parseFloat(payload.new_quantity || 0);
          break;
        case 'reduce_quantity':
          previewQty = Math.max(
            0,
            currentQty - parseFloat(payload.new_quantity || 0)
          );
          break;
        case 'mark_expired':
        case 'mark_damaged':
        case 'disposal':
          previewQty = 0;
          break;
        case 'set_expiry_date':
          previewQty = currentQty;
          break;
      }

      const actionLabel =
        payload.adjustment_type === 'set_quantity'
          ? `set quantity to ${previewQty}`
          : payload.adjustment_type === 'add_quantity'
            ? `increase to ${previewQty}`
            : payload.adjustment_type === 'reduce_quantity'
              ? `decrease to ${previewQty}`
              : payload.adjustment_type === 'set_expiry_date'
                ? 'set expiry date'
                : 'dispose item';

      const itemLabel = current?.item_name || current?.name || 'this item';

      confirmModal.value = {
        show: true,
        title: 'Confirm Adjustment',
        message: `Apply adjustment: ${actionLabel} for ${itemLabel}?`,
        onConfirm: async () => {
          adjustmentSubmitting.value = true;
          try {
            if (payload.adjustment_type === 'set_expiry_date') {
              await branchInventoryStore.updateExpiryDate(
                payload.inventory_item_id,
                payload.new_expiry_date,
                {
                  reference_number: payload.reference_number || null,
                  notes: payload.notes || 'Set expiry date',
                }
              );
            } else {
              await branchInventoryStore.updateQuantity(
                payload.inventory_item_id,
                previewQty,
                payload.adjustment_type === 'disposal'
                  ? 'disposal'
                  : 'adjustment'
              );

              if (payload.adjustment_type === 'disposal') {
                await branchInventoryStore.updateStatus(
                  payload.inventory_item_id,
                  'disposed'
                );
              }
            }
            toast.success('Adjustment applied.');
          } catch (err) {
            console.error('Failed to apply adjustment:', err);
            toast.error('Failed to apply adjustment.');
          } finally {
            adjustmentSubmitting.value = false;
            closeActionModal();
            await loadBranchInventory();
          }
        },
      };
      openConfirmDialog();
    } catch (err) {
      console.error('Failed to prepare adjustment confirmation:', err);
      toast.error('Failed to prepare confirmation.');
    }
  };

  // Rejection form state
  const rejectionForm = ref({
    reason: '',
    notes: '',
  });

  // Computed
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const userRole = computed(() => branchContextStore.userRole);
  const canEdit = computed(() => branchContextStore.canAccessInventory);
  const isCook = computed(
    () => (userRole.value || '').toLowerCase() === 'cook'
  );

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
      items = items.filter(
        (item) => getItemCategoryName(item) === categoryFilter.value
      );
    }

    // Filter by status
    if (statusFilter.value === 'low_stock') {
      items = items.filter(
        (item) => parseFloat(item.quantity) <= parseFloat(item.minimum_stock)
      );
    } else if (statusFilter.value === 'out_of_stock') {
      items = items.filter((item) => parseFloat(item.quantity) === 0);
    }

    // Hide disposed items from list view
    items = items.filter((it) => it.status !== 'disposed');

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
    const quantity = parseFloat(item.quantity);
    const minimum = parseFloat(item.minimum_stock);

    // Disposed items should be labeled accordingly
    if (item?.status === 'disposed') {
      return {
        status: 'disposed',
        class: 'bg-error/20 text-error',
        text: 'Disposed',
      };
    }

    // Expiry-aware status (mirror MainInventory behavior)
    if (item?.expiry_date) {
      const daysUntilExpiry = getDaysUntilExpiry(item.expiry_date);
      if (Number.isFinite(daysUntilExpiry)) {
        if (daysUntilExpiry <= 0) {
          return {
            status: 'expired',
            class: 'bg-error/20 text-error',
            text: 'Expired',
          };
        }
        if (daysUntilExpiry <= 7) {
          // Mark as expiring soon if not already out of stock
          if (quantity > 0) {
            return {
              status: 'expiring',
              class: 'bg-warning/20 text-warning',
              text: 'Expiring Soon',
            };
          }
        }
      }
    }

    // Stock-based status
    if (quantity === 0)
      return {
        status: 'out',
        class: 'bg-error/20 text-error',
        text: 'Out of Stock',
      };
    if (quantity <= minimum)
      return {
        status: 'low',
        class: 'bg-warning/20 text-warning',
        text: 'Low Stock',
      };

    return {
      status: 'good',
      class: 'bg-success/20 text-success',
      text: 'In Stock',
    };
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

      // Calculate SCM stats (exclude disposed items from counts)
      const scmItems = branchInventory.value.filter(
        (item) => item.item_type === 'scm'
      );
      const scmActiveItems = scmItems.filter(
        (item) => item.status !== 'disposed'
      );
      inventoryStats.value = {
        totalItems: scmActiveItems.length,
        lowStockItems: scmActiveItems.filter(
          (item) =>
            parseFloat(item.quantity) <= parseFloat(item.minimum_stock) &&
            parseFloat(item.quantity) > 0
        ).length,
        outOfStockItems: scmActiveItems.filter(
          (item) => parseFloat(item.quantity) === 0
        ).length,
        totalValue: scmActiveItems.reduce(
          (total, item) => total + parseFloat(item.total_value || 0),
          0
        ),
      };

      // Calculate Production stats (exclude disposed items from counts)
      const productionItems = branchInventory.value.filter(
        (item) => item.item_type === 'production'
      );
      const productionActiveItems = productionItems.filter(
        (item) => item.status !== 'disposed'
      );
      productionStats.value = {
        totalItems: productionActiveItems.length,
        lowStockItems: productionActiveItems.filter(
          (item) =>
            parseFloat(item.quantity) <= parseFloat(item.minimum_stock) &&
            parseFloat(item.quantity) > 0
        ).length,
        outOfStockItems: productionActiveItems.filter(
          (item) => parseFloat(item.quantity) === 0
        ).length,
        totalValue: productionActiveItems.reduce(
          (total, item) => total + parseFloat(item.total_value || 0),
          0
        ),
      };

      // Replace mocked recent activity with live branch transactions
      try {
        const tx = await branchInventoryStore.fetchAllTransactions(
          currentBranch.value.id,
          { limit: 10, page: 1 }
        );
        recentActivity.value = (tx?.data || []).map((t) => ({
          id: t.id,
          transaction_type: t.transaction_type,
          item_name: t.item_name,
          unit_of_measure: t.unit_of_measure,
          quantity: parseFloat(t.quantity || 0),
          total_value: 0,
          value: 0,
          transaction_date: t.created_at,
          performed_by: t.performed_by_name || t.performed_by,
          notes: t.notes,
        }));
      } catch (e) {
        console.warn('Failed to load recent transactions for activity:', e);
      }

      // Generate real alerts from branch inventory data
      const realAlerts = [];
      console.log('Branch inventory data for alerts:', branchInventory.value);

      // Low stock alerts (exclude disposed items and Equipment category)
      const lowStockItems = branchInventory.value.filter(
        (item) =>
          item.status !== 'disposed' &&
          parseFloat(item.quantity) <= parseFloat(item.minimum_stock) &&
          parseFloat(item.quantity) > 0 &&
          item.category !== 'Equipment'
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

      // Out of stock alerts (exclude disposed items and Equipment category)
      const outOfStockItems = branchInventory.value.filter(
        (item) =>
          item.status !== 'disposed' &&
          parseFloat(item.quantity) === 0 &&
          item.category !== 'Equipment'
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

      // Expiring items alerts (exclude disposed and Equipment category)
      const expiringItems = branchInventory.value.filter(
        (item) =>
          item.status !== 'disposed' &&
          item.expiry_date &&
          item.category !== 'Equipment' &&
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

      alerts.value = realAlerts;

      // Low stock items
      lowStockItems.value = branchInventory.value.filter(
        (item) => parseFloat(item.quantity) <= parseFloat(item.minimum_stock)
      );

      // Reports generation removed - Reports tab no longer available
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

  // Load completed distributions (history) for current branch
  const loadCompletedDistributions = async () => {
    if (!currentBranch.value?.id) return;

    historyLoading.value = true;
    try {
      // Fetch a larger page once to avoid N+1 and reduce refetching
      await branchDistributionStore.fetchDistributions({ page: 1, limit: 500 });
      const all = branchDistributionStore.distributions || [];
      const branchCompleted = all.filter(
        (d) =>
          d.branch_id === currentBranch.value.id && d.status === 'completed'
      );
      // Assume base list already contains needed fields for history. We fetch
      // full details only when viewing a receipt.
      completedDistributions.value = branchCompleted.map((dist) => ({
        ...dist,
        items:
          dist.items?.map((it) => ({
            ...it,
            qty: parseFloat(it.qty) || 0,
            unit_price: parseFloat(it.unit_price) || 0,
            amount: parseFloat(it.amount) || 0,
          })) || [],
      }));
    } catch (err) {
      console.error('Error loading completed distributions:', err);
      completedDistributions.value = [];
    } finally {
      historyLoading.value = false;
    }
  };

  // Helpers for date ranges (mirrors RequestSupply.vue semantics)
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    return new Date(d.getFullYear(), d.getMonth(), diff);
  };

  const getStartOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth(), 1);
  const getEndOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const isDateInRange = (date, start, end) => {
    const d = new Date(date);
    return d >= start && d <= end;
  };

  const filteredCompletedDistributions = computed(() => {
    const type = historyDateFilter.value.type;
    if (!type) return completedDistributions.value;
    const today = new Date();
    if (type === 'today') {
      const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const end = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999
      );
      return completedDistributions.value.filter((r) =>
        isDateInRange(r.created_at, start, end)
      );
    }
    if (type === 'week') {
      const start = getStartOfWeek(today);
      const end = new Date();
      return completedDistributions.value.filter((r) =>
        isDateInRange(r.created_at, start, end)
      );
    }
    if (type === 'month') {
      const start = getStartOfMonth(today);
      const end = new Date();
      return completedDistributions.value.filter((r) =>
        isDateInRange(r.created_at, start, end)
      );
    }
    if (type === 'custom_month') {
      const year = historyDateFilter.value.year;
      const month = historyDateFilter.value.month - 1; // 0-based
      const start = new Date(year, month, 1);
      const end = getEndOfMonth(start);
      return completedDistributions.value.filter((r) =>
        isDateInRange(r.created_at, start, end)
      );
    }
    return completedDistributions.value;
  });

  const paginatedCompletedDistributions = computed(() => {
    const start = (historyCurrentPage.value - 1) * historyItemsPerPage.value;
    const end = start + historyItemsPerPage.value;
    return filteredCompletedDistributions.value
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(start, end);
  });

  const totalHistoryPages = computed(() => {
    return Math.ceil(
      (filteredCompletedDistributions.value.length || 0) /
        historyItemsPerPage.value
    );
  });

  const setHistoryFilter = (type) => {
    historyDateFilter.value.type = type;
    historyCurrentPage.value = 1;
  };

  const openAcceptanceModal = (distribution) => {
    console.log('Opening acceptance modal for distribution:', distribution);
    selectedDistribution.value = distribution;
    // Reset received proof input
    receivedProofHtml.value = '';
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
        received_proof_html: sanitizeHtml(receivedProofHtml.value),
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
        rejection_notes: sanitizeHtml(rejectionForm.value.notes),
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

  const viewDistributionReceipt = async (distribution) => {
    try {
      receiptLoading.value = true;
      console.log('Debug - viewDistributionReceipt called with:', distribution);
      console.log('Debug - Original distribution data:', distribution);

      // Ensure we have full details for the selected distribution (fetch on demand)
      let full = null;
      try {
        full = await branchDistributionStore.fetchDistributionById(
          distribution.id
        );
      } catch (e) {
        full = distribution;
      }

      // Format the distribution data to match the receipt modal expectations
      const receiptData = {
        ...full,
        completed_at: distribution.completed_at || distribution.created_at,
        // Map the correct fields for the receipt modal
        processed_by: full.processed_by || null,
        completed_by: full.completed_by || null,
        received_by:
          full.processed_by ||
          full.completed_by ||
          (() => {
            const user = authStore.user;
            if (user?.first_name && user?.last_name) {
              return `${user.first_name} ${user.last_name}`;
            }
            return user?.name || 'Branch Manager';
          })(),
        // Include proof fields to match MainInventory behavior
        prepared_proof_html: full.prepared_proof_html || null,
        received_proof_html: full.received_proof_html || null,
        items:
          (full.items || distribution.items || [])?.map((item) => ({
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
    } finally {
      receiptLoading.value = false;
    }
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
        loadCompletedDistributions();
      }
    },
    { immediate: true }
  );

  // Initialize
  onMounted(() => {
    // Data will be loaded by the watcher when currentBranch is available
    console.log('BranchInventory mounted, currentBranch:', currentBranch.value);
    if (isCook.value) {
      activeTab.value = 'inventory';
    }
  });

  // Ensure cooks stay on the Inventory List tab
  watch(
    isCook,
    (val) => {
      if (val) activeTab.value = 'inventory';
    },
    { immediate: false }
  );
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
        v-if="!isCook"
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
        v-if="!isCook"
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
        v-if="!isCook"
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
        v-if="!isCook"
        @click="activeTab = 'distribution_history'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'distribution_history' }"
      >
        <Eye class="w-4 h-4 mr-1" />
        Distribution History
      </button>
      <button
        v-if="!isCook"
        @click="activeTab = 'request_supply'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'request_supply' }"
      >
        <Handshake class="w-4 h-4 mr-1" />
        Supply Request
      </button>
      <button
        v-if="!isCook"
        @click="activeTab = 'return_items'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'return_items' }"
      >
        <RefreshCcw class="w-4 h-4 mr-1" />
        Return Items
      </button>
    </div>

    <!-- Main Content Card -->
    <div
      class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10"
    >
      <div class="card-body p-3 sm:p-4 lg:p-6">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview' && !isCook" class="space-y-6">
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
            <div class="card-body p-6 bg-accentColor">
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
          <div class="flex justify-start mb-6 sm:mb-4 lg:mb-6">
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
                Inventory
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
                Menu Inventory
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
                      class="btn btn-sm text-gray-500 hover:bg-primaryColor/10 join-item"
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
                {{ inventoryType === 'scm' ? 'Raw' : 'Menu' }} Inventory Items
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
                  <table class="table table-zebra w-full table-xs custom-zebra">
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
                            <div v-if="item.image_url" class="avatar">
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
                          <div class="badge badge-sm">
                            {{ item.category }}
                          </div>
                        </td>
                        <td>
                          <div class="font-medium text-sm">
                            {{ item.quantity }} {{ item.unit }}
                          </div>
                          <div class="text-gray-500 text-xs">
                            Min: {{ item.minimum_stock }}
                          </div>
                        </td>
                        <td v-if="inventoryType === 'production'">
                          <div
                            class="font-medium text-sm"
                            v-if="item.selling_price"
                          >
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
                              getStockStatus(item).class,
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
                            <button
                              class="btn btn-ghost btn-xs"
                              @click="openConsumeModal(item)"
                              :disabled="
                                getStockStatus(item).status === 'expired'
                              "
                            >
                              <Minus class="w-4 h-4" />
                            </button>
                            <button
                              class="btn btn-ghost btn-xs"
                              @click="openAdjustModal(item)"
                            >
                              <RefreshCcw class="w-4 h-4" />
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
        <div v-if="activeTab === 'alerts' && !isCook" class="space-y-6">
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
              v-for="item in branchInventory.filter(
                (i) =>
                  i.status !== 'disposed' &&
                  i.expiry_date &&
                  i.category !== 'Equipment'
              )"
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
                  <button
                    class="btn btn-ghost btn-xs"
                    @click="markForDisposal(item)"
                  >
                    Mark for Disposal
                  </button>
                </div>
              </div>
            </div>

            <div
              v-if="
                branchInventory.filter(
                  (i) =>
                    i.status !== 'disposed' &&
                    i.expiry_date &&
                    i.category !== 'Equipment'
                ).length === 0
              "
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
                (i) =>
                  i.status !== 'disposed' &&
                  parseFloat(i.quantity) <= parseFloat(i.minimum_stock) &&
                  i.category !== 'Equipment'
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
                  <button
                    class="btn btn-ghost btn-xs"
                    @click="viewBatchDetails(item)"
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

            <div
              v-if="
                branchInventory.filter(
                  (i) =>
                    i.status !== 'disposed' &&
                    parseFloat(i.quantity) <= parseFloat(i.minimum_stock)
                ).length === 0
              "
              class="text-center py-8"
            >
              <CheckCircle class="w-12 h-12 mx-auto text-success mb-2" />
              <p class="text-gray-500">No low stock alerts!</p>
            </div>
          </div>
        </div>

        <!-- Pending Distributions Tab -->
        <div
          v-if="activeTab === 'pending_distributions' && !isCook"
          class="space-y-6"
        >
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
                  <table class="table table-zebra w-full table-xs custom-zebra">
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
                <div class="mb-3">
                  <p class="text-xs text-gray-600 mb-2">
                    <strong>Processing Options:</strong> Use "Select Items" for
                    partial acceptance/rejection, or "Accept All"/"Reject All"
                    for complete processing.
                  </p>
                </div>
                <div
                  class="flex flex-col sm:flex-row justify-end sm:space-x-2 space-y-2 sm:space-y-0 w-full sm:w-auto"
                >
                  <!-- Item-Level Processing Button - Allows selecting individual items to accept/reject -->
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
                    title="Click to select individual items to accept or reject"
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

        <!-- Distribution History -->
        <div
          v-if="activeTab === 'distribution_history' && !isCook"
          class="space-y-6"
        >
          <div class="flex items-center justify-between">
            <h3 class="text-xl font-semibold text-primaryColor">
              Completed Distributions
            </h3>
            <button
              @click="loadCompletedDistributions"
              :disabled="historyLoading"
              class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
            >
              <RefreshCcw
                :class="['w-4 h-4 mr-2', { 'animate-spin': historyLoading }]"
              />
              Refresh
            </button>
          </div>

          <!-- Date Filters (match RequestSupply style) -->
          <div class="flex flex-wrap items-center gap-2">
            <div class="join">
              <button
                class="join-item btn btn-xs font-thin"
                :class="
                  historyDateFilter.type === 'today'
                    ? '!bg-primaryColor/10 text-primaryColor border border-none'
                    : '!bg-gray-200 text-black/50 border border-none hover:bg-gray-300'
                "
                @click="setHistoryFilter('today')"
              >
                Today
              </button>
              <button
                class="join-item btn btn-xs font-thin"
                :class="
                  historyDateFilter.type === 'week'
                    ? '!bg-primaryColor/10 text-primaryColor border border-none'
                    : '!bg-gray-200 text-black/50 border border-none hover:bg-gray-300'
                "
                @click="setHistoryFilter('week')"
              >
                This Week
              </button>
              <button
                class="join-item btn btn-xs font-thin"
                :class="
                  historyDateFilter.type === 'month'
                    ? '!bg-primaryColor/10 text-primaryColor border border-none'
                    : '!bg-gray-200 text-black/50 border border-none hover:bg-gray-300'
                "
                @click="setHistoryFilter('month')"
              >
                This Month
              </button>
              <button
                class="join-item btn btn-xs font-thin"
                :class="
                  historyDateFilter.type === 'custom_month'
                    ? '!bg-primaryColor/10 text-primaryColor border border-none'
                    : '!bg-gray-200 text-black/50 border border-none hover:bg-gray-300'
                "
                @click="setHistoryFilter('custom_month')"
              >
                Custom Month
              </button>
            </div>

            <div
              v-if="historyDateFilter.type === 'custom_month'"
              class="flex items-center gap-2"
            >
              <select
                class="select select-bordered select-xs"
                v-model.number="historyDateFilter.month"
                @change="historyCurrentPage = 1"
              >
                <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
              </select>
              <input
                type="number"
                class="input input-bordered input-xs w-20"
                v-model.number="historyDateFilter.year"
                @change="historyCurrentPage = 1"
              />
            </div>
          </div>

          <div v-if="historyLoading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-xs"></span>
          </div>

          <template v-else-if="paginatedCompletedDistributions.length > 0">
            <div class="overflow-x-auto">
              <table class="table w-full table-xs table-zebra custom-zebra">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Branch</th>
                    <th>Prepared By</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="distribution in paginatedCompletedDistributions"
                    :key="distribution.id"
                  >
                    <td class="w-40 whitespace-nowrap">
                      <div class="text-sm font-medium text-gray-900">
                        {{ formatDate(distribution.created_at) }}
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ formatTime(distribution.created_at) }}
                      </div>
                    </td>
                    <td class="font-semibold">{{ distribution.reference }}</td>
                    <td>
                      {{ distribution.branch_name || currentBranch?.name }}
                    </td>
                    <td>{{ distribution.prepared_by }}</td>
                    <td>
                      ₱{{ Number(distribution.total_amount || 0).toFixed(2) }}
                    </td>
                    <td>
                      <div class="badge bg-success/10 text-success badge-sm">
                        Completed
                      </div>
                    </td>
                    <td>
                      <button
                        @click="viewDistributionReceipt(distribution)"
                        class="btn btn-xs text-black/50 bg-gray-200 font-thin border border-none hover:bg-gray-300"
                        :disabled="receiptLoading"
                      >
                        <span
                          v-if="receiptLoading"
                          class="loading loading-spinner loading-xs mr-1"
                        ></span>
                        <template v-else>
                          <Eye class="w-4 h-4 mr-1" />
                        </template>
                        View Receipt
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <!-- Pagination for history -->
            <div class="flex justify-center mt-4" v-if="totalHistoryPages > 1">
              <div class="join space-x-1">
                <button
                  :disabled="historyCurrentPage === 1"
                  @click="historyCurrentPage--"
                  class="join-item btn font-thin !bg-gray-200 text-black/50 btn-xs border border-none hover:bg-gray-300 shadow-none"
                >
                  «
                </button>
                <button
                  class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-xs shadow-none hover:bg-gray-300"
                >
                  Page {{ historyCurrentPage }} of {{ totalHistoryPages }}
                </button>
                <button
                  :disabled="historyCurrentPage === totalHistoryPages"
                  @click="historyCurrentPage++"
                  class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-xs shadow-none hover:bg-gray-300"
                >
                  »
                </button>
              </div>
            </div>
          </template>

          <div v-else class="text-center text-black/50 py-8">
            No completed distributions found for this branch
          </div>
        </div>

        <!-- Return Items Tab -->
        <div v-if="activeTab === 'return_items' && !isCook" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4"
          >
            <h2
              class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl"
            >
              <RefreshCcw class="w-5 h-5 sm:w-6 sm:h-6" />
              Return Items to Main
            </h2>
            <div class="join gap-1">
              <button
                class="join-item btn btn-sm font-thin"
                :class="
                  returnType === 'scm'
                    ? '!bg-primaryColor/10 text-primaryColor border border-none'
                    : '!bg-gray-200 text-black/50 border border-none hover:bg-gray-300'
                "
                @click="returnType = 'scm'"
              >
                SCM
              </button>
              <button
                class="join-item btn btn-sm font-thin"
                :class="
                  returnType === 'production'
                    ? '!bg-primaryColor/10 text-primaryColor border border-none'
                    : '!bg-gray-200 text-black/50 border border-none hover:bg-gray-300'
                "
                @click="returnType = 'production'"
              >
                Production
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="card bg-white shadow-lg">
              <div class="card-body p-4">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-semibold">
                    Select Items ({{ returnType.toUpperCase() }})
                  </h3>
                  <span class="text-xs text-gray-500"
                    >Available: {{ currentReturnSource.length }}</span
                  >
                </div>
                <div class="overflow-x-auto">
                  <table class="table table-zebra w-full table-xs custom-zebra">
                    <thead>
                      <tr class="bg-base-200">
                        <th>Item</th>
                        <th class="text-right">Available</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="it in currentReturnSource" :key="it.id">
                        <td>
                          <div class="flex items-center gap-2">
                            <span class="font-medium">{{ it.item_name }}</span>
                            <span class="badge badge-ghost badge-xs">{{
                              it.unit
                            }}</span>
                          </div>
                        </td>
                        <td class="text-right">
                          {{ Number(it.quantity).toLocaleString() }}
                        </td>
                        <td class="text-right">
                          <button
                            class="btn btn-xs"
                            @click="addToReturnCart(it)"
                            :disabled="returnCart.some((r) => r.id === it.id)"
                          >
                            Add
                          </button>
                        </td>
                      </tr>
                      <tr v-if="currentReturnSource.length === 0">
                        <td
                          colspan="3"
                          class="text-center text-sm text-gray-500 py-6"
                        >
                          No items found.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="card bg-white shadow-lg">
              <div class="card-body p-4">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-semibold">Return Cart</h3>
                  <button
                    class="btn btn-ghost btn-xs"
                    @click="resetReturn"
                    :disabled="returnCart.length === 0"
                  >
                    Clear
                  </button>
                </div>
                <div class="overflow-x-auto overflow-y-auto">
                  <table class="table w-full table-xs">
                    <thead>
                      <tr class="bg-base-200">
                        <th>Item</th>
                        <th class="text-right">Avail.</th>
                        <th class="text-right">Return Qty</th>
                        <th>Map: Main Item</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in returnCart" :key="row.id">
                        <td>
                          <div class="flex flex-col">
                            <span class="font-medium">{{ row.item_name }}</span>
                            <span class="text-xs text-gray-500"
                              >Unit: {{ row.unit }}</span
                            >
                          </div>
                        </td>
                        <td class="text-right">
                          {{ Number(row.available).toLocaleString() }}
                        </td>
                        <td class="text-right">
                          <input
                            type="number"
                            class="input input-bordered input-xs w-28 text-right"
                            v-model.number="row.quantity"
                            :max="row.available"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td>
                          <div
                            v-if="row.source === 'scm'"
                            class="min-w-[220px]"
                          >
                            <select
                              class="select select-bordered select-xs w-full"
                              v-model="row.main_inventory_item_id"
                              @focus="loadMappingOptions"
                            >
                              <option :value="null">
                                Select main inventory item (optional)
                              </option>
                              <option
                                v-for="opt in scmInventoryOptions"
                                :key="opt.id"
                                :value="opt.id"
                              >
                                {{ opt.label }}
                              </option>
                            </select>
                          </div>
                          <div v-else class="min-w-[220px]">
                            <select
                              class="select select-bordered select-xs w-full"
                              v-model="row.menu_item_id"
                              @focus="loadMappingOptions"
                            >
                              <option :value="null">
                                Select menu item (optional)
                              </option>
                              <option
                                v-for="opt in productionMenuOptions"
                                :key="opt.id"
                                :value="opt.id"
                              >
                                {{ opt.label }}
                              </option>
                            </select>
                          </div>
                        </td>
                        <td class="text-right">
                          <button
                            class="btn btn-ghost btn-xs"
                            @click="removeFromReturnCart(row.id)"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                      <tr v-if="returnCart.length === 0">
                        <td
                          colspan="4"
                          class="text-center text-sm text-gray-500 py-6"
                        >
                          No items selected.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="mt-3">
                  <label class="label"
                    ><span class="label-text text-xs"
                      >Notes (optional)</span
                    ></label
                  >
                  <textarea
                    class="textarea textarea-bordered w-full"
                    rows="2"
                    v-model="returnNotes"
                    placeholder="Reason or remarks..."
                  ></textarea>
                </div>

                <div class="mt-4 flex justify-end">
                  <button
                    class="btn bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80 btn-sm"
                    :disabled="returnSubmitting || returnCart.length === 0"
                    @click="submitReturnItems"
                  >
                    <span
                      v-if="returnSubmitting"
                      class="loading loading-spinner loading-xs mr-2"
                    ></span>
                    Submit Return
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Request Supply Tab -->
        <div v-if="activeTab === 'request_supply' && !isCook" class="space-y-6">
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
      <div class="modal-box w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
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
              <table class="table table-zebra w-full table-xs custom-zebra">
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

          <!-- Received By Proof (Branch) -->
          <div>
            <h4 class="font-semibold text-lg mb-2">Received By Proof</h4>
            <TinyMCEEditor v-model="receivedProofHtml" :init="tinyMCEConfig" />
          </div>

          <!-- Confirmation Message -->
          <div class="alert bg-blue-50 text-blue-600">
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
              <TinyMCEEditor
                v-model="rejectionForm.notes"
                :init="tinyMCEConfig"
              />
            </div>
          </div>

          <!-- Warning Message -->
          <div class="alert bg-warning/20 text-warning shadow-none">
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

    <!-- Branch Inventory action modals -->
    <BranchInventoryConsumptionModal
      :show="actionModal.show && actionModal.type === 'consumption'"
      :categories="modalCategories"
      :item-types="modalItemTypes"
      :current-inventory="modalCurrentInventory"
      :preselected-item="actionModal.item"
      @close="closeActionModal"
      @submit="handleConsumptionSubmit"
    />

    <BranchInventoryAdjustmentModal
      :show="actionModal.show && actionModal.type === 'adjustment'"
      :categories="modalCategories"
      :item-types="modalItemTypes"
      :current-inventory="modalCurrentInventory"
      :preselected-item="actionModal.item"
      :prefill="actionModal.prefill"
      @close="closeActionModal"
      @submit="handleAdjustmentSubmit"
    />

    <!-- Confirmation Modal -->
    <dialog id="branch_inventory_confirm_modal" class="modal">
      <div class="modal-box max-w-xl">
        <h3 class="font-bold text-lg mb-2">{{ confirmModal.title }}</h3>
        <p class="text-sm text-gray-600">{{ confirmModal.message }}</p>
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

    <!-- Branch Transactions Modal -->
    <BranchInventoryTransactionModal
      :show="showBranchTransactions"
      @close="closeTransactionModal"
    />

    <!-- Floating: Approved Returns Awaiting Acknowledgment -->
    <div
      class="fixed bottom-24 right-4 z-30"
      v-if="approvedReturns.length > 0 || rejectedReturns.length > 0"
    >
      <div
        class="card shadow-lg bg-base-100 border border-base-200 cursor-pointer"
        @click="
          showApprovedReturnsPanel = true;
          loadReturnsAwaitingAck();
        "
      >
        <div class="card-body p-3">
          <div class="flex items-center gap-2">
            <div class="badge bg-success/20 text-success">Returns</div>
            <div class="text-xs text-gray-500">Awaiting acknowledgment</div>
            <div class="ml-auto badge bg-success/20 text-success font-thin">
              {{ approvedReturns.length + rejectedReturns.length }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <dialog
      id="approved_returns_panel"
      class="modal"
      :open="showApprovedReturnsPanel"
    >
      <div class="modal-box max-w-3xl">
        <h3 class="font-bold text-lg mb-2">
          Branch Returns Awaiting Acknowledgment
        </h3>
        <div class="overflow-x-auto max-h-[60vh]">
          <table class="table table-zebra table-xs w-full custom-zebra">
            <thead>
              <tr class="bg-base-200">
                <th>ID</th>
                <th>Type</th>
                <th>Items</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="approvedLoading || rejectedLoading">
                <td colspan="4" class="text-center py-6">
                  <span class="loading loading-spinner loading-sm"></span>
                </td>
              </tr>
              <tr
                v-for="ret in returnsTab === 'approved'
                  ? approvedReturns
                  : rejectedReturns"
                :key="ret.id"
              >
                <td class="font-medium">#{{ ret.id }}</td>
                <td class="uppercase">{{ ret.return_type }}</td>
                <td>
                  <div class="text-xs">
                    <div v-for="it in ret.items" :key="it.id">
                      {{ it.item_name }} - {{ it.quantity }} {{ it.unit }}
                    </div>
                  </div>
                </td>
                <td>
                  <button
                    class="btn btn-xs bg-success/20 text-success font-thin border-none hover:bg-success/30"
                    :disabled="branchAckLoadingId === ret.id"
                    @click="acknowledgeReturnComplete(ret.id)"
                  >
                    <span
                      v-if="branchAckLoadingId === ret.id"
                      class="loading loading-spinner loading-xs mr-1"
                    ></span>
                    {{
                      branchAckLoadingId === ret.id
                        ? 'Completing...'
                        : 'Complete'
                    }}
                  </button>
                </td>
              </tr>
              <tr
                v-if="
                  !(approvedLoading || rejectedLoading) &&
                  (returnsTab === 'approved'
                    ? approvedReturns.length === 0
                    : rejectedReturns.length === 0)
                "
              >
                <td colspan="4" class="text-center text-sm text-gray-500 py-6">
                  No approved returns.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-action">
          <button class="btn btn-sm" @click="showApprovedReturnsPanel = false">
            Close
          </button>
        </div>
      </div>
    </dialog>
  </div>

  <!-- Inventory Details Modal -->
  <BranchInventoryDetailsModal
    v-if="showInventoryDetails"
    :show="showInventoryDetails"
    :item="selectedBranchItem"
    :type="selectedBranchItemType"
    @close="showInventoryDetails = false"
  />
</template>

<style scoped>
  .custom-zebra tbody tr:nth-child(even) {
    background-color: var(--accentColor);
  }
  .custom-zebra tbody tr:nth-child(odd) {
    background-color: rgba(0, 0, 0, 0.03);
  }
</style>

<style>
  /* Raise TinyMCE dialogs above DaisyUI modal in branch acceptance */
  .tox,
  .tox-tinymce-aux,
  .tox-silver-sink,
  .tox-dialog-wrap,
  .tox-dialog {
    z-index: 99999 !important;
  }
  /* Avoid stacking-context issues from transform animations in DaisyUI modal */
  #distribution_acceptance_modal .modal-box {
    transform: none !important;
  }
</style>
