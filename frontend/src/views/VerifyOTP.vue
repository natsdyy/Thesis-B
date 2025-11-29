<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="flex justify-center">
        <img class="h-16 w-auto" src="/logo1.png" alt="Countryside Steak House" />
      </div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Enter Verification Code
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        We've sent a 6-digit verification code to
        <span class="font-medium text-gray-900">{{ email }}</span>
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form class="space-y-6" @submit.prevent="verifyOTP">
          <div>
            <label for="otp" class="block text-sm font-medium text-gray-700">
              Verification Code
            </label>
            <div class="mt-1">
              <input
                id="otp"
                name="otp"
                type="text"
                maxlength="6"
                required
                v-model="otpCode"
                :disabled="loading"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm text-center text-2xl font-mono tracking-widest disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="000000"
                @input="formatOTP"
              />
            </div>
            <p class="mt-2 text-xs text-gray-500">
              Enter the 6-digit code sent to your email
            </p>
          </div>

          <div v-if="error" class="rounded-md bg-red-50 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">
                  {{ error }}
                </h3>
              </div>
            </div>
          </div>

          <div v-if="success" class="rounded-md bg-green-50 p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-green-800">
                  {{ success }}
                </h3>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading || otpCode.length !== 6"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <span v-if="loading" class="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
              {{ loading ? 'Verifying...' : 'Verify Code' }}
            </button>
          </div>

          <div class="flex items-center justify-between">
            <div class="text-sm">
              <button
                type="button"
                @click="resendOTP"
                :disabled="loading || resendCooldown > 0"
                class="font-medium text-green-600 hover:text-green-500 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code' }}
              </button>
            </div>
            <div class="text-sm">
              <router-link
                to="/forgot-password"
                class="font-medium text-green-600 hover:text-green-500"
              >
                Change Email
              </router-link>
            </div>
          </div>

          <div class="text-center">
            <router-link
              to="/login"
              class="font-medium text-green-600 hover:text-green-500"
            >
              ← Back to Login
            </router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { apiConfig } from '../config/api.js'

const router = useRouter()
const route = useRoute()
const email = ref(route.query.email || '')
const otpCode = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')
const resendCooldown = ref(0)
let resendTimer = null

const formatOTP = (event) => {
  // Only allow numbers and limit to 6 digits
  let value = event.target.value.replace(/\D/g, '').slice(0, 6)
  otpCode.value = value
  event.target.value = value
}

const verifyOTP = async () => {
  if (otpCode.value.length !== 6) {
    error.value = 'Please enter a valid 6-digit code'
    return
  }

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const response = await axios.post(`${apiConfig.baseURL}/auth/verify-otp`, {
      email: email.value,
      otp_code: otpCode.value
    })

    if (response.data.success) {
      success.value = response.data.message
      // Redirect to reset password page after a short delay
      setTimeout(() => {
        router.push({
          name: 'ResetPassword',
          query: { email: email.value, otp: otpCode.value }
        })
      }, 1500)
    } else {
      error.value = response.data.message || 'Invalid verification code'
    }
  } catch (err) {
    console.error('Verify OTP error:', err)
    if (err.response?.data?.message) {
      error.value = err.response.data.message
    } else {
      error.value = 'Invalid verification code. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const resendOTP = async () => {
  if (resendCooldown.value > 0) return

  loading.value = true
  error.value = ''

  try {
    const response = await axios.post(`${apiConfig.baseURL}/auth/send-otp`, {
      email: email.value
    })

    if (response.data.success) {
      success.value = 'Verification code sent successfully'
      startResendCooldown()
    } else {
      error.value = response.data.message || 'Failed to resend verification code'
    }
  } catch (err) {
    console.error('Resend OTP error:', err)
    if (err.response?.data?.message) {
      error.value = err.response.data.message
    } else if (err.response?.status === 429) {
      error.value = 'Please wait before requesting another verification code'
      startResendCooldown()
    } else {
      error.value = 'Failed to resend verification code. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

const startResendCooldown = () => {
  resendCooldown.value = 60 // 60 seconds cooldown
  resendTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) {
      clearInterval(resendTimer)
      resendTimer = null
    }
  }, 1000)
}

onMounted(() => {
  if (!email.value) {
    router.push('/forgot-password')
  }
})

onUnmounted(() => {
  if (resendTimer) {
    clearInterval(resendTimer)
  }
})
</script>
