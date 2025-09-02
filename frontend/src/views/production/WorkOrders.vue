<script setup>
  import { ref, computed, onMounted } from 'vue';
  import {
    ClipboardList,
    Plus,
    Search,
    Filter,
    Clock,
    User,
    CheckCircle,
    AlertTriangle,
    RefreshCcw,
    Eye,
    Edit,
    Play,
    Pause,
    Square,
    Calendar,
    Timer,
    Package,
    Users,
    X,
  } from 'lucide-vue-next';
  import { useProductionStore } from '../../stores/productionStore.js';

  const productionStore = useProductionStore();

  // Reactive state
  const searchQuery = ref('');
  const statusFilter = ref('');
  const priorityFilter = ref('');
  const taskTypeFilter = ref('');
  const assignedToFilter = ref('');
  const showCreateModal = ref(false);
  const showDetailsModal = ref(false);
  const selectedWorkOrder = ref(null);
  const currentView = ref('list'); // list, kanban

  // Form data
  const workOrderForm = ref({
    work_order_number: '',
    production_order_id: '',
    task_name: '',
    task_description: '',
    task_type: 'Preparation',
    assigned_to: '',
    priority: 'Normal',
    scheduled_start: '',
    scheduled_end: '',
    estimated_duration_minutes: '',
    completion_notes: '',
  });

  // Access store data
  const loading = computed(() => productionStore.loading);
  const error = computed(() => productionStore.error);
  const workOrders = computed(() => productionStore.workOrders);
  const productionOrders = computed(() => productionStore.productionOrders);

  // Computed properties
  const filteredWorkOrders = computed(() => {
    let filtered = workOrders.value;

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.task_name.toLowerCase().includes(query) ||
          order.work_order_number.toLowerCase().includes(query) ||
          order.task_description?.toLowerCase().includes(query)
      );
    }

    if (statusFilter.value) {
      filtered = filtered.filter(
        (order) => order.status === statusFilter.value
      );
    }

    if (priorityFilter.value) {
      filtered = filtered.filter(
        (order) => order.priority === priorityFilter.value
      );
    }

    if (taskTypeFilter.value) {
      filtered = filtered.filter(
        (order) => order.task_type === taskTypeFilter.value
      );
    }

    if (assignedToFilter.value) {
      filtered = filtered.filter(
        (order) => order.assigned_to == assignedToFilter.value
      );
    }

    return filtered.sort((a, b) => {
      // Sort by priority, then by scheduled start
      const priorityOrder = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
      const priorityCompare =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityCompare === 0) {
        return new Date(a.scheduled_start) - new Date(b.scheduled_start);
      }
      return priorityCompare;
    });
  });

  const workOrdersByStatus = computed(() => {
    const groups = {
      Pending: [],
      'In Progress': [],
      Completed: [],
      'On Hold': [],
      Cancelled: [],
    };

    filteredWorkOrders.value.forEach((order) => {
      if (groups[order.status]) {
        groups[order.status].push(order);
      }
    });

    return groups;
  });

  const workOrderStats = computed(() => {
    const total = workOrders.value.length;
    const pending = workOrders.value.filter(
      (w) => w.status === 'Pending'
    ).length;
    const inProgress = workOrders.value.filter(
      (w) => w.status === 'In Progress'
    ).length;
    const completed = workOrders.value.filter(
      (w) => w.status === 'Completed'
    ).length;
    const overdue = workOrders.value.filter((w) => {
      const now = new Date();
      const scheduledEnd = new Date(w.scheduled_end);
      return (
        scheduledEnd < now &&
        (w.status === 'Pending' || w.status === 'In Progress')
      );
    }).length;

    return { total, pending, inProgress, completed, overdue };
  });

  // Methods
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Completed':
        return 'badge-success';
      case 'In Progress':
        return 'badge-info';
      case 'Pending':
        return 'badge-warning';
      case 'On Hold':
        return 'badge-neutral';
      case 'Cancelled':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Urgent':
        return 'badge-error';
      case 'High':
        return 'badge-warning';
      case 'Normal':
        return 'badge-info';
      case 'Low':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  };

  const getTaskTypeIcon = (taskType) => {
    switch (taskType) {
      case 'Preparation':
        return 'knife';
      case 'Cooking':
        return 'flame';
      case 'Assembly':
        return 'layers';
      case 'Packaging':
        return 'package';
      case 'Quality Check':
        return 'check-circle';
      case 'Cleanup':
        return 'trash-2';
      default:
        return 'clipboard';
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const isOverdue = (workOrder) => {
    const now = new Date();
    const scheduledEnd = new Date(workOrder.scheduled_end);
    return (
      scheduledEnd < now &&
      (workOrder.status === 'Pending' || workOrder.status === 'In Progress')
    );
  };

  const openCreateModal = () => {
    resetForm();
    showCreateModal.value = true;
  };

  const closeCreateModal = () => {
    showCreateModal.value = false;
    resetForm();
  };

  const openDetailsModal = (workOrder) => {
    selectedWorkOrder.value = workOrder;
    showDetailsModal.value = true;
  };

  const closeDetailsModal = () => {
    showDetailsModal.value = false;
    selectedWorkOrder.value = null;
  };

  const resetForm = () => {
    workOrderForm.value = {
      work_order_number: '',
      production_order_id: '',
      task_name: '',
      task_description: '',
      task_type: 'Preparation',
      assigned_to: '',
      priority: 'Normal',
      scheduled_start: '',
      scheduled_end: '',
      estimated_duration_minutes: '',
      completion_notes: '',
    };
  };

  const updateWorkOrderStatus = async (workOrderId, newStatus) => {
    try {
      await productionStore.updateWorkOrderStatus(workOrderId, newStatus);
      showToast(
        `Work order ${newStatus.toLowerCase()} successfully!`,
        'success'
      );
    } catch (error) {
      showToast(error.message || 'Failed to update work order status', 'error');
    }
  };

  const refreshData = async () => {
    try {
      await Promise.all([
        productionStore.fetchWorkOrders(),
        productionStore.fetchProductionOrders(),
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
          <ClipboardList class="w-8 h-8" />
          Work Orders
        </h1>
        <p class="text-base-content/70 mt-1">
          Manage and track production tasks and assignments
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="btn-group">
          <button
            :class="['btn btn-sm', currentView === 'list' ? 'btn-active' : '']"
            @click="currentView = 'list'"
          >
            List View
          </button>
          <button
            :class="[
              'btn btn-sm',
              currentView === 'kanban' ? 'btn-active' : '',
            ]"
            @click="currentView = 'kanban'"
          >
            Kanban
          </button>
        </div>
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
          New Work Order
        </button>
      </div>
    </div>

    <!-- Quick Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-6">
      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Total</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ workOrderStats.total }}
            </p>
          </div>
          <ClipboardList class="w-8 h-8 text-primaryColor opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Pending</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ workOrderStats.pending }}
            </p>
          </div>
          <Clock class="w-8 h-8 text-warning opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">In Progress</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ workOrderStats.inProgress }}
            </p>
          </div>
          <Play class="w-8 h-8 text-info opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Completed</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ workOrderStats.completed }}
            </p>
          </div>
          <CheckCircle class="w-8 h-8 text-success opacity-80" />
        </div>
      </div>

      <div class="bg-accentColor rounded-xl p-6 shadow-sm border">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-base-content/70">Overdue</p>
            <p class="text-2xl font-bold text-primaryColor">
              {{ workOrderStats.overdue }}
            </p>
          </div>
          <AlertTriangle class="w-8 h-8 text-error opacity-80" />
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
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
              placeholder="Search work orders..."
              class="input input-bordered w-full"
            />
          </div>
        </div>

        <div class="form-control">
          <select v-model="statusFilter" class="select select-bordered">
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div class="form-control">
          <select v-model="taskTypeFilter" class="select select-bordered">
            <option value="">All Task Types</option>
            <option value="Preparation">Preparation</option>
            <option value="Cooking">Cooking</option>
            <option value="Assembly">Assembly</option>
            <option value="Packaging">Packaging</option>
            <option value="Quality Check">Quality Check</option>
            <option value="Cleanup">Cleanup</option>
          </select>
        </div>

        <div class="form-control">
          <select v-model="priorityFilter" class="select select-bordered">
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-if="currentView === 'list'">
      <div v-if="loading" class="flex justify-center py-12">
        <span
          class="loading loading-spinner loading-lg text-primaryColor"
        ></span>
      </div>

      <div
        v-else-if="filteredWorkOrders.length === 0"
        class="text-center py-12 bg-accentColor rounded-xl"
      >
        <ClipboardList class="w-16 h-16 text-base-content/30 mx-auto mb-4" />
        <p class="text-lg font-medium text-base-content/70">
          No work orders found
        </p>
        <p class="text-base-content/50">
          Create your first work order to get started
        </p>
      </div>

      <div v-else class="bg-accentColor rounded-xl shadow-sm border">
        <div class="p-6 border-b">
          <h2 class="text-xl font-semibold text-primaryColor">
            Work Orders List
          </h2>
        </div>

        <div class="divide-y divide-base-200">
          <div
            v-for="workOrder in filteredWorkOrders"
            :key="workOrder.id"
            class="p-6 hover:bg-base-50 transition-colors"
            :class="{ 'bg-error/5': isOverdue(workOrder) }"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-lg font-semibold text-primaryColor">
                    {{ workOrder.task_name }}
                  </h3>
                  <div
                    class="badge"
                    :class="getStatusBadgeClass(workOrder.status)"
                  >
                    {{ workOrder.status }}
                  </div>
                  <div
                    class="badge"
                    :class="getPriorityBadgeClass(workOrder.priority)"
                  >
                    {{ workOrder.priority }}
                  </div>
                  <div v-if="isOverdue(workOrder)" class="badge badge-error">
                    Overdue
                  </div>
                </div>

                <div
                  class="flex items-center gap-6 text-sm text-base-content/70 mb-2"
                >
                  <span>{{ workOrder.work_order_number }}</span>
                  <span>{{ workOrder.task_type }}</span>
                  <span v-if="workOrder.assigned_to_name"
                    >Assigned to: {{ workOrder.assigned_to_name }}</span
                  >
                  <span
                    >{{ formatDateTime(workOrder.scheduled_start) }} -
                    {{ formatDateTime(workOrder.scheduled_end) }}</span
                  >
                </div>

                <div
                  v-if="workOrder.task_description"
                  class="text-sm text-base-content/60"
                >
                  {{ workOrder.task_description }}
                </div>
              </div>

              <div class="flex items-center gap-2">
                <div class="text-right mr-4">
                  <p class="text-sm font-medium text-primaryColor">
                    {{ formatDuration(workOrder.estimated_duration_minutes) }}
                  </p>
                  <p class="text-xs text-base-content/60">Estimated</p>
                </div>

                <div class="dropdown dropdown-end">
                  <label tabindex="0" class="btn btn-ghost btn-sm">
                    <Eye class="w-4 h-4" />
                  </label>
                  <ul
                    tabindex="0"
                    class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
                  >
                    <li>
                      <a @click="openDetailsModal(workOrder)"
                        ><Eye class="w-4 h-4" />View Details</a
                      >
                    </li>
                    <li v-if="workOrder.status === 'Pending'">
                      <a
                        @click="
                          updateWorkOrderStatus(workOrder.id, 'In Progress')
                        "
                      >
                        <Play class="w-4 h-4" />Start Task
                      </a>
                    </li>
                    <li v-if="workOrder.status === 'In Progress'">
                      <a
                        @click="
                          updateWorkOrderStatus(workOrder.id, 'Completed')
                        "
                      >
                        <CheckCircle class="w-4 h-4" />Complete
                      </a>
                    </li>
                    <li v-if="workOrder.status === 'In Progress'">
                      <a
                        @click="updateWorkOrderStatus(workOrder.id, 'On Hold')"
                      >
                        <Pause class="w-4 h-4" />Put on Hold
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Kanban View -->
    <div
      v-else-if="currentView === 'kanban'"
      class="grid grid-cols-1 lg:grid-cols-5 gap-6"
    >
      <div
        v-for="(orders, status) in workOrdersByStatus"
        :key="status"
        class="space-y-4"
      >
        <div class="bg-accentColor rounded-lg p-4 shadow-sm border">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-primaryColor">{{ status }}</h3>
            <div class="badge badge-neutral">{{ orders.length }}</div>
          </div>

          <div class="space-y-3 max-h-96 overflow-y-auto">
            <div
              v-for="workOrder in orders"
              :key="workOrder.id"
              class="bg-base-100 p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
              :class="{ 'border-error': isOverdue(workOrder) }"
              @click="openDetailsModal(workOrder)"
            >
              <div class="flex items-start justify-between mb-2">
                <h4 class="font-medium text-primaryColor text-sm">
                  {{ workOrder.task_name }}
                </h4>
                <div
                  class="badge badge-xs"
                  :class="getPriorityBadgeClass(workOrder.priority)"
                >
                  {{ workOrder.priority }}
                </div>
              </div>

              <div class="text-xs text-base-content/60 mb-2">
                {{ workOrder.work_order_number }}
              </div>

              <div class="text-xs text-base-content/70 mb-2">
                {{ workOrder.task_type }}
              </div>

              <div
                class="flex items-center justify-between text-xs text-base-content/60"
              >
                <span v-if="workOrder.assigned_to_name">{{
                  workOrder.assigned_to_name
                }}</span>
                <span>{{
                  formatDuration(workOrder.estimated_duration_minutes)
                }}</span>
              </div>

              <div v-if="isOverdue(workOrder)" class="mt-2">
                <div class="badge badge-error badge-xs">Overdue</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Work Order Details Modal -->
    <dialog :class="{ 'modal modal-open': showDetailsModal }" class="modal">
      <div class="modal-box max-w-4xl" v-if="selectedWorkOrder">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          Work Order Details
        </h3>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="space-y-4">
            <div>
              <h4 class="font-semibold text-primaryColor mb-2">
                Task Information
              </h4>
              <div class="bg-base-100 p-4 rounded-lg space-y-2">
                <div class="flex justify-between">
                  <span class="text-base-content/70">Work Order #:</span>
                  <span class="font-medium">{{
                    selectedWorkOrder.work_order_number
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Task Name:</span>
                  <span class="font-medium">{{
                    selectedWorkOrder.task_name
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Task Type:</span>
                  <span class="font-medium">{{
                    selectedWorkOrder.task_type
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Status:</span>
                  <div
                    class="badge"
                    :class="getStatusBadgeClass(selectedWorkOrder.status)"
                  >
                    {{ selectedWorkOrder.status }}
                  </div>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Priority:</span>
                  <div
                    class="badge"
                    :class="getPriorityBadgeClass(selectedWorkOrder.priority)"
                  >
                    {{ selectedWorkOrder.priority }}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 class="font-semibold text-primaryColor mb-2">Schedule</h4>
              <div class="bg-base-100 p-4 rounded-lg space-y-2">
                <div class="flex justify-between">
                  <span class="text-base-content/70">Scheduled Start:</span>
                  <span class="font-medium">{{
                    formatDateTime(selectedWorkOrder.scheduled_start)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Scheduled End:</span>
                  <span class="font-medium">{{
                    formatDateTime(selectedWorkOrder.scheduled_end)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Estimated Duration:</span>
                  <span class="font-medium">{{
                    formatDuration(selectedWorkOrder.estimated_duration_minutes)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-base-content/70">Assigned To:</span>
                  <span class="font-medium">{{
                    selectedWorkOrder.assigned_to_name || 'Unassigned'
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div v-if="selectedWorkOrder.task_description">
              <h4 class="font-semibold text-primaryColor mb-2">Description</h4>
              <div class="bg-base-100 p-4 rounded-lg">
                <p class="text-sm">{{ selectedWorkOrder.task_description }}</p>
              </div>
            </div>

            <div v-if="selectedWorkOrder.completion_notes">
              <h4 class="font-semibold text-primaryColor mb-2">
                Completion Notes
              </h4>
              <div class="bg-base-100 p-4 rounded-lg">
                <p class="text-sm">{{ selectedWorkOrder.completion_notes }}</p>
              </div>
            </div>

            <div
              v-if="
                selectedWorkOrder.actual_start || selectedWorkOrder.actual_end
              "
            >
              <h4 class="font-semibold text-primaryColor mb-2">
                Actual Timing
              </h4>
              <div class="bg-base-100 p-4 rounded-lg space-y-2">
                <div
                  v-if="selectedWorkOrder.actual_start"
                  class="flex justify-between"
                >
                  <span class="text-base-content/70">Actual Start:</span>
                  <span class="font-medium">{{
                    formatDateTime(selectedWorkOrder.actual_start)
                  }}</span>
                </div>
                <div
                  v-if="selectedWorkOrder.actual_end"
                  class="flex justify-between"
                >
                  <span class="text-base-content/70">Actual End:</span>
                  <span class="font-medium">{{
                    formatDateTime(selectedWorkOrder.actual_end)
                  }}</span>
                </div>
                <div
                  v-if="selectedWorkOrder.actual_duration_minutes"
                  class="flex justify-between"
                >
                  <span class="text-base-content/70">Actual Duration:</span>
                  <span class="font-medium">{{
                    formatDuration(selectedWorkOrder.actual_duration_minutes)
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <div class="flex gap-2">
            <button
              v-if="selectedWorkOrder.status === 'Pending'"
              @click="
                updateWorkOrderStatus(selectedWorkOrder.id, 'In Progress')
              "
              class="btn btn-outline btn-sm"
            >
              <Play class="w-4 h-4" />
              Start
            </button>
            <button
              v-if="selectedWorkOrder.status === 'In Progress'"
              @click="updateWorkOrderStatus(selectedWorkOrder.id, 'Completed')"
              class="btn btn-outline btn-sm"
            >
              <CheckCircle class="w-4 h-4" />
              Complete
            </button>
          </div>
          <button
            @click="closeDetailsModal"
            class="btn bg-primaryColor text-white"
          >
            Close
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button @click="closeDetailsModal">close</button>
      </form>
    </dialog>

    <!-- Error Display -->
    <div v-if="error" class="alert alert-error">
      <AlertTriangle class="w-5 h-5" />
      <span>{{ error }}</span>
    </div>
  </div>
</template>
