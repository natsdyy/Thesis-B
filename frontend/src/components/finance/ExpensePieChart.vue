<script setup>
  import { computed, ref } from 'vue';
  import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
  import { Pie } from 'vue-chartjs';

  ChartJS.register(ArcElement, Tooltip, Legend);

  const props = defineProps({
    data: {
      type: Array,
      required: true,
      default: () => [],
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

  // Predefined color palette for expense categories
  const colorPalette = [
    'rgba(70, 97, 20, 0.8)', // Primary green
    'rgba(220, 38, 38, 0.8)', // Red
    'rgba(37, 99, 235, 0.8)', // Blue
    'rgba(245, 158, 11, 0.8)', // Yellow
    'rgba(139, 69, 19, 0.8)', // Brown
    'rgba(147, 51, 234, 0.8)', // Purple
    'rgba(236, 72, 153, 0.8)', // Pink
    'rgba(20, 184, 166, 0.8)', // Teal
    'rgba(251, 146, 60, 0.8)', // Orange
    'rgba(75, 85, 99, 0.8)', // Gray
  ];

  const peso = (n) => `₱${Number(n || 0).toLocaleString()}`;

  const chartData = computed(() => {
    console.log('ExpensePieChart received data:', props.data);

    if (!props.data || props.data.length === 0) {
      console.log('ExpensePieChart: No data or empty array');
      return {
        labels: [],
        datasets: [],
      };
    }

    // Sort data by amount (descending) and take top 8 categories
    const sortedData = [...props.data]
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 8);

    const labels = sortedData.map((item) => item.name);
    const amounts = sortedData.map((item) => Number(item.amount));
    const colors = colorPalette.slice(0, sortedData.length);

    return {
      labels,
      datasets: [
        {
          data: amounts,
          backgroundColor: colors.map((color) => color.replace('0.8', '0.6')),
          borderColor: colors.map((color) => color.replace('0.8', '1')),
          borderWidth: 2,
          hoverBackgroundColor: colors,
          hoverBorderColor: colors.map((color) => color.replace('0.8', '1')),
          hoverBorderWidth: 3,
        },
      ],
    };
  });

  const options = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: props.showLegend,
        position: 'right',
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          padding: 15,
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, index) => {
                const value = data.datasets[0].data[index];
                const percentage = (
                  (value / data.datasets[0].data.reduce((a, b) => a + b, 0)) *
                  100
                ).toFixed(1);
                return {
                  text: `${label}: ${percentage}%`,
                  fillStyle: data.datasets[0].backgroundColor[index],
                  strokeStyle: data.datasets[0].borderColor[index],
                  lineWidth: data.datasets[0].borderWidth,
                  pointStyle: 'circle',
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(70, 97, 20, 1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${peso(value)} (${percentage}%)`;
          },
          title: () => {
            return 'Expense Category';
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
        right: 10,
        left: 10,
        bottom: 10,
      },
    },
    elements: {
      arc: {
        borderWidth: 2,
        borderAlign: 'center',
      },
    },
    cutout: '50%', // Makes it a donut chart
    rotation: -90, // Start from top
    circumference: 360,
  }));

  // Calculate total expenses for display
  const totalExpenses = computed(() => {
    if (!props.data || props.data.length === 0) return 0;
    return props.data.reduce((sum, item) => sum + Number(item.amount), 0);
  });

  // Get top expense category
  const topCategory = computed(() => {
    if (!props.data || props.data.length === 0) return null;
    return props.data.reduce((max, item) =>
      Number(item.amount) > Number(max.amount) ? item : max
    );
  });
</script>

<template>
  <div class="card bg-white shadow-lg h-full">
    <div class="card-body">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg text-gray-800">Expense Breakdown</h3>
        <div class="text-sm text-gray-500">
          Total: {{ peso(totalExpenses) }}
        </div>
      </div>

      <div
        :style="{
          height: typeof height === 'number' ? height + 'px' : String(height),
          position: 'relative',
        }"
      >
        <template v-if="data && data.length > 0">
          <Pie :data="chartData" :options="options" />
        </template>
        <template v-else>
          <div class="flex items-center justify-center h-full text-gray-500">
            <div class="text-center">
              <div class="text-4xl mb-2">🥧</div>
              <p>No expense data available</p>
              <p class="text-sm">
                Select a different period or check your data
              </p>
            </div>
          </div>
        </template>
      </div>

      <!-- Top category info -->
      <div v-if="topCategory" class="mt-4 p-3 bg-gray-50 rounded-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Largest Expense Category</p>
            <p class="font-semibold text-gray-800">{{ topCategory.name }}</p>
          </div>
          <div class="text-right">
            <p class="text-lg font-bold text-primaryColor">
              {{ peso(topCategory.amount) }}
            </p>
            <p class="text-sm text-gray-500">
              {{
                ((Number(topCategory.amount) / totalExpenses) * 100).toFixed(1)
              }}% of total
            </p>
          </div>
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
    transform: scale(1.02);
  }
</style>
