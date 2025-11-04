<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Announcement Modal -->
    <Teleport to="body">
      <AnnouncementModal
        :isOpen="isAnnouncementModalOpen"
        :announcements="activeAnnouncements"
        @close="closeAnnouncementModal"
      />
    </Teleport>

    <!-- Foodpanda Order Modal -->
    <FoodpandaOrderModal
      :isOpen="isFoodpandaModalOpen"
      @close="closeFoodpandaModal"
    />

    <!-- Grabfood Order Modal -->
    <GrabfoodOrderModal
      :isOpen="isGrabfoodModalOpen"
      @close="closeGrabfoodModal"
    />

    <!-- Job Positions Modal -->
    <JobPositionsModal
      :isOpen="isJobPositionsModalOpen"
      @close="closeJobPositionsModal"
    />

    <!-- Header -->
    <header
      :class="[
        'text-white shadow-lg fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isMobileMenuOpen || isScrolled ? 'bg-green-800' : 'bg-transparent',
      ]"
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

          <!-- Login Button and Announcements Icon (hidden on mobile, shown on md+) -->
          <div class="hidden md:flex items-center space-x-2 sm:space-x-4">
            <button
              @click="goToLogin"
              class="border border-white text-white px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-sm cursor-pointer transition-all duration-300 shadow-md font-thin text-sm sm:text-base"
            >
              Login
            </button>
            <button
              @click="openAnnouncementModal"
              class="text-white hover:text-orange-300 transition-all duration-300 p-2 rounded-full hover:bg-white/10"
              title="View Announcements"
            >
              <Megaphone class="w-5 h-5" />
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
        <button
          @click="openAnnouncementModal(); closeMobileMenu();"
          class="block w-full text-left py-3 sm:py-3 px-3 sm:px-4 text-white hover:text-orange-300 hover:bg-green-700 rounded-lg transition-all duration-300 font-medium text-base sm:text-lg"
        >
          <span class="flex items-center">
            <Bell class="w-4 h-4 sm:w-5 sm:h-5 mr-3" />
            Announcements
          </span>
        </button>
      </nav>
    </div>

    <!-- Hero Section -->
    <section
      id="home"
      class="relative min-h-screen flex items-center pt-16 sm:pt-20 hero-section overflow-hidden lg:px-20 px-3 sm:px-4"
    >
      <!-- Auto-scrolling Hero Carousel -->
      <div class="absolute inset-0 w-full h-full">
        <div
          v-for="(image, index) in heroImages"
          :key="index"
          class="absolute inset-0 w-full h-full bg-cover bg-center transition-all duration-1000 ease-in-out"
          :class="[
            currentHeroIndex === index
              ? 'opacity-100 scale-100 z-10'
              : 'opacity-0 scale-105 z-0',
          ]"
          :style="{
            backgroundImage: `url(${image.src})`,
            backgroundColor: image.fallbackColor,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }"
        ></div>
      </div>

      <!-- Enhanced Background Overlay -->
      <div
        class="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-green-900/30 z-20"
      ></div>

      <!-- Carousel Navigation Dots -->
      <div
        class="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-3"
      >
        <button
          v-for="(image, index) in heroImages"
          :key="index"
          @click="setCurrentHero(index)"
          :class="[
            'w-3 h-3 rounded-full transition-all duration-300',
            currentHeroIndex === index
              ? 'bg-orange-400 scale-125'
              : 'bg-white/50 hover:bg-white/80',
          ]"
        ></button>
      </div>

      <!-- Previous/Next Navigation -->
      <button
        @click="previousHero"
        class="hidden lg:block absolute left-6 top-1/2 transform -translate-y-1/2 z-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-3 text-white hover:bg-white/20 transition-all duration-300 group cursor-pointer"
      >
        <font-awesome-icon
          icon="fa-solid fa-chevron-left"
          class="w-6 h-6 group-hover:-translate-x-1 transition-transform"
        />
      </button>

      <button
        @click="nextHero"
        class="hidden lg:block absolute right-6 top-1/2 transform -translate-y-1/2 z-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-3 text-white hover:bg-white/20 transition-all duration-300 group cursor-pointer"
      >
        <font-awesome-icon
          icon="fa-solid fa-chevron-right"
          class="w-6 h-6 group-hover:translate-x-1 transition-transform"
        />
      </button>

      <!-- Rest of the hero content -->
      <div class="relative z-30 container mx-auto px-3 sm:px-6">
        <div
          class="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center min-h-[75vh] sm:min-h-[80vh]"
        >
          <!-- Left Side - Main Content -->
          <div
            class="text-center lg:text-left space-y-6 sm:space-y-8 order-1 lg:order-1"
          >
            <!-- Main Heading -->
            <h1
              class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight"
            >
              Ang Paborito ng
              <span class="text-orange-400 block mt-1 sm:mt-2">Bayan</span>
            </h1>
            <!-- Brand Badge -->
            <div
              class="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 sm:px-6 py-2 sm:py-3 text-white mb-4 sm:mb-6 mt-4 sm:mt-6"
            >
              <span class="text-xs sm:text-sm font-medium">
                <font-awesome-icon icon="fa-solid fa-trophy" />
                Since 1984</span
              >
            </div>

            <!-- Subtitle -->
            <p
              class="text-base sm:text-lg md:text-xl lg:text-1xl text-white/90 max-w-lg leading-relaxed mx-auto lg:mx-0"
            >
              Sabi nga nila, sa unang tikim pa lang, alam mong babalik-balikan
              mo! Experience the authentic taste that made us famous.
            </p>

            <!-- CTA Buttons -->
            <div
              class="flex flex-row gap-3 sm:gap-4 pt-2 justify-center lg:justify-start"
            >
              <router-link
                to="/menu"
                class="bg-orange-500 hover:bg-orange-400 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-md border-none !font-thin text-sm sm:text-base transition-all duration-300 flex items-center justify-center btn btn-md shadow-none"
              >
                <span>View Menu</span>
                <font-awesome-icon
                  icon="fa-solid fa-arrow-right"
                  class="ml-2 group-hover:translate-x-1 transition-transform"
                />
              </router-link>
              <router-link
                to="/stores"
                class="bg-white/20 hover:bg-white/30 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-md !font-thin text-sm sm:text-base transition-all duration-300 flex items-center justify-center btn btn-md shadow-none"
              >
                <span>Find Stores</span>
                <font-awesome-icon
                  icon="fa-solid fa-location-dot"
                  class="ml-2 group-hover:translate-x-1 transition-transform"
                />
              </router-link>
            </div>

            <!-- Quick Stats -->
            <div
              class="flex items-center justify-center lg:justify-start space-x-4 sm:space-x-6 lg:space-x-8 pt-4 sm:pt-6"
            >
              <div class="text-center">
                <div class="text-xl sm:text-2xl font-bold text-orange-400">
                  {{ yearsOfExcellence }}+
                </div>
                <div class="text-xs sm:text-sm text-white/70">
                  Years of Excellence
                </div>
              </div>
              <div class="text-center">
                <div class="text-xl sm:text-2xl font-bold text-orange-400">
                  {{ totalBranches }}
                </div>
                <div class="text-xs sm:text-sm text-white/70">Branches</div>
              </div>
              <div class="text-center">
                <div class="text-xl sm:text-2xl font-bold text-orange-400">
                  {{ happyCustomersCount }}
                </div>
                <div class="text-xs sm:text-sm text-white/70">
                  Happy Customers
                </div>
              </div>
            </div>
          </div>

          <!-- Right Side - Professional Reels Carousel - Enhanced Layout with Right Alignment -->
          <div
            class="hidden text-center lg:text-right space-y-6 sm:space-y-8 lg:space-y-10 lg:flex lg:flex-col lg:items-end mt-8 lg:mt-0 order-2 lg:order-2"
          >
            <!-- Reels Carousel Container -->
            <div class="relative">
              <!-- Enhanced Video Display Area - Responsive sizing -->
              <div
                class="relative w-72 sm:w-80 md:w-96 lg:w-[32rem] h-[24rem] sm:h-[28rem] md:h-[30rem] lg:h-[32rem] mx-auto lg:mx-0 lg:ml-auto rounded-3xl sm:rounded-5xl shadow-2xl overflow-hidden video-player-container"
              >
                <!-- Current Video -->
                <video
                  :src="currentReel"
                  class="w-full h-full object-contain"
                  loop
                  playsinline
                  ref="videoPlayer"
                  :muted="isHeroVideoMuted"
                ></video>

                <!-- Play/Pause Button for Hero Video -->
                <button
                  @click="toggleHeroVideo"
                  class="btn btn-xs btn-circle shadow-none absolute top-4 left-4 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all duration-300 hover:scale-110 backdrop-blur-sm z-20"
                  :title="isHeroVideoPlaying ? 'Pause' : 'Play'"
                >
                  <font-awesome-icon
                    v-if="!isHeroVideoPlaying"
                    class="w-2 h-2"
                    icon="fa-solid fa-play"
                  >
                  </font-awesome-icon>
                  <font-awesome-icon
                    v-else
                    class="w-5 h-5"
                    icon="fa-solid fa-pause"
                  >
                  </font-awesome-icon>
                </button>

                <!-- Volume Control for Hero Video -->
                <button
                  @click="toggleHeroVideoMute"
                  class="absolute top-4 right-4 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-full p-2.5 text-white hover:text-orange-400 transition-all duration-300 z-20"
                  :title="
                    isHeroVideoMuted
                      ? 'Unmute (Click to enable sound)'
                      : 'Mute (Click to disable sound)'
                  "
                >
                  <font-awesome-icon
                    v-if="isHeroVideoMuted"
                    icon="fa-solid fa-volume-xmark"
                    class="w-4 h-4"
                  />
                  <font-awesome-icon
                    v-else-if="heroVideoVolume === 0"
                    icon="fa-solid fa-volume-off"
                    class="w-4 h-4"
                  />
                  <font-awesome-icon
                    v-else-if="heroVideoVolume < 0.5"
                    icon="fa-solid fa-volume-low"
                    class="w-4 h-4"
                  />
                  <font-awesome-icon
                    v-else
                    icon="fa-solid fa-volume-high"
                    class="w-4 h-4"
                  />
                </button>

                <!-- Enhanced Video Navigation Controls - Larger and More Visible -->
                <div
                  class="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3 z-20"
                >
                  <button
                    v-for="(reel, index) in reels"
                    :key="index"
                    @click="playReel(index)"
                    :class="[
                      'w-4 h-4 rounded-full transition-all duration-300 border-2 btn btn-xs btn-circle shadow-none',
                      currentReelIndex === index
                        ? 'bg-orange-500 border-orange-300 scale-125'
                        : 'bg-white/40 border-white/60 hover:bg-white/70 hover:border-white/90',
                    ]"
                    :title="`Reel ${index + 1}`"
                  ></button>
                </div>

                <!-- Enhanced Previous/Next Buttons - Larger and More Visible -->
                <button
                  @click="previousReel"
                  class="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-4 rounded-full transition-all duration-300 hover:scale-110 backdrop-blur-sm z-20 btn btn-md btn-circle shadow-none"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-chevron-left"
                    class="w-6 h-6"
                  />
                </button>

                <button
                  @click="nextReel"
                  class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/70 hover:bg-black/90 text-white p-4 rounded-full transition-all duration-300 hover:scale-110 backdrop-blur-sm z-20 btn btn-md btn-circle shadow-none"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-chevron-right"
                    class="w-6 h-6"
                  />
                </button>
              </div>

              <!-- Enhanced Reel Counter and Info - White Text for Better Visibility -->
              <div class="text-center mt-4 sm:mt-6 space-y-2 sm:space-y-3">
                <div
                  class="flex items-center justify-center space-x-2 sm:space-x-3"
                >
                  <span class="text-sm sm:text-base font-semibold text-white"
                    >{{ currentReelIndex + 1 }} of {{ reels.length }}</span
                  >
                  <span class="text-xs sm:text-sm text-white/70">•</span>
                  <span class="text-xs sm:text-sm text-orange-400 font-bold">{{
                    getReelTitle(currentReelIndex)
                  }}</span>
                </div>
                <p class="text-xs sm:text-sm text-white/90 font-medium px-4">
                  {{ getReelDescription(currentReelIndex) }}
                </p>

                <!-- Auto-scroll indicator -->
                <div
                  class="flex items-center justify-center space-x-2 mt-1 sm:mt-2"
                >
                  <div
                    :class="[
                      'w-2 h-2 rounded-full transition-all duration-300',
                      isReelsAutoScrollActive
                        ? 'bg-orange-400 animate-pulse'
                        : 'bg-gray-400',
                    ]"
                  ></div>
                  <span class="text-xs text-white/70">
                    {{
                      isReelsAutoScrollActive
                        ? 'Auto-scroll active'
                        : 'Auto-scroll paused'
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Scroll Indicator -->
      <div
        class="absolute bottom-16 sm:bottom-20 lg:bottom-24 left-1/2 transform -translate-x-1/2 animate-bounce"
      >
        <div
          class="w-5 h-8 sm:w-6 sm:h-10 border-2 border-white rounded-full flex justify-center"
        >
          <div
            class="w-1 h-2 sm:h-3 bg-white rounded-full mt-1.5 sm:mt-2 animate-pulse"
          ></div>
        </div>
      </div>
    </section>

    <!-- About the Countryside Section -->
    <section class="py-12 sm:py-16 lg:py-20 bg-white">
      <div class="container mx-auto px-4 sm:px-6">
        <!-- Section Title -->
        <div class="text-center mb-12 sm:mb-16">
          <div class="flex items-center justify-center mb-4 sm:mb-6">
            <div class="w-20 sm:w-40 lg:w-60 h-0.5 bg-orange-400"></div>
            <h2
              class="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-800 mx-3 sm:mx-6"
            >
              About Us
            </h2>
            <div class="w-20 sm:w-40 lg:w-60 h-0.5 bg-orange-400"></div>
          </div>
        </div>

        <div class="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          <!-- Left Side - Image -->
          <div class="relative order-1 lg:order-2">
            <div class="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/images/other/about.png"
                alt="About Countryside Steakhouse"
                class="w-full h-auto object-cover"
              />
              <!-- Decorative overlay -->
              <div
                class="absolute inset-0 bg-gradient-to-t from-green-900/20 to-transparent"
              ></div>
            </div>

            <!-- Floating achievement badge -->
            <div
              class="absolute -bottom-2 -right-2 sm:-bottom-4 sm:-right-4 lg:-bottom-6 lg:-right-6 bg-orange-500 text-white px-3 py-2 sm:px-4 sm:py-2.5 lg:px-6 lg:py-3 rounded-full shadow-lg"
            >
              <div class="text-center">
                <div class="text-sm sm:text-lg lg:text-2xl font-bold">
                  {{ yearsOfExcellence }}+
                </div>
                <div class="text-xs sm:text-sm">Years of Excellence</div>
              </div>
            </div>
          </div>

          <!-- Right Side - Content -->
          <div class="space-y-6 sm:space-y-8 order-2 lg:order-1">
            <!-- Main Heading -->
            <div>
              <h2
                class="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-green-800 mb-4 sm:mb-6 leading-tight"
              >
                Serving Sizzling Steaks Since 1984!<font-awesome-icon
                  icon="fa-solid fa-fire"
                  class="text-orange-600"
                />
              </h2>
              <div class="w-16 sm:w-20 h-1 bg-orange-400 rounded-full"></div>
            </div>

            <!-- Main Description -->
            <div
              class="space-y-4 sm:space-y-6 text-base sm:text-lg text-gray-700 leading-relaxed"
            >
              <p>
                Welcome to
                <span class="font-semibold text-green-700"
                  >Countryside Steakhouse</span
                >, where tradition meets innovation in every sizzling plate. For
                over four decades, we've been crafting the perfect steak
                experience, combining time-honored recipes with modern culinary
                techniques.
              </p>

              <p>
                Our commitment to quality starts with the finest ingredients,
                sourced locally and prepared with passion. Every dish tells a
                story of dedication, from our signature sizzling steaks to our
                beloved silog breakfasts that have become a morning ritual for
                countless families.
              </p>

              <p>
                <span class="font-semibold text-orange-600"
                  >"Silog is the best in Countryside"</span
                >
                - this isn't just a saying, it's a promise we've kept for
                generations. Our silog dishes, featuring perfectly cooked rice,
                fresh eggs, and premium meats, have earned us the reputation as
                Cavite's premier breakfast destination.
              </p>
            </div>

            <!-- Branches Section -->
            <div
              class="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-l-4 border-green-600"
            >
              <h3
                class="text-lg sm:text-xl font-bold text-green-800 mb-3 sm:mb-4"
              >
                🌿 Growing Across Cavite
              </h3>
              <p class="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                We're proud to serve our community across multiple locations:
              </p>
              <div v-if="isLoadingBranches" class="flex justify-center py-4">
                <div class="loading loading-spinner loading-sm text-green-600"></div>
              </div>
              <div
                v-else-if="branches.length > 0"
                class="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm text-gray-700"
              >
                <div 
                  v-for="(branch, index) in branches" 
                  :key="branch.id"
                  class="flex items-center animate-fade-in-up"
                  :style="{ animationDelay: `${index * 0.1}s` }"
                >
                  <span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                  <span class="transition-all duration-300 hover:text-green-600">{{ branch.name }}, Philippines</span>
                </div>
              </div>
              <div v-else class="text-xs sm:text-sm text-gray-500 italic py-2 animate-fade-in">
                No branches available at the moment.
              </div>
            </div>

            <!-- Call to Action -->
            <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <router-link
                to="/menu"
                class="bg-green-800 hover:bg-green-700 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg !font-thin transition-all duration-300 shadow-lg flex items-center justify-center btn btn-md text-sm sm:text-base"
              >
                <span>Explore our menu</span>
                <font-awesome-icon
                  icon="fa-solid fa-arrow-right"
                  class="ml-3 sm:ml-4 group-hover:translate-x-1 transition-transform"
                />
              </router-link>

              <router-link
                to="/stores"
                class="bg-orange-500 hover:bg-orange-400 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg !font-thin transition-all duration-300 shadow-lg flex items-center justify-center btn btn-md text-sm sm:text-base"
              >
                <span>Find your branch</span>
                <font-awesome-icon
                  icon="fa-solid fa-location-dot"
                  class="ml-2 group-hover:translate-x-1 transition-transform"
                />
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Delivery Options Section -->
    <section class="py-20 bg-green-800">
      <div class="container mx-auto px-6">
        <div class="text-center mb-16">
          <div class="flex items-center justify-center mb-4">
            <div class="w-60 h-0.5 bg-orange-400 sm:block hidden"></div>
            <h2 class="text-4xl font-bold text-white mx-4">
              Order for Delivery
            </h2>
            <div class="w-60 h-0.5 bg-orange-400 sm:block hidden"></div>
          </div>
          <p class="text-xl text-green-100 max-w-2xl mx-auto">
            Craving our delicious steaks? Order now through your favorite
            delivery platforms!
          </p>
        </div>

        <!-- Delivery Content with Video on Right -->
        <div
          class="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center px-4 sm:px-6 lg:px-10"
        >
          <!-- Left Side - Delivery Options -->
          <div class="space-y-6 lg:space-y-8">
            <div class="text-center lg:text-left">
              <h3 class="text-xl sm:text-2xl font-bold text-white mb-2">
                Choose Your Delivery Platform
              </h3>
              <p class="text-sm sm:text-base text-green-100">
                We partner with the best delivery services to bring Countryside
                to your doorstep
              </p>
            </div>

            <!-- Delivery Cards - Vertical Mobile-First Design -->
            <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <!-- Foodpanda Card -->
              <div
                class="bg-orange-500 rounded-2xl p-4 sm:p-5 lg:p-6 text-white text-center transition-all duration-300 shadow-lg card-hover cursor-pointer flex flex-col justify-between min-h-[280px] sm:min-h-[320px] lg:min-h-[360px]"
              >
                <div class="flex-1 flex flex-col justify-center">
                  <div
                    class="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                  >
                    <img
                      src="/src/assets/crm/Foodpanda.png"
                      alt="Foodpanda Logo"
                      class="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 object-contain"
                    />
                  </div>
                  <h3
                    class="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3"
                  >
                    Foodpanda
                  </h3>
                  <p
                    class="text-xs sm:text-sm lg:text-base mb-4 opacity-90 leading-relaxed px-2"
                  >
                    Order your favorite Countryside dishes through Foodpanda
                  </p>
                </div>
                <button
                  @click="openFoodpandaModal"
                  class="bg-white text-orange-500 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium hover:bg-gray-100 transition-colors w-full cursor-pointer text-sm sm:text-base shadow-md hover:shadow-lg"
                >
                  Order on Foodpanda
                </button>
              </div>

              <!-- Grabfood Card -->
              <div
                class="bg-green-600 rounded-2xl p-4 sm:p-5 lg:p-6 text-white text-center transition-all duration-300 shadow-lg card-hover cursor-pointer flex flex-col justify-between min-h-[280px] sm:min-h-[320px] lg:min-h-[360px]"
              >
                <div class="flex-1 flex flex-col justify-center">
                  <div
                    class="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-white bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                  >
                    <img
                      src="/src/assets/crm/GrabFood.png"
                      alt="GrabFood Logo"
                      class="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 object-contain"
                    />
                  </div>
                  <h3
                    class="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3"
                  >
                    Grabfood
                  </h3>
                  <p
                    class="text-xs sm:text-sm lg:text-base mb-4 opacity-90 leading-relaxed px-2"
                  >
                    Get your Countryside favorites delivered by Grab
                  </p>
                </div>
                <button
                  @click="openGrabfoodModal"
                  class="bg-white text-green-600 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium hover:bg-gray-100 transition-colors w-full cursor-pointer text-sm sm:text-base shadow-md hover:shadow-lg"
                >
                  Order on Grabfood
                </button>
              </div>
            </div>
          </div>

          <!-- Right Side - Video -->
          <div
            class="flex justify-center lg:justify-end order-3 lg:order-2 mt-6 lg:mt-0"
          >
            <div class="max-w-lg w-full">
              <div
                class="relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl"
              >
                <video
                  class="w-full h-auto rounded-xl sm:rounded-2xl"
                  loop
                  playsinline
                  ref="deliveryVideo"
                  :muted="isDeliveryVideoMuted"
                >
                  <source src="/video/foodgrab.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>

                <!-- Play/Pause Button for Delivery Video -->
                <button
                  @click="toggleDeliveryVideo"
                  class="absolute top-2 left-2 sm:top-4 sm:left-4 bg-black/70 hover:bg-black/90 text-white p-2 sm:p-3 rounded-full transition-all duration-300 hover:scale-110 backdrop-blur-sm z-20"
                  :title="isDeliveryVideoPlaying ? 'Pause' : 'Play'"
                >
                  <svg
                    v-if="isDeliveryVideoPlaying"
                    class="w-4 h-4 sm:w-5 sm:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <svg
                    v-else
                    class="w-4 h-4 sm:w-5 sm:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </button>

                <!-- Volume Control for Delivery Video -->
                <button
                  @click="toggleDeliveryVideoMute"
                  class="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-full p-2 sm:p-2.5 text-white hover:text-orange-400 transition-all duration-300 z-20"
                  :title="
                    isDeliveryVideoMuted
                      ? 'Unmute (Click to enable sound)'
                      : 'Mute (Click to disable sound)'
                  "
                >
                  <font-awesome-icon
                    v-if="isDeliveryVideoMuted"
                    icon="fa-solid fa-volume-xmark"
                    class="w-3 h-3 sm:w-4 sm:h-4"
                  />
                  <font-awesome-icon
                    v-else-if="deliveryVideoVolume === 0"
                    icon="fa-solid fa-volume-off"
                    class="w-3 h-3 sm:w-4 sm:h-4"
                  />
                  <font-awesome-icon
                    v-else-if="deliveryVideoVolume < 0.5"
                    icon="fa-solid fa-volume-low"
                    class="w-3 h-3 sm:w-4 sm:h-4"
                  />
                  <font-awesome-icon
                    v-else
                    icon="fa-solid fa-volume-high"
                    class="w-3 h-3 sm:w-4 sm:h-4"
                  />
                </button>
              </div>

              <!-- Video Caption -->
              <p
                class="text-xs sm:text-sm text-gray-200 mt-2 sm:mt-3 italic text-center lg:text-right"
              >
                Experience the convenience of food delivery with Countryside
                Steakhouse
              </p>
            </div>
          </div>
        </div>

        <!-- Additional Delivery Info -->
        <div class="mt-12 text-center">
          <div
            class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 w-full border border-white/30"
          >
            <div class="flex items-center justify-center mb-4">
              <div class="w-70 h-0.5 bg-green-200"></div>
              <h4 class="text-xl text-green-200 mx-3">Delivery Information</h4>
              <div class="w-70 h-0.5 bg-green-200"></div>
            </div>
            <div class="grid md:grid-cols-3 gap-4 text-sm text-gray-200">
              <div>
                <font-awesome-icon icon="fa-solid fa-clock" />
                <p>Delivery Time: 30-45 minutes</p>
              </div>
              <div>
                <font-awesome-icon icon="fa-solid fa-coins" />
                <p>
                  Delivery Fee:
                  <span><font-awesome-icon icon="fa-solid fa-peso-sign" /></span
                  >50 -
                  <span><font-awesome-icon icon="fa-solid fa-peso-sign" /></span
                  >80
                </p>
              </div>
              <div>
                <font-awesome-icon icon="fa-solid fa-location-dot" />
                <p>Available in selected branches only</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Our Stores Section -->
    <section id="stores" class="py-20 bg-white">
      <div class="container mx-auto px-6">
        <div class="text-center mb-16">
          <div class="flex items-center justify-center mb-6">
            <div class="w-20 h-0.5 bg-orange-400"></div>
            <h2 class="text-4xl font-bold text-green-800 mx-6">Our Branches</h2>
            <div class="w-20 h-0.5 bg-orange-400"></div>
          </div>
        </div>
        <!-- Loading State -->
        <div
          v-if="isLoadingBranches"
          class="flex justify-center items-center py-12"
        >
          <div class="loading loading-spinner loading-lg text-green-600"></div>
        </div>

        <!-- Branches - Horizontal Scroll on Mobile, Grid on Desktop -->
        <div v-else-if="branches.length > 0" class="relative">
          <!-- Mobile: Horizontal Scrollable -->
          <div
            class="md:hidden overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide snap-x snap-mandatory"
          >
            <div class="flex gap-4">
              <div
                v-for="(branch, index) in branches"
                :key="branch.id"
                class="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 card-hover flex-shrink-0 w-[85vw] max-w-[320px] snap-start flex flex-col animate-fade-in-up"
                :style="{ animationDelay: `${index * 0.15}s` }"
              >
              <div class="h-40 sm:h-48 overflow-hidden">
                <img
                  :src="
                    resolvePublicUrl(branch.image_url) ||
                    '/src/assets/crm/default-branch.png'
                  "
                  :alt="branch.name"
                  class="w-full h-full object-cover hover:scale-110 transition-transform duration-300 animate-image-fade-in"
                  :style="{ animationDelay: `${index * 0.15 + 0.2}s` }"
                  loading="lazy"
                />
                </div>
                <div class="p-4 sm:p-6 flex flex-col flex-1">
                  <h3 class="text-lg sm:text-xl font-bold text-green-800 mb-2">
                    {{ branch.name }}
                  </h3>
                  <div
                    class="flex items-start text-xs sm:text-sm text-gray-600 mb-3 leading-tight"
                  >
                    <font-awesome-icon
                      icon="fa-solid fa-location-dot"
                      class="mr-2 text-green-600 mt-1 flex-shrink-0"
                    />
                    <span class="whitespace-normal break-words">{{
                      branch.address
                    }}</span>
                  </div>

                  <div
                    class="flex items-center text-xs sm:text-sm text-gray-600 mb-4"
                    v-if="branch.phone"
                  >
                    <font-awesome-icon
                      icon="fa-solid fa-phone"
                      class="mr-2 text-green-600 flex-shrink-0"
                    />
                    <span>{{ branch.phone }}</span>
                  </div>
                  <button
                    class="w-full bg-green-600 text-white py-2 sm:py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base font-medium mt-auto"
                    @click="getDirections(branch)"
                  >
                    Get Directions
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Desktop: Grid Layout -->
          <div
            class="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            <div
              v-for="(branch, index) in branches.slice(0, 6)"
              :key="branch.id"
              class="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 card-hover flex flex-col animate-fade-in-up"
              :style="{ animationDelay: `${index * 0.1}s` }"
            >
              <div class="h-48 sm:h-56 overflow-hidden">
                <img
                  :src="
                    resolvePublicUrl(branch.image_url) ||
                    '/src/assets/crm/default-branch.png'
                  "
                  :alt="branch.name"
                  class="w-full h-full object-cover hover:scale-110 transition-transform duration-300 animate-image-fade-in"
                  :style="{ animationDelay: `${index * 0.1 + 0.2}s` }"
                  loading="lazy"
                />
              </div>
              <div class="p-4 sm:p-6 flex flex-col flex-1">
                <h3 class="text-lg sm:text-xl font-bold text-green-800 mb-2">
                  {{ branch.name }}
                </h3>
                <div
                  class="flex items-start text-xs sm:text-sm text-gray-600 mb-3 leading-tight"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-location-dot"
                    class="mr-2 text-green-600 mt-1 flex-shrink-0"
                  />
                  <span class="whitespace-normal break-words">{{
                    branch.address
                  }}</span>
                </div>

                <div
                  class="flex items-center text-xs sm:text-sm text-gray-600 mb-4"
                  v-if="branch.phone"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-phone"
                    class="mr-2 text-green-600 flex-shrink-0"
                  />
                  <span>{{ branch.phone }}</span>
                </div>
                <button
                  class="w-full bg-green-600 text-white py-2 sm:py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base font-medium mt-auto"
                  @click="getDirections(branch)"
                >
                  Get Directions
                </button>
              </div>
            </div>
          </div>

          <!-- View All Button -->
          <div
            v-if="branches.length > 6"
            class="hidden md:flex justify-center mt-8"
          >
            <router-link
              to="/stores"
              class="btn bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg shadow-lg hover:shadow-xl flex items-center !font-medium"
            >
              <span>View All Branches</span>
              <font-awesome-icon
                icon="fa-solid fa-arrow-right"
                class="ml-2 transition-transform group-hover:translate-x-1"
              />
            </router-link>
          </div>

          <!-- Mobile: View All Button (shown if more than visible branches) -->
          <div
            v-if="branches.length > 3"
            class="md:hidden flex justify-center mt-6"
          >
            <router-link
              to="/stores"
              class="btn bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-lg hover:shadow-xl flex items-center text-sm"
            >
              <span>View All Branches</span>
              <font-awesome-icon
                icon="fa-solid fa-arrow-right"
                class="ml-2 transition-transform group-hover:translate-x-1"
              />
            </router-link>
          </div>
        </div>

        <!-- No Branches State -->
        <div v-else class="text-center py-12">
          <p class="text-gray-500">No branches available at the moment.</p>
        </div>
      </div>
    </section>

    <!-- Job Application Section -->
    <section id="join-us" class="py-20 bg-green-800">
      <div class="container mx-auto px-6">
        <div class="text-center max-w-4xl mx-auto">
          <!-- Title -->
          <div class="flex items-center justify-center mb-6">
            <div class="w-20 h-0.5 bg-orange-400"></div>
            <h2
              class="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mx-6"
            >
              Join Our Team
            </h2>
            <div class="w-20 h-0.5 bg-orange-400"></div>
          </div>

          <!-- Description -->
          <p class="text-lg sm:text-xl text-green-100 mb-8 leading-relaxed">
            Be part of the Countryside family! We're always looking for
            passionate individuals to join our growing team. Explore our current
            job openings and find the perfect role that matches your skills and
            passion.
          </p>

          <!-- Job Type Info Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
            <!-- Full-time Card -->
            <div
              class="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <div class="flex flex-col items-center">
                <div
                  class="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500/20 rounded-full flex items-center justify-center mb-3"
                >
                  <Clock :size="24" class="text-blue-300" />
                </div>
                <h3 class="text-white font-semibold text-lg sm:text-xl mb-2">
                  Full-time
                </h3>
                <p class="text-green-100 text-sm sm:text-base">
                  40+ hours per week
                </p>
              </div>
            </div>

            <!-- Part-time Card -->
            <div
              class="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <div class="flex flex-col items-center">
                <div
                  class="w-12 h-12 sm:w-14 sm:h-14 bg-orange-500/20 rounded-full flex items-center justify-center mb-3"
                >
                  <Briefcase :size="24" class="text-orange-300" />
                </div>
                <h3 class="text-white font-semibold text-lg sm:text-xl mb-2">
                  Part-time
                </h3>
                <p class="text-green-100 text-sm sm:text-base">(coming soon)</p>
              </div>
            </div>

            <!-- Available Positions Card -->
            <div
              class="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <div class="flex flex-col items-center">
                <div
                  class="w-12 h-12 sm:w-14 sm:h-14 bg-green-500/20 rounded-full flex items-center justify-center mb-3"
                >
                  <Users :size="24" class="text-green-300" />
                </div>
                <h3 class="text-white font-semibold text-lg sm:text-xl mb-2">
                  Open Positions
                </h3>
                <p class="text-green-100 text-sm sm:text-base">
                  Multiple roles available
                </p>
              </div>
            </div>
          </div>

          <!-- Button -->
          <button
            @click="openJobPositionsModal"
            class="bg-orange-500 hover:bg-orange-400 text-white px-4 sm:px-6 md:px-8 lg:px-12 py-2.5 sm:py-3 md:py-4 rounded-lg font-medium sm:font-semibold text-sm sm:text-base md:text-lg shadow-md hover:shadow-lg flex items-center justify-center mx-auto max-w-xs sm:max-w-none cursor-pointer"
          >
            <font-awesome-icon
              icon="fa-solid fa-user-plus"
              class="mr-2 sm:mr-3 text-sm sm:text-base"
            />
            <span class="whitespace-nowrap font-medium"
              >Join Us<span class="hidden sm:inline">
                - Check Available Jobs</span
              ></span
            >
          </button>
        </div>
      </div>
    </section>

    <!-- Menu Teaser Section -->
    <section id="menu-teaser" class="py-20 bg-green-800">
      <div class="container mx-auto px-6">
        <div class="text-center mb-16">
          <div class="flex items-center justify-center mb-6">
            <div class="w-20 h-0.5 bg-orange-400"></div>
            <h2 class="text-4xl font-bold text-white mx-6">
              Our Signature Dishes
            </h2>
            <div class="w-20 h-0.5 bg-orange-400"></div>
          </div>
          <p class="text-xl text-white/90 max-w-2xl mx-auto">
            A glimpse of our most beloved dishes that keep our customers coming
            back
          </p>
        </div>

        <!-- Loading State -->
        <div
          v-if="isLoadingMenu"
          class="flex justify-center items-center py-12"
        >
          <div class="loading loading-spinner loading-lg text-orange-500"></div>
        </div>

        <!-- Signature Dishes - Horizontal Scroll on Mobile, Grid on Desktop -->
        <div v-else-if="signatureDishes.length > 0" class="relative">
          <!-- Mobile: Horizontal Scrollable -->
          <div
            class="md:hidden overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide snap-x snap-mandatory"
          >
            <div class="flex gap-4">
              <div
                v-for="item in signatureDishes"
                :key="item.name"
                class="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 card-hover relative flex-shrink-0 w-[75vw] max-w-[280px] snap-start"
              >
                <!-- Modern Promo Badge -->
                <div
                  v-if="item.hasPromo"
                  class="absolute top-3 right-3 sm:top-4 sm:right-4 z-10"
                >
                  <div
                    class="bg-gradient-to-br from-red-500 to-orange-500 rounded-lg sm:rounded-xl px-2 py-1.5 sm:px-3 sm:py-2 shadow-lg backdrop-blur-sm border border-white/20 relative overflow-hidden hover:scale-105 transition-all duration-300 hover:shadow-xl"
                  >
                    <!-- Shimmer Effect -->
                    <div
                      class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"
                    ></div>

                    <div class="relative z-10 text-center">
                      <div
                        class="text-white text-xs sm:text-sm font-thin leading-none drop-shadow-sm"
                      >
                        {{
                          item.promoInfo.discount_type === 'percentage'
                            ? '-' + item.promoInfo.discount_percentage + '%'
                            : '-₱' + item.promoInfo.discount_amount
                        }}
                      </div>
                      <div
                        class="text-white/90 text-[10px] sm:text-xs font-thin uppercase tracking-wide mt-0.5 sm:mt-1"
                      >
                        OFF
                      </div>
                    </div>
                  </div>
                </div>

                <div class="h-40 sm:h-48 overflow-hidden group relative">
                  <img
                    :src="item.image"
                    :alt="item.name"
                    class="w-full h-full object-cover transform transition-transform duration-500 ease-in-out group-hover:scale-110"
                  />

                  <!-- Promo Overlay -->
                  <div
                    v-if="item.hasPromo"
                    class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  ></div>
                </div>

                <div class="p-4 sm:p-6">
                  <h3 class="text-lg sm:text-xl font-bold text-green-800 mb-2">
                    {{ item.name }}
                  </h3>

                  <!-- Price Section with Promo -->
                  <div class="flex justify-between items-center">
                    <div class="flex flex-col">
                      <!-- Original Price (crossed out if promo) -->
                      <span
                        v-if="item.hasPromo"
                        class="text-gray-400 text-xs sm:text-sm line-through"
                      >
                        <font-awesome-icon icon="fa-solid fa-peso-sign" />
                        {{ item.originalPrice.toFixed(2) }}
                      </span>

                      <!-- Current Price -->
                      <span
                        :class="[
                          'font-bold text-base sm:text-lg',
                          item.hasPromo ? 'text-red-500' : 'text-orange-500',
                        ]"
                      >
                        <font-awesome-icon icon="fa-solid fa-peso-sign" />
                        {{
                          item.discountedPrice
                            ? item.discountedPrice.toFixed(2)
                            : item.price.toFixed(2)
                        }}
                      </span>

                      <!-- Discount Amount -->
                      <span
                        v-if="
                          item.hasPromo &&
                          item.promoInfo.discount_type === 'percentage'
                        "
                        class="text-[10px] sm:text-xs text-green-600 font-semibold"
                      >
                        {{ item.promoInfo.discount_percentage }}% OFF
                      </span>
                      <span
                        v-else-if="
                          item.hasPromo &&
                          item.promoInfo.discount_type === 'fixed_amount'
                        "
                        class="text-[10px] sm:text-xs text-green-600 font-semibold"
                      >
                        ₱{{ item.promoInfo.discount_amount }} OFF
                      </span>
                    </div>

                    <!-- Promo Icon -->
                    <div
                      v-if="item.hasPromo"
                      class="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-full shadow-md hover:scale-110 hover:shadow-lg transition-all duration-300"
                    >
                      <font-awesome-icon
                        icon="fa-solid fa-bolt"
                        class="text-[10px] sm:text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Desktop: Grid Layout -->
          <div
            class="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 cursor-pointer"
          >
            <div
              v-for="item in signatureDishes"
              :key="item.name"
              class="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 card-hover relative"
            >
              <!-- Modern Promo Badge -->
              <div v-if="item.hasPromo" class="absolute top-4 right-4 z-10">
                <div
                  class="bg-gradient-to-br from-red-500 to-orange-500 rounded-xl px-3 py-2 shadow-lg backdrop-blur-sm border border-white/20 relative overflow-hidden hover:scale-105 transition-all duration-300 hover:shadow-xl"
                >
                  <!-- Shimmer Effect -->
                  <div
                    class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"
                  ></div>

                  <div class="relative z-10 text-center">
                    <div
                      class="text-white text-sm font-thin leading-none drop-shadow-sm"
                    >
                      {{
                        item.promoInfo.discount_type === 'percentage'
                          ? '-' + item.promoInfo.discount_percentage + '%'
                          : '-₱' + item.promoInfo.discount_amount
                      }}
                    </div>
                    <div
                      class="text-white/90 text-xs font-thin uppercase tracking-wide mt-1"
                    >
                      OFF
                    </div>
                  </div>
                </div>
              </div>

              <div class="h-48 overflow-hidden group relative">
                <img
                  :src="item.image"
                  :alt="item.name"
                  class="w-full h-full object-cover transform transition-transform duration-500 ease-in-out group-hover:scale-110"
                />

                <!-- Promo Overlay -->
                <div
                  v-if="item.hasPromo"
                  class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                ></div>
              </div>

              <div class="p-6">
                <h3 class="text-xl font-bold text-green-800 mb-2">
                  {{ item.name }}
                </h3>

                <!-- Price Section with Promo -->
                <div class="flex justify-between items-center">
                  <div class="flex flex-col">
                    <!-- Original Price (crossed out if promo) -->
                    <span
                      v-if="item.hasPromo"
                      class="text-gray-400 text-sm line-through"
                    >
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{ item.originalPrice.toFixed(2) }}
                    </span>

                    <!-- Current Price -->
                    <span
                      :class="[
                        'font-bold text-lg',
                        item.hasPromo ? 'text-red-500' : 'text-orange-500',
                      ]"
                    >
                      <font-awesome-icon icon="fa-solid fa-peso-sign" />
                      {{
                        item.discountedPrice
                          ? item.discountedPrice.toFixed(2)
                          : item.price.toFixed(2)
                      }}
                    </span>

                    <!-- Discount Amount -->
                    <span
                      v-if="
                        item.hasPromo &&
                        item.promoInfo.discount_type === 'percentage'
                      "
                      class="text-xs text-green-600 font-semibold"
                    >
                      {{ item.promoInfo.discount_percentage }}% OFF
                    </span>
                    <span
                      v-else-if="
                        item.hasPromo &&
                        item.promoInfo.discount_type === 'fixed_amount'
                      "
                      class="text-xs text-green-600 font-semibold"
                    >
                      ₱{{ item.promoInfo.discount_amount }} OFF
                    </span>
                  </div>

                  <!-- Promo Icon -->
                  <div
                    v-if="item.hasPromo"
                    class="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-full shadow-md hover:scale-110 hover:shadow-lg transition-all duration-300"
                  >
                    <font-awesome-icon
                      icon="fa-solid fa-bolt"
                      class="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No Menu Items State -->
        <div v-else class="text-center py-12">
          <p class="text-white/70">
            No signature dishes available at the moment.
          </p>
        </div>

        <!-- Full Menu Button -->
        <div class="mt-12 flex justify-center lg:justify-end">
          <router-link
            to="/menu"
            class="btn btn-sm border-none bg-orange-500 hover:bg-orange-400 text-white px-8 py-3 rounded-md !font-thin shadow-none"
          >
            <span>View Full Menu</span>
            <font-awesome-icon
              icon="fa-solid fa-arrow-right"
              class="ml-2 transition-transform group-hover:translate-x-1"
            />
          </router-link>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="py-20 bg-gray-50">
      <div class="container mx-auto px-6 lg:px-8">
        <!-- Section Header -->
        <div class="text-center mb-16">
          <div class="flex items-center justify-center">
            <div class="w-10 sm:w-12 h-0.5 bg-green-600"></div>
            <h2
              class="text-3xl sm:text-4xl font-bold text-green-800 mx-3 sm:mx-4"
            >
              Get In Touch
            </h2>
            <div class="w-10 sm:w-12 h-0.5 bg-green-600"></div>
          </div>
          <p class="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto mt-4">
            Have questions or want to make a reservation? We'd love to hear from
            you!
          </p>
        </div>

        <!-- Contact Info - 2 Column Layout -->
        <div class="max-w-5xl mx-auto">
          <h3 class="text-2xl font-bold text-green-800 mb-8 text-center">
            Contact Information
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <!-- Left Column: Contact Details -->
            <div class="space-y-5">
              <!-- Phone -->
              <div class="flex items-center">
                <div
                  class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4 flex-shrink-0"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-phone"
                    class="text-white text-md"
                  />
                </div>
                <div>
                  <div class="font-semibold text-gray-800">Phone</div>
                  <div class="text-gray-600">+63 912 345 6789</div>
                </div>
              </div>

              <!-- Email -->
              <div class="flex items-center">
                <div
                  class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4 flex-shrink-0"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-envelope"
                    class="text-white text-md"
                  />
                </div>
                <div>
                  <div class="font-semibold text-gray-800">Email</div>
                  <div class="text-gray-600 break-all">
                    countryside_steakhouse@yahoo.com.ph
                  </div>
                </div>
              </div>

              <!-- Address -->
              <div class="flex items-center">
                <div
                  class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4 flex-shrink-0"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-location-dot"
                    class="text-white text-md"
                  />
                </div>
                <div>
                  <div class="font-semibold text-gray-800">Main Office</div>
                  <div class="text-gray-600">
                    Burol Main Street, Countryside City
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Social Media -->
            <div
              class="flex flex-col items-center md:items-start justify-center md:justify-start"
            >
              <div class="flex items-center mb-6">
                <div
                  class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4 flex-shrink-0"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-share-nodes"
                    class="text-white text-md"
                  />
                </div>
                <div>
                  <div class="font-semibold text-gray-800 text-lg">
                    Follow Us
                  </div>
                </div>
              </div>
              <div class="space-y-4 w-full">
                <!-- Main Branch -->
                <a
                  href="https://www.facebook.com/PNCountryside"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-300 shadow-sm hover:shadow-md group"
                >
                  <div
                    class="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0 group-hover:bg-green-700 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      class="fill-current text-white"
                    >
                      <path
                        d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667
              c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808
              c-3.596 0-5.192 1.583-5.192 4.615v3.385z"
                      />
                    </svg>
                  </div>
                  <div class="flex-1">
                    <div class="font-semibold text-gray-800 text-sm">
                      Countryside Steakhouse - Main Branch
                    </div>
                    <div class="text-gray-600 text-xs">Facebook</div>
                  </div>
                </a>

                <!-- Silang Branch -->
                <a
                  href="https://www.facebook.com/CS.Silang"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-300 shadow-sm hover:shadow-md group"
                >
                  <div
                    class="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0 group-hover:bg-green-700 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      class="fill-current text-white"
                    >
                      <path
                        d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667
              c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808
              c-3.596 0-5.192 1.583-5.192 4.615v3.385z"
                      />
                    </svg>
                  </div>
                  <div class="flex-1">
                    <div class="font-semibold text-gray-800 text-sm">
                      Countryside Steakhouse - Silang Branch
                    </div>
                    <div class="text-gray-600 text-xs">Facebook</div>
                  </div>
                </a>

                <!-- Tanza Branch -->
                <a
                  href="https://www.facebook.com/profile.php?id=100057313935213"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-300 shadow-sm hover:shadow-md group"
                >
                  <div
                    class="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0 group-hover:bg-green-700 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      class="fill-current text-white"
                    >
                      <path
                        d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667
              c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808
              c-3.596 0-5.192 1.583-5.192 4.615v3.385z"
                      />
                    </svg>
                  </div>
                  <div class="flex-1">
                    <div class="font-semibold text-gray-800 text-sm">
                      Countryside Steakhouse - Tanza
                    </div>
                    <div class="text-gray-600 text-xs">Facebook</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <footer class="bg-orange-500 text-white p-8">
      <div
        class="container mx-auto flex flex-col sm:flex-row justify-between items-center sm:items-start space-y-8 sm:space-y-0 sm:space-x-8"
      >
        <!-- Logo + Description -->
        <aside
          class="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-x-0 sm:space-x-4 space-y-2 sm:space-y-0"
        >
          <img
            src="/logo1.png"
            alt="Countryside Steakhouse Logo"
            class="w-14 h-14 object-contain"
          />
          <p>
            <span class="font-bold text-lg block">Countryside Steakhouse</span>
            Serving quality steaks since 1984
            <font-awesome-icon icon="fa-solid fa-utensils" class="ml-1" />
          </p>
        </aside>

        <!-- Follow Us Section -->
        <nav class="flex flex-col items-center sm:items-start space-y-3">
          <h6
            class="footer-title text-sm text-white font-thin uppercase tracking-wide"
          >
            Follow Us
          </h6>
          <div class="flex space-x-6">
            <!-- Twitter -->
            <a
              href="https://www.facebook.com/PNCountryside"
              class="hover:text-green-200 transition-transform transform hover:scale-110"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                class="fill-current"
              >
                <path
                  d="M24 4.557c-.883.392-1.832.656-2.828.775 
              1.017-.609 1.798-1.574 2.165-2.724
              -.951.564-2.005.974-3.127 1.195
              -.897-.957-2.178-1.555-3.594-1.555
              -3.179 0-5.515 2.966-4.797 6.045
              -4.091-.205-7.719-2.165-10.148-5.144
              -1.29 2.213-.669 5.108 1.523 6.574
              -.806-.026-1.566-.247-2.229-.616
              -.054 2.281 1.581 4.415 3.949 4.89
              -.693.188-1.452.232-2.224.084
              .626 1.956 2.444 3.379 4.6 3.419
              -2.07 1.623-4.678 2.348-7.29 2.04
              2.179 1.397 4.768 2.212 7.548 2.212
              9.142 0 14.307-7.721 13.995-14.646
              .962-.695 1.797-1.562 2.457-2.549z"
                ></path>
              </svg>
            </a>

            <!-- YouTube -->
            <a
              href="https://www.facebook.com/PNCountryside"
              class="hover:text-green-200 transition-transform transform hover:scale-110"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                class="fill-current"
              >
                <path
                  d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0
              -3.897.266-4.356 2.62-4.385 8.816
              .029 6.185.484 8.549 4.385 8.816
              3.6.245 11.626.246 15.23 0
              3.897-.266 4.356-2.62 4.385-8.816
              -.029-6.185-.484-8.549-4.385-8.816zm-10.615
              12.816v-8l8 3.993-8 4.007z"
                ></path>
              </svg>
            </a>

            <!-- Facebook -->
            <a
              href="https://www.facebook.com/PNCountryside"
              class="hover:text-green-200 transition-transform transform hover:scale-110"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                class="fill-current"
              >
                <path
                  d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667
              c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808
              c-3.596 0-5.192 1.583-5.192 4.615v3.385z"
                ></path>
              </svg>
            </a>
          </div>
        </nav>
      </div>

      <!-- Divider -->
      <div class="border-t border-white/20 mt-8 pt-4 text-center text-sm">
        © {{ new Date().getFullYear() }} Countryside Steakhouse. All rights
        reserved.
      </div>
    </footer>
  </div>
