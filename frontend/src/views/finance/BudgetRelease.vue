<script setup>
  import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
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
    Edit,
    FileText,
    DollarSign,
    History,
    Eye,
    PhilippinePeso,
    Info,
    AlertCircle,
  } from 'lucide-vue-next';

  // Stores
  import { useSupplyRequestStore } from '../../stores/supplyRequestStore.js';
  import { useBudgetReleaseStore } from '../../stores/budgetReleaseStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import cashRequestReceiptModal from '../../components/scm/cashRequestReceiptModal.vue';

  // Stores
  const supplyRequestStore = useSupplyRequestStore();
  const budgetReleaseStore = useBudgetReleaseStore();
  const authStore = useAuthStore();

  // Local state
  const loading = ref(false);
  const currentPage = ref(1);
  const requestsPerPage = ref(10);
  const historyCurrentPage = ref(1);
  const historyPerPage = ref(10);
  const activeTab = ref('awaiting');

  // Update computed properties to use real store data
  const approvedRequests = computed(() =>
    supplyRequestStore.requests.filter((r) => r.request_status === 'Approved')
  );

  const budgetReleaseHistory = computed(() => budgetReleaseStore.releases);

  // Enhanced budget release stats using real data
  const budgetReleaseStats = computed(() => {
    const allReleases = budgetReleaseHistory.value || [];
    const confirmed = allReleases.filter((r) => r.receipt_confirmed);
    const pending = allReleases.filter((r) => !r.receipt_confirmed);
    const totalReleased = allReleases.reduce(
      (sum, r) => sum + parseFloat(r.released_amount || 0),
      0
    );
    const totalConfirmed = confirmed.reduce(
      (sum, r) => sum + parseFloat(r.released_amount || 0),
      0
    );

    return {
      total: allReleases.length,
      confirmed: confirmed.length,
      pending: pending.length,
      totalReleased,
      totalConfirmed,
    };
  });

  // Modal state management
  const modal = ref({
    type: null,
    show: false,
    request: null,
    data: {
      release_remarks: '',
    },
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

  // Receipt modal state
  const showReceipt = ref(false);
  const receiptData = ref(null);

  function closeReceipt() {
    showReceipt.value = false;
    receiptData.value = null;
  }

  // Budget release history filter
  const historyFilter = ref({
    searchQuery: '',
    sortBy: 'released_at',
    sortOrder: 'desc',
    receiptStatus: '', // 'confirmed', 'pending', ''
  });

  // History-related reactive variables
  const historyFilterType = ref('today'); // 'today', 'week', 'month', 'custom'
  const showCustomMonthPicker = ref(false);
  const customMonthPicker = ref({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

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

  // Helper to get YYYY-MM-DD in Asia/Manila
  const toManilaYMD = (dateString) => {
    const manilaDate = new Date(
      new Date(dateString).toLocaleString('en-US', { timeZone: 'Asia/Manila' })
    );
    return manilaDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  };

  // Computed properties for filtering and pagination
  const filteredApprovedRequests = computed(() => {
    return approvedRequests.value.filter(
      (r) => r.request_status === 'Approved'
    );
  });

  const paginatedApprovedRequests = computed(() => {
    const start = (currentPage.value - 1) * requestsPerPage.value;
    return filteredApprovedRequests.value.slice(
      start,
      start + requestsPerPage.value
    );
  });

  const totalPages = computed(() => {
    return Math.ceil(
      filteredApprovedRequests.value.length / requestsPerPage.value
    );
  });

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

  // Clear all filters
  const clearAllFilters = () => {
    historyFilter.value = {
      searchQuery: '',
      sortBy: 'released_at',
      sortOrder: 'desc',
      receiptStatus: '',
    };
    historyFilterType.value = 'today';
    historyCurrentPage.value = 1;
    showCustomMonthPicker.value = false;
    customMonthPicker.value = {
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    };
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    historyFilter.value.sortOrder =
      historyFilter.value.sortOrder === 'asc' ? 'desc' : 'asc';
  };

  // Update filter option counts
  const updateHistoryFilterCounts = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    historyFilterOptions.value.forEach((option) => {
      let count = 0;

      switch (option.type) {
        case 'today':
          count = budgetReleaseHistory.value.filter((release) => {
            const releaseDate = new Date(release.released_at);
            releaseDate.setHours(0, 0, 0, 0);
            return releaseDate.getTime() === today.getTime();
          }).length;
          break;

        case 'week':
          const startOfWeek = getStartOfWeek(today);
          const endOfWeek = new Date(today);
          endOfWeek.setHours(23, 59, 59, 999);

          count = budgetReleaseHistory.value.filter((release) => {
            const releaseDate = new Date(release.released_at);
            return isDateInRange(releaseDate, startOfWeek, endOfWeek);
          }).length;
          break;

        case 'month':
          const startOfMonth = getStartOfMonth(today);
          const endOfMonth = new Date(today);
          endOfMonth.setHours(23, 59, 59, 999);

          count = budgetReleaseHistory.value.filter((release) => {
            const releaseDate = new Date(release.released_at);
            return isDateInRange(releaseDate, startOfMonth, endOfMonth);
          }).length;
          break;
      }

      option.count = count;
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Release ID',
      'Request ID',
      'Description',
      'Released Amount',
      'Released Date',
      'Released By',
      'Receipt Confirmed',
      'Confirmed Date',
      'Department',
      'Requested By',
    ];
    const csvContent = [
      headers.join(','),
      ...filteredBudgetHistory.value.map((release) =>
        [
          release.release_id,
          release.request_id,
          `"${release.request_description.replace(/"/g, '""')}"`,
          release.released_amount,
          release.released_at,
          release.released_by,
          release.receipt_confirmed ? 'Yes' : 'No',
          release.receipt_confirmed_at || 'N/A',
          release.department,
          release.requested_by,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `budget_release_history_${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auto-reset pagination when filters change
  watch(
    historyFilter,
    () => {
      historyCurrentPage.value = 1;
    },
    { deep: true }
  );

  // Watch for changes and update counts
  watch(
    [budgetReleaseHistory, historyFilterType],
    () => {
      updateHistoryFilterCounts();
    },
    { deep: true, immediate: true }
  );

  // Modal methods
  const openModal = async (type, request = null) => {
    modal.value = {
      type,
      show: true,
      request: null,
      data: {},
    };

    if (type === 'viewRequest' && request) {
      // Fetch the full request details with items
      const fullRequest = await supplyRequestStore.fetchRequestByRequestId(
        request.request_id
      );
      modal.value.request = fullRequest;
    } else {
      modal.value.request = request;
    }

    document.getElementById('universal_modal').showModal();
  };

  const closeModal = () => {
    document.getElementById('universal_modal')?.close();
    document.getElementById('confirmation_modal')?.close();
    modal.value = {
      type: null,
      show: false,
      request: null,
      data: {
        release_remarks: '',
      },
    };
  };

  // Enhanced confirmation modal functions
  const openConfirmModal = (type, data = null, customConfig = {}) => {
    const configs = {
      release: {
        title: 'Release Budget',
        message: `Are you sure you want to release budget?`,
        confirmText: 'Release Budget',
        confirmClass: 'bg-primaryColor text-white hover:bg-primaryColor/80',
        onConfirm: () => handleBudgetRelease(data.request_id),
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

  // Budget release function using real store
  const handleBudgetRelease = async (requestId) => {
    loading.value = true;
    try {
      // Find the approved request
      const request = approvedRequests.value.find(
        (r) => r.request_id === requestId
      );
      if (!request) {
        showToast('error', 'Request not found');
        return;
      }

      // Use the store to release budget (pass an object!)
      await budgetReleaseStore.releaseBudget({
        supply_request_id: request.id, // numeric id
        released_amount: Number(request.total_amount),
        released_by: authStore.user?.name || 'Finance Manager',
        release_remarks:
          modal.value.data.release_remarks || 'Budget released as approved',
      });

      closeModal();
      showToast(
        'success',
        `Budget released successfully for request #${requestId}. SCM will be notified.`
      );

      // Refresh data
      await fetchData();
    } catch (err) {
      showToast('error', err.message || 'Failed to release budget');
    } finally {
      loading.value = false;
    }
  };

  // Action methods
  const viewRequest = (request) => openModal('viewRequest', request);
  const releaseBudget = (request) => openModal('release', request);

  // Receipt modal function
  const showReceiptModal = async (release) => {
    try {
      // Fetch the full request details for the receipt
      const fullRequest = await supplyRequestStore.fetchRequestByRequestId(
        release.request_id
      );
      receiptData.value = fullRequest;
    } catch (error) {
      console.error('Error fetching request details:', error);
      // Fallback to basic release data
      receiptData.value = release;
    }
    showReceipt.value = true;
  };

  // Add data fetching functions
  const fetchData = async () => {
    loading.value = true;
    try {
      // Fetch approved requests and budget release history
      await Promise.all([
        supplyRequestStore.fetchRequests(),
        budgetReleaseStore.fetchReleases(),
        supplyRequestStore.fetchStats(),
      ]);

      // Update filter counts after data is loaded
      updateHistoryFilterCounts();
    } catch (err) {
      showToast('error', err.message || 'Failed to fetch data');
    } finally {
      loading.value = false;
    }
  };

  // Update the fetchApprovedRequests function
  const fetchApprovedRequests = async () => {
    loading.value = true;
    try {
      await supplyRequestStore.fetchRequests({ status: 'Approved' });
    } catch (err) {
      showToast('error', err.message || 'Failed to fetch approved requests');
    } finally {
      loading.value = false;
    }
  };

  // Smart pagination helper
  const getPageRange = () => {
    const current = historyCurrentPage.value;
    const total = totalHistoryPages.value;
    const range = [];

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== total) {
        range.push(i);
      }
    }

    return range;
  };

  // Date picker setup
  let datePicker = null;

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

  onMounted(async () => {
    // Initialize data using stores
    await fetchData();

    // Update filter counts
    updateHistoryFilterCounts();
  });

  onBeforeUnmount(() => {
    if (datePicker) datePicker.destroy();
  });

  // Filter selection methods
  const selectHistoryFilter = (option) => {
    historyFilterType.value = option.type;
    historyCurrentPage.value = 1;
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
    historyCurrentPage.value = 1;
    showCustomMonthPicker.value = false;
  };

  // Handle dropdown change for history date filter
  const onHistoryFilterChange = () => {
    historyCurrentPage.value = 1;
    showCustomMonthPicker.value = historyFilterType.value === 'custom';
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

  // Computed properties for Budget Release History
  const filteredBudgetHistoryByDate = computed(() => {
    let filtered = [...(budgetReleaseHistory.value || [])];

    // Apply date filtering based on filter type
    if (historyFilterType.value) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (historyFilterType.value) {
        case 'today':
          filtered = filtered.filter((release) => {
            const releaseDate = new Date(release.released_at);
            releaseDate.setHours(0, 0, 0, 0);
            return releaseDate.getTime() === today.getTime();
          });
          break;

        case 'week':
          const startOfWeek = getStartOfWeek(today);
          const endOfWeek = new Date(today);
          endOfWeek.setHours(23, 59, 59, 999);

          filtered = filtered.filter((release) => {
            const releaseDate = new Date(release.released_at);
            return isDateInRange(releaseDate, startOfWeek, endOfWeek);
          });
          break;

        case 'month':
          const startOfMonth = getStartOfMonth(today);
          const endOfMonth = new Date(today);
          endOfMonth.setHours(23, 59, 59, 999);

          filtered = filtered.filter((release) => {
            const releaseDate = new Date(release.released_at);
            return isDateInRange(releaseDate, startOfMonth, endOfMonth);
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

            filtered = filtered.filter((release) => {
              const releaseDate = new Date(release.released_at);
              return isDateInRange(
                releaseDate,
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

  const filteredBudgetHistory = computed(() => {
    let filtered = [...filteredBudgetHistoryByDate.value];

    // Filter by receipt status
    if (historyFilter.value.receiptStatus === 'confirmed') {
      filtered = filtered.filter((r) => r.receipt_confirmed);
    } else if (historyFilter.value.receiptStatus === 'pending') {
      filtered = filtered.filter((r) => !r.receipt_confirmed);
    }

    // Filter by search query
    if (historyFilter.value.searchQuery) {
      const q = historyFilter.value.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.request_description || '').toLowerCase().includes(q) ||
          (r.request_id || '').toString().toLowerCase().includes(q) ||
          (r.release_id || '').toString().toLowerCase().includes(q)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const field = historyFilter.value.sortBy || 'released_at';
      const order = historyFilter.value.sortOrder === 'asc' ? 1 : -1;
      return (a[field] > b[field] ? 1 : -1) * order;
    });

    return filtered;
  });

  const paginatedBudgetHistory = computed(() => {
    const start = (historyCurrentPage.value - 1) * historyPerPage.value;
    return filteredBudgetHistory.value.slice(
      start,
      start + historyPerPage.value
    );
  });

  const totalHistoryPages = computed(() => {
    return Math.ceil(filteredBudgetHistory.value.length / historyPerPage.value);
  });
</script>

<template>
  <div class="container mx-auto p-6 max-w-7xl">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-primaryColor mb-2 text-shadow-xs">
        Budget Release
      </h1>

      <p class="text-black/50">
        Release approved budgets and track budget release history for Finance
        Department.
      </p>
    </div>

    <!-- Stats -->
    <div
      class="stats shadow w-full mb-6 bg-accentColor border border-black/10 stats-vertical lg:stats-horizontal rounded-lg"
    >
      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Clock class="w-8 h-8 text-warning" />
        </div>
        <div class="stat-title text-black/50">Awaiting Release</div>
        <div class="stat-value text-warning">
          {{ approvedRequests.length }}
        </div>
        <div class="stat-desc text-black/50">
          Approved requests pending budget release
        </div>
      </div>
      <!-- 
      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <PhilippinePeso class="w-8 h-8 text-success" />
        </div>
        <div class="stat-title text-black/50">Total Released</div>
        <div class="stat-value text-success">
          {{ budgetReleaseStats.total }}
        </div>
        <div class="stat-desc text-black/50">Budget releases made</div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <CheckCircle class="w-8 h-8 text-info" />
        </div>
        <div class="stat-title text-black/50">Receipt Confirmed</div>
        <div class="stat-value text-info">
          {{ budgetReleaseStats.confirmed }}
        </div>
        <div class="stat-desc text-black/50">Confirmed by SCM</div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <PhilippinePeso class="w-8 h-8 text-primaryColor" />
        </div>
        <div class="stat-title text-black/50">Total Value Released</div>
        <div class="stat-value text-primaryColor text-lg">
          ₱{{ budgetReleaseStats.totalReleased.toLocaleString('en-PH') }}
        </div>
        <div class="stat-desc text-black/50">Total budget released</div>
      </div> -->
    </div>

    <!-- Tab System -->
    <div
      class="card bg-accentColor shadow-xl mb-6 border border-black/10 mx-auto"
    >
      <div class="card-body p-0">
        <!-- Tab Navigation -->
        <div class="tabs tabs-boxed bg-white/5 p-2">
          <button
            class="tab tab-lg font-medium"
            :class="{
              'tab-active  text-black': activeTab === 'awaiting',
              'text-black/70 hover:bg-white/10': activeTab !== 'awaiting',
            }"
            @click="activeTab = 'awaiting'"
          >
            <ReceiptText class="w-4 h-4 mr-2" />
            Pending Budget Release
          </button>

          <button
            class="tab tab-lg font-medium"
            :class="{
              'tab-active text-black': activeTab === 'history',
              'text-black/70 hover:bg-white/10': activeTab !== 'history',
            }"
            @click="activeTab = 'history'"
          >
            <History class="w-4 h-4 mr-2" />
            Release History
          </button>
        </div>

        <!-- Approved Requests Awaiting Budget Release -->
        <div v-if="activeTab === 'awaiting'" class="px-6 py-2">
          <div class="card bg-accentColor shadow-none mb-6 border-0 mx-auto">
            <div class="card-body">
              <div class="flex justify-between items-center mb-4">
                <h2 class="card-title text-primaryColor">
                  Approved Requests - Awaiting Budget Release
                </h2>
                <div class="flex gap-2">
                  <button
                    class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
                    @click="fetchData"
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

              <!-- Loading State -->
              <div
                v-if="loading && approvedRequests.length === 0"
                class="flex justify-center py-8"
              >
                <span class="loading loading-spinner loading-xs"></span>
              </div>

              <!-- Empty State -->
              <div
                v-else-if="filteredApprovedRequests.length === 0"
                class="text-center py-8"
              >
                <div class="mb-4 items-center justify-center flex">
                  <PhilippinePeso class="w-16 h-16 text-primaryColor" />
                </div>
                <h3 class="text-lg font-semibold mb-2 text-primaryColor">
                  No approved requests awaiting budget release
                </h3>
                <p class="text-black/50 mb-4">
                  All approved requests have been processed or no requests are
                  currently approved.
                </p>
              </div>

              <!-- Table List -->
              <div v-else class="overflow-x-auto bg-accentColor">
                <table
                  class="table table-zebra text-black/50 border border-black/10 custom-zebra"
                >
                  <thead class="text-black/60 bg-white/5">
                    <tr class="">
                      <th>Requested By</th>
                      <th>Priority</th>
                      <th class="w-1/4">Description</th>
                      <th>Amount</th>
                      <th>Approved Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="request in paginatedApprovedRequests"
                      :key="request.request_id"
                      class="hover:bg-success/5"
                    >
  
                      <td>{{ request.requested_by }}</td>
                      <td>
                        <div
                          class="badge badge-sm border-none"
                          :class="{
                            'bg-error/20 text-error':
                              request.priority === 'Urgent',
                            'bg-warning/20 text-warning':
                              request.priority === 'High',
                            'bg-info/20 text-info':
                              request.priority === 'Normal',
                            'bg-success/20 text-success':
                              request.priority === 'Low',
                          }"
                        >
                          {{ request.priority }}
                        </div>
                      </td>
                      <td class="text-wrap">
                        {{ request.request_description }}
                      </td>
    <td class="font-semibold text-black/80">
  <font-awesome-icon icon="fa-solid fa-peso-sign" />
  {{
    Number(request.total_amount).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }}
</td>
                      <td>
                        <div class="flex flex-col">
                          <span>{{
                            new Date(request.approved_at).toLocaleDateString(
                              'en-PH'
                            )
                          }}</span>
                          <span class="text-xs text-black/40">
                            {{
                              new Date(request.approved_at).toLocaleTimeString(
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
                      <td>
                        <div class="dropdown dropdown-left dropdown-end ">
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
                                @click="viewRequest(request)"
                                class="text-primary"
                              >
                                View Details
                              </a>
                            </li>
                            <li class="hover:bg-black/10">
                              <a
                                @click="releaseBudget(request)"
                                class="text-success"
                              >
                                Release Budget
                              </a>
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Pagination -->
              <div
                class="flex flex-col sm:flex-row justify-between items-center mt-4"
                v-if="totalPages > 1"
              >
                <div class="text-sm text-black/60 mb-2 sm:mb-0">
                  Showing {{ (currentPage - 1) * requestsPerPage + 1 }} to
                  {{
                    Math.min(
                      currentPage * requestsPerPage,
                      filteredApprovedRequests.length
                    )
                  }}
                  of {{ filteredApprovedRequests.length }} approved requests
                </div>

                <div class="join space-x-1">
                  <button
                    class="join-item btn font-thin !bg-gray-200 text-black/50 btn-sm border border-none hover:bg-gray-300"
                    :disabled="currentPage <= 1"
                    @click="currentPage--"
                  >
                    « Prev
                  </button>

                  <button
                    class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
                    v-for="page in totalPages"
                    :key="page"
                    :class="{
                      'btn-active !bg-primaryColor text-white':
                        currentPage === page,
                    }"
                    @click="currentPage = page"
                  >
                    {{ page }}
                  </button>

                  <button
                    class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
                    :disabled="currentPage >= totalPages"
                    @click="currentPage++"
                  >
                    Next »
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Budget Release History -->
        <div v-if="activeTab === 'history'" class="px-6 py-2">
          <div class="card bg-accentColor shadow-none mb-6 border-0 mx-auto">
            <div class="card-body">
              <!-- Header with Stats -->
              <div
                class="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6"
              >
                <div>
                  <h2 class="card-title text-primaryColor mb-2">
                    Budget Release History
                  </h2>
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
                      v-model="historyFilter.searchQuery"
                      type="text"
                      placeholder="Search by description, request ID, or release ID..."
                      class="input input-sm input-bordered bg-white border-primaryColor/30 text-black/70 pl-10 w-full shadow-none"
                    />
                  </div>
                </div>

                <!-- Receipt Status Filter (Dropdown) -->
                <div class="flex flex-wrap gap-2 mb-4 items-center">
                  <span class="text-sm text-black/60">Receipt Status:</span>
                  <select
                    v-model="historyFilter.receiptStatus"
                    class="select select-sm select-bordered bg-white border-primaryColor/30 text-black/70"
                  >
                    <option :value="''">
                      All ({{ budgetReleaseHistory?.length || 0 }})
                    </option>
                    <option value="confirmed">
                      Receipt Confirmed ({{ budgetReleaseStats.confirmed }})
                    </option>
                    <option value="pending">
                      Receipt Pending ({{ budgetReleaseStats.pending }})
                    </option>
                  </select>
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
                          Showing {{ filteredBudgetHistory.length }} release{{
                            filteredBudgetHistory.length !== 1 ? 's' : ''
                          }}
                        </p>
                      </div>
                    </div>

                    <!-- Filter Controls -->
                    <div
                      class="flex flex-col sm:flex-row gap-3 items-start sm:items-center"
                    >
                      <!-- Dropdown for date filters -->
                      <div class="flex items-center gap-2">
                        <select
                          v-model="historyFilterType"
                          @change="onHistoryFilterChange"
                          class="select select-sm select-bordered bg-white border-primaryColor/30 text-black/70"
                        >
                          <option
                            v-for="option in historyFilterOptions"
                            :key="option.type"
                            :value="option.type"
                          >
                            {{ option.label }} ({{ option.count }})
                          </option>
                          <option value="custom">Custom Month</option>
                        </select>
                      </div>

                      <!-- Inline Custom Month Picker (shown when Custom Month is selected) -->
                      <div
                        v-if="historyFilterType === 'custom'"
                        class="flex items-center gap-3"
                      >
                        <!-- Month Selection -->
                        <div class="grid grid-cols-3 gap-2">
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
                        <div class="flex items-center gap-2">
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

                        <div class="flex gap-2">
                          <button
                            @click="applyCustomMonthFilter"
                            class="btn btn-xs bg-primaryColor text-white font-thin"
                          >
                            Apply
                          </button>
                          <button
                            @click="clearAllFilters"
                            class="btn btn-xs btn-ghost font-thin"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      <!-- Clear Filters Button -->
                      <div class="flex items-center">
                        <button
                          class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
                          @click="clearAllFilters"
                        >
                          <RefreshCcw class="w-4 h-4 mr-1" />
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Budget Release History Table -->
              <div class="overflow-x-auto bg-accentColor">
                <table
                  class="table table-sm table-zebra text-black/50 border border-black/10 custom-zebra"
                >
                  <thead class="">
                    <tr class="">
                      <th class="w-16">No.</th>
                      <th class="min-w-64">Description</th>
                      <th class="w-32">Released Amount</th>
                      <th class="w-28">Released Date</th>
                      <th class="w-24">Released By</th>
                      <th class="w-32">Receipt Status</th>
                      <th class="w-28">Confirmed Date</th>
                      <th class="w-24">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    <!-- Empty State -->
                    <tr
                      v-if="
                        filteredBudgetHistory &&
                        filteredBudgetHistory.length === 0
                      "
                    >
                      <td colspan="10" class="text-center py-12">
                        <div class="flex flex-col items-center gap-3">
                          <div
                            class="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center"
                          >
                            <Search class="w-8 h-8 text-black/30" />
                          </div>
                          <div>
                            <h3 class="font-semibold text-black/70 mb-1">
                              No budget releases found
                            </h3>
                            <p class="text-sm text-black/50 mb-3">
                              No budget release history matches your current
                              filters
                            </p>
                            <button
                              class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10 font-thin"
                              @click="clearAllFilters"
                            >
                              Clear All Filters
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>

                    <!-- Data Rows -->
                    <tr
                      v-for="(release, index) in paginatedBudgetHistory"
                      :key="release.release_id"
                      class="hover:bg-primaryColor/5"
                    >
                      <td class="font-medium text-center">
                        {{
                          (historyCurrentPage - 1) * historyPerPage + index + 1
                        }}
                      </td>

                      <td class="max-w-xs">
                        <div
                          class="tooltip tooltip-top"
                          :data-tip="release.request_description"
                        >
                          <p class="truncate font-medium">
                            {{ release.request_description }}
                          </p>
                        </div>
                      </td>

                      <td class="font-semibold text-left">
                        ₱{{
                          release.released_amount.toLocaleString('en-PH', {
                            minimumFractionDigits: 2,
                          })
                        }}
                      </td>

                      <td class="text-sm">
                        <div>
                          <span>{{
                            formatManilaDate(release.released_at)
                          }}</span>
                          <br />
                          <span class="text-xs text-black/50">
                            {{ formatManilaTime(release.released_at) }}
                          </span>
                        </div>
                      </td>

                      <td class="text-sm">{{ release.released_by }}</td>

                      <td>
                        <div
                          class="badge badge-sm border-none font-medium"
                          :class="{
                            'bg-success/20 text-success':
                              release.receipt_confirmed,
                            'bg-warning/20 text-warning':
                              !release.receipt_confirmed,
                          }"
                        >
                          {{
                            release.receipt_confirmed ? 'Confirmed' : 'Pending'
                          }}
                        </div>
                      </td>

                      <td class="text-sm">
                        <div v-if="release.receipt_confirmed_at">
                          <span>{{
                            formatManilaDate(release.receipt_confirmed_at)
                          }}</span>
                          <br />
                          <span class="text-xs text-black/50">
                            {{ formatManilaTime(release.receipt_confirmed_at) }}
                          </span>
                        </div>
                        <span v-else>N/A</span>
                      </td>

                      <td>
                        <a
                          v-if="release.receipt_confirmed"
                          class="text-primaryColor cursor-pointer underline hover:text-primaryColor/80 text-sm font-medium"
                          @click="showReceiptModal(release)"
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
                v-if="totalHistoryPages > 1"
              >
                <!-- Summary -->
                <div class="text-sm text-black/60 flex flex-wrap gap-4">
                  <span>
                    Showing
                    {{ (historyCurrentPage - 1) * historyPerPage + 1 }} to
                    {{
                      Math.min(
                        historyCurrentPage * historyPerPage,
                        filteredBudgetHistory.length
                      )
                    }}
                    of {{ filteredBudgetHistory.length }} records for
                    {{ getHistoryFilterDisplayText() }}
                  </span>
                </div>

                <!-- Pagination -->
                <div class="join space-x-1">
                  <button
                    class="join-item btn font-thin !bg-gray-200 text-black/50 btn-sm border border-none hover:bg-gray-300"
                    :disabled="historyCurrentPage <= 1"
                    @click="historyCurrentPage--"
                  >
                    « Prev
                  </button>

                  <button
                    v-if="totalHistoryPages > 1"
                    class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
                    :class="{
                      'btn-active !bg-primaryColor text-white':
                        historyCurrentPage === 1,
                    }"
                    @click="historyCurrentPage = 1"
                  >
                    1
                  </button>

                  <button
                    v-for="page in getPageRange()"
                    :key="page"
                    class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
                    :class="{
                      'btn-active !bg-primaryColor text-white':
                        historyCurrentPage === page,
                    }"
                    @click="historyCurrentPage = page"
                  >
                    {{ page }}
                  </button>

                  <button
                    v-if="
                      totalHistoryPages > 1 &&
                      historyCurrentPage < totalHistoryPages
                    "
                    class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
                    :class="{
                      'btn-active !bg-primaryColor text-white':
                        historyCurrentPage === totalHistoryPages,
                    }"
                    @click="historyCurrentPage = totalHistoryPages"
                  >
                    {{ totalHistoryPages }}
                  </button>

                  <button
                    class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
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
    </div>
  </div>

  <!-- Universal Modal for View/Release -->
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
          <div>
            <span class="text-sm text-black/60">Approved Date:</span>
            <p class="font-medium">
              {{
                new Date(modal.request?.approved_at).toLocaleDateString('en-PH')
              }}
            </p>
          </div>
          <div>
            <span class="text-sm text-black/60">Finance Remarks:</span>
            <p class="font-medium">{{ modal.request?.finance_remarks }}</p>
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
              <tr v-for="item in modal.request?.items || []" :key="item.id">
                <td class="border border-black">{{ item.id }}</td>
                <td class="border border-black">{{ item.item_name }}</td>
                <td class="border border-black">{{ item.item_quantity }}</td>
                <td class="border border-black">{{ item.item_unit }}</td>
                <td class="border border-black">{{ item.item_type }}</td>
                <td class="border border-black">
                  ₱{{ Number(item.item_unit_price).toFixed(2) }}
                </td>
                <td class="border border-black">
                  ₱{{ Number(item.item_amount).toFixed(2) }}
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
                  ₱{{ Number(modal.request?.total_amount || 0).toFixed(2) }}
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

      <!-- Budget Release Modal Content -->
      <template v-if="modal.type === 'release'">
        <h3 class="text-lg font-bold mb-4 text-primaryColor">Release Budget</h3>
        <p>
          Are you sure you want to release budget for request
          <strong>#{{ modal.request?.request_id }}</strong
          >?
        </p>
        <div class="bg-white/10 p-3 rounded mt-3 space-y-3">
          <!-- Department -->
          <div class="flex justify-between pb-2">
            <span class="text-sm text-black/60">Department</span>
            <span class="font-medium text-black">
              {{ modal.request?.department }}
            </span>
          </div>

          <!-- Requested By -->
          <div class="flex justify-between pb-2">
            <span class="text-sm text-black/60">Requested By</span>
            <span class="font-medium text-black">
              {{ modal.request?.requested_by }}
            </span>
          </div>

          <!-- Description -->
          <div class="flex justify-between pb-2">
            <span class="text-sm text-black/60">Description</span>
            <span class="font-medium text-black">
              {{ modal.request?.request_description }}
            </span>
          </div>

          <!-- Total Amount -->
          <div class="flex justify-between pb-2">
            <span class="text-sm text-black/60">Total Amount</span>
            <span class="font-semibold text-black">
              ₱{{
                Number(modal.request?.total_amount).toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              }}
            </span>
          </div>

          <!-- Approved Date -->
          <div class="flex justify-between">
            <span class="text-sm text-black/60">Approved Date</span>
            <span class="font-medium text-black">
              {{
                new Date(modal.request?.approved_at).toLocaleDateString('en-PH')
              }}
            </span>
          </div>
        </div>

        <div class="alert bg-info/10 text-info shadow-none border-info mt-4">
          <Info class="w-6 h-6" />
          <span
            >Once released, SCM will be notified and can confirm receipt of the
            budget.</span
          >
        </div>

        <!-- Optional remarks for budget release -->
        <div class="form-control mt-4">
          <label class="label">
            <span class="label-text text-black/70"
              >Release Remarks (Optional)</span
            >
          </label>
          <textarea
            v-model="modal.data.release_remarks"
            class="textarea textarea-bordered w-full bg-white border-primaryColor/30 text-black/70"
            rows="2"
            placeholder="Add any comments about this budget release..."
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
            class="btn bg-primaryColor text-white hover:bg-primaryColor/80 font-thin btn-sm"
            @click="openConfirmModal('release', modal.request)"
            :disabled="loading"
          >
            <span
              class="loading loading-spinner loading-xs"
              v-if="loading"
            ></span>
            {{ loading ? 'Releasing...' : 'Release Budget' }}
          </button>
        </div>
      </template>
    </div>
  </dialog>

  <!-- Enhanced Confirmation Modal -->
  <dialog id="confirmation_modal" class="modal">
    <div class="modal-box bg-accentColor text-black/50 shadow-lg">
      <h3 class="font-bold text-lg mb-4">{{ confirmModal.title }}</h3>

      <div class="py-4">
        <p class="mb-4">{{ confirmModal.message }}</p>

        <!-- Show additional details -->
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

        <!-- Show info for budget release -->
        <div
          v-if="confirmModal.type === 'release'"
          class="alert bg-success/10 border-success text-success mt-3"
        >
          <CheckCircle class="w-6 h-6" />
          <span class="text-sm"
            >This will notify SCM that the budget has been released and is ready
            for confirmation.</span
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

  <!-- Receipt Modal -->
  <cashRequestReceiptModal
    :cashRequestReceipt="{
      show: showReceipt,
      receipt: receiptData,
      onClose: closeReceipt,
    }"
  />
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
