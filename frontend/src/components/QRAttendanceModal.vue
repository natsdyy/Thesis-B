<template>
  <div v-if="isOpen" class="modal modal-open">
    <div class="modal-box max-w-md">
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-bold text-xl">QR Code Attendance</h3>
        <button @click="closeModal" class="btn btn-sm btn-circle btn-ghost">
          <X class="w-4 h-4" />
        </button>
      </div>

     

      <!-- Current Status -->
      <div class="mb-6">
        <div class="alert alert-info">
          <Clock class="w-5 h-5" />
          <div>
            <div class="font-medium">Current Status</div>
            <div class="text-sm opacity-80">
              {{ currentStatus === 'checked-out' ? 'Ready to Time In' : 'Ready to Time Out' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Location Status -->
      <div class="mb-6">
        <div class="card bg-base-100 shadow-sm border">
          <div class="card-body p-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="font-semibold text-sm">Location Status</h4>
              <button 
                @click="checkLocation" 
                :disabled="locationChecking"
                class="btn btn-xs btn-outline"
              >
                <svg v-if="!locationChecking" class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span v-if="locationChecking" class="loading loading-spinner loading-xs"></span>
                {{ locationChecking ? 'Checking...' : 'Check Location' }}
              </button>
            </div>
            
            <!-- Location Status Display -->
            <div v-if="locationStatus">
              <div class="flex items-center space-x-2 mb-2">
                <div 
                  :class="[
                    'w-3 h-3 rounded-full',
                    locationStatus.withinRadius ? 'bg-green-500' : 
                    locationStatus.error ? 'bg-yellow-500' : 'bg-red-500'
                  ]"
                ></div>
                <span class="text-sm font-medium">
                  {{ locationStatus.withinRadius ? 'Within Range' : 
                     locationStatus.error ? 'Location Error' : 'Too Far Away' }}
                </span>
              </div>
              
              <div class="text-xs text-gray-600 space-y-1">
                <div>Distance: {{ locationStatus.distance || 'Unknown' }}</div>
                <div>Required: Within {{ locationStatus.requiredRadius || '2m' }}</div>
                <div v-if="locationStatus.accuracy" class="text-gray-500">
                  GPS Accuracy: ±{{ locationStatus.accuracy }}m
                  <span v-if="locationStatus.accuracy > 100" class="text-orange-600 font-medium">
                    (Poor signal - try moving to an open area)
                  </span>
                  <span v-else-if="locationStatus.accuracy > 50" class="text-yellow-600 font-medium">
                    (Fair signal)
                  </span>
                  <span v-else class="text-green-600 font-medium">
                    (Good signal)
                  </span>
                </div>
                <div v-if="locationStatus.error" class="text-yellow-600 mt-2 p-2 bg-yellow-50 rounded text-xs">
                  <div class="flex items-center justify-between">
                    <div>
                      <strong>Error:</strong> {{ locationStatus.error }}
                      <div v-if="locationStatus.error.includes('timeout')" class="text-xs mt-1">
                        GPS is taking too long. Try moving to an open area or retry.
                      </div>
                    </div>
                    <button 
                      v-if="locationStatus.error.includes('timeout')"
                      @click="checkLocation" 
                      :disabled="locationChecking"
                      class="btn btn-xs btn-outline ml-2"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-else class="text-sm text-gray-700">
              <div class="mb-2 font-medium">Click "Check Location" to verify your position</div>
              <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <strong class="text-gray-800">Note:</strong> Location access is required for attendance validation. 
                If you're having timeout issues, try:
                <ul class="list-disc list-inside mt-2 space-y-1 text-gray-700">
                  <li>Move to an open area with better GPS signal</li>
                  <li>Wait 30-60 seconds for GPS to lock</li>
                  <li>Allow location access in your browser</li>
                  <li>Ensure GPS is enabled on your device</li>
                  <li>Try refreshing the page if timeout persists</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

     

      <!-- QR Code Generation -->
      <div class="text-center mb-6">
        <div class="bg-white p-6 rounded-lg shadow-lg inline-block">
          <div v-if="qrCodeLoading" class="flex flex-col items-center space-y-4">
            <div class="loading loading-spinner loading-lg"></div>
            <p class="text-sm text-gray-500">Generating QR Code...</p>
          </div>
          
          <div v-else-if="qrCodeData" class="space-y-4">
            <div class="flex justify-center min-h-[200px] items-center">
              <img 
                v-if="qrCodeData.imageUrl" 
                :src="qrCodeData.imageUrl" 
                alt="QR Code" 
                class="mx-auto border rounded-lg max-w-[200px] h-auto"
              />
              <div v-else class="text-center p-4">
                <div class="loading loading-spinner loading-lg mb-2"></div>
                <p class="text-sm text-gray-500">Generating QR image...</p>
              </div>
            </div>
            <div class="text-xs text-gray-500 max-w-48 mx-auto text-center">
              <p class="font-medium">{{ qrCodeData.location_name }}</p>
              <p>{{ qrCodeData.action === 'time-in' ? 'Time In' : 'Time Out' }} QR Code</p>
              <p class="mt-2">Valid for: {{ formatValidUntil(qrCodeData.valid_until) }}</p>
              <p class="mt-1 text-xs">{{ qrCodeData.employee_name || 'Employee' }}</p>
              <div v-if="locationStatus && !locationStatus.withinRadius" class="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-orange-700">
                <p class="text-xs font-medium">⚠️ Generated outside 2m radius</p>
                <p class="text-xs">Scanning will require proper location</p>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-8">
            <AlertCircle class="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p class="text-sm text-gray-500">Failed to generate QR code</p>
          </div>
        </div>
      </div>
      

      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button 
          @click="generateQRCode('time-in')" 
          :disabled="qrCodeLoading"
          :class="['btn flex-1', currentStatus === 'checked-out' ? 'btn-success' : 'btn-outline']"
        >
          <LogIn class="w-4 h-4 mr-2" />
          {{ qrCodeLoading ? 'Generating...' : 'Generate Time In QR' }}
        </button>
        
        <button 
          @click="generateQRCode('time-out')" 
          :disabled="qrCodeLoading"
          :class="['btn flex-1', currentStatus === 'checked-in' ? 'btn-warning' : 'btn-outline']"
        >
          <LogOut class="w-4 h-4 mr-2" />
          {{ qrCodeLoading ? 'Generating...' : 'Generate Time Out QR' }}
        </button>
      </div>
      
       <!-- View Records Button -->
       <div class="mb-4 mt-5">
        <button 
          @click="viewAttendanceRecords" 
          class="btn btn-outline btn-sm w-full"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          View Attendance Records
        </button>
      </div>
      <!-- Debug Info (remove in production) -->
      <div v-if="qrCodeData" class="mt-4 p-2 bg-gray-100 rounded text-xs">
        <details>
          <summary class="cursor-pointer text-gray-600">Debug Info</summary>
          <pre class="mt-2 text-xs overflow-x-auto">{{ JSON.stringify(qrCodeData, null, 2) }}</pre>
        </details>
      </div>
    </div>

    <!-- Attendance Records Modal -->
    <div v-if="showAttendanceRecords" class="modal modal-open">
      <div class="modal-box max-w-4xl">
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-bold text-xl">My Attendance Records</h3>
          <button @click="closeAttendanceRecords" class="btn btn-sm btn-circle btn-ghost">
            <X class="w-4 h-4" />
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { apiConfig } from '../config/api'
import axios from 'axios'
import QRCode from 'qrcode'
import { 
  X, 
  Clock, 
  LogIn, 
  LogOut, 
  AlertCircle,
  Smartphone 
} from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'viewRecords'])

