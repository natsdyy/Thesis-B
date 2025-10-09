<template>
  <div class="min-h-screen bg-base-100">
    <!-- Supplier Header -->
    <div class="bg-primaryColor text-white shadow-lg">
      <div class="w-full px-4 py-3">
        <div class="flex flex-row items-center justify-between gap-2 sm:gap-4">
          <!-- Supplier Info -->
          <div class="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
            <div class="flex items-center space-x-2">
              <img
                src="/logo1.png"
                alt="Logo"
                class="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
              />
              <div class="min-w-0">
                <h1 class="text-sm sm:text-lg font-semibold truncate">
                  Countryside Steakhouse
                </h1>
              </div>
            </div>
          </div>

          <!-- Desktop User Profile Dropdown -->
          <div class="hidden lg:flex items-center space-x-4">
            <div class="dropdown dropdown-end">
              <div
                tabindex="0"
                role="button"
                class="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
              >
                <!-- Supplier Avatar -->
                <div
                  class="w-8 h-8 rounded-full overflow-hidden bg-white/20 flex items-center justify-center"
                >
                  <span class="text-sm font-medium">{{ supplierInitial }}</span>
                </div>

                <!-- Supplier Info -->
                <div class="flex flex-col items-start">
                  <span class="text-sm font-medium">{{
                    supplierName || 'Supplier'
                  }}</span>
                  <span class="text-xs opacity-80">{{ supplierCategory }}</span>
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
                      <span class="text-sm font-medium text-white">{{
                        supplierInitial
                      }}</span>
                    </div>
                    <div>
                      <p class="font-medium">
                        {{ supplierName || 'Supplier' }}
                      </p>
                      <p class="text-sm opacity-70">{{ supplierEmail }}</p>
                    </div>
                  </div>
                </li>

                <!-- Menu Items -->
                <li>
                  <router-link
                    to="/supplier/dashboard"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <LayoutDashboard class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">Dashboard</span>
                  </router-link>
                </li>

                <li>
                  <router-link
                    to="/supplier/orders"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <ShoppingCart class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">My Orders</span>
                  </router-link>
                </li>

                <li>
                  <router-link
                    to="/supplier/products"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Package class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">My Products</span>
                  </router-link>
                </li>

                <li>
                  <router-link
                    to="/supplier/profile"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <User class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">Profile</span>
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

          <!-- Mobile User Profile Dropdown -->
          <div class="flex lg:hidden items-center space-x-2">
            <div class="dropdown dropdown-end relative z-20">
              <div
                tabindex="0"
                role="button"
                class="flex items-center space-x-2 p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
              >
                <!-- Mobile User Info -->
                <div class="text-right hidden sm:block">
                  <p class="text-sm font-medium">
                    {{ supplierName || 'Supplier' }}
                  </p>
                  <p class="text-xs opacity-80">{{ supplierCategory }}</p>
                </div>
                <div class="text-right sm:hidden">
                  <p class="text-xs font-medium">
                    {{ supplierName?.split(' ')[0] || 'Supplier' }}
                  </p>
                </div>

                <!-- User Avatar -->
                <div
                  class="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0"
                >
                  <span class="text-xs sm:text-sm font-medium">{{
                    supplierInitial
                  }}</span>
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
                      <span class="text-sm font-medium text-white">{{
                        supplierInitial
                      }}</span>
                    </div>
                    <div>
                      <p class="font-medium text-sm">
                        {{ supplierName || 'Supplier' }}
                      </p>
                      <p class="text-xs opacity-70">{{ supplierEmail }}</p>
                    </div>
                  </div>
                </li>

                <!-- Menu Items -->
                <li>
                  <router-link
                    to="/supplier/dashboard"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <LayoutDashboard class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">Dashboard</span>
                  </router-link>
                </li>

                <li>
                  <router-link
                    to="/supplier/orders"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <ShoppingCart class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">My Orders</span>
                  </router-link>
                </li>

                <li>
                  <router-link
                    to="/supplier/products"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Package class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">My Products</span>
                  </router-link>
                </li>

                <li>
                  <router-link
                    to="/supplier/profile"
                    class="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <User class="w-4 h-4 text-primaryColor" />
                    <span class="text-sm">Profile</span>
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

    <!-- Supplier Navigation -->
    <div class="bg-white border-b border-gray-200 shadow-sm">
      <div class="w-full px-4">
        <nav class="flex justify-between items-center">
          <!-- Desktop Navigation -->
          <div class="hidden lg:flex space-x-8">
            <router-link
              to="/supplier/dashboard"
              :class="[
                'flex items-center space-x-2 py-4 px-2 border-b-2 text-sm font-medium transition-colors',
                isActiveRoute('dashboard')
                  ? 'border-primaryColor text-primaryColor'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ]"
            >
              <LayoutDashboard class="w-4 h-4" />
              <span>Dashboard</span>
            </router-link>

            <router-link
              to="/supplier/orders"
              :class="[
                'flex items-center space-x-2 py-4 px-2 border-b-2 text-sm font-medium transition-colors',
                isActiveRoute('orders')
                  ? 'border-primaryColor text-primaryColor'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ]"
            >
              <ShoppingCart class="w-4 h-4" />
              <span>Orders</span>
            </router-link>

            <router-link
              to="/supplier/products"
              :class="[
                'flex items-center space-x-2 py-4 px-2 border-b-2 text-sm font-medium transition-colors',
                isActiveRoute('products')
                  ? 'border-primaryColor text-primaryColor'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ]"
            >
              <Package class="w-4 h-4" />
              <span>Products</span>
            </router-link>

            <router-link
              to="/supplier/profile"
              :class="[
                'flex items-center space-x-2 py-4 px-2 border-b-2 text-sm font-medium transition-colors',
                isActiveRoute('profile')
                  ? 'border-primaryColor text-primaryColor'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ]"
            >
              <User class="w-4 h-4" />
              <span>Profile</span>
            </router-link>
          </div>

          <!-- Mobile Menu Button -->
          <div class="flex lg:hidden items-center justify-between w-full">
            <div class="text-sm text-gray-600">{{ getActivePageLabel() }}</div>
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
              to="/supplier/dashboard"
              :class="[
                'flex items-center space-x-3 py-3 px-4 text-sm font-medium transition-colors',
                isActiveRoute('dashboard')
                  ? 'bg-primaryColor/10 text-primaryColor border-r-4 border-primaryColor'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ]"
              @click="closeMobileMenu"
            >
              <LayoutDashboard class="w-5 h-5" />
              <span>Dashboard</span>
            </router-link>

            <router-link
              to="/supplier/orders"
              :class="[
                'flex items-center space-x-3 py-3 px-4 text-sm font-medium transition-colors',
                isActiveRoute('orders')
                  ? 'bg-primaryColor/10 text-primaryColor border-r-4 border-primaryColor'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ]"
              @click="closeMobileMenu"
            >
              <ShoppingCart class="w-5 h-5" />
              <span>Orders</span>
            </router-link>

            <router-link
              to="/supplier/products"
              :class="[
                'flex items-center space-x-3 py-3 px-4 text-sm font-medium transition-colors',
                isActiveRoute('products')
                  ? 'bg-primaryColor/10 text-primaryColor border-r-4 border-primaryColor'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ]"
              @click="closeMobileMenu"
            >
              <Package class="w-5 h-5" />
              <span>Products</span>
            </router-link>

            <router-link
              to="/supplier/profile"
              :class="[
                'flex items-center space-x-3 py-3 px-4 text-sm font-medium transition-colors',
                isActiveRoute('profile')
                  ? 'bg-primaryColor/10 text-primaryColor border-r-4 border-primaryColor'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ]"
              @click="closeMobileMenu"
            >
              <User class="w-5 h-5" />
              <span>Profile</span>
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <main class="w-full px-4 py-4 lg:py-6">
      <router-view />
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

