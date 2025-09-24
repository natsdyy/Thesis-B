<script setup>
  import { ref, computed, onMounted } from 'vue';
  import {
    Clock,
    Plus,
    Edit,
    Trash2,
    Save,
    X,
    AlertCircle,
  } from 'lucide-vue-next';
  import { useCustomToast } from '../../composables/useCustomToast';
  import { useShiftTypesStore } from '../../stores/shiftTypesStore';

  const { showSuccess, showError, showWarning, showInfo } = useCustomToast();
  const shiftTypesStore = useShiftTypesStore();

  // Props
  const props = defineProps({
    isOpen: {
      type: Boolean,
      default: false,
    },
  });

  // Emits
  const emit = defineEmits(['close', 'shift-updated']);

  // Local state
  const showAddModal = ref(false);
  const showEditModal = ref(false);
  const showDeleteConfirmModal = ref(false);
  const editingShift = ref(null);
  const shiftToDelete = ref(null);

  // Computed from store
  const loading = computed(() => shiftTypesStore.loading);
  const shiftTypes = computed(() => shiftTypesStore.getShiftTypes);

  // Form data
  const shiftForm = ref({
    name: '',
    start_time: '',
    end_time: '',
    color_class: 'bg-blue-100 text-blue-800', // Default color
    description: '',
  });

  // Methods
  const loadShiftTypes = async () => {
    try {
      await shiftTypesStore.fetchShiftTypes();
    } catch (error) {
      console.error('Error loading shift types:', error);
      showError('Failed to load shift types');
    }
  };

  const openAddModal = () => {
    shiftForm.value = {
      name: '',
      start_time: '',
      end_time: '',
      color_class: 'bg-blue-100 text-blue-800', // Default color
      description: '',
    };
    editingShift.value = null;
    showAddModal.value = true;
  };

  const openEditModal = (shift) => {
    editingShift.value = shift;
    shiftForm.value = {
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      color_class: shift.color_class,
      description: shift.description || '',
    };
    showAddModal.value = true;
  };

  const saveShift = async () => {
    try {
      if (
        !shiftForm.value.name ||
        !shiftForm.value.start_time ||
        !shiftForm.value.end_time
      ) {
        showWarning('Please fill in all required fields');
        return;
      }

      const shiftData = {
        name: shiftForm.value.name,
        start_time: shiftForm.value.start_time,
        end_time: shiftForm.value.end_time,
        color_class: shiftForm.value.color_class,
        description: shiftForm.value.description,
      };

      if (editingShift.value) {
        // Update existing shift
        await shiftTypesStore.updateShiftType(editingShift.value.id, shiftData);
        showSuccess('Shift type updated successfully');
      } else {
        // Create new shift
        await shiftTypesStore.createShiftType(shiftData);
        showSuccess('Shift type created successfully');
      }

      closeModals();
      emit('shift-updated');
    } catch (error) {
      console.error('Error saving shift type:', error);
      showError(error.message || 'Failed to save shift type');
    }
  };

  const deleteShift = (shift) => {
    shiftToDelete.value = shift;
    showDeleteConfirmModal.value = true;
  };

  const confirmDeleteShift = async () => {
    try {
      if (shiftToDelete.value) {
        await shiftTypesStore.deleteShiftType(shiftToDelete.value.id);
        showSuccess('Shift type deleted successfully');
        emit('shift-updated');
      }
      closeModals();
    } catch (error) {
      console.error('Error deleting shift type:', error);
      showError(error.message || 'Failed to delete shift type');
    }
  };

  const closeModals = () => {
    showAddModal.value = false;
    showEditModal.value = false;
    showDeleteConfirmModal.value = false;
    editingShift.value = null;
    shiftToDelete.value = null;
    shiftForm.value = {
      name: '',
      start_time: '',
      end_time: '',
      color_class: 'bg-success/20 text-success', // Default color
      description: '',
    };
  };

  const closeMainModal = () => {
    emit('close');
    closeModals();
  };

  // Initialize
  onMounted(() => {
    loadShiftTypes();
  });
</script>

