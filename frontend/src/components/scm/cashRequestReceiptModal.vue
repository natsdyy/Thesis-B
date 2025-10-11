<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    cashRequestReceipt: {
      show: { type: Boolean, default: true },
      receipt: { type: Object, default: null },
      onClose: { type: Function, required: true },
    },
  });

  const printReceipt = () => {
    window.print();
  };

  // Determine if this is a payroll receipt based on the data structure
  const isPayrollReceipt = computed(() => {
    const receipt = props.cashRequestReceipt.receipt;
    console.log('Receipt data in modal:', receipt);
    console.log('Has records:', !!receipt?.records);
    console.log('Has period_name:', !!receipt?.period_name);
    const isPayroll = receipt?.records && receipt?.period_name;
    console.log('Is payroll receipt:', isPayroll);
    return isPayroll;
  });

  // Helper function to format currency
  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
    });
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
              formatDate(
                cashRequestReceipt.receipt?.budget_released_at ||
                  cashRequestReceipt.receipt?.completed_at ||
                  cashRequestReceipt.receipt?.updated_at ||
                  Date.now()
              )
            }}
          </p>
          <p class="text-xs">
            <span v-if="isPayrollReceipt">
              Payroll Period: {{ cashRequestReceipt.receipt?.period_name }}
            </span>
            <span v-else>
              Request ID: {{ cashRequestReceipt.receipt?.request_id }}
            </span>
          </p>
        </div>
      </div>
      <div class="overflow-x-auto">
        <!-- Payroll Receipt Table -->
        <div v-if="isPayrollReceipt">
          <!-- Employee Details Table -->
          <table class="table table-xs text-black mb-4 text-xs">
            <thead class="text-black text-xs">
              <tr class="border border-black">
                <th class="border border-black">Emp. No.</th>
                <th class="border border-black">Employee Name</th>
                <th class="border border-black">Department</th>
                <th class="border border-black">Position</th>
                <th class="border border-black">Days Worked</th>
                <th class="border border-black">Hours Worked</th>
                <th class="border border-black">Basic Salary</th>
                <th class="border border-black">Overtime Pay</th>
                <th class="border border-black">Gross Salary</th>
                <th class="border border-black">Deductions</th>
                <th class="border border-black">Net Salary</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(record, idx) in cashRequestReceipt.receipt?.records ||
                []"
                :key="record.id || idx"
                class="border border-black"
              >
                <td class="border border-black">{{ idx + 1 }}</td>
                <td class="border border-black">{{ record.employee_name }}</td>
                <td class="border border-black">{{ record.department }}</td>
                <td class="border border-black">{{ record.role_name }}</td>
                <td class="border border-black">{{ record.days_worked }}</td>
                <td class="border border-black">{{ record.hours_worked }}</td>
                <td class="border border-black">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{ formatCurrency(record.basic_salary) }}
                </td>
                <td class="border border-black">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{ formatCurrency(record.overtime_pay) }}
                </td>
                <td class="border border-black">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{ formatCurrency(record.gross_salary) }}
                </td>
                <td class="border border-black">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{ formatCurrency(record.total_deductions) }}
                </td>
                <td class="border border-black font-semibold">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{ formatCurrency(record.net_salary) }}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Payroll Summary -->
          <div class="bg-white/10 p-4 rounded-lg mb-4">
            <h4 class="font-semibold text-black mb-3">Payroll Summary</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="flex justify-between">
                <span>Period:</span>
                <span class="font-medium">{{
                  cashRequestReceipt.receipt?.period_name
                }}</span>
              </div>
              <div class="flex justify-between">
                <span>Date From:</span>
                <span class="font-medium">{{
                  formatDate(cashRequestReceipt.receipt?.date_from)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span>Date To:</span>
                <span class="font-medium">{{
                  formatDate(cashRequestReceipt.receipt?.date_to)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span>Generated By:</span>
                <span class="font-medium">{{
                  cashRequestReceipt.receipt?.generated_by_name
                }}</span>
              </div>
              <div class="flex justify-between">
                <span>Total Gross Amount:</span>
                <span class="font-semibold">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{
                    formatCurrency(
                      cashRequestReceipt.receipt?.total_gross_amount
                    )
                  }}
                </span>
              </div>
              <div class="flex justify-between">
                <span>Total Deductions:</span>
                <span class="font-semibold">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{
                    formatCurrency(cashRequestReceipt.receipt?.total_deductions)
                  }}
                </span>
              </div>
              <div class="flex justify-between col-span-2 border-t pt-2">
                <span class="font-semibold">Total Net Amount:</span>
                <span class="font-bold text-lg">
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{
                    formatCurrency(cashRequestReceipt.receipt?.total_net_amount)
                  }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Supply Request Receipt Table -->
        <div v-else>
          <table class="table table-xs text-black">
            <thead class="text-black text-xs">
              <tr class="border border-black">
                <th class="border border-black">Item No.</th>
                <th class="border border-black">Item Name</th>
                <th class="border border-black">Quantity</th>
                <th class="border border-black">Unit</th>
                <th class="border border-black">Type</th>
                <th class="border border-black">Unit Price</th>
                <th class="border border-black">Amount</th>
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
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{
                    Number(
                      item.item_amount ||
                        item.item_quantity * item.item_unit_price
                    ).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
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
                  <font-awesome-icon icon="fa-solid fa-peso-sign" />
                  {{
                    Number(
                      cashRequestReceipt.receipt?.total_amount || 0
                    ).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-2 text-black">
          <h6 class="text-xs">Remarks:</h6>
          <textarea
            class="text-xs w-full h-20 border border-black/30 rounded-md p-2 text-black/50"
            readonly
            >{{
              cashRequestReceipt.receipt?.finance_remarks ||
              cashRequestReceipt.receipt?.remarks ||
              ''
            }}</textarea
          >
        </div>

        <div class="flex justify-between items-center mt-2 text-black">
          <div class="flex items-center gap-2">
            <p class="text-sm">
              <span v-if="isPayrollReceipt">Prepared & Received by:</span>
              <span v-else>Requested & Received by:</span>
            </p>
            <p class="text-sm">
              {{
                isPayrollReceipt
                  ? cashRequestReceipt.receipt?.generated_by_name
                  : cashRequestReceipt.receipt?.requested_by
              }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <p class="text-sm">Approved & Released by:</p>
            <p class="text-sm">
              {{
                isPayrollReceipt
                  ? cashRequestReceipt.receipt?.finance_approved_by_name
                  : cashRequestReceipt.receipt?.released_by
              }}
            </p>
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

<style scoped>
  @media print {
    .modal-box {
      max-width: none !important;
      width: 100% !important;
      margin: 0 !important;
      box-shadow: none !important;
    }

    .modal-action {
      display: none !important;
    }

    .table {
      font-size: 10px !important;
    }

    .table th,
    .table td {
      padding: 4px !important;
    }
  }
</style>
