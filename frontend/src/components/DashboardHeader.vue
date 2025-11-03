<template>
  <header
    :class="[
      'shadow-sm border-b px-1 sm:px-2 md:px-4 py-1.5 sm:py-2 md:py-3 flex items-center justify-between transition-colors duration-300',
      themeStore.themeClasses.headerBg,
    ]"
  >
    <!-- Left Section: Menu Toggle + Breadcrumb -->
    <div
      class="flex items-center space-x-1 sm:space-x-2 md:space-x-4 min-w-0 flex-1"
    >
      <!-- Menu Toggle Button (Mobile) -->
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

      <!-- Desktop Sidebar Toggle Button -->
      <button
        @click="toggleDesktopSidebar"
        :class="[
          'p-1 sm:p-1.5 md:p-2 rounded-lg transition-all duration-300 ease-in-out hidden lg:flex flex-shrink-0',
          themeStore.themeClasses.hoverBg,
          themeStore.themeClasses.textSecondary,
        ]"
        title="Toggle Sidebar"
      >
        <PanelLeftClose
          v-if="props.isDesktopSidebarVisible"
          class="w-4 h-4 md:w-5 md:h-5"
        />
        <PanelLeftOpen v-else class="w-4 h-4 md:w-5 md:h-5" />
      </button>

      <!-- Breadcrumb Navigation -->
      <nav
        class="flex items-center space-x-0.5 sm:space-x-1 md:space-x-2 text-xs sm:text-sm min-w-0"
      >
        <router-link
          :to="homeRoute"
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
      <!-- Notification Bell Dropdown -->
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="cursor-pointer relative">
          <font-awesome-icon
            icon="fa-regular fa-bell"
            class="!w-5 !h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-gray-600 hover:text-gray-800 transition-colors"
          />
          <!-- Unread count badge -->
          <span
            v-if="notificationStore.unreadCount > 0"
            class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center min-w-[16px]"
          >
            {{
              notificationStore.unreadCount > 99
                ? '99+'
                : notificationStore.unreadCount
            }}
          </span>
        </div>

        <!-- Dropdown content -->
        <ul
          tabindex="0"
          class="dropdown-content menu bg-base-100 rounded-box z-[1] w-80 shadow-lg border border-base-300 max-h-[70vh] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y"
        >
          <!-- Header -->
          <li class="menu-title">
            <span>Notifications</span>
            <button
              v-if="notificationStore.unreadCount > 0"
              @click="markAllAsRead"
              class="btn btn-ghost btn-xs"
              :disabled="notificationStore.loading"
            >
              Mark all read
            </button>
          </li>

          <!-- Loading state -->
          <li
            v-if="
              notificationStore.loading && visibleNotifications.length === 0
            "
          >
            <div class="flex justify-center py-4">
              <span class="loading loading-spinner loading-sm"></span>
            </div>
          </li>

          <!-- Empty state -->
          <li v-else-if="visibleNotifications.length === 0">
            <div
              class="text-center flex justify-center items-center py-4 text-base-content/60"
            >
              <p class="text-sm">No notifications yet</p>
            </div>
          </li>

          <!-- Notifications list -->
          <template v-else>
            <li
              v-for="notification in visibleNotifications.slice(0, 10)"
              :key="notification.id"
              class="border-b border-base-200 last:border-b-0"
            >
              <a
                @click="handleNotificationClick(notification)"
                class="block p-3 hover:bg-base-200 transition-colors"
                :class="{
                  'bg-primaryColor/10 border-l-4 border-l-primaryColor':
                    !notification.is_read,
                }"
              >
                <div class="flex flex-col space-y-1">
                  <div class="flex items-start justify-between">
                    <h4
                      class="text-sm font-medium text-base-content"
                      :class="{ 'font-bold': !notification.is_read }"
                    >
                      {{ notification.title }}
                    </h4>
                    <span
                      v-if="!notification.is_read"
                      class="w-2 h-2 bg-primaryColor rounded-full flex-shrink-0 mt-1"
                    ></span>
                  </div>
                  <p class="text-xs text-base-content/70 line-clamp-2">
                    {{ notification.message }}
                  </p>
                  <span class="text-xs text-base-content/50">
                    {{ formatTimeAgo(notification.created_at) }}
                  </span>
                </div>
              </a>
            </li>
          </template>

          <!-- Load more button (if needed) -->
          <li v-if="visibleNotifications.length > 10">
            <button
              @click="loadMoreNotifications"
              class="btn btn-ghost btn-sm w-full"
              :disabled="notificationStore.loading"
            >
              Load more
            </button>
          </li>
        </ul>
      </div>
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
              {{ getUserInitial() }}
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
              {{ getUserDisplayName() }}
            </span>
            <span
              :class="['text-xs truncate', themeStore.themeClasses.textMuted]"
            >
              {{ user?.role || 'User' }}
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
                  {{ getUserInitial() }}
                </span>
              </div>
              <div class="min-w-0 flex-1">
                <p
                  :class="[
                    'font-medium truncate',
                    themeStore.themeClasses.textPrimary,
                  ]"
                >
                  {{ getUserDisplayName() }}
                </p>
                <p
                  :class="[
                    'text-sm break-all',
                    themeStore.themeClasses.textMuted,
                  ]"
                >
                  {{ user?.email || 'user@company.com' }}
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

          <li v-if="!isSuperAdmin && !isBoardMember">
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
          class="btn btn-ghost btn-sm !font-thin border-none"
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
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { storeToRefs } from 'pinia';
  import { useRoute, useRouter } from 'vue-router';
  import { useAuthStore } from '../stores/authStore';
  import { useThemeStore } from '../stores/themeStore';
  import { useNotificationStore } from '../stores/notificationStore';
  import { apiConfig, formatImageUrl } from '../config/api';
  import {
    Menu,
    X,
    ChevronRight,
    ChevronDown,
    User,
    Settings,
    Clock,
    LogOut,
    PanelLeftOpen,
    PanelLeftClose,
  } from 'lucide-vue-next';

  // Define props
  const props = defineProps({
    isMobileMenuOpen: {
      type: Boolean,
      default: false,
    },
    isDesktopSidebarVisible: {
      type: Boolean,
      default: true,
    },
  });

  // Define emits for parent communication
  const emit = defineEmits(['toggle-sidebar', 'toggle-desktop-sidebar']);

  // Stores and router
  const authStore = useAuthStore();
  const themeStore = useThemeStore();
  const notificationStore = useNotificationStore();
  const route = useRoute();
  const router = useRouter();

  // Get user and flags from auth store
  const { user, isSuperAdmin, isBoardDirector } = storeToRefs(authStore);

  // Get notifications from store
  const { notifications } = storeToRefs(notificationStore);

  // Only show unread notifications in bell dropdown
  const visibleNotifications = computed(() =>
    (notifications.value || []).filter((n) => !n.is_read)
  );

  // Computed property for Board member check (includes Chairman and Board Directors)
  const isBoardMember = computed(() => {
    // Wait for user data to be available
    if (!user.value) {
      console.log('DashboardHeader - No user data available yet');
      return false;
    }

    const userRole = user.value?.role;
    const hasBoardId = user.value?.board_id;
    const isBoardDirectorRole = isBoardDirector.value;

    // Direct Board member detection (more reliable than relying on auth store computed)
    const isDirectBoardMember =
      userRole === 'Chairman of the Board' ||
      userRole === 'Board of Directors' ||
      hasBoardId;

    console.log('DashboardHeader - Board member check:', {
      userRole,
      hasBoardId,
      isBoardDirectorRole,
      isDirectBoardMember,
      user: user.value,
      isSuperAdminValue: isSuperAdmin.value,
      authStoreUser: authStore.user,
      authStoreIsAuthenticated: authStore.isAuthenticated,
    });

    return isDirectBoardMember;
  });

  // Build absolute image URL for employee photo
  const profileImageUrl = computed(() => {
    const url = user.value?.photo_url || user.value?.photoUrl || null;
    if (!url) return null;
    return /^https?:\/\//i.test(url) ? url : formatImageUrl(url);
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

  // Compute where the Home link should go based on role/department
  const homeRoute = computed(() => {
    const role = authStore.userRole;
    if (
      role === 'Super Admin' ||
      role === 'Chairman of the Board' ||
      role === 'Board of Directors'
    ) {
      return '/super-admin';
    }
    if (authStore.userDepartment === 'Branch') return '/branch/dashboard';
    return '/dashboard';
  });

  // Methods
  const showLogoutModal = ref(false);

  const toggleSidebar = () => {
    emit('toggle-sidebar');
  };

  const toggleDesktopSidebar = () => {
    emit('toggle-desktop-sidebar');
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
      Administration: '/admin/profile', // For Board members
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
      Administration: '/admin/attendance', // For Board members
    };
    return map[dept] || '/hr/attendance';
  };

  // Get user display name (handles both employees and board members)
  const getUserDisplayName = () => {
    if (!user.value) return 'User';

    // For Board members, construct name from first_name and last_name
    if (
      user.value.board_id ||
      user.value.role === 'Chairman of the Board' ||
      user.value.role === 'Board of Directors'
    ) {
      const firstName = user.value.first_name || '';
      const lastName = user.value.last_name || '';
      if (firstName && lastName) {
        return `${firstName} ${lastName}`;
      }
      if (firstName) return firstName;
      if (lastName) return lastName;
    }

    // For employees, use the existing name field
    return user.value.name || 'User';
  };

  // Get user initial for avatar
  const getUserInitial = () => {
    if (!user.value) return 'U';

    // For Board members, use first name initial
    if (
      user.value.board_id ||
      user.value.role === 'Chairman of the Board' ||
      user.value.role === 'Board of Directors'
    ) {
      const firstName = user.value.first_name || '';
      if (firstName) return firstName.charAt(0).toUpperCase();
    }

    // For employees, use existing name logic
    const name = user.value.name || 'User';
    return name.charAt(0).toUpperCase();
  };

  // Notification methods
  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read if not already read
      if (!notification.is_read) {
        await notificationStore.markAsRead(notification.id);
      }

      // Navigate to action URL if provided
      if (notification.action_url) {
        router.push(notification.action_url);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationStore.markAllAsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const loadMoreNotifications = async () => {
    try {
      await notificationStore.fetchNotifications({ limit: 20 });
    } catch (error) {
      console.error('Error loading more notifications:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  // Initialize notifications when component mounts
  onMounted(async () => {
    if (authStore.isAuthenticated) {
      try {
        await Promise.all([
          notificationStore.fetchNotifications({ limit: 10 }),
          notificationStore.fetchUnreadCount(),
        ]);
        notificationStore.startPolling();
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    }
  });

  // Clean up polling when component unmounts
  onUnmounted(() => {
    notificationStore.stopPolling();
  });
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
