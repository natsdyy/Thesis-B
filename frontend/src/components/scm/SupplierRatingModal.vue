<template>
  <dialog id="supplier_rating_modal" class="modal">
    <div
      class="modal-box bg-accentColor text-black/50 shadow-lg max-w-md w-11/12"
    >
      <h3 class="font-bold text-lg sm:text-xl mb-4 text-primaryColor">
        Rate Your Experience
      </h3>

      <div class="text-center mb-6">
        <p class="text-sm sm:text-base mb-4">
          How would you rate your experience with
          <strong>{{ supplierName }}</strong> for this purchase order?
        </p>

        <!-- Star Rating -->
        <div class="flex justify-center items-center gap-2 mb-4">
          <button
            v-for="star in 5"
            :key="star"
            @click="selectedRating = star"
            @mouseenter="hoveredRating = star"
            @mouseleave="hoveredRating = 0"
            class="text-2xl sm:text-3xl transition-colors duration-200"
            :class="{
              'text-yellow-400': star <= (hoveredRating || selectedRating),
              'text-gray-300': star > (hoveredRating || selectedRating),
            }"
          >
            ★
          </button>
        </div>

        <!-- Rating Labels -->
        <div class="text-sm text-black/60 mb-4">
          <span v-if="selectedRating === 1">Poor</span>
          <span v-else-if="selectedRating === 2">Fair</span>
          <span v-else-if="selectedRating === 3">Good</span>
          <span v-else-if="selectedRating === 4">Very Good</span>
          <span v-else-if="selectedRating === 5">Excellent</span>
          <span v-else>Select a rating</span>
        </div>

        <!-- Comment Section -->
        <div class="form-control">
          <label class="label">
            <span class="label-text text-black/70 font-medium"
              >Additional Comments (Optional)</span
            >
          </label>
          <textarea
            v-model="comment"
            placeholder="Share your experience with this supplier..."
            class="textarea textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            rows="3"
          ></textarea>
        </div>
      </div>

      <!-- Modal Actions -->
      <div class="modal-action flex-col sm:flex-row gap-2">
        <button
          class="btn btn-sm font-thin bg-gray-200 text-black/50 border-none hover:bg-gray-300 shadow-none w-full sm:w-auto"
          @click="closeModal"
          :disabled="loading"
        >
          Skip Rating
        </button>
        <button
          class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80 w-full sm:w-auto"
          @click="submitRating"
          :disabled="!selectedRating || loading || !purchaseOrder.id"
        >
          <span
            class="loading loading-spinner loading-xs mr-2"
            v-if="loading"
          ></span>
          Submit Rating
        </button>
      </div>
    </div>
  </dialog>
</template>

<script setup>
  import { ref, watch } from 'vue';
  import { usePurchaseOrderStore } from '../../stores/purchaseOrderStore.js';

  const props = defineProps({
    show: {
      type: Boolean,
      default: false,
    },
    purchaseOrder: {
      type: Object,
      required: false, // Change from required: true to required: false
      default: () => ({}), // Provide a default empty object
    },
    supplierName: {
      type: String,
      required: false, // Change from required: true to required: false
      default: '',
    },
  });

  const emit = defineEmits(['close', 'rating-submitted']);

  const purchaseOrderStore = usePurchaseOrderStore();

  const selectedRating = ref(0);
  const hoveredRating = ref(0);
  const comment = ref('');
  const loading = ref(false);

  // Define functions first before using them in watchers
  const openModal = () => {
    console.log('Opening supplier rating modal...');
    const modalElement = document.getElementById('supplier_rating_modal');
    if (modalElement) {
      modalElement.showModal();
      console.log('Modal opened successfully');
    } else {
      console.error('Modal element not found');
    }
  };

  const closeModal = () => {
    document.getElementById('supplier_rating_modal')?.close();
    resetForm();
    emit('close');
  };

  const resetForm = () => {
    selectedRating.value = 0;
    hoveredRating.value = 0;
    comment.value = '';
    loading.value = false;
  };

  const submitRating = async () => {
    if (!selectedRating.value || !props.purchaseOrder.id) {
      return;
    }

    loading.value = true;

    try {
      const ratingData = {
        supplier_id: props.purchaseOrder.supplier_id,
        purchase_order_id: props.purchaseOrder.id,
        rating: selectedRating.value,
        comment: comment.value.trim() || null,
        rated_by: 'SCM User', // You can get this from auth store
      };

      await purchaseOrderStore.submitSupplierRating(ratingData);

      emit('rating-submitted', {
        rating: selectedRating.value,
        comment: comment.value,
      });

      closeModal();
    } catch (error) {
      console.error('Error submitting rating:', error);
      // You can show a toast error here
    } finally {
      loading.value = false;
    }
  };

  // Watch for show prop changes - now the functions are defined
  watch(
    () => props.show,
    (newValue) => {
      console.log('SupplierRatingModal show prop changed:', newValue);
      if (newValue) {
        openModal();
      } else {
        closeModal();
      }
    },
    { immediate: true }
  );
</script>

<style scoped>
  /* Star rating hover effects */
  button:hover {
    transform: scale(1.1);
    transition: transform 0.2s ease;
  }

  /* Modal backdrop */
  .modal::backdrop {
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
  }
</style>
