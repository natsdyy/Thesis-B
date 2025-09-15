<script setup>
  defineProps({
    receipt: {
      type: Object,
      default: null,
    },
    show: {
      type: Boolean,
      default: false,
    },
    onClose: {
      type: Function,
      required: true,
    },
  });

  const printReceipt = () => window.print();

  const extractRejectionReason = (notes) => {
    if (!notes) return 'No reason provided';

    // Extract reason from notes format: "Item rejected by branch: {reason}. {notes}"
    const match = notes.match(/Item rejected by branch: ([^.]+)/);
    if (match && match[1]) {
      return match[1].trim();
    }

    return 'Unknown reason';
  };
</script>

<template>
  <dialog id="branch_distribution_receipt_modal" class="modal" v-if="show" open>
    <div class="modal-box bg-accentColor text-black/50 shadow-lg max-w-6xl">
      <div class="flex justify-between items-center mb-2 text-black">
        <div class="flex items-center gap-2 mb-2 w-full">
          <img src="/logo1.png" alt="" class="w-10 h-10" />
          <h3 class="font-bold text-lg">Countryside Steakhouse</h3>
        </div>
        <div class="flex flex-col items-end w-full">
          <p class="text-xs">
            {{
              new Date(receipt?.completed_at || Date.now()).toLocaleString(
                'en-PH'
              )
            }}
          </p>
          <p class="text-xs">
            Distribution Ref: {{ receipt?.reference || 'N/A' }}
          </p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <div class="mb-2 text-black text-sm">
          <div>
            Branch:
            <span class="font-semibold">{{ receipt?.branch_name }}</span>
          </div>
          <div v-if="receipt?.notes">
            Notes: <span>{{ receipt?.notes }}</span>
          </div>
          <div
            v-if="receipt?.status === 'partially_processed'"
            class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded"
          >
            <div class="text-yellow-800 font-semibold text-sm mb-1">
              ⚠️ Partial Processing
            </div>
            <div class="text-yellow-700 text-xs">
              Some items were rejected by the branch. See rejected items below.
            </div>
          </div>
        </div>

        <table class="table table-xs w-full border border-black">
          <thead>
            <tr class="border border-black bg-white text-black">
              <th class="border border-black">#</th>
              <th class="border border-black">Item</th>
              <th class="border border-black">Source</th>
              <th class="border border-black">Qty</th>
              <th class="border border-black">Unit</th>
              <th class="border border-black">Unit Price</th>
              <th class="border border-black">Amount</th>
            </tr>
          </thead>
          <tbody class="bg-white text-black">
            <tr
              v-for="(it, idx) in receipt?.items || []"
              :key="idx"
              class="border border-black"
            >
              <td class="border border-black">{{ idx + 1 }}</td>
              <td class="border border-black">{{ it.item_name }}</td>
              <td class="border border-black">
                {{ it.source?.toUpperCase() }}
              </td>
              <td class="border border-black text-right">
                {{ Number(it.item_quantity || 0).toLocaleString() }}
              </td>
              <td class="border border-black">{{ it.item_unit }}</td>
              <td class="border border-black text-right">
                ₱{{ Number(it.item_unitPrice || 0).toFixed(2) }}
              </td>
              <td class="border border-black text-right">
                ₱{{ Number(it.item_amount || 0).toFixed(2) }}
              </td>
            </tr>
            <tr class="border border-black">
              <td
                colspan="6"
                class="text-right font-semibold border border-black"
              >
                Total
              </td>
              <td class="font-semibold border border-black text-right">
                ₱{{ Number(receipt?.total_amount || 0).toFixed(2) }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Rejected Items Section (for partially processed distributions) -->
        <div
          v-if="
            receipt?.status === 'partially_processed' &&
            receipt?.rejected_items?.length > 0
          "
          class="mt-6"
        >
          <h4 class="text-red-800 font-semibold text-sm mb-2">
            ❌ Rejected Items
          </h4>
          <table class="table table-xs w-full border border-red-300">
            <thead>
              <tr class="border border-red-300 bg-red-50 text-red-800">
                <th class="border border-red-300">#</th>
                <th class="border border-red-300">Item</th>
                <th class="border border-red-300">Qty</th>
                <th class="border border-red-300">Unit</th>
                <th class="border border-red-300">Unit Price</th>
                <th class="border border-red-300">Amount</th>
                <th class="border border-red-300">Rejection Reason</th>
              </tr>
            </thead>
            <tbody class="bg-red-25 text-red-700">
              <tr
                v-for="(item, idx) in receipt.rejected_items"
                :key="idx"
                class="border border-red-300"
              >
                <td class="border border-red-300">{{ idx + 1 }}</td>
                <td class="border border-red-300">
                  {{ item.item_name || item.item_type_name }}
                </td>
                <td class="border border-red-300 text-right">
                  {{ Number(item.quantity || 0).toLocaleString() }}
                </td>
                <td class="border border-red-300">
                  {{ item.unit_of_measure || 'pieces' }}
                </td>
                <td class="border border-red-300 text-right">
                  ₱{{ Number(item.unit_cost || 0).toFixed(2) }}
                </td>
                <td class="border border-red-300 text-right">
                  ₱{{ Number(item.total_value || 0).toFixed(2) }}
                </td>
                <td class="border border-red-300 text-xs">
                  {{ extractRejectionReason(item.notes) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Signatories -->
        <div class="grid grid-cols-2 gap-12 mt-10 text-black">
          <div class="flex flex-col items-start">
            <div class="w-full border-b border-black h-8"></div>
            <div class="text-xs mt-1">
              Prepared by:
              <span class="font-semibold">{{
                receipt?.prepared_by || ''
              }}</span>
            </div>
          </div>
          <div class="flex flex-col items-start">
            <div class="w-full border-b border-black h-8"></div>
            <div class="text-xs mt-1">
              Received by:
              <span class="font-semibold">{{
                receipt?.received_by || ''
              }}</span>
            </div>
          </div>
        </div>

        <div class="modal-action flex gap-2 mt-6">
          <button
            class="btn btn-sm bg-primaryColor text-white font-thin border border-none hover:bg-primaryColor/80 shadow-none"
            @click="printReceipt"
          >
            Print
          </button>
          <button
            class="btn btn-sm bg-gray-200 text-black/50 font-thin border border-none hover:bg-gray-300 shadow-none"
            @click="onClose"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </dialog>
</template>
