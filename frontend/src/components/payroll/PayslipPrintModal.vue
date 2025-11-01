<template>
  <dialog id="payslip_print_modal" class="modal" v-if="show" open>
    <div
      class="modal-box bg-white text-black shadow-lg max-w-4xl max-h-[90vh] overflow-y-auto"
    >
      <!-- Header -->
      <div class="flex justify-between items-center pb-4 mb-4">
        <div class="flex items-center gap-3 header-left">
          <img src="/logo1.png" alt="Company Logo" class="w-12 h-12" />
          <div>
            <h2 class="text-2xl font-bold text-primaryColor">
              Countryside Steakhouse
            </h2>
            <p class="text-sm text-gray-600">Official Employee Payslip</p>
          </div>
        </div>
        <div class="header-right text-xs text-gray-600">
          <div style="line-height: 1.2">
            <div>{{ formatDate(new Date()) }}</div>
          </div>
        </div>
      </div>

      <!-- Employee Information -->
      <div class="mb-6">
        <h3
          class="text-base font-semibold text-gray-800 mb-3 border-b border-gray-300 pb-2"
        >
          Employee Information
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Personal Information -->
          <div class="bg-gray-50 p-4 rounded">
            <h4 class="font-semibold text-gray-700 mb-3 text-sm">
              Personal Details
            </h4>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Name:</span>
                <span class="text-sm font-medium">
                  {{
                    recordData?.employee_name ||
                    (recordData?.first_name && recordData?.last_name
                      ? recordData.first_name + ' ' + recordData.last_name
                      : '') ||
                    'N/A'
                  }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Position:</span>
                <span class="text-sm font-medium">{{
                  recordData?.role_name || 'N/A'
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Department:</span>
                <span class="text-sm font-medium">{{
                  recordData?.department || 'N/A'
                }}</span>
              </div>
            </div>
          </div>

          <!-- Pay Period Information -->
          <div class="bg-gray-50 p-4 rounded">
            <h4 class="font-semibold text-gray-700 mb-3 text-sm">
              Pay Period Details
            </h4>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Period:</span>
                <span class="text-sm font-medium">
                  {{
                    formatPeriodDisplay(
                      props.period?.date_from,
                      props.period?.date_to
                    ) || 'N/A'
                  }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-gray-600">Generated:</span>
                <span class="text-sm font-medium">{{
                  formatDate(new Date())
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Payroll Tables -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <!-- Earnings -->
        <div>
          <h3
            class="text-base font-semibold text-gray-800 mb-2 border-b border-gray-300 pb-1"
          >
            Earnings
          </h3>
          <table class="w-full text-sm border border-gray-300">
            <thead>
              <tr class="bg-gray-100">
                <th class="p-2 text-left border-r border-gray-300">
                  Description
                </th>
                <th class="p-2 text-center border-r border-gray-300">Hours</th>
                <th class="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b border-gray-200">
                <td class="p-2 bg-gray-50">Basic Salary</td>
                <td class="p-2 text-center">
                  {{ recordData?.hours_worked || '0.00' }}
                </td>
                <td class="p-2 text-right font-medium">
                  {{ formatCurrency(recordData?.basic_salary) }}
                </td>
              </tr>
              <tr class="border-b border-gray-200">
                <td class="p-2 bg-gray-50">Overtime Pay</td>
                <td class="p-2 text-center">
                  {{ recordData?.overtime_hours || '0.00' }}
                </td>
                <td class="p-2 text-right font-medium">
                  {{ formatCurrency(recordData?.overtime_pay) }}
                </td>
              </tr>
              <tr class="border-b border-gray-200">
                <td class="p-2 bg-gray-50">Regular Holiday Pay</td>
                <td class="p-2 text-center">
                  {{ recordData?.holiday_hours_worked || '0.00' }}
                </td>
                <td class="p-2 text-right font-medium">
                  {{ formatCurrency(recordData?.regular_holiday_pay) }}
                </td>
              </tr>
              <tr class="border-b border-gray-200">
                <td class="p-2 bg-gray-50">Special Holiday Pay</td>
                <td class="p-2 text-center">
                  {{ recordData?.holiday_hours_worked || '0.00' }}
                </td>
                <td class="p-2 text-right font-medium">
                  {{ formatCurrency(recordData?.special_holiday_pay) }}
                </td>
              </tr>
              <tr class="border-b border-gray-200">
                <td class="p-2 bg-gray-50">Night Differential</td>
                <td class="p-2 text-center">
                  {{ recordData?.night_diff_hours || '0.00' }}
                </td>
                <td class="p-2 text-right font-medium">
                  {{ formatCurrency(recordData?.night_diff_pay) }}
                </td>
              </tr>
              <tr class="border-b border-gray-200">
                <td class="p-2 bg-gray-50">SIL Conversion Pay</td>
                <td class="p-2 text-center">-</td>
                <td class="p-2 text-right font-medium">
                  {{ formatCurrency(recordData?.sil_conversion_pay) }}
                </td>
              </tr>
              <tr
                v-if="Number(recordData?.rest_day_pay || 0) > 0"
                class="border-b border-gray-200 bg-primaryColor/5"
              >
                <td class="p-2">
                  <div class="flex items-center gap-2">
                    <svg
                      class="w-4 h-4 text-primaryColor"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      ></path>
                    </svg>
                    <span class="font-medium text-primaryColor"
                      >Rest Day Premium</span
                    >
                    <span
                      class="text-xs text-gray-600 italic"
                      title="Additional pay for working on rest days (Day Off)"
                      >(Rest Day)</span
                    >
                  </div>
                </td>
                <td class="p-2 text-center text-gray-600">-</td>
                <td class="p-2 text-right font-medium text-primaryColor">
                  {{ formatCurrency(recordData?.rest_day_pay) }}
                </td>
              </tr>
              <tr class="font-bold border-t-2 border-gray-400">
                <td class="p-2 text-gray-800">Total Gross Salary</td>
                <td class="p-2 text-center text-gray-800"></td>
                <td class="p-2 text-right text-gray-900">
                  {{ formatCurrency(recordData?.gross_salary) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Deductions -->
        <div>
          <h3
            class="text-base font-semibold text-gray-800 mb-2 border-b border-gray-300 pb-1"
          >
            Deductions
          </h3>
          <table class="w-full text-sm border border-gray-300">
            <tbody>
              <tr
                v-for="(val, label) in deductionsList"
                :key="label"
                class="border-b border-gray-200"
              >
                <td class="p-2 bg-gray-50">{{ label }}</td>
                <td class="p-2 text-right font-medium">
                  {{ formatCurrency(val) }}
                </td>
              </tr>
              <tr class="font-bold border-t-2 border-gray-400">
                <td class="p-2 text-gray-800">Total Deductions</td>
                <td class="p-2 text-right text-gray-900">
                  {{ formatCurrency(recordData?.total_deductions) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Net Salary Summary -->
      <div class="mb-6">
        <div class="bg-gray-50 p-6">
          <div class="text-center">
            <h3 class="text-lg font-semibold text-gray-800 mb-3">NET SALARY</h3>
            <div class="border-t border-gray-300 pt-3">
              <p class="text-2xl font-bold text-gray-900">
                {{ formatCurrency(recordData?.net_salary) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Received By Section -->
      <div class="mt-20 mb-10">
        <div class="flex justify-end">
          <div class="text-center">
            <div class="border-t-2 border-gray-600 w-64 mb-3"></div>
            <p class="text-sm font-medium text-gray-700">Received by:</p>
            <p class="text-sm text-gray-600">Date:</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="text-center text-xs text-gray-500 border-t border-gray-300 pt-4 footer-text"
      >
        <p class="mt-1">
          Generated on {{ formatDate(new Date()) }} | Countryside Steakhouse
          Payroll System
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="modal-action">
        <button
          @click="printPayslip"
          class="btn bg-primaryColor text-white hover:bg-primaryColor/90 font-thin"
        >
          <i class="fas fa-print mr-2"></i>Print Payslip
        </button>
        <button @click="closeModal" class="btn btn-ghost">Close</button>
      </div>
    </div>

    <div class="modal-backdrop bg-black/50" @click="closeModal"></div>
  </dialog>
</template>

<script setup>
  import { computed } from 'vue';

  const props = defineProps({
    show: { type: Boolean, required: true },
    record: { type: Object, default: null },
    period: { type: Object, default: null },
  });
  const emit = defineEmits(['close']);

  const recordData = computed(() => {
    return !props.record ? null : props.record;
  });

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    });
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateRange = (from, to) => {
    if (!from || !to) return '';
    return `${formatDate(from)} - ${formatDate(to)}`;
  };

  const formatPeriodDisplay = (from, to) => {
    if (!from || !to) return '';
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const month = fromDate.toLocaleDateString('en-US', { month: 'long' });
    const year = fromDate.getFullYear();
    const startDay = fromDate.getDate();
    const endDay = toDate.getDate();

    return `${month} ${year} (${startDay}-${endDay})`;
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      paid: 'bg-blue-100 text-blue-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  const printPayslip = () => {
    console.log('printPayslip called - recordData:', recordData.value);
    console.log('printPayslip called - props.record:', props.record);
    console.log('printPayslip called - props.period:', props.period);

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (printWindow) {
      // Get the modal content
      const modalElement = document.getElementById('payslip_print_modal');
      if (modalElement) {
        // Clone the modal content
        const modalContent = modalElement.cloneNode(true);

        // Create the print HTML
        const printHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Payslip - ${recordData.value?.employee_name || 'Employee'}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                color: black; 
                background: white;
                width: 100%;
                max-width: 100%;
                overflow-x: hidden;
              }
              .modal-box { 
                width: 100%; 
                max-width: 100%; 
                background: white; 
                color: black; 
                border: none; 
                box-shadow: none; 
                padding: 20px; 
                margin: 0;
                overflow-x: hidden;
              }
              table { 
                width: 100%; 
                max-width: 100%;
                border-collapse: collapse; 
                margin: 10px 0;
                table-layout: fixed;
              }
              td, th { 
                border: 1px solid #ccc; 
                padding: 6px; 
                text-align: left;
                word-wrap: break-word;
                overflow-wrap: break-word;
                max-width: 0;
              }
              .bg-gray-50 { 
                background-color: #f9f9f9; 
              }
              .text-right { 
                text-align: right; 
              }
              .font-bold { 
                font-weight: bold; 
              }
              .text-primaryColor { 
                color: #466114; 
              }
              .text-green-600 { 
                color: #16a34a; 
              }
              .text-red-600 { 
                color: #dc2626; 
              }
              .text-blue-600 { 
                color: #2563eb; 
              }
              .text-gray-900 { 
                color: #111827; 
              }
              .bg-green-50 { 
                background-color: #f0fdf4; 
              }
              .bg-gray-50 { 
                background-color: #f9f9f9; 
              }
              .border { 
                border: 1px solid #ccc; 
              }
              .border-b { 
                border-bottom: 1px solid #ccc; 
              }
              .border-t { 
                border-top: 1px solid #ccc; 
              }
              .border-gray-300 { 
                border-color: #d1d5db; 
              }
              .text-gray-800 { 
                color: #1f2937; 
              }
              .text-gray-900 { 
                color: #111827; 
              }
              .text-gray-600 { 
                color: #4b5563; 
              }
              .text-gray-700 { 
                color: #374151; 
              }
              .space-y-2 > * + * { 
                margin-top: 8px; 
              }
              .rounded { 
                border-radius: 6px; 
              }
              .p-2 { 
                padding: 8px; 
              }
              .pb-4 { 
                padding-bottom: 16px; 
              }
              .mb-4 { 
                margin-bottom: 16px; 
              }
              .mb-6 { 
                margin-bottom: 24px; 
              }
              .mt-1 { 
                margin-top: 4px; 
              }
              .px-2 { 
                padding-left: 8px; 
                padding-right: 8px; 
              }
              .py-1 { 
                padding-top: 4px; 
                padding-bottom: 4px; 
              }
              .rounded { 
                border-radius: 4px; 
              }
              .text-xs { 
                font-size: 12px; 
              }
              .text-sm { 
                font-size: 14px; 
              }
              .text-base { 
                font-size: 16px; 
              }
              .text-lg { 
                font-size: 18px; 
              }
              .text-2xl { 
                font-size: 24px; 
              }
              .text-3xl { 
                font-size: 30px; 
              }
              .font-semibold { 
                font-weight: 600; 
              }
              .font-bold { 
                font-weight: bold; 
              }
              .font-extrabold { 
                font-weight: 800; 
              }
              .w-1\/3 { 
                width: 25%; 
              }
              .w-12 { 
                width: 48px; 
              }
              .h-12 { 
                height: 48px; 
              }
              .flex { 
                display: flex; 
                flex-wrap: wrap;
                max-width: 100%;
              }
              .justify-between { 
                justify-content: space-between; 
              }
              .items-center { 
                align-items: center; 
              }
              .gap-3 { 
                gap: 8px; 
              }
              /* Header specific fixes */
              .header-right {
                text-align: right;
                max-width: 120px;
                word-wrap: break-word;
                font-size: 10px;
                white-space: normal;
                overflow: hidden;
                line-height: 1.1;
                flex-shrink: 0;
              }
              .header-left {
                flex: 1;
                min-width: 0;
                max-width: calc(100% - 140px);
              }
              .header-left h2 {
                font-size: 16px;
                margin: 0;
              }
              .header-left p {
                font-size: 10px;
                margin: 0;
              }
              .grid { 
                display: grid; 
              }
              .grid-cols-1 { 
                grid-template-columns: repeat(1, minmax(0, 1fr)); 
              }
              .md\\:grid-cols-2 { 
                grid-template-columns: repeat(2, minmax(0, 1fr)); 
              }
              @media (min-width: 768px) {
                .md\\:grid-cols-2 { 
                  grid-template-columns: repeat(2, minmax(0, 1fr)); 
                }
              }
              /* Specific fixes for overflow */
              .grid { 
                display: grid; 
                gap: 10px;
                max-width: 100%;
              }
              .grid-cols-1 { 
                grid-template-columns: 1fr; 
              }
              .md\\:grid-cols-2 { 
                grid-template-columns: 1fr 1fr; 
              }
              @media (max-width: 768px) {
                .md\\:grid-cols-2 { 
                  grid-template-columns: 1fr; 
                }
              }
              /* Government Benefits table specific */
              .government-benefits table {
                width: 100%;
                max-width: 100%;
              }
              .government-benefits td {
                padding: 4px 6px;
                font-size: 12px;
              }
              /* Footer text */
              .footer-text {
                font-size: 10px;
                word-wrap: break-word;
                max-width: 100%;
              }
              @media print {
                body { 
                  margin: 0; 
                  padding: 20px; 
                  max-width: 100%;
                  overflow-x: hidden;
                }
                .modal-action, .modal-backdrop { display: none !important; }
                * { 
                  max-width: 100% !important; 
                  box-sizing: border-box !important;
                }
                /* Header responsive fixes for print */
                .header-right {
                  max-width: 100px !important;
                  font-size: 9px !important;
                }
                .header-left {
                  max-width: calc(100% - 120px) !important;
                }
                .header-left h2 {
                  font-size: 14px !important;
                }
                .header-left p {
                  font-size: 9px !important;
                }
                .header-left img {
                  width: 32px !important;
                  height: 32px !important;
                }
              }
            </style>
          </head>
          <body>
            ${modalContent.innerHTML}
          </body>
          </html>
        `;

        // Write the content to the new window
        printWindow.document.write(printHTML);
        printWindow.document.close();

        // Wait for content to load, then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        };
      } else {
        console.error('Modal element not found');
        printWindow.close();
      }
    } else {
      console.error('Could not open print window');
      // Fallback to regular print
      window.print();
    }
  };
  const closeModal = () => emit('close');

  const earningsList = computed(() => ({
    'Basic Salary': recordData.value?.basic_salary,
    'Overtime Pay': recordData.value?.overtime_pay,
    'Regular Holiday Pay': recordData.value?.regular_holiday_pay,
    'Special Holiday Pay': recordData.value?.special_holiday_pay,
    'Night Differential': recordData.value?.night_diff_pay,
    'SIL Conversion Pay': recordData.value?.sil_conversion_pay,
    'Rest Day Premium': recordData.value?.rest_day_pay,
  }));

  const deductionsList = computed(() => ({
    SSS: recordData.value?.sss_employee_share,
    PhilHealth: recordData.value?.philhealth_employee_share,
    'Pag-IBIG': recordData.value?.pagibig_employee_share,
    'Withholding Tax': recordData.value?.withholding_tax,
    ...(Number(recordData.value?.previous_balance_applied || 0) !== 0
      ? {
          'Previous Balance Applied':
            recordData.value?.previous_balance_applied,
        }
      : {}),
    ...(Number(recordData.value?.new_balance_carryover || 0) !== 0
      ? {
          'Carry Balance': Math.abs(
            Number(recordData.value?.new_balance_carryover || 0)
          ),
        }
      : {}),
  }));
</script>

<style>
  @media print {
    /* Force everything to be visible for payslip modal */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Hide everything except the payslip modal */
    body * {
      visibility: hidden !important;
    }

    #payslip_print_modal,
    #payslip_print_modal * {
      visibility: visible !important;
      display: block !important;
    }

    body > *:not(#payslip_print_modal) {
      display: none !important;
    }

    /* Modal positioning for print */
    #payslip_print_modal {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: white !important;
      z-index: 999999 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      display: block !important;
    }

    /* Modal box styling for print */
    #payslip_print_modal .modal-box {
      width: 100% !important;
      max-width: none !important;
      height: auto !important;
      background: white !important;
      color: black !important;
      border: none !important;
      box-shadow: none !important;
      padding: 24px !important;
      margin: 0 !important;
      position: relative !important;
      display: block !important;
      visibility: visible !important;
    }

    /* Hide action buttons and backdrop during print */
    #payslip_print_modal .modal-action,
    #payslip_print_modal .modal-backdrop {
      display: none !important;
      visibility: hidden !important;
    }

    /* Force table display */
    #payslip_print_modal table {
      display: table !important;
      color: black !important;
      visibility: visible !important;
      width: 100% !important;
    }

    #payslip_print_modal tr {
      display: table-row !important;
      visibility: visible !important;
    }

    #payslip_print_modal td,
    #payslip_print_modal th {
      display: table-cell !important;
      color: black !important;
      visibility: visible !important;
      padding: 8px !important;
    }

    /* Force all text elements to be visible */
    #payslip_print_modal div,
    #payslip_print_modal p,
    #payslip_print_modal h1,
    #payslip_print_modal h2,
    #payslip_print_modal h3,
    #payslip_print_modal span,
    #payslip_print_modal strong,
    #payslip_print_modal b {
      color: black !important;
      visibility: visible !important;
      display: block !important;
    }

    /* Page settings */
    @page {
      margin: 0.6in;
      size: A4;
    }
  }
</style>
