<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { UserLock, RefreshCcw, Users } from 'lucide-vue-next';
  import { useRoleStore } from '../stores/roleStore';
  import { storeToRefs } from 'pinia';
  import { EllipsisVertical } from 'lucide-vue-next';

  // Stores
  const roleStore = useRoleStore();

  // Role store
  const { roles, loading, error, roleCount, hasRoles, deletedRoles } =
    storeToRefs(roleStore);
  const {
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    restoreRole,
    clearError: clearRoleError,
  } = roleStore;

  // State management
  const currentPage = ref(1);
  const rolesPerPage = ref(5);
  const showDeleted = ref(false);

  const departmentList = [
    'Human Resource',
    'Finance',
    'Supply Chain',
    'Production',
    'Customer Relationship',
    'Admin',
  ];

  // Role types per department
  const departmentRoleTypes = {
    'Human Resource': ['Admin', 'Manager', 'Staff'],
    Finance: ['Admin', 'Manager', 'Staff'],
    'Supply Chain': ['Admin', 'Manager', 'Staff'],
    Production: ['Admin', 'Manager', 'Staff'],
    'Customer Relationship': ['Admin', 'Manager', 'Staff'],
    Admin: ['Super Admin', 'Admin'],
  };

  // Form data
  const newRole = ref({
    role: '',
    department: '',
    description: '',
  });

  const selectedDepartment = ref('');
  const selectedRole = ref('');

  // Computed property for available role types based on selected department
  const availableRoleTypes = computed(() => {
    return departmentRoleTypes[selectedDepartment.value] || [];
  });

  // Auto-generate description based on role type and department
  const generateDescription = () => {
    if (!selectedDepartment.value || !selectedRole.value) {
      return '';
    }

    const descriptions = {
      'Super Admin': 'Full system access across all departments',
      Admin: `Full ${selectedDepartment.value} department access with all CRUD operations`,
      Manager: `${selectedDepartment.value} management access with most operations and approvals`,
      Staff: `Basic ${selectedDepartment.value} employee access with limited operations`,
    };

    return descriptions[selectedRole.value] || '';
  };

  // Toast state
  const toast = ref({ show: false, type: '', message: '' });

  // Show toast helper
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };

  const handleCreateRole = async () => {
    if (
      !newRole.value.role ||
      !newRole.value.department ||
      !newRole.value.description
    ) {
      showToast('error', 'Please fill in all fields');
      return;
    }

    try {
      await createRole({
        role: newRole.value.role,
        department: newRole.value.department,
        description: newRole.value.description,
      });

      // Reset form
      newRole.value = {
        role: '',
        department: '',
        description: '',
      };
      selectedDepartment.value = '';
      selectedRole.value = '';

      closeModal();
      await fetchRoles(showDeleted.value);
      showToast('success', 'Role created successfully');
    } catch (err) {
      showToast('error', 'Failed to create role');
    }
  };

  const handleUpdateRole = async (roleId, updatedData) => {
    try {
      await updateRole(roleId, updatedData);
      closeModal();
      await fetchRoles(showDeleted.value);
      showToast('success', 'Role updated successfully');
    } catch (err) {
      showToast('error', 'Failed to update role');
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      await deleteRole(roleId);
      closeModal();
      await fetchRoles(showDeleted.value);
      showToast('error', 'Role deleted successfully');
    } catch (err) {
      showToast('error', 'Failed to delete role');
    }
  };

  const handleRestoreRole = async (roleId) => {
    try {
      await restoreRole(roleId);
      closeModal();
      await fetchRoles(showDeleted.value);
      showToast('success', 'Role restored successfully');
    } catch (err) {
      showToast('error', 'Failed to restore role');
    }
  };

  // Modal state
  const modal = ref({
    type: null,
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

  // Available role types for editing based on department
  const editAvailableRoleTypes = computed(() => {
    return departmentRoleTypes[modal.value.data.department] || [];
  });

  // Modal methods
  const openModal = async (type, role = null) => {
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

  // Watch for department/role changes to auto-generate description
  watch([selectedDepartment, selectedRole], () => {
    if (selectedDepartment.value && selectedRole.value) {
      // Auto-fill description in the form
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = generateDescription();
      }
    }
  });

  // Reset role selection when department changes
  watch(selectedDepartment, () => {
    if (!availableRoleTypes.value.includes(selectedRole.value)) {
      selectedRole.value = '';
    }
  });

  // Watch for department changes in edit modal
  watch(
    () => modal.value.data.department,
    (newDepartment) => {
      if (!editAvailableRoleTypes.value.includes(modal.value.data.role)) {
        modal.value.data.role = '';
      }
    }
  );

  // Load data on component mount
  onMounted(async () => {
    await fetchRoles(false);
  });
</script>

<template>
  <div class="container mx-auto p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold mb-2 text-secondaryColor">
        Role-Based Access Control
      </h1>
      <p class="text-black/50">
        Manage roles with automatic permission assignment based on role
        hierarchy
      </p>
    </div>

    <!-- Stats -->
    <div
      class="stats shadow w-full mb-6 bg-accentColor stats-vertical lg:stats-horizontal"
    >
      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed"
      >
        <div class="stat-figure">
          <UserLock class="w-8 h-8 text-secondaryColor" />
        </div>
        <div class="stat-title text-black/50" v-if="!showDeleted">
          Total Roles
        </div>
        <div class="stat-title text-black/50" v-else>Total Deleted Roles</div>
        <div class="stat-value text-secondaryColor" v-if="!showDeleted">
          {{ roleCount }}
        </div>
        <div class="stat-value text-secondaryColor" v-else>
          {{ deletedRoles.length }}
        </div>
        <div class="stat-desc text-black/50">
          {{ hasRoles ? 'Roles configured' : 'No roles yet' }}
        </div>
      </div>

      <div class="stat">
        <div class="stat-figure">
          <Users class="w-8 h-8 text-secondaryColor" />
        </div>
        <div class="stat-title text-black/50">Status</div>
        <div class="stat-value text-secondaryColor">
          {{ loading ? 'Loading...' : 'Ready' }}
        </div>
        <div class="stat-desc text-black/50">
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
        <button class="btn btn-sm btn-outline" @click="clearRoleError">
          Dismiss
        </button>
      </div>
    </div>

    <!-- Role List -->
    <div class="card bg-accentColor shadow-xl mb-6 border border-black/10">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h2 class="card-title text-secondaryColor">Role List</h2>
          <div class="flex gap-2">
            <button
              class="btn btn-outline btn-sm text-secondaryColor hover:bg-secondaryColor/10 font-thin hover:border-none hover:shadow-none"
              @click="fetchRoles(showDeleted)"
              :class="{ loading: loading }"
              :disabled="loading"
            >
              <RefreshCcw
                v-if="!loading"
                class="w-4 h-4 mr-2 text-secondaryColor"
              />
              <span
                class="loading loading-spinner loading-xs"
                v-if="loading"
              ></span>
              Refresh
            </button>
            <button
              class="btn btn-outline btn-sm text-secondaryColor hover:bg-secondaryColor/10 font-thin hover:border-none hover:shadow-none"
              @click="toggleDeletedRoles"
            >
              {{ showDeleted ? 'Show Active Roles' : 'Show Deleted Roles' }}
            </button>
          </div>
        </div>

        <div v-if="loading && !hasRoles" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-xs"></span>
        </div>

        <div v-else-if="!hasRoles && !showDeleted" class="text-center py-8">
          <div class="mb-4 items-center justify-center flex">
            <UserLock class="w-16 h-16 text-primaryColor" />
          </div>
          <h3 class="text-lg font-semibold mb-2 text-secondaryColor">
            No active roles found
          </h3>
          <p class="text-base-content/70">
            Add your first role using the form below.
          </p>
        </div>

        <div
          class="text-center py-8"
          v-else-if="showDeleted && deletedRoles.length === 0"
        >
          <div class="mb-4 items-center justify-center flex">
            <UserLock class="w-16 h-16 text-secondaryColor" />
          </div>
          <h3 class="text-lg font-semibold mb-2 text-secondaryColor">
            No deleted roles found
          </h3>
          <p class="text-secondaryColor">No deleted roles found.</p>
        </div>

        <div v-else class="overflow-x-auto bg-accentColor">
          <table
            class="table table-zebra text-black/50 border border-black/10 custom-zebra"
          >
            <thead class="text-secondaryColor">
              <tr class="bg-secondaryColor text-accentColor">
                <th>ID</th>
                <th>Role</th>
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
                        <span class="text-xs text-black/50">{{
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
                    <label
                      tabindex="0"
                      class="btn btn-ghost btn-xs hover:outline-none hover:bg-white/10 hover:text-black/50 hover:border-none hover:shadow-none"
                    >
                      <EllipsisVertical class="w-4 h-4" />
                    </label>
                    <ul
                      tabindex="0"
                      class="dropdown-content z-[1] menu p-2 shadow bg-accentColor rounded-box w-52 border border-black/10"
                    >
                      <li v-if="!role.deleted_at" class="hover:bg-black/10">
                        <a @click="editRole(role)">Edit</a>
                      </li>
                      <li v-if="!role.deleted_at" class="hover:bg-black/10">
                        <a @click="confirmDelete(role)" class="text-error"
                          >Delete</a
                        >
                      </li>
                      <li v-else class="hover:bg-black/10">
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
        <div class="join mt-4 justify-end space-x-1" v-if="totalPages > 1">
          <button
            class="join-item btn font-thin !bg-gray-200 text-black/50 btn-sm border border-none"
            :disabled="currentPage <= 1"
            @click="currentPage--"
            :class="{ 'btn-disabled': currentPage <= 1 }"
          >
            « Prev
          </button>

          <button
            class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm"
            v-for="page in totalPages"
            :key="page"
            :class="{
              'btn-active': currentPage === page,
              '!bg-secondaryColor text-white': currentPage === page,
            }"
            @click="currentPage = page"
          >
            {{ page }}
          </button>

          <button
            class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
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
    <div class="card bg-accentColor shadow-xl mb-6">
      <div class="card-body">
        <h2 class="card-title text-secondaryColor">Create New Role</h2>
        <p class="text-sm text-black/50 mb-4">
          Permissions will be automatically assigned based on role type and
          department hierarchy.
        </p>
        <form @submit.prevent="handleFormSubmit" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text text-black/50">Select Department</span>
            </label>
            <select
              class="select select-bordered w-full bg-white border border-black/10 text-black/50 cursor-pointer"
              v-model="selectedDepartment"
              @change="selectedRole = ''"
              required
            >
              <option value="">Choose Department</option>
              <option
                v-for="department in departmentList"
                :key="department"
                :value="department"
              >
                {{ department }}
              </option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text text-black/50">Role Type</span>
            </label>
            <select
              class="select select-bordered w-full bg-white border border-black/10 text-black/50 disabled:bg-gray-200 disabled:text-black/50 disabled:border-none"
              v-model="selectedRole"
              :disabled="!selectedDepartment"
              required
            >
              <option value="">Choose Role Type</option>
              <option
                v-for="role in availableRoleTypes"
                :key="role"
                :value="role"
              >
                {{ role }}
              </option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text text-black/50">Description</span>
            </label>
            <textarea
              class="textarea textarea-bordered w-full bg-white border border-black/10 text-black/50 cursor-pointer"
              rows="3"
              placeholder="Description will be auto-generated..."
              required
            ></textarea>
          </div>

          <!-- Permission Info -->
          <div class="bg-blue-50 p-4 rounded-lg" v-if="selectedRole">
            <h4 class="font-medium text-blue-800 mb-2">Permission Structure</h4>
            <div class="text-sm text-blue-700">
              <div v-if="selectedRole === 'Super Admin'">
                • Full system access across all departments<br />
                • All CRUD operations<br />
                • System administration privileges
              </div>
              <div v-else-if="selectedRole === 'Admin'">
                • Full department CRUD operations<br />
                • All department-specific permissions<br />
                • Department management access
              </div>
              <div v-else-if="selectedRole === 'Manager'">
                • Most operations with approval capabilities<br />
                • Department reports and management access<br />
                • Limited administrative functions
              </div>
              <div v-else-if="selectedRole === 'Staff'">
                • Basic operations only<br />
                • Limited department access<br />
                • Read-only for most sensitive data
              </div>
            </div>
          </div>

          <div class="card-actions justify-end">
            <button
              type="submit"
              class="btn bg-secondaryColor text-white font-thin border border-none"
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
      <div class="modal-box bg-accentColor text-black/50 shadow-lg">
        <h3 class="font-bold text-lg">Create Role Confirmation</h3>
        <div class="py-4">
          <p class="mb-2">Are you sure you want to create this role?</p>
          <div class="bg-white/10 p-3 rounded mt-3">
            <p><strong>Role:</strong> {{ newRole.role }}</p>
            <p><strong>Department:</strong> {{ newRole.department }}</p>
            <p><strong>Description:</strong> {{ newRole.description }}</p>
            <p class="text-xs text-gray-500 mt-2">
              Permissions will be automatically assigned based on role
              hierarchy.
            </p>
          </div>
        </div>
        <div class="modal-action">
          <button
            class="btn btn-sm font-thin bg-gray-200 text-black/50 border border-none hover:bg-gray-300"
            @click="closeModal"
          >
            Cancel
          </button>
          <button
            class="btn btn-sm bg-secondaryColor text-white font-thin border border-none hover:bg-secondaryColor/80"
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
      <div class="modal-box bg-accentColor text-black/50 shadow-lg">
        <!-- Edit Modal Content -->
        <template v-if="modal.type === 'edit'">
          <h3 class="text-lg font-bold mb-4">Edit Role</h3>
          <form @submit.prevent="handleModalAction">
            <div class="form-control mb-4">
              <label class="label"
                ><span class="label-text">Department</span></label
              >
              <select
                v-model="modal.data.department"
                class="select select-bordered w-full bg-white border border-black/10 text-black/50 cursor-pointer"
                required
              >
                <option
                  v-for="department in departmentList"
                  :key="department"
                  :value="department"
                >
                  {{ department }}
                </option>
              </select>
            </div>

            <div class="form-control mb-4">
              <label class="label"
                ><span class="label-text">Role Type</span></label
              >
              <select
                v-model="modal.data.role"
                class="select select-bordered w-full bg-white border border-black/10 text-black/50 cursor-pointer"
                required
              >
                <option value="">Choose Role Type</option>
                <option
                  v-for="role in editAvailableRoleTypes"
                  :key="role"
                  :value="role"
                >
                  {{ role }}
                </option>
              </select>
              <div class="label" v-if="modal.data.department">
                <span class="label-text-alt text-gray-500">
                  Available for {{ modal.data.department }}:
                  {{ editAvailableRoleTypes.join(', ') }}
                </span>
              </div>
            </div>

            <div class="form-control mb-4">
              <label class="label"
                ><span class="label-text">Description</span></label
              >
              <textarea
                v-model="modal.data.description"
                class="textarea textarea-bordered w-full bg-white border border-black/10 text-black/50 cursor-pointer"
                rows="3"
                required
              ></textarea>
            </div>

            <div class="modal-action">
              <button
                type="button"
                class="btn btn-outline font-thin btn-sm bg-gray-200 text-black/50 border border-none hover:bg-gray-300"
                @click="closeModal"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn bg-secondaryColor font-thin border border-none hover:bg-secondaryColor/80 btn-sm"
                :disabled="loading"
              >
                <span
                  class="loading loading-spinner loading-xs"
                  v-if="loading"
                ></span>
                {{ loading ? 'Saving...' : 'Save' }}
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
              class="btn btn-outline font-thin btn-sm bg-gray-200 text-black/50 border border-none hover:bg-gray-300 hover:shadow-none"
              @click="closeModal"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-error font-thin btn-sm"
              @click="handleModalAction"
              :disabled="loading"
            >
              <span
                class="loading loading-spinner loading-xs"
                v-if="loading"
              ></span>
              {{ loading ? 'Deleting...' : 'Delete' }}
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
              class="btn btn-success font-thin btn-sm"
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
              class="btn btn-outline font-thin btn-sm"
              @click="closeModal"
            >
              Cancel
            </button>
          </div>
        </template>
      </div>
    </dialog>
  </div>

  <!-- Toast Notification -->
  <transition
    enter-active-class="transform transition ease-out duration-300"
    enter-from-class="translate-x-full opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transform transition ease-in duration-300"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-full opacity-0"
  >
    <div class="toast toast-end" v-if="toast.show">
      <div
        v-if="toast.type === 'success'"
        class="alert alert-success shadow-lg"
      >
        <span>{{ toast.message }}</span>
      </div>
      <div
        v-else-if="toast.type === 'error'"
        class="alert alert-error shadow-lg"
      >
        <span>{{ toast.message }}</span>
      </div>
    </div>
  </transition>
</template>

<style scoped>
  .custom-zebra tbody tr:nth-child(even) {
    background-color: var(--accentColor);
  }
  .custom-zebra tbody tr:nth-child(odd) {
    background-color: rgba(0, 0, 0, 0.03);
  }
</style>
