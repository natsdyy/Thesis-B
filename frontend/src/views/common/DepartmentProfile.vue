<script setup>
  import { ref, computed, onMounted } from 'vue';
  import {
    UserCircle,
    Edit,
    Save,
    X,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Badge,
    Clock,
    Building2,
    Shield,
    Camera,
    Eye,
    EyeOff,
  } from 'lucide-vue-next';
  import { useAuthStore } from '../../stores/authStore';
  import { formatImageUrl } from '../../config/api.js';
  import PayslipPrintModal from '../../components/payroll/PayslipPrintModal.vue';

  const authStore = useAuthStore();

  // Local state
  const loading = ref(false);
  const editMode = ref(false);
  const showPasswordSection = ref(false);
  const imageLoadError = ref(false);
  const uploadingImage = ref(false);
  const imageInput = ref(null);
  const showPasswordConfirmModal = ref(false);
  const changingPassword = ref(false);
  const showCurrentPassword = ref(false);
  const showNewPassword = ref(false);
  const showConfirmPassword = ref(false);

  // Payslip state
  const payslips = ref([]);
  const payslipsLoading = ref(false);
  const showPayslipModal = ref(false);
  const selectedPayslip = ref(null);
  const selectedPeriod = ref(null);
  const selectedMonth = ref('');

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
    if (imageLoadError.value) return null;
    const url =
      profileData.value.profile_picture || user.value?.photo_url || null;
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    // Use formatImageUrl for production compatibility
    return formatImageUrl(url);
  });

  const defaultProfileImageUrl = `${import.meta.env.BASE_URL}profile.jpg`;

  const canEditProfile = computed(() => true);

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
      await authStore.refreshUserData();
      const employee = await authStore.fetchMyFullProfile();
      profileData.value = {
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone: employee.phone_number || '',
        address: employee.address || '',
        hire_date: employee.created_at || '',
        employee_id: employee.employee_id || '',
        role: employee.role || 'Employee',
        department: employee.department || '',
        last_login: employee.last_login || '',
        profile_picture: employee.photo_url || null,
      };

      editForm.value = {
        first_name: profileData.value.first_name,
        last_name: profileData.value.last_name,
        phone: profileData.value.phone,
        address: profileData.value.address,
      };

      imageLoadError.value = false;
    } catch (error) {
      showToast('error', error.message || 'Failed to load profile data');
      if (user.value) {
        profileData.value = {
          first_name: user.value.name?.split(' ')[0] || 'User',
          last_name: user.value.name?.split(' ')[1] || '',
          email: user.value.email || '',
          phone: '',
          address: '',
          hire_date: '',
          employee_id: user.value.employee_id || '',
          role: user.value.role || 'Employee',
          department: user.value.department || '',
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
      const employee = await authStore.updateMyProfile({
        // First and last name are read-only in this view
        phone_number: editForm.value.phone,
        address: editForm.value.address,
      });
      profileData.value = {
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone: employee.phone_number || '',
        address: employee.address || '',
        hire_date: employee.created_at || '',
        employee_id: employee.employee_id || '',
        role: employee.role || 'Employee',
        department: employee.department || '',
        last_login: employee.last_login || '',
        profile_picture: employee.photo_url || null,
      };

      editMode.value = false;
      showToast('success', 'Profile updated successfully');
    } catch (error) {
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

    // Show confirmation modal
    showPasswordConfirmModal.value = true;
  };

  const confirmPasswordChange = async () => {
    changingPassword.value = true;

    try {
      await authStore.changeMyPassword(
        passwordForm.value.current_password,
        passwordForm.value.new_password
      );

      passwordForm.value = {
        current_password: '',
        new_password: '',
        confirm_password: '',
      };
      showPasswordSection.value = false;
      showPasswordConfirmModal.value = false;
      showToast('success', 'Password changed successfully');
    } catch (error) {
      showToast('error', error.message || 'Failed to change password');
    } finally {
      changingPassword.value = false;
    }
  };

  const cancelPasswordChange = () => {
    showPasswordConfirmModal.value = false;
  };

  const toggleCurrentPasswordVisibility = () => {
    showCurrentPassword.value = !showCurrentPassword.value;
  };

  const toggleNewPasswordVisibility = () => {
    showNewPassword.value = !showNewPassword.value;
  };

  const toggleConfirmPasswordVisibility = () => {
    showConfirmPassword.value = !showConfirmPassword.value;
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();
  const formatDateTime = (dateString) => new Date(dateString).toLocaleString();

  const handleImageLoad = () => {
    imageLoadError.value = false;
  };
  const handleImageError = () => {
    imageLoadError.value = true;
  };
  const triggerImageUpload = () => {
    imageInput.value?.click();
  };
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Image file size must be less than 5MB');
      return;
    }

    uploadingImage.value = true;
    try {
      const result = await authStore.uploadMyPhoto(file);
      profileData.value.profile_picture = result.photo_url;
      imageLoadError.value = false;
      showToast('success', 'Profile picture updated successfully');
    } catch (error) {
      showToast('error', error.message || 'Failed to upload profile picture');
    } finally {
      uploadingImage.value = false;
      if (imageInput.value) imageInput.value.value = '';
    }
  };

  // Payslip methods
  const loadPayslips = async () => {
    payslipsLoading.value = true;
    try {
      const token = localStorage.getItem('token');

      // Build query params if month is selected
      const params = new URLSearchParams();
      if (selectedMonth.value) {
        params.append('month', selectedMonth.value);
      }

      const response = await fetch(
        `/api/payroll/my-payslips${params.toString() ? '?' + params.toString() : ''}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch payslips: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        payslips.value = result.data || [];
      } else {
        throw new Error(result.message || 'Failed to load payslips');
      }
    } catch (error) {
      console.error('Error loading payslips:', error);
      showToast('error', error.message || 'Failed to load payslips');
    } finally {
      payslipsLoading.value = false;
    }
  };

  // Function to generate month options (last 12 months)
  const getMonthOptions = () => {
    const months = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
      months.push({ value, label });
    }
    return months;
  };

  const monthOptions = getMonthOptions();

  const viewPayslip = (payslip) => {
    selectedPayslip.value = payslip;
    selectedPeriod.value = {
      period_name: payslip.period_name,
      date_from: payslip.date_from,
      date_to: payslip.date_to,
    };
    showPayslipModal.value = true;
  };

  const closePayslipModal = () => {
    showPayslipModal.value = false;
    selectedPayslip.value = null;
    selectedPeriod.value = null;
  };

  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    });
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'bg-warning/10 text-warning',
      paid: 'bg-success/10 text-success',
      draft: 'bg-neutral/10 text-neutral',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  onMounted(() => {
    loadProfileData();
    loadPayslips();
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-primaryColor">Employee Profile</h1>
        <p class="text-gray-600 mt-1">Personal Information</p>
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
                  <img
                    v-else
                    :src="defaultProfileImageUrl"
                    alt="Default profile image"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-if="uploadingImage"
                    class="absolute inset-0 bg-opacity-50 flex items-center justify-center rounded-full"
                  >
                    <div
                      class="loading loading-spinner loading-md text-white"
                    ></div>
                  </div>
                  <div
                    v-else
                    class="absolute inset-0 bg-opacity-0 hover:bg-opacity-20 flex items-center justify-center rounded-full transition-all duration-200 group"
                  >
                    <Camera
                      class="w-6 h-6 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    />
                  </div>
                </div>
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
            </div>

            <!-- Personal Details -->
            <div class="lg:col-span-2 space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">First Name</span>
                  </label>
                  <div class="p-3 bg-gray-50 rounded-lg">
                    {{ profileData.first_name }}
                  </div>
                </div>
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-medium">Last Name</span>
                  </label>
                  <div class="p-3 bg-gray-50 rounded-lg">
                    {{ profileData.last_name }}
                  </div>
                </div>
              </div>

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

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control md:col-span-1">
                  <label class="label">
                    <span class="label-text font-medium">Phone Number</span>
                  </label>
                  <template v-if="editMode">
                    <input
                      v-model="editForm.phone"
                      type="tel"
                      class="input input-bordered"
                    />
                  </template>
                  <template v-else>
                    <div class="p-3 bg-gray-50 rounded-lg flex items-center">
                      <Phone class="w-4 h-4 text-gray-400 mr-2" />
                      {{ profileData.phone }}
                    </div>
                  </template>
                </div>

                <div class="form-control md:col-span-1">
                  <label class="label">
                    <span class="label-text font-medium">Address</span>
                  </label>
                  <template v-if="editMode">
                    <textarea
                      v-model="editForm.address"
                      class="textarea textarea-bordered"
                      rows="3"
                    ></textarea>
                  </template>
                  <template v-else>
                    <div class="p-3 bg-gray-50 rounded-lg flex items-start">
                      <MapPin class="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                      {{ profileData.address }}
                    </div>
                  </template>
                </div>
              </div>

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
              <div class="relative">
                <input
                  v-model="passwordForm.current_password"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  class="input input-bordered w-full pr-10"
                  required
                />
                <button
                  type="button"
                  @click="toggleCurrentPasswordVisibility"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  <Eye v-if="!showCurrentPassword" class="w-4 h-4" />
                  <EyeOff v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">New Password</span>
              </label>
              <div class="relative">
                <input
                  v-model="passwordForm.new_password"
                  :type="showNewPassword ? 'text' : 'password'"
                  class="input input-bordered w-full pr-10"
                  required
                />
                <button
                  type="button"
                  @click="toggleNewPasswordVisibility"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  <Eye v-if="!showNewPassword" class="w-4 h-4" />
                  <EyeOff v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Confirm New Password</span>
              </label>
              <div class="relative">
                <input
                  v-model="passwordForm.confirm_password"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  class="input input-bordered w-full pr-10"
                  required
                />
                <button
                  type="button"
                  @click="toggleConfirmPasswordVisibility"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  <Eye v-if="!showConfirmPassword" class="w-4 h-4" />
                  <EyeOff v-else class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="flex space-x-2 pt-2">
              <button
                @click="changePassword"
                :disabled="loading"
                class="btn bg-primaryColor text-white hover:bg-primaryColor/80"
              >
                Change Password
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

      <!-- Payslips Section -->
      <div class="card bg-white shadow-lg">
        <div class="card-body">
          <div
            class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4"
          >
            <h2 class="card-title text-primaryColor">My Payslips</h2>
            <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <!-- Month Filter -->
              <select
                v-model="selectedMonth"
                @change="loadPayslips"
                class="select select-bordered select-sm flex-1 sm:flex-none"
              >
                <option value="">All Months</option>
                <option
                  v-for="month in monthOptions"
                  :key="month.value"
                  :value="month.value"
                >
                  {{ month.label }}
                </option>
              </select>
              <!-- Refresh Button -->
              <button
                @click="loadPayslips"
                :disabled="payslipsLoading"
                class="btn btn-sm btn-outline text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white"
              >
                <i
                  class="fas fa-sync-alt w-4 h-4 mr-1"
                  :class="{ 'animate-spin': payslipsLoading }"
                ></i>
                Refresh
              </button>
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="payslipsLoading" class="flex justify-center py-8">
            <div class="text-center">
              <div
                class="loading loading-spinner loading-lg text-primaryColor"
              ></div>
              <p class="mt-2 text-gray-600">Loading payslips...</p>
            </div>
          </div>

          <!-- No Payslips -->
          <div v-else-if="payslips.length === 0" class="text-center py-8">
            <p class="text-gray-600 text-lg mb-2">No payslips available</p>
            <p class="text-gray-500 text-sm">
              Your payslips will appear here once they are generated and
              released.
            </p>
          </div>

          <!-- Payslips List -->
          <div v-else class="space-y-3">
            <div
              v-for="payslip in payslips"
              :key="payslip.id"
              class="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-primaryColor/30 transition-colors"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <h3 class="font-semibold text-gray-900">
                      {{ payslip.period_name }}
                    </h3>
                    <span
                      class="badge badge-sm"
                      :class="getStatusBadgeClass(payslip.status)"
                    >
                      {{ payslip.status }}
                    </span>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span class="text-gray-600">Period:</span>
                      <p class="font-medium">
                        {{ formatDate(payslip.date_from) }} -
                        {{ formatDate(payslip.date_to) }}
                      </p>
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2 ml-4">
                  <button
                    @click="viewPayslip(payslip)"
                    class="btn btn-sm bg-primaryColor text-white hover:bg-primaryColor/90 font-thin"
                    :disabled="payslip.status !== 'paid'"
                    :title="
                      payslip.status !== 'paid'
                        ? 'Payslip not yet released'
                        : 'View and print payslip'
                    "
                  >
                    View Payslip
                  </button>
                </div>
              </div>
            </div>
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

    <!-- Password Change Confirmation Modal -->
    <div v-if="showPasswordConfirmModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg text-primaryColor mb-4">
          <Shield class="w-5 h-5 inline mr-2" />
          Confirm Password Change
        </h3>
        <p class="py-4">
          Are you sure you want to change your password? This action cannot be
          undone.
        </p>
        <div class="modal-action">
          <button
            @click="confirmPasswordChange"
            :disabled="changingPassword"
            class="btn bg-primaryColor text-white hover:bg-primaryColor/80"
          >
            <div
              v-if="changingPassword"
              class="loading loading-spinner loading-sm mr-2"
            ></div>
            {{ changingPassword ? 'Changing Password...' : 'Confirm Change' }}
          </button>
          <button
            @click="cancelPasswordChange"
            :disabled="changingPassword"
            class="btn btn-ghost"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <!-- Payslip Print Modal -->
    <PayslipPrintModal
      :show="showPayslipModal"
      :record="selectedPayslip"
      :period="selectedPeriod"
      @close="closePayslipModal"
    />
  </div>
</template>

<style scoped>
  .toast {
    z-index: 9999;
  }
</style>
