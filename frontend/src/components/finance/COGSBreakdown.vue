<template>
  <div class="cogs-breakdown">
    <div v-if="loading" class="flex items-center justify-center p-8">
      <span class="loading loading-spinner loading-lg"></span>
      <span class="ml-3">Loading COGS breakdown...</span>
    </div>

    <div v-else-if="error" class="alert alert-error">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{{ error }}</span>
    </div>

    <div v-else>
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="stat bg-base-200 rounded-lg shadow">
          <div class="stat-title">Total COGS</div>
          <div class="stat-value text-2xl">
            ₱{{ formatCurrency(totalCOGS) }}
          </div>
          <div class="stat-desc">{{ period }}</div>
        </div>

        <div class="stat bg-base-200 rounded-lg shadow">
          <div class="stat-title">COGS Ratio</div>
          <div class="stat-value text-2xl">{{ cogsRatio }}%</div>
          <div class="stat-desc">of revenue</div>
        </div>

        <div class="stat bg-base-200 rounded-lg shadow">
          <div class="stat-title">Gross Profit</div>
          <div class="stat-value text-2xl">
            ₱{{ formatCurrency(grossProfit) }}
          </div>
          <div class="stat-desc">Revenue - COGS</div>
        </div>

        <div class="stat bg-base-200 rounded-lg shadow">
          <div class="stat-title">Gross Margin</div>
          <div class="stat-value text-2xl">{{ grossMargin }}%</div>
          <div class="stat-desc">Profitability</div>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <h2 class="card-title mb-4">COGS by Menu Category</h2>

          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Category</th>
                  <th class="text-right">Quantity Sold</th>
                  <th class="text-right">Unit Cost</th>
                  <th class="text-right">Total COGS</th>
                  <th class="text-right">% of Total</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="category in sortedCategories" :key="category.name">
                  <td>
                    <div class="flex items-center gap-2">
                      <div
                        class="w-3 h-3 rounded-full"
                        :style="{ backgroundColor: category.color }"
                      ></div>
                      {{ category.name }}
                    </div>
                  </td>
                  <td class="text-right">{{ category.quantity }}</td>
                  <td class="text-right">
                    ₱{{ formatCurrency(category.unitCost) }}
                  </td>
                  <td class="text-right font-semibold">
                    ₱{{ formatCurrency(category.totalCOGS) }}
                  </td>
                  <td class="text-right">
                    {{ ((category.totalCOGS / totalCOGS) * 100).toFixed(1) }}%
                  </td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div
                        class="w-24 h-2 bg-base-300 rounded-full overflow-hidden"
                      >
                        <div
                          class="h-full transition-all"
                          :style="{
                            width: `${(category.totalCOGS / totalCOGS) * 100}%`,
                            backgroundColor: category.color,
                          }"
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="font-bold">
                  <td>Total</td>
                  <td class="text-right">{{ totalQuantity }}</td>
                  <td class="text-right">-</td>
                  <td class="text-right">₱{{ formatCurrency(totalCOGS) }}</td>
                  <td class="text-right">100%</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Top Menu Items by COGS -->
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <h2 class="card-title mb-4">Top Menu Items by COGS</h2>

          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Menu Item</th>
                  <th class="text-right">Quantity</th>
                  <th class="text-right">Unit Cost</th>
                  <th class="text-right">Total COGS</th>
                  <th class="text-right">Avg Selling Price</th>
                  <th class="text-right">Profit Margin</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in topMenuItems"
                  :key="item.id"
                  :class="{
                    'bg-success/10': item.profitMargin > 50,
                    'bg-warning/10':
                      item.profitMargin > 30 && item.profitMargin <= 50,
                    'bg-error/10': item.profitMargin <= 30,
                  }"
                >
                  <td>
                    <div
                      class="badge badge-primary badge-sm"
                      :class="{
                        'badge-success': index === 0,
                        'badge-warning': index === 1,
                        'badge-info': index === 2,
                      }"
                    >
                      #{{ index + 1 }}
                    </div>
                  </td>
                  <td>{{ item.name }}</td>
                  <td class="text-right">{{ item.quantity }}</td>
                  <td class="text-right">
                    ₱{{ formatCurrency(item.unitCost) }}
                  </td>
                  <td class="text-right font-semibold">
                    ₱{{ formatCurrency(item.totalCOGS) }}
                  </td>
                  <td class="text-right">
                    ₱{{ formatCurrency(item.avgSellingPrice) }}
                  </td>
                  <td class="text-right">
                    <span
                      class="badge badge-sm"
                      :class="{
                        'badge-success': item.profitMargin > 50,
                        'badge-warning':
                          item.profitMargin > 30 && item.profitMargin <= 50,
                        'badge-error': item.profitMargin <= 30,
                      }"
                    >
                      {{ item.profitMargin.toFixed(1) }}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- COGS Distribution Chart -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">COGS Distribution by Category</h2>
          <div class="h-64">
            <canvas ref="chartCanvas"></canvas>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { Chart, registerables } from 'chart.js';

  Chart.register(...registerables);

  const props = defineProps({
    categories: {
      type: Array,
      default: () => [],
    },
    menuItems: {
      type: Array,
      default: () => [],
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    period: {
      type: String,
      default: 'month',
    },
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: null,
    },
  });

  const chartCanvas = ref(null);
  let chartInstance = null;

  const totalCOGS = computed(() => {
    return props.categories.reduce((sum, cat) => sum + cat.totalCOGS, 0);
  });

  const totalQuantity = computed(() => {
    return props.categories.reduce((sum, cat) => sum + cat.quantity, 0);
  });

  const cogsRatio = computed(() => {
    if (props.totalRevenue === 0) return 0;
    return ((totalCOGS.value / props.totalRevenue) * 100).toFixed(1);
  });

  const grossProfit = computed(() => {
    return props.totalRevenue - totalCOGS.value;
  });

  const grossMargin = computed(() => {
    if (props.totalRevenue === 0) return 0;
    return ((grossProfit.value / props.totalRevenue) * 100).toFixed(1);
  });

  const sortedCategories = computed(() => {
    return [...props.categories].sort((a, b) => b.totalCOGS - a.totalCOGS);
  });

  const topMenuItems = computed(() => {
    return [...props.menuItems]
      .sort((a, b) => b.totalCOGS - a.totalCOGS)
      .slice(0, 10);
  });

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const updateChart = () => {
    if (!chartCanvas.value) return;

    // Destroy existing chart
    if (chartInstance) {
      chartInstance.destroy();
    }

    const labels = sortedCategories.value.map((cat) => cat.name);
    const cogsData = sortedCategories.value.map((cat) => cat.totalCOGS);
    const colors = sortedCategories.value.map((cat) => cat.color);

    chartInstance = new Chart(chartCanvas.value, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'COGS',
            data: cogsData,
            backgroundColor: colors,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `₱${formatCurrency(context.parsed.y)}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return `₱${formatCurrency(value)}`;
              },
            },
          },
        },
      },
    });
  };

  watch(
    () => props.categories,
    () => {
      updateChart();
    },
    { deep: true }
  );

  onMounted(() => {
    updateChart();
  });
</script>

<style scoped>

</style>
