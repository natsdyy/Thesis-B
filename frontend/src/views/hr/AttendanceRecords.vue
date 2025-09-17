<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold">Attendance Records</h1>
      <div class="flex gap-2">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search employees..." 
          class="input input-bordered input-sm w-64"
        />
        <select v-model="selectedDate" class="select select-bordered select-sm">
          <option value="">All Dates</option>
          <option v-for="date in availableDates" :key="date" :value="date">
            {{ formatDate(date) }}
          </option>
        </select>
        <button @click="refreshRecords" class="btn btn-success btn-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Refresh
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="stat bg-base-100 shadow-lg rounded-lg">
        <div class="stat-figure text-primary">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
          </svg>
        </div>
        <div class="stat-title">Total Records</div>
        <div class="stat-value text-primary">{{ totalRecords }}</div>
        <div class="stat-desc">All time</div>
      </div>

      <div class="stat bg-base-100 shadow-lg rounded-lg">
        <div class="stat-figure text-success">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="stat-title">Present Today</div>
        <div class="stat-value text-success">{{ presentToday }}</div>
        <div class="stat-desc">{{ attendancePercentage }}% attendance rate</div>
      </div>

      <div class="stat bg-base-100 shadow-lg rounded-lg">
        <div class="stat-figure text-warning">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="stat-title">Late Arrivals</div>
        <div class="stat-value text-warning">{{ lateArrivals }}</div>
        <div class="stat-desc">This week</div>
      </div>

      <div class="stat bg-base-100 shadow-lg rounded-lg">
        <div class="stat-figure text-error">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <div class="stat-title">Absent Today</div>
        <div class="stat-value text-error">{{ absentToday }}</div>
        <div class="stat-desc">No time-in recorded</div>
      </div>
    </div>

    <!-- Attendance Records Table -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Hours Worked</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in filteredRecords" :key="record.id">
                <td>
                  <div class="flex items-center space-x-3">
                    <div class="avatar">
                      <div class="mask mask-squircle w-12 h-12">
                        <img v-if="record.photo_url" :src="record.photo_url" :alt="record.employee_name" />
                        <div v-else class="bg-primary text-primary-content flex items-center justify-center">
                          {{ getInitials(record.employee_name) }}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div class="font-bold">{{ record.employee_name || 'Unknown Employee' }}</div>
                      <div class="text-sm opacity-50">{{ record.employee_id || 'N/A' }}</div>
                    </div>
                  </div>
                </td>
                <td>{{ formatDate(record.created_at) }}</td>
                <td>
                  <span v-if="record.time_in" class="font-mono">{{ formatTime(record.time_in) }}</span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td>
                  <span v-if="record.time_out" class="font-mono">{{ formatTime(record.time_out) }}</span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td>
                  <span v-if="record.hours_worked" class="font-mono">{{ record.hours_worked }}h</span>
                  <span v-else class="text-gray-400">-</span>
                </td>
                <td>
                  <span class="text-sm">{{ record.location_name || 'N/A' }}</span>
                </td>
                <td>
                  <div class="badge" :class="getStatusBadgeClass(record.status)">
                    {{ record.status || 'Present' }}
                  </div>
                </td>
                <td>
                  <div class="flex gap-1">
                    <button @click="viewRecord(record)" class="btn btn-ghost btn-xs">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    </button>
                    <button @click="editRecord(record)" class="btn btn-ghost btn-xs">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredRecords.length === 0">
                <td colspan="8" class="text-center py-8 text-gray-500">
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

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="flex justify-center mt-6">
          <div class="btn-group">
            <button 
              @click="currentPage = Math.max(1, currentPage - 1)" 
              :disabled="currentPage === 1"
              class="btn btn-sm"
            >
              «
            </button>
            <button 
              v-for="page in visiblePages" 
              :key="page"
              @click="currentPage = page"
              :class="['btn btn-sm', page === currentPage ? 'btn-active' : '']"
            >
              {{ page }}
            </button>
            <button 
              @click="currentPage = Math.min(totalPages, currentPage + 1)" 
              :disabled="currentPage === totalPages"
              class="btn btn-sm"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '../../stores/authStore'
