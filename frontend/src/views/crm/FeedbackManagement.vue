<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Feedback Management</h1>
          <p class="text-gray-600 mt-2">Manage customer feedback, reviews, and ratings</p>
        </div>
        <div class="flex items-center space-x-4">
          <button
            @click="refreshData"
            :disabled="loading"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
          >
            <font-awesome-icon icon="fa-solid fa-refresh" :class="{ 'animate-spin': loading }" />
            <span>Refresh</span>
          </button>
          <button
            @click="exportFeedback"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
          >
            <font-awesome-icon icon="fa-solid fa-download" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-blue-100 text-blue-600">
            <font-awesome-icon icon="fa-solid fa-comments" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Feedback</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.total_feedback || 0 }}</p>
            <p class="text-xs text-green-600">{{ stats.positive_feedback || 0 }} positive</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-yellow-100 text-yellow-600">
            <font-awesome-icon icon="fa-solid fa-star" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Avg Rating</p>
            <p class="text-2xl font-bold text-gray-900">{{ (stats.average_rating || 0).toFixed(1) }}</p>
            <p class="text-xs text-green-600">{{ stats.positive_ratings || 0 }} positive</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-green-100 text-green-600">
            <font-awesome-icon icon="fa-solid fa-thumbs-up" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Satisfaction</p>
            <p class="text-2xl font-bold text-gray-900">{{ satisfactionRate }}%</p>
            <p class="text-xs text-green-600">Happy customers</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-purple-100 text-purple-600">
            <font-awesome-icon icon="fa-solid fa-clock" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Response Time</p>
            <p class="text-2xl font-bold text-gray-900">{{ averageResponseTime }}h</p>
            <p class="text-xs text-green-600">Avg response</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-gray-900">Filters & Search</h3>
        <button
          @click="clearFilters"
          class="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1"
        >
          <font-awesome-icon icon="fa-solid fa-times" />
          <span>Clear All</span>
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search feedback..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            @input="debouncedSearch"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Rating</label>
          <select
            v-model="filters.rating"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            @change="loadFeedback"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Source</label>
          <select
            v-model="filters.source"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            @change="loadFeedback"
          >
            <option value="">All Sources</option>
            <option value="Website Contact Form">Website</option>
            <option value="QR Code Rating">QR Code</option>
            <option value="Mobile App">Mobile App</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select
            v-model="filters.status"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            @change="loadFeedback"
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
          <select
            v-model="filters.sort_by"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            @change="loadFeedback"
          >
            <option value="created_at">Date Created</option>
            <option value="rating">Rating</option>
            <option value="name">Customer Name</option>
            <option value="source">Source</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Feedback Cards -->
    <div class="space-y-6">
      <!-- View Toggle -->
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h3 class="text-lg font-medium text-gray-900">Customer Feedback</h3>
          <div class="flex items-center space-x-2">
            <button
              @click="viewMode = 'cards'"
              :class="[
                'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                viewMode === 'cards' 
                  ? 'bg-green-100 text-green-700' 
                  : 'text-gray-500 hover:text-gray-700'
              ]"
            >
              <font-awesome-icon icon="fa-solid fa-th-large" class="mr-1" />
              Cards
            </button>
            <button
              @click="viewMode = 'list'"
              :class="[
                'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                viewMode === 'list' 
                  ? 'bg-green-100 text-green-700' 
                  : 'text-gray-500 hover:text-gray-700'
              ]"
            >
              <font-awesome-icon icon="fa-solid fa-list" class="mr-1" />
              List
            </button>
          </div>
        </div>
        <div class="text-sm text-gray-500">
          {{ pagination.total }} feedback items
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <p class="mt-2 text-gray-600">Loading feedback...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="feedback.length === 0" class="text-center py-12">
        <font-awesome-icon icon="fa-solid fa-comments" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 mb-2">No feedback found</h3>
        <p class="text-gray-500">Try adjusting your filters or check back later.</p>
      </div>

      <!-- Cards View -->
      <div v-else-if="viewMode === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="item in feedback"
          :key="item.id"
          class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
        >
          <!-- Feedback Header -->
          <div class="p-6 border-b border-gray-100">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <span class="text-sm font-medium text-green-600">
                    {{ item.name.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div>
                  <h4 class="font-medium text-gray-900">{{ item.name }}</h4>
                  <p class="text-sm text-gray-500">{{ item.email }}</p>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <span
                  :class="[
                    'px-2 py-1 rounded-full text-xs font-medium',
                    getStatusColor(item.status)
                  ]"
                >
                  {{ item.status || 'New' }}
                </span>
                <button
                  @click="toggleFeedbackMenu(item.id)"
                  class="text-gray-400 hover:text-gray-600"
                >
                  <font-awesome-icon icon="fa-solid fa-ellipsis-v" />
                </button>
              </div>
            </div>

            <!-- Rating -->
            <div v-if="item.rating" class="flex items-center space-x-1 mb-3">
              <div class="flex items-center">
                <font-awesome-icon
                  v-for="star in 5"
                  :key="star"
                  icon="fa-solid fa-star"
                  :class="[
                    'w-4 h-4',
                    star <= item.rating ? 'text-yellow-400' : 'text-gray-300'
                  ]"
                />
              </div>
              <span class="text-sm text-gray-600 ml-2">{{ item.rating }}/5</span>
            </div>

            <!-- Source Badge -->
            <div class="flex items-center space-x-2">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <font-awesome-icon icon="fa-solid fa-tag" class="w-3 h-3 mr-1" />
                {{ item.source }}
              </span>
              <span class="text-xs text-gray-500">{{ formatDate(item.created_at) }}</span>
            </div>
          </div>

          <!-- Feedback Content -->
          <div class="p-6">
            <p class="text-gray-700 mb-4 line-clamp-3">{{ item.message }}</p>
            
            <!-- Image Preview -->
            <div v-if="item.image_filename" class="mb-4">
              <img
                :src="`/uploads/feedback-images/${item.image_filename}`"
                :alt="item.name"
                class="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                @click="viewImage(item.image_filename)"
              />
            </div>

            <!-- Actions -->
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <button
                  @click="markAsRead(item.id)"
                  :disabled="item.status === 'read'"
                  class="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                >
                  <font-awesome-icon icon="fa-solid fa-eye" class="mr-1" />
                  Mark as Read
                </button>
                <button
                  @click="replyToFeedback(item.id)"
                  class="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  <font-awesome-icon icon="fa-solid fa-reply" class="mr-1" />
                  Reply
                </button>
              </div>
              <button
                @click="archiveFeedback(item.id)"
                class="text-gray-400 hover:text-gray-600"
              >
                <font-awesome-icon icon="fa-solid fa-archive" />
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
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="item in feedback" :key="item.id" class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                      <div class="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <span class="text-sm font-medium text-green-600">
                          {{ item.name.charAt(0).toUpperCase() }}
                        </span>
                      </div>
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-gray-900">{{ item.name }}</div>
                      <div class="text-sm text-gray-500">{{ item.email }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div v-if="item.rating" class="flex items-center">
                    <font-awesome-icon
                      v-for="star in 5"
                      :key="star"
                      icon="fa-solid fa-star"
                      :class="[
                        'w-4 h-4',
                        star <= item.rating ? 'text-yellow-400' : 'text-gray-300'
                      ]"
                    />
                    <span class="text-sm text-gray-600 ml-2">{{ item.rating }}</span>
                  </div>
                  <span v-else class="text-gray-400">No rating</span>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-900 max-w-xs truncate">{{ item.message }}</div>
                  <div v-if="item.image_filename" class="text-xs text-blue-600 mt-1">
                    <font-awesome-icon icon="fa-solid fa-image" class="mr-1" />
                    Has image
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ item.source }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ formatDate(item.created_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex space-x-2">
                    <button
                      @click="viewFeedback(item.id)"
                      class="text-green-600 hover:text-green-900"
                    >
                      <font-awesome-icon icon="fa-solid fa-eye" />
                    </button>
                    <button
                      @click="replyToFeedback(item.id)"
                      class="text-blue-600 hover:text-blue-900"
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
      <div v-if="pagination.total > pagination.limit" class="bg-white rounded-lg shadow p-4">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-700">
            Showing {{ pagination.offset + 1 }} to {{ Math.min(pagination.offset + pagination.limit, pagination.total) }} of {{ pagination.total }} results
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
              :disabled="pagination.offset + pagination.limit >= pagination.total"
              class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Image View Modal -->
    <div v-if="showImageModal" class="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
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
        />
      </div>
    </div>

    <!-- Reply Modal -->
    <div v-if="showReplyModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">Reply to Feedback</h3>
            <button @click="showReplyModal = false; replyAttemptCount = 0" class="text-gray-400 hover:text-gray-600">
              <font-awesome-icon icon="fa-solid fa-times" />
            </button>
          </div>
          
          <div v-if="selectedFeedback" class="space-y-4">
            <!-- Original Feedback -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="flex items-center space-x-2 mb-2">
                <span class="font-medium text-gray-900">{{ selectedFeedback.name }}</span>
                <span class="text-sm text-gray-500">{{ selectedFeedback.email }}</span>
                <span v-if="selectedFeedback.rating" class="flex items-center text-yellow-600">
                  <font-awesome-icon icon="fa-solid fa-star" class="w-4 h-4 mr-1" />
                  {{ selectedFeedback.rating }}/5
                </span>
              </div>
              <p class="text-sm text-gray-700">{{ selectedFeedback.message }}</p>
            </div>
            
            <!-- Reply Form -->
            <form @submit.prevent="sendReply" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Reply Message *</label>
                <textarea
                  v-model="replyForm.message"
                  rows="4"
                  required
                  placeholder="Type your reply to the customer..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                ></textarea>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Internal Note (Optional)</label>
                <textarea
                  v-model="replyForm.internal_note"
                  rows="2"
                  placeholder="Add internal notes (not visible to customer)..."
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                ></textarea>
              </div>
              
              <div class="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  @click="showReplyModal = false; replyAttemptCount = 0"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="isSendingReply"
                  class="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <span v-if="isSendingReply" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                  <span>{{ isSendingReply ? `Sending... (Attempt ${replyAttemptCount}/3)` : 'Send Reply' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import feedbackService from '@/services/feedbackService';
import {
  faComments,
  faStar,
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
  faEllipsisV
} from '@fortawesome/free-solid-svg-icons';

library.add(faComments, faStar, faThumbsUp, faClock, faRefresh, faDownload, faTimes, faEye, faReply, faArchive, faThLarge, faList, faTag, faImage, faEllipsisV);

// Reactive data
const feedback = ref([]);
const stats = ref({});
const loading = ref(false);
const viewMode = ref('cards');
const showImageModal = ref(false);
const selectedImage = ref('');
const showReplyModal = ref(false);
const selectedFeedback = ref(null);

// Filters
const filters = ref({
  search: '',
  rating: '',
  source: '',
  status: '',
  sort_by: 'created_at',
  sort_order: 'desc',
  limit: 20,
  offset: 0
});

// Pagination
const pagination = ref({
  total: 0,
  limit: 20,
  offset: 0
});

// Reply form
const replyForm = ref({
  message: '',
  internal_note: ''
});

// Reply loading state
const isSendingReply = ref(false);
const replyAttemptCount = ref(0);

// Computed properties
const satisfactionRate = computed(() => {
  if (!stats.value.total_feedback) return 0;
  const positive = stats.value.positive_feedback || 0;
  return Math.round((positive / stats.value.total_feedback) * 100);
});

const averageResponseTime = computed(() => {
  // Mock data - in real app, calculate from actual response times
  return 2.5;
});

// Debounced search
let searchTimeout = null;
const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    filters.value.offset = 0;
    loadFeedback();
  }, 500);
};

