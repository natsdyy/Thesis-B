<script setup>
  import { ref } from 'vue';
  import { useAuthStore } from '../stores/authStore';
  import { useRouter } from 'vue-router';
  import { ArrowLeft } from 'lucide-vue-next';
  import { useCustomToast } from '../composables/useCustomToast';

  const authStore = useAuthStore();
  const router = useRouter();
  const { showSuccess, showError } = useCustomToast();

  const email = ref('');
  const isLoading = ref(false);
  const errorMessage = ref('');

  const goBackLogin = () => {
    router.push('/login');
  };

  const handleForgotPassword = async () => {
    errorMessage.value = '';

    // Client-side validation
    if (!email.value?.trim()) {
      errorMessage.value = 'Please enter your email address';
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value.trim())) {
      errorMessage.value = 'Please enter a valid email address';
      return;
    }

    isLoading.value = true;

    try {
      await authStore.forgotPassword(email.value.trim());

      // Show success message
      showSuccess(
        'If the email exists in our system, a password reset link has been sent to your email address.',
        'Reset Link Sent'
      );

      // Clear the form
      email.value = '';

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      console.error('Forgot password error:', error);

      // For security, we don't want to reveal if the email exists or not
      // So we show the same success message regardless of the error
      showSuccess(
        'If the email exists in our system, a password reset link has been sent to your email address.',
        'Reset Link Sent'
      );

      // Clear the form
      email.value = '';

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
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

    <!-- Desktop Layout -->
    <div
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

      <!-- Right Side - Forgot Password Form -->
      <div class="w-1/2 p-6 lg:p-12 flex items-center justify-center">
        <div class="w-full max-w-sm lg:max-w-md xl:max-w-lg">
          <!-- Welcome Section -->
          <div class="text-center mb-6 lg:mb-8">
            <h1
              class="text-2xl lg:text-3xl font-bold text-primaryColor mb-2 font-poppins"
            >
              Forgot Password
            </h1>
            <p class="text-gray-500 text-sm font-roboto">
              Enter your email address and we'll send you a link to reset your
              password.
            </p>
          </div>

          <!-- Forgot Password Form -->
          <form
            @submit.prevent="handleForgotPassword"
            class="space-y-6 lg:space-y-8 mt-8 lg:mt-10"
          >
            <!-- Email Field -->
            <div class="relative w-full">
              <label
                class="input validator flex items-center gap-3 w-full h-12"
                :class="{
                  '!border-primaryColor !focus-within:border-primaryColor': true,
                  '!border-error': errorMessage,
                }"
              >
                <!-- Email Icon -->
                <svg
                  class="h-5 w-5 opacity-50 flex-shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  <g
                    stroke-linejoin="round"
                    stroke-linecap="round"
                    stroke-width="2.5"
                    fill="none"
                    stroke="currentColor"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                  </g>
                </svg>

                <!-- Input -->
                <input
                  v-model="email"
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Email"
                  required
                  autocomplete="username"
                  class="flex-1 bg-transparent focus:outline-none text-base"
                  :class="{ 'text-error placeholder-error': errorMessage }"
                />
              </label>
            </div>

            <!-- Validation Hint -->
            <div
              v-if="errorMessage"
              class="validator-hint text-error text-sm mt-1 text-center"
            >
              {{ errorMessage }}
            </div>

            <!-- Error Message -->
            <div
              v-if="errorMessage"
              class="text-error text-sm text-center mt-2 font-poppins"
            >
              {{ errorMessage }}
            </div>

            <!-- Send Reset Link Button -->
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
                  <span>Sending...</span>
                </template>
                <template v-else>
                  <span>Send Reset Link</span>
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

    <!-- Mobile Layout -->
    <div
      class="relative z-10 w-full max-w-sm sm:max-w-md mx-auto lg:hidden mt-4 sm:mt-6 lg:mt-10"
    >
      <div class="flex justify-center mb-4">
        <img
          src="/logo1.png"
          alt=""
          class="mobile-logo w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain object-center"
        />
      </div>
      <!-- Mobile Forgot Password Card -->
      <div
        class="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 min-h-[400px] sm:min-h-[450px] mt-4 sm:mt-6"
      >
        <!-- Welcome Section -->
        <div class="text-center mb-6 sm:mb-8">
          <h1
            class="text-xl sm:text-2xl font-bold text-primaryColor mb-2 font-poppins"
          >
            Forgot Password
          </h1>
          <p class="text-gray-500 text-xs sm:text-sm font-roboto">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>
        </div>

        <!-- Forgot Password Form -->
        <form
          @submit.prevent="handleForgotPassword"
          class="space-y-4 sm:space-y-6 mt-6 sm:mt-8"
        >
          <!-- Email Field -->
          <div class="relative w-full">
            <label
              class="input validator flex items-center gap-3 w-full h-12"
              :class="{
                '!border-primaryColor !focus-within:border-primaryColor': true,
                '!border-error': errorMessage,
              }"
            >
              <!-- Email Icon -->
              <svg
                class="h-5 w-5 opacity-50 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <g
                  stroke-linejoin="round"
                  stroke-linecap="round"
                  stroke-width="2.5"
                  fill="none"
                  stroke="currentColor"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </g>
              </svg>

              <!-- Input -->
              <input
                id="email-mobile"
                v-model="email"
                type="email"
                name="email"
                placeholder="Email"
                required
                autocomplete="username"
                class="flex-1 bg-transparent focus:outline-none text-base"
                :class="{ 'text-error placeholder-error': errorMessage }"
              />
            </label>
          </div>

          <!-- Validation Hint -->
          <div
            v-if="errorMessage"
            class="validator-hint text-error text-sm mt-1 text-center"
          >
            {{ errorMessage }}
          </div>

          <!-- Error Message -->
          <div
            v-if="errorMessage"
            class="text-error text-sm text-center mt-2 font-poppins"
          >
            {{ errorMessage }}
          </div>

          <!-- Send Reset Link Button -->
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
                <span>Sending...</span>
              </template>
              <template v-else>
                <span>Send Reset Link</span>
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
