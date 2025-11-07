<script setup>
  import { ref, computed, watch } from 'vue';
  import { usePOSStore } from '../../stores/posStore.js';
  import { useCustomToast } from '../../composables/useCustomToast.js';
  import { sanitizeHtml } from '../../utils/sanitizeHtml.js';
  import { formatImageUrl } from '../../config/api.js';

  const props = defineProps({
    show: { type: Boolean, default: false },
    remittance: { type: Object, default: null },
  });

  const emit = defineEmits(['close']);

  const posStore = usePOSStore();
  const { showToast } = useCustomToast();
  const loading = ref(false);
  const orders = ref([]);
  const page = ref(1);
  const pageSize = 10;

  // Image preview state
  const previewImageUrl = ref(null);
  const showImagePreview = ref(false);

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

  const formatVoidReason = (reason) => {
    if (!reason) return '—';
    const normalized = String(reason).replace(/_/g, ' ').trim();
    return normalized
      .split(' ')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
      .join(' ');
  };

  const classifyImpact = (order) => {
    if (order?.status !== 'void') return { label: '—', type: 'none' };
    const refundReasons = [
      'customer_cancelled',
      'wrong_order',
      'duplicate_order',
      'payment_issue',
      'system_error',
      'customer cancelled',
      'wrong order',
      'duplicate order',
      'payment issue',
      'system error',
    ];
    const lossReasons = [
      'staff_error',
      'item_damaged',
      'expired_item',
      'quality_issue',
      'preparation_error',
      'staff error',
      'item damaged',
      'expired item',
      'quality issue',
      'preparation error',
      'custom',
    ];
    const reason = String(order?.void_reason || '').toLowerCase();
    const isRefund = refundReasons.includes(reason);
    const isLoss = lossReasons.includes(reason);
    return isRefund
      ? { label: 'Refund', type: 'refund' }
      : isLoss
        ? { label: 'Loss', type: 'loss' }
        : { label: 'Loss', type: 'loss' };
  };

  const summaryTotals = computed(() => {
    const totals = {
      totalSales: 0,
      refunds: 0,
      loss: 0,
      netSales: 0,
      remitted: 0,
      transactions: 0,
      voidedCount: 0,
    };
    const list = orders.value || [];
    totals.transactions = list.length;

    const refundReasons = new Set([
      'customer_cancelled',
      'wrong_order',
      'duplicate_order',
      'payment_issue',
      'system_error',
      'customer cancelled',
      'wrong order',
      'duplicate order',
      'payment issue',
      'system error',
    ]);
    const lossReasons = new Set([
      'staff_error',
      'item_damaged',
      'expired_item',
      'quality_issue',
      'preparation_error',
      'staff error',
      'item damaged',
      'expired item',
      'quality issue',
      'preparation error',
      'custom',
    ]);

    list.forEach((o) => {
      const amt = Number(o.total_amount) || 0;
      if (o.status === 'completed') {
        totals.totalSales += amt;
        totals.netSales += amt;
      } else if (o.status === 'void') {
        const reason = String(o.void_reason || '').toLowerCase();
        if (refundReasons.has(reason)) {
          totals.refunds += amt;
        } else if (lossReasons.has(reason)) {
          totals.loss += amt;
        } else {
          totals.loss += amt;
        }
        totals.voidedCount += 1;
      }
    });
    totals.remitted = Math.max(0, totals.netSales - totals.refunds);
    return totals;
  });

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

  const loadOrders = async () => {
    if (!props.remittance?.id) return;
    loading.value = true;
    try {
      page.value = 1;
      const branchId = props.remittance.branch_id;
      const remittanceId = props.remittance.id;

      console.log(
        '🔍 Loading orders for remittance:',
        remittanceId,
        'branch:',
        branchId
      );

      const [completedResp, voidResp] = await Promise.all([
        posStore.fetchOrderHistory({
          branch_id: branchId,
          remittance_id: remittanceId,
          status: 'completed',
          limit: 1000,
        }),
        posStore.fetchOrderHistory({
          branch_id: branchId,
          remittance_id: remittanceId,
          status: 'void',
          limit: 1000,
        }),
      ]);

      const completed = Array.isArray(completedResp?.data)
        ? completedResp.data
        : [];
      const voided = Array.isArray(voidResp?.data) ? voidResp.data : [];

      console.log('✅ Completed orders:', completed.length);
      console.log('❌ Void orders:', voided.length);

      orders.value = [...completed, ...voided].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );

    } catch (e) {
      console.error('Failed to load orders:', e);
      showToast('Failed to load orders', 'error');
      orders.value = [];
    } finally {
      loading.value = false;
    }
  };

  const closeModal = () => {
    const dlg = document.getElementById('remitted_sales_view_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  // Image preview functions
  const openImagePreview = (imageUrl) => {
    let url = imageUrl;
    if (typeof url === 'string') {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = formatImageUrl(url);
      } else {
        url = formatImageUrl(url);
      }
    }
    previewImageUrl.value = url;
    showImagePreview.value = true;
    const dlg = document.getElementById('remitted_sales_image_preview_modal');
    if (dlg?.showModal) dlg.showModal();
  };

  const closeImagePreview = () => {
    showImagePreview.value = false;
    previewImageUrl.value = null;
    const dlg = document.getElementById('remitted_sales_image_preview_modal');
    if (dlg?.close) dlg.close();
  };

  const handleProofImageClick = (event) => {
    const img = event.target.closest('img');
    if (img && img.src) {
      event.preventDefault();
      event.stopPropagation();
      const src = img.getAttribute('src') || img.src;
      openImagePreview(src);
    }
  };

  watch(
    () => props.show,
    async (val) => {
      const dlg = document.getElementById('remitted_sales_view_modal');
      if (val) {
        if (dlg?.showModal) dlg.showModal();
        await loadOrders();
      } else if (dlg?.close) {
        dlg.close();
      }
    }
  );

  watch(showImagePreview, (val) => {
    const dlg = document.getElementById('remitted_sales_image_preview_modal');
    if (val) {
      if (dlg?.showModal) dlg.showModal();
    } else if (dlg?.close) {
      dlg.close();
    }
  });
</script>

<template>
  <dialog id="remitted_sales_view_modal" class="modal">
    <div class="modal-box max-w-5xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="card-title text-primaryColor">
          <font-awesome-icon icon="fa-solid fa-receipt" class="!w-5 !h-5" />
          Remitted Orders - {{ remittance?.branch_name }}
        </h3>
        <button class="btn btn-sm btn-circle btn-ghost" @click="closeModal">
          <font-awesome-icon icon="fa-solid fa-times" />
        </button>
      </div>

      <div v-if="loading" class="py-8 flex justify-center">
        <div class="text-center">
          <span class="loading loading-spinner loading-lg text-primaryColor" />
          <p class="mt-2 text-gray-600">Loading remitted orders...</p>
        </div>
      </div>

      <div v-else>
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
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
          <div class="card bg-white shadow border border-black/10">
            <div class="card-body py-3">
              <div class="text-xs text-gray-500">Voided Orders</div>
              <div class="text-base font-semibold">
                {{ summaryTotals.voidedCount.toLocaleString() }}
              </div>
            </div>
          </div>
          <div class="card bg-white shadow border border-black/10">
            <div class="card-body py-3">
              <div class="text-xs text-gray-500">Loss (Voids)</div>
              <div class="text-base font-semibold">
                ₱{{ summaryTotals.loss.toFixed(2) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Proof of Sales Section -->
        <div
          v-if="remittance && remittance.notes"
          class="mb-4 card bg-white shadow border border-black/10"
        >
          <div class="card-body p-3">
            <h4
              class="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2"
            >
              <font-awesome-icon
                icon="fa-solid fa-file-image"
                class="text-primaryColor !w-3 !h-3"
              />
              Proof of Sales (click to preview)
            </h4>
            <div
              class="prose prose-xs max-w-none proof-content-small"
              v-html="sanitizeHtml(remittance.notes)"
              @click="handleProofImageClick"
            ></div>
          </div>
        </div>

        <div v-if="orders && orders.length" class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th class="text-xs">Order #</th>
                <th class="text-xs">Date</th>
                <th class="text-xs">Type</th>
                <th class="text-xs">Items</th>
                <th class="text-xs">Total</th>
                <th class="text-xs">VAT-Exempt</th>
                <th class="text-xs">SC/PWD</th>
                <th class="text-xs">Cashier</th>
                <th class="text-xs">Reason</th>
                <th class="text-xs">Impact</th>
                <th class="text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="o in paginated" :key="o.id" class="hover:bg-gray-50">
                <td class="font-mono text-xs">{{ o.order_number }}</td>
                <td class="text-xs">{{ formatDate(o.created_at) }}</td>
                <td class="text-xs">{{ o.order_type }}</td>
                <td class="text-xs">
                  <div
                    class="max-w-xs whitespace-pre-line"
                    :title="formatItems(o)"
                  >
                    {{ formatItems(o) }}
                  </div>
                </td>
                <td class="text-xs font-semibold">
                  <div
                    class="flex items-center justify-end whitespace-nowrap tabular-nums"
                  >
                    <i class="fa-solid fa-peso-sign mr-1"></i>
                    {{
                      Number(o.total_amount || 0).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                      })
                    }}
                  </div>
                </td>
                <td class="text-xs">
                  <span
                    :class="
                      o.is_vat_exempt ? 'text-emerald-700' : 'text-gray-500'
                    "
                  >
                    {{ o.is_vat_exempt ? 'Yes' : 'No' }}
                  </span>
                </td>
                <td class="text-xs">
                  <span
                    v-if="o.discount_type && o.discount_type !== 'NONE'"
                    class="badge badge-ghost badge-xs text-emerald-700 border-emerald-200"
                  >
                    {{ o.discount_type }}
                  </span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td class="text-xs">
                  {{ o.cashier_first_name }} {{ o.cashier_last_name }}
                </td>
                <td class="text-xs">
                  <span v-if="o.status === 'void'">{{
                    formatVoidReason(o.void_reason)
                  }}</span>
                  <span v-else>—</span>
                </td>
                <td class="text-xs">
                  <span
                    :class="[
                      'badge badge-sm',
                      classifyImpact(o).type === 'refund'
                        ? 'bg-info/10 text-info border'
                        : classifyImpact(o).type === 'loss'
                          ? 'bg-warning/10 text-warning border'
                          : 'border',
                    ]"
                  >
                    {{ classifyImpact(o).label }}
                  </span>
                </td>
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
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="text-center py-8">
          <p class="text-gray-500">No orders found for this remittance</p>
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
        <button class="btn btn-sm" @click="closeModal">Close</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  </dialog>

  <!-- Image Preview Modal -->
  <dialog id="remitted_sales_image_preview_modal" class="modal">
    <div class="modal-box max-w-4xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg">Image Preview</h3>
        <button
          class="btn btn-sm btn-circle btn-ghost"
          @click="closeImagePreview"
        >
          <font-awesome-icon icon="fa-solid fa-times" />
        </button>
      </div>
      <div
        class="flex items-center justify-center bg-gray-100 rounded-lg p-4 min-h-[400px]"
      >
        <img
          v-if="previewImageUrl"
          :src="previewImageUrl"
          alt="Proof of sales image"
          class="max-w-full max-h-[70vh] rounded-lg shadow-lg"
          @error="closeImagePreview"
        />
      </div>
      <div class="modal-action">
        <button class="btn btn-sm" @click="closeImagePreview">Close</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeImagePreview">close</button>
    </form>
  </dialog>
</template>

<style scoped>
  .proof-content-small :deep(img) {
    cursor: pointer;
    max-width: 150px;
    max-height: 100px;
    object-fit: cover;
    height: auto;
    margin: 4px 0;
    border-radius: 4px;
    transition: all 0.2s;
    border: 1px solid #e5e7eb;
  }

  .proof-content-small :deep(img:hover) {
    opacity: 0.8;
    border-color: #3b82f6;
    transform: scale(1.05);
  }

  .proof-content-small :deep(p) {
    margin: 4px 0;
    font-size: 0.75rem;
    line-height: 1.2;
  }

  .proof-content-small :deep(ul),
  .proof-content-small :deep(ol) {
    margin: 4px 0;
    padding-left: 16px;
    font-size: 0.75rem;
  }

  .proof-content-small :deep(li) {
    font-size: 0.75rem;
    line-height: 1.2;
  }
</style>
