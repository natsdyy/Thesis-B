<script setup>
  import { ref } from 'vue';
  const props = defineProps({ branchId: { type: Number, default: 0 } });

  const loading = ref(false);
  const horizon = ref('30'); // days
  const forecasts = ref([]);

  // TODO: Replace with real forecasting data once available
</script>

<template>
  <div class="card bg-white shadow border border-black/10">
    <div class="card-body">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-medium text-gray-700">Cash Flow Forecast</h3>
        <select
          class="select select-bordered select-xs"
          v-model="horizon"
          disabled
        >
          <option value="7">7 days</option>
          <option value="14">14 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
        </select>
      </div>
      <div v-if="loading" class="flex justify-center py-8">
        <div class="loading loading-spinner loading-md text-primaryColor"></div>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="table w-full text-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Projected Inflow</th>
              <th>Projected Outflow</th>
              <th>Projected Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!forecasts.length">
              <td colspan="4" class="text-center text-gray-500">
                No forecast available
              </td>
            </tr>
            <tr v-for="(f, idx) in forecasts" :key="idx">
              <td>{{ f.date }}</td>
              <td>₱{{ Number(f.inflow || 0).toLocaleString() }}</td>
              <td>₱{{ Number(f.outflow || 0).toLocaleString() }}</td>
              <td>₱{{ Number(f.balance || 0).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
