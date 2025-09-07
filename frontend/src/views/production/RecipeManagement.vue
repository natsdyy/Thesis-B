<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import {
    ChefHat,
    Plus,
    Search,
    Filter,
    Clock,
    PhilippinePeso,
    Users,
    CheckCircle,
    AlertTriangle,
    RefreshCcw,
    Eye,
    Edit,
    Trash2,
    Star,
    BookOpen,
    Utensils,
    Scale,
    Timer,
    X,
    Package,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';
  import {
    recipeCategories,
    batchUnits,
  } from '../../config/productionCategories.js';
  import { useInventoryStore } from '../../stores/inventoryStore.js';
  import { useAuthStore } from '../../stores/authStore.js';

  const productionStore = useProductionStore();
  const inventoryStore = useInventoryStore();
  const authStore = useAuthStore();

  // Reactive state
  const searchQuery = ref('');
  const categoryFilter = ref('');

  const activeFilter = ref('');

  // Form data
  const recipeForm = ref({
    recipe_name: '',
    description: '',
    category: '',
    batch_size: '',
    batch_unit: 'servings',
    instructions: '',
    is_active: true,
    cost_per_batch: '',
  });

  const ingredientForm = ref({
    inventory_item_id: '',
    quantity_required: '',
    unit: '',
    cost_per_unit: '',
    preparation_notes: '',
    is_optional: false,
    sequence_order: 1,
  });

  // Auto-populate ingredient details when selected
  const handleIngredientSelection = (inventoryItemId) => {
    if (!inventoryItemId) {
      resetIngredientForm();
      return;
    }

    const selectedItem = foodIngredients.value.find(
      (item) => item.id === inventoryItemId
    );
    if (selectedItem) {
      console.log('Selected ingredient data:', selectedItem); // Debug log

      // Auto-populate with inventory data
      ingredientForm.value.unit = selectedItem.unit_of_measure || 'pieces';
      ingredientForm.value.cost_per_unit = selectedItem.unit_cost || 0;

      // Set default quantity to 1, but don't exceed available stock
      const availableStock = selectedItem.quantity || 0;
      ingredientForm.value.quantity_required = Math.min(1, availableStock);

      console.log('Populated form:', ingredientForm.value); // Debug log
    }
  };

  const ingredients = ref([]);

  // Constants
  const recipeStatuses = ['Active', 'Inactive', 'Draft'];
  // imported from shared config

  // Helper functions
  const getStatusColor = (status) => {
    const colors = {
      Active:
        'badge badge-sm border-none font-medium bg-success/20 text-success',
      Inactive: 'badge badge-sm border-none font-medium bg-error/20 text-error',
      Draft:
        'badge badge-sm border-none font-medium bg-warning/20 text-warning',
    };
    return (
      colors[status] ||
      'badge badge-sm border-none font-medium bg-neutral/20 text-neutral'
    );
  };

  // Local state
  const loading = ref(false);
  const currentPage = ref(1);
  const recipesPerPage = ref(6);

  // Modal state
  const modal = ref({ type: null, show: false, recipe: null });
  const confirmModal = ref({
    show: false,
    type: '',
    title: '',
    message: '',
    recipe: null,
    onConfirm: null,
  });

  // Toast state
  const toast = ref({ show: false, type: '', message: '' });
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => {
      toast.value.show = false;
    }, 3000);
  };

  // Computed properties
  const filteredRecipes = computed(() => {
    let filtered = recipes.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (recipe) =>
          recipe.recipe_name.toLowerCase().includes(query) ||
          recipe.recipe_code?.toLowerCase().includes(query) ||
          recipe.description?.toLowerCase().includes(query)
      );
    }

    if (categoryFilter.value) {
      filtered = filtered.filter(
        (recipe) => recipe.category === categoryFilter.value
      );
    }

    if (activeFilter.value) {
      const isActive = activeFilter.value === 'true';
      filtered = filtered.filter((recipe) => recipe.is_active === isActive);
    }

    return filtered;
  });

  const paginatedRecipes = computed(() => {
    const start = (currentPage.value - 1) * recipesPerPage.value;
    return filteredRecipes.value.slice(start, start + recipesPerPage.value);
  });

  const totalPages = computed(() =>
    Math.ceil(filteredRecipes.value.length / recipesPerPage.value)
  );

  // Deleted recipes pagination
  const deletedPage = ref(1);
  const deletedPerPage = ref(8);
  const paginatedDeletedRecipes = computed(() => {
    const start = (deletedPage.value - 1) * deletedPerPage.value;
    return deletedRecipes.value.slice(start, start + deletedPerPage.value);
  });
  const totalDeletedPages = computed(() =>
    Math.ceil((deletedRecipes.value?.length || 0) / deletedPerPage.value)
  );

  const uniqueCategories = computed(() => {
    const categoryNames = [
      ...new Set(recipes.value.map((recipe) => recipe.category)),
    ];
    return categoryNames.sort();
  });

  // Access store data
  const recipes = computed(() => productionStore.recipes);
  const categories = computed(() => inventoryStore.categories);
  const itemTypes = computed(() => inventoryStore.currentInventory);
  const recipeStats = computed(() => productionStore.recipeStats);
  const deletedRecipes = computed(() => productionStore.deletedRecipes);

  // Loading states
  const statsLoading = computed(() => productionStore.loading);

  // Current user info
  const currentUser = computed(() => authStore.user);
  const isUserAuthenticated = computed(() => authStore.isAuthenticated);

  // Auto-calculate total cost per batch based on ingredients
  const totalCostPerBatch = computed(() => {
    if (!ingredients.value || ingredients.value.length === 0) return 0;

    return ingredients.value.reduce((total, ingredient) => {
      const quantity = parseFloat(ingredient.quantity_required || 0);
      const costPerUnit = parseFloat(ingredient.cost_per_unit || 0);
      return total + quantity * costPerUnit;
    }, 0);
  });

  // Filter inventory items to only show food-related ingredients (excluding expired)
  const foodIngredients = computed(() => {
    if (!itemTypes.value || itemTypes.value.length === 0) return [];

    // Food-related category names: "Beverages" and "Materials"
    const foodCategoryNames = ['Beverages', 'Materials'];

    const filtered = itemTypes.value.filter((item) => {
      // Only include food-related categories
      const isFoodCategory = foodCategoryNames.includes(item.category_name);

      // Exclude expired items
      const isNotExpired = item.status !== 'expired';

      // Exclude items with quantity 0 (disposed)
      const hasStock = (item.quantity || 0) > 0;

      // Check if item is expiring soon (within 7 days) for warning
      const isExpiringSoon = item.expiry_date
        ? new Date(item.expiry_date) - new Date() <= 7 * 24 * 60 * 60 * 1000
        : false;

      return isFoodCategory && isNotExpired && hasStock;
    });

    console.log('All inventory items:', itemTypes.value); // Debug log
    console.log('Filtered food ingredients (excluding expired):', filtered); // Debug log

    return filtered;
  });

  // Methods
  const refreshData = async () => {
    try {
      // Check authentication before fetching data
      if (!isUserAuthenticated.value || !currentUser.value?.id) {
        showToast('error', 'Please log in to access recipe management');
        return;
      }

      loading.value = true;

      await Promise.all([
        productionStore.fetchRecipes(),
        productionStore.fetchRecipeStats(),
        inventoryStore.fetchCategories(),
        inventoryStore.fetchCurrentInventory(),
        productionStore.fetchDeletedRecipes(),
      ]);

      console.log(
        'Inventory store state after refresh:',
        inventoryStore.currentInventory
      ); // Debug log
      showToast('success', 'Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      showToast('error', 'Failed to refresh data');
    } finally {
      loading.value = false;
    }
  };

  const clearFilters = () => {
    searchQuery.value = '';
    categoryFilter.value = '';

    activeFilter.value = '';
    currentPage.value = 1;
  };

  // Modal methods
  const openModal = async (type, recipe = null) => {
    console.log('=== OPEN MODAL CALLED ===');
    console.log('Type:', type);
    console.log('Recipe:', recipe);
    console.log('Recipe ID:', recipe?.id);
    console.log('Recipe ingredients:', recipe?.ingredients);

    // Check authentication for create/edit operations
    if ((type === 'create' || type === 'edit') && !isUserAuthenticated.value) {
      showToast('error', 'Please log in to manage recipes');
      return;
    }

    // If opening stock check from view/edit, do NOT change modal.type so the
    // main modal remains closable. Just ensure the recipe context is present
    // and open the overlay modal.
    if (type === 'check-stock') {
      try {
        loading.value = true;
        let recipeForStock = recipe || modal.value.recipe;

        // If we do not have ingredients, fetch full recipe details
        if (
          recipeForStock &&
          (!recipeForStock.ingredients ||
            recipeForStock.ingredients.length === 0)
        ) {
          const fullRecipe = await productionStore.getRecipeById(
            recipeForStock.id
          );
          recipeForStock = {
            ...fullRecipe,
            ingredients: fullRecipe.ingredients || [],
          };
        }

        // Preserve main modal type and just set the recipe context
        modal.value = { ...modal.value, recipe: recipeForStock, show: true };
      } catch (err) {
        console.error('Failed to load recipe for stock check:', err);
        showToast('error', 'Failed to load stock details');
      } finally {
        loading.value = false;
      }

      document.getElementById('check_stock_modal').showModal();
      return;
    }

    // Store the original modal type for the main recipe modal
    const originalType = type === 'add-ingredient' ? modal.value.type : type;

    // For view and edit modals, fetch full recipe details including ingredients
    if ((type === 'view' || type === 'edit') && recipe) {
      try {
        const fullRecipe = await productionStore.getRecipeById(recipe.id);
        console.log('Full recipe fetched:', fullRecipe);
        console.log('Full recipe ingredients:', fullRecipe.ingredients);

        // Ensure ingredients are properly assigned to the modal recipe
        modal.value = {
          type: originalType,
          show: true,
          recipe: {
            ...fullRecipe,
            ingredients: fullRecipe.ingredients || [],
          },
        };

        // Use the fetched fullRecipe data for form population
        recipeForm.value = {
          recipe_name: fullRecipe.recipe_name || '',
          description: fullRecipe.description || '',
          category: fullRecipe.category || '',
          batch_size: fullRecipe.batch_size || '',
          batch_unit: fullRecipe.batch_unit || 'servings',
          instructions: fullRecipe.instructions || '',
          is_active:
            fullRecipe.is_active !== undefined ? fullRecipe.is_active : true,
          cost_per_batch: fullRecipe.cost_per_batch || '',
        };

        // Also load ingredients into the form for consistency
        if (fullRecipe.ingredients && fullRecipe.ingredients.length > 0) {
          ingredients.value = [...fullRecipe.ingredients];
          console.log(
            'Loaded ingredients from full recipe:',
            ingredients.value
          );
          // Debug: Log the first ingredient to see its structure
          if (fullRecipe.ingredients.length > 0) {
            console.log(
              'First ingredient structure:',
              fullRecipe.ingredients[0]
            );
            console.log(
              'Available fields:',
              Object.keys(fullRecipe.ingredients[0])
            );
          }
        } else {
          ingredients.value = [];
          console.log(
            'No ingredients found in full recipe, resetting to empty array'
          );
        }
      } catch (error) {
        showToast('error', 'Failed to load recipe details');
        console.error('Error loading recipe details:', error);
        return;
      }
    } else if (type === 'add-ingredient' && recipe) {
      // For ingredient modal, preserve the current recipe context
      modal.value = { type: originalType, show: true, recipe };
    } else {
      modal.value = { type: originalType, show: true, recipe };
    }

    // Only populate form if not already handled by full recipe fetch
    if (recipe && type !== 'view' && type !== 'edit') {
      recipeForm.value = {
        recipe_name: recipe.recipe_name || '',
        description: recipe.description || '',
        category: recipe.category || '',
        batch_size: recipe.batch_size || '',
        batch_unit: recipe.batch_unit || 'servings',
        instructions: recipe.instructions || '',
        is_active: recipe.is_active !== undefined ? recipe.is_active : true,
        cost_per_batch: recipe.cost_per_batch || '',
      };

      // Load ingredients if editing
      console.log('Recipe data when opening modal:', recipe);
      console.log('Recipe ingredients:', recipe.ingredients);
      if (recipe.ingredients) {
        ingredients.value = [...recipe.ingredients];
        console.log('Loaded ingredients into form:', ingredients.value);
      } else {
        ingredients.value = [];
        console.log('No ingredients found, resetting to empty array');
      }
    } else if (
      type !== 'add-ingredient' &&
      type !== 'view' &&
      type !== 'edit'
    ) {
      // Only reset form if we're not opening the ingredient modal or view modal
      resetForm();
    }

    // Debug log for ingredient modal
    if (type === 'add-ingredient') {
      console.log(
        'Opening ingredient modal. Current ingredients:',
        ingredients.value
      );
    }

    // Open the appropriate modal based on type
    if (type === 'create' || type === 'edit') {
      document.getElementById('recipe_modal').showModal();
    } else if (type === 'view') {
      document.getElementById('view_recipe_modal').showModal();
    } else if (type === 'add-ingredient') {
      document.getElementById('add_ingredient_modal').showModal();
    }
  };

  const closeModal = () => {
    const currentModalType = modal.value.type;

    // Close the appropriate modal based on type
    if (currentModalType === 'create' || currentModalType === 'edit') {
      document.getElementById('recipe_modal')?.close();
    } else if (currentModalType === 'view') {
      document.getElementById('view_recipe_modal')?.close();
    } else if (currentModalType === 'add-ingredient') {
      document.getElementById('add_ingredient_modal')?.close();
    }

    modal.value = { type: null, show: false, recipe: null };

    // Only reset form if we're closing the main recipe modal, not the ingredient modal
    if (currentModalType !== 'add-ingredient') {
      resetForm();
    }
  };

  const closeIngredientModal = () => {
    // Close only the ingredient modal without affecting the main recipe modal
    document.getElementById('add_ingredient_modal')?.close();
    resetIngredientForm();

    console.log(
      'Ingredient modal closed. Current ingredients:',
      ingredients.value
    ); // Debug log
  };

  const closeCheckStockModal = () => {
    // Close only the check stock modal without altering main modal state
    document.getElementById('check_stock_modal')?.close();
  };

  const resetForm = () => {
    recipeForm.value = {
      recipe_name: '',
      description: '',
      category: '',
      batch_size: '',
      batch_unit: 'servings',
      instructions: '',
      is_active: true,
      cost_per_batch: '',
    };
    ingredients.value = [];
  };

  const resetIngredientForm = () => {
    ingredientForm.value = {
      inventory_item_id: '',
      quantity_required: '',
      unit: '',
      cost_per_unit: '',
      preparation_notes: '',
      is_optional: false,
      sequence_order: ingredients.value.length + 1,
    };
  };

  // CRUD operations
  const handleCreateRecipe = async () => {
    loading.value = true;
    try {
      // Check if user is authenticated
      if (!authStore.isAuthenticated || !authStore.user?.id) {
        showToast('error', 'Please log in to create recipes');
        return;
      }

      if (!recipeForm.value.recipe_name.trim()) {
        showToast('error', 'Please enter recipe name');
        return;
      }
      if (!recipeForm.value.category) {
        showToast('error', 'Please select a category');
        return;
      }
      if (!recipeForm.value.batch_size) {
        showToast('error', 'Please enter batch size');
        return;
      }

      const recipeData = {
        ...recipeForm.value,
        cost_per_batch: totalCostPerBatch.value, // Use auto-calculated cost
        created_by: authStore.user.id, // Using current authenticated user ID
      };

      await productionStore.createRecipe(recipeData, ingredients.value);
      closeModal();
      showToast('success', 'Recipe created successfully');
    } catch (err) {
      showToast('error', err.message || 'Failed to create recipe');
    } finally {
      loading.value = false;
    }
  };

  const handleUpdateRecipe = async () => {
    loading.value = true;
    try {
      if (!recipeForm.value.recipe_name.trim()) {
        showToast('error', 'Please enter recipe name');
        return;
      }
      if (!recipeForm.value.category) {
        showToast('error', 'Please select a category');
        return;
      }
      if (!recipeForm.value.batch_size) {
        showToast('error', 'Please enter batch size');
        return;
      }

      const originalRecipe = modal.value.recipe;
      if (!originalRecipe || !originalRecipe.id) {
        showToast('error', 'Invalid recipe data');
        return;
      }

      const updatedData = {
        ...recipeForm.value,
        cost_per_batch: totalCostPerBatch.value, // Use auto-calculated cost
      };

      console.log('Ingredients being sent to updateRecipe:', ingredients.value);
      console.log('First ingredient details:', ingredients.value[0]);
      console.log(
        'First ingredient ingredient_name field:',
        ingredients.value[0]?.ingredient_name
      );
      console.log('Updated data being sent:', updatedData);

      await productionStore.updateRecipe(
        originalRecipe.id,
        updatedData,
        ingredients.value
      );
      closeModal();
      showToast('success', 'Recipe updated successfully');
    } catch (err) {
      showToast('error', err.message || 'Failed to update recipe');
    } finally {
      loading.value = false;
    }
  };

  const handleDeleteRecipe = async (recipe) => {
    loading.value = true;
    try {
      await productionStore.deleteRecipe(recipe.id);
      showToast('success', 'Recipe moved to deleted');
    } catch (err) {
      showToast('error', err.message || 'Failed to delete recipe');
    } finally {
      loading.value = false;
    }
  };

  const handleRestoreRecipe = async (recipe) => {
    loading.value = true;
    try {
      await productionStore.restoreRecipe(recipe.id);
      showToast('success', 'Recipe restored successfully');
      await productionStore.fetchDeletedRecipes();
    } catch (err) {
      showToast('error', err.message || 'Failed to restore recipe');
    } finally {
      loading.value = false;
    }
  };

  // Confirmation modal methods
  const openConfirmModal = (type, recipe) => {
    const configs = {
      delete: {
        title: 'Delete Recipe',
        message: `Are you sure you want to delete ${recipe?.recipe_name}? This action cannot be undone.`,
        onConfirm: () => handleDeleteRecipe(recipe),
      },
      create: {
        title: 'Create Recipe',
        message: `Are you sure you want to create recipe ${recipeForm.value.recipe_name}?`,
        onConfirm: () => handleCreateRecipe(),
      },
      update: {
        title: 'Update Recipe',
        message: `Are you sure you want to update ${recipeForm.value.recipe_name}?`,
        onConfirm: () => handleUpdateRecipe(),
      },
    };

    const config = configs[type];
    confirmModal.value = {
      show: true,
      type,
      title: config.title,
      message: config.message,
      recipe,
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
      recipe: null,
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

  // Wrapper confirmation methods
  const showCreateConfirmation = () => {
    if (!recipeForm.value.recipe_name.trim()) {
      showToast('error', 'Please enter recipe name');
      return;
    }
    if (!recipeForm.value.category) {
      showToast('error', 'Please select a category');
      return;
    }
    if (!recipeForm.value.batch_size) {
      showToast('error', 'Please enter batch size');
      return;
    }

    openConfirmModal('create');
  };

  const showUpdateConfirmation = () => {
    if (!recipeForm.value.recipe_name.trim()) {
      showToast('error', 'Please enter recipe name');
      return;
    }
    if (!recipeForm.value.category) {
      showToast('error', 'Please select a category');
      return;
    }
    if (!recipeForm.value.batch_size) {
      showToast('error', 'Please enter batch size');
      return;
    }

    openConfirmModal('update');
  };

  const showDeleteConfirmation = (recipe) => {
    openConfirmModal('delete', recipe);
  };

  // Ingredient methods
  const addIngredient = () => {
    if (!ingredientForm.value.inventory_item_id) {
      showToast('error', 'Please select an ingredient');
      return;
    }
    if (
      !ingredientForm.value.quantity_required ||
      ingredientForm.value.quantity_required <= 0
    ) {
      showToast('error', 'Please enter a valid quantity');
      return;
    }

    // Check if requested quantity exceeds available stock
    const availableStock = getSelectedIngredientStock();
    if (ingredientForm.value.quantity_required > availableStock) {
      showToast(
        'error',
        `Requested quantity (${ingredientForm.value.quantity_required}) exceeds available stock (${availableStock})`
      );
      return;
    }

    if (!ingredientForm.value.unit) {
      showToast('error', 'Please enter unit');
      return;
    }

    // Get the selected ingredient details to store the actual name
    const selectedIngredient = foodIngredients.value.find(
      (item) => item.id === ingredientForm.value.inventory_item_id
    );

    const newIngredient = {
      ...ingredientForm.value,
      id: Date.now(), // Temporary ID for frontend
      // Map the fields correctly for backend compatibility
      inventory_item_id: ingredientForm.value.inventory_item_id, // This now stores the actual inventory item ID
      quantity_required: ingredientForm.value.quantity_required,
      unit_of_measure: ingredientForm.value.unit, // Map 'unit' to 'unit_of_measure'
      cost_per_unit: ingredientForm.value.cost_per_unit,
      preparation_notes: ingredientForm.value.preparation_notes,
      is_optional: ingredientForm.value.is_optional,
      sequence_order: ingredientForm.value.sequence_order,
    };

    ingredients.value.push(newIngredient);

    console.log('Ingredient added. Current ingredients:', ingredients.value); // Debug log

    showToast('success', 'Ingredient added successfully');

    // Close the ingredient modal after adding
    closeIngredientModal();
  };

  const removeIngredient = (index) => {
    ingredients.value.splice(index, 1);
    // Update sequence order
    ingredients.value.forEach((ingredient, idx) => {
      ingredient.sequence_order = idx + 1;
    });
    showToast('success', 'Ingredient removed successfully');
  };

  const getItemTypeName = (inventoryItemId) => {
    const itemType = foodIngredients.value.find(
      (type) => type.id === inventoryItemId
    );
    return itemType ? itemType.item_name : 'Unknown Item';
  };

  const getSelectedIngredientStock = () => {
    if (!ingredientForm.value.inventory_item_id) return 0;
    const selectedItem = foodIngredients.value.find(
      (item) => item.id === ingredientForm.value.inventory_item_id
    );
    return selectedItem ? selectedItem.quantity || 0 : 0;
  };

  const getSelectedIngredient = () => {
    if (!ingredientForm.value.inventory_item_id) return null;
    return foodIngredients.value.find(
      (item) => item.id === ingredientForm.value.inventory_item_id
    );
  };

  // Helpers for Check Stock modal
  const getInventoryItemById = (inventoryItemId) => {
    if (!inventoryItemId) return null;
    return (
      foodIngredients.value.find((item) => item.id === inventoryItemId) ||
      itemTypes.value?.find?.((item) => item.id === inventoryItemId) ||
      null
    );
  };

  const getStockForIngredient = (ingredient) => {
    const inventoryItem = getInventoryItemById(ingredient?.inventory_item_id);
    const quantityInStock = Number(inventoryItem?.quantity || 0);
    const unit =
      ingredient?.unit_of_measure ||
      ingredient?.unit ||
      inventoryItem?.unit_of_measure ||
      'units';
    return { quantityInStock, unit };
  };

  const formatQuantity = (value) => {
    const num = Number(value || 0);
    if (Number.isNaN(num)) return '0';
    // Show up to 3 decimals, but avoid trailing zeros
    const fixed = num.toFixed(3);
    return fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  };

  const formatCurrency = (value) => {
    const num = Number(value ?? 0);
    if (!Number.isFinite(num)) return '0.00';
    return num.toFixed(2);
  };

  // Helper function to check if ingredient is expiring soon
  const isIngredientExpiringSoon = (ingredient) => {
    if (!ingredient.expiry_date) return false;
    const expiryDate = new Date(ingredient.expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate - today) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  };

  // Helper function to get expiry warning message
  const getExpiryWarning = (ingredient) => {
    if (!ingredient.expiry_date) return null;
    const expiryDate = new Date(ingredient.expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiryDate - today) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry <= 0) return 'EXPIRED';
    if (daysUntilExpiry <= 3)
      return `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`;
    if (daysUntilExpiry <= 7) return `Expires in ${daysUntilExpiry} days`;
    return null;
  };

  // Watch for ingredient changes to update cost in real-time
  watch(
    () => ingredients.value,
    () => {
      // Cost is automatically updated via computed property
      console.log(
        'Ingredients changed, total cost updated to:',
        totalCostPerBatch.value
      );
    },
    { deep: true }
  );

  // Lifecycle
  onMounted(async () => {
    // Check if user is authenticated before loading data
    if (!isUserAuthenticated.value) {
      showToast('error', 'Please log in to access recipe management');
      return;
    }

    await refreshData();
  });
</script>

<template>
  <div class="container mx-auto p-2 sm:p-4 lg:p-6 max-w-6xl">
    <!-- Header -->
    <div class="text-center mb-4 sm:mb-6 lg:mb-8">
      <h1
        class="text-2xl sm:text-3xl lg:text-4xl font-bold text-primaryColor mb-2 text-shadow-xs"
      >
        Recipe Management
      </h1>
      <p class="text-sm sm:text-base text-black/50 px-2">
        Manage and track recipes for Countryside Steakhouse production.
      </p>
      <!-- Current User Info -->
      <div v-if="isUserAuthenticated && currentUser" class="mt-2">
        <span class="text-xs text-black/40">
          Logged in as:
          <span class="font-medium text-primaryColor">{{
            currentUser.name
          }}</span>
          <span v-if="currentUser.department" class="ml-2 text-black/30"
            >({{ currentUser.department }})</span
          >
        </span>
      </div>
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
        <div class="stat-title text-black/50 text-xs sm:text-sm">
          Total Recipes
        </div>
        <div
          class="stat-value text-primaryColor text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          <span
            v-if="!statsLoading && recipeStats?.total_recipes !== undefined"
            >{{ recipeStats.total_recipes }}</span
          >
          <span v-else class="loading loading-spinner loading-sm"></span>
        </div>
        <div class="stat-desc text-black/50 text-xs sm:text-sm">
          All recipes
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
        <div class="stat-title text-black/50 text-xs sm:text-sm">Active</div>
        <div
          class="stat-value text-success text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          <span
            v-if="!statsLoading && recipeStats?.active_recipes !== undefined"
            >{{ recipeStats.active_recipes }}</span
          >
          <span v-else class="loading loading-spinner loading-sm"></span>
        </div>
        <div class="stat-desc text-black/50 text-xs sm:text-sm">
          Currently active
        </div>
      </div>

      <div
        class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10"
      >
        <div class="stat-figure">
          <BookOpen class="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-info" />
        </div>
        <div class="stat-title text-black/50 text-xs sm:text-sm">
          Categories
        </div>
        <div
          class="stat-value text-info text-lg sm:text-xl lg:text-2xl xl:text-3xl"
        >
          <span
            v-if="!statsLoading && recipeStats?.total_categories !== undefined"
            >{{ recipeStats.total_categories }}</span
          >
          <span v-else class="loading loading-spinner loading-sm"></span>
        </div>
        <div class="stat-desc text-black/50 text-xs sm:text-sm">
          Recipe categories
        </div>
      </div>
    </div>

    <!-- Recipe List -->
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
            Recipes
          </h2>

          <!-- Mobile: Stacked buttons -->
          <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div class="grid grid-cols-1 sm:flex gap-2">
              <button
                class="btn btn-outline btn-xs sm:btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
                @click="refreshData"
                :disabled="loading"
              >
                <RefreshCcw
                  class="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-primaryColor"
                  :class="{ 'animate-spin': loading }"
                />
                <span class="hidden sm:inline">{{
                  loading ? 'Refreshing...' : 'Refresh Data'
                }}</span>
                <span class="sm:hidden">{{
                  loading ? 'Refreshing...' : 'Refresh'
                }}</span>
              </button>
            </div>
            <button
              class="btn btn-outline btn-xs sm:btn-sm text-primaryColor hover:bg-primaryColor/10 font-thin hover:border-none hover:shadow-none"
              @click="openModal('create')"
              :disabled="!isUserAuthenticated"
              :title="
                !isUserAuthenticated
                  ? 'Please log in to create recipes'
                  : 'Create new recipe'
              "
            >
              <Plus
                class="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-primaryColor"
              />
              Create Recipe
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
                placeholder="Search recipes..."
                class="input input-sm sm:input-md input-bordered bg-white border-primaryColor/30 text-black/70 pl-10 w-full shadow-none text-sm sm:text-base"
              />
            </div>
          </div>

          <!-- Filters Section -->
          <div
            class="mb-6 p-4 bg-white/5 rounded-lg border border-primaryColor/20"
          >
            <div
              class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
            >
              <!-- Current Status Display -->
              <div class="flex items-center gap-3">
                <Filter class="w-5 h-5 text-primaryColor" />
                <div>
                  <h3 class="font-semibold text-primaryColor">
                    Recipe Filters
                  </h3>
                  <p class="text-sm text-black/60">
                    Showing {{ filteredRecipes.length }} recipe{{
                      filteredRecipes.length !== 1 ? 's' : ''
                    }}
                  </p>
                </div>
              </div>

              <!-- Filter Controls -->
              <div class="flex flex-col sm:flex-row gap-3">
                <!-- Category Filter -->
                <select
                  v-model="categoryFilter"
                  class="select select-sm select-bordered bg-white border-primaryColor/30 text-black/70"
                >
                  <option value="">All Categories</option>
                  <option
                    v-for="category in uniqueCategories"
                    :key="category"
                    :value="category"
                  >
                    {{ category }}
                  </option>
                </select>

                <!-- Active Status Filter -->
                <select
                  v-model="activeFilter"
                  class="select !select-xs sm:!select-sm select-bordered bg-white border-primaryColor/30 text-black/70"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>

                <!-- Clear Filters Button -->
                <button
                  @click="clearFilters"
                  class="btn btn-sm btn-ghost text-primaryColor hover:bg-primaryColor/10 font-thin"
                >
                  <X class="w-4 h-4 mr-1" />
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="flex justify-center py-8">
          <span
            class="loading loading-spinner loading-lg text-primaryColor"
          ></span>
        </div>

        <!-- No Recipes State -->
        <div v-else-if="filteredRecipes.length === 0" class="text-center py-12">
          <ChefHat class="w-16 h-16 text-base-content/30 mx-auto mb-4" />
          <h3 class="text-lg font-semibold text-base-content/70 mb-2">
            No recipes found
          </h3>
          <p class="text-base-content/50 mb-4">
            {{
              searchQuery || categoryFilter || activeFilter
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by creating your first recipe.'
            }}
          </p>
          <button
            @click="openModal('create')"
            class="btn bg-primaryColor text-white hover:bg-primaryColor/80"
          >
            <Plus class="w-4 h-4 mr-2" />
            Create Recipe
          </button>
        </div>

        <!-- Recipe Grid -->
        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <div
            v-for="recipe in paginatedRecipes"
            :key="recipe.id"
            class="rounded-2xl border border-black/10 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-md transition-all cursor-pointer"
            @click="openModal('view', recipe)"
          >
            <!-- Header -->
            <div
              class="flex items-start justify-between p-5 pb-3 border-b border-black/5"
            >
              <div class="min-w-0">
                <h3 class="text-lg font-semibold text-primaryColor truncate">
                  {{ recipe.recipe_name }}
                </h3>
                <p class="mt-1 text-xs text-black/50 line-clamp-2">
                  {{ recipe.description || 'No description available' }}
                </p>
              </div>
              <span
                class="badge border-none bg-success/20 text-success badge-sm"
                :class="
                  getStatusColor(recipe.is_active ? 'Active' : 'Inactive')
                "
              >
                {{ recipe.is_active ? 'Active' : 'Inactive' }}
              </span>
            </div>

            <!-- Body -->
            <div class="p-5 grid grid-cols-1 gap-3">
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2 text-black/60">
                  <BookOpen class="w-4 h-4" />
                  <span>Category</span>
                </div>
                <span class="font-medium text-black/70">{{
                  recipe.category
                }}</span>
              </div>

              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2 text-black/60">
                  <Scale class="w-4 h-4" />
                  <span>Batch Size</span>
                </div>
                <span class="font-medium text-black/70"
                  >{{ recipe.batch_size }} {{ recipe.batch_unit }}</span
                >
              </div>

              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2 text-black/60">
                  <PhilippinePeso class="w-4 h-4" />
                  <span>Cost / batch</span>
                </div>
                <span class="font-semibold text-primaryColor"
                  >₱{{ recipe.cost_per_batch || '0' }}</span
                >
              </div>
            </div>

            <!-- Footer actions -->
            <div class="px-5 pb-5" @click.stop>
              <div class="grid grid-cols-4 gap-2">
                <button
                  @click="openModal('check-stock', recipe)"
                  class="btn btn-xs bg-white text-black/70 border border-black/20 hover:bg-primaryColor/10 hover:border-primaryColor/40 rounded-lg shadow-none"
                >
                  <Package class="w-4 h-4 mr-1 text-primaryColor" />
                  Stock
                </button>
                <button
                  @click="openModal('view', recipe)"
                  class="btn btn-xs bg-white text-black/70 border border-black/20 hover:bg-primaryColor/10 hover:border-primaryColor/40 rounded-lg shadow-none"
                >
                  <Eye class="w-4 h-4 mr-1 text-primaryColor" />
                  View
                </button>
                <button
                  @click="openModal('edit', recipe)"
                  class="btn btn-xs bg-white text-black/70 border border-black/20 hover:bg-primaryColor/10 hover:border-primaryColor/40 rounded-lg shadow-none"
                >
                  <Edit class="w-4 h-4 mr-1 text-primaryColor" />
                  Edit
                </button>
                <button
                  @click="showDeleteConfirmation(recipe)"
                  class="btn btn-xs bg-white text-error border border-error/30 hover:bg-error/10 hover:border-error/50 rounded-lg shadow-none font-thin"
                >
                  <Trash2 class="w-4 h-4 mr-1" />
                  Delete
                </button>
              </div>
            </div>
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
    </div>

    <!-- Deleted Recipes Section -->
    <div
      class="card bg-accentColor shadow-xl mb-4 sm:mb-6 border border-black/10 mx-auto"
    >
      <div class="card-body p-3 sm:p-4 lg:p-6">
        <div class="flex items-center justify-between mb-4">
          <h2
            class="card-title text-primaryColor text-lg sm:text-xl lg:text-2xl"
          >
            Deleted Recipes
          </h2>
          <button
            class="btn btn-xs bg-white text-black/70 border border-black/20 hover:bg-primaryColor/10 hover:border-primaryColor/40 rounded-lg shadow-none"
            @click="productionStore.fetchDeletedRecipes()"
            :disabled="loading"
          >
            Refresh
          </button>
        </div>

        <div v-if="deletedRecipes.length === 0" class="text-sm text-black/50">
          No deleted recipes.
        </div>
        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <div
            v-for="recipe in paginatedDeletedRecipes"
            :key="`deleted-${recipe.id}`"
            class="rounded-2xl border border-black/10 bg-white/90 p-4"
          >
            <div class="flex items-center justify-between">
              <div class="font-semibold text-primaryColor truncate">
                {{ recipe.recipe_name }}
              </div>
              <span class="badge badge-xs border-none bg-error/20 text-error">
                Deleted
              </span>
            </div>
            <div class="text-xs text-black/50 mt-1">
              {{ recipe.category }} • Batch: {{ recipe.batch_size }}
              {{ recipe.batch_unit }}
            </div>
            <div class="mt-3 flex justify-end">
              <button
                class="btn btn-xs bg-white text-black/70 border border-black/20 hover:bg-primaryColor/10 hover:border-primaryColor/40 rounded-lg shadow-none"
                @click.stop="() => handleRestoreRecipe(recipe)"
              >
                Restore
              </button>
            </div>
          </div>
        </div>

        <!-- Deleted pagination -->
        <div v-if="totalDeletedPages > 1" class="flex justify-center mt-6">
          <div class="btn-group">
            <button
              @click="deletedPage--"
              :disabled="deletedPage === 1"
              class="btn btn-sm"
            >
              Previous
            </button>
            <button class="btn btn-sm">{{ deletedPage }}</button>
            <button
              @click="deletedPage++"
              :disabled="deletedPage === totalDeletedPages"
              class="btn btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Recipe Modal -->
    <dialog id="recipe_modal" class="modal">
      <div
        class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/95 shadow-lg"
      >
        <h3
          class="font-bold text-xl text-primaryColor mb-4 border-b border-black/10 pb-3"
        >
          {{ modal.type === 'create' ? 'Create New Recipe' : 'Edit Recipe' }}
        </h3>

        <form
          @submit.prevent="
            modal.type === 'create'
              ? showCreateConfirmation()
              : showUpdateConfirmation()
          "
          class="space-y-6"
        >
          <!-- Basic Information -->
          <div
            class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
          >
            <!-- Recipe Name -->
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                >
                  Recipe Name <span class="text-red-500">*</span>
                </span>
              </label>
              <input
                v-model="recipeForm.recipe_name"
                type="text"
                placeholder="Enter recipe name"
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                required
              />
            </div>

            <!-- Category -->
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                >
                  Recipe Category <span class="text-red-500">*</span>
                </span>
              </label>
              <select
                v-model="recipeForm.category"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                required
              >
                <option value="">Select recipe category</option>
                <option
                  v-for="category in recipeCategories"
                  :key="category"
                  :value="category"
                >
                  {{ category }}
                </option>
              </select>
              <span class="text-xs text-gray-500 mt-1">
                Choose the type of dish this recipe creates
              </span>
            </div>

            <!-- Batch Size -->
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                >
                  Batch Size <span class="text-red-500">*</span>
                </span>
              </label>
              <div class="flex gap-3">
                <input
                  v-model="recipeForm.batch_size"
                  type="number"
                  placeholder="Size"
                  class="input input-sm sm:input-md input-bordered flex-1 bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  required
                />
                <select
                  v-model="recipeForm.batch_unit"
                  class="select select-sm sm:select-md select-bordered bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                >
                  <option v-for="unit in batchUnits" :key="unit" :value="unit">
                    {{ unit }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Cost per Batch (Auto-calculated) -->
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                >
                  Cost per Batch
                </span>
                <span class="text-xs text-gray-500 ml-2">
                  (Auto-calculated from ingredients)
                </span>
              </label>
              <div class="relative">
                <input
                  :value="totalCostPerBatch.toFixed(2)"
                  type="text"
                  readonly
                  class="input input-sm sm:input-md input-bordered w-full bg-gray-50 border-primaryColor/30 text-black/70 cursor-not-allowed"
                />
                <div
                  class="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <span class="text-primaryColor font-semibold">₱</span>
                </div>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                Total cost based on {{ ingredients.length }} ingredient{{
                  ingredients.length !== 1 ? 's' : ''
                }}
              </div>
            </div>

            <!-- Status -->
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                >
                  Status
                </span>
              </label>
              <select
                v-model="recipeForm.is_active"
                class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              >
                <option :value="true">Active</option>
                <option :value="false">Inactive</option>
              </select>
            </div>
          </div>

          <!-- Description -->
          <div
            class="form-control lg:col-span-2 bg-white border border-black/10 p-4 rounded-xl"
          >
            <label class="label">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Description
              </span>
            </label>
            <textarea
              v-model="recipeForm.description"
              placeholder="Describe the recipe..."
              class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              rows="3"
            ></textarea>
          </div>

          <!-- Instructions -->
          <div
            class="form-control lg:col-span-2 bg-white border border-black/10 p-4 rounded-xl"
          >
            <label class="label">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Instructions
              </span>
            </label>
            <textarea
              v-model="recipeForm.instructions"
              placeholder="Enter step-by-step instructions..."
              class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              rows="5"
            ></textarea>
          </div>

          <!-- Ingredients Section -->
          <div class="border-t pt-6">
            <div class="flex items-center justify-between mb-6">
              <h4 class="font-semibold text-primaryColor text-lg">
                Ingredients ({{ ingredients.length }})
              </h4>
              <button
                type="button"
                @click="openModal('add-ingredient', modal.recipe)"
                class="btn btn-sm bg-white text-black/70 border border-black/20 hover:bg-primaryColor/10 hover:border-primaryColor/40 rounded-lg shadow-none"
              >
                <Plus class="w-4 h-4 mr-2" />
                Add Ingredient
              </button>
            </div>

            <!-- Ingredients List -->
            <div
              v-if="ingredients.length === 0"
              class="text-center py-12 bg-base-100 rounded-lg border-2 border-dashed border-primaryColor/20"
            >
              <Package class="w-16 h-16 text-primaryColor/30 mx-auto mb-4" />
              <p class="text-base-content/70 text-lg mb-2">
                No ingredients added yet
              </p>
              <p class="text-base-content/50 text-sm">
                Click "Add Ingredient" to start building your recipe
              </p>
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="(ingredient, index) in ingredients"
                :key="ingredient.id"
                class="flex items-center justify-between p-4 bg-base-100 rounded-lg border border-primaryColor/10 hover:border-primaryColor/20 transition-colors"
              >
                <div class="flex-1">
                  <div class="font-medium text-base-content mb-1">
                    {{ getItemTypeName(ingredient.inventory_item_id) }}
                  </div>
                  <div class="text-sm text-base-content/70 mb-1">
                    <span class="font-medium"
                      >{{ ingredient.quantity_required }}
                      {{ ingredient.unit_of_measure }}</span
                    >
                    <span
                      v-if="ingredient.cost_per_unit"
                      class="ml-2 text-primaryColor"
                    >
                      • ₱{{ ingredient.cost_per_unit }} per
                      {{ ingredient.unit_of_measure }}
                    </span>
                  </div>
                  <div
                    v-if="ingredient.preparation_notes"
                    class="text-xs text-base-content/60 bg-base-200 px-2 py-1 rounded"
                  >
                    {{ ingredient.preparation_notes }}
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span
                    v-if="ingredient.is_optional"
                    class="badge badge-xs badge-warning"
                  >
                    Optional
                  </span>
                  <button
                    @click="removeIngredient(index)"
                    class="btn btn-ghost btn-xs text-error hover:bg-error/10 hover:scale-110 transition-transform"
                    title="Remove ingredient"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Cost Breakdown -->
          <div v-if="ingredients.length > 0" class="border-t pt-6">
            <h4 class="font-semibold text-primaryColor text-lg mb-4">
              Cost Breakdown
            </h4>
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div class="space-y-2">
                <div
                  v-for="ingredient in ingredients"
                  :key="ingredient.id"
                  class="flex justify-between items-center text-sm"
                >
                  <span class="text-gray-700">
                    {{ getItemTypeName(ingredient.inventory_item_id) }}
                  </span>
                  <span class="font-medium text-primaryColor">
                    ₱{{
                      (
                        ingredient.quantity_required * ingredient.cost_per_unit
                      ).toFixed(2)
                    }}
                  </span>
                </div>
                <div class="border-t border-gray-300 pt-2 mt-3">
                  <div class="flex justify-between items-center font-semibold">
                    <span class="text-gray-800">Total Cost per Batch:</span>
                    <span class="text-primaryColor text-lg">
                      ₱{{ totalCostPerBatch.toFixed(2) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex justify-end gap-3 pt-8 border-t border-black/10">
            <button
              type="button"
              @click="closeModal"
              class="btn btn-sm bg-white text-black/70 border border-black/20 hover:bg-primaryColor/10 hover:border-primaryColor/40 rounded-lg shadow-none font-thin"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-sm bg-white text-black/70 border border-black/20 hover:bg-primaryColor/10 hover:border-primaryColor/40 rounded-lg shadow-none font-thin"
              :disabled="loading"
            >
              <span
                v-if="loading"
                class="loading loading-spinner loading-sm mr-2"
              ></span>
              {{ modal.type === 'create' ? 'Create Recipe' : 'Update Recipe' }}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeModal">close</button>
      </form>
    </dialog>

    <!-- Add Ingredient Modal -->
    <dialog id="add_ingredient_modal" class="modal">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-6 text-primaryColor">Add Ingredient</h3>
        <form @submit.prevent="addIngredient" class="space-y-6">
          <!-- Ingredient Selection -->
          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Ingredient <span class="text-red-500">*</span>
              </span>
              <span class="text-xs text-gray-500 ml-2"
                >(Food ingredients only)</span
              >
            </label>
            <select
              v-model="ingredientForm.inventory_item_id"
              @change="
                handleIngredientSelection(ingredientForm.inventory_item_id)
              "
              class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              required
            >
              <option value="">Select ingredient</option>
              <option
                v-for="itemType in foodIngredients"
                :key="itemType.id"
                :value="itemType.id"
              >
                {{ itemType.item_name }}
              </option>
            </select>

            <!-- Loading state -->
            <div v-if="loading" class="text-xs text-blue-500 mt-1">
              Loading ingredients...
            </div>

            <!-- Selected Ingredient Details -->
            <div
              v-if="ingredientForm.inventory_item_id && !loading"
              class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <div class="text-sm font-medium text-blue-800 mb-2">
                <font-awesome-icon icon="fa-solid fa-book-open" class="mr-1" />
                Inventory Details
              </div>
              <div class="grid grid-cols-1 gap-2 text-xs text-blue-700">
                <div class="flex justify-between">
                  <span class="font-medium">Unit:</span>
                  <span class="ml-1">{{ ingredientForm.unit || 'N/A' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="font-medium">Available Stock:</span>
                  <span class="ml-1 font-bold">
                    {{ getSelectedIngredientStock() || 0 }}
                    {{ ingredientForm.unit || 'units' }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="font-medium">Cost per Unit:</span>
                  <span class="ml-1 font-bold">
                    ₱{{ ingredientForm.cost_per_unit || '0.00' }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="font-medium">Total Value:</span>
                  <span class="ml-1 font-bold">
                    ₱{{
                      (
                        (getSelectedIngredientStock() || 0) *
                        (ingredientForm.cost_per_unit || 0)
                      ).toFixed(2)
                    }}
                  </span>
                </div>
                <!-- Expiry Date Information -->
                <div
                  v-if="getSelectedIngredient()?.expiry_date"
                  class="flex justify-between"
                >
                  <span class="font-medium">Expiry Date:</span>
                  <span class="ml-1 font-bold">
                    {{
                      new Date(
                        getSelectedIngredient()?.expiry_date
                      ).toLocaleDateString()
                    }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Expiry Warning -->
            <div
              v-if="
                ingredientForm.inventory_item_id &&
                getSelectedIngredient() &&
                isIngredientExpiringSoon(getSelectedIngredient())
              "
              class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <div class="text-sm font-medium text-yellow-800 mb-1">
                <AlertTriangle class="w-4 h-4 inline mr-1" />
                Expiring Soon
              </div>
              <div class="text-xs text-yellow-700">
                {{ getExpiryWarning(getSelectedIngredient()) }} - Consider using
                this ingredient soon or check for fresher stock.
              </div>
            </div>

            <!-- Stock Availability Warning -->
            <div
              v-if="
                ingredientForm.inventory_item_id &&
                getSelectedIngredientStock() <= 0
              "
              class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <div class="text-sm font-medium text-red-800 mb-1">
                <font-awesome-icon
                  icon="fa-solid fa-triangle-exclamation"
                  class="mr-1"
                />
                Out of Stock
              </div>
              <div class="text-xs text-red-700">
                This ingredient is currently out of stock. Please check with
                procurement or select another ingredient.
              </div>
            </div>

            <!-- Low Stock Warning -->
            <div
              v-if="
                ingredientForm.inventory_item_id &&
                getSelectedIngredientStock() > 0 &&
                getSelectedIngredientStock() <= 10
              "
              class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
            >
              <div class="text-sm font-medium text-yellow-800 mb-1">
                <font-awesome-icon
                  icon="fa-solid fa-triangle-exclamation"
                  class="mr-1"
                />
                Low Stock Alert
              </div>
              <div class="text-xs text-yellow-700">
                Only {{ getSelectedIngredientStock() }}
                {{ ingredientForm.unit || 'units' }} remaining. Consider
                reordering soon.
              </div>
            </div>

            <!-- Error state -->
            <div
              v-if="foodIngredients.length === 0 && !loading"
              class="text-xs text-red-500 mt-1"
            >
              No food ingredients available. Please refresh data.
              <button
                @click="refreshData"
                class="btn btn-xs btn-outline ml-2"
                :disabled="loading"
              >
                {{ loading ? 'Loading...' : 'Refresh' }}
              </button>
            </div>
          </div>

          <!-- Quantity and Unit -->
          <div class="grid grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label mb-1">
                <span
                  class="label-text text-black/70 font-medium text-sm sm:text-base"
                >
                  Quantity <span class="text-red-500">*</span>
                </span>
                <span class="text-xs text-gray-500 ml-2">
                  (Max: {{ getSelectedIngredientStock() || 0 }}
                  {{ ingredientForm.unit || 'units' }})
                </span>
              </label>
              <input
                v-model="ingredientForm.quantity_required"
                type="number"
                step="0.01"
                :min="0"
                :max="getSelectedIngredientStock() || 0"
                placeholder="0"
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                required
              />
              <div class="text-xs text-gray-500 mt-1">
                Available: {{ getSelectedIngredientStock() || 0 }}
                {{ ingredientForm.unit || 'units' }}
              </div>
              <!-- Real-time Stock Check -->
              <div
                v-if="
                  ingredientForm.quantity_required &&
                  ingredientForm.inventory_item_id
                "
                class="text-xs mt-1"
                :class="{
                  'text-success':
                    ingredientForm.quantity_required <=
                    getSelectedIngredientStock(),
                  'text-error':
                    ingredientForm.quantity_required >
                    getSelectedIngredientStock(),
                }"
              >
                <span
                  v-if="
                    ingredientForm.quantity_required <=
                    getSelectedIngredientStock()
                  "
                >
                  <font-awesome-icon icon="fa-solid fa-check" class="mr-1" />
                  Sufficient stock available
                </span>
                <span v-else>
                  <font-awesome-icon icon="fa-solid fa-xmark" class="mr-1" />
                  Insufficient stock ({{
                    getSelectedIngredientStock() -
                    ingredientForm.quantity_required
                  }}
                  {{ ingredientForm.unit || 'units' }} short)
                </span>
              </div>
            </div>

            <div class="form-control">
              <label class="label mb-1">
                <span class="text-black/70 font-medium text-sm sm:text-base">
                  Unit <span class="text-red-500">*</span>
                </span>
                <span class="text-xs text-gray-500 ml-2">(From inventory)</span>
              </label>
              <input
                v-model="ingredientForm.unit"
                type="text"
                placeholder="kg, pieces, etc."
                class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                required
                readonly
              />
            </div>
          </div>

          <!-- Cost per Unit -->
          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Cost per Unit
              </span>
              <span class="text-xs text-gray-500 ml-2">(From inventory)</span>
            </label>
            <input
              v-model="ingredientForm.cost_per_unit"
              type="number"
              step="0.01"
              placeholder="0.00"
              class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            />
          </div>

          <!-- Total Cost Calculation -->
          <div
            v-if="
              ingredientForm.quantity_required && ingredientForm.cost_per_unit
            "
            class="p-3 bg-green-50 border border-green-200 rounded-lg"
          >
            <div class="text-sm font-medium text-green-800 mb-1">
              <font-awesome-icon icon="fa-solid fa-calculator" class="mr-1" />
              Total Cost Calculation
            </div>
            <div class="text-xs text-green-700">
              <span class="font-medium">{{
                ingredientForm.quantity_required
              }}</span>
              {{ ingredientForm.unit }} × ₱{{ ingredientForm.cost_per_unit }} =
              <span class="font-bold"
                >₱{{
                  (
                    ingredientForm.quantity_required *
                    ingredientForm.cost_per_unit
                  ).toFixed(2)
                }}</span
              >
            </div>
          </div>

          <!-- Preparation Notes -->
          <div class="form-control">
            <label class="label">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Preparation Notes
              </span>
            </label>
            <textarea
              v-model="ingredientForm.preparation_notes"
              placeholder="Any special preparation instructions..."
              class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              rows="3"
            ></textarea>
          </div>

          <!-- Optional Ingredient -->
          <div class="form-control">
            <div
              class="flex items-center h-12 px-4 bg-white border border-primaryColor/30 rounded-lg"
            >
              <label class="label cursor-pointer w-full">
                <input
                  v-model="ingredientForm.is_optional"
                  type="checkbox"
                  class="checkbox checked:bg-primaryColor text-white checkbox-xs"
                />
                <span
                  class="label-text ml-3 text-black/70 font-medium text-sm sm:text-base"
                >
                  Optional Ingredient
                </span>
              </label>
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="modal-action pt-4">
            <button
              type="button"
              @click="closeIngredientModal"
              class="btn btn-outline btn-sm border-primaryColor/30 text-primaryColor hover:bg-primaryColor/10 hover:border-primaryColor/50 transition-colors font-thin"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn bg-primaryColor btn-sm text-white hover:bg-primaryColor/80 shadow-lg hover:shadow-xl transition-all duration-200 font-thin"
            >
              Add Ingredient
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeIngredientModal">close</button>
      </form>
    </dialog>

    <!-- Recipe Details Modal -->
    <dialog id="view_recipe_modal" class="modal">
      <div
        class="modal-box max-w-4xl rounded-2xl border border-black/10 bg-white/95 shadow-lg"
        v-if="modal.recipe && modal.recipe.recipe_name"
      >
        <h3
          class="font-bold text-xl text-primaryColor mb-4 border-b border-black/10 pb-3"
        >
          Recipe Details
        </h3>

        <!-- Loading state -->
        <div v-if="loading" class="flex justify-center py-8">
          <span
            class="loading loading-spinner loading-lg text-primaryColor"
          ></span>
        </div>

        <!-- Recipe content -->
        <div v-else class="space-y-6">
          <!-- Basic Information -->
          <div class="bg-white border border-black/10 p-4 rounded-xl">
            <h4 class="font-semibold text-primaryColor mb-3">
              Basic Information
            </h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="flex justify-between">
                <span class="text-base-content/70">Recipe Code:</span>
                <span class="font-medium">{{
                  modal.recipe?.recipe_code || 'N/A'
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/70">Name:</span>
                <span class="font-medium">{{
                  modal.recipe?.recipe_name || 'N/A'
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/70">Category:</span>
                <span class="font-medium">{{
                  modal.recipe?.category || 'N/A'
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/70">Batch Size:</span>
                <span class="font-medium"
                  >{{ modal.recipe?.batch_size || 'N/A' }}
                  {{ modal.recipe?.batch_unit || 'N/A' }}</span
                >
              </div>
            </div>
          </div>

          <div v-if="modal.recipe?.description">
            <h4 class="font-semibold text-primaryColor mb-2">Description</h4>
            <div class="bg-white border border-black/10 p-4 rounded-xl">
              <p class="text-sm">{{ modal.recipe?.description }}</p>
            </div>
          </div>

          <!-- Ingredients -->
          <div>
            <h4 class="font-semibold text-primaryColor mb-2">
              Ingredients ({{ modal.recipe?.ingredients?.length || 0 }})
            </h4>

            <div
              class="bg-white border border-black/10 p-4 rounded-xl max-h-64 overflow-y-auto"
            >
              <div
                v-if="
                  !modal.recipe?.ingredients ||
                  modal.recipe?.ingredients?.length === 0
                "
                class="text-center py-4"
              >
                <Package class="w-8 h-8 text-base-content/30 mx-auto mb-2" />
                <p class="text-base-content/70">No ingredients defined</p>
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="ingredient in modal.recipe?.ingredients || []"
                  :key="ingredient.id"
                  class="flex justify-between items-start p-3 bg-white border border-black/10 rounded-lg"
                >
                  <div>
                    <div class="font-medium">
                      {{ ingredient.ingredient_name || 'Unknown Ingredient' }}
                    </div>
                    <div class="text-sm text-base-content/70">
                      {{ ingredient.quantity_required }}
                      {{
                        ingredient.unit || ingredient.unit_of_measure || 'units'
                      }}
                    </div>
                    <div class="text-xs text-base-content/60">
                      ₱{{
                        (ingredient.cost_per_unit || 0) *
                        ingredient.quantity_required
                      }}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-sm font-medium">
                      ₱{{ ingredient.cost_per_unit || 0 }}
                    </div>
                    <div class="text-xs text-base-content/60">
                      per
                      {{
                        ingredient.unit || ingredient.unit_of_measure || 'unit'
                      }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Cost Summary -->
          <div class="bg-white border border-black/10 p-4 rounded-xl">
            <div class="flex justify-between items-center">
              <span class="text-base-content/70 font-medium">Total Cost:</span>
              <span class="font-bold text-lg text-primaryColor">
                ₱{{ modal.recipe?.total_estimated_cost || 0 }}
              </span>
            </div>
          </div>

          <div v-if="modal.recipe?.instructions">
            <h4 class="font-semibold text-primaryColor mb-2">Instructions</h4>
            <div class="bg-base-100 p-4 rounded-lg max-h-32 overflow-y-auto">
              <p class="text-sm whitespace-pre-wrap">
                {{ modal.recipe?.instructions }}
              </p>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="openModal('check-stock', modal.recipe || null)"
            class="btn btn-sm bg-white text-black/70 border border-black/20 hover:bg-primaryColor/10 hover:border-primaryColor/40 rounded-lg shadow-none font-thin"
          >
            Check Availability
          </button>
          <button
            @click="closeModal"
            class="btn btn-sm bg-white text-black/70 border border-black/20 hover:bg-primaryColor/10 hover:border-primaryColor/40 rounded-lg shadow-none font-thin"
          >
            Close
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeModal">close</button>
      </form>
    </dialog>

    <!-- Check Stock Modal -->
    <dialog id="check_stock_modal" class="modal">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Check Stock for {{ modal.recipe?.recipe_name }}
        </h3>

        <div v-if="loading" class="flex justify-center py-8">
          <span
            class="loading loading-spinner loading-lg text-primaryColor"
          ></span>
        </div>

        <div
          v-else-if="modal.recipe?.ingredients?.length === 0"
          class="text-center py-8"
        >
          <Package class="w-12 h-12 text-base-content/30 mx-auto mb-2" />
          <p class="text-base-content/70">
            No ingredients defined for this recipe.
          </p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="ingredient in modal.recipe?.ingredients || []"
            :key="ingredient.id"
            class="p-3 rounded-lg border border-primaryColor/10 bg-base-100"
          >
            <div class="flex items-start justify-between">
              <div>
                <div class="font-medium">{{ ingredient.ingredient_name }}</div>
                <div
                  class="text-xs text-base-content/60"
                  v-if="ingredient.preparation_notes"
                >
                  • {{ ingredient.preparation_notes }}
                </div>
              </div>

              <div class="text-right">
                <div class="text-sm">
                  Required:
                  <span class="font-semibold text-primaryColor">
                    {{ formatQuantity(ingredient.quantity_required) }}
                    {{
                      ingredient.unit_of_measure || ingredient.unit || 'units'
                    }}
                  </span>
                </div>
                <div class="text-xs mt-1">
                  <span>
                    In stock:
                    <span class="font-semibold">
                      {{
                        formatQuantity(
                          getStockForIngredient(ingredient).quantityInStock
                        )
                      }}
                      {{ getStockForIngredient(ingredient).unit }}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-2 flex items-center justify-between">
              <div class="text-xs text-base-content/70">
                Cost per
                {{ ingredient.unit_of_measure || ingredient.unit || 'unit' }}:
                ₱{{ formatCurrency(ingredient.cost_per_unit) }}
              </div>
              <div
                class="badge text-xs"
                :class="{
                  'badge-success border-none text-success bg-success/20 badge-xs':
                    getStockForIngredient(ingredient).quantityInStock >=
                    Number(ingredient.quantity_required || 0),
                  'badge-warning border-none text-warning bg-warning/20 badge-xs':
                    getStockForIngredient(ingredient).quantityInStock > 0 &&
                    getStockForIngredient(ingredient).quantityInStock <
                      Number(ingredient.quantity_required || 0),
                  'badge-error border-none text-error bg-error/20 badge-xs':
                    getStockForIngredient(ingredient).quantityInStock <= 0,
                }"
              >
                {{
                  getStockForIngredient(ingredient).quantityInStock >=
                  Number(ingredient.quantity_required || 0)
                    ? 'Sufficient'
                    : getStockForIngredient(ingredient).quantityInStock <= 0
                      ? 'Out of stock'
                      : 'Insufficient'
                }}
              </div>
            </div>

            <div
              v-if="
                getStockForIngredient(ingredient).quantityInStock <
                Number(ingredient.quantity_required || 0)
              "
              class="mt-2 text-xs text-warning"
            >
              Short by
              <span class="font-semibold">
                {{
                  formatQuantity(
                    Number(ingredient.quantity_required || 0) -
                      getStockForIngredient(ingredient).quantityInStock
                  )
                }}
                {{ getStockForIngredient(ingredient).unit }}
              </span>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeCheckStockModal"
            class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none btn-sm"
          >
            Close
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeModal">close</button>
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
      </div>
    </transition>
  </div>
</template>
