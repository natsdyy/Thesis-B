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
        <div class="flex items-center gap-2" v-if="!auth.isBoardDirector">
          <button
            class="btn bg-primaryColor hover:bg-primaryColor/80 text-white px-4 py-2 text-sm font-thin"
            @click="openCreate(null)"
          >
            + Add Root
          </button>
          <button
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
            @click="fetchChart"
          >
            Refresh
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
            :canModify="!auth.isBoardDirector"
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
          <input
            v-model="form.employee_id"
            placeholder="Employee ID (optional)"
            class="input input-bordered w-full"
          />
          <select
            v-model="form.department"
            class="select select-bordered w-full"
          >
            <option>Administration</option>
          </select>
        </div>

        <div class="flex justify-end mt-4 gap-2">
          <button
            class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
            @click="closeModal"
          >
            Cancel
          </button>
          <button
            class="px-3 py-1.5 bg-primaryColor hover:bg-primaryColor/80 text-white rounded-md text-sm"
            @click="save"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue';
  import axios from 'axios';
  import { useAuthStore } from '../../stores/authStore';

  const auth = useAuthStore();

  const loading = ref(false);
  const nodes = ref([]);

  const showModal = ref(false);
  const editingNode = ref(null);
  const parentForNew = ref(null);
  const form = ref({
    title: '',
    person_name: '',
    employee_id: '',
    department: 'Administration',
  });

  const rootNodes = computed(() => nodes.value.filter((n) => !n.parent_id));
  const getChildren = (id) => nodes.value.filter((n) => n.parent_id === id);

  async function fetchChart() {
    loading.value = true;
    try {
      const { data } = await axios.get('/api/admin/org-chart');
      nodes.value = data.data || [];
    } finally {
      loading.value = false;
    }
  }

  function openCreate(parentId) {
    parentForNew.value = parentId;
    editingNode.value = null;
    form.value = {
      title: '',
      person_name: '',
      employee_id: '',
      department: 'Administration',
    };
    showModal.value = true;
  }

  function openEdit(node) {
    editingNode.value = node;
    parentForNew.value = node.parent_id || null;
    form.value = {
      title: node.title,
      person_name: node.person_name || '',
      employee_id: node.employee_id || '',
      department: node.department || 'Administration',
    };
    showModal.value = true;
  }

  function closeModal() {
    showModal.value = false;
  }

  async function save() {
    const payload = {
      ...form.value,
      employee_id: form.value.employee_id || null,
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
      alert('Failed to save');
    }
  }

  async function deleteNode(node) {
    if (!confirm('Delete this position?')) return;
    try {
      await axios.delete(`/api/admin/org-chart/${node.id}`);
      await fetchChart();
    } catch (e) {
      console.error(e);
      alert('Failed to delete');
    }
  }

  onMounted(fetchChart);
</script>

<script>
  import OrgNode from '../../components/admin/OrgNode.vue';
  export default { components: { OrgNode } };
</script>

<style scoped></style>
