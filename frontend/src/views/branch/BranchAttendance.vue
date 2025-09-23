<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold">My Attendance</h1>
      <div class="text-sm text-base-content/70">
        Last updated: {{ new Date().toLocaleDateString() }}
      </div>
    </div>

    <!-- Current Status Card -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title text-2xl mb-4">Current Status</h2>
        <div class="alert " :class="currentStatus === 'checked-in' ? 'alert-success border-none' : 'bg-primaryColor text-white border-none'">
          <Clock class="w-5 h-5" />
          <div>
            <div class="font-medium ">Current Status</div>
            <div class="text-sm opacity-80">
              {{ currentStatus === 'checked-in' ? 'Currently Checked In' : 'Ready to Check In' }}
            </div>
            <div v-if="currentStatus === 'checked-in' && lastTimeIn" class="text-xs mt-1">
              Since: {{ formatTime(lastTimeIn) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- QR Code Generator -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h3 class="card-title">QR Code Attendance</h3>
          <p class="text-sm text-base-content/70 mb-4">
            Generate QR codes for time-in and time-out
          </p>
          <button @click="openQRModal" class="btn bg-primaryColor text-white font-thin w-full hover:bg-primaryColor/80">
            <Clock class="w-4 h-4 mr-2" />
            Open QR Generator
          </button>
        </div>
      </div>

      <!-- Manual Time Entry -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h3 class="card-title">Manual Entry</h3>
          <p class="text-sm text-base-content/70 mb-4">
            Record attendance manually
          </p>
          <button @click="openManualModal" class="btn btn-outline font-thin w-full hover:bg-base-200">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Manual Entry
          </button>
        </div>
      </div>
    </div>

    <!-- My Attendance History -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="flex justify-between items-center mb-4">
          <h3 class="card-title">My Attendance History</h3>
          <button @click="refreshAttendance" class="btn btn-sm btn-outline font-thin">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Refresh
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Event Type</th>
                <th>Time</th>
                <th>Location</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in attendanceHistory" :key="record.id">
                <td>{{ formatDate(record.created_at) }}</td>
                <td>
                  <div class="badge" :class="getEventTypeBadgeClass(record.event_type)">
                    <svg v-if="record.event_type === 'time-in'" class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    <svg v-else class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                    </svg>
                    {{ record.event_type === 'time-in' ? 'Time In' : 'Time Out' }}
                  </div>
                </td>
                <td>
                  <span class="font-mono text-sm">{{ formatTime(record.created_at) }}</span>
                </td>
                <td>
                  <span class="text-sm">{{ record.location_name || 'N/A' }}</span>
                </td>
                <td>
                  <span v-if="record.duration" class="font-mono text-sm">{{ record.duration }}</span>
                  <span v-else class="text-gray-400">-</span>
                </td>
              </tr>
              <tr v-if="attendanceHistory.length === 0">
                <td colspan="5" class="text-center py-8 text-gray-500">
                  <div class="flex flex-col items-center space-y-2">
                    <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p>No attendance records found</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- QR Attendance Modal -->
    <QRAttendanceModal 
      :isOpen="showQRModal" 
      @close="closeQRModal"
      @viewRecords="viewAttendanceRecords"
    />

    <!-- Manual Entry Modal -->
    <div v-if="showManualModal" class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4">Manual Attendance Entry</h3>
        <form @submit.prevent="submitManualEntry" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Action</span>
            </label>
            <select v-model="manualEntry.action" class="select select-bordered w-full" required>
              <option value="">Select Action</option>
              <option value="time-in">Time In</option>
              <option value="time-out">Time Out</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Location</span>
            </label>
            <input 
              v-model="manualEntry.location" 
              type="text" 
              placeholder="Enter location"
              class="input input-bordered w-full"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Notes (Optional)</span>
            </label>
            <textarea 
              v-model="manualEntry.notes" 
              placeholder="Additional notes..."
              class="textarea textarea-bordered w-full"
              rows="3"
            ></textarea>
          </div>

          <div class="modal-action">
            <button type="button" @click="closeManualModal" class="btn btn-ghost">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="loading loading-spinner loading-sm"></span>
              {{ isSubmitting ? 'Submitting...' : 'Submit' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { useAttendanceStore } from '../../stores/attendanceStore'
import { apiConfig } from '../../config/api'
import axios from 'axios'
import QRAttendanceModal from '../../components/QRAttendanceModal.vue'
import { Clock } from 'lucide-vue-next'

// Stores
const authStore = useAuthStore()
const attendanceStore = useAttendanceStore()

// Reactive data
const isLoading = ref(false)
const isSubmitting = ref(false)
const showQRModal = ref(false)
const showManualModal = ref(false)
const currentStatus = ref('checked-out')
const lastTimeIn = ref(null)
const attendanceHistory = ref([])

// Manual entry form
const manualEntry = ref({
  action: '',
  location: '',
  notes: ''
})

// API Configuration
const API_BASE_URL = apiConfig.baseURL
const authHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Methods
const openQRModal = () => {
  showQRModal.value = true
}

const closeQRModal = () => {
  showQRModal.value = false
}

const openManualModal = () => {
  showManualModal.value = true
}

const closeManualModal = () => {
  showManualModal.value = false
  manualEntry.value = { action: '', location: '', notes: '' }
}

const viewAttendanceRecords = () => {
  closeQRModal()
  // For branch employees, we'll show their own records in this component
  fetchAttendanceHistory()
}

const fetchAttendanceHistory = async () => {
  try {
    isLoading.value = true
    const today = new Date().toISOString().split('T')[0]
    const response = await axios.get(`${API_BASE_URL}/attendance/history`, {
      headers: authHeaders(),
      params: {
        start_date: today,
        end_date: today,
        employee_id: authStore.user?.employee_id
      }
    })
    
    if (response.data.success) {
      attendanceHistory.value = response.data.data || []
    }
  } catch (error) {
    console.error('Error fetching attendance history:', error)
    attendanceHistory.value = []
  } finally {
    isLoading.value = false
  }
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
      lastTimeIn.value = latestRecord.time_in
    } else {
      currentStatus.value = 'checked-out'
    }
  } catch (error) {
    console.error('Error checking attendance status:', error)
    currentStatus.value = 'checked-out'
  }
}

const submitManualEntry = async () => {
  try {
    isSubmitting.value = true
    
    if (manualEntry.value.action === 'time-in') {
      await attendanceStore.timeIn('MANUAL_ENTRY', manualEntry.value.location)
    } else if (manualEntry.value.action === 'time-out') {
      await attendanceStore.timeOut()
    }
    
    closeManualModal()
    await Promise.all([checkCurrentStatus(), fetchAttendanceHistory()])
  } catch (error) {
    console.error('Error submitting manual entry:', error)
  } finally {
    isSubmitting.value = false
  }
}

const refreshAttendance = () => {
  Promise.all([checkCurrentStatus(), fetchAttendanceHistory()])
}

const getEventTypeBadgeClass = (eventType) => {
  switch (eventType) {
    case 'time-in':
      return 'badge-success'
    case 'time-out':
      return 'badge-warning'
    default:
      return 'badge-ghost'
  }
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatTime = (timeString) => {
  if (!timeString) return 'N/A'
  return new Date(timeString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

// Lifecycle
onMounted(() => {
  Promise.all([checkCurrentStatus(), fetchAttendanceHistory()])
})
</script>

<style scoped>
/* Add any custom styles here */
</style>
