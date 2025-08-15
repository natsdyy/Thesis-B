<script setup>
  defineProps({
    cashRequestReceipt: {
      show: { type: Boolean, default: true },
      receipt: { type: Object, default: null },
      onClose: { type: Function, required: true },
    },
  });
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
          <p class="text-xs">August 15, 2025 10:00 AM</p>
          <p class="text-xs">Request ID: 1234567890</p>
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
            <tr class="border border-black">
              <td class="border border-black">1</td>
              <td class="border border-black">Item Name</td>
              <td class="border border-black">1</td>
              <td class="border border-black">Unit</td>
              <td class="border border-black">Type</td>
              <td class="border border-black">100</td>
              <td class="border border-black">100</td>
            </tr>
            <tr class="border border-black">
              <td
                colspan="6"
                class="text-right font-semibold border border-black"
              >
                Total
              </td>
              <td class="font-semibold border border-black">
                ₱ {{ cashRequestReceipt.receipt.total_amount }}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="mt-2 text-black">
          <h6 class="text-xs">Remarks:</h6>
          <textarea
            class="text-xs w-full h-20 border border-black/30 rounded-md p-2 text-black/50"
          >
          </textarea>
        </div>

        <div class="flex justify-between items-center mt-2 text-black">
          <div class="flex items-center gap-2">
            <p class="text-sm">Requested & Received by:</p>
            <p class="text-sm">John Marco Paja</p>
          </div>
          <div class="flex items-center gap-2">
            <p class="text-sm">Approved & Released by:</p>
            <p class="text-sm">Ella Francince Callejas</p>
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