// Auth store
const authStore = useAuthStore()

// Reactive data
const qrCodeLoading = ref(false)
const qrCodeData = ref(null)
const currentStatus = ref('checked-out') // 'checked-in' or 'checked-out'
const locationChecking = ref(false)
const locationStatus = ref(null)
const watchId = ref(null)
const showAttendanceRecords = ref(false)
const attendanceRecords = ref([])
const recordsLoading = ref(false)

// API Configuration
const API_BASE_URL = apiConfig.baseURL
const authHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Methods
const closeModal = () => {
  emit('close')
}

const viewAttendanceRecords = () => {
  showAttendanceRecords.value = true
  fetchAttendanceRecords()
}

const fetchAttendanceRecords = async () => {
  try {
    recordsLoading.value = true
    const response = await axios.get(`${API_BASE_URL}/attendance/my-attendance`, {
      headers: authHeaders(),
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

// Location checking functions
const checkLocation = async () => {
  console.log('Starting location check...')
  
  if (!navigator.geolocation) {
    console.log('Geolocation not supported')
    locationStatus.value = {
      withinRadius: false,
      distance: 'GPS not supported',
      requiredRadius: '2m',
      error: 'Geolocation is not supported by this browser'
    }
    return
  }

  locationChecking.value = true
  console.log('Requesting location with high accuracy...')
  
  try {
    // First try with high accuracy
    let position;
    try {
      position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 20000, // 20 seconds for high accuracy
          maximumAge: 0 // Don't use cached for high accuracy
        })
      })
      console.log('High accuracy GPS obtained')
    } catch (highAccuracyError) {
      console.log('High accuracy failed, trying low accuracy...', highAccuracyError.message)
      
      // Fallback to low accuracy if high accuracy times out
      position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false, // Use network-based location
          timeout: 10000, // 10 seconds for low accuracy
          maximumAge: 300000 // Allow 5 minutes old location
        })
      })
      console.log('Low accuracy GPS obtained')
    }

    const userLat = position.coords.latitude
    const userLon = position.coords.longitude
    const accuracy = position.coords.accuracy

    // Get branch coordinates from the user's branch
    // For now, using Dasmariñas coordinates - in production, fetch from user's branch
    const branchLat = 14.3064 // Dasmariñas coordinates (BRN003)
    const branchLon = 120.9671
    const requiredRadius = 2.0

    // Calculate distance using Haversine formula
    const distance = calculateDistance(userLat, userLon, branchLat, branchLon)
    const withinRadius = distance <= requiredRadius

    locationStatus.value = {
      withinRadius,
      distance: `${Math.round(distance)}m`,
      requiredRadius: `${requiredRadius}m`,
      accuracy: Math.round(accuracy),
      userLat,
      userLon,
      qrCodeLat: branchLat,
      qrCodeLon: branchLon
    }

  } catch (error) {
    console.error('Location error:', error)
    
    let errorMessage = 'Unknown error'
    let distanceDisplay = 'Error'
    
    // Handle specific geolocation errors
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        errorMessage = 'Location access denied. Please allow location access and try again.'
        distanceDisplay = 'Permission denied'
        break
      case 2: // POSITION_UNAVAILABLE
        errorMessage = 'Location unavailable. Please check your GPS settings and try again.'
        distanceDisplay = 'GPS unavailable'
        break
      case 3: // TIMEOUT
        errorMessage = 'Location request timed out. Please try again.'
        distanceDisplay = 'Timeout'
        break
      default:
        errorMessage = error.message || 'Failed to get location'
        distanceDisplay = 'Error'
    }
    
    locationStatus.value = {
      withinRadius: false,
      distance: distanceDisplay,
      requiredRadius: '2m',
      error: errorMessage,
      errorCode: error.code
    }
  } finally {
    locationChecking.value = false
  }
}

