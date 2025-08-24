<script setup>
  import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
  import { useSupplyRequestStore } from '../../stores/supplyRequestStore.js';
  import { useBudgetReleaseStore } from '../../stores/budgetReleaseStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import cashRequestReceiptModal from '../../components/scm/cashRequestReceiptModal.vue';
  import PikaDay from 'pikaday';
  import 'pikaday/css/pikaday.css';
  import {
    ReceiptText,
    CheckCircle,
    XCircle,
    Clock,
    RefreshCcw,
    Plus,
    EllipsisVertical,
    X,
    Send,
    Calendar,
    Filter,
    Search,
    Download,
    TrendingUp,
    TrendingDown,
    DollarSign,
    FileCheck,
    Info,
    PhilippinePeso,
    FileText,
  } from 'lucide-vue-next';

  // Stores
  const supplyRequestStore = useSupplyRequestStore();
  const budgetReleaseStore = useBudgetReleaseStore();
  const authStore = useAuthStore();

  // Local state
  const loading = ref(false);
  const currentPage = ref(1);
  const requestsPerPage = ref(10);
  const rowRequestModalPerPage = ref(5);
  const requestModalCurrentPage = ref(1);
  const requestHistoryCurrentPage = ref(1);
  const requestHistoryPerPage = ref(10);

  const showReceipt = ref(false);
  const receiptData = ref(null);

  function closeReceipt() {
    showReceipt.value = false;
    receiptData.value = null;
  }

  // Form data for request items
  const rowRequest = ref([
    {
      id: 1,
      item_name: '',
      item_quantity: 0,
      item_unit: '',
      item_type: '',
      item_unitPrice: 0,
      item_amount: 0,
    },
  ]);

  const addRowRequest = () => {
    rowRequest.value.push({
      id: rowRequest.value.length + 1,
      item_name: '',
      item_quantity: 0,
      item_unit: '',
      item_type: '',
      item_unitPrice: 0,
      item_amount: 0,
    });
  };

  const removeRowRequest = (id) => {
    if (rowRequest.value.length > 1) {
      rowRequest.value = rowRequest.value.filter((row) => row.id !== id);
    }
  };

  // Modal state management
  const modal = ref({
    type: null,
    show: false,
    request: null,
    data: {
      request_type: '',
      request_description: '',
      request_date: '',
      remarks: '',
    },
  });

  // Enhanced form data for new/edit request
  const requestForm = ref({
    request_id: null,
    request_type: '',
    request_description: '',
    request_date: new Date().toISOString().split('T')[0],
    priority: 'Normal',
    department: 'Finance',
    requested_by: 'Current User',
    items: [],
  });

  // Request history filter
  const requestHistoryFilter = ref({
    status: '',
    searchQuery: '',
    sortBy: 'request_date',
    sortOrder: 'desc',
  });

  // History-related reactive variables
  const historyFilterType = ref('today'); // 'today', 'week', 'month', 'custom'
  const showCustomMonthPicker = ref(false);
  const customMonthPicker = ref({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // Enhanced request types with categories
  const requestCategories = [
    {
      category: 'Equipment',
      types: [
        'Kitchen Equipment',
        'Office Equipment',
        'Service Equipment',
        'Cleaning Equipment',
      ],
    },
    {
      category: 'Materials',
      types: [
        'Raw Materials',
        'Ingredients',
        'Office Supplies',
        'Cleaning Supplies',
      ],
    },
    {
      category: 'Services',
      types: [
        'Maintenance Service',
        'Cleaning Service',
        'IT Service',
        'Consulting Service',
      ],
    },
    {
      category: 'Beverages',
      types: [
        'Water',
        'Soft Drinks',
        'Juices',
        'Alcoholic Beverages',
        'Coffee & Tea',
        'Other',
      ],
    },
  ];

  const priorities = ['Low', 'Normal', 'High', 'Urgent'];
  const departments = ['SCM', 'Finance', 'HR', 'Production', 'Admin', 'Branch'];
  const branches = ['Branch 1', 'Branch 2', 'Branch 3', 'Branch 4', 'Branch 5'];

  // Toast state
  const toast = ref({ show: false, type: '', message: '' });

  // Show toast helper
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };

  // Philippine Time helper functions
  const getPhilippineTime = () => {
    return new Date(
      new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
    );
  };

  const getPhilippineDateString = (date = null) => {
    const targetDate = date || getPhilippineTime();
    return targetDate.toISOString().split('T')[0];
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila',
    });
  };

  // Request List Date Filter
  const requestListFilter = ref({
    selectedDate: getPhilippineDateString(),
    showDatePicker: false,
  });

  // Quick date filter buttons
  const getQuickDateOptions = () => {
    const today = getPhilippineTime();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Use toLocaleDateString with 'en-CA' and Asia/Manila to get YYYY-MM-DD
    const toYMD = (date) =>
      date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

    return [
      { label: 'Yesterday', date: toYMD(yesterday), count: 0 },
      { label: 'Today', date: toYMD(today), count: 0 },
      { label: 'Tomorrow', date: toYMD(tomorrow), count: 0 },
    ];
  };

  const quickDateOptions = ref(getQuickDateOptions());

  // Computed properties using store data
  const allRequests = computed(() => supplyRequestStore.requests);
  const pendingReceipts = computed(() => budgetReleaseStore.pendingReceipts);
  const requestStats = computed(() => supplyRequestStore.stats);

  // Add missing computed properties
  const hasRequests = computed(() => allRequests.value.length > 0);
  const hasApprovedRequests = computed(() =>
    allRequests.value.some((r) => r.request_status === 'Approved')
  );
  const hasPendingRequests = computed(() =>
    allRequests.value.some((r) => r.request_status === 'Pending')
  );
  const hasRejectedRequests = computed(() =>
    allRequests.value.some((r) => r.request_status === 'Rejected')
  );

  // Filter for pending requests only (Finance should see only pending requests)
  const pendingRequestsOnly = computed(() => {
    return allRequests.value.filter(
      (request) => request.request_status === 'Pending'
    );
  });

  // Update quick date options with counts (for pending requests)
  const updateQuickDateCounts = () => {
    quickDateOptions.value.forEach((option) => {
      option.count = pendingRequestsOnly.value.filter((request) => {
        // Convert UTC to Asia/Manila and get YYYY-MM-DD
        const manilaDate = new Date(
          new Date(request.request_date).toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
          })
        );
        const normalized = manilaDate.toLocaleDateString('en-CA', {
          timeZone: 'Asia/Manila',
        });
        return normalized === option.date;
      }).length;
    });
  };

  // Enhanced computed properties for filtered requests
  const filteredRequestsByDate = computed(() => {
    return pendingRequestsOnly.value.filter((request) => {
      const manilaDate = new Date(
        new Date(request.request_date).toLocaleString('en-US', {
          timeZone: 'Asia/Manila',
        })
      );
      const normalized = manilaDate.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Manila',
      });
      return normalized === requestListFilter.value.selectedDate;
    });
  });

  const sortedRequests = computed(() => {
    return [...filteredRequestsByDate.value].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  });

  const paginatedRequests = computed(() => {
    const start = (currentPage.value - 1) * requestsPerPage.value;
    return sortedRequests.value.slice(start, start + requestsPerPage.value);
  });

  const totalPages = computed(() => {
    return Math.ceil(sortedRequests.value.length / requestsPerPage.value);
  });

  // Request history computed properties (approved/rejected/sent back)
  const requestHistory = computed(() => {
    return allRequests.value.filter((request) =>
      ['Approved', 'Rejected', 'Sent Back', 'Budget Released'].includes(
        request.request_status
      )
    );
  });

  // Add missing functions for Finance operations
  const handleApproveRequest = async (requestId) => {
    loading.value = true;
    try {
      const request = allRequests.value.find((r) => r.request_id === requestId);
      if (!request) {
        showToast('error', 'Request not found');
        return;
      }

      await supplyRequestStore.approveRequest(
        request.id,
        authStore.user?.name || 'Finance User',
        modal.value.data.remarks || 'Request approved by Finance'
      );

      closeModal();
      showToast('success', `Request #${requestId} approved successfully`);

      // Refresh data
      await fetchRequests();
    } catch (err) {
      showToast('error', err.message || 'Failed to approve request');
    } finally {
      loading.value = false;
    }
  };

  const handleRejectRequest = async (requestId) => {
    loading.value = true;
    try {
      if (!modal.value.data.remarks?.trim()) {
        showToast('error', 'Rejection remarks are required');
        return;
      }

      const request = allRequests.value.find((r) => r.request_id === requestId);
      if (!request) {
        showToast('error', 'Request not found');
        return;
      }

      await supplyRequestStore.rejectRequest(
        request.id,
        authStore.user?.name || 'Finance User',
        modal.value.data.remarks
      );

      closeModal();
      showToast('success', `Request #${requestId} rejected successfully`);

      // Refresh data
      await fetchRequests();
    } catch (err) {
      showToast('error', err.message || 'Failed to reject request');
    } finally {
      loading.value = false;
    }
  };

  const handleSendBackRequest = async (requestId) => {
    loading.value = true;
    try {
      if (!modal.value.data.remarks?.trim()) {
        showToast('error', 'Revision remarks are required');
        return;
      }

      const request = allRequests.value.find((r) => r.request_id === requestId);
      if (!request) {
        showToast('error', 'Request not found');
        return;
      }

      await supplyRequestStore.sendBackRequest(
        request.id,
        authStore.user?.name || 'Finance User',
        modal.value.data.remarks
      );

      closeModal();
      showToast('success', `Request #${requestId} sent back for revision`);

      // Refresh data
      await fetchRequests();
    } catch (err) {
      showToast('error', err.message || 'Failed to send back request');
    } finally {
      loading.value = false;
    }
  };

  // Enhanced confirmation modal state
  const confirmModal = ref({
    show: false,
    type: '',
    title: '',
    message: '',
    confirmText: '',
    confirmClass: '',
    data: null,
    onConfirm: null,
  });

  // Enhanced confirmation modal functions
  const openConfirmModal = (type, data = null, customConfig = {}) => {
    const configs = {
      approve: {
        title: 'Approve Request',
        message: `Are you sure you want to approve request #${data?.request_id}?`,
        confirmText: 'Approve',
        confirmClass: 'btn-success',
        onConfirm: () => handleApproveRequest(data.request_id),
      },
      reject: {
        title: 'Reject Request',
        message: `Are you sure you want to reject request #${data?.request_id}?`,
        confirmText: 'Reject',
        confirmClass: 'btn-error',
        onConfirm: () => handleRejectRequest(data.request_id),
      },
      sendBack: {
        title: 'Send Back for Revision',
        message: `Are you sure you want to send request #${data?.request_id} back to SCM?`,
        confirmText: 'Send Back',
        confirmClass: 'btn-info',
        onConfirm: () => handleSendBackRequest(data.request_id),
      },
      edit: {
        title: 'Update Request',
        message: `Are you sure you want to update request #${data?.request_id}?`,
        confirmText: 'Update',
        confirmClass: 'btn-primary bg-primaryColor',
        onConfirm: () => handleUpdateRequest(data.request_id),
      },
    };

    const config = { ...configs[type], ...customConfig };

    confirmModal.value = {
      show: true,
      type,
      title: config.title,
      message: config.message,
      confirmText: config.confirmText,
      confirmClass: config.confirmClass,
      data,
      onConfirm: config.onConfirm,
    };

    document.getElementById('confirmation_modal').showModal();
  };

  const closeConfirmModal = () => {
    document.getElementById('confirmation_modal')?.close();
    confirmModal.value = {
      show: false,
      type: '',
      title: '',
      message: '',
      confirmText: '',
      confirmClass: '',
      data: null,
      onConfirm: null,
    };
  };

  const handleConfirmAction = async () => {
    if (confirmModal.value.onConfirm) {
      try {
        await confirmModal.value.onConfirm();
        closeConfirmModal();
      } catch (error) {
        console.error('Confirmation action failed:', error);
      }
    }
  };

  // Modal methods
  const openModal = async (type, request = null) => {
    modal.value = {
      type,
      show: true,
      request,
      data: request
        ? {
            request_type: request.request_type,
            request_description: request.request_description,
            request_date: request.request_date,
            remarks: '',
          }
        : {
            request_type: '',
            request_description: '',
            request_date: '',
            remarks: '',
          },
    };

    // If viewing or editing, fetch the full request details including items
    if (request && (type === 'edit' || type === 'viewRequest')) {
      try {
        loading.value = true;
        // Fetch full request details with items
        const fullRequest = await supplyRequestStore.fetchRequestByRequestId(
          request.request_id
        );

        // Initialize form with full data including items
        initializeRequestForm(fullRequest);
        modal.value.request = fullRequest;
      } catch (error) {
        console.error('Error fetching request details:', error);
        showToast('error', 'Failed to load request details');
        // Fallback to basic initialization
        initializeRequestForm(request);
      } finally {
        loading.value = false;
      }
    } else {
      initializeRequestForm(request);
    }

    if (type === 'edit') {
      document.getElementById('request_form_modal').showModal();
    } else {
      document.getElementById('universal_modal').showModal();
    }
  };

  const closeModal = () => {
    document.getElementById('request_form_modal')?.close();
    document.getElementById('universal_modal')?.close();
    document.getElementById('confirmation_modal')?.close();
    modal.value = {
      type: null,
      show: false,
      request: null,
      data: {
        request_type: '',
        request_description: '',
        request_date: '',
        remarks: '',
      },
    };
  };

  // Initialize request form
  const initializeRequestForm = (request = null) => {
    if (request) {
      // Editing existing request
      requestForm.value = {
        request_id: request.request_id,
        request_type: request.request_type || '',
        request_description: request.request_description || '',
        request_date:
          request.request_date || new Date().toISOString().split('T')[0],
        priority: request.priority || 'Normal',
        department: request.department || 'Finance',
        requested_by:
          request.requested_by || authStore.user?.name || 'Current User',
        items: request.items || [],
      };

      // Update rowRequest with existing items
      if (
        request.items &&
        Array.isArray(request.items) &&
        request.items.length > 0
      ) {
        rowRequest.value = request.items.map((item, index) => ({
          id: index + 1,
          item_name: item.item_name || '',
          item_quantity: item.item_quantity || 0,
          item_unit: item.item_unit || '',
          item_type: item.item_type || '',
          item_unitPrice: item.item_unit_price || item.item_unitPrice || 0,
          item_amount:
            (item.item_quantity || 0) *
            (item.item_unit_price || item.item_unitPrice || 0),
        }));
      } else {
        resetItemRows();
      }
    } else {
      // Creating new request
      requestForm.value = {
        request_id: null,
        request_type: '',
        request_description: '',
        request_date: new Date().toISOString().split('T')[0],
        priority: 'Normal',
        department: 'Finance',
        requested_by: authStore.user?.name || 'Current User',
        items: [],
      };
      resetItemRows();
    }
  };

  const resetItemRows = () => {
    rowRequest.value = [
      {
        id: 1,
        item_name: '',
        item_quantity: 0,
        item_unit: '',
        item_type: '',
        item_unitPrice: 0,
        item_amount: 0,
      },
    ];
  };

  // Auto-calculate item amounts when quantity or price changes
  const updateItemAmount = (item) => {
    item.item_amount = (item.item_quantity || 0) * (item.item_unitPrice || 0);
  };

  // Data fetching functions using stores (Finance specific)
  const fetchRequests = async () => {
    loading.value = true;
    try {
      // Fetch all requests (Finance needs to see all departments' requests)
      await supplyRequestStore.fetchRequests();
      await supplyRequestStore.fetchStats();
      updateQuickDateCounts();
      updateHistoryFilterCounts();
    } catch (err) {
      showToast('error', err.message || 'Failed to fetch requests');
    } finally {
      loading.value = false;
    }
  };

  const fetchPendingReceipts = async () => {
    try {
      await budgetReleaseStore.fetchPendingReceipts();
    } catch (err) {
      console.error('Error fetching pending receipts:', err);
    }
  };

  // Computed properties for pagination
  const paginatedRequestModal = computed(() => {
    const start =
      (requestModalCurrentPage.value - 1) * rowRequestModalPerPage.value;
    return rowRequest.value.slice(start, start + rowRequestModalPerPage.value);
  });

  const totalPagesRequestModal = computed(() => {
    return Math.ceil(rowRequest.value.length / rowRequestModalPerPage.value);
  });

  const totalAmount = computed(() => {
    const total = rowRequest.value.reduce((acc, row) => {
      const price = Number(row.item_unitPrice) || 0;
      const quantity = Number(row.item_quantity) || 0;
      return acc + price * quantity;
    }, 0);
    return total.toFixed(2);
  });

  // Request history computed properties
  const filteredRequestHistoryByDate = computed(() => {
    let filtered = [...requestHistory.value];

    // Apply date filtering based on filter type
    if (historyFilterType.value) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (historyFilterType.value) {
        case 'today':
          filtered = filtered.filter((request) => {
            const requestDate = new Date(request.request_date);
            requestDate.setHours(0, 0, 0, 0);
            return requestDate.getTime() === today.getTime();
          });
          break;

        case 'week':
          const startOfWeek = getStartOfWeek(today);
          const endOfWeek = new Date(today);
          endOfWeek.setHours(23, 59, 59, 999);

          filtered = filtered.filter((request) => {
            const requestDate = new Date(request.request_date);
            return isDateInRange(requestDate, startOfWeek, endOfWeek);
          });
          break;

        case 'month':
          const startOfMonth = getStartOfMonth(today);
          const endOfMonth = new Date(today);
          endOfMonth.setHours(23, 59, 59, 999);

          filtered = filtered.filter((request) => {
            const requestDate = new Date(request.request_date);
            return isDateInRange(requestDate, startOfMonth, endOfMonth);
          });
          break;

        case 'custom':
          if (customMonthPicker.value.month && customMonthPicker.value.year) {
            const startOfCustomMonth = new Date(
              customMonthPicker.value.year,
              customMonthPicker.value.month - 1,
              1
            );
            const endOfCustomMonth = getEndOfMonth(startOfCustomMonth);
            endOfCustomMonth.setHours(23, 59, 59, 999);

            filtered = filtered.filter((request) => {
              const requestDate = new Date(request.request_date);
              return isDateInRange(
                requestDate,
                startOfCustomMonth,
                endOfCustomMonth
              );
            });
          }
          break;
      }
    }

    return filtered;
  });

  const filteredRequestHistory = computed(() => {
    let filtered = [...filteredRequestHistoryByDate.value];

    if (requestHistoryFilter.value.status) {
      filtered = filtered.filter(
        (request) =>
          request.request_status === requestHistoryFilter.value.status
      );
    }

    if (requestHistoryFilter.value.searchQuery) {
      const query = requestHistoryFilter.value.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (request) =>
          request.request_description.toLowerCase().includes(query) ||
          request.request_id.toString().includes(query)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      const sortBy = requestHistoryFilter.value.sortBy;
      const order = requestHistoryFilter.value.sortOrder === 'asc' ? 1 : -1;

      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'request_date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (sortBy === 'total_amount' || sortBy === 'request_id') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (aVal < bVal) return -1 * order;
      if (aVal > bVal) return 1 * order;
      return 0;
    });

    return filtered;
  });

  const paginatedRequestHistory = computed(() => {
    const start =
      (requestHistoryCurrentPage.value - 1) * requestHistoryPerPage.value;
    return filteredRequestHistory.value.slice(
      start,
      start + requestHistoryPerPage.value
    );
  });

  const totalPagesRequestHistory = computed(() => {
    return Math.ceil(
      filteredRequestHistory.value.length / requestHistoryPerPage.value
    );
  });

  // Stats computed properties
  const requestHistoryStats = computed(() => {
    const approved = filteredRequestHistory.value.filter(
      (r) => r.request_status === 'Approved'
    );
    const rejected = filteredRequestHistory.value.filter(
      (r) => r.request_status === 'Rejected'
    );
    const sentBack = filteredRequestHistory.value.filter(
      (r) => r.request_status === 'Sent Back'
    );
    const totalAmount = approved.reduce(
      (sum, r) => sum + (parseFloat(r.total_amount) || 0),
      0
    );

    return {
      total: filteredRequestHistory.value.length,
      approved: approved.length,
      rejected: rejected.length,
      sentBack: sentBack.length,
      totalAmount,
    };
  });

  // Date filter methods
  const selectQuickDate = (dateOption) => {
    requestListFilter.value.selectedDate = dateOption.date;
    currentPage.value = 1;
    requestListFilter.value.showDatePicker = false;
  };

  const selectCustomDate = (event) => {
    requestListFilter.value.selectedDate = event.target.value;
    currentPage.value = 1;
    requestListFilter.value.showDatePicker = false;
  };

  const toggleDatePicker = () => {
    requestListFilter.value.showDatePicker =
      !requestListFilter.value.showDatePicker;
  };

  const goToPreviousDay = () => {
    const currentDate = new Date(
      requestListFilter.value.selectedDate + 'T00:00:00'
    );
    const previousDay = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    requestListFilter.value.selectedDate = previousDay
      .toISOString()
      .split('T')[0];
    currentPage.value = 1;
  };

  const goToNextDay = () => {
    const currentDate = new Date(
      requestListFilter.value.selectedDate + 'T00:00:00'
    );
    const nextDay = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    requestListFilter.value.selectedDate = nextDay.toISOString().split('T')[0];
    currentPage.value = 1;
  };

  const goToToday = () => {
    requestListFilter.value.selectedDate = getPhilippineDateString();
    currentPage.value = 1;
  };

  // Action methods for Finance
  const viewRequest = (request) => openModal('viewRequest', request);
  const editRequest = (request) => openModal('edit', request);
  const approveRequest = (request) => openModal('approve', request);
  const rejectRequest = (request) => openModal('reject', request);
  const sendBackRequest = (request) => openModal('sendBack', request);

  // Helper functions for date calculations
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
    return new Date(d.setDate(diff));
  };

  const getStartOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getEndOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  const isDateInRange = (date, startDate, endDate) => {
    const orderDate = new Date(date);
    return orderDate >= startDate && orderDate <= endDate;
  };

  // Updated history filter options
  const getHistoryFilterOptions = () => {
    return [
      { type: 'today', label: 'Today', count: 0 },
      { type: 'week', label: 'This Week', count: 0 },
      { type: 'month', label: 'This Month', count: 0 },
    ];
  };

  const historyFilterOptions = ref(getHistoryFilterOptions());

  // Filter selection methods
  const selectHistoryFilter = (option) => {
    historyFilterType.value = option.type;
    requestHistoryCurrentPage.value = 1;
    showCustomMonthPicker.value = false;
  };

  const toggleCustomMonthPicker = () => {
    showCustomMonthPicker.value = !showCustomMonthPicker.value;
    if (showCustomMonthPicker.value) {
      historyFilterType.value = 'custom';
    }
  };

  const applyCustomMonthFilter = () => {
    historyFilterType.value = 'custom';
    requestHistoryCurrentPage.value = 1;
    showCustomMonthPicker.value = false;
  };

  // Display text for current filter
  const getHistoryFilterDisplayText = () => {
    switch (historyFilterType.value) {
      case 'today':
        return `Today (${formatDate(new Date())})`;
      case 'week':
        const startOfWeek = getStartOfWeek(new Date());
        const endOfWeek = new Date();
        return `This Week (${formatDate(startOfWeek)} - ${formatDate(endOfWeek)})`;
      case 'month':
        const startOfMonth = getStartOfMonth(new Date());
        const endOfMonth = new Date();
        return `This Month (${formatDate(startOfMonth)} - ${formatDate(endOfMonth)})`;
      case 'custom':
        const monthName = months.find(
          (m) => m.value === customMonthPicker.value.month
        )?.label;
        return `${monthName} ${customMonthPicker.value.year}`;
      default:
        return 'All History';
    }
  };

  // Update filter option counts
  const updateHistoryFilterCounts = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    historyFilterOptions.value.forEach((option) => {
      let count = 0;

      switch (option.type) {
        case 'today':
          count = requestHistory.value.filter((request) => {
            const requestDate = new Date(request.request_date);
            requestDate.setHours(0, 0, 0, 0);
            return requestDate.getTime() === today.getTime();
          }).length;
          break;

        case 'week':
          const startOfWeek = getStartOfWeek(today);
          const endOfWeek = new Date(today);
          endOfWeek.setHours(23, 59, 59, 999);

          count = requestHistory.value.filter((request) => {
            const requestDate = new Date(request.request_date);
            return isDateInRange(requestDate, startOfWeek, endOfWeek);
          }).length;
          break;

        case 'month':
          const startOfMonth = getStartOfMonth(today);
          const endOfMonth = new Date(today);
          endOfMonth.setHours(23, 59, 59, 999);

          count = requestHistory.value.filter((request) => {
            const requestDate = new Date(request.request_date);
            return isDateInRange(requestDate, startOfMonth, endOfMonth);
          }).length;
          break;
      }

      option.count = count;
    });
  };

  // Clear filters
  const clearAllHistoryFilters = () => {
    requestHistoryFilter.value = {
      status: '',
      searchQuery: '',
      sortBy: 'request_date',
      sortOrder: 'desc',
    };
    historyFilterType.value = 'today';
    requestHistoryCurrentPage.value = 1;
    showCustomMonthPicker.value = false;
    customMonthPicker.value = {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    };
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    requestHistoryFilter.value.sortOrder =
      requestHistoryFilter.value.sortOrder === 'asc' ? 'desc' : 'asc';
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Request ID',
      'Date',
      'Description',
      'Status',
      'Amount',
      'Remarks',
    ];
    const csvContent = [
      headers.join(','),
      ...filteredRequestHistory.value.map((request) =>
        [
          request.request_id,
          request.request_date,
          `"${request.request_description.replace(/"/g, '""')}"`,
          request.request_status,
          request.total_amount,
          `"${(request.finance_remarks || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `finance_request_history_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // History status options for filtering (Finance specific)
  const historyStatusOptions = [
    'Approved',
    'Rejected',
    'Sent Back',
    'Budget Released',
  ];

  // Watch for changes and update counts
  watch(
    [allRequests, requestListFilter],
    () => {
      updateQuickDateCounts();
    },
    { deep: true, immediate: true }
  );

  // Watch for changes and update history filter counts
  watch(
    [requestHistory, historyFilterType],
    () => {
      updateHistoryFilterCounts();
    },
    { deep: true, immediate: true }
  );

  // Auto-reset pagination when filters change
  watch(
    requestHistoryFilter,
    () => {
      requestHistoryCurrentPage.value = 1;
    },
    { deep: true }
  );

  // Date picker setup
  let requestDatePicker = null;
  const requestDate = ref('');

  // Smart pagination helper
  const getPageRange = () => {
    const current = requestHistoryCurrentPage.value;
    const total = totalPagesRequestHistory.value;
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

  // Add these variables after the existing reactive variables
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

  // Generate available years (current year and 5 years back)
  const availableYears = computed(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }
    return years;
  });

  onMounted(async () => {
    // Initialize data using stores
    await fetchRequests();
    await fetchPendingReceipts();

    // Update filter counts
    updateHistoryFilterCounts();
  });

  onBeforeUnmount(() => {
    if (requestDatePicker) requestDatePicker.destroy();
  });

  const formatManilaDate = (dateString) => {
    if (!dateString) return '';
    const manilaDate = new Date(
      new Date(dateString).toLocaleString('en-US', { timeZone: 'Asia/Manila' })
    );
    return manilaDate.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila',
    });
  };

  const formatManilaTime = (dateString) => {
    if (!dateString) return '';
    const manilaDate = new Date(
      new Date(dateString).toLocaleString('en-US', { timeZone: 'Asia/Manila' })
    );
    return manilaDate.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila',
    });
  };
