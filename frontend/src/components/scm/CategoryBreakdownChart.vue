<template>
  <div class="chart-container">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  height: {
    type: String,
    default: '300px'
  }
});

const chartCanvas = ref(null);
let chart = null;

const colors = [
  'rgb(59, 130, 246)',   // Blue
  'rgb(239, 68, 68)',    // Red
  'rgb(16, 185, 129)',   // Green
  'rgb(245, 158, 11)',   // Yellow
  'rgb(139, 92, 246)',   // Purple
  'rgb(236, 72, 153)',   // Pink
  'rgb(34, 197, 94)',    // Emerald
  'rgb(251, 146, 60)',   // Orange
];

const createChart = () => {
  if (!chartCanvas.value || !props.data) return;

  const ctx = chartCanvas.value.getContext('2d');
  
  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: props.data.map(item => item.category) || [],
      datasets: [{
        data: props.data.map(item => item.consumption) || [],
        backgroundColor: colors.slice(0, props.data.length),
        borderColor: '#fff',
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: {
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(59, 130, 246, 0.5)',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      cutout: '60%'
    }
  });
};

const updateChart = () => {
  if (chart && props.data) {
    chart.data.labels = props.data.map(item => item.category) || [];
    chart.data.datasets[0].data = props.data.map(item => item.consumption) || [];
    chart.data.datasets[0].backgroundColor = colors.slice(0, props.data.length);
    chart.update();
  }
};

onMounted(() => {
  createChart();
});

onUnmounted(() => {
  if (chart) {
    chart.destroy();
  }
});

watch(() => props.data, updateChart, { deep: true });
</script>

<style scoped>
.chart-container {
  position: relative;
  height: v-bind(height);
  width: 100%;
}
</style>
