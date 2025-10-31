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
              href="#contact"
              class="relative group py-2 px-1 text-white hover:text-orange-300 transition-all duration-300 font-medium"
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
          href="#contact"
          @click="closeMobileMenu"
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
        <div class="container mx-auto px-6 max-w-4xl">
          <!-- DaisyUI Collapse/Accordion -->
          <div class="join join-vertical w-full space-y-4">
            <div
              v-for="(faq, index) in faqs"
              :key="index"
              class="collapse collapse-arrow join-item border border-base-300 bg-base-100 shadow-md"
            >
              <input type="radio" name="faq-accordion" :checked="index === 0" />
              <div class="collapse-title text-xl font-medium text-green-800">
                {{ faq.question }}
              </div>
              <div class="collapse-content">
                <p class="text-gray-700 leading-relaxed">{{ faq.answer }}</p>
              </div>
            </div>
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
  import { ref, onMounted } from 'vue';
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

  const faqs = ref([
    {
      question: 'What are your operating hours?',
      answer: 'We are open Monday to Sunday from 10:00 AM to 10:00 PM. Our hours may vary during holidays, so please check with your nearest branch for specific holiday hours.',
    },
    {
      question: 'Do you offer delivery services?',
      answer: 'Yes! We partner with Foodpanda and Grabfood for delivery. You can also call your nearest branch to place an order for pickup or delivery.',
    },
    {
      question: 'Do you accept reservations?',
      answer: 'Yes, we accept reservations for parties of 6 or more. Please call your preferred branch at least 24 hours in advance to make a reservation.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept cash, credit cards, debit cards, and mobile payment methods such as GCash and PayMaya. All major credit cards are welcome.',
    },
    {
      question: 'Do you have vegetarian or vegan options?',
      answer: 'While we specialize in steak, we do offer some vegetarian-friendly options. Please inform your server about any dietary restrictions, and we\'ll do our best to accommodate you.',
    },
    {
      question: 'Is there parking available?',
      answer: 'Yes, all our branches have parking facilities. Parking availability varies by location, so please check with your specific branch.',
    },
    {
      question: 'Do you host private events or parties?',
      answer: 'Yes! We can accommodate private events and parties. Please contact us at least one week in advance to discuss your event needs and make arrangements.',
    },
    {
      question: 'Are you hiring?',
      answer: 'We\'re always looking for passionate individuals to join our team! Visit our "Join Us" page to see current job openings and submit your application.',
    },
    {
      question: 'Do you offer catering services?',
      answer: 'Yes, we offer catering services for events, meetings, and celebrations. Please contact our catering team to discuss your needs and get a quote.',
    },
    {
      question: 'What is your return or refund policy?',
      answer: 'If you\'re not satisfied with your meal, please let us know immediately and we\'ll make it right. We stand behind the quality of our food and service.',
    },
  ]);

  const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
  };

  const closeMobileMenu = () => {
    isMobileMenuOpen.value = false;
  };

  const goToLogin = () => {
    router.push('/login');
  };

  onMounted(() => {
    // Component mounted
  });
</script>

