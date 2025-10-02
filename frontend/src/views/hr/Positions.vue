<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { Building2, Users } from 'lucide-vue-next';
  import { useCustomToast } from '../../composables/useCustomToast';
  import { usePositionsStore } from '../../stores/positionsStore.js';

  const { showSuccess, showError, showWarning, showInfo } = useCustomToast();
  const positionsStore = usePositionsStore();

  // Reactive data
  const activeTab = ref('');
  const showEditModal = ref(false);
  const selectedPosition = ref(null);

  // Form data for edit
  const positionForm = ref({
    role: '',
    department: '',
    description: '',
    rate_per_hour: 0,
  });

  // Computed properties
  const departments = computed(() => positionsStore.departments);

  const filteredPositions = computed(() => {
    return positionsStore.getPositionsByDepartment(activeTab.value);
  });

  const isLoading = computed(() => positionsStore.loading);
  const updatingPositionId = computed(() => positionsStore.updatingPositionId);

  // Methods
  const setActiveTab = (tab) => {
    activeTab.value = tab;
  };

  const openEditModal = (position) => {
    selectedPosition.value = position;
    positionForm.value = {
      role: position.role,
      department: position.department,
      description: position.description,
      rate_per_hour: position.rate_per_hour,
    };
    showEditModal.value = true;

    // Show info toast to guide user
    showInfo(`Updating rate for ${position.role} position`, 'Edit Mode');
  };

  const closeModals = () => {
    if (selectedPosition.value) {
      showInfo('Rate update cancelled', 'Edit Cancelled');
    }
    showEditModal.value = false;
    selectedPosition.value = null;
  };

  const updatePositionRate = async () => {
    try {
      // Client-side validation
      const rate = positionForm.value.rate_per_hour;

      if (rate === null || rate === undefined || rate === '') {
        showError('Rate per hour is required', 'Validation Error');
        return;
      }

      if (typeof rate !== 'number' || isNaN(rate)) {
        showError('Rate per hour must be a valid number', 'Validation Error');
        return;
      }

      if (rate < 0) {
        showError(
          'Rate per hour must be a positive number',
          'Validation Error'
        );
        return;
      }

      if (rate > 10000) {
        showWarning(
          'Rate per hour seems unusually high. Please verify this amount is correct.',
          'High Rate Warning'
        );
        // Continue with the update but show warning
      }

      await positionsStore.updatePositionRate(
        selectedPosition.value.role_id,
        rate
      );

      showSuccess(
        `Rate per hour updated to ${formatCurrency(rate)} for ${selectedPosition.value.role}`,
        'Rate Updated Successfully'
      );
      closeModals();
    } catch (error) {
      console.error('Error updating position rate:', error);
      showError(
        error.message || 'Failed to update rate per hour',
        'Update Failed'
      );
    }
  };

  const fetchPositions = async () => {
    try {
      await positionsStore.fetchPositions();

      // Set the first department as active tab if none is selected
      if (!activeTab.value && departments.value.length > 0) {
        activeTab.value = departments.value[0];
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
      showError(
        error.message || 'Failed to load positions data',
        'Loading Error'
      );
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  onMounted(() => {
    fetchPositions();
  });
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold">Position Management</h1>
      <div class="text-sm text-base-content/70">
        Last updated: {{ new Date().toLocaleTimeString() }}
        <span v-if="isLoading" class="ml-2">
          <span class="loading loading-spinner loading-xs"></span>
          Updating...
        </span>
      </div>
    </div>

    <!-- Department Tabs -->
    <div class="tabs tabs-boxed mb-4 justify-start w-full">
      <button
        v-for="department in departments"
        :key="department"
        @click="setActiveTab(department)"
        class="tab"
        :class="{ 'tab-active': activeTab === department }"
      >
        <Building2 class="w-4 h-4 mr-2" />
        <span>{{ department }}</span>
        <span class="badge badge-ghost ml-2">
          {{ positionsStore.getPositionsByDepartment(department).length }}
        </span>
      </button>
    </div>

    <!-- Positions Grid -->
    <div
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
    >
      <div
        v-for="position in filteredPositions"
        :key="position.role_id"
        @click="
          updatingPositionId !== position.role_id && openEditModal(position)
        "
        class="card bg-white shadow-md border border-black/10 hover:shadow-lg cursor-pointer hover:border-primaryColor/30"
        :class="{
          'opacity-60': !position.is_active,
          'opacity-50': updatingPositionId === position.role_id,
          'cursor-not-allowed': updatingPositionId === position.role_id,
        }"
      >
        <div class="card-body p-3 sm:p-4 relative">
          <!-- Loading Overlay -->
          <div
            v-if="updatingPositionId === position.role_id"
            class="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10"
          >
            <div class="flex flex-col items-center space-y-2">
              <span class="loading loading-spinner loading-sm"></span>
              <span class="text-xs text-black/70">Updating...</span>
            </div>
          </div>

          <!-- Header -->
          <div class="flex justify-between items-start mb-3">
            <div class="flex-1 min-w-0">
              <h3
                class="font-semibold text-black truncate text-sm sm:text-base"
              >
                {{ position.role }}
              </h3>
              <p class="text-xs sm:text-sm text-black/60 truncate">
                {{ position.department }}
              </p>
            </div>
          </div>

          <!-- Rate per Hour -->
          <div class="flex justify-between items-center mb-3">
            <span class="text-xs sm:text-sm text-black/70">Rate per Hour:</span>
            <span class="font-bold text-sm sm:text-base text-primaryColor">
              {{ formatCurrency(position.rate_per_hour) }}
            </span>
          </div>

          <!-- Status -->
          <div class="flex justify-between items-center mb-3">
            <span class="text-xs sm:text-sm text-black/70">Status:</span>
            <div
              class="badge badge-xs sm:badge-sm border-none"
              :class="
                position.is_active
                  ? 'bg-success/20 text-success'
                  : 'bg-error/20 text-error'
              "
            >
              {{ position.is_active ? 'Active' : 'Inactive' }}
            </div>
          </div>

          <!-- Description -->
          <div class="text-xs text-black/60 line-clamp-2">
            {{ position.description }}
          </div>

          <!-- Click to Edit Indicator -->
          <div class="flex justify-end mt-2">
            <span
              class="text-xs transition-colors"
              :class="
                updatingPositionId === position.role_id
                  ? 'text-black/20'
                  : 'text-black/40'
              "
            >
              {{
                updatingPositionId === position.role_id
                  ? 'Updating...'
                  : 'Click to edit rate'
              }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="filteredPositions.length === 0"
        class="col-span-full flex flex-col items-center justify-center py-12"
      >
        <Users class="w-16 h-16 text-black/30 mb-4" />
        <h3 class="text-lg font-semibold text-black/70 mb-2">
          No positions found
        </h3>
        <p class="text-black/50 text-center max-w-md">
          No positions available in this department
        </p>
      </div>
    </div>

    <!-- Edit Position Modal -->
    <div v-if="showEditModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Update Rate per Hour</h3>

        <!-- Position Info Display -->
        <div class="bg-base-200 p-4 rounded-lg mb-4">
          <div class="flex justify-between items-center mb-2">
            <span class="font-semibold">{{ positionForm.role }}</span>
            <span class="badge bg-primaryColor/20 text-primaryColor">{{
              positionForm.department
            }}</span>
          </div>
          <p class="text-sm text-base-content/70">
            {{ positionForm.description }}
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 items-center">
          <!-- Label -->
          <div class="col-span-2">
            <label class="label">
              <span class="label-text font-medium">Rate per Hour</span>
            </label>
          </div>

          <!-- Input -->
          <div class="col-span-2">
            <input
              v-model.number="positionForm.rate_per_hour"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              class="input input-bordered input-lg text-center w-full"
              required
            />
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeModals"
            class="btn btn-sm bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none"
          >
            Cancel
          </button>
          <button
            @click="updatePositionRate"
            class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
            :disabled="updatingPositionId === selectedPosition?.role_id"
          >
            <span
              v-if="updatingPositionId === selectedPosition?.role_id"
              class="loading loading-spinner loading-sm"
            ></span>
            {{
              updatingPositionId === selectedPosition?.role_id
                ? 'Updating...'
                : 'Update Rate'
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* Enhanced card styling */
  .card {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  /* Badge improvements */
  .badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    font-weight: 500;
  }

  /* Button hover states */
  .btn:hover {
    transform: translateY(-1px);
    transition: all 0.2s ease;
  }

  /* Animation improvements */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .card {
    animation: fadeIn 0.3s ease-out;
  }

  /* Responsive grid adjustments */
  @media (max-width: 1024px) {
    .grid {
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }
  }

  @media (max-width: 640px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  /* Enhanced accessibility */
  .btn:focus,
  .input:focus,
  .select:focus,
  .textarea:focus {
    outline: 2px solid var(--primaryColor);
    outline-offset: 2px;
  }

  /* Smooth transitions */
  * {
    transition:
      color 0.2s ease,
      background-color 0.2s ease,
      border-color 0.2s ease,
      transform 0.2s ease;
  }

  /* Line clamp for description */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
