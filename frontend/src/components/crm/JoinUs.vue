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
                class="absolute bottom-0 left-0 w-full h-0.5 bg-orange-400"
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
            <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-green-800 mb-4">Join Our Team</h1>
            <p class="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Be part of the Countryside family! We're always looking for passionate individuals to join our growing team. Explore our current job openings and find the perfect role that matches your skills and passion.
            </p>
          </div>

          <!-- Job Positions Section -->
          <!-- Loading State -->
          <div v-if="isLoading" class="flex justify-center items-center py-12">
            <div class="loading loading-spinner loading-lg text-green-600"></div>
            <span class="ml-3 text-gray-600">Loading positions...</span>
          </div>

          <!-- No Positions State -->
          <div v-else-if="positions.length === 0" class="text-center py-12">
            <font-awesome-icon
              icon="fa-solid fa-briefcase"
              class="w-16 h-16 mx-auto mb-4 text-gray-300"
            />
            <h3 class="text-xl font-semibold mb-2 text-gray-900">No positions available</h3>
            <p class="text-gray-600">There are currently no open positions. Please check back later!</p>
          </div>

          <!-- Positions Content -->
          <div v-else>
            <!-- Department Filter Tabs (DaisyUI buttons) -->
            <div class="mb-8">
              <div class="flex flex-wrap gap-2 justify-center">
                <button
                  v-for="department in departments"
                  :key="department"
                  @click="setActiveDepartment(department)"
                  :class="[
                    'btn btn-sm',
                    activeDepartment === department
                      ? 'btn-active bg-orange-500 text-white border-orange-500'
                      : 'btn-outline',
                  ]"
                >
                  {{ department }}
                  <span class="badge badge-sm ml-2" :class="activeDepartment === department ? 'badge-ghost' : ''">
                    {{ getDepartmentCount(department) }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Positions Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div
                v-for="position in filteredPositions"
                :key="position.id"
                class="card bg-base-100 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div class="card-body">
                  <h2 class="card-title text-green-800">{{ position.position_title }}</h2>
                  <div class="space-y-2 text-sm text-gray-600">
                    <p class="flex items-center">
                      <font-awesome-icon icon="fa-solid fa-building" class="mr-2 text-green-600" />
                      {{ position.department }}
                    </p>
                    <p class="flex items-center">
                      <font-awesome-icon icon="fa-solid fa-map-marker-alt" class="mr-2 text-green-600" />
                      {{ position.branch_name || 'Main Branch' }}
                    </p>
                  </div>
                  <div class="my-4">
                    <div class="badge badge-success badge-lg">
                      {{ position.position_type || position.employment_type || 'Full-time' }}
                    </div>
                  </div>
                  <div class="mb-4 space-y-2">
                    <p class="text-gray-700 text-sm flex items-center">
                      <font-awesome-icon icon="fa-solid fa-money-bill-wave" class="mr-2 text-green-600" />
                      <span class="font-semibold text-lg">₱{{ (parseFloat(position.rate_per_hour) || 0).toFixed(2) }}</span>
                      <span class="text-gray-500 ml-1">/hour</span>
                    </p>
                    <p class="text-gray-600 text-sm">
                      <span class="font-medium">Monthly Salary:</span>
                      <span class="ml-2">
                        ₱{{ Math.round((parseFloat(position.rate_per_hour) || 0) * 6 * 30).toLocaleString() }} - 
                        ₱{{ Math.round((parseFloat(position.rate_per_hour) || 0) * 8 * 30).toLocaleString() }}
                      </span>
                    </p>
                  </div>
                  <div class="card-actions">
                    <button
                      @click="applyForPosition(position)"
                      class="btn btn-primary btn-block bg-green-600 hover:bg-green-700 text-white border-none"
                    >
                      Apply Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { apiConfig } from '../../config/api.js';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { library } from '@fortawesome/fontawesome-svg-core';
  import {
    faBriefcase,
    faBuilding,
    faMapMarkerAlt,
    faMoneyBillWave,
    faRightToBracket,
    faUtensils,
    faStore,
    faUserPlus,
    faCircleQuestion,
    faPhone,
    faTimes,
  } from '@fortawesome/free-solid-svg-icons';

  library.add(
    faBriefcase,
    faBuilding,
    faMapMarkerAlt,
    faMoneyBillWave,
    faRightToBracket,
    faUtensils,
    faStore,
    faUserPlus,
    faCircleQuestion,
    faPhone,
    faTimes
  );

  const router = useRouter();
  const isMobileMenuOpen = ref(false);
  const isLoading = ref(false);
  const positions = ref([]);
  const activeDepartment = ref('All');

  const departments = computed(() => {
    const depts = new Set(positions.value.map((p) => p.department));
    return ['All', ...Array.from(depts).sort()];
  });

  const filteredPositions = computed(() => {
    if (activeDepartment.value === 'All') {
      return positions.value;
    }
    return positions.value.filter((p) => p.department === activeDepartment.value);
  });

  const getDepartmentCount = (dept) => {
    if (dept === 'All') return positions.value.length;
    return positions.value.filter((p) => p.department === dept).length;
  };

  const setActiveDepartment = (dept) => {
    activeDepartment.value = dept;
  };

  const loadPositions = async () => {
    try {
      isLoading.value = true;
      
      // Use public endpoint to get open positions from branch_positions table
      const response = await fetch('/api/branch-positions/public', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          // Backend already filters for open and active positions, so use data directly
          // But ensure we only show truly open positions
          positions.value = data.data.filter((p) => {
            // Check job_status or status
            const jobStatus = p.job_status || p.status;
            const isOpen = jobStatus === 'open';
            const isActive = p.is_active === true || p.is_active === 1;
            const notDeleted = !p.deleted_at;
            
            return isOpen && isActive && notDeleted;
          });
        } else {
          positions.value = [];
        }
      } else {
        console.error('Failed to load positions:', response.statusText);
        positions.value = [];
      }
    } catch (error) {
      console.error('Error loading positions:', error);
      positions.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  const applyForPosition = (position) => {
    // Open the job application modal or navigate to application form
    router.push({
      path: '/',
      query: { apply: position.id },
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

  onMounted(() => {
    loadPositions();
  });
</script>

