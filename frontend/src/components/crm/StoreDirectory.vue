<template>
  <div class="min-h-screen bg-gray-50">
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
              class="relative group py-2 px-1 text-orange-300 transition-all duration-300 font-medium"
            >
              <span class="relative z-10">Store's</span>
              <span
                class="absolute bottom-0 left-0 w-full h-0.5 bg-orange-400"
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
          @click="closeMobileMenu()"
          class="block py-3 sm:py-3 px-3 sm:px-4 text-orange-300 hover:text-orange-300 hover:bg-green-700 rounded-lg transition-all duration-300 font-medium text-base sm:text-lg"
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

    <!-- Main Content -->
    <div
      class="container mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12 pt-20 sm:pt-24 md:pt-28"
    >
      <!-- Page Header -->
      <div class="text-center mb-6 sm:mb-8 md:mb-12 mt-8 sm:mt-12 md:mt-16">
        <div class="flex items-center justify-center mb-4 sm:mb-5 md:mb-6">
          <div class="w-8 sm:w-12 md:w-20 h-0.5 bg-orange-400"></div>
          <div class="mx-3 sm:mx-4 md:mx-6 flex items-center gap-2 sm:gap-3">
            <MapPin
              class="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-green-700"
            />
            <h1
              class="text-2xl sm:text-3xl md:text-4xl font-bold text-green-800"
            >
              Our Branches
            </h1>
            <MapPin
              class="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-green-700"
            />
          </div>
          <div class="w-8 sm:w-12 md:w-20 h-0.5 bg-orange-400"></div>
        </div>
        <p
          class="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto px-4 leading-relaxed"
        >
          Visit any of our branches to experience the authentic taste that made
          Countryside Steakhouse famous.
        </p>
      </div>

      <!-- Google Maps -->
      <div class="mb-8 sm:mb-12 -mx-4 sm:mx-0">
        <div class="w-full rounded-lg sm:rounded-2xl shadow-xl border-2 sm:border-4 border-white overflow-hidden">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m12!1m8!1m3!1d123671.66893077499!2d120.8770752!3d14.3844693!3m2!1i1024!2i768!4f13.1!2m1!1scountryside%20steakhouse!5e0!3m2!1sen!2sph!4v1762283427629!5m2!1sen!2sph" 
            width="100%" 
            height="450" 
            style="border:0;" 
            allowfullscreen="" 
            loading="lazy" 
            referrerpolicy="no-referrer-when-downgrade"
            class="w-full h-[350px] sm:h-[450px] md:h-[500px]"
          ></iframe>
        </div>
      </div>

      <!-- Branch Cards Grid -->
      <div class="mb-8 sm:mb-12">
        <!-- Loading State -->
        <div
          v-if="isLoading"
          class="flex justify-center items-center py-8 sm:py-12"
        >
          <div
            class="loading loading-spinner loading-md sm:loading-lg text-green-600"
          ></div>
        </div>

        <!-- Branch Cards -->
        <div
          v-else-if="branches.length > 0"
          class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8"
        >
          <div
            v-for="branch in branches"
            :key="branch.id"
            class="bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 sm:hover:-translate-y-2 border border-gray-100 flex flex-col"
          >
            <!-- Branch Image (if available) -->
            <div
              class="h-32 sm:h-40 md:h-48 bg-gradient-to-br from-green-600 to-green-800 overflow-hidden relative"
            >
              <!-- Branch Image -->
              <img
                v-if="branch.image_url"
                :src="getImageUrl(branch.image_url)"
                :alt="branch.name"
                class="w-full h-full object-cover"
                @error="handleImageError($event)"
              />
              <!-- Fallback placeholder if no image -->
              <div
                v-else
                class="absolute inset-0 flex items-center justify-center"
              >
                <font-awesome-icon
                  icon="fa-solid fa-store"
                  class="text-white text-6xl opacity-30"
                />
              </div>
              <div class="absolute top-3 right-3 sm:top-4 sm:right-4">
                <span
                  class="text-white text-xs font-semibold px-2.5 sm:px-3 py-1 rounded-full shadow-md"
                  :class="
                    branch.status === 'Open' ? 'bg-green-500' : 'bg-red-500'
                  "
                >
                  {{ branch.status || 'Open' }}
                </span>
              </div>
            </div>

            <!-- Branch Details -->
            <div class="p-3 sm:p-4 md:p-6 flex flex-col flex-1">
              <h3
                class="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-green-800 mb-2 sm:mb-3 md:mb-4 line-clamp-2"
              >
                {{ branch.name }}
              </h3>

              <div
                class="space-y-2 sm:space-y-2.5 md:space-y-3 mb-3 sm:mb-4 md:mb-6"
              >
                <!-- Address -->
                <div
                  class="flex items-start text-[10px] sm:text-xs md:text-sm text-gray-600"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-map-marker-alt"
                    class="mr-1.5 sm:mr-2 md:mr-3 mt-0.5 sm:mt-1 text-green-600 flex-shrink-0 text-[10px] sm:text-xs md:text-sm"
                  />
                  <span class="break-words leading-relaxed line-clamp-2">{{
                    branch.address
                  }}</span>
                </div>

                <!-- Phone -->
                <div
                  v-if="branch.phone"
                  class="flex items-center text-[10px] sm:text-xs md:text-sm text-gray-600"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-phone"
                    class="mr-1.5 sm:mr-2 md:mr-3 text-green-600 flex-shrink-0 text-[10px] sm:text-xs md:text-sm"
                  />
                  <span class="break-all">{{ branch.phone }}</span>
                </div>

                <!-- Email - Hidden on mobile for space -->
                <div
                  v-if="branch.email"
                  class="hidden sm:flex items-center text-xs md:text-sm text-gray-600"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-envelope"
                    class="mr-2 md:mr-3 text-green-600 flex-shrink-0 text-xs md:text-sm"
                  />
                  <span class="break-all">{{ branch.email }}</span>
                </div>

                <!-- Opening Hours - Hidden on mobile for space -->
                <div
                  v-if="branch.opening_hours"
                  class="hidden sm:flex items-start text-xs md:text-sm text-gray-600"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-clock"
                    class="mr-2 md:mr-3 mt-0.5 sm:mt-1 text-green-600 flex-shrink-0 text-xs md:text-sm"
                  />
                  <div class="flex-1">
                    <span
                      v-if="typeof branch.opening_hours === 'string'"
                      class="leading-relaxed"
                      >{{ branch.opening_hours }}</span
                    >
                    <div v-else class="space-y-1">
                      <div
                        v-for="(hours, day) in branch.opening_hours"
                        :key="day"
                        class="leading-relaxed"
                      >
                        <span class="font-medium">{{ day }}:</span> {{ hours }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-col gap-2 sm:gap-2.5 md:gap-3 mt-auto">
                <button
                  v-if="branch.phone"
                  @click="callBranch(branch.phone)"
                  class="w-full bg-orange-500 text-white py-2 sm:py-2.5 md:py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-phone"
                    class="text-[10px] sm:text-xs md:text-sm"
                  />
                  <span>Call</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- No Branches Message -->
        <div v-else class="text-center py-12">
          <p class="text-gray-500 text-lg">
            No branches available at the moment.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted, nextTick } from 'vue';
  import { useRouter } from 'vue-router';
  import axios from 'axios';
  import { apiConfig, formatImageUrl } from '../../config/api.js';
  import { MapPin } from 'lucide-vue-next';

  const router = useRouter();

  // State
  const branches = ref([]);
  const isLoading = ref(false);
  const isMobileMenuOpen = ref(false);

  // Default map center (Philippines)
  const defaultCenter = [14.5995, 120.9842]; // Manila coordinates
  const defaultZoom = 11;

  // Fetch branches from API
  const fetchBranches = async () => {
    try {
      isLoading.value = true;
      const response = await axios.get(`${apiConfig.baseURL}/branches/public`);

      if (response.data.success) {
        branches.value = response.data.data || [];
      } else if (Array.isArray(response.data)) {
        branches.value = response.data;
      } else {
        branches.value = [];
      }

      // Map is now handled by Google Maps iframe
    } catch (error) {
      console.error('Error fetching branches:', error);
      branches.value = [];
    } finally {
      isLoading.value = false;
    }
  };

  // Map initialization removed - using Google Maps iframe instead
  const initMap = async () => {
    // This function is no longer used - map is now handled by Google Maps iframe
    return;
    // Check if map already exists
    if (map.value) {
      map.value.remove();
    }

    // Create map instance
    map.value = L.map('map', {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: true,
    });

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.value);

    // Fix default icon paths for Leaflet
    const DefaultIcon = L.icon({
      iconUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    L.Marker.prototype.options.icon = DefaultIcon;

    // Create custom green icon for branch markers
    const greenIcon = L.icon({
      iconUrl:
        'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    // Geocode function using OpenStreetMap Nominatim with Philippines focus
    const geocodeAddress = async (address) => {
      if (!address) return null;

      try {
        const url = 'https://nominatim.openstreetmap.org/search';

        // Add "Philippines" or "Cavite" to improve accuracy for Philippine addresses
        let searchQuery = address;
        if (
          !address.toLowerCase().includes('philippines') &&
          !address.toLowerCase().includes('philippine')
        ) {
          // If address doesn't mention Philippines, add common Philippine location hints
          if (
            address.toLowerCase().includes('cavite') ||
            address.toLowerCase().includes('dasmarinas') ||
            address.toLowerCase().includes('dasma')
          ) {
            searchQuery = `${address}, Cavite, Philippines`;
          } else {
            searchQuery = `${address}, Philippines`;
          }
        }

        const params = {
          format: 'json',
          q: searchQuery,
          addressdetails: 1,
          limit: 5, // Get more results to filter
          countrycodes: 'ph', // Restrict to Philippines only
        };

        const response = await fetch(
          `${url}?${new URLSearchParams(params).toString()}`,
          {
            headers: {
              'User-Agent': 'CountrysideSteakhouse/1.0',
            },
          }
        );

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          // Find the best match (prefer exact matches or matches in Philippines)
          let bestMatch =
            data.find((item) => {
              const displayName = (item.display_name || '').toLowerCase();
              return (
                displayName.includes('philippines') ||
                displayName.includes('cavite') ||
                item.address?.country_code === 'ph'
              );
            }) || data[0];

          const latitude = parseFloat(bestMatch.lat);
          const longitude = parseFloat(bestMatch.lon);

          // Validate coordinates are within Philippines bounds
          // Philippines approximate bounds: lat 4.5-21.1, lon 116.9-127.0
          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            if (
              latitude >= 4.5 &&
              latitude <= 21.1 &&
              longitude >= 116.9 &&
              longitude <= 127.0
            ) {
              return { latitude, longitude };
            } else {
              console.warn('Geocoded coordinates outside Philippines bounds:', {
                latitude,
                longitude,
                address,
              });
              return null;
            }
          }
        }
        return null;
      } catch (error) {
        console.warn('Geocoding failed for address:', address, error);
        return null;
      }
    };

    // Add markers for each branch
    const bounds = [];
    markers.value = [];

    // Process branches and geocode if needed
    for (const branch of branches.value) {
      // Try to get coordinates from branch data
      let lat = branch.latitude || branch.lat;
      let lng = branch.longitude || branch.lng || branch.lon;

      // If no coordinates, geocode the address
      if ((!lat || !lng) && branch.address) {
        const geo = await geocodeAddress(branch.address);
        if (geo) {
          lat = geo.latitude;
          lng = geo.longitude;
          // Update the branch object with geocoded coordinates
          branch.latitude = lat;
          branch.longitude = lng;
        }
      }

      // Fallback: use default center if still no coordinates
      if (!lat || !lng) {
        console.warn(`Could not geocode address for branch: ${branch.name}`);
        lat = defaultCenter[0];
        lng = defaultCenter[1];
      }

      const marker = L.marker([lat, lng], { icon: greenIcon }).addTo(map.value);
      // Store branch ID in marker for easy lookup
      marker.branchId = branch.id;

      // Create popup content with accurate directions URL
      // Use coordinates if available (more accurate), otherwise use address
      let directionsUrl;
      if (
        lat &&
        lng &&
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        // Use coordinates for precise location
        directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      } else if (branch.address) {
        // Fallback to address
        directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(branch.address)}`;
      } else {
        directionsUrl = '#';
      }

      const popupContent = `
      <div style="min-width: 200px;">
        <h3 style="font-weight: bold; margin-bottom: 8px; color: #166534;">${branch.name}</h3>
        <p style="margin: 4px 0; color: #666;">${branch.address || ''}</p>
        ${branch.phone ? `<p style="margin: 4px 0; color: #666;">📞 ${branch.phone}</p>` : ''}
        <button 
          onclick="window.open('${directionsUrl}', '_blank')"
          style="margin-top: 8px; padding: 6px 12px; background: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer;"
        >
          Get Directions
        </button>
      </div>
    `;

      marker.bindPopup(popupContent);
      markers.value.push(marker);
      bounds.push([lat, lng]);
    }

    // Fit map to show all markers if there are multiple branches
    if (bounds.length > 0) {
      if (bounds.length === 1) {
        map.value.setView(bounds[0], 13);
      } else {
        map.value.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  };

  // Get directions to branch - open in Google Maps
  const getDirections = (branch) => {
    // Get coordinates for the branch
    let lat = branch.latitude || branch.lat;
    let lng = branch.longitude || branch.lng || branch.lon;

    // Open in Google Maps with coordinates if available
    if (lat && lng) {
      const url = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(url, '_blank');
    } else if (branch.address) {
      // Open in Google Maps with address
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`;
      window.open(url, '_blank');
    }
  };

  // Call branch
  const callBranch = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  // Mobile menu functions
  const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value;
  };

  const closeMobileMenu = () => {
    isMobileMenuOpen.value = false;
  };

  const handleClickOutside = (event) => {
    if (
      isMobileMenuOpen.value &&
      !event.target.closest('.mobile-menu-container')
    ) {
      closeMobileMenu();
    }
  };

  // Navigation functions
  const goToLogin = () => {
    window.location.href = '/login';
  };

  // Get image URL - handle both absolute URLs and relative paths
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    return formatImageUrl(imageUrl);
  };

  // Handle image load errors
  const handleImageError = (event) => {
    // Hide the image and show placeholder instead
    event.target.style.display = 'none';
    const parent = event.target.parentElement;
    if (parent && !parent.querySelector('.fa-store')) {
      parent.innerHTML = `
      <div class="absolute inset-0 flex items-center justify-center">
        <font-awesome-icon icon="fa-solid fa-store" class="text-white text-6xl opacity-30"></font-awesome-icon>
      </div>
    `;
    }
  };

  onMounted(() => {
    document.addEventListener('click', handleClickOutside);
    fetchBranches();
  });

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    // No cleanup needed for Google Maps iframe
  });
</script>

<style scoped>
  /* Map styling - Google Maps iframe is handled in template */

  /* Smooth transitions */
  * {
    transition: all 0.3s ease;
  }

  /* Card hover animations */
  .transform:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  }
</style>
