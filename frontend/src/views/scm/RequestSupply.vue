<script setup>
  import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
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
  } from 'lucide-vue-next';

  const loading = ref(false);
  const hasRequests = ref(true); // Set to true since we have mock data
  const hasApprovedRequests = ref(true);
  const hasPendingRequests = ref(true);
  const hasRejectedRequests = ref(true);
  const currentPage = ref(1);
  const requestsPerPage = ref(5);
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

  // Add mock data for requests
  const allRequests = ref([
    {
      request_id: 2025081401,
      request_date: '2025-01-01',
      request_type: 'Equipment',
      request_description: 'Office supplies needed',
      request_status: 'Approved',
      created_at: '2025-01-01T10:00:00Z',
    },
    {
      request_id: 2025081402,
      request_date: '2025-01-02',
      request_type: 'Material',
      request_description: 'Raw materials for production',
      request_status: 'Rejected',
      created_at: '2025-01-02T11:00:00Z',
    },
    {
      request_id: 2025081403,
      request_date: '2025-01-03',
      request_type: 'Service',
      request_description: 'Maintenance service request',
      request_status: 'Pending',
      created_at: '2025-01-03T12:00:00Z',
    },
  ]);

  // Mock data for request history
  const requestHistory = ref([
    {
      request_id: 2025081401,
      request_description: 'Office supplies needed',
      request_date: '2025-01-01',
      total_amount: 1000,
      receipt: 'receipt1.jpg',
    },
    {
      request_id: 2025081402,
      request_description: 'Raw materials for production',
      request_date: '2025-01-02',
      total_amount: 2000,
      receipt: 'receipt2.jpg',
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

  // Form data for new request
  const newRequest = ref({
    request_type: '',
    request_description: '',
    request_date: '',
  });

  const requestTypes = [
    'Equipment',
    'Material',
    'Service',
    'Maintenance',
    'Software',
  ];

  // Toast state
  const toast = ref({ show: false, type: '', message: '' });

  // Show toast helper
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };

  // Fixed computed properties
  const sortedRequests = computed(() => {
    return [...allRequests.value].sort(
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

  const paginatedRequestModal = computed(() => {
    const start =
      (requestModalCurrentPage.value - 1) * rowRequestModalPerPage.value;
    return rowRequest.value.slice(start, start + rowRequestModalPerPage.value);
  });

  const totalPagesRequestModal = computed(() => {
    return Math.ceil(rowRequest.value.length / rowRequestModalPerPage.value);
  });

  const paginatedRequestHistory = computed(() => {
    const start =
      (requestHistoryCurrentPage.value - 1) * requestHistoryPerPage.value;
    return requestHistory.value.slice(
      start,
      start + requestHistoryPerPage.value
    );
  });

  const totalPagesRequestHistory = computed(() => {
    return Math.ceil(requestHistory.value.length / requestHistoryPerPage.value);
  });

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

    if (type === 'create') {
      document.getElementById('create_request_modal').showModal();
    } else {
      document.getElementById('universal_modal').showModal();
    }
  };

  const closeModal = () => {
    document.getElementById('create_request_modal')?.close();
    document.getElementById('universal_modal')?.close();
    modal.value = {
      type: null,
      show: false,
      request: null,
      data: { request_type: '', request_description: '', request_date: '' },
    };
  };

  // Handle modal actions
  const handleModalAction = async () => {
    try {
      switch (modal.value.type) {
        case 'create':
          await handleCreateRequest();
          break;
        case 'edit':
          await handleUpdateRequest(
            modal.value.request.request_id,
            modal.value.data
          );
          break;
        case 'send':
          await handleSendRequest(modal.value.request.request_id);
          break;
        case 'cancel':
          await handleCancelRequest(modal.value.request.request_id);
          break;
      }
    } catch (err) {
      // Error handled by individual methods
    }
  };

  const handleUpdateRequest = async (requestId, updatedData) => {
    loading.value = true;
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update request in the list
      const requestIndex = allRequests.value.findIndex(
        (r) => r.request_id === requestId
      );
      if (requestIndex !== -1) {
        allRequests.value[requestIndex] = {
          ...allRequests.value[requestIndex],
          ...updatedData,
        };
      }

      closeModal();
      showToast('success', 'Request updated successfully');
    } catch (err) {
      showToast('error', 'Failed to update request');
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

      // Remove request from the list (or mark as cancelled)
      allRequests.value = allRequests.value.filter(
        (r) => r.request_id !== requestId
      );

      closeModal();
      showToast('error', 'Request cancelled successfully');
    } catch (err) {
      showToast('error', 'Failed to cancel request');
    } finally {
      loading.value = false;
    }
  };

  // Action methods
  const editRequest = (request) => openModal('edit', request);
  const confirmSend = (request) => openModal('send', request);
  const confirmCancel = (request) => openModal('cancel', request);
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
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed"
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
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed"
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
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed"
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

      <div class="stat border">
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
    </div>

    <!-- Request List -->
    <div class="card bg-accentColor shadow-xl mb-6 border border-black/10">
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

        <div v-if="loading && !hasRequests" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-xs"></span>
        </div>

        <div v-else-if="!hasRequests" class="text-center py-8">
          <div class="mb-4 items-center justify-center flex">
            <ReceiptText class="w-16 h-16 text-primaryColor" />
          </div>
          <h3 class="text-lg font-semibold mb-2 text-primaryColor">
            No requests found
          </h3>
          <p class="text-black/50">Add your first request.</p>
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
                <th>Request Type</th>
                <th>Request Description</th>
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
                <td>{{ request.request_date }}</td>
                <td>{{ request.request_type }}</td>
                <td>{{ request.request_description }}</td>
                <td>
                  <div
                    class="badge badge-sm badge-soft border-none"
                    :class="{
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
                      <li class="hover:bg-black/10">
                        <a @click="editRequest(request)" class="text-warning"
                          >Edit</a
                        >
                      </li>
                      <li class="hover:bg-black/10">
                        <a @click="confirmSend(request)" class="text-success"
                          >Send Request</a
                        >
                      </li>
                      <li class="hover:bg-black/10">
                        <a @click="confirmCancel(request)" class="text-error"
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
        <div class="join mt-4 justify-end space-x-1" v-if="totalPages > 1">
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

    <!-- Request History -->
    <div class="card bg-accentColor shadow-xl mb-6 border border-black/10">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h2 class="card-title text-primaryColor">Request History</h2>
          <div class="flex items-center gap-2">
            <label class="label text-black/50">Request Date:</label>
            <input
              id="request_date_history"
              v-model="requestDate"
              type="text"
              class="input input-bordered bg-white bordertext-black/50 cursor-pointer border-primaryColor placeholder:text-black/50 readonly text-black/50"
            />
          </div>
        </div>

        <div class="overflow-x-auto bg-accentColor">
          <table
            class="table table-zebra text-black/50 border border-black/10 custom-zebra"
          >
            <thead class="text-secondaryColor">
              <tr class="bg-primaryColor text-accentColor">
                <th>No.</th>
                <th>Request ID</th>
                <th>Description</th>
                <th>Date</th>
                <th>Total Amount</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="request in paginatedRequestHistory"
                :key="request.request_id"
              >
                <td>1</td>
                <td>{{ request.request_id }}</td>
                <td>{{ request.request_description }}</td>
                <td>{{ request.request_date }}</td>
                <td>{{ request.total_amount }}</td>
                <td>
                  <a
                    class="text-primaryColor cursor-pointer underline"
                    @click="
                      showReceipt = true;
                      receiptData = request;
                    "
                  >
                    view receipt
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Pagination -->
        <div
          class="join mt-4 justify-end space-x-1"
          v-if="totalPagesRequestHistory > 1"
        >
          <button
            class="join-item btn font-thin !bg-gray-200 text-black/50 btn-sm border border-none hover:bg-gray-300"
            :disabled="requestHistoryCurrentPage <= 1"
            @click="requestHistoryCurrentPage--"
            :class="{ 'btn-disabled': requestHistoryCurrentPage <= 1 }"
          >
            « Prev
          </button>

          <button
            class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
            v-for="page in totalPagesRequestHistory"
            :key="page"
            :class="{
              'btn-active': requestHistoryCurrentPage === page,
              '!bg-primaryColor text-white': requestHistoryCurrentPage === page,
            }"
            @click="requestHistoryCurrentPage = page"
          >
            {{ page }}
          </button>

          <button
            class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
            :disabled="requestHistoryCurrentPage >= totalPagesRequestHistory"
            @click="requestHistoryCurrentPage++"
            :class="{
              'btn-disabled':
                requestHistoryCurrentPage >= totalPagesRequestHistory,
            }"
          >
            Next »
          </button>
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
                <X
                  class="w-4 h-4 text-error cursor-pointer hover:bg-error/10 hover:border-error/10 hover:border-2 hover:rounded-full"
                  @click="removeRowRequest(row.id)"
                />
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
          @click="handleModalAction"
          :disabled="loading"
        >
          <span
            class="loading loading-spinner loading-xs"
            v-if="loading"
          ></span>
          {{ loading ? 'Creating...' : 'Confirm' }}
        </button>
      </div>
    </div>
  </dialog>

  <!-- Universal Modal for Edit/Send/Cancel -->
  <dialog id="universal_modal" class="modal">
    <div class="modal-box bg-accentColor text-black/50 shadow-lg">
      <!-- View Request Modal Content -->
      <template v-if="modal.type === 'viewRequest'">
        <h3 class="text-lg font-bold mb-4">Request Details</h3>
        <p>
          Are you sure you want to view request
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
        <h3 class="text-lg font-bold mb-4">Edit Request</h3>
        <form @submit.prevent="handleModalAction">
          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text text-black/50">Request Type</span>
            </label>
            <select
              v-model="modal.data.request_type"
              class="select select-bordered w-full bg-white border border-black/10 text-black/50 cursor-pointer"
              required
            >
              <option v-for="type in requestTypes" :key="type" :value="type">
                {{ type }}
              </option>
            </select>
          </div>

          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text text-black/50">Request Date</span>
            </label>
            <input
              v-model="modal.data.request_date"
              type="date"
              class="input input-bordered w-full bg-white border border-black/10 text-black/50"
              required
            />
          </div>

          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text text-black/50">Description</span>
            </label>
            <textarea
              v-model="modal.data.request_description"
              class="textarea textarea-bordered w-full bg-white border border-black/10 text-black/50 cursor-pointer"
              rows="3"
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
        </form>
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
</style>
