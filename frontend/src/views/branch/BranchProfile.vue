<script setup>
  import { ref, computed, onMounted } from 'vue';
  import {
    UserCircle,
    Edit,
    Save,
    X,
    Eye,
    EyeOff,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Badge,
    Clock,
    Building2,
    Shield,
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { useAuthStore } from '../../stores/authStore';

  const branchContextStore = useBranchContextStore();
  const authStore = useAuthStore();

  // Local state
  const loading = ref(false);
  const editMode = ref(false);
  const showPasswordSection = ref(false);

  // Profile data
  const profileData = ref({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    hire_date: '',
    employee_id: '',
    role: '',
    department: '',
    last_login: '',
    profile_picture: null,
  });

  // Edit form data
  const editForm = ref({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
  });

  // Password change form
  const passwordForm = ref({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Toast state
  const toast = ref({ show: false, type: 'success', message: '' });

  // Computed
  const currentBranch = computed(() => branchContextStore.currentBranch);
  const user = computed(() => authStore.user);

  const profileInitials = computed(() => {
    if (profileData.value.first_name && profileData.value.last_name) {
      return (
        profileData.value.first_name.charAt(0) +
        profileData.value.last_name.charAt(0)
      );
    }
    return 'U';
  });

  const canEditProfile = computed(() => true); // All users can edit their own profile

  // Methods
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };

  const loadProfileData = async () => {
    loading.value = true;

    try {
      // TODO: Fetch real profile data from API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock data based on user
      profileData.value = {
        first_name: user.value?.name?.split(' ')[0] || 'John',
        last_name: user.value?.name?.split(' ')[1] || 'Doe',
        email: user.value?.email || 'john.doe@branch.com',
        phone: '+63 912 345 6789',
        address: '123 Main Street, Quezon City, Metro Manila',
        hire_date: '2023-06-15',
        employee_id: 'EMP001',
        role: user.value?.role || 'Employee',
        department: user.value?.department || 'Branch',
        last_login: '2024-01-15T14:30:00Z',
        profile_picture: null,
      };

      // Initialize edit form
      editForm.value = {
        first_name: profileData.value.first_name,
        last_name: profileData.value.last_name,
        phone: profileData.value.phone,
        address: profileData.value.address,
      };
    } catch (error) {
      console.error('Error loading profile data:', error);
      showToast('error', 'Failed to load profile data');
    } finally {
      loading.value = false;
    }
  };

  const toggleEditMode = () => {
    if (editMode.value) {
      // Cancel edit
      editForm.value = {
        first_name: profileData.value.first_name,
        last_name: profileData.value.last_name,
        phone: profileData.value.phone,
        address: profileData.value.address,
      };
    }
    editMode.value = !editMode.value;
  };

  const saveProfile = async () => {
    loading.value = true;

    try {
      // TODO: Save profile data to API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update profile data
      Object.assign(profileData.value, editForm.value);

      editMode.value = false;
      showToast('success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('error', 'Failed to update profile');
    } finally {
      loading.value = false;
    }
  };

  const changePassword = async () => {
    if (
      passwordForm.value.new_password !== passwordForm.value.confirm_password
    ) {
      showToast('error', 'New passwords do not match');
      return;
    }

    if (passwordForm.value.new_password.length < 8) {
      showToast('error', 'Password must be at least 8 characters long');
      return;
    }

    loading.value = true;

    try {
      // TODO: Change password via API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Reset form
      passwordForm.value = {
        current_password: '',
        new_password: '',
        confirm_password: '',
      };

      showPasswordSection.value = false;
      showToast('success', 'Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      showToast('error', 'Failed to change password');
    } finally {
      loading.value = false;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Initialize
  onMounted(() => {
    loadProfileData();
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-primaryColor">Employee Profile</h1>
        <p class="text-gray-600 mt-1">
          {{ currentBranch?.name }} - Personal Information
        </p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="text-center">
        <div class="loading loading-spinner loading-lg text-primaryColor"></div>
        <p class="mt-2 text-gray-600">Loading profile...</p>
      </div>
    </div>

    <div v-else class="space-y-6">
      <!-- Profile Card -->
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between mb-6">
            <h2 class="card-title text-primaryColor">
              <UserCircle class="w-5 h-5" />
              Personal Information
            </h2>
            <button
              v-if="canEditProfile"
              @click="toggleEditMode"
              :class="[
                'btn btn-sm',
                editMode
                  ? 'btn-ghost'
                  : 'btn-outline text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white',
              ]"
            >
              <X v-if="editMode" class="w-4 h-4 mr-1" />
              <Edit v-else class="w-4 h-4 mr-1" />
              {{ editMode ? 'Cancel' : 'Edit Profile' }}
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Profile Picture Section -->
            <div class="text-center">
              <div
                class="w-32 h-32 bg-primaryColor text-white rounded-full flex items-center justify-center text-4xl font-bold mx-auto mb-4"
              >
                {{ profileInitials }}
              </div>
              <h3 class="text-xl font-semibold">
                {{ profileData.first_name }} {{ profileData.last_name }}
              </h3>
              <p class="text-gray-600">{{ profileData.role }}</p>
              <div class="badge badge-outline mt-2">
                {{ profileData.employee_id }}
              </div>
            </div>

            <!-- Personal Details -->
            <div class="lg:col-span-2 space-y-4">
              <!-- Name Fields -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">First Name</span>
                  </label>
                  <input
                    v-if="editMode"
                    v-model="editForm.first_name"
                    type="text"
                    class="input input-bordered"
                    required
                  />
                  <div v-else class="p-3 bg-gray-50 rounded-lg">
                    {{ profileData.first_name }}
                  </div>
                </div>

                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Last Name</span>
                  </label>
                  <input
                    v-if="editMode"
                    v-model="editForm.last_name"
                    type="text"
                    class="input input-bordered"
                    required
                  />
                  <div v-else class="p-3 bg-gray-50 rounded-lg">
                    {{ profileData.last_name }}
                  </div>
                </div>
              </div>

              <!-- Contact Information -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Email Address</span>
                </label>
                <div class="p-3 bg-gray-50 rounded-lg flex items-center">
                  <Mail class="w-4 h-4 text-gray-400 mr-2" />
                  {{ profileData.email }}
                  <div class="badge badge-ghost badge-sm ml-2">Read Only</div>
                </div>
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Phone Number</span>
                </label>
                <input
                  v-if="editMode"
                  v-model="editForm.phone"
                  type="tel"
                  class="input input-bordered"
                />
                <div v-else class="p-3 bg-gray-50 rounded-lg flex items-center">
                  <Phone class="w-4 h-4 text-gray-400 mr-2" />
                  {{ profileData.phone }}
                </div>
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Address</span>
                </label>
                <textarea
                  v-if="editMode"
                  v-model="editForm.address"
                  class="textarea textarea-bordered"
                  rows="3"
                ></textarea>
                <div v-else class="p-3 bg-gray-50 rounded-lg flex items-start">
                  <MapPin class="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                  {{ profileData.address }}
                </div>
              </div>

              <!-- Save Button (Edit Mode) -->
              <div v-if="editMode" class="flex justify-end space-x-2 pt-4">
                <button
                  @click="saveProfile"
                  :disabled="loading"
                  class="btn bg-primaryColor text-white hover:bg-primaryColor/80"
                >
                  <Save class="w-4 h-4 mr-1" />
                  {{ loading ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Work Information -->
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <h2 class="card-title text-primaryColor mb-4">
            <Building2 class="w-5 h-5" />
            Work Information
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center mb-2">
                <Badge class="w-4 h-4 text-gray-400 mr-2" />
                <span class="text-sm font-medium text-gray-600"
                  >Employee ID</span
                >
              </div>
              <p class="font-semibold">{{ profileData.employee_id }}</p>
            </div>

            <div class="p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center mb-2">
                <Shield class="w-4 h-4 text-gray-400 mr-2" />
                <span class="text-sm font-medium text-gray-600">Role</span>
              </div>
              <p class="font-semibold">{{ profileData.role }}</p>
            </div>

            <div class="p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center mb-2">
                <Building2 class="w-4 h-4 text-gray-400 mr-2" />
                <span class="text-sm font-medium text-gray-600"
                  >Department</span
                >
              </div>
              <p class="font-semibold">{{ profileData.department }}</p>
            </div>

            <div class="p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center mb-2">
                <Calendar class="w-4 h-4 text-gray-400 mr-2" />
                <span class="text-sm font-medium text-gray-600">Hire Date</span>
              </div>
              <p class="font-semibold">
                {{ formatDate(profileData.hire_date) }}
              </p>
            </div>

            <div class="p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center mb-2">
                <Building2 class="w-4 h-4 text-gray-400 mr-2" />
                <span class="text-sm font-medium text-gray-600">Branch</span>
              </div>
              <p class="font-semibold">{{ currentBranch?.name }}</p>
            </div>

            <div class="p-4 bg-gray-50 rounded-lg">
              <div class="flex items-center mb-2">
                <Clock class="w-4 h-4 text-gray-400 mr-2" />
                <span class="text-sm font-medium text-gray-600"
                  >Last Login</span
                >
              </div>
              <p class="font-semibold">
                {{ formatDateTime(profileData.last_login) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Security Settings -->
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h2 class="card-title text-primaryColor">
              <Shield class="w-5 h-5" />
              Security Settings
            </h2>
            <button
              @click="showPasswordSection = !showPasswordSection"
              class="btn btn-sm btn-outline text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white"
            >
              {{ showPasswordSection ? 'Cancel' : 'Change Password' }}
            </button>
          </div>

          <div v-if="showPasswordSection" class="space-y-4 max-w-md">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Current Password</span>
              </label>
              <input
                v-model="passwordForm.current_password"
                type="password"
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">New Password</span>
              </label>
              <input
                v-model="passwordForm.new_password"
                type="password"
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Confirm New Password</span>
              </label>
              <input
                v-model="passwordForm.confirm_password"
                type="password"
                class="input input-bordered"
                required
              />
            </div>

            <div class="flex space-x-2 pt-2">
              <button
                @click="changePassword"
                :disabled="loading"
                class="btn bg-primaryColor text-white hover:bg-primaryColor/80"
              >
                {{ loading ? 'Changing...' : 'Change Password' }}
              </button>
              <button
                @click="showPasswordSection = false"
                class="btn btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>

          <div v-else class="text-gray-600">
            <p>
              Password was last changed on
              {{ formatDate(profileData.last_login) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast Notifications -->
    <div class="toast toast-end z-50">
      <div
        v-if="toast.show"
        :class="[
          'alert shadow-lg',
          toast.type === 'success'
            ? 'alert-success'
            : toast.type === 'error'
              ? 'alert-error'
              : toast.type === 'warning'
                ? 'alert-warning'
                : 'alert-info',
        ]"
      >
        <span>{{ toast.message }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* .card {
    @apply transition-shadow duration-200;
  }

  .card:hover {
    @apply shadow-xl;
  }

  .form-control .label {
    @apply pb-1;
  }

  .badge {
    @apply text-xs;
  } */

  .toast {
    z-index: 9999;
  }
</style>
