<template>
  <div v-if="show" class="modal modal-open">
    <div class="modal-box max-w-4xl">
      <h3 class="font-bold text-lg mb-4">Complete Purchase Order</h3>
      <p class="text-sm text-black/60 mb-6">
        Review and adjust the received quantities for each item before
        completing the purchase order.
      </p>

      <!-- Items Table -->
      <div class="overflow-x-auto border border-gray-200 rounded-lg">
        <table class="table w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="text-gray-700 font-semibold py-3 px-4">Item</th>
              <th class="text-gray-700 font-semibold py-3 px-4 text-center">
                Ordered Qty
              </th>
              <th class="text-gray-700 font-semibold py-3 px-4 text-center">
                Received Qty
              </th>
              <th class="text-gray-700 font-semibold py-3 px-4 text-center">
                Unit Price
              </th>
              <th class="text-gray-700 font-semibold py-3 px-4 text-center">
                Total Price
              </th>
              <th class="text-gray-700 font-semibold py-3 px-4 text-center">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="(item, index) in completionItems"
              :key="item.id"
              class="hover:bg-gray-50"
            >
              <td class="py-4 px-4">
                <div>
                  <div class="font-medium text-gray-900">
                    {{ item.item_name }}
                  </div>
                  <div class="text-sm text-gray-500">{{ item.unit }}</div>
                </div>
              </td>
              <td class="py-4 px-4 text-center">
                <span class="font-medium text-gray-900">{{
                  item.quantity
                }}</span>
              </td>
              <td class="py-4 px-4 text-center">
                <div class="flex items-center justify-center gap-2">
                  <input
                    v-model.number="item.received_quantity"
                    type="number"
                    :min="0"
                    :max="item.quantity"
                    class="input input-sm input-bordered w-20 text-center"
                    :class="{
                      'input-error': item.received_quantity > item.quantity,
                      'input-warning':
                        item.received_quantity < item.quantity &&
                        item.received_quantity > 0,
                    }"
                    @input="updateItemTotals(index)"
                  />
                </div>
                <div
                  v-if="item.received_quantity > item.quantity"
                  class="text-xs text-red-500 mt-1"
                >
                  Cannot exceed ordered quantity
                </div>
              </td>
              <td class="py-4 px-4 text-center">
                <input
                  v-model.number="item.received_unit_price"
                  type="number"
                  :min="0"
                  step="0.01"
                  class="input input-sm input-bordered w-24 text-center"
                  @input="updateItemTotals(index)"
                  :readonly="!isManualRequest"
                />
                <div
                  v-if="isManualRequest"
                  class="text-[10px] text-gray-500 mt-1"
                >
                  Editable for manual requests
                </div>
              </td>
              <td class="py-4 px-4 text-center">
                <span class="font-medium text-gray-900">
                  ₱{{
                    (item.received_total_price || 0).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }}
                </span>
              </td>
              <td class="py-4 px-4 text-center">
                <div class="flex gap-1 justify-center">
                  <button
                    class="btn btn-xs btn-outline text-primaryColor border font-thin border-none hover:bg-primaryColor/10"
                    @click="setReceivedToOrdered(index)"
                  >
                    Full
                  </button>
                  <button
                    class="btn btn-xs btn-outline text-error border font-thin border-none hover:bg-error/10"
                    @click="setReceivedToZero(index)"
                  >
                    None
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Summary -->
      <div class="mt-6 p-6 border border-gray-200 rounded-lg">
        <h4 class="text-sm font-semibold text-gray-800 mb-4">Order Summary</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center">
            <div class="text-xs text-gray-600 mb-1">Ordered Value</div>
            <div class="text-lg font-bold text-gray-800">
              <font-awesome-icon icon="fa-solid fa-peso-sign" />
              {{
                totalOrderedValue.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              }}
            </div>
          </div>
          <div class="text-center">
            <div class="text-xs text-gray-600 mb-1">Received Value</div>
            <div class="text-lg font-bold text-primaryColor">
              <font-awesome-icon icon="fa-solid fa-peso-sign" />
              {{
                totalReceivedValue.toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              }}
            </div>
          </div>
          <div class="text-center">
            <div class="text-xs text-gray-600 mb-1">Difference</div>
            <div
              class="text-lg font-bold"
              :class="{
                'text-primaryColor': differenceValue > 0,
                'text-red-600': differenceValue < 0,
                'text-gray-600': differenceValue === 0,
              }"
            >
              <font-awesome-icon icon="fa-solid fa-peso-sign" />
              {{
                Math.abs(differenceValue).toLocaleString('en-PH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              }}
              <div class="text-xs font-normal mt-1">
                <span v-if="differenceValue > 0" class="text-primaryColor"
                  >(Over-delivered)</span
                >
                <span v-else-if="differenceValue < 0" class="text-error"
                  >(Under-delivered)</span
                >
                <span v-else class="text-gray-500">(Exact match)</span>
              </div>
              <!-- Budget Return Information -->
              <div
                v-if="differenceValue < 0"
                class="text-xs mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-center"
              >
                <div
                  class="flex justify-center items-center gap-1 text-blue-700"
                >
                  <font-awesome-icon icon="fa-solid fa-circle-exclamation" />
                  <span class="font-medium">Budget Return Notice</span>
                </div>
                <p class="text-blue-600 mt-1 font-thin">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{
                    Math.abs(differenceValue).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }}
                  will be returned to capital due to under-delivery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes (Rich Text) -->
      <div class="mt-4">
        <label class="label">
          <span class="label-text font-medium">Completion Notes</span>
        </label>
        <Editor v-model="completionNotes" :init="tinyMCEConfig" />
      </div>

      <!-- Action Buttons -->
      <div class="modal-action">
        <button
          type="button"
          class="btn btn-ghost font-thin btn-sm"
          :disabled="loading"
          @click="closeModal"
        >
          Cancel
        </button>
        <button
          type="button"
          class="btn bg-primaryColor text-white font-thin btn-sm"
          :class="{ loading: loading }"
          :disabled="loading || !canComplete"
          @click="completeOrder"
        >
          <span
            v-if="loading"
            class="loading loading-spinner loading-xs"
          ></span>
          {{ loading ? 'Completing...' : 'Complete Order' }}
        </button>
      </div>
    </div>
    <div class="modal-backdrop" @click="closeModal"></div>
  </div>
</template>

<script setup>
  import { ref, computed, watch } from 'vue';
  import Editor from '@tinymce/tinymce-vue';
  // Self-hosted TinyMCE (avoid cloud API key requirement)
  import tinymce from 'tinymce/tinymce';
  import 'tinymce/icons/default';
  import 'tinymce/themes/silver';
  import 'tinymce/models/dom/model';
  import 'tinymce/plugins/link';
  import 'tinymce/plugins/lists';
  import 'tinymce/plugins/image';
  import 'tinymce/plugins/table';
  import 'tinymce/plugins/code';
  import 'tinymce/skins/ui/oxide/skin.min.css';
  import { formatImageUrl, getApiUrl } from '../../config/api.js';

  const props = defineProps({
    show: {
      type: Boolean,
      default: false,
    },
    purchaseOrder: {
      type: Object,
      default: null,
    },
    loading: {
      type: Boolean,
      default: false,
    },
  });

  const emit = defineEmits(['close', 'complete']);

  const completionItems = ref([]);
  const completionNotes = ref('');

  // Determine if the PO comes from a manual request (no supplier linked)
  const isManualRequest = computed(() => {
    return !props.purchaseOrder || !props.purchaseOrder.supplier_id;
  });

  try {
    tinymce?.EditorManager?.overrideDefaults?.({ license_key: 'gpl' });
  } catch (_) {}

  // TinyMCE config (mirror BranchInventory behavior – image proofs supported)
  const tinyMCEConfig = {
    menubar: false,
    height: 220,
    branding: false,
    statusbar: false,
    plugins: 'link lists image table code paste',
    toolbar:
      'undo redo | bold italic underline | bullist numlist | link image table | uploadimage | removeformat',
    toolbar_mode: 'wrap',
    automatic_uploads: false,
    paste_data_images: true,
    file_picker_types: 'image',
    content_style:
      'html,body{max-width:100%;} img{max-width:100%;height:auto;display:block;margin:6px 0;}',
    images_upload_handler: async (blobInfo) => {
      return new Promise((resolve, reject) => {
        try {
          const token = localStorage.getItem('token');
          const formData = new FormData();
          formData.append('file', blobInfo.blob(), blobInfo.filename());
          fetch(getApiUrl('/uploads/proofs'), {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          })
            .then((r) => r.json())
            .then((data) => {
              if (data?.location) {
                resolve(formatImageUrl(data.location));
              } else {
                reject(data?.message || 'Upload failed');
              }
            })
            .catch((e) => reject(e?.message || 'Upload failed'));
        } catch (e) {
          reject(e?.message || 'Upload failed');
        }
      });
    },
    setup: (ed) => {
      ed.ui.registry.addButton('uploadimage', {
        text: 'Upload Image',
        tooltip: 'Upload image',
        onAction: () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/png,image/jpeg';
          input.onchange = async () => {
            const file = input.files && input.files[0];
            if (!file) return;
            try {
              const token = localStorage.getItem('token');
              const fd = new FormData();
              fd.append('file', file);
              const res = await fetch(getApiUrl('/uploads/proofs'), {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
              });
              const json = await res.json();
              if (res.ok && json.location) {
                ed.insertContent(
                  `<img src="${formatImageUrl(json.location)}" />`
                );
              } else {
                alert(json.message || 'Upload failed');
              }
            } catch (_) {
              alert('Upload failed');
            }
          };
          input.click();
        },
      });
    },
    license_key: 'gpl',
  };

  // Initialize completion items when modal opens
  watch(
    () => props.show,
    (newValue) => {
      if (newValue && props.purchaseOrder?.items) {
        completionItems.value = props.purchaseOrder.items.map((item) => {
          const orderedQuantity = Number(item.quantity || 0);
          const orderedUnitPrice = Number(item.unit_price || 0);
          const orderedTotalPrice = Number(
            item.total_price ?? orderedQuantity * orderedUnitPrice
          );

          const receivedQuantity = Number(
            item.received_quantity ?? orderedQuantity
          );
          const receivedUnitPrice = Number(
            item.received_unit_price ?? orderedUnitPrice
          );
          const receivedTotalPrice = Number(
            item.received_total_price ?? receivedQuantity * receivedUnitPrice
          );

          return {
            ...item,
            quantity: orderedQuantity,
            unit_price: orderedUnitPrice,
            total_price: orderedTotalPrice,
            received_quantity: receivedQuantity,
            received_unit_price: receivedUnitPrice,
            received_total_price: receivedTotalPrice,
          };
        });
        completionNotes.value = props.purchaseOrder.completion_notes || '';
      }
    }
  );

  // Computed properties
  const totalOrderedValue = computed(() => {
    const total = completionItems.value.reduce((sum, item) => {
      const itemTotal = Number(
        item.total_price ??
          Number(item.quantity || 0) * Number(item.unit_price || 0)
      );
      return sum + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0);
    return Math.round(total * 100) / 100; // Round to 2 decimal places
  });

  const totalReceivedValue = computed(() => {
    const total = completionItems.value.reduce((sum, item) => {
      const itemTotal = Number(
        item.received_total_price ??
          Number(item.received_quantity || 0) *
            Number(item.received_unit_price || 0)
      );
      return sum + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0);
    return Math.round(total * 100) / 100; // Round to 2 decimal places
  });

  const differenceValue = computed(() => {
    return totalReceivedValue.value - totalOrderedValue.value;
  });

  const canComplete = computed(() => {
    return completionItems.value.every(
      (item) =>
        item.received_quantity >= 0 &&
        item.received_quantity <= item.quantity &&
        item.received_unit_price >= 0
    );
  });

  // Methods
  const updateItemTotals = (index) => {
    const item = completionItems.value[index];
    const qty = Number(item.received_quantity || 0);
    const price = Number(item.received_unit_price || 0);
    const total = qty * price;
    item.received_total_price = isNaN(total) ? 0 : total;
  };

  const setReceivedToOrdered = (index) => {
    const item = completionItems.value[index];
    item.received_quantity = item.quantity;
    item.received_unit_price = item.unit_price;
    updateItemTotals(index);
  };

  const setReceivedToZero = (index) => {
    const item = completionItems.value[index];
    item.received_quantity = 0;
    item.received_unit_price = 0;
    updateItemTotals(index);
  };

  const completeOrder = () => {
    const completionData = {
      items: completionItems.value.map((item) => ({
        id: item.id,
        received_quantity: item.received_quantity,
        received_unit_price: item.received_unit_price,
        received_total_price: item.received_total_price,
      })),
      completion_notes: completionNotes.value,
    };

    emit('complete', completionData);
  };

  const closeModal = () => {
    emit('close');
  };
</script>

<style>
  /* Raise TinyMCE dialogs above DaisyUI modal */
  .tox,
  .tox-tinymce-aux,
  .tox-silver-sink,
  .tox-dialog-wrap,
  .tox-dialog {
    z-index: 99999 !important;
  }
</style>