// Haversine formula to calculate distance between two GPS coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000 // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in meters
}

const toRadians = (degrees) => {
  return degrees * (Math.PI / 180)
}

// Start watching location when modal opens
const startLocationWatching = () => {
  if (navigator.geolocation && !watchId.value) {
    watchId.value = navigator.geolocation.watchPosition(
      (position) => {
        // Auto-update location status when position changes
        if (locationStatus.value) {
          checkLocation()
        }
      },
      (error) => {
        console.warn('Location watch error:', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    )
  }
}

// Stop watching location when modal closes
const stopLocationWatching = () => {
  if (watchId.value) {
    navigator.geolocation.clearWatch(watchId.value)
    watchId.value = null
  }
}

const generateQRCode = async (action) => {
  try {
    qrCodeLoading.value = true
    
    // Get employee information from auth store
    const employee = authStore.user
    console.log('Current user:', employee)
    
    // Create QR code data with employee and branch info
    const qrData = {
      action: action, // 'time-in' or 'time-out'
      employee_id: employee?.employee_id || employee?.id,
      employee_name: `${employee?.first_name || employee?.name || ''} ${employee?.last_name || ''}`.trim(),
      branch_id: employee?.branch_id,
      branch_name: employee?.branch_name || 'Main Office',
      timestamp: new Date().toISOString(),
      location: 'Mobile App QR Code',
      valid_until: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes from now
    }
    
    console.log('QR Data:', qrData)
    
    // Generate QR code URL that will be scanned
    const qrCodeUrl = `${window.location.origin}/attendance/scan?data=${encodeURIComponent(JSON.stringify(qrData))}`
    
    // Store QR data for display (without imageUrl initially)
    qrCodeData.value = {
      ...qrData,
      location_name: qrData.branch_name || 'Mobile Device',
      url: qrCodeUrl,
      imageUrl: null // Will be set after QR generation
    }
    
    // Generate visual QR code
    const imageUrl = await generateQRImage(qrCodeUrl)
    if (qrCodeData.value) {
      qrCodeData.value.imageUrl = imageUrl
    }
    
  } catch (error) {
    console.error('Error generating QR code:', error)
    qrCodeData.value = null
  } finally {
    qrCodeLoading.value = false
  }
}

const generateQRImage = async (url) => {
  try {
    console.log('Generating QR image for URL:', url)
    
    // Generate QR code as data URL
    const qrDataURL = await QRCode.toDataURL(url, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })
    
    console.log('QR Code data URL generated successfully')
    return qrDataURL
    
  } catch (error) {
    console.error('Error generating QR image:', error)
    return null
  }
}

const formatValidUntil = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  })
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

