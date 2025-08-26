<script setup>
  import { ref, computed, watch } from 'vue';
  import { Plus, X, Package } from 'lucide-vue-next';

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
  });

  // Emits
  const emit = defineEmits(['close', 'submit']);

  // Local state
  const usageType = ref('single');
  const singleItem = ref({
    category_id: '',
    item_type_id: '',
    inventory_item_id: '',
    quantity: '',
    reason: '',
    reference_number: '',
    notes: '',
  });

  const closeModal = () => {
    resetForm();
    const dlg = document.getElementById('inventory_consumption_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  watch(
    () => props.show,
    (newVal) => {
      const dlg = document.getElementById('inventory_consumption_modal');
      if (newVal) {
        resetForm();
        if (dlg?.showModal) dlg.showModal();
      } else {
        if (dlg?.close) dlg.close();
      }
    }
  );

  const bulkItems = ref([]);
  const bulkReference = ref('');
  const bulkNotes = ref('');

  // Computed properties
  const filteredItemTypes = computed(() => {
    if (!singleItem.value.category_id) return [];
    return props.itemTypes.filter(
      (type) => type.category_id == singleItem.value.category_id
    );
  });

  const availableStock = computed(() => {
    if (!singleItem.value.item_type_id) return [];
    return props.currentInventory.filter(
      (item) =>
        item.item_type_id == singleItem.value.item_type_id &&
        item.status === 'available' &&
        parseFloat(item.quantity) > 0
    );
  });

  const selectedStock = computed(() => {
    if (!singleItem.value.inventory_item_id) return null;
    return props.currentInventory.find(
      (item) => item.id == singleItem.value.inventory_item_id
    );
  });

  // Helpers
  const getAvailableQty = (inventory_item_id) => {
    const s = props.currentInventory.find((i) => i.id == inventory_item_id);
    return parseFloat(s?.quantity || 0);
  };

  // Single-mode validation message
  const singleQtyError = computed(() => {
    if (!selectedStock.value || singleItem.value.quantity === '') return '';
    const qty = parseFloat(singleItem.value.quantity || 0);
    if (isNaN(qty) || qty <= 0) return 'Quantity must be greater than 0';
    if (qty > parseFloat(selectedStock.value.quantity || 0))
      return `Exceeds available (${parseFloat(selectedStock.value.quantity || 0).toLocaleString()})`;
    return '';
  });

  // Bulk-mode per-row validation messages
  const bulkErrors = computed(() =>
    bulkItems.value.map((it) => {
      if (!it || !it.inventory_item_id || it.quantity === '') return '';
      const qty = parseFloat(it.quantity || 0);
      if (isNaN(qty) || qty <= 0) return 'Quantity must be greater than 0';
      const avail = getAvailableQty(it.inventory_item_id);
      if (qty > avail) return `Exceeds available (${avail.toLocaleString()})`;
      return '';
    })
  );

  const isFormValid = computed(() => {
    if (usageType.value === 'single') {
      if (
        !singleItem.value.inventory_item_id ||
        singleItem.value.quantity === '' ||
        !singleItem.value.reason
      )
        return false;
      return singleQtyError.value === '';
    }
    // bulk
    if (bulkItems.value.length === 0) return false;
    return bulkItems.value.every((it, idx) => {
      if (!it.inventory_item_id || it.quantity === '' || !it.reason)
        return false;
      return bulkErrors.value[idx] === '';
    });
  });

  // Methods
  const formatStockOption = (stock) => {
    const name = stock.item_name || stock.item_type_name || 'Unnamed Item';
    const qty = parseFloat(stock.quantity).toLocaleString();
    const batch = stock.batch_number ? ` (Batch: ${stock.batch_number})` : '';
    const expiry = stock.expiry_date
      ? ` - Exp: ${formatDate(stock.expiry_date)}`
      : '';
    return `${name} — ${qty} ${stock.unit_of_measure}${batch}${expiry}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const onCategoryChange = () => {
    singleItem.value.item_type_id = '';
    singleItem.value.inventory_item_id = '';
  };

  const onItemTypeChange = () => {
    singleItem.value.inventory_item_id = '';
  };

  const addBulkItem = () => {
    bulkItems.value.push({
      category_id: '',
      item_type_id: '',
      inventory_item_id: '',
      quantity: '',
      reason: '',
      notes: '',
    });
  };

  const removeBulkItem = (index) => {
    bulkItems.value.splice(index, 1);
  };

  const onBulkCategoryChange = (index) => {
    bulkItems.value[index].item_type_id = '';
    bulkItems.value[index].inventory_item_id = '';
  };

  const onBulkItemTypeChange = (index) => {
    bulkItems.value[index].inventory_item_id = '';
  };

  const getBulkFilteredItemTypes = (categoryId) => {
    if (!categoryId) return [];
    return props.itemTypes.filter((type) => type.category_id == categoryId);
  };

  const getBulkAvailableStock = (itemTypeId) => {
    if (!itemTypeId) return [];
    return props.currentInventory.filter(
      (item) =>
        item.item_type_id == itemTypeId &&
        item.status === 'available' &&
        parseFloat(item.quantity) > 0
    );
  };

  const resetForm = () => {
    usageType.value = 'single';
    singleItem.value = {
      category_id: '',
      item_type_id: '',
      inventory_item_id: '',
      quantity: '',
      reason: '',
      reference_number: '',
      notes: '',
    };
    bulkItems.value = [];
    bulkReference.value = '';
    bulkNotes.value = '';
  };

  const handleSubmit = () => {
    if (usageType.value === 'single') {
      const consumptionData = {
        items: [
          {
            inventory_item_id: singleItem.value.inventory_item_id,
            quantity: parseFloat(singleItem.value.quantity),
            reason: singleItem.value.reason,
          },
        ],
        performed_by: 'SCM User',
        reference_number: singleItem.value.reference_number,
        notes: singleItem.value.notes,
      };
      emit('submit', consumptionData);
    } else {
      const consumptionData = {
        items: bulkItems.value.map((item) => ({
          inventory_item_id: item.inventory_item_id,
          quantity: parseFloat(item.quantity),
          reason: item.reason,
          notes: item.notes,
        })),
        performed_by: 'SCM User',
        reference_number: bulkReference.value,
        notes: bulkNotes.value,
      };
      emit('submit', consumptionData);
    }
  };

  // Watchers
  watch(
    () => props.show,
    (newVal) => {
      if (newVal) {
        resetForm();
      }
    }
  );
</script>

<template>
  <dialog id="inventory_consumption_modal" class="modal">
    <div class="modal-box max-w-3xl">
      <h3 class="font-bold text-lg mb-4">Record Inventory Usage</h3>

      <form @submit.prevent="handleSubmit">
        <!-- Single Item or Bulk Selection -->
        <div class="form-control mb-6">
          <label class="label">
            <span class="label-text font-medium">Usage Type</span>
          </label>
          <div class="flex gap-4">
            <label class="cursor-pointer label">
              <input
                type="radio"
                v-model="usageType"
                value="single"
                class="radio radio-sm checked:text-primaryColor"
              />
              <span class="label-text ml-2">Single Item</span>
            </label>
            <label class="cursor-pointer label">
              <input
                type="radio"
                v-model="usageType"
                value="bulk"
                class="radio radio-sm checked:text-primaryColor"
              />
              <span class="label-text ml-2">Multiple Items</span>
            </label>
          </div>
        </div>

        <!-- Single Item Form -->
        <div v-if="usageType === 'single'" class="space-y-4 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Category</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <select
                v-model="singleItem.category_id"
                class="select select-bordered w-full"
                required
                @change="onCategoryChange"
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
                v-model="singleItem.item_type_id"
                class="select select-bordered w-full"
                required
                :disabled="!singleItem.category_id"
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

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Available Stock</span>
              </label>
              <select
                v-model="singleItem.inventory_item_id"
                class="select select-bordered w-full"
                required
                :disabled="!singleItem.item_type_id"
              >
                <option value="">Select Stock Entry</option>
                <option
                  v-for="stock in availableStock"
                  :key="stock.id"
                  :value="stock.id"
                >
                  {{ formatStockOption(stock) }}
                </option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Quantity Used</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <input
                v-model="singleItem.quantity"
                type="number"
                step="0.001"
                min="0.001"
                :max="selectedStock?.quantity || 999999"
                class="input input-bordered w-full"
                placeholder="0.000"
                required
                @input="
                  () => {
                    const max = parseFloat(selectedStock?.quantity || 0);
                    let v = parseFloat(singleItem.quantity || 0);
                    if (isNaN(v) || v < 0) v = 0;
                    if (v > max) v = max;
                    singleItem.quantity = v ? v : '';
                  }
                "
              />
              <div class="label">
                <span class="label-text-alt">
                  Available: {{ selectedStock?.quantity || 0 }}
                  {{ selectedStock?.unit_of_measure || '' }}
                </span>
                <span v-if="singleQtyError" class="label-text-alt text-error">{{
                  singleQtyError
                }}</span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Usage Reason</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <select
                v-model="singleItem.reason"
                class="select select-bordered w-full"
                required
              >
                <option value="">Select Reason</option>
                <option value="Kitchen Usage">Kitchen Usage</option>
                <option value="Preparation">Food Preparation</option>
                <option value="Service">Customer Service</option>
                <option value="Cleaning">Cleaning/Maintenance</option>
                <option value="Training">Staff Training</option>
                <option value="Waste">Waste/Spoilage</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Reference Number</span>
              </label>
              <input
                v-model="singleItem.reference_number"
                type="text"
                class="input input-bordered w-full"
                placeholder="Order #, Recipe #, etc."
              />
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Notes</span>
            </label>
            <textarea
              v-model="singleItem.notes"
              class="textarea textarea-bordered w-full"
              rows="3"
              placeholder="Additional details about the usage..."
            ></textarea>
          </div>
        </div>

        <!-- Bulk Items Form -->
        <div v-if="usageType === 'bulk'" class="space-y-4 mb-6">
          <div class="flex justify-between items-center">
            <h4 class="font-semibold text-primaryColor">Items to Consume</h4>
            <button
              type="button"
              class="btn btn-sm btn-outline text-primaryColor"
              @click="addBulkItem"
            >
              <Plus class="w-4 h-4 mr-1" />
              Add Item
            </button>
          </div>

          <div
            v-if="bulkItems.length === 0"
            class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg"
          >
            <Package class="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p class="text-gray-500">
              No items added yet. Click "Add Item" to start.
            </p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="(item, index) in bulkItems"
              :key="index"
              class="card bg-base-100 border border-gray-200"
            >
              <div class="card-body p-4">
                <div class="flex justify-between items-start mb-4">
                  <h5 class="font-medium">Item {{ index + 1 }}</h5>
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm text-error"
                    @click="removeBulkItem(index)"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-medium">Category</span>
                    </label>
                    <select
                      v-model="item.category_id"
                      class="select select-bordered select-sm w-full"
                      @change="onBulkCategoryChange(index)"
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
                    </label>
                    <select
                      v-model="item.item_type_id"
                      class="select select-bordered select-sm w-full"
                      :disabled="!item.category_id"
                      @change="onBulkItemTypeChange(index)"
                    >
                      <option value="">Select Item Type</option>
                      <option
                        v-for="itemType in getBulkFilteredItemTypes(
                          item.category_id
                        )"
                        :key="itemType.id"
                        :value="itemType.id"
                      >
                        {{ itemType.name }}
                      </option>
                    </select>
                  </div>

                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-medium">Stock Entry</span>
                    </label>
                    <select
                      v-model="item.inventory_item_id"
                      class="select select-bordered select-sm w-full"
                      :disabled="!item.item_type_id"
                    >
                      <option value="">Select Stock</option>
                      <option
                        v-for="stock in getBulkAvailableStock(
                          item.item_type_id
                        )"
                        :key="stock.id"
                        :value="stock.id"
                      >
                        {{ formatStockOption(stock) }}
                      </option>
                    </select>
                  </div>

                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-medium">Quantity</span>
                    </label>
                    <input
                      v-model="item.quantity"
                      type="number"
                      step="0.001"
                      min="0.001"
                      class="input input-bordered input-sm w-full"
                      placeholder="0.000"
                      @input="
                        () => {
                          const max = getAvailableQty(item.inventory_item_id);
                          let v = parseFloat(item.quantity || 0);
                          if (isNaN(v) || v < 0) v = 0;
                          if (v > max) v = max;
                          item.quantity = v ? v : '';
                        }
                      "
                    />
                    <div class="label">
                      <span class="label-text-alt">
                        Available:
                        {{
                          getAvailableQty(
                            item.inventory_item_id
                          ).toLocaleString()
                        }}
                      </span>
                      <span
                        class="label-text-alt text-error"
                        v-if="bulkErrors[index]"
                        >{{ bulkErrors[index] }}</span
                      >
                    </div>
                  </div>

                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-medium">Reason</span>
                    </label>
                    <select
                      v-model="item.reason"
                      class="select select-bordered select-sm w-full"
                    >
                      <option value="">Select Reason</option>
                      <option value="Kitchen Usage">Kitchen Usage</option>
                      <option value="Preparation">Food Preparation</option>
                      <option value="Service">Customer Service</option>
                      <option value="Cleaning">Cleaning/Maintenance</option>
                      <option value="Training">Staff Training</option>
                      <option value="Waste">Waste/Spoilage</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-medium">Notes</span>
                    </label>
                    <input
                      v-model="item.notes"
                      type="text"
                      class="input input-bordered input-sm w-full"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bulk Notes and Reference -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Reference Number</span>
              </label>
              <input
                v-model="bulkReference"
                type="text"
                class="input input-bordered w-full"
                placeholder="Order #, Recipe #, etc."
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Overall Notes</span>
              </label>
              <textarea
                v-model="bulkNotes"
                class="textarea textarea-bordered w-full"
                rows="2"
                placeholder="General notes for this consumption batch..."
              ></textarea>
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
            class="btn bg-primaryColor text-white btn-sm font-thin"
            :disabled="loading || !isFormValid"
          >
            <span
              v-if="loading"
              class="loading loading-spinner loading-sm mr-2"
            ></span>
            Record Usage
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

  .card {
    transition: all 0.2s ease;
  }

  .card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
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
