<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Enhanced Backdrop with Blur -->
    <div
      class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
      @click="closeModal"
    ></div>

    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-2 sm:p-4">
      <div
        class="relative w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-2xl transform transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in-0 zoom-in-95 max-h-[95vh] overflow-y-auto"
      >
        <!-- Header -->
        <div
          class="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl sm:rounded-t-2xl shadow-lg sticky top-0 z-10"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <img
                src="/src/assets/crm/GrabFood.png"
                alt="Grabfood Logo"
                class="w-6 h-6 sm:w-8 sm:h-8 object-contain flex-shrink-0"
              />
              <h2 class="text-lg sm:text-xl lg:text-2xl font-bold truncate">Order on Grabfood</h2>
            </div>
            <button
              @click="closeModal"
              class="text-white hover:text-gray-200 transition-colors p-1.5 sm:p-2 hover:bg-white/10 rounded-full flex-shrink-0 ml-2"
              aria-label="Close modal"
            >
              <svg
                class="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>
          <p class="text-green-100 mt-2 text-xs sm:text-sm">
            Choose your preferred branch to order from
          </p>
        </div>

        <!-- Content -->
        <div class="p-4 sm:p-6">
          <!-- Branch Selection -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <!-- Burol Main Branch -->
            <div
              class="border-2 border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-green-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-white"
              :class="{
                'border-green-500 bg-green-50 shadow-lg scale-105':
                  selectedBranch === 'burol-main',
              }"
              @click="selectBranch('burol-main')"
            >
              <div class="flex items-center space-x-2 sm:space-x-3">
                <div
                  class="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  :class="
                    selectedBranch === 'burol-main'
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300'
                  "
                >
                  <div
                    v-if="selectedBranch === 'burol-main'"
                    class="w-2 h-2 bg-white rounded-full"
                  ></div>
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="font-semibold text-gray-800 text-sm sm:text-base">Burol Main Branch</h3>
                  <p class="text-xs sm:text-sm text-gray-600 truncate">
                    PMI Building Congressional Road
                  </p>
                </div>
              </div>
            </div>

            <!-- Cantimbuhan Branch -->
            <div
              class="border-2 border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-green-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-white"
              :class="{
                'border-green-500 bg-green-50 shadow-lg scale-105':
                  selectedBranch === 'cantimbuhan',
              }"
              @click="selectBranch('cantimbuhan')"
            >
              <div class="flex items-center space-x-2 sm:space-x-3">
                <div
                  class="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  :class="
                    selectedBranch === 'cantimbuhan'
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300'
                  "
                >
                  <div
                    v-if="selectedBranch === 'cantimbuhan'"
                    class="w-2 h-2 bg-white rounded-full"
                  ></div>
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="font-semibold text-gray-800 text-sm sm:text-base">
                    Cantimbuhan Branch
                  </h3>
                  <p class="text-xs sm:text-sm text-gray-600 truncate">
                    Back of 7eleven Cantimbuhan Street
                  </p>
                </div>
              </div>
            </div>

            <!-- Coming Soon Branches -->
            <div
              class="border-2 border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 bg-gray-50 opacity-60"
            >
              <div class="flex items-center space-x-2 sm:space-x-3">
                <div
                  class="w-4 h-4 rounded-full border-2 border-gray-300 bg-gray-300 flex items-center justify-center flex-shrink-0"
                >
                  <svg
                    class="w-2 h-2 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    ></path>
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="font-semibold text-gray-500 text-sm sm:text-base">Burol Branch</h3>
                  <p class="text-xs sm:text-sm text-gray-400">Coming Soon on Grabfood</p>
                </div>
              </div>
            </div>

            <div
              class="border-2 border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 bg-gray-50 opacity-60"
            >
              <div class="flex items-center space-x-2 sm:space-x-3">
                <div
                  class="w-4 h-4 rounded-full border-2 border-gray-300 bg-gray-300 flex items-center justify-center flex-shrink-0"
                >
                  <svg
                    class="w-2 h-2 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    ></path>
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <h3 class="font-semibold text-gray-500 text-sm sm:text-base">Malihan Branch</h3>
                  <p class="text-xs sm:text-sm text-gray-400">Coming Soon on Grabfood</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Branch Details -->
          <div v-if="selectedBranch" class="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <h4 class="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Branch Information</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
              <div>
                <span class="font-medium text-gray-600">Address:</span>
                <p class="text-gray-800">
                  {{ branchDetails[selectedBranch].address }}
                </p>
              </div>
              <div>
                <span class="font-medium text-gray-600">Operating Hours:</span>
                <p class="text-gray-800">
                  {{ branchDetails[selectedBranch].hours }}
                </p>
              </div>
              <div>
                <span class="font-medium text-gray-600">Delivery:</span>
                <p class="text-gray-800">
                  {{ branchDetails[selectedBranch].delivery }}
                </p>
              </div>
              <div>
                <span class="font-medium text-gray-600">Payment:</span>
                <p class="text-gray-800">
                  {{ branchDetails[selectedBranch].payment }}
                </p>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <!-- Order on Grabfood Website -->
            <button
              v-if="selectedBranch"
              @click="orderOnWebsite"
              class="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium sm:font-semibold transition-all duration-300 flex items-center justify-center space-x-2 group shadow-lg hover:shadow-xl hover:-translate-y-1 text-sm sm:text-base"
            >
              <svg
                class="w-5 h-5 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                ></path>
              </svg>
              <span>Order on Grabfood</span>
            </button>

            <!-- Download App -->
            <button
              @click="downloadApp"
              class="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium sm:font-semibold transition-all duration-300 flex items-center justify-center space-x-2 group shadow-lg hover:shadow-xl hover:-translate-y-1 text-sm sm:text-base"
            >
              <svg
                class="w-5 h-5 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                ></path>
              </svg>
              <span>Download App</span>
            </button>
          </div>

          <!-- Additional Info -->
          <div class="mt-4 sm:mt-6 p-3 sm:p-4 bg-green-50 rounded-lg sm:rounded-xl border border-green-200">
            <div class="flex items-start space-x-2 sm:space-x-3">
              <div
                class="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              >
                <svg
                  class="w-3 h-3 sm:w-4 sm:h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
              </div>
              <div class="text-xs sm:text-sm text-green-800">
                <p class="font-medium mb-1">💡 Pro Tip:</p>
                <p>
                  Download the Grabfood app for the best ordering experience
                  with real-time tracking, exclusive deals, and multiple payment
                  options!
                </p>
              </div>
            </div>
          </div>

          <!-- Coming Soon Notice -->
          <div class="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg sm:rounded-xl border border-blue-200">
            <div class="flex items-start space-x-2 sm:space-x-3">
              <div
                class="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              >
                <svg
                  class="w-3 h-3 sm:w-4 sm:h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
              </div>
              <div class="text-xs sm:text-sm text-blue-800">
                <p class="font-medium mb-1">🕒 Coming Soon:</p>
                <p>
                  More branches will be available on Grabfood soon! For now, you
                  can order from Burol Main and Cantimbuhan branches.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue';

  const props = defineProps({
    isOpen: {
      type: Boolean,
      default: false,
    },
  });

  const emit = defineEmits(['close']);

  const selectedBranch = ref('');

  const branchDetails = {
    'burol-main': {
      address: 'PMI Building Congressional Road Burol Main 4th District',
      hours: '11:00 AM - 9:00 PM',
      delivery: 'Fast delivery available',
      payment: 'Multiple payment options',
      url: 'https://food.grab.com/ph/en/restaurant/countryside-burgerhouse-burol-main-delivery/2-C62CNCDFVYCEJA?',
    },
    cantimbuhan: {
      address: 'Back of 7eleven Cantimbuhan Street Zone IV 4th District',
      hours: '12:00 AM - 11:59 PM',
      delivery: 'Fast delivery available',
      payment: 'Multiple payment options',
      url: 'https://food.grab.com/ph/en/restaurant/countryside-cantimbuhan-delivery/2-C4MZEJEDC6TUR2?',
    },
  };

  const selectBranch = (branch) => {
    selectedBranch.value = branch;
  };

  const closeModal = () => {
    emit('close');
    selectedBranch.value = '';
  };

  const orderOnWebsite = () => {
    if (selectedBranch.value && branchDetails[selectedBranch.value]) {
      window.open(branchDetails[selectedBranch.value].url, '_blank');
    }
  };

  const downloadApp = () => {
    // Detect device and redirect to appropriate app store
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    if (/android/i.test(userAgent)) {
      // Android - Google Play Store
      window.open(
        'https://play.google.com/store/apps/details?id=com.grabfood.android',
        '_blank'
      );
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      // iOS - App Store
      window.open(
        'https://apps.apple.com/app/grabfood-food-delivery/id1477395954',
        '_blank'
      );
    } else {
      // Desktop - redirect to main Grabfood website
      window.open('https://food.grab.com/ph/en/', '_blank');
    }
  };