const checkCurrentStatus = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const response = await axios.get(`${API_BASE_URL}/attendance/my-attendance`, {
      headers: authHeaders(),
      params: { date: today }
    })
    
    if (response.data.success && response.data.data.length > 0) {
      const latestRecord = response.data.data[0]
      currentStatus.value = latestRecord.time_out ? 'checked-out' : 'checked-in'
    } else {
      currentStatus.value = 'checked-out'
    }
  } catch (error) {
    console.error('Error checking attendance status:', error)
    currentStatus.value = 'checked-out'
  }
}

// Test QR generation on mount
onMounted(() => {
  console.log('QRAttendanceModal mounted')
  console.log('QRCode library:', QRCode)
})

// Watch for modal open/close
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    console.log('Modal opened, checking status...')
    checkCurrentStatus()
    startLocationWatching()
    // Automatically check location when modal opens
    setTimeout(() => {
      checkLocation()
    }, 500) // Small delay to ensure modal is fully rendered
  } else {
    qrCodeData.value = null
    stopLocationWatching()
  }
})

// Cleanup when component unmounts
onUnmounted(() => {
  qrCodeData.value = null
  stopLocationWatching()
})
</script>

<style scoped>
.modal-box {
  max-height: 90vh;
  overflow-y: auto;
}

#qr-code canvas {
  border-radius: 8px;
}
</style>
