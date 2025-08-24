<template>
  <div class="container mx-auto p-2 sm:p-4 lg:p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6 lg:mb-8">
      <h1
        class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primaryColor mb-2 text-shadow-xs"
      >
        Supplier Management
      </h1>
      <p class="text-sm sm:text-base text-black/50 px-2">
        Manage and track suppliers for Countryside Steakhouse.
      </p>
    </div>

    <!-- Stats -->
    <div
      class="stats shadow w-full mb-4 sm:mb-6 bg-accentColor border border-black/10 stats-vertical lg:stats-horizontal xl:stats-horizontal rounded-lg"
    >
      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Building2
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-primaryColor"
          />
        </div>
        <div class="stat-title text-black/50 text-xs sm:text-sm">
          Total Suppliers
        </div>
        <div
          class="stat-value text-primaryColor text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ supplierStats.total }}
        </div>
        <div class="stat-desc text-black/50 text-xs sm:text-sm">
          Registered suppliers
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <CheckCircle
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-success"
          />
        </div>
        <div class="stat-title text-black/50 text-xs sm:text-sm">
          Active Suppliers
        </div>
        <div
          class="stat-value text-success text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ supplierStats.active }}
        </div>
        <div class="stat-desc text-black/50 text-xs sm:text-sm">
          Currently active
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <XCircle class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-error" />
        </div>
        <div class="stat-title text-black/50 text-xs sm:text-sm">
          Inactive Suppliers
        </div>
        <div
          class="stat-value text-error text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ supplierStats.inactive }}
        </div>
        <div class="stat-desc text-black/50 text-xs sm:text-sm">
          Suspended or inactive
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Building2 class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-info" />
        </div>
        <div class="stat-title text-black/50 text-xs sm:text-sm">
          Total Orders
        </div>
        <div
          class="stat-value text-info text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ supplierStats.totalOrders }}
        </div>
        <div class="stat-desc text-black/50 text-xs sm:text-sm">
          Across all suppliers
        </div>
      </div>
    </div>

    <!-- Supplier List -->
    <div
      class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10 mx-auto"
    >
      <div class="card-body p-3 sm:p-4 lg:p-6">
        <!-- Header with responsive buttons -->
        <div
          class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4"
        >
          <h2
            class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl"
          >
            Supplier Directory
          </h2>

          <!-- Mobile: Stacked buttons -->
          <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div class="grid grid-cols-1 sm:flex gap-2">
              <button
                class="btn btn-outline btn-xs sm:btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
                @click="clearFilters"
              >
                <RefreshCcw
                  class="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-primaryColor"
                />
                <span class="hidden sm:inline">Clear Filters</span>
                <span class="sm:hidden">Clear</span>
              </button>
              <!-- NEW: Toggle deleted suppliers view -->
              <button
                class="btn btn-outline btn-xs sm:btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
                @click="toggleDeletedView"
              >
                <Trash2
                  class="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-primaryColor"
                />
                <span class="hidden sm:inline">
                  {{ showDeleted ? 'Hide Deleted' : 'Show Deleted' }}
                </span>
                <span class="sm:hidden">
                  {{ showDeleted ? 'Hide' : 'Show' }}
                </span>
              </button>
            </div>
            <button
              v-if="!showDeleted"
              class="btn btn-outline btn-xs sm:btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
              @click="openModal('create')"
            >
              <Plus
                class="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-primaryColor"
              />
              Add Supplier
            </button>
          </div>
        </div>

        <!-- Search and Filters -->
        <div class="mb-4 sm:mb-6">
          <!-- Search Bar -->
          <div class="flex flex-col gap-3 sm:gap-4 mb-4">
            <div class="flex-1 relative">
              <Search
                class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 !text-black"
              />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search suppliers..."
                class="input input-sm sm:input-md input-bordered bg-white border-primaryColor/30 text-black/70 pl-10 w-full shadow-none text-sm sm:text-base"
              />
            </div>
          </div>

          <!-- Filter Buttons - Responsive Layout -->
          <div
            class="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:gap-2 mb-4"
          >
            <!-- Status Filters -->
            <div class="flex flex-col sm:flex-row gap-2">
              <span
                class="text-xs sm:text-sm text-black/70 font-medium self-start sm:self-center"
                >Status:</span
              >
              <div class="flex flex-wrap gap-1 sm:gap-2">
                <button
                  v-for="status in statuses"
                  :key="status"
                  class="btn btn-xs font-thin border border-primaryColor/30 text-xs"
                  :class="{
                    'bg-primaryColor text-white': statusFilter === status,
                    'bg-white text-primaryColor hover:bg-primaryColor/10':
                      statusFilter !== status,
                  }"
                  @click="statusFilter = statusFilter === status ? '' : status"
                >
                  {{ status }}
                  <span
                    class="badge badge-xs ml-1 bg-secondaryColor border-none"
                  >
                    {{
                      mockSuppliers.filter((s) => s.status === status).length
                    }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Category Filters -->
            <div class="flex flex-col sm:flex-row gap-2">
              <span
                class="text-xs sm:text-sm text-black/70 font-medium self-start sm:self-center"
                >Category:</span
              >
              <select
                v-model="categoryFilter"
                class="select select-xs sm:select-sm select-bordered bg-white border-primaryColor/30 text-black/70 text-xs sm:text-sm"
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
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="filteredSuppliers.length === 0"
          class="text-center py-8"
        >
          <div class="mb-4 items-center justify-center flex">
            <Building2 class="w-12 h-12 sm:w-16 sm:h-16 text-primaryColor" />
          </div>
          <h3 class="text-base sm:text-lg font-semibold mb-2 text-primaryColor">
            No suppliers found
          </h3>
          <p class="text-sm sm:text-base text-black/50 mb-4 px-4">
            Try adjusting your search criteria or add a new supplier.
          </p>
          <button
            class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
            @click="openModal('create')"
          >
            <Plus class="w-4 h-4 mr-2" />
            Add New Supplier
          </button>
        </div>

        <!-- Supplier Grid - Responsive -->
        <div
          v-else
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
        >
          <div
            v-for="supplier in paginatedSuppliers"
            :key="supplier.id"
            class="card bg-white shadow-md border border-black/10 hover:shadow-lg transition-shadow duration-200"
          >
            <div class="card-body p-3 sm:p-4">
              <!-- Header -->
              <div class="flex justify-between items-start mb-3">
                <div class="flex-1 min-w-0">
                  <h3
                    class="font-semibold text-black truncate text-sm sm:text-base"
                  >
                    {{ supplier.name }}
                  </h3>
                  <p class="text-xs sm:text-sm text-black/60 truncate">
                    {{ supplier.category }}
                  </p>
                </div>
                <div class="dropdown dropdown-left">
                  <label
                    tabindex="0"
                    class="btn btn-ghost btn-xs hover:outline-none hover:bg-white/10"
                  >
                    <EllipsisVertical class="w-3 h-3 sm:w-4 sm:h-4" />
                  </label>
                  <ul
                    tabindex="0"
                    class="dropdown-content z-[1] menu p-2 shadow bg-white rounded-box w-28 sm:w-32 border border-black/10"
                  >
                    <li class="hover:bg-black/10">
                      <a
                        @click="openModal('view', supplier)"
                        class="text-primary text-xs sm:text-sm"
                        >View Details</a
                      >
                    </li>
                    <!-- Show different options based on deleted status -->
                    <template v-if="!showDeleted">
                      <li class="hover:bg-black/10">
                        <a
                          @click="openModal('edit', supplier)"
                          class="text-warning text-xs sm:text-sm"
                          >Edit</a
                        >
                      </li>
                      <li class="hover:bg-black/10">
                        <a
                          @click="openConfirmModal('delete', supplier)"
                          class="text-error text-xs sm:text-sm"
                          >Delete</a
                        >
                      </li>
                    </template>
                    <!-- Show restore option for deleted suppliers -->
                    <template v-else>
                      <li class="hover:bg-black/10">
                        <a
                          @click="openConfirmModal('restore', supplier)"
                          class="text-success text-xs sm:text-sm"
                          >Restore</a
                        >
                      </li>
                    </template>
                  </ul>
                </div>
              </div>

              <!-- Contact Info -->
              <div class="space-y-2 mb-3">
                <!-- Replace the supplier card section with this updated version -->
                <div class="flex items-center text-xs sm:text-sm">
                  <span class="font-medium text-black/70 w-16 sm:w-20"
                    >Contact:</span
                  >
                  <span class="text-black truncate">{{
                    supplier.contact_person || 'N/A'
                  }}</span>
                </div>
                <div class="flex items-center text-xs sm:text-sm">
                  <Mail class="w-3 h-3 mr-1 text-black/50 flex-shrink-0" />
                  <span class="text-black/70 truncate">{{
                    supplier.email || 'N/A'
                  }}</span>
                </div>
                <div class="flex items-center text-xs sm:text-sm">
                  <Phone class="w-3 h-3 mr-1 text-black/50 flex-shrink-0" />
                  <span class="text-black/70 truncate">{{
                    formatPhone(supplier.phone)
                  }}</span>
                </div>
              </div>

              <!-- Status and Rating -->
              <div class="flex justify-between items-center mb-3">
                <div
                  class="badge badge-xs sm:badge-sm border-none"
                  :class="getStatusColor(supplier.status)"
                >
                  {{ supplier.status }}
                </div>
                <div class="flex items-center text-xs sm:text-sm">
                  <span class="text-black/70 mr-1">Rating:</span>
                  <span
                    class="font-medium"
                    :class="
                      getSupplierRating(supplier) > 0
                        ? 'text-warning'
                        : 'text-black/30'
                    "
                  >
                    {{ getSupplierRatingDisplay(supplier) }}
                  </span>
                </div>
              </div>

              <!-- Update the stats section -->
              <div class="flex justify-between text-xs text-black/60 mb-3">
                <span>Orders: {{ supplier.total_orders || 0 }}</span>
                <span class="truncate ml-2"
                  >Last: {{ formatDate(supplier.last_order_date) }}</span
                >
              </div>

              <!-- Address -->
              <div class="flex items-start text-xs text-black/60">
                <MapPin class="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                <span class="line-clamp-2">{{ supplier.address }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination - Responsive -->
        <div
          class="flex flex-col sm:flex-row justify-between items-center mt-4 sm:mt-6 gap-3"
          v-if="totalPages > 1"
        >
          <div
            class="text-xs sm:text-sm text-black/60 text-center sm:text-left"
          >
            Showing {{ (currentPage - 1) * suppliersPerPage + 1 }} to
            {{
              Math.min(currentPage * suppliersPerPage, filteredSuppliers.length)
            }}
            of {{ filteredSuppliers.length }} suppliers
          </div>

          <div class="join space-x-1">
            <button
              class="join-item btn font-thin !bg-gray-200 text-black/50 btn-xs sm:btn-sm border border-none hover:bg-gray-300"
              :disabled="currentPage <= 1"
              @click="currentPage--"
            >
              « Prev
            </button>

            <!-- Mobile: Show fewer page numbers -->
            <template v-if="isMobile">
              <button
                v-for="page in getVisiblePages()"
                :key="page"
                class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-xs sm:btn-sm shadow-none"
                :class="{
                  'btn-active': currentPage === page,
                  '!bg-primaryColor text-white': currentPage === page,
                }"
                @click="currentPage = page"
              >
                {{ page }}
              </button>
            </template>

            <!-- Desktop: Show all page numbers -->
            <template v-else>
              <button
                class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-xs sm:btn-sm shadow-none"
                v-for="page in totalPages"
                :key="page"
                :class="{
                  'btn-active': currentPage === page,
                  '!bg-primaryColor text-white': currentPage === page,
                }"
                @click="currentPage = page"
              >
                {{ page }}
              </button>
            </template>

            <button
              class="join-item btn font-thin btn-xs sm:btn-sm !bg-gray-200 text-black/50 border border-none"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
            >
              Next »
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Supplier Modal - Responsive -->
  <dialog id="supplier_modal" class="modal">
    <div
      class="modal-box bg-accentColor text-black/50 shadow-lg max-w-4xl w-11/12 max-h-[90vh] overflow-y-auto"
    >
      <h3 class="font-bold text-lg sm:text-xl mb-4 text-primaryColor">
        {{
          modal.type === 'create'
            ? 'Add New Supplier'
            : modal.type === 'edit'
              ? 'Edit Supplier'
              : 'Supplier Details'
        }}
      </h3>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <!-- Basic Information -->
        <div class="form-control">
          <label class="label mb-1">
            <span
              class="label-text text-black/70 font-medium text-sm sm:text-base"
              >Supplier Name <span class="text-red-500">*</span></span
            >
          </label>
          <input
            v-model="supplierForm.name"
            type="text"
            placeholder="Enter supplier name"
            class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            :readonly="modal.type === 'view'"
            required
          />
        </div>

        <div class="form-control">
          <label class="label mb-1">
            <span
              class="label-text text-black/70 font-medium text-sm sm:text-base"
              >Contact Person <span class="text-red-500">*</span></span
            >
          </label>
          <input
            v-model="supplierForm.contact_person"
            type="text"
            placeholder="Enter contact person name"
            class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            :readonly="modal.type === 'view'"
            required
          />
        </div>

        <div class="form-control">
          <label class="label mb-1">
            <span
              class="label-text text-black/70 font-medium text-sm sm:text-base"
              >Email Address <span class="text-red-500">*</span></span
            >
          </label>
          <input
            v-model="supplierForm.email"
            type="email"
            placeholder="Enter email address"
            class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            :readonly="modal.type === 'view'"
            required
          />
        </div>

        <div class="form-control">
          <label class="label mb-1">
            <span
              class="label-text text-black/70 font-medium text-sm sm:text-base"
              >Phone Number</span
            >
          </label>
          <input
            v-model="supplierForm.phone"
            type="tel"
            placeholder="Enter phone number"
            class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            :readonly="modal.type === 'view'"
          />
        </div>

        <div class="form-control">
          <label class="label mb-1">
            <span
              class="label-text text-black/70 font-medium text-sm sm:text-base"
              >Category</span
            >
          </label>
          <select
            v-model="supplierForm.category"
            class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            :disabled="modal.type === 'view'"
          >
            <option value="" disabled>Select Category</option>
            <option
              v-for="category in categories"
              :key="category"
              :value="category"
            >
              {{ category }}
            </option>
          </select>
        </div>

        <div class="form-control">
          <label class="label mb-1">
            <span
              class="label-text text-black/70 font-medium text-sm sm:text-base"
              >Status</span
            >
          </label>
          <select
            v-model="supplierForm.status"
            class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            :disabled="modal.type === 'view'"
          >
            <option v-for="status in statuses" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
        </div>

        <div class="form-control lg:col-span-2">
          <label class="label">
            <span
              class="label-text text-black/70 font-medium text-sm sm:text-base"
              >Address</span
            >
          </label>
          <textarea
            v-model="supplierForm.address"
            placeholder="Enter complete address"
            class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            rows="2"
            :readonly="modal.type === 'view'"
          ></textarea>
        </div>

        <div class="form-control lg:col-span-2">
          <label class="label">
            <span
              class="label-text text-black/70 font-medium text-sm sm:text-base"
              >Notes</span
            >
          </label>
          <textarea
            v-model="supplierForm.notes"
            placeholder="Enter additional notes or comments"
            class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            rows="3"
            :readonly="modal.type === 'view'"
          ></textarea>
        </div>
      </div>

      <!-- Modal Actions -->
      <div class="modal-action flex-col sm:flex-row gap-2">
        <button
          class="btn btn-sm font-thin bg-gray-200 text-black/50 border-none hover:bg-gray-300 shadow-none w-full sm:w-auto"
          @click="closeModal"
          :disabled="loading"
        >
          {{ modal.type === 'view' ? 'Close' : 'Cancel' }}
        </button>
        <button
          v-if="modal.type !== 'view'"
          class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80 w-full sm:w-auto"
          @click="
            modal.type === 'create'
              ? handleCreateSupplier()
              : handleUpdateSupplier()
          "
          :disabled="loading"
        >
          <span
            class="loading loading-spinner loading-xs mr-2"
            v-if="loading"
          ></span>
          {{ modal.type === 'create' ? 'Create Supplier' : 'Update Supplier' }}
        </button>
      </div>
    </div>
  </dialog>

  <!-- Confirmation Modal - Responsive -->
  <dialog id="confirmation_modal" class="modal">
    <div
      class="modal-box bg-accentColor text-black/50 shadow-lg w-11/12 max-w-md"
    >
      <h3 class="font-bold text-lg mb-4">{{ confirmModal.title }}</h3>

      <div class="py-4">
        <p class="mb-4 text-sm sm:text-base">{{ confirmModal.message }}</p>

        <div v-if="confirmModal.supplier" class="bg-white/10 p-3 rounded mt-3">
          <p class="text-xs sm:text-sm">
            <strong>Name:</strong> {{ confirmModal.supplier.name }}
          </p>
          <p class="text-xs sm:text-sm">
            <strong>Contact:</strong> {{ confirmModal.supplier.contact_person }}
          </p>
          <p class="text-xs sm:text-sm">
            <strong>Status:</strong> {{ confirmModal.supplier.status }}
          </p>
        </div>

        <div class="alert alert-warning mt-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current shrink-0 h-5 w-5 sm:h-6 sm:w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span class="text-xs sm:text-sm">This action cannot be undone!</span>
        </div>
      </div>

      <div class="modal-action flex-col sm:flex-row gap-2">
        <button
          class="btn btn-sm font-thin bg-gray-200 text-black/50 border-none hover:bg-gray-300 shadow-none w-full sm:w-auto"
          @click="closeConfirmModal"
          :disabled="loading"
        >
          Cancel
        </button>
        <button
          class="btn btn-sm font-thin border-none text-white w-full sm:w-auto"
          :class="{
            'btn-error': confirmModal.type === 'delete',
            'btn-success': confirmModal.type === 'restore',
          }"
          @click="handleConfirmAction"
          :disabled="loading"
        >
          <span
            class="loading loading-spinner loading-xs"
            v-if="loading"
          ></span>
          {{
            loading
              ? confirmModal.type === 'delete'
                ? 'Deleting...'
                : 'Restoring...'
              : confirmModal.type === 'delete'
                ? 'Delete Supplier'
                : 'Restore Supplier'
          }}
        </button>
      </div>
    </div>
  </dialog>

  <!-- Toast Notification - Responsive -->
  <transition
    enter-active-class="transform transition ease-out duration-300"
    enter-from-class="translate-x-full opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transform transition ease-in duration-300"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-full opacity-0"
  >
    <div class="toast toast-end sm:toast-end z-[100000]" v-if="toast.show">
      <div
        v-if="toast.type === 'success'"
        class="alert alert-success shadow-lg max-w-xs sm:max-w-sm"
      >
        <span class="text-xs sm:text-sm">{{ toast.message }}</span>
      </div>
      <div
        v-else-if="toast.type === 'error'"
        class="alert alert-error shadow-lg max-w-xs sm:max-w-sm"
      >
        <span class="text-xs sm:text-sm">{{ toast.message }}</span>
      </div>
    </div>
  </transition>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue';
  import {
    Building2,
    Plus,
    Edit,
    Trash2,
    Eye,
    Search,
    Filter,
    RefreshCcw,
    Phone,
    Mail,
    MapPin,
    CheckCircle,
    XCircle,
    Clock,
    EllipsisVertical,
    X,
  } from 'lucide-vue-next';
  import { useSupplierStore } from '../../stores/supplierStore.js';
  import { useInventoryStore } from '../../stores/inventoryStore.js'; // Add this import

  // Stores
  const supplierStore = useSupplierStore();
  const inventoryStore = useInventoryStore(); // Add inventory store

  // Replace mock data with store data
  const mockSuppliers = computed(() => supplierStore.suppliers);
  const loading = computed(() => supplierStore.loading);

  // Local state
  const currentPage = ref(1);
  const suppliersPerPage = ref(8);
  const searchQuery = ref('');
  const statusFilter = ref('');
  const categoryFilter = ref('');
  const showDeleted = ref(false);

  // Modal state
  const modal = ref({
    type: null,
    show: false,
    supplier: null,
  });

  // Form data for supplier
  const supplierForm = ref({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    category: '',
    status: 'Active',
    notes: '',
  });

  // Toast state
  const toast = ref({ show: false, type: '', message: '' });

  // Show toast helper
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };

  // Centralized categories from inventory system
  const categories = computed(() => {
    const inventoryCategories = inventoryStore.categories || [];
    return inventoryCategories.map((category) => category.name);
  });

  const statuses = ['Active', 'Inactive'];

  // Computed properties
  const filteredSuppliers = computed(() => {
    let filtered = showDeleted.value
      ? supplierStore.deletedSuppliers || []
      : [...mockSuppliers.value];

    // Search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (supplier) =>
          supplier.name.toLowerCase().includes(query) ||
          supplier.contact_person.toLowerCase().includes(query) ||
          supplier.email.toLowerCase().includes(query) ||
          supplier.phone.includes(query)
      );
    }

    // Status filter (only for non-deleted suppliers)
    if (!showDeleted.value && statusFilter.value) {
      filtered = filtered.filter(
        (supplier) => supplier.status === statusFilter.value
      );
    }

    // Category filter
    if (categoryFilter.value) {
      filtered = filtered.filter(
        (supplier) => supplier.category === categoryFilter.value
      );
    }

    return filtered;
  });

  const sortedSuppliers = computed(() => {
    return [...filteredSuppliers.value].sort((a, b) => b.id - a.id);
  });

  const paginatedSuppliers = computed(() => {
    const start = (currentPage.value - 1) * suppliersPerPage.value;
    return sortedSuppliers.value.slice(start, start + suppliersPerPage.value);
  });

  const totalPages = computed(() => {
    return Math.ceil(sortedSuppliers.value.length / suppliersPerPage.value);
  });

  // Stats computed properties
  const supplierStats = computed(() => {
    const total = mockSuppliers.value.length;
    const active = mockSuppliers.value.filter(
      (s) => s.status === 'Active'
    ).length;
    const inactive = mockSuppliers.value.filter(
      (s) => s.status === 'Inactive'
    ).length;
    const totalOrders = mockSuppliers.value.reduce(
      (sum, s) => sum + (s.total_orders || 0),
      0
    );
    const avgRating =
      mockSuppliers.value
        .filter((s) => s.rating > 0)
        .reduce((sum, s) => sum + s.rating, 0) /
      mockSuppliers.value.filter((s) => s.rating > 0).length;

    return {
      total,
      active,
      inactive,
      totalOrders,
      avgRating: avgRating || 0,
    };
  });

  // Modal methods
  const openModal = (type, supplier = null) => {
    modal.value = {
      type,
      show: true,
      supplier,
    };

    if (supplier) {
      supplierForm.value = { ...supplier };
    } else {
      resetForm();
    }

    document.getElementById('supplier_modal').showModal();
  };

  const closeModal = () => {
    document.getElementById('supplier_modal')?.close();
    modal.value = {
      type: null,
      show: false,
      supplier: null,
    };
    resetForm();
  };

  const resetForm = () => {
    supplierForm.value = {
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      category: '',
      status: 'Active',
      notes: '',
    };
  };

  // CRUD operations
  const handleCreateSupplier = async () => {
    try {
      // Validation
      if (!supplierForm.value.name.trim()) {
        showToast('error', 'Please enter supplier name');
        return;
      }
      if (!supplierForm.value.contact_person.trim()) {
        showToast('error', 'Please enter contact person');
        return;
      }
      if (!supplierForm.value.email.trim()) {
        showToast('error', 'Please enter email address');
        return;
      }

      await supplierStore.createSupplier(supplierForm.value);
      closeModal();
      showToast('success', 'Supplier created successfully');
    } catch (err) {
      showToast('error', err.message || 'Failed to create supplier');
    }
  };

  const handleUpdateSupplier = async () => {
    try {
      // Validation
      if (!supplierForm.value.name.trim()) {
        showToast('error', 'Please enter supplier name');
        return;
      }
      if (!supplierForm.value.contact_person.trim()) {
        showToast('error', 'Please enter contact person');
        return;
      }
      if (!supplierForm.value.email.trim()) {
        showToast('error', 'Please enter email address');
        return;
      }

      await supplierStore.updateSupplier(
        modal.value.supplier.id,
        supplierForm.value
      );
      closeModal();
      showToast('success', 'Supplier updated successfully');
    } catch (err) {
      showToast('error', err.message || 'Failed to update supplier');
    }
  };

  const handleDeleteSupplier = async (supplier) => {
    try {
      await supplierStore.deleteSupplier(supplier.id);
      showToast('success', 'Supplier deleted successfully');
    } catch (err) {
      showToast('error', err.message || 'Failed to delete supplier');
    }
  };

  // NEW: Handle restore supplier
  const handleRestoreSupplier = async (supplier) => {
    try {
      await supplierStore.restoreSupplier(supplier.id);
      showToast('success', 'Supplier restored successfully');
      // Refresh the deleted suppliers list
      await loadDeletedSuppliers();
    } catch (err) {
      showToast('error', err.message || 'Failed to restore supplier');
    }
  };

  // NEW: Toggle deleted suppliers view
  const toggleDeletedView = async () => {
    showDeleted.value = !showDeleted.value;

    if (showDeleted.value) {
      await loadDeletedSuppliers();
    }

    // Reset filters and pagination
    clearFilters();
  };

  // NEW: Load deleted suppliers
  const loadDeletedSuppliers = async () => {
    try {
      await supplierStore.fetchDeletedSuppliers();
    } catch (error) {
      console.error('Failed to load deleted suppliers:', error);
      showToast('error', 'Failed to load deleted suppliers');
    }
  };

  // Confirmation modal
  const confirmModal = ref({
    show: false,
    type: '',
    title: '',
    message: '',
    supplier: null,
    onConfirm: null,
  });

  const openConfirmModal = (type, supplier) => {
    const configs = {
      delete: {
        title: 'Delete Supplier',
        message: `Are you sure you want to delete ${supplier.name}? This action cannot be undone.`,
        onConfirm: () => handleDeleteSupplier(supplier),
      },
      restore: {
        title: 'Restore Supplier',
        message: `Are you sure you want to restore ${supplier.name}?`,
        onConfirm: () => handleRestoreSupplier(supplier),
      },
    };

    const config = configs[type];
    confirmModal.value = {
      show: true,
      type,
      title: config.title,
      message: config.message,
      supplier,
      onConfirm: config.onConfirm,
    };

    document.getElementById('confirmation_modal').showModal();
  };

  const closeConfirmModal = () => {
    document.getElementById('confirmation_modal')?.close();
    confirmModal.value = {
      show: false,
      type: '',
      title: '',
      message: '',
      supplier: null,
      onConfirm: null,
    };
  };

  const handleConfirmAction = async () => {
    if (confirmModal.value.onConfirm) {
      try {
        await confirmModal.value.onConfirm();
        closeConfirmModal();
      } catch (error) {
        console.error('Confirmation action failed:', error);
      }
    }
  };

  // Clear filters
  const clearFilters = async () => {
    searchQuery.value = '';
    statusFilter.value = '';
    categoryFilter.value = '';
    currentPage.value = 1;

    // Also refresh the supplier data to get latest ratings
    await refreshSupplierData();
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-success/10 text-success';
      case 'Inactive':
        return 'bg-error/10 text-error';
      case 'Pending':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPhone = (phone) => {
    if (!phone) return 'N/A';
    return phone.replace(/(\+63)(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4');
  };

  // Add this helper function for mobile pagination
  const getVisiblePages = () => {
    const current = currentPage.value;
    const total = totalPages.value;

    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 3) {
      return [1, 2, 3, 4, 5];
    }

    if (current >= total - 2) {
      return [total - 4, total - 3, total - 2, total - 1, total];
    }

    return [current - 2, current - 1, current, current + 1, current + 2];
  };

  // Add these helper functions in the script section
  const getSupplierRating = (supplier) => {
    // Handle both string and number types
    const rating = supplier.rating;
    if (rating === null || rating === undefined || rating === '') {
      return 0;
    }
    return parseFloat(rating) || 0;
  };

  const getSupplierRatingDisplay = (supplier) => {
    const rating = getSupplierRating(supplier);
    return rating > 0 ? rating.toFixed(1) : 'N/A';
  };

  // Add this method after the existing methods
  const refreshSupplierData = async () => {
    try {
      await supplierStore.fetchSuppliersWithStats();

      // Debug: Check specific supplier ratings
      supplierStore.suppliers.forEach((supplier) => {
        const rating = getSupplierRating(supplier);
      });

      showToast('success', 'Supplier data refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh supplier data:', error);
      showToast('error', 'Failed to refresh supplier data');
    }
  };

  // Load data on component mount
  onMounted(async () => {
    try {
      // Load both supplier and inventory data
      await Promise.all([
        supplierStore.fetchSuppliersWithStats(),
        inventoryStore.fetchCategories(),
      ]);

      // Debug: Check if ratings are present
      const suppliersWithRatings = supplierStore.suppliers.filter(
        (s) => s.rating > 0
      );
    } catch (error) {
      console.error('❌ Error loading suppliers:', error);
      showToast('error', 'Failed to load suppliers');
    }
  });
</script>

<style scoped>
  /* Enhanced table styling */
  .table th {
    font-weight: 600;
    font-size: 0.8rem;
    padding: 1rem 0.75rem;
  }

  .table td {
    vertical-align: middle;
    padding: 0.75rem;
  }

  /* Better badge styling */
  .badge {
    font-weight: 500;
  }

  /* Responsive improvements */
  @media (max-width: 768px) {
    .table th,
    .table td {
      padding: 0.5rem 0.375rem;
      font-size: 0.8rem;
    }
  }

  /* Loading states */
  .card:hover {
    transition: background-color 0.2s ease;
  }

  /* Modal improvements */
  .modal-box {
    max-height: 90vh;
    overflow-y: auto;
  }

  /* Toast positioning */
  .toast {
    z-index: 100000; /* ensure above modals */
  }

  /* Dropdown improvements */
  .dropdown-content {
    z-index: 1000;
  }

  /* Form focus states */
  .input:focus,
  .select:focus,
  .textarea:focus {
    outline: none;
    border-color: var(--primaryColor);
    box-shadow: 0 0 0 2px rgba(var(--primaryColor-rgb), 0.1);
  }

  /* Button hover states */
  .btn:hover {
    transform: translateY(-1px);
    transition: all 0.2s ease;
  }

  /* Stats card hover */
  .stat:hover {
    background-color: rgba(var(--secondaryColor-rgb), 0.05);
    transition: background-color 0.2s ease;
  }

  /* Search input focus */
  input[type='text']:focus {
    border-color: var(--primaryColor);
    box-shadow: 0 0 0 2px rgba(var(--primaryColor-rgb), 0.1);
  }

  /* Pagination improvements */
  .join .btn:not(:disabled):hover {
    background-color: var(--primaryColor);
    color: white;
    transform: translateY(-1px);
  }

  /* Filter button states */
  .btn.btn-xs:not(.bg-primaryColor):hover {
    background-color: rgba(var(--primaryColor-rgb), 0.1);
    border-color: var(--primaryColor);
  }

  /* Card shadow improvements */
  .card {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  /* Status badge improvements */
  .badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
  }

  /* Icon improvements */
  .lucide {
    stroke-width: 1.5;
  }

  /* Responsive grid adjustments */
  @media (max-width: 1024px) {
    .grid {
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }
  }

  @media (max-width: 640px) {
    .grid {
      grid-template-columns: 1fr;
    }

    .stats {
      grid-template-columns: 1fr;
    }
  }

  /* Animation improvements */
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

  .card {
    animation: fadeIn 0.3s ease-out;
  }

  /* Loading spinner improvements */
  .loading {
    border-color: var(--primaryColor);
    border-top-color: transparent;
  }

  /* Modal backdrop improvements */
  .modal::backdrop {
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
  }

  /* Form validation styles */
  .input:invalid,
  .select:invalid,
  .textarea:invalid {
    border-color: #ef4444;
  }

  .input:valid,
  .select:valid,
  .textarea:valid {
    border-color: #10b981;
  }

  /* Hover effects for interactive elements */
  .dropdown-content li:hover {
    background-color: rgba(var(--primaryColor-rgb), 0.1);
    border-radius: 0.375rem;
  }

  /* Improved spacing for mobile */
  @media (max-width: 768px) {
    .card-body {
      padding: 1rem;
    }

    .modal-box {
      margin: 1rem;
      max-width: calc(100vw - 2rem);
    }
  }

  /* Enhanced accessibility */
  .btn:focus,
  .input:focus,
  .select:focus,
  .textarea:focus {
    outline: 2px solid var(--primaryColor);
    outline-offset: 2px;
  }

  /* Smooth transitions */
  * {
    transition:
      color 0.2s ease,
      background-color 0.2s ease,
      border-color 0.2s ease,
      transform 0.2s ease;
  }

  /* Enhanced responsive styles */
  .container {
    min-height: 100vh;
  }

  /* Mobile-first responsive design */
  @media (max-width: 640px) {
    .stats {
      grid-template-columns: 1fr;
    }

    .stat {
      padding: 1rem 0.5rem;
    }

    .stat-value {
      font-size: 1.5rem;
    }

    .card-body {
      padding: 1rem;
    }

    .modal-box {
      margin: 0.5rem;
      max-width: calc(100vw - 1rem);
    }

    .btn {
      font-size: 0.75rem;
      padding: 0.5rem 0.75rem;
    }

    .input,
    .select,
    .textarea {
      font-size: 0.875rem;
    }
  }

  @media (min-width: 641px) and (max-width: 1024px) {
    .grid {
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }

    .stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1025px) {
    .grid {
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    }

    .stats {
      grid-template-columns: repeat(5, 1fr);
    }
  }

  /* Enhanced touch targets for mobile */
  @media (max-width: 768px) {
    .btn {
      min-height: 2.5rem;
      min-width: 2.5rem;
    }

    .dropdown-content {
      min-width: 120px;
    }

    .dropdown-content li a {
      padding: 0.75rem 1rem;
    }
  }

  /* Improved spacing for different screen sizes */
  @media (max-width: 480px) {
    .container {
      padding: 0.5rem;
    }

    .card-body {
      padding: 0.75rem;
    }

    .stat {
      padding: 0.75rem 0.5rem;
    }
  }

  /* Enhanced accessibility for mobile */
  @media (max-width: 768px) {
    .btn:focus,
    .input:focus,
    .select:focus,
    .textarea:focus {
      outline: 3px solid var(--primaryColor);
      outline-offset: 2px;
    }

    .dropdown-content {
      max-height: 200px;
      overflow-y: auto;
    }
  }

  /* Smooth scrolling for mobile */
  @media (max-width: 768px) {
    html {
      scroll-behavior: smooth;
    }

    .modal-box {
      scroll-behavior: smooth;
    }
  }

  /* Enhanced loading states for mobile */
  @media (max-width: 768px) {
    .loading {
      width: 1.5rem;
      height: 1.5rem;
    }
  }

  /* Improved text readability on mobile */
  @media (max-width: 640px) {
    .text-black\/50 {
      color: rgba(0, 0, 0, 0.6);
    }

    .text-black\/70 {
      color: rgba(0, 0, 0, 0.8);
    }
  }

  /* Enhanced card interactions for touch devices */
  @media (hover: none) and (pointer: coarse) {
    .card:hover {
      transform: none;
    }

    .btn:hover {
      transform: none;
    }

    .card:active {
      transform: scale(0.98);
    }

    .btn:active {
      transform: scale(0.95);
    }
  }

  /* Existing styles remain the same... */
</style>
