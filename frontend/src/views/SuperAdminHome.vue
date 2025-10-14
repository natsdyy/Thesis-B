<script setup>
  import { ref, onMounted, watch, computed } from 'vue';
  import {
    LayoutDashboard,
    PhilippinePeso,
    TrendingUp,
    TrendingDown,
    Building2,
    AlertTriangle,
    CheckCircle,
  } from 'lucide-vue-next';
  import SalesAnalytics from '../components/finance/SalesAnalytics.vue';
  import MenuRemittedInventory from '../components/finance/MenuRemittedInventory.vue';
  import CrmAnalytics from './crm/Analytics.vue';
  import ExecutiveOverview from '../components/admin/ExecutiveOverview.vue';
  import {
    getCurrentPhilippineTime,
    createPhilippineDate,
  } from '../utils/timezoneUtils.js';
  import { useFinanceBalanceStore } from '../stores/financeBalanceStore.js';
  import { useBranchContextStore } from '../stores/branchContextStore.js';
  import { useExecutiveStore } from '../stores/executiveStore.js';

  const isLoading = ref(false);
  const activeTab = ref('overview');
  const period = ref('month'); // today | week | month | customMonth
  const customMonth = ref(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  const executiveStore = useExecutiveStore();
  const financeBalanceStore = useFinanceBalanceStore();
  const branchContext = useBranchContextStore();

  // Use data from executive store
  const kpis = computed(() => executiveStore.kpis);
  const topBranches = computed(() => executiveStore.topBranches);
  const alerts = computed(() => executiveStore.alerts);

  // Placeholder analytics props for nested components
  const analyticsLoading = ref(false);
  const analyticsData = ref({
    labels: [],
    remitted: [],
    refunds: [],
    disposed: [],
    net: [],
  });

  function getDateRange() {
    const now = getCurrentPhilippineTime();
    const build = (start, end) => ({ start, end });
    if (period.value === 'today') {
      const start = createPhilippineDate(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        0,
        0,
        0
      );
      const end = createPhilippineDate(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        23,
        59,
        59
      );
      return build(start, end);
    }
    if (period.value === 'week') {
      const jsDay = now.getDay();
      const daysSinceMonday = (jsDay + 6) % 7;
      const startTmp = new Date(now);
      startTmp.setDate(now.getDate() - daysSinceMonday);
      const start = createPhilippineDate(
        startTmp.getFullYear(),
        startTmp.getMonth() + 1,
        startTmp.getDate(),
        0,
        0,
        0
      );
      const end = createPhilippineDate(
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        23,
        59,
        59
      );
      return build(start, end);
    }
    if (period.value === 'customMonth') {
      const ym = String(customMonth.value || '').trim();
      const [yStr, mStr] = ym.split('-');
      const year = Number(yStr);
      const monthIndex = Number(mStr) - 1;
      const start = createPhilippineDate(year, monthIndex + 1, 1, 0, 0, 0);
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      const end = createPhilippineDate(
        year,
        monthIndex + 1,
        lastDay,
        23,
        59,
        59
      );
      return build(start, end);
    }
    // default this month
    const start = createPhilippineDate(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
      0,
      0,
      0
    );
    const end = createPhilippineDate(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
      23,
      59,
      59
    );
    return build(start, end);
  }

  const loadData = async () => {
    isLoading.value = true;
    try {
      // Fetch all executive data from the API
      await executiveStore.fetchAllData(period.value, customMonth.value);

      // Optionally align Cash on Hand with finance totals
      try {
        if (!branchContext.currentBranch) {
          await branchContext.initializeBranchContext();
        }
      } catch {}
      try {
        await financeBalanceStore.fetchTotals();
        const totals = financeBalanceStore.totals || {};
        if (Number.isFinite(Number(totals.total_balance))) {
          // Update cash on hand in KPIs if needed
          executiveStore.kpis.cashOnHand = Number(totals.total_balance);
        }
      } catch {}
    } catch (error) {
      console.error('Error loading executive data:', error);
    } finally {
      isLoading.value = false;
    }
  };

  onMounted(loadData);

  // React to date filter changes (placeholder reload for future API wiring)
  watch(period, () => loadData());
  watch(customMonth, () => {
    if (period.value === 'customMonth') loadData();
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-primaryColor">
          Executive Dashboard
        </h1>
        <p class="text-gray-600 mt-1">Company-wide overview</p>
      </div>
      <!-- Date Filters -->
      <div class="flex items-center gap-2">
        <select v-model="period" class="select select-bordered select-xs">
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="customMonth">Custom Month</option>
        </select>
        <input
          v-if="period === 'customMonth'"
          type="month"
          class="input input-bordered input-xs"
          v-model="customMonth"
        />
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed w-full">
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'overview' }"
        @click="activeTab = 'overview'"
        >Overview</a
      >
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'sales' }"
        @click="activeTab = 'sales'"
        >Sales Analytics</a
      >
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'inventory' }"
        @click="activeTab = 'inventory'"
        >Menu Inventory Demand</a
      >
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'crm' }"
        @click="activeTab = 'crm'"
        >CRM Analytics</a
      >
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="text-center">
        <div class="loading loading-spinner loading-lg text-primaryColor"></div>
        <p class="mt-2 text-gray-600">Loading executive metrics...</p>
      </div>
    </div>

    <div v-else class="space-y-6">
      <!-- OVERVIEW TAB -->
      <div v-show="activeTab === 'overview'" class="space-y-6">
        <ExecutiveOverview
          :kpis="kpis"
          :topBranches="topBranches"
          :alerts="alerts"
          :period="period"
          :customMonth="customMonth"
        />
      </div>

      <!-- SALES ANALYTICS TAB -->
      <div v-show="activeTab === 'sales'" class="space-y-6">
        <SalesAnalytics
          :analyticsData="analyticsData"
          :loading="analyticsLoading"
        />
      </div>

      <!-- MENU INVENTORY DEMAND TAB -->
      <div v-show="activeTab === 'inventory'" class="space-y-6">
        <MenuRemittedInventory :loading="analyticsLoading" />
      </div>

      <!-- CRM ANALYTICS TAB -->
      <div v-show="activeTab === 'crm'" class="space-y-6">
        <CrmAnalytics />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
