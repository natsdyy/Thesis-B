<template>
  <div class="employee-attendance">
    <div class="page-header">
      <h1 class="text-2xl font-bold text-gray-900">Employee Attendance</h1>
      <p class="text-gray-600">Scan QR code to time in or time out</p>
    </div>

    <!-- Today's Attendance Status -->
    <div class="card mb-6">
      <div class="card-header">
        <h2 class="text-xl font-semibold">Today's Status</h2>
        <div class="flex items-center gap-2">
          <div class="badge badge-lg" :class="getStatusBadgeClass()">
            {{ getStatusText() }}
          </div>
        </div>
      </div>
      
      <div class="card-body">
        <div v-if="attendanceStore.loading" class="text-center py-4">
          <span class="loading loading-spinner loading-md"></span>
          <p class="mt-2">Loading attendance status...</p>
        </div>
        
        <div v-else-if="attendanceStore.todayAttendance" class="attendance-status">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="status-item">
              <div class="status-label">Time In</div>
              <div class="status-value">
                {{ attendanceStore.todayAttendance.time_in ? formatTime(attendanceStore.todayAttendance.time_in) : 'Not recorded' }}
              </div>
            </div>
            
            <div class="status-item">
              <div class="status-label">Time Out</div>
              <div class="status-value">
                {{ attendanceStore.todayAttendance.time_out ? formatTime(attendanceStore.todayAttendance.time_out) : 'Not recorded' }}
              </div>
            </div>
            
            <div class="status-item">
              <div class="status-label">Hours Worked</div>
              <div class="status-value">
                {{ attendanceStore.todayAttendance.hours_worked || 'N/A' }}
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="text-center py-8">
          <p class="text-gray-500">No attendance record for today.</p>
        </div>
      </div>
    </div>

    <!-- QR Scanner Section -->
    <div class="card mb-6">
      <div class="card-header">
        <h2 class="text-xl font-semibold">Scan QR Code</h2>
        <div class="flex gap-2">
          <button 
            v-if="attendanceStore.canTimeIn"
            @click="showQRScanner = true"
            class="btn btn-success btn-sm"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Time In
          </button>
          
          <button 
            v-if="attendanceStore.canTimeOut"
            @click="timeOut"
            class="btn btn-warning btn-sm"
            :disabled="attendanceStore.loading"
          >
            <span v-if="attendanceStore.loading" class="loading loading-spinner loading-sm"></span>
            <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Time Out
          </button>
        </div>
      </div>
      
      <div class="card-body">
        <div v-if="!showQRScanner" class="scanner-placeholder">
          <div class="scanner-icon">
            <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold mb-2">Ready to Scan</h3>
          <p class="text-gray-600 mb-4">Click "Time In" to start scanning QR code</p>
          <button 
            @click="showQRScanner = true"
            class="btn btn-primary"
            :disabled="!attendanceStore.canTimeIn"
          >
            Start Scanner
          </button>
        </div>
        
        <div v-else class="qr-scanner-section">
          <QRScanner 
            :on-scan="handleQRScan"
            @scan="handleQRScan"
            @error="handleScannerError"
          />
          
          <div class="scanner-actions mt-4">
            <button 
              @click="showQRScanner = false"
              class="btn btn-outline"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Manual QR Input (for testing) -->
    <div class="card mb-6">
      <div class="card-header">
        <h2 class="text-xl font-semibold">Manual QR Input</h2>
        <p class="text-sm text-gray-600">For testing purposes</p>
      </div>
      
      <div class="card-body">
        <div class="form-control">
          <label class="label">
            <span class="label-text">QR Code</span>
          </label>
          <div class="flex gap-2">
            <input 
              v-model="manualQRCode"
              type="text" 
              class="input input-bordered flex-1"
              placeholder="Enter QR code manually"
            />
            <button 
              @click="submitManualQR"
              class="btn btn-primary"
              :disabled="!manualQRCode.trim() || attendanceStore.loading"
            >
              <span v-if="attendanceStore.loading" class="loading loading-spinner loading-sm"></span>
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Attendance Records -->
    <div class="card">
      <div class="card-header">
        <h2 class="text-xl font-semibold">Recent Attendance</h2>
        <button 
          @click="fetchMyAttendance"
          class="btn btn-outline btn-sm"
        >
          Refresh
        </button>
      </div>
      
      <div class="card-body">
        <div v-if="attendanceStore.loading" class="text-center py-4">
          <span class="loading loading-spinner loading-md"></span>
          <p class="mt-2">Loading attendance records...</p>
        </div>
        
        <div v-else-if="attendanceStore.attendanceRecords.length === 0" class="text-center py-8">
          <p class="text-gray-500">No attendance records found.</p>
        </div>
        
        <div v-else class="space-y-4">
          <div 
            v-for="record in attendanceStore.attendanceRecords.slice(0, 10)" 
            :key="record.id"
            class="attendance-record"
          >
            <div class="record-header">
              <div class="record-date">{{ formatDate(record.created_at) }}</div>
              <div class="record-status">
                <span 
                  :class="getStatusClass(record.status)"
                  class="badge"
                >
                  {{ record.status }}
                </span>
              </div>
            </div>
            
            <div class="record-details">
              <div class="detail-item">
                <span class="detail-label">Time In:</span>
                <span class="detail-value">{{ record.time_in ? formatTime(record.time_in) : 'N/A' }}</span>
              </div>
              
              <div class="detail-item">
                <span class="detail-label">Time Out:</span>
                <span class="detail-value">{{ record.time_out ? formatTime(record.time_out) : 'N/A' }}</span>
              </div>
              
              <div class="detail-item">
                <span class="detail-label">Hours:</span>
                <span class="detail-value">{{ record.hours_worked || 'N/A' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="successMessage" class="alert alert-success mt-4">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <div>
        <h4 class="font-semibold">Success!</h4>
        <p>{{ successMessage }}</p>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-error mt-4">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
      <div>
        <h4 class="font-semibold">Error</h4>
        <p>{{ errorMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useAttendanceStore } from '../../stores/attendanceStore';
import QRScanner from '../../components/QRScanner.vue';

const attendanceStore = useAttendanceStore();

// State
const showQRScanner = ref(false);
const manualQRCode = ref('');
const successMessage = ref('');
const errorMessage = ref('');

// Methods
const handleQRScan = async (qrData) => {
  try {
    const result = await attendanceStore.timeIn(qrData.qr_code);
    successMessage.value = result.message;
    errorMessage.value = '';
    showQRScanner.value = false;
    
    // Clear success message after 5 seconds
    setTimeout(() => {
      successMessage.value = '';
    }, 5000);
  } catch (error) {
    errorMessage.value = error.message;
    successMessage.value = '';
    
    // Clear error message after 5 seconds
    setTimeout(() => {
      errorMessage.value = '';
    }, 5000);
  }
};

const handleScannerError = (error) => {
  errorMessage.value = error;
  successMessage.value = '';
  
  // Clear error message after 5 seconds
  setTimeout(() => {
    errorMessage.value = '';
  }, 5000);
};

const timeOut = async () => {
  try {
    const result = await attendanceStore.timeOut();
    successMessage.value = result.message;
    errorMessage.value = '';
    
    // Clear success message after 5 seconds
    setTimeout(() => {
      successMessage.value = '';
    }, 5000);
  } catch (error) {
    errorMessage.value = error.message;
    successMessage.value = '';
    
    // Clear error message after 5 seconds
    setTimeout(() => {
      errorMessage.value = '';
    }, 5000);
  }
};

const submitManualQR = async () => {
  if (!manualQRCode.value.trim()) return;
  
  try {
    const result = await attendanceStore.timeIn(manualQRCode.value.trim());
    successMessage.value = result.message;
    errorMessage.value = '';
    manualQRCode.value = '';
    
    // Clear success message after 5 seconds
    setTimeout(() => {
      successMessage.value = '';
    }, 5000);
  } catch (error) {
    errorMessage.value = error.message;
    successMessage.value = '';
    
    // Clear error message after 5 seconds
    setTimeout(() => {
      errorMessage.value = '';
    }, 5000);
  }
};

const fetchMyAttendance = async () => {
  try {
    await attendanceStore.fetchMyAttendance();
  } catch (error) {
    errorMessage.value = 'Failed to fetch attendance records: ' + error.message;
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

const formatTime = (timeString) => {
  return new Date(timeString).toLocaleTimeString();
};

const getStatusBadgeClass = () => {
  if (!attendanceStore.todayAttendance) return 'badge-neutral';
  
  if (attendanceStore.todayAttendance.time_out) {
    return 'badge-success';
  } else if (attendanceStore.todayAttendance.time_in) {
    return 'badge-warning';
  } else {
    return 'badge-error';
  }
};

const getStatusText = () => {
  if (!attendanceStore.todayAttendance) return 'No Record';
  
  if (attendanceStore.todayAttendance.time_out) {
    return 'Completed';
  } else if (attendanceStore.todayAttendance.time_in) {
    return 'Working';
  } else {
    return 'Not Started';
  }
};

const getStatusClass = (status) => {
  switch (status) {
    case 'present':
      return 'badge-success';
    case 'late':
      return 'badge-warning';
    case 'absent':
      return 'badge-error';
    default:
      return 'badge-neutral';
  }
};

// Lifecycle
onMounted(async () => {
  try {
    await attendanceStore.fetchTodayAttendance();
    await fetchMyAttendance();
  } catch (error) {
    console.error('Failed to initialize employee attendance:', error);
  }
});

onUnmounted(() => {
  // Clear any pending timeouts
  successMessage.value = '';
  errorMessage.value = '';
});
</script>

<style scoped>
.employee-attendance {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.page-header {
  margin-bottom: 2rem;
}

.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-body {
  padding: 1.5rem;
}

.attendance-status {
  padding: 1rem 0;
}

.status-item {
  text-align: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.status-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.status-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.scanner-placeholder {
  text-align: center;
  padding: 2rem;
}

.scanner-icon {
  margin-bottom: 1rem;
}

.qr-scanner-section {
  padding: 1rem 0;
}

.scanner-actions {
  text-align: center;
}

.attendance-record {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.record-date {
  font-weight: 600;
  color: #111827;
}

.record-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
}

.badge-success {
  background-color: #10b981;
  color: white;
}

.badge-warning {
  background-color: #f59e0b;
  color: white;
}

.badge-error {
  background-color: #ef4444;
  color: white;
}

.badge-neutral {
  background-color: #6b7280;
  color: white;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .employee-attendance {
    padding: 0.5rem;
  }
  
  .card-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .record-details {
    grid-template-columns: 1fr;
  }
}
</style>
