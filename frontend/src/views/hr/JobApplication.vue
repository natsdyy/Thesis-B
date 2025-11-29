<template>
  <div class="job-application-management">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <FileUser class="title-icon" />
          Job Application Management
        </h1>
        <p class="page-subtitle">
          Manage job applications, interviews, and hiring process
        </p>
      </div>
    </div>

    <!-- Tab System -->
    <div
      class="card bg-accentColor shadow-xl mb-6 border border-black/10 mx-auto"
    >
      <div class="card-body p-0">
        <!-- Tab Navigation -->
        <div
          class="tabs tabs-boxed bg-white/5 p-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <div
            class="flex items-center gap-1 overflow-x-auto whitespace-nowrap no-scrollbar w-full sm:w-auto"
          >
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="handleTabClick(tab.id)"
              class="tab tab-lg font-medium flex-shrink-0"
              :class="{
                'tab-active text-black': activeTab === tab.id,
                'text-black/70 hover:bg-white/10': activeTab !== tab.id,
              }"
            >
              <component :is="tab.icon" class="w-4 h-4 mr-2" />
              {{ tab.name }}
              <span
                v-if="tab.id === 'new-applications' && newApplicationsCount > 0"
                class="badge bg-warning/10 text-orange-600 ml-2 badge-sm"
              >
                {{ newApplicationsCount }}
              </span>
            </button>
          </div>
          <button
            @click="reviewOnboarding"
            class="btn btn-sm bg-primaryColor text-white hover:bg-primaryColor/90 !font-thin w-full sm:w-auto"
          >
            <FileCheck class="w-4 h-4" />
            Review Onboarding
          </button>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
          <!-- New Applications Tab -->
          <div v-if="activeTab === 'new-applications'">
            <!-- Stats -->
            <div
              class="stats shadow w-full mb-6 bg-accentColor border border-black/10 stats-vertical lg:stats-horizontal rounded-lg"
            >
              <div
                @click="applyNewApplicationsStatFilter('new')"
                class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10 cursor-pointer"
              >
                <div class="stat-figure">
                  <Inbox class="w-8 h-8 text-warning" />
                </div>
                <div class="stat-title text-black/50">New Applications</div>
                <div class="stat-value text-warning">
                  {{ newApplicationsCount }}
                </div>
                <div class="stat-desc text-black/50">Awaiting review</div>
              </div>

              <div
                @click="applyNewApplicationsStatFilter('pending-review')"
                class="stat sm:!border sm:!border-l-0 sm:!border-r-2 sm:!border-t-0 sm:!border-b-0 sm:!border-black/10 sm:border-dashed hover:bg-secondaryColor/10 cursor-pointer"
              >
                <div class="stat-figure">
                  <Clock class="w-8 h-8 text-info" />
                </div>
                <div class="stat-title text-black/50">Pending Review</div>
                <div class="stat-value text-info">{{ pendingReviewCount }}</div>
                <div class="stat-desc text-black/50">Under evaluation</div>
              </div>
            </div>

            <!-- Search and Filters -->
            <div class="mb-6">
              <!-- Search Bar -->
              <div class="mb-4">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search applications..."
                  class="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg"
                />
              </div>

              <!-- Filters -->
              <div
                class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center"
              >
                <div class="flex items-center gap-2 text-sm">
                  <div class="flex items-center gap-2">
                    <Filter class="w-4 h-4 text-gray-600" />
                    <span class="text-gray-600"
                      >Showing
                      {{ getFilteredApplicationsCount() }} applications</span
                    >
                  </div>
                </div>

                <div
                  class="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 sm:gap-3 items-center w-full sm:w-auto"
                >
                  <input
                    v-model="statusFilter"
                    type="text"
                    placeholder="Status filter"
                    class="px-3 py-2 bg-white border border-gray-200 rounded-lg w-full"
                  />

                  <input
                    v-model="positionFilter"
                    type="text"
                    placeholder="Position filter"
                    class="px-3 py-2 bg-white border border-gray-200 rounded-lg w-full"
                  />

                  <button
                    @click="clearFilters"
                    class="btn btn-sm w-full sm:w-auto"
                  >
                    <X class="w-4 h-4 inline mr-1" />
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <!-- Applications List (responsive like MainInventory list) -->
            <div
              id="applications-list"
              class="bg-white rounded-lg shadow overflow-hidden mb-6"
            >
              <div class="overflow-x-auto">
                <!-- Mobile Card Layout -->
                <div class="block sm:hidden space-y-3 p-4">
                  <div
                    v-for="application in paginatedApplications"
                    :key="application.id"
                    class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div class="flex items-start gap-3">
                      <div class="flex-1 min-w-0">
                        <h3
                          class="text-sm font-medium text-gray-900 break-words"
                        >
                          {{ application.applicant_name }}
                        </h3>
                        <p class="text-xs text-gray-500 break-all">
                          {{ application.email }}
                        </p>

                        <!-- Details grid -->
                        <div class="mt-2 grid grid-cols-2 gap-y-1 text-xs">
                          <span class="text-gray-600">Position</span>
                          <span class="font-medium text-right break-words">{{
                            application.position_title || 'N/A'
                          }}</span>

                          <span class="text-gray-600">Department</span>
                          <span class="font-medium text-right break-words">{{
                            formatDepartment(application)
                          }}</span>

                          <span class="text-gray-600">Applied</span>
                          <span class="font-medium text-right">{{
                            formatDate(application.applied_date)
                          }}</span>

                          <span class="text-gray-600">Status</span>
                          <span class="text-right">
                            <span
                              class="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                              :class="
                                application.status === 'new'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-700'
                              "
                            >
                              {{ application.status }}
                            </span>
                          </span>
                        </div>

                        <!-- Actions (icon-only like desktop) -->
                        <div class="mt-3 flex justify-end items-center gap-2">
                          <button
                            title="View Application Details"
                            @click="viewApplication(application)"
                            class="btn btn-xs text-xs border-none bg-accentColor cursor-pointer"
                          >
                            <Eye class="w-4 h-4" />
                          </button>
                          <button
                            v-if="
                              !hasScheduledInterview(application.id) &&
                              application.status !== 'interview-scheduled'
                            "
                            title="Set Interview Date"
                            @click="setInterviewDate(application)"
                            class="btn btn-xs text-xs border-none bg-accentColor cursor-pointer"
                          >
                            <Calendar class="w-4 h-4" />
                          </button>
                          <button
                            v-else
                            disabled
                            title="Interview Scheduled"
                            class="btn btn-xs text-xs border-none bg-accentColor opacity-60 cursor-not-allowed"
                          >
                            <Calendar class="w-4 h-4" />
                          </button>
                          <button
                            title="Reject Application"
                            @click="rejectApplication(application)"
                            class="btn btn-xs text-xs border-none bg-accentColor cursor-pointer"
                          >
                            <Trash2 class="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Desktop Table Layout -->
                <table
                  class="min-w-full divide-y divide-gray-200 hidden sm:table"
                >
                  <thead class="bg-gray-50">
                    <tr>
                      <th
                        class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Applicant
                      </th>
                      <th
                        class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Email
                      </th>
                      <th
                        class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Position
                      </th>
                      <th
                        class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell"
                      >
                        Department
                      </th>

                      <th
                        class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Applied
                      </th>
                      <th
                        class="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        class="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr
                      v-for="application in paginatedApplications"
                      :key="application.id"
                      class="hover:bg-gray-50"
                    >
                      <td class="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                          <div class="sm:ml-4">
                            <div class="text-sm font-medium text-gray-900">
                              {{ application.applicant_name }}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                      >
                        {{ application.email }}
                      </td>
                      <td
                        class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                      >
                        {{ application.position_title || 'N/A' }}
                      </td>
                      <td
                        class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700 hidden md:table-cell"
                      >
                        {{ formatDepartment(application) }}
                      </td>

                      <td
                        class="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                      >
                        {{ formatDate(application.applied_date) }}
                      </td>
                      <td class="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          class="px-2 py-1 rounded-full text-xs font-medium"
                          :class="
                            application.status === 'new'
                              ? 'badge bg-success/10 text-green-800'
                              : 'badge bg-gray-100 text-gray-700'
                          "
                        >
                          {{ application.status }}
                        </span>
                      </td>
                      <td
                        class="px-3 sm:px-6 py-4 whitespace-nowrap text-right"
                      >
                        <div class="flex justify-end items-center gap-2">
                          <button
                            title="View Application Details"
                            @click="viewApplication(application)"
                            class="btn btn-xs text-xs border-none bg-accentColor cursor-pointer"
                          >
                            <Eye class="w-4 h-4" />
                          </button>
                          <button
                            tilte="Set Interview Date"
                            v-if="
                              !hasScheduledInterview(application.id) &&
                              application.status !== 'interview-scheduled'
                            "
                            @click="setInterviewDate(application)"
                            class="btn btn-xs text-xs border-none bg-accentColor cursor-pointer"
                          >
                            <Calendar class="w-4 h-4" />
                          </button>
                          <button
                            title="Reject Application"
                            @click="rejectApplication(application)"
                            class="btn btn-xs text-xs border-none bg-accentColor cursor-pointer"
                          >
                            <Trash2 class="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Pagination -->
            <div
              class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-8"
            >
              <div class="text-sm text-gray-600">
                Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
                {{
                  Math.min(
                    currentPage * itemsPerPage,
                    getFilteredApplicationsCount()
                  )
                }}
                of {{ getFilteredApplicationsCount() }} applications
              </div>
              <div class="flex gap-2 flex-wrap w-full sm:w-auto">
                <button
                  @click="currentPage = 1"
                  :disabled="currentPage === 1"
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 w-full sm:w-auto"
                >
                  First
                </button>
                <button
                  @click="currentPage = Math.max(1, currentPage - 1)"
                  :disabled="currentPage === 1"
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 w-full sm:w-auto"
                >
                  Previous
                </button>

                <button
                  v-for="page in visiblePages"
                  :key="page"
                  @click="currentPage = page"
                  :class="[
                    'px-3 py-2 text-sm font-medium rounded-lg',
                    page === currentPage
                      ? 'bg-green-600 text-white'
                      : 'text-gray-700 bg-gray-100 hover:bg-gray-200',
                  ]"
                  class="w-full sm:w-auto"
                >
                  {{ page }}
                </button>

                <button
                  @click="currentPage = Math.min(totalPages, currentPage + 1)"
                  :disabled="currentPage === totalPages"
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 w-full sm:w-auto"
                >
                  Next
                </button>
                <button
                  @click="currentPage = totalPages"
                  :disabled="currentPage === totalPages"
                  class="px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 w-full sm:w-auto"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Interview Schedule Tab -->
      <div v-if="activeTab === 'interview-schedule'" class="tab-panel">
        <div class="panel-header">
          <h3>
            <font-awesome-icon icon="fa-regular fa-calendar" class="mr-2" />
            Interview Schedule
          </h3>
          <p>Manage scheduled interviews and conduct interview evaluations</p>
        </div>
        <div class="content-section">
          <div class="calendar-container">
            <div class="calendar-header">
              <h4>Scheduled Interviews</h4>
              <div class="calendar-controls">
                <label class="sr-only" for="interview-filter-select"
                  >Filter</label
                >
                <select
                  id="interview-filter-select"
                  v-model="interviewFilter"
                  class="select select-bordered select-sm w-full sm:w-52"
                >
                  <option value="all">All</option>
                  <option value="today">Today</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                </select>
              </div>
            </div>

            <!-- Loading State -->
            <div v-if="isLoadingInterviews" class="loading-container">
              <div class="loading loading-spinner loading-lg"></div>
              <span class="loading-text">Loading interviews...</span>
            </div>

            <!-- Interviews List -->
            <div
              v-else-if="filteredInterviews.length > 0"
              class="interview-list"
            >
              <!-- Grouped by Date (for "All", "Today", "This Week", and "This Month" filters) -->
              <template
                v-if="
                  (interviewFilter === 'all' ||
                    interviewFilter === 'today' ||
                    interviewFilter === 'this-week' ||
                    interviewFilter === 'this-month') &&
                  groupedInterviewsByDate &&
                  sortedDateKeys.length > 0
                "
              >
                <!-- Date Navigation Controls -->
                <div class="date-navigation">
                  <button
                    @click="prevDateGroup"
                    :disabled="!canGoPrev"
                    class="btn btn-outline btn-sm date-nav-btn"
                    title="Previous date"
                  >
                    <ChevronLeft class="w-4 h-4 mr-1" />
                    Previous
                  </button>
                  <div class="date-nav-info">
                    <span class="date-nav-counter">
                      Date {{ currentDateGroupIndex + 1 }} of
                      {{ sortedDateKeys.length }}
                    </span>
                  </div>
                  <button
                    @click="nextDateGroup"
                    :disabled="!canGoNext"
                    class="btn btn-outline btn-sm date-nav-btn"
                    title="Next date"
                  >
                    Next
                    <ChevronRight class="w-4 h-4 ml-1" />
                  </button>
                </div>

                <!-- Current Date Group -->
                <div
                  v-for="(dateGroup, date) in paginatedDateGroups"
                  :key="date"
                  class="interview-date-group"
                >
                  <div class="date-header">
                    <Calendar class="w-5 h-5 mr-2" />
                    <h5 class="date-title">{{ date }}</h5>
                    <span class="date-count"
                      >({{ dateGroup.length }} interview{{
                        dateGroup.length !== 1 ? 's' : ''
                      }})</span
                    >
                  </div>
                  <div
                    v-for="interview in dateGroup"
                    :key="interview.id"
                    class="interview-item"
                  >
                    <div class="interview-time">
                      <div class="time">
                        {{ formatTime(interview.interview_time) }}
                      </div>
                      <div class="date">
                        {{ formatDate(interview.interview_date) }}
                      </div>
                    </div>
                    <div class="interview-details">
                      <div class="candidate-name">
                        {{ interview.applicant_name }}
                      </div>
                      <div class="position">{{ interview.position_title }}</div>
                      <div class="department">
                        {{ formatDepartment(interview) }}
                      </div>
                      <div v-if="interview.location" class="location">
                        <MapPin class="w-4 h-4 inline mr-1" />
                        {{ interview.location }}
                      </div>
                      <div v-if="interview.meeting_link" class="meeting-link">
                        <a
                          :href="interview.meeting_link"
                          target="_blank"
                          class="text-blue-600 hover:text-blue-800"
                        >
                          <svg
                            class="w-4 h-4 inline mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            ></path>
                          </svg>
                          Join Meeting
                        </a>
                      </div>
                    </div>
                    <div class="interview-meta">
                      <span
                        :class="[
                          'interview-type',
                          interview.interview_type === 'in-person'
                            ? 'type-in-person'
                            : interview.interview_type === 'video'
                              ? 'type-video'
                              : 'type-phone',
                        ]"
                      >
                        {{
                          interview.interview_type === 'in-person'
                            ? 'In-Person'
                            : interview.interview_type === 'video'
                              ? 'Video Call'
                              : 'Phone Call'
                        }}
                      </span>
                      <span
                        v-if="
                          !(
                            interview.status === 'completed' &&
                            (interview.result === 'passed' ||
                              interview.result === 'failed')
                          )
                        "
                        :class="[
                          'interview-status',
                          interview.status === 'scheduled'
                            ? 'status-scheduled'
                            : interview.status === 'completed'
                              ? 'status-completed'
                              : interview.status === 'cancelled'
                                ? 'status-cancelled'
                                : 'status-rescheduled',
                        ]"
                      >
                        {{
                          interview.status.charAt(0).toUpperCase() +
                          interview.status.slice(1)
                        }}
                      </span>
                    </div>
                    <div class="interview-actions">
                      <!-- Completed Interview Status -->
                      <div
                        v-if="interview.status === 'completed'"
                        class="completed-status"
                      >
                        <span
                          v-if="interview.result === 'passed'"
                          class="badge badge-success"
                        >
                          <CheckCircle class="w-4 h-4 mr-1" />
                          Interview Done
                        </span>
                        <span
                          v-else-if="interview.result === 'failed'"
                          class="badge badge-error"
                        >
                          <X class="w-4 h-4 mr-1" />
                          Interview Failed
                        </span>
                        <span v-else class="badge badge-info">
                          <CheckCircle class="w-4 h-4 mr-1" />
                          Interview Completed
                        </span>
                      </div>
                      <!-- Other Actions -->
                      <div class="other-actions">
                        <button
                          @click="viewInterviewDetails(interview)"
                          class="btn btn-sm"
                          title="View Details"
                        >
                          <Eye class="w-4 h-4" />
                        </button>
                        <button
                          @click="cancelInterview(interview)"
                          class="btn btn-sm text-red-600 hover:text-red-800"
                          title="Delete Interview"
                        >
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Not Grouped (for other filters) - This should not appear now since all filters use grouping -->
              <template v-else>
                <div
                  v-for="interview in filteredInterviews"
                  :key="interview.id"
                  class="interview-item"
                >
                  <div class="interview-time">
                    <div class="time">
                      {{ formatTime(interview.interview_time) }}
                    </div>
                    <div class="date">
                      {{ formatDate(interview.interview_date) }}
                    </div>
                  </div>
                  <div class="interview-details">
                    <div class="candidate-name">
                      {{ interview.applicant_name }}
                    </div>
                    <div class="position">{{ interview.position_title }}</div>
                    <div class="department">
                      {{ formatDepartment(interview) }}
                    </div>
                    <div v-if="interview.location" class="location">
                      <MapPin class="w-4 h-4 inline mr-1" />
                      {{ interview.location }}
                    </div>
                    <div v-if="interview.meeting_link" class="meeting-link">
                      <a
                        :href="interview.meeting_link"
                        target="_blank"
                        class="text-blue-600 hover:text-blue-800"
                      >
                        <svg
                          class="w-4 h-4 inline mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          ></path>
                        </svg>
                        Join Meeting
                      </a>
                    </div>
                  </div>
                  <div class="interview-meta">
                    <span
                      :class="[
                        'interview-type',
                        interview.interview_type === 'in-person'
                          ? 'type-in-person'
                          : interview.interview_type === 'video'
                            ? 'type-video'
                            : 'type-phone',
                      ]"
                    >
                      {{
                        interview.interview_type === 'in-person'
                          ? 'In-Person'
                          : interview.interview_type === 'video'
                            ? 'Video Call'
                            : 'Phone Call'
                      }}
                    </span>
                    <span
                      v-if="
                        !(
                          interview.status === 'completed' &&
                          (interview.result === 'passed' ||
                            interview.result === 'failed')
                        )
                      "
                      :class="[
                        'interview-status',
                        interview.status === 'scheduled'
                          ? 'status-scheduled'
                          : interview.status === 'completed'
                            ? 'status-completed'
                            : interview.status === 'cancelled'
                              ? 'status-cancelled'
                              : 'status-rescheduled',
                      ]"
                    >
                      {{
                        interview.status.charAt(0).toUpperCase() +
                        interview.status.slice(1)
                      }}
                    </span>
                  </div>
                  <div class="interview-actions">
                    <!-- Completed Interview Status -->
                    <div
                      v-if="interview.status === 'completed'"
                      class="completed-status"
                    >
                      <span
                        v-if="interview.result === 'passed'"
                        class="badge badge-success"
                      >
                        <CheckCircle class="w-4 h-4 mr-1" />
                        Interview Done
                      </span>
                      <span
                        v-else-if="interview.result === 'failed'"
                        class="badge badge-error"
                      >
                        <X class="w-4 h-4 mr-1" />
                        Interview Failed
                      </span>
                      <span v-else class="badge badge-info">
                        <CheckCircle class="w-4 h-4 mr-1" />
                        Interview Completed
                      </span>
                    </div>
                    <!-- Other Actions -->
                    <div class="other-actions">
                      <button
                        @click="viewInterviewDetails(interview)"
                        class="btn btn-outline btn-sm"
                        title="View Details"
                      >
                        <Eye class="w-4 h-4" />
                      </button>
                      <button
                        @click="cancelInterview(interview)"
                        class="btn btn-outline btn-sm text-red-600 hover:text-red-800"
                        title="Delete Interview"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <!-- Empty State -->
            <div v-else class="empty-state">
              <font-awesome-icon
                icon="fa-regular fa-calendar"
                class="!w-15 !h-15"
              />
              <h4>No Interviews Found</h4>
              <p v-if="interviewFilter === 'all'">
                No interviews have been scheduled yet.
              </p>
              <p v-else>No interviews found for the selected filter.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Job Hiring Tab -->
      <div v-if="activeTab === 'job-hiring'" class="tab-panel">
        <div class="panel-header">
          <h3>
            <font-awesome-icon icon="fa-solid fa-suitcase" class="mr-2" /> Job
            Hiring
          </h3>
          <p>Manage candidates after interviews - Hire or Reject applicants</p>
        </div>
        <div class="content-section">
          <!-- Loading State -->
          <div v-if="isLoadingInterviews" class="loading-container">
            <div class="loading loading-spinner loading-lg"></div>
            <span class="loading-text">Loading candidates...</span>
          </div>

          <!-- Candidates List (completed or past-due interviews) -->
          <div v-else-if="hiringCandidates.length > 0" class="interview-list">
            <div
              v-for="candidate in hiringCandidates"
              :key="candidate.id"
              class="interview-item"
            >
              <div class="interview-time">
                <div class="time">
                  {{ formatTime(candidate.interview_time) }}
                </div>
                <div class="date">
                  {{ formatDate(candidate.interview_date) }}
                </div>
              </div>
              <div class="interview-details">
                <div class="candidate-name">{{ candidate.applicant_name }}</div>
                <div class="position">{{ candidate.position_title }}</div>
                <div class="department">{{ candidate.department }}</div>
                <div v-if="candidate.location" class="location">
                  <MapPin class="w-4 h-4 inline mr-1" />
                  {{ candidate.location }}
                </div>
              </div>
              <div class="interview-meta">
                <span
                  v-if="candidate.result === 'passed'"
                  class="badge badge-success text-green-800"
                >
                  <CheckCircle class="w-4 h-4 mr-1" />
                  Interview Passed
                </span>
                <span
                  v-else-if="candidate.result === 'failed'"
                  class="badge badge-error/10 text-red-800"
                >
                  <X class="w-4 h-4 mr-1" />
                  Interview Failed
                </span>
                <span v-else class="badge bg-info/10 text-blue-800">
                  <Clock class="w-4 h-4 mr-1" />
                  {{
                    candidate.status === 'completed'
                      ? 'Interview Completed'
                      : 'Awaiting Completion'
                  }}
                </span>
              </div>
              <div class="interview-actions">
                <div class="hiring-buttons">
                  <button
                    v-if="
                      candidate._pastDue && candidate.status !== 'completed'
                    "
                    @click="markInterviewCompleted(candidate)"
                    class="btn btn-sm bg-success/10 text-green-800 hover:bg-success/20"
                    :disabled="isProcessingHiring || isUpdatingInterview"
                    title="Mark interview as completed"
                  >
                    <CheckCircle class="w-4 h-4 mr-1" />
                    Completed
                  </button>
                  <button
                    v-if="candidate.status === 'completed'"
                    @click="hireCandidate(candidate)"
                    class="btn btn-sm bg-primaryColor text-white hover:bg-primaryColor/90 !font-thin"
                    :disabled="isProcessingHiring"
                    title="Hire this candidate"
                  >
                    <CheckCircle class="w-4 h-4 mr-1" />
                    Hire
                  </button>
                  <button
                    @click="rejectCandidate(candidate)"
                    class="btn bg-error/10 text-red-800 border-none !font-thin btn-sm"
                    :disabled="isProcessingHiring"
                    title="Reject this candidate"
                  >
                    <X class="w-4 h-4 mr-1" />
                    Reject
                  </button>
                </div>
                <div class="other-actions">
                  <button
                    @click="viewInterviewDetails(candidate)"
                    class="btn btn-sm"
                    title="View Details"
                  >
                    <Eye class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="empty-state">
            <font-awesome-icon
              icon="fa-solid fa-suitcase"
              class="!w-15 !h-15"
            />
            <h4>No Candidates Ready for Hiring</h4>
            <p>
              Interviewed candidates who passed will appear here for hiring
              decisions.
            </p>
          </div>
        </div>
      </div>

      <!-- Position Tracker Tab -->
      <div v-if="activeTab === 'position-tracker'" class="tab-panel">
        <div class="content-section">
          <!-- Loading State -->
          <div
            v-if="isLoadingPositions"
            class="flex justify-center items-center py-12"
          >
            <div
              class="loading loading-spinner loading-lg text-green-600"
            ></div>
          </div>

          <!-- No Positions Found -->
          <div v-else-if="positions.length === 0" class="text-center py-12">
            <div class="text-gray-500 mb-4">
              <svg
                class="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">
              No positions found
            </h3>
            <p class="text-gray-500 mb-4">
              There are no branch positions available at the moment.
            </p>
            <div class="flex gap-2">
              <button @click="addPosition" class="btn btn-primary">
                <svg
                  class="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  ></path>
                </svg>
                Add New Job listing
              </button>
            </div>
          </div>

          <!-- Positions Card Grid -->
          <div v-else-if="positions.length > 0" class="mb-8">
            <!-- Header with Refresh Button and View Toggle -->
            <div
              class="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-4"
            >
              <div
                class="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start"
              >
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">
                    Open Job Positions
                  </h3>
                  <p class="text-sm text-gray-600 mt-1">
                    List of available positions displayed on the landing page
                  </p>
                </div>
                <div
                  class="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end"
                >
                  <!-- View Mode Toggle -->
                  <div
                    class="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-full sm:w-auto"
                  >
                    <button
                      @click="viewMode = 'grid'"
                      :class="[
                        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer',
                        viewMode === 'grid'
                          ? 'bg-white text-primaryColor shadow-sm'
                          : 'text-gray-600 hover:text-gray-900',
                      ]"
                      title="Grid View"
                    >
                      <List class="w-4 h-4" />
                      Grid
                    </button>
                    <button
                      @click="viewMode = 'card'"
                      :class="[
                        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer',
                        viewMode === 'card'
                          ? 'bg-white text-primaryColor shadow-sm'
                          : 'text-gray-600 hover:text-gray-900',
                      ]"
                      title="Card View"
                    >
                      <LayoutGrid class="w-4 h-4" />
                      Card
                    </button>
                  </div>
                  <button
                    @click="addPosition"
                    class="btn bg-primaryColor text-white btn-sm !font-thin hover:bg-primaryColor/90 w-full sm:w-auto"
                    title="Add new position"
                  >
                    <Plus class="w-4 h-4" />
                    Open Job
                  </button>

                  <button
                    @click="loadPositions"
                    :disabled="isLoadingPositions"
                    class="btn btn-sm flex items-center gap-2 w-full sm:w-auto"
                    title="Refresh positions from Position Management"
                  >
                    <RefreshCw
                      :class="[
                        'w-4 h-4',
                        isLoadingPositions ? 'animate-spin' : '',
                      ]"
                    />
                    {{ isLoadingPositions ? 'Loading...' : 'Refresh' }}
                  </button>
                  <!-- Show Closed toggle -->
                  <button
                    @click="showClosedPositions = !showClosedPositions"
                    class="btn btn-sm w-full sm:w-auto"
                    :class="showClosedPositions ? 'btn-warning' : ''"
                    title="Toggle to include closed positions so you can reopen them"
                  >
                    {{
                      showClosedPositions
                        ? 'Showing Open + Closed'
                        : 'Show Closed'
                    }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Bulk Action Bar (below header) -->
            <div
              v-if="selectedCount > 0"
              class="flex items-center justify-end gap-2 flex-wrap bg-white rounded-lg border border-gray-200 px-4 py-2 mb-3"
            >
              <span class="text-sm text-gray-600"
                >{{ selectedCount }} selected</span
              >
              <button
                @click="bulkOpenPositions"
                :disabled="isProcessingBulkAction"
                class="btn btn-success btn-sm flex items-center gap-2"
                title="Open selected positions"
              >
                <CheckCircle class="w-4 h-4" />
                Open Selected
              </button>
              <button
                @click="bulkClosePositions"
                :disabled="isProcessingBulkAction"
                class="btn btn-warning btn-sm flex items-center gap-2"
                title="Close selected positions"
              >
                <X class="w-4 h-4" />
                Close Selected
              </button>
              <button
                v-if="!hasMainBranchSelected"
                @click="bulkDeletePositions"
                :disabled="isProcessingBulkAction"
                class="btn btn-error btn-sm flex items-center justify-center"
                title="Delete selected positions"
                aria-label="Delete selected positions"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>

            <!-- Department Tabs -->
            <div class="tabs tabs-boxed mb-4 justify-start w-full">
              <button
                v-for="department in departments"
                :key="department"
                @click="setActiveDepartment(department)"
                class="tab"
                :class="{ 'tab-active': activeDepartment === department }"
              >
                <Building2 class="w-4 h-4 mr-2" />
                <span>{{ department }}</span>
                <span class="badge badge-ghost ml-2">
                  {{ filteredPositionsByDepartment(department).length }}
                </span>
              </button>
            </div>

            <!-- Grid View (Table) -->
            <div
              v-if="viewMode === 'grid'"
              class="bg-white rounded-lg shadow-md border border-gray-200 mb-4"
            >
              <!-- Active Filters Display -->
              <div
                v-if="hasActiveGridFilters"
                class="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2 flex-wrap"
              >
                <span class="text-xs font-medium text-gray-600"
                  >Active filters:</span
                >
                <span
                  v-if="gridFilters.position"
                  class="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
                >
                  Position: {{ gridFilters.position }}
                  <button
                    @click.stop="
                      gridFilters.position = null;
                      gridCurrentPage = 1;
                    "
                    class="hover:text-orange-900"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </span>
                <span
                  v-if="gridFilters.branch"
                  class="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                >
                  Branch: {{ gridFilters.branch }}
                  <button
                    @click.stop="
                      gridFilters.branch = null;
                      gridCurrentPage = 1;
                    "
                    class="hover:text-green-900"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </span>
                <span
                  v-if="gridFilters.department"
                  class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  Department: {{ gridFilters.department }}
                  <button
                    @click.stop="
                      gridFilters.department = null;
                      gridCurrentPage = 1;
                    "
                    class="hover:text-blue-900"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </span>
                <span
                  v-if="gridFilters.status"
                  class="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                >
                  Status: {{ gridFilters.status }}
                  <button
                    @click.stop="
                      gridFilters.status = null;
                      gridCurrentPage = 1;
                    "
                    class="hover:text-purple-900"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </span>
                <button
                  @click.stop="clearGridFilters"
                  class="text-xs text-gray-600 hover:text-gray-900 underline ml-2"
                >
                  Clear all
                </button>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <!-- Checkbox Column -->
                      <th
                        class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-12"
                      >
                        <input
                          type="checkbox"
                          :checked="isSelectAll"
                          @change="toggleSelectAllPositions"
                          class="checkbox checkbox-sm checked:bg-primaryColor text-white"
                          :disabled="gridPaginatedPositions.length === 0"
                        />
                      </th>
                      <th
                        @click="togglePositionFilter(null)"
                        class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative group"
                      >
                        <div class="flex items-center gap-1">
                          Position
                          <Filter
                            class="w-3 h-3 opacity-50 group-hover:opacity-100"
                          />
                          <span
                            v-if="gridFilters.position"
                            class="w-2 h-2 bg-orange-600 rounded-full"
                          ></span>
                        </div>
                        <!-- Dropdown menu -->
                        <div
                          v-if="availablePositionTitles.length > 0"
                          class="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px] hidden group-hover:block"
                        >
                          <div class="py-1">
                            <button
                              @click.stop="togglePositionFilter(null)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              :class="
                                !gridFilters.position
                                  ? 'bg-orange-50 text-orange-700'
                                  : 'text-gray-700'
                              "
                            >
                              <span>All Positions</span>
                              <span
                                v-if="!gridFilters.position"
                                class="text-orange-600"
                                >✓</span
                              >
                            </button>
                            <div class="border-t border-gray-200 my-1"></div>
                            <button
                              v-for="position in availablePositionTitles"
                              :key="position"
                              @click.stop="togglePositionFilter(position)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              :class="
                                gridFilters.position === position
                                  ? 'bg-orange-50 text-orange-700'
                                  : 'text-gray-700'
                              "
                            >
                              <span>{{ position }}</span>
                              <span
                                v-if="gridFilters.position === position"
                                class="text-orange-600"
                                >✓</span
                              >
                            </button>
                          </div>
                        </div>
                      </th>
                      <th
                        @click="toggleBranchFilter(null)"
                        class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative group"
                      >
                        <div class="flex items-center gap-1">
                          Branch
                          <Filter
                            class="w-3 h-3 opacity-50 group-hover:opacity-100"
                          />
                          <span
                            v-if="gridFilters.branch"
                            class="w-2 h-2 bg-green-600 rounded-full"
                          ></span>
                        </div>
                        <!-- Dropdown menu -->
                        <div
                          v-if="availableBranches.length > 0"
                          class="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px] hidden group-hover:block"
                        >
                          <div class="py-1">
                            <button
                              @click.stop="toggleBranchFilter(null)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              :class="
                                !gridFilters.branch
                                  ? 'bg-green-50 text-green-700'
                                  : 'text-gray-700'
                              "
                            >
                              <span>All Branches</span>
                              <span
                                v-if="!gridFilters.branch"
                                class="text-green-600"
                                >✓</span
                              >
                            </button>
                            <div class="border-t border-gray-200 my-1"></div>
                            <button
                              v-for="branch in availableBranches"
                              :key="branch"
                              @click.stop="toggleBranchFilter(branch)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              :class="
                                gridFilters.branch === branch
                                  ? 'bg-green-50 text-green-700'
                                  : 'text-gray-700'
                              "
                            >
                              <span>{{ branch }}</span>
                              <span
                                v-if="gridFilters.branch === branch"
                                class="text-green-600"
                                >✓</span
                              >
                            </button>
                          </div>
                        </div>
                      </th>
                      <th
                        @click="toggleDepartmentFilter(null)"
                        class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative group"
                      >
                        <div class="flex items-center gap-1">
                          Department
                          <Filter
                            class="w-3 h-3 opacity-50 group-hover:opacity-100"
                          />
                          <span
                            v-if="gridFilters.department"
                            class="w-2 h-2 bg-blue-600 rounded-full"
                          ></span>
                        </div>
                        <!-- Dropdown menu -->
                        <div
                          v-if="availableDepartments.length > 0"
                          class="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px] hidden group-hover:block"
                        >
                          <div class="py-1">
                            <button
                              @click.stop="toggleDepartmentFilter(null)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              :class="
                                !gridFilters.department
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-gray-700'
                              "
                            >
                              <span>All Departments</span>
                              <span
                                v-if="!gridFilters.department"
                                class="text-blue-600"
                                >✓</span
                              >
                            </button>
                            <div class="border-t border-gray-200 my-1"></div>
                            <button
                              v-for="dept in availableDepartments"
                              :key="dept"
                              @click.stop="toggleDepartmentFilter(dept)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              :class="
                                gridFilters.department === dept
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-gray-700'
                              "
                            >
                              <span>{{ dept }}</span>
                              <span
                                v-if="gridFilters.department === dept"
                                class="text-blue-600"
                                >✓</span
                              >
                            </button>
                          </div>
                        </div>
                      </th>
                      <th
                        class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                      >
                        Rate/Hour
                      </th>
                      <th
                        @click="toggleStatusFilter(null)"
                        class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors relative group"
                      >
                        <div class="flex items-center gap-1">
                          Status
                          <Filter
                            class="w-3 h-3 opacity-50 group-hover:opacity-100"
                          />
                          <span
                            v-if="gridFilters.status"
                            class="w-2 h-2 bg-purple-600 rounded-full"
                          ></span>
                        </div>
                        <!-- Dropdown menu -->
                        <div
                          v-if="availableStatuses.length > 0"
                          class="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px] hidden group-hover:block"
                        >
                          <div class="py-1">
                            <button
                              @click.stop="toggleStatusFilter(null)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between"
                              :class="
                                !gridFilters.status
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'text-gray-700'
                              "
                            >
                              <span>All Status</span>
                              <span
                                v-if="!gridFilters.status"
                                class="text-purple-600"
                                >✓</span
                              >
                            </button>
                            <div class="border-t border-gray-200 my-1"></div>
                            <button
                              v-for="status in availableStatuses"
                              :key="status"
                              @click.stop="toggleStatusFilter(status)"
                              class="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between capitalize"
                              :class="
                                gridFilters.status === status
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'text-gray-700'
                              "
                            >
                              <span>{{ status }}</span>
                              <span
                                v-if="gridFilters.status === status"
                                class="text-purple-600"
                                >✓</span
                              >
                            </button>
                          </div>
                        </div>
                      </th>
                      <th
                        class="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <tr
                      v-for="position in gridPaginatedPositions"
                      :key="position.id"
                      :class="[
                        'hover:bg-gray-50 transition-colors',
                        isPositionSelected(position.id) ? 'bg-blue-50' : '',
                      ]"
                    >
                      <!-- Checkbox Cell -->
                      <td class="px-4 py-3 whitespace-nowrap" @click.stop>
                        <input
                          type="checkbox"
                          :checked="isPositionSelected(position.id)"
                          @change="togglePositionSelection(position.id)"
                          class="checkbox checkbox-sm checked:bg-primaryColor text-white"
                        />
                      </td>
                      <td
                        class="px-4 py-3 whitespace-nowrap cursor-pointer"
                        @click.stop="confirmTogglePositionStatus(position)"
                      >
                        <div class="font-semibold text-gray-900">
                          {{ position.position_title }}
                        </div>
                        <div class="text-xs text-gray-500 line-clamp-1">
                          {{
                            `${position.department} ${position.position_title}`
                          }}
                        </div>
                      </td>
                      <td class="px-4 py-3 whitespace-nowrap" @click.stop>
                        <div
                          v-if="
                            position.branch_name &&
                            position.branch_name !== 'N/A' &&
                            position.branch_name.trim() !== ''
                          "
                          class="flex items-center text-sm"
                        >
                          <svg
                            class="w-4 h-4 mr-1 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            ></path>
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            ></path>
                          </svg>
                          <span
                            class="truncate max-w-[200px] cursor-help"
                            :title="position.branch_name"
                            >{{ position.branch_name }}</span
                          >
                        </div>
                        <span
                          v-else-if="position.branch_id"
                          class="text-sm text-gray-400 italic"
                          >No branch name</span
                        >
                        <span
                          v-else
                          class="text-sm text-green-600 flex items-center"
                        >
                          <svg
                            class="w-4 h-4 mr-1 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            ></path>
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            ></path>
                          </svg>
                          Main Branch
                        </span>
                      </td>
                      <td
                        class="px-4 py-3 whitespace-nowrap cursor-pointer"
                        @click.stop="togglePositionStatus(position)"
                      >
                        <span class="text-sm text-gray-600">{{
                          position.department
                        }}</span>
                      </td>
                      <td
                        class="px-4 py-3 whitespace-nowrap cursor-pointer"
                        @click.stop="togglePositionStatus(position)"
                      >
                        <span class="text-sm font-semibold text-primaryColor">
                          ₱{{
                            (parseFloat(position.rate_per_hour) || 0).toFixed(2)
                          }}
                        </span>
                      </td>
                      <td
                        class="px-4 py-3 whitespace-nowrap cursor-pointer"
                        @click.stop="togglePositionStatus(position)"
                      >
                        <span
                          class="px-2 py-1 text-xs font-medium rounded-full"
                          :class="
                            position.status === 'open'
                              ? 'bg-success/20 text-success '
                              : 'bg-error/20 text-error'
                          "
                        >
                          {{ position.status === 'open' ? 'Open' : 'Closed' }}
                        </span>
                      </td>
                      <td
                        class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 cursor-pointer"
                        @click.stop="confirmTogglePositionStatus(position)"
                      >
                        Click to
                        {{ position.status === 'open' ? 'close' : 'open' }}
                      </td>
                    </tr>
                    <tr v-if="gridPaginatedPositions.length === 0">
                      <td
                        colspan="7"
                        class="px-4 py-8 text-center text-gray-500"
                      >
                        No positions found matching the filters.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Pagination Controls -->
              <div
                class="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between"
              >
                <div class="text-sm text-gray-600">
                  Showing {{ (gridCurrentPage - 1) * gridItemsPerPage + 1 }} to
                  {{
                    Math.min(
                      gridCurrentPage * gridItemsPerPage,
                      gridFilteredPositions.length
                    )
                  }}
                  of {{ gridFilteredPositions.length }} positions
                </div>
                <div class="flex items-center gap-2">
                  <button
                    @click="gridCurrentPage = Math.max(1, gridCurrentPage - 1)"
                    :disabled="gridCurrentPage === 1"
                    class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span class="text-sm text-gray-600">
                    Page {{ gridCurrentPage }} of {{ gridTotalPages }}
                  </span>
                  <button
                    @click="
                      gridCurrentPage = Math.min(
                        gridTotalPages,
                        gridCurrentPage + 1
                      )
                    "
                    :disabled="gridCurrentPage >= gridTotalPages"
                    class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            <!-- Cards Grid View -->
            <div
              v-else-if="viewMode === 'card'"
              class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-4"
            >
              <div
                v-for="position in cardPaginatedPositions"
                :key="position.id"
                @click="togglePositionStatus(position)"
                class="card bg-white shadow-md border border-black/10 hover:shadow-lg cursor-pointer hover:border-green-500/30"
              >
                <div class="card-body p-3 sm:p-4 relative">
                  <!-- Header -->
                  <div class="flex justify-between items-start mb-3">
                    <div class="flex-1 min-w-0">
                      <h3
                        class="font-semibold text-black truncate text-sm sm:text-base"
                      >
                        {{ position.position_title }}
                      </h3>
                      <div class="space-y-1">
                        <p class="text-xs sm:text-sm text-black/60 truncate">
                          {{ position.department }}
                        </p>
                        <p
                          v-if="
                            position.branch_name &&
                            position.branch_name !== 'N/A' &&
                            position.branch_name.trim() !== ''
                          "
                          class="text-xs font-medium text-green-600 flex items-center truncate"
                        >
                          <svg
                            class="w-3 h-3 mr-1 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            ></path>
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            ></path>
                          </svg>
                          {{ position.branch_name }}
                        </p>
                        <p
                          v-else-if="position.branch_id"
                          class="text-xs text-gray-400 italic truncate"
                        >
                          No branch name
                        </p>
                        <p
                          v-else
                          class="text-xs font-medium text-green-600 flex items-center truncate"
                        >
                          <svg
                            class="w-3 h-3 mr-1 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            ></path>
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            ></path>
                          </svg>
                          Main Branch
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Rate per Hour -->
                  <div class="flex justify-between items-center mb-3">
                    <span class="text-xs sm:text-sm text-black/70"
                      >Rate per Hour:</span
                    >
                    <span
                      class="font-bold text-sm sm:text-base text-primaryColor"
                    >
                      ₱{{
                        (parseFloat(position.rate_per_hour) || 0).toFixed(2)
                      }}
                    </span>
                  </div>

                  <!-- Status -->
                  <div class="flex justify-between items-center mb-3">
                    <span class="text-xs sm:text-sm text-black/70"
                      >Status:</span
                    >
                    <div
                      class="badge badge-xs sm:badge-sm border-none"
                      :class="
                        position.status === 'open'
                          ? 'bg-success/20 text-success'
                          : 'bg-error/20 text-error'
                      "
                    >
                      {{ position.status === 'open' ? 'Open' : 'Closed' }}
                    </div>
                  </div>

                  <!-- Description -->
                  <div class="text-xs text-black/60 line-clamp-2">
                    {{
                      position.description ||
                      `${position.department} ${position.position_title}`
                    }}
                  </div>

                  <!-- Click to Toggle Status Indicator -->
                  <div class="flex justify-end mt-2">
                    <span class="text-xs text-black/40">
                      Click to
                      {{ position.status === 'open' ? 'close' : 'open' }}
                      position
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card View Pagination -->
            <div
              v-if="viewMode === 'card'"
              class="bg-white rounded-lg shadow-md border border-gray-200 p-4"
            >
              <div class="flex justify-between items-center">
                <div class="text-sm text-gray-600">
                  Showing {{ (cardCurrentPage - 1) * cardItemsPerPage + 1 }} to
                  {{
                    Math.min(
                      cardCurrentPage * cardItemsPerPage,
                      filteredPositions.length
                    )
                  }}
                  of {{ filteredPositions.length }} positions
                </div>
                <div class="flex items-center gap-2">
                  <button
                    @click="cardCurrentPage = Math.max(1, cardCurrentPage - 1)"
                    :disabled="cardCurrentPage === 1"
                    class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span class="text-sm text-gray-600">
                    Page {{ cardCurrentPage }} of {{ cardTotalPages }}
                  </span>
                  <button
                    @click="
                      cardCurrentPage = Math.min(
                        cardTotalPages,
                        cardCurrentPage + 1
                      )
                    "
                    :disabled="cardCurrentPage >= cardTotalPages"
                    class="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Positions Grid -->
          <div v-else-if="positions.length > 0" class="positions-grid">
            <div
              v-for="position in positions"
              :key="position.id"
              class="position-card"
            >
              <div class="position-header">
                <div class="position-title">{{ position.position_title }}</div>
                <div class="position-actions">
                  <button
                    @click="editPosition(position)"
                    class="text-blue-600 hover:text-blue-700 p-1"
                    title="Edit Position"
                  >
                    <Eye class="w-4 h-4" />
                  </button>
                  <button
                    @click="deletePosition(position.id)"
                    class="text-red-600 hover:text-red-700 p-1 ml-2"
                    title="Delete Position"
                  >
                    <X class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div class="position-status-container">
                <div
                  :class="[
                    'position-status',
                    position.status === 'open'
                      ? 'open'
                      : position.status === 'filled'
                        ? 'filled'
                        : 'on-hold',
                  ]"
                >
                  {{
                    position.status.charAt(0).toUpperCase() +
                    position.status.slice(1)
                  }}
                </div>
              </div>

              <div class="position-details">
                <div class="detail-item">
                  <span class="detail-label">Branch:</span>
                  <span class="detail-value">{{
                    position.branch_name || 'Not specified'
                  }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Department:</span>
                  <span class="detail-value">{{
                    position.department || 'Not specified'
                  }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Rate per Hour:</span>
                  <span class="detail-value"
                    >₱{{ position.rate_per_hour || 0 }}</span
                  >
                </div>
                <div class="detail-item">
                  <span class="detail-label">Monthly Salary:</span>
                  <span class="detail-value"
                    >₱{{ position.monthly_salary || 0 }}</span
                  >
                </div>
                <div class="detail-item">
                  <span class="detail-label">Position Type:</span>
                  <span class="detail-value">{{
                    position.position_type || 'Full-time'
                  }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Created:</span>
                  <span class="detail-value">{{
                    formatDate(position.created_at)
                  }}</span>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="position-footer">
                <button
                  @click="viewPositionDetails(position)"
                  class="btn-secondary"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>

          <!-- No Positions State -->
          <div v-else class="text-center py-12">
            <div class="text-gray-500 mb-4">
              <Target class="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 class="text-xl font-semibold mb-2">No Positions Available</h3>
              <p class="text-gray-600">
                Start by adding your first job position
              </p>
            </div>
            <button
              @click="showAddPositionModal = true"
              class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 shadow-lg flex items-center gap-2 mx-auto"
            >
              <Plus class="w-5 h-5" />
              Add First Position
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Position Modal -->
    <div
      v-if="showAddPositionModal"
      class="fixed inset-0 backdrop-blur-sm bg-black/15 flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-bold text-gray-900">
            {{ editingPosition ? 'Edit Job Opening' : 'Post New Job Opening' }}
          </h3>
          <button
            @click="closePositionModal"
            class="text-gray-400 hover:text-gray-600"
          >
            <X class="w-6 h-6" />
          </button>
        </div>

        <!-- Info banner for Main Office Department -->
        <div
          v-if="isMainOfficeDepartment"
          class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg"
        >
          <p class="text-sm text-amber-800">
            <strong>ℹ️ Main Office Department:</strong> Positions in
            <strong>{{ positionForm.department }}</strong> are automatically
            assigned to the main branch (no specific branch).
          </p>
        </div>

        <form @submit.prevent="savePosition" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Left Column -->
            <div class="space-y-4">
              <!-- Work Type -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Work Type *</label
                >
                <select
                  v-model="positionForm.position_type"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select Work Type</option>
                  <option value="Full-time">Full-time</option>
                </select>
              </div>

              <!-- Branch Selection (only for Branch department) -->
              <div
                v-if="
                  positionForm.department === 'Branch' &&
                  !isMainOfficeDepartment
                "
              >
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Branch *</label
                >
                <select
                  v-model="positionForm.branch_id"
                  :required="
                    positionForm.department === 'Branch' &&
                    !isMainOfficeDepartment
                  "
                  :disabled="isLoadingBranches"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {{
                      isLoadingBranches
                        ? 'Loading branches...'
                        : 'Select Branch'
                    }}
                  </option>
                  <option
                    v-for="branch in availableBranchesForSelection"
                    :key="branch.id"
                    :value="branch.id"
                  >
                    {{ branch.name }}
                  </option>
                </select>
                <p v-if="isLoadingBranches" class="text-xs text-gray-500 mt-1">
                  Loading branches...
                </p>
                <p
                  v-else-if="availableBranchesForSelection.length === 0"
                  class="text-xs text-amber-600 mt-1"
                >
                  ⚠️ No branches found. Please ensure branches are created.
                </p>
                <p v-else class="text-xs text-gray-500 mt-1">
                  Select a specific branch for this position ({{
                    availableBranchesForSelection.length
                  }}
                  branch available)
                </p>
              </div>
            </div>

            <!-- Right Column -->
            <div class="space-y-4">
              <!-- Department -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Department *</label
                >
                <select
                  v-model="positionForm.department"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  @change="
                    positionForm.position_title = '';
                    positionForm.rate_per_hour = 0;
                  "
                >
                  <option value="">Select Department</option>
                  <option value="Branch">Branch</option>
                  <option value="Human Resource">Human Resource</option>
                  <option value="Finance">Finance</option>
                  <option value="SCM">SCM</option>
                  <option value="Production">Production</option>
                  <option value="CRM">CRM</option>
                </select>
              </div>

              <!-- Position/Role Selection (all departments) -->
              <div
                v-if="
                  positionForm.department &&
                  availableRolesForDepartment.length > 0
                "
              >
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Position/Role *</label
                >
                <select
                  v-model="positionForm.position_title"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select Position</option>
                  <option
                    v-for="role in availableRolesForDepartment"
                    :key="role.role_id"
                    :value="role.role"
                  >
                    {{ role.role }} (₱{{ role.rate_per_hour || 0 }}/hr)
                  </option>
                </select>
                <p class="text-xs text-gray-500 mt-1">
                  Select from available positions in
                  {{ positionForm.department }}
                  <span class="text-green-600 font-medium"
                    >({{ availableRolesForDepartment.length }} available)</span
                  >
                </p>
              </div>

              <!-- Debug info for department selection -->
              <div
                v-if="
                  positionForm.department && !availableRolesForDepartment.length
                "
                class="text-xs text-amber-600 bg-amber-50 p-2 rounded"
              >
                ⚠️ No positions found for {{ positionForm.department }}. Please
                check Position Management first.
              </div>

              <!-- Status -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Status *</label
                >
                <select
                  v-model="positionForm.status"
                  required
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="open">Open</option>

                  <option value="closed">Close</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              @click="closePositionModal"
              class="btn btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isSavingPosition"
              class="btn btn-sm bg-primaryColor text-white hover:bg-primaryColor/80 font-thin"
            >
              <span
                v-if="isSavingPosition"
                class="loading loading-spinner loading-sm"
              ></span>
              {{ editingPosition ? 'Update Job Opening' : 'Post Job Opening' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Application Details Modal -->
    <JobApplicationDetailsModal
      :isOpen="showApplicationDetailsModal"
      :applicationId="selectedApplication?.id"
      @close="closeApplicationDetailsModal"
    />

    <!-- Set Interview Modal -->
    <SetInterviewModal
      :isOpen="showSetInterviewModal"
      :applicationId="selectedApplication?.id"
      @close="closeSetInterviewModal"
      @interview-scheduled="handleInterviewScheduled"
      @navigate-to-schedule="handleNavigateToSchedule"
    />

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all"
      >
        <!-- Modal Header -->
        <div
          class="flex items-center justify-between p-6 border-b border-gray-200"
        >
          <div class="flex items-center">
            <div
              class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3"
            >
              <Trash2 class="w-5 h-5 text-red-600" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900">
              Delete Application
            </h3>
          </div>
          <button
            @click="showDeleteModal = false"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6">
          <p class="text-gray-600 mb-4">
            Are you sure you want to delete this application? This action cannot
            be undone and will permanently remove all application data.
          </p>

          <!-- Application Preview -->
          <div
            v-if="applicationToDelete"
            class="bg-gray-50 rounded-lg p-4 mb-6"
          >
            <div class="flex items-center">
              <div
                class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3"
              >
                <span class="text-green-600 font-semibold text-sm">
                  {{ applicationToDelete.full_name?.charAt(0) || 'A' }}
                </span>
              </div>
              <div>
                <h4 class="font-medium text-gray-900">
                  {{ applicationToDelete.full_name }}
                </h4>
                <p class="text-sm text-gray-500">
                  {{ applicationToDelete.email }}
                </p>
                <p class="text-sm text-gray-500">
                  {{ applicationToDelete.position_name }} •
                  {{ applicationToDelete.location }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            @click="showDeleteModal = false"
            class="btn btn-sm border-none bg-accentColor font-thin hover:bg-accentColor/80"
          >
            Cancel
          </button>
          <button
            @click="confirmDelete"
            class="btn btn-sm bg-error text-white font-thin hover:bg-error/80"
          >
            <Trash2 class="w-4 h-4 mr-2" />
            Delete Application
          </button>
        </div>
      </div>
    </div>

    <!-- Action Confirmation Modal (Hire/Reject, etc.) -->
    <div
      v-if="showActionConfirmModal"
      class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div
          class="flex items-center justify-between px-5 py-4"
          :class="
            actionConfirmData.type === 'danger' ? 'bg-red-50' : 'bg-green-50'
          "
        >
          <h3
            class="text-lg font-semibold"
            :class="
              actionConfirmData.type === 'danger'
                ? 'text-red-800'
                : 'text-green-800'
            "
          >
            {{ actionConfirmData.title }}
          </h3>
          <button
            @click="cancelActionConfirm"
            class="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="px-6 py-5">
          <p class="text-gray-700">{{ actionConfirmData.message }}</p>
        </div>
        <div class="px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button @click="cancelActionConfirm" class="btn btn-ghost">
            {{ actionConfirmData.cancelText || 'Cancel' }}
          </button>
          <button
            @click="confirmActionConfirm"
            :class="
              actionConfirmData.type === 'danger'
                ? 'btn btn-error'
                : 'btn btn-success'
            "
          >
            Confirm
          </button>
        </div>
      </div>
    </div>

    <!-- Review Onboarding Modal -->
    <div
      v-if="showOnboardingReviewModal"
      class="fixed inset-0 backdrop-blur-md bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div
        class="bg-white rounded-lg shadow-xl w-full max-w-[95vw] lg:max-w-[90vw] xl:max-w-7xl max-h-[90vh] mx-4 transform transition-all flex flex-col"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0"
        >
          <div class="flex items-center gap-3">
            <FileCheck class="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            <h3 class="text-lg sm:text-xl font-semibold text-gray-900">
              Onboarding Review
            </h3>
          </div>
          <button
            @click="showOnboardingReviewModal = false"
            class="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X class="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <!-- Filters -->
        <div
          class="p-4 sm:p-6 border-b border-gray-200 flex flex-wrap gap-3 flex-shrink-0"
        >
          <select
            v-model="onboardingStatusFilter"
            class="select select-bordered select-sm sm:select-md border-2"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            v-model="onboardingBranchFilter"
            class="select select-bordered select-sm sm:select-md border-2"
          >
            <option value="all">All Branches</option>
            <option
              v-for="branch in branches"
              :key="branch.id"
              :value="branch.id"
            >
              {{ branch.name }}
            </option>
          </select>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto p-4 sm:p-6 min-h-0">
          <div
            v-if="isLoadingOnboarding"
            class="flex items-center justify-center py-12"
          >
            <span
              class="loading loading-spinner loading-lg text-green-600"
            ></span>
            <span class="ml-3 text-gray-600">Loading submissions...</span>
          </div>
          <div v-else-if="onboardingError" class="alert alert-info">
            <Info class="w-5 h-5" />
            <span>{{ onboardingError }}</span>
          </div>
          <div
            v-else-if="filteredOnboardingSubmissions.length === 0"
            class="text-center py-12 text-gray-500"
          >
            No onboarding submissions found.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="table table-zebra w-full text-sm sm:text-base">
              <thead>
                <tr class="bg-gray-50">
                  <th class="font-semibold text-gray-700">Name</th>
                  <th class="font-semibold text-gray-700">Email</th>
                  <th class="font-semibold text-gray-700">Department</th>
                  <th class="font-semibold text-gray-700">Position</th>
                  <th class="font-semibold text-gray-700">Branch</th>
                  <th class="font-semibold text-gray-700">Submitted Date</th>
                  <th class="font-semibold text-gray-700">Status</th>
                  <th class="font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="sub in paginatedOnboardingSubmissions"
                  :key="sub.id || sub.application_id || sub.email"
                  class="hover:bg-gray-50 transition-colors"
                >
                  <td class="font-medium">
                    {{
                      sub.full_name ||
                      sub.name ||
                      (sub.first_name
                        ? `${sub.first_name} ${sub.middle_name || ''} ${sub.last_name || ''}`.trim()
                        : 'N/A')
                    }}
                  </td>
                  <td class="text-sm break-all">{{ sub.email || '—' }}</td>
                  <td>{{ sub.department || '—' }}</td>
                  <td>{{ sub.role_name || sub.position_title || '—' }}</td>
                  <td>{{ sub.branch_name || 'Main Branch' }}</td>
                  <td class="text-sm whitespace-nowrap">
                    {{
                      sub.submitted_at || sub.created_at
                        ? new Date(
                            sub.submitted_at || sub.created_at
                          ).toLocaleDateString()
                        : '—'
                    }}
                  </td>
                  <td>
                    <span
                      class="badge badge-sm"
                      :class="{
                        'bg-warning/10 text-warning':
                          (sub.status || 'pending') === 'pending',
                        'bg-success/10 text-success':
                          (sub.status || 'pending') === 'approved',
                        'bg-error/10 text-error':
                          (sub.status || 'pending') === 'rejected',
                      }"
                    >
                      {{
                        (sub.status || 'pending').charAt(0).toUpperCase() +
                        (sub.status || 'pending').slice(1)
                      }}
                    </span>
                  </td>
                  <td>
                    <button
                      titke="View Details"
                      @click="viewOnboardingDetails(sub)"
                      class="btn btn-xs sm:btn-sm border-none bg-accentColor"
                    >
                      <Eye class="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination and Close -->
        <div
          class="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-6 border-t border-gray-200 flex-shrink-0"
        >
          <div class="text-sm sm:text-base text-gray-600">
            Page {{ onboardingCurrentPage }} of {{ onboardingTotalPages }}
            <span class="ml-2 text-gray-500"
              >({{ filteredOnboardingSubmissions.length }} total)</span
            >
          </div>
          <div class="flex gap-2 flex-wrap">
            <button
              @click="
                onboardingCurrentPage = Math.max(1, onboardingCurrentPage - 1)
              "
              :disabled="onboardingCurrentPage === 1"
              class="btn btn-sm  btn-outline"
              :class="{ 'btn-disabled': onboardingCurrentPage === 1 }"
            >
              Prev
            </button>
            <button
              @click="
                onboardingCurrentPage = Math.min(
                  onboardingTotalPages,
                  onboardingCurrentPage + 1
                )
              "
              :disabled="onboardingCurrentPage === onboardingTotalPages"
              class="btn btn-sm  btn-outline"
              :class="{
                'btn-disabled': onboardingCurrentPage === onboardingTotalPages,
              }"
            >
              Next
            </button>
            <button
              @click="showOnboardingReviewModal = false"
              class="btn btn-sm "
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Onboarding Details Modal -->
    <div
      v-if="showOnboardingDetailsModal && selectedOnboardingSubmission"
      class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden transform transition-all flex flex-col"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b border-gray-200"
        >
          <div class="flex items-center gap-3">
            <FileCheck class="w-5 h-5" />
            <h3 class="text-lg font-semibold text-gray-900">
              Onboarding Details
            </h3>
          </div>
          <button
            @click="closeOnboardingDetails"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-6">
          <div
            v-if="isLoadingOnboardingDetails"
            class="flex items-center justify-center py-12"
          >
            <span
              class="loading loading-spinner loading-lg text-green-600"
            ></span>
            <span class="ml-3 text-gray-600">Loading details...</span>
          </div>

          <div v-else class="space-y-6">
            <!-- Basic Information -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h4
                class="font-semibold text-gray-900 mb-4 flex items-center gap-2"
              >
                <User class="w-4 h-4" />
                Basic Information
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="text-xs text-gray-500">Full Name</label>
                  <p class="font-medium text-gray-900">
                    {{
                      selectedOnboardingSubmission.full_name ||
                      selectedOnboardingSubmission.name ||
                      (selectedOnboardingSubmission.first_name
                        ? `${selectedOnboardingSubmission.first_name} ${selectedOnboardingSubmission.middle_name || ''} ${selectedOnboardingSubmission.last_name || ''}`.trim()
                        : 'N/A')
                    }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Email</label>
                  <p class="font-medium text-gray-900">
                    {{ selectedOnboardingSubmission.email || 'N/A' }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Phone Number</label>
                  <p class="font-medium text-gray-900">
                    {{ selectedOnboardingSubmission.phone_number || 'N/A' }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Date of Birth</label>
                  <p class="font-medium text-gray-900">
                    {{
                      selectedOnboardingSubmission.birthday
                        ? new Date(
                            selectedOnboardingSubmission.birthday
                          ).toLocaleDateString()
                        : 'N/A'
                    }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Age</label>
                  <p class="font-medium text-gray-900">
                    {{ selectedOnboardingSubmission.age || 'N/A' }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Civil Status</label>
                  <p class="font-medium text-gray-900">
                    {{ selectedOnboardingSubmission.civil_status || 'N/A' }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Sex</label>
                  <p class="font-medium text-gray-900">
                    {{ selectedOnboardingSubmission.sex || 'N/A' }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Citizenship</label>
                  <p class="font-medium text-gray-900">
                    {{ selectedOnboardingSubmission.citizenship || 'N/A' }}
                  </p>
                </div>
                <div class="md:col-span-2">
                  <label class="text-xs text-gray-500">Address</label>
                  <p class="font-medium text-gray-900">
                    {{ selectedOnboardingSubmission.address || 'N/A' }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Postal Code</label>
                  <p class="font-medium text-gray-900">
                    {{ selectedOnboardingSubmission.postal_code || 'N/A' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Employment Information -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h4
                class="font-semibold text-gray-900 mb-4 flex items-center gap-2"
              >
                <Building2 class="w-4 h-4" />
                Employment Information
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="text-xs text-gray-500">Department</label>
                  <p class="font-medium text-gray-900">
                    {{ selectedOnboardingSubmission.department || 'N/A' }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Role</label>
                  <p class="font-medium text-gray-900">
                    {{ selectedOnboardingSubmission.role_name || 'N/A' }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Branch</label>
                  <p class="font-medium text-gray-900">
                    {{
                      selectedOnboardingSubmission.branch_name || 'Main Branch'
                    }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Employee Type</label>
                  <p class="font-medium text-gray-900">
                    {{ selectedOnboardingSubmission.employee_type || 'N/A' }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Employee ID</label>
                  <p class="font-medium text-gray-900">
                    {{ selectedOnboardingSubmission.employee_id || 'N/A' }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Status</label>
                  <span
                    class="badge badge-sm"
                    :class="{
                      'bg-warning/10 text-warning':
                        (selectedOnboardingSubmission.status || 'pending') ===
                        'pending',
                      'bg-success/10 text-success':
                        (selectedOnboardingSubmission.status || 'pending') ===
                        'approved',
                      'bg-error/10 text-error':
                        (selectedOnboardingSubmission.status || 'pending') ===
                        'rejected',
                    }"
                  >
                    {{
                      (selectedOnboardingSubmission.status || 'pending')
                        .charAt(0)
                        .toUpperCase() +
                      (selectedOnboardingSubmission.status || 'pending').slice(
                        1
                      )
                    }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Government Benefits -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h4
                class="font-semibold text-gray-900 mb-4 flex items-center gap-2"
              >
                <font-awesome-icon icon="fa-solid fa-peso-sign" />
                Government Benefits
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="text-xs text-gray-500">SSS Number</label>
                  <p class="font-medium text-gray-900">
                    {{ selectedOnboardingSubmission.sss_number || 'N/A' }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">PAG-IBIG Number</label>
                  <p class="font-medium text-gray-900">
                    {{ selectedOnboardingSubmission.pagibig_number || 'N/A' }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">PhilHealth Number</label>
                  <p class="font-medium text-gray-900">
                    {{
                      selectedOnboardingSubmission.philhealth_number || 'N/A'
                    }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Emergency Contact -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h4
                class="font-semibold text-gray-900 mb-4 flex items-center gap-2"
              >
                <PhoneCall class="w-4 h-4" />
                Emergency Contact
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="text-xs text-gray-500">Contact Name</label>
                  <p class="font-medium text-gray-900">
                    {{
                      selectedOnboardingSubmission.emergency_contact_name ||
                      'N/A'
                    }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Relationship</label>
                  <p class="font-medium text-gray-900">
                    {{
                      selectedOnboardingSubmission.emergency_relationship ||
                      'N/A'
                    }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Contact Number</label>
                  <p class="font-medium text-gray-900">
                    {{
                      selectedOnboardingSubmission.emergency_contact_number ||
                      'N/A'
                    }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Alternate Number</label>
                  <p class="font-medium text-gray-900">
                    {{
                      selectedOnboardingSubmission.alternate_contact_number ||
                      'N/A'
                    }}
                  </p>
                </div>
                <div class="md:col-span-2">
                  <label class="text-xs text-gray-500">Address</label>
                  <p class="font-medium text-gray-900">
                    {{
                      selectedOnboardingSubmission.emergency_contact_address ||
                      'N/A'
                    }}
                  </p>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Email</label>
                  <p class="font-medium text-gray-900">
                    {{
                      selectedOnboardingSubmission.emergency_contact_email ||
                      'N/A'
                    }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Required Documents -->
            <div class="bg-gray-50 rounded-lg p-4">
              <h4
                class="font-semibold text-gray-900 mb-4 flex items-center gap-2"
              >
                <FileCheck class="w-4 h-4" />
                Required Documents
              </h4>
              <div
                v-if="isLoadingDocuments"
                class="flex items-center justify-center py-4"
              >
                <span
                  class="loading loading-spinner loading-sm text-green-600"
                ></span>
                <span class="ml-2 text-sm text-gray-600"
                  >Loading documents...</span
                >
              </div>
              <div
                v-else-if="employeeDocuments.length === 0"
                class="text-center py-4 text-gray-500 text-sm"
              >
                No documents uploaded
              </div>
              <div v-else class="space-y-3">
                <div
                  v-for="doc in employeeDocuments"
                  :key="doc.id"
                  class="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div
                    class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <FileText class="w-4 h-4 text-gray-600" />
                        <h5 class="font-medium text-gray-900">
                          {{ getDocumentTypeName(doc.document_type) }}
                        </h5>
                      </div>
                      <p class="text-sm text-gray-600">
                        {{ doc.original_filename }}
                      </p>
                      <div
                        class="flex items-center gap-4 mt-2 text-xs text-gray-500"
                      >
                        <span>{{ formatFileSize(doc.file_size) }}</span>
                        <span>•</span>
                        <span>{{
                          new Date(doc.uploaded_at).toLocaleDateString()
                        }}</span>
                      </div>
                    </div>
                    <div
                      class="flex items-center gap-2 w-full sm:w-auto sm:ml-4 flex-wrap sm:flex-nowrap justify-stretch sm:justify-end"
                    >
                      <button
                        @click="previewDocument(doc)"
                        class="btn btn-xs font-thin w-full sm:w-auto"
                        title="View document"
                      >
                        <Eye class="w-3 h-3 mr-1" />
                        View
                      </button>
                      <a
                        :href="
                          doc.file_path.startsWith('/')
                            ? doc.file_path
                            : `/uploads/employee-documents/${doc.filename}`
                        "
                        :download="doc.original_filename"
                        class="btn btn-xs font-thin w-full sm:w-auto"
                        title="Download document"
                      >
                        <Download class="w-3 h-3 mr-1" />
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Submission Info -->
            <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 class="font-semibold text-gray-900 mb-2">
                Submission Information
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="text-xs text-gray-500">Submitted Date</label>
                  <p class="font-medium text-gray-900">
                    {{
                      selectedOnboardingSubmission.submitted_at ||
                      selectedOnboardingSubmission.created_at
                        ? new Date(
                            selectedOnboardingSubmission.submitted_at ||
                              selectedOnboardingSubmission.created_at
                          ).toLocaleString()
                        : 'N/A'
                    }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div
          class="flex flex-col sm:flex-row sm:justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50"
        >
          <button
            v-if="
              selectedOnboardingSubmission.status === 'pending' ||
              selectedOnboardingSubmission.status === 'rejected'
            "
            @click="requestResubmission(selectedOnboardingSubmission)"
            class="btn btn-sm bg-warning/10 text-warning border-none hover:bg-warning/20 font-thin w-full sm:w-auto"
          >
            <RefreshCw class="w-4 h-4 mr-1" />
            Request Resubmission
          </button>
          <button
            v-if="
              selectedOnboardingSubmission.status === 'pending' ||
              selectedOnboardingSubmission.status === 'rejected'
            "
            @click="openApproveConfirm(selectedOnboardingSubmission)"
            class="btn btn-sm bg-success/10 text-success border-none hover:bg-success/20 font-thin w-full sm:w-auto"
          >
            <CheckCircle class="w-4 h-4 mr-1" />
            Approve
          </button>
          <button
            @click="closeOnboardingDetails"
            class="btn btn-sm w-full sm:w-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Resubmission Request Modal -->
    <div
      v-if="showResubmissionModal"
      class="fixed inset-0 backdrop-blur-md bg-black/50 flex items-center justify-center z-[60]"
      @click.self="showResubmissionModal = false"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50"
        >
          <div class="flex items-center gap-3">
            <RefreshCw class="w-5 h-5 text-warning" />
            <h3 class="text-lg font-semibold text-gray-900">
              Request Resubmission
            </h3>
          </div>
          <button
            @click="showResubmissionModal = false"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-6">
          <div class="mb-4">
            <p class="text-sm text-gray-600 mb-2">
              Please provide feedback on what needs to be corrected. This will
              be sent to the applicant via email along with a link to resubmit
              the form with pre-filled data.
            </p>
            <p class="text-xs text-gray-500">
              <strong>Applicant:</strong>
              {{
                pendingResubmission?.full_name ||
                pendingResubmission?.name ||
                pendingResubmission?.first_name +
                  ' ' +
                  pendingResubmission?.last_name ||
                'N/A'
              }}
            </p>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Feedback / Issues to Correct:
            </label>
            <textarea
              v-model="resubmissionFeedback"
              rows="6"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-warning focus:border-warning resize-none"
              placeholder="Example: Please correct your date of birth, update your address, and re-upload your Valid ID document..."
            ></textarea>
          </div>

          <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p class="text-xs text-amber-800">
              <strong>Note:</strong> The applicant will receive an email with
              this feedback and a link to resubmit their onboarding form. The
              form will be pre-filled with their current information so they can
              easily correct the issues.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50"
        >
          <button
            @click="showResubmissionModal = false"
            class="btn btn-sm btn-outline"
          >
            Cancel
          </button>
          <button
            @click="submitResubmissionRequest"
            class="btn btn-sm btn-warning text-white"
            :disabled="!resubmissionFeedback.trim()"
          >
            <RefreshCw class="w-4 h-4 mr-1" />
            Send Request
          </button>
        </div>
      </div>
    </div>

    <!-- Approval Confirmation Modal -->
    <div
      v-if="showApproveConfirmModal && pendingApproval"
      class="fixed inset-0 backdrop-blur-md bg-black/50 flex items-center justify-center z-[60]"
      @click.self="showApproveConfirmModal = false"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50"
        >
          <div class="flex items-center gap-3">
            <CheckCircle class="w-5 h-5 text-success" />
            <h3 class="text-lg font-semibold text-gray-900">
              Approve Onboarding
            </h3>
          </div>
          <button
            @click="showApproveConfirmModal = false"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-6">
          <div class="mb-4">
            <p class="text-sm text-gray-600 mb-4">
              Are you sure you want to approve the onboarding for:
            </p>
            <div class="bg-gray-50 rounded-lg p-4 mb-4">
              <p class="font-semibold text-gray-900">
                {{
                  pendingApproval?.full_name ||
                  pendingApproval?.name ||
                  (pendingApproval?.first_name
                    ? `${pendingApproval.first_name} ${pendingApproval.last_name}`
                    : 'N/A')
                }}
              </p>
              <p class="text-sm text-gray-600 mt-1">
                {{ pendingApproval?.email || 'N/A' }}
              </p>
              <p class="text-xs text-gray-500 mt-2">
                <strong>Department:</strong>
                {{ pendingApproval?.department || 'N/A' }}
                <span class="mx-2">•</span>
                <strong>Role:</strong> {{ pendingApproval?.role_name || 'N/A' }}
              </p>
            </div>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p class="text-xs text-blue-800">
              <strong>Note:</strong> Upon approval, the employee's account will
              be created and a welcome email with login credentials will be sent
              to their email address.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50"
        >
          <button @click="showApproveConfirmModal = false" class="btn btn-sm">
            No, Cancel
          </button>
          <button
            @click="approveOnboarding"
            class="btn btn-sm btn-success text-white font-thin"
          >
            <CheckCircle class="w-4 h-4 mr-1" />
            Yes, Approve
          </button>
        </div>
      </div>
    </div>

    <!-- Document Preview Modal -->
    <div
      v-if="showDocumentPreviewModal && selectedDocument"
      class="fixed inset-0 backdrop-blur-md bg-black/50 flex items-center justify-center z-[60]"
      @click.self="closeDocumentPreview"
    >
      <div
        class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50"
        >
          <div class="flex items-center gap-3">
            <FileText class="w-5 h-5 text-green-600" />
            <h3 class="text-lg font-semibold text-gray-900">
              {{ getDocumentTypeName(selectedDocument.document_type) }}
            </h3>
            <span class="text-sm text-gray-500"
              >- {{ selectedDocument.original_filename }}</span
            >
          </div>
          <button
            @click="closeDocumentPreview"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Document Content -->
        <div
          class="flex-1 overflow-auto p-6 bg-gray-100 flex items-center justify-center"
        >
          <!-- Image Preview -->
          <div v-if="isImageDocument(selectedDocument)" class="w-full">
            <img
              :src="getDocumentUrl(selectedDocument)"
              :alt="selectedDocument.original_filename"
              class="max-w-full max-h-[70vh] mx-auto rounded-lg shadow-lg"
              @error="() => console.error('Error loading image')"
            />
          </div>

          <!-- PDF Preview -->
          <div v-else-if="isPdfDocument(selectedDocument)" class="w-full">
            <div
              class="w-full bg-gray-100 rounded-lg overflow-hidden"
              style="height: 70vh"
            >
              <!-- Use iframe with API endpoint that forces inline display -->
              <iframe
                :src="getDocumentUrl(selectedDocument)"
                class="w-full h-full border-0"
                frameborder="0"
                type="application/pdf"
                style="min-height: 100%"
              >
                Your browser doesn't support PDF preview. Please use the link
                below to open the PDF in a new tab.
              </iframe>
            </div>
            <div class="mt-2 text-center text-sm text-gray-500">
              <p>
                If the PDF doesn't display,
                <a
                  :href="getDocumentUrl(selectedDocument)"
                  target="_blank"
                  class="text-blue-600 underline"
                  >click here to open it in a new tab</a
                >
              </p>
            </div>
          </div>

          <!-- Unsupported File Type -->
          <div v-else class="text-center">
            <FileText class="w-24 h-24 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-700 font-medium mb-2">
              {{ selectedDocument.original_filename }}
            </p>
            <p class="text-sm text-gray-500 mb-4">
              {{ formatFileSize(selectedDocument.file_size) }}
            </p>
            <p class="text-gray-600 mb-4">
              Preview not available for this file type
            </p>
            <a
              :href="getDocumentUrl(selectedDocument)"
              :download="selectedDocument.original_filename"
              class="btn btn-primary btn-sm"
            >
              <Download class="w-4 h-4 mr-2" />
              Download File
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50"
        >
          <div class="text-sm text-gray-600">
            <span class="font-medium">File:</span>
            {{ selectedDocument.original_filename }}
            <span class="mx-2">•</span>
            <span class="font-medium">Size:</span>
            {{ formatFileSize(selectedDocument.file_size) }}
            <span class="mx-2">•</span>
            <span class="font-medium">Uploaded:</span>
            {{ new Date(selectedDocument.uploaded_at).toLocaleDateString() }}
          </div>
          <div class="flex gap-2">
            <a
              :href="getDocumentUrl(selectedDocument)"
              :download="selectedDocument.original_filename"
              class="btn btn-sm"
            >
              <Download class="w-4 h-4 mr-1" />
              Download
            </a>
            <button
              @click="closeDocumentPreview"
              class="btn btn-sm btn-outline"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Interview Delete Confirmation Modal -->
    <div
      v-if="showInterviewDeleteModal"
      class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all"
      >
        <!-- Modal Header -->
        <div
          class="flex items-center justify-between p-6 border-b border-gray-200"
        >
          <div class="flex items-center">
            <div
              class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3"
            >
              <Trash2 class="w-5 h-5 text-red-600" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900">
              Delete Interview
            </h3>
          </div>
          <button
            @click="
              showInterviewDeleteModal = false;
              interviewToDelete = null;
            "
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6">
          <p class="text-gray-600 mb-4">
            Are you sure you want to delete this interview? This action cannot
            be undone and will permanently remove all interview data.
          </p>

          <!-- Interview Preview -->
          <div v-if="interviewToDelete" class="bg-gray-50 rounded-lg p-4 mb-6">
            <div class="flex items-center">
              <div
                class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3"
              >
                <Calendar class="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 class="font-medium text-gray-900">
                  {{ interviewToDelete.applicant_name }}
                </h4>
                <p class="text-sm text-gray-500">
                  {{ interviewToDelete.position_title }}
                </p>
                <p class="text-sm text-gray-500">
                  {{ formatDate(interviewToDelete.interview_date) }} at
                  {{ formatTime(interviewToDelete.interview_time) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            @click="
              showInterviewDeleteModal = false;
              interviewToDelete = null;
            "
            class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            @click="confirmInterviewDelete"
            class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center"
          >
            <Trash2 class="w-4 h-4 mr-2" />
            Delete Interview
          </button>
        </div>
      </div>
    </div>

    <!-- Notification Modal (Success/Error) -->
    <div
      v-if="showNotificationModal"
      class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all animate-in slide-in-from-bottom-4 duration-300"
      >
        <!-- Modal Header -->
        <div
          class="flex items-center justify-between p-6 border-b border-gray-200"
        >
          <div class="flex items-center">
            <div
              :class="[
                'w-10 h-10 rounded-full flex items-center justify-center mr-3',
                notificationData.type === 'success'
                  ? 'bg-green-100'
                  : 'bg-red-100',
              ]"
            >
              <CheckCircle
                v-if="notificationData.type === 'success'"
                class="w-5 h-5 text-green-600"
              />
              <AlertTriangle v-else class="w-5 h-5 text-red-600" />
            </div>
            <h3
              :class="[
                'text-lg font-semibold',
                notificationData.type === 'success'
                  ? 'text-green-900'
                  : 'text-red-900',
              ]"
            >
              {{ notificationData.title }}
            </h3>
          </div>
          <button
            @click="showNotificationModal = false"
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6">
          <p
            :class="[
              'text-gray-700',
              notificationData.type === 'success'
                ? 'text-green-800'
                : 'text-red-800',
            ]"
          >
            {{ notificationData.message }}
          </p>
        </div>

        <!-- Modal Footer -->
        <div class="flex justify-end p-6 border-t border-gray-200">
          <button
            @click="showNotificationModal = false"
            :class="[
              'px-6 py-2 rounded-lg font-medium transition-colors',
              notificationData.type === 'success'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white',
            ]"
          >
            OK
          </button>
        </div>
      </div>
    </div>

    <!-- Interview Details Modal -->
    <div
      v-if="showInterviewDetailsModal"
      class="fixed inset-0 backdrop-blur-md bg-transparent flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between p-6 border-b border-gray-200"
        >
          <div class="flex items-center">
            <div
              class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3"
            >
              <Eye class="w-5 h-5 text-blue-600" />
            </div>
            <h3 class="text-lg font-semibold text-gray-900">
              Interview Details
            </h3>
          </div>
          <button
            @click="showInterviewDetailsModal = false"
            class="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div class="text-xs uppercase text-gray-500 mb-1">
                Applicant Name
              </div>
              <div class="text-gray-900 font-medium">
                {{ selectedInterview?.applicant_name }}
              </div>
            </div>
            <div>
              <div class="text-xs uppercase text-gray-500 mb-1">Position</div>
              <div class="text-gray-900">
                {{ selectedInterview?.position_title }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Calendar class="w-4 h-4 text-blue-600" />
              <div>
                <div class="text-xs uppercase text-gray-500">Date</div>
                <div class="text-gray-900">
                  {{ formatDate(selectedInterview?.interview_date) }}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Clock class="w-4 h-4 text-blue-600" />
              <div>
                <div class="text-xs uppercase text-gray-500">Time</div>
                <div class="text-gray-900">
                  {{ formatTime(selectedInterview?.interview_time) }}
                </div>
              </div>
            </div>
            <div>
              <div class="text-xs uppercase text-gray-500 mb-1">Type</div>
              <div class="text-gray-900 capitalize">
                {{ selectedInterview?.interview_type }}
              </div>
            </div>
            <div>
              <div class="text-xs uppercase text-gray-500 mb-1">Status</div>
              <div class="text-gray-900 capitalize">
                {{ selectedInterview?.status }}
              </div>
            </div>
          </div>
          <div
            v-if="
              selectedInterview?.location &&
              selectedInterview?.interview_type === 'in-person'
            "
            class="flex items-center gap-2"
          >
            <MapPin class="w-4 h-4 text-green-600" />
            <div>
              <div class="text-xs uppercase text-gray-500">Location</div>
              <div class="text-gray-900">{{ selectedInterview.location }}</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex justify-end p-6 border-t border-gray-200">
          <button @click="showInterviewDetailsModal = false" class="btn btn-sm">
            OK
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import { ref, computed, onMounted, watch } from 'vue';
  import { useRouter } from 'vue-router';
  import {
    FileUser,
    Plus,
    Download,
    Calendar,
    Users,
    Target,
    CheckCircle,
    Inbox,
    Clock,
    UserCheck,
    MapPin,
    Eye,
    Search,
    X,
    AlertTriangle,
    RefreshCw,
    Filter,
    SquarePen,
    CircleX,
    Building2,
    Trash2,
    LayoutGrid,
    List,
    ChevronLeft,
    ChevronRight,
    FileCheck,
    Info,
    PhoneCall,
    DollarSign,
    User,
    FileText,
  } from 'lucide-vue-next';
  import JobApplicationDetailsModal from '../../components/crm/JobApplicationDetailsModal.vue';
  import SetInterviewModal from '../../components/crm/SetInterviewModal.vue';
  import { usePositionsStore } from '../../stores/positionsStore.js';
  import { useCustomToast } from '../../composables/useCustomToast.js';

  export default {
    name: 'JobApplication',
    components: {
      FileUser,
      Plus,
      Download,
      Calendar,
      Users,
      Target,
      CheckCircle,
      Inbox,
      Clock,
      UserCheck,
      MapPin,
      Eye,
      Search,
      X,
      AlertTriangle,
      RefreshCw,
      Filter,
      SquarePen,
      CircleX,
      Building2,
      Trash2,
      LayoutGrid,
      List,
      ChevronLeft,
      ChevronRight,
      FileCheck,
      Info,
      PhoneCall,
      DollarSign,
      User,
      FileText,
      JobApplicationDetailsModal,
      SetInterviewModal,
    },
    setup() {
      const router = useRouter();
      const positionsStore = usePositionsStore();
      const { showSuccess, showError, showWarning, showInfo } =
        useCustomToast();

      // Active tab - default to position-tracker for public access
      const activeTab = ref('new-applications');

      // Active department for filtering
      const activeDepartment = ref('All');
      const showClosedPositions = ref(false);

      // View mode - grid (default) or card
      const viewMode = ref('grid'); // 'grid' or 'card'

      // Grid view filters
      const gridFilters = ref({
        position: null,
        branch: null,
        department: null,
        status: null,
      });

      // Grid view pagination
      const gridCurrentPage = ref(1);
      const gridItemsPerPage = ref(10);

      // Card view pagination
      const cardCurrentPage = ref(1);
      const cardItemsPerPage = ref(12);

      // Selected positions for bulk actions
      const selectedPositions = ref(new Set());
      const isSelectAll = ref(false);
      const isProcessingBulkAction = ref(false);

      // Tab configuration
      const tabs = ref([
        {
          id: 'new-applications',
          name: 'New Applications',
          icon: Inbox,
        },
        {
          id: 'interview-schedule',
          name: 'Interview Schedule',
          icon: Calendar,
        },
        {
          id: 'job-hiring',
          name: 'Job Hiring',
          icon: UserCheck,
        },
        {
          id: 'position-tracker',
          name: 'Job Listing',
          icon: Target,
        },
      ]);

      // Statistics data - will be populated from API
      const screenedCount = ref(0);
      const processedCount = ref(0);

      // Application data - will be populated from API
      const applications = ref([]);
      const branchPositions = ref([]); // Separate branch positions from API
      const rolesPositionsData = ref({}); // Store roles/positions data by department

      // After migration, all positions are now in branch_positions table
      // The API already joins with user_roles to get the latest rates when role_id is present
      // So we only need to use branch_positions
      const positions = computed(() => {
        // All positions come from branch_positions (including main office positions with branch_id = null)
        // Rates are synced from user_roles via role_id when present
        return branchPositions.value || [];
      });
      const searchQuery = ref('');
      const statusFilter = ref('');
      const positionFilter = ref('');
      const dateFilter = ref('');
      const currentPage = ref(1);
      const itemsPerPage = ref(10);

      // Delete modal state
      const showDeleteModal = ref(false);
      const applicationToDelete = ref(null);

      // Interview delete confirmation modal state
      const showInterviewDeleteModal = ref(false);
      const interviewToDelete = ref(null);

      // Notification modal state (for success/error messages)
      const showNotificationModal = ref(false);
      const notificationData = ref({
        type: 'success', // 'success' or 'error'
        title: '',
        message: '',
      });

      // Generic action confirmation modal (for Hire/Reject)
      const showActionConfirmModal = ref(false);
      const actionConfirmData = ref({
        title: '',
        message: '',
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        type: 'success', // 'success' | 'danger'
        onConfirm: null,
      });

      const openActionConfirm = (opts) => {
        actionConfirmData.value = {
          title: opts.title || 'Are you sure?',
          message: opts.message || '',
          confirmText: opts.confirmText || 'Confirm',
          cancelText: opts.cancelText || 'Cancel',
          type: opts.type || 'success',
          onConfirm:
            typeof opts.onConfirm === 'function' ? opts.onConfirm : null,
        };
        showActionConfirmModal.value = true;
      };

      const cancelActionConfirm = () => {
        showActionConfirmModal.value = false;
        actionConfirmData.value.onConfirm = null;
      };

      const confirmActionConfirm = async () => {
        try {
          if (actionConfirmData.value.onConfirm) {
            await actionConfirmData.value.onConfirm();
          }
        } finally {
          cancelActionConfirm();
        }
      };
      const isLoadingApplications = ref(false);

      // Modal state
      const showApplicationDetailsModal = ref(false);
      const showSetInterviewModal = ref(false);
      const selectedApplication = ref(null);

      // Interview management state
      const interviews = ref([]);
      const isLoadingInterviews = ref(false);
      const isUpdatingInterview = ref(false);
      const interviewFilter = ref('all'); // all, today, this-week, this-month
      const isProcessingHiring = ref(false);
      const currentDateGroupIndex = ref(0); // For navigating date groups

      // Filter candidates for hiring (completed or past-due interviews)
      const hiringCandidates = computed(() => {
        const hiredIds = new Set(
          (applications.value || [])
            .filter((a) => a.status === 'hired')
            .map((a) => a.id)
        );
        const rejectedIds = new Set(
          (applications.value || [])
            .filter((a) => a.status === 'rejected')
            .map((a) => a.id)
        );

        const now = new Date();

        return (interviews.value || [])
          .map((interview) => {
            const date = new Date(interview.interview_date);
            const when = new Date(date);
            if (interview.interview_time) {
              const parts = interview.interview_time.toString().split(':');
              if (parts.length >= 2) {
                when.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
              }
            } else {
              when.setHours(23, 59, 59, 999);
            }
            const pastDue = when < now;
            return { ...interview, _pastDue: pastDue };
          })
          .filter((interview) => {
            // Include if completed, or if past due but not yet completed
            const include =
              interview.status === 'completed' ||
              (interview._pastDue &&
                (interview.status === 'scheduled' ||
                  interview.status === 'rescheduled'));
            if (!include) return false;

            const appId =
              interview.application_id ||
              interview.applicationId ||
              interview.app_id;
            if (hiredIds.has(appId) || rejectedIds.has(appId)) return false;
            const st = interview.application_status;
            if (st === 'hired' || st === 'rejected') return false;
            return true;
          });
      });

      // Position management state
      const showAddPositionModal = ref(false);
      const editingPosition = ref(null);
      const isLoadingPositions = ref(false);
      const isSavingPosition = ref(false);
      const branches = ref([]);
      const isLoadingBranches = ref(false);
      // Removed create-for-all-branches

      // Position form data
      const positionForm = ref({
        position_title: '',
        position_code: '',
        branch_id: '',
        department: '',
        position_type: 'Full-time',
        rate_per_hour: 0,
        status: 'open',
        description: '',
        requirements: '',
        assignment_type: 'new', // 'new', 'branch', 'department'
        linked_position_id: '', // If linking to existing position
      });

      // Main office departments that should auto-assign to main branch
      const mainOfficeDepartments = [
        'CRM',
        'Finance',
        'Human Resource',
        'Production',
        'SCM',
      ];

      // Check if selected department is a main office department
      const isMainOfficeDepartment = computed(() => {
        return mainOfficeDepartments.includes(positionForm.value.department);
      });

      // Computed property to determine if branch selection should be disabled
      const branchSelectionDisabled = computed(() => {
        return isMainOfficeDepartment.value;
      });

      // Available branches for selection (excluding when creating for all or main office dept)
      const availableBranchesForSelection = computed(() => {
        if (isMainOfficeDepartment.value) {
          return [];
        }
        // Filter out only deleted branches (include inactive branches)
        return branches.value.filter((b) => !b.deleted_at);
      });

      // Computed properties
      const calculatedMonthlySalary = computed(() => {
        const rate = positionForm.value.rate_per_hour || 0;
        return rate * 160; // Fixed 160 hours per month for all positions
      });

      // Helper function to calculate monthly salary range (6-8 hours per day)
      const getMonthlySalaryRange = (ratePerHour) => {
        const rate = parseFloat(ratePerHour) || 0;
        // 6 hours per day * 30 days per month (average)
        const minSalary = rate * 6 * 30;
        // 8 hours per day * 30 days per month (average)
        const maxSalary = rate * 8 * 30;

        // Round to nearest thousand
        const minRounded = Math.round(minSalary / 1000) * 1000;
        const maxRounded = Math.round(maxSalary / 1000) * 1000;

        return {
          min: minRounded,
          max: maxRounded,
          display: `₱${minRounded.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} - ₱${maxRounded.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`,
        };
      };

      const totalMonthlySalaryBudget = computed(() => {
        return positions.value.reduce((total, position) => {
          return total + (parseFloat(position.monthly_salary) || 0);
        }, 0);
      });

      // Available positions for linking
      const availablePositions = computed(() => {
        if (positionForm.value.assignment_type === 'branch') {
          // Show only branch positions
          return positions.value.filter(
            (p) => p.branch_id && p.branch_id !== ''
          );
        } else if (positionForm.value.assignment_type === 'department') {
          // Show only department positions
          return positions.value.filter(
            (p) => !p.branch_id || p.branch_id === ''
          );
        }
        return [];
      });

      // Get available positions for the selected department
      const availableRolesForDepartment = computed(() => {
        if (
          !positionForm.value.department ||
          !rolesPositionsData.value[positionForm.value.department]
        ) {
          return [];
        }
        return rolesPositionsData.value[positionForm.value.department];
      });

      // Get unique departments from positions
      const departments = computed(() => {
        // Default departments we always want to show as tabs
        const defaultDepartments = [
          'Branch',
          'Human Resource',
          'Finance',
          'SCM',
          'Production',
          'CRM',
        ];
        const deptSet = new Set([
          ...defaultDepartments,
          ...positions.value.map((p) => p.department).filter(Boolean),
        ]);
        return [
          'All',
          ...Array.from(deptSet).sort((a, b) => a.localeCompare(b)),
        ];
      });

      // Filter positions by department (optionally include closed positions for reopening)
      const filteredPositions = computed(() => {
        // Default: only show active/open positions. When toggled, include closed/inactive too
        let filtered = positions.value.filter((p) => {
          const notDeleted = !p.deleted_at;
          if (!notDeleted) return false;
          if (showClosedPositions.value) {
            return true; // include all non-deleted positions when toggle is on
          }
          return p.is_active === true;
        });

        // Apply department filter from tabs
        if (activeDepartment.value !== 'All') {
          filtered = filtered.filter(
            (p) => p.department === activeDepartment.value
          );
        }

        return filtered;
      });

      // Grid view filtered positions (with additional grid-specific filters)
      const gridFilteredPositions = computed(() => {
        let filtered = [...filteredPositions.value];

        // Apply position filter
        if (gridFilters.value.position) {
          filtered = filtered.filter(
            (p) =>
              p.position_title &&
              p.position_title.trim() === gridFilters.value.position
          );
        }

        // Apply branch filter
        if (gridFilters.value.branch) {
          if (gridFilters.value.branch === 'Main Branch') {
            // Filter for Main Branch positions
            // Main Branch can have branch_name = 'Main Branch' OR branch_id = Main Branch ID
            // Also handle legacy positions with null branch_id
            const mainBranch = branches.value.find(
              (b) => b.name?.toLowerCase() === 'main branch'
            );
            const mainBranchId = mainBranch?.id || null;

            filtered = filtered.filter((p) => {
              const isMainBranchByName =
                p.branch_name?.toLowerCase() === 'main branch' ||
                p.branch_name === 'Main Branch';
              const isMainBranchById =
                (p.branch_id === mainBranchId || p.branch_id === null) &&
                (!p.branch_name ||
                  p.branch_name === 'N/A' ||
                  p.branch_name.trim() === '');

              return isMainBranchByName || isMainBranchById;
            });
          } else {
            // Filter for specific branch
            filtered = filtered.filter(
              (p) =>
                p.branch_name === gridFilters.value.branch ||
                p.branch_id === gridFilters.value.branch
            );
          }
        }

        // Apply department filter (if not already filtered by tabs)
        if (gridFilters.value.department && activeDepartment.value === 'All') {
          filtered = filtered.filter(
            (p) => p.department === gridFilters.value.department
          );
        }

        // Apply status filter
        if (gridFilters.value.status) {
          filtered = filtered.filter(
            (p) => p.status === gridFilters.value.status
          );
        }

        return filtered;
      });

      // Grid view paginated positions
      const gridPaginatedPositions = computed(() => {
        const start = (gridCurrentPage.value - 1) * gridItemsPerPage.value;
        const end = start + gridItemsPerPage.value;
        return gridFilteredPositions.value.slice(start, end);
      });

      // Grid view total pages
      const gridTotalPages = computed(() => {
        return Math.ceil(
          gridFilteredPositions.value.length / gridItemsPerPage.value
        );
      });

      // Card view paginated positions
      const cardPaginatedPositions = computed(() => {
        const start = (cardCurrentPage.value - 1) * cardItemsPerPage.value;
        const end = start + cardItemsPerPage.value;
        return filteredPositions.value.slice(start, end);
      });

      // Card view total pages
      const cardTotalPages = computed(() => {
        return Math.ceil(
          filteredPositions.value.length / cardItemsPerPage.value
        );
      });

      // Get unique values for filters
      const availableBranches = computed(() => {
        const branchSet = new Set();
        let hasMainBranch = false;

        // Get Main Branch ID if it exists
        const mainBranch = branches.value.find(
          (b) => b.name?.toLowerCase() === 'main branch'
        );
        const mainBranchId = mainBranch?.id || null;

        filteredPositions.value.forEach((p) => {
          // Check if this is a Main Branch position
          // Main Branch can be identified by:
          // 1. branch_name === 'Main Branch'
          // 2. branch_id === Main Branch ID (13)
          // 3. Legacy: branch_id === null (old positions)
          const isMainBranchPosition =
            p.branch_name?.toLowerCase() === 'main branch' ||
            p.branch_name === 'Main Branch' ||
            p.branch_id === mainBranchId ||
            (!p.branch_id &&
              (!p.branch_name ||
                p.branch_name === 'N/A' ||
                p.branch_name.trim() === ''));

          if (isMainBranchPosition) {
            hasMainBranch = true;
          }
          // Include actual branch positions (those with branch_name and branch_id)
          else if (
            p.branch_name &&
            p.branch_name.trim() !== '' &&
            p.branch_name !== 'N/A' &&
            p.branch_id &&
            p.branch_id !== mainBranchId // Exclude Main Branch ID from regular branches
          ) {
            branchSet.add(p.branch_name.trim());
          }
        });

        // Add "Main Branch" as the first option if there are any Main Branch positions
        const branchList = hasMainBranch ? ['Main Branch'] : [];
        branchList.push(...Array.from(branchSet).sort());

        return branchList;
      });

      const availableDepartments = computed(() => {
        const depts = new Set();
        filteredPositions.value.forEach((p) => {
          if (p.department) depts.add(p.department);
        });
        return Array.from(depts).sort();
      });

      const availableStatuses = computed(() => {
        const statuses = new Set();
        filteredPositions.value.forEach((p) => {
          if (p.status) statuses.add(p.status);
        });
        return Array.from(statuses).sort();
      });

      const availablePositionTitles = computed(() => {
        const positions = new Set();
        filteredPositions.value.forEach((p) => {
          if (p.position_title) positions.add(p.position_title.trim());
        });
        return Array.from(positions).sort();
      });

      // Methods for grid filters
      const togglePositionFilter = (position) => {
        if (gridFilters.value.position === position) {
          gridFilters.value.position = null;
        } else {
          gridFilters.value.position = position;
        }
        gridCurrentPage.value = 1; // Reset to first page
      };

      const toggleBranchFilter = (branch) => {
        if (gridFilters.value.branch === branch) {
          gridFilters.value.branch = null;
        } else {
          gridFilters.value.branch = branch;
        }
        gridCurrentPage.value = 1; // Reset to first page
      };

      const toggleDepartmentFilter = (department) => {
        if (gridFilters.value.department === department) {
          gridFilters.value.department = null;
        } else {
          gridFilters.value.department = department;
        }
        gridCurrentPage.value = 1;
      };

      const toggleStatusFilter = (status) => {
        if (gridFilters.value.status === status) {
          gridFilters.value.status = null;
        } else {
          gridFilters.value.status = status;
        }
        gridCurrentPage.value = 1;
      };

      const clearGridFilters = () => {
        gridFilters.value = {
          position: null,
          branch: null,
          department: null,
          status: null,
        };
        gridCurrentPage.value = 1;
      };

      const hasActiveGridFilters = computed(() => {
        return (
          gridFilters.value.position ||
          gridFilters.value.branch ||
          gridFilters.value.department ||
          gridFilters.value.status
        );
      });

      // Computed for selected positions count
      const selectedCount = computed(() => selectedPositions.value.size);

      // Check if any selected positions are main branch positions (cannot delete)
      const hasMainBranchSelected = computed(() => {
        if (selectedPositions.value.size === 0) return false;

        const selectedIds = Array.from(selectedPositions.value);
        return selectedIds.some((positionId) => {
          const position = positions.value.find((p) => p.id === positionId);
          if (!position) return false;

          // Main branch positions have no branch_id or are from user_roles (dept-)
          return (
            !position.branch_id ||
            position.branch_id === null ||
            position.id.toString().startsWith('dept-') ||
            !position.branch_name ||
            position.branch_name.trim() === '' ||
            position.branch_name === 'N/A'
          );
        });
      });

      // Toggle select all positions
      const toggleSelectAllPositions = () => {
        if (isSelectAll.value) {
          selectedPositions.value.clear();
        } else {
          gridPaginatedPositions.value.forEach((position) => {
            selectedPositions.value.add(position.id);
          });
        }
        isSelectAll.value = !isSelectAll.value;
      };

      // Toggle individual position selection
      const togglePositionSelection = (positionId) => {
        if (selectedPositions.value.has(positionId)) {
          selectedPositions.value.delete(positionId);
        } else {
          selectedPositions.value.add(positionId);
        }
        // Update select all state
        isSelectAll.value =
          selectedPositions.value.size ===
            gridPaginatedPositions.value.length &&
          gridPaginatedPositions.value.length > 0;
      };

      // Check if position is selected
      const isPositionSelected = (positionId) => {
        return selectedPositions.value.has(positionId);
      };

      // Watch for pagination changes to reset select all
      watch(
        () => gridCurrentPage.value,
        () => {
          isSelectAll.value = false;
        }
      );

      watch(
        () => gridPaginatedPositions.value.length,
        () => {
          // Update select all state based on current page
          isSelectAll.value =
            selectedPositions.value.size ===
              gridPaginatedPositions.value.length &&
            gridPaginatedPositions.value.length > 0;
        }
      );

      // Bulk actions
      const bulkOpenPositions = async () => {
        if (selectedPositions.value.size === 0) {
          showWarning('Please select at least one position');
          return;
        }
        openActionConfirm({
          title: 'Open Positions',
          message: `Are you sure you want to open ${selectedPositions.value.size} selected position(s)?`,
          confirmText: 'Open',
          type: 'success',
          onConfirm: async () => {
            try {
              isProcessingBulkAction.value = true;
              const selectedIds = Array.from(selectedPositions.value);
              let successCount = 0;
              let errorCount = 0;

              for (const positionId of selectedIds) {
                try {
                  const position = positions.value.find(
                    (p) => p.id === positionId
                  );
                  if (!position) continue;

                  // Skip if already open
                  if (position.status === 'open') {
                    successCount++;
                    continue;
                  }

                  await togglePositionStatus(position);
                  successCount++;
                } catch (error) {
                  console.error(`Error opening position ${positionId}:`, error);
                  errorCount++;
                }
              }

              // Clear selections
              selectedPositions.value.clear();
              isSelectAll.value = false;

              if (errorCount > 0) {
                showWarning(
                  `Successfully opened ${successCount} position(s). ${errorCount} failed.`
                );
              } else {
                showSuccess(`Successfully opened ${successCount} position(s)`);
              }
            } catch (error) {
              console.error('Error in bulk open:', error);
              showError('An error occurred while opening positions');
            } finally {
              isProcessingBulkAction.value = false;
            }
          },
        });
      };

      const bulkClosePositions = async () => {
        if (selectedPositions.value.size === 0) {
          showWarning('Please select at least one position');
          return;
        }
        openActionConfirm({
          title: 'Close Positions',
          message: `Are you sure you want to close ${selectedPositions.value.size} selected position(s)?`,
          confirmText: 'Close',
          type: 'danger',
          onConfirm: async () => {
            try {
              isProcessingBulkAction.value = true;
              const selectedIds = Array.from(selectedPositions.value);
              let successCount = 0;
              let errorCount = 0;

              for (const positionId of selectedIds) {
                try {
                  const position = positions.value.find(
                    (p) => p.id === positionId
                  );
                  if (!position) continue;

                  // Skip if already closed
                  if (position.status === 'closed') {
                    successCount++;
                    continue;
                  }

                  await togglePositionStatus(position);
                  successCount++;
                } catch (error) {
                  console.error(`Error closing position ${positionId}:`, error);
                  errorCount++;
                }
              }

              // Clear selections
              selectedPositions.value.clear();
              isSelectAll.value = false;

              if (errorCount > 0) {
                showWarning(
                  `Successfully closed ${successCount} position(s). ${errorCount} failed.`
                );
              } else {
                showSuccess(`Successfully closed ${successCount} position(s)`);
              }
            } catch (error) {
              console.error('Error in bulk close:', error);
              showError('An error occurred while closing positions');
            } finally {
              isProcessingBulkAction.value = false;
            }
          },
        });
      };

      const bulkDeletePositions = async () => {
        if (selectedPositions.value.size === 0) {
          showWarning('Please select at least one position');
          return;
        }

        openActionConfirm({
          title: 'Delete selected positions?',
          message: `Are you sure you want to delete ${selectedPositions.value.size} selected position(s)? This action cannot be undone.`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          type: 'danger',
          onConfirm: async () => {
            try {
              isProcessingBulkAction.value = true;
              const selectedIds = Array.from(selectedPositions.value);
              let successCount = 0;
              let errorCount = 0;
              const errors = [];

              for (const positionId of selectedIds) {
                try {
                  const position = positions.value.find(
                    (p) => p.id === positionId
                  );
                  if (!position) {
                    errorCount++;
                    errors.push(`Position ${positionId}: Not found`);
                    continue;
                  }

                  if (position.id.toString().startsWith('dept-')) {
                    errorCount++;
                    errors.push(
                      `${position.position_title}: Department positions cannot be deleted from here. Use Position Management.`
                    );
                    continue;
                  }

                  const response = await fetch(
                    `/api/branch-positions/${positionId}`,
                    {
                      method: 'DELETE',
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                      },
                    }
                  );

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(
                      errorData.message || 'Failed to delete position'
                    );
                  }

                  branchPositions.value = branchPositions.value.filter(
                    (p) => p.id !== positionId
                  );
                  successCount++;
                } catch (error) {
                  console.error(
                    `Error deleting position ${positionId}:`,
                    error
                  );
                  errorCount++;
                  const position = positions.value.find(
                    (p) => p.id === positionId
                  );
                  errors.push(
                    `${position?.position_title || positionId}: ${error.message}`
                  );
                }
              }

              selectedPositions.value.clear();
              isSelectAll.value = false;
              await loadPositions();

              if (errorCount > 0) {
                const errorMessage = errors.slice(0, 3).join('. ');
                const moreErrors =
                  errors.length > 3 ? ` and ${errors.length - 3} more` : '';
                showNotification(
                  'warning',
                  'Partial Delete',
                  `Successfully deleted ${successCount} position(s). ${errorCount} failed: ${errorMessage}${moreErrors}`
                );
              } else {
                showNotification(
                  'success',
                  'Success!',
                  `Successfully deleted ${successCount} position(s)`
                );
              }
            } catch (error) {
              console.error('Error in bulk delete:', error);
              showError(
                `An error occurred while deleting positions: ${error.message}`
              );
            } finally {
              isProcessingBulkAction.value = false;
            }
          },
        });
      };

      // Filter positions by department (helper function for tabs)
      const filteredPositionsByDepartment = (department) => {
        // Show all positions (open and closed) for HR management
        let filtered = positions.value.filter(
          (p) => p.is_active !== false && !p.deleted_at
        );

        if (department === 'All') {
          return filtered;
        }
        return filtered.filter((p) => p.department === department);
      };

      const filteredApplications = computed(() => {
        let filtered = applications.value || [];

        // Search filter
        if (searchQuery.value) {
          const query = searchQuery.value.toLowerCase();
          filtered = filtered.filter(
            (app) =>
              app.applicant_name.toLowerCase().includes(query) ||
              app.email.toLowerCase().includes(query) ||
              app.position_title.toLowerCase().includes(query)
          );
        }

        // Status filter
        if (statusFilter.value) {
          filtered = filtered.filter(
            (app) => app.status === statusFilter.value
          );
        }

        // Position filter
        if (positionFilter.value) {
          filtered = filtered.filter(
            (app) => app.position_id === positionFilter.value
          );
        }

        return filtered;
      });

      const totalPages = computed(() => {
        // Base list
        let base = applications.value;

        if (activeTab.value === 'new-applications') {
          // If a specific status filter is applied, honor it; otherwise show new + reviewing
          if (statusFilter.value) {
            base = applications.value.filter(
              (app) => app.status === statusFilter.value
            );
          } else {
            base = applications.value.filter(
              (app) => app.status === 'new' || app.status === 'reviewing'
            );
          }
        }

        return Math.ceil(base.length / itemsPerPage.value);
      });

      const paginatedApplications = computed(() => {
        const start = (currentPage.value - 1) * itemsPerPage.value;
        const end = start + itemsPerPage.value;

        // Filter applications based on active tab
        let base = applications.value;

        if (activeTab.value === 'new-applications') {
          // If a specific status is chosen (e.g., from stat card), use it; else show new + reviewing
          if (statusFilter.value) {
            base = applications.value.filter(
              (app) => app.status === statusFilter.value
            );
          } else {
            base = applications.value.filter(
              (app) => app.status === 'new' || app.status === 'reviewing'
            );
          }
        }

        return base.slice(start, end);
      });

      const visiblePages = computed(() => {
        const pages = [];
        const total = totalPages.value;
        const current = currentPage.value;

        if (total <= 7) {
          for (let i = 1; i <= total; i++) {
            pages.push(i);
          }
        } else {
          if (current <= 4) {
            for (let i = 1; i <= 5; i++) {
              pages.push(i);
            }
            pages.push('...');
            pages.push(total);
          } else if (current >= total - 3) {
            pages.push(1);
            pages.push('...');
            for (let i = total - 4; i <= total; i++) {
              pages.push(i);
            }
          } else {
            pages.push(1);
            pages.push('...');
            for (let i = current - 1; i <= current + 1; i++) {
              pages.push(i);
            }
            pages.push('...');
            pages.push(total);
          }
        }

        return pages.filter((page) => page !== '...');
      });

      const selectAll = computed(() => {
        return (
          paginatedApplications.value.length > 0 &&
          paginatedApplications.value.every((app) => app.selected)
        );
      });

      const newApplicationsCount = computed(() => {
        return applications.value.filter((app) => app.status === 'new').length;
      });

      const pendingReviewCount = computed(() => {
        // Count applications awaiting review (explicit app status)
        return applications.value.filter((app) => app.status === 'reviewing')
          .length;
      });

      // Check if an application has a scheduled interview (not completed or cancelled)
      const hasScheduledInterview = (applicationId) => {
        if (!applicationId || !interviews.value) return false;
        return interviews.value.some(
          (iv) =>
            iv.application_id === applicationId &&
            (iv.status === 'scheduled' || iv.status === 'rescheduled')
        );
      };

      const getFilteredApplicationsCount = () => {
        if (activeTab.value === 'new-applications') {
          // If a specific status filter is active, reflect that count for clarity
          if (statusFilter.value) {
            return applications.value.filter(
              (app) => app.status === statusFilter.value
            ).length;
          }
          return applications.value.filter(
            (app) => app.status === 'new' || app.status === 'reviewing'
          ).length;
        }
        return applications.value.length;
      };

      // Filter interviews based on selected filter (no auto-complete)
      const filteredInterviews = computed(() => {
        let filtered = interviews.value || [];

        const today = new Date();
        const startOfToday = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        const endOfToday = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1
        );

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          1
        );
        // No auto-marking here; display actual statuses only

        switch (interviewFilter.value) {
          case 'today':
            filtered = filtered.filter((interview) => {
              const interviewDate = new Date(interview.interview_date);
              return (
                interviewDate >= startOfToday && interviewDate < endOfToday
              );
            });
            break;
          case 'this-week':
            filtered = filtered.filter((interview) => {
              const interviewDate = new Date(interview.interview_date);
              return interviewDate >= startOfWeek && interviewDate < endOfWeek;
            });
            break;
          case 'this-month':
            filtered = filtered.filter((interview) => {
              const interviewDate = new Date(interview.interview_date);
              return (
                interviewDate >= startOfMonth && interviewDate < endOfMonth
              );
            });
            break;
          case 'all':
          default:
            // No filtering for 'all'
            break;
        }

        // Hide completed interviews from the Interview Schedule list
        // Completed interviews will appear in the Job Hiring tab instead
        filtered = filtered.filter(
          (interview) => interview.status !== 'completed'
        );

        // Sort by date (most recent first)
        filtered.sort((a, b) => {
          const dateA = new Date(a.interview_date);
          const dateB = new Date(b.interview_date);
          return dateB - dateA;
        });

        return filtered;
      });

      // Group interviews by date for 'all', 'today', 'this-week', and 'this-month' filters
      const groupedInterviewsByDate = computed(() => {
        if (
          interviewFilter.value !== 'all' &&
          interviewFilter.value !== 'today' &&
          interviewFilter.value !== 'this-week' &&
          interviewFilter.value !== 'this-month'
        ) {
          return null; // Don't group for other filters
        }

        const groups = {};
        filteredInterviews.value.forEach((interview) => {
          const dateKey = formatDate(interview.interview_date);
          if (!groups[dateKey]) {
            groups[dateKey] = [];
          }
          groups[dateKey].push(interview);
        });

        // Sort dates: upcoming dates first, then past dates
        // formatDate returns MM/DD/YYYY
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sortedGroups = Object.keys(groups)
          .sort((a, b) => {
            // Parse MM/DD/YYYY format
            const parseFormattedDate = (dateStr) => {
              const [month, day, year] = dateStr.split('/').map(Number);
              return new Date(year, month - 1, day);
            };
            const dateA = parseFormattedDate(a);
            const dateB = parseFormattedDate(b);

            // Normalize dates to midnight for comparison
            dateA.setHours(0, 0, 0, 0);
            dateB.setHours(0, 0, 0, 0);

            // Separate upcoming and past dates
            const aIsUpcoming = dateA >= today;
            const bIsUpcoming = dateB >= today;

            // Upcoming dates come first, sorted ascending (earliest first)
            if (aIsUpcoming && bIsUpcoming) {
              return dateA - dateB;
            }
            // Past dates come after, sorted descending (most recent first)
            if (!aIsUpcoming && !bIsUpcoming) {
              return dateB - dateA;
            }
            // Upcoming always comes before past
            return aIsUpcoming ? -1 : 1;
          })
          .reduce((acc, date) => {
            acc[date] = groups[date];
            return acc;
          }, {});

        return sortedGroups;
      });

      // Get sorted date keys for navigation (upcoming first, then past)
      const sortedDateKeys = computed(() => {
        if (!groupedInterviewsByDate.value) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return Object.keys(groupedInterviewsByDate.value).sort((a, b) => {
          const parseFormattedDate = (dateStr) => {
            const [month, day, year] = dateStr.split('/').map(Number);
            return new Date(year, month - 1, day);
          };
          const dateA = parseFormattedDate(a);
          const dateB = parseFormattedDate(b);

          // Normalize dates to midnight for comparison
          dateA.setHours(0, 0, 0, 0);
          dateB.setHours(0, 0, 0, 0);

          // Separate upcoming and past dates
          const aIsUpcoming = dateA >= today;
          const bIsUpcoming = dateB >= today;

          // Upcoming dates come first, sorted ascending (earliest first)
          if (aIsUpcoming && bIsUpcoming) {
            return dateA - dateB;
          }
          // Past dates come after, sorted descending (most recent first)
          if (!aIsUpcoming && !bIsUpcoming) {
            return dateB - dateA;
          }
          // Upcoming always comes before past
          return aIsUpcoming ? -1 : 1;
        });
      });

      // Paginated date groups (show one date group at a time)
      const paginatedDateGroups = computed(() => {
        if (
          !groupedInterviewsByDate.value ||
          sortedDateKeys.value.length === 0
        ) {
          return {};
        }

        const currentDate = sortedDateKeys.value[currentDateGroupIndex.value];
        if (!currentDate) {
          return {};
        }

        return {
          [currentDate]: groupedInterviewsByDate.value[currentDate],
        };
      });

      // Navigation functions
      const nextDateGroup = () => {
        if (currentDateGroupIndex.value < sortedDateKeys.value.length - 1) {
          currentDateGroupIndex.value++;
        }
      };

      const prevDateGroup = () => {
        if (currentDateGroupIndex.value > 0) {
          currentDateGroupIndex.value--;
        }
      };

      const canGoNext = computed(() => {
        return currentDateGroupIndex.value < sortedDateKeys.value.length - 1;
      });

      const canGoPrev = computed(() => {
        return currentDateGroupIndex.value > 0;
      });

      // Reset date index when filter changes
      watch(
        () => interviewFilter.value,
        () => {
          currentDateGroupIndex.value = 0;
        }
      );

      // Methods
      const formatDate = (dateString) => {
        if (!dateString) return 'N/A';

        // Handle date string format
        let date;
        if (typeof dateString === 'string') {
          // If it's already a full ISO date string (has T), use it as-is
          if (dateString.includes('T') || dateString.includes(' ')) {
            date = new Date(dateString);
          } else if (dateString.includes('-')) {
            // If it's a date-only string (YYYY-MM-DD), add time to avoid timezone issues
            date = new Date(dateString + 'T00:00:00');
          } else {
            date = new Date(dateString);
          }
        } else {
          date = new Date(dateString);
        }

        // Check if date is valid
        if (isNaN(date.getTime())) {
          // If invalid, return original string
          return String(dateString);
        }

        // Format date in Philippines timezone (GMT+8)
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: 'Asia/Manila',
        }).format(date);
      };

      const formatDepartment = (app) => {
        const dept = app && app.department ? String(app.department) : '';
        if (dept.toLowerCase() === 'branch' && app && app.branch_name) {
          return `Branch - ${app.branch_name}`;
        }
        return dept || '—';
      };

      const formatTime = (timeString) => {
        if (!timeString) return 'N/A';

        // If timeString is already in HH:MM format, convert to 12-hour format
        if (
          typeof timeString === 'string' &&
          /^\d{1,2}:\d{2}/.test(timeString)
        ) {
          const [hours, minutes] = timeString.split(':');
          const hour24 = parseInt(hours, 10);
          const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
          const ampm = hour24 >= 12 ? 'PM' : 'AM';
          return `${hour12}:${minutes.padStart(2, '0')} ${ampm}`;
        }

        // Try to parse as date/time
        const date = new Date(timeString);
        if (isNaN(date.getTime())) {
          return timeString;
        }

        // Format time in Philippines timezone (GMT+8) with 12-hour format
        return new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true, // Use 12-hour format (AM/PM)
          timeZone: 'Asia/Manila',
        }).format(date);
      };

      const toggleSelectAll = () => {
        const shouldSelect = !selectAll.value;
        applications.value.forEach((app) => {
          app.selected = shouldSelect;
        });
      };

      const markAllAsReviewed = () => {
        applications.value.forEach((app) => {
          if (app.selected) {
            app.status = 'reviewing';
          }
        });
      };

      const viewApplication = (application) => {
        selectedApplication.value = application;
        showApplicationDetailsModal.value = true;
      };

      const setInterviewDate = (application) => {
        selectedApplication.value = application;
        showSetInterviewModal.value = true;
      };

      const closeApplicationDetailsModal = () => {
        showApplicationDetailsModal.value = false;
        selectedApplication.value = null;
      };

      const closeSetInterviewModal = () => {
        showSetInterviewModal.value = false;
        selectedApplication.value = null;
      };

      const handleInterviewScheduled = async (interviewData) => {
        console.log('Interview scheduled:', interviewData);

        // Immediately update the local application status to 'interview-scheduled'
        // This will remove it from the "New Applications" list due to filtering
        if (selectedApplication.value) {
          const appId = selectedApplication.value.id;
          const index = applications.value.findIndex((app) => app.id === appId);
          if (index !== -1) {
            // Update the status locally - this will filter it out from "New Applications" tab
            applications.value[index].status = 'interview-scheduled';
          }
        }

        // Also update by application_id from interview data if available
        if (interviewData && interviewData.application_id) {
          const appIndex = applications.value.findIndex(
            (app) => app.id === interviewData.application_id
          );
          if (appIndex !== -1) {
            applications.value[appIndex].status = 'interview-scheduled';
          }
        }

        // Small delay to ensure backend update is complete, then reload to sync
        await new Promise((resolve) => setTimeout(resolve, 500));
        await loadApplications();

        // Clear the selected application
        selectedApplication.value = null;
      };

      const handleNavigateToSchedule = () => {
        // Switch to interview schedule tab
        activeTab.value = 'interview-schedule';
        // Reload interviews to show the newly scheduled one
        loadInterviews();
      };

      // Interview management methods
      // Silently update interview status (for auto-completion)
      const updateInterviewStatusSilently = async (interviewId, status) => {
        try {
          const response = await fetch(
            `/api/job-applications/interviews/${interviewId}/status`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status }),
            }
          );

          if (response.ok) {
            const result = await response.json();
            // Update local interview
            const index = interviews.value.findIndex(
              (i) => i.id === interviewId
            );
            if (index !== -1 && result.data) {
              interviews.value[index] = {
                ...interviews.value[index],
                ...result.data,
              };
            }
          }
        } catch (error) {
          console.error('Error silently updating interview status:', error);
          throw error;
        }
      };

      const conductInterview = async (interview, result) => {
        try {
          isUpdatingInterview.value = true;

          const response = await fetch(
            `/api/job-applications/interviews/${interview.id}/status`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: 'completed',
                result: result, // 'passed' or 'failed'
              }),
            }
          );

          if (!response.ok) {
            throw new Error('Failed to update interview status');
          }

          const result_data = await response.json();

          if (result_data.success) {
            // Update local interview status
            const index = interviews.value.findIndex(
              (i) => i.id === interview.id
            );
            if (index !== -1) {
              interviews.value[index].status = 'completed';
              interviews.value[index].result = result;
            }

            // Update application status based on interview result
            await updateApplicationStatusFromInterview(
              interview.application_id,
              result
            );

            // Reload interviews to get the latest data from the database
            await loadInterviews();

            if (result === 'passed') {
              showSuccess('Interview passed successfully!');
            } else {
              showWarning('Interview failed. Application rejected.');
            }
          } else {
            throw new Error(
              result_data.message || 'Failed to update interview'
            );
          }
        } catch (error) {
          console.error('Error conducting interview:', error);
          showError(`Failed to update interview: ${error.message}`);
        } finally {
          isUpdatingInterview.value = false;
        }
      };

      const markInterviewCompleted = async (interview) => {
        try {
          isUpdatingInterview.value = true;
          await updateInterviewStatusSilently(interview.id, 'completed');
          await loadInterviews();
          showSuccess('Interview marked as completed.');
        } catch (error) {
          console.error('Error marking interview completed:', error);
          showError('Failed to mark interview as completed');
        } finally {
          isUpdatingInterview.value = false;
        }
      };

      const updateApplicationStatusFromInterview = async (
        applicationId,
        result
      ) => {
        try {
          const newStatus = result === 'passed' ? 'hired' : 'rejected';

          const response = await fetch(
            `/api/job-applications/${applicationId}/status`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status: newStatus }),
            }
          );

          if (!response.ok) {
            throw new Error('Failed to update application status');
          }

          const result_data = await response.json();

          if (result_data.success) {
            // Update local application status
            const index = applications.value.findIndex(
              (app) => app.id === applicationId
            );
            if (index !== -1) {
              applications.value[index].status = newStatus;
            }
          }
        } catch (error) {
          console.error('Error updating application status:', error);
        }
      };

      // Interview details modal
      const showInterviewDetailsModal = ref(false);
      const selectedInterview = ref(null);

      const viewInterviewDetails = (interview) => {
        selectedInterview.value = interview;
        showInterviewDetailsModal.value = true;
      };

      // Helper function to show notification (use toast instead of modal)
      const showNotification = (type, title, message) => {
        const msg = message || title || '';
        const ttl = message ? title : undefined; // Use title only if message is provided
        const t = String(type || 'info').toLowerCase();
        if (t === 'success') {
          showSuccess(msg, ttl);
          return;
        }
        if (t === 'warning') {
          showWarning(msg, ttl);
          return;
        }
        if (t === 'error') {
          showError(msg, ttl);
          return;
        }
        showInfo(msg, ttl);
      };

      const cancelInterview = (interview) => {
        interviewToDelete.value = interview;
        showInterviewDeleteModal.value = true;
      };

      // Hire or reject candidate functions
      const performHire = async (candidate) => {
        try {
          isProcessingHiring.value = true;

          const response = await fetch(
            `/api/job-applications/${candidate.application_id}/status`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status: 'hired' }),
            }
          );

          if (!response.ok) {
            throw new Error('Failed to hire candidate');
          }

          const result = await response.json();

          if (result.success) {
            // Update local application status
            const index = applications.value.findIndex(
              (app) => app.id === candidate.application_id
            );
            if (index !== -1) {
              applications.value[index].status = 'hired';
            }

            // Update interview with application status
            const interviewIndex = interviews.value.findIndex(
              (i) => i.id === candidate.id
            );
            if (interviewIndex !== -1) {
              interviews.value[interviewIndex].application_status = 'hired';
            }

            // Fire-and-forget: send onboarding link to candidate's email
            try {
              await fetch(
                `/api/job-applications/${candidate.application_id}/send-hire-link`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
            } catch (e) {
              console.warn('Failed to send hire link email:', e);
            }

            // Reload data
            await loadApplications();
            await loadInterviews();

            showNotification(
              'success',
              'Success!',
              `${candidate.applicant_name} has been hired!`
            );
          } else {
            throw new Error(result.message || 'Failed to hire candidate');
          }
        } catch (error) {
          console.error('Error hiring candidate:', error);
          showNotification(
            'error',
            'Error',
            `Failed to hire candidate: ${error.message}`
          );
        } finally {
          isProcessingHiring.value = false;
        }
      };

      const hireCandidate = (candidate) => {
        openActionConfirm({
          title: 'Confirm Hire',
          message: `Are you sure you want to hire ${candidate.applicant_name} for ${candidate.position_title}?`,
          confirmText: 'Hire',
          type: 'success',
          onConfirm: () => performHire(candidate),
        });
      };

      const performReject = async (candidate) => {
        try {
          isProcessingHiring.value = true;

          const response = await fetch(
            `/api/job-applications/${candidate.application_id}/status`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status: 'rejected' }),
            }
          );

          if (!response.ok) {
            throw new Error('Failed to reject candidate');
          }

          const result = await response.json();

          if (result.success) {
            // Update local application status
            const index = applications.value.findIndex(
              (app) => app.id === candidate.application_id
            );
            if (index !== -1) {
              applications.value[index].status = 'rejected';
            }

            // Update interview with application status
            const interviewIndex = interviews.value.findIndex(
              (i) => i.id === candidate.id
            );
            if (interviewIndex !== -1) {
              interviews.value[interviewIndex].application_status = 'rejected';
            }

            // Hard delete the application after marking as rejected
            try {
              const delRes = await fetch(
                `/api/job-applications/${candidate.application_id}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                  },
                }
              );
              if (!delRes.ok) {
                console.warn('Failed to delete rejected application');
              }
            } catch (e) {
              console.warn('Error deleting rejected application:', e);
            }

            // Reload data
            await loadApplications();
            await loadInterviews();

            showNotification(
              'success',
              'Success!',
              `${candidate.applicant_name} has been rejected and removed.`
            );
          } else {
            throw new Error(result.message || 'Failed to reject candidate');
          }
        } catch (error) {
          console.error('Error rejecting candidate:', error);
          showNotification(
            'error',
            'Error',
            `Failed to reject candidate: ${error.message}`
          );
        } finally {
          isProcessingHiring.value = false;
        }
      };

      const rejectCandidate = (candidate) => {
        openActionConfirm({
          title: 'Confirm Rejection',
          message: `Are you sure you want to reject ${candidate.applicant_name}? This will remove their application.`,
          confirmText: 'Reject',
          type: 'danger',
          onConfirm: () => performReject(candidate),
        });
      };

      const confirmInterviewDelete = async () => {
        if (!interviewToDelete.value) return;

        try {
          isUpdatingInterview.value = true;

          const response = await fetch(
            `/api/job-applications/interviews/${interviewToDelete.value.id}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            throw new Error('Failed to delete interview');
          }

          const result_data = await response.json();

          if (result_data.success) {
            // Remove interview from local list
            const index = interviews.value.findIndex(
              (i) => i.id === interviewToDelete.value.id
            );
            if (index !== -1) {
              interviews.value.splice(index, 1);
            }

            // Close modal and show success notification
            showInterviewDeleteModal.value = false;
            interviewToDelete.value = null;
            showNotification(
              'success',
              'Success!',
              'Interview deleted successfully!'
            );
          } else {
            throw new Error(
              result_data.message || 'Failed to delete interview'
            );
          }
        } catch (error) {
          console.error('Error deleting interview:', error);
          showNotification(
            'error',
            'Error',
            `Failed to delete interview: ${error.message}`
          );
        } finally {
          isUpdatingInterview.value = false;
        }
      };

      const rejectApplication = (application) => {
        applicationToDelete.value = application;
        showDeleteModal.value = true;
      };

      const confirmDelete = async () => {
        if (!applicationToDelete.value) return;

        try {
          const response = await fetch(
            `/api/job-applications/${applicationToDelete.value.id}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.message || 'Failed to delete application'
            );
          }

          // Remove from local applications list
          const index = applications.value.findIndex(
            (app) => app.id === applicationToDelete.value.id
          );
          if (index > -1) {
            applications.value.splice(index, 1);
          }

          // Close modal and reset
          showDeleteModal.value = false;
          applicationToDelete.value = null;

          showNotification(
            'success',
            'Success!',
            'Application deleted successfully!'
          );
        } catch (error) {
          console.error('Error deleting application:', error);
          showNotification(
            'error',
            'Error',
            `Failed to delete application: ${error.message}`
          );
        }
      };
      const handleTabClick = (tabId) => {
        // For all tabs, just switch the active tab content
        activeTab.value = tabId;
      };

      // Onboarding review modal state
      const showOnboardingReviewModal = ref(false);
      const onboardingSubmissions = ref([]);
      const isLoadingOnboarding = ref(false);
      const onboardingError = ref('');
      const onboardingStatusFilter = ref('all');
      const onboardingBranchFilter = ref('all');
      const onboardingCurrentPage = ref(1);
      const onboardingItemsPerPage = ref(10);

      const reviewOnboarding = async () => {
        // Open modal and load submissions
        showOnboardingReviewModal.value = true;
        onboardingError.value = '';
        onboardingSubmissions.value = [];
        try {
          isLoadingOnboarding.value = true;
          const response = await fetch('/api/onboarding/submissions', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            // Graceful fallback if endpoint not present yet
            onboardingError.value =
              'No onboarding submissions endpoint available yet. Submissions will appear here once implemented.';
            return;
          }

          const result = await response
            .json()
            .catch(() => ({ success: false }));
          if (result && (Array.isArray(result) || Array.isArray(result.data))) {
            onboardingSubmissions.value = Array.isArray(result)
              ? result
              : result.data;
          } else if (result.success && result.data) {
            onboardingSubmissions.value = result.data;
          } else {
            // No error, just empty list to show centered message in UI
            onboardingSubmissions.value = [];
            onboardingError.value = '';
          }
        } catch (e) {
          onboardingError.value =
            e.message || 'Failed to load onboarding submissions.';
        } finally {
          isLoadingOnboarding.value = false;
        }
      };

      // Filter onboarding submissions
      const filteredOnboardingSubmissions = computed(() => {
        let filtered = onboardingSubmissions.value || [];

        if (onboardingStatusFilter.value !== 'all') {
          filtered = filtered.filter(
            (sub) => (sub.status || 'pending') === onboardingStatusFilter.value
          );
        }

        if (onboardingBranchFilter.value !== 'all') {
          filtered = filtered.filter(
            (sub) => sub.branch_id == onboardingBranchFilter.value
          );
        }

        return filtered;
      });

      // Paginate onboarding submissions
      const onboardingTotalPages = computed(() => {
        return Math.ceil(
          filteredOnboardingSubmissions.value.length /
            onboardingItemsPerPage.value
        );
      });

      const paginatedOnboardingSubmissions = computed(() => {
        const start =
          (onboardingCurrentPage.value - 1) * onboardingItemsPerPage.value;
        const end = start + onboardingItemsPerPage.value;
        return filteredOnboardingSubmissions.value.slice(start, end);
      });

      // View onboarding details modal state
      const showOnboardingDetailsModal = ref(false);
      const selectedOnboardingSubmission = ref(null);
      const isLoadingOnboardingDetails = ref(false);
      const employeeDocuments = ref([]);
      const isLoadingDocuments = ref(false);

      // Document preview modal state
      const showDocumentPreviewModal = ref(false);
      const selectedDocument = ref(null);

      // View onboarding details
      const viewOnboardingDetails = async (submission) => {
        selectedOnboardingSubmission.value = submission;
        isLoadingOnboardingDetails.value = true;
        showOnboardingDetailsModal.value = true;
        employeeDocuments.value = [];

        // Fetch full employee details and documents if we have an ID
        if (submission.id || submission.employee_id) {
          try {
            const employeeId = submission.id || submission.employee_id;

            // Fetch employee details
            const response = await fetch(`/api/employees/${employeeId}`, {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              const result = await response.json();
              if (result.success && result.data) {
                // Merge the detailed employee data with submission data
                selectedOnboardingSubmission.value = {
                  ...submission,
                  ...result.data,
                  // Ensure these fields are preserved
                  status:
                    submission.status ||
                    submission.onboarding_status ||
                    result.data.onboarding_status,
                  branch_name:
                    submission.branch_name || result.data.branch_name,
                  role_name: submission.role_name || result.data.role_name,
                };
              }
            }

            // Fetch employee documents
            isLoadingDocuments.value = true;
            try {
              const docsResponse = await fetch(
                `/api/employees/${employeeId}/documents`,
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (docsResponse.ok) {
                const docsResult = await docsResponse.json();
                if (docsResult.success && docsResult.data) {
                  employeeDocuments.value = docsResult.data;
                }
              }
            } catch (docsError) {
              console.error('Error fetching documents:', docsError);
            } finally {
              isLoadingDocuments.value = false;
            }
          } catch (error) {
            console.error('Error fetching onboarding details:', error);
            // Continue with the submission data we already have
          } finally {
            isLoadingOnboardingDetails.value = false;
          }
        } else {
          // No ID available, just show what we have
          isLoadingOnboardingDetails.value = false;
        }
      };

      const closeOnboardingDetails = () => {
        showOnboardingDetailsModal.value = false;
        selectedOnboardingSubmission.value = null;
        employeeDocuments.value = [];
      };

      // Get document type display name
      const getDocumentTypeName = (type) => {
        const names = {
          valid_id: 'Valid ID',
          medical_cert: 'Medical Certificate',
          clearance: 'Barangay/Police/NBI Clearance',
        };
        return names[type] || type;
      };

      // Format file size
      const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      };

      // Preview document in modal
      const previewDocument = (document) => {
        selectedDocument.value = document;
        showDocumentPreviewModal.value = true;
      };

      const closeDocumentPreview = () => {
        showDocumentPreviewModal.value = false;
        selectedDocument.value = null;
      };

      // Get document preview URL - use API endpoint that sets proper headers
      const getDocumentUrl = (document) => {
        if (!document || !document.id) {
          // Fallback to direct file path if no document ID
          const basePath = document?.file_path?.startsWith('/')
            ? document.file_path
            : `/uploads/employee-documents/${document?.filename || ''}`;

          let backendUrl = 'http://localhost:5000';
          if (
            window.location.origin.includes(':8080') ||
            window.location.hostname === 'localhost'
          ) {
            backendUrl = 'http://localhost:5000';
          } else if (
            window.location.origin.includes('countryside-steakhouse.site')
          ) {
            backendUrl = 'https://www.countryside-steakhouse.site';
          } else if (import.meta.env.VITE_API_BASE_URL) {
            backendUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
          }

          return `${backendUrl}${basePath}`;
        }

        // Use API endpoint that forces inline display (bypasses download managers)
        const employeeId =
          selectedOnboardingSubmission.value?.id ||
          selectedOnboardingSubmission.value?.employee_id;
        if (!employeeId) return '';

        let backendUrl = 'http://localhost:5000';
        if (
          window.location.origin.includes(':8080') ||
          window.location.hostname === 'localhost'
        ) {
          backendUrl = 'http://localhost:5000';
        } else if (
          window.location.origin.includes('countryside-steakhouse.site')
        ) {
          backendUrl = 'https://www.countryside-steakhouse.site';
        } else if (import.meta.env.VITE_API_BASE_URL) {
          backendUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
        }

        // Use the view endpoint that sets proper headers
        return `${backendUrl}/api/employees/${employeeId}/documents/${document.id}/view`;
      };

      // Check if document is an image
      const isImageDocument = (document) => {
        if (!document || !document.mime_type) return false;
        return document.mime_type.startsWith('image/');
      };

      // Check if document is a PDF
      const isPdfDocument = (document) => {
        if (!document || !document.mime_type) return false;
        return (
          document.mime_type === 'application/pdf' ||
          document.original_filename?.toLowerCase().endsWith('.pdf')
        );
      };

      // Resubmission modal state
      const showResubmissionModal = ref(false);
      const resubmissionFeedback = ref('');
      const pendingResubmission = ref(null);

      // Request resubmission
      const requestResubmission = (submission) => {
        pendingResubmission.value = submission;
        resubmissionFeedback.value = '';
        showResubmissionModal.value = true;
      };

      // Submit resubmission request
      const submitResubmissionRequest = async () => {
        if (!resubmissionFeedback.value.trim()) {
          showWarning('Please provide feedback on what needs to be corrected.');
          return;
        }

        try {
          const response = await fetch(`/api/onboarding/request-resubmission`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              employee_id: pendingResubmission.value.id,
              feedback: resubmissionFeedback.value.trim(),
            }),
          });

          const result = await response.json();

          if (result.success) {
            showSuccess('Resubmission request sent successfully!');
            showResubmissionModal.value = false;
            resubmissionFeedback.value = '';
            pendingResubmission.value = null;
            // Refresh submissions
            await reviewOnboarding();
            closeOnboardingDetails();
          } else {
            showError(result.message || 'Failed to send resubmission request');
          }
        } catch (error) {
          console.error('Error requesting resubmission:', error);
          showError('Failed to send resubmission request');
        }
      };

      // Approval confirmation modal state
      const showApproveConfirmModal = ref(false);
      const pendingApproval = ref(null);

      // Open approve confirmation
      const openApproveConfirm = (submission) => {
        pendingApproval.value = submission;
        showApproveConfirmModal.value = true;
      };

      // Approve onboarding
      const approveOnboarding = async () => {
        if (!pendingApproval.value) return;

        try {
          showApproveConfirmModal.value = false;
          const response = await fetch(`/api/onboarding/approve`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              employee_id: pendingApproval.value.id,
            }),
          });

          const result = await response.json();

          if (result.success) {
            let successMessage = 'Onboarding approved successfully!';
            if (result.emailStatus?.sent) {
              successMessage +=
                ' Welcome email with account credentials has been sent to the employee.';
            } else if (result.emailStatus?.error) {
              successMessage += ' Note: Welcome email could not be sent.';
              console.warn('Email sending failed:', result.emailStatus.error);
            }

            showSuccess(successMessage);
            await reviewOnboarding();
            closeOnboardingDetails();
            pendingApproval.value = null;
          } else {
            showError(result.message || 'Failed to approve onboarding');
          }
        } catch (error) {
          console.error('Error approving onboarding:', error);
          showError('Failed to approve onboarding');
        } finally {
          pendingApproval.value = null;
        }
      };

      // Watch filters to reset page
      watch([onboardingStatusFilter, onboardingBranchFilter], () => {
        onboardingCurrentPage.value = 1;
      });

      const clearFilters = () => {
        searchQuery.value = '';
        statusFilter.value = '';
        positionFilter.value = '';
        dateFilter.value = '';
        currentPage.value = 1;
      };

      // Stats -> table reactive shortcuts
      const applyNewApplicationsStatFilter = (mode) => {
        activeTab.value = 'new-applications';
        currentPage.value = 1;
        if (mode === 'new') {
          statusFilter.value = 'new';
        } else if (mode === 'pending-review') {
          statusFilter.value = 'reviewing';
        } else {
          statusFilter.value = '';
        }

        // Scroll into view for better UX on long pages
        requestAnimationFrame(() => {
          const el = document.getElementById('applications-list');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      };

      // Position management methods
      const addPosition = async () => {
        editingPosition.value = null;
        resetPositionForm();
        // Ensure branches are loaded when opening modal
        if (branches.value.length === 0) {
          await loadBranches();
        }
        showAddPositionModal.value = true;
      };

      // Removed addPositionForAllBranches

      const editPosition = async (position) => {
        console.log('Editing position:', position); // Debug log
        editingPosition.value = position;

        // Ensure branches are loaded when opening modal for editing
        if (branches.value.length === 0) {
          await loadBranches();
        }
        console.log('Available branches:', branches.value); // Debug log
        positionForm.value = {
          branch_id: position.branch_id || '',
          position_title: position.position_title || '',
          department: position.department || '',
          position_type: position.position_type || 'Full-time',
          rate_per_hour: position.rate_per_hour || 0,
          status: position.status || 'open',

          assignment_type: 'new', // Always 'new' when editing
          linked_position_id: '',
        };
        console.log('Form data:', positionForm.value); // Debug log
        console.log('Form branch_id:', positionForm.value.branch_id); // Debug log
        showAddPositionModal.value = true;
      };

      const deletePosition = async (positionId) => {
        openActionConfirm({
          title: 'Delete position?',
          message:
            'Are you sure you want to delete this position? This action cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          type: 'danger',
          onConfirm: async () => {
            try {
              const response = await fetch(
                `/api/branch-positions/${positionId}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                  errorData.message || 'Failed to delete position'
                );
              }

              // Remove from local array (branch positions only)
              branchPositions.value = branchPositions.value.filter(
                (p) => p.id !== positionId
              );

              // Reload positions from API to ensure we have the latest data
              await loadPositions();

              // Show success message in designed modal
              showNotification(
                'success',
                'Success!',
                'Position deleted successfully'
              );
            } catch (error) {
              console.error('Error deleting position:', error);
              // Show error message in designed modal
              showNotification(
                'error',
                'Error',
                `Failed to delete position: ${error.message}`
              );
            }
          },
        });
      };

      const togglePositionStatus = async (position) => {
        try {
          let response;
          let responseData;
          let isDepartmentPosition = false;

          // Check if this is a department position
          if (position.id && position.id.toString().startsWith('dept-')) {
            isDepartmentPosition = true;

            // Extract role_id from dept-{role_id} format
            const roleId = position.id.toString().replace('dept-', '');

            // Also check if position has role_id property
            const actualRoleId = position.role_id || roleId;

            if (!actualRoleId || isNaN(actualRoleId)) {
              console.error(
                'Invalid department position - missing role_id:',
                position
              );
              showError(
                'Invalid department position ID. Cannot update status.'
              );
              return;
            }

            // Toggle is_active for department position
            // If status is 'open' (is_active = true), set is_active to false (close it)
            // If status is 'closed' (is_active = false), set is_active to true (open it)
            const currentIsActive =
              position.is_active !== undefined
                ? position.is_active
                : position.status === 'open';
            const newIsActive = !currentIsActive;

            console.log('Updating department position status:', {
              roleId: actualRoleId,
              currentIsActive,
              newIsActive,
              currentStatus: position.status,
              fullPosition: position,
            });

            response = await fetch(
              `/api/roles/positions/${actualRoleId}/status`,
              {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_active: newIsActive }),
              }
            );

            // Check content type before parsing JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              const text = await response.text();
              throw new Error(
                `Invalid response from server: ${text.substring(0, 100)}`
              );
            }

            responseData = await response.json();

            if (!response.ok) {
              console.error('API Error Response:', responseData);
              throw new Error(
                responseData.message ||
                  'Failed to update department position status'
              );
            }

            // Refresh store to sync changes (computed property will update automatically)
            await positionsStore.fetchPositions();
            console.log(
              `Department position status updated to ${responseData.data.is_active ? 'open' : 'closed'}`
            );
          } else {
            // Handle branch position
            if (!position.id || isNaN(position.id)) {
              showError('Invalid position ID. Cannot update status.');
              return;
            }

            const newStatus = position.status === 'open' ? 'closed' : 'open';

            console.log('Updating branch position status:', {
              id: position.id,
              currentStatus: position.status,
              newStatus,
              fullPosition: position,
            });

            response = await fetch(`/api/branch-positions/${position.id}`, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status: newStatus }),
            });

            // Check content type before parsing JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              const text = await response.text();
              throw new Error(
                `Invalid response from server: ${text.substring(0, 100)}`
              );
            }

            responseData = await response.json();

            console.log('Branch position update response:', responseData);
            console.log('Response data.status:', responseData.data?.status);
            console.log('Expected new status:', newStatus);

            if (!response.ok) {
              console.error('API Error Response:', responseData);
              throw new Error(
                responseData.message || 'Failed to update position status'
              );
            }

            // Update local array with the returned data
            // Update branch positions array with synced fields
            const index = branchPositions.value.findIndex(
              (p) => p.id === position.id
            );
            if (index !== -1) {
              const updatedStatus = responseData.data?.status || newStatus;
              const updatedJobStatus =
                responseData.data?.job_status || updatedStatus;
              const updatedIsActive =
                responseData.data?.is_active !== undefined
                  ? responseData.data.is_active
                  : updatedStatus === 'open';
              console.log('Setting position status to:', {
                status: updatedStatus,
                job_status: updatedJobStatus,
                is_active: updatedIsActive,
              });
              branchPositions.value[index] = {
                ...branchPositions.value[index],
                ...responseData.data,
                status: updatedStatus, // Explicitly set status from response
                job_status: updatedJobStatus, // Also sync job_status
                is_active: updatedIsActive, // Also sync is_active
              };
              console.log(`Branch position status updated to ${updatedStatus}`);
              console.log(
                `Branch position job_status synced to ${updatedJobStatus}`
              );
              console.log(
                `Branch position is_active synced to ${updatedIsActive}`
              );
              console.log('Final position data:', branchPositions.value[index]);
            }
          }
        } catch (error) {
          console.error('Error updating position status:', error);
          showError(
            error.message ||
              'Failed to update position status. Please try again.'
          );
        }
      };

      const confirmTogglePositionStatus = (position) => {
        const isCurrentlyOpen = position.status === 'open';
        const actionLabel = isCurrentlyOpen ? 'Close' : 'Open';
        const positionLabel =
          position.position_title ||
          position.title ||
          position.name ||
          'this position';

        openActionConfirm({
          title: `${actionLabel} Position`,
          message: `Are you sure you want to ${actionLabel.toLowerCase()} "${positionLabel}"?`,
          confirmText: actionLabel,
          type: isCurrentlyOpen ? 'danger' : 'success',
          onConfirm: async () => {
            await togglePositionStatus(position);
          },
        });
      };

      const savePosition = async () => {
        try {
          isSavingPosition.value = true;

          // Validate required fields
          if (!positionForm.value.department) {
            throw new Error('Please select a department');
          }

          if (!positionForm.value.position_title) {
            throw new Error('Please select a position/role');
          }

          // For Branch department, validate branch_id
          if (
            positionForm.value.department === 'Branch' &&
            !isMainOfficeDepartment.value &&
            !positionForm.value.branch_id
          ) {
            throw new Error(
              'Please select a branch for Branch department positions'
            );
          }

          // Prepare the position data (derive from selected role)
          let positionData = { ...positionForm.value };

          // Auto-assign to main branch if main office department
          if (isMainOfficeDepartment.value) {
            positionData.branch_id = null; // Main branch means no branch_id
            console.log(
              'Main office department detected, setting branch_id to null'
            );
          } else if (
            positionForm.value.department === 'Branch' &&
            positionData.branch_id
          ) {
            // Ensure branch_id is a number for Branch department positions
            positionData.branch_id = parseInt(positionData.branch_id) || null;
          } else if (!positionData.branch_id || positionData.branch_id === '') {
            // For non-Branch departments (or if branch_id is empty), set to null
            positionData.branch_id = null;
          }

          // If a role is selected, derive code and rate from Positions store
          let basePositionCode = null;
          // Store in positionData for use in retry logic
          if (
            positionForm.value.position_title &&
            positionForm.value.department
          ) {
            const deptPositions =
              rolesPositionsData.value[positionForm.value.department] || [];
            const role = deptPositions.find(
              (r) =>
                r.role?.toLowerCase() ===
                positionForm.value.position_title?.toLowerCase()
            );
            if (role) {
              basePositionCode = role.role_code || null;
              positionData.rate_per_hour =
                role.rate_per_hour || positionData.rate_per_hour || 0;
            }
          }
          // Store basePositionCode in positionData for retry logic
          positionData._basePositionCode = basePositionCode;

          // When editing, preserve the existing position_code (don't regenerate)
          if (editingPosition.value && positionData.position_code) {
            // Keep the existing position_code when editing
            console.log(
              'Editing existing position, preserving position_code:',
              positionData.position_code
            );
          } else {
            // When creating new position, generate unique position_code
            // Generate position_code if not set (create from position_title)
            if (!basePositionCode && positionData.position_title) {
              // Generate a simple code from the title (first 4 uppercase letters)
              basePositionCode =
                positionData.position_title
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .substring(0, 4) || 'POS';
            }

            // Now generate base position code with branch identifier
            let baseCodeWithBranch = '';
            if (basePositionCode) {
              if (positionData.branch_id) {
                const selectedBranch = branches.value.find(
                  (b) => b.id === positionData.branch_id
                );
                if (selectedBranch && selectedBranch.code) {
                  // Append branch code: COOK-BRN004
                  baseCodeWithBranch = `${basePositionCode}-${selectedBranch.code}`;
                } else {
                  // If no branch code, use branch ID: COOK-4
                  baseCodeWithBranch = `${basePositionCode}-${positionData.branch_id}`;
                }
              } else {
                // For main branch (no branch_id), use base code with MAIN prefix: COOK-MAIN
                baseCodeWithBranch = `${basePositionCode}-MAIN`;
              }
            }

            // Check if this position code already exists (check both client-side and query backend)
            let positionCode = baseCodeWithBranch;
            let counter = 1;
            let maxRetries = 10; // Limit retries when querying backend

            // Normalize branch_id for comparison (handle null, string, number)
            const targetBranchId =
              positionData.branch_id === null || positionData.branch_id === ''
                ? null
                : parseInt(positionData.branch_id);

            // Check for duplicate position: same position_title, department, and branch_id
            // Note: Main Branch positions can have branch_id = null OR branch_id = Main Branch ID
            // Both should be treated as the same branch for duplicate checking
            if (!editingPosition.value) {
              // Find Main Branch ID (if exists)
              const mainBranch = branches.value.find(
                (b) => b.name?.toLowerCase() === 'main branch'
              );
              const mainBranchId = mainBranch?.id || null;

              const duplicatePosition = branchPositions.value.find((p) => {
                const existingBranchId =
                  p.branch_id === null || p.branch_id === ''
                    ? null
                    : parseInt(p.branch_id);

                // Normalize branch IDs: treat null and Main Branch ID as the same
                const normalizedExistingId =
                  existingBranchId === mainBranchId ? null : existingBranchId;
                const normalizedTargetId =
                  targetBranchId === mainBranchId ? null : targetBranchId;

                // Check if branches match (Main Branch = null or Main Branch ID, specific branches = exact match)
                const branchMatches =
                  normalizedExistingId === normalizedTargetId;

                const titleMatches =
                  p.position_title?.toLowerCase().trim() ===
                  positionData.position_title?.toLowerCase().trim();
                const deptMatches =
                  p.department?.toLowerCase() ===
                  positionData.department?.toLowerCase();

                return (
                  branchMatches && titleMatches && deptMatches && !p.deleted_at
                );
              });

              if (duplicatePosition) {
                const branchName = targetBranchId
                  ? branches.value.find((b) => b.id === targetBranchId)?.name ||
                    `branch ${targetBranchId}`
                  : 'Main Branch';
                throw new Error(
                  `Position "${positionData.position_title}" already exists in ${positionData.department} department for ${branchName}. Please use a different position title or edit the existing position.`
                );
              }
            }

            // First check local cache
            while (counter <= 3) {
              // Check up to 3 times locally first
              const existingPosition = branchPositions.value.find((p) => {
                // Normalize existing position's branch_id for comparison
                const existingBranchId =
                  p.branch_id === null || p.branch_id === ''
                    ? null
                    : parseInt(p.branch_id);

                // Check if branch_id matches (both null or both same number)
                const branchMatches = targetBranchId === existingBranchId;

                // Check if position_code matches
                const codeMatches = p.position_code === positionCode;

                // Exclude current position when editing
                const isCurrentPosition =
                  editingPosition.value && p.id === editingPosition.value.id;

                return (
                  branchMatches &&
                  codeMatches &&
                  !isCurrentPosition &&
                  !p.deleted_at
                );
              });

              if (!existingPosition) {
                // Code appears unique locally, but verify with backend
                break;
              }

              // Code exists locally, try with number suffix
              if (positionData.branch_id) {
                const selectedBranch = branches.value.find(
                  (b) => b.id === positionData.branch_id
                );
                if (selectedBranch && selectedBranch.code) {
                  positionCode = `${basePositionCode}-${selectedBranch.code}-${counter}`;
                } else {
                  positionCode = `${basePositionCode}-${positionData.branch_id}-${counter}`;
                }
              } else {
                positionCode = `${basePositionCode}-MAIN-${counter}`;
              }

              counter++;
            }

            // Use the code we generated (if backend says it's duplicate, retry mechanism will handle it)
            positionData.position_code = positionCode;
            console.log(
              'Generated position code:',
              positionCode,
              'for branch:',
              positionData.branch_id || 'Main Branch'
            );
          }

          // Clean up the assignment and unused fields before sending
          delete positionData.assignment_type;
          delete positionData.linked_position_id;
          delete positionData.description;
          delete positionData.requirements;

          // Ensure we're only saving to branch_positions, not user_roles
          // Remove any role_id or user_role references
          delete positionData.role_id;
          delete positionData.user_role_id;
          delete positionData._basePositionCode; // Remove helper field before sending

          const url = editingPosition.value
            ? `/api/branch-positions/${editingPosition.value.id}`
            : '/api/branch-positions';

          const method = editingPosition.value ? 'PUT' : 'POST';

          // Try to save, with automatic retry if duplicate code error
          let response;
          let retryCount = 0;
          const maxRetries = 5;

          while (retryCount <= maxRetries) {
            response = await fetch(url, {
              method: method,
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(positionData),
            });

            if (!response.ok) {
              const errorData = await response.json();

              // If it's a duplicate code error and we're creating (not editing), retry with incremented code
              if (
                errorData.message &&
                errorData.message.includes('Position code already exists') &&
                !editingPosition.value &&
                retryCount < maxRetries
              ) {
                retryCount++;
                console.log(
                  `Duplicate code detected, retrying with new code (attempt ${retryCount})...`
                );

                // Generate new code with incremented number
                const branchId = positionData.branch_id;
                const selectedBranch = branches.value.find(
                  (b) => b.id === branchId
                );
                let newCode;

                // Get base code from stored value or generate from title
                const retryBaseCode =
                  positionData._basePositionCode ||
                  positionData.position_title
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                    .substring(0, 4) ||
                  'POS';

                if (branchId) {
                  if (selectedBranch && selectedBranch.code) {
                    newCode = `${retryBaseCode}-${selectedBranch.code}-${retryCount}`;
                  } else {
                    newCode = `${retryBaseCode}-${branchId}-${retryCount}`;
                  }
                } else {
                  newCode = `${retryBaseCode}-MAIN-${retryCount}`;
                }

                positionData.position_code = newCode;
                console.log(`Retrying with new position code: ${newCode}`);
                continue; // Retry with new code
              } else {
                // Other error or max retries reached
                throw new Error(errorData.message || 'Failed to save position');
              }
            } else {
              // Success
              break;
            }
          }

          const result = await response.json();

          if (editingPosition.value) {
            // Update existing position in branch positions array
            const index = branchPositions.value.findIndex(
              (p) => p.id === editingPosition.value.id
            );
            if (index !== -1) {
              branchPositions.value[index] = {
                ...result.data,
                branch_name:
                  result.data.branch_name ||
                  branches.value.find((b) => b.id === result.data.branch_id)
                    ?.name ||
                  null,
                branch_code:
                  result.data.branch_code ||
                  branches.value.find((b) => b.id === result.data.branch_id)
                    ?.code ||
                  null,
              };
            }
          } else {
            // Add new position to branch positions array with branch info
            const newPosition = {
              ...result.data,
              branch_name:
                result.data.branch_name ||
                (result.data.branch_id
                  ? branches.value.find((b) => b.id === result.data.branch_id)
                      ?.name
                  : null) ||
                null,
              branch_code:
                result.data.branch_code ||
                (result.data.branch_id
                  ? branches.value.find((b) => b.id === result.data.branch_id)
                      ?.code
                  : null) ||
                null,
            };
            branchPositions.value.unshift(newPosition);
          }

          // Reload positions from API to ensure we have all the latest data
          await loadPositions();

          closePositionModal();
          showNotification(
            'success',
            'Success!',
            'Position saved successfully'
          );
          console.log(
            'Position saved successfully and positions list refreshed'
          );
        } catch (error) {
          console.error('Error saving position:', error);
          showNotification(
            'error',
            'Error',
            `Failed to save position: ${error.message}`
          );
        } finally {
          isSavingPosition.value = false;
        }
      };

      const closePositionModal = () => {
        showAddPositionModal.value = false;
        editingPosition.value = null;
        resetPositionForm();
      };

      const resetPositionForm = () => {
        positionForm.value = {
          branch_id: '',
          position_title: '',
          department: '',
          position_type: 'Full-time',
          rate_per_hour: 0,
          status: 'open',
          assignment_type: 'new',
          linked_position_id: '',
        };
      };

      const viewPositionDetails = (position) => {
        // TODO: Implement position details view
        console.log('Viewing position details:', position);
        const details = `Title: ${position.position_title}\nDepartment: ${position.department}\nStatus: ${position.status}\nRate: ₱${position.rate_per_hour}/hour\nMonthly Salary: ₱${position.monthly_salary}`;
        showInfo(details, 'Position Details');
      };

      // Load applications from API
      const loadInterviews = async () => {
        try {
          isLoadingInterviews.value = true;

          const response = await fetch('/api/job-applications/interviews', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to load interviews');
          }

          const result = await response.json();

          if (result.success && result.data) {
            interviews.value = result.data;
            console.log(`Loaded ${interviews.value.length} interviews`);

            // Removed auto-completing past-due interviews; completion is now manual
          } else {
            console.warn('Interviews API returned no data');
            interviews.value = [];
          }
        } catch (error) {
          console.error('Error loading interviews:', error);
          interviews.value = [];
        } finally {
          isLoadingInterviews.value = false;
        }
      };

      const loadApplications = async () => {
        try {
          isLoadingApplications.value = true;

          const response = await fetch('/api/job-applications', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to load applications');
          }

          const result = await response.json();

          if (result.success && result.data) {
            applications.value = result.data.map((app) => ({
              ...app,
              applicant_name: app.full_name,
              applied_date: app.application_date,
              skills_count: app.skills ? app.skills.split(',').length : 0,
            }));
            console.log(`Loaded ${applications.value.length} applications`);
          } else {
            console.warn('Applications API returned no data');
            applications.value = [];
          }
        } catch (error) {
          console.error('Error loading applications:', error);
          applications.value = [];
        } finally {
          isLoadingApplications.value = false;
        }
      };

      // Load positions from API
      const loadPositions = async () => {
        try {
          isLoadingPositions.value = true;

          // First, fetch all available roles grouped by department from /api/roles/positions
          // This is the authoritative source for all available roles/positions
          try {
            const rolesResponse = await fetch('/api/roles/positions', {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
              },
            });

            if (rolesResponse.ok) {
              const rolesResult = await rolesResponse.json();
              if (rolesResult.success && rolesResult.data) {
                // rolesResult.data is already grouped by department: { "Branch": [...], "Finance": [...], etc. }
                rolesPositionsData.value = rolesResult.data;
                console.log(
                  'Loaded roles by department from /api/roles/positions:',
                  rolesResult.data
                );
              }
            }
          } catch (rolesError) {
            console.warn(
              'Failed to load roles from /api/roles/positions:',
              rolesError
            );
            // Continue with branch positions loading as fallback
          }

          // Fetch from branch-positions API (get all positions, not just open ones, so HR can manage them)
          const response = await fetch('/api/branch-positions', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to load branch positions');
          }

          const result = await response.json();

          if (result.success && result.data) {
            // Store branch positions separately (they already include branch_name, branch_code, branch_address from API)
            // Don't filter here - let the computed property handle filtering so we can toggle between open/closed
            // Only filter out deleted positions, keep both active and inactive for HR management
            // Include both branch positions (branch_id != null) and main branch positions (branch_id = null)
            branchPositions.value = result.data.filter((p) => !p.deleted_at);

            // Log detailed information for debugging
            console.log(
              `Loaded ${branchPositions.value.length} branch positions from API`
            );
            console.log(
              `Total positions returned by API: ${result.data.length}`
            );

            // Group by branch to see distribution
            const branchGroups = {};
            branchPositions.value.forEach((p) => {
              const branchName = p.branch_name || 'Unknown Branch';
              if (!branchGroups[branchName]) {
                branchGroups[branchName] = [];
              }
              branchGroups[branchName].push(p.position_title);
            });
            console.log('Branch positions grouped by branch:', branchGroups);
            console.log(
              'Sample branch positions:',
              branchPositions.value.slice(0, 5).map((p) => ({
                id: p.id,
                position_title: p.position_title,
                branch_name: p.branch_name,
                branch_id: p.branch_id,
                is_active: p.is_active,
                status: p.status,
              }))
            );
          } else {
            console.warn(
              'Branch positions API returned no data or unsuccessful response:',
              result
            );
            branchPositions.value = [];
          }

          // Also load from store for backward compatibility and rate sync
          try {
            await positionsStore.fetchPositions();
            console.log(
              'Loaded positions from store (synced with Position Management)'
            );
          } catch (err) {
            console.warn('Error loading positions from store:', err);
          }

          // Log total position counts by department and by branch
          const allPositions = positions.value; // Use computed property
          const deptCounts = {};
          const branchCounts = {};
          allPositions.forEach((p) => {
            if (p && p.department) {
              deptCounts[p.department] = (deptCounts[p.department] || 0) + 1;
            }
            // Count branch positions separately
            if (p && p.branch_id && p.branch_name) {
              branchCounts[p.branch_name] =
                (branchCounts[p.branch_name] || 0) + 1;
            }
          });
          console.log('Position counts by department:', deptCounts);
          console.log('Position counts by branch:', branchCounts);

          // Also check if there are branches without positions
          if (branches.value.length > 0) {
            const branchesWithPositions = new Set(Object.keys(branchCounts));
            const branchesWithoutPositions = branches.value
              .filter((b) => b.is_active !== false)
              .filter((b) => !branchesWithPositions.has(b.name))
              .map((b) => b.name);
            if (branchesWithoutPositions.length > 0) {
              console.warn(
                'Branches without any positions:',
                branchesWithoutPositions
              );
            }
          }
        } catch (error) {
          console.error('Error loading positions:', error);
          showError('Failed to load positions. Please try again.');
        } finally {
          isLoadingPositions.value = false;
        }
      };

      // Load branches from API
      const loadBranches = async () => {
        try {
          isLoadingBranches.value = true;

          const response = await fetch('/api/branches', {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to load branches');
          }

          const result = await response.json();
          // Handle both response formats: direct array or { success: true, data: [...] }
          if (Array.isArray(result)) {
            branches.value = result;
          } else if (result.success && Array.isArray(result.data)) {
            branches.value = result.data;
          } else if (result.data && Array.isArray(result.data)) {
            branches.value = result.data;
          } else {
            branches.value = [];
          }

          // Filter out deleted branches
          branches.value = branches.value.filter((b) => !b.deleted_at);

          console.log(`Loaded ${branches.value.length} branches`);
          console.log('Branches data:', branches.value); // Debug log
          console.log(
            'Available branches for selection:',
            availableBranchesForSelection.value
          ); // Debug log
        } catch (error) {
          console.error('Error loading branches:', error);
          showError('Failed to load branches. Please try again.');
          branches.value = [];
        } finally {
          isLoadingBranches.value = false;
        }
      };

      // Set active department
      const setActiveDepartment = (department) => {
        activeDepartment.value = department;
        currentPage.value = 1;
        gridCurrentPage.value = 1;
        cardCurrentPage.value = 1;
      };

      // Watch for department changes - auto-assign to main branch for main office departments
      watch(
        () => positionForm.value.department,
        (newDepartment, oldDepartment) => {
          if (newDepartment && mainOfficeDepartments.includes(newDepartment)) {
            // Auto-clear branch_id for main office departments
            positionForm.value.branch_id = '';
            console.log(
              `Main office department "${newDepartment}" selected - setting branch_id to null (main branch)`
            );
          }
          // Reset position title and rate when department changes (except when switching to Branch with existing data)
          if (newDepartment && newDepartment !== 'Branch') {
            // Only reset if actually changing from Branch or from empty
            if (oldDepartment === 'Branch' || !oldDepartment) {
              positionForm.value.position_title = '';
              positionForm.value.rate_per_hour = 0;
            }
          }
        }
      );

      // Watch for position title changes to auto-fill rate from Position Management
      watch(
        () => positionForm.value.position_title,
        (newPositionTitle) => {
          if (
            newPositionTitle &&
            positionForm.value.department &&
            positionForm.value.department !== 'Branch'
          ) {
            const departmentPositions =
              rolesPositionsData.value[positionForm.value.department];
            if (departmentPositions && departmentPositions.length > 0) {
              const matchingPosition = departmentPositions.find(
                (p) => p.role.toLowerCase() === newPositionTitle.toLowerCase()
              );
              if (matchingPosition && matchingPosition.rate_per_hour) {
                positionForm.value.rate_per_hour =
                  matchingPosition.rate_per_hour;
                console.log(
                  `Auto-filled rate for ${newPositionTitle} in ${positionForm.value.department}: ₱${matchingPosition.rate_per_hour}`
                );
              }
            }
          }
        }
      );

      // Watch for tab changes to refresh positions
      watch(
        () => activeTab.value,
        (newTab) => {
          if (newTab === 'position-tracker') {
            // Refresh branch positions and roles from API to get latest rates
            loadPositions().catch((err) => {
              console.warn('Error refreshing positions:', err);
            });
          }
        }
      );

      // Lifecycle
      onMounted(() => {
        loadApplications();
        loadInterviews();
        loadPositions();
        loadBranches();
      });

      return {
        activeTab,
        activeDepartment,
        viewMode,
        tabs,
        newApplicationsCount,
        pendingReviewCount,
        screenedCount,
        processedCount,
        // Interview management
        interviews,
        isLoadingInterviews,
        isUpdatingInterview,
        interviewFilter,
        filteredInterviews,
        groupedInterviewsByDate,
        paginatedDateGroups,
        sortedDateKeys,
        currentDateGroupIndex,
        canGoNext,
        canGoPrev,
        nextDateGroup,
        prevDateGroup,
        loadInterviews,
        conductInterview,
        markInterviewCompleted,
        viewInterviewDetails,
        cancelInterview,
        isProcessingHiring,
        hiringCandidates,
        hireCandidate,
        rejectCandidate,
        applications,
        positions,
        rolesPositionsData,
        searchQuery,
        statusFilter,
        positionFilter,
        dateFilter,
        currentPage,
        itemsPerPage,
        isLoadingApplications,
        selectAll,
        filteredApplications,
        totalPages,
        paginatedApplications,
        visiblePages,
        getFilteredApplicationsCount,
        applyNewApplicationsStatFilter,
        formatDate,
        formatDepartment,
        formatTime,
        toggleSelectAll,
        markAllAsReviewed,
        viewApplication,
        setInterviewDate,
        closeApplicationDetailsModal,
        closeSetInterviewModal,
        handleInterviewScheduled,
        handleNavigateToSchedule,
        rejectApplication,
        confirmDelete,
        showDeleteModal,
        applicationToDelete,
        cancelInterview,
        hasScheduledInterview,
        confirmInterviewDelete,
        showInterviewDeleteModal,
        interviewToDelete,
        showInterviewDetailsModal,
        selectedInterview,
        showNotificationModal,
        notificationData,
        // Action confirm modal
        showActionConfirmModal,
        actionConfirmData,
        confirmActionConfirm,
        cancelActionConfirm,
        showNotification,
        handleTabClick,
        clearFilters,
        reviewOnboarding,
        // Onboarding review modal
        showOnboardingReviewModal,
        onboardingSubmissions,
        isLoadingOnboarding,
        onboardingError,
        onboardingStatusFilter,
        onboardingBranchFilter,
        onboardingCurrentPage,
        onboardingTotalPages,
        filteredOnboardingSubmissions,
        paginatedOnboardingSubmissions,
        viewOnboardingDetails,
        approveOnboarding,
        openApproveConfirm,
        showApproveConfirmModal,
        pendingApproval,
        requestResubmission,
        submitResubmissionRequest,
        showResubmissionModal,
        resubmissionFeedback,
        pendingResubmission,
        showOnboardingDetailsModal,
        selectedOnboardingSubmission,
        isLoadingOnboardingDetails,
        closeOnboardingDetails,
        employeeDocuments,
        isLoadingDocuments,
        getDocumentTypeName,
        formatFileSize,
        previewDocument,
        showDocumentPreviewModal,
        selectedDocument,
        closeDocumentPreview,
        getDocumentUrl,
        isImageDocument,
        isPdfDocument,
        // Position management
        showAddPositionModal,
        editingPosition,
        isLoadingPositions,
        isSavingPosition,

        isMainOfficeDepartment,
        branchSelectionDisabled,
        availableBranchesForSelection,
        // Modal state
        showApplicationDetailsModal,
        showSetInterviewModal,
        selectedApplication,
        positionForm,
        calculatedMonthlySalary,
        getMonthlySalaryRange,
        totalMonthlySalaryBudget,
        branches,
        isLoadingBranches,
        availablePositions,
        availableRolesForDepartment,
        departments,
        filteredPositions,
        filteredPositionsByDepartment,
        showClosedPositions,
        setActiveDepartment,
        viewMode,
        // Grid view
        gridFilters,
        gridCurrentPage,
        gridItemsPerPage,
        gridFilteredPositions,
        gridPaginatedPositions,
        gridTotalPages,
        cardCurrentPage,
        cardItemsPerPage,
        cardPaginatedPositions,
        cardTotalPages,
        availableBranches,
        availableDepartments,
        availableStatuses,
        availablePositionTitles,
        togglePositionFilter,
        toggleBranchFilter,
        toggleDepartmentFilter,
        toggleStatusFilter,
        clearGridFilters,
        hasActiveGridFilters,
        // Selection
        selectedPositions,
        selectedCount,
        hasMainBranchSelected,
        isSelectAll,
        isProcessingBulkAction,
        toggleSelectAllPositions,
        togglePositionSelection,
        isPositionSelected,
        bulkOpenPositions,
        bulkClosePositions,
        bulkDeletePositions,
        addPosition,

        editPosition,
        deletePosition,
        togglePositionStatus,
        confirmTogglePositionStatus,
        savePosition,
        closePositionModal,
        resetPositionForm,
        viewPositionDetails,
        loadPositions,
        loadBranches,
        loadApplications,
      };
    },
  };
