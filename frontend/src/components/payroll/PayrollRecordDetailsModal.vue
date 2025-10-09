<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-2 sm:p-4 backdrop-blur-sm"
    @click.self="closeModal"
  >
    <div
      class="bg-accentColor rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-black/10"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-4 bg-primaryColor text-white border-b border-black/10"
      >
        <h2 class="text-md font-thin">
          Payroll Details - {{ record?.employee_name }}
        </h2>
        <button
          @click="closeModal"
          class="text-white hover:bg-white/20 rounded-full p-2 transition-colors "
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
      <div class="p-6">
        <div class="space-y-6">
          <!-- Employee Information -->
          <div class="bg-white border border-black/10 rounded-xl p-4">
            <h3 class="text-md font-semibold text-primaryColor mb-3">
              Employee Information
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-black/60">Name</p>
                <p class="font-medium text-black/70">
                  {{ record?.employee_name }}
                </p>
              </div>
              <div>
                <p class="text-sm text-black/60">Department</p>
                <p class="font-medium text-black/70">
                  {{ record?.department }}
                </p>
              </div>
              <div>
                <p class="text-sm text-black/60">Position</p>
                <p class="font-medium text-black/70">{{ record?.role_name }}</p>
              </div>
              <div>
                <p class="text-sm text-black/60">Hourly Rate</p>
                <p class="font-medium text-primaryColor">
                  <i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.rate_per_hour) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Time & Attendance -->
          <div class="bg-white border border-black/10 rounded-xl p-4">
            <h3 class="text-md font-semibold text-primaryColor mb-3">
              Time & Attendance
            </h3>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <p class="text-sm text-gray-600">Days Worked</p>
                <p class="font-bold text-gray-700 text-md">
                  {{ record?.days_worked || 0 }}
                </p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Hours Worked</p>
                <p class="font-bold text-gray-700 text-md">
                  {{ record?.hours_worked || 0 }}
                </p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Overtime Hours</p>
                <p class="font-bold text-gray-700 text-md">
                  {{ record?.overtime_hours || 0 }}
                </p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Late Count</p>
                <p class="font-bold text-gray-700 text-md">
                  {{ record?.late_count || 0 }}
                </p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Absent (from lates)</p>
                <p class="font-bold text-gray-700 text-md">
                  {{ record?.absent_from_lates || 0 }}
                </p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Leave Days</p>
                <p class="font-bold text-gray-700 text-md">
                  {{ record?.leave_days || 0 }}
                </p>
              </div>
            </div>
          </div>

          <!-- Holiday & Leave -->
          <div class="bg-white border border-black/10 rounded-xl p-4">
            <h3 class="text-md font-semibold text-primaryColor mb-3">
              Holiday & Leave
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600">Holiday Hours Worked</p>
                <p class="font-medium text-gray-700">
                  {{ record?.holiday_hours_worked || 0 }} hrs
                </p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Regular Holiday Pay</p>
                <p class="font-medium text-gray-700">
                  <i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.regular_holiday_pay) }}
                </p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Special Holiday Pay</p>
                <p class="font-medium text-gray-700">
                  <i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.special_holiday_pay) }}
                </p>
              </div>
              <div>
                <p class="text-sm text-gray-600">SIL Converted to Cash</p>
                <p class="font-medium text-gray-700">
                  {{ record?.sil_converted_days || 0 }} days (<i
                    class="fas fa-peso-sign mr-1"
                  ></i
                  >{{ formatCurrency(record?.sil_conversion_pay) }})
                </p>
              </div>
            </div>
          </div>

          <!-- Earnings Breakdown -->
          <div class="bg-white border border-black/10 rounded-xl p-4">
            <h3 class="text-md font-semibold text-primaryColor mb-3">Earnings</h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-sm text-black/60">Basic Salary</span>
                <span class="font-medium text-gray-700"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.basic_salary) }}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-black/60">Overtime Pay</span>
                <span class="font-medium text-gray-700"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.overtime_pay) }}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-black/60">Regular Holiday Pay</span>
                <span class="font-medium text-gray-700"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.regular_holiday_pay) }}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-black/60">Special Holiday Pay</span>
                <span class="font-medium text-gray-700"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.special_holiday_pay) }}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-black/60">SIL Conversion Pay</span>
                <span class="font-medium text-gray-700"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.sil_conversion_pay) }}</span
                >
              </div>
              <div class="flex justify-between pt-2 border-t border-black/10">
                <span class="font-bold text-primaryColor">Gross Salary</span>
                <span class="font-bold text-gray-700 text-md"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.gross_salary) }}</span
                >
              </div>
            </div>
          </div>

          <!-- Deductions Breakdown -->
          <div class="bg-white border border-black/10 rounded-xl p-4">
            <h3 class="text-md font-semibold text-error mb-3">
              Deductions (Employee Share)
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-sm text-black/60">SSS</span>
                <span class="font-medium text-gray-700"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.sss_employee_share) }}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-black/60">PhilHealth</span>
                <span class="font-medium text-gray-700"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.philhealth_employee_share) }}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-black/60">Pag-IBIG</span>
                <span class="font-medium text-gray-700"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.pagibig_employee_share) }}</span
                >
              </div>
              <div class="flex justify-between pt-2 border-t border-black/10">
                <span class="font-bold text-error">Total Deductions</span>
                <span class="font-bold text-gray-700 text-md"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.total_deductions) }}</span
                >
              </div>
            </div>
          </div>

          <!-- Employer Contributions -->
          <div class="bg-white border border-black/10 rounded-xl p-4">
            <h3 class="text-md font-semibold text-error mb-3">
              Employer Contributions
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-sm text-black/60">SSS</span>
                <span class="font-medium text-gray-700"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.sss_employer_share) }}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-black/60">PhilHealth</span>
                <span class="font-medium text-gray-700"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.philhealth_employer_share) }}</span
                >
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-black/60">Pag-IBIG</span>
                <span class="font-medium text-gray-700"
                  ><i class="fas fa-peso-sign mr-1"></i
                  >{{ formatCurrency(record?.pagibig_employer_share) }}</span
                >
              </div>
              <div class="flex justify-between pt-2 border-t border-black/10">
                <span class="font-bold text-error"
                  >Total Employer Contributions</span
                >
                <span class="font-bold text-gray-700 text-md">
                  <i class="fas fa-peso-sign mr-1"></i
                  >{{
                    formatCurrency(
                      Number(record?.sss_employer_share || 0) +
                        Number(record?.philhealth_employer_share || 0) +
                        Number(record?.pagibig_employer_share || 0)
                    )
                  }}
                </span>
              </div>
            </div>
          </div>

          <!-- Net Salary -->
          <div
            class="bg-primaryColor/10  rounded-xl p-4 text-white border border-black/10"
          >
            <div class="flex justify-between items-center text-primaryColor">
              <span class="text-md font-thin">Net Salary</span>
              <span class="text-md font-thin"
                ><i class="fas fa-peso-sign mr-1"></i
                >{{ formatCurrency(record?.net_salary) }}</span
              >
            </div>
          </div>

          <!-- Remarks -->
          <div
            v-if="record?.remarks"
            class="bg-white border border-black/10 rounded-xl p-4"
          >
            <h3 class="text-md font-thin text-primaryColor mb-2">
              Remarks
            </h3>
            <p class="text-black/70">{{ record.remarks }}</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-4 bg-accentColor border-t border-black/10 flex justify-end"
      >
        <button
          @click="closeModal"
          class="btn btn-sm font-thin border-none bg-gray-200 hover:bg-gray-300 text-black/50"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'PayrollRecordDetailsModal',
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
    emits: ['close'],
    setup(props, { emit }) {
      const formatCurrency = (value) => {
        return Number(value || 0).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      };

      const closeModal = () => {
        emit('close');
      };

      return {
        formatCurrency,
        closeModal,
      };
    },
  };
</script>