import { apiConfig } from '../../config/api'
import axios from 'axios'

// Auth store
const authStore = useAuthStore()

// Reactive data
const isLoading = ref(false)
const searchQuery = ref('')
const selectedDate = ref('')
const currentPage = ref(1)
const recordsPerPage = 20

// Attendance data
const attendanceRecords = ref([])
const totalRecords = ref(0)
const presentToday = ref(0)
const lateArrivals = ref(0)
const absentToday = ref(0)

// API Configuration
const API_BASE_URL = apiConfig.baseURL
const authHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Computed
const filteredRecords = computed(() => {
  let filtered = attendanceRecords.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(record => 
      record.employee_name?.toLowerCase().includes(query) ||
      record.employee_id?.toLowerCase().includes(query)
    )
  }

  if (selectedDate.value) {
    filtered = filtered.filter(record => 
      record.created_at?.startsWith(selectedDate.value)
    )
  }

  // Pagination
  const start = (currentPage.value - 1) * recordsPerPage
  const end = start + recordsPerPage
  return filtered.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(attendanceRecords.value.length / recordsPerPage)
})

const visiblePages = computed(() => {
  const pages = []
  const start = Math.max(1, currentPage.value - 2)
  const end = Math.min(totalPages.value, currentPage.value + 2)
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

const availableDates = computed(() => {
  const dates = [...new Set(attendanceRecords.value.map(r => r.created_at?.split('T')[0]))]
    .filter(Boolean)
    .sort()
    .reverse()
  return dates
})

const attendancePercentage = computed(() => {
  return totalRecords.value === 0 ? 0 : Math.round((presentToday.value / totalRecords.value) * 100)
})

// Methods
const fetchAttendanceRecords = async () => {
  try {
    isLoading.value = true
    const response = await axios.get(`${API_BASE_URL}/attendance/report`, {
      headers: authHeaders(),
      params: {
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      }
    })
    
    if (response.data.success) {
      attendanceRecords.value = response.data.data || []
      totalRecords.value = attendanceRecords.value.length
      calculateStats()
    } else {
      console.error('API returned error:', response.data.message)
      attendanceRecords.value = []
    }
  } catch (error) {
    console.error('Error fetching attendance records:', error)
    attendanceRecords.value = []
  } finally {
    isLoading.value = false
  }
}

const calculateStats = () => {
  const today = new Date().toISOString().split('T')[0]
  const todayRecords = attendanceRecords.value.filter(record => 
    record.created_at?.startsWith(today)
  )
  
  presentToday.value = todayRecords.filter(record => record.time_in).length
  lateArrivals.value = todayRecords.filter(record => {
    if (!record.time_in) return false
    const timeIn = new Date(record.time_in)
    const expectedTime = new Date()
    expectedTime.setHours(9, 0, 0, 0) // 9:00 AM
    return timeIn > expectedTime
  }).length
  absentToday.value = totalRecords.value - presentToday.value
}

const refreshRecords = () => {
  fetchAttendanceRecords()
}

const viewRecord = (record) => {
  console.log('View record:', record)
  // Implement view record functionality
}

const editRecord = (record) => {
  console.log('Edit record:', record)
  // Implement edit record functionality
}

const getInitials = (name) => {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const getStatusBadgeClass = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'present':
      return 'badge-success'
    case 'late':
      return 'badge-warning'
    case 'absent':
      return 'badge-error'
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

// Watchers
watch(selectedDate, (newDate) => {
  if (newDate) {
    fetchAttendanceByDateRange(newDate, newDate)
  } else {
    fetchAttendanceRecords()
  }
})

// Lifecycle
onMounted(() => {
  fetchAttendanceRecords()
})
</script>

<style scoped>
/* Add any custom styles here */
</style>
