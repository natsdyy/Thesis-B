<script setup>
  import { ref, computed, watch } from 'vue';
  import { Package, TriangleAlert } from 'lucide-vue-next';

  // Props
  const props = defineProps({
    show: {
      type: Boolean,
      default: false,
    },
    categories: {
      type: Array,
      default: () => [],
    },
    itemTypes: {
      type: Array,
      default: () => [],
    },
    currentInventory: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    preselectedItem: {
      type: Object,
      default: null,
    },
  });

  // Emits
  const emit = defineEmits(['close', 'submit']);

  // Local state
  const adjustmentForm = ref({
    category_id: '',
    item_type_id: '',
    inventory_item_id: '',
    adjustment_type: '',
    new_quantity: '',
    reason: '',
    reference_number: '',
    notes: '',
    expiry_date: '',
    disposal_cost: '', // Add disposal cost field
  });

  const closeModal = () => {
    resetForm();
    const dlg = document.getElementById('inventory_adjustment_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  watch(
    () => props.show,
    (newVal) => {
      const dlg = document.getElementById('inventory_adjustment_modal');
      if (newVal) {
        resetForm();
        if (props.preselectedItem) {
          const item = props.preselectedItem;
          const itemType = props.itemTypes.find(
            (t) => t.id === item.item_type_id
          );
          if (itemType) {
            adjustmentForm.value.category_id = itemType.category_id;
            adjustmentForm.value.item_type_id = item.item_type_id;
            adjustmentForm.value.inventory_item_id = item.id;
          }
        }
        if (dlg?.showModal) dlg.showModal();
      } else {
        if (dlg?.close) dlg.close();
      }
    }
  );

  // Computed properties
  const filteredItemTypes = computed(() => {
    if (!adjustmentForm.value.category_id) return [];
    return props.itemTypes.filter(
      (type) => type.category_id == adjustmentForm.value.category_id
    );
  });

  const availableStock = computed(() => {
    if (!adjustmentForm.value.item_type_id) return [];
    return props.currentInventory.filter(
      (item) => item.item_type_id == adjustmentForm.value.item_type_id
    );
  });

  const selectedStock = computed(() => {
    if (!adjustmentForm.value.inventory_item_id) return null;
    return props.currentInventory.find(
      (item) => item.id == adjustmentForm.value.inventory_item_id
    );
  });

  const requiresQuantityInput = computed(() => {
    return ['set_quantity', 'add_quantity', 'reduce_quantity'].includes(
      adjustmentForm.value.adjustment_type
    );
  });

  const requiresDateInput = computed(() => {
    return adjustmentForm.value.adjustment_type === 'set_expiry_date';
  });

  // Check if selected stock is expired
  const isExpiredItem = computed(() => {
    if (!selectedStock.value) return false;

    // Check if status is explicitly expired
    if (selectedStock.value.status === 'expired') return true;

    // Check if expiry date has passed
    if (selectedStock.value.expiry_date) {
      const today = new Date().toISOString().split('T')[0];
      return selectedStock.value.expiry_date <= today;
    }

    return false;
  });

  // Get available adjustment types based on item status
  const availableAdjustmentTypes = computed(() => {
    if (isExpiredItem.value) {
      // For expired items, only allow disposal
      return [{ value: 'disposal', label: 'Dispose Item' }];
    }

    // For non-expired items, allow all adjustment types
    return [
      { value: 'set_quantity', label: 'Set Exact Quantity' },
      { value: 'add_quantity', label: 'Add Quantity' },
      { value: 'reduce_quantity', label: 'Reduce Quantity' },
      { value: 'mark_expired', label: 'Mark as Expired' },
      { value: 'mark_damaged', label: 'Mark as Damaged' },
      { value: 'set_expiry_date', label: 'Set Expiry Date' },
    ];
  });

  // Check if disposal cost is required
  const requiresDisposalCost = computed(() => {
    return adjustmentForm.value.adjustment_type === 'disposal';
  });

  const isFormValid = computed(() => {
    const basicValid =
      adjustmentForm.value.inventory_item_id &&
      adjustmentForm.value.adjustment_type &&
      adjustmentForm.value.reason &&
      adjustmentForm.value.notes;

    if (!basicValid) return false;

    if (requiresQuantityInput.value) {
      const qty = parseFloat(adjustmentForm.value.new_quantity);
      return !isNaN(qty) && qty >= 0;
    }

    if (requiresDateInput.value) {
      return !!adjustmentForm.value.expiry_date;
    }

    if (requiresDisposalCost.value) {
      const disposalCost = parseFloat(adjustmentForm.value.disposal_cost);
      return !isNaN(disposalCost) && disposalCost >= 0;
    }

    return true;
  });

  const adjustmentPreview = computed(() => {
    if (!selectedStock.value || !adjustmentForm.value.adjustment_type)
      return null;

    const currentQty = parseFloat(selectedStock.value.quantity);
    const unitCost = parseFloat(selectedStock.value.unit_cost);
    let newQuantity = currentQty;

    switch (adjustmentForm.value.adjustment_type) {
      case 'set_quantity':
        newQuantity = parseFloat(adjustmentForm.value.new_quantity) || 0;
        break;
      case 'add_quantity':
        newQuantity =
          currentQty + (parseFloat(adjustmentForm.value.new_quantity) || 0);
        break;
      case 'reduce_quantity':
        newQuantity =
          currentQty - (parseFloat(adjustmentForm.value.new_quantity) || 0);
        break;
      case 'mark_expired':
      case 'mark_damaged':
      case 'disposal':
        newQuantity = 0;
        break;
    }

    const difference = newQuantity - currentQty;
    const valueChange = difference * unitCost;

    return {
      newQuantity,
      difference,
      valueChange,
    };
  });

  // Methods
  const formatStockOption = (stock) => {
    const name = stock.item_name || stock.item_type_name || 'Unnamed Item';
    const qty = parseFloat(stock.quantity).toLocaleString();
    const batch = stock.batch_number ? ` (Batch: ${stock.batch_number})` : '';
    const expiry = stock.expiry_date
      ? ` - Exp: ${formatDate(stock.expiry_date)}`
      : '';
    const status =
      stock.status !== 'available' ? ` [${stock.status.toUpperCase()}]` : '';
    return `${name} — ${qty} ${stock.unit_of_measure}${batch}${expiry}${status}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getQuantityLabel = () => {
    switch (adjustmentForm.value.adjustment_type) {
      case 'set_quantity':
        return 'New Quantity';
      case 'add_quantity':
        return 'Quantity to Add';
      case 'reduce_quantity':
        return 'Quantity to Reduce';
      case 'disposal':
        return 'Disposal Cost';
      default:
        return 'Quantity';
    }
  };

  const getQuantityPlaceholder = () => {
    switch (adjustmentForm.value.adjustment_type) {
      case 'set_quantity':
        return 'Enter exact quantity';
      case 'add_quantity':
        return 'Enter quantity to add';
      case 'reduce_quantity':
        return 'Enter quantity to reduce';
      default:
        return '0.000';
    }
  };

  const getQuantityHint = () => {
    if (!selectedStock.value) return '';
    const current = parseFloat(selectedStock.value.quantity);

    switch (adjustmentForm.value.adjustment_type) {
      case 'set_quantity':
        return 'Will replace current quantity';
      case 'add_quantity':
        return 'Will be added to current quantity';
      case 'reduce_quantity':
        return `Max: ${current} ${selectedStock.value.unit_of_measure}`;
      default:
        return '';
    }
  };

  const getMinQuantity = () => {
    switch (adjustmentForm.value.adjustment_type) {
      case 'set_quantity':
        return 0;
      case 'add_quantity':
        return 0.001;
      case 'reduce_quantity':
        return 0.001;
      default:
        return 0;
    }
  };

  const getMaxQuantity = () => {
    if (
      adjustmentForm.value.adjustment_type === 'reduce_quantity' &&
      selectedStock.value
    ) {
      return parseFloat(selectedStock.value.quantity);
    }
    return 999999;
  };

  const getPreviewLabel = () => {
    switch (adjustmentForm.value.adjustment_type) {
      case 'mark_expired':
      case 'mark_damaged':
        return 'Final Quantity';
      default:
        return 'New Quantity';
    }
  };

  const getSubmitButtonText = () => {
    switch (adjustmentForm.value.adjustment_type) {
      case 'mark_expired':
        return 'Mark as Expired';
      case 'mark_damaged':
        return 'Mark as Damaged';
      case 'disposal':
        return 'Dispose Item';
      default:
        return 'Apply Adjustment';
    }
  };

  const getSubmitButtonClass = () => {
    switch (adjustmentForm.value.adjustment_type) {
      case 'mark_expired':
      case 'mark_damaged':
      case 'disposal':
        return 'bg-error text-white';
      case 'reduce_quantity':
        return 'bg-warning text-white';
      default:
        return 'bg-primaryColor text-white';
    }
  };

  const onCategoryChange = () => {
    adjustmentForm.value.item_type_id = '';
    adjustmentForm.value.inventory_item_id = '';
  };

  const onItemTypeChange = () => {
    adjustmentForm.value.inventory_item_id = '';
  };

  const onAdjustmentTypeChange = () => {
    adjustmentForm.value.new_quantity = '';
    adjustmentForm.value.disposal_cost = '';
    if (adjustmentForm.value.adjustment_type !== 'set_expiry_date') {
      adjustmentForm.value.expiry_date = '';
    }
  };

  const resetForm = () => {
    adjustmentForm.value = {
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

    let finalQuantity;
    switch (adjustmentForm.value.adjustment_type) {
      case 'set_quantity':
        finalQuantity = parseFloat(adjustmentForm.value.new_quantity);
        break;
      case 'add_quantity':
        finalQuantity =
          parseFloat(selectedStock.value.quantity) +
          parseFloat(adjustmentForm.value.new_quantity);
        break;
      case 'reduce_quantity':
        finalQuantity =
          parseFloat(selectedStock.value.quantity) -
          parseFloat(adjustmentForm.value.new_quantity);
        break;
      case 'mark_expired':
      case 'mark_damaged':
      case 'disposal':
        finalQuantity = 0;
        break;
      default:
        finalQuantity = parseFloat(selectedStock.value.quantity);
    }

    const adjustmentData = {
      inventory_item_id: adjustmentForm.value.inventory_item_id,
      transaction_type: 'adjustment',
      quantity: finalQuantity,
      new_quantity: [
        'set_quantity',
        'add_quantity',
        'reduce_quantity',
      ].includes(adjustmentForm.value.adjustment_type)
        ? parseFloat(adjustmentForm.value.new_quantity)
        : null,
      reference_number: adjustmentForm.value.reference_number || null,
      reason: adjustmentForm.value.reason,
      notes: adjustmentForm.value.notes,
      performed_by: 'SCM User',
      transaction_date: new Date(),
      adjustment_type: adjustmentForm.value.adjustment_type,
      new_expiry_date:
        adjustmentForm.value.adjustment_type === 'set_expiry_date'
          ? adjustmentForm.value.expiry_date
          : null,
      disposal_cost:
        adjustmentForm.value.adjustment_type === 'disposal'
          ? parseFloat(adjustmentForm.value.disposal_cost)
          : null,
    };

    emit('submit', adjustmentData);
  };

  // Watchers
  watch(
    () => props.show,
    (newVal) => {
      if (newVal) {
        resetForm();

        // If a preselected item is provided, populate the form
        if (props.preselectedItem) {
          const item = props.preselectedItem;
          // Find the category and item type
          const itemType = props.itemTypes.find(
            (type) => type.id === item.item_type_id
          );
          if (itemType) {
            adjustmentForm.value.category_id = itemType.category_id;
            adjustmentForm.value.item_type_id = item.item_type_id;
            adjustmentForm.value.inventory_item_id = item.id;
          }
        }
      }
    }
  );
</script>

<template>
  <dialog id="inventory_adjustment_modal" class="modal">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">Stock Adjustment</h3>

      <form @submit.prevent="handleSubmit">
        <!-- Item Selection -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Category</span>
              <span class="label-text-alt text-error">*</span>
            </label>
            <select
              v-model="adjustmentForm.category_id"
              class="select select-bordered w-full"
              required
              @change="onCategoryChange"
              disabled
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
              disabled
              v-model="adjustmentForm.item_type_id"
              class="select select-bordered w-full"
              required
              :disabled="!adjustmentForm.category_id"
              @change="onItemTypeChange"
              
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
              v-model="adjustmentForm.inventory_item_id"
              class="select select-bordered w-full"
              required
              :disabled="!adjustmentForm.item_type_id"
            >
              <option value="">Select Stock Entry to Adjust</option>
              <option
                v-for="stock in availableStock"
                :key="stock.id"
                :value="stock.id"
              >
                {{ formatStockOption(stock) }}
              </option>
            </select>
          </div>
        </div>

        <!-- Current Stock Info -->
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
            <!-- Make sure the container is responsive -->
            <div class="w-full min-w-[300px] sm:min-w-[550px]">
              <h4 class="font-semibold">
                {{
                  isExpiredItem
                    ? 'EXPIRED ITEM - Disposal Required'
                    : 'Current Stock Information'
                }}
              </h4>
              <div class="flex flex-col gap-1 mt-1">
                <!-- Make sure the content does not overflow on smaller screens -->
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
                      parseFloat(selectedStock.total_value).toLocaleString()
                    }}</span
                  >
                </div>

                <div class="flex justify-between text-sm overflow-x-auto">
                  <span class="text-sm">Batch:</span>
                  <span>{{ selectedStock.batch_number }}</span>
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
                  class="mt-2 bg-error/10 rounded text-sm"
                >
                  <strong> Important:</strong>
                  This item has expired and can only be disposed of. Please
                  record the disposal cost for proper accounting.
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Adjustment Details -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Adjustment Type</span>
              <span class="label-text-alt text-error">*</span>
            </label>
            <select
              v-model="adjustmentForm.adjustment_type"
              class="select select-bordered w-full"
              required
              @change="onAdjustmentTypeChange"
            >
              <option value="">Select Type</option>
              <option
                v-for="type in availableAdjustmentTypes"
                :key="type.value"
                :value="type.value"
              >
                {{ type.label }}
              </option>
            </select>
          </div>

          <div
            class="form-control"
            v-if="requiresQuantityInput || requiresDisposalCost"
          >
            <label class="label">
              <span class="label-text font-medium">
                {{ getQuantityLabel() }}
              </span>
              <span class="label-text-alt text-error">*</span>
            </label>
            <input
              v-if="requiresDisposalCost"
              v-model="adjustmentForm.disposal_cost"
              type="number"
              step="0.01"
              min="0"
              class="input input-bordered w-full"
              placeholder="Enter disposal cost (₱)"
              required
            />
            <input
              v-else
              v-model="adjustmentForm.new_quantity"
              type="number"
              step="0.001"
              :min="getMinQuantity()"
              :max="getMaxQuantity()"
              class="input input-bordered w-full"
              :placeholder="getQuantityPlaceholder()"
              required
            />
            <div class="label">
              <span class="label-text-alt">
                {{
                  requiresDisposalCost
                    ? 'Enter the cost incurred for disposing this expired item'
                    : getQuantityHint()
                }}
              </span>
            </div>
          </div>
        </div>

        <!-- Expiry date input (conditional) -->
        <div class="form-control" v-if="requiresDateInput">
          <label class="label">
            <span class="label-text font-medium">New Expiry Date</span>
            <span class="label-text-alt text-error">*</span>
          </label>
          <input
            v-model="adjustmentForm.expiry_date"
            type="date"
            class="input input-bordered w-full"
            required
          />
          <div class="label">
            <span class="label-text-alt"
              >Set or change the expiry date for this stock entry.</span
            >
          </div>
        </div>

        <!-- Reason and Notes -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Adjustment Reason</span>
              <span class="label-text-alt text-error">*</span>
            </label>
            <select
              v-model="adjustmentForm.reason"
              class="select select-bordered w-full"
              required
            >
              <option value="">Select Reason</option>
              <option value="Physical Count Discrepancy">
                Physical Count Discrepancy
              </option>
              <option value="Received Additional Stock">
                Received Additional Stock
              </option>
              <option value="Theft/Loss">Theft/Loss</option>
              <option value="Damage">Damage</option>
              <option value="Expiry">Expiry</option>
              <option value="Data Entry Error">Data Entry Error</option>
              <option value="Transfer to Another Location">
                Transfer to Another Location
              </option>
              <option value="Quality Control Rejection">
                Quality Control Rejection
              </option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Reference Number</span>
            </label>
            <input
              v-model="adjustmentForm.reference_number"
              type="text"
              class="input input-bordered w-full"
              placeholder="Audit #, Transfer #, etc."
            />
          </div>
        </div>

        <div class="form-control mb-6">
          <label class="label">
            <span class="label-text font-medium">Notes</span>
            <span class="label-text-alt text-error">*</span>
          </label>
          <textarea
            v-model="adjustmentForm.notes"
            class="textarea textarea-bordered w-full"
            rows="4"
            placeholder="Detailed explanation of the adjustment..."
            required
          ></textarea>
        </div>

        <!-- Preview Section -->
        <div v-if="adjustmentPreview" class="alert mb-6 w-full">
          <div class="flex items-center w-full">
            <!-- Make sure the container is responsive and has a min-width for smaller screens -->
            <div class="w-full min-w-[300px] sm:min-w-[550px]">
              <h4 class="font-semibold">Adjustment Preview</h4>
              <div class="flex flex-col gap-1 mt-1">
                <div class="flex justify-between text-sm overflow-x-auto">
                  <span class="text-sm">Current Quantity:</span>
                  <span
                    >{{
                      parseFloat(selectedStock?.quantity || 0).toLocaleString()
                    }}
                    {{ selectedStock?.unit_of_measure }}</span
                  >
                </div>
                <div class="flex justify-between text-sm overflow-x-auto">
                  <span class="text-sm">{{ getPreviewLabel() }}:</span>
                  <span
                    >{{ adjustmentPreview.newQuantity.toLocaleString() }}
                    {{ selectedStock?.unit_of_measure }}</span
                  >
                </div>
                <div
                  class="flex justify-between text-sm overflow-x-auto font-medium"
                  :class="
                    adjustmentPreview.difference >= 0
                      ? 'text-success'
                      : 'text-error'
                  "
                >
                  <span class="text-sm">Change:</span>
                  <span
                    >{{ adjustmentPreview.difference >= 0 ? '+' : ''
                    }}{{ adjustmentPreview.difference.toLocaleString() }}
                    {{ selectedStock?.unit_of_measure }}</span
                  >
                </div>
                <div class="flex justify-between text-sm overflow-x-auto">
                  <span class="text-sm">Value Impact:</span>
                  <span
                    :class="
                      adjustmentPreview.valueChange >= 0
                        ? 'text-success'
                        : 'text-error'
                    "
                  >
                    {{ adjustmentPreview.valueChange >= 0 ? '+' : '' }}₱{{
                      Math.abs(adjustmentPreview.valueChange).toLocaleString()
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>
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
            class="btn btn-sm font-thin"
            :class="getSubmitButtonClass()"
            :disabled="loading || !isFormValid"
          >
            <span
              v-if="loading"
              class="loading loading-spinner loading-sm mr-2"
            ></span>
            {{ getSubmitButtonText() }}
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

  .form-control {
    margin-bottom: 0.5rem;
  }

  .input:focus,
  .select:focus,
  .textarea:focus {
    outline: none;
    border-color: var(--primaryColor);
    box-shadow: 0 0 0 2px rgba(var(--primaryColor-rgb), 0.1);
  }

  .btn:hover {
    transform: translateY(-1px);
    transition: all 0.2s ease;
  }

  .alert {
    border-radius: 0.5rem;
    padding: 1rem;
  }

  @media (max-width: 768px) {
    .modal-box {
      margin: 1rem;
      max-width: calc(100vw - 2rem);
    }

    .grid {
      grid-template-columns: 1fr;
    }
  }
</style>
