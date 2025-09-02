<script setup>
  import { Clock, Users, DollarSign, TrendingUp } from 'lucide-vue-next';

  const hrStats = [
    {
      title: 'Total Employees',
      value: '124',
      icon: Users,
      change: '+3 this month',
    },
    {
      title: 'Present Today',
      value: '118',
      icon: Clock,
      change: '95% attendance',
    },
    {
      title: 'Payroll Total',
      value: '$58,240',
      icon: DollarSign,
      change: 'This month',
    },
    {
      title: 'Performance',
      value: '4.2/5',
      icon: TrendingUp,
      change: 'Average rating',
    },
  ];
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold">HR Dashboard</h1>
      <div class="text-sm text-base-content/70">
        Last updated: {{ new Date().toLocaleDateString() }}
      </div>
    </div>

    <!-- HR Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div
        v-for="stat in hrStats"
        :key="stat.title"
        class="stat bg-base-100 shadow-lg rounded-lg"
      >
        <div class="stat-figure text-secondary">
          <component :is="stat.icon" class="w-8 h-8" />
        </div>
        <div class="stat-title">{{ stat.title }}</div>
        <div class="stat-value text-secondary">{{ stat.value }}</div>
        <div class="stat-desc">{{ stat.change }}</div>
      </div>
    </div>

    <!-- Quick Actions for HR -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Recent Activities</h2>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span>John Doe checked in</span>
              <span class="text-sm text-base-content/70">9:15 AM</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Sarah Smith requested leave</span>
              <span class="text-sm text-base-content/70">8:45 AM</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Payroll processed</span>
              <span class="text-sm text-base-content/70">Yesterday</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Pending Tasks</h2>
          <div class="space-y-3">
            <div class="flex items-center">
              <input type="checkbox" class="checkbox checkbox-sm mr-3" />
              <span>Review leave applications</span>
            </div>
            <div class="flex items-center">
              <input type="checkbox" class="checkbox checkbox-sm mr-3" />
              <span>Update employee profiles</span>
            </div>
            <div class="flex items-center">
              <input
                type="checkbox"
                class="checkbox checkbox-sm mr-3"
                checked
              />
              <span class="line-through text-base-content/50"
                >Process payroll</span
              >
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title">Quick Actions</h2>
          <div class="space-y-3">
            <router-link 
              to="/hr/attendance" 
              class="btn btn-primary btn-sm w-full"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
              </svg>
              Manage Attendance
            </router-link>
            
            <router-link 
              to="/hr/employee-attendance" 
              class="btn btn-outline btn-sm w-full"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Employee Attendance
            </router-link>
            
            <router-link 
              to="/hr/employee" 
              class="btn btn-outline btn-sm w-full"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
              </svg>
              Employee Management
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
