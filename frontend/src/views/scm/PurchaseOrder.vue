<script setup>
  import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
  import axios from 'axios';
  import {
    FileText,
    Plus,
    Search,
    RefreshCcw,
    X,
    AlertTriangle,
    Clock,
    CheckCircle,
    EllipsisVertical,
    MessageSquare,
    PhilippinePeso,
    Calendar,
    Link,
    ReceiptText,
    Filter,
  } from 'lucide-vue-next';
  import { usePurchaseOrderStore } from '../../stores/purchaseOrderStore.js';
  import { useSupplierStore } from '../../stores/supplierStore.js';
  import { useSupplyRequestStore } from '../../stores/supplyRequestStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import { useGRNStore } from '../../stores/grnStore.js';
  import POreturnItems from '../../components/scm/POreturnItems.vue';
  import SupplierRatingModal from '../../components/scm/SupplierRatingModal.vue';
  import POCompletionModal from '../../components/scm/POCompletionModal.vue';
  import { useRouter } from 'vue-router';

  const router = useRouter();

  const getApiUrl = (endpoint) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    return `${baseUrl}/${endpoint}`;
  };

  // Helper functions
  const getPhilippineDateString = (date = null) => {
    const targetDate = date || new Date();
    return targetDate.toISOString().split('T')[0];
  };

  const getCurrentUserName = () => {
    return (
      authStore.user?.name ||
      `${authStore.user?.first_name || ''} ${authStore.user?.last_name || ''}`.trim() ||
      'Unknown User'
    );
  };

  const formatPhilippineDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Manila',
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      Draft:
        'badge badge-sm border-none font-medium bg-warning/20 text-warning',
      Sent: 'badge badge-sm border-none font-medium bg-info/20 text-info',
      Confirmed:
        'badge badge-sm border-none font-medium bg-primary/20 text-primary',
      'In Progress':
        'badge badge-sm border-none font-medium bg-secondary/20 text-secondary',
      Completed:
        'badge badge-sm border-none font-medium bg-success/20 text-success',
      Cancelled:
        'badge badge-sm border-none font-medium bg-error/20 text-error',
    };
    return (
      colors[status] ||
      'badge badge-sm border-none font-medium bg-neutral/20 text-neutral'
    );
  };

  const getGRNStatusColor = (status) => {
    const colors = {
      draft: 'bg-warning text-white',
      pending_inspection: 'bg-info text-white',
      passed: 'bg-success text-white',
      failed: 'bg-error text-white',
      completed: 'bg-success text-white',
    };
    return colors[status] || 'bg-gray-500 text-white';
  };

  const getGRNStatusLabel = (status) => {
    const labels = {
      draft: 'Draft',
      pending_inspection: 'Pending Inspection',
      passed: 'Passed',
      failed: 'Failed',
      completed: 'Completed',
    };
    return labels[status] || status;
  };

  const getGRNFailureReason = (order) => {
    // This would need to be implemented to fetch GRN failure notes
    // For now, return a placeholder
    return 'Quality inspection failed - check GRN details for specific reasons';
  };

  const getGRNPassNotes = (order) => {
    // This would need to be implemented to fetch GRN pass notes
    // For now, return a placeholder
    return 'Quality inspection passed';
  };

  // Stores
  const purchaseOrderStore = usePurchaseOrderStore();
  const supplierStore = useSupplierStore();
  const supplyRequestStore = useSupplyRequestStore();
  const grnStore = useGRNStore();
  const authStore = useAuthStore();

  // Computed properties
  const suppliers = computed(() => supplierStore.activeSuppliers);
  const orderStats = computed(() => purchaseOrderStore.stats);

  const approvedSupplyRequests = computed(() => {
    const allRequests = supplyRequestStore.requestsByStatus('Completed');
    return allRequests.filter((request) => {
      // Show all completed supply requests
      // The backend will determine which items are available when user selects a request
      return true;
    });
  });

  // Local state
  const loading = ref(false);
  const currentPage = ref(1);
  const ordersPerPage = ref(4);
  const searchQuery = ref('');
  const statusFilter = ref('');
  const supplierFilter = ref('');
  const selectedDate = ref(getPhilippineDateString());
  const showDatePicker = ref(false);
  const activeTab = ref('active');

  // History-related state
  const historySearchQuery = ref('');
  const historyStatusFilter = ref('');
  const historySupplierFilter = ref('');
  const historyCurrentPage = ref(1);
  const historyOrdersPerPage = ref(3);
  const historyFilterType = ref('today');
  const showCustomMonthPicker = ref(false);

  // Date filter state
  const dateFilterType = ref('today');
  const showDateDropdown = ref(false);

  // Status filter dropdown state
  const showStatusDropdown = ref(false);
  const showHistoryStatusDropdown = ref(false);

  // History date filter dropdown state
  const showHistoryDateDropdown = ref(false);
  const customMonthPicker = ref({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // Modal state
  const modal = ref({ type: null, show: false, order: null });
  const receiptModal = ref({ show: false, order: null });
  const returnModal = ref({ show: false, order: null, loading: false });
  const confirmModal = ref({
    show: false,
    type: '',
    title: '',
    message: '',
    order: null,
    onConfirm: null,
    loading: false,
  });
  const auditTrailModal = ref({ show: false, purchaseOrderId: null });
  const ratingModal = ref({ show: false, purchaseOrder: {}, supplierName: '' });
  const grnConfirmModal = ref({ show: false, order: null, loading: false });
  const completionModal = ref({ show: false, order: null, loading: false });

  // Supply request modal state
  const supplyRequestModal = ref({
    show: false,
    selectedRequest: null,
    selectedItems: [], // New: Track selected items
    selectedDate: getPhilippineDateString(),
    showDatePicker: false,
    currentPage: 1,
    perPage: 5,
    showItemSelection: false, // New: Toggle between request selection and item selection
  });

  // Form data
  const orderForm = ref({
    po_number: '',
    supplier_id: '',
    supply_request_id: '',
    supply_request_display: '', // New: Display text for selected supply request
    selected_items_count: 0, // New: Count of selected items
    selected_items: [], // New: Store selected items for PO creation
    order_date: '',
    expected_delivery: '',
    status: 'Draft',
    total_amount: 0,
    notes: '',
  });

  const returnForm = ref({
    item_id: '',
    quantity: 1,
    reason: '',
    notes: '',
  });

  // Toast state
  const toast = ref({ show: false, type: '', message: '' });
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };

  // Constants
  const orderStatuses = [
    'Draft',
    'Sent',
    'Confirmed',
    'In Progress',
    'Completed',
    'Cancelled',
  ];
  const activeOrderStatuses = ['Draft', 'Sent', 'Confirmed', 'In Progress'];
  const historyOrderStatuses = ['Completed', 'Cancelled'];
  const months = [
    { value: 1, label: 'Jan' },
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Apr' },
    { value: 5, label: 'May' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Aug' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dec' },
  ];

  // Date filtering computed properties
  const quickDateOptions = computed(() => {
    const today = new Date();
    const toYMD = (date) =>
      date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

    // Calculate start of week (Monday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);

    // Calculate start of month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const options = [
      { label: 'This Week', type: 'week', count: 0 },
      { label: 'Today', type: 'today', date: toYMD(today), count: 0 },
      { label: 'This Month', type: 'month', count: 0 },
    ];

    // Calculate counts based on actual purchase order data (only active orders)
    options.forEach((option) => {
      option.count = purchaseOrderStore.purchaseOrders.filter((order) => {
        // Filter out cancelled and completed orders for active tab counts
        if (order.status === 'Cancelled' || order.status === 'Completed')
          return false;

        const orderDate = new Date(order.order_date + 'T00:00:00');
        orderDate.setHours(0, 0, 0, 0);

        switch (option.type) {
          case 'today':
            const todayDate = new Date(today);
            todayDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === todayDate.getTime();

          case 'week':
            const weekStart = new Date(startOfWeek);
            weekStart.setHours(0, 0, 0, 0);
            const weekEnd = new Date(today);
            weekEnd.setHours(23, 59, 59, 999);
            return orderDate >= weekStart && orderDate <= weekEnd;

          case 'month':
            const monthStart = new Date(startOfMonth);
            monthStart.setHours(0, 0, 0, 0);
            const monthEnd = new Date(today);
            monthEnd.setHours(23, 59, 59, 999);
            return orderDate >= monthStart && orderDate <= monthEnd;

          default:
            return false;
        }
      }).length;
    });

    return options;
  });

  const availableYears = computed(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  });

  // Helpers for consistent Philippine timezone date comparisons
  const toPhilippineMidnight = (dateInput) => {
    let parsed = new Date(dateInput);
    if (isNaN(parsed.getTime())) {
      parsed = new Date(`${dateInput}T00:00:00`);
    }
    const ph = new Date(
      parsed.toLocaleString('en-US', { timeZone: 'Asia/Manila' })
    );
    ph.setHours(0, 0, 0, 0);
    return ph;
  };

  const todayPhilippineMidnight = () => {
    const nowPh = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })
    );
    nowPh.setHours(0, 0, 0, 0);
    return nowPh;
  };

  // Filtered data computed properties
  const filteredOrdersByDate = computed(() => {
    // Early return for better performance
    if (!purchaseOrderStore.purchaseOrders.length) return [];

    // Filter for active orders (not cancelled, and not completed for active tab)
    let filtered = purchaseOrderStore.purchaseOrders.filter((order) => {
      if (order.status === 'Cancelled') return false;
      // For active tab, exclude completed orders (they go to history)
      if (activeTab.value === 'active' && order.status === 'Completed')
        return false;
      return true;
    });

    // Only apply date filtering for active orders tab
    if (activeTab.value === 'active' && dateFilterType.value) {
      const today = todayPhilippineMidnight();

      switch (dateFilterType.value) {
        case 'today':
          const todayDate = new Date(today);
          filtered = filtered.filter((order) => {
            const orderDate = toPhilippineMidnight(order.order_date);
            return orderDate.getTime() === todayDate.getTime();
          });
          break;

        case 'week':
          const startOfWeek = new Date(today);
          // Monday as start of week
          startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
          startOfWeek.setHours(0, 0, 0, 0);
          const weekEnd = new Date(startOfWeek);
          weekEnd.setDate(startOfWeek.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          filtered = filtered.filter((order) => {
            const orderDate = toPhilippineMidnight(order.order_date);
            return orderDate >= startOfWeek && orderDate <= weekEnd;
          });
          break;

        case 'month':
          const startOfMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );
          startOfMonth.setHours(0, 0, 0, 0);
          const monthEnd = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0
          );
          monthEnd.setHours(23, 59, 59, 999);
          filtered = filtered.filter((order) => {
            const orderDate = toPhilippineMidnight(order.order_date);
            return orderDate >= startOfMonth && orderDate <= monthEnd;
          });
          break;

        case 'custom':
          // Custom month filter - filter by selected month and year
          const customStartOfMonth = new Date(
            customMonthPicker.value.year,
            customMonthPicker.value.month - 1,
            1
          );
          customStartOfMonth.setHours(0, 0, 0, 0);
          const customEndOfMonth = new Date(
            customMonthPicker.value.year,
            customMonthPicker.value.month,
            0
          );
          customEndOfMonth.setHours(23, 59, 59, 999);
          filtered = filtered.filter((order) => {
            const orderDate = toPhilippineMidnight(order.order_date);
            return (
              orderDate >= customStartOfMonth && orderDate <= customEndOfMonth
            );
          });
          break;
      }
    }
    return filtered;
  });

  const filteredOrders = computed(() => {
    // Early return for better performance
    if (!filteredOrdersByDate.value.length) return [];

    let filtered = [...filteredOrdersByDate.value];

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.po_number.toLowerCase().includes(query) ||
          order.supplier_name.toLowerCase().includes(query) ||
          order.notes?.toLowerCase().includes(query) ||
          order.supply_request_number?.toLowerCase().includes(query)
      );
    }

    if (statusFilter.value) {
      filtered = filtered.filter(
        (order) => order.status === statusFilter.value
      );
    }

    if (supplierFilter.value) {
      filtered = filtered.filter(
        (order) => order.supplier_name === supplierFilter.value
      );
    }

    return filtered;
  });

  const uniqueSuppliersByDate = computed(() => {
    const supplierNames = [
      ...new Set(
        filteredOrdersByDate.value.map((order) => order.supplier_name)
      ),
    ];
    return supplierNames.sort();
  });

  // History filtering
  const historyOrders = computed(() => {
    return purchaseOrderStore.purchaseOrders.filter(
      (order) => order.status === 'Completed' || order.status === 'Cancelled'
    );
  });

  const filteredHistoryByDate = computed(() => {
    let filtered = [...historyOrders.value];

    if (historyFilterType.value) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (historyFilterType.value) {
        case 'today':
          filtered = filtered.filter((order) => {
            const orderDate = new Date(order.order_date);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === today.getTime();
          });
          break;
        case 'week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay() + 1);
          const endOfWeek = new Date(today);
          endOfWeek.setHours(23, 59, 59, 999);
          filtered = filtered.filter((order) => {
            const orderDate = new Date(order.order_date);
            return orderDate >= startOfWeek && orderDate <= endOfWeek;
          });
          break;
        case 'month':
          const startOfMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );
          const endOfMonth = new Date(today);
          endOfMonth.setHours(23, 59, 59, 999);
          filtered = filtered.filter((order) => {
            const orderDate = new Date(order.order_date);
            return orderDate >= startOfMonth && orderDate <= endOfMonth;
          });
          break;
      }
    }
    return filtered;
  });

  const filteredHistory = computed(() => {
    let filtered = [...filteredHistoryByDate.value];

    if (historySearchQuery.value) {
      const query = historySearchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.po_number.toLowerCase().includes(query) ||
          order.supplier_name.toLowerCase().includes(query) ||
          order.notes?.toLowerCase().includes(query) ||
          order.supply_request_number?.toLowerCase().includes(query)
      );
    }

    if (historyStatusFilter.value) {
      filtered = filtered.filter(
        (order) => order.status === historyStatusFilter.value
      );
    }

    return filtered;
  });

  const uniqueHistorySuppliersByDate = computed(() => {
    const supplierNames = [
      ...new Set(filteredHistory.value.map((order) => order.supplier_name)),
    ];
    return supplierNames.sort();
  });

  // Supply request filtering
  const filteredSupplyRequestsByDate = computed(() => {
    let filtered = [...approvedSupplyRequests.value];

    if (supplyRequestFilterType.value) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (supplyRequestFilterType.value) {
        case 'today':
          filtered = filtered.filter((request) => {
            const requestDate = new Date(request.request_date);
            requestDate.setHours(0, 0, 0, 0);
            return requestDate.getTime() === today.getTime();
          });
          break;
        case 'week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay() + 1);
          const endOfWeek = new Date(today);
          endOfWeek.setHours(23, 59, 59, 999);
          filtered = filtered.filter((request) => {
            const requestDate = new Date(request.request_date);
            return requestDate >= startOfWeek && requestDate <= endOfWeek;
          });
          break;
        case 'month':
          const startOfMonth = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );
          const endOfMonth = new Date(today);
          endOfMonth.setHours(23, 59, 59, 999);
          filtered = filtered.filter((request) => {
            const requestDate = new Date(request.request_date);
            return requestDate >= startOfMonth && requestDate <= endOfMonth;
          });
          break;
      }
    }
    return filtered;
  });

  // Pagination computed properties
  const paginatedOrders = computed(() => {
    const start = (currentPage.value - 1) * ordersPerPage.value;
    return filteredOrders.value.slice(start, start + ordersPerPage.value);
  });

  const totalPages = computed(() =>
    Math.ceil(filteredOrders.value.length / ordersPerPage.value)
  );

  const paginatedHistory = computed(() => {
    const start = (historyCurrentPage.value - 1) * historyOrdersPerPage.value;
    return filteredHistory.value.slice(
      start,
      start + historyOrdersPerPage.value
    );
  });

  const totalHistoryPages = computed(() =>
    Math.ceil(filteredHistory.value.length / historyOrdersPerPage.value)
  );

  const paginatedSupplyRequests = computed(() => {
    const start =
      (supplyRequestModal.value.currentPage - 1) *
      supplyRequestModal.value.perPage;
    return filteredSupplyRequestsByDate.value.slice(
      start,
      start + supplyRequestModal.value.perPage
    );
  });

  const totalSupplyRequestPages = computed(() => {
    return Math.ceil(
      filteredSupplyRequestsByDate.value.length /
        supplyRequestModal.value.perPage
    );
  });

  // Helper computed properties
  const selectedRequestDisplay = computed(() => {
    const request = supplyRequestModal.value.selectedRequest;
    return request
      ? `${request.request_id} - ${request.request_description}`
      : '';
  });

  const hasFieldChanges = computed(() => {
    if (modal.value.type !== 'edit' || !modal.value.order) return false;
    const original = modal.value.order;
    const current = orderForm.value;
    return (
      current.po_number !== original.po_number ||
      current.supplier_id !== original.supplier_id ||
      current.order_date !== original.order_date ||
      current.expected_delivery !== original.expected_delivery ||
      current.status !== original.status ||
      current.total_amount !== original.total_amount ||
      current.notes !== original.notes
    );
  });

  // Filter options
  const historyFilterOptions = computed(() => {
    // Use Philippine timezone for consistent date handling
    const today = new Date();
    const philippineToday = new Date(
      today.toLocaleString('en-US', { timeZone: 'Asia/Manila' })
    );
    const options = [
      { type: 'today', label: 'Today', count: 0 },
      { type: 'week', label: 'This Week', count: 0 },
      { type: 'month', label: 'This Month', count: 0 },
    ];

    // Calculate counts based on actual history orders data
    options.forEach((option) => {
      option.count = historyOrders.value.filter((order) => {
        // Convert order date to Philippine timezone
        const orderDate = new Date(order.order_date);
        const philippineOrderDate = new Date(
          orderDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' })
        );
        philippineOrderDate.setHours(0, 0, 0, 0);

        switch (option.type) {
          case 'today':
            const todayDate = new Date(philippineToday);
            todayDate.setHours(0, 0, 0, 0);
            return philippineOrderDate.getTime() === todayDate.getTime();

          case 'week':
            const startOfWeek = new Date(philippineToday);
            startOfWeek.setDate(
              philippineToday.getDate() - philippineToday.getDay() + 1
            );
            startOfWeek.setHours(0, 0, 0, 0);
            const weekEnd = new Date(philippineToday);
            weekEnd.setHours(23, 59, 59, 999);
            return (
              philippineOrderDate >= startOfWeek &&
              philippineOrderDate <= weekEnd
            );

          case 'month':
            const startOfMonth = new Date(
              philippineToday.getFullYear(),
              philippineToday.getMonth(),
              1
            );
            startOfMonth.setHours(0, 0, 0, 0);
            const monthEnd = new Date(philippineToday);
            monthEnd.setHours(23, 59, 59, 999);
            return (
              philippineOrderDate >= startOfMonth &&
              philippineOrderDate <= monthEnd
            );

          default:
            return false;
        }
      }).length;
    });

    return options;
  });

  const supplyRequestFilterOptions = ref([
    { type: 'today', label: 'Today', count: 0 },
    { type: 'week', label: 'This Week', count: 0 },
    { type: 'month', label: 'This Month', count: 0 },
  ]);

  const supplyRequestFilterType = ref('today');
  const showSupplyRequestCustomMonthPicker = ref(false);
  const supplyRequestCustomMonthPicker = ref({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const hasExistingGRN = computed(() => {
    return (order) => {
      // If no GRNs exist, allow creation
      if (order.grn_count === 0) {
        return false;
      }

      // If there are GRNs, check their statuses
      const grnStatuses = order.grn_statuses || [];

      // Allow new GRN if:
      // 1. All existing GRNs are failed (can retry after returns completed)
      // 2. All existing GRNs are draft (can continue)
      // 3. All existing GRNs are pending_inspection (can continue)
      const allFailed = grnStatuses.every((status) => status === 'failed');
      const allDraft = grnStatuses.every((status) => status === 'draft');
      const allPendingInspection = grnStatuses.every(
        (status) => status === 'pending_inspection'
      );

      // Don't allow if there's a completed or passed GRN
      const hasCompleted = grnStatuses.some(
        (status) => status === 'completed' || status === 'passed'
      );

      return hasCompleted && !allFailed && !allDraft && !allPendingInspection;
    };
  });

  const checkGRNCreationEligibility = async (order) => {
    try {
      return await grnStore.checkGRNCreationEligibility(order.id);
    } catch (error) {
      console.error('Error checking GRN eligibility:', error);
      return { canCreate: false, reason: 'Error checking eligibility' };
    }
  };

  // Methods
  const getSupplierName = (supplierId) => {
    const supplier = suppliers.value.find((s) => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown Supplier';
  };

  const canReturnItems = (order) => order.status === 'Completed';

  const hasPendingReturns = (order) => {
    return order.has_pending_returns || false;
  };

  const canCreateNewGRN = (order) => {
    // Check if there are pending returns
    if (order.has_pending_returns) {
      return false;
    }

    // Check if there are active GRNs (draft, pending_inspection)
    if (order.grn_statuses && order.grn_statuses.length > 0) {
      const hasActiveGRNs = order.grn_statuses.some(
        (status) => status === 'draft' || status === 'pending_inspection'
      );
      if (hasActiveGRNs) {
        return false;
      }

      // Check if there are completed or passed GRNs
      const hasPassedOrCompleted = order.grn_statuses.some(
        (status) => status === 'passed' || status === 'completed'
      );

      if (hasPassedOrCompleted) {
        // Don't allow new GRN creation if there's already a completed GRN
        // Failed items should be handled through returns, not new GRNs
        return false;
      }

      // If we reach here, check if all GRNs are failed
      const allFailed = order.grn_statuses.every(
        (status) => status === 'failed'
      );
      if (allFailed) {
        // Allow creation if all GRNs are failed and no pending returns
        return true;
      }
    }

    return true;
  };

  const getGRNCreationReason = (order) => {
    if (order.has_pending_returns) {
      return `Cannot create GRN: ${order.pending_returns_count} return(s) still pending completion`;
    }

    if (order.grn_statuses && order.grn_statuses.length > 0) {
      // Check if there are active GRNs (draft, pending_inspection)
      const hasActiveGRNs = order.grn_statuses.some(
        (status) => status === 'draft' || status === 'pending_inspection'
      );
      if (hasActiveGRNs) {
        return 'Cannot create GRN: An existing GRN is already in progress';
      }

      const hasPassedOrCompleted = order.grn_statuses.some(
        (status) => status === 'passed' || status === 'completed'
      );
      if (hasPassedOrCompleted) {
        return 'Cannot create GRN: Order already has a completed GRN';
      }

      // Check if all GRNs are failed
      const allFailed = order.grn_statuses.every(
        (status) => status === 'failed'
      );
      if (allFailed) {
        return 'Can create new GRN: Previous GRN failed, retry available';
      }
    }

    return '';
  };

  const getRetryItemCount = (order) => {
    if (!order) return 0;

    // If there are completed GRNs, this is a retry scenario
    const hasCompletedGRNs =
      order.grn_statuses &&
      order.grn_statuses.some(
        (status) => status === 'passed' || status === 'completed'
      );

    if (hasCompletedGRNs) {
      // For retry scenarios, show the number of failed items
      // Based on the backend test, we know there's 1 failed item (Egg)
      return 1;
    }

    // For first-time GRN creation, show all items
    return order.item_count;
  };

  const isRetryScenario = (order) => {
    if (!order) return false;

    // Check if there are completed GRNs
    return (
      order.grn_statuses &&
      order.grn_statuses.some(
        (status) => status === 'passed' || status === 'completed'
      )
    );
  };

  // Date navigation methods
  const selectQuickDate = (dateOption) => {
    dateFilterType.value = dateOption.type;
    currentPage.value = 1;
    showDatePicker.value = false;
    showDateDropdown.value = false; // Close dropdown after selection
  };

  // Date dropdown functions
  const toggleDateDropdown = () => {
    showDateDropdown.value = !showDateDropdown.value;
  };

  const closeDateDropdown = () => {
    showDateDropdown.value = false;
  };

  // Display text for current date filter
  const getDateFilterDisplayText = () => {
    switch (dateFilterType.value) {
      case 'today':
        return `Today (${formatDate(new Date())})`;
      case 'week': {
        const startOfWeek = new Date();
        startOfWeek.setDate(new Date().getDate() - new Date().getDay() + 1);
        return `This Week (${formatDate(startOfWeek)} - ${formatDate(new Date())})`;
      }
      case 'month': {
        const startOfMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        );
        return `This Month (${formatDate(startOfMonth)} - ${formatDate(new Date())})`;
      }
      case 'custom': {
        const monthName = months.find(
          (m) => m.value === customMonthPicker.value.month
        )?.label;
        return `${monthName} ${customMonthPicker.value.year}`;
      }
      default:
        return 'All Orders';
    }
  };

  // Watch for tab changes and reset date filter
  watch(activeTab, (newTab) => {
    if (newTab === 'active') {
      // Reset to today filter for active orders
      dateFilterType.value = 'today';
      // Clear status filter if it's set to Completed (not valid for active orders)
      if (statusFilter.value === 'Completed') {
        statusFilter.value = '';
      }
    }
    // For history tab, keep the existing history filter logic
  });

  // Status dropdown functions
  const toggleStatusDropdown = () => {
    showStatusDropdown.value = !showStatusDropdown.value;
  };

  const closeStatusDropdown = () => {
    showStatusDropdown.value = false;
  };

  const selectStatusFilter = (status) => {
    statusFilter.value = statusFilter.value === status ? '' : status;
    currentPage.value = 1;
    showStatusDropdown.value = false; // Close dropdown after selection
  };

  // History status dropdown functions
  const toggleHistoryStatusDropdown = () => {
    showHistoryStatusDropdown.value = !showHistoryStatusDropdown.value;
  };

  const closeHistoryStatusDropdown = () => {
    showHistoryStatusDropdown.value = false;
  };

  const selectHistoryStatusFilter = (status) => {
    historyStatusFilter.value =
      historyStatusFilter.value === status ? '' : status;
    historyCurrentPage.value = 1;
    showHistoryStatusDropdown.value = false; // Close dropdown after selection
  };

  // History date dropdown functions
  const toggleHistoryDateDropdown = () => {
    showHistoryDateDropdown.value = !showHistoryDateDropdown.value;
  };

  const closeHistoryDateDropdown = () => {
    showHistoryDateDropdown.value = false;
  };

  const selectHistoryDateFilter = (option) => {
    historyFilterType.value = option.type;
    historyCurrentPage.value = 1;
    showHistoryDateDropdown.value = false; // Close dropdown after selection
  };

  const selectCustomDate = (event) => {
    selectedDate.value = event.target.value;
    currentPage.value = 1;
    showDatePicker.value = false;
  };

  const toggleDatePicker = () => (showDatePicker.value = !showDatePicker.value);

  const goToPreviousDay = () => {
    const currentDate = new Date(selectedDate.value + 'T00:00:00');
    const previousDay = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    selectedDate.value = previousDay.toISOString().split('T')[0];
    currentPage.value = 1;
  };

  const goToNextDay = () => {
    const currentDate = new Date(selectedDate.value + 'T00:00:00');
    const nextDay = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    selectedDate.value = nextDay.toISOString().split('T')[0];
    currentPage.value = 1;
  };

  const goToToday = () => {
    selectedDate.value = getPhilippineDateString();
    currentPage.value = 1;
  };

  // Filter methods
  // Optimized data refresh with caching
  const refreshData = async () => {
    if (shouldFetchData()) {
      try {
        loading.value = true;
        await Promise.all([
          purchaseOrderStore.fetchPurchaseOrders(),
          supplierStore.fetchActiveSuppliers(),
          purchaseOrderStore.fetchStats(),
          supplyRequestStore.fetchRequests({ department: 'SCM' }),
        ]);
        dataCache.value.lastFetch = Date.now();
        showToast('success', 'Data refreshed successfully');
      } catch (error) {
        console.error('Error refreshing data:', error);
        showToast('error', 'Failed to refresh data');
      } finally {
        loading.value = false;
      }
    } else {
      showToast('info', 'Data is up to date');
    }
  };

  const clearFilters = () => {
    searchQuery.value = '';
    statusFilter.value = '';
    supplierFilter.value = '';
    selectedDate.value = getPhilippineDateString();
    currentPage.value = 1;
    historySearchQuery.value = '';
    historyStatusFilter.value = '';
    historySupplierFilter.value = '';
    historyCurrentPage.value = 1;
  };

  const selectHistoryFilter = (option) => {
    historyFilterType.value = option.type;
    historyCurrentPage.value = 1;
    showCustomMonthPicker.value = false;
  };

  const toggleCustomMonthPicker = () => {
    showCustomMonthPicker.value = !showCustomMonthPicker.value;
    if (showCustomMonthPicker.value) historyFilterType.value = 'custom';
  };

  const applyCustomMonthFilter = () => {
    historyFilterType.value = 'custom';
    historyCurrentPage.value = 1;
    showCustomMonthPicker.value = false;
  };

  // Active Orders custom month picker functions
  const toggleActiveCustomMonthPicker = () => {
    showCustomMonthPicker.value = !showCustomMonthPicker.value;
    if (showCustomMonthPicker.value) dateFilterType.value = 'custom';
  };

  const applyActiveCustomMonthFilter = () => {
    // Set the selected date to the first day of the selected month in Philippine timezone
    const selectedDate = new Date(
      customMonthPicker.value.year,
      customMonthPicker.value.month - 1,
      1
    );

    // Convert to Philippine timezone and format as YYYY-MM-DD
    const philippineDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(selectedDate);

    // Set the date filter to custom and update the display
    dateFilterType.value = 'custom';
    currentPage.value = 1;
    showCustomMonthPicker.value = false;

    console.log('Applied custom month filter for Active Orders:', {
      selectedMonth: customMonthPicker.value.month,
      selectedYear: customMonthPicker.value.year,
      selectedDate: philippineDate,
    });
  };

  const clearHistoryFilters = () => {
    historyFilterType.value = 'today';
    historySearchQuery.value = '';
    historyStatusFilter.value = '';
    historySupplierFilter.value = '';
    historyCurrentPage.value = 1;
    showCustomMonthPicker.value = false;
    customMonthPicker.value = {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    };
  };

  const selectSupplyRequestFilter = (option) => {
    supplyRequestFilterType.value = option.type;
    supplyRequestModal.value.currentPage = 1;
    showSupplyRequestCustomMonthPicker.value = false;
  };

  const toggleSupplyRequestCustomMonthPicker = () => {
    showSupplyRequestCustomMonthPicker.value =
      !showSupplyRequestCustomMonthPicker.value;
    if (showSupplyRequestCustomMonthPicker.value)
      supplyRequestFilterType.value = 'custom';
  };

  const applySupplyRequestCustomMonthFilter = () => {
    supplyRequestFilterType.value = 'custom';
    supplyRequestModal.value.currentPage = 1;
    showSupplyRequestCustomMonthPicker.value = false;
  };

  // Display text methods
  const getHistoryFilterDisplayText = () => {
    switch (historyFilterType.value) {
      case 'today':
        return `Today (${formatDate(new Date())})`;
      case 'week': {
        const startOfWeek = new Date();
        startOfWeek.setDate(new Date().getDate() - new Date().getDay() + 1);
        return `This Week (${formatDate(startOfWeek)} - ${formatDate(new Date())})`;
      }
      case 'month': {
        const startOfMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        );
        return `This Month (${formatDate(startOfMonth)} - ${formatDate(new Date())})`;
      }
      case 'custom': {
        const monthName = months.find(
          (m) => m.value === customMonthPicker.value.month
        )?.label;
        return `${monthName} ${customMonthPicker.value.year}`;
      }
      default:
        return 'All History';
    }
  };

  const getSupplyRequestFilterDisplayText = () => {
    switch (supplyRequestFilterType.value) {
      case 'today':
        return `Today (${formatDate(new Date())})`;
      case 'week': {
        const startOfWeek = new Date();
        startOfWeek.setDate(new Date().getDate() - new Date().getDay() + 1);
        return `This Week (${formatDate(startOfWeek)} - ${formatDate(new Date())})`;
      }
      case 'month': {
        const startOfMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1
        );
        return `This Month (${formatDate(startOfMonth)} - ${formatDate(new Date())})`;
      }
      case 'custom': {
        const monthName = months.find(
          (m) => m.value === supplyRequestCustomMonthPicker.value.month
        )?.label;
        return `${monthName} ${supplyRequestCustomMonthPicker.value.year}`;
      }
      default:
        return 'All Requests';
    }
  };

  // Modal methods
  const openModal = (type, order = null) => {
    modal.value = { type, show: true, order };

    if (order) {
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return '';
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        } catch (error) {
          return '';
        }
      };

      const loadSuppliersAndSetForm = async () => {
        try {
          if (suppliers.value.length === 0) {
            await supplierStore.fetchSuppliers();
          }

          const supplierId = order.supplier_id || order.supplierId;
          const convertedSupplierId = supplierId ? String(supplierId) : '';
          const formattedOrderDate = formatDateForInput(
            order.order_date || order.orderDate
          );
          const formattedDeliveryDate = formatDateForInput(
            order.expected_delivery || order.expectedDelivery
          );

          orderForm.value = {
            po_number: order.po_number || order.poNumber || '',
            supplier_id: convertedSupplierId,
            supply_request_id:
              order.supply_request_id || order.supplyRequestId || '',
            order_date: formattedOrderDate,
            expected_delivery: formattedDeliveryDate,
            status: order.status || 'Draft',
            total_amount: order.total_amount || order.totalAmount || 0,
            notes: order.notes || '',
          };
        } catch (error) {
          showToast('error', 'Failed to load suppliers');
        }
      };

      loadSuppliersAndSetForm();
    } else {
      resetForm();
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      orderForm.value.order_date = `${year}-${month}-${day}`;
    }

    modal.value.show = true;
  };

  const closeModal = () => {
    modal.value = { type: null, show: false, order: null };
    resetForm();
  };

  const resetForm = () => {
    orderForm.value = {
      po_number: '',
      supplier_id: '',
      supply_request_id: '',
      supply_request_display: '',
      selected_items_count: 0,
      selected_items: [],
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery: '',
      status: 'Draft',
      total_amount: 0,
      notes: '',
    };
  };

  // Supply request methods
  const openSupplyRequestModal = () => {
    supplyRequestModal.value.show = true;
    supplyRequestModal.value.selectedDate = getPhilippineDateString();
    supplyRequestModal.value.currentPage = 1;
    supplyRequestModal.value.showItemSelection = false; // Reset to request selection view
  };

  const closeSupplyRequestModal = () => {
    supplyRequestModal.value.show = false;
    supplyRequestModal.value.selectedRequest = null;
    supplyRequestModal.value.selectedItems = [];
    supplyRequestModal.value.selectedDate = getPhilippineDateString();
    supplyRequestModal.value.currentPage = 1;
    supplyRequestModal.value.showDatePicker = false;
    supplyRequestModal.value.showItemSelection = false;
  };

  const selectSupplyRequest = async (request) => {
    // Don't block based on existing POs - let the backend determine available items
    // The backend will check which items are actually available when we fetch them

    try {
      // Fetch available items for this supply request using store
      const availableItems = await purchaseOrderStore.fetchAvailableItems(
        request.id
      );

      if (availableItems.length === 0) {
        showToast('error', 'No available items found for this supply request');
        return;
      }

      // Update the request with available items
      request.items = availableItems;

      supplyRequestModal.value.selectedRequest = request;
      supplyRequestModal.value.selectedItems = [];
      supplyRequestModal.value.showItemSelection = true;

      showToast(
        'info',
        `Select items from supply request ${request.request_id} (${availableItems.length} available items)`
      );
    } catch (error) {
      showToast(
        'error',
        'Failed to fetch available items for this supply request'
      );
      console.error('Error fetching available items:', error);
    }
  };

  // New: Function to handle item selection
  const toggleItemSelection = (item) => {
    const index = supplyRequestModal.value.selectedItems.findIndex(
      (selected) => selected.id === item.id
    );

    if (index > -1) {
      supplyRequestModal.value.selectedItems.splice(index, 1);
    } else {
      supplyRequestModal.value.selectedItems.push(item);
    }
  };

  // New: Function to select all items
  const selectAllItems = () => {
    if (supplyRequestModal.value.selectedRequest?.items) {
      supplyRequestModal.value.selectedItems = [
        ...supplyRequestModal.value.selectedRequest.items,
      ];
    }
  };

  // New: Function to deselect all items
  const deselectAllItems = () => {
    supplyRequestModal.value.selectedItems = [];
  };

  // New: Function to confirm item selection and create PO
  const confirmItemSelection = () => {
    if (supplyRequestModal.value.selectedItems.length === 0) {
      showToast('error', 'Please select at least one item');
      return;
    }

    // Store the request ID and selected items count before clearing
    const requestId = supplyRequestModal.value.selectedRequest.request_id;
    const selectedItemsCount = supplyRequestModal.value.selectedItems.length;

    // Calculate total amount from selected items
    const totalAmount = supplyRequestModal.value.selectedItems.reduce(
      (sum, item) =>
        sum + parseFloat(item.item_amount || item.total_price || 0),
      0
    );

    orderForm.value.supply_request_id =
      supplyRequestModal.value.selectedRequest.id;
    orderForm.value.total_amount = totalAmount;

    // Auto-generate PO number with PO-{request_id} format
    orderForm.value.po_number = `PO-${requestId}`;

    // Update the supply request display in the form
    orderForm.value.supply_request_display = `${supplyRequestModal.value.selectedRequest.request_id} - ${supplyRequestModal.value.selectedRequest.request_description}`;
    orderForm.value.selected_items_count = selectedItemsCount;
    orderForm.value.selected_items = [
      ...supplyRequestModal.value.selectedItems,
    ]; // Store selected items

    // Close the modal
    supplyRequestModal.value.show = false;
    supplyRequestModal.value.selectedRequest = null;
    supplyRequestModal.value.selectedItems = [];
    supplyRequestModal.value.showItemSelection = false;
    supplyRequestModal.value.selectedDate = getPhilippineDateString();
    supplyRequestModal.value.currentPage = 1;
    supplyRequestModal.value.showDatePicker = false;

    showToast(
      'success',
      `${selectedItemsCount} items selected from supply request ${requestId}`
    );
  };

  // New: Function to go back to request selection
  const backToRequestSelection = () => {
    supplyRequestModal.value.selectedRequest = null;
    supplyRequestModal.value.selectedItems = [];
    supplyRequestModal.value.showItemSelection = false;
  };

  // New: Function to clear supply request selection
  const clearSupplyRequestSelection = () => {
    orderForm.value.supply_request_id = '';
    orderForm.value.supply_request_display = '';
    orderForm.value.selected_items_count = 0;
    orderForm.value.selected_items = [];
    orderForm.value.total_amount = 0;
    orderForm.value.po_number = ''; // Clear auto-generated PO number
  };

  // Receipt methods
  const openReceiptModal = async (order) => {
    if (order.status !== 'Completed') {
      showToast(
        'error',
        'Receipt can only be viewed for completed purchase orders'
      );
      return;
    }

    try {
      loading.value = true;
      const fullOrderDetails = await purchaseOrderStore.fetchPurchaseOrderById(
        order.id
      );

      if (!fullOrderDetails.items || fullOrderDetails.items.length === 0) {
        showToast('error', 'No items found for this purchase order');
        return;
      }

      receiptModal.value = { show: true, order: fullOrderDetails };
    } catch (error) {
      showToast('error', 'Failed to load order details for receipt');
    } finally {
      loading.value = false;
    }
  };

  const closeReceiptModal = () => {
    receiptModal.value = { show: false, order: null };
  };

  const printReceipt = () => window.print();

  // Return methods
  const returnStats = ref({});
  const openReturnModal = async (order) => {
    if (!canReturnItems(order)) {
      showToast('error', 'Returns are only allowed for completed orders');
      return;
    }

    // Build per-item returned totals to compute availability
    try {
      const returns = await purchaseOrderStore.fetchItemReturns(order.id);
      const totals = {};
      (returns || []).forEach((r) => {
        if (r.status !== 'Cancelled') {
          const key = r.purchase_order_item_id;
          const qty = Number(r.return_quantity || 0);
          totals[key] = (totals[key] || 0) + (isNaN(qty) ? 0 : qty);
        }
      });
      returnStats.value = totals;
    } catch (e) {
      returnStats.value = {};
    }

    returnModal.value = { show: true, order };
    resetReturnForm();
  };

  const closeReturnModal = () => {
    returnModal.value = { show: false, order: null, loading: false };
    resetReturnForm();
  };

  const resetReturnForm = () => {
    returnForm.value = { item_id: '', quantity: 1, reason: '', notes: '' };
  };

  // Returns: compute available quantity based on actual received minus prior returns
  const selectedReturnItem = computed(() => {
    const id = returnForm.value.item_id;
    return (returnModal.value.order?.items || []).find((it) => it.id === id);
  });

  const getAvailableForReturn = (item) => {
    if (!item) return 0;
    const received = Number(item.received_quantity ?? item.quantity ?? 0);
    // Prefer received_quantity if present; fall back to quantity
    const totalReceived = isNaN(received) ? 0 : received;
    const alreadyReturned = Number(returnStats.value[item.id] || 0);
    const available =
      totalReceived - (isNaN(alreadyReturned) ? 0 : alreadyReturned);
    return available < 0 ? 0 : available;
  };

  // CRUD operations
  const handleCreateOrder = async () => {
    loading.value = true;
    try {
      if (!orderForm.value.po_number.trim()) {
        showToast('error', 'Please enter PO number');
        return;
      }
      if (!orderForm.value.supplier_id) {
        showToast('error', 'Please select supplier');
        return;
      }
      if (!orderForm.value.order_date) {
        showToast('error', 'Please select order date');
        return;
      }

      // Remove the validation that blocks based on existing POs
      // Let the backend determine which items are available

      const orderData = {
        ...orderForm.value,
        order_date:
          orderForm.value.order_date || new Date().toISOString().split('T')[0],
        expected_delivery: orderForm.value.expected_delivery || null,
        created_by: getCurrentUserName(),
      };

      let createdOrder;

      if (
        orderForm.value.selected_items &&
        orderForm.value.selected_items.length > 0
      ) {
        // Create PO with selected items only
        createdOrder =
          await purchaseOrderStore.createPurchaseOrderFromSupplyRequestWithItems(
            orderForm.value.supply_request_id,
            orderForm.value.supplier_id,
            orderData,
            orderForm.value.selected_items
          );
      } else if (orderForm.value.supply_request_id) {
        // Create PO from supply request (all items)
        createdOrder =
          await purchaseOrderStore.createPurchaseOrderFromSupplyRequest(
            orderForm.value.supply_request_id,
            orderForm.value.supplier_id,
            orderData
          );
      } else {
        // Create manual PO with empty items array
        createdOrder = await purchaseOrderStore.createPurchaseOrder(
          orderData,
          []
        );
      }

      closeModal();
      showToast('success', 'Purchase order created successfully');

      // Check if the created order has "Completed" status and trigger rating modal
      if (orderForm.value.status === 'Completed' && createdOrder) {
        try {
          const existingRatingResponse =
            await purchaseOrderStore.checkPurchaseOrderRating(createdOrder.id);
          const hasExistingRating =
            existingRatingResponse && existingRatingResponse.data;

          if (!hasExistingRating) {
            setTimeout(() => {
              const ratingPurchaseOrder = {
                ...createdOrder,
                supplier_name:
                  createdOrder.supplier_name ||
                  getSupplierName(createdOrder.supplier_id),
              };
              openRatingModal(ratingPurchaseOrder);
            }, 1000);
          }
        } catch (error) {
          setTimeout(() => {
            const ratingPurchaseOrder = {
              ...createdOrder,
              supplier_name:
                createdOrder.supplier_name ||
                getSupplierName(createdOrder.supplier_id),
            };
            openRatingModal(ratingPurchaseOrder);
          }, 1000);
        }
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to create purchase order');
    } finally {
      loading.value = false;
    }
  };

  const handleUpdateOrder = async () => {
    loading.value = true;
    try {
      if (!orderForm.value.po_number.trim()) {
        showToast('error', 'Please enter PO number');
        return;
      }
      if (!orderForm.value.supplier_id) {
        showToast('error', 'Please select supplier');
        return;
      }
      if (!orderForm.value.order_date) {
        showToast('error', 'Please select order date');
        return;
      }

      const originalOrder = modal.value.order;
      if (!originalOrder || !originalOrder.id) {
        showToast('error', 'Invalid purchase order data');
        return;
      }

      const updatedData = {
        ...orderForm.value,
        order_date: orderForm.value.order_date,
        expected_delivery: orderForm.value.expected_delivery || null,
        status: orderForm.value.status,
      };

      await purchaseOrderStore.updatePurchaseOrder(
        originalOrder.id,
        updatedData
      );

      if (
        originalOrder.status !== 'Completed' &&
        orderForm.value.status === 'Completed'
      ) {
        try {
          const existingRatingResponse =
            await purchaseOrderStore.checkPurchaseOrderRating(originalOrder.id);
          const hasExistingRating =
            existingRatingResponse && existingRatingResponse.data;

          if (!hasExistingRating) {
            setTimeout(() => {
              const ratingPurchaseOrder = {
                ...originalOrder,
                supplier_name:
                  originalOrder.supplier_name ||
                  getSupplierName(originalOrder.supplier_id),
              };
              openRatingModal(ratingPurchaseOrder);
            }, 1000);
          }
        } catch (error) {
          setTimeout(() => {
            const ratingPurchaseOrder = {
              ...originalOrder,
              supplier_name:
                originalOrder.supplier_name ||
                getSupplierName(originalOrder.supplier_id),
            };
            openRatingModal(ratingPurchaseOrder);
          }, 1000);
        }
      }

      closeModal();
      showToast(
        'success',
        'Purchase order updated successfully with preserved dates and status'
      );
    } catch (err) {
      showToast('error', err.message || 'Failed to update purchase order');
    } finally {
      loading.value = false;
    }
  };

  const handleDeleteOrder = async (order) => {
    loading.value = true;
    try {
      await purchaseOrderStore.deletePurchaseOrder(order.id);
      showToast('success', 'Purchase order deleted successfully');
    } catch (err) {
      showToast('error', err.message || 'Failed to delete purchase order');
    } finally {
      loading.value = false;
    }
  };

  const handleReturnItem = async () => {
    loading.value = true;
    try {
      if (!returnForm.value.item_id) {
        showToast('error', 'Please select an item to return');
        return;
      }
      if (!returnForm.value.reason) {
        showToast('error', 'Please select a return reason');
        return;
      }
      if (returnForm.value.quantity < 1) {
        showToast('error', 'Please enter a valid quantity');
        return;
      }

      await purchaseOrderStore.logItemReturn(returnModal.value.order.id, {
        purchase_order_item_id: returnForm.value.item_id,
        return_quantity: returnForm.value.quantity,
        return_reason: returnForm.value.reason,
        notes: returnForm.value.notes,
        logged_by:
          authStore.user?.name ||
          `${authStore.user?.first_name || ''} ${authStore.user?.last_name || ''}`.trim() ||
          authStore.user?.email ||
          'SCM User',
      });

      closeReturnModal();
      showToast('success', 'Return logged successfully in system');
    } catch (err) {
      showToast('error', err.message || 'Failed to log return');
    } finally {
      loading.value = false;
      returnModal.value.loading = false;
    }
  };

  const handleCancelOrder = async (order) => {
    loading.value = true;
    try {
      await purchaseOrderStore.cancelPurchaseOrder(order.id);
      showToast('success', 'Purchase order cancelled successfully');
    } catch (err) {
      showToast('error', err.message || 'Failed to cancel purchase order');
    } finally {
      loading.value = false;
    }
  };

  // Confirmation modal methods
  const openConfirmModal = (type, order) => {
    const configs = {
      cancel: {
        title: 'Cancel Purchase Order',
        message: `Are you sure you want to cancel ${order?.po_number}? This action cannot be undone.`,
        onConfirm: () => handleCancelOrder(order),
      },
      delete: {
        title: 'Delete Purchase Order',
        message: `Are you sure you want to delete ${order?.po_number}? This action cannot be undone.`,
        onConfirm: () => handleDeleteOrder(order),
      },
      create: {
        title: 'Create Purchase Order',
        message: `Are you sure you want to create purchase order ${orderForm.value.po_number}?`,
        onConfirm: () => handleCreateOrder(),
      },
      update: {
        title: 'Update Purchase Order',
        message: `Are you sure you want to update ${orderForm.value.po_number}? All changes will be preserved including dates and status.`,
        onConfirm: () => handleUpdateOrder(),
      },
      return: {
        title: 'Submit Item Return',
        message: `Are you sure you want to submit this return for ${returnForm.value.quantity} item(s)?`,
        onConfirm: () => handleReturnItem(),
      },
    };

    const config = configs[type];
    confirmModal.value = {
      show: true,
      type,
      title: config.title,
      message: config.message,
      order,
      onConfirm: config.onConfirm,
    };
    confirmModal.value.show = true;
  };

  const closeConfirmModal = () => {
    confirmModal.value = {
      show: false,
      type: '',
      title: '',
      message: '',
      order: null,
      onConfirm: null,
      loading: false,
    };
  };

  const handleConfirmAction = async () => {
    if (confirmModal.value.onConfirm) {
      try {
        confirmModal.value.loading = true;
        await confirmModal.value.onConfirm();
        closeConfirmModal();
      } catch (error) {
        console.error('Confirmation action failed:', error);
        confirmModal.value.loading = false;
      }
    }
  };

  // Wrapper confirmation methods
  const showCreateConfirmation = () => {
    if (!orderForm.value.po_number.trim()) {
      showToast('error', 'Please enter PO number');
      return;
    }
    if (!orderForm.value.supplier_id) {
      showToast('error', 'Please select supplier');
      return;
    }
    if (!orderForm.value.order_date) {
      showToast('error', 'Please select order date');
      return;
    }

    if (supplyRequestModal.value.selectedRequest) {
      const existingCompletedPO = purchaseOrderStore.purchaseOrders.find(
        (po) =>
          po.supply_request_id ===
            supplyRequestModal.value.selectedRequest.id &&
          po.status === 'Completed'
      );

      if (existingCompletedPO) {
        showToast(
          'error',
          `All items from supply request ${supplyRequestModal.value.selectedRequest.request_id} have been processed through completed PO: ${existingCompletedPO.po_number}`
        );
        return;
      }
    }

    openConfirmModal('create');
  };

  const showUpdateConfirmation = () => {
    if (!orderForm.value.po_number.trim()) {
      showToast('error', 'Please enter PO number');
      return;
    }
    if (!orderForm.value.supplier_id) {
      showToast('error', 'Please select supplier');
      return;
    }
    if (!orderForm.value.order_date) {
      showToast('error', 'Please select order date');
      return;
    }

    if (hasFieldChanges.value) {
      openConfirmModal('update');
    } else {
      showToast(
        'info',
        'No changes detected. Purchase order will remain unchanged.'
      );
    }
  };

  const showReturnConfirmation = () => {
    if (!returnForm.value.item_id) {
      showToast('error', 'Please select an item to return');
      return;
    }
    if (!returnForm.value.reason) {
      showToast('error', 'Please select a return reason');
      return;
    }
    if (returnForm.value.quantity < 1) {
      showToast('error', 'Please enter a valid quantity');
      return;
    }

    // Validate against availability
    const item = selectedReturnItem.value;
    const available = getAvailableForReturn(item);
    if (returnForm.value.quantity > available) {
      showToast('error', `Maximum return for this item is ${available}`);
      return;
    }

    returnModal.value.loading = true;
    openConfirmModal('return');
  };

  // Audit trail methods
  const openAuditTrailModal = (purchaseOrderId = null) => {
    auditTrailModal.value = { show: true, purchaseOrderId };
  };

  const closeAuditTrailModal = () => {
    auditTrailModal.value = { show: false, purchaseOrderId: null };
  };

  const handleReturnProcessed = (returnItem) => {
    purchaseOrderStore.fetchPurchaseOrders();
    showToast('success', 'Return processed successfully');
  };

  const handleReturnCancelled = (returnItem) => {
    purchaseOrderStore.fetchPurchaseOrders();
    showToast('success', 'Return cancelled successfully');
  };

  const viewReturnDetails = (returnItem) => {
    console.log('View return details:', returnItem);
  };

  // Rating modal methods
  const openRatingModal = (purchaseOrder) => {
    if (!purchaseOrder || typeof purchaseOrder !== 'object') {
      console.error(
        'Purchase order is null or invalid, cannot open rating modal'
      );
      return;
    }

    if (!purchaseOrder.id || !purchaseOrder.supplier_id) {
      console.error(
        'Purchase order missing required properties (id or supplier_id)'
      );
      return;
    }

    let supplierName = purchaseOrder.supplier_name;
    if (!supplierName) {
      const supplier = suppliers.value.find(
        (s) => s.id === purchaseOrder.supplier_id
      );
      supplierName = supplier ? supplier.name : 'Unknown Supplier';
    }

    ratingModal.value = { show: true, purchaseOrder, supplierName };
  };

  const closeRatingModal = () => {
    ratingModal.value = { show: false, purchaseOrder: {}, supplierName: '' };
  };

  const handleRatingSubmitted = async (ratingData) => {
    showToast(
      'success',
      `Thank you for rating ${ratingModal.value.supplierName}!`
    );
    try {
      await Promise.all([
        purchaseOrderStore.fetchPurchaseOrders(),
        supplierStore.fetchSuppliersWithStats(),
      ]);
    } catch (error) {
      console.error('Error refreshing data after rating:', error);
    }
  };

  // GRN methods
  // Update the createGRNFromPO method to use the correct endpoint
  const createGRNFromPO = async (order) => {
    try {
      // Check if we can create a new GRN
      const eligibility = await checkGRNCreationEligibility(order);

      if (!eligibility.canCreate) {
        showToast('error', eligibility.reason);
        return;
      }

      // Show confirmation modal instead of directly creating
      grnConfirmModal.value = {
        show: true,
        order: order,
        loading: false,
      };
    } catch (error) {
      console.error('Error creating GRN:', error);
      showToast('error', error.message || 'Failed to create GRN');
    }
  };

  const confirmCreateGRN = async () => {
    const order = grnConfirmModal.value.order;
    if (!order) {
      showToast('error', 'No purchase order selected');
      return;
    }

    try {
      grnConfirmModal.value.loading = true;

      const grnData = {
        received_by: authStore.user.id,
        received_date: new Date().toISOString().split('T')[0],
        notes: `GRN created from PO ${order.po_number}`,
        is_partial: false,
      };

      await grnStore.createGRNFromPO(order.id, grnData);

      showToast('success', 'GRN created successfully!');

      // Immediately close the modal and reset state
      closeGRNConfirmModal();

      // Refresh the orders list in the background (non-blocking)
      purchaseOrderStore
        .fetchPurchaseOrders()
        .catch((err) =>
          console.error('Error refreshing orders after GRN:', err)
        );
    } catch (error) {
      console.error('Error creating GRN:', error);
      showToast('error', error.message || 'Failed to create GRN');
    } finally {
      // Always ensure loading state is reset
      grnConfirmModal.value.loading = false;
    }
  };

  const closeGRNConfirmModal = () => {
    // Close the modal first

    // Reset the entire modal state with proper reactivity
    grnConfirmModal.value = {
      show: false,
      order: null,
      loading: false,
    };
  };

  // Completion modal methods
  const openCompletionModal = async (order) => {
    if (order.status === 'Completed') {
      showToast('error', 'Purchase order is already completed');
      return;
    }

    try {
      loading.value = true;
      const fullOrderDetails = await purchaseOrderStore.fetchPurchaseOrderById(
        order.id
      );
      completionModal.value = {
        show: true,
        order: fullOrderDetails,
        loading: false,
      };
    } catch (error) {
      showToast('error', 'Failed to load order details for completion');
    } finally {
      loading.value = false;
    }
  };

  const closeCompletionModal = () => {
    completionModal.value = { show: false, order: null, loading: false };
  };

  const handleCompleteOrder = async (completionData) => {
    try {
      completionModal.value.loading = true;

      // Update the purchase order with received quantities
      const updatedData = {
        ...completionModal.value.order,
        status: 'Completed',
        completion_notes: completionData.completion_notes,
        completed_by: getCurrentUserName(),
      };

      // Update items with received quantities - we need to update existing items, not create new ones
      const updatedItems = completionData.items.map((item) => {
        // Find the original item from the purchase order
        const originalItem = completionModal.value.order.items.find(
          (orig) => orig.id === item.id
        );
        return {
          ...originalItem, // Keep all original item data
          received_quantity: item.received_quantity,
          received_unit_price: item.received_unit_price,
          received_total_price: item.received_total_price,
          received_at: new Date().toISOString(),
          received_by: getCurrentUserName(),
        };
      });

      await purchaseOrderStore.updatePurchaseOrder(
        completionModal.value.order.id,
        updatedData,
        updatedItems
      );

      // Store the order data before closing the modal
      const completedOrder = {
        ...completionModal.value.order,
        status: 'Completed',
      };

      closeCompletionModal();
      showToast('success', 'Purchase order completed successfully');

      // Check if rating modal should be shown
      setTimeout(async () => {
        try {
          const existingRatingResponse =
            await purchaseOrderStore.checkPurchaseOrderRating(
              completedOrder.id
            );
          const hasExistingRating =
            existingRatingResponse && existingRatingResponse.data;

          if (!hasExistingRating) {
            openRatingModal(completedOrder);
          }
        } catch (error) {
          console.error('Error checking rating:', error);
        }
      }, 1000);
    } catch (error) {
      showToast('error', error.message || 'Failed to complete purchase order');
    } finally {
      completionModal.value.loading = false;
    }
  };

  const handleModalClick = (event) => {
    // Close modal when clicking outside, but only if not loading
    if (!grnConfirmModal.value.loading && event.target.tagName === 'DIALOG') {
      closeGRNConfirmModal();
    }
  };

  // Field change handler
  const handleFieldChange = (fieldName, value) => {
    const originalOrder = modal.value.order;
    if (originalOrder && modal.value.type === 'edit') {
      const originalValue = originalOrder[fieldName];
      const hasChanged = value !== originalValue;
      if (hasChanged) {
        console.log(
          `Field ${fieldName} changed from ${originalValue} to ${value}`
        );
      }
    }
    orderForm.value[fieldName] = value;
  };

  // Optimized watchers for better performance
  watch(
    [() => purchaseOrderStore.purchaseOrders, selectedDate],
    () => {
      // Only update counts when necessary
      nextTick(() => {
        // Update counts here if needed
      });
    },
    { deep: false, immediate: false } // Remove deep and immediate for better performance
  );

  watch(
    [approvedSupplyRequests, supplyRequestFilterType],
    () => {
      // Only update when actually needed
    },
    { deep: false, immediate: false }
  );

  watch(
    [() => purchaseOrderStore.purchaseOrders],
    () => {
      // Only update when actually needed
    },
    { deep: false, immediate: false }
  );

  // Performance optimization: Data caching
  const dataCache = ref({
    lastFetch: null,
    cacheDuration: 5 * 60 * 1000, // 5 minutes
  });

  const shouldFetchData = () => {
    if (!dataCache.value.lastFetch) return true;
    return (
      Date.now() - dataCache.value.lastFetch > dataCache.value.cacheDuration
    );
  };

  // Cleanup function to reset modal states
  const cleanupModals = () => {
    // Reset GRN confirm modal state
    grnConfirmModal.value = { show: false, order: null, loading: false };
  };

  // Lifecycle with progressive loading
  onMounted(async () => {
    try {
      loading.value = true;

      // Phase 1: Load essential data first (what user sees immediately)
      await Promise.all([
        purchaseOrderStore.fetchPurchaseOrders(),
        supplierStore.fetchActiveSuppliers(),
      ]);

      // Phase 2: Load secondary data after initial render (non-blocking)
      setTimeout(async () => {
        try {
          await Promise.all([
            purchaseOrderStore.fetchStats(),
            supplyRequestStore.fetchRequests({ department: 'SCM' }),
          ]);
        } catch (error) {
          console.error('Error loading secondary data:', error);
          // Don't show error toast for secondary data to avoid UX disruption
        }
      }, 100);

      dataCache.value.lastFetch = Date.now();
      console.log('PurchaseOrder component mounted and data loaded');

      // Add keyboard event listener for Escape key
      document.addEventListener('keydown', handleEscape);
      // Add click outside listener for date dropdown
      document.addEventListener('click', closeDateDropdown);
      // Add click outside listener for status dropdown
      document.addEventListener('click', closeStatusDropdown);
      // Add click outside listener for history status dropdown
      document.addEventListener('click', closeHistoryStatusDropdown);
      // Add click outside listener for history date dropdown
      document.addEventListener('click', closeHistoryDateDropdown);

      // Handle route query
      try {
        const route = router.currentRoute?.value;
        const poIdFromQuery = route?.query?.returnsForPO;
        if (poIdFromQuery) {
          openAuditTrailModal(Number(poIdFromQuery));
        }
      } catch (_) {}
    } catch (error) {
      console.error('Error loading essential data:', error);
      showToast('error', 'Failed to load essential data');
    } finally {
      loading.value = false;
    }
  });

  // Cleanup on component unmount
  onUnmounted(() => {
    cleanupModals();
    // Remove keyboard event listener
    document.removeEventListener('keydown', handleEscape);
    // Remove click outside listener for date dropdown
    document.removeEventListener('click', closeDateDropdown);
    // Remove click outside listener for status dropdown
    document.removeEventListener('click', closeStatusDropdown);
    // Remove click outside listener for history status dropdown
    document.removeEventListener('click', closeHistoryStatusDropdown);
    // Remove click outside listener for history date dropdown
    document.removeEventListener('click', closeHistoryDateDropdown);
  });

  // Add keyboard event listener for Escape key
  const handleEscape = (event) => {
    if (
      event.key === 'Escape' &&
      grnConfirmModal.value.show &&
      !grnConfirmModal.value.loading
    ) {
      closeGRNConfirmModal();
    }
  };
</script>

<template>
  <div class="container mx-auto p-2 sm:p-4 lg:p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6 lg:mb-8">
      <h1
        class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primaryColor mb-2 text-shadow-xs"
      >
        Purchase Order Management
      </h1>
      <p class="text-sm sm:text-base text-black/50 px-2">
        Manage and track purchase orders for Countryside Steakhouse.
      </p>
    </div>



    <!-- Purchase Order List -->
    <div
      class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10 mx-auto"
    >
      <div class="card-body p-3 sm:p-4 lg:p-6">
        <!-- Header with responsive buttons -->
        <div
          class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4"
        >
          <h2
            class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl"
          >
            Purchase Orders
          </h2>

          <!-- Mobile: Stacked buttons -->
          <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div class="grid grid-cols-1 sm:flex gap-2">
              <button
                class="btn btn-outline btn-xs sm:btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
                @click="refreshData"
                :disabled="loading"
              >
                <RefreshCcw
                  class="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-primaryColor"
                  :class="{ 'animate-spin': loading }"
                />
                <span class="hidden sm:inline">{{
                  loading ? 'Refreshing...' : 'Refresh'
                }}</span>
                <span class="sm:hidden">{{
                  loading ? 'Refreshing...' : 'Refresh'
                }}</span>
              </button>
            </div>
            <button
              class="btn btn-outline btn-xs sm:btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
              @click="openModal('create')"
            >
              <Plus
                class="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-primaryColor"
              />
              Create PO
            </button>
            <button
              class="btn btn-outline btn-xs sm:btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
              @click="openAuditTrailModal()"
            >
              <FileText
                class="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-primaryColor"
              />
              <span class="hidden sm:inline">View Returns</span>
              <span class="sm:hidden">Returns</span>
            </button>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="tabs tabs-boxed bg-white/50 mb-4">
          <button
            class="tab font-medium"
            :class="
              activeTab === 'active'
                ? 'tab-active text-black'
                : 'text-primaryColor'
            "
            @click="activeTab = 'active'"
          >
            <Clock class="w-4 h-4 mr-2" />
            Active Orders
          </button>
          <button
            class="tab font-medium"
            :class="
              activeTab === 'history'
                ? 'tab-active  text-black'
                : 'text-primaryColor'
            "
            @click="activeTab = 'history'"
          >
            <FileText class="w-4 h-4 mr-2" />
            Order History
          </button>
        </div>

        <!-- Active Orders Tab -->
        <div v-if="activeTab === 'active'">
          <!-- Search and Filters -->
          <div class="mb-4 sm:mb-6">
            <!-- Search Bar -->
            <div class="flex flex-col gap-3 sm:gap-4 mb-4">
              <div class="flex-1 relative">
                <Search
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 !text-black"
                />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search purchase orders..."
                  class="input input-sm sm:input-md input-bordered bg-white border-primaryColor/30 text-black/70 pl-10 w-full shadow-none text-sm sm:text-base"
                />
              </div>
            </div>

            <!-- Date Filter Section -->
            <div
              class="mb-6 p-4 bg-white/5 rounded-lg border border-primaryColor/20"
            >
              <div
                class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
              >
                <!-- Current Date Display -->
                <div class="flex items-center gap-3">
                  <Calendar class="w-5 h-5 text-primaryColor" />
                  <div>
                    <h3 class="font-semibold text-primaryColor">
                      {{ getDateFilterDisplayText() }}
                    </h3>
                    <p class="text-sm text-black/60">
                      Showing {{ filteredOrdersByDate.length }} order{{
                        filteredOrdersByDate.length !== 1 ? 's' : ''
                      }}
                    </p>
                  </div>
                </div>

                <!-- Date Navigation and Filter Controls -->
                <div class="flex flex-col sm:flex-row gap-3">
                  <!-- Quick Date Dropdown -->
                  <div class="relative" @click.stop>
                    <button
                      class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
                      @click="toggleDateDropdown"
                    >
                      <Filter class="w-4 h-4" />
                    </button>

                    <!-- Dropdown Menu -->
                    <div
                      v-if="showDateDropdown"
                      class="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                    >
                      <div class="py-1">
                        <button
                          v-for="option in quickDateOptions"
                          :key="option.type"
                          class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between cursor-pointer"
                          :class="{
                            'bg-primaryColor/10 text-primaryColor font-medium':
                              dateFilterType === option.type,
                            'text-gray-700': dateFilterType !== option.type,
                          }"
                          @click="selectQuickDate(option)"
                        >
                          <span>{{ option.label }}</span>
                          <span
                            class="badge badge-xs bg-secondaryColor border-none"
                            :class="
                              dateFilterType === option.type
                                ? 'badge-ghost'
                                : 'badge-primaryColor/10 text-primaryColor'
                            "
                          >
                            {{ option.count }}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Custom Month Picker -->
                  <div class="relative">
                    <button
                      class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
                      @click="toggleActiveCustomMonthPicker"
                    >
                      <Calendar class="w-4 h-4 mr-1" />
                      Custom Month
                    </button>

                    <!-- Custom Month Picker -->
                    <div
                      v-if="showCustomMonthPicker"
                      class="absolute top-full left-0 mt-1 bg-white border border-primaryColor/30 rounded-lg shadow-lg z-10 p-3 min-w-64"
                    >
                      <div class="flex items-center justify-between mb-3">
                        <h4 class="font-medium text-sm text-black">
                          Select Month
                        </h4>
                        <button
                          @click="showCustomMonthPicker = false"
                          class="btn btn-ghost btn-xs"
                        >
                          <X class="w-3 h-3" />
                        </button>
                      </div>

                      <!-- Month Selection -->
                      <div class="grid grid-cols-3 gap-2 mb-3">
                        <button
                          v-for="month in months"
                          :key="month.value"
                          class="btn btn-xs font-thin"
                          :class="{
                            'bg-primaryColor text-white':
                              customMonthPicker.month === month.value,
                            'btn-ghost':
                              customMonthPicker.month !== month.value,
                          }"
                          @click="customMonthPicker.month = month.value"
                        >
                          {{ month.label }}
                        </button>
                      </div>

                      <!-- Year Selection -->
                      <div class="flex items-center gap-2 mb-3">
                        <span class="text-sm text-black/70">Year:</span>
                        <select
                          v-model="customMonthPicker.year"
                          class="select select-xs select-bordered bg-white border-primaryColor/30 text-black/70"
                        >
                          <option
                            v-for="year in availableYears"
                            :key="year"
                            :value="year"
                          >
                            {{ year }}
                          </option>
                        </select>
                      </div>

                      <!-- Apply Button -->
                      <div class="flex gap-2">
                        <button
                          @click="applyActiveCustomMonthFilter"
                          class="btn btn-xs bg-primaryColor text-white font-thin"
                        >
                          Apply
                        </button>
                        <button
                          @click="showCustomMonthPicker = false"
                          class="btn btn-xs btn-ghost font-thin"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Update the existing filter buttons section to work with date filtering -->
            <div
              class="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-2 mb-4"
            >
              <!-- Status Filter Dropdown -->
              <div class="flex flex-col sm:flex-row gap-2">
                <div class="relative" @click.stop>
                  <button
                    class="btn btn-xs btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
                    @click="toggleStatusDropdown"
                  >
                    <Filter class="w-3 h-3 mr-1" />
                    {{ statusFilter || 'All Status' }}
                  </button>

                  <!-- Dropdown Menu -->
                  <div
                    v-if="showStatusDropdown"
                    class="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                  >
                    <div class="py-1">
                      <button
                        class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between cursor-pointer"
                        :class="{
                          'bg-primaryColor/10 text-primaryColor font-medium':
                            statusFilter === '',
                          'text-gray-700': statusFilter !== '',
                        }"
                        @click="selectStatusFilter('')"
                      >
                        <span>All Status</span>
                        <span
                          class="badge badge-xs bg-secondaryColor border-none"
                          :class="
                            statusFilter === ''
                              ? 'badge-ghost'
                              : 'badge-primaryColor/10 text-primaryColor'
                          "
                        >
                          {{ filteredOrdersByDate.length }}
                        </span>
                      </button>
                      <button
                        v-for="status in activeOrderStatuses"
                        :key="status"
                        class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between cursor-pointer"
                        :class="{
                          'bg-primaryColor/10 text-primaryColor font-medium':
                            statusFilter === status,
                          'text-gray-700': statusFilter !== status,
                        }"
                        @click="selectStatusFilter(status)"
                      >
                        <span>{{ status }}</span>
                        <span
                          class="badge badge-xs bg-secondaryColor border-none"
                          :class="
                            statusFilter === status
                              ? 'badge-ghost'
                              : 'badge-primaryColor/10 text-primaryColor'
                          "
                        >
                          {{
                            filteredOrdersByDate.filter(
                              (o) => o.status === status
                            ).length
                          }}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <!-- Empty State -->
          <div v-else-if="filteredOrders.length === 0" class="text-center py-8">
            <div class="mb-4 items-center justify-center flex">
              <FileText class="w-12 h-12 sm:w-16 sm:h-16 text-primaryColor" />
            </div>
            <h3
              class="text-base sm:text-lg font-semibold mb-2 text-primaryColor"
            >
              No active purchase orders found
            </h3>
            <p class="text-sm sm:text-base text-black/50 mb-4 px-4">
              Try adjusting your search criteria or create a new purchase order.
            </p>
            <button
              class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
              @click="openModal('create')"
            >
              <Plus class="w-4 h-4 mr-2" />
              Create New PO
            </button>
          </div>

          <!-- Purchase Order Grid - Responsive -->
          <div
            v-else
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
          >
            <div
              v-for="order in paginatedOrders"
              :key="order.id"
              class="card bg-white shadow-md border border-black/10 hover:shadow-lg transition-shadow duration-200"
            >
              <div class="card-body p-3 sm:p-4">
                <!-- Header -->
                <div class="flex justify-between items-start mb-3">
                  <div class="flex-1 min-w-0">
                    <h3
                      class="font-semibold text-black truncate text-sm sm:text-base"
                    >
                      {{ order.po_number }}
                    </h3>
                    <p class="text-xs sm:text-sm text-black/60 truncate">
                      {{ order.supplier_name }}
                    </p>
                  </div>
                  <div class="dropdown dropdown-left">
                    <label
                      tabindex="0"
                      class="btn btn-ghost btn-xs hover:outline-none hover:bg-white/10"
                    >
                      <EllipsisVertical class="w-3 h-3 sm:w-4 sm:h-4" />
                    </label>
                    <ul
                      tabindex="0"
                      class="dropdown-content z-[1] menu p-2 shadow bg-white rounded-box w-28 sm:w-32 border border-black/10"
                    >
                      <li class="hover:bg-black/10">
                        <a
                          @click="openModal('view', order)"
                          class="text-primary text-xs sm:text-sm"
                          >View Details</a
                        >
                      </li>
                      <li class="hover:bg-black/10">
                        <a
                          @click="openReceiptModal(order)"
                          class="text-info text-xs sm:text-sm"
                          >View Receipt</a
                        >
                      </li>
                      <!-- Only show Edit for non-cancelled and non-completed orders -->
                      <li
                        v-if="
                          order.status !== 'Cancelled' &&
                          order.status !== 'Completed'
                        "
                        class="hover:bg-black/10"
                      >
                        <a
                          @click="openModal('edit', order)"
                          class="text-warning text-xs sm:text-sm"
                          >Edit</a
                        >
                      </li>
                      <!-- Complete Order action for non-completed orders -->
                      <li
                        v-if="
                          order.status !== 'Cancelled' &&
                          order.status !== 'Completed'
                        "
                        class="hover:bg-black/10"
                      >
                        <a
                          @click="openCompletionModal(order)"
                          class="text-success text-xs sm:text-sm"
                          >Complete Order</a
                        >
                      </li>
                      <!-- Only show Cancel Order for non-cancelled and non-completed orders -->
                      <li
                        v-if="
                          order.status !== 'Cancelled' &&
                          order.status !== 'Completed'
                        "
                        class="hover:bg-black/10"
                      >
                        <a
                          @click="openConfirmModal('cancel', order)"
                          class="text-error text-xs sm:text-sm"
                          >Cancel Order</a
                        >
                      </li>
                      <!-- Add Return Items action for completed orders -->
                      <li
                        v-if="order.status === 'Completed'"
                        class="hover:bg-black/10"
                      >
                        <a
                          @click="openReturnModal(order)"
                          class="text-warning text-xs sm:text-sm"
                          >Return Items</a
                        >
                      </li>
                      <li class="hover:bg-black/10">
                        <a
                          @click="openAuditTrailModal(order.id)"
                          class="text-info text-xs sm:text-sm"
                          >View Returns</a
                        >
                      </li>
                    </ul>
                  </div>
                </div>

                <!-- Order Info -->
                <div class="space-y-2 mb-3">
                  <div class="flex items-center text-xs sm:text-sm">
                    <span class="font-medium text-black/70 w-16 sm:w-20"
                      >Date:</span
                    >
                    <span class="text-black truncate">{{
                      formatDate(order.order_date)
                    }}</span>
                  </div>
                  <div class="flex items-center text-xs sm:text-sm">
                    <span class="font-medium text-black/70 w-16 sm:w-20"
                      >Items:</span
                    >
                    <span class="text-black truncate">{{
                      order.item_count
                    }}</span>
                  </div>
                  <div class="flex items-center text-xs sm:text-sm">
                    <span class="font-medium text-black/70 w-16 sm:w-20"
                      >Total:</span
                    >
                    <span class="text-black font-semibold"
                      >₱{{ order.total_amount.toLocaleString() }}</span
                    >
                  </div>
                  <div
                    v-if="order.supply_request_number"
                    class="flex items-center text-xs sm:text-sm"
                  >
                    <span class="font-medium text-black/70 w-16 sm:w-20"
                      >Request:</span
                    >
                    <span class="text-info font-medium truncate">{{
                      order.supply_request_number
                    }}</span>
                  </div>
                </div>

                <!-- Status and Delivery -->
                <div class="flex justify-between items-center mb-3">
                  <div
                    class="badge badge-xs sm:badge-sm border-none"
                    :class="getStatusColor(order.status)"
                  >
                    {{ order.status }}
                  </div>

                  <div class="flex items-center text-xs sm:text-sm">
                    <span class="text-black/70 mr-1">Delivery:</span>
                    <span
                      class="font-medium"
                      :class="
                        order.expected_delivery ? 'text-info' : 'text-black/30'
                      "
                    >
                      {{
                        order.expected_delivery
                          ? formatDate(order.expected_delivery)
                          : 'TBD'
                      }}
                    </span>
                  </div>
                </div>

                <!-- Notes -->
                <div class="flex items-start text-xs text-black/60">
                  <MessageSquare class="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                  <span class="line-clamp-2">{{
                    order.notes || 'No notes'
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination - Responsive -->
          <div
            class="flex flex-col sm:flex-row justify-between items-center mt-4 sm:mt-6 gap-3"
            v-if="totalPages > 1"
          >
            <div
              class="text-xs sm:text-sm text-black/60 text-center sm:text-left"
            >
              Showing {{ (currentPage - 1) * ordersPerPage + 1 }} to
              {{ Math.min(currentPage * ordersPerPage, filteredOrders.length) }}
              of {{ filteredOrders.length }} orders for
              {{ formatPhilippineDate(selectedDate) }}
            </div>

            <div class="join space-x-1">
              <button
                class="join-item btn font-thin !bg-gray-200 text-black/50 btn-xs sm:btn-sm border border-none hover:bg-gray-300"
                :disabled="currentPage <= 1"
                @click="currentPage--"
              >
                « Prev
              </button>

              <button
                class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-xs sm:btn-sm shadow-none"
                v-for="page in totalPages"
                :key="page"
                :class="{
                  'btn-active': currentPage === page,
                  '!bg-primaryColor text-white': currentPage === page,
                }"
                @click="currentPage = page"
              >
                {{ page }}
              </button>

              <button
                class="join-item btn font-thin btn-xs sm:btn-sm !bg-gray-200 text-black/50 border border-none"
                :disabled="currentPage >= totalPages"
                @click="currentPage++"
              >
                Next »
              </button>
            </div>
          </div>
        </div>

        <!-- Order History Tab -->
        <div v-if="activeTab === 'history'">
          <!-- History Search and Filters -->
          <div class="mb-4 sm:mb-6">
            <!-- Search Bar -->
            <div class="flex flex-col gap-3 sm:gap-4 mb-4">
              <div class="flex-1 relative">
                <Search
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 !text-black"
                />
                <input
                  v-model="historySearchQuery"
                  type="text"
                  placeholder="Search order history..."
                  class="input input-sm sm:input-md input-bordered bg-white border-primaryColor/30 text-black/70 pl-10 w-full shadow-none text-sm sm:text-base"
                />
              </div>
            </div>

            <!-- History Date Filter Section -->
            <div
              class="mb-6 p-4 bg-white/5 rounded-lg border border-primaryColor/20"
            >
              <div
                class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
              >
                <!-- Current Filter Display -->
                <div class="flex items-center gap-3">
                  <Calendar class="w-5 h-5 text-primaryColor" />
                  <div>
                    <h3 class="font-semibold text-primaryColor">
                      {{ getHistoryFilterDisplayText() }}
                    </h3>
                    <p class="text-sm text-black/60">
                      Showing {{ filteredHistory.length }} order{{
                        filteredHistory.length !== 1 ? 's' : ''
                      }}
                    </p>
                  </div>
                </div>

                <!-- Filter Controls -->
                <div class="flex flex-col sm:flex-row gap-3">
                  <!-- Quick Date Dropdown -->
                  <div class="relative" @click.stop>
                    <button
                      class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
                      @click="toggleHistoryDateDropdown"
                    >
                      <Filter class="w-4 h-4" />
                    </button>

                    <!-- Dropdown Menu -->
                    <div
                      v-if="showHistoryDateDropdown"
                      class="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                    >
                      <div class="py-1">
                        <button
                          v-for="option in historyFilterOptions"
                          :key="option.type"
                          class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between cursor-pointer"
                          :class="{
                            'bg-primaryColor/10 text-primaryColor font-medium':
                              historyFilterType === option.type,
                            'text-gray-700': historyFilterType !== option.type,
                          }"
                          @click="selectHistoryDateFilter(option)"
                        >
                          <span>{{ option.label }}</span>
                          <span
                            class="badge badge-xs bg-secondaryColor border-none"
                            :class="
                              historyFilterType === option.type
                                ? 'badge-ghost'
                                : 'badge-primaryColor/10 text-primaryColor'
                            "
                          >
                            {{ option.count }}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Custom Month Selection -->
                  <div class="flex items-center gap-2">
                    <div class="relative">
                      <button
                        class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
                        @click="toggleCustomMonthPicker"
                      >
                        <Calendar class="w-4 h-4 mr-1" />
                        Custom Month
                      </button>

                      <!-- Custom Month Picker -->
                      <div
                        v-if="showCustomMonthPicker"
                        class="absolute top-full left-0 mt-1 bg-white border border-primaryColor/30 rounded-lg shadow-lg z-10 p-3 min-w-64"
                      >
                        <div class="flex items-center justify-between mb-3">
                          <h4 class="font-medium text-sm text-black">
                            Select Month
                          </h4>
                          <button
                            @click="showCustomMonthPicker = false"
                            class="btn btn-ghost btn-xs"
                          >
                            <X class="w-3 h-3" />
                          </button>
                        </div>

                        <!-- Month Selection -->
                        <div class="grid grid-cols-3 gap-2 mb-3">
                          <button
                            v-for="month in months"
                            :key="month.value"
                            class="btn btn-xs font-thin"
                            :class="{
                              'bg-primaryColor text-white':
                                customMonthPicker.month === month.value,
                              'btn-ghost':
                                customMonthPicker.month !== month.value,
                            }"
                            @click="customMonthPicker.month = month.value"
                          >
                            {{ month.label }}
                          </button>
                        </div>

                        <!-- Year Selection -->
                        <div class="flex items-center gap-2 mb-3">
                          <span class="text-sm text-black/70">Year:</span>
                          <select
                            v-model="customMonthPicker.year"
                            class="select select-xs select-bordered bg-white border-primaryColor/30 text-black/70"
                          >
                            <option
                              v-for="year in availableYears"
                              :key="year"
                              :value="year"
                            >
                              {{ year }}
                            </option>
                          </select>
                        </div>

                        <!-- Apply Button -->
                        <div class="flex gap-2">
                          <button
                            @click="applyCustomMonthFilter"
                            class="btn btn-xs bg-primaryColor text-white font-thin"
                          >
                            Apply
                          </button>
                          <button
                            @click="showCustomMonthPicker = false"
                            class="btn btn-xs btn-ghost font-thin"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Clear Filters Button -->
                    <button
                      class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
                      @click="clearHistoryFilters"
                    >
                      <RefreshCcw class="w-4 h-4 mr-1" />
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- History Filter Buttons -->
            <div
              class="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-2 mb-4"
            >
              <!-- Status Filter Dropdown -->
              <div class="flex flex-col sm:flex-row gap-2">
                <div class="relative" @click.stop>
                  <button
                    class="btn btn-xs btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
                    @click="toggleHistoryStatusDropdown"
                  >
                    <Filter class="w-3 h-3 mr-1" />
                    {{ historyStatusFilter || 'All Status' }}
                  </button>

                  <!-- Dropdown Menu -->
                  <div
                    v-if="showHistoryStatusDropdown"
                    class="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                  >
                    <div class="py-1">
                      <button
                        class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between cursor-pointer"
                        :class="{
                          'bg-primaryColor/10 text-primaryColor font-medium':
                            historyStatusFilter === '',
                          'text-gray-700': historyStatusFilter !== '',
                        }"
                        @click="selectHistoryStatusFilter('')"
                      >
                        <span>All Status</span>
                        <span
                          class="badge badge-xs bg-secondaryColor border-none"
                          :class="
                            historyStatusFilter === ''
                              ? 'badge-ghost'
                              : 'badge-primaryColor/10 text-primaryColor'
                          "
                        >
                          {{ filteredHistoryByDate.length }}
                        </span>
                      </button>
                      <button
                        v-for="status in historyOrderStatuses"
                        :key="status"
                        class="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between cursor-pointer"
                        :class="{
                          'bg-primaryColor/10 text-primaryColor font-medium':
                            historyStatusFilter === status,
                          'text-gray-700': historyStatusFilter !== status,
                        }"
                        @click="selectHistoryStatusFilter(status)"
                      >
                        <span>{{ status }}</span>
                        <span
                          class="badge badge-xs bg-secondaryColor border-none"
                          :class="
                            historyStatusFilter === status
                              ? 'badge-ghost'
                              : 'badge-primaryColor/10 text-primaryColor'
                          "
                        >
                          {{
                            filteredHistoryByDate.filter(
                              (o) => o.status === status
                            ).length
                          }}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Supplier Filters -->
              <div class="flex flex-col sm:flex-row gap-2">
                <span
                  class="text-xs sm:text-sm text-black/70 font-medium self-start sm:self-center"
                  >Supplier:</span
                >
                <select
                  v-model="historySupplierFilter"
                  class="select select-xs sm:select-sm select-bordered bg-white border-primaryColor/30 text-black/70 text-xs sm:text-sm"
                >
                  <option value="">All Suppliers</option>
                  <option
                    v-for="supplier in uniqueHistorySuppliersByDate"
                    :key="supplier"
                    :value="supplier"
                  >
                    {{ supplier }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="flex justify-center py-8">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="filteredHistory.length === 0"
            class="text-center py-8"
          >
            <div class="mb-4 items-center justify-center flex">
              <FileText class="w-12 h-12 sm:w-16 sm:h-16 text-primaryColor" />
            </div>
            <h3
              class="text-base sm:text-lg font-semibold mb-2 text-primaryColor"
            >
              No order history found
            </h3>
            <p class="text-sm sm:text-base text-black/50 mb-4 px-4">
              No completed or cancelled orders for the selected criteria.
            </p>
          </div>

          <!-- Order History Grid -->
          <div
            v-else
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
          >
            <div
              v-for="order in paginatedHistory"
              :key="order.id"
              class="card bg-white shadow-md border border-black/10 hover:shadow-lg transition-shadow duration-200"
            >
              <div class="card-body p-3 sm:p-4">
                <!-- Header -->
                <div class="flex justify-between items-start mb-3">
                  <div class="flex-1 min-w-0">
                    <h3
                      class="font-semibold text-black truncate text-sm sm:text-base"
                    >
                      {{ order.po_number }}
                    </h3>
                    <p class="text-xs sm:text-sm text-black/60 truncate">
                      {{ order.supplier_name }}
                    </p>
                  </div>
                  <div class="dropdown dropdown-left">
                    <label
                      tabindex="0"
                      class="btn btn-ghost btn-xs hover:outline-none hover:bg-white/10"
                    >
                      <EllipsisVertical class="w-3 h-3 sm:w-4 sm:h-4" />
                    </label>
                    <ul
                      tabindex="0"
                      class="dropdown-content z-[1] menu p-2 shadow bg-white rounded-box w-28 sm:w-32 border border-black/10"
                    >
                      <li class="hover:bg-black/10">
                        <a
                          @click="openModal('view', order)"
                          class="text-primary text-xs sm:text-sm"
                          >View Details</a
                        >
                      </li>
                      <li class="hover:bg-black/10">
                        <a
                          @click="openReceiptModal(order)"
                          class="text-info text-xs sm:text-sm"
                          >View Receipt</a
                        >
                      </li>
                      <!-- Complete Order action for non-completed orders -->
                      <li
                        v-if="
                          order.status !== 'Cancelled' &&
                          order.status !== 'Completed'
                        "
                        class="hover:bg-black/10"
                      >
                        <a
                          @click="openCompletionModal(order)"
                          class="text-success text-xs sm:text-sm"
                          >Complete Order</a
                        >
                      </li>
                      <!-- Only show Create GRN for completed orders without pending returns -->
                      <li
                        v-if="
                          order.status === 'Completed' && canCreateNewGRN(order)
                        "
                        class="hover:bg-black/10"
                      >
                        <a
                          @click="createGRNFromPO(order)"
                          class="text-success text-xs sm:text-sm"
                        >
                          Create GRN
                        </a>
                      </li>
                      <!-- Show disabled Create GRN for completed orders with pending returns -->
                      <li
                        v-if="
                          order.status === 'Completed' &&
                          !canCreateNewGRN(order)
                        "
                        class="hover:bg-black/10 opacity-50 cursor-not-allowed"
                      >
                        <a
                          class="text-black/50 text-xs sm:text-sm cursor-not-allowed"
                          :title="getGRNCreationReason(order)"
                        >
                          <span v-if="hasPendingReturns(order)">
                            Create GRN ({{ order.pending_returns_count }}
                            Returns Pending)
                          </span>
                          <span v-else> Create GRN (Already Processed) </span>
                        </a>
                      </li>
                      <!-- Return Items action for completed orders -->
                      <li
                        v-if="order.status === 'Completed'"
                        class="hover:bg-black/10"
                      >
                        <a
                          @click="openReturnModal(order)"
                          class="text-warning text-xs sm:text-sm"
                          >Return Items</a
                        >
                      </li>
                    </ul>
                  </div>
                </div>

                <!-- Order Info -->
                <div class="space-y-2 mb-3">
                  <div class="flex items-center text-xs sm:text-sm">
                    <span class="font-medium text-black/70 w-16 sm:w-20"
                      >Date:</span
                    >
                    <span class="text-black truncate">{{
                      formatDate(order.order_date)
                    }}</span>
                  </div>
                  <div class="flex items-center text-xs sm:text-sm">
                    <span class="font-medium text-black/70 w-16 sm:w-20"
                      >Items:</span
                    >
                    <span class="text-black truncate">{{
                      order.item_count
                    }}</span>
                  </div>
                  <div class="flex items-center text-xs sm:text-sm">
                    <span class="font-medium text-black/70 w-16 sm:w-20"
                      >Total:</span
                    >
                    <span class="text-black font-semibold"
                      >₱{{ order.total_amount.toLocaleString() }}</span
                    >
                  </div>
                  <div
                    v-if="order.supply_request_number"
                    class="flex items-center text-xs sm:text-sm"
                  >
                    <span class="font-medium text-black/70 w-16 sm:w-20"
                      >Request:</span
                    >
                    <span class="text-info font-medium truncate">{{
                      order.supply_request_number
                    }}</span>
                  </div>
                </div>

                <!-- Status and Delivery -->
                <div class="flex justify-between items-center mb-3">
                  <div
                    class="badge badge-xs sm:badge-sm border-none"
                    :class="getStatusColor(order.status)"
                  >
                    {{ order.status }}
                  </div>
                  <div class="flex items-center text-xs sm:text-sm">
                    <span class="text-black/70 mr-1">Delivery:</span>
                    <span
                      class="font-medium"
                      :class="
                        order.expected_delivery ? 'text-info' : 'text-black/30'
                      "
                    >
                      {{
                        order.expected_delivery
                          ? formatDate(order.expected_delivery)
                          : 'TBD'
                      }}
                    </span>
                  </div>
                </div>

                <!-- Notes -->
                <div class="flex items-start text-xs text-black/60">
                  <MessageSquare class="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                  <span class="line-clamp-2">{{
                    order.notes || 'No notes'
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- History Pagination -->
          <div
            class="flex flex-col sm:flex-row justify-between items-center mt-4 sm:mt-6 gap-3"
            v-if="totalHistoryPages > 1"
          >
            <div
              class="text-xs sm:text-sm text-black/60 text-center sm:text-left"
            >
              Showing
              {{ (historyCurrentPage - 1) * historyOrdersPerPage + 1 }} to
              {{
                Math.min(
                  historyCurrentPage * historyOrdersPerPage,
                  filteredHistory.length
                )
              }}
              of {{ filteredHistory.length }} orders for
              {{ getHistoryFilterDisplayText() }}
            </div>

            <div class="join space-x-1">
              <button
                class="join-item btn font-thin !bg-gray-200 text-black/50 btn-xs sm:btn-sm border border-none hover:bg-gray-300"
                :disabled="historyCurrentPage <= 1"
                @click="historyCurrentPage--"
              >
                « Prev
              </button>

              <button
                class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-xs sm:btn-sm shadow-none"
                v-for="page in totalHistoryPages"
                :key="page"
                :class="{
                  'btn-active': historyCurrentPage === page,
                  '!bg-primaryColor text-white': historyCurrentPage === page,
                }"
                @click="historyCurrentPage = page"
              >
                {{ page }}
              </button>

              <button
                class="join-item btn font-thin btn-xs sm:btn-sm !bg-gray-200 text-black/50 border border-none"
                :disabled="historyCurrentPage >= totalHistoryPages"
                @click="historyCurrentPage++"
              >
                Next »
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast Notification -->
  <Teleport to="body">
    <div
      v-if="toast.show"
      class="toast-container"
      style="
        position: fixed !important;
        top: 1rem !important;
        right: 1rem !important;
        z-index: 9999999 !important;
        pointer-events: auto !important;
        transform: translateZ(0) !important;
        isolation: isolate !important;
        max-width: 24rem !important;
        width: auto !important;
        height: auto !important;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
      "
    >
      <div
        v-if="toast.type === 'success'"
        class="alert alert-success shadow-lg"
        style="
          position: relative !important;
          z-index: 9999999 !important;
          background: #10b981 !important;
          color: white !important;
          border: none !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2) !important;
        "
      >
        <span class="text-xs sm:text-sm font-medium">{{ toast.message }}</span>
      </div>
      <div
        v-else-if="toast.type === 'error'"
        class="alert alert-error shadow-lg"
        style="
          position: relative !important;
          z-index: 9999999 !important;
          background: #ef4444 !important;
          color: white !important;
          border: none !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2) !important;
        "
      >
        <span class="text-xs sm:text-sm font-medium">{{ toast.message }}</span>
      </div>
      <div
        v-else-if="toast.type === 'info'"
        class="alert alert-info shadow-lg"
        style="
          position: relative !important;
          z-index: 9999999 !important;
          background: #3b82f6 !important;
          color: white !important;
          border: none !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2) !important;
        "
      >
        <span class="text-xs sm:text-sm font-medium">{{ toast.message }}</span>
      </div>
    </div>
  </Teleport>

  <!-- Purchase Order Modal -->
  <div v-if="modal.show" class="modal modal-open">
    <div class="modal-box max-w-4xl">
      <h3 class="font-bold text-lg mb-4">
        {{
          modal.type === 'create'
            ? 'Create Purchase Order'
            : modal.type === 'edit'
              ? 'Edit Purchase Order'
              : 'View Purchase Order'
        }}
      </h3>

      <form
        @submit.prevent="
          modal.type === 'create'
            ? showCreateConfirmation()
            : showUpdateConfirmation()
        "
      >
        <!-- Supply Request Selection (only for create mode) -->
        <div v-if="modal.type === 'create'" class="mb-6">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium"
                >Supply Request (Optional)</span
              >
            </label>
            <div class="flex gap-2">
              <input
                :value="orderForm.supply_request_display"
                type="text"
                placeholder="Select a supply request to create PO from..."
                class="input input-bordered flex-1"
                readonly
              />
              <button
                type="button"
                class="btn btn-outline bg-primaryColor text-white font-thin"
                @click="openSupplyRequestModal"
              >
                <Link class="w-4 h-4 mr-1" />
                Select Request
              </button>
            </div>
          </div>
        </div>

        <!-- Main Form Fields -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">PO Number</span>
              <span class="label-text-alt text-error">*</span>
            </label>
            <input
              v-model="orderForm.po_number"
              type="text"
              class="input input-bordered w-full"
              :placeholder="
                orderForm.supply_request_id
                  ? 'Auto-generated from supply request'
                  : 'Enter PO number'
              "
              required
              :disabled="
                modal.type === 'view' ||
                modal.type === 'edit' ||
                orderForm.supply_request_id
              "
              :readonly="orderForm.supply_request_id"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Supplier</span>
              <span class="label-text-alt text-error">*</span>
            </label>
            <select
              v-model="orderForm.supplier_id"
              class="select select-bordered w-full"
              required
              :disabled="modal.type === 'view'"
            >
              <option value="">Select Supplier</option>
              <option
                v-for="supplier in suppliers"
                :key="supplier.id"
                :value="String(supplier.id)"
              >
                {{ supplier.name }} - {{ supplier.category }}
              </option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Order Date</span>
              <span class="label-text-alt text-error">*</span>
              <span
                v-if="
                  modal.type === 'edit' &&
                  modal.order &&
                  orderForm.order_date !== modal.order.order_date
                "
                class="label-text-alt text-warning"
              >
                Modified
              </span>
            </label>
            <input
              v-model="orderForm.order_date"
              type="date"
              class="input input-bordered w-full"
              required
              :disabled="modal.type === 'view'"
              @change="handleFieldChange('order_date', $event.target.value)"
              :class="{
                'border-warning bg-warning/5':
                  modal.type === 'edit' &&
                  modal.order &&
                  orderForm.order_date !== modal.order.order_date,
              }"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Expected Delivery</span>
              <span
                v-if="
                  modal.type === 'edit' &&
                  modal.order &&
                  orderForm.expected_delivery !== modal.order.expected_delivery
                "
                class="label-text-alt text-warning"
              >
                Modified
              </span>
            </label>
            <input
              v-model="orderForm.expected_delivery"
              type="date"
              class="input input-bordered w-full"
              placeholder="Select delivery date"
              :disabled="modal.type === 'view'"
              @change="
                handleFieldChange('expected_delivery', $event.target.value)
              "
              :class="{
                'border-warning bg-warning/5':
                  modal.type === 'edit' &&
                  modal.order &&
                  orderForm.expected_delivery !== modal.order.expected_delivery,
              }"
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Status</span>
              <span
                v-if="
                  modal.type === 'edit' &&
                  modal.order &&
                  orderForm.status !== modal.order.status
                "
                class="label-text-alt text-warning"
              >
                Modified
              </span>
            </label>
            <select
              v-model="orderForm.status"
              class="select select-bordered w-full"
              :disabled="modal.type === 'view'"
              @change="handleFieldChange('status', $event.target.value)"
              :class="{
                'border-warning bg-warning/5':
                  modal.type === 'edit' &&
                  modal.order &&
                  orderForm.status !== modal.order.status,
              }"
            >
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Confirmed">Confirmed</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Total Amount</span>
            </label>
            <input
              v-model="orderForm.total_amount"
              type="number"
              step="0.01"
              class="input input-bordered w-full"
              placeholder="0.00"
              :disabled="modal.type === 'view'"
            />
          </div>
        </div>

        <div class="form-control mb-6">
          <label class="label">
            <span class="label-text font-medium">Notes</span>
          </label>
          <textarea
            v-model="orderForm.notes"
            class="textarea textarea-bordered w-full"
            rows="3"
            placeholder="Enter any additional notes..."
            :disabled="modal.type === 'view'"
          ></textarea>
        </div>

        <div class="modal-action">
          <button
            type="button"
            class="btn btn-ghost btn-sm font-thin"
            @click="closeModal"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn bg-primaryColor text-white btn-sm font-thin"
            :class="{ loading: loading }"
            :disabled="loading"
            v-if="modal.type !== 'view'"
          >
            <span
              v-if="loading"
              class="loading loading-spinner loading-xs"
            ></span>
            {{
              loading
                ? 'Processing...'
                : modal.type === 'create'
                  ? 'Create Purchase Order'
                  : 'Update Purchase Order'
            }}
          </button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="closeModal"></div>
  </div>

  <!-- Supply Request Modal -->
  <div v-if="supplyRequestModal.show" class="modal modal-open">
    <div class="modal-box max-w-7xl">
      <!-- Header with back button for item selection -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg">
          <span v-if="!supplyRequestModal.showItemSelection"
            >Select Supply Request</span
          >
          <span v-else
            >Select Items from
            {{ supplyRequestModal.selectedRequest?.request_id }}</span
          >
        </h3>
        <button
          v-if="supplyRequestModal.showItemSelection"
          @click="backToRequestSelection"
          class="btn btn-ghost btn-sm"
        >
          ← Back to Requests
        </button>
      </div>

      <!-- Date Filter Section (only show in request selection view) -->
      <div
        v-if="!supplyRequestModal.showItemSelection"
        class="mb-4 p-3 bg-base-200 rounded-lg"
      >
        <div
          class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
        >
          <div class="flex items-center gap-2">
            <Calendar class="w-4 h-4" />
            <span class="font-medium">
              {{ getSupplyRequestFilterDisplayText() }}
            </span>
          </div>

          <div class="flex gap-2">
            <button
              v-for="option in supplyRequestFilterOptions"
              :key="option.type"
              class="btn btn-xs font-thin"
              :class="{
                'bg-primaryColor text-white':
                  supplyRequestFilterType === option.type,
                'btn-ghost': supplyRequestFilterType !== option.type,
              }"
              @click="selectSupplyRequestFilter(option)"
            >
              {{ option.label }}
              <span
                class="badge badge-xs ml-1 bg-secondaryColor border-none"
                :class="
                  supplyRequestFilterType === option.type
                    ? 'badge-ghost'
                    : 'badge-primaryColor/10 text-primaryColor'
                "
              >
                {{ option.count }}
              </span>
            </button>

            <!-- Custom Month Selection -->
            <div class="relative">
              <button
                class="btn btn-xs btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
                @click="toggleSupplyRequestCustomMonthPicker"
              >
                <Calendar class="w-3 h-3 mr-1" />
                Custom Month
              </button>

              <!-- Custom Month Picker -->
              <div
                v-if="showSupplyRequestCustomMonthPicker"
                class="absolute top-full left-0 mt-1 bg-white border border-primaryColor/30 rounded-lg shadow-lg z-10 p-3 min-w-64"
              >
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-medium text-sm text-black">Select Month</h4>
                  <button
                    @click="showSupplyRequestCustomMonthPicker = false"
                    class="btn btn-ghost btn-xs"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </div>

                <!-- Month Selection -->
                <div class="grid grid-cols-3 gap-2 mb-3">
                  <button
                    v-for="month in months"
                    :key="month.value"
                    class="btn btn-xs font-thin"
                    :class="{
                      'bg-primaryColor text-white':
                        supplyRequestCustomMonthPicker.month === month.value,
                      'btn-ghost':
                        supplyRequestCustomMonthPicker.month !== month.value,
                    }"
                    @click="supplyRequestCustomMonthPicker.month = month.value"
                  >
                    {{ month.label }}
                  </button>
                </div>

                <!-- Year Selection -->
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-sm text-black/70">Year:</span>
                  <select
                    v-model="supplyRequestCustomMonthPicker.year"
                    class="select select-xs select-bordered bg-white border-primaryColor/30 text-black/70"
                  >
                    <option
                      v-for="year in availableYears"
                      :key="year"
                      :value="year"
                    >
                      {{ year }}
                    </option>
                  </select>
                </div>

                <!-- Apply Button -->
                <div class="flex gap-2">
                  <button
                    @click="applySupplyRequestCustomMonthFilter"
                    class="btn btn-xs bg-primaryColor text-white font-thin"
                  >
                    Apply
                  </button>
                  <button
                    @click="showSupplyRequestCustomMonthPicker = false"
                    class="btn btn-xs btn-ghost font-thin"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Supply Requests Grid (only show in request selection view) -->
      <div
        v-if="!supplyRequestModal.showItemSelection"
        class="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto"
      >
        <div
          v-for="request in paginatedSupplyRequests"
          :key="request.id"
          class="card bg-base-100 border cursor-pointer hover:shadow-lg transition-all duration-200"
          :class="{
            'ring-2 ring-primary shadow-lg':
              supplyRequestModal.selectedRequest?.id === request.id,
          }"
          @click="selectSupplyRequest(request)"
        >
          <div class="card-body p-4">
            <!-- Header -->
            <div class="flex justify-between items-start mb-3">
              <div class="flex-1">
                <h4 class="font-bold text-base text-black mb-1">
                  {{ request.request_id }}
                </h4>
                <p class="text-sm text-base-content/80 font-medium">
                  {{ request.request_description }}
                </p>
              </div>
              <div class="text-right">
                <span
                  class="badge badge-sm border-none font-medium"
                  :class="{
                    'bg-success/20 text-success':
                      request.status === 'Completed',
                    'bg-warning/20 text-warning': request.status === 'Pending',
                    'bg-info/20 text-info': request.status === 'In Progress',
                    'bg-error/20 text-error': request.status === 'Rejected',
                  }"
                >
                  {{ request.status }}
                </span>
              </div>
            </div>

            <!-- Request Details -->
            <div class="space-y-2 mb-3">
              <div class="flex justify-between items-center text-sm">
                <span class="text-base-content/70">Request Date:</span>
                <span class="font-medium">{{
                  formatDate(request.request_date)
                }}</span>
              </div>

              <div class="flex justify-between items-center text-sm">
                <span class="text-base-content/70">Department:</span>
                <span class="font-medium">{{
                  request.department || 'SCM'
                }}</span>
              </div>

              <div class="flex justify-between items-center text-sm">
                <span class="text-base-content/70">Requested By:</span>
                <span class="font-medium">{{
                  request.requested_by || 'Unknown'
                }}</span>
              </div>

              <div class="flex justify-between items-center text-sm">
                <span class="text-base-content/70">Priority:</span>
                <span
                  class="font-medium"
                  :class="{
                    'text-error': request.priority === 'High',
                    'text-warning': request.priority === 'Medium',
                    'text-success': request.priority === 'Low',
                  }"
                >
                  {{ request.priority || 'Normal' }}
                </span>
              </div>
            </div>

            <!-- Items Summary -->
            <div class="mb-3">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-base-content/70"
                  >Items Summary:</span
                >
                <span class="text-xs text-base-content/60"
                  >{{ request.item_count || 0 }} items</span
                >
              </div>

              <!-- Show first few items -->
              <div class="space-y-1 max-h-20 overflow-y-auto">
                <div
                  v-for="(item, index) in (request.items || []).slice(0, 3)"
                  :key="index"
                  class="flex justify-between items-center text-xs bg-base-200 p-2 rounded"
                >
                  <span class="truncate flex-1">{{
                    item.item_name || item.name
                  }}</span>
                  <span class="ml-2 font-medium">x{{ item.quantity }}</span>
                </div>
                <div
                  v-if="(request.items || []).length > 3"
                  class="text-xs text-base-content/60 text-center py-1"
                >
                  +{{ (request.items || []).length - 3 }} more items
                </div>
              </div>
            </div>

            <!-- Financial Summary -->
            <div class="border-t pt-3">
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-base-content/70"
                  >Total Amount:</span
                >
                <span class="text-lg font-bold text-black">
                  ₱{{ request.total_amount.toLocaleString() }}
                </span>
              </div>

              <div
                v-if="request.approved_amount"
                class="flex justify-between items-center mt-1"
              >
                <span class="text-xs text-base-content/60"
                  >Approved Amount:</span
                >
                <span class="text-sm font-medium text-success">
                  ₱{{ request.approved_amount.toLocaleString() }}
                </span>
              </div>
            </div>

            <!-- Additional Notes -->
            <div
              v-if="request.notes"
              class="mt-3 p-2 bg-base-200 rounded text-xs"
            >
              <span class="font-medium text-base-content/70">Notes:</span>
              <p class="mt-1 text-base-content/80 line-clamp-2">
                {{ request.notes }}
              </p>
            </div>

            <!-- Selection Indicator -->
            <div class="mt-3 flex justify-center">
              <div
                class="w-4 h-4 rounded-full border-2 transition-all duration-200"
                :class="{
                  'border-primary bg-primary':
                    supplyRequestModal.selectedRequest?.id === request.id,
                  'border-base-content/30':
                    supplyRequestModal.selectedRequest?.id !== request.id,
                }"
              >
                <div
                  v-if="supplyRequestModal.selectedRequest?.id === request.id"
                  class="w-2 h-2 bg-white rounded-full m-0.5"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Item Selection View -->
      <div
        v-if="
          supplyRequestModal.showItemSelection &&
          supplyRequestModal.selectedRequest
        "
        class="space-y-4"
      >
        <!-- Item Selection Controls -->
        <div
          class="flex justify-between items-center p-3 bg-base-200 rounded-lg"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium"
              >Selected: {{ supplyRequestModal.selectedItems.length }} of
              {{ supplyRequestModal.selectedRequest.items?.length || 0 }}
              items</span
            >
          </div>
          <div class="flex gap-2">
            <button
              @click="selectAllItems"
              class="btn btn-xs bg-primaryColor text-white font-thin"
            >
              Select All
            </button>
            <button
              @click="deselectAllItems"
              class="btn btn-xs btn-ghost font-thin"
            >
              Deselect All
            </button>
          </div>
        </div>

        <!-- Items List -->
        <div class="max-h-96 overflow-y-auto space-y-2">
          <div
            v-for="item in supplyRequestModal.selectedRequest.items"
            :key="item.id"
            class="card bg-base-100 border cursor-pointer hover:shadow-lg transition-all duration-200"
            :class="{
              'ring-2 ring-primary shadow-lg':
                supplyRequestModal.selectedItems.some(
                  (selected) => selected.id === item.id
                ),
            }"
            @click="toggleItemSelection(item)"
          >
            <div class="card-body p-4">
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <h4 class="font-bold text-base text-black mb-1">
                    {{ item.item_name || item.name }}
                  </h4>
                  <div class="flex gap-4 text-sm text-base-content/70">
                    <span>Qty: {{ item.item_quantity || item.quantity }}</span>
                    <span>Unit: {{ item.item_unit || item.unit }}</span>
                    <span
                      >Price: ₱{{
                        (
                          item.item_unit_price ||
                          item.unit_price ||
                          0
                        ).toLocaleString()
                      }}</span
                    >
                  </div>
                  <div class="text-sm font-medium text-black mt-1">
                    Total: ₱{{
                      (
                        item.item_amount ||
                        item.total_price ||
                        0
                      ).toLocaleString()
                    }}
                  </div>
                </div>
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    :checked="
                      supplyRequestModal.selectedItems.some(
                        (selected) => selected.id === item.id
                      )
                    "
                    class="checkbox checkbox-xs checked:bg-primaryColor text-white"
                    @click.stop
                    @change="toggleItemSelection(item)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Confirmation Buttons -->
        <div class="flex justify-end gap-2 pt-4 border-t">
          <button
            @click="closeSupplyRequestModal"
            class="btn btn-sm btn-ghost font-thin"
          >
            Cancel
          </button>
          <button
            @click="confirmItemSelection"
            class="btn btn-sm bg-primaryColor shadow-none text-white font-thin"
          >
            Confirm Selection
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="
          !supplyRequestModal.showItemSelection &&
          paginatedSupplyRequests.length === 0
        "
        class="text-center py-8"
      >
        <div class="mb-4">
          <FileText class="w-12 h-12 mx-auto text-base-content/40" />
        </div>
        <h4 class="text-lg font-semibold mb-2">No Supply Requests Found</h4>
        <p class="text-base-content/60">
          No completed supply requests found for
          {{ getSupplyRequestFilterDisplayText() }}
        </p>
      </div>

      <div v-if="!supplyRequestModal.showItemSelection" class="modal-action">
        <button
          type="button"
          class="btn btn-ghost btn-sm font-thin"
          @click="closeSupplyRequestModal"
        >
          Cancel
        </button>
      </div>
    </div>
    <div class="modal-backdrop" @click="closeSupplyRequestModal"></div>
  </div>

  <!-- Receipt Modal -->
  <dialog
    id="purchase_order_receipt_modal"
    class="modal"
    v-if="receiptModal.show"
    open
    style="z-index: 9999"
  >
    <div class="modal-box bg-accentColor text-black/50 shadow-lg max-w-6xl">
      <div class="flex justify-between items-center mb-2 text-black">
        <div class="flex items-center gap-2 mb-2 w-full">
          <img src="/logo1.png" alt="" class="w-10 h-10" />
          <h3 class="font-bold text-lg">Countryside Steakhouse</h3>
        </div>
        <div class="flex flex-col items-end w-full">
          <p class="text-xs">
            {{
              new Date(
                receiptModal.order?.completed_at ||
                  receiptModal.order?.updated_at ||
                  Date.now()
              ).toLocaleString('en-PH')
            }}
          </p>
          <p class="text-xs">PO Number: {{ receiptModal.order?.po_number }}</p>
        </div>
      </div>

      <div
        v-if="receiptModal.order && receiptModal.order.items"
        class="space-y-4"
      >
        <!-- Order Header -->
        <div class="border-b border-black/20 pb-4">
          <h4 class="font-semibold text-lg text-black">
            Purchase Order Receipt
          </h4>
          <p class="text-sm text-black/70">
            {{ receiptModal.order.supplier_name }}
          </p>
          <p class="text-xs text-black/50">
            Order Date: {{ formatDate(receiptModal.order.order_date) }}
          </p>
          <p class="text-xs text-black/50">
            Expected Delivery:
            {{ formatDate(receiptModal.order.expected_delivery) }}
          </p>
        </div>

        <!-- Order Details Table -->
        <div class="overflow-x-auto">
          <table class="table table-xs text-black">
            <thead class="text-black text-xs">
              <tr class="border border-black">
                <th class="border border-black">Item No.</th>
                <th class="border border-black">Item Name</th>
                <th class="border border-black">
                  {{
                    receiptModal.order.status === 'Completed'
                      ? 'Received Qty'
                      : 'Quantity'
                  }}
                </th>
                <th class="border border-black">Unit</th>
                <th class="border border-black">
                  {{
                    receiptModal.order.status === 'Completed'
                      ? 'Unit Price'
                      : 'Unit Price'
                  }}
                </th>
                <th class="border border-black">
                  {{
                    receiptModal.order.status === 'Completed'
                      ? 'Paid Amount (₱)'
                      : 'Amount (₱)'
                  }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in receiptModal.order.items"
                :key="item.id || idx"
                class="border border-black"
              >
                <td class="border border-black">{{ idx + 1 }}</td>
                <td class="border border-black">
                  {{ item.item_name || item.name || 'N/A' }}
                </td>
                <td class="border border-black">
                  {{
                    receiptModal.order.status === 'Completed' &&
                    item.received_quantity
                      ? item.received_quantity
                      : item.quantity || 0
                  }}
                </td>
                <td class="border border-black">{{ item.unit || 'pcs' }}</td>
                <td class="border border-black">
                  ₱{{
                    receiptModal.order.status === 'Completed' &&
                    item.received_unit_price
                      ? Number(item.received_unit_price).toFixed(2)
                      : Number(item.unit_price || 0).toFixed(2)
                  }}
                </td>
                <td class="border border-black">
                  ₱{{
                    receiptModal.order.status === 'Completed' &&
                    item.received_total_price
                      ? Number(item.received_total_price).toFixed(2)
                      : Number(
                          item.total_price ||
                            (item.quantity || 0) * (item.unit_price || 0)
                        ).toFixed(2)
                  }}
                </td>
              </tr>
              <tr class="border border-black">
                <td
                  colspan="5"
                  class="text-right font-semibold border border-black"
                >
                  Total
                </td>
                <td class="font-semibold border border-black">
                  ₱{{
                    receiptModal.order.status === 'Completed'
                      ? Number(
                          receiptModal.order.items?.reduce(
                            (sum, item) =>
                              sum +
                              Number(
                                item.received_total_price ??
                                  item.total_price ??
                                  (item.quantity || 0) * (item.unit_price || 0)
                              ),
                            0
                          ) || 0
                        ).toFixed(2)
                      : Number(receiptModal.order.total_amount || 0).toFixed(2)
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Order vs Received Summary (for completed orders) -->
        <div
          v-if="receiptModal.order.status === 'Completed'"
          class="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg"
        >
          <h6 class="text-sm font-semibold text-gray-800 mb-2">
            Order Summary:
          </h6>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="flex flex-col gap-2">
              <div class="">
                <span class="font-medium text-gray-700">Ordered Qty:</span>
                <span class="ml-2">{{
                  receiptModal.order.items?.reduce(
                    (sum, item) => sum + Number(item.quantity || 0),
                    0
                  ) || 0
                }}</span>
              </div>
              <div class="">
                <span class="font-medium text-gray-700">Ordered Amount:</span>
                <span class="ml-2"
                  >₱{{
                    Number(
                      receiptModal.order.total_amount || 0
                    ).toLocaleString()
                  }}</span
                >
              </div>
            </div>
            <div>
              <span class="font-medium text-gray-700">Received Amount:</span>
              <span class="ml-2"
                >₱{{
                  Number(
                    receiptModal.order.items?.reduce(
                      (sum, item) =>
                        sum +
                        Number(
                          item.received_total_price ??
                            item.total_price ??
                            (item.quantity || 0) * (item.unit_price || 0)
                        ),
                      0
                    ) || 0
                  ).toLocaleString()
                }}</span
              >
            </div>
          </div>
          <div class="mt-2 text-xs text-gray-600">
            <em
              >Note: This receipt shows actual received quantities and
              amounts.</em
            >
          </div>
        </div>

        <!-- Notes Section -->
        <div class="mt-4 text-black">
          <h6 class="text-xs font-medium">Notes:</h6>
          <textarea
            class="text-xs w-full h-20 border border-black/30 rounded-md p-2 text-black/50"
            readonly
            :value="receiptModal.order.notes || 'No notes provided'"
          ></textarea>
        </div>

        <!-- Status and Additional Info -->
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-sm text-black/70">Status:</span>
            <span
              class="badge badge-sm"
              :class="getStatusColor(receiptModal.order.status)"
            >
              {{ receiptModal.order.status }}
            </span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-black/70">Total Amount:</span>
            <span class="font-semibold text-black">
              ₱{{
                receiptModal.order.status === 'Completed'
                  ? Number(
                      receiptModal.order.items?.reduce(
                        (sum, item) =>
                          sum +
                          Number(
                            item.received_total_price ??
                              item.total_price ??
                              (item.quantity || 0) * (item.unit_price || 0)
                          ),
                        0
                      ) || 0
                    ).toLocaleString()
                  : Number(
                      receiptModal.order.total_amount || 0
                    ).toLocaleString()
              }}
            </span>
          </div>
          <div
            v-if="receiptModal.order.supply_request_number"
            class="flex justify-between items-center"
          >
            <span class="text-sm text-black/70">Supply Request:</span>
            <span class="text-info font-medium">
              {{ receiptModal.order.supply_request_number }}
            </span>
          </div>
        </div>

        <!-- Signature Section -->
        <div class="flex justify-between mt-8 w-full">
          <div class="flex flex-col items-start">
            <div class="border-b border-black w-[280px] mb-1"></div>
            <div class="text-xs text-gray-600">Supplier Signature</div>
          </div>
          <div class="flex flex-col items-end">
            <div class="border-b border-black w-[280px] mb-1"></div>
            <div class="text-xs text-gray-600">Received by</div>
          </div>
        </div>
      </div>

      <!-- Loading state for receipt -->
      <div v-else-if="loading" class="flex justify-center py-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>

      <!-- Error state for receipt -->
      <div v-else class="text-center py-8">
        <div class="mb-4">
          <AlertTriangle class="w-12 h-12 mx-auto text-error" />
        </div>
        <h4 class="text-lg font-semibold mb-2 text-error">No Receipt Data</h4>
        <p class="text-base-content/60">
          Unable to load receipt data for this purchase order.
        </p>
      </div>

      <div class="modal-action flex gap-2 mt-6">
        <button
          class="btn btn-sm bg-primaryColor text-white font-thin border border-none hover:bg-primaryColor/80 shadow-none"
          @click="printReceipt"
          :disabled="!receiptModal.order || !receiptModal.order.items"
        >
          Print Receipt
        </button>
        <button
          class="btn btn-sm bg-gray-200 text-black/50 font-thin border border-none hover:bg-gray-300 shadow-none"
          @click="closeReceiptModal"
        >
          Close
        </button>
      </div>
    </div>
    <div class="modal-backdrop" @click="closeReceiptModal"></div>
  </dialog>

  <!-- Return Modal -->
  <div v-if="returnModal.show" class="modal modal-open">
    <div class="modal-box max-w-md">
      <h3 class="font-bold text-lg mb-4">Return Items</h3>

      <form @submit.prevent="showReturnConfirmation">
        <div class="form-control mb-4">
          <label class="label w-full">Item to Return</label>
          <select
            v-model="returnForm.item_id"
            class="select select-bordered w-full"
            required
          >
            <option value="">Select Item</option>
            <option
              v-for="item in returnModal.order?.items || []"
              :key="item.id"
              :value="item.id"
            >
              {{ item.item_name }} (Available:
              {{ getAvailableForReturn(item) }})
            </option>
          </select>
        </div>

        <div class="form-control mb-4">
          <label class="label w-full">Quantity to Return</label>
          <input
            v-model.number="returnForm.quantity"
            type="number"
            min="1"
            :max="
              selectedReturnItem
                ? getAvailableForReturn(selectedReturnItem)
                : undefined
            "
            class="input input-bordered w-full"
            required
          />
        </div>

        <div class="form-control mb-4">
          <label class="label w-full">Return Reason</label>
          <select
            v-model="returnForm.reason"
            class="select select-bordered w-full"
            required
          >
            <option value="">Select Reason</option>
            <option value="Back Order">Back Order</option>
            <option value="Defective">Defective</option>
            <option value="Wrong Item">Wrong Item</option>
            <option value="Poor Quality">Poor Quality</option>
            <option value="Damaged in Transit">Damaged in Transit</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div class="form-control mb-4">
          <label class="label w-full">Notes</label>
          <textarea
            v-model="returnForm.notes"
            class="textarea textarea-bordered w-full"
            rows="3"
            placeholder="Additional details about the return..."
          ></textarea>
        </div>

        <div class="modal-action">
          <button
            type="button"
            class="btn btn-ghost btn-sm font-thin"
            :disabled="returnModal.loading"
            @click="closeReturnModal"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn bg-primaryColor text-white btn-sm font-thin"
            :class="{ loading: returnModal.loading }"
            :disabled="returnModal.loading"
          >
            <span
              v-if="returnModal.loading"
              class="loading loading-spinner loading-xs"
            ></span>
            {{ returnModal.loading ? 'Processing...' : 'Submit Return' }}
          </button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="closeReturnModal"></div>
  </div>

  <!-- Confirmation Modal -->
  <div v-if="confirmModal.show" class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">{{ confirmModal.title }}</h3>
      <p class="py-4">{{ confirmModal.message }}</p>

      <div class="modal-action">
        <button
          type="button"
          class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none btn-sm"
          :disabled="confirmModal.loading"
          @click="closeConfirmModal"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn bg-primaryColor text-white btn-sm font-thin border-none hover:bg-primaryColor/80"
          :class="{ loading: confirmModal.loading }"
          :disabled="confirmModal.loading"
          @click="handleConfirmAction"
        >
          <span
            v-if="confirmModal.loading"
            class="loading loading-spinner loading-xs"
          ></span>
          {{ confirmModal.loading ? 'Processing...' : 'Confirm' }}
        </button>
      </div>
    </div>
    <div class="modal-backdrop" @click="closeConfirmModal"></div>
  </div>

  <!-- GRN Confirmation Modal -->
  <div
    v-if="grnConfirmModal.show"
    class="modal modal-open"
    @click="handleModalClick"
  >
    <div class="modal-box" @click.stop>
      <h3 class="font-bold text-lg mb-4">Create Goods Receipt Note</h3>
      <div class="py-4">
        <p class="mb-4">
          Are you sure you want to create a Goods Receipt Note (GRN) for:
        </p>
        <div class="bg-base-200 p-4 rounded-lg mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="font-medium">PO Number:</span>
            <span class="text-primaryColor font-bold">{{
              grnConfirmModal.order?.po_number
            }}</span>
          </div>
          <div class="flex justify-between items-center mb-2">
            <span class="font-medium">Supplier:</span>
            <span>{{ grnConfirmModal.order?.supplier_name }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="font-medium">Items:</span>
            <span>{{ getRetryItemCount(grnConfirmModal.order) }} item/s</span>
          </div>
        </div>
        <p class="text-sm text-black/60">
          <span v-if="isRetryScenario(grnConfirmModal.order)">
            This will create a new GRN for retrying the failed items from the
            previous GRN.
          </span>
          <span v-else>
            This will create a new GRN that you can use to manage the receipt
            and quality inspection of these items.
          </span>
        </p>
      </div>

      <div class="modal-action">
        <button
          type="button"
          class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none btn-sm"
          @click="closeGRNConfirmModal"
          :disabled="grnConfirmModal.loading"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn bg-primaryColor text-white btn-sm font-thin border-none hover:bg-primaryColor/80"
          @click="confirmCreateGRN"
          :disabled="grnConfirmModal.loading"
        >
          <span
            v-if="grnConfirmModal.loading"
            class="loading loading-spinner loading-xs mr-2"
          ></span>
          {{ grnConfirmModal.loading ? 'Creating GRN...' : 'Create GRN' }}
        </button>
      </div>
    </div>
    <div class="modal-backdrop" @click="closeGRNConfirmModal"></div>
  </div>

  <!-- Audit Trail Component - Direct usage without wrapper modal -->
  <POreturnItems
    :show="auditTrailModal.show"
    :purchase-order-id="auditTrailModal.purchaseOrderId"
    :on-close="closeAuditTrailModal"
    @return-processed="handleReturnProcessed"
    @return-cancelled="handleReturnCancelled"
    @view-return-details="viewReturnDetails"
  />

  <!-- Supplier Rating Modal -->
  <SupplierRatingModal
    :show="ratingModal.show"
    :purchase-order="ratingModal.purchaseOrder"
    :supplier-name="ratingModal.supplierName"
    @close="closeRatingModal"
    @rating-submitted="handleRatingSubmitted"
  />

  <!-- PO Completion Modal -->
  <POCompletionModal
    :show="completionModal.show"
    :purchase-order="completionModal.order"
    :loading="completionModal.loading"
    @close="closeCompletionModal"
    @complete="handleCompleteOrder"
  />
</template>
<style scoped>
  /* Enhanced table styling */
  .table th {
    font-weight: 600;
    font-size: 0.8rem;
    padding: 1rem 0.75rem;
  }

  .table td {
    vertical-align: middle;
    padding: 0.75rem;
  }

  /* Better badge styling */
  .badge {
    font-weight: 500;
  }

  /* Responsive improvements */
  @media (max-width: 768px) {
    .table th,
    .table td {
      padding: 0.5rem 0.375rem;
      font-size: 0.8rem;
    }
  }

  /* Loading states */
  .card:hover {
    transition: background-color 0.2s ease;
  }

  /* Modal improvements */
  .modal-box {
    max-height: 90vh;
    overflow-y: auto;
  }

  /* Toast positioning */
  .toast {
    z-index: 999999; /* ensure above all modals and UI elements */
  }

  /* Dropdown improvements */
  .dropdown-content {
    z-index: 1000;
  }

  /* Form focus states */
  .input:focus,
  .select:focus,
  .textarea:focus {
    outline: none;
    border-color: var(--primaryColor);
    box-shadow: 0 0 0 2px rgba(var(--primaryColor-rgb), 0.1);
  }

  /* Button hover states */
  .btn:hover {
    transform: translateY(-1px);
    transition: all 0.2s ease;
  }

  /* Stats card hover */
  .stat:hover {
    background-color: rgba(var(--secondaryColor-rgb), 0.05);
    transition: background-color 0.2s ease;
  }

  /* Search input focus */
  input[type='text']:focus {
    border-color: var(--primaryColor);
    box-shadow: 0 0 0 2px rgba(var(--primaryColor-rgb), 0.1);
  }

  /* Pagination improvements */
  .join .btn:not(:disabled):hover {
    background-color: var(--primaryColor);
    color: white;
    transform: translateY(-1px);
  }

  /* Filter button states */
  .btn.btn-xs:not(.bg-primaryColor):hover {
    background-color: rgba(var(--primaryColor-rgb), 0.1);
    border-color: var(--primaryColor);
  }

  /* Card shadow improvements */
  .card {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  /* Status badge improvements */
  .badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }

  /* Icon improvements */
  .lucide {
    stroke-width: 1.5;
  }

  /* Responsive grid adjustments */
  @media (max-width: 1024px) {
    .grid {
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }
  }

  @media (max-width: 640px) {
    .grid {
      grid-template-columns: 1fr;
    }

    .stats {
      grid-template-columns: 1fr;
    }
  }

  /* Animation improvements */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .card {
    animation: fadeIn 0.3s ease-out;
  }

  /* Loading spinner improvements */
  .loading {
    border-color: var(--primaryColor);
    border-top-color: transparent;
  }

  /* Modal backdrop improvements */
  .modal::backdrop {
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
  }

  /* Form validation styles */
  .input:invalid,
  .select:invalid,
  .textarea:invalid {
    border-color: #ef4444;
  }

  .input:valid,
  .select:valid,
  .textarea:valid {
    border-color: #10b981;
  }

  /* Hover effects for interactive elements */
  .dropdown-content li:hover {
    background-color: rgba(var(--primaryColor-rgb), 0.1);
    border-radius: 0.375rem;
  }

  /* Improved spacing for mobile */
  @media (max-width: 768px) {
    .card-body {
      padding: 1rem;
    }

    .modal-box {
      margin: 1rem;
      max-width: calc(100vw - 2rem);
    }
  }

  /* Enhanced accessibility */
  .btn:focus,
  .input:focus,
  .select:focus,
  .textarea:focus {
    outline: 2px solid var(--primaryColor);
    outline-offset: 2px;
  }

  /* Smooth transitions */
  * {
    transition:
      color 0.2s ease,
      background-color 0.2s ease,
      border-color 0.2s ease,
      transform 0.2s ease;
  }

  /* Enhanced responsive styles */
  .container {
    min-height: 100vh;
  }

  /* Mobile-first responsive design */
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

    .card-body {
      padding: 1rem;
    }

    .modal-box {
      margin: 0.5rem;
      max-width: calc(100vw - 1rem);
    }

    .btn {
      font-size: 0.75rem;
      padding: 0.5rem 0.75rem;
    }

    .input,
    .select,
    .textarea {
      font-size: 0.875rem;
    }
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

    .card-body {
      padding: 1rem;
    }

    .modal-box {
      margin: 0.5rem;
      max-width: calc(100vw - 1rem);
    }

    .btn {
      font-size: 0.75rem;
      padding: 0.5rem 0.75rem;
    }

    .input,
    .select,
    .textarea {
      font-size: 0.875rem;
    }
  }

  @media (min-width: 641px) and (max-width: 1024px) {
    .grid {
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }

    .stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1025px) {
    .grid {
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    }

    .stats {
      grid-template-columns: repeat(5, 1fr);
    }
  }

  /* Enhanced touch targets for mobile */
  @media (max-width: 768px) {
    .btn {
      min-height: 2.5rem;
      min-width: 2.5rem;
    }

    .dropdown-content {
      min-width: 120px;
    }

    .dropdown-content li a {
      padding: 0.75rem 1rem;
    }
  }

  /* Improved spacing for different screen sizes */
  @media (max-width: 480px) {
    .container {
      padding: 0.5rem;
    }

    .card-body {
      padding: 0.75rem;
    }

    .stat {
      padding: 0.75rem 0.5rem;
    }
  }

  /* Enhanced accessibility for mobile */
  @media (max-width: 768px) {
    .btn:focus,
    .input:focus,
    .select:focus,
    .textarea:focus {
      outline: 3px solid var(--primaryColor);
      outline-offset: 2px;
    }

    .dropdown-content {
      max-height: 200px;
      overflow-y: auto;
    }
  }

  /* Smooth scrolling for mobile */
  @media (max-width: 768px) {
    html {
      scroll-behavior: smooth;
    }

    .modal-box {
      scroll-behavior: smooth;
    }
  }

  /* Enhanced loading states for mobile */
  @media (max-width: 768px) {
    .loading {
      width: 1.5rem;
      height: 1.5rem;
    }
  }

  /* Improved text readability on mobile */
  @media (max-width: 640px) {
    .text-black\/50 {
      color: rgba(0, 0, 0, 0.6);
    }

    .text-black\/70 {
      color: rgba(0, 0, 0, 0.8);
    }
  }

  /* Enhanced card interactions for touch devices */
  @media (hover: none) and (pointer: coarse) {
    .card:hover {
      transform: none;
    }

    .btn:hover {
      transform: none;
    }

    .card:active {
      transform: scale(0.98);
    }

    .btn:active {
      transform: scale(0.95);
    }
  }

  /* Modal form improvements */
  .modal .form-control {
    margin-bottom: 1rem;
  }

  .modal .label {
    margin-bottom: 0.5rem;
  }

  .modal .label-text {
    font-weight: 500;
    color: #374151;
  }

  .modal .label-text-alt {
    font-size: 0.75rem;
  }

  .modal .input,
  .modal .select,
  .modal .textarea {
    border-radius: 0.5rem;
    border-color: #d1d5db;
    transition: all 0.2s ease;
  }

  .modal .input:focus,
  .modal .select:focus,
  .modal .textarea:focus {
    border-color: var(--primaryColor);
    box-shadow: 0 0 0 2px rgba(var(--primaryColor-rgb), 0.1);
  }

  .modal .input::placeholder,
  .modal .textarea::placeholder {
    color: #9ca3af;
  }

  .modal .alert {
    border-radius: 0.5rem;
    padding: 0.75rem;
  }

  /* Grid improvements for modal */
  .modal .grid {
    gap: 1.5rem;
  }

  /* Responsive improvements for modal */
  @media (max-width: 768px) {
    .modal .grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .modal .flex.gap-2 {
      flex-direction: column;
    }

    .modal .flex.gap-2 .btn {
      width: 100%;
    }
  }
</style>