</script>

<template>
  <div class="container mx-auto p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-primaryColor mb-2 text-shadow-xs">
        Request Approval
      </h1>
      <p class="text-black/50">
        Review and approve supply requests from SCM Department.
      </p>
    </div>

    <!-- Stats-->
    <div
      class="stats shadow w-full mb-6 bg-accentColor border border-black/10 stats-vertical lg:stats-horizontal rounded-lg"
    >
      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <ReceiptText class="w-8 h-8 text-primaryColor" />
        </div>
        <div class="stat-title text-black/50">Pending Requests</div>
        <div class="stat-value text-primaryColor">
          {{ pendingRequestsOnly.length }}
        </div>
        <div class="stat-desc text-black/50">
          {{ hasPendingRequests ? 'Awaiting review' : 'No pending requests' }}
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <CheckCircle class="w-8 h-8 text-success" />
        </div>
        <div class="stat-title text-black/50">Total Approved</div>
        <div class="stat-value text-success">
          {{
            requestStats.approved ||
            allRequests.filter((r) => r.request_status === 'Approved').length
          }}
        </div>
        <div class="stat-desc text-black/50">
          {{
            hasApprovedRequests
              ? 'Approved requests'
              : 'No approved requests yet'
          }}
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <XCircle class="w-8 h-8 text-error" />
        </div>
        <div class="stat-title text-black/50">Total Rejected</div>
        <div class="stat-value text-error">
          {{
            requestStats.rejected ||
            allRequests.filter((r) => r.request_status === 'Rejected').length
          }}
        </div>
        <div class="stat-desc text-black/50">
          {{
            hasRejectedRequests
              ? 'Rejected requests'
              : 'No rejected requests yet'
          }}
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <FileText class="w-8 h-8 text-info" />
        </div>
        <div class="stat-title text-black/50">Total Value Approved</div>
        <div class="stat-value text-info">
          ₱{{
            (
              requestStats.total_approved_amount ||
              requestHistoryStats.totalAmount
            ).toLocaleString('en-PH')
          }}
        </div>
        <div class="stat-desc text-black/50">Finance approved amount</div>
      </div>
    </div>

    <!-- Request List -->
    <div
      class="card bg-accentColor shadow-xl mb-6 border border-black/10 mx-auto"
    >
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h2 class="card-title text-primaryColor">Pending Requests</h2>
          <div class="flex gap-2">
            <button
              class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
              @click="fetchRequests"
              :class="{ loading: loading }"
              :disabled="loading"
            >
              <RefreshCcw
                v-if="!loading"
                class="w-4 h-4 mr-2 text-primaryColor"
              />
              <span
                class="loading loading-spinner loading-xs"
                v-if="loading"
              ></span>
              Refresh
            </button>
          </div>
        </div>

        <!-- Enhanced Date Filter Section -->
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
                  {{ formatPhilippineDate(requestListFilter.selectedDate) }}
                </h3>
                <p class="text-sm text-black/60">
                  Showing {{ filteredRequestsByDate.length }} request{{
                    filteredRequestsByDate.length !== 1 ? 's' : ''
                  }}
                </p>
              </div>
            </div>

            <!-- Date Navigation and Filter Controls -->
            <div class="flex flex-col sm:flex-row gap-3">
              <!-- Quick Date Buttons -->
              <div class="flex gap-2 md:flex-row flex-col">
                <button
                  v-for="option in quickDateOptions"
                  :key="option.date"
                  class="btn btn-sm font-thin border border-primaryColor/30 hover:border-primaryColor shadow-none"
                  :class="{
                    'bg-primaryColor text-white':
                      requestListFilter.selectedDate === option.date,
                    'bg-white text-primaryColor hover:bg-primaryColor/10':
                      requestListFilter.selectedDate !== option.date,
                  }"
                  @click="selectQuickDate(option)"
                >
                  {{ option.label }}
                  <span
                    class="badge badge-xs ml-1 bg-secondaryColor border-none"
                    :class="
                      requestListFilter.selectedDate === option.date
                        ? 'badge-ghost'
                        : 'badge-primaryColor/10 text-primaryColor'
                    "
                  >
                    {{ option.count }}
                  </span>
                </button>
              </div>

              <!-- Date Navigation -->
              <div class="flex items-center gap-1">
                <button
                  class="btn btn-sm btn-ghost text-primaryColor hover:bg-primaryColor/10"
                  @click="goToPreviousDay"
                  title="Previous Day"
                >
                  ‹
                </button>

                <!-- Custom Date Picker -->
                <div class="relative">
                  <button
                    class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
                    @click="toggleDatePicker"
                  >
                    <Calendar class="w-4 h-4 mr-1" />
                    Pick Date
                  </button>

                  <input
                    v-if="requestListFilter.showDatePicker"
                    type="date"
                    :value="requestListFilter.selectedDate"
                    @change="selectCustomDate"
                    @blur="requestListFilter.showDatePicker = false"
                    class="absolute top-full left-0 mt-1 input input-sm input-bordered bg-white border-primaryColor/30 text-black/70 z-10"
                    style="min-width: 150px"
                    ref="datePickerInput"
                  />
                </div>

                <button
                  class="btn btn-sm btn-ghost text-primaryColor hover:bg-primaryColor/10"
                  @click="goToNextDay"
                  title="Next Day"
                >
                  ›
                </button>

                <button
                  class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
                  @click="goToToday"
                  :class="{
                    'btn-disabled':
                      requestListFilter.selectedDate ===
                      getPhilippineDateString(),
                  }"
                >
                  Today
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading && !hasRequests" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-xs"></span>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="filteredRequestsByDate.length === 0"
          class="text-center py-8"
        >
          <div class="mb-4 items-center justify-center flex">
            <ReceiptText class="w-16 h-16 text-primaryColor" />
          </div>
          <h3 class="text-lg font-semibold mb-2 text-primaryColor">
            No pending requests for
            {{ formatPhilippineDate(requestListFilter.selectedDate) }}
          </h3>
          <p class="text-black/50 mb-4">
            Try selecting a different date to view pending requests.
          </p>
        </div>

        <!-- Table List -->
        <div v-else class="overflow-x-auto bg-accentColor">
          <table
            class="table table-zebra text-black/50 border border-black/10 custom-zebra"
          >
            <thead class="text-secondaryColor">
              <tr class="bg-primaryColor text-accentColor">
                <th>Request ID</th>
                <th>Department</th>
                <th>Requested By</th>
                <th>Priority</th>
                <th class="w-1/4">Request Description</th>
                <th>Total Amount</th>
                <th>Request Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="request in paginatedRequests"
                :key="request.request_id"
                class="hover:bg-secondaryColor/10"
              >
                <td class="font-mono font-medium text-primaryColor">
                  {{ request.request_id }}
                </td>
                <td>
                  <div class="badge badge-outline badge-sm">
                    {{ request.department }}
                  </div>
                </td>
                <td>{{ request.requested_by }}</td>
                <td>
                  <div
                    class="badge badge-sm border-none"
                    :class="{
                      'bg-error/20 text-error': request.priority === 'Urgent',
                      'bg-warning/20 text-warning': request.priority === 'High',
                      'bg-info/20 text-info': request.priority === 'Normal',
                      'bg-success/20 text-success': request.priority === 'Low',
                    }"
                  >
                    {{ request.priority }}
                  </div>
                </td>
                <td class="text-wrap">{{ request.request_description }}</td>
                <td class="font-semibold">
                  ₱{{
                    parseFloat(request.total_amount || 0).toLocaleString(
                      'en-PH',
                      {
                        minimumFractionDigits: 2,
                      }
                    )
                  }}
                </td>
                <td>
                  <div class="flex flex-col">
                    <span>{{ formatManilaDate(request.request_date) }}</span>
                    <span class="text-xs text-black/40">
                      Sent:
                      {{ formatManilaTime(request.created_at) }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="dropdown dropdown-left">
                    <label
                      tabindex="0"
                      class="btn btn-ghost btn-xs hover:outline-none hover:bg-white/10 hover:text-black/50 hover:border-none hover:shadow-none"
                    >
                      <EllipsisVertical class="w-4 h-4" />
                    </label>
                    <ul
                      tabindex="0"
                      class="dropdown-content z-[1] menu p-2 shadow bg-accentColor rounded-box w-52 border border-black/10"
                    >
                      <li class="hover:bg-black/10">
                        <a @click="viewRequest(request)" class="text-primary"
                          >View Details</a
                        >
                      </li>
                      <li class="hover:bg-black/10">
                        <a @click="editRequest(request)" class="text-warning"
                          >Edit Request</a
                        >
                      </li>
                      <li class="hover:bg-black/10">
                        <a @click="approveRequest(request)" class="text-success"
                          >Approve</a
                        >
                      </li>
                      <li class="hover:bg-black/10">
                        <a @click="sendBackRequest(request)" class="text-info"
                          >Send Back for Revision</a
                        >
                      </li>
                      <li class="hover:bg-black/10">
                        <a @click="rejectRequest(request)" class="text-error"
                          >Reject</a
                        >
                      </li>
                    </ul>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Enhanced Pagination with Date Context -->
        <div
          class="flex flex-col sm:flex-row justify-between items-center mt-4"
          v-if="totalPages > 1"
        >
          <div class="text-sm text-black/60 mb-2 sm:mb-0">
            Showing {{ (currentPage - 1) * requestsPerPage + 1 }} to
            {{
              Math.min(
                currentPage * requestsPerPage,
                filteredRequestsByDate.length
              )
            }}
            of {{ filteredRequestsByDate.length }} requests for
            {{ formatPhilippineDate(requestListFilter.selectedDate) }}
          </div>

          <div class="join space-x-1">
            <button
              class="join-item btn font-thin !bg-gray-200 text-black/50 btn-sm border border-none hover:bg-gray-300"
              :disabled="currentPage <= 1"
              @click="currentPage--"
              :class="{ 'btn-disabled': currentPage <= 1 }"
            >
              « Prev
            </button>

            <button
              class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
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
              class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
              :class="{ 'btn-disabled': currentPage >= totalPages }"
            >
              Next »
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Request History with Improved UI -->
    <div
      class="card bg-accentColor shadow-xl mb-6 border border-black/10 mx-auto"
    >
      <div class="card-body">
        <!-- Header with Simple Stats -->
        <div
          class="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6"
        >
          <div>
            <h2 class="card-title text-primaryColor mb-2">Request History</h2>
            <div class="flex flex-wrap gap-4 text-sm text-black/60">
              <span
                >Total:
                <strong class="text-primaryColor">{{
                  requestHistoryStats.total
                }}</strong></span
              >
              <span
                >Approved:
                <strong class="text-success">{{
                  requestHistoryStats.approved
                }}</strong></span
              >
              <span
                >Rejected:
                <strong class="text-error">{{
                  requestHistoryStats.rejected
                }}</strong></span
              >
            </div>
          </div>

          <div class="flex gap-2 mt-4 lg:mt-0">
            <button
              class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
              @click="exportToCSV"
            >
              <Download class="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        <!-- Search and Filters -->
        <div class="mb-6">
          <!-- Search Bar with Sort -->
          <div class="flex flex-col md:flex-row gap-4 mb-4">
            <div class="flex-1 relative">
              <Search
                class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 !text-black"
              />
              <input
                v-model="requestHistoryFilter.searchQuery"
                type="text"
                placeholder="Search by description or request ID..."
                class="input input-sm input-bordered bg-white border-primaryColor/30 text-black/70 pl-10 w-full shadow-none"
              />
            </div>

            <div class="flex gap-2">
              <button
                class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10"
                @click="toggleSortOrder"
                :title="`Sort ${requestHistoryFilter.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`"
              >
                <TrendingUp
                  v-if="requestHistoryFilter.sortOrder === 'asc'"
                  class="w-4 h-4"
                />
                <TrendingDown v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Status Quick Filters -->
          <div class="flex flex-wrap gap-2 mb-4">
            <button
              v-for="status in historyStatusOptions"
              :key="status"
              class="btn btn-xs font-thin border border-primaryColor/30"
              :class="{
                'bg-primaryColor text-white':
                  requestHistoryFilter.status === status,
                'bg-white text-primaryColor hover:bg-primaryColor/10':
                  requestHistoryFilter.status !== status,
              }"
              @click="
                requestHistoryFilter.status =
                  requestHistoryFilter.status === status ? '' : status
              "
            >
              {{ status }}
              <span class="badge badge-xs ml-1 bg-secondaryColor border-none">
                {{
                  requestHistory.filter((r) => r.request_status === status)
                    .length
                }}
              </span>
            </button>
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
                    Showing {{ filteredRequestHistory.length }} request{{
                      filteredRequestHistory.length !== 1 ? 's' : ''
                    }}
                  </p>
                </div>
              </div>

              <!-- Filter Controls -->
              <div class="flex flex-col sm:flex-row gap-3">
                <!-- Quick Filter Buttons -->
                <div class="flex gap-2 md:flex-row flex-col">
                  <button
                    v-for="option in historyFilterOptions"
                    :key="option.type"
                    class="btn btn-sm font-thin border border-primaryColor/30 hover:border-primaryColor shadow-none"
                    :class="{
                      'bg-primaryColor text-white':
                        historyFilterType === option.type,
                      'bg-white text-primaryColor hover:bg-primaryColor/10':
                        historyFilterType !== option.type,
                    }"
                    @click="selectHistoryFilter(option)"
                  >
                    {{ option.label }}
                    <span
                      class="badge badge-xs ml-1 bg-secondaryColor border-none"
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
                    @click="clearAllHistoryFilters"
                  >
                    <RefreshCcw class="w-4 h-4 mr-1" />
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Improved Table Layout -->
        <div class="overflow-x-auto bg-accentColor">
          <table
            class="table table-sm table-zebra text-black/50 border border-black/10 custom-zebra"
          >
            <thead class="text-secondaryColor">
              <tr class="bg-primaryColor text-accentColor">
                <th class="w-16">No.</th>
                <th class="w-32">Request ID</th>
                <th class="min-w-64">Description</th>
                <th class="w-28">Date</th>
                <th class="w-24">Status</th>
                <th class="w-32">Amount</th>
                <th class="min-w-48">Remarks</th>
              </tr>
            </thead>
            <tbody>
              <!-- Empty State -->
              <tr v-if="filteredRequestHistory.length === 0">
                <td colspan="7" class="text-center py-12">
                  <div class="flex flex-col items-center gap-3">
                    <div
                      class="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center"
                    >
                      <Search class="w-8 h-8 text-black/30" />
                    </div>
                    <div>
                      <h3 class="font-semibold text-black/70 mb-1">
                        No history found
                      </h3>
                      <p class="text-sm text-black/50 mb-3">
                        No request history matches your current filters
                      </p>
                      <button
                        class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
                        @click="clearAllHistoryFilters"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  </div>
                </td>
              </tr>

              <!-- Data Rows -->
              <tr
                v-for="(request, index) in paginatedRequestHistory"
                :key="request.request_id"
                class="hover:bg-primaryColor/5"
              >
                <td class="font-medium text-center">
                  {{
                    (requestHistoryCurrentPage - 1) * requestHistoryPerPage +
                    index +
                    1
                  }}
                </td>

                <td>
                  <div class="font-mono text-sm font-medium text-primaryColor">
                    {{ request.request_id }}
                  </div>
                </td>

                <td class="max-w-xs">
                  <div
                    class="tooltip tooltip-top"
                    :data-tip="request.request_description"
                  >
                    <p class="truncate font-medium">
                      {{ request.request_description }}
                    </p>
                  </div>
                </td>

                <td class="text-sm">
                  <div>
                    <span>{{ formatManilaDate(request.approved_at) }}</span>
                    <br />
                    <span class="text-xs text-black/50">
                      {{ formatManilaTime(request.approved_at) }}
                    </span>
                  </div>
                </td>

                <td>
                  <div
                    class="badge badge-sm border-none font-medium"
                    :class="{
                      'bg-success/20 text-success':
                        request.request_status === 'Approved',
                      'bg-error/20 text-error':
                        request.request_status === 'Rejected',
                      'bg-info/20 text-info':
                        request.request_status === 'Sent Back',
                      'bg-success/20 text-success':
                        request.request_status === 'Budget Released',
                    }"
                  >
                    {{ request.request_status }}
                  </div>
                </td>

                <td class="font-semibold text-left">
                  ₱{{
                    request.total_amount.toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                    })
                  }}
                </td>

                <td
                  class="!whitespace-normal !sm:max-w-sm !md:max-w-md !break-words"
                >
                  <div class="tooltip tooltip-top" :data-tip="request.remarks">
                    <p class="text-sm">
                      {{ request.remarks || 'N/A' }}
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Smart Pagination -->
        <div
          class="flex flex-col lg:flex-row justify-between items-center mt-6 gap-4"
          v-if="totalPagesRequestHistory > 1"
        >
          <!-- Summary -->
          <div class="text-sm text-black/60 flex flex-wrap gap-4">
            <span>
              Showing
              {{ (requestHistoryCurrentPage - 1) * requestHistoryPerPage + 1 }}
              to
              {{
                Math.min(
                  requestHistoryCurrentPage * requestHistoryPerPage,
                  filteredRequestHistory.length
                )
              }}
              of {{ filteredRequestHistory.length }} records for
              {{ getHistoryFilterDisplayText() }}
            </span>
            <span class="font-semibold text-primaryColor">
              Total Value: ₱{{
                requestHistoryStats.totalAmount.toLocaleString('en-PH')
              }}
            </span>
          </div>

          <!-- Pagination with Ellipsis -->
          <div class="join space-x-1">
            <button
              class="join-item btn font-thin !bg-gray-200 text-black/50 btn-sm border border-none hover:bg-gray-300"
              :disabled="requestHistoryCurrentPage <= 1"
              @click="requestHistoryCurrentPage--"
            >
              « Prev
            </button>

            <!-- First page -->
            <button
              v-if="totalPagesRequestHistory > 1"
              class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
              :class="{
                'btn-active': requestHistoryCurrentPage === 1,
                '!bg-primaryColor text-white': requestHistoryCurrentPage === 1,
              }"
              @click="requestHistoryCurrentPage = 1"
            >
              1
            </button>

            <!-- Ellipsis before current page group -->
            <button
              v-if="requestHistoryCurrentPage > 4"
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
                'btn-active': requestHistoryCurrentPage === page,
                '!bg-primaryColor text-white':
                  requestHistoryCurrentPage === page,
              }"
              @click="requestHistoryCurrentPage = page"
            >
              {{ page }}
            </button>

            <!-- Ellipsis after current page group -->
            <button
              v-if="requestHistoryCurrentPage < totalPagesRequestHistory - 3"
              class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
              disabled
            >
              ...
            </button>

            <!-- Last page -->
            <button
              v-if="
                totalPagesRequestHistory > 1 &&
                requestHistoryCurrentPage < totalPagesRequestHistory
              "
              class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
              :class="{
                'btn-active':
                  requestHistoryCurrentPage === totalPagesRequestHistory,
                '!bg-primaryColor text-white':
                  requestHistoryCurrentPage === totalPagesRequestHistory,
              }"
              @click="requestHistoryCurrentPage = totalPagesRequestHistory"
            >
              {{ totalPagesRequestHistory }}
            </button>

            <button
              class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
              :disabled="requestHistoryCurrentPage >= totalPagesRequestHistory"
              @click="requestHistoryCurrentPage++"
            >
              Next »
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Universal Modal for View/Approve/Reject -->
  <dialog id="universal_modal" class="modal">
    <div class="modal-box bg-accentColor text-black/50 shadow-lg max-w-6xl">
      <!-- View Request Modal Content -->
      <template v-if="modal.type === 'viewRequest'">
        <h3 class="text-lg font-bold mb-4 text-black">Request Details</h3>

        <!-- Request Information -->
        <div
          class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-white/5 rounded-lg"
        >
          <div>
            <span class="text-sm text-black/60">Request ID:</span>
            <p class="font-mono font-medium text-primaryColor">
              {{ modal.request?.request_id }}
            </p>
          </div>
          <div>
            <span class="text-sm text-black/60">Department:</span>
            <p class="font-medium">{{ modal.request?.department }}</p>
          </div>
          <div>
            <span class="text-sm text-black/60">Requested By:</span>
            <p class="font-medium">{{ modal.request?.requested_by }}</p>
          </div>
          <div>
            <span class="text-sm text-black/60">Priority:</span>
            <div
              class="badge badge-sm border-none mt-1"
              :class="{
                'bg-error/20 text-error': modal.request?.priority === 'Urgent',
                'bg-warning/20 text-warning':
                  modal.request?.priority === 'High',
                'bg-info/20 text-info': modal.request?.priority === 'Normal',
                'bg-success/20 text-success': modal.request?.priority === 'Low',
              }"
            >
              {{ modal.request?.priority }}
            </div>
          </div>
          <div class="md:col-span-2">
            <span class="text-sm text-black/60">Description:</span>
            <p class="font-medium">{{ modal.request?.request_description }}</p>
          </div>
        </div>

        <!-- Items Table -->
        <div class="overflow-x-auto mb-4">
          <table class="table table-xs text-black">
            <thead class="text-black">
              <tr class="border border-black text-black">
                <th class="border border-black">Item No.</th>
                <th class="border border-black">Item Name</th>
                <th class="border border-black">Quantity</th>
                <th class="border border-black">Unit</th>
                <th class="border border-black">Type</th>
                <th class="border border-black">Unit Price</th>
                <th class="border border-black">Amount (₱)</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in modal.request?.items || []"
                :key="item.id || index"
              >
                <td class="border border-black">{{ index + 1 }}</td>
                <td class="border border-black">{{ item.item_name }}</td>
                <td class="border border-black">{{ item.item_quantity }}</td>
                <td class="border border-black">{{ item.item_unit }}</td>
                <td class="border border-black">{{ item.item_type }}</td>
                <td class="border border-black">
                  ₱{{
                    parseFloat(
                      item.item_unit_price || item.item_unitPrice || 0
                    ).toFixed(2)
                  }}
                </td>
                <td class="border border-black">
                  ₱{{
                    (
                      parseFloat(item.item_quantity || 0) *
                      parseFloat(
                        item.item_unit_price || item.item_unitPrice || 0
                      )
                    ).toFixed(2)
                  }}
                </td>
              </tr>
              <tr class="border border-black">
                <td
                  colspan="6"
                  class="text-right font-semibold border border-black"
                >
                  Total
                </td>
                <td class="font-semibold border border-black">
                  ₱{{ parseFloat(modal.request?.total_amount || 0).toFixed(2) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-action">
          <button
            type="button"
            class="btn btn-outline font-thin btn-sm bg-gray-200 text-black/50 border border-none hover:bg-gray-300 shadow-none"
            @click="closeModal"
          >
            Close
          </button>
        </div>
      </template>

      <!-- Approve Modal Content -->
      <template v-if="modal.type === 'approve'">
        <h3 class="text-lg font-bold mb-4 text-success">Approve Request</h3>
        <p>
          Are you sure you want to approve request
          <strong>#{{ modal.request?.request_id }}</strong
          >?
        </p>
        <div class="bg-white/10 p-3 rounded mt-3">
          <p><strong>Department:</strong> {{ modal.request?.department }}</p>
          <p>
            <strong>Requested By:</strong> {{ modal.request?.requested_by }}
          </p>
          <p>
            <strong>Description:</strong>
            {{ modal.request?.request_description }}
          </p>
          <p>
            <strong>Total Amount:</strong> ₱{{
              modal.request?.total_amount.toLocaleString('en-PH')
            }}
          </p>
        </div>

        <!-- Optional remarks for approval -->
        <div class="form-control mt-4">
          <label class="label">
            <span class="label-text text-black/70"
              >Approval Remarks (Optional)</span
            >
          </label>
          <textarea
            v-model="modal.data.remarks"
            class="textarea textarea-bordered w-full bg-white border-primaryColor/30 text-black/70"
            rows="2"
            placeholder="Add any comments about this approval..."
          ></textarea>
        </div>

        <div class="modal-action">
          <button
            type="button"
            class="btn btn-outline font-thin btn-sm bg-gray-200 text-black/50 border border-none hover:bg-gray-300 hover:shadow-none"
            @click="closeModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-success font-thin btn-sm"
            @click="openConfirmModal('approve', modal.request)"
            :disabled="loading"
          >
            <span
              class="loading loading-spinner loading-xs"
              v-if="loading"
            ></span>
            {{ loading ? 'Approving...' : 'Approve Request' }}
          </button>
        </div>
      </template>

      <!-- Reject Modal Content -->
      <template v-if="modal.type === 'reject'">
        <h3 class="text-lg font-bold mb-4 text-error">Reject Request</h3>
        <p>
          Are you sure you want to reject request
          <strong>#{{ modal.request?.request_id }}</strong
          >?
        </p>
        <div class="bg-white/10 p-3 rounded mt-3">
          <p><strong>Department:</strong> {{ modal.request?.department }}</p>
          <p>
            <strong>Requested By:</strong> {{ modal.request?.requested_by }}
          </p>
          <p>
            <strong>Description:</strong>
            {{ modal.request?.request_description }}
          </p>
          <p>
            <strong>Total Amount:</strong> ₱{{
              modal.request?.total_amount.toLocaleString('en-PH')
            }}
          </p>
        </div>

        <!-- Required remarks for rejection -->
        <div class="form-control mt-4">
          <label class="label">
            <span class="label-text text-black/70"
              >Rejection Remarks <span class="text-red-500">*</span></span
            >
          </label>
          <textarea
            v-model="modal.data.remarks"
            class="textarea textarea-bordered w-full bg-white border-primaryColor/30 text-black/70"
            rows="3"
            placeholder="Please provide a reason for rejection..."
            required
          ></textarea>
        </div>

        <div class="modal-action">
          <button
            type="button"
            class="btn btn-outline font-thin btn-sm bg-gray-200 text-black/50 border border-none hover:bg-gray-300 hover:shadow-none"
            @click="closeModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-error font-thin btn-sm"
            @click="openConfirmModal('reject', modal.request)"
            :disabled="loading || !modal.data.remarks?.trim()"
          >
            <span
              class="loading loading-spinner loading-xs"
              v-if="loading"
            ></span>
            {{ loading ? 'Rejecting...' : 'Reject Request' }}
          </button>
        </div>
      </template>

      <!-- Send Back Modal Content -->
      <template v-if="modal.type === 'sendBack'">
        <h3 class="text-lg font-bold mb-4 text-info">Send Back for Revision</h3>
        <p>
          Are you sure you want to send request
          <strong>#{{ modal.request?.request_id }}</strong> back to SCM for
          revision?
        </p>
        <div class="bg-white/10 p-3 rounded mt-3">
          <p><strong>Department:</strong> {{ modal.request?.department }}</p>
          <p>
            <strong>Requested By:</strong> {{ modal.request?.requested_by }}
          </p>
          <p>
            <strong>Description:</strong>
            {{ modal.request?.request_description }}
          </p>
          <p>
            <strong>Total Amount:</strong> ₱{{
              modal.request?.total_amount.toLocaleString('en-PH')
            }}
          </p>
        </div>

        <!-- Required remarks for sending back -->
        <div class="form-control mt-4">
          <label class="label">
            <span class="label-text text-black/70"
              >Revision Remarks <span class="text-red-500">*</span></span
            >
          </label>
          <textarea
            v-model="modal.data.remarks"
            class="textarea textarea-bordered w-full bg-white border-primaryColor/30 text-black/70"
            rows="3"
            placeholder="Please specify what needs to be revised..."
            required
          ></textarea>
        </div>

        <div class="modal-action">
          <button
            type="button"
            class="btn btn-outline font-thin btn-sm bg-gray-200 text-black/50 border border-none hover:bg-gray-300"
            @click="closeModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-info font-thin btn-sm"
            @click="openConfirmModal('sendBack', modal.request)"
            :disabled="loading || !modal.data.remarks?.trim()"
          >
            <span
              class="loading loading-spinner loading-xs"
              v-if="loading"
            ></span>
            {{ loading ? 'Sending Back...' : 'Send Back to SCM' }}
          </button>
        </div>
      </template>
    </div>
  </dialog>

  <!-- Enhanced Request Form Modal for Editing -->
  <dialog id="request_form_modal" class="modal">
    <div
      class="modal-box bg-accentColor text-black/50 shadow-lg max-w-7xl max-h-[90vh] overflow-y-auto"
    >
      <h3 class="font-bold text-lg mb-4 text-primaryColor">
        Edit Request #{{ modal.request?.request_id }}
      </h3>

      <!-- Request Information (Read-only) -->
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 bg-white/5 rounded-lg"
      >
        <div class="form-control">
          <label class="label">
            <span class="label-text text-black/70 font-medium">Department</span>
          </label>
          <input
            :value="modal.request?.department"
            class="input input-bordered bg-gray-100 border-primaryColor/30 text-black/70"
            readonly
          />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text text-black/70 font-medium"
              >Requested By</span
            >
          </label>
          <input
            :value="modal.request?.requested_by"
            class="input input-bordered bg-gray-100 border-primaryColor/30 text-black/70"
            readonly
          />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text text-black/70 font-medium">Priority</span>
          </label>
          <input
            :value="modal.request?.priority"
            class="input input-bordered bg-gray-100 border-primaryColor/30 text-black/70"
            readonly
          />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text text-black/70 font-medium"
              >Request Date</span
            >
          </label>
          <input
            :value="modal.request?.request_date"
            class="input input-bordered bg-gray-100 border-primaryColor/30 text-black/70"
            readonly
          />
        </div>
      </div>

      <!-- Request Description (Editable) -->
      <div class="form-control mb-6">
        <label class="label">
          <span class="label-text text-black/70 font-medium"
            >Request Description</span
          >
        </label>
        <textarea
          v-model="modal.data.request_description"
          class="textarea textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
          rows="3"
          placeholder="Describe the purpose and details of this request..."
        ></textarea>
      </div>

      <!-- Items Section (Finance can only modify existing items) -->
      <div class="mb-6">
        <div class="flex justify-between items-center mb-4">
          <h4 class="text-lg font-semibold text-primaryColor">Request Items</h4>
          <div class="flex gap-2">
            <div class="text-sm text-black/60 italic">
              * Finance can only modify existing items, not add new ones
            </div>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table
            class="table table-sm table-zebra text-black/50 border border-black/10 custom-zebra"
          >
            <thead class="text-primaryColor">
              <tr class="bg-primaryColor text-accentColor">
                <th class="w-12">#</th>
                <th class="w-48">Item Name</th>
                <th class="w-20">Qty</th>
                <th class="w-24">Unit</th>
                <th class="w-32">Category</th>
                <th class="w-24">Unit Price</th>
                <th class="w-24">Amount</th>
                <th class="w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in paginatedRequestModal"
                :key="row.id"
                class="hover:bg-primaryColor/5"
              >
                <td class="text-center font-medium">{{ row.id }}</td>

                <td>
                  <input
                    type="text"
                    v-model="row.item_name"
                    placeholder="Enter item name..."
                    class="input input-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                    @blur="updateItemAmount(row)"
                  />
                </td>

                <td>
                  <input
                    type="number"
                    v-model.number="row.item_quantity"
                    placeholder="0"
                    min="0"
                    step="1"
                    class="input input-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                    @input="updateItemAmount(row)"
                  />
                </td>

                <td>
                  <select
                    v-model="row.item_unit"
                    class="select select-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor"
                  >
                    <option value="" disabled>Unit</option>
                    <option value="PC">PC/s</option>
                    <option value="KG">KG</option>
                    <option value="L">L</option>
                    <option value="BOX">BOX</option>
                    <option value="CASE">CASE</option>
                    <option value="REAM">REAM</option>
                    <option value="SET">SET</option>
                    <option value="PACK">PACK</option>
                  </select>
                </td>

                <td>
                  <select
                    v-model="row.item_type"
                    class="select select-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor"
                  >
                    <option value="" disabled>Category</option>
                    <option value="Ingredient">Ingredient</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Raw Meat">Raw Meat</option>
                    <option value="Kitchen Equipment">Kitchen Equipment</option>
                    <option value="Cleaning Supplies">Cleaning Supplies</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Service Equipment">Service Equipment</option>
                    <option value="Other">Other</option>
                  </select>
                </td>

                <td>
                  <input
                    type="number"
                    v-model.number="row.item_unitPrice"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    class="input input-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                    @input="updateItemAmount(row)"
                  />
                </td>

                <td>
                  <div class="text-right font-medium">
                    ₱{{
                      (
                        (row.item_quantity || 0) * (row.item_unitPrice || 0)
                      ).toFixed(2)
                    }}
                  </div>
                </td>

                <td class="text-center">
                  <!-- Finance cannot remove items, only modify them -->
                  <button
                    class="btn btn-ghost btn-xs text-gray-400 cursor-not-allowed rounded-full"
                    disabled
                    title="Finance cannot remove items from requests"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="bg-primaryColor/10 font-semibold">
                <td colspan="6" class="text-right text-black">Total Amount:</td>
                <td class="text-right text-primaryColor">₱{{ totalAmount }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Items Pagination -->
        <div
          class="join mt-4 justify-center space-x-1"
          v-if="totalPagesRequestModal > 1"
        >
          <button
            class="join-item btn btn-xs font-thin !bg-gray-200 text-black/50 border border-none"
            :disabled="requestModalCurrentPage <= 1"
            @click="requestModalCurrentPage--"
          >
            « Prev
          </button>

          <button
            v-for="page in totalPagesRequestModal"
            :key="page"
            class="join-item btn btn-xs font-thin !bg-gray-200 text-black/50 border border-none"
            :class="{
              'btn-active !bg-primaryColor text-white':
                requestModalCurrentPage === page,
            }"
            @click="requestModalCurrentPage = page"
          >
            {{ page }}
          </button>

          <button
            class="join-item btn btn-xs font-thin !bg-gray-200 text-black/50 border border-none"
            :disabled="requestModalCurrentPage >= totalPagesRequestModal"
            @click="requestModalCurrentPage++"
          >
            Next »
          </button>
        </div>
      </div>

      <!-- Modal Actions -->
      <div class="modal-action">
        <button
          class="btn btn-sm font-thin bg-gray-200 text-black/50 border-none hover:bg-gray-300 shadow-none"
          @click="closeModal"
          :disabled="loading"
        >
          Cancel
        </button>
        <button
          class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
          @click="openConfirmModal('edit', modal.request)"
          :disabled="loading"
        >
          <span
            class="loading loading-spinner loading-xs mr-2"
            v-if="loading"
          ></span>
          Update Request
        </button>
      </div>
    </div>
  </dialog>

  <!-- Enhanced Confirmation Modal -->
  <dialog id="confirmation_modal" class="modal">
    <div class="modal-box bg-accentColor text-black/50 shadow-lg">
      <h3 class="font-bold text-lg mb-4">{{ confirmModal.title }}</h3>

      <div class="py-4">
        <p class="mb-4">{{ confirmModal.message }}</p>

        <!-- Show additional details for certain actions -->
        <div v-if="confirmModal.data" class="bg-white/10 p-3 rounded mt-3">
          <p class="text-sm">
            <strong>Description:</strong>
            {{ confirmModal.data.request_description }}
          </p>
          <p class="text-sm">
            <strong>Department:</strong> {{ confirmModal.data.department }}
          </p>
          <p class="text-sm">
            <strong>Total Amount:</strong> ₱{{
              confirmModal.data.total_amount?.toLocaleString('en-PH')
            }}
          </p>
        </div>

        <!-- Show warning for reject action -->
        <div
          v-if="confirmModal.type === 'reject'"
          class="alert alert-warning mt-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span class="text-sm"
            >This will reject the request and notify SCM department.</span
          >
        </div>
      </div>

      <div class="modal-action">
        <button
          class="btn btn-sm font-thin bg-gray-200 text-black/50 border border-none hover:bg-gray-300 shadow-none"
          @click="closeConfirmModal"
          :disabled="loading"
        >
          Cancel
        </button>
        <button
          class="btn btn-sm font-thin border border-none shadow-none text-white"
          :class="confirmModal.confirmClass"
          @click="handleConfirmAction"
          :disabled="loading"
        >
          <span
            class="loading loading-spinner loading-xs"
            v-if="loading"
          ></span>
          {{ loading ? 'Processing...' : confirmModal.confirmText }}
        </button>
      </div>
    </div>
  </dialog>

  <!-- Toast Notification -->
  <transition
    enter-active-class="transform transition ease-out duration-300"
    enter-from-class="translate-x-full opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transform transition ease-in duration-300"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-full opacity-0"
  >
    <div class="toast toast-end" v-if="toast.show">
      <div
        v-if="toast.type === 'success'"
        class="alert alert-success shadow-lg"
      >
        <span>{{ toast.message }}</span>
      </div>
      <div
        v-else-if="toast.type === 'error'"
        class="alert alert-error shadow-lg"
      >
        <span>{{ toast.message }}</span>
      </div>
    </div>
  </transition>
</template>

<style scoped>
  .custom-zebra tbody tr:nth-child(even) {
    background-color: var(--accentColor);
  }
  .custom-zebra tbody tr:nth-child(odd) {
    background-color: rgba(0, 0, 0, 0.03);
  }

  /* Date picker focus handling */
  input[type='date']:focus {
    outline: none;
    border-color: var(--primaryColor);
  }

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

  /* Improved tooltip */
  .tooltip:before {
    max-width: 400px;
    white-space: normal;
    font-size: 0.875rem;
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

    .tooltip {
      display: none;
    }
  }

  /* Loading states */
  .table tbody tr:hover {
    transition: background-color 0.2s ease;
  }
</style>
