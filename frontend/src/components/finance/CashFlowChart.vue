<script setup>
  import { computed, ref } from 'vue';
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
  } from 'chart.js';
  import { Bar } from 'vue-chartjs';

  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
  );

  const props = defineProps({
    data: {
      type: Object,
      required: true,
      default: () => ({
        labels: [],
        operating: [],
        investing: [],
        financing: [],
        netCashFlow: [],
      }),
    },
    height: {
      type: [Number, String],
      default: 300,
    },
    showLegend: {
      type: Boolean,
      default: true,
    },
  });

  const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;
  const formatNumber = (n) => Number(n || 0).toLocaleString();

  const chartData = computed(() => {
    if (!props.data || !props.data.labels || props.data.labels.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    return {
      labels: props.data.labels,
      datasets: [
        {
          label: 'Operating Activities',
          data: props.data.operating || [],
          backgroundColor: 'rgba(70, 97, 20, 0.7)',
          borderColor: 'rgba(70, 97, 20, 1)',
          borderWidth: 1,
          stack: 'cashflow',
        },
      ],
    };
  });

  const options = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: props.showLegend,
        position: 'top',
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(70, 97, 20, 1)',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            const value = peso(ctx.parsed.y);
            const sign = Number(ctx.parsed.y) >= 0 ? '+' : '';
            return `${ctx.dataset.label}: ${sign}${value}`;
          },
          title: (ctx) => {
            return ctx[0].label;
          },
          footer: (ctx) => {
            if (ctx.length > 0 && props.data.netCashFlow) {
              const index = ctx[0].dataIndex;
              const netFlow = props.data.netCashFlow[index];
              if (netFlow !== undefined) {
                const sign = Number(netFlow) >= 0 ? '+' : '';
                return `Net Cash Flow: ${sign}${peso(netFlow)}`;
              }
            }
            return [];
          },
        },
      },
      title: {
        display: false,
      },
    },
    layout: {
      padding: {
        top: 10,
        right: 15,
        left: 10,
        bottom: 10,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
          maxTicksLimit: 8,
        },
      },
      y: {
        display: true,
        beginAtZero: false, // Allow negative values for cash flow
        grid: {
          color: 'rgba(0,0,0,0.06)',
          borderDash: [4, 4],
          drawBorder: false,
        },
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
          precision: 0,
          callback: (value) => {
            if (Number(value) >= 1000000) {
              return `${(Number(value) / 1000000).toFixed(1)}M`;
            } else if (Number(value) >= 1000) {
              return `${(Number(value) / 1000).toFixed(0)}k`;
            }
            return value;
          },
        },
      },
    },
    elements: {
      bar: {
        borderRadius: 2,
        borderSkipped: false,
      },
    },
  }));

  // Calculate cash flow summary
  const cashFlowSummary = computed(() => {
    if (!props.data || !props.data.operating) return null;

    const totalOperating = props.data.operating.reduce(
      (sum, val) => sum + Number(val),
      0
    );
    const totalNetFlow = totalOperating;

    return {
      totalOperating,
      totalNetFlow,
      operatingPositive: totalOperating > 0,
      netFlowPositive: totalNetFlow > 0,
    };
  });

  // Get cash flow trend
  const cashFlowTrend = computed(() => {
    if (
      !props.data ||
      !props.data.netCashFlow ||
      props.data.netCashFlow.length < 2
    ) {
      return 'stable';
    }

    const flows = props.data.netCashFlow.map(Number);
    const first = flows[0];
    const last = flows[flows.length - 1];

    if (last > first * 1.1) return 'improving';
    if (last < first * 0.9) return 'declining';
    return 'stable';
  });
</script>

<template>
  <div class="card bg-white shadow-lg h-full">
    <div class="card-body">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg text-gray-800">Cash Flow Analysis</h3>
        <div class="flex items-center gap-2" v-if="cashFlowSummary">
          <div
            class="px-2 py-1 rounded-full text-xs font-medium"
            :class="{
              'bg-success/10 text-success': cashFlowSummary.netFlowPositive,
              'bg-error/10 text-error': !cashFlowSummary.netFlowPositive,
            }"
          >
            {{ cashFlowSummary.netFlowPositive ? 'Positive' : 'Negative' }}
          </div>
          <div
            class="px-2 py-1 rounded-full text-xs font-medium"
            :class="{
              'bg-blue-100 text-blue-800': cashFlowTrend === 'improving',
              'bg-red-100 text-red-800': cashFlowTrend === 'declining',
              'bg-gray-100 text-gray-800': cashFlowTrend === 'stable',
            }"
          >
            {{ cashFlowTrend }}
          </div>
        </div>
      </div>

      <div
        :style="{
          height: typeof height === 'number' ? height + 'px' : String(height),
          position: 'relative',
        }"
      >
        <template v-if="data && data.labels && data.labels.length > 0">
          <Bar :data="chartData" :options="options" />
        </template>
        <template v-else>
          <div class="flex items-center justify-center h-full text-gray-500">
            <div class="text-center">
              <div class="text-4xl mb-2"><font-awesome-icon icon="fa-solid fa-peso-sign" /></div>
              <p>No cash flow data available</p>
              <p class="text-sm">
                Select a different period or check your data
              </p>
            </div>
          </div>
        </template>
      </div>

      <!-- Cash flow summary -->
      <div v-if="cashFlowSummary" class="mt-4 grid grid-cols-2 gap-3">
        <div
          class="p-3 rounded-lg"
          :class="
            cashFlowSummary.operatingPositive ? 'bg-success/10' : 'bg-error/10'
          "
        >
          <p
            class="text-sm"
            :class="
              cashFlowSummary.operatingPositive ? 'text-success' : 'text-error'
            "
          >
            Operating Activities
          </p>
          <p
            class="text-lg font-bold flex items-center gap-1"
            :class="
              cashFlowSummary.operatingPositive ? 'text-success' : 'text-error'
            "
          >
            <span>{{ cashFlowSummary.operatingPositive ? '+' : '' }}</span>
            <font-awesome-icon icon="fa-solid fa-peso-sign" />
            <span>{{ formatNumber(cashFlowSummary.totalOperating) }}</span>
          </p>
        </div>

        <div
          class="p-3 rounded-lg"
          :class="
            cashFlowSummary.netFlowPositive ? 'bg-success/10' : 'bg-error/10'
          "
        >
          <p
            class="text-sm"
            :class="
              cashFlowSummary.netFlowPositive ? 'text-success' : 'text-error'
            "
          >
            Net Cash Flow
          </p>
          <p
            class="text-lg font-bold flex items-center gap-1"
            :class="
              cashFlowSummary.netFlowPositive ? 'text-success' : 'text-error'
            "
          >
            <span>{{ cashFlowSummary.netFlowPositive ? '+' : '' }}</span>
            <font-awesome-icon icon="fa-solid fa-peso-sign" />
            <span>{{ formatNumber(cashFlowSummary.totalNetFlow) }}</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .card {
    border-radius: 12px;
  }

  /* Custom hover effects */
  :deep(.chartjs-render-monitor) {
    transition: transform 0.2s ease;
  }

  :deep(.chartjs-render-monitor):hover {
    transform: scale(1.01);
  }

  /* Bar styling */
  :deep(.chartjs-bar) {
    transition: all 0.2s ease;
  }

  :deep(.chartjs-bar):hover {
    transform: translateY(-2px);
  }
</style>
