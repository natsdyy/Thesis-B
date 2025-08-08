<template>
  <div class="container mx-auto p-6 max-w-4xl">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-primary mb-2">User Management</h1>
      <p class="text-base-content/70">
        Manage users with Pinia + Tailwind + Daisy UI
      </p>
    </div>

    <!-- Stats -->
    <div class="stats shadow w-full mb-6">
      <div class="stat">
        <div class="stat-figure text-primary">
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
        <div class="stat-title" v-if="!showDeleted">Total Users</div>
        <div class="stat-title" v-else>Total Deleted Users</div>
        <div class="stat-value text-primary" v-if="!showDeleted">
          {{ userCount }}
        </div>
        <div class="stat-value text-primary" v-else>
          {{ deletedUsers.length }}
        </div>
        <div class="stat-desc">
          {{ hasUsers ? 'Users registered' : 'No users yet' }}
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
        <div class="stat-value text-secondary">
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

    <!-- Add User Form -->
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <h2 class="card-title">Add New User</h2>
        <form @submit.prevent="handleCreateUser" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Name</span>
            </label>
            <input
              v-model="newUser.name"
              type="text"
              placeholder="Enter full name"
              class="input input-bordered w-full"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Email</span>
            </label>
            <input
              v-model="newUser.email"
              type="email"
              placeholder="Enter email address"
              class="input input-bordered w-full"
              required
            />
          </div>

          <div class="card-actions justify-end">
            <button
              type="submit"
              class="btn btn-primary"
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
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h2 class="card-title">Users List</h2>
          <div class="flex gap-2">
            <button
              class="btn btn-outline btn-sm"
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
            <button class="btn btn-outline btn-sm" @click="toggleDeletedUsers">
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

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
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
    <div class="modal-box">
      <!-- Edit Modal Content -->
      <template v-if="modal.type === 'edit'">
        <h3 class="text-lg font-bold mb-4">Edit User</h3>
        <form @submit.prevent="handleModalAction">
          <div class="form-control mb-4">
            <label class="label"><span class="label-text">Name</span></label>
            <input
              v-model="modal.data.name"
              type="text"
              class="input input-bordered w-full"
              required
            />
          </div>
          <div class="form-control mb-4">
            <label class="label"><span class="label-text">Email</span></label>
            <input
              v-model="modal.data.email"
              type="email"
              class="input input-bordered w-full"
              required
            />
          </div>
          <div class="modal-action">
            <button type="submit" class="btn btn-primary" :disabled="loading">
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
  import { ref, onMounted, computed } from 'vue';
  import { useUserStore } from '../stores/userStore';
  import { storeToRefs } from 'pinia';

  // Pinia store
  const userStore = useUserStore();
  const { users, loading, error, userCount, hasUsers, deletedUsers } =
    storeToRefs(userStore);
  const {
    fetchUsers,
    createUser,
    deleteUser,
    clearError,
    restoreUser,
    updateUser,
  } = userStore;

  const currentPage = ref(1);
  const itemsPerPage = ref(5);
  const showDeleted = ref(false);

  // Replace all the modal refs with a single modal state
  const modal = ref({
    type: null, // 'edit', 'delete', 'restore'
    show: false,
    user: null,
    data: { name: '', email: '' },
  });

  // Simplified modal methods
  const openModal = (type, user = null) => {
    modal.value = {
      type,
      show: true,
      user,
      data: user
        ? { name: user.name, email: user.email }
        : { name: '', email: '' },
    };
    document.getElementById('universal_modal').showModal();
  };

  const closeModal = () => {
    document.getElementById('universal_modal').close();
    modal.value = {
      type: null,
      show: false,
      user: null,
      data: { name: '', email: '' },
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

  // Update the action methods
  const editUser = (user) => openModal('edit', user);
  const confirmDelete = (user) => openModal('delete', user);
  const confirmRestore = (user) => openModal('restore', user);

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

  // Local state
  const newUser = ref({
    name: '',
    email: '',
  });

  // Methods
  const handleCreateUser = async () => {
    try {
      await createUser(newUser.value);
      newUser.value = { name: '', email: '' };
    } catch (err) {
      // Error is handled by the store
    }
  };

  const handleUpdateUser = async () => {
    try {
      await updateUser(editUserData.value.id, {
        name: editUserData.value.name,
        email: editUserData.value.email,
      });
      closeEditModal();
      // Refresh the current view
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

  // Load users on component mount
  onMounted(() => {
    fetchUsers(true);
  });
</script>
