<script setup>
  import { ref } from 'vue';
  import { useAuthStore } from '../stores/authStore';
  import { useRouter } from 'vue-router';
  import { Eye, EyeOff } from 'lucide-vue-next';
  import { nextTick } from 'vue';

  const authStore = useAuthStore();
  const router = useRouter();

  const email = ref('');
  const password = ref('');
  const showPassword = ref(false);
  const errorMessage = ref('');
  const isLoading = ref(false);

  const togglePasswordVisibility = () => {
    showPassword.value = !showPassword.value;
  };

  // Enhanced error message mapping
  const getErrorMessage = (error) => {
    if (error.response?.data?.code) {
      const code = error.response.data.code;
      const message = error.response.data.message;

      switch (code) {
        case 'MISSING_CREDENTIALS':
          return 'Please enter both email and password';
        case 'MISSING_EMAIL':
          return 'Please enter your email address';
        case 'MISSING_PASSWORD':
          return 'Please enter your password';
        case 'EMPTY_EMAIL':
          return 'Email address cannot be empty';
        case 'EMPTY_PASSWORD':
          return 'Password cannot be empty';
        case 'INVALID_EMAIL_FORMAT':
          return 'Please enter a valid email address';
        case 'INVALID_CREDENTIALS':
          return 'Invalid email or password. Please check your credentials and try again.';
        case 'ACCOUNT_DEACTIVATED':
          return 'Your account has been deactivated. Please contact your administrator.';
        case 'ACCOUNT_INACTIVE':
          return 'Your account is currently inactive. Please contact your administrator.';
        case 'NO_ROLE_ASSIGNED':
          return 'No role has been assigned to your account. Please contact your administrator.';
        case 'ROLE_DELETED':
          return 'Your assigned role has been removed. Please contact your administrator for role reassignment.';
        case 'ROLE_DEACTIVATED':
          return 'Your assigned role has been temporarily deactivated. Please contact your administrator.';
        case 'ROLE_VALIDATION_ERROR':
          return 'Unable to verify your role permissions. Please try again or contact your administrator.';
        case 'AUTHENTICATION_ERROR':
          return 'Authentication service is temporarily unavailable. Please try again.';
        case 'ACCESS_DENIED':
          return message || 'Access denied. Please contact your administrator.';
        case 'USER_NOT_FOUND':
          return 'User account not found. Please check your credentials.';
        case 'INTERNAL_SERVER_ERROR':
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return message || 'Login failed. Please try again.';
      }
    }

    // Fallback for other error types
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    if (error.message) {
      return error.message;
    }

    return 'Login failed. Please try again.';
  };

  const goBackHome = () => {
    router.push('/');
  };

  const login = async () => {
    errorMessage.value = '';

    // Client-side validation
    if (!email.value?.trim()) {
      errorMessage.value = 'Please enter your email address';
      return;
    }

    if (!password.value) {
      errorMessage.value = 'Please enter your password';
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value.trim())) {
      errorMessage.value = 'Please enter a valid email address';
      return;
    }

    isLoading.value = true;
    await nextTick();

    try {
      await authStore.login({
        email: email.value.trim(),
        password: password.value,
      });

      // Redirect based on user role/department
      const userDepartment = authStore.userDepartment;
      const userRole = authStore.userRole;

      if (userRole === 'Super Admin' || userDepartment === 'Admin') {
        router.push('/admin');
      } else if (userDepartment === 'Human Resource') {
        router.push('/hr');
      } else if (userDepartment === 'Finance') {
        router.push('/finance');
      } else if (userDepartment === 'Supply Chain') {
        router.push('/scm');
      } else if (userDepartment === 'Production') {
        router.push('/production');
      } else if (userDepartment === 'Customer Relationship') {
        router.push('/crm');
      } else if (userDepartment === 'Branch') {
        // All Branch department users should go to branch dashboard
        // Super Admin can switch branches, others will be handled by BranchLayout
        router.push('/branch/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      errorMessage.value = getErrorMessage(error);
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
      @click="goBackHome"
      class="absolute top-8 left-8 text-gray-600 hover:text-gray-800 transition-colors z-10 cursor-pointer flex items-center space-x-2 hover:bg-white/20 rounded-lg px-3 py-2"
    >
      <svg
        class="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        ></path>
      </svg>
      <span class="text-sm font-medium">Back to Home</span>
    </button>

    <!-- Desktop Layout -->
    <div
      class="relative z-10 bg-white rounded-lg shadow-lg overflow-hidden max-w-4xl w-full max-h-[600px] hidden lg:flex"
    >
      <!-- Left Side - Logo/Branding -->
      <div
        class="w-1/2 flex items-center bg-secondaryColor justify-center p-8 h-full"
        style="height: 600px"
      >
        <img
          src="/logo1.png"
          alt="logo"
          class="w-full h-[70%] object-contain"
        />
      </div>

      <!-- Right Side - Login Form -->
      <div class="w-1/2 p-12 flex items-center justify-center">
        <div class="w-full max-w-sm">
          <!-- Welcome Section -->
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-primaryColor mb-2 font-poppins">
              Welcome
            </h1>
            <p class="text-gray-500 text-sm font-roboto">
              Fill your data to continue. Thank You!
            </p>
          </div>

          <!-- Login Form -->
          <form @submit.prevent="login" class="space-y-8 mt-10">
            <!-- Email Field with Floating Label -->
            <div class="form-control">
              <label class="label">
                <span class="label-text sr-only">Email</span>
              </label>
              <div class="relative">
                <input
                  id="email"
                  v-model="email"
                  type="email"
                  name="email"
                  autocomplete="username"
                  class="input input-bordered w-full peer !border-0 !border-b-2 !border-gray-300 !rounded-none bg-transparent focus:!border-primaryColor focus:!outline-none px-0 py-3 placeholder-transparent"
                  :class="{ '!border-red-500': errorMessage }"
                  placeholder="johnmarco@gmail.com"
                />
                <label
                  for="email"
                  class="absolute left-0 -top-3.5 text-gray-600 text-sm font-poppins transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-primaryColor peer-focus:text-sm"
                >
                  Email
                </label>
              </div>
            </div>

            <!-- Password Field with Floating Label -->
            <div class="form-control">
              <label class="label">
                <span class="label-text sr-only">Password</span>
              </label>
              <div class="relative">
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  name="password"
                  autocomplete="current-password"
                  class="input input-bordered w-full peer !border-0 !border-b-2 !border-gray-300 !rounded-none bg-transparent focus:!border-primaryColor focus:!outline-none px-0 py-3 pr-10 placeholder-transparent"
                  :class="{ '!border-red-500': errorMessage }"
                  placeholder="lovekosi_e"
                />
                <label
                  for="password"
                  class="absolute left-0 -top-3.5 text-gray-600 text-sm font-poppins transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-primaryColor peer-focus:text-sm"
                >
                  Password
                </label>
                <button
                  type="button"
                  @click="togglePasswordVisibility"
                  class="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <Eye v-if="showPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>

              <!-- Forgot Password Link -->
              <div class="mt-3 text-right">
                <a
                  href="#"
                  class="text-sm text-primaryColor hover:text-primaryColor/80 transition-colors font-poppins"
                >
                  recover password
                </a>
              </div>
            </div>

            <!-- Error Message -->
            <div
              v-if="errorMessage"
              class="text-red-500 text-sm text-center mt-2 font-poppins"
            >
              {{ errorMessage }}
            </div>

            <!-- Login Button -->
            <div class="mt-8 flex justify-center">
              <button
                type="submit"
                :disabled="isLoading"
                class="btn bg-primaryColor border-none hover:bg-primaryColor/80 font-poppins disabled:bg-primaryColor/50 text-white font-medium py-3 px-6 rounded-full transition-colors flex items-center justify-center shadow-lg cursor-pointer w-[50%]"
              >
                <template v-if="isLoading">
                  <span
                    class="loading loading-spinner loading-sm text-white mr-2"
                  ></span>
                  <span class="font-poppins">Logging in...</span>
                </template>
                <template v-else>
                  <span class="font-poppins">Login</span>
                </template>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Mobile Layout -->
    <div class="relative z-10 w-full max-w-md mx-auto lg:hidden mt-10">
      <div class="flex justify-center">
        <img
          src="/logo1.png"
          alt=""
          class="w-70 h-70 object-cover object-center"
        />
      </div>
      <!-- Mobile Login Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8 h-[500px] mt-10">
        <!-- Welcome Section -->
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-primaryColor mb-2 font-poppins">
            Welcome
          </h1>
          <p class="text-gray-500 text-sm font-roboto">
            Fill your data to continue. Thank You!
          </p>
        </div>

        <!-- Login Form -->
        <form @submit.prevent="login" class="space-y-6">
          <!-- Email Field with Floating Label -->
          <div class="form-control mt-10">
            <div class="relative">
              <input
                id="email-mobile"
                v-model="email"
                type="email"
                name="email"
                autocomplete="username"
                class="input input-bordered w-full peer !border-0 !border-b-2 !border-gray-300 !rounded-none bg-transparent focus:!border-primaryColor focus:!outline-none px-0 py-3 placeholder-transparent"
                :class="{ '!border-red-500': errorMessage }"
                placeholder="johnmarco@gmail.com"
              />
              <label
                for="email-mobile"
                class="absolute left-0 -top-3.5 text-gray-600 text-sm font-poppins transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-primaryColor peer-focus:text-sm"
              >
                Email
              </label>
            </div>
          </div>

          <!-- Password Field with Floating Label -->
          <div class="form-control mt-10">
            <div class="relative">
              <input
                id="password-mobile"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                autocomplete="current-password"
                class="input input-bordered w-full peer !border-0 !border-b-2 !border-gray-300 !rounded-none bg-transparent focus:!border-primaryColor focus:!outline-none px-0 py-3 pr-10 placeholder-transparent"
                :class="{ '!border-red-500': errorMessage }"
                placeholder="lovekosi_e"
              />
              <label
                for="password-mobile"
                class="absolute left-0 -top-3.5 text-gray-600 text-sm font-poppins transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-primaryColor peer-focus:text-sm"
              >
                Password
              </label>
              <button
                type="button"
                @click="togglePasswordVisibility"
                class="absolute right-0 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <Eye v-if="showPassword" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>

            <!-- Forgot Password Link -->
            <div class="mt-3 text-right">
              <a
                href="#"
                class="text-sm text-primaryColor hover:text-primaryColor/80 transition-colors font-poppins"
              >
                recover password
              </a>
            </div>
          </div>

          <!-- Error Message -->
          <div
            v-if="errorMessage"
            class="text-red-500 text-sm text-center mt-2 font-poppins"
          >
            {{ errorMessage }}
          </div>

          <!-- Login Button -->
          <div class="mt-8 flex justify-center">
            <button
              type="submit"
              :disabled="isLoading"
              class="btn bg-primaryColor border-none hover:bg-primaryColor/80 font-poppins disabled:bg-primaryColor/50 text-white font-medium py-3 px-6 rounded-full transition-colors flex items-center justify-center shadow-lg cursor-pointer w-[50%]"
            >
              <template v-if="isLoading">
                <span
                  class="loading loading-spinner loading-sm text-white mr-2"
                ></span>
                <span class="font-poppins">Logging in...</span>
              </template>
              <template v-else>
                <span class="font-poppins">Login</span>
              </template>
            </button>
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
    transform: translateY(-1.5rem) scale(0.9);
    color: var(--primaryColor, #466114);
  }

  /* Override DaisyUI input styles for floating labels */
  .input.input-bordered {
    font-family: Roboto;
    color: var(--color-neutralColor, #000000);
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
</style>
