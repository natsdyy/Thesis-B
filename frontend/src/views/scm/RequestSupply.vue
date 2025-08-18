<script setup>
  import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
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
  } from 'lucide-vue-next';

  const loading = ref(false);
  const hasRequests = ref(true); // Set to true since we have mock data
  const hasApprovedRequests = ref(true);
  const hasPendingRequests = ref(true);
  const hasRejectedRequests = ref(true);
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

  const rowRequest = ref([
    {
      id: 1,
      item_name: '',
      item_quantity: 0,
      item_unit: '',
      item_type: '',
      item_unitPrice: 0, // Fixed: consistent naming
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
      item_unitPrice: 0, // Fixed: changed from item_price to item_unitPrice
      item_amount: 0,
    });
  };

  // Enhanced mock data with different dates for testing
  const allRequests = ref([
    {
      request_id: 2025081401,
      request_date: new Date().toISOString().split('T')[0], // Today
      request_description: 'Office supplies needed',
      request_status: 'Approved',
      created_at: new Date().toISOString(),
    },
    {
      request_id: 2025081402,
      request_date: new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // Yesterday
      request_description: 'Raw materials for production',
      request_status: 'Rejected',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      request_id: 2025081403,
      request_date: new Date().toISOString().split('T')[0], // Today
      request_description: 'Maintenance service request',
      request_status: 'Pending',
      created_at: new Date().toISOString(),
    },
    {
      request_id: 2025081404,
      request_date: new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // Tomorrow
      request_description:
        'Office supplies needed for the office, including pens, paper, and other office supplies.',
      request_status: 'To Request',
      created_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      request_id: 2025081405,
      request_date: new Date().toISOString().split('T')[0], // Today
      request_description: 'Kitchen equipment maintenance',
      request_status: 'To Request',
      created_at: new Date().toISOString(),
    },
  ]);

  // Mock data for request history
  const requestHistory = ref([
    {
      request_id: 2025081401,
      request_description: 'Office supplies needed',
      request_date: '2025-01-01',
      request_status: 'Completed',
      total_amount: 15750.5,
      receipt: 'receipt1.jpg',
    },
    {
      request_id: 2025081402,
      request_description: 'Raw materials for production',
      request_date: '2025-01-02',
      request_status: 'Completed',
      total_amount: 45000.0,
      receipt: 'receipt2.jpg',
    },
    {
      request_id: 2025081403,
      request_description: 'Kitchen equipment maintenance and replacement',
      request_date: '2025-01-03',
      request_status: 'Rejected',
      total_amount: 28500.75,
      receipt: null,
    },
    {
      request_id: 2025081404,
      request_description: 'Cleaning supplies for all branches',
      request_date: '2025-01-04',
      request_status: 'Rejected',
      total_amount: 8200.25,
      receipt: null,
    },
    {
      request_id: 2025081405,
      request_description: 'IT equipment and software licenses',
      request_date: '2025-01-05',
      request_status: 'Completed',
      total_amount: 125000.0,
      receipt: 'receipt3.jpg',
    },
  ]);

  // Modal state management (similar to RoleManager)
  const modal = ref({
    type: null,
    show: false,
    request: null,
    data: {
      request_type: '',
      request_description: '',
      request_date: '',
    },
  });

  // Enhanced form data for new/edit request
  const requestForm = ref({
    request_id: null,
    request_type: '',
    request_description: '',
    request_date: new Date().toISOString().split('T')[0],
    priority: 'Normal',
    department: 'SCM',
    requested_by: 'Current User', // In real app, get from auth store
    items: [],
  });

  // Request history filter
  const requestHistoryFilter = ref({
    startDate: '',
    endDate: '',
    status: '',
    searchQuery: '',
    sortBy: 'request_date',
    sortOrder: 'desc',
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
  const selectedDepartment = ref('');
  const selectedBranch = ref('');

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
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })
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

  // Request List Date Filter
  const requestListFilter = ref({
    selectedDate: getPhilippineDateString(), // Default to today (Philippine time)
    showDatePicker: false,
  });

  // Quick date filter buttons
  const getQuickDateOptions = () => {
    const today = getPhilippineTime();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return [
      {
        label: 'Yesterday',
        date: yesterday.toISOString().split('T')[0],
        count: 0,
      },
      {
        label: 'Today',
        date: today.toISOString().split('T')[0],
        count: 0,
      },
      {
        label: 'Tomorrow',
        date: tomorrow.toISOString().split('T')[0],
        count: 0,
      },
    ];
  };

  const quickDateOptions = ref(getQuickDateOptions());

  // Update quick date options with counts - excludes cancelled requests
  const updateQuickDateCounts = () => {
    quickDateOptions.value.forEach((option) => {
      option.count = allRequests.value.filter(
        (request) =>
          request.request_date === option.date &&
          request.request_status !== 'Cancelled' // Exclude cancelled requests from count
      ).length;
    });
  };

  // Enhanced computed properties for filtered requests - excludes cancelled requests
  const filteredRequestsByDate = computed(() => {
    return allRequests.value.filter(
      (request) =>
        request.request_date === requestListFilter.value.selectedDate &&
        request.request_status !== 'Cancelled' // Hide cancelled requests from main view
    );
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

  // Date filter methods
  const selectQuickDate = (dateOption) => {
    requestListFilter.value.selectedDate = dateOption.date;
    currentPage.value = 1; // Reset to first page when changing date
    requestListFilter.value.showDatePicker = false;
  };

  const selectCustomDate = (event) => {
    requestListFilter.value.selectedDate = event.target.value;
    currentPage.value = 1; // Reset to first page when changing date
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

  // Watch for changes and update counts
  watch(
    [allRequests, requestListFilter],
    () => {
      updateQuickDateCounts();
    },
    { deep: true, immediate: true }
  );

  // Fixed computed properties
  const paginatedRequestModal = computed(() => {
    const start =
      (requestModalCurrentPage.value - 1) * rowRequestModalPerPage.value;
    return rowRequest.value.slice(start, start + rowRequestModalPerPage.value);
  });

  const totalPagesRequestModal = computed(() => {
    return Math.ceil(rowRequest.value.length / rowRequestModalPerPage.value);
  });

  // Request history filtering
  const filteredRequestHistory = computed(() => {
    let filtered = [...requestHistory.value];

    // Date range filter
    if (requestHistoryFilter.value.startDate) {
      filtered = filtered.filter(
        (request) =>
          new Date(request.request_date) >=
          new Date(requestHistoryFilter.value.startDate)
      );
    }

    if (requestHistoryFilter.value.endDate) {
      filtered = filtered.filter(
        (request) =>
          new Date(request.request_date) <=
          new Date(requestHistoryFilter.value.endDate)
      );
    }

    // Status filter
    if (requestHistoryFilter.value.status) {
      filtered = filtered.filter(
        (request) =>
          request.request_status === requestHistoryFilter.value.status
      );
    }

    // Search filter
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

  // Updated computed properties with performance optimization
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

  // Simple stats - includes cancelled requests
  const requestHistoryStats = computed(() => {
    const completed = filteredRequestHistory.value.filter(
      (r) => r.request_status === 'Completed'
    );
    const rejected = filteredRequestHistory.value.filter(
      (r) => r.request_status === 'Rejected'
    );
    const cancelled = filteredRequestHistory.value.filter(
      (r) => r.request_status === 'Cancelled'
    );
    const totalAmount = completed.reduce((sum, r) => sum + r.total_amount, 0);

    return {
      total: filteredRequestHistory.value.length,
      completed: completed.length,
      rejected: rejected.length,
      cancelled: cancelled.length,
      totalAmount,
    };
  });

  // Clear all filters
  const clearAllHistoryFilters = () => {
    requestHistoryFilter.value = {
      startDate: '',
      endDate: '',
      status: '',
      searchQuery: '',
      sortBy: 'request_date',
      sortOrder: 'desc',
    };
    requestHistoryCurrentPage.value = 1;
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    requestHistoryFilter.value.sortOrder =
      requestHistoryFilter.value.sortOrder === 'asc' ? 'desc' : 'asc';
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Request ID', 'Date', 'Description', 'Status', 'Amount'];
    const csvContent = [
      headers.join(','),
      ...filteredRequestHistory.value.map((request) =>
        [
          request.request_id,
          request.request_date,
          `"${request.request_description.replace(/"/g, '""')}"`,
          request.request_status,
          request.total_amount,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `request_history_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auto-reset pagination when filters change
  watch(
    requestHistoryFilter,
    () => {
      requestHistoryCurrentPage.value = 1;
    },
    { deep: true }
  );

  // Modal methods (similar to RoleManager)
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
          }
        : { request_type: '', request_description: '', request_date: '' },
    };

    // Initialize form based on action type
    initializeRequestForm(request);

    if (type === 'create' || type === 'edit') {
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
      data: { request_type: '', request_description: '', request_date: '' },
    };
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
      create: {
        title: 'Create Request',
        message: 'Are you sure you want to create this request?',
        confirmText: 'Create',
        confirmClass: 'btn-primary bg-primaryColor',
        onConfirm: () => handleCreateRequest(),
      },
      edit: {
        title: 'Update Request',
        message: `Are you sure you want to update request #${data?.request_id}?`,
        confirmText: 'Update',
        confirmClass: 'btn-primary bg-primaryColor',
        onConfirm: () => handleUpdateRequest(data.request_id, modal.value.data),
      },
      send: {
        title: 'Send Request',
        message: `Are you sure you want to send request #${data?.request_id}? This will submit the request for approval.`,
        confirmText: 'Send',
        confirmClass: 'btn-success',
        onConfirm: () => handleSendRequest(data.request_id),
      },
      cancel: {
        title: 'Cancel Request',
        message: `Are you sure you want to cancel request #${data?.request_id}? This action cannot be undone.`,
        confirmText: 'Cancel Request',
        confirmClass: 'btn-error',
        onConfirm: () => handleCancelRequest(data.request_id),
      },
      delete: {
        title: 'Delete Request',
        message: `Are you sure you want to permanently delete request #${data?.request_id}? This action cannot be undone.`,
        confirmText: 'Delete',
        confirmClass: 'btn-error',
        onConfirm: () => handleDeleteRequest(data.request_id),
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
        // Error is handled by individual functions
        console.error('Confirmation action failed:', error);
      }
    }
  };

  // Enhanced request handling functions
  const handleCreateRequest = async () => {
    loading.value = true;
    try {
      // Enhanced validation
      if (!requestForm.value.request_type.trim()) {
        showToast('error', 'Please select a request type');
        return;
      }

      if (!requestForm.value.request_description.trim()) {
        showToast('error', 'Please enter a request description');
        return;
      }

      if (!requestForm.value.request_date) {
        showToast('error', 'Please select a request date');
        return;
      }

      const validItems = rowRequest.value.filter(
        (row) =>
          row.item_name.trim() &&
          row.item_quantity > 0 &&
          row.item_unitPrice > 0
      );

      if (validItems.length === 0) {
        showToast(
          'error',
          'Please add at least one valid item with name, quantity, and price'
        );
        return;
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create new request with enhanced data
      const newRequestData = {
        request_id: Date.now(),
        request_type: requestForm.value.request_type,
        request_description: requestForm.value.request_description,
        request_date: requestForm.value.request_date,
        priority: requestForm.value.priority,
        department: requestForm.value.department,
        requested_by: requestForm.value.requested_by,
        request_status: 'To Request',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: validItems.map((item) => ({
          ...item,
          item_amount: item.item_quantity * item.item_unitPrice,
        })),
        total_amount: parseFloat(totalAmount.value),
        item_count: validItems.length,
      };

      allRequests.value.unshift(newRequestData);

      closeModal();
      showToast(
        'success',
        `Request created successfully with ${validItems.length} items`
      );
    } catch (err) {
      showToast('error', 'Failed to create request');
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const handleUpdateRequest = async (requestId, updatedData) => {
    loading.value = true;
    try {
      // Enhanced validation (same as create)
      if (!requestForm.value.request_type.trim()) {
        showToast('error', 'Please select a request type');
        return;
      }

      if (!requestForm.value.request_description.trim()) {
        showToast('error', 'Please enter a request description');
        return;
      }

      const validItems = rowRequest.value.filter(
        (row) =>
          row.item_name.trim() &&
          row.item_quantity > 0 &&
          row.item_unitPrice > 0
      );

      if (validItems.length === 0) {
        showToast('error', 'Please add at least one valid item');
        return;
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update request in the list
      const requestIndex = allRequests.value.findIndex(
        (r) => r.request_id === requestId
      );
      if (requestIndex !== -1) {
        allRequests.value[requestIndex] = {
          ...allRequests.value[requestIndex],
          request_type: requestForm.value.request_type,
          request_description: requestForm.value.request_description,
          request_date: requestForm.value.request_date,
          priority: requestForm.value.priority,
          department: requestForm.value.department,
          updated_at: new Date().toISOString(),
          items: validItems.map((item) => ({
            ...item,
            item_amount: item.item_quantity * item.item_unitPrice,
          })),
          total_amount: parseFloat(totalAmount.value),
          item_count: validItems.length,
        };
      }

      closeModal();
      showToast('success', 'Request updated successfully');
    } catch (err) {
      showToast('error', 'Failed to update request');
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const handleSendRequest = async (requestId) => {
    loading.value = true;
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update request status
      const requestIndex = allRequests.value.findIndex(
        (r) => r.request_id === requestId
      );
      if (requestIndex !== -1) {
        allRequests.value[requestIndex].request_status = 'Pending';
      }

      closeModal();
      showToast('success', 'Request sent successfully');
    } catch (err) {
      showToast('error', 'Failed to send request');
    } finally {
      loading.value = false;
    }
  };

  const handleCancelRequest = async (requestId) => {
    loading.value = true;
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mark request as cancelled instead of removing it
      const requestIndex = allRequests.value.findIndex(
        (r) => r.request_id === requestId
      );

      if (requestIndex !== -1) {
        const request = allRequests.value[requestIndex];

        // Update request status
        allRequests.value[requestIndex] = {
          ...request,
          request_status: 'Cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'SCM User', // In real app, get from auth store
        };

        // Add to request history for tracking
        requestHistory.value.unshift({
          request_id: request.request_id,
          request_description: request.request_description,
          request_date: request.request_date,
          request_status: 'Cancelled',
          total_amount: request.total_amount,
          cancelled_by: 'SCM User',
          cancelled_at: new Date().toISOString(),
          remarks: 'Request cancelled by SCM department',
        });
      }

      closeModal();
      showToast('error', 'Request cancelled successfully');
    } catch (err) {
      showToast('error', 'Failed to cancel request');
    } finally {
      loading.value = false;
    }
  };

  const handleDeleteRequest = async (requestId) => {
    loading.value = true;
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Remove request from the list
      allRequests.value = allRequests.value.filter(
        (r) => r.request_id !== requestId
      );

      showToast('success', 'Request deleted successfully');
    } catch (err) {
      showToast('error', 'Failed to delete request');
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Action methods
  const editRequest = (request) => openModal('edit', request);
  const confirmSend = (request) => openConfirmModal('send', request);
  const confirmCancel = (request) => openConfirmModal('cancel', request);
  const confirmDelete = (request) => openConfirmModal('delete', request);
  const confirmViewRequest = (request) => openModal('viewRequest', request);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    newRequest.value = {
      request_type: formData.get('request_type'),
      request_description: formData.get('request_description'),
      request_date: formData.get('request_date'),
    };
    openModal('create');
  };

  // Add missing functions for backward compatibility
  const fetchRequests = async () => {
    loading.value = true;
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // In real implementation, fetch data from API
    } finally {
      loading.value = false;
    }
  };

  const removeRowRequest = (id) => {
    rowRequest.value = rowRequest.value.filter((row) => row.id !== id);
  };

  const totalAmount = computed(() => {
    const total = rowRequest.value.reduce((acc, row) => {
      const price = Number(row.item_unitPrice) || 0;
      const quantity = Number(row.item_quantity) || 0;
      return acc + price * quantity;
    }, 0);
    return total.toFixed(2);
  });

  let requestDatePicker = null;
  const requestDate = ref('');
  onMounted(() => {
    requestDatePicker = new PikaDay({
      field: document.getElementById('request_date_history'),
      format: 'YYYY-MM-DD',
      onSelect: () => {
        requestDate.value = requestDatePicker.toString();
      },
    });
  });
  onBeforeUnmount(() => {
    if (requestDatePicker) requestDatePicker.destroy();
  });

  // Enhanced form data for new/edit request
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
        department: request.department || 'SCM',
        requested_by: request.requested_by || 'Current User',
        items: request.items || [],
      };

      // Update rowRequest with existing items
      if (request.items && request.items.length > 0) {
        rowRequest.value = request.items.map((item, index) => ({
          id: index + 1,
          item_name: item.item_name || '',
          item_quantity: item.item_quantity || 0,
          item_unit: item.item_unit || '',
          item_type: item.item_type || '',
          item_unitPrice: item.item_unitPrice || 0,
          item_amount: (item.item_quantity || 0) * (item.item_unitPrice || 0),
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
        department: 'SCM',
        requested_by: 'Current User',
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

  // Clear filters
  const clearHistoryFilters = () => {
    requestHistoryFilter.value = {
      startDate: '',
      endDate: '',
      status: '',
      description: '',
    };
    requestHistoryCurrentPage.value = 1;
  };

  // Auto-calculate item amounts when quantity or price changes
  const updateItemAmount = (item) => {
    item.item_amount = (item.item_quantity || 0) * (item.item_unitPrice || 0);
  };

  // History status options for filtering - includes Cancelled
  const historyStatusOptions = [
    'Pending',
    'Sent',
    'Completed',
    'Rejected',
    'Cancelled',
  ];

  // Add these new reactive variables
  const budgetReleases = ref([
    {
      request_id: 2025081501,
      request_description: 'IT equipment for branch upgrade',
      released_amount: 125000.0,
      released_at: '2025-01-15T09:00:00Z',
      released_by: 'Finance Manager',
      department: 'SCM',
      priority: 'High',
      awaiting_receipt: true,
      release_id: 'BR2025004',
    },
    {
      request_id: 2025081502,
      request_description: 'Cleaning supplies for all branches',
      released_amount: 15000.0,
      released_at: '2025-01-14T11:30:00Z',
      released_by: 'Finance Manager',
      department: 'SCM',
      priority: 'Normal',
      awaiting_receipt: true,
      release_id: 'BR2025005',
    },
  ]);

  // Add this computed property
  const pendingReceipts = computed(() => {
    return budgetReleases.value.filter((r) => r.awaiting_receipt);
  });

  // Add this new function
  const confirmReceipt = async (requestId) => {
    loading.value = true;
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Find the budget release
      const releaseIndex = budgetReleases.value.findIndex(
        (r) => r.request_id === requestId
      );

      if (releaseIndex !== -1) {
        const release = budgetReleases.value[releaseIndex];

        // Move to request history as completed
        requestHistory.value.unshift({
          request_id: release.request_id,
          request_description: release.request_description,
          request_date: new Date().toISOString().split('T')[0],
          request_status: 'Completed',
          total_amount: release.released_amount,
          receipt: 'confirmed',
        });

        // Remove from pending receipts
        budgetReleases.value.splice(releaseIndex, 1);
      }

      showToast('success', `Receipt confirmed for request #${requestId}`);
    } catch (err) {
      showToast('error', 'Failed to confirm receipt');
    } finally {
      loading.value = false;
    }
  };
</script>

<template>
  <div class="container mx-auto p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-primaryColor mb-2 text-shadow-xs">
        Request Supply
      </h1>
      <p class="text-black/50">
        Manage and track supply requests for Countryside Steakhouse.
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
        <div class="stat-title text-black/50">Total Requests</div>
        <div class="stat-value text-primaryColor">
          {{ allRequests.length }}
        </div>
        <div class="stat-desc text-black/50">
          {{ hasRequests ? 'Requests configured' : 'No requests yet' }}
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Send class="w-8 h-8 text-info" />
        </div>
        <div class="stat-title text-black/50">To Request</div>
        <div class="stat-value text-info">
          {{
            allRequests.filter((r) => r.request_status === 'To Request').length
          }}
        </div>
        <div class="stat-desc text-black/50">
          {{ hasRequests ? 'Requests configured' : 'No requests yet' }}
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <CheckCircle class="w-8 h-8 text-success" />
        </div>
        <div class="stat-title text-black/50">Total Approved Requests</div>
        <div class="stat-value text-success">
          {{
            allRequests.filter((r) => r.request_status === 'Approved').length
          }}
        </div>
        <div class="stat-desc text-black/50">
          {{
            hasApprovedRequests
              ? 'Approved requests configured'
              : 'No approved requests yet'
          }}
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Clock class="w-8 h-8 text-warning" />
        </div>
        <div class="stat-title text-black/50">Total Pending Requests</div>
        <div class="stat-value text-warning">
          {{ allRequests.filter((r) => r.request_status === 'Pending').length }}
        </div>
        <div class="stat-desc text-black/50">
          {{
            hasPendingRequests
              ? 'Pending requests configured'
              : 'No pending requests yet'
          }}
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <XCircle class="w-8 h-8 text-error" />
        </div>
        <div class="stat-title text-black/50">Total Rejected Requests</div>
        <div class="stat-value text-error">
          {{
            allRequests.filter((r) => r.request_status === 'Rejected').length
          }}
        </div>
        <div class="stat-desc text-black/50">
          {{
            hasRejectedRequests
              ? 'Rejected requests configured'
              : 'No rejected requests yet'
          }}
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <DollarSign class="w-8 h-8 text-success" />
        </div>
        <div class="stat-title text-black/50">Awaiting Receipt</div>
        <div class="stat-value text-success">
          {{ pendingReceipts.length }}
        </div>
        <div class="stat-desc text-black/50">Budget released by Finance</div>
      </div>
    </div>

    <!-- Add this new section in the template after the stats -->
    <!-- Budget Release Receipt Section - Only appears when Finance has released budget -->
    <div
      class="card bg-success/5 border-success/20 shadow-xl mb-6 border mx-auto"
      v-if="pendingReceipts.length > 0"
    >
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h2 class="card-title text-success">
            <PhilippinePeso class="w-6 h-6 mr-2 text-success" />
            Budget Released - Confirm Receipt
          </h2>
          <div class="badge badge-success badge-md badge-outline">
            {{ pendingReceipts.length }} Pending
          </div>
        </div>

        <div class="alert alert-info mb-4">
          <Info class="w-6 h-6 mr-2" />
          <span
            >Finance has released the budget for the following requests. Please
            confirm receipt to complete the process.</span
          >
        </div>

        <div class="overflow-x-auto">
          <table
            class="table table-zebra text-black/50 border border-success/20 custom-zebra"
          >
            <thead class="text-accentColor">
              <tr class="bg-success text-accentColor">
                <th>Request ID</th>
                <th>Description</th>
                <th>Released Amount</th>
                <th>Released Date</th>
                <th>Released By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="release in pendingReceipts"
                :key="release.request_id"
                class="hover:bg-success/10"
              >
                <td class="font-mono font-medium text-success">
                  {{ release.request_id }}
                </td>
                <td class="text-wrap">{{ release.request_description }}</td>
                <td class="font-semibold text-success">
                  ₱{{
                    release.released_amount.toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                    })
                  }}
                </td>
                <td>
                  {{
                    new Date(release.released_at).toLocaleDateString('en-PH')
                  }}
                </td>
                <td>{{ release.released_by }}</td>
                <td>
                  <button
                    class="btn btn-sm bg-success text-white font-thin border-none hover:bg-success/80"
                    @click="confirmReceipt(release.request_id)"
                    :disabled="loading"
                  >
                    <FileCheck class="w-4 h-4 mr-1" />
                    {{ loading ? 'Confirming...' : 'Confirm Receipt' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Request List -->
    <div
      class="card bg-accentColor shadow-xl mb-6 border border-black/10 mx-auto"
    >
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h2 class="card-title text-primaryColor">Request List</h2>
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
            <button
              class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
              @click="openModal('create')"
            >
              <Plus class="w-4 h-4 mr-2 text-primaryColor" />
              Add Request
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
                    class="badge badge-xs ml-1 bg-secondaryColor border-none b"
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
            No requests found for
            {{ formatPhilippineDate(requestListFilter.selectedDate) }}
          </h3>
          <p class="text-black/50 mb-4">
            Try selecting a different date or create a new request for this
            date.
          </p>
          <button
            class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
            @click="openModal('create')"
          >
            <Plus class="w-4 h-4 mr-2" />
            Add Request for This Date
          </button>
        </div>

        <!-- Table List -->
        <div v-else class="overflow-x-auto bg-accentColor">
          <table
            class="table table-zebra text-black/50 border border-black/10 custom-zebra"
          >
            <thead class="text-secondaryColor">
              <tr class="bg-primaryColor text-accentColor">
                <th>Request ID</th>
                <th>Request Date</th>
                <th class="w-1/4">Request Description</th>
                <th>Request Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="request in paginatedRequests"
                :key="request.request_id"
                class="hover:bg-secondaryColor/10"
              >
                <td>{{ request.request_id }}</td>
                <td>
                  <div class="flex flex-col">
                    <span>{{ request.request_date }}</span>
                    <span class="text-xs text-black/40">
                      {{
                        new Date(request.created_at).toLocaleTimeString(
                          'en-PH',
                          {
                            timeZone: 'Asia/Manila',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )
                      }}
                    </span>
                  </div>
                </td>
                <td class="text-wrap">{{ request.request_description }}</td>
                <td>
                  <div
                    class="badge badge-sm badge-soft border-none"
                    :class="{
                      'bg-info/10 text-info':
                        request.request_status === 'To Request',
                      'bg-success/10 text-success':
                        request.request_status === 'Approved',
                      'bg-error/10 text-error':
                        request.request_status === 'Rejected',
                      'bg-warning/10 text-warning':
                        request.request_status === 'Pending',
                    }"
                  >
                    {{ request.request_status }}
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
                        <a
                          @click="confirmViewRequest(request)"
                          class="text-primary"
                          >View Request</a
                        >
                      </li>
                      <li
                        class="hover:bg-black/10"
                        v-if="request.request_status === 'To Request'"
                      >
                        <a @click="editRequest(request)" class="text-warning"
                          >Edit</a
                        >
                      </li>
                      <li
                        class="hover:bg-black/10"
                        v-if="request.request_status === 'To Request'"
                      >
                        <a @click="confirmSend(request)" class="text-success"
                          >Send Request</a
                        >
                      </li>
                      <li
                        class="hover:bg-black/10"
                        v-if="request.request_status === 'Pending'"
                      >
                        <a @click="confirmCancel(request)" class="text-error"
                          >Cancel Request</a
                        >
                      </li>
                      <li
                        class="hover:bg-black/10"
                        v-if="request.request_status === 'To Request'"
                      >
                        <a @click="confirmDelete(request)" class="text-error"
                          >Delete Request</a
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
                >Completed:
                <strong class="text-success">{{
                  requestHistoryStats.completed
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

          <!-- Date Range Filters -->
          <div
            class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/5 rounded-lg border border-primaryColor/10"
          >
            <div class="form-control">
              <label class="label">
                <span class="label-text text-black/70 text-sm">Start Date</span>
              </label>
              <input
                v-model="requestHistoryFilter.startDate"
                type="date"
                class="input input-sm input-bordered bg-white border-primaryColor/30 text-black/70"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text text-black/70 text-sm">End Date</span>
              </label>
              <input
                v-model="requestHistoryFilter.endDate"
                type="date"
                class="input input-sm input-bordered bg-white border-primaryColor/30 text-black/70"
              />
            </div>

            <div class="form-control flex justify-end">
              <label class="label">
                <span class="label-text text-black/70 text-sm">&nbsp;</span>
              </label>
              <button
                class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
                @click="clearAllHistoryFilters"
              >
                Clear Filters
              </button>
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
                <th class="w-24">Receipt</th>
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

                <td class="text-sm">{{ request.request_date }}</td>

                <td>
                  <div
                    class="badge badge-sm border-none font-medium"
                    :class="{
                      'bg-success/20 text-success':
                        request.request_status === 'Completed',
                      'bg-error/20 text-error':
                        request.request_status === 'Rejected',
                    }"
                  >
                    {{ request.request_status }}
                  </div>
                </td>

                <td class="font-semibold text-left">
                  ₱{{
                    request.total_amount
                      ? request.total_amount.toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                        })
                      : '0.00'
                  }}
                </td>

                <td>
                  <a
                    v-if="
                      request.request_status === 'Completed' && request.receipt
                    "
                    class="text-primaryColor cursor-pointer underline hover:text-primaryColor/80 text-sm font-medium"
                    @click="
                      showReceipt = true;
                      receiptData = request;
                    "
                  >
                    View Receipt
                  </a>
                  <span v-else class="text-black/30 text-sm">N/A</span>
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
              of {{ filteredRequestHistory.length }} records
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

  <cashRequestReceiptModal
    :cashRequestReceipt="{
      show: showReceipt,
      receipt: receiptData,
      onClose: closeReceipt,
    }"
  />

  <!-- Create Request Modal -->
  <dialog id="create_request_modal" class="modal">
    <div class="modal-box bg-accentColor text-black/50 shadow-lg max-w-6xl">
      <h3 class="font-bold text-lg">Create Request</h3>
      <div class="overflow-x-auto">
        <table
          class="table table-sm table-zebra text-black/50 border border-black/10 custom-zebra"
        >
          <thead class="text-primaryColor">
            <tr class="bg-primaryColor text-accentColor">
              <th>Item No.</th>
              <th>Item Name</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Type</th>
              <th>Unit Price</th>
              <th>Amount (₱)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paginatedRequestModal" :key="row.id">
              <td>{{ row.id }}</td>

              <td>
                <input
                  type="text"
                  v-model="row.item_name"
                  placeholder="Type here"
                  class="input input-xs input-ghost focus:bg-accentColor focus:border-primaryColor focus:text-black"
                />
              </td>

              <td>
                <input
                  type="number"
                  v-model.number="row.item_quantity"
                  placeholder="0"
                  min="0"
                  class="input input-xs input-ghost focus:bg-accentColor focus:border-primaryColor focus:text-black"
                />
              </td>

              <td>
                <select v-model="row.item_unit">
                  <option value="" disabled selected>Select Unit</option>
                  <option value="PC">PC/s</option>
                  <option value="KG">KG</option>
                  <option value="L">L</option>
                  <option value="BOX">BOX</option>
                  <option value="CASE">CASE</option>
                  <option value="REAM">REAM</option>
                  <option value="PC/S">PC/S</option>
                </select>
              </td>

              <td>
                <select v-model="row.item_type">
                  <option value="" disabled selected>Select Type</option>
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
                  placeholder="0"
                  min="0"
                  step="0.01"
                  class="input input-xs input-ghost focus:bg-accentColor focus:border-primaryColor focus:text-black"
                />
              </td>
              <td>
                <p class="text-sm text-black">
                  {{
                    (
                      (Number(row.item_unitPrice) || 0) *
                      (Number(row.item_quantity) || 0)
                    ).toFixed(2)
                  }}
                </p>
              </td>
              <td class="flex justify-center">
                <button
                  class="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-full hover:border-error/10 hover:border-2"
                  @click="removeRowRequest(row.id)"
                >
                  <X class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Request Item Pagination -->
        <div
          class="join mt-4 justify-end space-x-1"
          v-if="rowRequest.length > rowRequestModalPerPage"
        >
          <button
            class="join-item btn font-thin !bg-gray-200 text-black/50 btn-xs border border-none hover:bg-gray-300"
            :disabled="requestModalCurrentPage <= 1"
            @click="requestModalCurrentPage--"
            :class="{ 'btn-disabled': requestModalCurrentPage <= 1 }"
          >
            « Prev
          </button>

          <button
            class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-xs shadow-none"
            v-for="page in totalPagesRequestModal"
            :key="page"
            :class="{
              'btn-active': requestModalCurrentPage === page,
              '!bg-primaryColor text-white': requestModalCurrentPage === page,
            }"
            @click="requestModalCurrentPage = page"
          >
            {{ page }}
          </button>

          <button
            class="join-item btn font-thin btn-xs !bg-gray-200 text-black/50 border border-none"
            :disabled="
              requestModalCurrentPage >=
              Math.ceil(rowRequest.length / rowRequestModalPerPage)
            "
            @click="requestModalCurrentPage++"
            :class="{
              'btn-disabled':
                requestModalCurrentPage >=
                Math.ceil(rowRequest.length / rowRequestModalPerPage),
            }"
          >
            Next »
          </button>
        </div>
        <div class="flex justify-between mt-4">
          <div class="flex justify-start">
            <button
              class="btn btn-sm bg-primaryColor text-white font-thin border border-none hover:bg-primaryColor/80 shadow-none"
              @click="addRowRequest"
            >
              <Plus class="w-4 h-4 mr-2 text-white" />
              Add Item
            </button>
          </div>
          <div class="flex space-x-0.5 items-center">
            <p class="flex items-center text-xs font-semibold text-black">
              TOTAL
            </p>
            <div class="flex justify-end gap-2 w-50 bg-gray-200 rounded-xs p-1">
              <p class="text-sm text-black">₱</p>
              <p class="text-sm text-black">{{ totalAmount }}</p>
            </div>
          </div>
        </div>

        <!-- Request Description -->
        <div class="form-control mb-4 mt-4">
          <label class="label">
            <span class="label-text text-black/50">Request Description</span>
          </label>
          <textarea
            v-model="modal.data.request_description"
            class="textarea textarea-bordered w-full bg-white border border-black/10 text-black/50 cursor-pointer"
            rows="3"
            required
          ></textarea>
        </div>
      </div>
      <div class="modal-action">
        <button
          class="btn btn-sm font-thin bg-gray-200 text-black/50 border border-none hover:bg-gray-300 shadow-none"
          @click="closeModal"
        >
          Cancel
        </button>
        <button
          class="btn btn-sm bg-primaryColor text-white font-thin border border-none hover:bg-primaryColor/80 shadow-none"
          @click="openConfirmModal('create')"
        >
          Create
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
        <div
          v-if="
            confirmModal.data &&
            (confirmModal.type === 'send' ||
              confirmModal.type === 'cancel' ||
              confirmModal.type === 'delete')
          "
          class="bg-white/10 p-3 rounded mt-3"
        >
          <p class="text-sm">
            <strong>Description:</strong>
            {{ confirmModal.data.request_description }}
          </p>
          <p class="text-sm">
            <strong>Status:</strong> {{ confirmModal.data.request_status }}
          </p>
          <p class="text-sm">
            <strong>Date:</strong> {{ confirmModal.data.request_date }}
          </p>
        </div>

        <!-- Show warning for destructive actions -->
        <div
          v-if="
            confirmModal.type === 'cancel' || confirmModal.type === 'delete'
          "
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
          <span class="text-sm">This action cannot be undone!</span>
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

  <!-- Universal Modal for Edit/Send/Cancel -->
  <dialog id="universal_modal" class="modal">
    <div class="modal-box bg-accentColor text-black/50 shadow-lg max-w-6xl">
      <!-- View Request Modal Content -->
      <template v-if="modal.type === 'viewRequest'">
        <h3 class="text-lg font-bold mb-4 text-black">Request Details</h3>
        <div class="overflow-x-auto">
          <table class="table table-xs text-black">
            <thead class="text-black bg-primaryColor">
              <tr class="border border-black text-accentColor">
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
              <tr v-for="row in paginatedRequestModal" :key="row.id">
                <td class="border border-black">{{ row.id }}</td>
                <td class="border border-black">{{ row.item_name }}</td>
                <td class="border border-black">{{ row.item_quantity }}</td>
                <td class="border border-black">{{ row.item_unit }}</td>
                <td class="border border-black">{{ row.item_type }}</td>
                <td class="border border-black">{{ row.item_unitPrice }}</td>
                <td class="border border-black">{{ row.item_amount }}</td>
              </tr>
              <tr class="border border-black">
                <td
                  colspan="6"
                  class="text-right font-semibold border border-black"
                >
                  Total
                </td>
                <td class="font-semibold border border-black">
                  ₱ {{ totalAmount }}
                </td>
              </tr>
            </tbody>
          </table>
          <div class="mt-4">
            <p class="text-sm text-black/50">
              Description: {{ modal.request?.request_description }}
            </p>
          </div>
        </div>
        <div class="modal-action">
          <button
            type="button"
            class="btn btn-outline font-thin btn-sm bg-gray-200 text-black/50 border border-none hover:bg-gray-300 shadow-none"
            @click="closeModal"
          >
            Cancel
          </button>
        </div>
      </template>
      <!-- Edit Modal Content -->
      <template v-if="modal.type === 'edit'">
        <h3 class="text-lg font-bold mb-4 text-black">Edit Request</h3>
        <div class="overflow-x-auto">
          <table
            class="table table-sm table-zebra text-black/50 border border-black/10 custom-zebra"
          >
            <thead class="text-primaryColor">
              <tr class="bg-primaryColor text-accentColor">
                <th>Item No.</th>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Type</th>
                <th>Unit Price</th>
                <th>Amount (₱)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in paginatedRequestModal" :key="row.id">
                <td>{{ row.id }}</td>

                <td>
                  <input
                    type="text"
                    v-model="row.item_name"
                    placeholder="Type here"
                    class="input input-xs input-ghost focus:bg-accentColor focus:border-primaryColor focus:text-black"
                  />
                </td>

                <td>
                  <input
                    type="number"
                    v-model.number="row.item_quantity"
                    placeholder="0"
                    min="0"
                    class="input input-xs input-ghost focus:bg-accentColor focus:border-primaryColor focus:text-black"
                  />
                </td>

                <td>
                  <select v-model="row.item_unit">
                    <option value="" disabled selected>Select Unit</option>
                    <option value="PC">PC/s</option>
                    <option value="KG">KG</option>
                    <option value="L">L</option>
                    <option value="BOX">BOX</option>
                    <option value="CASE">CASE</option>
                    <option value="REAM">REAM</option>
                    <option value="PC/S">PC/S</option>
                  </select>
                </td>

                <td>
                  <select v-model="row.item_type">
                    <option value="" disabled selected>Select Type</option>
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
                    placeholder="0"
                    min="0"
                    step="0.01"
                    class="input input-xs input-ghost focus:bg-accentColor focus:border-primaryColor focus:text-black"
                  />
                </td>
                <td>
                  <p class="text-sm text-black">
                    {{
                      (
                        (Number(row.item_unitPrice) || 0) *
                        (Number(row.item_quantity) || 0)
                      ).toFixed(2)
                    }}
                  </p>
                </td>
                <td class="flex justify-center">
                  <X
                    class="w-4 h-4 text-error cursor-pointer hover:bg-error/10 hover:border-error/10 hover:border-2 hover:rounded-full"
                    @click="removeRowRequest(row.id)"
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Edit Request Item Pagination -->
          <div
            class="join mt-4 justify-end space-x-1"
            v-if="rowRequest.length > rowRequestModalPerPage"
          >
            <button
              class="join-item btn font-thin !bg-gray-200 text-black/50 btn-xs border border-none hover:bg-gray-300"
              :disabled="requestModalCurrentPage <= 1"
              @click="requestModalCurrentPage--"
              :class="{ 'btn-disabled': requestModalCurrentPage <= 1 }"
            >
              « Prev
            </button>

            <button
              class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-xs shadow-none"
              v-for="page in totalPagesRequestModal"
              :key="page"
              :class="{
                'btn-active': requestModalCurrentPage === page,
                '!bg-primaryColor text-white': requestModalCurrentPage === page,
              }"
              @click="requestModalCurrentPage = page"
            >
              {{ page }}
            </button>

            <button
              class="join-item btn font-thin btn-xs !bg-gray-200 text-black/50 border border-none"
              :disabled="
                requestModalCurrentPage >=
                Math.ceil(rowRequest.length / rowRequestModalPerPage)
              "
              @click="requestModalCurrentPage++"
              :class="{
                'btn-disabled':
                  requestModalCurrentPage >=
                  Math.ceil(rowRequest.length / rowRequestModalPerPage),
              }"
            >
              Next »
            </button>
          </div>
          <div class="flex justify-between mt-4">
            <div class="flex justify-start">
              <button
                class="btn btn-sm bg-primaryColor text-white font-thin border border-none hover:bg-primaryColor/80 shadow-none"
                @click="addRowRequest"
              >
                <Plus class="w-4 h-4 mr-2 text-white" />
                Add More Item
              </button>
            </div>
            <div class="flex space-x-0.5 items-center">
              <p class="flex items-center text-xs font-semibold text-black">
                TOTAL
              </p>
              <div
                class="flex justify-end gap-2 w-50 bg-gray-200 rounded-xs p-1"
              >
                <p class="text-sm text-black">₱</p>
                <p class="text-sm text-black">{{ totalAmount }}</p>
              </div>
            </div>
          </div>

          <!-- Request Description -->
          <div class="form-control mb-4 mt-4">
            <label class="label">
              <span class="label-text text-black/50">Request Description</span>
            </label>
            <textarea
              v-model="modal.data.request_description"
              class="textarea textarea-bordered w-full bg-white border border-black/10 text-black/50 cursor-pointer"
              rows="3"
              required
            ></textarea>
          </div>
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
            type="submit"
            class="btn bg-primaryColor font-thin border border-none hover:bg-primaryColor/80 btn-sm text-white"
            :disabled="loading"
          >
            <span
              class="loading loading-spinner loading-xs"
              v-if="loading"
            ></span>
            {{ loading ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </template>

      <!-- Send Modal Content -->
      <template v-if="modal.type === 'send'">
        <h3 class="text-lg font-bold mb-4">Send Request</h3>
        <p>
          Are you sure you want to send request
          <strong>#{{ modal.request?.request_id }}</strong
          >?
        </p>
        <div class="bg-white/10 p-3 rounded mt-3">
          <p><strong>Type:</strong> {{ modal.request?.request_type }}</p>
          <p>
            <strong>Description:</strong>
            {{ modal.request?.request_description }}
          </p>
        </div>
        <p class="text-sm text-gray-500 mt-2">
          This request will be sent to the Finance Department for approval.
        </p>
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
            @click="handleModalAction"
            :disabled="loading"
          >
            <span
              class="loading loading-spinner loading-xs"
              v-if="loading"
            ></span>
            {{ loading ? 'Sending...' : 'Send Request' }}
          </button>
        </div>
      </template>

      <!-- Cancel Modal Content -->
      <template v-if="modal.type === 'cancel'">
        <h3 class="text-lg font-bold mb-4">Cancel Request</h3>
        <p>
          Are you sure you want to cancel request
          <strong>#{{ modal.request?.request_id }}</strong
          >?
        </p>
        <div class="bg-white/10 p-3 rounded mt-3">
          <p><strong>Type:</strong> {{ modal.request?.request_type }}</p>
          <p>
            <strong>Description:</strong>
            {{ modal.request?.request_description }}
          </p>
        </div>
        <p class="text-sm text-gray-500 mt-2">
          This action will permanently remove the request.
        </p>
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
            @click="handleModalAction"
            :disabled="loading"
          >
            <span
              class="loading loading-spinner loading-xs"
              v-if="loading"
            ></span>
            {{ loading ? 'Cancelling...' : 'Cancel Request' }}
          </button>
        </div>
      </template>
    </div>
  </dialog>

  <!-- Enhanced Request Form Modal -->
  <dialog id="request_form_modal" class="modal">
    <div
      class="modal-box bg-accentColor text-black/50 shadow-lg max-w-7xl max-h-[90vh] overflow-y-auto"
    >
      <h3 class="font-bold text-lg mb-4 text-primaryColor">
        {{ modal.type === 'create' ? 'Create New Request' : 'Edit Request' }}
      </h3>

      <!-- Request Information Form -->
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 bg-white/5 rounded-lg"
      >
        <div class="form-control">
          <label class="label">
            <span class="label-text text-black/70 font-medium"
              >Request Type <span class="text-red-500">*</span></span
            >
          </label>
          <select
            v-model="requestForm.request_type"
            class="select select-bordered bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            required
          >
            <option value="" disabled>Select Request Type</option>
            <optgroup
              v-for="category in requestCategories"
              :key="category.category"
              :label="category.category"
            >
              <option v-for="type in category.types" :key="type" :value="type">
                {{ type }}
              </option>
            </optgroup>
          </select>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text text-black/70 font-medium"
              >Select Priority <span class="text-red-500">*</span></span
            >
          </label>
          <select
            v-model="requestForm.priority"
            class="select select-bordered bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
          >
            <option
              v-for="priority in priorities"
              :key="priority"
              :value="priority"
            >
              {{ priority }}
            </option>
          </select>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text text-black/70 font-medium"
              >Department <span class="text-red-500">*</span></span
            >
          </label>
          <select
            v-model="requestForm.department"
            class="select select-bordered bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
          >
            <option v-for="dept in departments" :key="dept" :value="dept">
              {{ dept }}
            </option>
          </select>

          <template v-if="requestForm.department === 'Branch'">
            <div class="flex flex-col gap-2">
              <label class="label">
                <span class="label-text text-black/70 font-medium">Branch</span>
              </label>
              <select
                v-model="requestForm.branch"
                class="select select-bordered bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              >
                <option
                  v-for="branch in branches"
                  :key="branch"
                  :value="branch"
                >
                  {{ branch }}
                </option>
              </select>
            </div>
          </template>
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text text-black/70 font-medium"
              >Request Date <span class="text-red-500">*</span></span
            >
          </label>
          <input
            v-model="requestForm.request_date"
            type="date"
            class="input input-bordered bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            required
          />
        </div>

        <div class="form-control">
          <label class="label">
            <span class="label-text text-black/70 font-medium"
              >Requested By</span
            >
          </label>
          <input
            v-model="requestForm.requested_by"
            type="text"
            class="input input-bordered bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            readonly
          />
        </div>
      </div>

      <!-- Request Description -->
      <div class="form-control mb-6">
        <label class="label">
          <span class="label-text text-black/70 font-medium"
            >Request Description <span class="text-red-500">*</span></span
          >
        </label>
        <textarea
          v-model="requestForm.request_description"
          class="textarea textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
          rows="3"
          placeholder="Describe the purpose and details of this request..."
          required
        ></textarea>
      </div>

      <!-- Items Section -->
      <div class="mb-6">
        <div class="flex justify-between items-center mb-4">
          <h4 class="text-lg font-semibold text-primaryColor">Request Items</h4>
          <div class="flex gap-2">
            <button
              class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
              @click="addRowRequest"
            >
              <Plus class="w-4 h-4 mr-1" />
              Add Item
            </button>
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
                  <button
                    class="btn btn-ghost btn-xs text-error hover:bg-error/10 rounded-full"
                    @click="removeRowRequest(row.id)"
                    :disabled="rowRequest.length <= 1"
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
          @click="
            modal.type === 'create'
              ? openConfirmModal('create')
              : openConfirmModal('edit', modal.request)
          "
          :disabled="loading"
        >
          <span
            class="loading loading-spinner loading-xs mr-2"
            v-if="loading"
          ></span>
          {{ modal.type === 'create' ? 'Create Request' : 'Update Request' }}
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

<script>
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
</script>

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

  /* Empty state styling */
  .table tbody tr td {
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }
</style>
