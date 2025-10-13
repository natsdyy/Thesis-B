<template>
  <div class="expense-breakdown">
    <div v-if="loading" class="flex items-center justify-center p-8">
      <span class="loading loading-spinner loading-lg"></span>
      <span class="ml-3">Loading expense breakdown...</span>
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
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="stat bg-base-200 rounded-lg shadow">
          <div class="stat-title">Total Expenses</div>
          <div class="stat-value text-2xl">
            ₱{{ formatCurrency(totalExpenses) }}
          </div>
          <div class="stat-desc">{{ period }}</div>
        </div>

        <div class="stat bg-base-200 rounded-lg shadow">
          <div class="stat-title">Largest Category</div>
          <div class="stat-value text-2xl">
            {{ topCategory?.name || 'N/A' }}
          </div>
          <div class="stat-desc">
            ₱{{ formatCurrency(topCategory?.amount || 0) }}
          </div>
        </div>

        <div class="stat bg-base-200 rounded-lg shadow">
          <div class="stat-title">Expense Ratio</div>
          <div class="stat-value text-2xl">{{ expenseRatio }}%</div>
          <div class="stat-desc">of revenue</div>
        </div>
      </div>

      <!-- Expense Categories Table -->
      <div class="card bg-base-100 shadow-xl mb-6">
        <div class="card-body">
          <h2 class="card-title mb-4">Expense Categories</h2>

          <div class="overflow-x-auto">
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th>Category</th>
                  <th class="text-right">Amount</th>
                  <th class="text-right">% of Total</th>
                  <th>Trend</th>
                  <th>Details</th>
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
                  <td class="text-right font-semibold">
                    ₱{{ formatCurrency(category.amount) }}
                  </td>
                  <td class="text-right">
                    {{ ((category.amount / totalExpenses) * 100).toFixed(1) }}%
                  </td>
                  <td>
                    <div class="flex items-center gap-2">
                      <div
                        class="w-24 h-2 bg-base-300 rounded-full overflow-hidden"
                      >
                        <div
                          class="h-full transition-all"
                          :style="{
                            width: `${(category.amount / totalExpenses) * 100}%`,
                            backgroundColor: category.color,
                          }"
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <button
                      class="btn btn-ghost btn-xs"
                      @click="showCategoryDetails(category)"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="font-bold">
                  <td>Total</td>
                  <td class="text-right">
                    ₱{{ formatCurrency(totalExpenses) }}
                  </td>
                  <td class="text-right">100%</td>
                  <td></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Category Breakdown Chart -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">Expense Distribution</h2>
          <div class="h-64">
            <canvas ref="chartCanvas"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Details Modal -->
    <dialog ref="detailsModal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          {{ selectedCategory?.name }} Details
        </h3>

        <div v-if="selectedCategory" class="space-y-4">
          <div class="stat bg-base-200 rounded-lg">
            <div class="stat-title">Total Amount</div>
            <div class="stat-value text-2xl">
              ₱{{ formatCurrency(selectedCategory.amount) }}
            </div>
            <div class="stat-desc">
              {{
                ((selectedCategory.amount / totalExpenses) * 100).toFixed(1)
              }}% of total expenses
            </div>
          </div>

          <div
            v-if="selectedCategory.items && selectedCategory.items.length > 0"
          >
            <h4 class="font-semibold mb-2">Transaction Details</h4>
            <div class="overflow-x-auto">
              <table class="table table-xs">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th class="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(item, index) in selectedCategory.items"
                    :key="index"
                  >
                    <td>{{ formatDate(item.date) }}</td>
                    <td>{{ item.description }}</td>
                    <td class="text-right">
                      ₱{{ formatCurrency(item.amount) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn" @click="closeModal">Close</button>
        </div>
      </div>
    </dialog>
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
    period: {
      type: String,
      default: 'month',
    },
    totalRevenue: {
      type: Number,
      default: 0,
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
  const detailsModal = ref(null);
  const selectedCategory = ref(null);
  let chartInstance = null;

  const totalExpenses = computed(() => {
    return props.categories.reduce((sum, cat) => sum + cat.amount, 0);
  });

  const topCategory = computed(() => {
    if (props.categories.length === 0) return null;
    return props.categories.reduce((top, cat) =>
      cat.amount > top.amount ? cat : top
    );
  });

  const expenseRatio = computed(() => {
    if (props.totalRevenue === 0) return 0;
    return ((totalExpenses.value / props.totalRevenue) * 100).toFixed(1);
  });

  const sortedCategories = computed(() => {
    return [...props.categories].sort((a, b) => b.amount - a.amount);
  });

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const showCategoryDetails = (category) => {
    selectedCategory.value = category;
    detailsModal.value.showModal();
  };

  const closeModal = () => {
    detailsModal.value.close();
  };

  const updateChart = () => {
    if (!chartCanvas.value) return;

    // Destroy existing chart
    if (chartInstance) {
      chartInstance.destroy();
    }

    const labels = sortedCategories.value.map((cat) => cat.name);
    const amounts = sortedCategories.value.map((cat) => cat.amount);
    const colors = sortedCategories.value.map((cat) => cat.color);

    chartInstance = new Chart(chartCanvas.value, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: amounts,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const percentage = (
                  (value / totalExpenses.value) *
                  100
                ).toFixed(1);
                return `${label}: ₱${formatCurrency(value)} (${percentage}%)`;
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
