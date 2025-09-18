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
        <!-- Location Status -->
        <div v-if="locationStatus" class="mb-4 p-3 rounded-lg border" :class="locationStatus.withinRadius ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'">
          <div class="flex items-center space-x-2">
            <div :class="['w-3 h-3 rounded-full', locationStatus.withinRadius ? 'bg-green-500' : 'bg-red-500']"></div>
            <span class="text-sm font-medium" :class="locationStatus.withinRadius ? 'text-green-800' : 'text-red-800'">
              {{ locationStatus.withinRadius ? 'Within Range' : 'Too Far Away' }}
            </span>
          </div>
          <div class="text-xs mt-1" :class="locationStatus.withinRadius ? 'text-green-600' : 'text-red-600'">
            Distance: {{ locationStatus.distance || 'Unknown' }} | Required: {{ locationStatus.requiredRadius || '2m' }}
            <span v-if="locationStatus.accuracy" class="ml-2">(GPS: ±{{ locationStatus.accuracy }}m)</span>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="processing" class="text-center">
          <div class="relative mb-6">
            <div class="loading loading-spinner loading-lg text-green-600 mb-4"></div>
            <!-- Processing rings -->
            <div class="absolute inset-0 w-16 h-16 mx-auto">
              <div class="w-full h-full border-4 border-green-200 rounded-full animate-spin"></div>
            </div>
          </div>
          <h3 class="text-lg font-semibold text-gray-700 mb-2">Processing QR Code...</h3>
          <p class="text-gray-600">Please wait while we verify your attendance</p>
        </div>

        <!-- Success State -->
        <div v-else-if="result && result.success" class="text-center animate-fade-in">
          <!-- Success Animation -->
          <div class="relative mb-6">
            <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle class="w-10 h-10 text-green-600" />
            </div>
            <!-- Success rings animation -->
            <div class="absolute inset-0 w-20 h-20 mx-auto">
              <div class="w-full h-full border-4 border-green-200 rounded-full animate-ping"></div>
            </div>
          </div>
          
          <h3 class="text-2xl font-bold text-green-600 mb-2 animate-pulse">Success!</h3>
          <p class="text-lg text-gray-700 mb-6 font-medium">{{ result.message }}</p>
          
          <!-- Enhanced Success Card -->
          <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 mb-6 shadow-lg border border-green-200">
            <div class="text-sm space-y-3">
              <div class="flex justify-between items-center py-2 border-b border-green-200">
                <span class="text-gray-600 font-medium">Employee:</span>
                <span class="font-bold text-gray-800">{{ result.data?.employee?.name }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-green-200">
                <span class="text-gray-600 font-medium">Employee ID:</span>
                <span class="font-bold text-gray-800">{{ result.data?.employee?.employee_id }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-green-200">
                <span class="text-gray-600 font-medium">Action:</span>
                <span class="font-bold text-green-600 capitalize">{{ result.data?.action?.replace('-', ' ') }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-green-200">
                <span class="text-gray-600 font-medium">Branch:</span>
                <span class="font-bold text-gray-800">{{ result.data?.branch?.name || 'N/A' }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-green-200">
                <span class="text-gray-600 font-medium">Location:</span>
                <span class="font-bold text-gray-800">{{ result.data?.location || 'N/A' }}</span>
              </div>
              <div class="flex justify-between items-center py-2 border-b border-green-200">
                <span class="text-gray-600 font-medium">Time:</span>
                <span class="font-bold text-blue-600">{{ formatTime(result.data?.time) }}</span>
              </div>
              <div v-if="result.data?.time_in && result.data?.action === 'time-out'" class="flex justify-between items-center py-2 border-b border-green-200">
                <span class="text-gray-600 font-medium">Time In:</span>
                <span class="font-bold text-gray-800">{{ formatTime(result.data.time_in) }}</span>
              </div>
              <div v-if="result.data?.hours_worked" class="flex justify-between items-center py-2">
                <span class="text-gray-600 font-medium">Hours Worked:</span>
                <span class="font-bold text-blue-600">{{ result.data.hours_worked }}h</span>
              </div>
            </div>
          </div>

          <!-- Success Message -->
          <div class="bg-green-100 border border-green-300 rounded-lg p-4 mb-6">
            <div class="flex items-center justify-center">
              <CheckCircle class="w-5 h-5 text-green-600 mr-2" />
              <span class="text-green-800 font-medium">Attendance recorded successfully!</span>
            </div>
          </div>
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

      <!-- Action Buttons -->
      <div v-if="result && result.success" class="mt-6 flex gap-3">
        <button @click="viewAttendanceRecords" class="btn btn-outline flex-1">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          View My Records
        </button>
        <button @click="scanAnother" class="btn btn-primary flex-1">
          Scan Another QR Code
        </button>
      </div>

      <!-- Footer -->
      <div class="text-center mt-6">
        <p class="text-sm text-gray-500">
          Powered by Countryside QR Attendance System
        </p>
      </div>
    </div>

    <!-- Attendance Records Modal -->
    <div v-if="showAttendanceRecords" class="modal modal-open">
      <div class="modal-box max-w-4xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-xl">My Attendance Records</h3>
          <button @click="closeAttendanceRecords" class="btn btn-sm btn-circle btn-ghost">
            <XCircle class="w-4 h-4" />
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="recordsLoading" class="text-center py-8">
          <div class="loading loading-spinner loading-lg"></div>
          <p class="text-gray-500 mt-2">Loading attendance records...</p>
        </div>

        <!-- Records Table -->
        <div v-else-if="attendanceRecords.length > 0" class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Status</th>
                <th>Location</th>
                <th>Hours Worked</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in attendanceRecords" :key="record.id">
                <td>{{ formatDate(record.created_at) }}</td>
                <td>{{ formatTime(record.time_in) }}</td>
                <td>{{ formatTime(record.time_out) }}</td>
                <td>
                  <span :class="[
                    'badge',
                    record.status === 'present' ? 'badge-success' : 
                    record.status === 'late' ? 'badge-warning' : 'badge-error'
                  ]">
                    {{ record.status || 'Present' }}
                  </span>
                </td>
                <td>{{ record.location_name || 'N/A' }}</td>
                <td>{{ record.hours_worked ? `${record.hours_worked}h` : 'N/A' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-8">
          <div class="text-gray-400 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-600 mb-2">No Attendance Records</h3>
          <p class="text-gray-500">You haven't recorded any attendance yet.</p>
        </div>

        <!-- Close Button -->
        <div class="modal-action">
          <button @click="closeAttendanceRecords" class="btn btn-primary">Close</button>
        </div>
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
const locationStatus = ref(null)
const showAttendanceRecords = ref(false)
const attendanceRecords = ref([])
const recordsLoading = ref(false)

// API Configuration
const API_BASE_URL = apiConfig.baseURL

// Methods
const processQRCode = async (data) => {
  try {
    processing.value = true
    
    // Handle mobile app QR code format
    if (data.action && data.employee_id) {
      // This is a mobile app QR code, process it directly
      const attendanceData = {
        action: data.action,
        employee_id: data.employee_id,
        employee_name: data.employee_name,
        branch_id: data.branch_id,
        branch_name: data.branch_name,
        location: data.location,
        timestamp: data.timestamp,
        valid_until: data.valid_until
      }
      
      // Process the attendance directly
      await processAttendance(attendanceData)
    } else {
      // This is a regular QR code, use the API
      const response = await axios.post(`${API_BASE_URL}/attendance/scan-qr`, {
        qrData: data
      })
      
      result.value = response.data
    }
  } catch (error) {
    console.error('QR processing error:', error)
    
    // Check if it's a location/distance error
    const errorMessage = error.response?.data?.message || error.message || 'Failed to process QR code'
    const isLocationError = errorMessage.includes('too far') || errorMessage.includes('distance') || errorMessage.includes('radius')
    
    if (isLocationError && locationStatus.value) {
      // Extract distance from error message if available
      const distanceMatch = errorMessage.match(/(\d+(?:\.\d+)?)m/)
      if (distanceMatch) {
        locationStatus.value = {
          withinRadius: false,
          distance: `${distanceMatch[1]}m`,
          requiredRadius: '2m',
          accuracy: locationStatus.value?.accuracy
        }
      } else {
        locationStatus.value = {
          withinRadius: false,
          distance: 'Too far',
          requiredRadius: '2m',
          accuracy: locationStatus.value?.accuracy
        }
      }
    }
    
    result.value = {
      success: false,
      message: errorMessage
    }
  } finally {
    processing.value = false
  }
}

const processAttendance = async (attendanceData) => {
  try {
    // Check if QR code is still valid
    if (attendanceData.valid_until) {
      const validUntil = new Date(attendanceData.valid_until)
      const now = new Date()
      
      if (now > validUntil) {
        throw new Error('QR code has expired')
      }
    }
    
    // Get current GPS location
    let latitude = null
    let longitude = null
    let accuracy = null
    
    try {
      if (navigator.geolocation) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          })
        })
        
        latitude = position.coords.latitude
        longitude = position.coords.longitude
        accuracy = position.coords.accuracy
        
        console.log('GPS coordinates:', { latitude, longitude, accuracy })
        
        // Set location status for UI display
        locationStatus.value = {
          withinRadius: null, // Will be determined by backend response
          distance: 'Checking...',
          requiredRadius: '2m',
          accuracy: Math.round(accuracy)
        }
      } else {
        console.warn('Geolocation is not supported by this browser')
        locationStatus.value = {
          withinRadius: false,
          distance: 'GPS not supported',
          requiredRadius: '2m',
          error: 'Geolocation not supported'
        }
      }
    } catch (geoError) {
      console.warn('Could not get GPS location:', geoError.message)
      locationStatus.value = {
        withinRadius: false,
        distance: 'GPS Error',
        requiredRadius: '2m',
        error: geoError.message
      }
      // Continue without GPS coordinates - the backend will handle this gracefully
    }
    
    // Use the mobile-scan endpoint for mobile app QR codes
    const response = await axios.post(`${API_BASE_URL}/attendance/mobile-scan`, {
      action: attendanceData.action,
      employee_id: attendanceData.employee_id,
      location: attendanceData.location,
      latitude: latitude,
      longitude: longitude
    })
    
    // Update location status based on response
    if (response.data.success) {
      locationStatus.value = {
        withinRadius: true,
        distance: 'Within range',
        requiredRadius: '2m',
        accuracy: locationStatus.value?.accuracy
      }
      
      // Play success sound
      playSuccessSound()
    }

    result.value = {
      success: true,
      message: response.data.message || `Successfully ${attendanceData.action.replace('-', ' ')}`,
      data: {
        action: attendanceData.action,
        employee: {
          name: attendanceData.employee_name,
          employee_id: attendanceData.employee_id
        },
        branch: {
          name: attendanceData.branch_name
        },
        location: attendanceData.location,
        time: new Date().toISOString(),
        ...response.data.data
      }
    }
  } catch (error) {
    console.error('Attendance processing error:', error)
    throw error
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

const viewAttendanceRecords = () => {
  showAttendanceRecords.value = true
  fetchAttendanceRecords()
}

const fetchAttendanceRecords = async () => {
  try {
    recordsLoading.value = true
    const token = localStorage.getItem('token')
    const response = await axios.get(`${API_BASE_URL}/attendance/my-attendance`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { 
        limit: 10,
        offset: 0
      }
    })
    
    if (response.data.success) {
      attendanceRecords.value = response.data.data || []
    } else {
      console.error('Failed to fetch attendance records:', response.data.message)
      attendanceRecords.value = []
    }
  } catch (error) {
    console.error('Error fetching attendance records:', error)
    attendanceRecords.value = []
  } finally {
    recordsLoading.value = false
  }
}

const closeAttendanceRecords = () => {
  showAttendanceRecords.value = false
  attendanceRecords.value = []
}

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

const playSuccessSound = () => {
  try {
    // Create a simple success sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Success sound: ascending notes
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime) // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1) // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2) // G5
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch (error) {
    console.log('Could not play success sound:', error)
  }
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
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes successBounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

@keyframes successPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

.animate-fade-in {
  animation: fadeIn 0.6s ease-out;
}

.animate-bounce {
  animation: successBounce 1s ease-in-out;
}

.animate-pulse {
  animation: successPulse 2s ease-in-out infinite;
}
.loading {
  border-top-color: transparent;
}
</style>
