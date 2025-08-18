<script setup>
  defineProps({
    cashRequestReceipt: {
      show: { type: Boolean, default: true },
      receipt: { type: Object, default: null },
      onClose: { type: Function, required: true },
    },
  });

  const printReceipt = () => {
    window.print();
  };
</script>

<template>
  <dialog
    id="cash_request_receipt_modal"
    class="modal"
    v-if="cashRequestReceipt.show"
    open
  >
    <div class="modal-box bg-accentColor text-black/50 shadow-lg max-w-6xl">
      <div class="flex justify-between items-center mb-2 text-black">
        <div class="flex items-center gap-2 mb-2 w-full">
          <img src="/logo1.png" alt="" class="w-10 h-10" />
          <h3 class="font-bold text-lg">Countryside Steakhouse</h3>
        </div>
        <div class="flex flex-col items-end w-full">
          <p class="text-xs">
            {{
              new Date(
                cashRequestReceipt.receipt?.completed_at ||
                  cashRequestReceipt.receipt?.updated_at ||
                  Date.now()
              ).toLocaleString('en-PH')
            }}
          </p>
          <p class="text-xs">
            Request ID: {{ cashRequestReceipt.receipt?.request_id }}
          </p>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-xs text-black">
          <thead class="text-black text-xs">
            <tr class="border border-black">
              <th class="border border-black">Item No.</th>
              <th class="border border-black">Item Name</th>
              <th class="border border-black">Quantity</th>
              <th class="border border-black">Unit</th>
              <th class="border border-black">Type</th>
              <th class="border border-black">Unit Price</th>
              <th class="border border-black">Amount (₱)</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, idx) in cashRequestReceipt.receipt?.items || []"
              :key="item.id || idx"
              class="border border-black"
            >
              <td class="border border-black">{{ idx + 1 }}</td>
              <td class="border border-black">{{ item.item_name }}</td>
              <td class="border border-black">{{ item.item_quantity }}</td>
              <td class="border border-black">{{ item.item_unit }}</td>
              <td class="border border-black">{{ item.item_type }}</td>
              <td class="border border-black">
                ₱{{ Number(item.item_unit_price).toFixed(2) }}
              </td>
              <td class="border border-black">
                ₱{{
                  Number(
                    item.item_amount ||
                      item.item_quantity * item.item_unit_price
                  ).toFixed(2)
                }}
              </td>
            </tr>
            <tr class="border border-black">
              <td
                colspan="6"
                class="text-right font-semibold border border-black"
              >
                Total
              </td>
              <td class="font-semibold border border-black">
                ₱{{
                  Number(cashRequestReceipt.receipt?.total_amount || 0).toFixed(
                    2
                  )
                }}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="mt-2 text-black">
          <h6 class="text-xs">Remarks:</h6>
          <textarea
            class="text-xs w-full h-20 border border-black/30 rounded-md p-2 text-black/50"
            readonly
          ></textarea>
        </div>

        <div class="flex justify-between items-center mt-2 text-black">
          <div class="flex items-center gap-2">
            <p class="text-sm">Requested & Received by:</p>
            <p class="text-sm">
              {{ cashRequestReceipt.receipt?.requested_by }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <p class="text-sm">Approved & Released by:</p>
            <p class="text-sm">{{ cashRequestReceipt.receipt?.released_by }}</p>
          </div>
        </div>
        <div class="flex justify-between mt-8 w-full">
          <div class="flex flex-col items-start">
            <div class="border-b border-black w-[280px] mb-1"></div>
            <div class="text-xs text-gray-600">Signature over printed name</div>
          </div>
          <div class="flex flex-col items-end">
            <div class="border-b border-black w-[280px] mb-1"></div>
            <div class="text-xs text-gray-600">Signature over printed name</div>
          </div>
        </div>

        <div class="modal-action flex gap-2 mt-10">
          <button
            class="btn btn-sm bg-primaryColor text-white font-thin border border-none hover:bg-primaryColor/80 shadow-none"
            @click="printReceipt"
          >
            Print
          </button>
          <button
            class="btn btn-sm bg-gray-200 text-black/50 font-thin border border-none hover:bg-gray-300 shadow-none"
            @click="cashRequestReceipt.onClose"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </dialog>
</template>
