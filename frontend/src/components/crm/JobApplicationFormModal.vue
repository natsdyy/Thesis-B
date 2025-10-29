<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50 p-4"
    @click.self="closeModal"
  >
    <div class="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl">
      <!-- Modal Header -->
      <div class="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex-shrink-0">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-bold mb-2">Job Application Form</h2>
            <p class="text-green-100">{{ selectedPosition ? `Applying for: ${selectedPosition.position_title}` : 'Submit your application' }}</p>
          </div>
          <button
            @click="closeModal"
            class="text-white hover:text-green-200 transition-colors p-2 rounded-full hover:bg-white/10"
          >
            <font-awesome-icon icon="fa-solid fa-times" class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="showError" class="bg-red-50 border-l-4 border-red-400 p-4 mx-6 mt-4 rounded flex-shrink-0">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <font-awesome-icon icon="fa-solid fa-exclamation-triangle" class="w-5 h-5 text-red-400" />
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>
          <div class="ml-auto pl-3">
            <button @click="showError = false" class="text-red-400 hover:text-red-600">
              <font-awesome-icon icon="fa-solid fa-times" class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Content - Scrollable -->
      <div class="flex-1 overflow-y-auto p-6">
        <form @submit.prevent="submitApplication" class="space-y-6">
          <!-- Personal Information Section -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <font-awesome-icon icon="fa-solid fa-user" class="mr-2 text-green-600" />
              Personal Information
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Full Name -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  v-model="formData.fullName"
                  type="text"
                  required
                  placeholder="Enter your full name"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                />
              </div>

              <!-- Email -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  v-model="formData.email"
                  type="email"
                  required
                  placeholder="Enter your email"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                />
              </div>

              <!-- Phone Number -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  v-model="formData.phone"
                  type="tel"
                  required
                  placeholder="Enter your phone number"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                />
              </div>

              <!-- Date of Birth -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  v-model="formData.dateOfBirth"
                  type="date"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                />
              </div>

              <!-- Address -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <textarea
                  v-model="formData.address"
                  required
                  rows="3"
                  placeholder="Enter your complete address"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 resize-none"
                ></textarea>
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
              <!-- Position Applied For -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Position Applied For *
                </label>
                <input
                  v-model="formData.positionTitle"
                  type="text"
                  required
                  readonly
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                />
              </div>

              <!-- Department -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <input
                  v-model="formData.department"
                  type="text"
                  required
                  readonly
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                />
              </div>

              <!-- Years of Experience -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience *
                </label>
                <select
                  v-model="formData.experienceYears"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="">Select experience level</option>
                  <option value="0">No experience (Fresh graduate)</option>
                  <option value="1">1 year</option>
                  <option value="2">2 years</option>
                  <option value="3">3 years</option>
                  <option value="4">4 years</option>
                  <option value="5">5+ years</option>
                </select>
              </div>

              <!-- Expected Salary -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Expected Monthly Salary (₱)
                </label>
                <input
                  v-model.number="formData.expectedSalary"
                  type="number"
                  min="0"
                  max="999999.99"
                  step="1000"
                  placeholder="Enter expected salary"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                />
              </div>

              <!-- Skills -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Skills & Qualifications *
                </label>
                <textarea
                  v-model="formData.skills"
                  required
                  rows="4"
                  placeholder="List your relevant skills, qualifications, and certifications..."
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- reCAPTCHA Section -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <font-awesome-icon icon="fa-solid fa-shield-halved" class="mr-2 text-green-600" />
              Security Verification
            </h3>
            
            <div class="flex justify-center">
              <div id="recaptcha-container" ref="recaptchaContainer"></div>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Please complete the verification to confirm you're not a robot</p>
            <p v-if="captchaError" class="text-sm text-red-600 mt-2 text-center">
              <font-awesome-icon icon="fa-solid fa-exclamation-circle" class="mr-1" />
              {{ captchaError }}
            </p>
          </div>

        </form>
      </div>

      <!-- Modal Footer - Fixed at bottom -->
      <div class="border-t border-gray-200 p-6 flex-shrink-0 bg-gray-50">
        <div class="flex justify-end gap-4">
          <button
            type="button"
            @click="closeModal"
            class="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="showConfirmation"
            :disabled="!isFormValid"
            class="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
          >
            <font-awesome-icon icon="fa-solid fa-paper-plane" class="mr-2" />
            Submit Application
          </button>
        </div>
      </div>

        <!-- Success Message -->
        <div
          v-if="showSuccessMessage"
          class="fixed inset-0 backdrop-blur-sm bg-black/50 flex items-center justify-center z-60 p-4"
          @click.self="closeSuccessMessage"
        >
          <div class="bg-white rounded-3xl w-full max-w-md mx-4 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <!-- Success Header -->
            <div class="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-8 text-center relative overflow-hidden">
              <!-- Background Pattern -->
              <div class="absolute inset-0 opacity-10 bg-pattern">
                <div class="absolute top-4 left-4 w-8 h-8 border-2 border-white rounded-full"></div>
                <div class="absolute top-8 right-8 w-4 h-4 border-2 border-white rounded-full"></div>
                <div class="absolute bottom-4 left-8 w-6 h-6 border-2 border-white rounded-full"></div>
                <div class="absolute bottom-8 right-4 w-5 h-5 border-2 border-white rounded-full"></div>
              </div>
              
              <!-- Success Icon -->
              <div class="relative z-10">
                <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm success-icon">
                  <font-awesome-icon icon="fa-solid fa-check" class="w-10 h-10 text-white" />
                </div>
                <h2 class="text-2xl font-bold mb-2">Application Submitted!</h2>
                <p class="text-green-100 text-sm">Your application has been successfully submitted</p>
              </div>
            </div>

            <!-- Success Content -->
            <div class="p-8 text-center">
              <div class="mb-6">
                <h3 class="text-xl font-semibold text-gray-900 mb-3">Thank You for Your Interest!</h3>
                <p class="text-gray-600 leading-relaxed">
                  We've received your application for <strong class="text-green-600">{{ selectedPosition?.position_title }}</strong> 
                  at Countryside Steakhouse. Our HR team will review your application and get back to you soon.
                </p>
              </div>

              <!-- Next Steps -->
              <div class="bg-gray-50 rounded-xl p-6 mb-6">
                <h4 class="font-semibold text-gray-900 mb-3 flex items-center justify-center">
                  <font-awesome-icon icon="fa-solid fa-clock" class="mr-2 text-blue-500" />
                  What's Next?
                </h4>
                <div class="space-y-2 text-sm text-gray-600">
                  <p>• We'll review your application within 3-5 business days</p>
                  <p>• You'll receive an email confirmation shortly</p>
                  <p>• Qualified candidates will be contacted for interviews</p>
                </div>
              </div>

              <!-- Contact Info -->
              <div class="bg-blue-50 rounded-xl p-4 mb-6">
                <p class="text-sm text-blue-800">
                  <font-awesome-icon icon="fa-solid fa-envelope" class="mr-2" />
                  Questions? Contact us at <strong>hr@countryside-steakhouse.com</strong>
                </p>
              </div>

              <!-- Action Button -->
              <button
                @click="closeSuccessMessage"
                class="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 hover-lift"
              >
                <font-awesome-icon icon="fa-solid fa-check" class="w-4 h-4" />
                Got It!
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Confirmation Modal -->
      <div
        v-if="showConfirmationModal"
        class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-60"
      >
        <div class="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <font-awesome-icon icon="fa-solid fa-question" class="w-8 h-8 text-blue-600" />
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Confirm Application Submission</h3>
          <p class="text-gray-600 mb-6">
            Are you sure you want to submit your application for <strong>{{ selectedPosition?.position_title }}</strong>? 
            Please review your information before proceeding.
          </p>
          <div class="flex gap-3 justify-center">
            <button
              @click="closeConfirmationModal"
              class="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              @click="confirmSubmission"
              :disabled="isSubmitting"
              class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            >
              <span v-if="isSubmitting" class="loading loading-spinner loading-sm"></span>
              <font-awesome-icon v-if="!isSubmitting" icon="fa-solid fa-check" class="mr-2" />
              {{ isSubmitting ? 'Submitting...' : 'Yes, Submit' }}
            </button>
          </div>
        </div>
      </div>
    </div>

