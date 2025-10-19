<script setup>
  import { Home, ArrowLeft, AlertCircle } from 'lucide-vue-next';
  import { useAuthStore } from '../stores/authStore';
  import { computed } from 'vue';

  const authStore = useAuthStore();

  // Get user's appropriate home route based on role and department
  const homeRoute = computed(() => {
    const { userRole, userDepartment } = authStore;

    // Super Admin goes to executive dashboard
    if (userRole === 'Super Admin') {
      return '/super-admin';
    }

    // Branch users go to branch dashboard
    if (userDepartment === 'Branch') {
      return '/branch/dashboard';
    }

    // For department staff, redirect to their attendance page
    // For department managers, redirect to their dashboard
    const isManager = userRole === 'Manager';
    const departmentRoutes = {
      'Human Resource': isManager ? '/hr/dashboard' : '/hr/attendance',
      Finance: isManager ? '/finance/dashboard' : '/finance/attendance',
      SCM: isManager ? '/scm/dashboard' : '/scm/attendance',
      Production: isManager
        ? '/production/dashboard'
        : '/production/attendance',
      CRM: isManager ? '/crm/dashboard' : '/crm/attendance',
      System: '/admin/dashboard',
    };

    return departmentRoutes[userDepartment] || '/dashboard';
  });

  // Get user-friendly home button text
  const homeButtonText = computed(() => {
    const { userRole, userDepartment } = authStore;

    if (userRole === 'Super Admin') {
      return 'Executive Dashboard';
    }

    if (userDepartment === 'Branch') {
      return 'Branch Dashboard';
    }

    if (userRole === 'Manager') {
      return `${userDepartment} Dashboard`;
    }

    return `${userDepartment} Attendance`;
  });
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-base-200">
    <div class="text-center max-w-md mx-auto px-4">
      <!-- 404 Icon and Number -->
      <div class="mb-8">
        <div class="flex justify-center mb-4">
          <AlertCircle class="w-24 h-24 text-error" />
        </div>
        <h1 class="text-8xl font-bold text-error mb-2">404</h1>
      </div>

      <!-- Error Message -->
      <div class="mb-8">
        <h2 class="text-2xl font-semibold mb-4 text-base-content">
          Page Not Found
        </h2>
        <p class="text-base-content/70 mb-2">
          The page you're looking for doesn't exist or you don't have permission
          to access it.
        </p>
        <p class="text-sm text-base-content/60">This could be due to:</p>
        <ul class="text-sm text-base-content/60 mt-2 space-y-1">
          <li>• Incorrect URL</li>
          <li>• Insufficient permissions</li>
          <li>• Page moved or deleted</li>
        </ul>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <RouterLink :to="homeRoute" class="btn bg-primaryColor text-white hover:bg-primaryColor/90 font-thin">
          <Home class="w-4 h-4 mr-2" />
          {{ homeButtonText }}
        </RouterLink>

        <button @click="$router.go(-1)" class="btn btn-outline btn-secondaryColor font-thin">
          <ArrowLeft class="w-4 h-4 mr-2" />
          Go Back
        </button>
      </div>

      <!-- User Info (if logged in) -->
      <div
        v-if="authStore.isAuthenticated"
        class="mt-8 p-4 bg-base-100 rounded-lg border"
      >
        <p class="text-sm text-base-content/60">
          Logged in as:
          <span class="font-medium"
            >{{ authStore.user?.first_name }}
            {{ authStore.user?.last_name }}</span
          >
        </p>
        <p class="text-xs text-base-content/50">
          Role: {{ authStore.userRole }} • Department:
          {{ authStore.userDepartment }}
        </p>
      </div>
    </div>
  </div>
</template>
