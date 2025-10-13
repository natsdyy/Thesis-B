<script setup>
  import { ref, onMounted, watch } from 'vue';
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

  const isLoading = ref(false);
  const activeTab = ref('overview');
  const period = ref('month'); // today | week | month | customMonth
  const customMonth = ref(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  // Executive KPIs (placeholders; replace with real services when ready)
  const kpis = ref({
    todaySales: 0,
    mtdSales: 0,
    grossMarginPct: 0,
    cashOnHand: 0,
    activeBranches: 0,
    salesTrendDeltaPct: 0,
    payrollMtd: 0,
    pendingPayrollApprovals: 0,
  });

  // Top branches (placeholder data)
  const topBranches = ref([]);

  // Alerts (placeholder)
  const alerts = ref([]);

  // Placeholder analytics props for nested components
  const analyticsLoading = ref(false);
  const analyticsData = ref({
    labels: [],
    remitted: [],
    refunds: [],
    disposed: [],
    net: [],
  });

  const financeBalanceStore = useFinanceBalanceStore();
  const branchContext = useBranchContextStore();

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
      // TODO: Replace with analyticsService/finance APIs
      await new Promise((r) => setTimeout(r, 500));
      kpis.value = {
        todaySales: 154200.5,
        mtdSales: 2885400.75,
        grossMarginPct: 42.3,
        cashOnHand: 920000.0,
        activeBranches: 5,
        salesTrendDeltaPct: 7.8,
        payrollMtd: 812345.67,
        pendingPayrollApprovals: 2,
      };
      topBranches.value = [
        { name: 'Imus', sales: 612340.12, aov: 356.2, growth: 9.1, oos: 2 },
        { name: 'Tanza', sales: 598122.32, aov: 341.7, growth: 6.3, oos: 1 },
        { name: 'Kawit', sales: 521889.5, aov: 329.5, growth: 4.5, oos: 0 },
        {
          name: 'Gen. Trias',
          sales: 489221.87,
          aov: 312.1,
          growth: 3.2,
          oos: 3,
        },
        { name: 'Bacoor', sales: 471004.3, aov: 318.8, growth: 2.6, oos: 1 },
      ];
      alerts.value = [
        {
          type: 'inventory',
          text: 'Low stock: Beef Steak (Imus, Tanza)',
          level: 'warning',
        },
        {
          type: 'approval',
          text: '3 budget releases pending approval',
          level: 'info',
        },
        {
          type: 'cash',
          text: 'Cash movement pending confirmation (Finance)',
          level: 'info',
        },
      ];
      // systemHealth removed per request

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
          kpis.value.cashOnHand = Number(totals.total_balance);
        }
      } catch {}
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
