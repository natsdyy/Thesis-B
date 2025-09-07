<template>
  <div class="attendance-management">
    <div class="page-header">
      <h1 class="text-2xl font-bold text-gray-900">Attendance Management</h1>
      <p class="text-gray-600">Manage employee attendance and QR codes</p>
    </div>

    <!-- QR Code Management Section -->
    <div class="card mb-6">
      <div class="card-header">
        <h2 class="text-xl font-semibold">QR Code Management</h2>
        <button 
          @click="showCreateQRModal = true" 
          class="btn btn-primary btn-sm"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Create QR Code
        </button>
      </div>
      
      <div class="card-body">
        <div v-if="attendanceStore.loading" class="text-center py-4">
          <span class="loading loading-spinner loading-md"></span>
          <p class="mt-2">Loading QR codes...</p>
        </div>
        
        <div v-else-if="attendanceStore.qrCodes.length === 0" class="text-center py-8">
          <p class="text-gray-500">No QR codes found. Create one to get started.</p>
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            v-for="qrCode in attendanceStore.qrCodes" 
            :key="qrCode.id"
            class="qr-code-card"
          >
            <div class="qr-code-header">
              <h3 class="font-semibold">{{ qrCode.location_name }}</h3>
              <div class="qr-code-actions">
                <button 
                  @click="editQRCode(qrCode)"
                  class="btn btn-ghost btn-xs"
                >
                  Edit
                </button>
                <button 
                  @click="deleteQRCode(qrCode.id)"
                  class="btn btn-ghost btn-xs text-error"
                >
                  Delete
                </button>
              </div>
            </div>
            
            <p v-if="qrCode.description" class="text-sm text-gray-600 mb-3">
              {{ qrCode.description }}
            </p>
            
                         <div class="qr-code-display">
               <QRCodeGenerator :qr-code-data="qrCode" />
             </div>
            
            <div class="qr-code-status">
              <span 
                :class="qrCode.is_active ? 'badge-success' : 'badge-error'"
                class="badge"
              >
                {{ qrCode.is_active ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Attendance Records Section -->
    <div class="card">
      <div class="card-header">
        <h2 class="text-xl font-semibold">Attendance Records</h2>
        <div class="flex gap-2">
          <input 
            v-model="reportStartDate"
            type="date" 
            class="input input-bordered input-sm"
            @change="fetchAttendanceReport"
          />
          <input 
            v-model="reportEndDate"
            type="date" 
            class="input input-bordered input-sm"
            @change="fetchAttendanceReport"
          />
          <button 
            @click="fetchAttendanceReport"
            class="btn btn-outline btn-sm"
          >
            Generate Report
          </button>
        </div>
      </div>
      
      <div class="card-body">
        <div v-if="reportLoading" class="text-center py-4">
          <span class="loading loading-spinner loading-md"></span>
          <p class="mt-2">Loading report...</p>
        </div>
        
        <div v-else-if="attendanceReport.length === 0" class="text-center py-8">
          <p class="text-gray-500">No attendance records found for the selected period.</p>
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Location</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Hours Worked</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in attendanceReport" :key="record.id">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="avatar placeholder">
                      <div class="bg-neutral text-neutral-content rounded-full w-8">
                        <span class="text-xs">{{ record.first_name?.charAt(0) }}{{ record.last_name?.charAt(0) }}</span>
                      </div>
                    </div>
                    <div>
                      <div class="font-medium">{{ record.first_name }} {{ record.last_name }}</div>
                      <div class="text-sm text-gray-500">{{ record.employee_id }}</div>
                    </div>
                  </div>
                </td>
                <td>{{ formatDate(record.created_at) }}</td>
                <td>{{ record.location_name || 'N/A' }}</td>
                <td>{{ record.time_in ? formatTime(record.time_in) : 'N/A' }}</td>
                <td>{{ record.time_out ? formatTime(record.time_out) : 'N/A' }}</td>
                <td>{{ record.hours_worked || 'N/A' }}</td>
                <td>
                  <span 
                    :class="getStatusClass(record.status)"
                    class="badge"
                  >
                    {{ record.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create QR Code Modal -->
    <div v-if="showCreateQRModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Create New QR Code</h3>
        
        <form @submit.prevent="createQRCode">
          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text">Location Name</span>
            </label>
            <input 
              v-model="newQRCode.location_name"
              type="text" 
              class="input input-bordered"
              placeholder="e.g., Main Office, Branch 1"
              required
            />
          </div>
          
          <div class="form-control mb-4">
            <label class="label">
              <span class="label-text">Description (Optional)</span>
            </label>
            <textarea 
              v-model="newQRCode.description"
              class="textarea textarea-bordered"
              placeholder="Additional details about this location"
              rows="3"
            ></textarea>
          </div>
          
          <div class="modal-action">
            <button 
              type="button"
              @click="closeCreateQRModal"
              class="btn btn-ghost"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="btn btn-primary"
              :disabled="attendanceStore.loading"
            >
              <span v-if="attendanceStore.loading" class="loading loading-spinner loading-sm"></span>
              Create QR Code
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAttendanceStore } from '../../stores/attendanceStore';
import QRCodeGenerator from '../../components/QRCodeGenerator.vue';

const attendanceStore = useAttendanceStore();

// State
const showCreateQRModal = ref(false);
const newQRCode = ref({
  location_name: '',
  description: ''
});
const reportStartDate = ref('');
const reportEndDate = ref('');
const reportLoading = ref(false);
const attendanceReport = ref([]);

// Computed
const reportStartDateComputed = computed(() => {
  return reportStartDate.value || new Date().toISOString().split('T')[0];
});

const reportEndDateComputed = computed(() => {
  return reportEndDate.value || new Date().toISOString().split('T')[0];
});

// Methods
const createQRCode = async () => {
  try {
    await attendanceStore.createQRCode(
      newQRCode.value.location_name,
      newQRCode.value.description
    );
    
    closeCreateQRModal();
    
    // Show success message
    alert('QR code created successfully!');
  } catch (error) {
    alert('Failed to create QR code: ' + error.message);
  }
};

const closeCreateQRModal = () => {
  showCreateQRModal.value = false;
  newQRCode.value = {
    location_name: '',
    description: ''
  };
};

const editQRCode = (qrCode) => {
  // TODO: Implement edit functionality
  alert('Edit functionality coming soon!');
};

const deleteQRCode = async (id) => {
  if (confirm('Are you sure you want to delete this QR code?')) {
    try {
      await attendanceStore.deleteQRCode(id);
      alert('QR code deleted successfully!');
    } catch (error) {
      alert('Failed to delete QR code: ' + error.message);
    }
  }
};

const fetchAttendanceReport = async () => {
  try {
    reportLoading.value = true;
    const report = await attendanceStore.getAttendanceReport(
      null, // All users
      reportStartDateComputed.value,
      reportEndDateComputed.value
    );
    attendanceReport.value = report;
  } catch (error) {
    alert('Failed to fetch attendance report: ' + error.message);
  } finally {
    reportLoading.value = false;
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

const formatTime = (timeString) => {
  return new Date(timeString).toLocaleTimeString();
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
    await attendanceStore.fetchQRCodes();
    
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    reportStartDate.value = startDate.toISOString().split('T')[0];
    reportEndDate.value = endDate.toISOString().split('T')[0];
    
    await fetchAttendanceReport();
  } catch (error) {
    console.error('Failed to initialize attendance management:', error);
  }
});
</script>

<style scoped>
.attendance-management {
  max-width: 1200px;
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

.qr-code-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
}

.qr-code-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.qr-code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.qr-code-actions {
  display: flex;
  gap: 0.5rem;
}

.qr-code-display {
  text-align: center;
  margin: 1rem 0;
}

.qr-placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
  background: white;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.qr-code-status {
  text-align: center;
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
</style>
