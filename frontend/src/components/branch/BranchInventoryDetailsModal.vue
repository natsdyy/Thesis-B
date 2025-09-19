<script setup>
  import { ref, watch, computed } from 'vue';

  const props = defineProps({
    show: { type: Boolean, default: false },
    item: { type: Object, default: null },
    type: { type: String, default: 'scm' }, // 'scm' | 'production'
  });

  const emit = defineEmits(['close']);

  const close = () => {
    const dlg = document.getElementById('branch_inventory_details_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  watch(
    () => props.show,
    (val) => {
      const dlg = document.getElementById('branch_inventory_details_modal');
      if (val) {
        if (dlg?.showModal) dlg.showModal();
      } else if (dlg?.close) {
        dlg.close();
      }
    },
    { immediate: true }
  );

  const itemName = computed(
    () => props.item?.item_name || props.item?.name || 'N/A'
  );
  const categoryName = computed(
    () => props.item?.category || props.item?.category_name || '—'
  );
  const unit = computed(
    () => props.item?.unit || props.item?.unit_of_measure || '—'
  );
  const quantity = computed(() => {
    const q = parseFloat(
      props.item?.quantity ?? props.item?.current_stock ?? 0
    );
    return Number.isFinite(q) ? q : 0;
  });
  const batchNumber = computed(
    () => props.item?.batch_number || props.item?.batch || 'N/A'
  );
  const rawStatus = computed(() => props.item?.status || '—');
  const status = computed(() => {
    const map = {
      low_stock: 'Low Stock',
      expired: 'Expired',
      available: 'Available',
      reserved: 'Reserved',
      damaged: 'Damaged',
      consumed: 'Consumed',
    };
    const s = rawStatus.value;
    return map[s] || (typeof s === 'string' ? s.replace(/_/g, ' ') : '—');
  });
  const expiry = computed(() => props.item?.expiry_date || null);
  const received = computed(() => props.item?.received_date || null);
  const lastUpdated = computed(
    () => props.item?.last_updated || props.item?.updated_at || null
  );
  const minimumStock = computed(() =>
    parseFloat(props.item?.minimum_stock ?? 0)
  );
  const variance = computed(() => quantity.value - minimumStock.value);
  const unitCost = computed(() => parseFloat(props.item?.unit_cost ?? 0));
  const totalValue = computed(() => parseFloat(props.item?.total_value ?? 0));
  const supplier = computed(() => props.item?.supplier_name || 'N/A');
  const itemTypeLabel = computed(() => {
    const t = props.item?.item_type || props.type || 'scm';
    return (String(t).charAt(0).toUpperCase() + String(t).slice(1)).replace(
      /_/g,
      ' '
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

  const statusBadgeClass = computed(() => {
    const map = {
      available: 'badge-sm border-none font-medium bg-success/20 text-success',
      reserved: 'badge-sm border-none font-medium bg-warning/20 text-warning',
      expired: 'badge-sm border-none font-medium bg-error/20 text-error',
      damaged: 'badge-sm border-none font-medium bg-error/20 text-error',
      consumed: 'badge-sm border-none font-medium bg-neutral/20 text-neutral',
    };
    return (
      map[rawStatus.value] ||
      'badge-sm border-none font-medium bg-neutral/20 text-neutral'
    );
  });

  const peso = (n) => `₱${Number.parseFloat(n || 0).toLocaleString()}`;
</script>

<template>
  <dialog id="branch_inventory_details_modal" class="modal" :open="show">
    <div class="modal-box max-w-2xl">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-lg">Item Details</h3>
      </div>

      <div class="card bg-base-100 border border-gray-200 mb-4">
        <div class="card-body p-4">
          <div class="flex justify-between items-start">
            <div>
              <div class="text-sm text-gray-500">Item</div>
              <div class="text-lg font-semibold text-primaryColor">
                {{ itemName }}
              </div>
              <div class="text-sm text-gray-600">
                {{ categoryName }} • {{ unit }}
              </div>
            </div>
            <span :class="statusBadgeClass" class="badge">{{ status }}</span>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
            <div>
              <div class="text-gray-500">Type</div>
              <div class="font-medium">{{ itemTypeLabel }}</div>
            </div>
            <div>
              <div class="text-gray-500">Quantity</div>
              <div class="font-medium">{{ quantity.toLocaleString() }}</div>
            </div>
            <div>
              <div class="text-gray-500">Batch</div>
              <div class="font-medium">{{ batchNumber }}</div>
            </div>
            <div>
              <div class="text-gray-500">Expiry Date</div>
              <div class="font-medium">{{ formatDate(expiry) }}</div>
            </div>
            <div>
              <div class="text-gray-500">Received Date</div>
              <div class="font-medium">{{ formatDate(received) }}</div>
            </div>
            <div>
              <div class="text-gray-500">Min Level</div>
              <div class="font-medium">{{ minimumStock.toLocaleString() }}</div>
            </div>
            <div>
              <div class="text-gray-500">Variance</div>
              <div class="font-medium">{{ variance.toLocaleString() }}</div>
            </div>
            <div>
              <div class="text-gray-500">Unit Cost</div>
              <div class="font-medium">{{ peso(unitCost) }}</div>
            </div>
            <div>
              <div class="text-gray-500">Total Value</div>
              <div class="font-medium">{{ peso(totalValue) }}</div>
            </div>
            <div>
              <div class="text-gray-500">Supplier</div>
              <div class="font-medium">{{ supplier }}</div>
            </div>
            <div>
              <div class="text-gray-500">Last Updated</div>
              <div class="font-medium">{{ formatDate(lastUpdated) }}</div>
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
