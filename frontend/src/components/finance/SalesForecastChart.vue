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
    historical: { type: Array, required: true },
    forecast: { type: Array, required: true },
  });

  const chartData = computed(() => ({
    labels: props.labels,
    datasets: [
      {
        label: 'Historical Sales',
        data: props.historical,
        borderColor: '#466114',
        backgroundColor: 'rgba(70, 97, 20, 0.1)',
        borderWidth: 2,
        tension: 0.35,
        fill: 'origin',
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#466114',
        cubicInterpolationMode: 'monotone',
      },
      {
        label: 'Forecasted Sales',
        data: props.forecast,
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.35,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#dc2626',
        cubicInterpolationMode: 'monotone',
      },
    ],
  }));

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function (context) {
            const value = context.parsed.y;
            return `${context.dataset.label}: ₱${value.toLocaleString()}`;
          },
        },
      },
      title: { display: false },
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          callback: function (value) {
            return '₱' + value.toLocaleString();
          },
        },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
      x: {
        grid: { display: false },
        ticks: {
          maxTicksLimit: 10,
        },
      },
    },
  };
</script>

<template>
  <div style="height: 400px">
    <Line :data="chartData" :options="options" />
  </div>
</template>

<style scoped></style>
