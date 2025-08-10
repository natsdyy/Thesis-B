<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { UserLock, RefreshCcw } from 'lucide-vue-next';
  import { useRoleStore } from '../stores/roleStore';
  import { storeToRefs } from 'pinia';

  // Pinia store
  const roleStore = useRoleStore();
  const { roles, loading, error, roleCount, hasRoles, deletedRoles } =
    storeToRefs(roleStore);
  const {
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    restoreRole,
    clearError,
  } = roleStore;

  // State management
  const currentPage = ref(1);
  const rolesPerPage = ref(5);
  const showDeleted = ref(false);

  const departmentRoles = {
    'Human Resource': ['Manager', 'Staff'],
    Finance: ['Manager', 'Staff'],
    'Supply Chain': ['Manager', 'Staff'],
    Production: ['Manager', 'Staff'],
    'Customer Relationship': ['Manager', 'Staff'],
  };

  // Form data
  const newRole = ref({
    role: '',
    department: '',
    description: '',
  });

  const selectedDepartment = ref('');
  const selectedRole = ref('');

  // Modal state
  const modal = ref({
    type: null, // 'edit', 'delete', 'restore'
    show: false,
    role: null,
    data: { role: '', department: '', description: '' },
  });

  // Computed properties
  const filteredRoles = computed(() => {
    const list = roles.value || [];
    return showDeleted.value
      ? list.filter((role) => role.deleted_at)
      : list.filter((role) => !role.deleted_at);
  });

  const sortedRoles = computed(() => {
    return [...filteredRoles.value].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  });

  const paginatedRoles = computed(() => {
    const start = (currentPage.value - 1) * rolesPerPage.value;
    return sortedRoles.value.slice(start, start + rolesPerPage.value);
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredRoles.value.length / rolesPerPage.value);
  });

  const availableRoles = computed(() => {
    return departmentRoles[selectedDepartment.value] || [];
  });

  // Methods
  const handleCreateRole = async () => {
    if (
      !newRole.value.role ||
      !newRole.value.department ||
      !newRole.value.description
    ) {
      error.value = 'Please fill in all fields';
      return;
    }

    try {
      await createRole({
        role: newRole.value.role,
        department: newRole.value.department,
        description: newRole.value.description,
      });

      // Reset form
      newRole.value = { role: '', department: '', description: '' };
      selectedDepartment.value = '';
      selectedRole.value = '';

      closeModal();
      await fetchRoles(showDeleted.value);
    } catch (err) {
      // Error handled by store
    }
  };

  const handleUpdateRole = async (roleId, updatedData) => {
    try {
      await updateRole(roleId, updatedData);
      closeModal();
      await fetchRoles(showDeleted.value);
    } catch (err) {
      // Error handled by store
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      await deleteRole(roleId);
      closeModal();
      await fetchRoles(showDeleted.value);
    } catch (err) {
      // Error handled by store
    }
  };

  const handleRestoreRole = async (roleId) => {
    try {
      await restoreRole(roleId);
      closeModal();
      await fetchRoles(showDeleted.value);
    } catch (err) {
      // Error handled by store
    }
  };

  // Modal methods
  const openModal = (type, role = null) => {
    modal.value = {
      type,
      show: true,
      role,
      data: role
        ? {
            role: role.role,
            department: role.department,
            description: role.description,
          }
        : { role: '', department: '', description: '' },
    };

    if (type === 'create') {
      document.getElementById('confirm_modal').showModal();
    } else {
      document.getElementById('universal_modal').showModal();
    }
  };

  const closeModal = () => {
    document.getElementById('confirm_modal')?.close();
    document.getElementById('universal_modal')?.close();
    modal.value = {
      type: null,
      show: false,
      role: null,
      data: { role: '', department: '', description: '' },
    };
  };

  const handleModalAction = async () => {
    try {
      switch (modal.value.type) {
        case 'create':
          await handleCreateRole();
          break;
        case 'edit':
          await handleUpdateRole(modal.value.role.role_id, modal.value.data);
          break;
        case 'delete':
          await handleDeleteRole(modal.value.role.role_id);
          break;
        case 'restore':
          await handleRestoreRole(modal.value.role.role_id);
          break;
      }
    } catch (err) {
      // Error handled by individual methods
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    newRole.value = {
      role: selectedRole.value,
      department: selectedDepartment.value,
      description: document.querySelector('textarea').value,
    };
    openModal('create');
  };

  // Action methods
  const editRole = (role) => openModal('edit', role);
  const confirmDelete = (role) => openModal('delete', role);
  const confirmRestore = (role) => openModal('restore', role);

  const toggleDeletedRoles = async () => {
    showDeleted.value = !showDeleted.value;
    await fetchRoles(showDeleted.value);
    currentPage.value = 1;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Load roles on component mount
  onMounted(() => {
    fetchRoles(false);
  });
</script>

<template>
  <div class="container mx-auto p-6 max-w-4xl">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold mb-2 text-secondaryColor">
        User Role Management
      </h1>
      <p class="text-base-content/70">
        Manage roles with department-based permissions
      </p>
    </div>

    <!-- Stats -->
    <div class="stats shadow w-full mb-6">
      <div class="stat">
        <div class="stat-figure text-primary">
          <UserLock class="w-8 h-8" />
        </div>
        <div class="stat-title" v-if="!showDeleted">Total Roles</div>
        <div class="stat-title" v-else>Total Deleted Roles</div>
        <div class="stat-value text-primary" v-if="!showDeleted">
          {{ roleCount }}
        </div>
        <div class="stat-value text-primary" v-else>
          {{ deletedRoles.length }}
        </div>
        <div class="stat-desc">
          {{ hasRoles ? 'Roles configured' : 'No roles yet' }}
        </div>
      </div>

      <div class="stat">
        <div class="stat-figure text-secondary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="inline-block w-8 h-8 stroke-current"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            ></path>
          </svg>
        </div>
        <div class="stat-title">Status</div>
        <div class="stat-value text-secondaryColor">
          {{ loading ? 'Loading...' : 'Ready' }}
        </div>
        <div class="stat-desc">
          {{ loading ? 'Please wait' : 'System operational' }}
        </div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="alert alert-error mb-6">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{{ error }}</span>
      <div>
        <button class="btn btn-sm btn-outline" @click="clearError">
          Dismiss
        </button>
      </div>
    </div>

    <!-- Role List -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h2 class="card-title">Role List</h2>
          <div class="flex gap-2">
            <button
              class="btn btn-outline btn-sm"
              @click="fetchRoles(showDeleted)"
              :class="{ loading: loading }"
              :disabled="loading"
            >
              <RefreshCcw v-if="!loading" class="w-4 h-4 mr-2" />
              <span
                class="loading loading-spinner loading-xs"
                v-if="loading"
              ></span>
              Refresh
            </button>
            <button class="btn btn-outline btn-sm" @click="toggleDeletedRoles">
              {{ showDeleted ? 'Show Active Roles' : 'Show Deleted Roles' }}
            </button>
          </div>
        </div>

        <div v-if="loading && !hasRoles" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-xs"></span>
        </div>

        <div v-else-if="!hasRoles && !showDeleted" class="text-center py-8">
          <div class="mb-4 items-center justify-center flex">
            <UserLock class="w-16 h-16 text-base-content/30" />
          </div>
          <h3 class="text-lg font-semibold mb-2">No active roles found</h3>
          <p class="text-base-content/70">
            Add your first role using the form below.
          </p>
        </div>

        <div
          class="text-center py-8"
          v-else-if="showDeleted && deletedRoles.length === 0"
        >
          <div class="mb-4 items-center justify-center flex">
            <UserLock class="w-16 h-16 text-base-content/30" />
          </div>
          <h3 class="text-lg font-semibold mb-2">No deleted roles found</h3>
          <p class="text-base-content/70">No deleted roles found.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>ID</th>
                <th>Role Name</th>
                <th>Department</th>
                <th>Description</th>
                <th>Updated At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="role in paginatedRoles"
                :key="role.role_id"
                :class="{ 'text-red-400': role.deleted_at }"
              >
                <th>{{ role.role_id }}</th>
                <td>
                  <div class="flex items-center space-x-3">
                    <div class="avatar placeholder">
                      <div
                        class="bg-neutral-focus text-neutral-content rounded-full w-8"
                      >
                        <span class="text-xs">{{
                          role.role?.charAt(0).toUpperCase()
                        }}</span>
                      </div>
                    </div>
                    <div class="font-bold">{{ role.role }}</div>
                  </div>
                </td>
                <td>{{ role.department }}</td>
                <td>{{ role.description }}</td>
                <td>{{ formatDate(role.updated_at) }}</td>
                <td>
                  <div class="dropdown dropdown-left">
                    <label tabindex="0" class="btn btn-ghost btn-xs">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M12 5v.01M12 12v.01M12 19v.01"
                        />
                      </svg>
                    </label>
                    <ul
                      tabindex="0"
                      class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
                    >
                      <li v-if="!role.deleted_at">
                        <a @click="editRole(role)">Edit</a>
                      </li>
                      <li v-if="!role.deleted_at">
                        <a @click="confirmDelete(role)" class="text-error"
                          >Delete</a
                        >
                      </li>
                      <li v-else>
                        <a @click="confirmRestore(role)" class="text-success"
                          >Restore</a
                        >
                      </li>
                    </ul>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="join mt-4 justify-center" v-if="totalPages > 1">
          <button
            class="join-item btn font-thin"
            :disabled="currentPage <= 1"
            @click="currentPage--"
            :class="{ 'btn-disabled': currentPage <= 1 }"
          >
            « Prev
          </button>

          <button
            class="join-item btn font-thin"
            v-for="page in totalPages"
            :key="page"
            :class="{ 'btn-active': currentPage === page }"
            @click="currentPage = page"
          >
            {{ page }}
          </button>

          <button
            class="join-item btn font-thin"
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
            :class="{ 'btn-disabled': currentPage >= totalPages }"
          >
            Next »
          </button>
        </div>
      </div>
    </div>

    <!-- Create New Role -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h2 class="card-title">Create New Role</h2>
        <form @submit.prevent="handleFormSubmit" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Select Department</span>
            </label>
            <select
              class="select select-bordered w-full"
              v-model="selectedDepartment"
              @change="selectedRole = ''"
              required
            >
              <option value="">Choose Department</option>
              <option
                v-for="department in Object.keys(departmentRoles)"
                :key="department"
                :value="department"
              >
                {{ department }}
              </option>
            </select>
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Select Role</span>
            </label>
            <select
              class="select select-bordered w-full"
              v-model="selectedRole"
              :disabled="!selectedDepartment"
              required
            >
              <option value="">Choose Role</option>
              <option v-for="role in availableRoles" :key="role" :value="role">
                {{ role }}
              </option>
            </select>
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Description</span>
            </label>
            <textarea
              class="textarea textarea-bordered w-full"
              rows="3"
              placeholder="Enter role description"
              required
            ></textarea>
          </div>
          <div class="card-actions justify-end">
            <button
              type="submit"
              class="btn bg-secondaryColor text-white font-thin"
              :class="{ loading: loading }"
              :disabled="loading || !selectedDepartment || !selectedRole"
            >
              <span
                class="loading loading-spinner loading-xs"
                v-if="loading"
              ></span>
              {{ loading ? 'Creating...' : '+ Create Role' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create Confirmation Modal -->
    <dialog id="confirm_modal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg">Confirmation</h3>
        <p class="py-4">
          Are you sure you want to create this role? This action will add a new
          role to the system.
        </p>
        <div class="modal-action">
          <button class="btn font-thin" @click="closeModal">Cancel</button>
          <button
            class="btn bg-secondaryColor text-white font-thin"
            @click="handleModalAction"
            :disabled="loading"
          >
            <span
              class="loading loading-spinner loading-xs"
              v-if="loading"
            ></span>
            {{ loading ? 'Creating...' : 'Confirm' }}
          </button>
        </div>
      </div>
    </dialog>

    <!-- Universal Modal for Edit/Delete/Restore -->
    <dialog id="universal_modal" class="modal">
      <div class="modal-box">
        <!-- Edit Modal Content -->
        <template v-if="modal.type === 'edit'">
          <h3 class="text-lg font-bold mb-4">Edit Role</h3>
          <form @submit.prevent="handleModalAction">
            <div class="form-control mb-4">
              <label class="label"
                ><span class="label-text">Role Name</span></label
              >
              <input
                v-model="modal.data.role"
                type="text"
                class="input input-bordered w-full"
                required
              />
            </div>
            <div class="form-control mb-4">
              <label class="label"
                ><span class="label-text">Department</span></label
              >
              <select
                v-model="modal.data.department"
                class="select select-bordered w-full"
                required
              >
                <option
                  v-for="department in Object.keys(departmentRoles)"
                  :key="department"
                  :value="department"
                >
                  {{ department }}
                </option>
              </select>
            </div>
            <div class="form-control mb-4">
              <label class="label"
                ><span class="label-text">Description</span></label
              >
              <textarea
                v-model="modal.data.description"
                class="textarea textarea-bordered w-full"
                rows="3"
                required
              ></textarea>
            </div>
            <div class="modal-action">
              <button
                type="submit"
                class="btn bg-secondaryColor font-thin"
                :disabled="loading"
              >
                <span
                  class="loading loading-spinner loading-xs"
                  v-if="loading"
                ></span>
                {{ loading ? 'Saving...' : 'Save' }}
              </button>
              <button
                type="button"
                class="btn btn-outline font-thin"
                @click="closeModal"
              >
                Cancel
              </button>
            </div>
          </form>
        </template>

        <!-- Delete Modal Content -->
        <template v-if="modal.type === 'delete'">
          <h3 class="text-lg font-bold mb-4">Delete Role</h3>
          <p>
            Are you sure you want to delete the
            <strong>{{ modal.role?.role }}</strong> role from
            <strong>{{ modal.role?.department }}</strong> department?
          </p>
          <p class="text-sm text-gray-500 mt-2">
            This action can be undone by restoring the role later.
          </p>
          <div class="modal-action">
            <button
              type="button"
              class="btn btn-error font-thin"
              @click="handleModalAction"
              :disabled="loading"
            >
              <span
                class="loading loading-spinner loading-xs"
                v-if="loading"
              ></span>
              {{ loading ? 'Deleting...' : 'Delete' }}
            </button>
            <button
              type="button"
              class="btn btn-outline font-thin"
              @click="closeModal"
            >
              Cancel
            </button>
          </div>
        </template>

        <!-- Restore Modal Content -->
        <template v-if="modal.type === 'restore'">
          <h3 class="text-lg font-bold mb-4">Restore Role</h3>
          <p>
            Are you sure you want to restore the
            <strong>{{ modal.role?.role }}</strong> role from
            <strong>{{ modal.role?.department }}</strong> department?
          </p>
          <p class="text-sm text-gray-500 mt-2">
            This will make the role active again.
          </p>
          <div class="modal-action">
            <button
              type="button"
              class="btn btn-success font-thin"
              @click="handleModalAction"
              :disabled="loading"
            >
              <span
                class="loading loading-spinner loading-xs"
                v-if="loading"
              ></span>
              {{ loading ? 'Restoring...' : 'Restore' }}
            </button>
            <button
              type="button"
              class="btn btn-outline font-thin"
              @click="closeModal"
            >
              Cancel
            </button>
          </div>
        </template>
      </div>
    </dialog>
  </div>
</template>
