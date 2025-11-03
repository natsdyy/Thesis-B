<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="text-white shadow-lg fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-green-800">
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
            </router-link>
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
                class="absolute bottom-0 left-0 w-full h-0.5 bg-orange-400"
              ></span>
            </router-link>
            <a
              @click="goToContact"
              class="relative group py-2 px-1 text-white hover:text-orange-300 transition-all duration-300 font-medium cursor-pointer"
            >
              <span class="relative z-10">Contact Us</span>
              <span
                class="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 transition-all duration-300 group-hover:w-full"
              ></span>
            </a>
          </nav>

          <!-- Login Button -->
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

    <!-- Mobile Menu -->
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
          @click="closeMobileMenu"
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
          @click="closeMobileMenu"
          class="block py-3 sm:py-3 px-3 sm:px-4 text-white hover:text-orange-300 hover:bg-green-700 rounded-lg transition-all duration-300 font-medium text-base sm:text-lg"
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
          @click="closeMobileMenu"
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
          @click="closeMobileMenu"
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
          @click="closeMobileMenu"
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
          @click="goToContact"
          class="block py-3 sm:py-3 px-3 sm:px-4 text-white hover:text-orange-300 hover:bg-green-700 rounded-lg transition-all duration-300 font-medium text-base sm:text-lg cursor-pointer"
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

    <!-- Main Content -->
    <main class="pt-20 sm:pt-24">
      <!-- Hero Section -->
      <section class="bg-white py-12 sm:py-16">
        <div class="container mx-auto px-6">
          <div class="text-center mb-12">
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-green-800 mb-4">Frequently Asked Questions</h1>
            <p class="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Find answers to common questions about our restaurant, menu, services, and more.
            </p>
          </div>
        </div>
      </section>

      <!-- FAQ Section -->
      <section class="py-12 sm:py-16 bg-gray-50">
        <div class="container mx-auto px-6 max-w-6xl">
          <!-- Loading State -->
          <div v-if="loading" class="text-center py-12">
            <span class="loading loading-spinner loading-lg text-green-600"></span>
            <p class="mt-4 text-gray-600">Loading FAQs...</p>
          </div>

          <!-- FAQ Items -->
          <div v-else-if="faqs.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div
              v-for="(faq, index) in faqs"
              :key="faq.id || index"
              class="collapse collapse-plus bg-base-100 border border-base-300 shadow-md hover:shadow-lg transition-shadow duration-300 rounded-lg"
            >
              <input 
                type="checkbox" 
                :ref="el => setCheckboxRef(el, index)"
                :checked="openFaqIndex === index"
                @change="toggleFaq(index)"
              />
              <div 
                class="collapse-title text-lg font-semibold text-green-800 flex items-center gap-3 py-4 cursor-pointer"
                @click="toggleFaq(index)"
              >
                <component :is="faq.icon" class="w-5 h-5 text-green-600 flex-shrink-0" />
                <span class="flex-1">{{ faq.question }}</span>
              </div>
              <div class="collapse-content">
                <p class="text-gray-700 leading-relaxed pt-2 pb-4">{{ faq.answer }}</p>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center py-12">
            <p class="text-gray-600">No FAQs available at the moment.</p>
          </div>
        </div>
      </section>

      <!-- Contact Section -->
      <section class="py-12 sm:py-16 bg-white">
        <div class="container mx-auto px-6 max-w-4xl text-center">
          <h2 class="text-2xl sm:text-3xl font-bold text-green-800 mb-4">Still have questions?</h2>
          <p class="text-gray-600 mb-6">
            Can't find the answer you're looking for? Please get in touch with our friendly team.
          </p>
          <a
            href="#contact"
            class="btn btn-primary bg-green-600 hover:bg-green-700 text-white border-none px-8"
          >
            Contact Us
          </a>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
  import { ref, onMounted, nextTick } from 'vue';
  import { useRouter } from 'vue-router';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { library } from '@fortawesome/fontawesome-svg-core';
  import {
    faRightToBracket,
    faUtensils,
    faStore,
    faUserPlus,
    faCircleQuestion,
    faPhone,
  } from '@fortawesome/free-solid-svg-icons';
  import {
    Clock,
    Truck,
    Star,
    CreditCard,
    Briefcase,
    RefreshCw,
    HelpCircle,
  } from 'lucide-vue-next';
  import axios from 'axios';
  import { apiConfig } from '../../config/api.js';

  library.add(
    faRightToBracket,
    faUtensils,
    faStore,
    faUserPlus,
    faCircleQuestion,
    faPhone
  );

  const router = useRouter();
  const isMobileMenuOpen = ref(false);
  const openFaqIndex = ref(null);
  const checkboxRefs = ref([]);
  const loading = ref(false);
  const faqs = ref([]);

  // Icon mapping function - assigns icons based on question keywords
  const getIconForQuestion = (question) => {
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('hour') || lowerQuestion.includes('open') || lowerQuestion.includes('schedule')) {
      return Clock;
    }
    if (lowerQuestion.includes('delivery') || lowerQuestion.includes('deliver')) {
      return Truck;
    }
    if (lowerQuestion.includes('rate') || lowerQuestion.includes('rating') || lowerQuestion.includes('review')) {
      return Star;
    }
    if (lowerQuestion.includes('payment') || lowerQuestion.includes('pay') || lowerQuestion.includes('accept')) {
      return CreditCard;
    }
    if (lowerQuestion.includes('hiring') || lowerQuestion.includes('job') || lowerQuestion.includes('career') || lowerQuestion.includes('apply')) {
      return Briefcase;
    }
    if (lowerQuestion.includes('return') || lowerQuestion.includes('refund') || lowerQuestion.includes('policy')) {
      return RefreshCw;
    }
    // Default icon
    return HelpCircle;
  };

  // Fetch FAQs from API
  const loadFAQs = async () => {
    loading.value = true;
    try {
      const response = await axios.get(`${apiConfig.baseURL}/faqs/active`);
      
      if (response.data.success && response.data.data) {
        // Map database FAQs to component format with icons
        faqs.value = response.data.data.map((faq) => ({
          id: faq.id,
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          icon: getIconForQuestion(faq.question),
        }));
      } else if (Array.isArray(response.data)) {
        // Handle case where API returns array directly
        faqs.value = response.data.map((faq) => ({
          id: faq.id,
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          icon: getIconForQuestion(faq.question),
        }));
      } else {
        faqs.value = [];
      }
    } catch (error) {
      console.error('Error loading FAQs:', error);
      faqs.value = [];
    } finally {
      loading.value = false;
    }
  };

  const setCheckboxRef = (el, index) => {
    if (el) {
      checkboxRefs.value[index] = el;
    }
  };

  const toggleFaq = (index) => {
    // If clicking the same tab that's already open, close it
    if (openFaqIndex.value === index) {
      openFaqIndex.value = null;
    } else {
      // Otherwise, open the clicked tab (closes any previously open tab)
      openFaqIndex.value = index;
    }
    
    // Update checkbox states to ensure DaisyUI responds
    nextTick(() => {
      checkboxRefs.value.forEach((checkbox, idx) => {
        if (checkbox) {
          checkbox.checked = openFaqIndex.value === idx;
        }
      });
    });
  };

  const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
  };

  const closeMobileMenu = () => {
    isMobileMenuOpen.value = false;
  };

  const goToLogin = () => {
    router.push('/login');
  };

  const goToContact = () => {
    closeMobileMenu();
    // Navigate to homepage and then scroll to contact
    if (router.currentRoute.value.path === '/') {
      // Already on homepage, just scroll
      setTimeout(() => {
        const contactSection = document.getElementById('contact');
        if (contactSection) {
          contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      // Navigate to homepage and then scroll to contact
      router.push('/').then(() => {
        setTimeout(() => {
          const contactSection = document.getElementById('contact');
          if (contactSection) {
            contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      });
    }
  };

  onMounted(() => {
    loadFAQs();
  });
</script>

