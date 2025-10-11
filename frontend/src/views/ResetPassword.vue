<script setup>
  import { ref, onMounted } from 'vue';
  import { useAuthStore } from '../stores/authStore';
  import { useRouter, useRoute } from 'vue-router';
  import {
    ArrowLeft,
    Eye,
    EyeOff,
    CheckCircle,
    XCircle,
  } from 'lucide-vue-next';
  import { useCustomToast } from '../composables/useCustomToast';

  const authStore = useAuthStore();
  const router = useRouter();
  const route = useRoute();
  const { showSuccess, showError, showWarning } = useCustomToast();

  const newPassword = ref('');
  const confirmPassword = ref('');
  const showNewPassword = ref(false);
  const showConfirmPassword = ref(false);
  const isLoading = ref(false);
  const isValidatingToken = ref(true);
  const tokenValid = ref(false);
  const userInfo = ref(null);
  const errorMessage = ref('');

  const toggleNewPasswordVisibility = () => {
    showNewPassword.value = !showNewPassword.value;
  };

  const toggleConfirmPasswordVisibility = () => {
    showConfirmPassword.value = !showConfirmPassword.value;
  };

  const goBackLogin = () => {
    router.push('/login');
  };

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
        router.push('/forgot-password');
      }, 3000);
      return;
    }

    try {
      const result = await authStore.validateResetToken(token);
      userInfo.value = result;
      tokenValid.value = true;
    } catch (error) {
      console.error('Token validation error:', error);
      showError(
        'This reset link is invalid or has expired. Please request a new password reset.',
        'Invalid or Expired Link'
      );
      setTimeout(() => {
        router.push('/forgot-password');
      }, 3000);
    } finally {
      isValidatingToken.value = false;
    }
  });

  const handleResetPassword = async () => {
    errorMessage.value = '';

    // Client-side validation
    if (!newPassword.value) {
      errorMessage.value = 'Please enter a new password';
      return;
    }

    if (newPassword.value.length < 6) {
      errorMessage.value = 'Password must be at least 6 characters long';
      return;
    }

    if (!confirmPassword.value) {
      errorMessage.value = 'Please confirm your password';
      return;
    }

    if (newPassword.value !== confirmPassword.value) {
      errorMessage.value = 'Passwords do not match';
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
      await authStore.resetPassword(token, newPassword.value);

      // Show success message
      showSuccess(
        'Your password has been reset successfully. You can now log in with your new password.',
        'Password Reset Successful'
      );

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      console.error('Reset password error:', error);
      showError(
        error.response?.data?.message ||
          error.message ||
          'Failed to reset password. Please try again.',
        'Reset Failed'
      );
    } finally {
      isLoading.value = false;
    }
  };
</script>

