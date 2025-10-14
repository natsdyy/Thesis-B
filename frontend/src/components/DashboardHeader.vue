<template>
  <header
    :class="[
      'shadow-sm border-b px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 md:py-3 flex items-center justify-between transition-colors duration-300',
      themeStore.themeClasses.headerBg,
    ]"
  >
    <!-- Left Section: Menu Toggle + Theme Toggle + Breadcrumb -->
    <div
      class="flex items-center space-x-1 sm:space-x-2 md:space-x-4 min-w-0 flex-1"
    >
      <!-- Menu Toggle Button -->
      <button
        @click="toggleSidebar"
        :class="[
          'p-1 sm:p-1.5 md:p-2 rounded-lg transition-all duration-300 ease-in-out lg:hidden flex-shrink-0',
          themeStore.themeClasses.hoverBg,
          themeStore.themeClasses.textSecondary,
        ]"
        title="Toggle Menu"
      >
        <Menu
          v-if="!props.isMobileMenuOpen"
          class="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5"
        />
        <X v-else class="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
      </button>

      <!-- Theme Toggle Button -->
      <button
        @click="toggleTheme"
        :class="[
          'p-1 sm:p-1.5 md:p-2 rounded-lg transition-all duration-300 ease-in-out flex-shrink-0',
          themeStore.themeClasses.hoverBg,
          themeStore.themeClasses.textSecondary,
        ]"
        :title="
          themeStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'
        "
      >
        <Sun
          v-if="themeStore.isDarkMode"
          class="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-yellow-400 transition-transform duration-300"
        />
        <Moon
          v-else
          class="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-black transition-transform duration-300"
        />
      </button>

      <!-- Breadcrumb Navigation -->
      <nav
        class="flex items-center space-x-0.5 sm:space-x-1 md:space-x-2 text-xs sm:text-sm min-w-0"
      >
        <router-link
          to="/dashboard"
          class="text-primaryColor hover:text-primaryColor/80 transition-colors flex-shrink-0"
        >
          Home
        </router-link>
        <ChevronRight
          :class="[
            'w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 flex-shrink-0',
            themeStore.themeClasses.textMuted,
          ]"
        />
        <span :class="['truncate', themeStore.themeClasses.textSecondary]">{{
          currentPageTitle
        }}</span>
      </nav>
    </div>

    <!-- Right Section: User Profile -->
    <div
      class="flex items-center space-x-1 sm:space-x-2 md:space-x-4 flex-shrink-0"
    >
      <!-- User Profile Dropdown -->
      <div class="dropdown dropdown-end">
        <div
          tabindex="0"
          role="button"
          :class="[
            'flex items-center space-x-1 sm:space-x-2 md:space-x-3 p-1 sm:p-1.5 md:p-2 rounded-lg transition-colors cursor-pointer',
            themeStore.themeClasses.hoverBg,
          ]"
        >
          <!-- User Avatar -->
          <div
            class="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-full overflow-hidden bg-primaryColor flex items-center justify-center flex-shrink-0"
          >
            <img
              v-if="profileImageUrl"
              :src="profileImageUrl"
              alt="Profile"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-xs sm:text-sm font-medium text-white">
              {{ user?.name?.charAt(0) || 'J' }}
            </span>
          </div>

          <!-- User Info -->
          <div class="hidden sm:flex flex-col items-start min-w-0">
            <span
              :class="[
                'text-sm font-medium truncate',
                themeStore.themeClasses.textPrimary,
              ]"
            >
              {{ user?.name || 'John Marco Paja' }}
            </span>
            <span
              :class="['text-xs truncate', themeStore.themeClasses.textMuted]"
            >
              {{ user?.role || 'HR Manager' }}
            </span>
          </div>

          <!-- Dropdown Arrow -->
          <ChevronDown
            :class="[
              'w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 flex-shrink-0',
              themeStore.themeClasses.textMuted,
            ]"
          />
        </div>

        <!-- Dropdown Menu -->
        <ul
          tabindex="0"
          :class="[
            'dropdown-content menu rounded-lg shadow-lg border w-72 p-2 mt-2 transition-colors duration-300',
            themeStore.themeClasses.cardBg,
            themeStore.themeClasses.border,
          ]"
        >
          <!-- User Info Header -->
          <li
            :class="[
              'px-3 py-2 border-b mb-2',
              themeStore.themeClasses.borderLight,
            ]"
          >
            <div class="flex items-center space-x-3">
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
                  {{ user?.name?.charAt(0) || 'J' }}
                </span>
              </div>
              <div class="min-w-0 flex-1">
                <p
                  :class="[
                    'font-medium truncate',
                    themeStore.themeClasses.textPrimary,
                  ]"
                >
                  {{ user?.name || 'John Marco Paja' }}
                </p>
                <p
                  :class="[
                    'text-sm break-all',
                    themeStore.themeClasses.textMuted,
                  ]"
                >
                  {{ user?.email || 'john.paja@company.com' }}
                </p>
              </div>
            </div>
          </li>

          <!-- Menu Items -->
          <li>
            <router-link
              :to="getProfileRoute()"
              :class="[
                'flex items-center space-x-3 px-3 py-2 rounded-md transition-colors',
                themeStore.themeClasses.hoverBg,
              ]"
            >
              <User class="w-4 h-4 text-primaryColor" />
              <span :class="['text-sm', themeStore.themeClasses.textSecondary]"
                >Profile</span
              >
            </router-link>
          </li>


          <li>
            <router-link
              :to="getAttendanceRoute()"
              :class="[
                'flex items-center space-x-3 px-3 py-2 rounded-md transition-colors',
                themeStore.themeClasses.hoverBg,
              ]"
            >
              <Clock class="w-4 h-4 text-primaryColor" />
              <span :class="['text-sm', themeStore.themeClasses.textSecondary]"
                >Attendance</span
              >
            </router-link>
          </li>

          <!-- Divider -->
          <li
            :class="['border-t mt-2 pt-2', themeStore.themeClasses.borderLight]"
          >
            <a
              @click="requestLogout"
              class="flex items-center space-x-3 px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors cursor-pointer"
            >
              <LogOut class="w-4 h-4 text-red-600" />
              <span class="text-sm text-red-700 dark:text-red-400"
                >Log Out</span
              >
            </a>
          </li>
        </ul>
      </div>
    </div>
  </header>

  <!-- Logout Confirmation Modal -->
  <div v-if="showLogoutModal" class="modal modal-open">
    <div :class="['modal-box', themeStore.themeClasses.cardBg]">
      <h3
        :class="['font-bold text-lg mb-2', themeStore.themeClasses.textPrimary]"
      >
        Confirm Logout
      </h3>
      <p :class="['py-2', themeStore.themeClasses.textSecondary]">
        Are you sure you want to log out?
      </p>
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
  import { useAuthStore } from '../stores/authStore';
  import { useThemeStore } from '../stores/themeStore';
  import { apiConfig } from '../config/api';
  import {
    Menu,
    X,
    ChevronRight,
    ChevronDown,
    User,
    Settings,
    Clock,
    LogOut,
    Sun,
    Moon,
  } from 'lucide-vue-next';

  // Define props
  const props = defineProps({
    isMobileMenuOpen: {
      type: Boolean,
      default: false,
    },
  });

  // Define emits for parent communication
  const emit = defineEmits(['toggle-sidebar']);

  // Stores and router
  const authStore = useAuthStore();
  const themeStore = useThemeStore();
  const route = useRoute();
  const router = useRouter();

  // Get user from auth store
  const { user } = authStore;

  // Build absolute image URL for employee photo
  const profileImageUrl = computed(() => {
    const url = user?.photo_url || user?.photoUrl || null;
    if (!url) return null;
    // If already absolute (e.g., starts with http), use as-is
    if (/^https?:\/\//i.test(url)) return url;
    // Build from API server origin (not the /api base path)
    const apiOrigin = new URL(apiConfig.baseURL, window.location.origin).origin;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${apiOrigin}${path}`;
  });

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
  const showLogoutModal = ref(false);

  const toggleSidebar = () => {
    emit('toggle-sidebar');
  };

  const toggleTheme = () => {
    themeStore.toggleTheme();
  };

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

  // Map Profile to department-specific /profile route via router link in template
  const getProfileRoute = () => {
    const dept = authStore.userDepartment;
    const map = {
      'Human Resource': '/hr/profile',
      SCM: '/scm/profile',
      Finance: '/finance/profile',
      Production: '/production/profile',
      CRM: '/crm/profile',
      Branch: '/branch/profile',
      System: '/admin/profile',
    };
    return map[dept] || '/hr/profile';
  };

  // Map Attendance to department-specific /attendance route
  const getAttendanceRoute = () => {
    const dept = authStore.userDepartment;
    const map = {
      'Human Resource': '/hr/attendance',
      SCM: '/scm/attendance',
      Finance: '/finance/attendance',
      Production: '/production/attendance',
      CRM: '/crm/attendance',
      Branch: '/branch/attendance',
      System: '/admin/attendance',
    };
    return map[dept] || '/hr/attendance';
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
