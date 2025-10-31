<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50 p-4"
    @click.self="closeModal"
  >
    <div class="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
      <!-- Modal Header -->
      <div class="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-bold mb-2">Application Details</h2>
            <p class="text-green-100">{{ application?.full_name || 'Loading...' }}</p>
          </div>
          <button
            @click="closeModal"
            class="text-white hover:text-green-200 transition-colors p-2 rounded-full hover:bg-white/10"
          >
            <font-awesome-icon icon="fa-solid fa-times" class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- Modal Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
        <!-- Loading State -->
        <div v-if="isLoading" class="flex justify-center items-center py-12">
          <div class="loading loading-spinner loading-lg text-green-600"></div>
          <span class="ml-3 text-gray-600">Loading application details...</span>
        </div>

        <!-- Application Details -->
        <div v-else-if="application" class="space-y-6">
          <!-- Personal Information Section -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <font-awesome-icon icon="fa-solid fa-user" class="mr-2 text-green-600" />
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
                <p class="text-gray-900">{{ formatPhoneNumber(application.phone) }}</p>
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
              <font-awesome-icon icon="fa-solid fa-briefcase" class="mr-2 text-green-600" />
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
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">Skills & Qualifications</label>
                <p class="text-gray-900 whitespace-pre-line">{{ application.skills }}</p>
              </div>
            </div>
          </div>

          <!-- Documents Section -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <font-awesome-icon icon="fa-solid fa-file-upload" class="mr-2 text-green-600" />
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
                <div class="flex gap-2">
                  <button
                    @click="viewFile(application.resume_path, 'resume', 'Resume')"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    <font-awesome-icon icon="fa-solid fa-eye" class="mr-2" />
                    View
                  </button>
                  <button
                    @click="downloadFile(application.resume_path, 'resume')"
                    class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    <font-awesome-icon icon="fa-solid fa-download" class="mr-2" />
                    Download
                  </button>
                </div>
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
                <div class="flex gap-2">
                  <button
                    @click="viewFile(application.additional_documents_path, 'additional', 'Additional Documents')"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    <font-awesome-icon icon="fa-solid fa-eye" class="mr-2" />
                    View
                  </button>
                  <button
                    @click="downloadFile(application.additional_documents_path, 'additional')"
                    class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    <font-awesome-icon icon="fa-solid fa-download" class="mr-2" />
                    Download
                  </button>
                </div>
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
              <font-awesome-icon icon="fa-solid fa-clipboard-check" class="mr-2 text-green-600" />
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

    <!-- Document Preview Modal -->
    <div
      v-if="showDocumentPreview && previewingDocument"
      class="fixed inset-0 backdrop-blur-md bg-black/50 flex items-center justify-center z-[60]"
      @click.self="closeDocumentPreview"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div class="flex items-center gap-3">
            <font-awesome-icon 
              :icon="isPdfFile(previewingDocument.url) ? 'fa-solid fa-file-pdf' : 'fa-solid fa-file'" 
              class="w-5 h-5 text-green-600" 
            />
            <h3 class="text-lg font-semibold text-gray-900">
              {{ previewingDocument.type === 'resume' ? 'Resume/CV' : 'Additional Documents' }}
            </h3>
            <span class="text-sm text-gray-500">- {{ previewingDocument.name }}</span>
          </div>
          <button
            @click="closeDocumentPreview"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <font-awesome-icon icon="fa-solid fa-times" class="w-5 h-5" />
          </button>
        </div>

        <!-- Document Content -->
        <div class="flex-1 overflow-auto p-6 bg-gray-100 flex items-center justify-center">
          <!-- Image Preview -->
          <div v-if="isImageFile(previewingDocument.url)" class="w-full">
            <img
              :src="previewDocumentUrl"
              :alt="previewingDocument.name"
              class="max-w-full max-h-[70vh] mx-auto rounded-lg shadow-lg"
              @error="() => console.error('Error loading image')"
            />
          </div>

          <!-- PDF Preview -->
          <div v-else-if="isPdfFile(previewingDocument.url)" class="w-full">
            <div class="w-full bg-gray-100 rounded-lg overflow-hidden" style="height: 70vh;">
              <!-- Use iframe for better PDF rendering -->
              <iframe
                :src="previewDocumentUrl"
                class="w-full h-full border-0"
                frameborder="0"
                type="application/pdf"
                style="min-height: 100%;"
              >
                <div class="p-8 text-center">
                  <font-awesome-icon icon="fa-solid fa-file-pdf" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p class="text-gray-600 font-medium mb-2">PDF Preview</p>
                  <p class="text-sm text-gray-500 mb-4">
                    Your browser doesn't support PDF preview or the file couldn't be loaded.
                  </p>
                  <a
                    :href="previewingDocument.url"
                    target="_blank"
                    class="px-4 py-2 bg-green-600 text-white rounded-lg inline-block"
                  >
                    Open PDF in New Tab
                  </a>
                </div>
              </iframe>
            </div>
          </div>

          <!-- Unsupported File Type -->
          <div v-else class="text-center">
            <font-awesome-icon icon="fa-solid fa-file" class="w-24 h-24 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-700 font-medium mb-2">{{ previewingDocument.name }}</p>
            <p class="text-gray-600 mb-4">Preview not available for this file type</p>
            <a
              :href="previewingDocument.url"
              :download="previewingDocument.name"
              class="px-4 py-2 bg-green-600 text-white rounded-lg inline-block"
            >
              <font-awesome-icon icon="fa-solid fa-download" class="mr-2" />
              Download File
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
          <div class="text-sm text-gray-600">
            <span class="font-medium">File:</span> {{ previewingDocument.name }}
          </div>
          <div class="flex gap-2">
            <a
              :href="previewingDocument.url"
              target="_blank"
              class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <font-awesome-icon icon="fa-solid fa-external-link" class="mr-1" />
              Open in New Tab
            </a>
            <a
              :href="previewingDocument.url"
              :download="previewingDocument.name"
              class="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <font-awesome-icon icon="fa-solid fa-download" class="mr-1" />
              Download
            </a>
            <button
              @click="closeDocumentPreview"
              class="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
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
const showDocumentPreview = ref(false)
const previewingDocument = ref(null)
const previewDocumentUrl = ref('')

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
  
  // For local dev: serve uploads from backend port directly
  let backendUrl = 'http://localhost:5000'
  
  // Determine backend URL based on current location
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.origin.includes(':8080')) {
    backendUrl = 'http://localhost:5000'
  } else if (window.location.origin.includes('countryside-steakhouse.site')) {
    backendUrl = 'https://www.countryside-steakhouse.site'
  } else if (import.meta.env.VITE_API_BASE_URL) {
    backendUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '')
  } else {
    // Fallback: construct from current origin but change port to 5000
    const protocol = window.location.protocol
    const hostname = window.location.hostname
    backendUrl = `${protocol}//${hostname}:5000`
  }
  
  // Ensure path starts with / and is properly formatted
  // Path should be like /uploads/job-applications/filename.pdf
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  
  // Log for debugging
  const finalUrl = `${backendUrl}${cleanPath}`
  console.log('Building file URL:', { path, cleanPath, backendUrl, finalUrl })
  
  return finalUrl
}