// Methods
const loadFeedback = async () => {
  try {
    loading.value = true;
    
    const data = await feedbackService.getFeedback(filters.value);

    if (data.success) {
      feedback.value = data.data;
      pagination.value = data.pagination;
    } else {
      console.error('Failed to load feedback:', data.message);
    }
  } catch (error) {
    console.error('Error loading feedback:', error);
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    const response = await fetch('/api/analytics/overview');
    const data = await response.json();

    if (data.success) {
      stats.value = data.data.feedback;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
};

// Feedback-specific methods
const viewFeedback = (feedbackId) => {
  const item = feedback.value.find(f => f.id === feedbackId);
  if (item) {
    selectedFeedback.value = item;
    showReplyModal.value = true;
  }
};

const viewImage = (imageFilename) => {
  selectedImage.value = `/uploads/feedback-images/${imageFilename}`;
  showImageModal.value = true;
};

const markAsRead = async (feedbackId) => {
  try {
    const data = await feedbackService.markAsRead(feedbackId);

    if (data.success) {
      await loadFeedback();
    } else {
      console.error('Failed to mark as read:', data.message);
    }
  } catch (error) {
    console.error('Error marking as read:', error);
  }
};

const replyToFeedback = (feedbackId) => {
  const item = feedback.value.find(f => f.id === feedbackId);
  if (item) {
    selectedFeedback.value = item;
    replyForm.value = {
      message: '',
      internal_note: ''
    };
    replyAttemptCount.value = 0; // Reset attempt count
    showReplyModal.value = true;
  }
};

const archiveFeedback = async (feedbackId) => {
  if (!confirm('Are you sure you want to archive this feedback?')) {
    return;
  }

  try {
    const data = await feedbackService.archiveFeedback(feedbackId);

    if (data.success) {
      await loadFeedback();
    } else {
      console.error('Failed to archive feedback:', data.message);
    }
  } catch (error) {
    console.error('Error archiving feedback:', error);
  }
};

const sendReply = async (retryCount = 0) => {
  if (!replyForm.value.message.trim()) {
    alert('Please enter a reply message');
    return;
  }

  isSendingReply.value = true;
  replyAttemptCount.value = retryCount + 1;
  const maxRetries = 2;

  try {
    console.log(`Starting to send reply... (attempt ${retryCount + 1}/${maxRetries + 1})`);
    console.log('Feedback ID:', selectedFeedback.value.id);
    console.log('Message:', replyForm.value.message);
    
    const data = await feedbackService.sendReply(
      selectedFeedback.value.id,
      replyForm.value.message,
      replyForm.value.internal_note
    );

    console.log('Reply response:', data);

    if (data.success) {
      showReplyModal.value = false;
      replyForm.value = { message: '', internal_note: '' };
      selectedFeedback.value = null;
      replyAttemptCount.value = 0; // Reset attempt count on success
      await loadFeedback();
      alert('Reply sent successfully! The customer will receive an email shortly.');
    } else {
      console.error('Failed to send reply:', data.message);
      if (retryCount < maxRetries) {
        console.log(`Retrying... (attempt ${retryCount + 2}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        return sendReply(retryCount + 1);
      } else {
        alert('Failed to send reply after multiple attempts: ' + data.message);
      }
    }
  } catch (error) {
    console.error('Error sending reply:', error);
    
    // Check if we should retry for certain errors
    const shouldRetry = retryCount < maxRetries && (
      error.code === 'ECONNABORTED' || 
      error.message.includes('timeout') ||
      error.response?.status === 500 ||
      error.message.includes('Network Error')
    );
    
    if (shouldRetry) {
      console.log(`Retrying due to error... (attempt ${retryCount + 2}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
      isSendingReply.value = false; // Reset loading state
      return sendReply(retryCount + 1);
    }
    
    // Handle different types of errors with better user feedback
    let errorMessage = 'Failed to send reply. ';
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage += 'The request timed out after multiple attempts. This might be due to email processing delays. Please check if the reply was sent before trying again.';
    } else if (error.response?.status === 401) {
      errorMessage += 'Authentication failed. Please refresh the page and login again.';
    } else if (error.response?.status === 400) {
      errorMessage += error.response?.data?.message || 'Invalid request data.';
    } else if (error.response?.status === 404) {
      errorMessage += 'Feedback not found. It may have been deleted.';
    } else if (error.response?.status === 500) {
      errorMessage += `Server error occurred after ${retryCount + 1} attempts. The reply might still be processing. Please check the feedback status before retrying.`;
    } else if (error.response?.status) {
      errorMessage += `Server responded with error ${error.response.status}: ${error.response?.data?.message || 'Unknown error'}`;
    } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      errorMessage += `Network connection error after ${retryCount + 1} attempts. Please check your internet connection and try again.`;
    } else {
      errorMessage += error.response?.data?.message || error.message || 'Unknown error occurred.';
    }
    
    alert(errorMessage);
  } finally {
    isSendingReply.value = false;
  }
};

const getStatusColor = (status) => {
  const colors = {
    'new': 'bg-blue-100 text-blue-800',
    'read': 'bg-green-100 text-green-800',
    'replied': 'bg-purple-100 text-purple-800',
    'archived': 'bg-gray-100 text-gray-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const toggleFeedbackMenu = (feedbackId) => {
  // Toggle dropdown menu for feedback item
  console.log('Toggle menu for feedback:', feedbackId);
};

const clearFilters = () => {
  filters.value = {
    search: '',
    rating: '',
    source: '',
    status: '',
    sort_by: 'created_at',
    sort_order: 'desc',
    limit: 20,
    offset: 0
  };
  loadFeedback();
};

const refreshData = async () => {
  await Promise.all([loadFeedback(), loadStats()]);
};

const exportFeedback = async () => {
  try {
    const params = new URLSearchParams();
    Object.keys(filters.value).forEach(key => {
      if (filters.value[key]) {
        params.append(key, filters.value[key]);
      }
    });

    const response = await fetch(`/api/feedback/export?${params.toString()}`);
    const blob = await response.blob();
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error exporting feedback:', error);
  }
};

const previousPage = () => {
  if (pagination.value.offset > 0) {
    filters.value.offset = pagination.value.offset - pagination.value.limit;
    loadFeedback();
  }
};

const nextPage = () => {
  if (pagination.value.offset + pagination.value.limit < pagination.value.total) {
    filters.value.offset = pagination.value.offset + pagination.value.limit;
    loadFeedback();
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Lifecycle
onMounted(() => {
  loadFeedback();
  loadStats();
});
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
