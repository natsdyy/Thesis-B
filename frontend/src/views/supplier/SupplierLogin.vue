<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primaryColor/10 to-secondaryColor/10 p-4"
  >
    <div class="w-full max-w-md">
      <!-- Logo and Title -->
      <div class="text-center mb-8">
        <img
          src="/logo1.png"
          alt="Countryside Steakhouse"
          class="w-24 h-24 mx-auto mb-4"
        />
        <h1 class="text-3xl font-bold text-primaryColor mb-2">
          Supplier Portal
        </h1>
        <p class="text-black/60">Countryside Steakhouse</p>
      </div>

      <!-- Login Card -->
      <div class="card bg-white shadow-2xl border border-black/10">
        <div class="card-body p-8">
          <h2 class="card-title text-2xl text-primaryColor mb-6">
            Welcome Back!
          </h2>

          <!-- Error Alert -->
          <div v-if="error" class="alert alert-error shadow-lg mb-4">
            <XCircle class="w-5 h-5" />
            <span>{{ error }}</span>
          </div>

          <!-- Login Form -->
          <form @submit.prevent="handleLogin" class="space-y-4">
            <!-- Email Input -->
            <div class="form-control">
              <label class="label">
                <span class="label-text text-black/70 font-medium"
                  >Email Address</span
                >
              </label>
              <div class="relative">
                <Mail
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 !text-black/40"
                />
                <input
                  v-model="loginForm.email"
                  type="email"
                  placeholder="Enter your email"
                  class="input input-bordered w-full pl-10 bg-white border-primaryColor/30 text-black focus:border-primaryColor"
                  required
                  :disabled="loading"
                />
              </div>
            </div>

            <!-- Password Input -->
            <div class="form-control">
              <label class="label">
                <span class="label-text text-black/70 font-medium"
                  >Password</span
                >
              </label>
              <div class="relative">
                <Lock
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black/40"
                />
                <input
                  v-model="loginForm.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Enter your password"
                  class="input input-bordered w-full pl-10 pr-10 bg-white border-primaryColor/30 text-black focus:border-primaryColor"
                  required
                  :disabled="loading"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 transform -translate-y-1/2 text-black/40 hover:text-black/60"
                  :disabled="loading"
                >
                  <Eye v-if="!showPassword" class="w-5 h-5" />
                  <EyeOff v-else class="w-5 h-5" />
                </button>
              </div>
            </div>

            <!-- Forgot Password Link -->
            <div class="text-right mt-2">
              <router-link
                to="/supplier/forgot-password"
                class="text-sm text-primaryColor hover:text-primaryColor/80"
              >
                Forgot Password?
              </router-link>
            </div>

            <!-- Login Button -->
            <button
              type="submit"
              class="btn btn-block bg-primaryColor text-white hover:bg-primaryColor/90 border-none mt-6 font-thin"
              :disabled="loading"
            >
              <span
                v-if="loading"
                class="loading loading-spinner loading-sm"
              ></span>
              <span v-else>Sign In</span>
            </button>
          </form>

          <!-- Help Text -->
          <div class="text-center mt-6">
            <p class="text-sm text-black/50">
              Default password:
              <code class="bg-gray-100 px-2 py-1 rounded text-primaryColor"
                >supplier123</code
              >
            </p>
            <p class="text-xs text-black/40 mt-2">
              Please change your password after first login
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
</template>

<script setup>
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { useSupplierAuthStore } from '../../stores/supplierAuthStore';
  import { Mail, Lock, Eye, EyeOff, XCircle, ArrowLeft } from 'lucide-vue-next';

  const router = useRouter();
  const supplierAuthStore = useSupplierAuthStore();

  // State
  const loginForm = ref({
    email: '',
    password: '',
  });
  const showPassword = ref(false);
  const error = ref('');
  const loading = ref(false);

  // Methods
  const handleLogin = async () => {
    error.value = '';
    loading.value = true;

    try {
      await supplierAuthStore.login(loginForm.value);

      // Redirect to supplier dashboard
      router.push('/supplier/dashboard');
    } catch (err) {
      error.value =
        err.response?.data?.message ||
        err.message ||
        'Login failed. Please check your credentials.';
    } finally {
      loading.value = false;
    }
  };
</script>

<style scoped>
  .min-h-screen {
    min-height: 100vh;
  }

  code {
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.875rem;
  }
</style>
