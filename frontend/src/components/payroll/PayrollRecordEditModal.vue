<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-2 sm:p-4 backdrop-blur-sm"
    @click.self="closeModal"
  >
    <div
      class="bg-accentColor rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-black/10"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-4 bg-primaryColor text-white border-b border-black/10"
      >
        <h2 class="text-md font-thin">
          Edit Payroll Record - {{ formData.employee_name }}
        </h2>
        <button
          @click="closeModal"
          class="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <form @submit.prevent="saveChanges" class="p-6">
        <div class="space-y-6">
          <!-- Attendance Adjustments -->
          <div class="bg-white border border-black/10 rounded-xl p-4">
            <h3 class="text-md font-semibold text-primaryColor mb-4">
              Attendance Adjustments
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-black/60 mb-2">
                  Days Worked
                </label>
                <input
                  v-model.number="formData.days_worked"
                  type="number"
                  step="0.5"
                  min="0"
                  class="w-full px-3 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                  @input="recalculatePayroll"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-black/60 mb-2">
                  Hours Worked
                </label>
                <input
                  v-model.number="formData.hours_worked"
                  type="number"
                  step="0.25"
                  min="0"
                  class="w-full px-3 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                  @input="recalculatePayroll"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-black/60 mb-2">
                  Overtime Hours
                </label>
                <input
                  v-model.number="formData.overtime_hours"
                  type="number"
                  step="0.25"
                  min="0"
                  class="w-full px-3 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                  @input="recalculatePayroll"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-black/60 mb-2">
                  Leave Days
                </label>
                <input
                  v-model.number="formData.leave_days"
                  type="number"
                  step="0.5"
                  min="0"
                  class="w-full px-3 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                  @input="recalculatePayroll"
                />
              </div>
            </div>
          </div>

          <!-- Manual Adjustments -->
          <div class="bg-white border border-black/10 rounded-xl p-4">
            <h3 class="text-md font-semibold text-primaryColor mb-4">
              Manual Pay Adjustments
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-black/60 mb-2">
                  Additional Earnings (<i class="fas fa-peso-sign"></i>)
                </label>
                <input
                  v-model.number="formData.additional_earnings"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full px-3 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                  placeholder="Bonus, allowances, etc."
                  @input="recalculatePayroll"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-black/60 mb-2">
                  Additional Deductions (<i class="fas fa-peso-sign"></i>)
                </label>
                <input
                  v-model.number="formData.additional_deductions"
                  type="number"
                  step="0.01"
                  min="0"
                  class="w-full px-3 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-primaryColor focus:border-transparent"
                  placeholder="Cash advance, etc."
                  @input="recalculatePayroll"
                />
              </div>
            </div>
          </div>

          <!-- Calculated Summary (Read-only) -->
          <div class="bg-white border border-black/10 rounded-xl p-4">
            <h3 class="text-md font-semibold text-primaryColor mb-4">
              Calculated Summary
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-sm text-black/60">Basic Salary:</span>
                <span class="font-medium text-gray-700"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(calculated.basic_salary) }}</span
                >
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-black/60">Overtime Pay:</span>
                <span class="font-medium text-gray-700"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(calculated.overtime_pay) }}</span
                >
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-black/60">Additional Earnings:</span>
                <span class="font-medium text-primaryColor"
                  >+<i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(formData.additional_earnings || 0) }}</span
                >
              </div>
              <div
                class="flex justify-between items-center pt-2 border-t border-black/10"
              >
                <span class="font-bold text-primaryColor">Gross Salary:</span>
                <span class="font-bold text-gray-700 text-md"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(calculated.gross_salary) }}</span
                >
              </div>
              <div
                class="flex justify-between items-center pt-2 border-t border-black/10"
              >
                <span class="text-sm text-black/60"
                  >Government Deductions:</span
                >
                <span class="font-medium text-error"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(calculated.gov_deductions) }}</span
                >
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm text-black/60"
                  >Additional Deductions:</span
                >
                <span class="font-medium text-error"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{
                    formatCurrency(formData.additional_deductions || 0)
                  }}</span
                >
              </div>
              <div
                class="flex justify-between items-center pt-2 border-t border-black/10"
              >
                <span class="font-bold text-error">Total Deductions:</span>
                <span class="font-bold text-gray-700 text-md"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(calculated.total_deductions) }}</span
                >
              </div>
            </div>
          </div>

          <!-- Net Salary -->
          <div class="bg-primaryColor/10 rounded-xl p-4 border border-black/10">
            <div class="flex justify-between items-center text-primaryColor">
              <span class="text-md font-thin">Net Salary</span>
              <span class="text-md font-thin"
                ><i class="fas fa-peso-sign mr-1"></i
                >{{ formatCurrency(calculated.net_salary) }}</span
              >
            </div>
          </div>

          <!-- Remarks -->
          <div class="bg-white border border-black/10 rounded-xl p-4">
            <label class="block text-sm font-medium text-black/60 mb-2">
              Remarks / Notes
            </label>
            <textarea
              v-model="formData.remarks"
              rows="3"
              class="w-full px-3 py-2 border border-black/10 rounded-lg focus:ring-2 focus:ring-primaryColor focus:border-transparent"
              placeholder="Add any notes or explanations for adjustments..."
            ></textarea>
          </div>
        </div>
      </form>

      <!-- Footer -->
      <div
        class="px-6 py-4 bg-accentColor border-t border-black/10 flex justify-end gap-3"
      >
        <button
          type="button"
          @click="closeModal"
          class="btn btn-sm font-thin border-none bg-gray-200 hover:bg-gray-300 text-black/50"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="saveChanges"
          class="btn btn-sm font-thin border-none bg-primaryColor hover:bg-primaryColor/90 text-white"
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
</template>

