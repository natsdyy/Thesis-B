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
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';
  import { recipeCategories } from '../../config/productionCategories.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import { useUserStore } from '../../stores/userStore.js';
  import { apiConfig } from '../../config/api.js';

  const productionStore = useProductionStore();
  const authStore = useAuthStore();
  const userStore = useUserStore();

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
  });

  // Hybrid approach: Menu assignment strategy
  const menuAssignmentOption = ref('auto'); // Default to auto-create
  const availableMenus = ref([]); // Available menus for selected category

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const menus = computed(() => productionStore.menus);
  const menuItems = computed(() => productionStore.menuItems);
  const availableRecipesList = ref([]);
  const recipeCostInfo = ref({ totalCost: null, costPerServing: null });
  const imageFile = ref(null);
  const imagePreviewUrl = ref(null);
  const imageInput = ref(null);
  // categories imported from config
  const availableRecipes = computed(() => {
    if (availableRecipesList.value && availableRecipesList.value.length > 0) {
      return availableRecipesList.value;
    }
    return productionStore.recipes.filter((recipe) => recipe.is_active);
  });

  // Computed properties
  const menuStats = computed(() => productionStore.menuStats);
  const menuItemStats = computed(() => productionStore.menuItemStats);

  // Get selected recipe for form display
  const selectedRecipe = computed(() => {
    if (!menuItemForm.value.recipe_id) return null;
    return availableRecipes.value.find(
      (r) => r.id == menuItemForm.value.recipe_id
    );
  });

  const filteredMenuItems = computed(() => {
    let filtered = menuItems.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.item_name.toLowerCase().includes(query) ||
          item.item_code.toLowerCase().includes(query) ||
          item.recipe_name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    if (categoryFilter.value) {
      filtered = filtered.filter(
        (item) => item.category === categoryFilter.value
      );
    }

    // Status filtering is now handled in the backend

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
      isEditing: false, // Reset editing flags
      editingItemId: null,
    };
    menuAssignmentOption.value = 'auto'; // Reset to default
    availableMenus.value = []; // Clear available menus
  };

  // Methods
  const fetchMenuItems = async () => {
    const filters = {};

    // Handle status filtering including deleted items
    if (statusFilter.value === 'deleted') {
      filters.only_deleted = true;
    } else if (statusFilter.value === 'available') {
      filters.is_available = true;
    } else if (statusFilter.value === 'draft') {
      filters.is_available = false;
    }

    // Add other filters
    if (searchQuery.value) {
      filters.search = searchQuery.value;
    }
    if (categoryFilter.value) {
      filters.category = categoryFilter.value;
    }

    await productionStore.fetchMenuItems(filters);
  };

  const fetchData = async () => {
    try {
      await Promise.all([
        productionStore.fetchMenus(),
        fetchMenuItems(),
        productionStore.fetchAvailableRecipes(),
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
      const list = await productionStore.fetchAvailableRecipes();
      if (Array.isArray(list)) {
        availableRecipesList.value = list;
      }
    } catch (e) {
      // non-blocking
    }
    showCreateModal.value = true;
    // Wait for dialog to mount before calling showModal to avoid double-click
    await nextTick();
    document.getElementById('menu_item_modal')?.showModal();
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

    // Populate form with item data
    let imageUrl = item.image_url || '';
    // Convert relative image path to full URL if needed
    if (imageUrl && imageUrl.startsWith('/uploads/')) {
      // Construct full URL for images (remove /api from base URL)
      const baseUrl = apiConfig.baseURL.replace('/api', '');
      imageUrl = `${baseUrl}${imageUrl}`;
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
    };

    // Set editing mode
    menuItemForm.value.isEditing = true;
    menuItemForm.value.editingItemId = item.id;

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

      // Validate required fields
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

      // Hybrid approach validation
      if (menuAssignmentOption.value === 'existing' && !formData.menu_id) {
        showToast('error', 'Please select an existing menu for this category');
        return;
      }

      if (menuAssignmentOption.value === 'manual') {
        showToast(
          'error',
          'Please create a menu first before adding menu items'
        );
        return;
      }

      // Hybrid approach: Handle menu_id based on assignment strategy
      if (menuAssignmentOption.value === 'existing') {
        // User selected existing menu - keep the menu_id
        if (!formData.menu_id) {
          showToast('error', 'Please select an existing menu');
          return;
        }
      } else if (menuAssignmentOption.value === 'auto') {
        // Auto-create menu - set menu_id to null to let backend handle it
        formData.menu_id = null;
      } else if (menuAssignmentOption.value === 'manual') {
        // Manual creation - should not reach here due to validation
        showToast('error', 'Please create a menu first');
        return;
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
          // Send all fields (null values have been converted to empty strings above)
          if (value !== undefined) {
            fd.append(key, value);
          }
        });
        fd.append('image', imageFile.value);
        payload = fd;
      }

      // Check if we're editing or creating
      if (formData.isEditing && formData.editingItemId) {
        // Update existing item
        await productionStore.updateMenuItem(formData.editingItemId, payload);
        showToast('success', 'Menu item updated successfully');
      } else {
        // Create new item
        await productionStore.createMenuItem(payload);
        showToast('success', 'Menu item created successfully');
      }

      closeCreateModal();
      closeConfirmModal(); // Close the confirmation modal as well
      await fetchMenuItems(); // Refresh the list
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
    openConfirmModal(modalType, {
      menu_item_name: menuItemForm.value.item_name,
    });
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

  const handleDeleteMenuItem = async (item) => {
    try {
      await productionStore.deleteMenuItem(item.id, authStore.user?.id);
      showToast('success', 'Menu item deleted successfully');
      // Refresh the menu items list
      await fetchMenuItems();
    } catch (error) {
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
      const updateData = { ...menuItemForm.value };
      await productionStore.updateMenuItem(item.id, updateData);
      showToast('success', 'Menu item updated successfully');
      // Refresh the menu items list
      await fetchMenuItems();
      // Close the modal
      closeCreateModal();
    } catch (error) {
      showToast('error', error.message || 'Failed to update menu item');
    }
  };

  const handleRecipeSelection = (recipeId) => {
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
      syncMenuWithCategory(selectedRecipe.category);

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

  // New method for hybrid approach
  const onCategoryChange = async () => {
    if (menuItemForm.value.category) {
      // Reset menu assignment option when category changes
      menuAssignmentOption.value = 'auto';
      menuItemForm.value.menu_id = null;

      // Fetch available menus for this category
      await fetchAvailableMenusForCategory(menuItemForm.value.category);
    }
  };

  // Fetch available menus for a specific category
  const fetchAvailableMenusForCategory = async (category) => {
    try {
      const menus = await productionStore.fetchMenusByCategory(category);
      availableMenus.value = menus;
    } catch (error) {
      console.error('Error fetching menus for category:', error);
      availableMenus.value = [];
    }
  };

  // Create menu for category (Option 3)
  const createMenuForCategory = async () => {
    try {
      const menuData = {
        menu_name: `${menuItemForm.value.category} Menu`,
        category: menuItemForm.value.category,
        description: `Menu for ${menuItemForm.value.category} items`,
        is_active: true,
        created_by: userStore.user?.id || 1,
      };

      const newMenu = await productionStore.createMenu(menuData);

      // Switch to existing menu option and select the new menu
      menuAssignmentOption.value = 'existing';
      menuItemForm.value.menu_id = newMenu.id;

      // Refresh available menus
      await fetchAvailableMenusForCategory(menuItemForm.value.category);

      showToast('success', `Menu "${newMenu.menu_name}" created successfully!`);
    } catch (error) {
      console.error('Error creating menu:', error);
      showToast('error', 'Failed to create menu. Please try again.');
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
  });
</script>

<template>
  <div class="container mx-auto p-2 sm:p-4 lg:p-6 max-w-6xl">
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
          <ChefHat
            class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-primaryColor"
          />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">
          Total Menu Items
        </div>
        <div
          class="stat-value text-primaryColor text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ menuItemStats.total_items || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Menu items created
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
          <Package class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-info" />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">Menus</div>
        <div
          class="stat-value text-info text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ menuStats.total_menus || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Active menu categories
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <Star class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-warning" />
        </div>
        <div class="stat-title text-black/50 !text-xs sm:text-sm">Featured</div>
        <div
          class="stat-value text-warning text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          {{ menuItemStats.featured_items || 0 }}
        </div>
        <div class="stat-desc text-black/50 !text-xs sm:text-sm">
          Featured items
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
                            <li v-if="!item.is_available">
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
                  class="input input-bordered w-full pl-10"
                />
              </div>
            </div>
            <div class="flex gap-2">
              <select v-model="categoryFilter" class="select select-bordered">
                <option value="">All Categories</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Sizzling Plates">Sizzling Plates</option>
                <option value="Steaks">Steaks</option>
                <option value="Sides">Sides</option>
                <option value="Beverages">Beverages</option>
              </select>
              <select v-model="statusFilter" class="select select-bordered">
                <option value="">All Status</option>
                <option value="available">Available</option>
                <option value="draft">Draft</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
          </div>

          <!-- Menu Items Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="item in paginatedMenuItems"
              :key="item.id"
              class="card bg-white border border-gray-200 hover:shadow-xl duration-300 cursor-pointer"
              @click="openDetailsModal(item)"
            >
              <div class="card-body p-6">
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <h3
                      class="card-title text-lg font-bold text-primaryColor mb-2"
                    >
                      {{ item.item_name }}
                    </h3>
                    <p class="text-sm text-gray-600 mb-2">
                      {{ item.recipe_name }}
                    </p>
                    <div class="flex items-center gap-2 mb-3">
                      <span
                        class="badge badge-sm"
                        :class="getStatusBadgeClass(item.is_available)"
                      >
                        {{ getStatusText(item.is_available) }}
                      </span>
                      <span class="badge badge-sm bg-gray-100 text-gray-600">
                        {{ item.category }}
                      </span>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-lg font-bold text-primaryColor">
                      {{ formatCurrency(item.selling_price) }}
                    </div>
                    <div class="text-xs text-gray-500">
                      {{
                        calculateProfitMargin(
                          item.selling_price,
                          item.cost_price
                        )
                      }}% margin
                    </div>
                  </div>
                </div>

                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4 text-sm text-gray-600">
                    <div class="flex items-center gap-1">
                      <Clock class="w-4 h-4" />
                      {{ item.preparation_time_minutes }}m
                    </div>
                    <div class="flex items-center gap-1">
                      <Users class="w-4 h-4" />
                      <span class="text-xs">
                        <span class="font-medium">1 serving</span>
                        <span class="text-gray-500"
                          >/ {{ item.recipe_batch_size || 'N/A' }} batch</span
                        >
                      </span>
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
                          @click.stop.prevent="openDetailsModal(item)"
                          @mousedown.stop
                          class="text-sm"
                        >
                          <Eye class="w-3 h-3 mr-2" />
                          View Details
                        </button>
                      </li>

                      <!-- Approve (only for draft items) -->
                      <li v-if="!item.is_available">
                        <button
                          @click.stop.prevent="approveMenuItem(item.id)"
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
                  >Recipe <span class="text-red-500">*</span></span
                >
              </label>
              <select
                v-model="menuItemForm.recipe_id"
                @change="handleRecipeSelection(menuItemForm.recipe_id)"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                required
                placeholder="Select Recipe"
              >
                <option value="" disabled>Select Recipe</option>
                <option
                  v-for="recipe in availableRecipes"
                  :key="recipe.id"
                  :value="recipe.id"
                >
                  {{ recipe.recipe_name }} ({{ recipe.category }})
                </option>
              </select>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                  >Menu Item Name <span class="text-red-500">*</span></span
                >
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
                  >Food Category <span class="text-red-500">*</span></span
                >
              </label>
              <select
                v-model="menuItemForm.category"
                @change="onCategoryChange"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                required
              >
                <option value="">Select Category</option>
                <option v-for="cat in recipeCategories" :key="cat" :value="cat">
                  {{ cat }}
                </option>
              </select>
            </div>
          </div>

          <!-- Menu Assignment Options -->
          <div
            class="grid grid-cols-1 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
            v-if="menuItemForm.category"
          >
            <div class="form-control">
              <label class="label mb-2">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                >
                  Menu Assignment Strategy
                </span>
              </label>

              <!-- Option 1: Use existing menu -->
              <div class="flex items-center mb-3">
                <input
                  type="radio"
                  id="useExistingMenu"
                  v-model="menuAssignmentOption"
                  value="existing"
                  class="radio radio-xs checked:text-primaryColor mr-3"
                />
                <label
                  for="useExistingMenu"
                  class="text-sm text-black/70 cursor-pointer"
                >
                  Use existing menu for "{{ menuItemForm.category }}"
                </label>
              </div>

              <!-- Option 2: Auto-create menu -->
              <div class="flex items-center mb-3">
                <input
                  type="radio"
                  id="autoCreateMenu"
                  v-model="menuAssignmentOption"
                  value="auto"
                  class="radio radio-xs checked:text-primaryColor mr-3"
                />
                <label
                  for="autoCreateMenu"
                  class="text-sm text-black/70 cursor-pointer"
                >
                  Auto-create new menu for "{{ menuItemForm.category }}"
                </label>
              </div>

              <!-- Option 3: Create menu first -->
              <div class="flex items-center mb-3">
                <input
                  type="radio"
                  id="createMenuFirst"
                  v-model="menuAssignmentOption"
                  value="manual"
                  class="radio radio-xs checked:text-primaryColor mr-3"
                />
                <label
                  for="createMenuFirst"
                  class="text-sm text-black/70 cursor-pointer"
                >
                  Create menu first, then add items
                </label>
              </div>
            </div>

            <!-- Existing Menu Selection (when Option 1 is selected) -->
            <div v-if="menuAssignmentOption === 'existing'" class="mt-4">
              <label class="label mb-2">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                >
                  Select Existing Menu
                </span>
              </label>
              <select
                v-model="menuItemForm.menu_id"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                required
              >
                <option value="">Select Menu</option>
                <option
                  v-for="menu in availableMenus"
                  :key="menu.id"
                  :value="menu.id"
                >
                  {{ menu.menu_name }} ({{ menu.category }})
                </option>
              </select>
              <p class="text-xs text-black/40 mt-2">
                Available menus for category: "{{ menuItemForm.category }}"
              </p>
            </div>

            <!-- Manual Menu Creation (when Option 3 is selected) -->
            <div
              v-if="menuAssignmentOption === 'manual'"
              class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <h4 class="font-medium text-blue-800 mb-2">Create Menu First</h4>
              <p class="text-sm text-blue-700 mb-3">
                Please create a menu for category "{{ menuItemForm.category }}"
                before adding menu items.
              </p>
              <button
                type="button"
                @click="createMenuForCategory"
                class="btn bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80 btn-sm"
              >
                Create Menu for {{ menuItemForm.category }}
              </button>
            </div>

            <!-- Auto-create info (when Option 2 is selected) -->
            <div
              v-if="menuAssignmentOption === 'auto'"
              class="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg"
            >
              <h4 class="font-medium text-green-800 mb-2">Auto-Create Menu</h4>
              <p class="text-sm text-green-700">
                A new menu will be automatically created for category "{{
                  menuItemForm.category
                }}" when you create this menu item.
              </p>
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
                  <span class="text-primaryColor"
                    >{{ selectedRecipe?.batch_size || 'N/A' }}
                    {{ selectedRecipe?.batch_unit || 'servings' }}</span
                  >
                </div>
                <div class="text-sm text-gray-700 mt-1">
                  <span class="font-medium">Serving Size:</span>
                  <span class="text-success">1 serving per customer</span>
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
            class="bg-blue-50 border border-blue-200 p-4 rounded-xl"
            v-if="selectedRecipe"
          >
            <h4 class="font-semibold text-blue-800 mb-3">
              <font-awesome-icon icon="fa-solid fa-gears" />
              Production Planning Helper
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div class="bg-white p-3 rounded-lg border border-blue-200">
                <div class="font-medium text-blue-800">Batch Size</div>
                <div class="text-lg font-bold text-blue-600">
                  {{ selectedRecipe.batch_size }}
                  {{ selectedRecipe.batch_unit }}
                </div>
              </div>
              <div class="bg-white p-3 rounded-lg border border-blue-200">
                <div class="font-medium text-blue-800">Cost per Batch</div>
                <div class="text-lg font-bold text-blue-600">
                  {{ formatCurrency(selectedRecipe.cost_per_batch || 0) }}
                </div>
              </div>
              <div class="bg-white p-3 rounded-lg border border-blue-200">
                <div class="font-medium text-blue-800">Cost per Serving</div>
                <div class="text-lg font-bold text-blue-600">
                  {{ formatCurrency(recipeCostInfo.costPerServing || 0) }}
                </div>
              </div>
            </div>
            <div class="mt-3 text-xs text-blue-700">
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

          <!-- Tags -->
          <div
            class="form-control bg-white border border-black/10 p-4 rounded-xl"
          >
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
                >Tags</span
              >
            </label>
            <input
              v-model="menuItemForm.tags"
              type="text"
              class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              placeholder="e.g., popular, signature, seasonal"
            />
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
          >
            Confirm
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeConfirmModal">close</button>
      </form>
    </dialog>

    <!-- Menu Item Details Modal -->
    <div v-if="showDetailsModal && selectedMenuItem" class="modal modal-open">
      <div class="modal-box max-w-4xl">
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
                  <span class="text-gray-600">Profit Margin:</span>
                  <span class="font-medium text-primaryColor">
                    {{
                      calculateProfitMargin(
                        selectedMenuItem.selling_price,
                        selectedMenuItem.cost_price
                      )
                    }}%
                  </span>
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

          <!-- Recipe Ingredients Preview -->
          <div>
            <h4 class="font-semibold text-primaryColor mb-3">
              Recipe Ingredients
            </h4>
            <div class="bg-gray-50 p-4 rounded-lg">
              <p class="text-sm text-gray-600 mb-2">
                This menu item is based on the "{{
                  selectedMenuItem.recipe_name
                }}" recipe. Full ingredient details available in Recipe
                Management.
              </p>
              <button
                @click="$router.push('/production/recipes')"
                class="btn btn-outline btn-sm font-thin text-primaryColor hover:bg-primaryColor/10"
              >
                View Recipe Details
              </button>
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
          >
            <CheckCircle class="w-4 h-4 mr-2" />
            Approve for Production
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
