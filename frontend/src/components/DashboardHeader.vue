<template>
  <header
    :class="[
      'shadow-sm border-b px-4 py-3 flex items-center justify-between transition-colors duration-300',
      themeStore.themeClasses.headerBg,
    ]"
  >
    <!-- Left Section: Theme Toggle + Menu Button + Breadcrumb -->
    <div class="flex items-center space-x-4">
      <!-- Theme Toggle Button -->
      <button
        @click="toggleTheme"
        :class="[
          'p-2 rounded-lg transition-all duration-300 ease-in-out',
          themeStore.themeClasses.hoverBg,
          themeStore.themeClasses.textSecondary,
        ]"
        :title="
          themeStore.isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'
        "
      >
        <Sun
          v-if="themeStore.isDarkMode"
          class="w-5 h-5 text-yellow-400 transition-transform duration-300"
        />
        <Moon
          v-else
          class="w-5 h-5 text-black transition-transform duration-300"
        />
      </button>

      <!-- Breadcrumb Navigation -->
      <nav class="flex items-center space-x-2 text-sm">
        <router-link
          to="/dashboard"
          class="text-primaryColor hover:text-primaryColor/80 transition-colors"
        >
          Home
        </router-link>
        <ChevronRight :class="['w-4 h-4', themeStore.themeClasses.textMuted]" />
        <span :class="themeStore.themeClasses.textSecondary">{{
          currentPageTitle
        }}</span>
      </nav>
    </div>

    <!-- Right Section: User Profile -->
    <div class="flex items-center space-x-4">
      <!-- User Profile Dropdown -->
      <div class="dropdown dropdown-end">
        <div
          tabindex="0"
          role="button"
          :class="[
            'flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer',
            themeStore.themeClasses.hoverBg,
          ]"
        >
          <!-- User Avatar -->
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
              {{ user?.name?.charAt(0) || 'J' }}
            </span>
          </div>

          <!-- User Info -->
          <div class="flex flex-col items-start">
            <span
              :class="[
                'text-sm font-medium',
                themeStore.themeClasses.textPrimary,
              ]"
            >
              {{ user?.name || 'John Marco Paja' }}
            </span>
            <span :class="['text-xs', themeStore.themeClasses.textMuted]">
              {{ user?.role || 'HR Manager' }}
            </span>
          </div>

          <!-- Dropdown Arrow -->
          <ChevronDown
            :class="['w-4 h-4', themeStore.themeClasses.textMuted]"
          />
        </div>

        <!-- Dropdown Menu -->
        <ul
          tabindex="0"
          :class="[
            'dropdown-content menu rounded-lg shadow-lg border w-64 p-2 mt-2 transition-colors duration-300',
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
              <div>
                <p
                  :class="['font-medium', themeStore.themeClasses.textPrimary]"
                >
                  {{ user?.name || 'John Marco Paja' }}
                </p>
                <p :class="['text-sm', themeStore.themeClasses.textMuted]">
                  {{ user?.email || 'john.paja@company.com' }}
                </p>
              </div>
            </div>
          </li>

          <!-- Menu Items -->
          <li>
            <a
              :class="[
                'flex items-center space-x-3 px-3 py-2 rounded-md transition-colors',
                themeStore.themeClasses.hoverBg,
              ]"
            >
              <User class="w-4 h-4 text-primaryColor" />
              <span :class="['text-sm', themeStore.themeClasses.textSecondary]"
                >Profile</span
              >
            </a>
          </li>

          <li>
            <a
              :class="[
                'flex items-center space-x-3 px-3 py-2 rounded-md transition-colors',
                themeStore.themeClasses.hoverBg,
              ]"
            >
              <Settings class="w-4 h-4 text-primaryColor" />
              <span :class="['text-sm', themeStore.themeClasses.textSecondary]"
                >Account Settings</span
              >
            </a>
          </li>

          <li>
            <a
              @click="openAttendanceModal"
              :class="[
                'flex items-center space-x-3 px-3 py-2 rounded-md transition-colors cursor-pointer',
                themeStore.themeClasses.hoverBg,
              ]"
            >
              <Clock class="w-4 h-4 text-primaryColor" />
              <span :class="['text-sm', themeStore.themeClasses.textSecondary]"
                >Attendance</span
              >
            </a>
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

  <!-- QR Attendance Modal -->
  <QRAttendanceModal 
    :isOpen="showAttendanceModal" 
    @close="closeAttendanceModal"
    @viewRecords="viewAttendanceRecords"
  />

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
  import QRAttendanceModal from './QRAttendanceModal.vue';
  import {
    Menu,
    ChevronRight,
    ChevronDown,
    User,
    Settings,
    Clock,
    LogOut,
    Sun,
    Moon,
  } from 'lucide-vue-next';

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
  const showAttendanceModal = ref(false);

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

  const openAttendanceModal = () => {
    showAttendanceModal.value = true;
  };

  const closeAttendanceModal = () => {
    showAttendanceModal.value = false;
  };

  const viewAttendanceRecords = () => {
    closeAttendanceModal();
    // Redirect based on user department
    const userDepartment = authStore.user?.department;
    const userRole = authStore.user?.role;
    
    if (userRole === 'Super Admin') {
      // Super Admin can access HR attendance records
      router.push('/hr/attendance-records');
    } else if (userDepartment === 'Human Resource') {
      router.push('/hr/attendance-records');
    } else if (userDepartment === 'Branch') {
      router.push('/branch/attendance');
    } else {
      // Default to branch attendance for other departments
      router.push('/branch/attendance');
    }
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
