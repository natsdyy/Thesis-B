<template>
  <dialog id="item_level_accept_reject_modal" class="modal">
    <div class="modal-box w-11/12 max-w-4xl max-h-[90vh]">
      <!-- Modal Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primaryColor/10 rounded-lg">
            <Package class="w-6 h-6 text-primaryColor" />
          </div>
          <div>
            <h3 class="text-xl font-semibold text-primaryColor">
              Item-Level Distribution Processing
            </h3>
            <p class="text-sm text-gray-600">
              Select which items to accept or reject from this distribution
            </p>
          </div>
        </div>
        <button
          @click="closeModal"
          class="btn btn-sm btn-ghost btn-circle"
          :disabled="loading"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Distribution Info -->
      <div
        class="bg-primaryColor/10 border border-primaryColor/20 rounded-lg p-4 mb-6"
      >
        <div class="flex items-center gap-2 mb-2">
          <Truck class="w-4 h-4 text-primaryColor" />
          <span class="font-medium text-primaryColor"
            >Distribution Details</span
          >
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span class="text-gray-600">Reference:</span>
            <span class="font-medium">{{ distribution?.reference }}</span>
          </div>
          <div>
            <span class="text-gray-600">Branch:</span>
            <span class="font-medium">{{ distribution?.branch_name }}</span>
          </div>
          <div>
            <span class="text-gray-600">Total Items:</span>
            <span class="font-medium">{{
              distribution?.items?.length || 0
            }}</span>
          </div>
          <div>
            <span class="text-gray-600">Total Value:</span>
            <span class="font-medium"
              >₱{{ formatCurrency(distribution?.total_amount || 0) }}</span
            >
          </div>
        </div>
      </div>

      <!-- Items List -->
      <div class="space-y-4 mb-6">
        <div class="flex items-center justify-between">
          <h4 class="font-medium text-primaryColor">Distribution Items</h4>
          <div class="flex items-center gap-2">
            <button
              @click="selectAllAccept"
              class="btn btn-xs btn-outline bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80 shadow-none"
              :disabled="loading"
            >
              <CheckCircle class="w-3 h-3 mr-1" />
              Accept All
            </button>
            <button
              @click="clearAllSelections"
              class="btn btn-xs btn-outline btn-ghost"
              :disabled="loading"
            >
              <X class="w-3 h-3 mr-1" />
              Clear All
            </button>
          </div>
        </div>

        <div class="space-y-3 max-h-96 overflow-y-auto">
          <div
            v-for="item in distribution?.items || []"
            :key="item.id"
            class="border border-primaryColor/20 rounded-lg p-4 hover:border-primaryColor/30 transition-colors"
            :class="{
              'border-success bg-success/5':
                selectedItems[item.id]?.action === 'accept',
              'border-error bg-error/5':
                selectedItems[item.id]?.action === 'reject',
              'border-warning bg-warning/5':
                selectedItems[item.id]?.action === 'reject' &&
                !selectedItems[item.id]?.reason,
            }"
          >
            <div class="flex items-start gap-4">
              <!-- Item Selection -->
              <div class="flex flex-col gap-2 pt-1">
                <button
                  @click="toggleItemSelection(item.id, 'accept')"
                  class="btn btn-xs btn-circle bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80 shadow-none"
                  :class="{
                    'btn-success': selectedItems[item.id]?.action === 'accept',
                    'btn-outline bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80 shadow-none':
                      selectedItems[item.id]?.action !== 'accept',
                  }"
                  :disabled="loading"
                >
                  <CheckCircle class="w-4 h-4" />
                </button>
                <button
                  @click="toggleItemSelection(item.id, 'reject')"
                  class="btn btn-xs btn-circle bg-error text-white font-thin border-none hover:bg-error/80 shadow-none"
                  :class="{
                    'btn-error': selectedItems[item.id]?.action === 'reject',
                    'btn-outline bg-error text-white font-thin border-none hover:bg-error/80 shadow-none':
                      selectedItems[item.id]?.action !== 'reject',
                  }"
                  :disabled="loading"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>

              <!-- Item Details -->
              <div class="flex-1">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Item Info -->
                  <div>
                    <h5 class="font-medium text-primaryColor">
                      {{ item.name }}
                    </h5>
                    <p class="text-sm text-gray-600">{{ item.category }}</p>
                    <div class="flex items-center gap-2 mt-1">
                      <span
                        class="badge badge-sm "
                        :class="getSourceBadgeClass(item.source)"
                      >
                        {{ item.source.toUpperCase() }}
                      </span>
                      <span class="text-xs text-gray-500">{{ item.unit }}</span>
                    </div>
                  </div>

                  <!-- Quantity & Price -->
                  <div class="text-center">
                    <div class="text-lg font-semibold text-primaryColor">
                      {{ item.qty }}
                    </div>
                    <div class="text-sm text-gray-600">
                      ₱{{ formatCurrency(item.unit_price) }} each
                    </div>
                    <div class="text-sm font-medium text-black">
                      ₱{{ formatCurrency(item.amount) }} total
                    </div>
                  </div>

                  <!-- Expiry Date -->
                  <div class="text-right">
                    <div v-if="item.expiry_date" class="text-sm">
                      <span class="text-gray-600">Expires:</span>
                      <div
                        class="font-medium"
                        :class="getExpiryDateClass(item.expiry_date)"
                      >
                        {{ formatDate(item.expiry_date) }}
                      </div>
                    </div>
                    <div v-else class="text-sm text-gray-500">
                      No expiry date
                    </div>
                  </div>
                </div>

                <!-- Rejection Reason Input (shown when item is selected for rejection) -->
                <div
                  v-if="selectedItems[item.id]?.action === 'reject'"
                  class="mt-3 pt-3 border-t border-gray-200"
                >
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label class="label">
                        <span class="label-text font-medium text-error"
                          >Rejection Reason *</span
                        >
                      </label>
                      <select
                        v-model="selectedItems[item.id].reason"
                        class="select select-bordered select-sm w-full"
                        :class="{
                          'select-error': !selectedItems[item.id].reason,
                        }"
                        @change="validateRejectionReason(item.id)"
                      >
                        <option value="">Select a reason...</option>
                        <option value="damaged">Item is damaged</option>
                        <option value="wrong_item">Wrong item delivered</option>
                        <option value="expired">
                          Item is expired or near expiry
                        </option>
                        <option value="wrong_quantity">
                          Incorrect quantity
                        </option>
                        <option value="quality_issue">Quality issue</option>
                        <option value="not_ordered">
                          Item was not ordered
                        </option>
                        <option value="other">Other (specify in notes)</option>
                      </select>
                    </div>
                    <div>
                      <label class="label">
                        <span class="label-text">Additional Notes</span>
                      </label>
                      <input
                        v-model="selectedItems[item.id].notes"
                        type="text"
                        class="input input-bordered input-sm w-full"
                        placeholder="Optional notes..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 class="font-medium text-gray-900 mb-3">Processing Summary</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div class="text-center">
            <div class="text-2xl font-bold text-success">
              {{ acceptedCount }}
            </div>
            <div class="text-gray-600">Items to Accept</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-error">{{ rejectedCount }}</div>
            <div class="text-gray-600">Items to Reject</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-warning">
              {{ unselectedCount }}
            </div>
            <div class="text-gray-600">Unselected</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-black">
              ₱{{ formatCurrency(acceptedValue) }}
            </div>
            <div class="text-gray-600">Accepted Value</div>
          </div>
        </div>
      </div>

      <!-- Additional Notes -->
      <div class="mb-6">
        <label class="label">
          <span class="label-text font-medium">Processing Notes</span>
        </label>
        <textarea
          v-model="processingNotes"
          class="textarea textarea-bordered w-full"
          rows="3"
          placeholder="Optional notes about this partial processing..."
          :disabled="loading"
        ></textarea>
      </div>

      <!-- Validation Errors -->
      <div v-if="validationErrors.length > 0" class="alert alert-error mb-6">
        <AlertTriangle class="w-4 h-4" />
        <div>
          <div class="font-medium">Please fix the following issues:</div>
          <ul class="list-disc list-inside mt-1">
            <li v-for="error in validationErrors" :key="error">{{ error }}</li>
          </ul>
        </div>
      </div>

      <!-- Modal Actions -->
      <div
        class="modal-action flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-3"
      >
        <button
          @click="closeModal"
          class="btn btn-ghost btn-sm font-thin shadow-none w-full sm:w-auto"
          :disabled="loading"
        >
          Cancel
        </button>
        <button
          @click="processItems"
          class="btn btn-primary btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80 shadow-none w-full sm:w-auto"
          :disabled="loading || !canProcess"
        >
          <span v-if="loading">Processing...</span>
          <span v-else>Process Items</span>
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup>
  import { ref, computed, watch, nextTick } from 'vue';
  import {
    Package,
    X,
    Truck,
    CheckCircle,
    AlertTriangle,
  } from 'lucide-vue-next';

  // Props
  const props = defineProps({
    distribution: {
      type: Object,
      default: null,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  });

  // Emits
  const emit = defineEmits(['close', 'process']);

  // Reactive state
  const selectedItems = ref({});
  const processingNotes = ref('');
  const validationErrors = ref([]);

  // Computed properties
  const acceptedCount = computed(() => {
    return Object.values(selectedItems.value).filter(
      (item) => item.action === 'accept'
    ).length;
  });

  const rejectedCount = computed(() => {
    return Object.values(selectedItems.value).filter(
      (item) => item.action === 'reject'
    ).length;
  });

  const unselectedCount = computed(() => {
    const totalItems = props.distribution?.items?.length || 0;
    return totalItems - acceptedCount.value - rejectedCount.value;
  });

  const acceptedValue = computed(() => {
    if (!props.distribution?.items) return 0;

    return props.distribution.items
      .filter((item) => selectedItems.value[item.id]?.action === 'accept')
      .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  });

  const canProcess = computed(() => {
    return acceptedCount.value > 0 || rejectedCount.value > 0;
  });

  // Methods
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    })
      .format(amount)
      .replace('₱', '');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSourceBadgeClass = (source) => {
    return source === 'production'
      ? 'badge-sm border-none font-medium bg-success/20 text-success'
      : 'badge-sm border-none font-medium bg-info/20 text-info';
  };

  const getExpiryDateClass = (expiryDate) => {
    const daysUntilExpiry = Math.ceil(
      (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) return 'text-error font-bold';
    if (daysUntilExpiry <= 3) return 'text-error font-medium';
    if (daysUntilExpiry <= 7) return 'text-warning font-medium';
    if (daysUntilExpiry <= 30) return 'text-info';
    return 'text-success';
  };

  const toggleItemSelection = (itemId, action) => {
    if (selectedItems.value[itemId]?.action === action) {
      // Deselect if already selected
      delete selectedItems.value[itemId];
    } else {
      // Select with action
      selectedItems.value[itemId] = {
        action,
        reason: action === 'reject' ? '' : null,
        notes: '',
      };
    }

    validateSelections();
  };

  const selectAllAccept = () => {
    if (!props.distribution?.items) return;

    props.distribution.items.forEach((item) => {
      selectedItems.value[item.id] = {
        action: 'accept',
        reason: null,
        notes: '',
      };
    });

    validateSelections();
  };

  const clearAllSelections = () => {
    selectedItems.value = {};
    validationErrors.value = [];
  };

  const validateRejectionReason = (itemId) => {
    validateSelections();
  };

  const validateSelections = () => {
    validationErrors.value = [];

    // Check if all items are processed
    const totalItems = props.distribution?.items?.length || 0;
    const processedItems = Object.keys(selectedItems.value).length;

    if (processedItems !== totalItems) {
      validationErrors.value.push(
        `All items must be either accepted or rejected. ${totalItems - processedItems} items are unselected.`
      );
    }

    // Check rejection reasons
    Object.entries(selectedItems.value).forEach(([itemId, selection]) => {
      if (selection.action === 'reject' && !selection.reason) {
        const item = props.distribution?.items?.find((i) => i.id == itemId);
        validationErrors.value.push(
          `Rejection reason is required for "${item?.name}"`
        );
      }
    });
  };

  const processItems = () => {
    validateSelections();

    if (validationErrors.value.length > 0) {
      return;
    }

    const acceptedItems = [];
    const rejectedItems = [];

    Object.entries(selectedItems.value).forEach(([itemId, selection]) => {
      if (selection.action === 'accept') {
        acceptedItems.push(parseInt(itemId));
      } else if (selection.action === 'reject') {
        rejectedItems.push({
          item_id: parseInt(itemId),
          reason: selection.reason,
          notes: selection.notes || null,
        });
      }
    });

    emit('process', {
      accepted_items: acceptedItems,
      rejected_items: rejectedItems,
      notes: processingNotes.value || null,
    });
  };

  const closeModal = () => {
    emit('close');
  };

  // Reset form when distribution changes
  watch(
    () => props.distribution,
    () => {
      selectedItems.value = {};
      processingNotes.value = '';
      validationErrors.value = [];
    },
    { deep: true }
  );

  // Expose methods for parent component
  defineExpose({
    openModal: () => {
      document.getElementById('item_level_accept_reject_modal')?.showModal();
    },
    closeModal: () => {
      document.getElementById('item_level_accept_reject_modal')?.close();
    },
  });
</script>
