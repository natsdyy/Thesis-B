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
    EllipsisVertical,
    Check,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';
  import { useAuthStore } from '../../stores/authStore.js';
  import { useUserStore } from '../../stores/userStore.js';
  import { useInventoryStore } from '../../stores/inventoryStore.js';
  import { useEmployeeStore } from '../../stores/employeeStore.js';
  import SampleProductionAuditLog from '../../components/production/SampleProductionAuditLog.vue';
  import FullAuditLogModal from '../../components/production/FullAuditLogModal.vue';

  const productionStore = useProductionStore();
  const authStore = useAuthStore();
  const userStore = useUserStore();
  const employeeStore = useEmployeeStore();

  // Reactive state
  const activeTab = ref('planning');
  const searchQuery = ref('');
  const statusFilter = ref('In Progress');
  const dateFilter = ref('');
  const categoryFilter = ref('');
  const showCreateModal = ref(false);
  const showDetailsModal = ref(false);
  const showEditModal = ref(false);
  const selectedSample = ref(null);
  const currentPage = ref(1);
  const itemsPerPage = ref(12);
  const expandedItems = ref(new Set());

  // Helper function to get dynamic default time (next hour)
  const getDefaultTime = () => {
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000); // Add 1 hour
    return nextHour.toTimeString().slice(0, 5); // Format as HH:MM
  };

  // Form data
  const sampleForm = ref({
    menu_item_id: '',
    batch_size: 10, // Small batch size for testing
    batch_unit: 'servings',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: getDefaultTime(),
    assigned_to: '',
    production_notes: '',
    priority: 'Normal',
    estimated_cost: '',
  });

  // Separate fail modal state
  const failModal = ref({
    show: false,
    title: 'Mark Sample Production as Failed',
    message: 'Provide failure details before marking as failed.',
    onConfirm: null,
    data: null,
  });

  // Separate complete modal state
  const completeModal = ref({
    show: false,
    title: 'Complete Sample Production',
    message: 'Provide completion details before marking as completed.',
    onConfirm: null,
    data: null,
  });
  // Audit Log state
  const showAuditLog = ref(false);
  const showFullAuditLogModal = ref(false);

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

  // Get employees for staff assignment (Updated: 2025-01-18)
  const staffMembers = computed(() => {
    // Debug: Log employee store data
    console.log('Employee store employees:', employeeStore.employees);
    console.log('Employee store loading:', employeeStore.loading);

    // Filter employees by Production department and Active status
    const productionEmployees = employeeStore.employees
      .filter(
        (emp) => emp.department === 'Production' && emp.status === 'Active'
      )
      .map((emp) => ({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        department: emp.department,
        role: emp.job_title || emp.role || 'Staff',
        employee_id: emp.employee_id,
        email: emp.email,
      }));

    console.log('Filtered production employees:', productionEmployees);

    // If no production employees found, show all active employees as fallback
    if (productionEmployees.length === 0) {
      console.log(
        'No production employees found, showing all active employees'
      );
      const allActiveEmployees = employeeStore.employees
        .filter((emp) => emp.status === 'Active')
        .map((emp) => ({
          id: emp.id,
          name: `${emp.first_name} ${emp.last_name}`,
          department: emp.department,
          role: emp.job_title || emp.role || 'Staff',
          employee_id: emp.employee_id,
          email: emp.email,
        }));

      // If still no employees, show a placeholder
      if (allActiveEmployees.length === 0) {
        console.log('No active employees found, showing placeholder');
        return [
          {
            id: 0,
            name: 'No employees available',
            department: 'N/A',
            role: 'N/A',
            employee_id: 'N/A',
            email: 'N/A',
          },
        ];
      }

      return allActiveEmployees;
    }

    return productionEmployees;
  });

  // Computed properties
  const filteredSampleProductions = computed(() => {
    let filtered = sampleProductions.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (sample) =>
          sample.menu_item_name.toLowerCase().includes(query) ||
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

  // Dynamic batch size limit based on recipe's standard batch size
  const maxBatchSize = computed(() => {
    const selectedMenuItem = availableMenuItems.value.find(
      (item) => item.id == sampleForm.value.menu_item_id
    );

    if (selectedMenuItem) {
      // Limit to 50% of the recipe's standard batch size (max 100 servings)
      const recipeBatchSize =
        selectedMenuItem.recipe_batch_size || selectedMenuItem.batch_size || 10;
      return Math.min(Math.floor(recipeBatchSize * 0.5), 100);
    }

    // Default limit when no menu item is selected
    return 10;
  });

  // Batch size validation message
  const batchSizeValidationMessage = computed(() => {
    const selectedMenuItem = availableMenuItems.value.find(
      (item) => item.id == sampleForm.value.menu_item_id
    );

    const limit = maxBatchSize.value;

    if (selectedMenuItem) {
      const recipeBatchSize =
        selectedMenuItem.recipe_batch_size || selectedMenuItem.batch_size || 10;
      return `Max batch: ${limit} (half of recipe's ${recipeBatchSize}) — keeps testing simple.`;
    }

    return `Max batch: ${limit} servings — keeps samples manageable.`;
  });

  // Batch size status for visual feedback
  const batchSizeStatus = computed(() => {
    const currentSize = sampleForm.value.batch_size || 0;
    const limit = maxBatchSize.value;
    const warningThreshold = limit * 0.8; // 80% of limit

    if (currentSize > limit) {
      return 'error';
    } else if (currentSize >= warningThreshold) {
      return 'warning';
    } else if (currentSize > 0) {
      return 'normal';
    }
    return 'empty';
  });

  // Dynamic styling for batch size input
  const batchSizeInputClass = computed(() => {
    const baseClass =
      'input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor';
    const status = batchSizeStatus.value;

    if (status === 'error') {
      return `${baseClass} border-red-500 focus:border-red-500`;
    } else if (status === 'warning') {
      return `${baseClass} border-yellow-500 focus:border-yellow-500`;
    }
    return baseClass;
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
    // Use real ingredient availability data from backend
    if (!sample) {
      return {
        total_ingredients: 0,
        available_ingredients: 0,
        sufficient_for_production: false,
      };
    }

    // Check if we have real ingredient availability data
    if (sample.ingredient_availability) {
      return {
        total_ingredients:
          sample.ingredient_availability.total_ingredients || 0,
        available_ingredients:
          sample.ingredient_availability.available_ingredients || 0,
        sufficient_for_production:
          sample.ingredient_availability.sufficient_for_production || false,
      };
    }

    // For list view, show a placeholder until details are loaded
    return {
      total_ingredients: sample.recipe_ingredients?.length || 0,
      available_ingredients: 'Click to check', // Show message to indicate data not loaded
      sufficient_for_production: false, // Unknown status
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
      scheduled_time: getDefaultTime(),
      assigned_to: '',
      production_notes: '',
      priority: 'Normal',
      estimated_cost: '',
    };
  };

  // Validation functions for positive numbers
  const validateBatchSize = (event) => {
    const value = event.target.value;
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9]/g, '');
    // Ensure minimum value of 1
    const numericValue = Math.max(1, parseInt(cleanValue) || 1);
    // Ensure maximum value
    const maxLimit = maxBatchSize.value;
    const finalValue = Math.min(numericValue, maxLimit);

    // Update the form value
    sampleForm.value.batch_size = finalValue;
    // Update the input field
    event.target.value = finalValue;
  };

  const onlyAllowPositiveNumbers = (event) => {
    // Allow: backspace, delete, tab, escape, enter, and numbers
    const charCode = event.which ? event.which : event.keyCode;
    if (
      charCode === 8 || // backspace
      charCode === 9 || // tab
      charCode === 13 || // enter
      charCode === 27 || // escape
      (charCode >= 48 && charCode <= 57) // numbers 0-9
    ) {
      return true;
    } else {
      event.preventDefault();
      return false;
    }
  };

  // Methods
  const fetchData = async () => {
    try {
      await Promise.all([
        productionStore.fetchSampleProductions(),
        productionStore.fetchMenuItems(),
        productionStore.fetchSampleProductionStats(),
        employeeStore.fetchEmployees(), // Fetch employees for staff assignment
      ]);
      console.log(
        'Data fetched successfully, employees:',
        employeeStore.employees.length
      );
    } catch (error) {
      console.error('Error fetching data:', error);
      // If employee fetching fails, try to fetch employees separately
      try {
        await employeeStore.fetchEmployees();
        console.log(
          'Employees fetched separately:',
          employeeStore.employees.length
        );
      } catch (empError) {
        console.error('Error fetching employees:', empError);
      }
    }
  };

  const openCreateModal = async () => {
    resetForm();
    // Ensure employees are loaded when opening the modal
    if (employeeStore.employees.length === 0) {
      console.log('No employees loaded, fetching employees...');
      try {
        await employeeStore.fetchEmployees();
        console.log(
          'Employees loaded for modal:',
          employeeStore.employees.length
        );
      } catch (error) {
        console.error('Error loading employees for modal:', error);
      }
    }
    showCreateModal.value = true;
  };

  const closeCreateModal = () => {
    showCreateModal.value = false;
    resetForm();
    // Close the actual dialog element
    const dialog = document.getElementById('sample_production_modal');
    if (dialog) {
      dialog.close();
    }
  };

  const openEditModal = (sample) => {
    selectedSample.value = sample;
    sampleForm.value = {
      menu_item_id: sample.menu_item_id,
      recipe_id: sample.recipe_id, // Add missing recipe_id
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
    // Close the actual dialog element
    const dialog = document.getElementById('edit_sample_modal');
    if (dialog) {
      dialog.close();
    }
  };

  const openDetailsModal = async (sample) => {
    try {
      loading.value = true;
      // Fetch detailed sample production data including ingredient availability
      const detailedSample = await productionStore.getSampleProductionById(
        sample.id
      );
      selectedSample.value = detailedSample;
      showDetailsModal.value = true;
    } catch (error) {
      console.error('Error fetching sample production details:', error);
      showToast('error', 'Failed to load sample production details');
    } finally {
      loading.value = false;
    }
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedSample.value = null;
    // Close the actual dialog element
    const dialog = document.getElementById('sample_details_modal');
    if (dialog) {
      dialog.close();
    }
  };

  const refreshIngredientAvailability = async () => {
    if (!selectedSample.value?.id) return;

    try {
      loading.value = true;
      // Fetch updated sample production data with fresh ingredient availability
      const updatedSample = await productionStore.getSampleProductionById(
        selectedSample.value.id
      );
      selectedSample.value = updatedSample;
      showToast('success', 'Ingredient availability refreshed');
    } catch (error) {
      console.error('Error refreshing ingredient availability:', error);
      showToast('error', 'Failed to refresh ingredient availability');
    } finally {
      loading.value = false;
    }
  };

  // Shared confirmation modal for other operations (start, cancel, delete, create, update)
  const confirmModal = ref({
    show: false,
    title: '',
    message: '',
    type: '',
    onConfirm: null,
  });

  const openConfirmModal = (type, title, message, onConfirm, data = null) => {
    confirmModal.value = {
      show: true,
      type,
      title,
      message,
      onConfirm,
      data,
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
    // Close the actual dialog element
    const dialog = document.getElementById('sample_confirmation_modal');
    if (dialog) {
      dialog.close();
    }
  };

  const handleCreateSampleProduction = async () => {
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

      if (formData.batch_size > maxBatchSize.value) {
        showToast(
          'error',
          `Batch size cannot exceed ${maxBatchSize.value} servings (${batchSizeValidationMessage.value})`
        );
        return;
      }

      if (!formData.scheduled_date) {
        showToast('error', 'Please select a scheduled date');
        return;
      }

      if (!formData.scheduled_time) {
        showToast('error', 'Please select a scheduled time');
        return;
      }

      // Get the selected menu item to extract recipe_id
      const selectedMenuItem = availableMenuItems.value.find(
        (item) => item.id == formData.menu_item_id
      );

      if (!selectedMenuItem || !selectedMenuItem.recipe_id) {
        showToast(
          'error',
          'Selected menu item does not have an associated recipe'
        );
        return;
      }

      // Add recipe_id to the form data
      formData.recipe_id = selectedMenuItem.recipe_id;

      // Transform data types to match database schema
      const menuItemId = parseInt(formData.menu_item_id, 10);
      const recipeId = parseInt(formData.recipe_id, 10);
      const batchSize = parseInt(formData.batch_size, 10);
      const assignedTo = formData.assigned_to
        ? parseInt(formData.assigned_to, 10)
        : null;
      const estimatedCost = formData.estimated_cost
        ? parseFloat(formData.estimated_cost)
        : null;

      // Validate parsed values
      if (isNaN(menuItemId) || menuItemId <= 0) {
        showToast('error', 'Invalid menu item selected');
        return;
      }
      if (isNaN(recipeId) || recipeId <= 0) {
        showToast('error', 'Invalid recipe selected');
        return;
      }
      if (isNaN(batchSize) || batchSize <= 0) {
        showToast('error', 'Invalid batch size');
        return;
      }

      const transformedData = {
        ...formData,
        menu_item_id: menuItemId,
        recipe_id: recipeId,
        batch_size: batchSize,
        assigned_to: assignedTo,
        estimated_cost: estimatedCost,
      };

      await productionStore.createSampleProduction(transformedData);

      // Wait a bit to ensure loading state is cleared
      await new Promise((resolve) => setTimeout(resolve, 100));

      showToast('success', 'Sample production planned successfully');
      closeCreateModal();
      closeConfirmModal();

      // The store already refetches data, so we don't need to call fetchData again
      // await fetchData(); // Remove this redundant call
    } catch (error) {
      console.error('Error in handleCreateSampleProduction:', error);

      // Check if it's a timeout error
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        // Operation might have succeeded despite timeout
        showToast(
          'warning',
          'Request timed out, but sample production may have been created. Please refresh to check.'
        );

        // Still close modals and refresh data to check if it was created
        closeCreateModal();
        closeConfirmModal();
        await fetchData();
      } else {
        // Actual error occurred
        showToast('error', error.message || 'Failed to plan sample production');
        closeCreateModal();
        closeConfirmModal();
      }
    }
  };

  const createSampleProduction = async () => {
    // This function is now just a wrapper for backward compatibility
    return handleCreateSampleProduction();
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

      if (formData.batch_size > maxBatchSize.value) {
        showToast(
          'error',
          `Batch size cannot exceed ${maxBatchSize.value} servings (${batchSizeValidationMessage.value})`
        );
        return;
      }

      if (!formData.scheduled_date) {
        showToast('error', 'Please select a scheduled date');
        return;
      }

      if (!formData.scheduled_time) {
        showToast('error', 'Please select a scheduled time');
        return;
      }

      // Transform data types to match database schema
      const menuItemId = parseInt(formData.menu_item_id, 10);
      const recipeId = parseInt(formData.recipe_id, 10);
      const batchSize = parseInt(formData.batch_size, 10);
      const assignedTo = formData.assigned_to
        ? parseInt(formData.assigned_to, 10)
        : null;
      const estimatedCost = formData.estimated_cost
        ? parseFloat(formData.estimated_cost)
        : null;

      // Validate parsed values
      if (isNaN(menuItemId) || menuItemId <= 0) {
        showToast('error', 'Invalid menu item selected');
        return;
      }
      if (isNaN(recipeId) || recipeId <= 0) {
        showToast('error', 'Invalid recipe selected');
        return;
      }
      if (isNaN(batchSize) || batchSize <= 0) {
        showToast('error', 'Invalid batch size');
        return;
      }

      const transformedData = {
        ...formData,
        menu_item_id: menuItemId,
        recipe_id: recipeId,
        batch_size: batchSize,
        assigned_to: assignedTo,
        estimated_cost: estimatedCost,
      };

      await productionStore.updateSampleProduction(
        selectedSample.value.id,
        transformedData
      );

      // Wait a bit to ensure loading state is cleared
      await new Promise((resolve) => setTimeout(resolve, 100));

      showToast('success', 'Sample production updated successfully');

      // Close modals after showing success message
      closeEditModal();
      closeConfirmModal();
    } catch (error) {
      console.error('Error in updateSampleProduction:', error);

      // Check if it's a timeout error
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        // Operation might have succeeded despite timeout
        showToast(
          'warning',
          'Request timed out, but sample production may have been updated. Please refresh to check.'
        );

        // Still close modals - store already refreshes data
        closeEditModal();
        closeConfirmModal();
      } else {
        // Actual error occurred
        showToast(
          'error',
          error.message || 'Failed to update sample production'
        );
        closeEditModal();
        closeConfirmModal();
      }
    }
  };

  const startSampleProduction = async (sampleId) => {
    openConfirmModal(
      'start',
      'Start Sample Production',
      loading.value
        ? 'Sample is starting production...'
        : 'Are you sure you want to start this sample production? This will change the status to "In Progress".',
      async () => {
        try {
          // show loading state in modal immediately
          loading.value = true;
          await productionStore.startSampleProduction(sampleId);
          // Wait a bit to ensure loading state is cleared
          await new Promise((resolve) => setTimeout(resolve, 100));
          showToast('success', 'Sample production started');
          closeConfirmModal();
          // If the details modal is open, close it after successful start
          if (showDetailsModal.value) {
            closeDetailsModal();
          }
          // notify audit log to refresh
          window.dispatchEvent(new Event('refresh-audit-logs'));
        } catch (error) {
          console.error('Error in startSampleProduction:', error);

          if (
            error.code === 'ECONNABORTED' ||
            error.message.includes('timeout')
          ) {
            showToast(
              'warning',
              'Request timed out, but sample production may have been started. Please refresh to check.'
            );
            closeConfirmModal();
            await fetchData();
          } else {
            showToast(
              'error',
              error.message || 'Failed to start sample production'
            );
            closeConfirmModal();
          }
        } finally {
          loading.value = false;
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
          // Wait a bit to ensure loading state is cleared
          await new Promise((resolve) => setTimeout(resolve, 100));
          showToast('success', 'Sample production completed successfully');
          closeConfirmModal();
          // notify audit log to refresh
          window.dispatchEvent(new Event('refresh-audit-logs'));
        } catch (error) {
          console.error('Error in completeSampleProduction:', error);

          if (
            error.code === 'ECONNABORTED' ||
            error.message.includes('timeout')
          ) {
            showToast(
              'warning',
              'Request timed out, but sample production may have been completed. Please refresh to check.'
            );
            closeConfirmModal();
            await fetchData();
          } else {
            showToast(
              'error',
              error.message || 'Failed to complete sample production'
            );
            closeConfirmModal();
          }
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
          // Wait a bit to ensure loading state is cleared
          await new Promise((resolve) => setTimeout(resolve, 100));
          showToast('warning', 'Sample production cancelled');
          closeConfirmModal();
          // notify audit log to refresh
          window.dispatchEvent(new Event('refresh-audit-logs'));
        } catch (error) {
          console.error('Error in cancelSampleProduction:', error);

          if (
            error.code === 'ECONNABORTED' ||
            error.message.includes('timeout')
          ) {
            showToast(
              'warning',
              'Request timed out, but sample production may have been cancelled. Please refresh to check.'
            );
            closeConfirmModal();
            await fetchData();
          } else {
            showToast(
              'error',
              error.message || 'Failed to cancel sample production'
            );
            closeConfirmModal();
          }
        }
      }
    );
  };

  // Fail Sample Production with details
  const failForm = ref({
    failure_reason: '',
    quantity_lost: 0,
    cost_incurred: 0,
    notes: '',
  });

  const openFailModal = (sample) => {
    // Initialize defaults
    failForm.value = {
      failure_reason: '',
      quantity_lost: 0,
      cost_incurred: sample?.estimated_cost || 0,
      notes: '',
    };

    failModal.value = {
      show: true,
      title: 'Mark Sample Production as Failed',
      message: 'Provide failure details before marking as failed.',
      onConfirm: async () => {
        try {
          loading.value = true;
          // Validate quantity_lost within range 0..planned
          const plannedQty = Number(failModal.value?.data?.batch_size) || 0;
          const qtyLost = Number(failForm.value.quantity_lost) || 0;
          if (qtyLost < 0 || (plannedQty > 0 && qtyLost > plannedQty)) {
            showToast(
              'error',
              `Quantity lost must be between 0 and ${plannedQty} servings`
            );
            loading.value = false;
            return;
          }
          await productionStore.failSampleProduction(
            sample.id,
            failForm.value.failure_reason,
            qtyLost,
            Number(failForm.value.cost_incurred) || 0,
            failForm.value.notes
          );
          await new Promise((resolve) => setTimeout(resolve, 100));
          showToast('warning', 'Sample production marked as failed');
          closeFailModal();
          window.dispatchEvent(new Event('refresh-audit-logs'));
        } catch (error) {
          console.error('Error in failSampleProduction:', error);
          if (
            error.code === 'ECONNABORTED' ||
            error.message?.includes('timeout')
          ) {
            showToast(
              'warning',
              'Request timed out, but sample may have been marked failed. Please refresh to check.'
            );
            closeFailModal();
            await fetchData();
          } else {
            showToast('error', error.message || 'Failed to mark as failed');
            closeFailModal();
          }
        } finally {
          loading.value = false;
        }
      },
      data: {
        sampleId: sample.id,
        menu_item_name: sample.menu_item_name,
        sample_batch_number: sample.sample_batch_number,
        batch_size: sample.batch_size,
        scheduled_date: sample.scheduled_date,
        scheduled_time: sample.scheduled_time,
        assigned_to_name: sample.assigned_to_name,
        estimated_cost: sample.estimated_cost,
        priority: sample.priority,
      },
    };
  };

  const canConfirmFail = computed(() => {
    return (failForm.value.failure_reason || '').trim().length > 0;
  });

  const closeFailModal = () => {
    failModal.value = {
      show: false,
      title: '',
      message: '',
      onConfirm: null,
      data: null,
    };
    // Close the actual dialog element
    const dialog = document.getElementById('sample_fail_modal');
    if (dialog) {
      dialog.close();
    }
  };

  // Complete Sample Production with details
  const completeForm = ref({
    quantity_produced: 0,
    production_cost: 0,
    notes: '',
  });

  const openCompleteModal = (sample) => {
    completeForm.value = {
      quantity_produced: sample?.batch_size || 0,
      production_cost: sample?.estimated_cost || 0,
      notes: '',
    };
    completeModal.value = {
      show: true,
      title: 'Complete Sample Production',
      message: 'Provide completion details before marking as completed.',
      onConfirm: async () => {
        try {
          loading.value = true;
          const plannedQty = Number(completeModal.value?.data?.batch_size) || 0;
          const qtyProd = Number(completeForm.value.quantity_produced) || 0;
          if (qtyProd < 0 || (plannedQty > 0 && qtyProd > plannedQty)) {
            showToast(
              'error',
              `Quantity produced must be between 0 and ${plannedQty} servings`
            );
            loading.value = false;
            return;
          }
          await productionStore.completeSampleProduction(
            sample.id,
            qtyProd,
            Number(completeForm.value.production_cost) || 0,
            completeForm.value.notes
          );
          await new Promise((resolve) => setTimeout(resolve, 100));
          showToast('success', 'Sample production completed successfully');
          closeCompleteModal();
          window.dispatchEvent(new Event('refresh-audit-logs'));
        } catch (error) {
          console.error('Error in completeSampleProduction (modal):', error);
          if (
            error.code === 'ECONNABORTED' ||
            error.message?.includes('timeout')
          ) {
            showToast(
              'warning',
              'Request timed out, but sample may have been completed. Please refresh to check.'
            );
            closeCompleteModal();
            await fetchData();
          } else {
            showToast('error', error.message || 'Failed to complete sample');
            closeCompleteModal();
          }
        } finally {
          loading.value = false;
        }
      },
      data: {
        sampleId: sample.id,
        menu_item_name: sample.menu_item_name,
        sample_batch_number: sample.sample_batch_number,
        batch_size: sample.batch_size,
        scheduled_date: sample.scheduled_date,
        scheduled_time: sample.scheduled_time,
        assigned_to_name: sample.assigned_to_name,
        estimated_cost: sample.estimated_cost,
        priority: sample.priority,
      },
    };
  };

  const canConfirmComplete = computed(() => {
    const planned = Number(completeModal.value?.data?.batch_size) || 0;
    const qty = Number(completeForm.value.quantity_produced) || 0;
    return qty >= 0 && (planned === 0 || qty <= planned);
  });

  const closeCompleteModal = () => {
    completeModal.value = {
      show: false,
      title: '',
      message: '',
      onConfirm: null,
      data: null,
    };
    // Close the actual dialog element
    const dialog = document.getElementById('sample_complete_modal');
    if (dialog) {
      dialog.close();
    }
  };

  const handleOpenFullAuditLogModal = () => {
    showFullAuditLogModal.value = true;
  };

  const deleteSampleProduction = async (sampleId) => {
    openConfirmModal(
      'delete',
      'Delete Sample Production',
      'Are you sure you want to delete this sample production? This action cannot be undone.',
      async () => {
        try {
          await productionStore.deleteSampleProduction(sampleId);
          // Wait a bit to ensure loading state is cleared
          await new Promise((resolve) => setTimeout(resolve, 100));
          showToast('success', 'Sample production deleted successfully');
          closeConfirmModal();
          // notify audit log to refresh
          window.dispatchEvent(new Event('refresh-audit-logs'));
        } catch (error) {
          console.error('Error in deleteSampleProduction:', error);

          if (
            error.code === 'ECONNABORTED' ||
            error.message.includes('timeout')
          ) {
            showToast(
              'warning',
              'Request timed out, but sample production may have been deleted. Please refresh to check.'
            );
            closeConfirmModal();
            await fetchData();
          } else {
            showToast(
              'error',
              error.message || 'Failed to delete sample production'
            );
            closeConfirmModal();
          }
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
      checkIngredientAvailability(selectedMenuItem, false);
    }
  };

  // Check ingredient availability for sample production planning
  // showAlerts = false: Instant refresh for UX (no confirmation modals)
  // showAlerts = true: Can be used for alerts/notifications if needed
  const checkIngredientAvailability = async (menuItem, showAlerts = false) => {
    if (!menuItem) return;

    // Don't recheck if it's the same menu item, batch size, and we already have data
    // But allow recheck if explicitly requested (showAlerts = true)
    if (
      !showAlerts &&
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
      () => handleCreateSampleProduction()
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

  // Toast state - Enhanced version from RecipeManagement.vue
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
            checkIngredientAvailability(selectedMenuItem, false);
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
                      {{ sample.menu_item_name }}
                    </h3>
              
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
                          sample.status === 'Planned' &&
                          isOverdue(
                            sample.scheduled_date,
                            sample.scheduled_time
                          )
                        "
                        class="badge badge-error badge-outline badge-xs border-none font-medium bg-error/20 text-error"
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
                          @click.stop.prevent="openDetailsModal(sample)"
                          @mousedown.stop
                          class="text-sm"
                        >
                          <Eye class="w-3 h-3 mr-2" />
                          View Details
                        </button>
                      </li>

                      <!-- Start Production (only for planned items) -->
                      <li v-if="canStartProduction(sample)">
                        <button
                          @click.stop.prevent="startSampleProduction(sample.id)"
                          @mousedown.stop
                          :disabled="loading"
                          class="text-sm text-success disabled:opacity-50"
                        >
                          <span
                            v-if="loading"
                            class="loading loading-spinner loading-xs mr-2"
                          ></span>
                          <Play v-else class="w-3 h-3 mr-2" />
                          <span>
                            {{ loading ? 'Starting…' : 'Start Production' }}
                          </span>
                        </button>
                      </li>

                      <!-- Complete (only for in-progress items) -->
                      <li v-if="sample.status === 'In Progress'">
                        <button
                          @click.stop.prevent="openCompleteModal(sample)"
                          @mousedown.stop
                          class="text-sm text-success"
                        >
                          <Check class="w-3 h-3 mr-2 !text-success" />
                          Complete Production
                        </button>
                      </li>

                      <!-- Mark as Failed (only for in-progress items) -->
                      <li v-if="sample.status === 'In Progress'">
                        <button
                          @click.stop.prevent="openFailModal(sample)"
                          @mousedown.stop
                          class="text-sm text-red-500"
                        >
                          <AlertTriangle class="w-3 h-3 mr-2" />
                          Mark as Failed
                        </button>
                      </li>

                      <!-- Edit (only for planned items) -->
                      <li v-if="sample.status === 'Planned'">
                        <button
                          @click.stop.prevent="openEditModal(sample)"
                          @mousedown.stop
                          class="text-sm text-orange-500"
                        >
                          <Edit class="w-3 h-3 mr-2" />
                          Edit Production
                        </button>
                      </li>

                      <!-- Cancel (only for planned items) -->
                      <li v-if="sample.status === 'Planned'">
                        <button
                          @click.stop.prevent="
                            cancelSampleProduction(sample.id)
                          "
                          @mousedown.stop
                          class="text-sm text-red-500"
                        >
                          <X class="w-3 h-3 mr-2" />
                          Cancel Production
                        </button>
                      </li>

                      <!-- Delete (only for failed/cancelled items) -->
                      <li
                        v-if="['Failed', 'Cancelled'].includes(sample.status)"
                      >
                        <button
                          @click.stop.prevent="
                            deleteSampleProduction(sample.id)
                          "
                          @mousedown.stop
                          class="text-sm text-red-500"
                        >
                          <Trash2 class="w-3 h-3 mr-2" />
                          Delete Production
                        </button>
                      </li>
                    </ul>
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
                        typeof getIngredientAvailabilityStatus(sample)
                          .available_ingredients === 'string'
                          ? getIngredientAvailabilityStatus(sample)
                              .available_ingredients
                          : `${getIngredientAvailabilityStatus(sample).available_ingredients}/${getIngredientAvailabilityStatus(sample).total_ingredients} available`
                      }}
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
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-primaryColor/10 flex items-center justify-center"
              >
                <BarChart3 class="w-5 h-5 text-primaryColor" />
              </div>
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

          <!-- Monitoring Statistics -->
          <div
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <div
              class="card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-sm"
            >
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs text-blue-600 font-medium mb-1">
                      Active Productions
                    </div>
                    <div class="text-2xl font-bold text-blue-700">
                      {{
                        sampleProductions.filter(
                          (s) => s.status === 'In Progress'
                        ).length
                      }}
                    </div>
                  </div>
                  <div
                    class="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center"
                  >
                    <Play class="w-4 h-4 text-blue-500" />
                  </div>
                </div>
              </div>
            </div>

            <div
              class="card bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 shadow-sm"
            >
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs text-yellow-600 font-medium mb-1">
                      Today's Schedule
                    </div>
                    <div class="text-2xl font-bold text-yellow-700">
                      {{
                        sampleProductions.filter(
                          (s) =>
                            s.scheduled_date ===
                              new Date().toISOString().split('T')[0] &&
                            s.status === 'Planned'
                        ).length
                      }}
                    </div>
                  </div>
                  <div
                    class="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center"
                  >
                    <Calendar class="w-4 h-4 text-yellow-500" />
                  </div>
                </div>
              </div>
            </div>

            <div
              class="card bg-gradient-to-br from-green-50 to-green-100 border border-green-200 shadow-sm"
            >
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs text-green-600 font-medium mb-1">
                      Completed Today
                    </div>
                    <div class="text-2xl font-bold text-green-700">
                      {{
                        sampleProductions.filter(
                          (s) =>
                            s.actual_end_date &&
                            new Date(s.actual_end_date).toDateString() ===
                              new Date().toDateString() &&
                            s.status === 'Completed'
                        ).length
                      }}
                    </div>
                  </div>
                  <div
                    class="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center"
                  >
                    <CheckCircle class="w-4 h-4 text-green-500" />
                  </div>
                </div>
              </div>
            </div>

            <div
              class="card bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 shadow-sm"
            >
              <div class="card-body p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs text-purple-600 font-medium mb-1">
                      Total Productions
                    </div>
                    <div class="text-2xl font-bold text-purple-700">
                      {{ sampleProductions.length }}
                    </div>
                  </div>
                  <div
                    class="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center"
                  >
                    <BarChart3 class="w-4 h-4 text-purple-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Active Productions & Today's Schedule -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div
              class="card bg-gradient-to-br from-base-100 to-base-50 border border-gray-200 shadow-lg"
            >
              <div class="card-body p-6">
                <div class="flex items-center gap-3 mb-6">
                  <div
                    class="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center"
                  >
                    <Play class="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 class="card-title text-lg font-bold text-primaryColor">
                      Active Productions
                    </h3>
                    <p class="text-xs text-gray-500">
                      Currently running sample productions
                    </p>
                  </div>
                </div>

                <div class="space-y-4 max-h-96 overflow-y-auto">
                  <div
                    v-for="sample in sampleProductions.filter(
                      (s) => s.status === 'In Progress'
                    )"
                    :key="sample.id"
                    class="flex items-start gap-4 p-4 bg-white/70 rounded-xl hover:bg-white transition-all duration-200 hover:shadow-md border border-gray-100"
                  >
                    <div class="flex-shrink-0">
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10"
                      >
                        <FlaskConical class="w-5 h-5 text-blue-500" />
                      </div>
                    </div>

                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between items-start mb-3">
                        <div class="flex-1">
                          <h4 class="font-bold text-sm text-gray-900 mb-1">
                            {{ sample.menu_item_name }}
                          </h4>
                          <div
                            class="flex items-center gap-2 text-xs text-gray-600 mb-1"
                          >
                            <span class="bg-gray-100 px-2 py-1 rounded-full">
                              Batch #{{ sample.sample_batch_number }}
                            </span>
                            <span>•</span>
                            <span
                              >{{ sample.batch_size }}
                              {{ sample.batch_unit }}</span
                            >
                          </div>
                          <p class="text-xs text-gray-500">
                            Started: {{ formatDate(sample.actual_start_date) }}
                          </p>
                        </div>

                        <div class="text-right">
                          <div class="flex items-center gap-2 justify-end mb-2">
                            <div
                              class="badge bg-info/10 badge-sm border-none font-medium text-info"
                            >
                              In Progress
                            </div>
                          </div>
                          <div class="text-xs text-gray-500 font-medium mb-2">
                            {{ sample.assigned_to_name || 'Unassigned' }}
                          </div>
                          <div class="flex gap-1">
                            <button
                              @click.stop.prevent="openDetailsModal(sample)"
                              class="btn btn-xs btn-ghost text-primaryColor hover:bg-primaryColor/10"
                              title="View Details"
                            >
                              <Eye class="w-3 h-3" />
                            </button>
                            <button
                              @click.stop.prevent="openCompleteModal(sample)"
                              class="btn btn-xs btn-ghost text-success hover:bg-success/10"
                              title="Mark as Complete"
                            >
                              <CheckCircle class="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="
                      sampleProductions.filter(
                        (s) => s.status === 'In Progress'
                      ).length === 0
                    "
                    class="text-center py-8"
                  >
                    <FlaskConical
                      class="w-12 h-12 mx-auto text-gray-400 mb-2"
                    />
                    <p class="text-gray-500">
                      No active productions at the moment
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              class="card bg-gradient-to-br from-base-100 to-base-50 border border-gray-200 shadow-lg"
            >
              <div class="card-body p-6">
                <div class="flex items-center gap-3 mb-6">
                  <div
                    class="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center"
                  >
                    <Calendar class="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <h3 class="card-title text-lg font-bold text-primaryColor">
                      Today's Schedule
                    </h3>
                    <p class="text-xs text-gray-500">
                      Productions scheduled for today
                    </p>
                  </div>
                </div>

                <div class="space-y-4 max-h-96 overflow-y-auto">
                  <div
                    v-for="sample in sampleProductions.filter(
                      (s) =>
                        s.scheduled_date ===
                          new Date().toISOString().split('T')[0] &&
                        s.status === 'Planned'
                    )"
                    :key="sample.id"
                    class="flex items-start gap-4 p-4 bg-white/70 rounded-xl hover:bg-white transition-all duration-200 hover:shadow-md border border-gray-100"
                  >
                    <div class="flex-shrink-0">
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-500/10"
                      >
                        <Clock class="w-5 h-5 text-yellow-500" />
                      </div>
                    </div>

                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between items-start mb-3">
                        <div class="flex-1">
                          <h4 class="font-bold text-sm text-gray-900 mb-1">
                            {{ sample.menu_item_name }}
                          </h4>
                          <div
                            class="flex items-center gap-2 text-xs text-gray-600 mb-1"
                          >
                            <span class="bg-gray-100 px-2 py-1 rounded-full">
                              {{ sample.scheduled_time || 'Time not set' }}
                            </span>
                            <span>•</span>
                            <span
                              >{{ sample.batch_size }}
                              {{ sample.batch_unit }}</span
                            >
                          </div>
                          <p class="text-xs text-gray-500">
                            Batch #{{ sample.sample_batch_number }}
                          </p>
                        </div>

                        <div class="text-right">
                          <div class="flex items-center gap-2 justify-end mb-2">
                            <div
                              class="badge bg-warning/10 badge-sm border-none font-medium text-warning"
                            >
                              Scheduled
                            </div>
                          </div>
                          <div class="text-xs text-gray-500 font-medium mb-2">
                            {{ sample.assigned_to_name || 'Unassigned' }}
                          </div>
                          <div class="flex gap-1">
                            <button
                              @click.stop.prevent="openDetailsModal(sample)"
                              class="btn btn-xs btn-ghost text-primaryColor hover:bg-primaryColor/10"
                              title="View Details"
                            >
                              <Eye class="w-3 h-3" />
                            </button>
                            <button
                              @click.stop.prevent="
                                startSampleProduction(sample.id)
                              "
                              class="btn btn-xs btn-ghost text-success hover:bg-success/10"
                              title="Start Production"
                            >
                              <Play class="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
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
                    class="text-center py-8"
                  >
                    <Calendar class="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p class="text-gray-500">
                      No productions scheduled for today
                    </p>
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
                  :max="maxBatchSize"
                  step="1"
                  @input="validateBatchSize"
                  @keypress="onlyAllowPositiveNumbers"
                  class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
                  placeholder="Size"
                  required
                />
                <div class="text-xs text-gray-600 mt-1">
                  {{ batchSizeValidationMessage }}
                  <div class="mt-1" v-if="batchSizeStatus !== 'empty'">
                    <span
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      :class="{
                        'bg-red-100 text-red-800': batchSizeStatus === 'error',
                        'bg-yellow-100 text-yellow-800':
                          batchSizeStatus === 'warning',
                        'bg-green-100 text-green-800':
                          batchSizeStatus === 'normal',
                      }"
                    >
                      <span v-if="batchSizeStatus === 'error'">
                        <font-awesome-icon
                          icon="fa-solid fa-triangle-exclamation"
                        />
                        Exceeds limit</span
                      >
                      <span v-if="batchSizeStatus === 'warning'">
                        <font-awesome-icon
                          icon="fa-solid fa-triangle-exclamation"
                        />
                        Near limit</span
                      >
                      <span v-if="batchSizeStatus === 'normal'">
                        <font-awesome-icon icon="fa-solid fa-check" />
                        Within limit</span
                      >
                    </span>
                  </div>
                </div>
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
              class="bg-secondaryColor/10 border border-primaryColor/20 p-4 rounded-xl"
            >
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-thin text-primaryColor">
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
                        ),
                        false
                      )
                    "
                    class="btn btn-xs btn-ghost text-primaryColor hover:bg-primaryColor/10"
                    title="Refresh ingredient availability (instant)"
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
                    <div class="text-2xl font-thin text-primaryColor">
                      {{ ingredientAvailability.total_ingredients }}
                    </div>
                    <div class="text-xs text-primaryColor">
                      Total Ingredients
                    </div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-thin text-primaryColor">
                      {{ ingredientAvailability.available_ingredients }}
                    </div>
                    <div class="text-xs text-primaryColor">Available</div>
                  </div>
                  <div class="text-center">
                    <div
                      class="text-2xl font-thin"
                      :class="
                        ingredientAvailability.sufficient_for_production
                          ? 'text-primaryColor'
                          : 'text-red-600'
                      "
                    >
                      {{
                        ingredientAvailability.sufficient_for_production
                          ? 'Ready'
                          : 'Issues'
                      }}
                    </div>
                    <div class="text-xs text-primaryColor">Status</div>
                  </div>
                </div>

                <!-- Detailed Ingredient Breakdown -->
                <div class="border-t border-primaryColor/20 pt-4">
                  <div class="text-sm font-medium text-primaryColor mb-3">
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
                          <div
                            class="font-medium text-sm text-primaryColor mb-1"
                          >
                            {{ ingredient.ingredient_name }}
                          </div>
                          <div class="text-xs text-gray-600 mb-2">
                            <span class="font-medium">Required:</span>
                            <span class="text-primaryColor ml-1 font-thin">
                              {{ formatQuantity(ingredient.required_quantity) }}
                              {{ ingredient.unit }}
                            </span>
                            <span class="mx-2">•</span>
                            <span class="font-medium">Available:</span>
                            <span
                              class="ml-1 font-thin"
                              :class="
                                ingredient.is_available
                                  ? 'text-primaryColor'
                                  : 'text-error'
                              "
                            >
                              {{
                                formatQuantity(ingredient.available_quantity)
                              }}
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
                            class="badge text-xs badge-xs"
                            :class="{
                              'badge-success border-none text-success bg-success/20 font-thin':
                                ingredient.available_quantity >=
                                ingredient.required_quantity,
                              'badge-warning border-none text-warning bg-warning/20 font-thin':
                                ingredient.available_quantity > 0 &&
                                ingredient.available_quantity <
                                  ingredient.required_quantity,
                              'badge-error border-none text-error bg-error/20 font-thin':
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
                    {{ ingredientAvailability.total_ingredients }} ingredients
                    are insufficient for production.
                  </div>
                </div>

                <!-- Production readiness status -->
                <div
                  class="flex items-center justify-between pt-3 border-t border-primaryColor/20"
                >
                  <span class="text-sm text-primaryColor font-medium"
                    >Production Ready:</span
                  >
                  <span
                    class="badge badge-sm"
                    :class="
                      ingredientAvailability.sufficient_for_production
                        ? 'badge-success bg-success/20 border-none text-success font-thin'
                        : 'badge-error bg-error/20 border-none text-error font-thin'
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
                class="text-center text-primaryColor py-4"
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
                  :max="maxBatchSize"
                  step="1"
                  @input="validateBatchSize"
                  @keypress="onlyAllowPositiveNumbers"
                  :class="batchSizeInputClass"
                  placeholder="10"
                  required
                />
                <div class="text-xs text-gray-600 mt-1">
                  {{ batchSizeValidationMessage }}
                  <div class="mt-1" v-if="batchSizeStatus !== 'empty'">
                    <span
                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                      :class="{
                        'bg-red-100 text-red-800': batchSizeStatus === 'error',
                        'bg-yellow-100 text-yellow-800':
                          batchSizeStatus === 'warning',
                        'bg-green-100 text-green-800':
                          batchSizeStatus === 'normal',
                      }"
                    >
                      <span v-if="batchSizeStatus === 'error'">
                        <font-awesome-icon
                          icon="fa-solid fa-triangle-exclamation"
                        />
                        Exceeds limit</span
                      >
                      <span v-if="batchSizeStatus === 'warning'">
                        <font-awesome-icon
                          icon="fa-solid fa-triangle-exclamation"
                        />
                        Near limit</span
                      >
                      <span v-if="batchSizeStatus === 'normal'">
                        <font-awesome-icon icon="fa-solid fa-check" />
                        Within limit</span
                      >
                    </span>
                  </div>
                </div>
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
              class="bg-secondaryColor/10 border border-primaryColor/20 p-4 rounded-xl"
            >
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold text-primaryColor">
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
                        ),
                        false
                      )
                    "
                    class="btn btn-xs btn-ghost text-primaryColor hover:bg-primaryColor/10"
                    title="Refresh ingredient availability (instant)"
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
                    <div class="text-2xl font-bold text-primaryColor">
                      {{ ingredientAvailability.total_ingredients }}
                    </div>
                    <div class="text-xs text-primaryColor">
                      Total Ingredients
                    </div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-primaryColor">
                      {{ ingredientAvailability.available_ingredients }}
                    </div>
                    <div class="text-xs text-primaryColor">Available</div>
                  </div>
                  <div class="text-center">
                    <div
                      class="text-2xl font-bold"
                      :class="
                        ingredientAvailability.sufficient_for_production
                          ? 'text-primaryColor'
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
                <div class="border-t border-primaryColor/20 pt-4">
                  <div class="text-sm font-medium text-primaryColor mb-3">
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
                          <div
                            class="font-medium text-sm text-primaryColor/70 mb-1"
                          >
                            {{ ingredient.ingredient_name }}
                          </div>
                          <div class="text-xs text-gray-600 mb-2">
                            <span class="font-medium">Required:</span>
                            <span
                              class="text-primaryColor/70 font-semibold ml-1"
                            >
                              {{ formatQuantity(ingredient.required_quantity) }}
                              {{ ingredient.unit }}
                            </span>
                            <span class="mx-2">•</span>
                            <span class="font-medium">Available:</span>
                            <span
                              class="font-semibold ml-1 text-primaryColor/70"
                              :class="
                                ingredient.is_available
                                  ? 'text-primaryColor'
                                  : 'text-error'
                              "
                            >
                              {{
                                formatQuantity(ingredient.available_quantity)
                              }}
                              {{ ingredient.unit }}
                            </span>
                          </div>
                          <div class="text-xs text-gray-600">
                            <span class="font-medium"
                              >Cost per {{ ingredient.unit }}:</span
                            >
                            <span
                              class="font-semibold ml-1 text-primaryColor/70"
                            >
                              ₱{{ formatCurrency(ingredient.cost_per_unit) }}
                            </span>
                            <span class="ml-2">•</span>
                            <span class="font-medium">Total:</span>
                            <span
                              class="font-semibold ml-1 text-primaryColor/70"
                            >
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
                            class="badge text-xs badge-xs"
                            :class="{
                              'badge-success border-none text-success bg-success/20 font-thin':
                                ingredient.available_quantity >=
                                ingredient.required_quantity,
                              'badge-warning border-none text-warning bg-warning/20 font-thin':
                                ingredient.available_quantity > 0 &&
                                ingredient.available_quantity <
                                  ingredient.required_quantity,
                              'badge-error border-none text-error bg-error/20 font-thin':
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
                            class="text-xs text-error font-thin"
                          >
                            Short by
                            <span class="font-semibold text-primaryColor/70">
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
                  class="bg-secondaryColor/10 border border-primaryColor/20 p-3 rounded-lg"
                >
                  <div class="text-sm font-medium text-primaryColor mb-2">
                    <font-awesome-icon
                      icon="fa-solid fa-exclamation-triangle"
                    />
                    Issues Found:
                  </div>
                  <div class="text-xs text-primaryColor">
                    {{
                      ingredientAvailability.total_ingredients -
                      ingredientAvailability.available_ingredients
                    }}
                    out of
                    {{ ingredientAvailability.total_ingredients }} ingredients
                    are insufficient for production.
                  </div>
                </div>

                <!-- Production readiness status -->
                <div
                  class="flex items-center justify-between pt-3 border-t border-primaryColor/20"
                >
                  <span class="text-sm text-primaryColor font-medium"
                    >Production Ready:</span
                  >
                  <span
                    class="badge badge-xs"
                    :class="
                      ingredientAvailability.sufficient_for_production
                        ? 'badge-success bg-success/20 border-none text-success font-thin'
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
                class="text-center text-primaryColor py-4"
              >
                <Package class="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div class="text-sm">
                  Select a menu item to check ingredient availability
                </div>
              </div>
            </div>

            <div class="modal-action">
              <button
                type="button"
                @click="closeEditModal"
                class="btn btn-sm bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="btn btn-sm bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
                :disabled="loading"
              >
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
        <div
          v-if="selectedSample"
          class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/95 shadow-lg"
        >
          <div
            class="flex items-center justify-between mb-6 border-b border-black/10 pb-4"
          >
            <div>
              <h3 class="font-bold text-xl text-primaryColor">
                Sample Production Details
              </h3>
              <p class="text-sm text-gray-600 mt-1">
                {{ selectedSample.menu_item_name }} - Batch
                {{ selectedSample.sample_batch_number }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="badge badge-sm"
                :class="getStatusBadgeClass(selectedSample?.status || '')"
              >
                {{ selectedSample?.status || 'N/A' }}
              </span>
              <span
                v-if="selectedSample?.priority"
                class="badge badge-sm"
                :class="getPriorityBadgeClass(selectedSample.priority)"
              >
                {{ selectedSample.priority }}
              </span>
            </div>
          </div>

          <div class="space-y-6">
            <!-- Basic Information -->
            <div
              class="bg-secondaryColor/10 border border-primaryColor/20 p-4 rounded-xl"
            >
              <h4 class="font-semibold text-primaryColor mb-4">
                <font-awesome-icon
                  icon="fa-solid fa-info-circle"
                  class="mr-2"
                />
                Basic Information
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-3">
                  <div class="flex justify-between">
                    <span class="text-gray-600">Menu Item:</span>
                    <span class="font-medium text-primaryColor">{{
                      selectedSample?.menu_item_name || 'N/A'
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Recipe:</span>
                    <span class="font-medium text-primaryColor">{{
                      selectedSample?.recipe_name || 'N/A'
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Batch Size:</span>
                    <span class="font-medium text-primaryColor"
                      >{{ selectedSample?.batch_size || 'N/A' }}
                      {{ selectedSample?.batch_unit || '' }}</span
                    >
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-600">Estimated Cost:</span>
                    <span class="font-medium text-info">
                      {{ formatCurrency(selectedSample?.estimated_cost || 0) }}
                    </span>
                  </div>
                </div>
                <div class="space-y-3">
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

            <!-- Production Notes -->
            <div
              v-if="selectedSample?.production_notes"
              class="bg-secondaryColor/10 border border-primaryColor/20 p-4 rounded-xl"
            >
              <h4 class="font-semibold text-primaryColor mb-3">
                <font-awesome-icon
                  icon="fa-solid fa-sticky-note"
                  class="mr-2"
                />
                Production Notes
              </h4>
              <p class="text-gray-700 text-sm leading-relaxed">
                {{ selectedSample.production_notes }}
              </p>
            </div>

            <!-- Ingredient Availability Check -->
            <div
              class="bg-secondaryColor/10 border border-primaryColor/20 p-4 rounded-xl"
            >
              <div class="flex items-center justify-between mb-4">
                <h4 class="font-semibold text-primaryColor">
                  <font-awesome-icon icon="fa-solid fa-box" class="mr-2" />
                  Ingredient Availability Check
                </h4>
                <button
                  @click="refreshIngredientAvailability"
                  class="btn btn-xs btn-ghost text-primaryColor hover:bg-primaryColor/10"
                  title="Refresh ingredient availability"
                >
                  <RefreshCcw class="w-3 h-3" />
                </button>
              </div>

              <div
                v-if="selectedSample?.ingredient_availability"
                class="space-y-4"
              >
                <!-- Summary Cards -->
                <div class="grid grid-cols-3 gap-4 text-sm">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-primaryColor">
                      {{
                        selectedSample.ingredient_availability.total_ingredients
                      }}
                    </div>
                    <div class="text-xs text-primaryColor">
                      Total Ingredients
                    </div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-success">
                      {{
                        selectedSample.ingredient_availability
                          .available_ingredients
                      }}
                    </div>
                    <div class="text-xs text-primaryColor">Available</div>
                  </div>
                  <div class="text-center">
                    <div
                      class="text-2xl font-bold"
                      :class="
                        selectedSample.ingredient_availability
                          .sufficient_for_production
                          ? 'text-primaryColor'
                          : 'text-red-600'
                      "
                    >
                      {{
                        selectedSample.ingredient_availability
                          .sufficient_for_production
                          ? 'Ready'
                          : 'Issues'
                      }}
                    </div>
                    <div class="text-xs text-gray-600">Status</div>
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
                  class="bg-red-50 border border-red-200 rounded-lg p-3"
                >
                  <div class="text-sm font-medium text-red-800 mb-2">
                    <font-awesome-icon
                      icon="fa-solid fa-triangle-exclamation"
                      class="mr-1"
                    />
                    Issues Found:
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="ingredient in selectedSample
                        .ingredient_availability.insufficient_ingredients"
                      :key="ingredient.ingredient_name"
                      class="text-xs bg-red-100 p-2 rounded border border-red-200"
                    >
                      <div class="font-medium text-red-800">
                        {{ ingredient.ingredient_name }}
                      </div>
                      <div class="text-red-700">
                        Need {{ formatQuantity(ingredient.required_quantity) }}
                        {{ ingredient.unit }}, have
                        {{ formatQuantity(ingredient.available_quantity) }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Detailed Ingredient Breakdown -->
                <div class="border-t border-primaryColor/20 pt-4">
                  <div class="text-sm font-medium text-primaryColor mb-3">
                    <font-awesome-icon
                      icon="fa-solid fa-clipboard"
                      class="mr-1"
                    />
                    Ingredient Details:
                  </div>
                  <div class="space-y-3 max-h-96 overflow-y-auto">
                    <div
                      v-for="ingredient in selectedSample
                        .ingredient_availability.ingredients"
                      :key="ingredient.ingredient_name"
                      class="p-3 rounded-lg border border-primaryColor/10 bg-white/50"
                    >
                      <div class="flex items-start justify-between">
                        <div class="flex-1">
                          <div
                            class="font-medium text-sm text-primaryColor/70 mb-1"
                          >
                            {{ ingredient.ingredient_name }}
                          </div>
                          <div class="text-xs text-gray-600 mb-2">
                            <span class="font-medium">Required:</span>
                            <span
                              class="text-primaryColor/70 font-semibold ml-1"
                            >
                              {{ formatQuantity(ingredient.required_quantity) }}
                              {{ ingredient.unit }}
                            </span>
                            <span class="mx-2">•</span>
                            <span class="font-medium">Available:</span>
                            <span
                              class="text-primaryColor/70 font-semibold ml-1"
                            >
                              {{
                                formatQuantity(ingredient.available_quantity)
                              }}
                              {{ ingredient.unit }}
                            </span>
                          </div>
                          <div class="text-xs text-gray-500">
                            Cost per {{ ingredient.unit }}:
                            {{ formatCurrency(ingredient.cost_per_unit || 0) }}
                          </div>
                        </div>
                        <div class="ml-3">
                          <span
                            class="badge text-xs"
                            :class="{
                              'badge-success border-none text-success bg-success/20 badge-xs':
                                ingredient.is_available,
                              'badge-warning border-none text-warning bg-warning/20 badge-xs':
                                !ingredient.is_available &&
                                ingredient.available_quantity > 0,
                              'badge-error border-none text-error bg-error/20 badge-xs':
                                ingredient.available_quantity <= 0,
                            }"
                          >
                            {{
                              ingredient.is_available
                                ? 'Sufficient'
                                : ingredient.available_quantity <= 0
                                  ? 'Out of stock'
                                  : 'Insufficient'
                            }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="text-center text-gray-500 py-8">
                <AlertCircle class="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div class="text-sm">Availability data not available</div>
                <button
                  @click="refreshIngredientAvailability"
                  class="btn btn-xs btn-outline mt-2"
                >
                  Refresh Data
                </button>
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
            <button
              @click="closeDetailsModal"
              class="btn btn-ghost btn-sm font-thin"
            >
              Close
            </button>
            <button
              v-if="
                selectedSample?.status === 'Planned' &&
                canStartProduction(selectedSample)
              "
              @click="startSampleProduction(selectedSample.id)"
              class="btn bg-primaryColor text-white border-none hover:bg-primaryColor/80 btn-sm shadow-none font-thin"
            >
              <Play class="w-4 h-4 mr-2" />
              Start Production
            </button>
          </div>
        </div>
      </dialog>

      <!-- Shared Confirmation Modal for other operations -->
      <dialog
        id="sample_confirmation_modal"
        class="modal"
        :class="{ 'modal-open': confirmModal.show }"
      >
        <div class="modal-box max-w-sm">
          <h3
            class="font-bold text-lg text-primaryColor"
            :class="{
              'text-red-500':
                confirmModal.type === 'cancel' ||
                confirmModal.type === 'delete',
            }"
          >
            {{ confirmModal.title }}
          </h3>
          <p class="text-gray-700 mb-4">{{ confirmModal.message }}</p>
          <div class="modal-action">
            <button
              @click="closeConfirmModal"
              :disabled="loading"
              class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none btn-sm disabled:opacity-50"
            >
              No
            </button>
            <button
              @click="confirmModal.onConfirm"
              :disabled="loading"
              :class="
                confirmModal.type === 'cancel' || confirmModal.type === 'delete'
                  ? 'btn bg-red-500 text-white btn-sm font-thin border-none hover:bg-red-500/80 disabled:opacity-50'
                  : 'btn bg-primaryColor text-white btn-sm font-thin border-none hover:bg-primaryColor/80 disabled:opacity-50'
              "
            >
              <span
                class="loading loading-spinner loading-sm mr-2"
                v-if="loading"
              ></span>
              {{
                confirmModal.type === 'start' && loading
                  ? 'Starting…'
                  : confirmModal.type === 'cancel'
                    ? 'Cancel'
                    : confirmModal.type === 'delete'
                      ? 'Delete'
                      : confirmModal.type === 'create'
                        ? 'Create'
                        : confirmModal.type === 'update'
                          ? 'Update'
                          : 'Yes'
              }}
            </button>
          </div>
        </div>
      </dialog>

      <!-- Fail Confirmation Modal -->
      <dialog
        id="sample_fail_modal"
        class="modal"
        :class="{ 'modal-open': failModal.show }"
      >
        <div class="modal-box max-w-md">
          <h3 class="font-bold text-lg text-red-500">
            {{ failModal.title }}
          </h3>
          <p class="text-gray-700 mb-4">{{ failModal.message }}</p>

          <!-- Fail form summary + fields -->
          <div class="space-y-4">
            <div class="bg-red-50 border border-red-200 p-3 rounded">
              <div class="font-medium text-red-500 mb-1">
                {{ failModal.data?.menu_item_name || 'Sample' }}
              </div>
              <div class="text-xs text-black/60 grid grid-cols-2 gap-y-1">
                <div>
                  <span class="font-thin text-red-500">Batch:</span>
                  {{ failModal.data?.sample_batch_number }}
                </div>
                <div>
                  <span class="font-thin text-red-500">Planned:</span>
                  {{ failModal.data?.batch_size }} servings
                </div>
                <div>
                  <span class="font-thin text-red-500">Schedule:</span>
                  {{ formatDate(failModal.data?.scheduled_date) }}
                  {{ formatTime(failModal.data?.scheduled_time) }}
                </div>
                <div>
                  <span class="font-thin text-red-500">Assigned:</span>
                  {{ failModal.data?.assigned_to_name || 'Unassigned' }}
                </div>
                <div>
                  <span class="font-thin text-red-500">Est. Cost:</span>
                  {{ formatCurrency(failModal.data?.estimated_cost) }}
                </div>
                <div v-if="failModal.data?.priority">
                  <span class="font-thin text-red-500">Priority:</span>
                  {{ failModal.data?.priority }}
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <div>
                <label class="label text-xs text-black/60"
                  >Failure Reason</label
                >
                <input
                  v-model="failForm.failure_reason"
                  type="text"
                  class="input input-bordered input-sm w-full bg-white"
                  placeholder="e.g., Equipment malfunction"
                />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label text-xs text-black/60"
                    >Quantity Lost</label
                  >
                  <input
                    v-model.number="failForm.quantity_lost"
                    type="number"
                    :min="0"
                    :max="failModal.data?.batch_size || 0"
                    step="0.01"
                    class="input input-bordered input-sm w-full bg-white"
                  />
                  <div class="text-[10px] text-black/40 mt-1">
                    Max: {{ failModal.data?.batch_size || 0 }} servings
                  </div>
                </div>
                <div>
                  <label class="label text-xs text-black/60"
                    >Cost Incurred (₱)</label
                  >
                  <input
                    v-model.number="failForm.cost_incurred"
                    type="number"
                    min="0"
                    step="0.01"
                    class="input input-bordered input-sm w-full bg-white"
                  />
                  <div class="text-[10px] text-black/40 mt-1">
                    Prefilled from estimated cost
                  </div>
                </div>
              </div>
              <div>
                <label class="label text-xs text-black/60"
                  >Notes (optional)</label
                >
                <textarea
                  v-model="failForm.notes"
                  class="textarea textarea-bordered w-full bg-white"
                  rows="2"
                  placeholder="Additional details"
                />
              </div>
            </div>
          </div>
          <div class="modal-action">
            <button
              @click="closeFailModal"
              :disabled="loading"
              class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none btn-sm disabled:opacity-50"
            >
              No
            </button>
            <button
              @click="failModal.onConfirm"
              :disabled="loading || !canConfirmFail"
              class="btn bg-red-500 text-white btn-sm font-thin border-none hover:bg-red-500/80 disabled:opacity-50"
            >
              <span
                class="loading loading-spinner loading-sm mr-2"
                v-if="loading"
              ></span>
              {{ canConfirmFail ? 'Confirm Fail' : 'Add Reason to Continue' }}
            </button>
          </div>
        </div>
      </dialog>

      <!-- Complete Confirmation Modal -->
      <dialog
        id="sample_complete_modal"
        class="modal"
        :class="{ 'modal-open': completeModal.show }"
      >
        <div class="modal-box max-w-md">
          <h3 class="font-bold text-lg text-primaryColor">
            {{ completeModal.title }}
          </h3>
          <p class="text-gray-700 mb-4">{{ completeModal.message }}</p>

          <!-- Complete form summary + fields -->
          <div class="space-y-4">
            <div class="bg-green-50 border border-green-200 p-3 rounded">
              <div class="font-medium text-success mb-1">
                {{ completeModal.data?.menu_item_name || 'Sample' }}
              </div>
              <div class="text-xs text-black/60 grid grid-cols-2 gap-y-1">
                <div>
                  <span class="font-semibold">Batch:</span>
                  {{ completeModal.data?.sample_batch_number }}
                </div>
                <div>
                  <span class="font-semibold">Planned:</span>
                  {{ completeModal.data?.batch_size }} servings
                </div>
                <div>
                  <span class="font-semibold">Schedule:</span>
                  {{ formatDate(completeModal.data?.scheduled_date) }}
                  {{ formatTime(completeModal.data?.scheduled_time) }}
                </div>
                <div>
                  <span class="font-semibold">Assigned:</span>
                  {{ completeModal.data?.assigned_to_name || 'Unassigned' }}
                </div>
                <div>
                  <span class="font-semibold">Est. Cost:</span>
                  {{ formatCurrency(completeModal.data?.estimated_cost) }}
                </div>
                <div v-if="completeModal.data?.priority">
                  <span class="font-semibold">Priority:</span>
                  {{ completeModal.data?.priority }}
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <div>
                <label class="label text-xs text-black/60"
                  >Quantity Produced</label
                >
                <input
                  v-model.number="completeForm.quantity_produced"
                  type="number"
                  :min="0"
                  :max="completeModal.data?.batch_size || 0"
                  step="0.01"
                  class="input input-bordered input-sm w-full bg-white"
                />
                <div class="text-[10px] text-black/40 mt-1">
                  Max: {{ completeModal.data?.batch_size || 0 }} servings
                </div>
              </div>
              <div>
                <label class="label text-xs text-black/60"
                  >Production Cost (₱)</label
                >
                <input
                  v-model.number="completeForm.production_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  class="input input-bordered input-sm w-full bg-white"
                />
              </div>
              <div>
                <label class="label text-xs text-black/60"
                  >Notes (optional)</label
                >
                <textarea
                  v-model="completeForm.notes"
                  class="textarea textarea-bordered w-full bg-white"
                  rows="2"
                  placeholder="Additional details"
                />
              </div>
            </div>
          </div>
          <div class="modal-action">
            <button
              @click="closeCompleteModal"
              :disabled="loading"
              class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none btn-sm disabled:opacity-50"
            >
              No
            </button>
            <button
              @click="completeModal.onConfirm"
              :disabled="loading || !canConfirmComplete"
              class="btn bg-primaryColor text-white btn-sm font-thin border-none hover:bg-primaryColor/80 disabled:opacity-50"
            >
              <span
                class="loading loading-spinner loading-sm mr-2"
                v-if="loading"
              ></span>
              {{ canConfirmComplete ? 'Confirm Complete' : 'Check Quantity' }}
            </button>
          </div>
        </div>
      </dialog>

      <!-- Toast -->
      <!-- Toast Notification - Enhanced from RecipeManagement.vue -->
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
    <!-- Sample Production Audit Log Component -->
    <SampleProductionAuditLog
      v-model:show="showAuditLog"
      @open-full-modal="handleOpenFullAuditLogModal"
    />

    <!-- Full Audit Log Modal -->
    <FullAuditLogModal v-model:show="showFullAuditLogModal" />
  </div>
</template>

<style scoped>
  .text-shadow-xs {
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }
</style>
