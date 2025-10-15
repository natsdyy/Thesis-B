<script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { usePOSStore } from '../../stores/posStore.js';
  import { useBranchContextStore } from '../../stores/branchContextStore.js';
  import { RefreshCcw, CheckCircle, Timer, Search } from 'lucide-vue-next';
  import { useCustomToast } from '../../composables/useCustomToast.js';

  const posStore = usePOSStore();
  const branchCtx = useBranchContextStore();
  const { showSuccess, showInfo, showError } = useCustomToast();

  const loading = ref(false);
  const orders = ref([]);
  const search = ref('');
  const statusFilter = ref('processing'); // pending_or_processing | pending | processing
  const autoTimer = ref(null);
  const lastOrderIds = ref(new Set());
  const newOrderIds = ref(new Set());
  const actionLoadingId = ref(null); // tracks which order action is in-flight
  const showConfirmComplete = ref(false);
  const orderToComplete = ref(null);

  const currentBranch = computed(() => branchCtx.currentBranch);

  const fetchKitchenOrders = async () => {
    if (!currentBranch.value?.id) return;
    loading.value = true;
    try {
      const { data } = await posStore.fetchOrderHistory({
        branch_id: currentBranch.value.id,
        limit: 100,
        offset: 0,
      });
      const rows = Array.isArray(data) ? data : [];
      const list = rows.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        created_at: o.created_at,
        order_type: o.order_type || '',
        items: o.items || [],
      }));
      // Detect new orders (new id not in lastOrderIds)
      const currentIds = new Set(list.map((o) => o.id));
      const incomingNew = [];
      list.forEach((o) => {
        if (
          !lastOrderIds.value.has(o.id) &&
          (o.status === 'pending' || o.status === 'processing')
        ) {
          newOrderIds.value.add(o.id);
          incomingNew.push(o.id);
        }
      });
      orders.value = list;
      lastOrderIds.value = currentIds;
      if (incomingNew.length > 0) {
        showInfo(
          `${incomingNew.length} new order${incomingNew.length > 1 ? 's' : ''} received`
        );
      }
    } catch (e) {
      showError('Failed to load kitchen orders');
    } finally {
      loading.value = false;
    }
  };

  const filtered = computed(() => {
    let rows = orders.value;
    if (statusFilter.value === 'pending_or_processing') {
      rows = rows.filter(
        (o) => o.status === 'pending' || o.status === 'processing'
      );
    } else if (statusFilter.value === 'pending') {
      rows = rows.filter((o) => o.status === 'pending');
    } else if (statusFilter.value === 'processing') {
      rows = rows.filter((o) => o.status === 'processing');
    }
    if (search.value.trim()) {
      const q = search.value.trim().toLowerCase();
      rows = rows.filter(
        (o) =>
          String(o.order_number || '')
            .toLowerCase()
            .includes(q) ||
          (o.items || []).some((it) =>
            (it.menu_item_name || it.item_name || '').toLowerCase().includes(q)
          )
      );
    }
    return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  });

  const pendingCount = computed(
    () => filtered.value.filter((o) => o.status === 'pending').length
  );
  const processingCount = computed(
    () => filtered.value.filter((o) => o.status === 'processing').length
  );

  // FIFO: only the oldest processing order may be completed
  const earliestProcessingId = computed(() => {
    const processing = (orders.value || [])
      .filter((o) => o.status === 'processing')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return processing.length ? processing[0].id : null;
  });
  const isCompletable = (order) => {
    return (
      order.status === 'processing' && order.id === earliestProcessingId.value
    );
  };

  const receiveOrder = async (order) => {
    try {
      actionLoadingId.value = order.id;
      await posStore.processOrderById(order.id);
      await fetchKitchenOrders();
      showSuccess(`Order ${order.order_number} received`);
    } catch (e) {
      showError('Failed to receive order');
    } finally {
      actionLoadingId.value = null;
    }
  };

  const completeOrder = async (order) => {
    try {
      actionLoadingId.value = order.id;
      await posStore.completeOrder(order.id);
      await fetchKitchenOrders();
      showSuccess(`Order ${order.order_number} completed`);
    } catch (e) {
      showError('Failed to complete order');
    } finally {
      actionLoadingId.value = null;
      showConfirmComplete.value = false;
      orderToComplete.value = null;
    }
  };

  const openConfirmComplete = (order) => {
    orderToComplete.value = order;
    showConfirmComplete.value = true;
  };

  const startAuto = () => {
    if (autoTimer.value) clearInterval(autoTimer.value);
    autoTimer.value = setInterval(() => {
      // Silent refresh behavior; keep loading spinner off
      fetchKitchenOrders();
    }, 10000);
    document.addEventListener('visibilitychange', onVisibility);
  };

  const stopAuto = () => {
    if (autoTimer.value) clearInterval(autoTimer.value);
    autoTimer.value = null;
    document.removeEventListener('visibilitychange', onVisibility);
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') fetchKitchenOrders();
  };

  onMounted(() => {
    fetchKitchenOrders();
    startAuto();
  });

  onUnmounted(() => {
    stopAuto();
  });
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-primaryColor">Kitchen</h1>
        <p class="text-gray-600">Receive and complete orders</p>
      </div>
      <!-- <button
        class="btn btn-outline btn-sm text-primaryColor"
        :disabled="loading"
        @click="fetchKitchenOrders"
      >
        <RefreshCcw :class="['w-4 h-4 mr-2', { 'animate-spin': loading }]" />
        Refresh
      </button> -->
    </div>

    <div class="card bg-white shadow">
      <div class="card-body p-4 gap-3">
        <div class="flex flex-col md:flex-row gap-3">
          <label
            class="input input-bordered flex items-center gap-2 w-full md:w-1/2"
          >
            <Search class="w-4 h-4" />
            <input
              v-model="search"
              type="text"
              class="grow"
              placeholder="Search order # or item"
            />
          </label>
          <select
            v-model="statusFilter"
            class="select select-bordered w-full md:w-56"
          >
            <option value="pending_or_processing">Pending or Processing</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
          </select>
        </div>

        <div v-if="loading" class="py-10 flex justify-center">
          <span
            class="loading loading-spinner loading-lg text-primaryColor"
          ></span>
        </div>

        <div
          v-else-if="filtered.length === 0"
          class="text-center py-10 text-gray-500"
        >
          No orders to show.
        </div>

        <!-- Board-style columns for Pending and Processing -->
        <div
          v-else
          class="grid grid-cols-1"
          :class="
            filtered.filter((o) => o.status === 'pending').length > 0
              ? 'lg:grid-cols-2 gap-4'
              : 'lg:grid-cols-1'
          "
        >
          <!-- Pending -->
          <div
            v-if="filtered.filter((o) => o.status === 'pending').length > 0"
            class="bg-base-100 rounded-lg border border-base-200"
          >
            <div
              class="px-4 py-3 flex items-center justify-between border-b border-base-200"
            >
              <div class="font-semibold">Pending</div>
              <div class="badge bg-info/20 text-info badge-sm">
                {{ filtered.filter((o) => o.status === 'pending').length }}
              </div>
            </div>
            <div class="p-3 space-y-3 min-h-[200px]">
              <div
                v-for="o in filtered.filter((o) => o.status === 'pending')"
                :key="o.id"
                class="rounded-lg p-3 border"
                :class="[
                  newOrderIds.has(o.id)
                    ? 'border-primaryColor bg-primaryColor/5'
                    : 'border-base-200 bg-white',
                ]"
              >
                <div class="grid grid-cols-12 gap-3 items-start">
                  <div class="col-span-12 sm:col-span-3 lg:col-span-2">
                    <div class="font-mono font-semibold text-base lg:text-lg">
                      {{ o.order_number }}
                    </div>
                    <div class="text-[11px] lg:text-xs text-gray-500">
                      {{ new Date(o.created_at).toLocaleTimeString() }}
                    </div>
                  </div>
                  <div class="col-span-12 sm:col-span-6 lg:col-span-7">
                    <div class="text-sm lg:text-base text-gray-700">
                      <div
                        v-for="it in o.items"
                        :key="
                          (it.id || it.menu_item_id) +
                          '-' +
                          (it.item_name || it.menu_item_name)
                        "
                        class="leading-6 lg:leading-7"
                      >
                        {{ it.menu_item_name || it.item_name }}
                        <span class="text-gray-500 ml-1 font-medium"
                          >x{{ it.quantity }}</span
                        >
                      </div>
                      <div
                        v-if="!o.items || o.items.length === 0"
                        class="text-gray-400"
                      >
                        No items
                      </div>
                    </div>
                  </div>
                  <div
                    class="col-span-12 sm:col-span-3 lg:col-span-3 flex sm:flex-col justify-between sm:justify-start items-end sm:items-end gap-2"
                  >
                    <span
                      class="badge badge-ghost sm:self-start"
                      :class="
                        o.order_type === 'dine_in'
                          ? 'text-primaryColor'
                          : 'text-green-700'
                      "
                    >
                      {{
                        o.order_type === 'dine_in'
                          ? 'Dine In'
                          : o.order_type === 'take_out'
                            ? 'Take Out'
                            : o.order_type || 'Order'
                      }}
                    </span>
                    <button
                      class="btn btn-sm bg-primaryColor text-white border-none sm:self-end"
                      :disabled="actionLoadingId === o.id"
                      @click="receiveOrder(o)"
                    >
                      <span
                        v-if="actionLoadingId === o.id"
                        class="loading loading-spinner loading-xs mr-2"
                      ></span>
                      <Timer class="w-4 h-4 mr-1" /> Receive
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Processing -->
          <div class="bg-base-100 rounded-lg border border-base-200">
            <div
              class="px-4 py-3 flex items-center justify-between border-b border-base-200"
            >
              <div class="font-semibold">Processing</div>
              <div class="badge bg-warning/20 text-warning badge-sm">
                {{ filtered.filter((o) => o.status === 'processing').length }}
              </div>
            </div>
            <div class="p-3 space-y-3 min-h-[200px]">
              <div
                v-for="o in filtered.filter((o) => o.status === 'processing')"
                :key="o.id"
                class="rounded-lg p-3 border border-base-200 bg-white"
              >
                <div class="grid grid-cols-12 gap-3 items-start">
                  <div class="col-span-12 sm:col-span-3 lg:col-span-2">
                    <div class="font-mono font-semibold text-base lg:text-lg">
                      {{ o.order_number }}
                    </div>
                    <div class="text-[11px] lg:text-xs text-gray-500">
                      {{ new Date(o.created_at).toLocaleTimeString() }}
                    </div>
                  </div>
                  <div class="col-span-12 sm:col-span-6 lg:col-span-7">
                    <div class="text-sm lg:text-base text-gray-700">
                      <div
                        v-for="it in o.items"
                        :key="
                          (it.id || it.menu_item_id) +
                          '-' +
                          (it.item_name || it.menu_item_name)
                        "
                        class="leading-6 lg:leading-7"
                      >
                        {{ it.menu_item_name || it.item_name }}
                        <span class="text-gray-500 ml-1 font-medium"
                          >x{{ it.quantity }}</span
                        >
                      </div>
                      <div
                        v-if="!o.items || o.items.length === 0"
                        class="text-gray-400"
                      >
                        No items
                      </div>
                    </div>
                  </div>
                  <div
                    class="col-span-12 sm:col-span-3 lg:col-span-3 flex sm:flex-col justify-between sm:justify-start items-end sm:items-end gap-2"
                  >
                    <span
                      class="badge badge-ghost sm:self-start"
                      :class="
                        o.order_type === 'dine_in'
                          ? 'text-primaryColor'
                          : 'text-green-700'
                      "
                    >
                      {{
                        o.order_type === 'dine_in'
                          ? 'Dine In'
                          : o.order_type === 'take_out'
                            ? 'Take Out'
                            : o.order_type || 'Order'
                      }}
                    </span>
                    <div class="flex items-center gap-2 sm:self-end">
                      <button
                        class="btn btn-sm bg-success/20 text-success border-none"
                        :disabled="
                          actionLoadingId === o.id || !isCompletable(o)
                        "
                        @click="openConfirmComplete(o)"
                      >
                        <span
                          v-if="actionLoadingId === o.id"
                          class="loading loading-spinner loading-xs mr-2"
                        ></span>
                        <CheckCircle class="w-4 h-4 mr-1" /> Complete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div
                v-if="
                  filtered.filter((o) => o.status === 'processing').length === 0
                "
                class="text-center text-xs text-gray-400 py-6"
              >
                No processing orders
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- Confirm Complete Modal -->
  <dialog :open="showConfirmComplete" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg">Complete order?</h3>
      <p class="py-2 text-sm text-gray-600">
        You are about to complete order
        <span class="font-mono font-semibold"
          >#{{ orderToComplete?.order_number }}</span
        >. This action cannot be undone.
      </p>
      <div class="modal-action">
        <form method="dialog" class="flex gap-2">
          <button
            class="btn btn-ghost btn-sm"
            @click.prevent="showConfirmComplete = false"
          >
            Cancel
          </button>
          <button
            class="btn btn-success btn-sm"
            :disabled="actionLoadingId === orderToComplete?.id"
            @click.prevent="completeOrder(orderToComplete)"
          >
            <span
              v-if="actionLoadingId === orderToComplete?.id"
              class="loading loading-spinner loading-xs mr-2"
            ></span>
            Confirm
          </button>
        </form>
      </div>
    </div>
  </dialog>
</template>

<style scoped></style>
