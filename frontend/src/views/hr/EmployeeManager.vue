<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
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
    equipmentReturn: false,
    exitInterview: false,
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
    };
  };

  // Loading and error from store
  const loading = computed(() => employeeStore.loading);
  const error = computed(() => employeeStore.error);

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

  // Pagination
  const totalPages = computed(() =>
    Math.max(1, Math.ceil(filteredEmployees.value.length / itemsPerPage.value))
  );
  const paginatedEmployees = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    return filteredEmployees.value.slice(start, start + itemsPerPage.value);
  });

  // Keep current page in range when filters/data change
  watch([filteredEmployees, itemsPerPage], () => {
    currentPage.value = 1;
  });

  const refresh = async () => {
    try {
      await employeeStore.fetchEmployees();
      showToast('success', 'Employee list refreshed');
    } catch (e) {
      showToast('error', e.message || 'Failed to refresh employees');
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
      if (employeeForm.value.isEditing) {
        await employeeStore.updateEmployee(
          employeeForm.value.editingEmployeeId,
          employeeForm.value
        );
        showToast('success', 'Employee updated successfully');
      }
      closeEditModal();
      await employeeStore.fetchEmployees(); // Refresh the list
    } catch (err) {
      showToast('error', err.message || 'Failed to save employee');
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
    openConfirm(
      'Terminate Employee',
      `Are you sure you want to mark ${emp.first_name} ${emp.last_name} as Terminated?`,
      async () => {
        try {
          await employeeStore.updateEmployeeStatus(emp.id, 'Terminated');
          showToast('success', 'Employee terminated');
          closeConfirm();
        } catch (err) {
          showToast('error', err.message || 'Failed to terminate employee');
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
  const statusBadgeClass = (status) => {
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
      const response = await fetch(
        `${apiConfig.baseURL}/employees/departments-with-roles`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        departmentsWithRoles.value = data.data;
      } else {
        throw new Error(
          data.message || 'Failed to fetch departments with roles'
        );
      }
    } catch (error) {
      console.error('Error fetching departments with roles:', error);
      showToast('error', 'Failed to load departments and roles');
    }
  };

  onMounted(async () => {
    if (!employees.value?.length) {
      await employeeStore.fetchEmployees();
    }
    await fetchDepartmentsWithRoles();
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
                <th class="whitespace-nowrap">Department</th>
                <th class="whitespace-nowrap">Role</th>
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
                      emp.status === 'Active'
                        ? 'bg-success/20 text-success'
                        : emp.status === 'On Leave'
                          ? 'bg-warning/20 text-warning'
                          : emp.status === 'Inactive'
                            ? 'bg-neutral/20 text-neutral'
                            : 'bg-error/20 text-error',
                    ]"
                  >
                    <BadgeCheck
                      v-if="emp.status === 'Active'"
                      class="w-3 h-3 mr-1"
                    />
                    {{ emp.status || '—' }}
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
                      <li>
                        <a @click="updateEmployee(emp)"
                          ><Edit class="w-3 h-3" /> Update</a
                        >
                      </li>
                      <li>
                        <a @click="terminateEmployee(emp)" class="text-warning"
                          ><UserX class="w-3 h-3" /> Terminate</a
                        >
                      </li>
                      <li>
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
        <div
          class="flex flex-col sm:flex-row justify-between items-center p-4 gap-3 border-t"
          v-if="filteredEmployees.length > itemsPerPage"
        >
          <div class="text-xs sm:text-sm text-black/60">
            Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
            {{ Math.min(currentPage * itemsPerPage, filteredEmployees.length) }}
            of {{ filteredEmployees.length }} employees
          </div>

          <div class="join">
            <button
              class="join-item btn btn-xs sm:btn-sm !bg-gray-200 text-black/60 border-none"
              :disabled="currentPage <= 1"
              @click="currentPage--"
            >
              « Prev
            </button>

            <button
              v-for="page in totalPages"
              :key="page"
              class="join-item btn btn-xs sm:btn-sm !bg-gray-200 text-black/60 border-none"
              :class="{
                'btn-active !bg-primaryColor text-white': currentPage === page,
              }"
              @click="currentPage = page"
            >
              {{ page }}
            </button>

            <button
              class="join-item btn btn-xs sm:btn-sm !bg-gray-200 text-black/60 border-none"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
            >
              Next »
            </button>
          </div>
        </div>
      </div>
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
        >
          Cancel
        </button>
        <button
          class="btn btn-sm bg-primaryColor text-white border-none font-thin"
          @click="confirmModal.onConfirm"
        >
          Confirm
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
                      statusBadgeClass(selectedEmployee.status),
                    ]"
                    >{{ selectedEmployee.status }}</span
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
                  :class="['badge', statusBadgeClass(selectedEmployee.status)]"
                >
                  {{ selectedEmployee.status || '—' }}
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
</template>
