<template>
  <div class="relative p-6">
    <!-- Background watermark -->
    <div
      class="pointer-events-none absolute inset-x-0 top-[160px] bottom-0 flex items-center justify-center z-0"
      aria-hidden="true"
    >
      <img
        src="/logo1.png"
        alt="watermark"
        class="opacity-[0.08] blur-md w-[900px] max-w-[90vw] h-auto select-none"
      />
    </div>

    <div class="relative z-10">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Organizational Chart</h2>
          <p class="text-sm text-gray-500">
            Administration leadership hierarchy
          </p>
        </div>
        <div class="flex items-center gap-2" v-if="auth.isChairman">
          <button
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
            @click="fetchChart"
          >
            Refresh
          </button>
          <!--  <button
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
            @click="autoPlaceUnlinked"
          >
            Auto-place Unlinked
          </button> -->
          <button
            class="px-4 py-2 text-sm font-medium text-white bg-primaryColor hover:bg-primaryColor/80"
            @click="openCreateBoardMember"
          >
            Add Board Member
          </button>
        </div>
      </div>

      <!-- Org Chart -->
      <div v-if="loading" class="text-gray-500 text-center py-10">
        Loading organizational structure...
      </div>
      <div v-else class="overflow-x-auto pb-8 sm:pb-10">
        <div class="flex flex-col items-center space-y-4 sm:space-y-6">
          <OrgNode
            v-for="node in rootNodes"
            :key="node.id"
            :node="node"
            :children="getChildren(node.id)"
            :getChildren="getChildren"
            :isRoot="true"
            :canModify="auth.isChairman"
            @add-child="openCreate"
            @edit-node="openEdit"
            @delete-node="deleteNode"
          />
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200"
      >
        <h3 class="text-lg font-semibold mb-4">
          {{ editingNode ? 'Edit Position' : 'Add Position' }}
        </h3>
        <div class="space-y-3">
          <input
            v-model="form.title"
            placeholder="Title"
            class="input input-bordered w-full"
          />
          <input
            v-model="form.person_name"
            placeholder="Person Name"
            class="input input-bordered w-full"
          />

          <select
            v-model="form.department"
            class="select select-bordered w-full"
          >
            <option>Administration</option>
          </select>
          <!-- Optional link to a Board Member account -->
          <div>
            <label class="label"
              ><span class="label-text"
                >Link Board Member (optional)</span
              ></label
            >
            <select
              v-model="form.board_member_id"
              class="select select-bordered w-full"
            >
              <option :value="null">None</option>
              <option v-for="bm in boardMembers" :key="bm.id" :value="bm.id">
                {{ bm.first_name }} {{ bm.last_name }} ({{ bm.position }})
              </option>
            </select>
          </div>
        </div>
        <div class="flex justify-between items-center mt-4 gap-2">
          <div v-if="editingNode" class="flex items-center gap-2">
            <button
              class="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-sm cursor-pointer"
              @click="showDeleteConfirm = true"
            >
              Delete Position
            </button>
          </div>
          <div class="">
            <button
              class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm cursor-pointer"
              @click="closeModal"
            >
              Cancel
            </button>
          </div>
          <button
            class="px-3 py-1.5 bg-primaryColor hover:bg-primaryColor/80 text-white rounded-md text-sm cursor-pointer"
            @click="save"
          >
            Save
          </button>
        </div>

        <!-- Delete confirm pane -->
        <div
          v-if="showDeleteConfirm"
          class="mt-4 p-3 border rounded-md bg-red-50 border-red-200"
        >
          <p class="text-sm text-red-700 mb-2">
            Please provide a reason for deleting this position.
          </p>
          <textarea
            v-model="deleteReason"
            class="textarea textarea-bordered w-full"
            rows="3"
            placeholder="Reason for deletion..."
          ></textarea>
          <div class="mt-2 flex justify-end gap-2">
            <button class="btn btn-sm" @click="showDeleteConfirm = false">
              Cancel
            </button>
            <button
              class="btn btn-sm bg-red-600 text-white hover:bg-red-700"
              :disabled="!deleteReason.trim()"
              @click="confirmDelete"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Board Member Modal -->
    <div
      v-if="showBmModal"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200"
      >
        <h3 class="text-lg font-semibold mb-4">
          {{ editingBm ? 'Edit Board Member' : 'Add Board Member' }}
        </h3>
        <div class="grid grid-cols-2 gap-3">
          <input
            v-model="bmForm.first_name"
            placeholder="First name"
            class="input input-bordered w-full col-span-1"
          />
          <input
            v-model="bmForm.last_name"
            placeholder="Last name"
            class="input input-bordered w-full col-span-1"
          />
          <input
            v-model="bmForm.email"
            placeholder="Email"
            class="input input-bordered w-full col-span-2"
          />
          <input
            v-model="bmForm.phone_number"
            placeholder="Phone (optional)"
            class="input input-bordered w-full col-span-2"
          />
          <select
            v-model="bmForm.position"
            class="select select-bordered w-full col-span-2"
          >
            <option>Chairman of the Board</option>
            <option>Board of Directors</option>
          </select>
        </div>
        <div class="flex justify-end mt-4 gap-2">
          <button
            v-if="editingBm"
            class="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-sm"
            @click="showBmDeleteConfirm = true"
          >
            Delete Board Member
          </button>
          <button
            class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
            @click="closeBmModal"
          >
            Cancel
          </button>
          <button
            class="px-3 py-1.5 bg-primaryColor hover:bg-primaryColor/80 text-white rounded-md text-sm"
            @click="saveBoardMember"
          >
            Save
          </button>
        </div>

        <!-- Board Member Delete confirm pane -->
        <div
          v-if="showBmDeleteConfirm"
          class="mt-4 p-3 border rounded-md bg-red-50 border-red-200"
        >
          <p class="text-sm text-red-700 mb-2">
            Please provide a reason for deleting this board member.
          </p>
          <textarea
            v-model="bmDeleteReason"
            class="textarea textarea-bordered w-full"
            rows="3"
            placeholder="Reason for deletion..."
          ></textarea>
          <div class="mt-2 flex justify-end gap-2">
            <button class="btn btn-sm" @click="showBmDeleteConfirm = false">
              Cancel
            </button>
            <button
              class="btn btn-sm bg-red-600 text-white hover:bg-red-700"
              :disabled="!bmDeleteReason.trim()"
              @click="confirmDeleteBoardMember"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue';
  import axios from 'axios';
  import { useAuthStore } from '../../stores/authStore';
  import { useCustomToast } from '../../composables/useCustomToast';

  const auth = useAuthStore();
  const { showSuccess, showError } = useCustomToast();

  const loading = ref(false);
  const nodes = ref([]);
  const boardMembers = ref([]);
  const showBmModal = ref(false);
  const editingBm = ref(null);
  const showBmDeleteConfirm = ref(false);
  const bmDeleteReason = ref('');
  const bmForm = ref({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    position: 'Board of Directors',
    password: 'Board@123',
  });

  const showModal = ref(false);
  const editingNode = ref(null);
  const parentForNew = ref(null);
  const form = ref({
    title: '',
    person_name: '',
    employee_id: '',
    department: 'Administration',
    board_member_id: null,
  });
  const showDeleteConfirm = ref(false);
  const deleteReason = ref('');

  const rootNodes = computed(() => nodes.value.filter((n) => !n.parent_id));
  const getChildren = (id) => nodes.value.filter((n) => n.parent_id === id);

  async function fetchChart() {
    loading.value = true;
    try {
      const { data } = await axios.get('/api/admin/org-chart');
      nodes.value = data.data || [];
      const bm = await axios.get('/api/board-members');
      boardMembers.value = bm.data?.data || [];
    } finally {
      loading.value = false;
    }
  }

  function openCreate(parentId) {
    if (!auth.isChairman) {
      showError(
        'Only the Chairman of the Board can modify the organizational chart.'
      );
      return;
    }
    parentForNew.value = parentId;
    editingNode.value = null;
    form.value = {
      title: '',
      person_name: '',
      employee_id: '',
      department: 'Administration',
      board_member_id: null,
    };
    showModal.value = true;
  }

  function openEdit(node) {
    if (!auth.isChairman) {
      showError(
        'Only the Chairman of the Board can modify the organizational chart.'
      );
      return;
    }
    editingNode.value = node;
    parentForNew.value = node.parent_id || null;
    form.value = {
      title: node.title,
      person_name: node.person_name || '',
      employee_id: node.employee_id || '',
      department: node.department || 'Administration',
      board_member_id: node.board_member_id || null,
    };
    showModal.value = true;
  }

  function closeModal() {
    showModal.value = false;
    showDeleteConfirm.value = false;
    deleteReason.value = '';
  }

  function openCreateBoardMember() {
    if (!auth.isChairman) {
      showError('Only the Chairman of the Board can add board members.');
      return;
    }
    editingBm.value = null;
    bmForm.value = {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      position: 'Board of Directors',
      password: 'Board@123',
    };
    showBmModal.value = true;
  }

  function closeBmModal() {
    showBmModal.value = false;
    showBmDeleteConfirm.value = false;
    bmDeleteReason.value = '';
  }

  async function saveBoardMember() {
    if (!auth.isChairman) {
      showError('Only the Chairman of the Board can modify board members.');
      return;
    }
    try {
      if (editingBm.value) {
        const { password, ...rest } = bmForm.value;
        await axios.put(`/api/board-members/${editingBm.value.id}`, rest);
      } else {
        const createRes = await axios.post('/api/board-members', bmForm.value);
        const created = createRes?.data?.data;
        // Auto-place on org chart based on position
        if (created) {
          await autoPlaceBoardMember(created);
        }
      }
      const bm = await axios.get('/api/board-members');
      boardMembers.value = bm.data?.data || [];
      await fetchChart();
      closeBmModal();
      showSuccess(
        editingBm.value
          ? 'Board member updated'
          : 'Board member created (default password: Board@123)'
      );
    } catch (e) {
      console.error(e);
      showError(e?.response?.data?.message || 'Failed to save board member');
    }
  }

  async function confirmDeleteBoardMember() {
    if (!auth.isChairman) {
      showError('Only the Chairman of the Board can delete board members.');
      return;
    }
    try {
      if (!editingBm.value) return;
      await axios.delete(`/api/board-members/${editingBm.value.id}`, {
        data: { reason: bmDeleteReason.value },
      });
      showBmDeleteConfirm.value = false;
      bmDeleteReason.value = '';
      showBmModal.value = false;
      const bm = await axios.get('/api/board-members');
      boardMembers.value = bm.data?.data || [];
      await fetchChart();
      showSuccess('Board member deleted');
    } catch (e) {
      console.error(e);
      showError(e?.response?.data?.message || 'Failed to delete board member');
    }
  }

  async function autoPlaceBoardMember(member) {
    try {
      // Ensure we have latest chart
      const chartRes = await axios.get('/api/admin/org-chart');
      const positions = chartRes?.data?.data || [];
      const root = positions.find(
        (n) => !n.parent_id && n.title === 'Chairman of the Board'
      );
      const fullName = `${member.first_name} ${member.last_name}`.trim();

      if (member.position === 'Chairman of the Board') {
        if (root) {
          // Update existing root to link new chairman
          await axios.put(`/api/admin/org-chart/${root.id}`, {
            title: 'Chairman of the Board',
            person_name: fullName,
            department: 'Administration',
            board_member_id: member.id,
            role: auth.userRole,
          });
        } else {
          // Create root
          await axios.post('/api/admin/org-chart', {
            title: 'Chairman of the Board',
            person_name: fullName,
            department: 'Administration',
            parent_id: null,
            board_member_id: member.id,
            role: auth.userRole,
          });
        }
      } else {
        // Default: attach under the chairman/root if exists; otherwise create as root-level
        const parent_id = root ? root.id : null;
        await axios.post('/api/admin/org-chart', {
          title: member.position,
          person_name: fullName,
          department: 'Administration',
          parent_id,
          board_member_id: member.id,
          role: auth.userRole,
        });
      }
    } catch (e) {
      console.error('Auto-place board member failed:', e);
      showError(
        'Board member created, but auto-placement failed. You can link manually.'
      );
    }
  }

  async function autoPlaceUnlinked() {
    try {
      // ensure latest
      const bmRes = await axios.get('/api/board-members');
      const allMembers = bmRes?.data?.data || [];
      const chartRes = await axios.get('/api/admin/org-chart');
      const positions = chartRes?.data?.data || [];
      const linkedIds = new Set(
        (positions || []).map((n) => n.board_member_id).filter(Boolean)
      );
      const unlinked = allMembers.filter((m) => !linkedIds.has(m.id));
      for (const m of unlinked) {
        await autoPlaceBoardMember(m);
      }
      await fetchChart();
      showSuccess('Auto-placement completed');
    } catch (e) {
      console.error('Auto-place unlinked failed:', e);
      showError('Failed to auto-place some members');
    }
  }

  async function save() {
    if (!auth.isChairman) {
      showError(
        'Only the Chairman of the Board can modify the organizational chart.'
      );
      return;
    }
    const payload = {
      ...form.value,
      employee_id: form.value.employee_id || null,
      // Include role for backend authorization (Chairman/Board)
      role: auth.userRole,
    };
    try {
      if (editingNode.value) {
        await axios.put(
          `/api/admin/org-chart/${editingNode.value.id}`,
          payload
        );
      } else {
        await axios.post('/api/admin/org-chart', {
          ...payload,
          parent_id: parentForNew.value,
        });
      }
      await fetchChart();
      closeModal();
    } catch (e) {
      console.error(e);
      showError(e?.response?.data?.message || 'Failed to save');
    }
  }

  async function deleteNode(node) {
    if (!auth.isChairman) {
      showError('Only the Chairman of the Board can delete positions.');
      return;
    }
    // legacy quick delete kept for fallback; prefer in-modal delete with reason
    if (!confirm('Delete this position?')) return;
    try {
      // Automatically deactivate linked board member if any
      if (node.board_member_id) {
        try {
          await axios.delete(`/api/board-members/${node.board_member_id}`, {
            data: { reason: 'Deleted from quick action' },
          });
        } catch (e) {
          console.error('Failed to deactivate linked board member:', e);
        }
      }
      await axios.delete(`/api/admin/org-chart/${node.id}`, {
        data: { reason: 'Deleted from quick action', role: auth.userRole },
      });
      await fetchChart();
    } catch (e) {
      console.error(e);
      showError(e?.response?.data?.message || 'Failed to delete');
    }
  }

  async function confirmDelete() {
    if (!auth.isChairman) {
      showError('Only the Chairman of the Board can delete positions.');
      return;
    }
    if (!editingNode.value) return;
    try {
      // Automatically deactivate linked board member first if linked
      if (editingNode.value.board_member_id) {
        try {
          await axios.delete(
            `/api/board-members/${editingNode.value.board_member_id}`,
            { data: { reason: deleteReason.value } }
          );
        } catch (e) {
          console.error('Failed to deactivate linked board member:', e);
          // continue with position delete regardless
        }
      }
      await axios.delete(`/api/admin/org-chart/${editingNode.value.id}`, {
        data: { reason: deleteReason.value, role: auth.userRole },
      });
      showDeleteConfirm.value = false;
      deleteReason.value = '';
      showModal.value = false;
      await fetchChart();
    } catch (e) {
      console.error(e);
      showError(e?.response?.data?.message || 'Failed to delete');
    }
  }

  onMounted(fetchChart);
</script>

<script>
  import OrgNode from '../../components/admin/OrgNode.vue';
  export default { components: { OrgNode } };
</script>

<style scoped></style>
