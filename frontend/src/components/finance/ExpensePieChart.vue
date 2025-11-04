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
    // Optional: Raw expense data for "other" expenses breakdown
    rawExpenses: {
      type: Array,
      default: () => [],
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
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(70, 97, 20, 1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 12,
        },
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            const labelText = `${label}: ${peso(value)} (${percentage}%)`;

            // Check if this is Utilities category and we have breakdown data
            const labelLower = label.toLowerCase().trim();
            const isUtilities =
              labelLower === 'utilities' || labelLower.includes('utilities');

            if (isUtilities && utilitiesBreakdown.value) {
              const breakdown = utilitiesBreakdown.value;
              const breakdownLines = [];

              // Add breakdown lines for each utility type that has an amount
              if (breakdown.electricity > 0) {
                const utilPercentage = (
                  (breakdown.electricity / value) *
                  100
                ).toFixed(1);
                breakdownLines.push(
                  `  • Electricity: ${peso(breakdown.electricity)} (${utilPercentage}%)`
                );
              }
              if (breakdown.water > 0) {
                const utilPercentage = (
                  (breakdown.water / value) *
                  100
                ).toFixed(1);
                breakdownLines.push(
                  `  • Water: ${peso(breakdown.water)} (${utilPercentage}%)`
                );
              }
              if (breakdown.internet > 0) {
                const utilPercentage = (
                  (breakdown.internet / value) *
                  100
                ).toFixed(1);
                breakdownLines.push(
                  `  • Internet: ${peso(breakdown.internet)} (${utilPercentage}%)`
                );
              }
              if (breakdown.other > 0) {
                const utilPercentage = (
                  (breakdown.other / value) *
                  100
                ).toFixed(1);
                breakdownLines.push(
                  `  • Other: ${peso(breakdown.other)} (${utilPercentage}%)`
                );
              }

              if (breakdownLines.length > 0) {
                return [labelText, '', 'Breakdown:', ...breakdownLines];
              }
            }

            return labelText;
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

  // Get breakdown of utilities expenses (electricity, water, internet, other)
  const utilitiesBreakdown = computed(() => {
    if (!props.rawExpenses || props.rawExpenses.length === 0) return {};

    const breakdown = {
      electricity: 0,
      water: 0,
      internet: 0,
      other: 0,
    };

    props.rawExpenses.forEach((expense) => {
      const expenseType = expense.expense_type?.toLowerCase();
      const amount = Number(expense.amount || 0);

      if (expenseType === 'electricity') {
        breakdown.electricity += amount;
      } else if (expenseType === 'water') {
        breakdown.water += amount;
      } else if (expenseType === 'internet') {
        breakdown.internet += amount;
      } else if (expenseType === 'other') {
        breakdown.other += amount;
      }
    });

    return breakdown;
  });

  // Get breakdown of "other" expenses
  const otherExpensesBreakdown = computed(() => {
    if (!props.rawExpenses || props.rawExpenses.length === 0) return [];

    // Filter expenses with expense_type === "other"
    const otherExpenses = props.rawExpenses.filter(
      (expense) => expense.expense_type === 'other'
    );

    // Group and aggregate by description (if available)
    const breakdownMap = {};

    otherExpenses.forEach((expense) => {
      const description =
        expense.expense_description ||
        expense.department ||
        expense.entity_name ||
        'Unspecified';
      const amount = Number(expense.amount || 0);

      if (breakdownMap[description]) {
        breakdownMap[description].amount += amount;
        breakdownMap[description].count += 1;
      } else {
        breakdownMap[description] = {
          description: description,
          amount: amount,
          count: 1,
          branch: expense.branch_name || expense.entity_name || 'Main Office',
        };
      }
    });

    // Convert to array and sort by amount (descending)
    return Object.values(breakdownMap).sort((a, b) => b.amount - a.amount);
  });

  // Check if "other" category exists in chart data
  const hasOtherCategory = computed(() => {
    if (!props.data || props.data.length === 0) return false;
    const otherCategory = props.data.find((item) => {
      const nameLower = item.name.toLowerCase().trim();
      return (
        nameLower === 'other' ||
        nameLower.includes('other') ||
        nameLower === 'others' ||
        nameLower.includes('others')
      );
    });
    return !!otherCategory;
  });

  // Get total "other" expenses amount from chart data
  const otherTotalAmount = computed(() => {
    if (!hasOtherCategory.value) return 0;
    const otherCategory = props.data.find((item) => {
      const nameLower = item.name.toLowerCase().trim();
      return (
        nameLower === 'other' ||
        nameLower.includes('other') ||
        nameLower === 'others' ||
        nameLower.includes('others')
      );
    });
    return otherCategory ? Number(otherCategory.amount || 0) : 0;
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
              <div class="text-4xl mb-2">
                <font-awesome-icon icon="fa-solid fa-money-bills" />
              </div>
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

      <!-- Other Expenses Breakdown -->
      <div
        v-if="hasOtherCategory && otherExpensesBreakdown.length > 0"
        class="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200"
      >
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-semibold text-gray-800 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Other Expenses Breakdown
          </h4>
          <div class="text-right">
            <p class="text-sm text-gray-600">
              Total:
              <span class="font-bold text-blue-700">{{
                peso(otherTotalAmount)
              }}</span>
            </p>
          </div>
        </div>

        <div class="space-y-2 max-h-48 overflow-y-auto">
          <div
            v-for="(item, index) in otherExpensesBreakdown"
            :key="index"
            class="bg-white rounded-md p-3 border border-blue-100 hover:border-blue-300 transition-colors"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-800 text-sm mb-1">
                  {{ item.description }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ item.branch }}
                  <span v-if="item.count > 1" class="ml-2">
                    ({{ item.count }} entries)
                  </span>
                </p>
              </div>
              <div class="ml-3 text-right flex-shrink-0">
                <p class="font-bold text-blue-700 text-sm">
                  {{ peso(item.amount) }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ ((item.amount / otherTotalAmount) * 100).toFixed(1) }}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="otherExpensesBreakdown.length === 0"
          class="text-center py-4 text-gray-500 text-sm"
        >
          No detailed breakdown available for other expenses
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
