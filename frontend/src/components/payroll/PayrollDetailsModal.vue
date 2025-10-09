<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm"
    @click.self="closeModal"
  >
    <div
      class="bg-accentColor rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto border border-black/10"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between px-6 py-4 bg-primaryColor text-white border-b border-black/10"
      >
        <div>
          <h2 class="text-2xl font-bold">{{ payrollPeriod?.period_name }}</h2>
          <p class="text-sm text-white/80 mt-1">
            {{
              formatDateRange(payrollPeriod?.date_from, payrollPeriod?.date_to)
            }}
          </p>
        </div>
        <button
          @click="closeModal"
          class="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
        >
          <svg
            class="w-6 h-6"
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

      <!-- Status Timeline -->
      <div class="px-6 py-4 bg-accentColor border-b border-black/10">
        <div class="flex items-center justify-between">
          <div
            v-for="(step, index) in statusSteps"
            :key="step.status"
            class="flex items-center flex-1"
          >
            <div class="flex flex-col items-center flex-1">
              <div
                :class="[
                  'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-200',
                  isStepActive(step.status)
                    ? 'bg-primaryColor text-white ring-4 ring-primaryColor/30'
                    : 'bg-gray-200 text-gray-500',
                ]"
              >
                <svg
                  v-if="isStepActive(step.status)"
                  class="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                <span v-else>{{ index + 1 }}</span>
              </div>
              <p
                :class="[
                  'text-xs mt-2 text-center font-medium',
                  isStepActive(step.status)
                    ? 'text-primaryColor'
                    : 'text-gray-500',
                ]"
              >
                {{ step.label }}
              </p>
            </div>
            <div
              v-if="index < statusSteps.length - 1"
              :class="[
                'h-1 flex-1 mx-2 transition-all duration-300',
                isStepActive(statusSteps[index + 1].status)
                  ? 'bg-primaryColor'
                  : 'bg-gray-200',
              ]"
            ></div>
          </div>
        </div>
      </div>

      <!-- Balance Summary (Finance Only) -->
      <div
        v-if="showBalanceSummary"
        class="px-6 py-4 bg-white border-b border-black/10"
      >
        <div v-if="balanceLoading" class="flex justify-center py-4">
          <span class="loading loading-spinner loading-md"></span>
        </div>
        <div v-else>
          <h3 class="text-lg font-semibold text-gray-800 mb-4">
            Financial Summary
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Current Balance -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p class="text-xs text-blue-600 font-medium mb-1">
                Current Balance
              </p>
              <p class="text-2xl font-bold text-blue-700">
                <i class="fas fa-peso-sign mr-1"></i
                >{{ formatCurrency(currentBalance) }}
              </p>
            </div>

            <!-- Total Payroll Amount -->
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p class="text-xs text-orange-600 font-medium mb-1">
                Total Payroll Amount
              </p>
              <p class="text-2xl font-bold text-orange-700">
                <i class="fas fa-peso-sign mr-1"></i
                >{{ formatCurrency(totalPayrollAmount) }}
              </p>
              <p class="text-xs text-gray-600 mt-1">
                (Net Salary + Employer Contributions)
              </p>
            </div>

            <!-- Remaining Balance -->
            <div
              :class="[
                'border rounded-lg p-4',
                isSufficientBalance
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200',
              ]"
            >
              <p
                :class="[
                  'text-xs font-medium mb-1',
                  isSufficientBalance ? 'text-green-600' : 'text-red-600',
                ]"
              >
                Remaining Balance
              </p>
              <p
                :class="[
                  'text-2xl font-bold',
                  isSufficientBalance ? 'text-green-700' : 'text-red-700',
                ]"
              >
                <i class="fas fa-peso-sign mr-1"></i
                >{{ formatCurrency(remainingBalance) }}
              </p>
              <div class="flex items-center mt-2">
                <svg
                  v-if="isSufficientBalance"
                  class="w-4 h-4 text-green-600 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                <svg
                  v-else
                  class="w-4 h-4 text-red-600 mr-1"
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
                <p
                  :class="[
                    'text-xs font-medium',
                    isSufficientBalance ? 'text-green-600' : 'text-red-600',
                  ]"
                >
                  {{
                    isSufficientBalance
                      ? 'Sufficient Balance'
                      : 'Insufficient Balance'
                  }}
                </p>
              </div>
            </div>
          </div>

          <!-- Warning for insufficient balance -->
          <div
            v-if="!isSufficientBalance"
            class="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start"
          >
            <svg
              class="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              ></path>
            </svg>
            <div>
              <p class="text-sm font-semibold text-red-800 mb-1">
                Insufficient Balance Warning
              </p>
              <p class="text-sm text-red-700">
                The current balance is insufficient to cover this payroll.
                Please ensure adequate funds are available before proceeding
                with approval and budget release.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Payroll Records Table -->
      <div class="overflow-y-auto" style="max-height: calc(90vh - 400px)">
        <table class="table table-zebra w-full !able-xs">
          <thead class="">
            <tr>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase"
              >
                Employee
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase"
              >
                Department
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase"
              >
                Hours
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase"
              >
                OT Hours
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase"
              >
                Gross Salary
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase"
              >
                Deductions
              </th>
              <th
                class="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase"
              >
                Net Salary
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase"
              >
                Status
              </th>
              <th
                class="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr
              v-for="record in payrollRecords"
              :key="record.id"
              class="hover:bg-gray-50"
            >
              <td class="px-4 py-3">
                <div class="text-sm font-medium text-gray-900">
                  {{ record.employee_name }}
                </div>
                <div class="text-xs text-gray-500">{{ record.role_name }}</div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700">
                {{ record.department }}
              </td>
              <td class="px-4 py-3 text-sm text-right text-gray-700">
                {{ record.hours_worked }}
              </td>
              <td class="px-4 py-3 text-sm text-right text-gray-700">
                {{ record.overtime_hours }}
              </td>
              <td
                class="px-4 py-3 text-sm text-right font-medium text-gray-700"
              >
                <i class="fas fa-peso-sign mr-1"></i
                >{{ formatCurrency(record.gross_salary) }}
              </td>
              <td
                class="px-4 py-3 text-sm text-right font-medium text-gray-700"
              >
                <i class="fas fa-peso-sign mr-1"></i
                >{{ formatCurrency(record.total_deductions) }}
              </td>
              <td class="px-4 py-3 text-sm text-right font-bold text-gray-700">
                <i class="fas fa-peso-sign mr-1"></i
                >{{ formatCurrency(record.net_salary) }}
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  :class="[
                    'badge px-3 py-1 text-sm badge-sm',
                    getStatusBadgeClass(record.status),
                  ]"
                >
                  {{ record.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <button
                  @click="viewRecordDetails(record)"
                  class="text-gray-600 hover:text-gray-800 text-sm font-medium cursor-pointer"
                >
                  View
                </button>
                <button
                  v-if="canEdit && record.status === 'pending'"
                  @click="editRecord(record)"
                  class="ml-2 text-gray-600 hover:text-gray-800 text-sm font-medium cursor-pointer"
                >
                  Edit
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer Actions -->
      <div class="px-6 py-4 bg-gray-50 flex justify-between items-center">
        <div class="text-sm text-gray-600">
          <span v-if="payrollPeriod?.finance_approved_by">
            Approved by:
            <strong>{{
              payrollPeriod.finance_approved_by_name ||
              payrollPeriod.finance_approved_by
            }}</strong>
            on
            {{ formatDate(payrollPeriod.finance_approved_at) }}
          </span>
        </div>
        <div class="flex gap-3">
          <button
            @click="closeModal"
            :disabled="actionLoading"
            class="btn bg-gray-300 text-gray-700 hover:bg-gray-400 font-medium transition-colors px-6 py-2 btn-sm"
          >
            Close
          </button>
          <button
            v-if="canSubmitToFinance"
            @click="submitToFinance"
            :disabled="actionLoading"
            class="btn bg-primaryColor text-white hover:bg-primaryColor/90 font-medium transition-colors px-6 py-2 btn-sm"
          >
            <span
              v-if="
                actionLoading &&
                actionLoadingText === 'Submitting to Finance...'
              "
              class="loading loading-spinner loading-xs mr-2"
            ></span>
            {{
              actionLoading && actionLoadingText === 'Submitting to Finance...'
                ? 'Submitting...'
                : 'Submit to Finance'
            }}
          </button>
          <button
            v-if="canApprove"
            @click="approvePayroll"
            :disabled="actionLoading"
            class="btn bg-primaryColor text-white hover:bg-primaryColor/90 font-medium transition-colors px-6 py-2 btn-sm"
          >
            <span
              v-if="
                actionLoading && actionLoadingText === 'Approving Payroll...'
              "
              class="loading loading-spinner loading-xs mr-2"
            ></span>
            {{
              actionLoading && actionLoadingText === 'Approving Payroll...'
                ? 'Approving...'
                : 'Approve Payroll'
            }}
          </button>
          <button
            v-if="canSendToBudgetRelease"
            @click="sendToBudgetRelease"
            :disabled="actionLoading"
            class="btn bg-primaryColor text-white hover:bg-primaryColor/90 font-medium transition-colors px-6 py-2 btn-sm"
          >
            <span
              v-if="
                actionLoading &&
                actionLoadingText === 'Sending to Budget Release...'
              "
              class="loading loading-spinner loading-xs mr-2"
            ></span>
            {{
              actionLoading &&
              actionLoadingText === 'Sending to Budget Release...'
                ? 'Sending...'
                : 'Send to Budget Release'
            }}
          </button>
          <button
            v-if="canRelease"
            @click="releasePayroll"
            :disabled="actionLoading"
            class="btn bg-primaryColor text-white hover:bg-primaryColor/90 font-medium transition-colors px-6 py-2 btn-sm"
          >
            <span
              v-if="
                actionLoading && actionLoadingText === 'Releasing Payroll...'
              "
              class="loading loading-spinner loading-xs mr-2"
            ></span>
            {{
              actionLoading && actionLoadingText === 'Releasing Payroll...'
                ? 'Releasing...'
                : 'Release Payroll'
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Nested Modals -->
    <PayrollRecordDetailsModal
      :show="showRecordDetails"
      :record="selectedRecord"
      @close="showRecordDetails = false"
    />

    <PayrollRecordEditModal
      :show="showRecordEdit"
      :record="selectedRecord"
      @close="showRecordEdit = false"
      @save="handleRecordUpdate"
    />
  </div>
</template>

<script>
  import { ref, computed, onMounted } from 'vue';
  import { usePayrollStore } from '@/stores/payrollStore';
  import { useAuthStore } from '@/stores/authStore';
  import { useFinanceBalanceStore } from '@/stores/financeBalanceStore';
  import { useCustomToast } from '@/composables/useCustomToast.js';
  import PayrollRecordDetailsModal from './PayrollRecordDetailsModal.vue';
  import PayrollRecordEditModal from './PayrollRecordEditModal.vue';

  export default {
    name: 'PayrollDetailsModal',
    components: {
      PayrollRecordDetailsModal,
      PayrollRecordEditModal,
    },
    props: {
      show: {
        type: Boolean,
        required: true,
      },
      periodId: {
        type: Number,
        required: false,
      },
    },
    emits: ['close', 'refresh'],
    setup(props, { emit }) {
      const payrollStore = usePayrollStore();
      const authStore = useAuthStore();
      const financeBalanceStore = useFinanceBalanceStore();
      const { showSuccess, showError, showWarning, showInfo } =
        useCustomToast();

      const showRecordDetails = ref(false);
      const showRecordEdit = ref(false);
      const selectedRecord = ref(null);
      const actionLoading = ref(false);
      const actionLoadingText = ref('');
      const balanceLoading = ref(false);

      const payrollPeriod = computed(() => payrollStore.selectedPeriod);
      const payrollRecords = computed(() => payrollStore.payrollRecords);

      const statusSteps = [
        { status: 'draft', label: 'Draft' },
        { status: 'pending_approval', label: 'Pending Approval' },
        { status: 'approved', label: 'Approved' },
        { status: 'budget_released', label: 'Budget Released' },
        { status: 'paid', label: 'Paid' },
      ];

      // Financial Summary
      const currentBalance = computed(() => financeBalanceStore.currentBalance);
      const totalPayrollAmount = computed(() => {
        const netAmount = Number(payrollPeriod.value?.total_net_amount || 0);
        const employerContributions = payrollRecords.value.reduce(
          (sum, record) => {
            return (
              sum +
              Number(record.sss_employer_share || 0) +
              Number(record.philhealth_employer_share || 0) +
              Number(record.pagibig_employer_share || 0)
            );
          },
          0
        );
        return netAmount + employerContributions;
      });

      const remainingBalance = computed(() => {
        return currentBalance.value - totalPayrollAmount.value;
      });

      const isSufficientBalance = computed(() => {
        return remainingBalance.value >= 0;
      });

      const showBalanceSummary = computed(() => {
        // Show balance summary for Finance when reviewing or approving
        return (
          authStore.userDepartment === 'Finance' &&
          ['pending_approval', 'approved'].includes(payrollPeriod.value?.status)
        );
      });

      const isStepActive = (status) => {
        const currentIndex = statusSteps.findIndex(
          (s) => s.status === payrollPeriod.value?.status
        );
        const stepIndex = statusSteps.findIndex((s) => s.status === status);
        return stepIndex <= currentIndex;
      };

      const canEdit = computed(() => {
        return (
          authStore.userDepartment === 'Human Resource' &&
          payrollPeriod.value?.status === 'draft'
        );
      });

      const canSubmitToFinance = computed(() => {
        return (
          authStore.userDepartment === 'Human Resource' &&
          payrollPeriod.value?.status === 'draft'
        );
      });

      const canApprove = computed(() => {
        return (
          authStore.userDepartment === 'Finance' &&
          payrollPeriod.value?.status === 'pending_approval'
        );
      });

      const canSendToBudgetRelease = computed(() => {
        return (
          authStore.userDepartment === 'Finance' &&
          payrollPeriod.value?.status === 'approved'
        );
      });

      const canRelease = computed(() => {
        return (
          authStore.userDepartment === 'Human Resource' &&
          payrollPeriod.value?.status === 'budget_released'
        );
      });

      const formatCurrency = (value) => {
        return Number(value || 0).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
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

      const getStatusBadgeClass = (status) => {
        const classes = {
          pending: 'bg-warning/10 text-warning',
          approved: 'bg-success/10 text-success',
          rejected: 'bg-error/10 text-error',
          paid: 'bg-info/10 text-info',
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
      };

      const viewRecordDetails = (record) => {
        selectedRecord.value = record;
        showRecordDetails.value = true;
      };

      const editRecord = (record) => {
        selectedRecord.value = record;
        showRecordEdit.value = true;
      };

      const handleRecordUpdate = async (updatedRecord) => {
        try {
          await payrollStore.updatePayrollRecord(
            payrollPeriod.value.id,
            updatedRecord.id,
            updatedRecord
          );
          showSuccess('Payroll record updated successfully!', 'Updated');
          showRecordEdit.value = false;
          emit('refresh');
        } catch (error) {
          console.error('Error updating payroll record:', error);
          showError('Failed to update payroll record', 'Update Failed');
        }
      };

      const submitToFinance = async () => {
        actionLoading.value = true;
        actionLoadingText.value = 'Submitting to Finance...';
        try {
          await payrollStore.submitToFinance(payrollPeriod.value.id);
          showSuccess(
            'Payroll submitted to Finance for approval successfully!',
            'Submitted'
          );
          emit('refresh');
        } catch (error) {
          console.error('Error submitting to finance:', error);
          showError('Failed to submit payroll to Finance', 'Submission Failed');
        } finally {
          actionLoading.value = false;
          actionLoadingText.value = '';
        }
      };

      const approvePayroll = async () => {
        actionLoading.value = true;
        actionLoadingText.value = 'Approving Payroll...';
        try {
          await payrollStore.approvePayroll(
            payrollPeriod.value.id,
            authStore.userInfo?.employee_id || authStore.userInfo?.username
          );
          showSuccess(
            'Payroll approved successfully! Next step: Send to Budget Release',
            'Approved'
          );
          emit('refresh');
        } catch (error) {
          console.error('Error approving payroll:', error);
          showError(
            'Failed to approve payroll: ' +
              (error.response?.data?.message || error.message),
            'Approval Failed'
          );
        } finally {
          actionLoading.value = false;
          actionLoadingText.value = '';
        }
      };

      const sendToBudgetRelease = async () => {
        actionLoading.value = true;
        actionLoadingText.value = 'Sending to Budget Release...';
        try {
          await payrollStore.sendToBudgetRelease(payrollPeriod.value.id);
          showSuccess(
            'Payroll sent to Budget Release successfully!',
            'Sent to Budget Release'
          );
          emit('refresh');
        } catch (error) {
          console.error('Error sending to budget release:', error);
          showError(
            'Failed to send to budget release: ' +
              (error.response?.data?.message || error.message),
            'Budget Release Failed'
          );
        } finally {
          actionLoading.value = false;
          actionLoadingText.value = '';
        }
      };

      const releasePayroll = async () => {
        actionLoading.value = true;
        actionLoadingText.value = 'Releasing Payroll...';
        try {
          const result = await payrollStore.releasePayroll(
            payrollPeriod.value.id,
            authStore.userInfo?.employee_id || authStore.userInfo?.username
          );

          // Show detailed success message based on email results
          if (result.emailSummary) {
            const summary = result.emailSummary;
            let detailedMessage = `Payroll released to ${summary.total} employee(s). `;

            if (summary.sent > 0) {
              detailedMessage += `✅ ${summary.sent} email(s) sent successfully. `;
            }
            if (summary.failed > 0) {
              detailedMessage += `❌ ${summary.failed} email(s) failed. `;
            }
            if (summary.skipped > 0) {
              detailedMessage += `⚠️ ${summary.skipped} email(s) skipped. `;
            }

            // Show appropriate toast based on results
            if (summary.failed === 0) {
              showSuccess(detailedMessage.trim(), 'Payroll Released');
            } else if (summary.sent > 0) {
              showWarning(
                detailedMessage.trim(),
                'Payroll Released (with warnings)'
              );
            } else {
              showWarning(
                detailedMessage.trim(),
                'Payroll Released (no emails sent)'
              );
            }
          } else {
            showSuccess(
              result.message || 'Payroll released successfully!',
              'Released'
            );
          }

          emit('refresh');
          closeModal();
        } catch (error) {
          console.error('Error releasing payroll:', error);
          showError(
            'Failed to release payroll: ' +
              (error.response?.data?.message || error.message),
            'Release Failed'
          );
        } finally {
          actionLoading.value = false;
          actionLoadingText.value = '';
        }
      };

      const closeModal = () => {
        emit('close');
      };

      // Fetch balance when modal opens
      onMounted(async () => {
        if (showBalanceSummary.value) {
          balanceLoading.value = true;
          try {
            await financeBalanceStore.fetchCurrentBalance();
          } catch (error) {
            console.error('Error fetching balance:', error);
          } finally {
            balanceLoading.value = false;
          }
        }
      });

      return {
        payrollPeriod,
        payrollRecords,
        statusSteps,
        isStepActive,
        canEdit,
        canSubmitToFinance,
        canApprove,
        canSendToBudgetRelease,
        canRelease,
        formatCurrency,
        formatDate,
        formatDateRange,
        getStatusBadgeClass,
        viewRecordDetails,
        editRecord,
        handleRecordUpdate,
        submitToFinance,
        approvePayroll,
        sendToBudgetRelease,
        releasePayroll,
        closeModal,
        showRecordDetails,
        showRecordEdit,
        selectedRecord,
        actionLoading,
        actionLoadingText,
        // Balance summary
        showBalanceSummary,
        currentBalance,
        totalPayrollAmount,
        remainingBalance,
        isSufficientBalance,
        balanceLoading,
      };
    },
  };
</script>
