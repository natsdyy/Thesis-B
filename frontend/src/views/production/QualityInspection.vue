<script setup>
  import { ref, computed, onMounted, watch, nextTick } from 'vue';
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
    EllipsisVertical,
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

  // Confirmation modal state
  const confirmModal = ref({
    show: false,
    type: '',
    title: '',
    message: '',
    item: null,
    onConfirm: null,
  });
  const itemsPerPage = ref(6);
  const expandedItems = ref(new Set());

  // Form data
  const inspectionForm = ref({
    menu_item_id: '',
    inspection_type: 'Direct Inspection',
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

  // Inspection types and requirements
  const inspectionTypes = ref({});
  const inspectionRequirements = ref({});

  // Track inspection source/origin
  const inspectionSource = ref(null); // 'menu_creation', 'direct', etc.

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const qualityInspections = computed(() => productionStore.qualityInspections);
  const menuItems = computed(() => productionStore.menuItems || []);
  const qualityInspectionStats = computed(
    () => productionStore.qualityInspectionStats
  );

  // Available menu items for direct inspection
  const availableMenuItems = computed(() => {
    return menuItems.value.filter((item) => !item.deleted_at);
  });

  // Current inspection requirements based on selected type
  const currentInspectionRequirements = computed(() => {
    return (
      inspectionRequirements.value[inspectionForm.value.inspection_type] || {}
    );
  });

  // Get human-readable source description
  const inspectionSourceDescription = computed(() => {
    switch (inspectionSource.value) {
      case 'menu_creation':
        return 'Direct Menu Item Inspection';
      case 'direct_inspection':
        return 'Direct Menu Item Inspection';
      case 'manual':
        return 'Manual Inspection Creation';
      default:
        return 'New Quality Inspection';
    }
  });

  // Computed properties
  const filteredInspections = computed(() => {
    let filtered = qualityInspections.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (inspection) =>
          inspection.inspection_number.toLowerCase().includes(query) ||
          inspection.item_name?.toLowerCase().includes(query) ||
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

  // Quality thresholds for automatic pass/fail determination
  const QUALITY_THRESHOLDS = {
    PASS_THRESHOLD: 6, // Overall score >= 6 is pass
    MIN_INDIVIDUAL_SCORE: 4, // No individual score should be below 4
    EXCELLENT_THRESHOLD: 8, // Score >= 8 is excellent
  };

  // Determine if inspection should pass or fail based on scores
  const determineInspectionResult = (inspection) => {
    const {
      taste_score,
      appearance_score,
      texture_score,
      overall_quality_score,
    } = inspection;

    // If no scores provided, return pending
    if (
      !taste_score &&
      !appearance_score &&
      !texture_score &&
      !overall_quality_score
    ) {
      return 'Pending';
    }

    // Use overall score if available, otherwise calculate from individual scores
    let finalScore = overall_quality_score;

    if (!finalScore && (taste_score || appearance_score || texture_score)) {
      const scores = [taste_score, appearance_score, texture_score].filter(
        (score) => score !== null && score !== undefined
      );
      if (scores.length > 0) {
        finalScore = Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length
        );
      }
    }

    // Check if any individual score is below minimum threshold
    const individualScores = [
      taste_score,
      appearance_score,
      texture_score,
    ].filter((score) => score !== null && score !== undefined);
    const hasLowScore = individualScores.some(
      (score) => score < QUALITY_THRESHOLDS.MIN_INDIVIDUAL_SCORE
    );

    // Determine result
    if (hasLowScore) {
      return 'Fail';
    } else if (finalScore >= QUALITY_THRESHOLDS.PASS_THRESHOLD) {
      return 'Pass';
    } else if (finalScore < QUALITY_THRESHOLDS.PASS_THRESHOLD) {
      return 'Fail';
    }

    return 'Pending';
  };

  // Get suggested result for display
  const getSuggestedResult = (inspection) => {
    return determineInspectionResult(inspection);
  };

  // Get result badge class with suggestion
  const getResultBadgeClassWithSuggestion = (inspection) => {
    const currentResult = inspection.result;
    const suggestedResult = getSuggestedResult(inspection);

    if (currentResult === 'Pending' && suggestedResult !== 'Pending') {
      // Show suggestion for pending inspections
      return {
        class: getResultBadgeClass(suggestedResult),
        suggestion: suggestedResult,
        hasSuggestion: true,
      };
    }

    return {
      class: getResultBadgeClass(currentResult),
      suggestion: null,
      hasSuggestion: false,
    };
  };

  const resetForm = () => {
    inspectionForm.value = {
      menu_item_id: '',
      inspection_type: 'Direct Inspection',
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
        productionStore.fetchMenuItems(),
        productionStore.fetchQualityInspectionStats(),
        fetchInspectionTypes(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchInspectionTypes = async () => {
    try {
      const response = await fetch('/api/menu/quality-inspection/types');
      const data = await response.json();
      if (data.success) {
        inspectionTypes.value = data.data.types;
        inspectionRequirements.value = data.data.requirements;
      }
    } catch (error) {
      console.error('Error fetching inspection types:', error);
    }
  };

  const openCreateModal = async () => {
    resetForm();
    inspectionSource.value = null; // Reset source

    // Handle query parameters for direct inspections
    const urlParams = new URLSearchParams(window.location.search);
    const menuItemId = urlParams.get('menu_item_id');
    const inspectionType = urlParams.get('inspection_type');
    const source = urlParams.get('source');

    if (source) {
      inspectionSource.value = source;
    }

    if (menuItemId) {
      inspectionForm.value.menu_item_id = menuItemId;
    }
    if (inspectionType) {
      inspectionForm.value.inspection_type = inspectionType;
    }

    // Auto-determine source if not explicitly set
    if (!inspectionSource.value) {
      if (menuItemId) {
        inspectionSource.value = 'direct_inspection';
      } else {
        inspectionSource.value = 'manual';
      }
    }

    showCreateModal.value = true;
    // Wait for dialog to mount before calling showModal to avoid double-click
    await nextTick();
    document.getElementById('create_inspection_modal')?.showModal();
  };

  const closeCreateModal = () => {
    showCreateModal.value = false;
    document.getElementById('create_inspection_modal')?.close();
    inspectionSource.value = null; // Reset source
    resetForm();

    // Clean up URL parameters to prevent auto-opening on refresh
    const url = new URL(window.location);
    url.searchParams.delete('menu_item_id');
    url.searchParams.delete('inspection_type');
    url.searchParams.delete('source');
    window.history.replaceState({}, '', url);
  };

  const openDetailsModal = async (inspection) => {
    selectedInspection.value = inspection;
    showDetailsModal.value = true;
    // Wait for dialog to mount before calling showModal
    await nextTick();
    document.getElementById('inspection_details_modal')?.showModal();
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    document.getElementById('inspection_details_modal')?.close();
    selectedInspection.value = null;
  };

  // Update status modal
  const showUpdateStatusModal = ref(false);
  const statusUpdateForm = ref({
    result: 'Pending',
    notes: '',
  });

  const openUpdateStatusModal = async (inspection) => {
    selectedInspection.value = inspection;
    statusUpdateForm.value = {
      result: inspection.result || 'Pending',
      notes: inspection.notes || '',
    };
    showUpdateStatusModal.value = true;
    await nextTick();
    document.getElementById('update_status_modal')?.showModal();
  };

  const closeUpdateStatusModal = () => {
    showUpdateStatusModal.value = false;
    document.getElementById('update_status_modal')?.close();
    selectedInspection.value = null;
    statusUpdateForm.value = {
      result: 'Pending',
      notes: '',
    };
  };

  // Confirmation modal methods
  const openConfirmModal = (type, item) => {
    const configs = {
      approve: {
        title: 'Approve for Production',
        message: `Are you sure you want to approve this inspection result? This will make the menu item available for production.`,
        onConfirm: () => performApproval(item.id),
      },
      pass: {
        title: item.title || 'Pass Quality Inspection',
        message:
          item.message ||
          'Are you sure you want to mark this inspection as passed? This will approve the quality standards.',
        onConfirm: item.onConfirm || (() => performPassInspection(item.id)),
      },
      fail: {
        title: item.title || 'Fail Quality Inspection',
        message:
          item.message ||
          'Are you sure you want to mark this inspection as failed? This will require corrective actions.',
        onConfirm:
          item.onConfirm || (() => performFailInspectionSimple(item.id)),
      },
    };

    const config = configs[type];
    confirmModal.value = {
      show: true,
      type,
      title: config.title,
      message: config.message,
      item,
      onConfirm: config.onConfirm,
    };
    document.getElementById('confirmation_modal')?.showModal();
  };

  const closeConfirmModal = () => {
    document.getElementById('confirmation_modal')?.close();
    confirmModal.value = {
      show: false,
      type: '',
      title: '',
      message: '',
      item: null,
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

  const createQualityInspection = async () => {
    try {
      const formData = { ...inspectionForm.value };

      // Calculate overall score if individual scores are provided
      calculateOverallScore();

      // Clean up form data - convert empty strings to null for numeric fields
      const cleanedFormData = {
        ...formData,
        // Convert empty strings to null for ID fields
        sample_production_id: null, // No longer used
        menu_item_id: formData.menu_item_id || null,
        // Convert empty strings to null for numeric fields
        taste_score: formData.taste_score || null,
        appearance_score: formData.appearance_score || null,
        texture_score: formData.texture_score || null,
        overall_quality_score: formData.overall_quality_score || null,
        // Convert empty strings to null for boolean fields
        requires_retest: formData.requires_retest || false,
      };

      await productionStore.createQualityInspection(cleanedFormData);
      closeCreateModal();
      showToast('success', 'Quality inspection completed successfully');
    } catch (error) {
      showToast(
        'error',
        error.message || 'Failed to create quality inspection'
      );
    }
  };

  const approveForProduction = (inspectionId) => {
    openConfirmModal('approve', { id: inspectionId });
  };

  const updateInspectionStatus = async () => {
    try {
      if (!selectedInspection.value) return;

      const updateData = {
        result: statusUpdateForm.value.result,
        notes: statusUpdateForm.value.notes,
      };

      await productionStore.updateQualityInspection(
        selectedInspection.value.id,
        updateData
      );
      showToast('success', 'Inspection status updated successfully');
      closeUpdateStatusModal();
      await fetchData(); // Refresh the data
    } catch (error) {
      showToast('error', error.message || 'Failed to update inspection status');
    }
  };

  // Pass inspection with confirmation
  const passInspection = (inspectionId) => {
    openConfirmModal('pass', {
      title: 'Pass Quality Inspection',
      message:
        'Are you sure you want to mark this inspection as passed? This will approve the quality standards.',
      onConfirm: () => performPassInspection(inspectionId),
    });
  };

  // Simple fail inspection for dropdown buttons
  const failInspectionSimple = (inspectionId) => {
    openConfirmModal('fail', {
      title: 'Fail Quality Inspection',
      message:
        'Are you sure you want to mark this inspection as failed? This will require corrective actions.',
      onConfirm: () => performFailInspectionSimple(inspectionId),
    });
  };

  // Perform pass inspection
  const performPassInspection = async (inspectionId) => {
    try {
      await productionStore.updateQualityInspection(inspectionId, {
        result: 'Pass',
        notes: 'Inspection passed - quality standards met',
      });
      showToast('success', 'Inspection marked as passed');
      await fetchData(); // Refresh the data
    } catch (error) {
      showToast('error', error.message || 'Failed to pass inspection');
    }
  };

  // Perform fail inspection (simple version for dropdown buttons)
  const performFailInspectionSimple = async (inspectionId) => {
    try {
      await productionStore.updateQualityInspection(inspectionId, {
        result: 'Fail',
        notes: 'Inspection failed - corrective actions required',
      });
      showToast('warning', 'Inspection marked as failed');
      await fetchData(); // Refresh the data
    } catch (error) {
      showToast('error', error.message || 'Failed to fail inspection');
    }
  };

  // Apply suggested result automatically
  const applySuggestedResult = async (inspection) => {
    const suggestedResult = getSuggestedResult(inspection);
    if (suggestedResult === 'Pending') return;

    try {
      const notes =
        suggestedResult === 'Pass'
          ? 'Auto-applied suggested result: Pass - quality standards met'
          : 'Auto-applied suggested result: Fail - quality standards not met';

      await productionStore.updateQualityInspection(inspection.id, {
        result: suggestedResult,
        notes: notes,
      });

      showToast(
        'success',
        `Inspection automatically marked as ${suggestedResult}`
      );
      await fetchData(); // Refresh the data
    } catch (error) {
      showToast('error', error.message || 'Failed to apply suggested result');
    }
  };

  const performApproval = async (inspectionId) => {
    try {
      await productionStore.approveForProduction(inspectionId);
      showToast('success', 'Menu item approved for production');
    } catch (error) {
      showToast('error', error.message || 'Failed to approve for production');
    }
  };

  const failInspection = (
    inspectionId,
    findings,
    correctiveActions,
    requiresRetest,
    retestDate
  ) => {
    openConfirmModal('fail', {
      id: inspectionId,
      findings,
      correctiveActions,
      requiresRetest,
      retestDate,
    });
  };

  const performFailInspection = async (item) => {
    try {
      await productionStore.failInspection(
        item.id,
        item.findings,
        item.correctiveActions,
        item.requiresRetest,
        item.retestDate
      );
      showToast('warning', 'Inspection marked as failed');
    } catch (error) {
      showToast('error', error.message || 'Failed to update inspection');
    }
  };

  // Toast state
  const toast = ref({ show: false, type: '', message: '' });
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };

  // Lifecycle
  onMounted(async () => {
    await fetchData();

    // Check if we should auto-open the create modal (coming from Menu Creation)
    const urlParams = new URLSearchParams(window.location.search);
    const menuItemId = urlParams.get('menu_item_id');
    const inspectionType = urlParams.get('inspection_type');
    const source = urlParams.get('source');

    if (menuItemId && source === 'menu_creation') {
      // Small delay to ensure all data is loaded before auto-opening modal
      setTimeout(async () => {
        await openCreateModal();
      }, 100);
    }
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
  <div class=" mx-auto p-2 sm:p-4 lg:p-6">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6 lg:mb-8">
      <h1
        class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primaryColor mb-2 text-shadow-xs"
      >
        Quality Inspection & Testing
      </h1>
      <p class="text-sm sm:text-base text-black/50 px-2">
        Perform quality inspections on menu items and approve them for
        production.
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
        <div class="stat-title text-black/50 text-xs sm:text-sm">Failed</div>
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
          <Activity
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-secondaryColor"
          />
        </div>
        <div class="stat-title text-black/50 text-xs sm:text-sm">Pass Rate</div>
        <div
          class="stat-value text-secondaryColor text-lg sm:text-xl lg:text-2xl xl:text-3xl"
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
        class="btn btn-sm bg-primaryColor text-white font-thin hover:bg-primaryColor/80 hover:border-none hover:shadow-none"
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
                Review and manage quality inspection results for menu items.
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
                      {{ inspection.inspection_number }}
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
                        class="badge badge-sm"
                        :class="
                          getResultBadgeClassWithSuggestion(inspection).class
                        "
                      >
                        {{ inspection.result }}
                        <span
                          v-if="
                            getResultBadgeClassWithSuggestion(inspection)
                              .hasSuggestion
                          "
                          class="ml-1 text-xs opacity-75"
                        >
                          (suggested:
                          {{
                            getResultBadgeClassWithSuggestion(inspection)
                              .suggestion
                          }})
                        </span>
                      </span>
                      <span class="badge badge-sm bg-gray-100 text-gray-600">
                        {{ inspection.inspection_type }}
                      </span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div
                      v-if="inspection.overall_quality_score"
                      class="text-lg font-bold text-primaryColor"
                    >
                      {{ inspection.overall_quality_score }}/10
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ formatDate(inspection.inspection_date) }}
                    </div>
                    <div
                      v-if="inspection.inspection_time"
                      class="text-xs text-gray-500"
                    >
                      {{ formatTime(inspection.inspection_time) }}
                    </div>
                  </div>
                </div>

                <!-- Quality Scores Section -->
                <div
                  v-if="
                    inspection.taste_score ||
                    inspection.appearance_score ||
                    inspection.texture_score
                  "
                  class="mb-4 p-3 bg-gray-50 rounded-lg"
                >
                  <div class="grid grid-cols-3 gap-2 text-xs">
                    <div class="text-center">
                      <div class="font-medium text-gray-600">Taste</div>
                      <div
                        :class="getScoreColor(inspection.taste_score)"
                        class="font-semibold"
                      >
                        {{ inspection.taste_score || 'N/A' }}/10
                      </div>
                    </div>
                    <div class="text-center">
                      <div class="font-medium text-gray-600">Appearance</div>
                      <div
                        :class="getScoreColor(inspection.appearance_score)"
                        class="font-semibold"
                      >
                        {{ inspection.appearance_score || 'N/A' }}/10
                      </div>
                    </div>
                    <div class="text-center">
                      <div class="font-medium text-gray-600">Texture</div>
                      <div
                        :class="getScoreColor(inspection.texture_score)"
                        class="font-semibold"
                      >
                        {{ inspection.texture_score || 'N/A' }}/10
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4 text-sm text-gray-600">
                    <div class="flex items-center gap-1">
                      <User class="w-4 h-4" />
                      <span class="truncate max-w-20">{{
                        inspection.inspector_name || 'Unassigned'
                      }}</span>
                    </div>
                  </div>
                  <!-- Actions Dropdown -->
                  <div
                    class="dropdown dropdown-end"
                    @click.stop
                    @mousedown.stop
                    @mouseup.stop
                  >
                    <button
                      class="btn btn-ghost btn-xs"
                      tabindex="0"
                      @click.stop.prevent
                      @mousedown.stop
                      @mouseup.stop
                    >
                      <EllipsisVertical class="w-4 h-4" />
                    </button>
                    <ul
                      class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48 z-50"
                      tabindex="0"
                      @click.stop
                    >
                      <!-- View Details -->
                      <li>
                        <button
                          @click.stop.prevent="openDetailsModal(inspection)"
                          @mousedown.stop
                          class="text-sm"
                        >
                          <Eye class="w-3 h-3 mr-2" />
                          View Details
                        </button>
                      </li>

                      <!-- Auto-apply suggested result (for pending inspections with suggestions) -->
                      <li
                        v-if="
                          inspection.result === 'Pending' &&
                          getSuggestedResult(inspection) !== 'Pending'
                        "
                      >
                        <button
                          @click.stop.prevent="applySuggestedResult(inspection)"
                          @mousedown.stop
                          class="text-sm text-info"
                        >
                          <Target class="w-3 h-3 mr-2" />
                          Apply Suggested ({{ getSuggestedResult(inspection) }})
                        </button>
                      </li>

                      <!-- Pass Inspection (for pending inspections) -->
                      <li v-if="inspection.result === 'Pending'">
                        <button
                          @click.stop.prevent="passInspection(inspection.id)"
                          @mousedown.stop
                          class="text-sm text-success"
                        >
                          <CheckCircle class="w-3 h-3 mr-2" />
                          Pass Inspection
                        </button>
                      </li>

                      <!-- Fail Inspection (for pending inspections) -->
                      <li v-if="inspection.result === 'Pending'">
                        <button
                          @click.stop.prevent="
                            failInspectionSimple(inspection.id)
                          "
                          @mousedown.stop
                          class="text-sm text-error"
                        >
                          <XCircle class="w-3 h-3 mr-2" />
                          Fail Inspection
                        </button>
                      </li>

                      <!-- Update Status (for pending inspections) -->
                      <li v-if="inspection.result === 'Pending'">
                        <button
                          @click.stop.prevent="
                            openUpdateStatusModal(inspection)
                          "
                          @mousedown.stop
                          class="text-sm text-primary"
                        >
                          <Edit class="w-3 h-3 mr-2" />
                          Update Status
                        </button>
                      </li>

                      <!-- Approve (only for passed inspections that aren't approved yet) -->
                      <li
                        v-if="
                          inspection.result === 'Pass' &&
                          !inspection.approved_for_production
                        "
                      >
                        <button
                          @click.stop.prevent="
                            approveForProduction(inspection.id)
                          "
                          @mousedown.stop
                          class="text-sm text-success"
                        >
                          <CheckCircle class="w-3 h-3 mr-2" />
                          Approve for Production
                        </button>
                      </li>
                    </ul>
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
                    : 'Create quality inspections for menu items'
                }}
              </p>
              <button
                v-if="!searchQuery && !resultFilter && !dateFilter"
                @click="openCreateModal"
                class="btn btn-sm bg-primaryColor text-white font-thin hover:bg-primaryColor/80 hover:border-none hover:shadow-none"
              >
                <Plus class="w-4 h-4 mr-2" />
                Create Inspection
              </button>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex justify-center mt-8">
            <div class="btn-group">
              <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="btn btn-sm"
              >
                Previous
              </button>
              <button class="btn btn-sm">{{ currentPage }}</button>
              <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="btn btn-sm"
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
                Quality Trends & Analytics
              </h2>
              <p class="text-sm text-gray-600">
                Monitor quality performance and identify improvement
                opportunities.
              </p>
            </div>
            <button
              @click="fetchData"
              class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10"
              :disabled="loading"
            >
              <RefreshCcw class="w-4 h-4 mr-1" />
              Refresh
            </button>
          </div>

          <!-- Quality Metrics Grid -->
          <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6"
          >
            <!-- Inspection Type Distribution -->
            <div
              class="card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200"
            >
              <div class="card-body p-6">
                <div class="flex items-center gap-3 mb-4">
                  <div
                    class="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/10"
                  >
                    <BarChart3 class="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 class="card-title text-lg font-bold text-blue-800">
                      Inspection Types
                    </h3>
                    <p class="text-xs text-blue-600">Distribution by type</p>
                  </div>
                </div>
                <div class="text-sm text-blue-700">
                  <div class="flex justify-between mb-1">
                    <span>Direct Inspections:</span>
                    <span class="font-medium">{{
                      qualityInspections.filter(
                        (i) => i.inspection_type === 'Direct Inspection'
                      ).length
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Spot Checks:</span>
                    <span class="font-medium">{{
                      qualityInspections.filter(
                        (i) => i.inspection_type === 'Spot Check'
                      ).length
                    }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quality Score Trends -->
            <div
              class="card bg-gradient-to-br from-green-50 to-green-100 border border-green-200"
            >
              <div class="card-body p-6">
                <div class="flex items-center gap-3 mb-4">
                  <div
                    class="w-12 h-12 rounded-full flex items-center justify-center bg-green-500/10"
                  >
                    <TrendingUp class="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 class="card-title text-lg font-bold text-green-800">
                      Average Scores
                    </h3>
                    <p class="text-xs text-green-600">Quality performance</p>
                  </div>
                </div>
                <div class="text-2xl font-bold text-green-700 mb-2">
                  {{
                    qualityInspections.length > 0
                      ? Number(
                          qualityInspections.reduce(
                            (sum, i) => sum + (i.overall_quality_score || 0),
                            0
                          ) /
                            qualityInspections.filter(
                              (i) => i.overall_quality_score
                            ).length
                        ).toFixed(1)
                      : 'N/A'
                  }}/10
                </div>
                <div class="text-sm text-green-600">Overall quality rating</div>
              </div>
            </div>

            <!-- Recent Alerts -->
            <div
              class="card bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200"
            >
              <div class="card-body p-6">
                <div class="flex items-center gap-3 mb-4">
                  <div
                    class="w-12 h-12 rounded-full flex items-center justify-center bg-orange-500/10"
                  >
                    <AlertTriangle class="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 class="card-title text-lg font-bold text-orange-800">
                      Quality Alerts
                    </h3>
                    <p class="text-xs text-orange-600">Recent issues</p>
                  </div>
                </div>
                <div class="text-2xl font-bold text-orange-700 mb-2">
                  {{
                    qualityInspections.filter((i) => i.result === 'Fail').length
                  }}
                </div>
                <div class="text-sm text-orange-600">Failed inspections</div>
              </div>
            </div>

            <!-- Approval Rate -->
            <div
              class="card bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200"
            >
              <div class="card-body p-6">
                <div class="flex items-center gap-3 mb-4">
                  <div
                    class="w-12 h-12 rounded-full flex items-center justify-center bg-purple-500/10"
                  >
                    <CheckCircle class="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 class="card-title text-lg font-bold text-purple-800">
                      Approval Rate
                    </h3>
                    <p class="text-xs text-purple-600">Items approved</p>
                  </div>
                </div>
                <div class="text-2xl font-bold text-purple-700 mb-2">
                  {{
                    qualityInspections.length > 0
                      ? Math.round(
                          (qualityInspections.filter((i) => i.result === 'Pass')
                            .length /
                            qualityInspections.length) *
                            100
                        )
                      : 0
                  }}%
                </div>
                <div class="text-sm text-purple-600">Pass rate this period</div>
              </div>
            </div>
          </div>

          <!-- Recent Quality Issues -->
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <h3 class="card-title text-lg font-bold text-primaryColor mb-4">
                Recent Quality Issues & Improvements
              </h3>
              <div class="overflow-x-auto">
                <table class="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Menu Item</th>
                      <th>Inspection Type</th>
                      <th>Result</th>
                      <th>Score</th>
                      <th>Issues</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="inspection in qualityInspections.slice(0, 5)"
                      :key="inspection.id"
                      class="hover:bg-base-200"
                    >
                      <td class="font-medium">{{ inspection.item_name }}</td>
                      <td>
                        <span class="badge badge-sm bg-blue-100 text-blue-800">
                          {{ inspection.inspection_type }}
                        </span>
                      </td>
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
                      <td class="max-w-32 truncate">
                        {{ inspection.findings || 'No issues noted' }}
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
    <dialog id="create_inspection_modal" class="modal" v-if="showCreateModal">
      <div
        class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/95 shadow-lg"
      >
        <h3
          class="font-bold text-xl text-primaryColor mb-4 border-b border-black/10 pb-3"
        >
          Create Quality Inspection
        </h3>

        <!-- Inspection Source Indicator -->
        <div
          v-if="inspectionSource"
          class="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200"
        >
          <div class="flex items-center gap-2">
            <Shield class="w-4 h-4 text-blue-600" />
            <span class="text-sm font-medium text-blue-800">
              {{ inspectionSourceDescription }}
            </span>
          </div>
          <p class="text-xs text-blue-600 mt-1">
            {{
              inspectionSource === 'menu_creation'
                ? 'This inspection was initiated from the Menu Creation page for a specific menu item.'
                : inspectionForm.inspection_type === 'Spot Check'
                  ? 'This is a quick spot check inspection for quality monitoring.'
                  : inspectionForm.inspection_type === 'Complaint Investigation'
                    ? 'This inspection is initiated due to a customer complaint.'
                    : 'This is a quality inspection for the selected menu item.'
            }}
          </p>
        </div>

        <form @submit.prevent="createQualityInspection" class="space-y-6">
          <!-- Basic Information -->
          <div
            class="grid gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
            :class="grid - cols - 1"
          >
            <!-- Menu Item Selection (hidden for menu_creation source) -->
            <div
              v-if="inspectionSource !== 'menu_creation'"
              class="form-control"
            >
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Menu Item <span class="text-red-500">*</span></span
                >
              </label>
              <select
                v-model="inspectionForm.menu_item_id"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                :required="
                  [
                    'Direct Inspection',
                    'Spot Check',
                    'Complaint Investigation',
                  ].includes(inspectionForm.inspection_type)
                "
                placeholder="Select Menu Item"
              >
                <option value="" disabled>Select Menu Item</option>
                <option
                  v-for="item in availableMenuItems"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.menu_item_name || item.item_name }}
                </option>
              </select>
            </div>

            <!-- Menu Item Display (for menu_creation source) -->
            <div
              v-if="inspectionSource === 'menu_creation'"
              class="form-control"
            >
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Menu Item</span
                >
              </label>
              <div class="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div class="flex items-center gap-2">
                  <Package class="w-4 h-4 text-gray-600" />
                  <span class="font-medium text-gray-800">
                    {{
                      availableMenuItems.find(
                        (item) => item.id == inspectionForm.menu_item_id
                      )?.menu_item_name || 'Unknown Item'
                    }}
                  </span>
                </div>
                <p class="text-xs text-gray-600 mt-1">
                  Pre-selected from Menu Creation
                </p>
              </div>
            </div>

            <!-- Inspection Type Selection (hidden for menu_creation source) -->
            <div
              v-if="inspectionSource !== 'menu_creation'"
              class="form-control"
            >
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Inspection Type <span class="text-red-500">*</span></span
                >
              </label>
              <select
                v-model="inspectionForm.inspection_type"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                required
              >
                <option
                  v-for="(type, key) in inspectionTypes"
                  :key="key"
                  :value="type"
                >
                  {{ type }}
                </option>
              </select>
            </div>

            <!-- Inspection Type Display (for menu_creation source) -->
            <div
              v-if="inspectionSource === 'menu_creation'"
              class="form-control"
            >
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Inspection Type</span
                >
              </label>
              <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div class="flex items-center gap-2">
                  <Shield class="w-4 h-4 text-blue-600" />
                  <span class="font-medium text-blue-800">
                    {{ inspectionForm.inspection_type }}
                  </span>
                </div>
                <p class="text-xs text-blue-600 mt-1">
                  Pre-set for direct menu item inspection
                </p>
              </div>
            </div>
          </div>

          <!-- Schedule Information -->
          <div
            class="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Inspection Date <span class="text-red-500">*</span></span
                >
              </label>
              <input
                v-model="inspectionForm.inspection_date"
                type="date"
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                :max="new Date().toISOString().split('T')[0]"
                required
              />
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Inspection Time
                  <span class="text-xs text-black/40">(optional)</span></span
                >
              </label>
              <input
                v-model="inspectionForm.inspection_time"
                type="time"
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              />
            </div>
          </div>

          <!-- Quality Scoring Section -->
          <div
            v-if="
              currentInspectionRequirements.taste_score ||
              currentInspectionRequirements.appearance_score ||
              currentInspectionRequirements.texture_score
            "
            class="bg-white border border-black/10 p-4 rounded-xl"
          >
            <h4 class="font-semibold text-primaryColor mb-4">
              Quality Scoring (1-10 Scale)
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div
                v-if="currentInspectionRequirements.taste_score"
                class="form-control"
              >
                <label class="label mb-1">
                  <span
                    class="label-text text-black/70 font-medium text-sm sm:text-base"
                    >Taste</span
                  >
                </label>
                <input
                  v-model.number="inspectionForm.taste_score"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  placeholder="8.5"
                />
              </div>

              <div
                v-if="currentInspectionRequirements.appearance_score"
                class="form-control"
              >
                <label class="label mb-1">
                  <span
                    class="label-text text-black/70 font-medium text-sm sm:text-base"
                    >Appearance</span
                  >
                </label>
                <input
                  v-model.number="inspectionForm.appearance_score"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  placeholder="9.0"
                />
              </div>

              <div
                v-if="currentInspectionRequirements.texture_score"
                class="form-control"
              >
                <label class="label mb-1">
                  <span
                    class="label-text text-black/70 font-medium text-sm sm:text-base"
                    >Texture</span
                  >
                </label>
                <input
                  v-model.number="inspectionForm.texture_score"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  placeholder="7.5"
                />
              </div>

              <div
                v-if="currentInspectionRequirements.overall_score"
                class="form-control"
              >
                <label class="label mb-1">
                  <span
                    class="label-text text-black/70 font-medium text-sm sm:text-base"
                    >Overall Score</span
                  >
                </label>
                <input
                  v-model.number="inspectionForm.overall_quality_score"
                  type="number"
                  min="1"
                  max="10"
                  step="0.1"
                  class="input input-sm sm:input-md input-bordered w-full bg-gray-50 text-black/70"
                  :placeholder="
                    inspectionForm.overall_quality_score || 'Auto-calculated'
                  "
                  readonly
                />
              </div>
            </div>
          </div>

          <!-- Findings -->
          <div
            class="form-control bg-white border border-black/10 p-4 rounded-xl"
          >
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
                >Findings <span class="text-red-500">*</span></span
              >
            </label>
            <textarea
              v-model="inspectionForm.findings"
              class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              rows="3"
              placeholder="Describe your observations and findings..."
              required
            ></textarea>
          </div>

          <!-- Recommendations -->
          <div
            class="form-control bg-white border border-black/10 p-4 rounded-xl"
          >
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
                >Recommendations</span
              >
            </label>
            <textarea
              v-model="inspectionForm.recommendations"
              class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              rows="2"
              placeholder="Any recommendations for improvement..."
            ></textarea>
          </div>

          <!-- Corrective Actions -->
          <div
            class="form-control bg-white border border-black/10 p-4 rounded-xl"
          >
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
                >Corrective Actions</span
              >
            </label>
            <textarea
              v-model="inspectionForm.corrective_actions"
              class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              rows="2"
              placeholder="Actions needed to address any issues..."
            ></textarea>
          </div>

          <!-- Retest Section -->
          <div class="bg-white border border-black/10 p-4 rounded-xl">
            <div class="form-control">
              <label class="label cursor-pointer mb-3">
                <span class="label-text font-medium">Requires Retest</span>
                <input
                  v-model="inspectionForm.requires_retest"
                  type="checkbox"
                  class="checkbox checkbox-xs checked:text-primaryColor text-primaryColor"
                />
              </label>
            </div>

            <div v-if="inspectionForm.requires_retest" class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Retest Date</span
                >
              </label>
              <input
                v-model="inspectionForm.retest_date"
                type="date"
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                :min="new Date().toISOString().split('T')[0]"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-black/10">
            <button
              type="button"
              @click="closeCreateModal"
              class="btn btn-sm bg-white text-black/70 border border-black/20 hover:bg-primaryColor/10 hover:border-primaryColor/40 rounded-lg shadow-none font-thin"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
              :disabled="loading"
            >
              <span
                class="loading loading-spinner loading-sm mr-2"
                v-if="loading"
              ></span>
              <Shield class="w-4 h-4 mr-2" v-if="!loading" />
              Complete Inspection
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeCreateModal">close</button>
      </form>
    </dialog>

    <!-- Inspection Details Modal -->
    <dialog
      id="inspection_details_modal"
      class="modal"
      v-if="showDetailsModal && selectedInspection"
    >
      <div
        class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/95 shadow-lg"
      >
        <h3
          class="font-bold text-xl text-primaryColor mb-4 border-b border-black/10 pb-3"
        >
          Quality Inspection Details
        </h3>

        <div class="space-y-6">
          <!-- Basic Information -->
          <div
            class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Inspection Number</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ selectedInspection.inspection_number }}
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Menu Item</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ selectedInspection.item_name }}
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Inspector</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ selectedInspection.inspector_name }}
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Inspection Type</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ selectedInspection.inspection_type }}
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Result</span
                >
              </label>
              <div>
                <span
                  class="badge badge-sm"
                  :class="getResultBadgeClass(selectedInspection.result)"
                >
                  {{ selectedInspection.result }}
                </span>
              </div>
            </div>
          </div>

          <!-- Schedule & Status Information -->
          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Inspection Date</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ formatDate(selectedInspection.inspection_date) }}
              </div>
            </div>

            <div v-if="selectedInspection.inspection_time" class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Inspection Time</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ formatTime(selectedInspection.inspection_time) }}
              </div>
            </div>

            <div v-if="selectedInspection.approved_at" class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Approved Date</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ formatDate(selectedInspection.approved_at) }}
              </div>
            </div>

            <div
              v-if="selectedInspection.approved_by_name"
              class="form-control"
            >
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Approved By</span
                >
              </label>
              <div class="text-sm text-primaryColor font-semibold">
                {{ selectedInspection.approved_by_name }}
              </div>
            </div>
          </div>

          <!-- Quality Scores -->
          <div
            v-if="
              selectedInspection.taste_score ||
              selectedInspection.appearance_score ||
              selectedInspection.texture_score ||
              selectedInspection.overall_quality_score
            "
            class="bg-secondaryColor/10 border border-primaryColor/20 p-4 rounded-xl"
          >
            <h4 class="font-semibold text-primaryColor mb-3">
              <Shield class="w-4 h-4 inline mr-2" />
              Quality Scores
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="text-center">
                <div class="text-2xl font-bold text-primaryColor">
                  {{ selectedInspection.taste_score || 'N/A' }}/10
                </div>
                <div class="text-xs text-primaryColor">Taste</div>
                <div class="text-xs text-gray-500">
                  {{ getQualityLevel(selectedInspection.taste_score) }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-primaryColor">
                  {{ selectedInspection.appearance_score || 'N/A' }}/10
                </div>
                <div class="text-xs text-primaryColor">Appearance</div>
                <div class="text-xs text-gray-500">
                  {{ getQualityLevel(selectedInspection.appearance_score) }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-primaryColor">
                  {{ selectedInspection.texture_score || 'N/A' }}/10
                </div>
                <div class="text-xs text-primaryColor">Texture</div>
                <div class="text-xs text-gray-500">
                  {{ getQualityLevel(selectedInspection.texture_score) }}
                </div>
              </div>
              <div class="text-center">
                <div class="text-2xl font-bold text-primaryColor">
                  {{ selectedInspection.overall_quality_score || 'N/A' }}/10
                </div>
                <div class="text-xs text-primaryColor">Overall</div>
                <div class="text-xs text-gray-500">
                  {{
                    getQualityLevel(selectedInspection.overall_quality_score)
                  }}
                </div>
              </div>
            </div>
          </div>

          <!-- Findings -->
          <div
            v-if="selectedInspection.findings"
            class="bg-secondaryColor/10 border border-primaryColor/20 p-4 rounded-xl"
          >
            <h4 class="font-semibold text-primaryColor mb-3">
              <AlertTriangle class="w-4 h-4 inline mr-2" />
              Findings
            </h4>
            <p class="text-gray-700 text-sm leading-relaxed">
              {{ selectedInspection.findings }}
            </p>
          </div>

          <!-- Corrective Actions -->
          <div
            v-if="selectedInspection.corrective_actions"
            class="bg-secondaryColor/10 border border-primaryColor/20 p-4 rounded-xl"
          >
            <h4 class="font-semibold text-primaryColor mb-3">
              <RefreshCcw class="w-4 h-4 inline mr-2" />
              Corrective Actions
            </h4>
            <p class="text-gray-700 text-sm leading-relaxed">
              {{ selectedInspection.corrective_actions }}
            </p>
          </div>

          <!-- Recommendations -->
          <div
            v-if="selectedInspection.recommendations"
            class="bg-secondaryColor/10 border border-primaryColor/20 p-4 rounded-xl"
          >
            <h4 class="font-semibold text-primaryColor mb-3">
              <Star class="w-4 h-4 inline mr-2" />
              Recommendations
            </h4>
            <p class="text-gray-700 text-sm leading-relaxed">
              {{ selectedInspection.recommendations }}
            </p>
          </div>

          <!-- Retest Required -->
          <div
            v-if="selectedInspection.requires_retest"
            class="bg-red-50 border border-red-200 p-4 rounded-xl"
          >
            <h4 class="font-semibold text-red-600 mb-3">
              <AlertTriangle class="w-4 h-4 inline mr-2" />
              Retest Required
            </h4>
            <p class="text-red-700 text-sm leading-relaxed">
              This item requires retesting
              <span v-if="selectedInspection.retest_date">
                by {{ formatDate(selectedInspection.retest_date) }}
              </span>
            </p>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeDetailsModal"
            class="btn btn-ghost btn-sm font-thin"
          >
            Close
          </button>
          <button
            v-if="
              selectedInspection.result === 'Pass' &&
              !selectedInspection.approved_for_production
            "
            @click="approveForProduction(selectedInspection.id)"
            class="btn bg-primaryColor text-white border-none hover:bg-primaryColor/80 btn-sm shadow-none font-thin"
          >
            <CheckCircle class="w-4 h-4 mr-2" />
            Approve for Production
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDetailsModal">close</button>
      </form>
    </dialog>

    <!-- Update Status Modal -->
    <dialog
      id="update_status_modal"
      class="modal"
      v-if="showUpdateStatusModal && selectedInspection"
    >
      <div
        class="modal-box max-w-md rounded-2xl border border-black/10 bg-white/95 shadow-lg"
      >
        <h3
          class="font-bold text-xl text-primaryColor mb-4 border-b border-black/10 pb-3"
        >
          Update Inspection Status
        </h3>

        <form @submit.prevent="updateInspectionStatus" class="space-y-4">
          <!-- Inspection Info -->
          <div class="bg-gray-50 p-3 rounded-lg">
            <p class="text-sm text-gray-600">
              <span class="font-medium">Inspection:</span>
              {{ selectedInspection.item_name }}
            </p>
            <p class="text-sm text-gray-600">
              <span class="font-medium">Type:</span>
              {{ selectedInspection.inspection_type }}
            </p>
          </div>

          <!-- Status Selection -->
          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Inspection Result <span class="text-red-500">*</span>
              </span>
            </label>
            <select
              v-model="statusUpdateForm.result"
              class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              required
            >
              <option value="Pending">Pending</option>
              <option value="Pass">Pass</option>
              <option value="Fail">Fail</option>
              <option value="Retest Required">Retest Required</option>
            </select>
          </div>

          <!-- Notes -->
          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Notes (Optional)
              </span>
            </label>
            <textarea
              v-model="statusUpdateForm.notes"
              class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              rows="3"
              placeholder="Add any additional notes about this status update..."
            ></textarea>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end gap-3 pt-4 border-t border-black/10">
            <button
              type="button"
              @click="closeUpdateStatusModal"
              class="btn btn-sm bg-white text-black/70 border border-black/20 hover:bg-primaryColor/10 hover:border-primaryColor/40 rounded-lg shadow-none font-thin"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-sm bg-primaryColor text-white border-none hover:bg-primaryColor/90 rounded-lg shadow-none font-thin"
            >
              Update Status
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeUpdateStatusModal">close</button>
      </form>
    </dialog>

    <!-- Confirmation Modal -->
    <dialog id="confirmation_modal" class="modal">
      <div class="modal-box max-w-sm">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          {{ confirmModal.title }}
        </h3>
        <p class="text-base-content/70 mb-4">{{ confirmModal.message }}</p>
        <div class="modal-action">
          <button
            @click="closeConfirmModal"
            class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none btn-sm"
          >
            Cancel
          </button>
          <button
            @click="handleConfirmAction"
            class="btn bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80 btn-sm"
          >
            Confirm
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeConfirmModal">close</button>
      </form>
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
        <div
          v-else-if="toast.type === 'warning'"
          class="alert alert-warning shadow-lg max-w-xs sm:max-w-sm"
        >
          <span class="text-xs sm:text-sm">{{ toast.message }}</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
  .text-shadow-xs {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
</style>
