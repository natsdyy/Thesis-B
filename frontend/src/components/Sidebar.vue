<template>
  <div>
    <!-- Backdrop for mobile -->
    <div
      v-if="props.isMobileMenuOpen"
      class="fixed inset-0 bg-primaryColor/10 backdrop-blur-sm z-40 lg:hidden"
      @click="closeMobileMenu"
    ></div>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed top-0 left-0 h-screen bg-primaryColor shadow-xl z-40 transition-transform duration-300 ease-in-out',
        'w-64 flex flex-col text-white min-h-screen',
        props.isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0 lg:fixed lg:z-40',
      ]"
    >
      <!-- Header -->
      <div class="p-6 flex-shrink-0">
        <div class="flex items-center space-x-3">
          <div
            class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center"
          >
            <img src="/logo1.png" alt="logo" class="w-15 h-15 object-contain" />
          </div>
          <div class="flex-1">
            <h1 class="font-thin text-lg text-white">
              Countryside Steak House
            </h1>
          </div>
        </div>
      </div>

      <!-- Navigation Menu -->
      <nav class="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
        <!-- MENU Label -->
        <div class="text-xs text-white/60 mb-4 px-2">MENU</div>

        <!-- Super Admin View: All departments as dropdowns -->
        <template v-if="isSuperAdmin">
          <div
            v-for="(menus, department) in availableMenus"
            :key="department"
            class="mb-4"
          >
            <!-- Department Header with Collapse -->
            <div class="collapse">
              <input
                type="checkbox"
                class="collapse-toggle opacity-0 absolute"
                :id="`dept-collapse-${department}`"
              />
              <label
                :for="`dept-collapse-${department}`"
                class="collapse-title px-2 py-3 cursor-pointer hover:bg-white/10 rounded-lg transition-colors duration-200 flex items-center justify-between min-h-0"
                style="position: relative; z-index: 1"
              >
                <div class="flex items-center space-x-3">
                  <component
                    :is="departmentIcons[department]"
                    class="w-5 h-5 text-white"
                  />
                  <span class="text-white font-medium">{{ department }}</span>
                </div>
                <ChevronDown
                  class="w-4 h-4 text-white/60 transition-transform duration-200 chevron-icon"
                />
              </label>

              <!-- Department Menu Items -->
              <div class="collapse-content px-0 pb-0">
                <div class="ml-8 space-y-1 mt-2">
                  <template v-for="menu in menus" :key="menu.route">
                    <!-- Check if this menu has sub-items (like Employee Management) -->
                    <div
                      v-if="menu.subItems && menu.subItems.length > 0"
                      class="mb-2"
                    >
                      <!-- Parent menu with dropdown -->
                      <div class="collapse">
                        <input
                          type="checkbox"
                          class="collapse-toggle opacity-0 absolute"
                          :id="`submenu-collapse-${menu.name.replace(/\s+/g, '-')}`"
                        />
                        <label
                          :for="`submenu-collapse-${menu.name.replace(/\s+/g, '-')}`"
                          class="collapse-title px-2 py-2 cursor-pointer hover:bg-white/10 rounded-lg transition-colors duration-200 flex items-center justify-between min-h-0"
                          style="position: relative; z-index: 1"
                        >
                          <div class="flex items-center space-x-3">
                            <component
                              :is="menu.icon"
                              class="w-4 h-4 text-white"
                            />
                            <span class="text-white text-sm font-medium">{{
                              menu.name
                            }}</span>
                          </div>
                          <ChevronDown
                            class="w-3 h-3 text-white/60 transition-transform duration-200 chevron-icon"
                          />
                        </label>

                        <!-- Sub-menu items -->
                        <div class="collapse-content px-0 pb-0">
                          <div class="ml-6 space-y-1 mt-1">
                            <button
                              v-for="subItem in menu.subItems"
                              :key="subItem.route"
                              @click="navigateToRoute(subItem.route)"
                              :class="[
                                'w-full text-left px-2 py-1.5 rounded-lg transition-all duration-200 text-xs',
                                isActiveRoute(subItem.route)
                                  ? 'bg-white/20 text-white font-medium'
                                  : 'text-white/80 hover:bg-white/10 hover:text-white',
                              ]"
                            >
                              {{ subItem.name }}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Regular menu item (no sub-items) -->
                    <div v-else>
                      <button
                        @click="navigateToRoute(menu.route)"
                        :class="[
                          'w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-sm flex items-center space-x-3',
                          isActiveRoute(menu.route)
                            ? 'bg-white/20 text-white font-medium'
                            : 'text-white/80 hover:bg-white/10 hover:text-white',
                        ]"
                      >
                        <component :is="menu.icon" class="w-4 h-4 text-white" />
                        <span>{{ menu.name }}</span>
                      </button>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Regular User View: Clean direct menu items (like your reference image) -->
        <template v-else>
          <div class="space-y-2">
            <!-- Iterate through all menus for the user's department -->
            <template
              v-for="(menus, department) in availableMenus"
              :key="department"
            >
              <template v-for="menu in menus" :key="menu.route">
                <!-- Check if this menu has sub-items (like Employee Management) -->
                <div v-if="menu.subItems && menu.subItems.length > 0">
                  <!-- Parent menu with dropdown -->
                  <div class="collapse">
                    <input
                      type="checkbox"
                      class="collapse-toggle opacity-0 absolute"
                      :id="`collapse-${menu.name}`"
                    />
                    <label
                      :for="`collapse-${menu.name}`"
                      class="collapse-title px-2 py-3 cursor-pointer hover:bg-white/10 rounded-lg transition-colors duration-200 flex items-center justify-between min-h-0"
                      style="position: relative; z-index: 1"
                    >
                      <div class="flex items-center space-x-3">
                        <component :is="menu.icon" class="w-5 h-5 text-white" />
                        <span class="text-white font-medium">{{
                          menu.name
                        }}</span>
                      </div>
                      <ChevronDown
                        class="w-4 h-4 text-white/60 transition-transform duration-200 chevron-icon"
                      />
                    </label>

                    <!-- Sub-menu items -->
                    <div class="collapse-content px-0 pb-0">
                      <div class="ml-8 space-y-1 mt-2">
                        <button
                          v-for="subItem in menu.subItems"
                          :key="subItem.route"
                          @click="navigateToRoute(subItem.route)"
                          :class="[
                            'w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-sm',
                            isActiveRoute(subItem.route)
                              ? 'bg-white/20 text-white font-medium'
                              : 'text-white/80 hover:bg-white/10 hover:text-white',
                          ]"
                        >
                          {{ subItem.name }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Regular menu item (no sub-items) -->
                <div v-else>
                  <button
                    @click="navigateToRoute(menu.route)"
                    :class="[
                      'w-full flex items-center space-x-3 px-2 py-3 rounded-lg transition-all duration-200',
                      isActiveRoute(menu.route)
                        ? 'bg-white/20 text-white font-medium'
                        : 'text-white/80 hover:bg-white/10 hover:text-white',
                    ]"
                  >
                    <component :is="menu.icon" class="w-5 h-5 text-white" />
                    <span class="font-medium">{{ menu.name }}</span>
                  </button>
                </div>
              </template>
            </template>
          </div>
        </template>
      </nav>
    </aside>

    <!-- Spacer for desktop layout -->
    <div class="hidden lg:block w-64 flex-shrink-0"></div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { useAuthStore } from '../stores/authStore';
  import { menusByDepartment, departmentIcons } from '../config/menus';
  import { Building2, ChevronDown } from 'lucide-vue-next';

  // Define props
  const props = defineProps({
    isMobileMenuOpen: {
      type: Boolean,
      default: false,
    },
  });

  // Define emits
  const emit = defineEmits(['close-mobile-menu']);

  // Stores and router
  const authStore = useAuthStore();
  const route = useRoute();
  const router = useRouter();

  // Computed properties
  const { isSuperAdmin, userDepartment, user } = authStore;

  const availableMenus = computed(() => {
    if (isSuperAdmin) {
      // Super Admin sees all departments
      return menusByDepartment;
    } else if (userDepartment) {
      // Regular users see only their department, excluding super admin only items
      const filteredMenus = {};
      Object.keys(menusByDepartment).forEach((dept) => {
        const departmentMenus = menusByDepartment[dept].filter((menu) => {
          // Exclude super admin only items
          if (menu.superAdminOnly) return false;

          // Exclude manager-only items for non-managers
          if (menu.managerOnly && user.role !== 'Manager') return false;

          return true;
        });
        if (departmentMenus.length > 0) {
          filteredMenus[dept] = departmentMenus;
        }
      });

      return userDepartment && filteredMenus[userDepartment]
        ? { [userDepartment]: filteredMenus[userDepartment] }
        : {};
    }
    return {};
  });

  const isActiveRoute = (menuRoute) => {
    return route.path === menuRoute || route.path.startsWith(menuRoute + '/');
  };

  // Methods
  const closeMobileMenu = () => {
    emit('close-mobile-menu');
  };

  const navigateToRoute = (menuRoute) => {
    router.push(menuRoute);
    closeMobileMenu();
  };

  const checkScreenSize = () => {
    if (window.innerWidth >= 1024 && props.isMobileMenuOpen) {
      // On desktop widths, ensure mobile sidebar is closed via parent
      emit('close-mobile-menu');
    }
  };

  // Logout function
  const logout = () => {
    authStore.logout();
    router.push('/login');
  };

  // Lifecycle
  onMounted(() => {
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', checkScreenSize);
  });
