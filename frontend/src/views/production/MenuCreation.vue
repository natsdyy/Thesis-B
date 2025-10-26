<script setup>
  import { ref, computed, onMounted, watch, nextTick } from 'vue';
  import {
    ChefHat,
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
    PhilippinePeso,
    Users,
    BarChart3,
    Star,
    X,
    ChevronDown,
    ChevronUp,
    EllipsisVertical,
    Shield,
  } from 'lucide-vue-next';
  import { useRouter } from 'vue-router';
  import { useProductionStore } from '../../stores/productionStore.js';
  import { recipeCategories } from '../../config/productionCategories.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import { useUserStore } from '../../stores/userStore.js';
  import { apiConfig, formatImageUrl } from '../../config/api.js';
  import {
    getCurrentPhilippineTime,
    formatForAPI,
    parseFromAPI,
  } from '../../utils/timezoneUtils.js';

  const productionStore = useProductionStore();
  const authStore = useAuthStore();
  const userStore = useUserStore();
  const router = useRouter();

  // Reactive state
  const activeTab = ref('overview');
  const searchQuery = ref('');
  const categoryFilter = ref('');
  const statusFilter = ref('');
  const showCreateModal = ref(false);
  const confirmModal = ref({
    show: false,
    type: '',
    title: '',
    message: '',
    item: null,
    onConfirm: null,
  });
  const approveModal = ref({
    show: false,
    item: null,
    requireQualityCheck: false,
    approvalReason: '',
  });
  const showDetailsModal = ref(false);
  const selectedMenuItem = ref(null);
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const expandedItems = ref(new Set());

  // Form data
  const menuItemForm = ref({
    item_name: '',
    recipe_id: null,
    menu_id: null,
    description: '',
    category: '',
    selling_price: null,
    preparation_time_minutes: null,
    // serving_size: 1, // Always 1 for customer portion
    serving_unit: 'serving',
    tags: '',
    // Promo discount fields
    has_promo_discount: false,
    promo_minimum_quantity: null,
    promo_discount_percentage: null,
    promo_discount_amount: null,
    promo_discount_type: 'percentage',
    promo_description: '',
    promo_start_date: '',
    promo_end_date: '',
  });

  // Hybrid approach: Menu assignment strategy
  const menuAssignmentOption = ref('auto'); // Default to auto-create
  const availableMenus = ref([]); // Available menus for selected category

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const menus = computed(() => productionStore.menus);
  const menuItems = computed(() => productionStore.menuItems);
  const recipeCostInfo = ref({ totalCost: null, costPerServing: null });
  const imageFile = ref(null);
  const imagePreviewUrl = ref(null);
  const imageInput = ref(null);
  // categories imported from config
  const availableRecipes = computed(() => {
    // Use recipes from the store, filtered by active status and not yet used in menu items
    const activeRecipes = productionStore.recipes.filter(
      (recipe) => recipe.is_active
    );

    // Get recipe IDs that are already used in menu items
    const usedRecipeIds = new Set(
      menuItems.value
        .filter((item) => item.recipe_id && !item.deleted_at) // Only non-deleted menu items
        .filter((item) => {
          // In edit mode, exclude the current item being edited from the used recipes
          if (
            menuItemForm.value.isEditing &&
            menuItemForm.value.editingItemId
          ) {
            return item.id !== menuItemForm.value.editingItemId;
          }
          return true;
        })
        .map((item) => item.recipe_id)
    );

    // Filter out recipes that are already used in menu items
    return activeRecipes.filter((recipe) => !usedRecipeIds.has(recipe.id));
  });

  // Computed property to show used recipes for reference
  const usedRecipes = computed(() => {
    const activeRecipes = productionStore.recipes.filter(
      (recipe) => recipe.is_active
    );
    const usedRecipeIds = new Set(
      menuItems.value
        .filter((item) => item.recipe_id && !item.deleted_at)
        .filter((item) => {
          // In edit mode, exclude the current item being edited from the used recipes
          if (
            menuItemForm.value.isEditing &&
            menuItemForm.value.editingItemId
          ) {
            return item.id !== menuItemForm.value.editingItemId;
          }
          return true;
        })
        .map((item) => item.recipe_id)
    );
    return activeRecipes.filter((recipe) => usedRecipeIds.has(recipe.id));
  });

  // Computed property to get current recipe for edit mode
  const currentRecipe = computed(() => {
    if (menuItemForm.value.recipe_id) {
      return productionStore.recipes.find(
        (recipe) => recipe.id === menuItemForm.value.recipe_id
      );
    }
    return null;
  });

  // Structured Tag Selection (for DSS readiness)
  const tagGroups = [
    {
      label: 'Popularity',
      tags: [
        { key: 'popular', description: 'Best-selling items' },
        { key: 'low-demand', description: 'Not frequently ordered' },
        { key: 'new', description: 'Newly added item' },
      ],
    },
    {
      label: 'Seasonality',
      tags: [
        { key: 'summer', description: 'Preferred during hot months (Mar–May)' },
        {
          key: 'rainy',
          description: 'Comfort food for rainy season (Jun–Oct)',
        },
        { key: 'christmas', description: 'Holiday items (Nov–Dec)' },
        { key: 'all-season', description: 'Ordered consistently year-round' },
      ],
    },
    {
      label: 'Category / Protein',
      tags: [
        { key: 'pork' },
        { key: 'beef' },
        { key: 'chicken' },
        { key: 'fish' },
        { key: 'vegetarian' },
      ],
    },
    {
      label: 'Special',
      tags: [
        { key: 'signature', description: 'House specialty' },
        { key: 'group-meal', description: 'Good for sharing / platters' },
        { key: 'quick-serve', description: 'Fast prep (ready-to-serve)' },
      ],
    },
  ];

  const selectedTags = ref([]);

  const parseTagsStringToArray = (value) => {
    if (!value) return [];
    return String(value)
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  };

  // Keep form tags string in sync with selected tags
  watch(
    selectedTags,
    (newVal) => {
      menuItemForm.value.tags = newVal.join(', ');
    },
    { deep: true }
  );

  // Computed properties
  const menuStats = computed(() => productionStore.menuStats);
  const menuItemStats = computed(() => productionStore.menuItemStats);

  // Debug computed property to see filtered items
  const debugMenuItems = computed(() => {
    console.log('Total menu items:', menuItems.value.length);
    console.log('Current status filter:', statusFilter.value);
    console.log('Current category filter:', categoryFilter.value);
    console.log('Current search query:', searchQuery.value);
    console.log('Menu item data:', menuItems.value[0]);
    return menuItems.value;
  });

  // Dynamic categories from available recipes
  const availableCategories = computed(() => {
    const categories = new Set();
    availableRecipes.value.forEach((recipe) => {
      if (recipe.category && recipe.category.trim()) {
        categories.add(recipe.category.trim());
      }
    });
    return Array.from(categories).sort();
  });

  // Get selected recipe for form display
  const selectedRecipe = computed(() => {
    if (!menuItemForm.value.recipe_id) return null;
    return availableRecipes.value.find(
      (r) => r.id == menuItemForm.value.recipe_id
    );
  });

  const filteredMenuItems = computed(() => {
    let filtered = menuItems.value;
    console.log('Starting with', filtered.length, 'menu items');

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.item_name.toLowerCase().includes(query) ||
          item.item_code?.toLowerCase().includes(query) ||
          item.recipe_name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
      console.log('After search filter:', filtered.length, 'items');
    }

    if (categoryFilter.value) {
      filtered = filtered.filter(
        (item) => item.category === categoryFilter.value
      );
      console.log('After category filter:', filtered.length, 'items');
    }

    // Status filtering - client-side
    if (statusFilter.value) {
      if (statusFilter.value === 'available') {
        filtered = filtered.filter((item) => item.is_available === true);
      } else if (statusFilter.value === 'draft') {
        filtered = filtered.filter((item) => item.is_available === false);
      } else if (statusFilter.value === 'quality_passed') {
        filtered = filtered.filter((item) => item.passed_inspections > 0);
      } else if (statusFilter.value === 'inspection_pending') {
        filtered = filtered.filter(
          (item) =>
            item.quality_inspections_count > 0 && item.passed_inspections === 0
        );
      } else if (statusFilter.value === 'deleted') {
        // For deleted items, we already fetched only deleted items from backend
        // So we don't need to filter further - all items in the array are deleted
        console.log('Showing deleted items (already filtered by backend)');
      }
      console.log('After status filter:', filtered.length, 'items');
    }

    console.log('Final filtered items:', filtered.length);
    return filtered.sort((a, b) => a.item_name.localeCompare(b.item_name));
  });

  const paginatedMenuItems = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return filteredMenuItems.value.slice(start, start + itemsPerPage.value);
  });

  const totalPages = computed(() => {
    return Math.ceil(filteredMenuItems.value.length / itemsPerPage.value);
  });

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const getStatusBadgeClass = (isAvailable) => {
    return isAvailable
      ? 'badge-sm border-none font-medium bg-success/20 text-success'
      : 'badge-sm border-none font-medium bg-warning/20 text-warning';
  };

  const getStatusText = (isAvailable) => {
    return isAvailable ? 'Available' : 'Draft';
  };

  const calculateProfitMargin = (sellingPrice, costPrice) => {
    if (!costPrice || costPrice === 0) return 0;
    return Math.round(((sellingPrice - costPrice) / costPrice) * 100);
  };

  const resetForm = () => {
    menuItemForm.value = {
      item_name: '',
      recipe_id: null,
      menu_id: null,
      description: '',
      category: '',
      selling_price: null,
      preparation_time_minutes: null,
      // serving_size: 1, // Always 1 for customer portion
      serving_unit: 'serving',
      tags: '',
      image_url: '', // Reset image URL
      isEditing: false, // Reset editing flags
      editingItemId: null,
      // Promo discount fields
      has_promo_discount: false,
      promo_minimum_quantity: null,
      promo_discount_percentage: null,
      promo_discount_amount: null,
      promo_discount_type: 'percentage',
      promo_description: '',
      promo_start_date: '',
      promo_end_date: '',
    };
    menuAssignmentOption.value = 'auto'; // Reset to default
    availableMenus.value = []; // Clear available menus
    selectedTags.value = [];
  };

  // Methods
  const fetchMenuItems = async () => {
    // Fetch menu items based on current status filter
    const filters = {};

    if (statusFilter.value === 'deleted') {
      filters.only_deleted = true;
      console.log('Fetching deleted menu items');
    } else {
      // For all other filters, fetch non-deleted items and filter client-side
      console.log('Fetching non-deleted menu items for client-side filtering');
    }

    await productionStore.fetchMenuItems(filters);
  };

  const fetchData = async () => {
    try {
      await Promise.all([
        productionStore.fetchMenus(),
        fetchMenuItems(),
        productionStore.fetchRecipes(), // This will populate recipes.value in the store
        productionStore.fetchMenuStats(),
        productionStore.fetchMenuItemStats(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const openCreateModal = async () => {
    // Only reset form if we're not in edit mode
    if (!menuItemForm.value.isEditing) {
      resetForm();
    }
    // Ensure recipes are loaded so the Select Recipe is populated
    try {
      await productionStore.fetchRecipes();
    } catch (e) {
      console.warn('Failed to fetch recipes:', e);
    }
    showCreateModal.value = true;
    // Wait for dialog to mount before calling showModal to avoid double-click
    await nextTick();
    document.getElementById('menu_item_modal')?.showModal();

    // Ensure selectedTags reflects any pre-filled tags when opening modal
    selectedTags.value = parseTagsStringToArray(menuItemForm.value.tags);
  };

  const closeCreateModal = () => {
    showCreateModal.value = false;
    document.getElementById('menu_item_modal')?.close();
    // Reset form and clear editing flags
    resetForm();
    if (imagePreviewUrl.value) {
      URL.revokeObjectURL(imagePreviewUrl.value);
    }
    imageFile.value = null;
    imagePreviewUrl.value = null;
  };

  const openDetailsModal = (item) => {
    selectedMenuItem.value = item;
    showDetailsModal.value = true;
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedMenuItem.value = null;
  };

  const openEditModal = async (item) => {
    // Reset form first
    resetForm();

    console.log('Opening edit modal for item:', item);
    console.log('Item image_url:', item.image_url);

    // Populate form with item data
    let imageUrl = item.image_url || '';
    // Convert relative image path to full URL if needed
    if (imageUrl) {
      imageUrl = formatImageUrl(imageUrl);
      console.log('Constructed image URL:', imageUrl); // Debug log
    }

    menuItemForm.value = {
      item_name: item.item_name || item.menu_item_name || '',
      recipe_id: item.recipe_id || '',
      menu_id: item.menu_id || null,
      description: item.description || '',
      category: item.category || '',
      selling_price: item.selling_price || null,
      preparation_time_minutes: item.preparation_time_minutes || null,
      serving_unit: item.serving_unit || 'serving',
      tags: item.tags || '',
      image_url: imageUrl,
      // Promo discount fields
      has_promo_discount: item.has_promo_discount || false,
      promo_minimum_quantity: item.promo_minimum_quantity || null,
      promo_discount_percentage: item.promo_discount_percentage || null,
      promo_discount_amount: item.promo_discount_amount || null,
      promo_discount_type: item.promo_discount_type || 'percentage',
      promo_description: item.promo_description || '',
      promo_start_date: item.promo_start_date || '',
      promo_end_date: item.promo_end_date || '',
    };

    // Initialize seasonal/standard tag selection from existing tags
    selectedTags.value = parseTagsStringToArray(menuItemForm.value.tags);

    // Set editing mode
    menuItemForm.value.isEditing = true;
    menuItemForm.value.editingItemId = item.id;

    // Populate cost info from the current recipe
    if (menuItemForm.value.recipe_id) {
      const recipe = productionStore.recipes.find(
        (r) => r.id === menuItemForm.value.recipe_id
      );
      if (recipe) {
        const totalCost = Number(recipe.total_estimated_cost) || 0;
        const costPerServing = Number(recipe.cost_per_batch) || 0;

        recipeCostInfo.value = {
          totalCost: totalCost,
          costPerServing: costPerServing,
        };
      }
    }

    console.log('Form populated with:', menuItemForm.value);

    // Open the create modal (which will now act as edit modal)
    await openCreateModal();
  };

  // Confirmation modal methods
  const openConfirmModal = (type, item) => {
    const configs = {
      create: {
        title: 'Create Menu Item',
        message: `Are you sure you want to create menu item "${item?.menu_item_name || 'Untitled'}"?`,
        onConfirm: () => saveMenuItem(),
      },
      update: {
        title: 'Update Menu Item',
        message: `Are you sure you want to update "${item?.menu_item_name}"?`,
        onConfirm: () => saveMenuItem(),
      },
      delete: {
        title: 'Delete Menu Item',
        message: `Are you sure you want to delete "${item?.menu_item_name}"? This action cannot be undone.`,
        onConfirm: () => handleDeleteMenuItem(item),
      },
      restore: {
        title: 'Restore Menu Item',
        message: `Are you sure you want to restore "${item?.menu_item_name}"? It will be available again.`,
        onConfirm: () => handleRestoreMenuItem(item),
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

  const openApproveModal = (item) => {
    // If item has already passed quality inspection, auto-approve directly
    const hasPassedInspection = item.passed_inspections > 0;

    approveModal.value = {
      show: true,
      item: item,
      requireQualityCheck: !hasPassedInspection, // Only require if not already passed
      approvalReason: '',
    };
  };

  const closeApproveModal = () => {
    approveModal.value = {
      show: false,
      item: null,
      requireQualityCheck: false,
      approvalReason: '',
    };
  };

  const handleApproval = async () => {
    const item = approveModal.value.item;

    if (approveModal.value.requireQualityCheck) {
      // Navigate to quality inspection first
      closeApproveModal();
      createQualityInspection(item);
      showToast('info', 'Please complete quality inspection before approval');
      return;
    }

    try {
      await productionStore.approveMenuItemForProduction(item.id);
      showToast(
        'success',
        `${item.item_name} approved for production successfully`
      );
      closeApproveModal();
      // No need to fetchMenuItems() - store is already updated
    } catch (error) {
      showToast('error', error.message || 'Failed to approve menu item');
    }
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

  const saveMenuItem = async () => {
    try {
      const formData = { ...menuItemForm.value };

      // Different validation for create vs edit
      if (formData.isEditing) {
        // For editing, validate editable fields
        if (!formData.item_name?.trim()) {
          showToast('error', 'Please enter menu item name');
          return;
        }
        if (!formData.selling_price) {
          showToast('error', 'Please enter selling price');
          return;
        }
      } else {
        // For creating, validate all required fields
        if (!formData.recipe_id) {
          showToast('error', 'Please select a recipe from the dropdown');
          return;
        }

        if (!formData.item_name?.trim()) {
          showToast('error', 'Please enter a menu item name');
          return;
        }

        // Validate recipe_id is a valid number
        const recipeIdNum = Number(formData.recipe_id);
        if (!Number.isFinite(recipeIdNum) || recipeIdNum <= 0) {
          showToast('error', 'Invalid recipe selected');
          return;
        }

        // Ensure category is set (should come from recipe)
        if (!formData.category?.trim()) {
          showToast('error', 'Recipe category is required');
          return;
        }
      }

      // Simplified menu assignment logic (only for create mode)
      if (!formData.isEditing) {
        if (menuExistsForCategory(formData.category)) {
          // Use existing menu - find and set the menu_id
          const existingMenu = menus.value?.find?.(
            (m) =>
              (m.category || '').toLowerCase() ===
              (formData.category || '').toLowerCase()
          );
          if (existingMenu) {
            formData.menu_id = existingMenu.id;
          } else {
            showToast('error', 'Existing menu not found for this category');
            return;
          }
        } else {
          // Create new menu - set menu_id to null to let backend handle it
          formData.menu_id = null;
        }
      }

      // Convert null values to appropriate defaults for backend
      if (formData.selling_price === null) formData.selling_price = '';

      // Auto-populate item name if empty
      if (!formData.item_name && formData.recipe_id) {
        const selectedRecipe = availableRecipes.value.find(
          (r) => r.id == formData.recipe_id
        );
        if (selectedRecipe) {
          formData.item_name = selectedRecipe.recipe_name;
        }
      }
      // Build payload; if image present, send multipart
      let payload = formData;
      if (imageFile.value) {
        const fd = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          // Handle null values and empty date strings properly for FormData
          if (value !== undefined && value !== null) {
            // Skip empty date strings that would cause PostgreSQL errors
            if (
              (key === 'promo_start_date' || key === 'promo_end_date') &&
              value.trim() === ''
            ) {
              return; // Skip this field
            }

            // Map item_name to menu_item_name for backend compatibility
            const backendKey = key === 'item_name' ? 'menu_item_name' : key;
            fd.append(backendKey, value);
          } else if (value === null) {
            // For null values, append empty string for string fields or skip for integer fields
            if (
              key === 'selling_price' ||
              key === 'description' ||
              key === 'tags'
            ) {
              fd.append(key, '');
            }
            // Skip null values for integer fields (recipe_id, menu_id, preparation_time_minutes)
          }
        });
        fd.append('image', imageFile.value);
        payload = fd;
      }

      // Check if we're editing or creating
      if (formData.isEditing && formData.editingItemId) {
        // For update, filter to only include editable fields
        let updatePayload = payload;

        if (imageFile.value) {
          // If image is being updated, use FormData
          updatePayload = payload;
        } else {
          // For updates without image, create filtered object with only editable fields
          updatePayload = {
            menu_item_name: formData.item_name, // Map item_name to menu_item_name for backend
            selling_price: formData.selling_price,
            preparation_time_minutes: formData.preparation_time_minutes,
            description: formData.description,
            tags: formData.tags,
            // Promo discount fields
            has_promo_discount: formData.has_promo_discount,
            promo_minimum_quantity: formData.promo_minimum_quantity,
            promo_discount_percentage: formData.promo_discount_percentage,
            promo_discount_amount: formData.promo_discount_amount,
            promo_discount_type: formData.promo_discount_type,
            promo_description: formData.promo_description,
            // Only include date fields if they have actual values (not empty strings)
            ...(formData.promo_start_date &&
              formData.promo_start_date.trim() !== '' && {
                promo_start_date: formData.promo_start_date,
              }),
            ...(formData.promo_end_date &&
              formData.promo_end_date.trim() !== '' && {
                promo_end_date: formData.promo_end_date,
              }),
          };
        }

        await productionStore.updateMenuItem(
          formData.editingItemId,
          updatePayload
        );
        showToast('success', 'Menu item updated successfully');
      } else {
        // Create new item
        await productionStore.createMenuItem(payload);
        showToast('success', 'Menu item created successfully');
      }

      closeCreateModal();
      closeConfirmModal(); // Close the confirmation modal as well
      await fetchMenuItems(); // Refresh the list

      // Also refresh production inventory to sync changes
      await productionStore.forceRefreshProductionInventory();
    } catch (error) {
      // Handle specific error messages from backend
      let errorMessage = formData.isEditing
        ? 'Failed to update menu item'
        : 'Failed to create menu item';

      if (error.message) {
        if (error.message.includes('Recipe not found')) {
          errorMessage =
            'Selected recipe no longer exists. Please select a different recipe.';
        } else if (error.message.includes('inactive recipe')) {
          errorMessage =
            'Cannot create menu item from inactive recipe. Please select an active recipe.';
        } else if (error.message.includes('Menu not found')) {
          errorMessage =
            'Selected menu category is no longer available. Please try again.';
        } else if (error.message.includes('User not found')) {
          errorMessage =
            'Your user session has expired. Please refresh the page and try again.';
        } else if (error.message.includes('Invalid recipe_id')) {
          errorMessage =
            'Invalid recipe selected. Please select a valid recipe.';
        } else if (error.message.includes('Menu item name is required')) {
          errorMessage = 'Please enter a menu item name.';
        } else {
          errorMessage = error.message;
        }
      }

      showToast('error', errorMessage);
    }
  };

  const showCreateConfirmation = () => {
    if (!menuItemForm.value.recipe_id) {
      showToast('error', 'Please select a recipe');
      return;
    }
    if (!menuItemForm.value.item_name?.trim()) {
      showToast('error', 'Please enter menu item name');
      return;
    }
    if (!menuItemForm.value.category) {
      showToast('error', 'Please select food category');
      return;
    }
    if (!menuItemForm.value.selling_price) {
      showToast('error', 'Please enter selling price');
      return;
    }

    // Open confirmation modal for creating/updating menu item
    const modalType = menuItemForm.value.isEditing ? 'update' : 'create';

    if (modalType === 'update') {
      // For updates, we need to find the original item to pass the full object
      const originalItem = menuItems.value.find(
        (item) => item.id === menuItemForm.value.editingItemId
      );
      console.log('Found original item for update:', originalItem);
      openConfirmModal(modalType, originalItem);
    } else {
      // For creates, just pass the name
      openConfirmModal(modalType, {
        menu_item_name: menuItemForm.value.item_name,
      });
    }
  };

  const approveMenuItem = async (itemId) => {
    if (
      !confirm(
        'Are you sure you want to approve this menu item for production? This will make it available in the production inventory.'
      )
    ) {
      return;
    }

    try {
      await productionStore.approveMenuItemForProduction(itemId);
      showToast('success', 'Menu item approved for production');
    } catch (error) {
      showToast('error', error.message || 'Failed to approve menu item');
    }
  };

  const createQualityInspection = (menuItem) => {
    // Navigate to quality inspection page with pre-selected menu item
    router.push({
      name: 'QualityInspection',
      query: {
        menu_item_id: menuItem.id,
        inspection_type: 'Direct Inspection',
        source: 'menu_creation',
      },
    });
  };

  const handleDeleteMenuItem = async (item) => {
    try {
      console.log('Deleting item:', item.id);
      await productionStore.deleteMenuItem(item.id, authStore.user?.id);
      showToast('success', 'Menu item deleted successfully');

      // Small delay to ensure backend operation completes
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Refresh the menu items list
      console.log('Refreshing menu items after delete');
      await fetchMenuItems();
      console.log('Menu items refreshed');
    } catch (error) {
      console.error('Delete error:', error);
      showToast('error', error.message || 'Failed to delete menu item');
    }
  };

  const handleRestoreMenuItem = async (item) => {
    try {
      await productionStore.restoreMenuItem(item.id, authStore.user?.id);
      showToast('success', 'Menu item restored successfully');
      // Refresh the menu items list
      await fetchMenuItems();
    } catch (error) {
      showToast('error', error.message || 'Failed to restore menu item');
    }
  };

  const handleUpdateMenuItem = async (item) => {
    try {
      // Filter and map form data to valid database fields
      // Preserve original values if form fields are empty/null
      const formData = menuItemForm.value;
      console.log('Form data before update:', formData);
      console.log('Item data before update:', item);

      const updateData = {
        menu_item_name:
          formData.item_name || item.item_name || item.menu_item_name,
        recipe_id: formData.recipe_id || item.recipe_id,
        menu_id:
          formData.menu_id !== null && formData.menu_id !== undefined
            ? formData.menu_id
            : item.menu_id, // Preserve original menu_id if not explicitly set
        description:
          formData.description !== undefined
            ? formData.description
            : item.description,
        category: formData.category || item.category,
        selling_price:
          formData.selling_price !== null &&
          formData.selling_price !== undefined
            ? formData.selling_price
            : item.selling_price,
        preparation_time_minutes:
          formData.preparation_time_minutes !== null &&
          formData.preparation_time_minutes !== undefined
            ? formData.preparation_time_minutes
            : item.preparation_time_minutes,
        serving_unit: formData.serving_unit || item.serving_unit,
        tags: formData.tags !== undefined ? formData.tags : item.tags,
        image_url:
          formData.image_url !== undefined && formData.image_url !== ''
            ? formData.image_url
            : item.image_url,
      };

      console.log('Update data being sent:', updateData);

      await productionStore.updateMenuItem(item.id, updateData);
      showToast('success', 'Menu item updated successfully');
      // Close the modal (no need to refresh - store is already updated)
      closeCreateModal();
    } catch (error) {
      showToast('error', error.message || 'Failed to update menu item');
    }
  };

  const handleRecipeSelection = async (recipeId) => {
    const selectedRecipe = availableRecipes.value.find((r) => r.id == recipeId);
    if (selectedRecipe) {
      // Validate recipe is active
      if (!selectedRecipe.is_active) {
        showToast(
          'warning',
          'Selected recipe is inactive. You may not be able to create a menu item from it.'
        );
      }

      // Validate recipe has required fields
      if (!selectedRecipe.category) {
        showToast(
          'warning',
          'Selected recipe is missing category information.'
        );
      }

      if (!selectedRecipe.batch_size || selectedRecipe.batch_size <= 0) {
        showToast('warning', 'Selected recipe has invalid batch size.');
      }

      menuItemForm.value.item_name = selectedRecipe.recipe_name;
      menuItemForm.value.category = selectedRecipe.category;
      menuItemForm.value.serving_unit = selectedRecipe.batch_unit;
      // Note: serving_size is always 1 for customer portion

      // Simplified menu assignment - automatically handle based on existing menus
      const categoryExists = menuExistsForCategory(selectedRecipe.category);

      if (categoryExists) {
        // Auto-select the existing menu
        const existingMenu = menus.value?.find?.(
          (m) =>
            (m.category || '').toLowerCase() ===
            (selectedRecipe.category || '').toLowerCase()
        );
        if (existingMenu) {
          menuItemForm.value.menu_id = existingMenu.id;
        }
      } else {
        // No menu exists - will auto-create
        menuItemForm.value.menu_id = null;
      }

      // Populate cost info from recipe if available; otherwise fetch full details
      const setCostFromRecipe = (recipe) => {
        if (recipe && (recipe.total_estimated_cost || recipe.cost_per_batch)) {
          const totalCost = Number(
            recipe.total_estimated_cost ?? recipe.cost_per_batch ?? 0
          );
          const perServing = totalCost / Number(recipe.batch_size || 1);
          recipeCostInfo.value = {
            totalCost: isFinite(totalCost) ? totalCost : 0,
            costPerServing: isFinite(perServing) ? perServing : 0,
          };
        } else {
          recipeCostInfo.value = { totalCost: null, costPerServing: null };
        }
      };

      setCostFromRecipe(selectedRecipe);

      if (
        selectedRecipe &&
        selectedRecipe.total_estimated_cost === undefined &&
        productionStore.getRecipeById
      ) {
        productionStore
          .getRecipeById(selectedRecipe.id)
          .then((full) => setCostFromRecipe(full))
          .catch(() => {});
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) {
      imageFile.value = null;
      if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value);
      imagePreviewUrl.value = null;
      return;
    }
    // Basic validation: images up to ~5MB
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select a valid image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Image must be 5MB or smaller');
      return;
    }
    imageFile.value = file;
    if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value);
    imagePreviewUrl.value = URL.createObjectURL(file);
  };

  const clearSelectedImage = () => {
    if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value);
    imagePreviewUrl.value = null;
    imageFile.value = null;
    // Reset the file input so the same file can be re-selected if desired
    if (imageInput.value) {
      imageInput.value.value = '';
    }
  };

  const clearExistingImage = () => {
    // Clear the existing image URL from the form
    menuItemForm.value.image_url = '';
  };

  const handleImageError = (event) => {
    console.error('Image failed to load:', event.target.src);
    // You could set a fallback image or show an error message here
  };

  const handleImageLoad = (event) => {
    console.log('Image loaded successfully:', event.target.src);
  };

  // Keep Menu Category (menu_id) in sync with Food Category
  const syncMenuWithCategory = (category) => {
    if (!category) {
      menuItemForm.value.menu_id = null;
      return;
    }
    const matchedMenu = menus.value?.find?.(
      (m) => (m.category || '').toLowerCase() === (category || '').toLowerCase()
    );
    menuItemForm.value.menu_id = matchedMenu ? matchedMenu.id : null;
  };

  // Check if menu exists for a category
  const menuExistsForCategory = (category) => {
    if (!category) return false;
    return menus.value?.some?.(
      (m) => (m.category || '').toLowerCase() === (category || '').toLowerCase()
    );
  };

  // Simplified category change handling
  const onCategoryChange = () => {
    if (menuItemForm.value.category) {
      const categoryExists = menuExistsForCategory(menuItemForm.value.category);

      if (categoryExists) {
        // Auto-select the existing menu
        const existingMenu = menus.value?.find?.(
          (m) =>
            (m.category || '').toLowerCase() ===
            (menuItemForm.value.category || '').toLowerCase()
        );
        if (existingMenu) {
          menuItemForm.value.menu_id = existingMenu.id;
        }
      } else {
        // No menu exists - will auto-create
        menuItemForm.value.menu_id = null;
      }
    }
  };

  watch(
    () => menuItemForm.value.category,
    (newCategory) => {
      syncMenuWithCategory(newCategory);
    }
  );

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

  // Watch for data changes
  watch([searchQuery, categoryFilter, statusFilter], () => {
    currentPage.value = 1; // Reset to first page when filters change

    // Only fetch data when status filter changes to/from 'deleted'
    // Other filtering is done client-side
    if (statusFilter.value === 'deleted' || statusFilter.value === '') {
      fetchMenuItems();
    }
  });
</script>

<template>
  <div class="mx-auto p-2 sm:p-4 lg:p-6">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6 lg:mb-8">
      <h1
        class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primaryColor mb-2 text-shadow-xs"
      >
        Menu Creation & Management
      </h1>
      <p class="text-sm sm:text-base text-black/50 px-2">
        Create and manage menu items from recipes for Countryside Steakhouse
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
          <CheckCircle
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-success"
          />
        </div>
        <div class="stat-title text-black/50 text-xs sm:text-sm">Available</div>
        <div
          class="stat-value text-success text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ menuItemStats.available_items || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Approved for production
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Package class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-black/70" />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">Menus</div>
        <div
          class="stat-value text-black/70 text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ menuStats.total_menus || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Active menu categories
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div
      class="flex flex-wrap gap-2 mb-4 sm:mb-6 justify-center sm:justify-start"
    >
      <button
        @click="openCreateModal"
        class="btn btn-outline btn-sm bg-primaryColor text-white font-thin hover:bg-primaryColor/80 hover:border-none hover:shadow-none"
        :disabled="loading"
      >
        <Plus class="w-4 h-4 mr-1" />
        Create Menu Item
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
        @click="activeTab = 'overview'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'overview' }"
      >
        <BarChart3 class="w-4 h-4 mr-1" />
        Overview
      </button>
      <button
        @click="activeTab = 'items'"
        class="tab"
        :class="{ 'tab-active': activeTab === 'items' }"
      >
        <ChefHat class="w-4 h-4 mr-1" />
        Menu Items
      </button>
    </div>

    <!-- Tab Content -->
    <div
      class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10"
    >
      <div class="card-body p-3 sm:p-4 lg:p-6">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="space-y-6">
          <div
            class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
          >
            <div>
              <h2
                class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl mb-2"
              >
                Menu Overview
              </h2>
              <p class="text-sm text-gray-600">
                Comprehensive view of your menu creation progress and statistics
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

          <!-- Quick Stats Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <div
              class="card bg-gradient-to-br from-base-100 to-base-50 border border-gray-200 hover:shadow-xl duration-300"
            >
              <div class="card-body p-6">
                <div class="flex items-center gap-3 mb-4">
                  <div
                    class="w-12 h-12 rounded-full flex items-center justify-center bg-success/10"
                  >
                    <CheckCircle class="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <h3 class="card-title text-lg font-bold text-primaryColor">
                      Available Items
                    </h3>
                    <p class="text-xs text-gray-500">Ready for production</p>
                  </div>
                </div>
                <div class="text-3xl font-bold text-success mb-2">
                  {{ menuItemStats.available_items || 0 }}
                </div>
                <div class="text-sm text-gray-600">
                  {{
                    Math.round(
                      (menuItemStats.available_items /
                        Math.max(menuItemStats.total_items, 1)) *
                        100
                    )
                  }}% of total items
                </div>
              </div>
            </div>

            <div
              class="card bg-gradient-to-br from-base-100 to-base-50 border border-gray-200 hover:shadow-xl duration-300"
            >
              <div class="card-body p-6">
                <div class="flex items-center gap-3 mb-4">
                  <div
                    class="w-12 h-12 rounded-full flex items-center justify-center bg-warning/10"
                  >
                    <Clock class="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <h3 class="card-title text-lg font-bold text-primaryColor">
                      In Development
                    </h3>
                    <p class="text-xs text-gray-500">Draft items</p>
                  </div>
                </div>
                <div class="text-3xl font-bold text-warning mb-2">
                  {{
                    (menuItemStats.total_items || 0) -
                    (menuItemStats.available_items || 0)
                  }}
                </div>
                <div class="text-sm text-gray-600">Awaiting approval</div>
              </div>
            </div>
          </div>

          <!-- Recent Menu Items -->
          <div class="card bg-white shadow-lg">
            <div class="card-body">
              <h3 class="card-title text-lg font-bold text-primaryColor mb-4">
                Recent Menu Items
              </h3>
              <div class="overflow-x-auto">
                <table class="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="item in paginatedMenuItems.slice(0, 5)"
                      :key="item.id"
                      class="hover:bg-base-200 cursor-pointer"
                      @click="openDetailsModal(item)"
                    >
                      <td class="font-medium">{{ item.item_name }}</td>
                      <td>{{ item.category }}</td>
                      <td>{{ formatCurrency(item.selling_price) }}</td>
                      <td>
                        <span
                          class="badge"
                          :class="getStatusBadgeClass(item.is_available)"
                        >
                          {{ getStatusText(item.is_available) }}
                        </span>
                      </td>
                      <td>
                        <!-- Actions Dropdown -->
                        <div class="dropdown dropdown-end">
                          <button
                            class="btn btn-ghost btn-xs"
                            tabindex="0"
                            @click.stop
                          >
                            <EllipsisVertical class="w-4 h-4" />
                          </button>
                          <ul
                            class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-44 z-50"
                            tabindex="0"
                            @click.stop
                          >
                            <!-- View Details -->
                            <li>
                              <button
                                @click.stop.prevent="openDetailsModal(item)"
                                @mousedown.stop
                                class="text-sm"
                              >
                                <Eye class="w-3 h-3 mr-2" />
                                View Details
                              </button>
                            </li>

                            <!-- Approve (only for draft items) -->
                            <li v-if="!item.is_available && !item.deleted_at">
                              <button
                                @click.stop.prevent="approveMenuItem(item.id)"
                                @mousedown.stop
                                class="text-sm text-success"
                              >
                                <CheckCircle class="w-3 h-3 mr-2" />
                                Approve
                              </button>
                            </li>

                            <!-- Edit (only for non-deleted items) -->
                            <li v-if="!item.deleted_at">
                              <button
                                @click.stop.prevent="openEditModal(item)"
                                @mousedown.stop
                                class="text-sm text-orange-500"
                              >
                                <Edit class="w-3 h-3 mr-2" />
                                Edit
                              </button>
                            </li>

                            <!-- Delete (only for non-deleted items) -->
                            <li v-if="!item.deleted_at">
                              <button
                                @click.stop.prevent="
                                  openConfirmModal('delete', item)
                                "
                                @mousedown.stop
                                class="text-sm text-red-500"
                              >
                                <Trash2 class="w-3 h-3 mr-2" />
                                Delete
                              </button>
                            </li>

                            <!-- Restore (only for deleted items) -->
                            <li v-if="item.deleted_at">
                              <button
                                @click.stop.prevent="
                                  openConfirmModal('restore', item)
                                "
                                @mousedown.stop
                                class="text-sm text-blue-500"
                              >
                                <RefreshCcw class="w-3 h-3 mr-2" />
                                Restore
                              </button>
                            </li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Menu Items Tab -->
        <div v-if="activeTab === 'items'" class="space-y-6">
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
                  placeholder="Search menu items..."
                  class="input input-bordered w-full pl-10 text-sm sm:text-base"
                />
              </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <select
                v-model="categoryFilter"
                class="select select-bordered text-sm sm:text-base"
              >
                <option value="">All Categories</option>
                <option
                  v-for="category in availableCategories"
                  :key="category"
                  :value="category"
                >
                  {{ category }}
                </option>
              </select>
              <select
                v-model="statusFilter"
                class="select select-bordered text-sm sm:text-base"
              >
                <option value="">All Status</option>
                <option value="available">Available</option>
                <option value="draft">Draft</option>
                <option value="quality_passed">Quality Passed</option>
                <option value="inspection_pending">Inspection Pending</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
          </div>

          <!-- Menu Items Grid -->
          <div
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
          >
            <div
              v-for="item in paginatedMenuItems"
              :key="item.id"
              class="card bg-white border border-gray-200 hover:shadow-xl duration-300 cursor-pointer"
              @click="openDetailsModal(item)"
            >
              <div class="card-body p-4 sm:p-6">
                <!-- Header Section -->
                <div
                  class="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 sm:mb-4 gap-2"
                >
                  <div class="flex-1 min-w-0">
                    <h3
                      class="card-title text-base sm:text-lg font-bold text-primaryColor mb-2 truncate"
                    >
                      {{ item.item_name }}
                    </h3>

                    <!-- Price Section - Mobile First -->
                    <div class="sm:hidden mb-2">
                      <div class="text-lg font-bold text-primaryColor">
                        {{ formatCurrency(item.selling_price) }}
                      </div>
                    </div>
                  </div>

                  <!-- Price Section - Desktop -->
                  <div class="hidden sm:block text-right">
                    <div class="text-lg font-bold text-primaryColor">
                      {{ formatCurrency(item.selling_price) }}
                    </div>
                  </div>
                </div>

                <!-- Badges Section - Responsive -->
                <div class="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                  <span
                    class="badge badge-xs sm:badge-sm"
                    :class="getStatusBadgeClass(item.is_available)"
                  >
                    {{ getStatusText(item.is_available) }}
                  </span>
                  <span
                    class="badge badge-xs sm:badge-sm bg-gray-100 text-gray-600"
                  >
                    {{ item.category }}
                  </span>
                  <!-- Quality Inspection Status -->
                  <span
                    v-if="item.passed_inspections > 0"
                    class="badge badge-xs sm:badge-sm bg-success/20 text-success border border-success/30"
                    title="Passed Quality Inspection - Ready for Production"
                  >
                    <Shield class="w-3 h-3 mr-1" />
                    <span class="hidden xs:inline">Quality Passed</span>
                    <span class="xs:hidden">Passed</span>
                  </span>
                  <span
                    v-else-if="
                      item.quality_inspections_count > 0 &&
                      item.passed_inspections === 0
                    "
                    class="badge badge-xs sm:badge-sm bg-warning/20 text-warning border border-warning/30"
                    title="Quality Inspection Pending - Consider quality check before approval"
                  >
                    <AlertTriangle class="w-3 h-3 mr-1" />
                    <span class="hidden xs:inline">Needs Quality Check</span>
                    <span class="xs:hidden">Pending</span>
                  </span>
                  <span
                    v-else-if="!item.is_available"
                    class="badge badge-xs sm:badge-sm bg-info/20 text-info border border-info/30"
                    title="New menu item - Quality inspection recommended"
                  >
                    <Shield class="w-3 h-3 mr-1" />
                    <span class="hidden xs:inline"
                      >Quality Check Recommended</span
                    >
                    <span class="xs:hidden">Check Needed</span>
                  </span>
                  <!-- Promo Discount Badge -->
                  <span
                    v-if="item.promo_info"
                    class="badge badge-xs sm:badge-sm"
                    :class="
                      item.promo_info.is_active
                        ? 'bg-success/20 text-success border border-success/30'
                        : 'bg-gray/20 text-gray-600 border border-gray/30'
                    "
                    :title="
                      item.promo_info.is_active
                        ? 'Active promotional discount available'
                        : 'Promotional discount (inactive)'
                    "
                  >
                    <Star class="w-3 h-3 mr-1" />
                    <span class="hidden xs:inline">{{
                      item.promo_info.is_active ? 'Promo Active' : 'Promo'
                    }}</span>
                    <span class="xs:hidden">Promo</span>
                  </span>
                </div>

                <!-- Bottom Section - Responsive -->
                <div
                  class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4"
                >
                  <div
                    class="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-4 text-xs sm:text-sm text-gray-600"
                  >
                    <div class="flex items-center gap-1">
                      <Clock class="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span>{{ item.preparation_time_minutes }}m</span>
                    </div>
                  </div>
                  <!-- Actions Dropdown -->
                  <div
                    class="dropdown dropdown-end flex-shrink-0"
                    @click.stop
                    @mousedown.stop
                    @mouseup.stop
                  >
                    <button
                      class="btn btn-ghost btn-xs sm:btn-sm"
                      tabindex="0"
                      @click.stop.prevent
                      @mousedown.stop
                      @mouseup.stop
                    >
                      <EllipsisVertical class="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    <ul
                      class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48 sm:w-52 z-50"
                      tabindex="0"
                      @click.stop
                    >
                      <!-- View Details -->
                      <li>
                        <button
                          @click.stop.prevent="openDetailsModal(item)"
                          @mousedown.stop
                          class="text-sm"
                        >
                          <Eye class="w-3 h-3 mr-2" />
                          View Details
                        </button>
                      </li>

                      <!-- Create Quality Inspection (only if not already passed) -->
                      <li
                        v-if="!item.deleted_at && item.passed_inspections === 0"
                      >
                        <button
                          @click.stop.prevent="createQualityInspection(item)"
                          @mousedown.stop
                          class="text-sm text-primaryColor"
                        >
                          <Shield class="w-3 h-3 mr-2" />
                          Create Quality Inspection
                        </button>
                      </li>

                      <!-- Approve (only for draft items) -->
                      <li v-if="!item.is_available && !item.deleted_at">
                        <button
                          @click.stop.prevent="openApproveModal(item)"
                          @mousedown.stop
                          class="text-sm text-success"
                        >
                          <CheckCircle class="w-3 h-3 mr-2" />
                          Approve for Production
                        </button>
                      </li>

                      <!-- Edit (only for non-deleted items) -->
                      <li v-if="!item.deleted_at && statusFilter !== 'deleted'">
                        <button
                          @click.stop.prevent="openEditModal(item)"
                          @mousedown.stop
                          class="text-sm text-orange-500"
                        >
                          <Edit class="w-3 h-3 mr-2" />
                          Edit Menu Item
                        </button>
                      </li>

                      <!-- Delete (only for non-deleted items) -->
                      <li v-if="!item.deleted_at && statusFilter !== 'deleted'">
                        <button
                          @click.stop.prevent="openConfirmModal('delete', item)"
                          @mousedown.stop
                          class="text-sm text-red-500"
                        >
                          <Trash2 class="w-3 h-3 mr-2" />
                          Delete Menu Item
                        </button>
                      </li>

                      <!-- Restore (only for deleted items) -->
                      <li v-if="statusFilter === 'deleted' && item.deleted_at">
                        <button
                          @click.stop.prevent="
                            openConfirmModal('restore', item)
                          "
                          @mousedown.stop
                          class="text-sm text-blue-500"
                        >
                          <RefreshCcw class="w-3 h-3 mr-2" />
                          Restore Menu Item
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-if="paginatedMenuItems.length === 0"
              class="col-span-full flex flex-col items-center justify-center py-12"
            >
              <ChefHat class="w-16 h-16 text-gray-300 mb-4" />
              <h3 class="text-lg font-medium text-gray-600 mb-2">
                No menu items found
              </h3>
              <p class="text-sm text-gray-500 text-center mb-4">
                {{
                  searchQuery || categoryFilter || statusFilter
                    ? 'Try adjusting your filters'
                    : 'Create your first menu item to get started'
                }}
              </p>
              <button
                v-if="!searchQuery && !categoryFilter && !statusFilter"
                @click="openCreateModal"
                class="btn btn-sm bg-primaryColor text-white font-thin hover:bg-primaryColor/80 hover:border-none hover:shadow-none"
              >
                <Plus class="w-4 h-4 mr-2" />
                Create Menu Item
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
      </div>
    </div>

    <!-- Create/Edit Menu Item Modal (dialog-based for consistency) -->
    <dialog id="menu_item_modal" class="modal" v-if="showCreateModal">
      <div
        class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/95 shadow-lg"
      >
        <h3
          class="font-bold text-xl text-primaryColor mb-4 border-b border-black/10 pb-3"
        >
          {{
            menuItemForm.isEditing ? 'Edit Menu Item' : 'Create New Menu Item'
          }}
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
                  >Recipe <span class="text-red-500">*</span>
                  <span
                    v-if="menuItemForm.isEditing"
                    class="text-xs text-gray-500 ml-2"
                    >(Read-only in edit mode)</span
                  >
                </span>
              </label>
              <select
                v-model="menuItemForm.recipe_id"
                @change="handleRecipeSelection(menuItemForm.recipe_id)"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                :class="{
                  'bg-gray-100 cursor-not-allowed': menuItemForm.isEditing,
                }"
                :disabled="menuItemForm.isEditing"
                required
                placeholder="Select Recipe"
              >
                <option value="" disabled>
                  {{
                    availableRecipes.length > 0
                      ? 'Select Recipe'
                      : 'No available recipes'
                  }}
                </option>
                <option
                  v-for="recipe in availableRecipes"
                  :key="recipe.id"
                  :value="recipe.id"
                >
                  {{ recipe.recipe_name }} ({{ recipe.category }})
                </option>
              </select>

              <!-- Helper text for available recipes -->
              <div class="text-xs text-black/50 mt-1">
                <span v-if="availableRecipes.length > 0">
                  {{ availableRecipes.length }} recipe{{
                    availableRecipes.length !== 1 ? 's' : ''
                  }}
                  available (not yet used in menus)
                </span>
                <span v-else class="text-warning">
                  All recipes are already used in menu items. Create new recipes
                  first.
                </span>
              </div>

              <!-- Show used recipes for reference when no available recipes -->
              <div
                v-if="availableRecipes.length === 0 && usedRecipes.length > 0"
                class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <h5 class="text-sm font-medium text-blue-800 mb-2">
                  📋 Already Used Recipes ({{ usedRecipes.length }})
                </h5>
                <div class="text-xs text-blue-700">
                  <p class="mb-2">
                    These recipes are already part of menu items:
                  </p>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="recipe in usedRecipes.slice(0, 6)"
                      :key="recipe.id"
                      class="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                    >
                      {{ recipe.recipe_name }}
                    </span>
                    <span
                      v-if="usedRecipes.length > 6"
                      class="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                    >
                      +{{ usedRecipes.length - 6 }} more...
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Menu Item Name <span class="text-red-500">*</span>
                </span>
              </label>
              <input
                v-model="menuItemForm.item_name"
                type="text"
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                placeholder="e.g., Longsilog"
                required
              />
            </div>
          </div>

          <!-- Category (Food Category only; Menu auto-selected based on category) -->
          <div
            class="grid grid-cols-1 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Food Category <span class="text-red-500">*</span>
                  <span
                    v-if="menuItemForm.isEditing"
                    class="text-xs text-gray-500 ml-2"
                    >(Read-only in edit mode)</span
                  >
                </span>
              </label>
              <select
                v-model="menuItemForm.category"
                @change="onCategoryChange"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                :class="{
                  'bg-gray-100 cursor-not-allowed': menuItemForm.isEditing,
                }"
                :disabled="menuItemForm.isEditing"
                required
              >
                <option value="">Select Category</option>
                <option
                  v-for="category in availableCategories"
                  :key="category"
                  :value="category"
                >
                  {{ category }}
                </option>
              </select>
            </div>
          </div>

          <!-- Pricing & Timing -->
          <div
            class="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Selling Price <span class="text-red-500">*</span></span
                >
              </label>
              <input
                v-model.number="menuItemForm.selling_price"
                type="number"
                step="0.01"
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                placeholder="150.00"
                required
              />
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Prep Time (min)
                  <span class="text-xs text-black/40">(optional)</span></span
                >
              </label>
              <input
                v-model.number="menuItemForm.preparation_time_minutes"
                type="number"
                min="0"
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                placeholder="e.g., 15"
              />
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Recipe Batch Information</span
                >
              </label>
              <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div class="text-sm text-gray-700">
                  <span class="font-medium">Batch Size:</span>
                  <span class="text-primaryColor ml-1"
                    >{{
                      (selectedRecipe || currentRecipe)?.batch_size || 'N/A'
                    }}
                    {{
                      (selectedRecipe || currentRecipe)?.batch_unit ||
                      'servings'
                    }}</span
                  >
                </div>
                <div class="text-sm text-gray-700 mt-1">
                  <span class="font-medium">Serving Size:</span>
                  <span class="text-primaryColor ml-1"
                    >1 serving per customer</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Cost Summary (auto from recipe) -->
          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
            v-if="recipeCostInfo.totalCost !== null"
          >
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Recipe Total Cost</span
                >
              </label>
              <input
                :value="formatCurrency(recipeCostInfo.totalCost)"
                class="input input-sm sm:input-md input-bordered w-full bg-gray-50 text-black/70"
                readonly
              />
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Estimated cost per Serving</span
                >
              </label>
              <input
                :value="formatCurrency(recipeCostInfo.costPerServing)"
                class="input input-sm sm:input-md input-bordered w-full bg-gray-50 text-black/70"
              />
            </div>
          </div>

          <!-- Production Planning Helper -->
          <div
            class="bg-primaryColor/5 border border-primaryColor/30 p-4 rounded-xl"
            v-if="selectedRecipe"
          >
            <h4 class="font-semibold text-primaryColor mb-3">
              <font-awesome-icon icon="fa-solid fa-gears" />
              Production Planning Helper
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div
                class="bg-white p-3 rounded-lg border border-primaryColor/30"
              >
                <div class="font-medium text-primaryColor">Batch Size</div>
                <div class="text-lg font-bold text-primaryColor">
                  {{ selectedRecipe.batch_size }}
                  {{ selectedRecipe.batch_unit }}
                </div>
              </div>
              <div
                class="bg-white p-3 rounded-lg border border-primaryColor/30"
              >
                <div class="font-medium text-primaryColor">Cost per Batch</div>
                <div class="text-lg font-bold text-primaryColor">
                  {{ formatCurrency(selectedRecipe.cost_per_batch || 0) }}
                </div>
              </div>
            </div>
            <div class="mt-3 text-xs text-primaryColor">
              <font-awesome-icon icon="fa-solid fa-lightbulb" />
              <strong>Production Tip:</strong> To produce 100 servings, you'll
              need
              {{ Math.ceil(100 / (selectedRecipe.batch_size || 1)) }} batches of
              {{ selectedRecipe.batch_size }}
              {{ selectedRecipe.batch_unit }} each.
            </div>
          </div>

          <!-- Description -->
          <div
            class="form-control bg-white border border-black/10 p-4 rounded-xl"
          >
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
                >Description</span
              >
            </label>
            <textarea
              v-model="menuItemForm.description"
              class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              rows="3"
              placeholder="Describe the menu item..."
            ></textarea>
          </div>

          <!-- Tags (Structured Selection) -->
          <div
            class="form-control bg-white border border-black/10 p-4 rounded-xl"
          >
            <label class="label mb-2">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Tags
                <span class="text-xs text-black/40 ml-1"
                  >(select all that apply)</span
                >
              </span>
            </label>
            <div class="space-y-4">
              <div
                v-for="group in tagGroups"
                :key="group.label"
                class="border border-black/5 rounded-lg p-3"
              >
                <div
                  class="text-xs sm:text-sm font-medium text-primaryColor mb-2"
                >
                  {{ group.label }}
                </div>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="tag in group.tags"
                    :key="tag.key"
                    class="cursor-pointer inline-flex items-center gap-2 px-2 py-1 rounded-md border border-primaryColor/20 bg-primaryColor/5 hover:bg-primaryColor/10 text-primaryColor text-xs"
                    :title="tag.description || tag.key"
                  >
                    <input
                      type="checkbox"
                      class="checkbox checkbox-xs checked:bg-primaryColor checked:text-white"
                      :value="tag.key"
                      v-model="selectedTags"
                    />
                    <span class="capitalize">{{ tag.key }}</span>
                  </label>
                </div>
              </div>
            </div>
            <p class="mt-3 text-xs text-black/40">
              Selected:
              <span class="text-primaryColor">{{
                selectedTags.join(', ') || 'None'
              }}</span>
            </p>
          </div>

          <!-- Image Upload -->
          <div class="bg-white border border-black/10 p-4 rounded-xl">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
                >Menu Image
                <span class="text-black/40 text-xs">
                  {{
                    menuItemForm.isEditing && menuItemForm.image_url
                      ? '(replace current image)'
                      : '(optional)'
                  }}
                </span>
              </span>
            </label>
            <input
              type="file"
              accept="image/*"
              class="flex flex-col file-input !file-input-xs sm:file-input-md w-full max-w-xs"
              @change="handleImageChange"
              ref="imageInput"
            />
            <!-- Image Preview for new uploads -->
            <div v-if="imagePreviewUrl" class="mt-3 relative inline-block">
              <img
                :src="imagePreviewUrl"
                alt="New image preview"
                class="w-40 h-40 object-cover rounded-lg border border-black/10"
              />
              <button
                type="button"
                class="btn btn-xs btn-circle absolute -top-2 -right-2 bg-error text-white border-none hover:bg-error/80"
                @click="clearSelectedImage"
                title="Remove new image"
              >
                ×
              </button>
            </div>

            <!-- Existing Image Preview for editing -->
            <div
              v-else-if="menuItemForm.image_url && menuItemForm.isEditing"
              class="mt-3 relative inline-block"
            >
              <img
                :src="menuItemForm.image_url"
                alt="Current image"
                class="w-40 h-40 object-cover rounded-lg border border-black/10"
                @error="handleImageError"
                @load="handleImageLoad"
              />
              <button
                type="button"
                class="btn btn-xs btn-circle absolute -top-2 -right-2 bg-warning text-white border-none hover:bg-warning/80"
                @click="clearExistingImage"
                title="Remove current image"
              >
                ×
              </button>
              <div
                class="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded"
              >
                Current Image
              </div>
            </div>
            <p class="text-xs text-black/50 mt-2">
              Max 5MB. JPG or PNG recommended.
            </p>
          </div>

          <!-- Promo Discount Section -->
          <div class="bg-white border border-black/10 p-4 rounded-xl">
            <div class="flex items-center gap-2 mb-4">
              <Star class="w-5 h-5 text-primaryColor" />
              <h4 class="font-semibold text-primaryColor text-sm sm:text-base">
                Promotional Discount
              </h4>
            </div>

            <!-- Enable Promo Toggle -->
            <div class="form-control mb-4">
              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="menuItemForm.has_promo_discount"
                  class="checkbox checkbox-sm checked:bg-primaryColor checked:text-white"
                />
                <span class="text-sm text-black/70">
                  Enable promotional discount for this menu item
                </span>
              </label>
            </div>

            <!-- Promo Fields (shown when enabled) -->
            <div v-if="menuItemForm.has_promo_discount" class="space-y-4">
              <!-- Discount Type and Amount -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label mb-1">
                    <span class="label-text text-black/70 font-medium text-sm">
                      Discount Type
                    </span>
                  </label>
                  <select
                    v-model="menuItemForm.promo_discount_type"
                    class="select select-sm select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed_amount">Fixed Amount</option>
                  </select>
                </div>

                <div class="form-control">
                  <label class="label mb-1">
                    <span class="label-text text-black/70 font-medium text-sm">
                      {{
                        menuItemForm.promo_discount_type === 'percentage'
                          ? 'Discount Percentage (%)'
                          : 'Discount Amount (₱)'
                      }}
                    </span>
                  </label>
                  <input
                    v-model.number="menuItemForm.promo_discount_percentage"
                    v-if="menuItemForm.promo_discount_type === 'percentage'"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    class="input input-sm input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                    placeholder="e.g., 20"
                  />
                  <input
                    v-model.number="menuItemForm.promo_discount_amount"
                    v-else
                    type="number"
                    step="0.01"
                    min="0"
                    class="input input-sm input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                    placeholder="e.g., 50.00"
                  />
                </div>
              </div>

              <!-- Minimum Quantity -->
              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text text-black/70 font-medium text-sm">
                    Minimum Quantity for Discount
                  </span>
                </label>
                <input
                  v-model.number="menuItemForm.promo_minimum_quantity"
                  type="number"
                  min="1"
                  class="input input-sm input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  placeholder="e.g., 2"
                />
                <p class="text-xs text-black/50 mt-1">
                  Customer must order at least this many items to get the
                  discount
                </p>
              </div>

              <!-- Date Range -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label mb-1">
                    <span class="label-text text-black/70 font-medium text-sm">
                      Start Date
                    </span>
                  </label>
                  <input
                    v-model="menuItemForm.promo_start_date"
                    type="datetime-local"
                    class="input input-sm input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  />
                </div>

                <div class="form-control">
                  <label class="label mb-1">
                    <span class="label-text text-black/70 font-medium text-sm">
                      End Date
                    </span>
                  </label>
                  <input
                    v-model="menuItemForm.promo_end_date"
                    type="datetime-local"
                    class="input input-sm input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  />
                </div>
              </div>

              <!-- Description -->
              <div class="form-control">
                <label class="label mb-1">
                  <span class="label-text text-black/70 font-medium text-sm">
                    Promo Description
                  </span>
                </label>
                <textarea
                  v-model="menuItemForm.promo_description"
                  class="textarea textarea-sm textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  rows="2"
                  placeholder="e.g., Buy 2 get 20% off! Limited time offer."
                ></textarea>
              </div>

              <!-- Preview -->
              <div
                class="bg-primaryColor/5 border border-primaryColor/30 p-3 rounded-lg"
              >
                <h5 class="font-medium text-primaryColor mb-2">
                  Discount Preview
                </h5>
                <div class="text-sm text-black/70">
                  <p v-if="menuItemForm.promo_discount_type === 'percentage'">
                    <strong
                      >{{
                        menuItemForm.promo_discount_percentage || 0
                      }}%</strong
                    >
                    off when ordering
                    <strong>{{
                      menuItemForm.promo_minimum_quantity || 1
                    }}</strong>
                    or more items
                  </p>
                  <p v-else>
                    <strong
                      >₱{{ menuItemForm.promo_discount_amount || 0 }}</strong
                    >
                    off when ordering
                    <strong>{{
                      menuItemForm.promo_minimum_quantity || 1
                    }}</strong>
                    or more items
                  </p>
                  <p v-if="menuItemForm.promo_description" class="mt-1 text-xs">
                    "{{ menuItemForm.promo_description }}"
                  </p>
                </div>
              </div>
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
              {{
                menuItemForm.isEditing ? 'Update Menu Item' : 'Create Menu Item'
              }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeCreateModal">close</button>
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
            :disabled="loading"
          >
            <span
              v-if="loading"
              class="loading loading-spinner loading-xs mr-1"
            ></span>
            {{ loading ? 'Processing...' : 'Confirm' }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeConfirmModal">close</button>
      </form>
    </dialog>

    <!-- Approval Modal -->
    <dialog
      id="approval_modal"
      class="modal"
      :class="{ 'modal-open': approveModal.show }"
    >
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Approve Menu Item for Production
        </h3>

        <div class="mb-6">
          <div
            class="bg-secondaryColor/10 border border-primaryColor/20 rounded-lg p-4 mb-4"
          >
            <div class="flex items-center gap-2 mb-2">
              <Shield class="w-5 h-5 text-primaryColor" />
              <h4 class="font-semibold text-primaryColor">
                Quality Check Recommendation
              </h4>
            </div>
            <p class="text-sm text-primaryColor mb-3">
              For new menu items or recipe modifications, we recommend
              completing a quality inspection before approval to ensure
              consistent taste, appearance, and portion size.
            </p>

            <div class="space-y-3">
              <!-- Only show quality inspection option if item hasn't passed inspection yet -->
              <label
                v-if="
                  approveModal.item &&
                  approveModal.item.passed_inspections === 0
                "
                class="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  v-model="approveModal.requireQualityCheck"
                  :value="true"
                  class="radio checked:text-primaryColor radio-xs text-primaryColor"
                />
                <div>
                  <div class="font-medium text-primaryColor">
                    Complete Quality Inspection First
                  </div>
                  <div class="text-xs text-primaryColor">
                    Recommended for new items or recipe changes
                  </div>
                </div>
              </label>

              <!-- Show success message if already passed inspection -->
              <div
                v-if="
                  approveModal.item && approveModal.item.passed_inspections > 0
                "
                class="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <CheckCircle class="w-5 h-5 text-green-600" />
                <div>
                  <div class="font-medium text-green-800">
                    Quality Inspection Already Passed 
                    <font-awesome-icon icon="fa-solid fa-check" />
                  </div>
                  <div class="text-xs text-green-600">
                    This item has already passed quality inspection and is ready
                    for approval.
                  </div>
                </div>
              </div>

              <label class="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  v-model="approveModal.requireQualityCheck"
                  :value="false"
                  class="radio checked:text-primaryColor radio-xs text-primaryColor"
                />
                <div>
                  <div class="font-medium text-primaryColor">
                    Approve Directly
                  </div>
                  <div class="text-xs text-primaryColor">
                    {{
                      approveModal.item &&
                      approveModal.item.passed_inspections > 0
                        ? 'Item has passed quality inspection'
                        : 'Skip quality check (use with caution)'
                    }}
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div class="form-control flex flex-col gap-2">
            <label class="label">
              <span class="label-text font-medium !text-xs sm:text-base"
                >Approval Reason (Optional)</span
              >
            </label>
            <textarea
              v-model="approveModal.approvalReason"
              class="textarea textarea-bordered w-full textarea-sm bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              placeholder="e.g., Recipe tested in kitchen, customer feedback positive, etc."
              rows="3"
            ></textarea>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeApproveModal"
            class="btn btn-ghost btn-sm font-thin"
          >
            Cancel
          </button>
          <button
            @click="handleApproval"
            class="btn bg-primaryColor text-white border-none hover:bg-primaryColor/80 btn-sm shadow-none font-thin"
            :disabled="loading"
          >
            <CheckCircle v-if="!loading" class="w-4 h-4 mr-1" />
            <span
              v-if="loading"
              class="loading loading-spinner loading-xs mr-1"
            ></span>
            {{
              loading
                ? approveModal.requireQualityCheck
                  ? 'Redirecting...'
                  : 'Approving...'
                : approveModal.requireQualityCheck
                  ? 'Go to Quality Check'
                  : 'Approve for Production'
            }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeApproveModal">close</button>
      </form>
    </dialog>

    <!-- Menu Item Details Modal -->
    <div v-if="showDetailsModal && selectedMenuItem" class="modal modal-open">
      <div class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 class="font-bold text-lg text-primaryColor mb-4">
          {{ selectedMenuItem.item_name }}
        </h3>

        <div class="space-y-6">
          <!-- Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 class="font-semibold text-primaryColor mb-3">
                Menu Item Details
              </h4>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-600">Recipe:</span>
                  <span class="font-medium">{{
                    selectedMenuItem.recipe_name
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Category:</span>
                  <span class="font-medium">{{
                    selectedMenuItem.category
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Status:</span>
                  <span
                    class="badge"
                    :class="getStatusBadgeClass(selectedMenuItem.is_available)"
                  >
                    {{ getStatusText(selectedMenuItem.is_available) }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Prep Time:</span>
                  <span class="font-medium"
                    >{{
                      selectedMenuItem.preparation_time_minutes
                    }}
                    minutes</span
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Serving Size:</span>
                  <span class="font-medium text-success"
                    >1 {{ selectedMenuItem.serving_unit }}</span
                  >
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Recipe Batch:</span>
                  <span class="font-medium text-primaryColor"
                    >{{ selectedMenuItem.recipe_batch_size || 'N/A' }}
                    {{ selectedMenuItem.recipe_batch_unit || 'servings' }}</span
                  >
                </div>
              </div>
            </div>

            <div>
              <h4 class="font-semibold text-primaryColor mb-3">
                Pricing & Profit
              </h4>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-600">Selling Price:</span>
                  <span class="font-medium text-success">{{
                    formatCurrency(selectedMenuItem.selling_price)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Cost Price:</span>
                  <span class="font-medium">{{
                    formatCurrency(selectedMenuItem.cost_price)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Profit Amount:</span>
                  <span class="font-medium text-success">
                    {{
                      formatCurrency(
                        selectedMenuItem.selling_price -
                          selectedMenuItem.cost_price
                      )
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div v-if="selectedMenuItem.description">
            <h4 class="font-semibold text-primaryColor mb-2">Description</h4>
            <p class="text-gray-700 bg-gray-50 p-3 rounded-lg">
              {{ selectedMenuItem.description }}
            </p>
          </div>

          <!-- Tags -->
          <div v-if="selectedMenuItem.tags">
            <h4 class="font-semibold text-primaryColor mb-2">Tags</h4>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in selectedMenuItem.tags.split(',')"
                :key="tag.trim()"
                class="badge badge-sm bg-primaryColor/10 text-primaryColor"
              >
                {{ tag.trim() }}
              </span>
            </div>
          </div>

          <!-- Promo Discount Information -->
          <div
            v-if="
              selectedMenuItem.promo_info &&
              selectedMenuItem.promo_info.is_active
            "
          >
            <h4 class="font-semibold text-primaryColor mb-3">
              <Star class="w-4 h-4 inline mr-1" />
              Active Promotion
            </h4>
            <div class="bg-success/10 border border-success/30 p-4 rounded-lg">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div class="font-medium text-success mb-1">
                    Discount Details
                  </div>
                  <p
                    v-if="
                      selectedMenuItem.promo_info.discount_type === 'percentage'
                    "
                  >
                    <strong
                      >{{
                        selectedMenuItem.promo_info.discount_percentage
                      }}%</strong
                    >
                    off
                  </p>
                  <p v-else>
                    <strong
                      >₱{{
                        selectedMenuItem.promo_info.discount_amount
                      }}</strong
                    >
                    off
                  </p>
                  <p class="text-xs text-success/70">
                    Minimum quantity:
                    {{ selectedMenuItem.promo_info.minimum_quantity }} items
                  </p>
                </div>
                <div>
                  <div class="font-medium text-success mb-1">Valid Period</div>
                  <p class="text-xs text-success/70">
                    <span v-if="selectedMenuItem.promo_info.start_date">
                      From:
                      {{
                        parseFromAPI(
                          selectedMenuItem.promo_info.start_date
                        ).toLocaleDateString('en-PH', {
                          timeZone: 'Asia/Manila',
                        })
                      }}
                    </span>
                    <span v-if="selectedMenuItem.promo_info.end_date">
                      Until:
                      {{
                        parseFromAPI(
                          selectedMenuItem.promo_info.end_date
                        ).toLocaleDateString('en-PH', {
                          timeZone: 'Asia/Manila',
                        })
                      }}
                    </span>
                  </p>
                </div>
              </div>
              <div v-if="selectedMenuItem.promo_info.description" class="mt-3">
                <div class="font-medium text-success mb-1">Description</div>
                <p class="text-sm text-success/80">
                  {{ selectedMenuItem.promo_info.description }}
                </p>
              </div>
            </div>
          </div>

          <!-- Quality Inspection History -->
          <div>
            <h4 class="font-semibold text-primaryColor mb-3">
              Quality Inspection History
            </h4>
            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600 mb-3">
                Track quality control history for this menu item.
              </p>

              <!-- Show message when quality inspection already passed -->
              <div
                v-if="selectedMenuItem.passed_inspections > 0"
                class="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg"
              >
                <div class="flex items-center gap-2">
                  <CheckCircle class="w-4 h-4 text-green-600" />
                  <span class="text-sm text-green-800 font-medium">
                    Quality inspection already passed! This item has been
                    approved for production.
                  </span>
                </div>
              </div>

              <div class="flex gap-2">
                <button
                  v-if="selectedMenuItem.passed_inspections === 0"
                  @click="createQualityInspection(selectedMenuItem)"
                  class="btn btn-sm bg-primaryColor text-white font-thin hover:bg-primaryColor/80 hover:border-none hover:shadow-none"
                  :disabled="loading"
                >
                  <Shield v-if="!loading" class="w-4 h-4 mr-1" />
                  <span
                    v-if="loading"
                    class="loading loading-spinner loading-xs mr-1"
                  ></span>
                  {{ loading ? 'Creating...' : 'New Inspection' }}
                </button>
                <button
                  @click="$router.push('/production/quality-inspection')"
                  class="btn btn-outline btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
                >
                  View All Inspections
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeDetailsModal"
            class="btn btn-sm font-thin border-none bg-gray-200 hover:bg-gray-300 text-black/50"
          >
            Close
          </button>
          <button
            v-if="!selectedMenuItem.is_available"
            @click="approveMenuItem(selectedMenuItem.id)"
            class="btn btn-sm font-thin border-none bg-primaryColor hover:bg-primaryColor/80 text-white"
            :disabled="loading"
          >
            <CheckCircle v-if="!loading" class="w-4 h-4 mr-2" />
            <span
              v-if="loading"
              class="loading loading-spinner loading-xs mr-2"
            ></span>
            {{ loading ? 'Approving...' : 'Approve for Production' }}
          </button>
        </div>
      </div>
    </div>
  </div>

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
</template>

<style scoped>
  .text-shadow-xs {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
</style>
