<template>
  <div class="container mx-auto p-6">
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold mb-2 text-secondaryColor">
        Admin Dashboard
      </h1>
      <p class="text-base-content/70">
        System administration and management overview
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Stats cards -->
      <div class="stats shadow">
        <div class="stat">
          <div class="stat-figure text-primary">
            <Users class="w-8 h-8" />
          </div>
          <div class="stat-title">Total Users</div>
          <div class="stat-value text-primary">150</div>
          <div class="stat-desc">Active system users</div>
        </div>
      </div>

      <div class="stats shadow">
        <div class="stat">
          <div class="stat-figure text-secondary">
            <UserCog class="w-8 h-8" />
          </div>
          <div class="stat-title">Total Roles</div>
          <div class="stat-value text-secondary">12</div>
          <div class="stat-desc">Defined user roles</div>
        </div>
      </div>

      <div class="stats shadow">
        <div class="stat">
          <div class="stat-figure text-accent">
            <Building2 class="w-8 h-8" />
          </div>
          <div class="stat-title">Departments</div>
          <div class="stat-value text-accent">5</div>
          <div class="stat-desc">Active departments</div>
        </div>
      </div>

      <div class="stats shadow">
        <div class="stat">
          <div class="stat-figure text-warning">
            <MapPin class="w-8 h-8" />
          </div>
          <div class="stat-title">Branches</div>
          <div class="stat-value text-warning">{{ branchStats.active_branches || 0 }}</div>
          <div class="stat-desc">Active branches</div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="mt-8">
      <h2 class="text-2xl font-bold mb-4">Quick Actions</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <router-link
          to="/admin/users"
          class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
        >
          <div class="card-body items-center text-center">
            <Users class="w-12 h-12 text-primary mb-2" />
            <h3 class="card-title">Manage Users</h3>
            <p class="text-sm text-base-content/70">
              Add, edit, or remove users
            </p>
          </div>
        </router-link>

        <router-link
          to="/admin/roles"
          class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
        >
          <div class="card-body items-center text-center">
            <UserCog class="w-12 h-12 text-secondary mb-2" />
            <h3 class="card-title">Manage Roles</h3>
            <p class="text-sm text-base-content/70">
              Configure user roles and permissions
            </p>
          </div>
        </router-link>

        <router-link
          to="/admin/branches"
          class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
        >
          <div class="card-body items-center text-center">
            <MapPin class="w-12 h-12 text-warning mb-2" />
            <h3 class="card-title">Manage Branches</h3>
            <p class="text-sm text-base-content/70">
              Add and manage organization branches
            </p>
          </div>
        </router-link>

        <router-link
          to="/admin/settings"
          class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
        >
          <div class="card-body items-center text-center">
            <Settings class="w-12 h-12 text-accent mb-2" />
            <h3 class="card-title">System Settings</h3>
            <p class="text-sm text-base-content/70">
              Configure system preferences
            </p>
          </div>
        </router-link>

        <div class="card bg-base-100 shadow-xl">
          <div class="card-body items-center text-center">
            <BarChart3 class="w-12 h-12 text-info mb-2" />
            <h3 class="card-title">Reports</h3>
            <p class="text-sm text-base-content/70">View system reports</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import {
    Users,
    UserCog,
    Settings,
    Building2,
    BarChart3,
    MapPin,
  } from 'lucide-vue-next'
  import { useBranchStore } from '../../stores/branchStore'

  const branchStore = useBranchStore()
  const branchStats = ref({
    active_branches: 0,
    total_branches: 0,
    inactive_branches: 0,
    total_users_in_branches: 0
  })

  const loadBranchStats = async () => {
    try {
      const stats = await branchStore.fetchBranchStats()
      branchStats.value = stats
    } catch (error) {
      console.error('Failed to load branch statistics:', error)
    }
  }

  onMounted(() => {
    loadBranchStats()
  })
</script>
