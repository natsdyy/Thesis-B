<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 backdrop-blur-md bg-black/60 z-50 overflow-y-auto"
    @click.self="closeModal"
  >
    <div
      class="min-h-full flex items-center justify-center p-3 sm:p-4 md:p-8 pt-24 sm:pt-28 md:pt-15 pb-12 sm:pb-30 md:"
    >
      <div
        class="bg-white rounded-xl sm:rounded-2xl w-full max-w-6xl max-h-[calc(100vh-9rem)] sm:max-h-[calc(100vh-10rem)] md:max-h-[calc(100vh-12rem)] min-h-0 flex flex-col shadow-2xl overflow-hidden"
      >
        <!-- Modal Header -->
        <div
          class="bg-gradient-to-r from-green-600 to-green-700 text-white p-3 sm:p-4 flex-shrink-0 sticky top-0 z-10"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex-1 min-w-0">
              <h2 class="text-lg sm:text-xl font-bold leading-tight">
                Open Job Positions
              </h2>
              <p
                class="text-xs text-green-100 leading-relaxed mt-0.5 hidden sm:block"
              >
                Explore our current job openings and find the perfect role for
                you
              </p>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button
                @click="loadPositions"
                :disabled="isLoading"
                class="text-white hover:text-green-200 transition-colors p-1.5 rounded-full hover:bg-white/10 min-w-[36px] min-h-[36px] flex items-center justify-center"
                title="Refresh positions"
              >
                <font-awesome-icon
                  icon="fa-solid fa-rotate"
                  :class="['w-4 h-4', isLoading ? 'animate-spin' : '']"
                />
              </button>
              <button
                @click="closeModal"
                class="text-white hover:text-green-200 transition-colors p-1.5 rounded-full hover:bg-white/10 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                aria-label="Close modal"
              >
                <font-awesome-icon icon="fa-solid fa-times" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Modal Content -->
        <div
          class="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-6 sm:pb-8 md:pb-10 max-h-[calc(100vh-12rem)] sm:max-h-[calc(100vh-14rem)] md:max-h-[calc(100vh-16rem)]"
        >
          <!-- Loading State -->
          <div v-if="isLoading" class="flex justify-center items-center py-12">
            <div
              class="loading loading-spinner loading-lg text-green-600"
            ></div>
            <span class="ml-3 text-gray-600">Loading positions...</span>
          </div>

          <!-- No Positions State -->
          <div v-else-if="positions.length === 0" class="text-center py-12">
            <div class="text-gray-500 mb-4">
              <font-awesome-icon
                icon="fa-solid fa-briefcase"
                class="w-16 h-16 mx-auto mb-4 text-gray-300"
              />
            </div>
            <h3 class="text-xl font-semibold mb-2 text-gray-900">
              No positions available
            </h3>
            <p class="text-gray-600">
              There are currently no open positions. Please check back later!
            </p>
          </div>

          <!-- Positions Grid -->
          <div v-else>
            <!-- Department Filter Tabs -->
            <div class="mb-4">
              <div class="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
                <button
                  v-for="department in departments"
                  :key="department"
                  @click="setActiveDepartment(department)"
                  :class="[
                    'btn btn-xs sm:btn-sm font-thin text-xs',
                    activeDepartment === department
                      ? 'bg-green-600 text-white hover:bg-green-600/80'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 ',
                  ]"
                >
                  {{ department }}
                  <span class="badge badge-xs ml-1">
                    {{ getDepartmentCount(department) }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Positions Cards -->
            <div
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6 md:gap-8"
            >
              <div
                v-for="position in filteredPositions"
                :key="position.id"
                class="bg-white border border-gray-200 rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 hover:shadow-xl transition-all duration-300 hover:border-green-300 hover:-translate-y-1 group"
              >
                <!-- Position Header -->
                <div
                  class="flex justify-between items-start mb-3 sm:mb-4 md:mb-5"
                >
                  <div class="flex-1 min-w-0">
                    <h3
                      class="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1 md:mb-2 group-hover:text-green-700 transition-colors truncate"
                    >
                      {{ position.position_title }}
                    </h3>
                    <div class="space-y-1 md:space-y-2">
                      <p class="text-xs sm:text-sm md:text-base text-gray-600">
                        {{ position.department }}
                      </p>
                      <p
                        class="text-xs sm:text-sm md:text-base font-medium text-green-600 flex items-center"
                      >
                        <font-awesome-icon
                          icon="fa-solid fa-map-marker-alt"
                          class="mr-1 sm:mr-2 text-[10px] sm:text-xs md:text-sm"
                        />
                        <span class="truncate">{{
                          getDisplayBranchName(position)
                        }}</span>
                      </p>
                    </div>
                  </div>
                  <!-- Status badge removed since we only show open positions -->
                </div>

                <!-- Position Details -->
                <div
                  class="space-y-2 sm:space-y-3 md:space-y-4 mb-3 sm:mb-4 md:mb-5"
                >
                  <div class="flex justify-between items-center">
                    <span class="text-xs sm:text-sm md:text-base text-gray-600"
                      >Rate per Hour:</span
                    >
                    <span
                      class="font-bold text-green-600 text-xs sm:text-sm md:text-base"
                    >
                      ₱{{
                        (parseFloat(position.rate_per_hour) || 0).toFixed(2)
                      }}
                    </span>
                  </div>

                  <div class="flex justify-between items-center">
                    <span class="text-xs sm:text-sm md:text-base text-gray-600"
                      >Monthly Salary:</span
                    >
                    <span
                      class="font-semibold text-gray-900 text-xs sm:text-sm md:text-base"
                    >
                      {{
                        calculateMonthlySalaryRange(position.rate_per_hour)
                          .display
                      }}
                    </span>
                  </div>

                  <div class="flex justify-between items-center">
                    <span class="text-xs sm:text-sm md:text-base text-gray-600"
                      >Work Type:</span
                    >
                    <span
                      class="text-xs sm:text-sm md:text-base font-medium text-gray-900"
                    >
                      {{ position.position_type || 'Full-time' }}
                    </span>
                  </div>
                </div>

                <!-- Description -->
                <div class="mb-3 sm:mb-4 md:mb-5">
                  <p
                    class="text-xs sm:text-sm md:text-base text-gray-700 line-clamp-3 leading-relaxed"
                  >
                    {{
                      position.description ||
                      `${position.department} ${position.position_title} position`
                    }}
                  </p>
                </div>

                <!-- Action Buttons -->
                <div class="flex gap-2 md:gap-3">
                  <button
                    @click="applyForPosition(position)"
                    :disabled="
                      !(
                        position.status === 'open' ||
                        position.job_status === 'open'
                      ) || position.is_active === false
                    "
                    :class="[
                      'flex-1 px-3 sm:px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-medium md:font-semibold transition-all duration-300 text-xs sm:text-sm md:text-base !font-medium',
                      (position.status === 'open' ||
                        position.job_status === 'open') &&
                      position.is_active !== false
                        ? 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer hover:shadow-lg hover:-translate-y-0.5'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60',
                    ]"
                  >
                    <font-awesome-icon
                      icon="fa-solid fa-paper-plane"
                      class="mr-1 sm:mr-2 md:mr-2"
                    />
                    {{
                      (position.status === 'open' ||
                        position.job_status === 'open') &&
                      position.is_active !== false
                        ? 'Apply Now'
                        : 'Position Closed'
                    }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Footer Stats -->
            <div
              class="mt-6 sm:mt-8 md:mt-10 mb-4 sm:mb-6 md:mb-8 bg-gray-50 rounded-lg md:rounded-xl p-3 sm:p-4 md:p-6"
            >
              <div
                class="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0 md:gap-4 text-xs sm:text-sm md:text-base text-gray-600"
              >
                <span
                  >Showing {{ filteredPositions.length }} of
                  {{ positions.length }} open positions</span
                >
                <span
                  >{{ getOpenPositionsCount() }} positions currently open</span
                >
              </div>
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
      class="fixed inset-0 backdrop-blur-md bg-black/60 flex items-center justify-center z-60 p-2 sm:p-4"
      @click.self="closeSuccessModal"
    >
      <div
        class="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md mx-2 sm:mx-4 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 max-h-[95vh] overflow-y-auto"
      >
        <!-- Success Header -->
        <div
          class="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 sm:p-8 text-center relative overflow-hidden"
        >
          <!-- Background Pattern -->
          <div class="absolute inset-0 opacity-10 bg-pattern">
            <div
              class="absolute top-4 left-4 w-8 h-8 border-2 border-white rounded-full"
            ></div>
            <div
              class="absolute top-8 right-8 w-4 h-4 border-2 border-white rounded-full"
            ></div>
            <div
              class="absolute bottom-4 left-8 w-6 h-6 border-2 border-white rounded-full"
            ></div>
            <div
              class="absolute bottom-8 right-4 w-5 h-5 border-2 border-white rounded-full"
            ></div>
          </div>

          <!-- Success Icon -->
          <div class="relative z-10">
            <div
              class="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 backdrop-blur-sm success-icon"
            >
              <font-awesome-icon
                icon="fa-solid fa-check"
                class="w-8 h-8 sm:w-10 sm:h-10 text-white"
              />
            </div>
            <h2 class="text-xl sm:text-2xl font-bold mb-2">
              Application Submitted!
            </h2>
            <p class="text-green-100 text-xs sm:text-sm">
              Your application has been successfully submitted
            </p>
          </div>
        </div>

        <!-- Success Content -->
        <div class="p-4 sm:p-6 lg:p-8 text-center">
          <div class="mb-4 sm:mb-6">
            <h3
              class="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3"
            >
              Thank You for Your Interest!
            </h3>
            <p class="text-sm sm:text-base text-gray-600 leading-relaxed">
              We've received your application for
              <strong class="text-green-600">{{
                selectedPosition?.position_title
              }}</strong>
              at Countryside Steakhouse. Our HR team will review your
              application and get back to you soon.
            </p>
          </div>

          <!-- Next Steps -->
          <div
            class="bg-gray-50 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6"
          >
            <h4
              class="font-semibold text-gray-900 mb-2 sm:mb-3 flex items-center justify-center text-sm sm:text-base"
            >
              <font-awesome-icon
                icon="fa-solid fa-clock"
                class="mr-2 text-blue-500"
              />
              What's Next?
            </h4>
            <div
              class="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600"
            >
              <p>• We'll review your application within 3-5 business days</p>
              <p>• You'll receive an email confirmation shortly</p>
              <p>• Qualified candidates will be contacted for interviews</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              @click="closeSuccessModal"
              class="btn btn-sm bg-green-600 text-white hover:bg-green-700 border-none shadow-none"
            >
              Got It!
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
  import { formatImageUrl, apiConfig } from '../../config/api.js';
  import JobApplicationFormModal from './JobApplicationFormModal.vue';

  // Props
  const props = defineProps({
    isOpen: {
      type: Boolean,
      default: false,
    },
  });

  // Emits
  const emit = defineEmits(['close']);

  // State
  const branchPositions = ref([]); // All positions from API (includes branch_positions and user_roles)
  const isLoading = ref(false);
  const activeDepartment = ref('All');
  const isApplicationFormOpen = ref(false);
  const selectedPosition = ref(null);
  const showSuccessModal = ref(false);

  // Computed - use only branch positions from API (which already includes department roles)
  const positions = computed(() => {
    // Branch positions from /api/branch-positions already include both branch_positions and user_roles
    // No need to merge with store - the API does it for us
    return branchPositions.value.filter((p) => {
      // Get status values (prefer job_status, fallback to status)
      const jobStatus = p.job_status || p.status;
      const status = p.status || p.job_status || 'open';

      // Position must be open (not closed, filled, or on-hold)
      // If either status or job_status indicates closed/filled/on-hold, exclude it
      const closedStatuses = ['closed', 'filled', 'on-hold'];
      const isClosed =
        closedStatuses.includes(jobStatus) || closedStatuses.includes(status);

      // Position must be explicitly open
      const isOpen = (jobStatus === 'open' || status === 'open') && !isClosed;

      // Must be active (strict check - only true or 1)
      const isActive = p.is_active === true || p.is_active === 1;

      // Must not be deleted
      const notDeleted = !p.deleted_at;

      return isOpen && isActive && notDeleted;
    });
  });

  const departments = computed(() => {
    // Get all unique departments from positions that actually have open positions
    const departmentsWithPositions = new Set(
      positions.value.map((p) => p.department).filter(Boolean)
    );

    // Filter to only show departments that have at least 1 open position
    const departmentsWithCount = Array.from(departmentsWithPositions).filter(
      (dept) => {
        const count = positions.value.filter(
          (p) => p.department === dept
        ).length;
        return count > 0;
      }
    );

    // Always include "All" at the beginning, then sorted departments
    return ['All', ...departmentsWithCount.sort((a, b) => a.localeCompare(b))];
  });

  const filteredPositions = computed(() => {
    let filtered = positions.value; // Already filtered to only open positions

    if (activeDepartment.value !== 'All') {
      filtered = filtered.filter(
        (p) => p.department === activeDepartment.value
      );
    }

    return filtered;
  });

  // Methods
  const closeModal = () => {
    emit('close');
  };

  const setActiveDepartment = (department) => {
    activeDepartment.value = department;
  };

  const getDepartmentCount = (department) => {
    if (department === 'All') {
      return positions.value.length;
    }
    return positions.value.filter((p) => p.department === department).length;
  };

  const getOpenPositionsCount = () => {
    // All positions in the computed property are already open (filtered)
    return positions.value.length;
  };

  const getDisplayBranchName = (position) => {
    // Main branch positions come from user_roles table (branch_id is null/undefined)
    // Also check if branch_id is null or undefined, or if branch_name is null/undefined/empty
    if (
      position.branch_id === null ||
      position.branch_id === undefined ||
      !position.branch_id ||
      position.branch_id === ''
    ) {
      return 'Main Branch';
    }

    // If branch has a name, use it; otherwise fallback to Main Branch
    return position.branch_name || 'Main Branch';
  };

  const calculateMonthlySalaryRange = (ratePerHour) => {
    const rate = parseFloat(ratePerHour) || 0;
    // 6 hours per day * 30 days per month (average)
    const minSalary = rate * 6 * 30;
    // 8 hours per day * 30 days per month (average)
    const maxSalary = rate * 8 * 30;

    // Round to nearest thousand
    const minRounded = Math.round(minSalary / 1000) * 1000;
    const maxRounded = Math.round(maxSalary / 1000) * 1000;

    return {
      min: minRounded,
      max: maxRounded,
      display: `₱${minRounded.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} - ₱${maxRounded.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`,
    };
  };

  const viewPositionDetails = (position) => {
    // Create a detailed view of the position
    const salaryRange = calculateMonthlySalaryRange(position.rate_per_hour);
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
  `;

    alert(details);
  };

  const applyForPosition = (position) => {
    selectedPosition.value = position;
    isApplicationFormOpen.value = true;
  };

  const closeApplicationForm = () => {
    isApplicationFormOpen.value = false;
    selectedPosition.value = null;
  };

  const handleApplicationSubmitted = (applicationData) => {
    // Close the application form modal
    closeApplicationForm();
    // Show success modal
    showSuccessModal.value = true;
  };

  const closeSuccessModal = () => {
    showSuccessModal.value = false;
  };

  // Load positions from API
  const loadPositions = async () => {
    try {
      isLoading.value = true;

      // Fetch from branch-positions API - public endpoint should work without auth
      // Always request fresh data with job_status=open to only show open positions
      const headers = {
        'Content-Type': 'application/json',
      };

      // Add auth token if available (for logged-in users), but allow public access
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Use public endpoint to ensure we get open positions from branch_positions table
      const response = await fetch('/api/branch-positions/public', {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to load branch positions');
      }

      const result = await response.json();

      if (result.success && result.data) {
        console.log(
          `📦 Raw API returned ${result.data.length} positions:`,
          result.data
        );

        // Store all positions from API in branchPositions ref
        // The computed 'positions' property will filter them automatically
        branchPositions.value = result.data;

        console.log(`📦 Total positions from API: ${result.data.length}`);
        console.log(
          `✅ Open positions (after filtering): ${positions.value.length}`
        );
        console.log(
          `🚫 Filtered out: ${result.data.length - positions.value.length} positions`
        );

        // Log main branch positions for debugging
        const mainBranchPositions = branchPositions.value.filter(
          (p) =>
            p.branch_id === null || p.branch_id === undefined || !p.branch_id
        );

        console.log(`🏢 Main branch positions: ${mainBranchPositions.length}`);
      } else {
        console.warn('Branch positions API returned no data');
        branchPositions.value = [];
      }
    } catch (error) {
      console.error('Error loading positions:', error);
      branchPositions.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  // Cleanup function for visibility listener
  let visibilityHandler = null;

  // Watch modal open state and add/remove visibility listener
  watch(
    () => props.isOpen,
    (newValue) => {
      if (newValue) {
        // Modal opened - refresh positions immediately
        // This ensures we always show the latest status from JobApplication.vue

        loadPositions();

        // Add visibility change listener to refresh when tab becomes visible
        // This ensures changes made in HR view (JobApplication.vue) are reflected
        if (typeof document !== 'undefined') {
          visibilityHandler = () => {
            if (document.visibilityState === 'visible' && props.isOpen) {
              loadPositions();
            }
          };
          document.addEventListener('visibilitychange', visibilityHandler);
        }
      } else {
        // Modal closed - remove visibility listener
        if (visibilityHandler && typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', visibilityHandler);
          visibilityHandler = null;
        }
      }
    }
  );

  // Load positions when component is mounted
  onMounted(() => {
    if (props.isOpen) {
      loadPositions();
    }
  });

  // Cleanup on unmount
  onUnmounted(() => {
    document.body.classList.remove('overflow-hidden');
    if (visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
  });
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

  /* Mobile responsive improvements */
  @media (max-width: 640px) {
    .overflow-y-auto {
      -webkit-overflow-scrolling: touch;
    }

    /* Better touch targets on mobile */
    button,
    .cursor-pointer {
      min-height: 44px;
      min-width: 44px;
    }

    /* Ensure modal header is fully visible on mobile */
    .fixed.inset-0 {
      padding-top: 0;
    }

    /* Ensure title is not cut off */
    .bg-gradient-to-r.from-green-600 {
      position: relative;
      z-index: 20;
    }
  }

  /* Extra small mobile devices */
  @media (max-width: 375px) {
    .bg-white.rounded-xl {
      margin-top: 1rem;
      max-height: calc(100vh - 2rem);
    }

    .bg-gradient-to-r.from-green-600 h2 {
      font-size: 1.125rem;
      line-height: 1.4;
    }

    .bg-gradient-to-r.from-green-600 p {
      font-size: 0.75rem;
      line-height: 1.5;
    }
  }
</style>
