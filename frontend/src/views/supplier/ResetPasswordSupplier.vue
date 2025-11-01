<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primaryColor/10 to-secondaryColor/10 p-4"
  >
    <div class="w-full max-w-md">
      <!-- Loading State -->
      <div
        v-if="isValidatingToken"
        class="bg-white rounded-lg shadow-2xl border border-black/10 overflow-hidden"
      >
        <div class="p-8 text-center">
          <div
            class="loading loading-spinner loading-lg text-primaryColor mb-4"
          ></div>
          <h2 class="text-xl font-bold text-primaryColor mb-2">
            Validating Reset Link
          </h2>
          <p class="text-gray-500">
            Please wait while we verify your reset link...
          </p>
        </div>
      </div>

      <!-- Invalid Token State -->
      <div
        v-else-if="!tokenValid"
        class="bg-white rounded-lg shadow-2xl border border-black/10 overflow-hidden"
      >
        <div class="p-8 text-center">
          <div
            class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <XCircle class="w-8 h-8 text-red-600" />
          </div>
          <h2 class="text-xl font-bold text-red-600 mb-2">Invalid Reset Link</h2>
          <p class="text-gray-500 mb-4">
            This reset link is invalid or has expired.
          </p>
          <p class="text-sm text-gray-400">
            Redirecting to forgot password page...
          </p>
        </div>
      </div>

      <!-- Valid Token - Reset Password Form -->
      <div v-else>
        <!-- Logo and Title -->
        <div class="text-center mb-8">
          <img
            src="/logo1.png"
            alt="Countryside Steakhouse"
            class="w-24 h-24 mx-auto mb-4"
          />
          <h1 class="text-3xl font-bold text-primaryColor mb-2">
            Reset Password
          </h1>
          <p class="text-black/60">Supplier Portal</p>
        </div>

        <!-- Reset Password Card -->
        <div class="card bg-white shadow-2xl border border-black/10">
          <div class="card-body p-8">
            <h2 class="card-title text-2xl text-primaryColor mb-2">
              Create New Password
            </h2>
            <p v-if="supplierInfo" class="text-black/60 mb-6">
              Resetting password for: <strong>{{ supplierInfo.email }}</strong>
            </p>

            <!-- Error Alert -->
            <div v-if="error" class="alert alert-error shadow-lg mb-4">
              <XCircle class="w-5 h-5" />
              <span>{{ error }}</span>
            </div>

            <!-- Reset Password Form -->
            <form @submit.prevent="handleResetPassword" class="space-y-4">
              <!-- New Password Field -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text text-black/70 font-medium"
                    >New Password</span
                  >
                </label>
                <div class="relative">
                  <Lock
                    class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black/40"
                  />
                  <input
                    v-model="newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    placeholder="Enter new password"
                    class="input input-bordered w-full pl-10 pr-10 bg-white border-primaryColor/30 text-black focus:border-primaryColor"
                    required
                    :disabled="loading"
                  />
                  <button
                    type="button"
                    @click="showNewPassword = !showNewPassword"
                    class="absolute right-3 top-1/2 transform -translate-y-1/2 text-black/40 hover:text-black/60"
                    :disabled="loading"
                  >
                    <Eye v-if="!showNewPassword" class="w-5 h-5" />
                    <EyeOff v-else class="w-5 h-5" />
                  </button>
                </div>
              </div>

              <!-- Confirm Password Field -->
              <div class="form-control">
                <label class="label">
                  <span class="label-text text-black/70 font-medium"
                    >Confirm Password</span
                  >
                </label>
                <div class="relative">
                  <Lock
                    class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black/40"
                  />
                  <input
                    v-model="confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    placeholder="Confirm new password"
                    class="input input-bordered w-full pl-10 pr-10 bg-white border-primaryColor/30 text-black focus:border-primaryColor"
                    required
                    :disabled="loading"
                  />
                  <button
                    type="button"
                    @click="showConfirmPassword = !showConfirmPassword"
                    class="absolute right-3 top-1/2 transform -translate-y-1/2 text-black/40 hover:text-black/60"
                    :disabled="loading"
                  >
                    <Eye v-if="!showConfirmPassword" class="w-5 h-5" />
                    <EyeOff v-else class="w-5 h-5" />
                  </button>
                </div>
              </div>

              <!-- Password Requirements -->
              <div class="text-xs text-gray-500">
                <p>Password must be at least 6 characters long.</p>
              </div>

              <!-- Reset Password Button -->
              <button
                type="submit"
                class="btn btn-block bg-primaryColor text-white hover:bg-primaryColor/90 border-none mt-6 font-thin"
                :disabled="loading"
              >
                <span
                  v-if="loading"
                  class="loading loading-spinner loading-sm"
                ></span>
                <span v-else>Reset Password</span>
              </button>
            </form>

            <!-- Back to Login -->
            <div class="text-center mt-6">
              <p class="text-sm text-black/50">
                Remember your password?
                <router-link
                  to="/supplier/login"
                  class="text-primaryColor hover:text-primaryColor/80 font-medium ml-1"
                >
                  Login here
                </router-link>
              </p>
            </div>
          </div>
        </div>

        <!-- Back to Main Site -->
        <div class="text-center mt-6">
          <a
            href="/"
            class="text-sm text-primaryColor hover:text-primaryColor/80 flex items-center justify-center gap-2"
          >
            <ArrowLeft class="w-4 h-4" />
            Back to Main Site
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue';
  import { useSupplierAuthStore } from '../../stores/supplierAuthStore';
  import { useRouter, useRoute } from 'vue-router';
  import { ArrowLeft, Eye, EyeOff, Lock, XCircle } from 'lucide-vue-next';
  import { useCustomToast } from '../../composables/useCustomToast';

  const supplierAuthStore = useSupplierAuthStore();
  const router = useRouter();
  const route = useRoute();
  const { showSuccess, showError } = useCustomToast();

  const newPassword = ref('');
  const confirmPassword = ref('');
  const showNewPassword = ref(false);
  const showConfirmPassword = ref(false);
  const isLoading = ref(false);
  const isValidatingToken = ref(true);
  const tokenValid = ref(false);
  const supplierInfo = ref(null);
  const error = ref('');

  // Validate token on page load
  onMounted(async () => {
    const token = route.query.token;

    if (!token) {
      showError(
        'No reset token provided. Please request a new password reset.',
        'Invalid Link'
      );
      isValidatingToken.value = false;
      setTimeout(() => {
        router.push('/supplier/forgot-password');
      }, 3000);
      return;
    }

    try {
      const result = await supplierAuthStore.validateResetToken(token);
      supplierInfo.value = result;
      tokenValid.value = true;
    } catch (err) {
      console.error('Token validation error:', err);
      showError(
        'This reset link is invalid or has expired. Please request a new password reset.',
        'Invalid or Expired Link'
      );
      setTimeout(() => {
        router.push('/supplier/forgot-password');
      }, 3000);
    } finally {
      isValidatingToken.value = false;
    }
  });

  const handleResetPassword = async () => {
    error.value = '';

    // Client-side validation
    if (!newPassword.value) {
      error.value = 'Please enter a new password';
      return;
    }

    if (newPassword.value.length < 6) {
      error.value = 'Password must be at least 6 characters long';
      return;
    }

    if (!confirmPassword.value) {
      error.value = 'Please confirm your password';
      return;
    }

    if (newPassword.value !== confirmPassword.value) {
      error.value = 'Passwords do not match';
      return;
    }

    const token = route.query.token;
    if (!token) {
      showError(
        'No reset token found. Please request a new password reset.',
        'Invalid Link'
      );
      return;
    }

    isLoading.value = true;

    try {
      await supplierAuthStore.resetPassword(token, newPassword.value);

      // Show success message
      showSuccess(
        'Your password has been reset successfully. You can now log in with your new password.',
        'Password Reset Successful'
      );

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/supplier/login');
      }, 2000);
    } catch (err) {
      console.error('Reset password error:', err);
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Failed to reset password. Please try again.';
    } finally {
      isLoading.value = false;
    }
  };
</script>

<style scoped>
  .min-h-screen {
    min-height: 100vh;
  }
</style>

