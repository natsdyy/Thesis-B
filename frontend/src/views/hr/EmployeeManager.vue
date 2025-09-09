<script setup>
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
  import { useRouter } from 'vue-router';
  import {
    Users,
    Search,
    RefreshCcw,
    Plus,
    BadgeCheck,
    Eye,
    Edit,
    Trash2,
    UserX,
    EllipsisVertical,
    UserCheck,
    Shield,
    AlertTriangle,
  } from 'lucide-vue-next';
  import { useEmployeeStore } from '../../stores/employeeStore.js';
  import { apiConfig } from '../../config/api.js';

  const router = useRouter();
  const employeeStore = useEmployeeStore();

  // UI state
  const searchQuery = ref('');
  const departmentFilter = ref('');
  const statusFilter = ref('');
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const showDeletedEmployees = ref(false);
  const loadingMore = ref(false);

  // Toast state (mirrors other views)
  const toast = ref({ show: false, type: 'success', message: '' });
  const showToast = (type, message) => {
    toast.value = { show: true, type, message };
    setTimeout(() => (toast.value.show = false), 3000);
  };
  // Confirm modal state
  const confirmModal = ref({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
    loading: false,
  });

  // Termination modal state
  const terminationModal = ref({
    show: false,
    employee: null,
    terminationReason: '',
    lastWorkingDay: '',
    handoverNotes: '',
    finalPayroll: false,
    systemAccess: false,
  });
  const openConfirm = (title, message, onConfirm) => {
    confirmModal.value = { show: true, title, message, onConfirm };
    document.getElementById('confirm_modal')?.showModal();
  };
  const closeConfirm = () => {
    document.getElementById('confirm_modal')?.close();
    confirmModal.value = {
      show: false,
      title: '',
      message: '',
      onConfirm: null,
      loading: false,
    };
  };

  // Termination modal functions
  const openTerminationModal = (emp) => {
    // Check if employee is already terminated
    if (emp.status === 'Terminated') {
      showToast(
        'warning',
        `${emp.first_name} ${emp.last_name} is already terminated.`
      );
      return;
    }

    terminationModal.value = {
      show: true,
      employee: emp,
      terminationReason: '',
      lastWorkingDay: '',
      handoverNotes: '',
      finalPayroll: false,
      systemAccess: false,
    };
    document.getElementById('termination_modal')?.showModal();
  };

  const closeTerminationModal = () => {
    document.getElementById('termination_modal')?.close();
    terminationModal.value = {
      show: false,
      employee: null,
      terminationReason: '',
      lastWorkingDay: '',
      handoverNotes: '',
      finalPayroll: false,
      systemAccess: false,
    };
  };

  const processTermination = async () => {
    try {
      // Close confirmation modal first
      closeConfirm();

      // Prepare termination data
      const terminationData = {
        termination_reason: terminationModal.value.terminationReason,
        last_working_day: terminationModal.value.lastWorkingDay,
        handover_notes: terminationModal.value.handoverNotes || null,
        final_payroll_processed: terminationModal.value.finalPayroll,
        system_access_revoked: terminationModal.value.systemAccess,
      };

      // Use the employee store's comprehensive termination method
      await employeeStore.terminateEmployee(
        terminationModal.value.employee.id,
        terminationData
      );

      showToast(
        'success',
        `${terminationModal.value.employee.first_name} ${terminationModal.value.employee.last_name} has been terminated with comprehensive details recorded`
      );
      closeTerminationModal();

      // Small delay to ensure backend has processed the termination
      setTimeout(async () => {
        await employeeStore.fetchEmployees(
          showDeletedEmployees.value,
          1,
          itemsPerPage.value
        ); // Refresh the list
      }, 500);
    } catch (err) {
      showToast('error', err.message || 'Failed to terminate employee');
    }
  };

  const showTerminationConfirmation = () => {
    openConfirm(
      'Terminate Employee',
      `Are you sure you want to terminate ${terminationModal.value.employee.first_name} ${terminationModal.value.employee.last_name}? This action cannot be undone.`,
      processTermination
    );
  };

  // Loading and error from store
  const loading = computed(() => employeeStore.loading);
  const error = computed(() => employeeStore.error);
  const pagination = computed(() => employeeStore.pagination);
  const hasMore = computed(() => employeeStore.hasMore);

  // Base employees list
  const employees = computed(() => employeeStore.employees || []);

  // Derive unique departments from data
  const departments = computed(() => {
    const set = new Set();
    (employees.value || []).forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  });

  // Filters + search
  const filteredEmployees = computed(() => {
    let list = employees.value || [];

    if (departmentFilter.value) {
      list = list.filter((e) => e.department === departmentFilter.value);
    }

    if (statusFilter.value) {
      list = list.filter(
        (e) =>
          (e.status || '').toLowerCase() === statusFilter.value.toLowerCase()
      );
    }

    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      list = list.filter(
        (e) =>
          (e.first_name || '').toLowerCase().includes(q) ||
          (e.last_name || '').toLowerCase().includes(q) ||
          (e.employee_id || '').toLowerCase().includes(q) ||
          (e.email || '').toLowerCase().includes(q) ||
          (e.department || '').toLowerCase().includes(q) ||
          (e.role || '').toLowerCase().includes(q) ||
          (e.job_title || '').toLowerCase().includes(q)
      );
    }

    // Sort recent first
    return [...list].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  });

  // Use filtered employees directly since we're using server-side pagination
  const paginatedEmployees = computed(() => filteredEmployees.value);

  // Keep current page in range when filters/data change
  watch([filteredEmployees, itemsPerPage], () => {
    currentPage.value = 1;
  });

  const refresh = async () => {
    try {
      await employeeStore.fetchEmployees(
        showDeletedEmployees.value,
        1,
        itemsPerPage.value
      );
      showToast('success', 'Employee list refreshed');
    } catch (e) {
      showToast('error', e.message || 'Failed to refresh employees');
    }
  };

  // Load more employees for lazy loading
  const loadMore = async () => {
    if (loadingMore.value || !hasMore.value) return;

    loadingMore.value = true;
    try {
      await employeeStore.loadMoreEmployees(showDeletedEmployees.value);
    } catch (error) {
      showToast('error', error.message || 'Failed to load more employees');
    } finally {
      loadingMore.value = false;
    }
  };

  // Toggle showing deleted employees
  const toggleDeletedEmployees = async () => {
    try {
      await employeeStore.fetchEmployees(
        showDeletedEmployees.value,
        1,
        itemsPerPage.value
      );
      showToast(
        'success',
        showDeletedEmployees.value
          ? 'Showing deleted employees'
          : 'Hiding deleted employees'
      );
    } catch (error) {
      showToast(
        'error',
        error.message || 'Failed to toggle deleted employees view'
      );
    }
  };

  const gotoAddEmployee = () => router.push({ name: 'HRAddEmployee' });
  // View modal state
  const selectedEmployee = ref(null);
  const openView = (emp) => {
    selectedEmployee.value = emp;
    document.getElementById('view_employee_modal')?.showModal();
  };
  const closeView = () => {
    document.getElementById('view_employee_modal')?.close();
    selectedEmployee.value = null;
  };

  // Edit modal state
  const showEditModal = ref(false);
  const employeeForm = ref({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    department: '',
    role_id: '',
    employee_type: '',
    status: 'Active',
    emergency_contact_name: '',
    emergency_relationship: '',
    emergency_contact_number: '',
    alternate_contact_number: '',
    emergency_contact_email: '',
    emergency_contact_address: '',
    isEditing: false,
    editingEmployeeId: null,
  });

  // Departments and roles data
  const departmentsWithRoles = ref({});
  const availableDepartments = computed(() =>
    Object.keys(departmentsWithRoles.value)
  );

  // Computed properties
  const availableRoles = computed(() => {
    return employeeForm.value.department
      ? departmentsWithRoles.value[employeeForm.value.department] || []
      : [];
  });

  const openEditModal = (emp) => {
    // Reset form first
    resetEmployeeForm();

    // Populate form with employee data
    employeeForm.value = {
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      email: emp.email || '',
      phone_number: emp.phone_number || '',
      address: emp.address || '',
      department: emp.department || '',
      role_id: emp.role_id || '',
      employee_type: emp.employee_type || '',
      status: emp.status || 'Active',
      emergency_contact_name: emp.emergency_contact_name || '',
      emergency_relationship: emp.emergency_relationship || '',
      emergency_contact_number: emp.emergency_contact_number || '',
      alternate_contact_number: emp.alternate_contact_number || '',
      emergency_contact_email: emp.emergency_contact_email || '',
      emergency_contact_address: emp.emergency_contact_address || '',
      isEditing: true,
      editingEmployeeId: emp.id,
    };

    showEditModal.value = true;
    document.getElementById('edit_employee_modal')?.showModal();
  };

  const closeEditModal = () => {
    showEditModal.value = false;
    document.getElementById('edit_employee_modal')?.close();
    resetEmployeeForm();
  };

  const resetEmployeeForm = () => {
    employeeForm.value = {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      address: '',
      department: '',
      role_id: '',
      employee_type: '',
      status: 'Active',
      emergency_contact_name: '',
      emergency_relationship: '',
      emergency_contact_number: '',
      alternate_contact_number: '',
      emergency_contact_email: '',
      emergency_contact_address: '',
      isEditing: false,
      editingEmployeeId: null,
    };
  };
  // Build absolute photo URL for backend-served uploads
  const getPhotoUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    const apiBase = (
      apiConfig?.baseURL ||
      import.meta?.env?.VITE_API_BASE_URL ||
      ''
    ).toString();
    const serverBase =
      apiBase.replace(/\/api\/?$/, '') || window.location.origin;
    if (serverBase) {
      return path.startsWith('/')
        ? `${serverBase}${path}`
        : `${serverBase}/${path}`;
    }
    // Fallback: try current origin
    return path;
  };
  // Row actions
  const viewEmployee = (emp) => openView(emp);
  const updateEmployee = (emp) => openEditModal(emp);

  // Save employee function
  const saveEmployee = async () => {
    try {
      confirmModal.value.loading = true; // Set loading state

      if (employeeForm.value.isEditing) {
        await employeeStore.updateEmployee(
          employeeForm.value.editingEmployeeId,
          employeeForm.value
        );
        showToast('success', 'Employee updated successfully');
      }
      closeEditModal();
      closeConfirm(); // Close the confirmation modal
      await employeeStore.fetchEmployees(
        showDeletedEmployees.value,
        1,
        itemsPerPage.value
      ); // Refresh the list
    } catch (err) {
      showToast('error', err.message || 'Failed to save employee');
      closeConfirm(); // Close the confirmation modal even on error
    } finally {
      confirmModal.value.loading = false; // Reset loading state
    }
  };

  const showEditConfirmation = () => {
    openConfirm(
      'Update Employee',
      `Are you sure you want to update ${employeeForm.value.first_name} ${employeeForm.value.last_name}?`,
      saveEmployee
    );
  };
  const terminateEmployee = (emp) => {
    openTerminationModal(emp);
  };

  // Restore terminated employee
  const restoreEmployee = (emp) => {
    openConfirm(
      'Restore Employee',
      `Are you sure you want to restore ${emp.first_name} ${emp.last_name} back to active status? This will change their status from "Terminated" to "Active".`,
      async () => {
        try {
          confirmModal.value.loading = true;
          await employeeStore.restoreTerminatedEmployee(emp.id);
          showToast(
            'success',
            `${emp.first_name} ${emp.last_name} has been restored to active status`
          );
          closeConfirm();
          await employeeStore.fetchEmployees(
            showDeletedEmployees.value,
            1,
            itemsPerPage.value
          ); // Refresh the list
        } catch (err) {
          showToast('error', err.message || 'Failed to restore employee');
        } finally {
          confirmModal.value.loading = false;
        }
      }
    );
  };

  // Restore deleted employee
  const restoreDeletedEmployee = (emp) => {
    openConfirm(
      'Restore Deleted Employee',
      `Are you sure you want to restore ${emp.first_name} ${emp.last_name}? This will remove them from the deleted list and make them active again.`,
      async () => {
        try {
          confirmModal.value.loading = true;
          await employeeStore.restoreEmployee(emp.id);
          showToast(
            'success',
            `${emp.first_name} ${emp.last_name} has been restored from deleted status`
          );
          closeConfirm();
          await employeeStore.fetchEmployees(
            showDeletedEmployees.value,
            1,
            itemsPerPage.value
          ); // Refresh the list
        } catch (err) {
          showToast(
            'error',
            err.message || 'Failed to restore deleted employee'
          );
        } finally {
          confirmModal.value.loading = false;
        }
      }
    );
  };
  const deleteEmployee = (emp) => {
    openConfirm(
      'Delete Employee',
      `This will remove ${emp.first_name} ${emp.last_name} from the active list. Continue?`,
      async () => {
        try {
          await employeeStore.deleteEmployee(emp.id);
          showToast('success', 'Employee deleted');
          closeConfirm();
          await employeeStore.fetchEmployees(
            showDeletedEmployees.value,
            1,
            itemsPerPage.value
          ); // Refresh the list
        } catch (err) {
          showToast('error', err.message || 'Failed to delete employee');
        }
      }
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  const formatDateLong = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  const statusBadgeClass = (status, isDeleted = false) => {
    if (isDeleted) {
      return 'badge-sm border-none bg-gray-500/20 text-gray-500';
    }

    switch ((status || '').toLowerCase()) {
      case 'active':
        return 'badge-sm border-none bg-success/20 text-success';
      case 'on leave':
        return 'badge-sm border-none bg-warning/20 text-warning';
      case 'inactive':
        return 'badge-sm border-none bg-neutral/20 text-neutral';
      case 'terminated':
        return 'badge-sm border-none bg-error/20 text-error';
      default:
        return 'badge-sm border-none bg-neutral/20 text-neutral';
    }
  };

  // Watch for department changes to reset role
  watch(
    () => employeeForm.value.department,
    () => {
      employeeForm.value.role_id = '';
    }
  );

  // Fetch departments with roles
  const fetchDepartmentsWithRoles = async () => {
    try {
      const data = await employeeStore.fetchDepartmentsWithRoles();
      departmentsWithRoles.value = data;
    } catch (error) {
      console.error('Error fetching departments with roles:', error);
      showToast('error', 'Failed to load departments and roles');
    }
  };

  // Infinite scroll functionality
  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Load more when user scrolls to 80% of the page
    if (
      scrollPercentage > 0.8 &&
      hasMore.value &&
      !loadingMore.value &&
      !loading.value
    ) {
      loadMore();
    }
  };

  onMounted(async () => {
    if (!employees.value?.length) {
      await employeeStore.fetchEmployees(
        showDeletedEmployees.value,
        1,
        itemsPerPage.value
      );
    }
    await fetchDepartmentsWithRoles();

    // Add scroll listener for infinite scroll
    window.addEventListener('scroll', handleScroll);
  });

  // Cleanup scroll listener
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
  });
