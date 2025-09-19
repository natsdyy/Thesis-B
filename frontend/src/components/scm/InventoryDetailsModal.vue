<script setup>
  import { ref, computed, watch, onMounted } from 'vue';
  import { Package, PhilippinePeso, History } from 'lucide-vue-next';
  import { useInventoryStore } from '../../stores/inventoryStore.js';

  const props = defineProps({
    show: { type: Boolean, default: false },
    inventoryItemId: { type: [Number, String], default: null },
  });

  const emit = defineEmits(['close']);
  const store = useInventoryStore();

  const item = ref(null);
  const transactions = ref([]);
  const loading = ref(false);

  const close = () => {
    const dlg = document.getElementById('inventory_details_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  const fetchData = async () => {
    if (!props.inventoryItemId) return;
    loading.value = true;
    try {
      item.value = await store.getInventoryItem(props.inventoryItemId);
      transactions.value = await store.getTransactionHistory(
        props.inventoryItemId
      );
    } catch (e) {
      // swallow; store already logs
    } finally {
      loading.value = false;
    }
  };

  watch(
    () => props.show,
    async (val) => {
      const dlg = document.getElementById('inventory_details_modal');
      if (val) {
        await fetchData();
        if (dlg?.showModal) dlg.showModal();
      } else if (dlg?.close) {
        dlg.close();
      }
    }
  );

  const statusBadgeClass = computed(() => {
    const status = item.value?.status;
    const map = {
      available: 'badge-sm border-none font-medium bg-success/20 text-success',
      reserved: 'badge-sm border-none font-medium bg-warning/20 text-warning',
      expired: 'badge-sm border-none font-medium bg-error/20 text-error',
      damaged: 'badge-sm border-none font-medium bg-error/20 text-error',
      consumed: 'badge-sm border-none font-medium bg-neutral/20 text-neutral',
    };
    return (
      map[status] ||
      'badge-sm border-none font-medium bg-neutral/20 text-neutral'
    );
  });

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'N/A';
  const peso = (n) => `₱${parseFloat(n || 0).toLocaleString()}`;

  // Map raw transaction types to user-friendly labels
  const humanizeType = (type, adjustmentType) => {
    const map = {
      receipt: 'Receipt',
      consumption: 'Consumption',
      production_consumption: 'Production',
      production_output: 'Production Output',
      adjustment: 'Adjustment',
      reservation: 'Reservation',
      transfer: 'Transfer',
      disposal: 'Disposal',
    };
    const base = map[type] || (type ? type.replace(/_/g, ' ') : '');
    return adjustmentType
      ? `${base} (${adjustmentType.replace(/_/g, ' ')})`
      : base;
  };

  // Normalize common reference formats
  const formatRef = (ref) => {
    if (!ref) return '—';
    try {
      if (typeof ref === 'object') {
        // Handle accidental object refs gracefully
        if (ref.id) return String(ref.id);
        return JSON.stringify(ref);
      }
      const s = String(ref);
      return s.includes('[object Object]')
        ? s.replace('[object Object]', 'UNKNOWN')
        : s;
    } catch (_) {
      return String(ref);
    }
  };

  const cleanText = (text) => {
    if (!text) return '—';
    const s = String(text);
    return s.includes('[object Object]')
      ? s.replace('[object Object]', 'UNKNOWN')
      : s;
  };
</script>

<template>
  <dialog id="inventory_details_modal" class="modal">
    <div class="modal-box max-w-3xl">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-lg">Inventory Details</h3>
      </div>

      <div v-if="loading" class="py-8 text-center">
        <span class="loading loading-spinner loading-md"></span>
      </div>

      <div v-else>
        <!-- Item Summary -->
        <div class="card bg-base-100 border border-gray-200 mb-4">
          <div class="card-body p-4">
            <div class="flex justify-between items-start">
              <div>
                <div class="text-sm text-gray-500">Item</div>
                <div class="text-lg font-semibold text-primaryColor">
                  {{ item?.item_name || item?.item_type_name || 'N/A' }}
                </div>
                <div class="text-sm text-gray-600">
                  {{ item?.category_name }} • {{ item?.unit_of_measure }}
                </div>
              </div>
              <span :class="statusBadgeClass" class="badge">{{
                item?.status
              }}</span>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
              <div>
                <div class="text-gray-500">Batch</div>
                <div class="font-medium">{{ item?.batch_number || 'N/A' }}</div>
              </div>
              <div>
                <div class="text-gray-500">Quantity</div>
                <div class="font-medium">
                  {{ parseFloat(item?.quantity || 0).toLocaleString() }}
                </div>
              </div>
              <div>
                <div class="text-gray-500">Unit Cost</div>
                <div class="font-medium">{{ peso(item?.unit_cost) }}</div>
              </div>
              <div>
                <div class="text-gray-500">Total Value</div>
                <div class="font-medium">{{ peso(item?.total_value) }}</div>
              </div>
              <div>
                <div class="text-gray-500">Expiry Date</div>
                <div class="font-medium">
                  {{ formatDate(item?.expiry_date) }}
                </div>
              </div>
              <div>
                <div class="text-gray-500">Received Date</div>
                <div class="font-medium">
                  {{ formatDate(item?.received_date) }}
                </div>
              </div>
              <div>
                <div class="text-gray-500">Supplier</div>
                <div class="font-medium">
                  {{ item?.supplier_name || 'N/A' }}
                </div>
              </div>
              <div>
                <div class="text-gray-500">Batch Status</div>
                <div class="font-medium capitalize">{{ item?.status }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Transactions for this item -->
        <div class="card bg-base-100 border border-gray-200">
          <div class="card-body p-4">
            <div class="flex items-center gap-2 mb-2">
              <History class="w-4 h-4 text-primaryColor" />
              <h4 class="font-semibold text-sm text-primaryColor">
                Recent Transactions
              </h4>
            </div>
            <div class="overflow-x-auto">
              <table class="table table-zebra table-xs w-full">
                <thead>
                  <tr class="bg-base-200">
                    <th>Date</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Value</th>
                    <th>Ref</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="t in transactions" :key="t.id">
                    <td>{{ formatDate(t.transaction_date) }}</td>
                    <td>
                      {{ humanizeType(t.transaction_type, t.adjustment_type) }}
                    </td>
                    <td>{{ parseFloat(t.quantity).toLocaleString() }}</td>
                    <td>
                      {{ peso(t.total_value)
                      }}<span
                        v-if="t.disposal_cost"
                        class="ml-1 text-error text-xs"
                        >(+ Disposal {{ peso(t.disposal_cost) }})</span
                      >
                    </td>
                    <td>{{ formatRef(t.reference_number) }}</td>
                    <td
                      class="max-w-[260px] truncate"
                      :title="cleanText(t.notes) || ''"
                    >
                      {{ cleanText(t.reason || t.notes) }}
                    </td>
                  </tr>
                  <tr v-if="transactions.length === 0">
                    <td colspan="6" class="text-center text-gray-500 py-3">
                      No transactions yet
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div class="flex justify-end mt-4">
        <button class="btn btn-ghost btn-sm" @click="close">Close</button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
  .modal-box {
    max-height: 90vh;
    overflow-y: auto;
  }
</style>
