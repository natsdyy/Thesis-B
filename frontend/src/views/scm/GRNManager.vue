<template>
  <div class="container mx-auto p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-primaryColor mb-2">
        Goods Receipt Notes
      </h1>
      <p class="text-sm sm:text-base text-black/50 px-2">
        Manage goods receipt notes, quality inspections, and inventory additions
      </p>
    </div>

    <!-- Stats -->
    <div class="stats shadow w-full mb-6">
      <div class="stat">
        <div class="stat-figure text-primaryColor">
          <ReceiptText class="w-8 h-8" />
        </div>
        <div class="stat-title">Total GRNs</div>
        <div class="stat-value text-primaryColor">{{ grnCount }}</div>
        <div class="stat-desc">
          {{ hasGRNs ? 'GRNs registered' : 'No GRNs yet' }}
        </div>
      </div>

      <div class="stat">
        <div class="stat-figure text-warning">
          <GitPullRequestDraft class="w-8 h-8" />
        </div>
        <div class="stat-title">Draft</div>
        <div class="stat-value text-warning">{{ draftGRNs.length }}</div>
        <div class="stat-desc">Pending creation</div>
      </div>

      <div class="stat">
        <div class="stat-figure text-info">
          <ClockFading class="w-8 h-8" />
        </div>
        <div class="stat-title">Pending Inspection</div>
        <div class="stat-value text-info">
          {{ pendingInspectionGRNs.length }}
        </div>
        <div class="stat-desc">Awaiting quality check</div>
      </div>

      <div class="stat">
        <div class="stat-figure text-success">
          <CheckCircle class="w-8 h-8" />
        </div>
        <div class="stat-title">Completed</div>
        <div class="stat-value text-success">{{ completedGRNs.length }}</div>
        <div class="stat-desc">Added to inventory</div>
      </div>
    </div>

    <!-- Toast Notification -->
    <transition
      enter-active-class="transform transition ease-out duration-300"
      enter-from-class="translate-x-full opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transform transition ease-in duration-300"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="translate-x-full opacity-0"
    >
      <div
        class="fixed top-4 right-4 z-[999999] max-w-xs sm:max-w-sm"
        v-if="toast.show"
        style="position: fixed !important; z-index: 999999 !important"
      >
        <div
          v-if="toast.type === 'success'"
          class="alert alert-success shadow-lg"
        >
          <span class="text-xs sm:text-sm">{{ toast.message }}</span>
        </div>
        <div
          v-else-if="toast.type === 'error'"
          class="alert alert-error shadow-lg"
        >
          <span class="text-xs sm:text-sm">{{ toast.message }}</span>
        </div>
      </div>
    </transition>

    <!-- Error Alert -->
    <div v-if="error" class="alert alert-error mb-6">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="stroke-current shrink-0 h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{{ error }}</span>
      <div>
        <button class="btn btn-sm btn-outline" @click="clearError">
          Dismiss
        </button>
      </div>
    </div>

    <!-- GRN List -->
    <div class="card shadow-xl">
      <div class="card-body">
        <!-- Filter Summary -->
        <div
          class="mb-4 p-4 bg-white/5 rounded-lg border border-primaryColor/20"
        >
          <div class="flex items-center gap-3">
            <Calendar class="w-5 h-5 text-primaryColor" />
            <div>
              <h3 class="font-semibold text-primaryColor">
                {{ grnFilterDisplayText }}
              </h3>
              <p class="text-sm text-black/60">
                Showing {{ filteredGrns.length }} GRN{{
                  filteredGrns.length !== 1 ? 's' : ''
                }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex justify-between items-center mb-4">
          <h2 class="card-title text-primaryColor">Goods Receipt Notes</h2>
          <div
            class="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
          >
            <div class="join">
              <button
                class="join-item btn btn-xs sm:btn-sm font-thin border border-primaryColor/30"
                :class="{
                  'bg-primaryColor text-white': grnFilterType === 'today',
                }"
                @click="grnFilterType = 'today'"
              >
                Today
                <span class="badge badge-xs ml-1">{{ grnTodayCount }}</span>
              </button>
              <button
                class="join-item btn btn-xs sm:btn-sm font-thin border border-primaryColor/30"
                :class="{
                  'bg-primaryColor text-white': grnFilterType === 'week',
                }"
                @click="grnFilterType = 'week'"
              >
                This Week
                <span class="badge badge-xs ml-1">{{ grnWeekCount }}</span>
              </button>
              <button
                class="join-item btn btn-xs sm:btn-sm font-thin border border-primaryColor/30"
                :class="{
                  'bg-primaryColor text-white': grnFilterType === 'month',
                }"
                @click="grnFilterType = 'month'"
              >
                This Month
                <span class="badge badge-xs ml-1">{{ grnMonthCount }}</span>
              </button>
            </div>
            <button
              class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
              @click="refreshGRNs"
              :class="{ loading: loading }"
              :disabled="loading"
            >
              <RefreshCcw
                v-if="!loading"
                class="w-4 h-4 mr-2 text-primaryColor"
              />
              <span
                class="loading loading-spinner loading-xs"
                v-if="loading"
              ></span>
              Refresh
            </button>
          </div>
        </div>
        <div v-if="loading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div
          v-else-if="!hasGRNs || filteredGrns.length === 0"
          class="text-center py-8"
        >
          <div class="mb-4 items-center justify-center flex">
            <ReceiptText class="w-12 h-12 sm:w-16 sm:h-16 text-primaryColor" />
          </div>
          <h3 class="text-base sm:text-lg font-semibold mb-2 text-primaryColor">
            {{
              !hasGRNs
                ? 'No goods receipt notes found'
                : 'No GRNs match your criteria'
            }}
          </h3>
          <p class="text-sm sm:text-base text-black/50 mb-4 px-4">
            {{
              !hasGRNs
                ? 'No GRNs found. Create one from a completed purchase order.'
                : `No GRNs found for ${grnFilterDisplayText}. Try adjusting your filter criteria.`
            }}
          </p>
          <button
            v-if="!hasGRNs"
            class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
            @click="$router.push('/scm/purchase-order')"
          >
            <Plus class="w-4 h-4 mr-2" />
            Go to Purchase Orders
          </button>
          <button
            v-else
            class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
            @click="grnFilterType = 'today'"
          >
            <RefreshCcw class="w-4 h-4 mr-2" />
            Clear Filters
          </button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>GRN Number</th>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Received By</th>
                <th>Status</th>
                <th>Items</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="grn in paginatedGrns" :key="grn.id">
                <td>
                  <div class="font-bold">{{ grn.grn_number || 'N/A' }}</div>
                </td>
                <td>{{ grn.po_number || 'N/A' }}</td>
                <td>{{ grn.supplier_name || 'N/A' }}</td>
                <td>{{ grn.received_by_name || 'N/A' }}</td>
                <td>
                  <span :class="getStatusBadgeClass(grn.status)">
                    {{ getStatusLabel(grn.status) }}
                  </span>
                </td>
                <td>{{ grn.item_count || 0 }} items</td>
                <td>
                  <div class="flex gap-2">
                    <button
                      class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
                      @click="viewGRNDetails(grn.id)"
                    >
                      View Details
                    </button>
                    <button
                      class="btn btn-outline btn-sm text-info hover:bg-info/10 font-thin hover:border-none hover:shadow-none"
                      @click="openReturnsForGRN(grn)"
                    >
                      View Returns
                    </button>
                    <button
                      v-if="grn.status === 'draft'"
                      class="btn btn-sm btn-primary text-white font-thin shadow-none"
                      @click="updateStatus(grn.id, 'pending_inspection')"
                      :disabled="updatingStatus === grn.id"
                    >
                      <span
                        v-if="updatingStatus === grn.id"
                        class="loading loading-spinner loading-xs mr-1"
                      ></span>
                      Start Inspection
                    </button>
                    <button
                      v-if="grn.status === 'passed'"
                      class="btn btn-sm btn-success text-white font-thin shadow-none"
                      @click="updateStatus(grn.id, 'completed')"
                      :disabled="updatingStatus === grn.id"
                    >
                      <span
                        v-if="updatingStatus === grn.id"
                        class="loading loading-spinner loading-xs mr-1"
                      ></span>
                      Complete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Pagination (matches Request Supply style) -->
        <div
          v-if="totalPagesGrn > 1"
          class="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3"
        >
          <div class="text-sm text-black/60">
            Showing
            {{ (currentPageGrn - 1) * grnsPerPage + 1 }}
            to
            {{ Math.min(currentPageGrn * grnsPerPage, filteredGrns.length) }}
            of {{ filteredGrns.length }} GRNs for {{ grnFilterDisplayText }}
          </div>

          <div class="join space-x-1">
            <button
              class="join-item btn font-thin !bg-gray-200 text-black/50 btn-sm border border-none hover:bg-gray-300"
              :disabled="currentPageGrn <= 1"
              @click="currentPageGrn--"
              :class="{ 'btn-disabled': currentPageGrn <= 1 }"
            >
              « Prev
            </button>

            <button
              class="join-item btn font-thin !bg-gray-200 text-black/50 border border-none btn-sm shadow-none"
              v-for="page in totalPagesGrn"
              :key="page"
              :class="{
                'btn-active': currentPageGrn === page,
                '!bg-primaryColor text-white': currentPageGrn === page,
              }"
              @click="currentPageGrn = page"
            >
              {{ page }}
            </button>

            <button
              class="join-item btn font-thin btn-sm !bg-gray-200 text-black/50 border border-none"
              :disabled="currentPageGrn >= totalPagesGrn"
              @click="currentPageGrn++"
              :class="{ 'btn-disabled': currentPageGrn >= totalPagesGrn }"
            >
              Next »
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- GRN Details Modal -->
    <dialog id="grn_details_modal" class="modal">
      <div class="modal-box max-w-6xl max-h-[90vh] overflow-y-auto">
        <h3 class="font-bold text-lg mb-4">GRN Details</h3>

        <div v-if="detailsLoading" class="flex justify-center py-8">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else-if="selectedGRN" class="space-y-6">
          <!-- GRN Header Info -->
          <div
            class="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-base-200 rounded-lg"
          >
            <div>
              <h4 class="font-semibold text-lg text-primaryColor mb-2">
                {{ selectedGRN.grn_number }}
              </h4>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="font-medium">PO Number:</span>
                  <span>{{ selectedGRN.po_number || 'N/A' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="font-medium">Supplier:</span>
                  <span>{{ selectedGRN.supplier_name || 'N/A' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="font-medium">Received By:</span>
                  <span>{{ selectedGRN.received_by_name || 'N/A' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="font-medium">Received Date:</span>
                  <span>{{
                    selectedGRN.received_date
                      ? new Date(selectedGRN.received_date).toLocaleDateString()
                      : 'N/A'
                  }}</span>
                </div>
              </div>
            </div>
            <div>
              <div class="mb-2">
                <span :class="getStatusBadgeClass(selectedGRN.status)">
                  {{ getStatusLabel(selectedGRN.status) }}
                </span>
              </div>
              <div class="space-y-1 text-sm">
                <div class="flex justify-between">
                  <span class="font-medium">Total Items:</span>
                  <span>{{ selectedGRN.item_count || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="font-medium">Partial Receipt:</span>
                  <span>{{ selectedGRN.is_partial ? 'Yes' : 'No' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="font-medium">Created:</span>
                  <span>{{
                    selectedGRN.created_at
                      ? new Date(selectedGRN.created_at).toLocaleString()
                      : 'N/A'
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes Section -->
          <div v-if="selectedGRN.notes" class="p-4 bg-base-200 rounded-lg">
            <h4 class="font-semibold mb-2">Notes</h4>
            <p class="text-sm">{{ selectedGRN.notes }}</p>
          </div>

          <!-- GRN Items Table -->
          <div v-if="selectedGRN.items && selectedGRN.items.length > 0">
            <div class="flex justify-between items-center mb-3">
              <h4 class="font-semibold">GRN Items</h4>
              <button
                v-if="hasUnmappedItems"
                class="btn btn-xs btn-info text-white"
                @click="updateInventoryData"
                :disabled="updatingInventoryData"
              >
                <span
                  v-if="updatingInventoryData"
                  class="loading loading-spinner loading-xs mr-1"
                ></span>
                Auto-Map from Request
              </button>
            </div>
            <div class="overflow-x-auto">
              <table class="table table-sm table-zebra">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Ordered Qty</th>
                    <th>Received Qty</th>
                    <th>Unit Cost</th>
                    <th>Total Value</th>
                    <th>Quality Status</th>
                    <th>Inventory Category</th>
                    <th>Item Type</th>
                    <th>Inspected By</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in selectedGRN.items" :key="item.id">
                    <td>
                      <div class="font-medium">
                        {{ item.po_item_name || item.item_type_name || 'N/A' }}
                      </div>
                      <div class="text-xs opacity-60">
                        {{ item.po_unit || item.item_unit_of_measure || 'pcs' }}
                      </div>
                    </td>
                    <td>{{ item.ordered_quantity || 0 }}</td>
                    <td>{{ item.received_quantity || 0 }}</td>
                    <td>₱{{ (item.unit_cost || 0).toLocaleString() }}</td>
                    <td>₱{{ (item.total_value || 0).toLocaleString() }}</td>
                    <td>
                      <span
                        :class="getQualityStatusBadgeClass(item.quality_status)"
                      >
                        {{ getQualityStatusLabel(item.quality_status) }}
                      </span>
                    </td>
                    <td>
                      <!-- Show auto-populated category if available -->
                      <div v-if="item.category_name">
                        <span
                          class="badge badge-info/10 text-info border-none text-xs"
                        >
                          {{ item.category_name }}
                        </span>
                      </div>
                      <div v-else class="text-xs text-black/30">Not mapped</div>
                    </td>
                    <td>
                      <!-- Show auto-populated item type if available -->
                      <div v-if="item.item_type_id && item.item_type_name">
                        <span
                          class="badge badge-success/10 text-success border-none text-xs"
                        >
                          {{ item.item_type_name }}
                        </span>
                      </div>
                      <!-- Manual mapping interface for unmapped items -->
                      <div v-else class="flex items-center gap-2">
                        <select
                          class="select select-bordered select-xs w-40"
                          v-model="itemCategorySelections[item.id]"
                          @change="
                            () => {
                              itemTypeSelections[item.id] = '';
                            }
                          "
                        >
                          <option disabled value="">Select category</option>
                          <option
                            v-for="c in activeCategories"
                            :key="c.id"
                            :value="c.id"
                          >
                            {{ c.name || c.category || 'Category' }}
                          </option>
                        </select>
                        <select
                          class="select select-bordered select-xs w-44"
                          v-model="itemTypeSelections[item.id]"
                        >
                          <option disabled value="">Select item type</option>
                          <option
                            v-for="t in activeItemTypes.filter(
                              (t) =>
                                t.category_id ===
                                itemCategorySelections[item.id]
                            )"
                            :key="t.id"
                            :value="t.id"
                          >
                            {{ t.name }}
                          </option>
                        </select>
                        <button
                          class="btn btn-xs btn-primary"
                          @click="applyItemType(item)"
                          :disabled="
                            !itemTypeSelections[item.id] ||
                            mappingBusy === item.id
                          "
                        >
                          <span
                            v-if="mappingBusy === item.id"
                            class="loading loading-spinner loading-xs mr-1"
                          ></span>
                          Map
                        </button>
                      </div>
                    </td>
                    <td>{{ item.inspector_name || 'Not inspected' }}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Quality Inspection Actions -->
          <div
            v-if="selectedGRN.status === 'passed'"
            class="p-4 bg-success/10 rounded-lg"
          >
            <h4 class="font-semibold text-success mb-2">
              Quality Inspection Passed
            </h4>
            <p class="text-sm text-success/80 mb-3">
              All items have passed quality inspection and are ready to be added
              to inventory.
            </p>

            <!-- Auto-mapping information -->
            <div class="alert alert-info mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                class="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              <div>
                <h3 class="font-bold">Inventory Auto-Mapping</h3>
                <div class="text-xs">
                  Items are automatically mapped to inventory categories and
                  types based on the original supply request data. This ensures
                  consistency and reduces manual work. Items that couldn't be
                  auto-mapped will need manual mapping.
                </div>
              </div>
            </div>

            <button
              class="btn btn-success btn-sm"
              @click="completeGRN(selectedGRN.id)"
              :disabled="updatingStatus === selectedGRN.id || hasUnmappedItems"
            >
              <span
                v-if="updatingStatus === selectedGRN.id"
                class="loading loading-spinner loading-xs mr-1"
              ></span>
              Add to Inventory
            </button>
            <div v-if="hasUnmappedItems" class="mt-2 text-xs text-error">
              You must map all items to an item type before completing this GRN.
            </div>
          </div>

          <div
            v-if="selectedGRN.status === 'pending_inspection'"
            class="p-4 bg-info/10 rounded-lg"
          >
            <h4 class="font-thin text-info mb-2">
              Quality Inspection Required
            </h4>
            <p class="text-sm text-info/80 mb-3">
              Items are being inspected for quality. Complete the inspection to
              proceed.
            </p>
            <div class="flex flex-col sm:flex-row gap-2">
              <button
                class="btn btn-success btn-sm text-white font-thin shadow-none"
                @click="markAllAsPassed"
                :disabled="updatingStatus === selectedGRN.id"
              >
                <span
                  v-if="updatingStatus === selectedGRN.id"
                  class="loading loading-spinner loading-xs mr-1"
                ></span>
                Mark as Passed
              </button>
              <button
                class="btn btn-error btn-sm text-white font-thin shadow-none"
                @click="markAllAsFailed"
                :disabled="updatingStatus === selectedGRN.id"
              >
                <span
                  v-if="updatingStatus === selectedGRN.id"
                  class="loading loading-spinner loading-xs mr-1"
                ></span>
                Mark as Failed
              </button>
            </div>
          </div>

          <div
            v-if="selectedGRN.status === 'completed'"
            class="p-4 bg-success/10 rounded-lg"
          >
            <h4 class="text-success mb-2 font-thin">GRN Completed</h4>
            <p class="text-sm text-success/80">
              This GRN has been completed and items have been added to
              inventory.
            </p>
          </div>
        </div>

        <div class="modal-action">
          <button
            class="btn btn-ghost btn-sm font-thin shadow-none"
            @click="closeGRNDetails"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>

    <!-- Confirmation Modal -->
    <dialog id="confirmation_modal" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">{{ confirmModal.title }}</h3>
        <p class="py-4">{{ confirmModal.message }}</p>

        <div class="modal-action">
          <button
            type="button"
            class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none btn-sm"
            @click="closeConfirmModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn bg-primaryColor text-white btn-sm font-thin border-none hover:bg-primaryColor/80"
            @click="handleConfirmAction"
          >
            Confirm
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
  import { onMounted, ref, computed, watch } from 'vue';
  import { useRouter } from 'vue-router';
  import { useGRNStore } from '../../stores/grnStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import { useInventoryStore } from '../../stores/inventoryStore.js';
  import { storeToRefs } from 'pinia';
  import { getApiUrl } from '../../config/api.js';
  import {
    RefreshCcw,
    Calendar,
    ReceiptText,
    CheckCircle,
    XCircle,
    AlertTriangle,
    GitPullRequestDraft,
    ClockFading,
    Plus,
  } from 'lucide-vue-next';

  const router = useRouter();
  const grnStore = useGRNStore();
  const authStore = useAuthStore();
  const inventoryStore = useInventoryStore();

  // Use storeToRefs for reactivity
  const { grns, loading, error, stats } = storeToRefs(grnStore);

  // Calculate stats from actual GRN data since backend doesn't provide stats
  const grnCount = computed(() => grns.value.length);
  const hasGRNs = computed(() => grns.value.length > 0);
  const draftGRNs = computed(
    () => grns.value.filter((grn) => grn.status === 'draft').length
  );
  const pendingInspectionGRNs = computed(
    () => grns.value.filter((grn) => grn.status === 'pending_inspection').length
  );
  const completedGRNs = computed(
    () => grns.value.filter((grn) => grn.status === 'completed').length
  );

  // Calculate date-based counts from actual GRN data
  const grnTodayCount = computed(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return grns.value.filter((grn) => {
      const grnDate = new Date(grn.created_at).toISOString().split('T')[0];
      return grnDate === todayStr;
    }).length;
  });

  const grnWeekCount = computed(() => {
    const today = new Date();
    const startOfWeek = getStartOfWeek(today);
    const endOfWeek = new Date(today);
    endOfWeek.setHours(23, 59, 59, 999);

    return grns.value.filter((grn) => {
      const grnDate = new Date(grn.created_at);
      return grnDate >= startOfWeek && grnDate <= endOfWeek;
    }).length;
  });

  const grnMonthCount = computed(() => {
    const today = new Date();
    const startOfMonth = getStartOfMonth(today);
    const endOfMonth = new Date(today);
    endOfMonth.setHours(23, 59, 59, 999);

    return grns.value.filter((grn) => {
      const grnDate = new Date(grn.created_at);
      return grnDate >= startOfMonth && grnDate <= endOfMonth;
    }).length;
  });

  // Optimized filtering - use server-side filtering
  const grnFilterType = ref('today');
  const filteredGrns = computed(() => grns.value);

  // Pagination state and computed properties
  const currentPageGrn = ref(1);
  const grnsPerPage = ref(5);

  const totalPagesGrn = computed(() =>
    Math.max(1, Math.ceil(filteredGrns.value.length / grnsPerPage.value))
  );

  const paginatedGrns = computed(() => {
    const start = (currentPageGrn.value - 1) * grnsPerPage.value;
    return filteredGrns.value.slice(start, start + grnsPerPage.value);
  });

  // Reset to first page when filter or data changes
  watch([grnFilterType, filteredGrns], () => {
    currentPageGrn.value = 1;
  });

  watch(totalPagesGrn, (tp) => {
    if (currentPageGrn.value > tp) currentPageGrn.value = tp;
  });

  // Display text and date formatting like RequestSupply
  const formatDate = (dateObj) => {
    const date = new Date(dateObj);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const grnFilterDisplayText = computed(() => {
    const today = new Date();
    switch (grnFilterType.value) {
      case 'today':
        return `Today (${formatDate(today)})`;
      case 'week': {
        const start = getStartOfWeek(today);
        const end = today;
        return `This Week (${formatDate(start)} - ${formatDate(end)})`;
      }
      case 'month': {
        const start = getStartOfMonth(today);
        const end = today;
        return `This Month (${formatDate(start)} - ${formatDate(end)})`;
      }
      default:
        return 'All';
    }
  });

  // Date helpers for filtration
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday first
    return new Date(d.setDate(diff));
  };
  const getStartOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth(), 1);
  const getEndOfMonth = (date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const isDateInRange = (date, start, end) => {
    const d = new Date(date);
    return d >= start && d <= end;
  };

  // Actions from store
  const {
    fetchGRNs,
    fetchGRNsWithStats,
    fetchGRNById,
    updateGRNStatus,
    performBulkQualityInspection,
    clearError,
  } = grnStore;

  // Local state for details modal
  const selectedGRN = ref(null);
  const detailsLoading = ref(false);
  const updatingStatus = ref(null);
  const mappingBusy = ref(null);
  const activeCategories = ref([]);
  const activeItemTypes = ref([]);
  const itemCategorySelections = ref({});
  const itemTypeSelections = ref({});

  const hasUnmappedItems = computed(() => {
    if (!selectedGRN.value || !selectedGRN.value.items) return false;
    return selectedGRN.value.items.some((i) => !i.item_type_id);
  });

  const updatingInventoryData = ref(false);

  // Confirmation modal state
  const confirmModal = ref({
    show: false,
    type: '',
    title: '',
    message: '',
    onConfirm: null,
  });

  // Toast state (same as PurchaseOrder.vue)
  const toast = ref({ show: false, type: '', message: '' });

  // Show toast helper (same as PurchaseOrder.vue)
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };

  onMounted(async () => {
    try {
      // Single optimized call that includes stats
      await grnStore.fetchGRNsWithStats();

      // Load inventory data only when needed (lazy loading)
      // This will be loaded when opening GRN details
    } catch (err) {
      console.error('Error loading GRN data:', err);
    }
  });

  // Optimized refresh - use cache when possible
  const refreshGRNs = async () => {
    try {
      // Force refresh by clearing cache
      await grnStore.fetchGRNs({ force_refresh: true });
      showToast('success', 'GRN list refreshed successfully');
    } catch (err) {
      showToast('error', 'Failed to refresh GRN list');
    }
  };

  const { fetchActiveItemTypes, mapGrnItemType } = grnStore;

  const ensureInventoryDataLoaded = async () => {
    if (!inventoryStore.categories || inventoryStore.categories.length === 0) {
      await inventoryStore.fetchCategories?.();
    }
    if (!inventoryStore.itemTypes || inventoryStore.itemTypes.length === 0) {
      await inventoryStore.fetchItemTypes?.();
    }
    activeCategories.value = inventoryStore.categories || [];
    activeItemTypes.value =
      inventoryStore.itemTypes?.filter((t) => t.is_active) || [];
  };

  const applyItemType = async (item) => {
    try {
      mappingBusy.value = item.id;
      await mapGrnItemType(
        selectedGRN.value.id,
        item.id,
        itemTypeSelections.value[item.id]
      );
      // Refresh selectedGRN from store
      const fresh = await fetchGRNById(selectedGRN.value.id);
      selectedGRN.value = fresh;
      showToast('success', 'Item type mapped');
    } catch (e) {
      showToast(
        'error',
        e?.response?.data?.message || 'Failed to map item type'
      );
    } finally {
      mappingBusy.value = null;
    }
  };

  const viewGRNDetails = async (id) => {
    try {
      detailsLoading.value = true;

      // Load inventory data only when needed
      await ensureInventoryDataLoaded();

      selectedGRN.value = await fetchGRNById(id);

      // Check if there are unmapped items and automatically update inventory data
      const hasUnmapped = selectedGRN.value.items?.some(
        (it) => !it.item_type_id
      );
      if (hasUnmapped) {
        try {
          // First, update supply request items with inventory data
          const supplyResponse = await fetch(
            getApiUrl('supply-requests/update-inventory-data'),
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (supplyResponse.ok) {
            // Then update GRN items with inventory data
            const grnResponse = await fetch(
              getApiUrl(`grn/${id}/update-inventory-data`),
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );

            if (grnResponse.ok) {
              // Refresh the GRN details with updated data
              selectedGRN.value = await fetchGRNById(id);
              showToast(
                'success',
                'Inventory data auto-mapped from supply request'
              );
            }
          }
        } catch (updateError) {
          console.warn(
            'Auto-mapping failed, continuing with manual mapping:',
            updateError
          );
          // Continue with manual mapping if auto-mapping fails
        }
      }

      // initialize selections for unmapped items (if any remain)
      itemCategorySelections.value = {};
      itemTypeSelections.value = {};
      selectedGRN.value.items?.forEach((it) => {
        if (!it.item_type_id) {
          itemCategorySelections.value[it.id] = '';
          itemTypeSelections.value[it.id] = '';
        }
      });

      document.getElementById('grn_details_modal').showModal();
    } catch (err) {
      console.error('Error viewing GRN details:', err);
      showToast('error', 'Failed to load GRN details');
    } finally {
      detailsLoading.value = false;
    }
  };

  // Open returns audit trail for this GRN's PO using existing PO returns component route
  const openReturnsForGRN = async (grn) => {
    try {
      if (!grn?.purchase_order_id) {
        showToast('error', 'No related purchase order found');
        return;
      }
      // Lazy import PO view store and open the existing returns modal there if needed
      const { usePurchaseOrderStore } = await import(
        '../../stores/purchaseOrderStore.js'
      );
      const poStore = usePurchaseOrderStore();
      await poStore.fetchItemReturns(grn.purchase_order_id);

      // Use the router instance directly instead of trying to import it dynamically
      router.push({
        path: '/scm/purchase-order',
        query: { returnsForPO: grn.purchase_order_id },
      });
      showToast('success', 'Opening returns for related PO');
    } catch (e) {
      console.error('Failed to open returns for GRN', e);
      showToast('error', 'Failed to open returns');
    }
  };

  const closeGRNDetails = () => {
    document.getElementById('grn_details_modal')?.close();
    selectedGRN.value = null;
  };

  const updateStatus = async (id, status) => {
    try {
      updatingStatus.value = id;

      // Update the status
      const updatedGRN = await updateGRNStatus(id, status, authStore.user.id);

      // Update the selected GRN if it's the same one
      if (selectedGRN.value && selectedGRN.value.id === id) {
        selectedGRN.value = updatedGRN;
      }

      // Show success toast
      showToast('success', `GRN status updated to ${getStatusLabel(status)}`);
    } catch (err) {
      console.error('Error updating GRN status:', err);
      showToast('error', 'Failed to update GRN status');
    } finally {
      updatingStatus.value = null;
    }
  };

  const completeGRN = async (id) => {
    await updateStatus(id, 'completed');
  };

  const markAllAsPassed = async () => {
    openConfirmModal('markPassed');
  };

  const markAllAsFailed = async () => {
    openConfirmModal('markFailed');
  };

  const updateInventoryData = async () => {
    try {
      updatingInventoryData.value = true;

      // Call the backend method to update GRN items with inventory data
      const response = await fetch(
        getApiUrl(`grn/${selectedGRN.value.id}/update-inventory-data`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update inventory data');
      }

      // Refresh the GRN details
      selectedGRN.value = await fetchGRNById(selectedGRN.value.id);

      showToast('success', 'Inventory data updated successfully');
    } catch (error) {
      console.error('Error updating inventory data:', error);
      showToast('error', 'Failed to update inventory data');
    } finally {
      updatingInventoryData.value = false;
    }
  };

  // Confirmation modal methods
  const openConfirmModal = (type) => {
    // Check if GRN is already completed
    if (selectedGRN.value?.status === 'completed') {
      showToast(
        'error',
        'Cannot modify quality inspection for completed GRN - items already added to inventory'
      );
      return;
    }

    const configs = {
      markPassed: {
        title: 'Mark All Items as Passed',
        message:
          'Are you sure you want to mark all items as passed? This will update the quality inspection status.',
        onConfirm: () => performMarkAllAsPassed(),
      },
      markFailed: {
        title: 'Mark All Items as Failed',
        message:
          'Are you sure you want to mark all items as failed? This will create returns for the received items and update the quality inspection status.',
        onConfirm: () => performMarkAllAsFailed(),
      },
    };

    const config = configs[type];
    confirmModal.value = {
      show: true,
      type,
      title: config.title,
      message: config.message,
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

  // Wrapper methods for confirmation actions
  const performMarkAllAsPassed = async () => {
    try {
      // Double-check GRN status before proceeding
      if (selectedGRN.value?.status === 'completed') {
        showToast(
          'error',
          'Cannot modify quality inspection for completed GRN'
        );
        return;
      }

      updatingStatus.value = selectedGRN.value.id;
      const updatedGRN = await performBulkQualityInspection(
        selectedGRN.value.id,
        'passed',
        'All items passed quality inspection'
      );
      if (updatedGRN) {
        selectedGRN.value = updatedGRN;
        showToast('success', 'All items marked as passed!');
      }
    } catch (err) {
      console.error('Error marking all items as passed:', err);
      showToast('error', 'Failed to mark all items as passed');
    } finally {
      updatingStatus.value = null;
    }
  };

  const performMarkAllAsFailed = async () => {
    try {
      // Double-check GRN status before proceeding
      if (selectedGRN.value?.status === 'completed') {
        showToast(
          'error',
          'Cannot modify quality inspection for completed GRN'
        );
        return;
      }

      updatingStatus.value = selectedGRN.value.id;
      const updatedGRN = await performBulkQualityInspection(
        selectedGRN.value.id,
        'failed',
        'All items failed quality inspection'
      );
      if (updatedGRN) {
        selectedGRN.value = updatedGRN;
        showToast('success', 'All items marked as failed!');
      }
    } catch (err) {
      console.error('Error marking all items as failed:', err);
      showToast('error', 'Failed to mark all items as failed');
    } finally {
      updatingStatus.value = null;
    }
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      draft:
        'badge badge-sm border-none bg-warning/10 text-warning font-thin border-none',
      pending_inspection:
        'badge badge-sm border-none bg-info/10 text-info font-thin border-none',
      passed:
        'badge badge-sm border-none bg-success/10 text-success font-thin border-none',
      failed:
        'badge badge-sm border-none bg-error/10 text-error font-thin border-none',
      completed:
        'badge badge-sm border-none bg-success/10 text-success font-thin border-none',
    };
    return (
      classes[status] ||
      'badge badge-sm border-none bg-neutral/10 text-neutral font-thin'
    );
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Draft',
      pending_inspection: 'Pending Inspection',
      passed: 'Passed',
      failed: 'Failed',
      completed: 'Completed',
    };
    return labels[status] || status;
  };

  const getQualityStatusBadgeClass = (status) => {
    const classes = {
      pending:
        'badge badge-sm border-none bg-warning/10 text-warning font-thin border-none',
      passed:
        'badge badge-sm border-none bg-success/10 text-success font-thin border-none',
      failed:
        'badge badge-sm border-none bg-error/10 text-error font-thin border-none',
      conditional:
        'badge badge-sm border-none bg-info/10 text-info font-thin border-none',
    };
    return (
      classes[status] ||
      'badge badge-sm border-none bg-neutral/10 text-neutral font-thin border-none'
    );
  };

  const getQualityStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      passed: 'Passed',
      failed: 'Failed',
      conditional: 'Conditional',
    };
    return labels[status] || status;
  };
</script>

<style scoped>
  .modal-box {
    max-height: 90vh;
    overflow-y: auto;
  }

  .table th {
    font-weight: 600;
    font-size: 0.8rem;
    padding: 0.75rem;
  }

  .table td {
    vertical-align: middle;
    padding: 0.75rem;
  }

  .badge {
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .table th,
    .table td {
      padding: 0.5rem 0.375rem;
      font-size: 0.8rem;
    }

    .modal-box {
      margin: 1rem;
      max-width: calc(100vw - 2rem);
    }

    .table {
      font-size: 0.75rem;
    }

    .btn {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
    }

    .select {
      font-size: 0.75rem;
    }
  }

  @media (max-width: 480px) {
    .table th,
    .table td {
      padding: 0.25rem 0.25rem;
      font-size: 0.7rem;
    }

    .modal-box {
      margin: 0.5rem;
      max-width: calc(100vw - 1rem);
    }
  }
</style>