</script>

<style scoped>
  .job-application-management {
    padding: 24px;
    background: #f8fafc;
    min-height: 100vh;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding: 24px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .header-content {
    flex: 1;
  }

  .page-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 28px;
    font-weight: 700;
    color: var(--color-primaryColor);
    margin: 0 0 8px 0;
  }

  .title-icon {
    width: 32px;
    height: 32px;
    color: var(--color-primaryColor);
  }

  .page-subtitle {
    color: #64748b;
    font-size: 16px;
    margin: 0;
  }

  /* Hide scrollbars for horizontal tab scroller on mobile */
  .no-scrollbar {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }

  /* Navigation Tabs */
  .nav-tabs {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
    margin-bottom: 32px;
    overflow: hidden;
  }

  .nav-tabs-header {
    padding: 24px 24px 16px 24px;
    border-bottom: 1px solid #f1f5f9;
  }

  .nav-tabs-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-primaryColor);
    margin: 0 0 8px 0;
  }

  .nav-tabs-subtitle {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }

  .nav-tabs-container {
    display: flex;
    gap: 8px;
    padding: 16px 24px 24px 24px;
  }

  .nav-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #64748b;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .nav-tab:hover {
    background: #f1f5f9;
    color: #475569;
  }

  .nav-tab.active {
    background: var(--color-primaryColor);
    color: white;
  }

  .tab-icon {
    width: 16px;
    height: 16px;
  }

  .notification-badge {
    background: #1da862;
    color: var(--color-primaryColor);
    border-radius: 50%;
    padding: 2px 6px;
    font-size: 12px;
    font-weight: 600;
    min-width: 35px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 8px;
  }

  /* Tab Content */
  .tab-content {
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: visible !important;
    min-height: 600px !important;
    padding: 20px !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }

  .tab-panel {
    padding: 0;
  }

  .panel-header {
    margin-bottom: 24px;
  }

  .panel-header h3 {
    font-size: 20px;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 8px 0;
  }

  .panel-header p {
    color: #64748b;
    font-size: 14px;
    margin: 0;
  }

  .content-section {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  /* Stats Grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .stat-card {
    background: #f8fafc;
    padding: 20px;
    border-radius: 8px;
    text-align: center;
  }

  .stat-number {
    font-size: 32px;
    font-weight: 700;
    color: var(--color-primaryColor);
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 14px;
    color: #64748b;
    font-weight: 500;
  }

  /* Status Grid */
  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }

  .status-card {
    padding: 20px;
    border-radius: 8px;
    text-align: center;
    transition: transform 0.2s;
  }

  .status-card:hover {
    transform: translateY(-2px);
  }

  .status-card.shortlisted {
    background: #f0f9ff;
    border: 1px solid #0ea5e9;
  }

  .status-card.on-hold {
    background: #fefce8;
    border: 1px solid #eab308;
  }

  .status-card.rejected {
    background: #fef2f2;
    border: 1px solid #ef4444;
  }

  .status-card.hired {
    background: #f0fdf4;
    border: 1px solid #22c55e;
  }

  .status-icon {
    font-size: 24px;
    margin-bottom: 8px;
  }

  .status-count {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .status-card.shortlisted .status-count {
    color: #0ea5e9;
  }

  .status-card.on-hold .status-count {
    color: #eab308;
  }

  .status-card.rejected .status-count {
    color: #ef4444;
  }

  .status-card.hired .status-count {
    color: #22c55e;
  }

  .status-label {
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
  }

  /* Positions Grid */
  .positions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 20px;
  }

  .position-card {
    background: white;
    padding: 24px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
  }

  .position-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }

  .position-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .position-actions {
    display: flex;
    gap: 8px;
  }

  .position-status-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .position-slots {
    font-size: 14px;
    color: #64748b;
  }

  .position-details {
    margin-bottom: 20px;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    padding: 4px 0;
  }

  .detail-label {
    font-weight: 500;
    color: #64748b;
    font-size: 14px;
  }

  .detail-value {
    color: #1e293b;
    font-size: 14px;
    text-align: right;
  }

  .position-footer {
    display: flex;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
  }

  .btn-primary {
    background: var(--color-primaryColor);
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover {
    background: var(--color-primaryColor);
    opacity: 0.9;
  }

  .btn-secondary {
    background: #f1f5f9;
    color: #475569;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: #e2e8f0;
  }

  .position-title {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 8px;
  }

  .position-status {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: 12px;
  }

  .position-status.open {
    background: #dbeafe;
    color: #2563eb;
  }

  .position-status.filled {
    background: #d1fae5;
    color: #059669;
  }

  .position-details {
    font-size: 14px;
    color: #64748b;
  }

  .applications-count,
  .hired-candidate {
    font-weight: 500;
    color: #374151;
    margin-bottom: 4px;
  }

  .department {
    color: #64748b;
  }

  .applicant-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }

  .applicant-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--color-primaryColor);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 18px;
  }

  .applicant-info {
    flex: 1;
  }

  .applicant-name {
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 4px;
  }

  .applicant-position {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 2px;
  }

  .applicant-department,
  .applicant-branch {
    font-size: 12px;
    color: #94a3b8;
  }

  .onboarding-status {
    text-align: right;
  }

  .status-badge.onboarding {
    background: #fef3c7;
    color: #d97706;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .start-date {
    font-size: 12px;
    color: #64748b;
  }

  /* Calendar */
  .calendar-container {
    background: #f8f8f8;
    border-radius: 8px;
    padding: 20px;
  }

  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .calendar-header h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1e293b;
  }

  .calendar-controls {
    display: flex;
    gap: 8px;
  }

  .interview-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .interview-item {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: white;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
  }

  .interview-item:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .interview-time {
    font-weight: 600;
    color: var(--color-primaryColor);
    min-width: 80px;
  }

  .interview-details {
    flex: 1;
  }

  .candidate-name {
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 2px;
  }

  .position,
  .interviewer {
    font-size: 14px;
    color: #64748b;
  }

  .interview-type {
    padding: 4px 12px;
    background: #f1f5f9;
    color: #64748b;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
  }

  /* Interview meta/action layout */
  .interview-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  .interview-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: 12px;
    justify-content: flex-end;
  }

  .interview-actions .other-actions {
    display: flex;
    gap: 8px;
  }

  /* Date navigation controls */
  .date-navigation {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
  }

  .date-nav-info {
    flex: 1;
    text-align: center;
    color: #64748b;
    font-size: 13px;
    white-space: nowrap;
  }

  .date-nav-btn {
    display: inline-flex;
    align-items: center;
  }

  .action-buttons {
    display: flex;
    gap: 12px;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .interview-item {
      grid-template-columns: 1fr;
    }

    .interview-meta,
    .interview-actions {
      margin-left: 0;
      width: 100%;
      justify-content: flex-start;
      flex-wrap: wrap;
    }
  }
  @media (max-width: 768px) {
    .nav-tabs {
      flex-direction: column;
      gap: 4px;
    }

    .nav-tab {
      justify-content: center;
    }

    .stats-grid,
    .status-grid,
    .positions-grid {
      grid-template-columns: 1fr;
    }

    .applicant-card {
      flex-direction: column;
      text-align: center;
    }

    .interview-item {
      grid-template-columns: 1fr;
      text-align: center;
    }

    .interview-meta {
      margin-left: 0;
      margin-top: 8px;
      justify-content: center;
      width: 100%;
    }

    .interview-actions {
      margin-left: 0;
      margin-top: 10px;
      width: 100%;
      justify-content: center;
      flex-wrap: wrap;
    }

    .hiring-buttons {
      width: 100%;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
    }
    .hiring-buttons .btn {
      min-width: 44%;
      flex: 1 1 44%;
    }

    .calendar-header {
      flex-direction: column;
      gap: 12px;
    }

    .calendar-controls {
      justify-content: center;
    }

    .date-navigation {
      flex-direction: column;
      align-items: stretch;
    }

    .date-nav-info {
      order: -1;
      margin-bottom: 6px;
      width: 100%;
    }

    .date-nav-btn {
      width: 100%;
      justify-content: center;
    }
  }

  /* NewApplication Component Integration */
  .tab-panel {
    padding: 24px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .new-application-management {
    background: white;
    padding: 0;
    min-height: 400px;
  }

  .stat-card {
    background: white;
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }

  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--color-primaryColor);
  }

  .stat-card.new-applications::before {
    background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  }

  .stat-card.pending-review::before {
    background: linear-gradient(90deg, #f59e0b, #d97706);
  }

  .stat-card.initial-screening::before {
    background: linear-gradient(90deg, #8b5cf6, #7c3aed);
  }

  .stat-card.processed-today::before {
    background: linear-gradient(90deg, #10b981, #059669);
  }

  .stat-icon-wrapper {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
  }

  .stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lucide-icon {
    width: 32px;
    height: 32px;
    color: var(--color-primaryColor);
    opacity: 0.8;
  }

  .stat-number {
    font-size: 24px;
    font-weight: 700;
    color: white;
    background: var(--color-primaryColor);
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .stat-content {
    flex: 1;
  }

  .stat-label {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 4px;
  }

  .stat-description {
    font-size: 14px;
    color: #64748b;
    line-height: 1.4;
  }

  /* New Wide Card Design */
  .stats-grid {
    display: flex;
    justify-content: center;
  }

  .stat-card-wide {
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    border: 1px solid #e2e8f0;
    display: flex;
    width: 100%;
    max-width: 600px;
    overflow: hidden;
  }

  .stat-section {
    flex: 1;
    padding: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .stat-divider {
    width: 1px;
    background: #e2e8f0;
    margin: 16px 0;
  }

  .stat-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 16px;
  }

  .stat-section-title {
    font-size: 16px;
    font-weight: 500;
    color: #64748b;
  }

  .stat-section-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-section-icon.warning {
    background: #fbbf24;
  }

  .stat-section-icon.error {
    background: #f87171;
  }

  .stat-section-value {
    font-size: 48px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .stat-section.expiring-soon .stat-section-value {
    color: #fbbf24;
  }

  .stat-section.expired .stat-section-value {
    color: #f87171;
  }

  .stat-section-description {
    font-size: 14px;
    color: #9ca3af;
  }

  .lucide-icon {
    width: 16px;
    height: 16px;
    color: white;
  }

  /* Filters Section */
  .filters-section {
    background: white;
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    margin-bottom: 32px;
    border: 1px solid #e2e8f0;
  }

  .filters-header {
    margin-bottom: 20px;
    text-align: center;
  }

  .filters-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-primaryColor);
    margin: 0 0 8px 0;
  }

  .filters-subtitle {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }

  .filters-row {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-box {
    position: relative;
    flex: 1;
    min-width: 200px;
    max-width: 400px;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: #64748b;
  }

  .search-input {
    width: 100%;
    padding: 14px 16px 14px 48px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-size: 15px;
    transition: all 0.3s ease;
    background: #f8fafc;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-primaryColor);
    background: white;
    box-shadow: 0 0 0 3px rgba(70, 97, 20, 0.1);
  }

  .filter-group {
    display: flex;
    gap: 12px;
  }

  .filter-select {
    padding: 14px 16px;
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    font-size: 15px;
    background: #f8fafc;
    transition: all 0.3s ease;
    cursor: pointer;
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--color-primaryColor);
    background: white;
    box-shadow: 0 0 0 3px rgba(70, 97, 20, 0.1);
  }

  /* Table */
  .table-container {
    background: white;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #e2e8f0;
  }

  .table-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .applications-table {
    width: 100%;
    border-collapse: collapse;
  }

  .applications-table th {
    background: #f8fafc;
    padding: 16px 24px;
    text-align: left;
    font-weight: 600;
    color: #475569;
    border-bottom: 1px solid #e2e8f0;
  }

  .applications-table td {
    padding: 16px 24px;
    border-bottom: 1px solid #f1f5f9;
  }

  .table-row:hover {
    background: #f8fafc;
  }

  .checkbox-cell {
    width: 50px;
  }

  .applicant-cell {
    min-width: 200px;
  }

  .applicant-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--color-primaryColor);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 16px;
  }

  .applicant-details .name {
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 2px;
  }

  .applicant-details .email {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 2px;
  }

  .applicant-details .phone {
    font-size: 12px;
    color: #94a3b8;
  }

  .position-cell {
    min-width: 150px;
  }

  .position-title {
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 2px;
  }

  .department {
    font-size: 14px;
    color: #64748b;
  }

  .date-cell {
    min-width: 120px;
  }

  .date {
    font-weight: 500;
    color: #1e293b;
    margin-bottom: 2px;
  }

  .time {
    font-size: 14px;
    color: #64748b;
  }

  .status-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-badge.new {
    background: #fef3c7;
    color: #d97706;
  }

  .status-badge.reviewing {
    background: #dbeafe;
    color: #2563eb;
  }

  .status-badge.screened {
    background: #e0e7ff;
    color: #7c3aed;
  }

  .status-badge.shortlisted {
    background: #d1fae5;
    color: #059669;
  }

  .status-badge.rejected {
    background: #fee2e2;
    color: #dc2626;
  }

  .experience-cell {
    min-width: 100px;
  }

  .years {
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 2px;
  }

  .skills {
    font-size: 14px;
    color: #64748b;
  }

  .actions-cell {
    min-width: 120px;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
  }

  .btn-icon-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    background: #f1f5f9;
    color: #64748b;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .btn-icon-btn:hover {
    background: #e2e8f0;
    color: #475569;
  }

  .btn-icon {
    width: 16px;
    height: 16px;
  }

  /* Pagination */
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    padding: 20px;
    border-top: 1px solid #e2e8f0;
  }

  .page-info {
    font-size: 14px;
    color: #64748b;
  }

  /* Interview Schedule Styles */
  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 0.5rem;
  }

  .loading-text {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .interview-meta {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-end;
  }

  .interview-type {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .type-in-person {
    background-color: #dcfce7;
    color: #166534;
  }

  .type-video {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .type-phone {
    background-color: #f3e8ff;
    color: #7c3aed;
  }

  .interview-status {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .status-scheduled {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .status-completed {
    background-color: #dcfce7;
    color: #166534;
  }

  .status-cancelled {
    background-color: #fee2e2;
    color: #dc2626;
  }

  .status-rescheduled {
    background-color: #fef3c7;
    color: #d97706;
  }

  /* Interview Actions */
  .interview-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
    min-width: 200px;
  }

  .decision-buttons {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .decision-buttons .btn {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .decision-buttons .btn-success {
    background: #10b981;
    color: white;
    border: none;
  }

  .decision-buttons .btn-success:hover {
    background: #059669;
    transform: translateY(-1px);
  }

  .decision-buttons .btn-error {
    background: #ef4444;
    color: white;
    border: none;
  }

  .decision-buttons .btn-error:hover {
    background: #dc2626;
    transform: translateY(-1px);
  }

  .completed-status {
    margin-bottom: 8px;
  }

  .completed-status .badge {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 8px;
  }

  .completed-status .badge-error {
    background-color: #dc2626;
    color: white;
  }

  .completed-status .badge-success {
    background-color: #16a34a;
    color: white;
  }

  .completed-status .badge-info {
    background-color: #3b82f6;
    color: white;
  }

  .other-actions {
    display: flex;
    gap: 4px;
  }

  .other-actions .btn {
    padding: 6px 8px;
    font-size: 12px;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .other-actions .btn:hover {
    transform: translateY(-1px);
  }

  .interview-details .location,
  .interview-details .meeting-link {
    font-size: 14px;
    color: #64748b;
    margin-top: 4px;
  }

  .interview-details .meeting-link a {
    text-decoration: none;
    font-weight: 500;
  }

  .interview-details .meeting-link a:hover {
    text-decoration: underline;
  }

  /* Date Grouping Styles */
  .date-navigation {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .date-nav-btn {
    display: flex;
    align-items: center;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .date-nav-info {
    flex: 1;
    text-align: center;
  }

  .date-nav-counter {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
  }

  .date-nav-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .interview-date-group {
    margin-bottom: 2rem;
  }

  .date-header {
    display: flex;
    align-items: center;
    padding: 1rem;
    background: #f8fafc;
    border-left: 4px solid var(--color-primaryColor);
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .date-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }

  .date-count {
    margin-left: 0.5rem;
    font-size: 0.875rem;
    color: #64748b;
  }

  /* Hiring Buttons */
  .hiring-buttons {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .hiring-buttons .btn {
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .hiring-buttons .btn-success {
    background: #10b981;
    color: white;
    border: none;
  }

  .hiring-buttons .btn-success:hover {
    background: #059669;
    transform: translateY(-1px);
  }

  .hiring-buttons .btn-error {
    background: #ef4444;
    color: white;
    border: none;
  }

  .hiring-buttons .btn-error:hover {
    background: #dc2626;
    transform: translateY(-1px);
  }

  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: #6b7280;
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-state h4 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .empty-state p {
    font-size: 0.875rem;
  }
</style>
