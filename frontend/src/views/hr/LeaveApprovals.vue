<template>
  <div class="space-y-6 p-4">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
    >
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold">Leave Approvals</h1>
        <p class="text-sm text-gray-600 mt-1 hidden sm:block">
          Manage leave requests from all departments and branches
        </p>
      </div>
      <div class="text-sm text-base-content/70">
        <span class="hidden sm:inline">Last updated: </span
        >{{ lastUpdated.toLocaleTimeString() }}
        <span v-if="loading" class="ml-2">
          <span class="loading loading-spinner loading-xs"></span>
          <span class="hidden sm:inline">Updating...</span>
        </span>
      </div>
    </div>

    <!-- Summary Stats (match OvertimeApproval) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
      <div class="card bg-white shadow-lg">
        <div class="card-body py-4">
          <div class="text-sm opacity-60">Pending</div>
          <div class="text-2xl font-semibold">{{ pendingHRCount }}</div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              v-model="filters.status"
              @change="applyFilters"
              class="select select-bordered w-full"
            >
              <option value="">All Status</option>
              <option value="pending">Pending Manager Approval</option>
              <option value="approved_by_manager">Pending HR Approval</option>
              <option value="approved_by_hr">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              Branch
            </label>
            <select
              v-model="filters.branch_id"
              @change="applyFilters"
              class="select select-bordered w-full"
            >
              <option value="">All Branches</option>
              <option
                v-for="branch in activeBranches"
                :key="branch.id"
                :value="branch.id"
              >
                {{ branch.name }}
              </option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              Department
            </label>
            <select
              v-model="filters.department"
              @change="applyFilters"
              class="select select-bordered w-full"
            >
              <option value="">All Departments</option>
              <option v-for="dept in departments" :key="dept" :value="dept">
                {{ dept }}
              </option>
            </select>
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              Search
            </label>
            <div class="relative">
              <Search
                class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
              />
              <input
                v-model="filters.search"
                @input="applyFilters"
                type="text"
                placeholder="Search by employee name..."
                class="input input-bordered w-full pl-10"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs Container -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body p-0">
        <!-- Tab Navigation -->
        <div class="tabs tabs-boxed bg-base-200 m-6 mb-0">
          <button
            @click="activeTab = 'requests'"
            :class="[
              'tab tab-lg',
              activeTab === 'requests' ? 'tab-active' : '',
            ]"
          >
            <UserCheck class="w-5 h-5 mr-2" />
            Leave Requests
            <span
              v-if="loading"
              class="loading loading-spinner loading-sm ml-2"
            ></span>
            <span
              v-if="!loading && filteredLeaveRequests.length > 0"
              class="badge badge-ghost ml-2"
            >
              {{ filteredLeaveRequests.length }}
            </span>
          </button>
          <button
            @click="activeTab = 'history'"
            :class="['tab tab-lg', activeTab === 'history' ? 'tab-active' : '']"
          >
            <Clock class="w-5 h-5 mr-2" />
            Leave History
            <span
              v-if="historyLoading"
              class="loading loading-spinner loading-sm ml-2"
            ></span>
            <span
              v-if="!historyLoading && filteredHistoryRequests.length > 0"
              class="badge badge-ghost ml-2"
            >
              {{ filteredHistoryRequests.length }}
            </span>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
          <!-- Leave Requests Tab -->
          <div v-if="activeTab === 'requests'" class="space-y-4">
            <div
              class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <h3 class="card-title text-primaryColor">
                <UserCheck class="w-5 h-5" />
                Leave Requests
              </h3>
              <div class="flex gap-2">
                <button
                  @click="refreshData"
                  class="btn btn-sm btn-outline"
                  :disabled="loading"
                >
                  <RefreshCcw
                    class="w-4 h-4"
                    :class="{ 'animate-spin': loading }"
                  />
                  <span class="hidden sm:inline">{{
                    loading ? 'Refreshing...' : 'Refresh'
                  }}</span>
                </button>
                <button
                  @click="exportToCSV"
                  class="btn btn-outline btn-sm"
                  :disabled="filteredLeaveRequests.length === 0"
                >
                  <Download class="w-4 h-4 mr-1" />
                  <span class="hidden sm:inline">Export CSV</span>
                  <span class="sm:hidden">Export</span>
                </button>
              </div>
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="flex items-center justify-center py-12">
              <div class="flex flex-col items-center space-y-3">
                <span class="loading loading-spinner loading-lg"></span>
                <p class="text-sm text-gray-500">Loading leave requests...</p>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="filteredLeaveRequests.length === 0"
              class="text-center py-8 text-gray-500"
            >
              <div class="flex flex-col items-center space-y-2">
                <FileText class="w-12 h-12 text-gray-300" />
                <p>
                  {{
                    hasActiveFilters
                      ? 'No leave requests match your filters'
                      : 'No leave requests found'
                  }}
                </p>
              </div>
            </div>

            <!-- Table -->
            <div v-else class="overflow-x-auto">
              <table class="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Branch</th>
                    <th>Leave Type</th>
                    <th>From Date</th>
                    <th>To Date</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="request in paginatedRequests" :key="request.id">
                    <td>
                      <div class="flex items-center space-x-3">
                        <div>
                          <div class="font-medium">
                            {{ request.first_name }} {{ request.last_name }}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="">{{ request.department || 'N/A' }}</span>
                    </td>
                    <td>
                      <span class="">{{
                        getBranchName(request.branch_id)
                      }}</span>
                    </td>
                    <td>
                      <div class="flex items-center space-x-2">
                        <span class="font-medium">{{
                          request.leave_type
                        }}</span>
                        <span
                          v-if="request.use_sil"
                          class="badge badge-sm bg-info/10 text-info"
                          title="Uses Service Incentive Leave"
                        >
                          SIL
                        </span>
                      </div>
                    </td>
                    <td>{{ formatDate(request.from_date) }}</td>
                    <td>{{ formatDate(request.to_date) }}</td>
                    <td>
                      <span class="badge badge-ghost"
                        >{{
                          calculateDays(request.from_date, request.to_date)
                        }}
                        days</span
                      >
                    </td>
                    <td>
                      <div
                        :class="[
                          'badge badge-sm border-none font-medium',
                          getStatusBadgeClass(request.status),
                        ]"
                      >
                        {{ getStatusDisplayText(request.status, request) }}
                      </div>
                    </td>
                    <td>{{ formatDateTime(request.created_at) }}</td>
                    <td>
                      <div class="flex space-x-2">
                        <button
                          @click="viewLeaveRequest(request)"
                          class="btn btn-ghost btn-xs"
                          title="View Details"
                        >
                          <Eye class="w-4 h-4" />
                        </button>
                        <button
                          v-if="canApprove(request)"
                          @click="approveLeaveRequest(request)"
                          class="btn btn-xs bg-success/10 rounded-full font-thin shadow-none border border-none hover:bg-success/30 text-success"
                          title="Approve"
                        >
                          <CheckCircle class="w-4 h-4" />
                        </button>
                        <button
                          v-if="canReject(request)"
                          @click="rejectLeaveRequest(request)"
                          class="btn btn-xs bg-error/10 rounded-full font-thin shadow-none border border-none hover:bg-error/30 text-error"
                          title="Reject"
                        >
                          <XCircle class="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <!-- Pagination -->
              <div class="flex justify-center mt-4">
                <div class="join">
                  <button
                    class="join-item btn btn-sm"
                    :disabled="currentPage === 1"
                    @click="currentPage = Math.max(1, currentPage - 1)"
                  >
                    «
                  </button>
                  <button class="join-item btn btn-sm">
                    Page {{ currentPage }} of {{ totalPages }}
                  </button>
                  <button
                    class="join-item btn btn-sm"
                    :disabled="currentPage === totalPages"
                    @click="currentPage = Math.min(totalPages, currentPage + 1)"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Leave History Tab -->
          <div v-if="activeTab === 'history'" class="space-y-4">
            <div
              class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <h3 class="card-title text-primaryColor">
                <Clock class="w-5 h-5" />
                Leave Requests History
              </h3>
              <div class="flex gap-2">
                <button
                  @click="refreshHistoryData"
                  class="btn btn-sm bg-gray-100 hover:bg-gray-200 font-thin"
                  :disabled="historyLoading"
                >
                  <RefreshCcw
                    class="w-4 h-4"
                    :class="{ 'animate-spin': historyLoading }"
                  />
                  <span class="hidden sm:inline">{{
                    historyLoading ? 'Refreshing...' : 'Refresh'
                  }}</span>
                </button>
                <button
                  @click="exportHistoryToCSV"
                  class="btn btn-outline btn-sm"
                  :disabled="filteredHistoryRequests.length === 0"
                >
                  <Download class="w-4 h-4 mr-1" />
                  <span class="hidden sm:inline">Export CSV</span>
                  <span class="sm:hidden">Export</span>
                </button>
              </div>
            </div>

            <!-- History Filters -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">
                  Date Range
                </label>
                <select
                  v-model="historyFilters.dateRange"
                  @change="applyHistoryFilters"
                  class="select select-bordered w-full"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom_month">Custom Month</option>
                </select>
              </div>

              <!-- Custom Month Picker -->
              <div
                class="space-y-2"
                v-if="historyFilters.dateRange === 'custom_month'"
              >
                <label class="block text-sm font-medium text-gray-700">
                  Select Month
                </label>
                <input
                  type="month"
                  v-model="historyCustomMonth"
                  @change="applyHistoryFilters"
                  class="input input-bordered w-full"
                />
              </div>

              <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-700">
                  Search
                </label>
                <div class="relative">
                  <Search
                    class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                  />
                  <input
                    v-model="historyFilters.search"
                    @input="applyHistoryFilters"
                    type="text"
                    placeholder="Search by employee name..."
                    class="input input-bordered w-full pl-10"
                  />
                </div>
              </div>
            </div>

            <!-- Loading State -->
            <div
              v-if="historyLoading"
              class="flex items-center justify-center py-12"
            >
              <div class="flex flex-col items-center space-y-3">
                <span class="loading loading-spinner loading-lg"></span>
                <p class="text-sm text-gray-500">Loading leave history...</p>
              </div>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="filteredHistoryRequests.length === 0"
              class="text-center py-8 text-gray-500"
            >
              <div class="flex flex-col items-center space-y-2">
                <FileText class="w-12 h-12 text-gray-300" />
                <p>
                  {{
                    hasActiveHistoryFilters
                      ? 'No completed leave requests match your filters'
                      : 'No completed leave requests found'
                  }}
                </p>
              </div>
            </div>

            <!-- History Table -->
            <div v-else class="overflow-x-auto">
              <table class="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Branch</th>
                    <th>Leave Type</th>
                    <th>From Date</th>
                    <th>To Date</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Completed Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="request in paginatedHistoryRequests"
                    :key="request.id"
                  >
                    <td>
                      <div class="flex items-center space-x-3">
                        <div>
                          <div class="font-medium">
                            {{ request.first_name }} {{ request.last_name }}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="">{{ request.department || 'N/A' }}</span>
                    </td>
                    <td>
                      <span class="">{{
                        getBranchName(request.branch_id)
                      }}</span>
                    </td>
                    <td>
                      <div class="flex items-center space-x-2">
                        <span class="font-medium"
                          >{{ request.leave_type }} /
                        </span>
                        <span
                          v-if="request.use_sil"
                          class="badge badge-sm bg-info/10 text-info"
                          title="Uses Service Incentive Leave"
                        >
                          SIL
                        </span>
                      </div>
                    </td>
                    <td>{{ formatDate(request.from_date) }}</td>
                    <td>{{ formatDate(request.to_date) }}</td>
                    <td>
                      <span class="badge badge-ghost"
                        >{{
                          calculateDays(request.from_date, request.to_date)
                        }}
                        days</span
                      >
                    </td>
                    <td>
                      <div
                        :class="[
                          'badge badge-sm border-none font-medium',
                          getStatusBadgeClass(request.status),
                        ]"
                      >
                        {{ getStatusDisplayText(request.status, request) }}
                      </div>
                    </td>
                    <td>{{ formatDateTime(getCompletionDate(request)) }}</td>
                    <td>
                      <div class="flex space-x-2">
                        <button
                          @click="viewLeaveRequest(request)"
                          class="btn btn-ghost btn-xs"
                          title="View Details"
                        >
                          <Eye class="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <!-- History Pagination -->
              <div class="flex justify-center mt-4">
                <div class="join">
                  <button
                    class="join-item btn btn-sm"
                    :disabled="currentHistoryPage === 1"
                    @click="
                      currentHistoryPage = Math.max(1, currentHistoryPage - 1)
                    "
                  >
                    «
                  </button>
                  <button class="join-item btn btn-sm">
                    Page {{ currentHistoryPage }} of {{ totalHistoryPages }}
                  </button>
                  <button
                    class="join-item btn btn-sm"
                    :disabled="currentHistoryPage === totalHistoryPages"
                    @click="
                      currentHistoryPage = Math.min(
                        totalHistoryPages,
                        currentHistoryPage + 1
                      )
                    "
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- View Leave Request Modal -->
    <div v-if="showViewModal" class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Leave Request Details</h3>

        <div v-if="selectedRequest" class="space-y-4">
          <!-- Employee Info -->
          <div class="card bg-base-200">
            <div class="card-body p-4">
              <h4 class="font-semibold mb-2">Employee Information</h4>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-600">Name:</span>
                  <span class="font-medium ml-2"
                    >{{ selectedRequest.first_name }}
                    {{ selectedRequest.last_name }}</span
                  >
                </div>
                <div>
                  <span class="text-gray-600">Employee ID:</span>
                  <span class="font-medium ml-2">{{
                    selectedRequest.employee_code
                  }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Department:</span>
                  <span class="font-medium ml-2">{{
                    selectedRequest.department || 'N/A'
                  }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Branch:</span>
                  <span class="font-medium ml-2">{{
                    getBranchName(selectedRequest.branch_id)
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Leave Details -->
          <div class="card bg-base-200">
            <div class="card-body p-4">
              <h4 class="font-semibold mb-2">Leave Details</h4>
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-600">Leave Type:</span>
                  <span class="font-medium ml-2">{{
                    selectedRequest.leave_type
                  }}</span>
                </div>
                <div>
                  <span class="text-gray-600">Duration:</span>
                  <span class="font-medium ml-2"
                    >{{
                      calculateDays(
                        selectedRequest.from_date,
                        selectedRequest.to_date
                      )
                    }}
                    days</span
                  >
                </div>
                <div>
                  <span class="text-gray-600">From Date:</span>
                  <span class="font-medium ml-2">{{
                    formatDate(selectedRequest.from_date)
                  }}</span>
                </div>
                <div>
                  <span class="text-gray-600">To Date:</span>
                  <span class="font-medium ml-2">{{
                    formatDate(selectedRequest.to_date)
                  }}</span>
                </div>
                <div class="col-span-2">
                  <span class="text-gray-600">Reason:</span>
                  <p class="font-medium ml-2 mt-1">
                    {{ selectedRequest.reason }}
                  </p>
                </div>

                <!-- SIL Information -->
                <div v-if="selectedRequest.use_sil" class="col-span-2">
                  <div
                    class="mt-3 p-3 bg-info/10 rounded-lg border border-info/20"
                  >
                    <div class="flex items-center space-x-2 mb-2">
                      <svg
                        class="w-4 h-4 text-info"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clip-rule="evenodd"
                        ></path>
                      </svg>
                      <span class="text-info font-medium"
                        >Service Incentive Leave (SIL) Used</span
                      >
                    </div>
                    <div class="text-sm text-info">
                      <span class="font-medium">SIL Days Used:</span>
                      <span class="ml-1"
                        >{{ selectedRequest.sil_days || 0 }} days</span
                      >
                    </div>
                    <div class="text-xs text-info/70 mt-1">
                      This leave request uses the employee's Service Incentive
                      Leave credits
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Status & Approval History -->
          <div class="card bg-base-200">
            <div class="card-body p-4">
              <h4 class="font-semibold mb-2">Status & Approval History</h4>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Current Status:</span>
                  <span
                    :class="[
                      'badge badge-sm',
                      getStatusBadgeClass(selectedRequest.status),
                    ]"
                  >
                    {{
                      getStatusDisplayText(
                        selectedRequest.status,
                        selectedRequest
                      )
                    }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Submitted:</span>
                  <span class="font-medium">{{
                    formatDateTime(selectedRequest.created_at)
                  }}</span>
                </div>

                <div
                  v-if="selectedRequest.manager_approved_at"
                  class="flex justify-between"
                >
                  <span class="text-gray-600">Manager Approved:</span>
                  <span class="font-medium">{{
                    formatDateTime(selectedRequest.manager_approved_at)
                  }}</span>
                </div>

                <div
                  v-if="selectedRequest.manager_first_name"
                  class="flex justify-between"
                >
                  <span class="text-gray-600">Approved by Manager:</span>
                  <span class="font-medium"
                    >{{ selectedRequest.manager_first_name }}
                    {{ selectedRequest.manager_last_name }}</span
                  >
                </div>

                <div v-if="selectedRequest.manager_notes" class="mt-2">
                  <span class="text-gray-600">Manager Notes:</span>
                  <p class="font-medium ml-2 mt-1">
                    {{ selectedRequest.manager_notes }}
                  </p>
                </div>

                <div
                  v-if="selectedRequest.hr_approved_at"
                  class="flex justify-between"
                >
                  <span class="text-gray-600">HR Approved:</span>
                  <span class="font-medium">{{
                    formatDateTime(selectedRequest.hr_approved_at)
                  }}</span>
                </div>

                <div
                  v-if="selectedRequest.hr_first_name"
                  class="flex justify-between"
                >
                  <span class="text-gray-600">Approved by HR:</span>
                  <span class="font-medium"
                    >{{ selectedRequest.hr_first_name }}
                    {{ selectedRequest.hr_last_name }}</span
                  >
                </div>

                <div v-if="selectedRequest.hr_notes" class="mt-2">
                  <span class="text-gray-600">HR Notes:</span>
                  <p class="font-medium ml-2 mt-1">
                    {{ selectedRequest.hr_notes }}
                  </p>
                </div>

                <div
                  v-if="selectedRequest.rejected_at"
                  class="flex justify-between"
                >
                  <span class="text-gray-600">Rejected:</span>
                  <span class="font-medium">{{
                    formatDateTime(selectedRequest.rejected_at)
                  }}</span>
                </div>

                <div v-if="selectedRequest.rejection_reason" class="mt-2">
                  <span class="text-gray-600">Rejection Reason:</span>
                  <p class="font-medium ml-2 mt-1 text-error">
                    {{ selectedRequest.rejection_reason }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeViewModal"
            class="btn btn-ghost font-thin hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Approval Modal -->
    <div v-if="showApprovalModal" class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4 text-primaryColor">
          <CheckCircle class="w-5 h-5 inline mr-2" />
          Approve Leave Request
        </h3>

        <div v-if="selectedRequest" class="space-y-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h4 class="font-semibold">
                  {{ selectedRequest.first_name }}
                  {{ selectedRequest.last_name }}
                </h4>
                <p class="text-sm text-gray-600">
                  {{ selectedRequest.employee_code }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium">
                  {{ formatDate(selectedRequest.from_date) }} -
                  {{ formatDate(selectedRequest.to_date) }}
                </p>
                <p class="text-sm text-gray-600">
                  {{
                    calculateDays(
                      selectedRequest.from_date,
                      selectedRequest.to_date
                    )
                  }}
                  days
                </p>
              </div>
            </div>
            <div class="mt-2">
              <span class="badge badge-sm bg-primaryColor/10 text-primaryColor">
                {{ selectedRequest.leave_type }}
              </span>
            </div>
            <div class="mt-3">
              <p class="text-sm text-gray-700">
                <strong>Reason:</strong> {{ selectedRequest.reason }}
              </p>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Approval Notes (Optional)</span>
            </label>
            <textarea
              v-model="approvalNotes"
              class="textarea textarea-bordered w-full"
              rows="3"
              placeholder="Add any notes about this approval..."
            ></textarea>
          </div>

          <div class="alert bg-primaryColor/10 text-primaryColor">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              ></path>
            </svg>
            <span class="text-sm">
              Are you sure you want to approve this leave request?
            </span>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeApprovalModal"
            class="btn btn-ghost btn-sm font-thin shadow-none border border-none hover:bg-primaryColor/10"
            :disabled="isProcessing"
          >
            Cancel
          </button>
          <button
            @click="confirmApproval"
            class="btn bg-primaryColor font-thin text-white btn-sm shadow-none border border-none hover:bg-primaryColor/80"
            :disabled="isProcessing"
          >
            <span
              v-if="isProcessing"
              class="loading loading-spinner loading-sm mr-2"
            ></span>
            <CheckCircle v-else class="w-4 h-4 mr-2" />
            {{ isProcessing ? 'Approving...' : 'Approve Request' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Rejection Modal -->
    <div v-if="showRejectionModal" class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg mb-4 text-error">
          <XCircle class="w-5 h-5 inline mr-2" />
          Reject Leave Request
        </h3>

        <div v-if="selectedRequest" class="space-y-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h4 class="font-semibold">
                  {{ selectedRequest.first_name }}
                  {{ selectedRequest.last_name }}
                </h4>
                <p class="text-sm text-gray-600">
                  {{ selectedRequest.employee_code }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium">
                  {{ formatDate(selectedRequest.from_date) }} -
                  {{ formatDate(selectedRequest.to_date) }}
                </p>
                <p class="text-sm text-gray-600">
                  {{
                    calculateDays(
                      selectedRequest.from_date,
                      selectedRequest.to_date
                    )
                  }}
                  days
                </p>
              </div>
            </div>
            <div class="mt-2">
              <span class="badge badge-sm bg-primaryColor/10 text-primaryColor">
                {{ selectedRequest.leave_type }}
              </span>
            </div>
            <div class="mt-3">
              <p class="text-sm text-gray-700">
                <strong>Reason:</strong> {{ selectedRequest.reason }}
              </p>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Rejection Reason (Required)</span>
            </label>
            <textarea
              v-model="rejectionReason"
              class="textarea textarea-bordered w-full"
              rows="3"
              placeholder="Provide feedback on why this request is being rejected..."
              required
            ></textarea>
          </div>

          <div class="alert bg-warning/10 text-warning shadow-none">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              ></path>
            </svg>
            <span class="text-sm">
              Are you sure you want to reject this leave request?
            </span>
          </div>
        </div>

        <div class="modal-action">
          <button
            @click="closeRejectionModal"
            class="btn btn-ghost btn-sm font-thin shadow-none border border-none hover:bg-gray-100"
            :disabled="isProcessing"
          >
            Cancel
          </button>
          <button
            @click="confirmRejection"
            class="btn btn-error text-white btn-sm shadow-none border border-none hover:bg-error/80 font-thin"
            :disabled="isProcessing || !rejectionReason.trim()"
          >
            <span
              v-if="isProcessing"
              class="loading loading-spinner loading-sm mr-2"
            ></span>
            <XCircle v-else class="w-4 h-4 mr-2" />
            {{ isProcessing ? 'Rejecting...' : 'Reject Request' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast.show" class="toast toast-top toast-end">
      <div
        :class="[
          'alert',
          toast.type === 'success' ? 'alert-success' : 'alert-error',
        ]"
      >
        <span>{{ toast.message }}</span>
      </div>
    </div>

    <!-- Processing overlay -->
    <div
      v-if="isProcessing"
      class="fixed inset-0 bg-black/10 pointer-events-none flex items-center justify-center"
    >
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted, watch } from 'vue';
  import {
    RefreshCcw,
    Search,
    Download,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    UserCheck,
    FileText,
    Info,
    AlertTriangle,
  } from 'lucide-vue-next';
  import { useLeaveStore } from '../../stores/leaveStore';
  import { useBranchStore } from '../../stores/branchStore';
  import { useAuthStore } from '../../stores/authStore';
  import { useCustomToast } from '../../composables/useCustomToast';
  import { apiConfig } from '../../config/api';

  const { showSuccess, showError, showLoading, dismiss } = useCustomToast();
  const leaveStore = useLeaveStore();
  const branchStore = useBranchStore();
  const authStore = useAuthStore();

  // Reactive state
  const loading = ref(false);
  const lastUpdated = ref(new Date());
  const currentPage = ref(1);
  const itemsPerPage = ref(10);
  const allLeaveRequests = ref([]);
  const departments = ref([]);

  // Tab state
  const activeTab = ref('requests');

  // History section state
  const historyLoading = ref(false);
  const allHistoryRequests = ref([]);
  const currentHistoryPage = ref(1);
  const historyItemsPerPage = ref(10);

  // Filters
  const filters = ref({
    status: '',
    branch_id: '',
    department: '',
    search: '',
  });

  // History filters
  const historyFilters = ref({
    dateRange: 'today',
    status: '',
    branch_id: '',
    search: '',
  });
  const historyCustomMonth = ref(''); // YYYY-MM

  // Modal states
  const showViewModal = ref(false);
  const showApprovalModal = ref(false);
  const showRejectionModal = ref(false);
  const selectedRequest = ref(null);
  const approvalNotes = ref('');
  const rejectionReason = ref('');
  const isProcessing = ref(false);

  // Toast state
  const toast = ref({ show: false, type: 'success', message: '' });

  // Computed properties
  const activeBranches = computed(() => branchStore.activeBranches || []);
  const currentUser = computed(() => authStore.user);

  const filteredLeaveRequests = computed(() => {
    let filtered = [...allLeaveRequests.value];

    // For HR Leave Approvals, exclude rejected requests by default
    // Only show them if specifically filtering by rejected status
    if (!filters.value.status || filters.value.status !== 'rejected') {
      filtered = filtered.filter((req) => req.status !== 'rejected');
    }

    if (filters.value.status) {
      filtered = filtered.filter((req) => req.status === filters.value.status);
    }

    if (filters.value.branch_id) {
      filtered = filtered.filter(
        (req) => req.branch_id === parseInt(filters.value.branch_id)
      );
    }

    if (filters.value.department) {
      filtered = filtered.filter(
        (req) => req.department === filters.value.department
      );
    }

    if (filters.value.search) {
      const searchTerm = filters.value.search.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          `${req.first_name} ${req.last_name}`
            .toLowerCase()
            .includes(searchTerm) ||
          req.employee_code.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  });

  const paginatedRequests = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return filteredLeaveRequests.value.slice(start, end);
  });

  const totalPages = computed(() => {
    return Math.max(
      1,
      Math.ceil(filteredLeaveRequests.value.length / itemsPerPage.value)
    );
  });

  const hasActiveFilters = computed(() => {
    return (
      filters.value.status ||
      filters.value.branch_id ||
      filters.value.department ||
      filters.value.search
    );
  });

  // Stats - exclude rejected requests from main counts
  const pendingManagerCount = computed(
    () =>
      allLeaveRequests.value.filter((req) => req.status === 'pending').length
  );

  const pendingHRCount = computed(
    () =>
      allLeaveRequests.value.filter(
        (req) => req.status === 'approved_by_manager'
      ).length
  );

  const approvedTodayCount = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return allLeaveRequests.value.filter((req) => {
      if (req.status !== 'approved_by_hr') return false;
      const approvedDate = new Date(
        req.hr_approved_at || req.manager_approved_at
      );
      return approvedDate.toISOString().split('T')[0] === today;
    }).length;
  });

  const totalRequestsCount = computed(
    () =>
      allLeaveRequests.value.filter((req) => req.status !== 'rejected').length
  );

  // History computed properties
  const filteredHistoryRequests = computed(() => {
    let filtered = [...allHistoryRequests.value];

    // Apply date range filter
    if (historyFilters.value.dateRange !== 'all') {
      const now = new Date();
      let startDate;

      switch (historyFilters.value.dateRange) {
        case 'today':
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'custom_month': {
          const [yStr, mStr] = (historyCustomMonth.value || '').split('-');
          const y = parseInt(yStr);
          const m = parseInt(mStr);
          if (!isNaN(y) && !isNaN(m)) {
            startDate = new Date(y, m - 1, 1);
          } else {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          }
          break;
        }
        default:
          startDate = null;
      }

      if (startDate) {
        filtered = filtered.filter((req) => {
          const completionDate = new Date(getCompletionDate(req));
          if (historyFilters.value.dateRange === 'custom_month') {
            // End at last day of selected month
            const [yStr, mStr] = (historyCustomMonth.value || '').split('-');
            const y = parseInt(yStr);
            const m = parseInt(mStr);
            const endDate =
              !isNaN(y) && !isNaN(m)
                ? new Date(y, m, 0, 23, 59, 59, 999)
                : new Date(
                    now.getFullYear(),
                    now.getMonth() + 1,
                    0,
                    23,
                    59,
                    59,
                    999
                  );
            return completionDate >= startDate && completionDate <= endDate;
          }
          return completionDate >= startDate;
        });
      }
    }

    // Apply status filter
    if (historyFilters.value.status) {
      filtered = filtered.filter(
        (req) => req.status === historyFilters.value.status
      );
    }

    // Apply branch filter
    if (historyFilters.value.branch_id) {
      filtered = filtered.filter(
        (req) => req.branch_id === parseInt(historyFilters.value.branch_id)
      );
    }

    // Apply search filter
    if (historyFilters.value.search) {
      const searchTerm = historyFilters.value.search.toLowerCase();
      filtered = filtered.filter(
        (req) =>
          `${req.first_name} ${req.last_name}`
            .toLowerCase()
            .includes(searchTerm) ||
          req.employee_code.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  });

  const paginatedHistoryRequests = computed(() => {
    const start = (currentHistoryPage.value - 1) * historyItemsPerPage.value;
    const end = start + historyItemsPerPage.value;
    return filteredHistoryRequests.value.slice(start, end);
  });

  const totalHistoryPages = computed(() => {
    return Math.max(
      1,
      Math.ceil(
        filteredHistoryRequests.value.length / historyItemsPerPage.value
      )
    );
  });

  const hasActiveHistoryFilters = computed(() => {
    return (
      historyFilters.value.dateRange !== 'today' ||
      historyFilters.value.status ||
      historyFilters.value.branch_id ||
      historyFilters.value.search
    );
  });

  // Error handling methods
  const handleApprovalError = (error) => {
    const errorMessage = error.response?.data?.message || error.message || '';
    const errorCode = error.response?.data?.code || '';

    if (
      errorCode === 'SELF_APPROVAL_NOT_ALLOWED' ||
      errorMessage.includes('cannot approve your own leave request')
    ) {
      showError(
        'You cannot approve your own leave request. Please have another manager or HR staff member handle this approval.',
        'Self-Approval Not Allowed'
      );
    } else if (errorMessage.includes('Leave request is already')) {
      showError(
        'This leave request has already been processed. Please refresh the page to see the latest status.',
        'Request Already Processed'
      );
    } else if (errorMessage.includes('Leave request not found')) {
      showError(
        'The leave request could not be found. It may have been deleted or the ID is invalid.',
        'Request Not Found'
      );
    } else if (
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden')
    ) {
      showError(
        'You do not have permission to approve this leave request. Please contact your administrator.',
        'Permission Denied'
      );
    } else if (
      errorMessage.includes('Network Error') ||
      errorMessage.includes('timeout')
    ) {
      showError(
        'Unable to connect to the server. Please check your internet connection and try again.',
        'Connection Error'
      );
    } else {
      showError(
        errorMessage ||
          'An unexpected error occurred while approving the leave request. Please try again.',
        'Approval Failed'
      );
    }
  };

  const handleRejectionError = (error) => {
    const errorMessage = error.response?.data?.message || error.message || '';
    const errorCode = error.response?.data?.code || '';

    if (
      errorCode === 'SELF_REJECTION_NOT_ALLOWED' ||
      errorMessage.includes('cannot reject your own leave request')
    ) {
      showError(
        'You cannot reject your own leave request. Please have another manager or HR staff member handle this rejection.',
        'Self-Rejection Not Allowed'
      );
    } else if (errorMessage.includes('Leave request is already')) {
      showError(
        'This leave request has already been processed. Please refresh the page to see the latest status.',
        'Request Already Processed'
      );
    } else if (errorMessage.includes('Leave request not found')) {
      showError(
        'The leave request could not be found. It may have been deleted or the ID is invalid.',
        'Request Not Found'
      );
    } else if (
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden')
    ) {
      showError(
        'You do not have permission to reject this leave request. Please contact your administrator.',
        'Permission Denied'
      );
    } else if (
      errorMessage.includes('Network Error') ||
      errorMessage.includes('timeout')
    ) {
      showError(
        'Unable to connect to the server. Please check your internet connection and try again.',
        'Connection Error'
      );
    } else {
      showError(
        errorMessage ||
          'An unexpected error occurred while rejecting the leave request. Please try again.',
        'Rejection Failed'
      );
    }
  };

  // Methods
  const fetchLeaveRequests = async () => {
    try {
      loading.value = true;

      // Fetch both branch employee requests (manager approved) and department employee requests (pending)
      await Promise.all([
        leaveStore.fetchPendingHRApprovals(),
        leaveStore.fetchDepartmentEmployeeRequests(),
      ]);

      // Combine both types of requests
      const branchRequests = leaveStore.pendingHRApprovals || [];
      const departmentRequests = leaveStore.departmentEmployeeRequests || [];

      allLeaveRequests.value = [...branchRequests, ...departmentRequests];
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      showError(
        'Unable to load leave requests. Please check your connection and try again.',
        'Loading Failed'
      );
    } finally {
      loading.value = false;
    }
  };

  const fetchDepartments = async () => {
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
        // Extract unique department names from the API response, excluding Admin and normalizing duplicates
        const departmentSet = new Set();
        const departmentMapping = {
          SCM: 'Supply Chain',
          CRM: 'Customer Relationship',
        };

        Object.keys(data.data).forEach((dept) => {
          if (dept !== 'Admin') {
            // Use normalized name if mapping exists, otherwise use original name
            const normalizedDept = departmentMapping[dept] || dept;
            departmentSet.add(normalizedDept);
          }
        });
        departments.value = Array.from(departmentSet).sort();
      } else {
        throw new Error(data.message || 'Failed to fetch departments');
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      showError(
        'Unable to load department list. Using default departments.',
        'Department Loading Failed'
      );
      // Fallback to basic departments if API fails (excluding Admin)
      departments.value = [
        'Human Resource',
        'Finance',
        'Supply Chain',
        'Production',
        'Customer Relationship',
        'Branch',
      ];
    }
  };

  const refreshData = async () => {
    await Promise.all([
      fetchLeaveRequests(),
      fetchDepartments(),
      branchStore.fetchActiveBranches(),
    ]);
    lastUpdated.value = new Date();
  };

  // History methods
  const fetchHistoryRequests = async () => {
    try {
      historyLoading.value = true;

      // Fetch completed/approved leave requests using the store
      const result = await leaveStore.fetchLeaveHistory({
        page: currentHistoryPage.value,
        limit: historyItemsPerPage.value,
        status: historyFilters.value.status,
        branch_id: historyFilters.value.branch_id,
      });

      allHistoryRequests.value = result.data || [];
    } catch (error) {
      console.error('Error fetching leave history:', error);
      showError(
        'Unable to load leave history. Please check your connection and try again.',
        'History Loading Failed'
      );
    } finally {
      historyLoading.value = false;
    }
  };

  const refreshHistoryData = async () => {
    await fetchHistoryRequests();
  };

  const applyHistoryFilters = () => {
    currentHistoryPage.value = 1; // Reset to first page when filtering
  };

  const getCompletionDate = (request) => {
    // Return the most recent completion date (HR approval, manager approval, or rejection)
    if (request.hr_approved_at) return request.hr_approved_at;
    if (request.manager_approved_at) return request.manager_approved_at;
    if (request.rejected_at) return request.rejected_at;
    return request.created_at; // Fallback to creation date
  };

  const exportHistoryToCSV = () => {
    const csvContent = generateHistoryCSV(filteredHistoryRequests.value);
    downloadCSV(csvContent, 'leave_history.csv');
  };

  const generateHistoryCSV = (data) => {
    const headers = [
      'Employee Name',
      'Employee ID',
      'Department',
      'Branch',
      'Leave Type',
      'Uses SIL',
      'SIL Days',
      'From Date',
      'To Date',
      'Days',
      'Status',
      'Reason',
      'Completed Date',
    ];

    const rows = data.map((request) => [
      `"${request.first_name} ${request.last_name}"`,
      `"${request.employee_code}"`,
      `"${request.department || 'N/A'}"`,
      `"${getBranchName(request.branch_id)}"`,
      `"${request.leave_type}"`,
      request.use_sil ? 'Yes' : 'No',
      request.sil_days || 0,
      `"${formatDate(request.from_date)}"`,
      `"${formatDate(request.to_date)}"`,
      calculateDays(request.from_date, request.to_date),
      `"${getStatusDisplayText(request.status, request)}"`,
      `"${request.reason}"`,
      `"${formatDateTime(getCompletionDate(request))}"`,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  };

  const applyFilters = () => {
    currentPage.value = 1; // Reset to first page when filtering
  };

  const clearFilters = () => {
    filters.value = {
      status: '',
      branch_id: '',
      department: '',
      search: '',
    };
    currentPage.value = 1;
  };

  const viewLeaveRequest = (request) => {
    selectedRequest.value = request;
    showViewModal.value = true;
  };

  const closeViewModal = () => {
    showViewModal.value = false;
    selectedRequest.value = null;
  };

  const canApprove = (request) => {
    if (!request || !currentUser.value) return false;

    // Prevent self-approval - user cannot approve their own request
    if (request.employee_id === currentUser.value.id) return false;

    // HR can approve after manager approval OR department employees with pending status
    return (
      request.status === 'approved_by_manager' ||
      (request.status === 'pending' && !request.branch_id)
    );
  };

  const canReject = (request) => {
    if (!request || !currentUser.value) return false;

    // Prevent self-rejection - user cannot reject their own request
    if (request.employee_id === currentUser.value.id) return false;

    return ['pending', 'approved_by_manager'].includes(request.status);
  };

  const approveLeaveRequest = (request) => {
    // Double-check the request status before opening approval modal
    if (!canApprove(request)) {
      showError('This leave request cannot be approved in its current status');
      return;
    }

    selectedRequest.value = request;
    approvalNotes.value = '';
    showApprovalModal.value = true;
  };

  const closeApprovalModal = () => {
    showApprovalModal.value = false;
    selectedRequest.value = null;
    approvalNotes.value = '';
  };

  const confirmApproval = async () => {
    if (!selectedRequest.value) return;

    // Double-check the request status before attempting approval
    if (!canApprove(selectedRequest.value)) {
      showError('This leave request cannot be approved in its current status');
      closeApprovalModal();
      return;
    }

    let loadingToast;
    try {
      isProcessing.value = true;

      // Show loading toast
      loadingToast = showLoading(
        'Processing approval...',
        'Approving Leave Request'
      );

      // For department employees (no branch_id), use HR approval directly
      // For branch employees, use manager approval first, then HR approval
      if (selectedRequest.value.status === 'approved_by_manager') {
        // Branch employee - already approved by manager, now HR approval
        await leaveStore.approveByHR(
          selectedRequest.value.id,
          approvalNotes.value
        );
        showSuccess(
          `Leave request for ${selectedRequest.value.first_name} ${selectedRequest.value.last_name} has been approved by HR.`,
          'HR Approval Successful'
        );
      } else if (!selectedRequest.value.branch_id) {
        // Department employee - direct HR approval (single approval)
        await leaveStore.approveByHR(
          selectedRequest.value.id,
          approvalNotes.value
        );
        showSuccess(
          `Leave request for ${selectedRequest.value.first_name} ${selectedRequest.value.last_name} has been approved by HR.`,
          'HR Approval Successful'
        );
      } else {
        // Branch employee - manager approval first
        await leaveStore.approveByManager(
          selectedRequest.value.id,
          approvalNotes.value
        );
        showSuccess(
          `Leave request for ${selectedRequest.value.first_name} ${selectedRequest.value.last_name} has been approved by manager.`,
          'Manager Approval Successful'
        );
      }

      closeApprovalModal();
      await fetchLeaveRequests();
    } catch (error) {
      console.error('Error approving leave request:', error);
      handleApprovalError(error);
    } finally {
      // Dismiss loading toast
      if (loadingToast) {
        dismiss(loadingToast);
      }
      isProcessing.value = false;
    }
  };

  const rejectLeaveRequest = (request) => {
    // Double-check the request status before opening rejection modal
    if (!canReject(request)) {
      showError('This leave request cannot be rejected in its current status');
      return;
    }

    selectedRequest.value = request;
    rejectionReason.value = '';
    showRejectionModal.value = true;
  };

  const closeRejectionModal = () => {
    showRejectionModal.value = false;
    selectedRequest.value = null;
    rejectionReason.value = '';
  };

  const confirmRejection = async () => {
    if (!selectedRequest.value || !rejectionReason.value.trim()) return;

    // Double-check the request status before attempting rejection
    if (!canReject(selectedRequest.value)) {
      showError('This leave request cannot be rejected in its current status');
      closeRejectionModal();
      return;
    }

    let loadingToast;
    try {
      isProcessing.value = true;

      // Show loading toast
      loadingToast = showLoading(
        'Processing rejection...',
        'Rejecting Leave Request'
      );

      await leaveStore.rejectLeaveRequest(
        selectedRequest.value.id,
        rejectionReason.value
      );
      showSuccess(
        `Leave request for ${selectedRequest.value.first_name} ${selectedRequest.value.last_name} has been rejected.`,
        'Leave Request Rejected'
      );

      closeRejectionModal();
      await fetchLeaveRequests();
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      handleRejectionError(error);
    } finally {
      // Dismiss loading toast
      if (loadingToast) {
        dismiss(loadingToast);
      }
      isProcessing.value = false;
    }
  };

  const exportToCSV = () => {
    const csvContent = generateCSV(filteredLeaveRequests.value);
    downloadCSV(csvContent, 'leave_requests.csv');
  };

  const generateCSV = (data) => {
    const headers = [
      'Employee Name',
      'Employee ID',
      'Department',
      'Branch',
      'Leave Type',
      'Uses SIL',
      'SIL Days',
      'From Date',
      'To Date',
      'Days',
      'Status',
      'Reason',
      'Submitted Date',
    ];

    const rows = data.map((request) => [
      `"${request.first_name} ${request.last_name}"`,
      `"${request.employee_code}"`,
      `"${request.department || 'N/A'}"`,
      `"${getBranchName(request.branch_id)}"`,
      `"${request.leave_type}"`,
      request.use_sil ? 'Yes' : 'No',
      request.sil_days || 0,
      `"${formatDate(request.from_date)}"`,
      `"${formatDate(request.to_date)}"`,
      calculateDays(request.from_date, request.to_date),
      `"${getStatusDisplayText(request.status, request)}"`,
      `"${request.reason}"`,
      `"${formatDateTime(request.created_at)}"`,
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Utility functions
  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getBranchName = (branchId) => {
    if (!branchId || !activeBranches.value.length) return 'N/A';
    const branch = activeBranches.value.find((b) => b.id === branchId);
    return branch ? branch.name : 'N/A';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDays = (fromDate, toDate) => {
    if (!fromDate || !toDate) return 0;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const getStatusBadgeClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'approved_by_hr':
        return 'bg-success/10 text-success';
      case 'approved_by_manager':
        return 'bg-info/10 text-info';
      case 'rejected':
        return 'bg-error/10 text-error';
      case 'pending':
      default:
        return 'bg-warning/10 text-warning';
    }
  };

  const getStatusDisplayText = (status, request = null) => {
    switch ((status || '').toLowerCase()) {
      case 'approved_by_hr':
        return 'Approved';
      case 'approved_by_manager':
        // Check if this is an HR staff member's request
        if (request && request.department === 'Human Resource') {
          return 'Pending Board Approval';
        }
        return 'Pending HR';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        // Check if this is an HR staff member's request
        if (request && request.department === 'Human Resource') {
          return 'Pending Board Approval';
        }
        // Department employees (no branch_id) with pending status go directly to HR (single approval)
        if (request && !request.branch_id) {
          return 'Pending HR Approval';
        }
        return 'Pending Manager';
      default:
        return 'Pending Manager';
    }
  };

  // Watchers
  watch(
    () => filters.value,
    () => {
      applyFilters();
    },
    { deep: true }
  );

  // Watch for tab changes to load data when needed
  watch(activeTab, (newTab) => {
    if (newTab === 'history' && allHistoryRequests.value.length === 0) {
      fetchHistoryRequests();
    }
  });

  // Lifecycle
  onMounted(() => {
    refreshData();
    // Only fetch history if history tab is active by default
    if (activeTab.value === 'history') {
      fetchHistoryRequests();
    }
  });
</script>

<style scoped>
  /* Custom styles if needed */
</style>