</template>

<script setup>
  import { useRouter } from 'vue-router';
  import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue';
  import AnnouncementModal from './AnnouncementModal.vue';
  import FoodpandaOrderModal from './FoodpandaOrderModal.vue';
  import GrabfoodOrderModal from './GrabfoodOrderModal.vue';
  import JobPositionsModal from './JobPositionsModal.vue';
  import branchService from '../../services/branchService.js';
  import menuService from '../../services/menuService.js';
  import announcementService from '../../services/announcementService.js';
  import { formatImageUrl, apiConfig } from '../../config/api.js';
  import { Clock, Briefcase, Users, Megaphone } from 'lucide-vue-next';
  import { useFeedbackStore } from '../../stores/feedbackStore.js';

  // Backend base derived from api config (strip /api)
  const API_BASE_URL = (apiConfig?.baseURL || '').replace(/\/?api\/?$/, '');

  const router = useRouter();
  const feedbackStore = useFeedbackStore();
  const isScrolled = ref(false);
  const currentHeroIndex = ref(0);

  // Mobile menu state
  const isMobileMenuOpen = ref(false);

  // Real data from API
  const branches = ref([]);
  const menuItems = ref([]);
  const signatureDishes = ref([]);
  const isLoadingBranches = ref(false);
  const isLoadingMenu = ref(false);

  // User interaction tracking for video autoplay
  const hasUserInteracted = ref(false);

  // Debounce mechanism to prevent rapid video changes
  let videoChangeTimeout = null;

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

  // Reels carousel state
  const currentReelIndex = ref(0);
  const videoPlayer = ref(null);
  const deliveryVideo = ref(null);

  // Video play/pause state
  const isHeroVideoPlaying = ref(true);
  const isDeliveryVideoPlaying = ref(true);

  // Video volume state
  const heroVideoVolume = ref(0.5); // Default 50% volume
  const isHeroVideoMuted = ref(false); // Start unmuted
  const deliveryVideoVolume = ref(0.5); // Default 50% volume
  const isDeliveryVideoMuted = ref(false); // Start unmuted

  // Auto-scroll state
  const isReelsAutoScrollActive = ref(true);

  // Reels videos array with metadata
  const reels = [
    {
      src: '/video/reels/Reels2.mp4',
      title: 'Customer Moments',
      description: 'Happy customers enjoying our food',
    },
    {
      src: '/video/reels/Reels1.mp4',
      title: 'Kitchen Magic',
      description: 'Behind the scenes of our kitchen',
    },
    {
      src: '/video/reels/Reels01.mp4.mp4',
      title: 'Sizzling Steaks',
      description: 'Watch our signature steaks being prepared',
    },
    {
      src: '/video/reels/Reels3.mp4',
      title: 'Restaurant Ambiance',
      description: 'Experience our cozy atmosphere',
    },
  ];

  // Computed property for current reel
  const currentReel = computed(() => reels[currentReelIndex.value].src);

  // Computed properties for Quick Stats
  const yearsOfExcellence = computed(() => {
    const foundingYear = 1984;
    const currentYear = new Date().getFullYear();
    return currentYear - foundingYear;
  });

  const totalBranches = computed(() => {
    return branches.value.length || 0;
  });

  const happyCustomersCount = computed(() => {
    const totalRatings = feedbackStore.stats?.total_ratings || 0;
    if (totalRatings === 0) return '1000+'; // Fallback to default
    // Format the number with K for thousands
    if (totalRatings >= 1000) {
      return `${(totalRatings / 1000).toFixed(1)}K+`;
    }
    return `${totalRatings}+`;
  });

  // Helper functions
  const getReelTitle = (index) => {
    return reels[index]?.title || `Reel ${index + 1}`;
  };

  const getReelDescription = (index) => {
    return reels[index]?.description || 'Experience Countryside moments';
  };

  // Reels carousel functions
  const playReel = async (index) => {
    hasUserInteracted.value = true; // Mark user interaction

    // Clear any pending video changes
    if (videoChangeTimeout) {
      clearTimeout(videoChangeTimeout);
    }

    // Debounce video changes
    videoChangeTimeout = setTimeout(async () => {
      currentReelIndex.value = index;
      if (videoPlayer.value) {
        // Wait for load to complete before attempting to play
        videoPlayer.value.load();

        // Wait for the video to be ready
        await new Promise((resolve) => {
          if (videoPlayer.value.readyState >= 2) {
            resolve();
          } else {
            videoPlayer.value.addEventListener('canplay', resolve, {
              once: true,
            });
          }
        });

        if (hasUserInteracted.value) {
          try {
            videoPlayer.value.muted = false; // Ensure unmuted
            isHeroVideoMuted.value = false; // Update state
            await videoPlayer.value.play();
            isHeroVideoPlaying.value = true;
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.log('Video play failed:', error);
            }
            isHeroVideoPlaying.value = false;
          }
        } else {
          isHeroVideoPlaying.value = false;
        }
      }
    }, 100); // 100ms debounce

    // Pause auto-scroll when user manually navigates
    pauseReelsAutoScroll();
    // Resume auto-scroll after 10 seconds of inactivity
    setTimeout(resumeReelsAutoScroll, 10000);
  };

  const nextReel = async () => {
    hasUserInteracted.value = true; // Mark user interaction

    // Clear any pending video changes
    if (videoChangeTimeout) {
      clearTimeout(videoChangeTimeout);
    }

    // Debounce video changes
    videoChangeTimeout = setTimeout(async () => {
      currentReelIndex.value = (currentReelIndex.value + 1) % reels.length;
      if (videoPlayer.value) {
        // Wait for load to complete before attempting to play
        videoPlayer.value.load();

        // Wait for the video to be ready
        await new Promise((resolve) => {
          if (videoPlayer.value.readyState >= 2) {
            resolve();
          } else {
            videoPlayer.value.addEventListener('canplay', resolve, {
              once: true,
            });
          }
        });

        if (hasUserInteracted.value) {
          try {
            videoPlayer.value.muted = false; // Ensure unmuted
            isHeroVideoMuted.value = false; // Update state
            await videoPlayer.value.play();
            isHeroVideoPlaying.value = true;
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.log('Video play failed:', error);
            }
            isHeroVideoPlaying.value = false;
          }
        } else {
          isHeroVideoPlaying.value = false;
        }
      }
    }, 100); // 100ms debounce

    // Pause auto-scroll when user manually navigates
    pauseReelsAutoScroll();
    // Resume auto-scroll after 10 seconds of inactivity
    setTimeout(resumeReelsAutoScroll, 10000);
  };

  const previousReel = async () => {
    hasUserInteracted.value = true; // Mark user interaction

    // Clear any pending video changes
    if (videoChangeTimeout) {
      clearTimeout(videoChangeTimeout);
    }

    // Debounce video changes
    videoChangeTimeout = setTimeout(async () => {
      currentReelIndex.value =
        currentReelIndex.value === 0
          ? reels.length - 1
          : currentReelIndex.value - 1;
      if (videoPlayer.value) {
        // Wait for load to complete before attempting to play
        videoPlayer.value.load();

        // Wait for the video to be ready
        await new Promise((resolve) => {
          if (videoPlayer.value.readyState >= 2) {
            resolve();
          } else {
            videoPlayer.value.addEventListener('canplay', resolve, {
              once: true,
            });
          }
        });

        if (hasUserInteracted.value) {
          try {
            videoPlayer.value.muted = false; // Ensure unmuted
            isHeroVideoMuted.value = false; // Update state
            await videoPlayer.value.play();
            isHeroVideoPlaying.value = true;
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.log('Video play failed:', error);
            }
            isHeroVideoPlaying.value = false;
          }
        } else {
          isHeroVideoPlaying.value = false;
        }
      }
    }, 100); // 100ms debounce

    // Pause auto-scroll when user manually navigates
    pauseReelsAutoScroll();
    // Resume auto-scroll after 10 seconds of inactivity
    setTimeout(resumeReelsAutoScroll, 10000);
  };

  // Video play/pause toggle methods
  const toggleHeroVideo = async () => {
    hasUserInteracted.value = true; // Mark user interaction
    if (videoPlayer.value) {
      if (isHeroVideoPlaying.value) {
        videoPlayer.value.pause();
        isHeroVideoPlaying.value = false;
      } else {
        try {
          await videoPlayer.value.play();
          isHeroVideoPlaying.value = true;
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.log('Video play failed:', error);
          }
          isHeroVideoPlaying.value = false;
        }
      }
    }
  };

  const toggleDeliveryVideo = async () => {
    hasUserInteracted.value = true; // Mark user interaction
    if (deliveryVideo.value) {
      if (isDeliveryVideoPlaying.value) {
        deliveryVideo.value.pause();
        isDeliveryVideoPlaying.value = false;
      } else {
        try {
          await deliveryVideo.value.play();
          isDeliveryVideoPlaying.value = true;
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.log('Delivery video play failed:', error);
          }
          isDeliveryVideoPlaying.value = false;
        }
      }
    }
  };

  // Volume control functions for Hero Video
  const setHeroVideoVolume = (volume) => {
    heroVideoVolume.value = parseFloat(volume);
    if (videoPlayer.value) {
      videoPlayer.value.volume = heroVideoVolume.value;
      // If volume is set above 0, automatically unmute
      if (heroVideoVolume.value > 0) {
        isHeroVideoMuted.value = false;
        videoPlayer.value.muted = false;
      } else {
        // If volume is set to 0, mute
        isHeroVideoMuted.value = true;
        videoPlayer.value.muted = true;
      }
    }
  };

  const toggleHeroVideoMute = () => {
    isHeroVideoMuted.value = !isHeroVideoMuted.value;
    if (videoPlayer.value) {
      videoPlayer.value.muted = isHeroVideoMuted.value;
      // When unmuting, ensure volume is set
      if (!isHeroVideoMuted.value && heroVideoVolume.value === 0) {
        heroVideoVolume.value = 0.5;
        videoPlayer.value.volume = 0.5;
      }
    }
  };

  // Volume control functions for Delivery Video
  const setDeliveryVideoVolume = (volume) => {
    deliveryVideoVolume.value = parseFloat(volume);
    if (deliveryVideo.value) {
      deliveryVideo.value.volume = deliveryVideoVolume.value;
      // If volume is set above 0, automatically unmute
      if (deliveryVideoVolume.value > 0) {
        isDeliveryVideoMuted.value = false;
        deliveryVideo.value.muted = false;
      } else {
        // If volume is set to 0, mute
        isDeliveryVideoMuted.value = true;
        deliveryVideo.value.muted = true;
      }
    }
  };

  const toggleDeliveryVideoMute = () => {
    isDeliveryVideoMuted.value = !isDeliveryVideoMuted.value;
    if (deliveryVideo.value) {
      deliveryVideo.value.muted = isDeliveryVideoMuted.value;
      // When unmuting, ensure volume is set
      if (!isDeliveryVideoMuted.value && deliveryVideoVolume.value === 0) {
        deliveryVideoVolume.value = 0.5;
        deliveryVideo.value.volume = 0.5;
      }
    }
  };

  // Modal state
  const isAnnouncementModalOpen = ref(false);
  const isFoodpandaModalOpen = ref(false);
  const isGrabfoodModalOpen = ref(false);
  const isJobPositionsModalOpen = ref(false);

  // Announcements state
  const activeAnnouncements = ref([]);

  // Watch for announcements changes to debug
  watch(
    () => isAnnouncementModalOpen.value,
    (newVal) => {
      console.log('Announcement modal state changed:', newVal);
    }
  );

  watch(
    () => activeAnnouncements.value,
    (newVal) => {
      console.log('Active announcements changed:', newVal);
    },
    { deep: true }
  );

  // Hero images array
  const heroImages = [
    {
      src: '/images/hero/Hero1.png',
      alt: 'Hero Image 1',
      fallbackColor: '#ff6b35',
      loaded: false,
    },
    {
      src: '/images/hero/hero2.jpg',
      alt: 'Hero Image 2',
      fallbackColor: '#4ade80',
      loaded: false,
    },
    {
      src: '/images/hero/Hero3.png',
      alt: 'Hero Image 3',
      fallbackColor: '#3b82f6',
      loaded: false,
    },
  ];

  // Preload images to ensure they're ready
  const preloadImages = () => {
    heroImages.forEach((image, index) => {
      const img = new Image();
      img.onload = () => {
        console.log(`Image loaded successfully: ${image.src}`);
        heroImages[index].loaded = true;
      };
      img.onerror = () => {
        console.warn(`Failed to load image: ${image.src}`);
        heroImages[index].loaded = false;
      };
      img.src = image.src;
    });
  };

  // Auto-scroll intervals
  let autoScrollInterval = null;
  let reelsAutoScrollInterval = null;
  let scrollTimeout = null;

  const handleScroll = () => {
    isScrolled.value = window.scrollY > 50;

    // Clear previous timeout
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    // Debounce video pause - pause immediately on scroll
    if (videoPlayer.value && isHeroVideoPlaying.value) {
      videoPlayer.value.pause();
      isHeroVideoPlaying.value = false;
    }

    if (deliveryVideo.value && isDeliveryVideoPlaying.value) {
      deliveryVideo.value.pause();
      isDeliveryVideoPlaying.value = false;
    }

    // Reset timeout for scroll end (if needed for future enhancements)
    scrollTimeout = setTimeout(() => {
      // Could add logic here to resume videos after scroll stops
    }, 150);
  };

  // Carousel functions
  const nextHero = () => {
    currentHeroIndex.value = (currentHeroIndex.value + 1) % heroImages.length;
  };

  const previousHero = () => {
    currentHeroIndex.value =
      currentHeroIndex.value === 0
        ? heroImages.length - 1
        : currentHeroIndex.value - 1;
  };

  const setCurrentHero = (index) => {
    currentHeroIndex.value = index;
  };

  // Start auto-scrolling
  const startAutoScroll = () => {
    autoScrollInterval = setInterval(() => {
      nextHero();
    }, 5000); // Change image every 5 seconds
  };

  // Start reels auto-scrolling
  const startReelsAutoScroll = () => {
    reelsAutoScrollInterval = setInterval(async () => {
      await nextReel();
    }, 8000); // Change reel every 8 seconds
  };

  // Stop auto-scrolling
  const stopAutoScroll = () => {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }
  };

  // Stop reels auto-scrolling
  const stopReelsAutoScroll = () => {
    if (reelsAutoScrollInterval) {
      clearInterval(reelsAutoScrollInterval);
      reelsAutoScrollInterval = null;
    }
  };

  // Pause reels auto-scrolling
  const pauseReelsAutoScroll = () => {
    if (reelsAutoScrollInterval) {
      clearInterval(reelsAutoScrollInterval);
      reelsAutoScrollInterval = null;
    }
    isReelsAutoScrollActive.value = false;
  };

  // Resume reels auto-scrolling
  const resumeReelsAutoScroll = () => {
    if (!reelsAutoScrollInterval) {
      startReelsAutoScroll();
    }
    isReelsAutoScrollActive.value = true;
  };

  onMounted(() => {
    window.addEventListener('scroll', handleScroll);
    startAutoScroll();
    startReelsAutoScroll();
    preloadImages(); // Preload images on mount

    // Fetch real data from API
    fetchBranches();
    fetchMenuItems();
    fetchAnnouncements();

    // Fetch feedback stats for happy customers count
    feedbackStore.fetchOrderRatingStats();

    // Add user interaction listener for video autoplay
    const enableVideoAutoplay = () => {
      hasUserInteracted.value = true;
      document.removeEventListener('click', enableVideoAutoplay);
      document.removeEventListener('touchstart', enableVideoAutoplay);
    };

    document.addEventListener('click', enableVideoAutoplay);
    document.addEventListener('touchstart', enableVideoAutoplay);

    // Add click outside handler for mobile menu
    document.addEventListener('click', handleClickOutside);

    // Add video event listeners after component is mounted
    nextTick(() => {
      if (videoPlayer.value) {
        videoPlayer.value.volume = heroVideoVolume.value;
        videoPlayer.value.muted = false; // Ensure video is unmuted
        isHeroVideoMuted.value = false; // Update state
        videoPlayer.value.addEventListener('play', () => {
          isHeroVideoPlaying.value = true;
        });
        videoPlayer.value.addEventListener('pause', () => {
          isHeroVideoPlaying.value = false;
        });
      }
      // Set delivery video volume
      if (deliveryVideo.value) {
        deliveryVideo.value.volume = deliveryVideoVolume.value;
        deliveryVideo.value.muted = false; // Ensure delivery video is unmuted
        isDeliveryVideoMuted.value = false; // Update state
      }
    });
  });

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
    stopAutoScroll();
    stopReelsAutoScroll();

    // Clear any pending video changes
    if (videoChangeTimeout) {
      clearTimeout(videoChangeTimeout);
    }

    // Clear scroll timeout
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    // Remove click outside handler
    document.removeEventListener('click', handleClickOutside);
  });

  const goToLogin = () => {
    router.push('/login');
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

  // Smooth scroll to benefits section
  const scrollToBenefits = () => {
    const benefitsSection = document.getElementById('benefits');
    if (benefitsSection) {
      benefitsSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  // Modal functions
  const openAnnouncementModal = () => {
    console.log('Opening announcement modal...', {
      isOpen: isAnnouncementModalOpen.value,
      announcementsCount: activeAnnouncements.value.length,
      announcements: activeAnnouncements.value,
    });
    isAnnouncementModalOpen.value = true;
    console.log('Modal state after opening:', isAnnouncementModalOpen.value);
  };

  const closeAnnouncementModal = () => {
    isAnnouncementModalOpen.value = false;
    if (activeAnnouncements.value.length > 0) {
      // Mark all shown announcements as seen
      const seenIds = JSON.parse(sessionStorage.getItem('seenAnnouncementIds') || '[]');
      activeAnnouncements.value.forEach((announcement) => {
        if (!seenIds.includes(announcement.id)) {
          seenIds.push(announcement.id);
        }
      });
      sessionStorage.setItem('seenAnnouncementIds', JSON.stringify(seenIds));
    }
  };

  const openFoodpandaModal = () => {
    isFoodpandaModalOpen.value = true;
  };

  const closeFoodpandaModal = () => {
    isFoodpandaModalOpen.value = false;
  };

  const openGrabfoodModal = () => {
    isGrabfoodModalOpen.value = true;
  };

  const closeGrabfoodModal = () => {
    isGrabfoodModalOpen.value = false;
  };

  const openJobPositionsModal = () => {
    isJobPositionsModalOpen.value = true;
  };

  const closeJobPositionsModal = () => {
    isJobPositionsModalOpen.value = false;
  };

  // Error handling for image loading
  const handleImageError = (index) => {
    console.error(
      `Image failed to load at index ${index}:`,
      heroImages[index].src
    );
    // Optionally update the image object or trigger a fallback
    heroImages[index].loaded = false;
  };

  // Fetch real data from API
  const fetchBranches = async () => {
    try {
      isLoadingBranches.value = true;
      const response = await branchService.getPublicBranches();

      if (response.success) {
        branches.value = response.data;
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      // Fallback to empty array or show error message
      branches.value = [];
    } finally {
      isLoadingBranches.value = false;
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      console.log('Fetching announcements...');
      const response = await announcementService.getActiveAnnouncements();
      console.log('Announcements response:', response);

      if (response.success && response.data && response.data.length > 0) {
        console.log(`Found ${response.data.length} active announcements`);
        // Resolve image URLs if they exist
        const allAnnouncements = response.data.map((announcement) => ({
          ...announcement,
          image_url: announcement.image_url
            ? resolvePublicUrl(announcement.image_url)
            : null,
        }));

        // Sort announcements by display_order (ascending)
        const sortedAnnouncements = allAnnouncements.sort((a, b) => {
          const orderA = a.display_order !== null && a.display_order !== undefined ? a.display_order : 999;
          const orderB = b.display_order !== null && b.display_order !== undefined ? b.display_order : 999;
          return orderA - orderB;
        });

        console.log('Total announcements:', sortedAnnouncements.length);
        console.log('Announcements sorted by display_order:', sortedAnnouncements.map(a => ({ id: a.id, title: a.title, display_order: a.display_order })));

        // Show all active announcements (ordered by display_order)
        if (sortedAnnouncements.length > 0) {
          activeAnnouncements.value = sortedAnnouncements;
          
          console.log('Showing all active announcements:', activeAnnouncements.value.map(a => a.title));
          console.log('Modal will open in 1 second. Current state:', {
            isAnnouncementModalOpen: isAnnouncementModalOpen.value,
            announcementsCount: activeAnnouncements.value.length,
          });
          // Show modal after a short delay to let page load
          setTimeout(() => {
            console.log('Timeout triggered, opening modal now');
            openAnnouncementModal();
            // Force a re-check after a moment
            setTimeout(() => {
              console.log('Modal state check:', {
                isOpen: isAnnouncementModalOpen.value,
                announcements: activeAnnouncements.value,
              });
            }, 100);
          }, 1000);
        } else {
          console.log('User has already seen all announcements');
          activeAnnouncements.value = [];
        }
      } else {
        console.log('No active announcements found');
        activeAnnouncements.value = [];
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      // Don't show error to user, just silently fail
      activeAnnouncements.value = [];
    }
  };

  const fetchMenuItems = async () => {
    try {
      isLoadingMenu.value = true;
      const response = await menuService.getFeaturedMenuItems(10); // Get more items to filter

      if (response.success) {
        const items = Array.isArray(response.data) ? response.data : [];

        // Sort items to prioritize promo items first
        const sortedItems = items.sort((a, b) => {
          // Items with active promos come first
          const aHasPromo = a.promo_info && a.promo_info.is_active;
          const bHasPromo = b.promo_info && b.promo_info.is_active;

          if (aHasPromo && !bHasPromo) return -1;
          if (!aHasPromo && bHasPromo) return 1;
          return 0;
        });

        // Take only the first 4 items (prioritizing promos)
        const selectedItems = sortedItems.slice(0, 4);

        signatureDishes.value = selectedItems.map((item) => ({
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
      // Fallback to empty array or show error message
      signatureDishes.value = [];
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

  // Get directions to branch
  const getDirections = (branch) => {
    if (branch.latitude && branch.longitude) {
      // Open in Google Maps with coordinates
      const url = `https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`;
      window.open(url, '_blank');
    } else if (branch.address) {
      // Open in Google Maps with address
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address)}`;
      window.open(url, '_blank');
    } else {
      alert('Location information not available for this branch.');
    }
  };

  // Menu Categories and Items (keeping for potential future use)
  const menuCategories = [
    'All',
    'Sizzling Plates',
    'Steaks',
    'Breakfast',
    'Sides',
    'Beverages',
  ];

  const selectedCategory = ref('All');
</script>

<style scoped>
  /* Header transitions */
  header {
    backdrop-filter: blur(1px);
  }

  /* Ensure text is visible on transparent header */
  header:not(.bg-green-800) {
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.9);
  }

  /* Ensure header overlays content properly */
  header.bg-transparent {
    background: rgba(0, 0, 0, 0.1);
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  ::-webkit-scrollbar-thumb {
    background: #365a40;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #2d4a35;
  }

  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }

  /* Gallery image transitions */
  .gallery-image {
    transition: all 0.3s ease;
  }

  .gallery-image:hover {
    transform: scale(1.05) translateY(-5px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  }

  /* Enhanced button animations */
  .btn-primary {
    position: relative;
    overflow: hidden;
  }

  .btn-primary::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.5s;
  }

  .btn-primary:hover::before {
    left: 100%;
  }

  /* Text shadow enhancements */
  .hero-text {
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  }

  /* Card hover animations */
  .card-hover {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .card-hover:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  }

  /* Animation classes */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes starBounce {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1.1);
    }
  }

  @keyframes starGlow {
    0%,
    100% {
      filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.5));
    }
    50% {
      filter: drop-shadow(0 0 15px rgba(251, 191, 36, 0.8));
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-20px);
    }
  }

  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out forwards;
    opacity: 0;
  }

  /* Image fade-in animation */
  @keyframes imageFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-image-fade-in {
    animation: imageFadeIn 0.8s ease-out forwards;
    opacity: 0;
  }

  .animate-slide-in-left {
    animation: slideInLeft 0.6s ease-out;
  }

  .animate-slide-in-right {
    animation: slideInRight 0.6s ease-out;
  }

  .animate-float {
    animation: float 6s ease-in-out infinite;
  }

  /* Responsive image sizing */
  @media (max-width: 768px) {
    .hero-logo {
      width: 6rem;
      height: 6rem;
    }
  }

  @media (min-width: 769px) {
    .hero-logo {
      width: 10rem;
      height: 10rem;
    }
  }

  /* Enhanced focus states */
  button:focus,
  a:focus {
    outline-offset: 2px;
  }

  /* Video section enhancements */
  .video-container {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .video-container:hover {
    transform: translateY(-5px);
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  }

  /* Video modal animations */
  .video-modal-enter-active,
  .video-modal-leave-active {
    transition: all 0.3s ease;
  }

  .video-modal-enter-from,
  .video-modal-leave-to {
    opacity: 0;
    transform: scale(0.9);
  }

  /* Header logo and brand enhancements */
  header .cursor-pointer {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  header .cursor-pointer:hover {
    transform: translateY(-1px);
  }

  /* Star rating enhancements */
  .star-rating button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .star-rating button:hover {
    transform: translateY(-2px);
  }

  .star-rating svg {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
  }

  /* Form input enhancements */
  input:focus,
  textarea:focus {
    transform: translateY(-1px);
    box-shadow: 0 10px 25px rgba(34, 197, 94, 0.15);
  }

  /* Smooth transitions for all interactive elements */
  * {
    transition-property:
      color, background-color, border-color, text-decoration-color, fill,
      stroke, opacity, box-shadow, transform, filter, backdrop-filter;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
  }

  /* Ensure navigation items have no borders or boxes */
  nav a {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    background: none !important;
    text-decoration: none !important;
  }

  nav a:hover {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    background: none !important;
    text-decoration: none !important;
  }

  nav a:focus {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    background: none !important;
    text-decoration: none !important;
  }

  /* Remove any potential box styling from all navigation elements */
  nav a * {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    background: none !important;
  }

  /* Ensure no borders on any child elements */
  nav a span {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    background: none !important;
  }

  /* Hero section background */
  .hero-section {
    min-height: 100vh;
    position: relative;
  }

  /* Logo styling */
  .hero-logo {
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.8));
    z-index: 3;
  }

  /* Loading states */
  .image-loading {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
  }

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  /* Video Hover Effects */
  .video-player-container:hover .video-overlay-controls {
    opacity: 1;
  }

  /* Enhanced Video Player Styles */
  .video-player-container {
    position: relative;
    overflow: hidden;
    border-radius: 1rem;
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .video-player-container:hover {
    transform: translateY(-8px);
    box-shadow: 0 35px 70px rgba(0, 0, 0, 0.2);
  }

  /* Video Overlay Controls */
  .video-overlay-controls {
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  /* Video Progress Bar */
  .video-overlay-controls .bg-orange-500 {
    transition: width 0.3s ease;
  }

  /* Loading Animation */
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  /* Video Controls Hover Effects */
  .video-overlay-controls button:hover {
    transform: scale(1.1);
    transition: transform 0.2s ease;
  }

  /* Video Navigation Dots */
  .video-player-container .w-4.h-4 {
    transition: all 0.3s ease;
  }

  .video-player-container .w-4.h-4:hover {
    transform: scale(1.2);
  }

  /* Video Title Badge */
  .video-player-container .bg-black\/70 {
    backdrop-filter: blur(8px);
    transition: all 0.3s ease;
  }

  .video-player-container .bg-black\/70:hover {
    background-color: rgba(0, 0, 0, 0.8);
  }

  /* Responsive Video Adjustments - Enhanced for Better Visibility */
  @media (max-width: 768px) {
    .video-player-container {
      width: 100%;
      max-width: 24rem;
      height: 28rem;
    }
  }

  @media (min-width: 769px) {
    .video-player-container {
      width: 28rem;
      height: 40rem;
    }
  }

  @media (min-width: 1024px) {
    .video-player-container {
      width: 32rem;
      height: 40rem;
    }
  }

  /* Right Side Video Section Alignment */

  /* Play/Pause Button Styles */
  .video-player-container button,
  .relative.rounded-2xl.overflow-hidden.shadow-2xl button {
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .video-player-container button:hover,
  .relative.rounded-2xl.overflow-hidden.shadow-2xl button:hover {
    transform: scale(1.1);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }

  /* Ensure buttons are above video content */
  .video-player-container button,
  .relative.rounded-2xl.overflow-hidden.shadow-2xl button {
    z-index: 30;
  }

  /* Shimmer Animation for Tailwind */
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  /* Price Strikethrough Animation */
  .line-through {
    position: relative;
  }

  .line-through::after {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 100%;
    height: 2px;
    background: #ef4444;
    transform: translateY(-50%);
    animation: strikeThrough 0.5s ease-out;
  }

  @keyframes strikeThrough {
    0% {
      width: 0;
    }
    100% {
      width: 100%;
    }
  }

  /* Horizontal Scroll Styles for Mobile */
  .scrollbar-hide {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none; /* Chrome, Safari and Opera */
  }

  /* Snap scrolling for better mobile experience */
  .snap-x {
    scroll-snap-type: x mandatory;
  }

  .snap-start {
    scroll-snap-align: start;
  }

  .snap-mandatory {
    scroll-snap-type: x mandatory;
  }

  /* Smooth scrolling for horizontal sections */
  @media (max-width: 767px) {
    .scrollbar-hide {
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }
  }

  /* Volume slider styling */
  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }

  input[type='range']::-webkit-slider-track {
    background: rgba(255, 255, 255, 0.2);
    height: 4px;
    border-radius: 2px;
  }

  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    background: #f97316;
    height: 12px;
    width: 12px;
    border-radius: 50%;
    cursor: pointer;
    margin-top: -4px;
    transition: all 0.2s ease;
  }

  input[type='range']::-webkit-slider-thumb:hover {
    background: #fb923c;
    transform: scale(1.2);
  }

  input[type='range']::-moz-range-track {
    background: rgba(255, 255, 255, 0.2);
    height: 4px;
    border-radius: 2px;
  }

  input[type='range']::-moz-range-thumb {
    background: #f97316;
    height: 12px;
    width: 12px;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  input[type='range']::-moz-range-thumb:hover {
    background: #fb923c;
    transform: scale(1.2);
  }
</style>
