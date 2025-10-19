<script setup>
  import { computed, ref, watch } from 'vue';
  import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
  } from 'chart.js';
  import { Line } from 'vue-chartjs';

  ChartJS.register(
    CategoryScale,
    LinearScale,
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
      default: () => ({ labels: [], datasets: [] }),
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
    console.log('RevenueTrendChart received data:', props.data);

    if (!props.data || !props.data.labels || !props.data.datasets) {
      console.log('RevenueTrendChart: No data or missing labels/datasets');
      return {
        labels: [],
        datasets: [],
      };
    }

    // Ensure datasets have proper formatting
    const formattedDatasets = props.data.datasets.map((dataset) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || 'rgba(70, 97, 20, 0.1)',
      borderColor: dataset.borderColor || 'rgba(70, 97, 20, 1)',
      pointBackgroundColor:
        dataset.pointBackgroundColor || 'rgba(70, 97, 20, 1)',
      pointBorderColor: dataset.pointBorderColor || '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 3,
      fill: true,
      tension: 0.4,
    }));

    return {
      labels: props.data.labels,
      datasets: formattedDatasets,
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
          boxWidth: 10,
          boxHeight: 10,
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
            return `${ctx.dataset.label}: ${value}`;
          },
          title: (ctx) => {
            return ctx[0].label;
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

  // Gradient fill plugin
  const gradientPlugin = {
    id: 'revenueGradient',
    beforeDraw: (chart) => {
      const { ctx, chartArea } = chart;
      if (!chartArea) return;

      const gradient = ctx.createLinearGradient(
        0,
        chartArea.bottom,
        0,
        chartArea.top
      );
      gradient.addColorStop(0, 'rgba(70, 97, 20, 0.1)');
      gradient.addColorStop(1, 'rgba(70, 97, 20, 0.3)');

      // Apply gradient to the first dataset if it exists
      if (chart.data.datasets[0]) {
        chart.data.datasets[0].backgroundColor = gradient;
      }
    },
  };
</script>

<template>
  <div class="card bg-white shadow-lg h-full">
    <div class="card-body">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg text-gray-800">Revenue Trend</h3>
        <div class="text-sm text-gray-500">
          <template v-if="data && data.labels && data.labels.length > 0">
            {{ data.labels.length }} data points
          </template>
        </div>
      </div>

      <div
        :style="{
          height: typeof height === 'number' ? height + 'px' : String(height),
          position: 'relative',
        }"
      >
        <template v-if="data && data.labels && data.labels.length > 0">
          <Line
            :data="chartData"
            :options="options"
            :plugins="[gradientPlugin]"
          />
        </template>
        <template v-else>
          <div class="flex items-center justify-center h-full text-gray-500">
            <div class="text-center">
              <div class="text-4xl mb-2">📈</div>
              <p>No revenue data available</p>
              <p class="text-sm">
                Select a different period or check your data
              </p>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .card {
    border-radius: 12px;
  }

  /* Custom scrollbar for tooltip if needed */
  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(70, 97, 20, 0.3);
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(70, 97, 20, 0.5);
  }
</style>
