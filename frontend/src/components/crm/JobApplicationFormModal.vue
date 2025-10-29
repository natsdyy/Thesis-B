<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 backdrop-blur-md bg-transparent z-50 overflow-y-auto"
    @click.self="closeModal"
  >
    <div class="min-h-full flex items-start justify-center p-4 pt-26 pb-6">
      <div class="bg-white rounded-2xl w-full max-w-4xl max-h-[calc(100vh-7rem)] min-h-0 flex flex-col shadow-2xl">
      <!-- Modal Header -->
      <div class="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex-shrink-0">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-bold mb-2">Job Application Form</h2>
            <div>
              <p class="text-green-100">{{ selectedPosition ? `Applying for: ${selectedPosition.position_title}` : 'Submit your application' }}</p>
              <p v-if="selectedPosition?.branch_name" class="text-green-200 text-sm mt-1 flex items-center">
                <font-awesome-icon icon="fa-solid fa-map-marker-alt" class="mr-2" />
                Location: {{ selectedPosition.branch_name }}
              </p>
            </div>
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
                  placeholder="0993 948 5851"
                  @input="formatPhoneNumber"
                  maxlength="14"
                  pattern="09[0-9]{2} [0-9]{3} [0-9]{4}"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                />
                <p class="text-xs text-gray-500 mt-1">Format: 09XX XXX XXXX (must start with 09)</p>
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

          <!-- Documents Upload Section -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <font-awesome-icon icon="fa-solid fa-file-upload" class="mr-2 text-green-600" />
              Resume / CV Upload
            </h3>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Upload Resume or CV (PDF, DOC, DOCX) *
              </label>
              <div class="mt-2">
                <input
                  ref="resumeInput"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  @change="handleResumeChange"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 file:cursor-pointer"
                />
              </div>
              <p v-if="resumeFile" class="mt-2 text-sm text-gray-600">
                <font-awesome-icon icon="fa-solid fa-circle-check" class="mr-1 text-green-600" />
                Selected: {{ resumeFile.name }} ({{ formatFileSize(resumeFile.size) }})
              </p>
              <p class="text-xs text-gray-500 mt-2">
                Please upload your resume or CV. Accepted formats: PDF, DOC, DOCX. Max file size: 5MB.
              </p>
            </div>
          </div>

          <!-- reCAPTCHA Section -->
          <div class="bg-gray-50 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <font-awesome-icon icon="fa-solid fa-shield-halved" class="mr-2 text-green-600" />
              Security Verification
            </h3>
            
            <div class="flex justify-center min-h-[78px] items-center">
              <div v-if="!recaptchaLoaded && !captchaError" class="text-gray-500 text-sm">
                <span class="loading loading-spinner loading-sm mr-2"></span>
                Loading security verification...
              </div>
              <div 
                id="recaptcha-container" 
                ref="recaptchaContainer"
                class="recaptcha-wrapper"
              ></div>
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
import { ref, computed, watch, nextTick, onMounted } from 'vue'

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

// Debug: Log the site key being used
console.log('reCAPTCHA Site Key:', RECAPTCHA_SITE_KEY)
console.log('Environment variable VITE_RECAPTCHA_SITE_KEY:', import.meta.env.VITE_RECAPTCHA_SITE_KEY)

