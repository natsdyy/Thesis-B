<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { UserLock, RefreshCcw, Users } from 'lucide-vue-next';
  import { useRoleStore } from '../stores/roleStore';
  import { usePermissionStore } from '../stores/permissionStore';
  import { useRolePermissionStore } from '../stores/rolePermissionStore';
  import { storeToRefs } from 'pinia';

  // Stores
  const roleStore = useRoleStore();
  const permissionStore = usePermissionStore();
  const rolePermissionStore = useRolePermissionStore();

  // Role store
  const { roles, loading, error, roleCount, hasRoles, deletedRoles } =
    storeToRefs(roleStore);
  const {
    fetchRoles,
    createRoleWithPermissions,
    updateRoleWithPermissions,
    deleteRole,
    restoreRole,
    clearError: clearRoleError,
  } = roleStore;

  // Permission store
  const { permissions } = storeToRefs(permissionStore);
  const { fetchPermissions } = permissionStore;

  // Role-permission store
  const { bulkAssignPermissionsToRole } = rolePermissionStore;

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

  // Department-specific role types
  const departmentRoleTypes = {
    'Human Resource': ['Manager', 'Staff'],
    Finance: ['Manager', 'Staff'],
    'Supply Chain': ['Manager', 'Staff'],
    Production: ['Manager', 'Staff'],
    'Customer Relationship': ['Manager', 'Staff'],
    Admin: ['Admin', 'Super Admin'],
  };

  // Form data
  const newRole = ref({
    role: '',
    department: '',
    description: '',
    permission_ids: [],
  });

  const selectedDepartment = ref('');
  const selectedRole = ref('');
  const selectedPermissions = ref([]);

  // Computed property for available role types based on selected department
  const availableRoleTypes = computed(() => {
    return departmentRoleTypes[selectedDepartment.value] || [];
  });

  // Group permissions by department/module for better organization
  const departmentPermissions = computed(() => {
    const grouped = {};
    permissions.value.forEach((permission) => {
      // Try to determine department from permission name
      let department = 'General';

      if (
        permission.permission_name.toLowerCase().includes('employee') ||
        permission.permission_name.toLowerCase().includes('attendance') ||
        permission.permission_name.toLowerCase().includes('payroll') ||
        permission.permission_name.toLowerCase().includes('leave')
      ) {
        department = 'Human Resource';
      } else if (
        permission.permission_name.toLowerCase().includes('inventory') ||
        permission.permission_name.toLowerCase().includes('purchase') ||
        permission.permission_name.toLowerCase().includes('sales') ||
        permission.permission_name.toLowerCase().includes('payment')
      ) {
        department = 'Finance';
      } else if (
        permission.permission_name.toLowerCase().includes('supplier')
      ) {
        department = 'Supply Chain';
      } else if (
        permission.permission_name.toLowerCase().includes('production') ||
        permission.permission_name.toLowerCase().includes('quality')
      ) {
        department = 'Production';
      } else if (
        permission.permission_name.toLowerCase().includes('customer')
      ) {
        department = 'Customer Relationship';
      } else if (
        permission.permission_name.toLowerCase().includes('user') ||
        permission.permission_name.toLowerCase().includes('role') ||
        permission.permission_name.toLowerCase().includes('permission') ||
        permission.permission_name.toLowerCase().includes('setting')
      ) {
        department = 'Admin';
      }

      if (!grouped[department]) {
        grouped[department] = [];
      }
      grouped[department].push(permission);
    });
    return grouped;
  });

  const availablePermissions = computed(() => {
    return departmentPermissions.value[selectedDepartment.value] || [];
  });

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
      await createRoleWithPermissions({
        role: newRole.value.role,
        department: newRole.value.department,
        description: newRole.value.description,
        permission_ids: newRole.value.permission_ids,
      });

      // Reset form
      newRole.value = {
        role: '',
        department: '',
        description: '',
        permission_ids: [],
      };
      selectedDepartment.value = '';
      selectedRole.value = '';
      selectedPermissions.value = [];

      closeModal();
      await fetchRoles(showDeleted.value);
      showToast('success', 'Role created successfully with permissions');
    } catch (err) {
      showToast('error', 'Failed to create role');
    }
  };

  const handleUpdateRole = async (roleId, updatedData) => {
    try {
      await updateRoleWithPermissions(roleId, updatedData);
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
    data: { role: '', department: '', description: '', permission_ids: [] },
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
            permission_ids: role.permissions
              ? role.permissions.map((p) => p.permission_id)
              : [],
          }
        : { role: '', department: '', description: '', permission_ids: [] },
    };

    // If editing, load role permissions
    if (type === 'edit' && role) {
      try {
        const roleWithPermissions = await roleStore.getRoleWithPermissions(
          role.role_id
        );
        modal.value.data.permission_ids = roleWithPermissions.permissions.map(
          (p) => p.permission_id
        );
      } catch (err) {
        console.error('Failed to load role permissions:', err);
      }
    }

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
      data: { role: '', department: '', description: '', permission_ids: [] },
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
      permission_ids: selectedPermissions.value,
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

  // Initialize permissions and role when department changes
  watch(selectedDepartment, (newDepartment) => {
    selectedPermissions.value = [];
    // Reset role selection if the current selected role is not available in the new department
    if (!availableRoleTypes.value.includes(selectedRole.value)) {
      selectedRole.value = '';
    }
  });

  // Watch for department changes in edit modal
  watch(
    () => modal.value.data.department,
    (newDepartment) => {
      // Reset role selection if the current selected role is not available in the new department
      if (!editAvailableRoleTypes.value.includes(modal.value.data.role)) {
        modal.value.data.role = '';
      }
    }
  );

  // Watch for permission changes to update newRole
  watch(
    selectedPermissions,
    (newPermissions) => {
      newRole.value.permission_ids = newPermissions;
    },
    { deep: true }
  );

  // Load data on component mount
  onMounted(async () => {
    await Promise.all([fetchRoles(false), fetchPermissions()]);
  });