<template>
  <!-- Background with blur effect -->
  <div
    class="min-h-screen relative bg-accentColor flex items-center justify-center p-4 overflow-hidden bg-center"
  >
    <!-- Blurred background overlay -->
    <div class="absolute inset-0 blur-lg bg-secondaryColor/10">
      <img
        src="/logo1.png"
        alt=""
        class="w-full h-full object-cover lg:object-contain object-center"
      />
    </div>

    <!-- Back Button - positioned outside the card -->
    <button
      @click="goBackLogin"
      class="absolute top-8 left-8 text-gray-600 hover:text-gray-800 transition-colors z-10 cursor-pointer flex items-center space-x-2 hover:bg-white/20 rounded-lg px-3 py-2"
    >
      <ArrowLeft class="w-5 h-5" />
      <span class="text-sm font-medium">Back to Login</span>
    </button>

    <!-- Loading State -->
    <div
      v-if="isValidatingToken"
      class="relative z-10 bg-white rounded-lg shadow-lg overflow-hidden max-w-md w-full mx-4"
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
      class="relative z-10 bg-white rounded-lg shadow-lg overflow-hidden max-w-md w-full mx-4"
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
    <div
      v-else
      class="relative z-10 bg-white rounded-lg shadow-lg overflow-hidden max-w-4xl w-full max-h-[600px] hidden lg:flex"
    >
      <!-- Left Side - Logo/Branding -->
      <div
        class="w-1/2 flex items-center bg-secondaryColor justify-center p-6 lg:p-8 h-full"
        style="height: 600px"
      >
        <img
          src="/logo1.png"
          alt="logo"
          class="w-full h-[70%] object-contain"
        />
      </div>

      <!-- Right Side - Reset Password Form -->
      <div class="w-1/2 p-6 lg:p-12 flex items-center justify-center">
        <div class="w-full max-w-sm lg:max-w-md xl:max-w-lg">
          <!-- Welcome Section -->
          <div class="text-center mb-6 lg:mb-8">
            <h1
              class="text-2xl lg:text-3xl font-bold text-primaryColor mb-2 font-poppins"
            >
              Reset Password
            </h1>
            <p class="text-gray-500 text-sm font-roboto">
              Enter your new password below.
            </p>
            <div v-if="userInfo" class="mt-2 text-xs text-gray-400">
              Resetting password for: {{ userInfo.email }}
            </div>
          </div>

          <!-- Reset Password Form -->
          <form
            @submit.prevent="handleResetPassword"
            class="space-y-6 lg:space-y-8 mt-8 lg:mt-10"
          >
            <!-- New Password Field -->
            <div class="relative w-full">
              <label
                class="input validator flex items-center gap-3 w-full h-12"
                :class="{
                  '!border-primaryColor !focus-within:border-primaryColor': true,
                  '!border-error': errorMessage,
                }"
              >
                <!-- Password Icon -->
                <svg
                  class="h-5 w-5 opacity-50 flex-shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V9a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z"
                  />
                </svg>

                <!-- Input -->
                <input
                  v-model="newPassword"
                  :type="showNewPassword ? 'text' : 'password'"
                  id="newPassword"
                  name="newPassword"
                  placeholder="New Password"
                  required
                  class="flex-1 bg-transparent focus:outline-none text-base pr-10"
                  :class="{ 'text-error placeholder-error': errorMessage }"
                />

                <!-- Toggle Eye -->
                <button
                  type="button"
                  @click="toggleNewPasswordVisibility"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 cursor-pointer"
                >
                  <Eye v-if="showNewPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </label>
            </div>

            <!-- Confirm Password Field -->
            <div class="relative w-full">
              <label
                class="input validator flex items-center gap-3 w-full h-12"
                :class="{
                  '!border-primaryColor !focus-within:border-primaryColor': true,
                  '!border-error': errorMessage,
                }"
              >
                <!-- Password Icon -->
                <svg
                  class="h-5 w-5 opacity-50 flex-shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="2.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V9a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z"
                  />
                </svg>

                <!-- Input -->
                <input
                  v-model="confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm New Password"
                  required
                  class="flex-1 bg-transparent focus:outline-none text-base pr-10"
                  :class="{ 'text-error placeholder-error': errorMessage }"
                />

                <!-- Toggle Eye -->
                <button
                  type="button"
                  @click="toggleConfirmPasswordVisibility"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 cursor-pointer"
                >
                  <Eye v-if="showConfirmPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </label>
            </div>

            <!-- Password Requirements -->
            <div class="text-xs text-gray-500">
              <p>Password must be at least 6 characters long.</p>
            </div>

            <!-- Error Message -->
            <div
              v-if="errorMessage"
              class="text-error text-sm text-center mt-2 font-poppins"
            >
              {{ errorMessage }}
            </div>

            <!-- Reset Password Button -->
            <div class="mt-6 lg:mt-8 flex justify-center">
              <button
                type="submit"
                :disabled="isLoading"
                class="btn bg-primaryColor border-none hover:bg-primaryColor/80 font-poppins disabled:bg-primaryColor/50 text-white font-medium py-3 px-6 rounded-full transition-colors flex items-center justify-center shadow-lg cursor-pointer w-full sm:w-[80%] lg:w-[60%] xl:w-[50%]"
              >
                <template v-if="isLoading">
                  <span
                    class="loading loading-spinner loading-sm text-white mr-2"
                  ></span>
                  <span>Resetting...</span>
                </template>
                <template v-else>
                  <span>Reset Password</span>
                </template>
              </button>
            </div>

            <!-- Back to Login -->
            <div class="mt-6 text-center">
              <p class="text-sm text-gray-600 font-poppins">
                Remember your password?
                <button
                  @click="goBackLogin"
                  class="text-primaryColor hover:text-primaryColor/80 font-medium transition-colors ml-1"
                >
                  Login here
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Mobile Layout - Valid Token -->
    <div
      v-if="!isValidatingToken && tokenValid"
      class="relative z-10 w-full max-w-sm sm:max-w-md mx-auto lg:hidden mt-4 sm:mt-6 lg:mt-10"
    >
      <div class="flex justify-center mb-4">
        <img
          src="/logo1.png"
          alt=""
          class="mobile-logo w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain object-center"
        />
      </div>
      <!-- Mobile Reset Password Card -->
      <div
        class="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 min-h-[400px] sm:min-h-[450px] mt-4 sm:mt-6"
      >
        <!-- Welcome Section -->
        <div class="text-center mb-6 sm:mb-8">
          <h1
            class="text-xl sm:text-2xl font-bold text-primaryColor mb-2 font-poppins"
          >
            Reset Password
          </h1>
          <p class="text-gray-500 text-xs sm:text-sm font-roboto">
            Enter your new password below.
          </p>
          <div v-if="userInfo" class="mt-2 text-xs text-gray-400">
            Resetting password for: {{ userInfo.email }}
          </div>
        </div>

        <!-- Reset Password Form -->
        <form
          @submit.prevent="handleResetPassword"
          class="space-y-4 sm:space-y-6 mt-6 sm:mt-8"
        >
          <!-- New Password Field -->
          <div class="relative w-full">
            <label
              class="input validator flex items-center gap-3 w-full h-12"
              :class="{
                '!border-primaryColor !focus-within:border-primaryColor': true,
                '!border-error': errorMessage,
              }"
            >
              <!-- Password Icon -->
              <svg
                class="h-5 w-5 opacity-50 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V9a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z"
                />
              </svg>

              <!-- Input -->
              <input
                id="newPassword-mobile"
                v-model="newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                name="newPassword"
                placeholder="New Password"
                required
                class="flex-1 bg-transparent focus:outline-none text-base pr-10"
                :class="{ 'text-error placeholder-error': errorMessage }"
              />

              <!-- Toggle Password -->
              <button
                type="button"
                @click="toggleNewPasswordVisibility"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <Eye v-if="showNewPassword" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </label>
          </div>

          <!-- Confirm Password Field -->
          <div class="relative w-full">
            <label
              class="input validator flex items-center gap-3 w-full h-12"
              :class="{
                '!border-primaryColor !focus-within:border-primaryColor': true,
                '!border-error': errorMessage,
              }"
            >
              <!-- Password Icon -->
              <svg
                class="h-5 w-5 opacity-50 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2.5"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V9a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z"
                />
              </svg>

              <!-- Input -->
              <input
                id="confirmPassword-mobile"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                name="confirmPassword"
                placeholder="Confirm New Password"
                required
                class="flex-1 bg-transparent focus:outline-none text-base pr-10"
                :class="{ 'text-error placeholder-error': errorMessage }"
              />

              <!-- Toggle Password -->
              <button
                type="button"
                @click="toggleConfirmPasswordVisibility"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <Eye v-if="showConfirmPassword" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </label>
          </div>

          <!-- Password Requirements -->
          <div class="text-xs text-gray-500">
            <p>Password must be at least 6 characters long.</p>
          </div>

          <!-- Error Message -->
          <div
            v-if="errorMessage"
            class="text-error text-sm text-center mt-2 font-poppins"
          >
            {{ errorMessage }}
          </div>

          <!-- Reset Password Button -->
          <div class="mt-6 sm:mt-8 flex justify-center">
            <button
              type="submit"
              :disabled="isLoading"
              class="btn bg-primaryColor border-none hover:bg-primaryColor/80 font-poppins disabled:bg-primaryColor/50 text-white font-medium py-3 px-6 rounded-full transition-colors flex items-center justify-center shadow-lg cursor-pointer w-full sm:w-[80%]"
            >
              <template v-if="isLoading">
                <span
                  class="loading loading-spinner loading-sm text-white mr-2"
                ></span>
                <span>Resetting...</span>
              </template>
              <template v-else>
                <span>Reset Password</span>
              </template>
            </button>
          </div>

          <!-- Back to Login -->
          <div class="mt-6 text-center">
            <p class="text-sm text-gray-600 font-poppins">
              Remember your password?
              <button
                @click="goBackLogin"
                class="text-primaryColor hover:text-primaryColor/80 font-medium transition-colors ml-1"
              >
                Login here
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* Remove input autofill styling */
  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px white inset;
    -webkit-text-fill-color: #374151;
    transition: background-color 5000s ease-in-out 0s;
  }

  /* Custom floating label styles */
  .input:focus ~ label,
  .input:not(:placeholder-shown) ~ label {
    transform: translateY(-1.5rem) scale(0.9) !important;
    color: var(--primaryColor, #466114) !important;
  }

  /* Override DaisyUI input styles for floating labels */
  .input.input-bordered {
    font-family: Roboto;
    color: var(--color-neutralColor, #000000) !important;
    background: transparent !important;
    border: none !important;
    border-bottom: 2px solid #d1d5db !important;
    border-radius: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  .input.input-bordered:focus {
    border-bottom-color: var(--primaryColor, #466114) !important;
    outline: none !important;
    box-shadow: none !important;
  }

  /* Mobile specific styles */
  @media (max-width: 1023px) {
    /* Let the overlay image handle the background visuals */
    .min-h-screen {
      background-image: none;
    }
  }

  /* Enhanced responsive input styles */
  .input {
    min-height: 48px;
    display: flex;
    align-items: center;
  }

  @media (max-width: 640px) {
    .input {
      min-height: 44px;
    }
  }

  /* Ensure proper text wrapping and overflow handling */
  .input input {
    word-wrap: break-word;
    overflow-wrap: break-word;
    line-height: 1.5;
  }

  /* Better touch targets for mobile */
  @media (max-width: 768px) {
    button {
      min-height: 44px;
    }
  }

  /* Perfect alignment for input elements */
  .input svg {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .input input {
    display: flex;
    align-items: center;
    height: 100%;
  }

  /* Ensure consistent spacing */
  .input {
    padding: 0 12px;
  }

  /* Mobile logo responsive sizing */
  @media (max-width: 375px) {
    .mobile-logo {
      width: 10rem;
      height: 10rem;
    }
  }

  @media (min-width: 376px) and (max-width: 640px) {
    .mobile-logo {
      width: 6rem;
      height: 6rem;
    }
  }

  @media (min-width: 641px) and (max-width: 768px) {
    .mobile-logo {
      width: 7rem;
      height: 7rem;
    }
  }
</style>
