<script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import axios from 'axios';
  import { apiConfig, getApiUrl } from '../config/api';

  // Only show loading on first paint; subsequent polls are silent
  const initialLoading = ref(true);
  const orders = ref([]);
  const timer = ref(null);

  // Branch selection strategy:
  // 1) Prefer branch_id from ?branch=ID in URL
  // 2) Fallback to localStorage current branch if present
  const urlParams = new URLSearchParams(window.location.search);
  const branchIdFromQuery = parseInt(urlParams.get('branch') || '0') || null;
  const branchIdFromStorage = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem('branchContext') || '{}');
      return saved?.currentBranch?.id || null;
    } catch {
      return null;
    }
  })();
  const branchId = branchIdFromQuery || branchIdFromStorage;

  const fetchQueue = async (opts = { silent: false }) => {
    if (!branchId) return;
    if (!opts.silent) initialLoading.value = true;
    try {
      const url = getApiUrl('/pos/queue');
      const params = new URLSearchParams();
      params.append('branch_id', String(branchId));
      params.append('limit', '120');
      const { data } = await axios.get(`${url}?${params.toString()}`, {
        baseURL: apiConfig.baseURL,
      });
      orders.value = Array.isArray(data?.data) ? data.data : [];
    } catch (e) {
      orders.value = [];
    } finally {
      initialLoading.value = false;
    }
  };

  const waiting = computed(() =>
    orders.value.filter((o) => o.status === 'pending')
  );
  const processing = computed(() =>
    orders.value.filter((o) => o.status === 'processing')
  );
  const preparing = computed(() => processing.value); // show all processing as Preparing

  // Track completed orders visibility window (30s)
  const completedVisible = ref({}); // key: order_number -> firstSeenAt (ms)
  const completedNow = computed(() => {
    const now = Date.now();
    return orders.value
      .filter((o) => o.status === 'completed')
      .filter((o) => {
        const key = o.order_number;
        if (!completedVisible.value[key]) {
          completedVisible.value[key] = now;
          return true;
        }
        return now - completedVisible.value[key] <= 30000; // 30s window
      });
  });

  // FIFO row for Preparing (pending + processing except first), oldest -> newest
  const preparingRow = computed(() => {
    const list = [...waiting.value, ...preparing.value];
    return list.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  });

  onMounted(() => {
    fetchQueue({ silent: false });
    timer.value = setInterval(() => fetchQueue({ silent: true }), 8000);
  });
  onUnmounted(() => {
    if (timer.value) clearInterval(timer.value);
  });
</script>

<template>
  <div class="min-h-screen w-full bg-base-200 p-6">
    <div class="max-w-[1800px] mx-auto">
      <div class="mb-6">
        <h1
          class="text-5xl md:text-6xl font-black tracking-tight text-primaryColor"
        >
          Now Serving
        </h1>
        <p class="text-gray-600 text-lg">
          Please watch the screen for your order number.
        </p>
      </div>

      <div v-if="initialLoading" class="py-16 flex justify-center">
        <span
          class="loading loading-spinner loading-lg text-primaryColor"
        ></span>
      </div>

      <!-- Two-column board: Preparing (left) | Please Collect (right) -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <!-- Preparing column: pending + processing (except first) -->
        <section>
          <div class="text-3xl md:text-4xl font-extrabold text-warning mb-4">
            Preparing...
          </div>
          <div
            class="flex flex-col gap-6 overflow-y-auto min-h-[140px] pr-4"
            aria-label="Preparing order numbers"
          >
            <span
              v-for="o in preparingRow"
              :key="o.order_number"
              class="px-6 py-3 rounded-xl bg-white/80 shadow font-mono text-3xl md:text-4xl text-gray-700"
              >{{ o.order_number }}</span
            >
            <span v-if="!preparingRow.length" class="text-gray-400 text-2xl"
              >—</span
            >
          </div>
        </section>

        <!-- Please Collect column: recently completed (30s window) -->
        <section>
          <div class="text-3xl md:text-4xl font-extrabold text-success mb-4">
            Please Collect
          </div>
          <div
            class="flex flex-col gap-6 overflow-y-auto min-h-[140px] pr-4"
            aria-label="Now serving order numbers"
          >
            <span
              v-for="o in completedNow"
              :key="o.order_number"
              class="px-8 py-5 rounded-2xl bg-success text-white shadow font-mono text-5xl md:text-6xl"
              >{{ o.order_number }}</span
            >
            <span v-if="!completedNow.length" class="text-gray-400 text-2xl"
              >—</span
            >
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
