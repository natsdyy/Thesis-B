<template>
  <div class="min-h-screen bg-gray-50 p-4 sm:p-6">
    <!-- Header -->
    <div class="mb-6 sm:mb-8">
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">
            Order Ratings Management
          </h1>
          <p class="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Manage customer order ratings and feedback
          </p>
        </div>
        <div class="flex items-center space-x-2 sm:space-x-4 flex-wrap">
          <!-- <button
            @click="verifyEmailService"
            class="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base"
          >
            <font-awesome-icon icon="fa-solid fa-envelope" class="w-4 h-4" />
            <span class="hidden sm:inline">Verify Email</span>
            <span class="sm:hidden">Verify</span>
          </button> -->
          <button
            @click="refreshData"
            :disabled="loading"
            class="btn bg-gray-100 hover:bg-gray-200 font-thin sm:space-x-2 text-sm sm:text-base btn-sm"
          >
            <font-awesome-icon
              icon="fa-solid fa-refresh"
              :class="{ 'animate-spin': loading }"
              class="w-4 h-4"
            />
            <span class="hidden sm:inline">Refresh</span>
            <span class="sm:hidden">Reload</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8"
    >
      <div class="bg-white rounded-lg shadow p-4 sm:p-6">
        <div class="flex items-center">
          <div
            class="p-2 sm:p-3 rounded-full bg-primaryColor/10 text-primaryColor flex-shrink-0"
          >
            <font-awesome-icon
              icon="fa-solid fa-comments"
              class="w-5 h-5 sm:w-6 sm:h-6"
            />
          </div>
          <div class="ml-3 sm:ml-4 min-w-0 flex-1">
            <p class="text-xs sm:text-sm font-medium text-gray-600">
              Total Ratings
            </p>
            <p class="text-xl sm:text-2xl font-bold text-gray-900">
              {{ stats.total_ratings || 0 }}
            </p>
            <p class="text-xs text-success">
              {{ stats.positive_ratings || 0 }} positive
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4 sm:p-6">
        <div class="flex items-center">
          <div
            class="p-2 sm:p-3 rounded-full bg-yellow-100 text-yellow-600 flex-shrink-0"
          >
            <font-awesome-icon
              icon="fa-solid fa-star"
              class="w-5 h-5 sm:w-6 sm:h-6"
            />
          </div>
          <div class="ml-3 sm:ml-4 min-w-0 flex-1">
            <p class="text-xs sm:text-sm font-medium text-gray-600">
              Avg Rating
            </p>
            <p class="text-xl sm:text-2xl font-bold text-gray-900">
              {{ (stats.average_rating || 0).toFixed(1) }}
            </p>
            <p class="text-xs text-success">
              {{ stats.positive_ratings || 0 }} positive
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4 sm:p-6">
        <div class="flex items-center">
          <div
            class="p-2 sm:p-3 rounded-full bg-green-100 text-green-600 flex-shrink-0"
          >
            <font-awesome-icon
              icon="fa-solid fa-thumbs-up"
              class="w-5 h-5 sm:w-6 sm:h-6"
            />
          </div>
          <div class="ml-3 sm:ml-4 min-w-0 flex-1">
            <p class="text-xs sm:text-sm font-medium text-gray-600">
              Satisfaction
            </p>
            <p class="text-xl sm:text-2xl font-bold text-gray-900">
              {{ satisfactionRate }}%
            </p>
            <p class="text-xs text-success">Happy customers</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6">
      <div
        class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3"
      >
        <!-- Search Input -->
        <div class="flex-1">
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search order ratings..."
            class="w-full input input-bordered input-sm"
            @input="debouncedSearch"
          />
        </div>

        <!-- Status Filter -->
        <div class="w-full sm:w-auto">
          <select
            v-model="filters.status"
            class="select select-bordered select-sm w-full"
            @change="loadFeedback"
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <!-- Date Filter -->
        <div class="w-full sm:w-auto">
          <select
            v-model="selectedDatePeriod"
            class="select select-bordered select-sm w-full"
            @change="handleDatePeriodChange"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Month</option>
          </select>
        </div>

        <!-- Custom Month Picker (shown when custom is selected) -->
        <div v-if="selectedDatePeriod === 'custom'" class="w-full sm:w-auto">
          <input
            v-model="customMonth"
            type="month"
            class="input input-bordered input-sm w-full"
            @change="handleCustomMonthChange"
          />
        </div>

        <!-- Clear Filters Button -->
        <button
          @click="clearFilters"
          class="btn btn-outline btn-sm text-gray-500 hover:text-gray-700"
        >
          <font-awesome-icon icon="fa-solid fa-times" class="mr-1" />
          <span class="hidden sm:inline">Clear</span>
        </button>
      </div>
    </div>

    <!-- Feedback Cards -->
    <div class="space-y-6">
      <!-- View Toggle -->
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h3 class="text-lg font-medium text-gray-900">Order Ratings</h3>
          <div class="flex items-center space-x-2">
            <button
              @click="viewMode = 'cards'"
              :class="[
                'px-3 py-1 rounded-md text-sm font-medium transition-colors cusrsor-pointer',
                viewMode === 'cards'
                  ? 'bg-primaryColor/10 text-primaryColor'
                  : 'text-gray-500 hover:text-gray-700',
              ]"
            >
              <font-awesome-icon icon="fa-solid fa-th-large" class="mr-1" />
              Cards
            </button>
            <button
              @click="viewMode = 'list'"
              :class="[
                'px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer',
                viewMode === 'list'
                  ? 'bg-primaryColor/10 text-primaryColor'
                  : 'text-gray-500 hover:text-gray-700',
              ]"
            >
              <font-awesome-icon icon="fa-solid fa-list" class="mr-1" />
              List
            </button>
          </div>
        </div>
        <div class="text-sm text-gray-500">
          {{ pagination.total }} rating items
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div
          class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"
        ></div>
        <p class="mt-2 text-gray-600">Loading order ratings...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="feedback.length === 0" class="text-center py-12">
        <font-awesome-icon
          icon="fa-solid fa-comments"
          class="w-16 h-16 text-gray-400 mx-auto mb-4"
        />
        <h3 class="text-lg font-medium text-gray-900 mb-2">
          No order ratings found
        </h3>
        <p class="text-gray-500">
          Try adjusting your filters or check back later.
        </p>
      </div>

      <!-- Cards View -->
      <div
        v-else-if="viewMode === 'cards'"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
      >
        <div
          v-for="item in feedback"
          :key="item.id"
          :data-item-id="item.id"
          class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
        >
          <!-- Feedback Header -->
          <div class="p-4 sm:p-6 border-b border-gray-100">
            <div class="flex items-start justify-between mb-4">
              <div
                class="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0"
              >
                <div
                  class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primaryColor/10 flex items-center justify-center flex-shrink-0"
                >
                  <span
                    class="text-xs sm:text-sm font-medium text-primaryColor"
                  >
                    {{ item.customer_name.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="min-w-0 flex-1">
                  <h4
                    class="font-medium text-gray-900 text-sm sm:text-base truncate"
                  >
                    {{ item.customer_name }}
                  </h4>
                  <p class="text-xs sm:text-sm text-gray-500 truncate">
                    {{ item.customer_email }}
                  </p>
                </div>
              </div>
              <div
                class="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ml-2"
              >
                <span
                  :class="[
                    'px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium whitespace-nowrap',
                    getStatusColor(item.status),
                  ]"
                >
                  {{ item.status || 'New' }}
                </span>
              </div>
            </div>

            <!-- Rating -->
            <div
              v-if="item.overall_rating"
              class="flex items-center space-x-1 mb-3"
            >
              <div class="flex items-center">
                <font-awesome-icon
                  v-for="star in 5"
                  :key="star"
                  :icon="getStarIcon(star, item.overall_rating)"
                  :class="['w-4 h-4', getStarClass(star, item.overall_rating)]"
                />
              </div>
              <span class="text-sm text-gray-600 ml-2"
                >{{ item.overall_rating }}/5</span
              >
            </div>

            <!-- Order Info and Source Badge -->
            <div class="flex flex-wrap items-center gap-1 sm:gap-2 mb-2">
              <span
                class="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-primaryColor/10 text-primaryColor"
              >
                <font-awesome-icon
                  icon="fa-solid fa-receipt"
                  class="w-3 h-3 mr-1 flex-shrink-0"
                />
                <span class="hidden sm:inline">Order: </span
                >{{ item.order_number }}
              </span>
              <span
                class="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-neutralColor/10 text-neutralColor"
              >
                <font-awesome-icon
                  icon="fa-solid fa-tag"
                  class="w-3 h-3 mr-1 flex-shrink-0"
                />
                {{ item.source }}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-1 sm:gap-2">
              <span class="text-xs text-gray-500">{{
                formatDate(item.created_at)
              }}</span>
              <span v-if="item.branch_name" class="text-xs text-gray-500"
                >• {{ item.branch_name }}</span
              >
            </div>
          </div>

          <!-- Feedback Content -->
          <div class="p-4 sm:p-6">
            <p class="text-gray-700 mb-4 line-clamp-3 text-sm sm:text-base">
              {{ item.comments || 'No comments provided' }}
            </p>

            <!-- Image Preview -->
            <div v-if="item.image_filename" class="mb-4">
              <div class="relative">
                <img
                  :src="
                    formatImageUrl(
                      `/uploads/feedback-images/${item.image_filename}`
                    )
                  "
                  :alt="item.customer_name"
                  class="w-full h-24 sm:h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  @click="viewImage(item.image_filename)"
                  @error="handleImageError"
                  @load="handleImageLoad"
                />
                <!-- Loading placeholder -->
                <div
                  v-if="!imageLoaded[item.id]"
                  class="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center"
                >
                  <div
                    class="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"
                  ></div>
                </div>
                <!-- Error placeholder -->
                <div
                  v-if="imageErrors[item.id]"
                  class="absolute inset-0 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 text-sm"
                >
                  <div class="text-center">
                    <font-awesome-icon
                      icon="fa-solid fa-image"
                      class="w-6 h-6 mb-1 mx-auto"
                    />
                    <div>Image unavailable</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between">
              <div
                class="flex items-center space-x-1 sm:space-x-2 flex-1 min-w-0"
              >
                <button
                  @click="replyToFeedback(item.id)"
                  :disabled="item.status === 'replied'"
                  :class="[
                    'text-xs sm:text-sm font-medium flex items-center whitespace-nowrap cursor-pointer',
                    item.status === 'replied'
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-primaryColor hover:text-primaryColor',
                  ]"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-reply"
                    class="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0"
                  />
                  <span class="hidden sm:inline">{{
                    item.status === 'replied' ? 'Already Replied' : 'Reply'
                  }}</span>
                  <span class="sm:hidden">{{
                    item.status === 'replied' ? 'Done' : 'Reply'
                  }}</span>
                </button>
              </div>
              <button
                @click="archiveFeedback(item.id)"
                class="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0 ml-2 cursor-pointer"
              >
                <font-awesome-icon
                  icon="fa-solid fa-archive"
                  class="w-3 h-3 sm:w-4 sm:h-4"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-else class="bg-white rounded-lg shadow overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Customer
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Rating
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Order
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Comments
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="item in feedback"
                :key="item.id"
                class="hover:bg-gray-50"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div
                        class="h-10 w-10 rounded-full bg-primaryColor/10 flex items-center justify-center"
                      >
                        <span class="text-sm font-medium text-primaryColor">
                          {{ item.customer_name.charAt(0).toUpperCase() }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">
                        {{ item.customer_name }}
                      </div>
                      <div class="text-sm text-gray-500">
                        {{ item.customer_email }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="item.overall_rating" class="flex items-center">
                    <font-awesome-icon
                      v-for="star in 5"
                      :key="star"
                      :icon="getStarIcon(star, item.overall_rating)"
                      :class="[
                        'w-4 h-4',
                        getStarClass(star, item.overall_rating),
                      ]"
                    />
                    <span class="text-sm text-gray-600 ml-2">{{
                      item.overall_rating
                    }}</span>
                  </div>
                  <span v-else class="text-gray-400">No rating</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ item.order_number }}
                  </div>
                  <div v-if="item.branch_name" class="text-xs text-gray-500">
                    {{ item.branch_name }}
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-900 max-w-xs truncate">
                    {{ item.comments || 'No comments' }}
                  </div>
                  <div
                    v-if="item.image_filename"
                    class="text-xs text-primaryColor mt-1"
                  >
                    <font-awesome-icon icon="fa-solid fa-image" class="mr-1" />
                    Has image
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(item.created_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex space-x-2">
                    <button
                      @click="viewFeedback(item.id)"
                      class="text-primaryColor hover:text-primaryColor"
                    >
                      <font-awesome-icon icon="fa-solid fa-eye" />
                    </button>
                    <button
                      @click="replyToFeedback(item.id)"
                      :disabled="item.status === 'replied'"
                      :class="[
                        item.status === 'replied'
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-primaryColor hover:text-primaryColor',
                      ]"
                      :title="
                        item.status === 'replied'
                          ? 'Already replied'
                          : 'Reply to feedback'
                      "
                    >
                      <font-awesome-icon icon="fa-solid fa-reply" />
                    </button>
                    <button
                      @click="archiveFeedback(item.id)"
                      class="text-gray-400 hover:text-gray-600"
                    >
                      <font-awesome-icon icon="fa-solid fa-archive" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="pagination.total > pagination.limit"
        class="bg-white rounded-lg shadow p-4"
      >
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-700">
            Showing {{ pagination.offset + 1 }} to
            {{
              Math.min(pagination.offset + pagination.limit, pagination.total)
            }}
            of {{ pagination.total }} results
          </div>
          <div class="flex space-x-2">
            <button
              @click="previousPage"
              :disabled="pagination.offset === 0"
              class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              @click="nextPage"
              :disabled="
                pagination.offset + pagination.limit >= pagination.total
              "
              class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Image View Modal -->
    <div
      v-if="showImageModal"
      class="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center"
    >
      <div class="relative max-w-4xl max-h-full p-4">
        <button
          @click="showImageModal = false"
          class="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
        >
          <font-awesome-icon icon="fa-solid fa-times" class="w-6 h-6" />
        </button>
        <img
          :src="selectedImage"
          alt="Feedback Image"
          class="max-w-full max-h-full object-contain rounded-lg"
          @error="handleModalImageError"
        />
      </div>
    </div>

    <!-- Reply Modal -->
    <div
      v-if="showReplyModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-2 sm:p-4 backdrop-blur-sm"
      @click="closeModalOnBackdrop"
    >
      <div
        class="relative mx-auto w-full max-w-2xl shadow-lg rounded-md bg-white max-h-[95vh] overflow-y-auto"
        @click.stop
      >
        <div class="p-4 sm:p-6">
          <div class="flex items-center justify-between mb-4 sm:mb-6">
            <h3 class="text-base sm:text-lg font-medium text-gray-900">
              Reply to Feedback
            </h3>
            <button
              @click="showReplyModal = false"
              class="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
            >
              <font-awesome-icon
                icon="fa-solid fa-times"
                class="w-5 h-5 sm:w-6 sm:h-6"
              />
            </button>
          </div>

          <div v-if="selectedFeedback" class="space-y-4 sm:space-y-6">
            <!-- Original Feedback -->
            <div
              class="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200"
            >
              <div
                class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4"
              >
                <div class="flex-1 min-w-0">
                  <h4
                    class="text-base sm:text-lg font-semibold text-gray-900 mb-2"
                  >
                    Customer Feedback Details
                  </h4>
                  <div
                    class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3"
                  >
                    <div class="flex items-center space-x-2 min-w-0 flex-1">
                      <div
                        class="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0"
                      >
                        <span class="text-sm font-medium text-green-600">
                          {{
                            selectedFeedback.customer_name
                              .charAt(0)
                              .toUpperCase()
                          }}
                        </span>
                      </div>
                      <div class="min-w-0 flex-1">
                        <span
                          class="font-medium text-gray-900 block truncate"
                          >{{ selectedFeedback.customer_name }}</span
                        >
                        <div class="text-sm text-gray-500 truncate">
                          {{ selectedFeedback.customer_email }}
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="selectedFeedback.overall_rating"
                      class="flex items-center text-yellow-600 bg-yellow-50 px-2 sm:px-3 py-1 rounded-full flex-shrink-0"
                    >
                      <font-awesome-icon
                        icon="fa-solid fa-star"
                        class="w-3 h-3 sm:w-4 sm:h-4 mr-1"
                      />
                      <span class="font-medium text-sm sm:text-base"
                        >{{ selectedFeedback.overall_rating }}/5</span
                      >
                    </div>
                  </div>
                  <div
                    class="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-600 mb-3"
                  >
                    <span class="flex items-center">
                      <font-awesome-icon
                        icon="fa-solid fa-receipt"
                        class="w-4 h-4 mr-2 flex-shrink-0"
                      />
                      <span class="hidden sm:inline">Order: </span
                      >{{ selectedFeedback.order_number }}
                    </span>
                    <span
                      v-if="selectedFeedback.branch_name"
                      class="flex items-center"
                    >
                      <font-awesome-icon
                        icon="fa-solid fa-store"
                        class="w-4 h-4 mr-2 flex-shrink-0"
                      />
                      {{ selectedFeedback.branch_name }}
                    </span>
                  </div>

                  <!-- Order Items Section -->
                  <div
                    v-if="
                      (selectedFeedback.orderDetails &&
                        selectedFeedback.orderDetails.items) ||
                      (selectedFeedback.item_ratings &&
                        Object.keys(selectedFeedback.item_ratings).length > 0)
                    "
                    class="mb-4"
                  >
                    <h5
                      class="font-medium text-gray-900 mb-2 flex items-center"
                    >
                      <font-awesome-icon
                        icon="fa-solid fa-utensils"
                        class="w-4 h-4 mr-2"
                      />
                      Order Items:
                    </h5>
                    <div
                      class="bg-gray-50 rounded-lg p-3 border border-gray-200 max-h-48 sm:max-h-64 overflow-y-auto"
                    >
                      <!-- Show items from order details if available -->
                      <div
                        v-if="
                          selectedFeedback.orderDetails &&
                          selectedFeedback.orderDetails.items
                        "
                        class="space-y-2"
                      >
                        <div
                          v-for="(item, index) in selectedFeedback.orderDetails
                            .items"
                          :key="index"
                          class="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-200 last:border-b-0 gap-2"
                        >
                          <div class="flex-1 min-w-0">
                            <div
                              class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"
                            >
                              <span
                                class="font-medium text-gray-900 text-sm sm:text-base truncate"
                              >
                                {{
                                  item.menu_item_name ||
                                  item.item_name ||
                                  'Unknown Item'
                                }}
                              </span>
                              <span
                                class="text-xs sm:text-sm text-gray-500 flex-shrink-0"
                              >
                                x{{ item.quantity }}
                              </span>
                            </div>
                            <div class="text-xs sm:text-sm text-gray-600">
                              ₱{{
                                (parseFloat(item.unit_price) || 0).toFixed(2)
                              }}
                            </div>
                          </div>

                          <!-- Individual Item Rating (if available) -->
                          <div
                            v-if="
                              selectedFeedback.item_ratings &&
                              selectedFeedback.item_ratings[item.id]
                            "
                            class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"
                          >
                            <div class="flex items-center space-x-1">
                              <div class="flex items-center">
                                <font-awesome-icon
                                  v-for="star in 5"
                                  :key="star"
                                  :icon="
                                    getStarIcon(
                                      star,
                                      selectedFeedback.item_ratings[item.id]
                                        .rating
                                    )
                                  "
                                  :class="[
                                    'w-3 h-3',
                                    getStarClass(
                                      star,
                                      selectedFeedback.item_ratings[item.id]
                                        .rating
                                    ),
                                  ]"
                                />
                              </div>
                              <span class="text-xs text-gray-600">
                                {{
                                  selectedFeedback.item_ratings[item.id].rating
                                }}/5
                              </span>
                            </div>
                            <div
                              v-if="
                                selectedFeedback.item_ratings[item.id].comment
                              "
                              class="text-xs text-gray-500 italic break-words"
                            >
                              "{{
                                selectedFeedback.item_ratings[item.id].comment
                              }}"
                            </div>
                          </div>
                          <div v-else class="text-xs text-gray-400">
                            No rating
                          </div>
                        </div>

                        <!-- Order Total -->
                        <div class="mt-3 pt-2 border-t border-gray-300">
                          <div class="flex justify-between items-center">
                            <span
                              class="font-medium text-gray-900 text-sm sm:text-base"
                              >Order Total:</span
                            >
                            <span
                              class="font-bold text-base sm:text-lg text-primaryColor"
                            >
                              ₱{{
                                (
                                  parseFloat(
                                    selectedFeedback.orderDetails.total_amount
                                  ) || 0
                                ).toFixed(2)
                              }}
                            </span>
                          </div>
                        </div>
                      </div>

                      <!-- Fallback: Show item ratings if order details not available -->
                      <div
                        v-else-if="
                          selectedFeedback.item_ratings &&
                          Object.keys(selectedFeedback.item_ratings).length > 0
                        "
                        class="space-y-2"
                      >
                        <div class="text-sm text-gray-600 mb-3">
                          <font-awesome-icon
                            icon="fa-solid fa-info-circle"
                            class="mr-1"
                          />
                          Order details are not available, but individual item
                          ratings are shown below:
                        </div>
                        <div
                          v-for="(
                            rating, itemId
                          ) in selectedFeedback.item_ratings"
                          :key="itemId"
                          class="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b border-gray-200 last:border-b-0 gap-2"
                        >
                          <div class="flex-1 min-w-0">
                            <span
                              class="font-medium text-gray-900 text-sm sm:text-base"
                            >
                              Item ID: {{ itemId }}
                            </span>
                          </div>
                          <div
                            class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"
                          >
                            <div class="flex items-center space-x-1">
                              <div class="flex items-center">
                                <font-awesome-icon
                                  v-for="star in 5"
                                  :key="star"
                                  :icon="getStarIcon(star, rating.rating)"
                                  :class="[
                                    'w-3 h-3',
                                    getStarClass(star, rating.rating),
                                  ]"
                                />
                              </div>
                              <span class="text-xs text-gray-600">
                                {{ rating.rating }}/5
                              </span>
                            </div>
                            <div
                              v-if="rating.comment"
                              class="text-xs text-gray-500 italic break-words"
                            >
                              "{{ rating.comment }}"
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="text-right sm:text-right mt-4 sm:mt-0">
                  <div class="text-xs sm:text-sm text-gray-500">
                    {{ formatDate(selectedFeedback.created_at) }}
                  </div>
                  <span
                    :class="[
                      'inline-flex px-2 py-1 rounded-full text-xs font-medium mt-2',
                      getStatusColor(selectedFeedback.status),
                    ]"
                  >
                    {{ selectedFeedback.status || 'New' }}
                  </span>
                </div>
              </div>
              <div class="bg-white p-4 rounded-lg border border-gray-200">
                <h5 class="font-medium text-gray-900 mb-2 text-sm sm:text-base">
                  Customer Comments:
                </h5>
                <p
                  class="text-gray-700 leading-relaxed text-sm sm:text-base break-words"
                >
                  {{ selectedFeedback.comments || 'No comments provided' }}
                </p>
              </div>
            </div>

            <!-- Reply Form -->
            <div class="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <h4
                class="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center"
              >
                <font-awesome-icon
                  icon="fa-solid fa-reply"
                  class="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600"
                />
                Send Reply to Customer
              </h4>
              <form @submit.prevent="sendReply" class="space-y-4 sm:space-y-6">
                <div>
                  <label
                    class="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
                    >Reply Message *
                    <span class="text-gray-500 text-xs block sm:inline"
                      >(This will be sent to the customer via email)</span
                    >
                  </label>
                  <textarea
                    v-model="replyForm.message"
                    rows="4"
                    required
                    placeholder="Type your reply to the customer..."
                    class="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none text-sm sm:text-base"
                  ></textarea>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ replyForm.message.length }} characters
                  </div>
                </div>

                <div>
                  <label
                    class="block text-xs sm:text-sm font-medium text-gray-700 mb-2"
                    >Internal Note (Optional)
                    <span class="text-gray-500 text-xs block sm:inline"
                      >(Not visible to customer)</span
                    >
                  </label>
                  <textarea
                    v-model="replyForm.internal_note"
                    rows="2"
                    placeholder="Add internal notes for your team..."
                    class="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none text-sm sm:text-base"
                  ></textarea>
                </div>

                <div
                  class="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200"
                >
                  <button
                    type="button"
                    @click="showReplyModal = false"
                    :disabled="isSendingReply"
                    class="btn btn-sm w-full sm:w-auto px-4 sm:px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    :disabled="isSendingReply || !replyForm.message.trim()"
                    class="btn btn-sm w-full sm:w-auto px-4 sm:px-6 py-2 bg-primaryColor/10 hover:bg-primaryColor/20 text-primaryColor rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed space-x-2"
                  >
                    <font-awesome-icon
                      v-if="isSendingReply"
                      icon="fa-solid fa-spinner"
                      class="w-4 h-4 animate-spin"
                    />
                    <font-awesome-icon
                      v-else
                      icon="fa-solid fa-paper-plane"
                      class="w-4 h-4"
                    />
                    <span>{{
                      isSendingReply ? 'Sending Reply...' : 'Send Reply'
                    }}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Archive Confirmation Modal -->
    <div
      v-if="showArchiveModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-2 sm:p-4 backdrop-blur-sm"
      @click="cancelArchive"
    >
      <div
        class="relative mx-auto w-full max-w-md shadow-lg rounded-lg bg-white"
        @click.stop
      >
        <div class="p-4 sm:p-6">
          <!-- Modal Header -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base sm:text-lg font-medium text-gray-900">
              Archive Feedback
            </h3>
            <button
              @click="cancelArchive"
              :disabled="isArchiving"
              class="text-gray-400 hover:text-gray-600 p-1 cursor-pointer disabled:opacity-50"
            >
              <font-awesome-icon
                icon="fa-solid fa-times"
                class="w-5 h-5 sm:w-6 sm:h-6"
              />
            </button>
          </div>

          <!-- Modal Content -->
          <div v-if="selectedArchiveItem" class="space-y-4">
            <!-- Warning Icon and Message -->
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0">
                <div
                  class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-exclamation-triangle"
                    class="w-5 h-5 text-yellow-600"
                  />
                </div>
              </div>
              <div class="flex-1">
                <h4 class="text-sm font-medium text-gray-900 mb-1">
                  Confirm Archive Action
                </h4>
                <p class="text-sm text-gray-600">
                  Are you sure you want to archive this feedback? This action
                  will move the feedback to the archived status and it will no
                  longer appear in the main list.
                </p>
              </div>
            </div>

            <!-- Feedback Details -->
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div class="flex items-center space-x-3 mb-3">
                <div
                  class="w-8 h-8 rounded-full bg-primaryColor/10 flex items-center justify-center flex-shrink-0"
                >
                  <span class="text-sm font-medium text-primaryColor">
                    {{
                      selectedArchiveItem.customer_name.charAt(0).toUpperCase()
                    }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate">
                    {{ selectedArchiveItem.customer_name }}
                  </p>
                  <p class="text-xs text-gray-500 truncate">
                    {{ selectedArchiveItem.customer_email }}
                  </p>
                </div>
                <div
                  v-if="selectedArchiveItem.overall_rating"
                  class="flex items-center text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full flex-shrink-0"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-star"
                    class="w-3 h-3 mr-1"
                  />
                  <span class="text-xs font-medium">
                    {{ selectedArchiveItem.overall_rating }}/5
                  </span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2 mb-2">
                <span
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primaryColor/10 text-primaryColor"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-receipt"
                    class="w-3 h-3 mr-1"
                  />
                  Order: {{ selectedArchiveItem.order_number }}
                </span>
                <span
                  v-if="selectedArchiveItem.branch_name"
                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-neutralColor/10 text-neutralColor"
                >
                  <font-awesome-icon
                    icon="fa-solid fa-store"
                    class="w-3 h-3 mr-1"
                  />
                  {{ selectedArchiveItem.branch_name }}
                </span>
              </div>

              <p class="text-xs text-gray-500">
                {{ formatDate(selectedArchiveItem.created_at) }}
              </p>
            </div>

            <!-- Modal Actions -->
            <div
              class="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200"
            >
              <button
                @click="cancelArchive"
                :disabled="isArchiving"
                class="btn btn-sm sm:w-auto px-4 sm:px-6 py-2 text-sm font-thin text-gray-700 bg-gray-100 hover:bg-gray-200  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                @click="confirmArchive"
                :disabled="isArchiving"
                class="btn btn-sm sm:w-auto px-4 sm:px-6 py-2 text-sm font-medium text-yellow-600 bg-yellow-100 hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <font-awesome-icon
                  v-if="isArchiving"
                  icon="fa-solid fa-spinner"
                  class="w-4 h-4 animate-spin"
                />
                <font-awesome-icon
                  v-else
                  icon="fa-solid fa-archive"
                  class="w-4 h-4"
                />
                <span>
                  {{ isArchiving ? 'Archiving...' : 'Archive Feedback' }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, computed, watch } from 'vue';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { library } from '@fortawesome/fontawesome-svg-core';
  import { useFeedbackStore } from '@/stores/feedbackStore';
  import { formatImageUrl } from '@/config/api.js';
  import { useCustomToast } from '@/composables/useCustomToast.js';
  import feedbackService from '@/services/feedbackService.js';
  import {
    faComments,
    faStar,
    faStarHalfStroke,
    faThumbsUp,
    faClock,
    faRefresh,
    faDownload,
    faTimes,
    faEye,
    faReply,
    faArchive,
    faThLarge,
    faList,
    faTag,
    faImage,
    faEllipsisV,
    faReceipt,
    faEnvelope,
    faUtensils,
    faInfoCircle,
    faExclamationTriangle,
  } from '@fortawesome/free-solid-svg-icons';

  library.add(
    faComments,
    faStar,
    faStarHalfStroke,
    faThumbsUp,
    faClock,
    faRefresh,
    faDownload,
    faTimes,
    faEye,
    faReply,
    faArchive,
    faThLarge,
    faList,
    faTag,
    faImage,
    faEllipsisV,
    faReceipt,
    faEnvelope,
    faUtensils,
    faInfoCircle,
    faExclamationTriangle
  );

  // Use the feedback store and toast notifications
  const feedbackStore = useFeedbackStore();
  const {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    dismiss,
  } = useCustomToast();

  // Local component state
  const viewMode = ref('cards');
  const showImageModal = ref(false);
  const selectedImage = ref('');
  const showReplyModal = ref(false);
  const selectedFeedback = ref(null);
  const isSendingReply = ref(false);
  const selectedDatePeriod = ref('today');
  const customMonth = ref('');
  const showArchiveModal = ref(false);
  const selectedArchiveItem = ref(null);
  const isArchiving = ref(false);

  // Image loading and error tracking
  const imageLoaded = ref({});
  const imageErrors = ref({});

  // Reply form
  const replyForm = ref({
    message: '',
    internal_note: '',
  });

  // Computed properties from store
  const feedback = computed(() => feedbackStore.orderRatings);
  const stats = computed(() => feedbackStore.stats);
  const loading = computed(() => feedbackStore.loading);
  const pagination = computed(() => feedbackStore.orderRatingPagination);
  const filters = computed(() => feedbackStore.orderRatingFilters);
  const satisfactionRate = computed(() => feedbackStore.satisfactionRate);

  const averageResponseTime = computed(() => {
    // Mock data - in real app, calculate from actual response times
    return 2.5;
  });

  // Debounced search
  let searchTimeout = null;
  const debouncedSearch = () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      feedbackStore.setOrderRatingFilters({ offset: 0 });
      feedbackStore.fetchOrderRatings();
    }, 500);
  };

  // Watch for filter changes - removed to prevent infinite loop
  // The filters are already reactive through the computed property

  // Methods using store
  const loadFeedback = async () => {
    await feedbackStore.fetchOrderRatings();
  };

  const loadStats = async () => {
    await feedbackStore.fetchOrderRatingStats();
  };

  // Feedback-specific methods
  const viewFeedback = (feedbackId) => {
    const item = feedback.value.find((f) => f.id === feedbackId);
    if (item) {
      selectedFeedback.value = item;
      showReplyModal.value = true;
    }
  };

  const viewImage = (imageFilename) => {
    if (!imageFilename) {
      console.warn('No image filename provided');
      return;
    }

    selectedImage.value = formatImageUrl(
      `/uploads/feedback-images/${imageFilename}`
    );
    showImageModal.value = true;
  };

  const handleImageError = (event) => {
    const imgElement = event.target;
    const itemId = findItemIdFromImage(imgElement);

    if (itemId) {
      imageErrors.value[itemId] = true;
      imageLoaded.value[itemId] = true; // Mark as loaded even if error
    }

    console.warn('Image failed to load:', imgElement.src);
  };

  const handleImageLoad = (event) => {
    const imgElement = event.target;
    const itemId = findItemIdFromImage(imgElement);

    if (itemId) {
      imageLoaded.value[itemId] = true;
      imageErrors.value[itemId] = false;
    }
  };

  const findItemIdFromImage = (imgElement) => {
    // Find the parent feedback item ID by traversing up the DOM
    let current = imgElement;
    while (current && current !== document.body) {
      if (current.dataset && current.dataset.itemId) {
        return current.dataset.itemId;
      }
      current = current.parentElement;
    }
    return null;
  };

  const handleModalImageError = (event) => {
    // Handle image errors in the modal
    const imgElement = event.target;
    imgElement.style.display = 'none';

    // Create a placeholder in the modal
    const placeholderDiv = document.createElement('div');
    placeholderDiv.className =
      'bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 text-lg min-h-64';
    placeholderDiv.innerHTML =
      '<div class="text-center"><i class="fas fa-image mb-2 text-4xl"></i><br>Image not available</div>';
    imgElement.parentNode.insertBefore(placeholderDiv, imgElement.nextSibling);
  };

  const markAsRead = async (feedbackId) => {
    try {
      await feedbackStore.markAsRead(feedbackId);
      showSuccess('Feedback marked as read', 'Status Updated');
    } catch (error) {
      showError('Failed to mark feedback as read', 'Update Error');
      console.error('Error marking feedback as read:', error);
    }
  };

  const replyToFeedback = async (feedbackId) => {
    const item = feedback.value.find((f) => f.id === feedbackId);
    if (item) {
      // Prevent opening reply modal for already-replied feedback
      if (item.status === 'replied') {
        showError(
          'This feedback has already been replied to',
          'Already Replied'
        );
        return;
      }

      selectedFeedback.value = item;
      replyForm.value = {
        message: '',
        internal_note: '',
      };
      showReplyModal.value = true;

      // Fetch order details if order number exists
      if (item.order_number) {
        await loadOrderDetails(item.order_number);
      }
    }
  };

  const loadOrderDetails = async (orderNumber) => {
    try {
      // Use the feedback service which has proper authentication setup
      const data = await feedbackService.getOrderDetails(orderNumber);
      console.log('Order details API response:', data);
      if (data.success) {
        selectedFeedback.value.orderDetails = data.data;
        console.log('Order details set:', selectedFeedback.value.orderDetails);
        console.log('Order items:', selectedFeedback.value.orderDetails?.items);
        console.log('Item ratings:', selectedFeedback.value.item_ratings);
        console.log(
          'Item ratings keys:',
          selectedFeedback.value.item_ratings
            ? Object.keys(selectedFeedback.value.item_ratings)
            : 'No item ratings'
        );

        // Debug individual item rating lookup
        if (selectedFeedback.value.orderDetails?.items) {
          selectedFeedback.value.orderDetails.items.forEach((item, index) => {
            console.log(`Item ${index}:`, item);
            console.log(`Looking for rating with key: ${item.id}`);
            console.log(
              `Rating exists:`,
              selectedFeedback.value.item_ratings &&
                selectedFeedback.value.item_ratings[item.id]
            );
          });
        }
      }
    } catch (error) {
      console.error('Error loading order details:', error);
      // Continue without order details - the fallback will show item ratings
    }
  };

  const archiveFeedback = (feedbackId) => {
    const item = feedback.value.find((f) => f.id === feedbackId);
    if (item) {
      selectedArchiveItem.value = item;
      showArchiveModal.value = true;
    }
  };

  const confirmArchive = async () => {
    if (!selectedArchiveItem.value) return;

    isArchiving.value = true;
    let loadingToastId = null;

    try {
      // Show loading toast
      loadingToastId = showLoading(
        'Archiving feedback...',
        'Archive in Progress'
      );

      await feedbackStore.archiveFeedback(selectedArchiveItem.value.id);

      // Dismiss loading toast
      if (loadingToastId) {
        dismiss(loadingToastId);
      }

      showSuccess('Feedback archived successfully', 'Archived');

      // Close modal and reset state
      showArchiveModal.value = false;
      selectedArchiveItem.value = null;
    } catch (error) {
      // Dismiss loading toast if it exists
      if (loadingToastId) {
        dismiss(loadingToastId);
      }

      showError('Failed to archive feedback', 'Archive Error');
      console.error('Error archiving feedback:', error);
    } finally {
      isArchiving.value = false;
    }
  };

  const cancelArchive = () => {
    showArchiveModal.value = false;
    selectedArchiveItem.value = null;
  };

  const sendReply = async () => {
    if (!replyForm.value.message.trim()) {
      showWarning('Please enter a reply message', 'Validation Error');
      return;
    }

    isSendingReply.value = true;
    let loadingToastId = null;

    try {
      // Show loading toast
      loadingToastId = showLoading(
        'Sending reply to customer...',
        'Processing Reply'
      );

      const data = await feedbackStore.sendReply(
        selectedFeedback.value.id,
        replyForm.value.message,
        replyForm.value.internal_note
      );

      // Dismiss loading toast
      if (loadingToastId) {
        dismiss(loadingToastId);
      }

      // Show success message with environment verification
      const isDevelopment = import.meta.env.DEV;
      const environmentText = isDevelopment
        ? ' (Development Mode)'
        : ' (Production)';

      showSuccess(
        `Reply sent successfully! The customer will receive an email shortly.`,
        'Reply Delivered!'
      );

      // Close modal and reset form
      showReplyModal.value = false;
      replyForm.value = { message: '', internal_note: '' };
      selectedFeedback.value = null;

      // Additional verification toast for development
      if (isDevelopment) {
        setTimeout(() => {
          showInfo(
            `Email verification: Check backend logs and email service status. Customer: ${selectedFeedback.value?.customer_email || 'Unknown'}`,
            'Development Verification'
          );
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending reply:', error);

      // Dismiss loading toast if it exists
      if (loadingToastId) {
        dismiss(loadingToastId);
      }

      // Handle different types of errors with appropriate toast notifications
      if (error.code === 'ECONNABORTED') {
        showError(
          'Request timed out. Please check your connection and try again.',
          'Connection Timeout'
        );
      } else if (error.response?.status === 401) {
        showError(
          'Authentication failed. Please login again to continue.',
          'Authentication Error'
        );
      } else if (error.response?.status === 500) {
        showError(
          'Server error occurred. Please try again later or contact support.',
          'Server Error'
        );
      } else if (error.response?.status === 400) {
        showWarning(
          error.response?.data?.message ||
            'Invalid request. Please check your input.',
          'Invalid Request'
        );
      } else {
        showError(
          `Failed to send reply: ${error.response?.data?.message || error.message}`,
          'Reply Failed'
        );
      }

      // Additional error details for development
      if (import.meta.env.DEV) {
        console.group('Reply Error Details');
        console.error('Error object:', error);
        console.error('Response data:', error.response?.data);
        console.error('Request config:', error.config);
        console.groupEnd();
      }
    } finally {
      isSendingReply.value = false;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-info/5 text-info',
      read: 'bg-warning/5 text-warning',
      replied: 'bg-success/10 text-success',
      archived: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStarIcon = (starPosition, rating) => {
    const fullRating = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    if (starPosition <= fullRating) {
      return 'fa-solid fa-star'; // Full star
    } else if (starPosition === fullRating + 1 && hasHalfStar) {
      return 'fa-solid fa-star-half-stroke'; // Half star
    } else {
      return 'fa-solid fa-star'; // Empty star (will be gray)
    }
  };

  const getStarClass = (starPosition, rating) => {
    const fullRating = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    if (starPosition <= fullRating) {
      return 'text-yellow-400'; // Full star - yellow
    } else if (starPosition === fullRating + 1 && hasHalfStar) {
      return 'text-yellow-400'; // Half star - yellow
    } else {
      return 'text-gray-300'; // Empty star - gray
    }
  };

  const toggleFeedbackMenu = (feedbackId) => {
    // Toggle dropdown menu for feedback item
    console.log('Toggle menu for feedback:', feedbackId);
  };

  const closeModalOnBackdrop = () => {
    if (!isSendingReply.value) {
      showReplyModal.value = false;
    }
  };

  // Email verification method
  const verifyEmailService = async () => {
    try {
      const loadingToastId = showLoading(
        'Checking email service status...',
        'Email Verification'
      );

      const response = await fetch('/api/feedback/email-status');
      const result = await response.json();

      dismiss(loadingToastId);

      if (result.success) {
        const { data } = result;
        const isDevelopment = import.meta.env.DEV;

        let message = `Email Service Status:\n`;
        message += `Environment: ${data.environment}\n`;
        message += `Primary Service: ${data.primary_service}\n`;
        message += `SendGrid: ${data.services.sendgrid.configured ? '✅ Configured' : '❌ Not configured'}\n`;
        message += `Gmail SMTP: ${data.services.gmail_smtp.configured ? '✅ Configured' : '❌ Not configured'}\n`;
        message += `Fallback Available: ${data.fallback_available ? '✅ Yes' : '❌ No'}\n`;
        message += `Timestamp: ${new Date(data.timestamp).toLocaleString()}`;

        if (
          data.services.sendgrid.configured ||
          data.services.gmail_smtp.configured
        ) {
          showSuccess(message, 'Email Service Ready');
        } else {
          showWarning(message, 'Email Service Not Configured');
        }

        // Additional info for development
        if (isDevelopment) {
          setTimeout(() => {
            showInfo(
              'Development Mode: Check backend console for detailed email service logs during reply sending.',
              'Development Debug'
            );
          }, 2000);
        }
      } else {
        showError(
          result.message || 'Failed to retrieve email service status',
          'Verification Failed'
        );
      }
    } catch (error) {
      console.error('Email service verification error:', error);
      showError(
        'Failed to verify email service status. Check network connection.',
        'Verification Error'
      );
    }
  };

  const clearFilters = () => {
    feedbackStore.clearOrderRatingFilters();
    selectedDatePeriod.value = 'today';
    customMonth.value = '';
    feedbackStore.fetchOrderRatings();
  };

  const handleDatePeriodChange = () => {
    // Initialize custom month with current month if switching to custom
    if (selectedDatePeriod.value === 'custom' && !customMonth.value) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      customMonth.value = `${year}-${month}`;
    }

    const { dateFrom, dateTo } = getDateRange(selectedDatePeriod.value);

    // Update filters with date range
    feedbackStore.setOrderRatingFilters({
      date_from: dateFrom,
      date_to: dateTo,
      offset: 0,
    });

    feedbackStore.fetchOrderRatings();
  };

  const handleCustomMonthChange = () => {
    if (customMonth.value) {
      const { dateFrom, dateTo } = getDateRange('custom', customMonth.value);

      // Update filters with date range
      feedbackStore.setOrderRatingFilters({
        date_from: dateFrom,
        date_to: dateTo,
        offset: 0,
      });

      feedbackStore.fetchOrderRatings();
    }
  };

  const getDateRange = (period, customMonthValue = null) => {
    const now = new Date();
    let dateFrom, dateTo;

    switch (period) {
      case 'today':
        const todayLocal = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        dateFrom = new Date(todayLocal);
        dateFrom.setHours(0, 0, 0, 0);

        dateTo = new Date(todayLocal);
        dateTo.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        dateFrom = startOfWeek;

        const endOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        dateTo = new Date(endOfToday);
        dateTo.setHours(23, 59, 59, 999);
        break;
      case 'month':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFrom.setHours(0, 0, 0, 0);

        const endOfTodayMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        dateTo = new Date(endOfTodayMonth);
        dateTo.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        // Use custom month value or default to current month
        let year, month;
        if (customMonthValue) {
          [year, month] = customMonthValue.split('-').map(Number);
          month = month - 1; // JavaScript months are 0-based
        } else {
          year = now.getFullYear();
          month = now.getMonth();
        }

        dateFrom = new Date(year, month, 1);
        dateFrom.setHours(0, 0, 0, 0);

        dateTo = new Date(year, month + 1, 0);
        dateTo.setHours(23, 59, 59, 999);
        break;
      default:
        const todayDefault = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        dateFrom = new Date(todayDefault);
        dateFrom.setHours(0, 0, 0, 0);

        dateTo = new Date(todayDefault);
        dateTo.setHours(23, 59, 59, 999);
    }

    return {
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
    };
  };

  const refreshData = async () => {
    await feedbackStore.refreshData();
  };

  const exportFeedback = async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters.value).forEach((key) => {
        if (filters.value[key]) {
          params.append(key, filters.value[key]);
        }
      });

      const response = await fetch(
        `/api/feedback/ratings/export?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-ratings-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess('Order ratings exported successfully', 'Export Complete');
    } catch (error) {
      console.error('Error exporting order ratings:', error);
      showError('Failed to export order ratings', 'Export Error');
    }
  };

  const previousPage = () => {
    feedbackStore.previousOrderRatingPage();
  };

  const nextPage = () => {
    feedbackStore.nextOrderRatingPage();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Initialize image states when feedback data changes
  watch(
    feedback,
    (newFeedback) => {
      if (newFeedback && newFeedback.length > 0) {
        newFeedback.forEach((item) => {
          if (item.image_filename) {
            imageLoaded.value[item.id] = false;
            imageErrors.value[item.id] = false;
          }
        });
      }
    },
    { immediate: true }
  );

  // Lifecycle
  onMounted(() => {
    loadFeedback();
    loadStats();
  });
</script>

<style scoped>
  .line-clamp-3 {
    display: -webkit-box;

    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
