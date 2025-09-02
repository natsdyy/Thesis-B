<script setup>
  import { ref, computed, onMounted } from 'vue';
  import {
    Shield,
    Plus,
    Search,
    CheckCircle,
    XCircle,
    AlertTriangle,
    RefreshCcw,
    Eye,
    Edit,
    FileText,
    Clock,
    User,
    Package,
    Activity,
    Target,
    TrendingUp,
    X,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';

  const productionStore = useProductionStore();

  // Reactive state
  const searchQuery = ref('');
  const statusFilter = ref('');
  const typeFilter = ref('');
  const stageFilter = ref('');
  const dateFilter = ref('');
  const showCreateModal = ref(false);
  const showDetailsModal = ref(false);
  const selectedInspection = ref(null);
  const activeTab = ref('inspections');

  // Form data
  const inspectionForm = ref({
    inspection_type: 'Final Product',
    inspection_stage: 'Post-Production',
    production_batch_id: '',
    work_order_id: '',
    inspector_id: '',
    inspection_criteria: '',
    findings: '',
    corrective_actions: '',
    requires_retest: false,
    retest_date: '',
  });

  const checklistItems = ref([]);
  const newChecklistItem = ref({
    check_item: '',
    check_description: '',
    is_critical: false,
  });

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const qualityInspections = computed(() => productionStore.qualityInspections);
  const productionBatches = computed(() => productionStore.productionBatches);
  const workOrders = computed(() => productionStore.workOrders);

  // Computed properties
  const filteredInspections = computed(() => {
    let filtered = qualityInspections.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (inspection) =>
          inspection.inspection_number.toLowerCase().includes(query) ||
          inspection.findings?.toLowerCase().includes(query)
      );
    }

    if (statusFilter.value) {
      filtered = filtered.filter(
        (inspection) => inspection.status === statusFilter.value
      );
    }

    if (typeFilter.value) {
      filtered = filtered.filter(
        (inspection) => inspection.inspection_type === typeFilter.value
      );
    }

    if (stageFilter.value) {
      filtered = filtered.filter(
        (inspection) => inspection.inspection_stage === stageFilter.value
      );
    }

    if (dateFilter.value) {
      const filterDate = new Date(dateFilter.value).toISOString().split('T')[0];
      filtered = filtered.filter((inspection) =>
        inspection.inspection_date.startsWith(filterDate)
      );
    }

    return filtered.sort(
      (a, b) => new Date(b.inspection_date) - new Date(a.inspection_date)
    );
  });

  const qualityStats = computed(() => {
    const total = qualityInspections.value.length;
    const passed = qualityInspections.value.filter(
      (i) => i.status === 'Passed'
    ).length;
    const failed = qualityInspections.value.filter(
      (i) => i.status === 'Failed'
    ).length;
    const pending = qualityInspections.value.filter(
      (i) => i.status === 'Pending'
    ).length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    return { total, passed, failed, pending, passRate };
  });

  const todayInspections = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return qualityInspections.value.filter((inspection) =>
      inspection.inspection_date.startsWith(today)
    );
  });

  const criticalFailures = computed(() => {
    return qualityInspections.value.filter(
      (inspection) =>
        inspection.status === 'Failed' &&
        inspection.checklist_items?.some(
          (item) => item.is_critical && item.result === 'Fail'
        )
    );
  });

  // Methods
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Passed':
        return 'badge-success';
      case 'Failed':
        return 'badge-error';
      case 'Conditional Pass':
        return 'badge-warning';
      case 'In Progress':
        return 'badge-info';
      case 'Pending':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  };

  const getInspectionTypeIcon = (type) => {
    switch (type) {
      case 'Raw Material':
        return Package;
      case 'In-Process':
        return Activity;
      case 'Final Product':
        return Target;
      case 'Equipment':
        return Shield;
      default:
        return FileText;
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const openCreateModal = () => {
    resetForm();
    showCreateModal.value = true;
  };

  const closeCreateModal = () => {
    showCreateModal.value = false;
    resetForm();
  };

  const openDetailsModal = (inspection) => {
    selectedInspection.value = inspection;
    showDetailsModal.value = true;
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedInspection.value = null;
  };

  const resetForm = () => {
    inspectionForm.value = {
      inspection_type: 'Final Product',
      inspection_stage: 'Post-Production',
      production_batch_id: '',
      work_order_id: '',
      inspector_id: '',
      inspection_criteria: '',
      findings: '',
      corrective_actions: '',
      requires_retest: false,
      retest_date: '',
    };
    checklistItems.value = [];
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.value.check_item) return;

    checklistItems.value.push({
      ...newChecklistItem.value,
      id: Date.now(), // Temporary ID
    });

    newChecklistItem.value = {
      check_item: '',
      check_description: '',
      is_critical: false,
    };
  };

  const removeChecklistItem = (index) => {
    checklistItems.value.splice(index, 1);
  };

  const createInspection = async () => {
    try {
      const inspectionData = {
        ...inspectionForm.value,
        checklist_items: checklistItems.value,
      };
      // TODO: Implement create inspection in store
      closeCreateModal();
      showToast('Quality inspection created successfully!', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to create inspection', 'error');
    }
  };

  const refreshData = async () => {
    try {
      await Promise.all([
        productionStore.fetchQualityInspections(),
        productionStore.fetchProductionOrders(),
        productionStore.fetchWorkOrders(),
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
          Quality Control
        </h1>
        <p class="text-base-content/70 mt-1">
          Manage quality inspections and ensure food safety standards
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
        <button
          @click="openCreateModal"
          class="btn bg-primaryColor text-white btn-sm hover:bg-primaryColor/80"
        >
          <Plus class="w-4 h-4" />
          New Inspection
        </button>
      </div>
    </div>

    <!-- Quality Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-6">
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              Total Inspections
            </p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ qualityStats.total }}
            </p>
          </div>
          <Shield class="w-8 h-8 text-primaryColor opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Passed</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ qualityStats.passed }}
            </p>
          </div>
          <CheckCircle class="w-8 h-8 text-success opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Failed</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ qualityStats.failed }}
            </p>
          </div>
          <XCircle class="w-8 h-8 text-error opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Pass Rate</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ qualityStats.passRate }}%
            </p>
          </div>
          <TrendingUp class="w-8 h-8 text-info opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Today</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ todayInspections.length }}
            </p>
          </div>
          <Clock class="w-8 h-8 text-warning opacity-80" />
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed bg-accentColor w-fit">
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'inspections' }"
        @click="activeTab = 'inspections'"
      >
        Inspections
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'critical' }"
        @click="activeTab = 'critical'"
      >
        Critical Failures
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'analytics' }"
        @click="activeTab = 'analytics'"
      >
        Analytics
      </a>
    </div>

    <!-- Inspections Tab -->
    <div v-if="activeTab === 'inspections'">
      <!-- Filters -->
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex flex-col lg:flex-row gap-4">
          <div class="form-control flex-1">
            <div class="input-group">
              <span class="bg-base-200">
                <Search class="w-4 h-4" />
              </span>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search inspections..."
                class="input input-bordered w-full"
              />
            </div>
          </div>

          <div class="form-control">
            <select v-model="statusFilter" class="select select-bordered">
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Passed">Passed</option>
              <option value="Failed">Failed</option>
              <option value="Conditional Pass">Conditional Pass</option>
            </select>
          </div>

          <div class="form-control">
            <select v-model="typeFilter" class="select select-bordered">
              <option value="">All Types</option>
              <option value="Raw Material">Raw Material</option>
              <option value="In-Process">In-Process</option>
              <option value="Final Product">Final Product</option>
              <option value="Equipment">Equipment</option>
            </select>
          </div>

          <div class="form-control">
            <select v-model="stageFilter" class="select select-bordered">
              <option value="">All Stages</option>
              <option value="Pre-Production">Pre-Production</option>
              <option value="During Production">During Production</option>
              <option value="Post-Production">Post-Production</option>
            </select>
          </div>

          <div class="form-control">
            <input
              v-model="dateFilter"
              type="date"
              class="input input-bordered"
            />
          </div>
        </div>
      </div>

      <!-- Inspections List -->
      <div v-if="loading" class="flex justify-center py-12">
        <span
          class="loading loading-spinner loading-lg text-primaryColor"
        ></span>
      </div>

      <div
        v-else-if="filteredInspections.length === 0"
        class="text-center py-12 bg-accentColor rounded-xl"
      >
        <Shield class="w-16 h-16 text-base-content/30 mx-auto mb-4" />
        <p class="text-lg font-medium text-base-content/70">
          No inspections found
        </p>
        <p class="text-base-content/50">
          Create your first quality inspection to get started
        </p>
      </div>

      <div v-else class="bg-accentColor rounded-xl shadow-sm border">
        <div class="p-6 border-b">
          <h2 class="text-xl font-semibold text-primaryColor">
            Quality Inspections
          </h2>
        </div>

        <div class="divide-y divide-base-200">
          <div
            v-for="inspection in filteredInspections"
            :key="inspection.id"
            class="p-6 hover:bg-base-50 transition-colors cursor-pointer"
            @click="openDetailsModal(inspection)"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <component
                    :is="getInspectionTypeIcon(inspection.inspection_type)"
                    class="w-5 h-5 text-primaryColor"
                  />
                  <h3 class="text-lg font-semibold text-primaryColor">
                    {{ inspection.inspection_number }}
                  </h3>
                  <div
                    class="badge"
                    :class="getStatusBadgeClass(inspection.status)"
                  >
                    {{ inspection.status }}
                  </div>
                  <div
                    v-if="inspection.requires_retest"
                    class="badge badge-warning"
                  >
                    Retest Required
                  </div>
                </div>

                <div
                  class="flex items-center gap-6 text-sm text-base-content/70 mb-2"
                >
                  <span>{{ inspection.inspection_type }}</span>
                  <span>{{ inspection.inspection_stage }}</span>
                  <span v-if="inspection.inspector_name"
                    >Inspector: {{ inspection.inspector_name }}</span
                  >
                  <span>{{ formatDateTime(inspection.inspection_date) }}</span>
                </div>

                <div
                  v-if="inspection.findings"
                  class="text-sm text-base-content/60"
                >
                  Findings: {{ inspection.findings.substring(0, 100)
                  }}{{ inspection.findings.length > 100 ? '...' : '' }}
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  @click.stop="openDetailsModal(inspection)"
                  class="btn btn-ghost btn-sm"
                >
                  <Eye class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Critical Failures Tab -->
    <div v-else-if="activeTab === 'critical'">
      <div class="bg-accentColor rounded-xl shadow-sm border">
        <div class="p-6 border-b">
          <h2 class="text-xl font-semibold text-error flex items-center gap-2">
            <AlertTriangle class="w-5 h-5" />
            Critical Failures
          </h2>
        </div>

        <div v-if="criticalFailures.length === 0" class="text-center py-12">
          <CheckCircle class="w-16 h-16 text-success mx-auto mb-4" />
          <p class="text-lg font-medium text-success">No critical failures</p>
          <p class="text-base-content/50">
            All quality inspections are passing critical checks
          </p>
        </div>

        <div v-else class="divide-y divide-base-200">
          <div
            v-for="inspection in criticalFailures"
            :key="inspection.id"
            class="p-6 bg-error/5 border-l-4 border-error"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-error mb-2">
                  {{ inspection.inspection_number }}
                </h3>
                <p class="text-sm text-base-content/70 mb-2">
                  {{ inspection.inspection_type }} •
                  {{ inspection.inspection_stage }} •
                  {{ formatDateTime(inspection.inspection_date) }}
                </p>
                <div class="bg-base-100 p-3 rounded-lg">
                  <h4 class="font-medium text-primaryColor mb-1">
                    Critical Issues:
                  </h4>
                  <ul class="text-sm text-error space-y-1">
                    <li
                      v-for="item in inspection.checklist_items?.filter(
                        (i) => i.is_critical && i.result === 'Fail'
                      )"
                      :key="item.id"
                    >
                      • {{ item.check_item
                      }}{{ item.notes ? ` - ${item.notes}` : '' }}
                    </li>
                  </ul>
                </div>
                <div v-if="inspection.corrective_actions" class="mt-2">
                  <h4 class="font-medium text-primaryColor mb-1">
                    Corrective Actions:
                  </h4>
                  <p class="text-sm text-base-content/70">
                    {{ inspection.corrective_actions }}
                  </p>
                </div>
              </div>
              <button
                @click="openDetailsModal(inspection)"
                class="btn btn-outline btn-sm"
              >
                <Eye class="w-4 h-4" />
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Tab -->
    <div v-else-if="activeTab === 'analytics'">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Quality Trends -->
        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Quality Trends
          </h3>
          <div class="text-center py-8">
            <TrendingUp class="w-16 h-16 text-base-content/30 mx-auto mb-4" />
            <p class="text-base-content/70">
              Quality trends chart will be implemented here
            </p>
          </div>
        </div>

        <!-- Inspection Types Distribution -->
        <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
          <h3 class="text-lg font-semibold text-primaryColor mb-4">
            Inspection Types
          </h3>
          <div class="space-y-3">
            <div
              v-for="type in [
                'Raw Material',
                'In-Process',
                'Final Product',
                'Equipment',
              ]"
              :key="type"
              class="flex items-center justify-between"
            >
              <span class="text-sm">{{ type }}</span>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">
                  {{
                    qualityInspections.filter((i) => i.inspection_type === type)
                      .length
                  }}
                </span>
                <progress
                  class="progress progress-primary w-20"
                  :value="
                    qualityInspections.filter((i) => i.inspection_type === type)
                      .length
                  "
                  :max="qualityStats.total || 1"
                ></progress>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Inspection Details Modal -->
    <dialog :class="{ 'modal modal-open': showDetailsModal }" class="modal">
      <div class="modal-box max-w-4xl" v-if="selectedInspection">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Inspection Details
        </h3>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <h4 class="font-semibold text-primaryColor mb-2">
                Inspection Information
              </h4>
              <div class="bg-base-100 p-4 rounded-lg space-y-2">
                <div class="flex justify-between">
                  <span class="text-base-content/70">Inspection #:</span>
                  <span class="font-medium">{{
                    selectedInspection.inspection_number
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Type:</span>
                  <span class="font-medium">{{
                    selectedInspection.inspection_type
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Stage:</span>
                  <span class="font-medium">{{
                    selectedInspection.inspection_stage
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Status:</span>
                  <div
                    class="badge"
                    :class="getStatusBadgeClass(selectedInspection.status)"
                  >
                    {{ selectedInspection.status }}
                  </div>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Inspector:</span>
                  <span class="font-medium">{{
                    selectedInspection.inspector_name || 'N/A'
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Date:</span>
                  <span class="font-medium">{{
                    formatDateTime(selectedInspection.inspection_date)
                  }}</span>
                </div>
              </div>
            </div>

            <div v-if="selectedInspection.inspection_criteria">
              <h4 class="font-semibold text-primaryColor mb-2">
                Inspection Criteria
              </h4>
              <div class="bg-base-100 p-4 rounded-lg">
                <p class="text-sm">
                  {{ selectedInspection.inspection_criteria }}
                </p>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div v-if="selectedInspection.findings">
              <h4 class="font-semibold text-primaryColor mb-2">Findings</h4>
              <div class="bg-base-100 p-4 rounded-lg">
                <p class="text-sm">{{ selectedInspection.findings }}</p>
              </div>
            </div>

            <div v-if="selectedInspection.corrective_actions">
              <h4 class="font-semibold text-primaryColor mb-2">
                Corrective Actions
              </h4>
              <div class="bg-base-100 p-4 rounded-lg">
                <p class="text-sm">
                  {{ selectedInspection.corrective_actions }}
                </p>
              </div>
            </div>

            <div
              v-if="
                selectedInspection.checklist_items &&
                selectedInspection.checklist_items.length > 0
              "
            >
              <h4 class="font-semibold text-primaryColor mb-2">
                Checklist Items
              </h4>
              <div class="bg-base-100 p-4 rounded-lg max-h-64 overflow-y-auto">
                <div class="space-y-2">
                  <div
                    v-for="item in selectedInspection.checklist_items"
                    :key="item.id"
                    class="flex items-center justify-between p-2 bg-base-200 rounded"
                  >
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-sm">{{
                          item.check_item
                        }}</span>
                        <span
                          v-if="item.is_critical"
                          class="badge badge-error badge-xs"
                          >Critical</span
                        >
                      </div>
                      <div
                        v-if="item.check_description"
                        class="text-xs text-base-content/60"
                      >
                        {{ item.check_description }}
                      </div>
                      <div
                        v-if="item.notes"
                        class="text-xs text-base-content/60 mt-1"
                      >
                        Notes: {{ item.notes }}
                      </div>
                    </div>
                    <div class="flex items-center">
                      <div
                        v-if="item.result === 'Pass'"
                        class="badge badge-success badge-sm"
                      >
                        <CheckCircle class="w-3 h-3 mr-1" />
                        Pass
                      </div>
                      <div
                        v-else-if="item.result === 'Fail'"
                        class="badge badge-error badge-sm"
                      >
                        <XCircle class="w-3 h-3 mr-1" />
                        Fail
                      </div>
                      <div v-else class="badge badge-neutral badge-sm">N/A</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeDetailsModal"
            class="btn bg-primaryColor text-white"
          >
            Close
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDetailsModal">close</button>
      </form>
    </dialog>

    <!-- Create Inspection Modal -->
    <dialog :class="{ 'modal modal-open': showCreateModal }" class="modal">
      <div class="modal-box max-w-3xl">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Create Quality Inspection
        </h3>

        <form @submit.prevent="createInspection" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Inspection Type</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <select
                v-model="inspectionForm.inspection_type"
                class="select select-bordered"
                required
              >
                <option value="Raw Material">Raw Material</option>
                <option value="In-Process">In-Process</option>
                <option value="Final Product">Final Product</option>
                <option value="Equipment">Equipment</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Inspection Stage</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <select
                v-model="inspectionForm.inspection_stage"
                class="select select-bordered"
                required
              >
                <option value="Pre-Production">Pre-Production</option>
                <option value="During Production">During Production</option>
                <option value="Post-Production">Post-Production</option>
              </select>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Inspection Criteria</span>
            </label>
            <textarea
              v-model="inspectionForm.inspection_criteria"
              class="textarea textarea-bordered"
              rows="3"
              placeholder="Define what will be inspected and the standards to meet..."
            ></textarea>
          </div>

          <!-- Checklist Items -->
          <div class="divider">Checklist Items</div>

          <div class="bg-base-200 p-4 rounded-lg">
            <div class="flex gap-2 mb-4">
              <input
                v-model="newChecklistItem.check_item"
                type="text"
                class="input input-bordered input-sm flex-1"
                placeholder="Check item name"
              />
              <input
                v-model="newChecklistItem.check_description"
                type="text"
                class="input input-bordered input-sm flex-1"
                placeholder="Description (optional)"
              />
              <label class="cursor-pointer flex items-center gap-2">
                <input
                  v-model="newChecklistItem.is_critical"
                  type="checkbox"
                  class="checkbox checkbox-sm"
                />
                <span class="text-sm">Critical</span>
              </label>
              <button
                type="button"
                @click="addChecklistItem"
                class="btn btn-primary btn-sm"
              >
                <Plus class="w-4 h-4" />
              </button>
            </div>

            <div v-if="checklistItems.length === 0" class="text-center py-4">
              <p class="text-sm text-base-content/60">
                No checklist items added yet
              </p>
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="(item, index) in checklistItems"
                :key="item.id"
                class="flex items-center justify-between p-2 bg-base-100 rounded"
              >
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-sm">{{
                      item.check_item
                    }}</span>
                    <span
                      v-if="item.is_critical"
                      class="badge badge-error badge-xs"
                      >Critical</span
                    >
                  </div>
                  <div
                    v-if="item.check_description"
                    class="text-xs text-base-content/60"
                  >
                    {{ item.check_description }}
                  </div>
                </div>
                <button
                  type="button"
                  @click="removeChecklistItem(index)"
                  class="btn btn-ghost btn-xs text-error"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div class="modal-action">
            <button
              type="button"
              @click="closeCreateModal"
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
              Create Inspection
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeCreateModal">close</button>
      </form>
    </dialog>

    <!-- Error Display -->
    <div v-if="error" class="alert alert-error">
      <AlertTriangle class="w-5 h-5" />
      <span>{{ error }}</span>
    </div>
  </div>
</template>