</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

// Props
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  selectedPosition: {
    type: Object,
    default: null
  }
})

// Emits
const emit = defineEmits(['close', 'application-submitted'])

// State
const isSubmitting = ref(false)
const showSuccessMessage = ref(false)
const showConfirmationModal = ref(false)
const errorMessage = ref('')
const showError = ref(false)

// reCAPTCHA state
const recaptchaContainer = ref(null)
const recaptchaWidgetId = ref(null)
const recaptchaToken = ref(null)
const captchaError = ref('')
const recaptchaLoaded = ref(false)

// reCAPTCHA Site Key (use environment variable or default test key)
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' // Google's test key

// Form data
const formData = ref({
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  address: '',
  positionTitle: '',
  department: '',
  experienceYears: '',
  expectedSalary: '',
  skills: ''
})

// Computed
const isFormValid = computed(() => {
  return formData.value.fullName &&
         formData.value.email &&
         formData.value.phone &&
         formData.value.dateOfBirth &&
         formData.value.address &&
         formData.value.experienceYears &&
         formData.value.skills &&
         recaptchaToken.value !== null
})

// Methods
const closeModal = () => {
  emit('close')
}

const closeSuccessMessage = () => {
  showSuccessMessage.value = false
  closeModal()
}

const showConfirmation = () => {
  showConfirmationModal.value = true
}

