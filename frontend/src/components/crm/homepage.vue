<template>
  <div class="min-h-screen bg-gray-50">
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

    <!-- Header -->
    <header
      :class="[
        'text-white shadow-lg fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled ? 'bg-green-800' : 'bg-transparent',
      ]"
    >
      <div class="container mx-auto px-20 py-4">
        <div class="flex items-center justify-between">
          <!-- Logo and Brand -->
          <div
            class="flex items-center space-x-4 cursor-pointer group"
            @click="scrollToHome"
            title="Click to go to top"
          >
            <div
              class="w-16 h-16 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            >
              <img
                src="/logo1.png"
                alt="Countryside Logo"
                class="w-full h-full object-contain"
              />
            </div>
            <h1
              class="text-2xl font-bold transition-all duration-300 group-hover:text-orange-300 group-hover:drop-shadow-lg"
            >
              Countryside Steakhouse
            </h1>
          </div>

          <!-- Navigation -->
          <nav class="hidden md:flex items-center space-x-10">
            <a
              @click="scrollToHome"
              class="relative group py-2 px-1 text-white hover:text-orange-300 transition-all duration-300 font-medium cursor-pointer"
            >
              <span class="relative z-10">Home</span>
              <span
                class="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 transition-all duration-300 group-hover:w-full"
              ></span>
            </a>
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
            <a
              href="#contact"
              class="relative group py-2 px-1 text-white hover:text-orange-300 transition-all duration-300 font-medium"
            >
              <span class="relative z-10">Feedbacks</span>
              <span
                class="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-400 transition-all duration-300 group-hover:w-full"
              ></span>
            </a>
          </nav>

          <!-- Login Button -->
          <div class="flex items-center space-x-4">
            <button
              @click="goToLogin"
              class="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-sm cursor-pointer transition-all duration-300 shadow-md font-thin"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section
      id="home"
      class="relative min-h-screen flex items-center pt-20 hero-section overflow-hidden px-20"
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
        >
          <!-- Fallback content if image fails to load -->
          <div
            v-if="!image.loaded"
            class="absolute inset-0 flex items-center justify-center bg-gray-900 text-white"
          >
            <p>Image Loading Failed</p>
          </div>
        </div>
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
        class="absolute left-6 top-1/2 transform -translate-y-1/2 z-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-3 text-white hover:bg-white/20 transition-all duration-300 group cursor-pointer"
      >
        <font-awesome-icon
          icon="fa-solid fa-chevron-left"
          class="w-6 h-6 group-hover:-translate-x-1 transition-transform"
        />
      </button>

      <button
        @click="nextHero"
        class="absolute right-6 top-1/2 transform -translate-y-1/2 z-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full p-3 text-white hover:bg-white/20 transition-all duration-300 group cursor-pointer"
      >
        <font-awesome-icon
          icon="fa-solid fa-chevron-right"
          class="w-6 h-6 group-hover:translate-x-1 transition-transform"
        />
      </button>

      <!-- Rest of the hero content -->
      <div class="relative z-30 container mx-auto px-6">
        <div class="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
          <!-- Left Side - Main Content -->
          <div class="text-left space-y-8">
            <!-- Brand Badge -->
            <div
              class="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3 text-white mb-6 mt-6"
            >
              <span class="text-sm font-medium">
                <font-awesome-icon icon="fa-solid fa-trophy" />
                Since 1984</span
              >
            </div>

            <!-- Main Heading -->
            <h1 class="text-5xl lg:text-6xl font-bold text-white leading-tight">
              Ang Paborito ng
              <span class="text-orange-400 block mt-2">Bayan</span>
            </h1>

            <!-- Subtitle -->
            <p
              class="text-xl lg:text-1xl text-white/90 max-w-lg leading-relaxed"
            >
              Sabi nga nila, sa unang tikim pa lang, alam mong babalik-balikan
              mo! Experience the authentic taste that made us famous.
            </p>

            <!-- CTA Buttons -->
            <div class="flex flex-col sm:flex-row gap-4 pt-2">
              <router-link
                to="/menu"
                class="group bg-orange-500 hover:bg-orange-400 text-white px-8 py-4 rounded-md text-sm transition-all duration-300 flex items-center justify-center font-thin btn btn-md border border-none shadow-none"
              >
                <span>View Menu</span>
                <font-awesome-icon
                  icon="fa-solid fa-arrow-right"
                  class="ml-2 group-hover:translate-x-1 transition-transform"
                />
              </router-link>
              <router-link
                to="/stores"
                class="group bg-transparent border-2 border-white text-white hover:bg-white hover:text-gray-800 px-8 py-4 rounded-md font-thin text-sm transition-all duration-300 flex items-center justify-center btn btn-md shadow-none"
              >
                <span>Find Stores</span>
                <font-awesome-icon
                  icon="fa-solid fa-location-dot"
                  class="ml-2 group-hover:translate-x-1 transition-transform"
                />
              </router-link>
            </div>

            <!-- Quick Stats -->
            <div class="flex items-center space-x-8 pt-6">
              <div class="text-center">
                <div class="text-2xl font-bold text-orange-400">40+</div>
                <div class="text-sm text-white/70">Years of Excellence</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-orange-400">3</div>
                <div class="text-sm text-white/70">Branches</div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-orange-400">1000+</div>
                <div class="text-sm text-white/70">Happy Customers</div>
              </div>
            </div>
          </div>

          <!-- Right Side - Professional Reels Carousel - Enhanced Layout with Right Alignment -->
          <div
            class="text-center lg:text-right space-y-8 lg:space-y-10 lg:flex lg:flex-col lg:items-end"
          >
            <!-- Reels Carousel Container -->
            <div class="relative">
              <!-- Enhanced Video Display Area - Wider to Show All Content -->
              <div
                class="relative w-80 !h-[30rem] lg:w-[32rem] lg:h-[32rem] mx-auto lg:mx-0 lg:ml-auto rounded-5xl shadow-2xl overflow-hidden video-player-container"
              >
                <!-- Current Video -->
                <video
                  :src="currentReel"
                  class="w-full h-full object-contain"
                  autoplay
                  loop
                  playsinline
                  ref="videoPlayer"
                ></video>

                <!-- Play/Pause Button for Hero Video -->
                <button
                  @click="toggleHeroVideo"
                  class="btn btn-xs btn-circle shadow-none absolute top-4 left-4 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all duration-300 hover:scale-110 backdrop-blur-sm z-20"
                  :title="isHeroVideoPlaying ? 'Pause' : 'Play'"
                >
                  <font-awesome-icon
                    v-if="isHeroVideoPlaying"
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
              <div class="text-center mt-6 space-y-3">
                <div class="flex items-center justify-center space-x-3">
                  <span class="text-base font-semibold text-white"
                    >{{ currentReelIndex + 1 }} of {{ reels.length }}</span
                  >
                  <span class="text-sm text-white/70">•</span>
                  <span class="text-sm text-orange-400 font-bold">{{
                    getReelTitle(currentReelIndex)
                  }}</span>
                </div>
                <p class="text-sm text-white/90 font-medium">
                  {{ getReelDescription(currentReelIndex) }}
                </p>

                <!-- Auto-scroll indicator -->
                <div class="flex items-center justify-center space-x-2 mt-2">
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
        class="absolute bottom-24 left-1/2 transform -translate-x-1/2 animate-bounce"
      >
        <div
          class="w-6 h-10 border-2 border-white rounded-full flex justify-center"
        >
          <div class="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>

    <!-- About the Countryside Section -->
    <section class="py-20 bg-white">
      <div class="container mx-auto px-6">
        <!-- Section Title -->
        <div class="text-center mb-16">
          <div class="flex items-center justify-center mb-6">
            <div class="w-60 h-0.5 bg-orange-400"></div>
            <h2 class="text-4xl font-bold text-green-800 mx-6">About Us</h2>
            <div class="w-60 h-0.5 bg-orange-400"></div>
          </div>
        </div>

        <div class="grid lg:grid-cols-2 gap-16 items-center">
          <!-- Left Side - Image -->
          <div class="relative">
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
              class="absolute -bottom-6 -right-6 bg-orange-500 text-white px-6 py-3 rounded-full shadow-lg"
            >
              <div class="text-center">
                <div class="text-2xl font-bold">40+</div>
                <div class="text-sm">Years of Excellence</div>
              </div>
            </div>
          </div>

          <!-- Right Side - Content -->
          <div class="space-y-8">
            <!-- Main Heading -->
            <div>
              <h2
                class="text-4xl lg:text-5xl font-bold text-green-800 mb-6 leading-tight"
              >
                Serving Sizzling Steaks Since 1984!<font-awesome-icon
                  icon="fa-solid fa-fire"
                  class="text-orange-600"
                />
              </h2>
              <div class="w-20 h-1 bg-orange-400 rounded-full"></div>
            </div>

            <!-- Main Description -->
            <div class="space-y-6 text-lg text-gray-700 leading-relaxed">
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
              class="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-600"
            >
              <h3 class="text-xl font-bold text-green-800 mb-4">
                🌿 Growing Across Cavite
              </h3>
              <p class="text-gray-600 mb-4">
                We're proud to serve our community across multiple locations:
              </p>
              <div class="grid grid-cols-2 gap-2 text-sm text-gray-700">
                <div class="flex items-center">
                  <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Tanza, Philippines
                </div>
                <div class="flex items-center">
                  <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Imus, Philippines
                </div>
                <div class="flex items-center">
                  <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Kawit, Philippines
                </div>
                <div class="flex items-center">
                  <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Silang, Philippines
                </div>
                <div class="flex items-center">
                  <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  General Trias, Philippines
                </div>
                <div class="flex items-center">
                  <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Bacoor, Philippines
                </div>
                <div class="flex items-center">
                  <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Dasmariñas, Philippines
                </div>
                <div class="flex items-center">
                  <span class="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Noveleta, Philippines
                </div>
              </div>
            </div>

            <!-- Call to Action -->
            <div class="flex flex-col sm:flex-row gap-4">
              <router-link
                to="/menu"
                class="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-thin transition-all duration-300 shadow-lg flex items-center justify-center btn btn-md"
              >
                <span>Explore our menu</span>
                <font-awesome-icon
                  icon="fa-solid fa-arrow-right"
                  class="ml-4 group-hover:translate-x-1 transition-transform"
                />
              </router-link>

              <router-link
                to="/stores"
                class="bg-orange-500 hover:bg-orange-400 text-white px-8 py-3 rounded-lg font-thin transition-all duration-300 shadow-lg flex items-center justify-center btn btn-md"
              >
                <span>Find your branch</span>
                <font-awesome-icon
                  ome-icon
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
        <div class="grid lg:grid-cols-2 gap-12 items-center px-10">
          <!-- Left Side - Delivery Options -->
          <div class="space-y-8">
            <div class="text-center lg:text-left">
              <h3 class="text-2xl font-bold text-white mb-1">
                Choose Your Delivery Platform
              </h3>
              <p class="text-green-100">
                We partner with the best delivery services to bring Countryside
                to your doorstep
              </p>
            </div>

            <!-- Delivery Cards -->
            <div class="space-y-6">
              <!-- Foodpanda Card -->
              <div
                class="bg-orange-500 rounded-2xl p-6 text-white text-center transition-all duration-300 shadow-lg card-hover cursor-pointer"
              >
                <div
                  class="w-20 h-20 bg-white bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                >
                  <img
                    src="/src/assets/crm/Foodpanda.png"
                    alt="Foodpanda Logo"
                    class="w-14 h-14 object-contain"
                  />
                </div>
                <h3 class="text-2xl font-bold mb-3">Foodpanda</h3>
                <p class="text-base mb-4 opacity-90">
                  Order your favorite Countryside dishes through Foodpanda
                </p>
                <button
                  @click="openFoodpandaModal"
                  class="bg-white text-orange-500 px-6 py-2 rounded-lg font-thin hover:bg-gray-100 transition-colors w-full cursor-pointer"
                >
                  Order on Foodpanda
                </button>
              </div>

              <!-- Grabfood Card -->
              <div
                class="bg-green-600 rounded-2xl p-6 text-white text-center transition-all duration-300 shadow-lg card-hover cursor-pointer"
              >
                <div
                  class="w-20 h-20 bg-white bg-opacity-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                >
                  <img
                    src="/src/assets/crm/GrabFood.png"
                    alt="GrabFood Logo"
                    class="w-14 h-14 object-contain"
                  />
                </div>
                <h3 class="text-2xl font-bold mb-3">Grabfood</h3>
                <p class="text-base mb-4 opacity-90">
                  Get your Countryside favorites delivered by Grab
                </p>
                <button
                  @click="openGrabfoodModal"
                  class="bg-white text-green-600 px-6 py-2 rounded-lg font-thin hover:bg-gray-100 transition-colors w-full cursor-pointer"
                >
                  Order on Grabfood
                </button>
              </div>
            </div>
          </div>

          <!-- Right Side - Video -->
          <div class="flex justify-center lg:justify-end">
            <div class="max-w-lg w-full">
              <div class="relative rounded-2xl overflow-hidden shadow-2xl">
                <video
                  class="w-full h-auto rounded-2xl"
                  autoplay
                  loop
                  playsinline
                  ref="deliveryVideo"
                >
                  <source src="/video/foodgrab.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>

                <!-- Play/Pause Button for Delivery Video -->
                <button
                  @click="toggleDeliveryVideo"
                  class="absolute top-4 left-4 bg-black/70 hover:bg-black/90 text-white p-3 rounded-full transition-all duration-300 hover:scale-110 backdrop-blur-sm z-20"
                  :title="isDeliveryVideoPlaying ? 'Pause' : 'Play'"
                >
                  <svg
                    v-if="isDeliveryVideoPlaying"
                    class="w-5 h-5"
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
                    class="w-5 h-5"
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
              </div>

              <!-- Video Caption -->
              <p
                class="text-sm text-gray-200 mt-3 italic text-center lg:text-right"
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
            class="bg-white/10 backdrop-blur-lg rounded-2xl p-6 max-w-2xl mx-auto border border-white/30"
          >
            <div class="flex items-center justify-center mb-4">
              <div class="w-36 h-0.5 bg-green-200"></div>
              <h4 class="text-xl text-green-200 mx-3">Delivery Information</h4>
              <div class="w-36 h-0.5 bg-green-200"></div>
            </div>
            <div class="grid md:grid-cols-3 gap-4 text-sm text-gray-200">
              <div>
                <font-awesome-icon icon="fa-solid fa-clock" />
                <p>Delivery Time: 30-45 minutes</p>
              </div>
              <div>
                <font-awesome-icon icon="fa-solid fa-coins" />
                <p>Delivery Fee: ₱50-₱80</p>
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

    <!-- Our stores Banner -->
    <section class="bg-white py-4">
      <div class="container mx-auto px-6 text-center">
        <div class="flex items-center justify-center">
          <div class="w-12 h-0.5 bg-orange-400"></div>
          <h2 class="text-2xl font-bold text-green-800 mx-4">Our stores!</h2>
          <div class="w-12 h-0.5 bg-orange-400"></div>
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
        <div class="grid md:grid-cols-3 gap-8">
          <!-- Burol Main Branch -->
          <div
            class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 card-hover"
          >
            <div class="h-48 overflow-hidden">
              <img
                src="/src/assets/crm/Countryside Burol Main Branch.png"
                alt="Countryside Burol Main Branch"
                class="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold text-green-800 mb-2">
                Countryside Burol Main Branch
              </h3>
              <p class="text-gray-600 text-sm mb-3">COUNTRYSIDE STEAKHOUSE</p>
              <p class="text-gray-500 text-xs mb-4">
                T-BONE • CHICKEN WINGS • PORKSTEAK • TAPSILOG • SISIG
              </p>
              <div class="flex items-center text-sm text-gray-600 mb-3">
                <font-awesome-icon
                  icon="fa-solid fa-location-dot"
                  class="mr-2 text-green-600"
                />
                <span>Burol, Main Street</span>
              </div>
              <div class="flex items-center text-sm text-gray-600 mb-4">
                <font-awesome-icon
                  icon="fa-solid fa-clock"
                  class="mr-2 text-green-600"
                />
                <span>Open Daily 10AM-10PM</span>
              </div>
              <button
                class="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Get Directions
              </button>
            </div>
          </div>

          <!-- Malihan Main Branch -->
          <div
            class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 card-hover"
          >
            <div class="h-48 overflow-hidden">
              <img
                src="/src/assets/crm/Country Malihan Branch.png"
                alt="Countryside Malihan Branch"
                class="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold text-green-800 mb-2">
                Countryside Malihan Main Branch
              </h3>
              <p class="text-gray-600 text-sm mb-3">
                P&N COUNTRYSIDE STEAKHOUSE
              </p>
              <div class="flex items-center text-sm text-gray-600 mb-3">
                <font-awesome-icon
                  icon="fa-solid fa-location-dot"
                  class="mr-2 text-green-600"
                />
                <span>Malihan, Central District</span>
              </div>
              <div class="flex items-center text-sm text-gray-600 mb-4">
                <font-awesome-icon
                  icon="fa-solid fa-clock"
                  class="mr-2 text-green-600"
                />
                <span>Open Daily 10AM-10PM</span>
              </div>
              <button
                class="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Get Directions
              </button>
            </div>
          </div>

          <!-- Imus Branch -->
          <div
            class="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 card-hover"
          >
            <div class="h-48 overflow-hidden">
              <img
                src="/src/assets/crm/Countryside Imus Branch.png"
                alt="Countryside Imus Branch"
                class="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold text-green-800 mb-2">
                Countryside Imus Branch
              </h3>
              <p class="text-gray-600 text-sm mb-3">COUNTRYSIDE STEAKHOUSE</p>
              <div class="flex items-center text-sm text-gray-600 mb-3">
                <font-awesome-icon
                  icon="fa-solid fa-location-dot"
                  class="mr-2 text-green-600"
                />
                <span>Imus, Business District</span>
              </div>
              <div class="flex items-center text-sm text-gray-600 mb-4">
                <font-awesome-icon
                  icon="fa-solid fa-clock"
                  class="mr-2 text-green-600"
                />
                <span>Open Daily 10AM-10PM</span>
              </div>
              <button
                class="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Get Directions
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Food Gallery Banner -->
    <section class="bg-green-800 py-4">
      <div class="container mx-auto px-6 text-center">
        <div class="flex items-center justify-center">
          <div class="w-12 h-0.5 bg-orange-400"></div>
          <h2 class="text-2xl font-bold text-white mx-4">Our Menu</h2>
          <div class="w-12 h-0.5 bg-orange-400"></div>
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

        <!-- Signature Dishes Grid -->
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            v-for="item in signatureDishes"
            :key="item.name"
            class="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
          >
            <div class="h-48 overflow-hidden">
              <img
                :src="item.image"
                :alt="item.name"
                class="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold text-green-800 mb-2">
                {{ item.name }}
              </h3>
              <p class="text-gray-600 text-sm mb-3">{{ item.description }}</p>
              <div class="flex justify-between items-center">
                <span class="text-orange-500 font-bold text-lg"
                  >₱{{ item.price.toFixed(2) }}</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Full Menu Button -->
        <div class="text-center mt-12 flex justify-endx`">
          <router-link
            to="/menu"
            class="bg-orange-500 text-white px-8 py-3 rounded-lg font-thin transition-all duration-300 shadow-lg flex items-center justify-center cursor-pointer hover:bg-orange-400"
          >
            <span>View Full Menu</span>
            <font-awesome-icon
              icon="fa-solid fa-arrow-right"
              class="ml-2 group-hover:translate-x-1 transition-transform"
            />
          </router-link>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="py-20 bg-gray-50">
      <div class="container mx-auto px-6">
        <div class="text-center mb-16">
          <div class="flex items-center justify-center">
            <div class="w-12 h-0.5 bg-green-600"></div>
            <h2 class="text-4xl font-bold text-green-800 mx-4">Get In Touch</h2>
            <div class="w-12 h-0.5 bg-green-600"></div>
          </div>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            Have questions or want to make a reservation? We'd love to hear from
            you!
          </p>
        </div>

        <div class="grid lg:grid-cols-2 gap-12">
          <div>
            <h3 class="text-2xl font-bold text-green-800 mb-6">
              Contact Information
            </h3>
            <div class="space-y-4">
              <div class="flex items-center">
                <div
                  class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4"
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
              <div class="flex items-center">
                <div
                  class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-envelope"
                    class="text-white text-md"
                  />
                </div>
                <div>
                  <div class="font-semibold text-gray-800">Email</div>
                  <div class="text-gray-600">
                    countryside_steakhouse@yahoo.com.ph
                  </div>
                </div>
              </div>
              <div class="flex items-center">
                <div
                  class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4"
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
          </div>

          <div class="bg-white rounded-2xl p-8 shadow-lg">
            <h3 class="text-2xl font-bold text-green-800 mb-6">
              Send us a Message
            </h3>
            <form @submit.prevent="submitFeedback" class="space-y-4">
              <div>
                <input
                  v-model="feedbackForm.name"
                  type="text"
                  placeholder="Your Name"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 focus:shadow-lg"
                />
              </div>
              <div>
                <input
                  v-model="feedbackForm.email"
                  type="email"
                  placeholder="Your Email"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 focus:shadow-lg"
                />
              </div>
              <div>
                <input
                  v-model="feedbackForm.phone"
                  type="tel"
                  placeholder="Your Phone (Optional)"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 focus:shadow-lg"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3"
                  >Rating (Optional)</label
                >
                <div class="flex items-center space-x-1 star-rating">
                  <button
                    v-for="star in 5"
                    :key="star"
                    type="button"
                    @click="setRating(star)"
                    @mouseenter="hoveredRating = star"
                    @mouseleave="hoveredRating = 0"
                    :class="[
                      'relative w-10 h-10 flex items-center justify-center transition-all duration-300 ease-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
                      feedbackForm.rating >= star || hoveredRating >= star
                        ? 'text-yellow-400'
                        : 'text-gray-300',
                    ]"
                  >
                    <!-- Star Icon with SVG for better quality -->
                    <svg
                      class="w-8 h-8 transition-all duration-300"
                      :class="[
                        feedbackForm.rating >= star || hoveredRating >= star
                          ? 'scale-110 drop-shadow-lg'
                          : 'scale-100',
                      ]"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      />
                    </svg>

                    <!-- Glow effect for selected stars -->
                    <div
                      v-if="feedbackForm.rating >= star"
                      class="absolute inset-0 bg-yellow-400 rounded-full opacity-20 blur-sm animate-pulse"
                    ></div>

                    <!-- Hover effect -->
                    <div
                      v-if="hoveredRating >= star && feedbackForm.rating < star"
                      class="absolute inset-0 bg-yellow-300 rounded-full opacity-30 blur-sm animate-pulse"
                    ></div>
                  </button>

                  <!-- Rating text display -->
                  <div class="ml-4 text-sm text-gray-600">
                    <span
                      v-if="feedbackForm.rating > 0"
                      class="font-medium text-green-600"
                    >
                      {{ feedbackForm.rating }}/5 stars
                    </span>
                    <span v-else class="text-gray-500">Click to rate</span>
                  </div>
                </div>

                <!-- Rating description -->
                <div
                  v-if="feedbackForm.rating > 0"
                  class="mt-2 text-xs text-gray-500 animate-fade-in"
                >
                  <span v-if="feedbackForm.rating === 1">Poor</span>
                  <span v-else-if="feedbackForm.rating === 2">Fair</span>
                  <span v-else-if="feedbackForm.rating === 3">Good</span>
                  <span v-else-if="feedbackForm.rating === 4">Very Good</span>
                  <span v-else-if="feedbackForm.rating === 5">Excellent</span>
                </div>
              </div>
              <div>
                <textarea
                  v-model="feedbackForm.message"
                  rows="4"
                  placeholder="Your Message"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 hover:border-green-400 focus:shadow-lg resize-none"
                ></textarea>
              </div>

              <!-- Image Upload Section -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-3">
                  <font-awesome-icon
                    icon="fa-solid fa-camera"
                    class="text-green-600 mr-2"
                  />
                  Share Your Food Experience
                  <span class="text-red-500">*</span>
                </label>
                <div class="space-y-3">
                  <!-- File Input -->
                  <div class="relative">
                    <input
                      @change="handleImageUpload"
                      type="file"
                      accept="image/*"
                      class="hidden"
                      ref="imageInput"
                      id="feedback-image"
                    />
                    <label
                      for="feedback-image"
                      class="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-all duration-300"
                    >
                      <div class="text-center">
                        <svg
                          class="mx-auto h-8 w-8 text-gray-400 mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          ></path>
                        </svg>
                        <span class="text-sm text-gray-600">
                          <span
                            class="font-medium text-green-600 hover:text-green-500"
                            >Click to upload</span
                          >
                          or drag and drop
                        </span>
                        <p class="text-xs text-gray-500 mt-1">
                          PNG, JPG, GIF up to 5MB
                        </p>
                      </div>
                    </label>
                  </div>

                  <!-- Image Preview -->
                  <div v-if="feedbackForm.image" class="relative">
                    <div class="bg-gray-100 rounded-lg p-4">
                      <div class="flex items-center space-x-3">
                        <img
                          :src="feedbackForm.image.preview"
                          alt="Preview"
                          class="w-16 h-16 object-cover rounded-lg border border-gray-300"
                        />
                        <div class="flex-1">
                          <p class="text-sm font-medium text-gray-900">
                            {{ feedbackForm.image.name }}
                          </p>
                          <p class="text-xs text-gray-500">
                            {{ formatFileSize(feedbackForm.image.size) }}
                          </p>
                        </div>
                        <button
                          @click="removeImage"
                          type="button"
                          class="text-red-500 hover:text-red-700 transition-colors duration-200"
                          title="Remove image"
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
                              d="M6 18L18 6M6 6l12 12"
                            ></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="w-full bg-green-600 text-white py-3 rounded-lg font-thin hover:bg-green-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl cursor-pointer"
              >
                <span
                  v-if="isSubmitting"
                  class="loading loading-spinner loading-sm mr-2"
                ></span>
                <span v-if="isSubmitting" class="animate-pulse"
                  >Sending...</span
                >
                <span v-else>Send Message</span>
              </button>
            </form>

            <!-- Success/Error Messages -->
            <div
              v-if="feedbackMessage.show"
              :class="[
                'mt-4 p-4 rounded-lg',
                feedbackMessage.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-100 text-red-800 border border-red-200',
              ]"
            >
              {{ feedbackMessage.text }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-orange-500 text-white py-12">
      <div class="container mx-auto px-6">
        <div class="flex flex-col md:flex-row justify-between items-center">
          <div class="flex space-x-6 mb-4 md:mb-0">
            <a href="#" class="hover:text-green-200 transition-colors"
              >PRIVACY POLICY</a
            >
            <a href="#" class="hover:text-green-200 transition-colors"
              >PRIVACY POLICY</a
            >
            <a href="#" class="hover:text-green-200 transition-colors"
              >CONTACT US</a
            >
          </div>
          <div class="text-center md:text-right">
            <p class="text-sm">
              © 2025 COUNTRYSIDE STEAKHOUSE. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
  import { useRouter } from 'vue-router';
  import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
  import FoodpandaOrderModal from './FoodpandaOrderModal.vue';
  import GrabfoodOrderModal from './GrabfoodOrderModal.vue';
  import feedbackService from '../../services/feedbackService.js';

  const router = useRouter();
  const isScrolled = ref(false);
  const currentHeroIndex = ref(0);

  // Reels carousel state
  const currentReelIndex = ref(0);
  const videoPlayer = ref(null);

  // Video play/pause state
  const isHeroVideoPlaying = ref(true);
  const isDeliveryVideoPlaying = ref(true);

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

  // Helper functions
  const getReelTitle = (index) => {
    return reels[index]?.title || `Reel ${index + 1}`;
  };

  const getReelDescription = (index) => {
    return reels[index]?.description || 'Experience Countryside moments';
  };

  // Reels carousel functions
  const playReel = (index) => {
    currentReelIndex.value = index;
    if (videoPlayer.value) {
      videoPlayer.value.load();
      videoPlayer.value.play();
      isHeroVideoPlaying.value = true;
    }
    // Pause auto-scroll when user manually navigates
    pauseReelsAutoScroll();
    // Resume auto-scroll after 10 seconds of inactivity
    setTimeout(resumeReelsAutoScroll, 10000);
  };

  const nextReel = () => {
    currentReelIndex.value = (currentReelIndex.value + 1) % reels.length;
    if (videoPlayer.value) {
      videoPlayer.value.load();
      videoPlayer.value.play();
      isHeroVideoPlaying.value = true;
    }
    // Pause auto-scroll when user manually navigates
    pauseReelsAutoScroll();
    // Resume auto-scroll after 10 seconds of inactivity
    setTimeout(resumeReelsAutoScroll, 10000);
  };

  const previousReel = () => {
    currentReelIndex.value =
      currentReelIndex.value === 0
        ? reels.length - 1
        : currentReelIndex.value - 1;
    if (videoPlayer.value) {
      videoPlayer.value.load();
      videoPlayer.value.play();
      isHeroVideoPlaying.value = true;
    }
    // Pause auto-scroll when user manually navigates
    pauseReelsAutoScroll();
    // Resume auto-scroll after 10 seconds of inactivity
    setTimeout(resumeReelsAutoScroll, 10000);
  };

  // Video play/pause toggle methods
  const toggleHeroVideo = () => {
    if (videoPlayer.value) {
      if (isHeroVideoPlaying.value) {
        videoPlayer.value.pause();
        isHeroVideoPlaying.value = false;
      } else {
        videoPlayer.value.play();
        isHeroVideoPlaying.value = true;
      }
    }
  };

  const toggleDeliveryVideo = () => {
    const deliveryVideo =
      document.querySelector('#deliveryVideo') ||
      document.querySelector('video[ref="deliveryVideo"]');
    if (deliveryVideo) {
      if (isDeliveryVideoPlaying.value) {
        deliveryVideo.pause();
        isDeliveryVideoPlaying.value = false;
      } else {
        deliveryVideo.play();
        isDeliveryVideoPlaying.value = true;
      }
    }
  };

  // Modal state
  const isFoodpandaModalOpen = ref(false);
  const isGrabfoodModalOpen = ref(false);

  // Template refs
  const imageInput = ref(null);

  // Feedback form state
  const feedbackForm = ref({
    name: '',
    email: '',
    phone: '',
    rating: 0,
    message: '',
    image: null,
  });

  const hoveredRating = ref(0);
  const isSubmitting = ref(false);
  const feedbackMessage = ref({
    show: false,
    type: '',
    text: '',
  });

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

  const handleScroll = () => {
    isScrolled.value = window.scrollY > 50;
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
    reelsAutoScrollInterval = setInterval(() => {
      nextReel();
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

    // Add video event listeners after component is mounted
    nextTick(() => {
      if (videoPlayer.value) {
        videoPlayer.value.addEventListener('play', () => {
          isHeroVideoPlaying.value = true;
        });
        videoPlayer.value.addEventListener('pause', () => {
          isHeroVideoPlaying.value = false;
        });
      }
    });
  });

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
    stopAutoScroll();
    stopReelsAutoScroll();
  });

  const goToLogin = () => {
    router.push('/login');
  };

  // Smooth scroll to home section
  const scrollToHome = () => {
    const homeSection = document.getElementById('home');
    if (homeSection) {
      homeSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  // Modal functions
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

  // Feedback submission method
  const submitFeedback = async () => {
    if (
      !feedbackForm.value.name ||
      !feedbackForm.value.email ||
      !feedbackForm.value.message
    ) {
      showFeedbackMessage('error', 'Please fill in all required fields.');
      return;
    }

    if (!feedbackForm.value.image || !feedbackForm.value.image.file) {
      showFeedbackMessage(
        'error',
        'Please upload an image of your food experience.'
      );
      return;
    }

    isSubmitting.value = true;
    feedbackMessage.value.show = false;

    try {
      // Create FormData for multipart/form-data submission
      const formData = new FormData();
      formData.append('name', feedbackForm.value.name);
      formData.append('email', feedbackForm.value.email);
      formData.append('phone', feedbackForm.value.phone || '');
      formData.append('rating', feedbackForm.value.rating || '');
      formData.append('message', feedbackForm.value.message);

      // Add image if selected
      if (feedbackForm.value.image && feedbackForm.value.image.file) {
        formData.append('image', feedbackForm.value.image.file);
      }

      const response = await feedbackService.submitFeedback(formData);

      if (response.success) {
        showFeedbackMessage('success', response.message);
        // Reset form
        feedbackForm.value = {
          name: '',
          email: '',
          phone: '',
          rating: 0,
          message: '',
          image: null,
        };
        // Reset file input
        if (imageInput.value) {
          imageInput.value.value = '';
        }
      } else {
        showFeedbackMessage(
          'error',
          response.message || 'Failed to submit feedback.'
        );
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      const errorMessage =
        error.response?.data?.message ||
        'Failed to submit feedback. Please try again.';
      showFeedbackMessage('error', errorMessage);
    } finally {
      isSubmitting.value = false;
    }
  };

  const showFeedbackMessage = (type, text) => {
    feedbackMessage.value = {
      show: true,
      type,
      text,
    };

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        feedbackMessage.value.show = false;
      }, 5000);
    }
  };

  // Enhanced rating method with animation
  const setRating = (rating) => {
    feedbackForm.value.rating = rating;
    // Add a subtle bounce effect
    const stars = document.querySelectorAll('.star-rating svg');
    stars.forEach((star, index) => {
      if (index < rating) {
        star.style.animation = 'starBounce 0.3s ease-out';
        setTimeout(() => {
          star.style.animation = '';
        }, 300);
      }
    });
  };

  // Image upload handling
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showFeedbackMessage('error', 'Please select an image file.');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      showFeedbackMessage('error', 'Image size must be less than 5MB.');
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      feedbackForm.value.image = {
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        preview: e.target.result,
      };
    };
    reader.readAsDataURL(file);
  };

  // Remove uploaded image
  const removeImage = () => {
    feedbackForm.value.image = null;
    // Reset file input
    if (imageInput.value) {
      imageInput.value.value = '';
    }
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  // Menu Categories and Items
  const menuCategories = [
    'All',
    'Sizzling Plates',
    'Steaks',
    'Breakfast',
    'Sides',
    'Beverages',
  ];

  const selectedCategory = ref('All');

  const menuItems = [
    // Sizzling Plates
    {
      name: 'Sizzling Tenderloin Steak',
      description: 'Tender beef served on a hot sizzling plate',
      price: 299.99,
      category: 'Sizzling Plates',
      image: '/src/assets/crm/Sizzling Tenderloin Steak.png',
    },
    {
      name: 'Sizzling T-Bone Steak',
      description: 'Classic T-Bone steak with signature sizzle',
      price: 349.99,
      category: 'Sizzling Plates',
      image: '/src/assets/crm/Sizzling T-Bone Steak1.png',
    },
    {
      name: 'Sizzling Porksteak',
      description: 'Juicy pork steak with special marinade',
      price: 249.99,
      category: 'Sizzling Plates',
      image: '/src/assets/crm/Sizzling Picture.png',
    },

    // Steaks
    {
      name: 'Ribeye Steak',
      description: 'Premium cut ribeye, perfectly grilled',
      price: 499.99,
      category: 'Steaks',
      image: '/src/assets/crm/T-Bone Steak.png',
    },

    // Breakfast
    {
      name: 'Tapsilog',
      description: 'Traditional Filipino breakfast with tapa',
      price: 199.99,
      category: 'Breakfast',
      image: '/src/assets/crm/Silog Food.png',
    },

    // Sides
    {
      name: 'Chicken Wings',
      description: 'Crispy and flavorful chicken wings',
      price: 179.99,
      category: 'Sides',
      image: '/src/assets/crm/Menu 1.png',
    },

    // Beverages
    {
      name: 'Countryside Special Drink',
      description: 'House special refreshing beverage',
      price: 99.99,
      category: 'Beverages',
      image: '/src/assets/crm/Menu 2.png',
    },
  ];

  // Computed property to filter menu items
  const filteredMenuItems = computed(() => {
    if (selectedCategory.value === 'All') {
      return menuItems;
    }
    return menuItems.filter((item) => item.category === selectedCategory.value);
  });

  // Signature dishes for the teaser
  const signatureDishes = [
    {
      name: 'Sizzling Tenderloin Steak',
      description: 'Tender beef served on a hot sizzling plate',
      price: 299.99,
      image: '/src/assets/crm/Sizzling Tenderloin Steak.png',
    },
    {
      name: 'Sizzling T-Bone Steak',
      description: 'Classic T-Bone steak with signature sizzle',
      price: 349.99,
      image: '/src/assets/crm/Sizzling T-Bone Steak1.png',
    },
    {
      name: 'Sizzling Porksteak',
      description: 'Juicy pork steak with special marinade',
      price: 249.99,
      image: '/src/assets/crm/Sizzling Picture.png',
    },
    {
      name: 'Ribeye Steak',
      description: 'Premium cut ribeye, perfectly grilled',
      price: 499.99,
      image: '/src/assets/crm/T-Bone Steak.png',
    },
  ];
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
    animation: fadeInUp 0.6s ease-out;
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
    outline: 2px solid #f97316;
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
</style>