</script>

<template>
  <div class="container mx-auto p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold mb-2 text-secondaryColor">
        Role-Based Access Control
      </h1>
      <p class="text-base-content/70">
        Manage roles and permissions with department-based access control
      </p>
    </div>

    <!-- Stats -->
    <div class="stats shadow w-full mb-6 bg-accentColor">
      <div class="stat">
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
            class="join-item btn font-thin !bg-gray-200 text-black/50 btn-sm"
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
              <span class="label-text text-black/50">Select Role Type</span>
            </label>
            <select
              class="select select-bordered w-full bg-white border border-black/10 text-black/50 cursor-pointer disabled:bg-gray-200 disabled:text-black/50 disabled:border-none"
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
            <div class="label" v-if="selectedDepartment">
              <span class="label-text-alt text-gray-500">
                Available for {{ selectedDepartment }}:
                {{ availableRoleTypes.join(', ') }}
              </span>
            </div>
          </div>

          <!-- Select Permissions -->
          <div class="form-control" v-if="selectedDepartment">
            <label class="label">
              <span class="label-text text-black/50">Select Permissions</span>
            </label>

            <div
              class="space-y-2 max-h-60 overflow-y-auto border border-black/10 rounded p-4 bg-white"
            >
              <div
                v-if="availablePermissions.length === 0"
                class="text-center text-gray-500 py-4"
              >
                No permissions available for this department
              </div>
              <label
                v-for="permission in availablePermissions"
                :key="permission.permission_id"
                class="label cursor-pointer justify-start gap-3"
              >
                <input
                  type="checkbox"
                  class="checkbox checkbox-neutral checkbox-xs bg-white border border-black/10 cursor-pointer checked:bg-secondaryColor checked:text-white checked:border-none"
                  :value="permission.permission_id"
                  v-model="selectedPermissions"
                />
                <span class="label-text text-black/50">
                  {{ permission.permission_name }}
                </span>
              </label>
            </div>

            <div class="text-sm text-gray-500 mt-2">
              {{ selectedPermissions.length }} permission(s) selected
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text text-black/50">Description</span>
            </label>
            <textarea
              class="textarea textarea-bordered w-full bg-white border border-black/10 text-black/50 cursor-pointer"
              rows="3"
              placeholder="Enter role description"
              required
            ></textarea>
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
            <p>
              <strong>Permissions:</strong>
              {{ newRole.permission_ids.length }} selected
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

            <!-- Permissions for Edit -->
            <div class="form-control mb-4">
              <label class="label">
                <span class="label-text">Permissions</span>
              </label>
              <div
                class="space-y-2 max-h-40 overflow-y-auto border border-black/10 rounded p-4 bg-white"
              >
                <label
                  v-for="permission in permissions"
                  :key="permission.permission_id"
                  class="label cursor-pointer justify-start gap-3"
                >
                  <input
                    type="checkbox"
                    class="checkbox checkbox-neutral checkbox-xs bg-white border border-black/10 cursor-pointer checked:bg-secondaryColor checked:text-white checked:border-none"
                    :value="permission.permission_id"
                    v-model="modal.data.permission_ids"
                  />
                  <span class="label-text text-black/50 text-sm">
                    {{ permission.permission_name }}
                  </span>
                </label>
              </div>
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