<script setup>
  import { ref, computed } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useSupplierAuthStore } from '../stores/supplierAuthStore';
  import {
    LayoutDashboard,
    User,
    LogOut,
    ShoppingCart,
    Package,
    ChevronDown,
    Menu,
    X,
  } from 'lucide-vue-next';

  const route = useRoute();
  const router = useRouter();
  const supplierAuthStore = useSupplierAuthStore();

  // Local state
  const mobileMenuOpen = ref(false);
  const showLogoutModal = ref(false);
  const toast = ref({ show: false, type: 'success', message: '' });

  // Computed
  const supplierName = computed(() => supplierAuthStore.supplierName);
  const supplierEmail = computed(() => supplierAuthStore.supplierEmail);
  const supplierCategory = computed(() => supplierAuthStore.supplierCategory);
  const supplierInitial = computed(() => {
    const name = supplierAuthStore.supplierName;
    return name ? name.charAt(0).toUpperCase() : 'S';
  });

  // Methods
  const isActiveRoute = (page) => {
    const currentRoute = route.path.toLowerCase();
    return currentRoute.includes(page);
  };

  const getActivePageLabel = () => {
    const path = route.path.toLowerCase();
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('orders')) return 'Orders';
    if (path.includes('profile')) return 'Profile';
    return 'Supplier Portal';
  };

  const toggleMobileMenu = () => {
    mobileMenuOpen.value = !mobileMenuOpen.value;
  };

  const closeMobileMenu = () => {
    mobileMenuOpen.value = false;
  };

  const requestLogout = () => {
    showLogoutModal.value = true;
  };

  const cancelLogout = () => {
    showLogoutModal.value = false;
  };

  const confirmLogout = () => {
    showLogoutModal.value = false;
    supplierAuthStore.logout();
    router.push('/supplier/login');
  };

  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };
</script>

<style scoped>
  /* Toast positioning */
  .toast {
    z-index: 9999;
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
</style>
