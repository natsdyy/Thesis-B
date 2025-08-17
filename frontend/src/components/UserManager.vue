<template>
  <div class="container mx-auto p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-primaryColor mb-2">User Management</h1>
      <p :class="themeStore.themeClasses.textSecondary">
        Manage users with role assignments and departments
      </p>
    </div>

    <!-- Stats -->
    <div :class="[
      'stats shadow w-full mb-6 transition-colors duration-300',
      themeStore.themeClasses.cardBg
    ]">
      <div class="stat">
        <div class="stat-figure text-primaryColor">
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
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            ></path>
          </svg>
        </div>
        <div :class="themeStore.themeClasses.textSecondary" v-if="!showDeleted">Total Users</div>
        <div :class="themeStore.themeClasses.textSecondary" v-else>Total Deleted Users</div>
        <div class="stat-value text-primaryColor" v-if="!showDeleted">
          {{ userCount }}
        </div>
        <div class="stat-value text-primaryColor" v-else>
          {{ deletedUsers.length }}
        </div>
        <div :class="themeStore.themeClasses.textSecondary">
          {{ hasUsers ? 'Users registered' : 'No users yet' }}
        </div>
      </div>

      <div class="stat">
        <div class="stat-figure text-primaryColor">
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
        <div :class="themeStore.themeClasses.textSecondary">Status</div>
        <div class="stat-value text-primaryColor">
          {{ loading ? 'Loading...' : 'Ready' }}
        </div>
        <div :class="themeStore.themeClasses.textSecondary">
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
                 <button class="btn btn-sm btn-outline text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white" @click="clearError">
          Dismiss
        </button>
      </div>
    </div>

    <!-- Add User Form -->
    <div :class="[
      'card shadow-xl mb-6 transition-colors duration-300',
      themeStore.themeClasses.cardBg
    ]">
      <div class="card-body">
        <h2 class="card-title text-primaryColor">Add New User</h2>
        <form @submit.prevent="handleCreateUser" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span :class="['label-text', themeStore.themeClasses.textSecondary]">Name</span>
              </label>
              <input
                v-model="newUser.name"
                type="text"
                placeholder="Enter full name"
                :class="[
                  'input input-bordered w-full transition-colors duration-300',
                  themeStore.themeClasses.input
                ]"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span :class="['label-text', themeStore.themeClasses.textSecondary]">Email</span>
              </label>
              <input
                v-model="newUser.email"
                type="email"
                placeholder="Enter email address"
                :class="[
                  'input input-bordered w-full transition-colors duration-300',
                  themeStore.themeClasses.input
                ]"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Department</span>
              </label>
              <select
                v-model="newUser.department"
                class="select select-bordered w-full"
              >
                <option value="">Choose Department</option>
                <option value="Human Resource">Human Resource</option>
                <option value="Finance">Finance</option>
                <option value="Supply Chain">Supply Chain</option>
                <option value="Production">Production</option>
                <option value="Customer Relationship">
                  Customer Relationship
                </option>
                <option value="Admin">Admin</option>
              </select>
              <div class="label" v-if="newUser.department">
                <span class="label-text-alt text-gray-500">
                  Available roles for {{ newUser.department }}:
                  {{ availableRoles.map((r) => r.role).join(', ') || 'None' }}
                </span>
              </div>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Role</span>
              </label>
              <select
                v-model="newUser.role_id"
                class="select select-bordered w-full"
                :disabled="!newUser.department"
              >
                <option value="">
                  {{
                    newUser.department
                      ? 'Choose Role'
                      : 'Select Department First'
                  }}
                </option>
                <option
                  v-for="role in availableRoles"
                  :key="role.role_id"
                  :value="role.role_id"
                >
                  {{ role.role }}
                </option>
              </select>
            </div>
          </div>

          <div class="card-actions justify-end">
            <button
              type="submit"
              class="btn bg-primaryColor text-white hover:bg-primaryColor/80 border-none"
              :class="{ loading: loading }"
              :disabled="loading"
            >
              <svg
                v-if="!loading"
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              {{ loading ? 'Creating...' : 'Add User' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Users List -->
    <div :class="[
      'card shadow-xl transition-colors duration-300',
      themeStore.themeClasses.cardBg
    ]">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h2 class="card-title text-primaryColor">Users List</h2>
          <div class="flex gap-2">
                         <button
               class="btn btn-outline btn-sm text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white"
               @click="fetchUsers(true)"
               :class="{ loading: loading }"
               :disabled="loading"
             >
              <svg
                v-if="!loading"
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
                         <button class="btn btn-outline btn-sm text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white" @click="toggleDeletedUsers">
              {{ showDeleted ? 'Show Active Users' : 'Show Deleted Users' }}
            </button>
          </div>
        </div>

        <div v-if="loading && !hasUsers" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="!hasUsers" class="text-center py-8">
          <div class="text-6xl mb-4">👥</div>
          <h3 class="text-lg font-semibold mb-2">No users found</h3>
          <p class="text-base-content/70">
            Add your first user using the form above.
          </p>
        </div>

        <div v-else :class="['overflow-x-auto transition-colors duration-300', themeStore.themeClasses.cardBg]">
          <table :class="[
            'table transition-colors duration-300',
            themeStore.isDarkMode ? 'table-zebra-dark' : 'table-zebra',
            themeStore.themeClasses.textSecondary,
            'border',
            themeStore.themeClasses.border
          ]">
            <thead class="text-primaryColor">
              <tr class="bg-primaryColor text-accentColor">
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in paginatedUsers"
                :key="user.id"
                :class="{ 'text-red-400': user.deleted_at }"
              >
                <th>{{ user.id }}</th>
                <td>
                  <div class="flex items-center space-x-3">
                    <div class="avatar placeholder">
                      <div
                        class="bg-neutral-focus text-neutral-content rounded-full w-8"
                      >
                        <span class="text-xs">{{
                          user.name.charAt(0).toUpperCase()
                        }}</span>
                      </div>
                    </div>
                    <div class="font-bold">{{ user.name }}</div>
                  </div>
                </td>
                <td>{{ user.email }}</td>
                <td>
                  <div class="badge badge-ghost badge-sm">
                    {{ user.department || 'No Department' }}
                  </div>
                </td>
                                 <td>
                   <div class="badge bg-primaryColor text-white badge-sm border-none">
                     {{ user.role || 'No Role' }}
                   </div>
                 </td>
                <td>{{ formatDate(user.created_at) }}</td>
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
                      <li v-if="!user.deleted_at">
                        <a @click="editUser(user)">Edit</a>
                      </li>
                      <li v-if="!user.deleted_at">
                        <a @click="confirmDelete(user)" class="text-error"
                          >Delete</a
                        >
                      </li>
                      <li v-else>
                        <a @click="confirmRestore(user)" class="text-success"
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
      </div>
    </div>

    <!-- Pagination -->
    <div class="join mt-4 justify-center">
      <button
        class="join-item btn"
        :disabled="currentPage <= 1"
        @click="currentPage--"
        :class="{ 'btn-disabled': currentPage <= 1 }"
      >
        « Prev
      </button>

      <button
        class="join-item btn"
        v-for="page in totalPages"
        :key="page"
        :class="{ 'btn-active': currentPage === page }"
        @click="currentPage = page"
      >
        {{ page }}
      </button>

      <button
        class="join-item btn"
        :disabled="currentPage >= totalPages"
        @click="currentPage++"
        :class="{ 'btn-disabled': currentPage >= totalPages }"
      >
        Next »
      </button>
    </div>
  </div>

  <!-- Universal Modal -->
  <dialog id="universal_modal" class="modal">
    <div :class="[
      'modal-box transition-colors duration-300',
      themeStore.themeClasses.modal
    ]">
      <!-- Edit Modal Content -->
      <template v-if="modal.type === 'edit'">
        <h3 class="text-lg font-bold mb-4">Edit User</h3>
        <form @submit.prevent="handleModalAction">
          <div class="grid grid-cols-1 gap-4">
            <div class="form-control">
              <label class="label"><span class="label-text">Name</span></label>
              <input
                v-model="modal.data.name"
                type="text"
                class="input input-bordered w-full"
                required
              />
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text">Email</span></label>
              <input
                v-model="modal.data.email"
                type="email"
                class="input input-bordered w-full"
                required
              />
            </div>

            <div class="form-control">
              <label class="label"
                ><span class="label-text">Department</span></label
              >
              <select
                v-model="modal.data.department"
                class="select select-bordered w-full"
              >
                <option value="">Choose Department</option>
                <option value="Human Resource">Human Resource</option>
                <option value="Finance">Finance</option>
                <option value="Supply Chain">Supply Chain</option>
                <option value="Production">Production</option>
                <option value="Customer Relationship">
                  Customer Relationship
                </option>
                <option value="Admin">Admin</option>
              </select>
              <div class="label" v-if="modal.data.department">
                <span class="label-text-alt text-gray-500">
                  Available roles for {{ modal.data.department }}:
                  {{
                    editAvailableRoles.map((r) => r.role).join(', ') || 'None'
                  }}
                </span>
              </div>
            </div>

            <div class="form-control">
              <label class="label"><span class="label-text">Role</span></label>
              <select
                v-model="modal.data.role_id"
                class="select select-bordered w-full"
                :disabled="!modal.data.department"
              >
                <option value="">
                  {{
                    modal.data.department
                      ? 'Choose Role'
                      : 'Select Department First'
                  }}
                </option>
                <option
                  v-for="role in editAvailableRoles"
                  :key="role.role_id"
                  :value="role.role_id"
                >
                  {{ role.role }}
                </option>
              </select>
            </div>
          </div>

          <div class="modal-action">
            <button type="submit" class="btn bg-primaryColor text-white hover:bg-primaryColor/80 border-none" :disabled="loading">
              {{ loading ? 'Saving...' : 'Save' }}
            </button>
            <button type="button" class="btn" @click="closeModal">
              Cancel
            </button>
          </div>
        </form>
      </template>

      <!-- Delete Modal Content -->
      <template v-if="modal.type === 'delete'">
        <h3 class="text-lg font-bold mb-4">Delete User</h3>
        <p>
          Are you sure you want to delete <strong>{{ modal.user?.name }}</strong
          >?
        </p>
        <p class="text-sm text-gray-500 mt-2">
          This action can be undone by restoring the user later.
        </p>
        <div class="modal-action">
          <button
            type="button"
            class="btn btn-error"
            @click="handleModalAction"
            :disabled="loading"
          >
            {{ loading ? 'Deleting...' : 'Delete' }}
          </button>
          <button type="button" class="btn" @click="closeModal">Cancel</button>
        </div>
      </template>

      <!-- Restore Modal Content -->
      <template v-if="modal.type === 'restore'">
        <h3 class="text-lg font-bold mb-4">Restore User</h3>
        <p>
          Are you sure you want to restore
          <strong>{{ modal.user?.name }}</strong
          >?
        </p>
        <p class="text-sm text-gray-500 mt-2">
          This will make the user active again.
        </p>
        <div class="modal-action">
          <button
            type="button"
            class="btn btn-success"
            @click="handleModalAction"
            :disabled="loading"
          >
            {{ loading ? 'Restoring...' : 'Restore' }}
          </button>
          <button type="button" class="btn" @click="closeModal">Cancel</button>
        </div>
      </template>
    </div>
  </dialog>
