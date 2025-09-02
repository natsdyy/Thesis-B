<script setup>
  import { ref, computed, onMounted } from 'vue';
  import {
    Settings,
    Plus,
    Search,
    Calendar,
    AlertTriangle,
    CheckCircle,
    Clock,
    Wrench,
    RefreshCcw,
    Eye,
    Edit,
    Play,
    Package,
    TrendingUp,
    Activity,
    X,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';

  const productionStore = useProductionStore();

  // Reactive state
  const activeTab = ref('schedules');
  const searchQuery = ref('');
  const statusFilter = ref('');
  const typeFilter = ref('');
  const equipmentFilter = ref('');
  const showCreateModal = ref(false);
  const showDetailsModal = ref(false);
  const showRecordModal = ref(false);
  const selectedSchedule = ref(null);
  const selectedEquipment = ref(null);

  // Form data
  const scheduleForm = ref({
    equipment_id: '',
    maintenance_type: 'Preventive',
    task_name: '',
    task_description: '',
    frequency_days: '',
    next_due_date: '',
    estimated_duration_minutes: 60,
    assigned_to: '',
    is_active: true,
  });

  const recordForm = ref({
    equipment_id: '',
    schedule_id: '',
    maintenance_type: 'Preventive',
    work_performed: '',
    maintenance_date: new Date().toISOString().split('T')[0],
    performed_by: '',
    duration_minutes: '',
    cost: '',
    parts_used: '',
    notes: '',
    status: 'Completed',
  });

  const equipmentForm = ref({
    equipment_code: '',
    equipment_name: '',
    description: '',
    category: '',
    location: '',
    purchase_date: '',
    purchase_cost: '',
    status: 'Active',
    manufacturer: '',
    model: '',
    serial_number: '',
    specifications: '',
  });

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const equipment = computed(() => productionStore.equipment);
  const maintenanceSchedules = computed(
    () => productionStore.maintenanceSchedules
  );

  // Computed properties
  const filteredSchedules = computed(() => {
    let filtered = maintenanceSchedules.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (schedule) =>
          schedule.task_name.toLowerCase().includes(query) ||
          schedule.equipment_name?.toLowerCase().includes(query)
      );
    }

    if (typeFilter.value) {
      filtered = filtered.filter(
        (schedule) => schedule.maintenance_type === typeFilter.value
      );
    }

    if (equipmentFilter.value) {
      filtered = filtered.filter(
        (schedule) => schedule.equipment_id == equipmentFilter.value
      );
    }

    return filtered.sort(
      (a, b) => new Date(a.next_due_date) - new Date(b.next_due_date)
    );
  });

  const overdueSchedules = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return maintenanceSchedules.value.filter(
      (schedule) => schedule.next_due_date < today && schedule.is_active
    );
  });

  const dueSoonSchedules = computed(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const todayStr = today.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    return maintenanceSchedules.value.filter(
      (schedule) =>
        schedule.next_due_date >= todayStr &&
        schedule.next_due_date <= nextWeekStr &&
        schedule.is_active
    );
  });

  const maintenanceStats = computed(() => {
    const total = maintenanceSchedules.value.length;
    const active = maintenanceSchedules.value.filter((s) => s.is_active).length;
    const overdue = overdueSchedules.value.length;
    const dueSoon = dueSoonSchedules.value.length;
    const equipmentCount = equipment.value.length;
    const activeEquipment = equipment.value.filter(
      (e) => e.status === 'Active'
    ).length;

    return { total, active, overdue, dueSoon, equipmentCount, activeEquipment };
  });

  // Methods
  const getMaintenanceTypeClass = (type) => {
    switch (type) {
      case 'Preventive':
        return 'badge-success';
      case 'Corrective':
        return 'badge-warning';
      case 'Emergency':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  };

  const getEquipmentStatusClass = (status) => {
    switch (status) {
      case 'Active':
        return 'badge-success';
      case 'Maintenance':
        return 'badge-warning';
      case 'Broken':
        return 'badge-error';
      case 'Retired':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getDaysUntilDue = (dueDateString) => {
    const today = new Date();
    const dueDate = new Date(dueDateString);
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateClass = (dueDateString) => {
    const days = getDaysUntilDue(dueDateString);
    if (days < 0) return 'text-error';
    if (days <= 3) return 'text-warning';
    if (days <= 7) return 'text-info';
    return 'text-base-content/70';
  };

  const openCreateModal = () => {
    resetScheduleForm();
    showCreateModal.value = true;
  };

  const closeCreateModal = () => {
    showCreateModal.value = false;
    resetScheduleForm();
  };

  const openDetailsModal = (schedule) => {
    selectedSchedule.value = schedule;
    showDetailsModal.value = true;
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedSchedule.value = null;
  };

  const openRecordModal = (schedule = null) => {
    resetRecordForm();
    if (schedule) {
      recordForm.value.equipment_id = schedule.equipment_id;
      recordForm.value.schedule_id = schedule.id;
      recordForm.value.maintenance_type = schedule.maintenance_type;
    }
    showRecordModal.value = true;
  };

  const closeRecordModal = () => {
    showRecordModal.value = false;
    resetRecordForm();
  };

  const resetScheduleForm = () => {
    scheduleForm.value = {
      equipment_id: '',
      maintenance_type: 'Preventive',
      task_name: '',
      task_description: '',
      frequency_days: '',
      next_due_date: '',
      estimated_duration_minutes: 60,
      assigned_to: '',
      is_active: true,
    };
  };

  const resetRecordForm = () => {
    recordForm.value = {
      equipment_id: '',
      schedule_id: '',
      maintenance_type: 'Preventive',
      work_performed: '',
      maintenance_date: new Date().toISOString().split('T')[0],
      performed_by: '',
      duration_minutes: '',
      cost: '',
      parts_used: '',
      notes: '',
      status: 'Completed',
    };
  };

  const createSchedule = async () => {
    try {
      // TODO: Implement create schedule in store
      closeCreateModal();
      showToast('Maintenance schedule created successfully!', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to create schedule', 'error');
    }
  };

  const recordMaintenance = async () => {
    try {
      // TODO: Implement record maintenance in store
      closeRecordModal();
      showToast('Maintenance record created successfully!', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to record maintenance', 'error');
    }
  };

  const refreshData = async () => {
    try {
      await Promise.all([
        productionStore.fetchEquipment(),
        productionStore.fetchMaintenanceSchedules(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const showToast = (message, type) => {
    // TODO: Implement toast notification
    console.log(`${type}: ${message}`);
  };

  // Lifecycle
  onMounted(async () => {
    await refreshData();
  });
</script>

<template>
  <div class="p-6 space-y-6 bg-base-100 min-h-screen">
    <!-- Header -->
    <div
      class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
    >
      <div>
        <h1
          class="text-3xl font-bold text-primaryColor flex items-center gap-3"
        >
          <Settings class="w-8 h-8" />
          Maintenance Management
        </h1>
        <p class="text-base-content/70 mt-1">
          Schedule and track equipment maintenance
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="refreshData"
          class="btn btn-ghost btn-sm"
          :disabled="loading"
        >
          <RefreshCcw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          Refresh
        </button>
        <button
          @click="openCreateModal"
          class="btn bg-primaryColor text-white btn-sm hover:bg-primaryColor/80"
        >
          <Plus class="w-4 h-4" />
          New Schedule
        </button>
        <button @click="openRecordModal()" class="btn btn-outline btn-sm">
          <Wrench class="w-4 h-4" />
          Record Work
        </button>
      </div>
    </div>

    <!-- Maintenance Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-6 gap-6">
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              Total Equipment
            </p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ maintenanceStats.equipmentCount }}
            </p>
          </div>
          <Package class="w-8 h-8 text-primaryColor opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">
              Active Equipment
            </p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ maintenanceStats.activeEquipment }}
            </p>
          </div>
          <CheckCircle class="w-8 h-8 text-success opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Schedules</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ maintenanceStats.active }}
            </p>
          </div>
          <Calendar class="w-8 h-8 text-info opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Overdue</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ maintenanceStats.overdue }}
            </p>
          </div>
          <AlertTriangle class="w-8 h-8 text-error opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Due Soon</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ maintenanceStats.dueSoon }}
            </p>
          </div>
          <Clock class="w-8 h-8 text-warning opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Uptime</p>
            <p class="text-2xl font-bold text-primaryColor">98%</p>
          </div>
          <TrendingUp class="w-8 h-8 text-success opacity-80" />
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed bg-accentColor w-fit">
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'schedules' }"
        @click="activeTab = 'schedules'"
      >
        Maintenance Schedules
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'equipment' }"
        @click="activeTab = 'equipment'"
      >
        Equipment
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'records' }"
        @click="activeTab = 'records'"
      >
        Maintenance Records
      </a>
    </div>

    <!-- Maintenance Schedules Tab -->
    <div v-if="activeTab === 'schedules'">
      <!-- Filters -->
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex flex-col lg:flex-row gap-4">
          <div class="form-control flex-1">
            <div class="input-group">
              <span class="bg-base-200">
                <Search class="w-4 h-4" />
              </span>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search schedules..."
                class="input input-bordered w-full"
              />
            </div>
          </div>

          <div class="form-control">
            <select v-model="typeFilter" class="select select-bordered">
              <option value="">All Types</option>
              <option value="Preventive">Preventive</option>
              <option value="Corrective">Corrective</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>

          <div class="form-control">
            <select v-model="equipmentFilter" class="select select-bordered">
              <option value="">All Equipment</option>
              <option v-for="eq in equipment" :key="eq.id" :value="eq.id">
                {{ eq.equipment_name }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Priority Alerts -->
      <div
        v-if="overdueSchedules.length > 0"
        class="bg-error/10 border border-error/20 rounded-xl p-6"
      >
        <h3
          class="text-lg font-semibold text-error mb-4 flex items-center gap-2"
        >
          <AlertTriangle class="w-5 h-5" />
          Overdue Maintenance ({{ overdueSchedules.length }})
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="schedule in overdueSchedules.slice(0, 6)"
            :key="schedule.id"
            class="p-4 bg-base-100 rounded-lg border border-error/30"
          >
            <h4 class="font-medium text-error">{{ schedule.task_name }}</h4>
            <p class="text-sm text-base-content/70">
              {{ schedule.equipment_name }}
            </p>
            <p class="text-xs text-error mt-1">
              Due: {{ formatDate(schedule.next_due_date) }}
            </p>
            <button
              @click="openRecordModal(schedule)"
              class="btn btn-error btn-xs mt-2"
            >
              Perform Now
            </button>
          </div>
        </div>
      </div>

      <!-- Schedules List -->
      <div v-if="loading" class="flex justify-center py-12">
        <span
          class="loading loading-spinner loading-lg text-primaryColor"
        ></span>
      </div>

      <div
        v-else-if="filteredSchedules.length === 0"
        class="text-center py-12 bg-accentColor rounded-xl"
      >
        <Settings class="w-16 h-16 text-base-content/30 mx-auto mb-4" />
        <p class="text-lg font-medium text-base-content/70">
          No maintenance schedules found
        </p>
        <p class="text-base-content/50">
          Create your first maintenance schedule
        </p>
      </div>

      <div v-else class="bg-accentColor rounded-xl shadow-sm border">
        <div class="p-6 border-b">
          <h2 class="text-xl font-semibold text-primaryColor">
            Maintenance Schedules
          </h2>
        </div>

        <div class="divide-y divide-base-200">
          <div
            v-for="schedule in filteredSchedules"
            :key="schedule.id"
            class="p-6 hover:bg-base-50 transition-colors"
            :class="{
              'bg-error/5': getDaysUntilDue(schedule.next_due_date) < 0,
            }"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-lg font-semibold text-primaryColor">
                    {{ schedule.task_name }}
                  </h3>
                  <div
                    class="badge"
                    :class="getMaintenanceTypeClass(schedule.maintenance_type)"
                  >
                    {{ schedule.maintenance_type }}
                  </div>
                  <div v-if="!schedule.is_active" class="badge badge-neutral">
                    Inactive
                  </div>
                </div>

                <div
                  class="flex items-center gap-6 text-sm text-base-content/70 mb-2"
                >
                  <span>{{ schedule.equipment_name }}</span>
                  <span>Every {{ schedule.frequency_days }} days</span>
                  <span v-if="schedule.assigned_to_name"
                    >Assigned to: {{ schedule.assigned_to_name }}</span
                  >
                  <span>{{
                    formatDuration(schedule.estimated_duration_minutes)
                  }}</span>
                </div>

                <div
                  v-if="schedule.task_description"
                  class="text-sm text-base-content/60"
                >
                  {{ schedule.task_description }}
                </div>
              </div>

              <div class="flex items-center gap-4">
                <div class="text-right">
                  <p
                    class="text-sm font-medium"
                    :class="getDueDateClass(schedule.next_due_date)"
                  >
                    {{ formatDate(schedule.next_due_date) }}
                  </p>
                  <p class="text-xs text-base-content/60">
                    {{
                      getDaysUntilDue(schedule.next_due_date) < 0
                        ? 'Overdue'
                        : getDaysUntilDue(schedule.next_due_date) === 0
                          ? 'Due today'
                          : `${getDaysUntilDue(schedule.next_due_date)} days`
                    }}
                  </p>
                </div>

                <div class="flex gap-2">
                  <button
                    @click="openDetailsModal(schedule)"
                    class="btn btn-ghost btn-sm"
                  >
                    <Eye class="w-4 h-4" />
                  </button>
                  <button
                    @click="openRecordModal(schedule)"
                    class="btn btn-outline btn-sm"
                  >
                    <Wrench class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Equipment Tab -->
    <div v-else-if="activeTab === 'equipment'">
      <div class="bg-accentColor rounded-xl shadow-sm border">
        <div class="p-6 border-b">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-primaryColor">
              Equipment Inventory
            </h2>
            <button class="btn btn-outline btn-sm">
              <Plus class="w-4 h-4" />
              Add Equipment
            </button>
          </div>
        </div>

        <div v-if="equipment.length === 0" class="text-center py-12">
          <Package class="w-16 h-16 text-base-content/30 mx-auto mb-4" />
          <p class="text-lg font-medium text-base-content/70">
            No equipment registered
          </p>
          <p class="text-base-content/50">
            Add your first equipment to start tracking
          </p>
        </div>

        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6"
        >
          <div
            v-for="eq in equipment"
            :key="eq.id"
            class="bg-base-100 rounded-lg p-4 border hover:shadow-md transition-shadow"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="font-semibold text-primaryColor">
                  {{ eq.equipment_name }}
                </h3>
                <p class="text-sm text-base-content/70">
                  {{ eq.equipment_code }}
                </p>
              </div>
              <div class="badge" :class="getEquipmentStatusClass(eq.status)">
                {{ eq.status }}
              </div>
            </div>

            <div class="space-y-1 text-sm">
              <div class="flex justify-between">
                <span class="text-base-content/70">Category:</span>
                <span>{{ eq.category }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-base-content/70">Location:</span>
                <span>{{ eq.location || 'N/A' }}</span>
              </div>
              <div v-if="eq.purchase_date" class="flex justify-between">
                <span class="text-base-content/70">Purchased:</span>
                <span>{{ formatDate(eq.purchase_date) }}</span>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t">
              <div class="flex justify-between items-center">
                <span class="text-xs text-base-content/60">
                  {{ eq.maintenance_schedules_count || 0 }} schedules
                </span>
                <button class="btn btn-ghost btn-xs">
                  <Eye class="w-3 h-3" />
                  View
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Maintenance Records Tab -->
    <div v-else-if="activeTab === 'records'">
      <div class="bg-accentColor rounded-xl shadow-sm border">
        <div class="p-6 border-b">
          <h2 class="text-xl font-semibold text-primaryColor">
            Maintenance History
          </h2>
        </div>

        <div class="text-center py-12">
          <Activity class="w-16 h-16 text-base-content/30 mx-auto mb-4" />
          <p class="text-lg font-medium text-base-content/70">
            Maintenance Records
          </p>
          <p class="text-base-content/50">
            Historical maintenance data will be displayed here
          </p>
        </div>
      </div>
    </div>

    <!-- Create Schedule Modal -->
    <dialog :class="{ 'modal modal-open': showCreateModal }" class="modal">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Create Maintenance Schedule
        </h3>

        <form @submit.prevent="createSchedule" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Equipment</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <select
                v-model="scheduleForm.equipment_id"
                class="select select-bordered"
                required
              >
                <option value="">Select Equipment</option>
                <option v-for="eq in equipment" :key="eq.id" :value="eq.id">
                  {{ eq.equipment_name }} ({{ eq.equipment_code }})
                </option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Maintenance Type</span>
              </label>
              <select
                v-model="scheduleForm.maintenance_type"
                class="select select-bordered"
              >
                <option value="Preventive">Preventive</option>
                <option value="Corrective">Corrective</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Task Name</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <input
                v-model="scheduleForm.task_name"
                type="text"
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Frequency (days)</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <input
                v-model="scheduleForm.frequency_days"
                type="number"
                min="1"
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Next Due Date</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <input
                v-model="scheduleForm.next_due_date"
                type="date"
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium"
                  >Estimated Duration (minutes)</span
                >
              </label>
              <input
                v-model="scheduleForm.estimated_duration_minutes"
                type="number"
                min="1"
                class="input input-bordered"
              />
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Task Description</span>
            </label>
            <textarea
              v-model="scheduleForm.task_description"
              class="textarea textarea-bordered"
              rows="3"
            ></textarea>
          </div>

          <div class="form-control">
            <label class="cursor-pointer label">
              <input
                v-model="scheduleForm.is_active"
                type="checkbox"
                class="checkbox checkbox-primary"
              />
              <span class="label-text ml-2">Active Schedule</span>
            </label>
          </div>

          <div class="modal-action">
            <button
              type="button"
              @click="closeCreateModal"
              class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
              :disabled="loading"
            >
              <span
                v-if="loading"
                class="loading loading-spinner loading-sm"
              ></span>
              Create Schedule
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeCreateModal">close</button>
      </form>
    </dialog>

    <!-- Record Maintenance Modal -->
    <dialog :class="{ 'modal modal-open': showRecordModal }" class="modal">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Record Maintenance Work
        </h3>

        <form @submit.prevent="recordMaintenance" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Equipment</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <select
                v-model="recordForm.equipment_id"
                class="select select-bordered"
                required
              >
                <option value="">Select Equipment</option>
                <option v-for="eq in equipment" :key="eq.id" :value="eq.id">
                  {{ eq.equipment_name }} ({{ eq.equipment_code }})
                </option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Maintenance Type</span>
              </label>
              <select
                v-model="recordForm.maintenance_type"
                class="select select-bordered"
              >
                <option value="Preventive">Preventive</option>
                <option value="Corrective">Corrective</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Maintenance Date</span>
                <span class="label-text-alt text-error">*</span>
              </label>
              <input
                v-model="recordForm.maintenance_date"
                type="date"
                class="input input-bordered"
                required
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Duration (minutes)</span>
              </label>
              <input
                v-model="recordForm.duration_minutes"
                type="number"
                min="1"
                class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Cost</span>
              </label>
              <input
                v-model="recordForm.cost"
                type="number"
                step="0.01"
                min="0"
                class="input input-bordered"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Status</span>
              </label>
              <select
                v-model="recordForm.status"
                class="select select-bordered"
              >
                <option value="Completed">Completed</option>
                <option value="Incomplete">Incomplete</option>
                <option value="Deferred">Deferred</option>
              </select>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Work Performed</span>
              <span class="label-text-alt text-error">*</span>
            </label>
            <textarea
              v-model="recordForm.work_performed"
              class="textarea textarea-bordered"
              rows="3"
              required
            ></textarea>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Parts Used</span>
            </label>
            <textarea
              v-model="recordForm.parts_used"
              class="textarea textarea-bordered"
              rows="2"
            ></textarea>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Notes</span>
            </label>
            <textarea
              v-model="recordForm.notes"
              class="textarea textarea-bordered"
              rows="2"
            ></textarea>
          </div>

          <div class="modal-action">
            <button
              type="button"
              @click="closeRecordModal"
              class="btn bg-gray-200 text-black/50 font-thin border-none hover:bg-gray-300 shadow-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn bg-primaryColor text-white font-thin border-none hover:bg-primaryColor/80"
              :disabled="loading"
            >
              <span
                v-if="loading"
                class="loading loading-spinner loading-sm"
              ></span>
              Record Maintenance
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeRecordModal">close</button>
      </form>
    </dialog>

    <!-- Error Display -->
    <div v-if="error" class="alert alert-error">
      <AlertTriangle class="w-5 h-5" />
      <span>{{ error }}</span>
    </div>
  </div>
</template>
