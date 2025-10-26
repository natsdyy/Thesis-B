<script setup>
  import { ref } from 'vue';
  import Sidebar from '../components/Sidebar.vue';
  import DashboardHeader from '../components/DashboardHeader.vue';
  import { useRoute } from 'vue-router';
  import { useThemeStore } from '../stores/themeStore';

  const route = useRoute();
  const themeStore = useThemeStore();

  // Mobile menu state
  const isMobileMenuOpen = ref(false);

  // Desktop sidebar toggle state
  const isDesktopSidebarVisible = ref(true);

  // Handle sidebar toggle for mobile
  const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
  };

  const closeMobileMenu = () => {
    isMobileMenuOpen.value = false;
  };

  // Handle desktop sidebar toggle
  const toggleDesktopSidebar = () => {
    isDesktopSidebarVisible.value = !isDesktopSidebarVisible.value;
  };
</script>

<template>
  <div
    :class="[
      'min-h-screen transition-colors duration-300',
      themeStore.themeClasses.mainBg,
    ]"
  >
    <!-- Sidebar -->
    <Sidebar
      :is-mobile-menu-open="isMobileMenuOpen"
      :is-desktop-sidebar-visible="isDesktopSidebarVisible"
      @close-mobile-menu="closeMobileMenu"
    />

    <!-- Main Content Area with proper margins -->
    <div
      :class="[
        'bg-accentColor transition-all duration-300',
        isDesktopSidebarVisible ? 'lg:pl-64' : 'lg:pl-0',
      ]"
    >
      <!-- Header -->
      <DashboardHeader
        :is-mobile-menu-open="isMobileMenuOpen"
        :is-desktop-sidebar-visible="isDesktopSidebarVisible"
        @toggle-sidebar="toggleMobileMenu"
        @toggle-desktop-sidebar="toggleDesktopSidebar"
      />

      <!-- Page Content -->
      <main
        :class="[
          'p-2 sm:p-4  md:p-6 transition-colors duration-300',
          themeStore.themeClasses.textPrimary,
        ]"
      >
        <RouterView />
      </main>
    </div>
  </div>
</template>