</script>

<style scoped>
  /* Enhanced modal animations */
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes modalFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* Modal backdrop blur effect */
  .backdrop-blur-sm {
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  /* Modal entrance animation */
  .animate-in {
    animation: modalSlideIn 0.3s ease-out;
  }

  .slide-in-from-bottom-4 {
    animation: modalSlideIn 0.3s ease-out;
  }

  .fade-in-0 {
    animation: modalFadeIn 0.3s ease-out;
  }

  .zoom-in-95 {
    animation: modalSlideIn 0.3s ease-out;
  }

  /* Enhanced hover effects */
  .branch-option:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  /* Selected branch styling */
  .branch-option.selected {
    border-color: #16a34a;
    background-color: #f0fdf4;
    box-shadow: 0 10px 30px rgba(22, 163, 74, 0.2);
  }

  /* Button hover animations */
  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }

  /* Smooth transitions for all elements */
  * {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Enhanced shadow effects */
  .shadow-2xl {
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  .shadow-lg {
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  .shadow-xl {
    box-shadow:
      0 20px 25px -5px rgba(0, 0, 0, 0.1),
      0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  /* Mobile responsive improvements */
  @media (max-width: 640px) {
    .overflow-y-auto {
      -webkit-overflow-scrolling: touch;
    }
  }
</style>