</script>

<style scoped>
  /* Custom scrollbar for sidebar */
  nav::-webkit-scrollbar {
    width: 4px;
  }

  nav::-webkit-scrollbar-track {
    background: transparent;
  }

  nav::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }

  nav::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* Collapse functionality - only rotate chevron icons */
  .collapse-toggle:checked ~ .collapse-title .chevron-icon {
    transform: rotate(180deg);
    transform-origin: center;
  }

  .collapse-toggle:checked ~ .collapse-content {
    max-height: 500px;
    opacity: 1;
  }

  .collapse-content {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  /* Ensure icons stay in place during collapse animation */
  .collapse-title svg:not(.chevron-icon) {
    flex-shrink: 0;
    transition: none;
  }

  /* Prevent layout shift during collapse */
  .collapse-title {
    will-change: transform;
    align-items: center;
  }

  /* Ensure stable positioning for icons */
  .collapse-title > div:first-child {
    display: flex;
    align-items: center;
    min-height: 20px;
    position: relative;
  }

  /* Fix for Menu Management icon movement */
  .collapse-title .w-5,
  .collapse-title .w-4:not(.chevron-icon) {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    transition: none;
  }

  /* Only rotate the chevron, not the main icon */
  .chevron-icon {
    position: static;
    transform: none;
    transition: transform 0.3s ease;
  }

  /* Ensure proper spacing for text */
  .collapse-title span {
    margin-left: 28px;
  }
</style>
