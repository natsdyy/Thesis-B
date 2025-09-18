<script setup>
  import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
  import { useBranchRequestStore } from '../../stores/branchRequestStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import { useInventoryStore } from '../../stores/inventoryStore.js';
  import { useBranchInventoryStore } from '../../stores/branchInventoryStore.js';
  import { useBranchContextStore } from '../../stores/branchContextStore.js';
  import {
    Plus,
    X,
    Send,
    Eye,
    Edit,
    Trash2,
    Search,
    Filter,
    RefreshCcw,
    Calendar,
    Package,
    Settings,
    Handshake,
    Clock,
    TriangleAlert,
    Info,
    CheckCircle,
    XCircle,
    AlertTriangle,
    FileText,
    History,
    PhilippinePeso,
    EllipsisVertical,
  } from 'lucide-vue-next';

  // Props
  const props = defineProps({
    inventoryType: {
      type: String,
      default: 'scm', // 'scm' or 'production'
      validator: (value) => ['scm', 'production'].includes(value),
    },
  });

  // Emits
  const emit = defineEmits(['requestCreated', 'requestUpdated']);

  // Stores
  const branchRequestStore = useBranchRequestStore();
  const authStore = useAuthStore();
  const inventoryStore = useInventoryStore();
  const branchInventoryStore = useBranchInventoryStore();
  const branchContextStore = useBranchContextStore();

  // Local state
  const loading = ref(false);
  const creatingRequest = ref(false);
  const sendingRequest = ref(false);
  const cancelingRequest = ref(false);
  const deletingRequest = ref(false);
  const currentPage = ref(1);
  const requestsPerPage = ref(10);
  const searchQuery = ref('');
  const statusFilter = ref('');
  const showCreateModal = ref(false);
  const showEditModal = ref(false);
  const showViewModal = ref(false);
  const showDeleteModal = ref(false);
  const showSendModal = ref(false);
  const showCancelModal = ref(false);
  const selectedRequest = ref(null);
  const requestToDelete = ref(null);
  const requestToSend = ref(null);
  const requestToCancel = ref(null);
  const requestToEdit = ref(null);

  // Form data for request items
  const requestItems = ref([
    {
      id: 1,
      inventory_item_id: null,
      menu_item_id: null,
      item_name: '',
      item_quantity: 0,
      item_unit: '',
      unit_price: 0,
      category: '',
      source: '', // 'scm' | 'production'
    },
  ]);

  // Branch inventory for mapping (SCM + Production)
  const branchInventoryItems = computed(() => {
    const items = branchInventoryStore.inventory || [];
    const statusPriority = { low_stock: 0, available: 1, out_of_stock: 2 };
    const toLabel = (it) => {
      const status = it.status;
      if (status === 'low_stock') return `${it.item_name} (LOW STOCK)`;
      if (status === 'out_of_stock') return `${it.item_name} (OUT OF STOCK)`;
      return it.item_name;
    };
    return [...items]
      .sort((a, b) => {
        const pa = statusPriority[a.status] ?? 3;
        const pb = statusPriority[b.status] ?? 3;
        if (pa !== pb) return pa - pb;
        return a.item_name.localeCompare(b.item_name);
      })
      .map((it) => ({ ...it, __label: toLabel(it) }));
  });

  const scmInventoryItems = computed(() =>
    branchInventoryItems.value.filter(
      (i) => (i.item_type || '').toLowerCase() === 'scm'
    )
  );
  const productionInventoryItems = computed(() =>
    branchInventoryItems.value.filter(
      (i) => (i.item_type || '').toLowerCase() === 'production'
    )
  );

  // Methods
  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  // Toast notification function
  const showToast = (type, message) => {
    // Simple toast implementation - you can replace with your preferred toast library
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  };

  // Request form data
  const requestForm = ref({
    request_type: '',
    request_description: '',
    request_date: getCurrentDate(),
    priority: 'Normal',
    department: 'Branch',
    requested_by: '',
    source_type: props.inventoryType, // 'scm' or 'production'
    branch_id: null,
  });

  // Available units for different item types
  const availableUnits = ref([
    'kg',
    'g',
    'lbs',
    'pieces',
    'boxes',
    'bottles',
    'cans',
    'bags',
    'liters',
    'ml',
  ]);

  // Mock categories for branch requests
  const branchCategories = ref([
    { name: 'Meat', items: ['Beef Steak', 'Chicken Breast', 'Pork Chops'] },
    { name: 'Vegetables', items: ['French Fries', 'Onions', 'Tomatoes'] },
    { name: 'Beverages', items: ['Coca Cola', 'Sprite', 'Water'] },
    { name: 'Condiments', items: ['Ketchup', 'Mustard', 'Mayo'] },
    { name: 'Dairy', items: ['Cheese', 'Milk', 'Butter'] },
  ]);

  // Mock requests data
  const requests = ref([]);

  // Computed properties
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const userRole = computed(() => branchContextStore.userRole);

  const filteredRequests = computed(() => {
    let filtered = requests.value;

    // Filter by search query only (status filtering is done on server side)
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (request) =>
          request.request_id.toLowerCase().includes(query) ||
          request.request_description.toLowerCase().includes(query) ||
          request.requested_by.toLowerCase().includes(query)
      );
    }

    // Note: Status filtering is now handled on the server side in loadRequests()
    // This prevents double filtering which was causing the issue

    return filtered;
  });

  const paginatedRequests = computed(() => {
    const start = (currentPage.value - 1) * requestsPerPage.value;
    const end = start + requestsPerPage.value;
    return filteredRequests.value.slice(start, end);
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredRequests.value.length / requestsPerPage.value);
  });

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

  const getStatusBadge = (status) => {
    const statusMap = {
      Draft: { class: 'bg-warning/10 text-warning', text: 'Draft' },
      Sent: { class: 'bg-info/10 text-info', text: 'Sent' },
      Acknowledged: {
        class: 'bg-primary/10 text-primary',
        text: 'Acknowledged',
      },
      'In Progress': {
        class: 'bg-warning/10 text-warning',
        text: 'In Progress',
      },
      Completed: { class: 'bg-success/10 text-success', text: 'Completed' },
      Cancelled: { class: 'bg-error/10 text-error', text: 'Cancelled' },
    };
    return (
      statusMap[status] || { class: 'bg-neutral/10 text-neutral', text: status }
    );
  };

  // Smart pagination helper
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

  const addRequestItem = () => {
    requestItems.value.push({
      id: requestItems.value.length + 1,
      inventory_item_id: null,
      menu_item_id: null,
      item_name: '',
      item_quantity: 0,
      item_unit: '',
      unit_price: 0,
      category: '',
      source: '',
    });
  };

  const removeRequestItem = (id) => {
    if (requestItems.value.length > 1) {
      requestItems.value = requestItems.value.filter((item) => item.id !== id);
    }
  };

  const openCreateModal = () => {
    resetForm();
    showCreateModal.value = true;
  };

  const openViewModal = async (request) => {
    try {
      // Fetch the full request details with items
      const fullRequest = await branchRequestStore.fetchRequestById(request.id);

      if (!fullRequest) {
        console.error('Failed to fetch request details');
        return;
      }

      // Set the request with full details
      selectedRequest.value = fullRequest;
      showViewModal.value = true;
    } catch (error) {
      console.error('Error fetching request details for viewing:', error);
    }
  };

  const closeModals = () => {
    showCreateModal.value = false;
    showEditModal.value = false;
    showViewModal.value = false;
    showDeleteModal.value = false;
    showSendModal.value = false;
    showCancelModal.value = false;
    selectedRequest.value = null;
    requestToDelete.value = null;
    requestToSend.value = null;
    requestToCancel.value = null;
    requestToEdit.value = null;
  };

  const resetForm = () => {
    requestForm.value = {
      request_type: '',
      request_description: '',
      request_date: getCurrentDate(),
      priority: 'Normal',
      department: currentBranch.value?.name || 'Branch',
      requested_by: authStore.user?.name || '',
      source_type: props.inventoryType,
      branch_id: currentBranch.value?.id || null,
    };

    requestItems.value = [
      {
        id: 1,
        inventory_item_id: null,
        menu_item_id: null,
        item_name: '',
        item_quantity: 0,
        item_unit: '',
        unit_price: 0,
        category: '',
        source: '',
      },
    ];
  };

  const handleCreateRequest = async () => {
    creatingRequest.value = true;

    try {
      // Validation
      if (!requestForm.value.request_type.trim()) {
        throw new Error('Please select a request type');
      }

      if (!requestForm.value.request_description.trim()) {
        throw new Error('Please enter a request description');
      }

      const validItems = requestItems.value.filter(
        (item) => item.item_name.trim() && item.item_quantity > 0
      );

      if (validItems.length === 0) {
        throw new Error('Please add at least one valid item');
      }

      // Create request data
      const requestData = {
        request_type: requestForm.value.request_type,
        request_description: requestForm.value.request_description,
        request_date: requestForm.value.request_date,
        priority: requestForm.value.priority,
        department: requestForm.value.department,
        requested_by: requestForm.value.requested_by,
        branch_id: requestForm.value.branch_id,
        source_type: requestForm.value.source_type,
      };

      // Create items data with required fields
      const itemsData = validItems.map((item) => ({
        item_name: item.item_name,
        item_quantity: item.item_quantity,
        item_unit: item.item_unit || 'pieces',
        item_type: item.source === 'production' ? 'Production' : 'SCM',
        unit_price: item.unit_price || null,
        category: item.category || null,
        inventory_item_id: item.inventory_item_id || null,
        menu_item_id: item.menu_item_id || null,
      }));

      // Call the API
      const newRequest = await branchRequestStore.createRequest(
        requestData,
        itemsData
      );

      // Refresh the requests list
      await loadRequests();
      closeModals();
      emit('requestCreated', newRequest);

      // Show success message
      console.log('Request created successfully');
    } catch (error) {
      console.error('Error creating request:', error);
      // Show error message
    } finally {
      creatingRequest.value = false;
    }
  };

  const handleUpdateRequest = async () => {
    creatingRequest.value = true;

    try {
      // Validation
      if (!requestForm.value.request_type.trim()) {
        throw new Error('Please select a request type');
      }

      if (!requestForm.value.request_description.trim()) {
        throw new Error('Please enter a request description');
      }

      const validItems = requestItems.value.filter(
        (item) => item.item_name.trim() && item.item_quantity > 0
      );

      if (validItems.length === 0) {
        throw new Error('Please add at least one valid item');
      }

      // Prepare items data for API
      const itemsData = validItems.map((item) => ({
        item_name: item.item_name.trim(),
        item_quantity: item.item_quantity,
        item_unit: item.item_unit,
        item_type: item.source === 'production' ? 'Production' : 'SCM',
        unit_price: item.unit_price || null,
        category: item.category || null,
        inventory_item_id: item.inventory_item_id || null,
        menu_item_id: item.menu_item_id || null,
      }));

      // Update the request
      const updatedRequest = await branchRequestStore.updateRequest(
        requestToEdit.value.id,
        {
          request_type: requestForm.value.request_type,
          request_description: requestForm.value.request_description,
          request_date: requestForm.value.request_date,
          priority: requestForm.value.priority,
          requested_by: requestForm.value.requested_by,
        },
        itemsData
      );

      // Refresh the requests list
      await loadRequests();
      closeModals();
      emit('requestUpdated', updatedRequest);

      // Show success message
      console.log('Request updated successfully');
    } catch (error) {
      console.error('Error updating request:', error);
      // Show error message
    } finally {
      creatingRequest.value = false;
    }
  };

  const loadRequests = async () => {
    loading.value = true;
    try {
      if (currentBranch.value?.id) {
        // Load requests for the current branch
        const filters = {
          source_type: props.inventoryType,
          status: statusFilter.value || undefined,
        };

        console.log('Loading requests with filters:', filters);
        console.log('Current branch ID:', currentBranch.value.id);
        console.log('Inventory type (source_type):', props.inventoryType);

        // Fetch requests from both SCM and Production source types
        console.log(
          'Fetching requests from both SCM and Production source types...'
        );

        // Fetch SCM requests
        const scmFilters = {
          source_type: 'scm',
          status: statusFilter.value || undefined,
        };
        console.log('SCM filters:', scmFilters);

        const scmRequests = await branchRequestStore.fetchRequestsByBranch(
          currentBranch.value.id,
          scmFilters
        );
        console.log('SCM requests:', scmRequests);
        console.log('SCM request count:', scmRequests.length);
        console.log(
          'SCM request statuses:',
          scmRequests.map((req) => req.status)
        );

        // Fetch Production requests
        const productionFilters = {
          source_type: 'production',
          status: statusFilter.value || undefined,
        };
        console.log('Production filters:', productionFilters);

        const productionRequests =
          await branchRequestStore.fetchRequestsByBranch(
            currentBranch.value.id,
            productionFilters
          );
        console.log('Production requests:', productionRequests);
        console.log('Production request count:', productionRequests.length);
        console.log(
          'Production request statuses:',
          productionRequests.map((req) => req.status)
        );

        // Combine both source types
        requests.value = [...scmRequests, ...productionRequests];
        console.log(
          'Combined requests from both source types:',
          requests.value
        );
        console.log('Total combined request count:', requests.value.length);

        console.log('Final loaded requests:', requests.value);
        console.log('Final request count:', requests.value.length);
        console.log(
          'Final request statuses:',
          requests.value.map((req) => req.status)
        );
      } else {
        // Fallback to general requests if no branch context
        const filters = {
          source_type: props.inventoryType,
          status: statusFilter.value || undefined,
        };

        console.log('Loading requests with filters (no branch):', filters);
        requests.value = await branchRequestStore.fetchRequests(filters);
        console.log('Loaded requests (no branch):', requests.value);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
      requests.value = [];
    } finally {
      loading.value = false;
    }
  };

  const refreshRequests = () => {
    loadRequests();
  };

  const editRequest = async (request) => {
    // Only allow editing draft requests
    if (request.status !== 'Draft') {
      console.warn('Cannot edit request that is not in Draft status');
      return;
    }

    try {
      // Fetch the full request details with items
      const fullRequest = await branchRequestStore.fetchRequestById(request.id);

      if (!fullRequest) {
        console.error('Failed to fetch request details');
        return;
      }

      // Set the request to edit
      requestToEdit.value = fullRequest;

      // Populate the form with existing data
      const normalizedDate =
        typeof fullRequest.request_date === 'string'
          ? fullRequest.request_date.slice(0, 10)
          : getCurrentDate();

      requestForm.value = {
        request_type: fullRequest.request_type,
        request_description: fullRequest.request_description,
        request_date: normalizedDate,
        priority: fullRequest.priority,
        requested_by: fullRequest.requested_by,
        source_type: fullRequest.source_type || props.inventoryType,
        branch_id: fullRequest.branch_id || currentBranch.value?.id || null,
        department: currentBranch.value?.name || 'Branch',
      };

      // Populate the items array
      if (fullRequest.items && fullRequest.items.length > 0) {
        requestItems.value = fullRequest.items.map((item, index) => ({
          id: index + 1,
          inventory_item_id: item.inventory_item_id || null,
          menu_item_id: item.menu_item_id || null,
          item_name: item.item_name,
          item_quantity: item.item_quantity,
          item_unit: item.item_unit || 'pieces',
          unit_price: item.unit_price ?? 0,
          category: item.category || '',
          source: item.item_type
            ? String(item.item_type).toLowerCase()
            : fullRequest.source_type || '',
        }));
      } else {
        // Reset to default if no items
        requestItems.value = [
          {
            id: 1,
            inventory_item_id: null,
            menu_item_id: null,
            item_name: '',
            item_quantity: 0,
            item_unit: 'pieces',
            unit_price: 0,
            category: '',
            source: '',
          },
        ];
      }

      // Show the edit modal
      showEditModal.value = true;
    } catch (error) {
      console.error('Error fetching request details for editing:', error);
    }
  };

  const sendRequest = async (request) => {
    try {
      // Show confirmation modal
      showSendModal.value = true;
      requestToSend.value = request;
    } catch (error) {
      console.error('Error preparing send request:', error);
    }
  };

  const confirmSendRequest = async () => {
    sendingRequest.value = true;
    try {
      if (requestToSend.value) {
        await branchRequestStore.sendRequest(
          requestToSend.value.id,
          authStore.user?.name || 'Branch User'
        );
        await loadRequests();
        console.log('Request sent successfully');
        showSendModal.value = false;
        requestToSend.value = null;
      }
    } catch (error) {
      console.error('Error sending request:', error);
    } finally {
      sendingRequest.value = false;
    }
  };

  const cancelRequest = async (request) => {
    try {
      // Show confirmation modal
      showCancelModal.value = true;
      requestToCancel.value = request;
    } catch (error) {
      console.error('Error preparing cancel request:', error);
    }
  };

  const confirmCancelRequest = async () => {
    cancelingRequest.value = true;
    try {
      if (requestToCancel.value) {
        await branchRequestStore.cancelRequest(
          requestToCancel.value.id,
          authStore.user?.name || 'Branch User'
        );
        await loadRequests();
        console.log('Request cancelled successfully');
        showCancelModal.value = false;
        requestToCancel.value = null;
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
    } finally {
      cancelingRequest.value = false;
    }
  };

  const deleteRequest = async (request) => {
    try {
      // Show confirmation modal
      showDeleteModal.value = true;
      requestToDelete.value = request;
    } catch (error) {
      console.error('Error preparing delete request:', error);
    }
  };

  // Status update functionality
  const updateRequestStatus = async (request, newStatus) => {
    try {
      loading.value = true;

      await branchRequestStore.updateRequestStatus(
        request.id,
        newStatus,
        authStore.user?.name || 'Branch User',
        `Status updated to ${newStatus}`
      );

      // Refresh the requests list
      await loadRequests();

      showToast('success', `Request status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating request status:', error);
      showToast('error', 'Failed to update request status');
    } finally {
      loading.value = false;
    }
  };

  const confirmDeleteRequest = async () => {
    deletingRequest.value = true;
    try {
      if (requestToDelete.value) {
        await branchRequestStore.deleteRequest(requestToDelete.value.id);
        await loadRequests();
        console.log('Request deleted successfully');
        showDeleteModal.value = false;
        requestToDelete.value = null;
      }
    } catch (error) {
      console.error('Error deleting request:', error);
    } finally {
      deletingRequest.value = false;
    }
  };

  // Watch for status filter changes
  watch(statusFilter, (newStatus) => {
    console.log('Status filter changed to:', newStatus);
    loadRequests();
  });

  // Initialize
  onMounted(async () => {
    // Load requests and branch inventory for item mapping
    loadRequests();
    if (currentBranch.value?.id) {
      await branchInventoryStore.fetchInventory(currentBranch.value.id);
    }

    // If a prefill payload was set before this component mounted, consume it
    try {
      const queued = window.__branchPrefillSupplyRequest;
      if (queued && Array.isArray(queued.items) && queued.items.length) {
        // Use same handler logic as the event
        const e = { detail: queued };
        const payload = e.detail || {};
        resetForm();
        requestForm.value.request_type = 'Regular';
        requestForm.value.request_description = `Auto-generated from Alerts for ${payload.items?.[0]?.name || 'item'}`;
        // Respect the incoming source if provided; otherwise, keep current tab type
        requestForm.value.source_type = payload.source || props.inventoryType;
        requestForm.value.branch_id = currentBranch.value?.id || null;
        requestForm.value.department = currentBranch.value?.name || 'Branch';

        const items = Array.isArray(payload.items) ? payload.items : [];
        requestItems.value = items.map((it, idx) => ({
          id: idx + 1,
          inventory_item_id: null,
          menu_item_id: null,
          item_name: it.name || '',
          item_quantity: Number(it.quantity || 1),
          item_unit: it.unit || 'pieces',
          unit_price: Number(it.unit_price || 0),
          category: payload.category || '',
          source: (
            it.source ||
            payload.source ||
            props.inventoryType ||
            'scm'
          ).toLowerCase(),
        }));
        // Try auto-selecting matching branch inventory by name
        requestItems.value.forEach((row) => {
          const match = branchInventoryItems.value.find(
            (i) =>
              (i.item_name || '').toLowerCase() === row.item_name.toLowerCase()
          );
          if (match) handleSelectInventoryItem(row, match.id);
        });
        if (requestItems.value.length === 0) {
          requestItems.value = [
            {
              id: 1,
              inventory_item_id: null,
              menu_item_id: null,
              item_name: payload.items?.[0]?.name || '',
              item_quantity: Number(payload.items?.[0]?.quantity || 1),
              item_unit: payload.items?.[0]?.unit || 'pieces',
              unit_price: Number(payload.items?.[0]?.unit_price || 0),
              category: payload.category || '',
              source: payload.source || props.inventoryType || 'scm',
            },
          ];
        }
        showCreateModal.value = true;
        // Clear the queued payload so it isn't reused
        delete window.__branchPrefillSupplyRequest;
      }
    } catch (_) {}

    // Listen for prefill event from BranchInventory Alerts
    const handler = (e) => {
      try {
        const payload = e.detail || {};
        // Reset and open create modal
        resetForm();
        requestForm.value.request_type = 'Regular';
        requestForm.value.request_description = `Auto-generated from Alerts for ${payload.items?.[0]?.name || 'item'}`;
        requestForm.value.source_type = payload.source || props.inventoryType;
        requestForm.value.branch_id = currentBranch.value?.id || null;
        requestForm.value.department = currentBranch.value?.name || 'Branch';

        // Map items
        const items = Array.isArray(payload.items) ? payload.items : [];
        requestItems.value = items.map((it, idx) => ({
          id: idx + 1,
          inventory_item_id: null, // optional: could resolve by name
          menu_item_id: null,
          item_name: it.name || '',
          item_quantity: Number(it.quantity || 1),
          item_unit: it.unit || 'pieces',
          unit_price: Number(it.unit_price || 0),
          category: payload.category || '',
          source: (
            it.source ||
            payload.source ||
            props.inventoryType ||
            'scm'
          ).toLowerCase(),
        }));
        // Try auto-selecting matching branch inventory by name
        requestItems.value.forEach((row) => {
          const match = branchInventoryItems.value.find(
            (i) =>
              (i.item_name || '').toLowerCase() === row.item_name.toLowerCase()
          );
          if (match) handleSelectInventoryItem(row, match.id);
        });
        if (requestItems.value.length === 0) {
          requestItems.value = [
            {
              id: 1,
              inventory_item_id: null,
              menu_item_id: null,
              item_name: payload.items?.[0]?.name || '',
              item_quantity: Number(payload.items?.[0]?.quantity || 1),
              item_unit: payload.items?.[0]?.unit || 'pieces',
              unit_price: Number(payload.items?.[0]?.unit_price || 0),
              category: payload.category || '',
              source: payload.source || props.inventoryType || 'scm',
            },
          ];
        }
        showCreateModal.value = true;
      } catch (_) {}
    };
    window.addEventListener('branch-prefill-supply-request', handler);
    // store for cleanup
    window.__branchPrefillSupplyHandler = handler;
  });

  // When branch changes, refresh available branch inventory
  watch(
    () => currentBranch.value?.id,
    async (branchId) => {
      if (branchId) {
        await branchInventoryStore.fetchInventory(branchId);
      }
    }
  );

  onUnmounted(() => {
    if (window.__branchPrefillSupplyHandler) {
      window.removeEventListener(
        'branch-prefill-supply-request',
        window.__branchPrefillSupplyHandler
      );
      delete window.__branchPrefillSupplyHandler;
    }
  });

  const handleSelectInventoryItem = (row, inventoryItemId) => {
    const inv = branchInventoryItems.value.find(
      (i) => i.id === inventoryItemId
    );
    if (!inv) return;
    row.inventory_item_id = inv.id;
    row.item_name = inv.item_name;
    row.item_unit = inv.unit || 'pieces';
    row.unit_price = Number(inv.unit_cost || 0);
    row.category = inv.category || '';
    row.source = inv.item_type || '';
    // If production item, capture linked menu item id if available
    row.menu_item_id = inv.menu_item_id || null;
  };
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
    >
      <div>
        <h2 class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl">
          <Handshake class="w-5 h-5 sm:w-6 sm:h-6" />
          Request Supply - {{ inventoryType === 'scm' ? 'SCM' : 'Production' }}
        </h2>
        <p class="text-gray-600 text-sm sm:text-base">
          Request supplies from
          {{ inventoryType === 'scm' ? 'SCM' : 'Production' }} department
        </p>
      </div>
      <div class="flex items-center space-x-2">
        <button
          @click="refreshRequests"
          :disabled="loading"
          class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
        >
          <RefreshCcw :class="['w-4 h-4 mr-2', { 'animate-spin': loading }]" />
          Refresh
        </button>
        <button
          @click="openCreateModal"
          class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
        >
          <Plus class="w-4 h-4 mr-2" />
          New Request
        </button>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="card bg-white shadow-lg">
      <div class="card-body p-4">
        <div class="flex flex-col md:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1">
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
              />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search requests..."
                class="input input-bordered w-full pl-10"
              />
            </div>
          </div>

          <!-- Status Filter -->
          <select v-model="statusFilter" class="select select-bordered">
            <option value="">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Requests List -->
    <div class="card bg-white shadow-lg">
      <div class="card-body">
        <h3 class="card-title text-primaryColor mb-4">
          <FileText class="w-5 h-5" />
          Supply Requests
        </h3>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center items-center py-12">
          <div
            class="loading loading-spinner loading-lg text-primaryColor"
          ></div>
        </div>

        <!-- Requests Table -->
        <div v-else-if="paginatedRequests.length > 0" class="space-y-4">
          <div class="overflow-x-auto">
            <table class="table w-full table-sm">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="request in paginatedRequests" :key="request.id">
                  <td>
                    <div class="font-semibold">{{ request.request_id }}</div>
                    <div class="text-xs text-gray-500">
                      by {{ request.requested_by }}
                    </div>
                  </td>
                  <td>
                    <div class="badge badge-outline badge-sm">
                      {{ request.request_type }}
                    </div>
                  </td>
                  <td>
                    <div class="max-w-xs truncate">
                      {{ request.request_description }}
                    </div>
                  </td>
                  <td>
                    <div
                      class="badge badge-sm border-none"
                      :class="{
                        'bg-error/10 text-error': request.priority === 'Urgent',
                        'bg-warning/10 text-warning':
                          request.priority === 'High',
                        'bg-info/10 text-info': request.priority === 'Normal',
                        'bg-success/10 text-success':
                          request.priority === 'Low',
                      }"
                    >
                      {{ request.priority }}
                    </div>
                  </td>
                  <td>
                    <div
                      class="badge"
                      :class="getStatusBadge(request.status).class"
                    >
                      {{ getStatusBadge(request.status).text }}
                    </div>
                  </td>
                  <td>
                    <div class="text-sm">
                      {{ formatDate(request.request_date) }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ formatTime(request.created_at) }}
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
                            @click="openViewModal(request)"
                            class="text-primary"
                            >View Request</a
                          >
                        </li>
                        <li
                          class="hover:bg-black/10"
                          v-if="request.status === 'Draft'"
                        >
                          <a @click="editRequest(request)" class="text-warning"
                            >Edit</a
                          >
                        </li>
                        <li
                          class="hover:bg-black/10"
                          v-if="request.status === 'Draft'"
                        >
                          <a @click="sendRequest(request)" class="text-success"
                            >Send Request</a
                          >
                        </li>
                        <li
                          class="hover:bg-black/10"
                          v-if="request.status === 'Draft'"
                        >
                          <a @click="deleteRequest(request)" class="text-error"
                            >Delete</a
                          >
                        </li>
                        <li
                          class="hover:bg-black/10"
                          v-if="request.status === 'Sent'"
                        >
                          <a @click="cancelRequest(request)" class="text-error"
                            >Cancel Request</a
                          >
                        </li>
                        <!-- Status Update Options -->
                        <li
                          class="hover:bg-black/10"
                          v-if="request.status === 'Acknowledged'"
                        >
                          <a
                            @click="updateRequestStatus(request, 'In Progress')"
                            class="text-info"
                            >Mark as In Progress</a
                          >
                        </li>
                        <li
                          class="hover:bg-black/10"
                          v-if="request.status === 'In Progress'"
                        >
                          <a
                            @click="updateRequestStatus(request, 'Completed')"
                            class="text-success"
                            >Mark as Completed</a
                          >
                        </li>
                        <li
                          class="hover:bg-black/10"
                          v-if="request.status === 'Acknowledged'"
                        >
                          <a
                            @click="updateRequestStatus(request, 'Completed')"
                            class="text-success"
                            >Mark as Completed</a
                          >
                        </li>
                      </ul>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="flex justify-between items-center mt-6">
            <!-- Summary -->
            <div class="text-sm text-black/60">
              <span>
                Showing
                {{ (currentPage - 1) * requestsPerPage + 1 }}
                to
                {{
                  Math.min(
                    currentPage * requestsPerPage,
                    filteredRequests.length
                  )
                }}
                of {{ filteredRequests.length }} records
              </span>
            </div>

            <!-- Pagination with Ellipsis -->
            <div class="join space-x-1">
              <button
                class="join-item btn font-thin !bg-gray-200 text-black/50 btn-sm border border-none hover:bg-gray-300"
                :disabled="currentPage <= 1"
                @click="currentPage--"
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
                @click="currentPage = 1"
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
                @click="currentPage = page"
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
                @click="currentPage = totalPages"
              >
                {{ totalPages }}
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

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <Handshake class="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            No requests found
          </h3>
          <p class="text-gray-600 mb-6">Create your first supply request</p>
          <button
            @click="openCreateModal"
            class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
          >
            <Plus class="w-4 h-4 mr-2" />
            New Request
          </button>
        </div>
      </div>
    </div>

    <!-- Create Request Modal -->
    <div v-if="showCreateModal" class="modal modal-open z-[9998]">
      <div class="modal-box bg-accentColor text-black/50 shadow-lg max-w-6xl">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Create New Request
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
              v-model="requestForm.request_type"
              class="select select-bordered bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              required
            >
              <option value="" disabled>Select Inventory Category</option>
              <option value="Regular">Regular</option>
              <option value="Emergency">Emergency</option>
              <option value="Rush">Rush</option>
            </select>
            <div class="label">
              <span class="label-text-alt text-black/50 text-sm">
                Select a category to see description
              </span>
            </div>
          </div>

          <!-- Branch Selection -->
          <div class="form-control">
            <label class="label">
              <span class="label-text text-black/70 font-medium"
                >Branch <span class="text-red-500">*</span></span
              >
            </label>
            <input
              :value="currentBranch?.name || 'Branch'"
              type="text"
              class="input input-bordered bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              readonly
            />
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
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
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
          <div class="flex justify-between items-center mb-2">
            <h4 class="text-lg font-semibold text-primaryColor">
              Request Items
            </h4>
            <div class="flex gap-2">
              <button
                class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
                @click="addRequestItem"
              >
                <Plus class="w-4 h-4 mr-1" />
                Add Item
              </button>
            </div>
          </div>

          <div
            class="alert alert-info bg-primaryColor/10 text-primaryColor border border-primaryColor/30 mb-4 py-2 px-3"
          >
            <Info class="w-4 h-4 mr-2" />
            <span class="text-xs sm:text-sm">
              Items in the dropdown are sorted to show
              <strong>LOW STOCK</strong> first to help you prioritize what to
              request. Out-of-stock items are marked too.
            </span>
          </div>

          <div class="overflow-x-auto">
            <table
              class="table table-sm table-zebra text-black/50 border border-black/10 custom-zebra"
            >
              <thead class="text-primaryColor">
                <tr class="bg-primaryColor text-accentColor">
                  <th class="w-12">#</th>
                  <th class="w-40">Item</th>
                  <th class="w-20">Qty</th>
                  <th class="w-24">Unit</th>
                  <th class="w-28">Unit Price</th>
                  <th class="w-36">Category</th>
                  <th class="w-28">Source</th>
                  <th class="w-16">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in requestItems"
                  :key="item.id"
                  class="hover:bg-primaryColor/5"
                >
                  <td class="text-center font-medium">{{ item.id }}</td>

                  <td>
                    <select
                      v-model.number="item.inventory_item_id"
                      @change="
                        handleSelectInventoryItem(item, item.inventory_item_id)
                      "
                      class="select select-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                    >
                      <option :value="null">Select inventory item...</option>
                      <optgroup label="SCM">
                        <option
                          v-for="inv in scmInventoryItems"
                          :key="`scm-${inv.id}`"
                          :value="inv.id"
                        >
                          {{ inv.__label }}
                        </option>
                      </optgroup>
                      <optgroup label="Production">
                        <option
                          v-for="inv in productionInventoryItems"
                          :key="`prod-${inv.id}`"
                          :value="inv.id"
                        >
                          {{ inv.__label }}
                        </option>
                      </optgroup>
                    </select>
                  </td>

                  <td>
                    <input
                      type="number"
                      v-model.number="item.item_quantity"
                      placeholder="0"
                      min="0"
                      step="1"
                      class="input input-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      v-model="item.item_unit"
                      class="input input-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                      placeholder="unit"
                      readonly
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      v-model.number="item.unit_price"
                      class="input input-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                      placeholder="0.00"
                      step="0.01"
                      readonly
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      v-model="item.category"
                      class="input input-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                      placeholder="category"
                      readonly
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      v-model="item.source"
                      class="input input-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                      placeholder="source"
                      readonly
                    />
                  </td>

                  <td class="text-center">
                    <button
                      @click="removeRequestItem(item.id)"
                      :disabled="requestItems.length === 1"
                      class="btn btn-xs btn-ghost text-red-600 hover:bg-red-100"
                    >
                      <X class="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="modal-action">
          <button
            @click="closeModals"
            :disabled="loading"
            class="btn btn-sm font-thin bg-gray-200 text-black/50 border-none hover:bg-gray-300 shadow-none"
          >
            Cancel
          </button>
          <button
            @click="handleCreateRequest"
            :disabled="creatingRequest"
            class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
          >
            <span
              v-if="creatingRequest"
              class="loading loading-spinner loading-sm"
            ></span>
            <Send v-else class="w-4 h-4 mr-1" />
            {{ creatingRequest ? 'Creating...' : 'Create Request' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Request Modal -->
    <div
      v-if="showEditModal && requestToEdit"
      class="modal modal-open z-[9998]"
    >
      <div class="modal-box bg-accentColor text-black/50 shadow-lg max-w-6xl">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Edit Request - {{ requestToEdit.request_id }}
        </h3>

        <!-- Request Form -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <!-- Request Type -->
          <div class="form-control">
            <label class="label">
              <span class="label-text text-black/70 font-medium"
                >Inventory Category <span class="text-red-500">*</span></span
              >
            </label>
            <select
              v-model="requestForm.request_type"
              class="select select-bordered bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            >
              <option value="">Select Inventory Category</option>
              <option value="Regular">Regular</option>
              <option value="Emergency">Emergency</option>
              <option value="Rush">Rush</option>
            </select>
          </div>

          <!-- Priority -->
          <div class="form-control">
            <label class="label">
              <span class="label-text text-black/70 font-medium"
                >Select Priority</span
              >
            </label>
            <select
              v-model="requestForm.priority"
              class="select select-bordered bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            >
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
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
            placeholder="Describe what you need..."
          ></textarea>
        </div>

        <!-- Request Items -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-4">
            <h4 class="text-lg font-semibold text-black/70">Request Items</h4>
            <div class="flex gap-2">
              <button
                class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
                @click="addRequestItem"
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
                  <th class="w-40">Item</th>
                  <th class="w-20">Qty</th>
                  <th class="w-24">Unit</th>
                  <th class="w-28">Unit Price</th>
                  <th class="w-36">Category</th>
                  <th class="w-28">Source</th>
                  <th class="w-16">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in requestItems"
                  :key="item.id"
                  class="hover:bg-primaryColor/5"
                >
                  <td class="text-center font-medium">{{ item.id }}</td>

                  <td>
                    <select
                      v-model.number="item.inventory_item_id"
                      @change="
                        handleSelectInventoryItem(item, item.inventory_item_id)
                      "
                      class="select select-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                    >
                      <option :value="null">Select inventory item...</option>
                      <optgroup label="SCM">
                        <option
                          v-for="inv in scmInventoryItems"
                          :key="`scm-${inv.id}`"
                          :value="inv.id"
                        >
                          {{ inv.__label }}
                        </option>
                      </optgroup>
                      <optgroup label="Production">
                        <option
                          v-for="inv in productionInventoryItems"
                          :key="`prod-${inv.id}`"
                          :value="inv.id"
                        >
                          {{ inv.__label }}
                        </option>
                      </optgroup>
                    </select>
                  </td>

                  <td>
                    <input
                      type="number"
                      v-model.number="item.item_quantity"
                      placeholder="0"
                      min="0"
                      step="1"
                      class="input input-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      v-model="item.item_unit"
                      class="input input-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                      placeholder="unit"
                      readonly
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      v-model.number="item.unit_price"
                      class="input input-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                      placeholder="0.00"
                      step="0.01"
                      readonly
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      v-model="item.category"
                      class="input input-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                      placeholder="category"
                      readonly
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      v-model="item.source"
                      class="input input-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                      placeholder="source"
                      readonly
                    />
                  </td>

                  <td class="text-center">
                    <button
                      @click="removeRequestItem(item.id)"
                      :disabled="requestItems.length === 1"
                      class="btn btn-xs btn-ghost text-red-600 hover:bg-red-100"
                    >
                      <X class="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="modal-action">
          <button
            @click="closeModals"
            :disabled="creatingRequest"
            class="btn btn-sm font-thin bg-gray-200 text-black/50 border-none hover:bg-gray-300 shadow-none"
          >
            Cancel
          </button>
          <button
            @click="handleUpdateRequest"
            :disabled="creatingRequest"
            class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
          >
            <span
              v-if="creatingRequest"
              class="loading loading-spinner loading-sm"
            ></span>
            <Edit v-else class="w-4 h-4 mr-1" />
            {{ creatingRequest ? 'Updating...' : 'Update Request' }}
          </button>
        </div>
      </div>
    </div>

    <!-- View Request Modal -->
    <div
      v-if="showViewModal && selectedRequest"
      class="modal modal-open z-[9997]"
    >
      <div class="modal-box bg-accentColor text-black/50 shadow-lg max-w-4xl">
        <h3 class="text-lg font-bold mb-4 text-black">Request Details</h3>

        <!-- Request Information -->
        <div
          class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-white/5 rounded-lg"
        >
          <div>
            <p class="text-sm text-gray-600">Request ID</p>
            <p class="font-semibold">{{ selectedRequest.request_id }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Type</p>
            <p class="font-semibold">{{ selectedRequest.request_type }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Priority</p>
            <div
              :class="[
                'badge badge-sm border-none font-medium',
                {
                  'badge-error text-error bg-error/10':
                    selectedRequest.priority === 'High',
                  'badge-warning text-warning bg-warning/10':
                    selectedRequest.priority === 'Normal',
                  'badge-info text-info bg-info/10':
                    selectedRequest.priority === 'Low',
                },
              ]"
            >
              {{ selectedRequest.priority }}
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-600">Status</p>
            <div
              :class="['badge', getStatusBadge(selectedRequest.status).class]"
            >
              {{ getStatusBadge(selectedRequest.status).text }}
            </div>
          </div>
          <div>
            <p class="text-sm text-gray-600">Requested By</p>
            <p class="font-semibold">{{ selectedRequest.requested_by }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Date</p>
            <p class="font-semibold">
              {{ formatDate(selectedRequest.request_date) }}
            </p>
          </div>
        </div>

        <div class="mb-6">
          <p class="text-sm text-gray-600 mb-2">Description</p>
          <p class="font-medium">{{ selectedRequest.request_description }}</p>
        </div>

        <!-- Request Items -->
        <div class="mb-6">
          <h4 class="text-lg font-semibold mb-4">Request Items</h4>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th class="text-right">Quantity</th>
                  <th>Unit</th>
                  <th class="text-right">Unit Price</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in selectedRequest.items" :key="index">
                  <td>{{ item.item_name }}</td>
                  <td class="text-right">{{ item.item_quantity }}</td>
                  <td>{{ item.item_unit || 'pieces' }}</td>
                  <td class="text-right">
                    {{
                      item.unit_price != null
                        ? Number(item.unit_price).toFixed(2)
                        : '-'
                    }}
                  </td>
                  <td>{{ item.category || '-' }}</td>
                  <td>
                    {{ item.item_type || selectedRequest.source_type || '-' }}
                  </td>
                  <td class="text-right">
                    {{
                      item.unit_price != null
                        ? (
                            Number(item.unit_price) *
                            Number(item.item_quantity || 0)
                          ).toFixed(2)
                        : '-'
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            class="mt-3 text-right text-sm text-gray-700"
            v-if="selectedRequest && selectedRequest.items"
          >
            <span class="font-medium mr-2">Total Amount:</span>
            <span>
              {{
                selectedRequest.items
                  .reduce(
                    (s, it) =>
                      s +
                      (it.unit_price
                        ? Number(it.unit_price) * Number(it.item_quantity || 0)
                        : 0),
                    0
                  )
                  .toFixed(2)
              }}
            </span>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="modal-action">
          <button
            @click="closeModals"
            class="btn btn-sm font-thin bg-gray-200 text-black/50 border-none hover:bg-gray-300 shadow-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal && requestToDelete"
      class="modal modal-open z-[9998]"
    >
      <div class="modal-box bg-accentColor text-black/50 shadow-lg max-w-md">
        <h3 class="text-lg font-bold mb-4 text-black">Delete Request</h3>

        <div class="mb-6">
          <p class="text-gray-700 mb-2">
            Are you sure you want to delete this request?
          </p>
          <div class="bg-gray-100 p-3 rounded-lg">
            <p class="font-semibold text-sm">
              Request ID: {{ requestToDelete.request_id }}
            </p>
            <p class="text-sm text-gray-600">
              {{ requestToDelete.request_description }}
            </p>
          </div>
          <p class="text-red-600 text-sm mt-2 font-medium">
            <TriangleAlert class="w-4 h-4 mr-1" />
            This action cannot be undone.
          </p>
        </div>

        <div class="modal-action">
          <button
            @click="
              showDeleteModal = false;
              requestToDelete = null;
            "
            class="btn btn-sm font-thin bg-gray-200 text-black/50 border-none hover:bg-gray-300 shadow-none"
          >
            Cancel
          </button>
          <button
            @click="confirmDeleteRequest"
            :disabled="deletingRequest"
            class="btn btn-sm bg-error text-white font-thin border-none hover:bg-error/80"
          >
            <span
              v-if="deletingRequest"
              class="loading loading-spinner loading-sm"
            ></span>
            {{ deletingRequest ? 'Deleting...' : 'Delete Request' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Send Request Confirmation Modal -->
    <div
      v-if="showSendModal && requestToSend"
      class="modal modal-open z-[9998]"
    >
      <div class="modal-box bg-accentColor text-black/50 shadow-lg max-w-md">
        <h3 class="text-lg font-bold mb-4 text-black">Send Request</h3>

        <div class="mb-6">
          <p class="text-gray-700 mb-2">
            Are you sure you want to send this request to the main office?
          </p>
          <div class="bg-gray-100 p-3 rounded-lg">
            <p class="font-semibold text-sm">
              Request ID: {{ requestToSend.request_id }}
            </p>
            <p class="text-sm text-gray-600">
              {{ requestToSend.request_description }}
            </p>
          </div>
          <p
            class="text-primaryColor text-sm mt-2 font-medium flex items-center"
          >
            <Info class="w-4 h-4 mr-1" />
            Once sent, you cannot edit this request.
          </p>
        </div>

        <div class="modal-action">
          <button
            @click="
              showSendModal = false;
              requestToSend = null;
            "
            class="btn btn-sm font-thin bg-gray-200 text-black/50 border-none hover:bg-gray-300 shadow-none"
          >
            Cancel
          </button>
          <button
            @click="confirmSendRequest"
            :disabled="sendingRequest"
            class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
          >
            <span
              v-if="sendingRequest"
              class="loading loading-spinner loading-sm"
            ></span>
            {{ sendingRequest ? 'Sending...' : 'Send Request' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Cancel Request Confirmation Modal -->
    <div
      v-if="showCancelModal && requestToCancel"
      class="modal modal-open z-[9998]"
    >
      <div class="modal-box bg-accentColor text-black/50 shadow-lg max-w-md">
        <h3 class="text-lg font-bold mb-4 text-black">Cancel Request</h3>

        <div class="mb-6">
          <p class="text-gray-700 mb-2">
            Are you sure you want to cancel this request?
          </p>
          <div class="bg-gray-100 p-3 rounded-lg">
            <p class="font-semibold text-sm">
              Request ID: {{ requestToCancel.request_id }}
            </p>
            <p class="text-sm text-gray-600">
              {{ requestToCancel.request_description }}
            </p>
          </div>
          <p class="text-orange-600 text-sm mt-2 font-medium">
            <TriangleAlert class="w-4 h-4 mr-1" />
            This will notify the main office that the request has been
            cancelled.
          </p>
        </div>

        <div class="modal-action">
          <button
            @click="
              showCancelModal = false;
              requestToCancel = null;
            "
            class="btn btn-sm font-thin bg-gray-200 text-black/50 border-none hover:bg-gray-300 shadow-none"
          >
            Cancel
          </button>
          <button
            @click="confirmCancelRequest"
            :disabled="cancelingRequest"
            class="btn btn-sm bg-warning text-white font-thin border-none hover:bg-warning/80"
          >
            <span
              v-if="cancelingRequest"
              class="loading loading-spinner loading-sm"
            ></span>
            {{ cancelingRequest ? 'Canceling...' : 'Cancel Request' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
