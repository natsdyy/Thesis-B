<script setup>
  import { useAuthStore } from '../stores/authStore';
  import { LayoutDashboard, Users, TrendingUp, Package } from 'lucide-vue-next';

  const authStore = useAuthStore();
  const { user, isSuperAdmin } = authStore;

  const stats = [
    { title: 'Total Employees', value: '124', icon: Users, change: '+12%' },
    { title: 'Revenue', value: '$52,341', icon: TrendingUp, change: '+23%' },
    { title: 'Inventory Items', value: '1,234', icon: Package, change: '-3%' },
    {
      title: 'Active Projects',
      value: '18',
      icon: LayoutDashboard,
      change: '+5%',
    },
  ];
</script>

<template>
  <div class="container mx-auto p-6">
    <!-- Add role testing section -->
    <div class="alert alert-info mb-6">
      <div>
        <h3 class="font-bold">Current User:</h3>
        <p>Role: {{ user?.role || 'Not set' }}</p>
        <p>Department: {{ user?.department || 'None' }}</p>
        <p>Is Super Admin: {{ isSuperAdmin ? 'Yes' : 'No' }}</p>
      </div>
    </div>

    <!-- Test role switching buttons -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h2 class="card-title">Test User Roles</h2>
        <div class="flex gap-2 flex-wrap">
          <button
            @click="authStore.setMockUser('Super Admin')"
            class="btn btn-primary btn-sm"
          >
            Set Super Admin
          </button>
          <button
            @click="authStore.setMockUser('HR Manager')"
            class="btn btn-secondary btn-sm"
          >
            Set HR Manager
          </button>
          <button
            @click="authStore.setMockUser('SCM Staff')"
            class="btn btn-accent btn-sm"
          >
            Set SCM Staff
          </button>
        </div>
      </div>
    </div>

    <!-- Rest of your existing HomePage content -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold mb-2 text-secondaryColor">
        Welcome to Dashboard
      </h1>
      <p class="text-base-content/70">
        {{
          isSuperAdmin
            ? 'You have admin access to all departments.'
            : `Welcome to the ${user?.department || 'company'} dashboard.`
        }}
      </p>
    </div>

    <!-- Your existing dashboard content here -->
  </div>
</template>
