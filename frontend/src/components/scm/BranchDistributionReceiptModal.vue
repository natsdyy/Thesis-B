<script setup>
  import { watch } from 'vue';
  import { sanitizeHtml } from '../../utils/sanitizeHtml.js';

  const props = defineProps({
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

  const printReceipt = () => {
    try {
      const printWindow = window.open(
        '',
        '_blank',
        'width=900,height=700,noopener'
      );
      if (!printWindow) return window.print();

      // Select the exact modal content
      const modalEl = document.getElementById(
        'branch_distribution_receipt_modal'
      );
      const content = modalEl ? modalEl.querySelector('.modal-box') : null;
      if (!content) return window.print();

      // Scaffold minimal HTML
      const doc = printWindow.document;
      doc.open();
      doc.write(`<!DOCTYPE html><html><head>
        <meta charset="utf-8" />
        <title>Branch Distribution Receipt</title>
        <base href="${location.origin}/">
        <style>
          html, body { background:#fff !important; color:#111; margin:0; }
          .print-container{ max-width:1152px; margin:0.5in auto; padding:16px; background:#fff; }
          /* Hide action buttons inside the cloned modal */
          .modal-action{ display:none !important; }
          /* Ensure images and tables print cleanly */
          .prose img{ max-width:100% !important; height:auto !important; page-break-inside:avoid; }
          table{ page-break-inside:avoid; border-collapse:collapse; }
          @page{ size:A4; margin:0; }
        </style>
      </head><body></body></html>`);
      doc.close();

      // Copy all existing styles so Tailwind/DaisyUI classes render the same
      const head = doc.head;
      const currentHead = document.head;
      currentHead
        .querySelectorAll('link[rel="stylesheet"], style')
        .forEach((node) => {
          try {
            head.appendChild(node.cloneNode(true));
          } catch (_) {}
        });

      // Strong print overrides to force proper table layout regardless of framework CSS
      const strongOverrides = doc.createElement('style');
      strongOverrides.type = 'text/css';
      strongOverrides.textContent = `
        /* Force real tables in print to avoid single-row rendering */
        table, .table { width: 100% !important; border-collapse: collapse !important; background: #fff !important; }
        thead, .table thead { display: table-header-group !important; }
        tbody, .table tbody { display: table-row-group !important; }
        tr, .table tr { display: table-row !important; }
        th, td, .table th, .table td { display: table-cell !important; border: 1px solid #000 !important; padding: 6px 8px !important; color:#111 !important; vertical-align: top !important; }
        th, .table th { background: #fff !important; font-weight: 600 !important; text-align: left !important; }
        /* Avoid DaisyUI responsive blocks in print by unsetting its :where() cascade */
        .table :where(thead, tbody, tr, th, td){ all: unset; }
        .table thead{ display: table-header-group !important; }
        .table tbody{ display: table-row-group !important; }
        .table tr{ display: table-row !important; }
        .table th, .table td{ display: table-cell !important; border: 1px solid #000 !important; padding: 6px 8px !important; }
      `;
      head.appendChild(strongOverrides);

      // Clone the modal content into a constrained container
      const wrapper = doc.createElement('div');
      wrapper.className = 'print-container';
      wrapper.appendChild(content.cloneNode(true));
      doc.body.appendChild(wrapper);

      printWindow.focus();
      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.print();
            printWindow.close();
          } catch (_) {}
        }, 200);
      };
    } catch (_) {
      window.print();
    }
  };

  const extractRejectionReason = (notes) => {
    if (!notes) return 'No reason provided';

    // Extract reason from notes format: "Item rejected by branch: {reason}. {notes}"
    const match = notes.match(/Item rejected by branch: ([^.]+)/);
    if (match && match[1]) {
      return match[1].trim();
    }

    return 'Unknown reason';
  };

  const formatRejectionReason = (reason) => {
    if (!reason || reason === 'No reason provided') return 'No reason provided';

    // Convert underscore-separated text to proper title case
    return reason
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
</script>

<template>
  <dialog id="branch_distribution_receipt_modal" class="modal" v-if="show" open>
    <div
      class="modal-box bg-accentColor text-black/50 shadow-lg max-w-6xl max-h-[90vh] overflow-y-auto"
    >
      <div class="flex justify-between items-center mb-2 text-black">
        <div class="flex items-center gap-2 mb-2 w-full">
          <img src="/logo1.png" alt="" class="w-10 h-10" />
          <h3 class="font-bold text-lg">Countryside Steakhouse</h3>
        </div>
        <div class="flex flex-col items-end w-full">
          <p class="text-xs">
            {{
              new Date(
                props.receipt?.completed_at || Date.now()
              ).toLocaleString('en-PH')
            }}
          </p>
          <p class="text-xs">
            Distribution Ref: {{ props.receipt?.reference || 'N/A' }}
          </p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <div class="mb-2 text-black text-sm">
          <div>
            Branch:
            <span class="font-semibold">{{ props.receipt?.branch_name }}</span>
          </div>
          <div v-if="props.receipt?.notes">
            Notes: <span>{{ props.receipt?.notes }}</span>
          </div>
          <div
            v-if="props.receipt?.status === 'partially_processed'"
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
              v-for="(it, idx) in props.receipt?.items || []"
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
                ₱{{ Number(props.receipt?.total_amount || 0).toFixed(2) }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Rejected Items Section (for partially processed distributions) -->
        <div
          v-if="
            props.receipt?.status === 'partially_processed' &&
            props.receipt?.rejected_items?.length > 0
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
                  {{
                    item.name ||
                    item.item_name ||
                    item.item_type_name ||
                    'Unknown Item'
                  }}
                </td>
                <td class="border border-red-300 text-right">
                  {{ Number(item.quantity || 0).toLocaleString() }}
                </td>
                <td class="border border-red-300">
                  {{ item.unit || item.unit_of_measure || 'pieces' }}
                </td>
                <td class="border border-red-300 text-right">
                  ₱{{ Number(item.unit_cost || 0).toFixed(2) }}
                </td>
                <td class="border border-red-300 text-right">
                  ₱{{ Number(item.total_value || 0).toFixed(2) }}
                </td>
                <td class="border border-red-300 text-xs">
                  {{
                    formatRejectionReason(
                      item.rejection_reason ||
                        extractRejectionReason(item.notes) ||
                        'No reason provided'
                    )
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Rejection Proofs (images/text provided per rejected item) -->
        <div
          v-if="
            props.receipt?.status === 'partially_processed' &&
            (props.receipt?.rejected_items || []).some((x) => x.rejection_notes)
          "
          class="mt-6"
        >
          <h4 class="text-red-800 font-semibold text-sm mb-2">
            Rejection Proofs
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <template
              v-for="(item, idx) in props.receipt.rejected_items"
              :key="`rej-proof-${idx}`"
            >
              <div
                v-if="item.rejection_notes"
                class="bg-white p-3 border rounded"
              >
                <div class="text-xs font-semibold mb-2 text-black">
                  {{ item.name || item.item_name || 'Rejected Item' }}
                </div>
                <div
                  class="prose prose-sm max-w-none"
                  v-html="sanitizeHtml(item.rejection_notes)"
                ></div>
              </div>
            </template>
          </div>
        </div>

        <!-- Signatories -->
        <div class="grid grid-cols-2 gap-12 mt-10 text-black">
          <div class="flex flex-col items-start">
            <div class="w-full border-b border-black h-8"></div>
            <div class="text-xs mt-1">
              Prepared by:
              <span class="font-semibold">{{
                props.receipt?.prepared_by || ''
              }}</span>
            </div>
            <!-- Prepared proof (sanitized HTML) -->
            <div v-if="props.receipt?.prepared_proof_html" class="mt-2 w-full">
              <div
                class="prose prose-sm max-w-none bg-white p-2 border rounded"
                v-html="sanitizeHtml(props.receipt.prepared_proof_html)"
              ></div>
            </div>
          </div>
          <div class="flex flex-col items-start">
            <div class="w-full border-b border-black h-8"></div>
            <div class="text-xs mt-1">
              Received by:
              <span class="font-semibold">{{
                props.receipt?.processed_by ||
                props.receipt?.completed_by ||
                props.receipt?.received_by ||
                'Not specified'
              }}</span>
            </div>
            <!-- Received proof (sanitized HTML) -->
            <div v-if="props.receipt?.received_proof_html" class="mt-2 w-full">
              <div
                class="prose prose-sm max-w-none bg-white p-2 border rounded"
                v-html="sanitizeHtml(props.receipt.received_proof_html)"
              ></div>
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
<style scoped>
  /* Ensure embedded proof images scale nicely and print correctly */
  .prose img {
    max-width: 100%;
    height: auto;
  }

  @media print {
    .prose img {
      max-width: 100%;
      height: auto;
      page-break-inside: avoid;
    }
  }
</style>
