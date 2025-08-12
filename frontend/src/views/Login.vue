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

  // Mock credentials for each role
  const mockCredentials = {
    'Super Admin': {
      email: 'admin@gmail.com',
      password: 'admin123',
    },
    'HR Manager': {
      email: 'hr@gmail.com',
      password: 'hr123',
    },
    'SCM Staff': {
      email: 'scm@gmail.com',
      password: 'scm123',
    },
  };

  const togglePasswordVisibility = () => {
    showPassword.value = !showPassword.value;
  };

  const validateCredentials = (email, password) => {
    for (const [role, credentials] of Object.entries(mockCredentials)) {
      if (credentials.email === email && credentials.password === password) {
        return role;
      }
    }
    return null;
  };

  const login = async () => {
    errorMessage.value = '';

    if (!email.value || !password.value) {
      errorMessage.value = 'Please fill in all fields';
      return;
    }

    isLoading.value = true;
    await nextTick();

    // Simulate API call delay
    setTimeout(() => {
      const userRole = validateCredentials(email.value, password.value);

      if (userRole) {
        authStore.setMockUser(userRole);
        router.push('/dashboard');
      } else {
        errorMessage.value = 'Invalid email or password';
      }

      isLoading.value = false;
    }, 1000);
  };
</script>

<template>
  <!-- Background with blur effect -->
  <div
    class="min-h-screen relative bg-accentColor flex items-center justify-center p-4 overflow-hidden bg-[url(./logo1.png)] bg-contain bg-no-repeat bg-center"
  >
    <!-- Blurred background overlay -->
    <div class="absolute inset-0 glass"></div>

    <!-- Back Button - positioned outside the card -->
    <button
      class="absolute top-8 left-8 text-gray-600 hover:text-gray-800 transition-colors z-10 cursor-pointer"
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
                  class="input input-bordered w-full peer !border-0 !border-b-2 !border-gray-300 !rounded-none bg-transparent focus:!border-primaryColor focus:!outline-none px-0 py-3 placeholder-transparent"
                  :class="{ '!border-red-500': errorMessage }"
                  placeholder="johnmarco@gmail.com"
                />
                <label
                  for="email"
                  class="absolute left-0 -top-3.5 text-gray-600 text-sm font-poppins transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-primaryColor peer-focus:text-sm"
                >
                  Email<span class="text-red-500">*</span>
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
                  class="input input-bordered w-full peer !border-0 !border-b-2 !border-gray-300 !rounded-none bg-transparent focus:!border-primaryColor focus:!outline-none px-0 py-3 pr-10 placeholder-transparent"
                  :class="{ '!border-red-500': errorMessage }"
                  placeholder="lovekosi_e"
                />
                <label
                  for="password"
                  class="absolute left-0 -top-3.5 text-gray-600 text-sm font-poppins transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-primaryColor peer-focus:text-sm"
                >
                  Password<span class="text-red-500">*</span>
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
      <!-- Mobile Logo Section -->
      <div class="flex justify-center mb-8">
        <div class="relative">
          <img
            src="/logo1.png"
            alt="Countryside Logo"
            class="w-80 h-80 object-contain"
          />
        </div>
      </div>

      <!-- Mobile Login Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
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
                class="input input-bordered w-full peer !border-0 !border-b-2 !border-gray-300 !rounded-none bg-transparent focus:!border-primaryColor focus:!outline-none px-0 py-3 placeholder-transparent"
                :class="{ '!border-red-500': errorMessage }"
                placeholder="johnmarco@gmail.com"
              />
              <label
                for="email-mobile"
                class="absolute left-0 -top-3.5 text-gray-600 text-sm font-poppins transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-primaryColor peer-focus:text-sm"
              >
                Email<span class="text-red-500">*</span>
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
                class="input input-bordered w-full peer !border-0 !border-b-2 !border-gray-300 !rounded-none bg-transparent focus:!border-primaryColor focus:!outline-none px-0 py-3 pr-10 placeholder-transparent"
                :class="{ '!border-red-500': errorMessage }"
                placeholder="lovekosi_e"
              />
              <label
                for="password-mobile"
                class="absolute left-0 -top-3.5 text-gray-600 text-sm font-poppins transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-3.5 peer-focus:text-primaryColor peer-focus:text-sm"
              >
                Password<span class="text-red-500">*</span>
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
              class="btn bg-primaryColor border-none hover:bg-primaryColor/80 font-poppins disabled:bg-primaryColor/50 text-white font-medium py-3 px-8 rounded-full transition-colors flex items-center justify-center shadow-lg cursor-pointer"
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
    .min-h-screen {
      background-image: url('/logo1.png');
      background-size: contain;
      background-position: top center;
      background-repeat: no-repeat;
    }
  }
</style>
