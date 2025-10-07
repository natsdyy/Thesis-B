<template>
  <div class="space-y-6">
    <!-- Orders Header -->
    <div class="card bg-white shadow-xl border border-black/10">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-primaryColor">
              Purchase Orders
            </h2>
            <p class="text-black/60 mt-1">
              View and track your purchase orders
            </p>
          </div>
          <button
            @click="loadOrders"
            class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
          >
            <RefreshCw class="w-4 h-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-white shadow-xl border border-black/10">
      <div class="card-body p-4">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="status in statuses"
            :key="status.value"
            @click="filterStatus = status.value"
            class="btn btn-sm font-thin"
            :class="{
              'bg-primaryColor text-white': filterStatus === status.value,
              'btn-outline text-primaryColor': filterStatus !== status.value,
            }"
          >
            {{ status.label }}
            <span class="badge badge-sm ml-1">{{ status.count }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="text-center">
        <span
          class="loading loading-spinner loading-lg text-primaryColor"
        ></span>
        <p class="mt-2 text-black/60">Loading orders...</p>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredOrders.length === 0"
      class="card bg-white shadow-xl border border-black/10"
    >
      <div class="card-body text-center py-12">
        <Package class="w-16 h-16 mx-auto text-black/20 mb-4" />
        <h3 class="text-lg font-semibold text-black/70 mb-2">
          No orders found
        </h3>
        <p class="text-black/50">
          {{
            filterStatus === 'all'
              ? 'You have no purchase orders yet.'
              : `No ${filterStatus} orders found.`
          }}
        </p>
      </div>
    </div>

    <!-- Orders List -->
    <div v-else class="space-y-4">
      <div
        v-for="order in paginatedOrders"
        :key="order.id"
        class="card bg-white shadow-lg border border-black/10 hover:shadow-xl transition-shadow"
      >
        <div class="card-body">
          <!-- Order Header -->
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-lg font-bold text-primaryColor">
                {{ order.po_number }}
              </h3>
              <p class="text-sm text-black/60">
                Order Date: {{ formatDate(order.order_date) }}
              </p>
            </div>
            <span class="badge badge-lg" :class="getStatusClass(order.status)">
              {{ order.status }}
            </span>
          </div>

          <!-- Order Details -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p class="text-xs text-black/50">Expected Delivery</p>
              <p class="font-medium">
                {{ formatDate(order.expected_delivery) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-black/50">Total Amount</p>
              <p class="font-medium text-primaryColor">
                ₱{{ formatCurrency(order.total_amount) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-black/50">Items</p>
              <p class="font-medium">{{ order.items?.length || 0 }} item(s)</p>
            </div>
          </div>

          <!-- Order Items (Expandable) -->
          <div
            v-if="expandedOrders.includes(order.id)"
            class="border-t border-black/10 pt-4 mt-4"
          >
            <h4 class="font-semibold text-black mb-3">Order Items:</h4>
            <div class="overflow-x-auto">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in order.items" :key="item.id">
                    <td>{{ item.item_name }}</td>
                    <td>{{ item.quantity }} {{ item.unit }}</td>
                    <td>₱{{ formatCurrency(item.unit_price) }}</td>
                    <td>₱{{ formatCurrency(item.total_price) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Notes -->
            <div v-if="order.notes" class="mt-4">
              <p class="text-sm font-medium text-black/70">Notes:</p>
              <p class="text-sm text-black/60">{{ order.notes }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-2 mt-4">
            <button
              @click="openReceiptModal(order)"
              class="btn btn-sm bg-primaryColor text-white hover:bg-primaryColor/90 border-none font-thin flex items-center gap-1"
            >
              <font-awesome-icon icon="fa-solid fa-receipt" />
              View Receipt
            </button>
            <button
              @click="toggleOrderExpand(order.id)"
              class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10"
            >
              <ChevronDown
                v-if="!expandedOrders.includes(order.id)"
                class="w-4 h-4"
              />
              <ChevronUp v-else class="w-4 h-4" />
              {{ expandedOrders.includes(order.id) ? 'Hide' : 'Show' }} Details
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination Controls -->
      <div
        v-if="totalPages > 1"
        class="card bg-white shadow-xl border border-black/10"
      >
        <div class="card-body p-4">
          <div class="flex items-center justify-between">
            <!-- Pagination Info -->
            <div class="text-sm text-black/60">
              {{ paginationInfo }}
            </div>

            <!-- Pagination Buttons -->
            <div class="flex items-center gap-2">
              <!-- Previous Button -->
              <button
                @click="previousPage"
                :disabled="currentPage === 1"
                class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10"
                :class="{ 'btn-disabled': currentPage === 1 }"
              >
                Previous
              </button>

              <!-- Page Numbers -->
              <div class="flex gap-1">
                <button
                  v-for="page in totalPages"
                  :key="page"
                  @click="goToPage(page)"
                  class="btn btn-sm"
                  :class="{
                    'bg-primaryColor text-white': currentPage === page,
                    'btn-outline text-primaryColor': currentPage !== page,
                  }"
                >
                  {{ page }}
                </button>
              </div>

              <!-- Next Button -->
              <button
                @click="nextPage"
                :disabled="currentPage === totalPages"
                class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10"
                :class="{ 'btn-disabled': currentPage === totalPages }"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Receipt Modal -->
    <dialog
      id="supplier_receipt_modal"
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
            <p class="text-xs">
              PO Number: {{ receiptModal.order?.po_number }}
            </p>
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

            <!-- Supplier Information -->
            <div class="mt-3 bg-gray-50 p-3 rounded-lg">
              <h5 class="text-sm font-semibold text-black mb-2">
                Supplier Information:
              </h5>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div>
                  <span class="font-medium text-gray-700">Supplier Name:</span>
                  <span class="ml-2">{{
                    receiptModal.order.supplier_name
                  }}</span>
                </div>
                <div>
                  <span class="font-medium text-gray-700">Contact Person:</span>
                  <span class="ml-2">{{
                    receiptModal.order.supplier_contact || 'N/A'
                  }}</span>
                </div>
                <div>
                  <span class="font-medium text-gray-700">Email:</span>
                  <span class="ml-2">{{
                    receiptModal.order.supplier_email || 'N/A'
                  }}</span>
                </div>
                <div>
                  <span class="font-medium text-gray-700">Phone:</span>
                  <span class="ml-2">{{
                    receiptModal.order.supplier_phone || 'N/A'
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Order Dates -->
            <div class="mt-3 flex gap-4 text-xs text-black/70">
              <div>
                <span class="font-medium">Order Date:</span>
                <span class="ml-1">{{
                  formatDate(receiptModal.order.order_date)
                }}</span>
              </div>
              <div>
                <span class="font-medium">Expected Delivery:</span>
                <span class="ml-1">{{
                  formatDate(receiptModal.order.expected_delivery)
                }}</span>
              </div>
              <div
                v-if="
                  receiptModal.order.status === 'Completed' &&
                  receiptModal.order.completed_at
                "
              >
                <span class="font-medium">Completed On:</span>
                <span class="ml-1">{{
                  formatDate(receiptModal.order.completed_at)
                }}</span>
              </div>
            </div>
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
                  <th class="border border-black">Unit Price</th>
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
                                    (item.quantity || 0) *
                                      (item.unit_price || 0)
                                ),
                              0
                            ) || 0
                          ).toFixed(2)
                        : Number(receiptModal.order.total_amount || 0).toFixed(
                            2
                          )
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
                <div>
                  <span class="font-medium text-gray-700">Ordered Qty:</span>
                  <span class="ml-2">{{
                    receiptModal.order.items?.reduce(
                      (sum, item) => sum + Number(item.quantity || 0),
                      0
                    ) || 0
                  }}</span>
                </div>
                <div>
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
                :class="getStatusClass(receiptModal.order.status)"
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

          </div>

          <!-- Signature Section -->
          <div class="flex justify-between mt-8 w-full gap-8">
            <div class="flex flex-col items-start flex-1">
              <div class="text-sm font-semibold text-black mb-2">Supplier:</div>
              <div class="border-b-2 border-black w-full mb-1 h-12"></div>
              <div class="text-xs font-medium text-gray-800">
                {{ receiptModal.order.supplier_name }}
              </div>
              <div class="text-xs text-gray-600">
                {{
                  receiptModal.order.supplier_contact ||
                  'Authorized Representative'
                }}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                Signature over Printed Name
              </div>
            </div>
            <div class="flex flex-col items-end flex-1">
              <div class="text-sm font-semibold text-black mb-2">
                Received By:
              </div>
              <div class="border-b-2 border-black w-full mb-1 h-12"></div>
              <div class="text-xs font-medium text-gray-800 text-right">
                {{
                  receiptModal.order.received_by ||
                  receiptModal.order.completed_by ||
                  'N/A'
                }}
              </div>
              <div class="text-xs text-gray-600 text-right">
                Countryside Steakhouse Employee
              </div>
              <div class="text-xs text-gray-500 mt-1">
                Signature over Printed Name
              </div>
            </div>
          </div>
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
      <form method="dialog" class="modal-backdrop">
        <button @click="closeReceiptModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { useSupplierAuthStore } from '../../stores/supplierAuthStore';
  import {
    Package,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Receipt,
  } from 'lucide-vue-next';
  import axios from 'axios';
  import { apiConfig } from '../../config/api.js';

  const supplierAuthStore = useSupplierAuthStore();

  // State
  const loading = ref(false);
  const orders = ref([]);
  const filterStatus = ref('all');
  const expandedOrders = ref([]);
  const currentPage = ref(1);
  const itemsPerPage = ref(5);
  const receiptModal = ref({ show: false, order: null });

  // Computed
  const statuses = computed(() => {
    const statusCounts = orders.value.reduce((acc, order) => {
      acc[order.status.toLowerCase()] =
        (acc[order.status.toLowerCase()] || 0) + 1;
      return acc;
    }, {});

    return [
      { value: 'all', label: 'All', count: orders.value.length },
      { value: 'pending', label: 'Pending', count: statusCounts.pending || 0 },
      {
        value: 'completed',
        label: 'Completed',
        count: statusCounts.completed || 0,
      },
      {
        value: 'cancelled',
        label: 'Cancelled',
        count: statusCounts.cancelled || 0,
      },
    ];
  });

  const filteredOrders = computed(() => {
    if (filterStatus.value === 'all') {
      return orders.value;
    }
    return orders.value.filter(
      (order) => order.status.toLowerCase() === filterStatus.value
    );
  });

  const paginatedOrders = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return filteredOrders.value.slice(start, end);
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredOrders.value.length / itemsPerPage.value);
  });

  const paginationInfo = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value + 1;
    const end = Math.min(
      currentPage.value * itemsPerPage.value,
      filteredOrders.value.length
    );
    return `Showing ${start}-${end} of ${filteredOrders.value.length}`;
  });

  // Methods
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getStatusClass = (status) => {
    const statusMap = {
      Pending: 'bg-warning/10 text-warning',
      Completed: 'bg-success/10 text-success',
      Cancelled: 'bg-error/10 text-error',
      'In Transit': 'bg-info/10 text-info',
    };
    return statusMap[status] || 'bg-ghost';
  };

  const toggleOrderExpand = (orderId) => {
    const index = expandedOrders.value.indexOf(orderId);
    if (index > -1) {
      expandedOrders.value.splice(index, 1);
    } else {
      expandedOrders.value.push(orderId);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
    }
  };

  const nextPage = () => {
    if (currentPage.value < totalPages.value) {
      currentPage.value++;
    }
  };

  const previousPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--;
    }
  };

  const openReceiptModal = async (order) => {
    try {
      const token = localStorage.getItem('supplierToken');
      const response = await axios.get(
        `${apiConfig.baseURL}/purchase-orders/${order.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        receiptModal.value = { show: true, order: response.data.data };
      }
    } catch (error) {
      console.error('Failed to load receipt:', error);
    }
  };

  const closeReceiptModal = () => {
    receiptModal.value = { show: false, order: null };
  };

  const printReceipt = () => {
    window.print();
  };

  const loadOrders = async () => {
    loading.value = true;
    try {
      const token = localStorage.getItem('supplierToken');
      const supplier = JSON.parse(localStorage.getItem('supplier'));

      const response = await axios.get(`${apiConfig.baseURL}/purchase-orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { supplier_id: supplier.id },
      });

      if (response.data.success) {
        orders.value = response.data.data || [];
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      orders.value = [];
    } finally {
      loading.value = false;
    }
  };

  // Watch for filter changes to reset pagination
  watch(filterStatus, () => {
    currentPage.value = 1;
  });

  // Lifecycle
  onMounted(() => {
    loadOrders();
  });
</script>

<style scoped>
  .badge-lg {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
</style>
