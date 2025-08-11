<script setup>
  import { ref } from 'vue';
  import Sidebar from '../components/Sidebar.vue';
  import DashboardHeader from '../components/DashboardHeader.vue';
  import { useRoute } from 'vue-router';

  const route = useRoute();

  // Mobile menu state
  const isMobileMenuOpen = ref(false);

  // Handle sidebar toggle for mobile
  const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
  };

  const closeMobileMenu = () => {
    isMobileMenuOpen.value = false;
  };
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Content Area with proper margins -->
    <div class="lg:pl-64">
      <!-- Header -->
      <DashboardHeader />

      <!-- Page Content -->
      <main class="p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