</script>

<template>
  <div class="container mx-auto p-4 sm:p-6 max-w-7xl">
    <!-- Header -->
    <div class="mb-4 sm:mb-6">
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-primaryColor/10 text-primaryColor">
          <Users class="w-5 h-5" />
        </div>
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-primaryColor">
            Employees
          </h1>
          <p class="text-sm text-black/50">
            Manage all employees with search, filters, and pagination.
          </p>
        </div>
      </div>
    </div>

    <!-- Toolbar: search + filters + actions -->
    <div class="card bg-accentColor border border-black/10 shadow mb-4">
      <div class="card-body p-3 sm:p-4">
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex flex-1 items-center gap-2">
            <div class="relative w-full max-w-md">
              <Search
                class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40"
              />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search by name, ID, email, department..."
                class="input input-sm sm:input-md input-bordered w-full pl-9"
              />
            </div>

            <select
              v-model="departmentFilter"
              class="select select-sm sm:select-md select-bordered"
            >
              <option value="">All Departments</option>
              <option v-for="d in departments" :key="d" :value="d">
                {{ d }}
              </option>
            </select>

            <select
              v-model="statusFilter"
              class="select select-sm sm:select-md select-bordered"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>

          <div class="flex items-center gap-2 justify-end">
            <button
              class="btn btn-outline btn-sm text-primaryColor border-primaryColor hover:bg-primaryColor hover:text-white"
              :disabled="loading"
              @click="refresh"
            >
              <RefreshCcw class="w-4 h-4 mr-1" />
              Refresh
            </button>

            <button
              class="btn btn-sm bg-primaryColor text-white hover:bg-primaryColor/90 border-none"
              @click="gotoAddEmployee"
            >
              <Plus class="w-4 h-4 mr-1" />
              Add Employee
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="alert alert-error mb-4">
      <span>{{ error }}</span>
    </div>

    <!-- Table/List -->
    <div class="card bg-accentColor border border-black/10 shadow">
      <div class="card-body p-0">
        <div
          v-if="loading && !employees.length"
          class="flex justify-center py-10"
        >
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div
          v-else-if="!filteredEmployees.length"
          class="p-6 text-center text-black/60"
        >
          No employees found.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr class="bg-primaryColor text-white">
                <th class="whitespace-nowrap">Name</th>
                <th class="whitespace-nowrap">Email</th>
                <th class="whitespace-nowrap">Phone</th>
                <th class="whitespace-nowrap">Address</th>
                <th class="whitespace-nowrap">Department</th>
                <th class="whitespace-nowrap">Position</th>
                <th class="whitespace-nowrap">Status</th>
                <th class="whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="emp in paginatedEmployees" :key="emp.id">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="avatar">
                      <div
                        class="w-8 rounded-full overflow-hidden bg-primaryColor/10"
                      >
                        <img
                          v-if="emp.photo_url"
                          :src="getPhotoUrl(emp.photo_url)"
                          alt="photo"
                          class="w-full h-full object-cover"
                          @error="(e) => (e.target.style.display = 'none')"
                        />
                        <div
                          v-else
                          class="w-8 h-8 flex items-center justify-center text-primaryColor text-xs"
                        >
                          {{ (emp.first_name || 'E').charAt(0) }}
                        </div>
                      </div>
                    </div>
                    <div class="font-semibold">
                      {{ emp.first_name }} {{ emp.last_name }}
                    </div>
                  </div>
                </td>
                <td class="text-sm">{{ emp.email || '—' }}</td>
                <td class="text-sm">{{ emp.phone_number || '—' }}</td>
                <td class="text-sm">{{ emp.address || '—' }}</td>
                <td>
                  <div class="badge badge-ghost badge-sm">
                    {{ emp.department || '—' }}
                  </div>
                </td>
                <td>
                  <div
                    class="badge bg-primaryColor text-white badge-sm border-none"
                  >
                    {{ emp.role || emp.job_title || '—' }}
                  </div>
                </td>
                <td>
                  <div
                    :class="[
                      'badge badge-sm border-none',
                      statusBadgeClass(emp.status, emp.deleted_at),
                    ]"
                  >
                    <BadgeCheck
                      v-if="emp.status === 'Active' && !emp.deleted_at"
                      class="w-3 h-3 mr-1"
                    />
                    {{ emp.deleted_at ? 'Deleted' : emp.status || '—' }}
                  </div>
                </td>
                <td>
                  <div class="dropdown dropdown-left">
                    <EllipsisVertical
                      class="w-3 h-3 cursor-pointer"
                      tabindex="0"
                    />
                    <ul
                      tabindex="0"
                      class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-44"
                    >
                      <li>
                        <a @click="viewEmployee(emp)"
                          ><Eye class="w-3 h-3" /> View</a
                        >
                      </li>
                      <li v-if="emp.status !== 'Terminated' && !emp.deleted_at">
                        <a @click="updateEmployee(emp)"
                          ><Edit class="w-3 h-3" /> Update</a
                        >
                      </li>
                      <li v-if="emp.status !== 'Terminated' && !emp.deleted_at">
                        <a @click="terminateEmployee(emp)" class="text-warning"
                          ><UserX class="w-3 h-3" /> Terminate</a
                        >
                      </li>
                      <li v-if="emp.status === 'Terminated' && !emp.deleted_at">
                        <a @click="restoreEmployee(emp)" class="text-success"
                          ><UserCheck class="w-3 h-3" /> Restore</a
                        >
                      </li>
                      <li v-if="emp.deleted_at">
                        <a
                          @click="restoreDeletedEmployee(emp)"
                          class="text-success"
                          ><UserCheck class="w-3 h-3" /> Restore Deleted</a
                        >
                      </li>
                      <li v-if="!emp.deleted_at">
                        <a @click="deleteEmployee(emp)" class="text-error"
                          ><Trash2 class="w-3 h-3" /> Delete</a
                        >
                      </li>
                    </ul>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <!-- Load More Section -->
        <div
          class="flex flex-col items-center p-4 gap-3 border-t-1 border-black/10"
          v-if="employees.length > 0"
        >
          <div class="text-xs sm:text-sm text-black/60">
            Showing {{ employees.length }} of {{ pagination.total }} employees
          </div>

          <!-- Load More Button -->
          <button
            v-if="hasMore"
            @click="loadMore"
            :disabled="loadingMore"
            class="btn btn-sm bg-primaryColor text-white hover:bg-primaryColor/90 border-none"
          >
            <span
              v-if="loadingMore"
              class="loading loading-spinner loading-xs mr-2"
            ></span>
            {{ loadingMore ? 'Loading...' : 'Load More' }}
          </button>

          <!-- No more data message -->
          <div v-else-if="employees.length > 0" class="text-xs text-gray-500">
            All employees loaded
          </div>
        </div>
      </div>
    </div>

    <!-- Toggle for showing deleted employees -->
    <div class="flex items-center gap-2 justify-end border-t border-black/10 p-4">
      <input
        type="checkbox"
        v-model="showDeletedEmployees"
        @change="toggleDeletedEmployees"
        class="checkbox checkbox-sm checked:bg-primaryColor text-white checked:border-primaryColor"
        id="show-deleted"
      />
      <label for="show-deleted" class="text-sm font-medium text-gray-700">
        Show Deleted
      </label>
    </div>

    <!-- Toast -->
    <div v-if="toast.show" class="toast toast-end">
      <div
        :class="[
          'alert',
          toast.type === 'error' ? 'alert-error' : 'alert-success',
        ]"
      >
        <span>{{ toast.message }}</span>
      </div>
    </div>
  </div>
  <!-- Confirm Modal -->
  <dialog id="confirm_modal" class="modal">
    <div class="modal-box bg-accentColor text-black/70">
      <h3 class="font-bold text-lg mb-2">{{ confirmModal.title }}</h3>
      <p class="py-2">{{ confirmModal.message }}</p>
      <div class="modal-action">
        <button
          class="btn btn-sm border-none shadow-none font-thin"
          @click="closeConfirm"
          :disabled="confirmModal.loading"
        >
          Cancel
        </button>
        <button
          class="btn btn-sm bg-primaryColor text-white border-none font-thin"
          @click="confirmModal.onConfirm"
          :disabled="confirmModal.loading"
        >
          <span
            v-if="confirmModal.loading"
            class="loading loading-spinner loading-xs"
          ></span>
          {{ confirmModal.loading ? 'Updating...' : 'Confirm' }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeConfirm">close</button>
    </form>
  </dialog>
  <!-- View Employee Modal -->
  <dialog id="view_employee_modal" class="modal">
    <div class="modal-box bg-accentColor text-black/70 max-w-4xl">
      <h3
        class="font-bold text-xl text-primaryColor mb-4 border-b border-black/10 pb-3"
      >
        Employee Details
      </h3>
      <div v-if="selectedEmployee" class="space-y-6">
        <!-- Basic Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 class="font-semibold text-primaryColor mb-3">
              Employee Information
            </h4>
            <div class="flex items-start gap-4 mb-4">
              <div class="avatar">
                <div
                  class="w-16 h-16 rounded-full overflow-hidden bg-primaryColor/10"
                >
                  <img
                    v-if="selectedEmployee.photo_url"
                    :src="getPhotoUrl(selectedEmployee.photo_url)"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-else
                    class="w-16 h-16 flex items-center justify-center text-primaryColor text-lg"
                  >
                    {{ (selectedEmployee.first_name || 'E').charAt(0) }}
                  </div>
                </div>
              </div>
              <div>
                <div class="font-semibold text-lg">
                  {{ selectedEmployee.first_name }}
                  {{ selectedEmployee.last_name }}
                </div>
                <div class="text-sm text-black/60">
                  {{ selectedEmployee.role }} ({{
                    selectedEmployee.department
                  }})
                </div>
                <div class="mt-2">
                  <span
                    :class="[
                      'badge',
                      statusBadgeClass(
                        selectedEmployee.status,
                        selectedEmployee.deleted_at
                      ),
                    ]"
                    >{{
                      selectedEmployee.deleted_at
                        ? 'Deleted'
                        : selectedEmployee.status
                    }}</span
                  >
                </div>
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Employee ID:</span>
                <span class="font-medium">{{
                  selectedEmployee.employee_id || '—'
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Employee Type:</span>
                <span class="font-medium">{{
                  selectedEmployee.employee_type || '—'
                }}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 class="font-semibold text-primaryColor mb-3">
              Contact Information
            </h4>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Email:</span>
                <span class="font-medium">{{
                  selectedEmployee.email || '—'
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Phone:</span>
                <span class="font-medium">{{
                  selectedEmployee.phone_number || '—'
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Address:</span>
                <span class="font-medium">{{
                  selectedEmployee.address || '—'
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Employment Details -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-primaryColor mb-3">
            Employment Details
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Department:</span>
                <span class="font-medium">{{
                  selectedEmployee.department || '—'
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Role:</span>
                <span class="font-medium">{{
                  selectedEmployee.role || '—'
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Status:</span>
                <span
                  :class="[
                    'badge',
                    statusBadgeClass(
                      selectedEmployee.status,
                      selectedEmployee.deleted_at
                    ),
                  ]"
                >
                  {{
                    selectedEmployee.deleted_at
                      ? 'Deleted'
                      : selectedEmployee.status || '—'
                  }}
                </span>
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Created:</span>
                <span class="font-medium">{{
                  formatDateLong(selectedEmployee.created_at)
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Last Updated:</span>
                <span class="font-medium">{{
                  formatDateLong(selectedEmployee.updated_at)
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Emergency Contact -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold text-primaryColor mb-3">
            Emergency Contact Information
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Name:</span>
                <span class="font-medium">{{
                  selectedEmployee.emergency_contact_name || '—'
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Relationship:</span>
                <span class="font-medium">{{
                  selectedEmployee.emergency_relationship || '—'
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Phone:</span>
                <span class="font-medium">{{
                  selectedEmployee.emergency_contact_number || '—'
                }}</span>
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-gray-600">Alternate Phone:</span>
                <span class="font-medium">{{
                  selectedEmployee.alternate_contact_number || '—'
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Email:</span>
                <span class="font-medium">{{
                  selectedEmployee.emergency_contact_email || '—'
                }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Address:</span>
                <span class="font-medium">{{
                  selectedEmployee.emergency_contact_address || '—'
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-action">
        <button
          @click="closeView"
          class="btn btn-sm font-thin border-none bg-gray-200 hover:bg-gray-300 text-black/50"
        >
          Close
        </button>
        <button
          v-if="selectedEmployee && selectedEmployee.status !== 'Terminated'"
          @click="updateEmployee(selectedEmployee)"
          class="btn btn-sm font-thin border-none bg-primaryColor hover:bg-primaryColor/80 text-white"
        >
          <Edit class="w-4 h-4 mr-2" />
          Edit Employee
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeView">close</button>
    </form>
  </dialog>

  <!-- Edit Employee Modal -->
  <dialog id="edit_employee_modal" class="modal">
    <div
      class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/95 shadow-lg"
    >
      <h3
        class="font-bold text-xl text-primaryColor mb-4 border-b border-black/10 pb-3"
      >
        Edit Employee
      </h3>

      <form @submit.prevent="showEditConfirmation" class="space-y-6">
        <!-- Basic Information -->
        <div
          class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
        >
          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                First Name <span class="text-red-500">*</span>
              </span>
            </label>
            <input
              v-model="employeeForm.first_name"
              type="text"
              class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              required
              placeholder="Enter first name"
            />
          </div>

          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Last Name <span class="text-red-500">*</span>
              </span>
            </label>
            <input
              v-model="employeeForm.last_name"
              type="text"
              class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              required
              placeholder="Enter last name"
            />
          </div>

          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Email <span class="text-red-500">*</span>
              </span>
            </label>
            <input
              v-model="employeeForm.email"
              type="email"
              class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              required
              placeholder="Enter email address"
            />
          </div>

          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Phone Number
              </span>
            </label>
            <input
              v-model="employeeForm.phone_number"
              type="tel"
              class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              placeholder="Enter phone number"
            />
          </div>

          <div class="form-control lg:col-span-2">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Address
              </span>
            </label>
            <textarea
              v-model="employeeForm.address"
              class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              placeholder="Enter address"
              rows="2"
            ></textarea>
          </div>
        </div>

        <!-- Employment Information -->
        <div
          class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
        >
          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Department <span class="text-red-500">*</span>
              </span>
            </label>
            <select
              v-model="employeeForm.department"
              class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              required
            >
              <option value="" disabled>Select Department</option>
              <option
                v-for="dept in availableDepartments"
                :key="dept"
                :value="dept"
              >
                {{ dept }}
              </option>
            </select>
          </div>

          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Role <span class="text-red-500">*</span>
              </span>
            </label>
            <select
              v-model="employeeForm.role_id"
              class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              :disabled="!employeeForm.department"
              required
            >
              <option value="">Select role</option>
              <option
                v-for="role in availableRoles"
                :key="role.role_id"
                :value="role.role_id"
              >
                {{ role.role }}
              </option>
            </select>
            <span class="text-xs text-gray-500 mt-1">
              {{ !employeeForm.department ? 'Select department first' : '' }}
            </span>
          </div>

          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Employee Type
              </span>
            </label>
            <select
              v-model="employeeForm.employee_type"
              class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
            >
              <option value="" disabled>Select Type</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Intern">Intern</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Status <span class="text-red-500">*</span>
              </span>
            </label>
            <select
              v-model="employeeForm.status"
              class="select select-sm sm:select-md select-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              required
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
              <option value="Terminated">Terminated</option>
            </select>
          </div>
        </div>

        <!-- Emergency Contact Information -->
        <div
          class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 bg-white border border-black/10 p-4 rounded-xl"
        >
          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Emergency Contact Name
              </span>
            </label>
            <input
              v-model="employeeForm.emergency_contact_name"
              type="text"
              class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              placeholder="Enter emergency contact name"
            />
          </div>

          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Relationship
              </span>
            </label>
            <input
              v-model="employeeForm.emergency_relationship"
              type="text"
              class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              placeholder="e.g., Spouse, Parent, Sibling"
            />
          </div>

          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Emergency Phone
              </span>
            </label>
            <input
              v-model="employeeForm.emergency_contact_number"
              type="tel"
              class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              placeholder="Enter emergency phone number"
            />
          </div>

          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Alternate Phone
              </span>
            </label>
            <input
              v-model="employeeForm.alternate_contact_number"
              type="tel"
              class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              placeholder="Enter alternate phone number"
            />
          </div>

          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Emergency Email
              </span>
            </label>
            <input
              v-model="employeeForm.emergency_contact_email"
              type="email"
              class="input input-sm sm:input-md input-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              placeholder="Enter emergency email"
            />
          </div>

          <div class="form-control lg:col-span-2">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Emergency Address
              </span>
            </label>
            <textarea
              v-model="employeeForm.emergency_contact_address"
              class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-primaryColor/30 text-black/70 focus:border-primaryColor"
              placeholder="Enter emergency contact address"
              rows="2"
            ></textarea>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-4 border-t border-black/10">
          <button
            type="button"
            @click="closeEditModal"
            class="btn btn-sm font-thin border-none bg-gray-200 hover:bg-gray-300 text-black/50"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-sm font-thin border-none bg-primaryColor hover:bg-primaryColor/80 text-white"
            :disabled="loading"
          >
            <span
              class="loading loading-spinner loading-sm mr-2"
              v-if="loading"
            ></span>
            {{ loading ? 'Updating...' : 'Update Employee' }}
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeEditModal">close</button>
    </form>
  </dialog>

  <!-- Termination Modal -->
  <dialog id="termination_modal" class="modal">
    <div
      class="modal-box max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/95 shadow-lg"
    >
      <h3
        class="font-bold text-xl text-error mb-4 border-b border-error/20 pb-3"
      >
        <UserX class="w-6 h-6 inline mr-2" />
        Employee Termination Process
      </h3>

      <div v-if="terminationModal.employee" class="space-y-6">
        <!-- Employee Information -->
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 class="font-semibold text-red-800 mb-3">
            Employee to be Terminated
          </h4>
          <div class="flex items-center gap-4">
            <div class="avatar">
              <div class="w-12 h-12 rounded-full overflow-hidden bg-red-100">
                <img
                  v-if="terminationModal.employee.photo_url"
                  :src="getPhotoUrl(terminationModal.employee.photo_url)"
                  class="w-full h-full object-cover"
                />
                <div
                  v-else
                  class="w-12 h-12 flex items-center justify-center text-red-600 text-sm font-semibold"
                >
                  {{ (terminationModal.employee.first_name || 'E').charAt(0) }}
                </div>
              </div>
            </div>
            <div>
              <div class="font-semibold text-red-800">
                {{ terminationModal.employee.first_name }}
                {{ terminationModal.employee.last_name }}
              </div>
              <div class="text-sm text-red-600">
                {{ terminationModal.employee.role }} •
                {{ terminationModal.employee.department }}
              </div>
              <div class="text-xs text-red-500">
                Employee ID: {{ terminationModal.employee.employee_id }}
              </div>
            </div>
          </div>
        </div>

        <!-- Termination Process Information -->
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 class="font-semibold text-yellow-800 mb-3 flex items-center">
            <AlertTriangle class="w-5 h-5 mr-2" />
            Important: Termination Process Overview
          </h4>
          <div class="text-sm text-yellow-700 space-y-2">
            <p><strong>What happens when you terminate an employee:</strong></p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>Employee status will be changed to "Terminated"</li>
              <li>Employee will lose access to all company systems</li>
              <li>Final payroll processing will be initiated</li>
              <li>All pending work must be handed over</li>
            </ul>
            <p class="mt-3 font-medium">
              This action is <strong>irreversible</strong> and should only be
              done after proper documentation and approval.
            </p>
          </div>
        </div>

        <!-- Termination Details Form -->
        <div
          class="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-white border border-black/10 p-4 rounded-xl"
        >
          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Termination Reason <span class="text-red-500">*</span>
              </span>
            </label>
            <select
              v-model="terminationModal.terminationReason"
              class="select select-sm sm:select-md select-bordered w-full bg-white border-red-300 text-black/70 focus:border-red-500"
              required
            >
              <option value="" disabled>Select reason</option>
              <option value="Resignation">Resignation</option>
              <option value="Performance Issues">Performance Issues</option>
              <option value="Misconduct">Misconduct</option>
              <option value="Redundancy">Redundancy</option>
              <option value="End of Contract">End of Contract</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div class="form-control">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Last Working Day <span class="text-red-500">*</span>
              </span>
            </label>
            <input
              v-model="terminationModal.lastWorkingDay"
              type="date"
              class="input input-sm sm:input-md input-bordered w-full bg-white border-red-300 text-black/70 focus:border-red-500"
              required
            />
          </div>

          <div class="form-control lg:col-span-2">
            <label class="label mb-1">
              <span
                class="label-text text-black/70 font-medium text-sm sm:text-base"
              >
                Handover Notes
              </span>
            </label>
            <textarea
              v-model="terminationModal.handoverNotes"
              class="textarea textarea-sm sm:textarea-md textarea-bordered w-full bg-white border-red-300 text-black/70 focus:border-red-500"
              placeholder="Document any pending work, projects, or important information that needs to be transferred..."
              rows="3"
            ></textarea>
          </div>
        </div>

        <!-- Post-Termination Checklist -->
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 class="font-semibold text-gray-800 mb-3">
            Post-Termination Checklist
          </h4>
          <p class="text-sm text-gray-600 mb-4">
            Please confirm the following actions will be completed:
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="terminationModal.finalPayroll"
                type="checkbox"
                class="checkbox checkbox-sm border-red-300 checked:bg-red-500"
              />
              <div>
                <div class="font-medium text-gray-800">
                  Final Payroll Processing
                </div>
                <div class="text-xs text-gray-600">
                  Calculate final salary, benefits, and deductions
                </div>
              </div>
            </label>

            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="terminationModal.systemAccess"
                type="checkbox"
                class="checkbox checkbox-sm border-red-300 checked:bg-red-500"
              />
              <div>
                <div class="font-medium text-gray-800">
                  System Access Revocation
                </div>
                <div class="text-xs text-gray-600">
                  Disable all company system accounts
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Legal Notice -->
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 class="font-semibold text-red-800 mb-2 flex items-center">
            <Shield class="w-5 h-5 mr-2" />
            Legal and Compliance Notice
          </h4>
          <div class="text-sm text-red-700 space-y-2">
            <p>By proceeding with this termination, you acknowledge that:</p>
            <ul class="list-disc list-inside space-y-1 ml-4">
              <li>All legal requirements for termination have been met</li>
              <li>Proper notice period has been given (if applicable)</li>
              <li>
                Employee has been informed of their rights and obligations
              </li>
              <li>All company policies and procedures have been followed</li>
              <li>Documentation has been properly maintained</li>
            </ul>
            <p class="mt-3 font-medium">
              This action will be logged and may be subject to audit.
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-3 pt-4 border-t border-black/10">
          <button
            type="button"
            @click="closeTerminationModal"
            class="btn btn-sm font-thin border-none bg-gray-200 hover:bg-gray-300 text-black/50"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="showTerminationConfirmation"
            class="btn btn-sm font-thin border-none bg-red-500 hover:bg-red-600 text-white"
            :disabled="
              !terminationModal.terminationReason ||
              !terminationModal.lastWorkingDay ||
              loading
            "
          >
            <span
              class="loading loading-spinner loading-sm mr-2"
              v-if="loading"
            ></span>
            {{ loading ? 'Processing...' : 'Terminate Employee' }}
          </button>
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeTerminationModal">close</button>
    </form>
  </dialog>
</template>
