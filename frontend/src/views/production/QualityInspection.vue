<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
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
    Trash2,
    Star,
    Clock,
    User,
    Package,
    Activity,
    Target,
    TrendingUp,
    Calendar,
    BarChart3,
    X,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';
  import { useAuthStore } from '../../stores/authStore.js';

  const productionStore = useProductionStore();
  const authStore = useAuthStore();

  // Reactive state
  const activeTab = ref('inspections');
  const searchQuery = ref('');
  const statusFilter = ref('');
  const resultFilter = ref('');
  const dateFilter = ref('');
  const showCreateModal = ref(false);
  const showDetailsModal = ref(false);
  const selectedInspection = ref(null);
  const currentPage = ref(1);
  const itemsPerPage = ref(12);
  const expandedItems = ref(new Set());

  // Form data
  const inspectionForm = ref({
    sample_production_id: '',
    inspection_type: 'Sample Test',
    inspection_date: new Date().toISOString().split('T')[0],
    inspection_time: '',
    taste_score: '',
    appearance_score: '',
    texture_score: '',
    overall_quality_score: '',
    findings: '',
    corrective_actions: '',
    recommendations: '',
    requires_retest: false,
    retest_date: '',
  });

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const qualityInspections = computed(() => productionStore.qualityInspections);
  const sampleProductions = computed(() =>
    productionStore.sampleProductions.filter((sp) => sp.status === 'Completed')
  );
  const qualityInspectionStats = computed(
    () => productionStore.qualityInspectionStats
  );

  // Computed properties
  const filteredInspections = computed(() => {
    let filtered = qualityInspections.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (inspection) =>
          inspection.inspection_number.toLowerCase().includes(query) ||
          inspection.item_name?.toLowerCase().includes(query) ||
          inspection.sample_batch_number?.toLowerCase().includes(query) ||
          inspection.findings?.toLowerCase().includes(query)
      );
    }

    if (statusFilter.value) {
      filtered = filtered.filter(
        (inspection) => inspection.result === statusFilter.value
      );
    }

    if (resultFilter.value) {
      filtered = filtered.filter(
        (inspection) => inspection.result === resultFilter.value
      );
    }

    if (dateFilter.value) {
      filtered = filtered.filter(
        (inspection) => inspection.inspection_date === dateFilter.value
      );
    }

    return filtered.sort((a, b) => {
      // Sort by inspection date, then time
      const dateCompare =
        new Date(b.inspection_date + ' ' + (b.inspection_time || '00:00')) -
        new Date(a.inspection_date + ' ' + (a.inspection_time || '00:00'));
      return dateCompare;
    });
  });

  const paginatedInspections = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return filteredInspections.value.slice(start, start + itemsPerPage.value);
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredInspections.value.length / itemsPerPage.value);
  });

  // Available sample productions for inspection
  const availableSampleProductions = computed(() => {
    return sampleProductions.value.filter((sample) => {
      // Only show samples that don't have a completed inspection
      const existingInspection = qualityInspections.value.find(
        (inspection) =>
          inspection.sample_production_id === sample.id &&
          inspection.result !== 'Retest Required'
      );
      return !existingInspection;
    });
  });

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getResultBadgeClass = (result) => {
    const classes = {
      Pass: 'badge-sm border-none font-medium bg-success/20 text-success',
      Fail: 'badge-sm border-none font-medium bg-error/20 text-error',
      Pending: 'badge-sm border-none font-medium bg-warning/20 text-warning',
      'Retest Required':
        'badge-sm border-none font-medium bg-info/20 text-info',
    };
    return (
      classes[result] ||
      'badge-sm border-none font-medium bg-neutral/20 text-neutral'
    );
  };

  const getResultIcon = (result) => {
    const icons = {
      Pass: CheckCircle,
      Fail: XCircle,
      Pending: Clock,
      'Retest Required': AlertTriangle,
    };
    return icons[result] || Shield;
  };

  const calculateOverallScore = () => {
    const { taste_score, appearance_score, texture_score } =
      inspectionForm.value;
    if (taste_score && appearance_score && texture_score) {
      const scores = [
        parseFloat(taste_score),
        parseFloat(appearance_score),
        parseFloat(texture_score),
      ];
      const average =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
      inspectionForm.value.overall_quality_score =
        Math.round(average * 10) / 10;
    }
  };

  const getScoreColor = (score) => {
    if (!score) return 'text-gray-400';
    if (score >= 8) return 'text-success font-bold';
    if (score >= 6) return 'text-warning font-semibold';
    return 'text-error font-bold';
  };

  const getQualityLevel = (score) => {
    if (!score) return 'Not Rated';
    if (score >= 8) return 'Excellent';
    if (score >= 7) return 'Good';
    if (score >= 6) return 'Fair';
    if (score >= 5) return 'Poor';
    return 'Very Poor';
  };

  const resetForm = () => {
    inspectionForm.value = {
      sample_production_id: '',
      inspection_type: 'Sample Test',
      inspection_date: new Date().toISOString().split('T')[0],
      inspection_time: '',
      taste_score: '',
      appearance_score: '',
      texture_score: '',
      overall_quality_score: '',
      findings: '',
      corrective_actions: '',
      recommendations: '',
      requires_retest: false,
      retest_date: '',
    };
  };

  // Methods
  const fetchData = async () => {
    try {
      await Promise.all([
        productionStore.fetchQualityInspections(),
        productionStore.fetchSampleProductions(),
        productionStore.fetchQualityInspectionStats(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
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

  const createQualityInspection = async () => {
    try {
      const formData = { ...inspectionForm.value };

      // Calculate overall score if individual scores are provided
      calculateOverallScore();

      await productionStore.createQualityInspection(formData);
      closeCreateModal();
      showToast('success', 'Quality inspection completed successfully');
    } catch (error) {
      showToast(
        'error',
        error.message || 'Failed to create quality inspection'
      );
    }
  };

  const approveForProduction = async (inspectionId) => {
    if (
      !confirm(
        'Are you sure you want to approve this inspection result? This will make the menu item available for production.'
      )
    ) {
      return;
    }

    try {
      await productionStore.approveForProduction(inspectionId);
      showToast('success', 'Menu item approved for production');
    } catch (error) {
      showToast('error', error.message || 'Failed to approve for production');
    }
  };

  const failInspection = async (
    inspectionId,
    findings,
    correctiveActions,
    requiresRetest,
    retestDate
  ) => {
    if (!confirm('Are you sure you want to mark this inspection as failed?')) {
      return;
    }

    try {
      await productionStore.failInspection(
        inspectionId,
        findings,
        correctiveActions,
        requiresRetest,
        retestDate
      );
      showToast('warning', 'Inspection marked as failed');
    } catch (error) {
      showToast('error', error.message || 'Failed to update inspection');
    }
  };

  const showToast = (type, message) => {
    // Simple toast implementation
    console.log(`${type}: ${message}`);
  };

  // Lifecycle
  onMounted(() => {
    fetchData();
  });

  // Watch for data changes
  watch([searchQuery, statusFilter, resultFilter, dateFilter], () => {
    currentPage.value = 1;
  });

  // Watch for score changes to calculate overall
  watch(
    () => ({
      taste_score: inspectionForm.value.taste_score,
      appearance_score: inspectionForm.value.appearance_score,
      texture_score: inspectionForm.value.texture_score,
    }),
    (newScores) => {
      if (
        newScores.taste_score ||
        newScores.appearance_score ||
        newScores.texture_score
      ) {
        calculateOverallScore();
      }
    },
    { deep: true }
  );
</script>

<template>
  <div class="container mx-auto p-2 sm:p-4 lg:p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6 lg:mb-8">
      <h1
        class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primaryColor mb-2 text-shadow-xs"
      >
        Quality Inspection & Testing
      </h1>
      <p class="text-sm sm:text-base text-black/50 px-2">
        Perform quality inspections on sample productions and approve menu items
        for production.
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
          <Shield
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-primaryColor"
          />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Total Inspections
        </div>
        <div
          class="stat-value text-primaryColor text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ qualityInspectionStats.total_inspections || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Quality tests performed
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
        <div class="stat-title text-black/50 text-xs sm:text-sm">Passed</div>
        <div
          class="stat-value text-success text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ qualityInspectionStats.passed_inspections || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Approved for production
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <XCircle class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-error" />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">Failed</div>
        <div
          class="stat-value text-error text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ qualityInspectionStats.failed_inspections || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Require improvements
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Activity class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-info" />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Pass Rate
        </div>
        <div
          class="stat-value text-info text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ qualityInspectionStats.pass_rate || 0 }}%
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Quality success rate
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div
      class="flex flex-wrap gap-2 mb-4 sm:mb-6 justify-center sm:justify-start"
    >
      <button
        @click="openCreateModal"
        class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
        :disabled="loading"
      >
        <Plus class="w-4 h-4 mr-1" />
        New Inspection
      </button>
      <button
        @click="fetchData"
        class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
        :disabled="loading"
      >
        <RefreshCcw class="w-4 h-4 mr-1" />
        Refresh
      </button>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed mb-4 sm:mb-6 justify-center sm:justify-start">
      <button
        @click="activeTab = 'inspections'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'inspections' }"
      >
        <Shield class="w-4 h-4 mr-1" />
        Inspections
      </button>
      <button
        @click="activeTab = 'analytics'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'analytics' }"
      >
        <BarChart3 class="w-4 h-4 mr-1" />
        Analytics
      </button>
    </div>

    <!-- Tab Content -->
    <div
      class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10"
    >
      <div class="card-body p-3 sm:p-4 lg:p-6">
        <!-- Inspections Tab -->
        <div v-if="activeTab === 'inspections'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Quality Inspections
              </h2>
              <p class="text-sm text-gray-600">
                Review and manage quality inspection results for sample
                productions.
              </p>
            </div>
            <div class="flex gap-2">
              <button
                @click="fetchData"
                class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
                :disabled="loading"
              >
                <RefreshCcw class="w-4 h-4 mr-1" />
                Refresh
              </button>
            </div>
          </div>

          <!-- Search and Filters -->
          <div class="flex flex-col sm:flex-row gap-4 mb-6">
            <div class="flex-1">
              <div class="relative">
                <Search
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search inspections..."
                  class="input input-bordered w-full pl-10"
                />
              </div>
            </div>
            <div class="flex gap-2">
              <select v-model="resultFilter" class="select select-bordered">
                <option value="">All Results</option>
                <option value="Pass">Passed</option>
                <option value="Fail">Failed</option>
                <option value="Pending">Pending</option>
                <option value="Retest Required">Retest Required</option>
              </select>
              <input
                v-model="dateFilter"
                type="date"
                class="input input-bordered"
                placeholder="Filter by date"
              />
            </div>
          </div>

          <!-- Inspections Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="inspection in paginatedInspections"
              :key="inspection.id"
              class="card bg-white border border-gray-200 hover:shadow-xl duration-300 cursor-pointer"
              @click="openDetailsModal(inspection)"
            >
              <div class="card-body p-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <h3
                      class="card-title text-lg font-bold text-primaryColor mb-2"
                    >
                      {{ inspection.item_name }}
                    </h3>
                    <p class="text-sm text-gray-600 mb-2">
                      {{ inspection.sample_batch_number }}
                    </p>
                    <div class="flex items-center gap-2 mb-3">
                      <component
                        :is="getResultIcon(inspection.result)"
                        class="w-4 h-4"
                        :class="
                          getResultBadgeClass(inspection.result).includes(
                            'text-success'
                          )
                            ? 'text-success'
                            : getResultBadgeClass(inspection.result).includes(
                                  'text-error'
                                )
                              ? 'text-error'
                              : getResultBadgeClass(inspection.result).includes(
                                    'text-warning'
                                  )
                                ? 'text-warning'
                                : getResultBadgeClass(
                                      inspection.result
                                    ).includes('text-info')
                                  ? 'text-info'
                                  : 'text-gray-500'
                        "
                      />
                      <span
                        class="badge"
                        :class="getResultBadgeClass(inspection.result)"
                      >
                        {{ inspection.result }}
                      </span>
                      <span class="badge badge-sm bg-gray-100 text-gray-600">
                        {{ inspection.inspection_type }}
                      </span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium text-primaryColor">
                      {{ formatDate(inspection.inspection_date) }}
                    </div>
                    <div
                      v-if="inspection.inspection_time"
                      class="text-xs text-gray-500"
                    >
                      {{ formatTime(inspection.inspection_time) }}
                    </div>
                    <div
                      v-if="inspection.overall_quality_score"
                      class="text-xs text-gray-500 mt-1"
                    >
                      Score: {{ inspection.overall_quality_score }}/10
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4 text-sm text-gray-600">
                    <div class="flex items-center gap-1">
                      <User class="w-4 h-4" />
                      <span class="truncate max-w-20">{{
                        inspection.inspector_name
                      }}</span>
                    </div>
                  </div>
                  <div class="flex gap-1">
                    <button
                      @click.stop="approveForProduction(inspection.id)"
                      v-if="
                        inspection.result === 'Pass' &&
                        !inspection.approved_for_production
                      "
                      class="btn btn-ghost btn-xs text-success hover:bg-success/10"
                      title="Approve for Production"
                    >
                      <CheckCircle class="w-4 h-4" />
                    </button>
                    <button
                      @click.stop="openDetailsModal(inspection)"
                      class="btn btn-ghost btn-xs text-primaryColor hover:bg-primaryColor/10"
                      title="View Details"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <!-- Quality Scores -->
                <div
                  v-if="
                    inspection.taste_score ||
                    inspection.appearance_score ||
                    inspection.texture_score
                  "
                  class="mt-4 pt-4 border-t border-gray-100"
                >
                  <div class="grid grid-cols-3 gap-2 text-xs">
                    <div class="text-center">
                      <div class="font-medium text-gray-600">Taste</div>
                      <div :class="getScoreColor(inspection.taste_score)">
                        {{ inspection.taste_score || 'N/A' }}/10
                      </div>
                    </div>
                    <div class="text-center">
                      <div class="font-medium text-gray-600">Appearance</div>
                      <div :class="getScoreColor(inspection.appearance_score)">
                        {{ inspection.appearance_score || 'N/A' }}/10
                      </div>
                    </div>
                    <div class="text-center">
                      <div class="font-medium text-gray-600">Texture</div>
                      <div :class="getScoreColor(inspection.texture_score)">
                        {{ inspection.texture_score || 'N/A' }}/10
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-if="paginatedInspections.length === 0"
              class="col-span-full flex flex-col items-center justify-center py-12"
            >
              <Shield class="w-16 h-16 text-gray-300 mb-4" />
              <h3 class="text-lg font-medium text-gray-600 mb-2">
                No quality inspections found
              </h3>
              <p class="text-sm text-gray-500 text-center mb-4">
                {{
                  searchQuery || resultFilter || dateFilter
                    ? 'Try adjusting your filters'
                    : 'Complete sample productions to create quality inspections'
                }}
              </p>
              <button
                v-if="!searchQuery && !resultFilter && !dateFilter"
                @click="openCreateModal"
                class="btn btn-primary"
              >
                <Plus class="w-4 h-4 mr-2" />
                Create Inspection
              </button>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex justify-center mt-6">
            <div class="btn-group">
              <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="btn btn-outline btn-sm"
              >
                Previous
              </button>
              <button class="btn btn-outline btn-sm btn-active">
                {{ currentPage }} of {{ totalPages }}
              </button>
              <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="btn btn-outline btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <!-- Analytics Tab -->
        <div v-if="activeTab === 'analytics'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Quality Analytics
              </h2>
              <p class="text-sm text-gray-600">
                Analyze quality inspection trends and performance metrics.
              </p>
            </div>
          </div>

          <!-- Quality Metrics Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
              class="card bg-gradient-to-br from-base-100 to-base-50 border border-gray-200"
            >
              <div class="card-body p-6">
                <div class="flex items-center gap-3 mb-4">
                  <div
                    class="w-12 h-12 rounded-full flex items-center justify-center bg-success/10"
                  >
                    <TrendingUp class="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <h3 class="card-title text-lg font-bold text-primaryColor">
                      Pass Rate
                    </h3>
                    <p class="text-xs text-gray-500">Quality success rate</p>
                  </div>
                </div>
                <div class="text-3xl font-bold text-success mb-2">
                  {{ qualityInspectionStats.pass_rate || 0 }}%
                </div>
                <div class="text-sm text-gray-600">
                  {{ qualityInspectionStats.passed_inspections || 0 }} of
                  {{ qualityInspectionStats.total_inspections || 0 }} passed
                </div>
              </div>
            </div>

            <div
              class="card bg-gradient-to-br from-base-100 to-base-50 border border-gray-200"
            >
              <div class="card-body p-6">
                <div class="flex items-center gap-3 mb-4">
                  <div
                    class="w-12 h-12 rounded-full flex items-center justify-center bg-warning/10"
                  >
                    <Target class="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <h3 class="card-title text-lg font-bold text-primaryColor">
                      Avg. Taste Score
                    </h3>
                    <p class="text-xs text-gray-500">Taste quality rating</p>
                  </div>
                </div>
                <div class="text-3xl font-bold text-warning mb-2">
                  {{
                    (qualityInspectionStats.average_taste_score || 0).toFixed(
                      1
                    )
                  }}/10
                </div>
                <div class="text-sm text-gray-600">
                  {{
                    getQualityLevel(qualityInspectionStats.average_taste_score)
                  }}
                </div>
              </div>
            </div>

            <div
              class="card bg-gradient-to-br from-base-100 to-base-50 border border-gray-200"
            >
              <div class="card-body p-6">
                <div class="flex items-center gap-3 mb-4">
                  <div
                    class="w-12 h-12 rounded-full flex items-center justify-center bg-info/10"
                  >
                    <Star class="w-6 h-6 text-info" />
                  </div>
                  <div>
                    <h3 class="card-title text-lg font-bold text-primaryColor">
                      Avg. Appearance
                    </h3>
                    <p class="text-xs text-gray-500">Visual quality rating</p>
                  </div>
                </div>
                <div class="text-3xl font-bold text-info mb-2">
                  {{
                    (
                      qualityInspectionStats.average_appearance_score || 0
                    ).toFixed(1)
                  }}/10
                </div>
                <div class="text-sm text-gray-600">
                  {{
                    getQualityLevel(
                      qualityInspectionStats.average_appearance_score
                    )
                  }}
                </div>
              </div>
            </div>

            <div
              class="card bg-gradient-to-br from-base-100 to-base-50 border border-gray-200"
            >
              <div class="card-body p-6">
                <div class="flex items-center gap-3 mb-4">
                  <div
                    class="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10"
                  >
                    <Activity class="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 class="card-title text-lg font-bold text-primaryColor">
                      Avg. Texture
                    </h3>
                    <p class="text-xs text-gray-500">Texture quality rating</p>
                  </div>
                </div>
                <div class="text-3xl font-bold text-primary mb-2">
                  {{
                    (qualityInspectionStats.average_texture_score || 0).toFixed(
                      1
                    )
                  }}/10
                </div>
                <div class="text-sm text-gray-600">
                  {{
                    getQualityLevel(
                      qualityInspectionStats.average_texture_score
                    )
                  }}
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Inspections Summary -->
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <h3 class="card-title text-lg font-bold text-primaryColor mb-4">
                Recent Quality Inspections
              </h3>
              <div class="overflow-x-auto">
                <table class="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Inspector</th>
                      <th>Result</th>
                      <th>Overall Score</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="inspection in qualityInspections.slice(0, 10)"
                      :key="inspection.id"
                    >
                      <td class="font-medium">{{ inspection.item_name }}</td>
                      <td>{{ inspection.inspector_name }}</td>
                      <td>
                        <span
                          class="badge"
                          :class="getResultBadgeClass(inspection.result)"
                        >
                          {{ inspection.result }}
                        </span>
                      </td>
                      <td>
                        <span
                          v-if="inspection.overall_quality_score"
                          :class="
                            getScoreColor(inspection.overall_quality_score)
                          "
                        >
                          {{ inspection.overall_quality_score }}/10
                        </span>
                        <span v-else class="text-gray-400">N/A</span>
                      </td>
                      <td>{{ formatDate(inspection.inspection_date) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Quality Inspection Modal -->
    <div v-if="showCreateModal" class="modal modal-open">
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg text-primaryColor mb-4">
          Create Quality Inspection
        </h3>

        <form @submit.prevent="createQualityInspection" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Sample Production *</span>
              </label>
              <select
                v-model="inspectionForm.sample_production_id"
                class="select select-bordered"
                required
              >
                <option value="">Select Sample Production</option>
                <option
                  v-for="sample in availableSampleProductions"
                  :key="sample.id"
                  :value="sample.id"
                >
                  {{ sample.item_name }} - {{ sample.sample_batch_number }}
                </option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Inspection Type *</span>
              </label>
              <select
                v-model="inspectionForm.inspection_type"
                class="select select-bordered"
                required
              >
                <option value="Sample Test">Sample Test</option>
                <option value="Full Batch">Full Batch</option>
                <option value="Reinspection">Reinspection</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Inspection Date *</span>
              </label>
              <input
                v-model="inspectionForm.inspection_date"
                type="date"
                class="input input-bordered"
                :max="new Date().toISOString().split('T')[0]"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Inspection Time</span>
              </label>
              <input
                v-model="inspectionForm.inspection_time"
                type="time"
                class="input input-bordered"
              />
            </div>
          </div>

          <!-- Quality Scoring Section -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="font-semibold text-primaryColor mb-4">
              Quality Scoring (1-10 Scale)
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Taste</span>
                </label>
                <input
                  v-model.number="inspectionForm.taste_score"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  class="input input-bordered"
                  placeholder="8.5"
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Appearance</span>
                </label>
                <input
                  v-model.number="inspectionForm.appearance_score"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  class="input input-bordered"
                  placeholder="9.0"
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Texture</span>
                </label>
                <input
                  v-model.number="inspectionForm.texture_score"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  class="input input-bordered"
                  placeholder="7.5"
                />
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Overall Score</span>
                </label>
                <input
                  v-model.number="inspectionForm.overall_quality_score"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  class="input input-bordered"
                  :placeholder="
                    inspectionForm.overall_quality_score || 'Auto-calculated'
                  "
                  readonly
                />
              </div>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Findings *</span>
            </label>
            <textarea
              v-model="inspectionForm.findings"
              class="textarea textarea-bordered"
              rows="3"
              placeholder="Describe your observations and findings..."
              required
            ></textarea>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Recommendations</span>
            </label>
            <textarea
              v-model="inspectionForm.recommendations"
              class="textarea textarea-bordered"
              rows="2"
              placeholder="Any recommendations for improvement..."
            ></textarea>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Corrective Actions</span>
            </label>
            <textarea
              v-model="inspectionForm.corrective_actions"
              class="textarea textarea-bordered"
              rows="2"
              placeholder="Actions needed to address any issues..."
            ></textarea>
          </div>

          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text font-medium">Requires Retest</span>
              <input
                v-model="inspectionForm.requires_retest"
                type="checkbox"
                class="checkbox checkbox-primary"
              />
            </label>
          </div>

          <div v-if="inspectionForm.requires_retest" class="form-control">
            <label class="label">
              <span class="label-text font-medium">Retest Date</span>
            </label>
            <input
              v-model="inspectionForm.retest_date"
              type="date"
              class="input input-bordered"
              :min="new Date().toISOString().split('T')[0]"
            />
          </div>

          <div class="modal-action">
            <button
              type="button"
              @click="closeCreateModal"
              class="btn btn-ghost"
            >
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <Shield class="w-4 h-4 mr-2" v-if="!loading" />
              <RefreshCcw class="w-4 h-4 mr-2 animate-spin" v-else />
              Complete Inspection
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Inspection Details Modal -->
    <div v-if="showDetailsModal && selectedInspection" class="modal modal-open">
      <div class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg text-primaryColor mb-4">
          Quality Inspection Details
        </h3>

        <div class="space-y-6">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 class="font-semibold text-primaryColor mb-3">
                Inspection Information
              </h4>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-600">Inspection Number:</span>
                  <span class="font-medium">{{
                    selectedInspection.inspection_number
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Menu Item:</span>
                  <span class="font-medium">{{
                    selectedInspection.item_name
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Sample Batch:</span>
                  <span class="font-medium">{{
                    selectedInspection.sample_batch_number
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Inspector:</span>
                  <span class="font-medium">{{
                    selectedInspection.inspector_name
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Type:</span>
                  <span class="font-medium">{{
                    selectedInspection.inspection_type
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Result:</span>
                  <span
                    class="badge"
                    :class="getResultBadgeClass(selectedInspection.result)"
                  >
                    {{ selectedInspection.result }}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 class="font-semibold text-primaryColor mb-3">
                Schedule & Status
              </h4>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-600">Date:</span>
                  <span class="font-medium">{{
                    formatDate(selectedInspection.inspection_date)
                  }}</span>
                </div>
                <div
                  v-if="selectedInspection.inspection_time"
                  class="flex justify-between"
                >
                  <span class="text-gray-600">Time:</span>
                  <span class="font-medium">{{
                    formatTime(selectedInspection.inspection_time)
                  }}</span>
                </div>
                <div
                  v-if="selectedInspection.approved_at"
                  class="flex justify-between"
                >
                  <span class="text-gray-600">Approved:</span>
                  <span class="font-medium">{{
                    formatDate(selectedInspection.approved_at)
                  }}</span>
                </div>
                <div
                  v-if="selectedInspection.approved_by_name"
                  class="flex justify-between"
                >
                  <span class="text-gray-600">Approved By:</span>
                  <span class="font-medium">{{
                    selectedInspection.approved_by_name
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Quality Scores -->
          <div
            v-if="
              selectedInspection.taste_score ||
              selectedInspection.appearance_score ||
              selectedInspection.texture_score
            "
            class="bg-blue-50 p-4 rounded-lg"
          >
            <h4 class="font-semibold text-primaryColor mb-3">Quality Scores</h4>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div class="text-center">
                <div class="text-3xl font-bold text-primaryColor mb-2">
                  {{ selectedInspection.taste_score || 'N/A' }}/10
                </div>
                <div class="text-sm text-gray-600">Taste</div>
                <div class="text-xs text-gray-500">
                  {{ getQualityLevel(selectedInspection.taste_score) }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold text-info mb-2">
                  {{ selectedInspection.appearance_score || 'N/A' }}/10
                </div>
                <div class="text-sm text-gray-600">Appearance</div>
                <div class="text-xs text-gray-500">
                  {{ getQualityLevel(selectedInspection.appearance_score) }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold text-warning mb-2">
                  {{ selectedInspection.texture_score || 'N/A' }}/10
                </div>
                <div class="text-sm text-gray-600">Texture</div>
                <div class="text-xs text-gray-500">
                  {{ getQualityLevel(selectedInspection.texture_score) }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-3xl font-bold text-success mb-2">
                  {{ selectedInspection.overall_quality_score || 'N/A' }}/10
                </div>
                <div class="text-sm text-gray-600">Overall</div>
                <div class="text-xs text-gray-500">
                  {{
                    getQualityLevel(selectedInspection.overall_quality_score)
                  }}
                </div>
              </div>
            </div>
          </div>

          <!-- Findings and Actions -->
          <div
            v-if="selectedInspection.findings"
            class="bg-gray-50 p-4 rounded-lg"
          >
            <h4 class="font-semibold text-primaryColor mb-2">Findings</h4>
            <p class="text-gray-700">{{ selectedInspection.findings }}</p>
          </div>

          <div
            v-if="selectedInspection.corrective_actions"
            class="bg-yellow-50 p-4 rounded-lg"
          >
            <h4 class="font-semibold text-primaryColor mb-2">
              Corrective Actions
            </h4>
            <p class="text-gray-700">
              {{ selectedInspection.corrective_actions }}
            </p>
          </div>

          <div
            v-if="selectedInspection.recommendations"
            class="bg-green-50 p-4 rounded-lg"
          >
            <h4 class="font-semibold text-primaryColor mb-2">
              Recommendations
            </h4>
            <p class="text-gray-700">
              {{ selectedInspection.recommendations }}
            </p>
          </div>

          <div
            v-if="selectedInspection.requires_retest"
            class="bg-red-50 p-4 rounded-lg"
          >
            <h4 class="font-semibold text-primaryColor mb-2">
              Retest Required
            </h4>
            <p class="text-gray-700">
              This item requires retesting
              <span v-if="selectedInspection.retest_date">
                by {{ formatDate(selectedInspection.retest_date) }}
              </span>
            </p>
          </div>
        </div>

        <div class="modal-action">
          <button @click="closeDetailsModal" class="btn btn-ghost">
            Close
          </button>
          <button
            v-if="
              selectedInspection.result === 'Pass' &&
              !selectedInspection.approved_for_production
            "
            @click="approveForProduction(selectedInspection.id)"
            class="btn btn-success"
          >
            <CheckCircle class="w-4 h-4 mr-2" />
            Approve for Production
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .text-shadow-xs {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
</style>
