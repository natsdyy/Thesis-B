<script setup>
  import { computed } from 'vue';
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
    labels: { type: Array, required: true },
    data: { type: Array, required: true },
    metric: { type: String, default: 'totalSales' },
  });

  const colorMap = {
    totalSales: '#2563eb',
    totalTransactions: '#f59e0b',
    averageTransaction: '#6b7280',
    refundedAmount: '#10b981',
    lossProfit: '#dc2626',
    totalDisposed: '#ea580c',
  };

  const labelMap = {
    totalSales: 'Total Sales',
    totalTransactions: 'Transactions',
    averageTransaction: 'Average Sale',
    refundedAmount: 'Refunded Amount',
    lossProfit: 'Loss Amount',
    totalDisposed: 'Disposed Items',
  };

  // Helpers for gradient background
  const hexToRgba = (hex, alpha = 1) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const chartData = computed(() => ({
    labels: props.labels,
    datasets: [
      {
        label: labelMap[props.metric] || 'Value',
        data: props.data,
        borderColor: colorMap[props.metric] || '#2563eb',
        borderWidth: 2,
        backgroundColor: (ctx) => {
          const color = colorMap[props.metric] || '#2563eb';
          const { chart } = ctx;
          const { ctx: canvasCtx, chartArea } = chart || {};
          if (!chartArea) return hexToRgba(color, 0.2);
          const gradient = canvasCtx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom
          );
          gradient.addColorStop(0, hexToRgba(color, 0.5));
          gradient.addColorStop(1, hexToRgba(color, 0.08));
          return gradient;
        },
        tension: 0.35,
        fill: 'origin',
        pointRadius: 2,
        pointHoverRadius: 4,
        pointBackgroundColor: colorMap[props.metric] || '#2563eb',
        cubicInterpolationMode: 'monotone',
      },
    ],
  }));

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
      tooltip: { mode: 'index', intersect: false },
      title: { display: false },
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
      x: { grid: { display: false } },
    },
  };
</script>

<template>
  <div style="height: 320px">
    <Line :data="chartData" :options="options" />
  </div>
</template>

<style scoped></style>
