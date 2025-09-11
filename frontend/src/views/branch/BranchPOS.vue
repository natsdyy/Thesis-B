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
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { useAuthStore } from '../../stores/authStore';
  import { usePOSSessionStore } from '../../stores/posSessionStore';
  import axios from 'axios';
  import { apiConfig } from '../../config/api.js';

  const branchContextStore = useBranchContextStore();
  const authStore = useAuthStore();
  const posSessionStore = usePOSSessionStore();
  const router = useRouter();
  const API_BASE_URL = apiConfig.baseURL;

  // Local state
  const loading = ref(false);
  const accessDenied = ref(false);
  const needsManagerLogin = ref(false);
  const managerLoginForm = ref({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const managerLoginError = ref('');
  const stats = ref({
    todaySales: 0,
    todayTransactions: 0,
    averageTransaction: 0,
    activeOrders: 0,
  });

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

  // Manager login functions
  const handleManagerLogin = async () => {
    managerLoginError.value = '';

    if (!managerLoginForm.value.email) {
      managerLoginError.value = 'Manager email is required';
      return;
    }

    // Basic email format check
    const emailRegex = /[^@\s]+@[^@\s]+\.[^@\s]+/;
    if (!emailRegex.test(managerLoginForm.value.email)) {
      managerLoginError.value = 'Enter a valid manager email';
      return;
    }

    if (!managerLoginForm.value.password) {
      managerLoginError.value = 'Password is required';
      return;
    }

    if (
      managerLoginForm.value.password !== managerLoginForm.value.confirmPassword
    ) {
      managerLoginError.value = 'Passwords do not match';
      return;
    }

    try {
      // Authenticate manager using the same backend login endpoint
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: managerLoginForm.value.email.trim(),
        password: managerLoginForm.value.password,
      });

      if (!response.data?.success) {
        managerLoginError.value = response.data?.message || 'Login failed';
        return;
      }

      const managerUser = response.data.data?.user;
      if (!managerUser) {
        managerLoginError.value = 'Invalid response from server';
        return;
      }

      // Validate role and branch
      const isManager = managerUser.role === 'Manager';
      const sameBranch =
        !!managerUser.branch_id &&
        managerUser.branch_id === user.value.branch_id;

      if (!isManager) {
        managerLoginError.value = 'Only a Manager can start a POS session';
        return;
      }

      if (!sameBranch) {
        managerLoginError.value = 'Manager must belong to this branch';
        return;
      }

      // Start manager session without changing the current app auth session
      posSessionStore.startManagerSession({
        id: managerUser.id,
        name:
          `${managerUser.first_name || ''} ${managerUser.last_name || ''}`.trim() ||
          managerUser.name,
        role: managerUser.role,
        branch_id: managerUser.branch_id,
        email: managerUser.email,
        loginTime: new Date().toISOString(),
      });

      needsManagerLogin.value = false;
      managerLoginForm.value = { email: '', password: '', confirmPassword: '' };
    } catch (err) {
      console.error('POS manager login failed:', err);
      managerLoginError.value =
        err.response?.data?.message || 'Invalid manager email or password';
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

  // Placeholder data
  onMounted(() => {
    // Validate access first
    if (!validatePOSAccess()) {
      return;
    }

    // Set up session timeout monitoring
    sessionTimeoutInterval = setInterval(checkSessionTimeout, 60000); // Check every minute

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
                  >Manager Email</span
                >
              </label>
              <input
                v-model="managerLoginForm.email"
                type="email"
                placeholder="Enter manager email"
                class="input input-bordered w-full input-sm sm:input-md"
                @keyup.enter="handleManagerLogin"
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm sm:text-base"
                  >Manager Password</span
                >
              </label>
              <input
                v-model="managerLoginForm.password"
                type="password"
                placeholder="Enter manager password"
                class="input input-bordered w-full input-sm sm:input-md"
                @keyup.enter="handleManagerLogin"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm sm:text-base"
                  >Confirm Password</span
                >
              </label>
              <input
                v-model="managerLoginForm.confirmPassword"
                type="password"
                placeholder="Confirm manager password"
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
              :disabled="
                !managerLoginForm.email ||
                !managerLoginForm.password ||
                !managerLoginForm.confirmPassword
              "
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
                  >Manager Email</span
                >
              </label>
              <input
                v-model="managerLoginForm.email"
                type="email"
                placeholder="Enter manager email"
                class="input input-bordered w-full input-sm sm:input-md"
                @keyup.enter="handleManagerLogin"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm sm:text-base"
                  >Manager Password</span
                >
              </label>
              <input
                v-model="managerLoginForm.password"
                type="password"
                placeholder="Enter manager password"
                class="input input-bordered w-full input-sm sm:input-md"
                @keyup.enter="handleManagerLogin"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text text-sm sm:text-base"
                  >Confirm Password</span
                >
              </label>
              <input
                v-model="managerLoginForm.confirmPassword"
                type="password"
                placeholder="Confirm manager password"
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
              :disabled="
                !managerLoginForm.email ||
                !managerLoginForm.password ||
                !managerLoginForm.confirmPassword
              "
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
    <div v-else>
      <!-- Header -->
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-primaryColor">
            Point of Sale
          </h1>
          <p class="text-sm sm:text-base text-gray-600 mt-1">
            {{ currentBranch?.name }} - POS System
          </p>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <div class="badge badge-info">
              <Shield class="w-3 h-3 mr-1" />
              {{ userRole }}
            </div>
            <div class="badge badge-success">
              <CheckCircle class="w-3 h-3 mr-1" />
              Online
            </div>
            <div v-if="isManagerSessionActive" class="badge badge-warning">
              <Clock class="w-3 h-3 mr-1" />
              Session: {{ sessionTimeRemaining }}m
            </div>
          </div>
        </div>
        <div class="text-left sm:text-right">
          <p class="text-xs sm:text-sm text-gray-600">Logged in as</p>
          <p class="font-medium text-sm sm:text-base">{{ user?.name }}</p>
          <div
            v-if="isManagerSessionActive && managerInfo"
            class="text-xs text-gray-500 mt-1"
          >
            Manager: {{ managerInfo.name
            }}<span v-if="managerInfo.email"> • {{ managerInfo.email }}</span>
          </div>
          <button
            v-if="userRole === 'Manager' && isManagerSessionActive"
            @click="handleManagerLogout"
            class="btn btn-xs sm:btn-sm btn-outline btn-error mt-2"
          >
            <span class="text-xs sm:text-sm">End Session</span>
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
      >
        <div class="card bg-white shadow-lg">
          <div class="card-body p-4 sm:p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs sm:text-sm text-gray-600">Today's Sales</p>
                <p class="text-lg sm:text-2xl font-bold text-primaryColor">
                  ₱{{ stats.todaySales.toLocaleString() }}
                </p>
              </div>
              <div class="p-2 sm:p-3 bg-green-100 rounded-full">
                <TrendingUp class="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-white shadow-lg">
          <div class="card-body p-4 sm:p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs sm:text-sm text-gray-600">Transactions</p>
                <p class="text-lg sm:text-2xl font-bold text-primaryColor">
                  {{ stats.todayTransactions }}
                </p>
              </div>
              <div class="p-2 sm:p-3 bg-blue-100 rounded-full">
                <CreditCard class="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-white shadow-lg">
          <div class="card-body p-4 sm:p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs sm:text-sm text-gray-600">Average Sale</p>
                <p class="text-lg sm:text-2xl font-bold text-primaryColor">
                  ₱{{ stats.averageTransaction.toFixed(2) }}
                </p>
              </div>
              <div class="p-2 sm:p-3 bg-purple-100 rounded-full">
                <Package class="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-white shadow-lg">
          <div class="card-body p-4 sm:p-6">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs sm:text-sm text-gray-600">Active Orders</p>
                <p class="text-lg sm:text-2xl font-bold text-primaryColor">
                  {{ stats.activeOrders }}
                </p>
              </div>
              <div class="p-2 sm:p-3 bg-orange-100 rounded-full">
                <Clock class="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- POS Interface Placeholder -->
      <div class="card bg-white shadow-lg">
        <div class="card-body p-4 sm:p-6">
          <h2 class="card-title text-primaryColor mb-4 text-lg sm:text-xl">
            <CreditCard class="w-5 h-5" />
            POS Interface
          </h2>

          <div class="text-center py-8 sm:py-12">
            <CreditCard
              class="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4"
            />
            <h3 class="text-base sm:text-lg font-medium text-gray-900 mb-2">
              POS System Coming Soon
            </h3>
            <p class="text-sm sm:text-base text-gray-600 mb-4">
              The full POS interface will be implemented with tablet-friendly
              design
            </p>
            <div class="alert alert-info">
              <AlertCircle class="w-4 h-4 sm:w-5 sm:h-5" />
              <span class="text-xs sm:text-sm"
                >This will be a separate device login with branch
                indicator</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Close POS Interface div -->
  </div>
</template>
