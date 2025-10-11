<template>
  <div class="bg-gray-50 min-h-screen">
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
          class="block py-3 sm:py-3 px-3 sm:px-4 text-orange-300 hover:text-orange-300 hover:bg-green-700 rounded-lg transition-all duration-300 font-medium text-base sm:text-lg"
        >
          <span class="flex items-center">
            <font-awesome-icon icon="fa-solid fa-utensils" class="w-4 h-4 sm:w-5 sm:h-5 mr-3" />
            Menu
          </span>
        </router-link>
        <router-link
          to="/stores"
          @click="closeMobileMenu()"
          class="block py-3 sm:py-3 px-3 sm:px-4 text-white hover:text-orange-300 hover:bg-green-700 rounded-lg transition-all duration-300 font-medium text-base sm:text-lg"
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

    <div class="container mx-auto px-6 py-12 pt-24">
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-green-800 mb-4">Our Complete Menu</h1>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          Discover all our delicious dishes, from sizzling steaks to traditional Filipino favorites
        </p>
      </div>
      
      <!-- Category Filters -->
      <div class="flex flex-wrap justify-center gap-3 mb-8">
        <button 
          v-for="category in menuCategories" 
          :key="category"
          @click="selectedCategory = category"
          :class="[
            'px-6 py-3 rounded-full font-medium transition-all duration-300',
            selectedCategory === category 
              ? 'bg-orange-500 text-white shadow-lg scale-105' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'
          ]"
        >
          {{ category }}
        </button>
      </div>

      <!-- Menu Grid -->
      <div class="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div 
          v-for="item in paginatedMenuItems" 
          :key="item.name"
          class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
        >
          <div class="h-48 overflow-hidden">
            <img 
              :src="item.image" 
              :alt="item.name" 
              class="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
            />
          </div>
          <div class="p-6">
            <h3 class="text-xl font-bold text-green-800 mb-2">{{ item.name }}</h3>
            <p class="text-gray-600 text-sm mb-4 line-clamp-2">{{ item.description }}</p>
            <div class="flex justify-center items-center">
              <span class="text-orange-500 font-bold text-lg">₱{{ item.price.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- No Items Message -->
      <div v-if="filteredMenuItems.length === 0" class="text-center py-12">
        <p class="text-gray-500 text-lg">No items found in this category.</p>
      </div>

      <!-- Pagination Controls -->
      <div v-if="filteredMenuItems.length > itemsPerPage" class="flex justify-center items-center space-x-4 mt-8">
        <button 
          @click="currentPage--"
          :disabled="currentPage === 1"
          :class="[
            'px-4 py-2 rounded-lg font-medium transition-all duration-300',
            currentPage === 1 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
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
              : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
      </div>


    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

const menuCategories = [
  'All', 'Sizzling Plates', 'Steaks', 'Breakfast', 'Sides', 'Beverages'
];

const selectedCategory = ref('All');
const currentPage = ref(1);
const itemsPerPage = 8;

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

// Smooth scroll to home section
const scrollToHome = () => {
  window.location.href = '/';
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  document.removeEventListener('click', handleClickOutside);
});

const menuItems = [
  // Sizzling Plates
  {
    name: 'Sizzling Tenderloin Steak',
    description: 'Tender beef served on a hot sizzling plate with our signature gravy and fresh vegetables',
    price: 299.99,
    category: 'Sizzling Plates',
    image: '/src/assets/crm/Sizzling Tenderloin Steak.png'
  },
  {
    name: 'Sizzling T-Bone Steak',
    description: 'Classic T-Bone steak with signature sizzle, served with garlic rice and vegetables',
    price: 349.99,
    category: 'Sizzling Plates',
    image: '/src/assets/crm/Sizzling T-Bone Steak1.png'
  },
  {
    name: 'Sizzling Porksteak',
    description: 'Juicy pork steak with special marinade, served on a hot sizzling plate',
    price: 249.99,
    category: 'Sizzling Plates',
    image: '/src/assets/crm/Sizzling Picture.png'
  },
  {
    name: 'Sizzling Chicken Steak',
    description: 'Tender chicken breast grilled to perfection, served with our signature sauce',
    price: 199.99,
    category: 'Sizzling Plates',
    image: '/src/assets/crm/Sizzling Tenderloin Steak.png'
  },
  
  // Steaks
  {
    name: 'Ribeye Steak',
    description: 'Premium cut ribeye, perfectly grilled to your preference with garlic butter',
    price: 499.99,
    category: 'Steaks',
    image: '/src/assets/crm/T-Bone Steak.png'
  },
  {
    name: 'T-Bone Steak',
    description: 'Classic T-Bone steak with the perfect balance of tenderloin and strip',
    price: 449.99,
    category: 'Steaks',
    image: '/src/assets/crm/T-Bone Steak.png'
  },
  {
    name: 'Porterhouse Steak',
    description: 'Premium cut with tenderloin and strip, grilled to perfection',
    price: 399.99,
    category: 'Steaks',
    image: '/src/assets/crm/T-Bone Steak.png'
  },
  
  // Breakfast
  {
    name: 'Tapsilog',
    description: 'Traditional Filipino breakfast with cured beef, garlic rice, and egg',
    price: 199.99,
    category: 'Breakfast',
    image: '/src/assets/crm/Silog Food.png'
  },
  {
    name: 'Longsilog',
    description: 'Filipino longganisa with garlic rice and sunny-side-up egg',
    price: 179.99,
    category: 'Breakfast',
    image: '/src/assets/crm/Silog Food.png'
  },
  {
    name: 'Tocino Silog',
    description: 'Sweet cured pork with garlic rice and egg, perfect breakfast choice',
    price: 189.99,
    category: 'Breakfast',
    image: '/src/assets/crm/Silog Food.png'
  },
  
  // Sides
  {
    name: 'Chicken Wings',
    description: 'Crispy and flavorful chicken wings with your choice of sauce',
    price: 179.99,
    category: 'Sides',
    image: '/src/assets/crm/Menu 1.png'
  },
  {
    name: 'French Fries',
    description: 'Crispy golden fries seasoned with our special blend of spices',
    price: 89.99,
    category: 'Sides',
    image: '/src/assets/crm/Menu 1.png'
  },
  {
    name: 'Onion Rings',
    description: 'Crispy beer-battered onion rings served with ranch dipping sauce',
    price: 99.99,
    category: 'Sides',
    image: '/src/assets/crm/Menu 1.png'
  },
  
  // Beverages
  {
    name: 'Countryside Special Drink',
    description: 'House special refreshing beverage made with fresh ingredients',
    price: 99.99,
    category: 'Beverages',
    image: '/src/assets/crm/Menu 2.png'
  },
  {
    name: 'Iced Tea',
    description: 'Refreshing iced tea with lemon, perfect complement to any meal',
    price: 69.99,
    category: 'Beverages',
    image: '/src/assets/crm/Menu 2.png'
  },
  {
    name: 'Fresh Lemonade',
    description: 'Homemade lemonade with real lemons and natural sweetness',
    price: 79.99,
    category: 'Beverages',
    image: '/src/assets/crm/Menu 2.png'
  }
];

const filteredMenuItems = computed(() => {
  if (selectedCategory.value === 'All') {
    return menuItems;
  }
  return menuItems.filter(item => item.category === selectedCategory.value);
});

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
</style>
