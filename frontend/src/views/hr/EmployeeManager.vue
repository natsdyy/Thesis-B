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
  const updateEmployee = (emp) => {
    router.push({ name: 'HRAddEmployee', query: { edit: emp.id } });
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

  onMounted(async () => {
    if (!employees.value?.length) {
      await employeeStore.fetchEmployees();
    }
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
    <div class="modal-box bg-accentColor text-black/70 max-w-2xl">
      <h3 class="font-bold text-lg mb-3 text-primaryColor">Employee Details</h3>
      <div
        v-if="selectedEmployee"
        class="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div class="flex items-start gap-3">
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
            <div class="font-semibold text-base">
              {{ selectedEmployee.first_name }} {{ selectedEmployee.last_name }}
            </div>
            <div class="text-xs text-black/60">
              ID: {{ selectedEmployee.employee_id }}
            </div>
            <div class="mt-1">
              <span
                :class="['badge', statusBadgeClass(selectedEmployee.status)]"
                >{{ selectedEmployee.status }}</span
              >
            </div>
          </div>
        </div>
        <div class="bg-white/50 rounded-md p-3 border border-black/10">
          <div class="text-sm font-medium mb-2">Contact</div>
          <div class="text-sm space-y-1">
            <div>
              <span class="text-black/60">Email:</span>
              {{ selectedEmployee.email || '—' }}
            </div>
            <div>
              <span class="text-black/60">Phone:</span>
              {{ selectedEmployee.phone_number || '—' }}
            </div>
            <div>
              <span class="text-black/60">Address:</span>
              {{ selectedEmployee.address || '—' }}
            </div>
          </div>
        </div>
        <div class="bg-white/50 rounded-md p-3 border border-black/10">
          <div class="text-sm font-medium mb-2">Employment</div>
          <div class="text-sm space-y-1">
            <div>
              <span class="text-black/60">Department:</span>
              {{ selectedEmployee.department || '—' }}
            </div>
            <div>
              <span class="text-black/60">Role:</span>
              {{ selectedEmployee.role || '—' }}
            </div>
            <div>
              <span class="text-black/60">Type:</span>
              {{ selectedEmployee.employee_type || '—' }}
            </div>
            <div>
              <span class="text-black/60">Created:</span>
              {{ formatDateLong(selectedEmployee.created_at) }}
            </div>
            <div>
              <span class="text-black/60">Updated:</span>
              {{ formatDateLong(selectedEmployee.updated_at) }}
            </div>
          </div>
        </div>
        <div class="bg-white/50 rounded-md p-3 border border-black/10">
          <div class="text-sm font-medium mb-2">Emergency Contact</div>
          <div class="text-sm space-y-1">
            <div>
              <span class="text-black/60">Name:</span>
              {{ selectedEmployee.emergency_contact_name || '—' }}
            </div>
            <div>
              <span class="text-black/60">Relationship:</span>
              {{ selectedEmployee.emergency_relationship || '—' }}
            </div>
            <div>
              <span class="text-black/60">Phone:</span>
              {{ selectedEmployee.emergency_contact_number || '—' }}
            </div>
            <div>
              <span class="text-black/60">Alternate Phone:</span>
              {{ selectedEmployee.alternate_contact_number || '—' }}
            </div>
            <div>
              <span class="text-black/60">Email:</span>
              {{ selectedEmployee.emergency_contact_email || '—' }}
            </div>
            <div>
              <span class="text-black/60">Address:</span>
              {{ selectedEmployee.emergency_contact_address || '—' }}
            </div>
          </div>
        </div>
      </div>
      <div class="modal-action">
        <button class="btn" @click="closeView">Close</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="closeView">close</button>
    </form>
  </dialog>
</template>
