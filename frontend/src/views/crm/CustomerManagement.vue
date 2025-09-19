<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Customer Management</h1>
          <p class="text-gray-600 mt-2">Manage customer data, feedback, and ratings</p>
        </div>
        <button
          @click="showCreateModal = true"
          class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
        >
          <font-awesome-icon icon="fa-solid fa-plus" />
          <span>Add Customer</span>
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-blue-100 text-blue-600">
            <font-awesome-icon icon="fa-solid fa-users" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Customers</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.total_customers || 0 }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-green-100 text-green-600">
            <font-awesome-icon icon="fa-solid fa-user-check" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Active Customers</p>
            <p class="text-2xl font-bold text-gray-900">{{ stats.active_customers || 0 }}</p>
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
            <p class="text-2xl font-bold text-gray-900">{{ (stats.overall_average_rating || 0).toFixed(1) }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="p-3 rounded-full bg-purple-100 text-purple-600">
            <font-awesome-icon icon="fa-solid fa-dollar-sign" class="w-6 h-6" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-600">Total Revenue</p>
            <p class="text-2xl font-bold text-gray-900">₱{{ (stats.total_revenue || 0).toLocaleString() }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <input
            v-model="filters.search"
            type="text"
            placeholder="Search customers..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            @input="debouncedSearch"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">City</label>
          <input
            v-model="filters.city"
            type="text"
            placeholder="Filter by city..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            @input="debouncedSearch"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Gender</label>
          <select
            v-model="filters.gender"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            @change="loadCustomers"
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
          <select
            v-model="filters.sort_by"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            @change="loadCustomers"
          >
            <option value="created_at">Date Created</option>
            <option value="name">Name</option>
            <option value="total_spent">Total Spent</option>
            <option value="average_rating">Average Rating</option>
            <option value="last_visit">Last Visit</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Customers Table -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-medium text-gray-900">Customers</h3>
      </div>
      
      <div v-if="loading" class="p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <p class="mt-2 text-gray-600">Loading customers...</p>
      </div>

      <div v-else-if="customers.length === 0" class="p-8 text-center">
        <font-awesome-icon icon="fa-solid fa-users" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p class="text-gray-600">No customers found</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Visit</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="customer in customers" :key="customer.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <div class="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span class="text-sm font-medium text-green-600">
                        {{ customer.name.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ customer.name }}</div>
                    <div class="text-sm text-gray-500">ID: {{ customer.id }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ customer.email }}</div>
                <div v-if="customer.phone" class="text-sm text-gray-500">{{ customer.phone }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div v-if="customer.city" class="text-sm text-gray-900">{{ customer.city }}</div>
                <div v-if="customer.province" class="text-sm text-gray-500">{{ customer.province }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">₱{{ (customer.total_spent || 0).toLocaleString() }}</div>
                <div class="text-sm text-gray-500">{{ customer.total_orders || 0 }} orders</div>
                <div v-if="customer.average_rating" class="flex items-center text-sm text-yellow-600">
                  <font-awesome-icon icon="fa-solid fa-star" class="w-3 h-3 mr-1" />
                  {{ customer.average_rating.toFixed(1) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ customer.last_visit ? formatDate(customer.last_visit) : 'Never' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button
                    @click="viewCustomer(customer.id)"
                    class="text-green-600 hover:text-green-900"
                  >
                    <font-awesome-icon icon="fa-solid fa-eye" />
                  </button>
                  <button
                    @click="editCustomer(customer)"
                    class="text-blue-600 hover:text-blue-900"
                  >
                    <font-awesome-icon icon="fa-solid fa-edit" />
                  </button>
                  <button
                    @click="deleteCustomer(customer.id)"
                    class="text-red-600 hover:text-red-900"
                  >
                    <font-awesome-icon icon="fa-solid fa-trash" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.total > pagination.limit" class="px-6 py-4 border-t border-gray-200">
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

    <!-- Create/Edit Customer Modal -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">
              {{ showCreateModal ? 'Add New Customer' : 'Edit Customer' }}
            </h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <font-awesome-icon icon="fa-solid fa-times" />
            </button>
          </div>

          <form @submit.prevent="saveCustomer" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                v-model="customerForm.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                v-model="customerForm.email"
                type="email"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                v-model="customerForm.phone"
                type="tel"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                v-model="customerForm.address"
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  v-model="customerForm.city"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Province</label>
                <input
                  v-model="customerForm.province"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  v-model="customerForm.gender"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
                <input
                  v-model="customerForm.birth_date"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                v-model="customerForm.notes"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              ></textarea>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="closeModal"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {{ saving ? 'Saving...' : (showCreateModal ? 'Create' : 'Update') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Customer Details Modal -->
    <div v-if="showDetailsModal && selectedCustomer" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-10 mx-auto p-5 border w-4/5 max-w-6xl shadow-lg rounded-md bg-white">
        <div class="mt-3">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-medium text-gray-900">Customer Details</h3>
            <button @click="closeDetailsModal" class="text-gray-400 hover:text-gray-600">
              <font-awesome-icon icon="fa-solid fa-times" />
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Customer Info -->
            <div class="lg:col-span-1">
              <div class="bg-gray-50 rounded-lg p-6">
                <div class="text-center mb-6">
                  <div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <span class="text-2xl font-bold text-green-600">
                      {{ selectedCustomer.name.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <h4 class="text-xl font-semibold text-gray-900">{{ selectedCustomer.name }}</h4>
                  <p class="text-gray-600">{{ selectedCustomer.email }}</p>
                </div>

                <div class="space-y-3">
                  <div v-if="selectedCustomer.phone">
                    <span class="text-sm font-medium text-gray-500">Phone:</span>
                    <p class="text-sm text-gray-900">{{ selectedCustomer.phone }}</p>
                  </div>
                  <div v-if="selectedCustomer.address">
                    <span class="text-sm font-medium text-gray-500">Address:</span>
                    <p class="text-sm text-gray-900">{{ selectedCustomer.address }}</p>
                  </div>
                  <div v-if="selectedCustomer.city || selectedCustomer.province">
                    <span class="text-sm font-medium text-gray-500">Location:</span>
                    <p class="text-sm text-gray-900">
                      {{ [selectedCustomer.city, selectedCustomer.province].filter(Boolean).join(', ') }}
                    </p>
                  </div>
                  <div v-if="selectedCustomer.gender">
                    <span class="text-sm font-medium text-gray-500">Gender:</span>
                    <p class="text-sm text-gray-900 capitalize">{{ selectedCustomer.gender }}</p>
                  </div>
                  <div v-if="selectedCustomer.birth_date">
                    <span class="text-sm font-medium text-gray-500">Birth Date:</span>
                    <p class="text-sm text-gray-900">{{ formatDate(selectedCustomer.birth_date) }}</p>
                  </div>
                </div>

                <div class="mt-6 pt-6 border-t border-gray-200">
                  <h5 class="text-sm font-medium text-gray-500 mb-3">Statistics</h5>
                  <div class="space-y-2">
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">Total Orders:</span>
                      <span class="text-sm font-medium">{{ selectedCustomer.total_orders || 0 }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">Total Spent:</span>
                      <span class="text-sm font-medium">₱{{ (selectedCustomer.total_spent || 0).toLocaleString() }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">Average Rating:</span>
                      <span class="text-sm font-medium">
                        {{ selectedCustomer.average_rating ? selectedCustomer.average_rating.toFixed(1) : 'N/A' }}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-sm text-gray-600">Last Visit:</span>
                      <span class="text-sm font-medium">
                        {{ selectedCustomer.last_visit ? formatDate(selectedCustomer.last_visit) : 'Never' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Feedback and Ratings -->
            <div class="lg:col-span-2">
              <div class="space-y-6">
                <!-- Feedback -->
                <div>
                  <h5 class="text-lg font-medium text-gray-900 mb-4">Feedback ({{ selectedCustomer.feedback?.length || 0 }})</h5>
                  <div v-if="selectedCustomer.feedback?.length === 0" class="text-center py-8 text-gray-500">
                    No feedback submitted
                  </div>
                  <div v-else class="space-y-4 max-h-64 overflow-y-auto">
                    <div
                      v-for="feedback in selectedCustomer.feedback"
                      :key="feedback.id"
                      class="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      <div class="flex items-start justify-between mb-2">
                        <div class="flex items-center space-x-2">
                          <span class="text-sm font-medium text-gray-900">{{ feedback.name }}</span>
                          <span v-if="feedback.rating" class="flex items-center text-yellow-600">
                            <font-awesome-icon icon="fa-solid fa-star" class="w-3 h-3 mr-1" />
                            {{ feedback.rating }}
                          </span>
                        </div>
                        <span class="text-xs text-gray-500">{{ formatDate(feedback.created_at) }}</span>
                      </div>
                      <p class="text-sm text-gray-700">{{ feedback.message }}</p>
                      <div v-if="feedback.image_filename" class="mt-2">
                        <img
                          :src="`/uploads/feedback-images/${feedback.image_filename}`"
                          :alt="feedback.name"
                          class="w-20 h-20 object-cover rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Order Ratings -->
                <div>
                  <h5 class="text-lg font-medium text-gray-900 mb-4">Order Ratings ({{ selectedCustomer.ratings?.length || 0 }})</h5>
                  <div v-if="selectedCustomer.ratings?.length === 0" class="text-center py-8 text-gray-500">
                    No order ratings submitted
                  </div>
                  <div v-else class="space-y-4 max-h-64 overflow-y-auto">
                    <div
                      v-for="rating in selectedCustomer.ratings"
                      :key="rating.id"
                      class="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      <div class="flex items-start justify-between mb-2">
                        <div class="flex items-center space-x-2">
                          <span class="text-sm font-medium text-gray-900">Order #{{ rating.order_number }}</span>
                          <span v-if="rating.overall_rating" class="flex items-center text-yellow-600">
                            <font-awesome-icon icon="fa-solid fa-star" class="w-3 h-3 mr-1" />
                            {{ rating.overall_rating }}
                          </span>
                        </div>
                        <span class="text-xs text-gray-500">{{ formatDate(rating.created_at) }}</span>
                      </div>
                      <div class="text-sm text-gray-600 mb-2">
                        <p>Branch: {{ rating.branch_name }}</p>
                        <p>Cashier: {{ rating.cashier_name }}</p>
                        <p>Total: ₱{{ (rating.order_total || 0).toLocaleString() }}</p>
                      </div>
                      <p v-if="rating.comments" class="text-sm text-gray-700">{{ rating.comments }}</p>
                      <div v-if="rating.image_filename" class="mt-2">
                        <img
                          :src="`/uploads/feedback-images/${rating.image_filename}`"
                          :alt="rating.order_number"
                          class="w-20 h-20 object-cover rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
import {
  faUsers,
  faUserCheck,
  faStar,
  faDollarSign,
  faPlus,
  faEye,
  faEdit,
  faTrash,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

library.add(faUsers, faUserCheck, faStar, faDollarSign, faPlus, faEye, faEdit, faTrash, faTimes);

// Reactive data
const customers = ref([]);
const stats = ref({});
const loading = ref(false);
const saving = ref(false);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDetailsModal = ref(false);
const selectedCustomer = ref(null);
const editingCustomerId = ref(null);

// Filters
const filters = ref({
  search: '',
  city: '',
  gender: '',
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

// Customer form
const customerForm = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  province: '',
  postal_code: '',
  birth_date: '',
  gender: '',
  notes: ''
});

// Debounced search
let searchTimeout = null;
const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    filters.value.offset = 0;
    loadCustomers();
  }, 500);
};

// Methods
const loadCustomers = async () => {
  try {
    loading.value = true;
    const params = new URLSearchParams();
    
    Object.keys(filters.value).forEach(key => {
      if (filters.value[key]) {
        params.append(key, filters.value[key]);
      }
    });

    const response = await fetch(`/api/customers?${params.toString()}`);
    const data = await response.json();

    if (data.success) {
      customers.value = data.data;
      pagination.value = data.pagination;
    } else {
      console.error('Failed to load customers:', data.message);
    }
  } catch (error) {
    console.error('Error loading customers:', error);
  } finally {
    loading.value = false;
  }
};

const loadStats = async () => {
  try {
    const response = await fetch('/api/customers/stats');
    const data = await response.json();

    if (data.success) {
      stats.value = data.data;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
};

const viewCustomer = async (customerId) => {
  try {
    const response = await fetch(`/api/customers/${customerId}/details`);
    const data = await response.json();

    if (data.success) {
      selectedCustomer.value = data.data;
      showDetailsModal.value = true;
    } else {
      console.error('Failed to load customer details:', data.message);
    }
  } catch (error) {
    console.error('Error loading customer details:', error);
  }
};

const editCustomer = (customer) => {
  editingCustomerId.value = customer.id;
  customerForm.value = {
    name: customer.name,
    email: customer.email,
    phone: customer.phone || '',
    address: customer.address || '',
    city: customer.city || '',
    province: customer.province || '',
    postal_code: customer.postal_code || '',
    birth_date: customer.birth_date || '',
    gender: customer.gender || '',
    notes: customer.notes || ''
  };
  showEditModal.value = true;
};

const deleteCustomer = async (customerId) => {
  if (!confirm('Are you sure you want to delete this customer?')) {
    return;
  }

  try {
    const response = await fetch(`/api/customers/${customerId}`, {
      method: 'DELETE'
    });
    const data = await response.json();

    if (data.success) {
      await loadCustomers();
      await loadStats();
    } else {
      console.error('Failed to delete customer:', data.message);
    }
  } catch (error) {
    console.error('Error deleting customer:', error);
  }
};

const saveCustomer = async () => {
  try {
    saving.value = true;
    const url = showCreateModal.value 
      ? '/api/customers' 
      : `/api/customers/${editingCustomerId.value}`;
    
    const method = showCreateModal.value ? 'POST' : 'PUT';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customerForm.value)
    });

    const data = await response.json();

    if (data.success) {
      closeModal();
      await loadCustomers();
      await loadStats();
    } else {
      console.error('Failed to save customer:', data.message);
    }
  } catch (error) {
    console.error('Error saving customer:', error);
  } finally {
    saving.value = false;
  }
};

const closeModal = () => {
  showCreateModal.value = false;
  showEditModal.value = false;
  editingCustomerId.value = null;
  customerForm.value = {
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    birth_date: '',
    gender: '',
    notes: ''
  };
};

const closeDetailsModal = () => {
  showDetailsModal.value = false;
  selectedCustomer.value = null;
};

const previousPage = () => {
  if (pagination.value.offset > 0) {
    filters.value.offset = pagination.value.offset - pagination.value.limit;
    loadCustomers();
  }
};

const nextPage = () => {
  if (pagination.value.offset + pagination.value.limit < pagination.value.total) {
    filters.value.offset = pagination.value.offset + pagination.value.limit;
    loadCustomers();
  }
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Lifecycle
onMounted(() => {
  loadCustomers();
  loadStats();
});
</script>

<style scoped>
/* Custom styles if needed */
</style>