</template>

<script setup>
  import { ref, onMounted, computed, watch } from 'vue';
  import { useUserStore } from '../stores/userStore';
  import { useRoleStore } from '../stores/roleStore';
  import { useThemeStore } from '../stores/themeStore';
  import { storeToRefs } from 'pinia';

  // Stores
  const userStore = useUserStore();
  const roleStore = useRoleStore();
  const themeStore = useThemeStore();

  const { users, loading, error, userCount, hasUsers, deletedUsers } =
    storeToRefs(userStore);
  const { roles } = storeToRefs(roleStore);

  const {
    fetchUsers,
    createUser,
    deleteUser,
    clearError,
    restoreUser,
    updateUser,
  } = userStore;

  const { fetchRoles } = roleStore;

  // Local state
  const currentPage = ref(1);
  const itemsPerPage = ref(5);
  const showDeleted = ref(false);

  // Modal state
  const modal = ref({
    type: null,
    show: false,
    user: null,
    data: { name: '', email: '', role_id: '', department: '' },
  });

  // New user form
  const newUser = ref({
    name: '',
    email: '',
    role_id: '',
    department: '',
  });

  // Computed - Filter roles based on selected department for new user form
  const availableRoles = computed(() => {
    if (!newUser.value.department) {
      return [];
    }
    return roles.value.filter(
      (role) => !role.deleted_at && role.department === newUser.value.department
    );
  });

  // Computed - Filter roles based on selected department for edit modal
  const editAvailableRoles = computed(() => {
    if (!modal.value.data.department) {
      return [];
    }
    return roles.value.filter(
      (role) =>
        !role.deleted_at && role.department === modal.value.data.department
    );
  });

  // Watch for department changes in new user form
  watch(
    () => newUser.value.department,
    (newDepartment) => {
      // Reset role selection when department changes
      newUser.value.role_id = '';
    }
  );

  // Watch for department changes in edit modal
  watch(
    () => modal.value.data.department,
    (newDepartment) => {
      // Reset role selection if the current selected role is not available in the new department
      if (
        !editAvailableRoles.value.some(
          (role) => role.role_id === modal.value.data.role_id
        )
      ) {
        modal.value.data.role_id = '';
      }
    }
  );

  const filteredUsers = computed(() => {
    const list = users.value || [];
    return showDeleted.value
      ? list.filter((user) => user.deleted_at)
      : list.filter((user) => !user.deleted_at);
  });

  const sortedUsers = computed(() => {
    return [...filteredUsers.value].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  });

  const paginatedUsers = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return sortedUsers.value.slice(start, start + itemsPerPage.value);
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredUsers.value.length / itemsPerPage.value);
  });

  // Modal methods
  const openModal = (type, user = null) => {
    modal.value = {
      type,
      show: true,
      user,
      data: user
        ? {
            name: user.name,
            email: user.email,
            role_id: user.role_id || '',
            department: user.department || '',
          }
        : { name: '', email: '', role_id: '', department: '' },
    };
    document.getElementById('universal_modal').showModal();
  };

  const closeModal = () => {
    document.getElementById('universal_modal').close();
    modal.value = {
      type: null,
      show: false,
      user: null,
      data: { name: '', email: '', role_id: '', department: '' },
    };
  };

  const handleModalAction = async () => {
    try {
      switch (modal.value.type) {
        case 'edit':
          await updateUser(modal.value.user.id, modal.value.data);
          break;
        case 'delete':
          await deleteUser(modal.value.user.id);
          break;
        case 'restore':
          await restoreUser(modal.value.user.id);
          break;
      }
      closeModal();
      await fetchUsers(showDeleted.value);
    } catch (err) {
      // Error handled by store
    }
  };

  // Action methods
  const editUser = (user) => openModal('edit', user);
  const confirmDelete = (user) => openModal('delete', user);
  const confirmRestore = (user) => openModal('restore', user);

  // Form methods
  const handleCreateUser = async () => {
    try {
      await createUser({
        ...newUser.value,
        role_id: newUser.value.role_id || null,
      });
      newUser.value = { name: '', email: '', role_id: '', department: '' };
      await fetchUsers(showDeleted.value);
    } catch (err) {
      // Error is handled by the store
    }
  };

  const toggleDeletedUsers = async () => {
    showDeleted.value = !showDeleted.value;
    await fetchUsers(showDeleted.value);
    currentPage.value = 1;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Load data on component mount
  onMounted(async () => {
    await Promise.all([fetchUsers(true), fetchRoles()]);
  });
</script>
