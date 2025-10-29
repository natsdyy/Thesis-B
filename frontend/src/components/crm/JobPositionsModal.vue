<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50 p-4"
    @click.self="closeModal"
  >
    <div class="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
      <!-- Modal Header -->
      <div class="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-bold mb-2">Open Job Positions</h2>
            <p class="text-green-100">Explore our current job openings and find the perfect role for you</p>
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
          <span class="ml-3 text-gray-600">Loading positions...</span>
        </div>

        <!-- No Positions State -->
        <div v-else-if="positions.length === 0" class="text-center py-12">
          <div class="text-gray-500 mb-4">
            <font-awesome-icon icon="fa-solid fa-briefcase" class="w-16 h-16 mx-auto mb-4 text-gray-300" />
          </div>
          <h3 class="text-xl font-semibold mb-2 text-gray-900">No positions available</h3>
          <p class="text-gray-600">There are currently no open positions. Please check back later!</p>
        </div>

        <!-- Positions Grid -->
        <div v-else>
          <!-- Department Filter Tabs -->
          <div class="mb-6">
            <div class="flex flex-wrap gap-2 justify-center">
              <button
                v-for="department in departments"
                :key="department"
                @click="setActiveDepartment(department)"
                :class="[
                  'px-4 py-2 rounded-lg font-medium transition-all duration-300',
                  activeDepartment === department
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                ]"
              >
                <font-awesome-icon icon="fa-solid fa-building" class="mr-2" />
                {{ department }}
                <span class="ml-2 bg-white/20 px-2 py-1 rounded-full text-xs">
                  {{ getDepartmentCount(department) }}
                </span>
              </button>
            </div>
          </div>

          <!-- Positions Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="position in filteredPositions"
              :key="position.id"
              class="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:border-green-300 group"
            >
              <!-- Position Header -->
              <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-gray-900 mb-1 group-hover:text-green-700 transition-colors">
                    {{ position.position_title }}
                  </h3>
                  <p class="text-sm text-gray-600">{{ position.department }}</p>
                </div>
                <div
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-semibold',
                    position.status === 'open'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  ]"
                >
                  {{ position.status === 'open' ? 'Open' : 'Closed' }}
                </div>
              </div>

              <!-- Position Details -->
              <div class="space-y-3 mb-4">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Rate per Hour:</span>
                  <span class="font-bold text-green-600">
                    ₱{{ (parseFloat(position.rate_per_hour) || 0).toFixed(2) }}
                  </span>
                </div>
                
                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Monthly Salary:</span>
                  <span class="font-semibold text-gray-900">
                    {{ calculateMonthlySalaryRange(position.rate_per_hour).display }}
                  </span>
                </div>

                <div class="flex justify-between items-center">
                  <span class="text-sm text-gray-600">Work Type:</span>
                  <span class="text-sm font-medium text-gray-900">
                    {{ position.position_type || 'Full-time' }}
                  </span>
                </div>
              </div>

              <!-- Description -->
              <div class="mb-4">
                <p class="text-sm text-gray-700 line-clamp-3">
                  {{ position.description || `${position.department} ${position.position_title} position` }}
                </p>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-2">
                <button
                  v-if="position.status === 'open'"
                  @click="applyForPosition(position)"
                  class="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  <font-awesome-icon icon="fa-solid fa-paper-plane" class="mr-2" />
                  Apply Now
                </button>
              </div>
            </div>
          </div>

          <!-- Footer Stats -->
          <div class="mt-8 bg-gray-50 rounded-lg p-4">
            <div class="flex justify-between items-center text-sm text-gray-600">
              <span>Showing {{ filteredPositions.length }} of {{ positions.length }} positions</span>
              <span>{{ getOpenPositionsCount() }} positions currently open</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Job Application Form Modal -->
    <JobApplicationFormModal
      :isOpen="isApplicationFormOpen"
      :selectedPosition="selectedPosition"
      @close="closeApplicationForm"
      @application-submitted="handleApplicationSubmitted"
    />

    <!-- Success Modal -->
    <div
      v-if="showSuccessModal"
      class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-60 p-4"
      @click.self="closeSuccessModal"
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

          <!-- Action Buttons -->
          <div class="flex gap-3">
            <button
              @click="closeSuccessModal"
              class="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 hover-lift"
            >
              <font-awesome-icon icon="fa-solid fa-check" class="w-4 h-4" />
              Got It!
            </button>
            <button
              @click="closeSuccessModal"
              class="px-6 py-3 text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
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
import { ref, computed, onMounted } from 'vue'
import { formatImageUrl, apiConfig } from '../../config/api.js'
import JobApplicationFormModal from './JobApplicationFormModal.vue'

