<script setup>
  import { ref, watch, computed, onMounted } from 'vue';
  import { usePOSStore } from '../../stores/posStore.js';
  import { useBranchContextStore } from '../../stores/branchContextStore.js';
  import {
    createPhilippineDate,
    formatForAPI,
  } from '../../utils/timezoneUtils.js';
  import { sanitizeHtml } from '../../utils/sanitizeHtml.js';
  import { formatImageUrl } from '../../config/api.js';

  const props = defineProps({
    show: { type: Boolean, default: false },
    period: { type: String, default: 'today' }, // today | week | month | year | dateRange
    branchId: { type: [Number, String], default: null },
    // When period === 'customMonth', expects YYYY-MM
    customMonth: { type: String, default: '' },
    // When period === 'dateRange', expect YYYY-MM-DD
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    // Optional: target a specific remittance_id
    remittanceId: { type: [Number, String], default: null },
  });

  const emit = defineEmits(['close']);

  const posStore = usePOSStore();
  const context = useBranchContextStore();

  const orders = ref([]);
  const loading = ref(false);
  const activeTab = ref('today'); // today | thisWeek | thisMonth | customMonth
  const remittanceDetails = ref(null); // Store actual remittance record data
  const previewImageUrl = ref(null); // For image preview modal
  const showImagePreview = ref(false);

  const tabs = computed(() => {
    if (props.remittanceId !== null && props.remittanceId !== undefined) {
      return [{ id: 'remittance', label: 'Remittance' }];
    }
    if (props.period === 'customMonth') {
      return [{ id: 'customMonth', label: 'Custom Month' }];
    }
    if (props.period === 'dateRange') {
      return [{ id: 'dateRange', label: 'Date Range' }];
    }
    return [
      { id: 'today', label: 'Today' },
      { id: 'thisWeek', label: 'This Week' },
      { id: 'thisMonth', label: 'This Month' },
    ];
  });

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
    // Align classification with BranchSales.vue
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
    // Calculate from individual orders (keeps refund/loss classification consistent)
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
    // Align refund/loss classification with BranchSales.vue
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
          // Default unknown reasons to loss
          totals.loss += amt;
        }
        totals.voidedCount += 1;
      }
    });
    totals.remitted = Math.max(0, totals.netSales - totals.refunds);
    return totals;
  });

  const getDateRange = (period) => {
    const now = new Date();
    let from, to;
    // When targeting a specific remittance, ignore date windows altogether
    if (props.remittanceId !== null && props.remittanceId !== undefined) {
      from = new Date('1970-01-01T00:00:00.000Z');
      to = new Date('2100-01-01T00:00:00.000Z');
      return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
    }
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
    } else if (period === 'customMonth') {
      const ym = String(props.customMonth || '').trim();
      const [yStr, mStr] = ym.split('-');
      const year = Number(yStr);
      const monthIndex = Number(mStr) - 1;
      from =
        Number.isFinite(year) && Number.isFinite(monthIndex)
          ? new Date(year, monthIndex, 1)
          : new Date(now.getFullYear(), now.getMonth(), 1);
      from.setHours(0, 0, 0, 0);
      const end =
        Number.isFinite(year) && Number.isFinite(monthIndex)
          ? new Date(year, monthIndex + 1, 0)
          : new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      to = end;
    } else if (period === 'dateRange') {
      const [sy, sm, sd] = String(props.startDate || '')
        .split('-')
        .map((v) => Number(v));
      const [ey, em, ed] = String(props.endDate || '')
        .split('-')
        .map((v) => Number(v));
      const today = new Date();
      from =
        Number.isFinite(sy) && Number.isFinite(sm) && Number.isFinite(sd)
          ? createPhilippineDate(sy, sm, sd, 0, 0, 0)
          : new Date(today.getFullYear(), today.getMonth(), today.getDate());
      from.setHours(0, 0, 0, 0);
      const fallbackEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999
      );
      to =
        Number.isFinite(ey) && Number.isFinite(em) && Number.isFinite(ed)
          ? createPhilippineDate(ey, em, ed, 23, 59, 59)
          : fallbackEnd;
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
    return {
      dateFrom:
        period === 'dateRange' ? formatForAPI(from) : from.toISOString(),
      dateTo: period === 'dateRange' ? formatForAPI(to) : to.toISOString(),
    };
  };

  const loadOrders = async () => {
    const branchId = Number(props.branchId || context.currentBranch?.id || 0);
    if (!branchId) return;
    loading.value = true;
    try {
      page.value = 1;

      // If targeting a specific remittance, fetch the remittance details first
      if (props.remittanceId !== null && props.remittanceId !== undefined) {
        try {
          const { data: remittances } = await posStore.fetchRemittances({
            branchId: branchId,
            limit: 1000, // Get enough to find our specific remittance
          });
          const targetRemittance = remittances.find(
            (r) => r.id == props.remittanceId
          );
          if (targetRemittance) {
            remittanceDetails.value = targetRemittance;
          }
        } catch (error) {
          console.error('Failed to fetch remittance details:', error);
        }
      }

      const periodMap = {
        today: 'today',
        thisWeek: 'week',
        thisMonth: 'month',
        customMonth: 'customMonth',
        dateRange: 'dateRange',
      };
      const effectivePeriod =
        periodMap[activeTab.value] || props.period || 'today';
      const { dateFrom, dateTo } = getDateRange(effectivePeriod);

      // Some backends default to excluding completed orders unless status is set.
      // Fetch both completed and void to reflect remit totals.
      const fetchParams = {
        branch_id: branchId,
        date_from: dateFrom,
        date_to: dateTo,
        limit: 1000,
      };

      // Add remittance_id filter if targeting specific remittance
      if (props.remittanceId !== null && props.remittanceId !== undefined) {
        fetchParams.remittance_id = props.remittanceId;
      }

      const [completedResp, voidResp] = await Promise.all([
        posStore.fetchOrderHistory({
          ...fetchParams,
          status: 'completed',
        }),
        posStore.fetchOrderHistory({
          ...fetchParams,
          status: 'void',
        }),
      ]);
      const a = Array.isArray(completedResp?.data) ? completedResp.data : [];
      const b = Array.isArray(voidResp?.data) ? voidResp.data : [];

      // Show only orders that are actually remitted (have remittance_id or remitted_at)
      const fromMs = new Date(dateFrom).getTime();
      const toMs = new Date(dateTo).getTime();
      const merged = [...a, ...b].filter((o) => {
        // Only include orders that are actually remitted
        const isRemitted = o.remittance_id !== null || o.remitted_at !== null;
        if (!isRemitted) return false;

        // If targeting a specific remittance, the backend already filtered by remittance_id
        // so we don't need to apply additional date filtering
        if (props.remittanceId !== null && props.remittanceId !== undefined) {
          return true; // Backend already filtered by remittance_id, so include all returned orders
        }

        // For general filtering, check if order falls within the date range
        const t = new Date(
          o.completed_at || o.processed_at || o.created_at
        ).getTime();
        if (!Number.isFinite(t) || t < fromMs || t > toMs) return false;

        return true;
      });

      orders.value = merged.sort(
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

  // Image preview functions
  const openImagePreview = (imageUrl) => {
    // Ensure URL is properly formatted
    let url = imageUrl;
    if (typeof url === 'string') {
      // If it's already a full URL, use it as is
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = formatImageUrl(url);
      } else {
        url = formatImageUrl(url); // formatImageUrl handles full URLs too
      }
    }
    previewImageUrl.value = url;
    showImagePreview.value = true;
  };

  const closeImagePreview = () => {
    showImagePreview.value = false;
    previewImageUrl.value = null;
    const dlg = document.getElementById('image_preview_modal');
    if (dlg?.close) dlg.close();
  };

  // Handle image clicks in proof content
  const handleProofImageClick = (event) => {
    const img = event.target.closest('img');
    if (img && img.src) {
      event.preventDefault();
      event.stopPropagation();
      // Extract the original src (might be formatted)
      const src = img.getAttribute('src') || img.src;
      openImagePreview(src);
    }
  };

  watch(
    () => props.show,
    async (val) => {
      const dlg = document.getElementById('remit_order_details_modal');
      if (val) {
        if (dlg?.showModal) dlg.showModal();
        // Initialize activeTab from incoming prop
        activeTab.value =
          props.remittanceId !== null && props.remittanceId !== undefined
            ? 'remittance'
            : props.period === 'week'
              ? 'thisWeek'
              : props.period === 'month'
                ? 'thisMonth'
                : props.period === 'customMonth'
                  ? 'customMonth'
                  : props.period === 'dateRange'
                    ? 'dateRange'
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

  // Watch for image preview modal state
  watch(showImagePreview, (val) => {
    const dlg = document.getElementById('image_preview_modal');
    if (val) {
      if (dlg?.showModal) dlg.showModal();
    } else if (dlg?.close) {
      dlg.close();
    }
  });

  // Process images in proof content to make them clickable and format URLs
  const processProofImages = () => {
    const proofContent = document.querySelector('.proof-content');
    if (proofContent) {
      const images = proofContent.querySelectorAll('img');
      images.forEach((img) => {
        img.style.cursor = 'pointer';
        // Ensure image URLs are properly formatted
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http')) {
          img.src = formatImageUrl(src);
        }
      });
    }
  };

  // Watch remittance details to process images when content changes
  watch(
    () => remittanceDetails.value,
    () => {
      if (remittanceDetails.value?.notes) {
        // Use nextTick to ensure DOM is updated
        setTimeout(processProofImages, 100);
      }
    },
    { deep: true }
  );

  onMounted(() => {
    if (props.show) loadOrders();
    // Process images after mount
    setTimeout(processProofImages, 200);
  });
</script>

<template>
  <dialog id="remit_order_details_modal" class="modal">
    <div class="modal-box max-w-5xl max-h-[90vh] overflow-y-auto">
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
        <!-- Period Tabs - Only show when not targeting specific remittance -->
        <div v-if="!remittanceId" class="tabs tabs-boxed mb-4">
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

        <!-- Proof of Sales Section - Show when viewing specific remittance -->
        <div
          v-if="remittanceDetails && remittanceDetails.notes"
          class="mb-4 card bg-white shadow border border-black/10"
        >
          <div class="card-body p-4">
            <h4
              class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"
            >
              <font-awesome-icon
                icon="fa-solid fa-file-image"
                class="text-primaryColor"
              />
              Proof of Sales
            </h4>
            <div
              class="prose prose-sm max-w-none proof-content"
              v-html="sanitizeHtml(remittanceDetails.notes)"
              @click="handleProofImageClick"
            ></div>
            <p
              v-if="!remittanceDetails.notes"
              class="text-sm text-gray-500 italic"
            >
              No proof of sales provided
            </p>
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
                <th class="text-xs">VAT-Exempt</th>
                <th class="text-xs">SC/PWD</th>
                <th class="text-xs">Cashier</th>
                <th class="text-xs">Reason</th>
                <th class="text-xs">Impact</th>
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
        <button class="btn btn-sm" @click="closeModal">Close</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  </dialog>

  <!-- Image Preview Modal -->
  <dialog id="image_preview_modal" class="modal">
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
  .proof-content :deep(img) {
    cursor: pointer;
    max-width: 100%;
    height: auto;
    margin: 8px 0;
    border-radius: 4px;
    transition: opacity 0.2s;
    border: 1px solid #e5e7eb;
  }

  .proof-content :deep(img:hover) {
    opacity: 0.8;
    border-color: #3b82f6;
  }

  .proof-content :deep(p) {
    margin: 8px 0;
  }

  .proof-content :deep(ul),
  .proof-content :deep(ol) {
    margin: 8px 0;
    padding-left: 20px;
  }
</style>
