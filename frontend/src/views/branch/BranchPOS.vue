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

  const branchContextStore = useBranchContextStore();
  const authStore = useAuthStore();
  const posSessionStore = usePOSSessionStore();
  const posStore = usePOSStore();
  const router = useRouter();
  const API_BASE_URL = apiConfig.baseURL;

  // Local state
  const loading = ref(false);
  const accessDenied = ref(false);
  const needsManagerLogin = ref(false);
  const managerLoginForm = ref({
    employeeId: '',
    pin: '',
  });
  const managerLoginError = ref('');
  const stats = ref({
    todaySales: 0,
    todayTransactions: 0,
    averageTransaction: 0,
    activeOrders: 0,
  });

  // POS UI state
  const showOrderCompleteModal = ref(false);
  const orderCompleteData = ref(null);
  const paymentInput = ref('');
  const isProcessingOrder = ref(false);

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

  // Helper: derive acceptable PINs from birthday
  const deriveBirthdayPins = (birthdayStr) => {
    // Expect formats like 'YYYY-MM-DD' or ISO date; return ['YYYYMMDD','YYYYMD']
    if (!birthdayStr) return [];
    try {
      const date = new Date(
        birthdayStr + (birthdayStr.length === 10 ? 'T00:00:00' : '')
      );
      if (isNaN(date.getTime())) return [];
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const compact = `${year}${month}${day}`; // YYYYMMDD
      const noLeadingZeros = `${year}${parseInt(month, 10)}${parseInt(day, 10)}`; // YYYYMD
      return [compact, noLeadingZeros];
    } catch (e) {
      return [];
    }
  };

  // Manager login via Employee ID + PIN (birthday-derived)
  const handleManagerLogin = async () => {
    managerLoginError.value = '';

    const employeeId = managerLoginForm.value.employeeId?.trim();
    const pinInput = (managerLoginForm.value.pin || '').trim();

    if (!employeeId) {
      managerLoginError.value = 'Employee ID is required';
      return;
    }

    if (!pinInput) {
      managerLoginError.value = 'PIN is required';
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

      // PIN validation based on birthday
      const validPins = deriveBirthdayPins(employee.birthday);
      if (!validPins.includes(pinInput)) {
        managerLoginError.value = 'Invalid PIN';
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
      managerLoginForm.value = { employeeId: '', pin: '' };
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

    isProcessingOrder.value = true;
    try {
      const orderData = await posStore.processOrder();
      orderCompleteData.value = orderData;
      showOrderCompleteModal.value = true;
      paymentInput.value = '';
    } catch (error) {
      console.error('Error processing order:', error);
      alert('Failed to process order. Please try again.');
    } finally {
      isProcessingOrder.value = false;
    }
  };

  const closeOrderCompleteModal = () => {
    showOrderCompleteModal.value = false;
    orderCompleteData.value = null;
  };

  const resetOrder = () => {
    posStore.resetOrder();
    paymentInput.value = '';
  };

  // Placeholder data
  onMounted(async () => {
    // Validate access first
    if (!validatePOSAccess()) {
      return;
    }

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

    // TODO: Fetch real POS data
    stats.value = {
      todaySales: 15420.5,
      todayTransactions: 87,
      averageTransaction: 177.25,
      activeOrders: 5,
    };
  });

  // Cleanup on unmount
  onUnmounted(() => {
    if (sessionTimeoutInterval) {
      clearInterval(sessionTimeoutInterval);
    }
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
            Manager Login Required
          </h2>
          <p class="text-sm sm:text-base text-primaryColor mb-4 text-center">
            {{
              userRole === 'Manager'
                ? 'Please login to start the POS session'
                : 'A manager must login first to activate the POS system'
            }}
          </p>

          <div v-if="userRole === 'Manager'" class="space-y-3 sm:space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm sm:text-base"
                  >Manager Employee ID</span
                >
              </label>
              <input
                v-model="managerLoginForm.employeeId"
                type="text"
                placeholder="Enter manager employee ID"
                class="input input-bordered w-full input-sm sm:input-md"
                @keyup.enter="handleManagerLogin"
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm sm:text-base"
                  >PIN (default: YYYYMMDD)</span
                >
              </label>
              <input
                v-model="managerLoginForm.pin"
                type="password"
                placeholder="Enter PIN"
                class="input input-bordered w-full input-sm sm:input-md"
                @keyup.enter="handleManagerLogin"
              />
            </div>

            <div v-if="managerLoginError" class="alert alert-error">
              <AlertCircle class="w-4 h-4" />
              <span>{{ managerLoginError }}</span>
            </div>

            <button
              @click="handleManagerLogin"
              class="btn bg-primaryColor text-white w-full font-thin border-none hover:bg-primaryColor/80 btn-sm sm:btn-md"
              :disabled="!managerLoginForm.employeeId || !managerLoginForm.pin"
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
                A manager must login to activate the POS system.
              </p>
            </div>

            <div class="divider">Manager Login Required</div>

            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm sm:text-base"
                  >Manager Employee ID</span
                >
              </label>
              <input
                v-model="managerLoginForm.employeeId"
                type="text"
                placeholder="Enter manager employee ID"
                class="input input-bordered w-full input-sm sm:input-md"
                @keyup.enter="handleManagerLogin"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm sm:text-base">PIN</span>
              </label>
              <input
                v-model="managerLoginForm.pin"
                type="password"
                placeholder="Enter PIN"
                class="input input-bordered w-full input-sm sm:input-md"
                @keyup.enter="handleManagerLogin"
              />
            </div>

            <div v-if="managerLoginError" class="alert alert-error">
              <AlertCircle class="w-4 h-4" />
              <span>{{ managerLoginError }}</span>
            </div>

            <button
              @click="handleManagerLogin"
              class="btn bg-primaryColor text-white w-full font-thin border-none hover:bg-primaryColor/80 btn-sm sm:btn-md"
              :disabled="!managerLoginForm.employeeId || !managerLoginForm.pin"
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
              <p class="text-xs sm:text-sm text-gray-600">Logged in as</p>
              <p class="text-sm sm:text-base font-medium">
                {{ user?.name }} ({{ userRole }})
              </p>
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
            <div class="grid grid-cols-3 md:grid-cols-4 gap-4">
              <div
                v-for="item in posStore.filteredMenuItems"
                :key="item.id"
                class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                @click="item.stock_quantity > 0 && handleAddToOrder(item)"
              >
                <!-- Item Image -->
                <div class="aspect-square bg-gray-100">
                  <img
                    v-if="item.image_url"
                    :src="item.image_url"
                    :alt="item.name"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-gray-400"
                  >
                    <Package class="w-8 h-8 sm:w-12 sm:h-12" />
                  </div>
                </div>

                <!-- Item Details -->
                <div class="p-3">
                  <h3 class="font-semibold text-gray-900 text-sm mb-1">
                    {{ item.name }}
                  </h3>

                  <!-- Stock Status -->
                  <div class="flex items-center mb-2">
                    <span
                      class="badge badge-sm border-none"
                      :class="
                        item.stock_quantity > 0
                          ? 'bg-success/20 text-success'
                          : 'bg-error/20 text-error'
                      "
                    >
                      Stock: {{ item.stock_quantity }}
                    </span>
                  </div>

                  <!-- Price -->
                  <p class="text-lg font-bold text-gray-900 mb-3">
                    ₱{{ parseFloat(item.price).toFixed(2) }}
                  </p>

                  <!-- Order Button -->
                  <button
                    @click.stop="handleAddToOrder(item)"
                    :disabled="item.stock_quantity <= 0"
                    class="btn btn-sm w-full font-medium"
                    :class="
                      item.stock_quantity > 0
                        ? 'bg-primaryColor text-white'
                        : 'btn-disabled'
                    "
                  >
                    {{ item.stock_quantity > 0 ? 'Order' : 'Out of Stock' }}
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
              Order Number {{ posStore.currentOrder.orderNumber || '#01' }}
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
                    ₱{{ item.price.toFixed(2) }}
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
                <span>₱{{ posStore.orderTotal.toFixed(2) }}</span>
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

              <!-- Order Type Selection -->
              <div class="space-y-1 sm:space-y-2">
                <label class="text-xs sm:text-sm font-medium text-gray-700"
                  >Order Type:</label
                >
                <div class="flex space-x-1 sm:space-x-2">
                  <button
                    @click="handleOrderTypeChange('Dine In')"
                    class="flex-1 py-1.5 sm:py-2 px-2 sm:px-4 rounded-sm text-xs sm:text-sm font-medium transition-colors touch-manipulation cursor-pointer"
                    :class="
                      posStore.currentOrder.orderType === 'Dine In'
                        ? 'bg-primaryColor text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400'
                    "
                  >
                    Dine In
                  </button>
                  <button
                    @click="handleOrderTypeChange('Take Out')"
                    class="flex-1 py-1.5 sm:py-2 px-2 sm:px-4 rounded-sm text-xs sm:text-sm font-medium transition-colors touch-manipulation cursor-pointer"
                    :class="
                      posStore.currentOrder.orderType === 'Take Out'
                        ? 'bg-primaryColor text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400'
                    "
                  >
                    Take Out
                  </button>
                </div>
              </div>
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
                @click="processOrder"
                :disabled="!posStore.isOrderValid || isProcessingOrder"
                class="btn btn-success btn-xs sm:btn-sm touch-manipulation border-none shadow-none"
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
                @click="resetOrder"
                class="btn btn-warning btn-xs sm:btn-sm touch-manipulation"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Order Complete Modal -->
      <div
        v-if="showOrderCompleteModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <div
          class="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        >
          <div class="text-center">
            <CheckCircle
              class="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-3 sm:mb-4"
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
                  >₱{{ orderCompleteData?.total?.toFixed(2) }}</span
                >
              </div>
              <div class="flex justify-between text-xs sm:text-sm">
                <span>Amount Paid:</span>
                <span class="font-semibold"
                  >₱{{ orderCompleteData?.amount_paid?.toFixed(2) }}</span
                >
              </div>
              <div
                class="flex justify-between text-xs sm:text-sm font-semibold text-green-600"
              >
                <span>Change:</span>
                <span>₱{{ orderCompleteData?.change?.toFixed(2) }}</span>
              </div>
            </div>

            <div
              class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3"
            >
              <button
                @click="closeOrderCompleteModal"
                class="flex-1 btn btn-primary btn-sm sm:btn-md touch-manipulation"
              >
                New Order
              </button>
              <button
                @click="closeOrderCompleteModal"
                class="flex-1 btn btn-outline btn-sm sm:btn-md touch-manipulation"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Close POS Interface div -->
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
  @media (max-width: 640px) {
    .grid-cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 640px) and (max-width: 1024px) {
    .grid-cols-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (min-width: 1024px) {
    .grid-cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 1280px) {
    .grid-cols-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

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