<template>
  <!-- Main Shift Management Modal -->
  <div v-if="isOpen" class="modal modal-open">
    <div class="modal-box max-w-4xl">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h3 class="font-bold text-xl text-primaryColor flex items-center">
          <Clock class="w-6 h-6 mr-2" />
          Shift Types Management
        </h3>
        <button @click="closeMainModal" class="btn btn-ghost btn-sm">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Description -->
      <div class="mb-6">
        <p class="text-gray-600">
          Manage available shift types that can be assigned to employees across
          all departments. These shifts will be available for scheduling in all
          branches.
        </p>
      </div>

      <!-- Add New Shift Button -->
      <div class="flex justify-end mb-4">
        <button
          @click="openAddModal"
          class="btn bg-primaryColor text-white font-thin hover:bg-primaryColor/80 btn-sm"
        >
          <Plus class="w-4 h-4 mr-2" />
          Add New Shift Type
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="loading loading-spinner loading-lg text-primaryColor"></div>
      </div>

      <!-- Shift Types List -->
      <div v-else class="space-y-4">
        <div v-if="shiftTypes.length === 0" class="text-center py-12">
          <Clock class="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            No shift types found
          </h3>
          <p class="text-gray-600 mb-4">
            Create your first shift type to get started
          </p>
          <button
            @click="openAddModal"
            class="btn bg-primaryColor text-white font-thin hover:bg-primaryColor/80 btn-sm"
          >
            <Plus class="w-4 h-4 mr-2" />
            Add Shift Type
          </button>
        </div>

        <div v-else class="grid gap-4">
          <div
            v-for="shift in shiftTypes"
            :key="shift.id"
            class="card bg-white shadow-lg border border-gray-200"
          >
            <div class="card-body p-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                  <!-- Color Preview -->
                  <div
                    :class="[
                      shift.color_class,
                      'w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm',
                    ]"
                  >
                    {{ shift.name.charAt(0) }}
                  </div>

                  <!-- Shift Info -->
                  <div>
                    <h4 class="font-semibold text-lg">{{ shift.name }}</h4>
                    <div
                      class="flex items-center space-x-4 text-sm text-gray-600"
                    >
                      <span class="flex items-center">
                        <Clock class="w-3 h-3 mr-1" />
                        {{ shift.start_time }} - {{ shift.end_time }}
                      </span>
                      <span v-if="shift.description">{{
                        shift.description
                      }}</span>
                    </div>
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex items-center space-x-2">
                  <button
                    @click="openEditModal(shift)"
                    class="btn btn-ghost btn-sm"
                    title="Edit shift type"
                  >
                    <Edit class="w-4 h-4" />
                  </button>
                  <button
                    @click="deleteShift(shift)"
                    class="btn btn-ghost btn-sm text-error"
                    title="Delete shift type"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Add/Edit Shift Modal -->
  <div v-if="showAddModal" class="modal modal-open">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">
        {{ editingShift ? 'Edit Shift Type' : 'Add New Shift Type' }}
      </h3>

      <div class="space-y-4">
        <!-- Shift Name -->
        <div>
          <label class="label">
            <span class="label-text">Shift Name *</span>
          </label>
          <input
            v-model="shiftForm.name"
            type="text"
            placeholder="e.g., Morning Shift"
            class="input input-bordered w-full"
          />
        </div>

        <!-- Time Range -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="label">
              <span class="label-text">Start Time *</span>
            </label>
            <input
              v-model="shiftForm.start_time"
              type="time"
              class="input input-bordered w-full"
            />
          </div>
          <div>
            <label class="label">
              <span class="label-text">End Time *</span>
            </label>
            <input
              v-model="shiftForm.end_time"
              type="time"
              class="input input-bordered w-full"
            />
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="label">
            <span class="label-text">Description (Optional)</span>
          </label>
          <textarea
            v-model="shiftForm.description"
            class="textarea textarea-bordered w-full"
            placeholder="Brief description of this shift..."
            rows="3"
          ></textarea>
        </div>
      </div>

      <div class="modal-action">
        <button
          @click="closeModals"
          class="btn btn-outline font-thin hover:bg-primaryColor/10 btn-sm border border-none"
          :disabled="loading"
        >
          Cancel
        </button>
        <button
          @click="saveShift"
          class="btn bg-primaryColor text-white font-thin hover:bg-primaryColor/80 btn-sm"
          :disabled="loading"
        >
          <span
            v-if="loading"
            class="loading loading-spinner loading-xs mr-2"
          ></span>
          {{
            loading
              ? editingShift
                ? 'Updating...'
                : 'Creating...'
              : editingShift
                ? 'Update'
                : 'Create'
          }}
          Shift Type
        </button>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <div v-if="showDeleteConfirmModal" class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4 text-error">
        <Trash2 class="w-6 h-6 inline mr-2" />
        Delete Shift Type
      </h3>

      <div class="space-y-4">
        <div class="alert bg-warning/10 text-warning border-warning">
          <AlertCircle class="w-5 h-5" />
          <div>
            <h4 class="font-medium">
              Are you sure you want to delete this shift type?
            </h4>
            <p class="text-sm mt-1">
              <strong>{{ shiftToDelete?.name }}</strong> will be permanently
              removed.
            </p>
          </div>
        </div>

        <div class="text-sm text-gray-600">
          <p>
            <strong>Note:</strong> This action cannot be undone. If this shift
            type is currently being used in employee schedules, the deletion
            will be prevented.
          </p>
        </div>
      </div>

      <div class="modal-action">
        <button
          @click="closeModals"
          class="btn btn-outline font-thin hover:bg-primaryColor/10 btn-sm border border-none"
          :disabled="loading"
        >
          Cancel
        </button>
        <button
          @click="confirmDeleteShift"
          class="btn bg-error text-white btn-sm font-thin border-none hover:bg-error/80"
          :disabled="loading"
        >
          <span
            v-if="loading"
            class="loading loading-spinner loading-xs mr-2"
          ></span>
          {{ loading ? 'Deleting...' : 'Delete Shift Type' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .modal-box {
    max-height: 90vh;
    overflow-y: auto;
  }
</style>
