<script setup>
  import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
  import { useSupplyRequestStore } from '../../stores/supplyRequestStore.js';
  import { useBudgetReleaseStore } from '../../stores/budgetReleaseStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import { useInventoryStore } from '../../stores/inventoryStore.js';
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

  // Stores
  const supplyRequestStore = useSupplyRequestStore();
  const budgetReleaseStore = useBudgetReleaseStore();
  const authStore = useAuthStore();
  const inventoryStore = useInventoryStore();

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

  // Philippine Time helper functions
  const getPhilippineTime = () => {
    // Always get the current time in Asia/Manila
    const now = new Date();
    // Convert to Asia/Manila by using toLocaleString and then new Date
    return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  };

  const getPhilippineDateString = (date = null) => {
    const targetDate = date || getPhilippineTime();
    return targetDate.toISOString().split('T')[0];
  };

  // Request history filter
  const requestHistoryFilter = ref({
    searchQuery: '',
    status: '',
    sortBy: 'request_date',
    sortOrder: 'desc',
  });

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
    },
  });

  // Enhanced form data for new/edit request with centralized categories
  const requestForm = ref({
    request_id: null,
    request_type: '',
    request_description: '',
    request_date: getPhilippineDateString(),
    priority: 'Normal',
    department: 'SCM',
    requested_by: 'Current User',
    items: [],
  });

  // Add selected category for centralized inventory integration
  const selectedCategory = ref('');

  // Centralized inventory categories - computed from inventory store
  const requestCategories = computed(() => {
    const categories = inventoryStore.categories || [];
    const itemTypes = inventoryStore.itemTypes || [];

    return categories.map((category) => ({
      category: category.name,
      category_id: category.id,
      description: category.description,
      types: itemTypes
        .filter((item) => item.category_id === category.id && item.is_active)
        .map((item) => item.name),
    }));
  });

  // Available item types based on selected category
  const availableItemTypes = computed(() => {
    if (!selectedCategory.value) return [];

    const category = requestCategories.value.find(
      (cat) => cat.category === selectedCategory.value
    );

    if (!category) return [];

    return (
      inventoryStore.itemTypes?.filter(
        (item) => item.category_id === category.category_id && item.is_active
      ) || []
    );
  });

  // Function to handle category change
  const onCategoryChange = (categoryName) => {
    selectedCategory.value = categoryName;
    requestForm.value.request_type = '';

    // Auto-populate the first available type for the selected category
    const category = requestCategories.value.find(
      (cat) => cat.category === categoryName
    );
    if (category && category.types.length > 0) {
      requestForm.value.request_type = category.types[0];
    }
  };

  // Function to get category name from request type
  const getCategoryFromRequestType = (requestType) => {
    const category = requestCategories.value.find((cat) =>
      cat.types.includes(requestType)
    );
    return category ? category.category : 'Materials';
  };

  // Function to get unit of measure for selected item type
  const getUnitOfMeasure = (itemTypeName) => {
    const itemType = inventoryStore.itemTypes?.find(
      (item) => item.name === itemTypeName
    );
    return itemType ? itemType.unit_of_measure : 'pieces';
  };

  // Auto-populate unit of measure when item type changes
  const onItemTypeChange = (row) => {
    if (row.item_type) {
      // Find the selected item type in inventory
      const selectedItemType = inventoryStore.itemTypes?.find(
        (item) => item.name === row.item_type
      );

      if (selectedItemType) {
        // Auto-populate unit from inventory
        row.item_unit = selectedItemType.unit_of_measure;
      } else {
        // Fallback to default
        row.item_unit = 'pieces';
      }
    }
  };

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

  // Add these missing computed properties
  const requestStats = computed(() => supplyRequestStore.stats);
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

  // Enhanced loading state management
  const isLoading = computed(
    () =>
      supplyRequestStore.loading || budgetReleaseStore.loading || loading.value
  );

  // Update quick date options with counts
  const updateQuickDateCounts = () => {
    quickDateOptions.value.forEach((option) => {
      option.count = allRequests.value.filter((request) => {
        // Convert UTC to Asia/Manila and get YYYY-MM-DD
        const manilaDate = new Date(
          new Date(request.request_date).toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
          })
        );
        const normalized = manilaDate.toLocaleDateString('en-CA', {
          timeZone: 'Asia/Manila',
        });
        return (
          normalized === option.date && request.request_status !== 'Cancelled'
        );
      }).length;
    });
  };

  // Enhanced computed properties for filtered requests
  const filteredRequestsByDate = computed(() => {
    const selectedDate = requestListFilter.value.selectedDate;

    allRequests.value.forEach((r) => {
      // Convert UTC to Asia/Manila and get YYYY-MM-DD
      const manilaDate = new Date(
        new Date(r.request_date).toLocaleString('en-US', {
          timeZone: 'Asia/Manila',
        })
      );
      const normalized = manilaDate.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Manila',
      });
    });

    return allRequests.value.filter((request) => {
      const manilaDate = new Date(
        new Date(request.request_date).toLocaleString('en-US', {
          timeZone: 'Asia/Manila',
        })
      );
      const normalized = manilaDate.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Manila',
      });
      return (
        normalized === selectedDate && request.request_status !== 'Cancelled'
      );
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

  // Request history computed properties
  const requestHistory = computed(() => {
    return allRequests.value.filter((request) =>
      ['Completed', 'Rejected', 'Cancelled'].includes(request.request_status)
    );
  });

  // History-related reactive variables
  const historyFilterType = ref('today'); // 'today', 'week', 'month', 'custom'
  const showCustomMonthPicker = ref(false);
  const customMonthPicker = ref({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // Updated history filter options
  const getHistoryFilterOptions = () => {
    return [
      { type: 'today', label: 'Today', count: 0 },
      { type: 'week', label: 'This Week', count: 0 },
      { type: 'month', label: 'This Month', count: 0 },
    ];
  };

  const historyFilterOptions = ref(getHistoryFilterOptions());

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

  // Updated history filtering logic
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

  const clearHistoryFilters = () => {
    historyFilterType.value = 'today';
    requestHistoryFilter.value.searchQuery = '';
    requestHistoryFilter.value.status = '';
    requestHistoryCurrentPage.value = 1;
    showCustomMonthPicker.value = false;
    customMonthPicker.value = {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    };
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

  // Update the filteredRequestHistory computed property
  const filteredRequestHistory = computed(() => {
    let filtered = [...filteredRequestHistoryByDate.value];

    // Search filter
    if (requestHistoryFilter.value.searchQuery) {
      const query = requestHistoryFilter.value.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (request) =>
          request.request_description.toLowerCase().includes(query) ||
          request.request_id.toString().includes(query)
      );
    }

    // Status filter
    if (requestHistoryFilter.value.status) {
      filtered = filtered.filter(
        (request) =>
          request.request_status === requestHistoryFilter.value.status
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
    const completed = filteredRequestHistory.value.filter(
      (r) => r.request_status === 'Completed'
    );
    const rejected = filteredRequestHistory.value.filter(
      (r) => r.request_status === 'Rejected'
    );
    const cancelled = filteredRequestHistory.value.filter(
      (r) => r.request_status === 'Cancelled'
    );
    const totalAmount = completed.reduce(
      (sum, r) => sum + (r.total_amount || 0),
      0
    );

    return {
      total: filteredRequestHistory.value.length,
      completed: completed.length,
      rejected: rejected.length,
      cancelled: cancelled.length,
      totalAmount,
    };
  });

  // Enhanced request handling functions using stores
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

      // Use store to create request
      const requestData = {
        request_type: requestForm.value.request_type,
        request_description: requestForm.value.request_description,
        request_date: requestForm.value.request_date,
        priority: requestForm.value.priority,
        department: requestForm.value.department,
        requested_by: authStore.user?.name || requestForm.value.requested_by,
      };

      await supplyRequestStore.createRequest(requestData, validItems);

      closeModal();
      showToast(
        'success',
        `Request created successfully with ${validItems.length} items`
      );

      // Refresh data
      await fetchAllData();
    } catch (err) {
      showToast('error', err.message || 'Failed to create request');
    } finally {
      loading.value = false;
    }
  };

  const handleUpdateRequest = async (requestId) => {
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

      // Find the request in store
      const request = allRequests.value.find((r) => r.request_id === requestId);
      if (!request) {
        showToast('error', 'Request not found');
        return;
      }

      const requestData = {
        request_type: requestForm.value.request_type,
        request_description: requestForm.value.request_description,
        request_date: requestForm.value.request_date,
        priority: requestForm.value.priority,
        department: requestForm.value.department,
      };

      await supplyRequestStore.updateRequest(
        request.id,
        requestData,
        validItems
      );

      closeModal();
      showToast('success', 'Request updated successfully');

      // Refresh data
      await fetchAllData();
    } catch (err) {
      showToast('error', err.message || 'Failed to update request');
    } finally {
      loading.value = false;
    }
  };

  const handleSendRequest = async (requestId) => {
    loading.value = true;
    try {
      const request = allRequests.value.find((r) => r.request_id === requestId);
      if (!request) {
        showToast('error', 'Request not found');
        return;
      }

      await supplyRequestStore.sendRequest(
        request.id,
        authStore.user?.name || 'SCM User'
      );

      closeModal();
      showToast('success', 'Request sent successfully');

      // Refresh data
      await fetchAllData();
    } catch (err) {
      showToast('error', err.message || 'Failed to send request');
    } finally {
      loading.value = false;
    }
  };

  const handleCancelRequest = async (requestId) => {
    loading.value = true;
    try {
      const request = allRequests.value.find((r) => r.request_id === requestId);
      if (!request) {
        showToast('error', 'Request not found');
        return;
      }

      await supplyRequestStore.cancelRequest(
        request.id,
        authStore.user?.name || 'SCM User'
      );

      closeModal();
      showToast('success', 'Request cancelled successfully');

      // Refresh data
      await fetchAllData();
    } catch (err) {
      showToast('error', err.message || 'Failed to cancel request');
    } finally {
      loading.value = false;
    }
  };

  const handleDeleteRequest = async (requestId) => {
    loading.value = true;
    try {
      const request = allRequests.value.find((r) => r.request_id === requestId);
      if (!request) {
        showToast('error', 'Request not found');
        return;
      }

      await supplyRequestStore.deleteRequest(request.id);

      showToast('success', 'Request deleted successfully');

      // Refresh data
      await fetchAllData();
    } catch (err) {
      showToast('error', err.message || 'Failed to delete request');
    } finally {
      loading.value = false;
    }
  };

  // Confirm receipt function using store
  const confirmReceipt = async (requestId) => {
    loading.value = true;
    try {
      // Find the budget release
      const release = pendingReceipts.value.find(
        (r) => r.request_id === requestId
      );
      if (!release) {
        showToast('error', 'Budget release not found');
        return;
      }

      await budgetReleaseStore.confirmReceipt(
        release.id,
        authStore.user?.name || 'SCM User'
      );

      showToast('success', `Receipt confirmed for request #${requestId}`);

      // Refresh data
      await fetchPendingReceipts();
      await fetchAllData();
    } catch (err) {
      showToast('error', err.message || 'Failed to confirm receipt');
    } finally {
      loading.value = false;
    }
  };

  // Enhanced data fetching to include inventory data
  const fetchAllData = async () => {
    loading.value = true;
    try {
      await Promise.all([
        supplyRequestStore.fetchRequests({ department: 'SCM' }),
        supplyRequestStore.fetchStats({ department: 'SCM' }),
        budgetReleaseStore.fetchPendingReceipts('SCM'),
        inventoryStore.fetchCategories(),
        inventoryStore.fetchItemTypes(),
      ]);

      updateQuickDateCounts();
      updateHistoryFilterCounts();
    } catch (err) {
      console.error('Fetch error:', err);
      showToast('error', err.message || 'Failed to fetch data');
    } finally {
      loading.value = false;
    }
  };

  const fetchPendingReceipts = async () => {
    try {
      await budgetReleaseStore.fetchPendingReceipts('SCM');
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
        onConfirm: () => handleUpdateRequest(data.request_id),
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
          }
        : { request_type: '', request_description: '', request_date: '' },
    };

    // If editing or viewing, fetch the full request details including items
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

  // Initialize request form
  const initializeRequestForm = (request = null) => {
    if (request) {
      // Editing existing request
      requestForm.value = {
        request_id: request.request_id,
        request_type: request.request_type || '',
        request_description: request.request_description || '',
        request_date: request.request_date || getPhilippineDateString(),
        priority: request.priority || 'Normal',
        department: request.department || 'SCM',
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
        request_date: getPhilippineDateString(),
        priority: 'Normal',
        department: 'SCM',
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

  // Action methods
  const editRequest = (request) => openModal('edit', request);
  const confirmSend = (request) => openConfirmModal('send', request);
  const confirmCancel = (request) => openConfirmModal('cancel', request);
  const confirmDelete = (request) => openConfirmModal('delete', request);
  const confirmViewRequest = (request) => openModal('viewRequest', request);

  // Clear filters
  const clearAllHistoryFilters = () => {
    clearHistoryFilters();
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

  // History status options for filtering
  const historyStatusOptions = [
    'Pending',
    'Sent',
    'Completed',
    'Rejected',
    'Cancelled',
  ];

  // Watch for changes and update counts
  watch(
    [allRequests, requestListFilter],
    () => {
      allRequests.value.forEach((r) => {
        const backendDate = r.request_date;
        const convertedDate = new Date(backendDate).toISOString().split('T')[0];
      });
      updateQuickDateCounts();
      updateHistoryFilterCounts(); // Add this line
    },
    { deep: true, immediate: true }
  );

  // Add a new watcher specifically for history filter counts
  watch(
    [allRequests, historyFilterType],
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

  onMounted(async () => {
    // Initialize data
    await fetchAllData();

    // Setup date picker
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

  // Update stats display to use store stats
  const statsDisplay = computed(() => ({
    total: supplyRequestStore.stats.total_requests || allRequests.value.length,
    toRequest:
      supplyRequestStore.stats.to_request ||
      allRequests.value.filter((r) => r.request_status === 'To Request').length,
    pending:
      supplyRequestStore.stats.pending ||
      allRequests.value.filter((r) => r.request_status === 'Pending').length,
    approved:
      supplyRequestStore.stats.approved ||
      allRequests.value.filter((r) => r.request_status === 'Approved').length,
    rejected:
      supplyRequestStore.stats.rejected ||
      allRequests.value.filter((r) => r.request_status === 'Rejected').length,
  }));

  // Enhanced error handling
  const handleStoreError = (error, operation) => {
    console.error(`Error during ${operation}:`, error);
    showToast('error', error.message || `Failed to ${operation}`);
  };

  // Watch for store errors
  watch(
    [() => supplyRequestStore.error, () => budgetReleaseStore.error],
    ([supplyError, budgetError]) => {
      if (supplyError) {
        handleStoreError(supplyError, 'supply request operation');
        supplyRequestStore.error = null; // Clear error after handling
      }
      if (budgetError) {
        handleStoreError(budgetError, 'budget release operation');
        budgetReleaseStore.clearError(); // Use store method to clear error
      }
    }
  );

  // Enhanced data refresh with error handling
  const refreshAllData = async () => {
    try {
      loading.value = true;
      await Promise.all([fetchAllData(), fetchPendingReceipts()]);
    } catch (error) {
      handleStoreError(error, 'refresh data');
    } finally {
      loading.value = false;
    }
  };

  // Auto-refresh data periodically (optional)
  let refreshInterval;
  onMounted(() => {
    // Set up auto-refresh every 5 minutes
    refreshInterval = setInterval(refreshAllData, 5 * 60 * 1000);
  });

  onBeforeUnmount(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  // Add more comprehensive stats using backend data
  const enhancedStats = computed(() => ({
    totalRequests: allRequests.value.length,
    toRequest: allRequests.value.filter(
      (r) => r.request_status === 'To Request'
    ).length,
    pending: allRequests.value.filter((r) => r.request_status === 'Pending')
      .length,
    approved: allRequests.value.filter((r) => r.request_status === 'Approved')
      .length,
    rejected: allRequests.value.filter((r) => r.request_status === 'Rejected')
      .length,
    totalAmount: allRequests.value.reduce(
      (sum, r) => sum + parseFloat(r.total_amount || 0),
      0
    ),
    totalItems: allRequests.value.reduce(
      (sum, r) => sum + parseInt(r.item_count || 0),
      0
    ),
  }));

  const showReceiptModal = async (request) => {
    // If items are not present, fetch full request details
    if (!request.items || request.items.length === 0) {
      const fullRequest = await supplyRequestStore.fetchRequestByRequestId(
        request.request_id
      );
      receiptData.value = fullRequest;
    } else {
      receiptData.value = request;
    }
    showReceipt.value = true;
  };

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
          {{ requestStats.total_requests || allRequests.length }}
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
            requestStats.to_request ||
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
            requestStats.approved ||
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
          {{
            requestStats.pending ||
            allRequests.filter((r) => r.request_status === 'Pending').length
          }}
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
            requestStats.rejected ||
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
          <PhilippinePeso class="w-8 h-8 text-success" />
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
                  <div>
                    <span>{{ formatManilaDate(release.released_at) }}</span>
                    <!-- Remove or comment out the time line -->
                    <!-- <span class="text-xs text-black/50">{{ formatManilaTime(release.released_at) }}</span> -->
                  </div>
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
          <div class="flex gap-2 md:flex-row flex-col">
            <button
              class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
              @click="fetchAllData"
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
                <th>Total Amount</th>
                <th>Items</th>
                <th>Priority</th>
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
                <td class="font-mono font-medium">{{ request.request_id }}</td>
                <td>
                  <div class="flex flex-col">
                    <span>{{ formatManilaDate(request.request_date) }}</span>
                    <!-- Remove or comment out the time line -->
                    <!-- <span class="text-xs text-black/50">{{ formatManilaTime(request.request_date) }}</span> -->
                  </div>
                </td>
                <td class="text-wrap">
                  <div>
                    <p class="font-medium">{{ request.request_description }}</p>
                    <p class="text-xs text-black/50">
                      {{ request.request_type }}
                    </p>
                  </div>
                </td>
                <!-- Add total amount column -->
                <td class="font-semibold text-primaryColor">
                  ₱{{
                    parseFloat(request.total_amount || 0).toLocaleString(
                      'en-PH',
                      {
                        minimumFractionDigits: 2,
                      }
                    )
                  }}
                </td>
                <!-- Add item count -->
                <td class="text-center">
                  <span
                    class="badge badge-sm bg-primaryColor/10 text-primaryColor"
                  >
                    {{ request.item_count }} item{{
                      request.item_count !== '1' ? 's' : ''
                    }}
                  </span>
                </td>
                <!-- Add priority -->
                <td>
                  <div
                    class="badge badge-sm border-none"
                    :class="{
                      'bg-error/10 text-error': request.priority === 'Urgent',
                      'bg-warning/10 text-warning': request.priority === 'High',
                      'bg-info/10 text-info': request.priority === 'Normal',
                      'bg-success/10 text-success': request.priority === 'Low',
                    }"
                  >
                    {{ request.priority }}
                  </div>
                </td>
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
                        v-if="
                          request.request_status === 'To Request' ||
                          request.request_status === 'Sent Back'
                        "
                      >
                        <a @click="editRequest(request)" class="text-warning"
                          >Edit</a
                        >
                      </li>
                      <li
                        class="hover:bg-black/10"
                        v-if="
                          request.request_status === 'To Request' ||
                          request.request_status === 'Sent Back'
                        "
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
                        v-if="
                          request.request_status === 'To Request' ||
                          request.request_status === 'Sent Back'
                        "
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
                    @click="clearHistoryFilters"
                  >
                    <RefreshCcw class="w-4 h-4 mr-1" />
                    Clear
                  </button>
                </div>
              </div>
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
                  filteredRequestHistoryByDate.filter(
                    (r) => r.request_status === status
                  ).length
                }}
              </span>
            </button>
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

                <td class="text-sm">
                  <div>
                    <span>{{ formatManilaDate(request.request_date) }}</span>
                    <!-- Remove or comment out the time line -->
                    <!-- <span class="text-xs text-black/50">{{ formatManilaTime(request.request_date) }}</span> -->
                  </div>
                </td>

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
                    v-if="request.request_status === 'Completed'"
                    class="text-primaryColor cursor-pointer underline hover:text-primaryColor/80 text-sm font-medium"
                    @click="showReceiptModal(request)"
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
                <input
                  v-model="row.item_unit"
                  type="text"
                  class="input input-xs w-full bg-gray-100 border-primaryColor/30 text-black/70"
                  readonly
                  :placeholder="getUnitOfMeasure(row.item_type)"
                />
              </td>

              <td>
                <select v-model="row.item_type">
                  <option value="" disabled>Category</option>
                  <option
                    v-for="itemType in availableItemTypes"
                    :key="itemType.id"
                    :value="itemType.name"
                  >
                    {{ itemType.name }}
                  </option>
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
            <thead class="text-black">
              <tr class="text-black border border-black/50">
                <th class="text-black border border-black/50">Item No.</th>
                <th class="text-black border border-black/50">Item Name</th>
                <th class="text-black border border-black/50">Quantity</th>
                <th class="text-black border border-black/50">Unit</th>
                <th class="text-black border border-black/50">Type</th>
                <th class="text-black border border-black/50">Unit Price</th>
                <th class="text-black border border-black/50">Amount (₱)</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in paginatedRequestModal"
                :key="row.id"
                class="border border-black/50"
              >
                <td class="">{{ row.id }}</td>
                <td class="text-black border border-black/50">
                  {{ row.item_name }}
                </td>
                <td class="text-black border border-black/50">
                  {{ row.item_quantity }}
                </td>
                <td class="text-black border border-black/50">
                  {{ row.item_unit }}
                </td>
                <td class="text-black border border-black/50">
                  {{ row.item_type }}
                </td>
                <td class="text-black border border-black/50">
                  {{ row.item_unitPrice }}
                </td>
                <td class="text-black border border-black/50">
                  {{ row.item_amount }}
                </td>
              </tr>
              <tr class="text-black border border-black/50">
                <td
                  colspan="6"
                  class="text-right font-semibold border border-black/50"
                >
                  Total
                </td>
                <td class="font-semibold">₱ {{ totalAmount }}</td>
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
                  <input
                    v-model="row.item_unit"
                    type="text"
                    class="input input-xs w-full bg-gray-100 border-primaryColor/30 text-black/70"
                    readonly
                    :placeholder="getUnitOfMeasure(row.item_type)"
                  />
                </td>

                <td>
                  <select v-model="row.item_type">
                    <option value="" disabled>Category</option>
                    <option
                      v-for="itemType in availableItemTypes"
                      :key="itemType.id"
                      :value="itemType.name"
                    >
                      {{ itemType.name }}
                    </option>
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

      <!-- Request Information Form with Centralized Categories -->
      <div
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 bg-white/5 rounded-lg"
      >
        <!-- Inventory Category Selection -->
        <div class="form-control">
          <label class="label">
            <span class="label-text text-black/70 font-medium"
              >Inventory Category <span class="text-red-500">*</span></span
            >
          </label>
          <select
            v-model="selectedCategory"
            @change="onCategoryChange($event.target.value)"
            class="select select-bordered bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            required
          >
            <option value="" disabled>Select Inventory Category</option>
            <option
              v-for="category in requestCategories"
              :key="category.category_id"
              :value="category.category"
            >
              {{ category.category }}
            </option>
          </select>
          <div class="label">
            <span class="label-text-alt text-black/50 text-sm">
              {{
                selectedCategory
                  ? requestCategories.find(
                      (c) => c.category === selectedCategory
                    )?.description
                  : 'Select a category to see description'
              }}
            </span>
          </div>
        </div>

        <!-- Priority Selection -->
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

        <!-- Department Selection -->
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
        </div>

        <!-- Request Date -->
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

        <!-- Requested By -->
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

      <!-- Items Section with Centralized Categories -->
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
                <th class="w-32">Type</th>
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
                  <input
                    v-model="row.item_unit"
                    type="text"
                    class="input input-xs w-full bg-gray-100 border-primaryColor/30 text-black/70"
                    readonly
                    :placeholder="getUnitOfMeasure(row.item_type)"
                  />
                </td>

                <td>
                  <select
                    v-model="row.item_type"
                    @change="onItemTypeChange(row)"
                    class="select select-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor"
                  >
                    <option value="" disabled>Type</option>
                    <option
                      v-for="itemType in availableItemTypes"
                      :key="itemType.id"
                      :value="itemType.name"
                    >
                      {{ itemType.name }}
                    </option>
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

  // Add helper functions for better date/time formatting
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Manila',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-PH', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Enhanced filtering to work with backend date format
  const filteredRequestsByDate = computed(() => {
    const selectedDate = requestListFilter.value.selectedDate;

    allRequests.value.forEach((r) => {
      // Convert UTC to Asia/Manila and get YYYY-MM-DD
      const manilaDate = new Date(
        new Date(r.request_date).toLocaleString('en-US', {
          timeZone: 'Asia/Manila',
        })
      );
      const normalized = manilaDate.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Manila',
      });
      console.log(
        `Request ${r.request_id}: raw=${r.request_date}, manila=${normalized}, matches=${normalized === selectedDate}`
      );
    });

    return allRequests.value.filter((request) => {
      const manilaDate = new Date(
        new Date(request.request_date).toLocaleString('en-US', {
          timeZone: 'Asia/Manila',
        })
      );
      const normalized = manilaDate.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Manila',
      });
      return (
        normalized === selectedDate && request.request_status !== 'Cancelled'
      );
    });
  });

  // Add more comprehensive stats using backend data
  const enhancedStats = computed(() => ({
    totalRequests: allRequests.value.length,
    toRequest: allRequests.value.filter(
      (r) => r.request_status === 'To Request'
    ).length,
    pending: allRequests.value.filter((r) => r.request_status === 'Pending')
      .length,
    approved: allRequests.value.filter((r) => r.request_status === 'Approved')
      .length,
    rejected: allRequests.value.filter((r) => r.request_status === 'Rejected')
      .length,
    totalAmount: allRequests.value.reduce(
      (sum, r) => sum + parseFloat(r.total_amount || 0),
      0
    ),
    totalItems: allRequests.value.reduce(
      (sum, r) => sum + parseInt(r.item_count || 0),
      0
    ),
  }));
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
</style>
