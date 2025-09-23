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
    Camera,
  } from 'lucide-vue-next';
  import { useBranchContextStore } from '../../stores/branchContextStore';
  import { useAuthStore } from '../../stores/authStore';

  const branchContextStore = useBranchContextStore();
  const authStore = useAuthStore();

  // Local state
  const loading = ref(false);
  const editMode = ref(false);
  const showPasswordSection = ref(false);
  const imageLoadError = ref(false);
  const uploadingImage = ref(false);
  const imageInput = ref(null);

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

  const profileImageUrl = computed(() => {
    if (imageLoadError.value) {
      console.log('Image load error is true, returning null');
      return null; // Don't show image if it failed to load
    }
    const url =
      profileData.value.profile_picture || user.value?.photo_url || null;
    console.log('Profile image URL computation:', {
      profile_picture: profileData.value.profile_picture,
      user_photo_url: user.value?.photo_url,
      final_url: url,
    });
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    // Handle relative URLs from the backend - images are served by backend on port 5000
    const backendOrigin = 'http://localhost:5000';
    const path = url.startsWith('/') ? url : `/${url}`;
    const fullUrl = `${backendOrigin}${path}`;
    console.log('Constructed full URL:', fullUrl);
    return fullUrl;
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
      // First, refresh user data in auth store to ensure we have the latest info
      await authStore.refreshUserData();

      // Fetch real profile data from API
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log(
        'Loading profile data with token:',
        token.substring(0, 20) + '...'
      );

      const response = await fetch('/api/employees/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Profile API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Profile API error response:', errorText);
        throw new Error(
          `Failed to fetch profile: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log('Profile API result:', result);

      if (!result.success) {
        throw new Error(result.message || 'Failed to load profile data');
      }

      const employee = result.data;
      console.log('Employee data received:', employee);

      // Map employee data to profile format
      profileData.value = {
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone: employee.phone_number || '',
        address: employee.address || '',
        hire_date: employee.created_at || '',
        employee_id: employee.employee_id || '',
        role: employee.role || 'Employee',
        department: employee.department || 'Branch',
        last_login: employee.last_login || '',
        profile_picture: employee.photo_url || null,
      };

      // Initialize edit form
      editForm.value = {
        first_name: profileData.value.first_name,
        last_name: profileData.value.last_name,
        phone: profileData.value.phone,
        address: profileData.value.address,
      };

      console.log('Profile data loaded successfully:', profileData.value);
      console.log('Profile image URL:', profileImageUrl.value);

      // Reset image error flag when new data is loaded
      imageLoadError.value = false;
    } catch (error) {
      console.error('Error loading profile data:', error);
      showToast('error', error.message || 'Failed to load profile data');

      // Fallback to user data from auth store if available
      if (user.value) {
        console.log('Using fallback data from auth store');
        profileData.value = {
          first_name: user.value.name?.split(' ')[0] || 'User',
          last_name: user.value.name?.split(' ')[1] || '',
          email: user.value.email || '',
          phone: '',
          address: '',
          hire_date: '',
          employee_id: user.value.employee_id || '',
          role: user.value.role || 'Employee',
          department: user.value.department || 'Branch',
          last_login: '',
          profile_picture: user.value.photo_url || null,
        };
      }
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
      // Save profile data to API
      const token = localStorage.getItem('token');
      const response = await fetch('/api/employees/me', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: editForm.value.first_name,
          last_name: editForm.value.last_name,
          phone_number: editForm.value.phone,
          address: editForm.value.address,
        }),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(
          errorResult.message ||
            `Failed to update profile: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to update profile');
      }

      // Update profile data with the response
      const employee = result.data;
      profileData.value = {
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone: employee.phone_number || '',
        address: employee.address || '',
        hire_date: employee.created_at || '',
        employee_id: employee.employee_id || '',
        role: employee.role || 'Employee',
        department: employee.department || 'Branch',
        last_login: employee.last_login || '',
        profile_picture: employee.photo_url || null,
      };

      editMode.value = false;
      showToast('success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('error', error.message || 'Failed to update profile');
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
      // Change password via API
      const token = localStorage.getItem('token');
      const response = await fetch('/api/employees/me/change-password', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordForm.value.current_password,
          new_password: passwordForm.value.new_password,
        }),
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(
          errorResult.message ||
            `Failed to change password: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to change password');
      }

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
      showToast('error', error.message || 'Failed to change password');
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

  const handleImageLoad = (event) => {
    console.log('Profile image loaded successfully:', event.target.src);
    // Reset error flag when image loads successfully
    imageLoadError.value = false;
  };

  const handleImageError = (event) => {
    console.warn('Profile image failed to load:', event.target.src);
    console.log('Setting imageLoadError to true');
    // Set the error flag to trigger fallback to initials
    imageLoadError.value = true;
  };

  const triggerImageUpload = () => {
    imageInput.value?.click();
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Image file size must be less than 5MB');
      return;
    }

    uploadingImage.value = true;

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/employees/me/upload-photo', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(
          errorResult.message ||
            `Failed to upload photo: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to upload photo');
      }

      // Update profile data with new photo URL
      profileData.value.profile_picture = result.data.photo_url;

      // Reset image error flag and refresh user data in auth store
      imageLoadError.value = false;
      await authStore.refreshUserData();

      showToast('success', 'Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      showToast('error', error.message || 'Failed to upload profile picture');
    } finally {
      uploadingImage.value = false;
      // Reset the file input
      if (imageInput.value) {
        imageInput.value.value = '';
      }
    }
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
              <div class="relative inline-block">
                <div
                  class="w-32 h-32 rounded-full overflow-hidden mx-auto mb-4 border-4 border-gray-200 cursor-pointer transition-colors duration-200"
                  @click="triggerImageUpload"
                  :class="{ 'opacity-50': uploadingImage }"
                >
                  <img
                    v-if="profileImageUrl && !imageLoadError"
                    :src="profileImageUrl"
                    :alt="`${profileData.first_name} ${profileData.last_name}`"
                    class="w-full h-full object-cover"
                    @load="handleImageLoad"
                    @error="handleImageError"
                  />
                  <div
                    v-else
                    class="w-full h-full text-white flex items-center justify-center text-4xl font-bold"
                  >
                    {{ profileInitials }}
                  </div>
                  <!-- Upload overlay -->
                  <div
                    v-if="uploadingImage"
                    class="absolute inset-0 bg-opacity-50 flex items-center justify-center rounded-full"
                  >
                    <div
                      class="loading loading-spinner loading-md text-white"
                    ></div>
                  </div>
                  <!-- Camera icon overlay - only show on hover -->
                  <div
                    v-else
                    class="absolute inset-0 bg-opacity-0 hover:bg-opacity-20 flex items-center justify-center rounded-full transition-all duration-200 group"
                  >
                    <Camera
                      class="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    />
                  </div>
                </div>
                <!-- Hidden file input -->
                <input
                  ref="imageInput"
                  type="file"
                  accept="image/*"
                  @change="handleImageUpload"
                  class="hidden"
                />
              </div>
              <p class="text-xs text-gray-500 mb-2">Click to upload photo</p>
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
