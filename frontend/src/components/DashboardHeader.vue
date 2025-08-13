<template>
  <header
    class="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between"
  >
    <!-- Left Section: Menu Button + Breadcrumb -->
    <div class="flex items-center space-x-4">
      <!-- Mobile Menu Toggle -->
      <button
        @click="toggleSidebar"
        class="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
      >
        <Menu class="w-5 h-5 text-gray-600" />
      </button>

      <!-- Breadcrumb Navigation -->
      <nav class="flex items-center space-x-2 text-sm">
        <router-link
          to="/dashboard"
          class="text-primaryColor hover:text-primaryColor/80 transition-colors"
        >
          Home
        </router-link>
        <ChevronRight class="w-4 h-4 text-gray-400" />
        <span class="text-gray-600">{{ currentPageTitle }}</span>
      </nav>
    </div>

    <!-- Right Section: User Profile -->
    <div class="flex items-center space-x-4">
      <!-- User Profile Dropdown -->
      <div class="dropdown dropdown-end">
        <div
          tabindex="0"
          role="button"
          class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <!-- User Avatar -->
          <div
            class="w-8 h-8 rounded-full bg-primaryColor flex items-center justify-center"
          >
            <span class="text-sm font-medium text-white">
              {{ user?.name?.charAt(0) || 'J' }}
            </span>
          </div>

          <!-- User Info -->
          <div class="flex flex-col items-start">
            <span class="text-sm font-medium text-gray-900">
              {{ user?.name || 'John Marco Paja' }}
            </span>
            <span class="text-xs text-gray-500">
              {{ user?.role || 'HR Manager' }}
            </span>
          </div>

          <!-- Dropdown Arrow -->
          <ChevronDown class="w-4 h-4 text-gray-400" />
        </div>

        <!-- Dropdown Menu -->
        <ul
          tabindex="0"
          class="dropdown-content menu bg-white rounded-lg shadow-lg border border-gray-200 w-64 p-2 mt-2"
        >
          <!-- User Info Header -->
          <li class="px-3 py-2 border-b border-gray-100 mb-2">
            <div class="flex items-center space-x-3">
              <div
                class="w-10 h-10 rounded-full bg-primaryColor flex items-center justify-center"
              >
                <span class="text-sm font-medium text-white">
                  {{ user?.name?.charAt(0) || 'J' }}
                </span>
              </div>
              <div>
                <p class="font-medium text-gray-900">
                  {{ user?.name || 'John Marco Paja' }}
                </p>
                <p class="text-sm text-gray-500">
                  {{ user?.email || 'john.paja@company.com' }}
                </p>
              </div>
            </div>
          </li>

          <!-- Menu Items -->
          <li>
            <a
              class="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 rounded-md transition-colors"
            >
              <User class="w-4 h-4 text-primaryColor" />
              <span class="text-sm text-gray-700">Profile</span>
            </a>
          </li>

          <li>
            <a
              class="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 rounded-md transition-colors"
            >
              <Settings class="w-4 h-4 text-primaryColor" />
              <span class="text-sm text-gray-700">Account Settings</span>
            </a>
          </li>

          <li>
            <a
              class="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 rounded-md transition-colors"
            >
              <Clock class="w-4 h-4 text-primaryColor" />
              <span class="text-sm text-gray-700">Attendance</span>
            </a>
          </li>

          <!-- Divider -->
          <li class="border-t border-gray-100 mt-2 pt-2">
            <a
              @click="logout"
              class="flex items-center space-x-3 px-3 py-2 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
            >
              <LogOut class="w-4 h-4 text-red-600" />
              <span class="text-sm text-red-700">Log Out</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </header>
</template>

<script setup>
  import { computed } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useAuthStore } from '../stores/authStore';
  import {
    Menu,
    ChevronRight,
    ChevronDown,
    User,
    Settings,
    Clock,
    LogOut,
  } from 'lucide-vue-next';

  // Define emits for parent communication
  const emit = defineEmits(['toggle-sidebar']);

  // Stores and router
  const authStore = useAuthStore();
  const route = useRoute();
  const router = useRouter();

  // Get user from auth store
  const { user } = authStore;

  // Computed properties
  const currentPageTitle = computed(() => {
    // Extract page title from route meta or create from path
    if (route.meta?.title) {
      return route.meta.title;
    }

    // Fallback: create title from route path
    const pathSegments = route.path.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    if (lastSegment) {
      return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
    }

    return 'Dashboard';
  });

  // Methods
  const toggleSidebar = () => {
    emit('toggle-sidebar');
  };

  const logout = () => {
    authStore.logout();
    router.push('/login');
  };
</script>

<style scoped>
  /* Custom dropdown styles */
  .dropdown-content {
    box-shadow:
      0 10px 25px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  /* Ensure dropdown appears above other content */
  .dropdown {
    z-index: 50;
  }
</style>
