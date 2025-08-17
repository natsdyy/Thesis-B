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

  const loading = ref(false);
  const currentPage = ref(1);
  const requestsPerPage = ref(10);
  const historyCurrentPage = ref(1);
  const historyPerPage = ref(10);

  // Mock data for approved requests awaiting budget release
  const approvedRequests = ref([
    {
      request_id: 2025081401,
      request_date: new Date().toISOString().split('T')[0],
      request_description: 'Office supplies needed for branch operations',
      request_status: 'Approved',
      department: 'SCM',
      requested_by: 'John Doe',
      priority: 'Normal',
      created_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
      approved_by: 'Finance Manager',
      total_amount: 15750.5,
      finance_remarks: 'Approved as requested',
      items: [
        {
          id: 1,
          item_name: 'A4 Paper',
          item_quantity: 10,
          item_unit: 'REAM',
          item_type: 'Office Supplies',
          item_unitPrice: 250.0,
          item_amount: 2500.0,
        },
        {
          id: 2,
          item_name: 'Ballpoint Pens',
          item_quantity: 50,
          item_unit: 'PC',
          item_type: 'Office Supplies',
          item_unitPrice: 15.0,
          item_amount: 750.0,
        },
      ],
    },
    {
      request_id: 2025081402,
      request_date: new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      request_description: 'Raw materials for kitchen operations',
      request_status: 'Approved',
      department: 'SCM',
      requested_by: 'Jane Smith',
      priority: 'High',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      approved_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      approved_by: 'Finance Manager',
      total_amount: 45000.0,
      finance_remarks: 'Approved with quantity adjustments',
      items: [
        {
          id: 1,
          item_name: 'Premium Beef',
          item_quantity: 18, // Adjusted from 20
          item_unit: 'KG',
          item_type: 'Raw Meat',
          item_unitPrice: 800.0,
          item_amount: 14400.0,
        },
        {
          id: 2,
          item_name: 'Fresh Vegetables',
          item_quantity: 15,
          item_unit: 'KG',
          item_type: 'Ingredient',
          item_unitPrice: 150.0,
          item_amount: 2250.0,
        },
      ],
    },
  ]);

  // Mock data for budget release history
  const budgetReleaseHistory = ref([
    {
      release_id: 'BR2025001',
      request_id: 2025081301,
      request_description: 'Kitchen equipment upgrade',
      released_amount: 85000.0,
      released_by: 'Finance Manager',
      released_at: '2025-01-12T14:30:00Z',
      receipt_confirmed: true,
      receipt_confirmed_by: 'SCM Manager',
      receipt_confirmed_at: '2025-01-12T16:45:00Z',
      department: 'SCM',
      requested_by: 'Mike Wilson',
      priority: 'Urgent',
      approval_date: '2025-01-12T10:00:00Z',
    },
    {
      release_id: 'BR2025002',
      request_id: 2025081302,
      request_description: 'Office supplies bulk order',
      released_amount: 25000.0,
      released_by: 'Finance Manager',
      released_at: '2025-01-11T09:15:00Z',
      receipt_confirmed: true,
      receipt_confirmed_by: 'SCM Manager',
      receipt_confirmed_at: '2025-01-11T11:30:00Z',
      department: 'SCM',
      requested_by: 'Sarah Davis',
      priority: 'Normal',
      approval_date: '2025-01-11T08:45:00Z',
    },
    {
      release_id: 'BR2025003',
      request_id: 2025081303,
      request_description: 'Cleaning supplies for all branches',
      released_amount: 8200.25,
      released_by: 'Finance Manager',
      released_at: '2025-01-10T11:20:00Z',
      receipt_confirmed: false, // Still awaiting confirmation
      department: 'SCM',
      requested_by: 'Alice Johnson',
      priority: 'Normal',
      approval_date: '2025-01-10T09:30:00Z',
    },
  ]);

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

  // Budget release history filter
  const historyFilter = ref({
    startDate: '',
    endDate: '',
    searchQuery: '',
    sortBy: 'released_at',
    sortOrder: 'desc',
    receiptStatus: '', // 'confirmed', 'pending', ''
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

  // Budget release history filtering
  const filteredBudgetHistory = computed(() => {
    let filtered = [...budgetReleaseHistory.value];

    // Date range filter
    if (historyFilter.value.startDate) {
      filtered = filtered.filter(
        (release) =>
          new Date(release.released_at) >=
          new Date(historyFilter.value.startDate)
      );
    }

    if (historyFilter.value.endDate) {
      filtered = filtered.filter(
        (release) =>
          new Date(release.released_at) <= new Date(historyFilter.value.endDate)
      );
    }

    // Receipt status filter
    if (historyFilter.value.receiptStatus === 'confirmed') {
      filtered = filtered.filter((release) => release.receipt_confirmed);
    } else if (historyFilter.value.receiptStatus === 'pending') {
      filtered = filtered.filter((release) => !release.receipt_confirmed);
    }

    // Search filter
    if (historyFilter.value.searchQuery) {
      const query = historyFilter.value.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (release) =>
          release.request_description.toLowerCase().includes(query) ||
          release.request_id.toString().includes(query) ||
          release.release_id.toLowerCase().includes(query) ||
          release.requested_by.toLowerCase().includes(query)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      const sortBy = historyFilter.value.sortBy;
      const order = historyFilter.value.sortOrder === 'asc' ? 1 : -1;

      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'released_at' || sortBy === 'receipt_confirmed_at') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (sortBy === 'released_amount' || sortBy === 'request_id') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }

      if (aVal < bVal) return -1 * order;
      if (aVal > bVal) return 1 * order;
      return 0;
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

  // Budget release stats
  const budgetReleaseStats = computed(() => {
    const confirmed = filteredBudgetHistory.value.filter(
      (r) => r.receipt_confirmed
    );
    const pending = filteredBudgetHistory.value.filter(
      (r) => !r.receipt_confirmed
    );
    const totalReleased = filteredBudgetHistory.value.reduce(
      (sum, r) => sum + r.released_amount,
      0
    );
    const totalConfirmed = confirmed.reduce(
      (sum, r) => sum + r.released_amount,
      0
    );

    return {
      total: filteredBudgetHistory.value.length,
      confirmed: confirmed.length,
      pending: pending.length,
      totalReleased,
      totalConfirmed,
    };
  });

  // Clear all filters
  const clearAllFilters = () => {
    historyFilter.value = {
      startDate: '',
      endDate: '',
      searchQuery: '',
      sortBy: 'released_at',
      sortOrder: 'desc',
      receiptStatus: '',
    };
    historyCurrentPage.value = 1;
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    historyFilter.value.sortOrder =
      historyFilter.value.sortOrder === 'asc' ? 'desc' : 'asc';
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

  // Modal methods
  const openModal = async (type, request = null) => {
    modal.value = {
      type,
      show: true,
      request,
      data: {
        release_remarks: '',
      },
    };

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
        message: `Are you sure you want to release budget for request #${data?.request_id}?`,
        confirmText: 'Release Budget',
        confirmClass: 'btn-success',
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

  // Budget release function
  const handleBudgetRelease = async (requestId) => {
    loading.value = true;
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Find the approved request
      const requestIndex = approvedRequests.value.findIndex(
        (r) => r.request_id === requestId
      );

      if (requestIndex !== -1) {
        const request = approvedRequests.value[requestIndex];

        // Generate release ID
        const releaseId = `BR${new Date().getFullYear()}${String(budgetReleaseHistory.value.length + 1).padStart(3, '0')}`;

        // Add to budget release history
        budgetReleaseHistory.value.unshift({
          release_id: releaseId,
          request_id: request.request_id,
          request_description: request.request_description,
          released_amount: request.total_amount,
          released_by: 'Finance Manager', // In real app, get from auth store
          released_at: new Date().toISOString(),
          receipt_confirmed: false,
          department: request.department,
          requested_by: request.requested_by,
          priority: request.priority,
          approval_date: request.approved_at,
          release_remarks:
            modal.value.data.release_remarks || 'Budget released as approved',
        });

        // Remove from approved requests
        approvedRequests.value.splice(requestIndex, 1);
      }

      closeModal();
      showToast(
        'success',
        `Budget released successfully for request #${requestId}. SCM will be notified.`
      );
    } catch (err) {
      showToast('error', 'Failed to release budget');
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Action methods
  const viewRequest = (request) => openModal('viewRequest', request);
  const releaseBudget = (request) => openModal('release', request);

  // Fetch functions
  const fetchApprovedRequests = async () => {
    loading.value = true;
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // In real implementation, fetch approved requests from API
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

  onMounted(() => {
    datePicker = new PikaDay({
      field: document.getElementById('history_date_picker'),
      format: 'YYYY-MM-DD',
    });
  });

  onBeforeUnmount(() => {
    if (datePicker) datePicker.destroy();
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

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <DollarSign class="w-8 h-8 text-success" />
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
      </div>
    </div>

    <!-- Approved Requests Awaiting Budget Release -->
    <div
      class="card bg-accentColor shadow-xl mb-6 border border-black/10 mx-auto"
    >
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h2 class="card-title text-success">
            Approved Requests - Awaiting Budget Release
          </h2>
          <div class="flex gap-2">
            <button
              class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
              @click="fetchApprovedRequests"
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
            <DollarSign class="w-16 h-16 text-primaryColor" />
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
            <thead class="text-secondaryColor">
              <tr class="bg-success text-accentColor">
                <th>Request ID</th>
                <th>Department</th>
                <th>Requested By</th>
                <th>Priority</th>
                <th class="w-1/4">Description</th>
                <th>Amount</th>
                <th>Approved Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="request in paginatedApprovedRequests"
                :key="request.request_id"
                class="hover:bg-success/5"
              >
                <td class="font-mono font-medium text-success">
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
                <td class="font-semibold text-success">
                  ₱{{
                    request.total_amount.toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                    })
                  }}
                </td>
                <td>
                  <div class="flex flex-col">
                    <span>{{
                      new Date(request.approved_at).toLocaleDateString('en-PH')
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
                        <a @click="viewRequest(request)" class="text-primary">
                          View Details
                        </a>
                      </li>
                      <li class="hover:bg-black/10">
                        <a @click="releaseBudget(request)" class="text-success">
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
                'btn-active !bg-primaryColor text-white': currentPage === page,
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

    <!-- Budget Release History -->
    <div
      class="card bg-accentColor shadow-xl mb-6 border border-black/10 mx-auto"
    >
      <div class="card-body">
        <!-- Header with Stats -->
        <div
          class="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6"
        >
          <div>
            <h2 class="card-title text-primaryColor mb-2">
              Budget Release History
            </h2>
            <div class="flex flex-wrap gap-4 text-sm text-black/60">
              <span
                >Total:
                <strong class="text-primaryColor">{{
                  budgetReleaseStats.total
                }}</strong></span
              >
              <span
                >Confirmed:
                <strong class="text-success">{{
                  budgetReleaseStats.confirmed
                }}</strong></span
              >
              <span
                >Pending:
                <strong class="text-warning">{{
                  budgetReleaseStats.pending
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
                v-model="historyFilter.searchQuery"
                type="text"
                placeholder="Search by description, request ID, or release ID..."
                class="input input-sm input-bordered bg-white border-primaryColor/30 text-black/70 pl-10 w-full shadow-none"
              />
            </div>

            <div class="flex gap-2">
              <button
                class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10"
                @click="toggleSortOrder"
                :title="`Sort ${historyFilter.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`"
              >
                <TrendingUp
                  v-if="historyFilter.sortOrder === 'asc'"
                  class="w-4 h-4"
                />
                <TrendingDown v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Receipt Status Quick Filters -->
          <div class="flex flex-wrap gap-2 mb-4">
            <button
              class="btn btn-xs font-thin border border-primaryColor/30"
              :class="{
                'bg-primaryColor text-white':
                  historyFilter.receiptStatus === '',
                'bg-white text-primaryColor hover:bg-primaryColor/10':
                  historyFilter.receiptStatus !== '',
              }"
              @click="historyFilter.receiptStatus = ''"
            >
              All
              <span class="badge badge-xs ml-1 bg-secondaryColor border-none">
                {{ budgetReleaseHistory.length }}
              </span>
            </button>

            <button
              class="btn btn-xs font-thin border border-primaryColor/30"
              :class="{
                'bg-success text-white':
                  historyFilter.receiptStatus === 'confirmed',
                'bg-white text-success hover:bg-success/10':
                  historyFilter.receiptStatus !== 'confirmed',
              }"
              @click="
                historyFilter.receiptStatus =
                  historyFilter.receiptStatus === 'confirmed' ? '' : 'confirmed'
              "
            >
              Receipt Confirmed
              <span class="badge badge-xs ml-1 bg-secondaryColor border-none">
                {{ budgetReleaseStats.confirmed }}
              </span>
            </button>

            <button
              class="btn btn-xs font-thin border border-primaryColor/30"
              :class="{
                'bg-warning text-white':
                  historyFilter.receiptStatus === 'pending',
                'bg-white text-warning hover:bg-warning/10':
                  historyFilter.receiptStatus !== 'pending',
              }"
              @click="
                historyFilter.receiptStatus =
                  historyFilter.receiptStatus === 'pending' ? '' : 'pending'
              "
            >
              Receipt Pending
              <span class="badge badge-xs ml-1 bg-secondaryColor border-none">
                {{ budgetReleaseStats.pending }}
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
                v-model="historyFilter.startDate"
                type="date"
                class="input input-sm input-bordered bg-white border-primaryColor/30 text-black/70"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text text-black/70 text-sm">End Date</span>
              </label>
              <input
                v-model="historyFilter.endDate"
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
                @click="clearAllFilters"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        <!-- Budget Release History Table -->
        <div class="overflow-x-auto bg-accentColor">
          <table
            class="table table-sm table-zebra text-black/50 border border-black/10 custom-zebra"
          >
            <thead class="text-secondaryColor">
              <tr class="bg-primaryColor text-accentColor">
                <th class="w-16">No.</th>
                <th class="w-32">Release ID</th>
                <th class="w-32">Request ID</th>
                <th class="min-w-64">Description</th>
                <th class="w-32">Released Amount</th>
                <th class="w-28">Released Date</th>
                <th class="w-24">Released By</th>
                <th class="w-32">Receipt Status</th>
                <th class="w-28">Confirmed Date</th>
              </tr>
            </thead>
            <tbody>
              <!-- Empty State -->
              <tr v-if="filteredBudgetHistory.length === 0">
                <td colspan="9" class="text-center py-12">
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
                        No budget release history matches your current filters
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
                  {{ (historyCurrentPage - 1) * historyPerPage + index + 1 }}
                </td>

                <td>
                  <div class="font-mono text-sm font-medium text-primaryColor">
                    {{ release.release_id }}
                  </div>
                </td>

                <td>
                  <div class="font-mono text-sm font-medium text-success">
                    {{ release.request_id }}
                  </div>
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
                  {{
                    new Date(release.released_at).toLocaleDateString('en-PH')
                  }}
                </td>

                <td class="text-sm">{{ release.released_by }}</td>

                <td>
                  <div
                    class="badge badge-sm border-none font-medium"
                    :class="{
                      'bg-success/20 text-success': release.receipt_confirmed,
                      'bg-warning/20 text-warning': !release.receipt_confirmed,
                    }"
                  >
                    {{ release.receipt_confirmed ? 'Confirmed' : 'Pending' }}
                  </div>
                </td>

                <td class="text-sm">
                  {{
                    release.receipt_confirmed_at
                      ? new Date(
                          release.receipt_confirmed_at
                        ).toLocaleDateString('en-PH')
                      : 'N/A'
                  }}
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
              of {{ filteredBudgetHistory.length }} records
            </span>
            <span class="font-semibold text-primaryColor">
              Total Released: ₱{{
                budgetReleaseStats.totalReleased.toLocaleString('en-PH')
              }}
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
                totalHistoryPages > 1 && historyCurrentPage < totalHistoryPages
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
              <tr v-for="item in modal.request?.items || []" :key="item.id">
                <td class="border border-black">{{ item.id }}</td>
                <td class="border border-black">{{ item.item_name }}</td>
                <td class="border border-black">{{ item.item_quantity }}</td>
                <td class="border border-black">{{ item.item_unit }}</td>
                <td class="border border-black">{{ item.item_type }}</td>
                <td class="border border-black">
                  ₱{{ item.item_unitPrice.toFixed(2) }}
                </td>
                <td class="border border-black">
                  ₱{{ item.item_amount.toFixed(2) }}
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
                  ₱{{ modal.request?.total_amount.toFixed(2) }}
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
        <h3 class="text-lg font-bold mb-4 text-success">Release Budget</h3>
        <p>
          Are you sure you want to release budget for request
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
          <p>
            <strong>Approved Date:</strong>
            {{
              new Date(modal.request?.approved_at).toLocaleDateString('en-PH')
            }}
          </p>
        </div>

        <div class="alert alert-info mt-4">
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
            class="btn btn-success font-thin btn-sm"
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
          class="alert alert-success mt-3"
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

  /* Empty state styling */
  .table tbody tr td {
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }
</style>
