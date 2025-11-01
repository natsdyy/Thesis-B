<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import {
    Store,
    User,
    AlertCircle,
    RefreshCw,
    LayoutDashboard,
    CreditCard,
    BarChart3,
    Package,
    Users,
    UserCircle,
    Menu,
    X,
    ChevronDown,
    Settings,
    Timer,
    FileText,
    Clock,
    LogOut,
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../stores/branchContextStore';
  import { useAuthStore } from '../stores/authStore';
  import { useBranchStore } from '../stores/branchStore';
  import { apiConfig } from '../config/api';

  // Stores
  const branchContextStore = useBranchContextStore();
  const authStore = useAuthStore();
  const branchStore = useBranchStore();
  const route = useRoute();
  const router = useRouter();

  // Local state
  const selectedBranchId = ref('');
  const toast = ref({ show: false, type: 'success', message: '' });
  const mobileMenuOpen = ref(false);

  // Computed properties from stores
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const availableBranches = computed(() => {
    // Use branchStore data if available, fallback to branchContextStore
    return branchStore.branches?.length > 0
      ? branchStore.branches
      : branchContextStore.availableBranches;
  });
  const userRole = computed(() => branchContextStore.userRole);
  const canSwitchBranches = computed(
    () => branchContextStore.canSwitchBranches
  );

  // Check if current branch is inactive
  const isBranchInactive = computed(() => {
    // Check if branch exists and is inactive (is_active === false)
    if (!currentBranch.value) return false;
    return currentBranch.value.is_active === false;
  });

  // Check if user is on inactive route or allowed routes when branch is inactive
  const isOnInactiveRoute = computed(() => {
    // If branch is inactive and user is not Super Admin
    if (isBranchInactive.value && !canSwitchBranches.value) {
      // Hide navigation on inactive route and allowed routes (profile only)
      const allowedInactiveRoutes = ['BranchInactive', 'BranchProfile'];
      return allowedInactiveRoutes.includes(route.name);
    }
    return false;
  });
  const availableOperations = computed(() => {
    // Filter out 'pos' from navigation since it's a separate page with its own access control
    const ops = branchContextStore.availableOperations.filter(
      (operation) => operation !== 'pos'
    );
    // Ensure cooks see Kitchen entry even if store did not include it
    if (userRole.value === 'Cook' && !ops.includes('kitchen')) {
      ops.push('kitchen');
    }
    return ops;
  });

  // Check if user can access POS (separate from navigation)
  const canAccessPOS = computed(() => {
    const allowedRoles = ['Manager', 'Cashier'];
    return allowedRoles.includes(userRole.value);
  });
  const loading = computed(
    () => branchContextStore.loading || branchStore.loading
  );
  const error = computed(() => branchContextStore.error || branchStore.error);
  const user = computed(() => authStore.user);

  // Profile image URL (backend serves /uploads at server root)
  const profileImageUrl = computed(() => {
    const url = user.value?.photo_url || user.value?.photoUrl || null;
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    const apiOrigin = new URL(apiConfig.baseURL, window.location.origin).origin;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${apiOrigin}${path}`;
  });

  // Operation icons mapping
  const operationIcons = {
    dashboard: LayoutDashboard,
    pos: CreditCard,
    sales: BarChart3,
    utilities: FileText,
    inventory: Package,
    kitchen: Timer,
    employees: Users,
    profile: UserCircle,
    attendance: Clock,
  };

  // Operation labels mapping
  const operationLabels = {
    dashboard: 'Dashboard',
    pos: 'POS',
    sales: 'Sales',
    utilities: 'Utilities',
    inventory: 'Inventory',
    kitchen: 'Kitchen',
    employees: 'Employees',
    profile: 'Profile',
    attendance: 'Attendance',
  };

  // Methods
  const getOperationIcon = (operation) =>
    operationIcons[operation] || LayoutDashboard;
  const getOperationLabel = (operation) =>
    operationLabels[operation] || operation;

  const isActiveRoute = (operation) => {
    const currentRoute = route.name?.toLowerCase() || '';
    return currentRoute.includes(operation);
  };

  const handleBranchChange = async () => {
    if (!selectedBranchId.value) return;

    try {
      // Find the selected branch from branchStore
      const selectedBranch = branchStore.branches.find(
        (branch) => branch.id === parseInt(selectedBranchId.value)
      );

      if (selectedBranch) {
        await branchContextStore.setCurrentBranch(
          parseInt(selectedBranchId.value)
        );
        showToast('success', `Switched to ${selectedBranch.name}`);
      } else {
        throw new Error('Selected branch not found');
      }
    } catch (error) {
      console.error('Error switching branch:', error);
      showToast('error', 'Failed to switch branch');
      selectedBranchId.value = '';
    }
  };

  const initializeBranchContext = async () => {
    try {
      // Fetch branches from branchStore first
      await branchStore.fetchBranches();
      console.log('BranchStore branches:', branchStore.branches);

      const success = await branchContextStore.initializeBranchContext();

      if (success) {
        // Set selected branch ID for Super Admin
        if (canSwitchBranches.value && currentBranch.value) {
          selectedBranchId.value = currentBranch.value.id.toString();
        }
      }
    } catch (error) {
      console.error('Error initializing branch context:', error);
      showToast('error', 'Failed to initialize branch context');
    }
  };

  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };

  const toggleMobileMenu = () => {
    mobileMenuOpen.value = !mobileMenuOpen.value;
  };

  const closeMobileMenu = () => {
    mobileMenuOpen.value = false;
  };

  const showLogoutModal = ref(false);

  const requestLogout = () => {
    showLogoutModal.value = true;
  };

  const cancelLogout = () => {
    showLogoutModal.value = false;
  };

  const confirmLogout = () => {
    showLogoutModal.value = false;
    authStore.logout();
    router.push('/login');
  };

  // Watch for current branch changes
  watch(currentBranch, (newBranch) => {
    if (newBranch && canSwitchBranches.value) {
      selectedBranchId.value = newBranch.id.toString();
    }
  });

  // Watch for inactive branch and redirect if needed
  watch([currentBranch, isBranchInactive], ([branch, isInactive]) => {
    // Only redirect if branch exists, is inactive, not a Super Admin, and not already on allowed routes
    if (
      branch &&
      isInactive &&
      !canSwitchBranches.value &&
      !['BranchInactive', 'BranchProfile'].includes(route.name)
    ) {
      router.push('/branch/inactive');
    }
  });

  // Initialize on mount
  onMounted(async () => {
    await initializeBranchContext();

    // Restore branch context for Super Admin
    if (canSwitchBranches.value) {
      await branchContextStore.restoreBranchContext();
    }

    // Check if branch is inactive after initialization
    if (
      currentBranch.value &&
      isBranchInactive.value &&
      !canSwitchBranches.value &&
      !['BranchInactive', 'BranchProfile'].includes(route.name)
    ) {
      router.push('/branch/inactive');
    }
  });
</script>
<template>
  <div class="min-h-screen bg-accentColor">
    <!-- Branch Header -->
    <div class="bg-primaryColor text-white shadow-lg">
      <div class="w-full px-4 py-3">
        <div class="flex flex-row items-center justify-between gap-2 sm:gap-4">
          <!-- Branch Info -->
          <div class="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
            <div class="flex items-center space-x-2">
              <Store class="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
              <div class="min-w-0">
                <h1 class="text-sm sm:text-lg font-semibold truncate">
                  {{ currentBranch?.name || user?.name || 'Branch Operations' }}
                </h1>
              </div>
            </div>
          </div>

          <!-- Desktop Controls -->
          <div class="hidden lg:flex items-center space-x-4">
            <!-- Branch Selector (Super Admin Only) -->
            <div v-if="canSwitchBranches" class="flex items-center space-x-4">
              <select
                v-model="selectedBranchId"
                @change="handleBranchChange"
                class="select select-sm bg-white text-primaryColor border-none"
                :disabled="loading"
              >
                <option value="">Select Branch</option>
                <option
                  v-for="branch in availableBranches"
                  :key="branch.id"
                  :value="branch.id"
                >
                  {{ branch.name }} ({{ branch.code }})
                </option>
              </select>
            </div>

            <!-- User Profile Dropdown -->
            <div class="dropdown dropdown-end">
              <div
                tabindex="0"
                role="button"
                class="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
              >
                <!-- User Avatar -->
                <div
                  class="w-8 h-8 rounded-full overflow-hidden bg-white/20 flex items-center justify-center"
                >
                  <img
                    v-if="profileImageUrl"
                    :src="profileImageUrl"
                    alt="Profile"
                    class="w-full h-full object-cover"
                  />
                  <User v-else class="w-4 h-4" />
                </div>

                <!-- User Info -->
                <div class="flex flex-col items-start">
                  <span class="text-sm font-medium">{{
                    user?.name || 'User'
                  }}</span>
                  <span class="text-xs opacity-80">{{ userRole }}</span>
                </div>

                <!-- Dropdown Arrow -->
                <ChevronDown class="w-4 h-4 opacity-80" />
              </div>

              <!-- Dropdown Menu -->
              <ul
                tabindex="0"
                class="dropdown-content menu rounded-lg shadow-lg w-64 p-2 mt-2 bg-white text-gray-800 border border-black/10"
              >
                <!-- User Info Header -->
                <li class="px-3 py-2 border-b border-gray-200 mb-2 -mx-2">
                  <div class="flex items-center space-x-3 px-2">
                    <div
                      class="w-10 h-10 rounded-full overflow-hidden bg-primaryColor flex items-center justify-center"
                    >
                      <img
                        v-if="profileImageUrl"
                        :src="profileImageUrl"
                        alt="Profile"
                        class="w-full h-full object-cover"
                      />
                      <span v-else class="text-sm font-medium text-white">
                        {{ user?.name?.charAt(0) || 'U' }}
                      </span>
                    </div>
                    <div>
                      <p class="font-medium">{{ user?.name || 'User' }}</p>
                      <p class="text-sm opacity-70">{{ user?.email || '' }}</p>
                    </div>
                  </div>
                </li>

                <!-- Menu Items -->
                <li>
                  <router-link
                    to="/branch/profile"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <User class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">Profile</span>
                  </router-link>
                </li>

                <li v-if="!isBranchInactive || canSwitchBranches">
                  <router-link
                    :to="{ path: '/branch/attendance', query: { tab: 'ot' } }"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Timer class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">Apply Overtime</span>
                  </router-link>
                </li>
                <li v-if="!isBranchInactive || canSwitchBranches">
                  <router-link
                    :to="{
                      path: '/branch/attendance',
                      query: { tab: 'leave' },
                    }"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <FileText class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">Apply Leave</span>
                  </router-link>
                </li>

                <li v-if="!isBranchInactive || canSwitchBranches">
                  <router-link
                    to="/branch/attendance"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Clock class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">Attendance</span>
                  </router-link>
                </li>

                <!-- Divider + Logout -->
                <li class="border-t border-gray-200 mt-2 pt-2 -mx-2">
                  <a
                    @click="requestLogout"
                    class="flex items-center space-x-3 px-5 py-2 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                  >
                    <LogOut class="w-4 h-4 text-red-600" />
                    <span class="text-sm text-red-700">Log Out</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <!-- Mobile Controls -->
          <div class="flex lg:hidden items-center space-x-2">
            <!-- Mobile Branch Selector -->
            <div
              v-if="canSwitchBranches"
              class="max-w-32 sm:max-w-40 relative z-10"
            >
              <select
                v-model="selectedBranchId"
                @change="handleBranchChange"
                class="select select-xs bg-white text-primaryColor border-none w-full text-xs appearance-none"
                :disabled="loading"
                style="z-index: 10; position: relative"
              >
                <option value="">Select Branch</option>
                <option
                  v-for="branch in availableBranches"
                  :key="branch.id"
                  :value="branch.id"
                >
                  {{ branch.name }}
                </option>
              </select>
            </div>

            <!-- Mobile User Profile Dropdown -->
            <div class="dropdown dropdown-end relative z-20">
              <div
                tabindex="0"
                role="button"
                class="flex items-center space-x-2 p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
              >
                <!-- Mobile User Info -->
                <div class="text-right hidden sm:block">
                  <p class="text-sm font-medium">
                    {{ user?.name || 'User' }}
                  </p>
                  <p class="text-xs opacity-80">{{ userRole }}</p>
                </div>
                <div class="text-right sm:hidden">
                  <p class="text-xs font-medium">
                    {{ user?.name?.split(' ')[0] || 'User' }}
                  </p>
                  <p class="text-xs opacity-80">{{ userRole }}</p>
                </div>

                <!-- User Avatar -->
                <div
                  class="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0"
                >
                  <img
                    v-if="profileImageUrl"
                    :src="profileImageUrl"
                    alt="Profile"
                    class="w-full h-full object-cover"
                  />
                  <User v-else class="w-3 h-3 sm:w-4 sm:h-4" />
                </div>

                <!-- Dropdown Arrow -->
                <ChevronDown
                  class="w-3 h-3 sm:w-4 sm:h-4 opacity-80 flex-shrink-0"
                />
              </div>

              <!-- Mobile Dropdown Menu -->
              <ul
                tabindex="0"
                class="dropdown-content menu rounded-lg shadow-lg w-48 p-2 mt-2 bg-white text-gray-800 absolute right-0 top-full border border-black/10"
                style="z-index: 30"
              >
                <!-- User Info Header -->
                <li class="px-3 py-2 border-b border-gray-200 mb-2 -mx-2">
                  <div class="flex items-center space-x-3 px-2">
                    <div
                      class="w-8 h-8 rounded-full overflow-hidden bg-primaryColor flex items-center justify-center"
                    >
                      <img
                        v-if="profileImageUrl"
                        :src="profileImageUrl"
                        alt="Profile"
                        class="w-full h-full object-cover"
                      />
                      <span v-else class="text-sm font-medium text-white">
                        {{ user?.name?.charAt(0) || 'U' }}
                      </span>
                    </div>
                    <div>
                      <p class="font-medium text-sm">
                        {{ user?.name || 'User' }}
                      </p>
                      <p class="text-xs opacity-70">{{ user?.email || '' }}</p>
                    </div>
                  </div>
                </li>

                <!-- Menu Items -->
                <li>
                  <router-link
                    to="/branch/profile"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <User class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">Profile</span>
                  </router-link>
                </li>

                <li v-if="!isBranchInactive || canSwitchBranches">
                  <router-link
                    :to="{ path: '/branch/attendance', query: { tab: 'ot' } }"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Timer class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">Apply Overtime</span>
                  </router-link>
                </li>
                <li v-if="!isBranchInactive || canSwitchBranches">
                  <router-link
                    :to="{
                      path: '/branch/attendance',
                      query: { tab: 'leave' },
                    }"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <FileText class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">Apply Leave</span>
                  </router-link>
                </li>

                <li v-if="!isBranchInactive || canSwitchBranches">
                  <router-link
                    to="/branch/attendance"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Clock class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">Attendance</span>
                  </router-link>
                </li>

                <!-- Divider + Logout -->
                <li class="border-t border-gray-200 mt-2 pt-2 -mx-2">
                  <a
                    @click="requestLogout"
                    class="flex items-center space-x-3 px-5 py-2 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                  >
                    <LogOut class="w-4 h-4 text-red-600" />
                    <span class="text-sm text-red-700">Log Out</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Branch Navigation -->
    <div
      v-if="!isOnInactiveRoute"
      class="bg-white border-b border-gray-200 shadow-sm"
    >
      <div class="w-full px-4">
        <nav class="flex justify-between items-center">
          <!-- Desktop Navigation -->
          <div class="hidden lg:flex space-x-8">
            <router-link
              v-for="operation in availableOperations"
              :key="operation"
              :to="`/branch/${operation}`"
              :class="[
                'flex items-center space-x-2 py-4 px-2 border-b-2 text-sm font-medium transition-colors',
                isActiveRoute(operation)
                  ? 'border-primaryColor text-primaryColor'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ]"
            >
              <component :is="getOperationIcon(operation)" class="w-4 h-4" />
              <span>{{ getOperationLabel(operation) }}</span>
            </router-link>
          </div>

          <!-- Desktop POS Button -->
          <div
            v-if="canAccessPOS"
            class="hidden lg:flex items-center space-x-4"
          >
            <router-link
              to="/pos"
              class="btn btn-sm bg-white text-primaryColor hover:bg-white/90 border-none"
            >
              <CreditCard class="w-4 h-4 mr-2" />
              Open POS
            </router-link>
          </div>

          <!-- Mobile Menu Button -->
          <div class="flex lg:hidden items-center justify-between w-full">
            <div class="flex space-x-4">
              <!-- Mobile POS Button -->
              <router-link
                v-if="canAccessPOS"
                to="/pos"
                class="btn btn-sm text-primaryColor bg-white border-none"
                @click="closeMobileMenu"
              >
                <CreditCard class="w-4 h-4 mr-1" />
                <span class="hidden sm:inline">POS</span>
              </router-link>
            </div>

            <button
              @click="toggleMobileMenu"
              class="btn btn-ghost btn-sm"
              :class="{ 'text-primaryColor': mobileMenuOpen }"
            >
              <Menu v-if="!mobileMenuOpen" class="w-5 h-5" />
              <X v-else class="w-5 h-5" />
            </button>
          </div>
        </nav>

        <!-- Mobile Navigation Menu -->
        <div
          v-if="mobileMenuOpen"
          class="lg:hidden border-t border-gray-200 bg-white"
        >
          <div class="py-2">
            <router-link
              v-for="operation in availableOperations"
              :key="operation"
              :to="`/branch/${operation}`"
              :class="[
                'flex items-center space-x-3 py-3 px-4 text-sm font-medium transition-colors',
                isActiveRoute(operation)
                  ? 'bg-primaryColor/10 text-primaryColor border-r-4 border-primaryColor'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ]"
              @click="closeMobileMenu"
            >
              <component :is="getOperationIcon(operation)" class="w-5 h-5" />
              <span>{{ getOperationLabel(operation) }}</span>
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="w-full px-4 py-4 lg:py-6">
      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="text-center">
          <div
            class="loading loading-spinner loading-lg text-primaryColor"
          ></div>
          <p class="mt-2 text-gray-600">Loading branch data...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="alert alert-error mb-6">
        <AlertCircle class="w-5 h-5" />
        <div>
          <h3 class="font-bold">Branch Access Error</h3>
          <div class="text-sm">{{ error }}</div>
        </div>
        <button @click="initializeBranchContext" class="btn btn-sm btn-outline">
          <RefreshCw class="w-4 h-4 mr-1" />
          Retry
        </button>
      </div>

      <!-- Branch Not Selected (Super Admin) -->
      <div
        v-else-if="canSwitchBranches && !currentBranch"
        class="text-center py-12"
      >
        <Store class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">Select a Branch</h3>
        <p class="text-gray-600 mb-4">
          Choose a branch to manage its operations
        </p>
        <select
          v-model="selectedBranchId"
          @change="handleBranchChange"
          class="select select-bordered w-full max-w-xs"
        >
          <option value="">Select Branch</option>
          <option
            v-for="branch in availableBranches"
            :key="branch.id"
            :value="branch.id"
          >
            {{ branch.name }} ({{ branch.code }})
          </option>
        </select>
      </div>

      <!-- User Not Assigned to Branch -->
      <div
        v-else-if="!canSwitchBranches && !currentBranch"
        class="text-center py-12"
      >
        <Store class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          No Branch Assignment
        </h3>
        <p class="text-gray-600 mb-4">
          You are not currently assigned to any branch. Please contact your
          administrator to assign you to a branch.
        </p>
        <div
          class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto"
        >
          <p class="text-sm text-yellow-800">
            <strong>Note:</strong> You can still access your profile and basic
            functions, but branch-specific operations require branch assignment.
          </p>
        </div>
      </div>

      <!-- Branch Content -->
      <div v-else-if="currentBranch">
        <router-view />
      </div>
    </main>

    <!-- Toast Notifications -->
    <div class="toast toast-end z-50">
      <div
        v-if="toast.show"
        :class="[
          'alert shadow-lg',
          toast.type === 'success'
            ? 'alert-success'
            : toast.type === 'error'
              ? 'alert-error'
              : toast.type === 'warning'
                ? 'alert-warning'
                : 'alert-info',
        ]"
      >
        <span>{{ toast.message }}</span>
      </div>
    </div>
  </div>

  <!-- Logout Confirmation Modal -->
  <div v-if="showLogoutModal" class="modal modal-open">
    <div class="modal-box bg-white">
      <h3 class="font-bold text-lg mb-2">Confirm Logout</h3>
      <p class="py-2">Are you sure you want to log out?</p>
      <div class="modal-action">
        <button
          class="btn btn-ghost btn-sm font-thin border-none"
          @click="cancelLogout"
        >
          Cancel
        </button>
        <button
          class="btn bg-error/30 text-error btn-sm font-thin border-none"
          @click="confirmLogout"
        >
          Yes, Log Out
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* Custom styles for branch layout */
  /* Removed max-width constraint to utilize full screen width */

  /* Toast positioning */
  .toast {
    z-index: 9999;
  }

  /* Navigation active state */
  /* .router-link-active {
    @apply border-primaryColor text-primaryColor;
  } */

  /* Loading spinner */
  .loading {
    border-color: transparent;
  }

  /* Mobile menu animation */
  .mobile-menu-enter-active,
  .mobile-menu-leave-active {
    transition: all 0.3s ease;
  }

  .mobile-menu-enter-from,
  .mobile-menu-leave-to {
    opacity: 0;
    transform: translateY(-10px);
  }

  /* Responsive text sizing */
  @media (max-width: 640px) {
    .container {
      padding-left: 1rem;
      padding-right: 1rem;
    }
  }

  /* Ensure proper spacing on mobile */
  @media (max-width: 1024px) {
    /* Full width layout maintained for all screen sizes */
  }
</style>
