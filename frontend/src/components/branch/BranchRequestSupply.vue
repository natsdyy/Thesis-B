<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { useSupplyRequestStore } from '../../stores/supplyRequestStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import { useInventoryStore } from '../../stores/inventoryStore.js';
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
  const supplyRequestStore = useSupplyRequestStore();
  const authStore = useAuthStore();
  const inventoryStore = useInventoryStore();
  const branchContextStore = useBranchContextStore();

  // Local state
  const loading = ref(false);
  const currentPage = ref(1);
  const requestsPerPage = ref(10);
  const searchQuery = ref('');
  const statusFilter = ref('');
  const showCreateModal = ref(false);
  const showViewModal = ref(false);
  const selectedRequest = ref(null);

  // Form data for request items
  const requestItems = ref([
    {
      id: 1,
      item_name: '',
      item_quantity: 0,
    },
  ]);

  // Methods
  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
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

    // Filter by search query
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (request) =>
          request.request_id.toLowerCase().includes(query) ||
          request.request_description.toLowerCase().includes(query) ||
          request.requested_by.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter.value) {
      filtered = filtered.filter(
        (request) => request.status === statusFilter.value
      );
    }

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
      Pending: { class: 'bg-warning/10 text-warning', text: 'Pending' },
      Approved: { class: 'bg-success/10 text-success', text: 'Approved' },
      Rejected: { class: 'bg-error/10 text-error', text: 'Rejected' },
      Completed: { class: 'bg-success/10 text-success', text: 'Completed' },
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
      item_name: '',
      item_quantity: 0,
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

  const openViewModal = (request) => {
    selectedRequest.value = request;
    showViewModal.value = true;
  };

  const closeModals = () => {
    showCreateModal.value = false;
    showViewModal.value = false;
    selectedRequest.value = null;
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
        item_name: '',
        item_quantity: 0,
      },
    ];
  };

  const handleCreateRequest = async () => {
    loading.value = true;

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
        ...requestForm.value,
        items: validItems.map((item) => ({
          item_name: item.item_name,
          item_quantity: item.item_quantity,
        })),
      };

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock successful creation
      const newRequest = {
        id: requests.value.length + 1,
        request_id: `BR-${Date.now()}`,
        ...requestData,
        status: 'Draft',
        created_at: new Date().toISOString(),
      };

      requests.value.unshift(newRequest);
      closeModals();
      emit('requestCreated', newRequest);

      // Show success message
      console.log('Request created successfully');
    } catch (error) {
      console.error('Error creating request:', error);
      // Show error message
    } finally {
      loading.value = false;
    }
  };

  const loadRequests = async () => {
    loading.value = true;
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock data
      requests.value = [
        {
          id: 1,
          request_id: 'BR-001',
          request_type: 'Emergency',
          request_description: 'Urgent supply request for weekend rush',
          request_date: '2024-01-15',
          priority: 'High',
          department: currentBranch.value?.name || 'Branch',
          requested_by: 'Branch Manager',
          source_type: props.inventoryType,
          status: 'Pending',
          created_at: '2024-01-15T10:30:00Z',
          items: [
            {
              item_name: 'Beef Steak',
              item_quantity: 10,
            },
          ],
        },
        {
          id: 2,
          request_id: 'BR-002',
          request_type: 'Regular',
          request_description: 'Monthly supply replenishment',
          request_date: '2024-01-14',
          priority: 'Normal',
          department: currentBranch.value?.name || 'Branch',
          requested_by: 'Assistant Manager',
          source_type: props.inventoryType,
          status: 'Approved',
          created_at: '2024-01-14T14:20:00Z',
          items: [
            {
              item_name: 'Chicken Breast',
              item_quantity: 15,
            },
          ],
        },
      ];
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      loading.value = false;
    }
  };

  const refreshRequests = () => {
    loadRequests();
  };

  const editRequest = (request) => {
    // TODO: Implement edit functionality
    console.log('Edit request:', request);
  };

  const sendRequest = (request) => {
    // TODO: Implement send functionality
    console.log('Send request:', request);
  };

  const cancelRequest = (request) => {
    // TODO: Implement cancel functionality
    console.log('Cancel request:', request);
  };

  // Initialize
  onMounted(() => {
    loadRequests();
  });
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
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Completed">Completed</option>
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
                    <div class="text-sm text-gray-500">
                      by {{ request.requested_by }}
                    </div>
                  </td>
                  <td>
                    <div class="badge badge-outline">
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
                          v-if="request.status === 'Pending'"
                        >
                          <a @click="cancelRequest(request)" class="text-error"
                            >Cancel Request</a
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
          <div class="flex justify-between items-center mb-4">
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

          <div class="overflow-x-auto">
            <table
              class="table table-sm table-zebra text-black/50 border border-black/10 custom-zebra"
            >
              <thead class="text-primaryColor">
                <tr class="bg-primaryColor text-accentColor">
                  <th class="w-12">#</th>
                  <th class="w-48">Item Name</th>
                  <th class="w-20">Qty</th>
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
                    <input
                      type="text"
                      v-model="item.item_name"
                      placeholder="Enter item name..."
                      class="input input-xs w-full bg-white border-primaryColor/30 focus:border-primaryColor focus:bg-white"
                    />
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
            :disabled="loading"
            class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
          >
            <span
              v-if="loading"
              class="loading loading-spinner loading-sm"
            ></span>
            <Send v-else class="w-4 h-4 mr-1" />
            Create Request
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
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in selectedRequest.items" :key="index">
                  <td>{{ item.item_name }}</td>
                  <td>{{ item.item_quantity }}</td>
                </tr>
              </tbody>
            </table>
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
  </div>
</template>

<style scoped></style>
