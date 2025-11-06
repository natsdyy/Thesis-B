<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 overflow-y-auto"
    style="z-index: 9999"
  >
    <!-- Enhanced Backdrop with Blur -->
    <div
      class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
      @click="closeModal"
    ></div>

    <!-- Modal -->
    <div
      class="flex min-h-full items-center justify-center p-2 sm:p-4 relative"
    >
      <!-- Left Navigation Button -->
      <button
        v-if="announcements.length > 1"
        @click.stop="previousAnnouncement"
        class="absolute left-2 sm:left-4 md:left-8 z-10 p-2 sm:p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
        style="color: var(--color-primaryColor)"
        aria-label="Previous announcement"
      >
        <font-awesome-icon
          icon="fa-solid fa-chevron-left"
          class="w-4 h-4 sm:w-5 sm:h-5"
        />
      </button>

      <!-- Right Navigation Button -->
      <button
        v-if="announcements.length > 1"
        @click.stop="nextAnnouncement"
        class="absolute right-2 sm:right-4 md:right-8 z-10 p-2 sm:p-3 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110"
        style="color: var(--color-primaryColor)"
        aria-label="Next announcement"
      >
        <font-awesome-icon
          icon="fa-solid fa-chevron-right"
          class="w-4 h-4 sm:w-5 sm:h-5"
        />
      </button>

      <div
        class="relative w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-2xl transform transition-all duration-300 animate-in slide-in-from-bottom-4 fade-in-0 zoom-in-95 max-h-[95vh] overflow-y-auto"
      >
        <!-- Header -->
        <div
          class="text-white px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl sm:rounded-t-2xl shadow-lg sticky top-0 z-10"
          style="
            background: linear-gradient(
              to right,
              var(--color-primaryColor),
              var(--color-primaryColor)
            );
          "
        >
          <div class="flex items-center justify-between">
            <div
              class="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0"
            >
              <div
                class="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0"
              >
                <font-awesome-icon
                  icon="fa-solid fa-bullhorn"
                  class="w-4 h-4 sm:w-5 sm:h-5 text-white"
                />
              </div>
              <h2 class="text-lg sm:text-xl lg:text-2xl font-bold truncate">
                {{ announcement?.title || 'Announcement' }}
              </h2>
            </div>
            <button
              @click="closeModal"
              class="text-white hover:text-gray-200 transition-colors p-1.5 sm:p-2 hover:bg-white/10 rounded-full flex-shrink-0 ml-2 cursor-pointer"
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
          <p
            v-if="announcement?.subtitle"
            class="mt-2 text-xs sm:text-sm opacity-90"
            style="color: rgba(255, 255, 255, 0.9)"
          >
            {{ announcement.subtitle }}
          </p>
        </div>

        <!-- Content -->
        <div class="p-4 sm:p-6">
          <!-- Empty state placeholder when there is no announcement -->
          <div
            v-if="!announcement"
            class="mb-4 sm:mb-6 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl p-5 sm:p-6 text-center text-gray-600"
          >
            <div class="flex items-center justify-center mb-3">
              <div
                class="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center"
              >
                <font-awesome-icon
                  icon="fa-solid fa-bullhorn"
                  class="w-5 h-5 text-gray-500"
                />
              </div>
            </div>
            <p class="text-sm sm:text-base font-medium">
              No announcements at this time.
            </p>
          </div>

          <!-- Promotion Details - Above -->
          <div
            v-if="
              announcement?.promo_details &&
              announcement?.promo_position === 'above'
            "
            class="mb-4 sm:mb-6 bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-lg sm:rounded-xl p-4 sm:p-5"
          >
            <div class="flex items-start space-x-3">
              <div
                class="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0"
              >
                <font-awesome-icon
                  icon="fa-solid fa-tag"
                  class="w-4 h-4 sm:w-5 sm:h-5 text-white"
                />
              </div>
              <div class="flex-1">
                <h3 class="font-bold text-orange-800 text-sm sm:text-base mb-2">
                  Promotion Details
                </h3>
                <div
                  class="text-orange-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line"
                >
                  {{ announcement.promo_details }}
                </div>
              </div>
            </div>
          </div>

          <!-- Content Display in Order -->
          <template v-for="(item, index) in getContentOrder()" :key="item">
            <!-- Description -->
            <div
              v-if="item === 'description' && announcement?.description"
              class="mb-4 sm:mb-6 text-gray-700 text-sm sm:text-base leading-relaxed prose prose-sm sm:prose-base max-w-none"
              v-html="announcement.description"
            ></div>

            <!-- Images - Single -->
            <div
              v-if="
                item === 'images' &&
                getAnnouncementImages().length > 0 &&
                announcement?.image_display_type === 'single'
              "
              class="mb-4 sm:mb-6 rounded-lg sm:rounded-xl overflow-hidden"
            >
              <img
                :src="getAnnouncementImages()[0]"
                :alt="announcement.title"
                class="w-full h-auto rounded-lg sm:rounded-xl"
                style="max-height: none; object-fit: contain"
              />
            </div>

            <!-- Images - Carousel -->
            <div
              v-if="
                item === 'images' &&
                getAnnouncementImages().length > 1 &&
                announcement?.image_display_type === 'carousel'
              "
              class="mb-4 sm:mb-6 rounded-lg sm:rounded-xl overflow-hidden relative"
            >
              <div class="relative w-full">
                <img
                  v-for="(image, imgIndex) in getAnnouncementImages()"
                  :key="imgIndex"
                  :src="image"
                  :alt="`${announcement.title} ${imgIndex + 1}`"
                  v-show="currentImageIndex === imgIndex"
                  class="w-full h-auto rounded-lg sm:rounded-xl"
                  style="max-height: none; object-fit: contain"
                  @error="handleImageError"
                />
                <div
                  v-if="getAnnouncementImages().length > 1"
                  class="absolute inset-0 flex items-center justify-between p-2 sm:p-4"
                >
                  <button
                    @click.stop="previousImage"
                    class="btn btn-circle btn-sm sm:btn-md bg-black/50 text-white border-none hover:bg-black/70"
                    :disabled="currentImageIndex === 0"
                  >
                    <font-awesome-icon
                      icon="fa-solid fa-chevron-left"
                      class="w-4 h-4"
                    />
                  </button>
                  <button
                    @click.stop="nextImage"
                    class="btn btn-circle btn-sm sm:btn-md bg-black/50 text-white border-none hover:bg-black/70"
                    :disabled="
                      currentImageIndex === getAnnouncementImages().length - 1
                    "
                  >
                    <font-awesome-icon
                      icon="fa-solid fa-chevron-right"
                      class="w-4 h-4"
                    />
                  </button>
                </div>
                <div
                  v-if="getAnnouncementImages().length > 1"
                  class="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1 sm:gap-2"
                >
                  <div
                    v-for="(image, imgIndex) in getAnnouncementImages()"
                    :key="imgIndex"
                    class="w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all"
                    :class="
                      currentImageIndex === imgIndex
                        ? 'bg-white'
                        : 'bg-white/50'
                    "
                  ></div>
                </div>
              </div>
            </div>

            <!-- Video -->
            <div
              v-if="item === 'video' && announcement?.video_url"
              class="mb-4 sm:mb-6 rounded-lg sm:rounded-xl overflow-hidden"
            >
              <div class="relative w-full" style="padding-bottom: 56.25%">
                <iframe
                  v-if="
                    isYouTubeUrl(announcement.video_url) ||
                    isVimeoUrl(announcement.video_url)
                  "
                  :src="getEmbedUrl(announcement.video_url)"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowfullscreen
                  class="absolute top-0 left-0 w-full h-full rounded-lg sm:rounded-xl"
                ></iframe>
                <video
                  v-else
                  :src="announcement.video_url"
                  controls
                  class="absolute top-0 left-0 w-full h-full rounded-lg sm:rounded-xl object-cover"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </template>

          <!-- Announcement Content -->
          <div class="space-y-4 sm:space-y-6">
            <!-- Promotion Details - Below -->
            <div
              v-if="
                announcement?.promo_details &&
                announcement?.promo_position !== 'above'
              "
              class="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-lg sm:rounded-xl p-4 sm:p-5"
            >
              <div class="flex items-start space-x-3">
                <div
                  class="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-tag"
                    class="w-4 h-4 sm:w-5 sm:h-5 text-white"
                  />
                </div>
                <div class="flex-1">
                  <h3
                    class="font-bold text-orange-800 text-sm sm:text-base mb-2"
                  >
                    Promotion Details
                  </h3>
                  <div
                    class="text-orange-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line"
                  >
                    {{ announcement.promo_details }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Valid Until -->
            <div
              v-if="announcement?.valid_until"
              class="flex items-center space-x-2 text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2"
            >
              <font-awesome-icon
                icon="fa-solid fa-clock"
                class="w-4 h-4"
                style="color: var(--color-primaryColor)"
              />
              <span class="font-medium">Valid until:</span>
              <span>{{ formatDate(announcement.valid_until) }}</span>
            </div>

            <!-- Action Button -->
            <div v-if="announcement" class="pt-2">
              <!-- Hiring: open Job Positions modal instead of external link -->
              <button
                v-if="isHiringAnnouncement(announcement)"
                @click="openJobPositionsModal"
                class="btn btn-sm sm:btn-md group flex items-center space-x-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                style="background-color: var(--color-primaryColor)"
              >
                <span>{{ announcement.action_text || 'Apply Now' }}</span>
                <font-awesome-icon
                  icon="fa-solid fa-arrow-right"
                  class="w-4 h-4 group-hover:translate-x-1 transition-transform"
                />
              </button>

              <!-- Default behavior: follow action link if provided -->
              <a
                v-else-if="announcement?.action_link"
                :href="announcement.action_link"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-sm sm:btn-md group flex items-center space-x-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                style="background-color: var(--color-primaryColor)"
              >
                <span>{{ announcement.action_text || 'Learn More' }}</span>
                <font-awesome-icon
                  icon="fa-solid fa-arrow-right"
                  class="w-4 h-4 group-hover:translate-x-1 transition-transform"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, onUnmounted } from 'vue';

  const props = defineProps({
    isOpen: {
      type: Boolean,
      default: false,
    },
    announcements: {
      type: Array,
      default: () => [],
    },
  });

  const emit = defineEmits(['close', 'open-job-positions']);

  const currentIndex = ref(0);
  const currentImageIndex = ref(0);
  let carouselAutoNextInterval = null;
  let announcementAutoNextInterval = null;

  // Debug logging
  watch(
    () => props.isOpen,
    (newVal) => {
      console.log('AnnouncementModal isOpen prop changed:', newVal);
      console.log('Announcements prop:', props.announcements);
    },
    { immediate: true }
  );

  const announcement = computed(() => {
    return props.announcements[currentIndex.value] || null;
  });

  watch(
    () => props.isOpen,
    (newVal) => {
      if (newVal) {
        currentIndex.value = 0;
        currentImageIndex.value = 0;
        // Start carousel auto-advance if there are multiple images
        startCarouselAutoNext();
        // Start announcement auto-advance if there are multiple announcements
        startAnnouncementAutoNext();
      } else {
        // Stop carousel auto-advance when modal closes
        stopCarouselAutoNext();
        // Stop announcement auto-advance when modal closes
        stopAnnouncementAutoNext();
      }
    }
  );

  watch(
    () => props.announcements,
    () => {
      if (props.announcements.length > 0) {
        currentIndex.value = 0;
        currentImageIndex.value = 0;
        // Restart carousel auto-advance when announcements change
        if (props.isOpen) {
          startCarouselAutoNext();
          startAnnouncementAutoNext();
        }
      }
    }
  );

  watch(
    () => announcement.value,
    () => {
      // When announcement data changes, restart carousel auto-advance
      currentImageIndex.value = 0;
      if (props.isOpen) {
        startCarouselAutoNext();
        startAnnouncementAutoNext();
      }
    }
  );

  const closeModal = () => {
    emit('close');
  };

  const openJobPositionsModal = () => {
    emit('open-job-positions');
  };

  const previousAnnouncement = () => {
    if (currentIndex.value > 0) {
      currentIndex.value--;
    } else {
      // Loop to last announcement
      currentIndex.value = props.announcements.length - 1;
    }
    currentImageIndex.value = 0;
    // Restart carousel auto-advance for new announcement
    startCarouselAutoNext();
    // Reset announcement auto-advance timer
    resetAnnouncementAutoNext();
  };

  const nextAnnouncement = () => {
    if (currentIndex.value < props.announcements.length - 1) {
      currentIndex.value++;
    } else {
      // Loop to first announcement
      currentIndex.value = 0;
    }
    currentImageIndex.value = 0;
    // Restart carousel auto-advance for new announcement
    startCarouselAutoNext();
    // Reset announcement auto-advance timer
    resetAnnouncementAutoNext();
  };

  const getAnnouncementImages = () => {
    if (!announcement.value) return [];

    // Try to get images array
    if (announcement.value.images) {
      try {
        const images =
          typeof announcement.value.images === 'string'
            ? JSON.parse(announcement.value.images)
            : announcement.value.images;
        if (Array.isArray(images) && images.length > 0) {
          return images;
        }
      } catch {
        // Invalid JSON, fall through
      }
    }

    // Fallback to image_url
    if (announcement.value.image_url) {
      return [announcement.value.image_url];
    }

    return [];
  };

  const nextImage = () => {
    const images = getAnnouncementImages();
    if (currentImageIndex.value < images.length - 1) {
      currentImageIndex.value++;
    } else {
      currentImageIndex.value = 0;
    }
    // Reset auto-advance timer when manually navigating
    resetCarouselAutoNext();
  };

  const previousImage = () => {
    const images = getAnnouncementImages();
    if (currentImageIndex.value > 0) {
      currentImageIndex.value--;
    } else {
      currentImageIndex.value = images.length - 1;
    }
    // Reset auto-advance timer when manually navigating
    resetCarouselAutoNext();
  };

  const startCarouselAutoNext = () => {
    // Clear any existing interval
    stopCarouselAutoNext();

    // Check if current announcement has multiple images in carousel mode
    const currentAnnouncement = props.announcements[currentIndex.value];
    if (
      currentAnnouncement &&
      currentAnnouncement.image_display_type === 'carousel'
    ) {
      const images = getAnnouncementImages();
      if (images.length > 1) {
        // Auto-advance every 5 seconds
        carouselAutoNextInterval = setInterval(() => {
          const images = getAnnouncementImages();
          if (images.length > 1) {
            if (currentImageIndex.value < images.length - 1) {
              currentImageIndex.value++;
            } else {
              currentImageIndex.value = 0;
            }
          }
        }, 5000);
      }
    }
  };

  const stopCarouselAutoNext = () => {
    if (carouselAutoNextInterval) {
      clearInterval(carouselAutoNextInterval);
      carouselAutoNextInterval = null;
    }
  };

  const resetCarouselAutoNext = () => {
    stopCarouselAutoNext();
    if (props.isOpen) {
      startCarouselAutoNext();
    }
  };

  const startAnnouncementAutoNext = () => {
    // Clear any existing interval
    stopAnnouncementAutoNext();

    // Only auto-advance if there are multiple announcements
    if (props.announcements.length > 1) {
      // Auto-advance to next announcement every 8 seconds
      announcementAutoNextInterval = setInterval(() => {
        if (currentIndex.value < props.announcements.length - 1) {
          currentIndex.value++;
        } else {
          // Loop back to first announcement
          currentIndex.value = 0;
        }
        // Reset image index when switching announcements
        currentImageIndex.value = 0;
        // Restart carousel auto-advance for new announcement
        startCarouselAutoNext();
      }, 8000); // 8 seconds
    }
  };

  const stopAnnouncementAutoNext = () => {
    if (announcementAutoNextInterval) {
      clearInterval(announcementAutoNextInterval);
      announcementAutoNextInterval = null;
    }
  };

  const resetAnnouncementAutoNext = () => {
    stopAnnouncementAutoNext();
    if (props.isOpen) {
      startAnnouncementAutoNext();
    }
  };

  const handleImageError = (event) => {
    event.target.style.display = 'none';
  };

  const getContentOrder = () => {
    if (!announcement.value) return ['description', 'images', 'video'];

    // Try to get content_order from announcement
    if (announcement.value.content_order) {
      try {
        const order =
          typeof announcement.value.content_order === 'string'
            ? JSON.parse(announcement.value.content_order)
            : announcement.value.content_order;
        if (Array.isArray(order) && order.length > 0) {
          return order;
        }
      } catch {
        // Invalid JSON, fall through
      }
    }

    // Default order based on what's available
    const defaultOrder = ['description', 'images', 'video'];
    return defaultOrder.filter((item) => {
      if (item === 'description') return !!announcement.value?.description;
      if (item === 'images') return getAnnouncementImages().length > 0;
      if (item === 'video') return !!announcement.value?.video_url;
      return false;
    });
  };

  const isHiringAnnouncement = (a) => {
    if (!a) return false;
    const title = (a.title || '').toLowerCase();
    const subtitle = (a.subtitle || '').toLowerCase();
    const description = (a.description || '').toLowerCase();
    // Common ways to mark hiring posts
    if (
      a.type === 'hiring' ||
      a.category === 'hiring' ||
      a.is_hiring === true ||
      a.action_link === 'job-positions'
    ) {
      return true;
    }
    // Heuristic: title/subtitle/description contains keywords
    const hiringKeywords = [
      'we are hiring',
      'hiring',
      'apply now',
      'recruitment',
      'job opening',
    ];
    return hiringKeywords.some(
      (kw) =>
        title.includes(kw) || subtitle.includes(kw) || description.includes(kw)
    );
  };

  // Cleanup on unmount
  onUnmounted(() => {
    stopCarouselAutoNext();
    stopAnnouncementAutoNext();
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return dateString;
    }
  };

  const isYouTubeUrl = (url) => {
    if (!url) return false;
    return /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/.test(
      url
    );
  };

  const isVimeoUrl = (url) => {
    if (!url) return false;
    return /vimeo\.com\/(?:.*\/)?(\d+)/.test(url);
  };

  const getEmbedUrl = (url) => {
    if (!url) return '';

    // YouTube
    if (isYouTubeUrl(url)) {
      const youtubeRegex =
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(youtubeRegex);
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }

    // Vimeo
    if (isVimeoUrl(url)) {
      const vimeoRegex = /vimeo\.com\/(?:.*\/)?(\d+)/;
      const match = url.match(vimeoRegex);
      if (match && match[1]) {
        return `https://player.vimeo.com/video/${match[1]}`;
      }
    }

    // Return original URL if not YouTube or Vimeo (for direct video files)
    return url;
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
  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
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

  /* Prose styling for HTML content */
  :deep(.prose) {
    color: #374151;
  }

  :deep(.prose p) {
    margin-top: 0.75em;
    margin-bottom: 0.75em;
  }

  :deep(.prose h1),
  :deep(.prose h2),
  :deep(.prose h3) {
    font-weight: 700;
    margin-top: 1em;
    margin-bottom: 0.5em;
  }

  :deep(.prose strong) {
    font-weight: 600;
    color: #1f2937;
  }

  :deep(.prose a) {
    color: var(--color-primaryColor);
    text-decoration: underline;
  }

  :deep(.prose a:hover) {
    opacity: 0.8;
  }

  .hover-button:hover:not(:disabled) {
    color: var(--color-primaryColor) !important;
  }

  :deep(.prose ul),
  :deep(.prose ol) {
    margin-top: 0.75em;
    margin-bottom: 0.75em;
    padding-left: 1.5em;
  }

  :deep(.prose li) {
    margin-top: 0.25em;
    margin-bottom: 0.25em;
  }
</style>
