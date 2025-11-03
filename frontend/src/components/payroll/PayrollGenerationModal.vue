<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm"
    @click.self="closeModal"
  >
    <div
      class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-4 bg-primaryColor text-white"
      >
        <h2 class="text-xl">Generate Payroll</h2>
        <button
          @click="closeModal"
          class="text-white hover:bg-primaryColor/90 rounded-full p-2 transition-colors"
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
      <form @submit.prevent="handleGeneratePayroll" class="p-6 space-y-6">
        <!-- Scope Information -->
        <div class="bg-primaryColor/10 rounded-lg p-4">
          <h3 class="text-lg font-semibold text-primaryColor-800 mb-2">
            Payroll Scope
          </h3>
          <div class="text-sm text-gray-700 space-y-1">
            <p v-if="scope === 'department'">
              <strong>Department:</strong> {{ scopeName }}
            </p>
            <p v-else-if="scope === 'branch'">
              <strong>Branch:</strong> {{ scopeName }}
            </p>
            <p class="mt-2">
              <strong>Estimated Employees:</strong> {{ eligibleEmployeeCount }}
            </p>
          </div>
        </div>

        <!-- Period Type -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Period Type <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label
              v-for="type in periodTypes"
              :key="type.value"
              class="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors"
              :class="[
                formData.periodType === type.value
                  ? 'border-primaryColor bg-primaryColor/10'
                  : 'border-gray-200 hover:border-primaryColor ',
              ]"
            >
              <input
                v-model="formData.periodType"
                type="radio"
                :value="type.value"
                class="radio radio-sm border-primaryColor checked:border-primaryColor checked:bg-primaryColor !text-white"
                @change="handlePeriodTypeChange"
              />

              <div>
                <div class="font-medium text-gray-900">{{ type.label }}</div>
                <div class="text-xs text-gray-500">{{ type.description }}</div>
              </div>
            </label>
          </div>
        </div>

        <!-- Date Range -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Date From <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.dateFrom"
              type="date"
              required
              class="input w-full px-3 py-2"
              :class="{
                'border-red-500': validationError.includes('date range'),
              }"
              @change="handleDateChange"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Date To <span class="text-red-500">*</span>
            </label>
            <input
              v-model="formData.dateTo"
              type="date"
              required
              class="input w-full px-3 py-2"
              :class="{
                'border-red-500': validationError.includes('date range'),
              }"
              @change="handleDateChange"
            />
          </div>
        </div>

        <!-- Period Name (Auto-generated) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Period Name
          </label>
          <input
            v-model="formData.periodName"
            type="text"
            readonly
            class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
          />
        </div>

        <!-- Remarks -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Remarks / Notes
          </label>
          <textarea
            v-model="formData.remarks"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Add any notes about this payroll period..."
          ></textarea>
        </div>

        <!-- Warning Messages -->
        <div
          v-if="validationError"
          class="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <p class="text-sm text-red-700">{{ validationError }}</p>
        </div>

        <!-- Summary -->
        <div
          class="bg-primaryColor/10 border border-primaryColor/50 rounded-lg p-4"
        >
          <h4 class="font-semibold text-primaryColor mb-2">Summary</h4>
          <div class="text-sm text-primaryColor space-y-1">
            <p>
              • Payroll will be generated for
              <strong>{{ eligibleEmployeeCount }} employees</strong>
            </p>
            <p>
              • Period:
              <strong>{{ formData.dateFrom }} to {{ formData.dateTo }}</strong>
              ({{ daysInPeriod }} days)
            </p>
            <p>• Status after generation: <strong>Draft</strong></p>
            <p class="mt-3 text-xs">
              You can review and edit payroll details before submitting to
              Finance.
            </p>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            @click="closeModal"
            class="btn btn-outline border-gray-300 text-gray-700 hover:bg-gray-100 font-thin btn-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="loading || !!validationError"
            class="btn bg-primaryColor text-white hover:bg-primaryColor/90 border-none font-thin btn-sm"
          >
            <span
              v-if="loading"
              class="loading loading-spinner loading-sm mr-2"
            ></span>
            {{ loading ? 'Generating...' : 'Generate Payroll' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
  import { ref, reactive, computed, watch, nextTick } from 'vue';
  import { useRouter } from 'vue-router';
  import { usePayrollStore } from '@/stores/payrollStore';
  import { useAuthStore } from '@/stores/authStore';
  import { apiConfig } from '@/config/api.js';
  import { formatDateOnly } from '@/utils/timezoneUtils.js';

  export default {
    name: 'PayrollGenerationModal',
    props: {
      show: {
        type: Boolean,
        required: true,
      },
      scope: {
        type: String, // 'department' or 'branch'
        required: true,
      },
      scopeId: {
        type: [String, Number],
        required: true,
      },
      scopeName: {
        type: String,
        required: true,
      },
      estimatedEmployeeCount: {
        type: Number,
        default: 0,
      },
      employees: {
        type: Array,
        default: () => [],
      },
    },
    emits: ['close', 'generated'],
    setup(props, { emit }) {
      const router = useRouter();
      const payrollStore = usePayrollStore();
      const authStore = useAuthStore();

      const loading = ref(false);
      const validationError = ref('');
      const terminationRecords = ref({}); // Cache for termination records: { employeeId: terminationData }

      // Fetch termination records for terminated employees
      const fetchTerminationRecords = async () => {
        if (!props.employees || props.employees.length === 0) return;

        const terminatedEmployees = props.employees.filter(
          (emp) => emp.status === 'Terminated'
        );

        for (const emp of terminatedEmployees) {
          try {
            const response = await fetch(
              `${apiConfig.baseURL}/employees/${emp.id}/termination`,
              {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data) {
                terminationRecords.value[emp.id] = data.data;
              }
            }
          } catch (error) {
            console.error(
              `Error fetching termination for employee ${emp.id}:`,
              error
            );
          }
        }
      };

      // Computed: Eligible employees count based on date range
      const eligibleEmployeeCount = computed(() => {
        if (!props.employees || props.employees.length === 0) {
          return props.estimatedEmployeeCount; // Fallback to prop if no employees list
        }

        if (!formData.dateFrom || !formData.dateTo) {
          return props.employees.filter((emp) => emp.status === 'Active')
            .length;
        }

        // Parse dates as local dates (not UTC) to avoid timezone shifts
        // formData.dateFrom/dateTo are in format "YYYY-MM-DD" (from HTML date input)
        const parseLocalDate = (dateString) => {
          const [year, month, day] = dateString.split('-').map(Number);
          return new Date(year, month - 1, day); // month is 0-indexed in JS Date
        };

        const dateFrom = parseLocalDate(formData.dateFrom);
        const dateTo = parseLocalDate(formData.dateTo);

        const eligibleEmployees = props.employees.filter((emp) => {
          // Always include active employees
          if (emp.status === 'Active') {
            return true;
          }

          // For terminated employees, check if their last_working_day falls within the payroll period
          // They should only be included if they actually worked during the period
          if (emp.status === 'Terminated') {
            const termination = terminationRecords.value[emp.id];
            if (termination && termination.last_working_day) {
              const lastWorkingDay = new Date(termination.last_working_day);
              // Normalize dates to midnight local time for proper date-only comparison
              // Extract date components from the termination date (which may be in UTC)
              const lastWorkingDayYear = lastWorkingDay.getUTCFullYear();
              const lastWorkingDayMonth = lastWorkingDay.getUTCMonth();
              const lastWorkingDayDate = lastWorkingDay.getUTCDate();

              // Create local date objects at midnight for comparison
              const lastWorkingDayOnly = new Date(
                lastWorkingDayYear,
                lastWorkingDayMonth,
                lastWorkingDayDate
              );
              const dateFromOnly = new Date(
                dateFrom.getFullYear(),
                dateFrom.getMonth(),
                dateFrom.getDate()
              );
              const dateToOnly = new Date(
                dateTo.getFullYear(),
                dateTo.getMonth(),
                dateTo.getDate()
              );

              // Include if last_working_day is on or after the period start date
              // This means they worked during the payroll period (from period start until their last day)
              // Example: Employee with last_working_day = Nov 1 should be included in October payroll
              // because they worked from Oct 1 until Nov 1 (during the October period)
              // The actual payroll calculation will cap at their last_working_day
              const isWithinPeriod = lastWorkingDayOnly >= dateFromOnly;

              // Debug log - format dates as YYYY-MM-DD for clarity
              if (process.env.NODE_ENV === 'development') {
                const formatDate = (date) => {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                };

                console.log(
                  `Employee ${emp.first_name} ${emp.last_name}:`,
                  `last_working_day=${formatDate(lastWorkingDayOnly)},`,
                  `period=${formatDate(dateFromOnly)} to ${formatDate(dateToOnly)},`,
                  `included=${isWithinPeriod}`
                );
              }

              return isWithinPeriod;
            }
            // If no termination record, exclude (termination data not loaded yet)
            return false;
          }

          // Include other statuses (Inactive, On Leave) - adjust as needed
          return true;
        });

        return eligibleEmployees.length;
      });

      const periodTypes = [
        {
          value: 'bi-weekly',
          label: 'Bi-Weekly',
          description: '14 days',
        },
        {
          value: 'monthly',
          label: 'Monthly',
          description: '~30 days',
        },
        {
          value: 'custom',
          label: 'Custom',
          description: 'Custom range',
        },
      ];

      const formData = reactive({
        periodType: 'bi-weekly',
        dateFrom: '',
        dateTo: '',
        periodName: '',
        remarks: '',
      });

      // Calculate days in period
      const daysInPeriod = computed(() => {
        if (!formData.dateFrom || !formData.dateTo) return 0;
        const from = new Date(formData.dateFrom);
        const to = new Date(formData.dateTo);
        const diffTime = Math.abs(to - from);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both dates
        return diffDays;
      });

      // Validate dates and period type consistency
      watch(
        [
          () => formData.dateFrom,
          () => formData.dateTo,
          () => formData.periodType,
        ],
        () => {
          validationError.value = '';

          if (formData.dateFrom && formData.dateTo) {
            const from = new Date(formData.dateFrom);
            const to = new Date(formData.dateTo);

            if (from > to) {
              validationError.value = 'Date From must be before Date To';
              return;
            }

            const days = daysInPeriod.value;

            // Validate period type constraints
            if (formData.periodType !== 'custom') {
              let expectedDays = 0;
              let tolerance = 0; // Allow some flexibility

              switch (formData.periodType) {
                case 'bi-weekly':
                  expectedDays = 14;
                  tolerance = 1; // Allow 13-15 days
                  break;
                case 'monthly':
                  expectedDays = 30;
                  tolerance = 2; // Allow 28-32 days (to account for different month lengths)
                  break;
              }

              if (expectedDays > 0) {
                if (Math.abs(days - expectedDays) > tolerance) {
                  validationError.value = `${formData.periodType === 'bi-weekly' ? 'Bi-Weekly' : 'Monthly'} period must be ${expectedDays} days (±${tolerance}), but selected range is ${days} days`;
                  return;
                }
              }
            }

            // General validation
            if (days > 62) {
              validationError.value = 'Period cannot exceed 62 days';
            } else if (days < 7) {
              validationError.value = 'Period must be at least 7 days';
            }
          }
        }
      );

      const handlePeriodTypeChange = () => {
        // Auto-calculate date range based on period type
        const today = new Date();
        const from = new Date(today);
        let to = new Date(today);

        switch (formData.periodType) {
          case 'weekly':
            from.setDate(today.getDate() - 7);
            to.setDate(today.getDate() - 1);
            break;
          case 'bi-weekly':
            // Bi-weekly: 14 days
            from.setDate(today.getDate() - 14);
            to.setDate(today.getDate() - 1);
            break;
          case 'monthly':
            // Monthly: previous month (first to last day)
            from.setMonth(today.getMonth() - 1);
            from.setDate(1);
            to.setMonth(today.getMonth());
            to.setDate(0); // Last day of previous month
            break;
          case 'custom':
            // Don't auto-fill for custom, but clear validation
            validationError.value = '';
            return;
        }

        formData.dateFrom = formatDateOnly(from);
        formData.dateTo = formatDateOnly(to);
        updatePeriodName();
      };

      const handleDateChange = () => {
        updatePeriodName();
        // Trigger validation by accessing the watch dependencies
        // The watch will automatically validate the date range against period type
      };

      const updatePeriodName = () => {
        if (formData.dateFrom && formData.dateTo) {
          const from = new Date(formData.dateFrom);
          const to = new Date(formData.dateTo);

          const monthYear = from.toLocaleDateString('en-PH', {
            month: 'long',
            year: 'numeric',
          });

          const dayFrom = from.getDate();
          const dayTo = to.getDate();

          const scopePrefix =
            props.scope === 'department'
              ? `${props.scopeName} Dept`
              : `${props.scopeName} Branch`;

          formData.periodName = `${scopePrefix} - ${monthYear} (${dayFrom}-${dayTo})`;
        }
      };

      const handleGeneratePayroll = async () => {
        if (validationError.value) return;

        loading.value = true;
        try {
          const generatedBy =
            authStore.userInfo?.employee_id || authStore.userInfo?.username;

          const payload = {
            type: props.scope, // 'department' or 'branch'
            scope:
              props.scope === 'department' ? props.scopeName : props.scopeId, // department name or branch id
            period_type: formData.periodType,
            date_from: formData.dateFrom,
            date_to: formData.dateTo,
            period_name: formData.periodName,
            generated_by: generatedBy,
            remarks: formData.remarks,
          };

          const result = await payrollStore.generatePayroll(payload);

          emit('generated', result);
          closeModal();

          // Redirect to payroll management page
          router.push({
            name: 'HRPayrollManagement',
            query: { tab: 'draft' },
          });
        } catch (error) {
          console.error('Error generating payroll:', error);
          validationError.value =
            error.response?.data?.message ||
            error.message ||
            'Failed to generate payroll';
        } finally {
          loading.value = false;
        }
      };

      const closeModal = () => {
        // Reset form
        formData.periodType = 'bi-weekly';
        formData.dateFrom = '';
        formData.dateTo = '';
        formData.periodName = '';
        formData.remarks = '';
        validationError.value = '';

        emit('close');
      };

      // Watch for employees prop changes to fetch termination records
      watch(
        () => props.employees,
        async (newEmployees) => {
          if (newEmployees && newEmployees.length > 0) {
            await fetchTerminationRecords();
            // Force reactive update after fetching
            await nextTick();
          }
        },
        { immediate: true, deep: true }
      );

      // Watch for date changes to recalculate eligible count
      watch([() => formData.dateFrom, () => formData.dateTo], async () => {
        if (
          props.employees &&
          props.employees.length > 0 &&
          formData.dateFrom &&
          formData.dateTo
        ) {
          // Re-fetch termination records if needed
          if (Object.keys(terminationRecords.value).length === 0) {
            await fetchTerminationRecords();
          }
        }
      });

      // Initialize with default dates
      handlePeriodTypeChange();

      return {
        formData,
        periodTypes,
        loading,
        validationError,
        daysInPeriod,
        eligibleEmployeeCount,
        handlePeriodTypeChange,
        handleDateChange,
        updatePeriodName,
        handleGeneratePayroll,
        closeModal,
      };
    },
  };
</script>
