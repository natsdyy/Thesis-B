<template>
  <div class="space-y-6">
    <!-- Products Header -->
    <div class="card bg-white shadow-xl border border-black/10">
      <div class="card-body">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 class="text-2xl font-bold text-primaryColor">My Products</h2>
            <p class="text-black/60 mt-1">
              Manage your product catalog and pricing
            </p>
          </div>
          <button
            @click="openCreateModal"
            class="btn bg-primaryColor text-white hover:bg-primaryColor/90 border-none btn-sm font-thin"
          >
            <Plus class="w-5 h-5 mr-2" />
            Add Product
          </button>
        </div>
      </div>
    </div>

    <!-- Search and Filter -->
    <div class="card bg-white shadow-xl border border-black/10">
      <div class="card-body p-4">
        <div class="flex flex-wrap gap-4">
          <!-- Search -->
          <div class="flex-1 min-w-[200px]">
            <div class="relative">
              <Search
                class="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-black/40"
              />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search products..."
                class="input input-bordered w-full pl-10"
                @input="handleSearch"
              />
            </div>
          </div>
          <!-- Category Filter -->
          <select
            v-model="selectedCategory"
            @change="filterByCategory"
            class="select select-bordered min-w-[200px]"
          >
            <option value="">All Categories</option>
            <option
              v-for="category in categories"
              :key="category"
              :value="category"
            >
              {{ category }}
            </option>
          </select>
          <!-- Availability Filter -->
          <select
            v-model="availabilityFilter"
            @change="loadProducts"
            class="select select-bordered min-w-[150px]"
          >
            <option value="all">All Products</option>
            <option value="available">Available Only</option>
            <option value="unavailable">Unavailable Only</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <span class="loading loading-spinner loading-lg text-primaryColor"></span>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="paginatedProducts.length === 0 && !loading"
      class="card bg-white shadow-xl border border-black/10"
    >
      <div class="card-body text-center py-12">
        <Package class="w-16 h-16 mx-auto text-black/20 mb-4" />
        <h3 class="text-lg font-semibold text-black/70 mb-2">
          No products found
        </h3>
        <p class="text-black/50 mb-4">
          {{
            searchQuery || selectedCategory
              ? 'Try adjusting your filters'
              : 'Start by adding your first product'
          }}
        </p>
        <button
          v-if="!searchQuery && !selectedCategory"
          @click="openCreateModal"
          class="btn bg-primaryColor text-white hover:bg-primaryColor/90 border-none btn-sm font-thin flex items-center justify-center mx-auto"
        >
          <Plus class="w-5 h-5 mr-2" />
          Add Your First Product
        </button>
      </div>
    </div>

    <!-- Products Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="product in paginatedProducts"
        :key="product.id"
        class="card bg-white shadow-lg border border-black/10 hover:shadow-xl transition-shadow"
      >
        <div class="card-body">
          <!-- Product Header -->
          <div class="flex items-start justify-between mb-2">
            <h3 class="card-title text-lg text-primaryColor">
              {{ product.product_name }}
            </h3>
            <div class="dropdown dropdown-end">
              <label tabindex="0" class="btn btn-ghost btn-xs btn-circle">
                <MoreVertical class="w-4 h-4" />
              </label>
              <ul
                tabindex="0"
                class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li>
                  <a @click="openEditModal(product)"
                    ><Edit class="w-4 h-4" />Edit</a
                  >
                </li>
                <li>
                  <a @click="toggleAvailability(product)">
                    <ToggleLeft v-if="product.is_available" class="w-4 h-4" />
                    <ToggleRight v-else class="w-4 h-4" />
                    {{
                      product.is_available
                        ? 'Mark Unavailable'
                        : 'Mark Available'
                    }}
                  </a>
                </li>
                <li>
                  <a @click="openPromoModal(product)">
                    <font-awesome-icon
                      icon="fa-solid fa-percentage"
                      class="w-4 h-4"
                    />
                    {{
                      product.has_promo_discount ? 'Edit Promo' : 'Add Promo'
                    }}
                  </a>
                </li>
                <li>
                  <a @click="confirmDelete(product)" class="text-error"
                    ><Trash2 class="w-4 h-4" />Delete</a
                  >
                </li>
              </ul>
            </div>
          </div>

          <!-- Category & SKU -->
          <div class="flex gap-2 mb-2">
            <span
              v-if="product.category"
              class="badge badge-sm bg-primaryColor/10 text-primaryColor"
            >
              {{ product.category }}
            </span>
            <span v-if="product.sku" class="badge badge-sm badge-ghost">
              SKU: {{ product.sku }}
            </span>
          </div>

          <!-- Description -->
          <p
            v-if="product.description"
            class="text-sm text-black/60 mb-3 line-clamp-2"
          >
            {{ product.description }}
          </p>

          <!-- Price & Unit -->
          <div class="flex items-center justify-between mb-3">
            <div>
              <div
                class="text-2xl font-bold text-primaryColor flex items-center"
              >
                <font-awesome-icon
                  icon="fa-solid fa-peso-sign"
                  class="!w-5 !h-5"
                />
                {{ formatCurrency(product.unit_price) }}
              </div>
              <div class="text-xs text-black/50">per {{ product.unit }}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-black/50">Min. Order</div>
              <div class="font-semibold">
                {{ product.minimum_order_quantity }} {{ product.unit }}
              </div>
            </div>
          </div>

          <!-- Availability Status & Promo Badge -->
          <div class="flex items-center gap-2 flex-wrap">
            <div
              class="badge badge-sm"
              :class="
                product.is_available
                  ? 'bg-success/20 text-success'
                  : 'bg-error/20 text-error'
              "
            >
              {{ product.is_available ? 'Available' : 'Unavailable' }}
            </div>
            <!-- Promo Discount Badge -->
            <div
              v-if="product.promo_info && product.promo_info.is_active"
              class="badge badge-sm bg-orange-500/20 text-orange-600"
            >
              <font-awesome-icon
                icon="fa-solid fa-percentage"
                class="!w-3 !h-3 mr-1"
              />
              {{
                product.promo_info.discount_type === 'percentage'
                  ? `${product.promo_info.discount_percentage}% OFF`
                  : `₱${product.promo_info.discount_amount} OFF`
              }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination Controls -->
    <div
      v-if="filteredProducts.length > 0 && totalPages > 1"
      class="card bg-white shadow-xl border border-black/10"
    >
      <div class="card-body">
        <div
          class="flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <!-- Pagination Info -->
          <div class="text-sm text-black/60">
            Showing {{ paginationInfo.showing }} products
          </div>

          <!-- Pagination Controls -->
          <div class="join">
            <!-- Previous Button -->
            <button
              class="join-item btn btn-sm bg-gray-200 text-black/50 border border-none hover:bg-gray-300"
              :disabled="currentPage <= 1"
              @click="currentPage--"
            >
              « Previous
            </button>

            <!-- Page Numbers -->
            <template v-for="page in getVisiblePages()" :key="page">
              <button
                v-if="page !== '...'"
                class="join-item btn btn-sm"
                :class="{
                  'bg-primaryColor text-white border-none':
                    currentPage === page,
                  'bg-gray-200 text-black/50 border border-none hover:bg-gray-300':
                    currentPage !== page,
                }"
                @click="currentPage = page"
              >
                {{ page }}
              </button>
              <span
                v-else
                class="join-item btn btn-sm bg-gray-200 text-black/50 border border-none cursor-default"
              >
                ...
              </span>
            </template>

            <!-- Next Button -->
            <button
              class="join-item btn btn-sm bg-gray-200 text-black/50 border border-none hover:bg-gray-300"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
            >
              Next »
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <dialog id="product_modal" class="modal" :open="showModal">
      <div class="modal-box max-w-2xl w-11/12">
        <h3 class="font-bold text-lg text-primaryColor mb-4">
          {{ editMode ? 'Edit Product' : 'Add New Product' }}
        </h3>

        <form @submit.prevent="saveProduct" class="space-y-4">
          <!-- Product Name -->
          <div
            class="grid gap-2 md:gap-4 md:grid-cols-[140px_1fr] items-start md:items-center"
          >
            <label class="text-sm font-medium text-gray-700"
              >Product Name *</label
            >
            <input
              v-model="formData.product_name"
              type="text"
              placeholder="Enter product name"
              class="input input-bordered w-full"
              required
            />
          </div>

          <!-- Description -->
          <div class="grid gap-2 md:gap-4 md:grid-cols-[140px_1fr] items-start">
            <label class="text-sm font-medium text-gray-700 pt-3"
              >Description</label
            >
            <textarea
              v-model="formData.description"
              placeholder="Enter product description"
              class="textarea textarea-bordered w-full"
              rows="3"
            ></textarea>
          </div>

          <!-- Item Type (filtered by supplier's category) -->
          <div
            class="grid gap-2 md:gap-4 md:grid-cols-[140px_1fr] items-start md:items-center"
          >
            <label class="text-sm font-medium text-gray-700">Item Type</label>
            <select
              v-model.number="formData.item_type_id"
              @change="onItemTypeChange"
              class="select select-bordered w-full"
            >
              <option :value="null">Select item type (optional)</option>
              <option
                v-for="itemType in supplierItemTypes"
                :key="itemType.id"
                :value="itemType.id"
              >
                {{ itemType.name }}
              </option>
            </select>
          </div>

          <div
            class="grid gap-2 md:gap-4 md:grid-cols-[140px_1fr] items-start md:items-center"
          >
            <label class="text-sm font-medium text-gray-700">SKU</label>
            <input
              v-model="formData.sku"
              type="text"
              placeholder="Stock keeping unit"
              class="input input-bordered w-full"
            />
          </div>

          <!-- Unit Price -->
          <div
            class="grid gap-2 md:gap-4 md:grid-cols-[140px_1fr] items-start md:items-center"
          >
            <label class="text-sm font-medium text-gray-700"
              >Unit Price (₱) *</label
            >
            <input
              v-model.number="formData.unit_price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              class="input input-bordered w-full"
              required
            />
          </div>

          <!-- Unit -->
          <div
            class="grid gap-2 md:gap-4 md:grid-cols-[140px_1fr] items-start md:items-center"
          >
            <label class="text-sm font-medium text-gray-700">Unit *</label>
            <!-- Dynamic behavior: Other Materials => common units dropdown; Beverages => beverage units dropdown; otherwise auto-filled readonly -->
            <template v-if="selectedItemType">
              <select
                v-if="isOtherMaterialsSelected"
                v-model="formData.unit"
                class="select select-bordered w-full"
                required
              >
                <option value="" disabled>Select Unit</option>
                <option v-for="u in commonUnitOptions" :key="u" :value="u">
                  {{ u }}
                </option>
              </select>
              <select
                v-else-if="isBeverageSelected"
                v-model="formData.unit"
                class="select select-bordered w-full"
                required
              >
                <option value="" disabled>Select Unit</option>
                <option v-for="u in beverageUnitOptions" :key="u" :value="u">
                  {{ u }}
                </option>
              </select>
              <input
                v-else
                v-model="formData.unit"
                type="text"
                class="input input-bordered w-full bg-gray-100 cursor-not-allowed"
                readonly
                placeholder="Auto-filled from item type"
              />
            </template>
            <select
              v-else
              v-model="formData.unit"
              class="select select-bordered w-full"
              required
            >
              <option value="" disabled>Select Unit</option>
              <option v-for="u in commonUnitOptions" :key="u" :value="u">
                {{ u }}
              </option>
            </select>
          </div>

          <!-- Minimum Order Quantity -->
          <div
            class="grid gap-2 md:gap-4 md:grid-cols-[140px_1fr] items-start md:items-center"
          >
            <label class="text-sm font-medium text-gray-700"
              >Min. Order Qty</label
            >
            <input
              v-model.number="formData.minimum_order_quantity"
              type="number"
              min="1"
              placeholder="1"
              class="input input-bordered w-full"
            />
          </div>

          <!-- Availability -->
          <div
            class="grid gap-2 md:gap-4 md:grid-cols-[140px_1fr] items-start md:items-center"
          >
            <label class="text-sm font-medium text-gray-700"
              >Available for Order</label
            >
            <input
              v-model="formData.is_available"
              type="checkbox"
              class="toggle checked:text-gray-50"
            />
          </div>

          <!-- Modal Actions -->
          <div class="modal-action">
            <button
              type="button"
              @click="closeModal"
              class="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn bg-primaryColor text-white hover:bg-primaryColor/90 border-none btn-sm font-thin"
              :disabled="saving"
            >
              <span
                v-if="saving"
                class="loading loading-spinner loading-sm"
              ></span>
              {{ editMode ? 'Update Product' : 'Add Product' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeModal">close</button>
      </form>
    </dialog>

    <!-- Delete Confirmation Modal -->
    <dialog id="delete_modal" class="modal" :open="showDeleteModal">
      <div class="modal-box">
        <h3 class="font-bold text-lg text-error mb-4">Confirm Delete</h3>
        <p class="mb-4">
          Are you sure you want to delete "{{ productToDelete?.product_name }}"?
          This action cannot be undone.
        </p>
        <div class="modal-action">
          <button @click="closeDeleteModal" class="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button
            @click="deleteProduct"
            class="btn btn-error btn-sm border-none font-thin"
            :disabled="deleting"
          >
            <span
              v-if="deleting"
              class="loading loading-spinner loading-sm"
            ></span>
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDeleteModal">close</button>
      </form>
    </dialog>

    <!-- Promo Discount Modal -->
    <dialog id="promo_modal" class="modal" :open="showPromoModal">
      <div class="modal-box max-w-2xl w-11/12">
        <h3 class="font-bold text-lg text-primaryColor mb-4">
          {{
            promoFormData.has_promo_discount
              ? 'Edit Promo Discount'
              : 'Add Promo Discount'
          }}
        </h3>

        <form @submit.prevent="savePromoDiscount" class="space-y-4">
          <!-- Enable Promo Toggle -->
          <div
            class="grid gap-2 md:gap-4 md:grid-cols-[140px_1fr] items-start md:items-center"
          >
            <label class="text-sm font-medium text-gray-700"
              >Enable Promo</label
            >
            <input
              v-model="promoFormData.has_promo_discount"
              type="checkbox"
              class="toggle checked:text-gray-50"
            />
          </div>

          <!-- Promo Fields (shown when promo is enabled) -->
          <div
            v-if="promoFormData.has_promo_discount"
            class="space-y-4 border-t pt-4"
          >
            <!-- Discount Type -->
            <div
              class="grid gap-2 md:gap-4 md:grid-cols-[140px_1fr] items-start md:items-center"
            >
              <label class="text-sm font-medium text-gray-700"
                >Discount Type</label
              >
              <select
                v-model="promoFormData.promo_discount_type"
                class="select select-bordered w-full"
                required
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed_amount">Fixed Amount (₱)</option>
              </select>
            </div>

            <!-- Discount Value -->
            <div
              class="grid gap-2 md:gap-4 md:grid-cols-[140px_1fr] items-start md:items-center"
            >
              <label class="text-sm font-medium text-gray-700">
                {{
                  promoFormData.promo_discount_type === 'percentage'
                    ? 'Discount %'
                    : 'Discount Amount (₱)'
                }}
              </label>
              <input
                v-model.number="
                  promoFormData[
                    promoFormData.promo_discount_type === 'percentage'
                      ? 'promo_discount_percentage'
                      : 'promo_discount_amount'
                  ]
                "
                type="number"
                :min="0"
                :max="
                  promoFormData.promo_discount_type === 'percentage'
                    ? 100
                    : null
                "
                :step="
                  promoFormData.promo_discount_type === 'percentage' ? 1 : 0.01
                "
                :placeholder="
                  promoFormData.promo_discount_type === 'percentage'
                    ? 'e.g., 10'
                    : 'e.g., 50.00'
                "
                class="input input-bordered w-full"
                required
              />
            </div>

            <!-- Minimum Quantity -->
            <div
              class="grid gap-2 md:gap-4 md:grid-cols-[140px_1fr] items-start md:items-center"
            >
              <label class="text-sm font-medium text-gray-700"
                >Min. Quantity</label
              >
              <input
                v-model.number="promoFormData.promo_minimum_quantity"
                type="number"
                min="1"
                placeholder="e.g., 5"
                class="input input-bordered w-full"
                required
              />
            </div>

            <!-- Promo Description -->
            <div
              class="grid gap-2 md:gap-4 md:grid-cols-[140px_1fr] items-start"
            >
              <label class="text-sm font-medium text-gray-700 pt-3"
                >Description</label
              >
              <textarea
                v-model="promoFormData.promo_description"
                placeholder="e.g., Buy 5 or more and get 10% discount"
                class="textarea textarea-bordered w-full"
                rows="2"
              ></textarea>
            </div>

            <!-- Date Range -->
            <div
              class="grid gap-2 md:gap-4 md:grid-cols-[140px_1fr] items-start md:items-center"
            >
              <label class="text-sm font-medium text-gray-700"
                >Start Date</label
              >
              <input
                v-model="promoFormData.promo_start_date"
                type="datetime-local"
                class="input input-bordered w-full"
              />
            </div>

            <div
              class="grid gap-2 md:gap-4 md:grid-cols-[140px_1fr] items-start md:items-center"
            >
              <label class="text-sm font-medium text-gray-700">End Date</label>
              <input
                v-model="promoFormData.promo_end_date"
                type="datetime-local"
                class="input input-bordered w-full"
              />
            </div>

            <!-- Preview -->
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 class="font-semibold text-orange-800 mb-2">Promo Preview:</h4>
              <p class="text-sm text-orange-700 mb-2">
                <span v-if="promoFormData.promo_discount_type === 'percentage'">
                  {{ promoFormData.promo_discount_percentage || 0 }}% OFF
                </span>
                <span v-else>
                  ₱{{ promoFormData.promo_discount_amount || 0 }} OFF
                </span>
                when buying {{ promoFormData.promo_minimum_quantity || 1 }} or
                more
              </p>
              <div
                v-if="
                  promoFormData.promo_start_date || promoFormData.promo_end_date
                "
                class="text-xs text-orange-600"
              >
                <div v-if="promoFormData.promo_start_date">
                  <strong>Starts:</strong>
                  {{ formatForDisplay(promoFormData.promo_start_date) }}
                  {{ formatTimeForDisplay(promoFormData.promo_start_date) }}
                </div>
                <div v-if="promoFormData.promo_end_date">
                  <strong>Ends:</strong>
                  {{ formatForDisplay(promoFormData.promo_end_date) }}
                  {{ formatTimeForDisplay(promoFormData.promo_end_date) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="modal-action">
            <button
              type="button"
              @click="closePromoModal"
              class="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn bg-orange-500 text-white hover:bg-orange-600 border-none btn-sm font-thin"
              :disabled="savingPromo"
            >
              <span
                v-if="savingPromo"
                class="loading loading-spinner loading-sm"
              ></span>
              {{
                promoFormData.has_promo_discount ? 'Update Promo' : 'Add Promo'
              }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closePromoModal">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import { useCustomToast } from '../../composables/useCustomToast';
  import { useSupplierAuthStore } from '../../stores/supplierAuthStore';
  import { useSupplierProductsStore } from '../../stores/supplierProductsStore';
  import {
    formatForAPI,
    parseFromAPI,
    formatForDisplay,
    formatTimeForDisplay,
  } from '../../utils/timezoneUtils';
  import {
    Plus,
    Search,
    Package,
    Edit,
    Trash2,
    MoreVertical,
    ToggleLeft,
    ToggleRight,
  } from 'lucide-vue-next';

  const supplierAuthStore = useSupplierAuthStore();
  const { showError, showSuccess } = useCustomToast();
  const productsStore = useSupplierProductsStore();

  // State
  const saving = ref(false);
  const deleting = ref(false);
  const savingPromo = ref(false);
  const searchQuery = ref('');
  const selectedCategory = ref('');
  const availabilityFilter = ref('all');
  const showModal = ref(false);
  const showDeleteModal = ref(false);
  const showPromoModal = ref(false);
  const editMode = ref(false);
  const productToDelete = ref(null);
  const productForPromo = ref(null);

  // Pagination state
  const currentPage = ref(1);
  const itemsPerPage = ref(6);

  const formData = ref({
    product_name: '',
    description: '',
    item_type_id: null,
    unit: 'pcs',
    unit_price: 0,
    minimum_order_quantity: 1,
    is_available: true,
    sku: '',
    image_url: '',
  });

  const promoFormData = ref({
    has_promo_discount: false,
    promo_minimum_quantity: 1,
    promo_discount_percentage: 0,
    promo_discount_amount: 0,
    promo_discount_type: 'percentage',
    promo_description: '',
    promo_start_date: '',
    promo_end_date: '',
  });

  // Computed
  const categories = computed(() => {
    const categorySet = new Set();
    (productsStore.products || []).forEach((product) => {
      if (product.category && product.category.trim()) {
        categorySet.add(product.category);
      }
    });
    return Array.from(categorySet).sort();
  });

  const filteredProducts = computed(() => {
    let filtered = [...(productsStore.products || [])];

    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.product_name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory.value) {
      filtered = filtered.filter((p) => p.category === selectedCategory.value);
    }

    // Filter by availability
    if (availabilityFilter.value === 'available') {
      filtered = filtered.filter((p) => p.is_available);
    } else if (availabilityFilter.value === 'unavailable') {
      filtered = filtered.filter((p) => !p.is_available);
    }

    return filtered;
  });

  // Pagination computed properties
  const totalPages = computed(() => {
    return Math.ceil(filteredProducts.value.length / itemsPerPage.value);
  });

  const paginatedProducts = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return filteredProducts.value.slice(start, end);
  });

  const paginationInfo = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value + 1;
    const end = Math.min(
      currentPage.value * itemsPerPage.value,
      filteredProducts.value.length
    );
    const total = filteredProducts.value.length;

    return {
      start,
      end,
      total,
      showing: total > 0 ? `${start}-${end} of ${total}` : '0 of 0',
    };
  });

  const loading = computed(() => productsStore.loading);
  const itemTypes = computed(() => productsStore.itemTypes || []);

  // Filter item types based on supplier's category
  const supplierItemTypes = computed(() => {
    const supplierCategory = supplierAuthStore.supplier?.category;
    if (!supplierCategory) {
      return itemTypes.value; // Show all if no category assigned
    }

    // Filter item types that match supplier's category
    return itemTypes.value.filter(
      (itemType) => itemType.category_name === supplierCategory
    );
  });

  // Auto-populate unit when item type is selected
  const onItemTypeChange = () => {
    if (formData.value.item_type_id) {
      const selectedItemType = itemTypes.value.find(
        (it) => it.id === formData.value.item_type_id
      );

      if (selectedItemType?.name === 'Other Materials') {
        // For Other Materials, require manual unit selection
        formData.value.unit = '';
      } else if (selectedItemType && selectedItemType.unit_of_measure) {
        formData.value.unit = selectedItemType.unit_of_measure;
      }
    }
  };

  // Shared unit options (same as RequestSupply.vue for dynamic-unit types)
  const commonUnitOptions = [
    'pieces',
    'kg',
    'liters',
    'boxes',
    'cases',
    'packs',
    'sets',
    'reams',
    'bottles',
    'cans',
    'bags',
    'rolls',
    'sheets',
    'meters',
    'yards',
    'dozens',
    'pairs',
    'units',
    'items',
    'containers',
  ];

  const selectedItemType = computed(
    () =>
      itemTypes.value.find((it) => it.id === formData.value.item_type_id) ||
      null
  );

  const isOtherMaterialsSelected = computed(
    () => selectedItemType.value?.name === 'Other Materials'
  );

  // Beverage-specific options from RequestSupply.vue and selector
  const beverageUnitOptions = ['liters', 'bottles', 'pieces', 'cans'];
  const isBeverageSelected = computed(
    () => selectedItemType.value?.category_name === 'Beverages'
  );

  // Methods
  const formatCurrency = (amount) => {
    return Number(amount || 0).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const loadProducts = async () => {
    try {
      await productsStore.fetchProducts();
      // Reset pagination when loading new products
      resetPagination();
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const loadItemTypes = async () => {
    try {
      await productsStore.fetchItemTypes();
    } catch (error) {
      console.error('Failed to load item types:', error);
    }
  };

  const handleSearch = () => {
    resetPagination();
  };

  const filterByCategory = () => {
    resetPagination();
  };

  const openCreateModal = () => {
    editMode.value = false;
    formData.value = {
      product_name: '',
      description: '',
      item_type_id: null,
      unit: 'pcs',
      unit_price: 0,
      minimum_order_quantity: 1,
      is_available: true,
      sku: '',
      image_url: '',
    };
    showModal.value = true;
  };

  const openEditModal = (product) => {
    editMode.value = true;
    formData.value = { ...product };
    showModal.value = true;
  };

  const closeModal = () => {
    showModal.value = false;
  };

  const saveProduct = async () => {
    saving.value = true;
    try {
      if (editMode.value) {
        await productsStore.updateProduct(formData.value.id, formData.value);
      } else {
        await productsStore.createProduct(formData.value);
      }
      closeModal();
    } catch (error) {
      console.error('Failed to save product:', error);
      showError(error.response?.data?.message || 'Failed to save product');
    } finally {
      saving.value = false;
    }
  };

  const confirmDelete = (product) => {
    productToDelete.value = product;
    showDeleteModal.value = true;
  };

  const closeDeleteModal = () => {
    showDeleteModal.value = false;
    productToDelete.value = null;
  };

  const deleteProduct = async () => {
    if (!productToDelete.value) return;

    deleting.value = true;
    try {
      await productsStore.deleteProduct(productToDelete.value.id);
      closeDeleteModal();
    } catch (error) {
      console.error('Failed to delete product:', error);
      showError(error.response?.data?.message || 'Failed to delete product');
    } finally {
      deleting.value = false;
    }
  };

  const toggleAvailability = async (product) => {
    try {
      await productsStore.toggleAvailability(product.id);
    } catch (error) {
      console.error('Failed to toggle availability:', error);
      showError(
        error.response?.data?.message || 'Failed to update availability'
      );
    }
  };

  // Pagination methods
  const getVisiblePages = () => {
    const total = totalPages.value;
    const current = currentPage.value;
    const pages = [];

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);

      if (current <= 4) {
        // Show first 5 pages + ellipsis + last page
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 3) {
        // Show first page + ellipsis + last 5 pages
        pages.push('...');
        for (let i = total - 4; i <= total; i++) {
          pages.push(i);
        }
      } else {
        // Show first page + ellipsis + current-1, current, current+1 + ellipsis + last page
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total);
      }
    }

    return pages;
  };

  const resetPagination = () => {
    currentPage.value = 1;
  };

  // Helper function to format date for datetime-local input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = parseFromAPI(dateString);
    return date.toISOString().substring(0, 16);
  };

  // Promo discount methods
  const openPromoModal = (product) => {
    productForPromo.value = product;
    promoFormData.value = {
      has_promo_discount: product.has_promo_discount || false,
      promo_minimum_quantity: product.promo_minimum_quantity || 1,
      promo_discount_percentage: product.promo_discount_percentage || 0,
      promo_discount_amount: product.promo_discount_amount || 0,
      promo_discount_type: product.promo_discount_type || 'percentage',
      promo_description: product.promo_description || '',
      promo_start_date: formatDateForInput(product.promo_start_date),
      promo_end_date: formatDateForInput(product.promo_end_date),
    };
    showPromoModal.value = true;
  };

  const closePromoModal = () => {
    showPromoModal.value = false;
    productForPromo.value = null;
    promoFormData.value = {
      has_promo_discount: false,
      promo_minimum_quantity: 1,
      promo_discount_percentage: 0,
      promo_discount_amount: 0,
      promo_discount_type: 'percentage',
      promo_description: '',
      promo_start_date: '',
      promo_end_date: '',
    };
  };

  const savePromoDiscount = async () => {
    if (!productForPromo.value) return;

    savingPromo.value = true;
    try {
      const promoData = {
        supplier_id: supplierAuthStore.supplier.id,
        ...promoFormData.value,
      };

      // Convert datetime-local to ISO string using timezone utilities
      if (promoData.promo_start_date) {
        promoData.promo_start_date = formatForAPI(
          new Date(promoData.promo_start_date)
        );
      }
      if (promoData.promo_end_date) {
        promoData.promo_end_date = formatForAPI(
          new Date(promoData.promo_end_date)
        );
      }

      await productsStore.togglePromoDiscount(
        productForPromo.value.id,
        promoData
      );
      closePromoModal();
      showSuccess('Promo discount updated successfully');
    } catch (error) {
      console.error('Failed to save promo discount:', error);
      showError(
        error.response?.data?.message || 'Failed to save promo discount'
      );
    } finally {
      savingPromo.value = false;
    }
  };

  // Watchers
  watch(availabilityFilter, () => {
    resetPagination();
  });

  watch(searchQuery, () => {
    resetPagination();
  });

  watch(selectedCategory, () => {
    resetPagination();
  });

  // Lifecycle
  onMounted(() => {
    loadProducts();
    loadItemTypes();
  });
</script>

<style scoped>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