<script>
  import { ref, reactive, watch, computed } from 'vue';

  export default {
    name: 'PayrollRecordEditModal',
    props: {
      show: {
        type: Boolean,
        required: true,
      },
      record: {
        type: Object,
        default: null,
      },
    },
    emits: ['close', 'save'],
    setup(props, { emit }) {
      const formData = reactive({
        id: null,
        employee_name: '',
        days_worked: 0,
        hours_worked: 0,
        overtime_hours: 0,
        leave_days: 0,
        additional_earnings: 0,
        additional_deductions: 0,
        remarks: '',
        rate_per_hour: 0,
      });

      const calculated = reactive({
        basic_salary: 0,
        overtime_pay: 0,
        gross_salary: 0,
        gov_deductions: 0,
        total_deductions: 0,
        net_salary: 0,
      });

      // Watch for record changes
      watch(
        () => props.record,
        (newRecord) => {
          if (newRecord) {
            formData.id = newRecord.id;
            formData.employee_name = newRecord.employee_name;
            formData.days_worked = newRecord.days_worked || 0;
            formData.hours_worked = newRecord.hours_worked || 0;
            formData.overtime_hours = newRecord.overtime_hours || 0;
            formData.leave_days = newRecord.leave_days || 0;
            formData.additional_earnings = 0;
            formData.additional_deductions = 0;
            formData.remarks = newRecord.remarks || '';
            formData.rate_per_hour = newRecord.rate_per_hour || 0;

            recalculatePayroll();
          }
        },
        { immediate: true }
      );

      const recalculatePayroll = () => {
        // Basic salary calculation
        const hourlyRate = Number(formData.rate_per_hour);
        const hoursWorked = Number(formData.hours_worked) || 0;
        const overtimeHours = Number(formData.overtime_hours) || 0;

        calculated.basic_salary = hoursWorked * hourlyRate;
        calculated.overtime_pay = overtimeHours * hourlyRate * 1.25; // OT rate is 1.25x

        const additionalEarnings = Number(formData.additional_earnings) || 0;
        calculated.gross_salary =
          calculated.basic_salary +
          calculated.overtime_pay +
          additionalEarnings;

        // Estimate government deductions (simplified - actual calculation is on backend)
        // For display purposes only
        const monthlySalary = calculated.gross_salary * 2; // Assume bi-weekly

        // SSS estimation (simplified)
        let sss = 0;
        if (monthlySalary <= 3250) sss = 135;
        else if (monthlySalary <= 30000)
          sss = monthlySalary * 0.045; // 4.5% employee share
        else sss = 1350; // Max

        // PhilHealth: 2.25% of gross (max base salary 90,000/month)
        const philhealth = Math.min(monthlySalary, 90000) * 0.0225;

        // Pag-IBIG
        let pagibig = 100;
        if (monthlySalary > 1500) {
          pagibig = Math.min(monthlySalary * 0.02, 200); // 2%, max 200
        }

        calculated.gov_deductions = (sss + philhealth + pagibig) / 2; // Divide by 2 for bi-weekly

        const additionalDeductions =
          Number(formData.additional_deductions) || 0;
        calculated.total_deductions =
          calculated.gov_deductions + additionalDeductions;

        calculated.net_salary =
          calculated.gross_salary - calculated.total_deductions;
      };

      const formatCurrency = (value) => {
        return Number(value || 0).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      };

      const saveChanges = () => {
        const updatedRecord = {
          id: formData.id,
          hours_worked: formData.hours_worked,
          overtime_hours: formData.overtime_hours,
          days_worked: formData.days_worked,
          leave_days: formData.leave_days,
          remarks: formData.remarks,
          // Include manual adjustments if needed
          additional_earnings: formData.additional_earnings,
          additional_deductions: formData.additional_deductions,
        };

        emit('save', updatedRecord);
      };

      const closeModal = () => {
        emit('close');
      };

      return {
        formData,
        calculated,
        recalculatePayroll,
        formatCurrency,
        saveChanges,
        closeModal,
      };
    },
  };
</script>
