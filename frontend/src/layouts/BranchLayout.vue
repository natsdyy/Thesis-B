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
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../stores/branchContextStore';
  import { useAuthStore } from '../stores/authStore';
  import { useBranchStore } from '../stores/branchStore';

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
  const availableOperations = computed(() => {
    // Filter out 'pos' from navigation since it's a separate page with its own access control
    return branchContextStore.availableOperations.filter(
      (operation) => operation !== 'pos'
    );
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

  // Operation icons mapping
  const operationIcons = {
    dashboard: LayoutDashboard,
    pos: CreditCard,
    sales: BarChart3,
    inventory: Package,
    employees: Users,
    profile: UserCircle,
  };

  // Operation labels mapping
  const operationLabels = {
    dashboard: 'Dashboard',
    pos: 'POS',
    sales: 'Sales',
    inventory: 'Inventory',
    employees: 'Employees',
    profile: 'Profile',
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
      console.log('Branch context initialized:', success);
      console.log('Current branch:', currentBranch.value);
      console.log('Available branches:', availableBranches.value);
      console.log('User role:', userRole.value);
      console.log('Can switch branches:', canSwitchBranches.value);
      console.log('User data:', user.value);
      console.log('User branch_id:', user.value?.branch_id);

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

  // Watch for current branch changes
  watch(currentBranch, (newBranch) => {
    if (newBranch && canSwitchBranches.value) {
      selectedBranchId.value = newBranch.id.toString();
    }
  });

  // Initialize on mount
  onMounted(async () => {
    await initializeBranchContext();

    // Restore branch context for Super Admin
    if (canSwitchBranches.value) {
      await branchContextStore.restoreBranchContext();
    }
  });
</script>
<template>
  <div class="min-h-screen bg-base-100">
    <!-- Branch Header -->
    <div class="bg-primaryColor text-white shadow-lg">
      <div class="container mx-auto px-4 py-3">
        <div class="flex flex-row items-center justify-between gap-2 sm:gap-4">
          <!-- Branch Info -->
          <div class="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
            <div class="flex items-center space-x-2">
              <Store class="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
              <div class="min-w-0">
                <h1 class="text-sm sm:text-lg font-semibold truncate">
                  {{ currentBranch?.name || user?.name || 'Branch Operations' }}
                </h1>
                <p class="text-xs sm:text-sm opacity-80 truncate">
                  {{ currentBranch?.code || 'No Branch Assigned' }} •
                  {{ userRole }}
                </p>
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

            <!-- User Info -->
            <div class="flex items-center space-x-4">
              <div class="text-right">
                <p class="text-sm font-medium">{{ user?.name || 'User' }}</p>
                <p class="text-xs opacity-80">{{ userRole }}</p>
              </div>
              <div
                class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
              >
                <User class="w-4 h-4" />
              </div>
            </div>
          </div>

          <!-- Mobile Controls -->
          <div class="flex lg:hidden items-center space-x-2">
            <!-- Mobile Branch Selector -->
            <div v-if="canSwitchBranches" class="max-w-32 sm:max-w-40">
              <select
                v-model="selectedBranchId"
                @change="handleBranchChange"
                class="select select-xs bg-white text-primaryColor border-none w-full text-xs"
                :disabled="loading"
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

            <!-- Mobile User Info -->
            <div class="flex items-center space-x-2">
              <div class="text-right hidden sm:block">
                <p class="text-sm font-medium">{{ user?.name || 'User' }}</p>
                <p class="text-xs opacity-80">{{ userRole }}</p>
              </div>
              <div class="text-right sm:hidden">
                <p class="text-xs font-medium">
                  {{ user?.name?.split(' ')[0] || 'User' }}
                </p>
                <p class="text-xs opacity-80">{{ userRole }}</p>
              </div>
              <div
                class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center"
              >
                <User class="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Branch Navigation -->
    <div class="bg-white border-b border-gray-200 shadow-sm">
      <div class="container mx-auto px-4">
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
    <main class="container mx-auto px-4 py-4 lg:py-6">
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
</template>

<style scoped>
  /* Custom styles for branch layout */
  .container {
    max-width: 1200px;
  }

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
    .container {
      max-width: 100%;
    }
  }
</style>
