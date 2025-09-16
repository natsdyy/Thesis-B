<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock class="w-10 h-10 text-green-600" />
        </div>
        <h1 class="text-2xl font-bold text-gray-800 mb-2">QR Attendance</h1>
        <p class="text-gray-600">Processing your attendance...</p>
      </div>

      <!-- Status Card -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <!-- Loading State -->
        <div v-if="processing" class="text-center">
          <div class="loading loading-spinner loading-lg text-green-600 mb-4"></div>
          <p class="text-gray-600">Processing QR code...</p>
        </div>

        <!-- Success State -->
        <div v-else-if="result && result.success" class="text-center">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle class="w-8 h-8 text-green-600" />
          </div>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">Success!</h3>
          <p class="text-gray-600 mb-4">{{ result.message }}</p>
          
          <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <div class="text-sm space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-500">Employee:</span>
                <span class="font-medium">{{ result.data?.employee?.name }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">ID:</span>
                <span class="font-medium">{{ result.data?.employee?.employee_id }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Action:</span>
                <span class="font-medium capitalize">{{ result.data?.action?.replace('-', ' ') }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Branch:</span>
                <span class="font-medium">{{ result.data?.branch?.name || 'N/A' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Location:</span>
                <span class="font-medium">{{ result.data?.location || 'N/A' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Time:</span>
                <span class="font-medium">{{ formatTime(result.data?.time) }}</span>
              </div>
              <div v-if="result.data?.time_in && result.data?.action === 'time-out'" class="flex justify-between">
                <span class="text-gray-500">Time In:</span>
                <span class="font-medium">{{ formatTime(result.data.time_in) }}</span>
              </div>
              <div v-if="result.data?.hours_worked" class="flex justify-between">
                <span class="text-gray-500">Hours Worked:</span>
                <span class="font-medium">{{ result.data.hours_worked }}h</span>
              </div>
            </div>
          </div>

          <button @click="scanAnother" class="btn btn-success w-full">
            Scan Another QR Code
          </button>
        </div>

        <!-- Error State -->
        <div v-else-if="result && !result.success" class="text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle class="w-8 h-8 text-red-600" />
          </div>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">Error</h3>
          <p class="text-red-600 mb-4">{{ result.message || 'Failed to process attendance' }}</p>
          
          <button @click="scanAnother" class="btn btn-outline w-full">
            Try Again
          </button>
        </div>

        <!-- Invalid QR State -->
        <div v-else-if="!processing && !qrData" class="text-center">
          <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle class="w-8 h-8 text-yellow-600" />
          </div>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">Invalid QR Code</h3>
          <p class="text-gray-600 mb-4">This QR code is not valid for attendance.</p>
          
          <button @click="goHome" class="btn btn-outline w-full">
            Go to Dashboard
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center mt-6">
        <p class="text-sm text-gray-500">
          Powered by Countryside QR Attendance System
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiConfig } from '../../config/api'
import axios from 'axios'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle 
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

// Reactive data
const processing = ref(true)
const result = ref(null)
const qrData = ref(null)

// API Configuration
const API_BASE_URL = apiConfig.baseURL

// Methods
const processQRCode = async (data) => {
  try {
    processing.value = true
    
    const response = await axios.post(`${API_BASE_URL}/attendance/scan-qr`, {
      qrData: data
    })
    
    result.value = response.data
  } catch (error) {
    console.error('QR processing error:', error)
    result.value = {
      success: false,
      message: error.response?.data?.message || 'Failed to process QR code'
    }
  } finally {
    processing.value = false
  }
}

const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

const scanAnother = () => {
  // Reset state for another scan
  processing.value = false
  result.value = null
  qrData.value = null
  
  // In a real app, you might want to open camera or scanner
  // For now, we'll just reset the page
  window.location.reload()
}

const goHome = () => {
  router.push('/dashboard')
}

// Process QR code on mount
onMounted(() => {
  const data = route.query.data
  
  if (data) {
    try {
      qrData.value = JSON.parse(decodeURIComponent(data))
      processQRCode(qrData.value)
    } catch (error) {
      console.error('Invalid QR data:', error)
      processing.value = false
      result.value = {
        success: false,
        message: 'Invalid QR code format'
      }
    }
  } else {
    processing.value = false
    result.value = {
      success: false,
      message: 'No QR data provided'
    }
  }
})
</script>

<style scoped>
.loading {
  border-top-color: transparent;
}
</style>
