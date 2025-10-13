<script setup>
  import {
    PhilippinePeso,
    TrendingUp,
    TrendingDown,
    Building2,
    LayoutDashboard,
    AlertTriangle,
    CheckCircle,
  } from 'lucide-vue-next';

  const props = defineProps({
    kpis: { type: Object, required: true },
    topBranches: { type: Array, default: () => [] },
    alerts: { type: Array, default: () => [] },
  });
</script>

<template>
  <div class="space-y-6">
    <!-- KPI Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">Today Sales</div>
            <PhilippinePeso class="w-4 h-4 text-primaryColor" />
          </div>
          <div class="text-2xl font-bold">
            ₱{{
              Number(props.kpis.todaySales || 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
            }}
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">MTD Sales</div>
            <LayoutDashboard class="w-4 h-4 text-primaryColor" />
          </div>
          <div class="text-2xl font-bold">
            ₱{{
              Number(props.kpis.mtdSales || 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
            }}
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">Gross Margin</div>
            <TrendingUp class="w-4 h-4 text-primaryColor" />
          </div>
          <div class="text-2xl font-bold">
            {{ Number(props.kpis.grossMarginPct || 0).toFixed(1) }}%
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">Active Branches</div>
            <Building2 class="w-4 h-4 text-primaryColor" />
          </div>
          <div class="text-2xl font-bold">{{ props.kpis.activeBranches }}</div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">Payroll MTD</div>
            <PhilippinePeso class="w-4 h-4 text-primaryColor" />
          </div>
          <div class="text-2xl font-bold">
            ₱{{
              Number(props.kpis.payrollMtd || 0).toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })
            }}
          </div>
        </div>
      </div>

      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">Payroll Approvals</div>
            <LayoutDashboard class="w-4 h-4 text-primaryColor" />
          </div>
          <div class="text-2xl font-bold">
            {{ props.kpis.pendingPayrollApprovals }}
          </div>
        </div>
      </div>
    </div>

    <!-- Sales Trend Delta -->
    <div class="card bg-white shadow-lg">
      <div class="card-body">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-500">Sales Trend (Δ last 7 days)</div>
          <component
            :is="
              (props.kpis.salesTrendDeltaPct || 0) >= 0
                ? TrendingUp
                : TrendingDown
            "
            class="w-4 h-4"
            :class="
              (props.kpis.salesTrendDeltaPct || 0) >= 0
                ? 'text-green-600'
                : 'text-red-600'
            "
          />
        </div>
        <div
          class="text-2xl font-bold"
          :class="
            (props.kpis.salesTrendDeltaPct || 0) >= 0
              ? 'text-green-700'
              : 'text-red-700'
          "
        >
          {{ (props.kpis.salesTrendDeltaPct || 0) >= 0 ? '+' : ''
          }}{{ Number(props.kpis.salesTrendDeltaPct || 0).toFixed(1) }}%
        </div>
        <div class="text-xs text-gray-500">Full chart coming soon</div>
      </div>
    </div>

    <!-- Top Branches -->
    <div class="card bg-white shadow-lg">
      <div class="card-body">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-lg">Top Branch Performance</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Branch</th>
                <th class="text-right">Sales</th>
                <th class="text-right">AOV</th>
                <th class="text-right">Growth</th>
                <th class="text-right">OOS</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in props.topBranches" :key="b.name">
                <td>{{ b.name }}</td>
                <td class="text-right">
                  ₱{{
                    Number(b.sales || 0).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })
                  }}
                </td>
                <td class="text-right">₱{{ Number(b.aov || 0).toFixed(1) }}</td>
                <td
                  class="text-right"
                  :class="
                    (b.growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  "
                >
                  {{ Number(b.growth || 0).toFixed(1) }}%
                </td>
                <td class="text-right">{{ b.oos || 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Alerts -->
    <div class="card bg-white shadow-lg">
      <div class="card-body">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-lg">Alerts</h3>
        </div>
        <div class="space-y-2">
          <div
            v-for="(a, idx) in props.alerts"
            :key="idx"
            class="flex items-start gap-2 p-3 rounded-lg"
            :class="a.level === 'warning' ? 'bg-orange-50' : 'bg-gray-50'"
          >
            <AlertTriangle
              v-if="a.level === 'warning'"
              class="w-4 h-4 text-orange-600 mt-0.5"
            />
            <CheckCircle v-else class="w-4 h-4 text-green-600 mt-0.5" />
            <span class="text-sm text-gray-700">{{ a.text }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