const closeConfirmationModal = () => {
  showConfirmationModal.value = false
}

const confirmSubmission = () => {
  showConfirmationModal.value = false
  submitApplication()
}

// reCAPTCHA methods
const loadRecaptchaScript = () => {
  return new Promise((resolve, reject) => {
    if (window.grecaptcha && window.grecaptcha.render) {
      recaptchaLoaded.value = true
      resolve()
      return
    }

    if (document.querySelector('script[src*="recaptcha"]')) {
      // Script is loading, wait for it
      const checkInterval = setInterval(() => {
        if (window.grecaptcha && window.grecaptcha.render) {
          clearInterval(checkInterval)
          recaptchaLoaded.value = true
          resolve()
        }
      }, 100)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => {
      recaptchaLoaded.value = true
      resolve()
    }
    script.onerror = () => {
      reject(new Error('Failed to load reCAPTCHA'))
    }
    document.head.appendChild(script)
  })
}

const renderRecaptcha = async () => {
  try {
    await loadRecaptchaScript()
    
    if (!recaptchaContainer.value) {
      console.error('reCAPTCHA container not found')
      return
    }

    // Reset container
    recaptchaContainer.value.innerHTML = ''

    // Render reCAPTCHA
    if (window.grecaptcha && window.grecaptcha.render) {
      recaptchaWidgetId.value = window.grecaptcha.render(recaptchaContainer.value, {
        sitekey: RECAPTCHA_SITE_KEY,
        callback: (token) => {
          recaptchaToken.value = token
          captchaError.value = ''
        },
        'expired-callback': () => {
          recaptchaToken.value = null
          captchaError.value = 'reCAPTCHA expired. Please verify again.'
        },
        'error-callback': () => {
          recaptchaToken.value = null
          captchaError.value = 'reCAPTCHA error. Please refresh and try again.'
        }
      })
    }
  } catch (error) {
    console.error('Error rendering reCAPTCHA:', error)
    captchaError.value = 'Failed to load security verification. Please refresh the page.'
  }
}

const resetRecaptcha = () => {
  if (recaptchaWidgetId.value !== null && window.grecaptcha) {
    window.grecaptcha.reset(recaptchaWidgetId.value)
    recaptchaToken.value = null
  }
}

const submitApplication = async () => {
  try {
    isSubmitting.value = true
    
    // Validate reCAPTCHA
    if (!recaptchaToken.value) {
      errorMessage.value = 'Please complete the security verification before submitting'
      showError.value = true
      captchaError.value = 'Please complete the reCAPTCHA verification'
      isSubmitting.value = false
      return
    }

    // Create FormData for multipart/form-data submission
    const submitData = new FormData()
    
    // Add all form fields
    Object.keys(formData.value).forEach(key => {
      if (formData.value[key] !== null && formData.value[key] !== '') {
        // Regular field - convert numeric fields to proper types
        let value = formData.value[key]
        if (key === 'experienceYears') {
          value = parseInt(value) || 0
        } else if (key === 'expectedSalary') {
          value = parseFloat(value) || null
        }
        submitData.append(key, value)
      }
    })

    // Add application metadata
    submitData.append('applicationDate', new Date().toISOString())
    submitData.append('status', 'new')
    submitData.append('positionId', props.selectedPosition?.id || '')
    submitData.append('recaptchaToken', recaptchaToken.value)

    console.log('Submitting application data:', {
      fullName: formData.value.fullName,
      email: formData.value.email,
      positionTitle: formData.value.positionTitle,
      department: formData.value.department
    })

    const response = await fetch('/api/job-applications', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: submitData
    })

    console.log('Response status:', response.status)
    console.log('Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error response:', errorText)
      throw new Error(`Server error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('Success result:', result)
    
    if (result.success) {
      showSuccessMessage.value = true
      emit('application-submitted', result.data)
      
      // Reset form after successful submission
      setTimeout(() => {
        resetForm()
      }, 2000)
    } else {
      throw new Error(result.message || 'Failed to submit application')
    }
  } catch (error) {
    console.error('Error submitting application:', error)
    
    // Show more detailed error message
    let errorMsg = 'Failed to submit application. '
    if (error.message.includes('Failed to fetch')) {
      errorMsg += 'Please check your internet connection and try again.'
    } else if (error.message.includes('Server error: 500')) {
      errorMsg += 'Server error occurred. Please try again later.'
    } else if (error.message.includes('Server error: 400')) {
      errorMsg += 'Invalid form data. Please check all required fields.'
    } else if (error.message.includes('numeric field overflow')) {
      errorMsg += 'Invalid data format. Please check your salary and experience values.'
    } else {
      errorMsg += error.message
    }
    
    errorMessage.value = errorMsg
    showError.value = true
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  formData.value = {
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    positionTitle: '',
    department: '',
    experienceYears: '',
    expectedSalary: '',
    skills: ''
  }
  resetRecaptcha()
  captchaError.value = ''
}

// Watch for selected position changes
watch(() => props.selectedPosition, (newPosition) => {
  if (newPosition) {
    formData.value.positionTitle = newPosition.position_title
    formData.value.department = newPosition.department
  }
}, { immediate: true })

// Watch for modal open/close to reset form
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    // Wait for DOM to update, then render reCAPTCHA
    await nextTick()
    setTimeout(() => {
      renderRecaptcha()
    }, 300)
  } else {
    resetForm()
    if (recaptchaWidgetId.value !== null && window.grecaptcha) {
      window.grecaptcha.reset(recaptchaWidgetId.value)
    }
    recaptchaToken.value = null
    recaptchaWidgetId.value = null
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

/* File upload hover effects */
.border-dashed:hover {
  border-color: #10b981 !important;
  background-color: #f0fdf4;
}

/* Form input focus effects */
input:focus,
textarea:focus,
select:focus {
  transform: translateY(-1px);
  box-shadow: 0 10px 25px rgba(16, 185, 129, 0.15);
}

/* Success Modal Animations */
@keyframes slideInFromBottom {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes checkmarkPulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes backgroundPattern {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.animate-in {
  animation: slideInFromBottom 0.5s ease-out;
}

.slide-in-from-bottom-4 {
  animation: slideInFromBottom 0.5s ease-out;
}

.duration-500 {
  animation-duration: 500ms;
}

/* Success icon animation */
.success-icon {
  animation: checkmarkPulse 2s ease-in-out infinite;
}

/* Background pattern animation */
.bg-pattern {
  animation: backgroundPattern 20s linear infinite;
}

/* Hover effects for buttons */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}
</style>