// Props
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['close'])

// State
const positions = ref([])
const isLoading = ref(false)
const activeDepartment = ref('All')
const isApplicationFormOpen = ref(false)
const selectedPosition = ref(null)
const showSuccessModal = ref(false)

// Computed
const departments = computed(() => {
  const deptSet = new Set(positions.value.map(p => p.department))
  return ['All', ...Array.from(deptSet).sort()]
})

const filteredPositions = computed(() => {
  if (activeDepartment.value === 'All') {
    return positions.value
  }
  return positions.value.filter(p => p.department === activeDepartment.value)
})

// Methods
const closeModal = () => {
  emit('close')
}

const setActiveDepartment = (department) => {
  activeDepartment.value = department
}

const getDepartmentCount = (department) => {
  if (department === 'All') {
    return positions.value.length
  }
  return positions.value.filter(p => p.department === department).length
}

const getOpenPositionsCount = () => {
  return positions.value.filter(p => p.status === 'open').length
}

const calculateMonthlySalaryRange = (ratePerHour) => {
  const rate = parseFloat(ratePerHour) || 0
  // 6 hours per day * 30 days per month (average)
  const minSalary = rate * 6 * 30
  // 8 hours per day * 30 days per month (average)
  const maxSalary = rate * 8 * 30
  
  // Round to nearest thousand
  const minRounded = Math.round(minSalary / 1000) * 1000
  const maxRounded = Math.round(maxSalary / 1000) * 1000
  
  return {
    min: minRounded,
    max: maxRounded,
    display: `₱${minRounded.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} - ₱${maxRounded.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  }
}

const viewPositionDetails = (position) => {
  // Create a detailed view of the position
  const salaryRange = calculateMonthlySalaryRange(position.rate_per_hour)
  const details = `
Position: ${position.position_title}
Department: ${position.department}
Rate per Hour: ₱${(parseFloat(position.rate_per_hour) || 0).toFixed(2)}
Monthly Salary: ${salaryRange.display}
Work Type: ${position.position_type || 'Full-time'}
Status: ${position.status === 'open' ? 'Open' : 'Closed'}

Description:
${position.description || 'No description available'}

Requirements:
${position.requirements || 'No specific requirements listed'}
  `
  
  alert(details)
}

const applyForPosition = (position) => {
  selectedPosition.value = position
  isApplicationFormOpen.value = true
}

const closeApplicationForm = () => {
  isApplicationFormOpen.value = false
  selectedPosition.value = null
}

const handleApplicationSubmitted = (applicationData) => {
  console.log('Application submitted:', applicationData)
  // Close the application form modal
  closeApplicationForm()
  // Show success modal
  showSuccessModal.value = true
}

const closeSuccessModal = () => {
  showSuccessModal.value = false
}

// Load positions from API
const loadPositions = async () => {
  try {
    isLoading.value = true
    
    const response = await fetch('/api/branch-positions', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to load positions')
    }

    const result = await response.json()
    
    if (result.success && result.data) {
      positions.value = result.data
      console.log(`Loaded ${positions.value.length} positions`)
    } else {
      console.warn('Positions API returned no data')
      positions.value = []
    }
  } catch (error) {
    console.error('Error loading positions:', error)
    positions.value = []
  } finally {
    isLoading.value = false
  }
}

// Load positions when modal opens
onMounted(() => {
  if (props.isOpen) {
    loadPositions()
  }
})

// Watch for modal open state
import { watch } from 'vue'
watch(() => props.isOpen, (newValue) => {
  if (newValue) {
    loadPositions()
  }
})
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

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

/* Gradient text effect */
.gradient-text {
  background: linear-gradient(135deg, #10b981, #059669);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>
