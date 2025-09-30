<script setup>
  import { ref, computed, watch } from 'vue';

  const props = defineProps({
    show: { type: Boolean, default: false },
    categories: { type: Array, default: () => [] },
    itemTypes: { type: Array, default: () => [] },
    currentInventory: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    preselectedItem: { type: Object, default: null },
    prefill: { type: Object, default: null }, // { adjustment_type, reason }
  });

  const emit = defineEmits(['close', 'submit']);

  const form = ref({
    category_id: '',
    item_type_id: '',
    inventory_item_id: '',
    adjustment_type: '',
    new_quantity: '',
    reason: '',
    reference_number: '',
    notes: '',
    expiry_date: '',
    disposal_cost: '',
  });

  const filteredItemTypes = computed(() => {
    if (!form.value.category_id) return [];
    return props.itemTypes.filter(
      (t) => t.category_id == form.value.category_id
    );
  });

  const availableStock = computed(() => {
    if (!form.value.item_type_id) return [];
    return props.currentInventory.filter(
      (i) => i.item_type_id == form.value.item_type_id
    );
  });

  const selectedStock = computed(() => {
    if (!form.value.inventory_item_id) return null;
    return props.currentInventory.find(
      (i) => i.id == form.value.inventory_item_id
    );
  });

  // Auto-select stock entry when only one option is available
  watch(
    () => availableStock.value,
    (list) => {
      if (
        !form.value.inventory_item_id &&
        Array.isArray(list) &&
        list.length === 1
      ) {
        form.value.inventory_item_id = list[0].id;
      }
    },
    { immediate: false }
  );

  // Expiry detection to mirror main inventory behavior
  const isExpiredItem = computed(() => {
    if (!selectedStock.value) return false;
    if (selectedStock.value.status === 'expired') return true;
    if (selectedStock.value.expiry_date) {
      const today = new Date().toISOString().split('T')[0];
      return selectedStock.value.expiry_date <= today;
    }
    return false;
  });

  // Adjustment types based on expiry state
  const availableAdjustmentTypes = computed(() => {
    if (isExpiredItem.value) {
      return [{ value: 'disposal', label: 'Dispose Item' }];
    }
    const base = [
      { value: 'set_quantity', label: 'Set Exact Quantity' },
      { value: 'add_quantity', label: 'Add Quantity' },
      { value: 'reduce_quantity', label: 'Reduce Quantity' },
      { value: 'mark_expired', label: 'Mark as Expired' },
      { value: 'mark_damaged', label: 'Mark as Damaged' },
      { value: 'set_expiry_date', label: 'Set Expiry Date' },
    ];
    // When prefilled for disposal, expose the disposal option even if not expired
    if (props.prefill?.adjustment_type === 'disposal') {
      base.push({ value: 'disposal', label: 'Disposal' });
    }
    return base;
  });

  // Adjustment reasons list (restrict to Expiry when item is expired)
  const allReasons = [
    'Physical Count Discrepancy',
    'Received Additional Stock',
    'Theft/Loss',
    'Damage',
    'Expiry',
    'Data Entry Error',
    'Transfer to Another Location',
    'Other',
  ];

  const availableReasons = computed(() => {
    return isExpiredItem.value ? ['Expiry'] : allReasons;
  });

  // Force reason to Expiry for expired items
  watch(
    () => isExpiredItem.value,
    (expired) => {
      if (expired) {
        form.value.reason = 'Expiry';
      }
    },
    { immediate: true }
  );

  // Auto-populate reason based on selected adjustment type
  const defaultReasonByAdjustment = {
    set_quantity: 'Physical Count Discrepancy',
    add_quantity: 'Received Additional Stock',
    reduce_quantity: 'Physical Count Discrepancy',
    mark_expired: 'Expiry',
    mark_damaged: 'Damage',
    set_expiry_date: 'Expiry',
    disposal: 'Expiry',
  };

  watch(
    () => form.value.adjustment_type,
    (type) => {
      // If item is expired, keep reason forced to Expiry
      if (isExpiredItem.value) {
        form.value.reason = 'Expiry';
        return;
      }
      form.value.reason = defaultReasonByAdjustment[type] || '';
    }
  );

  const requiresQuantityInput = computed(() => {
    return ['set_quantity', 'add_quantity', 'reduce_quantity'].includes(
      form.value.adjustment_type
    );
  });

  const requiresDateInput = computed(
    () => form.value.adjustment_type === 'set_expiry_date'
  );
  const requiresDisposalCost = computed(
    () => form.value.adjustment_type === 'disposal'
  );

  const isFormValid = computed(() => {
    const hasStock = !!form.value.inventory_item_id || !!props.preselectedItem;
    const basic = hasStock && form.value.adjustment_type && form.value.reason;
    if (!basic) return false;
    if (requiresQuantityInput.value) {
      const q = parseFloat(form.value.new_quantity);
      return !isNaN(q) && q >= 0;
    }
    if (requiresDateInput.value) return !!form.value.expiry_date;
    if (requiresDisposalCost.value) {
      const c = parseFloat(form.value.disposal_cost);
      return !isNaN(c) && c >= 0;
    }
    return true;
  });

  const getMinQuantity = () =>
    form.value.adjustment_type === 'set_quantity' ? 0 : 0.001;
  const getMaxQuantity = () =>
    form.value.adjustment_type === 'reduce_quantity' && selectedStock.value
      ? parseFloat(selectedStock.value.quantity)
      : 999999;

  const resetForm = () => {
    form.value = {
      category_id: '',
      item_type_id: '',
      inventory_item_id: '',
      adjustment_type: '',
      new_quantity: '',
      reason: '',
      reference_number: '',
      notes: '',
      expiry_date: '',
      disposal_cost: '',
    };
  };

  const handleSubmit = () => {
    if (!isFormValid.value) return;
    const baseQty = parseFloat(selectedStock.value?.quantity || 0);
    let finalQuantity = baseQty;
    switch (form.value.adjustment_type) {
      case 'set_quantity':
        finalQuantity = parseFloat(form.value.new_quantity);
        break;
      case 'add_quantity':
        finalQuantity = baseQty + parseFloat(form.value.new_quantity || 0);
        break;
      case 'reduce_quantity':
        finalQuantity = baseQty - parseFloat(form.value.new_quantity || 0);
        break;
      case 'mark_expired':
      case 'mark_damaged':
      case 'disposal':
        finalQuantity = 0;
        break;
    }

    emit('submit', {
      inventory_item_id: form.value.inventory_item_id,
      adjustment_type: form.value.adjustment_type,
      new_quantity: [
        'set_quantity',
        'add_quantity',
        'reduce_quantity',
      ].includes(form.value.adjustment_type)
        ? parseFloat(form.value.new_quantity)
        : null,
      new_expiry_date:
        form.value.adjustment_type === 'set_expiry_date'
          ? form.value.expiry_date
          : null,
      disposal_cost:
        form.value.adjustment_type === 'disposal'
          ? parseFloat(form.value.disposal_cost)
          : null,
      reference_number: form.value.reference_number || null,
      reason: form.value.reason,
      notes: form.value.notes,
      quantity: finalQuantity,
    });
  };

  const closeModal = () => {
    resetForm();
    const dlg = document.getElementById('branch_inventory_adjustment_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  watch(
    () => props.show,
    (v) => {
      const dlg = document.getElementById('branch_inventory_adjustment_modal');
      if (v) {
        resetForm();
        if (props.preselectedItem) {
          const item = props.preselectedItem;
          // Resolve category by name first
          const categoryByName = props.categories.find(
            (c) => (item.category || '').toLowerCase() === c.name?.toLowerCase()
          );
          // Resolve itemType by id or by name fallback
          let resolvedItemType = null;
          if (item.item_type_id) {
            resolvedItemType = props.itemTypes.find(
              (t) => t.id == item.item_type_id
            );
          }
          if (!resolvedItemType) {
            resolvedItemType = props.itemTypes.find(
              (t) =>
                (
                  item.item_name ||
                  item.item_type_name ||
                  item.name ||
                  ''
                ).toLowerCase() === t.name?.toLowerCase()
            );
          }

          // Populate form fields
          form.value.category_id =
            resolvedItemType?.category_id || categoryByName?.id || '';
          form.value.item_type_id =
            resolvedItemType?.id || item.item_type_id || '';
          form.value.inventory_item_id = item.id || '';
        }
        // Apply prefill for adjustment type and reason if provided
        if (props.prefill) {
          if (props.prefill.adjustment_type) {
            form.value.adjustment_type = props.prefill.adjustment_type;
          }
          if (props.prefill.reason) {
            form.value.reason = props.prefill.reason;
          }
        }
        if (dlg?.showModal) dlg.showModal();
      } else {
        if (dlg?.close) dlg.close();
      }
    }
  );
</script>

<template>
  <dialog id="branch_inventory_adjustment_modal" class="modal">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">Branch Stock Adjustment</h3>

      <form @submit.prevent="handleSubmit">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Category</span>
              <span class="label-text-alt text-error">*</span>
            </label>
            <select
              v-model="form.category_id"
              class="select select-bordered w-full"
              required
              @change="
                () => {
                  form.item_type_id = '';
                  form.inventory_item_id = '';
                }
              "
            >
              <option value="">Select Category</option>
              <option
                v-for="category in categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Item Type</span>
              <span class="label-text-alt text-error">*</span>
            </label>
            <select
              v-model="form.item_type_id"
              class="select select-bordered w-full"
              required
              :disabled="!form.category_id"
              @change="
                () => {
                  form.inventory_item_id = '';
                }
              "
            >
              <option value="">Select Item Type</option>
              <option
                v-for="itemType in filteredItemTypes"
                :key="itemType.id"
                :value="itemType.id"
              >
                {{ itemType.name }}
              </option>
            </select>
          </div>

          <div class="form-control md:col-span-2">
            <label class="label">
              <span class="label-text font-medium">Stock Entry</span>
              <span class="label-text-alt text-error">*</span>
            </label>
            <select
              v-model="form.inventory_item_id"
              class="select select-bordered w-full"
              :required="!preselectedItem"
              :disabled="!form.item_type_id || !!preselectedItem"
            >
              <option value="">Select Stock Entry to Adjust</option>
              <option
                v-for="stock in availableStock"
                :key="stock.id"
                :value="stock.id"
              >
                {{
                  (stock.item_name || stock.item_type_name) +
                  ' — ' +
                  parseFloat(stock.quantity).toLocaleString() +
                  ' ' +
                  (stock.unit_of_measure || '')
                }}
              </option>
            </select>
          </div>
        </div>

        <!-- Current Stock Info / Expired Notice -->
        <div
          v-if="selectedStock"
          :class="
            isExpiredItem
              ? 'alert bg-error/10 border-error'
              : 'alert bg-success/10 border-success '
          "
          class="mb-6 w-full"
        >
          <div class="flex items-center w-full">
            <div class="w-full min-w-[300px] sm:min-w-[550px]">
              <h4 class="font-semibold">
                {{
                  isExpiredItem
                    ? 'EXPIRED ITEM - Disposal Required'
                    : 'Current Stock Information'
                }}
              </h4>
              <div class="flex flex-col gap-1 mt-1">
                <div class="flex justify-between text-sm overflow-x-auto">
                  <span class="text-sm">Item Name:</span>
                  <span class="whitespace-nowrap">{{
                    selectedStock.item_name || selectedStock.item_type_name
                  }}</span>
                </div>
                <div class="flex justify-between text-sm overflow-x-auto">
                  <span class="text-sm">Current Quantity:</span>
                  <span>{{
                    parseFloat(selectedStock.quantity).toLocaleString()
                  }}</span>
                </div>
                <div class="flex justify-between text-sm overflow-x-auto">
                  <span class="text-sm">Current Value:</span>
                  <span
                    >₱{{
                      parseFloat(
                        selectedStock.total_value || 0
                      ).toLocaleString()
                    }}</span
                  >
                </div>
                <div class="flex justify-between text-sm overflow-x-auto">
                  <span class="text-sm">Batch:</span>
                  <span>{{ selectedStock.batch_number || 'N/A' }}</span>
                </div>
                <div
                  v-if="isExpiredItem"
                  class="flex justify-between text-sm overflow-x-auto"
                >
                  <span class="text-sm">Status:</span>
                  <span class="font-bold">EXPIRED</span>
                </div>
                <div
                  v-if="isExpiredItem"
                  class="mt-2 bg-error/10 rounded text-sm p-2"
                >
                  <strong>Important:</strong>
                  This item has expired and can only be disposed of. Please
                  record the disposal cost for proper accounting.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Adjustment Type</span>
              <span class="label-text-alt text-error">*</span>
            </label>
            <select
              v-model="form.adjustment_type"
              class="select select-bordered w-full"
              required
            >
              <option value="">Select Type</option>
              <option
                v-for="t in availableAdjustmentTypes"
                :key="t.value"
                :value="t.value"
              >
                {{ t.label }}
              </option>
            </select>
          </div>

          <div
            class="form-control"
            v-if="requiresQuantityInput || requiresDisposalCost"
          >
            <label class="label">
              <span class="label-text font-medium">{{
                requiresDisposalCost ? 'Disposal Cost' : 'Quantity'
              }}</span>
              <span class="label-text-alt text-error">*</span>
            </label>
            <input
              v-if="requiresDisposalCost"
              v-model="form.disposal_cost"
              type="number"
              step="0.01"
              min="0"
              class="input input-bordered w-full"
              placeholder="Enter disposal cost (₱)"
              required
            />
            <input
              v-else
              v-model="form.new_quantity"
              type="number"
              step="0.001"
              :min="getMinQuantity()"
              :max="getMaxQuantity()"
              class="input input-bordered w-full"
              placeholder="0.000"
              required
            />
          </div>
        </div>

        <div class="form-control" v-if="requiresDateInput">
          <label class="label">
            <span class="label-text font-medium">New Expiry Date</span>
            <span class="label-text-alt text-error">*</span>
          </label>
          <input
            v-model="form.expiry_date"
            type="date"
            class="input input-bordered w-full"
            required
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Adjustment Reason</span>
              <span class="label-text-alt text-error">*</span>
            </label>
            <select
              v-model="form.reason"
              class="select select-bordered w-full"
              required
              :disabled="isExpiredItem"
            >
              <option value="">Select Reason</option>
              <option v-for="r in availableReasons" :key="r" :value="r">
                {{ r }}
              </option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Reference Number</span>
            </label>
            <input
              v-model="form.reference_number"
              type="text"
              class="input input-bordered w-full"
              placeholder="Audit #, Transfer #, etc."
            />
          </div>
        </div>

        <div class="form-control mb-6">
          <label class="label">
            <span class="label-text font-medium">Notes</span>
          </label>
          <textarea
            v-model="form.notes"
            class="textarea textarea-bordered w-full"
            rows="3"
            placeholder="Detailed explanation of the adjustment..."
          ></textarea>
        </div>

        <div class="modal-action">
          <button
            type="button"
            class="btn btn-ghost btn-sm font-thin"
            @click="closeModal"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-sm font-thin bg-primaryColor text-white"
            :disabled="loading || !isFormValid"
          >
            {{ loading ? 'Applying adjustment...' : 'Apply Adjustment' }}
          </button>
        </div>
      </form>
    </div>
  </dialog>
</template>

<style scoped>
  .modal-box {
    max-height: 90vh;
    overflow-y: auto;
  }
</style>
