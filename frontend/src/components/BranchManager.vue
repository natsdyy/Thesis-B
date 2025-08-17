<template>
  <div class="container mx-auto p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-primary mb-2">Branch Management</h1>
      <p class="text-base-content/70">
        Manage organization branches and locations
      </p>
    </div>

    <!-- Add Branch Button -->
    <div class="flex justify-end mb-6">
      <button @click="openCreateModal" class="btn btn-primary">
        <Plus class="w-4 h-4 mr-2" />
        Add Branch
      </button>
    </div>

    <!-- Stats -->
    <div class="stats shadow w-full mb-6">
      <div class="stat">
        <div class="stat-figure text-primary">
          <Building2 class="w-8 h-8" />
        </div>
        <div class="stat-title">Total Branches</div>
        <div class="stat-value text-primary">{{ branchStats.total_branches }}</div>
        <div class="stat-desc">All branches</div>
      </div>

      <div class="stat">
        <div class="stat-figure text-success">
          <CheckCircle class="w-8 h-8" />
        </div>
        <div class="stat-title">Active</div>
        <div class="stat-value text-success">{{ branchStats.active_branches }}</div>
        <div class="stat-desc">Currently active</div>
      </div>

      <div class="stat">
        <div class="stat-figure text-warning">
          <XCircle class="w-8 h-8" />
        </div>
        <div class="stat-title">Inactive</div>
        <div class="stat-value text-warning">{{ branchStats.inactive_branches }}</div>
        <div class="stat-desc">Currently inactive</div>
      </div>

      <div class="stat">
        <div class="stat-figure text-secondary">
          <Users class="w-8 h-8" />
        </div>
        <div class="stat-title">Users</div>
        <div class="stat-value text-secondary">{{ branchStats.total_users_in_branches }}</div>
        <div class="stat-desc">Assigned to branches</div>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="flex flex-col md:flex-row gap-4 mb-6">
      <div class="flex-1">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40 w-4 h-4" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search branches by name, code, city, or manager..."
            class="input input-bordered w-full pl-10"
          />
        </div>
      </div>
      <div class="flex gap-2">
        <select v-model="statusFilter" class="select select-bordered">
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        <button @click="loadBranches" class="btn btn-outline">
          <RefreshCw class="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="branchStore.loading" class="flex justify-center items-center py-12">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <!-- Error State -->
    <div v-else-if="branchStore.error" class="alert alert-error mb-6">
      <AlertCircle class="w-6 h-6" />
      <span>{{ branchStore.error }}</span>
      <button @click="branchStore.clearError" class="btn btn-sm btn-ghost">
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Branches Table -->
    <div v-else :class="['card shadow-xl transition-colors duration-300', themeStore.themeClasses.cardBg]">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table :class="['table transition-colors duration-300', themeStore.isDarkMode ? 'table-zebra-dark' : 'table-zebra']">
            <thead>
              <tr>
                <th>Branch Info</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Manager</th>
                <th>Users</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="branch in filteredBranches" :key="branch.id">
                <td>
                  <div>
                    <div class="font-bold">{{ branch.name }}</div>
                    <div class="text-sm text-base-content/70">Code: {{ branch.code }}</div>
                    <div v-if="branch.description" class="text-xs text-base-content/50 mt-1">
                      {{ branch.description }}
                    </div>
                  </div>
                </td>
                <td>
                  <div class="text-sm">
                    <div v-if="branch.phone" class="flex items-center gap-1">
                      <Phone class="w-3 h-3" />
                      {{ branch.phone }}
                    </div>
                    <div v-if="branch.email" class="flex items-center gap-1">
                      <Mail class="w-3 h-3" />
                      {{ branch.email }}
                    </div>
                  </div>
                </td>
                <td>
                  <div class="text-sm">
                    <div class="flex items-center gap-1">
                      <MapPin class="w-3 h-3" />
                      <span>{{ formatAddress(branch) }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div v-if="branch.manager_name" class="text-sm">
                    <div class="font-medium">{{ branch.manager_name }}</div>
                    <div v-if="branch.manager_email" class="text-base-content/70">
                      {{ branch.manager_email }}
                    </div>
                  </div>
                  <div v-else class="text-base-content/50 text-sm">No manager assigned</div>
                </td>
                <td>
                  <div class="text-center">
                    <div class="badge badge-outline">{{ branch.user_count || 0 }}</div>
                  </div>
                </td>
                <td>
                  <div class="form-control">
                    <label class="cursor-pointer label">
                      <input
                        type="checkbox"
                        :checked="branch.is_active"
                        @change="toggleBranchStatus(branch.id)"
                        class="toggle toggle-primary"
                      />
                    </label>
                  </div>
                </td>
                <td>
                  <div class="flex gap-2">
                    <button
                      @click="viewBranchUsers(branch)"
                      class="btn btn-ghost btn-sm"
                      title="View Users"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                    <button
                      @click="editBranch(branch)"
                      class="btn btn-ghost btn-sm"
                      title="Edit Branch"
                    >
                      <Edit class="w-4 h-4" />
                    </button>
                    <button
                      @click="deleteBranch(branch)"
                      class="btn btn-ghost btn-sm text-error"
                      title="Delete Branch"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="filteredBranches.length === 0" class="text-center py-12">
          <Building2 class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 class="text-lg font-medium text-base-content/70 mb-2">No branches found</h3>
          <p class="text-base-content/50 mb-4">
            {{ searchQuery ? 'Try adjusting your search criteria' : 'Get started by creating your first branch' }}
          </p>
          <button v-if="!searchQuery" @click="openCreateModal" class="btn btn-primary">
            <Plus class="w-4 h-4 mr-2" />
            Add First Branch
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <dialog ref="branchModal" class="modal">
      <div :class="['modal-box w-11/12 max-w-4xl transition-colors duration-300', themeStore.themeClasses.modal]">
        <h3 class="font-bold text-lg mb-4">
          {{ editingBranch ? 'Edit Branch' : 'Create New Branch' }}
        </h3>

        <form @submit.prevent="submitBranch" class="space-y-4">
          <!-- Basic Information -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Branch Name *</span>
              </label>
              <input
                v-model="branchForm.name"
                type="text"
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Branch Code *</span>
              </label>
              <input
                v-model="branchForm.code"
                type="text"
                class="input input-bordered"
                required
              />
            </div>
          </div>

          <!-- Contact Information -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Phone</span>
              </label>
              <input
                v-model="branchForm.phone"
                type="tel"
                class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Email</span>
              </label>
              <input
                v-model="branchForm.email"
                type="email"
                class="input input-bordered"
              />
            </div>
          </div>

          <!-- Address -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Address *</span>
            </label>
            <textarea
              v-model="branchForm.address"
              class="textarea textarea-bordered"
              rows="2"
              required
            ></textarea>
          </div>

          <!-- Location Details -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">City</span>
              </label>
              <input
                v-model="branchForm.city"
                type="text"
                class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">State/Province</span>
              </label>
              <input
                v-model="branchForm.state"
                type="text"
                class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Postal Code</span>
              </label>
              <input
                v-model="branchForm.postal_code"
                type="text"
                class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Country</span>
              </label>
              <input
                v-model="branchForm.country"
                type="text"
                class="input input-bordered"
              />
            </div>
          </div>

          <!-- Manager Information -->
          <div class="divider">Manager Information</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Manager Name</span>
              </label>
              <input
                v-model="branchForm.manager_name"
                type="text"
                class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Manager Email</span>
              </label>
              <input
                v-model="branchForm.manager_email"
                type="email"
                class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Manager Phone</span>
              </label>
              <input
                v-model="branchForm.manager_phone"
                type="tel"
                class="input input-bordered"
              />
            </div>
          </div>

          <!-- Description -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Description</span>
            </label>
            <textarea
              v-model="branchForm.description"
              class="textarea textarea-bordered"
              rows="3"
              placeholder="Optional description about this branch..."
            ></textarea>
          </div>

          <!-- Status -->
          <div class="form-control">
            <label class="cursor-pointer label justify-start gap-4">
              <input
                v-model="branchForm.is_active"
                type="checkbox"
                class="toggle toggle-primary"
              />
              <span class="label-text">Active Branch</span>
            </label>
          </div>

          <div class="modal-action">
            <button type="button" @click="closeModal" class="btn btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="branchStore.loading"
            >
              <span v-if="branchStore.loading" class="loading loading-spinner loading-sm"></span>
              {{ editingBranch ? 'Update Branch' : 'Create Branch' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" @click="closeModal">close</button>
      </form>
    </dialog>

    <!-- Users Modal -->
    <dialog ref="usersModal" class="modal">
      <div :class="['modal-box w-11/12 max-w-2xl transition-colors duration-300', themeStore.themeClasses.modal]">
        <h3 class="font-bold text-lg mb-4">
          Users in {{ selectedBranch?.name }}
        </h3>

        <div v-if="branchUsers.length > 0" class="space-y-2">
          <div
            v-for="user in branchUsers"
            :key="user.id"
            class="flex items-center justify-between p-3 bg-base-200 rounded-lg"
          >
            <div>
              <div class="font-medium">{{ user.name }}</div>
              <div class="text-sm text-base-content/70">{{ user.email }}</div>
            </div>
            <div class="badge badge-outline">{{ user.role?.name || 'No Role' }}</div>
          </div>
        </div>

        <div v-else class="text-center py-8">
          <Users class="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <p class="text-base-content/70">No users assigned to this branch</p>
        </div>

        <div class="modal-action">
          <button @click="closeUsersModal" class="btn">Close</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" @click="closeUsersModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBranchStore } from '../stores/branchStore'
import { useThemeStore } from '../stores/themeStore'
import {
  Plus,
  Building2,
  CheckCircle,
  XCircle,
  Users,
  Search,
  RefreshCw,
  AlertCircle,
  X,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin
} from 'lucide-vue-next'

const branchStore = useBranchStore()
const themeStore = useThemeStore()

// Reactive data
const searchQuery = ref('')
const statusFilter = ref('all')
const editingBranch = ref(null)
const selectedBranch = ref(null)
const branchUsers = ref([])

// Modal refs
const branchModal = ref(null)
const usersModal = ref(null)

// Statistics
const branchStats = computed(() => branchStore.stats)

// Form data
const branchForm = ref({
  name: '',
  code: '',
  address: '',
  phone: '',
  email: '',
  manager_name: '',
  manager_email: '',
  manager_phone: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  is_active: true,
  description: ''
})

// Computed properties
const filteredBranches = computed(() => {
  let branches = branchStore.branches

  // Filter by status
  if (statusFilter.value === 'active') {
    branches = branches.filter(branch => branch.is_active)
  } else if (statusFilter.value === 'inactive') {
    branches = branches.filter(branch => !branch.is_active)
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    branches = branchStore.searchBranches(searchQuery.value)
  }

  return branches
})

// Methods
const loadBranches = async () => {
  try {
    await branchStore.fetchBranches(true)
    await branchStore.fetchBranchStats()
  } catch (error) {
    console.error('Failed to load branches:', error)
  }
}

const openCreateModal = () => {
  editingBranch.value = null
  resetForm()
  branchModal.value.showModal()
}

const editBranch = (branch) => {
  editingBranch.value = branch
  Object.assign(branchForm.value, { ...branch })
  branchModal.value.showModal()
}

const closeModal = () => {
  branchModal.value.close()
  resetForm()
}

const resetForm = () => {
  branchForm.value = {
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    manager_name: '',
    manager_email: '',
    manager_phone: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    is_active: true,
    description: ''
  }
}

const submitBranch = async () => {
  try {
    if (editingBranch.value) {
      await branchStore.updateBranch(editingBranch.value.id, branchForm.value)
    } else {
      await branchStore.createBranch(branchForm.value)
    }

    closeModal()
    await branchStore.fetchBranchStats()
  } catch (error) {
    console.error('Failed to save branch:', error)
  }
}

const deleteBranch = async (branch) => {
  if (confirm(`Are you sure you want to delete "${branch.name}"? This action cannot be undone.`)) {
    try {
      await branchStore.deleteBranch(branch.id)
      await branchStore.fetchBranchStats()
    } catch (error) {
      console.error('Failed to delete branch:', error)
    }
  }
}

const toggleBranchStatus = async (branchId) => {
  try {
    await branchStore.toggleBranchStatus(branchId)
    await branchStore.fetchBranchStats()
  } catch (error) {
    console.error('Failed to toggle branch status:', error)
  }
}

const viewBranchUsers = async (branch) => {
  selectedBranch.value = branch
  try {
    branchUsers.value = await branchStore.fetchBranchUsers(branch.id)
    usersModal.value.showModal()
  } catch (error) {
    console.error('Failed to fetch branch users:', error)
  }
}

const closeUsersModal = () => {
  usersModal.value.close()
  selectedBranch.value = null
  branchUsers.value = []
}

const formatAddress = (branch) => {
  const parts = [branch.city, branch.state, branch.country].filter(Boolean)
  return parts.join(', ') || 'Address not complete'
}

// Lifecycle
onMounted(() => {
  loadBranches()
})
</script>
