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
          Forgot Password
        </h1>
        <p class="text-black/60">Supplier Portal</p>
      </div>

      <!-- Forgot Password Card -->
      <div class="card bg-white shadow-2xl border border-black/10">
        <div class="card-body p-8">
          <h2 class="card-title text-2xl text-primaryColor mb-2">
            Reset Your Password
          </h2>
          <p class="text-black/60 mb-6">
            Enter your email address and we'll send you a link to reset your
            password.
          </p>

          <!-- Error Alert -->
          <div v-if="error" class="alert alert-error shadow-lg mb-4">
            <XCircle class="w-5 h-5" />
            <span>{{ error }}</span>
          </div>

          <!-- Forgot Password Form -->
          <form @submit.prevent="handleForgotPassword" class="space-y-4">
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
                  v-model="email"
                  type="email"
                  placeholder="Enter your email"
                  class="input input-bordered w-full pl-10 bg-white border-primaryColor/30 text-black focus:border-primaryColor"
                  required
                  :disabled="loading"
                />
              </div>
            </div>

            <!-- Send Reset Link Button -->
            <button
              type="submit"
              class="btn btn-block bg-primaryColor text-white hover:bg-primaryColor/90 border-none mt-6 font-thin"
              :disabled="loading"
            >
              <span
                v-if="loading"
                class="loading loading-spinner loading-sm"
              ></span>
              <span v-else>Send Reset Link</span>
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
</template>

<script setup>
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { useCustomToast } from '../../composables/useCustomToast';
  import axios from 'axios';
  import { Mail, XCircle, ArrowLeft } from 'lucide-vue-next';
  import { apiConfig } from '../../config/api';

  const router = useRouter();
  const { showSuccess, showError } = useCustomToast();

  const email = ref('');
  const error = ref('');
  const loading = ref(false);

  // Methods
  const handleForgotPassword = async () => {
    error.value = '';
    loading.value = true;

    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/supplier-auth/forgot-password`,
        { email: email.value.trim() }
      );

      if (response.data.success) {
        showSuccess(
          'If the email exists in our system, a password reset link has been sent to your email address.',
          'Reset Link Sent'
        );

        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/supplier/login');
        }, 2000);
      }
    } catch (err) {
      console.error('Forgot password error:', err);

      // For security, we don't want to reveal if the email exists or not
      // So we show the same success message regardless of the error
      showSuccess(
        'If the email exists in our system, a password reset link has been sent to your email address.',
        'Reset Link Sent'
      );

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/supplier/login');
      }, 2000);
    } finally {
      loading.value = false;
    }
  };
</script>

<style scoped>
  .min-h-screen {
    min-height: 100vh;
  }
</style>

