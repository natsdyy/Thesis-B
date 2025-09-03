<script setup>
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
  import {
    FlaskConical,
    Plus,
    Search,
    Filter,
    RefreshCcw,
    Eye,
    Edit,
    Trash2,
    CheckCircle,
    AlertTriangle,
    Clock,
    Package,
    Users,
    Calendar,
    BarChart3,
    Play,
    Pause,
    X,
    ChevronDown,
    ChevronUp,
    User,
    AlertCircle,
    TrendingUp,
    Target,
    ChefHat,
    PhilippinePeso,
    Activity,
    Star,
    Zap,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import { useUserStore } from '../../stores/userStore.js';
  import { useInventoryStore } from '../../stores/inventoryStore.js';

  const productionStore = useProductionStore();
  const authStore = useAuthStore();
  const userStore = useUserStore();

  // Reactive state
  const activeTab = ref('planning');
  const searchQuery = ref('');
  const statusFilter = ref('');
  const dateFilter = ref('');
  const categoryFilter = ref('');
  const showCreateModal = ref(false);
  const showDetailsModal = ref(false);
  const showEditModal = ref(false);
  const selectedSample = ref(null);
  const currentPage = ref(1);
  const itemsPerPage = ref(12);
  const expandedItems = ref(new Set());

  // Form data
  const sampleForm = ref({
    menu_item_id: '',
    batch_size: 10, // Small batch size for testing
    batch_unit: 'servings',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '',
    assigned_to: '',
    production_notes: '',
    priority: 'Normal',
    estimated_cost: '',
  });

  // Confirmation modal
  const confirmModal = ref({
    show: false,
    title: '',
    message: '',
    type: '',
    onConfirm: null,
  });

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const sampleProductions = computed(() => productionStore.sampleProductions);
  const menuItems = computed(() => productionStore.menuItems || []);
  const sampleProductionStats = computed(
    () => productionStore.sampleProductionStats
  );

  // Inventory availability state
  const checkingAvailability = ref(false);
  const ingredientAvailability = ref(null);
  const lastCheckedMenuItem = ref(null);
  const lastCheckedBatchSize = ref(null);
  const batchSizeDebounceTimeout = ref(null);

  // Get users for staff assignment
  const staffMembers = computed(() => {
    // This would normally come from a users store or API call
    return [
      { id: 1, name: 'John Doe', department: 'Production', role: 'Chef' },
      {
        id: 2,
        name: 'Jane Smith',
        department: 'Production',
        role: 'Sous Chef',
      },
      {
        id: 3,
        name: 'Mike Johnson',
        department: 'Production',
        role: 'Line Cook',
      },
      {
        id: 4,
        name: 'Sarah Wilson',
        department: 'Production',
        role: 'Prep Cook',
      },
    ];
  });

  // Computed properties
  const filteredSampleProductions = computed(() => {
    let filtered = sampleProductions.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (sample) =>
          sample.item_name.toLowerCase().includes(query) ||
          sample.sample_batch_number.toLowerCase().includes(query) ||
          sample.recipe_name?.toLowerCase().includes(query) ||
          sample.category?.toLowerCase().includes(query)
      );
    }

    if (statusFilter.value) {
      filtered = filtered.filter(
        (sample) => sample.status === statusFilter.value
      );
    }

    if (dateFilter.value) {
      filtered = filtered.filter(
        (sample) => sample.scheduled_date === dateFilter.value
      );
    }

    if (categoryFilter.value) {
      filtered = filtered.filter(
        (sample) => sample.category === categoryFilter.value
      );
    }

    return filtered.sort((a, b) => {
      // Sort by scheduled date, then status priority
      const dateCompare =
        new Date(a.scheduled_date + ' ' + (a.scheduled_time || '00:00')) -
        new Date(b.scheduled_date + ' ' + (b.scheduled_time || '00:00'));

      if (dateCompare === 0) {
        const statusOrder = {
          'In Progress': 0,
          Planned: 1,
          Completed: 2,
          Failed: 3,
          Cancelled: 4,
        };
        return statusOrder[a.status] - statusOrder[b.status];
      }

      return dateCompare;
    });
  });

  const paginatedSampleProductions = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return filteredSampleProductions.value.slice(
      start,
      start + itemsPerPage.value
    );
  });

  const totalPages = computed(() => {
    return Math.ceil(
      filteredSampleProductions.value.length / itemsPerPage.value
    );
  });

  // Available menu items for sample production
  const availableMenuItems = computed(() => {
    // Return all menu items from the store
    return menuItems.value || [];
  });

  // Currently selected menu item for form population
  const selectedMenuItem = computed(() => {
    if (!sampleForm.value.menu_item_id) return null;
    return availableMenuItems.value.find(
      (item) => item.id === sampleForm.value.menu_item_id
    );
  });

  // Get unique categories for filter
  const availableCategories = computed(() => {
    const categories = new Set();
    sampleProductions.value.forEach((sample) => {
      if (sample.category) categories.add(sample.category);
    });
    return Array.from(categories).sort();
  });

  // Helper functions
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid Time';
    }
  };

  const formatCurrency = (amount) => {
    try {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
      }).format(amount || 0);
    } catch (error) {
      return '₱0.00';
    }
  };

  const formatQuantity = (value) => {
    const num = Number(value || 0);
    if (Number.isNaN(num)) return '0';
    // Show up to 3 decimals, but avoid trailing zeros
    const fixed = num.toFixed(2);
    return fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  };

  const getStatusBadgeClass = (status) => {
    if (!status)
      return 'badge-sm border-none font-medium bg-neutral/20 text-neutral';
    const classes = {
      Planned: 'badge-sm border-none font-medium bg-info/20 text-info',
      'In Progress':
        'badge-sm border-none font-medium bg-warning/20 text-warning',
      Completed: 'badge-sm border-none font-medium bg-success/20 text-success',
      Failed: 'badge-sm border-none font-medium bg-error/20 text-error',
      Cancelled: 'badge-sm border-none font-medium bg-neutral/20 text-neutral',
    };
    return (
      classes[status] ||
      'badge-sm border-none font-medium bg-neutral/20 text-neutral'
    );
  };

  const getStatusIcon = (status) => {
    if (!status) return Clock;
    const icons = {
      Planned: Calendar,
      'In Progress': Play,
      Completed: CheckCircle,
      Failed: AlertTriangle,
      Cancelled: X,
    };
    return icons[status] || Clock;
  };

  const getPriorityBadgeClass = (priority) => {
    if (!priority)
      return 'badge-sm border-none font-medium bg-neutral/20 text-neutral';
    const classes = {
      Urgent: 'badge-sm border-none font-medium bg-error/20 text-error',
      High: 'badge-sm border-none font-medium bg-warning/20 text-warning',
      Normal: 'badge-sm border-none font-medium bg-info/20 text-info',
      Low: 'badge-sm border-none font-medium bg-neutral/20 text-neutral',
    };
    return classes[priority] || classes.Normal;
  };

  const isOverdue = (scheduledDate, scheduledTime) => {
    if (!scheduledDate) return false;
    const scheduled = new Date(`${scheduledDate} ${scheduledTime || '00:00'}`);
    const now = new Date();
    return scheduled < now;
  };

  const getIngredientAvailabilityStatus = (sample) => {
    // This would normally check against inventory
    // For now, return mock data
    if (!sample) {
      return {
        total_ingredients: 0,
        available_ingredients: 0,
        sufficient_for_production: false,
      };
    }
    return {
      total_ingredients: sample.recipe_ingredients?.length || 0,
      available_ingredients: Math.floor(
        (sample.recipe_ingredients?.length || 0) * 0.8
      ),
      sufficient_for_production: Math.random() > 0.3, // Mock availability
    };
  };

  const canStartProduction = (sample) => {
    if (!sample || sample.status !== 'Planned') return false;
    const availability = getIngredientAvailabilityStatus(sample);
    return availability.sufficient_for_production;
  };

  const resetForm = () => {
    sampleForm.value = {
      menu_item_id: '',
      batch_size: 10,
      batch_unit: 'servings',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: '',
      assigned_to: '',
      production_notes: '',
      priority: 'Normal',
      estimated_cost: '',
    };
  };

  // Methods
  const fetchData = async () => {
    try {
      await Promise.all([
        productionStore.fetchSampleProductions(),
        productionStore.fetchMenuItems(),
        productionStore.fetchSampleProductionStats(),
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

  const openEditModal = (sample) => {
    selectedSample.value = sample;
    sampleForm.value = {
      menu_item_id: sample.menu_item_id,
      batch_size: sample.batch_size,
      batch_unit: sample.batch_unit,
      scheduled_date: sample.scheduled_date,
      scheduled_time: sample.scheduled_time,
      assigned_to: sample.assigned_to,
      production_notes: sample.production_notes,
      priority: sample.priority || 'Normal',
      estimated_cost: sample.estimated_cost,
    };
    showEditModal.value = true;
  };

  const closeEditModal = () => {
    showEditModal.value = false;
    selectedSample.value = null;
    resetForm();
  };

  const openDetailsModal = (sample) => {
    selectedSample.value = sample;
    showDetailsModal.value = true;
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedSample.value = null;
  };

  // Confirmation modal helpers
  const openConfirmModal = (type, title, message, onConfirm) => {
    confirmModal.value = {
      show: true,
      type,
      title,
      message,
      onConfirm,
    };
  };

  const closeConfirmModal = () => {
    confirmModal.value = {
      show: false,
      title: '',
      message: '',
      type: '',
      onConfirm: null,
    };
  };

  const createSampleProduction = async () => {
    try {
      const formData = { ...sampleForm.value };

      // Validate required fields
      if (!formData.menu_item_id) {
        showToast('error', 'Please select a menu item');
        return;
      }

      if (!formData.batch_size || formData.batch_size <= 0) {
        showToast('error', 'Please enter a valid batch size');
        return;
      }

      if (!formData.scheduled_date) {
        showToast('error', 'Please select a scheduled date');
        return;
      }

      await productionStore.createSampleProduction(formData);
      closeCreateModal();
      closeConfirmModal();
      showToast('success', 'Sample production planned successfully');
    } catch (error) {
      showToast('error', error.message || 'Failed to plan sample production');
    }
  };

  const updateSampleProduction = async () => {
    try {
      const formData = { ...sampleForm.value };

      // Validate required fields
      if (!formData.menu_item_id) {
        showToast('error', 'Please select a menu item');
        return;
      }

      if (!formData.batch_size || formData.batch_size <= 0) {
        showToast('error', 'Please enter a valid batch size');
        return;
      }

      if (!formData.scheduled_date) {
        showToast('error', 'Please select a scheduled date');
        return;
      }

      await productionStore.updateSampleProduction(
        selectedSample.value.id,
        formData
      );
      closeEditModal();
      closeConfirmModal();
      showToast('success', 'Sample production updated successfully');
    } catch (error) {
      showToast('error', error.message || 'Failed to update sample production');
    }
  };

  const startSampleProduction = async (sampleId) => {
    openConfirmModal(
      'start',
      'Start Sample Production',
      'Are you sure you want to start this sample production? This will change the status to "In Progress".',
      async () => {
        try {
          await productionStore.startSampleProduction(sampleId);
          showToast('success', 'Sample production started');
        } catch (error) {
          showToast(
            'error',
            error.message || 'Failed to start sample production'
          );
        }
      }
    );
  };

  const completeSampleProduction = async (
    sampleId,
    quantityProduced,
    productionCost,
    notes
  ) => {
    openConfirmModal(
      'complete',
      'Complete Sample Production',
      'Are you sure you want to mark this sample production as completed? This will make it available for quality inspection.',
      async () => {
        try {
          await productionStore.completeSampleProduction(
            sampleId,
            quantityProduced,
            productionCost,
            notes
          );
          showToast('success', 'Sample production completed successfully');
        } catch (error) {
          showToast(
            'error',
            error.message || 'Failed to complete sample production'
          );
        }
      }
    );
  };

  const cancelSampleProduction = async (sampleId) => {
    openConfirmModal(
      'cancel',
      'Cancel Sample Production',
      'Are you sure you want to cancel this sample production? This action cannot be undone.',
      async () => {
        try {
          await productionStore.cancelSampleProduction(sampleId);
          showToast('warning', 'Sample production cancelled');
        } catch (error) {
          showToast(
            'error',
            error.message || 'Failed to cancel sample production'
          );
        }
      }
    );
  };

  const deleteSampleProduction = async (sampleId) => {
    openConfirmModal(
      'delete',
      'Delete Sample Production',
      'Are you sure you want to delete this sample production? This action cannot be undone.',
      async () => {
        try {
          await productionStore.deleteSampleProduction(sampleId);
          showToast('success', 'Sample production deleted successfully');
        } catch (error) {
          showToast(
            'error',
            error.message || 'Failed to delete sample production'
          );
        }
      }
    );
  };

  const handleMenuItemSelection = (menuItemId) => {
    const selectedMenuItem = availableMenuItems.value.find(
      (item) => item.id == menuItemId
    );
    if (selectedMenuItem) {
      // Auto-populate category and other details
      sampleForm.value.category = selectedMenuItem.category;

      // Auto-populate batch size and unit from menu item standards
      if (selectedMenuItem.batch_size) {
        sampleForm.value.batch_size = selectedMenuItem.batch_size;
      }
      if (selectedMenuItem.batch_unit) {
        sampleForm.value.batch_unit = selectedMenuItem.batch_unit;
      }

      // Calculate estimated cost based on menu item cost
      if (selectedMenuItem.cost_price) {
        const costPerServing = selectedMenuItem.cost_price;
        const totalCost = costPerServing * sampleForm.value.batch_size;
        sampleForm.value.estimated_cost = totalCost.toFixed(2);
      }

      // Check ingredient availability
      checkIngredientAvailability(selectedMenuItem);
    }
  };

  const checkIngredientAvailability = async (menuItem) => {
    if (!menuItem) return;

    // Don't recheck if it's the same menu item, batch size, and we already have data
    if (
      lastCheckedMenuItem.value === menuItem.id &&
      lastCheckedBatchSize.value === sampleForm.value.batch_size &&
      ingredientAvailability.value
    ) {
      return;
    }

    checkingAvailability.value = true;
    lastCheckedMenuItem.value = menuItem.id;
    lastCheckedBatchSize.value = sampleForm.value.batch_size;

    // Initialize variables at function level
    let totalIngredients = 0;
    let availableIngredients = 0;
    let insufficientIngredients = [];
    let scalingFactor = 1;
    let standardBatchSize = 1;
    let batchSize = 1;

    try {
      // Get the recipe for this menu item to check ingredients
      const recipe = await productionStore.getRecipeById(menuItem.recipe_id);

      console.log('Recipe fetched:', recipe);
      console.log('Recipe ingredients:', recipe?.ingredients);

      if (!recipe || !recipe.ingredients) {
        ingredientAvailability.value = {
          total_ingredients: 0,
          available_ingredients: 0,
          sufficient_for_production: false,
          insufficient_ingredients: [],
          ingredients: [],
          message: 'No recipe found for this menu item',
        };
        return;
      }

      // Get current inventory levels
      const inventoryStore = useInventoryStore();
      await inventoryStore.fetchCurrentInventory();

      console.log('Inventory store:', inventoryStore);
      console.log('Current inventory:', inventoryStore.currentInventory);

      const ingredients = recipe.ingredients;
      batchSize = sampleForm.value.batch_size || 1;
      standardBatchSize = recipe.batch_size || 1;

      // Calculate scaling factor for the sample production
      scalingFactor = batchSize / standardBatchSize;

      totalIngredients = ingredients.length;
      availableIngredients = 0;
      insufficientIngredients = [];

      // Check each ingredient's availability
      const allIngredients = [];

      console.log('Processing ingredients:', ingredients.length);

      for (const ingredient of ingredients) {
        console.log('Processing ingredient:', ingredient);

        const inventoryItem = inventoryStore.currentInventory.find(
          (item) => item.id === ingredient.inventory_item_id
        );

        console.log('Found inventory item:', inventoryItem);

        // Calculate required quantity for this sample production
        const requiredQuantity =
          (ingredient.quantity_required || 0) * scalingFactor;
        const availableQuantity = inventoryItem
          ? inventoryItem.quantity || 0
          : 0;
        const ingredientName = inventoryItem
          ? inventoryItem.item_name
          : ingredient.ingredient_name || 'Unknown Ingredient';
        const unit = inventoryItem
          ? inventoryItem.unit_of_measure
          : ingredient.unit || 'units';
        const costPerUnit = inventoryItem ? inventoryItem.unit_cost || 0 : 0;

        // Add to all ingredients list for detailed display
        allIngredients.push({
          ingredient_name: ingredientName,
          required_quantity: requiredQuantity,
          available_quantity: availableQuantity,
          unit: unit,
          cost_per_unit: costPerUnit,
          is_available: availableQuantity >= requiredQuantity,
        });

        if (availableQuantity >= requiredQuantity) {
          availableIngredients++;
        } else {
          insufficientIngredients.push({
            ingredient_name: ingredientName,
            available_quantity: availableQuantity,
            required_quantity: requiredQuantity,
            unit: unit,
            cost_per_unit: costPerUnit,
          });
        }
      }

      const sufficient_for_production =
        availableIngredients === totalIngredients;

      ingredientAvailability.value = {
        total_ingredients: totalIngredients,
        available_ingredients: availableIngredients,
        sufficient_for_production,
        insufficient_ingredients: insufficientIngredients,
        ingredients: allIngredients,
        scaling_factor: scalingFactor,
        standard_batch_size: standardBatchSize,
        sample_batch_size: batchSize,
      };

      console.log(
        'Final ingredient availability:',
        ingredientAvailability.value
      );
    } catch (error) {
      console.error('Error checking ingredient availability:', error);
      ingredientAvailability.value = {
        total_ingredients: totalIngredients,
        available_ingredients: availableIngredients,
        sufficient_for_production: false,
        insufficient_ingredients: insufficientIngredients,
        ingredients: [],
        message: 'Error checking availability',
      };
    } finally {
      checkingAvailability.value = false;
    }
  };

  const showCreateConfirmation = () => {
    if (!sampleForm.value.menu_item_id) {
      showToast('error', 'Please select a menu item');
      return;
    }
    if (!sampleForm.value.batch_size || sampleForm.value.batch_size <= 0) {
      showToast('error', 'Please enter a valid batch size');
      return;
    }
    if (!sampleForm.value.scheduled_date) {
      showToast('error', 'Please select a scheduled date');
      return;
    }
    openConfirmModal(
      'create',
      'Create Sample Production',
      `Are you sure you want to create a sample production for "${availableMenuItems.value.find((item) => item.id == sampleForm.value.menu_item_id)?.item_name || 'this item'}"?`,
      createSampleProduction
    );
  };

  const showUpdateConfirmation = () => {
    if (!sampleForm.value.menu_item_id) {
      showToast('error', 'Please select a menu item');
      return;
    }
    if (!sampleForm.value.batch_size || sampleForm.value.batch_size <= 0) {
      showToast('error', 'Please enter a valid batch size');
      return;
    }
    if (!sampleForm.value.scheduled_date) {
      showToast('error', 'Please select a scheduled date');
      return;
    }
    openConfirmModal(
      'update',
      'Update Sample Production',
      'Are you sure you want to update this sample production?',
      updateSampleProduction
    );
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
  onMounted(() => {
    fetchData();
  });

  onUnmounted(() => {
    // Clear any pending debounce timeouts
    if (batchSizeDebounceTimeout.value) {
      clearTimeout(batchSizeDebounceTimeout.value);
    }
  });

  // Watch for data changes
  watch([searchQuery, statusFilter, dateFilter, categoryFilter], () => {
    currentPage.value = 1;
  });

  // Watch for menu item selection to auto-populate fields
  watch(
    () => sampleForm.value.menu_item_id,
    (newValue) => {
      handleMenuItemSelection(newValue);
    }
  );

  // Watch for batch size changes to recalculate cost
  watch(
    () => sampleForm.value.batch_size,
    (newValue) => {
      // Clear previous timeout
      if (batchSizeDebounceTimeout.value) {
        clearTimeout(batchSizeDebounceTimeout.value);
      }

      // Set new timeout for debounced execution
      batchSizeDebounceTimeout.value = setTimeout(() => {
        if (newValue && sampleForm.value.menu_item_id) {
          const selectedMenuItem = availableMenuItems.value.find(
            (item) => item.id == sampleForm.value.menu_item_id
          );
          if (selectedMenuItem?.cost_price) {
            const costPerServing = selectedMenuItem.cost_price;
            const totalCost = costPerServing * newValue;
            sampleForm.value.estimated_cost = totalCost.toFixed(2);
          }

          // Recheck ingredient availability when batch size changes
          if (selectedMenuItem) {
            checkIngredientAvailability(selectedMenuItem);
          }
        }
      }, 500); // 500ms debounce delay
    }
  );
</script>

<template>
  <div class="container mx-auto p-2 sm:p-4 lg:p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6 lg:mb-8">
      <h1
        class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primaryColor mb-2 text-shadow-xs"
      >
        Sample Production Planning
      </h1>
      <p class="text-sm sm:text-base text-black/50 px-2">
        Plan and manage small-batch sample productions for menu items before
        full production.
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
          <FlaskConical
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-primaryColor"
          />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Total Samples
        </div>
        <div
          class="stat-value text-primaryColor text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ sampleProductionStats.total_samples || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Sample productions planned
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Play class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-warning" />
        </div>
        <div class="stat-title text-black/50 text-xs sm:text-sm">
          In Progress
        </div>
        <div
          class="stat-value text-warning text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ sampleProductionStats.in_progress_samples || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Currently being produced
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
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Completed
        </div>
        <div
          class="stat-value text-success text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ sampleProductionStats.completed_samples || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Ready for quality inspection
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <PhilippinePeso
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-info"
          />
        </div>
        <div class="stat-title text-black/50 text-xs sm:text-sm">Avg. Cost</div>
        <div
          class="stat-value text-info text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ formatCurrency(sampleProductionStats.average_cost || 0) }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Per sample batch
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
        Plan Sample Production
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
        @click="activeTab = 'planning'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'planning' }"
      >
        <Calendar class="w-4 h-4 mr-1" />
        Production Planning
      </button>
      <button
        @click="activeTab = 'monitoring'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'monitoring' }"
      >
        <BarChart3 class="w-4 h-4 mr-1" />
        Production Monitoring
      </button>
    </div>

    <!-- Tab Content -->
    <div
      class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10"
    >
      <div class="card-body p-3 sm:p-4 lg:p-6">
        <!-- Planning Tab -->
        <div v-if="activeTab === 'planning'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Sample Production Planning
              </h2>
              <p class="text-sm text-gray-600">
                Plan small-batch productions for menu items to test recipes
                before full production.
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
                  placeholder="Search sample productions..."
                  class="input input-bordered w-full pl-10"
                />
              </div>
            </div>
            <div class="flex gap-2">
              <select v-model="statusFilter" class="select select-bordered">
                <option value="">All Status</option>
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Failed">Failed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <select v-model="categoryFilter" class="select select-bordered">
                <option value="">All Categories</option>
                <option
                  v-for="category in availableCategories"
                  :key="category"
                  :value="category"
                >
                  {{ category }}
                </option>
              </select>
              <input
                v-model="dateFilter"
                type="date"
                class="input input-bordered"
                placeholder="Filter by date"
              />
            </div>
          </div>

          <!-- Sample Productions Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="sample in paginatedSampleProductions"
              :key="sample.id"
              class="card bg-white border border-gray-200 hover:shadow-xl duration-300 cursor-pointer"
              @click="openDetailsModal(sample)"
            >
              <div class="card-body p-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <h3
                      class="card-title text-lg font-bold text-primaryColor mb-2"
                    >
                      {{ sample.item_name }}
                    </h3>
                    <p class="text-sm text-gray-600 mb-2">
                      Batch #{{ sample.sample_batch_number }}
                    </p>
                    <div class="flex items-center gap-2 mb-3">
                      <component
                        :is="getStatusIcon(sample.status)"
                        class="w-4 h-4"
                        :class="
                          getStatusBadgeClass(sample.status).includes(
                            'text-success'
                          )
                            ? 'text-success'
                            : getStatusBadgeClass(sample.status).includes(
                                  'text-warning'
                                )
                              ? 'text-warning'
                              : getStatusBadgeClass(sample.status).includes(
                                    'text-error'
                                  )
                                ? 'text-error'
                                : getStatusBadgeClass(sample.status).includes(
                                      'text-info'
                                    )
                                  ? 'text-info'
                                  : 'text-gray-500'
                        "
                      />
                      <span
                        class="badge"
                        :class="getStatusBadgeClass(sample.status)"
                      >
                        {{ sample.status }}
                      </span>
                      <span
                        v-if="
                          isOverdue(
                            sample.scheduled_date,
                            sample.scheduled_time
                          )
                        "
                        class="badge badge-error"
                      >
                        Overdue
                      </span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium text-primaryColor">
                      {{ sample.batch_size }} {{ sample.batch_unit }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{ formatDate(sample.scheduled_date) }}
                    </div>
                    <div
                      v-if="sample.scheduled_time"
                      class="text-xs text-gray-500"
                    >
                      {{ formatTime(sample.scheduled_time) }}
                    </div>
                    <div v-if="sample.priority" class="text-xs mt-1">
                      <span
                        class="badge"
                        :class="getPriorityBadgeClass(sample.priority)"
                      >
                        {{ sample.priority }}
                      </span>
                    </div>
                    <div
                      v-if="sample.estimated_cost"
                      class="text-xs text-info mt-1"
                    >
                      {{ formatCurrency(sample.estimated_cost) }}
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4 text-sm text-gray-600">
                    <div class="flex items-center gap-1">
                      <User class="w-4 h-4" />
                      <span class="truncate max-w-20">{{
                        sample.assigned_to_name || 'Unassigned'
                      }}</span>
                    </div>
                  </div>
                  <div class="flex gap-1">
                    <button
                      @click.stop="startSampleProduction(sample.id)"
                      v-if="canStartProduction(sample)"
                      class="btn btn-ghost btn-xs text-success hover:bg-success/10"
                      title="Start Production"
                    >
                      <Play class="w-4 h-4" />
                    </button>
                    <button
                      @click.stop="cancelSampleProduction(sample.id)"
                      v-if="sample.status === 'Planned'"
                      class="btn btn-ghost btn-xs text-error hover:bg-error/10"
                      title="Cancel Production"
                    >
                      <X class="w-4 h-4" />
                    </button>
                    <button
                      @click.stop="openEditModal(sample)"
                      v-if="sample.status === 'Planned'"
                      class="btn btn-ghost btn-xs text-warning hover:bg-warning/10"
                      title="Edit Production"
                    >
                      <Edit class="w-4 h-4" />
                    </button>
                    <button
                      @click.stop="openDetailsModal(sample)"
                      class="btn btn-ghost btn-xs text-primaryColor hover:bg-primaryColor/10"
                      title="View Details"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                    <button
                      @click.stop="deleteSampleProduction(sample.id)"
                      v-if="
                        ['Completed', 'Failed', 'Cancelled'].includes(
                          sample.status
                        )
                      "
                      class="btn btn-ghost btn-xs text-error hover:bg-error/10"
                      title="Delete Production"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <!-- Ingredient Availability Status -->
                <div class="mt-4 pt-4 border-t border-gray-100">
                  <div class="flex items-center justify-between text-sm">
                    <span class="text-gray-600">Ingredients:</span>
                    <span
                      class="font-medium"
                      :class="
                        getIngredientAvailabilityStatus(sample)
                          .sufficient_for_production
                          ? 'text-success'
                          : 'text-error'
                      "
                    >
                      {{
                        getIngredientAvailabilityStatus(sample)
                          .available_ingredients
                      }}/{{
                        getIngredientAvailabilityStatus(sample)
                          .total_ingredients
                      }}
                      available
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-if="paginatedSampleProductions.length === 0"
              class="col-span-full flex flex-col items-center justify-center py-12"
            >
              <FlaskConical class="w-16 h-16 text-gray-300 mb-4" />
              <h3 class="text-lg font-medium text-gray-600 mb-2">
                No sample productions found
              </h3>
              <p class="text-sm text-gray-500 text-center mb-4">
                {{
                  searchQuery || statusFilter || dateFilter
                    ? 'Try adjusting your filters'
                    : 'Plan your first sample production to get started'
                }}
              </p>
              <button
                v-if="!searchQuery && !statusFilter && !dateFilter"
                @click="openCreateModal"
                class="btn bg-primaryColor text-white hover:bg-primaryColor/80 font-thin"
              >
                <Plus class="w-4 h-4 mr-2" />
                Plan Sample Production
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

        <!-- Monitoring Tab -->
        <div v-if="activeTab === 'monitoring'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Production Monitoring
              </h2>
              <p class="text-sm text-gray-600">
                Monitor ongoing sample productions and track progress in
                real-time.
              </p>
            </div>
          </div>

          <!-- Active Productions -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="card bg-white shadow-lg">
              <div class="card-body">
                <h3 class="card-title text-lg font-bold text-primaryColor mb-4">
                  Active Productions
                </h3>
                <div class="space-y-4">
                  <div
                    v-for="sample in sampleProductions.filter(
                      (s) => s.status === 'In Progress'
                    )"
                    :key="sample.id"
                    class="flex items-center justify-between p-4 bg-blue-50 rounded-lg"
                  >
                    <div>
                      <div class="font-medium text-primaryColor">
                        {{ sample.item_name }}
                      </div>
                      <div class="text-sm text-gray-600">
                        Batch #{{ sample.sample_batch_number }}
                      </div>
                      <div class="text-sm text-gray-500">
                        Started: {{ formatDate(sample.actual_start_date) }}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-medium">
                        {{ sample.assigned_to_name || 'Unassigned' }}
                      </div>
                      <div class="badge badge-info mt-1">In Progress</div>
                    </div>
                  </div>
                  <div
                    v-if="
                      sampleProductions.filter(
                        (s) => s.status === 'In Progress'
                      ).length === 0
                    "
                    class="text-center py-8 text-gray-500"
                  >
                    No active productions at the moment
                  </div>
                </div>
              </div>
            </div>

            <div class="card bg-white shadow-lg">
              <div class="card-body">
                <h3 class="card-title text-lg font-bold text-primaryColor mb-4">
                  Today's Schedule
                </h3>
                <div class="space-y-4">
                  <div
                    v-for="sample in sampleProductions.filter(
                      (s) =>
                        s.scheduled_date ===
                          new Date().toISOString().split('T')[0] &&
                        s.status === 'Planned'
                    )"
                    :key="sample.id"
                    class="flex items-center justify-between p-4 bg-yellow-50 rounded-lg"
                  >
                    <div>
                      <div class="font-medium text-primaryColor">
                        {{ sample.item_name }}
                      </div>
                      <div class="text-sm text-gray-600">
                        {{ sample.scheduled_time || 'Time not set' }}
                      </div>
                      <div class="text-sm text-gray-500">
                        {{ sample.batch_size }} {{ sample.batch_unit }}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-sm font-medium">
                        {{ sample.assigned_to_name || 'Unassigned' }}
                      </div>
                      <div class="badge badge-warning mt-1">Scheduled</div>
                    </div>
                  </div>
                  <div
                    v-if="
                      sampleProductions.filter(
                        (s) =>
                          s.scheduled_date ===
                            new Date().toISOString().split('T')[0] &&
                          s.status === 'Planned'
                      ).length === 0
                    "
                    class="text-center py-8 text-gray-500"
                  >
                    No productions scheduled for today
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Sample Production Modal -->
    <dialog
      id="sample_production_modal"
      class="modal"
      :class="{ 'modal-open': showCreateModal }"
    >
      <div
        class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/95 shadow-lg"
      >
        <h3
          class="font-bold text-xl text-primaryColor mb-4 border-b border-black/10 pb-3"
        >
          Plan Sample Production
        </h3>

        <form @submit.prevent="showCreateConfirmation" class="space-y-6">
          <!-- Basic Information -->
          <div
            class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Menu Item <span class="text-red-500">*</span></span
                >
              </label>
              <select
                v-model="sampleForm.menu_item_id"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                required
              >
                <option value="" disabled>Select Menu Item</option>
                <option
                  v-for="item in availableMenuItems"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.item_name }} ({{ item.category }})
                </option>
              </select>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Assigned To</span
                >
              </label>
              <select
                v-model="sampleForm.assigned_to"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              >
                <option value="">Select Staff Member</option>
                <option
                  v-for="staff in staffMembers"
                  :key="staff.id"
                  :value="staff.id"
                >
                  {{ staff.name }} ({{ staff.role }})
                </option>
              </select>
            </div>
          </div>

          <!-- Production Details -->
          <div
            class="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Batch Size <span class="text-red-500">*</span></span
                >
              </label>
              <input
                v-model.number="sampleForm.batch_size"
                type="number"
                min="1"
                max="50"
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                placeholder="10"
                required
              />
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Unit</span
                >
              </label>
              <select
                v-model="sampleForm.batch_unit"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              >
                <option value="servings">Servings</option>
                <option value="pieces">Pieces</option>
                <option value="kg">Kilograms</option>
                <option value="liters">Liters</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Priority</span
                >
              </label>
              <select
                v-model="sampleForm.priority"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <!-- Schedule Information -->
          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Scheduled Date <span class="text-red-500">*</span></span
                >
              </label>
              <input
                v-model="sampleForm.scheduled_date"
                type="date"
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                :min="new Date().toISOString().split('T')[0]"
                required
              />
            </div>
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Scheduled Time</span
                >
              </label>
              <input
                v-model="sampleForm.scheduled_time"
                type="time"
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              />
            </div>
          </div>

          <!-- Cost & Notes Information -->
          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Estimated Cost</span
                >
              </label>
              <input
                v-model="sampleForm.estimated_cost"
                type="number"
                step="0.01"
                min="0"
                class="input input-sm sm:input-md input-bordered w-full bg-gray-50 text-black/70"
                placeholder="0.00"
                readonly
              />
              <div class="text-xs text-black/40 mt-2">
                Auto-calculated based on menu item cost and batch size
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Production Notes</span
                >
              </label>
              <textarea
                v-model="sampleForm.production_notes"
                class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                rows="3"
                placeholder="Any special instructions or notes for production..."
              ></textarea>
            </div>
          </div>

          <!-- Ingredient Availability Preview -->
          <div
            v-if="sampleForm.menu_item_id"
            class="bg-success/10 border border-success/20 p-4 rounded-xl"
          >
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-thin text-green-600">
                <font-awesome-icon icon="fa-solid fa-box" />
                Ingredient Availability Check
              </h4>
              <div class="flex items-center gap-2">
                <button
                  v-if="!checkingAvailability && ingredientAvailability"
                  @click="
                    checkIngredientAvailability(
                      availableMenuItems.find(
                        (item) => item.id === sampleForm.menu_item_id
                      )
                    )
                  "
                  class="btn btn-xs btn-ghost text-primaryColor hover:bg-primaryColor/10"
                  title="Refresh availability"
                >
                  <RefreshCcw class="w-3 h-3" />
                </button>
                <div
                  v-if="checkingAvailability"
                  class="flex items-center text-sm text-primaryColor"
                >
                  <RefreshCcw class="w-4 h-4 mr-1 animate-spin" />
                  Checking availability...
                </div>
              </div>
            </div>

            <div v-if="ingredientAvailability" class="space-y-4">
              <!-- Summary -->
              <div class="grid grid-cols-3 gap-4 text-sm">
                <div class="text-center">
                  <div class="text-2xl font-thin text-green-600">
                    {{ ingredientAvailability.total_ingredients }}
                  </div>
                  <div class="text-xs text-green-600">Total Ingredients</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-thin text-success">
                    {{ ingredientAvailability.available_ingredients }}
                  </div>
                  <div class="text-xs text-success">Available</div>
                </div>
                <div class="text-center">
                  <div
                    class="text-2xl font-thin"
                    :class="
                      ingredientAvailability.sufficient_for_production
                        ? 'text-success'
                        : 'text-red-600'
                    "
                  >
                    {{
                      ingredientAvailability.sufficient_for_production
                        ? 'Ready'
                        : 'Issues'
                    }}
                  </div>
                  <div class="text-xs text-success">Status</div>
                </div>
              </div>

              <!-- Detailed Ingredient Breakdown -->
              <div class="border-t border-green-200 pt-4">
                <div class="text-sm font-medium text-green-600 mb-3">
                  <font-awesome-icon icon="fa-solid fa-clipboard" />
                  Ingredient Details:
                </div>
                <div class="space-y-3 max-h-96 overflow-y-auto">
                  <div
                    v-for="ingredient in ingredientAvailability.ingredients"
                    :key="ingredient.ingredient_name"
                    class="p-3 rounded-lg border border-primaryColor/10 bg-white/50"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="font-medium text-sm text-green-600 mb-1">
                          {{ ingredient.ingredient_name }}
                        </div>
                        <div class="text-xs text-gray-600 mb-2">
                          <span class="font-medium">Required:</span>
                          <span class="text-success ml-1 font-thin">
                            {{ formatQuantity(ingredient.required_quantity) }}
                            {{ ingredient.unit }}
                          </span>
                          <span class="mx-2">•</span>
                          <span class="font-medium">Available:</span>
                          <span
                            class="ml-1 font-thin"
                            :class="
                              ingredient.is_available
                                ? 'text-success'
                                : 'text-error'
                            "
                          >
                            {{ formatQuantity(ingredient.available_quantity) }}
                            {{ ingredient.unit }}
                          </span>
                        </div>
                        <div class="text-xs text-gray-600">
                          <span class="font-medium"
                            >Cost per {{ ingredient.unit }}:</span
                          >
                          <span class="font-semibold ml-1">
                            {{ formatCurrency(ingredient.cost_per_unit) }}
                          </span>
                          <span class="ml-2">•</span>
                          <span class="font-medium">Total:</span>
                          <span class="font-semibold ml-1 text-gray-600">
                            {{
                              formatCurrency(
                                ingredient.required_quantity *
                                  ingredient.cost_per_unit
                              )
                            }}
                          </span>
                        </div>
                      </div>

                      <div class="flex flex-col items-end gap-2">
                        <!-- Status Badge -->
                        <div
                          class="badge text-xs"
                          :class="{
                            'badge-success border-none text-success bg-success/20':
                              ingredient.available_quantity >=
                              ingredient.required_quantity,
                            'badge-warning border-none text-warning bg-warning/20':
                              ingredient.available_quantity > 0 &&
                              ingredient.available_quantity <
                                ingredient.required_quantity,
                            'badge-error border-none text-error bg-error/20':
                              ingredient.available_quantity <= 0,
                          }"
                        >
                          {{
                            ingredient.available_quantity >=
                            ingredient.required_quantity
                              ? 'Sufficient'
                              : ingredient.available_quantity <= 0
                                ? 'Out of Stock'
                                : 'Insufficient'
                          }}
                        </div>

                        <!-- Shortage Info -->
                        <div
                          v-if="
                            ingredient.available_quantity <
                            ingredient.required_quantity
                          "
                          class="text-xs text-error"
                        >
                          Short by
                          <span class="font-semibold">
                            {{
                              formatQuantity(
                                ingredient.required_quantity -
                                  ingredient.available_quantity
                              )
                            }}
                            {{ ingredient.unit }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Insufficient ingredients summary -->
              <div
                v-if="!ingredientAvailability.sufficient_for_production"
                class="bg-red-50 border border-red-200 p-3 rounded-lg"
              >
                <div class="text-sm font-medium text-red-800 mb-2">
                  Issues Found:
                </div>
                <div class="text-xs text-red-700">
                  {{
                    ingredientAvailability.total_ingredients -
                    ingredientAvailability.available_ingredients
                  }}
                  out of
                  {{ ingredientAvailability.total_ingredients }} ingredients are
                  insufficient for production.
                </div>
              </div>

              <!-- Production readiness status -->
              <div
                class="flex items-center justify-between pt-3 border-t border-green-200"
              >
                <span class="text-sm text-green-600 font-medium"
                  >Production Ready:</span
                >
                <span
                  class="badge badge-sm"
                  :class="
                    ingredientAvailability.sufficient_for_production
                      ? 'badge-success bg-success/20 badge-outline text-success'
                      : 'badge-error bg-error/20 badge-outline text-error'
                  "
                >
                  {{
                    ingredientAvailability.sufficient_for_production
                      ? 'Yes'
                      : 'No'
                  }}
                </span>
              </div>
            </div>

            <div
              v-else-if="!checkingAvailability"
              class="text-center text-blue-600 py-4"
            >
              <Package class="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div class="text-sm">
                Select a menu item to check ingredient availability
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
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
              <Plus class="w-4 h-4 mr-2" v-else />
              Plan Sample Production
            </button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- Edit Sample Production Modal -->
    <dialog
      id="edit_sample_modal"
      class="modal"
      :class="{ 'modal-open': showEditModal }"
    >
      <div class="modal-box max-w-4xl">
        <h3
          class="font-bold text-xl text-primaryColor mb-4 border-b border-black/10 pb-3"
        >
          Edit Sample Production
        </h3>

        <form @submit.prevent="showUpdateConfirmation" class="space-y-6">
          <!-- Basic Information -->
          <div
            class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Menu Item <span class="text-red-500">*</span></span
                >
              </label>
              <select
                v-model="sampleForm.menu_item_id"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                required
              >
                <option value="">Select Menu Item</option>
                <option
                  v-for="item in availableMenuItems"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.item_name }} ({{ item.category }})
                </option>
              </select>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Assigned To</span
                >
              </label>
              <select
                v-model="sampleForm.assigned_to"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              >
                <option value="">Select Staff Member</option>
                <option
                  v-for="staff in staffMembers"
                  :key="staff.id"
                  :value="staff.id"
                >
                  {{ staff.name }} ({{ staff.role }})
                </option>
              </select>
            </div>
          </div>

          <!-- Production Details -->
          <div
            class="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Batch Size <span class="text-red-500">*</span></span
                >
              </label>
              <input
                v-model.number="sampleForm.batch_size"
                type="number"
                min="1"
                max="50"
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                placeholder="10"
                required
              />
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Unit</span
                >
              </label>
              <select
                v-model="sampleForm.batch_unit"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              >
                <option value="servings">Servings</option>
                <option value="pieces">Pieces</option>
                <option value="kg">Kilograms</option>
                <option value="liters">Liters</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Priority</span
                >
              </label>
              <select
                v-model="sampleForm.priority"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <!-- Schedule Information -->
          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Scheduled Date <span class="text-red-500">*</span></span
                >
              </label>
              <input
                v-model="sampleForm.scheduled_date"
                type="date"
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                :min="new Date().toISOString().split('T')[0]"
                required
              />
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Scheduled Time</span
                >
              </label>
              <input
                v-model="sampleForm.scheduled_time"
                type="time"
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              />
            </div>
          </div>

          <!-- Cost & Notes Information -->
          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Estimated Cost</span
                >
              </label>
              <input
                v-model="sampleForm.estimated_cost"
                type="number"
                step="0.01"
                min="0"
                class="input input-sm sm:input-md input-bordered w-full bg-gray-50 text-black/70"
                placeholder="0.00"
                readonly
              />
              <div class="text-xs text-black/40 mt-2">
                Auto-calculated based on menu item cost and batch size
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Production Notes</span
                >
              </label>
              <textarea
                v-model="sampleForm.production_notes"
                class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                rows="3"
                placeholder="Any special instructions or notes for production..."
              ></textarea>
            </div>
          </div>

          <!-- Ingredient Availability Preview -->
          <div
            v-if="sampleForm.menu_item_id"
            class="bg-blue-50 border border-blue-200 p-4 rounded-xl"
          >
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-semibold text-blue-800">
                <font-awesome-icon icon="fa-solid fa-box" />
                Ingredient Availability Check
              </h4>
              <div class="flex items-center gap-2">
                <button
                  v-if="!checkingAvailability && ingredientAvailability"
                  @click="
                    checkIngredientAvailability(
                      availableMenuItems.find(
                        (item) => item.id === sampleForm.menu_item_id
                      )
                    )
                  "
                  class="btn btn-xs btn-ghost text-blue-600 hover:bg-blue-100"
                  title="Refresh availability"
                >
                  <RefreshCcw class="w-3 h-3" />
                </button>
                <div
                  v-if="checkingAvailability"
                  class="flex items-center text-sm text-blue-600"
                >
                  <RefreshCcw class="w-4 h-4 mr-1 animate-spin" />
                  Checking availability...
                </div>
              </div>
            </div>

            <div v-if="ingredientAvailability" class="space-y-4">
              <!-- Summary -->
              <div class="grid grid-cols-3 gap-4 text-sm">
                <div class="text-center">
                  <div class="text-2xl font-bold text-blue-800">
                    {{ ingredientAvailability.total_ingredients }}
                  </div>
                  <div class="text-xs text-blue-600">Total Ingredients</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600">
                    {{ ingredientAvailability.available_ingredients }}
                  </div>
                  <div class="text-xs text-green-600">Available</div>
                </div>
                <div class="text-center">
                  <div
                    class="text-2xl font-bold"
                    :class="
                      ingredientAvailability.sufficient_for_production
                        ? 'text-green-600'
                        : 'text-red-600'
                    "
                  >
                    {{
                      ingredientAvailability.sufficient_for_production
                        ? 'Ready'
                        : 'Issues'
                    }}
                  </div>
                  <div class="text-xs text-gray-600">Status</div>
                </div>
              </div>

              <!-- Detailed Ingredient Breakdown -->
              <div class="border-t border-blue-200 pt-4">
                <div class="text-sm font-medium text-blue-800 mb-3">
                  <font-awesome-icon icon="fa-solid fa-clipboard" />
                  Ingredient Details:
                </div>
                <div class="space-y-3 max-h-96 overflow-y-auto">
                  <div
                    v-for="ingredient in ingredientAvailability.ingredients"
                    :key="ingredient.ingredient_name"
                    class="p-3 rounded-lg border border-primaryColor/10 bg-white/50"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="font-medium text-sm text-primaryColor mb-1">
                          {{ ingredient.ingredient_name }}
                        </div>
                        <div class="text-xs text-gray-600 mb-2">
                          <span class="font-medium">Required:</span>
                          <span class="text-primaryColor font-semibold ml-1">
                            {{ formatQuantity(ingredient.required_quantity) }}
                            {{ ingredient.unit }}
                          </span>
                          <span class="mx-2">•</span>
                          <span class="font-medium">Available:</span>
                          <span
                            class="font-semibold ml-1"
                            :class="
                              ingredient.is_available
                                ? 'text-success'
                                : 'text-error'
                            "
                          >
                            {{ formatQuantity(ingredient.available_quantity) }}
                            {{ ingredient.unit }}
                          </span>
                        </div>
                        <div class="text-xs text-gray-600">
                          <span class="font-medium"
                            >Cost per {{ ingredient.unit }}:</span
                          >
                          <span class="font-semibold ml-1">
                            ₱{{ formatCurrency(ingredient.cost_per_unit) }}
                          </span>
                          <span class="ml-2">•</span>
                          <span class="font-medium">Total:</span>
                          <span class="font-semibold ml-1 text-primaryColor">
                            ₱{{
                              formatCurrency(
                                ingredient.required_quantity *
                                  ingredient.cost_per_unit
                              )
                            }}
                          </span>
                        </div>
                      </div>

                      <div class="flex flex-col items-end gap-2">
                        <!-- Status Badge -->
                        <div
                          class="badge text-xs"
                          :class="{
                            'badge-success border-none text-success bg-success/20':
                              ingredient.available_quantity >=
                              ingredient.required_quantity,
                            'badge-warning border-none text-warning bg-warning/20':
                              ingredient.available_quantity > 0 &&
                              ingredient.available_quantity <
                                ingredient.required_quantity,
                            'badge-error border-none text-error bg-error/20':
                              ingredient.available_quantity <= 0,
                          }"
                        >
                          {{
                            ingredient.available_quantity >=
                            ingredient.required_quantity
                              ? 'Sufficient'
                              : ingredient.available_quantity <= 0
                                ? 'Out of Stock'
                                : 'Insufficient'
                          }}
                        </div>

                        <!-- Shortage Info -->
                        <div
                          v-if="
                            ingredient.available_quantity <
                            ingredient.required_quantity
                          "
                          class="text-xs text-error"
                        >
                          Short by
                          <span class="font-semibold">
                            {{
                              formatQuantity(
                                ingredient.required_quantity -
                                  ingredient.available_quantity
                              )
                            }}
                            {{ ingredient.unit }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Insufficient ingredients summary -->
              <div
                v-if="!ingredientAvailability.sufficient_for_production"
                class="bg-red-50 border border-red-200 p-3 rounded-lg"
              >
                <div class="text-sm font-medium text-red-800 mb-2">
                  ⚠️ Issues Found:
                </div>
                <div class="text-xs text-red-700">
                  {{
                    ingredientAvailability.total_ingredients -
                    ingredientAvailability.available_ingredients
                  }}
                  out of
                  {{ ingredientAvailability.total_ingredients }} ingredients are
                  insufficient for production.
                </div>
              </div>

              <!-- Production readiness status -->
              <div
                class="flex items-center justify-between pt-3 border-t border-blue-200"
              >
                <span class="text-sm text-blue-700 font-medium"
                  >Production Ready:</span
                >
                <span
                  class="badge"
                  :class="
                    ingredientAvailability.sufficient_for_production
                      ? 'badge-success'
                      : 'badge-error'
                  "
                >
                  {{
                    ingredientAvailability.sufficient_for_production
                      ? 'Yes'
                      : 'No'
                  }}
                </span>
              </div>
            </div>

            <div
              v-else-if="!checkingAvailability"
              class="text-center text-blue-600 py-4"
            >
              <Package class="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div class="text-sm">
                Select a menu item to check ingredient availability
              </div>
            </div>
          </div>

          <div class="modal-action">
            <button type="button" @click="closeEditModal" class="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              <Edit class="w-4 h-4 mr-2" v-if="!loading" />
              <RefreshCcw class="w-4 h-4 mr-2 animate-spin" v-else />
              Update Sample Production
            </button>
          </div>
        </form>
      </div>
    </dialog>

    <!-- Sample Production Details Modal -->
    <dialog
      id="sample_details_modal"
      class="modal"
      :class="{ 'modal-open': showDetailsModal }"
    >
      <div v-if="selectedSample" class="modal-box max-w-4xl">
        <h3 class="font-bold text-lg text-primaryColor mb-4">
          Sample Production Details
        </h3>

        <div class="space-y-6">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 class="font-semibold text-primaryColor mb-3">
                Production Information
              </h4>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-600">Batch Number:</span>
                  <span class="font-medium">{{
                    selectedSample?.sample_batch_number || 'N/A'
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Menu Item:</span>
                  <span class="font-medium">{{
                    selectedSample?.item_name || 'N/A'
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Recipe:</span>
                  <span class="font-medium">{{
                    selectedSample?.recipe_name || 'N/A'
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Batch Size:</span>
                  <span class="font-medium"
                    >{{ selectedSample?.batch_size || 'N/A' }}
                    {{ selectedSample?.batch_unit || '' }}</span
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Status:</span>
                  <span
                    class="badge"
                    :class="getStatusBadgeClass(selectedSample?.status || '')"
                  >
                    {{ selectedSample?.status || 'N/A' }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Priority:</span>
                  <span
                    v-if="selectedSample?.priority"
                    class="badge"
                    :class="getPriorityBadgeClass(selectedSample.priority)"
                  >
                    {{ selectedSample.priority }}
                  </span>
                  <span v-else class="text-gray-400">Not set</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Estimated Cost:</span>
                  <span class="font-medium text-info">
                    {{ formatCurrency(selectedSample?.estimated_cost || 0) }}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 class="font-semibold text-primaryColor mb-3">
                Schedule & Assignment
              </h4>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-600">Scheduled Date:</span>
                  <span class="font-medium">{{
                    formatDate(selectedSample?.scheduled_date)
                  }}</span>
                </div>
                <div
                  v-if="selectedSample?.scheduled_time"
                  class="flex justify-between"
                >
                  <span class="text-gray-600">Scheduled Time:</span>
                  <span class="font-medium">{{
                    formatTime(selectedSample.scheduled_time)
                  }}</span>
                </div>
                <div
                  v-if="selectedSample?.actual_start_date"
                  class="flex justify-between"
                >
                  <span class="text-gray-600">Started:</span>
                  <span class="font-medium">{{
                    formatDate(selectedSample.actual_start_date)
                  }}</span>
                </div>
                <div
                  v-if="selectedSample?.actual_end_date"
                  class="flex justify-between"
                >
                  <span class="text-gray-600">Completed:</span>
                  <span class="font-medium">{{
                    formatDate(selectedSample.actual_end_date)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Assigned To:</span>
                  <span class="font-medium">{{
                    selectedSample?.assigned_to_name || 'Unassigned'
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Priority & Cost Information -->
          <div class="bg-yellow-50 p-4 rounded-lg">
            <h4 class="font-semibold text-primaryColor mb-3">
              Priority & Cost Information
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="flex justify-between mb-2">
                  <span class="text-gray-600">Priority:</span>
                  <span
                    v-if="selectedSample?.priority"
                    class="badge"
                    :class="getPriorityBadgeClass(selectedSample.priority)"
                  >
                    {{ selectedSample.priority }}
                  </span>
                  <span v-else class="text-gray-400">Not set</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Estimated Cost:</span>
                  <span class="font-medium text-info">
                    {{ formatCurrency(selectedSample?.estimated_cost || 0) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Production Notes -->
          <div
            v-if="selectedSample?.production_notes"
            class="bg-gray-50 p-4 rounded-lg"
          >
            <h4 class="font-semibold text-primaryColor mb-2">
              Production Notes
            </h4>
            <p class="text-gray-700">{{ selectedSample.production_notes }}</p>
          </div>

          <!-- Ingredient Availability Status -->
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-semibold text-primaryColor mb-3">
              Ingredient Availability Status
            </h4>

            <div
              v-if="selectedSample?.ingredient_availability"
              class="space-y-3"
            >
              <!-- Real-time availability data -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-primaryColor">
                    {{
                      selectedSample.ingredient_availability.total_ingredients
                    }}
                  </div>
                  <div class="text-sm text-gray-600">Total Ingredients</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-success">
                    {{
                      selectedSample.ingredient_availability
                        .available_ingredients
                    }}
                  </div>
                  <div class="text-sm text-gray-600">Available</div>
                </div>
                <div class="text-center">
                  <div
                    class="text-2xl font-bold"
                    :class="
                      selectedSample.ingredient_availability
                        .sufficient_for_production
                        ? 'text-success'
                        : 'text-error'
                    "
                  >
                    {{
                      selectedSample.ingredient_availability
                        .sufficient_for_production
                        ? 'Ready'
                        : 'Issues'
                    }}
                  </div>
                  <div class="text-sm text-gray-600">Status</div>
                </div>
              </div>

              <!-- Show insufficient ingredients if any -->
              <div
                v-if="
                  !selectedSample.ingredient_availability
                    .sufficient_for_production &&
                  selectedSample.ingredient_availability
                    .insufficient_ingredients?.length > 0
                "
              >
                <div class="text-sm font-medium text-error mb-2">
                  Issues Found:
                </div>
                <div class="space-y-1">
                  <div
                    v-for="ingredient in selectedSample.ingredient_availability
                      .insufficient_ingredients"
                    :key="ingredient.ingredient_name"
                    class="flex justify-between text-xs bg-red-50 p-2 rounded"
                  >
                    <span>{{ ingredient.ingredient_name }}</span>
                    <span class="text-error">
                      Need {{ ingredient.required_quantity }}
                      {{ ingredient.unit }}, have
                      {{ ingredient.available_quantity }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Availability details -->
              <div
                v-if="selectedSample.ingredient_availability?.ingredients"
                class="mt-3"
              >
                <div class="text-sm font-medium text-gray-700 mb-2">
                  Ingredient Details:
                </div>
                <div class="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  <div
                    v-for="ingredient in selectedSample.ingredient_availability
                      .ingredients"
                    :key="ingredient.ingredient_name"
                    class="flex justify-between items-center text-xs bg-white p-2 rounded border"
                  >
                    <span class="font-medium">{{
                      ingredient.ingredient_name
                    }}</span>
                    <div class="flex items-center gap-2">
                      <span
                        :class="
                          ingredient.is_available
                            ? 'text-success'
                            : 'text-error'
                        "
                      >
                        {{ ingredient.available_quantity }}/{{
                          ingredient.required_quantity
                        }}
                        {{ ingredient.unit }}
                      </span>
                      <span
                        class="badge badge-xs"
                        :class="
                          ingredient.is_available
                            ? 'badge-success'
                            : 'badge-error'
                        "
                      >
                        {{ ingredient.is_available ? 'OK' : 'Low' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-center text-gray-500 py-4">
              <AlertCircle class="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div class="text-sm">Availability data not available</div>
            </div>
          </div>

          <!-- Quality Inspection Status -->
          <div
            v-if="
              selectedSample?.quality_inspections &&
              selectedSample.quality_inspections.length > 0
            "
            class="bg-green-50 p-4 rounded-lg"
          >
            <h4 class="font-semibold text-primaryColor mb-3">
              Quality Inspection Results
            </h4>
            <div class="space-y-2">
              <div
                v-for="inspection in selectedSample.quality_inspections"
                :key="inspection.id"
                class="flex items-center justify-between p-3 bg-white rounded"
              >
                <div>
                  <div class="font-medium">
                    {{ inspection.inspection_type }}
                  </div>
                  <div class="text-sm text-gray-600">
                    {{ formatDate(inspection.inspection_date) }} by
                    {{ inspection.inspector_name }}
                  </div>
                </div>
                <div class="text-right">
                  <span
                    class="badge"
                    :class="
                      inspection.result === 'Pass'
                        ? 'badge-success'
                        : inspection.result === 'Fail'
                          ? 'badge-error'
                          : 'badge-warning'
                    "
                  >
                    {{ inspection.result }}
                  </span>
                  <div
                    v-if="inspection.overall_quality_score"
                    class="text-sm text-gray-600 mt-1"
                  >
                    Score: {{ inspection.overall_quality_score }}/10
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button @click="closeDetailsModal" class="btn btn-ghost">
            Close
          </button>
          <button
            v-if="
              selectedSample?.status === 'Planned' &&
              canStartProduction(selectedSample)
            "
            @click="startSampleProduction(selectedSample.id)"
            class="btn btn-success"
          >
            <Play class="w-4 h-4 mr-2" />
            Start Production
          </button>
        </div>
      </div>
    </dialog>

    <!-- Confirmation Modal -->
    <dialog
      id="sample_confirmation_modal"
      class="modal"
      :class="{ 'modal-open': confirmModal.show }"
    >
      <div class="modal-box max-w-sm">
        <h3 class="font-bold text-lg text-primaryColor mb-4">
          {{ confirmModal.title }}
        </h3>
        <p class="text-gray-700 mb-4">{{ confirmModal.message }}</p>
        <div class="modal-action">
          <button @click="confirmModal.onConfirm" class="btn btn-primary">
            Yes
          </button>
          <button @click="closeConfirmModal" class="btn btn-ghost">No</button>
        </div>
      </div>
    </dialog>

    <!-- Toast -->
    <div v-if="toast.show" class="toast toast-top toast-end">
      <div class="alert alert-{{ toast.type }}">
        <span>{{ toast.message }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .text-shadow-xs {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
</style>
