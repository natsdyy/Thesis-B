<script setup>
  import { ref, computed, watch } from 'vue';
  import { Truck, Building2, Package, X, AlertTriangle } from 'lucide-vue-next';

  // Props
  const props = defineProps({
    show: {
      type: Boolean,
      default: false,
    },
    item: {
      type: Object,
      default: null,
    },
    branches: {
      type: Array,
      default: () => [],
    },
    inventoryType: {
      type: String,
      default: 'scm', // 'scm' or 'production'
    },
    loading: {
      type: Boolean,
      default: false,
    },
  });

  // Emits
  const emit = defineEmits(['close', 'add-to-cart']);

  // Local state
  const distributionForm = ref({
    quantity: '',
    branch_id: '',
    transfer_price: '',
    notes: '',
  });

  const formErrors = ref({});

  // Computed properties
  const itemName = computed(() => {
    if (!props.item) return '';
    return props.inventoryType === 'production'
      ? props.item.item_name || props.item.menu_item_name
      : props.item.item_name || props.item.item_type_name;
  });

  const availableQuantity = computed(() => {
    if (!props.item) return 0;
    return props.inventoryType === 'production'
      ? props.item.available_quantity || 0
      : parseFloat(props.item.quantity) || 0;
  });

  const unitOfMeasure = computed(() => {
    return props.item?.unit_of_measure || 'units';
  });

  const sellingPrice = computed(() => {
    return props.inventoryType === 'production'
      ? parseFloat(props.item?.selling_price) || 0
      : 0;
  });

  // Suggested price: use selling_price for production items, unit_cost for SCM items
  const suggestedPrice = computed(() => {
    if (!props.item) return 0;
    if (props.inventoryType === 'production') return sellingPrice.value || 0;
    return parseFloat(props.item?.unit_cost) || 0;
  });

  const distributionTotal = computed(() => {
    const quantity = parseFloat(distributionForm.value.quantity) || 0;
    const price = parseFloat(distributionForm.value.transfer_price) || 0;
    return quantity * price;
  });

  const isValid = computed(() => {
    // Prevent distributing expired SCM items
    const isExpiredScm = (() => {
      if (props.inventoryType !== 'scm') return false;
      const exp = props.item?.expiry_date || props.item?.expiry || null;
      if (!exp || exp === 'N/A') return false;
      const today = new Date();
      const expDate = new Date(exp);
      return expDate < new Date(today.toDateString());
    })();

    return (
      distributionForm.value.quantity &&
      distributionForm.value.branch_id &&
      distributionForm.value.transfer_price &&
      parseFloat(distributionForm.value.quantity) > 0 &&
      parseFloat(distributionForm.value.quantity) <= availableQuantity.value &&
      parseFloat(distributionForm.value.transfer_price) > 0 &&
      !isExpiredScm
    );
  });

  // Methods
  const closeModal = () => {
    resetForm();
    const dlg = document.getElementById('branch_distribution_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  const resetForm = () => {
    distributionForm.value = {
      quantity: '',
      branch_id: '',
      transfer_price: '',
      notes: '',
    };
    formErrors.value = {};
  };

  const validateForm = () => {
    const errors = {};

    if (!distributionForm.value.quantity) {
      errors.quantity = 'Quantity is required';
    } else if (parseFloat(distributionForm.value.quantity) <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    } else if (
      parseFloat(distributionForm.value.quantity) > availableQuantity.value
    ) {
      errors.quantity = `Quantity cannot exceed available stock (${availableQuantity.value})`;
    }

    if (!distributionForm.value.branch_id) {
      errors.branch_id = 'Branch selection is required';
    }

    if (!distributionForm.value.transfer_price) {
      errors.transfer_price = 'Transfer price is required';
    } else if (parseFloat(distributionForm.value.transfer_price) <= 0) {
      errors.transfer_price = 'Transfer price must be greater than 0';
    }

    formErrors.value = errors;
    return Object.keys(errors).length === 0;
  };

  const addToCart = () => {
    if (!validateForm()) return;
    emit('add-to-cart', {
      item: props.item,
      quantity: parseFloat(distributionForm.value.quantity),
      branch_id: distributionForm.value.branch_id,
      transfer_price: parseFloat(distributionForm.value.transfer_price),
      notes: distributionForm.value.notes,
    });
  };

  // Watch for modal show/hide
  watch(
    () => props.show,
    (newVal) => {
      const dlg = document.getElementById('branch_distribution_modal');
      if (newVal) {
        resetForm();
        // Pre-populate transfer price with suggested price when available
        if (suggestedPrice.value > 0) {
          distributionForm.value.transfer_price =
            suggestedPrice.value.toString();
        }
        if (dlg?.showModal) dlg.showModal();
      } else {
        if (dlg?.close) dlg.close();
      }
    }
  );

  // Watch for item changes
  watch(
    () => props.item,
    (newItem) => {
      if (newItem && props.show) {
        resetForm();
        // Pre-populate transfer price with suggested price when available
        if (suggestedPrice.value > 0) {
          distributionForm.value.transfer_price =
            suggestedPrice.value.toString();
        }
      }
    }
  );
</script>

<template>
  <dialog id="branch_distribution_modal" class="modal">
    <div class="modal-box w-11/12 max-w-2xl">
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-bold text-xl text-primaryColor">
          <Truck class="w-6 h-6 inline mr-2" />
          Branch Distribution
        </h3>
        <button @click="closeModal" class="btn btn-sm btn-circle btn-ghost">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Item Information -->
      <div class="card bg-base-200 mb-6">
        <div class="card-body p-4">
          <div class="flex items-center gap-3 mb-3">
            <div class="p-2 bg-primaryColor/10 rounded-lg">
              <Package
                v-if="inventoryType === 'scm'"
                class="w-6 h-6 text-primaryColor"
              />
              <Building2 v-else class="w-6 h-6 text-primaryColor" />
            </div>
            <div>
              <h4 class="font-semibold text-lg">{{ itemName }}</h4>
              <p class="text-sm text-gray-600">
                {{
                  inventoryType === 'production'
                    ? 'Production Item'
                    : 'SCM Item'
                }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium">Available Stock:</span>
              <span
                class="ml-2 badge badge-sm border-none font-medium"
                :class="{
                  'badge-success bg-success/20 text-success':
                    availableQuantity > 50,
                  'badge-warning bg-warning/20 text-warning':
                    availableQuantity <= 50 && availableQuantity > 10,
                  'badge-error bg-error/20 text-error': availableQuantity <= 10,
                }"
              >
                {{ availableQuantity.toLocaleString() }} {{ unitOfMeasure }}
              </span>
            </div>
            <div v-if="inventoryType === 'production' && sellingPrice > 0">
              <span class="font-medium">Selling Price:</span>
              <span class="ml-2 font-semibold text-black">
                ₱{{ sellingPrice.toLocaleString() }}
              </span>
            </div>
            <div v-if="item?.category">
              <span class="font-medium">Category:</span>
              <span class="ml-2">{{ item.category }}</span>
            </div>
            <div v-if="item?.item_code">
              <span class="font-medium">Item Code:</span>
              <span class="ml-2">{{ item.item_code }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Distribution Form -->
      <form @submit.prevent="addToCart" class="space-y-4">
        <div
          v-if="
            inventoryType === 'scm' &&
            item?.expiry_date &&
            new Date(item.expiry_date) < new Date(new Date().toDateString())
          "
          class="alert alert-warning text-sm flex items-start gap-2"
        >
          <AlertTriangle class="w-4 h-4" />
          <span>This item has expired and cannot be distributed.</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <!-- Quantity -->
          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Quantity to Distribute <span class="text-error">*</span>
              </span>
            </label>
            <div class="input-group">
              <input
                v-model="distributionForm.quantity"
                type="number"
                step="0.01"
                min="0.01"
                :max="availableQuantity"
                placeholder="Enter quantity"
                class="input input-sm sm:input-md input-bordered w-full bg-white"
                :class="{ 'input-error': formErrors.quantity }"
              />
              <span class="border border-none text-xs sm:text-sm">
                {{ unitOfMeasure }}
              </span>
            </div>
            <label v-if="formErrors.quantity" class="label">
              <span class="label-text-alt text-error">{{
                formErrors.quantity
              }}</span>
            </label>
          </div>

          <!-- Branch Selection -->
          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Destination Branch <span class="text-error">*</span>
              </span>
            </label>
            <select
              v-model="distributionForm.branch_id"
              class="select select-sm sm:select-md select-bordered w-full bg-white"
              :class="{ 'select-error': formErrors.branch_id }"
            >
              <option value="">Select a branch</option>
              <option
                v-for="branch in branches"
                :key="branch.id"
                :value="branch.id"
              >
                {{ branch.name }}
              </option>
            </select>
            <label v-if="formErrors.branch_id" class="label">
              <span class="label-text-alt text-error">{{
                formErrors.branch_id
              }}</span>
            </label>
          </div>

          <!-- Transfer Price -->
          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Transfer Price per Unit <span class="text-error">*</span>
              </span>
            </label>
            <div class="input-group">
              <input
                v-model="distributionForm.transfer_price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter transfer price"
                class="input input-sm sm:input-md input-bordered w-full bg-white"
                :class="{ 'input-error': formErrors.transfer_price }"
                readonly
              />
            </div>
            <label v-if="formErrors.transfer_price" class="label">
              <span class="label-text-alt text-error">{{
                formErrors.transfer_price
              }}</span>
            </label>
          </div>

          <!-- Total (info) -->
          <div class="form-control" v-if="distributionTotal > 0">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
                >Total Distribution Value</span
              >
            </label>
            <div
              class="input input-sm sm:input-md input-bordered w-full bg-gray-50 flex items-center"
            >
              ₱{{ distributionTotal.toLocaleString() }}
            </div>
          </div>

          <!-- Notes -->
          <div class="md:col-span-2 form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
                >Notes (Optional)</span
              >
            </label>
            <textarea
              v-model="distributionForm.notes"
              class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white"
              placeholder="Add any notes about this distribution..."
              rows="3"
            ></textarea>
          </div>
        </div>

        <!-- Form Actions -->
        <div class="modal-action">
          <button
            type="button"
            @click="closeModal"
            class="btn btn-ghost btn-sm font-thin shadow-none"
            :disabled="loading"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80 shadow-none"
            :disabled="!isValid || loading"
          >
            Add to draft
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
