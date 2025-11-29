<script setup>
  import { ref, computed, watch, onMounted } from 'vue';
  import { getApiUrl, formatImageUrl } from '../../config/api.js';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { usePOSStore } from '../../stores/posStore';
  import { formatPhilippineTime } from '../../utils/timezoneUtils.js';
  import { useCustomToast } from '../../composables/useCustomToast.js';
  import { sanitizeHtml } from '../../utils/sanitizeHtml.js';
  import RemittedSalesViewModal from './RemittedSalesViewModal.vue';
  import Editor from '@tinymce/tinymce-vue';
  import tinymce from 'tinymce/tinymce';
  import 'tinymce/tinymce';
  import 'tinymce/icons/default';
  import 'tinymce/themes/silver';
  import 'tinymce/models/dom/model';
  import 'tinymce/plugins/link';
  import 'tinymce/plugins/lists';
  import 'tinymce/plugins/image';
  import 'tinymce/skins/ui/oxide/skin.min.css';

  // Set TinyMCE GPL license
  try {
    tinymce?.EditorManager?.overrideDefaults?.({ license_key: 'gpl' });
  } catch (_) {}

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

  // Proof viewing state
  const showProofModal = ref(false);
  const selectedRemittance = ref(null);
  const previewImageUrl = ref(null);
  const showImagePreview = ref(false);

  // Remit Order Details Modal state
  const showRemitOrderDetails = ref(false);
  const selectedRemittanceForView = ref(null);

  // Reject Modal with TinyMCE
  const showRejectModal = ref(false);
  const rejectNotes = ref('');
  const targetRejectId = ref(null);

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

  const reject = async (id, notes) => {
    try {
      submitting.value = true;
      submittingId.value = id;
      await posStore.rejectRemittance(id, { notes: notes || null });
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
      await approve(targetId.value);
    } finally {
      closeConfirm();
    }
  };

  // Open Reject Modal with TinyMCE
  const openRejectModal = (id) => {
    targetRejectId.value = id;
    rejectNotes.value = '';
    showRejectModal.value = true;
    const dlg = document.getElementById('reject_remittance_modal');
    if (dlg?.showModal) dlg.showModal();
  };

  const closeRejectModal = () => {
    showRejectModal.value = false;
    targetRejectId.value = null;
    rejectNotes.value = '';
    const dlg = document.getElementById('reject_remittance_modal');
    if (dlg?.close) dlg.close();
  };

  const confirmReject = async () => {
    if (!targetRejectId.value) return;
    try {
      await reject(targetRejectId.value, rejectNotes.value);
      closeRejectModal();
    } catch (e) {
      console.error('Reject error:', e);
    }
  };

  // Open Remit Order Details Modal
  const openRemitOrderDetails = (remittance) => {
    selectedRemittanceForView.value = remittance;
    showRemitOrderDetails.value = true;
  };

  const closeRemitOrderDetails = () => {
    showRemitOrderDetails.value = false;
    selectedRemittanceForView.value = null;
  };

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(total.value / pageSize))
  );

  const close = () => {
    const dlg = document.getElementById('finance_remittances_modal');
    if (dlg?.close) dlg.close();
    emit('close');
  };

  // Proof viewing functions
  const openProofModal = (remittance) => {
    selectedRemittance.value = remittance;
    showProofModal.value = true;
    const dlg = document.getElementById('proof_view_modal');
    if (dlg?.showModal) dlg.showModal();
  };

  const closeProofModal = () => {
    showProofModal.value = false;
    selectedRemittance.value = null;
    const dlg = document.getElementById('proof_view_modal');
    if (dlg?.close) dlg.close();
  };

  // Image preview functions
  const openImagePreview = (imageUrl) => {
    let url = imageUrl;
    if (typeof url === 'string') {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = formatImageUrl(url);
      } else {
        url = formatImageUrl(url);
      }
    }
    previewImageUrl.value = url;
    showImagePreview.value = true;
    const dlg = document.getElementById('image_preview_modal');
    if (dlg?.showModal) dlg.showModal();
  };

  const closeImagePreview = () => {
    showImagePreview.value = false;
    previewImageUrl.value = null;
    const dlg = document.getElementById('image_preview_modal');
    if (dlg?.close) dlg.close();
  };

  // Handle image clicks in proof content
  const handleProofImageClick = (event) => {
    const img = event.target.closest('img');
    if (img && img.src) {
      event.preventDefault();
      event.stopPropagation();
      const src = img.getAttribute('src') || img.src;
      openImagePreview(src);
    }
  };

  // Watch for proof modal state
  watch(showProofModal, (val) => {
    const dlg = document.getElementById('proof_view_modal');
    if (val) {
      if (dlg?.showModal) dlg.showModal();
    } else if (dlg?.close) {
      dlg.close();
    }
  });

  // Watch for image preview modal state
  watch(showImagePreview, (val) => {
    const dlg = document.getElementById('image_preview_modal');
    if (val) {
      if (dlg?.showModal) dlg.showModal();
    } else if (dlg?.close) {
      dlg.close();
    }
  });

  // Process images in proof content
  const processProofImages = () => {
    const proofContent = document.querySelector('.proof-content');
    if (proofContent) {
      const images = proofContent.querySelectorAll('img');
      images.forEach((img) => {
        img.style.cursor = 'pointer';
        const src = img.getAttribute('src');
        if (src && !src.startsWith('http')) {
          img.src = formatImageUrl(src);
        }
      });
    }
  };

  // Watch selected remittance to process images
  watch(
    () => selectedRemittance.value,
    () => {
      if (selectedRemittance.value?.notes) {
        setTimeout(processProofImages, 100);
      }
    },
    { deep: true }
  );

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
                  <div class="flex gap-1 items-center">
                    <button
                      v-if="r.notes"
                      class="text-primaryColor btn btn-xs bg-info/0 rounded-full border-none hover:bg-info/10"
                      @click="openProofModal(r)"
                      title="View Proof of Sales"
                    >
                      <font-awesome-icon
                        icon="fa-solid fa-file-image"
                        class="!w-3 !h-3"
                      />
                    </button>
                    <button
                      class="text-primaryColor btn btn-xs bg-info/0 rounded-full border-none hover:bg-info/10"
                      @click="openRemitOrderDetails(r)"
                      title="View Remitted Sales"
                    >
                      <font-awesome-icon
                        icon="fa-solid fa-receipt"
                        class="!w-3 !h-3"
                      />
                    </button>
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
                    <button
                      class="text-primaryColor btn btn-xs bg-error/0 rounded-full border-none hover:bg-error/10"
                      @click="openRejectModal(r.id)"
                      :disabled="r.status !== 'pending' || submitting"
                      title="Reject"
                    >
                      <font-awesome-icon
                        icon="fa-solid fa-times"
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

  <!-- Confirm Approval Modal -->
  <dialog id="finance_remittances_confirm_modal" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg">Confirm Approval</h3>
      <p class="py-2 text-sm text-gray-600">
        Are you sure you want to approve this remittance?
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

  <!-- Reject Remittance Modal with TinyMCE -->
  <dialog id="reject_remittance_modal" class="modal">
    <div class="modal-box max-w-3xl">
      <h3 class="font-bold text-lg text-error mb-4">Reject Remittance</h3>
      <p class="text-sm text-gray-600 mb-4">
        Please provide a reason for rejecting this remittance:
      </p>

      <div class="form-control">
        <label class="label">
          <span class="label-text font-semibold">Rejection Notes</span>
        </label>
        <Editor
          v-model="rejectNotes"
          :init="{
            height: 300,
            menubar: false,
            plugins: 'link lists image',
            toolbar: 'undo redo | bold italic | bullist numlist | link image',
            content_style:
              'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
            branding: false,
            skin: false,
            content_css: false,
            license_key: 'gpl',
          }"
        />
      </div>

      <div class="modal-action">
        <button
          class="btn btn-sm font-thin"
          @click="closeRejectModal"
          :disabled="submitting"
        >
          Cancel
        </button>
        <button
          class="btn bg-error text-white hover:bg-error/80 btn-sm font-thin"
          @click="confirmReject"
          :disabled="submitting"
        >
          <span
            v-if="submitting"
            class="loading loading-spinner loading-xs mr-2"
          />
          Reject Remittance
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeRejectModal">close</button>
    </form>
  </dialog>

  <!-- Proof of Sales View Modal -->
  <dialog id="proof_view_modal" class="modal">
    <div class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <font-awesome-icon
            icon="fa-solid fa-file-image"
            class="text-primaryColor"
          />
          Proof of Sales
        </h3>
        <button
          class="btn btn-sm btn-circle btn-ghost"
          @click="closeProofModal"
        >
          <font-awesome-icon icon="fa-solid fa-times" />
        </button>
      </div>

      <div v-if="selectedRemittance" class="space-y-4">
        <!-- Remittance Info -->
        <div class="card bg-gray-50 border border-gray-200">
          <div class="card-body p-4">
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-gray-600">Branch:</span>
                <span class="ml-2 font-medium">
                  {{
                    selectedRemittance.branch_name ||
                    selectedRemittance.branch_id
                  }}
                </span>
              </div>
              <div>
                <span class="text-gray-600">Period:</span>
                <span class="ml-2 font-medium">
                  {{ selectedRemittance.period_type }}
                </span>
              </div>
              <div>
                <span class="text-gray-600">Date Range:</span>
                <span class="ml-2 font-medium">
                  {{ formatDate(selectedRemittance.date_from) }} -
                  {{ formatDate(selectedRemittance.date_to) }}
                </span>
              </div>
              <div>
                <span class="text-gray-600">Amount:</span>
                <span class="ml-2 font-semibold text-primaryColor">
                  ₱{{
                    Number(
                      selectedRemittance.remitted_amount || 0
                    ).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Proof Content -->
        <div class="card bg-white shadow border border-black/10">
          <div class="card-body p-4">
            <h4 class="text-sm font-semibold text-gray-700 mb-3">
              Proof of Sales Content
            </h4>
            <div
              v-if="selectedRemittance.notes"
              class="prose prose-sm max-w-none proof-content"
              v-html="sanitizeHtml(selectedRemittance.notes)"
              @click="handleProofImageClick"
            ></div>
            <p v-else class="text-sm text-gray-500 italic">
              No proof of sales provided
            </p>
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn btn-sm" @click="closeProofModal">Close</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeProofModal">close</button>
    </form>
  </dialog>

  <!-- Image Preview Modal -->
  <dialog id="image_preview_modal" class="modal">
    <div class="modal-box max-w-4xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg">Image Preview</h3>
        <button
          class="btn btn-sm btn-circle btn-ghost"
          @click="closeImagePreview"
        >
          <font-awesome-icon icon="fa-solid fa-times" />
        </button>
      </div>
      <div
        class="flex items-center justify-center bg-gray-100 rounded-lg p-4 min-h-[400px]"
      >
        <img
          v-if="previewImageUrl"
          :src="previewImageUrl"
          alt="Proof of sales image"
          class="max-w-full max-h-[70vh] rounded-lg shadow-lg"
          @error="closeImagePreview"
        />
      </div>
      <div class="modal-action">
        <button class="btn btn-sm" @click="closeImagePreview">Close</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeImagePreview">close</button>
    </form>
  </dialog>

  <!-- Remitted Sales View Modal -->
  <RemittedSalesViewModal
    :show="showRemitOrderDetails"
    :remittance="selectedRemittanceForView"
    @close="closeRemitOrderDetails"
  />
</template>

<style scoped>
  .proof-content :deep(img) {
    cursor: pointer;
    max-width: 100%;
    height: auto;
    margin: 8px 0;
    border-radius: 4px;
    transition: opacity 0.2s;
    border: 1px solid #e5e7eb;
  }

  .proof-content :deep(img:hover) {
    opacity: 0.8;
    border-color: #3b82f6;
  }

  .proof-content :deep(p) {
    margin: 8px 0;
  }

  .proof-content :deep(ul),
  .proof-content :deep(ol) {
    margin: 8px 0;
    padding-left: 20px;
  }
</style>

<style>
  /* Raise TinyMCE dialogs above DaisyUI modal */
  .tox,
  .tox-tinymce-aux,
  .tox-silver-sink,
  .tox-dialog-wrap,
  .tox-dialog {
    z-index: 99999 !important;
  }
  /* Avoid stacking-context issues from transform animations in DaisyUI modal */
  #reject_remittance_modal .modal-box {
    transform: none !important;
  }
</style>
