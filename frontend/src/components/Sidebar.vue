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
        props.isDesktopSidebarVisible
          ? 'lg:translate-x-0'
          : 'lg:-translate-x-full',
        'lg:fixed lg:z-40',
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
              >
                <div class="flex items-center space-x-3">
                  <div
                    class="w-5 flex items-center justify-center flex-shrink-0"
                  >
                    <component
                      :is="departmentIcons[department]"
                      class="w-5 h-5 text-white"
                    />
                  </div>
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
                        >
                          <div class="flex items-center space-x-3">
                            <div
                              class="w-4 flex items-center justify-center flex-shrink-0"
                            >
                              <component
                                :is="menu.icon"
                                class="w-4 h-4 text-white"
                              />
                            </div>
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
                        <div
                          class="w-4 flex items-center justify-center flex-shrink-0"
                        >
                          <component
                            :is="menu.icon"
                            class="w-4 h-4 text-white"
                          />
                        </div>
                        <span>{{ menu.name }}</span>
                      </button>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Regular User View: Clean direct menu items -->
        <template v-else>
          <div class="space-y-1">
            <!-- Iterate through all menus for the user's department -->
            <template
              v-for="(menus, department) in availableMenus"
              :key="department"
            >
              <template v-for="menu in menus" :key="menu.route">
                <!-- Check if this menu has sub-items -->
                <div v-if="menu.subItems && menu.subItems.length > 0">
                  <div class="collapse">
                    <input
                      type="checkbox"
                      class="collapse-toggle opacity-0 absolute"
                      :id="`collapse-${menu.name.replace(/\s+/g, '-')}`"
                    />
                    <label
                      :for="`collapse-${menu.name.replace(/\s+/g, '-')}`"
                      class="collapse-title px-2 py-2.5 cursor-pointer hover:bg-white/10 rounded-lg transition-colors duration-200 flex items-center justify-between min-h-0"
                    >
                      <div class="flex items-center space-x-3">
                        <div
                          class="w-5 flex items-center justify-center flex-shrink-0"
                        >
                          <component
                            :is="menu.icon"
                            class="w-5 h-5 text-white"
                          />
                        </div>
                        <span class="text-white text-sm font-medium">{{
                          menu.name
                        }}</span>
                      </div>
                      <ChevronDown
                        class="w-4 h-4 text-white/60 transition-transform duration-200 chevron-icon"
                      />
                    </label>

                    <!-- Sub-menu items -->
                    <div class="collapse-content px-0 pb-0">
                      <div class="ml-8 space-y-1 mt-1">
                        <button
                          v-for="subItem in menu.subItems"
                          :key="subItem.route"
                          @click="navigateToRoute(subItem.route)"
                          :class="[
                            'w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-xs',
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
                      'w-full flex items-center space-x-3 px-2 py-2.5 rounded-lg transition-all duration-200 text-left',
                      isActiveRoute(menu.route)
                        ? 'bg-white/20 text-white font-medium'
                        : 'text-white/80 hover:bg-white/10 hover:text-white',
                    ]"
                  >
                    <div
                      class="w-5 flex items-center justify-center flex-shrink-0"
                    >
                      <component :is="menu.icon" class="w-5 h-5 text-white" />
                    </div>
                    <span class="text-sm font-medium">{{ menu.name }}</span>
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
    isDesktopSidebarVisible: {
      type: Boolean,
      default: true,
    },
  });

  // Define emits
  const emit = defineEmits(['close-mobile-menu']);

  // Stores and router
  const authStore = useAuthStore();
  const route = useRoute();
  const router = useRouter();

  // Computed properties
  // Map department names for normalization (handles DB vs Route Meta differences)
  const departmentMapping = {
    'SUPPLY CHAIN': 'SCM',
    'CUSTOMER RELATIONSHIP': 'CRM',
    'ADMIN': 'ADMINISTRATION',
  };

  const normalizeDepartment = (dept) => {
    if (!dept) return null;
    const normalized = String(dept).trim().toUpperCase();
    return departmentMapping[normalized] || normalized;
  };

  const availableMenus = computed(() => {
    const { isSuperAdmin, isBoardDirector, isChairman, userDepartment, user } = authStore;

    // Super Admin (includes Chairman): see all departments except attendance items
    if (isSuperAdmin) {
      // Super Admin sees all departments EXCEPT any attendance-related items
      const filtered = {};
      Object.keys(menusByDepartment).forEach((dept) => {
        const items = menusByDepartment[dept].filter((menu) => {
          const isAttendanceByName = menu.name === 'My Attendance';
          const isAttendanceByRoute =
            typeof menu.route === 'string' &&
            /\/attendance(\b|\/)/.test(menu.route);
          const isEmployeeSchedulesByName = menu.name === 'Employee Schedules';
          const isEmployeeSchedulesByRoute =
            typeof menu.route === 'string' && menu.route === '/hr/schedules';
          return !(
            isAttendanceByName ||
            isAttendanceByRoute ||
            isEmployeeSchedulesByName ||
            isEmployeeSchedulesByRoute
          );
        });
        if (items.length > 0) {
          filtered[dept] = items;
        }
      });
      // If user is a board member, additionally tweak visibility
      if (isChairman || isBoardDirector) {
        const hrMenus = (filtered['Human Resource'] || []).map((menu) => {
          if (
            menu.name === 'Employee Management' &&
            Array.isArray(menu.subItems)
          ) {
            return {
              ...menu,
              subItems: menu.subItems.filter(
                (s) => s.name !== 'Schedules' && s.name !== 'Manage Employee'
              ),
            };
          }
          return menu;
        });
        if (hrMenus.length) filtered['Human Resource'] = hrMenus;

        // SCM: keep only Inventory; hide Supply Request, Purchase Order, GRN, Suppliers
        if (filtered['SCM']) {
          filtered['SCM'] = filtered['SCM'].filter(
            (menu) => menu.name === 'Inventory'
          );
          if (filtered['SCM'].length === 0) delete filtered['SCM'];
        }

        // Production: keep only Production Inventory; hide Menu Management and Recipe Management
        if (filtered['Production']) {
          filtered['Production'] = filtered['Production'].filter(
            (menu) => menu.name === 'Production Inventory'
          );
          if (filtered['Production'].length === 0)
            delete filtered['Production'];
        }

        // CRM: hide Customers Feedback for Board Members
        if (filtered['CRM']) {
          filtered['CRM'] = filtered['CRM'].filter(
            (menu) => menu.name !== 'Customers Feedback'
          );
          if (filtered['CRM'].length === 0) delete filtered['CRM'];
        }
      }
      return filtered;
    } else if (isBoardDirector || isChairman) {
      // Board Members (Chairman and Board of Directors)
      // Board Directors can only access Administration menus from Executive Dashboard to Branch Management
      const adminMenus = (menusByDepartment['Administration'] || []).filter(
        (menu) => {
          // Allow Executive Dashboard, Financial Statement, Organizational Chart, Branch Management
          const allowedRoutes = [
            '/super-admin',
            '/super-admin/financial-statement',
            '/admin/organizational-chart',
            '/admin/branch-manager',
          ];
          const isAllowed = allowedRoutes.includes(menu.route);
          const isEmployeeSchedules =
            menu.name === 'Employee Schedules' ||
            menu.route === '/hr/schedules';
          return isAllowed && !isEmployeeSchedules;
        }
      );

      const result = {};
      if (adminMenus.length) result['Administration'] = adminMenus;
      // Board Directors should NOT see Human Resource or any other departments
      return result;
    } else if (userDepartment) {
      // Regular users see only their department, excluding super admin only items
      const filteredMenus = {};
      const normUserDept = normalizeDepartment(userDepartment);

      Object.keys(menusByDepartment).forEach((dept) => {
        const normDept = normalizeDepartment(dept);

        const departmentMenus = menusByDepartment[dept].filter((menu) => {
          // Exclude super admin only items
          if (menu.superAdminOnly) return false;

          // Exclude manager-only items for non-managers
          // Allow 'Admin' role (departmental admins) to see manager items
          if (
            menu.managerOnly &&
            user?.role !== 'Manager' &&
            user?.role !== 'Admin'
          )
            return false;

          // Hide attendance for Administration (no attendance for admins)
          if (
            normDept === 'ADMINISTRATION' &&
            (menu.name === 'My Attendance' ||
              (typeof menu.route === 'string' &&
                /\/attendance(\b|\/)/.test(menu.route)))
          ) {
            return false;
          }

          return true;
        });

        if (departmentMenus.length > 0) {
          filteredMenus[normDept] = departmentMenus;
        }
      });

      return normUserDept && filteredMenus[normUserDept]
        ? { [normUserDept]: filteredMenus[normUserDept] }
        : {};
    }
    return {};
  });

  const isActiveRoute = (menuRoute) => {
    // Exact match
    if (route.path === menuRoute) {
      return true;
    }

    // Check if current path starts with menu route followed by a slash
    // This ensures we don't match parent routes when on a child route
    if (route.path.startsWith(menuRoute + '/')) {
      // Get all menu routes to check for more specific matches
      const allMenuRoutes = [];
      Object.values(availableMenus.value).forEach((menus) => {
        menus.forEach((menu) => {
          if (menu.route) allMenuRoutes.push(menu.route);
          if (menu.subItems) {
            menu.subItems.forEach((subItem) => {
              if (subItem.route) allMenuRoutes.push(subItem.route);
            });
          }
        });
      });

      // Check if there's a more specific route that also matches
      const hasMoreSpecificMatch = allMenuRoutes.some((otherRoute) => {
        return (
          otherRoute !== menuRoute &&
          route.path.startsWith(otherRoute) &&
          otherRoute.length > menuRoute.length
        );
      });

      // Only highlight if there's no more specific match
      return !hasMoreSpecificMatch;
    }

    return false;
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

  /* Ensure stable positioning for icons */
  .collapse-title {
    display: flex;
    align-items: center;
  }

  /* Only rotate the chevron, not the main icon */
  .chevron-icon {
    transition: transform 0.3s ease;
  }
</style>
