<template>
  <div class="container mx-auto p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-primaryColor mb-2">Branch Management</h1>
      <p class="text-base-content/70">
        Manage organization branches and locations
      </p>
    </div>

    <!-- Add Branch Button -->
    <div class="flex justify-end mb-6">
      <button @click="openCreateModal" class="btn bg-primaryColor text-white hover:bg-primaryColor/80 border-none">
        <Plus class="w-4 h-4 mr-2" />
        Add Branch
      </button>
    </div>

    <!-- Stats -->
    <div class="stats shadow w-full mb-6">
      <div class="stat">
        <div class="stat-figure text-primaryColor">
          <Building2 class="w-8 h-8" />
        </div>
        <div class="stat-title">Total Branches</div>
        <div class="stat-value text-primaryColor">{{ branchStats.total_branches }}</div>
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
        <button @click="loadBranches" class="btn btn-outline text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white">
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
                        class="toggle"
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
          <button v-if="!searchQuery" @click="openCreateModal" class="btn bg-primaryColor text-white hover:bg-primaryColor/80 border-none">
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

        <form @submit.prevent="submitBranch" class="space-y-6">
          <!-- Basic Information -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="form-control w-full">
              <label class="label pb-2">
                <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">Branch Name *</span>
              </label>
              <input
                v-model="branchForm.name"
                type="text"
                :class="[
                  'input input-bordered w-full transition-colors duration-300',
                  themeStore.themeClasses.input
                ]"
                placeholder="Enter branch name"
                required
              />
            </div>

            <div class="form-control w-full">
              <label class="label pb-2">
                <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">Branch Code *</span>
              </label>
              <input
                v-model="branchForm.code"
                type="text"
                :class="[
                  'input input-bordered w-full transition-colors duration-300',
                  themeStore.themeClasses.input
                ]"
                placeholder="Enter unique branch code"
                required
              />
            </div>
          </div>

          <!-- Contact Information -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="form-control w-full">
              <label class="label pb-2">
                <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">Phone</span>
              </label>
              <input
                v-model="branchForm.phone"
                type="tel"
                :class="[
                  'input input-bordered w-full transition-colors duration-300',
                  themeStore.themeClasses.input
                ]"
                placeholder="Enter phone number"
              />
            </div>

            <div class="form-control w-full">
              <label class="label pb-2">
                <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">Email</span>
              </label>
              <input
                v-model="branchForm.email"
                type="email"
                :class="[
                  'input input-bordered w-full transition-colors duration-300',
                  themeStore.themeClasses.input
                ]"
                placeholder="Enter email address"
              />
            </div>
          </div>

          <!-- Address -->
          <div class="form-control w-full">
            <label class="label pb-2">
              <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">Address *</span>
            </label>
            <div class="relative">
              <textarea
                v-model="branchForm.address"
                :class="[
                  'textarea textarea-bordered w-full transition-colors duration-300 pr-20',
                  themeStore.themeClasses.input
                ]"
                rows="3"
                placeholder="Enter branch address..."
                required
              ></textarea>
                        <button
            type="button"
            @click="openGoogleMaps"
            class="absolute top-2 right-2 btn btn-sm bg-blue-500 text-white hover:bg-blue-600 border-none"
            title="Open map to pin location"
          >
            🗺️ Map
          </button>
            </div>
          </div>

          <!-- Location Details -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="form-control w-full">
              <label class="label pb-2">
                <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">City</span>
              </label>
              <input
                v-model="branchForm.city"
                type="text"
                :class="[
                  'input input-bordered w-full transition-colors duration-300',
                  themeStore.themeClasses.input
                ]"
                placeholder="Enter city"
              />
            </div>

            <div class="form-control w-full">
              <label class="label pb-2">
                <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">State/Province</span>
              </label>
              <input
                v-model="branchForm.state"
                type="text"
                :class="[
                  'input input-bordered w-full transition-colors duration-300',
                  themeStore.themeClasses.input
                ]"
                placeholder="Enter state/province"
              />
            </div>

            <div class="form-control w-full">
              <label class="label pb-2">
                <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">Postal Code</span>
              </label>
              <input
                v-model="branchForm.postal_code"
                type="text"
                :class="[
                  'input input-bordered w-full transition-colors duration-300',
                  themeStore.themeClasses.input
                ]"
                placeholder="Enter postal code"
              />
            </div>

            <div class="form-control w-full">
              <label class="label pb-2">
                <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">Country</span>
              </label>
              <input
                v-model="branchForm.country"
                type="text"
                :class="[
                  'input input-bordered w-full transition-colors duration-300',
                  themeStore.themeClasses.input
                ]"
                placeholder="Enter country"
              />
            </div>
          </div>

          <!-- Manager Information -->
          <div :class="['divider font-medium', themeStore.themeClasses.textPrimary]">Manager Information</div>
          <div class="form-control w-full">
            <label class="label pb-2">
              <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">Select Manager</span>
            </label>
            <select
              v-model="branchForm.manager_id"
              @change="updateManagerInfo"
              :class="[
                'select select-bordered w-full transition-colors duration-300',
                themeStore.themeClasses.input
              ]"
            >
              <option value="">Choose a manager from users</option>
              <option 
                v-for="user in availableUsers" 
                :key="user.id" 
                :value="user.id"
              >
                {{ user.name }} - {{ user.email }} ({{ user.department || 'No Department' }})
              </option>
            </select>
            <div class="label" v-if="selectedManager">
              <span :class="['label-text-alt', themeStore.themeClasses.textMuted]">
                Selected: {{ selectedManager.name }} | {{ selectedManager.email }}
              </span>
            </div>
            <div class="label" v-else-if="branchForm.manager_id && !selectedManager">
              <span :class="['label-text-alt text-warning']">
                Warning: Selected manager (ID: {{ branchForm.manager_id }}) not found in users list
              </span>
            </div>
          </div>
          
          <!-- Display Selected Manager Info (Read-only) -->
          <div v-if="selectedManager" class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 p-4 rounded-lg border" :class="themeStore.themeClasses.borderLight">
            <div class="form-control w-full">
              <label class="label pb-2">
                <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">Manager Name</span>
              </label>
              <input
                :value="selectedManager.name"
                type="text"
                :class="[
                  'input input-bordered w-full transition-colors duration-300',
                  themeStore.isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'
                ]"
                readonly
              />
            </div>

            <div class="form-control w-full">
              <label class="label pb-2">
                <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">Manager Email</span>
              </label>
              <input
                :value="selectedManager.email"
                type="email"
                :class="[
                  'input input-bordered w-full transition-colors duration-300',
                  themeStore.isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'
                ]"
                readonly
              />
            </div>

            <div class="form-control w-full">
              <label class="label pb-2">
                <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">Department</span>
              </label>
              <input
                :value="selectedManager.department || 'No Department'"
                type="text"
                :class="[
                  'input input-bordered w-full transition-colors duration-300',
                  themeStore.isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'
                ]"
                readonly
              />
            </div>
          </div>

          <!-- Description -->
          <div class="form-control w-full">
            <label class="label pb-2">
              <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">Description</span>
            </label>
            <div class="relative">
              <textarea
                v-model="branchForm.description"
                :class="[
                  'textarea textarea-bordered w-full transition-colors duration-300',
                  themeStore.themeClasses.input
                ]"
                rows="3"
                placeholder="Optional description about this branch..."
              ></textarea>
              <button
                type="button"
                @click="correctDescription"
                :disabled="!branchForm.description || grammarLoading"
                class="absolute top-2 right-2 btn btn-xs bg-primaryColor text-white hover:bg-primaryColor/80 border-none"
                title="Auto Correction"
              >
                <span v-if="grammarLoading" class="loading loading-spinner loading-xs"></span>
                <span v-else>✓</span>
                Auto Correction
              </button>

            </div>
          </div>

          <!-- Status -->
          <div class="form-control w-full">
            <label class="cursor-pointer label justify-start gap-4 pt-2">
              <input
                v-model="branchForm.is_active"
                type="checkbox"
                class="toggle"
              />
              <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">Active Branch</span>
            </label>
          </div>

          <div class="modal-action">
            <button type="button" @click="closeModal" class="btn btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              class="btn bg-primaryColor text-white hover:bg-primaryColor/80 border-none"
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

    <!-- Google Maps Modal -->
    <dialog ref="googleMapsModal" class="modal">
      <div :class="['modal-box max-w-4xl', themeStore.themeClasses.modal]">
                    <h3 class="font-bold text-lg mb-4 text-primaryColor">🗺️ Location Picker (OpenStreetMap)</h3>
        
        <div class="mb-4">
          <label class="label pb-2">
            <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">Search Location</span>
          </label>
          <div class="flex gap-2 mb-3">
            <input
              v-model="locationSearch"
              :class="[
                'input input-bordered flex-1 transition-colors duration-300',
                themeStore.themeClasses.input
              ]"
              placeholder="Search for business location, landmark, or address..."
              @keyup.enter="searchLocation"
            />
            <button
              @click="searchLocation"
              class="btn btn-sm bg-blue-500 text-white hover:bg-blue-600 border-none"
            >
              🔍 Search
            </button>
            <button
              @click="getCurrentLocation"
              class="btn btn-sm bg-green-500 text-white hover:bg-green-600 border-none"
              title="Get your current location"
            >
              📍 Current
            </button>
          </div>
          
          <!-- Embedded Google Maps -->
          <div class="relative">
            <div 
              ref="mapContainer" 
              class="w-full h-80 bg-gray-200 rounded-lg border-2 border-gray-300 overflow-hidden"
            >
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-center text-gray-600">
                  <div class="text-4xl mb-2">🗺️</div>
                  <p class="font-medium">Map will load here</p>
                  <p class="text-sm">Search for a location to see the map</p>
                </div>
              </div>
            </div>
            
            <!-- Map Controls Overlay -->
            <div class="absolute top-2 right-2 flex flex-col gap-2">
              <button
                @click="centerMap"
                class="btn btn-xs bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 shadow-md"
                title="Center map"
              >
                🎯
              </button>
              <button
                @click="zoomIn"
                class="btn btn-xs bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 shadow-md"
                title="Zoom in"
              >
                ➕
              </button>
              <button
                @click="zoomOut"
                class="btn btn-xs bg-white text-gray-700 hover:bg-gray-100 border border-gray-300 shadow-md"
                title="Zoom out"
              >
                ➖
              </button>
            </div>
          </div>
        </div>

        <div class="mb-4">
          <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 class="font-medium mb-2 text-blue-800">📍 How to Use the Map:</h4>
            <ol class="list-decimal list-inside space-y-1 text-sm text-blue-700">
              <li>Search for your branch location above</li>
              <li>Click on the exact spot on the map</li>
              <li>The address will automatically appear below</li>
              <li>Click "Apply Address" to use this location</li>
            </ol>
          </div>
        </div>

        <div class="mb-4">
          <label class="label pb-2">
            <span :class="['label-text font-medium', themeStore.themeClasses.textSecondary]">Selected Address</span>
          </label>
          <textarea
            v-model="selectedAddress"
            :class="[
              'textarea textarea-bordered w-full transition-colors duration-300',
              themeStore.themeClasses.input
            ]"
            rows="3"
            placeholder="Paste the address from Google Maps here..."
          ></textarea>
        </div>

        <div class="modal-action">
          <button 
            class="btn btn-outline font-thin btn-sm text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white" 
            @click="closeGoogleMapsModal"
          >
            Cancel
          </button>
          <button 
            class="btn btn-sm bg-blue-500 text-white hover:bg-blue-600 border-none" 
            @click="applySelectedAddress"
            :disabled="!selectedAddress.trim()"
          >
            ✅ Apply Address
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" @click="closeGoogleMapsModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBranchStore } from '../stores/branchStore'
import { useUserStore } from '../stores/userStore'
import { useThemeStore } from '../stores/themeStore'
import { openaiService } from '../services/openaiService'
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
const userStore = useUserStore()
const themeStore = useThemeStore()

