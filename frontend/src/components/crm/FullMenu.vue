<template>
  <div class="bg-gray-50 min-h-screen">
    <!-- Header -->
    <header
      class="text-white shadow-lg fixed top-0 left-0 right-0 z-50 bg-green-800 transition-all duration-300"
    >
      <div class="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div class="flex items-center justify-between">
          <!-- Left Side: Mobile Menu Button + Logo and Brand -->
          <div class="flex items-center space-x-2 sm:space-x-4">
            <!-- Mobile Menu Button -->
            <button
              @click="toggleMobileMenu"
              class="mobile-menu-container md:hidden flex items-center justify-center w-10 h-10 text-white hover:text-orange-300 transition-colors duration-300"
              aria-label="Toggle mobile menu"
            >
              <!-- Hamburger Icon -->
              <div class="relative w-6 h-6">
                <span
                  :class="[
                    'absolute block h-0.5 w-6 bg-current transform transition-all duration-300 ease-in-out',
                    isMobileMenuOpen
                      ? 'rotate-45 translate-y-2.5'
                      : 'translate-y-0',
                  ]"
                ></span>
                <span
                  :class="[
                    'absolute block h-0.5 w-6 bg-current transform transition-all duration-300 ease-in-out translate-y-2.5',
                    isMobileMenuOpen ? 'opacity-0' : 'opacity-100',
                  ]"
                ></span>
                <span
                  :class="[
                    'absolute block h-0.5 w-6 bg-current transform transition-all duration-300 ease-in-out',
                    isMobileMenuOpen
                      ? '-rotate-45 translate-y-2.5'
                      : 'translate-y-5',
                  ]"
                ></span>
              </div>
            </button>

            <!-- Logo and Brand -->
            <router-link
              to="/"
              class="flex items-center space-x-2 sm:space-x-4 cursor-pointer group"
            >
              <div
                class="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center"
              >
                <img
                  src="/logo1.png"
                  alt="Countryside Logo"
                  class="w-full h-full object-contain"
                />
              </div>
              <h1
                class="text-lg sm:text-xl md:text-2xl font-bold transition-all duration-300 group-hover:text-orange-300 group-hover:drop-shadow-lg"
              >
                Countryside Steakhouse
              </h1>
            </router-link>
          </div>

          <!-- Desktop Navigation -->
          <nav class="hidden md:flex items-center space-x-10">
            <router-link
              to="/menu"
              class="relative group py-2 px-1 text-orange-300 transition-all duration-300 font-medium"
            >
              <span class="relative z-10">Menu</span>
              <span
                class="absolute bottom-0 left-0 w-full h-0.5 bg-orange-400"
              ></span>
            </router-link>

            <router-link
              to="/stores"
              class="relative group py-2 px-1 text-white hover:text-orange-300 transition-all duration-300 font-medium"
            >
              <span class="relative z-10">Store's</span>
              <span
                class="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 transition-all duration-300 group-hover:w-full"
              ></span>
            </router-link>
            <router-link
              to="/join-us"
              class="relative group py-2 px-1 text-white hover:text-orange-300 transition-all duration-300 font-medium"
            >
              <span class="relative z-10">Join Us</span>
              <span
                class="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 transition-all duration-300 group-hover:w-full"
              ></span>
            </router-link>
            <router-link
              to="/faq"
              class="relative group py-2 px-1 text-white hover:text-orange-300 transition-all duration-300 font-medium"
            >
              <span class="relative z-10">FAQ</span>
              <span
                class="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 transition-all duration-300 group-hover:w-full"
              ></span>
            </router-link>
            <a
              href="#contact"
              class="relative group py-2 px-1 text-white hover:text-orange-300 transition-all duration-300 font-medium"
            >
              <span class="relative z-10">Contact Us</span>
              <span
                class="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 transition-all duration-300 group-hover:w-full"
              ></span>
            </a>
          </nav>

          <!-- Login Button (hidden on mobile, shown on md+) -->
          <div class="hidden md:flex items-center space-x-2 sm:space-x-4">
            <button
              @click="goToLogin"
              class="border border-white text-white px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-sm cursor-pointer transition-all duration-300 shadow-md font-thin text-sm sm:text-base"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Mobile Menu Dropdown -->
    <div
      :class="[
        'mobile-menu-container fixed top-16 sm:top-20 left-0 right-0 bg-green-800 shadow-lg z-40 transform transition-all duration-300 ease-in-out md:hidden',
        isMobileMenuOpen
          ? 'translate-y-0 opacity-100'
          : '-translate-y-full opacity-0',
      ]"
    >
      <nav class="py-3 sm:py-4 px-3 sm:px-4 space-y-1 sm:space-y-2">
        <router-link
          to="/login"
          @click="closeMobileMenu()"
          class="block py-3 sm:py-3 px-3 sm:px-4 text-white hover:text-orange-300 hover:bg-green-700 rounded-lg transition-all duration-300 font-medium text-base sm:text-lg"
        >
          <span class="flex items-center">
            <font-awesome-icon
              icon="fa-solid fa-right-to-bracket"
              class="w-4 h-4 sm:w-5 sm:h-5 mr-3"
            />
            Login
          </span>
        </router-link>
        <router-link
          to="/menu"
          @click="closeMobileMenu()"
          class="block py-3 sm:py-3 px-3 sm:px-4 text-orange-300 hover:text-orange-300 hover:bg-green-700 rounded-lg transition-all duration-300 font-medium text-base sm:text-lg"
        >
          <span class="flex items-center">
            <font-awesome-icon
              icon="fa-solid fa-utensils"
              class="w-4 h-4 sm:w-5 sm:h-5 mr-3"
            />
            Menu
          </span>
        </router-link>
        <router-link
          to="/stores"
          @click="closeMobileMenu()"
          class="block py-3 sm:py-3 px-3 sm:px-4 text-white hover:text-orange-300 hover:bg-green-700 rounded-lg transition-all duration-300 font-medium text-base sm:text-lg"
        >
          <span class="flex items-center">
            <font-awesome-icon
              icon="fa-solid fa-store"
              class="w-4 h-4 sm:w-5 sm:h-5 mr-3"
            />
            Store's
          </span>
        </router-link>
        <router-link
          to="/join-us"
          @click="closeMobileMenu()"
          class="block py-3 sm:py-3 px-3 sm:px-4 text-white hover:text-orange-300 hover:bg-green-700 rounded-lg transition-all duration-300 font-medium text-base sm:text-lg"
        >
          <span class="flex items-center">
            <font-awesome-icon
              icon="fa-solid fa-user-plus"
              class="w-4 h-4 sm:w-5 sm:h-5 mr-3"
            />
            Join Us
          </span>
        </router-link>
        <router-link
          to="/faq"
          @click="closeMobileMenu()"
          class="block py-3 sm:py-3 px-3 sm:px-4 text-white hover:text-orange-300 hover:bg-green-700 rounded-lg transition-all duration-300 font-medium text-base sm:text-lg"
        >
          <span class="flex items-center">
            <font-awesome-icon
              icon="fa-solid fa-circle-question"
              class="w-4 h-4 sm:w-5 sm:h-5 mr-3"
            />
            FAQ
          </span>
        </router-link>
        <a
          href="#contact"
          @click="closeMobileMenu()"
          class="block py-3 sm:py-3 px-3 sm:px-4 text-white hover:text-orange-300 hover:bg-green-700 rounded-lg transition-all duration-300 font-medium text-base sm:text-lg"
        >
          <span class="flex items-center">
            <font-awesome-icon
              icon="fa-solid fa-phone"
              class="w-4 h-4 sm:w-5 sm:h-5 mr-3"
            />
            Contact Us
          </span>
        </a>
      </nav>
    </div>

    <div
      class="container mx-auto px-4 sm:px-6 py-4 sm:py-8 lg:py-12 pt-20 sm:pt-24 lg:pt-32"
    >
      <!-- Mobile Header (Mobile Only) -->
      <div class="lg:hidden mb-4">
        <!-- Menu Title -->
        <div class="mb-3">
          <h1 class="text-xl font-bold text-green-800">Menu</h1>
        </div>

        <!-- Horizontal Scrollable Category Filters (Mobile) -->
        <div class="overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          <div class="flex gap-2 whitespace-nowrap">
            <button
              v-for="category in menuCategories"
              :key="category"
              @click="selectedCategory = category"
              :class="[
                'px-4 py-2 rounded-full font-medium transition-all duration-300 text-sm whitespace-nowrap flex-shrink-0',
                selectedCategory === category
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
              ]"
            >
              {{ category }}
            </button>
          </div>
        </div>
      </div>

      <!-- Desktop Title and Sidebar (Desktop Only) -->
      <div class="hidden lg:block mb-6 lg:mb-8 mt-4 sm:mt-6 lg:mt-8">
        <h1 class="text-3xl lg:text-5xl font-bold text-green-800">Menu</h1>
      </div>

      <!-- Category Filters and Menu Grid Container -->
      <div class="flex flex-col lg:flex-row gap-4 lg:gap-8">
        <!-- Side Category Filters (Desktop Only) -->
        <div class="hidden lg:block lg:w-64 lg:flex-shrink-0">
          <div
            class="bg-white rounded-2xl shadow-lg p-6 sticky top-24 border border-gray-100"
          >
            <h3
              class="text-lg font-bold text-green-800 mb-4 flex items-center gap-2"
            >
              <UtensilsCrossed :size="20" class="text-orange-500" />
              Categories
            </h3>
            <div class="space-y-2">
              <button
                v-for="category in menuCategories"
                :key="category"
                @click="selectedCategory = category"
                :class="[
                  'w-full text-left px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-between',
                  selectedCategory === category
                    ? 'bg-orange-500 text-white shadow-md transform scale-[1.02]'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-green-700',
                ]"
              >
                <span>{{ category }}</span>
                <span
                  v-if="selectedCategory === category"
                  class="text-white text-xs"
                >
                  <font-awesome-icon icon="fa-solid fa-check" />
                </span>
              </button>
            </div>
          </div>
        </div>

        <!-- Menu Content Area -->
        <div class="flex-1 min-w-0">
          <!-- Loading State -->
          <div
            v-if="isLoadingMenu"
            class="flex justify-center items-center py-8 sm:py-12"
          >
            <div
              class="loading loading-spinner loading-lg text-green-600"
            ></div>
          </div>

          <!-- Menu Grid -->
          <div
            v-if="!isLoadingMenu"
            class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3 lg:gap-4 xl:gap-8"
          >
            <div
              v-for="item in paginatedMenuItems"
              :key="item.name"
              @click="openItemModal(item)"
              class="group bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-md hover:shadow-xl lg:hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:-translate-y-1 lg:hover:-translate-y-3 relative border border-gray-100 hover:border-orange-200 cursor-pointer"
            >
              <!-- Promo Badge -->
              <div
                v-if="item.hasPromo"
                class="absolute top-2 right-2 sm:top-3 sm:right-3 z-20"
              >
                <div
                  class="bg-gradient-to-br from-red-500 to-orange-500 rounded-lg sm:rounded-xl px-2 py-1 sm:px-3 sm:py-2 shadow-xl backdrop-blur-sm border-2 border-white/30 relative overflow-hidden hover:scale-110 transition-all duration-300"
                >
                  <div
                    class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"
                  ></div>
                  <div class="relative z-10 text-center">
                    <div
                      class="text-white text-xs sm:text-sm font-bold leading-none drop-shadow-md"
                    >
                      {{
                        item.promoInfo.discount_type === 'percentage'
                          ? '-' + item.promoInfo.discount_percentage + '%'
                          : '-₱' + item.promoInfo.discount_amount
                      }}
                    </div>
                    <div
                      class="text-white/95 text-[8px] sm:text-[10px] font-semibold uppercase tracking-wider mt-0.5 sm:mt-1"
                    >
                      OFF
                    </div>
                  </div>
                </div>
              </div>

              <!-- Image Container with Overlay -->
              <div
                class="relative h-32 sm:h-40 lg:h-48 xl:h-56 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200"
              >
                <img
                  :src="item.image"
                  :alt="item.name"
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                <!-- Gradient Overlay on Hover -->
                <div
                  class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                ></div>
                <!-- Category Badge (if category exists) -->
                <div
                  v-if="item.category && item.category !== 'All'"
                  class="absolute bottom-2 left-2 sm:bottom-3 sm:left-3"
                >
                  <span
                    class="bg-white/90 backdrop-blur-sm text-green-700 text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-md"
                  >
                    {{ item.category }}
                  </span>
                </div>
              </div>

              <!-- Content Section -->
              <div class="p-3 sm:p-4 lg:p-5 xl:p-6">
                <!-- Item Name -->
                <h3
                  class="text-sm sm:text-base lg:text-lg xl:text-xl font-bold text-green-800 mb-1 sm:mb-2 group-hover:text-green-600 transition-colors duration-300 line-clamp-1"
                >
                  {{ item.name }}
                </h3>

                <!-- Description -->
                <p
                  class="text-gray-600 text-[11px] sm:text-xs lg:text-sm mb-2 sm:mb-4 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] leading-relaxed"
                >
                  {{ item.description }}
                </p>

                <!-- Price Section -->
                <div
                  class="flex flex-col items-center justify-center pt-1.5 sm:pt-2 border-t border-gray-100"
                >
                  <!-- Original Price (crossed out if promo) -->
                  <div v-if="item.hasPromo" class="mb-0.5 sm:mb-1">
                    <span
                      class="text-gray-400 text-[10px] sm:text-xs lg:text-sm line-through font-medium"
                    >
                      <font-awesome-icon
                        icon="fa-solid fa-peso-sign"
                        class="text-[8px] sm:text-xs"
                      />
                      {{ item.originalPrice.toFixed(2) }}
                    </span>
                  </div>

                  <!-- Current Price -->
                  <div class="flex items-center gap-0.5 sm:gap-1">
                    <span
                      :class="[
                        'font-bold text-base sm:text-lg lg:text-xl xl:text-2xl',
                        item.hasPromo ? 'text-red-500' : 'text-green-700',
                      ]"
                    >
                      <font-awesome-icon
                        icon="fa-solid fa-peso-sign"
                        class="text-xs sm:text-sm lg:text-base xl:text-lg"
                      />
                      {{
                        item.discountedPrice
                          ? item.discountedPrice.toFixed(2)
                          : item.price.toFixed(2)
                      }}
                    </span>
                  </div>

                  <!-- Discount Badge -->
                  <div
                    v-if="item.hasPromo"
                    class="mt-1 sm:mt-2 px-2 sm:px-3 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded-full text-[9px] sm:text-[10px] lg:text-xs font-semibold"
                  >
                    {{
                      item.promoInfo.discount_type === 'percentage'
                        ? item.promoInfo.discount_percentage + '% OFF'
                        : '₱' + item.promoInfo.discount_amount + ' OFF'
                    }}
                  </div>
                </div>
              </div>

              <!-- Hover Effect Border -->
              <div
                class="absolute inset-0 border-2 border-transparent group-hover:border-orange-300 rounded-2xl transition-all duration-500 pointer-events-none"
              ></div>
            </div>
          </div>

          <!-- No Items Message -->
          <div
            v-if="!isLoadingMenu && filteredMenuItems.length === 0"
            class="text-center py-12"
          >
            <p class="text-gray-500 text-lg">
              No items found in this category.
            </p>
          </div>

          <!-- Pagination Controls (Mobile Only) -->
          <div
            v-if="filteredMenuItems.length > itemsPerPage"
            class="flex lg:hidden justify-center items-center space-x-4 mt-8"
          >
            <button
              @click="currentPage--"
              :disabled="currentPage === 1"
              :class="[
                'px-4 py-2 rounded-lg font-medium transition-all duration-300',
                currentPage === 1
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105',
              ]"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                ></path>
              </svg>
            </button>

            <span class="text-gray-600 font-medium">
              Page {{ currentPage }} of {{ totalPages }}
            </span>

            <button
              @click="currentPage++"
              :disabled="currentPage === totalPages"
              :class="[
                'px-4 py-2 rounded-lg font-medium transition-all duration-300',
                currentPage === totalPages
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105',
              ]"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Item Detail Modal -->
    <div
      v-if="showItemModal && selectedItem"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="closeItemModal"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div
        class="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
      >
        <!-- Navigation Buttons -->
        <button
          v-if="canNavigatePrev"
          @click="navigateToPrev"
          class="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-full p-3 hover:bg-white shadow-lg transition-all duration-300 hover:scale-110"
          aria-label="Previous item"
        >
          <font-awesome-icon
            icon="fa-solid fa-chevron-left"
            class="text-gray-700 text-lg"
          />
        </button>
        <button
          v-if="canNavigateNext"
          @click="navigateToNext"
          class="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-full p-3 hover:bg-white shadow-lg transition-all duration-300 hover:scale-110"
          aria-label="Next item"
        >
          <font-awesome-icon
            icon="fa-solid fa-chevron-right"
            class="text-gray-700 text-lg"
          />
        </button>

        <!-- Item Indicator (Current Item / Total) -->
        <div
          class="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 backdrop-blur-sm rounded-full px-4 py-1.5"
        >
          <span class="text-white text-sm font-medium">
            {{ currentItemIndex + 1 }} / {{ filteredMenuItems.length }}
          </span>
        </div>

        <!-- Modal Header -->
        <div class="relative">
          <img
            :src="selectedItem.image"
            :alt="selectedItem.name"
            class="w-full h-64 object-cover rounded-t-2xl"
          />
          <button
            @click="closeItemModal"
            class="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors z-10"
          >
            <font-awesome-icon
              icon="fa-solid fa-times"
              class="text-gray-700 text-lg"
            />
          </button>
          <!-- Category Badge -->
          <div
            v-if="selectedItem.category && selectedItem.category !== 'All'"
            class="absolute bottom-4 left-4"
          >
            <span
              class="bg-white/90 backdrop-blur-sm text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full shadow-md"
            >
              {{ selectedItem.category }}
            </span>
          </div>
          <!-- Promo Badge -->
          <div v-if="selectedItem.hasPromo" class="absolute top-4 left-4">
            <div
              class="bg-gradient-to-br from-red-500 to-orange-500 rounded-xl px-3 py-2 shadow-xl backdrop-blur-sm border-2 border-white/30"
            >
              <div class="text-white text-sm font-bold leading-none">
                {{
                  selectedItem.promoInfo.discount_type === 'percentage'
                    ? '-' + selectedItem.promoInfo.discount_percentage + '%'
                    : '-₱' + selectedItem.promoInfo.discount_amount
                }}
              </div>
              <div
                class="text-white/95 text-[10px] font-semibold uppercase tracking-wider mt-1"
              >
                OFF
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Content -->
        <div class="p-6">
          <!-- Item Name -->
          <h2 class="text-2xl font-bold text-green-800 mb-2">
            {{ selectedItem.name }}
          </h2>

          <!-- Price Section -->
          <div
            class="flex flex-col items-start mb-4 pb-4 border-b border-gray-200"
          >
            <!-- Original Price (crossed out if promo) -->
            <div v-if="selectedItem.hasPromo" class="mb-1">
              <span class="text-gray-400 text-lg line-through font-medium">
                <font-awesome-icon icon="fa-solid fa-peso-sign" />
                {{ selectedItem.originalPrice.toFixed(2) }}
              </span>
            </div>

            <!-- Current Price -->
            <div class="flex items-center gap-1">
              <span
                :class="[
                  'font-bold text-3xl',
                  selectedItem.hasPromo ? 'text-red-500' : 'text-green-700',
                ]"
              >
                <font-awesome-icon icon="fa-solid fa-peso-sign" />
                {{
                  selectedItem.discountedPrice
                    ? selectedItem.discountedPrice.toFixed(2)
                    : selectedItem.price.toFixed(2)
                }}
              </span>
            </div>

            <!-- Discount Badge -->
            <div
              v-if="selectedItem.hasPromo"
              class="mt-2 px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold"
            >
              {{
                selectedItem.promoInfo.discount_type === 'percentage'
                  ? selectedItem.promoInfo.discount_percentage + '% OFF'
                  : '₱' + selectedItem.promoInfo.discount_amount + ' OFF'
              }}
            </div>
          </div>

          <!-- Description -->
          <div>
            <h3 class="text-lg font-semibold text-green-800 mb-2">
              Description
            </h3>
            <p class="text-gray-600 leading-relaxed">
              {{ selectedItem.description || 'No description available.' }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
  import menuService from '../../services/menuService.js';
  import { formatImageUrl, apiConfig } from '../../config/api.js';
  import { UtensilsCrossed, ChefHat, Sparkles } from 'lucide-vue-next';

  // Backend base derived from api config (strip /api)
  const API_BASE_URL = (apiConfig?.baseURL || '').replace(/\/?api\/?$/, '');

  const menuCategories = [
    'All',
    'Sizzling Plates',
    'Steaks',
    'Breakfast',
    'Sides',
    'Beverages',
  ];

  const selectedCategory = ref('All');
  const currentPage = ref(1);
  const itemsPerPage = 8;

  // Mobile menu state
  const isMobileMenuOpen = ref(false);
  const isScrolled = ref(false);

  // Menu items from API
  const menuItems = ref([]);
  const isLoadingMenu = ref(false);

  // Item detail modal state
  const showItemModal = ref(false);
  const selectedItem = ref(null);

  // Swipe navigation state
  const touchStartX = ref(0);
  const touchStartY = ref(0);
  const touchEndX = ref(0);
  const touchEndY = ref(0);
  const minSwipeDistance = 50; // Minimum distance for swipe

  // Resolve backend public file URLs that may be relative (e.g., /uploads/..)
  const resolvePublicUrl = (url) => {
    if (!url) return url;

    // Prefer shared formatter used across production views
    const formatted = formatImageUrl(url);
    if (formatted) return formatted;

    // Fallbacks
    if (url.startsWith('http')) return url;
    if (API_BASE_URL) return `${API_BASE_URL}${url}`;
    const protocol = window.location?.protocol || 'http:';
    const host = window.location?.hostname || 'localhost';
    const backendPort = (
      import.meta.env.VITE_BACKEND_PORT || '5000'
    ).toString();
    return `${protocol}//${host}:${backendPort}${url}`;
  };

  const handleScroll = () => {
    isScrolled.value = window.scrollY > 50;
  };

  // Mobile menu functions
  const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
  };

  const closeMobileMenu = () => {
    isMobileMenuOpen.value = false;
  };

  // Click outside handler for mobile menu
  const handleClickOutside = (event) => {
    if (
      isMobileMenuOpen.value &&
      !event.target.closest('.mobile-menu-container')
    ) {
      closeMobileMenu();
    }
  };

  // Smooth scroll to home section
  const scrollToHome = () => {
    window.location.href = '/';
  };

  onMounted(() => {
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    fetchMenuItems(); // Fetch menu items from API
  });

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
  });

  // Fetch menu items from API
  const fetchMenuItems = async () => {
    try {
      isLoadingMenu.value = true;
      const response = await menuService.getPublicMenuItems({ limit: 100 }); // Get all items

      if (response.success) {
        const items = Array.isArray(response.data) ? response.data : [];

        menuItems.value = items.map((item) => ({
          name:
            item.item_name ||
            item.menu_item_name ||
            item.name ||
            'Unnamed Item',
          description:
            item.description ||
            item.menu_item_description ||
            'No description available',
          price: parseFloat(item.selling_price || item.price || 0),
          category: item.category || 'All',
          image:
            resolvePublicUrl(item.image_url) ||
            '/src/assets/crm/default-menu.png',
          // Add promo information
          hasPromo: item.promo_info && item.promo_info.is_active,
          promoInfo: item.promo_info,
          originalPrice: parseFloat(item.selling_price || item.price || 0),
          // Calculate discounted price
          discountedPrice:
            item.promo_info && item.promo_info.is_active
              ? calculateDiscountedPrice(
                  parseFloat(item.selling_price || item.price || 0),
                  item.promo_info
                )
              : null,
        }));
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      menuItems.value = [];
    } finally {
      isLoadingMenu.value = false;
    }
  };

  // Calculate discounted price based on promo info
  const calculateDiscountedPrice = (originalPrice, promoInfo) => {
    if (!promoInfo || !promoInfo.is_active) return originalPrice;

    if (promoInfo.discount_type === 'percentage') {
      const discountAmount =
        (originalPrice * parseFloat(promoInfo.discount_percentage)) / 100;
      return originalPrice - discountAmount;
    } else if (promoInfo.discount_type === 'fixed_amount') {
      return originalPrice - parseFloat(promoInfo.discount_amount);
    }

    return originalPrice;
  };

  const filteredMenuItems = computed(() => {
    if (selectedCategory.value === 'All') {
      return menuItems.value;
    }
    return menuItems.value.filter(
      (item) => item.category === selectedCategory.value
    );
  });

  // Get current item index
  const currentItemIndex = computed(() => {
    if (!selectedItem.value) return 0;
    return filteredMenuItems.value.findIndex(
      (item) => item.name === selectedItem.value.name
    );
  });

  // Check if can navigate
  const canNavigatePrev = computed(() => {
    return currentItemIndex.value > 0;
  });

  const canNavigateNext = computed(() => {
    return currentItemIndex.value < filteredMenuItems.value.length - 1;
  });

  // Open item detail modal
  const openItemModal = (item) => {
    selectedItem.value = item;
    showItemModal.value = true;
  };

  // Close item detail modal
  const closeItemModal = () => {
    showItemModal.value = false;
    selectedItem.value = null;
  };

  // Navigate to next item
  const navigateToNext = () => {
    if (canNavigateNext.value) {
      const nextIndex = currentItemIndex.value + 1;
      selectedItem.value = filteredMenuItems.value[nextIndex];
    }
  };

  // Navigate to previous item
  const navigateToPrev = () => {
    if (canNavigatePrev.value) {
      const prevIndex = currentItemIndex.value - 1;
      selectedItem.value = filteredMenuItems.value[prevIndex];
    }
  };

  // Swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.value = e.touches[0].clientX;
    touchStartY.value = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    // Allow scrolling, don't prevent default to allow natural scrolling
  };

  const handleTouchEnd = (e) => {
    if (!showItemModal.value) return;

    touchEndX.value = e.changedTouches[0].clientX;
    touchEndY.value = e.changedTouches[0].clientY;

    const swipeDistanceX = touchStartX.value - touchEndX.value;
    const swipeDistanceY = Math.abs(touchStartY.value - touchEndY.value);

    // Only trigger swipe if horizontal movement is greater than vertical (horizontal swipe)
    if (
      Math.abs(swipeDistanceX) > swipeDistanceY &&
      Math.abs(swipeDistanceX) > minSwipeDistance
    ) {
      // Swipe left (next item) - swipe distance > 50px
      if (swipeDistanceX > minSwipeDistance && canNavigateNext.value) {
        navigateToNext();
      }
      // Swipe right (previous item) - swipe distance < -50px
      else if (swipeDistanceX < -minSwipeDistance && canNavigatePrev.value) {
        navigateToPrev();
      }
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!showItemModal.value) return;

    if (e.key === 'ArrowLeft' && canNavigatePrev.value) {
      navigateToPrev();
    } else if (e.key === 'ArrowRight' && canNavigateNext.value) {
      navigateToNext();
    } else if (e.key === 'Escape') {
      closeItemModal();
    }
  };

  const totalPages = computed(() => {
    return Math.ceil(filteredMenuItems.value.length / itemsPerPage);
  });

  const paginatedMenuItems = computed(() => {
    const startIndex = (currentPage.value - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredMenuItems.value.slice(startIndex, endIndex);
  });

  // Reset to first page when category changes
  watch(selectedCategory, () => {
    currentPage.value = 1;
  });

  // Navigation functions
  const goToHome = () => {
    window.location.href = '/';
  };

  const goToLogin = () => {
    window.location.href = '/login';
  };
</script>

<style scoped>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Smooth transitions */
  * {
    transition: all 0.3s ease;
  }

  /* Enhanced button hover effects */
  button:hover {
    transform: translateY(-2px);
  }

  /* Category filter animations */
  button:active {
    transform: scale(0.95);
  }

  /* Shimmer Animation for Promo Badge */
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .animate-\[shimmer_2s_infinite\] {
    animation: shimmer 2s infinite;
  }

  /* Pulse delay for sparkle icons */
  .delay-75 {
    animation-delay: 0.75s;
  }

  /* Enhanced Card Hover Effects */
  .group {
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .group:hover {
    transform: translateY(-12px) scale(1.02);
  }

  /* Image Zoom Effect */
  .group img {
    will-change: transform;
  }

  /* Smooth Border Transition */
  .border-transparent {
    transition: border-color 0.5s ease;
  }

  /* Horizontal scroll for mobile category filters */
  .scrollbar-hide {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none; /* Chrome, Safari and Opera */
  }

  /* Smooth scrolling for horizontal sections */
  @media (max-width: 640px) {
    .scrollbar-hide {
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }
  }
</style>
