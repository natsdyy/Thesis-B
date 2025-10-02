<script setup>
  import { ref, computed, watch, onMounted } from 'vue';
  import { getApiUrl } from '../../config/api.js';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { usePOSStore } from '../../stores/posStore';
  import { formatPhilippineTime } from '../../utils/timezoneUtils.js';
  import { useCustomToast } from '../../composables/useCustomToast.js';

  const props = defineProps({ show: { type: Boolean, default: false } });
  const emit = defineEmits(['close', 'updated']);

  const branchContext = useBranchContextStore();
  const loading = ref(false);
  const items = ref([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = 10;
  const status = ref('pending');
  const selectedBranchId = ref(null);
  const posStore = usePOSStore();
  const submitting = ref(false);
  const submittingId = ref(null);
  const confirmOpen = ref(false);
  const confirmAction = ref('approve'); // 'approve' | 'reject'
  const targetId = ref(null);
  const { showToast } = useCustomToast();

  // Helper function to format dates using timezone utilities
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return formatPhilippineTime(date, 'date');
  };

  const fetchRemittances = async () => {
    loading.value = true;
    try {
      const { data, total: t } = await posStore.fetchRemittances({
        branchId: selectedBranchId.value,
        status: status.value,
        limit: pageSize,
        offset: (page.value - 1) * pageSize,
      });
      items.value = Array.isArray(data) ? data : [];
      total.value = Number(t || 0);
    } catch (e) {
      console.error('Failed to fetch remittances:', e);
      showToast('Failed to load remittances', 'error');
    } finally {
      loading.value = false;
    }
  };

  const openConfirm = (action, id) => {
    confirmAction.value = action;
    targetId.value = id;
    confirmOpen.value = true;
    const dlg = document.getElementById('finance_remittances_confirm_modal');
    if (dlg?.showModal) dlg.showModal();
  };

  const closeConfirm = () => {
    confirmOpen.value = false;
    const dlg = document.getElementById('finance_remittances_confirm_modal');
    if (dlg?.close) dlg.close();
  };

  const approve = async (id) => {
    try {
      submitting.value = true;
      submittingId.value = id;
      await posStore.approveRemittance(id);
      await fetchRemittances();
      emit('updated');
      showToast('Remittance approved successfully', 'success');
    } catch (e) {
      console.error('Approve failed', e);
      showToast('Failed to approve remittance', 'error');
    } finally {
      submitting.value = false;
      submittingId.value = null;
    }
  };

  const reject = async (id) => {
    try {
      submitting.value = true;
      submittingId.value = id;
      await posStore.rejectRemittance(id, { notes: null });
      await fetchRemittances();
      emit('updated');
      showToast('Remittance rejected successfully', 'success');
    } catch (e) {
      console.error('Reject failed', e);
      showToast('Failed to reject remittance', 'error');
    } finally {
      submitting.value = false;
      submittingId.value = null;
    }
  };

  const confirmProceed = async () => {
    if (!targetId.value) return;
    try {
      if (confirmAction.value === 'approve') {
        await approve(targetId.value);
      } else {
        await reject(targetId.value);
      }
    } finally {
      closeConfirm();
    }
  };

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(total.value / pageSize))
  );

  const close = () => {
    const dlg = document.getElementById('finance_remittances_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  watch(
    () => props.show,
    async (val) => {
      const dlg = document.getElementById('finance_remittances_modal');
      if (val) {
        if (!branchContext.currentBranch)
          await branchContext.initializeBranchContext();
        selectedBranchId.value = branchContext.currentBranch?.id ?? null;
        await fetchRemittances();
        if (dlg?.showModal) dlg.showModal();
      } else if (dlg?.close) {
        dlg.close();
      }
    },
    { immediate: false }
  );
</script>

<template>
  <dialog id="finance_remittances_modal" class="modal">
    <div class="modal-box max-w-6xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="card-title text-primaryColor">
          <font-awesome-icon icon="fa-solid fa-file-invoice" />
          Finance Remittances
        </h3>
      </div>

      <div class="flex gap-2 items-center mb-4">
        <select
          v-model="status"
          class="select select-bordered select-sm"
          @change="
            page = 1;
            fetchRemittances();
          "
        >
          <option value="pending">Pending</option>
        </select>
        <select
          class="select select-bordered select-sm"
          v-model="selectedBranchId"
          @change="
            page = 1;
            fetchRemittances();
          "
        >
          <option :value="null">All Branches</option>
          <option
            v-for="b in branchContext.availableBranches || []"
            :key="b.id"
            :value="b.id"
          >
            {{ b.name }}
          </option>
        </select>
      </div>

      <div v-if="loading" class="py-8 flex justify-center">
        <div class="loading loading-spinner loading-lg text-primaryColor" />
      </div>
      <div v-else class="space-y-3">
        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead>
              <tr>
                <th class="text-xs">Branch</th>
                <th class="text-xs">Period</th>
                <th class="text-xs">Date</th>
                <th class="text-xs">Gross</th>
                <th class="text-xs">Refunds</th>
                <th class="text-xs">Loss (Voids)</th>
                <th class="text-xs">Void</th>
                <th class="text-xs">Net</th>
                <th class="text-xs">Remitted</th>
                <th class="text-xs">Status</th>
                <th class="text-xs">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in items" :key="r.id">
                <td class="text-xs">{{ r.branch_name || r.branch_id }}</td>
                <td class="text-xs">{{ r.period_type }}</td>
                <td class="text-xs">
                  {{ formatDate(r.date_from) }} - {{ formatDate(r.date_to) }}
                </td>

                <td class="text-xs font-semibold text-primaryColor">
                  ₱{{
                    Number(r.gross_sales || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }}
                </td>
                <td class="text-xs">
                  ₱{{
                    Number(r.refunded_amount || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }}
                </td>
                <td class="text-xs">
                  ₱{{
                    Number(r.voided_amount || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }}
                </td>
                <td class="text-xs">
                  {{ Number(r.disposed || 0).toLocaleString() }}
                </td>
                <td class="text-xs">
                  ₱{{
                    Number(r.net_sales || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }}
                </td>
                <td class="text-xs font-semibold text-primaryColor">
                  ₱{{
                    Number(r.remitted_amount || 0).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }}
                </td>
                <td class="text-xs">
                  <span
                    :class="[
                      'badge badge-sm',
                      r.status === 'approved'
                        ? 'bg-success/10 text-success border'
                        : r.status === 'rejected'
                          ? 'bg-error/10 text-error border'
                          : 'bg-warning/10 text-warning border',
                    ]"
                    >{{ r.status }}</span
                  >
                </td>
                <td class="text-xs">
                  <div class="">
                    <button
                      class="text-primaryColor btn btn-xs bg-success/0 rounded-full border-none hover:bg-success/10"
                      @click="openConfirm('approve', r.id)"
                      :disabled="r.status !== 'pending' || submitting"
                      title="Approve"
                    >
                      <font-awesome-icon
                        icon="fa-solid fa-check"
                        class="!w-3 !h-3"
                      />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-2 flex items-center justify-between text-sm">
          <div class="text-gray-600">Page {{ page }} of {{ totalPages }}</div>
          <div class="join">
            <button
              class="btn btn-xs join-item"
              :disabled="page <= 1"
              @click="
                page = Math.max(1, page - 1);
                fetchRemittances();
              "
            >
              Prev
            </button>
            <button
              class="btn btn-xs join-item"
              :disabled="page >= totalPages"
              @click="
                page = Math.min(totalPages, page + 1);
                fetchRemittances();
              "
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn btn-sm font-thin" @click="close">Close</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button>close</button></form>
  </dialog>

  <!-- Confirm Approve/Reject Modal -->
  <dialog id="finance_remittances_confirm_modal" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg">
        Confirm {{ confirmAction === 'approve' ? 'Approval' : 'Rejection' }}
      </h3>
      <p class="py-2 text-sm text-gray-600">
        Are you sure you want to {{ confirmAction }} this remittance?
      </p>
      <div class="modal-action">
        <button
          class="btn btn-sm font-thin"
          @click="closeConfirm"
          :disabled="submitting"
        >
          Cancel
        </button>
        <button
          class="btn bg-primaryColor text-white hover:bg-primaryColor/80 btn-sm font-thin"
          @click="confirmProceed"
          :disabled="submitting"
        >
          <span
            v-if="submitting"
            class="loading loading-spinner loading-xs mr-2"
          />
          Confirm
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeConfirm">close</button>
    </form>
  </dialog>
</template>

<style scoped></style>
