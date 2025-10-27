<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Schedule Modal for Burol Main Branch -->
    <div v-if="isScheduleModalOpen" class="fixed inset-0 z-50 overflow-y-auto">
      <!-- Enhanced Backdrop with Blur -->
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300" @click="closeScheduleModal"></div>
      
      <!-- Modal -->
      <div class="flex min-h-full items-center justify-center p-4">
        <div class="relative w-full max-w-md bg-white rounded-2xl shadow-2xl transform transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in-0 zoom-in-95">
        <!-- Modal Header -->
        <div class="bg-green-800 text-white p-6 rounded-t-2xl">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold">Burol Main Branch</h2>
            <button @click="closeScheduleModal" class="text-white hover:text-orange-300 transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <p class="text-green-100 mt-2">COUNTRYSIDE STEAKHOUSE</p>
        </div>
        
        <!-- Modal Content -->
        <div class="p-6">
          <!-- Current Status -->
          <div class="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-800">Current Status</h3>
              <span class="bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-md">CLOSED NOW</span>
            </div>
            <p class="text-gray-600 text-sm mt-2">We'll be open tomorrow at 11:00 AM</p>
          </div>
          
          <!-- Schedule Details -->
          <div class="space-y-3">
            <div class="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
              <span class="font-medium text-gray-800">Monday</span>
              <span class="text-green-600 font-semibold">11:00 AM - 9:00 PM</span>
            </div>
            <div class="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
              <span class="font-medium text-gray-800">Tuesday</span>
              <span class="text-green-600 font-semibold">11:00 AM - 9:00 PM</span>
            </div>
            <div class="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
              <span class="font-medium text-gray-800">Wednesday</span>
              <span class="text-green-600 font-semibold">11:00 AM - 9:00 PM</span>
            </div>
            <div class="flex justify-between items-center py-4 px-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
              <span class="font-medium text-gray-800">Thursday</span>
              <span class="text-orange-600 font-semibold">11:00 AM - 9:00 PM</span>
            </div>
            <div class="flex justify-between items-center py-4 px-4 bg-red-50 rounded-lg border-l-4 border-red-500">
              <span class="font-medium text-gray-800">Friday</span>
              <span class="text-red-600 font-semibold">11:00 AM - 7:00 PM</span>
            </div>
            <div class="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
              <span class="font-medium text-gray-800">Saturday</span>
              <span class="text-green-600 font-semibold">11:00 AM - 9:00 PM</span>
            </div>
            <div class="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-lg border-l-4 border-green-500">
              <span class="font-medium text-gray-800">Sunday</span>
              <span class="text-green-600 font-semibold">11:00 AM - 9:00 PM</span>
            </div>
          </div>
          
          <!-- Additional Info -->
          <div class="mt-6 space-y-3">
            <div class="text-sm text-gray-500">
              <span class="font-medium">Updated:</span> About 3 years ago
            </div>
            <div class="text-sm text-gray-500">
              <span class="font-medium">Services:</span> In-store pickup
            </div>
          </div>
          
          <!-- Modal Footer -->
          <div class="mt-8 flex justify-center">
            <button @click="closeScheduleModal" class="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

    <!-- Header -->
    <header class="text-white shadow-lg fixed top-0 left-0 right-0 z-50 bg-green-800 transition-all duration-300">
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
                    isMobileMenuOpen ? 'rotate-45 translate-y-2.5' : 'translate-y-0'
                  ]"
                ></span>
                <span
                  :class="[
                    'absolute block h-0.5 w-6 bg-current transform transition-all duration-300 ease-in-out translate-y-2.5',
                    isMobileMenuOpen ? 'opacity-0' : 'opacity-100'
                  ]"
                ></span>
                <span
                  :class="[
                    'absolute block h-0.5 w-6 bg-current transform transition-all duration-300 ease-in-out',
                    isMobileMenuOpen ? '-rotate-45 translate-y-2.5' : 'translate-y-5'
                  ]"
                ></span>
              </div>
            </button>

            <!-- Logo and Brand -->
            <div
              class="flex items-center space-x-2 sm:space-x-4 cursor-pointer group"
              @click="scrollToHome"
              title="Click to go to top"
            >
              <div
                class="w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
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
            </div>
          </div>

          <!-- Desktop Navigation -->
             <nav class="hidden md:flex items-center space-x-10">
               <router-link
              to="/menu"
              class="relative group py-2 px-1 text-white hover:text-orange-300 transition-all duration-300 font-medium"
            >
              <span class="relative z-10">Menu</span>
              <span
                class="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 transition-all duration-300 group-hover:w-full"
              ></span>
            </router-link>

            <router-link
              to="/stores"
              class="relative group py-2 px-1 text-orange-300 transition-all duration-300 font-medium"
            >
              <span class="relative z-10">Store's</span>
              <span
                class="absolute bottom-0 left-0 w-full h-0.5 bg-orange-400"
              ></span>
            </router-link>
               <a
                 href="/#contact"
                 class="relative group py-2 px-1 text-white hover:text-orange-300 transition-all duration-300 font-medium"
               >
                 <span class="relative z-10">Contact Us</span>
                 <span
                   class="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 transition-all duration-300 group-hover:w-full"
                 ></span>
               </a>
          </nav>

          <!-- Login Button -->
          <div class="flex items-center space-x-2 sm:space-x-4">
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
        isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      ]"
    >
         <nav class="py-3 sm:py-4 px-3 sm:px-4 space-y-1 sm:space-y-2">
           <router-link
          to="/menu"
          @click="closeMobileMenu()"
          class="block py-3 sm:py-3 px-3 sm:px-4 text-white hover:text-orange-300 hover:bg-green-700 rounded-lg transition-all duration-300 font-medium text-base sm:text-lg"
        >
          <span class="flex items-center">
            <font-awesome-icon icon="fa-solid fa-utensils" class="w-4 h-4 sm:w-5 sm:h-5 mr-3" />
            Menu
          </span>
        </router-link>
        <router-link
          to="/stores"
          @click="closeMobileMenu()"
          class="block py-3 sm:py-3 px-3 sm:px-4 text-orange-300 hover:text-orange-300 hover:bg-green-700 rounded-lg transition-all duration-300 font-medium text-base sm:text-lg"
        >
          <span class="flex items-center">
            <font-awesome-icon icon="fa-solid fa-store" class="w-4 h-4 sm:w-5 sm:h-5 mr-3" />
            Store's
          </span>
        </router-link>
           <a
             href="/#contact"
             @click="closeMobileMenu()"
             class="block py-3 sm:py-3 px-3 sm:px-4 text-white hover:text-orange-300 hover:bg-green-700 rounded-lg transition-all duration-300 font-medium text-base sm:text-lg"
           >
             <span class="flex items-center">
               <font-awesome-icon icon="fa-solid fa-phone" class="w-4 h-4 sm:w-5 sm:h-5 mr-3" />
               Contact Us
             </span>
           </a>
      </nav>
    </div>

    <!-- Main Content -->
    <div class="container mx-auto px-6 py-12 pt-24">
      <!-- Page Header -->
      <div class="text-center mb-16">
        <div class="flex items-center justify-center mb-6">
          <div class="w-20 h-0.5 bg-orange-400"></div>
          <h1 class="text-4xl font-bold text-green-800 mx-6">Our Branches</h1>
          <div class="w-20 h-0.5 bg-orange-400"></div>
        </div>
        <p class="text-xl text-gray-600 max-w-3xl mx-auto">
          Visit any of our branches to experience the authentic taste that made Countryside Steakhouse famous. 
          Each location offers the same quality food and warm hospitality.
        </p>
      </div>

      <!-- Store Grid -->
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
        <!-- Burol Main Branch -->
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
          <div class="h-64 overflow-hidden">
            <img src="/src/assets/crm/Countryside Burol Main Branch.png" alt="Countryside Burol Main Branch" class="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
          </div>
          <div class="p-6">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xl font-bold text-green-800">Burol Main Branch</h3>
            </div>
            <p class="text-gray-600 text-sm mb-4 font-medium">COUNTRYSIDE STEAKHOUSE</p>
            <p class="text-gray-500 text-xs mb-4">T-BONE • CHICKEN WINGS • PORKSTEAK • TAPSILOG • SISIG</p>
            
            <div class="space-y-3 mb-6">
              <div class="flex items-center text-sm text-gray-600">
                <span class="mr-3 text-lg">📍</span>
                <span>Burol, Main Street, Countryside City</span>
              </div>
              <div class="flex items-center text-sm text-gray-600">
                <span class="mr-3 text-lg">🕒</span>
                <span>Mon-Sun: 11:00 AM - 9:00 PM (Fri: 7:00 PM)</span>
              </div>
            </div>
            
            <div class="flex space-x-3">
              <button class="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium">
                Get Directions
              </button>
              <button @click="openScheduleModal" class="flex-1 bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium">
                Schedules
              </button>
            </div>
          </div>
        </div>

        <!-- Malihan Branch -->
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
          <div class="h-64 overflow-hidden">
            <img src="/src/assets/crm/Country Malihan Branch.png" alt="Countryside Malihan Branch" class="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
          </div>
          <div class="p-6">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xl font-bold text-green-800">Malihan Branch</h3>

            </div>
            <p class="text-gray-600 text-sm mb-4 font-medium">P&N COUNTRYSIDE STEAKHOUSE</p>
            <p class="text-gray-500 text-xs mb-4">T-BONE • CHICKEN WINGS • PORKSTEAK • TAPSILOG • SISIG</p>
            
            <div class="space-y-3 mb-6">
              <div class="flex items-center text-sm text-gray-600">
                <span class="mr-3 text-lg">📍</span>
                <span>Malihan, Central District, Countryside City</span>
              </div>
              <div class="flex items-center text-sm text-gray-600">
                <span class="mr-3 text-lg">🕒</span>
                <span>Open Daily 10:00 AM - 10:00 PM</span>
              </div>
            </div>
            
            <div class="flex space-x-3">
              <button class="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium">
                Get Directions
              </button>
              <button class="flex-1 bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium">
                Schedules
              </button>
            </div>
          </div>
        </div>

        <!-- Imus Branch -->
        <div class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
          <div class="h-64 overflow-hidden">
            <img src="/src/assets/crm/Countryside Imus Branch.png" alt="Countryside Imus Branch" class="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
          </div>
          <div class="p-6">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xl font-bold text-green-800">Imus Branch</h3>
            </div>
            <p class="text-gray-600 text-sm mb-4 font-medium">COUNTRYSIDE STEAKHOUSE</p>
            <p class="text-gray-500 text-xs mb-4">T-BONE • CHICKEN WINGS • PORKSTEAK • TAPSILOG • SISIG</p>
            
            <div class="space-y-3 mb-6">
              <div class="flex items-center text-sm text-gray-600">
                <span class="mr-3 text-lg">📍</span>
                <span>Imus, Business District, Countryside City</span>
              </div>
              <div class="flex items-center text-sm text-gray-600">
                <span class="mr-3 text-lg">🕒</span>
                <span>Open Daily 10:00 AM - 10:00 PM</span>
              </div>
            </div>
            
            <div class="flex space-x-3">
              <button class="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium">
                Get Directions
              </button>
              <button class="flex-1 bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium">
                Schedules
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Branch Features Section -->
      <div class="bg-green-800 rounded-2xl p-8 text-white mb-16">
        <div class="text-center mb-8">
          <h2 class="text-3xl font-bold mb-4">Why Choose Our Branches?</h2>
          <p class="text-lg text-green-100">Each location offers the same exceptional experience</p>
        </div>
        
        <div class="grid md:grid-cols-3 gap-6">
          <div class="text-center">
            <div class="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl">🍽️</span>
            </div>
            <h3 class="text-xl font-bold mb-2">Consistent Quality</h3>
            <p class="text-green-100">Same great taste and quality across all branches</p>
          </div>
          
          <div class="text-center">
            <div class="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl">👥</span>
            </div>
            <h3 class="text-xl font-bold mb-2">Friendly Staff</h3>
            <p class="text-green-100">Warm hospitality and excellent service</p>
          </div>
          
          <div class="text-center">
            <div class="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl">🏆</span>
            </div>
            <h3 class="text-xl font-bold mb-2">40+ Years</h3>
            <p class="text-green-100">Decades of culinary excellence</p>
          </div>
        </div>
      </div>



      <!-- Contact Information -->
      <div class="text-center">
        <h2 class="text-3xl font-bold text-green-800 mb-6">Need Help Finding Us?</h2>
        <p class="text-lg text-gray-600 mb-8">Our team is here to assist you with directions and information</p>
        
        <div class="flex justify-center">
          <button class="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
            📧 Email Us
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { ref, onMounted, onUnmounted } from 'vue';

const router = useRouter();

// Modal state
const isScheduleModalOpen = ref(false);

// Mobile menu state
const isMobileMenuOpen = ref(false);
const isScrolled = ref(false);

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
  if (isMobileMenuOpen.value && !event.target.closest('.mobile-menu-container')) {
    closeMobileMenu();
  }
};

// Navigation functions
const goToHome = () => {
  window.location.href = '/';
};

const goToLogin = () => {
  window.location.href = '/login';
};

// Smooth scroll to home section
const scrollToHome = () => {
  window.location.href = '/';
};

// Modal functions
const openScheduleModal = () => {
  isScheduleModalOpen.value = true;
};

const closeScheduleModal = () => {
  isScheduleModalOpen.value = false;
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
/* Enhanced hover effects */
.hover\:shadow-xl:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* Smooth transitions */
* {
  transition: all 0.3s ease;
}

/* Enhanced button hover effects */
button:hover {
  transform: translateY(-2px);
}

/* Card hover animations */
.card-hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-hover:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
}
</style>
