<script setup>
  import { computed, ref } from 'vue';
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
  } from 'chart.js';
  import { Chart } from 'vue-chartjs';

  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  );

  const props = defineProps({
    data: {
      type: Object,
      required: true,
      default: () => ({
        labels: [],
        revenue: [],
        cogs: [],
        grossProfit: [],
        operatingExpenses: [],
        netIncome: [],
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
          type: 'bar',
          label: 'Revenue',
          data: props.data.revenue || [],
          backgroundColor: 'rgba(70, 97, 20, 0.6)',
          borderColor: 'rgba(70, 97, 20, 1)',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          type: 'bar',
          label: 'COGS',
          data: props.data.cogs || [],
          backgroundColor: 'rgba(220, 38, 38, 0.6)',
          borderColor: 'rgba(220, 38, 38, 1)',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          type: 'bar',
          label: 'Operating Expenses',
          data: props.data.operatingExpenses || [],
          backgroundColor: 'rgba(245, 158, 11, 0.6)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: 'Gross Profit',
          data: props.data.grossProfit || [],
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: 'rgba(37, 99, 235, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: 'Net Income',
          data: props.data.netIncome || [],
          backgroundColor: 'rgba(147, 51, 234, 0.1)',
          borderColor: 'rgba(147, 51, 234, 1)',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: 'rgba(147, 51, 234, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          yAxisID: 'y',
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
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, index) => ({
              text: dataset.label,
              fillStyle: dataset.backgroundColor,
              strokeStyle: dataset.borderColor,
              lineWidth: dataset.borderWidth,
              pointStyle: dataset.type === 'line' ? 'circle' : 'rect',
              hidden: !chart.isDatasetVisible(index),
            }));
          },
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
            return `${ctx.dataset.label}: ${value}`;
          },
          title: (ctx) => {
            return ctx[0].label;
          },
          afterBody: (ctx) => {
            if (ctx.length > 0) {
              const revenue =
                ctx.find((c) => c.dataset.label === 'Revenue')?.parsed?.y || 0;
              const netIncome =
                ctx.find((c) => c.dataset.label === 'Net Income')?.parsed?.y ||
                0;

              if (revenue > 0) {
                const netMargin = ((netIncome / revenue) * 100).toFixed(2);
                const grossProfit =
                  ctx.find((c) => c.dataset.label === 'Gross Profit')?.parsed
                    ?.y || 0;
                const grossMargin = ((grossProfit / revenue) * 100).toFixed(2);

                return [
                  '',
                  `Gross Margin: ${grossMargin}%`,
                  `Net Margin: ${netMargin}%`,
                ];
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
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.06)',
          borderDash: [4, 4],
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
      point: {
        hoverBackgroundColor: 'rgba(70, 97, 20, 1)',
        hoverBorderColor: '#fff',
        hoverBorderWidth: 3,
      },
    },
  }));

  // Calculate summary metrics
  const summaryMetrics = computed(() => {
    if (!props.data || !props.data.revenue || props.data.revenue.length === 0) {
      return null;
    }

    const totalRevenue = props.data.revenue.reduce(
      (sum, val) => sum + Number(val),
      0
    );
    const totalGrossProfit = props.data.grossProfit.reduce(
      (sum, val) => sum + Number(val),
      0
    );
    const totalNetIncome = props.data.netIncome.reduce(
      (sum, val) => sum + Number(val),
      0
    );

    const avgGrossMargin =
      totalRevenue > 0
        ? ((totalGrossProfit / totalRevenue) * 100).toFixed(1)
        : 0;
    const avgNetMargin =
      totalRevenue > 0 ? ((totalNetIncome / totalRevenue) * 100).toFixed(1) : 0;

    return {
      totalRevenue,
      totalGrossProfit,
      totalNetIncome,
      avgGrossMargin,
      avgNetMargin,
    };
  });
</script>

<template>
  <div class="card bg-white shadow-lg h-full">
    <div class="card-body">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg text-gray-800">Profit Margin Analysis</h3>
        <div class="text-sm text-gray-500" v-if="summaryMetrics">
          Avg Net Margin: {{ summaryMetrics.avgNetMargin }}%
        </div>
      </div>

      <div
        :style="{
          height: typeof height === 'number' ? height + 'px' : String(height),
          position: 'relative',
        }"
      >
        <template v-if="data && data.labels && data.labels.length > 0">
          <Chart type="bar" :data="chartData" :options="options" />
        </template>
        <template v-else>
          <div class="flex items-center justify-center h-full text-gray-500">
            <div class="text-center">
              <div class="text-4xl mb-2">📊</div>
              <p>No profit margin data available</p>
              <p class="text-sm">
                Select a different period or check your data
              </p>
            </div>
          </div>
        </template>
      </div>

      <!-- Summary metrics -->
      <div v-if="summaryMetrics" class="mt-4 grid grid-cols-2 gap-4">
        <div class="p-3 bg-success/10 rounded-lg">
          <p class="text-sm text-success">Average Gross Margin</p>
          <p class="text-lg font-bold text-success">
            {{ summaryMetrics.avgGrossMargin }}%
          </p>
          <p class="text-xs text-success">
            ₱{{ formatNumber(summaryMetrics.totalGrossProfit) }}
          </p>
        </div>
        <div class="p-3 bg-info/10 rounded-lg">
          <p class="text-sm text-info">Average Net Margin</p>
          <p class="text-lg font-bold text-info">
            {{ summaryMetrics.avgNetMargin }}%
          </p>
          <p class="text-xs text-info">
            ₱{{ formatNumber(summaryMetrics.totalNetIncome) }}
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

  /* Legend styling */
  :deep(.chart-legend) {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  :deep(.chart-legend-item) {
    display: flex;
    align-items: center;
    gap: 5px;
  }
</style>
