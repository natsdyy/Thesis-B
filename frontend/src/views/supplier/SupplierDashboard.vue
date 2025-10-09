<template>
  <div class="space-y-6">
    <!-- Welcome Section -->
    <div class="card bg-white shadow-xl border border-black/10">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-primaryColor">
              Welcome, {{ supplierName }}!
            </h2>
            <p class="text-black/60 mt-1">Here's an overview of your account</p>
          </div>
          <div class="hidden md:block">
            <div
              class="badge badge-lg bg-primaryColor/10 text-primaryColor border-none"
            >
              {{ supplierCategory }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Orders -->
      <div class="stat bg-white shadow-lg rounded-lg border border-black/10">
        <div class="stat-figure text-primaryColor">
          <ShoppingCart class="w-8 h-8" />
        </div>
        <div class="stat-title text-black/60">Total Orders</div>
        <div class="stat-value text-primaryColor">{{ stats.totalOrders }}</div>
        <div class="stat-desc text-black/50">All time</div>
      </div>

      <!-- Pending Orders -->
      <div class="stat bg-white shadow-lg rounded-lg border border-black/10">
        <div class="stat-figure text-warning">
          <Clock class="w-8 h-8" />
        </div>
        <div class="stat-title text-black/60">Pending</div>
        <div class="stat-value text-warning">{{ stats.pendingOrders }}</div>
        <div class="stat-desc text-black/50">Awaiting delivery</div>
      </div>

      <!-- Completed Orders -->
      <div class="stat bg-white shadow-lg rounded-lg border border-black/10">
        <div class="stat-figure text-success">
          <CheckCircle class="w-8 h-8" />
        </div>
        <div class="stat-title text-black/60">Completed</div>
        <div class="stat-value text-success">{{ stats.completedOrders }}</div>
        <div class="stat-desc text-black/50">Successfully delivered</div>
      </div>

      <!-- Total Revenue -->
      <div class="stat bg-white shadow-lg rounded-lg border border-black/10">
        <div class="stat-figure text-gray-800">
          <font-awesome-icon icon="fa-solid fa-peso-sign" class="!w-8 !h-8" />
        </div>
        <div class="stat-title text-black/60">Total Revenue</div>
        <div class="stat-value text-gray-800 flex items-center">
          <font-awesome-icon icon="fa-solid fa-peso-sign" />
          {{ formatCurrency(stats.totalRevenue) }}
        </div>
        <div class="stat-desc text-black/50">All time earnings</div>
      </div>
    </div>

    <!-- Recent Orders -->
    <div class="card bg-white shadow-xl border border-black/10">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <h3 class="card-title text-xl text-primaryColor">Recent Orders</h3>
          <router-link
            to="/supplier/orders"
            class="btn btn-sm btn-outline text-primaryColor hover:bg-primaryColor/10"
          >
            View All
            <ArrowRight class="w-4 h-4 ml-1" />
          </router-link>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-8">
          <span
            class="loading loading-spinner loading-lg text-primaryColor"
          ></span>
        </div>

        <!-- Empty State -->
        <div v-else-if="recentOrders.length === 0" class="text-center py-8">
          <Package class="w-16 h-16 mx-auto text-black/20 mb-4" />
          <p class="text-black/60">No orders yet</p>
        </div>

        <!-- Orders Table -->
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr class="bg-primaryColor/10">
                <th class="text-primaryColor">PO Number</th>
                <th class="text-primaryColor">Order Date</th>
                <th class="text-primaryColor">Expected Delivery</th>
                <th class="text-primaryColor">Amount</th>
                <th class="text-primaryColor">Status</th>
                <th class="text-primaryColor">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in recentOrders" :key="order.id">
                <td class="font-medium">{{ order.po_number }}</td>
                <td>{{ formatDate(order.order_date) }}</td>
                <td>{{ formatDate(order.expected_delivery) }}</td>
                <td class="font-semibold">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{ formatCurrency(order.total_amount) }}
                </td>
                <td>
                  <span class="badge" :class="getStatusClass(order.status)">
                    {{ order.status }}
                  </span>
                </td>
                <td>
                  <button
                    @click="openReceiptModal(order)"
                    class="btn btn-xs bg-primaryColor text-white hover:bg-primaryColor/90 border-none font-thin flex items-center gap-1"
                  >
                    <font-awesome-icon icon="fa-solid fa-receipt" />
                    View Receipt
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card bg-white shadow-xl border border-black/10">
      <div class="card-body">
        <h3 class="card-title text-xl text-primaryColor mb-4">Quick Actions</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <router-link
            to="/supplier/profile"
            class="btn btn-outline text-primaryColor hover:bg-primaryColor/10 justify-start"
          >
            <User class="w-5 h-5 mr-2" />
            Update Profile
          </router-link>
          <router-link
            to="/supplier/orders"
            class="btn btn-outline text-primaryColor hover:bg-primaryColor/10 justify-start"
          >
            <ShoppingCart class="w-5 h-5 mr-2" />
            View All Orders
          </router-link>
          <router-link
            to="/supplier/profile"
            class="btn btn-outline text-primaryColor hover:bg-primaryColor/10 justify-start"
          >
            <Lock class="w-5 h-5 mr-2" />
            Change Password
          </router-link>
        </div>
      </div>
    </div>

    <!-- Receipt Modal -->
    <dialog
      id="supplier_dashboard_receipt_modal"
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
  import { ref, computed, onMounted } from 'vue';
  import { useSupplierAuthStore } from '../../stores/supplierAuthStore';
  import {
    ShoppingCart,
    Clock,
    CheckCircle,
    DollarSign,
    ArrowRight,
    Package,
    User,
    Lock,
    Receipt,
  } from 'lucide-vue-next';
  import axios from 'axios';
  import { apiConfig } from '../../config/api.js';

  const supplierAuthStore = useSupplierAuthStore();

  // State
  const loading = ref(false);
  const recentOrders = ref([]);
  const receiptModal = ref({ show: false, order: null });
  const stats = ref({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
  });

  // Computed
  const supplierName = computed(() => supplierAuthStore.supplierName);
  const supplierCategory = computed(() => supplierAuthStore.supplierCategory);

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

  const loadDashboardData = async () => {
    loading.value = true;
    try {
      const token = localStorage.getItem('supplierToken');
      const supplier = JSON.parse(localStorage.getItem('supplier'));

      // Fetch purchase orders for this supplier
      const response = await axios.get(`${apiConfig.baseURL}/purchase-orders`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { supplier_id: supplier.id },
      });

      if (response.data.success) {
        const orders = response.data.data || [];

        // Calculate stats
        stats.value.totalOrders = orders.length;
        stats.value.pendingOrders = orders.filter(
          (o) => o.status === 'Pending'
        ).length;
        stats.value.completedOrders = orders.filter(
          (o) => o.status === 'Completed'
        ).length;
        stats.value.totalRevenue = orders
          .filter((o) => o.status === 'Completed')
          .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

        // Get recent orders (last 5)
        recentOrders.value = orders
          .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
          .slice(0, 5);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Use mock data if API fails
      stats.value = {
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
      };
    } finally {
      loading.value = false;
    }
  };

  // Lifecycle
  onMounted(() => {
    loadDashboardData();
  });
</script>

<style scoped>
  .stat {
    padding: 1.5rem;
  }
</style>
