<script setup>
  import { ref, watch, computed, onMounted } from 'vue';
  import { usePOSStore } from '../../stores/posStore.js';
  import { useBranchContextStore } from '../../stores/branchContextStore.js';

  const props = defineProps({
    show: { type: Boolean, default: false },
    period: { type: String, default: 'today' }, // today | week | month | year
    branchId: { type: [Number, String], default: null },
  });

  const emit = defineEmits(['close']);

  const posStore = usePOSStore();
  const context = useBranchContextStore();

  const orders = ref([]);
  const loading = ref(false);
  const activeTab = ref('today'); // today | thisWeek | thisMonth

  const tabs = [
    { id: 'today', label: 'Today' },
    { id: 'thisWeek', label: 'This Week' },
    { id: 'thisMonth', label: 'This Month' },
  ];

  // Pagination
  const page = ref(1);
  const pageSize = 10;

  const totalPages = computed(() => {
    return Math.max(1, Math.ceil((orders.value?.length || 0) / pageSize));
  });
  const paginated = computed(() => {
    const start = (page.value - 1) * pageSize;
    return (orders.value || []).slice(start, start + pageSize);
  });

  const goPrev = () => (page.value = Math.max(1, page.value - 1));
  const goNext = () =>
    (page.value = Math.min(totalPages.value, page.value + 1));

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatItems = (order) => {
    if (
      !order?.items ||
      !Array.isArray(order.items) ||
      order.items.length === 0
    )
      return '0 items';
    if (order.items.length === 1) {
      const it = order.items[0];
      const qty = it.quantity || 1;
      const name = it.item_name || it.menu_item_name || 'Unknown Item';
      return `${qty}x ${name}`;
    }
    return order.items
      .map(
        (it) =>
          `${it.quantity || 1}x ${it.item_name || it.menu_item_name || 'Unknown Item'}`
      )
      .join('\n');
  };

  const summaryTotals = computed(() => {
    const totals = {
      totalSales: 0,
      refunds: 0,
      netSales: 0,
      remitted: 0,
      transactions: 0,
      voidedCount: 0,
    };
    const list = orders.value || [];
    totals.transactions = list.length;
    list.forEach((o) => {
      const amt = Number(o.total_amount) || 0;
      if (o.status === 'completed') {
        totals.totalSales += amt;
        totals.netSales += amt;
      } else if (o.status === 'void') {
        totals.refunds += amt;
        totals.voidedCount += 1;
      }
    });
    totals.remitted = Math.max(0, totals.netSales - totals.refunds);
    return totals;
  });

  const getDateRange = (period) => {
    const now = new Date();
    let from, to;
    if (period === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      from.setHours(0, 0, 0, 0);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      from = start;
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end.setHours(23, 59, 59, 999);
      to = end;
    } else if (period === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      from.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end.setHours(23, 59, 59, 999);
      to = end;
    } else if (period === 'year') {
      from = new Date(now.getFullYear(), 0, 1);
      from.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end.setHours(23, 59, 59, 999);
      to = end;
    } else {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      from.setHours(0, 0, 0, 0);
      to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to.setHours(23, 59, 59, 999);
    }
    return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
  };

  const loadOrders = async () => {
    const branchId = Number(props.branchId || context.currentBranch?.id || 0);
    if (!branchId) return;
    loading.value = true;
    try {
      page.value = 1;
      const periodMap = {
        today: 'today',
        thisWeek: 'week',
        thisMonth: 'month',
      };
      const effectivePeriod =
        periodMap[activeTab.value] || props.period || 'today';
      const { dateFrom, dateTo } = getDateRange(effectivePeriod);
      // Some backends default to excluding completed orders unless status is set.
      // Fetch both completed and void to reflect remit totals.
      const [completedResp, voidResp] = await Promise.all([
        posStore.fetchOrderHistory({
          branch_id: branchId,
          status: 'completed',
          date_from: dateFrom,
          date_to: dateTo,
          limit: 1000,
        }),
        posStore.fetchOrderHistory({
          branch_id: branchId,
          status: 'void',
          date_from: dateFrom,
          date_to: dateTo,
          limit: 1000,
        }),
      ]);
      const a = Array.isArray(completedResp?.data) ? completedResp.data : [];
      const b = Array.isArray(voidResp?.data) ? voidResp.data : [];
      orders.value = [...a, ...b].sort(
        (x, y) => new Date(x.created_at) - new Date(y.created_at)
      );
    } catch (e) {
      console.error('Failed to load remit orders', e);
      orders.value = [];
    } finally {
      loading.value = false;
    }
  };

  const closeModal = () => {
    const dlg = document.getElementById('remit_order_details_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  watch(
    () => props.show,
    async (val) => {
      const dlg = document.getElementById('remit_order_details_modal');
      if (val) {
        if (dlg?.showModal) dlg.showModal();
        // Initialize activeTab from incoming prop
        activeTab.value =
          props.period === 'week'
            ? 'thisWeek'
            : props.period === 'month'
              ? 'thisMonth'
              : 'today';
        await loadOrders();
      } else if (dlg?.close) {
        dlg.close();
      }
    }
  );

  watch(
    () => props.period,
    async () => {
      if (props.show) await loadOrders();
    }
  );

  onMounted(() => {
    if (props.show) loadOrders();
  });
</script>

<template>
  <dialog id="remit_order_details_modal" class="modal">
    <div class="modal-box max-w-5xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="card-title text-primaryColor">
          <font-awesome-icon icon="fa-solid fa-receipt" class="!w-5 !h-5" />
          Remitted Orders
        </h3>
      </div>

      <div v-if="loading" class="py-8 flex justify-center">
        <div class="text-center">
          <span class="loading loading-spinner loading-lg text-primaryColor" />
          <p class="mt-2 text-gray-600">Loading remitted orders...</p>
        </div>
      </div>

      <div v-else>
        <!-- Period Tabs -->
        <div class="tabs tabs-boxed mb-4">
          <button
            v-for="t in tabs"
            :key="t.id"
            class="tab"
            :class="{ 'tab-active': activeTab === t.id }"
            @click="
              activeTab = t.id;
              loadOrders();
            "
          >
            {{ t.label }}
          </button>
        </div>
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div class="card bg-white shadow border border-black/10">
            <div class="card-body py-3">
              <div class="text-xs text-gray-500">Gross Sales</div>
              <div class="text-base font-semibold text-primaryColor">
                ₱{{ summaryTotals.totalSales.toFixed(2) }}
              </div>
            </div>
          </div>
          <div class="card bg-white shadow border border-black/10">
            <div class="card-body py-3">
              <div class="text-xs text-gray-500">Refunds</div>
              <div class="text-base font-semibold">
                ₱{{ summaryTotals.refunds.toFixed(2) }}
              </div>
            </div>
          </div>
          <div class="card bg-white shadow border border-black/10">
            <div class="card-body py-3">
              <div class="text-xs text-gray-500">Net Sales</div>
              <div class="text-base font-semibold text-primaryColor">
                ₱{{ summaryTotals.netSales.toFixed(2) }}
              </div>
            </div>
          </div>
          <div class="card bg-white shadow border border-black/10">
            <div class="card-body py-3">
              <div class="text-xs text-gray-500">Remitted</div>
              <div class="text-base font-semibold text-primaryColor">
                ₱{{ summaryTotals.remitted.toFixed(2) }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="orders && orders.length" class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th class="text-xs">Order #</th>
                <th class="text-xs">Date</th>
                <th class="text-xs">Type</th>
                <th class="text-xs">Status</th>
                <th class="text-xs">Items</th>
                <th class="text-xs">Total</th>
                <th class="text-xs">Cashier</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in paginated" :key="o.id" class="hover:bg-gray-50">
                <td class="font-mono text-xs">{{ o.order_number }}</td>
                <td class="text-xs">{{ formatDate(o.created_at) }}</td>
                <td class="text-xs">{{ o.order_type }}</td>
                <td class="text-xs">
                  <span
                    :class="[
                      'badge badge-sm font-medium',
                      o.status === 'completed'
                        ? 'bg-success/10 text-success border'
                        : o.status === 'void'
                          ? 'bg-error/10 text-error border'
                          : 'bg-warning/10 text-warning border',
                    ]"
                  >
                    {{ o.status }}
                  </span>
                </td>
                <td class="text-xs">
                  <div
                    class="max-w-xs whitespace-pre-line"
                    :title="formatItems(o)"
                  >
                    {{ formatItems(o) }}
                  </div>
                </td>
                <td class="text-xs font-semibold">
                  ₱{{ parseFloat(o.total_amount || 0).toFixed(2) }}
                </td>
                <td class="text-xs">
                  {{ o.cashier_first_name }} {{ o.cashier_last_name }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center py-8">
          <p class="text-gray-500">No orders found for this period</p>
        </div>

        <div
          v-if="totalPages > 1"
          class="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 text-sm"
        >
          <div class="text-gray-500">Page {{ page }} of {{ totalPages }}</div>
          <div class="join">
            <button
              class="btn btn-xs join-item"
              :disabled="page <= 1"
              @click="goPrev"
            >
              Prev
            </button>
            <button
              class="btn btn-xs join-item"
              :disabled="page >= totalPages"
              @click="goNext"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn" @click="closeModal">Close</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  </dialog>
</template>

<style scoped></style>