// Reactive data
const searchQuery = ref('')
const statusFilter = ref('all')
const editingBranch = ref(null)
const selectedBranch = ref(null)
const branchUsers = ref([])
const grammarLoading = ref(false)

// Modal refs
const branchModal = ref(null)
const usersModal = ref(null)
const googleMapsModal = ref(null)

// OpenStreetMap (Leaflet) related data
const locationSearch = ref('')
const selectedAddress = ref('')
const mapContainer = ref(null)
const map = ref(null)
const marker = ref(null)

// Statistics
const branchStats = computed(() => branchStore.stats)

// Form data
const branchForm = ref({
  name: '',
  code: '',
  address: '',
  phone: '',
  email: '',
  manager_id: '',
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

// User-related computed properties
const availableUsers = computed(() => {
  return userStore.users.filter(user => !user.deleted_at)
})

const selectedManager = computed(() => {
  if (!branchForm.value.manager_id) return null
  return availableUsers.value.find(user => user.id == branchForm.value.manager_id)
})

// Methods
const updateManagerInfo = () => {
  // This method is called when manager selection changes
  // The selectedManager computed property will automatically update
}

const loadUsers = async () => {
  try {
    await userStore.fetchUsers(true)
  } catch (error) {
    console.error('Failed to load users:', error)
  }
}

// AI-powered grammar correction function for description
const correctDescription = async () => {
  if (!branchForm.value.description?.trim()) return;
  
  grammarLoading.value = true;
  try {
    // Try OpenAI first
    try {
      const correctedText = await openaiService.correctGrammar(
        branchForm.value.description,
        'branch'
      );
      
      branchForm.value.description = correctedText;
      console.log('✨ OpenAI AI grammar correction applied successfully!');
      return;
      
    } catch (openaiError) {
      console.log('🤖 OpenAI correction failed, trying LanguageTool:', openaiError.message);
      
      // Try LanguageTool as second option
      try {
        const correctedText = await openaiService.correctGrammarWithLanguageTool(
          branchForm.value.description
        );
        
        branchForm.value.description = correctedText;
        console.log('🔧 LanguageTool grammar correction applied successfully!');
        
        // Show user feedback about LanguageTool
        alert('🔧 OpenAI unavailable. Applied LanguageTool correction instead.');
        return;
        
      } catch (languageToolError) {
        console.log('🔧 LanguageTool correction failed, using local fallback:', languageToolError.message);
        
                // Final fallback to local correction
        let correctedText = branchForm.value.description;
        
        // Basic cleanup and improvements
        correctedText = correctedText
          .replace(/\s+/g, ' ') // Multiple spaces to single
          .trim()
          // Fix spacing around punctuation
          .replace(/\s+([,.!?;:)])/g, '$1')
          .replace(/([,.!?;:])\s*([a-zA-Z])/g, '$1 $2')
          .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
          // Fix quotes and apostrophes
          .replace(/\s*[""]\s*/g, '"')
          .replace(/\s*['']\s*/g, "'")
          .replace(/(\w)\s+'\s*(\w)/g, "$1'$2")
          // Capitalization
          .replace(/^[a-z]/, match => match.toUpperCase())
          .replace(/([.!?]\s+)([a-z])/g, (match, punct, letter) => punct + letter.toUpperCase())
          .replace(/\bi\b/g, 'I')
          // Common contractions
          .replace(/\bcan\s*t\b/gi, "can't")
          .replace(/\bdon\s*t\b/gi, "don't")
          .replace(/\bwon\s*t\b/gi, "won't")
          .replace(/\bit\s*s\b/gi, "it's")
          .replace(/\byou\s*re\b/gi, "you're")
          // Common mistakes
          .replace(/\ba\s+([aeiouAEIOU])/g, 'an $1')
          .replace(/\ban\s+([^aeiouAEIOU])/g, 'a $1')
          .replace(/\balot\b/gi, 'a lot')
          .replace(/\bteh\b/gi, 'the')
          // Business terms
          .replace(/\bcustomer\s+service\b/gi, 'customer service')
          .replace(/\bbranch\s+office\b/gi, 'branch office')
          .replace(/\batm\s+services?\b/gi, 'ATM services')
          // Final cleanup
          .replace(/\s+/g, ' ')
          .trim();
        
        // Smart sentence ending
        if (correctedText && !correctedText.match(/[.!?]$/)) {
          if (correctedText.length > 10 && 
              (correctedText.includes(' is ') || correctedText.includes(' provides ') || 
               correctedText.includes(' offers ') || correctedText.includes(' serves '))) {
            correctedText += '.';
          }
        }
        
        branchForm.value.description = correctedText;
        console.log('📝 Local fallback grammar correction applied successfully!');
        
        // Show user feedback about local fallback
        alert('📝 Both AI services unavailable. Applied local correction instead.');
      }
    }
    
  } catch (error) {
    console.error('Failed to correct description:', error);
    alert('Grammar correction failed. Please try again.');
  } finally {
    grammarLoading.value = false;
  }
}

  // Google Maps integration
  const openGoogleMaps = () => {
    // Pre-fill search with current address if available
    if (branchForm.value.address) {
      locationSearch.value = branchForm.value.address;
    }
    
    // Reset selected address
    selectedAddress.value = '';
    
    // Open the modal
    googleMapsModal.value.showModal();
    
    // Initialize map after modal opens
    setTimeout(() => {
      initMap();
    }, 100);
  };

  // Initialize OpenStreetMap with Leaflet
  const initMap = () => {
    if (!mapContainer.value || map.value) return;
    
    try {
      // Create map instance using Leaflet
      map.value = L.map(mapContainer.value).setView([14.5995, 120.9842], 12); // Default to Manila, Philippines
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map.value);
      
      // Add click listener to map
      map.value.on('click', (event) => {
        placeMarker(event.latlng);
      });
      
      // If there's a search query, search for it
      if (locationSearch.value.trim()) {
        searchLocation();
      }
      
    } catch (error) {
      console.error('Failed to initialize map:', error);
      // Fallback: show error message
      mapContainer.value.innerHTML = `
        <div class="flex items-center justify-center h-full bg-red-50 text-red-600">
          <div class="text-center">
            <div class="text-4xl mb-2">❌</div>
            <p class="font-medium">Map failed to load</p>
            <p class="text-sm">Please search manually or enter address directly</p>
          </div>
        </div>
      `;
    }
  };

  // Search location using Nominatim (OpenStreetMap geocoding)
  const searchLocation = async () => {
    if (!locationSearch.value.trim()) return;
    
    try {
      // Show loading state
      const loadingDiv = document.createElement('div');
      loadingDiv.innerHTML = `
        <div class="flex items-center justify-center h-full bg-blue-50 text-blue-600">
          <div class="text-center">
            <div class="loading loading-spinner loading-lg mb-2"></div>
            <p class="font-medium">Searching...</p>
          </div>
        </div>
      `;
      mapContainer.value.appendChild(loadingDiv);
      
      // Search using Nominatim API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch.value)}&limit=1&addressdetails=1`
      );
      
      if (response.ok) {
        const results = await response.json();
        
        if (results.length > 0) {
          const location = results[0];
          const lat = parseFloat(location.lat);
          const lon = parseFloat(location.lon);
          
          // Center map on search result
          map.value.setView([lat, lon], 16);
          
          // Place marker
          placeMarker({ lat, lng: lon });
          
          // Update selected address
          selectedAddress.value = location.display_name;
          
          // Auto-populate individual address fields
          if (location.address) {
            // Update form fields with parsed address components
            branchForm.value.city = location.address.city || location.address.town || location.address.village || location.address.county || '';
            branchForm.value.state = location.address.state || location.address.province || '';
            branchForm.value.postal_code = location.address.postcode || '';
            branchForm.value.country = location.address.country || '';
          }
          
          // Remove loading state
          mapContainer.value.removeChild(loadingDiv);
          
        } else {
          // Remove loading state
          mapContainer.value.removeChild(loadingDiv);
          alert(`Location not found: "${locationSearch.value}"\n\nPlease try a different search term or enter the address manually.`);
        }
      } else {
        throw new Error('Search request failed');
      }
      
    } catch (error) {
      console.error('Search failed:', error);
      alert(`Search failed: ${error.message}\n\nPlease try again or enter the address manually.`);
      
      // Remove loading state if it exists
      const loadingDiv = mapContainer.value.querySelector('.loading');
      if (loadingDiv) {
        mapContainer.value.removeChild(loadingDiv);
      }
    }
  };

  // Apply the selected address to the form
  const applySelectedAddress = () => {
    if (selectedAddress.value.trim()) {
      branchForm.value.address = selectedAddress.value.trim();
      
      // If we have individual address components, use them
      // (These are already populated by placeMarker function)
      // If not, try to parse the address manually
      if (!branchForm.value.city && selectedAddress.value.includes(',')) {
        const addressParts = selectedAddress.value.split(',').map(part => part.trim());
        
        // Simple parsing logic for common address formats
        if (addressParts.length >= 4) {
          // Format: Street, City, State, Postal Code, Country
          branchForm.value.city = addressParts[1] || '';
          branchForm.value.state = addressParts[2] || '';
          branchForm.value.postal_code = addressParts[3] || '';
          branchForm.value.country = addressParts[4] || addressParts[addressParts.length - 1] || '';
        }
      }
      
      closeGoogleMapsModal();
      
      // Show success message
      alert('✅ Address and location details applied successfully!');
    }
  };

  // Close Google Maps modal
  const closeGoogleMapsModal = () => {
    googleMapsModal.value.close();
    locationSearch.value = '';
    selectedAddress.value = '';
    
    // Clean up map resources
    if (marker.value) {
      map.value?.removeLayer(marker.value);
      marker.value = null;
    }
    if (map.value) {
      map.value.remove();
      map.value = null;
    }
  };

  // Place marker on map and get address
  const placeMarker = async (latLng) => {
    if (!map.value) return;
    
    // Remove existing marker
    if (marker.value) {
      map.value.removeLayer(marker.value);
    }
    
    // Create new marker using Leaflet
    marker.value = L.marker([latLng.lat, latLng.lng], {
      draggable: true,
      title: 'Branch Location'
    }).addTo(map.value);
    
    // Get address for this location using reverse geocoding
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latLng.lat}&lon=${latLng.lng}&zoom=18&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.display_name) {
          selectedAddress.value = data.display_name;
          
          // Auto-populate individual address fields
          if (data.address) {
            // Update form fields with parsed address components
            branchForm.value.city = data.address.city || data.address.town || data.address.village || data.address.county || '';
            branchForm.value.state = data.address.state || data.address.province || '';
            branchForm.value.postal_code = data.address.postcode || '';
            branchForm.value.country = data.address.country || '';
          }
        } else {
          // Fallback to coordinates
          selectedAddress.value = `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`;
        }
      } else {
        // Fallback to coordinates
        selectedAddress.value = `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`;
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      // Fallback to coordinates
      selectedAddress.value = `${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`;
    }
    
    // Add drag listener to update address when marker is moved
    marker.value.on('dragend', (event) => {
      const newLatLng = event.target.getLatLng();
      placeMarker({ lat: newLatLng.lat, lng: newLatLng.lng });
    });
  };

  // Map control functions
  const centerMap = () => {
    if (marker.value && map.value) {
      const latLng = marker.value.getLatLng();
      map.value.setView(latLng, 16);
    }
  };

  const zoomIn = () => {
    if (map.value) {
      map.value.zoomIn();
    }
  };

  const zoomOut = () => {
    if (map.value) {
      map.value.zoomOut();
    }
  };

  // Get current location using GPS
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Please search manually.');
      return;
    }

    // Show loading state
    alert('📍 Getting your current location...\n\nPlease allow location access when prompted.');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Use reverse geocoding to get address from coordinates
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          
          if (response.ok) {
            const data = await response.json();
                          if (data.display_name) {
                selectedAddress.value = data.display_name;
                
                // Auto-populate individual address fields
                if (data.address) {
                  branchForm.value.city = data.address.city || data.address.town || data.address.village || data.address.county || '';
                  branchForm.value.state = data.address.state || data.address.province || '';
                  branchForm.value.postal_code = data.address.postcode || '';
                  branchForm.value.country = data.address.country || '';
                }
                
                // Center map on current location
                if (map.value) {
                  const latLng = { lat: latitude, lng: longitude };
                  map.value.setView([latitude, longitude], 16);
                  placeMarker(latLng);
                }
                
                alert(`📍 Location found!\n\nCoordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\nAddress: ${data.display_name}\n\nClick "Apply Address" to use this location.`);
              } else {
                throw new Error('No address found for this location');
              }
          } else {
            throw new Error('Failed to get address from coordinates');
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
          // Fallback: just show coordinates
          selectedAddress.value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          
          // Center map on coordinates
          if (map.value) {
            const latLng = { lat: latitude, lng: longitude };
            map.value.setView([latitude, longitude], 16);
            placeMarker(latLng);
          }
          
          alert(`📍 Location found!\n\nCoordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n\nPlease manually enter the address or search for nearby landmarks.`);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Failed to get your location.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location access or search manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable. Please search manually.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again or search manually.';
            break;
        }
        
        alert(`❌ ${errorMessage}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Enhanced address validation with coordinates
  const validateAddress = (address) => {
    if (!address || address.trim().length < 10) {
      return 'Address must be at least 10 characters long';
    }
    
    // Check for common address patterns
    const addressPattern = /^[\w\s,.-]+,\s*[\w\s,.-]+,\s*[\w\s+.-]+$/;
    if (!addressPattern.test(address)) {
      return 'Please use format: Street, City, State/Province';
    }
    
    return null; // Valid
  };


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
  // Copy branch data but ensure manager_id is properly set
  const branchData = { ...branch }
  // If there's a manager_name but no manager_id, we need to find the user ID
  if (branchData.manager_name && !branchData.manager_id) {
    const manager = availableUsers.value.find(user => 
      user.name === branchData.manager_name && user.email === branchData.manager_email
    )
    if (manager) {
      branchData.manager_id = manager.id
    }
  }
  Object.assign(branchForm.value, branchData)
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
    manager_id: '',
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
  loadUsers()
})
</script>
