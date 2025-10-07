<template>
  <div class="space-y-6">
    <!-- Profile Header -->
    <div class="card bg-white shadow-xl border border-black/10">
      <div class="card-body">
        <h2 class="text-2xl font-bold text-primaryColor mb-2">
          Supplier Profile
        </h2>
        <p class="text-black/60">
          Manage your account information and settings
        </p>
      </div>
    </div>

    <!-- Profile Information -->
    <div class="card bg-white shadow-xl border border-black/10">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <h3 class="card-title text-xl text-primaryColor">
            Account Information
          </h3>
          <button
            v-if="!isEditingProfile"
            @click="startEditingProfile"
            class="btn btn-sm bg-primaryColor text-white hover:bg-primaryColor/90 border-none font-thin"
          >
            <Edit class="w-4 h-4 mr-2" />
            Edit Profile
          </button>
          <div v-else class="flex gap-2">
            <button
              @click="saveProfile"
              class="btn btn-sm bg-primaryColor text-white hover:bg-primaryColor/90 border-none font-thin"
              :disabled="loadingProfile"
            >
              <span
                v-if="loadingProfile"
                class="loading loading-spinner loading-sm"
              ></span>
              <CheckCircle v-else class="w-4 h-4" />
              Save Changes
            </button>
            <button
              @click="cancelEditingProfile"
              class="btn btn-sm bg-gray-200 text-black/50 hover:bg-gray-300 border-none font-thin"
              :disabled="loadingProfile"
            >
              <X class="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>

        <!-- Success Message -->
        <div v-if="profileSuccess" class="alert alert-success mb-4">
          <CheckCircle class="w-5 h-5" />
          <span>Profile updated successfully!</span>
        </div>

        <!-- Error Message -->
        <div v-if="profileError" class="alert alert-error mb-4">
          <XCircle class="w-5 h-5" />
          <span>{{ profileError }}</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Supplier Name -->
          <div>
            <label class="label">
              <span class="label-text text-black/70 font-medium"
                >Supplier Name <span class="text-red-500">*</span></span
              >
            </label>
            <input
              type="text"
              v-model="profileForm.name"
              :class="[
                'input input-bordered w-full',
                isEditingProfile ? 'bg-white' : 'bg-gray-50',
              ]"
              :readonly="!isEditingProfile"
              required
            />
          </div>

          <!-- Contact Person -->
          <div>
            <label class="label">
              <span class="label-text text-black/70 font-medium"
                >Contact Person <span class="text-red-500">*</span></span
              >
            </label>
            <input
              type="text"
              v-model="profileForm.contact_person"
              :class="[
                'input input-bordered w-full',
                isEditingProfile ? 'bg-white' : 'bg-gray-50',
              ]"
              :readonly="!isEditingProfile"
              required
            />
          </div>

          <!-- Email -->
          <div>
            <label class="label">
              <span class="label-text text-black/70 font-medium"
                >Email Address <span class="text-red-500">*</span></span
              >
            </label>
            <input
              type="email"
              v-model="profileForm.email"
              :class="[
                'input input-bordered w-full',
                isEditingProfile ? 'bg-white' : 'bg-gray-50',
              ]"
              :readonly="!isEditingProfile"
              required
            />
          </div>

          <!-- Phone -->
          <div>
            <label class="label">
              <span class="label-text text-black/70 font-medium"
                >Phone Number <span class="text-red-500">*</span></span
              >
            </label>
            <input
              type="text"
              v-model="profileForm.phone"
              :class="[
                'input input-bordered w-full',
                isEditingProfile ? 'bg-white' : 'bg-gray-50',
              ]"
              :readonly="!isEditingProfile"
              required
            />
          </div>

          <!-- Category -->
          <div>
            <label class="label">
              <span class="label-text text-black/70 font-medium">Category</span>
            </label>
            <input
              type="text"
              :value="supplierProfile.category"
              class="input input-bordered w-full bg-gray-50"
              readonly
            />
          </div>

          <!-- Status -->
          <div>
            <label class="label">
              <span class="label-text text-black/70 font-medium">Status</span>
            </label>
            <div class="flex items-center h-12">
              <span
                class="badge"
                :class="getStatusClass(supplierProfile.status)"
              >
                {{ supplierProfile.status }}
              </span>
            </div>
          </div>

          <!-- Address -->
          <div class="md:col-span-2">
            <label class="label">
              <span class="label-text text-black/70 font-medium">Address</span>
            </label>
            <textarea
              :value="supplierProfile.address"
              class="textarea textarea-bordered w-full bg-gray-50"
              rows="3"
              readonly
            ></textarea>
          </div>
        </div>
      </div>
    </div>

    <!-- Change Password -->
    <div class="card bg-white shadow-xl border border-black/10">
      <div class="card-body">
        <h3 class="card-title text-xl text-primaryColor mb-4">
          Change Password
        </h3>

        <!-- Success Message -->
        <div v-if="passwordSuccess" class="alert alert-success mb-4">
          <CheckCircle class="w-5 h-5" />
          <span>Password changed successfully!</span>
        </div>

        <!-- Error Message -->
        <div v-if="passwordError" class="alert alert-error mb-4">
          <XCircle class="w-5 h-5" />
          <span>{{ passwordError }}</span>
        </div>

        <form @submit.prevent="handlePasswordChange" class="space-y-4">
          <!-- Current Password -->
          <div>
            <label class="label">
              <span class="label-text text-black/70 font-medium"
                >Current Password</span
              >
            </label>
            <div class="relative">
              <input
                v-model="passwordForm.oldPassword"
                :type="showOldPassword ? 'text' : 'password'"
                class="input input-bordered w-full pr-10"
                required
              />
              <button
                type="button"
                @click="showOldPassword = !showOldPassword"
                class="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <Eye v-if="!showOldPassword" class="w-5 h-5 text-black/40" />
                <EyeOff v-else class="w-5 h-5 text-black/40" />
              </button>
            </div>
          </div>

          <!-- New Password -->
          <div>
            <label class="label">
              <span class="label-text text-black/70 font-medium"
                >New Password</span
              >
            </label>
            <div class="relative">
              <input
                v-model="passwordForm.newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                class="input input-bordered w-full pr-10"
                required
                minlength="6"
              />
              <button
                type="button"
                @click="showNewPassword = !showNewPassword"
                class="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <Eye v-if="!showNewPassword" class="w-5 h-5 text-black/40" />
                <EyeOff v-else class="w-5 h-5 text-black/40" />
              </button>
            </div>
            <p class="text-xs text-black/50 mt-1">
              Password must be at least 6 characters long
            </p>
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="label">
              <span class="label-text text-black/70 font-medium"
                >Confirm New Password</span
              >
            </label>
            <div class="relative">
              <input
                v-model="passwordForm.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                class="input input-bordered w-full pr-10"
                required
                minlength="6"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <Eye
                  v-if="!showConfirmPassword"
                  class="w-5 h-5 text-black/40"
                />
                <EyeOff v-else class="w-5 h-5 text-black/40" />
              </button>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="flex gap-2">
            <button
              type="submit"
              class="btn bg-primaryColor text-white hover:bg-primaryColor/90 border-none font-thin"
              :disabled="loadingPassword"
            >
              <span
                v-if="loadingPassword"
                class="loading loading-spinner loading-sm"
              ></span>
              <Lock v-else class="w-4 h-4" />
              Change Password
            </button>
            <button
              type="button"
              @click="resetPasswordForm"
              class="btn btn-ghost font-thin"
              :disabled="loadingPassword"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Account Statistics -->
    <div class="card bg-white shadow-xl border border-black/10">
      <div class="card-body">
        <h3 class="card-title text-xl text-primaryColor mb-4">
          Account Statistics
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="stat bg-base-200 rounded-lg">
            <div class="stat-title">Total Orders</div>
            <div class="stat-value text-primaryColor">
              {{ stats.total_orders }}
            </div>
          </div>

          <div class="stat bg-base-200 rounded-lg">
            <div class="stat-title">Average Rating</div>
            <div class="stat-value text-warning">
              {{ stats.avg_rating || 'N/A' }}
            </div>
          </div>

          <div class="stat bg-base-200 rounded-lg">
            <div class="stat-title">Last Order</div>
            <div class="stat-value text-sm">
              {{ formatDate(stats.last_order_date) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { useSupplierAuthStore } from '../../stores/supplierAuthStore';
  import { useCustomToast } from '../../composables/useCustomToast';
  import {
    Eye,
    EyeOff,
    Lock,
    CheckCircle,
    XCircle,
    Edit,
    X,
  } from 'lucide-vue-next';

  const supplierAuthStore = useSupplierAuthStore();
  const { showError, showSuccess } = useCustomToast();

  // State
  const passwordForm = ref({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const showOldPassword = ref(false);
  const showNewPassword = ref(false);
  const showConfirmPassword = ref(false);
  const loadingPassword = ref(false);
  const passwordError = ref('');
  const passwordSuccess = ref(false);

  // Profile editing state
  const isEditingProfile = ref(false);
  const loadingProfile = ref(false);
  const profileError = ref('');
  const profileSuccess = ref(false);
  const profileForm = ref({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
  });

  const stats = ref({
    total_orders: 0,
    avg_rating: 0,
    last_order_date: null,
  });

  // Computed
  const supplierProfile = computed(() => supplierAuthStore.supplier || {});

  // Methods
  const getStatusClass = (status) => {
    const statusMap = {
      Active: 'bg-success/10 text-success',
      Inactive: 'bg-error/10 text-error',
      Pending: 'bg-warning/10 text-warning',
    };
    return statusMap[status] || 'badge-ghost';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const resetPasswordForm = () => {
    passwordForm.value = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
    passwordError.value = '';
    passwordSuccess.value = false;
  };

  const handlePasswordChange = async () => {
    passwordError.value = '';
    passwordSuccess.value = false;

    // Validation
    if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
      passwordError.value = 'New passwords do not match';
      return;
    }

    if (passwordForm.value.newPassword.length < 6) {
      passwordError.value = 'Password must be at least 6 characters long';
      return;
    }

    loadingPassword.value = true;

    try {
      await supplierAuthStore.changePassword(
        passwordForm.value.oldPassword,
        passwordForm.value.newPassword
      );

      passwordSuccess.value = true;
      resetPasswordForm();

      // Hide success message after 5 seconds
      setTimeout(() => {
        passwordSuccess.value = false;
      }, 5000);
    } catch (error) {
      passwordError.value =
        error.response?.data?.message ||
        error.message ||
        'Failed to change password';
    } finally {
      loadingPassword.value = false;
    }
  };

  // Profile editing methods
  const startEditingProfile = () => {
    // Populate form with current profile data
    profileForm.value = {
      name: supplierProfile.value.name || '',
      contact_person: supplierProfile.value.contact_person || '',
      email: supplierProfile.value.email || '',
      phone: supplierProfile.value.phone || '',
    };
    isEditingProfile.value = true;
    profileError.value = '';
    profileSuccess.value = false;
  };

  const cancelEditingProfile = () => {
    isEditingProfile.value = false;
    profileForm.value = {
      name: '',
      contact_person: '',
      email: '',
      phone: '',
    };
    profileError.value = '';
    profileSuccess.value = false;
  };

  const saveProfile = async () => {
    profileError.value = '';
    profileSuccess.value = false;

    // Validation
    if (!profileForm.value.name.trim()) {
      profileError.value = 'Supplier name is required';
      return;
    }
    if (!profileForm.value.contact_person.trim()) {
      profileError.value = 'Contact person is required';
      return;
    }
    if (!profileForm.value.email.trim()) {
      profileError.value = 'Email address is required';
      return;
    }
    if (!profileForm.value.phone.trim()) {
      profileError.value = 'Phone number is required';
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileForm.value.email)) {
      profileError.value = 'Please enter a valid email address';
      return;
    }

    loadingProfile.value = true;

    try {
      await supplierAuthStore.updateProfile(profileForm.value);

      profileSuccess.value = true;
      isEditingProfile.value = false;

      // Hide success message after 5 seconds
      setTimeout(() => {
        profileSuccess.value = false;
      }, 5000);
    } catch (error) {
      profileError.value =
        error.response?.data?.message ||
        error.message ||
        'Failed to update profile';
    } finally {
      loadingProfile.value = false;
    }
  };

  // Initialize profile form with current data
  const initializeProfileForm = () => {
    profileForm.value = {
      name: supplierProfile.value.name || '',
      contact_person: supplierProfile.value.contact_person || '',
      email: supplierProfile.value.email || '',
      phone: supplierProfile.value.phone || '',
    };
  };

  // Load stats and initialize profile form
  onMounted(() => {
    if (supplierProfile.value.stats) {
      stats.value = supplierProfile.value.stats;
    }
    initializeProfileForm();
  });
</script>

<style scoped>
  .stat {
    padding: 1.5rem;
  }
</style>
