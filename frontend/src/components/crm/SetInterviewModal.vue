<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50 p-4"
    @click.self="closeModal"
  >
    <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
      <!-- Modal Header -->
      <div class="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-bold mb-2">Set Interview Date</h2>
            <p class="text-green-100">{{ application?.full_name || 'Loading...' }} - {{ application?.position_title || '' }}</p>
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

        <!-- Interview Form -->
        <form v-else-if="application" @submit.prevent="scheduleInterview" class="space-y-6">
          <!-- Interview Details Section -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <font-awesome-icon icon="fa-solid fa-calendar-check" class="mr-2 text-green-600" />
              Interview Details
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Interview Date -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Interview Date *
                </label>
                <input
                  v-model="interviewForm.interviewDate"
                  type="date"
                  required
                  :min="today"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                />
              </div>

              <!-- Interview Time -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Interview Time *
                </label>
                <input
                  v-model="interviewForm.interviewTime"
                  type="time"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                />
              </div>

              <!-- Interview Type -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Interview Type *
                </label>
                <select
                  v-model="interviewForm.interviewType"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="in-person">In-Person</option>
                  <option value="video">Video Call</option>
                  <option value="phone">Phone Call</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Additional Information Section -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <font-awesome-icon icon="fa-solid fa-info-circle" class="mr-2 text-green-600" />
              Additional Information
            </h3>
            
            <div class="space-y-4">
              <!-- Location (for in-person interviews) -->
              <div v-if="interviewForm.interviewType === 'in-person'">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Interview Location *
                </label>
                <input
                  v-model="interviewForm.location"
                  type="text"
                  required
                  placeholder="Enter interview location"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                />
              </div>

              <!-- Meeting Link (for video interviews) -->
              <div v-if="interviewForm.interviewType === 'video'">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Link *
                </label>
                <input
                  v-model="interviewForm.meetingLink"
                  type="url"
                  required
                  placeholder="Enter video meeting link"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                />
              </div>

              <!-- Notes -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Interview Notes
                </label>
                <textarea
                  v-model="interviewForm.notes"
                  rows="4"
                  placeholder="Add any special instructions or notes for the interview..."
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              @click="closeModal"
              class="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            >
              <span v-if="isSubmitting" class="loading loading-spinner loading-sm"></span>
              <font-awesome-icon v-if="!isSubmitting" icon="fa-solid fa-calendar-plus" class="mr-2" />
              {{ isSubmitting ? 'Scheduling...' : 'Schedule Interview' }}
            </button>
          </div>
        </form>

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
import { ref, computed, watch } from 'vue'
import { useCustomToast } from '../../composables/useCustomToast.js'

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
const emit = defineEmits(['close', 'interview-scheduled', 'navigate-to-schedule'])

// State
const application = ref(null)
const isLoading = ref(false)
const isSubmitting = ref(false)

// Interview form data
const interviewForm = ref({
  interviewDate: '',
  interviewTime: '',
  interviewType: 'in-person',
  location: '',
  meetingLink: '',
  notes: ''
})

// Computed
const today = computed(() => {
  return new Date().toISOString().split('T')[0]
})

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

const scheduleInterview = async () => {
  try {
    isSubmitting.value = true

    // Prepare interview data
    const interviewData = {
      applicationId: props.applicationId,
      interviewDate: interviewForm.value.interviewDate,
      interviewTime: interviewForm.value.interviewTime,
      interviewType: interviewForm.value.interviewType,
      location: interviewForm.value.location,
      meetingLink: interviewForm.value.meetingLink,
      notes: interviewForm.value.notes,
      status: 'scheduled'
    }

    console.log('Scheduling interview:', interviewData)

    const response = await fetch('/api/job-applications/interviews', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(interviewData)
    })

    console.log('Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response:', errorText)
      throw new Error(`Server error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('Success result:', result)
    
    if (result.success) {
      // Update application status to 'interview-scheduled'
      await updateApplicationStatus('interview-scheduled')
      
      // Show success message
      alert('Interview scheduled successfully! Redirecting to Interview Schedule...')
      
      emit('interview-scheduled', result.data)
      
      // Small delay before navigation for better UX
      setTimeout(() => {
        emit('navigate-to-schedule')
        closeModal()
        resetForm()
      }, 500)
    } else {
      throw new Error(result.message || 'Failed to schedule interview')
    }
  } catch (error) {
    console.error('Error scheduling interview:', error)
    
    let errorMessage = 'Failed to schedule interview. '
    if (error.message.includes('Failed to fetch')) {
      errorMessage += 'Please check your internet connection and try again.'
    } else if (error.message.includes('Server error: 500')) {
      errorMessage += 'Server error occurred. Please try again later.'
    } else if (error.message.includes('Server error: 400')) {
      errorMessage += 'Invalid form data. Please check all required fields.'
    } else {
      errorMessage += error.message
    }
    
    alert(errorMessage)
  } finally {
    isSubmitting.value = false
  }
}

const updateApplicationStatus = async (status) => {
  try {
    const response = await fetch(`/api/job-applications/${props.applicationId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    })

    if (!response.ok) {
      throw new Error('Failed to update application status')
    }

    const result = await response.json()
    return result.success
  } catch (error) {
    console.error('Error updating application status:', error)
    return false
  }
}

const resetForm = () => {
  interviewForm.value = {
    interviewDate: '',
    interviewTime: '',
    interviewType: 'in-person',
    location: '',
    meetingLink: '',
    notes: ''
  }
}

// Watch for modal open and application ID changes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && props.applicationId) {
    loadApplicationDetails()
    resetForm()
  }
})

watch(() => props.applicationId, (newId) => {
  if (props.isOpen && newId) {
    loadApplicationDetails()
    resetForm()
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

/* Form input focus effects */
input:focus,
textarea:focus,
select:focus {
  transform: translateY(-1px);
  box-shadow: 0 10px 25px rgba(147, 51, 234, 0.15);
}

/* Smooth transitions */
.transition-colors {
  transition: all 0.3s ease;
}
</style>
