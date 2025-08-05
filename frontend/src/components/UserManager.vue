<template>
  <div class="container mx-auto p-6 max-w-4xl">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-primary mb-2">User Management</h1>
      <p class="text-base-content/70">Manage users with Pinia + Tailwind + Daisy UI</p>
    </div>

    <!-- Stats -->
    <div class="stats shadow w-full mb-6">
      <div class="stat">
        <div class="stat-figure text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
          </svg>
        </div>
        <div class="stat-title">Total Users</div>
        <div class="stat-value text-primary">{{ userCount }}</div>
        <div class="stat-desc">{{ hasUsers ? 'Users registered' : 'No users yet' }}</div>
      </div>
      
      <div class="stat">
        <div class="stat-figure text-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-8 h-8 stroke-current">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
        <div class="stat-title">Status</div>
        <div class="stat-value text-secondary">{{ loading ? 'Loading...' : 'Ready' }}</div>
        <div class="stat-desc">{{ loading ? 'Please wait' : 'System operational' }}</div>
      </div>
    </div>

    <!-- Error Alert -->
    <div v-if="error" class="alert alert-error mb-6">
      <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{{ error }}</span>
      <div>
        <button class="btn btn-sm btn-outline" @click="clearError">Dismiss</button>
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
              <svg v-if="!loading" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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
          <button 
            class="btn btn-outline btn-sm" 
            @click="fetchUsers"
            :class="{ loading: loading }"
            :disabled="loading"
          >
            <svg v-if="!loading" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        <div v-if="loading && !hasUsers" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="!hasUsers" class="text-center py-8">
          <div class="text-6xl mb-4">👥</div>
          <h3 class="text-lg font-semibold mb-2">No users found</h3>
          <p class="text-base-content/70">Add your first user using the form above.</p>
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
              <tr v-for="user in users" :key="user.id">
                <th>{{ user.id }}</th>
                <td>
                  <div class="flex items-center space-x-3">
                    <div class="avatar placeholder">
                      <div class="bg-neutral-focus text-neutral-content rounded-full w-8">
                        <span class="text-xs">{{ user.name.charAt(0).toUpperCase() }}</span>
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
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01" />
                      </svg>
                    </label>
                    <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                      <li><a @click="editUser(user)">Edit</a></li>
                      <li><a @click="confirmDelete(user)" class="text-error">Delete</a></li>
                    </ul>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '../stores/userStore'
import { storeToRefs } from 'pinia'

// Pinia store
const userStore = useUserStore()
const { users, loading, error, userCount, hasUsers } = storeToRefs(userStore)
const { fetchUsers, createUser, deleteUser, clearError } = userStore

// Local state
const newUser = ref({
  name: '',
  email: ''
})

// Methods
const handleCreateUser = async () => {
  try {
    await createUser(newUser.value)
    newUser.value = { name: '', email: '' }
  } catch (err) {
    // Error is handled by the store
  }
}

const confirmDelete = async (user) => {
  if (confirm(`Are you sure you want to delete ${user.name}?`)) {
    try {
      await deleteUser(user.id)
    } catch (err) {
      // Error is handled by the store
    }
  }
}

const editUser = (user) => {
  // TODO: Implement edit functionality
  console.log('Edit user:', user)
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString()
}

// Load users on component mount
onMounted(() => {
  fetchUsers()
})
</script>