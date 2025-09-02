<script setup>
  import { ref, computed, onMounted } from 'vue';
  import {
    Shield,
    Search,
    FileText,
    Package,
    Truck,
    CheckCircle,
    AlertTriangle,
    RefreshCcw,
    Eye,
    Download,
    Calendar,
    Clock,
    MapPin,
    Users,
    Scan,
    Link,
    BookOpen,
    X,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';
  import { useInventoryStore } from '../../stores/inventoryStore.js';

  const productionStore = useProductionStore();
  const inventoryStore = useInventoryStore();

  // Reactive state
  const activeTab = ref('traceability');
  const searchQuery = ref('');
  const traceabilityQuery = ref('');
  const complianceFilter = ref('');
  const showTraceModal = ref(false);
  const showComplianceModal = ref(false);
  const traceResults = ref([]);
  const selectedBatch = ref(null);

  // Form data
  const traceForm = ref({
    search_type: 'batch_number',
    search_value: '',
    trace_direction: 'forward', // forward (ingredients to product) or backward (product to ingredients)
  });

  const complianceForm = ref({
    compliance_type: 'HACCP',
    date_from: '',
    date_to: '',
    include_quality: true,
    include_traceability: true,
    include_waste: false,
  });

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const productionBatches = computed(() => productionStore.productionBatches);
  const currentInventory = computed(() => inventoryStore.currentInventory);

  // Computed properties
  const recentBatches = computed(() => {
    return productionBatches.value
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);
  });

  const complianceStats = computed(() => {
    // Mock compliance data - would be calculated from real audit data
    return {
      haccp_compliance: 98,
      iso_compliance: 95,
      fda_compliance: 97,
      last_audit_date: '2025-01-15',
      next_audit_date: '2025-04-15',
      critical_issues: 2,
      minor_issues: 5,
    };
  });

  const traceabilityStats = computed(() => {
    const totalBatches = productionBatches.value.length;
    const trackedBatches = productionBatches.value.filter(
      (b) => b.batch_number
    ).length;
    const traceabilityRate =
      totalBatches > 0 ? Math.round((trackedBatches / totalBatches) * 100) : 0;

    return {
      totalBatches,
      trackedBatches,
      traceabilityRate,
      ingredientSources: currentInventory.value.length,
      supplierCount: [
        ...new Set(currentInventory.value.map((i) => i.supplier_id)),
      ].length,
    };
  });

  // Methods
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getComplianceStatusClass = (percentage) => {
    if (percentage >= 95) return 'text-success';
    if (percentage >= 85) return 'text-warning';
    return 'text-error';
  };

  const getBatchStatusClass = (status) => {
    switch (status) {
      case 'Completed':
        return 'badge-success';
      case 'Quality Check':
        return 'badge-warning';
      case 'In Progress':
        return 'badge-info';
      case 'Failed':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  };

  const openTraceModal = () => {
    traceForm.value = {
      search_type: 'batch_number',
      search_value: '',
      trace_direction: 'forward',
    };
    traceResults.value = [];
    showTraceModal.value = true;
  };

  const closeTraceModal = () => {
    showTraceModal.value = false;
    traceResults.value = [];
  };

  const openComplianceModal = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    complianceForm.value = {
      compliance_type: 'HACCP',
      date_from: firstDayOfMonth.toISOString().split('T')[0],
      date_to: today.toISOString().split('T')[0],
      include_quality: true,
      include_traceability: true,
      include_waste: false,
    };
    showComplianceModal.value = true;
  };

  const closeComplianceModal = () => {
    showComplianceModal.value = false;
  };

  const performTraceability = async () => {
    try {
      // TODO: Implement traceability search
      // This would trace ingredients from source to final product or vice versa
      traceResults.value = [
        {
          type: 'ingredient',
          name: 'Chicken Breast',
          batch_number: 'CB-2025-001',
          supplier: 'Fresh Poultry Supplier',
          received_date: '2025-01-20',
          expiry_date: '2025-01-27',
          grn_number: 'GRN-2025-001',
        },
        {
          type: 'production',
          name: 'Grilled Chicken Production',
          batch_number: 'GC-2025-001',
          production_date: '2025-01-22',
          quality_status: 'Passed',
          produced_by: 'John Doe',
        },
        {
          type: 'final_product',
          name: 'Grilled Chicken Meal',
          batch_number: 'GCM-2025-001',
          completion_date: '2025-01-22',
          quality_check: 'Passed',
          distributed_to: 'Restaurant Floor',
        },
      ];
      showToast('Traceability search completed!', 'success');
    } catch (error) {
      showToast(
        error.message || 'Failed to perform traceability search',
        'error'
      );
    }
  };

  const generateComplianceReport = async () => {
    try {
      // TODO: Implement compliance report generation
      closeComplianceModal();
      showToast('Compliance report generated successfully!', 'success');
    } catch (error) {
      showToast(
        error.message || 'Failed to generate compliance report',
        'error'
      );
    }
  };

  const refreshData = async () => {
    try {
      await Promise.all([
        productionStore.fetchProductionOrders(),
        inventoryStore.fetchCurrentInventory(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const showToast = (message, type) => {
    // TODO: Implement toast notification
    console.log(`${type}: ${message}`);
  };

  // Lifecycle
  onMounted(async () => {
    await refreshData();
  });
</script>

<template>
  <div class="p-6 space-y-6 bg-base-100 min-h-screen">
    <!-- Header -->
    <div
      class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
    >
      <div>
        <h1
          class="text-3xl font-bold text-primaryColor flex items-center gap-3"
        >
          <Shield class="w-8 h-8" />
          Traceability & Compliance
        </h1>
        <p class="text-base-content/70 mt-1">
          Ensure food safety and regulatory compliance
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="refreshData"
          class="btn btn-ghost btn-sm"
          :disabled="loading"
        >
          <RefreshCcw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
        <button @click="openTraceModal" class="btn btn-outline btn-sm">
          <Scan class="w-4 h-4" />
          Trace Item
        </button>
        <button
          @click="openComplianceModal"
          class="btn bg-primaryColor text-white btn-sm hover:bg-primaryColor/80"
        >
          <Download class="w-4 h-4" />
          Compliance Report
        </button>
      </div>
    </div>

    <!-- Compliance Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              HACCP Compliance
            </p>
            <p
              class="text-2xl font-bold"
              :class="
                getComplianceStatusClass(complianceStats.haccp_compliance)
              "
            >
              {{ complianceStats.haccp_compliance }}%
            </p>
          </div>
          <Shield class="w-8 h-8 text-primaryColor opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              ISO Compliance
            </p>
            <p
              class="text-2xl font-bold"
              :class="getComplianceStatusClass(complianceStats.iso_compliance)"
            >
              {{ complianceStats.iso_compliance }}%
            </p>
          </div>
          <CheckCircle class="w-8 h-8 text-success opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              Traceability Rate
            </p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ traceabilityStats.traceabilityRate }}%
            </p>
          </div>
          <Link class="w-8 h-8 text-info opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              Critical Issues
            </p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ complianceStats.critical_issues }}
            </p>
          </div>
          <AlertTriangle class="w-8 h-8 text-error opacity-80" />
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed bg-accentColor w-fit">
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'traceability' }"
        @click="activeTab = 'traceability'"
      >
        Traceability
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'compliance' }"
        @click="activeTab = 'compliance'"
      >
        Compliance
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'audits' }"
        @click="activeTab = 'audits'"
      >
        Audit Trail
      </a>
    </div>

    <!-- Traceability Tab -->
    <div v-if="activeTab === 'traceability'" class="space-y-6">
      <!-- Traceability Overview -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Traceability Status
          </h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Total Batches:</span>
              <span class="font-bold text-lg text-primaryColor">{{
                traceabilityStats.totalBatches
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Tracked Batches:</span>
              <span class="font-bold text-lg text-success">{{
                traceabilityStats.trackedBatches
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Traceability Rate:</span>
              <span class="font-bold text-lg text-primaryColor"
                >{{ traceabilityStats.traceabilityRate }}%</span
              >
            </div>
            <div class="divider"></div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Ingredient Sources:</span>
              <span class="font-medium">{{
                traceabilityStats.ingredientSources
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Suppliers:</span>
              <span class="font-medium">{{
                traceabilityStats.supplierCount
              }}</span>
            </div>
          </div>
        </div>

        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Quick Trace
          </h3>
          <div class="space-y-4">
            <div class="form-control">
              <input
                v-model="traceabilityQuery"
                type="text"
                class="input input-bordered"
                placeholder="Enter batch number, lot number, or product code"
              />
            </div>
            <button
              @click="openTraceModal"
              class="btn bg-primaryColor text-white w-full"
            >
              <Scan class="w-4 h-4" />
              Trace Item
            </button>
          </div>
        </div>
      </div>

      <!-- Recent Batches -->
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <h3 class="text-lg font-semibold text-primaryColor mb-4">
          Recent Production Batches
        </h3>

        <div v-if="recentBatches.length === 0" class="text-center py-8">
          <Package class="w-12 h-12 text-base-content/30 mx-auto mb-2" />
          <p class="text-base-content/70">No recent batches found</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Batch Number</th>
                <th>Product</th>
                <th>Production Date</th>
                <th>Status</th>
                <th>Quantity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="batch in recentBatches" :key="batch.id">
                <td>
                  <div class="font-medium text-primaryColor">
                    {{ batch.batch_number }}
                  </div>
                  <div class="text-xs text-base-content/60">
                    {{ batch.recipe_name || 'No recipe' }}
                  </div>
                </td>
                <td>{{ batch.product_name || 'N/A' }}</td>
                <td>{{ formatDate(batch.start_time || batch.created_at) }}</td>
                <td>
                  <div class="badge" :class="getBatchStatusClass(batch.status)">
                    {{ batch.status }}
                  </div>
                </td>
                <td>
                  {{ batch.quantity_produced || 0 }} / {{ batch.batch_size }}
                </td>
                <td>
                  <button
                    @click="traceBatch(batch)"
                    class="btn btn-ghost btn-xs"
                  >
                    <Link class="w-3 h-3" />
                    Trace
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Compliance Tab -->
    <div v-else-if="activeTab === 'compliance'" class="space-y-6">
      <!-- Compliance Dashboard -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            HACCP Compliance
          </h3>
          <div class="text-center">
            <div
              class="radial-progress text-success mb-4"
              :style="`--value:${complianceStats.haccp_compliance}`"
            >
              {{ complianceStats.haccp_compliance }}%
            </div>
            <p class="text-sm text-base-content/70">
              Hazard Analysis Critical Control Points
            </p>
          </div>
        </div>

        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            ISO Compliance
          </h3>
          <div class="text-center">
            <div
              class="radial-progress text-info mb-4"
              :style="`--value:${complianceStats.iso_compliance}`"
            >
              {{ complianceStats.iso_compliance }}%
            </div>
            <p class="text-sm text-base-content/70">
              ISO 22000 Food Safety Management
            </p>
          </div>
        </div>

        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            FDA Compliance
          </h3>
          <div class="text-center">
            <div
              class="radial-progress text-warning mb-4"
              :style="`--value:${complianceStats.fda_compliance}`"
            >
              {{ complianceStats.fda_compliance }}%
            </div>
            <p class="text-sm text-base-content/70">
              Food and Drug Administration
            </p>
          </div>
        </div>
      </div>

      <!-- Compliance Issues -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Outstanding Issues
          </h3>
          <div class="space-y-3">
            <div class="p-3 bg-error/10 border border-error/20 rounded-lg">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="font-medium text-error">
                    Temperature Log Missing
                  </h4>
                  <p class="text-sm text-base-content/70">
                    Cold storage temperature not recorded for 2 hours
                  </p>
                  <p class="text-xs text-base-content/60 mt-1">
                    Equipment: Cold Storage Unit #2
                  </p>
                </div>
                <div class="badge badge-error">Critical</div>
              </div>
            </div>

            <div class="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="font-medium text-warning">
                    Incomplete Quality Check
                  </h4>
                  <p class="text-sm text-base-content/70">
                    Final product inspection pending for Batch GC-001
                  </p>
                  <p class="text-xs text-base-content/60 mt-1">Due: Today</p>
                </div>
                <div class="badge badge-warning">Minor</div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Audit Schedule
          </h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Last Audit:</span>
              <span class="font-medium">{{
                formatDate(complianceStats.last_audit_date)
              }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Next Audit:</span>
              <span class="font-medium">{{
                formatDate(complianceStats.next_audit_date)
              }}</span>
            </div>
            <div class="divider"></div>
            <div class="flex justify-between items-center">
              <span class="text-base-content/70">Days Until Next Audit:</span>
              <span class="font-bold text-lg text-primaryColor">
                {{
                  Math.ceil(
                    (new Date(complianceStats.next_audit_date) - new Date()) /
                      (1000 * 60 * 60 * 24)
                  )
                }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Audit Trail Tab -->
    <div v-else-if="activeTab === 'audits'" class="space-y-6">
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <h3 class="text-lg font-semibold text-primaryColor mb-4">
          Audit Trail
        </h3>
        <div class="text-center py-12">
          <FileText class="w-16 h-16 text-base-content/30 mx-auto mb-4" />
          <p class="text-lg font-medium text-base-content/70">Audit Trail</p>
          <p class="text-base-content/50">
            Complete audit trail and compliance history will be displayed here
          </p>
        </div>
      </div>
    </div>

    <!-- Traceability Modal -->
    <dialog :class="{ 'modal modal-open': showTraceModal }" class="modal">
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Item Traceability
        </h3>

        <form @submit.prevent="performTraceability" class="space-y-4 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Search Type</span>
              </label>
              <select
                v-model="traceForm.search_type"
                class="select select-bordered"
              >
                <option value="batch_number">Batch Number</option>
                <option value="lot_number">Lot Number</option>
                <option value="product_code">Product Code</option>
                <option value="grn_number">GRN Number</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Search Value</span>
              </label>
              <input
                v-model="traceForm.search_value"
                type="text"
                class="input input-bordered"
                placeholder="Enter search value"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Direction</span>
              </label>
              <select
                v-model="traceForm.trace_direction"
                class="select select-bordered"
              >
                <option value="forward">Forward (Ingredients → Product)</option>
                <option value="backward">
                  Backward (Product → Ingredients)
                </option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            class="btn bg-primaryColor text-white"
            :disabled="loading"
          >
            <span
              v-if="loading"
              class="loading loading-spinner loading-sm"
            ></span>
            <Scan class="w-4 h-4" />
            Trace Item
          </button>
        </form>

        <!-- Trace Results -->
        <div v-if="traceResults.length > 0" class="space-y-4">
          <h4 class="font-semibold text-primaryColor">Traceability Chain</h4>

          <div class="space-y-3">
            <div
              v-for="(result, index) in traceResults"
              :key="index"
              class="flex items-center gap-4 p-4 bg-base-100 rounded-lg border"
            >
              <div class="flex-shrink-0">
                <div
                  class="w-8 h-8 bg-primaryColor text-white rounded-full flex items-center justify-center text-sm font-bold"
                >
                  {{ index + 1 }}
                </div>
              </div>

              <div class="flex-1">
                <h5 class="font-medium text-primaryColor">{{ result.name }}</h5>
                <div class="text-sm text-base-content/70 space-y-1">
                  <div>Batch: {{ result.batch_number }}</div>
                  <div v-if="result.supplier">
                    Supplier: {{ result.supplier }}
                  </div>
                  <div v-if="result.received_date">
                    Received: {{ formatDate(result.received_date) }}
                  </div>
                  <div v-if="result.production_date">
                    Produced: {{ formatDate(result.production_date) }}
                  </div>
                  <div v-if="result.expiry_date">
                    Expires: {{ formatDate(result.expiry_date) }}
                  </div>
                </div>
              </div>

              <div class="flex-shrink-0">
                <div
                  v-if="result.quality_status"
                  class="badge"
                  :class="
                    result.quality_status === 'Passed'
                      ? 'badge-success'
                      : 'badge-error'
                  "
                >
                  {{ result.quality_status }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeTraceModal"
            class="btn bg-primaryColor text-white"
          >
            Close
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeTraceModal">close</button>
      </form>
    </dialog>

    <!-- Compliance Report Modal -->
    <dialog :class="{ 'modal modal-open': showComplianceModal }" class="modal">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Generate Compliance Report
        </h3>

        <form @submit.prevent="generateComplianceReport" class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Compliance Type</span>
            </label>
            <select
              v-model="complianceForm.compliance_type"
              class="select select-bordered"
            >
              <option value="HACCP">HACCP Report</option>
              <option value="ISO">ISO 22000 Report</option>
              <option value="FDA">FDA Compliance Report</option>
              <option value="Full">Full Compliance Report</option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">From Date</span>
              </label>
              <input
                v-model="complianceForm.date_from"
                type="date"
                class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">To Date</span>
              </label>
              <input
                v-model="complianceForm.date_to"
                type="date"
                class="input input-bordered"
              />
            </div>
          </div>

          <div class="space-y-2">
            <div class="form-control">
              <label class="cursor-pointer label">
                <input
                  v-model="complianceForm.include_quality"
                  type="checkbox"
                  class="checkbox checkbox-primary"
                />
                <span class="label-text ml-2"
                  >Include quality inspection data</span
                >
              </label>
            </div>

            <div class="form-control">
              <label class="cursor-pointer label">
                <input
                  v-model="complianceForm.include_traceability"
                  type="checkbox"
                  class="checkbox checkbox-primary"
                />
                <span class="label-text ml-2"
                  >Include traceability information</span
                >
              </label>
            </div>

            <div class="form-control">
              <label class="cursor-pointer label">
                <input
                  v-model="complianceForm.include_waste"
                  type="checkbox"
                  class="checkbox checkbox-primary"
                />
                <span class="label-text ml-2"
                  >Include waste management data</span
                >
              </label>
            </div>
          </div>

          <div class="modal-action">
            <button
              type="button"
              @click="closeComplianceModal"
              class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
              :disabled="loading"
            >
              <span
                v-if="loading"
                class="loading loading-spinner loading-sm"
              ></span>
              <Download class="w-4 h-4 mr-2" />
              Generate Report
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeComplianceModal">close</button>
      </form>
    </dialog>

    <!-- Error Display -->
    <div v-if="error" class="alert alert-error">
      <AlertTriangle class="w-5 h-5" />
      <span>{{ error }}</span>
    </div>
  </div>
</template>
