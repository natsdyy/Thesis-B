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
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
    </div>
  </div>
</template>