// Resume file
const resumeInput = ref(null)
const resumeFile = ref(null)

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
         resumeFile.value !== null &&
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
    // Check if already loaded
    if (window.grecaptcha && window.grecaptcha.render) {
      console.log('reCAPTCHA already loaded')
      recaptchaLoaded.value = true
      resolve()
      return
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="recaptcha"]')
    if (existingScript) {
      console.log('reCAPTCHA script tag exists, waiting for load...')
      // Script is loading, wait for it with longer timeout
      let attempts = 0
      const maxAttempts = 100 // 10 seconds max wait (increased from 5)
      const checkInterval = setInterval(() => {
        attempts++
        if (window.grecaptcha && window.grecaptcha.render) {
          clearInterval(checkInterval)
          console.log('reCAPTCHA loaded from existing script')
          recaptchaLoaded.value = true
          resolve()
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval)
          console.warn('reCAPTCHA script timeout - will continue trying')
          // Don't reject, just resolve and let renderRecaptcha handle it gracefully
          resolve()
        }
      }, 100)
      return
    }

    // Create and load script
    console.log('Loading reCAPTCHA script...')
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=explicit&hl=en`
    script.async = true
    script.defer = true
    
    // Add timeout for script loading
    const loadTimeout = setTimeout(() => {
      console.warn('reCAPTCHA script load timeout - will continue trying')
      // Don't reject immediately, give it more time
      resolve()
    }, 10000) // 10 second timeout
    
    script.onload = () => {
      clearTimeout(loadTimeout)
      console.log('reCAPTCHA script loaded')
      // Wait a bit longer for grecaptcha to be available
      let checkAttempts = 0
      const maxCheckAttempts = 20 // 2 seconds
      const checkGrecaptcha = setInterval(() => {
        checkAttempts++
        if (window.grecaptcha && window.grecaptcha.render) {
          clearInterval(checkGrecaptcha)
          recaptchaLoaded.value = true
          resolve()
        } else if (checkAttempts >= maxCheckAttempts) {
          clearInterval(checkGrecaptcha)
          console.warn('reCAPTCHA object not immediately available after script load, but script loaded')
          // Script loaded, even if grecaptcha isn't ready yet
          resolve()
        }
      }, 100)
    }
    
    script.onerror = (error) => {
      clearTimeout(loadTimeout)
      console.error('Failed to load reCAPTCHA script:', error)
      // Don't reject, show error to user instead
      captchaError.value = 'Failed to load security verification. Please check your internet connection and try again.'
      resolve() // Resolve instead of reject to prevent uncaught promise rejection
    }
    
    document.head.appendChild(script)
    console.log('reCAPTCHA script tag added to head')
  })
}

const renderRecaptcha = async () => {
  try {
    console.log('Starting reCAPTCHA rendering...')
    console.log('Site Key:', RECAPTCHA_SITE_KEY)
    console.log('Container element:', recaptchaContainer.value)
    
    // Load script (this now resolves even on timeout)
    await loadRecaptchaScript().catch(err => {
      console.warn('Script loading warning:', err)
      // Continue anyway
    })
    
    if (!recaptchaContainer.value) {
      console.error('reCAPTCHA container not found, retrying in 500ms...')
      // Retry after a delay
      setTimeout(() => {
        if (recaptchaContainer.value) {
          renderRecaptcha()
        } else {
          console.error('reCAPTCHA container still not found')
          captchaError.value = 'reCAPTCHA container not found. Please refresh the page.'
        }
      }, 500)
      return
    }

    // Reset container
    recaptchaContainer.value.innerHTML = ''
    console.log('reCAPTCHA container cleared')

    // Check if grecaptcha is available with retries
    let grecaptchaAttempts = 0
    const maxGrecaptchaAttempts = 30 // 3 seconds
    
    const waitForGrecaptcha = () => {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          grecaptchaAttempts++
          if (window.grecaptcha && window.grecaptcha.render) {
            clearInterval(checkInterval)
            resolve(true)
          } else if (grecaptchaAttempts >= maxGrecaptchaAttempts) {
            clearInterval(checkInterval)
            resolve(false)
          }
        }, 100)
      })
    }

    const grecaptchaAvailable = await waitForGrecaptcha()
    
    if (!grecaptchaAvailable) {
      console.error('window.grecaptcha is not available after waiting')
      captchaError.value = 'reCAPTCHA API not loaded. Please check your internet connection and refresh the page.'
      return
    }

    if (!window.grecaptcha.render) {
      console.error('window.grecaptcha.render is not available')
      captchaError.value = 'reCAPTCHA render function not available. Please refresh the page.'
      return
    }

    // Render reCAPTCHA
    console.log('Rendering reCAPTCHA widget...')
    try {
      recaptchaWidgetId.value = window.grecaptcha.render(recaptchaContainer.value, {
        sitekey: RECAPTCHA_SITE_KEY,
        callback: (token) => {
          console.log('reCAPTCHA token received')
          recaptchaToken.value = token
          captchaError.value = ''
        },
        'expired-callback': () => {
          console.log('reCAPTCHA token expired')
          recaptchaToken.value = null
          captchaError.value = 'reCAPTCHA expired. Please verify again.'
        },
        'error-callback': (error) => {
          console.error('reCAPTCHA error callback:', error)
          recaptchaToken.value = null
          captchaError.value = 'reCAPTCHA error. Please refresh and try again.'
        }
      })
      console.log('reCAPTCHA widget rendered successfully, ID:', recaptchaWidgetId.value)
      recaptchaLoaded.value = true
    } catch (renderError) {
      console.error('Error in grecaptcha.render:', renderError)
      captchaError.value = `Failed to render reCAPTCHA: ${renderError.message || 'Unknown error'}. Please refresh the page.`
    }
  } catch (error) {
    console.error('Error rendering reCAPTCHA:', error)
    captchaError.value = `Failed to load security verification: ${error.message || 'Unknown error'}. Please refresh the page.`
  }
}

const resetRecaptcha = () => {
  if (recaptchaWidgetId.value !== null && window.grecaptcha && window.grecaptcha.reset) {
    try {
      window.grecaptcha.reset(recaptchaWidgetId.value)
      recaptchaToken.value = null
    } catch (e) {
      console.error('Error resetting reCAPTCHA:', e)
    }
  }
  recaptchaToken.value = null
}

// Handle resume file selection
const handleResumeChange = (event) => {
  const file = event.target.files?.[0]
  if (file) {
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const allowedExtensions = ['.pdf', '.doc', '.docx']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      errorMessage.value = 'Invalid file type. Please upload PDF, DOC, or DOCX files only.'
      showError.value = true
      resumeInput.value.value = ''
      resumeFile.value = null
      return
    }
    
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    if (file.size > maxSize) {
      errorMessage.value = 'File size too large. Please upload a file smaller than 5MB.'
      showError.value = true
      resumeInput.value.value = ''
      resumeFile.value = null
      return
    }
    
    resumeFile.value = file
    showError.value = false
    errorMessage.value = ''
  } else {
    resumeFile.value = null
  }
}

// Format file size for display
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
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
        }
        submitData.append(key, value)
      }
    })

    // Add resume file if selected
    if (resumeFile.value) {
      submitData.append('resume', resumeFile.value)
    }

    // Add application metadata
    submitData.append('applicationDate', new Date().toISOString())
    submitData.append('status', 'new')
    submitData.append('positionId', props.selectedPosition?.id || '')
    // Include branch_id if it's a branch position
    if (props.selectedPosition?.branch_id) {
      submitData.append('branchId', props.selectedPosition.branch_id)
    }
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
    skills: ''
  }
  resumeFile.value = null
  if (resumeInput.value) {
    resumeInput.value.value = ''
  }
  resetRecaptcha()
  captchaError.value = ''
}

// Format phone number (Philippines format: 09XX XXX XXXX)
const formatPhoneNumber = (event) => {
  let value = event.target.value.replace(/\D/g, '') // Remove all non-digits
  
  // Limit to 11 digits
  if (value.length > 11) {
    value = value.substring(0, 11)
  }
  
  // Ensure it starts with 09
  if (value.length > 0 && !value.startsWith('09')) {
    if (value.startsWith('0')) {
      value = '09' + value.substring(1)
    } else {
      value = '09' + value
    }
    // Limit again after adding 09
    if (value.length > 11) {
      value = value.substring(0, 11)
    }
  }
  
  // Format: 09XX XXX XXXX (11 digits: first 4 digits together, then space, then 3 digits, then space, then 4 digits)
  let formatted = ''
  if (value.length <= 4) {
    formatted = value // No spaces until after 4th digit
  } else if (value.length <= 7) {
    formatted = value.substring(0, 4) + ' ' + value.substring(4)
  } else {
    formatted = value.substring(0, 4) + ' ' + value.substring(4, 7) + ' ' + value.substring(7, 11)
  }
  
  formData.value.phone = formatted
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
    // Use longer timeout to ensure container is ready
    setTimeout(async () => {
      console.log('Modal opened, attempting to render reCAPTCHA...')
      await renderRecaptcha()
    }, 500)
  } else {
    resetForm()
    if (recaptchaWidgetId.value !== null && window.grecaptcha && window.grecaptcha.reset) {
      try {
        window.grecaptcha.reset(recaptchaWidgetId.value)
      } catch (e) {
        console.error('Error resetting reCAPTCHA:', e)
      }
    }
    recaptchaToken.value = null
    recaptchaWidgetId.value = null
  }
})

// Preload reCAPTCHA script when component is mounted
onMounted(() => {
  // Preload script in background (non-blocking)
  loadRecaptchaScript().then(() => {
    console.log('reCAPTCHA preloaded successfully')
  }).catch(err => {
    console.warn('Preloading reCAPTCHA failed (will retry when modal opens):', err)
  })
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
