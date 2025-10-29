<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50 p-4"
    @click.self="closeModal"
  >
    <div class="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
      <!-- Modal Header -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-bold mb-2">Application Details</h2>
            <p class="text-blue-100">{{ application?.full_name || 'Loading...' }}</p>
          </div>
          <button
            @click="closeModal"
            class="text-white hover:text-blue-200 transition-colors p-2 rounded-full hover:bg-white/10"
          >
            <font-awesome-icon icon="fa-solid fa-times" class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- Modal Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex justify-center items-center py-12">
          <div class="loading loading-spinner loading-lg text-blue-600"></div>
          <span class="ml-3 text-gray-600">Loading application details...</span>
        </div>

        <!-- Application Details -->
        <div v-else-if="application" class="space-y-6">
          <!-- Personal Information Section -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <font-awesome-icon icon="fa-solid fa-user" class="mr-2 text-blue-600" />
              Personal Information
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <p class="text-gray-900 font-medium">{{ application.full_name }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <p class="text-gray-900">{{ application.email }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <p class="text-gray-900">{{ application.phone }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <p class="text-gray-900">{{ formatDate(application.date_of_birth) }}</p>
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <p class="text-gray-900">{{ application.address }}</p>
              </div>
            </div>
          </div>

          <!-- Professional Information Section -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <font-awesome-icon icon="fa-solid fa-briefcase" class="mr-2 text-blue-600" />
              Professional Information
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Position Applied For</label>
                <p class="text-gray-900 font-medium">{{ application.position_title }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <p class="text-gray-900">{{ application.department }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                <p class="text-gray-900">{{ application.experience_years }} years</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Expected Salary</label>
                <p class="text-gray-900">₱{{ formatNumber(application.expected_salary) }}</p>
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Skills & Qualifications</label>
                <p class="text-gray-900 whitespace-pre-line">{{ application.skills }}</p>
              </div>
            </div>
          </div>

          <!-- Additional Information Section -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <font-awesome-icon icon="fa-solid fa-info-circle" class="mr-2 text-blue-600" />
              Additional Information
            </h3>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Why do you want to work at Countryside Steakhouse?</label>
                <p class="text-gray-900 whitespace-pre-line">{{ application.motivation }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">When can you start?</label>
                <p class="text-gray-900">{{ application.availability }}</p>
              </div>
              <div v-if="application.additional_notes">
                <label class="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <p class="text-gray-900 whitespace-pre-line">{{ application.additional_notes }}</p>
              </div>
            </div>
          </div>

          <!-- Documents Section -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <font-awesome-icon icon="fa-solid fa-file-upload" class="mr-2 text-blue-600" />
              Submitted Documents
            </h3>
            
            <div class="space-y-4">
              <!-- Resume -->
              <div v-if="application.resume_path" class="flex items-center justify-between bg-white p-4 rounded-lg border">
                <div class="flex items-center">
                  <font-awesome-icon icon="fa-solid fa-file-pdf" class="w-8 h-8 text-red-500 mr-3" />
                  <div>
                    <p class="font-medium text-gray-900">Resume/CV</p>
                    <p class="text-sm text-gray-500">Required document</p>
                  </div>
                </div>
                <button
                  @click="downloadFile(application.resume_path, 'resume')"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  <font-awesome-icon icon="fa-solid fa-download" class="mr-2" />
                  Download
                </button>
              </div>

              <!-- Additional Documents -->
              <div v-if="application.additional_documents_path" class="flex items-center justify-between bg-white p-4 rounded-lg border">
                <div class="flex items-center">
                  <font-awesome-icon icon="fa-solid fa-file" class="w-8 h-8 text-blue-500 mr-3" />
                  <div>
                    <p class="font-medium text-gray-900">Additional Documents</p>
                    <p class="text-sm text-gray-500">Optional documents</p>
                  </div>
                </div>
                <button
                  @click="downloadFile(application.additional_documents_path, 'additional')"
                  class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  <font-awesome-icon icon="fa-solid fa-download" class="mr-2" />
                  Download
                </button>
              </div>

              <!-- No Documents Message -->
              <div v-if="!application.resume_path && !application.additional_documents_path" class="text-center py-8 text-gray-500">
                <font-awesome-icon icon="fa-solid fa-file-circle-xmark" class="w-12 h-12 mx-auto mb-2" />
                <p>No documents were submitted with this application.</p>
              </div>
            </div>
          </div>

          <!-- Application Status Section -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <font-awesome-icon icon="fa-solid fa-clipboard-check" class="mr-2 text-blue-600" />
              Application Status
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-semibold',
                    getStatusColor(application.status)
                  ]"
                >
                  {{ getStatusText(application.status) }}
                </span>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Application Date</label>
                <p class="text-gray-900">{{ formatDateTime(application.application_date) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div v-else class="text-center py-12">
          <div class="text-gray-500 mb-4">
            <font-awesome-icon icon="fa-solid fa-exclamation-triangle" class="w-16 h-16 mx-auto mb-4 text-gray-300" />
          </div>
          <h3 class="text-xl font-semibold mb-2 text-gray-900">Application Not Found</h3>
          <p class="text-gray-600">The requested application could not be found.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { apiConfig } from '../../config/api.js'

// Props
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  applicationId: {
    type: [String, Number],
    default: null
  }
})

// Emits
const emit = defineEmits(['close'])

// State
const application = ref(null)
const isLoading = ref(false)

// Methods
const closeModal = () => {
  emit('close')
}

const loadApplicationDetails = async () => {
  if (!props.applicationId) return

  try {
    isLoading.value = true
    
    const response = await fetch(`/api/job-applications/${props.applicationId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to load application details')
    }

    const result = await response.json()
    
    if (result.success && result.data) {
      application.value = result.data
    } else {
      application.value = null
    }
  } catch (error) {
    console.error('Error loading application details:', error)
    application.value = null
  } finally {
    isLoading.value = false
  }
}

const buildFileUrl = (path) => {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  // Build backend origin from API base (remove trailing /api)
  const backendBase = apiConfig.baseURL.replace(/\/api\/?$/, '')
  return `${backendBase}${path.startsWith('/') ? path : '/' + path}`
}

const downloadFile = (filePath, type) => {
  if (!filePath) return
  const url = buildFileUrl(filePath)

  const nameFromPath = (filePath.split('/').pop() || '').trim()
  const safeName = (application.value?.full_name || 'applicant').replace(/\s+/g, '_')
  const filename = nameFromPath || `${type}_${safeName}`

  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const formatDate = (dateString) => {
  if (!dateString) return 'Not provided'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid date'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila'
  }).format(date)
}

const formatDateTime = (dateString) => {
  if (!dateString) return 'Not provided'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Invalid date'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true, // Use 12-hour format (AM/PM)
    timeZone: 'Asia/Manila'
  }).format(date)
}

const formatNumber = (number) => {
  if (!number) return '0'
  return parseFloat(number).toLocaleString('en-US')
}

const getStatusColor = (status) => {
  const colors = {
    'new': 'bg-yellow-100 text-yellow-800',
    'reviewing': 'bg-blue-100 text-blue-800',
    'shortlisted': 'bg-purple-100 text-purple-800',
    'rejected': 'bg-red-100 text-red-800',
    'hired': 'bg-green-100 text-green-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const getStatusText = (status) => {
  const texts = {
    'new': 'New',
    'reviewing': 'Under Review',
    'shortlisted': 'Shortlisted',
    'rejected': 'Rejected',
    'hired': 'Hired'
  }
  return texts[status] || 'Unknown'
}

// Watch for modal open and application ID changes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.applicationId) {
    loadApplicationDetails()
  }
})

watch(() => props.applicationId, (newId) => {
  if (props.isOpen && newId) {
    loadApplicationDetails()
  }
})
</script>

<style scoped>
/* Custom scrollbar for modal content */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Smooth transitions */
.transition-colors {
  transition: all 0.3s ease;
}
</style>