const buildViewUrl = (filePath) => {
  if (!filePath) return ''
  const url = buildFileUrl(filePath)
  // Return URL that will display inline (add #view parameter for PDFs)
  return url + (url.toLowerCase().endsWith('.pdf') ? '#view=FitH' : '')
}

const viewFile = (filePath, type, fileName) => {
  if (!filePath) return
  
  // Use API endpoint that serves files with proper headers (bypasses auth and download managers)
  const applicationId = props.applicationId
  
  if (!applicationId) {
    console.error('No application ID available')
    return
  }
  
  // Build URL using the view endpoint
  const backendUrl = apiConfig.baseURL.replace('/api', '') || 'http://localhost:5000'
  const docType = type === 'resume' ? 'resume' : 'additional'
  const viewUrl = `${backendUrl}/api/job-applications/documents/${applicationId}/view?type=${docType}&t=${Date.now()}`
  
  // Also keep the direct URL for download/fallback
  const directUrl = buildFileUrl(filePath)
  
  previewDocumentUrl.value = viewUrl + (viewUrl.toLowerCase().includes('.pdf') ? '#view=FitH' : '')
  previewingDocument.value = {
    type: type,
    name: fileName || (filePath.split('/').pop() || `${type}_document`),
    url: directUrl
  }
  showDocumentPreview.value = true
  
  console.log('Viewing file:', { filePath, applicationId, viewUrl, directUrl })
}

const closeDocumentPreview = () => {
  showDocumentPreview.value = false
  previewingDocument.value = null
  previewDocumentUrl.value = ''
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

const isPdfFile = (filePath) => {
  if (!filePath) return false
  return filePath.toLowerCase().endsWith('.pdf')
}

const isImageFile = (filePath) => {
  if (!filePath) return false
  const lowerPath = filePath.toLowerCase()
  return lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg') || 
         lowerPath.endsWith('.png') || lowerPath.endsWith('.gif')
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

const formatPhoneNumber = (phone) => {
  if (!phone) return 'Not provided'
  
  // Remove all non-digits
  let digits = phone.toString().replace(/\D/g, '')
  
  // If it doesn't start with 09, try to format it
  if (digits.length >= 11 && !digits.startsWith('09')) {
    // If it starts with 0, replace with 09
    if (digits.startsWith('0')) {
      digits = '09' + digits.substring(1)
    } else if (digits.length === 11) {
      // If it's 11 digits without 09, assume it starts with country code (63) and format
      if (digits.startsWith('63')) {
        digits = '0' + digits.substring(2)
      } else {
        digits = '09' + digits.substring(0, 9)
      }
    }
  }
  
  // Ensure it starts with 09
  if (digits.length > 0 && !digits.startsWith('09')) {
    if (digits.startsWith('0')) {
      digits = '09' + digits.substring(1)
    } else {
      digits = '09' + digits
    }
  }
  
  // Format: 09XX XXX XXXX (11 digits: first 4 digits together, then space, then 3, then space, then 4)
  if (digits.length >= 11) {
    return `${digits.substring(0, 4)} ${digits.substring(4, 7)} ${digits.substring(7, 11)}`
  } else if (digits.length >= 7) {
    return `${digits.substring(0, 4)} ${digits.substring(4, 7)} ${digits.substring(7)}`
  } else if (digits.length >= 4) {
    return `${digits.substring(0, 4)} ${digits.substring(4)}`
  } else if (digits.length >= 2) {
    return digits // Return without spaces if less than 4 digits
  }
  
  return phone // Return original if can't format
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

