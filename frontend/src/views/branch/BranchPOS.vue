<script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useRouter } from 'vue-router';
  import {
    CreditCard,
    Package,
    Users,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertCircle,
    Shield,
    UserX,
    Plus,
    Minus,
    X,
    Receipt,
    ShoppingCart,
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { useAuthStore } from '../../stores/authStore';
  import { usePOSSessionStore } from '../../stores/posSessionStore';
  import { usePOSStore } from '../../stores/posStore';
  import axios from 'axios';
  import { apiConfig } from '../../config/api.js';
  import QRCodeGenerator from '../../components/common/QRCodeGenerator.vue';
  import POSTransactionModal from '../../components/branch/POSTransactionModal.vue';

  const branchContextStore = useBranchContextStore();
  const authStore = useAuthStore();
  const posSessionStore = usePOSSessionStore();
  const posStore = usePOSStore();
  const router = useRouter();
  const API_BASE_URL = apiConfig.baseURL;

  // Function to get the correct base URL for QR codes
  const getQRBaseUrl = () => {
    // In development, use the network IP so phones can access it
    if (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ) {
      // For local development, use the network IP so phones can access it
      return `http://192.168.68.111:8080`;
    }
    // In production, use the current origin
    return window.location.origin;
  };

  // Local state
  const loading = ref(false);
  const accessDenied = ref(false);
  const needsManagerLogin = ref(false);
  const managerLoginForm = ref({
    employeeId: '',
  });
  const managerLoginError = ref('');
  const showEmployeeId = ref(false);
  const stats = ref({
    todaySales: 0,
    todayTransactions: 0,
    averageTransaction: 0,
    activeOrders: 0,
  });
  const statsLoading = ref(false);

  // POS UI state
  const showOrderCompleteModal = ref(false);
  const showOrderConfirmationModal = ref(false);
  const showReceiptModal = ref(false);
  const showVoidOrderModal = ref(false);
  const hasPrintedReceipt = ref(false);
  const orderCompleteData = ref(null);
  const orderConfirmationData = ref(null);
  const confirmationOrderType = ref('Dine In');
  const paymentInput = ref('');
  const isProcessingOrder = ref(false);
  const receiptData = ref(null);
  const voidOrderData = ref(null);
  const voidReason = ref('');
  const showTransactionModal = ref(false);

  // Computed
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const userRole = computed(() => authStore.userRole);
  const user = computed(() => authStore.user);

  // POS Access Control
  const canAccessPOS = computed(() => {
    const allowedRoles = ['Manager', 'Cashier'];
    return allowedRoles.includes(userRole.value);
  });

  // Check if manager session is active
  const isManagerSessionActive = computed(
    () => posSessionStore.isSessionActive
  );
  const managerInfo = computed(() => posSessionStore.managerInfo);
  const sessionTimeRemaining = computed(
    () => posSessionStore.sessionTimeRemainingMinutes
  );

  // Manager login via Employee ID only
  const handleManagerLogin = async () => {
    managerLoginError.value = '';

    const employeeId = managerLoginForm.value.employeeId?.trim();

    if (!employeeId) {
      managerLoginError.value = 'Employee ID is required';
      return;
    }

    try {
      // Fetch employee by employee_id
      const res = await axios.get(
        `${API_BASE_URL}/employees/employee-id/${encodeURIComponent(employeeId)}`
      );
      const employee = res.data?.data;

      if (!employee) {
        managerLoginError.value = 'Employee not found';
        return;
      }

      // Role and status checks
      if (employee.role !== 'Manager') {
        managerLoginError.value = 'Only a Manager can start a POS session';
        return;
      }

      if (!employee.branch_id || employee.branch_id !== user.value.branch_id) {
        managerLoginError.value = 'Manager must belong to this branch';
        return;
      }

      // Start manager session (local only)
      posSessionStore.startManagerSession({
        id: employee.id,
        name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
        role: employee.role,
        branch_id: employee.branch_id,
        email: employee.email,
        loginTime: new Date().toISOString(),
      });

      needsManagerLogin.value = false;
      managerLoginForm.value = { employeeId: '' };
      // Load POS data immediately after session activation
      await startPOSDataLoad();
    } catch (err) {
      console.error('POS manager PIN login failed:', err);
      managerLoginError.value =
        err.response?.data?.message || 'Unable to verify manager';
    }
  };

  const handleManagerLogout = () => {
    posSessionStore.endManagerSession();
    needsManagerLogin.value = true;
  };

  // Session validation and access control
  const validatePOSAccess = () => {
    // Check if user is authenticated
    if (!authStore.isAuthenticated || !user.value) {
      accessDenied.value = true;
      return false;
    }

    // Check if user has branch assignment
    if (!user.value.branch_id) {
      accessDenied.value = true;
      return false;
    }

    // Check if user role can access POS
    if (!canAccessPOS.value) {
      accessDenied.value = true;
      return false;
    }

    // Check manager session requirement
    if (userRole.value === 'Cashier' && !isManagerSessionActive.value) {
      needsManagerLogin.value = true;
      return false;
    }

    // If user is Manager and no session exists, they can start one
    if (userRole.value === 'Manager' && !isManagerSessionActive.value) {
      needsManagerLogin.value = true;
      return false;
    }

    return true;
  };

  // Session timeout check
  const checkSessionTimeout = () => {
    if (isManagerSessionActive.value && sessionTimeRemaining.value <= 0) {
      posSessionStore.endManagerSession();
      needsManagerLogin.value = true;
    }
  };

  // Set up session timeout monitoring
  let sessionTimeoutInterval = null;

  // POS Methods
  const handleAddToOrder = (menuItem) => {
    const success = posStore.addItemToOrder(menuItem);
    if (!success) {
      // Show error message for out of stock items
      console.warn('Item is out of stock');
    }
  };

  const handleRemoveFromOrder = (itemId) => {
    posStore.removeItemFromOrder(itemId);
  };

  const handleUpdateQuantity = (itemId, quantity) => {
    posStore.updateItemQuantity(itemId, quantity);
  };

  const handleOrderTypeChange = (type) => {
    posStore.setOrderType(type);
  };

  const handlePaymentInput = (value) => {
    paymentInput.value = value;
    posStore.setAmountPaid(value);
  };

  const handleKeypadInput = (value) => {
    if (value === 'backspace') {
      paymentInput.value = paymentInput.value.slice(0, -1);
    } else if (value === 'clear') {
      paymentInput.value = '';
    } else if (value === 'ok') {
      // Deprecated - keypad ok no longer used
    } else {
      paymentInput.value += value;
    }

    // Keep store in sync so isOrderValid updates immediately
    posStore.setAmountPaid(paymentInput.value);
  };

  const processOrder = async () => {
    if (!posStore.isOrderValid) {
      alert(
        'Please ensure all items are added and payment amount is sufficient'
      );
      return;
    }

    // Show confirmation modal first
    orderConfirmationData.value = {
      orderNumber: posStore.getNextOrderNumber(),
      orderType: posStore.currentOrder.orderType,
      items: posStore.currentOrder.items,
      subtotal: posStore.orderTotal,
      amountPaid: parseFloat(paymentInput.value) || 0,
      change: (parseFloat(paymentInput.value) || 0) - posStore.orderTotal,
      cashierInfo: { name: user.value?.name },
      timestamp: new Date().toLocaleString(),
    };
    confirmationOrderType.value = posStore.currentOrder.orderType;
    showOrderConfirmationModal.value = true;
  };

  const confirmOrder = async () => {
    isProcessingOrder.value = true;
    try {
      // Ensure selected order type in confirmation is applied
      if (
        confirmationOrderType.value &&
        confirmationOrderType.value !== posStore.currentOrder.orderType
      ) {
        posStore.setOrderType(confirmationOrderType.value);
      }
      const orderData = await posStore.processOrder();
      orderCompleteData.value = orderData;
      showOrderConfirmationModal.value = false;
      showOrderCompleteModal.value = true;
      paymentInput.value = '';

      // Update stats after successful order
      await fetchTodayStats();
    } catch (error) {
      console.error('Error processing order:', error);
      const errorMessage =
        error?.response?.data?.message ||
        error.message ||
        'Failed to process order. Please try again.';
      alert(errorMessage);
    } finally {
      isProcessingOrder.value = false;
    }
  };

  const closeOrderCompleteModal = () => {
    showOrderCompleteModal.value = false;
    orderCompleteData.value = null;
  };

  const closeOrderConfirmationModal = () => {
    showOrderConfirmationModal.value = false;
    orderConfirmationData.value = null;
  };

  const showReceipt = () => {
    if (orderCompleteData.value) {
      hasPrintedReceipt.value = false;
      receiptData.value = {
        ...orderCompleteData.value,
        cashierName: user.value?.name,
        branchName: currentBranch.value?.name,
        branchLocation:
          currentBranch.value?.location || currentBranch.value?.address,
        orderType: confirmationOrderType.value,
        timestamp: new Date().toLocaleString(),
        qrData: `${getQRBaseUrl()}/rate-order?order=${encodeURIComponent(orderCompleteData.value.order_number)}`,
      };
      showReceiptModal.value = true;
    }
  };

  const closeReceiptModal = () => {
    showReceiptModal.value = false;
    receiptData.value = null;
  };

  const printReceipt = () => {
    try {
      if (typeof window !== 'undefined' && window.print) {
        window.print();
        hasPrintedReceipt.value = true;
        closeReceiptModal();
      } else {
        console.warn('Print function not available');
        // Fallback: just mark as printed
        hasPrintedReceipt.value = true;
        closeReceiptModal();
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      // Fallback: just mark as printed
      hasPrintedReceipt.value = true;
      closeReceiptModal();
    }
  };

  const resetOrder = () => {
    posStore.resetOrder();
    paymentInput.value = '';
  };

  // Fetch today's sales statistics
  const fetchTodayStats = async () => {
    try {
      statsLoading.value = true;
      const today = new Date().toISOString().split('T')[0];
      const branchId = currentBranch.value?.id || user.value?.branch_id;

      if (!branchId) return;

      // Use the store method instead of direct API call
      const data = await posStore.fetchDailySummary(branchId, today);

      if (data) {
        stats.value = {
          todaySales: data.total_sales || 0,
          todayTransactions: data.completed_orders || 0,
          averageTransaction: data.average_order_value || 0,
          activeOrders:
            data.total_orders - data.completed_orders - data.voided_orders || 0,
        };
      }
    } catch (error) {
      console.error('Error fetching today stats:', error);
      // Keep existing stats if fetch fails
    } finally {
      statsLoading.value = false;
    }
  };

  // Void order functionality
  const showVoidOrder = (orderData) => {
    voidOrderData.value = orderData;
    voidReason.value = '';
    showVoidOrderModal.value = true;
  };

  const confirmVoidOrder = async () => {
    if (!voidReason.value.trim()) {
      alert('Please provide a reason for voiding the order');
      return;
    }

    try {
      await posStore.voidOrder(voidOrderData.value.id, voidReason.value);
      showVoidOrderModal.value = false;
      voidOrderData.value = null;
      voidReason.value = '';

      // Update stats after voiding order
      await fetchTodayStats();

      alert('Order voided successfully');
    } catch (error) {
      console.error('Error voiding order:', error);
      alert('Failed to void order. Please try again.');
    }
  };

  const closeVoidOrderModal = () => {
    showVoidOrderModal.value = false;
    voidOrderData.value = null;
    voidReason.value = '';
  };

  // Transaction modal functions
  const showTransactions = () => {
    showTransactionModal.value = true;
  };

  const closeTransactionModal = () => {
    showTransactionModal.value = false;
  };

  const reopenTransactionModal = () => {
    showTransactionModal.value = true;
  };

  // Refresh POS data after transaction operations
  const refreshPOSData = async () => {
    // Reload menu items to reflect latest branch stock without full page reload
    const q = router.currentRoute.value.query || {};
    const menuId = q.menuId ? Number(q.menuId) : undefined;
    const itemCodes = q.codes
      ? String(q.codes)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const branchId = currentBranch.value?.id || user.value?.branch_id;

    // Refetch POS menu with reset so quantities update reactively
    await posStore.fetchMenuItems({ menuId, itemCodes, branchId, reset: true });
    await posStore.fetchCategories();

    await fetchTodayStats();
  };

  // Complete order functionality
  const completeOrder = async (orderData) => {
    try {
      await posStore.completeOrder(orderData.id);

      // Update stats after completing order
      await refreshPOSData();

      alert('Order completed successfully');
    } catch (error) {
      console.error('Error completing order:', error);
      alert('Failed to complete order. Please try again.');
    }
  };

  // Encapsulated POS data bootstrap so we can reuse after manager login
  const startPOSDataLoad = async () => {
    try {
      // Ensure branch context is ready
      if (!branchContextStore.currentBranch) {
        await branchContextStore.initializeBranchContext();
      }

      const q = router.currentRoute.value.query || {};
      const menuId = q.menuId ? Number(q.menuId) : undefined;
      const itemCodes = q.codes
        ? String(q.codes)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const branchId = currentBranch.value?.id || user.value?.branch_id;

      if (!branchId) return;

      await posStore.initialize({ menuId, itemCodes, branchId });
      await fetchTodayStats();
    } catch (e) {
      console.error('Failed to start POS data load:', e);
    }
  };

  // Placeholder data
  onMounted(async () => {
    // Validate access first
    if (!validatePOSAccess()) {
      return;
    }

    // Setup infinite scroll on the left menu panel
    const scrollContainer = document.querySelector(
      '.flex-1.p-6.overflow-y-auto'
    );
    const onScroll = async () => {
      if (!scrollContainer) return;
      const nearBottom =
        scrollContainer.scrollTop + scrollContainer.clientHeight >=
        scrollContainer.scrollHeight - 100;
      if (nearBottom && posStore.hasMore && !posStore.loading) {
        await posStore.loadMore({ menuId, itemCodes, branchId });
      }
    };

    // Register cleanup hooks BEFORE any await statements
    onUnmounted(() => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', onScroll);
      }
      if (sessionTimeoutInterval) {
        clearInterval(sessionTimeoutInterval);
      }
    });

    // Initialize branch context if not already set
    if (!branchContextStore.currentBranch) {
      await branchContextStore.initializeBranchContext();
    }

    // Set up session timeout monitoring
    sessionTimeoutInterval = setInterval(checkSessionTimeout, 60000); // Check every minute

    // Initialize POS store using menuId/itemCodes if provided via route, and branch context for stock basis
    const q = router.currentRoute.value.query || {};
    const menuId = q.menuId ? Number(q.menuId) : undefined;
    const itemCodes = q.codes
      ? String(q.codes)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const branchId = currentBranch.value?.id || user.value?.branch_id;

    await posStore.initialize({ menuId, itemCodes, branchId });

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    }

    // Fetch real POS data
    await fetchTodayStats();
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Manager Login Required -->
    <div
      v-if="needsManagerLogin"
      class="min-h-screen flex items-center justify-center py-6 lg:py-12"
    >
      <div class="max-w-sm sm:max-w-md lg:max-w-lg mx-auto px-4 w-full">
        <div
          class="p-4 sm:p-6 bg-secondaryColor/10 border border-primaryColor rounded-lg shadow-lg"
        >
          <Shield
            class="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-primaryColor mb-4"
          />
          <h2
            class="text-lg sm:text-xl font-bold text-primaryColor mb-2 text-center"
          >
            Manager PIN Required
          </h2>
          <p class="text-sm sm:text-base text-primaryColor mb-4 text-center">
            {{
              userRole === 'Manager'
                ? 'Please enter your PIN to start the POS session'
                : 'A manager must enter their PIN to activate the POS system'
            }}
          </p>

          <div v-if="userRole === 'Manager'" class="space-y-3 sm:space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm sm:text-base"
                  >Manager PIN:</span
                >
              </label>
              <div class="relative">
                <input
                  v-model="managerLoginForm.employeeId"
                  :type="showEmployeeId ? 'text' : 'password'"
                  placeholder="Enter your PIN"
                  class="input input-bordered w-full input-sm sm:input-md pr-10"
                  @keyup.enter="handleManagerLogin"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
                  @click="showEmployeeId = !showEmployeeId"
                >
                  <font-awesome-icon
                    :icon="
                      showEmployeeId
                        ? 'fa-solid fa-eye-slash'
                        : 'fa-solid fa-eye'
                    "
                  />
                </button>
              </div>
            </div>

            <div v-if="managerLoginError" class="alert alert-error">
              <AlertCircle class="w-4 h-4" />
              <span>{{ managerLoginError }}</span>
            </div>

            <button
              @click="handleManagerLogin"
              class="btn bg-primaryColor text-white w-full font-thin border-none hover:bg-primaryColor/80 btn-sm sm:btn-md"
              :disabled="!managerLoginForm.employeeId"
            >
              <Shield class="w-4 h-4 mr-2" />
              <span class="text-sm sm:text-base">Start POS Session</span>
            </button>
          </div>

          <div v-else class="space-y-3 sm:space-y-4">
            <div class="text-sm text-primaryColor">
              <p>
                <strong>Current User:</strong> {{ user?.name }} ({{ userRole }})
              </p>
              <p><strong>Branch:</strong> {{ currentBranch?.name }}</p>
              <p class="mt-2">
                A manager must enter their PIN to activate the POS system.
              </p>
            </div>

            <div class="divider">Manager PIN Required</div>

            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm sm:text-base">Manager PIN</span>
              </label>
              <div class="relative">
                <input
                  v-model="managerLoginForm.employeeId"
                  :type="showEmployeeId ? 'text' : 'password'"
                  placeholder="Enter manager PIN"
                  class="input input-bordered w-full input-sm sm:input-md pr-10"
                  @keyup.enter="handleManagerLogin"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  @click="showEmployeeId = !showEmployeeId"
                >
                  <font-awesome-icon
                    :icon="
                      showEmployeeId
                        ? 'fa-solid fa-eye-slash'
                        : 'fa-solid fa-eye'
                    "
                  />
                </button>
              </div>
            </div>

            <div v-if="managerLoginError" class="alert alert-error">
              <AlertCircle class="w-4 h-4" />
              <span>{{ managerLoginError }}</span>
            </div>

            <button
              @click="handleManagerLogin"
              class="btn bg-primaryColor text-white w-full font-thin border-none hover:bg-primaryColor/80 btn-sm sm:btn-md"
              :disabled="!managerLoginForm.employeeId"
            >
              <Shield class="w-4 h-4 mr-2" />
              <span class="text-sm sm:text-base">Start POS Session</span>
            </button>
          </div>
          <div class="flex justify-center">
            <button
              @click="router.push('/branch/dashboard')"
              class="btn btn-outline btn-sm sm:btn-md mt-4 font-thin"
            >
              <span class="text-sm sm:text-base">Return to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Access Denied Screen -->
    <div
      v-else-if="accessDenied"
      class="min-h-screen flex items-center justify-center py-6 lg:py-12"
    >
      <div class="max-w-sm sm:max-w-md lg:max-w-lg mx-auto px-4 w-full">
        <div class="p-4 sm:p-6 bg-red-50 border border-red-200 rounded-lg">
          <UserX class="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-red-500 mb-4" />
          <h2 class="text-lg sm:text-xl font-bold text-red-800 mb-2">
            Access Denied
          </h2>
          <p class="text-sm sm:text-base text-red-600 mb-4">
            You don't have permission to access the POS system.
          </p>
          <div class="space-y-2 text-xs sm:text-sm text-red-700">
            <p><strong>Required Roles:</strong> Manager or Cashier</p>
            <p><strong>Your Role:</strong> {{ userRole || 'Unknown' }}</p>
            <p v-if="!user?.branch_id">
              <strong>Issue:</strong> No branch assignment
            </p>
          </div>
          <button
            @click="router.push('/branch/dashboard')"
            class="btn btn-outline btn-error mt-4 font-thin btn-sm sm:btn-md"
          >
            <span class="text-sm sm:text-base">Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>

    <!-- POS Interface (only shown if access granted) -->
    <div v-else class="min-h-screen flex flex-col bg-gray-50">
      <!-- Header -->
      <div class="bg-white shadow-sm border-b px-4 sm:px-6 py-3 sm:py-4">
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4"
        >
          <div class="flex flex-row items-center gap-2">
            <h1 class="text-xl sm:text-2xl font-bold text-gray-900">
              Point of Sale
            </h1>
            <p class="text-sm sm:text-base text-gray-600">
              ({{
                currentBranch?.name ||
                user?.branch_name ||
                `Branch ${user?.branch_id || 'Unknown'}`
              }}
              )
            </p>
          </div>
          <div
            class="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-4"
          >
            <div class="text-left sm:text-right">
              <p class="text-sm sm:text-base font-medium">
                {{ user?.name }} ({{ userRole }})
              </p>
              <button
                @click="showTransactions"
                class="btn btn-xs mt-1"
                title="View Recent Transactions"
              >
                <Receipt class="w-3 h-3 mr-1" />
                Transactions
              </button>
            </div>
            <button
              v-if="userRole === 'Manager' && isManagerSessionActive"
              @click="handleManagerLogout"
              class="btn btn-xs sm:btn-sm btn-outline btn-error"
            >
              End Session
            </button>
          </div>
        </div>
      </div>

      <!-- Main POS Interface -->
      <div class="flex-1 flex flex-row overflow-hidden max-h-[90vh]">
        <!-- Left Side - Menu -->
        <div class="flex-1 flex flex-col bg-white">
          <!-- Category Navigation -->
          <div class="bg-primaryColor px-6 py-3">
            <div class="flex space-x-2 overflow-x-auto scrollbar-hide">
              <button
                v-for="category in posStore.categories"
                :key="category"
                @click="posStore.setSelectedCategory(category)"
                class="btn btn-sm px-4 py-2 rounded-sm font-medium whitespace-nowrap transition-colors flex-shrink-0"
                :class="
                  posStore.selectedCategory === category
                    ? 'bg-white/10 backdrop-blur-sm text-white'
                    : 'btn-ghost text-white hover:bg-primaryColor/80'
                "
              >
                {{ category }}
              </button>
            </div>
          </div>

          <!-- Menu Items Grid -->
          <div class="flex-1 p-6 overflow-y-auto max-h-[90vh]">
            <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              <div
                v-for="item in posStore.filteredMenuItems"
                :key="item.id"
                class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex p-5 relative"
                :class="{
                  'opacity-60 border-red-300 bg-red-50': item.is_expired,
                  'border-orange-300 bg-orange-50':
                    item.is_expiring_soon && !item.is_expired,
                  'cursor-not-allowed': item.is_expired,
                }"
                @click="
                  item.stock_quantity > 0 &&
                  !item.is_expired &&
                  handleAddToOrder(item)
                "
              >
                <!-- Item Image -->
                <div class="w-2/5 bg-gray-100 aspect-square">
                  <img
                    v-if="item.image_url"
                    :src="item.image_url"
                    :alt="item.name"
                    class="w-full h-full object-cover rounded-lg"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-gray-400"
                  >
                    <Package class="w-8 h-8 sm:w-12 sm:h-12" />
                  </div>
                </div>

                <!-- Expired Overlay -->
                <div
                  v-if="item.is_expired"
                  class="absolute inset-0 bg-red-500/20 flex items-center justify-center z-10"
                >
                  <div
                    class="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold"
                  >
                    EXPIRED
                  </div>
                </div>

                <!-- Expiring Soon Warning -->
                <div
                  v-if="item.is_expiring_soon && !item.is_expired"
                  class="absolute top-2 right-2 z-10"
                >
                  <div
                    class="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold"
                  >
                    EXPIRES SOON
                  </div>
                </div>

                <!-- Item Details -->
                <div class="w-3/5 p-3 flex flex-col justify-between">
                  <div>
                    <!-- Stock -->
                    <span
                      class="badge badge-sm border-none mb-1"
                      :class="
                        item.is_expired
                          ? 'bg-red-500/20 text-red-600'
                          : item.stock_quantity > 0
                            ? 'bg-success/20 text-success'
                            : 'bg-error/20 text-error'
                      "
                    >
                      {{
                        item.is_expired
                          ? 'EXPIRED'
                          : item.is_expiring_soon
                            ? 'EXPIRES SOON'
                            : `Stock: ${item.stock_quantity}`
                      }}
                    </span>
                  </div>
                  <div class="my-5">
                    <!-- Name -->
                    <h2 class="font-semibold text-gray-900 text-md">
                      {{ item.name }}
                    </h2>
                  </div>

                  <div class="">
                    <!-- Price -->
                    <p class="text-lg font-bold text-gray-900 mt-2">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{ parseFloat(item.price).toFixed(2) }}
                    </p>
                  </div>

                  <!-- Order Button -->
                  <button
                    @click.stop="handleAddToOrder(item)"
                    :disabled="item.stock_quantity <= 0 || item.is_expired"
                    class="btn btn-sm w-full font-medium mt-3"
                    :class="
                      item.is_expired
                        ? 'btn-disabled bg-red-100 text-red-500'
                        : item.stock_quantity > 0
                          ? 'bg-primaryColor text-white'
                          : 'btn-disabled'
                    "
                  >
                    {{
                      item.is_expired
                        ? 'EXPIRED'
                        : item.stock_quantity > 0
                          ? 'Order'
                          : 'Out of Stock'
                    }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Side - Order Summary -->
        <div
          class="w-96 bg-white border-l border-gray-200 flex flex-col max-h-[90vh]"
        >
          <!-- Order Header -->
          <div class="bg-primaryColor text-white px-4 py-4">
            <h2 class="text-md font-semibold">
              Order Number {{ posStore.getNextOrderNumber() }}
            </h2>
          </div>

          <!-- Order Items -->
          <div
            class="flex-1 p-6 overflow-y-auto"
            :class="{
              'flex items-center justify-center':
                posStore.currentOrder.items.length === 0,
            }"
          >
            <div
              v-if="posStore.currentOrder.items.length === 0"
              class="text-center text-gray-500"
            >
              <ShoppingCart class="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No items in order</p>
            </div>

            <div v-else class="space-y-4 w-full">
              <div
                v-for="item in posStore.currentOrder.items"
                :key="item.id"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-sm"
              >
                <div class="flex-1 min-w-0">
                  <h4 class="font-medium text-gray-900 truncate">
                    {{ item.name }}
                  </h4>
                  <p class="text-sm text-gray-600">
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{ parseFloat(item.price || 0).toFixed(2) }}
                  </p>
                </div>

                <!-- Quantity Controls -->
                <div class="flex items-center space-x-2 flex-shrink-0">
                  <button
                    @click="handleUpdateQuantity(item.id, item.quantity - 1)"
                    class="btn btn-xs btn-circle bg-error text-white"
                  >
                    <Minus class="w-4 h-4" />
                  </button>
                  <span class="w-8 text-center font-medium">
                    {{ item.quantity }}
                  </span>
                  <button
                    @click="handleUpdateQuantity(item.id, item.quantity + 1)"
                    class="btn btn-xs btn-circle bg-primaryColor text-white"
                  >
                    <Plus class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Order Total -->
          <div class="p-6 border-t border-gray-200">
            <div class="space-y-3">
              <div class="flex justify-between text-lg font-semibold">
                <span>Total Cost:</span>
                <span
                  ><font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                    posStore.orderTotal.toFixed(2)
                  }}</span
                >
              </div>

              <!-- Payment Input -->
              <div class="space-y-1 sm:space-y-2">
                <label class="text-xs sm:text-sm font-medium text-gray-700"
                  >Amount Paid:</label
                >
                <input
                  v-model="paymentInput"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primaryColor focus:border-transparent text-sm sm:text-base"
                  @input="handlePaymentInput($event.target.value)"
                />
              </div>

              <!-- Order Type Selection moved to confirmation modal -->
            </div>
          </div>

          <!-- Numeric Keypad -->
          <div class="p-6 border-t border-gray-200">
            <div class="grid grid-cols-4 gap-2">
              <!-- Row 1 -->
              <button
                @click="handleKeypadInput('7')"
                class="btn btn-outline btn-sm"
              >
                7
              </button>
              <button
                @click="handleKeypadInput('8')"
                class="btn btn-outline btn-sm"
              >
                8
              </button>
              <button
                @click="handleKeypadInput('9')"
                class="btn btn-outline btn-sm"
              >
                9
              </button>
              <button
                @click="handleKeypadInput('backspace')"
                class="btn btn-error btn-sm"
              >
                <X class="w-4 h-4" />
              </button>

              <!-- Row 2 -->
              <button
                @click="handleKeypadInput('4')"
                class="btn btn-outline btn-xs sm:btn-sm touch-manipulation"
              >
                4
              </button>
              <button
                @click="handleKeypadInput('5')"
                class="btn btn-outline btn-xs sm:btn-sm touch-manipulation"
              >
                5
              </button>
              <button
                @click="handleKeypadInput('6')"
                class="btn btn-outline btn-xs sm:btn-sm touch-manipulation"
              >
                6
              </button>
              <button
                @click="handleKeypadInput('clear')"
                class="btn btn-error btn-xs sm:btn-sm touch-manipulation"
              >
                clr
              </button>

              <!-- Row 3 -->
              <button
                @click="handleKeypadInput('1')"
                class="btn btn-outline btn-xs sm:btn-sm touch-manipulation"
              >
                1
              </button>
              <button
                @click="handleKeypadInput('2')"
                class="btn btn-outline btn-xs sm:btn-sm touch-manipulation"
              >
                2
              </button>
              <button
                @click="handleKeypadInput('3')"
                class="btn btn-outline btn-xs sm:btn-sm touch-manipulation"
              >
                3
              </button>

              <button
                @click="resetOrder"
                class="btn btn-warning btn-xs sm:btn-sm touch-manipulation"
              >
                Reset
              </button>
              <!-- Row 4 -->
              <button
                @click="handleKeypadInput('0')"
                class="btn btn-outline btn-xs sm:btn-sm touch-manipulation"
              >
                0
              </button>
              <button
                @click="handleKeypadInput('00')"
                class="btn btn-outline btn-xs sm:btn-sm touch-manipulation"
              >
                00
              </button>

              <button
                @click="processOrder"
                :disabled="!posStore.isOrderValid || isProcessingOrder"
                class="btn btn-success btn-xs sm:btn-sm touch-manipulation border-none shadow-none col-span-2"
                :class="
                  posStore.isOrderValid
                    ? 'bg-primaryColor hover:bg-primaryColor/80 active:bg-primaryColor/90 text-white font-thin'
                    : 'bg-gray-400'
                "
              >
                <span class="hidden sm:inline">{{
                  isProcessingOrder ? 'Processing...' : 'Process Order'
                }}</span>
                <span class="sm:hidden">{{
                  isProcessingOrder ? '...' : 'Process'
                }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Order Confirmation Modal -->
      <div
        v-if="showOrderConfirmationModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      >
        <div
          class="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div class="text-center mb-6">
            <AlertCircle
              class="w-12 h-12 sm:w-16 sm:h-16 text-amber-500 mx-auto mb-3 sm:mb-4"
            />
            <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              Confirm Order
            </h3>
            <p class="text-sm sm:text-base text-gray-600">
              Please review the order details before finalizing the transaction
            </p>
          </div>

          <!-- Order Details -->
          <div class="space-y-4 mb-6">
            <!-- Order Info -->
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="font-medium text-gray-600">Order Number:</span>
                  <p class="font-semibold">
                    {{ orderConfirmationData?.orderNumber }}
                  </p>
                </div>
                <div>
                  <span class="font-medium text-gray-600">Order Type:</span>
                  <div class="flex space-x-2 mt-1">
                    <button
                      @click="confirmationOrderType = 'Dine In'"
                      class="px-3 py-1 rounded-sm text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                      :class="
                        confirmationOrderType === 'Dine In'
                          ? 'bg-primaryColor text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      "
                    >
                      Dine In
                    </button>
                    <button
                      @click="confirmationOrderType = 'Take Out'"
                      class="px-3 py-1 rounded-sm text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                      :class="
                        confirmationOrderType === 'Take Out'
                          ? 'bg-primaryColor text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      "
                    >
                      Take Out
                    </button>
                  </div>
                </div>
                <div>
                  <span class="font-medium text-gray-600">Date & Time:</span>
                  <p class="font-semibold">
                    {{ orderConfirmationData?.timestamp }}
                  </p>
                </div>
                <div>
                  <span class="font-medium text-gray-600">Cashier:</span>
                  <p class="font-semibold">
                    {{ orderConfirmationData?.cashierInfo?.name || 'N/A' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Order Items -->
            <div class="bg-white border border-gray-200 rounded-lg p-4">
              <h4 class="font-semibold text-gray-900 mb-3">Order Items</h4>
              <div class="space-y-2">
                <div
                  v-for="item in orderConfirmationData?.items"
                  :key="item.id"
                  class="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                >
                  <div class="flex-1">
                    <p class="font-medium text-gray-900">{{ item.name }}</p>
                    <p class="text-sm text-gray-600">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{ parseFloat(item.price || 0).toFixed(2) }} ×
                      {{ item.quantity }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold text-gray-900">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{
                        (parseFloat(item.price || 0) * item.quantity).toFixed(2)
                      }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment Summary -->
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Subtotal:</span>
                  <span class="font-semibold">
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{
                      parseFloat(orderConfirmationData?.subtotal || 0).toFixed(
                        2
                      )
                    }}
                  </span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600">Amount Paid:</span>
                  <span class="font-semibold">
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{
                      parseFloat(
                        orderConfirmationData?.amountPaid || 0
                      ).toFixed(2)
                    }}
                  </span>
                </div>
                <div
                  class="flex justify-between text-sm font-semibold text-primaryColor border-t border-gray-200 pt-2"
                >
                  <span>Change:</span>
                  <span>
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{
                      parseFloat(orderConfirmationData?.change || 0).toFixed(2)
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div
            class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3"
          >
            <button
              @click="closeOrderConfirmationModal"
              class="flex-1 btn btn-outline btn-sm sm:btn-md touch-manipulation font-thin"
            >
              Cancel
            </button>
            <button
              @click="confirmOrder"
              :disabled="isProcessingOrder"
              class="flex-1 btn bg-primaryColor text-white btn-sm sm:btn-md touch-manipulation font-thin hover:bg-primaryColor/80"
            >
              <span v-if="isProcessingOrder">Processing...</span>
              <span v-else>Confirm & Finalize Order</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Order Complete Modal -->
      <div
        v-if="showOrderCompleteModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      >
        <div
          class="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          <div class="text-center">
            <CheckCircle
              class="w-12 h-12 sm:w-16 sm:h-16 text-primaryColor mx-auto mb-3 sm:mb-4"
            />
            <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              Order Complete!
            </h3>
            <p class="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              Order {{ orderCompleteData?.order_number }} has been processed
              successfully.
            </p>

            <div class="bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
              <div class="flex justify-between text-xs sm:text-sm">
                <span>Total:</span>
                <span class="font-semibold"
                  ><font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                    parseFloat(orderCompleteData?.total_amount || 0).toFixed(2)
                  }}</span
                >
              </div>
              <div class="flex justify-between text-xs sm:text-sm">
                <span>Amount Paid:</span>
                <span class="font-semibold"
                  ><font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                    parseFloat(orderCompleteData?.amount_paid || 0).toFixed(2)
                  }}</span
                >
              </div>
              <div
                class="flex justify-between text-xs sm:text-sm font-semibold text-primaryColor"
              >
                <span>Change:</span>
                <span>
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />{{
                    parseFloat(orderCompleteData?.change_amount || 0).toFixed(2)
                  }}</span
                >
              </div>
            </div>

            <div
              class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3"
            >
              <button
                @click="showReceipt"
                class="flex-1 btn bg-primaryColor text-white btn-sm sm:btn-md touch-manipulation font-thin hover:bg-primaryColor/80"
              >
                Print Receipt
              </button>

              <button
                @click="closeOrderCompleteModal"
                :disabled="!hasPrintedReceipt"
                class="flex-1 btn btn-outline btn-sm sm:btn-md touch-manipulation font-thin"
              >
                New Order
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Receipt Modal -->
      <div
        v-if="showReceiptModal"
        id="pos_receipt_modal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      >
        <div
          class="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          <!-- Receipt Header -->
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">
              Countryside Steak House
            </h2>
            <p class="text-sm text-gray-600 mb-1">
              {{ receiptData?.branchName }}
            </p>
            <p class="text-xs text-gray-500 mb-4">
              {{ receiptData?.branchLocation }}
            </p>
            <div class="border-t border-gray-300 pt-2">
              <p class="text-xs text-gray-600">
                {{ receiptData?.timestamp }}
              </p>
            </div>
          </div>

          <!-- Order Details -->
          <div class="space-y-4 mb-6">
            <!-- Order Info -->
            <div class="text-sm">
              <div class="flex justify-between mb-2">
                <span class="font-medium">Order #:</span>
                <span>{{ receiptData?.order_number }}</span>
              </div>
              <div class="flex justify-between mb-2">
                <span class="font-medium">Type:</span>
                <span>{{ receiptData?.orderType }}</span>
              </div>
              <div class="flex justify-between mb-2">
                <span class="font-medium">Cashier:</span>
                <span>{{ receiptData?.cashierName }}</span>
              </div>
            </div>

            <!-- Order Items -->
            <div class="border-t border-gray-300 pt-4">
              <div class="space-y-2">
                <div
                  v-for="item in receiptData?.items"
                  :key="item.id"
                  class="flex justify-between text-sm"
                >
                  <div class="flex flex- row gap-3">
                    <p class="font-medium">{{ item.item_name }}</p>
                    <p class="text-gray-600">
                      {{ item.quantity }}
                      <font-awesome-icon
                        icon="fa-solid fa-xmark"
                        class="!w-3 !h-3"
                      />
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold">
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{ parseFloat(item.total_price || 0).toFixed(2) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Payment Summary -->
            <div class="border-t border-gray-300 pt-4">
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span>Subtotal:</span>
                  <span>
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{ parseFloat(receiptData?.total_amount || 0).toFixed(2) }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span>Amount Paid:</span>
                  <span>
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{ parseFloat(receiptData?.amount_paid || 0).toFixed(2) }}
                  </span>
                </div>
                <div
                  class="flex justify-between font-semibold text-primaryColor border-t border-gray-300 pt-2"
                >
                  <span>Change:</span>
                  <span>
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{ parseFloat(receiptData?.change_amount || 0).toFixed(2) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- QR Code -->
            <div class="border-t border-gray-300 pt-3 text-center">
              <p class="text-xs text-gray-500">
                Tell us about your visit. Scan the QR code below and share your
                experience!
              </p>
              <div class="mb-2 flex justify-center">
                <div class="w-32 h-32 flex items-center justify-center">
                  <QRCodeGenerator
                    :data="receiptData?.qrData"
                    :size="120"
                    class="max-w-full max-h-full"
                  />
                </div>
              </div>
              <p class="text-xs text-gray-500">Thank you, please come again!</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div
            class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3"
          >
            <button
              @click="closeReceiptModal"
              class="flex-1 btn btn-outline btn-sm sm:btn-md touch-manipulation font-thin"
            >
              Close
            </button>
            <button
              @click="printReceipt"
              class="flex-1 btn bg-primaryColor text-white btn-sm sm:btn-md touch-manipulation font-thin hover:bg-primaryColor/80"
            >
              Print Receipt
            </button>
          </div>
        </div>
      </div>

      <!-- Void Order Modal -->
      <div
        v-if="showVoidOrderModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      >
        <div
          class="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          <div class="text-center mb-6">
            <AlertCircle
              class="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-3 sm:mb-4"
            />
            <h3 class="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
              Void Order
            </h3>
            <p class="text-sm sm:text-base text-gray-600">
              Are you sure you want to void this order? This action cannot be
              undone.
            </p>
          </div>

          <!-- Order Details -->
          <div class="space-y-4 mb-6">
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="font-medium text-gray-600">Order Number:</span>
                  <p class="font-semibold">{{ voidOrderData?.order_number }}</p>
                </div>
                <div>
                  <span class="font-medium text-gray-600">Total Amount:</span>
                  <p class="font-semibold">
                    <font-awesome-icon icon="fa-solid fa-peso-sign" />
                    {{
                      parseFloat(voidOrderData?.total_amount || 0).toFixed(2)
                    }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Void Reason -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-700">
                Reason for voiding:
              </label>
              <textarea
                v-model="voidReason"
                placeholder="Enter reason for voiding this order..."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                rows="3"
                required
              ></textarea>
            </div>
          </div>

          <!-- Action Buttons -->
          <div
            class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3"
          >
            <button
              @click="closeVoidOrderModal"
              class="flex-1 btn btn-outline btn-sm sm:btn-md touch-manipulation font-thin"
            >
              Cancel
            </button>
            <button
              @click="confirmVoidOrder"
              class="flex-1 btn bg-red-600 text-white btn-sm sm:btn-md touch-manipulation font-thin hover:bg-red-700"
            >
              Void Order
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Close POS Interface div -->

    <!-- POS Transaction Modal -->
    <POSTransactionModal
      :show="showTransactionModal"
      @close="closeTransactionModal"
      @reopen="reopenTransactionModal"
      @refresh="refreshPOSData"
    />
  </div>
</template>

<style scoped>
  /* Hide scrollbar for category navigation */
  .scrollbar-hide {
    -ms-overflow-style: none; /* Internet Explorer 10+ */
    scrollbar-width: none; /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none; /* Safari and Chrome */
  }

  /* Line clamp utility for text truncation */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Touch-friendly button styles */
  .touch-manipulation {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  /* Responsive grid adjustments */
  /*
    Removed custom overrides for Tailwind's grid-cols utilities that caused
    tablet/responsive issues. Use Tailwind responsive classes in markup instead.
  */

  /* Mobile-specific adjustments */
  @media (max-width: 768px) {
    .min-h-screen {
      min-height: 100vh;
      min-height: 100dvh; /* Dynamic viewport height for mobile */
    }
  }

  /* Landscape mobile adjustments */
  @media (max-width: 768px) and (orientation: landscape) {
    .max-h-96 {
      max-height: 50vh;
    }
  }
</style>
