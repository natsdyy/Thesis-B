<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-2xl mx-auto px-4">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-primaryColor mb-2">
          Rate Your Order
        </h1>
        <p class="text-gray-600">Help us improve by sharing your experience</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="loading loading-spinner loading-lg text-primaryColor"></div>
        <p class="mt-4 text-gray-600">Loading order details...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="card bg-white shadow-lg">
        <div class="card-body text-center">
          <div class="text-red-500 mb-4">
            <svg
              class="w-16 h-16 mx-auto"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">
            Invalid QR Code
          </h3>
          <p class="text-gray-600 mb-4">{{ error }}</p>
          <button
            @click="goHome"
            class="btn bg-primaryColor text-white font-thin"
          >
            Go Home
          </button>
        </div>
      </div>

      <!-- Rating Form -->
      <div v-else-if="orderData" class="space-y-6">
        <!-- Order Summary -->
        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <h2 class="card-title text-primaryColor mb-4">Order Summary</h2>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium text-gray-600">Order Number:</span>
                <p class="font-semibold">{{ orderData.orderNumber }}</p>
              </div>
              <div>
                <span class="font-medium text-gray-600">Branch:</span>
                <p class="font-semibold">{{ orderData.branch }}</p>
              </div>
              <div>
                <span class="font-medium text-gray-600">Cashier:</span>
                <p class="font-semibold">{{ orderData.cashier }}</p>
              </div>
              <div>
                <span class="font-medium text-gray-600">Total:</span>
                <p class="font-semibold">₱{{ orderData.total }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Order Items -->
        <div class="card bg-white shadow-lg">
          <div class="card-body">
            <h3 class="card-title text-primaryColor mb-4">Your Order</h3>
            <div class="space-y-3">
              <div
                v-for="item in orderData.items"
                :key="item.id"
                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div class="flex items-center space-x-3">
                  <img
                    v-if="item.image_url"
                    :src="formatImageUrl(item.image_url)"
                    :alt="item.item_name"
                    class="w-12 h-12 object-cover rounded"
                  />
                  <div>
                    <p class="font-medium">{{ item.item_name }}</p>
                    <p class="text-sm text-gray-600">
                      ₱{{ item.unit_price }} × {{ item.quantity }}
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="font-semibold">₱{{ item.total_price }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Rating Form -->
        <form @submit.prevent="submitRating" class="card bg-white shadow-lg">
          <div class="card-body">
            <h3 class="card-title text-primaryColor mb-4">
              Rate Your Experience
            </h3>

            <!-- Customer Information -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label class="label">
                  <span class="label-text">Your Name *</span>
                </label>
                <input
                  v-model="form.customerName"
                  type="text"
                  class="input input-bordered w-full"
                  placeholder="Enter your name"
                  required
                />
              </div>
              <div>
                <label class="label">
                  <span class="label-text">Email Address *</span>
                </label>
                <input
                  v-model="form.customerEmail"
                  type="email"
                  class="input input-bordered w-full"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <!-- Overall Rating -->
            <div class="mb-6">
              <label class="label">
                <span class="label-text">Overall Experience *</span>
              </label>
              <div class="flex items-center space-x-2 select-none">
                <div
                  v-for="star in 5"
                  :key="`overall-star-${star}`"
                  class="relative w-8 h-8 cursor-pointer"
                  @mousemove="onOverallStarMove(star, $event)"
                  @mouseleave="onOverallStarLeave"
                  @click="onOverallStarClick(star, $event)"
                >
                  <!-- Star with gradient fill for proper half-star -->
                  <svg
                    viewBox="0 0 24 24"
                    class="absolute inset-0 w-full h-full"
                  >
                    <defs>
                      <linearGradient
                        :id="`overall-grad-${star}`"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stop-color="#fbbf24" />
                        <stop
                          :offset="getOverallStarFill(star) + '%'"
                          stop-color="#fbbf24"
                        />
                        <stop
                          :offset="getOverallStarFill(star) + '%'"
                          stop-color="#d1d5db"
                        />
                        <stop offset="100%" stop-color="#d1d5db" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M12 17.27L18.18 21 16.54 13.97 22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                      :fill="`url(#overall-grad-${star})`"
                    />
                  </svg>
                </div>
                <span class="ml-2 text-sm text-gray-600 min-w-24">
                  {{
                    displayOverallRating
                      ? `${displayOverallRating} star${displayOverallRating !== 1 ? 's' : ''}`
                      : 'Select rating'
                  }}
                </span>
              </div>
            </div>

            <!-- Item Ratings -->
            <div class="mb-6">
              <label class="label">
                <span class="label-text">Rate Individual Items</span>
              </label>
              <div class="space-y-4">
                <div
                  v-for="item in orderData.items"
                  :key="item.id"
                  class="p-4 border border-gray-200 rounded-lg"
                >
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-medium">{{ item.item_name }}</span>
                    <div class="flex items-center space-x-1 select-none">
                      <div
                        v-for="star in 5"
                        :key="`item-${item.id}-star-${star}`"
                        class="relative w-6 h-6 cursor-pointer"
                        @mousemove="onItemStarMove(item.id, star, $event)"
                        @mouseleave="onItemStarLeave(item.id)"
                        @click="onItemStarClick(item.id, star, $event)"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          class="absolute inset-0 w-full h-full"
                        >
                          <defs>
                            <linearGradient
                              :id="`item-grad-${item.id}-${star}`"
                              x1="0%"
                              y1="0%"
                              x2="100%"
                              y2="0%"
                            >
                              <stop offset="0%" stop-color="#fbbf24" />
                              <stop
                                :offset="getItemStarFill(item.id, star) + '%'"
                                stop-color="#fbbf24"
                              />
                              <stop
                                :offset="getItemStarFill(item.id, star) + '%'"
                                stop-color="#d1d5db"
                              />
                              <stop offset="100%" stop-color="#d1d5db" />
                            </linearGradient>
                          </defs>
                          <path
                            d="M12 17.27L18.18 21 16.54 13.97 22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                            :fill="`url(#item-grad-${item.id}-${star})`"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <textarea
                    :value="getItemComment(item.id)"
                    @input="setItemComment(item.id, $event.target.value)"
                    class="textarea textarea-bordered w-full textarea-sm"
                    placeholder="Optional comment about this item..."
                    rows="2"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- Additional Comments -->
            <div class="mb-6">
              <label class="label">
                <span class="label-text">Additional Comments</span>
              </label>
              <textarea
                v-model="form.comments"
                class="textarea textarea-bordered w-full"
                placeholder="Share any additional feedback about your experience..."
                rows="4"
              ></textarea>
            </div>

            <!-- Photo Upload (Optional) -->
            <div class="mb-6">
              <label class="label">
                <span class="label-text">Share a Photo (Optional)</span>
              </label>
              <input
                ref="photoInput"
                type="file"
                accept="image/*"
                @change="handlePhotoUpload"
                class="file-input file-input-bordered w-full"
              />
              <div v-if="form.photo" class="mt-2">
                <img
                  :src="form.photoPreview"
                  alt="Preview"
                  class="w-32 h-32 object-cover rounded"
                />
              </div>
            </div>

            <!-- Submit Button -->
            <div class="flex justify-end space-x-3">
              <button
                type="button"
                @click="goHome"
                class="btn bg-gray-300 text-gray-700 font-thin hover:bg-gray-300/90"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="
                  !form.customerName ||
                  !form.customerEmail ||
                  !form.overallRating ||
                  submitting
                "
                class="btn bg-primaryColor text-white font-thin hover:bg-primaryColor/90"
              >
                <span
                  v-if="submitting"
                  class="loading loading-spinner loading-sm mr-2"
                ></span>
                Submit Rating
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import axios from 'axios';
  import feedbackService from '../services/feedbackService.js';
  import { useCustomToast } from '../composables/useCustomToast.js';
  import { apiConfig, formatImageUrl } from '../config/api.js';

  const route = useRoute();
  const router = useRouter();

  // State
  const loading = ref(true);
  const error = ref(null);
  const orderData = ref(null);
  const submitting = ref(false);
  const { showSuccess, showError } = useCustomToast();

  // Form data
  const form = ref({
    customerName: '',
    customerEmail: '',
    overallRating: 0,
    itemRatings: {},
    comments: '',
    photo: null,
    photoPreview: null,
  });

  // Methods
  // Overall rating hover state (supports half-stars)
  const overallHoverRating = ref(0);

  const getActiveOverallRating = () => {
    return overallHoverRating.value || form.value.overallRating || 0;
  };

  const getOverallStarFill = (star) => {
    const rating = getActiveOverallRating();
    if (rating >= star) return 100;
    if (rating <= star - 1) return 0;
    const fractional = rating - (star - 1);
    return Math.max(0, Math.min(1, fractional)) * 100;
  };

  const onOverallStarMove = (star, event) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left; // within star
    const ratio = x / rect.width;
    const halfStep = ratio < 0.5 ? 0.5 : 1;
    overallHoverRating.value = star - 1 + halfStep;
  };

  const onOverallStarLeave = () => {
    overallHoverRating.value = 0;
  };

  const onOverallStarClick = (star, event) => {
    onOverallStarMove(star, event);
    form.value.overallRating = overallHoverRating.value;
  };

  const displayOverallRating = computed(() => {
    const value = getActiveOverallRating();
    return value ? value : 0;
  });
  const parseQRData = async () => {
    try {
      // Check if data is embedded in QR code (preferred method)
      const embeddedData = route.query.data;
      if (embeddedData) {
        const parsed = JSON.parse(decodeURIComponent(embeddedData));

        if (parsed.purpose !== 'order_rating') {
          throw new Error('Invalid QR code - not a rating code');
        }

        return parsed;
      }

      // Fallback: fetch from API using order number
      const orderNumber = route.query.order;
      if (!orderNumber) {
        throw new Error('No order data found in QR code');
      }

      // Fetch order details from the public API endpoint
      const response = await axios.get(
        `${apiConfig.baseURL}/pos/orders/public/${encodeURIComponent(orderNumber)}`
      );

      if (!response.data || !response.data.success) {
        throw new Error('Order not found');
      }

      const orderData = response.data.data;

      return {
        purpose: 'order_rating',
        orderNumber: orderData.order_number,
        total: orderData.total_amount,
        timestamp: orderData.created_at,
        branch: orderData.branch?.name || 'Unknown Branch',
        cashier: orderData.cashier?.name || 'Unknown Cashier',
        items: orderData.items || [],
      };
    } catch (err) {
      console.error('Error parsing QR data:', err);
      throw new Error('Invalid QR code or order not found');
    }
  };

  const setItemRating = (itemId, rating) => {
    if (!form.value.itemRatings[itemId]) {
      form.value.itemRatings[itemId] = {};
    }
    form.value.itemRatings[itemId].rating = rating;
  };

  const getItemRating = (itemId) => {
    return form.value.itemRatings[itemId]?.rating || 0;
  };

  const getItemComment = (itemId) => {
    if (!form.value.itemRatings[itemId]) {
      form.value.itemRatings[itemId] = {};
    }
    return form.value.itemRatings[itemId].comment || '';
  };

  const setItemComment = (itemId, comment) => {
    if (!form.value.itemRatings[itemId]) {
      form.value.itemRatings[itemId] = {};
    }
    form.value.itemRatings[itemId].comment = comment;
  };

  // Item-level hover ratings (map itemId -> hover value)
  const itemHoverRatings = ref({});

  const getActiveItemRating = (itemId) => {
    return (
      itemHoverRatings.value[itemId] ||
      form.value.itemRatings[itemId]?.rating ||
      0
    );
  };

  const getItemStarFill = (itemId, star) => {
    const rating = getActiveItemRating(itemId);
    if (rating >= star) return 100;
    if (rating <= star - 1) return 0;
    const fractional = rating - (star - 1);
    return Math.max(0, Math.min(1, fractional)) * 100;
  };

  const onItemStarMove = (itemId, star, event) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = x / rect.width;
    const halfStep = ratio < 0.5 ? 0.5 : 1;
    itemHoverRatings.value[itemId] = star - 1 + halfStep;
  };

  const onItemStarLeave = (itemId) => {
    itemHoverRatings.value[itemId] = 0;
  };

  const onItemStarClick = (itemId, star, event) => {
    onItemStarMove(itemId, star, event);
    setItemRating(itemId, itemHoverRatings.value[itemId]);
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      form.value.photo = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        form.value.photoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const submitRating = async () => {
    submitting.value = true;

    try {
      const response = await feedbackService.submitOrderRating({
        orderData: orderData.value,
        customerName: form.value.customerName,
        customerEmail: form.value.customerEmail,
        overallRating: form.value.overallRating,
        itemRatings: form.value.itemRatings,
        comments: form.value.comments,
        image: form.value.photo,
      });

      if (response.success) {
        showSuccess('Thank you for your rating! We appreciate your feedback.');
        goHome();
      } else {
        throw new Error(response.message || 'Failed to submit rating');
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
      showError(
        err.response?.data?.message ||
          err.message ||
          'Failed to submit rating. Please try again.'
      );
    } finally {
      submitting.value = false;
    }
  };

  const goHome = () => {
    router.push('/');
  };

  // Initialize
  onMounted(async () => {
    try {
      orderData.value = await parseQRData();
      loading.value = false;
    } catch (err) {
      error.value = err.message;
      loading.value = false;
    }
  });
</script>

<style scoped>
  /* Custom styles if needed */
</style>
